import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Drawer } from "antd";
import axios from "axios";
import moment from "moment";
import dayjs from "dayjs";

import styles from "./PatientSummary.module.scss";
import { viewCaseManager } from "../redux/caseManagerSlice";
import ApiVitals from "../api/services/ApiVitals";
import ApiCaseManager from "../api/services/ApiCaseManager";
import { getGenRx, getAmbientRx, copyVoiceRx, copyAmbientRx } from "../api/services/ApiGenRx";
import { getSnapRxDigitization } from "../pages/snapRx/services/snapRxService";
import { getClinicName, getTokenData, isValidMongoId, trackEvent } from "../utils/utils";
import { setShowSCPopup } from "../redux/ddxSlice";
import { env } from "../EnvironmentConfig";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN, GB_VOICE_RX_NEW_UI } from "../utils/constants";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { shouldUseNewPrescriptionUi } from "../utils/prescriptionRouting";
import ViewLabParam from "./ViewLabParams";
import LabParams from "./LabParams";
import { ASSETS } from "../assets";
const {
  ddx: ddxIcon,
  scBannerStrip: scStrip,
  lab: labIcon,
  vitals: vitalsIcon,
} = ASSETS.images;
const noteIcon = ASSETS.images.vuesax.bulk.note;
const arrowDownIcon = ASSETS.images.arrowDown;

