import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn, safeClipboardWrite } from "../../../utils";
import styles from "./ChatBubble.module.scss";
import { useTouchDevice } from "../../../hooks/use-touch-device";

import { CardRenderer } from "../cards/CardRenderer";
import { FeedbackRow } from "../cards/FeedbackRow";
import { CopyIcon } from "../cards/CopyIcon";
import { AiBrandSparkIcon } from "../../../shared/AiBrandSparkIcon";
import { Edit2, DocumentText1 } from "iconsax-reactjs";
import { DocumentAttachmentBubble } from "./DocumentAttachmentBubble";
import { DataCompletenessDonut } from "../cards/DataCompletenessDonut";
import { isSituationAtGlanceAssistantMessage } from "../shared/isSituationAtGlanceMessage";
import { VoiceTranscriptCard } from "../../../voicerx/VoiceTranscriptCard";
import { VoiceRxIcon } from "../../../voicerx/voice-consult-icons";
import { HoverTooltip } from "../../../atoms/Tooltip";

/**
 * Derive data completeness from card kind — used for completeness ring.
 * Only shown for cards where completeness is meaningful:
 * - POMR problem cards (have actual completeness data)
 * - Document extraction (OCR) — mix of AI extraction vs missing
 * - SBAR — mix of EMR + AI assessment
 * NOT shown for: patient summaries, labs, vitals, med history (pure EMR),
 * DDX/protocol meds (pure AI), symptom collector (patient-reported), etc.
 */
function getCompletenessForOutput(output) {
  if (!output) return null;
  // POMR cards have their own completeness data
  if (output.kind === "pomr_problem_card") {
    const d = output.data;
    return { emr: d.completeness.emr, ai: d.completeness.ai, missing: d.completeness.missing };
  }
  switch (output.kind) {
    // Document extraction — meaningful: shows how much was extracted vs missing
    case "ocr_extraction":
    case "ocr_pathology":
      return { emr: 0, ai: 90, missing: 10 };
    // SBAR — meaningful: mix of EMR data + AI clinical assessment
    case "sbar_critical":
      return { emr: 70, ai: 20, missing: 10 };
    // Everything else — no completeness ring (only source tag)
    default:
      return null;
  }
}

/**
 * Derive provenance-focused source references from card output data.
 * Each entry answers "WHERE did this data come from?" — the origin, not the count.
 *
 * Provenance types:
 * - EMR historical records (past visits, demographics, chronic conditions)
 * - Uploaded documents (lab PDFs, prescriptions, discharge summaries)
 * - AI extraction (from uploaded/scanned documents)
 * - Patient-reported (symptom collector intake)
 * - Clinical protocols (guidelines, treatment standards)
 */
