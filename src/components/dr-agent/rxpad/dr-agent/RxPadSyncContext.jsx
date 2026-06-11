import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const RxPadSyncContext = createContext({
  lastCopyRequest: null,
  lastSignal: null,
  requestCopyToRxPad: () => {},
  publishSignal: () => {},
  patientAllergies: [],
  setPatientAllergies: () => {},
  aiFillInProgress: false,
  setAiFillInProgress: () => {},
  voiceActive: false,
  copyAllAuraActive: false,
  flashCopyAllAura: () => {},
  copyOverlayActive: false,
  runCopyWithAura: () => {},
  setVoiceActive: () => {},
  activeVoiceModule: null,
  activeVoiceLocks: {},
  activeVoiceLockIds: [],
  setActiveVoiceModule: () => {},
  claimActiveVoiceModule: () => {},
  releaseActiveVoiceModule: () => {},
  headerDictation: {
    status: "idle",
    targetId: "header"
  },
  setHeaderDictation: () => {},
  collapsedVoiceSession: {
    active: false,
    paused: false,
    statusLabel: "",
    elapsedLabel: "",
    audioLevel: 0
  },
  setCollapsedVoiceSession: () => {},
  voicePauseToggleRequest: 0,
  requestVoicePauseToggle: () => {},
  voiceSubmitRequest: 0,
  requestVoiceSubmit: () => {},
  micUnavailable: false,
  micUnavailableReason: null,
  setMicUnavailable: () => {},
  historicalUpdates: {},
  isHistoricalSectionUnseen: () => false,
  pushHistoricalUpdates: () => {},
  acknowledgeHistoricalSection: () => {},
  dismissHistoricalHighlights: () => {},
  removeHistoricalChunk: () => {},
  lastUndoRequest: null,
  requestUndoRxPadSync: () => {},
  removeHistoricalChunksBySourceCopyId: () => {},
  recordHistoricalSidebarEdit: () => {},
  syncPayload: null,
  pushToRxPad: () => {}
});

