import { cn } from "../../../utils";
import styles from "./VoiceEmptyState.module.scss";
import Lottie from "lottie-react";
import chevronDownLottie from "../../../assets/chevron-down.json";
import { VoiceRxIcon } from "../../../voicerx/voice-consult-icons";

export function VoiceEmptyState({
  onStartVoice,
  onViewPatientDetails,
  hasSymptomCollectorData,
  voiceLocked = false,
}) {
  return (
    <div className={styles.root}>
      {/* ── Center zone ───────────────────────────────────── */}
      <div className={styles.centerZone}>
        <div className={styles.sparkWrapper}>
          <span
            className={cn(
              styles.sparkWrapperInner,
              "pointer-events-none select-none"
            )}
            aria-hidden
          >
            <div className={cn(styles.sparkBase, "absolute inset-0 bg-white")} />
            <div className={cn(styles.sparkGif, "absolute inset-0")} />
            <img
              src="/new-assets/icons/dr-agent/agent-spark.svg"
              width={40}
              height={40}
              alt=""
              className="vrx-empty-spark-rotate"
              draggable={false}
              style={{ position: "relative", zIndex: 10 }}
            />
          </span>
        </div>

        <h2 className={styles.greeting}>
          {(() => {
            const h = new Date().getHours();
            return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
          })()}
          , Doctor!
        </h2>
        <p className={cn(styles.subtitle)}>
          Start consultation by{" "}
          <span className={styles.subtitleEm}>dictating</span>{" "}
          or having a{" "}
          <span className={styles.subtitleEm}>natural conversation</span>{" "}
          with the patient.
        </p>

        <div className={styles.ctaRow}>
          {/* da-* styles live in globals.css */}
          <button
            type="button"
            onClick={onStartVoice}
            disabled={voiceLocked}
            aria-disabled={voiceLocked || undefined}
            title={
              voiceLocked
                ? "Another mic is active. Close that dictation first."
                : undefined
            }
            className={cn("vrx-ai-cta", styles.voiceCta, voiceLocked && styles.voiceCtaLocked)}
          >
            <span
              aria-hidden
              className="vrx-ai-cta-sheen"
              style={{
                pointerEvents: "none",
                position: "absolute",
                inset: "0 auto 0 0",
                zIndex: 0,
                width: "40%",
              }}
            />
            <VoiceRxIcon
              size={32}
              color="#FFFFFF"
              style={{ position: "relative", zIndex: 1 }}
            />
            <span style={{ position: "relative", zIndex: 1 }}>
              Start with Voice
            </span>
          </button>
        </div>
      </div>

      {/* ── Bottom zone: glassy "View patient shared details" pill ─ */}
      {hasSymptomCollectorData && (
        <div className={styles.bottomZone}>
          <div className={styles.chipGroup}>
            {/* Tooltip */}
            <div aria-hidden className={styles.chipTooltipWrap}>
              <div className={cn(styles.tooltipBox)}>
                <p className={styles.tooltipTitle}>
                  Patient-reported pre-visit details
                </p>
                <p className={styles.tooltipSubtext}>
                  Submitted via the symptom collector before the visit
                </p>
                <span className={styles.tooltipArrow} />
              </div>
            </div>

            <button
              type="button"
              onClick={onViewPatientDetails}
              className={cn("vrx-patient-chip", styles.patientChip)}
            >
              <span
                aria-hidden
                className="vrx-patient-chip-sheen"
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  inset: "0 auto 0 0",
                  zIndex: 0,
                  width: "40%",
                }}
              />
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                style={{ position: "relative", zIndex: 1, flexShrink: 0 }}
                aria-hidden
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  opacity="0.4"
                  d="M21 18V8C21 5.79086 19.2091 4 17 4H8H7C4.79086 4 3 5.79086 3 8V18C3 20.2091 4.79086 22 7 22H17C19.2091 22 21 20.2091 21 18Z"
                  fill="url(#chipIconGrad)"
                />
                <path
                  d="M8 4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4C16 5.10457 15.1046 6 14 6H10C8.89543 6 8 5.10457 8 4Z"
                  fill="url(#chipIconGrad)"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M11.1201 10.2597C11.3581 10.2983 11.563 10.449 11.6708 10.6646L13.2055 13.7339L14.4697 12.4697C14.6103 12.329 14.8011 12.25 15 12.25H17C17.4142 12.25 17.75 12.5858 17.75 13C17.75 13.4142 17.4142 13.75 17 13.75H15.3107L13.5303 15.5303C13.3599 15.7008 13.1178 15.7789 12.8799 15.7403C12.6419 15.7017 12.437 15.5511 12.3292 15.3354L10.7945 12.2661L9.53033 13.5303C9.38968 13.671 9.19891 13.75 9 13.75H7C6.58579 13.75 6.25 13.4142 6.25 13C6.25 12.5858 6.58579 12.25 7 12.25H8.68934L10.4697 10.4697C10.6401 10.2992 10.8822 10.2211 11.1201 10.2597Z"
                  fill="url(#chipIconGrad)"
                />
                <defs>
                  <linearGradient
                    id="chipIconGrad"
                    x1="4"
                    y1="6"
                    x2="20"
                    y2="18"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#D565EA" />
                    <stop offset="1" stopColor="#3A38B8" />
                  </linearGradient>
                </defs>
              </svg>
              <span className={cn(styles.patientChipText)}>
                View patient shared details
              </span>
              <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
                <linearGradient
                  id="vrx-chip-arrow-grad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop stopColor="#C850E8" offset="0%" />
                  <stop stopColor="#673AAC" offset="55%" />
                  <stop stopColor="#3A38B8" offset="100%" />
                </linearGradient>
              </svg>
              <div
                className="vrx-lottie-gradient"
                style={{
                  position: "relative",
                  zIndex: 1,
                  flexShrink: 0,
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
                aria-hidden
              >
                {/* da-* styles live in globals.css */}
                <Lottie
                  animationData={chevronDownLottie}
                  loop={true}
                  style={{ width: "100%", height: "100%", transform: "scale(1.2)" }}
                />
              </div>
            </button>
          </div>

          <p className={styles.privacyNote}>
            <svg
              width={12}
              height={12}
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
              style={{ flexShrink: 0 }}
            >
              <path
                d="M6 1.5L9.5 3V6C9.5 7.93 7.97 9.73 6 10.5C4.03 9.73 2.5 7.93 2.5 6V3L6 1.5Z"
                stroke="#A2A2A8"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4.5 6L5.5 7L7.5 5"
                stroke="#A2A2A8"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Data stays private · shared only with you
          </p>
        </div>
      )}
      {/* da-* styles live in globals.css */}
    </div>
  );
}