function getSourcesForOutput(output, documents) {
  if (!output) return null;

  /** Helper: readable doc name from fileName */
  const docName = (doc) =>
    doc.fileName.replace(/_/g, " ").replace(/\.pdf$/i, "").replace(/\.jpg$/i, "");

  switch (output.kind) {
    case "patient_summary":
    case "patient_narrative": {
      const d = output.data;
      const entries = [{ label: "EMR", description: "Patient's clinical data" }];

      if (d.keyLabs?.length) {
        const prov = d.dataProvenance;
        if (prov) {
          const emrLabs = d.keyLabs.filter((l) => prov[l.name]?.source === "emr");
          if (emrLabs.length > 0) {
            entries.push({ label: "Lab Results", description: `${emrLabs.length} lab results` });
          }
          const extractedLabs = d.keyLabs.filter((l) => prov[l.name]?.source === "ai_extracted");
          if (extractedLabs.length > 0) {
            const sources = new Set(extractedLabs.map((l) => prov[l.name].extractedFrom).filter(Boolean));
            entries.push({ label: "Records", description: `${sources.size} uploaded record${sources.size > 1 ? "s" : ""} (${sources.size > 1 ? "multiple dates" : "1 date"})` });
          }
        } else {
          const uploadedDocs = documents?.filter((doc) =>
            ["pathology", "radiology", "discharge_summary", "prescription", "other"].includes(doc.docType)
          ) || [];
          if (uploadedDocs.length > 0) {
            const uniqueDates = new Set(uploadedDocs.map((doc) => doc.uploadedAt)).size;
            entries.push({ label: "Records", description: `${uploadedDocs.length} uploaded record${uploadedDocs.length > 1 ? "s" : ""} (${uniqueDates > 1 ? `${uniqueDates} dates` : uploadedDocs[0].uploadedAt})` });
          } else {
            entries.push({ label: "Lab Results", description: `${d.keyLabs.length} lab results` });
          }
        }
      }

      if (d.lastVisit) {
        entries.push({ label: "Past Visits", description: `Consultation (${d.lastVisit.date})` });
      }
      if (d.symptomCollectorData) {
        entries.push({ label: "Symptom Collector", description: `Patient's reported data (${d.symptomCollectorData.reportedAt})` });
      }
      return entries;
    }

    case "symptom_collector":
      return [{ label: "Symptom Collector", description: `Patient's reported data (${output.data.reportedAt || "today"})` }];

    case "last_visit":
      return [{ label: "Past Visits", description: `Last consultation (${output.data?.visitDate || "recent"})` }];

    case "lab_panel": {
      const d = output.data;
      const labDocs = documents?.filter((doc) => doc.docType === "pathology") || [];
      const match = d?.panelDate ? labDocs.find((doc) => doc.uploadedAt === d.panelDate) : labDocs[0];
      return [{ label: match ? "Records" : "Lab Results", description: match ? `Uploaded report (${match.uploadedAt})` : `EMR lab results${d?.panelDate ? ` (${d.panelDate})` : ""}` }];
    }

    case "lab_trend": {
      const dates = [...new Set((output.data?.series || []).flatMap((s) => s.dates || []).map((d) => d.trim()))];
      const dateStr = dates.length > 1 ? `${dates.length} dates` : dates[0] || "";
      return [{ label: "Lab Results", description: `${output.data?.series?.length || 0} parameters${dateStr ? ` (${dateStr})` : ""}` }];
    }

    case "lab_comparison":
      return [{ label: "Lab Results", description: `${output.data.rows?.length || 0} parameters compared` }];

    case "vitals_trend_bar":
    case "vitals_trend_line": {
      const series = output.data?.series || [];
      const dates = [...new Set(series.flatMap((s) => s.dates || []).map((d) => d.trim()))];
      const dateStr = dates.length > 1 ? `${dates.length} dates` : dates[0] || "";
      return [{ label: "Vitals", description: `${series.map((s) => s.label).join(", ")}${dateStr ? ` (${dateStr})` : ""}` }];
    }

    case "med_history":
      return [{ label: "History", description: "Medication history" }];

    case "ddx":
      return [
        { label: "Context", description: output.data.context || "Patient's symptoms & history" },
        { label: "Protocol", description: "Clinical DDx guidelines" },
      ];

    case "protocol_meds":
      return [
        { label: "Context", description: output.data.diagnosis },
        { label: "Protocol", description: "Treatment protocols" },
      ];

    case "investigation_bundle":
      return [
        { label: "Context", description: "Patient's conditions & history" },
        { label: "Protocol", description: "Investigation guidelines" },
      ];

    case "follow_up":
      return [
        { label: "Context", description: output.data.context || "Current conditions & treatment" },
        { label: "Protocol", description: "Follow-up guidelines" },
      ];

    case "advice_bundle":
      return [{ label: "Protocol", description: "Clinical care & lifestyle guidelines" }];

    case "obstetric_summary":
      return [{ label: "Obstetric", description: `ANC records${output.data.gestationalWeeks ? ` — ${output.data.gestationalWeeks}` : ""}` }];

    case "gynec_summary":
      return [{ label: "Gynec", description: "Gynaecology history & records" }];

    case "ophthal_summary":
      return [{ label: "Ophthal", description: "Ophthalmology records" }];

    case "pediatric_summary":
      return [{ label: "Growth", description: "Pediatric growth & development records" }];

    case "pomr_problem_card": {
      const d = output.data;
      const entries = [{ label: "History", description: `${d.problem} clinical data` }];
      if (d.labs?.length) entries.push({ label: "Lab Results", description: `${d.labs.length} results` });
      if (d.sourceEntries?.some((se) => se.type === "uploaded")) entries.push({ label: "Records", description: "Uploaded records" });
      return entries;
    }

    case "sbar_critical":
      return [
        { label: "History", description: "Clinical history & vitals" },
        { label: "AI", description: "AI clinical assessment" },
      ];

    case "ocr_pathology":
      return [{ label: "Records", description: "Uploaded report" }];

    case "ocr_extraction":
      return [{ label: "Records", description: "Uploaded document" }];

    case "drug_interaction":
      return [{ label: "History", description: "Active medications" }, { label: "Protocol", description: "Drug interaction check" }];

    case "allergy_conflict":
      return [{ label: "History", description: "Allergy records" }, { label: "Protocol", description: "Allergen contraindication check" }];

    case "translation":
      return [{ label: "Context", description: "Current consultation content" }];

    case "completeness":
      return [{ label: "EMR", description: "Current visit completeness check" }];

    case "text_fact":
      return [{ label: output.data.source ? "Reference" : "Context", description: output.data.source || "Patient's clinical context" }];

    case "text_alert":
      return [{ label: "AI", description: "Current clinical data & visit context" }];

    case "text_list":
      return [{ label: "Context", description: "Clinical history & current visit" }];

    case "voice_structured_rx":
      return [{ label: "Voice", description: "Doctor's voice input" }, { label: "Protocol", description: "Prescription format" }];

    case "referral":
      return [{ label: "History", description: "Clinical records & diagnosis" }, { label: "Context", description: "Current consultation" }];

    case "vaccination_schedule":
      return [{ label: "Vaccine", description: "Immunisation records" }, { label: "Protocol", description: "Immunisation schedule" }];

    case "follow_up_question":
      return [{ label: "AI", description: "Conversation context" }];

    case "patient_list":
    case "follow_up_list":
    case "due_patients":
      return [{ label: "EMR", description: "Clinic records" }];

    case "revenue_bar":
    case "revenue_comparison":
    case "analytics_table":
    case "line_graph":
    case "donut_chart":
    case "pie_chart":
    case "condition_bar":
    case "heatmap":
    case "follow_up_rate":
      return [{ label: "EMR", description: "Clinic analytics" }];

    case "bulk_action":
      return [{ label: "EMR", description: "Patient communication records" }];

    case "welcome_card":
    case "external_cta":
    case "patient_search":
      return null;

    default:
      return [{ label: "AI", description: "Patient & clinical data" }];
  }
}

