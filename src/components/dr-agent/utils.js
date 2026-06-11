const CONFLICT_GROUPS = [
  /^p-/, /^px-/, /^py-/, /^pt-/, /^pr-/, /^pb-/, /^pl-/, /^ps-/, /^pe-/,
  /^m-/, /^mx-/, /^my-/, /^mt-/, /^mr-/, /^mb-/, /^ml-/, /^ms-/, /^me-/,
  /^w-/, /^min-w-/, /^max-w-/, /^h-/, /^min-h-/, /^max-h-/,
  /^gap-/, /^gap-x-/, /^gap-y-/, /^space-x-/, /^space-y-/,
  /^top-/, /^right-/, /^bottom-/, /^left-/, /^inset-/, /^inset-x-/, /^inset-y-/,
  /^z-/, /^opacity-/,
  /^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents)$/,
  /^(static|fixed|absolute|relative|sticky)$/,
];

function classGroup(token) {
  for (const re of CONFLICT_GROUPS) {
    if (re.test(token)) return re.source;
  }
  return null;
}

function flatten(input, out) {
  if (input === null || input === undefined || input === false || input === true) return;
  if (typeof input === "string" || typeof input === "number") {
    out.push(String(input));
    return;
  }
  if (Array.isArray(input)) {
    for (const x of input) flatten(x, out);
    return;
  }
  if (typeof input === "object") {
    for (const key in input) {
      if (input[key]) out.push(key);
    }
  }
}

export function cn(...inputs) {
  const parts = [];
  flatten(inputs, parts);
  const tokens = parts.flatMap((s) => s.split(/\s+/)).filter(Boolean);
  const seen = new Map();
  const passthrough = [];
  for (const tok of tokens) {
    const group = classGroup(tok);
    if (group) {
      seen.set(group, tok);
    } else {
      passthrough.push(tok);
    }
  }
  return [...passthrough, ...seen.values()].join(" ");
}

export function safeClipboardWrite(text) {
  try {
    const result = navigator.clipboard?.writeText(text);
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {
    /* permission denied */
  }
}
