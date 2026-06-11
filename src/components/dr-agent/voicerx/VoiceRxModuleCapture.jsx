import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LoadingOutlined } from "@ant-design/icons";
import { Eraser, Grid5, Ram, Refresh2, Setting2 } from "iconsax-reactjs";
import { VoiceRecorderCore } from "./VoiceRecorderCore";
import { buildClinicalApiHeaders, joinAgentModuleApiUrl } from "./api/clinical-api";
import {
  CaptionCarousel,
  ConversationTranscript,
  DictationTranscript,
  hasDiarizedTranscript,
  hasTranscriptContent,
} from "./VoiceTranscriptProcessingCard";
import { ShineBorder } from "./ShineBorder";
import { VoiceRxIcon } from "./voice-consult-icons";
import { HoverTooltip } from "../atoms/Tooltip";
import { ConfirmDialog as TPConfirmDialog } from "../molecules/ConfirmDialog";
import CashManagerContext from "../../../context/CashManagerContext";
import { convertAgentMedicalHistoryRowsToSections } from "../../../utils/medicalHistoryConverters";
import { useRxPadSync } from "../rxpad/dr-agent/RxPadSyncContext";
import {
  addVoiceHistoryEntry,
  beginVoiceAttempt,
  markVoiceLogCreated,
} from "../../../redux/voiceDigitizationSlice";
import {
  buildVoiceHistoryEntry,
  uploadAndLogVoiceRx2,
} from "./voiceRx2Logging";
import { transcribeAnyAudio } from "./api/agent-audio-service";
import { toast } from "./toast";
import styles from "./VoiceRxModuleCapture.module.scss";

const ENABLE_REAL_MODULE_DIGITISE_API = true;
const MODULE_DIGITISE_ENDPOINT = "/agents/module";
const BUTTON_PROCESSING_MS = 5000;
const MODULE_DIGITISE_TIMEOUT_MS = 120000;
const MODULE_CAPTURE_SCROLL_TOP_OFFSET = 76;
const MODULE_CAPTURE_SCROLL_BOTTOM_OFFSET = 32;

const MODULE_API_NAMES = {
  "patient details": "patient_details",
  vitals: "vitals_body",
  "vitals/body": "vitals_body",
  "vitals body": "vitals_body",
  symptoms: "symptoms",
  examinations: "examinations",
  examination: "examinations",
  diagnosis: "diagnosis",
  "medication (rx)": "medications",
  medication: "medications",
  medications: "medications",
  medicine: "medications",
  "medical history": "medical_history",
  surgery: "surgery",
  surgeries: "surgery",
  "surgeries/procedures": "surgery",
  procedures: "surgery",
  advice: "advice",
  advices: "advice",
  investigation: "lab_investigations",
  investigations: "lab_investigations",
  "lab investigations": "lab_investigations",
  "lab/investigations": "lab_investigations",
  followup: "follow_up",
  "follow up": "follow_up",
  "follow-up": "follow_up",
  "other clinical info": "other_clinical_info",
  "custom module": "other_clinical_info",
};

