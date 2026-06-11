import React, { useState } from "react";
import { cn, safeClipboardWrite } from "../../../../utils";
import { useTouchDevice } from "../../../../hooks/use-touch-device";
import { CardShell } from "../CardShell";
import { CopyIcon } from "../CopyIcon";
import { ActionableTooltip } from "../ActionableTooltip";
import { SectionSummaryBar } from "../SectionSummaryBar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../atoms/Tooltip";
import { AgentActionButton } from "../../../../atoms/AgentActionButton";
import { DocumentText } from "iconsax-reactjs";
import { pickVitalsRowForLabel } from "../../../../../../utils/vitalsHelpers";
import styles from "./VoiceStructuredRxCard.module.scss";

/** Format a VoiceRxItem to a plain text string for clipboard copy */
function formatVoiceItem(item) {
  if (typeof item === "string") return item;
  return item?.detail ? `${item.name} (${item.detail})` : item?.name || "";
}

function field(data, camelKey, snakeKey) {
  return data?.[camelKey] ?? data?.[snakeKey];
}

function sectionDigitizationKey(sectionId) {
  switch (sectionId) {
    case "vitals":
    case "vitalsAndBodyComposition":
    case "vitals_and_body_composition":
      return "vitals_and_body_composition";
    case "symptoms":
      return "symptoms";
    case "examination":
    case "examinations":
      return "examinations";
    case "diagnosis":
    case "diagnoses":
      return "diagnosis";
    case "medication":
    case "medications":
      return "medications";
    case "medicalHistory":
    case "medical_history":
    case "medical-history":
      return "medical_history";
    case "investigation":
    case "investigations":
    case "lab":
    case "labInvestigations":
    case "lab-investigation":
      return "lab_investigation";
    case "advice":
      return "advice";
    case "followUp":
    case "follow_up":
    case "follow-up":
      return "follow_up";
    default:
      return null;
  }
}

function isMedicalHistorySection(sectionId) {
  return ["medicalHistory", "medical_history", "medical-history"].includes(sectionId);
}

function isVitalsSection(sectionId) {
  return ["vitals", "vitalsAndBodyComposition", "vitals_and_body_composition"].includes(sectionId);
}

function getVitalsItemLabel(item) {
  const text = formatVoiceItem(item);
  return String(text || "").split(":")[0]?.trim().toLowerCase() || "";
}

function getSectionDigitizationRows(digitization, sectionId) {
  const key = sectionDigitizationKey(sectionId);
  if (!digitization || !key) return null;
  if (key === "vitals_and_body_composition") {
    const vitals = field(digitization, "vitalsAndBodyComposition", "vitals_and_body_composition") ?? digitization.vitals;
    return vitals && typeof vitals === "object" ? [vitals] : null;
  }
  if (key === "lab_investigation") {
    return field(digitization, "labInvestigation", "lab_investigation") ?? null;
  }
  if (key === "follow_up") {
    const followUp = field(digitization, "followUp", "follow_up");
    return followUp == null || String(followUp).trim() === "" ? null : [followUp];
  }
  if (key === "medical_history") {
    return field(digitization, "medicalHistory", "medical_history") ?? null;
  }
  return digitization[key] ?? null;
}

/**
 * Build a minimal RxPadCopyPayload for a single item (or list of items)
 * scoped to one section.
 */
function buildSectionPayload(sectionId, items, rawRows, options = {}) {
  const digitizationKey = sectionDigitizationKey(sectionId);
  const sideNavSignal = isMedicalHistorySection(sectionId)
    ? { sideNavSignalTarget: "history", sideNavSignalMode: "focused" }
    : isVitalsSection(sectionId)
      ? { sideNavSignalTarget: "vitals", sideNavSignalMode: "focused" }
      : {};
  if (digitizationKey && rawRows?.length) {
    return {
      sourceDateLabel: "Voice consult",
      targetSection: "rxpad",
      ...sideNavSignal,
      ...(digitizationKey === "vitals_and_body_composition" && options.vitalsCopyMode
        ? { vitalsCopyMode: options.vitalsCopyMode }
        : {}),
      digitization: {
        [digitizationKey]: digitizationKey === "vitals_and_body_composition" ? rawRows[0] : rawRows,
      },
    };
  }

  const labels = items.map(formatVoiceItem);
  const base = {
    sourceDateLabel: "Voice consult",
    targetSection: "rxpad",
  };
  switch (sectionId) {
    case "symptoms":
      return { ...base, symptoms: labels };
    case "examination":
    case "examinations":
      return { ...base, examinations: labels };
    case "diagnosis":
    case "diagnoses":
      return { ...base, diagnoses: labels };
    case "advice":
      return { ...base, advice: labels.join("\n") };
    case "investigation":
    case "investigations":
    case "lab":
    case "labInvestigations":
    case "lab-investigation":
      return { ...base, labInvestigations: labels };
    case "followUp":
    case "follow_up":
    case "follow-up":
      return { ...base, followUp: labels.join("; ") };
    case "medicalHistory":
    case "medical_history":
    case "medical-history":
      return {
        ...base,
        ...sideNavSignal,
        medicalHistory: labels.map((label) => ({
          type: "medical_history",
          name: label,
          lineItem: label,
        })),
      };
    case "history":
    case "historyChangeSummaries":
      return { ...base, historyChangeSummaries: labels };
    case "medication":
    case "medications":
      return {
        ...base,
        medications: items.map((it) => ({
          medicine: it.name,
          unitPerDose: "",
          frequency: "",
          when: "",
          duration: "",
          note: it.detail ?? "",
        })),
      };
    default:
      return { ...base, additionalNotes: labels.join("\n") };
  }
}

