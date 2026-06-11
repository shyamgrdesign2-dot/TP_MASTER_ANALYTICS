import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { useDispatch, useSelector } from "react-redux";
import { useVirtualizer } from "@tanstack/react-virtual";
import moment from "moment";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  ArrowDown2,
  ArrowSquareDown,
  ArrowSquareUp,
  Calendar2,
  Copy,
  DocumentText,
  Eye,
  Note1,
  Printer,
  Ruler,
  SidebarLeft,
} from "iconsax-reactjs";
import { VoiceRxIcon } from "../dr-agent/voicerx/voice-consult-icons";
import { AgentActionButton } from "../dr-agent/atoms/AgentActionButton";
import ZydusLabParametersList from "../ZydusLabParametersList";
import { VoiceRecorderCore } from "../dr-agent/voicerx/VoiceRecorderCore";
import RecordCard from "../../pages/medicalRecords/components/recordCard/RecordCard";
import CashManagerContext from "../../context/CashManagerContext";
import { useAccess } from "../../pages/vaccination/useAccess";
import { getOverridenDueDate, getPatientVaccineDetails, getVaccineBrands, getVaccineTemplates } from "../../pages/vaccination/service";
import { mergeDataPatientDetails } from "../../pages/vaccination/VaccinationHelper";
import { getAllOpthalPrescriptions } from "../../pages/ophthalmology/service";
import { getAllGrowthChartParams, getParentalDetails } from "../../pages/growthChart/service";
import {
  dummyData,
  getGrowthChartData,
  getMidParentalHeight,
} from "../../pages/growthChart/growthChartHelper";
import growthChartStaticData from "../../pages/growthChart/GrowthChart.json";
import ApiCaseManager from "../../api/services/ApiCaseManager";
import { usePrintPayloadPdf } from "../../hooks/usePrintPayloadPdf";
import { ASSETS } from "../../assets";
import { buildClinicalApiHeaders, joinAgentModuleApiUrl } from "../dr-agent/voicerx/api/clinical-api";
import { PRIVATE_NOTES_TRANSCRIPTION_PROMPT, transcribeAnyAudio } from "../dr-agent/voicerx/api/agent-audio-service";
import { useRxPadSync } from "../dr-agent/rxpad/dr-agent/RxPadSyncContext";
import { toast } from "../dr-agent/voicerx/toast";
import { useEdgeSwipeNavigation } from "./useEdgeSwipeNavigation";
import {
  findMatchingMedicalHistoryTag,
  mergeMedicalHistoryTagsBySection,
  tagsAreDuplicateForHistoryMerge,
} from "../../utils/medicalHistoryUtils";
import { convertAgentMedicalHistoryRowsToSections } from "../../utils/medicalHistoryConverters";
import { getVitalsRowDate, getVitalsRowSortId } from "../../utils/vitalsHelpers";
import { addEditPrivateNotes, listSectionwithTag } from "../../redux/medicalhistorySlice";
import { setPastVisitRows, appendPastVisitRows, setPastVisitDetail, setPrescriptionPayload, clearPastVisits } from "../../redux/pastVisitsSlice";
import { SIDE_NAVBAR_DIGITIZATION_RESPONSE_CONTRACT } from "./mock/sideNavbarDigitizationContract";
import "./sideNavbar.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip, Legend, Filler);

const LEGACY_VITALS_DATE_FORMAT = "DD MMM, YY";

const NAV_ITEMS = [
  { id: "pastVisits", label: "Past Visits", icon: { kind: "iconsax", Icon: Note1 } },
  { id: "vitals", label: "Vitals", icon: { kind: "medical", name: "heart-rate" } },
  { id: "history", label: "History", icon: { kind: "medical", name: "clipboard-activity" } },
  { id: "labResults", label: "Lab Results", icon: { kind: "medical", name: "lab" } },
  { id: "medicalRecords", label: "Records", icon: { kind: "medical", name: "health-file-03" } },
  { id: "gynec", label: "Gynec", icon: { kind: "medical", name: "gynec" } },
  { id: "obstetric", label: "Obstetric", icon: { kind: "medical", name: "obstetric" } },
  { id: "vaccine", label: "Vaccine", icon: { kind: "medical", name: "injection" } },
  { id: "growth", label: "Growth", icon: { kind: "iconsax", Icon: Ruler } },
  { id: "optal", label: "Ophthal", icon: { kind: "iconsax", Icon: Eye } },
  { id: "personalNotes", label: "Private Notes", icon: { kind: "iconsax", Icon: DocumentText } },
  { id: "zydusLabReports", label: "Zydus Reports", icon: { kind: "medical", name: "lab" } },
];

const NAV_ITEM_BY_ID = NAV_ITEMS.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});
const SIDE_NAV_BATCH_SIZE = 3;
const PAST_VISITS_BATCH_SIZE = 5;

function getCustomizedPadNavId(item, access = {}) {
  if (!item || item.tmdpm_status !== 0) return null;

  switch (Number(item.tmdpm_id)) {
    case 1:
      return "vitals";
    case 3:
      return access.isGynaecHistoryAccessable ? "gynec" : "history";
    case 7:
      return access.isVaccinationAccessable ? "vaccine" : null;
    case 8:
      return "personalNotes";
    case 16:
      return access.isGrowthChartAccessable ? "growth" : null;
    case 17:
      return access.isGynaecHistoryAccessable ? "obstetric" : null;
    case 18:
      return "medicalRecords";
    case 19:
      return "labResults";
    default:
      return null;
  }
}

const SECTION_TITLES = {
  pastVisits: "Past Visit",
  vitals: "Vitals and Body Composition",
  history: "Medical History",
  labResults: "Lab Results",
  medicalRecords: "Medical Records",
  gynec: "Gynec History",
  obstetric: "Obstetric History",
  vaccine: "Vaccination History",
  growth: "Growth",
  optal: "Ophthal History",
  personalNotes: "Private Notes",
  zydusLabReports: "Zydus Reports",
};

const SIDE_NAV_MODULE_NAMES = {
  // vitals: "vitals_body",
  history: "medical_history",
  // labResults: "lab_investigations",
};

const SIDE_NAV_SUPPORTED_VOICE_SECTIONS = new Set(Object.keys(SIDE_NAV_MODULE_NAMES));
const SIDE_NAV_SIGNAL_SECTIONS = new Set(["vitals", "history", "gynec", "obstetric"]);
const SIDE_NAV_PRIVATE_NOTES_SECTION = "personalNotes";
const SIDE_NAV_MODULE_ENDPOINT = "/agents/module";
const SIDE_NAV_SHINER_DELAY_MS = 5000;
const SIDE_NAV_MODULE_TIMEOUT_MS = 120000;

function isSideNavVoiceSupported(sectionId) {
  return sectionId === SIDE_NAV_PRIVATE_NOTES_SECTION || SIDE_NAV_SUPPORTED_VOICE_SECTIONS.has(sectionId);
}

const VITAL_DISPLAY_FIELDS = [
  { key: "temperature", label: "Temperature", unit: "Frh" },
  { key: "pulse", label: "Pulse", unit: "/min" },
  { key: "respiratoryRate", label: "Resp. Rate", unit: "/min" },
  { key: "systolic", label: "Systolic", unit: "mmhg" },
  { key: "diastolic", label: "Diastolic", unit: "mmhg" },
  { key: "spo2", label: "SpO2", unit: "%" },
  { key: "randomBloodSugar", label: "RBS", unit: "mg/dL" },
  { key: "height", label: "Height", unit: "cms" },
  { key: "weight", label: "Weight", unit: "kgs" },
  { key: "bmi", label: "BMI", unit: "kg/m2" },
  { key: "bmr", label: "BMR", unit: "kcals" },
  { key: "bsa", label: "BSA", unit: "m2" },
  { key: "fib4", label: "FIB-4", unit: "" },
];

const VITAL_SIGNAL_VALUE_KEYS = [
  "temperature",
  "temp",
  "pulse",
  "pres",
  "respiratory_rate",
  "respiratoryRate",
  "resp_rate",
  "blood_pressure",
  "blood_press",
  "systolic",
  "diastolic",
  "spo2",
  "random_blood_sugar",
  "randomBloodSugar",
  "general_rbs",
  "height",
  "weight",
  "head_circumference",
  "ofc",
  "waist_circumference",
  "waistCircumference",
  "bmi",
  "bmr",
  "bsa",
  "fib4",
];

function legacyVitalHasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function formatLegacyVitalDate(date) {
  if (!date) return "Current Visit";
  const parsed = moment(date);
  return parsed.isValid() ? parsed.format(LEGACY_VITALS_DATE_FORMAT) : String(date);
}

function normalizeSideNavDateKey(date) {
  if (!date) return "";
  const parsed = moment(date, [
    moment.ISO_8601,
    "YYYY-MM-DD",
    "YYYY/MM/DD",
    "DD-MM-YYYY",
    "DD/MM/YYYY",
    "DD MMM YYYY",
    "DD MMM, YYYY",
    "DD MMM, YY",
    "DD MMM'YY",
  ], true);
  const fallback = parsed.isValid() ? parsed : moment(date);
  return fallback.isValid() ? fallback.format("YYYY-MM-DD") : String(date).trim().toLowerCase();
}

function formatOpthalDate(date) {
  if (!date) return "Consultation";
  const parsed = moment(date);
  return parsed.isValid() ? parsed.format("DD MMM'YY") : String(date);
}

function parsePatientDobForGrowth(patientData) {
  const candidates = [
    patientData?.pm_dob,
    patientData?.patient_dob,
    patientData?.DOB,
    patientData?.dob,
  ].filter(Boolean);
  const formats = ["YYYY-MM-DD", "DD/MM/YYYY", "Do MMMM YYYY", "DD-MM-YYYY", moment.ISO_8601];
  for (const value of candidates) {
    const parsed = moment(value, formats, true);
    if (parsed.isValid()) return parsed;
    const loose = moment(value);
    if (loose.isValid()) return loose;
  }
  return null;
}

function parsePatientDobForVaccines(patientData) {
  const candidates = [
    patientData?.vac_dob,
    patientData?.pm_dob,
    patientData?.patient_dob,
    patientData?.DOB,
    patientData?.dob,
  ].filter(Boolean);
  const formats = ["DD-MMM-YYYY", "Do MMMM YYYY", "YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", moment.ISO_8601];
  for (const value of candidates) {
    const parsed = moment(value, formats, true);
    if (parsed.isValid()) return parsed.toDate();
    const loose = moment(value);
    if (loose.isValid()) return loose.toDate();
  }
  return "";
}

function formatFixedVitalValue(value) {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? String(value) : parsed.toFixed(2);
}

function addLegacyVitalRow(rows, item, key, label, unit, formatter) {
  const value = item?.[key];
  if (!legacyVitalHasValue(value)) return;
  rows.push({
    label,
    unit,
    value: formatter ? formatter(value) : String(value),
  });
}

function addLegacyBloodPressureRows(rows, item) {
  const bloodPressure = item?.blood_press;
  if (!legacyVitalHasValue(bloodPressure)) return;
  const [systolic, diastolic] = String(bloodPressure).split("/");
  if (legacyVitalHasValue(systolic)) {
    rows.push({ label: "Systolic", unit: "mmHg", value: systolic });
  }
  if (legacyVitalHasValue(diastolic)) {
    rows.push({ label: "Diastolic", unit: "mmHg", value: diastolic });
  }
}

function addLegacyPediatricVitals(rows, item) {
  addLegacyVitalRow(rows, item, "weight", "Weight", "kgs");
  addLegacyVitalRow(rows, item, "height", "Height", "cms");
  addLegacyVitalRow(rows, item, "ofc", "OFC", "cms");
}

function addLegacyAdultVitals(rows, item) {
  addLegacyVitalRow(rows, item, "ofc", "OFC", "cms");
  addLegacyVitalRow(rows, item, "height", "Height", "cms");
  addLegacyVitalRow(rows, item, "weight", "Weight", "kgs");
}

function buildLegacyVitalRows(item, isPediatricAccessable) {
  const rows = [];

  if (isPediatricAccessable) addLegacyPediatricVitals(rows, item);

  addLegacyVitalRow(rows, item, "temp", "Temperature", "Frh");
  addLegacyVitalRow(rows, item, "pres", "Pulse", "/min");
  addLegacyVitalRow(rows, item, "resp_rate", "Resp. Rate", "/min");
  addLegacyBloodPressureRows(rows, item);
  addLegacyVitalRow(rows, item, "spo2", "SPO2", "%");
  addLegacyVitalRow(rows, item, "general_rbs", "General RBS", "mg/dl");
  addLegacyVitalRow(rows, item, "fib4", "FIB4", "");
  addLegacyVitalRow(rows, item, "waist_circumference", "Waist Circumference", "cms");

  if (!isPediatricAccessable) addLegacyAdultVitals(rows, item);

  addLegacyVitalRow(rows, item, "bmi", "BMI", "kg/m²", formatFixedVitalValue);
  addLegacyVitalRow(rows, item, "bmr", "BMR", "kcals", formatFixedVitalValue);
  addLegacyVitalRow(rows, item, "bsa", "BSA", "m²", formatFixedVitalValue);

  return rows;
}

function sortLegacyVitalEntriesByDate(entries = []) {
  return [...entries].sort((a, b) => {
    const aDate = moment(a.sortDate);
    const bDate = moment(b.sortDate);
    if (aDate.isValid() && bDate.isValid()) {
      const dateDiff = bDate.valueOf() - aDate.valueOf();
      if (dateDiff !== 0) return dateDiff;
      const aSortId = getVitalsRowSortId(a.item);
      const bSortId = getVitalsRowSortId(b.item);
      const idDiff = bSortId - aSortId;
      if (aSortId > 0 && bSortId > 0 && idDiff !== 0) return idDiff;
      return (b.sourceIndex ?? b.index ?? 0) - (a.sourceIndex ?? a.index ?? 0);
    }
    if (aDate.isValid()) return -1;
    if (bDate.isValid()) return 1;
    return (b.sourceIndex ?? b.index ?? 0) - (a.sourceIndex ?? a.index ?? 0);
  });
}

function buildLegacyVitalsEntries({
  vitalsData = [],
  vitalsPastList = [],
  patientBirthWeight,
  patientData,
  isPediatricAccessable,
}) {
  const entries = [];
  const birthWeight = vitalsData?.[0]?.patient_birth_weight || patientBirthWeight;

  const collectVitalItem = (item, index, source, sourceIndex) => {
    const rows = buildLegacyVitalRows(item, isPediatricAccessable);
    if (!rows.length) return;
    const itemDate = getVitalsRowDate(item);
    entries.push({
      source,
      index,
      sourceIndex,
      item,
      sortDate: itemDate,
    });
  };

  if (
    patientData?.ageMonths <= 12 &&
    patientData?.ageYears === 0 &&
    legacyVitalHasValue(birthWeight)
  ) {
    entries.push({
      id: "legacy-vitals-birth-weight",
      dateLabel: "Birth Weight",
      rows: [{ label: "Patient Birth weight", unit: "kgs", value: String(birthWeight) }],
    });
  }

  vitalsData.forEach((item, index) => {
    collectVitalItem(item, index, "today", index);
  });

  vitalsPastList.forEach((item, index) => {
    collectVitalItem(item, index, "past", vitalsData.length + index);
  });

  return [
    ...entries.filter((entry) => entry.id === "legacy-vitals-birth-weight"),
    ...sortLegacyVitalEntriesByDate(entries.filter((entry) => entry.id !== "legacy-vitals-birth-weight"))
      .map(({ item, index, source, sortDate }) => {
        const rows = buildLegacyVitalRows(item, isPediatricAccessable);
        return {
          id: `legacy-vitals-${source}-${item?.tcv_id || item?.tcbc_id || item?.dev_unique_id || item?.pam_id || sortDate || index}-${index}`,
          dateLabel: formatLegacyVitalDate(sortDate),
          rows,
        };
      })
      .filter((entry) => entry.rows.length),
  ];
}

function legacyHistoryHasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function legacyHistoryEnableState(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key) return "";
  if (["y", "yes", "true", "active", "inactive", "present", "positive"].includes(key)) return "Y";
  if (["n", "no", "false", "absent", "negative"].includes(key)) return "N";
  return value;
}

function legacyHistoryStatus(sectionId, tag) {
  if (legacyHistoryHasValue(tag?.status)) return tag.status;
  if (sectionId === 3 || sectionId === 5) return "";
  const key = String(tag?.enable || "").trim().toLowerCase();
  if (key === "active") return "Active";
  if (key === "inactive") return "Inactive";
  return "";
}

function legacyHistoryDetailParts(sectionId, tag) {
  const parts = [];

  if (sectionId !== 5 && legacyHistoryHasValue(tag?.since)) {
    parts.push(`Since: ${tag.since}`);
  }
  if (sectionId === 5 && legacyHistoryHasValue(tag?.date)) {
    parts.push(`Date of Surgery: ${tag.date}`);
  }
  if (sectionId !== 3 && sectionId !== 5) {
    const status = legacyHistoryStatus(sectionId, tag);
    if (legacyHistoryHasValue(status)) parts.push(`Status: ${status}`);
    if (legacyHistoryHasValue(tag?.medication)) parts.push(`Medication: ${tag.medication}`);
  }
  if (sectionId === 3 && legacyHistoryHasValue(tag?.relationship)) {
    parts.push(`Relationship: ${tag.relationship}`);
  }
  if (legacyHistoryHasValue(tag?.note)) {
    parts.push(`${sectionId === 5 ? "Remarks" : "Note"}: ${tag.note}`);
  }
  if (legacyHistoryHasValue(tag?.medical_history_remarks)) {
    parts.push(`Additional History: ${tag.medical_history_remarks}`);
  }

  return parts;
}

function buildLegacyMedicalHistorySections(medicalHistoryData = []) {
  const sections = [];

  medicalHistoryData.forEach((section, index) => {
    const tags = Array.isArray(section?.tags) ? section.tags : [];
    if (!section?.no_know_history && tags.length === 0) return;

    const sectionId = section?.tmmhs_id;
    const enabledItems = tags
      .filter((tag) => {
        const enableState = legacyHistoryEnableState(tag?.enable);
        return enableState === "Y" || (enableState !== "N" && legacyHistoryDetailParts(sectionId, tag).length > 0);
      })
      .map((tag, tagIndex) => {
        const detail = legacyHistoryDetailParts(sectionId, tag).join(" | ");
        return {
          id: `legacy-history-${index}-enabled-${tagIndex}`,
          name: tag?.title || "",
          detail,
        };
      });
    const disabledItems = tags
      .filter((tag) => legacyHistoryEnableState(tag?.enable) === "N")
      .map((tag, tagIndex) => ({
        id: `legacy-history-${index}-disabled-${tagIndex}`,
        name: `No ${tag?.title || ""}`,
      }));
    const items = section?.no_know_history
      ? [{ id: `legacy-history-${index}-none`, name: "No known history" }]
      : [...enabledItems, ...disabledItems];

    sections.push({
      id: `legacy-history-section-${section?.tmmhs_id || index}`,
      title: section?.title || "Medical History",
      items,
    });
  });

  if (legacyHistoryHasValue(medicalHistoryData?.[0]?.medical_history_remarks)) {
    sections.push({
      id: "legacy-history-additional",
      title: "Additional History",
      items: [{ id: "legacy-history-additional-remarks", name: medicalHistoryData[0].medical_history_remarks }],
    });
  }

  return sections;
}

const CATEGORY_TO_FILTER = {
  Pathology: "Pathology",
  Radiology: "Radiology",
  Prescription: "Prescription",
  "Zydus Lab": "Pathology",
  "Zydus Radio": "Radiology",
};

const CATEGORY_TO_IMG_TYPE = {
  Pathology: "pathology-img",
  Radiology: "radiology-pdf",
  Prescription: "prescription-img",
  "Zydus Lab": "pathology-img",
  "Zydus Radio": "radiology-pdf",
};

function resolveCategoryName(categoryId, uploadDocCategories = []) {
  if (categoryId === -2) return "Zydus Lab";
  if (categoryId === -3) return "Zydus Radio";
  return uploadDocCategories.find((c) => c.category_id === categoryId)?.category_name || "Other";
}

function buildLegacyMedicalRecords(allUploadedDocs = [], uploadDocCategories = []) {
  return allUploadedDocs.map((doc, index) => {
    const categoryName = resolveCategoryName(doc.category_id, uploadDocCategories);
    const isPdf = doc.url?.toLowerCase().includes(".pdf");
    const imgType = isPdf && CATEGORY_TO_IMG_TYPE[categoryName] === "prescription-img"
      ? "pdf"
      : CATEGORY_TO_IMG_TYPE[categoryName] || "pdf";
    const dateFormatted = doc.investigation_date
      ? moment(doc.investigation_date).format("DD MMM'YY")
      : "";
    return {
      id: doc.id ? String(doc.id) : `legacy-rec-${index}`,
      label: doc.display_name || categoryName,
      date: dateFormatted,
      filterType: CATEGORY_TO_FILTER[categoryName] || "Other",
      imgType,
      thumbnailUrl: doc.thumbnail_url || (!isPdf ? doc.url : null),
      fileUrl: doc.url || null,
      categoryName,
    };
  });
}

function extractLabNumericValue(raw) {
  if (!raw && raw !== 0) return "--";
  const str = String(raw).trim();
  const match = str.match(/[\d]+(?:[.,]\d+)?/);
  return match ? match[0] : str;
}

function buildLegacyLabEntries(labParamsData = []) {
  const sorted = [...labParamsData].sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted.reduce((entries, entry) => {
    const rows = (entry.inputs || [])
      .filter((input) => input.testName && input.testName !== "Remarks")
      .map((input) => ({
        label: input.testName,
        unit: input.units ? `(${input.units})` : "",
        value: extractLabNumericValue(input.value),
        abnormal: Boolean(input.arrowDirection),
        direction: input.arrowDirection === "up" ? "high" : input.arrowDirection === "down" ? "low" : undefined,
      }));
    if (!rows.length) return entries;
    entries.push({
      id: `legacy-lab-${entry.date || entries.length}`,
      dateLabel: formatLegacyVitalDate(entry.date),
      rows,
    });
    return entries;
  }, []);
}

function legacyArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstLegacyText(item, keys) {
  if (typeof item === "string") return item;
  const key = keys.find((candidate) => hasValue(item?.[candidate]));
  return key ? String(item[key]) : "";
}

function firstTextValue(...values) {
  const value = values.find(hasValue);
  return value === undefined ? "" : String(value).trim();
}

function legacyDetail(item, keys) {
  if (!item || typeof item === "string") return "";
  return keys
    .map((key) => item?.[key])
    .filter(hasValue)
    .map((value) => String(value))
    .join(" | ");
}

function legacyVisitRows(items, labelKeys, detailKeys) {
  return legacyArray(items)
    .map((item) => ({
      label: firstLegacyText(item, labelKeys),
      detail: legacyDetail(item, detailKeys),
    }))
    .filter((item) => item.label);
}

function buildPastVisitMedicalHistorySections(items) {
  const rows = legacyArray(items);
  if (!rows.length) return [];

  const hasSectionShape = rows.some((section) => (
    Array.isArray(section?.tags) ||
    section?.no_know_history !== undefined ||
    section?.tmmhs_id !== undefined ||
    hasValue(section?.medical_history_remarks)
  ));

  if (hasSectionShape) {
    return buildLegacyMedicalHistorySections(rows);
  }

  const convertedSections = buildLegacyMedicalHistorySections(convertAgentMedicalHistoryRowsToSections(rows));
  if (convertedSections.length) return convertedSections;

  const fallbackRows = legacyVisitRows(
    rows,
    ["name", "title", "label"],
    ["relationship", "since", "duration", "status", "medication", "notes", "note", "detail"]
  );
  return fallbackRows.length ? [{
    id: "past-visit-medical-history",
    title: "Medical History",
    items: fallbackRows.map((item, index) => ({
      id: `past-visit-medical-history-${index}`,
      name: item.label,
      detail: item.detail,
    })),
  }] : [];
}

function buildPastVisitMedicalHistoryRows(items) {
  return buildPastVisitMedicalHistorySections(items).flatMap((section, sectionIndex) => (
    legacyArray(section?.items).map((item, itemIndex) => {
      if (section?.title === "Additional History") {
        return {
          label: "Additional History",
          detail: item?.name || item?.detail || "",
        };
      }

      const label = item?.name || section?.title || "";
      const sectionDetail = section?.title && section.title !== label ? section.title : "";
      return {
        label,
        detail: [sectionDetail, item?.detail].filter(hasValue).join(" | "),
        id: item?.id || `past-visit-history-${sectionIndex}-${itemIndex}`,
      };
    })
  )).filter((item) => item.label || item.detail);
}

function formatPastVisitModuleRow(content, module, index) {
  const entries = Object.entries(content || {})
    .filter(([key, value]) => key !== "id" && hasValue(value));
  if (!entries.length) return null;

  const preferredLabelKeys = ["title", "name", "label", "lineItem"];
  const labelEntry = entries.find(([key]) => preferredLabelKeys.includes(key)) || entries[0];
  const detailEntries = entries.filter(([key]) => key !== labelEntry[0]);
  const detail = detailEntries
    .map(([key, value]) => {
      if (key === "notes" || key === "note") return value;
      return `${key}: ${value}`;
    })
    .join(" | ");

  return {
    label: String(labelEntry[1] || "").trim() || `${module?.module_name || module?.name || "Module"} row ${index + 1}`,
    detail,
    raw: content,
  };
}

function buildPastVisitModuleSections(items) {
  return legacyArray(items).map((module, moduleIndex) => {
    const rows = legacyArray(module?.content)
      .map((content, rowIndex) => formatPastVisitModuleRow(content, module, rowIndex))
      .filter(Boolean);
    if (!rows.length) return null;
    return {
      id: module?.module_id || module?.id || `module-${moduleIndex}`,
      title: module?.module_name || module?.name || module?.title || `Module ${moduleIndex + 1}`,
      raw: module,
      rows,
    };
  }).filter(Boolean);
}

function buildPastVisitModuleRows(items) {
  return buildPastVisitModuleSections(items).flatMap((moduleSection) => (
    moduleSection.rows.map((row) => ({
      label: moduleSection.title,
      detail: [row.label, row.detail].filter(hasValue).join(" | "),
    }))
  ));
}

function isPastVisitModuleContentItem(item) {
  return Boolean(item?.module_id && Array.isArray(item?.content));
}

function getPastVisitModuleContentSource(payload = {}) {
  const directModules = legacyArray(payload.moduleContents || payload.module_contents);
  if (directModules.length) return directModules;
  return legacyArray(payload.others).filter(isPastVisitModuleContentItem);
}

function getPastVisitAdditionalNotesSource(payload = {}) {
  return legacyArray(payload.others).filter((item) => !isPastVisitModuleContentItem(item));
}

function buildPastVisitAdviceRows(value) {
  return legacyArray(value)
    .map((item) => {
      const label = typeof item === "string" || typeof item === "number"
        ? String(item).trim()
        : firstLegacyText(item, ["advice_name", "advice", "notes", "note", "name", "lineItem", "label", "title"]);
      if (!label) return null;
      return {
        ...(isObject(item) ? item : {}),
        payload: item,
        label,
        detail: "",
      };
    })
    .filter(Boolean);
}

function getPastVisitLookupList(source, key) {
  return legacyArray(
    source?.[key] ||
      source?.data?.[key] ||
      source?.data?.data?.[key] ||
      source?.printPayload?.[key] ||
      source?.printPayload?.data?.[key] ||
      source?.printPayload?.data?.data?.[key]
  );
}

function isValidMongoId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

function getPastVisitSmartPrescriptionFilename(...sources) {
  return firstTextValue(
    ...sources.filter(Boolean).flatMap((source) => [
      source?.smart_prescription_filename,
      source?.caseManagerData?.smart_prescription_filename,
      source?.data?.smart_prescription_filename,
      source?.data?.caseManagerData?.smart_prescription_filename,
      source?.data?.data?.smart_prescription_filename,
      source?.data?.data?.caseManagerData?.smart_prescription_filename,
      source?.printPayload?.smart_prescription_filename,
      source?.printPayload?.caseManagerData?.smart_prescription_filename,
      source?.printPayload?.data?.smart_prescription_filename,
      source?.printPayload?.data?.caseManagerData?.smart_prescription_filename,
      source?.printPayload?.data?.data?.smart_prescription_filename,
      source?.printPayload?.data?.data?.caseManagerData?.smart_prescription_filename,
    ])
  );
}

function getPastVisitRxSourceType(...sources) {
  const smartFile = getPastVisitSmartPrescriptionFilename(...sources);
  if (!smartFile) return "normal";

  const smartFileText = smartFile.toLowerCase();
  if (smartFileText.includes("snap_rx")) return "snapRx";
  if (smartFileText.includes("tab_rx")) return "tabRx";
  if (smartFileText.includes(".jpeg")) return "smartRx";
  if (isValidMongoId(smartFile)) return "voiceRx";
  return "normal";
}

function shouldShowPastVisitRxModeTabs(rxSourceType) {
  return rxSourceType === "smartRx" || rxSourceType === "snapRx" || rxSourceType === "tabRx";
}