export const VOICE_MODULE_DUMMY_DIGITISED_DATA = {
  symptoms: [
    {
      symptom_name: "Heart Burn",
      since: "2 Day(s)",
      severity: "Moderate",
      note: "asdf",
      objectID: "6920fb30-8e91-4d3f-9825-6339498efd7b-1734948424706",
      pms_default: 0,
    },
    {
      symptom_name: "test",
      since: "",
      severity: "",
      note: "etegfgsdgs",
      objectID: "a39f021e-acdf-4087-8476-e68980d3326a-1762237955113",
      pms_default: 0,
    },
    {
      symptom_name: "Heart Burn",
      since: "2 Day(s)",
      severity: "Moderate",
      note: "asdf",
      objectID: "6920fb30-8e91-4d3f-9825-6339498efd7b-1734948424706",
      pms_default: 0,
    },
    {
      symptom_name: "test",
      since: "",
      severity: "",
      note: "etegfgsdgs",
      objectID: "a39f021e-acdf-4087-8476-e68980d3326a-1762237955113",
      pms_default: 0,
    },
  ],
  examination: [
    {
      examination_name: "At vero eos et accusamus et iusto odio dignissimos ducimus",
      note: "sdfsfd",
      objectID: "",
      pms_default: 1,
    },
    {
      examination_name: "CC Sub Title 5-2",
      note: "",
      objectID: "",
      pms_default: 1,
    },
    {
      examination_name: "ED Subtitle 3-4",
      note: "sdf",
      objectID: "",
      pms_default: 1,
    },
  ],
  surgeries: [
    {
      masterId: "673d8dc4f503c1fb9aa90682",
      name: "Abdominal Cervical Encirclage",
      notes: "test notes",
    },
  ],
  diagnosis: [
    {
      objectID: "2d149aa9-3d73-497c-8494-6648235b0e10",
      tds_id: 20761,
      pms_default: 0,
      icd_code: "",
      tds_name: "typhy",
      unique_id: "107a1288-1231-4d11-946f-68889ab9fd6c",
      since: "",
      status: "",
      note: "",
    },
    {
      pms_default: 1,
      tds_name: "Syphilis of bone and joint",
      tdtd_id: 245,
      tdt_id: 80,
      tds_id: 20881,
      since: "",
      status: "",
      note: "",
      objectID: "d521a970-e566-4681-b358-1fc7f7530cdd",
      icd_code: "A52.77",
    },
    {
      pms_default: 1,
      tds_name: "Symptomatic late syphilis of other respiratory organs",
      tdtd_id: 246,
      tdt_id: 80,
      tds_id: 20878,
      since: "",
      status: "",
      note: "",
      objectID: "fa8527d3-c9f5-4fa6-acfa-1c970468f6f9",
      icd_code: "A52.73",
    },
    {
      pms_default: 0,
      tds_name: "hello",
      tdtd_id: 247,
      tdt_id: 80,
      tds_id: 20799,
      since: "",
      status: "",
      note: "",
      objectID: "285033a2-3f6d-4cb9-8adc-245e47674aff",
      icd_code: "",
    },
  ],
  medicine: [
    {
      tmm_id: 241832,
      tcm_tmr_type: "M",
      tmm_medicine_name: "PANTOPRAZOLINE SYRUP",
      tmm_generic: "PANTOP",
      tmm_company: "",
      tmm_type: 0,
      tmm_days: 10,
      tmm_duration_type: "Day(s)",
      tmm_dosage: "0",
      tmm_unit: 0,
      tcm_tmm_freq_morning: 1,
      tcm_tmm_freq_afternoon: 0,
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_night: 0,
      tmm_time: 5,
      tmm_freq_type: 0,
      tmf_block: 0,
      tmu_id: 0,
      tmm_remarks: "",
      pms_default: 0,
      tmm_unit_name: "",
      tmm_freq_type_name: "1 - 0 -0",
      tmf_block_val: "",
      tmm_time_name: "Before Breakfast",
      tmm_dosage_unit_name: "0 ",
      tmm_days_duration_type: "10 Day(s)",
      unique_id: "234a7c2d-13cb-42d1-954e-8c692fee3d5b",
    },
    {
      tmm_id: 234204,
      tcm_tmr_type: "M",
      tmm_medicine_name: "DOLO 650MG TABLET",
      tmm_generic: "PARACETAMOL-650MG",
      tmm_company: "",
      tmm_type: 0,
      tmm_days: 10,
      tmm_duration_type: "Day(s)",
      tmm_dosage: "0",
      tmm_unit: 0,
      tcm_tmm_freq_morning: 1,
      tcm_tmm_freq_afternoon: 1,
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_night: 1,
      tmm_time: 2,
      tmm_freq_type: 0,
      tmf_block: 0,
      tmu_id: 0,
      tmm_remarks: "",
      pms_default: 0,
      tmm_unit_name: "",
      tmm_freq_type_name: "1 - 1 - 1",
      tmf_block_val: "",
      tmm_time_name: "After Food",
      tmm_dosage_unit_name: "0 ",
      tmm_days_duration_type: "10 Day(s)",
      unique_id: "5098be13-f8d8-44dc-a952-7a3efae7e24d",
    },
    {
      tmm_id: 239907,
      tcm_tmr_type: "M",
      tmm_medicine_name: "AUGMENTIN DUO 30ML SYRUP",
      tmm_generic: "AMOXYCILLIN-200MG + CLAVULANIC ACID-28.5MG",
      tmm_company: "",
      tmm_type: 0,
      tmm_days: 7,
      tmm_duration_type: "Day(s)",
      tmm_dosage: "0",
      tmm_unit: 0,
      tcm_tmm_freq_morning: 1,
      tcm_tmm_freq_afternoon: 0,
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_night: 1,
      tmm_time: 0,
      tmm_freq_type: 0,
      tmf_block: 0,
      tmu_id: 0,
      tmm_remarks: "",
      pms_default: 0,
      tmm_unit_name: "",
      tmm_freq_type_name: "1 - 0 -1",
      tmf_block_val: "",
      tmm_time_name: "",
      tmm_dosage_unit_name: "0 ",
      tmm_days_duration_type: "7 Day(s)",
      unique_id: "a94d4110-9bac-49a3-a7fb-2821970cd074",
    },
    {
      tmm_id: 234366,
      tcm_tmr_type: "M",
      tmm_medicine_name: "ALERID D TABLET",
      tmm_generic: "CETIRIZINE-5MG + PHENYLEPHRINE-10MG",
      tmm_company: "",
      tmm_type: 0,
      tmm_days: 7,
      tmm_duration_type: "Day(s)",
      tmm_dosage: "0",
      tmm_unit: 0,
      tcm_tmm_freq_morning: 1,
      tcm_tmm_freq_afternoon: 0,
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_night: 1,
      tmm_time: 0,
      tmm_freq_type: 0,
      tmf_block: 0,
      tmu_id: 0,
      tmm_remarks: "",
      pms_default: 0,
      tmm_unit_name: "",
      tmm_freq_type_name: "1 - 0 -1",
      tmf_block_val: "",
      tmm_time_name: "",
      tmm_dosage_unit_name: "0 ",
      tmm_days_duration_type: "7 Day(s)",
      unique_id: "ffb6f1c0-1161-44cd-b5f8-74a190928175",
    },
  ],
  advice: [
    {
      unique_id: "a257c5c4-475b-4757-8544-d2ba8de204e7",
      change: 1,
      pms_default: 0,
      advice_name: "Start Symptoms voice input",
    },
  ],
  investigation: [
    {
      id: "50192",
      objectID: "a6425c65-1450-42f8-b5ab-b115b0c2462c",
      pms_default: 1,
      investigation_name: "BONE MARROW NEW TEST BY HITESH",
      hm_type: 1,
      um_id: 0,
      service_code: "",
      unique_id: "04caa6bf-dadf-4b01-aad0-7e6980526c5c",
      note: "",
    },
    {
      investigation_name: "COMPLEX KNEE SURGERY",
      note: "new 6",
      pms_default: 1,
      typesenseId: "0",
      unique_id: "82883a57-3ae1-4416-9b7c-6172ffb9b912",
    },
    {
      investigation_name: "ARTHROSCOPIC SURGERY ( OTHER THAN ACL) / MENISECTOMY",
      note: "new2",
      pms_default: 1,
      typesenseId: "0",
      unique_id: "01a0d675-c0ff-4d88-8fb3-67d7052d2cce",
    },
    {
      investigation_name: "# Scaphoid CRIF - II",
      note: "",
      pms_default: 1,
      typesenseId: "0",
      unique_id: "9c422d72-360e-4ec6-a17c-008b3728b805",
    },
    {
      investigation_name: "BONE GRAFTING FOR NON UNION OF SMALL BONES",
      note: "hohoho",
      pms_default: 1,
      typesenseId: "0",
      unique_id: "73531943-0651-4efc-a1a6-f78e65bb22a6",
    },
    {
      investigation_name: "COMPLEX KNEE SURGERY",
      note: "",
      pms_default: 1,
      typesenseId: "0",
      unique_id: "2e31851c-d9f6-4c4a-bd73-44d97a4b1548",
    },
  ],
};

