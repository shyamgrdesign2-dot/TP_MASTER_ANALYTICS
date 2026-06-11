export function compactVoiceLines(text, maxLines = 3) {
  if (!text) return "";
  const lines = text.split("\n").filter(Boolean);
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join("\n") + "…";
}

export function formatVoiceSidebarItem(session) {
  const date = session.createdAt ? new Date(session.createdAt).toLocaleDateString() : "Unknown date";
  const mode = session.mode === "dictation_consultation" ? "Dictation" : "Conversation";
  return `${date} · ${mode}`;
}

export function buildVoiceConsultSidebarBatch(patientId, transcript, structured) {
  const batch = {};
  if (!structured) return batch;
  if (structured.sections?.length) {
    batch.voiceConsult = {
      patientId,
      timestamp: new Date().toISOString(),
      sections: structured.sections.map((s) => ({
        id: s.sectionId,
        title: s.title,
        items: s.items?.map((it) => it.detail ? `${it.name} — ${it.detail}` : it.name) ?? [],
      })),
    };
  }
  return batch;
}
