import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Row, Col, Spin, message } from "antd";
import { isMobile } from "react-device-detect";
import { jwtDecode } from "jwt-decode";
// import { errorMessage } from "../utils/utils";
import api from "../api/services/axiosService";

import { FETCH_SMART_RX, GB_MANYA_DENTAL, S_RX_DIGITIZATION } from "../utils/constants";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN, ADD } from "../utils/constants";
import { useSelector, useDispatch } from "react-redux";
import { env } from "../EnvironmentConfig";
import { getInvestigationAndMedicine, addCaseManager, editCaseManager, viewCaseManager } from "../redux/caseManagerSlice";
import { placeIctOrder } from "../redux/appointmentsSlice";
import { enrichVitalsWithCalculations } from "../utils/vitalsCalculations";
import { resolveMedicalHistoryForCaseManager } from "../utils/medicalHistoryUtils";
import { getNormalizedGynecHistory, syncGynecHistoryAfterEndVisit } from "../utils/gynecHistoryUtils";
import { getGynecDetails, postGynecDetails, updateGynecDetails } from "../api/services/ApiGynec";
import { fetchLabResultsTodayOnly } from "../utils/labResultsUtils";
import ApiMedicalHistory from "../api/services/ApiMedicalHistory";
import { getVitals, setVitalsIdsFromAddVitals, resetVitalsState } from "../redux/vitalsSlice";
import ApiVitals from "../api/services/ApiVitals";
import moment from "moment";
import { getTokenData } from "../utils/utils";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_ZYDUS_USER } from "../utils/constants";
import HeaderSmartRxDigitise from "../common/HeaderSmartRxDigitise";
import DigitisedPrescription from "../components/DigitisedPrescription";
import axios from "axios";
import { updateCredits } from "../redux/monetizationSlice";
import ApiMedication from "../api/services/ApiMedication";
import { setDentalData, clearDentalData } from "../redux/dentalRxSlice";
import {
  hasVitalsAndBodyCompositionData,
  normalizeVitalsAndBodyCompositionToRxRowFields,
  vitalScalarString,
} from "../utils/symptomCollectorVitalsMerge";
import {
  ensureLabInvestigationMetadataForRxSave,
  ensureMedicationGroundedForRxSave,
} from "../utils/medicationRxPayload";
import { ASSETS } from "../assets";
const documentIcon = ASSETS.images.documentNormal;

