import React, { useState } from "react";
import styles from "./VoiceTranscriptCard.module.scss";
import { cn } from "../utils";

function formatDuration(ms) {
  if (!ms) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CurlyQuotedText({ raw }) {
  const cleaned = raw ? raw.replace(/^["']|["']$/g, "") : "";
  return (
    <p className={styles.transcriptText}>
      &ldquo;{cleaned}&rdquo;
    </p>
  );
}

export function VoiceTranscriptCard({ mode, transcript, durationMs, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const title = mode === "dictation_consultation"
    ? "Dictation Transcript"
    : "Conversation Transcript";

  return (
    <div className={styles.card}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className={styles.titleRow}>
          <svg className={styles.micIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4Z" fill="currentColor" />
            <path d="M19 10a7 7 0 0 1-14 0M12 17v4M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className={styles.title}>{title}</span>
          {durationMs > 0 && (
            <span className={styles.duration}>{formatDuration(durationMs)}</span>
          )}
        </span>
        <span className={cn(styles.chevron, expanded && styles.chevronOpen)} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {expanded && transcript && (
        <div className={styles.body}>
          <CurlyQuotedText raw={transcript} />
        </div>
      )}
    </div>
  );
}