function createModuleVoiceId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isModuleCaptureVisible(node) {
  if (!node || typeof node.getBoundingClientRect !== "function") return true;
  const rect = node.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top >= MODULE_CAPTURE_SCROLL_TOP_OFFSET &&
    rect.bottom <= viewportHeight - MODULE_CAPTURE_SCROLL_BOTTOM_OFFSET;
}

function scrollModuleCaptureIntoView(node) {
  if (!node || isModuleCaptureVisible(node)) return;
  node.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}

function resolveModuleApiName(moduleName) {
  const normalized = String(moduleName || "").trim().toLowerCase();
  return MODULE_API_NAMES[normalized] || "other_clinical_info";
}

function appendJsonFormField(formData, key, value) {
  if (value === undefined || value === null) return;
  formData.append(key, JSON.stringify(value));
}

function hasModulePreviousContext(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim() !== "";
}

function normalizeModulePreviousContext(previousContext, moduleApiName) {
  if (!hasModulePreviousContext(previousContext)) return undefined;

  const artifactName = moduleApiName || "other_clinical_info";
  if (Array.isArray(previousContext)) {
    return { [artifactName]: previousContext };
  }

  if (
    previousContext &&
    typeof previousContext === "object" &&
    !Object.prototype.hasOwnProperty.call(previousContext, artifactName)
  ) {
    return { [artifactName]: previousContext };
  }

  return previousContext;
}

function extractModulePayload(responseJson) {
  return responseJson?.payload?.data?.rxDigitizationHistory?.[0]?.response ??
    responseJson?.data?.rxDigitizationHistory?.[0]?.response ??
    responseJson?.rxDigitizationHistory?.[0]?.response ??
    responseJson?.data?.documents?.[0]?.data ??
    responseJson?.data?.document?.data ??
    responseJson?.data ??
    responseJson;
}

function extractModuleConversation(responseJson) {
  const payload = extractModulePayload(responseJson);
  return responseJson?.data?.transcript ??
    responseJson?.data?.transcription ??
    responseJson?.transcript ??
    responseJson?.transcription ??
    payload?.transcript ??
    payload?.transcription ??
    [];
}

function firstPresentArray(payload, keys, { allowObjectRow = false } = {}) {
  const parseMaybeJson = (value) => {
    if (typeof value !== "string") return value;
    const text = value.trim();
    if (!text || (!text.startsWith("[") && !text.startsWith("{"))) return value;
    try {
      return JSON.parse(text);
    } catch {
      return value;
    }
  };

  const findNestedArray = (value, depth = 3) => {
    const parsedValue = parseMaybeJson(value);
    if (Array.isArray(parsedValue)) return parsedValue;
    if (!parsedValue || typeof parsedValue !== "object" || depth <= 0) return null;

    const containerKeys = [
      ...keys,
      "response",
      "result",
      "results",
      "output",
      "outputs",
      "items",
      "rows",
      "entries",
      "records",
      "content",
      "digitized_data",
      "digitised_data",
      "digitizedData",
      "digitisedData",
      "module_response",
      "moduleResponse",
      "data",
    ];

    for (const key of containerKeys) {
      if (!(key in parsedValue)) continue;
      const nested = findNestedArray(parsedValue[key], depth - 1);
      if (nested) return nested;
    }

    return null;
  };

  const hasRowLikeShape = (row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return false;
    return [
      "name",
      "title",
      "type",
      "tags",
      "lineItem",
      "symptom_name",
      "examination_name",
      "tds_name",
      "tmm_medicine_name",
      "investigation_name",
      "advice_name",
      "surgery_name",
      "procedure_name",
    ].some((key) => row[key] !== undefined);
  };

  const findNestedRowArray = (value, depth = 3) => {
    const parsedValue = parseMaybeJson(value);
    if (Array.isArray(parsedValue)) {
      return parsedValue.some(hasRowLikeShape) ? parsedValue : null;
    }
    if (!parsedValue || typeof parsedValue !== "object" || depth <= 0) return null;
    for (const nestedValue of Object.values(parsedValue)) {
      const nested = findNestedRowArray(nestedValue, depth - 1);
      if (nested) return nested;
    }
    return null;
  };

  const parsedPayload = parseMaybeJson(payload);
  if (Array.isArray(parsedPayload)) return parsedPayload;
  const nestedPayloadArray = findNestedArray(parsedPayload);
  if (nestedPayloadArray) return nestedPayloadArray;
  const nestedRowArray = findNestedRowArray(parsedPayload);
  if (nestedRowArray) return nestedRowArray;
  for (const key of keys) {
    const value = parseMaybeJson(parsedPayload?.[key]);
    if (Array.isArray(value)) return value;
    const nestedArray = findNestedArray(value);
    if (nestedArray) return nestedArray;
    const nestedRows = findNestedRowArray(value);
    if (nestedRows) return nestedRows;
    if (allowObjectRow && value && typeof value === "object") return [value];
  }
  if (allowObjectRow && parsedPayload && typeof parsedPayload === "object") return [parsedPayload];
  return [];
}

function normalizeDiagnosisStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "diagnosed" || value === "confirmed") return "Confirmed";
  if (value === "suspected") return "Suspected";
  if (value === "ruled out" || value === "ruled_out") return "Ruled Out";
  return status || "";
}

