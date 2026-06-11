import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import GenRXLoaders from "./GenRxLoaders";
import { AutoComplete, Button } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { searchMedication } from "../redux/medicationSlice";
import { searchInvestigation } from "../redux/investigationSlice";
import CustomMedicinePopup from "./CustomMedicinePopup";
import CustomModuleRichTextEditor from "./CustomModuleRichTextEditor";
import CommonModal from "../common/CommonModal";
import VitalsRichTextEditor from "./VitalsRichTextEditor";
import SymptomsRichTextEditor from "./SymptomsRichTextEditor";
import SurgeriesRichTextEditor from "./SurgeriesRichTextEditor";
import MedicalHistoryRichTextEditor from "./MedicalHistoryRichTextEditor";
import ExaminationRichTextEditor from "./ExaminationRichTextEditor";
import DiagnosisRichTextEditor from "./DiagnosisRichTextEditor";
import AdviceRichTextEditor from "./AdviceRichTextEditor";
import VaccinationsRichTextEditor from "./VaccinationsRichTextEditor";
import LabResultsRichTextEditor from "./LabResultsRichTextEditor";
import FollowUpRichTextEditor from "./FollowUpRichTextEditor";
import GynecHistoryRichTextEditor from "./GynecHistoryRichTextEditor";
import AdditionalNotesRichTextEditor from "./AdditionalNotesRichTextEditor";
import ApiMedication from "../api/services/ApiMedication";
import ApiInvestigation from "../api/services/ApiInvestigation";
import { useGrounding } from "../hooks/useGrounding";
import { getTokenData, getHmTypeIndicator, camelCaseToTitle, camelToSentence } from "../utils/utils";
import { getNormalizedGynecHistory } from "../utils/gynecHistoryUtils";
import { env } from "../EnvironmentConfig";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_APOLLO_DISABLE_FEATURE, GB_ZYDUS_USER, GB_MED_INVESTIGATION } from "../utils/constants";
import MedicationsTable from "./MedicationsTable";
import LabInvestigationTable from "./LabInvestigationTable";
import config from "../config";
import styles from "./ConsultationDrawer.module.css";
import {
  ensureLabInvestigationMetadataForRxSave,
  ensureMedicationGroundedForRxSave,
} from "../utils/medicationRxPayload";
import { setDentalData } from "../redux/dentalRxSlice";
import { ASSETS } from "../assets";
const {
  alerticon: alertIcon,
  documentNormal: documentIcon,
  danger: warningIcon,
} = ASSETS.images;

export const ARRAY_SECTIONS = [
  "symptoms",
  "surgeries",
  "medicalHistory",
  "examinations",
  "diagnosis",
  "medications",
  "labInvestigation",
  "vaccinations",
  "advice",
  "followUp",
  "dynamicFields",
  "others",
  "labResults"
];

export const normalizeNewItem = (type, text = "") => {
  const t = (text ?? "").trim();

  if (type === "advice") return t;

  if (type === "medications") {
    return {
      name: t,
      groundedMedicineName: t,
      refinedName: t,
      frequency: "",
      dosage: "",
      schedule: "",
      duration: "",
      notes: "",
      lineItem: "",
      suggestions: [],
    };
  }

  if (type === "labInvestigation") {
    return {
      name: t,
      instruction: "",
      notes: "",
      lineItem: "",
    };
  }

  if (type === "examinations") {
    return { name: t, notes: "", lineItem: t };
  }
  if (type === "diagnosis") {
    return { name: t, since: "", status: "", notes: "", lineItem: t };
  }

  if (type === "dynamicFields") {
    return { title: t, notes: "" };
  }

  if (type === "others") {
    return t;
  }

  if (type === "labResults") {
    return { testname: t, value: "", notes: "" };
  }

  if (type === "surgeries") {
    return { name: t, notes: "" };
  }

  return { name: t, lineItem: "" };
};

/** Medication string used for fuzzy search / display priority (grounded first, then legacy typo key, then OCR name). */
const getMedicationNameForFuzzy = (m) =>
  String(m?.groundedMedicineName ?? m?.groundingMedicineName ?? m?.name ?? "").trim();

/** Lab investigation string used for fuzzy search (corrected name first, then spoken/OCR name). */
const getLabInvestigationNameForFuzzy = (item) =>
  String(item?.name ?? item?.metadata?.fuzzyCorrectedName ?? "").trim();

const getPrimaryText = (type, item) => {
  if (type === "advice") return typeof item === "string" ? item : "";
  if (type === "medications") return (item?.groundedMedicineName || "").trim() || (item?.name || "").trim() || "";
  if (type === "labInvestigation") return item?.name || "";
  if (type === "dynamicFields") return item?.title || "";
  if (type === "others") return typeof item === "string" ? item : "";
  if (type === "labResults") return item?.testname || "";
  if (type === "diagnosis") return String(item?.lineItem ?? item?.name ?? (item?.status ? `${item?.name ?? ""}, ${item.status}`.trim() : "") ?? item?.notes ?? "").trim();
  if (type === "examinations") return String(item?.lineItem ?? item?.name ?? item?.findings ?? item?.notes ?? "").trim();
  if (type === "surgeries") return String(item?.name ?? "").trim() || "";
  return item?.name || "";
};

const getMedicationNameToUse = (med) => getMedicationNameForFuzzy(med);

const getMedicationNamesSignature = (meds = []) =>
  meds.map((m) => getMedicationNameToUse(m)).join("|");

const getLabInvestigationNamesSignature = (labs = []) =>
  labs.map((item) => getLabInvestigationNameForFuzzy(item)).join("|");

const getDentalMedicationArray = (rootMedications, dentalMedications) => {
  if (Array.isArray(rootMedications)) return rootMedications;
  if (Array.isArray(dentalMedications)) return dentalMedications;
  return [];
};

/** Normalize dynamicFields to always be an object { moduleName: row[] }. Backend may send array of modules. Skips empty modules and empty rows. */
const getDynamicFieldsAsObject = (dynamicFields) => {
  if (!dynamicFields || typeof dynamicFields !== "object") return {};
  if (!Array.isArray(dynamicFields)) return dynamicFields;
  return dynamicFields.reduce((acc, module) => {
    const name = module?.name || module?.module_name || "";
    if (!name) return acc;
    const rawRows = module?.fields || module?.fieldValues || [];
    const rows = Array.isArray(rawRows)
      ? rawRows
          .map((f) => {
            if (typeof f === "string") return { lineItem: (f || "").trim() };
            if (f && typeof f === "object" && (f.lineItem || f.title)) return { lineItem: (f.lineItem || f.title || "").trim(), ...f };
            if (f && typeof f === "object") {
              const parts = Object.entries(f)
                .filter(([k]) => k !== "order")
                .filter(([, v]) => v != null && String(v).trim() !== "")
                .map(([k, v]) => `${k}: ${v}`);
              return { lineItem: parts.join(", ") };
            }
            return { lineItem: "" };
          })
          .filter((row) => (row?.lineItem || "").trim() !== "")
      : [];
    if (rows.length > 0) acc[name] = rows;
    return acc;
  }, {});
};

