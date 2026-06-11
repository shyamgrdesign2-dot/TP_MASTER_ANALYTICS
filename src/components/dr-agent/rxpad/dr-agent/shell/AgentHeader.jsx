import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../../utils";
import styles from "./AgentHeader.module.scss";

import {
  DropdownMenu as TPDropdownMenu,
  DropdownMenuContent as TPDropdownMenuContent,
  DropdownMenuItem as TPDropdownMenuItem,
  DropdownMenuTrigger as TPDropdownMenuTrigger,
} from "../../../molecules/DropdownMenu";
import { Clock, Setting2 } from "iconsax-reactjs";

// -----------------------------------------------------------------
// Specialty → Auto-switch patient mapping
// -----------------------------------------------------------------

const SPECIALTY_PATIENT_MAP = {
  gp: "__patient__",
  gynec: "apt-lakshmi",
  ophthal: "apt-anjali",
  obstetric: "apt-priya",
  pediatrics: "apt-arjun",
};

const SPECIALTY_OPTIONS = [
  { id: "gp", label: "GP" },
  { id: "gynec", label: "Gynec" },
  { id: "ophthal", label: "Ophthal" },
  { id: "obstetric", label: "Obstetric" },
  { id: "pediatrics", label: "Pediatrics" },
];

// -----------------------------------------------------------------
// Doctor View Type options
// -----------------------------------------------------------------

const DOCTOR_VIEW_OPTIONS = [
  { id: "specialist_first_visit", label: "Specialist", shortLabel: "Specialist" },
  { id: "treating_physician", label: "Treating Doctor", shortLabel: "Treating" },
  { id: "emergency_oncall", label: "Emergency", shortLabel: "Emergency" },
];

// -----------------------------------------------------------------
// Intake Mode options
// -----------------------------------------------------------------

const INTAKE_OPTIONS = [
  { id: "with_intake", label: "With previous intake" },
  { id: "without_intake", label: "Without previous intake" },
];

// -----------------------------------------------------------------
// AgentHeader — Clean, minimal header with unified dropdown
// -----------------------------------------------------------------

export function AgentHeader({
  activeSpecialty,
  onSpecialtyChange,
  onPatientChange,
  onClose,
  className,
  doctorViewType,
  onDoctorViewChange,
  showDoctorViewSelector,
  intakeMode = "with_intake",
  onIntakeModeChange,
  variant = "full",
  brandTitle,
  onViewSessionHistory,
  onOpenSettings,
}) {
  const isV0 = variant === "v0";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const activeSpecLabel =
    SPECIALTY_OPTIONS.find((o) => o.id === activeSpecialty)?.label ?? "GP";
  const activeDoctorLabel = DOCTOR_VIEW_OPTIONS.find(
    (o) => o.id === doctorViewType
  )?.shortLabel;
  const activeIntakeLabel =
    intakeMode === "with_intake" ? "Intake" : "No intake";

  const badgeParts = [activeSpecLabel];
  if (showDoctorViewSelector && activeDoctorLabel) {
    badgeParts.push(activeDoctorLabel);
  }

  function handleSpecialtySelect(id) {
    onSpecialtyChange(id);
    const patientId = SPECIALTY_PATIENT_MAP[id];
    if (patientId) {
      onPatientChange(patientId);
    }
  }

  return (
    <div className={cn(styles.headerRoot, className)}>
      {/* Header — transparent, floating tags */}
      <div className={cn(styles.headerBar, styles.headerBarFlex)}>
        {/* Left: Dr. Agent brand tag */}
        <div className={styles.leftZone}>
          <span className="vrx-agent-brand-tag relative flex items-center" style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 10, padding: "6px 12px 6px 6px" }}>
            <span
              className={cn(styles.brandIconWrapper)}
              aria-hidden
              style={{ position: "relative", display: "inline-flex", width: 24, height: 24, alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}
            >
              <img
                src="/new-assets/icons/dr-agent/agent-bg.svg"
                alt=""
                draggable={false}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
              <img
                src="/new-assets/icons/dr-agent/agent-spark.svg"
                alt=""
                draggable={false}
                style={{ position: "relative", zIndex: 10, width: 14, height: 14 }}
              />
            </span>
            <span className={cn(styles.brandTitle)}>
              {brandTitle ?? "VoiceRx"}
            </span>
          </span>

          {/* Unified Dropdown — demo only, hidden */}
          {false && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className={styles.dropdownTrigger}
              >
                {badgeParts.map((part, i) => (
                  <React.Fragment key={part}>
                    {i > 0 && <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>}
                    <span>{part}</span>
                  </React.Fragment>
                ))}
                <svg
                  width={8}
                  height={8}
                  viewBox="0 0 10 10"
                  fill="none"
                  style={{
                    flexShrink: 0,
                    transition: "transform 150ms",
                    transform: dropdownOpen ? "rotate(180deg)" : undefined,
                  }}
                >
                  <path
                    d="M2.5 3.75L5 6.25L7.5 3.75"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            className="vrx-agent-collapse-tag"
            style={{
              pointerEvents: "auto",
              display: "inline-flex",
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              color: "var(--tp-slate-700)",
              transition: "color 150ms ease",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Minimize agent"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 3v18" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M13 9l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      {/* da-* styles live in globals.css */}
    </div>
  );
}