function normalizeFrequencyText(frequency) {
  const text = String(frequency || "").trim().toLowerCase();
  if (!text) {
    return {
      label: "",
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };
  }

  const numericMatch = text.match(/^(\d+)\s*[-x,]\s*(\d+)(?:\s*[-x,]\s*(\d+))?(?:\s*[-x,]\s*(\d+))?$/);
  if (numericMatch) {
    const [, morning, afternoon, eveningOrNight, night] = numericMatch;
    if (night !== undefined) {
      return {
        label: `${morning} - ${afternoon} - ${eveningOrNight} - ${night}`,
        morning: Number(morning) || 0,
        afternoon: Number(afternoon) || 0,
        evening: Number(eveningOrNight) || 0,
        night: Number(night) || 0,
      };
    }
    return {
      label: `${morning} - ${afternoon} - ${eveningOrNight || 0}`,
      morning: Number(morning) || 0,
      afternoon: Number(afternoon) || 0,
      evening: 0,
      night: Number(eveningOrNight) || 0,
    };
  }

  const once = /\b(once|one time|1 time|od|qd|daily)\b/.test(text);
  const twice = /\b(twice|two times|2 times|bd|bid)\b/.test(text);
  const thrice = /\b(thrice|three times|3 times|tds|tid)\b/.test(text);
  const four = /\b(four times|4 times|qid)\b/.test(text);

  if (four) {
    return { label: "1 - 1 - 1 - 1", morning: 1, afternoon: 1, evening: 1, night: 1 };
  }
  if (thrice) {
    return { label: "1 - 1 - 1", morning: 1, afternoon: 1, evening: 0, night: 1 };
  }
  if (twice) {
    return { label: "1 - 0 - 1", morning: 1, afternoon: 0, evening: 0, night: 1 };
  }
  if (once) {
    return { label: "1 - 0 - 0", morning: 1, afternoon: 0, evening: 0, night: 0 };
  }

  return {
    label: frequency || "",
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };
}

function normalizeDurationText(duration) {
  const text = String(duration || "").trim();
  if (!text) {
    return {
      days: "",
      type: "",
      label: "",
    };
  }

  const numberWords = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    fifteen: 15,
    twenty: 20,
    thirty: 30,
  };
  const match = text.match(/^(?:for\s+)?(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty)\s*(day|days|week|weeks|month|months|year|years)\b/i);
  if (!match) {
    return {
      days: "",
      type: text,
      label: text,
    };
  }

  const rawValue = match[1].toLowerCase();
  const value = numberWords[rawValue] ?? Number(rawValue);
  const unit = match[2].toLowerCase();
  const type = unit.startsWith("week")
    ? "Week(s)"
    : unit.startsWith("month")
      ? "Month(s)"
      : unit.startsWith("year")
        ? "Year(s)"
        : "Day(s)";

  return {
    days: Number.isFinite(value) ? value : "",
    type,
    label: `${Number.isFinite(value) ? value : match[1]} ${type}`,
  };
}

function hasMedicineMasterId(tmmId) {
  return tmmId !== undefined &&
    tmmId !== null &&
    String(tmmId).trim() !== "" &&
    Number(tmmId) !== 0;
}

function normalizeDosageText(dosage) {
  const text = String(dosage ?? "").trim();
  if (!text) return { value: "", label: "" };
  const match = text.match(/^(\d+(?:\.\d+)?)(?:\s*(.*))?$/);
  return {
    value: match ? match[1] : text,
    label: text,
  };
}

function appendDosageToMedicineName(name, dosage) {
  const medicineName = String(name || "").trim();
  const dosageText = String(dosage || "").trim();
  if (!medicineName || !dosageText) return medicineName;
  if (medicineName.toLowerCase().includes(dosageText.toLowerCase())) return medicineName;
  return `${medicineName} ${dosageText}`;
}

function firstTextValue(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const text = firstTextValue(...value);
      if (text) return text;
      continue;
    }
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function compactModuleContextRow(row) {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => (
      value !== undefined &&
      value !== null
    ))
  );
}

export function moduleRowsToPreviousContext(rows = [], moduleApiName) {
  if (!Array.isArray(rows)) return undefined;

  const contextRows = rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;

      switch (moduleApiName) {
        case "symptoms":
          return compactModuleContextRow({
            name: row.symptom_name ?? "",
            duration: row.since ?? "",
            severity: row.severity ?? "",
            notes: row.note ?? "",
          });
        case "examinations":
          return compactModuleContextRow({
            name: row.examination_name ?? "",
            notes: row.note ?? "",
          });
        case "diagnosis":
          return compactModuleContextRow({
            name: row.tds_name ?? "",
            icd_code: row.icd_code ?? "",
            duration: row.since ?? "",
            status: row.status ?? "",
            notes: row.note ?? "",
          });
        case "medications":
          return compactModuleContextRow({
            name: row.tmm_medicine_name || row.tm_medicine_name || row.medicine_name || "",
            dosage: row.tmm_dosage_unit_name || row.tmm_dosage || "",
            frequency: row.tmm_freq_type_name ?? "",
            duration: row.tmm_days_duration_type || [row.tmm_days, row.tmm_duration_type].filter(Boolean).join(" "),
            schedule: row.tmm_time_name ?? "",
            notes: row.tmm_remarks || row.note || "",
          });
        case "advice":
          return compactModuleContextRow({
            name: row.advice_name ?? "",
          });
        case "lab_investigations":
          return compactModuleContextRow({
            name: row.investigation_name ?? "",
            notes: row.note ?? "",
          });
        case "surgery":
          return compactModuleContextRow({
            name: row.name || row.surgery_name || row.procedure_name || "",
            notes: row.notes || row.note || "",
          });
        default:
          return compactModuleContextRow(row);
      }
    })
    .filter((row) => row && Object.keys(row).length > 0);

  return contextRows.length ? { [moduleApiName || "other_clinical_info"]: contextRows } : undefined;
}

