import React, { useState } from "react";
import { Copy, CopySuccess } from "iconsax-reactjs";
import { cn } from "../../../utils";
import styles from "./CopyIcon.module.scss";

export function CopyIcon({ size = 14, onClick, className, copied = false }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        styles.copyBtn,
        copied ? styles.stateCopied : hovered ? styles.stateHovered : styles.stateDefault,
        className
      )}>
      {copied ? (
        <CopySuccess size={size} variant="Bulk" />
      ) : (
        <Copy size={size} variant={hovered ? "Bulk" : "Linear"} />
      )}
    </button>
  );
}
