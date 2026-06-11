import { buildClinicalApiHeaders, joinAgentModuleApiUrl } from "./clinical-api";

const TRANSCRIBE_ANY_AUDIO_ENDPOINT = "/agents/transcribe-any-audio";
const TRANSCRIBE_ANY_AUDIO_TIMEOUT_MS = 10 * 60 * 1000;

export const PRIVATE_NOTES_TRANSCRIPTION_PROMPT =
  "Transcribe the audio exactly as spoken, preserving the original language. Do not summarize. Remove any silent filler words (e.g., 'um', 'uh'); do not include them in the transcription."

function getTimerApi() {
  return typeof window !== "undefined" ? window : null;
}

function transcriptToText(transcript) {
  if (Array.isArray(transcript)) {
    return transcript
      .map((turn) => {
        if (typeof turn === "string") return turn.trim();
        const speaker = turn?.speaker ? `${turn.speaker}: ` : "";
        return `${speaker}${turn?.text ?? turn?.message ?? turn?.content ?? ""}`.trim();
      })
      .filter(Boolean)
      .join("\n");
  }

  if (transcript && typeof transcript === "object") {
    return transcriptToText(transcript.transcript || transcript.text || transcript.message || transcript.content || "");
  }

  return typeof transcript === "string" ? transcript : "";
}

export function extractAnyAudioTranscript(responseJson) {
  return transcriptToText(
    responseJson?.data?.transcript ??
      responseJson?.data?.transcription ??
      responseJson?.data?.text ??
      responseJson?.data?.result ??
      responseJson?.payload?.transcript ??
      responseJson?.payload?.transcription ??
      responseJson?.payload?.text ??
      responseJson?.transcript ??
      responseJson?.transcription ??
      responseJson?.text ??
      responseJson?.result ??
      responseJson
  );
}

export async function transcribeAnyAudio({
  audioBlob,
  prompt = PRIVATE_NOTES_TRANSCRIPTION_PROMPT,
  timeoutMs = TRANSCRIBE_ANY_AUDIO_TIMEOUT_MS,
  signal,
} = {}) {
  if (!audioBlob?.size) {
    throw new Error("No audio recording found for transcription.");
  }

  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("audio", audioBlob, "audio.webm");

  const abortController = new AbortController();
  const timerApi = getTimerApi();
  const timeoutId = timerApi?.setTimeout(() => abortController.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => abortController.abort(), { once: true });
  }

  let response;
  try {
    response = await fetch(joinAgentModuleApiUrl(TRANSCRIBE_ANY_AUDIO_ENDPOINT), {
      method: "POST",
      headers: buildClinicalApiHeaders({ includeContentType: false }),
      body: formData,
      signal: abortController.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Audio transcription timed out after 120 seconds.");
    }
    throw error;
  } finally {
    timerApi?.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Audio transcription failed with ${response.status}. ${detail}`.trim());
  }

  const responseJson = await response.json();
  const transcript = extractAnyAudioTranscript(responseJson);
  if (!transcript.trim()) {
    throw new Error("Audio transcription API returned an empty transcript.");
  }

  return { transcript, rawResponse: responseJson };
}
