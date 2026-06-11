import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { saveAs } from "file-saver";
import Card from "react-bootstrap/Card";
import { Table, Dropdown, Button, Spin, Drawer, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";
import { isChrome, isMobile, isTablet, isSafari } from "react-device-detect";
import { useSelector } from "react-redux";
import api from "../api/services/axiosService";
import PrescriptionSkeleton from "./mobile/PrescriptionSkeleton";

import {
  getClinic,
  getTokenData,
  getClinicName,
  isVoiceRxFree,
  shouldMonetizationDisabled,
  camelCaseToTitle,
  camelToSentence,
} from "../utils/utils";
import {
  formatVitalDisplayForUi,
  hasVitalsAndBodyCompositionData,
} from "../utils/symptomCollectorVitalsMerge";
import {
  EXTRA_OPTIONS,
  FETCH_SMART_RX,
  GB_ISCRIBE,
  GB_SMARTSYNC_CVT,
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  GB_SNAP_RX,
  GB_SNAP_RX_DIGITIZATION,
  GB_VIDEO_CONSULT,
  S_AMBIENT_VOICE_RX,
  S_VOICE_RX,
  PAID,
  GB_SAVE_AS_DRAFT_RX,
  INVESTIGATION_TITLE,
  GB_TAB_RX,
  GB_TAB_RX_CVT,
  GB_TELE_CONSULT,
  GB_VOICE_RX_FREE,
  GB_VOICE_RX_NEW_UI,
  GB_CVT_EXT_HOS,
  CLINIC_TARGET_STATUS,
} from "../utils/constants";
import { EVENTS } from "../utils/events";

import {
  capitalize,
  isNumeric,
  medicine_freq_format,
  isValidMongoId,
  medicine_freq_dosage_format,
  sendMessageToParent,
  errorMessage,
} from "../utils/utils";
import { shouldUseNewPrescriptionUi } from "../utils/prescriptionRouting";
import { env } from "../EnvironmentConfig";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import CvtKnowMore from "../pages/smartSync/components/CvtKnowMore";
import moment from "moment";
import { getModules } from "../redux/customModuleSlice";
import { getGenRx } from "../api/services/ApiGenRx";
import ApiCustomModule from "../api/services/ApiCustomModule";
import ApiVideoConsult from "../api/services/ApiVideoConsult";

import { uploadDocsToAzure } from "../pages/medicalRecords/service";
import { getTabRxFiles } from "../pages/tabRx/services/tabRxService";

import {
  getSnapRxDigitization,
  getSnapRxFiles,
} from "../pages/snapRx/services/snapRxService";
import { fetchPatientDefaultLanguage } from "../api/services/DefaultLanguageService";
import AbhaSyncButton from "./AbhaSyncButton";
import { viewCaseManager } from "../redux/caseManagerSlice";
import { message } from "antd";
import { Document, Page, pdfjs } from "react-pdf";
import { useGrounding } from "../hooks/useGrounding";
import { formatGynecDisplayLines, getNormalizedGynecHistory, isGynecDataEmpty } from "../utils/gynecHistoryUtils";
import PrimaryActionButton from "./PrimaryActionButton";
import { usePrintPayloadPdf } from "../hooks/usePrintPayloadPdf";
import { printBlobInNewTab } from "../pages/opdBilling/utils/helper";
import { renderPrintPayloadToBlob } from "../utils/printPayload";
import { ASSETS } from "../assets";
import { useChikitsalay } from "../pages/chikitsalay/useChikitsalay";
import { clinicTargetStatus } from "../pages/chikitsalay/service";
const {
  symptoms: Symptomsicon,
  surgery: surgeryIcon,
  examination: Examinationsicon,
  diagnosis: Diagnosisicon,
  medication: Medicationicon,
  frame: Frameicon,
  lab: Investigationicon,
  notes: notesicon,
  calenderblank: calenderBlank,
  followup: followUp,
  smartpadgrey: smartPadGrey,
  successIcon,
  vitals: vitalsIcon,
  medicalHistory: medicalHistoryIcon,
  vaccination: vaccinationIcon,
  customModule: customModuleIcon,
  videoIcon,
  visualAcuityTest: visualAcuityIcon,
  autoRefractionTest: autoRefractionIcon,
  lensometerValues: lensometerIcon,
  glassPrescription: glassPrescriptionIcon,
  intraOcularPressure: iopIcon,
  slitLampExamination: slitLampIcon,
  fundusExamination: fundusIcon,
  draftDocument: draftIcon,
} = ASSETS.images;

const pdfWorker = require("pdfjs-dist/build/pdf.worker.min.js");
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

function Cardiology(props) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { profile, userId } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const { service_mappings } = planDetails || {};
  const VOICE_RX_planDetails = service_mappings?.find(
    (service) => service.service_name === S_VOICE_RX
  );
  const isVoiceRxPaid = VOICE_RX_planDetails?.plan_tier === PAID;
  const { frequencyList, timingList, defaultPrintSettings } = useSelector((state) => state.doctors);
  const medicationCaseOptions = defaultPrintSettings?.prescription?.case_option?.find((option) => option.id === 4);

  const {
    patient_data,
    tcmData,
    loading,
    viewCaseManagerData,
    nextPress,
    prevPress,
    onPrintHandlersReady,
    currentPageDisplay,
    isFirstConsultation,
    isLastConsultation,
    opthalPrescriptionHistory,
  } = props;
  
  const {is_draft} = viewCaseManagerData || {};
  const isSaveAsDraftRxAccessableFromGB = useFeatureIsOn(GB_SAVE_AS_DRAFT_RX);
  const canResumeDraftRx = viewCaseManagerData?.doctor_data?.um_id === userId && isSaveAsDraftRxAccessableFromGB;

  const normalizeEyeLabel = useCallback((eye) => {
    const normalized = String(eye || "").toUpperCase();
    if (normalized === "RE") return "OD";
    if (normalized === "LE") return "OS";
    return normalized || "";
  }, []);

  const displayValue = useCallback((value) => {
    if (value === 0 || value === "0") return "0";
    if (value === null || value === undefined || value === "") return "-";
    return value;
  }, []);

  const hasOpthalValue = useCallback((value) => {
    if (value === 0 || value === "0") return true;
    if (value === null || value === undefined) return false;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "" || /^[-–—]+$/.test(trimmed)) return false;
      if (/^(n\/?a|nil)$/i.test(trimmed)) return false;
      return true;
    }
    return Boolean(value);
  }, []);

  const hasOpthalArrayData = useCallback(
    (items, keys) =>
      Array.isArray(items) &&
      items.some((item) => keys.some((key) => hasOpthalValue(item?.[key]))),
    [hasOpthalValue]
  );

  const currentOpthal = useMemo(() => {
    const tcmId = viewCaseManagerData?.tcm_id;
    if (!tcmId || !Array.isArray(opthalPrescriptionHistory)) {
      return null;
    }
    const match = opthalPrescriptionHistory.find(
      (item) => item?.tcm_id === tcmId
    );
    return match?.data || null;
  }, [opthalPrescriptionHistory, viewCaseManagerData?.tcm_id]);

  const hasOpthalData = useMemo(() => {
    if (!currentOpthal) return false;
    const hasArrays = [
      hasOpthalArrayData(currentOpthal.visualAcuity, [
        "ucDistance",
        "ucNear",
        "pinhole",
        "cDistance",
        "cNear",
      ]),
      hasOpthalArrayData(currentOpthal.autoRefraction, [
        "sphere",
        "cylinder",
        "axis",
        "add",
        "distance",
        "near",
      ]),
      hasOpthalArrayData(currentOpthal.lensometerValues, [
        "sphere",
        "cylinder",
        "axis",
        "add",
        "distance",
        "near",
      ]),
      hasOpthalArrayData(currentOpthal.glassPrescription, [
        "sphere",
        "cylinder",
        "axis",
        "add",
        "distance",
        "near",
      ]),
      hasOpthalArrayData(currentOpthal.intraOcularPressure, [
        "nct",
        "gat",
        "cc",
        "cct",
        "ciop",
      ]),
      hasOpthalArrayData(currentOpthal.slitLampExamination, [
        "OD",
        "OS",
        "od",
        "os",
        "remarks",
      ]),
      hasOpthalArrayData(currentOpthal.fundusExamination, [
        "OD",
        "OS",
        "od",
        "os",
        "remarks",
      ]),
    ].some(Boolean);
    return hasArrays || hasOpthalValue(currentOpthal.pd);
  }, [currentOpthal, hasOpthalArrayData, hasOpthalValue]);

  const renderOpthalTable = (headers, rows) => (
    <table className="opthal-summary-table">
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${rowIndex}-${row[0]}`}>
            {row.map((cell, cellIndex) => (
              <td key={`${rowIndex}-${cellIndex}`}>{displayValue(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderEyeRows = (rows, columns) => {
    const eyes = ["OD", "OS"];
    return eyes.map((eye) => {
      const entry = (rows || []).find(
        (item) => normalizeEyeLabel(item?.eye) === eye
      );
      return [eye, ...columns.map((key) => entry?.[key])];
    });
  };

  const renderOpthalSummary = () => {
    if (!hasOpthalData) {
      return null;
    }

    const hasVisualAcuityData = hasOpthalArrayData(
      currentOpthal?.visualAcuity,
      ["ucDistance", "ucNear", "pinhole", "cDistance", "cNear"]
    );
    const hasAutoRefractionData = hasOpthalArrayData(
      currentOpthal?.autoRefraction,
      ["sphere", "cylinder", "axis", "add", "distance", "near"]
    );
    const hasLensometerValuesData = hasOpthalArrayData(
      currentOpthal?.lensometerValues,
      ["sphere", "cylinder", "axis", "add", "distance", "near"]
    );
    const hasGlassPrescriptionData =
      hasOpthalArrayData(currentOpthal?.glassPrescription, [
        "sphere",
        "cylinder",
        "axis",
        "add",
        "distance",
        "near",
      ]) || hasOpthalValue(currentOpthal?.pd);
    const hasIntraOcularPressureData = hasOpthalArrayData(
      currentOpthal?.intraOcularPressure,
      ["nct", "gat", "cc", "cct", "ciop"]
    );
    const hasSlitLampExaminationData = hasOpthalArrayData(
      currentOpthal?.slitLampExamination,
      ["OD", "OS", "od", "os", "remarks"]
    );
    const hasFundusExaminationData = hasOpthalArrayData(
      currentOpthal?.fundusExamination,
      ["OD", "OS", "od", "os", "remarks"]
    );

    const visualRows = renderEyeRows(currentOpthal?.visualAcuity, [
      "ucDistance",
      "ucNear",
      "pinhole",
      "cDistance",
      "cNear",
    ]);

    const undilatedRows = (currentOpthal?.autoRefraction || []).filter(
      (item) => String(item?.type || "").toLowerCase() === "undilated"
    );
    const dilatedRows = (currentOpthal?.autoRefraction || []).filter(
      (item) => String(item?.type || "").toLowerCase() === "dilated"
    );
    const undilatedHasData = hasOpthalArrayData(undilatedRows, [
      "sphere",
      "cylinder",
      "axis",
      "add",
      "distance",
      "near",
    ]);
    const dilatedHasData = hasOpthalArrayData(dilatedRows, [
      "sphere",
      "cylinder",
      "axis",
      "add",
      "distance",
      "near",
    ]);

    const lensometerRows = renderEyeRows(currentOpthal?.lensometerValues, [
      "sphere",
      "cylinder",
      "axis",
      "add",
      "distance",
      "near",
    ]);

    const glassRows = renderEyeRows(currentOpthal?.glassPrescription, [
      "sphere",
      "cylinder",
      "axis",
      "add",
      "distance",
      "near",
    ]);

    const iopRows = renderEyeRows(currentOpthal?.intraOcularPressure, [
      "nct",
      "gat",
      "cc",
      "ciop",
    ]).map((row) => {
      if (row[3] === undefined || row[3] === null || row[3] === "") {
        row[3] = currentOpthal?.intraOcularPressure?.find(
          (item) => normalizeEyeLabel(item?.eye) === row[0]
        )?.cct;
      }
      return row;
    });

    const slitLampRows = (currentOpthal?.slitLampExamination || [])
      .filter(
        (item) =>
          hasOpthalValue(item?.OD ?? item?.od) ||
          hasOpthalValue(item?.OS ?? item?.os) ||
          hasOpthalValue(item?.remarks)
      )
      .map((item) => [
        item?.section,
        item?.OD || item?.od,
        item?.OS || item?.os,
        item?.remarks,
      ]);

    const fundusRows = (currentOpthal?.fundusExamination || [])
      .filter(
        (item) =>
          hasOpthalValue(item?.OD ?? item?.od) ||
          hasOpthalValue(item?.OS ?? item?.os) ||
          hasOpthalValue(item?.remarks)
      )
      .map((item) => [
        item?.section,
        item?.OD || item?.od,
        item?.OS || item?.os,
        item?.remarks,
      ]);

    return (
      <div className="opthal-summary">
        {hasVisualAcuityData && (
          <div className="opthal-section">
            <div className="opthal-section-header">
              <img src={visualAcuityIcon} alt="" className="opthal-section-icon" />
              <div className="opthal-section-title">Visual Acuity Test</div>
            </div>
            {renderOpthalTable(
              ["Eye", "UC Distance", "UC Near", "Pinhole", "C Distance", "C Near"],
              visualRows
            )}
          </div>
        )}

        {hasAutoRefractionData && (undilatedHasData || dilatedHasData) && (
          <div className="opthal-section">
            <div className="opthal-section-header">
              <img src={autoRefractionIcon} alt="" className="opthal-section-icon" />
              <div className="opthal-section-title">Auto Refraction Test</div>
            </div>
            {undilatedHasData && (
              <>
                <div className="opthal-section-subtitle">Undilated</div>
                {renderOpthalTable(
                  ["Eye", "Sphere", "Cylinder", "Axis", "Add", "Distance", "Near"],
                  renderEyeRows(undilatedRows, [
                    "sphere",
                    "cylinder",
                    "axis",
                    "add",
                    "distance",
                    "near",
                  ])
                )}
              </>
            )}
            {dilatedHasData && (
              <>
                <div className="opthal-section-subtitle">Dilated</div>
                {renderOpthalTable(
                  ["Eye", "Sphere", "Cylinder", "Axis", "Add", "Distance", "Near"],
                  renderEyeRows(dilatedRows, [
                    "sphere",
                    "cylinder",
                    "axis",
                    "add",
                    "distance",
                    "near",
                  ])
                )}
              </>
            )}
          </div>
        )}

        {hasLensometerValuesData && (
            <div className="opthal-section">
              <div className="opthal-section-header">
                <img src={lensometerIcon} alt="" className="opthal-section-icon" />
                <div className="opthal-section-title">Lensometer Values</div>
              </div>
              {renderOpthalTable(
                ["Eye", "Sphere", "Cylinder", "Axis", "Add", "Distance", "Near"],
                lensometerRows
              )}
            </div>
          )}

        {hasGlassPrescriptionData && (
            <div className="opthal-section">
              <div className="opthal-section-header">
                <img src={glassPrescriptionIcon} alt="" className="opthal-section-icon" />
                <div className="opthal-section-title">Glass Prescription</div>
              </div>
              {renderOpthalTable(
                ["Eye", "Sphere", "Cylinder", "Axis", "Add", "Distance", "Near"],
                glassRows
              )}
              {hasOpthalValue(currentOpthal?.pd) && (
                <div className="opthal-pd-row">
                  <div className="opthal-pd-label">PD</div>
                  <div className="opthal-pd-value">
                    {displayValue(currentOpthal?.pd)}
                  </div>
                </div>
              )}
            </div>
          )}

        {hasIntraOcularPressureData && (
            <div className="opthal-section">
              <div className="opthal-section-header">
                <img src={iopIcon} alt="" className="opthal-section-icon" />
                <div className="opthal-section-title">
                  Intra Ocular Pressure (IOP)
                </div>
              </div>
              {renderOpthalTable(
                ["Eye", "NCT", "GAT", "CCT", "CIOP"],
                iopRows
              )}
            </div>
          )}

        {hasSlitLampExaminationData && slitLampRows.length > 0 && (
          <div className="opthal-section">
            <div className="opthal-section-header">
              <img src={slitLampIcon} alt="" className="opthal-section-icon" />
              <div className="opthal-section-title">Slit Lamp Examination</div>
            </div>
            {renderOpthalTable(
              ["Name", "OD", "OS", "Remarks"],
              slitLampRows
            )}
          </div>
        )}

        {hasFundusExaminationData && fundusRows.length > 0 && (
          <div className="opthal-section">
            <div className="opthal-section-header">
              <img src={fundusIcon} alt="" className="opthal-section-icon" />
              <div className="opthal-section-title">Fundus Examination</div>
            </div>
            {renderOpthalTable(
              ["Name", "OD", "OS", "Remarks"],
              fundusRows
            )}
          </div>
        )}
      </div>
    );
  };

  const [customModulesRxData, setCustomModulesRxData] = useState([]);

  const [filteredInfo, setFilteredInfo] = useState({});
  const [setSortedInfo] = useState({});
  const [smartRxFile, setSmartRxFile] = useState([]);
  const [isSmartRxFile, setIsSmartRxFile] = useState(false);
  const [isSnapRx, setIsSnapRx] = useState(false);
  const [isTabRx, setIsTabRx] = useState(false);
  const [snapRxFile, setSnapRxFile] = useState([]);
  const [isSnapRxdigitised, setIsSnapRxdigitised] = useState(null);
  const [showDigitalSnapRx, setShowDigitalSnapRx] = useState(null);
  const [showDigitalRx, setShowDigitalRx] = useState(null);
  const [showDigitalGenRx, setShowDigitalGenRx] = useState(true);
  const [rxDigitisedData, setRxDigitisedData] = useState(null);
  const [snapRxDigitisedData, setSnapRxDigitisedData] = useState(null);
  const [isRxdigitised, setIsRxdigitised] = useState(null);
  const [cvtDrawer, setCvtDrawer] = useState(false);
  const [printUrl, setPrintUrl] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [genRxData, setGenRxData] = useState(null);
  const [genRxVersion, setGenRxVersion] = useState(null);
  const [isGenRxTableView, setIsGenRxTableView] = useState(false);
  const [genRxQueries, setGenRxQueries] = useState(null);
  const [hasVideoConsult, setHasVideoConsult] = useState(false);
  const [isLoadingVideoStatus, setIsLoadingVideoStatus] = useState(false);
  const [ambientConversations, setAmbientConversations] = useState([]);
  /** Ambient transcript: array of { type: 'conversation'|'text', conversations?: [], text?: '' } for mixed bubbles + TEXT_WITH_CONTEXT */
  const [ambientTranscriptBlocks, setAmbientTranscriptBlocks] = useState([]);
  const [isAmbientRx, setIsAmbientRx] = useState(false);
  const lastGenRxFetchIdRef = useRef(null);
  const [selectedLang, setSelectedLang] = useState("");
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [mobilePdfNumPages, setMobilePdfNumPages] = useState(0);
  const [mobileExpectedPrintUrl, setMobileExpectedPrintUrl] = useState(null);
  const [mobileGenerationSeen, setMobileGenerationSeen] = useState(false);
  const [mobilePreviewReady, setMobilePreviewReady] = useState(false);

  const isSmartSyncAccessableFromGB = useFeatureIsOn(GB_ISCRIBE);
  const isChikitsalayAccessable = useChikitsalay();
  const isSmartSyncCVTAccessableFromGB = useFeatureIsOn(GB_SMARTSYNC_CVT);
  const isSnapRxAccessableFromGB = useFeatureIsOn(GB_SNAP_RX);
  const isSnapRxDigitizationAccessable = useFeatureIsOn(
    GB_SNAP_RX_DIGITIZATION
  );
  const isTabRxAccessableFromGB = useFeatureIsOn(GB_TAB_RX);
  const isTabRxCVTAccessableFromGB = useFeatureIsOn(GB_TAB_RX_CVT);
  const isVideoConsultOn = useFeatureIsOn(GB_VIDEO_CONSULT);
  const isTeleConsultOn = useFeatureIsOn(GB_TELE_CONSULT);
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
  const isVideoConsultAccessibleFromGB = isVideoConsultOn || isTeleConsultOn;
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
  const tp_monetization_enable = !shouldMonetizationDisabled();
  const isGroundingAccessable = useGrounding();

  const baseUrl = { customBaseUrl: env.casemanager_api_url };
  const baseUrlRxDigitise = env.rx_digitization;
  const rawSmartPrescriptionFilename = viewCaseManagerData?.smart_prescription_filename;
  const smartPrescriptionFilename = Array.isArray(rawSmartPrescriptionFilename)
    ? rawSmartPrescriptionFilename.find(Boolean)
    : rawSmartPrescriptionFilename;
  const isVoiceRxVisit = isValidMongoId(smartPrescriptionFilename);
  const normalizedGenRxVersion =
    typeof genRxVersion === "string" ? genRxVersion.trim().toLowerCase() : "";
  const isVoiceRxVersionLoading = isVoiceRxVisit && normalizedGenRxVersion === "";
  const isVoiceRxV3 = normalizedGenRxVersion === "v3";
  const shouldUseVoiceRxPrintPayload =
    isVoiceRxVisit && !isVoiceRxVersionLoading && !isVoiceRxV3;
  const shouldShowVoiceRxTabs =
    isVoiceRxVisit && !isVoiceRxVersionLoading && !!genRxData;
  const shouldUseNormalConsultPayload =
    !isVoiceRxVisit || isVoiceRxV3;
  const resolvedPrescriptionPamId =
    viewCaseManagerData?.pam_id ??
    tcmData?.pam_id ??
    patient_data?.pam_id ??
    viewCaseManagerData?.appointmentId ??
    tcmData?.appointmentId;

  const buildPrescriptionPrintViewUrl = useCallback(() => {
    if (!viewCaseManagerData?.print_url) return null;

    try {
      const urlObj = new URL(viewCaseManagerData.print_url);
      if (resolvedPrescriptionPamId) {
        urlObj.searchParams.set("pam_id", resolvedPrescriptionPamId);
      }
      if (shouldUseVoiceRxPrintPayload) {
        if (isAmbientRx) {
          urlObj.searchParams.set("ambientVoiceRxDigitize", "true");
          urlObj.searchParams.set("voiceRxDigitize", "false");
        } else {
          urlObj.searchParams.delete("ambientVoiceRxDigitize");
          urlObj.searchParams.set("voiceRxDigitize", "true");
        }
        urlObj.searchParams.set("rxDigitize", "false");
      } else {
        urlObj.searchParams.delete("ambientVoiceRxDigitize");
      }
      urlObj.searchParams.set("lg", selectedLang);
      return urlObj.toString();
    } catch (error) {
      console.error("Invalid print URL:", error);
      return null;
    }
  }, [
    resolvedPrescriptionPamId,
    isAmbientRx,
    selectedLang,
    shouldUseVoiceRxPrintPayload,
    viewCaseManagerData?.print_url,
  ]);

  useEffect(() => {
    setIsGenRxTableView(false);
    setSmartRxFile([]);
    setShowDigitalRx(false);
    setShowDigitalGenRx(true);
    if (viewCaseManagerData?.tcm_id) {
      fetchCustomModules();
      if(!viewCaseManagerData?.smart_prescription_filename?.includes("tab_rx")){
       fetchData();
      }
      if (isVideoConsultAccessibleFromGB) {
        checkVideoConsultStatus(viewCaseManagerData.tcm_id);
      }
    }
    if (viewCaseManagerData?.smart_prescription_filename?.includes("tab_rx")) {
      setIsTabRx(true);

      const fetchTabRxFile = async () => {
        try {
          const tcmId = viewCaseManagerData?.tcm_id;
          const patientUniqueId = patient_data?.patient_unique_id;
          if (!tcmId || !patientUniqueId) return;

          const res = await getTabRxFiles(tcmId, patientUniqueId);
          if (res?.success) {
            const tabRxData = res?.data;
            const tabRxFiles = tabRxData?.prescription_files;
            const tabRxDigitisedData = tabRxData?.digitization;
            const normalized = Array.isArray(tabRxFiles)
              ? tabRxFiles.map((item) => {
                  return {
                    smart_prescription_file: item?.fileUrl,
                    smart_prescription_filename: item?.filename,
                  };
                })
              : [];
            setSmartRxFile(normalized);
            setRxDigitisedData(tabRxDigitisedData);
            if (tabRxDigitisedData.isDigitize && tabRxDigitisedData.isVerified ) {
              setIsRxdigitised(true);
            } else {
              setIsRxdigitised(false);
            }
          } else {
            setSmartRxFile([]);
          }
        } catch (e) {
          console.error("Failed to fetch tab-rx files:", e);
          setSmartRxFile([]);
        }
      };

      fetchTabRxFile();
    }else{
      setIsTabRx(false);
    }
    if (
      isSnapRxAccessableFromGB &&
      viewCaseManagerData?.tcm_id &&
      viewCaseManagerData?.smart_prescription_filename?.includes("snap_rx")
    ) {
      setIsSnapRx(true);
      fetchSnapRxFile();
      if(isSnapRxDigitizationAccessable){
        fetchSnapRxDigitisedData(viewCaseManagerData?.tcm_id);
      }
    } else {
      setIsSnapRx(false);
    }
    if (
      isSmartSyncAccessableFromGB &&
      viewCaseManagerData?.smart_prescription_filename !== null &&
      viewCaseManagerData?.smart_prescription_filename?.includes(".jpeg") &&
      !viewCaseManagerData?.smart_prescription_filename?.includes("snap_rx") &&
      !viewCaseManagerData?.smart_prescription_filename?.includes("tab_rx") &&
      !isValidMongoId(viewCaseManagerData?.smart_prescription_filename)
      // viewCaseManagerData.medicine?.length === 0 &&
      // viewCaseManagerData.symptoms?.length === 0 &&
      // viewCaseManagerData.examination?.length === 0 &&
      // viewCaseManagerData.diagnosis?.length === 0 &&
      // viewCaseManagerData.advice?.length === 0 &&
      // viewCaseManagerData.investigation?.length === 0 &&
      // viewCaseManagerData.visit_advice &&
      // viewCaseManagerData.treatment
    ) {
      setIsSmartRxFile(true);
      if (viewCaseManagerData?.tcm_id && isSmartSyncCVTAccessableFromGB) {
        fetchRxDigitisedData(viewCaseManagerData?.tcm_id);
      }
    } else {
      setIsSmartRxFile(false);
    }
    if (viewCaseManagerData?.moduleContents?.length) {
      dispatch(getModules(userId));
    }
    if (isValidMongoId(smartPrescriptionFilename)) {
      if (lastGenRxFetchIdRef.current !== smartPrescriptionFilename) {
        lastGenRxFetchIdRef.current = smartPrescriptionFilename;
        getGenRxDetails(smartPrescriptionFilename);
      }
    } else {
      lastGenRxFetchIdRef.current = null;
      setIsAmbientRx(false);
      setGenRxData(null);
      setGenRxVersion(null);
      setGenRxQueries(null);
      setAmbientTranscriptBlocks([]);
      setAmbientConversations([]);
    }
  }, [viewCaseManagerData, isSnapRxDigitizationAccessable, isVideoConsultAccessibleFromGB, isVoiceRxNewFromGB, smartPrescriptionFilename]);

  // Function to update rxDigitize parameter in the URL
  const updateRxDigitizeInUrl = (url, showDigitalRx) => {
    const urlObj = new URL(url);

    urlObj.searchParams.delete('voiceRxDigitize');
    if (showDigitalRx) {
      urlObj.searchParams.set("rxDigitize", "true");
    } else {
      urlObj.searchParams.delete("rxDigitize");
    }

    // setPrintUrl(urlObj.toString());
    return urlObj.toString();
  };

  useEffect(() => {
    if (viewCaseManagerData?.print_url) {
      setPrintUrl(viewCaseManagerData?.print_url);
      // Only modify the URL if showDigitalRx is true, else keep printUrl unchanged
      const updatedUrl = updateRxDigitizeInUrl(
        viewCaseManagerData?.print_url,
        showDigitalRx || showDigitalSnapRx
      );

      setPrintUrl(updatedUrl);
    }
  }, [showDigitalRx, showDigitalSnapRx]);

  const checkVideoConsultStatus = async (tcmId) => {
    if (!tcmId) return;
    
    setIsLoadingVideoStatus(true);
    try {
      const response = await ApiVideoConsult.getAppointmentStatus(tcmId);
      if (response?.data?.pam_status_type_appointment === 1 || response?.data?.pam_status_type_appointment === 2) {
        setHasVideoConsult(true);
      } else {
        setHasVideoConsult(false);
      }
    } catch (error) {
      console.error("Error checking video consult status:", error);
      setHasVideoConsult(false);
    } finally {
      setIsLoadingVideoStatus(false);
    }
  };

  useEffect(() => {
    if (defaultPrintSettings) {
      getPatientDefaultLanguage();
    }
  }, [defaultPrintSettings]);

  // MOBILE OPTIMIZATION: Memoize PDF URL calculation to prevent expensive recalculations on every render
  // This function is called in render and useEffect, so memoization prevents redundant work
  // MUST be defined before mobilePdfUrl useMemo to avoid initialization error
  const getMobilePdfUrl = useCallback(() => {
    if (isVoiceRxVersionLoading) {
      return null;
    }

    // For SmartRx or SnapRx with digitization: use printUrl for Digital Rx, print_rx_url for Written Rx
    if ((isSmartRxFile || isTabRx) && isRxdigitised && !isSnapRx) {
      return showDigitalRx 
        ? (printUrl ? `${printUrl}&lg=${selectedLang}` : null)
        : (viewCaseManagerData?.print_rx_url ? `${viewCaseManagerData.print_rx_url}&lg=${selectedLang}` : null);
    }
    
    // For SnapRx with digitization: use printUrl for Digital Rx, print_rx_url for Written Rx
    if (isSnapRx && isSnapRxdigitised) {
      return showDigitalSnapRx 
        ? (printUrl ? `${printUrl}&lg=${selectedLang}` : null)
        : (viewCaseManagerData?.print_rx_url ? `${viewCaseManagerData.print_rx_url}&lg=${selectedLang}` : null);
    }
    
    // VoiceRx print URL is centralized so legacy empty caseManagerData visits use the right digitize payload.
    if (shouldUseVoiceRxPrintPayload && showDigitalGenRx && !isSmartRxFile && !isTabRx && !isSnapRx) {
      return buildPrescriptionPrintViewUrl();
    }
    
    // Default full prescription print uses print_url; print_rx_url is only for "Print Medicines Only".
    return shouldUseNormalConsultPayload && viewCaseManagerData?.print_url ? `${viewCaseManagerData.print_url}&lg=${selectedLang}` : null;
  }, [isVoiceRxVersionLoading, isSmartRxFile, isTabRx, isRxdigitised, isSnapRx, showDigitalRx, printUrl, selectedLang, viewCaseManagerData?.print_url, viewCaseManagerData?.print_rx_url, showDigitalSnapRx, isSnapRxdigitised, showDigitalGenRx, shouldUseVoiceRxPrintPayload, shouldUseNormalConsultPayload, buildPrescriptionPrintViewUrl]);

  // MOBILE OPTIMIZATION: Memoize PDF URL to avoid recalculating in render and useEffect
  // This prevents the effect from running unnecessarily when unrelated dependencies change
  const mobilePdfUrl = useMemo(() => {
    if (!(isMobile && !isTablet) || !viewCaseManagerData) return null;
    return getMobilePdfUrl();
  }, [isMobile, isTablet, viewCaseManagerData, getMobilePdfUrl]);

  // MOBILE OPTIMIZATION: Memoize PDF pages array to prevent recreation on every render
  // Only calculate when number of pages actually changes
  const pdfPages = useMemo(() => 
    mobilePdfNumPages > 0 
      ? Array.from({ length: mobilePdfNumPages }, (_, index) => index + 1)
      : [1], // Default to 1 page during initial load
    [mobilePdfNumPages]
  );

  // MOBILE OPTIMIZATION: Cache window width to avoid accessing window object in render
  // Only update on mount and when window actually resizes
  const [pdfWidth, setPdfWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth || 340;
    }
    return 340;
  });

  // MOBILE OPTIMIZATION: Update PDF width on window resize (debounced for performance)
  useEffect(() => {
    if (!(isMobile && !isTablet)) return;

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setPdfWidth(window.innerWidth || 340);
      }, 150); // Debounce resize events
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile, isTablet]);

  // Reset PDF loading state when PDF URL changes (e.g., switching between Digital Rx and Written Rx)
  // MOBILE OPTIMIZATION: Use memoized pdfUrl instead of calling function inside effect
  useEffect(() => {
    if ((isMobile && !isTablet) && mobilePdfUrl !== null) {
      setIsPdfLoading(true);
    }
  }, [isMobile, isTablet, mobilePdfUrl]);

  const shouldUsePrintRxPayload =
    showDigitalGenRx &&
    !isSmartRxFile &&
    !isSnapRx &&
    !showDigitalRx &&
    !showDigitalSnapRx && !isTabRx;

  const printUrlWithLang = useMemo(() => {
    if (isVoiceRxVersionLoading) {
      return null;
    }

    // Digital Rx / Snap Rx: use updated printUrl
    if (showDigitalRx || showDigitalSnapRx) {
      return printUrl ? `${printUrl}&lg=${selectedLang}` : null;
    }

    // VoiceRx print URL is centralized so legacy empty caseManagerData visits use the right digitize payload.
    if (shouldUseVoiceRxPrintPayload && showDigitalGenRx && !isSmartRxFile && !isSnapRx && !isTabRx) {
      return buildPrescriptionPrintViewUrl();
    }

    // Default full prescription print uses print_url; print_rx_url is only for "Print Medicines Only".
    return shouldUseNormalConsultPayload && viewCaseManagerData?.print_url
      ? `${viewCaseManagerData.print_url}&lg=${selectedLang}`
      : null;
  }, [
    isVoiceRxVersionLoading,
    showDigitalRx,
    showDigitalSnapRx,
    printUrl,
    selectedLang,
    showDigitalGenRx,
    shouldUseVoiceRxPrintPayload,
    shouldUseNormalConsultPayload,
    isSmartRxFile,
    isSnapRx,
    isTabRx,
    viewCaseManagerData?.print_url,
    viewCaseManagerData?.print_rx_url,
    buildPrescriptionPrintViewUrl,
  ]);

  const printRxUrlWithLang = useMemo(() => {
    if (!viewCaseManagerData?.print_rx_url) return null;
    return `${viewCaseManagerData.print_rx_url}&lg=${selectedLang}`;
  }, [viewCaseManagerData?.print_rx_url, selectedLang]);

  const {
    payload: printPayloadData,
    printBlob: printPayloadBlob,
    isGenerating: isPrintPayloadGenerating,
  } = usePrintPayloadPdf({
    printUrl: printUrlWithLang,
    selectedLang: selectedLang ? Number(atob(selectedLang)) : undefined,
    isGynaecHistoryAccessable: false,
    payloadOverride: null,
    skipFetch: !printUrlWithLang,
    isCvtExtHosAccessableFromGB,
  });

  const parseObjectValue = useCallback((value) => {
    if (!value || typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }, []);

  const unwrapDigitizePayload = useCallback((value) => {
    const parsedValue = parseObjectValue(value);
    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return null;
    }
    const candidate =
      parseObjectValue(parsedValue.voiceRxDigitizeEditedData) ||
      parseObjectValue(parsedValue.rxDigitizeEditedData) ||
      parseObjectValue(parsedValue.editedData) ||
      parseObjectValue(parsedValue.digitizeData) ||
      parseObjectValue(parsedValue.refinedData) ||
      parseObjectValue(parsedValue.payload) ||
      parseObjectValue(parsedValue.prescription) ||
      parsedValue;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return null;
    }
    const numericKeys = Object.keys(candidate).filter((key) => /^\d+$/.test(key));
    if (numericKeys.length && candidate[numericKeys[0]] && typeof candidate[numericKeys[0]] === "object") {
      return candidate[numericKeys[0]];
    }
    return candidate;
  }, [parseObjectValue]);

  const voiceRxPrintPayloadData = useMemo(() => {
    const smartData =
      printPayloadData?.smartDigitizeRxData ||
      printPayloadData?.smart_digitize_rx_data ||
      printPayloadData?.data?.smartDigitizeRxData ||
      printPayloadData?.data?.smart_digitize_rx_data ||
      printPayloadData?.data?.data?.smartDigitizeRxData ||
      printPayloadData?.data?.data?.smart_digitize_rx_data ||
      null;
    if (!smartData) return null;
    const parsedSmartData = parseObjectValue(smartData);
    return (
      unwrapDigitizePayload(parsedSmartData?.voiceRxDigitizeEditedData) ||
      unwrapDigitizePayload(parsedSmartData?.editedData) ||
      unwrapDigitizePayload(parsedSmartData?.digitizeData) ||
      unwrapDigitizePayload(parsedSmartData?.refinedData) ||
      unwrapDigitizePayload(parsedSmartData)
    );
  }, [parseObjectValue, printPayloadData, unwrapDigitizePayload]);

  const legacyVoiceRxDisplayData = voiceRxPrintPayloadData || genRxData;

  const buildPayloadBlobFromPrintUrl = useCallback(async (sourceUrl) => {
    if (!sourceUrl) return null;
    const urlObj = new URL(sourceUrl, window.location.origin);
    urlObj.searchParams.set("output", "json");
    const response = await axios.get(urlObj.toString());
    const payload = response?.data?.data || null;
    if (!payload) return null;
    const blob = await renderPrintPayloadToBlob(
      { ...payload, isCvtExtHosAccessableFromGB },
      {
        selectedLang: selectedLang ? Number(atob(selectedLang)) : undefined,
        isGynaecHistoryAccessable: false,
      },
    );
    if (!(blob instanceof Blob)) return null;
    const header = await blob.slice(0, 5).text();
    if (header !== "%PDF-") return null;
    return blob;
  }, [selectedLang, isCvtExtHosAccessableFromGB]);

  useEffect(() => {
    if (!(isMobile && !isTablet) || !showDigitalGenRx || !printUrlWithLang) {
      setMobileExpectedPrintUrl(null);
      setMobileGenerationSeen(false);
      setMobilePreviewReady(false);
      return;
    }
    setMobileExpectedPrintUrl(printUrlWithLang);
    setMobileGenerationSeen(false);
    setMobilePreviewReady(false);
  }, [isMobile, isTablet, showDigitalGenRx, printUrlWithLang]);

  useEffect(() => {
    if (!(isMobile && !isTablet) || !showDigitalGenRx || !mobileExpectedPrintUrl) {
      return;
    }
    if (printUrlWithLang !== mobileExpectedPrintUrl) {
      return;
    }
    if (isPrintPayloadGenerating) {
      setMobileGenerationSeen(true);
      setMobilePreviewReady(false);
      return;
    }
    setMobilePreviewReady(
      mobileGenerationSeen && printPayloadBlob instanceof Blob
    );
  }, [
    isMobile,
    isTablet,
    showDigitalGenRx,
    mobileExpectedPrintUrl,
    printUrlWithLang,
    mobileGenerationSeen,
    isPrintPayloadGenerating,
    printPayloadBlob,
  ]);

  const getPatientDefaultLanguage = async () => {
    const res = await fetchPatientDefaultLanguage(patient_data?.patient_unique_id);
    if (res?.settings?.defaultLanguage && res.settings.defaultLanguage !== "English") {
      setSelectedLang(btoa(res.settings.defaultLanguage.toString()));
    } else if (defaultPrintSettings?.default_language && defaultPrintSettings?.default_language !== "English") {
      setSelectedLang(btoa(defaultPrintSettings?.default_language?.toString()));
    }
  };

  const fetchCustomModules = async () => {
    try {
      if (
        !viewCaseManagerData?.moduleContents?.length
      ) {
        setCustomModulesRxData([]);
        return;
      }

      const moduleContents = viewCaseManagerData.moduleContents.filter(
        (module) => module.content && module.content.length > 0
      );

      if (isVoiceRxNewFromGB) {
        setCustomModulesRxData(moduleContents);
      }

      if (!viewCaseManagerData?.doctor_data?.um_id) {
        if (!isVoiceRxNewFromGB) setCustomModulesRxData([]);
        return;
      }

      const response = await ApiCustomModule.getModules(
        viewCaseManagerData.doctor_data.um_id
      );
      const moduleDefinitions = response?.modules || response?.data?.modules || [];

      const customModulesMap = new Map(
        moduleDefinitions.map((module) => [module.module_id, module])
      );

      const processedModules = moduleContents
        .map((content) => ({
          ...content,
          module_name: customModulesMap.get(content.module_id)?.name || content?.module_name,
          namedFields: customModulesMap.get(content.module_id)?.namedFields || content?.namedFields,
        }));

      setCustomModulesRxData(processedModules);
    } catch (error) {
      console.error("Error fetching custom modules:", error);
      if (isVoiceRxNewFromGB && viewCaseManagerData?.moduleContents?.length) {
        setCustomModulesRxData(
          viewCaseManagerData.moduleContents.filter(
            (module) => module.content && module.content.length > 0
          )
        );
        return;
      }
      setCustomModulesRxData([]);
    }
  };

  const fetchData = async () => {
    const payload = {
      tcm_id: viewCaseManagerData?.tcm_id,
    };
    try {
      if (viewCaseManagerData?.smart_prescription_filename?.includes(".jpeg")) {
        const response = await api.post(FETCH_SMART_RX, payload, baseUrl);
        if (response?.data?.length) {
          setSmartRxFile(response?.data);
        } else {
          setSmartRxFile(null);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchSnapRxFile = async () => {
    const response = await getSnapRxFiles(
      patient_data.patient_unique_id,
      viewCaseManagerData?.tcm_id,
      null
    );
    setSnapRxFile(response?.uploaded_files || []);
  };

  const isSymptomCollectorJSON = useCallback((text) => {
    if (typeof text !== "string") return false;
    const trimmed = text.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== "object") return false;
      return (
        Array.isArray(parsed.symptoms) ||
        Array.isArray(parsed.medicalHistory) ||
        typeof parsed.notes === "string" ||
        typeof parsed.others === "string"
      );
    } catch (error) {
      return false;
    }
  }, []);

  const hasVoiceConversation = (conversation) => {
    if (Array.isArray(conversation)) return conversation.length > 0;
    return typeof conversation === "string" && conversation.trim() !== "";
  };

  const isDoctorTranscriptSpeaker = (speaker) => {
    const normalized = String(speaker || "").trim().toLowerCase();
    return normalized === "doctor" || normalized === "dr";
  };

  const getGenRxDetails = async (recordId) => {
    try {
      setIsGenRxTableView(false);
      setGenRxVersion(null);
      const initialResponse = await getGenRx(recordId);

      if (initialResponse.success) {
        const payload = initialResponse.data ?? initialResponse.response;
        if (payload) {
          if (lastGenRxFetchIdRef.current !== recordId) return;
          const d = payload;
          const voiceHistory = Array.isArray(d) ? d : (Array.isArray(d?.history) ? d.history : []);
          const normalizedVersion =
            typeof d?.version === "string" && d.version.trim()
              ? d.version.trim().toLowerCase()
              : "legacy";
          setGenRxVersion(normalizedVersion);
          const hasTabularView = normalizedVersion === "v2";
          setIsGenRxTableView(hasTabularView);
          setSnapRxDigitisedData([]);
          setRxDigitisedData([]);

          // Ambient = conversation in history (no rxDigitizationHistory)
          const isAmbientMode = Boolean(
            d?.isAmbientVoiceRxDigitizeBool ||
              d?.ambientVoiceRxDigitizeEditedData ||
              voiceHistory.some((h) => hasVoiceConversation(h?.conversation))
          );
          setIsAmbientRx(isAmbientMode);

          // Prescription: editedData → digitizeData → digitize (top, history[0], or latest history)
          let prescriptionData = d.ambientVoiceRxDigitizeEditedData ?? d.editedData ?? d.digitizeData ?? null;
          if (!prescriptionData) {
            const lastHistory = voiceHistory.length > 0 ? voiceHistory[voiceHistory.length - 1] : null;
            const digitize = d.digitize ?? voiceHistory?.[0]?.digitize ?? lastHistory?.digitize;
            if (digitize && typeof digitize === "object" && !Array.isArray(digitize)) {
              const numericKeys = Object.keys(digitize).filter((k) => /^\d+$/.test(k));
              prescriptionData = numericKeys.length ? digitize[numericKeys[0]] : digitize;
            } else if (digitize) {
              prescriptionData = digitize;
            }
          }

          if (isAmbientMode) {
            setGenRxData(prescriptionData || {});

            // Build transcript blocks from history: conversation bubbles or TEXT_WITH_CONTEXT as text (no bubbles)
            const historyItems = voiceHistory.filter((h) =>
              hasVoiceConversation(h.conversation) ||
              (h.transcription && h.transcription.trim()) ||
              (h.source && typeof h.source === "string" && h.source.trim())
            ) ?? [];
            const blocks = historyItems.map((h) => {
              const isTextOnly = h.type === "TEXT_WITH_CONTEXT";
              const text =
                h.transcription ??
                (typeof h.conversation === "string" ? h.conversation : "") ??
                (typeof h.source === "string" ? h.source : "") ??
                "";
              if (isTextOnly) {
                return { type: "text", text };
              }
              if (typeof h.conversation === "string") {
                return { type: "text", text: h.conversation };
              }
              return { type: "conversation", conversations: Array.isArray(h.conversation) ? h.conversation : [] };
            }).filter((b) => b.type === "text" ? (b.text && b.text.trim()) : b.conversations.length > 0);

            setAmbientTranscriptBlocks(blocks);
            setAmbientConversations(historyItems.flatMap((h) => Array.isArray(h.conversation) ? h.conversation : []));
          } else {
            // Dictate: use full history for transcripts (one per update)
            setGenRxData(prescriptionData ?? d?.editedData ?? d?.digitizeData);
            const historyTranscriptions = voiceHistory
              ?.map((item) => item.transcription)
              ?.filter((t) => t && t !== "null" && t.trim());
            setGenRxQueries(historyTranscriptions?.length > 0 ? historyTranscriptions : null);
          }
        } else {
          throw new Error(initialResponse.error || "Failed to get Rx");
        }
      } else {
        throw new Error(initialResponse.error || "Failed to get Rx");
      }
    } catch (error) {
      console.error("Error getting Rx details:", error);
    }
  };

  const handleDrawerCvtKnowMore = useCallback(() => {
    setCvtDrawer(!cvtDrawer);
  }, [cvtDrawer]);

  //Handle Sider
  const handleCollapsed = useCallback(
    (flag) => {
      // if (flag === 1) {
      //     handleDrawerVital();
      // }
      if (flag === 5) {
        handleDrawerCvtKnowMore();
      }
    },
    [cvtDrawer]
  );

  async function printRxInAppContent() {
    sendMessageToParent(EVENTS.PRINT, { url: `${viewCaseManagerData?.print_rx_url}&lg=${selectedLang}` });
  }
  async function printRxContent() {
    if (!printRxUrlWithLang) {
      errorMessage("Print URL is missing.");
      return;
    }
    let blobToPrint = null;

    const messageKey = "mobile-print-rx-generate";
    message.open({
      key: messageKey,
      type: "loading",
      content: "Preparing PDF...",
      duration: 0,
    });
    try {
      blobToPrint = await buildPayloadBlobFromPrintUrl(printRxUrlWithLang);
    } catch (err) {
      message.open({
        key: messageKey,
        type: "error",
        content: "Failed to generate PDF.",
        duration: 2,
      });
      return;
    } finally {
      message.destroy(messageKey);
    }

    if (!(blobToPrint instanceof Blob)) {
      message.error("Failed to generate PDF.");
      return;
    }

    const blobURL = URL.createObjectURL(blobToPrint);
    window.open(blobURL, "_blank");
  }

  const handleChange = (pagination, filters, sorter) => {
    setFilteredInfo(filters);
    setSortedInfo(sorter);
  };

  const items = [
    {
      label: (
        <div
          onClick={() =>
            !isChrome && !isSafari ? printRxInAppContent() : printRxContent()
          }
        >
          Print Medicines Only
        </div>
      ),
      key: "printrx",
    },
    // {
    //     label: 'Saved as a Template',
    //     key: 'SavedasTemplate',
    // }
  ];

  const medicationData = viewCaseManagerData
    ? JSON.parse(JSON.stringify(viewCaseManagerData.medicine))
    : [];

  const innerMedication = (index) => {
    const mainArray = [];
    for (var i = index; i < medicationData.length; i++) {
      if (medicationData[i].tmm_id == medicationData[index].tmm_id) {
        mainArray.push(medicationData[i]);
      } else {
        break;
      }
    }
    return mainArray;
  };
  var sNO = 1;
  const columns = [
    {
      title: "S.NO",
      dataIndex: "rx",
      key: "rx",
      width: "40px",
      className: "rowspan-border-0",
      render: (text, record, index) => (
        <div>
          <span>
            {record?.tmm_id != medicationData[index - 1]?.tmm_id && sNO++}
          </span>
        </div>
      ),
      onCell: (record, index) => {
        if (record?.tmm_id != medicationData[index - 1]?.tmm_id) {
          return {
            rowSpan: innerMedication(index)?.length,
          };
        }
        if (record?.tmm_id == medicationData[index - 1]?.tmm_id) {
          return {
            rowSpan: 0,
          };
        }
      },
    },
    {
      title: "MEDICINE",
      dataIndex: "name",
      key: "name",
      className: "rowspan-border-0",
      render: (text, record) => (
        <div className="lh-base">
          <div className="fw-medium">{record.tmm_medicine_name}</div>
          <small>{record.tmm_generic}</small>
        </div>
      ),
      onCell: (record, index) => {
        if (record?.tmm_id != medicationData[index - 1]?.tmm_id) {
          return {
            rowSpan: innerMedication(index)?.length,
          };
        }
        if (record?.tmm_id == medicationData[index - 1]?.tmm_id) {
          return {
            rowSpan: 0,
          };
        }
      },
    },
    {
      title: "DOSE",
      dataIndex: "upd",
      key: "upd",
      width: "110px",
      render: (text, record, index) => (
        <>
          <div>{`${
            record.tmm_dosage && record.tmm_unit
              ? `${medicine_freq_dosage_format(record.tmm_dosage, medicationCaseOptions?.is_dosage_decimal)} ${
                  record?.medicineUnit &&
                  record?.medicineUnit.find(
                    (x) => x.tmu_id == record.tmm_unit
                  ) !== undefined
                    ? record?.medicineUnit.find(
                        (x) => x.tmu_id == record.tmm_unit
                      ).tmu_title
                    : ""
                }`
              : `${
                  record?.medicineUnit &&
                  record?.medicineUnit.find(
                    (x) => x.tmu_id == record.default_tmm_unit
                  ) !== undefined
                    ? record?.medicineUnit.find(
                        (x) => x.tmu_id == record.default_tmm_unit
                      ).tmu_title
                    : ""
                }`
          }`}</div>

          {record?.tmm_id == medicationData[index - 1]?.tmm_id && (
            <div className="badge-then">Then</div>
          )}
        </>
      ),
    },
    {
      title: "Frequency",
      dataIndex: "TimeFrequency",
      key: "TimeFrequency",
      render: (text, record) => (
        <div className="lh-base">
          {record.tmf_block == 0 || record.tmf_block == ""
            ? `${
                record.tcm_tmm_freq_morning ||
                record.tcm_tmm_freq_afternoon ||
                record.tcm_tmm_freq_evening ||
                record.tcm_tmm_freq_night
                  ? `${
                      record.tcm_tmm_freq_morning
                        ? medicine_freq_dosage_format(
                            record.tcm_tmm_freq_morning
                          , medicationCaseOptions?.is_dosage_decimal)
                        : 0
                    }-${
                      record.tcm_tmm_freq_afternoon
                        ? medicine_freq_dosage_format(
                            record.tcm_tmm_freq_afternoon
                          , medicationCaseOptions?.is_dosage_decimal)
                        : 0
                    }${
                      record.tcm_tmm_freq_evening
                        ? "-" +
                          medicine_freq_dosage_format(
                            record.tcm_tmm_freq_evening
                          , medicationCaseOptions?.is_dosage_decimal)
                        : ""
                    }-${
                      record.tcm_tmm_freq_night
                        ? medicine_freq_dosage_format(record.tcm_tmm_freq_night, medicationCaseOptions?.is_dosage_decimal)
                        : 0
                    }`
                  : `-`
              }`
            : `(${
                frequencyList.find((x) => x.tmf_id == record.tmm_freq_type) !==
                undefined
                  ? frequencyList.find((x) => x.tmf_id == record.tmm_freq_type)
                      .tmf_title
                  : ""
              })`}
          <div>
            {timingList.find((x) => x.tmt_id == record.tmm_time) !== undefined && timingList.find((x) => x.tmt_id == record.tmm_time)?.tmt_title !== "None"
              ? timingList.find((x) => x.tmt_id == record.tmm_time).tmt_title
              : ""}
          </div>
        </div>
      ),
    },
    {
      title: "Duration",
      dataIndex: "duration",
      key: "duration",
      width: "82px",
      render: (text, record) => (
        <div>
          {EXTRA_OPTIONS.some((x) => x.value == record.tmm_duration_type)
            ? capitalize(record.tmm_duration_type, true)
            : isNumeric(record.tmm_days)
            ? `${record.tmm_days} ${record.tmm_duration_type}`
            : "-"}
        </div>
      ),
    },
    {
      title: "QTY",
      dataIndex: "qty",
      key: "qty",
      width: "50px",
      render: (text, record) => (
        <div>{`${record.display_qty ? record.display_qty : "-"}`}</div>
      ),
    },
    {
      title: "Notes",
      dataIndex: "note",
      key: "note",
      render: (text, record) => (
        <div>{`${record.tmm_remarks ? record.tmm_remarks : "-"}`}</div>
      ),
    },
  ];

  const printContent = async () => {
    if (showDigitalRx || showDigitalSnapRx) {
      showDigitalRx &&
        window.Moengage.track_event("TP_Digitised_Prescription_Print", {
          Doctor_Name: profile?.um_name,
          Doctor_Number: profile?.um_contact,
          Doctor_Unique_Id: profile?.doctor_unique_id,
        });
    }

    if (!printUrlWithLang) {
      errorMessage("Print URL is missing.");
      return;
    }
    if (isMobile && !isTablet) {
      if (!mobilePreviewReady || !(printPayloadBlob instanceof Blob)) {
        message.error("The PDF is not ready yet. Please wait a moment and try again.");
        return;
      }
      const blobURL = URL.createObjectURL(printPayloadBlob);
      window.open(blobURL, "_blank");
      return;
    }
    if (isPrintPayloadGenerating) {
      message.error("The PDF is not ready yet. Please wait a moment and try again.");
      return;
    }
    let blobToPrint = printPayloadBlob;

    if (!(blobToPrint instanceof Blob)) {
      const messageKey = "mobile-print-generate";
      message.open({
        key: messageKey,
        type: "loading",
        content: "Preparing PDF...",
        duration: 0,
      });
      try {
        blobToPrint = await buildPayloadBlobFromPrintUrl(printUrlWithLang);
      } catch (err) {
        message.open({
          key: messageKey,
          type: "error",
          content: "Failed to generate PDF.",
          duration: 2,
        });
        return;
      }
      message.destroy(messageKey);
    }

    if (!(blobToPrint instanceof Blob)) {
      message.error("Failed to generate PDF.");
      return;
    }

    const blobURL = URL.createObjectURL(blobToPrint);
    window.open(blobURL, "_blank");
  };

  const isPrintDisabled =
    (isChrome || isSafari) &&
    !!printUrlWithLang &&
    isPrintPayloadGenerating;

  const printDisabledTooltip = isPrintDisabled
    ? "PDF is getting created. Please wait a moment."
    : "";

  const printInAppContent = async () => {
    if (shouldUseVoiceRxPrintPayload && showDigitalGenRx) {
      window.Moengage.track_event("TP_Digitised_Prescription_Print", {
        Doctor_Name: profile?.um_name,
        Doctor_Number: profile?.um_contact,
        Doctor_Unique_Id: profile?.doctor_unique_id,
      });
    }

    let printUrlRx =
      showDigitalRx || showDigitalSnapRx
        ? printUrl
        : shouldUseVoiceRxPrintPayload && showDigitalGenRx && !isTabRx
          ? buildPrescriptionPrintViewUrl()
          : viewCaseManagerData?.print_url;

    if (!printUrlRx) {
      errorMessage("Print URL is missing.");
      return;
    }

    try {
      const urlObj = new URL(printUrlRx);
      urlObj.searchParams.set("lg", selectedLang);
      printUrlRx = urlObj.toString();
    } catch (error) {
      printUrlRx = `${printUrlRx}&lg=${selectedLang}`;
    }

    sendMessageToParent(EVENTS.PRINT, { url: printUrlRx });
    // navigate(`/patient_details/?url=${printUrl}&lg=${selectedLang}&key=print`, {
    //   replace: true,
    //   state: { patient_data: patient_data },
    // });
    // navigate(0, { replace: true });
  };

  const downloadContent = async () => {
    try {
      if (showDigitalRx || showDigitalSnapRx) {
        if (showDigitalRx) {
          window.Moengage.track_event("TP_Digitised_Prescription_Download", {
            Doctor_Name: profile?.um_name,
            Doctor_Number: profile?.um_contact,
            Doctor_Unique_Id: profile?.doctor_unique_id,
          });
        }
      }

      if (!printUrlWithLang) {
        errorMessage("Download URL is missing.");
        return;
      }
      if (isMobile && !isTablet) {
        if (!mobilePreviewReady || !(printPayloadBlob instanceof Blob)) {
          message.error("The PDF is not ready yet. Please wait a moment and try again.");
          return;
        }
        const fileName = `prescription_${moment(viewCaseManagerData?.consultation_date).format('YYYY-MM-DD')}.pdf`;
        saveAs(printPayloadBlob, fileName);
        return;
      }
      if (isPrintPayloadGenerating) {
        message.error("The PDF is not ready yet. Please wait a moment and try again.");
        return;
      }
      const fileName = `prescription_${moment(viewCaseManagerData?.consultation_date).format('YYYY-MM-DD')}.pdf`;
      let blobToDownload = printPayloadBlob;
      if (!(blobToDownload instanceof Blob)) {
        const messageKey = "mobile-download-generate";
        message.open({
          key: messageKey,
          type: "loading",
          content: "Preparing PDF...",
          duration: 0,
        });
        try {
          blobToDownload = await buildPayloadBlobFromPrintUrl(printUrlWithLang);
        } catch (err) {
          message.open({
            key: messageKey,
            type: "error",
            content: "Failed to generate PDF.",
            duration: 2,
          });
          return;
        } finally {
          message.destroy(messageKey);
        }
      }
      if (!(blobToDownload instanceof Blob)) {
        message.error("Failed to generate PDF.");
        return;
      }
      saveAs(blobToDownload, fileName);
      return;
    } catch (error) {
      console.error('Error downloading file:', error);
      errorMessage('Failed to download prescription');
    }
  };

  const downloadInAppContent = async () => {
    const sendPayloadBlobToParent = async () => {
      if (!printUrlWithLang) {
        errorMessage("Download URL is missing.");
        return;
      }
      if (isMobile && !isTablet) {
        if (!mobilePreviewReady || !(printPayloadBlob instanceof Blob)) {
          message.error("PDF is not ready yet.");
          return;
        }
        const file = new File(
          [printPayloadBlob],
          `${new Date().toISOString().split("T")[0]}.pdf`,
          { type: "application/pdf" }
        );
        const formData = new FormData();
        formData.append(file?.name, file);
        const res = await uploadDocsToAzure(formData);
        const uploadedUrl = res?.[0]?.url;
        if (!uploadedUrl) {
          message.error("Failed to upload PDF.");
          return;
        }
        sendMessageToParent(EVENTS.DOWNLOAD, { url: uploadedUrl });
        return;
      }
      if (isPrintPayloadGenerating) {
        message.error("PDF is not ready yet.");
        return;
      }
      let blobToUpload = printPayloadBlob;
      if (!(blobToUpload instanceof Blob)) {
        const messageKey = "mobile-download-parent-generate";
        message.open({
          key: messageKey,
          type: "loading",
          content: "Preparing PDF...",
          duration: 0,
        });
        try {
          blobToUpload = await buildPayloadBlobFromPrintUrl(printUrlWithLang);
        } catch (err) {
          message.open({
            key: messageKey,
            type: "error",
            content: "Failed to generate PDF.",
            duration: 2,
          });
          return;
        } finally {
          message.destroy(messageKey);
        }
      }
      if (!(blobToUpload instanceof Blob)) {
        message.error("Failed to generate PDF.");
        return;
      }
      const file = new File(
        [blobToUpload],
        `${new Date().toISOString().split("T")[0]}.pdf`,
        { type: "application/pdf" }
      );
      const formData = new FormData();
      formData.append(file?.name, file);
      const res = await uploadDocsToAzure(formData);
      const uploadedUrl = res?.[0]?.url;
      if (!uploadedUrl) {
        message.error("Failed to upload PDF.");
        return;
      }
      sendMessageToParent(EVENTS.DOWNLOAD, { url: uploadedUrl });
    };

    if (shouldUseVoiceRxPrintPayload && showDigitalGenRx) {
      window.Moengage.track_event("TP_Digitised_Prescription_Download", {
        Doctor_Name: profile?.um_name,
        Doctor_Number: profile?.um_contact,
        Doctor_Unique_Id: profile?.doctor_unique_id,
      });
    }

    await sendPayloadBlobToParent();
  };

  useEffect(() => {
    if (onPrintHandlersReady && typeof onPrintHandlersReady === 'function') {
      onPrintHandlersReady({
        printContent: () => {
          if (!isChrome && !isSafari) {
            printInAppContent();
          } else {
            printContent();
          }
        },
        downloadContent: () => {
          if (!isChrome && !isSafari) {
            downloadInAppContent();
          } else {
            downloadContent();
          }
        },
        printRxContent: () => {
          if (!isChrome && !isSafari) {
            printRxInAppContent();
          } else {
            printRxContent();
          }
        },
        editRx: handleEditRxClick,
      });
    }
  }, [
    onPrintHandlersReady,
    isChrome,
    isSafari,
    printInAppContent,
    printContent,
    downloadInAppContent,
    downloadContent,
    printRxInAppContent,
    printRxContent,
  ]);

  const handleEditRxClick = async () => {
    window.Moengage.track_event("edit_rx_click", {
      doctor_id: profile?.doctor_unique_id,
      patient_id:
        patient_data !== undefined ? patient_data.patient_unique_id : 0,
      rx_date: viewCaseManagerData?.consultation_date,
    });

    if (isTabRx) {
      return navigate("/tab-rx", {
        state: {
          patient_data: patient_data,
          tcm_id: viewCaseManagerData?.tcm_id,
          pam_id: viewCaseManagerData?.pam_id,
          fromEditRx: true,
          smartRxFilesData: smartRxFile,
        },
      });
    }

    if (isSnapRx && isSnapRxAccessableFromGB) {
      return navigate("/snap-rx", {
        state: {
          patient_data: patient_data,
          caseManagerData: viewCaseManagerData,
        },
      });
    }

    const isVoiceRxEdit = isValidMongoId(viewCaseManagerData?.smart_prescription_filename);
    if (isVoiceRxNewFromGB && isVoiceRxEdit) {
      let videoConsultData;
      try {
        const tcmId = viewCaseManagerData?.tcm_id || tcmData?.tcm_id;
        if (tcmId) {
          const response = await ApiVideoConsult.getAppointmentStatus(tcmId);
          const statusType = response?.data?.pam_status_type_appointment;
          const pamId = response?.data?.pam_id;
          if (statusType === 2 && pamId) {
            videoConsultData = { pam_id: pamId, pam_status_type_appointment: statusType };
          }
        }
      } catch (error) {}
      if (isAmbientRx) {
        window.TATVA_ACTIVE_VOICE_SERVICE = S_AMBIENT_VOICE_RX;
      } else {
        window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;
      }
      return navigate("/prescription", {
        state: {
          patient_data: patient_data,
          send_path: "patient_details",
          caseManagerData: viewCaseManagerData,
          isEditRx: true,
          isVoiceRxNewUiFlow: true,
          ...(videoConsultData ? { videoConsultData } : {}),
        },
      });
    }

    if (isSmartRxFile) {
      navigate("/smart-prescription", {
        state: {
          patient_data: patient_data,
          caseManagerData: viewCaseManagerData,
          smartRxFilesData: smartRxFile,
        },
      });
    } else {
      let videoConsultData;
      try {
        const tcmId = viewCaseManagerData?.tcm_id || tcmData?.tcm_id;
        if (tcmId) {
          const response = await ApiVideoConsult.getAppointmentStatus(tcmId);
          const statusType = response?.data?.pam_status_type_appointment;
          const pamId = response?.data?.pam_id;
          if (statusType === 2 && pamId) {
            videoConsultData = { pam_id: pamId, pam_status_type_appointment: statusType };
          }
        }
      } catch (error) {}

      if (isAmbientRx) {
        window.TATVA_ACTIVE_VOICE_SERVICE = S_AMBIENT_VOICE_RX;
      } else {
        window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;
      }
      console.log("viewCaseManagerData", viewCaseManagerData);
      console.log("isVoiceRxNewFromGB", isVoiceRxNewFromGB);
      console.log("shouldUseNewPrescriptionUi(viewCaseManagerData, isVoiceRxNewFromGB)", shouldUseNewPrescriptionUi(viewCaseManagerData, isVoiceRxNewFromGB));
      navigate("/prescription", {
        state: {
          patient_data: patient_data,
          send_path: "patient_details",
          caseManagerData: viewCaseManagerData,
          isEditRx: true,
          ...(shouldUseNewPrescriptionUi(viewCaseManagerData, isVoiceRxNewFromGB) ? { isVoiceRxNewUiFlow: true } : {}),
          ...(videoConsultData ? { videoConsultData } : {}),
        },
      });
    }
  };

  // Edit button visibility rules:
  // 1) SmartRx (non-tab_rx): only on mobile (not tablet)
  // 2) TabRx: show on tablet or mobile
  // 3) Everything else (SnapRx, VoiceRx, SmartRx null): show
  const shouldShowEditButton = useCallback(() => {
    const isVoiceRx = isValidMongoId(viewCaseManagerData?.smart_prescription_filename);
    if(isVoiceRx){
      return true;
    }

    if (isSmartRxFile && !isTabRx) {
      return !isMobile && !isTablet;
    }

    if (isTabRx) {
      return isTablet || isMobile;
    }

    // !(isSmartRxFile && (isMobile && !isTablet))

    return true;
  }, [isSmartRxFile, isTabRx]);

  const fetchRxDigitisedData = async (caseId) => {
    try {
      const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
      const cleanedToken = token.replace(/['"]+/g, "");

      // API call for Rx Digitisation
      const response = await axios.get(
        `${baseUrlRxDigitise}/api/v1/rxdigitize/rx/${caseId}`,
        {
          headers: {
            Authorization: `Bearer ${cleanedToken}`,
          },
        }
      );
      if (response?.data?.data) {
        if (response?.data?.data?.version?.trim().toLowerCase() === "v2") {
          setIsGenRxTableView(true);
          setGenRxData([]);
          setSnapRxDigitisedData([]);
        }
        setRxDigitisedData(response?.data?.data);
        if (response?.data?.data?.isDigitize) {
          setIsRxdigitised(true);
        } else {
          setIsRxdigitised(false);
        }
      } else {
        setRxDigitisedData(null);
      }

      return response.data; // return the data after it's fetched
    } catch (error) {
      console.error("Error digitizing the prescription:", error);
      return null;
    }
  };

  const fetchSnapRxDigitisedData = async (tcmId) => {
    try {
      const response = await getSnapRxDigitization(
        patient_data.patient_unique_id,
        tcmId,
        null
      );

      if (response?.digitization) {
        if (response?.digitization?.version?.trim().toLowerCase() === "v2") {
          setIsGenRxTableView(true);
          setGenRxData([]);
          setRxDigitisedData([]);
        }
        setSnapRxDigitisedData(
          response?.digitization?.editedData ||
            response?.digitization?.refinedData
        );
        if (response?.digitization?.isDigitize && response?.digitization?.isVerified) {
          setIsSnapRxdigitised(response?.digitization?.isDigitize);
        }
      } else {
        setSnapRxDigitisedData(null);
        setIsSnapRxdigitised(false);
      }

      return response.digitization; // return the data after it's fetched
    } catch (error) {
      console.error("Error digitizing the prescription:", error);
      return null;
    }
  };

  const handleDigitiseRx = async (record) => {
    const type = viewCaseManagerData?.isCustomSSRX === "1" ? 1 : 0;
    const tokenData = getTokenData();
    const clinic = getClinic(profile?.hospital_data);
    const resolvedAppointmentId =
      viewCaseManagerData?.pam_id ??
      tcmData?.pam_id ??
      patient_data?.pam_id ??
      viewCaseManagerData?.appointmentId ??
      tcmData?.appointmentId;
    window.Moengage.track_event("TP_DigitizeSSRx", {
    patient_id: patient_data?.patient_unique_id || "",
    patient_name: patient_data?.pm_fullname || "",
    doctor_id: profile?.doctor_unique_id,
    doctor_name: profile?.um_name,
    doctor_specialty: profile?.dp_name,
    clinic_id: tokenData?.clinic_id,
    clinic_name: clinic?.hm_name,
    rx_id: viewCaseManagerData?.tcm_id || "",
    source: "Patient Details page",
    type: type,
    device_details: navigator.userAgent
  });
    navigate(isTabRx ? "/tabrx-digitization" : "/smart-rx-digitise", {
      state: {
        patient_data: patient_data,
        smartRxFilesData: smartRxFile,
        tcm_id: viewCaseManagerData?.tcm_id,
        print_url: viewCaseManagerData?.print_rx_url,
        pam_id: resolvedAppointmentId,
        digitisedData: rxDigitisedData,
        page: "patient-summary",
        type: "new",
      },
    });
  };

  const handleDigitiseSnapRx = async (record) => {
    navigate("/snap-rx/digitise", {
      state: {
        patient_data: patient_data,
        smartRxFilesData: snapRxFile,
        tcm_id: viewCaseManagerData?.tcm_id,
        print_url: viewCaseManagerData?.print_rx_url,
        pam_id: patient_data?.pam_id,
        digitisedData: snapRxDigitisedData,
        page: "patient-summary",
        type: "new",
      },
    });
  };

  const getLabInvestigationNote = (item) => {
    const name = String(item?.name || "").trim();
    const instruction = String(item?.instruction || "").trim();
    const rawNote = String(item?.note || item?.notes || "").trim();
    if (instruction) return instruction;
    if (!rawNote) return "";
    if (!name) return rawNote;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const namePrefixRegex = new RegExp(`^${escapedName}\\s*[,:-]?\\s*`, "i");
    const cleanedNote = rawNote.replace(namePrefixRegex, "").trim();
    return cleanedNote || rawNote;
  };

  const hasDisplayableValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed !== "" && trimmed.toLowerCase() !== "null";
    }
    return typeof value !== "object";
  };

  const formatDisplayValue = (value, formatter) => {
    if (!hasDisplayableValue(value)) return "";
    if (typeof formatter === "function") return formatter(value);
    return String(value).trim();
  };

  const formatFixedVitalValue = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(2) : String(value).trim();
  };

  const getBloodPressureValue = (item) => {
    const bloodPress = String(item?.blood_press || "").trim();
    if (bloodPress && bloodPress !== "/") {
      return bloodPress.endsWith("/") ? bloodPress.slice(0, -1) : bloodPress;
    }

    const systolic = String(item?.systolic || "").trim();
    const diastolic = String(item?.diastolic || "").trim();
    return systolic && diastolic ? `${systolic}/${diastolic}` : "";
  };

  const VITALS_DISPLAY_FIELDS = [
    { key: "temp", label: "Temperature", unit: "Frh" },
    { key: "pres", label: "Pulse", unit: "/min" },
    { key: "resp_rate", label: "Resp. Rate", unit: "/min" },
    { key: "blood_press", label: "Blood Pressure", unit: "mmHg", getValue: getBloodPressureValue },
    { key: "spo2", label: "SPO2", unit: "%" },
    { key: "general_rbs", label: "General RBS", unit: "mg/dl" },
    { key: "fib4", label: "FIB4" },
    { key: "waist_circumference", label: "Waist Circumference", unit: "cms" },
    { key: "ofc", label: "OFC", unit: "cms" },
    { key: "height", label: "Height", unit: "cms" },
    { key: "weight", label: "Weight", unit: "kgs" },
    { key: "patient_birth_weight", label: "Patient Birth Weight", unit: "kgs" },
    { key: "bmi", label: "BMI", unit: "kg/m²", formatter: formatFixedVitalValue },
    { key: "bmr", label: "BMR", unit: "kcals", formatter: formatFixedVitalValue },
    { key: "bsa", label: "BSA", unit: "m²", formatter: formatFixedVitalValue },
  ];

  const VITALS_METADATA_KEYS = new Set([
    "date",
    "dev_unique_id",
    "tcv_id",
    "tcbc_id",
    "pam_id",
    "systolic",
    "diastolic",
    "blood_press",
  ]);

  const formatVitalEntryLabel = (label, dateLabel, includeDate) =>
    includeDate && dateLabel ? `${label} (${dateLabel})` : label;

  const buildVitalsDisplayEntries = (vitalsSource) => {
    if (!vitalsSource) return [];

    if (hasDisplayableValue(vitalsSource)) {
      return [{ key: "vitals", label: "Vitals", value: formatDisplayValue(vitalsSource) }];
    }

    const sourceList = Array.isArray(vitalsSource) ? vitalsSource : [vitalsSource];
    const includeDate = sourceList.length > 1;

    return sourceList.flatMap((item, itemIndex) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];

      const dateLabel = item?.date ? moment(item.date).format("DD MMM, YY") : "";
      const handledKeys = new Set();
      const entries = [];

      VITALS_DISPLAY_FIELDS.forEach((field) => {
        handledKeys.add(field.key);
        const rawValue = field.getValue ? field.getValue(item) : item?.[field.key];
        const value = formatDisplayValue(rawValue, field.formatter);
        if (!value) return;

        entries.push({
          key: `${itemIndex}-${field.key}`,
          label: formatVitalEntryLabel(field.label, dateLabel, includeDate),
          value: field.unit ? `${value} ${field.unit}` : value,
        });
      });

      Object.entries(item).forEach(([key, rawValue]) => {
        if (handledKeys.has(key) || VITALS_METADATA_KEYS.has(key) || !hasDisplayableValue(rawValue)) {
          return;
        }

        entries.push({
          key: `${itemIndex}-${key}`,
          label: formatVitalEntryLabel(camelCaseToTitle(key), dateLabel, includeDate),
          value: formatDisplayValue(rawValue),
        });
      });

      return entries;
    });
  };

  // Render items for each type (medications, tests, etc.)
  // Supports both old (vitals, examination, tests) and new (vitalsAndBodyComposition, examinations, labInvestigation) structure
  // When dataOverride is provided (voice/ambient/snap/smart unified view), use it; else use snap vs smart source
  const getMedicationName = (item) =>
    String(
      item?.metadata?.selectedValue ||
        item?.metadata?.tmm_medicine_name ||
        item?.tmm_medicine_name ||
        item?.groundedMedicineName ||
        item?.groundingMedicineName ||
        item?.refinedName ||
        item?.name ||
        item?.lineItem ||
        ""
    ).trim();

  const renderItems = (type, dataOverride) => {
    const data =
      dataOverride !== undefined && dataOverride !== null
        ? dataOverride
        : isSnapRxDigitizationAccessable &&
          isSnapRx &&
          showDigitalSnapRx &&
          snapRxDigitisedData
          ? snapRxDigitisedData
          : rxDigitisedData?.editedData;

    if (type === "gynecHistory") {
      const gynec = getNormalizedGynecHistory(data ?? {});
      const lines = formatGynecDisplayLines(gynec);
      if (lines.length === 0) return null;
      return (
        <div className="digitised-data-section">
          <ul>
            {lines.map((line, index) => (
              <li key={index}>
                <div className="medicine-item">
                  <span>{line}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    const hasVitalsContent = (obj) => buildVitalsDisplayEntries(obj).length > 0;
    const vitalsObj =
      type === "vitals"
        ? (data?.vitalsAndBodyComposition ?? data?.vitals ?? {})
        : data?.vitals || data?.vitalsAndBodyComposition || {};
    const vitalsEntries = type === "vitals" ? buildVitalsDisplayEntries(vitalsObj) : [];
    const arrayForType =
      type === "examination" || type === "examinations"
        ? (data?.examinations || data?.examination || [])
        : type === "tests" || type === "labInvestigation"
          ? (data?.labInvestigation || data?.tests || [])
          : type === "medications"
            ? (data?.medications || data?.medicine || [])
          : data?.[type];

    return (
      <div className="digitised-data-section">
        <ul>
          {type === "followUp" && data?.followUp && (
            <li>
              <div className="medicine-item">
                <span>{data?.followUp}</span>
              </div>
            </li>
          )}
          {/* Handle vitals: old (vitals) or new (vitalsAndBodyComposition) */}
          {type === "vitals" &&
            vitalsEntries.map((entry) => (
              <li key={entry.key}>
                <div className="medicine-item">
                  <span>{entry.label}</span>
                  <span className="separator">:</span>
                  <span>{entry.value}</span>
                </div>
              </li>
            ))}

          {/* Handle array types: support old (examination, tests) and new (examinations, labInvestigation) */}
          {type !== "vitals" &&
            Array.isArray(arrayForType) &&
            arrayForType.map((item, index) => (
              <li key={index}>
                <div className="medicine-item">
                  <span>
                    {/* Render dynamically based on type; support canonical name + lineItem */}
                    {type === "advice"
                      ? (typeof item === "string" ? item : (item?.advice_name || item?.name || ""))
                      : type === "symptoms"
                      ? (() => {
                          const name = (item?.name || item?.symptom_name || "").trim();
                          const lineItem = (item?.lineItem || "").trim();
                          if (name) {
                            if (lineItem && lineItem.toLowerCase().includes(name.toLowerCase())) {
                              return lineItem;
                            }
                            return lineItem ? `${name} (${lineItem})` : name;
                          }
                          return lineItem || "";
                        })()
                      : type === "surgeries"
                      ? (() => {
                          const name = (item?.name || "").trim();
                          const notes = (item?.notes || "").trim();
                          return notes ? `${name} (${notes})` : name;
                        })()
                      : type === "medications" || type === "tests" || type === "labInvestigation"
                      ? (type === "medications"
                          ? getMedicationName(item)
                          : (item?.refinedName || item?.name || item?.investigation_name))
                      : type === "labResults"
                      ? (() => {
                          const lineItem =
                            typeof item?.lineItem === "string"
                              ? item.lineItem.trim()
                              : "";
                          if (lineItem) return lineItem;
                          const testname =
                            typeof item?.testname === "string"
                              ? item.testname.trim()
                              : "";
                          const value =
                            typeof item?.value === "string"
                              ? item.value.trim()
                              : "";
                          return testname && value
                            ? `${testname} (${value})`
                            : testname || value || "";
                        })()
                      : type === "diagnosis" || type === "examination" || type === "examinations"
                      ? (() => {
                          const name = (item?.name || item?.tds_name || item?.examination_name || "").trim();
                          const lineItem = (item?.lineItem || "").trim();
                          if (name) {
                            if (lineItem && lineItem.toLowerCase().includes(name.toLowerCase())) {
                              return lineItem;
                            }
                            return lineItem ? `${name} (${lineItem})` : name;
                          }
                          return lineItem || "";
                        })()
                      : type === "dynamicFields"
                      ? item?.title || item?.lineItem || item?.name || (typeof item === "string" ? item : "")
                      : type === "others"
                      ? (typeof item === "string" ? item : (item?.name || item?.lineItem || ""))
                      : item?.name}
                  </span>

                  {/* Lab Results specific rendering */}

                  {(type === "vaccinations" ||
                    type === "medicalHistory" ||
                    type === "tests" ||
                    type === "labInvestigation" ||
                    type === "symptoms" ||
                    type === "examinations" ||
                    type === "examination" ||
                    type === "diagnosis") && (() => {
                    if ((type === "symptoms" || type === "diagnosis" || type === "examination" || type === "examinations") && (item?.lineItem || "").trim()) {
                        return null;
                    }
                    if (type === "labInvestigation") {
                      const labNote = getLabInvestigationNote(item);
                      return labNote ? <span> ({labNote})</span> : null;
                    }
                    if (type === "vaccinations") {
                      const vaccineName = String(item?.name || "").trim();
                      const rawLineItem = String(item?.lineItem || "").trim();
                      const escapedName = vaccineName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                      const namePrefixRegex = vaccineName ? new RegExp(`^${escapedName}\\s*[,:-]?\\s*`, "i") : null;
                      const detailsFromLineItem = rawLineItem && namePrefixRegex
                        ? (rawLineItem.replace(namePrefixRegex, "").trim() || rawLineItem)
                        : rawLineItem;
                      const details = [
                        detailsFromLineItem,
                        String(item?.schedule || "").trim(),
                        String(item?.brand || "").trim(),
                        String(item?.notes || "").trim(),
                      ].filter(Boolean);
                      const uniqueDetails = [...new Set(details)];
                      return uniqueDetails.length > 0 ? <span> ({uniqueDetails.join(", ")})</span> : null;
                    }
                    const hasIndividualFields = (item?.severity && item?.severity !== '') ||
                                               (item?.duration && item?.duration !== '') ||
                                               (item?.notes && item?.notes !== '') ||
                                               (item?.type && item?.type !== '') ||
                                               (item?.relation && item?.relation !== '') ||
                                               (item?.findings && item?.findings !== '');
                    const details = hasIndividualFields
                      ? [
                          item?.severity && item?.severity !== '' ? item?.severity : null,
                          item?.duration && item?.duration !== '' ? item?.duration : null,
                          item?.notes && item?.notes !== '' ? item?.notes : null,
                          item?.type && item?.type !== '' ? item?.type : null,
                          item?.relation && item?.relation !== '' ? item?.relation : null,
                          item?.findings && item?.findings !== '' ? item?.findings : null,
                        ].filter(Boolean).join(', ')
                      : (() => {
                          const nameStr = (item?.name || "").trim();
                          const lineItemStr = (item?.lineItem || "").trim();
                          if (!lineItemStr) return null;
                          return nameStr ? lineItemStr : null;
                        })();
                    return details && (
                      <span> ({details})</span>
                    );
                  })()}
                  {type === "medications" &&
                    item.lineItem && <span>{` (${item.lineItem})`}</span>}

                  {type === "dynamicFields" &&
                    item.notes && <span>{` (${item.notes})`}</span>}
                </div>
              </li>
            ))}
        </ul>
      </div>
    );
  };

  // Render medications in tabular format
  const renderMedicationsTable = (customMedications = null) => {
    const medications = Array.isArray(customMedications)
      ? customMedications
      : genRxData?.medications || snapRxDigitisedData?.medications || rxDigitisedData?.editedData?.medications || [];
    if (!medications || medications.length === 0) return null;

    const isTabletView = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth <= 1200;
    const isVoiceRxView = showDigitalGenRx && (isAmbientRx || (!isSmartRxFile && !isTabRx ));
    const getKey = (m) =>
      getMedicationName(m).trim().toLowerCase();
    const isContinuation = medications.map((m, idx) => {
      if (idx === 0) return false;
      const k = getKey(m);
      return k !== '' && k === getKey(medications[idx - 1]);
    });
    const rowSpanAt = new Map();
    for (let i = 0; i < medications.length; i++) {
      if (isContinuation[i]) continue;
      const k = getKey(medications[i]);
      if (!k) {
        rowSpanAt.set(i, 1);
        continue;
      }
      let span = 1;
      for (let j = i + 1; j < medications.length; j++) {
        if (getKey(medications[j]) !== k) break;
        span++;
      }
      rowSpanAt.set(i, span);
    }
    
    const getColumnStyle = (column) => {
      const baseStyle = { 
        padding: isTabletView && isVoiceRxView ? '6px' : '8px', 
        border: '1px solid #171725', 
        textAlign: 'left', 
        fontSize: isTabletView && isVoiceRxView ? '10px' : '11px', 
        wordBreak: 'break-word' 
      };
      if (!isTabletView || !isVoiceRxView) return baseStyle;
      
      const widths = {
        name: { width: '20%' },
        unit: { width: '12%' },
        frequency: { width: '13%' },
        when: { width: '10%' },
        duration: { width: '12%' },
        quantity: { width: '10%' },
        note: { width: '23%' }
      };
      
      return { ...baseStyle, ...widths[column] };
    };

    const headerStyle = (column) => {
      const baseStyle = { 
        padding: isTabletView && isVoiceRxView ? '6px' : '8px', 
        border: '1px solid #171725', 
        textAlign: 'left', 
        fontWeight: 700, 
        fontSize: isTabletView && isVoiceRxView ? '11px' : '12px' 
      };
      if (!isTabletView || !isVoiceRxView) return baseStyle;
      return { ...baseStyle, ...getColumnStyle(column) };
    };

    return (
      <div className="digitised-data-section" style={{ marginLeft: 0, marginTop: 10, border: '1px solid black', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="w-100" style={{ width: '100%', tableLayout: isTabletView && isVoiceRxView ? 'fixed' : 'auto', borderCollapse: 'collapse', border: 'none' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #171725', backgroundColor: '#f8f9fa' }}>
              <th style={headerStyle('name')}>MEDICINE NAME</th>
              <th style={headerStyle('unit')}>UNIT PER DOSE</th>
              <th style={headerStyle('frequency')}>FREQUENCY</th>
              <th style={headerStyle('when')}>WHEN</th>
              <th style={headerStyle('duration')}>DURATION</th>
              <th style={headerStyle('quantity')}>QUANTITY</th>
              <th style={headerStyle('note')}>NOTE</th>
            </tr>
          </thead>
          <tbody>
            {medications.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #171725' }}>
                {!isContinuation[index] && (
                  <td
                    rowSpan={rowSpanAt.get(index) || 1}
                    style={{ ...getColumnStyle('name'), fontWeight: 500, verticalAlign: 'top' }}
                  >
                    {capitalize(
                      (() => {
                        if (item?.metadata?.selectedValue) {
                          return item.metadata.selectedValue;
                        }
                        const metaName = String(item?.metadata?.tmm_medicine_name || "").trim();
                        const grounded = item?.groundedMedicineName || item?.groundingMedicineName;
                        if (isGroundingAccessable) {
                          const isFuzzySearchEmpty = !item?.metadata?.isFuzzyCorrected;
                          if (isFuzzySearchEmpty) {
                            return metaName || item?.tmm_medicine_name || grounded || item?.refinedName || item?.name || "";
                          }
                          return metaName || item?.tmm_medicine_name || grounded || item?.refinedName || item?.name || "";
                        }
                        return metaName || item?.tmm_medicine_name || grounded || item?.refinedName || item?.name || item?.lineItem || "";
                      })().trim() || '-',
                      true
                    )}
                  </td>
                )}
                <td style={getColumnStyle('unit')}>
                  {isContinuation[index] ? (
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '0%',
                          top: -14,
                          transform: 'translateX(-50%)',
                          padding: '2px 8px',
                          fontSize: 12,
                          borderRadius: 10,
                          border: '1px solid #E5E7EB',
                          background: '#F3F4F6',
                          color: '#6B7280',
                          lineHeight: 1.5,
                          fontWeight: 500,
                        }}
                      >
                        Then
                      </span>
                      <div style={{ paddingTop: 10 }}>{item?.unitPerDose || item?.dosage || '-'}</div>
                    </div>
                  ) : (
                    item?.unitPerDose || item?.dosage || '-'
                  )}
                </td>
                <td style={getColumnStyle('frequency')}>
                  {item?.frequency || '-'}
                </td>
                <td style={getColumnStyle('when')}>
                  {item?.schedule || item?.when || '-'}
                </td>
                <td style={getColumnStyle('duration')}>
                  {item?.duration || '-'}
                </td>
                <td style={getColumnStyle('quantity')}>
                  {item?.quantity || item?.qty || '-'}
                </td>
                <td style={getColumnStyle('note')}>
                  {item?.notes || item?.note || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render lab investigation in tabular format
  const renderLabInvestigationTable = () => {
    const labInvestigation = genRxData?.labInvestigation || snapRxDigitisedData?.labInvestigation || snapRxDigitisedData?.tests || rxDigitisedData?.editedData?.labInvestigation || rxDigitisedData?.editedData?.tests || [];
    if (!labInvestigation || labInvestigation.length === 0) return null;

    return (
      <div className="digitised-data-section" style={{ marginLeft: 0, marginTop: 10, border: '1px solid black', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="w-100" style={{ borderCollapse: 'collapse', border: 'none' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #171725', backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '8px', border: '1px solid #171725', textAlign: 'left', fontWeight: 700, fontSize: '12px' }}>NAME</th>
              <th style={{ padding: '8px', border: '1px solid #171725', textAlign: 'left', fontWeight: 700, fontSize: '12px' }}>NOTE</th>
            </tr>
          </thead>
          <tbody>
            {labInvestigation.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #171725' }}>
                <td style={{ padding: '8px', border: '1px solid #171725', textAlign: 'left', fontWeight: 500, fontSize: '11px' }}>
                  {item?.name || 'N/A'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #171725', textAlign: 'left', fontSize: '11px' }}>
                  {getLabInvestigationNote(item) || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMedicalHistoryGrouped = () => {
    const medicalHistoryData = genRxData?.medicalHistory;
    
    if (!medicalHistoryData || !Array.isArray(medicalHistoryData) || medicalHistoryData.length === 0) {
      return null;
    }
  
    const groupedByType = medicalHistoryData.reduce((acc, item) => {
      const type = isGenRxTableView ? (item?.type || item?.subtype || 'other') : 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {});
    
    const entries = Object.entries(groupedByType).filter(([, items]) => items.length > 0);
    if (!entries.length) {
      return null;
    }

    const typeDisplayNames = {
      'medical_condition': 'Medical Conditions',
      'allergy': 'Allergies',
      'family_history': 'Family History',
      'lifestyle': 'Lifestyle',
      'other': 'others'
    };
    
    return (
      <div className="medical-history-grouped" style={{ marginTop: '8px' }}>
        {entries.map(([type, items]) => (
          <div key={type} style={{ marginBottom: '8px' }}>
            <div style={{ marginBottom: '4px', marginLeft: '16px' }}>
              <span style={{ fontWeight: 400, fontSize: 'inherit' }}>
                • {typeDisplayNames[type] || type}:
              </span>
            </div>
            
            {items.map((item, itemIndex) => {
              const lineItemStr = (item?.lineItem || '').trim();
              const itemName = lineItemStr || item?.name || item?.condition || 'N/A';
              const details = [];
              
              if (item?.duration && item.duration !== '') {
                details.push(`Since: ${item.duration}`);
              }
              if (item?.relation && item.relation !== '') {
                details.push(`Relation: ${item.relation}`);
              }
              if (item?.notes && item.notes !== '') {
                details.push(`Note: ${item.notes}`);
              }
              if (item?.severity && item.severity !== '') {
                details.push(`Severity: ${item.severity}`);
              }
              
              return (
                <div key={itemIndex} style={{ marginBottom: '2px', marginLeft: '32px' }}>
                  <span style={{ fontWeight: 500, fontSize: 'inherit' }}>
                    • {itemName}
                  </span>
                  {details.length > 0 && (
                    <span style={{ fontWeight: 400, fontSize: 'inherit' }}>
                      {' ('}
                      {details.map((detail, detailIndex) => {
                        const [label, ...valueParts] = detail.split(':');
                        const value = valueParts.join(':');
                        return (
                          <span key={detailIndex}>
                            {detailIndex > 0 ? ' | ' : ''}
                            <span style={{ fontWeight: 400 }}>{label}:</span>
                            {value}
                          </span>
                        );
                      })}
                      {')'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderGenRxItems = (type) => {
    if (type === "medicalHistory") {
      return renderMedicalHistoryGrouped();
    }
    if (type === "gynecHistory") {
      const gynec = getNormalizedGynecHistory(genRxData ?? {});
      const lines = formatGynecDisplayLines(gynec);
      if (lines.length === 0) return null;
      return (
        <div className="digitised-data-section" style={{ marginLeft: 0 }}>
          <ol>
            {lines.map((line, index) => (
              <li key={index}>
                <div className="medicine-item">
                  <span>{line}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    return (
    <div className="digitised-data-section" style={{ marginLeft: 0 }}>
      <ol>
        {type === "followUp" && genRxData?.followUp && (
          <li>
            <div className="medicine-item">
              <span>{genRxData?.followUp}</span>
            </div>
          </li>
        )}
        {/* Handle vitals type separately */}
        {type === "vitalsAndBodyComposition" &&
          buildVitalsDisplayEntries(genRxData?.vitalsAndBodyComposition)
            .map((entry) => (
              <li key={entry.key}>
                <div className="medicine-item">
                  <span>{entry.label}</span>
                  <span className="separator">:</span>
                  <span>{entry.value}</span>
                </div>
              </li>
            ))}

        {/* Handle other types (assume they are arrays) */}
        {type !== "vitalsAndBodyComposition" &&
          Array.isArray(genRxData?.[type]) &&
          genRxData?.[type].map((item, index) => (
            <li key={index}>
              <div className="medicine-item">
                {["advice", "others"].includes(type) && <span>{item}</span>}

                {type === "medications" && (
          (() => {
            const normalizedLineItem = (item.lineItem || "").trim();
            const detailParts = [];

            if (normalizedLineItem) {
              detailParts.push(normalizedLineItem);
            } else {
              if (item.dosage) {
                detailParts.push(item.dosage);
              }
              if (item.unitPerDose) {
                detailParts.push(item.unitPerDose);
              }
              if (item.frequency) {
                detailParts.push(item.frequency);
              }
              if (item.schedule) {
                detailParts.push(item.schedule);
              }
              if (item.duration) {
                detailParts.push(item.duration);
              }
            }

            const noteText = (item.notes || item.note || "").trim();
            const assembledDetails = detailParts.filter(Boolean).join(", ");

            const trimmedLineItem = normalizedLineItem;
            const detailText = trimmedLineItem || assembledDetails;

            const groundedName = item?.groundedMedicineName || item?.groundingMedicineName;
            const startsWithParenthesis = detailText?.trim().startsWith("(");
            const displayName = item?.name || item?.tmm_medicine_name || groundedName || item?.refinedName || "";
            const startsWithName =
              detailText &&
              displayName &&
              detailText.trim().toLowerCase().startsWith(displayName.trim().toLowerCase());

            const baseName = (() => {
              if (item?.metadata?.selectedValue) {
                return item.metadata.selectedValue;
              }
              const metaName = String(item?.metadata?.tmm_medicine_name || "").trim();
              if (isGroundingAccessable) {
                const isFuzzySearchEmpty = !item?.metadata?.isFuzzyCorrected;
                if (isFuzzySearchEmpty) {
                  return metaName || item?.tmm_medicine_name || groundedName || item?.refinedName || item?.name || item?.lineItem || "N/A";
                }
                return metaName || item?.tmm_medicine_name || groundedName || item?.refinedName || item?.name || item?.lineItem || "N/A";
              }
              return metaName || item?.tmm_medicine_name || groundedName || item?.refinedName || item?.name || item?.lineItem || "N/A";
            })();

            let formattedMain = baseName;
            if (detailText) {
              if (startsWithName) {
                formattedMain = detailText.trim();
              } else if (startsWithParenthesis) {
                formattedMain = `${baseName} ${detailText.trim()}`;
              } else {
                formattedMain = `${baseName} (${detailText})`;
              }
            }

            const noteAlreadyPresent =
              noteText &&
              detailText &&
              detailText.toLowerCase().includes(noteText.toLowerCase());

            return (
              <span>
                {formattedMain}
                {noteText && !noteAlreadyPresent && ` (Note: ${noteText})`}
                  </span>
            );
          })()
                )}

                {type === "surgeries" && (
                  (() => {
                    const name = (item?.name || "").trim();
                    const notes = (item?.notes || "").trim();
                    return <span>{notes ? `${name} (${notes})` : name}</span>;
                  })()
                )}
              
                {(type === "vaccinations" ||
                  type === "medicalHistory" ||
                  type === "labInvestigation" ||
                  type === "symptoms" ||
                  type === "examinations" ||
                  type === "diagnosis") && (() => {
                    if (type === "vaccinations") {
                      const vaccineName = String(item?.name || "").trim();
                      const rawLineItem = String(item?.lineItem || "").trim();
                      const escapedName = vaccineName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                      const namePrefixRegex = vaccineName ? new RegExp(`^${escapedName}\\s*[,:-]?\\s*`, "i") : null;
                      const detailsFromLineItem = rawLineItem && namePrefixRegex
                        ? (rawLineItem.replace(namePrefixRegex, "").trim() || rawLineItem)
                        : rawLineItem;
                      const details = [
                        detailsFromLineItem,
                        String(item?.schedule || "").trim(),
                        String(item?.brand || "").trim(),
                        String(item?.notes || "").trim(),
                      ].filter(Boolean);
                      const uniqueDetails = [...new Set(details)];
                      return uniqueDetails.length > 0 ? (
                        <span> ({uniqueDetails.join(", ")})</span>
                      ) : null;
                    }
                    if (type === "labInvestigation") {
                      const labName = String(item?.name || "").trim();
                      const labNote = getLabInvestigationNote(item);
                      if (!labName && !labNote) return <span>{typeof item === "string" ? item : ""}</span>;
                      return (
                        <span>
                          {labName}
                          {labNote ? ` (${labNote})` : ""}
                        </span>
                      );
                    }
                    const hasIndividualFields = (item?.severity && item?.severity !== '') ||
                                               (item?.duration && item?.duration !== '') ||
                                               (item?.notes && item?.notes !== '') ||
                                               (item?.type && item?.type !== '') ||
                                               (item?.relation && item?.relation !== '') ||
                                               (item?.dosage && item?.dosage !== '') ||
                                               (item?.frequency && item?.frequency !== '') ||
                                               (item?.schedule && item?.schedule !== '') ||
                                               (item?.findings && item?.findings !== '');
                    const details = hasIndividualFields
                      ? [
                          item?.severity && item?.severity !== '' ? item?.severity : null,
                          item?.duration && item?.duration !== '' ? item?.duration : null,
                          item?.notes && item?.notes !== '' ? item?.notes : null,
                          item?.type && item?.type !== '' ? item?.type : null,
                          item?.relation && item?.relation !== '' ? item?.relation : null,
                          item?.dosage && item?.dosage !== '' ? item?.dosage : null,
                          item?.frequency && item?.frequency !== '' ? item?.frequency : null,
                          item?.schedule && item?.schedule !== '' ? item?.schedule : null,
                          item?.findings && item?.findings !== '' ? item?.findings : null,
                        ].filter(Boolean).join(', ')
                      : (item?.lineItem && item?.lineItem !== '' ? item?.lineItem : null);
                    return item.lineItem && !hasIndividualFields ? (
                      <span>{item.lineItem}</span>
                    ) : (item.name || item.lineItem) ? (
                      <span>
                        {item.name || item.lineItem}
                        {details && (
                          <span> ({details})</span>
                        )}
                      </span>
                    ) : (
                      <span>{typeof item === "string" ? item : ""}</span>
                    );
                  })()}

                {type === "labResults" &&
                  (() => {
                    const lineItem =
                      typeof item?.lineItem === "string"
                        ? item.lineItem.trim()
                        : "";
                    if (lineItem) {
                      return <span>{lineItem}</span>;
                    }

                    const testname =
                      typeof item?.testname === "string"
                        ? item.testname.trim()
                        : "";
                    const value =
                      typeof item?.value === "string"
                        ? item.value.trim()
                        : "";

                    if (!testname && !value) {
                      return null;
                    }

                    return (
                      <span>
                        {testname}
                        {testname && value ? ` (${value})` : value}
                      </span>
                    );
                  })()}
              </div>
            </li>
          ))}
      </ol>
    </div>
  );
  };

  const renderGenRxCustomModules = () =>
    Object.entries(genRxData?.dynamicFields || {})
      .filter(([module, data]) => {
        return (
          Array.isArray(data) &&
               data.length > 0 && 
          data.some((item) => {
            const value =
              typeof item === "string"
                ? item
                : item?.lineItem || item?.title || item?.name || item?.notes;
            return typeof value === "string" && value.trim().length > 0;
          })
        );
      })
      .map(([module, data]) => {
      return (
          <>
            <div className="d-flex align-items-start">
              <div className="title-digitise-section mb-1">
                {module
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </div>
            </div>
            <div className="digitised-data-section" style={{ marginLeft: 0 }}>
              <ol>
                {data.map((value, index) => {
                  const displayValue =
                    typeof value === "string"
                      ? value
                      : value?.lineItem || value?.title || value?.name || value?.notes || "";
                  return (
                  <li key={index}>
                    <div className="medicine-item">
                        <span>{displayValue}</span>
                    </div>
                  </li>
                  );
                })}
              </ol>
            </div>
          </>
      );
    });

  const hasCustomModuleValue = (value) =>
    value !== null &&
    value !== undefined &&
    String(value).trim().length > 0;

  const hasCustomModuleContent = (item) => {
    if (!Array.isArray(item?.content) || item.content.length === 0) {
      return false;
    }

    if (item.module_version === "v2") {
      return item.content.some((row) =>
        Object.entries(row || {}).some(
          ([key, value]) => key !== "id" && hasCustomModuleValue(value)
        )
      );
    }

    return item.content.some(
      (row) => hasCustomModuleValue(row?.title) || hasCustomModuleValue(row?.notes)
    );
  };

  const renderableCustomModulesRxData = (() => {
    const seenModuleIds = new Set();
    return customModulesRxData.filter((item, index) => {
      if (!hasCustomModuleContent(item)) return false;
      const moduleKey = String(item?.module_id || item?.origin_id || item?.module_name || index);
      if (seenModuleIds.has(moduleKey)) return false;
      seenModuleIds.add(moduleKey);
      return true;
    });
  })();

  const shouldRenderModuleContentsInVoiceRx =
    isVoiceRxNewFromGB &&
    showDigitalGenRx &&
    shouldUseVoiceRxPrintPayload &&
    renderableCustomModulesRxData.length > 0;

  const renderCustomModulesRxData = () => {
    if (renderableCustomModulesRxData.length === 0) return null;

    return renderableCustomModulesRxData.map((item) => {
      const moduleDefinition = renderableCustomModulesRxData.find(
        (module) => module.module_id === item.module_id
      );

      return (
        <div
          className={`d-flex align-items-start ${shouldRenderModuleContentsInVoiceRx ? ' m-4' : ' mt-4'}`}
          key={item.module_id || item.module_name}
        >
   
          <img
            className="me-2"
            src={customModuleIcon}
            alt={item.module_name}
          />
          <div style={{ flex: 1, width: "100%", minWidth: 0 }}>
            <div className="title">{item.module_name}</div>
            {item.module_version === "v2" ? (
              (() => {
                const namedFields = moduleDefinition?.namedFields || [];
                const filteredContent = item.content.filter((row) =>
                  Object.entries(row || {}).some(
                    ([key, value]) => key !== "id" && hasCustomModuleValue(value)
                  )
                );

                if (filteredContent.length === 0) return null;

                const fallbackFieldNames = Array.from(
                  filteredContent.reduce((fields, row) => {
                    Object.keys(row || {}).forEach((key) => {
                      if (key !== "id") fields.add(key);
                    });
                    return fields;
                  }, new Set())
                );
                const fieldNames = namedFields.length > 0
                  ? namedFields.map((field) => field.fieldName).filter(Boolean)
                  : fallbackFieldNames;

                const tableColumns = fieldNames.map((fieldName) => {
                  const field = namedFields.find((f) => f.fieldName === fieldName);
                  const headerLabel = field?.fieldLabel || fieldName;
                  return {
                    title: String(headerLabel).toUpperCase(),
                    dataIndex: fieldName,
                    key: String(fieldName),
                    render: (text) => hasCustomModuleValue(text) ? text : "-",
                    onCell: () => ({
                      style: {
                        fontSize: "calc(1em - 1px)",
                        fontWeight: 400,
                      },
                    }),
                    onHeaderCell: () => ({
                      style: {
                        backgroundColor: "#f5f5f5",
                        fontWeight: 600,
                      },
                    }),
                  };
                });

                const tableData = filteredContent.map((row, index) => {
                  const { id, ...fields } = row;
                  return {
                    key: `row-${index}`,
                    ...fields,
                  };
                });

                return (
                  <div className="mt-2">
                    <div
                      className="border-top border-bottom border-start border-end"
                      style={{ width: "100%", borderRadius: "8px", overflow: "hidden" }}
                    >
                      <Table
                        className="table-border"
                        columns={tableColumns}
                        dataSource={tableData}
                        pagination={false}
                        size="small"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                );
              })()
            ) : (
              item.content
                .filter((row) => hasCustomModuleValue(row?.title) || hasCustomModuleValue(row?.notes))
                .map((row, index, rows) => (
                  <span key={index} style={{ fontSize: "calc(1em - 2px)", fontWeight: 400 }}>
                    {hasCustomModuleValue(row.title) && (
                      <>
                        <span>{row.title}</span>
                        {hasCustomModuleValue(row.notes) ? <br /> : ""}
                      </>
                    )}
                    {hasCustomModuleValue(row.notes) && (
                      <div>
                        {row.notes
                          .trim()
                          .replace(/\n+/g, "\n")
                          .split("\n")
                          .map((line, lineIndex, lines) => (
                            <React.Fragment key={lineIndex}>
                              {line}
                              {lineIndex !== lines.length - 1 && <br />}
                            </React.Fragment>
                          ))}
                      </div>
                    )}
                    {index < rows.length - 1 && <br />}
                  </span>
                ))
            )}
          </div>
        </div>
      );
    });
  };

  const rxEditedData = rxDigitisedData?.editedData || {};
  const rawDentalData = rxEditedData?.dynamicFields?.[0]?.dentalData;
  const isPlainObject = (value) =>
    value && typeof value === "object" && !Array.isArray(value);
  const dentalComplaintKeys = [
    "chiefComplaint",
    "symptom",
    "otherDiseases",
    "medications",
    "drugAllergy",
    "pregnancy",
    "habits",
    "dentalHistory",
    "pain",
    "notes",
  ];
  const diagnosisFieldOrder = [
    "stains",
    "calculus",
    "oralHygieneStatus",
    "periodontalseverity",
    "orthodonticFindings",
    "orthodonticInterventionRequired",
    "habitsPedo",
  ];
  const isDentalComplaintsShape = (value) =>
    isPlainObject(value) && dentalComplaintKeys.some((key) => key in value);
  const isDentalDiagnosisShape = (value) =>
    isPlainObject(value) &&
    (Array.isArray(value?.teeth) ||
      value?.toothDiagramNotes != null ||
      diagnosisFieldOrder.some((key) => key in value));
  const dentalDataSource =
    rawDentalData && typeof rawDentalData === "object" && !Array.isArray(rawDentalData)
      ? rawDentalData
      : rxEditedData?.dentalData ??
        rxEditedData?.results ??
        rxEditedData?.data?.results ??
        null;
  const hasDentaldata = !!(rawDentalData || rxEditedData?.dentalData || dentalDataSource);
  const dentalComplaints = isDentalComplaintsShape(rxEditedData?.complaints)
    ? rxEditedData.complaints
    : dentalDataSource?.complaints ?? {};
  const dentalDiagnosis = isDentalDiagnosisShape(rxEditedData?.diagnosis)
    ? rxEditedData.diagnosis
    : dentalDataSource?.diagnosis ?? {};
  const dentalTreatmentItems =
    rxEditedData?.treatmentPlans?.items ?? dentalDataSource?.treatmentPlans?.items ?? [];
  const dentalWorkDone =
    rxEditedData?.workDone ?? dentalDataSource?.workDone ?? { items: [], notes: "" };
  const dentalMedications = dentalDataSource?.medications ?? [];
  const dentalWorkDoneItems = Array.isArray(dentalWorkDone?.items) ? dentalWorkDone.items : [];
  const dentalTeeth = Array.isArray(dentalDiagnosis?.teeth) ? dentalDiagnosis.teeth : [];
  const dentalQuadrantSections = [
    { key: "UPPER_RIGHT", label: "UPPER RIGHT" },
    { key: "UPPER_LEFT", label: "UPPER LEFT" },
    { key: "LOWER_RIGHT", label: "LOWER RIGHT" },
    { key: "LOWER_LEFT", label: "LOWER LEFT" },
  ];
  const dentalTeethBySection = dentalTeeth.reduce(
    (acc, tooth) => {
      const section = tooth?.toothSection;
      if (section && acc[section]) acc[section].push(tooth);
      return acc;
    },
    {
      UPPER_LEFT: [],
      UPPER_RIGHT: [],
      LOWER_LEFT: [],
      LOWER_RIGHT: [],
    }
  );
  const dentalComplaintRows = [
    { key: "chiefComplaint", label: "CHIEF COMPLAINT" },
    { key: "symptom", label: "HTN/DM/ASTHMA/CARDIAC STATUS/BLOOD DISORDER" },
    { key: "otherDiseases", label: "OTHER DISEASES" },
    { key: "medications", label: "MEDICATION" },
    { key: "drugAllergy", label: "H/O DRUG ALLERGY" },
    { key: "pregnancy", label: "PREGNANCY" },
    { key: "habits", label: "HABITS (Tobacco/Smoking/Grinding Teeth)" },
    { key: "dentalHistory", label: "DENTAL HISTORY" },
    { key: "pain", label: "HEAD/JAW/NECK PAIN" },
    { key: "notes", label: "NOTES" },
  ];

  const formatDentalDiagnosisValue = (val) => {
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
  };
  const isNonEmptyDentalValue = (val) => {
    if (val === 0 || val === "0") return true;
    if (val === true) return true;
    if (Array.isArray(val)) {
      return val.some((item) => isNonEmptyDentalValue(item));
    }
    if (val && typeof val === "object") {
      return Object.values(val).some((item) => isNonEmptyDentalValue(item));
    }
    return val != null && String(val).trim() !== "";
  };
  const formatDentalValue = (val) => {
    if (Array.isArray(val)) {
      return val
        .map((item) => (item == null ? "" : String(item).trim()))
        .filter(Boolean)
        .join(", ");
    }
    if (val && typeof val === "object") {
      return Object.entries(val)
        .filter(([, value]) => isNonEmptyDentalValue(value))
        .map(([key, value]) => (value === true ? key : `${key}: ${value}`))
        .join(", ");
    }
    if (val == null) return "";
    return String(val);
  };
  const dentalMedicationRowsFiltered = Array.isArray(dentalMedications)
    ? dentalMedications.filter((item) =>
        [
          item?.groundedMedicineName,
          item?.groundingMedicineName,
          item?.name,
          item?.refinedName,
          item?.lineItem,
          item?.dosage,
          item?.frequency,
          item?.schedule,
          item?.duration,
          item?.quantity,
          item?.notes,
        ].some((val) => isNonEmptyDentalValue(val))
      )
    : [];
  const dentalComplaintRowsFiltered = dentalComplaintRows.filter((row) =>
    isNonEmptyDentalValue(dentalComplaints?.[row.key])
  );
  const dentalDiagnosisRows = diagnosisFieldOrder
    .filter((key) => key in dentalDiagnosis)
    .map((key) => ({
      key,
      label: camelCaseToTitle(key),
      value: formatDentalDiagnosisValue(dentalDiagnosis?.[key]),
    }))
    .filter((row) => String(row.value || "").trim() !== "");
  const dentalToothDiagramNotes = (() => {
    const notes = dentalDiagnosis?.toothDiagramNotes;
    if (Array.isArray(notes)) {
      return notes
        .filter((note) => note != null && String(note).trim() !== "")
        .map((note) => String(note))
        .join("\n");
    }
    if (notes == null) return "";
    return String(notes);
  })();
  const hasToothDiagramNotes = String(dentalToothDiagramNotes || "").trim() !== "";
  const hasTeethData = Object.values(dentalTeethBySection || {}).some(
    (arr) => Array.isArray(arr) && arr.length > 0
  );
  const dentalTreatmentRowsFiltered = Array.isArray(dentalTreatmentItems)
    ? dentalTreatmentItems.filter((item) =>
        [item?.srno, item?.treatment, item?.toothNum, item?.rate, item?.count, item?.estimate].some(
          (val) => isNonEmptyDentalValue(val)
        )
      )
    : [];
  const buildDentalWorkDoneText = (item) => {
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
  };
  const dentalWorkDoneRowsFiltered = Array.isArray(dentalWorkDoneItems)
    ? dentalWorkDoneItems.filter((item) =>
        [
          item?.date,
          buildDentalWorkDoneText(item),
          item?.ptr,
          item?.ttReview,
          item?.payment,
          item?.balance,
          item?.remarks,
        ].some((val) => isNonEmptyDentalValue(val))
      )
    : [];
  const hasWorkDoneNotes = isNonEmptyDentalValue(dentalWorkDone?.notes);
  const hasDentalSectionData =
    dentalComplaintRowsFiltered.length > 0 ||
    dentalMedicationRowsFiltered.length > 0 ||
    hasTeethData ||
    dentalDiagnosisRows.length > 0 ||
    dentalTreatmentRowsFiltered.length > 0 ||
    hasToothDiagramNotes ||
    dentalWorkDoneRowsFiltered.length > 0 ||
    hasWorkDoneNotes;

  const renderDentalDigitisedSection = () => {
    if (!hasDentaldata || !hasDentalSectionData) return null;

    return (
      <div className="digitised-section-rx dental-section mb-3">
        {dentalComplaintRowsFiltered.length > 0 && (
          <table className="dental-table dental-complaints-table" style={{ marginTop: 10 }}>
            <tbody>
              {dentalComplaintRowsFiltered.map((row) => (
                <tr key={`dental-c-${row.key}`}>
                  <td className="dental-label-cell">{row.label}</td>
                  <td>{formatDentalValue(dentalComplaints?.[row.key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {dentalMedicationRowsFiltered.length > 0 && (
          <>
            <div className="dental-table-title">MEDICATION (RX)</div>
            {renderMedicationsTable(dentalMedicationRowsFiltered)}
          </>
        )}

        {hasTeethData && (
          <div className="dental-quadrant-grid">
            {dentalQuadrantSections.map((section) => (
              <div className="dental-quadrant-cell" key={`dental-q-${section.key}`}>
                <div className="dental-quadrant-title">{section.label}</div>
                <div className="dental-quadrant-list">
                  {(dentalTeethBySection?.[section.key] || []).map((tooth, i) => (
                    <div className="dental-tooth-row" key={`${section.key}-${i}`}>
                      <span className="dental-tooth-label">{`Tooth ${tooth?.toothNum ?? ""}`}</span>
                      <span className="dental-tooth-sep">:</span>
                      <span>{tooth?.diagnose ?? ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {hasToothDiagramNotes && (
          <table className="dental-table dental-tooth-diagram-table" style={{ marginTop: 16 }}>
            <tbody>
              <tr>
                <td className="dental-label-cell">TOOTH DIAGRAM NOTES</td>
                <td style={{ whiteSpace: "pre-line" }}>{dentalToothDiagramNotes}</td>
              </tr>
            </tbody>
          </table>
        )}

        {dentalTreatmentRowsFiltered.length > 0 && (
          <>
            <div className="dental-table-title">TREATMENT PLAN(S)</div>
            <table className="dental-table dental-treatment-table">
              <thead>
                <tr>
                  {["S NO", "TREATMENT", "TOOTH NUMBER", "RATE", "COUNT", "ESTIMATE"].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dentalTreatmentRowsFiltered.map((item, i) => (
                  <tr key={`dental-tp-${i}`}>
                    {[item?.srno, item?.treatment, item?.toothNum, item?.rate, item?.count, item?.estimate].map(
                      (val, idx) => (
                        <td key={`dental-tp-${i}-${idx}`}>{val ?? ""}</td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {(dentalWorkDoneRowsFiltered.length > 0 || hasWorkDoneNotes) && (
          <>
            <div className="dental-table-title">WORK DONE</div>
            {dentalWorkDoneRowsFiltered.length > 0 && (
              <table className="dental-table dental-workdone-table">
                <thead>
                  <tr>
                    {["DATE", "WORK DONE", "PTR", "PAYMENT", "BALANCE", "REMARKS"].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dentalWorkDoneRowsFiltered.map((item, i) => (
                    <tr key={`dental-wd-${i}`}>
                      {[item?.date, buildDentalWorkDoneText(item), item?.ptr, item?.payment, item?.balance, item?.remarks].map(
                        (val, idx) => (
                          <td key={`dental-wd-${i}-${idx}`} style={{ whiteSpace: idx === 1 ? "pre-line" : "normal" }}>
                            {val ?? ""}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {hasWorkDoneNotes && (
              <table className="dental-table dental-workdone-notes-table" style={{ marginTop: 16 }}>
                <tbody>
                  <tr>
                    <td className="dental-label-cell">WORK DONE NOTES</td>
                    <td>{formatDentalValue(dentalWorkDone?.notes)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    );
  };

  // Add this helper function at the top of the component
  const hasValidContent = (data, type) => {
    if (!data?.[type] || !Array.isArray(data[type])) return false;

    return data[type].some((item) => {
      if (typeof item === "string") return item.trim().length > 0;

      // For object types, check if any relevant fields have content
      const relevantFields = {
        medications: ["refinedName", "name", "groundedMedicineName", "groundingMedicineName", "lineItem", "tmm_medicine_name", "tmm_generic", "tmm_dosage_unit_name"],
        symptoms: ["name", "lineItem", "symptom_name"],
        surgeries: ["name", "notes"],
        examination: ["name", "findings", "notes", "lineItem", "examination_name"],
        examinations: ["name", "findings", "notes", "lineItem", "examination_name"],
        diagnosis: ["name", "notes", "lineItem", "tds_name"],
        medicalHistory: ["name", "lineItem"],
        vaccinations: ["name", "lineItem"],
        tests: ["refinedName", "name", "lineItem", "investigation_name"],
        labInvestigation: ["name", "lineItem", "investigation_name"],
        labResults: ["testname", "value", "notes", "lineItem"],
        dynamicFields: ["title", "notes", "lineItem"],
        advice: ["advice_name", "name"],
        others: ["name"],
      };

      const fieldsToCheck = relevantFields[type] || ["name"];
      return fieldsToCheck.some((field) => item[field]?.trim?.().length > 0);
    });
  };

  const hasVitalsContent = (data) =>
    data &&
    typeof data === "object" &&
    (buildVitalsDisplayEntries(data.vitals).length > 0 ||
      buildVitalsDisplayEntries(data.vitalsAndBodyComposition).length > 0);

  // Medical history grouped by type (Medical condition, Family History, Lifestyle, Surgical History, etc.); uses name, duration, relation, enable, notes in parentheses (no lineItem). Each type stacked one after another. No partition lines; same text style as rest of digitised sections.
  const renderMedicalHistoryGroupedByType = (data) => {
    const list = data?.medicalHistory;
    if (!Array.isArray(list) || list.length === 0) return null;
    const grouped = list.reduce((acc, item) => {
      const t = String(item?.type || "").trim() || "Other";
      if (!acc[t]) acc[t] = [];
      acc[t].push(item);
      return acc;
    }, {});
    const typeOrder = [
      "Medical condition",
      "Family History",
      "Lifestyle",
      "Surgical History",
      "Allergy",
      "Allergies",
      "Other",
      "others",
    ];
    const orderedKeys = [
      ...typeOrder.filter((k) => grouped[k]?.length),
      ...Object.keys(grouped).filter((k) => !typeOrder.includes(k)),
    ];
    return (
      <div className="digitised-data-section medical-history-grouped" style={{ display: "block", width: "100%" }}>
        {orderedKeys.map((typeName) => {
          const items = grouped[typeName] || [];
          if (items.length === 0) return null;
          return (
            <div key={typeName} style={{ display: "block", width: "100%", marginBottom: "12px" }}>
              <div className="title-digitise-section mb-1" style={{ marginLeft: 0 }}>
                {typeName}
              </div>
              <ul style={{ marginLeft: "16px", marginBottom: 0, paddingLeft: "20px" }}>
                {items.map((item, idx) => {
                  const name = String(item?.name || "").trim();
                  if (!name) return null;
                  const parts = [];
                  if (item?.duration != null && String(item.duration).trim())
                    parts.push(String(item.duration).trim());
                  if (item?.relation != null && String(item.relation).trim())
                    parts.push(String(item.relation).trim());
                  if (item?.enable != null && String(item.enable).trim())
                    parts.push(String(item.enable).trim());
                  if (item?.notes != null && String(item.notes).trim())
                    parts.push(String(item.notes).trim());
                  const inParens = parts.length > 0 ? ` (${parts.join(", ")})` : "";
                  return (
                    <li key={idx} className="medicine-item">
                      <span>• {name}{inParens}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    );
  };

  // Shared digitised sections UI with icons for voice, ambient, snap, and smart
  const renderDigitisedSections = (data) => {
    if (!data) return renderDentalDigitisedSection();
    return (
      <div className="m-4">
        {renderDentalDigitisedSection()}
        {hasVitalsContent(data) && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={vitalsIcon} alt="Vitals" />
              <div className="title-digitise-section mb-1">Vitals and Body compositions</div>
            </div>
            {renderItems("vitals", data)}
          </>
        )}
        {data?.medicalHistory && hasValidContent(data, "medicalHistory") && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={medicalHistoryIcon} alt="MedicalHistory" />
              <div className="title-digitise-section mb-1">Medical History</div>
            </div>
            {renderMedicalHistoryGroupedByType(data)}
          </>
        )}
        {data && !isGynecDataEmpty(getNormalizedGynecHistory(data)) && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={medicalHistoryIcon} alt="GynecHistory" />
              <div className="title-digitise-section mb-1">Gynec History</div>
            </div>
            {renderItems("gynecHistory", data)}
          </>
        )}
        {data?.symptoms && hasValidContent(data, "symptoms") && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={Symptomsicon} alt="Symptoms" />
              <div className="title-digitise-section mb-1">Symptoms</div>
            </div>
            {renderItems("symptoms", data)}
          </>
        )}
        {data?.surgeries && hasValidContent(data, "surgeries") && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={surgeryIcon} alt="Surgeries/Procedures" />
              <div className="title-digitise-section mb-1">Surgeries/Procedures</div>
            </div>
            {renderItems("surgeries", data)}
          </>
        )}
        {((data?.examination && hasValidContent(data, "examination")) ||
          (data?.examinations && hasValidContent(data, "examinations"))) && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={Examinationsicon} alt="Examination" />
              <div className="title-digitise-section mb-1">Examinations</div>
            </div>
            {renderItems("examination", data)}
          </>
        )}
        {data?.diagnosis && hasValidContent(data, "diagnosis") && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={Diagnosisicon} alt="Diagnosis" />
              <div className="title-digitise-section mb-1">Diagnosis</div>
            </div>
            {renderItems("diagnosis", data)}
          </>
        )}
        {data?.medications && hasValidContent(data, "medications") && !dentalMedicationRowsFiltered?.length && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={Medicationicon} alt="Medications" />
              <div className="title-digitise-section mb-1">Medication</div>
            </div>
            {isGenRxTableView ? renderMedicationsTable() : renderItems("medications", data)}
          </>
        )}
        {renderOpthalSummary()}
        {((data?.tests && hasValidContent(data, "tests")) ||
          (data?.labInvestigation && hasValidContent(data, "labInvestigation"))) && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={Investigationicon} alt="Tests" />
              <div className="title-digitise-section mb-1">Lab Investigation</div>
            </div>
            {isGenRxTableView ? renderLabInvestigationTable() : renderItems("tests", data)}
          </>
        )}
        {data?.labResults && hasValidContent(data, "labResults") && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={Investigationicon} alt="Lab Results" />
              <div className="title-digitise-section mb-1">Lab Results</div>
            </div>
            {renderItems("labResults", data)}
          </>
        )}
        {data?.advice && hasValidContent(data, "advice") && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={Frameicon} alt="Advice" />
              <div className="title-digitise-section mb-1">Advices</div>
            </div>
            {renderItems("advice", data)}
          </>
        )}
        {data?.vaccinations && hasValidContent(data, "vaccinations") && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={vaccinationIcon} alt="Vaccination" />
              <div className="title-digitise-section mb-1">Vaccination</div>
            </div>
            {renderItems("vaccinations", data)}
          </>
        )}
        {data?.dynamicFields &&
          !shouldRenderModuleContentsInVoiceRx &&
          (hasValidContent(data, "dynamicFields") ||
            (typeof data.dynamicFields === "object" &&
              !Array.isArray(data.dynamicFields) &&
              Object.keys(data.dynamicFields).length > 0)) && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={customModuleIcon} alt="Dynamic Fields" />
              <div className="title-digitise-section mb-1">Dynamic Fields</div>
            </div>
            {data === genRxData &&
            typeof data.dynamicFields === "object" &&
            !Array.isArray(data.dynamicFields) ? (
              renderGenRxCustomModules()
            ) : (
              renderItems("dynamicFields", data)
            )}
          </>
        )}
        {data?.others && hasValidContent(data, "others") && (
          <>
            <div className="d-flex align-items-start">
              <img className="me-2" src={notesicon} alt="Others" />
              <div className="title-digitise-section mb-1">Others</div>
            </div>
            {renderItems("others", data)}
          </>
        )}
      </div>
    );
  };

  const handleStartConsult = () => {
    window.Moengage.track_event("start_new_visit_click", {
      doctor_id: profile?.doctor_unique_id,
      patient_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
    });
    if (isChikitsalayAccessable) {
      clinicTargetStatus(patient_data?.pam_id, {
        targetStatus: CLINIC_TARGET_STATUS.SERVING,
      });
    }
    navigate("/prescription", {
      state: {
        patient_data: patient_data,
        send_path: "patient_details",
      },
    });
  };

  const handleStartVoiceRx = () => {
    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage?.track_event("TP_VoiceRx_EntryPoint_Click", {
      patient_contact: patient_data?.pm_contact_no || "",
      patient_id: patient_data?.patient_unique_id || "",
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name,
    });
    navigate(isVoiceRxNewFromGB ? "/prescription" : "/voice-rx-consult", {
      state: {
        patient_data: patient_data,
        ...(isVoiceRxNewFromGB && {
          isVoiceRxNewUiFlow: true,
          voiceRxEntryPoint: "patient_details_no_visit",
        }),
      },
    });
  };

  const handleStartSmartRx = () => {
    window.Moengage?.track_event("start_new_SmartRx_click", {
      doctor_id: profile?.doctor_unique_id,
      patient_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
    });
    navigate("/smart-prescription", {
      state: { patient_data: patient_data },
    });
  };

  const handleStartSnapRx = () => {
    window.Moengage?.track_event("start_new_SnapRx_click", {
      doctor_id: profile?.doctor_unique_id,
      patient_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
    });
    navigate("/snap-rx", {
      state: { patient_data: patient_data },
    });
  };

  const handleStartTabRx = () => {
    navigate("/tab-rx", {
      state: { patient_data: patient_data },
    });
  };

  const DraftRxAlert = () => {
    return (
      <div className="draft-rx-alert">
        <img src={draftIcon} alt="Draft" className="me-1" />
        This Rx is in <span className="fw-bold">draft</span>!{" "}
        {canResumeDraftRx && (
          (isMobile && !isTablet) ? (
            <>Please <span className="fw-bold">Resume from desktop/tab</span> to proceed.</>
          ) : (
            <>Please <span className="fw-bold">resume</span> or <span className="fw-bold">end the visit</span> to proceed.</>
          )
        )}
      </div>
    );
  };

  return (
    <div className="appointment-wrap PatientDetailswrap m-0">
      <Card className="" style={(isMobile && !isTablet) ? { border: 'none', padding: '6px' } : {}}>
        {viewCaseManagerData ? (
          <>
            {!(isMobile && !isTablet) && (
            <Card.Header className="bg-white py-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="title2">
                    {isCvtExtHosAccessableFromGB
                      ? viewCaseManagerData?.doctor_data?.doctor_name
                      : `${viewCaseManagerData?.doctor_data?.doctor_name} | ${viewCaseManagerData?.doctor_data?.dp_name}`}
                  </div>                  
                  <div className="subtitle d-flex align-items-center">
                    {viewCaseManagerData?.showConsultationDateTime}
                    {hasVideoConsult && (
                      <span
                        style={{
                          padding: "4px 6px",
                          background: "#667eea",
                          color: "#fff",
                          borderRadius: "4px",
                          fontSize: "12px",
                          lineHeight: 1,
                          marginLeft: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "2px"
                        }}
                        title="Video Consultation"
                      >
                        <img src={videoIcon} alt="Video Consultation" width="12" height="12" style={{ flexShrink: 0, filter: "brightness(0) invert(1)" }} />
                      </span>
                    )}
                    {(() => {
                      const isSnapRx = viewCaseManagerData?.smart_prescription_filename?.includes("snap_rx");
                      const isSmartRx = viewCaseManagerData?.smart_prescription_filename?.includes(".jpeg");
                      const isVoiceRx = isValidMongoId(viewCaseManagerData?.smart_prescription_filename);
                      
                      if (!isVoiceRx && 
                          viewCaseManagerData?.abha_context_link !== undefined && 
                          viewCaseManagerData?.abhaSync !== undefined) {
                        return (
                          <AbhaSyncButton
                            abhaContextLink={viewCaseManagerData.abha_context_link}
                            abhaSync={viewCaseManagerData.abhaSync}
                            patientUniqueId={patient_data?.patient_unique_id}
                            caseId={viewCaseManagerData?.tcm_id}
                            onSyncComplete={async (data) => {
                              // Check if sync was successful or had an error
                              if (data?.error) {
                                // Show error message (including duplicate error message)
                                message.warning(data.error);
                                return;
                              }
                              
                              // Refresh the case manager data after sync to get updated abha_context_link
                              try {
                                const sendData = {
                                  patient_unique_id: patient_data?.patient_unique_id || 0,
                                  tcm_id: viewCaseManagerData?.tcm_id
                                };
                                await dispatch(viewCaseManager(sendData));
                                message.success('Prescription synced successfully');
                              } catch (error) {
                                console.error('Error refreshing case manager data:', error);
                                message.error('Sync completed but failed to refresh data');
                              }
                            }}
                          />
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div className="align-items-center d-flex">
                  <Button
                    className="btn border rounded-3 px-1 me-2 antdesable-custom"
                    onClick={prevPress}
                    disabled={loading || isFirstConsultation}
                  >
                    <i className="icon-right d-block"></i>
                  </Button>
                  <span className="fw-normal fs-14 fontroboto">{currentPageDisplay || '0/0'}</span>
                  <Button
                    className="btn border rounded-3 antdesable-custom p-1 ms-2"
                    onClick={nextPress}
                    disabled={loading || isLastConsultation}
                  >
                    <i
                      className="icon-right"
                      style={{ display: "block", transform: `rotate(180deg)` }}
                    ></i>
                  </Button>
                </div>
                <div>
                  {(!is_draft) && <button
                    className="btn p-0 ms-3"
                    style={{
                      visibility:
                        viewCaseManagerData?.doctor_data?.editCase &&
                        shouldShowEditButton()
                          ? "visible"
                          : "hidden",
                    }}
                    onClick={handleEditRxClick}
                  >
                    <i className="icon-Edit"></i>
                  </button>}
                  <Tooltip
                    title={printDisabledTooltip}
                    placement="bottom"
                    open={isPrintDisabled ? undefined : false}
                  >
                    <span className="d-inline-flex">
                      <button
                        className="btn p-0 ms-3"
                        onClick={() =>
                          !isChrome && !isSafari
                            ? printInAppContent()
                            : printContent()
                        }
                        disabled={isPrintDisabled}
                        style={{
                          visibility:
                            !showDigitalGenRx &&
                            isValidMongoId(
                              viewCaseManagerData?.smart_prescription_filename
                            )
                              ? "hidden"
                              : "visible",
                          border: "none",
                          background: "transparent",
                          boxShadow: "none",
                        }}
                      >
                        <i className="icon-Print"></i>
                      </button>
                    </span>
                  </Tooltip>
                  {(isSnapRx && isSnapRxdigitised) || (!isSmartRxFile && !isSnapRx && !isTabRx) && !isCvtExtHosAccessableFromGB &&
                    !isValidMongoId(
                      viewCaseManagerData?.smart_prescription_filename
                    ) && (
                      <Dropdown
                        className="btn btn-outline btn-more ms-1"
                        menu={{ items }}
                        trigger={["click"]}
                      >
                        <a onClick={(e) => e.preventDefault()}>
                          <i className="icon-More"></i>
                        </a>
                      </Dropdown>
                    )}
                </div>
              </div>
            </Card.Header>
            )}

            {(isSmartSyncCVTAccessableFromGB || isTabRxAccessableFromGB) &&
              (isSmartRxFile || isTabRx) &&
              viewCaseManagerData?.smart_prescription_filename?.length > 0 &&
              rxDigitisedData &&
              !isSnapRx &&
              (isRxdigitised ? (
                <div className={(isMobile && !isTablet) ? "py-2 mb-2 px-0" : "p-2 mb-2"} style={(isMobile && !isTablet) ? { width: '100%' } : {}}>
                  <button
                    className={`digital-btn ${
                      !showDigitalRx
                        ? "digitise-toggle-btn"
                        : "active-digitise-toggle-btn"
                    }`}
                    style={(isMobile && !isTablet) ? { width: '50%' } : {}}
                    onClick={() => setShowDigitalRx(true)}
                  >
                    Digital Rx
                  </button>
                  <button
                    className={`written-btn ${
                      showDigitalRx
                        ? "digitise-toggle-btn"
                        : "active-digitise-toggle-btn"
                    }`}
                    style={(isMobile && !isTablet) ? { width: '50%' } : {}}
                    onClick={() => setShowDigitalRx(false)}
                  >
                    Written Rx
                  </button>
                </div>
              ) : (
                !rxDigitisedData?.editedData && !(isMobile && !isTablet) && (
                  <div className="digitise-info-cardiology">
                    <img
                      src={successIcon}
                      alt="success"
                      width="40px"
                      height="40px"
                    />
                    <p>
                      <span className="digitise-info-header-cardiology">
                        {`${patient_data?.pm_fullname}'s Digital Rx is ready!`}
                      </span>
                      Digitise Rx to enhance patient care, workflow efficiency,
                      and revenue.
                      <button
                        className="know-more-btn"
                        onClick={handleDrawerCvtKnowMore}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            paddingLeft: "4px",
                            textDecoration: "underline",
                            textDecorationColor: "#454551",
                          }}
                        >
                          Know More
                        </span>
                      </button>
                    </p>
                    <button
                      className="digitise-info-btn-cardiology"
                      onClick={handleDigitiseRx}
                    >
                      Digitise Rx Now
                    </button>
                  </div>
                )
              ))
            }

            {isSnapRxDigitizationAccessable &&
              isSnapRx &&
              (isSnapRxdigitised ? (
                <div className={(isMobile && !isTablet) ? "py-2 mb-2 px-0" : "p-2 mb-2"} style={(isMobile && !isTablet) ? { width: '100%' } : {}}>
                  <button
                    className={`digital-btn ${
                      !showDigitalSnapRx
                        ? "digitise-toggle-btn"
                        : "active-digitise-toggle-btn"
                    }`}
                    style={(isMobile && !isTablet) ? { width: '50%' } : {}}
                    onClick={() => setShowDigitalSnapRx(true)}
                  >
                    Digital Rx
                  </button>
                  <button
                    className={`written-btn ${
                      showDigitalSnapRx
                        ? "digitise-toggle-btn"
                        : "active-digitise-toggle-btn"
                    }`}
                    style={(isMobile && !isTablet) ? { width: '50%' } : {}}
                    onClick={() => setShowDigitalSnapRx(false)}
                  >
                    Written Rx
                  </button>
                </div>
              ) : (
                !(isMobile && !isTablet) && (
                  <div className="digitise-info-cardiology">
                    <img
                      src={successIcon}
                      alt="success"
                      width="40px"
                      height="40px"
                    />
                    <p>
                      <span className="digitise-info-header-cardiology">
                        {`${patient_data?.pm_fullname}'s Digital Rx is ready!`}
                      </span>
                      Digitise Rx to enhance patient care, workflow efficiency,
                      and revenue.
                      <button
                        className="know-more-btn"
                        onClick={handleDrawerCvtKnowMore}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            paddingLeft: "4px",
                            textDecoration: "underline",
                            textDecorationColor: "#454551",
                          }}
                        >
                          Know More
                        </span>
                      </button>
                    </p>
                    <button
                      className="digitise-info-btn-cardiology"
                      onClick={handleDigitiseSnapRx}
                    >
                      Digitise Rx Now
                    </button>
                  </div>
                )
              ))
            }

            {shouldShowVoiceRxTabs &&
              !isSmartRxFile && !isTabRx && 
              !loading && (
                <div className={(isMobile && !isTablet) ? "py-2 mb-2 px-0 mx-0" : "p-2 m-2"} style={(isMobile && !isTablet) ? { width: '100%' } : {}}>
                  <button
                    className={`digital-btn ${
                      !showDigitalGenRx
                        ? "digitise-toggle-btn"
                        : "active-digitise-toggle-btn"
                    }`}
                    style={(isMobile && !isTablet) ? { width: '50%' } : {}}
                    onClick={() => setShowDigitalGenRx(true)}
                  >
                    Digital Rx
                  </button>
                  <button
                    className={`written-btn ${
                      showDigitalGenRx
                        ? "digitise-toggle-btn"
                        : "active-digitise-toggle-btn"
                    }`}
                    style={(isMobile && !isTablet) ? { width: '50%' } : {}}
                    onClick={() => setShowDigitalGenRx(false)}
                  >
                    Transcript
                  </button>
                </div>
              )
            }
            <Drawer
              closeIcon={false}
              // placement="right"
              onClose={handleDrawerCvtKnowMore}
              open={cvtDrawer}
              className=".modalWidth-800"
              width={800}
            >
              <CvtKnowMore
                handleDrawerCvtKnowMore={handleDrawerCvtKnowMore}
                handleCollapsed={(flag) => handleCollapsed(flag)}
              />
            </Drawer>
            {/* Mobile view: Draft Rx alert (same as web) */}
            {(isMobile && !isTablet) && !!is_draft && <DraftRxAlert />}
            {/* Mobile view: Show shimmer skeleton when loading */}
            {(isMobile && !isTablet) && loading && (
              <Card.Body className="p-0" style={{ height: 'calc(100vh - 200px)', position: 'relative' }}>
                <PrescriptionSkeleton />
              </Card.Body>
            )}
            {/* Mobile view: Show prescription PDF inline using react-pdf */}
            {/* MOBILE OPTIMIZATION: Use memoized mobilePdfUrl and pdfPages instead of calculating in render */}
            {(isMobile && !isTablet) && !loading && viewCaseManagerData && shouldUseVoiceRxPrintPayload && (!mobilePreviewReady || !(printPayloadBlob instanceof Blob)) && showDigitalGenRx && (
              <Card.Body className="p-0" style={{ height: 'calc(100vh - 200px)', position: 'relative' }}>
                <PrescriptionSkeleton />
              </Card.Body>
            )}
            {(isMobile && !isTablet) && !loading && viewCaseManagerData && shouldUseVoiceRxPrintPayload && mobilePreviewReady && (printPayloadBlob instanceof Blob) && showDigitalGenRx && (
              <Card.Body className="p-0" style={{ height: 'calc(100vh - 200px)', position: 'relative' }}>
                {isPdfLoading && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
                    <PrescriptionSkeleton />
                  </div>
                )}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    overflowY: 'auto',
                    padding: '8px 0',
                    opacity: isPdfLoading ? 0 : 1,
                  }}
                >
                  <Document
                    file={printPayloadBlob}
                    loading={null}
                    onLoadSuccess={({ numPages }) => {
                      setMobilePdfNumPages(numPages);
                      setIsPdfLoading(false);
                    }}
                    onLoadError={(err) => {
                      console.error("Error rendering mobile prescription PDF:", err);
                      setIsPdfLoading(false);
                    }}
                  >
                    {pdfPages.map((pageNumber) => (
                      <Page
                        key={pageNumber}
                        pageNumber={pageNumber}
                        width={pdfWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    ))}
                  </Document>
                </div>
              </Card.Body>
            )}
            {/* Mobile view: Show Transcript when toggle is set to Transcript */}
            {(isMobile && !isTablet) && !loading && viewCaseManagerData && !showDigitalGenRx && genRxData &&
              shouldShowVoiceRxTabs && (
              <Card.Body className="p-0" style={{ height: 'calc(100vh - 200px)', overflowY: 'auto', padding: '16px' }}>
                <div>
                  {ambientConversations && ambientConversations.length > 0 ? (
                    ambientConversations.map((conv, index) => {
                      const isDoctor = isDoctorTranscriptSpeaker(conv.speaker);
                      return (
                      <div key={index} style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isDoctor ? "flex-end" : "flex-start",
                        marginBottom: "16px"
                      }}>
                        <div style={{
                          backgroundColor: isDoctor ? "#f1f1f5" : "#EFF6FF",
                          borderRadius: isDoctor ? "18px 0 18px 18px" : "0 18px 18px 18px",
                          padding: "16px",
                          maxWidth: "80%",
                          marginLeft: isDoctor ? "auto" : "0px",
                          marginRight: isDoctor ? "0px" : "auto",
                        }}>
                          <div style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#5a6774",
                            marginBottom: "4px",
                            textTransform: "uppercase"
                          }}>
                            {isDoctor ? "Doctor" : "Patient"}
                          </div>
                          <div style={{
                            color: "#374151",
                            wordWrap: "break-word",
                            fontSize: "12px",
                            fontWeight: 400,
                            lineHeight: "18px",
                            textAlign: "left"
                          }}>
                            {conv.text || conv.content}
                          </div>
                        </div>
                      </div>
                      );
                    })
                  ) : (
                    genRxQueries
                      ?.filter((query) => {
                        if (typeof query === "string") {
                          return !isSymptomCollectorJSON(query);
                        }
                        return true;
                      })
                      ?.map((query, index) => (
                        <div key={index} className="gen-rx-transcript">
                          {query}
                        </div>
                      ))
                  )}
                  {(!genRxQueries || genRxQueries.length === 0) && (!ambientConversations || ambientConversations.length === 0) && (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#9CA3AF',
                      fontSize: '14px'
                    }}>
                      No transcript data available for this visit.
                    </div>
                  )}
                </div>
              </Card.Body>
            )}
            {/* Web/Tablet view: Show original content */}
            {!(isMobile && !isTablet) && loading ? (
              <div
                className="d-flex flex-column justify-content-center"
                style={{ height: "calc(100vh - 218px)" }}
              >
                <div className="align-items-center text-center">
                  <Spin size="small" />
                </div>
              </div>
            ) : !(isMobile && !isTablet) && legacyVoiceRxDisplayData &&
              (shouldUseVoiceRxPrintPayload || !showDigitalGenRx) &&
              (!isSmartRxFile && !isTabRx) ? (
              <div>
                {showDigitalGenRx ? (
                  <>
                    {renderDigitisedSections(legacyVoiceRxDisplayData)}
                    {shouldRenderModuleContentsInVoiceRx && renderCustomModulesRxData()}
                    <div
                      className={`d-flex align-items-center mb-14 ${
                        viewCaseManagerData?.follow_up_date
                          ? "follow-up-detailsPage"
                          : ""
                      }`}
                    >
                      {viewCaseManagerData?.follow_up_date && (
                        <>
                          <img className="me-3" src={followUp} alt="Symptoms" />
                          <div className="title-common">Follow-up:</div>
                          <div className="follow-up-date-text">
                            {viewCaseManagerData?.follow_up_date
                              ? moment(viewCaseManagerData.follow_up_date).format(
                                  "DD/MM/YYYY"
                                )
                              : ""}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="m-4">
                    {isAmbientRx ? (
                      ambientTranscriptBlocks?.length > 0
                        ? ambientTranscriptBlocks.map((block, index) =>
                            block.type === "text" ? (
                              <div key={index} className="gen-rx-transcript" style={{ marginBottom: "16px" }}>
                                {block.text}
                              </div>
                            ) : (
                              <React.Fragment key={index}>
                                {(block.conversations || []).map((conv, convIdx) => {
                                  const isDoctor = isDoctorTranscriptSpeaker(conv.speaker);
                                  return (
                                  <div
                                    key={`${index}-${convIdx}`}
                                    style={{
                                      background: isDoctor ? "#e3f2fd" : "#f3e5f5",
                                      marginBottom: "20px",
                                      borderRadius: isDoctor ? "18px 0 18px 18px" : "0 18px 18px 18px",
                                      padding: "16px",
                                      maxWidth: "80%",
                                      marginLeft: isDoctor ? "auto" : "0px",
                                      marginRight: isDoctor ? "0px" : "auto",
                                    }}
                                  >
                                    <div style={{ fontSize: "10px", fontWeight: 600, color: "#5a6774", marginBottom: "4px", textTransform: "uppercase" }}>
                                      {isDoctor ? "Doctor" : "Patient"}
                                    </div>
                                    <div style={{ color: "#374151", wordWrap: "break-word", fontSize: "12px", fontWeight: 400, lineHeight: "18px", textAlign: "left" }}>
                                      {conv.text || conv.content || conv.message}
                                    </div>
                                  </div>
                                  );
                                })}
                              </React.Fragment>
                            )
                          )
                        : ambientConversations?.map((conv, index) => {
                            const isDoctor = isDoctorTranscriptSpeaker(conv.speaker);
                            return (
                            <div
                              key={index}
                              style={{
                                background: isDoctor ? "#e3f2fd" : "#f3e5f5",
                                marginBottom: "20px",
                                borderRadius: isDoctor ? "18px 0 18px 18px" : "0 18px 18px 18px",
                                padding: "16px",
                                maxWidth: "80%",
                                marginLeft: isDoctor ? "auto" : "0px",
                                marginRight: isDoctor ? "0px" : "auto",
                              }}
                            >
                              <div style={{ fontSize: "10px", fontWeight: 600, color: "#5a6774", marginBottom: "4px", textTransform: "uppercase" }}>
                                {isDoctor ? "Doctor" : "Patient"}
                              </div>
                              <div style={{ color: "#374151", wordWrap: "break-word", fontSize: "12px", fontWeight: 400, lineHeight: "18px", textAlign: "left" }}>
                                {conv.text || conv.content}
                              </div>
                            </div>
                            );
                          })
                    ) : (
                      genRxQueries
                        ?.filter((query) => {
                          if (typeof query === "string") {
                            return !isSymptomCollectorJSON(query);
                          }
                          return true;
                        })
                        ?.map((query, index) => (
                          <div key={index} className="gen-rx-transcript">
                            {query}
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            ) : !(isMobile && !isTablet) && (isSmartRxFile || isTabRx) && !isSnapRx ? (
              <div>
                {isRxdigitised && showDigitalRx ? (
                  <>
                    {renderDigitisedSections(rxDigitisedData?.editedData)}
                    {rxDigitisedData?.editedData?.followUp && (
                      <div
                        className={`d-flex align-items-center mb-14 follow-up-detailsPage`}
                      >
                        <img className="me-3" src={followUp} alt="Symptoms" />
                        <div className="title-common">Follow-up:</div>
                        <div className="follow-up-date-text">
                          {rxDigitisedData?.editedData?.followUp
                            ? moment(
                              rxDigitisedData?.editedData?.followUp,
                              ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"],
                              true
                            ).format("DD/MM/YYYY")
                            : ""}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {smartRxFile?.length > 0 &&
                      smartRxFile?.map((fileItem) => (
                        <div style={{ padding: "5px" }}>
                          {fileItem?.smart_prescription_file && (
                            <img
                              src={fileItem?.smart_prescription_file}
                              alt="Smart Rx"
                              width="100%"
                              height="660px"
                            />
                          )}
                        </div>
                      ))}
                  </>
                )}
              </div>
            ) : !(isMobile && !isTablet) && isSnapRx && isSnapRxAccessableFromGB ? (
              <div>
                {isSnapRxdigitised && showDigitalSnapRx ? (
                  <>
                    {renderDigitisedSections(snapRxDigitisedData)}
                    {snapRxDigitisedData?.followUp && (
                      <div
                        className={`d-flex align-items-center mb-14 follow-up-detailsPage`}
                      >
                        <img className="me-3" src={followUp} alt="Symptoms" />
                        <div className="title-common">Follow-up:</div>
                        <div className="follow-up-date-text">
                          {snapRxDigitisedData?.followUp
                            ? moment(
                              snapRxDigitisedData?.followUp,
                              ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"],
                              true
                            ).format("DD/MM/YYYY")
                            : ""}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {!!snapRxFile?.length &&
                      snapRxFile?.map(({ fileUrl }) => (
                        <div style={{ padding: "5px" }}>
                          {fileUrl && (
                            <img
                              src={fileUrl}
                              alt="Snap Rx"
                              width="100%"
                              height="660px"
                            />
                          )}
                        </div>
                      ))}
                  </>
                )}
              </div>
            ) : !(isMobile && !isTablet) && (
              <Card.Body className="p-0 cardbody-data">
                {!!is_draft && <DraftRxAlert />}
                <div>
                  <div className="p-3 pb-0">
                    {viewCaseManagerData.symptoms.length > 0 && (
                      <div className="d-flex align-items-start mb-4">
                        <img
                          className="me-2"
                          src={Symptomsicon}
                          alt="Symptoms"
                        />
                        <div>
                          <div className="title">Symptoms</div>
                          {viewCaseManagerData.symptoms.map((item, i) => {
                            return (
                              <span key={i}>
                                <span>{item.symptom_name}</span> :{" "}
                                <label>{`${
                                  item.since &&
                                  `since ${item.since}${item.severity && ","}`
                                } ${
                                  item.severity &&
                                  `severity ${item.severity}${
                                    item.note && ","
                                  } `
                                } ${item.note && `${item.note}`}`}</label>
                                {viewCaseManagerData.symptoms.length - 1 != i &&
                                  " | "}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {viewCaseManagerData.examination.length > 0 && (
                      <div className="d-flex align-items-start mb-4">
                        <img
                          className="me-2"
                          src={Examinationsicon}
                          alt="Examinations"
                        />
                        <div>
                          <div className="title">Examinations</div>
                          {viewCaseManagerData.examination.map((item, i) => {
                            return (
                              <span key={i}>
                                <span>{item.examination_name}</span> :{" "}
                                <label>{item.note}</label>
                                {viewCaseManagerData.examination.length - 1 !=
                                  i && " | "}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {viewCaseManagerData.surgeries.length > 0 && (
                      <div className="d-flex align-items-start mb-4">
                        <img
                          className="me-2"
                          src={Examinationsicon}
                          alt="surgeries"
                        />
                        <div>
                          <div className="title">Surgeries/Procedures</div>
                          {viewCaseManagerData.surgeries.map((item, i) => {
                            return (
                              <span key={i}>
                                <span>{item.name}</span> :{" "}
                                <label>{item.notes}</label>
                                {viewCaseManagerData.surgeries.length - 1 !=
                                  i && " | "}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {viewCaseManagerData.diagnosis.length > 0 && (
                      <div className="d-flex align-items-start mb-4">
                        <img
                          className="me-2"
                          src={Diagnosisicon}
                          alt="Diagnosis"
                        />
                        <div>
                          <div className="title">Diagnosis</div>
                          {viewCaseManagerData.diagnosis.map((item, i) => {
                            return (
                              <span key={i}>
                                <span>{`${item.tds_name} ${item?.icd_code ? `(${item?.icd_code})` : ''}`}</span> :{" "}
                                <label>{`${
                                  item.since &&
                                  `since ${item.since}${item.status && ","}`
                                } ${
                                  item.status &&
                                  `status ${item.status}${item.note && ","} `
                                } ${item.note && `${item.note}`}`}</label>
                                {viewCaseManagerData.diagnosis.length - 1 !=
                                  i && " | "}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {medicationData.length > 0 && (
                      <div className="d-flex align-items-center">
                        <img
                          className="me-2"
                          src={Medicationicon}
                          alt="Medication"
                        />
                        <div>
                          <div className="title">Medication (Rx)</div>
                        </div>
                      </div>
                    )}
                  </div>
                  {medicationData.length > 0 && (
                    <div>
                      <div className="border-top border-bottom mt-2">
                        <Table
                          className="table-border patient-medication"
                          columns={columns}
                          dataSource={medicationData}
                          onChange={handleChange}
                          pagination={false}
                        />
                      </div>
                    </div>
                  )}
                  {renderOpthalSummary()}
                  <div className="p-3">
                    {viewCaseManagerData.advice.length > 0 && (
                      <div className="d-flex align-items-start mb-4">
                        <img className="me-2" src={Frameicon} alt="Advice" />
                        <div>
                          <div className="title">Advice</div>

                          {viewCaseManagerData.advice.map((item, i) => {
                            return (
                              <label key={i}>{`${i != 0 ? ", " : ""}${
                                item.advice_name
                              }`}</label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {viewCaseManagerData.investigation.length > 0 && (
                      <div className="d-flex align-items-start mb-4">
                        <img
                          className="me-2"
                          src={Investigationicon}
                          alt="Advice"
                        />
                        <div>
                          <div className="title">{INVESTIGATION_TITLE}</div>
                          {viewCaseManagerData.investigation.map((item, i) => {
                            return (
                              <span key={i}>
                                <span key={i}>{item.investigation_name}</span> :{" "}
                                <label>{item.note}</label>
                                {viewCaseManagerData.investigation.length - 1 !=
                                  i && " | "}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {viewCaseManagerData.visit_advice && (
                      <div className="d-flex align-items-start mb-4">
                        <img
                          className="me-2"
                          src={notesicon}
                          alt="Doctor Note"
                        />
                        <div>
                          <div className="title">Doctor Note</div>
                          <label>{viewCaseManagerData.visit_advice}</label>
                        </div>
                      </div>
                    )}
                    {viewCaseManagerData.treatment && (
                      <div className="d-flex align-items-start mb-4">
                        <img
                          className="me-2"
                          src={notesicon}
                          alt="Doctor Note1"
                        />
                        <div>
                          <div className="title">Treatment</div>
                          <label className="whitespace-pre-wrap">
                            {viewCaseManagerData.treatment}
                          </label>
                        </div>
                      </div>
                    )}
                    {viewCaseManagerData?.follow_up_date && (
                      <div
                        className="d-flex align-items-center m-0 mb-14 follow-up-detailsPage"
                      >
                        <img className="me-3" src={followUp} alt="Symptoms" />
                        <div className="title-common">Follow-up:</div>
                        <div className="follow-up-date-text">
                          {viewCaseManagerData?.follow_up_date
                            ? moment(viewCaseManagerData.follow_up_date).format(
                                "DD/MM/YYYY"
                              )
                            : ""}
                        </div>
                      </div>
                    )}
                    {renderCustomModulesRxData()}
                  </div>
                </div>
              </Card.Body>
            )}
          </>
        ) : (
          <div
            className="d-flex flex-column justify-content-center"
            style={{ height: "calc(100vh - 118px)" }}
          >
            {loading ? (
              <div className="align-items-center text-center">
                <Spin size="small" />
              </div>
            ) : (
              <div className="align-items-center text-center">
                <img
                  src={calenderBlank}
                  width={57}
                  height={62}
                  alt="No vital & body composition saved for the patient!"
                />
                <p className="mt-4 fontroboto">
                  No visit found for this patient yet
                </p>
                <div className="d-flex flex-column align-items-center justify-content-center g-4" style={{ width: "100%", maxWidth: "320px", margin: "0 auto" }}>
                  {isChikitsalayAccessable ? (
                    <button
                        type="button"
                        className="btn btn-primary3 btn-text-white btn-41 px-4"
                        style={{ color: "#fff" }}
                        onClick={() => handleStartConsult()}
                    >
                        Consult
                    </button>
                    ) : (isSmartSyncAccessableFromGB || isSnapRxAccessableFromGB || (isFreeVoiceRxUser || tp_monetization_enable)) && (typeof window !== 'undefined' && window.innerWidth >= 768) ? (
                    <PrimaryActionButton
                      isSmartRxAccessible={isSmartSyncAccessableFromGB}
                      isSnapRxAccessible={isSnapRxAccessableFromGB}
                      isVoiceRxAccessible={isFreeVoiceRxUser || tp_monetization_enable}
                      isVoiceRxPaid={isVoiceRxPaid}
                      onSmartRxClick={() => handleStartSmartRx()}
                      onSnapRxClick={() => handleStartSnapRx()}
                      onVoiceRxClick={() => handleStartVoiceRx()}
                      onTabRxClick={() => handleStartTabRx()}
                      onConsultClick={() => handleStartConsult()}
                      patient={patient_data}
                      buttonStyle="walkin"
                      fullWidth={true}
                    />
                  ) : (
                  <Button
                    className="btn btn-primary3 btn-text-white px-5 m-2 btn-41"
                    onClick={() => {
                      if (isVoiceRxPaid) {
                        const clinic_name = getClinicName(profile?.hospital_data);
                        window.Moengage?.track_event("TP_VoiceRx_EntryPoint_Click", {
                          patient_contact: patient_data?.pm_contact_no || "",
                          patient_id: patient_data?.patient_unique_id || "",
                          doctor_speciality: profile?.dp_name,
                          doctor_unique_id: profile?.doctor_unique_id,
                          clinic_name,
                        });
                        navigate(isVoiceRxNewFromGB ? "/prescription" : "/voice-rx-consult", {
                          state: {
                            patient_data: patient_data,
                            ...(isVoiceRxNewFromGB && {
                              isVoiceRxNewUiFlow: true,
                              voiceRxEntryPoint: "patient_details_no_visit_fallback",
                            }),
                          },
                        });
                      } else {
                        window.Moengage.track_event("start_new_visit_click", {
                          doctor_id: profile?.doctor_unique_id,
                          patient_id:
                            patient_data !== undefined
                              ? patient_data.patient_unique_id
                              : 0,
                        });
                        navigate("/prescription", {
                          state: {
                            patient_data: patient_data,
                            send_path: "patient_details",
                          },
                        });
                      }
                    }}
                  >
                    {isVoiceRxPaid ? "Start Voice Rx" : "Start New Consult"}
                  </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default React.memo(Cardiology);