/** Short badge text for each source type — maps to sidebar section names */
function getSourceTag(label) {
  const TAG_MAP = {
    "EMR": "EMR", "Lab Results": "Lab Results", "Records": "Records",
    "Past Visits": "Past Visits", "History": "History", "Vitals": "Vitals",
    "Obstetric": "Obstetric", "Gynec": "Gynec", "Ophthal": "Ophthal",
    "Growth": "Growth", "Vaccine": "Vaccine",
    "Symptom Collector": "Symptom Collector", "Receptionist Agent": "Receptionist Agent",
    "AI": "AI", "Context": "Context", "Protocol": "Protocol",
    "Rx": "Rx", "Voice": "Voice", "Reference": "Reference",
  };
  return TAG_MAP[label] || label;
}

/**
 * Portal-based tooltip with arrow — shared by SourceTag and DataCompletenessDonut.
 * Renders above the trigger, arrow points to center of trigger, viewport-aware.
 */
function PortalTooltip({
  isVisible,
  triggerRef,
  children,
  width = 240,
  onMouseEnter,
  onMouseLeave,
}) {
  const tooltipRef = useRef(null);
  const [pos, setPos] = useState(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipH = tooltipEl.offsetHeight;
    const MARGIN = 8;
    const GAP = 8;

    // Center tooltip horizontally on trigger
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    let left = triggerCenterX - width / 2;

    // Clamp to viewport
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN));

    // Arrow points at trigger center
    const arrowLeft = Math.max(12, Math.min(triggerCenterX - left, width - 12));

    // Position above trigger
    const top = triggerRect.top - GAP - tooltipH;

    setPos({ top, left, arrowLeft });
  }, [triggerRef, width]);

  useEffect(() => {
    if (!isVisible) { setPos(null); return; }
    requestAnimationFrame(updatePosition);
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (!isVisible) return;
    const reposition = () => requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isVisible, updatePosition]);

  if (!isVisible || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className={styles.portalTooltip}
      style={
        pos
          ? { top: pos.top, left: pos.left, width, opacity: 1, transition: "opacity 100ms ease-out" }
          : { top: -9999, left: -9999, width, opacity: 0 }
      }
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={cn(styles.tooltipCard)}>
        {children}
      </div>
      {/* Downward arrow — paddingLeft is dynamic (pos.arrowLeft - 5), kept inline */}
      {pos && (
        <div style={{ paddingLeft: pos.arrowLeft - 5 }}>
          <div className={styles.tooltipArrow} />
        </div>
      )}
    </div>,
    document.body
  );
}