export function normalizeModuleRows(responseJson, moduleApiName) {
  const payload = extractModulePayload(responseJson);
  const artifactType = payload?.artifact_type || responseJson?.artifact_type || moduleApiName;
  const moduleKeys = moduleApiName === "medications"
    ? [moduleApiName, artifactType, "medications", "medicine", "medicines", "items", "data"]
    : moduleApiName === "lab_investigations"
      ? [moduleApiName, artifactType, "lab_investigation", "lab_investigations", "items", "data"]
      : moduleApiName === "medical_history"
        ? [moduleApiName, artifactType, "medical_history", "medicalHistory", "pastMedicalHistory", "history", "response", "result", "results", "output", "items", "rows", "records", "data"]
      : [moduleApiName, artifactType, "items", "data"];
  const rows = firstPresentArray(payload, moduleKeys, { allowObjectRow: moduleApiName === "medical_history" })
    .filter((row) => Object.values(row || {}).some((value) => value !== undefined && value !== null && String(value).trim() !== ""));

  if (moduleApiName === "medical_history") {
    const convertedRows = convertAgentMedicalHistoryRowsToSections(rows);
    console.groupCollapsed("[VoiceRx MedicalHistory] normalizeModuleRows");
    console.log("raw responseJson", responseJson);
    console.log("extracted payload", payload);
    console.log("moduleKeys", moduleKeys);
    console.log("firstPresentArray rows", rows);
    console.log("converted section rows", convertedRows);
    console.groupEnd();
    return convertedRows;
  }

  return rows.map((row) => {
    const isPrimitiveRow = typeof row === "string" || typeof row === "number";
    const name = isPrimitiveRow ? String(row).trim() : row?.name || row?.title || row?.label || "";
    const notes = isPrimitiveRow ? "" : row?.notes ?? row?.note ?? "";

    switch (moduleApiName) {
      case "symptoms":
        return {
          symptom_name: row?.symptom_name || name,
          since: row?.since || row?.duration || "",
          severity: row?.severity || "",
          note: notes,
          unique_id: row?.unique_id || createModuleVoiceId(),
          change: row?.change ?? 1,
          pms_default: 0,
        };
      case "examinations":
        return {
          examination_name: row?.examination_name || name,
          note: notes,
          unique_id: row?.unique_id || createModuleVoiceId(),
          change: row?.change ?? 1,
          pms_default: 0,
        };
      case "diagnosis": {
        const hasMasterId = row?.tds_id > 0;
        return {
          tds_name: row?.tds_name || name,
          tds_id: row?.tds_id ?? 0,
          unique_id: row?.unique_id || createModuleVoiceId(),
          change: row?.change ?? 1,
          pms_default: row?.pms_default ?? 0,
          icd_code: row?.icd_code || "",
          since: row?.since || "",
          status: normalizeDiagnosisStatus(row?.status),
          note: notes,
          ...(hasMasterId ? { objectID: row?.objectID || row?.id || "" } : {}),
        };
      }
      case "medications": {
        const frequency = normalizeFrequencyText(row?.frequency || row?.tmm_freq_type_name || row?.frequencyText || row?.frequency_text);
        const duration = normalizeDurationText(row?.duration || row?.tmm_days_duration_type);
        const dosageText = firstTextValue(row?.dosage, row?.dosage_text, row?.dose);
        const medicineName = firstTextValue(
          row?.tmm_medicine_name,
          row?.tm_medicine_name,
          row?.medicine_name,
          row?.medicine,
          row?.dm_name,
          row?.dm_names,
          row?.name,
          row?.title,
          name
        );
        const medicineNameWithDosage = appendDosageToMedicineName(medicineName, dosageText);
        const dosage = normalizeDosageText(row?.tmm_dosage ?? "");
        const tmmId = hasMedicineMasterId(row?.tmm_id) ? row.tmm_id : 0;
        const voiceGroupId = row?.voice_rx_group_id || row?.unique_id || createModuleVoiceId();
        return {
          ...row,
          tmm_id: tmmId,
          voice_rx_group_id: voiceGroupId,
          voice_rx_from_module: true,
          voice_rx_original_name: medicineNameWithDosage,
          tcm_tmr_type: row?.tcm_tmr_type || "M",
          tmm_medicine_name: medicineNameWithDosage,
          tmm_generic: row?.tmm_generic || "",
          tmm_company: row?.tmm_company || "",
          tmm_type: row?.tmm_type || 0,
          tmm_days: row?.tmm_days ?? duration.days,
          tmm_duration_type: row?.tmm_duration_type || duration.type,
          tmm_dosage: row?.tmm_dosage ?? dosage.value,
          tmm_unit: row?.tmm_unit ?? 0,
          tcm_tmm_freq_morning: row?.tcm_tmm_freq_morning ?? frequency.morning,
          tcm_tmm_freq_afternoon: row?.tcm_tmm_freq_afternoon ?? frequency.afternoon,
          tcm_tmm_freq_evening: row?.tcm_tmm_freq_evening ?? frequency.evening,
          tcm_tmm_freq_night: row?.tcm_tmm_freq_night ?? frequency.night,
          tmm_time: row?.tmm_time ?? 0,
          tmm_freq_type: row?.tmm_freq_type ?? 0,
          tmf_block: row?.tmf_block ?? 0,
          tmu_id: row?.tmu_id ?? row?.tmm_unit ?? 0,
          tmm_remarks: row?.tmm_remarks || notes,
          pms_default: row?.pms_default ?? 0,
          tmm_unit_name: row?.tmm_unit_name || "",
          tmm_freq_type_name: row?.tmm_freq_type_name || frequency.label,
          tmf_block_val: row?.tmf_block_val || "",
          tmm_time_name: row?.tmm_time_name || row?.schedule || row?.when || "",
          tmm_dosage_unit_name: !dosageText ? (row?.tmm_dosage_unit_name || row?.unitPerDose || "") : "",
          tmm_days_duration_type: row?.tmm_days_duration_type || duration.label,
          quantity: row?.quantity ?? 0,
          unique_id: row?.unique_id || createModuleVoiceId(),
        };
      }
      case "advice":
        return {
          unique_id: row?.unique_id || row?.id || createModuleVoiceId(),
          change: row?.change ?? 1,
          pms_default: row?.pms_default ?? 0,
          advice_name: row?.advice_name || row?.advice || name || notes,
        };
      case "lab_investigations": {
        const investigationInstruction = isPrimitiveRow
          ? ""
          : firstTextValue(row?.note, row?.notes, row?.instruction);
        return {
          id: row?.id,
          objectID: row?.objectID || row?.id || createModuleVoiceId(),
          voice_rx_from_module: true,
          voice_rx_original_name: row?.investigation_name || row?.test_name || name,
          pms_default: row?.pms_default ?? 0,
          investigation_name: row?.investigation_name || row?.test_name || name,
          hm_type: row?.hm_type,
          um_id: row?.um_id,
          service_code: row?.service_code,
          unique_id: row?.unique_id || createModuleVoiceId(),
          note: investigationInstruction,
        };
      }
      case "surgery":
        return {
          ...row,
          masterId: row?.masterId || row?.id || createModuleVoiceId(),
          name: row?.name || row?.surgery_name || row?.procedure_name || "",
          notes,
        };
      default:
        return {
          ...row,
          title: row?.title || name,
          notes,
          unique_id: row?.unique_id || row?.id || createModuleVoiceId(),
          change: row?.change ?? 1,
        };
    }
  });
}

