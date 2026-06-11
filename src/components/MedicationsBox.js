import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from "react";
import { AutoComplete, Input, Button, Form, Row, Col, Select, Popover, Tabs, Spin, Tooltip, Drawer, message, Switch, Tour } from "antd";
import { InfoCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import CommonModal from '../common/CommonModal';

import CashManagerContext from '../context/CashManagerContext';
import { errorMessage, onlyNumberFormat, removeBeforeWhiteSpace, frequencyFormat, frequencyCombination, isNumeric, onlyDecimalFormat, capitalizeAfterSentence, replaceCommasAndSemicolons, capitalize, hasNumber, isAlphabetExit, calculateDose, getClinicName, capitalizeFirstWordOnly, getHmTypeIndicator } from "../utils/utils";

import { MenuOutlined } from '@ant-design/icons';

import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useChikitsalay } from "../pages/chikitsalay/useChikitsalay";
import { useTabletViewport } from "../hooks/useTabletViewport";

import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getMedicationTemplates,
  getFrequentlySearchedMedication,
  searchMedication,
  singleTemplateDetails,
  getMedicineDetails,
  getLoadPreviousRx,
  searchGeneric,
  addMedicine,
  editMedicine,
  updateFrequentlyMedication,
  getAllDoses
} from "../redux/medicationSlice";
import { EXTRA_OPTIONS, GB_PILLUP_MEDICINE, GB_ZYDUS_USER, MESSAGE_KEY, NEO_NATOLOGISTS_DP_ID } from "../utils/constants";
import { getDecodedToken } from "../utils/localStorage";
import { env } from "../EnvironmentConfig";

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import DoseCalculator from "./dose_calculator/doseCalculator";
import { upsertDoctorSettingFlag } from "../redux/doctorsSlice";
import FreeBadge from "../common/FreeBadge";
import { ASSETS } from "../assets";
import { Grid5, Trash } from "iconsax-reactjs";
import {
  VOICE_MODULE_DUMMY_DIGITISED_DATA,
  VoiceRxModuleActionButton,
  VoiceRxModuleButton,
  VoiceRxModuleCapture,
  moduleRowsToPreviousContext,
  useVoiceRxModuleCapture,
} from "./dr-agent/voicerx/VoiceRxModuleCapture";
import voiceModuleStyles from "./dr-agent/voicerx/VoiceRxModuleCapture.module.scss";
const {
  alerticon: alertIcon,
  medication: Medicationicon,
  timinginfo: TimingInfo,
  noRecordRound: noRecordFound,
  calculator: calculatorIcon,
  calculatorBlue: calculatorIconBlue,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
  tagNew,
  pillup: Pillup,
  eazydoseLogo: EazyDoseLogo,
} = ASSETS.images;

const { TextArea } = Input;

const hasMedicineMasterId = (tmmId) => (
  tmmId !== undefined &&
  tmmId !== null &&
  String(tmmId).trim() !== "" &&
  Number(tmmId) !== 0
);

const getMedicationGroupKey = (item) => {
  if (hasMedicineMasterId(item?.tmm_id)) return `tmm:${item.tmm_id}`;
  return `voice:${item?.voice_rx_group_id || item?.unique_id || ""}`;
};

const getRawMedicineFrequencyText = (medicine) => (
  [
    medicine?.frequency,
    medicine?.freq,
    medicine?.frequencyText,
    medicine?.frequency_text,
    medicine?.tmm_freq_type_name,
  ].find((value) => value !== undefined && value !== null && String(value).trim() !== "") || ""
);

const getRawMedicineScheduleText = (medicine) => (
  [
    medicine?.schedule,
    medicine?.when,
    medicine?.timing,
    medicine?.tmm_time_name,
  ].find((value) => value !== undefined && value !== null && String(value).trim() !== "") || ""
);

const isNumericMedicineFrequencyText = (value) => /^(?!-)[\d.\s-]+$/.test(String(value || "").trim());

const isExactMedicineFrequencyTitle = (value, frequencyList = []) => {
  const text = String(value || "").trim();
  if (!text) return false;
  return frequencyList.some(
    (item) => item?.tmf_block !== 0 && String(item?.tmf_title || "").trim() === text
  );
};

const findExactMedicineTiming = (value, timingList = []) => {
  const text = String(value || "").trim();
  if (!text || text === "None") return null;
  return timingList.find(
    (item) => String(item?.tmt_title || "").trim().toLowerCase() === text.toLowerCase()
  ) || null;
};

const appendMedicineTextToNotes = (notes, value) => {
  const current = String(notes || "").trim();
  const text = String(value || "").trim();
  if (!text || current.includes(text)) return current;
  return current ? `${current} | ${text}` : text;
};

const appendMedicineFrequencyToNotes = (notes, frequency) => {
  return appendMedicineTextToNotes(notes, frequency);
};

const appendMedicineScheduleToNotes = (notes, schedule) => {
  return appendMedicineTextToNotes(notes, schedule);
};

const moveUnmatchedMedicineFrequenciesToNotes = (rows = [], frequencyList = []) => rows.map((row) => {
  const rawFrequency = getRawMedicineFrequencyText(row);
  if (!rawFrequency) return row;

  const normalizedFrequency = String(row?.tmm_freq_type_name || "").trim();
  const canUseFrequencyField =
    isNumericMedicineFrequencyText(normalizedFrequency) ||
    isExactMedicineFrequencyTitle(rawFrequency, frequencyList) ||
    isExactMedicineFrequencyTitle(normalizedFrequency, frequencyList);

  if (canUseFrequencyField) return row;

  return {
    ...row,
    tmm_freq_type_name: "",
    tmm_freq_type: 0,
    tmf_block: 0,
    tmf_block_val: "",
    tcm_tmm_freq_morning: 0,
    tcm_tmm_freq_afternoon: 0,
    tcm_tmm_freq_evening: 0,
    tcm_tmm_freq_night: 0,
    tmm_remarks: appendMedicineFrequencyToNotes(row?.tmm_remarks || row?.notes || row?.note, rawFrequency),
  };
});

const moveUnmatchedMedicineSchedulesToNotes = (rows = [], timingList = []) => rows.map((row) => {
  const rawSchedule = getRawMedicineScheduleText(row);
  if (!rawSchedule || String(rawSchedule).trim() === "None") return row;

  const timingObj = findExactMedicineTiming(rawSchedule, timingList);
  if (timingObj) {
    return {
      ...row,
      tmm_time: timingObj.tmt_id,
      tmm_time_name: timingObj.tmt_title,
    };
  }

  return {
    ...row,
    tmm_time: 0,
    tmm_time_name: "",
    tmm_remarks: appendMedicineScheduleToNotes(row?.tmm_remarks || row?.notes || row?.note, rawSchedule),
  };
});

const isVoiceRxUngroundedMedication = (item) => (
  !!item?.voice_rx_from_module && !hasMedicineMasterId(item?.tmm_id)
);

const VOICE_RX_SOURCE_TOOLTIP_STYLE = {
  background: "#2f2e39",
  borderRadius: 8,
  color: "#fff",
  fontSize: 14,
  lineHeight: 1.35,
  maxWidth: 360,
  padding: "12px 16px",
  textAlign: "center",
};

const FALLBACK_MEDICINE_UNITS = [
  "Ampule(s)",
  "Tablet(s)",
  "mg",
  "ml",
  "unit(s)",
  "Capsule(s)",
  "Fingertip(s)",
  "Pea sized",
  "gm",
  "palm sized",
  "tsp",
  "Kit(s)",
  "Drop(s)",
  "Spray",
  "Sachet(s)",
  "Cup(s)",
  "Scoop(s)",
  "Suppository(s)",
  "Soap(s)",
  "Bottle(s)",
  "patch(s)",
  "Respule(s)",
  "Puff(s)",
  "mcg",
  "tbsp(s)",
  "Globule(s)",
  "Pill(s)",
  "Containers",
  "Liniment(s)",
  "transcap(s)",
  "I/V",
  "I/M",
].map((title, index) => ({ tmu_id: 0, tmu_title: title, fallbackIndex: index }));

