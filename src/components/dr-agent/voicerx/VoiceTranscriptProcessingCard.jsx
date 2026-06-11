/**
 * VoiceTranscriptProcessingCard — the card that takes over the Dr.Agent
 * chat surface immediately after the user submits a voice consultation.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ShineBorder } from "./ShineBorder";
import styles from "./VoiceTranscriptProcessingCard.module.scss";

const CAPTION_PHRASES = [
  "Analysing your dictated content",
  "Structuring your transcript",
  "Preparing entries for review"
];

// ─── Transcript renderer ─────────────────────────────────────────────────────

export function transcriptToText(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray(raw.transcript)
    ? raw.transcript
    : raw;
  if (Array.isArray(source)) {
    return source
      .map((turn) => {
        if (typeof turn === "string") return turn.trim();
        const speaker = turn?.speaker ? `${turn.speaker}: ` : "";
        return `${speaker}${turn?.text ?? ""}`.trim();
      })
      .filter(Boolean)
      .join("\n");
  }
  return typeof source === "string" ? source : "";
}

export function getDiarizedTurns(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray(raw.transcript)
    ? raw.transcript
    : raw;
  if (!Array.isArray(source)) return [];
  return source
    .map((turn) => {
      if (!turn || typeof turn !== "object") return null;
      const text = typeof turn.text === "string" ? turn.text.trim() : "";
      if (!text) return null;
      return {
        speaker: typeof turn.speaker === "string" && turn.speaker.trim() ? turn.speaker.trim() : "Speaker",
        text
      };
    })
    .filter(Boolean);
}

export function hasDiarizedTranscript(raw) {
  return getDiarizedTurns(raw).length > 0;
}

export function hasTranscriptContent(raw) {
  return transcriptToText(raw).trim().length > 0;
}

export function ConversationTranscript({ raw, shimmer = false, animate = shimmer }) {
  const turns = useMemo(() => getDiarizedTurns(raw), [raw]);
  const shouldRevealWords = shimmer && animate;
  return (
    <ul className={styles.conversationList}>
      {turns.map((t, i) => {
        const normalizedSpeaker = t.speaker.toLowerCase();
        const label = t.speaker.charAt(0).toUpperCase() + t.speaker.slice(1);
        return (
          <li
            key={i}
            className={[styles.turnRow, normalizedSpeaker === "doctor" ? styles.turnDoctor : styles.turnPatient].join(" ")}>
            <div
              className={[
                animate && "vrx-chat-turn",
                styles.turnBubble,
                normalizedSpeaker === "doctor" ? "vrx-chat-turn--doctor" : "vrx-chat-turn--patient",
                normalizedSpeaker === "doctor" ? styles.turnBubbleDoctor : styles.turnBubblePatient,
                animate && "vrx-chat-turn--in"
              ].filter(Boolean).join(" ")}
              style={animate ? { animationDelay: `${i * 180}ms` } : undefined}>
              <span className={styles.turnSpeaker}>{label}:</span>{" "}
              {shimmer ? (() => {
                const turnWords = t.text.split(/\s+/).filter(Boolean);
                return turnWords.map((word, wi) => (
                  <span key={wi} className={shouldRevealWords ? "da-shimmer-word" : undefined} style={shouldRevealWords ? { "--da-delay": `${i * 180 + wi * 70}ms` } : undefined}>{word}{wi < turnWords.length - 1 ? " " : ""}</span>
                ));
              })() : <span>{t.text}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DictationTranscript({ raw, animate = true }) {
  const cleaned = transcriptToText(raw).replace(/\n+/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  return (
    <p
      aria-label={cleaned}
      className={styles.dictationText}>
      <span aria-hidden="true" className={animate ? "da-shimmer-word vrx-dt-word--quote" : undefined} style={animate ? { "--da-delay": "0ms" } : undefined}>{`"`}</span>
      {words.map((word, i) => (
        <span key={`${i}-${word}`} aria-hidden="true">
          <span
            className={animate ? "da-shimmer-word" : undefined}
            style={animate ? { "--da-delay": `${(i + 1) * 70}ms` } : undefined}>
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
      <span
        aria-hidden="true"
        className={animate ? "da-shimmer-word" : undefined}
        style={animate ? { "--da-delay": `${(words.length + 1) * 70}ms` } : undefined}>
        {`"`}
      </span>
    </p>
  );
}

// ─── Caption carousel ────────────────────────────────────────────────────────

export function CaptionCarousel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % CAPTION_PHRASES.length), 2000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className={["vrx-caption-stage", styles.captionStage].join(" ")}>
      <span
        key={idx}
        className={["vrx-process-caption vrx-caption-slide", styles.captionShimmerSpan].join(" ")}>
        {CAPTION_PHRASES[idx]}…
      </span>
    </div>
  );
}

// ─── Internal Tabs ────────────────────────────────────────────────────────────

function Tabs({ active, onChange }) {
  const TABS = [
    { id: "tp_emr", label: "TP EMR" },
    { id: "clinical_notes", label: "Clinical Notes" },
    { id: "transcript", label: "Transcript" }
  ];

  return (
    <div className={[styles.tabsStrip, styles.tabsScrollbar].join(" ")}>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={[
            styles.tabBtn,
            active === t.id ? styles.tabBtnActive : styles.tabBtnInactive
          ].join(" ")}>
          {t.label}
          {active === t.id ? <span className={styles.tabActiveBar} /> : null}
        </button>
      ))}
    </div>
  );
}

// ─── Public component ────────────────────────────────────────────────────────

export function VoiceTranscriptProcessingCard({
  mode,
  transcript,
  structuringMs = 3000,
  totalMs = 10000,
  tpEmrSlot,
  clinicalNotesSlot,
  transcriptPending = false,
  onComplete
}) {
  const [phase] = useState("structuring");
  const [activeTab, setActiveTab] = useState("tp_emr");

  useEffect(() => {
    const t = window.setTimeout(() => {
      onComplete?.();
    }, totalMs - structuringMs);
    return () => window.clearTimeout(t);
  }, [structuringMs, totalMs, onComplete]);

  const isAmbient = mode === "ambient_consultation";
  const isDiarized = hasDiarizedTranscript(transcript);

  const transcriptScrollRef = useRef(null);
  useEffect(() => {
    if (phase !== "structuring") return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = transcriptScrollRef.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();
    let pausedUntil = 0;
    const PX_PER_SEC = 24;

    const tick = (now) => {
      if (now < pausedUntil) {
        last = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = (now - last) / 1000;
      last = now;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 8) {
        const next = el.scrollTop + PX_PER_SEC * dt;
        if (next >= max) {
          el.scrollTop = max;
          pausedUntil = now + 1400;
          window.setTimeout(() => {
            transcriptScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          }, 1400);
        } else {
          el.scrollTop = next;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <div className={[styles.cardContainer, "flex w-full min-h-0 flex-col gap-[10px]"].join(" ")}>
      <div className={["vrx-shiner-enter relative flex w-full min-h-0 flex-1 flex-col overflow-hidden rounded-[16px]", styles.shinerCard].join(" ")}>
        <ShineBorder
          variant="rotate"
          borderWidth={1.5}
          duration={2.2}
          shineColor={["#D565EA", "#673AAC", "#1A1994"]}
          baseColor="rgba(226,226,234,0.95)" />

        {phase === "structuring" ? (
          <div
            ref={transcriptScrollRef}
            className={styles.shinerBody}>
            {transcriptPending ? (
              <div className={styles.creatingTranscript}>Refining your captured consultation...</div>
            ) : isDiarized ? (
              <ConversationTranscript raw={transcript} shimmer />
            ) : (
              <DictationTranscript raw={transcript} />
            )}
          </div>
        ) : (
          <div className={[styles.tabsBody, "relative flex flex-col"].join(" ")}>
            <Tabs active={activeTab} onChange={setActiveTab} />
            <div className={styles.tabContent}>
              {activeTab === "tp_emr" ?
                tpEmrSlot ?? (
                  <div className={styles.tabPlaceholder}>TP EMR view will land here.</div>
                ) : null}
              {activeTab === "clinical_notes" ?
                clinicalNotesSlot ?? (
                  <div className={styles.tabPlaceholder}>Clinical notes will land here.</div>
                ) : null}
              {activeTab === "transcript" ? (
                <div className={styles.tabTranscriptWrap}>
                  <h3 className={styles.tabTranscriptHeading}>
                    {isAmbient ? "Conversational Transcript" : "Dictated Transcript"}
                  </h3>
                  <div className={styles.tabTranscriptInner}>
                    {isDiarized ? (
                      <ConversationTranscript raw={transcript} />
                    ) : (
                      <DictationTranscript raw={transcript} animate={false} />
                    )}
                  </div>
                  <div className={styles.transcriptFooter}>
                    <div className={styles.transcriptFooterLeft}>
                      <button type="button" className={styles.transcriptFooterBtn}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m7.48 18.35 3.1 2.4c.4.4 1.3.6 1.9.6h3.8c1.2 0 2.5-.9 2.8-2.1l2.4-7.3c.5-1.4-.4-2.6-1.9-2.6h-4c-.6 0-1.1-.5-1-1.2l.5-3.2c.2-.9-.4-1.9-1.3-2.2-.8-.3-1.8.1-2.2.7l-4.1 6.1" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10"></path><path d="M2.38 18.35v-9.8c0-1.4.6-1.9 2-1.9h1c1.4 0 2 .5 2 1.9v9.8c0 1.4-.6 1.9-2 1.9h-1c-1.4 0-2-.5-2-1.9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                      </button>
                      <button type="button" className={styles.transcriptFooterBtn}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m16.52 5.65-3.1-2.4c-.4-.4-1.3-.6-1.9-.6h-3.8c-1.2 0-2.5.9-2.8 2.1l-2.4 7.3c-.5 1.4.4 2.6 1.9 2.6h4c.6 0 1.1.5 1 1.2l-.5 3.2c-.2.9.4 1.9 1.3 2.2.8.3 1.8-.1 2.2-.7l4.1-6.1" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10"></path><path d="M21.62 5.65v9.8c0 1.4-.6 1.9-2 1.9h-1c-1.4 0-2-.5-2-1.9v-9.8c0-1.4.6-1.9 2-1.9h1c1.4 0 2 .5 2 1.9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                      </button>
                    </div>
                    <div className={styles.transcriptDivider} />
                    <span className={styles.audioQualityLabel}>Audio Quality: <span className={styles.audioQualityValue}>Good</span></span>
                    <div className={styles.transcriptDivider} />
                    <button type="button" className={styles.downloadBtn} aria-label="Download transcript">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      <span className={styles.downloadLabel}>Download</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
