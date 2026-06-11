import {
  createVoiceLog,
  updateVoiceLog,
  uploadVoiceAudio,
} from "../../../api/services/ApiGenRx";
import { getClinic, trackEvent } from "../../../utils/utils";

export const VOICE_RX_2_VERSION = "2.0";
export const VOICE_RX_MODEL = "zyvelor";

export function getBrowserNameForVoiceRx2() {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) return "Google Chrome";
  if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) return "Safari";
  return "Unknown";
}

function createAudioFile(audioBlob, prefix = "voice-rx-2") {
  const extension = (audioBlob?.type || "").includes("mp4") ? "mp4" : "webm";
  const fileName = `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`;
  return new File([audioBlob], fileName, { type: audioBlob?.type || "audio/webm" });
}

function normalizeUploadSource(uploadResponse) {
  const data = uploadResponse?.data || uploadResponse || {};
  return (
    data.prescriptionUrl ||
    data.prescription_url ||
    data.source ||
    data.filename ||
    data.fileName ||
    data.url ||
    data.path ||
    ""
  );
}

function getErrorMessage(error) {
  if (!error) return "";
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || String(error);
}

export function buildVoiceHistoryEntry({
  type,
  source = "",
  durationMs = 0,
  timeRequiredInMs = 0,
  conversation,
  digitize,
  isDoctorAgent = false,
  moduleName = "",
}) {
  return {
    type,
    source,
    sourceDurationInSeconds: Math.round((durationMs || 0) / 1000),
    timeRequiredInMs,
    transcription: "",
    digitize: digitize ?? (isDoctorAgent ? [] : {}),
    conversation: conversation ?? [],
    voiceModel: VOICE_RX_MODEL,
    voiceRxVersion: VOICE_RX_2_VERSION,
    isDoctorAgent,
    moduleName,
  };
}

export async function uploadAndLogVoiceRx2({
  audioBlob,
  patientData,
  profile,
  sessionId,
  submitId,
  requestId,
  submitClickedAt,
  submitClickedAtMs,
  durationMs = 0,
  clinicalStatus = "completed",
  failedPhase = "",
  errorMessage = "",
  retryAttempts = 0,
  mode = "dictation",
  fromVoiceRecording = false,
  voicecall = 0,
  moduleName = "",
  sourceSurface = "",
  isDoctorAgent = false,
  micBeingUsed = "",
  voiceLogCreated = false,
  markVoiceLogCreated,
  clinicalCompletedAtMs,
  transcriptCompletedAtMs,
  digitizeCompletedAtMs,
}) {
  const startedAtMs = submitClickedAtMs || Date.now();
  let uploadResponse = null;
  let uploadError = null;
  let source = "";
  const uploadStartedAtMs = Date.now();

  try {
    if (!audioBlob?.size) {
      throw new Error("No audio recording found for upload.");
    }
    uploadResponse = await uploadVoiceAudio(createAudioFile(audioBlob));
    source = normalizeUploadSource(uploadResponse);
  } catch (error) {
    uploadError = error;
  }

  const uploadCompletedAtMs = Date.now();
  const uploadCompletedAt = new Date(uploadCompletedAtMs).toISOString();
  const clinicalCompletedAt = clinicalCompletedAtMs ? new Date(clinicalCompletedAtMs).toISOString() : "";
  const transcriptCompletedAt = transcriptCompletedAtMs ? new Date(transcriptCompletedAtMs).toISOString() : "";
  const digitizeCompletedAt = digitizeCompletedAtMs ? new Date(digitizeCompletedAtMs).toISOString() : "";
  const clinic = getClinic(profile?.hospital_data);
  const logStatus = clinicalStatus === "completed" ? "completed" : "failed";
  const uploadFailed = Boolean(uploadError);
  const finalErrorMessage = errorMessage || getErrorMessage(uploadError);

  const eventPayload = {
    doctorId: profile?.doctor_unique_id || "",
    doctorName: profile?.um_name || "",
    patientId: patientData?.patient_unique_id || "",
    patientName: patientData?.pm_fullname || patientData?.pm_first_name || "",
    hospitalId: clinic?.hm_id || "",
    hospitalName: clinic?.hm_name || "",
    prescriptionUrl: source,
    prescriptionUrls: source ? [source] : [],
    network: uploadFailed ? "unstable" : "stable",
    micBeingUsed,
    browser: getBrowserNameForVoiceRx2(),
    durationOfAudioInSeconds: Math.round((durationMs || 0) / 1000),
    voiceApiCalled: true,
    sessionId,
    submitId,
    requestId,
    audioSizeBytes: audioBlob?.size || 0,
    audioMimeType: audioBlob?.type || "audio/webm",
    mode,
    fromVoiceRecording,
    upload_latency_ms: uploadCompletedAtMs - uploadStartedAtMs,
    upload_failed: uploadFailed,
    upload_error_message: getErrorMessage(uploadError),
    voicecall,
    status: logStatus,
    voice_failed: logStatus === "failed",
    failedPhase,
    error_message: finalErrorMessage,
    retry_attempts: retryAttempts,
    moduleName,
    sourceSurface,
    isDoctorAgent,
    submitClickedAt,
    uploadCompletedAt,
    clinicalCompletedAt,
    transcriptCompletedAt,
    digitizeCompletedAt,
    timeFromSubmitToUploadMs: uploadCompletedAtMs - startedAtMs,
    timeFromSubmitToClinicalCompleteMs: clinicalCompletedAtMs ? clinicalCompletedAtMs - startedAtMs : null,
    timeFromSubmitToLogMs: Date.now() - startedAtMs,
    voiceRxVersion: VOICE_RX_2_VERSION,
    timestamp: new Date().toISOString(),
  };

  trackEvent("TP_Voice_Submit_Click", eventPayload);

  const correlationId = sessionId || submitId || requestId || "";
  const logPayload = {
    correlationId,
    needConversation: mode === "ambient" || mode === "ambient_consultation",
    ...eventPayload,
  };

  try {
    if (!voiceLogCreated) {
      await createVoiceLog(logPayload, eventPayload.patientId, { correlationId });
      markVoiceLogCreated?.();
    } else {
      await updateVoiceLog(logPayload, eventPayload.patientId, { correlationId });
    }
  } catch (error) {
    console.error("[voice-rx-2/logs] Failed", error?.message || error);
  }

  return {
    source,
    uploadResponse,
    uploadError,
    eventPayload,
  };
}
