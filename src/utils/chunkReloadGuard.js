const CHUNK_RELOAD_STATE_KEY = "chunk-reload-state-v1";
const MAX_RELOAD_ATTEMPTS = 2;
const RELOAD_WINDOW_MS = 10 * 60 * 1000;
const SIGNATURE_DEDUPE_MS = 1500;

const now = () => Date.now();

const defaultState = () => ({
  attempts: 0,
  firstAttemptAt: 0,
  lastSignature: "",
  lastSignatureAt: 0,
});

const readState = () => {
  try {
    const raw = sessionStorage.getItem(CHUNK_RELOAD_STATE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      attempts: Number(parsed?.attempts) || 0,
      firstAttemptAt: Number(parsed?.firstAttemptAt) || 0,
      lastSignature: String(parsed?.lastSignature || ""),
      lastSignatureAt: Number(parsed?.lastSignatureAt) || 0,
    };
  } catch (_) {
    return defaultState();
  }
};

const writeState = (state) => {
  sessionStorage.setItem(CHUNK_RELOAD_STATE_KEY, JSON.stringify(state));
};

export const clearChunkReloadState = () => {
  sessionStorage.removeItem(CHUNK_RELOAD_STATE_KEY);
};

export const isChunkLoadError = (message = "") =>
  /ChunkLoadError|Loading chunk [^ ]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading CSS chunk|Unable to preload CSS/i.test(
    message
  );

export const shouldReloadForChunkFailure = (signature = "chunk_error") => {
  const ts = now();
  const state = readState();

  if (
    state.lastSignature &&
    state.lastSignature === signature &&
    ts - state.lastSignatureAt <= SIGNATURE_DEDUPE_MS
  ) {
    return false;
  }

  if (state.firstAttemptAt && ts - state.firstAttemptAt > RELOAD_WINDOW_MS) {
    writeState({
      attempts: 1,
      firstAttemptAt: ts,
      lastSignature: signature,
      lastSignatureAt: ts,
    });
    return true;
  }

  if (state.attempts >= MAX_RELOAD_ATTEMPTS) {
    return false;
  }

  writeState({
    attempts: state.attempts + 1,
    firstAttemptAt: state.firstAttemptAt || ts,
    lastSignature: signature,
    lastSignatureAt: ts,
  });

  return true;
};

export const getChunkReloadState = () => readState();