const DigitisedPrescription = ({
  data,
  setData,
  loading,
  showAbsHeaderInsideLoader = false,
  showRxPadHeader = false,
  showHeader = false,
  showInstructionMessage = false,
  onCloseInstructionMessage,
  showDisclaimer = false,
  localModules = [],
  setLocalModules,
  onRxEdited,
  isProcessing = false,
  patient_data,
  vitalsFlow,
  skipAutoLabResultsLogic = false,
  digitiseSplitLayout = false,
}) => {
  const showHeaderArea = showRxPadHeader || showHeader;
  const rightSectionClass = [
    styles.rightSection,
    digitiseSplitLayout && styles.rightSectionSplit,
  ]
    .filter(Boolean)
    .join(" ");
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [editableText, setEditableText] = useState("");
  const [editableLineItem, setEditableLineItem] = useState("");
  const [editableKey, setEditableKey] = useState("");
  const [editableValue, setEditableValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ioAutoFocusEnabled, setIoAutoFocusEnabled] = useState(true);
  const [searchParentQuery, setSearchParentQuery] = useState("");
  const [parentSearchOptions, setParentSearchOptions] = useState([]);
  const [searchTestQuery, setSearchTestQuery] = useState("");
  const [testSearchOptions, setTestSearchOptions] = useState([]);
  const [showAddMedicinePopup, setShowAddMedicinePopup] = useState(false);
  const [editingModule, setEditingModule] = useState("");
  const [updatedModuleName, setUpdatedModuleName] = useState("");
  const [moduleToDelete, setModuleToDelete] = useState(null);
  const [isDeleteModuleModalOpen, setIsDeleteModuleModalOpen] = useState(false);
  const editingRef = useRef(false);
  const suggestionRef = useRef(null);
  const inputRef = useRef(null);
  const dispatch = useDispatch();
  const { parentOptionsList } = useSelector((state) => state.medication);
  const { parentOptionsList: testOptionsList } = useSelector(
    (state) => state.investigation
  );
  const dentalDataFromStore = useSelector((state) => state.dentalRx?.dentalData);
  // Fuzzy search run-once guards for meds and tests
  const hasFuzzyRunMedsRef = useRef(false);
  const lastFuzzyNamesRef = useRef("");
  const lastFuzzyCallRef = useRef({ sig: "", ts: 0 });
  const lastFuzzyLabsRef = useRef("");
  const lastFuzzyLabsCallRef = useRef({ sig: "", ts: 0 });
  const tokenData = getTokenData();
  const toothInputRefs = useRef({});
  const pendingToothFocusRef = useRef(null);
  const dentalComplaintRows = useMemo(
    () => [
      { key: "chiefComplaint", label: "CHIEF COMPLAINT" },
      {
        key: "symptom",
        label: "HTN/DM/ASTHMA/CARDIAC STATUS/BLOOD DISORDER",
      },
      { key: "otherDiseases", label: "OTHER DISEASES" },
      // { key: "medications", label: "MEDICATION" },
      { key: "drugAllergy", label: "H/O DRUG ALLERGY" },
      { key: "pregnancy", label: "PREGNANCY" },
      { key: "habits", label: "HABITS (Tobacco/Smoking/Grinding Teeth)" },
      { key: "dentalHistory", label: "DENTAL HISTORY" },
      { key: "pain", label: "HEAD/JAW/NECK PAIN" },
      { key: "notes", label: "NOTES" },
    ],
    []
  );
  const dentalQuadrantSections = useMemo(
    () => [
      { key: "UPPER_RIGHT", label: "UPPER RIGHT" },
      { key: "UPPER_LEFT", label: "UPPER LEFT" },
      { key: "LOWER_RIGHT", label: "LOWER RIGHT" },
      { key: "LOWER_LEFT", label: "LOWER LEFT" },
    ],
    []
  );
  const dentalDataSource = useMemo(() => {
    return (
      data?.dentalData ??
      dentalDataFromStore ??
      data?.results ??
      data?.data?.results ??
      null
    );
  }, [data, dentalDataFromStore]);
  const dentalComplaints = useMemo(() => {
    return data?.complaints ?? dentalDataSource?.complaints ?? {};
  }, [data, dentalDataSource]);
  const dentalTreatmentPlans = useMemo(() => {
    return data?.treatmentPlans ?? dentalDataSource?.treatmentPlans ?? { items: [] };
  }, [data, dentalDataSource]);
  const dentalWorkDone = useMemo(() => {
    return data?.workDone ?? dentalDataSource?.workDone ?? { items: [], notes: "" };
  }, [data, dentalDataSource]);
  const dentalMedications = useMemo(() => {
    return dentalDataSource?.medications;
  }, [dentalDataSource]);
  const hasDentalMedications = useMemo(() => {
    if (!Array.isArray(dentalMedications) || dentalMedications.length === 0) return false;
    return dentalMedications.some((item) => {
      if (item == null) return false;
      if (typeof item === "string") return String(item).trim() !== "";
      return [
        "groundedMedicineName",
        "name",
        "refinedName",
        "frequency",
        "dosage",
        "schedule",
        "duration",
        "notes",
      ].some((field) => item?.[field] != null && String(item[field]).trim() !== "");
    });
  }, [dentalMedications]);
  const dentalWorkDoneItems = useMemo(() => {
    return Array.isArray(dentalWorkDone?.items) ? dentalWorkDone.items : [];
  }, [dentalWorkDone]);
  const dentalDiagnosis = useMemo(() => {
    return dentalDataSource?.diagnosis || {};
  }, [dentalDataSource]);
  const dentalToothDiagramNotes = useMemo(() => {
    const notes = dentalDiagnosis?.toothDiagramNotes;
    if (Array.isArray(notes)) {
      return notes
        .filter((note) => note != null && String(note).trim() !== "")
        .map((note) => String(note))
        .join("\n");
    }
    if (notes == null) return "";
    return String(notes);
  }, [dentalDiagnosis]);
  const hasToothDiagramNotes = useMemo(() => {
    return String(dentalToothDiagramNotes || "").trim() !== "";
  }, [dentalToothDiagramNotes]);
  const dentalDiagnosisFields = useMemo(() => {
    const order = [
      "stains",
      "calculus",
      "oralHygieneStatus",
      "periodontalseverity",
      "orthodonticFindings",
      "orthodonticInterventionRequired",
      "habitsPedo",
    ];

    return order
      .filter((key) => key in (dentalDiagnosis || {}))
      .map((key) => ({
        key,
        label: camelCaseToTitle(key),
      }));
  }, [dentalDiagnosis]);
  const formatDentalDiagnosisValue = useCallback((val) => {
    if (Array.isArray(val)) {
      return val.filter((v) => v != null && String(v).trim() !== "").join(", ");
    }
    if (val && typeof val === "object") {
      return Object.entries(val)
        .filter(([, v]) => !!v)
        .map(([k]) => camelToSentence(k))
        .join(", ");
    }
    if (val == null) return "";
    return String(val);
  }, []);
  const dentalDiagnosisRows = useMemo(() => {
    return dentalDiagnosisFields
      .map((field) => {
        const value = formatDentalDiagnosisValue(dentalDiagnosis?.[field.key]);
        return { ...field, value };
      })
      .filter((row) => String(row.value || "").trim() !== "");
  }, [dentalDiagnosisFields, dentalDiagnosis, formatDentalDiagnosisValue]);

  const updateDentalDiagnosisField = useCallback(
    (fieldKey, rawValue) => {
      let nextDentalData = null;
      const nextValue = String(rawValue ?? "");
      setData((prev) => {
        const prevDentalData =
          prev?.dentalData ??
          prev?.results ??
          prev?.data?.results ??
          dentalDataFromStore ??
          {};
        const diagnosis = { ...(prevDentalData?.diagnosis || {}) };
        // Once user edits, store only the raw string they typed.
        diagnosis[fieldKey] = nextValue;
        const nextComplaints = prev?.complaints ?? prevDentalData?.complaints ?? {};
        const nextTreatmentPlans =
          prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
        const nextMedications = getDentalMedicationArray(
          prev?.medications,
          prevDentalData?.medications
        );
        nextDentalData = {
          ...prevDentalData,
          diagnosis,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
        };
        return {
          ...prev,
          dental: true,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
          dentalData: nextDentalData,
        };
      });
      if (nextDentalData) dispatch(setDentalData(nextDentalData));
      if (typeof onRxEdited === "function") onRxEdited(true);
    },
    [dispatch, dentalDataFromStore, onRxEdited, setData]
  );
  const updateDentalToothDiagramNotes = useCallback(
    (rawValue) => {
      let nextDentalData = null;
      const nextValue = String(rawValue ?? "");
      setData((prev) => {
        const prevDentalData =
          prev?.dentalData ??
          prev?.results ??
          prev?.data?.results ??
          dentalDataFromStore ??
          {};
        const diagnosis = { ...(prevDentalData?.diagnosis || {}) };
        diagnosis.toothDiagramNotes = nextValue;
        const nextComplaints = prev?.complaints ?? prevDentalData?.complaints ?? {};
        const nextTreatmentPlans =
          prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
        const nextMedications = getDentalMedicationArray(
          prev?.medications,
          prevDentalData?.medications
        );
        nextDentalData = {
          ...prevDentalData,
          diagnosis,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
        };
        return {
          ...prev,
          dental: true,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
          dentalData: nextDentalData,
        };
      });
      if (nextDentalData) dispatch(setDentalData(nextDentalData));
      if (typeof onRxEdited === "function") onRxEdited(true);
    },
    [dispatch, dentalDataFromStore, onRxEdited, setData]
  );
  const dentalTeeth = useMemo(() => {
    const teeth = dentalDataSource?.diagnosis?.teeth;
    return Array.isArray(teeth) ? teeth : [];
  }, [dentalDataSource]);
  const dentalTeethBySection = useMemo(() => {
    const buckets = {
      UPPER_LEFT: [],
      UPPER_RIGHT: [],
      LOWER_LEFT: [],
      LOWER_RIGHT: [],
    };
    dentalTeeth.forEach((tooth, idx) => {
      const section = tooth?.toothSection;
      if (section && buckets[section]) {
        buckets[section].push({ ...tooth, _index: idx });
      }
    });
    return buckets;
  }, [dentalTeeth]);
  const hasDentalSection = useMemo(() => {
    const hasComplaints = Object.values(dentalComplaints || {}).some(
      (val) => val != null && String(val).trim() !== ""
    );
    const hasPlans = Array.isArray(dentalTreatmentPlans?.items) && dentalTreatmentPlans.items.length > 0;
    const hasTeeth = Array.isArray(dentalTeeth) && dentalTeeth.length > 0;
    const hasWorkDone =
      (Array.isArray(dentalWorkDoneItems) && dentalWorkDoneItems.length > 0) ||
      (dentalWorkDone?.notes != null && String(dentalWorkDone?.notes).trim() !== "");
    const hasDentalMedicationContext =
      data?.dental === true ||
      !!dentalDataSource ||
      !!data?.complaints ||
      !!data?.treatmentPlans ||
      !!data?.workDone;
    return (
      data?.dental === true ||
      !!dentalDataSource ||
      hasComplaints ||
      hasPlans ||
      hasTeeth ||
      hasToothDiagramNotes ||
      hasWorkDone ||
      (hasDentalMedicationContext && hasDentalMedications)
    );
  }, [
    data,
    dentalDataSource,
    dentalComplaints,
    dentalTreatmentPlans,
    dentalTeeth,
    hasToothDiagramNotes,
    dentalWorkDoneItems,
    dentalWorkDone,
    hasDentalMedications,
  ]);

  useEffect(() => {
    if (dentalDataSource && !dentalDataFromStore) {
      dispatch(setDentalData(dentalDataSource));
    }
  }, [dentalDataSource, dentalDataFromStore, dispatch]);

  useEffect(() => {
    if (!setData) return;
    if (dentalDataFromStore && !data?.dentalData) {
      const complaints = dentalDataFromStore?.complaints ?? {};
      const treatmentPlans = dentalDataFromStore?.treatmentPlans ?? { items: [] };
      setData((prev) => {
        const medications = getDentalMedicationArray(
          prev?.medications,
          dentalDataFromStore?.medications
        );
        return {
          ...prev,
          dental: true,
          dentalData: dentalDataFromStore,
          complaints,
          treatmentPlans,
          medications,
        };
      });
    }
  }, [dentalDataFromStore, data?.dentalData, setData]);

  useEffect(() => {
    const pending = pendingToothFocusRef.current;
    if (!pending) return;
    const key = `${pending.index}-${pending.field}`;
    const el = toothInputRefs.current[key];
    if (el) {
      el.focus();
      pendingToothFocusRef.current = null;
    }
  }, [dentalTeeth]);

  const labResultsUpdater = useMemo(
    () => (arr) => {
      if (!setData) return;
      setData((prev) => {
        const next = arr || [];
        const labResults = (Array.isArray(next) && next.length > 0)
          ? next
          : (Array.isArray(prev?.labResults) && prev.labResults.length > 0 ? prev.labResults : []);
        return { ...prev, labResults };
      });
      if (typeof onRxEdited === "function") onRxEdited(true);
    },
    [setData, onRxEdited]
  );
  const isApolloHosBusinessIdAccessableFromGB = useFeatureIsOn(
    GB_APOLLO_DISABLE_FEATURE
  );
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const isMedInvestigationOn = useFeatureIsOn(GB_MED_INVESTIGATION);
  const { hospital_business_id } = tokenData || {};
  const isApollo = config.APOLLO_BUSINESS_IDS.includes(hospital_business_id);
  const isGroundingAccessable = useGrounding();

  const handleLineItemBlur = useCallback(
    (type, index) => {
      const itemType = type?.split("-")?.[0];
      const lineItemValue = String(editableLineItem ?? "").trim();
      setData((prevData) => {
        const updatedData = { ...prevData };
        const arr = [...(updatedData[itemType] || [])];
        const item = arr[index];
        if (itemType === "diagnosis") {
          const notes = lineItemValue;
          const name = String(item?.name ?? "").trim();
          const since = String(item?.since ?? "").trim();
          const status = String(item?.status ?? "").trim();
          const lineItem = [name, status, notes].filter(Boolean).join(", ") || name;
          arr[index] = { name: name || "", since, status, notes, lineItem };
        } else if (itemType === "examinations") {
          const notes = lineItemValue;
          const name = String(item?.name ?? "").trim();
          const lineItem = notes ? `${name}, ${notes}` : name || "";
          arr[index] = { name: name || "", notes, lineItem };
        } else if (itemType === "dynamicFields") {
          arr[index] = { ...item, notes: lineItemValue };
        } else {
          arr[index] = { ...item, lineItem: lineItemValue };
        }
        updatedData[itemType] = arr;
        return updatedData;
      });
      setEditableLineItem("");
      setActiveIndex(null);
      setActiveType(null);
    },
    [editableLineItem, setData]
  );

  const containerRef = useRef(null);
  const sectionRefs = useRef({});
  const [visibleSection, setVisibleSection] = useState(null);

  // Support both old and new structure (vitals/vitalsAndBodyComposition, examination/examinations, medicine/medications, tests/labInvestigation)
  const sectionData = useMemo(() => {
    const vitals = data?.vitalsAndBodyComposition || data?.vitals;
    const examinationsRaw = data?.examinations || data?.examination;
    const medications = data?.medications || data?.medicine;
    const labInvestigationRaw = data?.labInvestigation || data?.tests;
    const labInvestigation = !Array.isArray(labInvestigationRaw)
      ? []
      : labInvestigationRaw.map((item) => {
          if (item == null) return { name: "", instruction: "", notes: "", lineItem: "" };
          if (typeof item === "string") {
            const t = String(item).trim();
            return { name: t, instruction: "", notes: "", lineItem: "" };
          }
          const name = String(item?.name ?? "").trim();
          const instruction = String(item?.instruction ?? "").trim();
          const rawNotes = String(item?.notes ?? item?.note ?? "").trim();
          const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const namePrefixRegex = name ? new RegExp(`^${escapedName}\\s*[,:-]?\\s*`, "i") : null;
          const notes = !instruction && namePrefixRegex ? (rawNotes.replace(namePrefixRegex, "").trim() || rawNotes) : rawNotes;
          return { ...item, name, instruction, notes, lineItem: "" };
        });
    const examinations = !Array.isArray(examinationsRaw)
      ? []
      : examinationsRaw.map((item) => {
          if (item == null) return { name: "", notes: "", lineItem: "" };
          if (typeof item === "string") {
            const t = String(item).trim();
            return { name: t, notes: "", lineItem: t };
          }
          const name = String(item.name ?? item.findings ?? item.lineItem ?? "").trim();
          const notes = String(item.notes ?? "").trim();
          const lineItem = String(item.lineItem ?? "").trim() || (notes ? `${name}, ${notes}` : name) || name;
          return { name, notes, lineItem };
        });
    const diagnosisRaw = data?.diagnosis;
    const diagnosis = !Array.isArray(diagnosisRaw)
      ? []
      : diagnosisRaw.map((item) => {
          if (item == null) return { name: "", since: "", status: "", notes: "", lineItem: "" };
          if (typeof item === "string") {
            const t = String(item).trim();
            return { name: t, since: "", status: "", notes: "", lineItem: t };
          }
          const name = String(item.name ?? item.lineItem ?? "").trim();
          const since = String(item.since ?? "").trim();
          const status = String(item.status ?? "").trim();
          const notes = String(item.notes ?? item.note ?? "").trim();
          const lineItem = String(item.lineItem ?? "").trim() || [name, status, notes].filter(Boolean).join(", ") || name;
          return { name, since, status, notes, lineItem };
        });
    return {
      vitalsAndBodyComposition: vitals,
      examinations,
      medications,
      labInvestigation,
      symptoms: data?.symptoms,
      surgeries: data?.surgeries,
      medicalHistory: data?.medicalHistory,
      diagnosis,
      vaccinations: data?.vaccinations,
      advice: data?.advice,
      followUp: data?.followUp,
      dynamicFields: data?.dynamicFields,
      others: data?.others,
      labResults: data?.labResults ?? data?.lab_results ?? [],
      gynecHistory: getNormalizedGynecHistory(data ?? {}),
    };
  }, [data]);

  const renderedSections = useMemo(() => {
    const order = [];
    const vitalsObj = sectionData.vitalsAndBodyComposition;
    if (vitalsObj && typeof vitalsObj === "object" && Object.values(vitalsObj || {}).some((v) => v != null && String(v).trim?.()?.length)) {
      order.push("vitalsAndBodyComposition");
    }
    ARRAY_SECTIONS.forEach((s) => {
      const arr = s === "examinations" ? sectionData.examinations : s === "medications" ? sectionData.medications : s === "labInvestigation" ? sectionData.labInvestigation : sectionData[s];
      if (Array.isArray(arr) && arr.length > 0) {
        order.push(s);
      }
    });
    return order;
  }, [sectionData]);

  useEffect(() => {
    if (!containerRef.current) return;
    const root = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (editingRef.current) return;
        const firstVisible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0];
        if (firstVisible) {
          const sec = firstVisible.target.dataset.section;
          setVisibleSection(sec);
        }
      },
      {
        root,
        threshold: 0.2,
      }
    );

    renderedSections.forEach((sec) => {
      const el = sectionRefs.current[sec];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [renderedSections]);

  useEffect(() => {
    if (activeType !== null) return;
    if (!visibleSection) return;
    if (!ARRAY_SECTIONS.includes(visibleSection)) return;
    if (!ioAutoFocusEnabled) return;
    const arr = visibleSection === "examinations" ? sectionData.examinations : visibleSection === "medications" ? sectionData.medications : visibleSection === "labInvestigation" ? sectionData.labInvestigation : data?.[visibleSection];
    if (!Array.isArray(arr) || arr.length === 0) return;
    const lastIndex = arr.length - 1;
    const lastItem = arr[lastIndex];
    const text = getPrimaryText(visibleSection, lastItem);

    setActiveType(visibleSection);
    setActiveIndex(lastIndex);
    setEditableText(text);
    setTimeout(() => {
      const el = sectionRefs.current[visibleSection]?.querySelector("input");
      el?.focus?.();
    }, 0);
    setIoAutoFocusEnabled(false);
  }, [visibleSection, data, activeType, ioAutoFocusEnabled]);

  const handleInputBlur = useCallback(
    (type, index) => {
      if (activeIndex === null || activeType === null) return;
      const val = String(editableText ?? "").trim();

      setData((prevData) => {
        const updatedData = { ...prevData };

        if (type === "vitalsAndBodyComposition-key") {
          const newKey = String(editableKey ?? "")
            .trim()
            .replace(/\s+/g, "")
            .replace(/^(.)/, (c) => c.toLowerCase());
          if (newKey && newKey !== index) {
            const v = { ...(updatedData.vitalsAndBodyComposition || {}) };
            const value = v[index];
            delete v[index];
            v[newKey] = value;
            updatedData.vitalsAndBodyComposition = v;
          }
          return updatedData;
        }

        if (type === "vitalsAndBodyComposition") {
          const val = String(editableText ?? "").trim();
          const v = { ...(updatedData.vitalsAndBodyComposition || {}) };
          if (val) v[index] = val;
          updatedData.vitalsAndBodyComposition = v;
          return updatedData;
        }
        if (type === "labResults") {
          const val = String(editableText ?? "").trim();
          const arr = [...(updatedData.labResults || [])];
          if (val) {
            arr[index] = { ...arr[index], testname: val };
          }
          updatedData.labResults = arr;
          return updatedData;
        }
        if (type === "followUp") {
          updatedData.followUp = String(editableText ?? "").trim();
          return updatedData;
        } else if (ARRAY_SECTIONS.includes(type)) {
          let arr = [...(updatedData[type] || [])];
          const item = arr[index];

          const val = String(editableText ?? "").trim();
          if (type === "advice" || type === "others") {
            arr[index] = String(editableText ?? "").trim();
          } else if (type === "medications" || type === "labInvestigation") {
            if (val) {
              if (type === "medications") {
                arr[index] = {
                  ...item,
                  groundedMedicineName: val,
                  refinedName: val,
                };
              } else {
                arr[index] = {
                  ...item,
                  name: item?.name || val,
                };
              }
            } else {
              arr[index] = item;
            }
          } else if (type === "dynamicFields") {
            if (val) {
              arr[index] = { ...item, title: val };
            } else {
              arr[index] = item;
            }
          } else if (type === "labResults") {
            if (val) {
              arr[index] = { ...item, testname: val };
            } else {
              arr[index] = item;
            }
          } else if (type === "diagnosis") {
            const nameToSave = (val !== "" ? val : String(item?.name ?? "").trim()) || String(item?.notes ?? "").trim();
            const since = String(item?.since ?? "").trim();
            const status = String(item?.status ?? "").trim();
            const notes = String(item?.notes ?? "").trim();
            const lineItem = [nameToSave, status, notes].filter(Boolean).join(", ") || nameToSave;
            arr[index] = { name: nameToSave || "", since, status, notes, lineItem };
          } else if (type === "examinations") {
            const nameToSave = (val !== "" ? val : String(item?.name ?? "").trim()) || String(item?.notes ?? "").trim();
            const notes = String(item?.notes ?? "").trim();
            const lineItem = notes ? `${nameToSave}, ${notes}` : nameToSave || "";
            arr[index] = { name: nameToSave || "", notes, lineItem };
          } else {
            if (val) {
              arr[index] = { ...item, name: val };
            } else {
              arr[index] = item;
            }
          }
          if (type === "advice" || type === "others") {
            arr = arr.filter((v) => typeof v === "string" && String(v).trim() !== "");
          } else if (type === "medications" || type === "labInvestigation") {
            arr = arr.filter(
              (v) =>
                v &&
                ((typeof v === "object" &&
                  (String(v.name ?? "").trim() !== "" ||
                    String(v.groundedMedicineName ?? "").trim() !== "" ||
                    String(v.refinedName ?? "").trim() !== "")) ||
                  (typeof v === "string" && String(v).trim() !== ""))
            );
          } else if (type === "dynamicFields") {
            arr = arr.filter(
              (v) =>
                v &&
                typeof v === "object" &&
                String(v.title ?? "").trim() !== ""
            );
          } else if (type === "labResults") {
            arr = arr.filter(
              (v) =>
                v &&
                typeof v === "object" &&
                String(v.testname ?? "").trim() !== ""
            );
          } else if (type === "diagnosis") {
            arr = arr.filter(
              (v) =>
                v &&
                typeof v === "object" &&
                (String(v.name ?? "").trim() !== "" ||
                  String(v.notes ?? "").trim() !== "" ||
                  String(v.status ?? "").trim() !== "" ||
                  String(v.lineItem ?? "").trim() !== "")
            );
          } else if (type === "examinations") {
            arr = arr.filter(
              (v) =>
                v &&
                typeof v === "object" &&
                (String(v.name ?? "").trim() !== "" ||
                  String(v.findings ?? "").trim() !== "" ||
                  String(v.notes ?? "").trim() !== "" ||
                  String(v.lineItem ?? "").trim() !== "")
            );
          } else {
            arr = arr.filter(
              (v) => v && typeof v === "object" && String(v.name ?? "").trim() !== ""
            );
          }
          updatedData[type] = arr;
        }

        return updatedData;
      });

      setActiveIndex(null);
      setActiveType(null);
      setEditableText("");
      setEditableKey("");
    },
    [activeIndex, activeType, editableText, editableKey, setData]
  );

  // Debounced search for medication name (mirror ConsultationDrawer)
  useEffect(() => {
    if (activeType !== "medications") return;
    if (!editableText) return;
    const timeoutId = setTimeout(() => {
      dispatch(searchMedication({ searchQuery: editableText, type: "parent" }));
    }, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableText, activeType]);

  // Debounced search for lab investigation name
  useEffect(() => {
    if (activeType !== "labInvestigation") return;
    if (!editableText) return;
    const timeoutId = setTimeout(() => {
      dispatch(
        searchInvestigation({ searchQuery: editableText, type: "parent" })
      );
    }, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableText, activeType]);

  // Build options from store list for medications
  useEffect(() => {
    if (activeType !== "medications") return;
    const list = parentOptionsList || [];
    const opts = list.map((e) => ({
      key: JSON.stringify({ ...e, unique_id: uuidv4() }),
      value: e.tmm_medicine_name,
      label: (
        <div>
          <span className="fw-medium">{e.tmm_medicine_name}</span>,
          <span className="ms-1">{e.tmm_generic}</span>
          {(e?.tmm_hm_type == 1 || e?.tmm_hm_type == 2) && e?.um_id === 0 && (
            <span
              className="align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-circle text-white ms-2"
              style={{ width: 18, height: 18, background: "#c44ea2" }}
            >
              {getHmTypeIndicator(e)}
            </span>
          )}
        </div>
      ),
    }));

    if (searchParentQuery?.length > 0) {
      opts.push({
        key: JSON.stringify({
          unique_id: uuidv4(),
          tmm_id: 0,
          tmm_medicine_name: searchParentQuery,
        }),
        value: searchParentQuery,
        label: (
          <div>
            {searchParentQuery}
            <i className="icon-Add mx-1 text-primary fs-6"></i>
            <button className="fw-medium text-decoration-underline text-primary ms-1 border-0 bg-transparent p-0">
              Add Custom
            </button>
          </div>
        ),
      });
    }
    setParentSearchOptions(opts);
  }, [parentOptionsList, searchParentQuery, activeType]);

  // Build options from store list for lab investigation
  useEffect(() => {
    if (activeType !== "labInvestigation") return;
    const list = testOptionsList || [];
    const opts = list.map((e) => ({
      key: JSON.stringify({ ...e, unique_id: uuidv4() }),
      value: e.investigation_name,
      label: (
        <div>
          <span className="fw-medium">{e.investigation_name}</span>
          {e?.investigation_category && (
            <span className="ms-1 text-muted">
              ({e.investigation_category})
            </span>
          )}
        </div>
      ),
    }));

    if (searchTestQuery?.length > 0 && tokenData?.hospital_business_id != env.zydus_business_id && !isZydusUserAccessableFromGB && !isApolloHosBusinessIdAccessableFromGB) {
      opts.push({
        key: JSON.stringify({
          unique_id: uuidv4(),
          investigation_id: 0,
          investigation_name: searchTestQuery,
        }),
        value: searchTestQuery,
        label: (
          <div>
            {searchTestQuery}
            <i className="icon-Add mx-1 text-primary fs-6"></i>
            <button className="fw-medium text-decoration-underline text-primary ms-1 border-0 bg-transparent p-0">
              Add Custom
            </button>
          </div>
        ),
      });
    }
    setTestSearchOptions(opts);
  }, [testOptionsList, searchTestQuery, activeType]);

  const getFuzzySearchMedicine = useCallback(
    async (medsSnapshot) => {
      try {
        const meds = medsSnapshot || sectionData.medications || [];
        if (!meds.length) return;
        const sourceSignature = getMedicationNamesSignature(meds);

        const correctedResults = await Promise.all(
          meds.map(async (med) => {
            const nameToUse = getMedicationNameToUse(med);
            const isManualSelection = Boolean(
              med?.metadata?.isManualSelection ||
                med?.metadata?.selectedValue
            );
            const hasSameFuzzyResult = Boolean(
              med?.metadata?.isFuzzyCorrected &&
                (med?.metadata?.fuzzyCorrectedName || "").trim() === nameToUse
            );
            if (!nameToUse)
              return { correctedName: nameToUse, fullData: null, skip: true };
            if (isManualSelection) {
              return { correctedName: nameToUse, fullData: null, skip: true };
            }
            if (hasSameFuzzyResult) {
              return { correctedName: nameToUse, fullData: null, skip: true };
            }
            try {
              const result = await ApiMedication.getFuzzySearch(nameToUse);
              const corrected = result?.[0]?.tmm_medicine_name?.trim();
              return {
                correctedName: corrected || nameToUse,
                fullData: result?.[0] || null,
                skip: !result?.[0],
              };
            } catch (error) {
              return { correctedName: nameToUse, fullData: null, skip: true };
            }
          })
        );

        const anyChanged = meds.some(
          (m, i) => {
            const currentDisplayName = getMedicationNameForFuzzy(m);
            return currentDisplayName !== correctedResults[i].correctedName;
          }
        );
        const needsFuzzyMetadata = meds.some(
          (m, i) =>
            Boolean(correctedResults[i]?.fullData) && !m?.metadata?.isFuzzyCorrected
        );
        if (!anyChanged && !needsFuzzyMetadata) {
          const correctedSig = meds.map((m) => getMedicationNameForFuzzy(m)).join("|");
          lastFuzzyNamesRef.current = correctedSig;
          return;
        }

        const correctedSig = correctedResults
          .map((r) => r.correctedName)
          .join("|");
        lastFuzzyNamesRef.current = correctedSig;

        setData((prev) => {
          const currentMeds = prev?.medications || [];
          const currentSignature = getMedicationNamesSignature(currentMeds);
          // Do not apply stale fuzzy result if user changed names meanwhile.
          if (currentSignature !== sourceSignature) return prev;
          return {
            ...prev,
            medications: currentMeds.map((m, idx) => {
              const result = correctedResults[idx];
              if (!result || result.skip || !result.fullData) return m;
              const corrected = result.correctedName;
              const nameChanged = getMedicationNameForFuzzy(m) !== corrected;
              return ensureMedicationGroundedForRxSave({
                ...m,
                ...(nameChanged
                  ? { groundedMedicineName: corrected, refinedName: corrected }
                  : {}),
                metadata: {
                  ...m.metadata,
                  fuzzyCorrectedName: corrected,
                  originalName: getMedicationNameForFuzzy(m) || m.name,
                  isFuzzyCorrected: true,
                  ...(result.fullData || {}),
                },
              });
            }),
          };
        });
      } finally {}
    },
    [sectionData.medications, setData]
  );

  const getFuzzySearchLabs = useCallback(
    async (labsSnapshot) => {
      try {
        const labs = labsSnapshot || sectionData.labInvestigation || [];
        if (!labs.length) return;
        const sourceSignature = getLabInvestigationNamesSignature(labs);

        const correctedResults = await Promise.all(
          labs.map(async (item) => {
            const nameToUse = getLabInvestigationNameForFuzzy(item);
            const isManualSelection = Boolean(
              item?.metadata?.isManualSelection ||
                item?.metadata?.selectedValue
            );
            const hasSameFuzzyResult = Boolean(
              item?.metadata?.isFuzzyCorrected &&
                (item?.metadata?.fuzzyCorrectedName || "").trim() === nameToUse
            );
            if (!nameToUse) {
              return { correctedName: nameToUse, fullData: null, skip: true };
            }
            if (isManualSelection) {
              return { correctedName: nameToUse, fullData: null, skip: true };
            }
            if (hasSameFuzzyResult) {
              return { correctedName: nameToUse, fullData: null, skip: true };
            }
            try {
              const result = await ApiInvestigation.getFuzzySearch(nameToUse);
              const corrected = result?.[0]?.investigation_name?.trim();
              return {
                correctedName: corrected || nameToUse,
                fullData: result?.[0] || null,
                skip: !result?.[0],
              };
            } catch {
              return { correctedName: nameToUse, fullData: null, skip: true };
            }
          })
        );

        const anyChanged = labs.some(
          (item, index) =>
            getLabInvestigationNameForFuzzy(item) !== correctedResults[index].correctedName
        );
        const needsFuzzyMetadata = labs.some(
          (item, index) =>
            Boolean(correctedResults[index]?.fullData) &&
            !item?.metadata?.isFuzzyCorrected
        );
        if (!anyChanged && !needsFuzzyMetadata) {
          const correctedSig = labs
            .map((item) => getLabInvestigationNameForFuzzy(item))
            .join("|");
          lastFuzzyLabsRef.current = correctedSig;
          return;
        }

        const correctedSig = correctedResults
          .map((result) => result.correctedName)
          .join("|");
        lastFuzzyLabsRef.current = correctedSig;

        setData((prev) => {
          const currentLabs = prev?.labInvestigation || [];
          const currentSignature = getLabInvestigationNamesSignature(currentLabs);
          if (currentSignature !== sourceSignature) return prev;

          return {
            ...prev,
            labInvestigation: currentLabs.map((item, idx) => {
              const result = correctedResults[idx];
              if (!result || result.skip || !result.fullData) return item;
              const corrected = result.correctedName;
              const nameChanged = getLabInvestigationNameForFuzzy(item) !== corrected;
              const fuzzyMeta = {
                ...item.metadata,
                fuzzyCorrectedName: corrected,
                originalName: getLabInvestigationNameForFuzzy(item) || item.name,
                isFuzzyCorrected: true,
                ...(result.fullData || {}),
              };
              return ensureLabInvestigationMetadataForRxSave({
                ...item,
                ...(nameChanged ? { name: corrected, edited: false } : {}),
                hm_type: fuzzyMeta.hm_type ?? item.hm_type,
                um_id: fuzzyMeta.um_id ?? item.um_id,
                metadata: fuzzyMeta,
              });
            }),
          };
        });
      } finally {}
    },
    [sectionData.labInvestigation, setData]
  );

  // Fuzzy-correct medication names ONCE when medications first become available
  useEffect(() => {
    if (!isGroundingAccessable) return;
    const meds = sectionData.medications || [];
    if (!meds.length) return;

    // Use groundingMedicineName if present, otherwise use name for signature
    const namesSignature = getMedicationNamesSignature(meds);
    if (!namesSignature) return;

    // If signature matches what we last processed, skip — unless fuzzy metadata was lost (e.g. after voice PUT)
    const needsMetadataRefresh = meds.some(
      (m) => getMedicationNameForFuzzy(m) && !m?.metadata?.isFuzzyCorrected
    );
    if (namesSignature === lastFuzzyNamesRef.current && !needsMetadataRefresh) return;

    const now = Date.now();
    // Prevent rapid duplicate calls (e.g., StrictMode double effect)
    if (
      lastFuzzyCallRef.current.sig === namesSignature &&
      now - lastFuzzyCallRef.current.ts < 800
    ) {
      return;
    }
    lastFuzzyCallRef.current = { sig: namesSignature, ts: now };

    lastFuzzyNamesRef.current = namesSignature;
    getFuzzySearchMedicine(meds);
  }, [sectionData.medications]);

  // Fuzzy-correct lab investigation names when labInvestigation changes (same lifecycle as medications)
  useEffect(() => {
    if (!isGroundingAccessable) return;
    const labs = sectionData.labInvestigation || [];
    if (!labs.length) return;

    const namesSignature = getLabInvestigationNamesSignature(labs);
    if (!namesSignature) return;

    const needsMetadataRefresh = labs.some(
      (item) =>
        getLabInvestigationNameForFuzzy(item) && !item?.metadata?.isFuzzyCorrected
    );
    if (namesSignature === lastFuzzyLabsRef.current && !needsMetadataRefresh) return;

    const now = Date.now();
    if (
      lastFuzzyLabsCallRef.current.sig === namesSignature &&
      now - lastFuzzyLabsCallRef.current.ts < 800
    ) {
      return;
    }
    lastFuzzyLabsCallRef.current = { sig: namesSignature, ts: now };

    lastFuzzyLabsRef.current = namesSignature;
    getFuzzySearchLabs(labs);
  }, [sectionData.labInvestigation]);

  // Clear fuzzy refs on unmount (back button / end visit)
  useEffect(() => {
    return () => {
      hasFuzzyRunMedsRef.current = false;
      lastFuzzyNamesRef.current = "";
      lastFuzzyCallRef.current = { sig: "", ts: 0 };
      lastFuzzyLabsRef.current = "";
      lastFuzzyLabsCallRef.current = { sig: "", ts: 0 };
    };
  }, []);

  const onSearchParent = (query) => {
    setSearchParentQuery((query || "").trimStart());
  };

  const onSearchTest = (query) => {
    setSearchTestQuery((query || "").trimStart());
  };

  const onSelectParent = (value, option) => {
    // Open Add Custom popup if needed (tmm_id === 0)
    let parsedOption = null;
    try {
      const meta = option?.key ? JSON.parse(option.key) : null;
      parsedOption = meta;
      if (meta && meta.tmm_id === 0) {
        setShowAddMedicinePopup(true);
        return;
      }
    } catch {}

    setEditableText(value);
    if (activeType === "medications") {
      setData((prev) => {
        const updated = { ...prev };
        const arr = Array.isArray(updated.medications) ? [...updated.medications] : [];
        if (arr[activeIndex]) {
          arr[activeIndex] = {
            ...arr[activeIndex],
            groundedMedicineName: value,
            refinedName: value,
            metadata: {
              ...arr[activeIndex].metadata,
              ...(parsedOption || {}),
              selectedValue: value,
              isManualSelection: true,
            },
          };
          updated.medications = arr;
        }
        return updated;
      });
      editingRef.current = false;
      setTimeout(() => handleInputBlur(activeType, activeIndex), 0);
    }
  };

  const onSelectTest = (value, option) => {
    try {
      const meta = option?.key ? JSON.parse(option.key) : null;
      if (meta && meta.investigation_id === 0) {
        setEditableText(value);
        if (activeType === "labInvestigation") {
          setData((prev) => {
            const updated = { ...prev };
            const arr = Array.isArray(updated.labInvestigation) ? [...updated.labInvestigation] : [];
            if (arr[activeIndex]) {
              arr[activeIndex] = {
                ...arr[activeIndex],
                name: value,
                metadata: {
                  ...arr[activeIndex].metadata,
                  ...(option?.key ? JSON.parse(option.key) : {}),
                  selectedValue: value,
                  isManualSelection: true,
                },
              };
              updated.labInvestigation = arr;
            }
            return updated;
          });
          editingRef.current = false;
          setTimeout(() => handleInputBlur(activeType, activeIndex), 0);
        }
        return;
      }
    } catch {}

    setEditableText(value);
    if (activeType === "labInvestigation") {
      setData((prev) => {
        const updated = { ...prev };
        const arr = Array.isArray(updated.labInvestigation) ? [...updated.labInvestigation] : [];
        if (arr[activeIndex]) {
          arr[activeIndex] = {
            ...arr[activeIndex],
            name: value,
            metadata: {
              ...arr[activeIndex].metadata,
              ...(option?.key ? JSON.parse(option.key) : {}),
              selectedValue: value,
              isManualSelection: true,
            },
          };
          updated.labInvestigation = arr;
        }
        return updated;
      });
      editingRef.current = false;
      setTimeout(() => handleInputBlur(activeType, activeIndex), 0);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        suggestionRef.current &&
        !suggestionRef.current.contains(event.target)
      ) {
        if (activeType !== null) {
          if (activeType.includes('-value')) {
            handleValueBlur(activeType, activeIndex);
          } else if (!editableLineItem) {
            handleInputBlur(activeType, activeIndex)
          } else {
            handleLineItemBlur(activeType, activeIndex);
          }
        }
      }
      const target = event.target;
      const inActiveInput =
        inputRef.current && inputRef.current.contains(target);
      const inSuggestions =
        suggestionRef.current && suggestionRef.current.contains(target);

      const sectionEl =
        visibleSection && sectionRefs.current[visibleSection]
          ? sectionRefs.current[visibleSection]
          : null;
      const clickedInsideHighlighted = sectionEl && sectionEl.contains(target);
      if (!inActiveInput && !inSuggestions) {
        if (activeType !== null) {
          if (activeType.includes('-value')) {
            handleValueBlur(activeType, activeIndex);
          } else if (!editableLineItem) {
            handleInputBlur(activeType, activeIndex)
          } else {
            handleLineItemBlur(activeType, activeIndex);
          }
        }

        if (!clickedInsideHighlighted) {
          setVisibleSection(null);
          setActiveType(null);
          setActiveIndex(null);
          setEditableText("");
          setEditableValue("");
          editingRef.current = false;

          setIoAutoFocusEnabled(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeIndex, activeType, handleInputBlur, visibleSection, editableLineItem, editableText, editableValue]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setEditableText(value);
    // Live update: medications store user edits on groundedMedicineName (keep name as source/OCR text)
    if (activeType === "medications" || activeType === "labInvestigation") {
      setData((prev) => {
        const updated = { ...prev };
        const key = activeType;
        const arr = Array.isArray(updated[key]) ? [...updated[key]] : [];
        if (arr[activeIndex]) {
          if (activeType === "medications") {
            arr[activeIndex] = {
              ...arr[activeIndex],
              groundedMedicineName: value,
              refinedName: value,
            };
          } else {
            arr[activeIndex] = {
              ...arr[activeIndex],
              name: value,
            };
          }
          updated[key] = arr;
        }
        return updated;
      });
    }
  };
  const handleLineItemChange = (e) => setEditableLineItem(e.target.value);
  const handleValueChange = (e) => setEditableValue(e.target.value);

  const handleValueBlur = (type, index, currentValue = null) => {
    const itemType = type?.split('-')?.[0];
    const valueToSave = currentValue !== null ? currentValue : editableValue;
    setData((prevData) => {
      const updatedData = { ...prevData };
      const arr = [...(updatedData[itemType] || [])];
      if (itemType === "labResults") {
        arr[index] = { ...arr[index], value: valueToSave || "" };
      }
      updatedData[itemType] = arr;
      return updatedData;
    });
    setEditableValue("");
    setActiveIndex(null);
    setActiveType(null);
    setEditableText("");
    setEditableKey("");
  };

  const handleItemClick = (type, index) => {
    if (activeIndex !== null && activeType !== null) {
      if (activeType.includes('-value')) {
        handleValueBlur(activeType, activeIndex);
      } else {
        handleInputBlur(activeType, activeIndex);
      }
    }

    if (type === "vitalsAndBodyComposition-key") {
      const isNumberKey = /^\d+$/.test(index);
      const label = isNumberKey
        ? index
        : index
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase());
      setEditableKey(label);
    } else if (type === "vitalsAndBodyComposition") {
      setEditableText((data.vitalsAndBodyComposition || {})[index] || "");
    } else if (type === "followUp") {
      setEditableText(data?.followUp);
    } else if (ARRAY_SECTIONS.includes(type)) {
      const item = data[type][index];
      setEditableText(
        type === "advice" ? data[type][index] : getPrimaryText(type, item)
      );
    }

    setActiveIndex(index);
    setActiveType(type);
  };

  const handleLineItemClick = (type, index) => {
    const src = data[type][index];
    setEditableLineItem(type === "diagnosis" || type === "examinations" || type === "dynamicFields" ? src?.notes : src?.lineItem);
    setActiveIndex(index);
    setActiveType(`${type}-lineItem`);
  };

  const handleValueClick = (type, index) => {
    if (activeIndex !== null && activeType !== null) {
      if (activeType.includes('-value')) {
        handleValueBlur(activeType, activeIndex);
      } else {
        handleInputBlur(activeType, activeIndex);
      }
    }
    const src = data[type][index];
    setEditableValue(src?.value || "");
    setActiveIndex(index);
    setActiveType(`${type}-value`);
  };

  
  const handleEnterToInsert = (type, index, isLineItem = false) => {
    if (!ARRAY_SECTIONS.includes(type)) return;
    setVisibleSection(type);
    editingRef.current = true;
    setData((prev) => {
      const updated = { ...prev };
      const arr = Array.isArray(updated[type]) ? [...updated[type]] : [];
      const cur = arr[index];
    
      const currentText = (isLineItem ? editableLineItem : editableText ?? "").trim();
      if (type === "advice" || type === "others") {
        arr[index] = currentText;
      } else if (type === "medications") {
        const lineItem = isLineItem
          ? currentText || cur?.lineItem || prev[type]?.lineItem
          : cur?.lineItem;
        if (!currentText) {
          arr[index] = cur;
        } else if (isLineItem) {
          arr[index] = { ...(cur || {}), lineItem };
        } else {
          arr[index] = {
            ...(cur || {}),
            groundedMedicineName: currentText,
            refinedName: currentText,
          };
        }
      } else if (type === "labInvestigation") {
        const name = isLineItem ? cur?.name || prev[type]?.name : currentText || cur?.name;
        const lineItem = isLineItem ? currentText || cur?.lineItem || prev[type]?.lineItem : cur?.lineItem;
        arr[index] = currentText
          ? {
              ...(cur || {}),
              name,
              lineItem,
            }
          : cur;
      } else if (type === "dynamicFields") {
        const title = isLineItem ? cur?.title || prev[type]?.title : currentText || cur?.title;
        const notes = isLineItem ? currentText || cur?.notes || prev[type]?.notes : cur?.notes;
        arr[index] = { ...cur, title, notes };
      } else if (type === "labResults") {
        const testname = isLineItem ? cur?.testname || prev[type]?.testname : currentText || cur?.testname;
        const notes = isLineItem ? currentText || cur?.notes || prev[type]?.notes : cur?.notes;
        const value = activeType === `${type}-value` ? editableValue || cur?.value || prev[type]?.value : cur?.value;
        arr[index] = { ...cur, testname, notes, value };
      } else {
        const name = isLineItem
          ? cur?.name || prev[type]?.name
          : currentText || cur?.name;
        const lineItem = isLineItem
          ? currentText || cur?.lineItem || prev[type]?.lineItem
          : cur?.lineItem;
        arr[index] = { ...cur, name, lineItem, notes: lineItem };
      }
      arr.splice(index + 1, 0, normalizeNewItem(type, ""));
      updated[type] = arr;
      return updated;
    });

    setTimeout(() => {
      setActiveType(type);
      setActiveIndex(index + 1);
      setEditableText("");
      setEditableLineItem("");
      const sec = sectionRefs.current[type];
      // Focus the input within the next list item to avoid picking up hidden inputs from AutoComplete
      const nextLi = sec?.querySelectorAll("li")[index + 1];
      const nextInput = nextLi?.querySelector("input");
      nextInput?.focus?.();
    }, 0);
  };

  const renderArraySection = (type) => {
    return (
      <div
        data-section={type}
        ref={(el) => (sectionRefs.current[type] = el)}
        className={`digitised-section-rx ${
          visibleSection === type ? "highlight-blue" : ""
        }`}
      >
        {loading ? (
          <div className="shimmer-container">
            <div className="shimmer-header">
              <div className="shimmer"></div>
            </div>
            <div className="shimmer-content">
              <div className="shimmer"></div>
            </div>
          </div>
        ) : Array.isArray(data[type]) && data[type].length > 0 ? (
          <ul>
            {data[type].map((item, index) => {
              let textWidth = 0;
              let lineItemWidth = 0;
              let valueWidth = 0;
  
              
              if (activeIndex === index && activeType === type) {
                const temp = document.createElement("span");
                temp.style.visibility = "hidden";
                temp.style.position = "absolute";
                temp.style.whiteSpace = "nowrap";
                temp.innerText = editableText || "";
                document.body.appendChild(temp);
                textWidth = temp.offsetWidth;
                document.body.removeChild(temp);
              }

              if (activeIndex === index && activeType === `${type}-lineItem`) {
                const temp2 = document.createElement("span");
                temp2.style.visibility = "hidden";
                temp2.style.position = "absolute";
                temp2.style.whiteSpace = "nowrap";
                temp2.innerText = editableLineItem || "";
                document.body.appendChild(temp2);
                document.body.removeChild(temp2);
              }

              // Calculate width for value input
              if (activeIndex === index && activeType === `${type}-value`) {
                const temp3 = document.createElement("span");
                temp3.style.visibility = "hidden";
                temp3.style.position = "absolute";
                temp3.style.whiteSpace = "nowrap";
                temp3.innerText = editableValue || "";
                document.body.appendChild(temp3);
                valueWidth = temp3.offsetWidth;
                document.body.removeChild(temp3);
              }
  
              const primaryDisplay = getPrimaryText(type, item);

              return (
                <li key={index}>
                  <div className="medicine-item">
                    {activeIndex === index && activeType === type ? (
                      type === "medications" ? (
                        <div ref={suggestionRef}>
                          <AutoComplete
                            value={editableText}
                            onSearch={onSearchParent}
                            options={parentSearchOptions}
                            className="autocomplete-custom grounding-select"
                            popupClassName="grounding-boxpopup grounding-select"
                            onSelect={onSelectParent}
                            defaultActiveFirstOption={true}
                            autoFocus={true}
                            popupMatchSelectWidth={false}
                            dropdownStyle={{ width: 420 }}
                            getPopupContainer={() => suggestionRef.current}
                            open={
                              activeIndex === index &&
                              activeType === type &&
                              parentSearchOptions.length > 0
                            }
                            style={{ minWidth: 260 }}
                          >
                            <input
                              ref={inputRef}
                              type="text"
                              value={editableText}
                              className="editable-digitised-item"
                              onChange={handleInputChange}
                              onBlur={() => {
                                editingRef.current = false;
                                handleInputBlur(type, index);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleEnterToInsert(type, index);
                                }
                              }}
                              onFocus={() => {
                                editingRef.current = true;
                                setVisibleSection(type);
                              }}
                              style={{
                                width: `clamp(12px, ${textWidth + 10}px, 100%)`,
                              }}
                            />
                          </AutoComplete>
                        </div>
                      ) : type === "labInvestigation" ? (
                        <div ref={suggestionRef}>
                          <AutoComplete
                            value={editableText}
                            onSearch={onSearchTest}
                            options={testSearchOptions}
                            className="autocomplete-custom grounding-select"
                            popupClassName="grounding-boxpopup grounding-select"
                            onSelect={onSelectTest}
                            defaultActiveFirstOption={true}
                            autoFocus={true}
                            popupMatchSelectWidth={false}
                            dropdownStyle={{ width: 420 }}
                            getPopupContainer={() => suggestionRef.current}
                            open={
                              activeIndex === index &&
                              activeType === type &&
                              testSearchOptions.length > 0
                            }
                            style={{ minWidth: 260 }}
                          >
                            <input
                              ref={inputRef}
                              type="text"
                              value={editableText}
                              className="editable-digitised-item"
                              onChange={handleInputChange}
                              onBlur={() => {
                                editingRef.current = false;
                                handleInputBlur(type, index);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleEnterToInsert(type, index);
                                }
                              }}
                              onFocus={() => {
                                editingRef.current = true;
                                setVisibleSection(type);
                              }}
                              style={{
                                width: `clamp(12px, ${textWidth + 10}px, 100%)`,
                              }}
                            />
                          </AutoComplete>
                        </div>
                      ) : (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editableText}
                          className="editable-digitised-item"
                          onChange={handleInputChange}
                          onBlur={() => {
                            editingRef.current = false;
                            handleInputBlur(type, index);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleEnterToInsert(type, index);
                            }
                          }}
                          autoFocus
                          onFocus={() => {
                            editingRef.current = true;
                            setVisibleSection(type);
                          }}
                          style={{
                            width: `clamp(12px, ${textWidth + 10}px, 100%)`,
                          }}
                        />
                      )
                    ) : (
                      <span
                        onClick={() => handleItemClick(type, index)}
                        className="digitised-item"
                      >
                        {primaryDisplay}
                      </span>
                    )}

                    {/* Editable input for lineItem (not for advice/userAdded) */}
                    {(type === "medications" ||
                      type === "symptoms" ||
                      type === "vaccinations" ||
                      type === "medicalHistory") &&
                      item?.lineItem &&
                      (activeIndex === index &&
                      activeType === `${type}-lineItem` ? (
                        <input
                          type="text"
                          value={editableLineItem}
                          className="editable-digitised-item"
                          onChange={handleLineItemChange}
                          onBlur={() => {
                            editingRef.current = false;
                            setVisibleSection(type);
                            handleLineItemBlur(type, index);
                          }}
                          onFocus={() => {
                            editingRef.current = true;
                            setVisibleSection(type);
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleEnterToInsert(type, index, true);
                            }
                          }}
                          style={{
                            width: `clamp(12px, ${
                              (editableLineItem || "").length * 8 + 10
                            }px, 100%)`,
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => handleLineItemClick(type, index)}
                          className="digitised-item"
                        >
                          {`(${item.lineItem})`}
                        </span>
                      ))}

                    {/* Special handling for labResults - testname: value format */}
                    {type === "labResults" && (
                      <>
                        {/* Colon separator - always visible */}
                        <span className="digitised-item">: </span>
                        
                        {/* Editable value */}
                        {item?.value &&
                          (activeIndex === index && activeType === `${type}-value` ? (
                            <input
                              type="text"
                              value={editableValue}
                              className="editable-digitised-item"
                              onChange={handleValueChange}
                              onBlur={(e) => {
                                editingRef.current = false;
                                handleValueBlur(activeType, activeIndex, e.target.value);
                              }}
                              onFocus={() => {
                                editingRef.current = true;
                                setVisibleSection(type);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleEnterToInsert(type, index, true);
                                }
                              }}
                              autoFocus
                              style={{ width: `clamp(12px, ${valueWidth + 10}px, 100%)` }}
                            />
                          ) : (
                            <span
                              onClick={() => handleValueClick(type, index)}
                              className="digitised-item"
                            >
                              {item.value}
                            </span>
                          ))}
                      </>
                    )}

                    {/* Editable input for notes (examinations/diagnosis/dynamicFields) */}
                    {(type === "examinations" || type === "diagnosis" || type === "dynamicFields") &&
                      item?.notes &&
                      (activeIndex === index &&
                      activeType === `${type}-lineItem` ? (
                        <input
                          type="text"
                          value={editableLineItem}
                          className="editable-digitised-item"
                          onChange={handleLineItemChange}
                          onBlur={() => {
                            editingRef.current = false;
                            handleLineItemBlur(type, index);
                          }}
                          onFocus={() => {
                            editingRef.current = true;
                            setVisibleSection(type);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleEnterToInsert(type, index, true);
                            }
                          }}
                          autoFocus
                          style={{
                            width: `clamp(12px, ${
                              (editableLineItem || "").length * 8 + 10
                            }px, 100%)`,
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => handleLineItemClick(type, index)}
                          className="digitised-item"
                        >
                          {`(${item.notes})`}
                        </span>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          type === "followUp" && data?.followUp != null ? <span className="digitised-item">{data.followUp}</span> : null
        )}
      </div>
    );
  };

  const hasValidContent = (type) => {
    const source = type === "vitalsAndBodyComposition" ? sectionData.vitalsAndBodyComposition
      : type === "examinations" ? sectionData.examinations
      : type === "medications" ? sectionData.medications
      : type === "labInvestigation" ? sectionData.labInvestigation
      : data?.[type];
    if (!source) return false;
    if (type === "vitalsAndBodyComposition") {
      return typeof source === "object" && Object.values(source || {}).some((v) => v != null && String(v).trim?.()?.length > 0);
    }
    if (type === "followUp") return typeof source === "string" && source.trim().length > 0;
    if (!Array.isArray(source)) return false;
    const result = source.some((item) => {
      if (typeof item === "string") return String(item).trim().length > 0;
      const relevant = {
        medications: ["groundedMedicineName", "name", "refinedName", "lineItem"],
        symptoms: ["name", "lineItem"],
        surgeries: ["name", "notes"],
        examinations: ["name", "findings", "notes", "lineItem"],
        diagnosis: ["name", "notes", "lineItem"],
        medicalHistory: ["name", "lineItem"],
        vaccinations: ["name", "brand", "schedule", "notes", "lineItem"],
        labInvestigation: ["name", "lineItem"],
        dynamicFields: ["title", "notes"],
        others: ["name", "value"],
        labResults: ["testname", "value", "notes"],
        advice: ["name"],
      }[type] || ["name"];
      return relevant.some((f) => {
        const v = item[f];
        return v != null && String(v).trim().length > 0;
      });
    });
    return result;
  };

  const showMedicalHistorySection = !!(data?.medicalHistory && hasValidContent("medicalHistory"));
  const labResultsArray = data?.labResults ?? data?.lab_results ?? [];
  const showLabResultsSection = !!(data && Array.isArray(labResultsArray) && labResultsArray.length > 0);

  const normalizeAdvice = (advice) => {
    if (!Array.isArray(advice)) return [];
    return advice.map((a) => (typeof a === "string" ? { lineItem: a } : a));
  };

  const handleMedicationsUpdate = useCallback((medicationsArray) => {
    setData((prevData) => ({
      ...prevData,
      medications: medicationsArray,
    }));
  }, []);

  const handleDentalMedicationsUpdate = useCallback(
    (medicationsArray) => {
      let nextDentalData = null;
      const nextMedications = Array.isArray(medicationsArray) ? medicationsArray : [];
      setData((prev) => {
        const prevDentalData =
          prev?.dentalData ??
          prev?.results ??
          prev?.data?.results ??
          dentalDataFromStore ??
          {};
        const nextComplaints = prev?.complaints ?? prevDentalData?.complaints ?? {};
        const nextTreatmentPlans =
          prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
        const nextWorkDone = prev?.workDone ?? prevDentalData?.workDone ?? { items: [], notes: "" };
        nextDentalData = {
          ...prevDentalData,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          workDone: nextWorkDone,
          medications: nextMedications,
        };
        return {
          ...prev,
          dental: true,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          workDone: nextWorkDone,
          medications: nextMedications,
          dentalData: nextDentalData,
        };
      });
      if (nextDentalData) dispatch(setDentalData(nextDentalData));
      if (typeof onRxEdited === "function") onRxEdited(true);
    },
    [dispatch, dentalDataFromStore, onRxEdited, setData]
  );

  const handleInvestigationUpdate = useCallback((investigationArray) => {
    setData((prevData) => ({
      ...prevData,
      labInvestigation: investigationArray,
    }));
  }, []);

  const updateDentalComplaintField = useCallback(
    (key, value) => {
      let nextDentalData = null;
      setData((prev) => {
        const prevDentalData =
          prev?.dentalData ??
          prev?.results ??
          prev?.data?.results ??
          dentalDataFromStore ??
          {};
        const nextComplaints = {
          ...(prev?.complaints ?? prevDentalData?.complaints ?? {}),
          [key]: value,
        };
        const nextTreatmentPlans =
          prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
        const nextMedications = getDentalMedicationArray(
          prev?.medications,
          prevDentalData?.medications
        );
        nextDentalData = {
          ...prevDentalData,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
        };
        return {
          ...prev,
          dental: true,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
          dentalData: nextDentalData,
        };
      });
      if (nextDentalData) dispatch(setDentalData(nextDentalData));
      if (typeof onRxEdited === "function") onRxEdited(true);
    },
    [dispatch, dentalDataFromStore, onRxEdited, setData]
  );

  const updateDentalTreatmentItem = useCallback(
    (rowIndex, field, value) => {
      let nextDentalData = null;
      setData((prev) => {
        const prevDentalData =
          prev?.dentalData ??
          prev?.results ??
          prev?.data?.results ??
          dentalDataFromStore ??
          {};
        const currentTreatmentPlans =
          prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
        const items = Array.isArray(currentTreatmentPlans.items)
          ? [...currentTreatmentPlans.items]
          : [];
        while (items.length <= rowIndex) {
          items.push({
            srno: "",
            treatment: "",
            toothNum: "",
            rate: "",
            count: "",
            estimate: "",
          });
        }
        const currentItem = items[rowIndex] || {};
        items[rowIndex] = { ...currentItem, [field]: value };
        const nextTreatmentPlans = { ...currentTreatmentPlans, items };
        const nextComplaints = prev?.complaints ?? prevDentalData?.complaints ?? {};
        const nextMedications = getDentalMedicationArray(
          prev?.medications,
          prevDentalData?.medications
        );
        nextDentalData = {
          ...prevDentalData,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
        };
        return {
          ...prev,
          dental: true,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
          dentalData: nextDentalData,
        };
      });
      if (nextDentalData) dispatch(setDentalData(nextDentalData));
      if (typeof onRxEdited === "function") onRxEdited(true);
    },
    [dispatch, dentalDataFromStore, onRxEdited, setData]
  );

  const addDentalTreatmentRow = useCallback(() => {
    let nextDentalData = null;
    setData((prev) => {
      const prevDentalData =
        prev?.dentalData ??
        prev?.results ??
        prev?.data?.results ??
        dentalDataFromStore ??
        {};
      const currentTreatmentPlans =
        prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
      const items = Array.isArray(currentTreatmentPlans.items)
        ? [...currentTreatmentPlans.items]
        : [];
      items.push({
        srno: items.length + 1,
        treatment: "",
        toothNum: "",
        rate: "",
        count: "",
        estimate: "",
      });
      const nextTreatmentPlans = { ...currentTreatmentPlans, items };
      const nextComplaints = prev?.complaints ?? prevDentalData?.complaints ?? {};
      const nextMedications = getDentalMedicationArray(
        prev?.medications,
        prevDentalData?.medications
      );
      nextDentalData = {
        ...prevDentalData,
        complaints: nextComplaints,
        treatmentPlans: nextTreatmentPlans,
        medications: nextMedications,
      };
      return {
        ...prev,
        dental: true,
        complaints: nextComplaints,
        treatmentPlans: nextTreatmentPlans,
        medications: nextMedications,
        dentalData: nextDentalData,
      };
    });
    if (nextDentalData) dispatch(setDentalData(nextDentalData));
    if (typeof onRxEdited === "function") onRxEdited(true);
  }, [dispatch, dentalDataFromStore, onRxEdited, setData]);

  const updateDentalWorkDoneItem = useCallback(
    (rowIndex, field, value) => {
      let nextDentalData = null;
      setData((prev) => {
        const prevDentalData =
          prev?.dentalData ??
          prev?.results ??
          prev?.data?.results ??
          dentalDataFromStore ??
          {};
        const currentWorkDone = prev?.workDone ?? prevDentalData?.workDone ?? { items: [], notes: "" };
        const items = Array.isArray(currentWorkDone.items) ? [...currentWorkDone.items] : [];
        while (items.length <= rowIndex) {
          items.push({
            date: "",
            workDone: "",
            ptr: "",
            ttReview: "",
            payment: "",
            balance: "",
            remarks: "",
          });
        }
        const currentItem = items[rowIndex] || {};
        const nextItem = { ...currentItem, [field]: value };
        if (field === "workDone") {
          nextItem.nextAppointment = "";
        }
        items[rowIndex] = nextItem;
        const nextWorkDone = { ...currentWorkDone, items };
        const nextComplaints = prev?.complaints ?? prevDentalData?.complaints ?? {};
        const nextTreatmentPlans =
          prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
        const nextMedications = getDentalMedicationArray(
          prev?.medications,
          prevDentalData?.medications
        );
        nextDentalData = {
          ...prevDentalData,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          workDone: nextWorkDone,
          medications: nextMedications,
        };
        return {
          ...prev,
          dental: true,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          workDone: nextWorkDone,
          medications: nextMedications,
          dentalData: nextDentalData,
        };
      });
      if (nextDentalData) dispatch(setDentalData(nextDentalData));
      if (typeof onRxEdited === "function") onRxEdited(true);
    },
    [dispatch, dentalDataFromStore, onRxEdited, setData]
  );

  const addDentalWorkDoneRow = useCallback(() => {
    let nextDentalData = null;
    setData((prev) => {
      const prevDentalData =
        prev?.dentalData ??
        prev?.results ??
        prev?.data?.results ??
        dentalDataFromStore ??
        {};
      const currentWorkDone = prev?.workDone ?? prevDentalData?.workDone ?? { items: [], notes: "" };
      const items = Array.isArray(currentWorkDone.items) ? [...currentWorkDone.items] : [];
      items.push({
        date: "",
        workDone: "",
        ptr: "",
        ttReview: "",
        payment: "",
        balance: "",
        remarks: "",
      });
      const nextWorkDone = { ...currentWorkDone, items };
      const nextComplaints = prev?.complaints ?? prevDentalData?.complaints ?? {};
      const nextTreatmentPlans =
        prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
      const nextMedications = getDentalMedicationArray(
        prev?.medications,
        prevDentalData?.medications
      );
      nextDentalData = {
        ...prevDentalData,
        complaints: nextComplaints,
        treatmentPlans: nextTreatmentPlans,
        workDone: nextWorkDone,
        medications: nextMedications,
      };
      return {
        ...prev,
        dental: true,
        complaints: nextComplaints,
        treatmentPlans: nextTreatmentPlans,
        workDone: nextWorkDone,
        medications: nextMedications,
        dentalData: nextDentalData,
      };
    });
    if (nextDentalData) dispatch(setDentalData(nextDentalData));
    if (typeof onRxEdited === "function") onRxEdited(true);
  }, [dispatch, dentalDataFromStore, onRxEdited, setData]);

  const updateDentalWorkDoneNotes = useCallback(
    (value) => {
      let nextDentalData = null;
      setData((prev) => {
        const prevDentalData =
          prev?.dentalData ??
          prev?.results ??
          prev?.data?.results ??
          dentalDataFromStore ??
          {};
        const currentWorkDone = prev?.workDone ?? prevDentalData?.workDone ?? { items: [], notes: "" };
        const nextWorkDone = { ...currentWorkDone, notes: value };
        const nextComplaints = prev?.complaints ?? prevDentalData?.complaints ?? {};
        const nextTreatmentPlans =
          prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
        const nextMedications = getDentalMedicationArray(
          prev?.medications,
          prevDentalData?.medications
        );
        nextDentalData = {
          ...prevDentalData,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          workDone: nextWorkDone,
          medications: nextMedications,
        };
        return {
          ...prev,
          dental: true,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          workDone: nextWorkDone,
          medications: nextMedications,
          dentalData: nextDentalData,
        };
      });
      if (nextDentalData) dispatch(setDentalData(nextDentalData));
      if (typeof onRxEdited === "function") onRxEdited(true);
    },
    [dispatch, dentalDataFromStore, onRxEdited, setData]
  );

  const buildWorkDoneText = useCallback((item) => {
    const workDone = item?.workDone ?? "";
    const nextAppointment = item?.nextAppointment ?? "";
    const workDoneText = String(workDone ?? "");
    const nextText = String(nextAppointment ?? "").trim();
    if (!nextText) return workDoneText;
    const normalized = workDoneText.toLowerCase();
    if (normalized.includes("next appointment")) return workDoneText;
    const suffix = `Next Appointment: ${nextText}`;
    if (!workDoneText.trim()) return suffix;
    return `${workDoneText}\n${suffix}`;
  }, []);

  const addDentalToothEntry = useCallback(
    (sectionKey) => {
      let nextDentalData = null;
      let newIndex = -1;
      setData((prev) => {
        const prevDentalData =
          prev?.dentalData ??
          prev?.results ??
          prev?.data?.results ??
          dentalDataFromStore ??
          {};
        const diagnosis = { ...(prevDentalData?.diagnosis || {}) };
        const teeth = Array.isArray(diagnosis.teeth) ? [...diagnosis.teeth] : [];
        newIndex = teeth.length;
        teeth.push({
          toothNum: "",
          toothSection: sectionKey,
          diagnose: "",
        });
        diagnosis.teeth = teeth;
        const nextComplaints = prev?.complaints ?? prevDentalData?.complaints ?? {};
        const nextTreatmentPlans =
          prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
        const nextMedications = getDentalMedicationArray(
          prev?.medications,
          prevDentalData?.medications
        );
        nextDentalData = {
          ...prevDentalData,
          diagnosis,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
        };
        return {
          ...prev,
          dental: true,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
          dentalData: nextDentalData,
        };
      });
      if (nextDentalData) dispatch(setDentalData(nextDentalData));
      if (newIndex >= 0) {
        pendingToothFocusRef.current = { index: newIndex, field: "toothNum" };
      }
      if (typeof onRxEdited === "function") onRxEdited(true);
    },
    [dispatch, dentalDataFromStore, onRxEdited, setData]
  );

  const updateDentalToothEntry = useCallback(
    (toothIndex, field, value) => {
      let nextDentalData = null;
      setData((prev) => {
        const prevDentalData =
          prev?.dentalData ??
          prev?.results ??
          prev?.data?.results ??
          dentalDataFromStore ??
          {};
        const diagnosis = { ...(prevDentalData?.diagnosis || {}) };
        const teeth = Array.isArray(diagnosis.teeth) ? [...diagnosis.teeth] : [];
        const current = teeth[toothIndex] || {};
        let toothNum = current.toothNum ?? "";
        let diagnose = current.diagnose ?? "";
        if (field === "toothNum") {
          const cleaned = String(value ?? "").replace(/\\D/g, "");
          toothNum = cleaned === "" ? "" : Number(cleaned);
        }
        if (field === "diagnose") {
          diagnose = String(value ?? "");
        }
        teeth[toothIndex] = {
          ...current,
          toothNum,
          diagnose,
        };
        diagnosis.teeth = teeth;
        const nextComplaints = prev?.complaints ?? prevDentalData?.complaints ?? {};
        const nextTreatmentPlans =
          prev?.treatmentPlans ?? prevDentalData?.treatmentPlans ?? { items: [] };
        const nextMedications = getDentalMedicationArray(
          prev?.medications,
          prevDentalData?.medications
        );
        nextDentalData = {
          ...prevDentalData,
          diagnosis,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
        };
        return {
          ...prev,
          dental: true,
          complaints: nextComplaints,
          treatmentPlans: nextTreatmentPlans,
          medications: nextMedications,
          dentalData: nextDentalData,
        };
      });
      if (nextDentalData) dispatch(setDentalData(nextDentalData));
      if (typeof onRxEdited === "function") onRxEdited(true);
    },
    [dispatch, dentalDataFromStore, onRxEdited, setData]
  );

  const dynamicFieldsObject = useMemo(
    () => getDynamicFieldsAsObject(data?.dynamicFields),
    [data?.dynamicFields]
  );
  // Legacy alias for any stale reference (e.g. hot reload); we always use object UI now
  const isDynamicFieldsObject = true;

  const handleEditModule = useCallback(
    (module) => {
      const newName = (updatedModuleName || "").trim();
      if (!module || !newName || newName === module) {
        setEditingModule("");
        setUpdatedModuleName("");
        return;
      }
      setData((prev) => {
        const df = getDynamicFieldsAsObject(prev.dynamicFields);
        const updated = { ...prev, dynamicFields: { ...df } };
        if (df[module]) {
          updated.dynamicFields[newName] = df[module];
          delete updated.dynamicFields[module];
        }
        return updated;
      });
      if (setLocalModules)
        setLocalModules((prev) => (prev || []).map((m) => (m === module ? newName : m)));
      setEditingModule("");
      setUpdatedModuleName("");
      onRxEdited?.();
    },
    [updatedModuleName, setLocalModules, onRxEdited]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingModule("");
    setUpdatedModuleName("");
  }, []);

  const handleCustomModuleUpdate = useCallback(
    (moduleName, moduleArray) => {
      setData((prev) => {
        const updated = { ...prev, dynamicFields: { ...getDynamicFieldsAsObject(prev.dynamicFields) } };
        const arr = Array.isArray(moduleArray) ? moduleArray : [];
        if (arr.length === 0) delete updated.dynamicFields[moduleName];
        else updated.dynamicFields[moduleName] = arr;
        return updated;
      });
      onRxEdited?.();
    },
    [onRxEdited]
  );

  const toggleDeleteModuleModal = useCallback(() => {
    setIsDeleteModuleModalOpen((prev) => !prev);
    if (moduleToDelete) setModuleToDelete(null);
  }, [moduleToDelete]);

  const handleDeleteModule = useCallback(() => {
    if (!moduleToDelete) return;
    setData((prev) => {
      const updated = { ...prev, dynamicFields: { ...getDynamicFieldsAsObject(prev.dynamicFields) } };
      delete updated.dynamicFields[moduleToDelete];
      return updated;
    });
    if (setLocalModules)
      setLocalModules((prev) => (prev || []).filter((m) => m !== moduleToDelete));
    onRxEdited?.();
    setIsDeleteModuleModalOpen(false);
    setModuleToDelete(null);
  }, [moduleToDelete, setLocalModules, onRxEdited]);

  return (
    <>
      {showHeaderArea && (
        <div className={styles.rxPadHeader}>
          <img src={documentIcon} alt="Rx Pad" className={styles.rxPadIcon} />
          <span className={styles.rxPadTitle}>Rx Pad</span>
        </div>
      )}
      {loading ? (
        <div
          className={`${rightSectionClass} ${styles.gradientBorder} ${styles.loaderFullBleed}`}
          ref={containerRef}
        >
          <GenRXLoaders
            showAbsHeaderInsideLoader={showAbsHeaderInsideLoader}
            isProcessing={true}
            isSnapRx={true}
          />
        </div>
      ) : (
        <div className={rightSectionClass} ref={containerRef}>
          {showInstructionMessage && onCloseInstructionMessage && (
            <div className={styles.rxPadInstruction}>
              <div className={styles.instructionIcon}>
                <img src={warningIcon} alt="Warning" className={styles.dangerIcon} />
              </div>
              <div className={styles.instructionText}>
                Dictate the Rx or start a conversation with Ambient Rx. We&apos;ll automatically fill these details so you can focus on the patient.
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={onCloseInstructionMessage}
                aria-label="Close instruction message"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
          <>
          {hasDentalSection && (
            <div className="digitised-section-rx dental-section">
              <table className="dental-table dental-complaints-table">
                <tbody>
                  {dentalComplaintRows.map((row) => (
                    <tr key={row.key}>
                      <td className="dental-label-cell">{row.label}</td>
                      <td>
                        <textarea
                          className="dental-table-input dental-textarea"
                          rows={row.key === "notes" ? 2 : 1}
                          value={dentalComplaints?.[row.key] ?? ""}
                          onChange={(e) =>
                            updateDentalComplaintField(row.key, e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasDentalMedications ? (
                <MedicationsTable
                  medications={dentalMedications}
                  onUpdate={handleDentalMedicationsUpdate}
                  isProcessing={false}
                  isMedInvestigationFeatureOn={isMedInvestigationOn}
                />
              ): null}

              {dentalDiagnosisRows.length > 0 && (
                <table className="dental-table dental-diagnosis-table">
                  <thead>
                    <tr>
                      <th>Diagnosis Field</th>
                      <th>Selected Values</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dentalDiagnosisRows.map((row) => (
                      <tr key={`dental-dx-${row.key}`}>
                        <td className="dental-label-cell">{row.label}</td>
                        <td>
                          <input
                            type="text"
                            className="dental-selected-input"
                            value={row.value}
                            onChange={(e) =>
                              updateDentalDiagnosisField(
                                row.key,
                                e.target.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(hasToothDiagramNotes || dentalDiagnosis?.toothDiagramNotes != null) && (
                <table className="dental-table dental-tooth-diagram-table">
                  <tbody>
                    <tr>
                      <td className="dental-label-cell">TOOTH DIAGRAM NOTES</td>
                      <td>
                        <textarea
                          className="dental-table-input dental-textarea"
                          value={dentalToothDiagramNotes}
                          onChange={(e) => updateDentalToothDiagramNotes(e.target.value)}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              <div className="dental-quadrant-grid">
                {dentalQuadrantSections.map((section) => {
                  const items = dentalTeethBySection?.[section.key] || [];
                  return (
                    <div className="dental-quadrant-cell" key={section.key}>
                      <div className="dental-quadrant-title">
                        {section.label}
                      </div>
                      <div className="dental-quadrant-list">
                        {items.map((item) => {
                          const toothNum = item?.toothNum ?? "";
                          const diagnose = item?.diagnose ?? "";
                          return (
                            <div
                              className="dental-tooth-row"
                              key={`tooth-${section.key}-${item._index}`}
                            >
                              <span className="dental-tooth-label">Tooth</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="dental-tooth-num"
                                value={toothNum}
                                ref={(el) => {
                                  const key = `${item._index}-toothNum`;
                                  if (el) toothInputRefs.current[key] = el;
                                  else delete toothInputRefs.current[key];
                                }}
                                onChange={(e) =>
                                  updateDentalToothEntry(
                                    item._index,
                                    "toothNum",
                                    e.target.value
                                  )
                                }
                              />
                              <span className="dental-tooth-sep">:</span>
                              <input
                                type="text"
                                className="dental-tooth-diagnose"
                                value={diagnose}
                                ref={(el) => {
                                  const key = `${item._index}-diagnose`;
                                  if (el) toothInputRefs.current[key] = el;
                                  else delete toothInputRefs.current[key];
                                }}
                                onChange={(e) =>
                                  updateDentalToothEntry(
                                    item._index,
                                    "diagnose",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          className="btn dental-add-tooth"
                          onClick={() => addDentalToothEntry(section.key)}
                        >
                          Add Tooth
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="dental-table-title">TREATMENT PLAN(S)</div>
              <table className="dental-table dental-treatment-table">
                <thead>
                  <tr>
                    <th>S NO</th>
                    <th>TREATMENT</th>
                    <th>TOOTH NUMBER</th>
                    <th>RATE</th>
                    <th>COUNT</th>
                    <th>ESTIMATE</th>
                  </tr>
                </thead>
                <tbody>
                  {dentalTreatmentPlans?.items?.length > 0 &&
                    dentalTreatmentPlans.items.map((row, index) => (
                      <tr key={`dental-plan-${index}`}>
                        <td>
                          <input
                            type="text"
                            className="dental-table-input"
                            value={row?.srno ?? index + 1}
                            onChange={(e) =>
                              updateDentalTreatmentItem(
                                index,
                                "srno",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="dental-table-input"
                            value={row?.treatment ?? ""}
                            onChange={(e) =>
                              updateDentalTreatmentItem(
                                index,
                                "treatment",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="dental-table-input"
                            value={row?.toothNum ?? ""}
                            onChange={(e) =>
                              updateDentalTreatmentItem(
                                index,
                                "toothNum",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="dental-table-input"
                            value={row?.rate ?? ""}
                            onChange={(e) =>
                              updateDentalTreatmentItem(
                                index,
                                "rate",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="dental-table-input"
                            value={row?.count ?? ""}
                            onChange={(e) =>
                              updateDentalTreatmentItem(
                                index,
                                "count",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="dental-table-input"
                            value={row?.estimate ?? ""}
                            onChange={(e) =>
                              updateDentalTreatmentItem(
                                index,
                                "estimate",
                                e.target.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="dental-table-actions">
                <button
                  type="button"
                  className="btn btn-outline-digitise"
                  onClick={addDentalTreatmentRow}
                >
                  Add Row
                </button>
              </div>

              <div className="dental-table-title">WORK DONE</div>
              <table className="dental-table dental-workdone-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>WORK DONE</th>
                    <th>PTR</th>
                    <th>PAYMENT</th>
                    <th>BALANCE</th>
                    <th>REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {dentalWorkDoneItems.length > 0 &&
                    dentalWorkDoneItems.map((row, index) => (
                      <tr key={`dental-workdone-${index}`}>
                        <td>
                          <input
                            type="text"
                            className="dental-table-input"
                            value={row?.date ?? ""}
                            onChange={(e) =>
                              updateDentalWorkDoneItem(index, "date", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <textarea
                            className="dental-table-input dental-textarea"
                            value={buildWorkDoneText(row)}
                            onChange={(e) =>
                              updateDentalWorkDoneItem(index, "workDone", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="dental-table-input"
                            value={row?.ptr ?? ""}
                            onChange={(e) =>
                              updateDentalWorkDoneItem(index, "ptr", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="dental-table-input"
                            value={row?.payment ?? ""}
                            onChange={(e) =>
                              updateDentalWorkDoneItem(index, "payment", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="dental-table-input"
                            value={row?.balance ?? ""}
                            onChange={(e) =>
                              updateDentalWorkDoneItem(index, "balance", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <textarea
                            className="dental-table-input dental-textarea"
                            value={row?.remarks ?? ""}
                            onChange={(e) =>
                              updateDentalWorkDoneItem(index, "remarks", e.target.value)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="dental-table-actions">
                <button
                  type="button"
                  className="btn btn-outline-digitise"
                  onClick={addDentalWorkDoneRow}
                >
                  Add Row
                </button>
              </div>
              {dentalWorkDone?.notes?.length > 0 ? (<table className="dental-table dental-workdone-notes-table">
                <tbody>
                  <tr>
                    <td className="dental-label-cell">WORK DONE NOTES</td>
                    <td>
                      <textarea
                        className="dental-table-input dental-textarea"
                        value={dentalWorkDone?.notes ?? ""}
                        onChange={(e) => updateDentalWorkDoneNotes(e.target.value)}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>): null}
            </div>
          )}
          {hasValidContent("vitalsAndBodyComposition") && (
            <VitalsRichTextEditor
              vitalsAndBodyComposition={sectionData.vitalsAndBodyComposition || {}}
              onUpdate={(vitalsObj) => setData((prev) => ({ ...prev, vitalsAndBodyComposition: vitalsObj }))}
              isProcessing={loading}
              isVoiceAmbientFlow={!!patient_data}
              patient_data={patient_data}
              vitalsFlow={vitalsFlow}
            />
          )}

          {showMedicalHistorySection && (
            <MedicalHistoryRichTextEditor
              medicalHistory={data?.medicalHistory || []}
              onUpdate={(arr) => setData((prev) => ({ ...prev, medicalHistory: arr || [] }))}
              isProcessing={loading}
              isVoiceAmbientSnapSmartFlow={!skipAutoLabResultsLogic}
              patient_data={patient_data}
            />
          )}

          {(sectionData.gynecHistory && Object.keys(sectionData.gynecHistory).length > 0) || patient_data ? (
            <GynecHistoryRichTextEditor
              gynecHistory={sectionData.gynecHistory || {}}
              onUpdate={(gynec) => setData((prev) => ({ ...prev, gynecHistory: gynec || {} }))}
              isProcessing={loading}
              showWhenEmpty={!!patient_data}
            />
          ) : null}

          {data?.symptoms && hasValidContent("symptoms") && (
            <SymptomsRichTextEditor
              symptoms={data.symptoms}
              onUpdate={(arr) => setData((prev) => ({ ...prev, symptoms: arr || [] }))}
              isProcessing={loading}
            />
          )}

          {data?.surgeries && hasValidContent("surgeries") && (
            <SurgeriesRichTextEditor
              surgeries={data.surgeries}
              onUpdate={(arr) => setData((prev) => ({ ...prev, surgeries: arr || [] }))}
              isProcessing={loading}
            />
          )}

          {(sectionData.examinations?.length > 0) && hasValidContent("examinations") && (
            <ExaminationRichTextEditor
              examinations={sectionData.examinations}
              onUpdate={(arr) => setData((prev) => ({ ...prev, examinations: arr || [] }))}
              isProcessing={loading}
            />
          )}

          {data?.diagnosis && hasValidContent("diagnosis") && (
            <DiagnosisRichTextEditor
              diagnosis={data.diagnosis}
              onUpdate={(arr) => setData((prev) => ({ ...prev, diagnosis: arr || [] }))}
              isProcessing={loading}
            />
          )}

          {((sectionData.medications?.length > 0 && hasValidContent("medications")) || (!skipAutoLabResultsLogic && isMedInvestigationOn)) && !hasDentalMedications && (
              <MedicationsTable
                medications={sectionData.medications || []}
                onUpdate={handleMedicationsUpdate}
                isProcessing={false}
                isMedInvestigationFeatureOn={isMedInvestigationOn}
              />
            )}

          {((sectionData.labInvestigation?.length > 0) || (!skipAutoLabResultsLogic && isMedInvestigationOn)) && (
              <LabInvestigationTable
                labInvestigation={sectionData.labInvestigation || []}
                onUpdate={handleInvestigationUpdate}
                isProcessing={false}
                isMedInvestigationFeatureOn={isMedInvestigationOn}
              />
            )}

          {data?.advice && hasValidContent("advice") && (
            <AdviceRichTextEditor
              advice={normalizeAdvice(data.advice)}
              onUpdate={(arr) => setData((prev) => ({
                ...prev,
                advice: (arr || []).map((a) => (typeof a === "string" ? a : (a?.lineItem ?? ""))).filter((s) => String(s).trim() !== ""),
              }))}
              isProcessing={loading}
            />
          )}

          {data?.vaccinations && hasValidContent("vaccinations") && (
            <VaccinationsRichTextEditor
              vaccinations={data.vaccinations}
              onUpdate={(arr) => setData((prev) => ({ ...prev, vaccinations: arr || [] }))}
              isProcessing={loading}
            />
          )}

          {(data?.followUp || hasValidContent("followUp")) && (
            <FollowUpRichTextEditor
              followUp={typeof data.followUp === "string" ? data.followUp : ""}
              onUpdate={(text) => setData((prev) => ({ ...prev, followUp: text || "" }))}
              isProcessing={loading}
            />
          )}

          {showLabResultsSection && (
              <LabResultsRichTextEditor
                labResults={data?.labResults ?? data?.lab_results ?? []}
                onUpdate={labResultsUpdater}
                isProcessing={loading}
                patient_data={patient_data}
                skipAutoFetchAndMerge={skipAutoLabResultsLogic}
                enableLabPrefillFromVoiceSnapSmart={!skipAutoLabResultsLogic}
              />
            )}

          <>
            {Object.entries(dynamicFieldsObject).map(([moduleName, moduleData]) => {
              const hasContent = Array.isArray(moduleData) && moduleData.length > 0;
              if (!hasContent) return null;
              const isLocalModule = (localModules || []).includes(moduleName);
              return (
                <CustomModuleRichTextEditor
                  key={moduleName}
                  moduleName={moduleName}
                  moduleData={moduleData || []}
                  onUpdate={(moduleArray) => handleCustomModuleUpdate(moduleName, moduleArray)}
                  onDelete={(module) => {
                    setModuleToDelete(module);
                    setIsDeleteModuleModalOpen(true);
                  }}
                  onEdit={(module) => {
                    setEditingModule(module);
                    setUpdatedModuleName(module);
                  }}
                  isProcessing={isProcessing}
                  isLocalModule={isLocalModule}
                  editingModule={editingModule}
                  updatedModuleName={updatedModuleName}
                  onEditNameChange={setUpdatedModuleName}
                  onEditSave={() => handleEditModule(editingModule)}
                  onEditCancel={handleCancelEdit}
                />
              );
            })}
          </>

          {data?.others && hasValidContent("others") && (
            <AdditionalNotesRichTextEditor
              others={data.others}
              onUpdate={(arr) => setData((prev) => ({ ...prev, others: arr || [] }))}
              isProcessing={loading}
            />
          )}
          </>
        </div>
      )}
      {moduleToDelete != null && (
        <CommonModal
          isModalOpen={isDeleteModuleModalOpen}
          onCancel={toggleDeleteModuleModal}
          modalWidth={550}
          title="Are you sure you want to delete this module?"
          modalBody={
            <>
              <div className="d-flex align-items-start alert-warning rounded-10px p-3 patient-details">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  This action will permanently delete the {moduleToDelete} and cannot be undone. Please confirm to proceed
                </span>
              </div>
              <div className="mt-4">
                <div className="d-flex align-items-center mt-2 justify-content-end">
                  <div onClick={handleDeleteModule} className="me-4 text-decoration-underline btn p-0 text-main">
                    Yes, Delete
                  </div>
                  <Button onClick={toggleDeleteModuleModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                    <span>No</span>
                  </Button>
                </div>
              </div>
            </>
          }
        />
      )}
      {showAddMedicinePopup && (
        <CustomMedicinePopup
          isOpen={showAddMedicinePopup}
          onCancel={() => setShowAddMedicinePopup(false)}
          initialData={{ tmm_medicine_name: searchParentQuery }}
        />
      )}
    </>
  );
};

export default DigitisedPrescription;
