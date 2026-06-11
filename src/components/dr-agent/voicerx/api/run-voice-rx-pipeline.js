import { transcribeAudio, digitiseClinicalData } from "./clinical-processing";

export function createVoiceRxSessionContext({ patientId, doctorId, sessionId }) {
  return {
    patientId: String(patientId ?? ""),
    doctorId: String(doctorId ?? ""),
    sessionId: sessionId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`)
  };
}

export async function runVoiceRxPipeline({ audioBlob, context, signal, onPhase }) {
  onPhase?.("transcribing");
  const transcript = await transcribeAudio({ audioBlob, context, signal });

  onPhase?.("digitising");
  const digitizeResult = await digitiseClinicalData({ context, signal });

  if (digitizeResult?.status === "rejected") {
    const err = new Error(digitizeResult.error || "Digitisation failed.");
    err.phase = "digitising";
    throw err;
  }

  onPhase?.("done");
  return {
    transcript,
    digitization: digitizeResult?.data ?? null
  };
}