function maybeParseJsonObject(value) {
  if (isObject(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return isObject(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function getPastVisitSmartDigitizeData(consultation) {
  const smartData = consultation?.smartDigitizeRxData ||
    consultation?.smart_digitize_rx_data ||
    consultation?.caseManagerData?.smartDigitizeRxData ||
    consultation?.caseManagerData?.smart_digitize_rx_data ||
    consultation?.data?.smartDigitizeRxData ||
    consultation?.data?.smart_digitize_rx_data ||
    consultation?.data?.caseManagerData?.smartDigitizeRxData ||
    consultation?.data?.caseManagerData?.smart_digitize_rx_data ||
    consultation?.data?.data?.smartDigitizeRxData ||
    consultation?.data?.data?.smart_digitize_rx_data ||
    consultation?.data?.data?.caseManagerData?.smartDigitizeRxData ||
    consultation?.data?.data?.caseManagerData?.smart_digitize_rx_data ||
    consultation?.printPayload?.smartDigitizeRxData ||
    consultation?.printPayload?.smart_digitize_rx_data ||
    consultation?.printPayload?.caseManagerData?.smartDigitizeRxData ||
    consultation?.printPayload?.caseManagerData?.smart_digitize_rx_data ||
    consultation?.printPayload?.data?.smartDigitizeRxData ||
    consultation?.printPayload?.data?.smart_digitize_rx_data ||
    consultation?.printPayload?.data?.caseManagerData?.smartDigitizeRxData ||
    consultation?.printPayload?.data?.caseManagerData?.smart_digitize_rx_data ||
    consultation?.printPayload?.data?.data?.smartDigitizeRxData ||
    consultation?.printPayload?.data?.data?.smart_digitize_rx_data ||
    consultation?.printPayload?.data?.data?.caseManagerData?.smartDigitizeRxData ||
    consultation?.printPayload?.data?.data?.caseManagerData?.smart_digitize_rx_data ||
    consultation?.printPayload?.response?.smartDigitizeRxData ||
    consultation?.printPayload?.response?.smart_digitize_rx_data ||
    null;
  return maybeParseJsonObject(smartData) || smartData;
}

function unwrapDigitizePayload(value) {
  const parsedValue = maybeParseJsonObject(value) || value;
  if (!isObject(parsedValue)) return null;
  const valueWithRxEdited = maybeParseJsonObject(parsedValue.rxDigitizeEditedData) || parsedValue.rxDigitizeEditedData;
  const valueWithVoiceEdited = maybeParseJsonObject(parsedValue.voiceRxDigitizeEditedData) || parsedValue.voiceRxDigitizeEditedData;
  const candidate = valueWithRxEdited ||
    parsedValue.editedData ||
    valueWithVoiceEdited ||
    parsedValue.digitizeData ||
    parsedValue.refinedData ||
    parsedValue.payload ||
    parsedValue.prescription ||
    parsedValue;
  const normalizedCandidate = maybeParseJsonObject(candidate) || candidate;
  if (!isObject(normalizedCandidate)) return null;
  const numericKeys = Object.keys(normalizedCandidate).filter((key) => /^\d+$/.test(key));
  if (numericKeys.length && isObject(normalizedCandidate[numericKeys[0]])) return normalizedCandidate[numericKeys[0]];
  return normalizedCandidate;
}

function getPastVisitSmartDigitalPayload(consultation) {
  const smartData = getPastVisitSmartDigitizeData(consultation);
  if (!isObject(smartData)) return null;
  const direct = unwrapDigitizePayload(smartData.rxDigitizeEditedData) ||
    unwrapDigitizePayload(smartData.voiceRxDigitizeEditedData);
  if (direct) return direct;
  const fallbacks = [
    smartData.rxDigitizeEditedData,
    smartData.editedData,
    smartData.voiceRxDigitizeEditedData,
    smartData.digitizeData,
    smartData.refinedData,
    smartData.digitize,
    smartData.history?.[smartData.history.length - 1]?.digitize,
    smartData.history?.[0]?.digitize,
  ];
  return fallbacks.map(unwrapDigitizePayload).find(Boolean) || null;
}

function buildPastVisitTranscriptBlocks(consultation) {
  const smartData = getPastVisitSmartDigitizeData(consultation);
  const history = Array.isArray(smartData?.history) ? smartData.history : [];
  return history.flatMap((entry, index) => {
    const conversation = Array.isArray(entry?.conversation) ? entry.conversation : [];
    if (conversation.length) {
      return [{
        id: `conversation-${index}`,
        type: "conversation",
        items: conversation
          .map((item, itemIndex) => ({
            id: `${index}-${itemIndex}`,
            speaker: item?.speaker || item?.role || item?.type || "",
            text: item?.text || item?.message || item?.transcription || item?.content || "",
          }))
          .filter((item) => hasValue(item.text)),
      }].filter((block) => block.items.length);
    }

    const text = entry?.transcription || entry?.source || entry?.text || entry?.content || "";
    return hasValue(text) ? [{ id: `transcript-${index}`, type: "text", text: String(text) }] : [];
  });
}

function hasPastVisitTranscriptMode(consultation) {
  const smartData = getPastVisitSmartDigitizeData(consultation);
  const smartFile = consultation?.smart_prescription_filename || consultation?.smartPrescriptionFilename;
  return Boolean(smartData && (isValidMongoId(smartFile) || buildPastVisitTranscriptBlocks(consultation).length));
}

function buildPastVisitDigitalRx(consultation) {
  if (!consultation) return null;
  const smartPayload = getPastVisitSmartDigitalPayload(consultation);
  const smartRx = buildDigitalRx(smartPayload);
  const doctorAttribution = getPastVisitDoctorAttribution(consultation);
  if (smartRx) return doctorAttribution ? { ...smartRx, doctorAttribution } : smartRx;
  const legacyConsultation = firstObject(
    consultation?.caseManagerData,
    consultation?.data?.caseManagerData,
    consultation?.data?.data?.caseManagerData,
    consultation
  );

  const legacyMedicationPayload = legacyArray(legacyConsultation.medicine);
  const medicationLookups = {
    frequencyList: getPastVisitLookupList(consultation, "frequencyList"),
    timingList: getPastVisitLookupList(consultation, "timingList"),
  };
  const legacyMedicationRows = buildPastVisitMedicationRows(legacyMedicationPayload, {
    frequencyList: medicationLookups.frequencyList,
    timingList: medicationLookups.timingList,
  });
  const legacySymptomsPayload = legacyArray(legacyConsultation.symptoms);
  const legacySymptomRows = legacyVisitRows(
    legacySymptomsPayload,
    ["symptom_name", "name", "title", "label"],
    ["since", "duration", "severity", "note", "notes"]
  );
  const legacyAdviceRows = buildPastVisitAdviceRows(legacyConsultation.advice);
  const digitalRx = {
    symptoms: legacySymptomRows,
    symptomsPayload: legacySymptomsPayload.length
      ? legacySymptomsPayload
      : legacySymptomRows,
    examinations: legacyVisitRows(
      legacyConsultation.examination,
      ["examination_name", "name", "title", "label"],
      ["note", "notes"]
    ),
    diagnoses: legacyVisitRows(
      legacyConsultation.diagnosis,
      ["tds_name", "diagnosis_name", "name", "title", "label"],
      ["since", "status", "note", "notes"]
    ),
    medications: legacyMedicationRows,
    medicationsPayload: legacyMedicationPayload.length
      ? legacyMedicationPayload
      : legacyMedicationRows,
    medicationLookups,
    medicalHistory: buildPastVisitMedicalHistoryRows(legacyConsultation.medical_history || legacyConsultation.medicalHistory),
    medicalHistorySections: buildPastVisitMedicalHistorySections(legacyConsultation.medical_history || legacyConsultation.medicalHistory),
    surgeries: legacyVisitRows(
      legacyConsultation.surgeries,
      ["surgery_name", "name", "title", "label"],
      ["notes", "note", "date", "since"]
    ),
    moduleContents: buildPastVisitModuleRows(legacyConsultation.moduleContents || legacyConsultation.module_contents),
    moduleContentSections: buildPastVisitModuleSections(legacyConsultation.moduleContents || legacyConsultation.module_contents),
    moduleContentsPayload: legacyArray(legacyConsultation.moduleContents || legacyConsultation.module_contents),
    advice: legacyAdviceRows.length ? legacyAdviceRows : buildPastVisitAdviceRows(legacyConsultation.visit_advice),
    labInvestigations: legacyVisitRows(
      legacyConsultation.investigation || legacyConsultation.investigations,
      ["investigation_name", "test_name", "name", "title", "label"],
      ["note", "notes"]
    ).map((item) => (item.detail ? { label: item.label, detail: item.detail } : item.label)),
    followUp: legacyConsultation.follow_up_date ? `On ${formatPastVisitDate(legacyConsultation.follow_up_date)}` : "",
    additionalNotes: legacyConsultation.additional_notes || legacyConsultation.additionalNotes || legacyConsultation.notes || "",
    doctorAttribution,
  };
  const hasDigitalRx = digitalRx.symptoms.length ||
    digitalRx.examinations.length ||
    digitalRx.diagnoses.length ||
    digitalRx.medications.length ||
    digitalRx.medicalHistory.length ||
    digitalRx.surgeries.length ||
    digitalRx.moduleContents.length ||
    digitalRx.advice.length ||
    digitalRx.labInvestigations.length ||
    digitalRx.followUp ||
    digitalRx.additionalNotes;
  return hasDigitalRx ? digitalRx : null;
}

function formatPastVisitDate(date) {
  if (!date) return "Consultation";
  const parsed = moment(date);
  return parsed.isValid() ? parsed.format("DD MMM'YY") : String(date);
}

function getPastVisitDate(consultation, detail) {
  return consultation?.consultation_date ||
    consultation?.caseManagerData?.consultation_date ||
    consultation?.data?.caseManagerData?.consultation_date ||
    consultation?.tcm_consultation_date ||
    consultation?.tcm_created_date ||
    consultation?.created_date ||
    consultation?.createdAt ||
    consultation?.created_at ||
    consultation?.date ||
    detail?.consultation_date ||
    detail?.caseManagerData?.consultation_date ||
    detail?.data?.caseManagerData?.consultation_date ||
    detail?.tcm_consultation_date ||
    detail?.tcm_created_date ||
    detail?.created_date ||
    detail?.createdAt ||
    detail?.created_at ||
    detail?.date;
}

function normalizePastVisitDoctorName(name) {
  const doctorName = String(name || "").trim();
  if (!doctorName) return "";
  return /^dr\.?\s/i.test(doctorName) ? doctorName : `Dr. ${doctorName}`;
}

function shortPastVisitSpecialty(speciality) {
  const value = String(speciality || "").trim();
  if (!value) return "";
  const key = value.toLowerCase();
  if (/general (physician|practitioner)/.test(key)) return "GP";
  if (/gyn(ae|e)c/.test(key)) return "Gynaec";
  if (/p(ae|e)diatr/.test(key)) return "Paed";
  if (key === "physician" || key === "internal medicine") return "Gen Med";
  const words = key.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words.map((word) => word[0]).join("").toUpperCase() : value.slice(0, 4);
}

function getPastVisitDoctorAttribution(...sources) {
  const sourceList = sources.filter(Boolean);
  const doctorSources = sourceList.flatMap((source) => {
    const caseManagerData = firstObject(
      source?.caseManagerData,
      source?.data?.caseManagerData,
      source?.data?.data?.caseManagerData,
      source?.printPayload?.caseManagerData,
      source?.printPayload?.data?.caseManagerData,
      source?.printPayload?.data?.data?.caseManagerData
    );
    return [
      caseManagerData?.doctor_data,
      caseManagerData?.doctorData,
      source?.doctor_data,
      source?.doctorData,
      source?.data?.doctor_data,
      source?.data?.doctorData,
      source,
    ].filter(Boolean);
  });

  const doctorName = doctorSources
    .map((source) => source?.doctor_name || source?.doctorName)
    .find(hasValue);
  if (!hasValue(doctorName)) return null;

  const dpName = doctorSources
    .map((source) => source?.dp_name || source?.dpName || source?.speciality || source?.specialty)
    .find(hasValue);
  const displayDoctorName = normalizePastVisitDoctorName(doctorName);
  const speciality = hasValue(dpName) ? String(dpName).trim() : "";

  return {
    doctorName: displayDoctorName,
    speciality,
    specialityShort: shortPastVisitSpecialty(speciality),
    text: displayDoctorName,
  };
}

function buildPastVisitEntry(consultation, detail) {
  const tcmId = consultation?.tcm_id || consultation?.tcmId || detail?.tcm_id;
  const consultationDate = getPastVisitDate(consultation, detail);
  const detailRx = buildPastVisitDigitalRx(detail || consultation);
  const doctorAttribution = getPastVisitDoctorAttribution(detail, consultation);
  const rxSourceType = getPastVisitRxSourceType(detail, consultation);
  const printUrl = detail?.print_url ||
    detail?.caseManagerData?.print_url ||
    detail?.data?.caseManagerData?.print_url ||
    consultation?.print_url ||
    consultation?.caseManagerData?.print_url ||
    consultation?.data?.caseManagerData?.print_url ||
    "";
  const transcriptSource = detail || consultation;
  const transcriptBlocks = buildPastVisitTranscriptBlocks(transcriptSource);
  const showTranscript = hasPastVisitTranscriptMode(transcriptSource);
  return {
    id: `past-visit-${tcmId || consultationDate}`,
    tcmId,
    dateLabel: formatPastVisitDate(consultationDate),
    digitalRx: detailRx,
    doctorAttribution,
    rxSourceType,
    hasTranscript: showTranscript,
    transcriptBlocks,
    writtenRx: printUrl ? [{ id: `written-rx-${tcmId || consultationDate}`, printUrl, doctorName: detail?.doctor_data?.doctor_name || consultation?.doctor_name || "", speciality: detail?.doctor_data?.dp_name || consultation?.dp_name || "" }] : [],
    detailLoaded: Boolean(detail),
    detailLoading: Boolean(consultation?.detailLoading) && !detailRx && !printUrl && !transcriptBlocks.length,
  };
}

function pastVisitRowText(item) {
  if (typeof item === "string") return { label: item, detail: "" };
  return {
    label: String(item?.label || item?.name || item?.title || "").trim(),
    detail: String(item?.detail || item?.notes || item?.note || "").trim(),
  };
}

function pastVisitRows(items) {
  return toArray(items)
    .map(pastVisitRowText)
    .filter((item) => item.label || item.detail);
}

function buildPastVisitSymptomPayloadRows(items) {
  return toArray(items)
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        const symptomName = String(item).trim();
        return symptomName ? { symptom_name: symptomName } : null;
      }
      const raw = firstObject(item?.payload, item?.raw, item);
      const symptomName = firstTextValue(raw?.symptom_name, raw?.name, raw?.title, raw?.label);
      if (!symptomName) return null;
      return {
        ...raw,
        symptom_name: symptomName,
        since: firstTextValue(raw?.since, raw?.duration),
        severity: firstTextValue(raw?.severity),
        note: firstTextValue(raw?.note, raw?.notes),
      };
    })
    .filter(Boolean);
}

function pastVisitMedicationName(item) {
  return firstTextValue(
    item?.tmm_medicine_name,
    item?.tm_medicine_name,
    item?.medicine_name,
    item?.groundedMedicineName,
    item?.groundingMedicineName,
    item?.refinedName,
    item?.lineItem,
    item?.name,
    item?.title,
    item?.label
  );
}

function findMedicineUnitTitle(item) {
  const unitId = firstTextValue(item?.tmm_unit, item?.tmu_id);
  const units = legacyArray(item?.medicineUnit);
  const matchedUnit = units.find((unit) => String(unit?.tmu_id) === String(unitId));
  return firstTextValue(item?.tmm_unit_name, matchedUnit?.tmu_title);
}

function buildPastVisitDoseText(item) {
  const dosage = firstTextValue(item?.dosage, item?.tmm_dosage);
  if (!dosage) return firstTextValue(item?.tmm_dosage_unit_name);
  return [dosage, findMedicineUnitTitle(item)].filter(Boolean).join(" ");
}

function hasFrequencySlotValue(item) {
  return [
    item?.tcm_tmm_freq_morning,
    item?.tcm_tmm_freq_afternoon,
    item?.tcm_tmm_freq_evening,
    item?.tcm_tmm_freq_night,
  ].some((value) => value !== undefined && value !== null && String(value).trim() !== "" && String(value).trim() !== "0");
}

function frequencySlotText(value) {
  if (value === undefined || value === null || String(value).trim() === "") return "0";
  return String(value).trim();
}

function buildPastVisitFrequencyText(item, frequencyList = []) {
  if (firstTextValue(item?.frequency, item?.freq, item?.frequencyText, item?.frequency_text)) {
    return firstTextValue(item?.frequency, item?.freq, item?.frequencyText, item?.frequency_text);
  }

  if (String(item?.tmf_block ?? "").trim() === "0") {
    return hasFrequencySlotValue(item)
      ? [
          frequencySlotText(item?.tcm_tmm_freq_morning),
          frequencySlotText(item?.tcm_tmm_freq_afternoon),
          frequencySlotText(item?.tcm_tmm_freq_evening),
          frequencySlotText(item?.tcm_tmm_freq_night),
        ].join(" - ")
      : "";
  }

  const frequency = frequencyList.find((entry) => String(entry?.tmf_id) === String(item?.tmm_freq_type));
  return firstTextValue(item?.tmm_freq_type_name, frequency?.tmf_title);
}

function buildPastVisitScheduleText(item, timingList = []) {
  const timing = timingList.find((entry) => String(entry?.tmt_id) === String(item?.tmm_time));
  const title = firstTextValue(item?.schedule, item?.tmm_time_name, timing?.tmt_title);
  return title === "None" ? "" : title;
}

function buildPastVisitDurationText(item) {
  const duration = firstTextValue(item?.duration, item?.tmm_days_duration_type);
  if (duration) return duration;
  const days = firstTextValue(item?.tmm_days);
  const type = firstTextValue(item?.tmm_duration_type);
  if (days && type) return `${days} ${type}`;
  if (type && !["Day(s)", "Week(s)", "Month(s)", "Year(s)"].includes(type)) return type;
  return "";
}

function buildPastVisitQuantityText(item) {
  const quantity = firstTextValue(item?.display_qty, item?.quantity);
  return quantity && quantity !== "0" ? quantity : "";
}

function normalizePastVisitMedicationRow(item, lookups = {}) {
  if (typeof item === "string" || typeof item === "number") {
    const medicineName = String(item).trim();
    return medicineName ? { tmm_medicine_name: medicineName, name: medicineName } : null;
  }
  const raw = firstObject(item?.payload, item?.raw, item);
  const medicineName = pastVisitMedicationName(raw) || pastVisitMedicationName(item);
  if (!medicineName) return null;
  const dosage = buildPastVisitDoseText(raw);
  const frequency = buildPastVisitFrequencyText(raw, lookups.frequencyList);
  const schedule = buildPastVisitScheduleText(raw, lookups.timingList);
  const duration = buildPastVisitDurationText(raw);
  const displayQuantity = buildPastVisitQuantityText(raw);
  const notes = firstTextValue(raw?.notes, raw?.note, raw?.tmm_remarks);

  return {
    ...raw,
    tmm_medicine_name: medicineName,
    medicine_name: raw?.medicine_name || medicineName,
    name: raw?.name || medicineName,
    dosage,
    frequency,
    schedule,
    duration,
    quantity: raw?.quantity ?? raw?.display_qty ?? "",
    displayQuantity,
    notes,
    note: notes,
  };
}

function buildPastVisitMedicationRows(items, lookups = {}) {
  return toArray(items)
    .map((item) => normalizePastVisitMedicationRow(item, lookups))
    .filter(Boolean)
    .map((item) => ({
      ...item,
      payload: item,
      label: item.tmm_medicine_name || item.name,
      detail: uniqueValueText([item.dosage, item.frequency, item.schedule, item.duration, item.notes, item.displayQuantity]),
    }));
}

function buildPastVisitMedicationPayloadRows(items, lookups = {}) {
  return toArray(items)
    .map((item) => normalizePastVisitMedicationRow(item, lookups))
    .filter(Boolean);
}

function pastVisitMedicalHistoryType(detail) {
  const text = String(detail || "").trim();
  if (!text) return "Medical Condition";
  const type = text.split(" - ")[0]?.trim();
  return type || "Medical Condition";
}

function buildPastVisitSectionPayload(visitItem, sectionKey) {
  const rx = visitItem?.digitalRx;
  if (!rx) return null;
  const base = {
    sourceDateLabel: visitItem.dateLabel || "Past visit",
    targetSection: "rxpad",
  };

  switch (sectionKey) {
    case "symptoms": {
      const rows = buildPastVisitSymptomPayloadRows(rx.symptomsPayload || rx.symptoms);
      return rows.length ? { ...base, digitization: { symptoms: rows } } : null;
    }
    case "examinations": {
      const rows = pastVisitRows(rx.examinations).map((item) => ({
        examination_name: item.label,
        note: item.detail,
      }));
      return rows.length ? { ...base, digitization: { examinations: rows } } : null;
    }
    case "diagnosis": {
      const rows = pastVisitRows(rx.diagnoses).map((item) => ({
        tds_name: item.label,
        note: item.detail,
      }));
      return rows.length ? { ...base, digitization: { diagnosis: rows } } : null;
    }
    case "medications": {
      const rows = buildPastVisitMedicationPayloadRows(rx.medicationsPayload || rx.medications, rx.medicationLookups);
      return rows.length ? { ...base, digitization: { medications: rows } } : null;
    }
    case "medicalHistory": {
      const rows = pastVisitRows(rx.medicalHistory).map((item) => ({
        name: item.label,
        type: pastVisitMedicalHistoryType(item.detail),
        notes: item.detail.includes(" - ") ? item.detail.split(" - ").slice(1).join(" - ") : "",
      }));
      return rows.length ? { ...base, digitization: { medical_history: rows } } : null;
    }
    case "surgeries": {
      const rows = pastVisitRows(rx.surgeries).map((item) => ({
        name: item.label,
        notes: item.detail,
      }));
      return rows.length ? { ...base, digitization: { surgeries: rows } } : null;
    }
    case "advice": {
      const rows = pastVisitRows(rx.advice).map((item) => ({
        advice_name: item.label,
      }));
      return rows.length ? { ...base, digitization: { advice: rows } } : null;
    }
    case "investigations": {
      const rows = pastVisitRows(rx.labInvestigations).map((item) => ({
        investigation_name: item.label,
        note: item.detail,
      }));
      return rows.length ? { ...base, digitization: { lab_investigation: rows } } : null;
    }
    case "additionalNotes":
      return rx.additionalNotes ? { ...base, digitization: { others: [rx.additionalNotes] } } : null;
    case "followUp":
      return rx.followUp ? { ...base, digitization: { follow_up: [rx.followUp] } } : null;
    case "moduleContents": {
      const modules = legacyArray(rx.moduleContentsPayload).filter(
        (module) => module?.module_id && legacyArray(module?.content).length > 0
      );
      return modules.length ? {
        ...base,
        sideNavCustomModuleTargetId: modules[0].module_id,
        digitization: { moduleContents: modules },
      } : null;
    }
    case "vitals":
      return objectHasRenderableValue(rx.vitalsPayload)
        ? { ...base, digitization: { vitalsAndBodyComposition: rx.vitalsPayload } }
        : null;
    case "gynec":
      return objectHasRenderableValue(rx.gynecPayload)
        ? { ...base, digitization: { gyneacHistory: rx.gynecPayload } }
        : null;
    case "obstetric":
      return objectHasRenderableValue(rx.obstetricPayload)
        ? { ...base, digitization: { obstetricHistory: rx.obstetricPayload } }
        : null;
    case "vaccinations":
      return Array.isArray(rx.vaccinePayload) && rx.vaccinePayload.length
        ? { ...base, digitization: { vaccinations: rx.vaccinePayload } }
        : null;
    default:
      return null;
  }
}

function buildPastVisitCustomModulePayload(visitItem, moduleSection, row) {
  const rawModule = moduleSection?.raw || {};
  const content = row ? [row.raw].filter(Boolean) : legacyArray(rawModule.content);
  const moduleId = rawModule.module_id || moduleSection?.id;
  if (!moduleId || !content.length) return null;

  return {
    sourceDateLabel: visitItem?.dateLabel || "Past visit",
    targetSection: "rxpad",
    sideNavCustomModuleTargetId: moduleId,
    digitization: {
      moduleContents: [{
        ...rawModule,
        module_id: moduleId,
        module_name: rawModule.module_name || rawModule.name || moduleSection?.title || String(moduleId),
        content,
      }],
    },
  };
}

function buildPastVisitAllPayload(visitItem) {
  const payloads = [
    "symptoms",
    "examinations",
    "diagnosis",
    "medications",
    "surgeries",
    "advice",
    "investigations",
    "additionalNotes",
    "moduleContents",
    "vaccinations",
  ].map((sectionKey) => buildPastVisitSectionPayload(visitItem, sectionKey)).filter(Boolean);
  if (!payloads.length) return null;
  return payloads.reduce((acc, payload) => ({
    ...acc,
    digitization: Object.entries(payload.digitization || {}).reduce((digitizationAcc, [key, value]) => {
      const prevValue = digitizationAcc[key];
      if (Array.isArray(prevValue) || Array.isArray(value)) {
        return {
          ...digitizationAcc,
          [key]: [...toArray(prevValue), ...toArray(value)],
        };
      }
      return { ...digitizationAcc, [key]: value };
    }, acc.digitization),
  }), {
    sourceDateLabel: visitItem.dateLabel || "Past visit",
    targetSection: "rxpad",
    digitization: {},
  });
}

function shouldUseVoiceRxPrintPayload(detail) {
  const smartFile = getPastVisitSmartPrescriptionFilename(detail);
  return isValidMongoId(smartFile) &&
    !String(smartFile).toLowerCase().includes(".jpeg") &&
    !String(smartFile).toLowerCase().includes("snap_rx") &&
    !String(smartFile).toLowerCase().includes("tab_rx");
}

function shouldUseRxDigitizePrintPayload(detail) {
  const smartFile = getPastVisitSmartPrescriptionFilename(detail);
  const smartFileText = smartFile.toLowerCase();
  if (!smartFile) return Boolean(detail?.isRxDigitize || detail?.isRxDigitizeBool);
  if (shouldUseVoiceRxPrintPayload(detail)) return false;
  return smartFileText.includes(".jpeg") ||
    smartFileText.includes("snap_rx") ||
    smartFileText.includes("tab_rx") ||
    Boolean(detail?.isRxDigitize || detail?.isRxDigitizeBool);
}

function buildPastVisitPrintPayloadUrl(printUrl, detail) {
  if (!printUrl) return null;
  try {
    const url = new URL(printUrl, window.location.origin);
    if (shouldUseVoiceRxPrintPayload(detail)) {
      url.searchParams.delete("ambientVoiceRxDigitize");
      url.searchParams.set("voiceRxDigitize", "true");
      url.searchParams.set("rxDigitize", "false");
    } else if (shouldUseRxDigitizePrintPayload(detail)) {
      url.searchParams.delete("ambientVoiceRxDigitize");
      url.searchParams.set("voiceRxDigitize", "false");
      url.searchParams.set("rxDigitize", "true");
    }
    if (!url.searchParams.get("lg")) {
      url.searchParams.set("lg", btoa("1"));
    }
    url.searchParams.set("output", "json");
    return url.toString();
  } catch (error) {
    const separator = printUrl.includes("?") ? "&" : "?";
    return `${printUrl}${separator}output=json`;
  }
}

async function fetchPastVisitPrintPayload(printUrl, detail) {
  const fetchUrl = buildPastVisitPrintPayloadUrl(printUrl, detail);
  if (!fetchUrl) return null;
  try {
    console.log("[SideNavbar][PastVisits] print payload URL:", fetchUrl);
    const response = await axios.get(fetchUrl);
    return response?.data?.data || response?.data || null;
  } catch (error) {
    console.error("[SideNavbar][PastVisits] failed to fetch print JSON payload:", error);
    return null;
  }
}

function normalizePastVisitDetailPayload(payload) {
  const parsedPayload = maybeParseJsonObject(payload) || payload;
  if (!isObject(parsedPayload)) return parsedPayload || null;
  const root = isObject(parsedPayload?.data) &&
    (parsedPayload.status !== undefined ||
      parsedPayload.data?.caseManagerData ||
      parsedPayload.data?.case_manager_data ||
      parsedPayload.data?.smartDigitizeRxData ||
      parsedPayload.data?.smart_digitize_rx_data)
    ? parsedPayload.data
    : parsedPayload;
  const parsedRoot = maybeParseJsonObject(root) || root;
  if (!isObject(parsedRoot)) return parsedRoot || null;
  const caseManagerData = firstObject(parsedRoot.caseManagerData, parsedRoot.case_manager_data);
  const smartDigitizeRxData = parsedRoot.smartDigitizeRxData ||
    parsedRoot.smart_digitize_rx_data ||
    caseManagerData.smartDigitizeRxData ||
    caseManagerData.smart_digitize_rx_data ||
    parsedRoot.printPayload?.smartDigitizeRxData ||
    parsedRoot.printPayload?.smart_digitize_rx_data ||
    null;

  return {
    ...parsedRoot,
    ...caseManagerData,
    caseManagerData: Object.keys(caseManagerData).length ? caseManagerData : parsedRoot.caseManagerData,
    smartDigitizeRxData: maybeParseJsonObject(smartDigitizeRxData) || smartDigitizeRxData,
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  return Boolean(text) && text !== "0";
}

function normalizePastVisitTcmId(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text || text === "0") return "";
  const numericId = Number(text);
  return Number.isFinite(numericId) ? String(numericId) : text;
}

function getPastVisitTcmId(visit) {
  return visit?.tcm_id ||
    visit?.tcmId ||
    visit?.caseManagerData?.tcm_id ||
    visit?.caseManagerData?.tcmId ||
    visit?.data?.tcm_id ||
    visit?.data?.tcmId ||
    visit?.data?.caseManagerData?.tcm_id ||
    visit?.data?.caseManagerData?.tcmId ||
    visit?.data?.data?.tcm_id ||
    visit?.data?.data?.tcmId ||
    visit?.data?.data?.caseManagerData?.tcm_id ||
    visit?.data?.data?.caseManagerData?.tcmId;
}

function filterCurrentPastVisit(visits, currentTcmId) {
  const visitRows = Array.isArray(visits) ? visits : [];
  const activeTcmId = normalizePastVisitTcmId(currentTcmId);
  if (!activeTcmId) return visitRows;
  return visitRows.filter((visit) => normalizePastVisitTcmId(getPastVisitTcmId(visit)) !== activeTcmId);
}

function getPastVisitUniqueKey(visit) {
  const tcmId = normalizePastVisitTcmId(getPastVisitTcmId(visit));
  if (tcmId) return `tcm:${tcmId}`;

  const smartFile = firstTextValue(
    visit?.smart_prescription_filename,
    visit?.smartPrescriptionFilename,
    visit?.caseManagerData?.smart_prescription_filename,
    visit?.data?.caseManagerData?.smart_prescription_filename
  );
  if (smartFile) return `smart:${smartFile}`;

  const printUrl = firstTextValue(
    visit?.print_url,
    visit?.print_rx_url,
    visit?.caseManagerData?.print_url,
    visit?.data?.caseManagerData?.print_url
  );
  if (printUrl) return `print:${printUrl}`;

  const dateKey = normalizeSideNavDateKey(getPastVisitDate(visit));
  if (!dateKey) return "";
  const doctorKey = firstTextValue(
    visit?.doctor_name,
    visit?.doctorName,
    visit?.doctor_data?.doctor_name,
    visit?.caseManagerData?.doctor_data?.doctor_name,
    visit?.data?.caseManagerData?.doctor_data?.doctor_name
  ).toLowerCase();
  return `date:${dateKey}|doctor:${doctorKey}`;
}

function dedupePastVisitRows(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = getPastVisitUniqueKey(row);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasSideNavPreviousContext(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim() !== "";
}

function appendSideNavJsonFormField(formData, key, value) {
  if (!hasSideNavPreviousContext(value)) return;
  formData.append(key, JSON.stringify(value));
}

function medicalHistoryTagHasContextValue(tag = {}) {
  const enable = String(tag?.enable || "").trim();
  if (enable === "Y" || enable === "N") return true;
  return [
    tag?.since,
    tag?.status,
    tag?.medication,
    tag?.relationship,
    tag?.note,
    tag?.notes,
    tag?.date,
  ].some(hasValue);
}

function buildSideNavMedicalHistoryPreviousContext(medicalHistoryData = []) {
  if (!Array.isArray(medicalHistoryData)) return undefined;

  const sections = medicalHistoryData
    .map((section) => {
      const tags = Array.isArray(section?.tags)
        ? section.tags.filter(medicalHistoryTagHasContextValue)
        : [];
      const hasSectionData = Boolean(section?.no_know_history) ||
        tags.length > 0 ||
        hasValue(section?.medical_history_remarks);

      return hasSectionData ? { ...section, tags } : null;
    })
    .filter(Boolean);

  return sections.length ? { medical_history: sections } : undefined;
}

function copyPayloadHasMedicalHistory(payload = {}) {
  const digitization = payload?.digitization || {};
  return hasSideNavPreviousContext(digitization.medical_history) ||
    hasSideNavPreviousContext(digitization.medicalHistory) ||
    hasSideNavPreviousContext(payload?.medicalHistory);
}

function hasVitalsSignalContext(value) {
  if (Array.isArray(value)) return value.some(hasVitalsSignalContext);
  if (!isObject(value)) return hasValue(value);

  const vitals = firstObject(value.vitalsAndBodyComposition, value.vitals, value);
  return VITAL_SIGNAL_VALUE_KEYS.some((key) => hasValue(vitals?.[key]));
}

function copyPayloadHasVitals(payload = {}) {
  const digitization = payload?.digitization || {};
  return hasVitalsSignalContext(digitization.vitals_and_body_composition);
}

function getSideNavSignalTargetsFromCopyRequest(copyRequest) {
  const payload = copyRequest?.payload || {};
  const explicitTarget = payload.sideNavSignalTarget;
  const hasVitals = copyPayloadHasVitals(payload);
  const hasMedicalHistory = copyPayloadHasMedicalHistory(payload);

  if (explicitTarget === "vitals" && hasVitals) {
    return [explicitTarget];
  }
  if (SIDE_NAV_SIGNAL_SECTIONS.has(explicitTarget) && hasMedicalHistory) {
    return [explicitTarget];
  }

  const targets = [];
  if (hasMedicalHistory) targets.push("history");
  if (hasVitals) targets.push("vitals");
  return targets;
}

function valueText(values) {
  return values.filter(hasValue).map((value) => String(value).trim()).join(", ");
}

function uniqueValueText(values) {
  const seen = new Set();
  return values
    .filter(hasValue)
    .map((value) => String(value).trim())
    .filter((value) => {
      const key = value.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

function firstObject(...values) {
  return values.find(isObject) || {};
}

function objectHasRenderableValue(value) {
  if (!isObject(value)) return false;
  return Object.values(value).some((item) => {
    if (Array.isArray(item)) return item.length > 0;
    if (isObject(item)) return objectHasRenderableValue(item);
    return hasValue(item);
  });
}

function extractClinicalPayload(response) {
  const raw = response?.data?.documents?.[0]?.data ??
    response?.data?.document?.data ??
    response?.data ??
    response;

  const candidates = [
    raw?.clinicalData,
    raw?.digitization?.editedData,
    raw?.digitization?.refinedData,
    raw?.digitization,
    raw?.digitizeData,
    raw?.digitize,
    raw?.editedData,
    raw?.refinedData,
    raw?.payload,
    raw?.prescription,
    raw,
  ];

  const candidate = candidates.find(isObject) || {};
  const numericKeys = Object.keys(candidate).filter((key) => /^\d+$/.test(key));
  if (numericKeys.length && isObject(candidate[numericKeys[0]])) return candidate[numericKeys[0]];
  return candidate;
}

function buildSmartVitalsEntries(payload, visitDate) {
  const vitals = firstObject(payload?.vitalsAndBodyComposition, payload?.vitals, payload);
  if (!objectHasRenderableValue(vitals)) return [];
  const rows = buildVitalsRows({ vitalsAndBodyComposition: vitals });
  if (!rows.length) return [];
  return [{
    id: `smart-vitals-${visitDate || "current"}`,
    dateLabel: "Vitals",
    rows,
    fresh: true,
  }];
}

function buildSmartGynecSections(payload) {
  return buildGynecCards(payload).map((section) => ({ ...section, id: `smart-gynec-${section.id}` }));
}

function buildSmartObstetricSections(payload) {
  const raw = firstObject(payload?.obstetricHistory, payload);
  if (!objectHasRenderableValue(raw)) return [];
  const currentPregnancy = {
    ...raw,
    lmp: normalizeClinicalDate(raw.lmp || raw.lastMenstrualPeriod),
    edd: normalizeClinicalDate(raw.edd || raw.expectedDateOfDelivery),
    ceed: normalizeClinicalDate(raw.ceed || raw.calculatedExpectedDateOfDelivery),
    blood: raw.blood || raw.bloodGroup,
    husbandsBlood: raw.husbandsBlood || raw.husbandsBloodGroup,
    consang: raw.consang ?? raw.consanguineousMarriage,
    abortion: raw.abortion ?? raw.abortions,
    maritialStatus: raw.maritialStatus || raw.maritalStatus,
    examinationHistory: raw.examinationHistory || raw.antenatalExamination || [],
    ancHistory: raw.ancHistory || [],
    immunisationHistory: raw.immunisationHistory || [],
  };
  const pregnancyHistory = toArray(raw.pastPregnancyDetails || raw.pregnancyHistory).map((pregnancy) => ({
    ...pregnancy,
    gravidity: pregnancy?.gravidity || pregnancy?.gravidaNumber,
    deliveryMode: pregnancy?.deliveryMode || pregnancy?.modeOfDelivery,
    dateOfDelivery: normalizeClinicalDate(pregnancy?.dateOfDelivery),
    gender: pregnancy?.gender || pregnancy?.babyGender,
    babysWeight: pregnancy?.babysWeight || pregnancy?.babyWeight,
    modeOfManagement: pregnancy?.modeOfManagement || pregnancy?.modeOfAbortion,
  }));
  return buildLegacyObstetricSections({ currentPregnancy, pregnancyHistory })
    .map((section) => ({ ...section, id: `smart-${section.id}` }));
}

function buildSmartVaccineData(vaccinations) {
  const rows = toArray(vaccinations).map((item) => {
    const status = String(item?.status || item?.state || "").trim().toLowerCase();
    const givenDate = item?.givenDate || item?.tvp_given_date || item?.dateGiven || item?.administeredDate || "";
    const dueDate = item?.dueDate || item?.tvd_due_date || item?.dateDue || "";
    const week = item?.week || item?.age || item?.tvt_age || item?.schedule || "Vaccines";
    const name = item?.name || item?.vaccineName || item?.tvac_name || item?.tvt_name || item?.label || "";
    if (!hasValue(name)) return null;
    return {
      week,
      name,
      givenDate: givenDate ? formatVaccDate(givenDate) : "",
      dueDate,
      brand: item?.brand || item?.brandName || item?.tvc_name || "",
      notes: [item?.notes, item?.note, item?.remarks, item?.route && `Route: ${item.route}`, item?.dose && `Dose: ${item.dose}`, item?.site && `Site: ${item.site}`].filter(hasValue).join(" | "),
      status,
    };
  }).filter(Boolean);

  return {
    pending: rows.filter((item) => !item.givenDate && !["given", "done", "completed", "complete"].includes(item.status)),
    given: rows.filter((item) => item.givenDate || ["given", "done", "completed", "complete"].includes(item.status)),
  };
}

function buildDigitalRx(payload) {
  const p = firstObject(payload?.payload, payload);
  const medicationPayload = toArray(p.medications || p.medicine);
  const moduleContentPayload = getPastVisitModuleContentSource(p);
  const additionalNotesPayload = getPastVisitAdditionalNotesSource(p);
  const vitalsPayload = firstObject(p.vitalsAndBodyComposition, p.vitals);
  const gynecPayload = firstObject(p.gyneacHistory, p.gynecHistory);
  const obstetricPayload = firstObject(p.obstetricHistory);
  const vaccinePayload = toArray(p.vaccinations);
  const vitals = buildSmartVitalsEntries(vitalsPayload);
  const gynec = buildSmartGynecSections(gynecPayload);
  const obstetric = buildSmartObstetricSections(obstetricPayload);
  const vaccine = buildSmartVaccineData(vaccinePayload);
  const hasNativeContent = vitals.length ||
    gynec.length ||
    obstetric.length ||
    vaccine.pending.length ||
    vaccine.given.length;
  const hasContent = toArray(p.symptoms).length ||
    toArray(p.examinations || p.examination).length ||
    toArray(p.diagnosis || p.diagnoses).length ||
    toArray(p.medications || p.medicine).length ||
    toArray(p.advice).length ||
    toArray(p.labInvestigation || p.labInvestigations || p.investigation || p.investigations).length ||
    toArray(p.medicalHistory || p.medical_history).length ||
    toArray(p.surgeries).length ||
    moduleContentPayload.length ||
    hasValue(p.followUp) ||
    additionalNotesPayload.length ||
    hasNativeContent;

  if (!hasContent) return null;

  return {
    symptoms: toArray(p.symptoms).map((item) => ({
      ...(isObject(item) ? item : {}),
      payload: item,
      label: item?.name || item?.symptom_name || item?.lineItem || item?.label || String(item || ""),
      detail: valueText([item?.since, item?.duration, item?.severity, item?.notes, item?.note, item?.detail]),
      fresh: true,
    })),
    symptomsPayload: toArray(p.symptoms),
    examinations: toArray(p.examinations || p.examination).map((item) => ({
      label: item?.name || item?.examination_name || item?.lineItem || item?.label || String(item || ""),
      detail: valueText([item?.notes, item?.note, item?.detail]),
      fresh: true,
    })),
    diagnoses: toArray(p.diagnosis || p.diagnoses).map((item) => ({
      label: item?.name || item?.tds_name || item?.diagnosis_name || item?.lineItem || item?.label || String(item || ""),
      detail: valueText([item?.since, item?.status, item?.notes, item?.note, item?.detail]),
      fresh: true,
    })),
    medications: medicationPayload.map((item) => {
      const normalizedMedication = normalizePastVisitMedicationRow(item) || {};
      return {
        ...normalizedMedication,
        payload: item,
        label: normalizedMedication.tmm_medicine_name || normalizedMedication.name || String(item || ""),
        detail: uniqueValueText([normalizedMedication.dosage, normalizedMedication.frequency, normalizedMedication.schedule, normalizedMedication.duration, normalizedMedication.notes, normalizedMedication.displayQuantity]),
        fresh: true,
      };
    }),
    medicationsPayload: medicationPayload,
    advice: buildPastVisitAdviceRows(p.advice).map((item) => ({ ...item, fresh: true })),
    labInvestigations: toArray(p.labInvestigation || p.labInvestigations || p.investigation || p.investigations).map((item) => (typeof item === "string" ? item : item?.investigation_name || item?.test_name || item?.name || item?.lineItem || item?.label)).filter(Boolean),
    medicalHistory: buildPastVisitMedicalHistoryRows(p.medicalHistory || p.medical_history),
    medicalHistorySections: buildPastVisitMedicalHistorySections(p.medicalHistory || p.medical_history),
    surgeries: legacyVisitRows(
      p.surgeries,
      ["surgery_name", "name", "title", "label"],
      ["notes", "note", "date", "since"]
    ),
    moduleContents: buildPastVisitModuleRows(moduleContentPayload),
    moduleContentSections: buildPastVisitModuleSections(moduleContentPayload),
    moduleContentsPayload: moduleContentPayload,
    followUp: hasValue(p.followUp) ? `After ${p.followUp}` : "",
    additionalNotes: additionalNotesPayload.map((item) => (typeof item === "string" ? item : item?.notes || item?.label || "")).filter(Boolean).join(" "),
    vitals,
    gynec,
    obstetric,
    vaccine,
    vitalsPayload,
    gynecPayload,
    obstetricPayload,
    vaccinePayload,
  };
}

function buildVitalsRows(payload) {
  const vitals = firstObject(payload?.vitalsAndBodyComposition, payload);
  return VITAL_DISPLAY_FIELDS.flatMap((field) => {
    const value = vitals[field.key];
    return hasValue(value) ? [{ label: field.label, unit: field.unit, value: String(value), fresh: true }] : [];
  });
}

function buildLabRows(payload) {
  const labs = toArray(payload?.labResults || payload?.labs || payload?.lab_investigations || payload?.labInvestigations || payload);
  return labs.flatMap((item) => {
    const label = item?.testname || item?.testName || item?.investigation_name || item?.test_name || item?.name || item?.label;
    const value = item?.value || item?.result || item?.note || item?.notes || "--";
    if (!hasValue(label)) return [];
    return [{
      label,
      unit: item?.unit ? `(${item.unit})` : item?.units ? `(${item.units})` : "",
      value: String(value),
      abnormal: Boolean(item?.abnormal),
      direction: item?.direction,
      fresh: true,
    }];
  });
}

function parseClinicalDate(value) {
  if (!hasValue(value)) return null;
  const parsed = moment(value, ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "DD MMM YYYY", "DD MMM, YYYY", moment.ISO_8601], true);
  if (parsed.isValid()) return parsed;
  const loose = moment(value);
  return loose.isValid() ? loose : null;
}

function formatClinicalDate(value, fallback = value) {
  const parsed = parseClinicalDate(value);
  return parsed ? parsed.format("DD MMM'YY") : fallback;
}

function normalizeClinicalDate(value) {
  const parsed = parseClinicalDate(value);
  return parsed ? parsed.format("YYYY-MM-DD") : value;
}

function lineFromParts(parts) {
  return parts.filter(hasValue).join(" | ");
}

function buildGynecCards(payload) {
  const g = firstObject(payload?.gyneacHistory, payload?.gynecHistory, payload);
  const cards = [
    { id: "lmp", title: "LMP", lines: hasValue(g.lastMenstrualPeriod) ? [`LMP: ${formatClinicalDate(g.lastMenstrualPeriod)}`] : [] },
    { id: "menarche", title: "Menarche", lines: hasValue(g.ageAtMenarche) ? [`Age at: ${g.ageAtMenarche} years`] : [] },
    { id: "cycle", title: "Cycle", lines: [lineFromParts([g.cycle && `Type: ${g.cycle}`, valueText([g.intervalNotes, g.intervalCycle]) && `Interval: ${valueText([g.intervalNotes, g.intervalCycle])}`])].filter(Boolean) },
    { id: "flow", title: "Flow", lines: [lineFromParts([g.flow && `Volume: ${g.flow}`, g.durationOfMenstrualFlow && `Duration: ${g.durationOfMenstrualFlow} days`, g.clotsDuringFlow && `Clots: ${g.clotsDuringFlow}`, g.numberOfPadsPerDay && `Pads/day: ${g.numberOfPadsPerDay}`])].filter(Boolean) },
    { id: "pain", title: "Pain", lines: [lineFromParts([g.pain && `Severity: ${g.pain}`, g.occurrenceOfPain && `Occurrence: ${g.occurrenceOfPain}`, g.painNotes])].filter(Boolean) },
    { id: "notes", title: "Notes", lines: toArray(g.notes).filter(hasValue) },
  ];
  return cards.filter((card) => card.lines.length).map((card) => ({ ...card, fresh: true }));
}

function buildObstetricCards(payload) {
  const o = firstObject(payload?.obstetricHistory, payload);
  if (!Object.keys(o).length) return [];
  const examLines = toArray(o.antenatalExamination).map((entry) => lineFromParts([
    entry?.date,
    entry?.pallor && `Pallor: ${entry.pallor}`,
    entry?.oedema && `Oedema: ${entry.oedema}`,
    entry?.bmi && `BMI: ${entry.bmi} Kg/m2`,
    entry?.bp && `BP: ${entry.bp} mmHg`,
    entry?.fhr && `FHR: ${entry.fhr} bpm`,
  ])).filter(Boolean);
  const ancLines = toArray(o.ancHistory).map((entry) => lineFromParts([
    entry?.name,
    entry?.weekRange && `Week Range: ${entry.weekRange}`,
    entry?.dueDate && `Due Date: ${entry.dueDate}`,
    entry?.status && `Status: ${entry.status}`,
  ])).filter(Boolean);
  const immunisationLines = toArray(o.immunisationHistory).map((entry) => lineFromParts([
    entry?.name,
    entry?.status && `Status: ${entry.status}`,
    entry?.givenDate && `Given Date: ${entry.givenDate}`,
  ])).filter(Boolean);

  const cards = [
    {
      id: "patientInfo",
      title: "Patient Info",
      lines: [
        lineFromParts([o.lastMenstrualPeriod && `LMP: ${o.lastMenstrualPeriod}`, o.expectedDateOfDelivery && `EDD: ${o.expectedDateOfDelivery}`, o.calculatedExpectedDateOfDelivery && `C.E.D.D: ${o.calculatedExpectedDateOfDelivery}`]),
        lineFromParts([o.gestationWeeks && `Gestation: ${o.gestationWeeks} Weeks ${o.gestationDays || 0} Days`, o.bloodGroup && `Patient Blood Group: ${o.bloodGroup}`, o.husbandsBloodGroup && `Husband's Blood Group: ${o.husbandsBloodGroup}`]),
      ].filter(Boolean),
    },
    {
      id: "gplae",
      title: "GPLAE",
      lines: [lineFromParts([
        hasValue(o.gravidity) && `G: ${o.gravidity}`,
        hasValue(o.parity) && `P: ${o.parity}`,
        hasValue(o.livingChildren) && `L: ${o.livingChildren}`,
        hasValue(o.abortions) && `A: ${o.abortions}`,
        hasValue(o.ectopicPregnancies) && `E: ${o.ectopicPregnancies}`,
      ])].filter(Boolean),
    },
    { id: "examination", title: "Current Examination", lines: examLines },
    { id: "anc", title: "ANC Scheduler", lines: ancLines },
    { id: "immunisation", title: "Immunisation History", lines: immunisationLines },
  ];
  return cards.filter((card) => card.lines.length).map((card) => ({ ...card, fresh: true }));
}

function joinParts(parts) {
  return parts.filter(Boolean).join(" | ");
}

function buildLegacyGynecSections(gynecHistory) {
  if (!gynecHistory || Object.keys(gynecHistory).length === 0) return [];
  const cards = [];

  if (gynecHistory.lmp) {
    cards.push({ id: "gynec-lmp", title: "LMP", lines: [`LMP: ${moment(gynecHistory.lmp).format("DD MMM'YY")}`] });
  }

  const menarcheLines = joinParts([
    gynecHistory.ageAtMenarche && `Age at: ${gynecHistory.ageAtMenarche} years`,
    gynecHistory.menarcheNotes && `Notes: ${gynecHistory.menarcheNotes}`,
  ]);
  if (menarcheLines) cards.push({ id: "gynec-menarche", title: "Menarche", lines: [menarcheLines] });

  const cycleLine = joinParts([
    gynecHistory.cycle && `Type: ${gynecHistory.cycle}`,
    gynecHistory.intervalOfCycle && `Interval: ${gynecHistory.intervalOfCycle} days`,
    gynecHistory.cycleNotes && `Note: ${gynecHistory.cycleNotes}`,
  ]);
  if (cycleLine) cards.push({ id: "gynec-cycle", title: "Cycle", lines: [cycleLine] });

  const flowLine = joinParts([
    gynecHistory.flow && `Volume: ${gynecHistory.flow}`,
    gynecHistory.durationOfMenstrualFlow && `Duration: ${gynecHistory.durationOfMenstrualFlow} days`,
    gynecHistory.clots !== undefined && gynecHistory.clots !== "" && `Clots: ${gynecHistory.clots ? "Yes" : "No"}`,
    gynecHistory.numberOfPadsPerDay && `Pads/day: ${gynecHistory.numberOfPadsPerDay}`,
    gynecHistory.flowNotes && `Notes: ${gynecHistory.flowNotes}`,
  ]);
  if (flowLine) cards.push({ id: "gynec-flow", title: "Flow", lines: [flowLine] });

  const painLine = joinParts([
    gynecHistory.pain && `Severity: ${gynecHistory.pain}`,
    gynecHistory.occurrenceOfPain && `Occurrence: ${gynecHistory.occurrenceOfPain}`,
    gynecHistory.painNotes && `Notes: ${gynecHistory.painNotes}`,
  ]);
  if (painLine) cards.push({ id: "gynec-pain", title: "Pain", lines: [painLine] });

  const hormLines = [];
  if (gynecHistory.reproductiveLifeStages) hormLines.push(`Stage: ${gynecHistory.reproductiveLifeStages}`);
  if (gynecHistory.ageAtMenopause) hormLines.push(`Age at: ${gynecHistory.ageAtMenopause} years`);
  if (gynecHistory.typeOfMenopause) hormLines.push(`Type: ${gynecHistory.typeOfMenopause}`);
  if (gynecHistory.reproductiveNotes) hormLines.push(`Notes: ${gynecHistory.reproductiveNotes}`);
  if (hormLines.length) cards.push({ id: "gynec-hormonal", title: "Lifecycle Hormonal Changes", lines: hormLines });

  if (gynecHistory.notes) cards.push({ id: "gynec-notes", title: "Notes", lines: [gynecHistory.notes] });

  return cards;
}

function buildLegacyObstetricSections(obstetricDetails) {
  const currentPregnancy = obstetricDetails?.currentPregnancy || obstetricDetails;
  const pregnancyHistory = obstetricDetails?.pregnancyHistory || [];
  if (!currentPregnancy && pregnancyHistory.length === 0) return [];
  const sections = [];
  const today = moment();
  const lmpDate = currentPregnancy?.lmp ? moment(currentPregnancy.lmp) : null;
  let gestationWeeks = null;
  let gestationDays = null;

  if (currentPregnancy?.ceed) {
    const gestationAge = 40 * 7 - Math.ceil(Math.abs(moment(currentPregnancy.ceed).startOf("day").diff(moment(today).startOf("day"), "days")));
    gestationWeeks = Math.floor(gestationAge / 7);
    gestationDays = gestationAge % 7;
  } else if (lmpDate) {
    gestationWeeks = today.diff(lmpDate, "weeks");
    gestationDays = today.diff(lmpDate.clone().add(gestationWeeks, "weeks"), "days");
  }

  const patientRows = [];
  const primaryInfo = [];
  if (currentPregnancy?.lmp) primaryInfo.push({ label: "LMP", value: moment(currentPregnancy.lmp).format("DD MMM'YY") });
  if (currentPregnancy?.edd) {
    primaryInfo.push({ label: "EDD", value: moment(currentPregnancy.edd).format("DD MMM'YY") });
  }
  if (currentPregnancy?.ceed) {
    primaryInfo.push({ label: "C.E.D.D", value: moment(currentPregnancy.ceed).format("DD MMM'YY") });
  }
  if (gestationWeeks > 0 || gestationDays > 0) {
    const gStr = [
      gestationWeeks ? `${gestationWeeks} ${gestationWeeks > 1 ? "Weeks" : "Week"}` : "",
      gestationDays ? `${gestationDays} ${gestationDays > 1 ? "Days" : "Day"}` : "",
    ].filter(Boolean).join(" ");
    const bloodGroup = currentPregnancy?.blood || currentPregnancy?.bloodGroup;
    const husbandsBlood = currentPregnancy?.husbandsBlood || currentPregnancy?.husbandBloodGroup;
    patientRows.push([
      { label: "Gestation", value: gStr },
      bloodGroup && { label: "Patient Blood Group", value: bloodGroup },
      husbandsBlood && { label: "Husband's Blood Group", value: husbandsBlood },
    ].filter(Boolean));
  }
  const maritalStatus = currentPregnancy?.maritialStatus || currentPregnancy?.maritalStatus;
  const marriageDuration = [
    currentPregnancy?.marriageDurationYears && `${currentPregnancy.marriageDurationYears} Years`,
    currentPregnancy?.marriageDurationMonths && `${currentPregnancy.marriageDurationMonths} Months`,
  ].filter(Boolean).join(" ");
  const consangValue = currentPregnancy?.consang;
  const consangText = consangValue === true ? "Yes" : consangValue === false ? "No" : currentPregnancy?.consanguinity;
  const maritalRow = [
    maritalStatus && { label: "Marital Status", value: maritalStatus },
    marriageDuration && { label: "Marriage Duration", value: marriageDuration },
    consangText && { label: "Consanguineous", value: consangText },
  ].filter(Boolean);
  if (primaryInfo.length) patientRows.unshift(primaryInfo);
  if (maritalRow.length) patientRows.push(maritalRow);
  if (patientRows.length) sections.push({ id: "obstetric-patient-info", type: "patientInfo", title: "Patient Info", rows: patientRows });

  const hasG = legacyHistoryHasValue(currentPregnancy?.gravidity);
  const hasP = legacyHistoryHasValue(currentPregnancy?.parity);
  const hasL = legacyHistoryHasValue(currentPregnancy?.livingChildren);
  const hasA = legacyHistoryHasValue(currentPregnancy?.abortion);
  const hasE = legacyHistoryHasValue(currentPregnancy?.ectopicPregnancies);
  if (hasG || hasP || hasL || hasA || hasE) {
    const isPrimigravida = Number(currentPregnancy?.gravidity) === 1 &&
      [0, "0", "", null, undefined].includes(currentPregnancy?.parity) &&
      [0, "0", "", null, undefined].includes(currentPregnancy?.livingChildren) &&
      [0, "0", "", null, undefined].includes(currentPregnancy?.abortion) &&
      [0, "0", "", null, undefined].includes(currentPregnancy?.ectopicPregnancies);
    const gplaeLines = isPrimigravida
      ? ["Primigravida"]
      : [];
    const gplaeParts = [
      { label: "G", value: currentPregnancy?.gravidity ?? 0 },
      { label: "P", value: currentPregnancy?.parity ?? 0 },
      { label: "L", value: currentPregnancy?.livingChildren ?? 0 },
      { label: "A", value: currentPregnancy?.abortion ?? 0 },
      { label: "E", value: currentPregnancy?.ectopicPregnancies ?? 0 },
    ];
    sections.push({ id: "obstetric-gplae", type: "gplae", title: "GPLAE", parts: gplaeParts, badge: gplaeLines[0], notes: currentPregnancy?.diagnosisNotes });
  }

  const pregnancyItems = [];
  pregnancyHistory.forEach((pregnancy, index) => {
    const gravida = pregnancy?.gravidity || pregnancy?.gravidaNumber;
    const details = [
      pregnancy?.outcome && `Outcome: ${pregnancy.outcome}`,
      pregnancy?.termLength && `Term Length: ${pregnancy.termLength}`,
      pregnancy?.birthInfoType && `Birth Info: ${pregnancy.birthInfoType}`,
      pregnancy?.deliveryMode && `Mode of Delivery: ${pregnancy.deliveryMode}`,
      pregnancy?.dateOfDelivery && `Date of Delivery: ${moment(pregnancy.dateOfDelivery).format("DD MMM'YY")}`,
      pregnancy?.ageOfDelivery && `Age of Delivery: ${pregnancy.ageOfDelivery}`,
      pregnancy?.gender && `Gender: ${pregnancy.gender}`,
      pregnancy?.babysWeight && `Baby's Weight: ${pregnancy.babysWeight} Kgs`,
      pregnancy?.gestationPeriod && `Gestation: ${pregnancy.gestationPeriod}`,
      pregnancy?.location && `Location: ${pregnancy.location}`,
      pregnancy?.typeOfAbortion && `Type of Miscarriage: ${pregnancy.typeOfAbortion === "Missed abortion" ? "Missed Miscarriage" : pregnancy.typeOfAbortion}`,
      (pregnancy?.modeOfAbortion || pregnancy?.modeOfManagement) && `Mode of Management: ${pregnancy.modeOfAbortion || pregnancy.modeOfManagement}`,
      pregnancy?.remarks && `Remarks: ${pregnancy.remarks}`,
    ].filter(Boolean);
    if (details.length) {
      pregnancyItems.push({
        strong: `Gravida no: ${gravida || index + 1}`,
        text: ` (${details.join(", ")})`,
      });
    }
  });
  if (pregnancyItems.length) sections.push({ id: "obstetric-pregnancy-history", type: "bullet", title: "Pregnancy History", items: pregnancyItems });

  const examinationItems = [];
  (currentPregnancy?.examinationHistory || []).forEach((visit, i) => {
    const visitLines = [
      typeof visit.pallor === "boolean" && `Pallor: ${visit.pallor ? "Present" : "Absent"}`,
      typeof visit.oedema === "boolean" && `Oedema: ${visit.oedema ? "Present" : "Absent"}`,
      visit.mothersBMI && `BMI: ${visit.mothersBMI} Kg/m²`,
      (visit.systolic || visit.diastolic) && `BP: ${visit.systolic || "-"}${visit.diastolic ? `/${visit.diastolic}` : ""} mmHg`,
      visit.heightOfFundus && `Fundus Height: ${visit.heightOfFundus} ${visit.heightOfFundusUnit || ""}`,
      visit.presentation && `Presentation: ${visit.presentation}`,
      visit.liquor && `Liquor: ${visit.liquor}`,
      visit.foetalHeartRate && `FHR: ${visit.foetalHeartRate} bpm`,
    ].filter(Boolean);
    if (visit.notes) visitLines.push(`Notes: ${visit.notes}`);
    if (visitLines.length) {
      examinationItems.push({
        strong: visit.date ? moment(visit.date).format("DD MMM'YY") : `Visit ${currentPregnancy.examinationHistory.length - i}`,
        text: ` (${visitLines.join(", ")})`,
      });
    }
  });
  if (examinationItems.length) sections.push({ id: "obstetric-current-examination", type: "bullet", title: "Current Examination", items: examinationItems });

  const ancLines = (currentPregnancy?.ancHistory || [])
    .filter((item) => !item.deleted && (item.dueDate || item.status === "Completed" || item.notes || item.enablePrint))
    .map((item) => ({
      strong: item.master?.name || item.name,
      text: ` (${[
        item.weekRange?.start && item.weekRange?.end && `Week Range: ${item.weekRange.start}-${item.weekRange.end} Weeks`,
        item.dueDate && `Due Date: ${moment(item.dueDate).format("DD MMM'YY")}`,
        item.status && `Status: ${item.status === "Completed" ? "Done" : item.status}`,
        item.notes && `Remarks: ${item.notes}`,
      ].filter(Boolean).join(", ")})`,
    }));
  if (ancLines.length) sections.push({ id: "obstetric-anc", type: "bullet", title: "ANC Scheduler", items: ancLines });

  const immunLines = (currentPregnancy?.immunisationHistory || [])
    .filter((item) => !item.deleted && (item.givenDate || item.status === "Given" || item.notes || item.enablePrint))
    .map((item) => ({
      strong: item.master?.name || item.name,
      text: ` (${[
        item.status && `Status: ${item.status === "Given" ? "Done" : item.status}`,
        item.givenDate && `Given Date: ${moment(item.givenDate).format("DD MMM'YY")}`,
        item.notes && `Remarks: ${item.notes}`,
      ].filter(Boolean).join(", ")})`,
    }));
  if (immunLines.length) sections.push({ id: "obstetric-immunisation", type: "bullet", title: "Immunisation History", items: immunLines });

  return sections;
}

function buildViewData(overrides = {}, sourceData = {}) {
  const currentDate = "Current Visit";
  const data = {
    pastVisits: sourceData.pastVisits ?? [],
    vitals: sourceData.vitals ?? [],
    history: sourceData.history ?? [],
    labResults: sourceData.labResults ?? [],
    medicalRecords: sourceData.medicalRecords ?? [],
    medicalRecordsRawDocs: sourceData.medicalRecordsRawDocs ?? [],
    medicalRecordsCategories: sourceData.medicalRecordsCategories ?? [],
    gynec: sourceData.gynec ?? [],
    obstetric: sourceData.obstetric ?? [],
    vaccine: sourceData.vaccine ?? { pending: [], given: [] },
    growth: sourceData.growth ?? { entries: [], info: {} },
    optal: sourceData.optal ?? [],
    personalNotes: sourceData.personalNotes ?? [],
  };

  const digitalRx = buildDigitalRx(overrides.pastVisits);
  if (digitalRx) {
    data.pastVisits = [{ id: "digitized-current", dateLabel: currentDate, digitalRx, writtenRx: [], fresh: true }, ...data.pastVisits];
  }

  const vitalsRows = buildVitalsRows(overrides.vitals);
  if (vitalsRows.length) {
    data.vitals = [{ id: "digitized-vitals", dateLabel: currentDate, rows: vitalsRows, fresh: true }, ...data.vitals];
  }

  const labRows = buildLabRows(overrides.labResults);
  if (labRows.length) {
    data.labResults = [{ id: "digitized-labs", dateLabel: currentDate, rows: labRows, fresh: true }, ...data.labResults];
  }

  const gynecCards = buildGynecCards(overrides.gynec);
  if (gynecCards.length) data.gynec = gynecCards;

  if (overrides.obstetric) {
    const obstetricCards = buildObstetricCards(overrides.obstetric);
    if (obstetricCards.length) data.obstetric = obstetricCards;
  }

  return data;
}

function createSideNavVoiceId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `snv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function extractSideNavModulePayload(responseJson) {
  return responseJson?.payload?.data?.rxDigitizationHistory?.[0]?.response ??
    responseJson?.data?.rxDigitizationHistory?.[0]?.response ??
    responseJson?.rxDigitizationHistory?.[0]?.response ??
    responseJson?.data?.documents?.[0]?.data ??
    responseJson?.data?.document?.data ??
    responseJson?.data ??
    responseJson;
}

function parseSideNavMaybeJson(value) {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text || (!text.startsWith("[") && !text.startsWith("{"))) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function sideNavObjectLooksLikeArrayRow(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return [
    "name",
    "title",
    "type",
    "tags",
    "lineItem",
    "no_know_history",
    "medical_history_remarks",
    "investigation_name",
    "test_name",
  ].some((key) => value[key] !== undefined);
}

function firstSideNavArray(payload, keys, { allowObjectRow = false } = {}) {
  const containerKeys = [
    ...keys,
    "response",
    "result",
    "results",
    "output",
    "items",
    "rows",
    "records",
    "data",
  ];

  const findArray = (value, depth = 3) => {
    const parsedValue = parseSideNavMaybeJson(value);
    if (Array.isArray(parsedValue)) return parsedValue;
    if (!parsedValue || typeof parsedValue !== "object" || depth <= 0) return [];
    if (allowObjectRow && sideNavObjectLooksLikeArrayRow(parsedValue)) return [parsedValue];

    for (const key of containerKeys) {
      if (!(key in parsedValue)) continue;
      const nested = findArray(parsedValue[key], depth - 1);
      if (nested.length) return nested;
    }

    return [];
  };

  const parsedPayload = parseSideNavMaybeJson(payload);
  const rows = findArray(parsedPayload);
  if (rows.length) return rows;
  if (allowObjectRow && sideNavObjectLooksLikeArrayRow(parsedPayload)) return [parsedPayload];
  return [];
}

function firstSideNavObject(payload, keys) {
  if (isObject(payload) && keys.some((key) => payload?.[key] !== undefined)) return payload;
  for (const key of keys) {
    const value = payload?.[key];
    if (isObject(value)) return value;
    if (Array.isArray(value) && isObject(value[0])) return value[0];
  }
  return {};
}

function normalizeSideNavVitals(payload) {
  const vitals = firstSideNavObject(payload, ["vitals_body", "vitalsBody", "vitalsAndBodyComposition", "vitals"]);
  const systolic = vitals?.systolic ?? vitals?.bp_systolic;
  const diastolic = vitals?.diastolic ?? vitals?.bp_diastolic;
  const bloodPress = vitals?.blood_press || ((hasValue(systolic) || hasValue(diastolic)) ? `${systolic || ""}/${diastolic || ""}` : "");
  return {
    date: moment().format("YYYY-MM-DD"),
    temp: vitals?.temp ?? vitals?.temperature ?? "",
    pres: vitals?.pres ?? vitals?.pulse ?? "",
    resp_rate: vitals?.resp_rate ?? vitals?.respiratoryRate ?? "",
    blood_press: bloodPress,
    spo2: vitals?.spo2 ?? vitals?.SpO2 ?? "",
    general_rbs: vitals?.general_rbs ?? vitals?.randomBloodSugar ?? vitals?.rbs ?? "",
    height: vitals?.height ?? "",
    weight: vitals?.weight ?? "",
    bmi: vitals?.bmi ?? "",
    bmr: vitals?.bmr ?? "",
    bsa: vitals?.bsa ?? "",
    fib4: vitals?.fib4 ?? "",
    ofc: vitals?.ofc ?? "",
    waist_circumference: vitals?.waist_circumference ?? vitals?.waistCircumference ?? "",
  };
}

function normalizeSideNavHistorySections(payload) {
  const rows = firstSideNavArray(payload, ["medical_history", "medicalHistory", "history"], { allowObjectRow: true });
  return convertAgentMedicalHistoryRowsToSections(rows)
    .filter((section) => section?.no_know_history || section?.tags?.length || hasValue(section?.medical_history_remarks));
}

function normalizeSideNavMedicalHistoryMatch(value) {
  return String(value || "").trim().toLowerCase();
}

function mapSideNavMedicalHistoryIdsFromDefaultList(data = [], defaultList = []) {
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      const incomingTitle = item?.title || item?.section || item?.type || "Medical Condition";
      let section = defaultList?.find((defaultItem) => (
        Number(defaultItem?.tmmhs_id) === Number(item?.tmmhs_id) ||
        normalizeSideNavMedicalHistoryMatch(defaultItem?.title) === normalizeSideNavMedicalHistoryMatch(incomingTitle)
      ));
      if (!section && normalizeSideNavMedicalHistoryMatch(incomingTitle) === "others") {
        section = defaultList?.find((defaultItem) => normalizeSideNavMedicalHistoryMatch(defaultItem?.title) === "lifestyle");
      }

      const mappedTags = Array.isArray(item?.tags)
        ? item.tags
          .map((tag) => {
            const tagTitle = String(tag?.title || tag?.name || tag?.lineItem || "").trim();
            if (!tagTitle) return null;
            const matchedTag = findMatchingMedicalHistoryTag(
              { title: tagTitle, tmmhst_id: tag?.tmmhst_id },
              section?.tags,
              section?.tmmhs_id
            );
            return {
              ...tag,
              title: tagTitle,
              ...(matchedTag?.tmmhst_id ? { tmmhst_id: matchedTag.tmmhst_id } : {}),
              note: tag?.note || tag?.notes || "",
              notes: tag?.notes || tag?.note || "",
              enable: tag?.enable === "" || tag?.enable === undefined ? "Y" : tag?.enable,
              relationship: tag?.relationship || tag?.relation || "",
              since: tag?.since || tag?.duration || "",
              status: tag?.status || "",
              medication: tag?.medication || "",
            };
          })
          .filter(Boolean)
        : [];

      return {
        ...item,
        title: section?.title || incomingTitle,
        ...(section?.tmmhs_id ? { tmmhs_id: section.tmmhs_id } : {}),
        no_know_history: Boolean(item?.no_know_history),
        tags: mappedTags,
      };
    })
    .filter((section) => section.no_know_history || section.tags.length || hasValue(section?.medical_history_remarks));
}

function mergeSideNavMedicalHistorySections(base = [], incoming = []) {
  const baseData = Array.isArray(base) ? JSON.parse(JSON.stringify(base)) : [];
  const incomingData = Array.isArray(incoming) ? JSON.parse(JSON.stringify(incoming)) : [];
  const usedIncomingIndexes = new Set();

  const merged = baseData.map((section) => {
    const incomingIndex = incomingData.findIndex((item) => (
      Number(item?.tmmhs_id) === Number(section?.tmmhs_id) ||
      normalizeSideNavMedicalHistoryMatch(item?.title) === normalizeSideNavMedicalHistoryMatch(section?.title)
    ));
    const incomingSection = incomingIndex >= 0 ? incomingData[incomingIndex] : null;
    if (!incomingSection) return section;
    usedIncomingIndexes.add(incomingIndex);

    const mergedTags = [
      ...(section?.tags || []).map((tag) => ({
        ...tag,
        ...(findMatchingMedicalHistoryTag(tag, incomingSection?.tags, section?.tmmhs_id) || {}),
      })),
      ...(incomingSection?.tags || []).filter(
        (incomingTag) => !(section?.tags || []).some((existingTag) =>
          tagsAreDuplicateForHistoryMerge(existingTag, incomingTag, section?.tmmhs_id)
        )
      ),
    ];

    return {
      ...section,
      ...incomingSection,
      tags: mergeMedicalHistoryTagsBySection(mergedTags, [], section?.tmmhs_id || incomingSection?.tmmhs_id),
    };
  });

  incomingData.forEach((section, index) => {
    if (!usedIncomingIndexes.has(index)) merged.push(section);
  });

  return merged;
}

function normalizeSideNavLabItems(payload) {
  return firstSideNavArray(payload, ["lab_investigations", "labInvestigations", "labInvestigation", "investigations", "investigation", "labResults", "labs"])
    .map((row) => ({
      ...row,
      investigation_name: row?.investigation_name || row?.test_name || row?.testName || row?.name || row?.label || "",
      note: row?.note ?? row?.notes ?? row?.value ?? row?.result ?? "",
      unique_id: row?.unique_id || row?.id || createSideNavVoiceId(),
    }))
    .filter((row) => hasValue(row.investigation_name));
}

function normalizeSideNavModuleResponse(responseJson, sectionId) {
  const payload = extractSideNavModulePayload(responseJson);
  switch (sectionId) {
    case "vitals":
      return { vitals: normalizeSideNavVitals(payload) };
    case "history":
      return { history: normalizeSideNavHistorySections(payload) };
    case "labResults":
      return { labResults: normalizeSideNavLabItems(payload) };
    default:
      return {};
  }
}

function sideNavObjectHasContent(object, ignoredKeys = []) {
  const ignored = new Set(ignoredKeys);
  return Object.entries(object || {}).some(([key, value]) => !ignored.has(key) && hasValue(value));
}

function appendPrivateNotesTranscript(existingNotes, transcript) {
  const current = String(existingNotes || "").trimEnd();
  const next = String(transcript || "").trim();
  if (!next) return current;
  return current ? `${current}\n${next}` : next;
}

async function requestSideNavModuleDigitise({ sectionId, audioBlob, patientId, doctorId, sessionId, previousContext }) {
  const moduleName = SIDE_NAV_MODULE_NAMES[sectionId];
  if (!moduleName) {
    throw new Error("Voice input is not available for this section.");
  }
  if (!patientId || !doctorId || !sessionId) {
    throw new Error("Missing patient, doctor, or session id for section voice digitisation.");
  }
  if (!audioBlob?.size) {
    throw new Error("No audio recording found for section voice digitisation.");
  }

  const formData = new FormData();
  formData.append("patient_id", String(patientId));
  formData.append("doctor_id", String(doctorId));
  formData.append("session_id", String(sessionId));
  formData.append("module_name", moduleName);
  appendSideNavJsonFormField(formData, "previous_context", previousContext);
  formData.append("audio", audioBlob, "audio.webm");

  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), SIDE_NAV_MODULE_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(joinAgentModuleApiUrl(SIDE_NAV_MODULE_ENDPOINT), {
      method: "POST",
      headers: buildClinicalApiHeaders({ includeContentType: false }),
      body: formData,
      signal: abortController.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Section voice digitise timed out after 120 seconds.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Section voice digitise failed with ${response.status}`);
  }

  return normalizeSideNavModuleResponse(await response.json(), sectionId);
}

function MedicalMaskIcon({ name, active }) {
  const variant = active ? "bulk" : "line";
  const src = `/new-assets/icons/medical/${name}--${variant}.svg`;
  return (
    <span
      className="snv-medical-icon"
      style={{
        "--snv-icon-url": `url("${src}")`,
      }}
      aria-hidden="true"
    />
  );
}

function IconPill({ item, active, signalUnread = false }) {
  const isMedical = item.icon.kind === "medical";
  const Icon = item.icon.Icon;

  return (
    <span className={`snv-icon-pill ${active ? "snv-icon-pill-active" : ""}`}>
      {isMedical ? (
        <MedicalMaskIcon name={item.icon.name} active={active} />
      ) : (
        <Icon
          size={20}
          variant={active ? "Bulk" : "Linear"}
          strokeWidth={active ? undefined : 1.5}
          color={active ? "var(--tp-blue-500)" : "#ffffff"}
        />
      )}
      {signalUnread ? <span className="snv-nav-signal-dot" aria-hidden="true" /> : null}
    </span>
  );
}

function NavItem({ item, active, onClick, signal }) {
  const signalUnread = Boolean(signal?.unread) && !active;
  const signalAnimating = Boolean(signal?.animating) && !active;
  return (
    <button
      type="button"
      className={`snv-nav-item ${active ? "snv-nav-item-active" : ""} ${signalAnimating ? "snv-nav-item-jiggle" : ""}`}
      onClick={() => onClick(item.id)}
      aria-current={active ? "page" : undefined}
    >
      <span className="snv-nav-item-inner">
        <IconPill item={item} active={active} signalUnread={signalUnread} />
        <span className="snv-nav-label">{item.label}</span>
      </span>
      {active ? <span className="snv-active-bar" aria-hidden="true" /> : null}
      {active ? <span className="snv-selection-arrow" aria-hidden="true" /> : null}
    </button>
  );
}

function NavPanel({ activeId, onSelect, items = NAV_ITEMS, signals = {} }) {
  const scrollRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    const updateHint = () => {
      const hasOverflow = node.scrollHeight > node.clientHeight + 2;
      const atTop = node.scrollTop <= 2;
      setShowScrollHint(hasOverflow && atTop);
    };

    updateHint();
    node.addEventListener("scroll", updateHint, { passive: true });
    window.addEventListener("resize", updateHint);

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateHint);
      observer.observe(node);
    }

    return () => {
      node.removeEventListener("scroll", updateHint);
      window.removeEventListener("resize", updateHint);
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <div className="snv-rail">
      <div ref={scrollRef} className="snv-rail-scroll">
        {items.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={activeId === item.id}
            onClick={onSelect}
            signal={signals[item.id]}
          />
        ))}
      </div>
      {showScrollHint ? (
        <div className="snv-scroll-hint" aria-hidden="true">
          <span className="snv-scroll-hint-dot">
            <ArrowDown2 color="#ffffff" size={16} strokeWidth={1.5} variant="Linear" />
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PastVisitCopyAffordance({ onClick, label = "Copy to RxPad" }) {
  return (
    <button
      type="button"
      className="snv-copy-btn"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      <Copy size={14} variant="Linear" />
    </button>
  );
}

function BulletList({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="snv-bullet-list">
      {items.map((item, index) => {
        const label = typeof item === "string" ? item : item.label;
        const detail = typeof item === "string" ? "" : item.detail;
        return (
          <li key={`${label}-${index}`} className={item?.fresh ? "snv-fresh-row" : ""}>
            <span className="snv-bullet-label">{label}</span>
            {detail ? <span className="snv-bullet-detail"> ({detail})</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function formatMedicalHistoryDetail(detail) {
  return String(detail || "")
    .split("|")
    .map((part) => part.trim().replace(/^(since|status|notes?|note):\s*/i, ""))
    .filter(Boolean)
    .join(", ");
}

function RxSection({ title, icon, children, onCopy, stickyTitle = false }) {
  return (
    <div className={`snv-rx-section ${stickyTitle ? "snv-rx-section-sticky-title" : ""}`}>
      <div className={`snv-rx-section-title ${stickyTitle ? "snv-rx-section-title-sticky" : ""}`}>
        <span className="snv-rx-section-icon">{icon}</span>
        <span>{title}</span>
        {onCopy && <PastVisitCopyAffordance onClick={onCopy} label={`Copy ${title} to RxPad`} />}
      </div>
      {children}
    </div>
  );
}

function PastVisitMedicalHistorySections({ sections = [], fallbackItems = [] }) {
  if (sections.length) {
    return (
      <div className="snv-past-medical-history-sections">
        {sections.map((section, index) => (
          <div key={section.id || `${section.title}-${index}`} className="snv-past-medical-history-section">
            <div className="snv-past-medical-history-title">{section.title || "Medical History"}</div>
            {section.items?.length ? (
              <BulletList items={section.items.map((item) => ({
                label: item.name,
                detail: formatMedicalHistoryDetail(item.detail),
                fresh: item.fresh,
              }))} />
            ) : (
              <div className="snv-empty-state">No data recorded.</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return <BulletList items={fallbackItems} />;
}

function PastVisitCustomModulesSection({ sections = [], onCopyAll, onCopyModule, onCopyRow }) {
  if (!sections.length) return null;

  return (
    <RxSection
      title="Custom Modules"
      icon={<RxSectionIcon src={RX_SECTION_ICONS.customModules} />}
      onCopy={onCopyAll}
      stickyTitle
    >
      <div className="snv-past-custom-module-sections">
        {sections.map((section, sectionIndex) => (
          <div key={section.id || `${section.title}-${sectionIndex}`} className="snv-past-custom-module-section">
            <div className="snv-past-custom-module-title">
              <span>{section.title || "Custom Module"}</span>
              <PastVisitCopyAffordance
                onClick={() => onCopyModule?.(section)}
                label={`Copy ${section.title || "custom module"} to RxPad`}
              />
            </div>
            <ul className="snv-bullet-list snv-past-custom-module-list">
              {section.rows.map((row, rowIndex) => (
                <li key={`${row.label}-${rowIndex}`} className="snv-past-custom-module-row">
                  <span className="snv-past-custom-module-row-text">
                    <span className="snv-bullet-label">{row.label}</span>
                    {row.detail ? <span className="snv-bullet-detail"> ({row.detail})</span> : null}
                  </span>
                  <PastVisitCopyAffordance
                    onClick={() => onCopyRow?.(section, row)}
                    label={`Copy ${row.label || "custom module row"} to RxPad`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </RxSection>
  );
}

const RX_SECTION_ICONS = {
  symptoms: ASSETS.images.symptoms,
  examination: ASSETS.images.examination,
  diagnosis: ASSETS.images.diagnosis,
  medications: ASSETS.images.medication,
  medicalHistory: ASSETS.images.medicalHistory,
  surgeries: ASSETS.images.surgery,
  customModules: ASSETS.images.customModule,
  advice: ASSETS.images.advice,
  investigations: ASSETS.images.lab,
  notes: ASSETS.images.notes,
  followUp: ASSETS.images.followup,
};

function RxSectionIcon({ src, alt = "" }) {
  if (!src) return null;
  return (
    <img
      className="snv-rx-section-icon-img"
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : "true"}
    />
  );
}

function hasListData(items) {
  return Array.isArray(items) && items.length > 0;
}

function DateCard({ title, subtitle, subtitleMeta, expanded, onToggle, onCopy, children, fresh, stickyHeader = false }) {
  const cardRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!stickyHeader || !cardRef.current || !headerRef.current) return undefined;

    const cardEl = cardRef.current;
    const headerEl = headerRef.current;
    const updateStickyOffset = () => {
      cardEl.style.setProperty(
        "--snv-date-card-sticky-offset",
        `${Math.ceil(headerEl.getBoundingClientRect().height)}px`
      );
    };

    updateStickyOffset();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateStickyOffset);
      observer.observe(headerEl);
    }

    window.addEventListener("resize", updateStickyOffset);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateStickyOffset);
      cardEl.style.removeProperty("--snv-date-card-sticky-offset");
    };
  }, [stickyHeader, title, subtitle]);

  return (
    <article ref={cardRef} className={`snv-date-card ${fresh ? "snv-fresh-card" : ""} ${stickyHeader ? "snv-date-card-sticky" : ""}`}>
      <div ref={headerRef} className={`snv-date-card-header ${stickyHeader ? "snv-date-card-header-sticky" : ""} ${expanded ? "snv-date-card-header-expanded" : ""}`}>
        <button type="button" className="snv-date-toggle-btn" onClick={onToggle}>
          <span className="snv-date-title-wrap">
            <span className="snv-date-title">{title}</span>
            {subtitle ? (
              <span className="snv-date-subtitle-row">
                <span className="snv-date-subtitle">{subtitle}</span>
                {subtitleMeta ? <span className="snv-date-speciality-pill">{subtitleMeta}</span> : null}
              </span>
            ) : null}
          </span>
        </button>
        {onCopy ? (
          <PastVisitCopyAffordance onClick={onCopy} label={`Copy ${title} visit to RxPad`} />
        ) : null}
        <button type="button" className="snv-date-arrow-btn" onClick={onToggle} aria-label={expanded ? "Collapse visit" : "Expand visit"}>
          {expanded ? <ArrowSquareUp size={18} variant="Linear" /> : <ArrowSquareDown size={18} variant="Linear" />}
        </button>
      </div>
      {expanded ? <div className="snv-date-card-body">{children}</div> : null}
    </article>
  );
}

function defaultExpandedMap(firstId) {
  return firstId ? { [firstId]: true } : {};
}

function DigitalRxShimmer() {
  return (
    <div className="snv-digital-rx-shimmer" aria-label="Loading digital Rx" role="status">
      <span className="snv-shimmer-block snv-digital-rx-shimmer-title" />
      <span className="snv-shimmer-block snv-digital-rx-shimmer-row" />
      <span className="snv-shimmer-block snv-digital-rx-shimmer-row" />
    </div>
  );
}

function WrittenRxShimmer() {
  return (
    <div className="snv-written-rx-shimmer" aria-label="Loading written Rx" role="status" />
  );
}

function LoadMoreRowsShimmer({ label = "Loading more" }) {
  return (
    <div className="snv-load-more-shimmer" aria-label={label} role="status">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className="snv-shimmer-block snv-load-more-shimmer-row" />
      ))}
    </div>
  );
}

function VitalsUpdatingShimmer() {
  return (
    <div className="snv-vitals-update-shimmer" aria-label="Updating vitals" role="status">
      <span className="snv-shimmer-block snv-vitals-update-title" />
      <span className="snv-shimmer-block snv-vitals-update-row" />
      <span className="snv-shimmer-block snv-vitals-update-row snv-vitals-update-row-short" />
    </div>
  );
}

function LoadMoreButton({ onClick, disabled = false }) {
  return (
    <button type="button" className="snv-load-more-btn" onClick={onClick} disabled={disabled}>
      <span className="snv-load-more-content">
        <span>Load more</span>
        <span className="snv-scroll-hint-dot snv-load-more-arrow" aria-hidden="true">
          <ArrowDown2 color="#202124" size={16} strokeWidth={1.5} variant="Linear" />
        </span>
      </span>
    </button>
  );
}

function LoadMoreFooter({ loading = false, onClick, shimmerLabel }) {
  return (
    <div className={`snv-load-more-footer ${loading ? "snv-load-more-footer-loading" : ""}`}>
      {loading ? <LoadMoreRowsShimmer label={shimmerLabel} /> : <LoadMoreButton onClick={onClick} />}
    </div>
  );
}

function PastVisitRxByLine({ attribution }) {
  if (!attribution?.text) return null;
  return <p className="snv-rx-by-line">{attribution.text}</p>;
}

function PastVisitInnerSectionCard({ title, children }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <DateCard
      title={title}
      expanded={expanded}
      onToggle={() => setExpanded((prev) => !prev)}
    >
      <div className="snv-past-native-body">
        {children}
      </div>
    </DateCard>
  );
}

function hasVaccineContent(data) {
  return Boolean((data?.pending || []).length || (data?.given || []).length);
}

function PastVisitNativeSections({ rx }) {
  const vitalsEntries = Array.isArray(rx?.vitals) ? rx.vitals : [];
  const gynecSections = Array.isArray(rx?.gynec) ? rx.gynec : [];
  const obstetricSections = Array.isArray(rx?.obstetric) ? rx.obstetric : [];
  const vaccineData = rx?.vaccine || { pending: [], given: [] };

  if (!vitalsEntries.length && !gynecSections.length && !obstetricSections.length && !hasVaccineContent(vaccineData)) {
    return null;
  }

  return (
    <div className="snv-past-native-sections">
      {vitalsEntries.map((entry) => (
        <PastVisitInnerSectionCard key={entry.id} title={entry.dateLabel || "Vitals"}>
          <KeyValueRows rows={entry.rows || []} />
        </PastVisitInnerSectionCard>
      ))}
      {gynecSections.length ? (
        <PastVisitInnerSectionCard title="Gynec">
          <SectionCardsBody sections={gynecSections} />
        </PastVisitInnerSectionCard>
      ) : null}
      {obstetricSections.length ? (
        <PastVisitInnerSectionCard title="Obstetric">
          <div className="snv-ob-content">
            <ObstetricBody sections={obstetricSections} />
          </div>
        </PastVisitInnerSectionCard>
      ) : null}
      {hasVaccineContent(vaccineData) ? (
        <PastVisitInnerSectionCard title="Vaccine">
          <VaccineBody data={vaccineData} />
        </PastVisitInnerSectionCard>
      ) : null}
    </div>
  );
}

function PastVisitsContent({ visits, hasMore, loading, onLoadMore, onExpand, onCopyPayload }) {
  const pendingLoadMoreRef = useRef(false);
  const firstVisitId = visits[0]?.id;
  const [expandedById, setExpandedById] = useState(() => defaultExpandedMap(firstVisitId));
  const [modeByVisit, setModeByVisit] = useState({});
  const [visibleCount, setVisibleCount] = useState(PAST_VISITS_BATCH_SIZE);

  useEffect(() => {
    setExpandedById(defaultExpandedMap(firstVisitId));
    setVisibleCount(PAST_VISITS_BATCH_SIZE);
    pendingLoadMoreRef.current = false;
  }, [firstVisitId]);

  useEffect(() => {
    const firstVisit = visits.find((visit) => expandedById[visit.id]);
    if (firstVisit) onExpand(firstVisit);
  }, [expandedById, onExpand, visits]);

  const handleVisitToggle = useCallback((visitItem, expanded) => {
    setExpandedById((prev) => ({ ...prev, [visitItem.id]: !expanded }));
    if (!expanded) onExpand(visitItem);
  }, [onExpand]);

  useEffect(() => {
    if (!pendingLoadMoreRef.current || loading || visibleCount >= visits.length) return;
    setVisibleCount((current) => Math.min(current + PAST_VISITS_BATCH_SIZE, visits.length));
    pendingLoadMoreRef.current = false;
  }, [loading, visibleCount, visits.length]);

  const visibleVisits = useMemo(() => visits.slice(0, visibleCount), [visibleCount, visits]);
  const canLoadMore = visibleCount < visits.length || hasMore;
  const showLoadMoreFooter = canLoadMore || loading;
  const showPastVisitsEmptyState = visits.length === 0 && !loading;

  const handleLoadMore = useCallback(() => {
    if (visibleCount < visits.length) {
      setVisibleCount((current) => Math.min(current + PAST_VISITS_BATCH_SIZE, visits.length));
      return;
    }
    if (hasMore && !loading) {
      pendingLoadMoreRef.current = true;
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore, visibleCount, visits.length]);

  const handleCopyPayload = useCallback((payload, successMessage, opts) => {
    if (!payload) return;
    onCopyPayload?.(payload, {
      ...opts,
      onAfterCopy: () => toast.success(successMessage),
    });
  }, [onCopyPayload]);

  const handleCopyVisit = useCallback((visitItem) => {
    handleCopyPayload(
      buildPastVisitAllPayload(visitItem),
      `${visitItem.dateLabel} copied to RxPad`,
      { bulk: true }
    );
  }, [handleCopyPayload]);

  const handleCopySection = useCallback((visitItem, sectionKey, title) => {
    handleCopyPayload(
      buildPastVisitSectionPayload(visitItem, sectionKey),
      `${title} copied to RxPad`
    );
  }, [handleCopyPayload]);

  const handleCopyCustomModule = useCallback((visitItem, moduleSection) => {
    handleCopyPayload(
      buildPastVisitCustomModulePayload(visitItem, moduleSection),
      `${moduleSection?.title || "Custom module"} copied to RxPad`
    );
  }, [handleCopyPayload]);

  const handleCopyCustomModuleRow = useCallback((visitItem, moduleSection, row) => {
    handleCopyPayload(
      buildPastVisitCustomModulePayload(visitItem, moduleSection, row),
      `${row?.label || moduleSection?.title || "Custom module row"} copied to RxPad`
    );
  }, [handleCopyPayload]);

  return (
    <div
      className={`snv-content-scroll snv-past-visits-scroll ${showLoadMoreFooter ? "snv-content-scroll-has-load-more" : ""} ${showPastVisitsEmptyState ? "snv-past-visits-scroll-empty" : ""}`}
      data-snv-scroll-root="true"
    >
      {showPastVisitsEmptyState ? (
        <div className="snv-past-visits-empty-state">
          <img
            className="snv-past-visits-empty-icon"
            src="/new-assets/icons/dr-agent/empty-docs.svg"
            alt=""
            width={72}
            height={72}
            draggable={false}
          />
          <p className="snv-past-visits-empty-text">
            This patient hasn{"\u2019"}t had any visits at your hospital yet.
          </p>
        </div>
      ) : (
        visibleVisits.map((visitItem) => {
          const expanded = Boolean(expandedById[visitItem.id]);
          const showRxModeTabs = shouldShowPastVisitRxModeTabs(visitItem.rxSourceType);
          const mode = showRxModeTabs ? modeByVisit[visitItem.id] || (visitItem.digitalRx ? "digital" : "written") : "digital";
          const rx = visitItem.digitalRx;
          const rxByAttribution = rx?.doctorAttribution || visitItem.doctorAttribution;
          const canCopyVisit = Boolean(visitItem.detailLoaded && buildPastVisitAllPayload(visitItem));

          return (
            <DateCard
              key={visitItem.id}
              title={visitItem.dateLabel}
              subtitle={rxByAttribution?.text}
              subtitleMeta={rxByAttribution?.specialityShort}
              expanded={expanded}
              fresh={visitItem.fresh}
              stickyHeader
              onToggle={() => handleVisitToggle(visitItem, expanded)}
              onCopy={canCopyVisit ? () => handleCopyVisit(visitItem) : undefined}
            >
              {showRxModeTabs ? (
                <div className="snv-segmented">
                  <button
                    type="button"
                    className={mode === "digital" ? "snv-segmented-active" : ""}
                    onClick={() => setModeByVisit((prev) => ({ ...prev, [visitItem.id]: "digital" }))}
                  >
                    Digital Rx
                  </button>
                  <button
                    type="button"
                    className={mode === "written" ? "snv-segmented-active" : ""}
                    onClick={() => setModeByVisit((prev) => ({ ...prev, [visitItem.id]: "written" }))}
                  >
                    Written Rx
                  </button>
                </div>
              ) : null}
              {mode === "written" ? (
                visitItem.detailLoading ? (
                  <WrittenRxShimmer />
                ) : (
                  <WrittenRxContent docs={visitItem.writtenRx || []} />
                )
              ) : visitItem.detailLoading ? (
                <DigitalRxShimmer />
              ) : rx ? (
                <>
                  {hasListData(rx.symptoms) ? <RxSection title="Symptoms" icon={<RxSectionIcon src={RX_SECTION_ICONS.symptoms} />} onCopy={() => handleCopySection(visitItem, "symptoms", "Symptoms")}><BulletList items={rx.symptoms} /></RxSection> : null}
                  {hasListData(rx.examinations) ? <RxSection title="Examination" icon={<RxSectionIcon src={RX_SECTION_ICONS.examination} />} onCopy={() => handleCopySection(visitItem, "examinations", "Examination")}><BulletList items={rx.examinations} /></RxSection> : null}
                  {hasListData(rx.diagnoses) ? <RxSection title="Diagnosis" icon={<RxSectionIcon src={RX_SECTION_ICONS.diagnosis} />} onCopy={() => handleCopySection(visitItem, "diagnosis", "Diagnosis")}><BulletList items={rx.diagnoses} /></RxSection> : null}
                  {hasListData(rx.medications) ? <RxSection title="Med (Rx)" icon={<RxSectionIcon src={RX_SECTION_ICONS.medications} />} onCopy={() => handleCopySection(visitItem, "medications", "Med (Rx)")}><BulletList items={rx.medications} /></RxSection> : null}
                  {(hasListData(rx.medicalHistorySections) || hasListData(rx.medicalHistory)) ? (
                    <RxSection title="Medical History" icon={<RxSectionIcon src={RX_SECTION_ICONS.medicalHistory} />}>
                      <PastVisitMedicalHistorySections sections={rx.medicalHistorySections || []} fallbackItems={rx.medicalHistory || []} />
                    </RxSection>
                  ) : null}
                  {hasListData(rx.surgeries) ? <RxSection title="Surgeries" icon={<RxSectionIcon src={RX_SECTION_ICONS.surgeries} />} onCopy={() => handleCopySection(visitItem, "surgeries", "Surgeries")}><BulletList items={rx.surgeries} /></RxSection> : null}
                  {hasListData(rx.moduleContentSections) ? (
                    <PastVisitCustomModulesSection
                      sections={rx.moduleContentSections}
                      onCopyAll={() => handleCopySection(visitItem, "moduleContents", "Custom Modules")}
                      onCopyModule={(moduleSection) => handleCopyCustomModule(visitItem, moduleSection)}
                      onCopyRow={(moduleSection, row) => handleCopyCustomModuleRow(visitItem, moduleSection, row)}
                    />
                  ) : null}
                  {hasListData(rx.advice) ? <RxSection title="Advice" icon={<RxSectionIcon src={RX_SECTION_ICONS.advice} />} onCopy={() => handleCopySection(visitItem, "advice", "Advice")}><BulletList items={rx.advice} /></RxSection> : null}
                  {hasListData(rx.labInvestigations) ? <RxSection title="Investigations" icon={<RxSectionIcon src={RX_SECTION_ICONS.investigations} />} onCopy={() => handleCopySection(visitItem, "investigations", "Investigations")}><BulletList items={rx.labInvestigations} /></RxSection> : null}
                  {rx.additionalNotes ? <RxSection title="Additional Notes" icon={<RxSectionIcon src={RX_SECTION_ICONS.notes} />} onCopy={() => handleCopySection(visitItem, "additionalNotes", "Additional Notes")}><p className="snv-section-text">{rx.additionalNotes}</p></RxSection> : null}
                  {rx.followUp ? <RxSection title="Follow Up" icon={<RxSectionIcon src={RX_SECTION_ICONS.followUp} />} onCopy={() => handleCopySection(visitItem, "followUp", "Follow Up")}><p className="snv-section-text">{rx.followUp}</p></RxSection> : null}
                  <PastVisitNativeSections rx={rx} />
                  <PastVisitRxByLine attribution={rxByAttribution} />
                </>
              ) : (
                <div className="snv-empty-state">No digital Rx available for this visit.</div>
              )}
            </DateCard>
          );
        })
      )}
      {showLoadMoreFooter ? (
        <LoadMoreFooter loading={loading} onClick={handleLoadMore} shimmerLabel="Loading more visits" />
      ) : null}
    </div>
  );
}

function WrittenRxPreview({ doc }) {
  const dispatch = useDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const printUrlWithLang = useMemo(() => {
    if (!doc?.printUrl) return null;
    return doc.printUrl;
  }, [doc?.printUrl]);
  const cachedPayloadJson = useSelector((state) =>
    printUrlWithLang ? state.pastVisits.prescriptionPayloads[printUrlWithLang] ?? null : null
  );
  const cachedPayload = useMemo(() => {
    if (!cachedPayloadJson) return null;
    try { return JSON.parse(cachedPayloadJson); } catch { return null; }
  }, [cachedPayloadJson]);
  const { payload, printBlob, isGenerating, error } = usePrintPayloadPdf({
    printUrl: printUrlWithLang,
    selectedLang: undefined,
    isGynaecHistoryAccessable: false,
    payloadOverride: cachedPayload || undefined,
    skipFetch: !printUrlWithLang,
  });
  useEffect(() => {
    if (payload && printUrlWithLang && !cachedPayloadJson) {
      dispatch(setPrescriptionPayload({ url: printUrlWithLang, payload }));
    }
  }, [payload, printUrlWithLang, cachedPayloadJson, dispatch]);
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    if (!(printBlob instanceof Blob)) {
      setBlobUrl("");
      return undefined;
    }
    const nextUrl = URL.createObjectURL(printBlob);
    setBlobUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [printBlob]);

  const handlePrint = useCallback(() => {
    if (!(printBlob instanceof Blob)) return;
    const nextUrl = URL.createObjectURL(printBlob);
    window.open(nextUrl, "_blank");
    setMenuOpen(false);
    window.setTimeout(() => URL.revokeObjectURL(nextUrl), 30000);
  }, [printBlob]);

  if (isGenerating) return <WrittenRxShimmer />;
  if (error || !blobUrl) return <div className="snv-empty-state">No written Rx available.</div>;

  return (
    <div className="snv-written-preview-card">
      <iframe
        title="Written Rx preview"
        src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
        className="snv-written-preview-frame"
      />
      <div className="snv-written-preview-footer">
        <div className="snv-written-preview-meta">
          {doc.doctorName ? <div className="snv-written-preview-doctor">{doc.doctorName}</div> : null}
          {doc.speciality ? <div className="snv-written-preview-speciality">{doc.speciality}</div> : null}
        </div>
        <div className="snv-written-actions">
          <button
            type="button"
            className="snv-written-more-btn"
            aria-label="Written Rx actions"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <svg
              className="snv-written-more-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {menuOpen ? (
            <div className="snv-written-menu">
              <button type="button" className="snv-written-menu-item" onClick={handlePrint}>
                <Printer size={15} variant="Linear" />
                <span>Print</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WrittenRxContent({ docs = [] }) {
  if (!docs.length) return <div className="snv-empty-state">No written Rx available.</div>;
  return (
    <div className="snv-written-list">
      {docs.map((doc) => (
        <WrittenRxPreview key={doc.id || doc.printUrl} doc={doc} />
      ))}
    </div>
  );
}

function DirectionArrow({ direction }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`snv-kv-arrow snv-kv-arrow-${direction}`}>
      {direction === "high" ? (
        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function KeyValueRows({ rows }) {
  return (
    <div className="snv-kv-list">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className={`snv-kv-row ${row.abnormal ? "snv-kv-row-abnormal" : ""} ${row.fresh ? "snv-fresh-row" : ""}`}>
          <span className="snv-kv-label">{row.label} {row.unit ? <span className="snv-kv-unit">{row.unit}</span> : null}</span>
          <span className="snv-kv-value-wrap">
            {row.direction ? <DirectionArrow direction={row.direction} /> : null}
            <span className="snv-kv-value">{row.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function DateEntryCard({ entry, expanded, onToggle }) {
  return (
    <DateCard
      title={entry.dateLabel}
      expanded={expanded}
      fresh={entry.fresh}
      onToggle={onToggle}
    >
      <KeyValueRows rows={entry.rows} />
    </DateCard>
  );
}

const EMPTY_SECTION_CONFIG = {
  vitals: {
    message: "No vitals have been recorded for this patient yet.",
    addLabel: "Add Vitals",
    showVoice: false,
  },
  history: {
    message: "No medical history has been recorded for this patient yet.",
    addLabel: "Add Medical History",
    showVoice: true,
  },
  labResults: {
    message: "No lab results have been added for this patient yet.",
    addLabel: "Add Lab Results",
    showVoice: false,
  },
  gynec: {
    message: "No gynec history has been recorded for this patient yet.",
    addLabel: "Add Gynec History",
    showVoice: false,
  },
  obstetric: {
    message: "No obstetric history has been recorded for this patient yet.",
    addLabel: "Add Obstetric History",
    showVoice: false,
  },
  growth: {
    message: "No growth measurements have been recorded for this patient yet.",
    addLabel: "Add Growth",
    showVoice: false,
  },
  optal: {
    message: "No ophthal exams have been recorded for this patient yet.",
    showAction: false,
    showVoice: false,
  },
};

function SideNavEmptyState({ sectionId, onActionClick, onVoiceClick, showVoiceAction = true, voiceDisabled = false }) {
  const config = EMPTY_SECTION_CONFIG[sectionId];
  if (!config) return null;
  const showVoice = config.showVoice && showVoiceAction;

  return (
    <div className="snv-section-empty-state">
      <img
        className="snv-section-empty-icon"
        src="/new-assets/icons/dr-agent/empty-docs.svg"
        alt=""
        width={72}
        height={72}
        draggable={false}
      />
      <p className="snv-section-empty-text">{config.message}</p>
      {config.showAction === false ? null : (
        <div className="snv-section-empty-actions">
          <button
            type="button"
            className="snv-section-empty-primary"
            onClick={() => onActionClick?.(sectionId)}
          >
            <span className="snv-section-empty-plus" aria-hidden="true" />
            <span>{config.addLabel}</span>
          </button>
          {showVoice ? (
            <button
              type="button"
              className="snv-section-empty-voice"
              onClick={voiceDisabled ? undefined : onVoiceClick}
              disabled={voiceDisabled}
            >
              <VoiceRxIcon size={24} color="#673AAC" />
              <span>Add via voice</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function DateRowsContent({ entries = [], updating = false, emptyState }) {
  const firstEntryId = entries[0]?.id;
  const [expandedById, setExpandedById] = useState(() => defaultExpandedMap(firstEntryId));
  const [visibleCount, setVisibleCount] = useState(SIDE_NAV_BATCH_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreTimerRef = useRef(null);

  useEffect(() => {
    setExpandedById(defaultExpandedMap(firstEntryId));
    setVisibleCount(SIDE_NAV_BATCH_SIZE);
    setLoadingMore(false);
    if (loadingMoreTimerRef.current) {
      clearTimeout(loadingMoreTimerRef.current);
      loadingMoreTimerRef.current = null;
    }
  }, [firstEntryId]);

  useEffect(() => () => {
    if (loadingMoreTimerRef.current) clearTimeout(loadingMoreTimerRef.current);
  }, []);

  const visibleEntries = useMemo(() => entries.slice(0, visibleCount), [entries, visibleCount]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);
    loadingMoreTimerRef.current = setTimeout(() => {
      setVisibleCount((current) => Math.min(current + SIDE_NAV_BATCH_SIZE, entries.length));
      setLoadingMore(false);
      loadingMoreTimerRef.current = null;
    }, 300);
  }, [entries.length, loadingMore]);

  const canLoadMore = visibleCount < entries.length;
  const showLoadMoreFooter = canLoadMore || loadingMore;

  return (
    <div className={`snv-content-scroll ${showLoadMoreFooter ? "snv-content-scroll-has-load-more" : ""}`} data-snv-scroll-root="true">
      {updating ? <VitalsUpdatingShimmer /> : null}
      {entries.length === 0 && !updating ? (
        emptyState || <div className="snv-empty-state">No data recorded.</div>
      ) : (
        visibleEntries.map((entry) => {
          const expanded = Boolean(expandedById[entry.id]);
          return (
            <DateEntryCard
              key={entry.id}
              entry={entry}
              expanded={expanded}
              onToggle={() => setExpandedById((prev) => ({ ...prev, [entry.id]: !expanded }))}
            />
          );
        })
      )}
      {showLoadMoreFooter ? (
        <LoadMoreFooter loading={loadingMore} onClick={handleLoadMore} shimmerLabel="Loading more vitals" />
      ) : null}
    </div>
  );
}

function VirtualDateRowsContent({ entries = [], emptyState }) {
  const scrollRef = useRef(null);
  const firstEntryId = entries[0]?.id;
  const [expandedById, setExpandedById] = useState(() => defaultExpandedMap(firstEntryId));
  const [visibleCount, setVisibleCount] = useState(SIDE_NAV_BATCH_SIZE);

  useEffect(() => {
    setExpandedById(defaultExpandedMap(firstEntryId));
    setVisibleCount(SIDE_NAV_BATCH_SIZE);
  }, [firstEntryId]);

  const visibleEntries = useMemo(() => entries.slice(0, visibleCount), [entries, visibleCount]);

  const rowVirtualizer = useVirtualizer({
    count: visibleEntries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => expandedById[visibleEntries[index]?.id] ? 360 : 78,
    overscan: 4,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div ref={scrollRef} className="snv-content-scroll" data-snv-scroll-root="true">
      {entries.length === 0 ? (
        emptyState || <div className="snv-empty-state">No data recorded.</div>
      ) : (
        <div className="snv-virtual-list" style={{ height: rowVirtualizer.getTotalSize() }}>
          {virtualRows.map((virtualRow) => {
            const entry = visibleEntries[virtualRow.index];
            const expanded = Boolean(expandedById[entry.id]);
            return (
              <div
                key={entry.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className="snv-virtual-row"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <DateEntryCard
                  entry={entry}
                  expanded={expanded}
                  onToggle={() => setExpandedById((prev) => ({ ...prev, [entry.id]: !expanded }))}
                />
              </div>
            );
          })}
        </div>
      )}
      {visibleCount < entries.length ? (
        <button
          type="button"
          className="snv-load-more-btn"
          onClick={() => setVisibleCount((current) => Math.min(current + SIDE_NAV_BATCH_SIZE, entries.length))}
        >
          Load more
        </button>
      ) : null}
    </div>
  );
}

function HistoryContent({ sections = [], emptyState }) {
  return (
    <div className="snv-content-scroll" data-snv-scroll-root="true">
      {sections.length === 0 ? (
        emptyState || <div className="snv-empty-state">No data recorded.</div>
      ) : sections.map((section) => (
        <div key={section.id} className={`snv-info-card ${section.fresh ? "snv-fresh-card" : ""}`}>
          <div className="snv-info-card-title">{section.title}</div>
          {section.items.length ? (
            <div className="snv-bullet-list-wrapper">
              <BulletList items={section.items.map((item) => ({ label: item.name, detail: formatMedicalHistoryDetail(item.detail), fresh: item.fresh }))} />
            </div>
          )
           : <div className="snv-empty-state">No data recorded.</div>}
        </div>
      ))}
    </div>
  );
}

function SectionCardsBody({ sections = [] }) {
  return (
    <>
      {sections.map((section) => (
        <div key={section.id} className={`snv-info-card ${section.fresh ? "snv-fresh-card" : ""}`}>
          <div className="snv-info-card-title">{section.title}</div>
          <div className="snv-card-lines">
            {(section.lines || []).map((line, i) => (
              <p key={i} className="snv-card-line">{line}</p>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function SectionCardsContent({ sections, emptyState }) {
  return (
    <div className="snv-content-scroll" data-snv-scroll-root="true">
      {sections.length === 0 ? (
        emptyState || <div className="snv-empty-state">No data recorded.</div>
      ) : (
        <SectionCardsBody sections={sections} />
      )}
    </div>
  );
}

function ObstetricPatientInfoCard({ section }) {
  return (
    <article className="snv-ob-card snv-ob-patient-card">
      <div className="snv-ob-card-title">{section.title}</div>
      <div className="snv-ob-patient-body">
        {(section.rows || []).map((row, rowIndex) => (
          <div key={rowIndex} className="snv-ob-patient-row">
            {row.map((item, index) => (
              <React.Fragment key={`${item.label}-${index}`}>
                {index > 0 ? <span className="snv-ob-separator" aria-hidden="true">|</span> : null}
                <span className="snv-ob-field">
                  <span className="snv-ob-label">{item.label}: </span>
                  <strong>{item.value}</strong>
                </span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}

function ObstetricGplaeCard({ section }) {
  return (
    <article className="snv-ob-card">
      <div className="snv-ob-card-title snv-ob-gplae-title">
        <span>{section.title}</span>
        {section.badge ? <span className="snv-ob-badge">{section.badge}</span> : null}
      </div>
      <div className="snv-ob-gplae-body">
        {(section.parts || []).map((part, index) => (
          <React.Fragment key={part.label}>
            {index > 0 ? <span className="snv-ob-separator" aria-hidden="true">|</span> : null}
            <span className="snv-ob-gplae-part">{part.label}: <strong>{part.value}</strong></span>
          </React.Fragment>
        ))}
      </div>
      {section.notes ? <div className="snv-ob-note">Notes: <strong>{section.notes}</strong></div> : null}
    </article>
  );
}

function ObstetricBulletCard({ section }) {
  return (
    <article className="snv-ob-card">
      <div className="snv-ob-card-title">
        <span>{section.title}</span>
        <ArrowSquareUp size={18} variant="Linear" />
      </div>
      <ul className="snv-ob-bullet-list">
        {(section.items || []).map((item, index) => (
          <li key={`${item.strong}-${index}`}>
            <strong>{item.strong}</strong>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function getVisibleObstetricSections(sections = []) {
  return sections.filter((section) => {
    if (section.type === "patientInfo") return (section.rows || []).some((row) => row.length > 0);
    if (section.type === "gplae") return (section.parts || []).length > 0 || section.badge || section.notes;
    return (section.items || []).length > 0;
  });
}

function ObstetricBody({ sections = [] }) {
  const visibleSections = getVisibleObstetricSections(sections);

  return (
    <>
      {visibleSections.map((section) => {
        if (section.type === "patientInfo") return <ObstetricPatientInfoCard key={section.id} section={section} />;
        if (section.type === "gplae") return <ObstetricGplaeCard key={section.id} section={section} />;
        return <ObstetricBulletCard key={section.id} section={section} />;
      })}
    </>
  );
}

function ObstetricContent({ sections = [], emptyState }) {
  const visibleSections = getVisibleObstetricSections(sections);

  return (
    <div className="snv-content-scroll snv-ob-content" data-snv-scroll-root="true">
      {visibleSections.length === 0 ? (
        emptyState || <div className="snv-empty-state">No data recorded.</div>
      ) : (
        <ObstetricBody sections={visibleSections} />
      )}
    </div>
  );
}

const RECORD_FILTER_TYPES = ["All", "Pathology", "Prescription", "Radiology"];

const NOOP = () => {};

function RecordsContent({
  records = [],
  rawDocs = [],
  uploadDocCategories = [],
  handleDrawerUploadDoc = NOOP,
  setFilesData = NOOP,
  setIsEditDocument = NOOP,
  setUploadDocDrawer = NOOP,
}) {
  const scrollRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const hasRawDocs = rawDocs.length > 0;

  const availableFilters = useMemo(() => {
    if (hasRawDocs) {
      return ["All", ...Array.from(new Set(
      rawDocs.map((doc) => CATEGORY_TO_FILTER[resolveCategoryName(doc.category_id, uploadDocCategories)] || "Other")
      ))];
    }
    return RECORD_FILTER_TYPES;
  }, [hasRawDocs, rawDocs, uploadDocCategories]);

  const filteredDocs = useMemo(() => {
    if (!hasRawDocs) return [];
    return activeFilter === "All"
      ? rawDocs
      : rawDocs.filter((doc) => {
          const catName = resolveCategoryName(doc.category_id, uploadDocCategories);
          return (CATEGORY_TO_FILTER[catName] || "Other") === activeFilter;
        });
  }, [activeFilter, hasRawDocs, rawDocs, uploadDocCategories]);

  const filteredRecords = useMemo(
    () => activeFilter === "All" ? records : records.filter((record) => record.filterType === activeFilter),
    [activeFilter, records]
  );

  const visibleItems = hasRawDocs ? filteredDocs : filteredRecords;
  const hasRecords = hasRawDocs ? rawDocs.length > 0 : records.length > 0;
  const rowVirtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: hasRawDocs ? () => 240 : () => 76,
    overscan: 5,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeFilter]);

  return (
    <div
      ref={scrollRef}
      className={`snv-content-scroll ${hasRawDocs ? "snv-records-list" : ""}`}
      data-snv-scroll-root="true"
    >
      {!hasRecords ? (
        <div className="snv-empty-state">No data recorded.</div>
      ) : (
        <div className="snv-filter-strip">
          {availableFilters.map((f) => (
            <button
              key={f}
              type="button"
              className={`snv-filter-chip ${activeFilter === f ? "snv-filter-chip-active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}
      {hasRecords && visibleItems.length === 0 ? (
        <div className="snv-empty-state">No records in this category.</div>
      ) : null}
      {visibleItems.length > 0 ? (
        <div className="snv-virtual-list" style={{ height: rowVirtualizer.getTotalSize() }}>
          {virtualRows.map((virtualRow) => {
            const item = visibleItems[virtualRow.index];
            const key = hasRawDocs ? item.id || item.document_id || item.file_name || virtualRow.index : item.id;
            return (
              <div
                key={key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className="snv-virtual-row"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                {hasRawDocs ? (
                  <RecordCard
                    cardData={item}
                    handleDrawerUploadDoc={handleDrawerUploadDoc}
                    setFilesData={setFilesData}
                    setIsEditDocument={setIsEditDocument}
                    setUploadDocDrawer={setUploadDocDrawer}
                  />
                ) : (
                  <div className="snv-record-thumb-card">
                    <div
                      className={`snv-record-thumb ${item.thumbnailUrl ? "" : `snv-thumb-${item.imgType}`}`}
                      style={item.thumbnailUrl ? {
                        backgroundImage: `url('${item.thumbnailUrl}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      } : undefined}
                      aria-hidden="true"
                    />
                    <div className="snv-record-thumb-info">
                      <div className="snv-record-thumb-label">{item.label}</div>
                      <div className="snv-record-thumb-date">{item.date}</div>
                      {item.categoryName ? <div className="snv-record-thumb-date">{item.categoryName}</div> : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const TODAY_VACC = new Date();

function parseDueDateStr(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatVaccDate(s) {
  const d = parseDueDateStr(s);
  if (!d) return s;
  const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${M[d.getMonth()]}'${String(d.getFullYear()).slice(-2)}`;
}

function groupVaccByWeek(rows) {
  const order = [];
  const map = new Map();
  for (const v of rows) {
    if (!map.has(v.week)) { map.set(v.week, []); order.push(v.week); }
    map.get(v.week).push(v);
  }
  return order.map((week) => ({ week, items: map.get(week) }));
}

function buildLegacyVaccineData(patientVaccineRows = [], vaccineTemplateRows = []) {
  if (vaccineTemplateRows.length) {
    const rows = vaccineTemplateRows.map((item) => {
      const dueDate = item?.tvd_due_date || item?.dueDate || "";
      return {
        week: item?.tvt_age || "Vaccines",
        name: item?.tvac_name || item?.tvt_name || "Vaccine",
        givenDate: item?.tvp_given_date ? formatVaccDate(item.tvp_given_date) : "",
        dueDate,
        brand: item?.tvc_name || item?.brandName || "",
        notes: [
          item?.tvp_remarks,
          item?.tvd_remarks,
          item?.remarks,
          item?.tvpv_route && `Route: ${item.tvpv_route}`,
          item?.tvpv_dose && `Dose: ${item.tvpv_dose}`,
          item?.tvpv_site && `Site: ${item.tvpv_site}`,
        ].filter(Boolean).join(" | "),
      };
    });

    return {
      pending: rows.filter((item) => !item.givenDate && item.dueDate),
      given: rows.filter((item) => item.givenDate),
    };
  }

  const templateById = new Map(
    vaccineTemplateRows
      .filter((item) => item?.tvt_id)
      .map((item) => [item.tvt_id, item])
  );
  const given = patientVaccineRows
    .filter((item) => item?.tvp_given_date || item?.tvac_name)
    .map((item) => {
      const template = templateById.get(item?.tvp_temp_id) || {};
      const givenDate = item?.tvp_given_date ? formatVaccDate(item.tvp_given_date) : "";
      const fallbackWeek = item?.tvp_given_date ? `Given on ${givenDate}` : "Given Vaccines";
      const details = [
        item?.tvpv_route && `Route: ${item.tvpv_route}`,
        item?.tvpv_dose && `Dose: ${item.tvpv_dose}`,
        item?.tvpv_site && `Site: ${item.tvpv_site}`,
      ].filter(Boolean);

      return {
        week: template?.tvt_age || item?.tvt_age || fallbackWeek,
        name: item?.tvac_name || template?.tvt_name || "Vaccine",
        givenDate,
        dueDate: template?.dueDate || template?.tvd_due_date || "",
        brand: item?.tvc_name || item?.brandName || "",
        notes: [item?.tvp_remarks, ...details].filter(Boolean).join(" | "),
      };
    });

  return { pending: [], given };
}

function hasOpthalValue(value) {
  if (value === 0 || value === "0") return true;
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || /^[-–—]+$/.test(trimmed)) return false;
    if (/^(n\/?a|nil)$/i.test(trimmed)) return false;
    return true;
  }
  return Boolean(value);
}

function normalizeOpthalEye(eye) {
  const normalized = String(eye || "").toUpperCase();
  if (normalized === "RE") return "OD";
  if (normalized === "LE") return "OS";
  return normalized;
}

function findOpthalEyeRow(rows = [], eye) {
  return rows.find((item) => normalizeOpthalEye(item?.eye) === eye) || {};
}

function opthalDetailText(parts = []) {
  return parts.filter((part) => hasOpthalValue(part?.value)).map((part) => `${part.label}: ${part.value}`).join(", ");
}

function buildOpthalEyeItems(rows = [], config = []) {
  return ["OD", "OS"].flatMap((eye) => {
    const row = findOpthalEyeRow(rows, eye);
    const detail = opthalDetailText(config.map((item) => ({ label: item.label, value: row[item.key] })));
    return detail ? [{ label: eye, detail }] : [];
  });
}

function buildOpthalStructureItems(rows = []) {
  return rows.flatMap((item) => {
    const detail = opthalDetailText([
      { label: "OD", value: item?.OD ?? item?.od },
      { label: "OS", value: item?.OS ?? item?.os },
      { label: "Remarks", value: item?.remarks },
    ]);
    return detail ? [{ label: item?.section || item?.name || "Finding", detail }] : [];
  });
}

function buildLegacyOpthalEntries(rows = []) {
  return rows.flatMap((row, index) => {
    const sections = [
      {
        id: "visual-acuity",
        title: "Visual Acuity Test",
        icon: "Tt",
        items: buildOpthalEyeItems(row?.visualAcuity, [
          { key: "ucDistance", label: "UC Dist" },
          { key: "pinhole", label: "PH" },
          { key: "cDistance", label: "C Dist" },
          { key: "cNear", label: "C Near" },
          { key: "ucNear", label: "UC Near" },
        ]),
      },
      {
        id: "iop",
        title: "Intra Ocular Pressure",
        icon: "IOP",
        items: buildOpthalEyeItems(row?.intraOcularPressure, [
          { key: "nct", label: "NCT" },
          { key: "gat", label: "GAT" },
          { key: "cc", label: "CC" },
          { key: "cct", label: "CCT" },
          { key: "ciop", label: "CIOP" },
        ]),
      },
      {
        id: "slit-lamp",
        title: "Slit Lamp Examination",
        icon: "SL",
        items: buildOpthalStructureItems(row?.slitLampExamination),
      },
      {
        id: "fundus",
        title: "Fundus Examination",
        icon: "F",
        items: buildOpthalStructureItems(row?.fundusExamination),
      },
    ].filter((section) => section.items.length);

    if (!sections.length) return [];
    const date = row?.consultation_date || row?.date || row?.createdAt || row?.created_at || row?.updatedAt || row?.updated_at;
    return [{
      id: `opthal-${row?._id || row?.id || row?.tcm_id || index}`,
      dateLabel: formatOpthalDate(date),
      sections,
    }];
  });
}

function getGrowthRowDate(row) {
  return row?.tcbc_created_date || row?.created_date || row?.date || row?.createdAt || row?.created_at;
}

function getGrowthRowValue(row, key) {
  return row?.[key] ?? row?.[`tcbc_${key}`] ?? row?.[`gc_${key}`] ?? "";
}

function hasGrowthMetricValue(value) {
  return value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value));
}

function normalizeGrowthGender(patientData) {
  const rawGender = patientData?.pm_gender || patientData?.patient_gender || patientData?.gender || "Male";
  const normalized = String(rawGender).toLowerCase() === "other" ? "male" : String(rawGender).toLowerCase();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase() : "Male";
}

function getGrowthAgeInterval(patientAgeInMonths) {
  if (patientAgeInMonths >= 0 && patientAgeInMonths < 24) return "0To2";
  if (patientAgeInMonths >= 24 && patientAgeInMonths <= 60) return "2To5";
  return "5To18";
}

function buildLegacyGrowthData(rows = [], parentalDetails, patientData) {
  const dob = parsePatientDobForGrowth(patientData);
  const todayAgeMonths = dob ? Math.max(0, moment().diff(dob, "months")) : 36;
  const gender = normalizeGrowthGender(patientData);
  const ageInterval = getGrowthAgeInterval(todayAgeMonths);
  const sortedRows = rows
    .filter((row) => (
      getGrowthRowDate(row) ||
      hasGrowthMetricValue(getGrowthRowValue(row, "height")) ||
      hasGrowthMetricValue(getGrowthRowValue(row, "weight")) ||
      hasGrowthMetricValue(getGrowthRowValue(row, "bmi")) ||
      hasGrowthMetricValue(getGrowthRowValue(row, "ofc"))
    ))
    .sort((a, b) => {
      const aDate = moment(getGrowthRowDate(a));
      const bDate = moment(getGrowthRowDate(b));
      if (!aDate.isValid() && !bDate.isValid()) return 0;
      if (!aDate.isValid()) return 1;
      if (!bDate.isValid()) return -1;
      return aDate.valueOf() - bDate.valueOf();
    });
  const entries = sortedRows
    .map((row, index) => {
      const created = moment(getGrowthRowDate(row));
      const fallbackStep = sortedRows.length > 1 ? 36 / (sortedRows.length - 1) : 36;
      const ageMonths = dob && created.isValid()
        ? Math.max(0, created.diff(dob, "months"))
        : Math.min(36, Math.round(index * fallbackStep));
      return {
        ...row,
        height: getGrowthRowValue(row, "height"),
        weight: getGrowthRowValue(row, "weight"),
        bmi: getGrowthRowValue(row, "bmi"),
        ofc: getGrowthRowValue(row, "ofc"),
        ageMonths,
      };
    })
    .filter((row) => row.ageMonths !== null && row.ageMonths !== undefined)
    .sort((a, b) => a.ageMonths - b.ageMonths);
  const modalGrowthRows = sortedRows.map((row) => ({
    ...row,
    height: getGrowthRowValue(row, "height"),
    weight: getGrowthRowValue(row, "weight"),
    bmi: getGrowthRowValue(row, "bmi"),
    ofc: getGrowthRowValue(row, "ofc"),
  }));
  const modalCharts = {
    ageInterval,
    gender,
    patientAgeInMonths: todayAgeMonths,
    showTimelineInYear: todayAgeMonths >= 24,
    growthChartData: dob
      ? getGrowthChartData(modalGrowthRows, dob, todayAgeMonths)
      : {
        Height: [],
        Weight: [],
        BMI: [],
        OFC: [],
        HeightVsWeight: [],
      },
  };
  const hasParentalDetails = isObject(parentalDetails) && Object.values(parentalDetails).some(hasValue);
  if (!entries.length && !hasParentalDetails && !dob) return { entries: [], info: {} };

  const fatherHeight = Number(parentalDetails?.father_height);
  const motherHeight = Number(parentalDetails?.mother_height);
  let midParentalHeight = parentalDetails?.mid_parental_height;
  if (!midParentalHeight && fatherHeight && motherHeight) {
    const { maleChildHeight, femaleChildHeight } = getMidParentalHeight(fatherHeight, motherHeight);
    const gender = patientData?.pm_gender || patientData?.patient_gender;
    midParentalHeight = String(gender).toLowerCase() === "female" ? femaleChildHeight : maleChildHeight;
  }
  const gestationPeriod = parentalDetails?.gestation_period_weeks ||
    (parentalDetails?.gestation_period ? Math.floor(Number(parentalDetails.gestation_period) / 7) : "");

  return {
    entries,
    info: {
      ageMonths: todayAgeMonths,
      midParentalHeight: midParentalHeight ? `${Math.round(Number(midParentalHeight))} cm` : "",
      motherHeight: motherHeight ? `${motherHeight} cm` : "",
      fatherHeight: fatherHeight ? `${fatherHeight} cm` : "",
      gestationPeriod: gestationPeriod ? `${gestationPeriod} weeks` : "",
    },
    modalCharts,
  };
}

function VaccineWeekGroup({ week, items, kind }) {
  return (
    <div className="snv-vaccine-week-group">
      <div className="snv-vaccine-week-chip">
        <Calendar2 size={13} variant="Bulk" color="var(--tp-slate-500)" />
        <span>{week}</span>
      </div>
      <div className="snv-vaccine-item-list">
        {items.map((item, i) => (
          <div key={`${week}-${item.name}-${i}`} className="snv-vaccine-item">
            <span className="snv-vaccine-bullet" aria-hidden="true" />
            <p className="snv-vaccine-item-text">
              <span className="snv-vaccine-name">{item.name}</span>
              <span>{" ("}</span>
              <span className="snv-vaccine-muted">{kind === "given" ? "Given date: " : "Due date: "}</span>
              {kind === "given" ? (
                <span className="snv-vaccine-date-given">{item.givenDate}</span>
              ) : (
                <span className={`snv-vaccine-date-${kind}`}>{formatVaccDate(item.dueDate)}</span>
              )}
              {kind === "given" && item.brand ? (
                <>
                  <span className="snv-vaccine-sep">{" | "}</span>
                  <span className="snv-vaccine-muted">{"Brand: "}</span>
                  <span className="snv-vaccine-name">{item.brand}</span>
                  <span className="snv-vaccine-sep">{" | "}</span>
                  <span className="snv-vaccine-muted">{"Due date: "}</span>
                  <span className="snv-vaccine-name">{item.dueDate}</span>
                </>
              ) : null}
              {item.notes ? (
                <>
                  <span className="snv-vaccine-sep">{" | "}</span>
                  <span className="snv-vaccine-muted">{"Notes: "}</span>
                  <span className="snv-vaccine-name">{item.notes}</span>
                </>
              ) : null}
              <span>{")"}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VaccineBody({ data = { pending: [], given: [] } }) {
  const pending = React.useMemo(() => Array.isArray(data.pending) ? data.pending : [], [data.pending]);
  const given = React.useMemo(() => Array.isArray(data.given) ? data.given : [], [data.given]);
  const { overdueGroups, upcomingGroups, overdueCount, upcomingCount } = React.useMemo(() => {
    const overdue = [];
    const upcoming = [];
    for (const v of pending) {
      const d = parseDueDateStr(v.dueDate);
      if (d && d < TODAY_VACC) overdue.push(v);
      else upcoming.push(v);
    }
    return { overdueGroups: groupVaccByWeek(overdue), upcomingGroups: groupVaccByWeek(upcoming), overdueCount: overdue.length, upcomingCount: upcoming.length };
  }, [pending]);
  const givenGroups = React.useMemo(() => groupVaccByWeek(given), [given]);
  const [exp, setExp] = useState({ overdue: true, upcoming: true, given: true });

  return (
    <>
      {overdueCount > 0 ? (
        <article className="snv-date-card">
          <button type="button" className="snv-date-card-header" onClick={() => setExp((p) => ({ ...p, overdue: !p.overdue }))}>
            <span>{`Overdue Vaccines (${overdueCount})`}</span>
            {exp.overdue ? <ArrowSquareUp size={18} variant="Linear" /> : <ArrowSquareDown size={18} variant="Linear" />}
          </button>
          {exp.overdue ? (
            <div className="snv-date-card-body">
              {overdueGroups.map((g, i) => <VaccineWeekGroup key={`ov-${g.week}-${i}`} week={g.week} items={g.items} kind="overdue" />)}
            </div>
          ) : null}
        </article>
      ) : null}

      {upcomingCount > 0 ? (
        <article className="snv-date-card">
          <button type="button" className="snv-date-card-header" onClick={() => setExp((p) => ({ ...p, upcoming: !p.upcoming }))}>
            <span>{`Upcoming Vaccines (${upcomingCount})`}</span>
            {exp.upcoming ? <ArrowSquareUp size={18} variant="Linear" /> : <ArrowSquareDown size={18} variant="Linear" />}
          </button>
          {exp.upcoming ? (
            <div className="snv-date-card-body">
              {upcomingGroups.map((g, i) => <VaccineWeekGroup key={`up-${g.week}-${i}`} week={g.week} items={g.items} kind="upcoming" />)}
            </div>
          ) : null}
        </article>
      ) : null}

      {given.length > 0 ? (
        <article className="snv-date-card">
          <button type="button" className="snv-date-card-header" onClick={() => setExp((p) => ({ ...p, given: !p.given }))}>
            <span>{`Given Vaccines (${given.length})`}</span>
            {exp.given ? <ArrowSquareUp size={18} variant="Linear" /> : <ArrowSquareDown size={18} variant="Linear" />}
          </button>
          {exp.given ? (
            <div className="snv-date-card-body">
              {givenGroups.map((g, i) => <VaccineWeekGroup key={`gv-${g.week}-${i}`} week={g.week} items={g.items} kind="given" />)}
            </div>
          ) : null}
        </article>
      ) : null}
    </>
  );
}

function VaccineContent({ data = { pending: [], given: [] } }) {
  const pending = Array.isArray(data.pending) ? data.pending : [];
  const given = Array.isArray(data.given) ? data.given : [];

  if (!pending.length && !given.length) {
    return (
      <div className="snv-content-scroll" data-snv-scroll-root="true">
        <div className="snv-empty-state">No data recorded.</div>
      </div>
    );
  }

  return (
    <div className="snv-content-scroll" data-snv-scroll-root="true">
      <VaccineBody data={data} />
    </div>
  );
}

function OptalContent({ entries = [], emptyState }) {
  const firstEntryId = entries[0]?.id;
  const [expandedById, setExpandedById] = useState(() => defaultExpandedMap(firstEntryId));
  useEffect(() => { setExpandedById(defaultExpandedMap(firstEntryId)); }, [firstEntryId]);

  return (
    <div className="snv-content-scroll" data-snv-scroll-root="true">
      {entries.length === 0 ? (
        emptyState || <div className="snv-empty-state">No data recorded.</div>
      ) : entries.map((entry) => {
        const expanded = Boolean(expandedById[entry.id]);
        return (
          <DateCard
            key={entry.id}
            title={entry.dateLabel}
            expanded={expanded}
            fresh={entry.fresh}
            onToggle={() => setExpandedById((prev) => ({ ...prev, [entry.id]: !expanded }))}
          >
            {entry.sections.map((section) => (
              <div key={section.id} className="snv-optal-subsection">
                <div className="snv-optal-subsection-title">
                  <span className="snv-optal-icon">{section.icon}</span>
                  <span>{section.title}</span>
                </div>
                <BulletList items={section.items} />
              </div>
            ))}
          </DateCard>
        );
      })}
    </div>
  );
}

// ── WHO growth reference data (0–36 months, 6-month intervals) ───────────────
const GROWTH_AGE_MONTHS = [0, 6, 12, 18, 24, 30, 36];

const WHO_HEIGHT = {
  P03: [44.2, 61.2, 69.0, 74.7, 79.4, 83.5, 87.1],
  P10: [46.1, 63.3, 71.0, 76.9, 81.7, 86.0, 89.9],
  P50: [49.9, 67.6, 75.7, 82.3, 87.8, 92.7, 96.1],
  P90: [53.5, 72.1, 80.6, 87.7, 93.6, 98.8, 103.2],
  P97: [55.6, 74.0, 82.7, 90.1, 96.4, 101.9, 106.5],
};
const WHO_WEIGHT = {
  P03: [2.5, 6.0, 7.8, 8.9, 9.7, 10.5, 11.1],
  P10: [2.8, 6.6, 8.4, 9.7, 10.6, 11.4, 12.1],
  P50: [3.3, 7.9, 9.9, 11.5, 12.5, 13.4, 14.3],
  P90: [4.0, 9.3, 11.6, 13.5, 14.8, 15.8, 16.8],
  P97: [4.3, 9.9, 12.4, 14.5, 15.9, 17.0, 18.0],
};
const WHO_BMI = {
  P03: [10.2, 13.1, 13.6, 13.6, 13.5, 13.4, 13.3],
  P10: [11.0, 13.9, 14.3, 14.3, 14.2, 14.1, 14.0],
  P50: [13.1, 16.7, 16.7, 16.4, 16.0, 15.7, 15.5],
  P90: [15.6, 19.6, 19.9, 19.7, 19.3, 18.9, 18.5],
  P97: [17.0, 20.9, 21.5, 21.5, 21.2, 20.8, 20.4],
};
const WHO_OFC = {
  P03: [31.5, 41.0, 45.0, 46.5, 47.5, 48.2, 48.8],
  P10: [32.5, 42.0, 46.0, 47.4, 48.4, 49.1, 49.7],
  P50: [34.5, 44.0, 47.8, 49.2, 50.2, 50.9, 51.5],
  P90: [36.0, 45.5, 49.3, 50.7, 51.7, 52.4, 53.0],
  P97: [37.0, 46.5, 50.2, 51.6, 52.6, 53.3, 53.9],
};
const PCT_COLORS = {
  P97: "#f59e0b", P90: "#8b5cf6", P50: "#10b981", P10: "#6366f1", P03: "#ef4444",
};
const PCT_ORDER = ["P97", "P90", "P50", "P10", "P03"];

function makeWhoDatasets(whoData, visiblePercentiles = PCT_ORDER) {
  return PCT_ORDER.filter((key) => visiblePercentiles.includes(key)).map((key) => ({
    label: key.replace("P", "P "),
    data: GROWTH_AGE_MONTHS.map((m, i) => ({ x: m, y: whoData[key][i] })),
    borderColor: PCT_COLORS[key],
    backgroundColor: "transparent",
    borderWidth: 1.5,
    pointRadius: 0,
    tension: 0.4,
    fill: false,
  }));
}

function makeMeasurementDataset(entries, valueKey, label) {
  const data = entries
    .filter((entry) => entry.ageMonths !== null && hasGrowthMetricValue(entry[valueKey]))
    .map((entry) => ({
      x: entry.ageMonths,
      y: Number(entry[valueKey]),
    }));
  return data.length ? [{
    label,
    data,
    borderColor: "#312e81",
    backgroundColor: "#312e81",
    pointRadius: 3,
    pointHoverRadius: 4,
    showLine: true,
    borderWidth: 1.5,
    tension: 0.25,
  }] : [];
}

function makeHeightWeightDataset(entries) {
  const data = entries
    .filter((entry) => hasGrowthMetricValue(entry.height) && hasGrowthMetricValue(entry.weight))
    .map((entry) => ({
      x: Number(entry.height),
      y: Number(entry.weight),
    }));
  return data.length ? [{
    label: "Patient",
    data,
    borderColor: "#312e81",
    backgroundColor: "#312e81",
    pointRadius: 3,
    pointHoverRadius: 4,
    showLine: true,
    borderWidth: 1.5,
    tension: 0.25,
  }] : [];
}

function makeHeightWeightPercentileDatasets(visiblePercentiles = PCT_ORDER) {
  return PCT_ORDER.filter((key) => visiblePercentiles.includes(key)).map((key) => ({
    label: key.replace("P", "P "),
    data: GROWTH_AGE_MONTHS.map((_, index) => ({
      x: WHO_HEIGHT[key][index],
      y: WHO_WEIGHT[key][index],
    })),
    borderColor: PCT_COLORS[key],
    backgroundColor: "transparent",
    borderWidth: 1.5,
    pointRadius: 0,
    tension: 0.4,
    fill: false,
  }));
}

function formatGrowthAgeLabel(ageMonths, timelineUnit) {
  if (timelineUnit === "months") return `${ageMonths}m`;
  const yrs = Math.floor(ageMonths / 12);
  const mths = ageMonths % 12;
  return mths ? `${yrs}y ${mths}m` : `${yrs}y`;
}

function makeGrowthPlugin(ageMonths, ageLabel) {
  return {
    id: "growthOverlay",
    afterDraw(chart) {
      const { ctx, scales, chartArea } = chart;
      if (!scales.x || !scales.y) return;
      const todayPx = scales.x.getPixelForValue(ageMonths);
      ctx.save();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(todayPx, chartArea.top);
      ctx.lineTo(todayPx, chartArea.bottom);
      ctx.stroke();
      ctx.fillStyle = "#10b981";
      ctx.font = "500 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Today", todayPx, chartArea.top - 12);
      ctx.fillStyle = "#6b7280";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText(ageLabel, todayPx, chartArea.top - 2);
      chart.data.datasets.forEach((ds, i) => {
        const meta = chart.getDatasetMeta(i);
        if (!meta.data.length) return;
        const last = meta.data[meta.data.length - 1];
        ctx.save();
        ctx.fillStyle = ds.borderColor;
        ctx.font = "500 9px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(ds.label, chartArea.right + 2, last.y + 3);
        ctx.restore();
      });
      ctx.restore();
    },
  };
}

const BASE_GROWTH_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  layout: { padding: { right: 32, top: 26 } },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: {
    x: {
      type: "linear", min: 0, max: 36,
      ticks: { stepSize: 6, callback: (v) => v === 0 ? "0y" : `${v / 12}y`, color: "#9ca3af", font: { size: 9 } },
      grid: { color: "rgba(0,0,0,0.06)" },
      title: { display: true, text: "Age in Years", color: "#9ca3af", font: { size: 9 } },
    },
    y: {
      ticks: { color: "#9ca3af", font: { size: 9 } },
      grid: { color: "rgba(0,0,0,0.06)" },
    },
  },
};

function PercentileMenu({ visiblePercentiles, onToggle, onClose }) {
  return (
    <div className="snv-gwc-percentile-menu">
      <div className="snv-gwc-percentile-title">Enable/Disable percentile line</div>
      <div className="snv-gwc-percentile-options">
        {PCT_ORDER.map((key) => (
          <label key={key} className="snv-gwc-percentile-option">
            <input
              type="checkbox"
              checked={visiblePercentiles.includes(key)}
              onChange={() => onToggle(key)}
            />
            <span style={{ color: PCT_COLORS[key] }}>{key.replace("P", "P ")}</span>
          </label>
        ))}
      </div>
      <button type="button" className="snv-gwc-percentile-done" onClick={onClose}>
        Done
      </button>
    </div>
  );
}

function GrowthChartCard({ title, whoData, yLabel, ageMonths, entries = [], valueKey }) {
  const [timelineUnit, setTimelineUnit] = useState("years");
  const [isPercentileOpen, setIsPercentileOpen] = useState(false);
  const [visiblePercentiles, setVisiblePercentiles] = useState(PCT_ORDER);
  const ageLabel = React.useMemo(() => formatGrowthAgeLabel(ageMonths, timelineUnit), [ageMonths, timelineUnit]);
  const plugin = React.useMemo(() => makeGrowthPlugin(ageMonths, ageLabel), [ageMonths, ageLabel]);
  const patientDataset = React.useMemo(() => makeMeasurementDataset(entries, valueKey, "Patient"), [entries, valueKey]);
  const chartData = React.useMemo(() => ({
    datasets: [
      ...makeWhoDatasets(whoData, visiblePercentiles),
      ...patientDataset,
    ],
  }), [patientDataset, visiblePercentiles, whoData]);
  const maxAgeMonths = Math.max(
    36,
    ageMonths,
    ...entries
      .map((entry) => Number(entry.ageMonths))
      .filter(Number.isFinite)
  );
  const opts = React.useMemo(() => ({
    ...BASE_GROWTH_OPTS,
    scales: {
      ...BASE_GROWTH_OPTS.scales,
      x: {
        ...BASE_GROWTH_OPTS.scales.x,
        max: Math.ceil(maxAgeMonths / 6) * 6,
        ticks: {
          ...BASE_GROWTH_OPTS.scales.x.ticks,
          callback: (value) => timelineUnit === "months"
            ? `${value}`
            : value === 0
              ? "0y"
              : `${Number(value) / 12}y`,
        },
        title: {
          ...BASE_GROWTH_OPTS.scales.x.title,
          text: `Age in ${timelineUnit === "months" ? "Months" : "Years"}`,
        },
      },
      y: { ...BASE_GROWTH_OPTS.scales.y, title: { display: true, text: yLabel, color: "#9ca3af", font: { size: 9 } } },
    },
  }), [maxAgeMonths, timelineUnit, yLabel]);
  const handlePercentileToggle = useCallback((key) => {
    setVisiblePercentiles((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  }, []);
  if (!patientDataset.length) return null;

  return (
    <div className="snv-gwc-card">
      <div className="snv-gwc-header">
        <span className="snv-gwc-title">{title}</span>
      </div>
      <div className="snv-gwc-controls">
        <button
          type="button"
          className="snv-gwc-pct-btn"
          onClick={() => setIsPercentileOpen((current) => !current)}
        >
          All Percentiles
          <ArrowDown2 size={11} variant="Linear" color="#454551" />
        </button>
        {isPercentileOpen ? (
          <PercentileMenu
            visiblePercentiles={visiblePercentiles}
            onToggle={handlePercentileToggle}
            onClose={() => setIsPercentileOpen(false)}
          />
        ) : null}
        <div className="snv-gwc-unit-toggle">
          <button
            type="button"
            className={`snv-gwc-unit-btn ${timelineUnit === "years" ? "snv-gwc-unit-active" : ""}`}
            onClick={() => setTimelineUnit("years")}
          >
            Yrs
          </button>
          <button
            type="button"
            className={`snv-gwc-unit-btn ${timelineUnit === "months" ? "snv-gwc-unit-active" : ""}`}
            onClick={() => setTimelineUnit("months")}
          >
            Mth
          </button>
        </div>
      </div>
      <div className="snv-gwc-chart">
        <Line data={chartData} options={opts} plugins={[plugin]} />
      </div>
    </div>
  );
}

function GrowthHeightWeightCard({ entries = [] }) {
  const [isPercentileOpen, setIsPercentileOpen] = useState(false);
  const [visiblePercentiles, setVisiblePercentiles] = useState(PCT_ORDER);
  const chartData = React.useMemo(() => ({
    datasets: [
      ...makeHeightWeightPercentileDatasets(visiblePercentiles),
      ...makeHeightWeightDataset(entries),
    ],
  }), [entries, visiblePercentiles]);
  const patientDataset = React.useMemo(() => makeHeightWeightDataset(entries), [entries]);
  const handlePercentileToggle = useCallback((key) => {
    setVisiblePercentiles((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  }, []);
  if (!patientDataset.length) return null;

  const values = patientDataset[0].data;
  const maxHeight = Math.max(...values.map((item) => item.x), 120);
  const maxWeight = Math.max(...values.map((item) => item.y), 20);
  const opts = {
    ...BASE_GROWTH_OPTS,
    layout: { padding: { right: 12, top: 10 } },
    scales: {
      x: {
        type: "linear",
        min: 0,
        max: Math.ceil(maxHeight / 20) * 20,
        ticks: { color: "#9ca3af", font: { size: 9 } },
        grid: { color: "rgba(0,0,0,0.06)" },
        title: { display: true, text: "Height (cm)", color: "#9ca3af", font: { size: 9 } },
      },
      y: {
        min: 0,
        max: Math.ceil(maxWeight / 5) * 5,
        ticks: { color: "#9ca3af", font: { size: 9 } },
        grid: { color: "rgba(0,0,0,0.06)" },
        title: { display: true, text: "Weight (kg)", color: "#9ca3af", font: { size: 9 } },
      },
    },
  };

  return (
    <div className="snv-gwc-card">
      <div className="snv-gwc-header">
        <span className="snv-gwc-title">Height vs Weight</span>
      </div>
      <div className="snv-gwc-controls">
        <button
          type="button"
          className="snv-gwc-pct-btn"
          onClick={() => setIsPercentileOpen((current) => !current)}
        >
          All Percentiles
          <ArrowDown2 size={11} variant="Linear" color="#454551" />
        </button>
        {isPercentileOpen ? (
          <PercentileMenu
            visiblePercentiles={visiblePercentiles}
            onToggle={handlePercentileToggle}
            onClose={() => setIsPercentileOpen(false)}
          />
        ) : null}
      </div>
      <div className="snv-gwc-chart">
        <Line data={chartData} options={opts} />
      </div>
    </div>
  );
}

const SIDE_NAV_GROWTH_GRAPH_TITLES = {
  Height: "Height for Age",
  Weight: "Weight for Age",
  BMI: "BMI for Age",
  OFC: "Head Circumference (OFC)",
  HeightVsWeight: "Height vs Weight",
};

const SIDE_NAV_GROWTH_AXIS_LABELS = {
  Height: "Height (cm)",
  Weight: "Weight (kg)",
  BMI: "BMI (kg/m2)",
  OFC: "OFC (cm)",
  HeightVsWeight: "Weight (kg)",
};

function formatSideNavGrowthTick(value, unit) {
  if (unit === "months") return `${value}`;
  if (Number(value) === 0) return "0y";
  return `${Number(value)}y`;
}

function buildSideNavGrowthPlugin({ graphName, patientAgeInMonths, unit, visibleKeys }) {
  return {
    id: `sideNavGrowthOverlay-${graphName}-${unit}-${visibleKeys.join("-")}`,
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!scales.x || !scales.y || !chartArea) return;
      if (graphName !== "HeightVsWeight") {
        const todayValue = unit === "years" ? patientAgeInMonths / 12 : patientAgeInMonths;
        const todayPx = scales.x.getPixelForValue(todayValue);
        if (Number.isFinite(todayPx)) {
          ctx.save();
          ctx.strokeStyle = "#34d399";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(todayPx, chartArea.top);
          ctx.lineTo(todayPx, chartArea.bottom);
          ctx.stroke();
          ctx.fillStyle = "#34d399";
          ctx.font = "600 11px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Today", todayPx, chartArea.top - 26);
          ctx.font = "500 10px Inter, sans-serif";
          ctx.fillText(formatGrowthAgeLabel(patientAgeInMonths, "years"), todayPx, chartArea.top - 10);
          ctx.restore();
        }
      }

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        if (!chart.isDatasetVisible(datasetIndex) || dataset.label === "Patient") return;
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta.data.length) return;
        const last = meta.data[meta.data.length - 1];
        if (!last) return;
        ctx.save();
        ctx.fillStyle = dataset.borderColor;
        ctx.font = "600 9px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(dataset.label, chartArea.right + 5, last.y);
        ctx.restore();
      });
    },
  };
}

function getSideNavGrowthPercentileLabel(selectedCount, totalCount) {
  if (selectedCount === totalCount) return "All Percentiles";
  if (selectedCount === 0) return "Percentile";
  return `${selectedCount} selected`;
}

function GrowthSideNavPercentileDropdown({ visibleKeys, onToggle, onSelectAll, onClear }) {
  const allSelected = visibleKeys.length === dummyData.datasets.length;
  return (
    <div className="snv-growth-percentile-dropdown">
      <button
        type="button"
        className="snv-growth-clear-btn"
        onClick={allSelected ? onClear : onSelectAll}
      >
        {allSelected ? "Clear all" : "Select all"}
      </button>
      <div className="snv-growth-percentile-list">
        {dummyData.datasets.map((item) => (
          <label key={item.key} className="snv-growth-percentile-row">
            <input
              type="checkbox"
              checked={visibleKeys.includes(item.key)}
              onChange={() => onToggle(item.key)}
            />
            <span className="snv-growth-percentile-check" aria-hidden="true" />
            <span className="snv-growth-percentile-label">{item.label}</span>
            <span
              className="snv-growth-percentile-swatch"
              style={{ backgroundColor: item.backgroundColor }}
              aria-hidden="true"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function GrowthSideNavChartCard({
  graphName,
  percentileData,
  ageInterval,
  patientAgeInMonths,
}) {
  const { ageData } = growthChartStaticData;
  const [unit, setUnit] = useState("years");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState(() => dummyData.datasets.map((item) => item.key));
  const percentileWrapRef = useRef(null);
  const isAgeChart = graphName !== "HeightVsWeight";
  const percentileLabel = getSideNavGrowthPercentileLabel(visibleKeys.length, dummyData.datasets.length);

  useEffect(() => {
    if (!dropdownOpen) return undefined;
    const handlePointerDown = (event) => {
      if (percentileWrapRef.current?.contains(event.target)) return;
      setDropdownOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const rawAgeLabels = isAgeChart
    ? ageData?.[graphName === "Weight" && ageInterval === "5To18" ? "5To10" : ageInterval] || []
    : ageData?.HeightVsWeight?.[ageInterval] || [];
  const xValues = isAgeChart
    ? rawAgeLabels
      .map((value) => unit === "years" ? value / 12 : value)
      .filter((value, index) => unit === "months" || index % 6 === 0 || index === rawAgeLabels.length - 1)
    : rawAgeLabels;
  const datasetIndexes = isAgeChart
    ? rawAgeLabels
      .map((_, index) => index)
      .filter((index) => unit === "months" || index % 6 === 0 || index === rawAgeLabels.length - 1)
    : rawAgeLabels.map((_, index) => index);
  const chartDatasets = dummyData.datasets
    .filter((item) => visibleKeys.includes(item.key))
    .map((item) => ({
      label: item.label,
      borderColor: item.backgroundColor,
      backgroundColor: "rgba(0, 0, 0, 0)",
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0,
      borderWidth: 2,
      tension: 0.35,
      data: datasetIndexes.map((sourceIndex, index) => ({
        x: xValues[index],
        y: percentileData?.[item.key]?.[sourceIndex],
      })).filter((point) => Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y))),
    }));
  const maxX = xValues.length ? Math.max(...xValues.map(Number)) : 1;
  const minX = xValues.length ? Math.min(...xValues.map(Number)) : 0;
  const plugin = React.useMemo(
    () => buildSideNavGrowthPlugin({ graphName, patientAgeInMonths, unit, visibleKeys }),
    [graphName, patientAgeInMonths, unit, visibleKeys]
  );
  const chartOptions = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { top: isAgeChart ? 48 : 22, right: 34, left: 4, bottom: 4 } },
    elements: { line: { borderWidth: 2 } },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        type: "linear",
        min: minX,
        max: maxX,
        ticks: {
          color: "#717179",
          font: { size: 10, weight: "400" },
          callback: (value) => isAgeChart ? formatSideNavGrowthTick(value, unit) : value,
          maxTicksLimit: isAgeChart ? 7 : 6,
        },
        grid: { color: "#e8ebf1", lineWidth: 1 },
        title: {
          display: true,
          text: isAgeChart ? `Age in ${unit === "years" ? "Years" : "Months"}` : "Height in cm",
          color: "#717179",
          font: { size: 11, weight: "500" },
        },
      },
      y: {
        ticks: { color: "#717179", font: { size: 10, weight: "400" }, maxTicksLimit: 5 },
        grid: { color: "#e8ebf1", lineWidth: 1 },
        title: {
          display: true,
          text: SIDE_NAV_GROWTH_AXIS_LABELS[graphName] || graphName,
          color: "#717179",
          font: { size: 11, weight: "500" },
        },
      },
    },
  }), [graphName, isAgeChart, maxX, minX, unit]);

  return (
    <div className="snv-growth-chart-card">
      <div className="snv-growth-chart-header">
        <span>{SIDE_NAV_GROWTH_GRAPH_TITLES[graphName] || graphName}</span>
      </div>
      <div className="snv-growth-chart-body">
        <div className="snv-growth-chart-controls">
          <div className="snv-growth-percentile-wrap" ref={percentileWrapRef}>
            <button
              type="button"
              className={`snv-growth-percentile-trigger ${dropdownOpen ? "snv-growth-percentile-trigger-open" : ""}`}
              onClick={() => setDropdownOpen((current) => !current)}
            >
              <span>{percentileLabel}</span>
              <ArrowDown2 size={13} variant="Linear" color="#545460" className={dropdownOpen ? "snv-growth-chevron-open" : ""} />
            </button>
            {dropdownOpen ? (
              <GrowthSideNavPercentileDropdown
                visibleKeys={visibleKeys}
                onToggle={(key) => {
                  setVisibleKeys((current) => (
                    current.includes(key)
                      ? current.filter((item) => item !== key)
                      : [...current, key]
                  ));
                }}
                onSelectAll={() => setVisibleKeys(dummyData.datasets.map((item) => item.key))}
                onClear={() => setVisibleKeys([])}
              />
            ) : null}
          </div>
          {isAgeChart ? (
            <div className="snv-growth-unit-toggle">
              <button
                type="button"
                className={unit === "years" ? "snv-growth-unit-active" : ""}
                onClick={() => setUnit("years")}
              >
                Yrs
              </button>
              <button
                type="button"
                className={unit === "months" ? "snv-growth-unit-active" : ""}
                onClick={() => setUnit("months")}
              >
                Mth
              </button>
            </div>
          ) : null}
        </div>
        <div className="snv-growth-chart-canvas">
          <Line data={{ datasets: chartDatasets }} options={chartOptions} plugins={[plugin]} />
        </div>
      </div>
    </div>
  );
}

function GrowthModalCharts({ charts }) {
  const { growthData } = growthChartStaticData;
  const {
    growthChartData = {},
    gender = "Male",
    ageInterval = "0To2",
    patientAgeInMonths = 0,
  } = charts || {};
  const graphNodes = Object.keys(growthChartData).map((graphName) => {
    let percentileData = growthData?.[gender]?.[ageInterval]?.[graphName];
    if (graphName === "Weight" && patientAgeInMonths > 120) {
      percentileData = {};
    }
    if (!percentileData || !Object.keys(percentileData).length) return null;
    return (
      <GrowthSideNavChartCard
        key={graphName}
        graphName={graphName}
        percentileData={percentileData}
        ageInterval={ageInterval}
        patientAgeInMonths={patientAgeInMonths}
      />
    );
  }).filter(Boolean);

  if (!graphNodes.length) return null;

  return <div className="snv-growth-modal-chart-list">{graphNodes}</div>;
}

function GrowthContent({ data, emptyState }) {
  const { entries = [], info = {}, modalCharts } = data;
  const infoRows = [
    ["Mid-parental height", info.midParentalHeight],
    ["Mother", info.motherHeight],
    ["Father", info.fatherHeight],
    ["Gestation period", info.gestationPeriod],
  ].filter(([, value]) => hasValue(value));
  const hasMetricData = entries.some((entry) => (
    hasGrowthMetricValue(entry.height) ||
    hasGrowthMetricValue(entry.weight) ||
    hasGrowthMetricValue(entry.bmi) ||
    hasGrowthMetricValue(entry.ofc)
  ));
  const hasModalCharts = Boolean(modalCharts?.growthChartData && Object.keys(modalCharts.growthChartData).length);
  if (!hasMetricData && !infoRows.length && !hasModalCharts) {
    return (
      <div className="snv-content-scroll" data-snv-scroll-root="true">
        {emptyState || <div className="snv-empty-state">No data recorded.</div>}
      </div>
    );
  }
  return (
    <div className="snv-content-scroll" data-snv-scroll-root="true">
      {infoRows.length > 0 ? (
        <div className="snv-date-card snv-growth-info-card">
          <div className="snv-date-card-header" style={{ cursor: "default" }}>
            <span>Growth Info</span>
          </div>
          <div className="snv-date-card-body snv-growth-info-rows">
            {infoRows.map(([label, value]) => (
            <div key={label} className="snv-growth-info-row">
              <span className="snv-kv-label">{label}</span>
              <span className="snv-kv-value">{value}</span>
            </div>
            ))}
          </div>
        </div>
      ) : null}
      <GrowthModalCharts charts={modalCharts} />
    </div>
  );
}

function PrivateNotesContent({ value, onChange, showVoiceRx, onVoiceClick, voiceDisabled }) {
  return (
    <div className="snv-content-scroll snv-private-notes-content" data-snv-scroll-root="true">
      <div className="snv-private-note-wrap">
        <textarea
          className="snv-private-note-input"
          placeholder="Write private notes..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {showVoiceRx ? (
          <button
            type="button"
            className="snv-private-note-voice"
            onClick={voiceDisabled ? undefined : onVoiceClick}
            disabled={voiceDisabled}
            aria-label="Use Voice AI for private notes"
            title="Use Voice AI for private notes"
          >
            <VoiceRxIcon size={22} color="#8B3FD1" />
          </button>
        ) : null}
      </div>
      <div className="snv-private-note-hint">
        <span className="snv-private-note-hint-icon">!</span>
        <span>This note will only be visible to you and will not be printed.</span>
      </div>
    </div>
  );
}

function SectionContent({ activeId, viewData, pastVisitsState, privateNotesValue, onPrivateNotesChange, onPrivateNotesVoiceClick, privateNotesVoiceDisabled, onCopyPayload, showVoiceRx, vitalsUpdating, zydusSelectedLabParams, patientId, doctorId, patientGender, onActionClick, onVoiceClick, emptyVoiceDisabled, medicalRecordActions }) {
  const emptyState = EMPTY_SECTION_CONFIG[activeId] ? (
    <SideNavEmptyState
      sectionId={activeId}
      onActionClick={onActionClick}
      onVoiceClick={onVoiceClick}
      showVoiceAction={showVoiceRx}
      voiceDisabled={emptyVoiceDisabled}
    />
  ) : null;

  switch (activeId) {
    case "pastVisits":
      return (
        <PastVisitsContent
          visits={viewData.pastVisits}
          hasMore={pastVisitsState.hasMore}
          loading={pastVisitsState.loading}
          onLoadMore={pastVisitsState.onLoadMore}
          onExpand={pastVisitsState.onExpand}
          onCopyPayload={onCopyPayload}
        />
      );
    case "vitals":
      return <DateRowsContent entries={viewData.vitals} updating={vitalsUpdating} emptyState={emptyState} />;
    case "history":
      return <HistoryContent sections={viewData.history} emptyState={emptyState} />;
    case "labResults":
      return <VirtualDateRowsContent entries={viewData.labResults} emptyState={emptyState} />;
    case "medicalRecords":
      return (
        <RecordsContent
          records={viewData.medicalRecords}
          rawDocs={viewData.medicalRecordsRawDocs}
          uploadDocCategories={viewData.medicalRecordsCategories}
          handleDrawerUploadDoc={medicalRecordActions?.handleDrawerUploadDoc}
          setFilesData={medicalRecordActions?.setFilesData}
          setIsEditDocument={medicalRecordActions?.setIsEditDocument}
          setUploadDocDrawer={medicalRecordActions?.setUploadDocDrawer}
        />
      );
    case "gynec":
      return <SectionCardsContent sections={viewData.gynec} emptyState={emptyState} />;
    case "obstetric":
      return <ObstetricContent sections={viewData.obstetric} emptyState={emptyState} />;
    case "vaccine":
      // return <VaccineContent data={viewData.vaccine} />; // TODO: INTEL - TO BE HANDLED ON PROD FIRST (showing due date to all vaccines by default)
      return null;
    case "growth":
      return <GrowthContent data={viewData.growth} emptyState={emptyState} />;
    case "optal":
      return <OptalContent entries={viewData.optal} emptyState={emptyState} />;
    case "personalNotes":
      return (
        <PrivateNotesContent
          value={privateNotesValue}
          onChange={onPrivateNotesChange}
          showVoiceRx={showVoiceRx}
          onVoiceClick={onPrivateNotesVoiceClick}
          voiceDisabled={privateNotesVoiceDisabled}
        />
      );
    case "zydusLabReports":
      return (
        <ZydusLabParametersList
          labParamsData={zydusSelectedLabParams || []}
          patient_unique_id={patientId}
          doc_id={doctorId}
          patientGender={patientGender}
        />
      );
    default:
      return <div className="snv-empty-state">No data recorded.</div>;
  }
}

function isSectionEmptyForInlineActions(activeId, viewData, vitalsUpdating) {
  if (activeId === "vitals") return !vitalsUpdating && (viewData.vitals || []).length === 0;
  if (activeId === "history") return (viewData.history || []).length === 0;
  if (activeId === "labResults") return (viewData.labResults || []).length === 0;
  if (activeId === "gynec") return (viewData.gynec || []).length === 0;
  if (activeId === "obstetric") return getVisibleObstetricSections(viewData.obstetric || []).length === 0;
  if (activeId === "growth") {
    const data = viewData.growth || {};
    const entries = data.entries || [];
    const info = data.info || {};
    const infoRows = [
      info.midParentalHeight,
      info.motherHeight,
      info.fatherHeight,
      info.gestationPeriod,
    ].filter(hasValue);
    const hasModalCharts = Boolean(data.modalCharts?.growthChartData && Object.keys(data.modalCharts.growthChartData).length);
    const hasMetricData = entries.some((entry) => (
      hasGrowthMetricValue(entry.height) ||
      hasGrowthMetricValue(entry.weight) ||
      hasGrowthMetricValue(entry.bmi) ||
      hasGrowthMetricValue(entry.ofc)
    ));
    return !hasMetricData && !infoRows.length && !hasModalCharts;
  }
  if (activeId === "optal") return (viewData.optal || []).length === 0;
  return false;
}

function sectionActionLabel(activeId, actionLabels = {}) {
  if (actionLabels[activeId]) return actionLabels[activeId];
  if (activeId === "medicalRecords") return "Add New Records";
  return "Add/Edit Details";
}

function sectionVoiceLabel(activeId) {
  const title = SECTION_TITLES[activeId] || "Details";
  return title.replace(/\s+History$/i, "").replace(/^Medical\s+/, "").trim() || "Details";
}

function SectionActionRow({ activeId, voiceState, onVoiceClick, onActionClick, actionLabels, hidePlusIcon, voiceEnabled, voiceLocked }) {
  if (activeId === "pastVisits" || activeId === "personalNotes" || activeId === "optal") return null;
  const status = voiceState?.status || "idle";
  const busy = status === "recording" || status === "transcribing" || status === "digitizing";
  const disabled = busy || voiceLocked;
  const label = sectionActionLabel(activeId, actionLabels);

  return (
    <div className="snv-action-row">
      <AgentActionButton
        className="snv-add-details-btn vrx-cn-secondary-blue"
        onClick={() => onActionClick(activeId)}
        prefixIcon={!hidePlusIcon ? <span className="snv-add-plus" aria-hidden="true" /> : null}
        text={label}
        variant="secondary"
      />
      {voiceEnabled ? (
        <button
          type="button"
          className="snv-voice-cta-btn vrx-rt-voice-cta-outline"
          onClick={disabled ? undefined : onVoiceClick}
          disabled={disabled}
          aria-label={`Use Voice AI to fill ${label.toLowerCase()}`}
          title={`Use Voice AI to fill ${label.toLowerCase()}`}
        >
          <VoiceRxIcon size={20} color="#673AAC" />
        </button>
      ) : null}
    </div>
  );
}


function SectionPanel({ activeId, onClose, onNavigate, transitionDir, voiceState, onVoiceClick, onVoiceRecorderSubmit, onVoiceCancel, onVoiceOverlayClose, viewData, pastVisitsState, onActionClick, actionLabels, actionHidePlusIcons, privateNotesValue, onPrivateNotesChange, onCopyPayload, voiceEnabled, voiceLocked, showVoiceRx, vitalsUpdating, zydusSelectedLabParams, patientId, doctorId, patientGender, voiceSessionId, medicalRecordActions }) {
  const title = SECTION_TITLES[activeId] || "Section";
  const containerRef = useRef(null);
  const voiceStatus = voiceState?.status;
  const overlayActive = voiceState && !["idle", "done"].includes(voiceStatus);
  const voiceRecorderVisible = overlayActive;
  const isAwaitingResponse = voiceStatus === "transcribing" || voiceStatus === "digitizing";
  const processingLabel = voiceStatus === "transcribing"
    ? (activeId === SIDE_NAV_PRIVATE_NOTES_SECTION ? "Transcribing private notes..." : "Refining your captured consultation...")
    : voiceStatus === "digitizing" ? "Filling section…" : undefined;
  const privateNotesVoiceDisabled = voiceLocked || ["recording", "transcribing", "digitizing"].includes(voiceStatus);
  const emptyInlineActions = isSectionEmptyForInlineActions(activeId, viewData, vitalsUpdating);

  useEdgeSwipeNavigation({
    containerRef,
    onNavigate,
    enabled: Boolean(onNavigate),
    resetKey: activeId,
  });

  return (
    <section ref={containerRef} className={`snv-content-panel ${overlayActive ? "snv-content-panel-overlay-active" : ""}`}>
      <div className="snv-section-header">
        <span className="snv-section-title">{title}</span>
        <span className="snv-section-actions">
          <button
            type="button"
            className="snv-collapse-btn"
            onClick={onClose}
            aria-label="Collapse section panel"
          >
            <SidebarLeft size={16} variant="Linear" />
          </button>
        </span>
      </div>
      {!emptyInlineActions ? (
        <SectionActionRow
          activeId={activeId}
          voiceState={voiceState}
          onVoiceClick={onVoiceClick}
          onActionClick={onActionClick}
          actionLabels={actionLabels}
          hidePlusIcon={actionHidePlusIcons?.[activeId]}
          voiceEnabled={voiceEnabled}
          voiceLocked={voiceLocked}
        />
      ) : null}
      <div key={activeId} className={`snv-section-anim ${transitionDir ? `snv-section-${transitionDir}` : ""}`}>
        <SectionContent
          activeId={activeId}
          viewData={viewData}
          pastVisitsState={pastVisitsState}
          privateNotesValue={privateNotesValue}
          onPrivateNotesChange={onPrivateNotesChange}
          onPrivateNotesVoiceClick={onVoiceClick}
          privateNotesVoiceDisabled={privateNotesVoiceDisabled}
          onCopyPayload={onCopyPayload}
          showVoiceRx={showVoiceRx}
          vitalsUpdating={vitalsUpdating}
          zydusSelectedLabParams={zydusSelectedLabParams}
          patientId={patientId}
          doctorId={doctorId}
          patientGender={patientGender}
          onActionClick={onActionClick}
          onVoiceClick={onVoiceClick}
          emptyVoiceDisabled={voiceLocked || ["recording", "transcribing", "digitizing"].includes(voiceStatus)}
          medicalRecordActions={medicalRecordActions}
        />
      </div>
      {showVoiceRx && voiceRecorderVisible && (
        <div className="snv-vrx-overlay" data-dr-agent="true" data-voice-allow="true">
          <VoiceRecorderCore
            layout="overlay"
            variant="stack"
            fillHeight
            sectionLabel={sectionVoiceLabel(activeId)}
            showSectionInStatus
            isAwaitingResponse={isAwaitingResponse}
            processingLabel={processingLabel}
            error={voiceStatus === "error" ? (voiceState?.error || "Voice processing failed.") : null}
            audioChunkContext={{
              sessionId: voiceSessionId,
              doctorId,
              patientId,
            }}
            onClose={onVoiceOverlayClose}
            onCancel={onVoiceCancel}
            onSubmit={onVoiceRecorderSubmit}
          />
        </div>
      )}
    </section>
  );
}

function createSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `snv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}


export function SideNavbar({
  onSectionSelect,
  onSectionAction,
  patientId,
  doctorId,
  labParamsData: labParamsDataProp,
  gynecHistory: gynecHistoryProp,
  vaccineRefreshKey = 0,
  growthRefreshKey = 0,
  opthalRefreshKey = 0,
  customizedPadLeftList = [],
  isOpthalModuleAccessible = false,
  isVaccinationAccessable = false,
  isGrowthChartAccessable = false,
  isGynaecHistoryAccessable = false,
  isZydusUserAccessable = false,
  zydusSelectedLabParams = [],
  patientGender,
  showVoiceRx = true,
  initialActiveId = "pastVisits",
  handleDrawerUploadDoc = NOOP,
  setFilesData = NOOP,
  setIsEditDocument = NOOP,
  setUploadDocDrawer = NOOP,
}) {
  const dispatch = useDispatch();
  const [activeId, setActiveId] = useState(() => initialActiveId);
  const [transitionDir, setTransitionDir] = useState(null);
  const [voiceBySection, setVoiceBySection] = useState({});
  const { activeVoiceModule, headerDictation, claimActiveVoiceModule, releaseActiveVoiceModule, runCopyWithAura, lastCopyRequest, lastSignal } = useRxPadSync();
  const headerDictationBusy = headerDictation?.status === "recording" || headerDictation?.status === "transcribing";
  const sideNavVoiceLockIdRef = useRef(`side-nav-voice-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const sideNavVoiceSessionIdRef = useRef(null);
  const [sideNavSignals, setSideNavSignals] = useState({});
  const [vitalsCopyUpdating, setVitalsCopyUpdating] = useState(false);
  const [digitizedOverrides, setDigitizedOverrides] = useState({});
  const pastVisitRows = useSelector((state) => state.pastVisits.rowsByPatient[patientId]?.rows ?? []);
  const pastVisitDetails = useSelector((state) => state.pastVisits.detailsByPatient[patientId] ?? {});
  const [pastVisitLoadingIds, setPastVisitLoadingIds] = useState({});
  const pastVisitDetailsRef = useRef({});
  const pastVisitLoadingIdsRef = useRef({});
  const [pastVisitsPage, setPastVisitsPage] = useState(1);
  const [pastVisitsHasMore, setPastVisitsHasMore] = useState(false);
  const [isPastVisitsLoading, setIsPastVisitsLoading] = useState(false);
  const [hasPastVisitsLoaded, setHasPastVisitsLoaded] = useState(false);
  const [patientVaccineRows, setPatientVaccineRows] = useState([]);
  const [vaccineTemplateRows, setVaccineTemplateRows] = useState([]);
  const [opthalPrescriptionRows, setOpthalPrescriptionRows] = useState([]);
  const [growthChartRows, setGrowthChartRows] = useState([]);
  const [growthParentalDetails, setGrowthParentalDetails] = useState(null);
  const vaccineRequestRef = useRef(0);
  const handledSideNavSignalCopyRef = useRef(null);
  const handledVitalsCopySignalRef = useRef(null);
  const opthalRequestRef = useRef(0);
  const growthRequestRef = useRef(0);
  const pastVisitsRequestRef = useRef(0);
  const pastVisitRowsRef = useRef([]);
  const voiceDelayTimerRef = useRef(null);
  const medicalHistoryDefaultListRequestedRef = useRef(false);
  const emptyPastVisitsAutoSelectRef = useRef(false);
  const activePatientRef = useRef(patientId);
  const { vitalsPastList, patientBirthWeight } = useSelector((state) => state.vitals);
  const { allUploadedDocs = [], uploadDocCategories = [] } = useSelector((state) => state.uploadDoc);
  const obstetricRawDetails = useSelector((state) => state.obstetric?.obstetricDetails);
  const { defaultList: medicalHistoryDefaultList = [], loading: medicalHistoryLoading } = useSelector((state) => state.medicalhistory);
  const { isPediatricAccessable } = useAccess();
  const {
    vitalsData = [],
    setVitalsData,
    medicalHistoryData = [],
    setMedicalHistoryData,
    setLabParamsData,
    patient_data: patientData,
    tcmId,
    pamId,
    privateNotesData,
    setPrivateNotesData,
  } = useContext(CashManagerContext) || {};
  const getSideNavVoiceSessionId = useCallback(() => {
    if (tcmId && Number(tcmId) !== 0) return tcmId;
    if (pamId) return pamId;
    if (!sideNavVoiceSessionIdRef.current) {
      sideNavVoiceSessionIdRef.current = createSessionId();
    }
    return sideNavVoiceSessionIdRef.current;
  }, [pamId, tcmId]);
  useEffect(() => {
    activePatientRef.current = patientId;
  }, [patientId]);

  useEffect(() => {
    pastVisitRowsRef.current = pastVisitRows;
  }, [pastVisitRows]);

  useEffect(() => {
    pastVisitDetailsRef.current = pastVisitDetails;
  }, [pastVisitDetails]);

  useEffect(() => {
    if (medicalHistoryDefaultList?.length || medicalHistoryLoading || medicalHistoryDefaultListRequestedRef.current) return;
    medicalHistoryDefaultListRequestedRef.current = true;
    dispatch(listSectionwithTag());
  }, [dispatch, medicalHistoryDefaultList, medicalHistoryLoading]);

  useEffect(() => () => {
    if (voiceDelayTimerRef.current) {
      window.clearTimeout(voiceDelayTimerRef.current);
    }
    releaseActiveVoiceModule(sideNavVoiceLockIdRef.current);
  }, [releaseActiveVoiceModule]);

  useEffect(() => {
    const status = activeId ? voiceBySection[activeId]?.status : null;
    const busy = status === "recording" || status === "transcribing" || status === "digitizing";
    const lockId = sideNavVoiceLockIdRef.current;
    if (busy && activeId) {
      claimActiveVoiceModule(lockId, sectionVoiceLabel(activeId));
      return () => releaseActiveVoiceModule(lockId);
    }
    releaseActiveVoiceModule(lockId);
  }, [activeId, claimActiveVoiceModule, releaseActiveVoiceModule, voiceBySection]);

  useEffect(() => {
    const patientPid = patientData?.pm_pid || patientData?.vac_pid;
    const patientDob = parsePatientDobForVaccines(patientData);
    const requestId = vaccineRequestRef.current + 1;
    vaccineRequestRef.current = requestId;

    setPatientVaccineRows([]);
    setVaccineTemplateRows([]);

    if (!patientId || !patientPid) return;

    const fetchVaccines = async () => {
      try {
        const [patientTemplates, standardTemplates, overridenVaccines, vaccineBrands] = await Promise.all([
          getPatientVaccineDetails(patientId, patientPid),
          getVaccineTemplates(),
          getOverridenDueDate(patientId, patientPid),
          getVaccineBrands(),
        ]);
        if (vaccineRequestRef.current !== requestId) return;
        const mergedTemplates = mergeDataPatientDetails(
          Array.isArray(standardTemplates) ? standardTemplates : [],
          Array.isArray(patientTemplates) ? patientTemplates : [],
          Array.isArray(overridenVaccines) ? overridenVaccines : [],
          Array.isArray(vaccineBrands) ? vaccineBrands : [],
          patientDob
        );
        setPatientVaccineRows(Array.isArray(patientTemplates) ? patientTemplates : []);
        setVaccineTemplateRows(Array.isArray(mergedTemplates) ? mergedTemplates : []);
      } catch (error) {
        if (vaccineRequestRef.current !== requestId) return;
        setPatientVaccineRows([]);
        setVaccineTemplateRows([]);
        console.error("[SideNavbar][Vaccines] failed to fetch patient vaccines:", error);
      }
    };

    fetchVaccines();
  }, [patientId, patientData?.DOB, patientData?.dob, patientData?.patient_dob, patientData?.pm_dob, patientData?.pm_pid, patientData?.vac_dob, patientData?.vac_pid, vaccineRefreshKey]);

  useEffect(() => {
    const requestId = opthalRequestRef.current + 1;
    opthalRequestRef.current = requestId;
    setOpthalPrescriptionRows([]);

    if (!patientId) return;

    const fetchOpthalPrescriptions = async () => {
      try {
        const response = await getAllOpthalPrescriptions({ patientId });
        if (opthalRequestRef.current !== requestId) return;
        const payload = response?.data ?? response;
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.prescriptions)
              ? payload.prescriptions
              : [];
        setOpthalPrescriptionRows(rows);
      } catch (error) {
        if (opthalRequestRef.current !== requestId) return;
        setOpthalPrescriptionRows([]);
        console.error("[SideNavbar][Ophthal] failed to fetch prescriptions:", error);
      }
    };

    fetchOpthalPrescriptions();
  }, [patientId, opthalRefreshKey]);

  useEffect(() => {
    const requestId = growthRequestRef.current + 1;
    growthRequestRef.current = requestId;
    setGrowthChartRows([]);
    setGrowthParentalDetails(null);

    const pmId = patientData?.pm_id || patientData?.pmId;
    const pmPid = patientData?.pm_pid || patientData?.patient_id || patientData?.pmPid;
    if (!pmId || !pmPid) return;

    const fetchGrowthData = async () => {
      try {
        const [growthRows, parentalDetails] = await Promise.all([
          getAllGrowthChartParams({ pm_id: pmId, pm_pid: pmPid }),
          getParentalDetails(pmId, pmPid),
        ]);
        if (growthRequestRef.current !== requestId) return;
        const growthPayload = growthRows?.data ?? growthRows;
        const parentalPayload = parentalDetails?.data ?? parentalDetails;
        setGrowthChartRows(Array.isArray(growthPayload) ? growthPayload : []);
        setGrowthParentalDetails(parentalPayload || null);
      } catch (error) {
        if (growthRequestRef.current !== requestId) return;
        setGrowthChartRows([]);
        setGrowthParentalDetails(null);
        console.error("[SideNavbar][Growth] failed to fetch growth data:", error);
      }
    };

    fetchGrowthData();
  }, [growthRefreshKey, patientData?.patient_id, patientData?.pm_id, patientData?.pm_pid, patientData?.pmId, patientData?.pmPid]);

  const fetchPastVisitsPage = useCallback(async (page = 1) => {
    if (!patientId) return;
    const requestId = pastVisitsRequestRef.current + 1;
    pastVisitsRequestRef.current = requestId;
    setIsPastVisitsLoading(true);
    try {
      const response = await ApiCaseManager.listConsultations({
        patient_unique_id: patientId,
        limit: PAST_VISITS_BATCH_SIZE,
        page,
      });
      if (pastVisitsRequestRef.current !== requestId) return;
      const payload = response?.status ? response?.data : {};
      const consultations = Array.isArray(payload?.consultations) ? payload.consultations : [];
      const visibleConsultations = filterCurrentPastVisit(consultations, tcmId);
      const pagination = payload?.pagination || {};
      const currentPage = pagination.currentPage || page;
      const totalPages = pagination.totalPages || page;
      const previousRows = page === 1 ? [] : pastVisitRowsRef.current;
      const existingKeys = new Set(previousRows.map(getPastVisitUniqueKey).filter(Boolean));
      const uniqueVisibleConsultations = dedupePastVisitRows(visibleConsultations);
      const nextRows = uniqueVisibleConsultations.filter((item) => {
        const key = getPastVisitUniqueKey(item);
        return !key || !existingKeys.has(key);
      });
      const mergedRows = page === 1 ? nextRows : [...previousRows, ...nextRows];
      pastVisitRowsRef.current = mergedRows;
      if (page === 1) {
        dispatch(setPastVisitRows({ patientId, rows: mergedRows, page: currentPage, hasMore: currentPage < totalPages }));
      } else {
        dispatch(appendPastVisitRows({ patientId, rows: nextRows, page: currentPage, hasMore: currentPage < totalPages && nextRows.length > 0 }));
      }
      setPastVisitsPage(currentPage);
      setPastVisitsHasMore(currentPage < totalPages && (page === 1 || nextRows.length > 0));
    } catch (error) {
      console.error("[SideNavbar][PastVisits] failed to fetch consultations:", error);
    } finally {
      if (pastVisitsRequestRef.current === requestId) {
        setIsPastVisitsLoading(false);
        if (page === 1) setHasPastVisitsLoaded(true);
      }
    }
  }, [dispatch, patientId, tcmId]);

  useEffect(() => {
    dispatch(clearPastVisits());
    pastVisitDetailsRef.current = {};
    pastVisitLoadingIdsRef.current = {};
    setPastVisitLoadingIds({});
    setPastVisitsPage(1);
    setPastVisitsHasMore(false);
    setHasPastVisitsLoaded(false);
    pastVisitRowsRef.current = [];
    emptyPastVisitsAutoSelectRef.current = false;
    pastVisitsRequestRef.current += 1;
    if (patientId) {
      fetchPastVisitsPage(1);
    } else {
      setHasPastVisitsLoaded(true);
    }
  }, [dispatch, fetchPastVisitsPage, patientId]);

  const fetchPastVisitDetail = useCallback(async (visit) => {
    const tcmId = visit?.tcmId;
    if (!patientId || !tcmId || pastVisitDetailsRef.current[tcmId] || pastVisitLoadingIdsRef.current[tcmId]) return;
    const patientAtRequest = patientId;
    pastVisitLoadingIdsRef.current = { ...pastVisitLoadingIdsRef.current, [tcmId]: true };
    setPastVisitLoadingIds((prev) => ({ ...prev, [tcmId]: true }));
    try {
      const response = await ApiCaseManager.viewCaseManager({
        patient_unique_id: patientAtRequest,
        tcm_id: tcmId,
      });
      const responseData = response?.data;
      if ((response?.status || responseData?.status) && responseData) {
        if (patientAtRequest !== activePatientRef.current) return;
        const detailPayload = normalizePastVisitDetailPayload(responseData);
        const printUrl = detailPayload?.print_url ||
          detailPayload?.print_rx_url ||
          detailPayload?.caseManagerData?.print_url ||
          detailPayload?.caseManagerData?.print_rx_url ||
          "";
        const printPayload = await fetchPastVisitPrintPayload(printUrl, detailPayload);
        if (patientAtRequest !== activePatientRef.current) return;
        const normalizedPrintPayload = normalizePastVisitDetailPayload(printPayload);
        const enrichedDetail = {
          ...(normalizedPrintPayload || {}),
          ...(detailPayload || {}),
          printPayload: normalizedPrintPayload || printPayload,
          smartDigitizeRxData: detailPayload?.smartDigitizeRxData ||
            normalizedPrintPayload?.smartDigitizeRxData ||
            printPayload?.smartDigitizeRxData ||
            printPayload?.data?.smartDigitizeRxData ||
            printPayload?.data?.data?.smartDigitizeRxData,
        };
        dispatch(setPastVisitDetail({ patientId: patientAtRequest, tcmId, detail: enrichedDetail }));
        pastVisitDetailsRef.current = { ...pastVisitDetailsRef.current, [tcmId]: enrichedDetail };
      }
    } catch (error) {
      console.error("[SideNavbar][PastVisits] failed to fetch consultation detail:", error);
    } finally {
      pastVisitLoadingIdsRef.current = { ...pastVisitLoadingIdsRef.current, [tcmId]: false };
      setPastVisitLoadingIds((prev) => ({ ...prev, [tcmId]: false }));
    }
  }, [patientId, dispatch]);

  const legacyPastVisitEntries = useMemo(
    () => filterCurrentPastVisit(pastVisitRows, tcmId).map((row) => {
      const visitTcmId = getPastVisitTcmId(row);
      const entry = buildPastVisitEntry(row, pastVisitDetails[visitTcmId]);
      const hasRenderableData = entry.digitalRx ||
        entry.writtenRx?.length ||
        entry.transcriptBlocks?.length;
      return {
        ...entry,
        detailLoading: Boolean(pastVisitLoadingIds[visitTcmId]) && !hasRenderableData,
      };
    }),
    [pastVisitRows, pastVisitDetails, pastVisitLoadingIds, tcmId]
  );
  const legacyVitalsEntries = useMemo(() => buildLegacyVitalsEntries({
    vitalsData,
    vitalsPastList,
    patientBirthWeight,
    patientData,
    isPediatricAccessable,
  }), [vitalsData, vitalsPastList, patientBirthWeight, patientData, isPediatricAccessable]);
  const legacyHistorySections = useMemo(
    () => buildLegacyMedicalHistorySections(medicalHistoryData),
    [medicalHistoryData]
  );
  const legacyLabEntries = useMemo(
    () => buildLegacyLabEntries(labParamsDataProp),
    [labParamsDataProp]
  );
  const legacyMedicalRecords = useMemo(
    () => buildLegacyMedicalRecords(allUploadedDocs, uploadDocCategories),
    [allUploadedDocs, uploadDocCategories]
  );
  const legacyGynecSections = useMemo(
    () => {
      const sections = buildLegacyGynecSections(gynecHistoryProp);
      console.log("[SideNavbar][Gynec] active patient:", patientId);
      console.log("[SideNavbar][Gynec] incoming gynecHistory prop:", gynecHistoryProp);
      console.log("[SideNavbar][Gynec] mapped gynec sections:", sections);
      return sections;
    },
    [gynecHistoryProp, patientId]
  );
  const legacyObstetricSections = useMemo(
    () => buildLegacyObstetricSections(obstetricRawDetails),
    [obstetricRawDetails]
  );
  const legacyVaccineData = useMemo(
    () => buildLegacyVaccineData(patientVaccineRows, vaccineTemplateRows),
    [patientVaccineRows, vaccineTemplateRows]
  );
  const legacyOpthalEntries = useMemo(
    () => buildLegacyOpthalEntries(opthalPrescriptionRows),
    [opthalPrescriptionRows]
  );
  const legacyGrowthData = useMemo(
    () => buildLegacyGrowthData(growthChartRows, growthParentalDetails, patientData),
    [growthChartRows, growthParentalDetails, patientData]
  );
  const privateNotesValue = typeof privateNotesData === "string" ? privateNotesData : privateNotesData?.notes || "";
  const handlePrivateNotesChange = useCallback((notes) => {
    if (!setPrivateNotesData) return;
    if (!notes.trim()) {
      setPrivateNotesData(privateNotesData?.id !== undefined ? { ...privateNotesData, notes } : null);
      return;
    }
    setPrivateNotesData({
      ...(typeof privateNotesData === "object" && privateNotesData ? privateNotesData : {}),
      id: privateNotesData?.id,
      notes,
    });
  }, [privateNotesData, setPrivateNotesData]);
  const savePrivateNotesFromVoice = useCallback(async (notes) => {
    const cleanNotes = String(notes || "").trim();
    if (!cleanNotes) {
      handlePrivateNotesChange("");
      return null;
    }

    const sendData = {
      id: privateNotesData?.id !== undefined ? privateNotesData.id : 0,
      patient_unique_id: patientData?.patient_unique_id || patientId || 0,
      notes: cleanNotes,
    };

    const action = await dispatch(addEditPrivateNotes(sendData));
    if (action.meta.requestStatus !== "fulfilled") {
      throw new Error(action.error?.message || "Private notes save failed.");
    }

    const savedNote = {
      ...(typeof privateNotesData === "object" && privateNotesData ? privateNotesData : {}),
      ...action.payload,
      notes: action.payload?.notes ?? cleanNotes,
    };
    setPrivateNotesData?.(savedNote);
    return savedNote;
  }, [dispatch, handlePrivateNotesChange, patientData?.patient_unique_id, patientId, privateNotesData, setPrivateNotesData]);
  const viewData = useMemo(() => buildViewData(digitizedOverrides, {
    pastVisits: legacyPastVisitEntries,
    vitals: legacyVitalsEntries,
    history: legacyHistorySections,
    labResults: legacyLabEntries,
    medicalRecords: legacyMedicalRecords.length ? legacyMedicalRecords : undefined,
    medicalRecordsRawDocs: allUploadedDocs,
    medicalRecordsCategories: uploadDocCategories,
    gynec: legacyGynecSections,
    obstetric: legacyObstetricSections,
    vaccine: legacyVaccineData,
    optal: legacyOpthalEntries,
    growth: legacyGrowthData,
  }), [digitizedOverrides, legacyPastVisitEntries, legacyVitalsEntries, legacyHistorySections, legacyLabEntries, legacyMedicalRecords, allUploadedDocs, uploadDocCategories, legacyGynecSections, legacyObstetricSections, legacyVaccineData, legacyOpthalEntries, legacyGrowthData]);

  const pastVisitsState = useMemo(() => ({
    loading: isPastVisitsLoading,
    hasMore: pastVisitsHasMore,
    onLoadMore: () => {
      if (!isPastVisitsLoading && pastVisitsHasMore) {
        fetchPastVisitsPage(pastVisitsPage + 1);
      }
    },
    onExpand: fetchPastVisitDetail,
  }), [fetchPastVisitDetail, fetchPastVisitsPage, isPastVisitsLoading, pastVisitsHasMore, pastVisitsPage]);

  const handlePastVisitCopyPayload = useCallback((payload, opts) => {
    runCopyWithAura(payload, opts);
  }, [runCopyWithAura]);

  const actionLabels = useMemo(() => ({
    vitals: "Add/Edit Details",
    history: "Add/Edit Details",
    labResults: "Add/Edit Details",
    medicalRecords: "Add/Edit Details",
    gynec: "Add/Edit Details",
    obstetric: "Add/Edit Details",
    vaccine: "Add/Edit Details",
    optal: "Add/Edit Details",
    growth: "Add/Edit Details",
  }), []);

  const actionHidePlusIcons = useMemo(() => ({
    labResults: labParamsDataProp?.length > 0,
    medicalRecords: allUploadedDocs.length > 0,
  }), [allUploadedDocs.length, labParamsDataProp?.length]);

  const navItems = useMemo(() => {
    const seen = new Set(["pastVisits", "vitals", "history"]);
    const orderedItems = [NAV_ITEM_BY_ID.pastVisits, NAV_ITEM_BY_ID.vitals, NAV_ITEM_BY_ID.history];
    const access = {
      isVaccinationAccessable,
      isGrowthChartAccessable,
      isGynaecHistoryAccessable,
    };

    (customizedPadLeftList || []).forEach((item) => {
      const navId = getCustomizedPadNavId(item, access);
      if (navId === "growth") return;
      if (!navId || seen.has(navId) || !NAV_ITEM_BY_ID[navId]) return;
      seen.add(navId);
      orderedItems.push(NAV_ITEM_BY_ID[navId]);
    });

    if (isOpthalModuleAccessible && !seen.has("optal")) {
      seen.add("optal");
      orderedItems.push(NAV_ITEM_BY_ID.optal);
    }
    if (isGrowthChartAccessable && !seen.has("growth")) {
      seen.add("growth");
      orderedItems.push(NAV_ITEM_BY_ID.growth);
    }
    if (isZydusUserAccessable && !seen.has("zydusLabReports")) {
      seen.add("zydusLabReports");
      orderedItems.push(NAV_ITEM_BY_ID.zydusLabReports);
    }

    return orderedItems;
  }, [
    customizedPadLeftList,
    isGynaecHistoryAccessable,
    isGrowthChartAccessable,
    isOpthalModuleAccessible,
    isVaccinationAccessable,
    isZydusUserAccessable,
  ]);

  const navSequence = useMemo(() => navItems.map((item) => item.id), [navItems]);
  const firstCustomizedNavId = useMemo(
    () => navSequence.find((id) => id !== "pastVisits") || null,
    [navSequence]
  );

  const handleSectionAction = useCallback((sectionId) => {
    if (onSectionAction) {
      onSectionAction(sectionId);
      return;
    }
    console.log("[sideNavbar] add/edit details clicked", { sectionId });
  }, [onSectionAction]);

  const setActiveSection = useCallback((id, dir = null) => {
    setTransitionDir(dir);
    setActiveId(id);
    if (onSectionSelect) onSectionSelect(id);
  }, [onSectionSelect]);

  const clearSideNavSignal = useCallback((sectionId) => {
    if (!SIDE_NAV_SIGNAL_SECTIONS.has(sectionId)) return;
    setSideNavSignals((prev) => {
      if (!prev[sectionId]) return prev;
      return {
        ...prev,
        [sectionId]: { ...prev[sectionId], unread: false, animating: false },
      };
    });
  }, []);

  const triggerSideNavSignal = useCallback((sectionId) => {
    if (!SIDE_NAV_SIGNAL_SECTIONS.has(sectionId)) return;
    setSideNavSignals((prev) => ({
      ...prev,
      [sectionId]: { unread: true, animating: true },
    }));
  }, []);

  useEffect(() => {
    if (!lastCopyRequest || handledSideNavSignalCopyRef.current === lastCopyRequest.id) return;
    handledSideNavSignalCopyRef.current = lastCopyRequest.id;

    const signalTargets = getSideNavSignalTargetsFromCopyRequest(lastCopyRequest);
    if (!signalTargets.length) return;

    signalTargets.forEach(triggerSideNavSignal);
    signalTargets.forEach((signalTarget) => {
      if (signalTarget === activeId) {
        clearSideNavSignal(signalTarget);
      }
    });
    const payload = lastCopyRequest.payload || {};
    const focusedSignalTarget = signalTargets.find((signalTarget) => payload.sideNavSignalTarget === signalTarget);
    const shouldAutoOpen = !lastCopyRequest.isBulk &&
      focusedSignalTarget &&
      payload.sideNavSignalMode === "focused";
    if (shouldAutoOpen) {
      setActiveSection(focusedSignalTarget, null);
    }
  }, [activeId, clearSideNavSignal, lastCopyRequest, setActiveSection, triggerSideNavSignal]);

  useEffect(() => {
    if (!lastSignal || handledVitalsCopySignalRef.current === lastSignal.id) return;
    handledVitalsCopySignalRef.current = lastSignal.id;
    if (lastSignal.type !== "vitals_copy_status") return;
    setVitalsCopyUpdating(lastSignal.status === "pending");
  }, [lastSignal]);

  useEffect(() => {
    if (SIDE_NAV_SIGNAL_SECTIONS.has(activeId)) {
      clearSideNavSignal(activeId);
    }
  }, [activeId, clearSideNavSignal]);

  useEffect(() => {
    if (!activeId || navSequence.includes(activeId)) return;
    setActiveSection(firstCustomizedNavId || "pastVisits", null);
  }, [activeId, firstCustomizedNavId, navSequence, setActiveSection]);

  useEffect(() => {
    if (!hasPastVisitsLoaded || isPastVisitsLoading || activeId !== "pastVisits") return;
    if (legacyPastVisitEntries.length > 0 || !firstCustomizedNavId || emptyPastVisitsAutoSelectRef.current) return;
    emptyPastVisitsAutoSelectRef.current = true;
    setActiveSection(firstCustomizedNavId, null);
  }, [
    activeId,
    firstCustomizedNavId,
    hasPastVisitsLoaded,
    isPastVisitsLoading,
    legacyPastVisitEntries.length,
    setActiveSection,
  ]);

  const handleSelect = (id) => {
    clearSideNavSignal(id);
    const next = activeId === id ? null : id;
    setActiveSection(next, null);
  };

  const handleClose = () => {
    setActiveSection(null, null);
  };

  const handleNavigate = useCallback((dir) => {
    const currentIndex = navSequence.indexOf(activeId);
    if (currentIndex === -1) return;
    const nextIndex = dir === "next" ? currentIndex + 1 : currentIndex - 1;
    const next = navSequence[nextIndex];
    if (!next) return;
    setActiveSection(next, dir);
  }, [activeId, navSequence, setActiveSection]);

  const updateVoiceState = useCallback((sectionId, patch) => {
    setVoiceBySection((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), ...patch },
    }));
  }, []);

  const applySideNavVoiceResult = useCallback((sectionId, result) => {
    if (sectionId === "vitals" && result?.vitals && sideNavObjectHasContent(result.vitals, ["date"])) {
      setVitalsData?.((prev = []) => [result.vitals, ...prev]);
      setDigitizedOverrides((prev) => ({ ...prev, vitals: result.vitals }));
      return;
    }

    if (sectionId === "history" && Array.isArray(result?.history) && result.history.length > 0) {
      setMedicalHistoryData?.((prev = []) => {
        const defaultSource = medicalHistoryDefaultList?.length ? medicalHistoryDefaultList : prev;
        const mappedHistory = mapSideNavMedicalHistoryIdsFromDefaultList(result.history, defaultSource);
        const finalMedicalHistoryData = mergeSideNavMedicalHistorySections(prev, mappedHistory);
        console.groupCollapsed("[SideNav MedicalHistory] agents/module mapped result");
        console.log("raw normalized result.history", result.history);
        console.log("default source used for id mapping", defaultSource);
        console.log("mapped history after default-list conversion", mappedHistory);
        console.log("final data passed to setMedicalHistoryData", finalMedicalHistoryData);
        console.groupEnd();
        return finalMedicalHistoryData;
      });
      return;
    }

    if (sectionId === "labResults" && Array.isArray(result?.labResults) && result.labResults.length > 0) {
      const entry = {
        date: moment().format("YYYY-MM-DD"),
        inputs: result.labResults.map((item) => ({
          testName: item.investigation_name,
          value: item.value || item.result || item.note || "--",
          units: item.unit || item.units || "",
          arrowDirection: item.arrowDirection || item.direction || "",
        })),
      };
      setLabParamsData?.((prev = []) => [entry, ...prev]);
      setDigitizedOverrides((prev) => ({ ...prev, labResults: { lab_investigations: result.labResults } }));
    }
  }, [medicalHistoryDefaultList, setLabParamsData, setMedicalHistoryData, setVitalsData]);

  const transcribeSectionAudio = useCallback(async (sectionId, audioBlob) => {
    if (!isSideNavVoiceSupported(sectionId)) {
      return;
    }
    const isPrivateNotesVoice = sectionId === SIDE_NAV_PRIVATE_NOTES_SECTION;
    updateVoiceState(sectionId, { status: "recording", error: "", transcript: "", digitizedSummary: "" });
    if (voiceDelayTimerRef.current) {
      window.clearTimeout(voiceDelayTimerRef.current);
    }
    voiceDelayTimerRef.current = window.setTimeout(() => {
      updateVoiceState(sectionId, { status: isPrivateNotesVoice ? "transcribing" : "digitizing", error: "", transcript: "", digitizedSummary: "" });
    }, SIDE_NAV_SHINER_DELAY_MS);

    try {
      const result = isPrivateNotesVoice
        ? await transcribeAnyAudio({
          audioBlob,
          prompt: PRIVATE_NOTES_TRANSCRIPTION_PROMPT,
        })
        : await requestSideNavModuleDigitise({
          sectionId,
          audioBlob,
          patientId,
          doctorId,
          sessionId: getSideNavVoiceSessionId(),
          previousContext: sectionId === "history"
            ? buildSideNavMedicalHistoryPreviousContext(medicalHistoryData)
            : undefined,
        });
      if (voiceDelayTimerRef.current) {
        window.clearTimeout(voiceDelayTimerRef.current);
        voiceDelayTimerRef.current = null;
      }
      if (isPrivateNotesVoice) {
        await savePrivateNotesFromVoice(appendPrivateNotesTranscript(privateNotesValue, result.transcript));
        toast.success("Private notes updated from voice.");
      } else {
        applySideNavVoiceResult(sectionId, result);
      }
      updateVoiceState(sectionId, {
        status: "done",
        transcript: isPrivateNotesVoice ? result.transcript : "",
        digitizedSummary: isPrivateNotesVoice ? result.transcript : JSON.stringify(result, null, 2),
        error: "",
      });
    } catch (error) {
      if (voiceDelayTimerRef.current) {
        window.clearTimeout(voiceDelayTimerRef.current);
        voiceDelayTimerRef.current = null;
      }
      console.error("[sideNavbar] voice processing failed", { sectionId, error });
      toast.error(error?.message || "Voice processing failed.");
      updateVoiceState(sectionId, { status: "idle", error: "", transcript: "", digitizedSummary: "" });
    }
  }, [applySideNavVoiceResult, doctorId, getSideNavVoiceSessionId, medicalHistoryData, patientId, privateNotesValue, savePrivateNotesFromVoice, updateVoiceState]);

  const handleVoiceClick = useCallback(() => {
    if (!activeId) return;
    if (!isSideNavVoiceSupported(activeId)) return;
    if (activeVoiceModule || headerDictationBusy) return;
    const existing = voiceBySection[activeId]?.status;
    if (existing === "recording" || existing === "transcribing" || existing === "digitizing") return;
    getSideNavVoiceSessionId();
    updateVoiceState(activeId, { status: "recording", error: "", transcript: "", digitizedSummary: "" });
  }, [activeId, activeVoiceModule, getSideNavVoiceSessionId, headerDictationBusy, voiceBySection, updateVoiceState]);

  const handleVoiceRecorderSubmit = useCallback(({ audioBlob } = {}) => {
    if (activeId) return transcribeSectionAudio(activeId, audioBlob);
    return Promise.resolve();
  }, [activeId, transcribeSectionAudio]);

  const handleVoiceCancel = useCallback(() => {
    if (!activeId) return;
    if (voiceDelayTimerRef.current) {
      window.clearTimeout(voiceDelayTimerRef.current);
      voiceDelayTimerRef.current = null;
    }
    updateVoiceState(activeId, { status: "idle", error: "", transcript: "", digitizedSummary: "" });
  }, [activeId, updateVoiceState]);

  const handleVoiceOverlayClose = useCallback(() => {
    if (!activeId) return;
    if (voiceDelayTimerRef.current) {
      window.clearTimeout(voiceDelayTimerRef.current);
      voiceDelayTimerRef.current = null;
    }
    updateVoiceState(activeId, { status: "idle", error: "", transcript: "", digitizedSummary: "" });
  }, [activeId, updateVoiceState]);

  return (
    <aside className="snv-root" data-side-navbar="true">
      <NavPanel activeId={activeId} onSelect={handleSelect} items={navItems} signals={sideNavSignals} />
      {activeId ? (
        <SectionPanel
          activeId={activeId}
          onClose={handleClose}
          onNavigate={handleNavigate}
          transitionDir={transitionDir}
          voiceState={voiceBySection[activeId]}
          onVoiceClick={handleVoiceClick}
          onVoiceRecorderSubmit={handleVoiceRecorderSubmit}
          onVoiceCancel={handleVoiceCancel}
          onVoiceOverlayClose={handleVoiceOverlayClose}
          viewData={viewData}
          pastVisitsState={pastVisitsState}
          onActionClick={handleSectionAction}
          actionLabels={actionLabels}
          actionHidePlusIcons={actionHidePlusIcons}
          privateNotesValue={privateNotesValue}
          onPrivateNotesChange={handlePrivateNotesChange}
          onCopyPayload={handlePastVisitCopyPayload}
          voiceEnabled={showVoiceRx && SIDE_NAV_SUPPORTED_VOICE_SECTIONS.has(activeId)}
          voiceLocked={!!activeVoiceModule || headerDictationBusy}
          showVoiceRx={showVoiceRx}
          vitalsUpdating={vitalsCopyUpdating}
          zydusSelectedLabParams={zydusSelectedLabParams}
          patientId={patientId}
          doctorId={doctorId}
          patientGender={patientGender}
          voiceSessionId={getSideNavVoiceSessionId()}
          medicalRecordActions={{
            handleDrawerUploadDoc,
            setFilesData,
            setIsEditDocument,
            setUploadDocDrawer,
          }}
        />
      ) : null}
    </aside>
  );
}

export { SIDE_NAVBAR_DIGITIZATION_RESPONSE_CONTRACT };

export default SideNavbar;
