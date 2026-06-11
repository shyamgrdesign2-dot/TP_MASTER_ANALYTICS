import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { message } from "antd";
import { useDispatch, useSelector } from "react-redux";

import { useRxPadSync } from "../RxPadSyncContext";
import { toast } from "../../../voicerx/toast";

import { CONTEXT_PATIENT_ID, QUICK_CLINICAL_SNAPSHOT_PROMPT, RX_CONTEXT_OPTIONS } from "../constants";
import {
  buildQuickClinicalSnapshotInlineSuggestions,
  buildQuickClinicalSnapshotText } from

"../shared/buildCoreNarrative";
import {
  isSituationAtGlanceAssistantMessage,
  SITUATION_AT_A_GLANCE_ASSISTANT_TEXT,
  threadAlreadyHasQuickClinicalGlance } from
"../shared/isSituationAtGlanceMessage";
import { SMART_SUMMARY_BY_CONTEXT, PATIENT_DOCUMENTS } from "../mock-data";
import { generatePills } from "../engines/pill-engine";
import { inferPhase } from "../engines/phase-engine";
import { classifyIntent, PILL_INTENT_MAP } from "../engines/intent-engine";
import { buildReply, buildDocumentReply } from "../engines/reply-engine";
import { parseVoiceToStructuredRx } from "../engines/voice-rx-engine";

import { VOICE_RX_DICTATION_CHUNKS, VOICE_RX_AMBIENT_CHUNKS } from "../../../voicerx/utils";
import { createVoiceRxSessionContext } from "../../../voicerx/api/run-voice-rx-pipeline";
import {
  transcribeAudio,
  digitiseClinicalData,
  transcriptToText as clinicalTranscriptToText,
  hasTranscriptContent as clinicalHasTranscriptContent
} from "../../../voicerx/api/clinical-processing";
import { generateSoapNote } from "../../../voicerx/api/soap-service";
import { digitizationToSections } from "../../../voicerx/utils/result-formatters";
import { soapToHtml, htmlToSoapSections } from "../../../voicerx/utils/soap-formatter";
import {
  addVoiceHistoryEntry,
  beginVoiceAttempt,
  markVoiceLogCreated,
  updateVoiceClinicNotes,
  updateVoiceSoap,
  updateVoiceSoapHtml,
  updateVoiceDigitizeData,
} from "../../../../../redux/voiceDigitizationSlice";
import {
  buildVoiceHistoryEntry,
  uploadAndLogVoiceRx2,
} from "../../../voicerx/voiceRx2Logging";

import { useLiveTranscript } from "../../../voicerx/use-live-transcript";
import { uid, getQueryHint, detectSpecialties } from "../utils/panelUtils";
import { buildVoiceConsultSidebarBatch } from "../utils/voiceHistoryUtils";
import { buildIntroMessages } from "../engines/intro-engine";

const VOICE_RX_SUBMIT_BUTTON_MIN_MS = 5000;

const cleanText = (value) => {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  return text && text !== "null" && text !== "undefined" ? text : "";
};

const toStructuredVoiceItem = (item) => {
  if (item && typeof item === "object") {
    return {
      name: item.name ?? "",
      detail: item.detail ?? "",
    };
  }
  return { name: item };
};

const hasObjectData = (value) =>
  value && typeof value === "object" && Object.keys(value).length > 0;

const hasMeaningfulVoiceDigitization = (voiceDigitization) => {
  if (!voiceDigitization) return false;
  return (
    (Array.isArray(voiceDigitization.history) && voiceDigitization.history.length > 0) ||
    hasObjectData(voiceDigitization.clinicNotes) ||
    hasObjectData(voiceDigitization.digitizeData) ||
    hasObjectData(voiceDigitization.editedData)
  );
};

const hasPatientReportedData = (data) =>
  Boolean(
    data &&
    (
      data.symptoms?.length ||
      data.medicalHistory?.length ||
      data.allergies?.length ||
      data.currentMedications?.length ||
      data.questionsToDoctor?.length
    )
  );

const normalizeHistoryItem = (item) => {
  if (!item) return null;
  if (typeof item === "string") return cleanText(item);
  const name = cleanText(item.name || item.history_name || item.lineItem || item.notes);
  const detail = [item.duration || item.since, item.status, item.relation, item.notes || item.note]
    .map(cleanText)
    .filter(Boolean)
    .join(", ");
  return detail ? `${name} (${detail})` : name;
};

const normalizeQuestionList = (notes) => {
  if (Array.isArray(notes)) {
    return notes.map((item) => cleanText(item?.question || item?.name || item?.notes || item)).filter(Boolean);
  }
  const text = cleanText(notes);
  if (!text) return [];
  return text
    .split(/\n+|(?:^|\s)[•-]\s+/)
    .map(cleanText)
    .filter(Boolean);
};

const normalizeSymptomCollectorData = (raw) => {
  if (!raw || typeof raw !== "object" || !Object.keys(raw).length) return null;

  const symptoms = Array.isArray(raw.symptoms)
    ? raw.symptoms.filter((item) => cleanText(item?.name || item?.symptom_name || item?.lineItem || item))
    : [];
  const medicalHistory = [];
  const allergies = Array.isArray(raw.allergies) ? raw.allergies.map(cleanText).filter(Boolean) : [];
  const directMedications = raw.currentMedications || raw.current_medications || raw.medications;
  const currentMedications = Array.isArray(directMedications)
    ? directMedications.map((item) => cleanText(item?.name || item?.medicine || item?.lineItem || item)).filter(Boolean)
    : [];
  const historySource = Array.isArray(raw.medicalHistory) ? raw.medicalHistory : [];

  historySource.forEach((item) => {
    if (!item) return;
    if (Array.isArray(item.items)) {
      item.items.forEach((child) => {
        if (!child) return;
        const sectionTitle = cleanText(item.title).toLowerCase();
        if (sectionTitle.includes("allerg")) {
          const allergy = cleanText(child.name || child.lineItem || child.notes);
          if (allergy) allergies.push(allergy);
          return;
        }
        const normalized = normalizeHistoryItem(child);
        if (normalized) medicalHistory.push(normalized);
      });
      return;
    }

    const type = cleanText(item.type).toLowerCase();
    if (type.includes("allerg")) {
      const allergy = cleanText(item.name || item.lineItem || item.notes);
      if (allergy) allergies.push(allergy);
      return;
    }
    if (type.includes("medication")) {
      const medication = cleanText(item.name || item.lineItem || item.notes);
      if (medication) currentMedications.push(medication);
      return;
    }
    const normalized = normalizeHistoryItem(item);
    if (normalized) medicalHistory.push(normalized);
  });

  const questionsToDoctor = [
    ...normalizeQuestionList(raw.questionsToDoctor || raw.questions_to_doctor || raw.questions),
    ...normalizeQuestionList(raw.notes || raw.others),
  ];

  const data = {
    reportedAt: raw.reportedAt || raw.reported_at || raw.createdAt || "today",
    symptoms,
    medicalHistory,
    allergies,
    currentMedications,
    questionsToDoctor,
    _id: raw._id,
  };

  return hasPatientReportedData(data) ? data : null;
};

const buildPatientFromData = (patientData, fallback) => {
  if (!patientData) return fallback;
  const label = cleanText(
    patientData.pm_fullname ||
    patientData.patient_name ||
    [patientData.pm_first_name, patientData.pm_last_name].map(cleanText).filter(Boolean).join(" ")
  );
  const gender = cleanText(patientData.pm_gender || patientData.gender || fallback?.gender);
  const age = patientData.ageYears ?? patientData.age_years ?? patientData.age ?? fallback?.age;
  const mrn = cleanText(patientData.mrno || patientData.patient_unique_id);
  const contact = cleanText(patientData.pm_contact_no || patientData.mobile);
  return {
    ...(fallback || {}),
    id: patientData.patient_unique_id || fallback?.id || CONTEXT_PATIENT_ID,
    label: label || fallback?.label || "Patient",
    gender,
    age,
    meta: [gender, age !== undefined && age !== null && age !== "" ? `${age}y` : "", mrn, contact].filter(Boolean).join(" · "),
    kind: "patient",
  };
};