export function VoiceStructuredRxCard({ data, onCopy, onExpand, hideHeader, isStale = false }) {
  const isTouch = useTouchDevice();
  const [copiedKey, setCopiedKey] = useState(null);

  const isCanvasMode = !!hideHeader;

  const handleCopyItem = (sectionId, item, key, rawRow) => {
    safeClipboardWrite(formatVoiceItem(item));
    const payloadRow = isVitalsSection(sectionId) ? pickVitalsRowForLabel(rawRow, getVitalsItemLabel(item)) : rawRow;
    onCopy?.(buildSectionPayload(sectionId, [item], payloadRow ? [payloadRow] : null, { vitalsCopyMode: "item" }));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleCopySection = (sectionId, items, rawRows) => {
    const text = items.map(formatVoiceItem).join("\n");
    safeClipboardWrite(text);
    onCopy?.(buildSectionPayload(sectionId, items, rawRows, { vitalsCopyMode: "section" }));
    setCopiedKey(`section-${sectionId}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleExpand = () => {
    if (onExpand) {
      onExpand();
    } else {
      window.dispatchEvent(new CustomEvent("open-voicerx", { detail: { data } }));
    }
  };

  const innerContent = (
    <div className={styles.sectionsWrap}>
      {data.sections.map((section) => (
        <div key={section.sectionId}>
          <SectionSummaryBar
            label={section.title}
            icon={section.tpIconName || section.sectionId}
            trailing={
              copiedKey === `section-${section.sectionId}` ? (
                <TooltipProvider delayDuration={120}>
                  <Tooltip open>
                    <TooltipTrigger asChild>
                      <span className={cn(styles.filledFlash, "vrx-filled-flash")}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M5 12.5l4.5 4.5L19 7.5"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Filled
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6} className={styles.tooltipContent}>
                      {section.title} filled into RxPad
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className={styles.sectionCopyWrap}>
                  <ActionableTooltip
                    label={`Fill ${section.title.toLowerCase()} to RxPad`}
                    onAction={() => handleCopySection(
                      section.sectionId,
                      section.items,
                      getSectionDigitizationRows(data.copyAllPayload?.digitization, section.sectionId)
                    )}>
                    <CopyIcon
                      size={14}
                      onClick={() => handleCopySection(
                        section.sectionId,
                        section.items,
                        getSectionDigitizationRows(data.copyAllPayload?.digitization, section.sectionId)
                      )}
                    />
                  </ActionableTooltip>
                </span>
              )
            }
          />

          <ul className={styles.itemList}>
            {section.items.map((item, idx) => {
              const itemKey = `${section.sectionId}-${idx}`;
              const rawRows = getSectionDigitizationRows(data.copyAllPayload?.digitization, section.sectionId);
              const rawRow = sectionDigitizationKey(section.sectionId) === "vitals_and_body_composition"
                ? rawRows?.[0]
                : (Array.isArray(rawRows) ? rawRows[idx] : null);
              return (
                <li key={idx} className={styles.item}>
                  <span className={styles.bullet}>•</span>
                  {isTouch ? (
                    <ActionableTooltip
                      label="Copy to Rx"
                      onAction={() => handleCopyItem(section.sectionId, item, itemKey, rawRow)}>
                      <span className={styles.itemTextTouch}>
                        <span className={styles.itemName}>{item.name}</span>
                        {item.detail && (
                          <span className={styles.itemDetail}>({item.detail})</span>
                        )}
                      </span>
                    </ActionableTooltip>
                  ) : (
                    <span className={styles.itemText}>
                      <span className={styles.itemName}>{item.name}</span>
                      {item.detail && (
                        <span className={styles.itemDetail}>({item.detail})</span>
                      )}
                    </span>
                  )}

                  {!isTouch && (
                    <span
                      className={cn(
                        styles.itemCopyWrap,
                        copiedKey === itemKey ? styles.itemCopyVisible : styles.itemCopyHidden
                      )}>
                      {copiedKey === itemKey ? (
                        <TooltipProvider delayDuration={120}>
                          <Tooltip open>
                            <TooltipTrigger asChild>
                              <span className={cn(styles.filledFlash, "vrx-filled-flash")}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <path
                                    d="M5 12.5l4.5 4.5L19 7.5"
                                    stroke="currentColor"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                Filled
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={6} className={styles.tooltipContent}>
                              {section.title} filled into RxPad
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <ActionableTooltip
                          label="Fill to RxPad"
                          onAction={() => handleCopyItem(section.sectionId, item, itemKey, rawRow)}>
                          <CopyIcon
                            size={14}
                            onClick={() => handleCopyItem(section.sectionId, item, itemKey, rawRow)}
                          />
                        </ActionableTooltip>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  if (hideHeader) return innerContent;

  const handleCopyAll = () => {
    onCopy?.(data.copyAllPayload);
    setCopiedKey("all");
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div
      className={isStale ? styles.stale : undefined}
      aria-disabled={isStale || undefined}>
      <CardShell
        icon={<DocumentText size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
        title={isStale ? "Structured Clinical Notes (outdated)" : "Structured Clinical Notes"}
        collapsible={false}
        dataSources={["Voice consultation"]}>

        {!isStale ? (
          <AgentActionButton
            onClick={handleExpand}
            className={styles.expandBtn}
            text="View clinical notes"
            variant="secondary"
            suffixIcon={<svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none">
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>}
          />
        ) : (
          <p className={styles.staleText}>
            Replaced by a newer recording below.
          </p>
        )}
      </CardShell>
    </div>
  );
}
