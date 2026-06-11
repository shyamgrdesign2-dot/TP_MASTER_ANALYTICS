import React from "react";
import { cn } from "../../../utils";
import { ASSETS } from "../../../../../assets";
import styles from "./SectionSummaryBar.module.scss";

const SECTION_ICON_SRC = {
  vitals: ASSETS.images.vitals,
  symptoms: ASSETS.images.symptoms,
  symptom: ASSETS.images.symptoms,
  examination: ASSETS.images.examination,
  examinations: ASSETS.images.examination,
  diagnosis: ASSETS.images.diagnosis,
  diagnoses: ASSETS.images.diagnosis,
  medication: ASSETS.images.medication,
  medications: ASSETS.images.medication,
  rx: ASSETS.images.medication,
  advice: ASSETS.images.advice,
  lab: ASSETS.images.lab,
  investigation: ASSETS.images.lab,
  investigations: ASSETS.images.lab,
  "lab-investigation": ASSETS.images.lab,
  notes: ASSETS.images.notes,
  others: ASSETS.images.notes,
  "additional-notes": ASSETS.images.notes,
  followup: ASSETS.images.followup,
  "follow-up": ASSETS.images.followup,
  "follow up": ASSETS.images.followup,
  surgery: ASSETS.images.surgery,
  surgeries: ASSETS.images.surgery,
  "medical-history": ASSETS.images.medicalHistory,
  medicalhistory: ASSETS.images.medicalHistory,
};

function normalizeIconKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/_/g, "-")
    .toLowerCase();
}

function resolveIconSrc(icon, label) {
  const iconKey = normalizeIconKey(icon);
  const labelKey = normalizeIconKey(label);
  return SECTION_ICON_SRC[iconKey] || SECTION_ICON_SRC[labelKey] || null;
}

/**
 * Full-width section header row — canonical spec:
 * height 30px, icon 18px, label 14px semibold.
 * Default fill: TP Slate 100 at 70% opacity; label/icon tp-slate-500.
 * Specialty: tp-violet-50 + tp-violet-600.
 */
export function SectionSummaryBar({
  label,
  icon,
  iconSlot,
  variant = "default",
  trailing,
  className,
  marginBottom = true,
}) {
  const barClass = variant === "specialty" ? styles.bgSpecialty : styles.bgDefault;
  const labelClass = variant === "specialty" ? styles.labelSpecialty : styles.labelDefault;
  const iconSrc = resolveIconSrc(icon, label);

  return (
    <div
      className={cn(
        styles.bar,
        barClass,
        marginBottom && styles.marginBottom,
        className
      )}>
      {iconSlot ?? (iconSrc ? (
        <span className={styles.iconSlot}>
          <img className={styles.iconImg} src={iconSrc} alt="" aria-hidden="true" />
        </span>
      ) : icon ? (
        <span
          className={styles.iconSlot}
          style={{ color: variant === "specialty" ? "var(--tp-violet-600, #7C3AED)" : "var(--tp-slate-500, #64748B)" }}>
          {/* TPMedicalIcon not available — render placeholder */}
          <span className={styles.medicalIcon} aria-hidden="true" />
        </span>
      ) : null)}
      <span className={cn(styles.label, labelClass)}>
        {label}
      </span>
      {trailing}
    </div>
  );
}
