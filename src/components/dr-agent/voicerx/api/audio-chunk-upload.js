import { buildClinicalApiHeaders, joinAgentModuleApiUrl } from "./clinical-api";

export const VOICE_CHUNK_UPLOAD_INTERVAL_MS = 30 * 1000;

const AUDIO_CHUNKS_ENDPOINT = "/audio-chunks";
const MAX_UPLOAD_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 900;

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeMetadata({ chunkIndex, doctorId, patientId }) {
  return {
    chunk_index: chunkIndex,
    doctor_id: String(doctorId || ""),
    patient_id: String(patientId || ""),
  };
}

function getChunkFileName(chunkIndex, mimeType) {
  const ext = String(mimeType || "").includes("mp4") ? "mp4" : "webm";
  return `chunk-${String(chunkIndex).padStart(6, "0")}.${ext}`;
}

async function postWithRetry(task) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_UPLOAD_ATTEMPTS) break;
      await delay(BASE_RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError;
}

export function isAudioChunkContextReady(context) {
  return Boolean(context?.sessionId && context?.doctorId && context?.patientId);
}

export async function uploadAudioChunk({
  audioBlob,
  chunkIndex,
  sessionId,
  doctorId,
  patientId,
}) {
  if (!audioBlob?.size) {
    throw new Error("No audio chunk available for upload.");
  }
  if (!sessionId || !doctorId || !patientId) {
    throw new Error("Missing patient, doctor, or session id for audio chunk upload.");
  }

  const metadata = normalizeMetadata({ chunkIndex, doctorId, patientId });
  const formData = new FormData();
  const fileName = getChunkFileName(chunkIndex, audioBlob.type);
  formData.append("session_id", String(sessionId));
  formData.append("metadata", JSON.stringify(metadata));
  formData.append("audio", audioBlob, fileName);

  const responseJson = await postWithRetry(async () => {
    const response = await fetch(joinAgentModuleApiUrl(AUDIO_CHUNKS_ENDPOINT), {
      method: "POST",
      headers: buildClinicalApiHeaders({ includeContentType: false }),
      body: formData,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Audio chunk upload failed with ${response.status}. ${detail}`.trim());
    }
    return response.json();
  });

  return responseJson;
}