async function requestTranscribeAndDigitise({
  audioBlob,
  moduleName,
  moduleApiName: moduleApiNameOverride,
  customModuleName,
  requiredFields,
  previousContext,
  patientId,
  doctorId,
  sessionId
}) {
  const moduleApiName = moduleApiNameOverride || resolveModuleApiName(moduleName);
  if (!patientId || !doctorId || !sessionId) {
    throw new Error("Missing patient, doctor, or session id for module voice digitisation.");
  }
  if (!audioBlob?.size) {
    throw new Error("No audio recording found for module voice digitisation.");
  }

  const formData = new FormData();
  formData.append("patient_id", String(patientId));
  formData.append("doctor_id", String(doctorId));
  formData.append("session_id", String(sessionId));
  formData.append("module_name", moduleApiName);
  if (customModuleName) {
    formData.append("custom_module_name", String(customModuleName));
  }
  appendJsonFormField(formData, "required_fields", requiredFields);
  appendJsonFormField(formData, "previous_context", normalizeModulePreviousContext(previousContext, moduleApiName));
  formData.append("audio", audioBlob, "audio.webm");

  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), MODULE_DIGITISE_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(joinAgentModuleApiUrl(MODULE_DIGITISE_ENDPOINT), {
      method: "POST",
      headers: buildClinicalApiHeaders({ includeContentType: false }),
      body: formData,
      signal: abortController.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Module voice digitise timed out after 120 seconds.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Module voice digitise failed with ${response.status}`);
  }

  const responseJson = await response.json();
  const rows = normalizeModuleRows(responseJson, moduleApiName);
  if (moduleApiName === "medical_history") {
    console.groupCollapsed("[VoiceRx MedicalHistory] requestTranscribeAndDigitise result");
    console.log("moduleApiName", moduleApiName);
    console.log("raw responseJson", responseJson);
    console.log("normalized rows returned to onComplete", rows);
    console.groupEnd();
  }
  return {
    rows,
    rawResponse: responseJson,
    conversation: extractModuleConversation(responseJson),
    moduleApiName,
  };
}

const VOICE_RX_ACTION_ICONS = {
  template: Grid5,
  save: Ram,
  clear: Eraser,
  customize: Setting2,
  reload: Refresh2,
};

export const VoiceRxModuleActionButton = React.forwardRef(function VoiceRxModuleActionButton(
  { type = "template", label, disabled = false, onClick, className = "", ...rest },
  ref
) {
  const Icon = VOICE_RX_ACTION_ICONS[type] || Grid5;

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={[styles.moduleActionButton, className].filter(Boolean).join(" ")}
      {...rest}
    >
      <Icon color="#4C4E5C" size={18} strokeWidth={1.6} variant="Linear" />
    </button>
  );
});

export function VoiceRxModuleButton({ active = false, disabled = false, onClick, label = "Start voice input", dictationTargetId }) {
  const { activeVoiceModule, headerDictation } = useRxPadSync();
  const headerDictationStatus = headerDictation?.status || "idle";
  const headerDictationBusy = headerDictationStatus === "recording" || headerDictationStatus === "transcribing";
  const headerDictationMatches = headerDictationBusy && !!dictationTargetId && headerDictation?.targetId === dictationTargetId;
  const locked = disabled || (!!activeVoiceModule && !active) || (headerDictationBusy && !headerDictationMatches);
  const clickBlocked = locked || headerDictationBusy;
  const statusLabel = headerDictationStatus === "recording"
    ? "Recording..."
    : headerDictationStatus === "transcribing"
      ? "Transcribing..."
      : "";

  return (
    <HoverTooltip content={headerDictationMatches ? statusLabel : locked ? "VoiceRx is active in another section" : label} side="top">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active || headerDictationMatches}
        disabled={locked}
        onClick={clickBlocked ? undefined : onClick}
        className={[
          styles.voiceButton,
          active || headerDictationMatches ? styles.voiceButtonActive : "",
          headerDictationMatches && headerDictationStatus === "recording" ? styles.voiceButtonRecording : "",
          headerDictationMatches && headerDictationStatus === "transcribing" ? styles.voiceButtonTranscribing : "",
          locked ? styles.voiceButtonDisabled : ""
        ].filter(Boolean).join(" ")}>
        {headerDictationMatches && headerDictationStatus === "transcribing" ? (
          <LoadingOutlined style={{ fontSize: 20 }} />
        ) : (
          <VoiceRxIcon size={36} color={headerDictationMatches && headerDictationStatus === "recording" ? "#e53935" : "#673AAC"} />
        )}
        {headerDictationMatches && headerDictationStatus === "recording" ? (
          <span className={styles.voiceButtonPulse} aria-hidden="true" />
        ) : null}
      </button>
    </HoverTooltip>
  );
}

export function useVoiceRxModuleCapture({ moduleName, onApply, onTranscriptionApply, successMessage, transcriptionSuccessMessage, copyPayloadKeys, copyPayloadMatcher }) {
  const [voiceCaptureOpen, setVoiceCaptureOpen] = useState(false);
  const [voiceUpdated, setVoiceUpdated] = useState(false);
  const voiceUpdatedTimerRef = useRef(null);
  const sectionRef = useRef(null);
  const handledCopyIdRef = useRef(null);
  const copyPayloadKeysRef = useRef(copyPayloadKeys);
  const copyPayloadMatcherRef = useRef(copyPayloadMatcher);
  const { lastCopyRequest } = useRxPadSync();

  useEffect(() => {
    copyPayloadKeysRef.current = copyPayloadKeys;
  }, [copyPayloadKeys]);

  useEffect(() => {
    copyPayloadMatcherRef.current = copyPayloadMatcher;
  }, [copyPayloadMatcher]);

  useEffect(() => {
    return () => {
      if (voiceUpdatedTimerRef.current) {
        window.clearTimeout(voiceUpdatedTimerRef.current);
      }
    };
  }, []);

  const triggerHighlight = useCallback((scroll = true) => {
    setVoiceUpdated(true);
    if (voiceUpdatedTimerRef.current) {
      window.clearTimeout(voiceUpdatedTimerRef.current);
    }
    voiceUpdatedTimerRef.current = window.setTimeout(() => setVoiceUpdated(false), 2400);
    if (scroll && sectionRef.current) {
      scrollModuleCaptureIntoView(sectionRef.current);
    }
  }, []);

  useEffect(() => {
    if (!lastCopyRequest) return;
    if (handledCopyIdRef.current === lastCopyRequest.id) return;
    handledCopyIdRef.current = lastCopyRequest.id;
    if (lastCopyRequest.isBulk) return;
    const payload = lastCopyRequest.payload || {};
    const digitization = payload.digitization || {};
    if (copyPayloadMatcherRef.current?.(payload, lastCopyRequest)) {
      triggerHighlight();
      return;
    }
    if (!copyPayloadKeysRef.current?.length) return;
    const nonEmpty = (v) => Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== "";
    const hasData = copyPayloadKeysRef.current.some(
      (key) => nonEmpty(payload[key]) || nonEmpty(digitization[key])
    );
    if (hasData) triggerHighlight();
  }, [lastCopyRequest, triggerHighlight]);

  const handleVoiceCaptureComplete = useCallback(async (digitisedData) => {
    if (digitisedData?.transcript !== undefined) {
      const transcript = String(digitisedData.transcript || "").trim();
      if (transcript) {
        await Promise.resolve(onTranscriptionApply?.(transcript, digitisedData));
      }
      setVoiceCaptureOpen(false);
      triggerHighlight(false);
      toast.success(transcriptionSuccessMessage || successMessage || "Transcript added from voice dictation");
      return;
    }

    const nextItems = Array.isArray(digitisedData)
      ? digitisedData.map((item) => ({ ...item }))
      : [];
    if (moduleName === "Medical History") {
      console.groupCollapsed("[VoiceRx MedicalHistory] useVoiceRxModuleCapture handleVoiceCaptureComplete");
      console.log("digitisedData from VoiceRxModuleCapture", digitisedData);
      console.log("nextItems passed to onApply", nextItems);
      console.log("has onApply", typeof onApply === "function");
      console.groupEnd();
    }
    if (nextItems.length > 0) {
      await Promise.resolve(onApply?.(nextItems));
    }
    setVoiceCaptureOpen(false);
    triggerHighlight(false);
    toast.success(successMessage || `${moduleName} filled from voice dictation`);
  }, [moduleName, onApply, onTranscriptionApply, successMessage, transcriptionSuccessMessage, triggerHighlight]);

  return {
    voiceCaptureOpen,
    setVoiceCaptureOpen,
    voiceUpdated,
    handleVoiceCaptureComplete,
    sectionRef,
  };
}

export function VoiceRxModuleCapture({
  mode = "digitise",
  moduleName,
  moduleApiName,
  customModuleName,
  requiredFields,
  previousContext,
  dummyDigitisedData = [],
  hideCaptions = false,
  onCancel,
  onComplete,
}) {
  const { patient_data } = useContext(CashManagerContext) || {};
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.doctors);
  const voiceDigitization = useSelector((state) => state.voiceDigitization);
  const [phase, setPhase] = useState("recording");
  const [capturedTranscript, setCapturedTranscript] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const captureRootRef = useRef(null);
  const mountedRef = useRef(true);
  const buttonTimerRef = useRef(null);
  const moduleSessionIdRef = useRef(null);
  const submitInFlightRef = useRef(false);
  const isTranscribeMode = mode === "transcribe";

  const getModuleSessionId = useCallback(() => {
    if (!moduleSessionIdRef.current) {
      moduleSessionIdRef.current = createModuleVoiceId();
    }
    return moduleSessionIdRef.current;
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (buttonTimerRef.current) {
        window.clearTimeout(buttonTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollModuleCaptureIntoView(captureRootRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const getDigitisedData = useCallback(async ({ audioBlob }) => {
    if (isTranscribeMode) {
      return transcribeAnyAudio({ audioBlob });
    }

    return ENABLE_REAL_MODULE_DIGITISE_API
      ? await requestTranscribeAndDigitise({
        audioBlob,
        moduleName,
        moduleApiName,
        customModuleName,
        requiredFields,
        previousContext,
        patientId: patient_data?.patient_unique_id,
        doctorId: profile?.doctor_unique_id,
        sessionId: voiceDigitization?.sessionId || getModuleSessionId(),
      })
      : { rows: dummyDigitisedData, rawResponse: null, conversation: [], moduleApiName: moduleApiName || resolveModuleApiName(moduleName) };
  }, [customModuleName, dummyDigitisedData, getModuleSessionId, isTranscribeMode, moduleApiName, moduleName, patient_data?.patient_unique_id, previousContext, profile?.doctor_unique_id, requiredFields, voiceDigitization?.sessionId]);

  const handleSubmit = useCallback(({ audioBlob, transcript, durationMs, submitClickedAt, submitClickedAtMs, micBeingUsed }) => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    dispatch(beginVoiceAttempt());
    const voicecall = (voiceDigitization?.voiceCallCount || 0) + 1;
    const submitId = `voice-rx-2-module-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const requestId = submitId;
    const clinicalStartedAtMs = Date.now();
    const nextTranscript = isTranscribeMode ? "Transcribing your audio..." : "Refining your captured consultation...";
    setCapturedTranscript(nextTranscript);

    buttonTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) {
        setPhase("structuring");
      }
    }, BUTTON_PROCESSING_MS);

    return getDigitisedData({ audioBlob })
      .then((digitisedResult) => {
        if (!mountedRef.current) {
          return;
        }
        if (buttonTimerRef.current) {
          window.clearTimeout(buttonTimerRef.current);
          buttonTimerRef.current = null;
        }
        if (isTranscribeMode) {
          setCapturedTranscript(digitisedResult?.transcript || nextTranscript);
        }
        const rows = isTranscribeMode ? [] : (Array.isArray(digitisedResult) ? digitisedResult : digitisedResult?.rows || []);
        if (!isTranscribeMode && (digitisedResult?.moduleApiName || moduleApiName || resolveModuleApiName(moduleName)) === "medical_history") {
          console.groupCollapsed("[VoiceRx MedicalHistory] handleSubmit before onComplete");
          console.log("digitisedResult", digitisedResult);
          console.log("rows passed to onComplete", rows);
          console.log("has onComplete", typeof onComplete === "function");
          console.groupEnd();
        }
        const clinicalCompletedAtMs = Date.now();
        return Promise.resolve(onComplete?.(isTranscribeMode ? digitisedResult : rows, {
          audioBlob,
          transcript: isTranscribeMode ? digitisedResult?.transcript || "" : nextTranscript,
          durationMs,
          moduleName,
        })).then(() => uploadAndLogVoiceRx2({
          audioBlob,
          patientData: patient_data,
          profile,
          sessionId: voiceDigitization?.sessionId || getModuleSessionId(),
          submitId,
          requestId,
          submitClickedAt,
          submitClickedAtMs,
          durationMs,
          clinicalStatus: "completed",
          mode: "module",
          voicecall,
          moduleName,
          sourceSurface: "module",
          isDoctorAgent: false,
          micBeingUsed,
          voiceLogCreated: voiceDigitization?.voiceLogCreated,
          markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
          clinicalCompletedAtMs,
        }).then(({ source }) => {
          dispatch(addVoiceHistoryEntry(buildVoiceHistoryEntry({
            type: !isTranscribeMode && hasModulePreviousContext(previousContext) ? "AUDIO_WITH_CONTEXT" : "AUDIO_NO_CONTEXT",
            source,
            durationMs,
            timeRequiredInMs: clinicalCompletedAtMs - clinicalStartedAtMs,
            conversation: isTranscribeMode ? digitisedResult?.transcript || "" : digitisedResult?.conversation || nextTranscript,
            digitize: rows,
            isDoctorAgent: false,
            moduleName,
          })));
        }));
      })
      .catch((error) => {
        if (!mountedRef.current) return;
        if (buttonTimerRef.current) {
          window.clearTimeout(buttonTimerRef.current);
          buttonTimerRef.current = null;
        }
        console.error("Module voice digitise failed", error);
        uploadAndLogVoiceRx2({
          audioBlob,
          patientData: patient_data,
          profile,
          sessionId: voiceDigitization?.sessionId || getModuleSessionId(),
          submitId,
          requestId,
          submitClickedAt,
          submitClickedAtMs,
          durationMs,
          clinicalStatus: "failed",
          failedPhase: isTranscribeMode ? "agents-transcribe-any-audio" : "agents-module",
          errorMessage: error?.message || (isTranscribeMode ? "Module voice transcription failed" : "Module voice digitisation failed"),
          mode: "module",
          voicecall,
          moduleName,
          sourceSurface: "module",
          isDoctorAgent: false,
          micBeingUsed,
          voiceLogCreated: voiceDigitization?.voiceLogCreated,
          markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
          clinicalCompletedAtMs: Date.now(),
        });
        toast.error(error.message || (isTranscribeMode ? "Module voice transcription failed" : "Module voice digitisation failed"));
        onCancel?.();
      })
      .finally(() => {
        submitInFlightRef.current = false;
      });
  }, [dispatch, getDigitisedData, getModuleSessionId, isTranscribeMode, moduleApiName, moduleName, onCancel, onComplete, patient_data, previousContext, profile, voiceDigitization?.sessionId, voiceDigitization?.voiceCallCount, voiceDigitization?.voiceLogCreated]);

  const hasTranscript = hasTranscriptContent(capturedTranscript);
  const isDiarized = hasDiarizedTranscript(capturedTranscript);

  return (
    <div ref={captureRootRef} className={styles.captureRoot}>
      {phase === "structuring" ? (
        <div className={styles.processingShell}>
          <div className={styles.processingCard}>
            <ShineBorder
              variant="rotate"
              borderWidth={1.5}
              duration={2.2}
              shineColor={["#D565EA", "#673AAC", "#1A1994"]}
              baseColor="rgba(226,226,234,0.95)" />
            <div className={styles.processingTranscript}>
              {hasTranscript ? (
                isDiarized ? (
                  <ConversationTranscript raw={capturedTranscript} shimmer />
                ) : (
                  <DictationTranscript raw={capturedTranscript} animate />
                )
              ) : (
                <p className={styles.processingPlaceholder}>Refining your captured consultation...</p>
              )}
            </div>
          </div>
          <CaptionCarousel />
          <span className={styles.progressTrack} aria-hidden>
            <span className={styles.progressBar} />
          </span>
        </div>
      ) : (
        <div className={styles.recorderShell} data-dr-agent="true">
          <VoiceRecorderCore
            layout="overlay"
            variant="row"
            sectionLabel={moduleName}
            showSectionInStatus
            radiusClassName=""
            hideCaptions={hideCaptions}
            audioChunkContext={{
              sessionId: voiceDigitization?.sessionId || getModuleSessionId(),
              doctorId: profile?.doctor_unique_id,
              patientId: patient_data?.patient_unique_id,
            }}
            onCancel={onCancel}
            onCancelRequest={() => setConfirmOpen(true)}
            onSubmit={handleSubmit} />
        </div>
      )}

      {confirmOpen ? (
        <div className={styles.confirmLayer} data-dr-agent="true">
          <TPConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Close this voice consultation?"
            warning="Are you sure you want to close this voice Rx? If you close it, no data will be stored."
            primaryLabel="Keep recording"
            onPrimary={() => setConfirmOpen(false)}
            secondaryLabel="Close and discard"
            secondaryTone="destructive"
            onSecondary={() => {
              setConfirmOpen(false);
              onCancel?.();
            }} />
        </div>
      ) : null}
    </div>
  );
}
