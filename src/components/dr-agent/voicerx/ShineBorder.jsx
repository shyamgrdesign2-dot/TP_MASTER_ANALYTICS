import React from "react";
import styles from "./ShineBorder.module.scss";
import { cn } from "../utils";

export function ShineBorder({
  borderWidth = 1.5,
  duration = 14,
  shineColor = ["#D565EA", "#673AAC", "#1A1994"],
  baseColor = "rgba(226,226,234,0.95)",
  variant = "rotate",
  className,
}) {
  const colors = Array.isArray(shineColor) ? shineColor.join(", ") : shineColor;
  return (
    <div
      className={cn(styles.shine, className)}
      style={{
        "--border-width": `${borderWidth}px`,
        "--duration": `${duration}s`,
        "--shine-color": colors,
        "--base-color": baseColor,
      }}
      aria-hidden
    />
  );
}
