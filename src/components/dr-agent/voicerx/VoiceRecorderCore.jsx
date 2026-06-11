/**
 * VoiceRecorderCore — shared mic-input component used by:
 *   layout="fullscreen"  → VoiceRxActiveAgent (full back-face panel)
 *   layout="overlay"     → VoiceRxCanvas quick-edit, SideNavbar voice input
 *
 * Shared logic: useMicStream, useBlobRecorder, useActiveMic, recording timer,
 *   live transcript (overlay only), canSubmit, submit handler, mute/device picker,
 *   critical-block detection, status label, sound effects.
 *
 * Each layout keeps its own SCSS module. Parent controls outer positioning;
 * this component fills its container.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSubmitSound, playVoiceRxStartSound, playVoiceRxErrorSound } from "./audio";
import { AlertCircle, Check, ChevronDown, Mic, MicOff, WifiOff } from "../atoms/icons/lucide";
import {
  CaptionCarousel,
  VoiceTranscriptProcessingCard,
  hasTranscriptContent,
  hasDiarizedTranscript,
  ConversationTranscript,
  DictationTranscript,
  transcriptToText,
} from "./VoiceTranscriptProcessingCard";
import { ShineBorder } from "./ShineBorder";
import { toast } from "./toast";
import { useRxPadSync } from "../rxpad/dr-agent/RxPadSyncContext";
import { VoiceRxSiriWaveform } from "./VoiceRxSiriWaveform";
import { useNetConnection } from "./use-net-connection";
import { useLiveTranscript } from "./use-live-transcript";
import { ConfirmDialog as TPConfirmDialog } from "../molecules/ConfirmDialog";
import { Popover, PopoverContent, PopoverTrigger } from "../atoms/Popover";
import {
  VOICE_CHUNK_UPLOAD_INTERVAL_MS,
  isAudioChunkContextReady,
  uploadAudioChunk,
} from "./api/audio-chunk-upload";
import fsStyles from "./VoiceRxActiveAgent.module.scss";
import osStyles from "./VoiceRxModuleRecorder.module.scss";
import canvasStyles from "./VoiceRxCanvas.module.scss";

// ── Helpers ──────────────────────────────────────────────────────────────────

const VOICE_RX_MIC_STORAGE_KEY = "voiceRxPreferredMicrophoneDeviceId";

let sessionPreferredMicDeviceId = undefined;
let sessionPreferredMicLoaded = false;

function getSessionPreferredMicDeviceId() {
  if (sessionPreferredMicLoaded) return sessionPreferredMicDeviceId;
  sessionPreferredMicLoaded = true;
  if (typeof window === "undefined") return undefined;
  try {
    sessionPreferredMicDeviceId = window.sessionStorage?.getItem(VOICE_RX_MIC_STORAGE_KEY) || undefined;
  } catch {
    sessionPreferredMicDeviceId = undefined;
  }
  return sessionPreferredMicDeviceId;
}

function setSessionPreferredMicDeviceId(deviceId) {
  sessionPreferredMicLoaded = true;
  sessionPreferredMicDeviceId = deviceId || undefined;
  if (typeof window === "undefined") return;
  try {
    if (deviceId) {
      window.sessionStorage?.setItem(VOICE_RX_MIC_STORAGE_KEY, deviceId);
    } else {
      window.sessionStorage?.removeItem(VOICE_RX_MIC_STORAGE_KEY);
    }
  } catch {
    // Session memory still covers the current React runtime if storage is blocked.
  }
}

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ── Shared hooks ─────────────────────────────────────────────────────────────

function useRecordingTimer(active) {
  const [ms, setMs] = useState(0);
  const msRef = useRef(0);
  useEffect(() => { msRef.current = ms; }, [ms]);
  useEffect(() => {
    if (!active) return;
    const start = performance.now() - msRef.current;
    const iv = window.setInterval(() => setMs(performance.now() - start), 250);
    return () => window.clearInterval(iv);
  }, [active]);
  return ms;
}

function useMicStream(deviceId, enabled) {
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const retry = useCallback(() => { setError(null); setRetryKey((k) => k + 1); }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not supported in this browser");
      return;
    }
    let cancelled = false;
    let acquired = null;
    (async () => {
      try {
        let s;
        try {
          s = await navigator.mediaDevices.getUserMedia({
            audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          });
        } catch (error) {
          if (!deviceId) throw error;
          s = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        acquired = s;
        setStream(s);
        setError(null);
        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          if (!cancelled) setDevices(all.filter((d) => d.kind === "audioinput"));
        } catch { /* ignore */ }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Microphone access denied");
      }
    })();
    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [deviceId, enabled, retryKey]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    const onChange = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter((d) => d.kind === "audioinput"));
      } catch { /* ignore */ }
      if (!deviceId && enabled) setRetryKey((k) => k + 1);
    };
    navigator.mediaDevices.addEventListener?.("devicechange", onChange);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", onChange);
  }, [deviceId, enabled]);

  return { stream, devices, error, retry };
}

function useBlobRecorder(stream, paused, enabled) {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeRef = useRef("audio/webm");

  useEffect(() => {
    if (!stream || !enabled) return;
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") return;
    const supports = (t) => {
      try { return window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(t); }
      catch { return false; }
    };
    const mime = supports("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
      : supports("audio/webm") ? "audio/webm"
      : supports("audio/mp4") ? "audio/mp4" : "";
    let rec;
    try {
      rec = mime ? new window.MediaRecorder(stream, { mimeType: mime }) : new window.MediaRecorder(stream);
    } catch (e) {
      console.error("MediaRecorder init failed", e);
      return;
    }
    chunksRef.current = [];
    mimeRef.current = rec.mimeType || mime || "audio/webm";
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
    try { rec.start(1000); } catch (e) { console.error("MediaRecorder start failed", e); return; }
    recorderRef.current = rec;
    return () => {
      try { if (rec.state !== "inactive") rec.stop(); } catch { /* ignore */ }
      recorderRef.current = null;
    };
  }, [stream, enabled]);

  useEffect(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    try {
      if (paused && rec.state === "recording") rec.pause();
      else if (!paused && rec.state === "paused") rec.resume();
    } catch { /* ignore */ }
  }, [paused]);

  const getBlob = useCallback(() => new Promise((resolve) => {
    const rec = recorderRef.current;
    const buildBlob = () => {
      if (!chunksRef.current.length) return null;
      return new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
    };
    if (!rec || rec.state === "inactive") { resolve(buildBlob()); return; }
    const finalize = () => resolve(buildBlob());
    rec.addEventListener("stop", finalize, { once: true });
    try { rec.stop(); } catch { finalize(); }
  }), []);

  return { getBlob };
}