function SmartRxDigitise() {
  const divRef = useRef(null);
  const splitRef = useRef(null);
  const isResizingRef = useRef(false);
  const persistVitalsInFlightRef = useRef(false);
  const [leftWidthPercent, setLeftWidthPercent] = useState(30);

  const { profile, siteId, storeCode, userId } = useSelector((state) => state.doctors);
  const dentalDataFromStore = useSelector((state) => state.dentalRx?.dentalData);
  const { loading } = useSelector((state) => state.caseManager);
  const { listVitalsTodayIds } = useSelector((state) => state.vitals);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const location = useLocation();
  const { state: locationState } = location;
  const state = locationState || {};
  const {
    patient_data,
    smartRxFilesData,
    tcm_id,
    print_url,
    digitisedData,
    pam_id,
    isCustomSSRX,
  } = state;

  const [printUrl, setPrintUrl] = useState(
    state !== undefined ? `${state.print_url}` : null
  );
  const [token, setToken] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [divWidth, setDivWidth] = useState(0);
  const [data, setData] = useState(null);
  const [isDigitiseRxSubmit, setIsDigitiseRxSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [smartRxFile, setSmartRxFile] = useState(smartRxFilesData);
  // Object URLs for native File/Blob so left panel can display them; revoke on cleanup
  const [objectUrlsForFiles, setObjectUrlsForFiles] = useState([]);
  const objectUrlsRef = useRef([]);
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const isManyaDentalAccessableFromGB = useFeatureIsOn(GB_MANYA_DENTAL);
  // Grounding check (Zydus users)
  const tokenDataLocal = getTokenData();
  const isGroundingAccessableForZydus =
    tokenDataLocal?.hospital_business_id == env.zydus_business_id &&
    isZydusUserAccessableFromGB;

  const baseUrlRxDigitise = env.rx_digitization;
  const isSmartRxDigitisePath = location?.pathname === "/smart-rx-digitise";
  const shouldUseCustomRxDigitize = isManyaDentalAccessableFromGB && isSmartRxDigitisePath;
  const clearSmartRxDentalState = useCallback(() => {
    dispatch(clearDentalData());
  }, [dispatch]);

  // Create object URLs for native File/Blob items so left panel can display; revoke on unmount or when smartRxFile changes
  useEffect(() => {
    if (!smartRxFile?.length) {
      setObjectUrlsForFiles([]);
      return;
    }
    const urls = [];
    smartRxFile.forEach((file, i) => {
      if (file instanceof File || file instanceof Blob) {
        urls[i] = URL.createObjectURL(file);
      }
    });
    objectUrlsRef.current.forEach((u) => {
      if (u) try { URL.revokeObjectURL(u); } catch (_) {}
    });
    objectUrlsRef.current = urls;
    setObjectUrlsForFiles(urls);
    return () => {
      objectUrlsRef.current.forEach((u) => {
        if (u) try { URL.revokeObjectURL(u); } catch (_) {}
      });
      objectUrlsRef.current = [];
    };
  }, [smartRxFile]);

  useEffect(() => {
    setDivWidth(divRef.current?.offsetWidth);
  }, [divRef]);

  const onMouseMoveResizer = useCallback((e) => {
    if (!isResizingRef.current || !splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const pct = (relativeX / rect.width) * 100;
    const clamped = Math.min(75, Math.max(25, pct));
    setLeftWidthPercent(clamped);
  }, []);

  const stopResizing = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    document.removeEventListener("mousemove", onMouseMoveResizer);
    document.removeEventListener("mouseup", stopResizing);
  }, [onMouseMoveResizer]);

  const startResizing = useCallback(() => {
    isResizingRef.current = true;
    document.addEventListener("mousemove", onMouseMoveResizer);
    document.addEventListener("mouseup", stopResizing);
  }, [onMouseMoveResizer, stopResizing]);

  // Keep only non-empty vitals; preserve tcv_id, tcbc_id, dev_unique_id, pam_id (same pattern as Cardiology/ConsultationDrawer)
  const vitalsOnlyNonEmpty = useCallback((v) => {
    if (!v || typeof v !== "object") return {};
    const actual = v._doc || v;
    const keyMap = { respiratoryRate: "respRate", randomBloodSugar: "sugar", headCircumference: "ofc", genralRBS: "general_rbs" };
    const result = {};
    const idKeys = ["tcv_id", "tcbc_id", "dev_unique_id", "pam_id"];
    idKeys.forEach((k) => {
      if (actual[k] !== undefined) result[k] = actual[k];
    });
    Object.entries(actual).forEach(([key, value]) => {
      if (idKeys.includes(key)) return;
      const s = vitalScalarString(value);
      if (s !== "") {
        result[keyMap[key] || key] = s;
      }
    });
    return result;
  }, []);

  // Filter vitals to non-empty only before passing to Rx Pad (API already returns vitalsAndBodyComposition, examinations, labInvestigation)
  const canonicalFromApi = useCallback((src) => {
    if (!src || typeof src !== "object") return src;
    const out = { ...src };
    if (out.vitalsAndBodyComposition) {
      out.vitalsAndBodyComposition = vitalsOnlyNonEmpty(out.vitalsAndBodyComposition);
    }
    return out;
  }, [vitalsOnlyNonEmpty]);

  const persistSmartRxVitals = useCallback(
    async (vitalsAndBodyComposition, setDataFn) => {
      if (!vitalsAndBodyComposition || typeof vitalsAndBodyComposition !== "object" || !patient_data?.patient_unique_id) return;
      if (!hasVitalsAndBodyCompositionData(vitalsAndBodyComposition)) return;
      if (persistVitalsInFlightRef.current) return;
      persistVitalsInFlightRef.current = true;
      try {
      const listPayload = {
        patient_unique_id: patient_data.patient_unique_id,
        pam_id: patient_data.pam_id ?? 0,
        mode: ADD,
        pm_pid: patient_data.pm_pid ?? 0,
        pm_id: patient_data.pm_id ?? 0,
      };
      try {
        const list = await dispatch(getVitals(listPayload)).unwrap().catch(() => []);
        const today = moment().format("YYYY-MM-DD");
        const existingToday = Array.isArray(list) ? list.find((v) => (v.date || "").toString().startsWith(today)) : null;
        const ids = {
          tcv_id: existingToday?.tcv_id ?? 0,
          tcbc_id: existingToday?.tcbc_id ?? 0,
          dev_unique_id: existingToday?.dev_unique_id ?? 0,
        };

        const patch = normalizeVitalsAndBodyCompositionToRxRowFields(vitalsAndBodyComposition);
        if (Object.keys(patch).length === 0) return;

        const vitalsArray = [
          {
            date: today,
            temp: patch.temp ?? "",
            pres: patch.pres ?? "",
            resp_rate: patch.resp_rate ?? "",
            systolic: patch.systolic ?? "",
            diastolic: patch.diastolic ?? "",
            ...(patch.blood_press ? { blood_press: patch.blood_press } : {}),
            spo2: patch.spo2 ?? "",
            height: patch.height ?? "",
            weight: patch.weight ?? "",
            ofc: patch.ofc ?? "",
            sugar: "",
            general_rbs: patch.general_rbs ?? "",
            fib4: patch.fib4 ?? "",
            waist_circumference: patch.waist_circumference ?? "",
            bmi: patch.bmi ?? "",
            bmr: patch.bmr ?? "",
            bsa: patch.bsa ?? "",
            tcv_id: ids.tcv_id,
            tcbc_id: ids.tcbc_id,
            dev_unique_id: ids.dev_unique_id,
          },
        ];
        const sendData = {
          patient_unique_id: patient_data.patient_unique_id,
          pm_pid: patient_data.pm_pid ?? 0,
          pm_id: patient_data.pm_id ?? 0,
          pam_id: patient_data.pam_id ?? 0,
          patient_birth_weight: null,
          data: vitalsArray,
        };
        const addRes = await ApiVitals.addUpdateVitals(sendData);
        if (addRes?.status !== false && addRes?.statusCode !== 400 && addRes?.data?.length) {
          const saved = addRes.data.find((row) => (row.date || "").toString().startsWith(today)) || addRes.data[0];
          const responseIds = {
            tcv_id: saved?.tcv_id ?? 0,
            tcbc_id: saved?.tcbc_id ?? 0,
            dev_unique_id: saved?.dev_unique_id ?? 0,
          };
          dispatch(
            setVitalsIdsFromAddVitals({
              flow: "smart",
              patient_unique_id: patient_data.patient_unique_id,
              ...responseIds,
            })
          );
          if (typeof setDataFn === "function") {
            setDataFn((prev) => ({
              ...prev,
              vitalsAndBodyComposition: { ...(prev?.vitalsAndBodyComposition || {}), ...responseIds },
            }));
          }
        }
      } catch (err) {
        // persistSmartRxVitals failed; IDs may be 0 in save payload
      }
      } finally {
        persistVitalsInFlightRef.current = false;
      }
    },
    [dispatch, patient_data]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    if (smartRxFile?.length > 0 && state.type === "new") {
      uploadFiles();
    } else if (state.type === "edit" && digitisedData) {
      uploadFiles();
    } else {
      setIsLoading(false);
    }
  }, [token, smartRxFile, digitisedData]);

  useEffect(() => {
    return () => {
      dispatch(resetVitalsState());
      clearSmartRxDentalState();
    };
  }, [dispatch, clearSmartRxDentalState]);

  useEffect(() => {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    setToken(token);
    if (token) {
      try {
        var decoded = jwtDecode(token);
        setTokenData(decoded.result);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSave = async () => {
    try {
      const cleanedToken = token.replace(/['"]+/g, "");

      const sanitizedMedications =
        data?.medications?.map((item) => {
          const quantityValue = item?.quantity;
          let quantity = 0;

          if (typeof quantityValue === "number" && Number.isFinite(quantityValue)) {
            quantity = quantityValue;
          } else if (quantityValue !== undefined && quantityValue !== null) {
            const parsedQuantity = Number(quantityValue);
            quantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
          }

          return ensureMedicationGroundedForRxSave({ ...item, quantity });
        }) || [];

      const quantityActionMedicine = await ApiMedication.getQuantity({
        medicines: sanitizedMedications,
      });
      const updatedPrescriptionData = {
        ...data,
        medications:
          sanitizedMedications.map((item, index) => {
            const quantityValue =
              quantityActionMedicine?.medicines?.[index]?.quantity;
            let quantity = 0;

            if (typeof quantityValue === "number" && Number.isFinite(quantityValue)) {
              quantity = quantityValue;
            } else if (quantityValue !== undefined && quantityValue !== null) {
              const parsedQuantity = Number(quantityValue);
              quantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
            }

            return ensureMedicationGroundedForRxSave({ ...item, quantity });
          }),
        labInvestigation: Array.isArray(data?.labInvestigation)
          ? data.labInvestigation.map((item) =>
              ensureLabInvestigationMetadataForRxSave(item)
            )
          : [],
      };

      const editedDataForApi = { ...updatedPrescriptionData };
      const hasDentalPayload = !!(
        editedDataForApi?.dental ||
        editedDataForApi?.dentalData ||
        editedDataForApi?.complaints ||
        editedDataForApi?.treatmentPlans ||
        editedDataForApi?.workDone ||
        (Array.isArray(editedDataForApi?.medications) &&
          editedDataForApi.medications.length > 0) ||
        dentalDataFromStore?.complaints ||
        dentalDataFromStore?.treatmentPlans ||
        dentalDataFromStore?.workDone ||
        (Array.isArray(dentalDataFromStore?.medications) &&
          dentalDataFromStore.medications.length > 0) ||
        dentalDataFromStore
      );
      if (hasDentalPayload) {
        editedDataForApi.dental = true;
        // Safely set dentalData in dynamicFields if not present and dentalDataFromStore exists
        // Ensure dynamicFields exists and is an object before adding dentalData
        if (dentalDataFromStore) {
          // Ensure dynamicFields is an array
          if (!Array.isArray(editedDataForApi.dynamicFields)) {
            editedDataForApi.dynamicFields = [];
          }
          if (!editedDataForApi.dynamicFields[0]) {
            editedDataForApi.dynamicFields[0] = {};
          }
          if (!editedDataForApi.dynamicFields[0].hasOwnProperty("dentalData")) {
            editedDataForApi.dynamicFields[0].dentalData = dentalDataFromStore;
          }
        }
      }
      if (editedDataForApi.dentalData) {
        // Ensure dynamicFields is an array
        if (!Array.isArray(editedDataForApi.dynamicFields)) {
          editedDataForApi.dynamicFields = [];
        }
        if (!editedDataForApi.dynamicFields[0]) {
          editedDataForApi.dynamicFields[0] = {};
        }
        editedDataForApi.dynamicFields[0].dentalData = editedDataForApi.dentalData;
      }
      if (editedDataForApi.vitalsAndBodyComposition && typeof editedDataForApi.vitalsAndBodyComposition === "object") {
        const { tcv_id, tcbc_id, dev_unique_id, ...vitalsRest } = editedDataForApi.vitalsAndBodyComposition;
        const generalRBSVal = vitalsRest.general_rbs ?? vitalsRest["General RBS"] ?? vitalsRest.generalRBS ?? vitalsRest.genralRBS;
        if (generalRBSVal != null && String(generalRBSVal).trim() !== "") vitalsRest.generalRBS = String(generalRBSVal).trim();
        delete vitalsRest.general_rbs;
        delete vitalsRest["General RBS"];
        delete vitalsRest.genralRBS;
        editedDataForApi.vitalsAndBodyComposition = vitalsRest;
      }

      const payload = {
        isDigitize: true,
        editedData: editedDataForApi,
      };

      // API call to save the data
      const response = await axios.patch(
        `${baseUrlRxDigitise}/api/v1/rxdigitize/rx/${tcm_id}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cleanedToken}`,
          },
        }
      );

      // Handle navigation based on the API response
      if (response.status === 204) {
        if (isGroundingAccessableForZydus && patient_data?.departmentId) {
          let sendInvestigationAndMedicine = {
            patient_unique_id:
              patient_data !== undefined ? patient_data.patient_unique_id : 0,
            tcm_id: tcm_id,
          };
          const actionIM = await dispatch(
            getInvestigationAndMedicine(sendInvestigationAndMedicine)
          );
          if (actionIM.meta.requestStatus === "fulfilled") {
            let zydusSendData = {
              action: tcm_id == 0 ? "add" : "edit",
              tcmId: tcm_id,
              siteId: siteId,
              departmentId: patient_data?.departmentId,
              visitId: patient_data?.visitId,
              encounterId: patient_data?.encounterId,
              mrno: patient_data?.mrno,
              doctorCode: patient_data?.employeeId,
              storeCode: storeCode,
              duplicateCheck: 1,
              investigationList:
                actionIM?.payload?.investigation?.map(
                  (item) => item.investigation_name
                ) || [],
              medicineList:
                sanitizedMedications.map(({ name, notes }, index) => {
                  const quantityValue =
                    quantityActionMedicine?.medicines?.[index]?.quantity;
                  let quantity = 0;

                  if (
                    typeof quantityValue === "number" &&
                    Number.isFinite(quantityValue)
                  ) {
                    quantity = quantityValue;
                  } else if (quantityValue !== undefined && quantityValue !== null) {
                    const parsedQuantity = Number(quantityValue);
                    quantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
                  }

                  return {
                    name,
                    quantity,
                    instruction: notes,
                  };
                }),
              pillupSwitch: 0,
            };
            await dispatch(placeIctOrder(zydusSendData));
          }
        }

        let vitalsForCase = [];
        try {
          const listPayload = {
            patient_unique_id: patient_data.patient_unique_id,
            pam_id: patient_data.pam_id ?? 0,
            mode: ADD,
            pm_pid: patient_data.pm_pid ?? 0,
            pm_id: patient_data.pm_id ?? 0,
          };
          const allVitals = await dispatch(getVitals(listPayload)).unwrap().catch(() => []);
          const today = moment().format("YYYY-MM-DD");
          const todayVitals = Array.isArray(allVitals) ? allVitals.filter((v) => (v.date || "").toString().startsWith(today)) : [];

          const v = updatedPrescriptionData?.vitalsAndBodyComposition || {};
          const hasRxPadVitals = v && Object.keys(v).length > 0 && Object.keys(v).some((k) => !["tcv_id", "tcbc_id", "dev_unique_id", "pam_id"].includes(k) && v[k] != null && String(v[k]).trim() !== "");
          
          if (hasRxPadVitals && todayVitals.length > 0) {
            // Multiple vitals entries: send all with their respective IDs
            vitalsForCase = todayVitals.map((vitalEntry) => {
              let systolic = String(vitalEntry.blood_press || "").split("/")[0]?.trim() || "";
              let diastolic = String(vitalEntry.blood_press || "").split("/")[1]?.trim() || "";
              const vital = {
                date: today,
                temp: String(vitalEntry.temp || "").trim(),
                pres: String(vitalEntry.pres || "").trim(),
                resp_rate: String(vitalEntry.resp_rate || "").trim(),
                systolic,
                diastolic,
                blood_press: vitalEntry.blood_press || "",
                spo2: String(vitalEntry.spo2 || "").trim(),
                height: String(vitalEntry.height || "").trim(),
                weight: String(vitalEntry.weight || "").trim(),
                ofc: String(vitalEntry.ofc || "").trim(),
                sugar: String(vitalEntry.sugar || "").trim(),
                general_rbs: String(vitalEntry.general_rbs || "").trim(),
                fib4: String(vitalEntry.fib4 || "").trim(),
                waist_circumference: String(vitalEntry.waist_circumference || "").trim(),
                bmi: String(vitalEntry.bmi || "").trim(),
                bmr: String(vitalEntry.bmr || "").trim(),
                bsa: String(vitalEntry.bsa || "").trim(),
                tcv_id: Number(vitalEntry.tcv_id ?? 0),
                tcbc_id: Number(vitalEntry.tcbc_id ?? 0),
                dev_unique_id: Number(vitalEntry.dev_unique_id ?? 0),
                pam_id: patient_data?.pam_id ?? pam_id ?? 0,
              };
              const patientInfo = patient_data ? { age: patient_data.ageYears || patient_data.age || patient_data.pm_age, gender: patient_data.pm_gender || patient_data.gender } : {};
              return enrichVitalsWithCalculations(vital, patientInfo);
            });
          } else if (hasRxPadVitals) {
            // Single vital entry from Rx Pad
            let systolic = String(v.Systolic || v.systolic || "").trim();
            let diastolic = String(v.Diastolic || v.diastolic || "").trim();
            let blood_press = v.bloodPressure || v.blood_press || "";
            if (blood_press && !systolic && !diastolic) {
              const parts = String(blood_press).split("/");
              if (parts.length >= 2) {
                systolic = parts[0].trim();
                diastolic = parts[1].trim();
              }
            }
            if (!systolic || !diastolic) blood_press = "";
            else if (!blood_press) blood_press = `${systolic}/${diastolic}`;
            const rxPadVital = {
              date: today,
              temp: String(v.temperature || v.temp || "").trim(),
              pres: String(v.pulse || v.pres || "").trim(),
              resp_rate: String(v.respRate || v.resp_rate || "").trim(),
              systolic,
              diastolic,
              spo2: String(v.spo2 || v.SPO2 || "").trim(),
              height: String(v.height || v.Height || "").trim(),
              weight: String(v.weight || v.Weight || "").trim(),
              ofc: String(v.ofc || v.OFC || "").trim(),
              sugar: String(v.sugar || v.Sugar || "").trim(),
              general_rbs: String(v["General RBS"] || v.general_rbs || v.generalRBS || v.genralRBS || "").trim(),
              fib4: String(v.FIB4 || v.fib4 || "").trim(),
              waist_circumference: String(v["Waist Circumference"] || v.waist_circumference || "").trim(),
              bmi: String(v.BMI || v.bmi || "").trim(),
              bmr: String(v.BMR || v.bmr || "").trim(),
              bsa: String(v.BSA || v.bsa || "").trim(),
              tcv_id: Number(v.tcv_id ?? 0),
              tcbc_id: Number(v.tcbc_id ?? 0),
              dev_unique_id: Number(v.dev_unique_id ?? 0),
              pam_id: patient_data?.pam_id ?? pam_id ?? 0,
            };
            if (systolic && diastolic) rxPadVital.blood_press = blood_press;
            const patientMatch = listVitalsTodayIds != null && String(listVitalsTodayIds.patient_unique_id) === String(patient_data?.patient_unique_id);
            const hasIds = patientMatch && listVitalsTodayIds && (
              (listVitalsTodayIds.tcv_id != null && listVitalsTodayIds.tcv_id !== 0) ||
              (listVitalsTodayIds.tcbc_id != null && listVitalsTodayIds.tcbc_id !== 0) ||
              (listVitalsTodayIds.dev_unique_id != null && listVitalsTodayIds.dev_unique_id !== 0)
            );
            if (hasIds) {
              rxPadVital.tcv_id = Number(listVitalsTodayIds.tcv_id ?? 0);
              rxPadVital.tcbc_id = Number(listVitalsTodayIds.tcbc_id ?? 0);
              rxPadVital.dev_unique_id = Number(listVitalsTodayIds.dev_unique_id ?? 0);
            }
            const patientInfo = patient_data ? { age: patient_data.ageYears || patient_data.age || patient_data.pm_age, gender: patient_data.pm_gender || patient_data.gender } : {};
            const enriched = enrichVitalsWithCalculations(rxPadVital, patientInfo);
            vitalsForCase = [{ ...enriched }];
          }
          // Clean blood_press if systolic/diastolic missing
          vitalsForCase = vitalsForCase.map((row) => {
            const cleanedRow = { ...row };
            if (!String(cleanedRow.systolic || "").trim() || !String(cleanedRow.diastolic || "").trim()) cleanedRow.blood_press = "";
            return cleanedRow;
          });
        } catch (err) {
          console.error("[SmartRx] build vitals for addCaseManager/editCaseManager", err);
        }
        const rawMedicalHistory = Array.isArray(updatedPrescriptionData?.medicalHistory) ? updatedPrescriptionData.medicalHistory : [];
        const medicalHistoryForApi = await resolveMedicalHistoryForCaseManager(rawMedicalHistory, {
          getSectionsWithTags: () => ApiMedicalHistory.listSectionwithTag(),
          addTag: (payload) => ApiMedicalHistory.addTag(payload),
          searchTag: (payload) => ApiMedicalHistory.searchTag(payload),
        });
        const consultationDate = moment().format("YYYY-MM-DD HH:mm");
        let smartPrescriptionFilenames = (smartRxFilesData || smartRxFile || [])
          .map((f) => (f && (f.smart_prescription_filename ?? f.name)) || "")
          .filter(Boolean);
        if (smartPrescriptionFilenames.length === 0 && Array.isArray(digitisedData?.smart_prescription_filename)) {
          smartPrescriptionFilenames = digitisedData.smart_prescription_filename.filter(Boolean);
        }
        if (smartPrescriptionFilenames.length === 0 && digitisedData?.editedData?.smart_prescription_filename != null) {
          const fromEdited = digitisedData.editedData.smart_prescription_filename;
          smartPrescriptionFilenames = Array.isArray(fromEdited) ? fromEdited.filter(Boolean) : [fromEdited].filter(Boolean);
        }
        if (smartPrescriptionFilenames.length === 0 && Array.isArray(data?.smart_prescription_filename)) {
          smartPrescriptionFilenames = data.smart_prescription_filename.filter(Boolean);
        }
        if (smartPrescriptionFilenames.length === 0 && tcm_id > 0 && patient_data?.patient_unique_id != null) {
          try {
            const viewAction = await dispatch(viewCaseManager({
              patient_unique_id: patient_data.patient_unique_id,
              tcm_id,
            }));
            if (viewAction.meta.requestStatus === "fulfilled" && viewAction.payload?.smart_prescription_filename != null) {
              const existing = viewAction.payload.smart_prescription_filename;
              smartPrescriptionFilenames = Array.isArray(existing) ? existing.filter(Boolean) : [existing].filter(Boolean);
            }
          } catch (e) {
            // fallback failed
          }
        }
        const rawFollowUpDateValue = String(
          updatedPrescriptionData?.followUp ??
            updatedPrescriptionData?.follow_up_date ??
            ""
        ).trim();
        let followUpDateValue = "";
        if (rawFollowUpDateValue) {
          // Align with consult flow payload: always persist a concrete YYYY-MM-DD date.
          if (moment(rawFollowUpDateValue, moment.ISO_8601, true).isValid()) {
            followUpDateValue = moment(rawFollowUpDateValue).format("YYYY-MM-DD");
          } else {
            const relativeDateMatch = rawFollowUpDateValue.match(
              /(\d+)\s*(day|days|week|weeks|month|months|year|years)/i
            );
            if (relativeDateMatch) {
              const value = parseInt(relativeDateMatch[1], 10);
              const unit = relativeDateMatch[2].toLowerCase();
              const baseDate = consultationDate
                ? moment(consultationDate)
                : moment();
              if (unit.includes("year")) {
                followUpDateValue = baseDate
                  .add(value, "years")
                  .format("YYYY-MM-DD");
              } else if (unit.includes("month")) {
                followUpDateValue = baseDate
                  .add(value, "months")
                  .format("YYYY-MM-DD");
              } else if (unit.includes("week")) {
                followUpDateValue = baseDate
                  .add(value, "weeks")
                  .format("YYYY-MM-DD");
              } else {
                followUpDateValue = baseDate
                  .add(value, "days")
                  .format("YYYY-MM-DD");
              }
            }
          }
        }
        const caseManagerPayload = {
          action: tcm_id === 0 ? "add" : "edit",
          tcm_id: tcm_id,
          patient_unique_id: patient_data?.patient_unique_id ?? 0,
          pam_id: patient_data?.pam_id ?? pam_id ?? 0,
          consultation_date: consultationDate,
          consultation_start_datetime: consultationDate,
          medical_history: medicalHistoryForApi,
          private_notes_id: 0,
          smart_prescription_filename: smartPrescriptionFilenames,
          ...(followUpDateValue && { follow_up_date: followUpDateValue }),
          ...(vitalsForCase.length > 0 && { vitals: vitalsForCase }),
        };
        const caseAction = tcm_id === 0
          ? await dispatch(addCaseManager(caseManagerPayload))
          : await dispatch(editCaseManager(caseManagerPayload));
        if (caseAction.meta.requestStatus === "fulfilled") {
          dispatch(resetVitalsState());
          if (patient_data?.patient_unique_id && (userId !== undefined && userId !== null)) {
            const rxGynec = getNormalizedGynecHistory(updatedPrescriptionData ?? {});
            syncGynecHistoryAfterEndVisit(patient_data.patient_unique_id, userId, rxGynec, { getGynecDetails, postGynecDetails, updateGynecDetails });
          }
          try {
            await fetchLabResultsTodayOnly(patient_data);
          } catch (e) {
            // no-op: lab results today fetch after save
          }
        }

        let sendData = {
          b2c_id: profile?.b2c,
          service_name: S_RX_DIGITIZATION,
        };
        dispatch(updateCredits(sendData));
        if (
          state?.page === "patient-summary" ||
          state?.page === "pending-digitization"
        ) {
          clearSmartRxDentalState();
          navigate(-1); // Go back to the previous page
        } else {
          clearSmartRxDentalState();
          navigate("/print-smart-rx", {
            replace: true,
            state: {
              patient_data,
              smartRxData: smartRxFilesData,
              smartRxFile: smartRxFilesData,
              tcm_id,
              pam_id: pam_id || patient_data?.pam_id,
              print_url,
              showProgressbar: false,
              page: "digitise",
            },
          });
        }
      }
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  // Navigate back to Smart Rx preview without saving: pass state WITHOUT page "digitise" so preview shows Written Rx + Digitise Now (not Digital Rx)
  const handleBackToPreview = useCallback(() => {
    clearSmartRxDentalState();
    navigate("/print-smart-rx", {
      replace: true,
      state: {
        patient_data,
        smartRxFilesData: smartRxFile ?? smartRxFilesData,
        smartRxFile: smartRxFile ?? smartRxFilesData,
        tcm_id,
        pam_id: pam_id ?? patient_data?.pam_id,
        print_url: printUrl ?? state?.print_url,
        print_rx_url: state?.print_rx_url,
        showProgressbar: false,
        // Do NOT pass page: "digitise" — only save flow sets that; back-without-save should show Written Rx + Digitise Now
      },
    });
  }, [navigate, patient_data, smartRxFile, smartRxFilesData, tcm_id, pam_id, printUrl, state?.print_url, state?.print_rx_url, clearSmartRxDentalState]);

  // Resolve display URL: native File/Blob use object URL; API-shaped use smart_prescription_file or fallbacks
  const getDisplayUrl = useCallback((file, index) => {
    if (!file) return null;
    if (file instanceof File || file instanceof Blob) {
      return objectUrlsForFiles[index] || null;
    }
    return file.smart_prescription_file ?? file.fileUrl ?? file.url ?? file.smart_prescription_file_url ?? null;
  }, [objectUrlsForFiles]);

  const fetchImageAsFile = async (url, fileName) => {
    try {
      if (!url) return null;
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], fileName, { type: blob.type });
    } catch (error) {
      console.error("Error fetching image:", error);
      return null;
    }
  };

  const uploadFiles = async () => {
    try {
      setIsLoading(true);
      let response;

      if (shouldUseCustomRxDigitize) {
        const cleanedToken = token?.replace(/['"]+/g, "");
        if (!tcm_id || !patient_data?.patient_unique_id) {
          setIsLoading(false);
          return;
        }
        response = await axios.post(
          `${env.snap_rx_api_url}/api/v1/digitization/custom-rx/digitize-rx`,
          {
            tcm_id,
            patient_unique_id: patient_data.patient_unique_id,
            isDentalReq: true
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cleanedToken}`,
            },
          }
        );
      } else {
        const resolvedAppointmentId =
          pam_id ??
          state?.appointmentId ??
          patient_data?.pam_id ??
          patient_data?.appointmentId;
        const normalizedAppointmentId = String(resolvedAppointmentId ?? "").trim();
        const isValidAppointmentId =
          resolvedAppointmentId !== undefined &&
          resolvedAppointmentId !== null &&
          normalizedAppointmentId !== "" &&
          Number.isFinite(Number(normalizedAppointmentId));

        if (!isValidAppointmentId) {
          setIsLoading(false);
          message.error("Appointment ID is missing. Please reopen the visit and try again.");
          return;
        }

        const formData = new FormData();
        const cleanedToken = token.replace(/['"]+/g, "");

        // Build list of File objects: native File use as-is; Blob wrap as File; API-shaped fetch from URL
        const files = await Promise.all(
          smartRxFile.map(async (file, index) => {
            if (file instanceof File) {
              return file;
            }
            if (file instanceof Blob) {
              return new File([file], file.name || `rx-${index}-${Date.now()}.jpg`, { type: file.type });
            }
            const fileUrl = file.smart_prescription_file ?? file.fileUrl ?? file.url ?? file.smart_prescription_file_url;
            const fileName = file.smart_prescription_filename ?? file.name ?? `rx-${index}-${Date.now()}.jpg`;
            return await fetchImageAsFile(fileUrl, fileName);
          })
        );

        const validCount = files.filter(Boolean).length;
        if (validCount === 0) {
          setIsLoading(false);
          return;
        }

        files.forEach((file) => {
          if (file) {
            formData.append("files", file);
          }
        });

        // Append other required fields
        formData.append("doctorId", tokenData.user_id);
        formData.append("patientId", patient_data.patient_unique_id);
        formData.append("appointmentId", normalizedAppointmentId);
        formData.append("caseId", tcm_id);

        // Append ocrModelSelected only if isCustomSSRX is true
        // if (isCustomSSRX) {
        formData.append("ocrModelSelected", "zyvelor");
        // }

        response = await axios.post(
          `${baseUrlRxDigitise}/api/v1/rxdigitize/rx`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${cleanedToken}`,
            },
          }
        );
      }

      // Update the digitized data (normalize to canonical shape for Rx Pad)
      const responseData = response?.data?.data ?? response?.data;
      const refinedData =
        responseData?.refinedData ??
        responseData?.editedData ??
        responseData?.digitization?.refinedData ??
        responseData?.digitization?.editedData ??
        responseData?.digitization ??
        responseData;
      if (refinedData) {
        const canonical = canonicalFromApi(refinedData);
        
        // Fetch lab results from GET API if not present in digitization response
        const hasLabResultsFromApi = canonical?.labResults && Array.isArray(canonical.labResults) && canonical.labResults.length > 0;
        let labResultsToUse = hasLabResultsFromApi ? canonical.labResults : [];
        if (!hasLabResultsFromApi && patient_data?.patient_unique_id) {
          try {
            const { getTodayLabResults } = await import('../utils/labResultsUtils');
            const fetchedLabResults = await getTodayLabResults(patient_data, false);
            if (fetchedLabResults && fetchedLabResults.length > 0) {
              labResultsToUse = fetchedLabResults;
            }
          } catch (err) {
            console.error('[SmartRx] Failed to fetch lab results from GET API:', err);
          }
        }

        const dentalResults = canonical?.data?.results ?? canonical?.results;
        const hasDentalResults = !!(
          dentalResults &&
          (
            dentalResults?.complaints ||
            dentalResults?.treatmentPlans ||
            dentalResults?.workDone ||
            (Array.isArray(dentalResults?.medications) &&
              dentalResults.medications.length > 0)
          )
        );
        setData((prev) => {
          const base = { ...canonical, labResults: labResultsToUse };
          if (!hasDentalResults) return base;
          return {
            ...base,
            dental: true,
            dynamicFields: [
              {
                dentalData: dentalResults,
              },
            ],
          };
        });
        if (hasDentalResults) {
          dispatch(setDentalData(dentalResults));
        } else {
          dispatch(clearDentalData());
        }
        setIsLoading(false);
        // Persist vitals via listVitals + addVitals so tcv_id/tcbc_id/dev_unique_id are set for save payload
        if (canonical?.vitalsAndBodyComposition) {
          persistSmartRxVitals(canonical.vitalsAndBodyComposition, setData);
        }
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <HeaderSmartRxDigitise
        onSave={handleSave}
        patient_data={patient_data}
        tcm_id={tcm_id}
        onBackToPreview={handleBackToPreview}
        isSmartRx={true}
      />
      <div
        ref={splitRef}
        className={`${
          isMobile ? "p-0" : ""
        } w-100 bg-body wrapper2 prescription-wrapper prescription-wrapper-digitise`}
        style={{ position: "relative" }}
      >
        <Row gutter={0} justify="center" wrap={false} align="stretch">
          <Col
            md={17}
            lg={17}
            xl={12}
            style={{
              flex: `0 0 ${leftWidthPercent}%`,
              maxWidth: `${leftWidthPercent}%`,
              padding: 0,
            }}
          >
            <div className="snap-smart-left-panel">
              <div className="snap-smart-left-content">
                {loading ? (
                  <div className="d-flex flex-column justify-content-center align-items-center h-100 min-h-200">
                    <Spin />
                  </div>
                ) : (
                  smartRxFile?.length > 0 &&
                  smartRxFile?.map((file, idx) => {
                    const src = getDisplayUrl(file, idx);
                    return (
                      <div key={src || idx}>
                        {src && (
                          <img
                            src={src}
                            alt="Smart Rx"
                            className="written-rx-image"
                            width="100%"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Col>
          <Col
            md={17}
            lg={17}
            xl={12}
            style={{
              flex: `0 0 ${100 - leftWidthPercent}%`,
              maxWidth: `${100 - leftWidthPercent}%`,
              padding: 0,
            }}
          >
            <div className="snap-smart-right-panel drx-h-full drx-digitize-container">
              <div className="snap-smart-right-header">
                <div className="snap-smart-header-title">
                  <img src={documentIcon} alt="Rx Pad" className="me-2" />
                  Digitized RX
                </div>
              </div>
              <div className="snap-smart-right-body">
                <DigitisedPrescription
                  data={data}
                  setData={setData}
                  loading={isLoading}
                  showAbsHeaderInsideLoader={true}
                  showHeader={false}
                  showInstructionMessage={false}
                  patient_data={patient_data}
                  vitalsFlow="smart"
                  digitiseSplitLayout
                />
              </div>
            </div>
          </Col>
        </Row>
        <div
          onMouseDown={startResizing}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${leftWidthPercent}%`,
            transform: "translateX(-8px)",
            width: 16,
            cursor: "col-resize",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 56,
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
              border: "1px solid #E2E2EA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 4,
                height: 16,
                background:
                  "repeating-linear-gradient(to bottom, #C9CDD3, #C9CDD3 2px, transparent 2px, transparent 4px)",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default SmartRxDigitise;
