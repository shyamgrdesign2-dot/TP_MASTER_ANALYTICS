import React, { useId } from "react";
import { cn } from "../../../utils";
import styles from "./DrAgentFab.module.scss";

function BrandSparkIcon({ size = 42 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 375 375"
      fill="none"
      aria-hidden="true"
      className="vrx-fab-spark-icon"
    >
      <path
        d="M290.387 195.649C240.198 200.476 200.481 240.165 195.649 290.32L187.497 375L179.351 290.326C174.521 240.179 134.803 200.478 84.6131 195.642L0 187.503L84.6199 179.358C134.807 174.53 174.519 134.834 179.351 84.6805L187.503 0L195.649 84.6737C200.479 134.821 240.197 174.522 290.387 179.358L375 187.497L290.387 195.649Z"
        fill="white"
      />
    </svg>
  );
}

const FAB_PATH =
  "M395.24 23.6125C381.35 31.5666 366.81 41.5232 360.83 55.4195C352.63 74.3548 341.13 86.7689 319.47 86.769H110.53C88.87 86.7689 77.37 74.3548 69.17 55.4195C63.19 41.5232 48.62 31.5666 34.73 23.6125L28.43 20H401.32L395.24 23.6125Z";

function RecordingMicIcon({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: "fabMicPulse 1.4s ease-in-out infinite" }}
    >
      {/* da-* styles live in globals.css */}
      <path d="M12 19v3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M19 10v2a7 7 0 0 1-14 0v-2"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="2"
        width="6"
        height="13"
        rx="3"
        fill="white"
        fillOpacity="0.3"
        stroke="white"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ActiveVoiceMicIcon({ size = 30, color = "#F59E0B", muted = false }) {
  if (muted) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <path d="M16.4201 6.41965V7.57965L9.14008 14.8596C8.18008 13.9896 7.58008 12.7096 7.58008 11.3396V6.41965C7.58008 4.35965 8.98008 2.64965 10.8801 2.15965C11.0701 2.10965 11.2501 2.26965 11.2501 2.45965V3.99965C11.2501 4.40965 11.5901 4.74965 12.0001 4.74965C12.4101 4.74965 12.7501 4.40965 12.7501 3.99965V2.45965C12.7501 2.26965 12.9301 2.10965 13.1201 2.15965C15.0201 2.64965 16.4201 4.35965 16.4201 6.41965Z" />
        <path d="M19.81 9.81012V11.4001C19.81 15.4701 16.68 18.8201 12.7 19.1701V21.3001C12.7 21.6901 12.39 22.0001 12 22.0001C11.61 22.0001 11.3 21.6901 11.3 21.3001V19.1701C10.21 19.0701 9.18001 18.7501 8.26001 18.2401L9.29001 17.2101C10.11 17.5901 11.03 17.8101 12 17.8101C15.54 17.8101 18.42 14.9301 18.42 11.4001V9.81012C18.42 9.43012 18.73 9.12012 19.12 9.12012C19.5 9.12012 19.81 9.43012 19.81 9.81012Z" />
        <path d="M16.42 10.0801V11.5301C16.42 14.1101 14.2 16.1801 11.56 15.9301C11.28 15.9001 11 15.8501 10.74 15.7601L16.42 10.0801Z" />
        <path d="M21.7701 2.22988C21.4701 1.92988 20.9801 1.92988 20.6801 2.22988L7.23012 15.6799C6.20012 14.5499 5.58012 13.0499 5.58012 11.3999V9.80988C5.58012 9.42988 5.27012 9.11988 4.88012 9.11988C4.50012 9.11988 4.19012 9.42988 4.19012 9.80988V11.3999C4.19012 13.4299 4.97012 15.2799 6.24012 16.6699L2.22012 20.6899C1.92012 20.9899 1.92012 21.4799 2.22012 21.7799C2.38012 21.9199 2.57012 21.9999 2.77012 21.9999C2.97012 21.9999 3.16012 21.9199 3.31012 21.7699L21.7701 3.30988C22.0801 3.00988 22.0801 2.52988 21.7701 2.22988Z" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M19.12 9.12c-.39 0-.7.31-.7.7v1.58c0 3.54-2.88 6.42-6.42 6.42s-6.42-2.88-6.42-6.42V9.81c0-.39-.31-.7-.7-.7-.39 0-.7.31-.7.7v1.58c0 4.07 3.13 7.42 7.12 7.78v2.13c0 .39.31.7.7.7.39 0 .7-.31.7-.7v-2.13c3.98-.35 7.12-3.71 7.12-7.78V9.81a.707.707 0 0 0-.7-.69Z" />
      <path d="M12 2c-2.44 0-4.42 1.98-4.42 4.42v5.12c0 2.44 1.98 4.42 4.42 4.42s4.42-1.98 4.42-4.42V6.42C16.42 3.98 14.44 2 12 2Zm1.31 6.95c-.07.26-.3.43-.56.43-.05 0-.1-.01-.15-.02-.39-.11-.8-.11-1.19 0-.32.09-.63-.1-.71-.41-.09-.31.1-.63.41-.71.59-.16 1.21-.16 1.8 0 .3.08.48.4.4.71Zm.53-1.94c-.09.24-.31.38-.55.38-.07 0-.14-.01-.2-.03-.69-.26-1.47-.26-2.17 0-.3.11-.63-.05-.74-.35-.11-.3.05-.63.35-.74.97-.35 2.03-.35 3 0 .3.11.46.44.31.74Z" />
    </svg>
  );
}

function ActiveCheckIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.46 6.17969L8.82003 17.8197L3.53003 12.5297" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DrAgentFab({
  onClick,
  disabled = false,
  hasNudge,
  isPanelOpen,
  isModuleRecording,
  activeVoiceSession,
  activeVoicePaused,
  activeVoiceStatusLabel,
  activeVoiceElapsedLabel,
  activeVoiceAudioLevel = 0,
  onPauseToggle,
  onActiveSubmit
}) {
  const uid = useId();

  if (activeVoiceSession) {
    const shadowId = `${uid.replace(/[:]/g, "")}-active-shadow`;
    const shellId = `${uid.replace(/[:]/g, "")}-active-shell`;
    const title = activeVoicePaused ? "Paused" : "I'm listening";
    const meta = activeVoiceElapsedLabel || activeVoiceStatusLabel || "00:00";
    const normalizedAudioLevel = Math.max(0, Math.min(1, activeVoiceAudioLevel || 0));
    const audioActive = !activeVoicePaused && normalizedAudioLevel > 0.04;

    return (
      <div
        data-dr-agent="true"
        className={cn(
          styles.activeVoiceFab,
          activeVoicePaused && styles.activeVoiceFabPaused,
          audioActive && styles.activeVoiceFabAudioActive
        )}
        style={{ "--active-voice-level": normalizedAudioLevel.toFixed(3) }}
        role="button"
        tabIndex={0}
        aria-label="Open active VoiceRx recording"
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onClick?.();
        }}
      >
        <div className={styles.activeVoiceInner}>
          <svg
            aria-hidden="true"
            className={styles.activeVoiceSvg}
            viewBox="0 0 430 115"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter
                id={shadowId}
                x="0"
                y="0"
                width="430"
                height="114.769"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix
                  in="SourceAlpha"
                  type="matrix"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                  result="hardAlpha"
                />
                <feOffset dy="4" />
                <feGaussianBlur stdDeviation="12" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix
                  type="matrix"
                  values="0 0 0 0 0.175838 0 0 0 0 0.173404 0 0 0 0 0.173404 0 0 0 0.42 0"
                />
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
                <feBlend in="SourceGraphic" in2="effect1_dropShadow" mode="normal" result="shape" />
              </filter>
              <linearGradient
                id={shellId}
                x1="28.43"
                x2="401.32"
                y1="53"
                y2="53"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="#D565EA" />
                <stop offset="0.5" stopColor="#673AAC" />
                <stop offset="1" stopColor="#1A1994" />
              </linearGradient>
            </defs>
            <g filter={`url(#${shadowId})`}>
              <path d={FAB_PATH} fill={`url(#${shellId})`} />
            </g>
          </svg>

          <div className={styles.activeVoiceContentWrapper}>
            <div className={styles.activeVoiceContent}>
              <button
                type="button"
                className={[styles.activeSurface, styles.activeMicButton].join(" ")}
                aria-label={activeVoicePaused ? "Resume VoiceRx recording" : "Pause VoiceRx recording"}
                data-muted={activeVoicePaused ? "true" : "false"}
                onClick={(event) => {
                  event.stopPropagation();
                  onPauseToggle?.();
                }}
              >
                <span className={styles.activeIconUnrotate}>
                  <ActiveVoiceMicIcon color={activeVoicePaused ? "#FFFFFF" : "#F59E0B"} muted={activeVoicePaused} />
                </span>
              </button>

              <div className={styles.activeCenterStack}>
                <div className={styles.activeWaveRow}>
                  <span className={styles.activeWaveBars} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className={styles.activeElapsedLabel}>{meta}</span>
                </div>

                <div className={styles.activeLabelRow}>
                  <span className={styles.activeStatusLabel}>{title}</span>
                  {!activeVoicePaused && (
                    <span className={styles.activeDotsRow} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className={[styles.activeSurface, styles.activeSubmitButton].join(" ")}
                aria-label="Open active VoiceRx recording"
                onClick={(event) => {
                  event.stopPropagation();
                  onActiveSubmit?.();
                }}
              >
                <span className={styles.activeIconUnrotate}>
                  <ActiveCheckIcon />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const SHELL_W = 230;
  const SHELL_H = 66;
  const VB_H_SCALED = SHELL_W * (115 / 430);
  const MEET_OFFSET_Y = (SHELL_H - VB_H_SCALED) / 2;
  const SCALE = SHELL_W / 430;

  const shadowId = `${uid.replace(/[:]/g, "")}-fab-shadow`;
  const shellId = `${uid.replace(/[:]/g, "")}-fab-shell`;
  const sheenId = `${uid.replace(/[:]/g, "")}-fab-sheen`;

  const showShimmer = !isPanelOpen && !isModuleRecording;
  const handleOpen = () => {
    if (!disabled) onClick?.();
  };

  return (
    <div
      data-dr-agent="true"
      className="vrx-fab-wrapper"
      style={{
        pointerEvents: "none",
        position: "fixed",
        zIndex: 40,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 500ms cubic-bezier(0.16,1,0.3,1)",
        top: "50%",
        right: 0,
        width: SHELL_H,
        height: SHELL_W,
        transform: isPanelOpen
          ? "translateY(-50%) translateX(110%)"
          : "translateY(-50%)",
        opacity: isPanelOpen ? 0 : disabled ? 0.45 : 1,
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Open VoiceRx"
      aria-disabled={disabled || undefined}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleOpen();
      }}
    >
      {/* Hover tooltip — left of the chip */}
      <div className={styles.tooltip}>
        <div className={styles.tooltipInner}>
          {disabled || isModuleRecording ? "Voice recording in progress" : "Open VoiceRx"}
          <div className={styles.tooltipArrow} />
        </div>
      </div>

      <div
        className="dr-agent-fab-inner"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: SHELL_W,
          height: SHELL_H,
          transform: "translate(-50%,-50%) rotate(90deg)",
          transformOrigin: "center center",
        }}
      >
        <svg
          aria-hidden
          style={{
            display: "block",
            overflow: "visible",
            width: SHELL_W,
            height: SHELL_H,
            position: "absolute",
            left: -7,
            top: -14,
            pointerEvents: "none",
          }}
          viewBox="0 0 430 115"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter
              id={shadowId}
              x="0"
              y="0"
              width="430"
              height="114.769"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="4" />
              <feGaussianBlur stdDeviation="12" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.175838 0 0 0 0 0.173404 0 0 0 0 0.173404 0 0 0 0.42 0"
              />
              <feBlend
                mode="normal"
                in2="BackgroundImageFix"
                result="effect1_dropShadow"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow"
                mode="normal"
                result="shape"
              />
            </filter>
            <linearGradient
              id={shellId}
              x1="28.43"
              x2="401.32"
              y1="53"
              y2="53"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#D565EA">
                <animate
                  attributeName="stop-color"
                  values="#D565EA;#E88BF5;#D565EA"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="0.5" stopColor="#673AAC">
                <animate
                  attributeName="stop-color"
                  values="#673AAC;#8B5CF6;#673AAC"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="1" stopColor="#1A1994">
                <animate
                  attributeName="stop-color"
                  values="#1A1994;#3730A3;#1A1994"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>
            {showShimmer && (
              <linearGradient
                id={sheenId}
                x1="0"
                y1="20"
                x2="430"
                y2="80"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="white" stopOpacity="0" />
                <stop offset="0.30" stopColor="white" stopOpacity="0" />
                <stop offset="0.50" stopColor="white" stopOpacity="0.95" />
                <stop offset="0.70" stopColor="white" stopOpacity="0" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
            )}
          </defs>

          <g filter={`url(#${shadowId})`}>
            <path
              d={FAB_PATH}
              fill={`url(#${shellId})`}
              pointerEvents={isPanelOpen ? "none" : "visiblePainted"}
              style={{ cursor: disabled ? "not-allowed" : "pointer" }}
            />
          </g>
          {showShimmer && (
            <path
              d={FAB_PATH}
              fill={`url(#${sheenId})`}
              className="vrx-fab-sheen"
            />
          )}
        </svg>

        <div
          style={{
            position: "absolute",
            left: -7,
            top: -14 + MEET_OFFSET_Y,
            width: 430,
            height: 115,
            transform: `scale(${SCALE})`,
            transformOrigin: "0 0",
            pointerEvents: "none",
          }}
        >
          <div className={styles.fabContentFlex}>
            {isModuleRecording ? (
              <RecordingMicIcon size={42} />
            ) : (
              <span className={showShimmer ? "vrx-fab-spark-pulse" : undefined}>
                <BrandSparkIcon size={42} />
              </span>
            )}
            <span className={styles.fabLabel}>
              {isModuleRecording ? "Rec…" : "VoiceRx"}
            </span>
          </div>
        </div>
      </div>
      {/* da-* styles live in globals.css */}
    </div>
  );
}
