import React from "react";

/**
 * Stub for TPMedicalIcon — renders a neutral placeholder span.
 * Replace with actual icon implementation when the icon set is available.
 */
export function TPMedicalIcon({ name, size = 16, color = "currentColor", variant, className }) {
  return (
    <span
      className={className}
      aria-label={name}
      style={{ display: "inline-flex", width: size, height: size, color }}
    />
  );
}
