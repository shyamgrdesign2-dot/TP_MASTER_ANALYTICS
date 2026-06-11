import React, { useMemo, useState } from "react";
import { Copy, MessageQuestion } from "iconsax-reactjs";
import { cn, safeClipboardWrite } from "../../../../utils";
import { useTouchDevice } from "../../../../hooks/use-touch-device";
import { CardShell } from "../CardShell";
import { SectionSummaryBar } from "../SectionSummaryBar";
import { CopyIcon } from "../CopyIcon";
import { ActionableTooltip } from "../ActionableTooltip";
import styles from "./PatientReportedCard.module.scss";

function cleanText(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  return text && text !== "null" && text !== "undefined" ? text : "";
}

function detailFrom(values) {
  return values.map(cleanText).filter(Boolean).join(", ");
}

function parseMedication(value) {
  if (value && typeof value === "object") {
    const name = cleanText(value.name || value.medicine || value.medicine_name || value.lineItem);
    const detail = detailFrom([
      value.dosage,
      value.frequency,
      value.schedule,
      value.when,
      value.duration,
      value.notes || value.note,
    ]);
    return { name, detail };
  }

  const text = cleanText(value);
  if (!text) return null;
  const parenMatch = text.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) return { name: parenMatch[1].trim(), detail: parenMatch[2].trim() };
  return { name: text };
}