/** Dot color for each source type — subtle, meaningful differentiation */
function getDotColor(label) {
  switch (label) {
    case "EMR": return "#7C3AED"; // violet — primary clinical data
    case "Lab Results": return "#3C3BB5"; // blue — lab/diagnostic
    case "Records": return "#D97706"; // amber — uploaded documents
    case "Past Visits": return "#059669"; // green — visit history
    case "Symptom Collector":
    case "Receptionist Agent": return "#DB2777"; // pink — patient-reported
    case "Vitals": return "#0891B2"; // teal — vitals
    case "History": return "#7C3AED"; // violet — clinical history
    case "Obstetric":
    case "Gynec":
    case "Ophthal":
    case "Growth":
    case "Vaccine": return "#7C3AED"; // violet — specialty sections
    case "AI": return "#4F46E5"; // indigo — AI-generated
    case "Protocol": return "#475569"; // slate — guidelines
    case "Context": return "#475569"; // slate — context
    default: return "#64748B"; // neutral
  }
}

/**
 * Source provenance — click-to-open dropdown below the Source button.
 * Uses portal for proper layering. Positioned directly below the trigger.
 * Shows WHERE data was fetched from — trust signal for doctors.
 */
function SourceDropdown({ isOpen, onToggle, sources }) {
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState(null);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);

  // Hover handlers — show on hover after short delay, hide with grace period
  const hoverShow = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isOpen) return;
    showTimer.current = setTimeout(() => onToggle(), 200);
  }, [isOpen, onToggle]);

  const hoverHide = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isOpen) onToggle();
    }, 250);
  }, [isOpen, onToggle]);

  const keepOpen = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (showTimer.current) clearTimeout(showTimer.current);
  }, []);

  useEffect(() => () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  // Position dropdown — above or below depending on viewport space
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownH = dropdownRef.current.offsetHeight;
    const dropdownWidth = 280;
    const GAP = 4;
    const MARGIN = 8;

    // Open above if not enough room below
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < dropdownH + GAP + MARGIN;

    const top = openAbove ? rect.top - dropdownH - GAP : rect.bottom + GAP;

    // Clamp left to stay in viewport
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - MARGIN) {
      left = window.innerWidth - dropdownWidth - MARGIN;
    }
    if (left < MARGIN) left = MARGIN;

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const reposition = () => requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) return;
      onToggle();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onToggle]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        onMouseEnter={hoverShow}
        onMouseLeave={hoverHide}
        className={cn(styles.sourceBtn, isOpen ? styles.sourceBtnOpen : styles.sourceBtnClosed)}
        aria-label="View data sources"
        aria-expanded={isOpen}
      >
        <DocumentText1 size={13} variant="Linear" />
        <span className={styles.sourceBtnLabel}>Source</span>
      </button>

      {/* Portal dropdown */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          className={cn(styles.sourceDropdown)}
          onMouseEnter={keepOpen}
          onMouseLeave={hoverHide}
          style={{
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
          }}
        >
          {/* Header — dynamic source count */}
          <div className={cn(styles.sourceDropdownHeader)}>
            <DocumentText1 size={12} variant="Bold" className={styles.sourceDropdownHeaderIcon} />
            <p className={styles.sourceDropdownHeaderText}>
              Compiled from {sources.length} source{sources.length > 1 ? "s" : ""}
            </p>
          </div>

          {/* Source entries — colored dot + label + description */}
          <div className={styles.sourceDropdownBody}>
            {sources.map((src, i) => {
              const dotColor = getDotColor(src.label);
              const tag = getSourceTag(src.label);
              return (
                <div key={i} className={styles.sourceEntry}>
                  {/* Colored dot */}
                  <span
                    className={styles.sourceDot}
                    style={{ backgroundColor: dotColor }}
                  />
                  <div className={styles.sourceEntryContent}>
                    <p className={styles.sourceEntryText}>
                      <span className={styles.sourceEntryLabel}>{tag}</span>
                      <span className={styles.sourceEntryMiddot}>&middot;</span>
                      <span className={styles.sourceEntryDesc}>{src.description}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/** Convert light markdown (bold + links) into rich text. */
function renderAssistantMarkdown(text, onPillTap) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={i} className={styles.mdBold}>{token.slice(2, -2)}</strong>;
    }

    if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (!match) return <span key={i}>{token}</span>;
      const [, label, href] = match;

      if (href.startsWith("action:")) {
        const actionLabel = decodeURIComponent(href.slice("action:".length));
        return (
          <button
            key={i}
            type="button"
            onClick={() => onPillTap?.(actionLabel || label)}
            className={styles.mdActionLink}
          >
            {label}
          </button>
        );
      }

      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noreferrer"
          className={styles.mdLink}
        >
          {label}
        </a>
      );
    }

    return <span key={i}>{token}</span>;
  });
}