const getDoseUnitOptions = (medicine) => {
  const medicineUnits = Array.isArray(medicine?.medicineUnit) ? medicine.medicineUnit : [];
  if (medicineUnits.length > 0) return medicineUnits;

  const currentUnitTitle = String(medicine?.tmm_unit_name || "").trim();
  const currentUnit = currentUnitTitle
    ? [{
      tmu_id: medicine?.tmu_id || medicine?.tmm_unit || 0,
      tmu_title: currentUnitTitle,
      fallbackIndex: -1,
    }]
    : [];
  const seen = new Set();
  return [...currentUnit, ...FALLBACK_MEDICINE_UNITS].filter((unit) => {
    const key = String(unit?.tmu_title || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function MedicationsBox({ showVoiceRxModule }) {
  const isChikitsalayAccessable = useChikitsalay();
  const renderLowStockBadge = useCallback((med) => {
    if (!isChikitsalayAccessable) return null;
    const available = Number(med?.quantity);
    if (!Number.isFinite(available)) return null;

    let label = null;
    if (available <= 0) {
      label = "No stock";
    } else {
      const required = 200;
      if (available <= required) {
        label = `Qty: ${available}`;
      }
    }

    if (!label) return null;
    const isQtyLabel = label.startsWith("Qty:");
    return (
      <h6
        className="ms-2"
        style={{
          padding: "2px 8px",
          borderRadius: 6,
          background: isQtyLabel ? "#FC5A5A" : "#ED8A00",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          display: "inline-block",
          lineHeight: "16px",
        }}
      >
        {label}
      </h6>
    );
  }, [isChikitsalayAccessable]);

  const renderHmTypeBadge = useCallback(
    (med) => {
      const ind = getHmTypeIndicator(med, isChikitsalayAccessable);
      if (!ind) return null;
      const wide = ind.length > 1;
      return (
        <span
          className={`align-items-center small fs-12-1 d-inline-flex justify-content-center text-white ${
            wide ? "rounded-pill" : "rounded-circle"
          }`}
          style={{
            minWidth: wide ? 26 : 18,
            height: 18,
            padding: wide ? "0 6px" : "0 4px",
            background: "#c44ea2",
            lineHeight: "16px",
          }}
        >
          {ind}
        </span>
      );
    },
    [isChikitsalayAccessable]
  );

  const { profile, frequencyList, timingList, medicineTypeList } = useSelector((state) => state.doctors);
  const {
    dosesList,
    selectedMedicationList,
    parentOptionsList,
    templates,
    genericList,
    loading,
  } = useSelector((state) => state.medication);
  const { todayData } = useSelector((state) => state.vitals);
  const dispatch = useDispatch();

  const { patient_data, medicationData, setMedicationData, pillupSwitch, setPillupSwitch, tcmId } = useContext(CashManagerContext);
  const applyVoiceMedication = useCallback((nextMedicines) => {
    const normalizedMedicines = moveUnmatchedMedicineSchedulesToNotes(
      moveUnmatchedMedicineFrequenciesToNotes(nextMedicines, frequencyList),
      timingList
    );
    if (normalizedMedicines.length > 0) {
      setMedicationData(normalizedMedicines);
    }
  }, [frequencyList, setMedicationData, timingList]);
  const medicationVoicePreviousContext = useMemo(
    () => moduleRowsToPreviousContext(medicationData, "medications"),
    [medicationData]
  );
  const {
    voiceCaptureOpen,
    setVoiceCaptureOpen,
    voiceUpdated,
    handleVoiceCaptureComplete,
    sectionRef,
  } = useVoiceRxModuleCapture({
    moduleName: "Medication (Rx)",
    onApply: applyVoiceMedication,
    successMessage: "Medication (Rx) filled from voice dictation",
    copyPayloadKeys: ["medications"],
  });

  //PopOver1
  const [popOver1, setPopOver1] = useState(false);
  const [allTemplates, setAllTemplates] = useState([]);
  const [matchedTemplates, setMatchedTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [removeTemplateId, setRemoveTemplateId] = useState(null);

  const [searchParentQuery, setSearchParentQuery] = useState("");
  const [parentSearchOptions, setParentSearchOptions] = useState([]);
  const [voiceMedicineEdit, setVoiceMedicineEdit] = useState({ index: null, query: "" });

  const [unitPerDoseOptions, setUnitPerDoseOptions] = useState([]);
  const [frequencyOptions, setFrequencyOptions] = useState([]);
  const [sinceOptions, setSinceOptions] = useState(EXTRA_OPTIONS);
  const [tourOpen, setTourOpen] = useState(false);
  const [popOver3, setPopOver3] = useState(false);
  const SINCE_OPTIONS = [
    { value: "Day(s)", label: "Days" },
    { value: "Week(s)", label: "Weeks" },
    { value: "Month(s)", label: "Months" },
    { value: "Year(s)", label: "Years" },
  ];

  //PopOver2
  const [popOver2, setPopOver2] = useState(false);
  const [inputTemplateName, setInputTemplateName] = useState(null);
  const TAB_ADD_TEMPLATE = 1;
  const TAB_UPDATE_TEMPLATE = 2;
  const ADD_EDIT_TEMPLATE_TABS = [
    { key: TAB_ADD_TEMPLATE, label: "New Template" },
    { key: TAB_UPDATE_TEMPLATE, label: "Update Template" },
  ];
  const [tabChange, setTabChange] = useState(TAB_ADD_TEMPLATE);

  //Add Custom
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false);
  const [addCustom, setAddCustom] = useState(null);
  const [genericQuery, setGenericQuery] = useState('');

  //Dose Calculator
  const [activeTab, setActiveTab] = useState("1");
  const [doseCalculatorDrawer, setDoseCalculatorDrawer] = useState(false);
  const [searchMLQuery, setSearchMLQuery] = useState("");
  const [medicationLibrary, setMedicationLibrary] = useState([]);
  const [editDoseId, setEditDoseId] = useState(0);
  const [isModalOpen2, setIsModalOpen2] = useState(false);

  const isPillUpAccessableFromGB = useFeatureIsOn(GB_PILLUP_MEDICINE);
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const tokenData = getDecodedToken()?.result;
  const isZydusAccount = isZydusUserAccessableFromGB && tokenData?.hospital_business_id == env.zydus_business_id;
  const isVoiceRxModuleEnabled = Boolean(showVoiceRxModule);
  const isTablet = useTabletViewport();
  const prescriptionNewTabletOverlayZIndex = isVoiceRxModuleEnabled && isTablet ? 1305 : undefined;
  const hasUngroundedMedications = isZydusAccount && medicationData.some(isVoiceRxUngroundedMedication);
  const getMedicationPopupProps = useCallback(
    (popupClassName = "") => {
      if (!isVoiceRxModuleEnabled) {
        return popupClassName ? { popupClassName } : {};
      }
      return {
        popupMatchSelectWidth: false,
        popupClassName: [popupClassName, voiceModuleStyles.medicationWideDropdown]
          .filter(Boolean)
          .join(" "),
      };
    },
    [isVoiceRxModuleEnabled]
  );

  const handleViewDoseCalcDrawer = (tab, value) => {
    setDoseCalculatorDrawer(!doseCalculatorDrawer)
    setActiveTab(typeof tab == 'string' ? tab : '1')
    setEditDoseId(isNumeric(value) ? value : 0)
    setSearchMLQuery("")
    setMedicationLibrary([])
    setAddCustom(null)
  }

  useEffect(() => {
    dispatch(getMedicationTemplates());
    dispatch(getAllDoses())
  }, []);

  useEffect(() => {
    setMatchedTemplates(templates);
    setAllTemplates(templates);
  }, [templates]);

  //Parent AutoComplete
  const activeVoiceMedicineQuery = voiceMedicineEdit.index !== null ? voiceMedicineEdit.query : "";

  useEffect(() => {
    if (searchParentQuery || searchMLQuery || activeVoiceMedicineQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchMedication({
            searchQuery: doseCalculatorDrawer
              ? searchMLQuery
              : activeVoiceMedicineQuery || searchParentQuery,
            type: "parent",
            isChikitsalayAccessable,
          })
        );
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      dispatch(getFrequentlySearchedMedication({ isChikitsalayAccessable }));
    }
  }, [activeVoiceMedicineQuery, doseCalculatorDrawer, isChikitsalayAccessable, searchMLQuery, searchParentQuery]);

  useEffect(() => {
    const data = [];
    parentOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e, unique_id: uuidv4() }),
        value: e.tmm_medicine_name,
        label: (
          <div>
            <span className="fw-medium">{e.tmm_medicine_name}</span>, <span>{e.tmm_generic}</span>
            {renderHmTypeBadge(e)}
            <FreeBadge show={e?.is_free} />
            {renderLowStockBadge(e)}
          </div>
        ),
      });
    });
    const activeSearchQuery = doseCalculatorDrawer
      ? searchMLQuery
      : activeVoiceMedicineQuery || searchParentQuery;

    if (doseCalculatorDrawer) {
      if (searchMLQuery.length == 0) {
        data.unshift({
          key: -1,
          label: (
            <>
              <div>FREQUENTLY USED</div>
            </>
          ),
        });
      } else {
        searchMLQuery &&
          data.push({
            key: JSON.stringify({
              unique_id: uuidv4(),
              tmm_id: 0,
              tmm_medicine_name: searchMLQuery
            }),
            value: `${searchMLQuery}${Math.random()}`,
            label: (
              <>
                <div className="text-primary fontroboto fs-16"> <i className="icon-Add mx-1 fs-6"></i> Add <span className="fw-medium fontroboto text-primary">"{searchMLQuery}"</span> <a className="text-primary fontroboto">as a new medicine</a></div>
              </>
            ),
          });
      }
    } else {
      if (activeSearchQuery.length == 0) {
        data.unshift({
          key: -1,
          label: (
            <>
              <div>FREQUENTLY USED</div>
            </>
          ),
        });
      } else {
        activeSearchQuery &&
          data.push({
            key: JSON.stringify({
              unique_id: uuidv4(),
              tmm_id: 0,
              tmm_medicine_name: activeSearchQuery
            }),
            value: `${activeSearchQuery}${Math.random()}`,
            label: (
              <>
                <div className="text-primary fontroboto fs-16"> <i className="icon-Add mx-1 fs-6"></i> Add <span className="fw-medium fontroboto text-primary">"{activeSearchQuery}"</span> <a className="text-primary fontroboto">as a new medicine</a></div>
              </>
            ),
          });
      }
    }
    setParentSearchOptions(data);
  }, [activeVoiceMedicineQuery, doseCalculatorDrawer, parentOptionsList, renderHmTypeBadge, renderLowStockBadge, searchMLQuery, searchParentQuery]);

  const onSearchParent = useCallback(
    (query) => {
      doseCalculatorDrawer ?
        setSearchMLQuery(removeBeforeWhiteSpace(query)) :
        setSearchParentQuery(removeBeforeWhiteSpace(query));
    },
    [doseCalculatorDrawer, searchMLQuery, searchParentQuery]
  );

  const handleParentSearch = (value) => {
    onSearchParent(value);
    // Reset dropdown scroll to top whenever the search query changes
    setTimeout(() => {
      const dropdown =
        document.querySelector(
          ".medicine-parent-autocomplete-dropdown .rc-virtual-list-holder"
        ) ||
        document.querySelector(
          ".medicine-parent-autocomplete-dropdown .ant-select-dropdown"
        );

      if (dropdown) {
        dropdown.scrollTop = 0;
      }
    }, 0);
  };

  const handleVoiceMedicineClick = (item) => {
    if (!isVoiceRxModuleEnabled) return;
    if (!isVoiceRxUngroundedMedication(item)) return;
    const query = item.tmm_medicine_name || "";
    setVoiceMedicineEdit({
      index: item.index,
      query,
    });
    dispatch(searchMedication({
      searchQuery: query,
      type: "parent",
      isChikitsalayAccessable,
    }));
  };

  const handleVoiceMedicineSearch = (query, index) => {
    setVoiceMedicineEdit({ index, query: removeBeforeWhiteSpace(query) });
  };

  const handleVoiceMedicineBlur = () => {
    window.setTimeout(() => {
      setVoiceMedicineEdit({ index: null, query: "" });
    }, 150);
  };

  const onSelectVoiceMedicine = async (data, item, index) => {
    const keyParsed = JSON.parse(item.key);
    if (keyParsed.tmm_id === 0) {
      showHideAddMedicineModal();
      setAddCustom(keyParsed);
      setVoiceMedicineEdit({ index: null, query: "" });
      return;
    }

    window.Moengage.track_event("medicine_select", {
      value: keyParsed.tmm_medicine_name
    });

    const action = await dispatch(getMedicineDetails(keyParsed.tmm_id));
    if (action.meta.requestStatus !== "fulfilled") {
      errorMessage(action.error);
      return;
    }

    const current = medicationData[index];
    const selected = action.payload?.[0] || keyParsed;
    medicationData[index] = {
      ...current,
      ...selected,
      objectID: keyParsed.objectID,
      quantity: keyParsed.quantity,
      tmm_hm_type: selected.tmm_hm_type ?? keyParsed.tmm_hm_type,
      um_id: selected.um_id ?? keyParsed.um_id,
      tmm_dosage: current.tmm_dosage,
      tmm_dosage_unit_name: current.tmm_dosage_unit_name,
      tmm_unit: current.tmm_unit,
      tmm_unit_name: current.tmm_unit_name,
      tmu_id: current.tmu_id,
      tmm_freq_type_name: current.tmm_freq_type_name,
      tmf_block_val: current.tmf_block_val,
      tcm_tmm_freq_morning: current.tcm_tmm_freq_morning,
      tcm_tmm_freq_afternoon: current.tcm_tmm_freq_afternoon,
      tcm_tmm_freq_evening: current.tcm_tmm_freq_evening,
      tcm_tmm_freq_night: current.tcm_tmm_freq_night,
      tmm_time: current.tmm_time,
      tmm_time_name: current.tmm_time_name,
      tmm_days: current.tmm_days,
      tmm_duration_type: current.tmm_duration_type,
      tmm_days_duration_type: current.tmm_days_duration_type,
      tmm_remarks: current.tmm_remarks,
      unique_id: current.unique_id,
      voice_rx_from_module: false,
    };
    setMedicationData((prev) => [...prev]);
    setVoiceMedicineEdit({ index: null, query: "" });
  };

  const onSelectParent = async (data, item) => {
    if (JSON.parse(item.key).tmm_id === 0) {
      showHideAddMedicineModal()
      setAddCustom(JSON.parse(item.key));
    } else {
      window.Moengage.track_event("medicine_select", {
        "value": JSON.parse(item.key).tmm_medicine_name
      });

      if (doseCalculatorDrawer) {
        const medicineExists = medicationLibrary.some((med) => med.tmm_id == JSON.parse(item.key).tmm_id);

        if (medicineExists) {
          message.open({
            key: MESSAGE_KEY,
            type: '',
            className: 'message-appointment',
            content: (
              <div className='d-flex align-items-center'>
                <InfoCircleOutlined className="fs-21 me-2 circle-outlined-custom" />
                <div>
                  <div className='text-start fs-18 fontroboto'>This medicine is already added. You can't add it again</div>
                </div>
                <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
              </div>
            ),
            duration: 3,
          });
          return;
        }
      }

      const keyParsed = JSON.parse(item.key);
      const action = await dispatch(getMedicineDetails(keyParsed.tmm_id));
      if (action.meta.requestStatus === "fulfilled") {
        const updatedData = action.payload.map((e) => {

          const unitObj = e?.medicineUnit ? e?.medicineUnit.find((x) => x.tmu_id == e.tmm_unit) : null;
          const frequencyObj = frequencyList.find((x) => x.tmf_id == e.tmm_freq_type);
          const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

          let doseCalData = {}
          const objDose = dosesList.find((e1) => e1.medicine_id == e.tmm_id)
          if (objDose !== undefined) {
            const dose = calculateDose(objDose?.dosage, todayData?.weight, objDose?.concentration, e?.tmm_type)
            doseCalData['tmm_dosage_unit_name'] = `${dose ? `${dose} ${unitObj && unitObj !== undefined ? unitObj.tmu_title : ""}` : ""}`;
            doseCalData['tmm_dosage'] = dose ? dose : "";
            doseCalData['tmm_unit_name'] = unitObj && unitObj !== undefined ? unitObj.tmu_title : "";
            doseCalData['tmm_unit'] = unitObj && unitObj !== undefined ? unitObj.tmu_id : "";
            doseCalData['tmu_id'] = unitObj && unitObj !== undefined ? unitObj.tmu_id : "";
          } else {
            doseCalData['tmm_dosage_unit_name'] = `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? unitObj.tmu_title : ""}` : ""}`;
            doseCalData['tmm_unit_name'] = unitObj && unitObj !== undefined ? unitObj.tmu_title : "";
          }

          let tmm_freq_type_name = e.tmf_block == 0
                ? `${e.tcm_tmm_freq_morning && e.tcm_tmm_freq_morning != 0
                  ? e.tcm_tmm_freq_morning + " - "
                  : "0 -"
                }${e.tcm_tmm_freq_afternoon && e.tcm_tmm_freq_afternoon != 0
                  ? e.tcm_tmm_freq_afternoon + " - "
                  : "0 -"
                }${e.tcm_tmm_freq_evening && e.tcm_tmm_freq_evening != 0
                  ? e.tcm_tmm_freq_evening + " - "
                  : ""
                }${e.tcm_tmm_freq_night && e.tcm_tmm_freq_night != 0
                  ? e.tcm_tmm_freq_night
                  : "0"}`
                : frequencyObj !== undefined
                  ? frequencyObj.tmf_title
                  : "";

          tmm_freq_type_name = tmm_freq_type_name === "0 -0 -0" ? "" : tmm_freq_type_name;

          return {
            ...e,
            objectID: keyParsed.objectID,
            quantity: keyParsed.quantity,
            tmm_hm_type: e.tmm_hm_type ?? keyParsed.tmm_hm_type,
            um_id: e.um_id ?? keyParsed.um_id,
            // tmm_unit_name: unitObj && unitObj !== undefined ? unitObj.tmu_title : "",
            tmm_freq_type_name: tmm_freq_type_name,
            tmf_block_val: frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
            tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
            // tmm_dosage_unit_name: `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? unitObj.tmu_title : ""}` : ""}`,
            tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
            unique_id: uuidv4(),
            ...doseCalData
          };
        });
        if (doseCalculatorDrawer) {
          const modifyData = updatedData[0]
          const objDose = dosesList.find((e1) => e1.medicine_id == modifyData.tmm_id)
          medicationLibrary.push({
            ...modifyData,
            tmm_dosage_unit_name: "",
            tmm_dosage: '',
            tmm_unit: 0,
            tmm_unit_name: '',
            tmu_id: 0,
            id: objDose !== undefined ? objDose?.id : "",
            medicine_id: modifyData.tmm_id,
            dosage: objDose !== undefined ? objDose?.dosage : "",
            dosage_unit: "mg/kg/dose",
            concentration: objDose !== undefined ? objDose?.concentration : "",
            concentration_unit: "mg/ml",
            medicine_name: modifyData.tmm_medicine_name,
            medicine_generic_name: modifyData.tmm_generic,
            exist: dosesList.some((e1) => e1.medicine_id == modifyData.tmm_id) ? true : false
          });
          setMedicationLibrary((prev) => [...prev]);
          setSearchMLQuery("");
          setAddCustom(null);
        } else {
          medicationData.push({
            ...updatedData[0],
          });
          setMedicationData((prev) => [...prev]);
          setSearchParentQuery("");
          setAddCustom(null);
        }

      } else {
        errorMessage(action.error)
      }
    }
  };

  const onSearchUnitPerDoseChid = useCallback(
    (query, i) => {
      if (!medicationData[i]) return;
      const updateQuery = onlyDecimalFormat(query);
      medicationData[i].tmm_dosage_unit_name = updateQuery;
      medicationData[i].tmm_dosage = '';
      medicationData[i].tmm_unit = 0;
      medicationData[i].tmm_unit_name = '';
      medicationData[i].tmu_id = 0;
      setMedicationData((prev) => [...prev]);
      if (updateQuery) {
        const options = getDoseUnitOptions(medicationData[i]).map((e) => {
          return {
            key: JSON.stringify({ ...e, tmm_dosage: updateQuery, unique_id: uuidv4() }),
            value: `${updateQuery} ${e.tmu_title}`,
            label: <>{`${updateQuery} ${e.tmu_title}`}</>,
          };
        });
        setUnitPerDoseOptions(options);
      } else {
        setUnitPerDoseOptions([]);
      }
    },
    [unitPerDoseOptions, medicationData]
  );

  const onBlurUnitPerDoseChid = useCallback(
    async (i) => {
      if (!medicationData[i]) return;
      if (!isAlphabetExit(medicationData[i].tmm_dosage_unit_name)) {
        setUnitPerDoseOptions([]);
        medicationData[i].tmm_dosage_unit_name = "";
        medicationData[i].tmm_dosage = '';
        medicationData[i].tmm_unit = 0;
        medicationData[i].tmm_unit_name = '';
        medicationData[i].tmu_id = 0;
        setMedicationData((prev) => [...prev]);
      }
    },
    [unitPerDoseOptions, medicationData]
  );

  const onSelectUnitPerDoseChild = useCallback(
    (data, e, i) => {
      if (!medicationData[i]) return;
      setUnitPerDoseOptions([]);
      const objParse = JSON.parse(e.key);
      medicationData[i].tmm_dosage_unit_name = data;
      medicationData[i].tmm_dosage = objParse.tmm_dosage;
      medicationData[i].tmm_unit = objParse.tmu_id;
      medicationData[i].tmm_unit_name = objParse.tmu_title;
      medicationData[i].tmu_id = objParse.tmu_id;
      setMedicationData((prev) => [...prev]);
    },
    [unitPerDoseOptions, medicationData]
  );

  // const onSelectSeverityChild = useCallback(
  //   (data, i) => {
  //     if (data) {
  //       const objParse = JSON.parse(data);
  //       medicationData[i].tmm_freq_type = objParse.tmf_id;
  //       medicationData[i].tmm_freq_type_name = objParse.tmf_title;
  //       medicationData[i].tmf_block_val = objParse.tmf_block_val;
  //     } else {
  //       medicationData[i].tmm_freq_type = 0;
  //       medicationData[i].tmm_freq_type_name = '';
  //       medicationData[i].tmf_block_val = 0;
  //     }
  //     setMedicationData((prev) => [...prev]);
  //   },
  //   [medicationData]
  // );

  const filteredTitles = frequencyList.filter((item) => item.tmf_block !== 0);

  const [frequencyQuery, setFrequencyQuery] = useState('');

  const onBlurFrequencyChild = useCallback(
    async (i) => {
      if (isNumeric(frequencyQuery) && frequencyQuery.length <= 3) {
        medicationData[i].tmm_freq_type_name = `${frequencyQuery[0]}-${frequencyQuery[1] ? frequencyQuery[1] : 0}-${frequencyQuery[2] ? frequencyQuery[2] : 0}`;
        medicationData[i].tmf_block = 0;
        medicationData[i].tmm_freq_type = 0;
        medicationData[i].tcm_tmm_freq_afternoon = frequencyQuery[1] ? frequencyQuery[1] : 0;
        medicationData[i].tcm_tmm_freq_evening = 0;
        medicationData[i].tcm_tmm_freq_morning = frequencyQuery[0];
        medicationData[i].tcm_tmm_freq_night = frequencyQuery[2] ? frequencyQuery[2] : 0;
        setMedicationData((prev) => [...prev]);
      } else if (isNumeric(frequencyQuery) && frequencyQuery.length >= 4) {
        medicationData[i].tmm_freq_type_name = `${frequencyQuery[0]}-${frequencyQuery[1] ? frequencyQuery[1] : 0}-${frequencyQuery[2] ? frequencyQuery[2] : 0}-${frequencyQuery[3] ? frequencyQuery[3] : 0}`;
        medicationData[i].tmf_block = 0;
        medicationData[i].tmm_freq_type = 0;
        medicationData[i].tcm_tmm_freq_afternoon = frequencyQuery[1] ? frequencyQuery[1] : 0;
        medicationData[i].tcm_tmm_freq_evening = frequencyQuery[2] ? frequencyQuery[2] : 0;
        medicationData[i].tcm_tmm_freq_morning = frequencyQuery[0];
        medicationData[i].tcm_tmm_freq_night = frequencyQuery[3] ? frequencyQuery[3] : 0;
        setMedicationData((prev) => [...prev]);
      } else if (!frequencyFormat(medicationData[i].tmm_freq_type_name) && filteredTitles.findIndex((x) => x.tmf_title == medicationData[i].tmm_freq_type_name) == -1) {
        medicationData[i].tmm_freq_type_name = "";
        medicationData[i].tmf_block = 0;
        medicationData[i].tmm_freq_type = 0;
        medicationData[i].tcm_tmm_freq_afternoon = 0;
        medicationData[i].tcm_tmm_freq_evening = 0;
        medicationData[i].tcm_tmm_freq_morning = 0;
        medicationData[i].tcm_tmm_freq_night = 0;
        setMedicationData((prev) => [...prev]);
      } else if (frequencyFormat(medicationData[i].tmm_freq_type_name)) {
        medicationData[i].tmm_freq_type_name = frequencyQuery;
        medicationData[i].tmf_block = 0;
        medicationData[i].tmm_freq_type = 0;
        if (frequencyQuery.split("-")[3] !== undefined) {
          medicationData[i].tcm_tmm_freq_afternoon = frequencyQuery.split("-")[1] ? frequencyQuery.split("-")[1] : 0;
          medicationData[i].tcm_tmm_freq_evening = frequencyQuery.split("-")[2] ? frequencyQuery.split("-")[2] : 0;
          medicationData[i].tcm_tmm_freq_morning = frequencyQuery.split("-")[0] ? frequencyQuery.split("-")[0] : 0;
          medicationData[i].tcm_tmm_freq_night = frequencyQuery.split("-")[3] ? frequencyQuery.split("-")[3] : 0;
        } else {
          medicationData[i].tcm_tmm_freq_afternoon = frequencyQuery.split("-")[1] ? frequencyQuery.split("-")[1] : 0;
          medicationData[i].tcm_tmm_freq_evening = 0;
          medicationData[i].tcm_tmm_freq_morning = frequencyQuery.split("-")[0] ? frequencyQuery.split("-")[0] : 0;
          medicationData[i].tcm_tmm_freq_night = frequencyQuery.split("-")[2] ? frequencyQuery.split("-")[2] : 0;
        }
        setMedicationData((prev) => [...prev]);
      }
    },
    [medicationData]
  );

  const onSearchFrequencyChild = useCallback(
    async (query, i) => {
      setFrequencyQuery(query)
      if (query) {

        const data = [];

        const updateQuery = frequencyFormat(query);

        if (updateQuery) {
          const combinationList = await frequencyCombination(query)
          combinationList.map((option) => {
            return data.push({
              value: JSON.stringify({ tmf_id: 0, tmf_title: option, tmf_block: 0, tmf_block_val: "", unique_id: uuidv4() }),
              label: <>{option}</>,
            });
          });
        }

        filteredTitles.map((option) => {
          return data.push({
            value: JSON.stringify({ ...option, unique_id: uuidv4() }),
            label: <>{option.tmf_title}</>,
          });
        });

        setFrequencyOptions(data)

        medicationData[i].tmm_freq_type_name = query;
        medicationData[i].tmf_block = 0;
        medicationData[i].tmm_freq_type = 0;
        medicationData[i].tcm_tmm_freq_afternoon = 0;
        medicationData[i].tcm_tmm_freq_evening = 0;
        medicationData[i].tcm_tmm_freq_morning = 0;
        medicationData[i].tcm_tmm_freq_night = 0;
        setMedicationData((prev) => [...prev]);
      }
    },
    [frequencyOptions, medicationData]
  );

  const onSelectFrequencyChild = useCallback(
    (data, i) => {
      if (data) {
        const objParse = JSON.parse(data);
        setFrequencyQuery(objParse.tmf_title)
        medicationData[i].tmm_freq_type_name = objParse.tmf_title;
        medicationData[i].tmf_block = objParse.tmf_block;
        medicationData[i].tmf_block_val = objParse.tmf_block_val;
        medicationData[i].tmm_freq_type = objParse.tmf_id;
        if (objParse.tmf_title.split("-")[3] !== undefined) {
          medicationData[i].tcm_tmm_freq_afternoon = objParse.tmf_id != 0 ? 0 : objParse.tmf_title.split("-")[1] ? objParse.tmf_title.split("-")[1] : 0;
          medicationData[i].tcm_tmm_freq_evening = objParse.tmf_id != 0 ? 0 : objParse.tmf_title.split("-")[2] ? objParse.tmf_title.split("-")[2] : 0;
          medicationData[i].tcm_tmm_freq_morning = objParse.tmf_id != 0 ? 0 : objParse.tmf_title.split("-")[0] ? objParse.tmf_title.split("-")[0] : 0;
          medicationData[i].tcm_tmm_freq_night = objParse.tmf_id != 0 ? 0 : objParse.tmf_title.split("-")[3] ? objParse.tmf_title.split("-")[3] : 0;
        } else {
          medicationData[i].tcm_tmm_freq_afternoon = objParse.tmf_id != 0 ? 0 : objParse.tmf_title.split("-")[1] ? objParse.tmf_title.split("-")[1] : 0;
          medicationData[i].tcm_tmm_freq_evening = 0;
          medicationData[i].tcm_tmm_freq_morning = objParse.tmf_id != 0 ? 0 : objParse.tmf_title.split("-")[0] ? objParse.tmf_title.split("-")[0] : 0;
          medicationData[i].tcm_tmm_freq_night = objParse.tmf_id != 0 ? 0 : objParse.tmf_title.split("-")[2] ? objParse.tmf_title.split("-")[2] : 0;
        }
      } else {
        setFrequencyQuery("")
        medicationData[i].tmm_freq_type_name = "";
        medicationData[i].tmf_block = 0;
        medicationData[i].tmm_freq_type = 0;
        medicationData[i].tcm_tmm_freq_afternoon = 0;
        medicationData[i].tcm_tmm_freq_evening = 0;
        medicationData[i].tcm_tmm_freq_morning = 0;
        medicationData[i].tcm_tmm_freq_night = 0;
      }
      setMedicationData((prev) => [...prev]);
    },
    [medicationData]
  );

  const onSelectTimingChild = useCallback(
    (data, i) => {
      if (data) {
        const objParse = JSON.parse(data);
        medicationData[i].tmm_time = objParse.tmt_id;
        medicationData[i].tmm_time_name = objParse.tmt_title;
      } else {
        medicationData[i].tmm_time = 0;
        medicationData[i].tmm_time_name = '';
      }
      setMedicationData((prev) => [...prev]);
    },
    [medicationData]
  );

  const onSearchSinceChid = useCallback(
    (query, i) => {
      const updateQuery = onlyNumberFormat(query);
      medicationData[i].tmm_days_duration_type = updateQuery;
      medicationData[i].tmm_days = '';
      medicationData[i].tmm_duration_type = '';
      setMedicationData((prev) => [...prev]);
      if (updateQuery) {
        const options = SINCE_OPTIONS.map((option) => {
          return {
            key: JSON.stringify({ ...option, tmm_days: parseInt(updateQuery), unique_id: uuidv4() }),
            value: `${updateQuery} ${option.value}`,
            label: <>{`${updateQuery} ${option.label}`}</>,
          };
        });
        setSinceOptions(options);
      } else {
        setSinceOptions(EXTRA_OPTIONS);
      }
    },
    [sinceOptions, medicationData]
  );

  const onSelectSinceChild = useCallback(
    (data, e, i) => {
      setSinceOptions(EXTRA_OPTIONS);
      const objParse = JSON.parse(e.key);
      medicationData[i].tmm_days_duration_type = data;
      medicationData[i].tmm_days = objParse.tmm_days;
      medicationData[i].tmm_duration_type = objParse.value;
      setMedicationData((prev) => [...prev]);
    },
    [sinceOptions, medicationData]
  );

  const onAutoFillDuration = (index) => {
    const { tmm_days_duration_type, tmm_days, tmm_duration_type } = medicationData[index]
    medicationData.forEach(e => {
      e.tmm_days_duration_type = tmm_days_duration_type;
      e.tmm_days = tmm_days;
      e.tmm_duration_type = tmm_duration_type;
    });
    setMedicationData((prev) => [...prev]);
    message.open({
      key: MESSAGE_KEY,
      type: '',
      className: 'message-appointment',
      content: (
        <div className='d-flex align-items-center'>
          <img src={visitEnd} className='me-2' />
          <div>
            <div className='text-start fs-18 fontroboto'>Autofilled this Duration to all medicines</div>
          </div>
          <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
        </div>
      ),
      duration: 3,
    });
  }

  const onChangeNoteChild = useCallback(
    (e, i) => {
      medicationData[i].tmm_remarks = e.target.value;
      setMedicationData((prev) => [...prev]);
    },
    [medicationData]
  );

  const onRemoveRow = (index) => {
    medicationData.splice(index, 1);
    setMedicationData((prev) => [...prev]);
  };

  //PopOver1 function
  const showHideTemplatesListPopover = useCallback(() => {
    setPopOver1(!popOver1);
  }, [popOver1]);

  const onSearch = (e) => {
    const searchQuery = e.target.value;
    if (searchQuery) {
      let filteredTemplates = templates.filter((template) => {
        return template.tmtd_template_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
      setMatchedTemplates(filteredTemplates);
    } else {
      setMatchedTemplates(templates);
    }
  };

  const loadPreviousRxClick = async () => {
    var sendData = {
      patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
      tcm_id: tcmId,
    };
    const action = await dispatch(getLoadPreviousRx(sendData));
    if (action.meta.requestStatus === "fulfilled") {
      const updatedData = action.payload.map((e) => {

        const unitObj = e?.medicineUnit ? e?.medicineUnit.find((x) => x.tmu_id == e.tmm_unit) : null;
        const frequencyObj = frequencyList.find((x) => x.tmf_id == e.tmm_freq_type);
        const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

        return {
          ...e,
          tmm_unit_name: unitObj && unitObj !== undefined ? unitObj.tmu_title : "",
          tmm_freq_type_name:
            e.tmf_block == 0
              ? `${e.tcm_tmm_freq_morning && e.tcm_tmm_freq_morning != 0
                ? e.tcm_tmm_freq_morning + " - "
                : "0 -"
              }${e.tcm_tmm_freq_afternoon && e.tcm_tmm_freq_afternoon != 0
                ? e.tcm_tmm_freq_afternoon + " - "
                : "0 -"
              }${e.tcm_tmm_freq_evening && e.tcm_tmm_freq_evening != 0
                ? e.tcm_tmm_freq_evening + " - "
                : ""
              }${e.tcm_tmm_freq_night && e.tcm_tmm_freq_night != 0
                ? e.tcm_tmm_freq_night
                : "0"}`
              : frequencyObj !== undefined
                ? frequencyObj.tmf_title
                : "",
          tmf_block_val: frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
          tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
          tmm_dosage_unit_name: `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? unitObj.tmu_title : ""}` : ""}`,
          tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
          unique_id: uuidv4(),
        };
      });
      setMedicationData([...medicationData, ...updatedData]);
    } else {
      errorMessage(action.error)
    }
  };

  const onTemplateSelected = async (tmtd_id) => {
    window.Moengage.track_event("medication_template_used", {
      "template_name": tmtd_id.tmtd_template_name
    });
    const action = await dispatch(singleTemplateDetails(tmtd_id));
    if (action.meta.requestStatus === "fulfilled") {
      const updatedData = action.payload.map((e) => {

        const unitObj = e?.medicineUnit ? e?.medicineUnit.find((x) => x.tmu_id == e.tmm_unit) : null;
        const frequencyObj = frequencyList.find((x) => x.tmf_id == e.tmm_freq_type);
        const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

        return {
          ...e,
          tmm_unit_name: unitObj && unitObj !== undefined ? unitObj.tmu_title : "",
          tmm_freq_type_name:
            e.tmf_block == 0
              ? `${e.tcm_tmm_freq_morning && e.tcm_tmm_freq_morning != 0
                ? e.tcm_tmm_freq_morning + " - "
                : "0 -"
              }${e.tcm_tmm_freq_afternoon && e.tcm_tmm_freq_afternoon != 0
                ? e.tcm_tmm_freq_afternoon + " - "
                : "0 -"
              }${e.tcm_tmm_freq_evening && e.tcm_tmm_freq_evening != 0
                ? e.tcm_tmm_freq_evening + " - "
                : ""
              }${e.tcm_tmm_freq_night && e.tcm_tmm_freq_night != 0
                ? e.tcm_tmm_freq_night
                : "0"}`
              : frequencyObj !== undefined
                ? frequencyObj.tmf_title
                : "",
          tmf_block_val: frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
          tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
          tmm_dosage_unit_name: `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? unitObj.tmu_title : ""}` : ""}`,
          tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
          unique_id: uuidv4(),
        };
      });
      setMedicationData([...medicationData, ...updatedData]);
      showHideTemplatesListPopover();
    } else {
      errorMessage(action.error)
    }
  };

  const onDeleteTemplateClicked = async (tmtd_id) => {
    const action = await dispatch(deleteTemplate(tmtd_id));
    if (action.meta.requestStatus === "rejected") {
      errorMessage(action.error)
    }
  };

  //PopOver2 function
  const showHideSaveTemplatePopOver = useCallback(() => {
    setInputTemplateName(null);
    setPopOver2(!popOver2);
  }, [popOver2]);

  const onTabChange = useCallback(
    (key) => {
      setInputTemplateName(null);
      setTabChange(key);
    },
    [tabChange]
  );

  const onChangeSaveTemplate = useCallback(
    (e) => {
      const updateQuery = removeBeforeWhiteSpace(e.target.value)
      setInputTemplateName(updateQuery);
    },
    [inputTemplateName]
  );

  const onAddTemplateClicked = async () => {
    if (medicationData.length == 0) {
      errorMessage('At least 1 medication added')
    } else if (medicationData.filter((e) => e.tmm_medicine_name == "").length > 0) {
      errorMessage('Please fillup medication name')
    } else {
      var sendData = {
        tmtd_template_name: inputTemplateName,
        data: medicationData,
      };
      const action = await dispatch(addTemplate(sendData));
      if (action.meta.requestStatus == "fulfilled") {
        setInputTemplateName(null);
        showHideSaveTemplatePopOver();
      }
    }
  };

  const onSearchTemplate = useCallback(() => {
    setInputTemplateName(null);
  }, [inputTemplateName]);

  const onSelectTemplate = useCallback(
    (data, e) => {
      setInputTemplateName(e.key);
    },
    [inputTemplateName]
  );

  const onUpdateTemplateClicked = async () => {
    if (medicationData.length == 0) {
      errorMessage('At least 1 medication added')
    } else if (medicationData.filter(e => e.tmm_medicine_name == "").length > 0) {
      errorMessage('Please fillup medication name')
    } else {
      var data = JSON.parse(inputTemplateName);
      var sendData = {
        tmtd_id: data.tmtd_id,
        tmtd_template_name: data.tmtd_template_name,
        data: medicationData,
      };
      const action = await dispatch(updateTemplate(sendData));
      if (action.meta.requestStatus == "fulfilled") {
        setInputTemplateName(null);
        showHideSaveTemplatePopOver();
      }
    }
  };

  // TimingInfo popover
  const [frequencyPopOver, setFrequencyPopOver] = useState(false);

  const showHideFrequencyPopOver = useCallback(() => {
    setFrequencyPopOver(!frequencyPopOver);
  }, [frequencyPopOver]);

  const FREQUENCY_CONTENT = useCallback(() => {
    return (
      <div className="position-relative">
        <img src={TimingInfo} alt="Timing Info" />
        <i onClick={showHideFrequencyPopOver} className="icon-Cross position-absolute cursor-pointer" style={{ right: 13, top: 15, color: '#92929D' }}></i>
      </div>
    );
  }, [frequencyPopOver]);

  const showHideModal = useCallback((template_id) => {
    template_id !== undefined ? setRemoveTemplateId(template_id) : setRemoveTemplateId(null)
    setIsModalOpen(!isModalOpen);
  }, [isModalOpen]);

  //Template Remove
  const DELETE_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isModalOpen}
        onCancel={showHideModal}
        modalWidth={500}
        title={"You may lose your data"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className='me-3' src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to delete this template?
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div onClick={() => {
                  onDeleteTemplateClicked(removeTemplateId)
                  showHideModal()
                }}
                  className="me-4 text-decoration-underline btn p-0 text-main">
                  Yes Delete
                </div>
                <Button onClick={showHideModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                  <span>No</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [isModalOpen]);

  const innerMedication = (index) => {
    const mainArray = []
    for (let i = index; i < medicationData.length; i++) {
      if (getMedicationGroupKey(medicationData[i]) === getMedicationGroupKey(medicationData[index])) {
        mainArray.push(medicationData[i])
      } else {
        break;
      }
    }
    return mainArray
  }

  const taperDoseAdd = async (item) => {
    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage.track_event("TP_Medicine_Tappered_Web", {
      clinic_name,
      "Doctor_unique_id": profile?.doctor_unique_id,
      "Doctor_specialty": profile?.dp_name,
      "Patient_Name": patient_data?.pm_fullname,
      "Patient_ID": patient_data?.patient_unique_id,
      "Rx_Id": item?.tmm_id,
    });
    const array = await innerMedication(item?.index).map(e1 => ({ ...e1, index: medicationData.findIndex(e => e.unique_id == e1.unique_id) }))
    let updatedData = {
      ...array.at(-1),
      tmf_block: 0,
      tmm_freq_type: 0,
      tmm_freq_type_name: "",
      tmf_block_val: "",
      tcm_tmm_freq_afternoon: 0,
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_morning: 0,
      tcm_tmm_freq_night: 0,
      tmm_days: 0,
      tmm_days_duration_type: "",
      tmm_duration_type: "",
      tmm_dosage: "",
      tmm_dosage_unit_name: "",
      tmm_remarks: "",
      tmm_time: 0,
      tmm_time_name: "",
      tmm_unit: 0,
      tmm_unit_name: "",
      tmu_id: 0,
      unique_id: uuidv4(),
    }
    let { index, ...updated } = updatedData
    medicationData.splice(parseInt(array.at(-1).index) + 1, 0, updated);
    setMedicationData((prev) => [...prev]);
  };

  const reorder = async (list, startIndex, endIndex) => {
    const result = Array.from(list);

    const findMedicationIndex = medicationData.map((e, index) => ({ ...e, index: index })).reduce((acc, curr) => !acc.length || getMedicationGroupKey(acc.at(-1)) !== getMedicationGroupKey(curr) ? [...acc, curr] : acc, [])

    const array = await innerMedication(findMedicationIndex[startIndex].index)
    const array1 = await innerMedication(findMedicationIndex[endIndex].index)

    const removedArray = result.filter(item => !array.some((x) => x.unique_id === item.unique_id));

    if (findMedicationIndex[startIndex].index > findMedicationIndex[endIndex].index) {
      const dragIndex = removedArray.findIndex(x => x.unique_id == array1.at(0).unique_id)
      removedArray.splice(dragIndex, 0, ...array)
    }
    else {
      const dragIndex = removedArray.findIndex(x => x.unique_id == array1.at(-1).unique_id)
      removedArray.splice(dragIndex + 1, 0, ...array)
    }

    return removedArray;
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const reorderedItems = await reorder(
      medicationData,
      result.source.index,
      result.destination.index
    );
    setMedicationData(reorderedItems);
  };

  const TABLE_MEDICATION = useMemo(() => {
    return (
      <div className={isVoiceRxModuleEnabled ? voiceModuleStyles.medicationScrollWrap : undefined}>
        {medicationData.length > 0 &&
          <Row
            gutter={[0]}
            className={`mt-14 border-top align-items-center ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationTableRow : ""}`}
          >
            <Col lg={1} md={1} sm={1} xs={1} className={isVoiceRxModuleEnabled ? voiceModuleStyles.medicationDragCell : undefined}>
              &nbsp;
            </Col>
            <Col lg={5} md={5} sm={5} xs={5} className={isVoiceRxModuleEnabled ? voiceModuleStyles.medicationNameCell : undefined}>
              <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
                <label>MEDICINE</label>
              </div>
            </Col>
            <Col lg={18} md={18} sm={18} xs={18} className={isVoiceRxModuleEnabled ? voiceModuleStyles.medicationDetailsCell : undefined}>
              <Row className={isVoiceRxModuleEnabled ? voiceModuleStyles.medicationInnerRow : undefined}>
                <Col lg={5} md={5} sm={5} xs={5} className={`border-end border-start ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationUnitCell : ""}`}>
                  <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
                    <label>UNIT PER DOSE</label>
                  </div>
                </Col>
                <Col lg={4} md={4} sm={4} xs={4} className={`border-end ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationFrequencyCell : ""}`}>
                  <div className="fontroboto fw-medium p-2 fs-12 text-welcome d-flex align-items-center flex-wrap">
                    <label>FREQUENCY </label>
                    <Popover
                      open={frequencyPopOver}
                      content={FREQUENCY_CONTENT}
                      placement="rightTop"
                      trigger="click"
                      arrow={false}
                      onOpenChange={showHideFrequencyPopOver}
                      overlayClassName="pp-0">
                      <i className='icon-info ms-1 fs-18'></i>
                    </Popover>
                  </div>
                </Col>
                <Col lg={4} md={4} sm={4} xs={4} className={`border-end ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationWhenCell : ""}`}>
                  <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
                    <label>WHEN</label>
                  </div>
                </Col>
                <Col lg={4} md={4} sm={4} xs={4} className={`border-end ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationDurationCell : ""}`}>
                  <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
                    <label>DURATION</label>
                  </div>
                </Col>
                <Col lg={6} md={6} sm={6} xs={6} className={`border-end ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationNoteCell : ""}`}>
                  <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
                    <label>NOTE</label>
                  </div>
                </Col>
                <Col lg={1} md={1} sm={2} xs={2} className={`text-center ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationActionCell : ""}`}>
                  <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
                    <label></label>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        }
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="medication" direction="vertical">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {medicationData.length > 0 &&
                  medicationData.map((e, index) => ({ ...e, index: index })).reduce((acc, curr) => !acc.length || getMedicationGroupKey(acc.at(-1)) !== getMedicationGroupKey(curr) ? [...acc, curr] : acc, []).map((item, i) => (
                    <Draggable key={i} draggableId={`medication-${i}`} index={i}>
                      {(provided) => (
                        <Row
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          key={i}
                          gutter={[0]}
                          className={`taper-dose align-items-center ${i === 0 && "border-top"} border-bottom ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationTableRow : ""}`}
                        >
                          <Col lg={1} md={1} sm={1} xs={1} className={`text-center d-flex flex-column align-self-stretch ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationDragCell : ""}`}>
                            <div className="d-flex align-items-center justify-content-center flex-grow-1 w-100">
                              <MenuOutlined
                                {...provided.dragHandleProps}
                                className="drag-handle"
                                style={{ cursor: 'grab' }}
                              >
                              </MenuOutlined>
                            </div>
                          </Col>
                          <Col
                            lg={5}
                            md={5}
                            sm={5}
                            xs={5}
                            className={[
                              isVoiceRxModuleEnabled ? voiceModuleStyles.medicationNameCell : "",
                              isVoiceRxModuleEnabled && isVoiceRxUngroundedMedication(item) ? "align-self-stretch" : ""
                            ].filter(Boolean).join(" ") || undefined}
                            onClick={() => {
                              if (isVoiceRxModuleEnabled && isVoiceRxUngroundedMedication(item) && voiceMedicineEdit.index !== item.index) {
                                handleVoiceMedicineClick(item);
                              }
                            }}
                            style={isVoiceRxModuleEnabled && isZydusAccount && isVoiceRxUngroundedMedication(item) ? { background: "#fff8ef" } : undefined}
                          >
                            <div className={isVoiceRxModuleEnabled && isVoiceRxUngroundedMedication(item) ? "fontroboto fw-medium p-2 pe-3 h-100 d-flex flex-column justify-content-center" : "fontroboto fw-medium p-2 pe-3"}>
                              {isVoiceRxModuleEnabled && isVoiceRxUngroundedMedication(item) ? (
                                <div className="d-flex align-items-center gap-1 w-100">
                                  <div className="d-flex align-items-center flex-wrap gap-1 flex-grow-1" style={{ minWidth: 0 }}>
                                    {voiceMedicineEdit.index === item.index ? (
                                      <AutoComplete
                                        autoFocus
                                        value={voiceMedicineEdit.query}
                                        placeholder="Medicine Name"
                                        bordered={false}
                                        defaultOpen
                                        open
                                        onSearch={(query) => handleVoiceMedicineSearch(query, item.index)}
                                        onSelect={(data, e) => onSelectVoiceMedicine(data, e, item.index)}
                                        onBlur={handleVoiceMedicineBlur}
                                        options={parentSearchOptions}
                                        className="autocomplete-custom w-100 inputborder"
                                        {...getMedicationPopupProps("medicine-parent-autocomplete-dropdown")}
                                        defaultActiveFirstOption
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn p-0 border-0 bg-transparent text-start fontroboto fw-medium text-main2"
                                        onClick={() => handleVoiceMedicineClick(item)}
                                        style={{ cursor: "pointer" }}
                                      >
                                        {item.tmm_medicine_name}
                                      </button>
                                    )}
                                    {renderHmTypeBadge(item)}
                                  </div>
                                  {isZydusAccount && (
                                    <Tooltip
                                      placement="top"
                                      overlayInnerStyle={VOICE_RX_SOURCE_TOOLTIP_STYLE}
                                      title="This medication is not from your Zydus inventory list. Click to search and add the medicine."
                                    >
                                      <InfoCircleOutlined
                                        className="fs-18"
                                        style={{ color: "#d46b08", background: "#fff0df", borderRadius: "50%" }}
                                      />
                                    </Tooltip>
                                  )}
                                </div>
                              ) : (
                                <div className="d-flex align-items-center flex-wrap gap-1">
                                  <span className="text-main2">{item.tmm_medicine_name}</span>
                                  {renderHmTypeBadge(item)}
                                </div>
                              )}
                              <Tooltip placement="bottom" title={item.tmm_generic}>
                                <div className="text-truncate fw-normal me-1">{item.tmm_generic}</div>
                              </Tooltip>
                              {renderLowStockBadge(item)}
                            </div>
                          </Col>
                          <Col lg={18} md={18} sm={18} xs={18} className={isVoiceRxModuleEnabled ? voiceModuleStyles.medicationDetailsCell : undefined}>
                            {!item.pms_default && !(isVoiceRxModuleEnabled && isVoiceRxUngroundedMedication(item)) &&
                              <i className="icon-Edit fs-18 position-absolute" style={{ bottom: 0, left: -22 }}
                                onClick={() => {
                                  const medicineType = medicineTypeList.find(x => x?.tmy_id == item?.tmm_type)
                                  const makeData = {
                                    unique_id: item.unique_id,
                                    tmm_id: item.tmm_id,
                                    tmm_medicine_name: item.tmm_medicine_name,
                                    tmm_generic: item.tmm_generic,
                                    tmm_company: item.tmm_company
                                  }
                                  const updateItem = medicineType !== undefined ? { ...makeData, ...medicineType } : makeData
                                  showHideAddMedicineModal()
                                  setAddCustom(updateItem);
                                }}
                              ></i>
                            }
                            {innerMedication(item.index).map(e1 => ({ ...e1, index: medicationData.findIndex(e => e.unique_id == e1.unique_id) })).map((item, ii) => {
                              return (
                                <Row key={ii} className={`${ii != 0 && 'position-relative border-top'} ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationInnerRow : ""}`}>
                                  <Col lg={5} md={5} sm={5} xs={5} className={`border-end border-start ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationUnitCell : ""}`}>
                                    <AutoComplete
                                      defaultValue={item.tmm_dosage_unit_name}
                                      value={item.tmm_dosage_unit_name}
                                      placeholder="e.g 1 Tablet"
                                      bordered={false}
                                      defaultOpen={false}
                                      onSearch={(query) => onSearchUnitPerDoseChid(query, item?.index)}
                                      onBlur={() => onBlurUnitPerDoseChid(item?.index)}
                                      options={unitPerDoseOptions}
                                      // backfill={true}
                                      className="autocomplete-custom w-100 h-100 inputborder"
                                      {...getMedicationPopupProps()}
                                      defaultActiveFirstOption={true}
                                      onSelect={(data, e) => onSelectUnitPerDoseChild(data, e, item?.index)}
                                      onClear={() => onSearchUnitPerDoseChid("", item?.index)}
                                      allowClear
                                    />
                                    {ii === 0 && (profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) && (
                                      dosesList.some((e1) => e1.medicine_id == item.tmm_id) ? (
                                        <div className="badge-tapper position-absolute" style={{ bottom: 0, left: 20 }} onClick={() => handleViewDoseCalcDrawer("1", item?.tmm_id)}><img src={calculatorIconBlue} alt="Dose calcultor" className="svg-hovered me-1" /> {isVoiceRxModuleEnabled ? "Edit Calc." : "Edit Calculation"}</div>
                                      ) : (
                                        <div className="badge-tapper position-absolute" style={{ bottom: 0, left: 20 }} onClick={() => handleViewDoseCalcDrawer("1", 0)}><img src={calculatorIconBlue} alt="Dose calcultor" className="svg-hovered me-1" /> {isVoiceRxModuleEnabled ? "Dose Calc." : "Dose Calculator"}</div>
                                      )
                                    )}
                                  </Col>
                                  <Col lg={4} md={4} sm={4} xs={4} className={`border-end ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationFrequencyCell : ""}`}>
                                    <Select
                                      showSearch
                                      className="autocomplete-custom w-100 h-100 inputborder"
                                      placeholder="e.g 1-0-1"
                                      defaultValue={item.tmm_freq_type_name != "" ? item.tmm_freq_type_name : null}
                                      value={item.tmm_freq_type_name != "" ? item.tmm_freq_type_name : null}
                                      onSearch={(query) => onSearchFrequencyChild(query, item?.index)}
                                      onFocus={() => onSearchFrequencyChild(item.tmm_freq_type_name, item?.index)}
                                      onBlur={() => onBlurFrequencyChild(item?.index)}
                                      onSelect={(data) => onSelectFrequencyChild(data, item?.index)}
                                      options={frequencyOptions}
                                      {...getMedicationPopupProps()}
                                      onClear={() => onSelectFrequencyChild("", item?.index)}
                                      allowClear
                                    />
                                  </Col>
                                  <Col lg={4} md={4} sm={4} xs={4} className={`border-end ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationWhenCell : ""}`}>
                                    <Select
                                      className="autocomplete-custom w-100 h-100 inputborder"
                                      placeholder="e.g Before Food"
                                      defaultValue={item.tmm_time_name != "" && item.tmm_time_name !== "None" ? item.tmm_time_name : null}
                                      value={item.tmm_time_name != "" && item.tmm_time_name !== "None" ? item.tmm_time_name : null}
                                      onSelect={(data) => onSelectTimingChild(data, item?.index)}
                                      options={timingList.map((e) => {
                                        return {
                                          value: JSON.stringify({ ...e, unique_id: uuidv4() }),
                                          label: e.tmt_title,
                                        };
                                      })}
                                      {...getMedicationPopupProps()}
                                      onClear={() => onSelectTimingChild("", item?.index)}
                                      allowClear
                                    />
                                  </Col>
                                  <Col lg={4} md={4} sm={4} xs={4} className={`border-end autofill ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationDurationCell : ""}`}>
                                    <AutoComplete
                                      defaultValue={item.tmm_days_duration_type}
                                      value={hasNumber(item.tmm_days_duration_type) ? item.tmm_days_duration_type : capitalize(item.tmm_days_duration_type, true)}
                                      placeholder="e.g 1 Day"
                                      bordered={false}
                                      defaultOpen={false}
                                      onSearch={(query) => onSearchSinceChid(query, item?.index)}
                                      options={sinceOptions}
                                      className="autocomplete-custom h-100 w-100 inputborder truncate-autocomplete"
                                      {...getMedicationPopupProps("option-truncate")}
                                      defaultActiveFirstOption={true}
                                      onSelect={(data, e) => onSelectSinceChild(data, e, item?.index)}
                                      onClear={() => onSearchSinceChid("", item?.index)}
                                      allowClear
                                    />
                                    {item?.tmm_days_duration_type && (
                                      <div className="badge-autofill" onClick={() => onAutoFillDuration(item?.index)}><i className="icon-copyIcon fs-12-1" />Autofill to all meds</div>
                                    )}
                                  </Col>
                                  <Col lg={6} md={6} sm={6} xs={6} className={`border-end ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationNoteCell : ""}`}>
                                    <TextArea
                                      className="notesinput border-0 h-100 align-self-center"
                                      placeholder="Notes"
                                      defaultValue={item.tmm_remarks}
                                      value={item.tmm_remarks}
                                      autoSize={{
                                        minRows: 1,
                                        maxRows: 2,
                                      }}
                                      onChange={(e) => onChangeNoteChild(e, item?.index)}
                                    />
                                  </Col>
                                  <Col lg={1} md={1} sm={2} xs={2} className={`d-flex align-items-center justify-content-center ${isVoiceRxModuleEnabled ? voiceModuleStyles.medicationActionCell : ""}`}>
                                    <Button
                                      className="btn py-0 btn-delete-prescription px-0"
                                      onClick={() => onRemoveRow(item?.index)}
                                    >
                                      {isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete"></i>}
                                    </Button>
                                  </Col>
                                  {ii != 0 && (<div className="badge-then">Then</div>)}
                                </Row>
                              )
                            })}
                          </Col>
                          <div className="badge-tapper" onClick={() => taperDoseAdd(item)}>
                            <i className="icon-Add me-1"></i> Tapering Dose
                          </div>
                        </Row>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  }, [medicationData, frequencyPopOver, parentSearchOptions, renderHmTypeBadge, renderLowStockBadge, voiceMedicineEdit, isVoiceRxModuleEnabled]);

  //Child Component
  // const TABLE_MEDICATION = useMemo(() => {
  //   return (
  //     <>
  //       {medicationData.length > 0 &&
  //         <Row
  //           gutter={[0]}
  //           className={`mt-14 border-top align-items-center`}
  //         >
  //           <Col lg={5} md={5} sm={5} xs={5}>
  //             <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
  //               <label>MEDICINE</label>
  //             </div>
  //           </Col>
  //           <Col lg={19} md={19} sm={19} xs={19}>
  //             <Row>
  //               <Col lg={4} md={4} sm={4} xs={4} className="border-end border-start">
  //                 <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
  //                   <label>UNIT PER DOSE</label>
  //                 </div>
  //               </Col>
  //               <Col lg={5} md={5} sm={5} xs={5} className="border-end">
  //                 <div className="fontroboto fw-medium p-2 fs-12 text-welcome d-flex align-items-center">
  //                   <label>FREQUENCY </label>
  //                   <Popover
  //                     open={frequencyPopOver}
  //                     content={FREQUENCY_CONTENT}
  //                     placement="rightTop"
  //                     trigger="click"
  //                     arrow={false}
  //                     onOpenChange={showHideFrequencyPopOver}
  //                     overlayClassName="pp-0">
  //                     <i className='icon-info ms-1 fs-18'></i>
  //                   </Popover>
  //                 </div>
  //               </Col>
  //               <Col lg={5} md={5} sm={5} xs={5} className="border-end">
  //                 <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
  //                   <label>WHEN</label>
  //                 </div>
  //               </Col>
  //               <Col lg={3} md={3} sm={3} xs={3} className="border-end">
  //                 <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
  //                   <label>DURATION</label>
  //                 </div>
  //               </Col>
  //               <Col lg={6} md={6} sm={6} xs={6} className="border-end">
  //                 <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
  //                   <label>NOTE</label>
  //                 </div>
  //               </Col>
  //               <Col lg={1} md={1} sm={2} xs={2} className="text-center">
  //                 <div className="fontroboto fw-medium p-2 fs-12 text-welcome">
  //                   <label></label>
  //                 </div>
  //               </Col>
  //             </Row>
  //           </Col>
  //         </Row>
  //       }
  //       {medicationData.length > 0 &&
  //         medicationData.map((e, index) => ({ ...e, index: index })).reduce((acc, curr) => acc?.at(-1)?.tmm_id == curr.tmm_id ? acc : [...acc, curr], []).map((item, i) => {
  //           return (
  //             <>
  //               <Row
  //                 key={i}
  //                 gutter={[0]}
  //                 align="middle"
  //                 className={`taper-dose ${i === 0 && "border-top"} border-bottom`}
  //               >
  //                 <Col lg={5} md={5} sm={5} xs={5}>
  //                   <div className="fontroboto fw-medium p-2 pe-3">
  //                     <label>{item.tmm_medicine_name}</label>
  //                     <Tooltip placement="bottom" title={item.tmm_generic}>
  //                       <div className="text-truncate fw-normal me-1">{item.tmm_generic}</div>
  //                     </Tooltip>
  //                   </div>
  //                 </Col>
  //                 <Col lg={19} md={19} sm={19} xs={19}>
  //                   {!item.pms_default &&
  //                     <i className="icon-Edit fs-18 position-absolute" style={{ bottom: 0, left: -22 }}
  //                       onClick={() => {
  //                         const medicineType = medicineTypeList.find(x => x?.tmy_id == item?.tmm_type)
  //                         const makeData = {
  //                           unique_id: item.unique_id,
  //                           tmm_id: item.tmm_id,
  //                           tmm_medicine_name: item.tmm_medicine_name,
  //                           tmm_generic: item.tmm_generic,
  //                           tmm_company: item.tmm_company
  //                         }
  //                         const updateItem = medicineType !== undefined ? { ...makeData, ...medicineType } : makeData
  //                         showHideAddMedicineModal()
  //                         setAddCustom(updateItem);
  //                       }}
  //                     ></i>
  //                   }
  //                   {innerMedication(item.index).map(e1 => ({ ...e1, index: medicationData.findIndex(e => e.unique_id == e1.unique_id) })).map((item, ii) => {
  //                     return (
  //                       <Row key={ii} className={`${ii != 0 && 'position-relative border-top'}`}>
  //                         <Col lg={4} md={4} sm={4} xs={4} className="border-end border-start">
  //                           <AutoComplete
  //                             defaultValue={item.tmm_dosage_unit_name}
  //                             value={item.tmm_dosage_unit_name}
  //                             placeholder="e.g 1 Tablet"
  //                             bordered={false}
  //                             defaultOpen={false}
  //                             onSearch={(query) => onSearchUnitPerDoseChid(query, item?.index)}
  //                             onBlur={() => onBlurUnitPerDoseChid(item?.index)}
  //                             options={unitPerDoseOptions}
  //                             // backfill={true}
  //                             className="autocomplete-custom w-100 h-100 inputborder"
  //                             defaultActiveFirstOption={true}
  //                             onSelect={(data, e) => onSelectUnitPerDoseChild(data, e, item?.index)}
  //                             onClear={() => onSearchUnitPerDoseChid("", item?.index)}
  //                             allowClear
  //                           />
  //                         </Col>
  //                         <Col lg={5} md={5} sm={5} xs={5} className="border-end">
  //                           <Select
  //                             showSearch
  //                             className="autocomplete-custom w-100 h-100 inputborder"
  //                             placeholder="e.g 1-0-1"
  //                             defaultValue={item.tmm_freq_type_name != "" ? item.tmm_freq_type_name : null}
  //                             value={item.tmm_freq_type_name != "" ? item.tmm_freq_type_name : null}
  //                             onSearch={(query) => onSearchFrequencyChild(query, item?.index)}
  //                             onFocus={() => onSearchFrequencyChild(item.tmm_freq_type_name, item?.index)}
  //                             onBlur={() => onBlurFrequencyChild(item?.index)}
  //                             onSelect={(data) => onSelectFrequencyChild(data, item?.index)}
  //                             options={frequencyOptions}
  //                             onClear={() => onSelectFrequencyChild("", item?.index)}
  //                             allowClear
  //                           />
  //                         </Col>
  //                         <Col lg={5} md={5} sm={5} xs={5} className="border-end">
  //                           <Select
  //                             className="autocomplete-custom w-100 h-100 inputborder"
  //                             placeholder="e.g Before Food"
  //                             defaultValue={item.tmm_time_name != "" ? item.tmm_time_name : null}
  //                             value={item.tmm_time_name != "" ? item.tmm_time_name : null}
  //                             onSelect={(data) => onSelectTimingChild(data, item?.index)}
  //                             options={timingList.map((e) => {
  //                               return {
  //                                 value: JSON.stringify({ ...e, unique_id: uuidv4() }),
  //                                 label: e.tmt_title,
  //                               };
  //                             })}
  //                             onClear={() => onSelectTimingChild("", item?.index)}
  //                             allowClear
  //                           />
  //                         </Col>
  //                         <Col lg={3} md={3} sm={3} xs={3} className="border-end">
  //                           <AutoComplete
  //                             defaultValue={item.tmm_days_duration_type}
  //                             value={hasNumber(item.tmm_days_duration_type) ? item.tmm_days_duration_type : capitalize(item.tmm_days_duration_type, true)}
  //                             placeholder="e.g 1 Day"
  //                             bordered={false}
  //                             defaultOpen={false}
  //                             onSearch={(query) => onSearchSinceChid(query, item?.index)}
  //                             options={sinceOptions}
  //                             className="autocomplete-custom h-100 w-100 inputborder truncate-autocomplete"
  //                             popupClassName="option-truncate"
  //                             defaultActiveFirstOption={true}
  //                             onSelect={(data, e) => onSelectSinceChild(data, e, item?.index)}
  //                             onClear={() => onSearchSinceChid("", item?.index)}
  //                             allowClear
  //                           />
  //                         </Col>
  //                         <Col lg={6} md={6} sm={6} xs={6} className="border-end">
  //                           <TextArea
  //                             className="notesinput border-0 h-100 align-self-center"
  //                             placeholder="Notes"
  //                             defaultValue={item.tmm_remarks}
  //                             value={item.tmm_remarks}
  //                             autoSize={{
  //                               minRows: 1,
  //                               maxRows: 2,
  //                             }}
  //                             onChange={(e) => onChangeNoteChild(e, item?.index)}
  //                           />
  //                         </Col>
  //                         <Col lg={1} md={1} sm={2} xs={2} className="d-flex align-items-center justify-content-center">
  //                           <Button
  //                             className="btn py-0 btn-delete-prescription px-0"
  //                             onClick={() => onRemoveRow(item?.index)}
  //                           >
  //                             <i className="icon-delete"></i>
  //                           </Button>
  //                         </Col>
  //                         {ii != 0 && (<div className="badge-then">Then</div>)}
  //                       </Row>
  //                     )
  //                   })}
  //                 </Col>
  //                 <div className="badge-tapper" onClick={() => taperDoseAdd(item)}>
  //                   <i className="icon-Add me-1"></i> Tapering Dose
  //                 </div>
  //               </Row>
  //             </>
  //           );
  //         })}
  //     </>
  //   );
  // }, [medicationData, frequencyPopOver]);

  //Template Componet
  const TEMPLATE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="pop-header" key="medicationData-template">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Medications Templates</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={showHideTemplatesListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="medicationData-template-search">
            <Input
              allowClear
              className="popinput"
              onChange={onSearch}
              placeholder="Search Templates"
              prefix={<i className="icon-search me-2" />}
            />
          </div>
        </div>
        <div className="pop-body">
          {matchedTemplates.length > 0 &&
            matchedTemplates.map((template, i) => {
              return (
                <div
                  className="align-items-center d-flex medicine-templates"
                  key={i}
                >
                  <div
                    className="round-box"
                    onClick={() => onTemplateSelected(template.tmtd_id)}
                  >
                    {isVoiceRxModuleEnabled ? <Grid5 color="#4C4E5C" size={18} strokeWidth={1.6} variant="Linear" /> : <i className="icon-template"></i>}
                  </div>
                  <div
                    className="text-truncate w-100"
                    onClick={() => onTemplateSelected(template.tmtd_id)}
                  >
                    <div className="title text-main2">{template.tmtd_template_name}</div>
                    <div className="text-truncate">{template.medicine_name}</div>
                  </div>
                  <Button
                    className="btn btn-delete-prescription p-0 ms-2"
                    onClick={() => {
                      showHideModal(template.tmtd_id)
                      showHideTemplatesListPopover()
                    }}
                  >
                    {template.loading ? (
                      <Spin
                        indicator={
                          <LoadingOutlined style={{ fontSize: 22 }} spin />
                        }
                      />
                    ) : (
                      isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete"></i>
                    )}
                  </Button>
                </div>
              );
            })}
        </div>
      </>
    );
  }, [popOver1, matchedTemplates]);

  //Save Componet
  const SAVE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
          <Tabs
            defaultActiveKey={TAB_ADD_TEMPLATE}
            items={ADD_EDIT_TEMPLATE_TABS}
            onChange={onTabChange}
            className="w-100"
          />
          <Button
            className="btn btn-delete-prescription"
            onClick={showHideSaveTemplatePopOver}
          >
            <i className="icon-Cross"></i>
          </Button>
        </div>
        {tabChange === TAB_ADD_TEMPLATE ? (
          <div className="pop-header d-flex">
            <Input
              allowClear
              value={inputTemplateName && inputTemplateName}
              className="popinput inputheight41"
              placeholder="Template Name"
              onChange={onChangeSaveTemplate}
            />
            <Button
              className="btn btn-primary3 btn-41 ms-3"
              loading={loading}
              disabled={inputTemplateName ? false : true}
              onClick={onAddTemplateClicked}
            >
              {" Save "}
            </Button>
          </div>
        ) : (
          <div className="pop-header d-flex">
            <Select
              showSearch
              value={inputTemplateName && JSON.parse(inputTemplateName).tmtd_template_name}
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSearch={onSearchTemplate}
              onSelect={onSelectTemplate}
              optionLabelProp="label"
              {...getMedicationPopupProps()}
              options={allTemplates.map((template) => {
                return {
                  key: JSON.stringify(template),
                  value: template.tmtd_template_name,
                  label: (
                    <div key={template.tmtd_id}>
                      {template.tmtd_template_name}
                    </div>
                  ),
                };
              })}
              optionRender={(option) => (
                <div className="align-items-center d-flex text-truncate w-100">
                  <div className="round-box">{isVoiceRxModuleEnabled ? <Grid5 color="#4C4E5C" size={18} strokeWidth={1.6} variant="Linear" /> : <i className="icon-template"></i>}</div>
                  <div className="text-truncate w-100">
                    <div className="title text-main2">{option.data.value}</div>
                    <div className="text-truncate">{JSON.parse(option.data.key).medicine_name}</div>
                  </div>
                </div>
              )}
            />
            <Button
              className="btn btn-primary3 btn-41 ms-3"
              loading={loading}
              disabled={inputTemplateName ? false : true}
              onClick={onUpdateTemplateClicked}
            >
              {" Update "}
            </Button>
          </div>
        )}
      </>
    );
  }, [tabChange, popOver2, inputTemplateName, loading, allTemplates]);

  //Add Custom
  const showHideAddMedicineModal = useCallback(
    () => {
      setIsAddMedicineOpen(!isAddMedicineOpen)
    },
    [isAddMedicineOpen]
  );

  const onChangeMedicineName = useCallback(
    (e) => {
      const capitalizedName = capitalizeFirstWordOnly(e.target.value);
      setAddCustom({ ...addCustom, tmm_medicine_name: capitalizedName });
    },
    [addCustom]
  );

  const onChangeCompanyName = useCallback(
    (e) => {
      setAddCustom({ ...addCustom, tmm_company: e.target.value });
    },
    [addCustom]
  );

  const onSelectMedicineType = useCallback(
    (data) => {
      if (data) {
        setAddCustom({ ...addCustom, ...JSON.parse(data) });
      } else {
        const { tmy_id, tmy_title, ...updatedReqData } = addCustom;
        setAddCustom(updatedReqData)
      }
    },
    [addCustom]
  );

  useEffect(() => {
    if (genericQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(searchGeneric(genericQuery));
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    }
  }, [genericQuery]);

  const onSearchGeneric = useCallback(
    (query) => {
      setGenericQuery(replaceCommasAndSemicolons(removeBeforeWhiteSpace(query)));
    },
    [genericQuery]
  );

  const onSelectGeneric = useCallback(
    (data) => {
      if (data) {
        setAddCustom({ ...addCustom, ...JSON.parse(data) });
      } else {
        const { tmm_generic, ...updatedReqData } = addCustom;
        setAddCustom(updatedReqData)
      }
    },
    [addCustom]
  );

  const onAddEditMedicineClick = async () => {
    var sendData = {
      tmm_id: addCustom?.tmm_id,
      tmm_medicine_name: capitalizeFirstWordOnly(addCustom?.tmm_medicine_name),
      tmm_type: addCustom?.tmy_id,
      tmm_generic: addCustom?.tmm_generic !== undefined ? addCustom?.tmm_generic : '',
      tmm_company: addCustom?.tmm_company !== undefined ? addCustom?.tmm_company : ''
    };

    const action = addCustom?.tmm_id ? await dispatch(editMedicine(sendData)) : await dispatch(addMedicine(sendData))
    if (action.meta.requestStatus === "fulfilled") {
      if (addCustom?.tmm_id) {
        const modifyData = action.payload[0]

        await dispatch(updateFrequentlyMedication(modifyData))

        if (doseCalculatorDrawer) {
          medicationLibrary.map(item => {
            if (item.tmm_id == modifyData.tmm_id) {
              item.tmm_medicine_name = modifyData.tmm_medicine_name;
              item.tmm_generic = modifyData.tmm_generic;
              item.tmm_company = modifyData.tmm_company;
              item.tmm_type = modifyData.tmm_type;
              item.tmm_dosage_unit_name = '';
              item.tmm_dosage = '';
              item.tmm_unit = 0;
              item.tmm_unit_name = '';
              item.tmu_id = 0;
              item.medicineUnit = modifyData.medicineUnit;
            }
            return item;
          });
        } else {
          medicationData.map(item => {
            if (item.tmm_id == modifyData.tmm_id) {
              item.tmm_medicine_name = modifyData.tmm_medicine_name;
              item.tmm_generic = modifyData.tmm_generic;
              item.tmm_company = modifyData.tmm_company;
              item.tmm_type = modifyData.tmm_type;
              item.tmm_dosage_unit_name = '';
              item.tmm_dosage = '';
              item.tmm_unit = 0;
              item.tmm_unit_name = '';
              item.tmu_id = 0;
              item.medicineUnit = modifyData.medicineUnit;
            }
            return item;
          });
        }
      } else {
        const updatedData = action.payload.map((e) => {

          const unitObj = e?.medicineUnit ? e?.medicineUnit.find((x) => x.tmu_id == e.tmm_unit) : null;
          const frequencyObj = frequencyList.find((x) => x.tmf_id == e.tmm_freq_type);
          const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

          let doseCalData = {}
          const objDose = dosesList.find((e1) => e1.medicine_id == e.tmm_id)
          if (objDose !== undefined) {
            const dose = calculateDose(objDose?.dosage, todayData?.weight, objDose?.concentration, e?.tmm_type)
            doseCalData['tmm_dosage_unit_name'] = `${dose ? `${dose} ${unitObj && unitObj !== undefined ? unitObj.tmu_title : ""}` : ""}`;
            doseCalData['tmm_dosage'] = dose ? dose : "";
            doseCalData['tmm_unit_name'] = unitObj && unitObj !== undefined ? unitObj.tmu_title : "";
            doseCalData['tmm_unit'] = unitObj && unitObj !== undefined ? unitObj.tmu_id : "";
            doseCalData['tmu_id'] = unitObj && unitObj !== undefined ? unitObj.tmu_id : "";
          } else {
            doseCalData['tmm_dosage_unit_name'] = `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? unitObj.tmu_title : ""}` : ""}`;
            doseCalData['tmm_unit_name'] = unitObj && unitObj !== undefined ? unitObj.tmu_title : "";
          }

          return {
            ...e,
            // tmm_unit_name: unitObj && unitObj !== undefined ? unitObj.tmu_title : "",
            tmm_freq_type_name:
              e.tmf_block == 0
                ? `${e.tcm_tmm_freq_morning && e.tcm_tmm_freq_morning != 0
                  ? e.tcm_tmm_freq_morning + " - "
                  : "0 -"
                }${e.tcm_tmm_freq_afternoon && e.tcm_tmm_freq_afternoon != 0
                  ? e.tcm_tmm_freq_afternoon + " - "
                  : "0 -"
                }${e.tcm_tmm_freq_evening && e.tcm_tmm_freq_evening != 0
                  ? e.tcm_tmm_freq_evening + " - "
                  : ""
                }${e.tcm_tmm_freq_night && e.tcm_tmm_freq_night != 0
                  ? e.tcm_tmm_freq_night
                  : "0"}`
                : frequencyObj !== undefined
                  ? frequencyObj.tmf_title
                  : "",
            tmf_block_val: frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
            tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
            // tmm_dosage_unit_name: `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? unitObj.tmu_title : ""}` : ""}`,
            tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
            unique_id: uuidv4(),
            ...doseCalData
          };
        });
        if (doseCalculatorDrawer) {
          const modifyData = updatedData[0]
          const objDose = dosesList.find((e1) => e1.medicine_id == modifyData.tmm_id)
          medicationLibrary.push({
            ...modifyData,
            tmm_dosage_unit_name: "",
            tmm_dosage: '',
            tmm_unit: 0,
            tmm_unit_name: '',
            tmu_id: 0,
            id: objDose !== undefined ? objDose?.id : "",
            medicine_id: modifyData.tmm_id,
            dosage: objDose !== undefined ? objDose?.dosage : "",
            dosage_unit: "mg/kg/dose",
            concentration: objDose !== undefined ? objDose?.concentration : "",
            concentration_unit: "mg/ml",
            medicine_name: modifyData.tmm_medicine_name,
            medicine_generic_name: modifyData.tmm_generic,
            exist: dosesList.some((e1) => e1.medicine_id == modifyData.tmm_id) ? true : false
          });
        } else {
          medicationData.push({
            ...updatedData[0],
          });
        }
      }
      if (doseCalculatorDrawer) {
        setMedicationLibrary((prev) => [...prev]);
        setSearchMLQuery("");
      } else {
        setMedicationData((prev) => [...prev]);
        setSearchParentQuery("");
      }
      showHideAddMedicineModal()
      setGenericQuery('');
      setAddCustom(null);
    } else {
      errorMessage(action.error)
    }
  }

  const emptyText = (
    genericQuery.length > 0 &&
    <div className="text-center py-3">
      <img className="mb-3" style={{ width: 100 }} src={noRecordFound} alt="No Result Found" />
      <div className="title-common fontroboto mb-3">Sorry ! No results found</div>
      <div className="fontroboto text-greycolor">The generic name is currently not listed in our <br /> database We will add it soon. </div>
    </div>
  );

  const ADD_MEDICINE_DATA = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isAddMedicineOpen}
        onCancel={showHideAddMedicineModal}
        modalWidth={500}
        title={`${addCustom?.tmm_id ? 'Edit' : 'Add'} Custom Medicine`}
        modalBody={
          <>
            <div>
              <Form.Item
                label={<>Name <sup className="mt-3 text-danger fs-18">*</sup></>}
                className="inputLabel-45">
                <Input
                  placeholder="Medicine Name"
                  value={addCustom?.tmm_medicine_name}
                  onChange={onChangeMedicineName}
                  className="inputheight45" />
              </Form.Item>
            </div>
            <div>
              <Form.Item
                label={<>Type <sup className="mt-3 text-danger fs-18">*</sup></>}
                className="inputLabel-45">
                <Select
                  showSearch
                  className="inputheight45 autocomplete-custom"
                  placeholder="Medicine Type"
                  defaultValue={addCustom?.tmy_title !== undefined ? addCustom?.tmy_title : null}
                  value={addCustom?.tmy_title !== undefined ? addCustom?.tmy_title : null}
                  onSelect={onSelectMedicineType}
                  {...getMedicationPopupProps()}
                  options={medicineTypeList.map((e) => {
                    return {
                      value: JSON.stringify({ ...e }),
                      label: e.tmy_title,
                    };
                  })}
                  onClear={() => onSelectMedicineType("")}
                  allowClear
                />
              </Form.Item>
            </div>
            <div>
              <Form.Item
                label="Generic"
                className="inputLabel-45">
                <Select
                  showSearch
                  className="inputheight45 autocomplete-custom"
                  placeholder="Generic Name"
                  defaultValue={addCustom?.tmm_generic !== undefined ? addCustom?.tmm_generic : null}
                  value={addCustom?.tmm_generic !== undefined ? addCustom?.tmm_generic : null}
                  onSearch={onSearchGeneric}
                  onSelect={onSelectGeneric}
                  {...getMedicationPopupProps()}
                  options={[...genericList, { tmm_generic: genericQuery }].filter(e => e.tmm_generic).map((e, i) => {
                    return {
                      value: JSON.stringify({ ...e }),
                      label: i === [...genericList, { tmm_generic: genericQuery }].filter(e => e.tmm_generic).length - 1 && genericQuery.length > 0 ?
                        <>
                          <div>{e.tmm_generic}<i className="icon-Add mx-1 text-primary fs-6"></i> <a className="fw-medium text-decoration-underline text-primary"> Add Custom</a></div>
                        </>
                        :
                        <>{e.tmm_generic}</>,
                    };
                  })}
                  onClear={() => onSelectGeneric("")}
                  // notFoundContent={emptyText}
                  notFoundContent={null}
                  allowClear
                />
              </Form.Item>
            </div>
            <div>
              <Form.Item
                label="Company"
                className="inputLabel-45">
                <Input
                  placeholder="Company Name"
                  value={addCustom?.tmm_company}
                  onChange={onChangeCompanyName}
                  className="inputheight45 text-capitalize" />
              </Form.Item>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div onClick={showHideAddMedicineModal}
                  className="me-4 btn p-0 text-main">
                  Cancel
                </div>
                <Button className="lh-lg btn btn-primary3 btn-41 px-4" onClick={onAddEditMedicineClick} loading={loading} disabled={addCustom?.tmm_medicine_name && addCustom?.tmy_id ? false : true}>
                  <span>{`${addCustom?.tmm_id ? 'Update' : 'Add'} Custom Medicine`}</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [isAddMedicineOpen, addCustom, genericList, genericQuery, loading]);

  const showHideClearData = useCallback(() => {
    setIsModalOpen1(!isModalOpen1);
  }, [isModalOpen1]);

  const onRemoveRows = () => {
    setMedicationData([])
    showHideClearData()
  };

  //Remove All Rows
  const REMOVE_ALL_ROWS = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isModalOpen1}
        onCancel={showHideClearData}
        modalWidth={500}
        title={"You may lose your data"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className='me-3' src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to Clear Selected <b>Medications (Rx)</b>?
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div onClick={onRemoveRows}
                  className="me-4 text-decoration-underline btn p-0 text-main">
                  <span>Yes, Clear</span>
                </div>
                <Button onClick={showHideClearData} className="lh-lg btn btn-primary3 btn-41 px-4">
                  <span>No</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [isModalOpen1]);

  const showHideModal2 = useCallback(() => {
    setIsModalOpen2(!isModalOpen2);
  }, [isModalOpen2]);

  // Tour Pillup
  const tourRef = useRef(null);

  useEffect(() => {
    if (isPillUpAccessableFromGB && profile?.userSettingFlag?.find(e => e?.type === 'pillup')?.status !== 1) {
      tourRef?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        setTourOpen(true)
      }, 1000);
    }
  }, [isPillUpAccessableFromGB]);

  const PILLUP_CONTENT = useCallback(() => {
    const decodedToken = getDecodedToken();
    const tokenData = decodedToken?.result;
    const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
    
    const serviceName = isZydusUser ? "eaZY Dose" : "PillUp";
    const serviceNameTitle = isZydusUser ? "eaZY Dose Fulfilment" : "Pillup Fulfilment";
    
    return (
      <div className="p-2">
        <div className="fs-18 fw-semibold text-black">{serviceNameTitle} <img className="img-fluid ms-2" src={tagNew} /></div>
        <div className="pt-1">You can now activate <b>{serviceName}</b> medicine <br /> fulfilment for the patient by enabling <br /> the toggle</div>
      </div>
    );
  }, [popOver3]);

  //PopOver3 function
  const showHidePillUpPopover = useCallback(() => {
    setPopOver3(!popOver3);
  }, [popOver3]);

  const onTourHandle = () => {
    dispatch(upsertDoctorSettingFlag({ type: 'pillup', status: 1 }))
    setTourOpen(!tourOpen)
  }

  const steps = [
    {
      description:
        <>
          <div className="fs-18 fw-semibold pt-3 text-black">
            {(() => {
              const decodedToken = getDecodedToken();
              const tokenData = decodedToken?.result;
              const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
              return isZydusUser ? "eaZY Dose Fulfilment" : "Pillup Fulfilment";
            })()} <img className="img-fluid ms-2" src={tagNew} />
          </div>
          <div className="pt-1">You can now activate <b>
            {(() => {
              const decodedToken = getDecodedToken();
              const tokenData = decodedToken?.result;
              const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
              return isZydusUser ? "eaZY Dose" : "PillUp";
            })()}</b> medicine <br /> fulfilment for the patient by enabling <br /> the toggle</div>
        </>,
      target: () => tourRef.current,
      nextButtonProps: {
        children: 'Okay',
        onClick: onTourHandle
      }
    }
  ];

  const pillUpChange = (checked) => {
    setPillupSwitch(checked)
  };

  return (
    <>
      <div ref={sectionRef} data-voice-rx-dictation-target="medications" className={[voiceModuleStyles.moduleRoot, isVoiceRxModuleEnabled && voiceUpdated ? voiceModuleStyles.moduleUpdated : ""].filter(Boolean).join(" ")}>
        <div className="d-flex align-items-center justify-content-between p-14-pb0">
          <div className="d-flex align-items-center">
            <img className="me-2" src={Medicationicon} alt="Medication" />
            <div className="title-common">{isPillUpAccessableFromGB ? 'Meds' : 'Medications'} (Rx)</div>
            {isPillUpAccessableFromGB &&
              <div ref={tourRef} className="ms-2 border rounded-20px px-2 py-1 d-flex align-items-center" style={{ backgroundColor: 'rgb(226, 226, 234, 0.2)' }}>
                {(() => {
                  const decodedToken = getDecodedToken();
                  const tokenData = decodedToken?.result;
                  const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
                  return isZydusUser ? <img src={EazyDoseLogo} alt="eaZY Dose" style={{ height: '20px' }} /> : <img src={Pillup} />;
                })()}
                <Popover
                  open={popOver3}
                  onOpenChange={showHidePillUpPopover}
                  content={profile?.userSettingFlag?.find(e => e?.type === 'pillup')?.status === 1 ? PILLUP_CONTENT() : null}
                  trigger="hover"
                  placement="bottom"
                >
                  <i className="icon-info opacity-50 fs-18 mx-1"></i>
                </Popover>
                <Switch className="switch-custom" value={pillupSwitch} onChange={pillUpChange} />
                <Tour placement="bottom" closeIcon={false} open={tourOpen} steps={steps} onClose={onTourHandle} />
              </div>
            }
          </div>
          <div className="d-flex align-items-center">
            {isVoiceRxModuleEnabled && (
              <VoiceRxModuleButton
                active={voiceCaptureOpen}
                dictationTargetId="medications"
                label="Start Medication Rx voice input"
                onClick={() => setVoiceCaptureOpen(true)} />
            )}
            {(profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) && (
              <button
                className="btn d-flex align-items-center btn-text"
                onClick={handleViewDoseCalcDrawer}
              >
                {" "}
                <img src={calculatorIcon} alt="Dose calcultor" className="svg-hovered me-2" /><span>{isPillUpAccessableFromGB ? 'Dose calc' : 'Dose calculator'}</span>
              </button>
            )}
            {isVoiceRxModuleEnabled ? (
              <Tooltip placement="bottom" title="Load previous Rx">
                <VoiceRxModuleActionButton type="reload" label="Load previous Rx" onClick={loadPreviousRxClick} />
              </Tooltip>
            ) : (
              <button
                className="btn d-flex align-items-center btn-text"
                onClick={loadPreviousRxClick}
              >
                {" "}
                <i className="icon-reload me-2"></i> <span>{isPillUpAccessableFromGB ? 'Prev. Rx ' : 'Load Prev. Rx'}</span>
              </button>
            )}
            <Popover
              open={popOver1}
              onOpenChange={showHideTemplatesListPopover}
              content={TEMPLATE_CONTENT}
              trigger="click"
              overlayClassName="pop-350 pp-0"
              placement="bottom"
            >
              {isVoiceRxModuleEnabled ? (
                <span>
                  <Tooltip placement="bottom" title="Browse medication templates">
                    <VoiceRxModuleActionButton type="template" label="Browse medication templates" />
                  </Tooltip>
                </span>
              ) : (
                <button className="btn d-flex align-items-center btn-text">
                  {" "}
                  <i className="icon-template me-2"></i> <span>{isPillUpAccessableFromGB ? 'Temp' : 'Templates'}</span>
                </button>
              )}
            </Popover>
            <Tooltip placement="bottom" title={hasUngroundedMedications ? "Some medications aren't linked to your inventory. Please resolve them before saving as a template." : (medicationData.length > 0) ? "" : "Please enter some medications to save a template"}>
              <Popover
                open={popOver2}
                onOpenChange={() => (medicationData.length > 0) && !hasUngroundedMedications && showHideSaveTemplatePopOver()}
                // onOpenChange={showHideSaveTemplatePopOver}
                content={SAVE_CONTENT}
                trigger="click"
                overlayClassName="pop-450 pp-0"
                placement="bottom"
              >
                {isVoiceRxModuleEnabled ? (
                  <span>
                    <VoiceRxModuleActionButton type="save" label="Save medications as template" disabled={medicationData.length === 0 || hasUngroundedMedications} />
                  </span>
                ) : (
                  <button className="btn d-flex align-items-center btn-text">
                    {" "}
                    <i className="icon-save me-2"></i> <span>Save</span>
                  </button>
                )}

              </Popover>
            </Tooltip>
            {isVoiceRxModuleEnabled ? (
              <Tooltip placement="bottom" title="Clear this section">
                <VoiceRxModuleActionButton type="clear" label="Clear medications" onClick={showHideClearData} disabled={medicationData.length === 0} />
              </Tooltip>
            ) : (
              <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={medicationData.length > 0 ? false : true}>
                <i className="icon-eraser1 me-2"></i> {!isPillUpAccessableFromGB && <span>Clear</span>}
              </button>
            )}
          </div>
        </div>

        {DELETE_MODAL}
        {REMOVE_ALL_ROWS}
        {TABLE_MEDICATION}
        {isAddMedicineOpen && ADD_MEDICINE_DATA}

        {doseCalculatorDrawer &&
          <Drawer
            closeIcon={false}
            className="modalWidth-800"
            placement="right"
            open={doseCalculatorDrawer}
            onClose={showHideModal2}
            width="auto"
            zIndex={prescriptionNewTabletOverlayZIndex}
            styles={{
              body: {
                backgroundColor: "white",
              }
            }}
          >
            <DoseCalculator
              handleViewDoseCalcDrawer={handleViewDoseCalcDrawer}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              searchMLQuery={searchMLQuery}
              setSearchMLQuery={setSearchMLQuery}
              medicationLibrary={medicationLibrary}
              setMedicationLibrary={setMedicationLibrary}
              parentSearchOptions={parentSearchOptions}
              onSearchParent={onSearchParent}
              onSelectParent={onSelectParent}
              showHideAddMedicineModal={showHideAddMedicineModal}
              setAddCustom={setAddCustom}
              editDoseId={editDoseId}
              isModalOpen2={isModalOpen2}
              showHideModal2={showHideModal2}
            />
          </Drawer>
        }

        <div className={isVoiceRxModuleEnabled && voiceCaptureOpen ? voiceModuleStyles.moduleSlot : "p-14"}>
          {isVoiceRxModuleEnabled && voiceCaptureOpen ? (
            <VoiceRxModuleCapture
              moduleName="Medication (Rx)"
              previousContext={medicationVoicePreviousContext}
              dummyDigitisedData={VOICE_MODULE_DUMMY_DIGITISED_DATA.medicine}
              onCancel={() => setVoiceCaptureOpen(false)}
              onComplete={handleVoiceCaptureComplete} />
          ) : (
            <AutoComplete
              // defaultValue={searchParentQuery}
              value={searchParentQuery}
              onSearch={handleParentSearch}
              options={parentSearchOptions}
              className="autocomplete-custom w-100"
              onSelect={onSelectParent}
              defaultActiveFirstOption={true}
              {...getMedicationPopupProps(`medicine-parent-autocomplete-dropdown ${
                !searchParentQuery ? "boxpopup" : ""
              }`)}
            >
              <Input
                placeholder="Search Medicines by Name"
                prefix={<i className="icon-search"></i>}
              />
            </AutoComplete>
          )}
        </div>
      </div>
    </>
  );
}

export default React.memo(MedicationsBox);
