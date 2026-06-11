// Shared helper: when an asset is a URL to a JSON file (CDN or /public),
// consumers must fetch+parse it before using it (e.g. lottie-react animationData).

const jsonCache = new Map();

export function loadJsonAsset(url) {
  if (!url) return Promise.reject(new Error("Missing JSON asset url"));

  if (!jsonCache.has(url)) {
    jsonCache.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load JSON (${res.status}) from ${url}`);
        }
        return res.json();
      })
    );
  }

  return jsonCache.get(url);
}

