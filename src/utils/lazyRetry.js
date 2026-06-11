import {
  isChunkLoadError,
  shouldReloadForChunkFailure,
} from "./chunkReloadGuard";

export const lazyRetry = (importFn) =>
  new Promise((resolve, reject) => {
    importFn()
      .then((module) => {
        resolve(module);
      })
      .catch((error) => {
        const signature = `${error?.name || "Error"}:${error?.message || "unknown"}`;
        if (
          isChunkLoadError(signature) &&
          shouldReloadForChunkFailure(`lazy:${signature}`)
        ) {
          window.location.reload();
          reject(error);
          return;
        }

        reject(error);
      });
  });
