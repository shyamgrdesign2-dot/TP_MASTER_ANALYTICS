function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emrSectionsToHtml(sections) {
  return sections
    .map((s) => {
      const items = s.items.length
        ? `<ul>${s.items.map((i) => {
          const text = typeof i === "string"
            ? i
            : (i?.detail ? `${i.name} (${i.detail})` : i?.name);
          return `<li>${escapeHtml(text || "")}</li>`;
        }).join("")}</ul>`
        : `<p>—</p>`;
      return `<h3>${escapeHtml(s.title)}</h3>${items}`;
    })
    .join("");
}