function parseHistory(value) {
  if (value && typeof value === "object") {
    const name = cleanText(value.name || value.history_name || value.lineItem || value.notes);
    const detail = detailFrom([
      value.duration || value.since,
      value.status,
      value.relation,
      value.notes || value.note,
    ]);
    return { name, detail };
  }

  const text = cleanText(value);
  if (!text) return null;
  const parenMatch = text.match(/^([^(]+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) return { name: parenMatch[1].trim(), detail: parenMatch[2].trim() };
  return { name: text };
}

function parseSymptom(value) {
  if (value && typeof value === "object") {
    const name = cleanText(value.name || value.symptom_name || value.lineItem);
    const detail = detailFrom([
      value.duration || value.since,
      value.severity,
      value.notes || value.note,
    ]);
    return { name, detail };
  }

  const text = cleanText(value);
  return text ? { name: text } : null;
}

function parseQuestion(value) {
  if (value && typeof value === "object") {
    const name = cleanText(value.question || value.name || value.notes || value.note || value.lineItem);
    return name ? { name } : null;
  }
  const text = cleanText(value);
  return text ? { name: text } : null;
}

function formatItem(item) {
  return item.detail ? `${item.name} (${item.detail})` : item.name;
}

function buildPatientReportedPayload(sectionId, items) {
  const labels = items.map(formatItem);
  const base = {
    sourceDateLabel: "Patient intake",
    targetSection: "rxpad",
  };

  switch (sectionId) {
    case "symptoms":
      return { ...base, symptoms: labels };
    case "medicalHistory":
      return { ...base, targetSection: "history", historyChangeSummaries: labels };
    case "currentMedications":
      return {
        ...base,
        medications: items.map((item) => ({
          medicine: item.name,
          unitPerDose: "",
          frequency: item.detail || "",
          when: "",
          duration: "",
          note: "",
        })),
      };
    case "questionsToDoctor":
      return { ...base, additionalNotes: labels.join("\n") };
    default:
      return { ...base, additionalNotes: labels.join("\n") };
  }
}

function buildPatientReportedAllPayload(groups) {
  const payload = {
    sourceDateLabel: "Patient intake",
    targetSection: "rxpad",
  };

  groups.forEach((group) => {
    const next = buildPatientReportedPayload(group.id, group.items);
    payload.symptoms = [...(payload.symptoms || []), ...(next.symptoms || [])];
    payload.historyChangeSummaries = [
      ...(payload.historyChangeSummaries || []),
      ...(next.historyChangeSummaries || []),
    ];
    payload.medications = [...(payload.medications || []), ...(next.medications || [])];
    payload.additionalNotes = [payload.additionalNotes, next.additionalNotes]
      .filter(Boolean)
      .join("\n") || undefined;
  });

  if (!payload.symptoms?.length) delete payload.symptoms;
  if (!payload.historyChangeSummaries?.length) delete payload.historyChangeSummaries;
  if (!payload.medications?.length) delete payload.medications;
  if (!payload.additionalNotes) delete payload.additionalNotes;
  return payload;
}

const SECTION_DEFS = [
  {
    id: "symptoms",
    icon: "symptoms",
    title: "Symptoms Reported",
    copyTooltip: "Copy symptoms to RxPad",
    getItems: (data) => (data.symptoms || []).map(parseSymptom),
  },
  {
    id: "medicalHistory",
    icon: "medical-history",
    title: "Medical History",
    copyTooltip: "Copy medical history to RxPad",
    getItems: (data) => [
      ...(data.medicalHistory || []).map(parseHistory),
      ...(data.allergies || []).map(cleanText).filter(Boolean).map((item) => ({ name: `Allergy: ${item}` })),
    ],
  },
  {
    id: "currentMedications",
    icon: "medications",
    title: "Current Medications",
    copyTooltip: "Copy medications to RxPad",
    getItems: (data) => (data.currentMedications || []).map(parseMedication),
  },
  {
    id: "questionsToDoctor",
    title: "Questions to Doctor",
    copyTooltip: "Copy questions to notes",
    getItems: (data) => (data.questionsToDoctor || []).map(parseQuestion),
  },
];

export function PatientReportedCard({ data, onCopy, defaultCollapsed = false }) {
  const isTouch = useTouchDevice();
  const [copiedKey, setCopiedKey] = useState(null);

  const activeSections = useMemo(() => {
    return SECTION_DEFS.map((section) => {
      const items = section.getItems(data || {}).filter((item) => item && cleanText(item.name));
      return items.length ? { ...section, items } : null;
    }).filter(Boolean);
  }, [data]);

  if (!activeSections.length) return null;

  const markCopied = (key, delay = 1500) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), delay);
  };

  const handleCopyItem = (sectionId, item, key) => {
    safeClipboardWrite(formatItem(item));
    onCopy?.(buildPatientReportedPayload(sectionId, [item]));
    markCopied(key);
  };

  const handleCopySection = (section) => {
    safeClipboardWrite(section.items.map(formatItem).join("\n"));
    onCopy?.(buildPatientReportedPayload(section.id, section.items));
    markCopied(`section-${section.id}`);
  };

  const handleCopyAll = () => {
    safeClipboardWrite(activeSections.flatMap((section) => section.items.map(formatItem)).join("\n"));
    onCopy?.(
      buildPatientReportedAllPayload(activeSections.map((section) => ({
        id: section.id,
        items: section.items,
      }))),
      { bulk: true }
    );
    markCopied("all", 1800);
  };

  return (
    <CardShell
      icon={
        <span
          className={styles.headerIcon}
          style={{ "--reported-patient-icon-url": 'url("/new-assets/icons/medical/clipboard-activity--bulk.svg")' }}
          aria-hidden="true"
        />
      }
      title="Reported by Patient"
      collapsible
      dataSources={["Patient Intake"]}
      defaultCollapsed={defaultCollapsed}
    >
      <div className={styles.sections}>
        {activeSections.map((section) => (
          <div key={section.id} className={styles.section}>
            <SectionSummaryBar
              label={section.title}
              icon={section.icon}
              iconSlot={
                section.id === "questionsToDoctor" ? (
                  <MessageQuestion
                    size={18}
                    variant="Bulk"
                    color="var(--tp-slate-500, #64748b)"
                    aria-hidden="true"
                  />
                ) : undefined
              }
              trailing={
                section.id === "questionsToDoctor" ? null : (
                  <ActionableTooltip
                    label={section.copyTooltip}
                    onAction={() => handleCopySection(section)}
                  >
                    <CopyIcon
                      size={14}
                      copied={copiedKey === `section-${section.id}`}
                      onClick={() => handleCopySection(section)}
                    />
                  </ActionableTooltip>
                )
              }
            />

            <ul className={styles.itemList}>
              {section.items.map((item, index) => {
                const itemKey = `${section.id}-${index}`;
                const canCopyItem = section.id !== "questionsToDoctor";
                const content = (
                  <span className={styles.itemText}>
                    <span className={styles.itemName}>{item.name}</span>
                    {item.detail ? <span className={styles.itemDetail}>({item.detail})</span> : null}
                  </span>
                );

                return (
                  <li key={itemKey} className={styles.item}>
                    <span className={styles.bullet} aria-hidden="true" />
                    {isTouch && canCopyItem ? (
                      <ActionableTooltip
                        label="Copy to RxPad"
                        onAction={() => handleCopyItem(section.id, item, itemKey)}
                      >
                        {content}
                      </ActionableTooltip>
                    ) : content}
                    {!isTouch && canCopyItem ? (
                      <span className={cn(styles.itemCopy, copiedKey === itemKey && styles.itemCopyVisible)}>
                        <ActionableTooltip
                          label={`Copy "${item.name}" to RxPad`}
                          onAction={() => handleCopyItem(section.id, item, itemKey)}
                        >
                          <CopyIcon
                            size={14}
                            copied={copiedKey === itemKey}
                            onClick={() => handleCopyItem(section.id, item, itemKey)}
                          />
                        </ActionableTooltip>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className={styles.footer}>
          <button
            type="button"
            onClick={handleCopyAll}
            className={cn(styles.copyAllBtn, copiedKey === "all" && styles.copyAllBtnCopied)}
          >
            {copiedKey === "all" ? (
              "Filled in your Rx"
            ) : (
              <>
                <Copy size={15} variant="Linear" className={styles.copyAllIcon} aria-hidden="true" />
                Copy all to RxPad
              </>
            )}
          </button>
        </div>
      </div>
    </CardShell>
  );
}