const PatientSummary = ({ patientData, hideSymptomsBanner }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { viewCaseManagerData } = useSelector((state) => state.caseManager);
  const { frequencyList, timingList, profile, userId } = useSelector((state) => state.doctors);
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const { symptomCollector } = useSelector((state) => state.ddx);
  
  const [showDetailedSummary, setShowDetailedSummary] = useState(false);
  const [apiVitals, setApiVitals] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [lastPrescriptionData, setLastPrescriptionData] = useState(null);
  const [viewlabparamsDrawer, setViewlabparamsDrawer] = useState(false);
  const [addlabparamsDrawer, setAddlabparamsDrawer] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [labParamsData, setLabParamsData] = useState([]);
  const [showSymptomsBanner, setShowSymptomsBanner] = useState(true);
  
  const patient_data = patientData || location.state?.patient_data;

  const fetchVitals = useCallback(async () => {
    if (patient_data?.patient_unique_id) {
      try {
        const sendData = {
          patient_unique_id: patient_data.patient_unique_id,
          pam_id: patient_data.pam_id || 0,
          mode: 'ADD',
          pm_pid: patient_data.pm_pid || '',
          pm_id: patient_data.pm_id || 0
        };
        const response = await ApiVitals.getVitals(sendData);
        if (response?.status && response?.data?.length > 0) {
          setApiVitals(response.data);
        } else {
          setApiVitals([]);
        }
      } catch (error) {
        console.error('Error fetching vitals:', error);
        setApiVitals([]);
      }
    }
  }, [patient_data?.patient_unique_id, patient_data?.pam_id, patient_data?.pm_pid, patient_data?.pm_id]);

  const fetchLabResults = useCallback(async () => {
    if (patient_data?.patient_unique_id) {
      try {
        const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
        if (!token) return;
        
        const cleanedToken = token.replace(/['"]+/g, '');
        const baseUrl = env.lab_params_api_url;
        
        const response = await axios.get(`${baseUrl}/api/v1/lab-parameters/results/${patient_data.patient_unique_id}`, {
          headers: {
            'Authorization': `Bearer ${cleanedToken}`,
          },
        });
        
        if (response?.data?.data?.results) {
          setLabResults(response.data.data.results);
          setLabParamsData(response.data.data.results);
        } else {
          setLabResults([]);
          setLabParamsData([]);
        }
      } catch (error) {
        console.error('Error fetching lab results:', error);
        setLabResults([]);
        setLabParamsData([]);
      }
    }
  }, [patient_data?.patient_unique_id]);

  const handleViewLabParamsDrawer = useCallback(() => {
    setViewlabparamsDrawer(!viewlabparamsDrawer);
  }, [viewlabparamsDrawer]);

  const handleAddLabParamsDrawer = useCallback(() => {
    setAddlabparamsDrawer(!addlabparamsDrawer);
  }, [addlabparamsDrawer]);

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(!isBackModalOpen);
  }, [isBackModalOpen]);

  const handleSwitchToAddLabParams = useCallback(() => {
    setViewlabparamsDrawer(false);
    setAddlabparamsDrawer(true);
  }, []);

  const handleLabParamsUpdate = useCallback(() => {
    // Refresh lab params data after save
    fetchLabResults();
  }, [fetchLabResults]);

  // Fetch Snap Rx digitized data - same as Cardiology
  const fetchSnapRxDigitisedData = useCallback(async (tcmId) => {
    if (!tcmId || !patient_data?.patient_unique_id) {
      return null;
    }

    try {
      const response = await getSnapRxDigitization(
        patient_data.patient_unique_id,
        tcmId,
        null
      );
      
      if (response?.digitization) {
        // Same check as Cardiology: isDigitize && isVerified
        if (response?.digitization?.isDigitize && response?.digitization?.isVerified) {
          return response.digitization;
        }
      }

      return null;
    } catch (error) {
      console.error('PatientSummary: Error fetching Snap Rx digitization:', error);
      return null;
    }
  }, [patient_data?.patient_unique_id]);

  // Fetch Smart Rx CVT digitized data - same as Cardiology
  const fetchRxDigitisedData = useCallback(async (caseId) => {
    if (!caseId || !patient_data?.patient_unique_id) {
      return null;
    }

    try {
      const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
      const cleanedToken = token.replace(/['"]+/g, "");
      const baseUrlRxDigitise = env.rx_digitization;

      const response = await axios.get(
        `${baseUrlRxDigitise}/api/v1/rxdigitize/rx/${caseId}`,
        {
          headers: {
            Authorization: `Bearer ${cleanedToken}`,
          },
        }
      );

      if (response?.data?.data?.isDigitize) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error('PatientSummary: Error fetching Smart Rx CVT digitization:', error);
      return null;
    }
  }, [patient_data?.patient_unique_id]);

  // Helper function to extract data from digitized Snap Rx (same structure as Cardiology uses)
  const extractSnapRxData = useCallback((snapRxData) => {
    if (!snapRxData) return null;

    // Extract symptoms: support name, lineItem (old and new structure)
    const symptoms = (snapRxData.symptoms || []).map(item => ({
      name: item.name || item.symptom_name || item.refinedName || item.lineItem || "",
      severity: item.severity || "",
      duration: item.duration || item.since || "",
      notes: item.notes || item.note || ""
    })).filter(item => item.name && item.name.trim() !== "");

    // Extract diagnosis
    const diagnosis = (snapRxData.diagnosis || []).map(item => ({
      name: item.name || item.tds_name || item.lineItem || "",
      since: item.since || "",
      status: item.status || "",
      notes: item.notes || item.note || item.lineItem || ""
    })).filter(item => item.name);

    // Extract examination: support old (examination) and new (examinations) with findings
    const examination = (snapRxData.examinations || snapRxData.examination || []).map(item => ({
      name: item.name || item.examination_name || item.lineItem || "",
      notes: item.notes || item.note || (item.findings ? `Findings: ${item.findings}` : "") || "",
      findings: item.findings || ""
    })).filter(item => item.name && item.name.trim() !== "");

    // Extract medications
    const medications = (snapRxData.medications || []).map(item => ({
              name: item.name || "",
      dosage: item.dosage || item.unitPerDose || "",
              frequency: item.frequency || "",
              schedule: item.schedule || item.when || "",
              duration: item.duration || "",
              quantity: item.quantity || item.qty || "",
              notes: item.notes || item.note || ""
    })).filter(item => item.name);

    // Extract lab investigation: support old (tests) and new (labInvestigation), name/lineItem
    const labInvestigation = (snapRxData.labInvestigation || snapRxData.tests || []).map(item => ({
      name: typeof item === "string" ? item : (item.name || item.refinedName || item.lineItem || ""),
      notes: typeof item === "string" ? "" : (item.notes || item.instruction || "")
    })).filter(item => item.name && item.name.trim() !== "");

    // Extract advice
          let advice = [];
          if (Array.isArray(snapRxData.advice)) {
            advice = snapRxData.advice.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
                return item.advice_name || item.name || item.lineItem || "";
              }
              return String(item || "");
            }).filter(item => item && item.trim() !== "");
          } else if (snapRxData.advice) {
            if (typeof snapRxData.advice === 'object' && snapRxData.advice !== null) {
              const adviceStr = snapRxData.advice.advice_name || snapRxData.advice.name || snapRxData.advice.lineItem || "";
              if (adviceStr) advice = [adviceStr];
            } else {
              advice = [String(snapRxData.advice)];
            }
          }

    // Extract follow-up
    const followUp = snapRxData.followUp || snapRxData.follow_up_date || "";

    return {
      symptoms,
      diagnosis,
      examination,
      medications,
      labInvestigation,
      advice,
      followUp
    };
  }, []);

  // Helper function to extract data from digitized Smart Rx (same structure as Cardiology uses)
  const extractSmartRxData = useCallback((smartRxData) => {
    if (!smartRxData) return null;

    // Extract symptoms: support name, lineItem (old and new structure)
    const symptoms = (smartRxData.symptoms || []).map(item => ({
      name: item.name || item.symptom_name || item.lineItem || "",
      severity: item.severity || "",
      duration: item.duration || item.since || "",
      notes: item.notes || item.note || ""
    })).filter(item => item.name && item.name.trim() !== "");

    // Extract diagnosis
    const diagnosis = (smartRxData.diagnosis || []).map(item => ({
      name: item.name || item.tds_name || item.lineItem || "",
      since: item.since || "",
      status: item.status || "",
      notes: item.notes || item.note || item.lineItem || ""
    })).filter(item => item.name);

    // Extract examination: support old (examination) and new (examinations) with findings
    const examination = (smartRxData.examinations || smartRxData.examination || []).map(item => ({
      name: item.name || item.examination_name || item.lineItem || "",
      notes: item.notes || item.note || (item.findings ? `Findings: ${item.findings}` : "") || "",
      findings: item.findings || ""
    })).filter(item => item.name && item.name.trim() !== "");

    // Extract medications
    const medications = (smartRxData.medications || []).map(item => ({
      name: item.name || "",
      dosage: item.dosage || item.unitPerDose || "",
      frequency: item.frequency || "",
      schedule: item.schedule || item.when || "",
      duration: item.duration || "",
      quantity: item.quantity || item.qty || "",
      notes: item.notes || item.note || ""
    })).filter(item => item.name);

    // Extract lab investigation: support old (tests) and new (labInvestigation), name/lineItem
    const labInvestigation = (smartRxData.labInvestigation || smartRxData.tests || []).map(item => ({
      name: typeof item === "string" ? item : (item.name || item.refinedName || item.lineItem || ""),
      notes: typeof item === "string" ? "" : (item.notes || item.instruction || "")
    })).filter(item => item.name && item.name.trim() !== "");

    // Extract advice
    let advice = [];
    if (Array.isArray(smartRxData.advice)) {
      advice = smartRxData.advice.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          return item.advice_name || item.name || item.lineItem || "";
        }
        return String(item || "");
      }).filter(item => item && item.trim() !== "");
    } else if (smartRxData.advice) {
      if (typeof smartRxData.advice === 'object' && smartRxData.advice !== null) {
        const adviceStr = smartRxData.advice.advice_name || smartRxData.advice.name || smartRxData.advice.lineItem || "";
        if (adviceStr) advice = [adviceStr];
      } else {
        advice = [String(smartRxData.advice)];
      }
    }

    // Extract follow-up
    const followUp = smartRxData.followUp || smartRxData.follow_up_date || "";

          return {
            symptoms,
            diagnosis,
            examination,
      medications,
            labInvestigation,
      advice,
      followUp
    };
  }, []);

  const fetchLastPrescription = useCallback(async () => {
    if (patient_data?.patient_unique_id) {
      try {
        const latestData = {
          patient_unique_id: patient_data.patient_unique_id,
          tcm_id: 0
        };
        const latestResponse = await ApiCaseManager.viewCaseManager(latestData);
        
        if (latestResponse?.status && latestResponse?.data) {
          const latestPrescription = latestResponse.data;
          
          // Check prescription type - same logic as Cardiology
          const smartRxFilename = latestPrescription.smart_prescription_filename;
      const filenameToUse = Array.isArray(smartRxFilename) && smartRxFilename.length > 0 
        ? smartRxFilename[0] 
        : smartRxFilename;
          
          const isSnapRx = filenameToUse && filenameToUse.includes("snap_rx");
          const isSmartRx = filenameToUse && filenameToUse.includes(".jpeg");
          const isPointAndClickRx = latestPrescription.medicine && 
                                    Array.isArray(latestPrescription.medicine) && 
                                    latestPrescription.medicine.length > 0 &&
                                    latestPrescription.medicine.some(med => med.tmm_medicine_name);
          const isVoiceAmbientRx = filenameToUse && isValidMongoId(filenameToUse);

          // Fetch digitization data based on prescription type - same as Cardiology
          let digitizedData = null;
          let isDigitized = false;

          if (isSnapRx) {
            // Fetch Snap Rx digitization - same as Cardiology
            const digitization = await fetchSnapRxDigitisedData(latestPrescription.tcm_id);
            if (digitization && digitization.isDigitize && digitization.isVerified) {
              isDigitized = true;
              digitizedData = digitization.editedData || digitization.refinedData;
            }
          } else if (isSmartRx) {
            // Fetch Smart Rx CVT digitization - same as Cardiology
            const response = await fetchRxDigitisedData(latestPrescription.tcm_id);
            if (response?.isDigitize) {
              isDigitized = true;
              digitizedData = response.editedData;
            }
          } else if (isVoiceAmbientRx) {
            // For Voice/Ambient Rx, fetch data exactly like Cardiology.js does
            try {
              const initialResponse = await getGenRx(filenameToUse);

              if (initialResponse?.success) {
                // Check if conversation exists and has data in the history
                const conversation = initialResponse.data?.history?.[0]?.conversation;
      const hasConversation = conversation && Array.isArray(conversation) && conversation.length > 0;
      
                let response = initialResponse;
      
                // If conversation has doctor and patient conversation, call ambient API
                if (hasConversation) {
        const ambientResponse = await getAmbientRx(filenameToUse);
        if (ambientResponse?.success) {
                    response = ambientResponse;
                  }
                }

                if (response?.success) {
                  let prescriptionData = null;
                  
                  // Extract data exactly like Cardiology.js
                  if (response.data.editedData) {
                    prescriptionData = response.data.editedData;
                  } else if (response.data.digitizeData) {
                    prescriptionData = response.data.digitizeData;
                  } else if (hasConversation) {
                    // Ambient mode - extract from history
                    const latestHistory = response.data?.history?.[response.data.history.length - 1];
          const digitizeObj = latestHistory?.digitize;
                    
          if (digitizeObj && typeof digitizeObj === 'object' && !Array.isArray(digitizeObj)) {
            const numericKeys = Object.keys(digitizeObj).filter(key => /^\d+$/.test(key));
            if (numericKeys.length > 0) {
                        prescriptionData = digitizeObj[numericKeys[0]];
            } else if (digitizeObj.symptoms || digitizeObj.medications || digitizeObj.vitalsAndBodyComposition) {
                        prescriptionData = digitizeObj;
            } else {
                        prescriptionData = digitizeObj;
            }
          } else {
                      prescriptionData = digitizeObj || null;
        }
      } else {
        // Dictate mode - fallback
                    prescriptionData = response.data?.editedData || response.data?.digitizeData || response.data?.refinedData;
      }
      
                  if (prescriptionData) {
                    // Merge with latestPrescription data; include version for Repeat Rx gating
                    const mergedData = {
                      ...latestPrescription,
                      symptoms: prescriptionData.symptoms || latestPrescription.symptoms || [],
                      diagnosis: prescriptionData.diagnosis || latestPrescription.diagnosis || [],
                      examination: prescriptionData.examinations || prescriptionData.examination || latestPrescription.examination || [],
                      medicine: prescriptionData.medications || latestPrescription.medicine || [],
                      advice: prescriptionData.advice || latestPrescription.advice || [],
                      follow_up_date: prescriptionData.followUp || prescriptionData.follow_up_date || latestPrescription.follow_up_date || "",
                      followUp: prescriptionData.followUp || prescriptionData.follow_up_date || latestPrescription.follow_up_date || "",
                      vaccinations: prescriptionData.vaccinations || latestPrescription.vaccinations || [],
                      labInvestigation: prescriptionData.labInvestigation || prescriptionData.tests || latestPrescription.investigation || [],
                      version: response.data?.version,
                      voiceRxMode: hasConversation ? "ambient" : "voice"
                    };

                    digitizedData = mergedData;
                    isDigitized = true;
                  }
                }
      }
    } catch (error) {
              console.error('PatientSummary: fetchLastPrescription - Error fetching Voice/Ambient Rx:', error);
            }
          } else if (isPointAndClickRx) {
            // Point-and-click prescriptions are already digitized
            digitizedData = latestPrescription;
            isDigitized = true;
          } else {
            // Consult prescription (no smart_prescription_filename) - data is in viewCaseManager
            // Check if it has data - if yes, treat it as digitized (like Cardiology.js does)
            const hasConsultData = (latestPrescription.medicine && latestPrescription.medicine.length > 0) ||
                                   (latestPrescription.symptoms && latestPrescription.symptoms.length > 0) ||
                                   (latestPrescription.diagnosis && latestPrescription.diagnosis.length > 0) ||
                                   (latestPrescription.examination && latestPrescription.examination.length > 0);
            
            if (hasConsultData) {
              // For consult prescriptions, use the data directly from viewCaseManager
              digitizedData = latestPrescription;
              isDigitized = true;
            }
          }

          // Merge digitized data with prescription data
          let mergedData = { ...latestPrescription };

          if (isDigitized && digitizedData) {
            if (isSnapRx) {
              // Extract data from Snap Rx digitization
              const extractedData = extractSnapRxData(digitizedData);
              if (extractedData) {
                // Merge advice from both sources (digitized data takes priority, but fallback to original)
                let mergedAdvice = extractedData.advice && extractedData.advice.length > 0 
                  ? extractedData.advice 
                  : (latestPrescription.advice || latestPrescription.visit_advice || []);
                
                // If mergedAdvice is a string, convert to array
                if (typeof mergedAdvice === 'string' && mergedAdvice.trim()) {
                  mergedAdvice = [mergedAdvice];
                } else if (!Array.isArray(mergedAdvice)) {
                  mergedAdvice = [];
                }

                // Merge follow-up from both sources (digitized data takes priority)
                const mergedFollowUp = extractedData.followUp || latestPrescription.follow_up_date || "";

                mergedData = {
                  ...latestPrescription,
                  symptoms: extractedData.symptoms,
                  diagnosis: extractedData.diagnosis,
                  examination: extractedData.examination,
                  medicine: extractedData.medications,
                  labInvestigation: extractedData.labInvestigation,
                  advice: mergedAdvice,
                  follow_up_date: mergedFollowUp
                };
              }
            } else if (isSmartRx) {
              // Extract data from Smart Rx digitization
              const extractedData = extractSmartRxData(digitizedData);
              if (extractedData) {
                // Merge advice from both sources (digitized data takes priority, but fallback to original)
                let mergedAdvice = extractedData.advice && extractedData.advice.length > 0 
                  ? extractedData.advice 
                  : (latestPrescription.advice || latestPrescription.visit_advice || []);
                
                // If mergedAdvice is a string, convert to array
                if (typeof mergedAdvice === 'string' && mergedAdvice.trim()) {
                  mergedAdvice = [mergedAdvice];
                } else if (!Array.isArray(mergedAdvice)) {
                  mergedAdvice = [];
                }

                // Merge follow-up from both sources (digitized data takes priority)
                const mergedFollowUp = extractedData.followUp || latestPrescription.follow_up_date || "";

                mergedData = {
                  ...latestPrescription,
                  symptoms: extractedData.symptoms,
                  diagnosis: extractedData.diagnosis,
                  examination: extractedData.examination,
                  medicine: extractedData.medications,
                  labInvestigation: extractedData.labInvestigation,
                  advice: mergedAdvice,
                  follow_up_date: mergedFollowUp
                };
              }
            } else if (isVoiceAmbientRx || isPointAndClickRx) {
              // Already merged in Voice/Ambient Rx block or is point-and-click
              // Use digitizedData directly as it's already merged with latestPrescription
              mergedData = digitizedData;
            } else {
              // Consult prescription - use data directly from latestPrescription (viewCaseManager)
              // Data is already in the correct format, just use it as-is
              mergedData = digitizedData || latestPrescription;
            }
          }

          // Check if merged data has actual content
          const hasData = (mergedData.medicine && mergedData.medicine.length > 0) ||
                          (mergedData.symptoms && mergedData.symptoms.length > 0) ||
                          (mergedData.diagnosis && mergedData.diagnosis.length > 0) ||
                          (mergedData.examination && mergedData.examination.length > 0);

          // Only set lastPrescriptionData if prescription is digitized AND has data
          if (isDigitized && hasData) {
            setLastPrescriptionData(mergedData);
          } else {
            setLastPrescriptionData(null);
          }
        } else {
          setLastPrescriptionData(null);
        }
      } catch (error) {
        console.error('PatientSummary: Error fetching last prescription:', error);
        setLastPrescriptionData(null);
      }
    }
  }, [patient_data?.patient_unique_id, fetchSnapRxDigitisedData, fetchRxDigitisedData, extractSnapRxData, extractSmartRxData]);

  useEffect(() => {
    if (patient_data?.patient_unique_id) {
      const sendData = {
        patient_unique_id: patient_data.patient_unique_id,
        tcm_id: 0
      };
      dispatch(viewCaseManager(sendData));
      fetchVitals();
      fetchLabResults();
      fetchLastPrescription();
    }
  }, [patient_data, dispatch, fetchVitals, fetchLabResults, fetchLastPrescription]);

  const mergedVitals = useMemo(() => {
    const caseManagerVitals = viewCaseManagerData?.vitals || [];
    const allVitals = [...caseManagerVitals, ...apiVitals];
    const uniqueVitalsByDate = allVitals.reduce((acc, vital) => {
      const date = vital.date || vital.createdAt || vital.created_at;
      const existing = acc[date];
      
      if (!existing) {
        acc[date] = vital;
      } else {
        const existingDate = new Date(existing.createdAt || existing.date);
        const vitalDate = new Date(vital.createdAt || vital.date);
        
        if (vitalDate > existingDate) {
          acc[date] = vital;
        } else if (vitalDate.getTime() === existingDate.getTime()) {
          const existingTcvId = parseInt(existing.tcv_id) || 0;
          const vitalTcvId = parseInt(vital.tcv_id) || 0;
          
          if (vitalTcvId > existingTcvId) {
            acc[date] = vital;
          }
        }
      }
      return acc;
    }, {});
    
    return Object.values(uniqueVitalsByDate)
      .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))
      .slice(0, 2);
  }, [viewCaseManagerData?.vitals, apiVitals]);

  const formattedVitals = useMemo(() => {
    return mergedVitals.map((vital) => {
      const date = moment(vital.date || vital.createdAt || vital.created_at).format("DD MMM'YY");
      const vitalParts = [];
      
      if (vital.pulse || vital.pres) vitalParts.push(`Pulse: ${vital.pulse || vital.pres}/min`);
      if (vital.blood_press) {
        vitalParts.push(`BP: ${vital.blood_press}`);
      } else if (vital.systolic && vital.diastolic) {
        vitalParts.push(`BP: ${vital.systolic}/${vital.diastolic}`);
      }
      if (vital.temp || vital.temperature) vitalParts.push(`Temperature: ${vital.temp || vital.temperature}°F`);
      if (vital.spo2) vitalParts.push(`SpO2: ${vital.spo2}%`);
      if (vital.resp_rate || vital.respRate) vitalParts.push(`RR: ${vital.resp_rate || vital.respRate}/min`);
      if (vital.weight) vitalParts.push(`Weight: ${vital.weight}Kg`);
      if (vital.height) vitalParts.push(`Height: ${vital.height}cms`);
      if (vital.general_rbs) vitalParts.push(`General RBS: ${vital.general_rbs}mg/dl`);
      if (vital.fib4) vitalParts.push(`FIB4: ${vital.fib4}`);
      if (vital.waist_circumference) vitalParts.push(`Waist Circumference: ${vital.waist_circumference}cms`);
      if (vital.ofc) vitalParts.push(`OFC: ${vital.ofc}cms`);
      if (vital.bmi) vitalParts.push(`BMI: ${vital.bmi}kg/m²`);
      if (vital.bmr) vitalParts.push(`BMR: ${vital.bmr}kcals`);
      if (vital.bsa) vitalParts.push(`BSA: ${vital.bsa}m²`);
      
      return {
        date,
        formatted: vitalParts.join(' | ')
      };
    });
  }, [mergedVitals]);

  const formattedLabResults = useMemo(() => {
    if (!labResults || labResults.length === 0) return [];
    
    const sortedResults = [...labResults]
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      .slice(0, 2);
    
    return sortedResults.map((result) => {
      const date = moment(result.date || result.createdAt).format("DD MMM'YY");
      const inputs = result.inputs || [];
      
      const testDetails = [];
      inputs.forEach((input) => {
        if (input.testName && input.testName !== 'Remarks' && input.value && input.value !== '-') {
          const testName = input.testName;
          const value = input.value;
          const unit = input.units || '';
          const formattedValue = unit ? `${value} ${unit}`.trim() : value;
          testDetails.push(`${testName}: ${formattedValue}`);
        }
      });
      
      return {
        date,
        tests: testDetails
      };
    });
  }, [labResults]);

  const medicalHistoryData = useMemo(() => {
    return viewCaseManagerData?.medical_history || [];
  }, [viewCaseManagerData?.medical_history]);

  // Extract chronic conditions (Medical Conditions) from medical history
  const chronicConditions = useMemo(() => {
    if (!medicalHistoryData || medicalHistoryData.length === 0) return [];
    
    return medicalHistoryData
      .filter(item => {
        // Filter for Medical Condition type (tmmhs_id: 2 or type: "Medical Condition")
        const type = item.type || "";
        const tmmhsId = item.tmmhs_id;
        return (tmmhsId === 2 || 
                type.toLowerCase().includes("medical condition") || 
                type.toLowerCase() === "medical_condition") &&
               item.tags && 
               Array.isArray(item.tags) && 
               item.tags.length > 0;
      })
      .flatMap(item => 
        item.tags
          .filter(tag => tag.enable === 'Y' && tag.title && tag.title.trim())
          .map(tag => {
            // Format duration as "X yrs" if available
            let duration = "";
            if (tag.since) {
              // If since already contains "yr" or "year", use as is, otherwise add "yrs"
              duration = tag.since.includes("yr") || tag.since.includes("year") 
                ? tag.since 
                : `${tag.since} yrs`;
            }
            return {
              name: tag.title.trim(),
              duration: duration,
              status: tag.status || "Active"
            };
          })
      );
  }, [medicalHistoryData]);

  // Get today's vitals
  const currentVitals = useMemo(() => {
    const today = moment().startOf('day');
    return mergedVitals
      .filter(vital => {
        const vitalDate = moment(vital.date || vital.createdAt || vital.created_at).startOf('day');
        return vitalDate.isSame(today);
      })
      .map(vital => {
        const vitalParts = [];
        if (vital.pulse || vital.pres) vitalParts.push(`Pulse: ${vital.pulse || vital.pres}/min`);
        if (vital.blood_press) {
          vitalParts.push(`BP: ${vital.blood_press}`);
        } else if (vital.systolic && vital.diastolic) {
          vitalParts.push(`BP: ${vital.systolic}/${vital.diastolic}`);
        }
        if (vital.temp || vital.temperature) vitalParts.push(`Temperature: ${vital.temp || vital.temperature}°F`);
        if (vital.spo2) vitalParts.push(`SpO2: ${vital.spo2}%`);
        if (vital.resp_rate || vital.respRate) vitalParts.push(`RR: ${vital.resp_rate || vital.respRate}/min`);
        if (vital.weight) vitalParts.push(`Weight: ${vital.weight}Kg`);
        if (vital.height) vitalParts.push(`Height: ${vital.height}cms`);
        if (vital.general_rbs) vitalParts.push(`General RBS: ${vital.general_rbs}mg/dl`);
        if (vital.fib4) vitalParts.push(`FIB4: ${vital.fib4}`);
        if (vital.waist_circumference) vitalParts.push(`Waist Circumference: ${vital.waist_circumference}cms`);
        if (vital.ofc) vitalParts.push(`OFC: ${vital.ofc}cms`);
        if (vital.bmi) vitalParts.push(`BMI: ${vital.bmi}kg/m²`);
        if (vital.bmr) vitalParts.push(`BMR: ${vital.bmr}kcals`);
        if (vital.bsa) vitalParts.push(`BSA: ${vital.bsa}m²`);
        return vitalParts;
      })
      .flat();
  }, [mergedVitals]);

  // Helper function to check if value is high or low based on refRange
  const checkValueAbnormal = (value, refRange) => {
    if (!value || !refRange) return null;
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return null;
    
    // Handle refRange as string (e.g., "10-20")
    if (typeof refRange === 'string') {
      const rangeMatch = refRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        if (numericValue > max) return '↑';
        if (numericValue < min) return '↓';
      }
    }
    
    // Handle refRange as object with ranges array
    if (refRange && typeof refRange === 'object' && refRange.ranges && Array.isArray(refRange.ranges)) {
      const range = refRange.ranges[0];
      if (range) {
        const min = parseFloat(range.min);
        const max = parseFloat(range.max);
        if (!isNaN(min) && !isNaN(max)) {
          if (numericValue > max) return '↑';
          if (numericValue < min) return '↓';
        }
      }
    }
    
    return null;
  };

  // Get today's concerning lab results (only high/low values)
  const concerningLabResults = useMemo(() => {
    const today = moment().startOf('day');
    const todayResults = labResults.filter(result => {
      const resultDate = moment(result.date || result.createdAt).startOf('day');
      return resultDate.isSame(today);
    });

    const concerningTests = [];
    todayResults.forEach(result => {
      const inputs = result.inputs || [];
      inputs.forEach((input) => {
        if (input.testName && input.testName !== 'Remarks' && input.value && input.value !== '-') {
          // Check if value is marked as high or low
          let indicator = null;
          
          // Check arrowDirection first
          if (input.arrowDirection === 'up' || input.arrowDirection === '↑') {
            indicator = '↑';
          } else if (input.arrowDirection === 'down' || input.arrowDirection === '↓') {
            indicator = '↓';
          }
          // Check flag
          else if (input.flag === 'H' || input.flag === '↑' || input.isHigh || input.high) {
            indicator = '↑';
          } else if (input.flag === 'L' || input.flag === '↓' || input.isLow || input.low) {
            indicator = '↓';
          }
          // Check against refRange
          else if (input.refRange) {
            indicator = checkValueAbnormal(input.value, input.refRange);
          }
          
          if (indicator) {
            const testName = input.testName;
            const value = input.value;
            const unit = input.units || '';
            const formattedValue = unit ? `${value} ${unit}`.trim() : value;
            concerningTests.push({
              name: testName,
              value: formattedValue,
              indicator
            });
          }
        }
      });
    });
    
    return concerningTests;
  }, [labResults]);

  const lastVisitSummaryData = useMemo(() => {
    let prescriptionData = null;
    
    if (lastPrescriptionData) {
      const isUndigitizedSnapRx = lastPrescriptionData.isUndigitizedSnapRx === true;
      const isUndigitizedSmartRx = lastPrescriptionData.isUndigitizedSmartRx === true;
      
      const hasData = (lastPrescriptionData.medicine && lastPrescriptionData.medicine.length > 0) ||
                      (lastPrescriptionData.symptoms && lastPrescriptionData.symptoms.length > 0) ||
                      (lastPrescriptionData.diagnosis && lastPrescriptionData.diagnosis.length > 0) ||
                      (lastPrescriptionData.examination && lastPrescriptionData.examination.length > 0);
      
      if (hasData && !isUndigitizedSnapRx && !isUndigitizedSmartRx) {
        prescriptionData = lastPrescriptionData;
      }
    }
    
    if (!prescriptionData) {
      return {
        date: "",
        summary: "",
        symptoms: [],
        diagnosis: [],
        examination: [],
        medications: []
      };
    }

    const consultationDate = prescriptionData.consultation_date 
      ? moment(prescriptionData.consultation_date).format("DD MMM YYYY")
      : "";

    // Extract symptoms - handle both Snap Rx lineItem format and regular format
    let symptoms = [];
    if (prescriptionData.symptoms) {
      if (Array.isArray(prescriptionData.symptoms)) {
        symptoms = prescriptionData.symptoms.map((item, idx) => {
          
          // Handle string format
          if (typeof item === 'string') {
            const lineItem = item.trim();
            const match = lineItem.match(/^([^(]+)(?:\((.+)\))?/);
            const name = match ? match[1].trim() : lineItem;
            const details = match && match[2] ? match[2].trim() : "";
            
            let severity = "";
            let duration = "";
            
            if (details) {
              const parts = details.split(',').map(p => p.trim());
              if (parts.length >= 1) severity = parts[0];
              if (parts.length >= 2) duration = parts[1];
            }
            
            const result = {
              name: name,
              severity: severity,
              duration: duration,
              notes: ""
            };
            return result;
          }
          
          // Handle Snap Rx lineItem format: "Headache (mild, 3 days)" or "cold (high , 5days)"
          if (item.lineItem && typeof item.lineItem === 'string') {
            const lineItem = item.lineItem.trim();
            const match = lineItem.match(/^([^(]+)(?:\((.+)\))?/);
            const name = match ? match[1].trim() : lineItem;
            const details = match && match[2] ? match[2].trim() : "";
            
            // Try to parse severity and duration from details
            let severity = item.severity || "";
            let duration = item.duration || "";
            
            if (details) {
              // Split by comma and try to identify severity and duration
              const parts = details.split(',').map(p => p.trim());
              // Usually first part is severity, second is duration
              if (parts.length >= 1 && !severity) severity = parts[0];
              if (parts.length >= 2 && !duration) duration = parts[1];
            }
            
            const result = {
              name: name,
              severity: severity,
              duration: duration,
              notes: item.notes || item.note || ""
            };
            return result;
          }
          
          // Handle regular format - prioritize symptom_name for viewCaseManager data
          // For Voice/Ambient Rx, use name directly (don't parse lineItem if name exists)
          let symptomName = item.symptom_name || item.name || "";
          
          // Only use lineItem if name is not available
          if (!symptomName && item.lineItem) {
            if (typeof item.lineItem === 'string') {
              // Parse lineItem only if name is not available
              const lineItem = item.lineItem.trim();
              const match = lineItem.match(/^([^,]+)/);
              symptomName = match ? match[1].trim() : lineItem;
            } else {
              symptomName = item.lineItem;
            }
          }
          
          // If still no name, fallback to string conversion
          if (!symptomName && typeof item === 'string') {
            symptomName = item;
          }
          
          const result = {
            name: symptomName,
            duration: item.since || item.duration || "",
            severity: item.severity || "",
            notes: item.note || item.notes || ""
          };
          return result;
        }).filter(item => item.name && item.name.trim() !== ""); // Filter out empty names
      } else if (typeof prescriptionData.symptoms === 'string') {
        // Handle single string symptom
        const lineItem = prescriptionData.symptoms.trim();
        const match = lineItem.match(/^([^(]+)(?:\((.+)\))?/);
        const name = match ? match[1].trim() : lineItem;
        const details = match && match[2] ? match[2].trim() : "";
        
        let severity = "";
        let duration = "";
        
        if (details) {
          const parts = details.split(',').map(p => p.trim());
          if (parts.length >= 1) severity = parts[0];
          if (parts.length >= 2) duration = parts[1];
        }
        
        symptoms = [{
          name: name,
          severity: severity,
          duration: duration,
          notes: ""
        }];
      }
    }
    

    // Extract diagnosis
    const diagnosis = (prescriptionData.diagnosis || []).map(item => ({
      name: item.tds_name || item.name || "",
      since: item.since || "",
      status: item.status || "",
      notes: item.note || item.notes || item.lineItem || ""
    }));

    // Extract examination: support old (examination) and new (examinations) structure
    const examination = (prescriptionData.examinations || prescriptionData.examination || []).map(item => ({
      name: item.examination_name || item.name || item.lineItem || "",
      notes: item.note || item.notes || item.findings || "",
      findings: item.findings || ""
    }));

    // Extract medications - handle multiple formats:
    // 1. New structure: prescriptionData.medications (Voice/Ambient/Snap/Smart)
    // 2. Old structure: prescriptionData.medicine (Consult)
    const medicationsSource = prescriptionData.medications || prescriptionData.medicine || [];
    const medications = medicationsSource.map(item => {
      // If item is already an object with full details (Snap/Smart/Voice/Ambient - new structure)
      if (item && typeof item === 'object' && (item.dosage !== undefined || item.frequency !== undefined || item.quantity !== undefined) && !item.tmm_medicine_name) {
        return {
          name: item.name || item.groundedMedicineName || item.lineItem || "",
          dosage: item.dosage || item.unitPerDose || "",
          frequency: item.frequency || "",
          schedule: item.schedule || item.when || "",
          duration: item.duration || "",
          quantity: item.quantity || item.qty || "",
          notes: item.notes || item.note || ""
        };
      }
      
      // Handle Consult prescription format (from viewCaseManager) - point and click prescriptions
      if (item && typeof item === 'object' && item.tmm_medicine_name) {
        const medicineName = item.tmm_medicine_name || "";
        const generic = item.tmm_generic || "";
        const fullName = generic ? `${medicineName} (${generic})` : medicineName;
        
        // Extract dosage
        const unitObj = item?.medicineUnit?.find((x) => x.tmu_id === item.tmm_unit);
        const unitName = unitObj?.tmu_title || "";
        const dosage = item.tmm_dosage ? `${item.tmm_dosage} ${unitName}`.trim() : "";
        
        // Extract frequency
        let frequency = "";
        if (item.tmf_block === 0) {
          // Custom frequency (morning-afternoon-evening-night)
          const freqParts = [];
          if (item.tcm_tmm_freq_morning) freqParts.push(item.tcm_tmm_freq_morning);
          if (item.tcm_tmm_freq_afternoon) freqParts.push(item.tcm_tmm_freq_afternoon);
          if (item.tcm_tmm_freq_evening) freqParts.push(item.tcm_tmm_freq_evening);
          if (item.tcm_tmm_freq_night) freqParts.push(item.tcm_tmm_freq_night);
          if (freqParts.length > 0) {
            frequency = freqParts.join(" - ");
          }
        } else {
          // Standard frequency from frequencyList
          const frequencyObj = frequencyList?.find((x) => x.tmf_id === item.tmm_freq_type);
          frequency = frequencyObj?.tmf_title || "";
        }
        
        // Extract timing/schedule
        const timingObj = timingList?.find((x) => x.tmt_id === item.tmm_time);
        const schedule = timingObj?.tmt_title || "";
        
        // Extract duration
        const duration = item.tmm_days && item.tmm_duration_type 
          ? `${item.tmm_days} ${item.tmm_duration_type}`
          : (item.tmm_duration_type || "");
        
        // Extract quantity
        const quantity = item.display_qty || item.tmm_qty || "";
        
        // Extract notes
        const notes = item.tmm_remarks || item.notes || item.note || "";
        
        return {
          name: fullName,
          dosage: dosage,
          frequency: frequency,
          schedule: schedule,
          duration: duration,
          quantity: quantity,
          notes: notes
        };
      }
      
      // If item is a string (legacy format), convert to object with just name
      if (typeof item === 'string') {
        return {
          name: item,
          dosage: "",
          frequency: "",
          schedule: "",
          duration: "",
          quantity: "",
          notes: ""
        };
      }
      
      // Otherwise, it's an object from regular prescription (Voice/Ambient Rx format)
      const medicineName = item.medicine_name || item.name || item.groundedMedicineName || item.lineItem || "";
      const dosage = item.strength && item.unit ? `${item.strength} ${item.unit}`.trim() : (item.dosage || "");
      return {
        name: medicineName,
        dosage: dosage,
        frequency: item.frequency || "",
        schedule: item.schedule || item.when || "",
        duration: item.duration || "",
        quantity: item.quantity || item.qty || "",
        notes: item.notes || item.note || ""
      };
    }).filter(item => item && item.name); // Remove items without name

    // Extract follow-up - check multiple possible fields
    let followUp = "";
    const followUpValue = prescriptionData.followUp || prescriptionData.follow_up_date || "";
    if (followUpValue) {
      // If it's already a formatted string (like "After 2 days"), use it as is
      if (typeof followUpValue === 'string' && !moment(followUpValue, moment.ISO_8601, true).isValid() && !moment(followUpValue).isValid()) {
        followUp = followUpValue;
      } else {
        // Try to format as date
        const followUpDate = moment(followUpValue);
        if (followUpDate.isValid()) {
          followUp = followUpDate.format("DD MMM YYYY");
        } else {
          followUp = String(followUpValue);
        }
      }
    }

    // Extract vaccinations - format for Snap Rx
    const vaccinations = (prescriptionData.vaccinations || []).map(item => {
      const vaccineName = item.vaccine_name || item.name || "";
      const schedule = item.schedule || "";
      const notes = item.notes || "";
      const date = item.date ? moment(item.date).format("DD MMM YYYY") : "";
      
      const parts = [];
      if (vaccineName) parts.push(vaccineName);
      if (schedule) parts.push(schedule);
      if (notes) parts.push(notes);
      if (date) parts.push(`(${date})`);
      
      return parts.length > 0 ? parts.join(", ") : "";
    }).filter(v => v); // Remove empty strings

    // Extract advice - handle both array and string formats, keep as array for list view
    let advice = [];
    if (Array.isArray(prescriptionData.advice)) {
      // Handle both string and object formats
      advice = prescriptionData.advice.map(item => {
        if (typeof item === 'string') {
          return item;
        } else if (typeof item === 'object' && item !== null) {
          return item.advice_name || item.name || item.lineItem || "";
        }
        return String(item || "");
      }).filter(item => item && item.trim() !== "");
      
      // If advice array is empty, check visit_advice as fallback
      if (advice.length === 0 && prescriptionData.visit_advice) {
        if (typeof prescriptionData.visit_advice === 'string' && prescriptionData.visit_advice.trim()) {
          advice = [prescriptionData.visit_advice];
        } else if (Array.isArray(prescriptionData.visit_advice) && prescriptionData.visit_advice.length > 0) {
          advice = prescriptionData.visit_advice.map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null) {
              return item.advice_name || item.name || item.lineItem || "";
            }
            return String(item || "");
          }).filter(item => item && item.trim() !== "");
        }
      }
    } else {
      // Check multiple possible fields for advice
      const adviceStr = prescriptionData.advice || prescriptionData.visit_advice || "";
      if (adviceStr) {
        if (typeof adviceStr === 'object' && adviceStr !== null) {
          const adviceText = adviceStr.advice_name || adviceStr.name || adviceStr.lineItem || "";
          if (adviceText) advice = [adviceText];
        } else {
          advice = [String(adviceStr)];
        }
      }
    }

    // Extract lab investigation/tests: support old (tests/investigation) and new (labInvestigation), name/lineItem/instruction
    const labInvestigation = (prescriptionData.labInvestigation || prescriptionData.tests || prescriptionData.investigation || []).map(item => {
      const name = typeof item === 'string' ? item : (item.name || item.investigation_name || item.refinedName || item.lineItem || "");
      const notes = typeof item === 'string' ? "" : (item.notes || item.instruction || "");
      return { name, notes };
    }).filter(item => item.name && item.name.trim() !== "");

    // Extract dynamic fields
    const dynamicFields = (prescriptionData.dynamicFields || []).map(item => ({
      title: item.title || "",
      notes: item.notes || ""
    })).filter(item => item.title);

    const result = {
      date: consultationDate,
      symptoms,
      diagnosis,
      examination,
      medications,
      followUp,
      vaccinations,
      advice,
      labInvestigation,
      dynamicFields
    };
    
    return result;
  }, [lastPrescriptionData, frequencyList, timingList]);

  const summaryData = {
    lastVisitSummary: lastVisitSummaryData,
    vitals: formattedVitals,
    labResults: formattedLabResults,
    medicalHistory: medicalHistoryData,
    chronicConditions,
    currentVitals,
    concerningLabResults
  };

  // Check if there's any data to display
  const hasAnyData = useMemo(() => {
    // Check last visit - must have actual data, not just a date
    const hasLastVisit = lastVisitSummaryData && (
      (lastVisitSummaryData.symptoms && lastVisitSummaryData.symptoms.length > 0) ||
      (lastVisitSummaryData.diagnosis && lastVisitSummaryData.diagnosis.length > 0) ||
      (lastVisitSummaryData.examination && lastVisitSummaryData.examination.length > 0) ||
      (lastVisitSummaryData.medications && lastVisitSummaryData.medications.length > 0) ||
      (lastVisitSummaryData.followUp && lastVisitSummaryData.followUp.trim() !== "") ||
      (lastVisitSummaryData.vaccinations && lastVisitSummaryData.vaccinations.length > 0) ||
      (Array.isArray(lastVisitSummaryData.advice) && lastVisitSummaryData.advice.length > 0) ||
      (lastVisitSummaryData.labInvestigation && lastVisitSummaryData.labInvestigation.length > 0)
    );
    
    const hasChronicConditions = chronicConditions && chronicConditions.length > 0;
    const hasCurrentVitals = currentVitals && currentVitals.length > 0;
    const hasConcerningLabs = concerningLabResults && concerningLabResults.length > 0;
    const hasVitals = formattedVitals && formattedVitals.length > 0;
    const hasLabResults = formattedLabResults && formattedLabResults.length > 0;
    const hasMedicalHistory = Array.isArray(medicalHistoryData) && medicalHistoryData.length > 0 && 
      medicalHistoryData.some(e => (e.no_know_history || e.tags?.length > 0));
    
    const result = hasLastVisit || hasChronicConditions || hasCurrentVitals || hasConcerningLabs || hasVitals || hasLabResults || hasMedicalHistory;
    
    return result;
  }, [lastVisitSummaryData, chronicConditions, currentVitals, concerningLabResults, formattedVitals, formattedLabResults, medicalHistoryData]);

  const toggleDetailedSummary = () => {
    setShowDetailedSummary(!showDetailedSummary);
  };

  // Don't render if there's no data
  if (!hasAnyData) {
    return null;
  }

  return (
    <div className={styles.patientSummaryContainer}>
      <div className={styles.allModulesWrapper}>
        {symptomCollector && (symptomCollector?.symptoms?.length > 0 || symptomCollector?.medicalHistory?.length > 0) && showSymptomsBanner && !hideSymptomsBanner && (
          <div
            className="d-flex justify-content-between align-items-center"
            style={{
              border: "1px solid #E2E2EA",
              borderRadius: 16,
              padding: "8px 12px 8px 18px",
              marginBottom: 12,
              background: "#A461D81A",
            }}
          >
            <div className="d-flex w-100">
              <div style={{ fontSize: 16 }}>
                <div className="d-flex align-items-center">
                  <img
                    src={scStrip}
                    alt="scStrip"
                    width={45}
                    height={45}
                    className="me-2"
                  />
                  <span>
                    Hey! You've received <b style={{ fontWeight: 600 }}>symptoms</b>{" "}
                    and <b style={{ fontWeight: 600 }}>medical history</b> details
                    from the patient.{" "}
                    <span
                      className="theme-color cursor-pointer"
                      style={{ textDecoration: "underline", marginLeft: 5 }}
                      onClick={() => {
                        dispatch(setShowSCPopup(true));
                        trackEvent("SC_Doctor_ViewedSummary", {
                          clinic_name: getClinicName(profile?.hospital_data),
                          appointment_id: patient_data?.pam_id || 0,
                          hospital_id: getTokenData()?.clinic_id,
                          timestamp: dayjs().format("YYYY-MM-DD HH:mm:ss"),
                          doctor_id: userId,
                          doctor_name: profile?.um_name,
                          doctor_specialty: profile?.dp_name,
                        });
                      }}
                    >
                      View now
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <Button
              type="text"
              className="btn btn-delete-prescription focus-none h-100"
              style={{ padding: 5 }}
              onClick={() => setShowSymptomsBanner(false)}
            >
              <i className="icon-Cross fs-3" />
            </Button>
          </div>
        )}
        <div className={styles.patientSummaryCard}>
          <div className={styles.cardHeader}>
            <img src={ddxIcon} alt="Patient Summary" className={styles.headerIcon} />
            <div className={styles.cardHeaderWithAction}>
              <h3 className={styles.cardTitle}>Patient's Summary</h3>
              {(() => {
                // Show Repeat Rx only for Voice, Ambient, Point-and-click, or Consult prescriptions
                // NOT for Snap Rx or Smart Rx
                if (!lastPrescriptionData || !lastPrescriptionData.consultation_date) {
                  return null;
                }
                
                const smartRxFilename = lastPrescriptionData.smart_prescription_filename;
                const filenameToUse = Array.isArray(smartRxFilename) && smartRxFilename.length > 0 
                  ? smartRxFilename[0] 
                  : smartRxFilename;
                
                const isSnapRx = filenameToUse && filenameToUse.includes("snap_rx");
                const isSmartRx = filenameToUse && filenameToUse.includes(".jpeg");
                
                // Only show if NOT Snap Rx and NOT Smart Rx
                if (isSnapRx || isSmartRx) {
                  return null;
                }
                const normalizedVersion = lastPrescriptionData?.version?.trim?.()?.toLowerCase();
                const isRepeatableVoiceVersion = normalizedVersion === "v2" || normalizedVersion === "v3";
                if (!isRepeatableVoiceVersion) {
                  return null;
                }
                
                return (
                <span 
                  className={styles.repeatRxLink} 
                  onClick={async () => {
                    window.Moengage?.track_event("repeat_rx_click", {
                      "doctor_id": viewCaseManagerData?.doctor_data?.um_id,
                      "patient_id": patient_data?.patient_unique_id || 0,
                      "rx_date": lastPrescriptionData.consultation_date
                    });
                    const rxId = filenameToUse;
                    const newAppointmentId = viewCaseManagerData?.tcm_id ?? 0;
                    if (!rxId || !patient_data) return;
                    try {
                      let copiedRxId = rxId;
                      if (normalizedVersion === "v2") {
                        const copyRx = lastPrescriptionData?.voiceRxMode === "ambient" ? copyAmbientRx : copyVoiceRx;
                        const copyResponse = await copyRx(rxId, newAppointmentId);
                        if (!copyResponse?.success) {
                          console.error("[PatientSummary Repeat Rx] Copy API failed", copyResponse?.error);
                          return;
                        }
                        copiedRxId = copyResponse?.data?.data?._id || copyResponse?.data?._id || copyResponse?._id || rxId;
                      }
                      const repeatCaseManagerData = {
                        ...lastPrescriptionData,
                        smart_prescription_filename: normalizedVersion === "v3" ? "" : copiedRxId,
                        tcm_id: 0,
                        consultation_date: moment().format('YYYY-MM-DD HH:mm:ss')
                      };
                      navigate("/prescription", {
                        state: {
                          patient_data: patient_data,
                          send_path: "voice_rx_consult",
                          caseManagerData: repeatCaseManagerData,
                          ...((normalizedVersion === "v3" || shouldUseNewPrescriptionUi(repeatCaseManagerData, isVoiceRxNewFromGB)) ? { isVoiceRxNewUiFlow: true } : {})
                        }
                      });
                    } catch (error) {
                      console.error("[PatientSummary Repeat Rx] Error", error);
                    }
                  }}
                >
                  <i className="icon-reload"></i>
                  Repeat Rx ({moment(lastPrescriptionData.consultation_date).format("DD MMM'YY")})
                </span>
                );
              })()}
            </div>
          </div>
          <div className={styles.headerSeparator}></div>

          <div className={styles.cardContent}>
            {/* Check if there's last visit summary data */}
            {(() => {
              const hasLastVisitSummary = summaryData.lastVisitSummary && summaryData.lastVisitSummary.date && 
             ((summaryData.lastVisitSummary.symptoms && summaryData.lastVisitSummary.symptoms.length > 0) ||
              (summaryData.lastVisitSummary.diagnosis && summaryData.lastVisitSummary.diagnosis.length > 0) ||
              (summaryData.lastVisitSummary.medications && summaryData.lastVisitSummary.medications.length > 0) ||
                 (summaryData.lastVisitSummary.labInvestigation && summaryData.lastVisitSummary.labInvestigation.length > 0));
              
              // If there's last visit summary, show it
              if (hasLastVisitSummary) {
                return (
                  <>
                    {/* Last Visit Summary */}
              <div className={styles.summarySection}>
                <div className={styles.sectionContentInline}>
                  <span className={styles.sectionTitleInline}>Last Visit ({summaryData.lastVisitSummary.date}):</span>
                  {summaryData.lastVisitSummary.symptoms && summaryData.lastVisitSummary.symptoms.length > 0 && (
                    <>
                      <span className={styles.inlineItem}>
                        <strong>Symptoms:</strong> {summaryData.lastVisitSummary.symptoms.map((s, idx) => {
                          const parts = [];
                          if (s.duration) parts.push(`Duration: ${s.duration}`);
                          if (s.severity) parts.push(`Severity: ${s.severity}`);
                          return s.name + (parts.length > 0 ? ` (${parts.join(' | ')})` : '');
                        }).join(', ')}
                      </span>
                      {(summaryData.lastVisitSummary.diagnosis?.length > 0 || summaryData.lastVisitSummary.medications?.length > 0 || summaryData.lastVisitSummary.labInvestigation?.length > 0) && 
                       <span className={styles.separator}> | </span>}
                    </>
                  )}
                  {summaryData.lastVisitSummary.diagnosis && summaryData.lastVisitSummary.diagnosis.length > 0 && (
                    <>
                      <span className={styles.inlineItem}>
                        <strong>Diagnosis:</strong> {summaryData.lastVisitSummary.diagnosis.map(d => d.name).join(', ')}
                      </span>
                      {(summaryData.lastVisitSummary.medications?.length > 0 || summaryData.lastVisitSummary.labInvestigation?.length > 0) && 
                       <span className={styles.separator}> | </span>}
                    </>
                  )}
                  {summaryData.lastVisitSummary.medications && summaryData.lastVisitSummary.medications.length > 0 && (
                    <>
                      <span className={styles.inlineItem}>
                        <strong>Medications:</strong> {summaryData.lastVisitSummary.medications.map(m => typeof m === 'string' ? m : m.name).join(', ')}
                      </span>
                      {summaryData.lastVisitSummary.labInvestigation?.length > 0 && 
                       <span className={styles.separator}> | </span>}
                    </>
                  )}
                  {summaryData.lastVisitSummary.labInvestigation && summaryData.lastVisitSummary.labInvestigation.length > 0 && (
                    <span className={styles.inlineItem}>
                      <strong>Lab Tests:</strong> {summaryData.lastVisitSummary.labInvestigation.map(l => l.name).join(', ')}
                    </span>
                  )}
                </div>
              </div>

            {/* Chronic Conditions */}
            {summaryData.chronicConditions && summaryData.chronicConditions.length > 0 && (
              <div className={styles.summarySection}>
                <div className={styles.sectionContentInline}>
                  <span className={styles.sectionTitleInline}>Chronic Conditions:</span>
                  {summaryData.chronicConditions.map((condition, idx) => (
                    <span key={idx}>
                      {idx > 0 && <span className={styles.separator}> | </span>}
                      <span className={styles.inlineItem}>
                        {condition.name}
                        {condition.duration && condition.status && ` (${condition.duration}, ${condition.status})`}
                        {condition.duration && !condition.status && ` (${condition.duration})`}
                        {!condition.duration && condition.status && ` (${condition.status})`}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Current Vitals */}
            {summaryData.currentVitals && summaryData.currentVitals.length > 0 && (
              <div className={styles.summarySection}>
                <div className={styles.sectionContentInline}>
                  <span className={styles.sectionTitleInline}>Current Vitals:</span>
                  {summaryData.currentVitals.map((vital, idx) => (
                    <span key={idx}>
                      {idx > 0 && <span className={styles.separator}> | </span>}
                      <span className={styles.inlineItem}>{vital}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Concerning Lab Results */}
            {summaryData.concerningLabResults && summaryData.concerningLabResults.length > 0 && (
              <div className={styles.summarySection}>
                <div className={styles.sectionContentInline}>
                  <span className={styles.sectionTitleInline}>Concerning Lab Results ({moment().format("DD MMM'YY")}):</span>
                  {summaryData.concerningLabResults.map((result, idx) => (
                    <span key={idx}>
                      {idx > 0 && <span className={styles.separator}> | </span>}
                      <span className={styles.inlineItem}>
                        <strong>{result.name}:</strong> {result.value} {result.indicator}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
                  </>
                );
              } else {
                // No last visit summary - show vitals, lab results, and medical history directly
                return (
                  <>
                    {/* Vitals - Show directly when no last visit summary */}
                    {summaryData.vitals && summaryData.vitals.length > 0 && (
                      <div className={styles.summarySection}>
                        <div className={styles.sectionContentInline}>
                          <span className={styles.sectionTitleInline}>Vitals:</span>
                          {summaryData.vitals.map((vital, idx) => (
                            <span key={idx}>
                              {idx > 0 && <span className={styles.separator}> | </span>}
                              <span className={styles.inlineItem}>
                                <strong>{vital.date}:</strong> {vital.formatted}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lab Results - Show directly when no last visit summary */}
                    {summaryData.labResults && summaryData.labResults.length > 0 && (
                      <div className={styles.summarySection}>
                        <div className={styles.sectionContentInline}>
                          <span className={styles.sectionTitleInline}>Lab Results:</span>
                          {summaryData.labResults.map((lab, idx) => (
                            <span key={idx}>
                              {idx > 0 && <span className={styles.separator}> | </span>}
                              <span className={styles.inlineItem}>
                                <strong>{lab.date}:</strong> {lab.tests && lab.tests.length > 0 ? (
                                  <span>({lab.tests.join(' | ')})</span>
                                ) : (
                                  <span>No test results</span>
                                )}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medical History - Show directly when no last visit summary */}
                    {Array.isArray(summaryData.medicalHistory) && summaryData.medicalHistory.length > 0 && 
                     summaryData.medicalHistory.some(e => (e.no_know_history || e.tags?.length > 0)) && (
                      <div className={styles.summarySection}>
                        <div className={styles.sectionContentInline}>
                          <span className={styles.sectionTitleInline}>Medical History:</span>
                          {summaryData.medicalHistory.map((e, i) => {
                            if (!(e.no_know_history || e.tags?.length > 0)) {
                              return null;
                            }
                            
                            const historyItems = [];
                            if (!e.no_know_history && e.tags) {
                              e.tags.filter(x => x.enable === 'Y').forEach((e1) => {
                                historyItems.push(e1.title);
                              });
                            }
                            
                            return (
                              <span key={i}>
                                {i > 0 && <span className={styles.separator}> | </span>}
                                <span className={styles.inlineItem}>
                                  {e.title}: {e.no_know_history ? 'No known history' : historyItems.join(', ')}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Chronic Conditions - Show even when no last visit summary */}
                    {summaryData.chronicConditions && summaryData.chronicConditions.length > 0 && (
                      <div className={styles.summarySection}>
                        <div className={styles.sectionContentInline}>
                          <span className={styles.sectionTitleInline}>Chronic Conditions:</span>
                          {summaryData.chronicConditions.map((condition, idx) => (
                            <span key={idx}>
                              {idx > 0 && <span className={styles.separator}> | </span>}
                              <span className={styles.inlineItem}>
                                {condition.name}
                                {condition.duration && condition.status && ` (${condition.duration}, ${condition.status})`}
                                {condition.duration && !condition.status && ` (${condition.duration})`}
                                {!condition.duration && condition.status && ` (${condition.status})`}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Current Vitals - Show even when no last visit summary */}
                    {summaryData.currentVitals && summaryData.currentVitals.length > 0 && (
                      <div className={styles.summarySection}>
                        <div className={styles.sectionContentInline}>
                          <span className={styles.sectionTitleInline}>Current Vitals:</span>
                          {summaryData.currentVitals.map((vital, idx) => (
                            <span key={idx}>
                              {idx > 0 && <span className={styles.separator}> | </span>}
                              <span className={styles.inlineItem}>{vital}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Concerning Lab Results - Show even when no last visit summary */}
                    {summaryData.concerningLabResults && summaryData.concerningLabResults.length > 0 && (
                      <div className={styles.summarySection}>
                        <div className={styles.sectionContentInline}>
                          <span className={styles.sectionTitleInline}>Concerning Lab Results ({moment().format("DD MMM'YY")}):</span>
                          {summaryData.concerningLabResults.map((result, idx) => (
                            <span key={idx}>
                              {idx > 0 && <span className={styles.separator}> | </span>}
                              <span className={styles.inlineItem}>
                                <strong>{result.name}:</strong> {result.value} {result.indicator}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              }
            })()}
          </div>
        </div>

        {!showDetailedSummary && summaryData.lastVisitSummary && summaryData.lastVisitSummary.date && 
         ((summaryData.lastVisitSummary.symptoms && summaryData.lastVisitSummary.symptoms.length > 0) ||
          (summaryData.lastVisitSummary.diagnosis && summaryData.lastVisitSummary.diagnosis.length > 0) ||
          (summaryData.lastVisitSummary.examination && summaryData.lastVisitSummary.examination.length > 0) ||
          (summaryData.lastVisitSummary.medications && summaryData.lastVisitSummary.medications.length > 0) ||
          (summaryData.lastVisitSummary.followUp && summaryData.lastVisitSummary.followUp.trim() !== "") ||
          (summaryData.lastVisitSummary.vaccinations && summaryData.lastVisitSummary.vaccinations.length > 0) ||
          (Array.isArray(summaryData.lastVisitSummary.advice) && summaryData.lastVisitSummary.advice.length > 0) ||
          (summaryData.lastVisitSummary.labInvestigation && summaryData.lastVisitSummary.labInvestigation.length > 0)) && (
          <div className={styles.viewDetailedButton} onClick={toggleDetailedSummary}>
            <span>View Detailed Summary</span>
            <img 
              src={arrowDownIcon} 
              alt="Arrow Down" 
              className={styles.arrowIcon}
            />
          </div>
        )}

        {showDetailedSummary && summaryData.lastVisitSummary && summaryData.lastVisitSummary.date && 
         ((summaryData.lastVisitSummary.symptoms && summaryData.lastVisitSummary.symptoms.length > 0) ||
          (summaryData.lastVisitSummary.diagnosis && summaryData.lastVisitSummary.diagnosis.length > 0) ||
          (summaryData.lastVisitSummary.examination && summaryData.lastVisitSummary.examination.length > 0) ||
          (summaryData.lastVisitSummary.medications && summaryData.lastVisitSummary.medications.length > 0) ||
          (summaryData.lastVisitSummary.followUp && summaryData.lastVisitSummary.followUp.trim() !== "") ||
          (summaryData.lastVisitSummary.vaccinations && summaryData.lastVisitSummary.vaccinations.length > 0) ||
          (Array.isArray(summaryData.lastVisitSummary.advice) && summaryData.lastVisitSummary.advice.length > 0) ||
          (summaryData.lastVisitSummary.labInvestigation && summaryData.lastVisitSummary.labInvestigation.length > 0)) && (
          <div className={styles.detailedSummaryContainer}>
            <div className={styles.detailedCard}>
              <div className={styles.cardHeader}>
                <img src={noteIcon} alt="Last Visit Summary" className={styles.headerIcon} />
                <h3 className={styles.cardTitle}>Last Visit Summary {summaryData.lastVisitSummary && summaryData.lastVisitSummary.date && `(${summaryData.lastVisitSummary.date})`}</h3>
              </div>
              <div className={styles.headerSeparator}></div>
              <div className={styles.detailedCardContent}>
                {summaryData.lastVisitSummary && summaryData.lastVisitSummary.symptoms && summaryData.lastVisitSummary.symptoms.length > 0 && (
                  <div className={styles.detailedSection}>
                    <strong>Key Symptoms:</strong>
                    <ul className={styles.lastVisitList}>
                      {summaryData.lastVisitSummary.symptoms.map((symptom, idx) => {
                        const parts = [];
                        if (symptom.duration) parts.push(`Duration: ${symptom.duration}`);
                        if (symptom.severity) parts.push(`Severity: ${symptom.severity}`);
                        if (symptom.notes) parts.push(`Notes: ${symptom.notes}`);
                        return (
                          <li key={idx} className={styles.lastVisitListItem}>
                            {symptom.name}{parts.length > 0 && ` (${parts.join(' | ')})`}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {summaryData.lastVisitSummary && summaryData.lastVisitSummary.diagnosis && summaryData.lastVisitSummary.diagnosis.length > 0 && (
                  <div className={styles.detailedSection}>
                    <strong>Diagnosis:</strong>
                    <ul className={styles.lastVisitList}>
                      {summaryData.lastVisitSummary.diagnosis.map((diag, idx) => {
                        const parts = [];
                        if (diag.since) parts.push(`Since: ${diag.since}`);
                        if (diag.status) parts.push(`Status: ${diag.status}`);
                        if (diag.notes) parts.push(`Notes: ${diag.notes}`);
                        return (
                          <li key={idx} className={styles.lastVisitListItem}>
                            {diag.name}{parts.length > 0 && ` (${parts.join(' | ')})`}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {summaryData.lastVisitSummary && summaryData.lastVisitSummary.examination && summaryData.lastVisitSummary.examination.length > 0 && (
                  <div className={styles.detailedSection}>
                    <strong>Examination:</strong>
                    <ul className={styles.lastVisitList}>
                      {summaryData.lastVisitSummary.examination.map((exam, idx) => (
                        <li key={idx} className={styles.lastVisitListItem}>
                          {exam.name}{exam.notes && ` (Notes: ${exam.notes})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {summaryData.lastVisitSummary && summaryData.lastVisitSummary.medications && summaryData.lastVisitSummary.medications.length > 0 && (
                  <div className={styles.detailedSection}>
                    <strong>Medications:</strong>
                    <ul className={styles.lastVisitList}>
                      {summaryData.lastVisitSummary.medications.map((medication, idx) => {
                        // Handle both string and object formats
                        if (typeof medication === 'string') {
                          return (
                            <li key={idx} className={styles.lastVisitListItem}>
                              {medication}
                            </li>
                          );
                        }
                        // Object format - display with all details in brackets
                        const parts = [];
                        if (medication.dosage) parts.push(`Dosage: ${medication.dosage}`);
                        if (medication.frequency) parts.push(`Frequency: ${medication.frequency}`);
                        if (medication.schedule) parts.push(`When: ${medication.schedule}`);
                        if (medication.duration) parts.push(`Duration: ${medication.duration}`);
                        if (medication.quantity) parts.push(`Quantity: ${medication.quantity}`);
                        if (medication.notes) parts.push(`Notes: ${medication.notes}`);
                        return (
                          <li key={idx} className={styles.lastVisitListItem}>
                            {medication.name}{parts.length > 0 && ` (${parts.join(' | ')})`}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {summaryData.lastVisitSummary && summaryData.lastVisitSummary.followUp && summaryData.lastVisitSummary.followUp.trim() !== "" && (
                  <div className={styles.detailedSection}>
                    <strong>Follow-up:</strong>
                    <ul className={styles.lastVisitList}>
                      <li className={styles.lastVisitListItem}>
                        {summaryData.lastVisitSummary.followUp}
                      </li>
                    </ul>
                  </div>
                )}
                {summaryData.lastVisitSummary && summaryData.lastVisitSummary.vaccinations && summaryData.lastVisitSummary.vaccinations.length > 0 && (
                  <div className={styles.detailedSection}>
                    <strong>Vaccination:</strong>
                    <ul className={styles.lastVisitList}>
                      {summaryData.lastVisitSummary.vaccinations.map((vaccine, idx) => {
                        const vaccineText = typeof vaccine === 'string' 
                          ? vaccine 
                          : [vaccine.name, vaccine.schedule, vaccine.notes].filter(Boolean).join(", ");
                        return (
                          <li key={idx} className={styles.lastVisitListItem}>
                            {vaccineText}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {summaryData.lastVisitSummary && Array.isArray(summaryData.lastVisitSummary.advice) && summaryData.lastVisitSummary.advice.length > 0 && (
                  <div className={styles.detailedSection}>
                    <strong>Advice:</strong>
                    <ul className={styles.lastVisitList}>
                      {summaryData.lastVisitSummary.advice.map((adviceItem, idx) => {
                        // Handle both string and object formats
                        const adviceText = typeof adviceItem === 'string' 
                          ? adviceItem 
                          : (typeof adviceItem === 'object' && adviceItem !== null
                            ? (adviceItem.advice_name || adviceItem.name || adviceItem.lineItem || "")
                            : String(adviceItem || ""));
                        return (
                          <li key={idx} className={styles.lastVisitListItem}>
                            {adviceText}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {summaryData.lastVisitSummary && summaryData.lastVisitSummary.labInvestigation && summaryData.lastVisitSummary.labInvestigation.length > 0 && (
                  <div className={styles.detailedSection}>
                    <strong>Lab Investigation:</strong>
                    <ul className={styles.lastVisitList}>
                      {summaryData.lastVisitSummary.labInvestigation.map((lab, idx) => (
                        <li key={idx} className={styles.lastVisitListItem}>
                          {lab.name}{(lab.instruction || lab.lineItem) && ` (${lab.instruction || lab.lineItem})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {summaryData.lastVisitSummary && summaryData.lastVisitSummary.dynamicFields && summaryData.lastVisitSummary.dynamicFields.length > 0 && (
                  <div className={styles.detailedSection}>
                    {summaryData.lastVisitSummary.dynamicFields.map((field, idx) => (
                      <div key={idx} className={styles.detailedSection}>
                        <strong>{field.title}:</strong>
                        <ul className={styles.lastVisitList}>
                          <li className={styles.lastVisitListItem}>
                            {field.notes}
                          </li>
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {summaryData.vitals.length > 0 && (
              <div className={styles.detailedCard}>
                <div className={styles.cardHeader}>
                  <img src={vitalsIcon} alt="Vitals" className={styles.headerIcon} />
                  <h3 className={styles.cardTitle}>Vitals</h3>
                </div>
                <div className={styles.headerSeparator}></div>
                <div className={styles.detailedCardContent}>
                  <ul className={styles.vitalsList}>
                    {summaryData.vitals.map((vital, idx) => (
                      <li key={idx} className={styles.vitalRow}>
                        <strong>{vital.date}:</strong> {vital.formatted}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {summaryData.labResults.length > 0 && (
              <div className={styles.detailedCard}>
                <div className={styles.cardHeader}>
                  <img src={labIcon} alt="Lab Results" className={styles.headerIcon} />
                  <div className={styles.cardHeaderWithAction}>
                    <h3 className={styles.cardTitle}>Lab Results</h3>
                    <span className={styles.viewAllLink} onClick={handleViewLabParamsDrawer}>View All &gt;</span>
                  </div>
                </div>
                <div className={styles.headerSeparator}></div>
                <div className={styles.detailedCardContent}>
                  <ul className={styles.labResultsList}>
                    {summaryData.labResults.map((lab, idx) => (
                      <li key={idx} className={styles.labRow}>
                        <strong>{lab.date}:</strong> {lab.tests && lab.tests.length > 0 ? (
                          <span>({lab.tests.join(' | ')})</span>
                        ) : (
                          <span>No test results</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {viewlabparamsDrawer && (
              <Drawer
                closeIcon={false}
                width="auto"
                className="modalWidth-700"
                placement="right"
                open={viewlabparamsDrawer}
                onClose={handleViewLabParamsDrawer}
              >
                <ViewLabParam 
                  handleViewLabParamsDrawer={handleViewLabParamsDrawer} 
                  labParamsData={labParamsData} 
                  handleSwitchToAddLabParams={handleSwitchToAddLabParams}
                />
              </Drawer>
            )}

            {addlabparamsDrawer && (
              <Drawer
                closeIcon={false}
                width={880}
                placement="right"
                open={addlabparamsDrawer}
                onClose={showHideBackModal}
              >
                <LabParams 
                  handleAddLabParamsDrawer={handleAddLabParamsDrawer} 
                  patient_unique_id={patient_data?.patient_unique_id} 
                  onSave={handleLabParamsUpdate} 
                  isBackModalOpen={isBackModalOpen} 
                  showHideBackModal={showHideBackModal}
                />
              </Drawer>
            )}

            {Array.isArray(summaryData.medicalHistory) && summaryData.medicalHistory.length > 0 && summaryData.medicalHistory.some(e => (e.no_know_history || e.tags?.length > 0)) && (
              <div className={styles.detailedCard}>
                <div className={styles.cardHeader}>
                  <img src={ddxIcon} alt="Medical History" className={styles.headerIcon} />
                  <h3 className={styles.cardTitle}>Medical History</h3>
                </div>
                <div className={styles.headerSeparator}></div>
                <div className={styles.detailedCardContent}>
                  {summaryData.medicalHistory.map((e, i) => {
                    if (!(e.no_know_history || e.tags?.length > 0)) {
                      return null;
                    }
                    
                    return (
                      <div key={i} className={styles.medicalHistorySection}>
                        <div className={styles.medicalHistoryTitle}><strong>{e.title}:</strong></div>
                        {!e.no_know_history ? (
                          <ul className={styles.medicalHistoryList}>
                            {e.tags?.filter(x => x.enable === 'Y').map((e1, i1) => {
                              const details = [];
                              
                              if (e1.since && e?.tmmhs_id !== 5) {
                                details.push(`Since: ${e1.since}`);
                              }
                              if (e1.date && e?.tmmhs_id === 5) {
                                details.push(`Date of Surgery: ${e1.date}`);
                              }
                              if (e.tmmhs_id !== 3 && e?.tmmhs_id !== 5) {
                                if (e1.status) {
                                  details.push(`Status: ${e1.status}`);
                                }
                                if (e1.medication) {
                                  details.push(`Medication: ${e1.medication}`);
                                }
                              }
                              if (e.tmmhs_id === 3 && e1.relationship) {
                                details.push(`Relation: ${e1.relationship}`);
                              }
                              if (e1.note) {
                                details.push(`Notes: ${e1.note}`);
                              }
                              
                              return (
                                <li key={i1} className={styles.medicalHistoryListItem}>
                                  <strong>{e1.title}:</strong>
                                  {details.length > 0 && ` (${details.join(' | ')})`}
                                </li>
                              );
                            })}
                            {e.tags?.filter(x => x.enable === 'N').map((e1, i1) => (
                              <li key={`no-${i1}`} className={styles.medicalHistoryListItem}>
                                <strong>No {e1.title}</strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className={styles.noKnownHistory}>No known history</div>
                        )}
                      </div>
                    );
                  })}
                  {summaryData.medicalHistory?.[0]?.medical_history_remarks && (
                    <div className={styles.medicalHistorySection}>
                      <div className={styles.medicalHistoryTitle}><strong>Additional History:</strong></div>
                      <div className={styles.medicalHistoryRemarks}>
                        {summaryData.medicalHistory[0].medical_history_remarks}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className={styles.viewLessButton} onClick={toggleDetailedSummary}>
              <span>View Less ^</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default PatientSummary;
