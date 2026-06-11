import { useEffect, useMemo, useState } from "react";
import { Download as DownloadIcon, X } from "../atoms/icons/lucide";
import { Copy as CopyGlyph, DocumentText, InfoCircle, Microphone2, Note1, Printer } from "iconsax-reactjs";
import { HoverTooltip } from "../atoms/Tooltip";
import {
  CaptionCarousel,
  ConversationTranscript,
  DictationTranscript,
  hasDiarizedTranscript,
  hasTranscriptContent,
  transcriptToText
} from "./VoiceTranscriptProcessingCard";
import { ShineBorder } from "./ShineBorder";
import { FeedbackRow } from "./VoiceRxResultTabs";
import { VoiceRxIcon } from "./voice-consult-icons";
import { VoiceRecorderCore } from "./VoiceRecorderCore";
import { toast } from "./toast";
import { ConfirmDialog as TPConfirmDialog } from "../molecules/ConfirmDialog";
import styles from "./VoiceRxCanvas.module.scss";

const VRX_CANVAS_COACHMARK_KEY = "tp-vrx-canvas-coachmark-v1";


function formatDuration(ms) {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function downloadTranscript({ heading, body, durationMs }) {
  const transcriptBody = transcriptToText(body);
  if (typeof document === "undefined" || typeof URL === "undefined" || !transcriptBody) return;
  const safeHeading = (heading || "transcript").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "transcript";
  const content = [
    heading || "Transcript",
    durationMs > 0 ? `Duration: ${formatDuration(durationMs)}` : null,
    "",
    transcriptBody
  ].filter((line) => line !== null).join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeHeading}-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatTranscriptSourceLabel(segment = {}) {
  const rawModuleName = String(segment.moduleName || segment.sourceLabel || "").trim();
  if (segment.isDoctorAgent || rawModuleName === "Doctor Agent") {
    return "Clinical Notes";
  }
  return rawModuleName;
}

export function VoiceRxCanvas({
  modeLabel = "Conversation Mode",
  transcript = "",
  transcriptSegments,
  emrCard,
  soapCard,
  soapStatus,
  soapHtml = "",
  inlineRecorderSlot,
  onCopyToRx,
  onBack,
  onMinimize,
  onAddDetailsByVoice,
  onQuickEditSubmit,
  audioChunkContext,
  voiceLocked = false
}) {
  const canvasTitle = "Back";
  void modeLabel;

  const emrReady = Boolean(emrCard);
  const soapReady = soapStatus === "fulfilled";
  const initialTab = useMemo(() => {
    if (emrReady) return "emr";
    if (soapReady) return "soap";
    return "emr";
  }, [emrReady, soapReady]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const transcriptCount = Array.isArray(transcriptSegments) ? transcriptSegments.length : 0;

  const [feedback, setFeedback] = useState({ emr: null });
  const [voiceEditOpen, setVoiceEditOpen] = useState(false);
  const [voiceEditProcessing, setVoiceEditProcessing] = useState(false);
  const navLocked = voiceEditProcessing;
  const [voiceEditPhase, setVoiceEditPhase] = useState("idle");
  const [voiceEditTranscript, setVoiceEditTranscript] = useState("");
  const [voiceEditBackConfirmOpen, setVoiceEditBackConfirmOpen] = useState(false);
  const handleFeedback = (tab, val) => {
    setFeedback((prev) => ({ ...prev, [tab]: prev[tab] === val ? null : val }));
  };

  const [coachmarkVisible, setCoachmarkVisible] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!window.localStorage.getItem(VRX_CANVAS_COACHMARK_KEY)) {
        setCoachmarkVisible(true);
      }
    } catch {
      setCoachmarkVisible(true);
    }
  }, []);
  const dismissCoachmark = () => {
    setCoachmarkVisible(false);
    try {
      window.localStorage.setItem(VRX_CANVAS_COACHMARK_KEY, "1");
    } catch { /* ignore */ }
  };

  const handleCopyToRx = () => {
    if (coachmarkVisible) dismissCoachmark();
    onCopyToRx?.();
  };

  const handleVoiceEditOpen = () => {
    if (voiceLocked) return;
    if (coachmarkVisible) dismissCoachmark();
    if (onQuickEditSubmit) {
      setVoiceEditOpen(true);
      setVoiceEditProcessing(false);
      setVoiceEditPhase("idle");
      setVoiceEditTranscript("");
      return;
    }
    onAddDetailsByVoice?.();
  };

  const handleVoiceEditSubmit = async ({ audioBlob, transcript, durationMs } = {}) => {
    setVoiceEditProcessing(true);
    setVoiceEditPhase("creating_transcript");
    setVoiceEditTranscript("");
    try {
      await onQuickEditSubmit?.({ audioBlob, transcript, durationMs }, {
        onPhase: (phase, payload = {}) => {
          setVoiceEditPhase(phase);
          if (Object.prototype.hasOwnProperty.call(payload, "transcript")) {
            setVoiceEditTranscript(payload.transcript || "");
          }
        }
      });
      setVoiceEditOpen(false);
      setVoiceEditProcessing(false);
      setVoiceEditPhase("idle");
      setVoiceEditTranscript("");
    } catch {
      setVoiceEditProcessing(false);
    }
  };

  const handleVoiceEditCancel = () => {
    setVoiceEditBackConfirmOpen(false);
    setVoiceEditOpen(false);
    setVoiceEditProcessing(false);
    setVoiceEditPhase("idle");
    setVoiceEditTranscript("");
  };

  const handleBackClick = () => {
    if (navLocked) return;
    if (voiceEditOpen) {
      setVoiceEditBackConfirmOpen(true);
      return;
    }
    onBack?.();
  };

  const handleDiscardVoiceEditAndBack = () => {
    handleVoiceEditCancel();
    onBack?.();
  };

  const handleCopySoap = async () => {
    if (!soapHtml) return;
    const div = document.createElement("div");
    div.innerHTML = soapHtml;
    const text = (div.innerText || div.textContent || "").trim();
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            "text/html": new Blob([soapHtml], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      toast.success("SOAP note copied");
    } catch {
      toast.error("Failed to copy SOAP note");
    }
  };

  const handlePrintSoap = () => {
    if (!soapHtml) return;
    // Inject print-only CSS once.
    if (!document.getElementById("vrx-soap-print-css")) {
      const style = document.createElement("style");
      style.id = "vrx-soap-print-css";
      style.textContent = `@media print { body > *:not(.vrx-soap-print) { display: none !important; } .vrx-soap-print { display: block !important; padding: 24px; font-family: Mulish, Inter, -apple-system, sans-serif; line-height: 1.55; color: #0f172a; } .vrx-soap-print h1 { font-size: 22px; font-weight: 700; margin: 12px 0 8px; } .vrx-soap-print h2 { font-size: 18px; font-weight: 700; margin: 16px 0 8px; } .vrx-soap-print p { margin: 8px 0; } .vrx-soap-print ul, .vrx-soap-print ol { padding-left: 22px; margin: 8px 0; } .vrx-soap-print li { margin: 4px 0; } .vrx-soap-print em { color: #64748b; font-style: italic; } .vrx-soap-print strong { font-weight: 700; } } .vrx-soap-print { display: none; }`;
      document.head.appendChild(style);
    }
    const container = document.createElement("div");
    container.className = "vrx-soap-print";
    container.innerHTML = soapHtml;
    document.body.appendChild(container);
    const cleanup = () => {
      container.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    // Fallback cleanup if afterprint doesn't fire (some browsers).
    setTimeout(cleanup, 1500);
  };

  return (
    <div className={["vrx-canvas vrx-canvas--enter", styles.root].join(" ")}>
      {/* Header */}
      <div className={styles.topBar}>
        <button
          type="button"
          onClick={navLocked ? undefined : handleBackClick}
          disabled={navLocked}
          aria-label="Back to chat"
          className={["vrx-cn-mode-pill", styles.modePill].join(" ")}>
          <span
            className={[
              styles.backBtn,
              navLocked ? styles.backBtnLocked : styles.backBtnNormal
            ].join(" ")}
            aria-hidden="true">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span
            className={[styles.modePillLabel, styles.modePillLabelText].join(" ")}>
            {canvasTitle}
          </span>
        </button>
        <div className={styles.topBarRight}>
          {onMinimize && (
            <button
              type="button"
              onClick={navLocked ? undefined : onMinimize}
              disabled={navLocked}
              aria-label="Minimize agent"
              className={[
                styles.minimizeBtn,
                navLocked ? styles.minimizeBtnLocked : styles.minimizeBtnNormal
              ].join(" ")}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
                <path d="M9 3v18" stroke="currentColor" strokeWidth="2" />
                <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tab strip */}
      <div className={styles.tabsStripWrap}>
        <div className={["vrx-cn-tabs", styles.tabsList].join(" ")}>
          <button
            type="button"
            onClick={() => setActiveTab("transcript")}
            className={[
              styles.tabBtn,
              activeTab === "transcript" ? styles.tabBtnActive : styles.tabBtnInactive
            ].join(" ")}>
            <Microphone2 size={15} variant={activeTab === "transcript" ? "Bulk" : "Linear"} color="currentColor" />
            {transcriptCount > 1 ? "Transcripts" : "Transcript"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("emr")}
            className={[
              styles.tabBtn,
              activeTab === "emr" ? styles.tabBtnActive : styles.tabBtnInactive
            ].join(" ")}>
            <DocumentText size={15} variant={activeTab === "emr" ? "Bulk" : "Linear"} color="currentColor" />
            Clinical Notes
          </button>
          {soapCard ? (
            <button
              type="button"
              onClick={() => setActiveTab("soap")}
              className={[
                styles.tabBtn,
                activeTab === "soap" ? styles.tabBtnActive : styles.tabBtnInactive
              ].join(" ")}>
              <Note1 size={15} variant={activeTab === "soap" ? "Bulk" : "Linear"} color="currentColor" />
              SOAP
            </button>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {inlineRecorderSlot ? <div className={styles.inlineRecorderWrap}>{inlineRecorderSlot}</div> : null}

        {activeTab === "transcript" ? (
          <div className={styles.transcriptTabContent}>
            {Array.isArray(transcriptSegments) && transcriptSegments.length > 0 ? (
              transcriptSegments.map((seg, idx) => {
                const baseTitle = seg.mode === "ambient_consultation" ? "Conversation Transcript" : "Dictation Transcript";
                const sourceLabel = formatTranscriptSourceLabel(seg);
                const numberedTitle = transcriptSegments.length > 1 || sourceLabel
                  ? `${baseTitle} ${idx + 1}`
                  : baseTitle;
                const displaySourceLabel = sourceLabel && sourceLabel !== "Clinical Notes";
                const heading = displaySourceLabel ? `${numberedTitle} (${sourceLabel})` : numberedTitle;
                const timeLabel = seg.createdAt
                  ? new Date(seg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                  : null;
                return (
                  <TranscriptCard
                    key={seg.id ?? idx}
                    heading={heading}
                    body={seg.body}
                    durationMs={seg.durationMs}
                    timeLabel={timeLabel} />
                );
              })
            ) : transcript ? (
              <TranscriptCard
                heading="Transcript"
                body={transcript}
                durationMs={0}
                timeLabel={null} />
            ) : (
              <div className={["vrx-transcript-frame", styles.transcriptEmpty].join(" ")}>
                <p className={styles.transcriptEmptyText}>No transcript captured.</p>
              </div>
            )}
          </div>
        ) : activeTab === "soap" ? (
          <div className={styles.emrTabContent}>
            <div className={["vrx-cn-emr-shell relative w-full overflow-hidden rounded-[14px] bg-white", styles.emrShell].join(" ")}>
              <div className={styles.emrShellInner}>{soapCard}</div>
            </div>
          </div>
        ) : (
          <div className={styles.emrTabContent}>
            <div className={["vrx-cn-emr-shell relative w-full overflow-hidden rounded-[14px] bg-white", styles.emrShell].join(" ")}>
              <div className={styles.emrShellInner}>{emrCard}</div>
            </div>
            <FeedbackRow
              value={feedback.emr}
              onChange={(v) => handleFeedback("emr", v)} />
          </div>
        )}
      </div>

      {/* Footer — SOAP tab: Copy + Print */}
      {activeTab === "soap" && soapStatus === "fulfilled" && (
        <div className={styles.footer}>
          <div className={styles.footerRow}>
            <button
              type="button"
              onClick={handleCopySoap}
              disabled={!soapHtml}
              className={["vrx-cn-secondary-blue", styles.footerPrimary].join(" ")}>
              <CopyGlyph size={16} variant="Linear" color="currentColor" />
              Copy
            </button>
            <button
              type="button"
              onClick={handlePrintSoap}
              disabled={!soapHtml}
              className={["vrx-cn-secondary-blue", styles.footerPrimary].join(" ")}>
              <Printer size={16} variant="Linear" color="currentColor" />
              Print
            </button>
          </div>
        </div>
      )}

      {/* Footer — only on EMR tab */}
      {activeTab === "emr" && (
        <div className={styles.footer}>
          {coachmarkVisible && (
            <div
              role="note"
              className={[styles.coachmark, "vrx-canvas-coachmark"].join(" ")}>
              <span className={styles.coachmarkIcon} aria-hidden>
                <InfoCircle size={16} variant="Bulk" color="currentColor" />
              </span>
              <p className={styles.coachmarkText}>
                <span className={styles.coachmarkHeadsUp}>Heads up. </span>
                Notes aren&apos;t always perfect. Copy to your RxPad and fine-tune as needed.
              </p>
              <button
                type="button"
                onClick={dismissCoachmark}
                aria-label="Dismiss tip"
                className={styles.coachmarkClose}>
                <X strokeWidth={2} />
              </button>
            </div>
          )}
          <div className={styles.footerRow}>
            <button
              type="button"
              onClick={handleCopyToRx}
              disabled={!onCopyToRx}
              className={["vrx-cn-secondary-blue", styles.footerPrimary].join(" ")}>
              <CopyGlyph size={16} variant="Linear" color="currentColor" />
              Copy all to RxPad
            </button>

            <HoverTooltip
              content="Edit clinical notes with voice"
              side="top"
              align="end">
              <button
                type="button"
                onClick={handleVoiceEditOpen}
                disabled={voiceLocked || (!onQuickEditSubmit && !onAddDetailsByVoice)}
                aria-label="Edit clinical notes with voice"
                className={["vrx-rt-voice-cta-outline", styles.footerVoiceCta].join(" ")}>
                <VoiceRxIcon size={20} color="#673AAC" />
              </button>
            </HoverTooltip>
          </div>
        </div>
      )}
      {voiceEditOpen ? (
        <div className={styles.overlayWrap}>
          <div className={styles.overlayInner}>
            <VoiceRecorderCore
              layout="overlay"
              sectionLabel="Clinical Notes"
              showSectionInStatus={false}
              isAwaitingResponse={voiceEditProcessing}
              processingTranscript={voiceEditTranscript}
              processingLabel={voiceEditPhase === "creating_transcript" ? "Refining your captured consultation..." : "Updating clinical notes…"}
              audioChunkContext={audioChunkContext}
              onCancel={handleVoiceEditCancel}
              onSubmit={handleVoiceEditSubmit}
              radiusClassName="rounded-t-[18px]"
              variant="stack"
              fillHeight
              enableCollapsedVoiceSession
            />
          </div>
        </div>
      ) : null}
      <TPConfirmDialog
        open={voiceEditBackConfirmOpen}
        onOpenChange={setVoiceEditBackConfirmOpen}
        title="Close this voice consultation?"
        warning="Are you sure you want to close this voice Rx? If you close it, no data will be stored."
        primaryLabel="Keep recording"
        onPrimary={() => setVoiceEditBackConfirmOpen(false)}
        secondaryLabel="Discard & Go Back"
        secondaryTone="destructive"
        onSecondary={handleDiscardVoiceEditAndBack}
      />
    </div>
  );
}

function VoiceEditProcessing({ phase, transcript }) {
  const hasTranscript = hasTranscriptContent(transcript);
  const isDiarized = hasDiarizedTranscript(transcript);

  return (
    <div className={styles.overlayProcessing}>
      <div className={styles.overlayProcessingCard}>
        <div className={[styles.overlayTranscriptFrame, "relative"].join(" ")}>
          <ShineBorder
            variant="rotate"
            borderWidth={1.5}
            duration={2.2}
            shineColor={["#D565EA", "#673AAC", "#1A1994"]}
            baseColor="rgba(226,226,234,0.95)" />
          <div className={styles.overlayTranscriptScroll}>
            {hasTranscript ? (
              isDiarized ? (
                <ConversationTranscript raw={transcript} shimmer={phase !== "creating_transcript"} />
              ) : (
                <DictationTranscript
                  raw={transcript}
                  animate={phase !== "creating_transcript"} />
              )
            ) : (
              <p className={styles.overlayTranscriptPlaceholder}>
                Refining your captured consultation...
              </p>
            )}
          </div>
        </div>
        {hasTranscript ? <CaptionCarousel /> : null}
        <span className={styles.overlayProgressTrack} aria-hidden>
          <span className={styles.overlayProgressBar} />
        </span>
      </div>
    </div>
  );
}

function TranscriptCard({ heading, body, durationMs, timeLabel }) {
  const isDiarized = hasDiarizedTranscript(body);
  return (
    <div className={styles.transcriptCard}>
      <div className={["vrx-transcript-frame", styles.transcriptCardFrame].join(" ")}>
        <p className={styles.transcriptCardHeading}>{heading}</p>
        {isDiarized ? (
          <ConversationTranscript raw={body} />
        ) : (
          <DictationTranscript raw={body} animate={false} />
        )}
        <div className={styles.transcriptCardDivider} />
        <div className={styles.transcriptCardMeta}>
          <span>
            Audio <span className={styles.transcriptCardDuration}>({formatDuration(durationMs)})</span>
          </span>
          <HoverTooltip content="Audio was clear and easily processed by the AI models." side="top">
            <button type="button" className={styles.infoBtn}>
              <InfoCircle size={14} variant="Linear" />
            </button>
          </HoverTooltip>
        </div>
      </div>
      <div className={styles.transcriptCardActions}>
        <HoverTooltip content="Download transcript" side="bottom" align="start">
          <button
            type="button"
            onClick={() => {
              downloadTranscript({ heading, body, durationMs });
              toast.success("Transcript downloaded");
            }}
            aria-label="Download transcript"
            className={styles.downloadBtn}>
            <DownloadIcon size={14} strokeWidth={2.2} />
          </button>
        </HoverTooltip>
        {timeLabel ? (
          <span className={styles.timeLabel}>{timeLabel}</span>
        ) : null}
      </div>
    </div>
  );
}
