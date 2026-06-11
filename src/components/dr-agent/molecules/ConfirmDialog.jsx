import React from "react";
import { createPortal } from "react-dom";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  warning,
  primaryLabel = "Confirm",
  onPrimary,
  secondaryLabel = "Cancel",
  onSecondary,
  secondaryTone,
  // legacy fallback
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
}) {
  if (!open) return null;
  const handlePrimary = onPrimary ?? onConfirm ?? (() => onOpenChange?.(false));
  const handleSecondary = onSecondary ?? onCancel ?? (() => onOpenChange?.(false));
  const primaryText = primaryLabel ?? confirmLabel ?? "Confirm";
  const secondaryText = secondaryLabel ?? cancelLabel ?? "Cancel";
  const body = warning ?? description;
  const destructive = secondaryTone === "destructive";

  const dialog = (
    <div
      role="alertdialog"
      aria-modal="true"
      data-dr-agent="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
        background: "rgba(15,23,42,0.32)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
      onClick={() => onOpenChange?.(false)}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 20,
          maxWidth: 360,
          width: "calc(100% - 32px)",
          boxShadow: "0 20px 50px -10px rgba(15,23,42,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          {title && (
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
              {title}
            </h3>
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange?.(false)}
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#0f172a",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {body && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 14px",
              background: "#FEF9E7",
              border: "1px solid #FDECC8",
              borderRadius: 10,
              marginBottom: 18,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p style={{ margin: 0, fontSize: 13, color: "#454551", lineHeight: 1.5 }}>{body}</p>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16 }}>
          <button
            type="button"
            onClick={handleSecondary}
            style={{
              padding: "8px 4px",
              border: "none",
              background: "transparent",
              color: destructive ? "#DC2626" : "#0f172a",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {secondaryText}
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "#4B4AD5",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {primaryText}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !document.body) {
    return dialog;
  }

  return createPortal(dialog, document.body);
}