function createAudioRecorder(stream) {
  if (!stream || typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return null;
  }
  const supports = (type) => {
    try { return window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(type); }
    catch { return false; }
  };
  const mime = supports("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
    : supports("audio/webm") ? "audio/webm"
    : supports("audio/mp4") ? "audio/mp4" : "";
  try {
    return mime ? new window.MediaRecorder(stream, { mimeType: mime }) : new window.MediaRecorder(stream);
  } catch (error) {
    console.error("Audio chunk recorder init failed", error);
    return null;
  }
}

function useAudioChunkRecorder(stream, paused, enabled, audioChunkContext) {
  const recorderRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const segmentChunksRef = useRef([]);
  const segmentStartedAtRef = useRef(0);
  const chunkIndexRef = useRef(0);
  const emittedChunksRef = useRef(false);
  const uploadQueueRef = useRef(Promise.resolve());
  const intervalTimerRef = useRef(null);
  const pausedRef = useRef(paused);
  const enabledRef = useRef(enabled);
  const streamRef = useRef(stream);
  const contextRef = useRef(audioChunkContext);
  const localErrorNotifiedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { streamRef.current = stream; }, [stream]);
  useEffect(() => { contextRef.current = audioChunkContext; }, [audioChunkContext]);

  const clearIntervalTimer = useCallback(() => {
    if (intervalTimerRef.current) {
      window.clearTimeout(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
  }, []);

  const queueUpload = useCallback((audioBlob, chunkIndex) => {
    const context = contextRef.current || {};
    uploadQueueRef.current = uploadQueueRef.current
      .then(() => uploadAudioChunk({
        audioBlob,
        chunkIndex,
        sessionId: context.sessionId,
        doctorId: context.doctorId,
        patientId: context.patientId,
      }))
      .catch((error) => {
        console.error("[voice-rx] audio chunk upload failed", { chunkIndex, error });
        if (!localErrorNotifiedRef.current) {
          localErrorNotifiedRef.current = true;
          toast.error(error?.message || "Audio chunk upload failed.");
        }
      });
    return uploadQueueRef.current;
  }, []);

  const disposeRecorderStream = useCallback(() => {
    const chunkStream = recorderStreamRef.current;
    recorderStreamRef.current = null;
    if (chunkStream && chunkStream !== streamRef.current) {
      chunkStream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const stopSegment = useCallback(({ reason, forceUpload = false, restart = false } = {}) => {
    clearIntervalTimer();
    const recorder = recorderRef.current;
    if (!recorder) {
      disposeRecorderStream();
      return Promise.resolve();
    }

    recorderRef.current = null;
    return new Promise((resolve) => {
      const startedAt = segmentStartedAtRef.current || Date.now();
      const elapsedMs = Math.max(0, Date.now() - startedAt);
      const finish = () => {
        const chunks = segmentChunksRef.current;
        segmentChunksRef.current = [];
        segmentStartedAtRef.current = 0;
        disposeRecorderStream();

        const shouldUpload =
          forceUpload ||
          elapsedMs >= VOICE_CHUNK_UPLOAD_INTERVAL_MS ||
          (emittedChunksRef.current && reason === "final" && elapsedMs > 0);

        if (shouldUpload && chunks.length) {
          const type = recorder.mimeType || chunks[0]?.type || "audio/webm";
          const audioBlob = new Blob(chunks, { type });
          if (audioBlob.size > 0) {
            emittedChunksRef.current = true;
            chunkIndexRef.current += 1;
            queueUpload(audioBlob, chunkIndexRef.current);
          }
        }

        if (restart && enabledRef.current && !pausedRef.current && streamRef.current && isAudioChunkContextReady(contextRef.current)) {
          window.setTimeout(() => {
            const start = startSegmentRef.current;
            start?.();
          }, 0);
        }
        resolve();
      };

      recorder.addEventListener("stop", finish, { once: true });
      try {
        if (recorder.state !== "inactive") {
          recorder.stop();
        } else {
          finish();
        }
      } catch {
        finish();
      }
    });
  }, [clearIntervalTimer, disposeRecorderStream, queueUpload]);

  const startSegmentRef = useRef(null);
  const startSegment = useCallback(() => {
    if (!streamRef.current || recorderRef.current || pausedRef.current || !enabledRef.current) return;
    if (!isAudioChunkContextReady(contextRef.current)) return;

    const sourceStream = streamRef.current;
    const chunkStream = typeof sourceStream.clone === "function" ? sourceStream.clone() : sourceStream;
    const recorder = createAudioRecorder(chunkStream);
    if (!recorder) {
      if (chunkStream !== sourceStream) {
        chunkStream.getTracks().forEach((track) => track.stop());
      }
      return;
    }

    recorderStreamRef.current = chunkStream;
    segmentChunksRef.current = [];
    segmentStartedAtRef.current = Date.now();
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        segmentChunksRef.current.push(event.data);
      }
    };

    try {
      recorder.start();
      recorderRef.current = recorder;
      intervalTimerRef.current = window.setTimeout(() => {
        stopSegment({ reason: "interval", restart: true });
      }, VOICE_CHUNK_UPLOAD_INTERVAL_MS);
    } catch (error) {
      console.error("Audio chunk recorder start failed", error);
      recorderRef.current = null;
      disposeRecorderStream();
    }
  }, [disposeRecorderStream, stopSegment]);
  startSegmentRef.current = startSegment;

  useEffect(() => {
    if (!enabled || paused || !stream || !isAudioChunkContextReady(audioChunkContext)) return undefined;
    startSegment();
    return undefined;
  }, [audioChunkContext, enabled, paused, startSegment, stream]);

  useEffect(() => {
    if (paused) {
      stopSegment({ reason: "pause", forceUpload: true });
      return;
    }
    if (enabled && stream && isAudioChunkContextReady(audioChunkContext)) {
      startSegment();
    }
  }, [audioChunkContext, enabled, paused, startSegment, stopSegment, stream]);

  useEffect(() => {
    return () => {
      stopSegment({ reason: "cleanup", forceUpload: false });
    };
  }, [stopSegment]);

  const flushFinalChunks = useCallback(async () => {
    await stopSegment({ reason: "final", forceUpload: false });
    await uploadQueueRef.current;
  }, [stopSegment]);

  return { flushFinalChunks };
}

function useActiveMic(stream, devices, selectedDeviceId) {
  const [activeDeviceId, setActiveDeviceId] = useState(undefined);
  const lastNotifiedRef = useRef(undefined);

  useEffect(() => {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    const id = (track.getSettings && track.getSettings().deviceId) || selectedDeviceId;
    setActiveDeviceId(id || undefined);
  }, [stream, selectedDeviceId]);

  const activeDevice = useMemo(() => {
    if (activeDeviceId) {
      const m = devices.find((d) => d.deviceId === activeDeviceId);
      if (m) return m;
    }
    return devices[0];
  }, [devices, activeDeviceId]);

  useEffect(() => {
    const id = activeDevice?.deviceId;
    if (!id || !activeDevice?.label) return;
    if (lastNotifiedRef.current === undefined) {
      lastNotifiedRef.current = id;
      toast.success(`Connected microphone: ${activeDevice.label}`);
      return;
    }
    if (lastNotifiedRef.current !== id) {
      lastNotifiedRef.current = id;
      toast.success(`Microphone switched to ${activeDevice.label}`);
    }
  }, [activeDevice]);

  return { activeDevice };
}

// ── Transcript display helpers ────────────────────────────────────────────────

function AnimatedTranscript({ text, paused, className }) {
  const tokens = useMemo(() => text ? text.split(/(\s+)/) : [], [text]);
  const prevVisibleCountRef = useRef(0);
  let visibleIndex = -1;
  const prevVisible = prevVisibleCountRef.current;

  const rendered = tokens.map((tok, i) => {
    const isSpace = /^\s+$/.test(tok);
    if (isSpace) return <React.Fragment key={i}>{tok}</React.Fragment>;
    visibleIndex += 1;
    const isNew = visibleIndex >= prevVisible;
    const stagger = Math.min((visibleIndex - prevVisible) * 30, 280);
    return (
      <span key={i} className="vrx-word"
        style={isNew ? { animation: `vrxWordReveal 600ms cubic-bezier(0.22,1,0.36,1) ${stagger}ms both` } : undefined}>
        {tok}
      </span>
    );
  });

  useEffect(() => { prevVisibleCountRef.current = visibleIndex + 1; });

  return (
    <p className={className}>
      {rendered}
      {!paused && <span className="vrx-caret" aria-hidden />}
    </p>
  );
}

function AnimatedTranscriptPreview({ text, className }) {
  const tokens = useMemo(() => text ? text.split(/(\s+)/) : [], [text]);
  const prevVisibleCountRef = useRef(0);
  let visibleIndex = -1;
  const prevVisible = prevVisibleCountRef.current;

  const rendered = tokens.map((token, index) => {
    if (/^\s+$/.test(token)) return <span key={index}>{token}</span>;
    visibleIndex += 1;
    const isNew = visibleIndex >= prevVisible;
    const stagger = Math.min((visibleIndex - prevVisible) * 26, 220);
    return (
      <span key={index} className="vrx-word"
        style={isNew ? { "--vrx-stagger": `${stagger}ms` } : undefined}
        data-word-new={isNew ? "true" : undefined}>
        {token}
      </span>
    );
  });

  useEffect(() => { prevVisibleCountRef.current = visibleIndex + 1; });
  return <p className={className}>{rendered}</p>;
}

// ── Overlay processing view (used inside overlay layout) ──────────────────────

function OverlayProcessingView({ processingTranscript, processingLabel }) {
  const hasTranscript = hasTranscriptContent(processingTranscript);
  const isDiarized = hasDiarizedTranscript(processingTranscript);

  return (
    <div className={canvasStyles.overlayProcessing}>
      <div className={canvasStyles.overlayProcessingCard}>
        <div className={[canvasStyles.overlayTranscriptFrame, "relative"].join(" ")}>
          <ShineBorder
            variant="rotate"
            borderWidth={1.5}
            duration={2.2}
            shineColor={["#D565EA", "#673AAC", "#1A1994"]}
            baseColor="rgba(226,226,234,0.95)" />
          <div className={canvasStyles.overlayTranscriptScroll}>
            <div className={canvasStyles.overlayTranscriptSafeArea}>
              {hasTranscript ? (
                isDiarized ? (
                  <ConversationTranscript raw={processingTranscript} shimmer />
                ) : (
                  <DictationTranscript raw={processingTranscript} animate />
                )
              ) : (
                <p className={canvasStyles.overlayTranscriptPlaceholder}>
                  {processingLabel || "Refining your captured consultation..."}
                </p>
              )}
            </div>
          </div>
        </div>
        {hasTranscript ? <CaptionCarousel /> : null}
        <span className={canvasStyles.overlayProgressTrack} aria-hidden>
          <span className={canvasStyles.overlayProgressBar} />
        </span>
      </div>
    </div>
  );
}

// ── VoiceRecorderCore ─────────────────────────────────────────────────────────

export function VoiceRecorderCore({
  // Layout mode
  layout = "overlay",

  // Common
  onCancel,
  onCancelRequest,
  onSubmit,
  audioChunkContext,
  sectionLabel,
  showSectionInStatus = true,

  // Overlay-only
  variant = "stack",
  fillHeight = false,
  radiusClassName = "rounded-b-[16px]",
  enableCollapsedVoiceSession = false,
  hideCaptions = false,

  // Fullscreen-only
  mode,
  isAwaitingResponse = false,
  processingTranscript: processingTranscriptProp = "",
  submittedTranscript = "",
  isHandoffExiting = false,
  onCollapse,
  isPanelVisible = true,
  onPauseChange,
  patientName, // eslint-disable-line no-unused-vars

  // Transcript (fullscreen: live captions from parent; overlay: scripted fallback)
  transcript: externalTranscript = "",

  // Overlay processing state
  processingLabel,
  error: processingError,
  onClose: onErrorClose,
}) {
  const isFullscreen = layout === "fullscreen";
  const publishesCollapsedVoiceSession = isFullscreen || enableCollapsedVoiceSession;
  const rootRef = useRef(null);
  const transcriptScrollRef = useRef(null);
  const levelRef = useRef(0);

  const [manualMute, setManualMute] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => getSessionPreferredMicDeviceId());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [devicePopoverOpen, setDevicePopoverOpen] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(!isFullscreen && variant === "stack");
  const [isUltraCompact, setIsUltraCompact] = useState(false);
  const [submitProcessing, setSubmitProcessing] = useState(false);

  // Fullscreen: processing phase → bottom loader transition
  const [processingPhase, setProcessingPhase] = useState("idle");
  const [bottomLoaderActive, setBottomLoaderActive] = useState(false);
  const BOTTOM_EXIT_MS = 320;

  useEffect(() => {
    if (!isFullscreen) return;
    if (!isAwaitingResponse) { setProcessingPhase("idle"); return; }
    setProcessingPhase("submitting");
    const t = window.setTimeout(() => setProcessingPhase("processing"), 5000);
    return () => window.clearTimeout(t);
  }, [isAwaitingResponse, isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    if (processingPhase !== "processing") { setBottomLoaderActive(false); return; }
    const t = window.setTimeout(() => setBottomLoaderActive(true), BOTTOM_EXIT_MS);
    return () => window.clearTimeout(t);
  }, [processingPhase, isFullscreen]);

  const dockExiting = isFullscreen && processingPhase === "processing" && !bottomLoaderActive;
  const navLocked = isFullscreen && (isAwaitingResponse || submitProcessing);

  // Network
  const { online } = useNetConnection();
  const networkPaused = !online;

  // Derived paused state
  const paused = manualMute || networkPaused || isAwaitingResponse || submitProcessing;
  const chunkPaused = manualMute || networkPaused;

  // Recording timer
  const elapsedMs = useRecordingTimer(!paused);

  // Mic stream — disabled after submit/awaiting
  const micEnabled = isFullscreen ? !isAwaitingResponse : !submitProcessing;
  const { stream, devices, error: micError, retry: retryMic } = useMicStream(selectedDeviceId, micEnabled);

  // Blob recorder
  const { getBlob } = useBlobRecorder(stream, paused, micEnabled);
  const { flushFinalChunks } = useAudioChunkRecorder(stream, chunkPaused, micEnabled, audioChunkContext);

  // Active mic tracking
  const { activeDevice } = useActiveMic(stream, devices, selectedDeviceId);
  const fallbackNoticeShownRef = useRef(false);

  useEffect(() => {
    if (!selectedDeviceId || devices.length === 0) return;
    const selectedDeviceAvailable = devices.some((device) => device.deviceId === selectedDeviceId);
    if (selectedDeviceAvailable) {
      fallbackNoticeShownRef.current = false;
      return;
    }
    setSessionPreferredMicDeviceId(undefined);
    setSelectedDeviceId(undefined);
    if (!fallbackNoticeShownRef.current) {
      fallbackNoticeShownRef.current = true;
      toast.warning("Selected microphone is unavailable. Using default microphone.");
    }
  }, [devices, selectedDeviceId]);

  // Live transcript (overlay only; fullscreen receives transcript from parent via externalTranscript)
  const { transcript: liveFinal, error: liveError } = useLiveTranscript({
    enabled: !isFullscreen && !paused,
    paused: !isFullscreen && paused,
    lang: "en-US",
  });

  // Sync context (safe without provider — context has no-op defaults)
  const {
    activeVoiceLocks,
    activeVoiceLockIds,
    setMicUnavailable,
    claimActiveVoiceModule,
    releaseActiveVoiceModule,
    setCollapsedVoiceSession,
    voicePauseToggleRequest,
    voiceSubmitRequest
  } = useRxPadSync();
  const voiceLockIdRef = useRef(`voice-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const resumeBlockedByOtherVoice = manualMute && activeVoiceLockIds?.some((id) => (
    id !== voiceLockIdRef.current &&
    activeVoiceLocks?.[id]?.label !== sectionLabel
  ));

  useEffect(() => {
    setMicUnavailable(!!micError, micError || null);
    return () => setMicUnavailable(false);
  }, [micError, setMicUnavailable]);

  useEffect(() => {
    if (!sectionLabel) return;
    const lockId = voiceLockIdRef.current;
    if (!paused && micEnabled) {
      claimActiveVoiceModule(lockId, sectionLabel);
    } else {
      releaseActiveVoiceModule(lockId);
    }
    return () => releaseActiveVoiceModule(lockId);
  }, [claimActiveVoiceModule, micEnabled, paused, releaseActiveVoiceModule, sectionLabel]);

  // Mute stream tracks
  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !paused; });
  }, [stream, paused]);

  useEffect(() => { onPauseChange?.(paused); }, [paused, onPauseChange]);

  const pauseRequestSeenRef = useRef(voicePauseToggleRequest);
  useEffect(() => {
    if (!publishesCollapsedVoiceSession) return;
    if (pauseRequestSeenRef.current === voicePauseToggleRequest) return;
    pauseRequestSeenRef.current = voicePauseToggleRequest;
    if (!voicePauseToggleRequest || isAwaitingResponse || submitProcessing || networkPaused || micError) return;
    setManualMute((value) => !value);
  }, [publishesCollapsedVoiceSession, voicePauseToggleRequest, isAwaitingResponse, submitProcessing, networkPaused, micError]);

  // Resize observer
  useEffect(() => {
    if (!isFullscreen) return;
    const node = rootRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => { setIsCompactLayout(node.getBoundingClientRect().width < 340); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen || variant === "stack") return;
    const node = rootRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const w = node.getBoundingClientRect().width;
      setIsCompactLayout(w < 620);
      setIsUltraCompact(w < 500);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [isFullscreen, variant]);

  // Ambient level animation (fullscreen)
  useEffect(() => {
    if (!isFullscreen) return;
    const root = typeof document !== "undefined" ? document.documentElement : null;
    if (!root) return;
    let raf = 0;
    let smoothed = 0;
    let lastPublished = -1;
    const tick = () => {
      const target = paused ? 0 : levelRef.current;
      const rate = target > smoothed ? 0.55 : 0.22;
      smoothed += (target - smoothed) * rate;
      if (target < 0.005 && smoothed < 0.01) smoothed = 0;
      const shaped = Math.tanh(smoothed * 2.2) * 0.40;
      const rounded = Math.round(Math.max(0, Math.min(0.40, shaped)) * 1000) / 1000;
      if (rounded !== lastPublished) {
        root.style.setProperty("--vrx-live-level", rounded.toFixed(3));
        lastPublished = rounded;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); root.style.setProperty("--vrx-live-level", "0"); };
  }, [paused, isFullscreen]);

  // Blob level animation (overlay)
  useEffect(() => {
    if (isFullscreen) return;
    const node = rootRef.current;
    if (!node) return;
    let raf = 0;
    const tick = () => {
      node.style.setProperty("--vrx-blob-level", Math.max(0, Math.min(1, levelRef.current || 0)).toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isFullscreen]);

  // Transcript scroll
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); });
  }, [liveFinal, externalTranscript]);

  // Sound effects
  useEffect(() => { playVoiceRxStartSound(); }, []);

  const lastErrorToneRef = useRef(null);

  // ── Derived: critical block ─────────────────────────────────────────────────

  const criticalBlock = useMemo(() => {
    if (!online) return {
      kind: "offline",
      icon: <WifiOff size={isFullscreen ? 40 : 32} strokeWidth={2.2} absoluteStrokeWidth />,
      title: "You're offline",
      description: "Recording is paused until you're back online. Your transcript is safe.",
      canRetry: false,
    };
    if (micError) return {
      kind: "mic",
      icon: <MicOff size={isFullscreen ? 40 : 32} strokeWidth={2.2} absoluteStrokeWidth />,
      title: "Microphone unavailable",
      description: "Please allow microphone access in your browser.",
      canRetry: true,
    };
    return null;
  }, [online, micError, isFullscreen]);

  useEffect(() => { if (criticalBlock) setManualMute(true); }, [criticalBlock]);

  useEffect(() => {
    const key = criticalBlock ? `${criticalBlock.kind}:${criticalBlock.title}` : null;
    if (!key) { lastErrorToneRef.current = null; return; }
    if (lastErrorToneRef.current === key) return;
    lastErrorToneRef.current = key;
    playVoiceRxErrorSound();
  }, [criticalBlock]);

  // ── Derived: display transcript ─────────────────────────────────────────────

  // For fullscreen: externalTranscript is the live caption fed from parent (useDrAgentPanel)
  // For overlay: prefer externalTranscript (scripted), fall back to live
  const liveDisplayText = isFullscreen ? "" : (externalTranscript?.trim() ? externalTranscript : (liveError ? "" : liveFinal));

  // Fullscreen: resolve which transcript to display given processing phases
  const fsDisplayTranscript = useMemo(() => {
    if (!isFullscreen) return "";
    const liveHasText = hasTranscriptContent(externalTranscript);
    const submittedHasText = hasTranscriptContent(submittedTranscript);
    const processingHasText = hasTranscriptContent(processingTranscriptProp);
    return processingHasText ? processingTranscriptProp
      : (isAwaitingResponse && submittedHasText ? submittedTranscript
        : liveHasText ? externalTranscript : "");
  }, [isFullscreen, externalTranscript, submittedTranscript, processingTranscriptProp, isAwaitingResponse]);

  // Freeze transcript on criticalBlock (fullscreen only)
  const frozenFsTranscriptRef = useRef(null);
  if (isFullscreen && criticalBlock) {
    if (frozenFsTranscriptRef.current === null) frozenFsTranscriptRef.current = fsDisplayTranscript;
  } else if (frozenFsTranscriptRef.current !== null) {
    frozenFsTranscriptRef.current = null;
  }
  const effectiveFsTranscript = frozenFsTranscriptRef.current ?? fsDisplayTranscript;
  const effectiveFsTranscriptText = transcriptToText(effectiveFsTranscript);
  const fsCaptionHasText = hasTranscriptContent(effectiveFsTranscript);

  const overlayHasTranscript = !isFullscreen && liveDisplayText.trim().length > 0;

  // ── Derived: canSubmit ──────────────────────────────────────────────────────

  const canSubmit = isFullscreen
    ? (!isAwaitingResponse && !networkPaused && !micError && (externalTranscript?.trim()?.length > 0 || elapsedMs >= 2000))
    : (!submitProcessing && !criticalBlock && (overlayHasTranscript || elapsedMs >= 2000));

  // ── Derived: status label ───────────────────────────────────────────────────

  const statusLabel = useMemo(() => {
    if (isAwaitingResponse || submitProcessing) return "Processing";
    if (!online) return "Waiting for connection";
    if (micError) return "Mic unavailable";
    if (manualMute) return "Paused";
    return "Listening";
  }, [isAwaitingResponse, submitProcessing, online, micError, manualMute]);

  const isListening = statusLabel === "Listening";
  const shouldShowSectionLabel = showSectionInStatus && sectionLabel && sectionLabel !== "Dr Agent";

  useEffect(() => {
    if (!publishesCollapsedVoiceSession) return;
    setCollapsedVoiceSession({
      active: !isAwaitingResponse && !submitProcessing,
      paused,
      statusLabel,
      elapsedLabel: formatElapsed(elapsedMs),
      audioLevel: paused ? 0 : Math.max(0, Math.min(1, levelRef.current || 0))
    });
  }, [
    publishesCollapsedVoiceSession,
    setCollapsedVoiceSession,
    isAwaitingResponse,
    submitProcessing,
    paused,
    statusLabel,
    elapsedMs
  ]);

  useEffect(() => {
    if (!publishesCollapsedVoiceSession) return undefined;
    return () => {
      setCollapsedVoiceSession({
        active: false,
        paused: false,
        statusLabel: "",
        elapsedLabel: "",
        audioLevel: 0
      });
    };
  }, [publishesCollapsedVoiceSession, setCollapsedVoiceSession]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSubmitClick = useCallback(async () => {
    if (submitProcessing || (isFullscreen && isAwaitingResponse) || !canSubmit) return;
    if (isFullscreen) playSubmitSound();
    setSubmitProcessing(true);
    const submitClickedAtMs = Date.now();
    const submitClickedAt = new Date(submitClickedAtMs).toISOString();
    let audioBlob = null;
    try { audioBlob = await getBlob(); } catch (e) { console.error("Failed to capture audio blob", e); }
    try { await flushFinalChunks(); } catch (e) { console.error("Failed to flush audio chunks", e); }
    const transcript = isFullscreen ? externalTranscript : liveDisplayText;
    try {
      await onSubmit?.({ audioBlob, transcript, durationMs: elapsedMs, submitClickedAt, submitClickedAtMs, micBeingUsed: activeDevice?.label || "" });
    } catch (e) {
      console.error("Voice submit failed", e);
    } finally {
      setSubmitProcessing(false);
    }
  }, [submitProcessing, isFullscreen, isAwaitingResponse, canSubmit, getBlob, flushFinalChunks, onSubmit, externalTranscript, liveDisplayText, elapsedMs, activeDevice?.label]);

  const submitRequestSeenRef = useRef(voiceSubmitRequest);
  useEffect(() => {
    if (!publishesCollapsedVoiceSession) return;
    if (submitRequestSeenRef.current === voiceSubmitRequest) return;
    submitRequestSeenRef.current = voiceSubmitRequest;
    if (!voiceSubmitRequest) return;
    handleSubmitClick();
  }, [publishesCollapsedVoiceSession, voiceSubmitRequest, handleSubmitClick]);

  const handleDeviceSelect = useCallback((id) => {
    setSessionPreferredMicDeviceId(id);
    setSelectedDeviceId(id);
    setDevicePopoverOpen(false);
  }, []);
  const handleCancelConfirm = useCallback(() => { setConfirmOpen(false); onCancel?.(); }, [onCancel]);
  const handleRequestCancel = useCallback(() => {
    if (onCancelRequest) {
      onCancelRequest();
      return;
    }
    setConfirmOpen(true);
  }, [onCancelRequest]);

  // ── Shared CTA elements (used in both layouts) ───────────────────────────────

  const compactControls = !isFullscreen && (variant === "stack" || isCompactLayout);
  const s = isFullscreen ? fsStyles : osStyles;

  const cancelBtn = (
    <button
      type="button"
      onClick={handleRequestCancel}
      aria-label="End voice consultation"
      className={[
        "vrx-lg-btn vrx-close-btn group relative flex shrink-0 items-center justify-center rounded-[12px] transition-transform active:scale-[0.94]",
        isFullscreen
          ? "h-[42px] w-[42px]"
          : isUltraCompact ? s.ctaBtnUltra : compactControls ? s.ctaBtnCompact : s.ctaBtnNormal,
      ].filter(Boolean).join(" ")}>
      <span className="vrx-lg-surface" aria-hidden />
      <span className="vrx-lg-sheen" aria-hidden />
      <svg
        width={!isFullscreen && isUltraCompact ? 18 : !isFullscreen && compactControls ? 20 : 24}
        height={!isFullscreen && isUltraCompact ? 18 : !isFullscreen && compactControls ? 20 : 24}
        viewBox="0 0 24 24" fill="none" className="relative text-[#DC2626] transition-colors">
        <path d="M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 6L18 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  const micSegment = (
    <div className={[
      "vrx-lg-btn relative flex items-stretch overflow-hidden rounded-[12px] transition-opacity",
      isFullscreen
        ? ["h-[42px]", (criticalBlock || isAwaitingResponse) ? s.micSegmentDimmed : "", criticalBlock ? s.micSegmentNoPointer : "", manualMute ? "vrx-mic-muted" : ""].filter(Boolean).join(" ")
        : [isUltraCompact ? s.ctaBtnUltra : compactControls ? s.ctaBtnCompact : s.ctaBtnNormal, manualMute ? "vrx-mic-muted" : "", criticalBlock ? s.micSegmentCritical : ""].filter(Boolean).join(" "),
    ].join(" ")}>
      <span className="vrx-lg-surface" aria-hidden />
      <span className="vrx-lg-sheen" aria-hidden />
      <button
        type="button"
        onClick={() => {
          if (resumeBlockedByOtherVoice) return;
          setManualMute((v) => !v);
        }}
        disabled={isFullscreen ? (networkPaused || isAwaitingResponse || resumeBlockedByOtherVoice) : (!!criticalBlock || resumeBlockedByOtherVoice)}
        aria-label={manualMute ? "Unmute microphone" : "Mute microphone"}
        aria-pressed={manualMute}
        className={[
          s.micBtn || s.micToggleBtn,
          isFullscreen ? (manualMute ? s.micBtnMuted : s.micBtnNormal)
            : [isUltraCompact ? s.micToggleBtnUltra : compactControls ? s.micToggleBtnCompact : s.micToggleBtnNormal, manualMute ? s.micToggleMuted : s.micToggleNormal].join(" "),
        ].filter(Boolean).join(" ")}>
        <span className={s.micIconWrap}>
          {isFullscreen ? (
            manualMute ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M16.4201 6.41965V7.57965L9.14008 14.8596C8.18008 13.9896 7.58008 12.7096 7.58008 11.3396V6.41965C7.58008 4.35965 8.98008 2.64965 10.8801 2.15965C11.0701 2.10965 11.2501 2.26965 11.2501 2.45965V3.99965C11.2501 4.40965 11.5901 4.74965 12.0001 4.74965C12.4101 4.74965 12.7501 4.40965 12.7501 3.99965V2.45965C12.7501 2.26965 12.9301 2.10965 13.1201 2.15965C15.0201 2.64965 16.4201 4.35965 16.4201 6.41965Z" />
                <path d="M19.81 9.81012V11.4001C19.81 15.4701 16.68 18.8201 12.7 19.1701V21.3001C12.7 21.6901 12.39 22.0001 12 22.0001C11.61 22.0001 11.3 21.6901 11.3 21.3001V19.1701C10.21 19.0701 9.18001 18.7501 8.26001 18.2401L9.29001 17.2101C10.11 17.5901 11.03 17.8101 12 17.8101C15.54 17.8101 18.42 14.9301 18.42 11.4001V9.81012C18.42 9.43012 18.73 9.12012 19.12 9.12012C19.5 9.12012 19.81 9.43012 19.81 9.81012Z" />
                <path d="M16.42 10.0801V11.5301C16.42 14.1101 14.2 16.1801 11.56 15.9301C11.28 15.9001 11 15.8501 10.74 15.7601L16.42 10.0801Z" />
                <path d="M21.7701 2.22988C21.4701 1.92988 20.9801 1.92988 20.6801 2.22988L7.23012 15.6799C6.20012 14.5499 5.58012 13.0499 5.58012 11.3999V9.80988C5.58012 9.42988 5.27012 9.11988 4.88012 9.11988C4.50012 9.11988 4.19012 9.42988 4.19012 9.80988V11.3999C4.19012 13.4299 4.97012 15.2799 6.24012 16.6699L2.22012 20.6899C1.92012 20.9899 1.92012 21.4799 2.22012 21.7799C2.38012 21.9199 2.57012 21.9999 2.77012 21.9999C2.97012 21.9999 3.16012 21.9199 3.31012 21.7699L21.7701 3.30988C22.0801 3.00988 22.0801 2.52988 21.7701 2.22988Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M19.12 9.12c-.39 0-.7.31-.7.7v1.58c0 3.54-2.88 6.42-6.42 6.42s-6.42-2.88-6.42-6.42V9.81c0-.39-.31-.7-.7-.7-.39 0-.7.31-.7.7v1.58c0 4.07 3.13 7.42 7.12 7.78v2.13c0 .39.31.7.7.7.39 0 .7-.31.7-.7v-2.13c3.98-.35 7.12-3.71 7.12-7.78V9.81a.707.707 0 0 0-.7-.69Z" />
                <path d="M12 2c-2.44 0-4.42 1.98-4.42 4.42v5.12c0 2.44 1.98 4.42 4.42 4.42s4.42-1.98 4.42-4.42V6.42C16.42 3.98 14.44 2 12 2Zm1.31 6.95c-.07.26-.3.43-.56.43-.05 0-.1-.01-.15-.02-.39-.11-.8-.11-1.19 0-.32.09-.63-.1-.71-.41-.09-.31.1-.63.41-.71.59-.16 1.21-.16 1.8 0 .3.08.48.4.4.71Zm.53-1.94c-.09.24-.31.38-.55.38-.07 0-.14-.01-.2-.03-.69-.26-1.47-.26-2.17 0-.3.11-.63-.05-.74-.35-.11-.3.05-.63.35-.74.97-.35 2.03-.35 3 0 .3.11.46.44.31.74Z" />
              </svg>
            )
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path opacity="0.4" d="M19.12 9.12c-.39 0-.7.31-.7.7v1.58c0 3.54-2.88 6.42-6.42 6.42s-6.42-2.88-6.42-6.42V9.81c0-.39-.31-.7-.7-.7-.39 0-.7.31-.7.7v1.58c0 4.07 3.13 7.42 7.12 7.78v2.13c0 .39.31.7.7.7.39 0 .7-.31.7-.7v-2.13c3.98-.35 7.12-3.71 7.12-7.78V9.81a.707.707 0 0 0-.7-.69Z" />
                <path d="M12 2c-2.44 0-4.42 1.98-4.42 4.42v5.12c0 2.44 1.98 4.42 4.42 4.42s4.42-1.98 4.42-4.42V6.42C16.42 3.98 14.44 2 12 2Zm1.31 6.95c-.07.26-.3.43-.56.43-.05 0-.1-.01-.15-.02-.39-.11-.8-.11-1.19 0-.32.09-.63-.1-.71-.41-.09-.31.1-.63.41-.71.59-.16 1.21-.16 1.8 0 .3.08.48.4.4.71Zm.53-1.94c-.09.24-.31.38-.55.38-.07 0-.14-.01-.2-.03-.69-.26-1.47-.26-2.17 0-.3.11-.63-.05-.74-.35-.11-.3.05-.63.35-.74.97-.35 2.03-.35 3 0 .3.11.46.44.31.74Z" />
              </svg>
              {manualMute && (
                <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                  <line x1="3.5" y1="16.5" x2="16.5" y2="3.5" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
                  <line x1="3.5" y1="16.5" x2="16.5" y2="3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </>
          )}
        </span>
      </button>

      <div className="vrx-lg-divider" aria-hidden />

      <Popover open={devicePopoverOpen} onOpenChange={setDevicePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isFullscreen ? (!!criticalBlock || isAwaitingResponse) : !!criticalBlock}
            aria-label="Choose microphone"
            className={[
              s.devicePickerBtn,
              !isFullscreen && (compactControls ? s.devicePickerCompact : s.devicePickerNormal),
              isFullscreen
                ? (manualMute ? s.devicePickerMuted : s.devicePickerNormal)
                : (manualMute ? s.devicePickerMuted : s.devicePickerDefault),
            ].filter(Boolean).join(" ")}>
            <ChevronDown
              size={!isFullscreen && compactControls ? 14 : 16}
              strokeWidth={2.5}
              className={devicePopoverOpen ? s.chevronOpen : s.chevronClosed}
              aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" side="top" sideOffset={8} data-voice-allow className={s.devicePopoverContent}>
          <div className={s.devicePopoverHeader}>Microphone</div>
          {devices.length === 0 ? (
            <div className={s.devicePopoverEmpty}>{micError || "No input devices detected"}</div>
          ) : (
            devices.map((d, i) => {
              const isSelected = activeDevice?.deviceId === d.deviceId || (selectedDeviceId ? selectedDeviceId === d.deviceId : i === 0);
              return (
                <button key={d.deviceId || i} type="button" onClick={() => handleDeviceSelect(d.deviceId)}
                  className={[s.deviceItem, isSelected ? s.deviceItemSelected : s.deviceItemNormal].join(" ")}>
                  <span className={s.deviceItemLabel}>{d.label || `Microphone (${(d.deviceId || "default").slice(0, 6)})`}</span>
                  {isSelected && <Check size={14} className={s.deviceItemCheck} />}
                </button>
              );
            })
          )}
        </PopoverContent>
      </Popover>
    </div>
  );

  const submitBtn = isFullscreen && isAwaitingResponse ? (
    <div role="status" aria-label="Processing consultation"
      className={[s.processingLoader, "relative flex h-[42px] items-center justify-center gap-[8px] rounded-[12px]"].join(" ")}>
      <span aria-hidden className={s.processingSpinner} />
      <span className={s.processingLabel}>Processing</span>
    </div>
  ) : (
    <button
      type="button"
      onClick={handleSubmitClick}
      disabled={!canSubmit}
      aria-label="Submit"
      style={isFullscreen ? { paddingLeft: 18, paddingRight: 22 } : undefined}
      className={[
        "vrx-submit-hero group relative flex items-center overflow-hidden rounded-[12px] text-white transition-transform",
        isFullscreen
          ? ["h-[42px] gap-[8px]", canSubmit ? s.submitEnabled : "vrx-submit-dim cursor-not-allowed", criticalBlock ? s.submitCritical : ""].filter(Boolean).join(" ")
          : [isUltraCompact ? s.submitBtnUltra : compactControls ? s.submitBtnCompact : s.submitBtnNormal,
            (submitProcessing || (!criticalBlock && (overlayHasTranscript || elapsedMs >= 2000))) ? s.submitEnabled : criticalBlock ? "vrx-submit-dim cursor-not-allowed opacity-40" : "vrx-submit-dim cursor-not-allowed"].join(" "),
      ].join(" ")}>
      <span className="vrx-submit-gradient absolute inset-0 rounded-[inherit]" aria-hidden />
      <span className={[s.submitTopSheen, "pointer-events-none absolute inset-x-0 top-0 h-[55%] rounded-[inherit]"].join(" ")} aria-hidden />
      {canSubmit && <span aria-hidden className="vrx-submit-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]" />}
      <span className={isFullscreen ? "relative z-[1] flex items-center gap-[8px]" : (isUltraCompact ? s.submitIconRowUltra : s.submitIconRow)}>
        {submitProcessing && !isFullscreen ? (
          <span className={s.submitSpinner} aria-hidden />
        ) : (
          <svg width={!isFullscreen && isUltraCompact ? 18 : !isFullscreen && compactControls ? 20 : 24}
            height={!isFullscreen && isUltraCompact ? 18 : !isFullscreen && compactControls ? 20 : 24}
            viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M20.46 6.17969L8.82003 17.8197L3.53003 12.5297" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className={[
          "font-semibold tracking-[0.2px]",
          !isFullscreen && (isUltraCompact ? s.submitLabelUltra : compactControls ? s.submitLabelCompact : s.submitLabelNormal),
          isFullscreen && "text-[14px]",
        ].filter(Boolean).join(" ")}>
          {submitProcessing && !isFullscreen ? "Processing" : "Submit"}
        </span>
      </span>
    </button>
  );

  const statusPill = (
    <div className={isFullscreen ? s.statusRow : s.statusPillRow}>
      <div
        className={[
          "vrx-status-card relative inline-flex items-center gap-[6px] rounded-t-[10px] rounded-b-none bg-white/60 backdrop-blur-[10px] transition-all duration-200",
          isFullscreen ? "gap-[8px] pl-[12px] pr-[14px] pt-[7px] pb-[10px] rounded-t-[12px]" : "pl-[10px] pr-[12px] pt-[4px] pb-[5px]",
          criticalBlock ? "vrx-status-card--error" : manualMute ? "vrx-status-card--paused" : "",
        ].filter(Boolean).join(" ")}
        role={!isFullscreen && micError ? "alert" : "status"}
        aria-live="polite">
        {criticalBlock ? (
          <span className={[s.statusIconError || "", "inline-flex h-[14px] w-[14px] items-center justify-center text-red-500"].join(" ")}>
            <AlertCircle size={14} strokeWidth={2.4} />
          </span>
        ) : isListening ? (
          <span className={["relative inline-flex items-center justify-center", isFullscreen ? "h-[10px] w-[10px]" : s.statusIconListening || "h-[10px] w-[10px]"].join(" ")}>
            <span className="absolute inset-0 rounded-full bg-rose-400" />
            <span className={["absolute inset-0 rounded-full bg-rose-400/55", s.recRingAnim || s.recRing].filter(Boolean).join(" ")} />
          </span>
        ) : manualMute ? (
          <span className={[isFullscreen ? "inline-flex h-[10px] w-[10px] items-center justify-center text-amber-500/80" : s.statusIconPaused || ""].join(" ")}>
            <svg width={7} height={9} viewBox="0 0 8 10" fill="none" aria-hidden>
              <rect x="0" y="0" width="3" height="10" rx="1" fill="currentColor" />
              <rect x="5" y="0" width="3" height="10" rx="1" fill="currentColor" />
            </svg>
          </span>
        ) : (
          <span className={s.statusDot} />
        )}
        <span className={[s.statusText || s.statusText, criticalBlock ? (s.statusTextError || "") : (s.statusTextNormal || "")].filter(Boolean).join(" ")}>
          {statusLabel}
          {!criticalBlock && shouldShowSectionLabel && (
            <span className={s.statusSection || s.statusElapsed || ""}>{" · "}{sectionLabel}</span>
          )}
          {!criticalBlock && (isListening || manualMute) && elapsedMs > 0 && (
            <span className={s.statusElapsed || s.elapsedInStatus || ""}>({formatElapsed(elapsedMs)})</span>
          )}
        </span>
      </div>
    </div>
  );

  const confirmDialog = (
    <TPConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Close this voice consultation?"
      warning="Are you sure you want to close this voice Rx? If you close it, no data will be stored."
      primaryLabel="Keep recording"
      onPrimary={() => setConfirmOpen(false)}
      secondaryLabel="Discard & Go Back"
      secondaryTone="destructive"
      onSecondary={handleCancelConfirm} />
  );

  // ── FULLSCREEN LAYOUT ────────────────────────────────────────────────────────

  if (isFullscreen) {
    return (
      <>
        <div
          ref={rootRef}
          className={[fsStyles.root, !isPanelVisible && fsStyles.invisible].filter(Boolean).join(" ")}
          aria-hidden={!isPanelVisible}>

          <div className={fsStyles.bgTransparent} aria-hidden />

          <div
            className={["pointer-events-none", fsStyles.ambientFooterWash].join(" ")}
            aria-hidden
            style={{ opacity: "calc(0.78 + var(--vrx-live-level, 0) * 0.35)" }} />

          {/* Top bar */}
          <div className={[fsStyles.topBar, isCompactLayout ? fsStyles.topBarCompact : fsStyles.topBarNormal].join(" ")}>
            <span className={["vrx-mode-heading pointer-events-auto", fsStyles.modeHeadingChipIn].join(" ")}>
              <button
                type="button"
                onClick={navLocked ? undefined : handleRequestCancel}
                disabled={navLocked}
                aria-label="Go back"
                className={[fsStyles.backBtn, navLocked ? fsStyles.navBtnDisabled : ""].filter(Boolean).join(" ")}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className={[fsStyles.modeHeadingLabel, fsStyles.modeHeadingLabelText].join(" ")}>
                {mode === "ambient_consultation" ? "Conversation Mode" : "Dictation Mode"}
              </span>
            </span>

            <button
              type="button"
              onClick={navLocked ? undefined : onCollapse}
              disabled={navLocked}
              aria-label="Minimize agent"
              className={["vrx-agent-collapse-tag pointer-events-auto", fsStyles.collapseChipIn, navLocked ? fsStyles.navBtnDisabled : ""].filter(Boolean).join(" ")}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 3v18" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className={fsStyles.mainBody}>
            {bottomLoaderActive ? (
              <div className={[
                "vrx-transcript-zone-in",
                fsStyles.processingZone,
                isCompactLayout ? fsStyles.processingZoneCompact : fsStyles.processingZoneNormal,
                isHandoffExiting && "vrx-shiner-handoff-exit",
              ].filter(Boolean).join(" ")}>
                <VoiceTranscriptProcessingCard
                  mode={mode === "ambient_consultation" ? "ambient_consultation" : "dictation"}
                  transcript={processingTranscriptProp}
                  transcriptPending={!hasTranscriptContent(processingTranscriptProp)} />

                <div className={["vrx-shiner-loader", fsStyles.shinerLoader, isHandoffExiting && "vrx-bottom-loader--exit"].filter(Boolean).join(" ")}>
                  <CaptionCarousel />
                  <div className={fsStyles.progressTrack}>
                    <span aria-hidden className={["vrx-progress-fill", fsStyles.progressFill].join(" ")} />
                    <span aria-hidden className="vrx-progress-sheen absolute inset-y-0 left-0 block w-[40%] rounded-full" />
                  </div>
                </div>
              </div>
            ) : (
              <div className={[
                fsStyles.transcriptZone,
                isCompactLayout ? fsStyles.transcriptZoneCompact : fsStyles.transcriptZoneNormal,
                dockExiting && "vrx-transcript-zone--exit",
              ].filter(Boolean).join(" ")}>
                <div className={["pointer-events-none", fsStyles.transcriptFadeTop].join(" ")} aria-hidden />
                <div className={["pointer-events-none", fsStyles.transcriptFadeBottom].join(" ")} aria-hidden />

                {!criticalBlock || fsCaptionHasText ? (
                  <div
                    ref={transcriptScrollRef}
                    className={[
                      "vrx-scroll",
                      fsStyles.transcriptScrollBase,
                      criticalBlock && fsCaptionHasText ? fsStyles.transcriptBlurred : "",
                      isCompactLayout ? fsStyles.transcriptScrollCompact : fsStyles.transcriptScroll,
                    ].filter(Boolean).join(" ")}>
                    {fsCaptionHasText ? (
                      <AnimatedTranscript
                        text={effectiveFsTranscriptText}
                        paused={paused}
                        className={[fsStyles.transcriptText, isCompactLayout ? fsStyles.transcriptTextCompact : fsStyles.transcriptTextNormal].join(" ")} />
                    ) : (
                      <div className={["flex flex-col items-center justify-center text-center", fsStyles.placeholderIn].join(" ")}>
                        <p className={[fsStyles.placeholderText, isCompactLayout ? fsStyles.placeholderTextCompact : fsStyles.placeholderTextNormal].join(" ")}>
                          Start speaking, you&rsquo;ll see the caption here
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {criticalBlock && (
                  <div className={fsStyles.criticalOverlay} role="status" aria-live="polite">
                    <span className={fsStyles.emptyMark} aria-hidden>
                      <span className={fsStyles.emptyHalo1} />
                      <span className={fsStyles.emptyHalo2} />
                      <span className={fsStyles.emptyIconCircle}>{criticalBlock.icon}</span>
                    </span>
                    <h3 className={fsStyles.criticalTitle}>{criticalBlock.title}</h3>
                    <p className={[fsStyles.criticalDesc, isCompactLayout ? fsStyles.criticalDescCompact : fsStyles.criticalDescNormal].join(" ")}>
                      {criticalBlock.description}
                    </p>
                    {criticalBlock.kind === "mic" && (
                      <button type="button" onClick={retryMic} className={fsStyles.retryMicBtn}>
                        <Mic size={14} strokeWidth={2.2} aria-hidden />
                        Allow microphone access
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom zone */}
            {!bottomLoaderActive && (
              <div className={["vrx-bottom-block", fsStyles.bottomBlock, dockExiting && "vrx-bottom-block--exit"].filter(Boolean).join(" ")}>
                {!criticalBlock ? (
                  <div
                    className={fsStyles.waveformContainer}
                    style={{
                      "--vrx-waveform-margin-x": isCompactLayout ? "-16px" : "-22px",
                      "--vrx-waveform-margin-top": isCompactLayout ? "20px" : "28px",
                      "--vrx-waveform-margin-bottom": isCompactLayout ? "10px" : "14px",
                      "--vrx-waveform-width": isCompactLayout ? "calc(100% + 32px)" : "calc(100% + 44px)",
                    }}>
                    <VoiceRxSiriWaveform
                      stream={stream}
                      paused={paused}
                      levelRef={levelRef}
                      className={["relative px-0", fsStyles.waveformOpacity, isCompactLayout ? fsStyles.waveformCompact : fsStyles.waveformNormal].join(" ")} />
                  </div>
                ) : (
                  <div className={fsStyles.errorSpacer} aria-hidden />
                )}

                <div className={[fsStyles.ctaRow, isCompactLayout ? fsStyles.ctaRowCompact : fsStyles.ctaRowNormal].join(" ")}>
                  {cancelBtn}
                  <span className="vrx-cta-divider" aria-hidden />
                  {micSegment}
                  <span className="vrx-cta-divider" aria-hidden />
                  {submitBtn}
                </div>

                {statusPill}
              </div>
            )}
          </div>

          {confirmDialog}
        </div>

      </>
    );
  }

  // ── OVERLAY LAYOUT ───────────────────────────────────────────────────────────

  // Show processing or error view when isAwaitingResponse or error
  const showProcessingView = isAwaitingResponse || !!processingError;

  const waveStrip = (
    <div className={[
      osStyles.waveStripWrap,
      variant === "stack" ? osStyles.waveStripStack
        : isUltraCompact ? osStyles.waveStripUltra
        : compactControls ? osStyles.waveStripCompact : osStyles.waveStripNormal,
    ].join(" ")}>
      <VoiceRxSiriWaveform className="absolute inset-0 h-full w-full" stream={stream} paused={paused} levelRef={levelRef} />
      {paused && <div className={osStyles.waveStripPausedOverlay} />}
    </div>
  );

  const overlayTranscriptBlock = criticalBlock ? (
    variant === "stack" ? (
      <div className={osStyles.errorStackWrap} role="status" aria-live="polite">
        <div aria-hidden className={[osStyles.errorHaloOuter, osStyles.errorHaloOuterStack].join(" ")}>
          <span className={[osStyles.errorHaloInner, osStyles.errorHaloInnerStack].join(" ")} />
          <span className={osStyles.errorIcon}>{criticalBlock.icon}</span>
        </div>
        <h3 className={osStyles.errorTitleStack}>{criticalBlock.title}</h3>
        <p className={osStyles.errorDescStack}>{criticalBlock.description}</p>
        {criticalBlock.canRetry && (
          <button type="button" onClick={retryMic} className={osStyles.retryBtn}>
            <Mic size={13} strokeWidth={2.2} aria-hidden />
            Allow microphone access
          </button>
        )}
      </div>
    ) : (
      <div className={osStyles.errorRowWrap} role="status" aria-live="polite">
        <div aria-hidden className={[osStyles.errorHaloOuter, osStyles.errorHaloOuterRow].join(" ")}>
          <span className={[osStyles.errorHaloInner, osStyles.errorHaloInnerRow].join(" ")} />
          <span className={osStyles.errorIconRow}>{criticalBlock.icon}</span>
        </div>
        <h3 className={osStyles.errorTitleRow}>{criticalBlock.title}</h3>
        {criticalBlock.canRetry ? (
          <button type="button" onClick={retryMic} className={osStyles.retryBtnRow}>
            <Mic size={11} strokeWidth={2.2} aria-hidden />
            Allow microphone access
          </button>
        ) : (
          <p className={osStyles.errorDescRow}>{criticalBlock.description}</p>
        )}
      </div>
    )
  ) : (
    <div className={osStyles.transcriptWrap}>
      <div
        ref={transcriptScrollRef}
        className={[
          osStyles.transcriptScroll,
          variant === "stack" ? osStyles.transcriptScrollStack : osStyles.transcriptScrollRow,
        ].join(" ")}>
        {overlayHasTranscript ? (
          <AnimatedTranscriptPreview
            text={liveDisplayText}
            className={[
              osStyles.transcriptText,
              variant === "stack" ? osStyles.transcriptTextStack : osStyles.transcriptTextRow,
            ].join(" ")} />
        ) : (
          <p className={[
            osStyles.transcriptPlaceholder,
            variant === "stack" ? osStyles.transcriptPlaceholderStack : osStyles.transcriptPlaceholderRow,
          ].join(" ")}>
            Start speaking, you&apos;ll see the caption here
          </p>
        )}
      </div>
    </div>
  );

  const overlayCTARow = (
    <div className={[
      osStyles.ctaRow,
      isUltraCompact ? osStyles.ctaRowUltra : compactControls ? osStyles.ctaRowCompact : osStyles.ctaRowNormal,
    ].join(" ")}>
      {cancelBtn}
      <span className={["vrx-cta-divider", compactControls ? osStyles.ctaDividerCompact : "", isUltraCompact ? osStyles.ctaDividerUltra : ""].filter(Boolean).join(" ")} aria-hidden />
      {micSegment}
      <span className={["vrx-cta-divider", compactControls ? osStyles.ctaDividerCompact : "", isUltraCompact ? osStyles.ctaDividerUltra : ""].filter(Boolean).join(" ")} aria-hidden />
      {submitBtn}
    </div>
  );

  return (
    <div
      ref={rootRef}
      data-voice-allow
      className={[
        osStyles.recorderRoot,
        fillHeight ? osStyles.recorderFillHeight : "",
        radiusClassName,
        showProcessingView || variant !== "stack" ? osStyles.recorderBg : osStyles.recorderBgStack,
      ].filter(Boolean).join(" ")}>

      {showProcessingView ? (
        <OverlayProcessingView
          processingTranscript={processingTranscriptProp}
          processingLabel={processingLabel} />
      ) : variant === "stack" ? (
        <>
          <div aria-hidden className={["pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden flex justify-center", osStyles.blobWrapperStack].join(" ")}>
            <div className={["tp-voice-blob tp-voice-blob--reactive h-[120px] w-[280px]", osStyles.blobMargin].join(" ")} />
          </div>
          <div className={[osStyles.stackContent, fillHeight ? osStyles.stackContentFill : ""].join(" ")}>
            {!hideCaptions ? (
              <div className={osStyles.stackTranscriptArea}>
                <div className={osStyles.stackTranscriptInner}>{overlayTranscriptBlock}</div>
              </div>
            ) : null}
            <div className={osStyles.stackWaveArea}>{waveStrip}</div>
            <div className={osStyles.stackCtaArea}>{overlayCTARow}</div>
          </div>
        </>
      ) : (
        <>
          <div aria-hidden className={[
            "pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden flex justify-center",
            isUltraCompact ? osStyles.blobWrapperRowUltra : osStyles.blobWrapperRow,
          ].join(" ")}>
            <div className={[
              "tp-voice-blob tp-voice-blob--reactive",
              isUltraCompact ? "h-[88px] w-[200px]" : "h-[104px] w-[240px]",
              osStyles.blobMargin,
            ].join(" ")} />
          </div>
          <div className={[osStyles.rowContent, isUltraCompact ? osStyles.rowContentUltra : osStyles.rowContentNormal].join(" ")}>
            {!hideCaptions ? (
              <>
                <div className={osStyles.rowTranscriptCol}>{overlayTranscriptBlock}</div>
                <div aria-hidden className={osStyles.rowDivider} />
              </>
            ) : null}
            <div className={osStyles.rowActionsCol}>
              {waveStrip}
              {overlayCTARow}
            </div>
          </div>
        </>
      )}

      {!showProcessingView && statusPill}
      {confirmDialog}
    </div>
  );
}
