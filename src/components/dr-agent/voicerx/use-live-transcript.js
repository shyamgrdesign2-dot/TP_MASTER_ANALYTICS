import { useCallback, useEffect, useRef, useState } from "react";

export function useLiveTranscript({ enabled = false, paused = false, lang = "en-US" } = {}) {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(null);
  const [isSupported] = useState(() => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));
  const recognitionRef = useRef(null);
  const pausedRef = useRef(paused);
  const enabledRef = useRef(enabled);
  const restartAttemptsRef = useRef(0);
  const restartTimerRef = useRef(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
    restartAttemptsRef.current = 0;
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
  }, []);

  useEffect(() => {
    if (!isSupported || !enabled) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    restartAttemptsRef.current = 0;
    // After this many silent restarts with no result (Opera, non-Chrome Chromium),
    // give up and set error so the scripted fallback kicks in.
    const MAX_SILENT_RESTARTS = 3;

    const scheduleRestart = (rec) => {
      if (!enabledRef.current || pausedRef.current) return;
      const attempt = restartAttemptsRef.current;
      if (attempt >= MAX_SILENT_RESTARTS) {
        setError("service-not-available");
        return;
      }
      // exponential backoff: 0, 500, 1000, 2000, 4000, max 8000ms
      const delay = attempt === 0 ? 0 : Math.min(500 * Math.pow(2, attempt - 1), 8000);
      restartAttemptsRef.current += 1;
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (!enabledRef.current || pausedRef.current) return;
        try { rec.start(); } catch {}
      }, delay);
    };

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    recognitionRef.current = rec;

    rec.onresult = (e) => {
      if (pausedRef.current) return;
      restartAttemptsRef.current = 0; // reset backoff on successful result
      setError(null);
      let final = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript;
        }
      }
      setTranscript(final.trim());
      setInterim(interimText);
    };

    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      if (e.error !== "no-speech") {
        console.warn("SpeechRecognition error:", e.error);
        setError(e.error);
      }
    };

    rec.onend = () => {
      scheduleRestart(rec);
    };

    try { rec.start(); } catch {}

    return () => {
      enabledRef.current = false;
      if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [isSupported, enabled, lang]);

  return { transcript, interim, isSupported, reset, error };
}
