import { useState } from "react";
import { FeedbackBottomSheet } from "../rxpad/dr-agent/shell/FeedbackBottomSheet";
import { Download } from "../atoms/icons/lucide";
import { toast } from "./toast";
import styles from "./VoiceRxResultTabs.module.scss";
import { HoverTooltip } from "../atoms/Tooltip";
import { Like1, Dislike, InfoCircle } from "iconsax-reactjs";

function downloadTextFile({ filename, text }) {
  if (typeof document === "undefined" || typeof URL === "undefined" || !text) return;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function FeedbackRow({ value, onChange, audioQuality, timestamp, transcriptText }) {
  const [downSheetOpen, setDownSheetOpen] = useState(false);
  const isTranscriptRow = Boolean(audioQuality);
  const handleDown = () => {
    onChange("down");
    setDownSheetOpen(true);
  };
  return (
    <div className={styles.feedbackRow}>
      {!isTranscriptRow && (
        <>
          <button
            type="button"
            onClick={() => onChange("up")}
            className={[styles.feedbackBtn, value === "up" ? styles.feedbackBtnUp : styles.feedbackBtnNeutral].join(" ")}>
            <Like1 size={14} variant={value === "up" ? "Bold" : "Linear"} />
          </button>
          <button
            type="button"
            onClick={handleDown}
            className={[styles.feedbackBtn, value === "down" ? styles.feedbackBtnDown : styles.feedbackBtnNeutral].join(" ")}>
            <Dislike size={14} variant={value === "down" ? "Bold" : "Linear"} />
          </button>
        </>
      )}

      {audioQuality && (
        <>
          <div className={styles.audioQualityWrap}>
            Audio quality: {audioQuality.charAt(0).toUpperCase() + audioQuality.slice(1)}
            <HoverTooltip content="Audio was clear and easily processed by the AI models." side="top">
              <button type="button" className={styles.infoBtn}>
                <InfoCircle size={14} variant="Linear" />
              </button>
            </HoverTooltip>
          </div>
          <span aria-hidden className="vrx-fb-divider mx-[6px]" />
          <HoverTooltip content="Download transcript" side="bottom" align="start">
            <button
              type="button"
              onClick={() => {
                downloadTextFile({
                  filename: `transcript-${new Date().toISOString().slice(0, 10)}.txt`,
                  text: transcriptText || ""
                });
                toast.success("Transcript downloaded");
              }}
              aria-label="Download transcript"
              className={styles.downloadBtn}>
              <Download size={14} strokeWidth={2.2} />
            </button>
          </HoverTooltip>
        </>
      )}

      {timestamp ? (
        <>
          <span aria-hidden className="vrx-fb-divider mx-[6px]" />
          <span className={styles.timestampLabel}>{timestamp}</span>
        </>
      ) : null}
      {!isTranscriptRow && (
        <FeedbackBottomSheet
          isOpen={downSheetOpen}
          onClose={() => setDownSheetOpen(false)}
          onSubmit={() => {
            setDownSheetOpen(false);
            toast.success("Thanks — feedback submitted");
          }} />
      )}
    </div>
  );
}