export function useDrAgentPanel({
  voiceRxMode,
  onVoiceCaptureModeChange,
  initialPatientId,
  isPanelVisible,
  autoOpenBottomSheet,
  onClose,
  onOpen,
  patientId,
  doctorId,
  patientData,
  voiceHydrationStatus,
  symptomCollectorStatus
}) {
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.doctors);
  const voiceDigitization = useSelector((state) => state.voiceDigitization);
  const symptomCollector = useSelector((state) => state.ddx?.symptomCollector);
  // Voice Rx API session context — sessionId regenerates on each new dictation
  const voiceRxSessionRef = useRef(null);
  const voiceRxAbortRef = useRef(null);
  const voiceSubmitInFlightRef = useRef(false);
  const hasAutoHydratedRef = useRef(false);
  // ── Patient Context ──
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId ?? patientId ?? CONTEXT_PATIENT_ID);

  // Sync when the prescription patient changes from parent.
  useEffect(() => {
    const nextPatientId = initialPatientId ?? patientId;
    if (nextPatientId) {
      setSelectedPatientId(nextPatientId);
    }
  }, [initialPatientId, patientId]);

  // ── Per-Patient State ──
  const [messagesByPatient, setMessagesByPatient] = useState({});
  const [phaseByPatient, setPhaseByPatient] = useState({});

  // ── UI State ──
  const [activeSpecialty, setActiveSpecialty] = useState("gp");
  const [activeTabLens] = useState("dr-agent");
  const [doctorViewType, setDoctorViewType] = useState("specialist_first_visit");
  const [intakeMode, setIntakeMode] = useState("with_intake");
  const [inputValue, setInputValue] = useState("");
  const [isPrefilled, setIsPrefilled] = useState(false);
  /** Right-side drawer triggered by the brand-pill kebab → "View session history". */
  const [isSessionHistoryOpen, setIsSessionHistoryOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingHint, setTypingHint] = useState("");
  const [showAttachPanel, setShowAttachPanel] = useState(false);
  const [showDocBottomSheet, setShowDocBottomSheet] = useState(false);
  const [chipShaking, setChipShaking] = useState(false);
  const fileInputRef = useRef(null);

  const [voiceRxDialogOpen, setVoiceRxDialogOpen] = useState(false);
  const autoOpenedRef = useRef(false);
  const scFlowStartedRef = useRef(new Set());
  const scFollowUpTimerRef = useRef(null);
  useEffect(() => {
    if (autoOpenBottomSheet && isPanelVisible && voiceRxMode && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      const timer = setTimeout(() => setVoiceRxDialogOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [autoOpenBottomSheet, isPanelVisible, voiceRxMode]);
  useEffect(() => {
    return () => {
      if (scFollowUpTimerRef.current) {
        window.clearTimeout(scFollowUpTimerRef.current);
        scFollowUpTimerRef.current = null;
      }
    };
  }, [selectedPatientId]);
  const [voiceRxDialogChoice, setVoiceRxDialogChoice] = useState("ambient_consultation");
  const [voiceRxRecording, setVoiceRxRecording] = useState(false);
  /** Scripted-demo transcript — used only as a fallback when the browser has no Web Speech API. */
  const [voiceRxScriptedTranscript, setVoiceRxScriptedTranscript] = useState("");
  const [voiceRxAwaitingResponse, setVoiceRxAwaitingResponse] = useState(false);
  const [voiceRxSubmittedTranscript, setVoiceRxSubmittedTranscript] = useState("");
  const [voiceRxProcessingTranscript, setVoiceRxProcessingTranscript] = useState("");
  /**
   * When the user clicks Back on the 3-tab result view, we don't WIPE
   * the result — we minimise it. The chat then shows the new
   * "Conversation Mode" card; clicking the expand icon on that card
   * sets minimised back to false and the panel flips back into the
   * 3-tab view it was in before, with all state preserved.
   */
  const [voiceRxResultMinimized, setVoiceRxResultMinimized] = useState(false);
  /**
   * `voiceRxHandoffExiting` is briefly true (≈320ms) at the moment we
   * cross from "shiner card with loader" to "result tabs". Lets us
   * play a coordinated exit (shiner slides UP + fades out) BEFORE the
   * panel hard-swaps to the VoiceRx result canvas, which then slides in from
   * the top. Without this gate the swap reads as a single-frame jump
   * and the user perceives a glitch.
   */
  const [voiceRxHandoffExiting, setVoiceRxHandoffExiting] = useState(false);
  // Post-submit result panel — when set, the back face shows the 3-tab
  // result view (Transcript / TP EMR / Clinical Notes) instead of the
  // recorder. "Back to chat" clears this and flips the panel back.
  const [voiceRxResult, setVoiceRxResult] = useState(null);
  const voiceRxStreamIdx = useRef(0);
  const voiceRxTimeoutRef = useRef(null);
  // Captures the prior voiceRxResult when the doctor clicks the small
  // mic on the result canvas to add more dictation. The next submit
  // merges the new transcript chunk with the prior one so the
  // transcript is cumulative — without this ref the prior transcript
  // would be wiped each time the doctor re-records.
  const priorVoiceResultRef = useRef(null);
  /** Active agent lifts its paused state here so the scripted transcript can also pause. */
  const voiceRxPausedRef = useRef(false);
  const [voiceRxPaused, setVoiceRxPaused] = useState(false);
  const handleVoiceRxPauseChange = useCallback((paused) => {
    voiceRxPausedRef.current = paused;
    setVoiceRxPaused(paused);
  }, []);

  useEffect(() => {
    setVoiceRxResult(null);
    setVoiceRxResultMinimized(false);
  }, [selectedPatientId]);

  useEffect(() => {
    if (voiceHydrationStatus !== "hydrated") return;
    if (hasAutoHydratedRef.current) return;
    if (voiceRxResult) return;
    if (!hasMeaningfulVoiceDigitization(voiceDigitization)) return;
    hasAutoHydratedRef.current = true;
    const history = Array.isArray(voiceDigitization.history) ? voiceDigitization.history : [];
    const digitization = voiceDigitization.clinicNotes && Object.keys(voiceDigitization.clinicNotes).length
      ? voiceDigitization.clinicNotes
      : voiceDigitization.digitizeData || voiceDigitization.editedData;
    const resultSections = digitization ? digitizationToSections(digitization) : [];
    const transcriptSegments = history.map((entry, index) => ({
      id: `stored-${index}`,
      body: entry.conversation || entry.transcription || entry.transcript || "",
      mode: entry.type,
      durationMs: (entry.sourceDurationInSeconds || 0) * 1000,
      createdAt: entry.createdAt || new Date().toISOString(),
      moduleName: entry.moduleName || "",
      isDoctorAgent: Boolean(entry.isDoctorAgent),
    }));
    const transcript = transcriptSegments.map((segment) => clinicalTranscriptToText(segment.body)).filter(Boolean).join("\n\n");
    const structuredStub = {
      sections: resultSections.map((s) => ({
        sectionId: s.id,
        title: s.title,
        tpIconName: s.tpIconName,
        items: s.items.map(toStructuredVoiceItem),
      })),
      copyAllPayload: digitization ? { digitization } : undefined,
    };
    const hydratedSoap = voiceDigitization?.soap || null;
    const hydratedSoapHtml = voiceDigitization?.soapHtml || (hydratedSoap ? soapToHtml(hydratedSoap) : "");
    const hydratedSoapStatus = hydratedSoap || hydratedSoapHtml ? "fulfilled" : undefined;
    setVoiceRxResult({
      transcript,
      transcriptSegments,
      sections: resultSections,
      digitization,
      soap: hydratedSoap,
      soapHtml: hydratedSoapHtml,
      soapStatus: hydratedSoapStatus,
      soapError: null,
      durationMs: transcriptSegments.reduce((total, item) => total + (item.durationMs || 0), 0),
      structured: structuredStub,
      modeLabel: "Conversation Mode",
      pendingSidebarBatch: undefined,
    });
    // Inject a card message so the front face shows the CTA when Back is tapped
    const hydratedCardMsg = {
      id: uid(),
      role: "assistant",
      text: "Your clinical notes are ready — view your clinical notes to review, fine-tune, and copy them to the RxPad.",
      createdAt: new Date().toISOString(),
      rxOutput: { kind: "voice_structured_rx", data: structuredStub },
      feedbackGiven: null,
    };
    setMessagesByPatient((prev) => {
      const existing = prev[selectedPatientId] || [];
      const alreadyHasCard = existing.some((m) => m.rxOutput?.kind === "voice_structured_rx");
      if (alreadyHasCard) return prev;
      return { ...prev, [selectedPatientId]: [...existing, hydratedCardMsg] };
    });
    setVoiceRxResultMinimized(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceHydrationStatus]);

  // ── Listen for VoiceRx expand events from chat cards ──
  // The Conversation Mode card on the chat fires "open-voicerx" when
  // the doctor taps its expand icon. If we already have a cached
  // result we just unminimise it (preserves transcript / tabs / scroll
  // position). Otherwise — defensive path for cards seeded from
  // elsewhere — we synthesise a minimal result so the panel can flip.
  useEffect(() => {
    const handleOpen = (e) => {
      setVoiceRxResultMinimized(false);
      setVoiceRxResult((prev) => {
        if (prev) return prev;
        const customEvent = e;
        const data = customEvent.detail?.data;
        if (!data) return prev;
        return {
          transcript: "",
          sections: data.sections,
          durationMs: 0,
          structured: data,
          modeLabel: data.modeLabel || "Conversation Mode"
        };
      });
      setVoiceRxRecording(false);
    };
    window.addEventListener("open-voicerx", handleOpen);
    return () => window.removeEventListener("open-voicerx", handleOpen);
  }, []);

  // ── Real live transcription via Web Speech API (free, browser-native) ──
  const {
    transcript: liveFinal,
    interim: liveInterim,
    isSupported: liveSupported,
    reset: resetLiveTranscript,
    error: liveError
  } = useLiveTranscript({ enabled: !!voiceRxMode && voiceRxRecording, paused: voiceRxPaused });

  /** What the active agent actually renders — prefers real speech, falls back to the scripted
   *  demo when the browser can't transcribe or the service errors (e.g. network unreachable). */
  const voiceRxLiveTranscript = useMemo(() => {
    if (liveSupported && !liveError) {
      return [liveFinal, liveInterim].filter(Boolean).join(liveFinal && liveInterim ? " " : "");
    }
    // Fall back to scripted when speech API is unsupported or erroring
    return voiceRxScriptedTranscript;
  }, [liveSupported, liveError, liveFinal, liveInterim, voiceRxScriptedTranscript]);

  // ── Integration ──
  const { requestCopyToRxPad, lastSignal, publishSignal, 
    // setPatientAllergies,
     setAiFillInProgress, pushHistoricalUpdates, activeVoiceModule, headerDictation, runCopyWithAura } = useRxPadSync();
  const headerDictationBusy = headerDictation?.status === "recording" || headerDictation?.status === "transcribing";
  const lastSignalIdRef = useRef(0);

  // Scripted fallback — only when the browser can't do real live transcription.
  useEffect(() => {
    if (!voiceRxMode || !voiceRxRecording) return;
    if (liveSupported) return;
    voiceRxStreamIdx.current = 0;
    voiceRxPausedRef.current = false;
    setVoiceRxScriptedTranscript("");
    // Pick scripted chunks per mode: ambient = Doctor/Patient turns,
    // dictation = single-voice clinical narration.
    const chunks =
    voiceRxDialogChoice === "ambient_consultation" ?
    VOICE_RX_AMBIENT_CHUNKS :
    VOICE_RX_DICTATION_CHUNKS;
    const iv = window.setInterval(() => {
      if (voiceRxPausedRef.current) return;
      const i = voiceRxStreamIdx.current;
      if (i >= chunks.length) return;
      setVoiceRxScriptedTranscript((t) => t + chunks[i]);
      voiceRxStreamIdx.current = i + 1;
    }, 700);
    return () => window.clearInterval(iv);
  }, [voiceRxMode, voiceRxRecording, liveSupported, voiceRxDialogChoice]);

  // Fresh slate each new recording — clears any text left from a prior session.
  useEffect(() => {
    if (!voiceRxRecording) return;
    setVoiceRxScriptedTranscript("");
    resetLiveTranscript();
    voiceRxSessionRef.current = createVoiceRxSessionContext({
      patientId: patientId || "1111",
      doctorId: doctorId || "3333",
      sessionId: voiceDigitization?.sessionId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceRxRecording]);

  const needsSnapshotSeedRef = useRef(false);

  // Surfaced when the user tries to start the full Dr. Agent voice
  // consultation while a per-Rx-module (or per-sidebar-section) inline
  // recorder is already running. We can't run two voice sessions in
  // parallel, so we nudge the clinician to close the module recorder
  // first instead of silently ignoring the click.
  const [blockedVoiceToast, setBlockedVoiceToast] = useState(null);

  const confirmVoiceRxConsult = useCallback(() => {
    // Guard against starting a full-panel consultation while an inline
    // per-module / per-sidebar recorder is already running. Shared state
    // lives in the rxpad-sync context; the tooltip on hover uses the
    // same signal so the click + hover paths agree.
    if (activeVoiceModule || headerDictationBusy) {
      // Global page-center toast (warning tone) — was previously a
      // TPSnackbar nested inside DrAgentPanel's transform ancestor,
      // which clamped it inside the panel instead of true viewport
      // top-center.
      toast.warning(
        activeVoiceModule
          ? `VoiceRx is already active in ${activeVoiceModule}. Close that dictation first.`
          : "Voice dictation is already active. Finish that dictation first."
      );
      setVoiceRxDialogOpen(false);
      return;
    }
    onVoiceCaptureModeChange?.(voiceRxDialogChoice);
    setVoiceRxDialogOpen(false);
    // Starting a fresh consultation clears any previously generated
    // structured Rx — the doctor explicitly chose dictate/ambient again,
    // so we should drop them straight into the recorder, not flip back
    // into the old result tabs. They can still copy/edit on the RxPad
    // independently; this CTA is for capturing a NEW Rx.
    setVoiceRxResult(null);
    setVoiceRxResultMinimized(false);
    setVoiceRxScriptedTranscript("");
    setVoiceRxSubmittedTranscript("");
    setVoiceRxProcessingTranscript("");
    resetLiveTranscript();
    setVoiceRxAwaitingResponse(false);
    setVoiceRxRecording(true);
    // Only clear prior voice result messages (user voice transcripts +
    // assistant voice-rx outputs). KEEP the symptom-collector intro card
    // and the assistant follow-up so that if the doctor cancels recording
    // and returns to the panel, they don't see a blank screen.
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).filter((m) => {
        if (m.role === "user" && m.voiceTranscript) return false;
        if (m.role === "assistant" && m.rxOutput?.kind === "voice_structured_rx") return false;
        return true;
      })
    }));
  }, [voiceRxDialogChoice, onVoiceCaptureModeChange, selectedPatientId, setMessagesByPatient, activeVoiceModule, headerDictationBusy, resetLiveTranscript]);

  // Listen for the "VoiceRx" CTA on a chat clinical-notes card —
  // fires "voicerx:begin-addon". Routes through the same beginVoiceAddOn
  // flow the canvas mic uses so multi-take dictation is consistent.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => beginVoiceAddOnRef.current?.();
    window.addEventListener("voicerx:begin-addon", handler);
    return () => window.removeEventListener("voicerx:begin-addon", handler);
  }, []);
  const beginVoiceAddOnRef = useRef(null);

  // Stash the current voiceRxResult and flip into recorder mode WITHOUT
  // wiping the chat history of prior voice cards. The prior result's
  // transcript will be merged onto the next submit so the transcript
  // pane stays cumulative across multiple re-records.
  const beginVoiceAddOn = useCallback(() => {
    if (activeVoiceModule || headerDictationBusy) {
      toast.warning(
        activeVoiceModule
          ? `VoiceRx is already active in ${activeVoiceModule}. Close that dictation first.`
          : "Voice dictation is already active. Finish that dictation first."
      );
      return;
    }
    priorVoiceResultRef.current = voiceRxResult;
    setVoiceRxResult(null);
    setVoiceRxResultMinimized(false);
    setVoiceRxScriptedTranscript("");
    setVoiceRxSubmittedTranscript("");
    setVoiceRxProcessingTranscript("");
    resetLiveTranscript();
    setVoiceRxAwaitingResponse(false);
    setVoiceRxRecording(true);
    onVoiceCaptureModeChange?.(voiceRxDialogChoice);
  }, [activeVoiceModule, headerDictationBusy, voiceRxResult, voiceRxDialogChoice, onVoiceCaptureModeChange, resetLiveTranscript]);
  beginVoiceAddOnRef.current = beginVoiceAddOn;

  // Inline quick-edit submit (called by the canvas's bottom-overlay
  // recorder). Keeps the result canvas visible, but runs the same real
  // transcribe + digitise pipeline as the full VoiceRx recorder.
  const submitQuickEdit = useCallback(async (meta = {}, progress = {}) => {
    if (voiceSubmitInFlightRef.current) return;
    if (!voiceRxResult) return;
    const audioBlob = meta?.audioBlob || null;
    if (!audioBlob) {
      message.error("No audio recording was captured.");
      throw new Error("No audio recording was captured.");
    }
    voiceSubmitInFlightRef.current = true;
    dispatch(beginVoiceAttempt());
    const voicecall = (voiceDigitization?.voiceCallCount || 0) + 1;
    const submitClickedAtMs = meta?.submitClickedAtMs || Date.now();
    const submitClickedAt = meta?.submitClickedAt || new Date(submitClickedAtMs).toISOString();
    const submitId = `voice-rx-2-agent-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const requestId = submitId;
    const clinicalStartedAtMs = Date.now();
    let transcriptCompletedAtMs = null;
    let digitizeCompletedAtMs = null;

    const context = voiceRxSessionRef.current || createVoiceRxSessionContext({
      patientId: patientId || "1111",
      doctorId: doctorId || "3333",
      sessionId: voiceDigitization?.sessionId,
    });
    voiceRxSessionRef.current = context;

    if (voiceRxAbortRef.current) {
      try { voiceRxAbortRef.current.abort(); } catch { /* ignore */ }
    }
    const abortController = new AbortController();
    voiceRxAbortRef.current = abortController;

    const createdAt = new Date().toISOString();
    const optimisticTranscript = meta?.transcript || "Processing your voice edit...";
    const userMsg = {
      id: uid(),
      role: "user",
      text: optimisticTranscript,
      voiceTranscript: optimisticTranscript,
      voiceMode: voiceRxDialogChoice ?? undefined,
      voiceDurationMs: meta?.durationMs,
      createdAt,
      feedbackGiven: null,
      voiceEntryAnimation: true
    };
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg]
    }));

    try {
      progress?.onPhase?.("creating_transcript", { transcript: "" });
      console.log("[voice-rx] quick-edit phase:", "transcribing");
      const apiTranscript = await transcribeAudio({
        audioBlob,
        context,
        signal: abortController.signal
      });
      transcriptCompletedAtMs = Date.now();
      const finalTranscript = clinicalHasTranscriptContent(apiTranscript) ? apiTranscript : meta?.transcript || "";
      const finalTranscriptText = clinicalTranscriptToText(finalTranscript);
      progress?.onPhase?.("transcript_ready", { transcript: finalTranscript });

      progress?.onPhase?.("structuring_notes", { transcript: finalTranscript });
      const digitisePrev = voiceRxResult?.digitization || voiceDigitization?.clinicNotes || voiceDigitization?.digitizeData || null;
      const [digitizeResult, soapResult] = await Promise.all([
        digitiseClinicalData({
          context,
          previousContext: digitisePrev,
          signal: abortController.signal
        }),
        generateSoapNote({
          context,
          previousContext: htmlToSoapSections(voiceDigitization?.soapHtml || voiceRxResult?.soapHtml) || voiceRxResult?.soap || voiceDigitization?.soap || null,
          signal: abortController.signal
        })
      ]);
      digitizeCompletedAtMs = Date.now();
      if (digitizeResult?.status === "rejected") {
        const error = new Error(digitizeResult.error || "Digitisation failed.");
        error.phase = "digitise-data";
        throw error;
      }

      const digitization = digitizeResult?.data ?? null;
      const soap = soapResult?.status === "fulfilled" ? soapResult.data : null;
      const soapError = soapResult?.status === "rejected" ? soapResult.error : null;
      const soapHtml = soap ? soapToHtml(soap) : "";
      if (!digitization) {
        const error = new Error("Digitisation API returned no response.");
        error.phase = "digitise-data";
        throw error;
      }
      const resultSections = digitizationToSections(digitization);
      const structuredStub = {
        sections: resultSections.map((s) => ({
          sectionId: s.id,
          title: s.title,
          tpIconName: s.tpIconName,
          items: s.items.map(toStructuredVoiceItem)
        })),
        copyAllPayload: { digitization }
      };

      setMessagesByPatient((prev) => {
        const list = prev[selectedPatientId] || [];
        const updated = list.map((m) => m.id === userMsg.id ? { ...m, text: finalTranscriptText, voiceTranscript: finalTranscriptText } : m);
        return { ...prev, [selectedPatientId]: updated };
      });

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [
          ...(prev[selectedPatientId] || []),
          {
            id: uid(),
            role: "assistant",
            text: "Your clinical notes are updated — view to fine-tune and copy to RxPad.",
            createdAt: new Date().toISOString(),
            rxOutput: { kind: "voice_structured_rx", data: structuredStub },
            feedbackGiven: null
          }
        ]
      }));

      setVoiceRxResult((prev) => {
        if (!prev) return prev;
        const newSegment = {
          id: uid(),
          body: finalTranscript,
          mode: voiceRxDialogChoice ?? "ambient_consultation",
          durationMs: meta?.durationMs ?? 0,
          createdAt: new Date().toISOString(),
          moduleName: "Doctor Agent",
          isDoctorAgent: true,
        };
        const transcriptSegments = prev.transcriptSegments
          ? [...prev.transcriptSegments, newSegment]
          : [{
              id: uid(),
              body: prev.transcript,
              mode: "ambient_consultation",
              durationMs: prev.durationMs ?? 0,
              createdAt: new Date().toISOString(),
              moduleName: "Doctor Agent",
              isDoctorAgent: true,
            }, newSegment];
        return {
          ...prev,
          transcript: transcriptSegments.map((s) => clinicalTranscriptToText(s.body)).join("\n\n"),
          transcriptSegments,
          sections: resultSections,
          digitization,
          soap,
          soapHtml,
          soapStatus: soap ? "fulfilled" : "rejected",
          soapError,
          durationMs: (prev.durationMs ?? 0) + (meta?.durationMs ?? 0),
          structured: structuredStub,
          pendingSidebarBatch: undefined
        };
      });
      dispatch(updateVoiceDigitizeData(digitization));
      dispatch(updateVoiceClinicNotes(digitization));
      if (soap) dispatch(updateVoiceSoap(soap));
      if (soapHtml) dispatch(updateVoiceSoapHtml(soapHtml));
      const clinicalCompletedAtMs = Date.now();
      uploadAndLogVoiceRx2({
        audioBlob,
        patientData,
        profile,
        sessionId: context.sessionId || voiceDigitization?.sessionId,
        submitId,
        requestId,
        submitClickedAt,
        submitClickedAtMs,
        durationMs: meta?.durationMs ?? 0,
        clinicalStatus: "completed",
        mode: voiceRxDialogChoice ?? "ambient_consultation",
        voicecall,
        sourceSurface: "doctor-agent",
        isDoctorAgent: true,
        micBeingUsed: meta?.micBeingUsed || "",
        voiceLogCreated: voiceDigitization?.voiceLogCreated,
        markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
        clinicalCompletedAtMs,
        transcriptCompletedAtMs,
        digitizeCompletedAtMs,
      }).then(({ source }) => {
        dispatch(addVoiceHistoryEntry(buildVoiceHistoryEntry({
          type: voiceRxResult?.digitization ? "AUDIO_WITH_CONTEXT" : "AUDIO_NO_CONTEXT",
          source,
          durationMs: meta?.durationMs ?? 0,
          timeRequiredInMs: clinicalCompletedAtMs - clinicalStartedAtMs,
          conversation: finalTranscript,
          digitize: [],
          isDoctorAgent: true,
          moduleName: "Doctor Agent",
        })));
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("[voice-rx] quick-edit pipeline failed", error);
      const failedPhase = error?.phase === "digitise-data" ? "digitise-data" : "transcribe-audio";
      uploadAndLogVoiceRx2({
        audioBlob,
        patientData,
        profile,
        sessionId: context.sessionId || voiceDigitization?.sessionId,
        submitId,
        requestId,
        submitClickedAt,
        submitClickedAtMs,
        durationMs: meta?.durationMs ?? 0,
        clinicalStatus: "failed",
        failedPhase,
        errorMessage: error?.message || "Voice edit failed.",
        retryAttempts: failedPhase === "transcribe-audio" ? 3 : 0,
        mode: voiceRxDialogChoice ?? "ambient_consultation",
        voicecall,
        sourceSurface: "doctor-agent",
        isDoctorAgent: true,
        micBeingUsed: meta?.micBeingUsed || "",
        voiceLogCreated: voiceDigitization?.voiceLogCreated,
        markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
        clinicalCompletedAtMs: Date.now(),
        transcriptCompletedAtMs,
        digitizeCompletedAtMs,
      });
      message.error(error?.message || "Voice edit failed.");
      setMessagesByPatient((prev) => {
        const list = prev[selectedPatientId] || [];
        return { ...prev, [selectedPatientId]: list.filter((m) => m.id !== userMsg.id) };
      });
      throw error;
    } finally {
      if (voiceRxAbortRef.current === abortController) voiceRxAbortRef.current = null;
      voiceSubmitInFlightRef.current = false;
    }
  }, [voiceRxResult, voiceRxDialogChoice, selectedPatientId, setMessagesByPatient, patientId, doctorId, voiceDigitization?.sessionId, voiceDigitization?.voiceCallCount, voiceDigitization?.voiceLogCreated, dispatch, patientData, profile]);

  const cancelVoiceRxRecording = useCallback(() => {
    if (voiceRxTimeoutRef.current) {
      clearTimeout(voiceRxTimeoutRef.current);
      voiceRxTimeoutRef.current = null;
    }
    if (voiceRxAbortRef.current) {
      try { voiceRxAbortRef.current.abort(); } catch { /* ignore */ }
      voiceRxAbortRef.current = null;
    }
    setVoiceRxRecording(false);
    setVoiceRxScriptedTranscript("");
    setVoiceRxSubmittedTranscript("");
    setVoiceRxProcessingTranscript("");
    resetLiveTranscript();
    setVoiceRxAwaitingResponse(false);
    setAiFillInProgress(false);
    onVoiceCaptureModeChange?.(null);
    // If the doctor canceled an add-on dictation, restore the prior
    // result so the canvas re-appears with the original transcript +
    // clinical notes intact.
    if (priorVoiceResultRef.current) {
      setVoiceRxResult(priorVoiceResultRef.current);
      priorVoiceResultRef.current = null;
    }
  }, [onVoiceCaptureModeChange, setAiFillInProgress, resetLiveTranscript]);

  const submitVoiceRxRecording = useCallback((meta) => {
    if (voiceSubmitInFlightRef.current) return;
    const liveText = voiceRxLiveTranscript.trim();
    const audioBlob = meta?.audioBlob || null;

    if (!audioBlob && !liveText) {
      setVoiceRxRecording(false);
      onVoiceCaptureModeChange?.(null);
      return;
    }
    voiceSubmitInFlightRef.current = true;
    dispatch(beginVoiceAttempt());
    const voicecall = (voiceDigitization?.voiceCallCount || 0) + 1;
    const submitClickedAtMs = meta?.submitClickedAtMs || Date.now();
    const submitClickedAt = meta?.submitClickedAt || new Date(submitClickedAtMs).toISOString();
    const submitId = `voice-rx-2-agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const requestId = submitId;

    // Echo a placeholder transcript into chat immediately (will be replaced
    // by the API-returned text once the assistant card lands).
    const echoTranscript = liveText || "Processing your voice consultation…";
    const userMsg = {
      id: uid(),
      role: "user",
      text: echoTranscript,
      voiceTranscript: echoTranscript,
      voiceMode: voiceRxDialogChoice ?? undefined,
      voiceDurationMs: meta?.durationMs,
      createdAt: new Date().toISOString(),
      feedbackGiven: null,
      voiceEntryAnimation: true
    };
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg]
    }));

    setVoiceRxRecording(false);
    setVoiceRxScriptedTranscript("");
    setVoiceRxSubmittedTranscript(liveText);
    setVoiceRxProcessingTranscript("");
    resetLiveTranscript();
    setVoiceRxAwaitingResponse(true);
    onVoiceCaptureModeChange?.(null);

    const context = voiceRxSessionRef.current || createVoiceRxSessionContext({
      patientId: patientId || "1111",
      doctorId: doctorId || "3333",
      sessionId: voiceDigitization?.sessionId,
    });
    voiceRxSessionRef.current = context;

    if (voiceRxAbortRef.current) {
      try { voiceRxAbortRef.current.abort(); } catch { /* ignore */ }
    }
    const abortController = new AbortController();
    voiceRxAbortRef.current = abortController;

    (async () => {
      const submittedAt = Date.now();
      const clinicalStartedAtMs = Date.now();
      let transcriptCompletedAtMs = null;
      let digitizeCompletedAtMs = null;
      const waitForButtonLoaderWindow = () => {
        const remaining = VOICE_RX_SUBMIT_BUTTON_MIN_MS - (Date.now() - submittedAt);
        if (remaining <= 0) return Promise.resolve();
        return new Promise((resolve) => window.setTimeout(resolve, remaining));
      };

      try {
        if (!audioBlob) {
          throw new Error("No audio recording was captured.");
        }
        let failedPhase = "";
        console.log("[voice-rx] phase:", "transcribing");
        let apiTranscript;
        try {
          apiTranscript = await transcribeAudio({
            audioBlob,
            context,
            signal: abortController.signal
          });
          transcriptCompletedAtMs = Date.now();
        } catch (error) {
          failedPhase = "transcribe-audio";
          if (error && typeof error === "object") error.phase = failedPhase;
          throw error;
        }

        const finalTranscript = clinicalHasTranscriptContent(apiTranscript) ? apiTranscript : liveText || "";
        const finalTranscriptText = clinicalTranscriptToText(finalTranscript);
        setVoiceRxProcessingTranscript(finalTranscript);

        await waitForButtonLoaderWindow();

        console.log("[voice-rx] phase:", "digitising+soap (parallel)");
        const soapPromise = generateSoapNote({
          context,
          previousContext: htmlToSoapSections(voiceDigitization?.soapHtml || priorVoiceResultRef.current?.soapHtml) || priorVoiceResultRef.current?.soap || voiceDigitization?.soap || null,
          signal: abortController.signal
        });
        let digitizeResult;
        try {
          const mainDigitisePrev = priorVoiceResultRef.current?.digitization || voiceDigitization?.clinicNotes || voiceDigitization?.digitizeData || null;
          console.log("[voice-rx] main pipeline digitise previousContext:", mainDigitisePrev);
          digitizeResult = await digitiseClinicalData({
            context,
            previousContext: mainDigitisePrev,
            signal: abortController.signal
          });
          digitizeCompletedAtMs = Date.now();
        } catch (error) {
          failedPhase = "digitise-data";
          if (error && typeof error === "object") error.phase = failedPhase;
          throw error;
        }
        if (digitizeResult?.status === "rejected") {
          const err = new Error(digitizeResult.error || "Digitisation failed.");
          err.phase = "digitising";
          failedPhase = "digitise-data";
          throw err;
        }
        const digitization = digitizeResult?.data ?? null;
        if (!digitization) {
          const err = new Error("Digitisation API returned no response.");
          failedPhase = "digitise-data";
          err.phase = failedPhase;
          throw err;
        }
        const resultSections = digitizationToSections(digitization);

        // Update the user echo bubble with the real transcript.
        setMessagesByPatient((prev) => {
          const list = prev[selectedPatientId] || [];
          const updated = list.map((m) => m.id === userMsg.id ? { ...m, text: finalTranscriptText, voiceTranscript: finalTranscriptText } : m);
          return { ...prev, [selectedPatientId]: updated };
        });

        const structuredStub = {
          sections: resultSections.map((s) => ({
            sectionId: s.id,
            title: s.title,
            tpIconName: s.tpIconName,
            items: s.items.map(toStructuredVoiceItem),
          })),
          copyAllPayload: { digitization }
        };

        const cardMsg = {
          id: uid(),
          role: "assistant",
          text: "Your clinical notes are ready — view your clinical notes to review, fine-tune, and copy them to the RxPad.",
          createdAt: new Date().toISOString(),
          rxOutput: { kind: "voice_structured_rx", data: structuredStub },
          feedbackGiven: null
        };
        setMessagesByPatient((prev) => {
          const existing = prev[selectedPatientId] || [];
          return { ...prev, [selectedPatientId]: [...existing, cardMsg] };
        });

        setVoiceRxHandoffExiting(false);
        setVoiceRxResultMinimized(false);

        const prior = priorVoiceResultRef.current;
        const newSegment = {
          id: uid(),
          body: finalTranscript,
          mode: voiceRxDialogChoice ?? "ambient_consultation",
          durationMs: meta?.durationMs ?? 0,
          createdAt: new Date().toISOString(),
          moduleName: "Doctor Agent",
          isDoctorAgent: true,
        };
        const transcriptSegments = prior?.transcriptSegments
          ? [...prior.transcriptSegments, newSegment]
          : [newSegment];
        const mergedTranscriptText = transcriptSegments.map((s) => clinicalTranscriptToText(s.body)).join("\n\n");
        priorVoiceResultRef.current = null;

        setVoiceRxResult({
          transcript: mergedTranscriptText,
          transcriptSegments,
          sections: resultSections,
          digitization,
          soap: null,
          soapHtml: "",
          soapStatus: "pending",
          soapError: null,
          durationMs: (meta?.durationMs ?? 0) + (prior?.durationMs ?? 0),
          structured: structuredStub,
          modeLabel: voiceRxDialogChoice === "dictation_consultation" ? "Dictation Mode" : "Conversation Mode",
          pendingSidebarBatch: undefined
        });
        soapPromise.then((soapResult) => {
          if (soapResult?.status === "fulfilled") {
            const soapHtml = soapToHtml(soapResult.data);
            setVoiceRxResult((prev) => prev ? { ...prev, soap: soapResult.data, soapHtml, soapStatus: "fulfilled", soapError: null } : prev);
            if (soapResult.data) dispatch(updateVoiceSoap(soapResult.data));
            if (soapHtml) dispatch(updateVoiceSoapHtml(soapHtml));
          } else {
            setVoiceRxResult((prev) => prev ? { ...prev, soap: null, soapHtml: "", soapStatus: "rejected", soapError: soapResult?.error || "SOAP generation failed." } : prev);
          }
        }).catch((err) => {
          setVoiceRxResult((prev) => prev ? { ...prev, soap: null, soapHtml: "", soapStatus: "rejected", soapError: err?.message || "SOAP generation failed." } : prev);
        });
        dispatch(updateVoiceDigitizeData(digitization));
        dispatch(updateVoiceClinicNotes(digitization));
        const clinicalCompletedAtMs = Date.now();
        uploadAndLogVoiceRx2({
          audioBlob,
          patientData,
          profile,
          sessionId: context.sessionId || voiceDigitization?.sessionId,
          submitId,
          requestId,
          submitClickedAt,
          submitClickedAtMs,
          durationMs: meta?.durationMs ?? 0,
          clinicalStatus: "completed",
          mode: voiceRxDialogChoice ?? "ambient_consultation",
          voicecall,
          sourceSurface: "doctor-agent",
          isDoctorAgent: true,
          micBeingUsed: meta?.micBeingUsed || "",
          voiceLogCreated: voiceDigitization?.voiceLogCreated,
          markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
          clinicalCompletedAtMs,
          transcriptCompletedAtMs,
          digitizeCompletedAtMs,
        }).then(({ source }) => {
          dispatch(addVoiceHistoryEntry(buildVoiceHistoryEntry({
            type: prior?.digitization ? "AUDIO_WITH_CONTEXT" : "AUDIO_NO_CONTEXT",
            source,
            durationMs: meta?.durationMs ?? 0,
            timeRequiredInMs: clinicalCompletedAtMs - clinicalStartedAtMs,
            conversation: finalTranscript,
            digitize: [],
            isDoctorAgent: true,
            moduleName: "Doctor Agent",
          })));
        });
      } catch (error) {
        if (error?.name === "AbortError") return;
        const failedPhase = error?.phase === "digitising" ? "digitise-data" : (error?.phase || "transcribe-audio");
        console.error("[voice-rx] pipeline failed", error);
        uploadAndLogVoiceRx2({
          audioBlob,
          patientData,
          profile,
          sessionId: context.sessionId || voiceDigitization?.sessionId,
          submitId,
          requestId,
          submitClickedAt,
          submitClickedAtMs,
          durationMs: meta?.durationMs ?? 0,
          clinicalStatus: "failed",
          failedPhase,
          errorMessage: error?.message || "Voice consultation failed.",
          retryAttempts: failedPhase === "transcribe-audio" ? 3 : 0,
          mode: voiceRxDialogChoice ?? "ambient_consultation",
          voicecall,
          sourceSurface: "doctor-agent",
          isDoctorAgent: true,
          micBeingUsed: meta?.micBeingUsed || "",
          voiceLogCreated: voiceDigitization?.voiceLogCreated,
          markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
          clinicalCompletedAtMs: Date.now(),
          transcriptCompletedAtMs,
          digitizeCompletedAtMs,
        });
        message.error(error?.message || "Voice consultation failed.");
        // Remove the optimistic user echo so the chat doesn't dangle.
        setMessagesByPatient((prev) => {
          const list = prev[selectedPatientId] || [];
          return { ...prev, [selectedPatientId]: list.filter((m) => m.id !== userMsg.id) };
        });
      } finally {
        if (voiceRxAbortRef.current === abortController) voiceRxAbortRef.current = null;
        voiceSubmitInFlightRef.current = false;
        setVoiceRxAwaitingResponse(false);
        setVoiceRxSubmittedTranscript("");
        setVoiceRxProcessingTranscript("");
      }
    })();
  }, [
    voiceRxLiveTranscript,
    voiceRxDialogChoice,
    selectedPatientId,
    setMessagesByPatient,
    onVoiceCaptureModeChange,
    resetLiveTranscript,
    patientId,
    doctorId,
    dispatch,
    patientData,
    profile,
    voiceDigitization?.sessionId,
    voiceDigitization?.voiceCallCount,
    voiceDigitization?.voiceLogCreated
  ]);

  // Cleanup any pending simulated response on unmount
  useEffect(() => {
    return () => {
      if (voiceRxTimeoutRef.current) {
        clearTimeout(voiceRxTimeoutRef.current);
        voiceRxTimeoutRef.current = null;
      }
      if (voiceRxAbortRef.current) {
        try { voiceRxAbortRef.current.abort(); } catch { /* ignore */ }
        voiceRxAbortRef.current = null;
      }
      setAiFillInProgress(false);
    };
  }, [setAiFillInProgress]);

  // Custom events for external sticky fab control
  useEffect(() => {
    const handleRemoteSubmit = () => submitVoiceRxRecording();
    const handleRemoteCancel = () => cancelVoiceRxRecording();
    window.addEventListener("voicerx:submit", handleRemoteSubmit);
    window.addEventListener("voicerx:cancel", handleRemoteCancel);
    return () => {
      window.removeEventListener("voicerx:submit", handleRemoteSubmit);
      window.removeEventListener("voicerx:cancel", handleRemoteCancel);
    };
  }, [submitVoiceRxRecording, cancelVoiceRxRecording]);

  // ── Derived State ──
  const contextPatient = useMemo(
    () => RX_CONTEXT_OPTIONS.find((p) => p.id === selectedPatientId) || RX_CONTEXT_OPTIONS[0],
    [selectedPatientId]
  );

  const patient = useMemo(
    () => buildPatientFromData(patientData, contextPatient),
    [contextPatient, patientData]
  );

  const symptomCollectorData = useMemo(
    () => normalizeSymptomCollectorData(symptomCollector),
    [symptomCollector]
  );

  const summary = useMemo(() => {
    const baseSummary = SMART_SUMMARY_BY_CONTEXT[selectedPatientId] || SMART_SUMMARY_BY_CONTEXT[CONTEXT_PATIENT_ID];
    return {
      ...baseSummary,
      symptomCollectorData: symptomCollectorData || baseSummary.symptomCollectorData,
    };
  }, [selectedPatientId, symptomCollectorData]);

  const hasRestorableVoiceData = useMemo(() => {
    if (!voiceDigitization) return false;
    const history = Array.isArray(voiceDigitization.history) ? voiceDigitization.history : [];
    const hasDoctorAgentHistory = history.some(
      (entry) => entry?.isDoctorAgent === true || entry?.sourceSurface === "doctor-agent"
    );
    return hasDoctorAgentHistory || hasObjectData(voiceDigitization.clinicNotes) || hasObjectData(voiceDigitization.digitizeData);
  }, [voiceDigitization]);

  const voiceLaunchLookupPending = voiceRxMode && !hasRestorableVoiceData && (
    voiceHydrationStatus === "idle" ||
    voiceHydrationStatus === "loading" ||
    voiceHydrationStatus === "hydrated" ||
    symptomCollectorStatus === "idle" ||
    symptomCollectorStatus === "loading"
  );

  // Snapshot seed removed — VoiceRx welcome screen is always shown until
  // the doctor submits their first voice consultation.

  const messages = useMemo(
    () => messagesByPatient[selectedPatientId] || [],
    [messagesByPatient, selectedPatientId]
  );

  /**
   * VoiceRx first-time UX: hide canned intro messages and the text chat input until the
   * doctor has submitted at least one voice consultation. Until then the panel shows only
   * a single "Start Consultation" CTA (and the contextual patient strip).
   */
  const voiceHasFirstSubmission = useMemo(
    () => voiceRxMode && messages.some((m) => m.role === "user" && !!m.voiceTranscript),
    [voiceRxMode, messages]
  );
  // Pre-first-submission gate — true from panel mount until the doctor's
  // first voice consultation lands. Drives BOTH the centered empty-state
  // (when there are no messages yet) and the full-width "Start with Voice"
  // sticky-footer CTA (when there are messages but still no voice
  // submission). The text ChatInput is suppressed while this is true.
  const voiceFirstTimeMode = voiceRxMode && !voiceHasFirstSubmission && !voiceRxRecording && !voiceRxAwaitingResponse && !hasRestorableVoiceData && !voiceLaunchLookupPending;
  // Centered greeting + inline CTA + canned card. Only shown when nothing
  // has been seeded into the thread yet.
  // SKIP the welcome screen when symptom collector data exists — the doctor
  // should see the auto-loaded patient report immediately (with loader).
  const hasSymptomData = hasPatientReportedData(summary.symptomCollectorData);
  const voiceEmptyState = voiceFirstTimeMode && messages.length === 0 && !hasSymptomData && !isTyping;

  /** Glance intro still has inline pills under the bubble — hide context PillBar until cleared */
  const glanceInlinePillsActive = useMemo(
    () => messages.some((m) => isSituationAtGlanceAssistantMessage(m) && !!m.suggestions?.length),
    [messages]
  );

  const phase = useMemo(
    () => phaseByPatient[selectedPatientId] || "empty",
    [phaseByPatient, selectedPatientId]
  );

  const availableSpecialties = useMemo(() => detectSpecialties(summary), [summary]);

  // Homepage mode retired — isPatientContext is always false in rxpad mode
  const isPatientContext = false;

  // Show doctor view selector only for patients with POMR/SBAR data (POC: Ramesh Kumar only)
  const showDoctorViewSelector = selectedPatientId === "apt-ramesh-ckd";

  // ── Pill deduplication: track which card kinds have been shown ──
  const shownCardKinds = useMemo(() => {
    const kinds = new Set();
    for (const msg of messages) {
      if (msg.rxOutput?.kind) kinds.add(msg.rxOutput.kind);
    }
    return kinds;
  }, [messages]);

  /** Map pill labels to the card kind(s) they produce — used to hide pills for already-shown cards */
  const PILL_TO_CARD_KINDS = {
    "Patient's detailed summary": ["patient_summary", "sbar_overview"],
    "Patient summary": ["sbar_overview", "patient_summary"],
    "Reported by patient": ["symptom_collector"],
    "Show reported intake": ["symptom_collector"],
    "Last visit": ["last_visit"],
    "Last visit details": ["last_visit"],
    "Past visit summaries": ["last_visit"],
    "Vital trends": ["vitals_trend_bar"],
    "Suggest DDX": ["ddx"],
    "Lab overview": ["lab_panel"],
    "Lab comparison": ["lab_comparison"],
    "Obstetric summary": ["obstetric_summary"],
    "Gynec summary": ["gynec_summary"],
    "Growth & vaccines": ["pediatric_summary"],
    "Vision summary": ["ophthal_summary"],
    "Flagged lab results": ["lab_panel"],
    "Follow-up overview": ["follow_up"]
  };

  const pills = useMemo(() => {
    // Homepage pill generation removed — only rxpad/VoiceRx mode remains
    const rawPills = generatePills(summary, phase, activeTabLens, showDoctorViewSelector ? doctorViewType : undefined);

    // Filter out pills whose card has already been shown in the current conversation
    return rawPills.filter((pill) => {
      const cardKinds = PILL_TO_CARD_KINDS[pill.label];
      if (!cardKinds) return true; // Unknown mapping — always show
      return !cardKinds.some((kind) => shownCardKinds.has(kind));
    });
  }, [summary, phase, activeTabLens, selectedPatientId, showDoctorViewSelector, doctorViewType, shownCardKinds]);

  // ── Sync patient allergies to context (for RxPad medication alerts) ──
  // useEffect(() => {
  //   setPatientAllergies(summary.allergies ?? []);
  // }, [summary, setPatientAllergies]);

  // ── Initialize patient messages on first visit or after intake mode change ──
  // Note: we track whether messages exist for the current patient using a ref-derived flag
  // to avoid putting messagesByPatient in the dep array (which would cause infinite loops
  // since this effect itself sets messagesByPatient).
  const hasMessagesForPatient = (messagesByPatient[selectedPatientId]?.length ?? 0) > 0;
  useEffect(() => {
    if (voiceLaunchLookupPending || hasRestorableVoiceData) return;
    if (!hasMessagesForPatient) {
      let introMessages;
      if (voiceRxMode) {
        if (hasPatientReportedData(summary.symptomCollectorData)) {
          introMessages = [];
          const scData = summary.symptomCollectorData;
          const patientName = patient.label;
          const pid = selectedPatientId;
          if (scFlowStartedRef.current.has(pid)) return;
          scFlowStartedRef.current.add(pid);

          // Phase 1: SC card message immediately with shimmer text reveal
          const nowIso = new Date().toISOString();
          setMessagesByPatient((prev) => ({
            ...prev,
            [pid]: [
            {
              id: uid(),
              role: "assistant",
              text: `${patientName} has shared pre-visit details via Symptom Collector.`,
              rxOutput: { kind: "symptom_collector", data: scData },
              createdAt: nowIso,
              feedbackGiven: null,
              shimmerReveal: true
            }]

          }));

          // Phase 2 (2.5s): follow-up message after card + feedback row have revealed.
          // Keep this timer outside the effect cleanup so the message-state rerender
          // from Phase 1 does not cancel the delayed reveal.
          if (scFollowUpTimerRef.current) {
            window.clearTimeout(scFollowUpTimerRef.current);
          }
          scFollowUpTimerRef.current = window.setTimeout(() => {
            const replyIso = new Date().toISOString();
            setMessagesByPatient((prev) => ({
              ...prev,
              [pid]: [
              ...(prev[pid] || []),
              {
                id: uid(),
                role: "assistant",
                text: "Start consultation by **dictating** or having a **natural conversation** with the patient. **Tap below** to begin.",
                createdAt: replyIso,
                feedbackGiven: null,
                hideFeedback: true,
                shimmerReveal: true
              }]

            }));
            scFollowUpTimerRef.current = null;
          }, 2500);
          return;
        } else {
          introMessages = [];
        }
      } else {
        introMessages = buildIntroMessages(summary, patient, showDoctorViewSelector ? doctorViewType : undefined, intakeMode, "rxpad");
      }
      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: introMessages
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId, hasMessagesForPatient, summary, patient, initialPatientId, voiceLaunchLookupPending, hasRestorableVoiceData]);

  // ── Reset specialty when patient changes ──
  useEffect(() => {
    const detected = detectSpecialties(summary);
    if (!detected.includes(activeSpecialty)) {
      setActiveSpecialty("gp");
    }
  }, [summary, activeSpecialty]);

  // ── Handle Sidebar Signals ──
  useEffect(() => {
    if (!lastSignal || lastSignal.id === lastSignalIdRef.current) return;
    lastSignalIdRef.current = lastSignal.id;

    if (lastSignal.type === "sidebar_pill_tap" && lastSignal.label) {
      // Pre-fill input box — doctor decides whether to send
      setInputValue(lastSignal.label);
      setIsPrefilled(true);
    }

    // AI trigger from RxPad section chips or sidebar icons → pre-fill input
    if (lastSignal.type === "ai_trigger" && lastSignal.label) {
      setInputValue(lastSignal.label);
      setIsPrefilled(true);
    }

    // When symptoms are added in RxPad, advance phase to show DDX pills
    if (lastSignal.type === "symptoms_changed") {
      const currentPhase = phaseByPatient[selectedPatientId] || "empty";
      if (currentPhase === "empty") {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: "symptoms_entered" }));
      }
    }

    // When diagnosis is added, advance phase
    if (lastSignal.type === "diagnosis_changed") {
      const currentPhase = phaseByPatient[selectedPatientId] || "empty";
      if (currentPhase === "symptoms_entered") {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: "dx_accepted" }));
      }
    }

    // When medications are added, advance phase accordingly
    if (lastSignal.type === "medications_changed") {
      const currentPhase = phaseByPatient[selectedPatientId] || "empty";
      if (currentPhase === "dx_accepted") {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: "meds_written" }));
      }
    }
  }, [lastSignal]);

  // ── Core: Send Message ──
  const handleSend = useCallback((text) => {
    const msg = text || inputValue.trim();
    if (!msg) return;

    const msgNorm = msg.trim().toLowerCase();
    const qp = QUICK_CLINICAL_SNAPSHOT_PROMPT.trim().toLowerCase();
    if (msgNorm === qp || msgNorm.startsWith(qp)) {
      const cur = messagesByPatient[selectedPatientId] || [];
      if (threadAlreadyHasQuickClinicalGlance(cur, qp)) {
        return;
      }
    }

    // Clear inline suggestions from all messages (so bottom pill bar reappears)
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).map((m) => m.suggestions ? { ...m, suggestions: undefined } : m)
    }));

    const userMsg = {
      id: uid(),
      role: "user",
      text: msg,
      createdAt: new Date().toISOString()
    };

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg]
    }));
    setInputValue("");

    // Classify intent — check PILL_INTENT_MAP first (exact pill labels bypass NLU)
    const pillOverride = PILL_INTENT_MAP[msg];
    const intent = pillOverride ?
    { category: pillOverride, format: "card", confidence: 1 } :
    classifyIntent(msg);

    // Set context-aware typing hint before showing indicator
    setTypingHint(getQueryHint(intent.category, msg));
    setIsTyping(true);

    // Build reply after a short delay (simulate thinking)
    setTimeout(() => {
      const currentMessages = [...(messagesByPatient[selectedPatientId] || []), userMsg];
      const currentPhase = phaseByPatient[selectedPatientId] || "empty";

      // Update phase
      const newPhase = inferPhase(currentMessages, currentPhase);
      if (newPhase !== currentPhase) {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: newPhase }));
      }

      // ── Guardrails + Routing ──
      const isOperationalQuery = intent.category === "operational";

      let reply;

      if (isOperationalQuery) {
        // ── GUARDRAIL: Operational/clinic query inside RxPad → redirect to appointments page ──
        const patientLabel = summary.patientNarrative ?
        "this patient" :
        "the current patient";
        reply = {
          text: `You're currently inside ${patientLabel}'s consultation. Clinic-wide analytics like revenue, KPIs, and scheduling are available on the Appointments page. Switch to the Clinic Overview context to access operational data.`,
          followUpPills: [
          { id: "grd-suggest", label: "Suggest DDX", priority: 10, layer: 3, tone: "primary" },
          { id: "grd-labs", label: "Lab overview", priority: 12, layer: 3, tone: "primary" }]

        };
      } else {
        // ── Normal: Patient-context reply ──
        reply = buildReply(msg, summary, newPhase, intent);
      }

      const qt = msg.trim().toLowerCase();
      const qp = QUICK_CLINICAL_SNAPSHOT_PROMPT.toLowerCase();
      if (qt === qp || qt.startsWith(qp)) {
        reply = {
          text: SITUATION_AT_A_GLANCE_ASSISTANT_TEXT,
          rxOutput: { kind: "text_quote", data: { quote: buildQuickClinicalSnapshotText(summary), source: "" } },
          suggestions: buildQuickClinicalSnapshotInlineSuggestions(summary, "full")
        };
      }

      const assistantMsg = {
        id: uid(),
        role: "assistant",
        text: reply.text,
        createdAt: new Date().toISOString(),
        rxOutput: reply.rxOutput,
        feedbackGiven: null,
        suggestions: reply.suggestions
      };

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg]
      }));
      setIsTyping(false);
      setTypingHint("");
      // Delay simulates AI thinking — 2-2.5s feels natural for clinical queries
    }, 1800 + Math.random() * 700);
  }, [inputValue, selectedPatientId, summary, messagesByPatient, phaseByPatient]);

  // ── Pill Tap ──
  const handlePillTap = useCallback((pill) => {
    handleSend(pill.label);
  }, [handleSend]);

  // ── Feedback ──
  const handleFeedback = useCallback((messageId, feedback) => {
    setMessagesByPatient((prev) => {
      const msgs = prev[selectedPatientId] || [];
      return {
        ...prev,
        [selectedPatientId]: msgs.map((m) =>
        m.id === messageId ? { ...m, feedbackGiven: feedback } : m
        )
      };
    });
  }, [selectedPatientId]);

  // ── Patient Search Selection ──
  const handlePatientSelect = useCallback((patientId) => {
    setSelectedPatientId(patientId);
  }, []);

  // ── Fill to RxPad ──
  // Second argument `opts` lets cards mark a copy as bulk (e.g.
  // PatientReportedCard's "Copy all to RxPad" footer button). Bulk
  // routes through runCopyWithAura with the page-edge aura on; per-
  // section copies suppress the edge overlay (handled inside
  // runCopyWithAura).
  const handleCopy = useCallback((payload, opts) => {
    if (payload && typeof payload === "object" && "sourceDateLabel" in payload) {
      runCopyWithAura(payload, {
        ...opts,
        onAfterCopy: opts?.onAfterCopy || (() => toast.success("Copied to RxPad"))
      });
      try {
        const existing = sessionStorage.getItem("pendingRxPadCopy");
        const arr = existing ? JSON.parse(existing) : [];
        arr.push(payload);
        sessionStorage.setItem("pendingRxPadCopy", JSON.stringify(arr));
      } catch {/* ignore storage errors */}
    }
  }, [runCopyWithAura]);

  // ── Sidebar Navigation ──
  const handleSidebarNav = useCallback((tab) => {
    // Publish signal first so sidebar can process it
    publishSignal({ type: "section_focus", sectionId: tab });
    // Small delay to let sidebar process the signal before closing agent panel
    setTimeout(() => {
      onClose();
    }, 50);
  }, [publishSignal, onClose]);

  // ── From pill tap in chat (text-based) ──
  const handleChatPillTap = useCallback((label) => {
    handleSend(label);
  }, [handleSend]);

  // ── Doctor View Change — directly rebuild intro messages ──
  const handleDoctorViewChange = useCallback((newType) => {
    setDoctorViewType(newType);
    // Directly rebuild intro messages instead of delete-then-recreate via useEffect
    // This avoids the intermediate empty state that could cause visual flicker
    const newIntro = buildIntroMessages(summary, patient, showDoctorViewSelector ? newType : undefined, intakeMode, "rxpad");
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: newIntro
    }));
    setIsTyping(false);
  }, [selectedPatientId, summary, patient, showDoctorViewSelector, intakeMode]);

  // ── Intake Mode Change — directly rebuild intro messages ──
  const handleIntakeModeChange = useCallback((newMode) => {
    setIntakeMode(newMode);
    // Directly rebuild intro messages instead of delete-then-recreate via useEffect
    const newIntro = buildIntroMessages(summary, patient, showDoctorViewSelector ? doctorViewType : undefined, newMode, "rxpad");
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: newIntro
    }));
    setIsTyping(false);
  }, [selectedPatientId, summary, patient, showDoctorViewSelector, doctorViewType]);

  // ── Patient Change ──
  const handlePatientChange = useCallback((id) => {
    setSelectedPatientId(id);
    setInputValue("");
    setIsTyping(false);
  }, []);

  // ── Chip shake — triggered when locked chip in input is clicked ──
  const handleLockedChipClick = useCallback(() => {
    setChipShaking(true);
    setTimeout(() => setChipShaking(false), 600);
  }, []);

  // ── Edit message — ChatGPT-style: truncate after edited msg, re-send ──
  const handleEditMessage = useCallback((messageId, newText) => {
    setMessagesByPatient((prev) => {
      const msgs = prev[selectedPatientId] || [];
      const idx = msgs.findIndex((m) => m.id === messageId);
      if (idx < 0) return prev;
      // Keep messages up to (not including) the edited one
      const kept = msgs.slice(0, idx);
      return { ...prev, [selectedPatientId]: kept };
    });
    // Re-send with new text after state updates
    setTimeout(() => handleSend(newText), 50);
  }, [selectedPatientId, handleSend]);

  // ── Handle attach — context-aware ──
  // Homepage (Clinic Overview, no patient) → open native file picker
  // Patient context → show bottom sheet with patient's documents
  const handleAttach = useCallback(() => {
    // Patient context → show document bottom sheet
    setShowDocBottomSheet(true);
  }, []);

  // ── Handle sending selected documents from bottom sheet ──
  const handleSendDocuments = useCallback((docs) => {
    setShowDocBottomSheet(false);

    const fileNames = docs.map((d) => d.fileName);
    const textPrefix = docs.length === 1 ?
    `Analyze this document: **${docs[0].fileName}**` :
    `Analyze these ${docs.length} documents: ${fileNames.map((f) => `**${f}**`).join(", ")}`;

    const userMsg = {
      id: uid(),
      role: "user",
      text: textPrefix,
      createdAt: new Date().toISOString(),
      attachment: {
        type: "pdf",
        fileName: docs[0].fileName,
        pageCount: docs[0].pageCount
      }
    };

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg]
    }));
    setIsTyping(true);

    // Determine reply based on first doc's type
    const docType = docs[0].docType === "radiology" ? "radiology" :
    docs[0].docType === "prescription" ? "prescription" :
    "pathology";

    setTimeout(() => {
      const reply = buildDocumentReply(docType, summary);
      const assistantMsg = {
        id: uid(),
        role: "assistant",
        text: docs.length === 1 ?
        reply.text :
        `I've analyzed ${docs.length} documents. Here's the key extraction from the primary report:\n\n${reply.text}`,
        createdAt: new Date().toISOString(),
        rxOutput: reply.rxOutput,
        feedbackGiven: null
      };

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg]
      }));
      setIsTyping(false);
    }, 1200);
  }, [selectedPatientId, summary]);

  // ── Handle upload from bottom sheet or file input ──
  const handleUploadNew = useCallback(() => {
    setShowDocBottomSheet(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(() => {
    // In POC, just open the old attach panel for doc type selection
    setShowAttachPanel(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleAttachSelect = useCallback((docType) => {
    setShowAttachPanel(false);

    const fileNameMap = {
      pathology: "Lab_Report_Mar2026.pdf",
      radiology: "X-Ray_Chest_Mar2026.pdf",
      prescription: "Previous_Rx_Mar2026.pdf"
    };
    const pageMap = { pathology: 2, radiology: 1, prescription: 1 };

    const userMsg = {
      id: uid(),
      role: "user",
      text: "",
      createdAt: new Date().toISOString(),
      attachment: {
        type: "pdf",
        fileName: fileNameMap[docType] ?? "Document.pdf",
        pageCount: pageMap[docType] ?? 1
      }
    };

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg]
    }));
    setIsTyping(true);

    setTimeout(() => {
      const reply = buildDocumentReply(docType, summary);
      const assistantMsg = {
        id: uid(),
        role: "assistant",
        text: reply.text,
        createdAt: new Date().toISOString(),
        rxOutput: reply.rxOutput,
        feedbackGiven: null,
        suggestions: reply.suggestions
      };

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg]
      }));
      setIsTyping(false);
    }, 1200);
  }, [selectedPatientId, summary]);

  // ── Voice transcription → structured RX ──
  const handleVoiceTranscription = useCallback((text) => {
    const userMsg = {
      id: uid(),
      role: "user",
      text,
      voiceTranscript: text,
      createdAt: new Date().toISOString(),
      feedbackGiven: null
    };

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg]
    }));
    setIsTyping(true);

    setTimeout(() => {
      const structured = parseVoiceToStructuredRx(text);
      const assistantMsg = {
        id: uid(),
        role: "assistant",
        text: "",
        createdAt: new Date().toISOString(),
        rxOutput: { kind: "voice_structured_rx", data: structured },
        feedbackGiven: null
      };

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg]
      }));
      setIsTyping(false);
    }, 800);
  }, [selectedPatientId]);

  // ── Chat scroll ref ──
  const chatScrollRef = useRef(null);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    return () => {
    };
  }, []);

  // ── Patient documents for bottom sheet ──
  const patientDocuments = useMemo(
    () => PATIENT_DOCUMENTS[selectedPatientId] || [],
    [selectedPatientId]
  );

  const handleViewPatientDetails = useCallback(() => {
    if (!hasPatientReportedData(summary.symptomCollectorData)) {
      handleSend("Reported by patient");
      return;
    }
    const nowIso = new Date().toISOString();
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [
      ...(prev[selectedPatientId] || []),
      { id: uid(), role: "user", text: "Show me the patient-reported details", createdAt: nowIso, feedbackGiven: null }]

    }));
    const replyIso = new Date().toISOString();
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [
      ...(prev[selectedPatientId] || []),
      { id: uid(), role: "assistant", text: "Here's what the patient reported via the symptom collector.", rxOutput: { kind: "symptom_collector", data: summary.symptomCollectorData }, createdAt: replyIso, feedbackGiven: null, shimmerReveal: true }]

    }));
    window.setTimeout(() => {
      const followUpIso = new Date().toISOString();
      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [
        ...(prev[selectedPatientId] || []),
        { id: uid(), role: "assistant", text: "Start your consultation by dictating or having a natural conversation with the patient.", createdAt: followUpIso, feedbackGiven: null, hideFeedback: true, shimmerReveal: true }]

      }));
    }, 2500);
  }, [summary.symptomCollectorData, handleSend, setMessagesByPatient, selectedPatientId]);

  // Flip only while actively recording — submit flips back immediately so the chat loader
  // (VoiceRxLoaderCard) + RxPad processing overlay become visible.
  // Stay on the back face for the entire voice flow:
  //   recording → loading (awaiting response) → result tabs
  // The user only returns to chat by pressing the back arrow inside the
  // result tabs (which clears voiceRxResult) or by cancelling.
  // Flip for active voice recording/loading, OR when viewing a restored session
  // result (from chat card expand). The latter doesn't require voiceRxMode prop.
  const isFlipped = voiceRxMode && (voiceRxRecording || voiceRxAwaitingResponse) || voiceRxResult !== null && !voiceRxResultMinimized;

  // Flip-step counter — increments on every toggle of isFlipped so the
  // 3D wrapper always rotates by an additional 180° in the SAME
  // direction. The previous implementation animated 0 → 180 → 0,
  // which read as "flip back the way it came". Counting up gives
  // 0 → 180 → 360 → 540, so each transition spins forward and the
  // back→front trip rotates the opposite way to the front→back trip.
  const flipStepRef = useRef(0);
  const lastFlippedRef = useRef(isFlipped);
  if (lastFlippedRef.current !== isFlipped) {
    flipStepRef.current += 1;
    lastFlippedRef.current = isFlipped;
  }
  const flipDeg = flipStepRef.current * 180;

  return {
    // State
    selectedPatientId,
    messages,
    isTyping,
    typingHint,
    activeSpecialty,
    setActiveSpecialty,
    doctorViewType,
    intakeMode,
    inputValue,
    setInputValue,
    isPrefilled,
    setIsPrefilled,
    isSessionHistoryOpen,
    setIsSessionHistoryOpen,
    showAttachPanel,
    setShowAttachPanel,
    showDocBottomSheet,
    setShowDocBottomSheet,
    voiceRxDialogOpen,
    setVoiceRxDialogOpen,
    voiceRxDialogChoice,
    setVoiceRxDialogChoice,
    voiceRxRecording,
    setVoiceRxRecording,
    beginVoiceAddOn,
    submitQuickEdit,
    flipDeg,
    voiceRxAwaitingResponse,
    voiceRxHandoffExiting,
    voiceRxResult,
    setVoiceRxResult,
    voiceRxResultMinimized,
    setVoiceRxResultMinimized,
    voiceRxLiveTranscript,
    voiceRxSubmittedTranscript,
    voiceRxProcessingTranscript,
    blockedVoiceToast,
    setBlockedVoiceToast,
    chipShaking,
    // Computed
    patient,
    summary,
    voiceEmptyState,
    voiceFirstTimeMode,
    glanceInlinePillsActive,
    pills,
    availableSpecialties,
    showDoctorViewSelector,
    patientDocuments,
    isFlipped,
    // Handlers
    handleSend,
    handlePillTap,
    handleFeedback,
    handlePatientSelect,
    handleCopy,
    handleSidebarNav,
    handleChatPillTap,
    handleDoctorViewChange,
    handleIntakeModeChange,
    handlePatientChange,
    handleLockedChipClick,
    handleEditMessage,
    handleAttach,
    handleSendDocuments,
    handleUploadNew,
    handleFileInputChange,
    handleAttachSelect,
    handleVoiceTranscription,
    handleVoiceRxPauseChange,
    confirmVoiceRxConsult,
    cancelVoiceRxRecording,
    submitVoiceRxRecording,
    handleViewPatientDetails,
    // Refs
    chatScrollRef,
    fileInputRef,
    // RxPad sync
    runCopyWithAura,
    pushHistoricalUpdates
  };
}