export function RxPadSyncProvider({ children }) {
  const [lastCopyRequest, setLastCopyRequest] = useState(null);
  const [lastSignal, setLastSignal] = useState(null);
  const [, setCopySequence] = useState(0);
  const [, setSignalSequence] = useState(0);
  const [patientAllergies, setPatientAllergies] = useState([]);
  const [aiFillInProgress, setAiFillInProgress] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [copyAllAuraActive, setCopyAllAuraActive] = useState(false);
  const copyAllAuraTimerRef = useRef(null);
  const flashCopyAllAura = useCallback(() => {
    setCopyAllAuraActive(true);
    if (copyAllAuraTimerRef.current) clearTimeout(copyAllAuraTimerRef.current);
    copyAllAuraTimerRef.current = setTimeout(() => setCopyAllAuraActive(false), 2000);
  }, []);
  const [copyOverlayActive, setCopyOverlayActive] = useState(false);
  const copyOverlayTimerRef = useRef(null);
  const [activeVoiceLocks, setActiveVoiceLocks] = useState({});
  const activeVoiceLockIds = Object.keys(activeVoiceLocks);
  const activeVoiceModule = Object.values(activeVoiceLocks)[0]?.label || null;
  const setActiveVoiceModule = useCallback((label) => {
    setActiveVoiceLocks((prev) => {
      const next = { ...prev };
      if (label) {
        next.legacy = { id: "legacy", label };
      } else {
        delete next.legacy;
      }
      return next;
    });
  }, []);
  const claimActiveVoiceModule = useCallback((id, label) => {
    if (!id || !label) return;
    setActiveVoiceLocks((prev) => ({
      ...prev,
      [id]: { id, label }
    }));
  }, []);
  const releaseActiveVoiceModule = useCallback((id) => {
    if (!id) return;
    setActiveVoiceLocks((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);
  const [headerDictation, setHeaderDictationRaw] = useState({
    status: "idle",
    targetId: "header"
  });
  const setHeaderDictation = useCallback((next) => {
    setHeaderDictationRaw((prev) => ({
      status: next?.status || "idle",
      targetId: next?.targetId || prev.targetId || "header"
    }));
  }, []);
  const [collapsedVoiceSession, setCollapsedVoiceSessionRaw] = useState({
    active: false,
    paused: false,
    statusLabel: "",
    elapsedLabel: "",
    audioLevel: 0
  });
  const [voicePauseToggleRequest, setVoicePauseToggleRequest] = useState(0);
  const [voiceSubmitRequest, setVoiceSubmitRequest] = useState(0);
  const setCollapsedVoiceSession = useCallback((next) => {
    setCollapsedVoiceSessionRaw((prev) => ({ ...prev, ...next }));
  }, []);
  const requestVoicePauseToggle = useCallback(() => {
    setVoicePauseToggleRequest((prev) => prev + 1);
  }, []);
  const requestVoiceSubmit = useCallback(() => {
    setVoiceSubmitRequest((prev) => prev + 1);
  }, []);
  const [micUnavailable, setMicUnavailableRaw] = useState(false);
  const [micUnavailableReason, setMicUnavailableReason] = useState(null);
  const setMicUnavailable = useCallback((unavailable, reason) => {
    setMicUnavailableRaw(unavailable);
    setMicUnavailableReason(unavailable ? reason ?? "Microphone unavailable" : null);
  }, []);
  const [historicalUpdates, setHistoricalUpdates] = useState({});
  const [historicalUnseen, setHistoricalUnseen] = useState({});
  const [lastUndoRequest, setLastUndoRequest] = useState(null);
  const undoSeqRef = useRef(0);
  const [syncPayload, setSyncPayload] = useState(null);

  const isHistoricalSectionUnseen = useCallback(
    (id) => !!historicalUnseen[id],
    [historicalUnseen]
  );

  const pushHistoricalUpdates = useCallback((batch) => {
    const now = Date.now();
    setHistoricalUpdates((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(batch)) {
        const chunks = batch[k];
        if (!chunks?.length) continue;
        const add = chunks.map((c) => ({
          id: c.id,
          bullets: c.bullets,
          at: now,
          isFresh: true,
          sourceCopyId: c.sourceCopyId,
          undoPayload: c.undoPayload
        }));
        next[k] = [...(next[k] ?? []), ...add].slice(-24);
      }
      return next;
    });
    setHistoricalUnseen((prev) => {
      const n = { ...prev };
      for (const k of Object.keys(batch)) {
        if (batch[k]?.length) n[k] = true;
      }
      return n;
    });
  }, []);

  const acknowledgeHistoricalSection = useCallback((id) => {
    setHistoricalUnseen((prev) => ({ ...prev, [id]: false }));
  }, []);

  const dismissHistoricalHighlights = useCallback((id) => {
    setHistoricalUpdates((prev) => ({
      ...prev,
      [id]: (prev[id] ?? []).map((c) => ({ ...c, isFresh: false }))
    }));
  }, []);

  const removeHistoricalChunk = useCallback((sectionId, chunkId) => {
    setHistoricalUpdates((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).filter((c) => c.id !== chunkId)
    }));
  }, []);

  const removeHistoricalChunksBySourceCopyId = useCallback((sourceCopyId) => {
    setHistoricalUpdates((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = (next[k] ?? []).filter((c) => c.sourceCopyId !== sourceCopyId);
      }
      return next;
    });
  }, []);

  const requestUndoRxPadSync = useCallback((sourceCopyId, payload) => {
    undoSeqRef.current += 1;
    setLastUndoRequest({ id: undoSeqRef.current, sourceCopyId, payload });
  }, []);

  const recordHistoricalSidebarEdit = useCallback(
    (id, bullets) => {
      const trimmed = bullets.map((s) => s.trim()).filter(Boolean);
      if (!trimmed.length) return;
      pushHistoricalUpdates({
        [id]: [{ id: `sidebar-${Date.now()}`, bullets: trimmed }]
      });
    },
    [pushHistoricalUpdates]
  );

  const requestCopyToRxPad = useCallback((payload) => {
    setCopySequence((prev) => {
      const next = prev + 1;
      setLastCopyRequest({ id: next, payload });
      return next;
    });
  }, []);

  const runCopyWithAura = useCallback((payload, opts) => {
    const delayMs = opts?.delayMs ?? 2000;
    const bulk = !!opts?.bulk;
    if (copyOverlayTimerRef.current) clearTimeout(copyOverlayTimerRef.current);
    if (copyAllAuraTimerRef.current) clearTimeout(copyAllAuraTimerRef.current);
    const fillAt = Math.max(200, Math.round(delayMs * 0.45));
    window.setTimeout(() => {
      const payloads = Array.isArray(payload) ? payload : [payload];
      for (const p of payloads) {
        setCopySequence((prev) => {
          const next = prev + 1;
          setLastCopyRequest({ id: next, payload: p, isBulk: bulk });
          return next;
        });
      }
      window.setTimeout(() => {
        if (bulk) {
          setCopyOverlayActive(true);
          setCopyAllAuraActive(true);
          copyOverlayTimerRef.current = setTimeout(() => setCopyOverlayActive(false), delayMs);
          copyAllAuraTimerRef.current = setTimeout(() => setCopyAllAuraActive(false), delayMs);
        }
        opts?.onAfterCopy?.();
      }, 80);
    }, fillAt);
  }, []);

  const publishSignal = useCallback((signal) => {
    setSignalSequence((prev) => {
      const next = prev + 1;
      setLastSignal({ id: next, ...signal });
      return next;
    });
  }, []);

  const pushToRxPad = useCallback((payload) => {
    setSyncPayload(payload);
  }, []);

  const value = useMemo(
    () => ({
      lastCopyRequest,
      lastSignal,
      requestCopyToRxPad,
      publishSignal,
      patientAllergies,
      setPatientAllergies,
      aiFillInProgress,
      setAiFillInProgress,
      voiceActive,
      setVoiceActive,
      copyAllAuraActive,
      flashCopyAllAura,
      copyOverlayActive,
      runCopyWithAura,
      activeVoiceModule,
      activeVoiceLocks,
      activeVoiceLockIds,
      setActiveVoiceModule,
      claimActiveVoiceModule,
      releaseActiveVoiceModule,
      headerDictation,
      setHeaderDictation,
      collapsedVoiceSession,
      setCollapsedVoiceSession,
      voicePauseToggleRequest,
      requestVoicePauseToggle,
      voiceSubmitRequest,
      requestVoiceSubmit,
      micUnavailable,
      micUnavailableReason,
      setMicUnavailable,
      historicalUpdates,
      isHistoricalSectionUnseen,
      pushHistoricalUpdates,
      acknowledgeHistoricalSection,
      dismissHistoricalHighlights,
      removeHistoricalChunk,
      lastUndoRequest,
      requestUndoRxPadSync,
      removeHistoricalChunksBySourceCopyId,
      recordHistoricalSidebarEdit,
      syncPayload,
      pushToRxPad
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      lastCopyRequest, lastSignal, requestCopyToRxPad, publishSignal,
      patientAllergies, aiFillInProgress, voiceActive, copyAllAuraActive,
      flashCopyAllAura, copyOverlayActive, runCopyWithAura, activeVoiceModule,
      activeVoiceLocks, activeVoiceLockIds,
      setActiveVoiceModule, claimActiveVoiceModule, releaseActiveVoiceModule,
      headerDictation, setHeaderDictation, collapsedVoiceSession, setCollapsedVoiceSession, voicePauseToggleRequest,
      requestVoicePauseToggle, voiceSubmitRequest, requestVoiceSubmit,
      micUnavailable, micUnavailableReason, historicalUpdates,
      isHistoricalSectionUnseen, pushHistoricalUpdates, acknowledgeHistoricalSection,
      dismissHistoricalHighlights, removeHistoricalChunk, lastUndoRequest,
      requestUndoRxPadSync, removeHistoricalChunksBySourceCopyId,
      recordHistoricalSidebarEdit, syncPayload, pushToRxPad
    ]
  );

  return <RxPadSyncContext.Provider value={value}>{children}</RxPadSyncContext.Provider>;
}

export function useRxPadSync() {
  return useContext(RxPadSyncContext);
}