// -----------------------------------------------------------------
// ChatBubble
//
// ASSISTANT layout:
//   [AI Spark 20px]  Text content (plain, no bubble)
//                    Card output (standalone, not inside a bubble)
//                    thumbs-up  thumbs-down
//
// USER layout:
//   Right-aligned bubble with rounded corners
// -----------------------------------------------------------------

function formatTime(iso) {
  try {
    const d = new Date(iso);
    let hours = d.getHours();
    const mm = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${mm} ${ampm}`;
  } catch {
    return "";
  }
}

/**
 * Typewriter hook — reveals text character by character for a streaming feel.
 * Only runs once when the component first mounts with text; subsequent renders
 * show the full text immediately.
 */
function useTypewriter(text, shouldAnimate, speed = 18) {
  const [charIndex, setCharIndex] = useState(shouldAnimate ? 0 : text.length);
  const isDone = charIndex >= text.length;

  useEffect(() => {
    if (!shouldAnimate || charIndex >= text.length) return;
    const t = setTimeout(() => setCharIndex((i) => Math.min(i + 1, text.length)), speed);
    return () => clearTimeout(t);
  }, [charIndex, text.length, shouldAnimate, speed]);

  return { displayText: text.slice(0, charIndex), isDone };
}

export function ChatBubble({
  message,
  isStale = false,
  onFeedback,
  onPillTap,
  onCopy,
  onSidebarNav,
  activeSpecialty,
  patientDocuments,
  onPatientSelect,
  onEditMessage,
}) {
  const isTouch = useTouchDevice();
  const isUser = message.role === "user";
  const timestamp = useMemo(() => formatTime(message.createdAt), [message.createdAt]);
  const [sourceOpen, setSourceOpen] = useState(false);

  // ── Edit state — must be before any conditionals (hooks rule) ──
  const [isEditing, setIsEditing] = useState(false);
  const userDisplayText = message.voiceTranscript ?? message.text;
  const [editText, setEditText] = useState(userDisplayText);
  const editRef = useRef(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = "auto";
      editRef.current.style.height = editRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== userDisplayText && onEditMessage) {
      onEditMessage(message.id, trimmed);
    }
    setIsEditing(false);
  }, [editText, userDisplayText, message.id, onEditMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditText(userDisplayText);
    setIsEditing(false);
  }, [userDisplayText]);

  const handleVoiceRxEdit = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("voicerx:begin-addon"));
  }, []);

  // ── Track whether this is a "new" message (just appeared) for streaming/shimmer ──
  const [shimmerActive, setShimmerActive] = useState(() => !isUser && !!message.text && !!message.shimmerReveal);
  const [streamActive, setStreamActive] = useState(() => !isUser && !!message.text && !message.shimmerReveal);
  const shouldShimmer = shimmerActive;
  const shouldStream = streamActive;

  useEffect(() => {
    if (shimmerActive) {
      const words = (message.text || "").split(/\s+/).length;
      const total = words * 70 + 700;
      const t = setTimeout(() => setShimmerActive(false), total);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Typewriter for assistant text (skipped when shimmerReveal) ──
  const { displayText, isDone: textDone } = useTypewriter(
    message.text || "",
    shouldStream,
    16 // ~60 chars/sec
  );

  // ── Phased card reveal: card fades in after text finishes streaming/shimmering ──
  const [cardRevealed, setCardRevealed] = useState(false);
  const hasCard = !!message.rxOutput;

  useEffect(() => {
    if (!hasCard || isUser) { setCardRevealed(true); return; }
    if (shouldStream && !textDone) return;
    if (shouldShimmer) {
      const words = (message.text || "").split(/\s+/).length;
      const shimmerDuration = words * 70 + 600 + 200;
      const t = setTimeout(() => setCardRevealed(true), shimmerDuration);
      return () => clearTimeout(t);
    }
    const delay = message.text ? 150 : 80;
    const t = setTimeout(() => setCardRevealed(true), delay);
    return () => clearTimeout(t);
  }, [hasCard, isUser, message.text, shouldStream, shouldShimmer, textDone]);

  const feedbackRevealed = !hasCard || isUser || cardRevealed;

  // ---- USER bubble ----
  if (isUser) {
    return (
      <div className={styles.userMsgRoot}>
        {isEditing ? (
          /* ── Edit mode — full-width within chat area ── */
          <div className={cn(styles.editContainer)}>
            <textarea
              ref={editRef}
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancelEdit();
              }}
              className={styles.editTextarea}
              rows={1}
            />
            <div className={styles.editActions}>
              <div className={styles.editActionBtns}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className={styles.editCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editText.trim() || editText.trim() === userDisplayText}
                  className={cn(styles.editSendBtn)}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.userMsgOuter}>
            <div className={styles.userMsgInner}>
              {/* Attachment card (PDF) — shown above text bubble */}
              {message.attachment && (
                <div className={styles.attachmentWrapper}>
                  <DocumentAttachmentBubble attachment={message.attachment} />
                </div>
              )}

              {message.voiceTranscript ? (
                <VoiceTranscriptCard
                  mode={message.voiceMode}
                  transcript={message.voiceTranscript}
                  durationMs={message.voiceDurationMs}
                  className={styles.voiceTranscriptCard}
                />
              ) : message.text ? (
                <div className={styles.userTextBubble}>
                  <p className={styles.userTextContent}>{message.text}</p>
                </div>
              ) : null}

              {/* Hover action icons */}
              {(message.text || message.voiceTranscript) && (
                <div className={cn(styles.userHoverActions, isTouch ? styles.userHoverActionsTouch : styles.userHoverActionsHover)}>
                  <CopyIcon
                    onClick={() => safeClipboardWrite(userDisplayText)}
                    className={styles.copyIconUser}
                  />
                  {/* {onEditMessage && (
                    <HoverTooltip content={message.voiceTranscript ? "Edit/VoiceRx" : "Edit message"} side="top">
                      <button
                        type="button"
                        onClick={
                          message.voiceTranscript
                            ? handleVoiceRxEdit
                            : () => { setEditText(userDisplayText); setIsEditing(true); }
                        }
                        className={styles.editIconBtn}
                        aria-label={message.voiceTranscript ? "Edit/VoiceRx" : "Edit message"}
                      >
                        {message.voiceTranscript ? (
                          <VoiceRxIcon size={14} color="currentColor" />
                        ) : (
                          <Edit2 size={14} variant="Linear" />
                        )}
                      </button>
                    </HoverTooltip>
                  )} */}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- ASSISTANT layout ----
  return (
    <div className={styles.assistantMsgRoot}>
      <div className={styles.assistantMsgInner}>
        {/* Top row: AI icon + text (typewriter reveal for new messages) */}
        {message.text && (
          <div className={styles.assistantTextRow}>
            {/* Bigger spark-only icon — no background rectangle per world-class spec */}
            <AiBrandSparkIcon size={22} className={styles.assistantSparkIcon} />

            {/* Plain text with streaming reveal or shimmer word-by-word */}
            <p className={styles.assistantText}>
              {shouldShimmer
                ? (() => {
                    let wordIdx = 0;
                    return message.text.split(/(\n)/).map((line, li) => {
                      if (line === "\n") return <br key={`br-${li}`} />;
                      return line.split(/(\*\*[^*]+\*\*|\s+)/).filter(Boolean).map((token, ti) => {
                        if (/^\s+$/.test(token)) {
                          return (
                            <span
                              key={`${li}-${ti}`}
                              className="da-shimmer-word"
                              style={{ "--da-delay": `${wordIdx * 70}ms` }}
                            >
                              {token}
                            </span>
                          );
                        }
                        const isBold = /^\*\*(.+)\*\*$/.test(token);
                        const text = isBold ? token.slice(2, -2) : token;
                        const delay = wordIdx * 70;
                        wordIdx++;
                        return isBold ? (
                          <strong
                            key={`${li}-${ti}`}
                            className={cn("da-shimmer-word", styles.mdBold)}
                            style={{ "--da-delay": `${delay}ms` }}
                          >
                            {text}
                          </strong>
                        ) : (
                          <span
                            key={`${li}-${ti}`}
                            className="da-shimmer-word"
                            style={{ "--da-delay": `${delay}ms` }}
                          >
                            {text}
                          </span>
                        );
                      });
                    });
                  })()
                : (
                  <>
                    {renderAssistantMarkdown(shouldStream ? displayText : message.text, onPillTap)}
                    {shouldStream && !textDone && (
                      <span className={styles.streamCursor} />
                    )}
                  </>
                )
              }
            </p>
          </div>
        )}

        {/* If there is no text but we have a card, still show the icon row */}
        {!message.text && message.rxOutput && (
          <div className={styles.assistantTextRow}>
            {/* Bigger spark-only icon — no background rectangle per world-class spec */}
            <AiBrandSparkIcon size={22} className={styles.assistantSparkIcon} />
          </div>
        )}

        {/* Card output -- offset to align under text (24px icon + 6px gap) */}
        {/* Phased reveal: card slides in after text finishes streaming */}
        {message.rxOutput && (
          <div
            className={cn(
              styles.cardWrapper,
              cardRevealed ? styles.cardRevealed : styles.cardHidden
            )}
          >
            <CardRenderer
              output={message.rxOutput}
              isStale={isStale}
              onPillTap={onPillTap}
              onCopy={onCopy}
              onSidebarNav={onSidebarNav}
              activeSpecialty={activeSpecialty}
              onPatientSelect={onPatientSelect}
            />
          </div>
        )}

        {/* Feedback row — thumbs up/down + source provenance.
             Suppressed entirely when `message.hideFeedback` is true (used
             for short conversational nudges that aren't real responses). */}
        {!message.hideFeedback && (
          <div
            className={cn(
              styles.feedbackRow,
              feedbackRevealed ? styles.feedbackRevealed : styles.feedbackHidden
            )}
          >
            {onFeedback ? (
              <FeedbackRow
                messageId={message.id}
                initialFeedback={message.feedbackGiven}
                onFeedback={onFeedback}
              />
            ) : null}

            {/* Completeness ring + divider + source tag */}
            {(() => {
              const output = message.rxOutput;
              if (!output) return null;

              const completeness = getCompletenessForOutput(output);
              const sources = getSourcesForOutput(output, patientDocuments);

              return (
                <>
                  {/* Completeness ring */}
                  {completeness && (
                    <>
                      <div className={cn(styles.dividerLine)} />
                      <DataCompletenessDonut
                        emr={completeness.emr}
                        ai={completeness.ai}
                        missing={completeness.missing}
                        size="sm"
                      />
                    </>
                  )}

                  {/* Source dropdown */}
                  {sources && (
                    <>
                      <div className={cn(styles.dividerLine)} />
                      <SourceDropdown
                        isOpen={sourceOpen}
                        onToggle={() => setSourceOpen((v) => !v)}
                        sources={sources}
                      />
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Canned shortcuts — below feedback/source, not part of the message chrome */}
        {isSituationAtGlanceAssistantMessage(message) &&
          message.suggestions &&
          message.suggestions.length > 0 && (
            <div className={styles.suggestionsWrapper}>
              <div className={cn("da-suggestion-scroll", styles.suggestionScroll)}>
                {message.suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onPillTap?.(s.message)}
                    className={cn(styles.suggestionPill)}
                  >
                    <span className={styles.suggestionPillText}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
