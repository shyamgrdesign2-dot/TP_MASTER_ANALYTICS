import React from "react";

const AI_GRADIENT = "linear-gradient(135deg, #D565EA 0%, #673AAC 55%, #1A1994 100%)";

export function TpAiSparkIcon({ size = 16, className }) {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D565EA" />
          <stop offset="55%" stopColor="#673AAC" />
          <stop offset="100%" stopColor="#1A1994" />
        </linearGradient>
      </defs>
      {/* 4-point star */}
      <path
        d="M8 1.5 L8.8 6.2 L13.5 8 L8.8 9.8 L8 14.5 L7.2 9.8 L2.5 8 L7.2 6.2 Z"
        fill={`url(#${id}-grad)`}
      />
      {/* Small accent star */}
      <path
        d="M13 2 L13.4 3.6 L15 4 L13.4 4.4 L13 6 L12.6 4.4 L11 4 L12.6 3.6 Z"
        fill={`url(#${id}-grad)`}
        opacity="0.7"
      />
    </svg>
  );
}

export function AiBrandSparkIcon({ size = 20, withBackground = false, thinking = false, className }) {
  const iconContent = (
    <TpAiSparkIcon size={withBackground ? size * 0.55 : size} className={thinking ? "ai-spark-thinking" : undefined} />
  );

  if (withBackground) {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          background: AI_GRADIENT,
        }}
      >
        <TpAiSparkIcon size={size * 0.55} />
      </span>
    );
  }

  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {iconContent}
    </span>
  );
}

export { AI_GRADIENT };
export const AI_GRADIENT_SOFT = "linear-gradient(135deg, rgba(213,101,234,0.12) 0%, rgba(103,58,172,0.10) 55%, rgba(26,25,148,0.10) 100%)";
