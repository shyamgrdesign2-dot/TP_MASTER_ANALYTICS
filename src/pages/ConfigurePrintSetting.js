import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Col, Tabs, Row } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { isMobile } from "react-device-detect";
import QRCode from 'qrcode'
import config from '../config';
import axios from 'axios';

import PrintSettingsContext from '../context/PrintSettingsContext';

import HeaderPrintSetting from "../common/HeaderPrintSetting";
import Quixote from "./Quixote";
import QuixoteCertificate from "./QuixoteCertificate";

import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { TAB_PRESCRIPTION, TAB_HEADER_FOOTER, TAB_PAGE_FORMAT, NORMAL, GB_CVT_EXT_HOS } from "../utils/constants";

import PrescriptionLayout from "../components/print_settings/PrescriptionLayout";
import HeaderFooterLayout from "../components/print_settings/HeaderFooterLayout";
import PageFormatLayout from "../components/print_settings/PageFormatLayout";

import "cropperjs/dist/cropper.css";
import { useTodayVaccines } from "./vaccination/useTodayVaccines";
import { useGrowthChart } from "./growthChart/useGrowthChart";
import useObstetric from "./obstetric/useObstetric";
import { getModules } from "../redux/customModuleSlice";
import moment from "moment";
import { fetchBillsByPatient, fetchPatientWalletBalance, listAdvancedDepositByPatient } from "./opdBilling/service";
import { getCarePlanAssignments } from "./smartSync/services/carePlanService";
import { updateFooterImageHeight } from "../utils/utils";
import { getGenRx } from "../api/services/ApiGenRx";
import { getSnapRxDigitization } from "./snapRx/services/snapRxService";
import { env } from "../EnvironmentConfig";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../utils/constants";
import { getDecodedToken } from "../utils/localStorage";
import { fetchAgents } from "./appointmentAgent/service";
import { ophthalmologyDefaultPrintSettings } from "../utils/ophthalmologyDefaultPrintSettings";
import { getOpthalPrescriptionDetails } from "./ophthalmology/service";
import ApiAbha from "../api/services/ApiAbha";
import { setCurrentSessionRx } from "../redux/obstetricSlice";


function ConfigurePrintSetting() {

    const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
    const divRef = useRef(null);
    const printSettingsRef = useRef(null);

    const { defaultPrintSettings, userId, profile } = useSelector((state) => state.doctors);

    const { state } = useLocation();
    const { caseManagerData, certificateData, smartRxFile, pam_id, dentalData, isAmbientRx, rxId, page, session_id: stateSessionId, sessionId: stateSessionIdAlt } = state;
    const isAfterDigitization = page === "digitise";
    const snapRxSessionId = stateSessionId ?? stateSessionIdAlt ?? caseManagerData?.session_id;

    const [divWidth, setDivWidth] = useState(0);
    const [selectedTab, setSelectedTab] = useState(caseManagerData !== undefined ? TAB_PRESCRIPTION : TAB_HEADER_FOOTER);
    const [printSettings, setPrintSettings] = useState(null);
    printSettingsRef.current = printSettings;
    const [fileHeader, setFileHeader] = useState(null);
    const [fileFooter, setFileFooter] = useState(null);
    const [fileLogo, setFileLogo] = useState(null);
    const [fileWatermark, setFileWatermark] = useState(null);
    const [fileSignature, setFileSignature] = useState(null);
    const todayVaccines = useTodayVaccines(caseManagerData);
    const growthChartDetails = useGrowthChart(caseManagerData);
    const obstetricDetails = useObstetric(caseManagerData?.patient_data?.patient_unique_id, caseManagerData?.doctor_Data?.um_id);
    const medicalHistoryCheckboxOptions = caseManagerData?.medical_history?.map(e => {
        return { label: e?.title, value: e?.tmmhs_id }
    })
    const [labParamsData, setLabParamsData] = useState([]);
    const [prescriptionDataFromApi, setPrescriptionDataFromApi] = useState(null);
    const [patientBills, setPatientBills] = useState([]);
    const [advanceReceipts, setAdvanceReceipts] = useState([]);
    const [patientWalletBalance, setPatientWalletBalance] = useState(0);
    const [carePlanAssignments, setCarePlanAssignments] = useState([]);
    const [appointmentLinkShared, setAppointmentLinkShared] = useState(null);
    const [opthalModuleData, setOpthalModuleData] = useState(null);
    const [abhaDetails, setAbhaDetails] = useState(null);

    const {customModules} = useSelector((state) => state.customModules);
    const dispatch = useDispatch();

    useEffect(() => {
        // Prevent stale preview blob leakage across print flows.
        dispatch(setCurrentSessionRx(null));
        return () => {
            dispatch(setCurrentSessionRx(null));
        };
    }, [dispatch]);

    const zydusSelectedLabParams = caseManagerData?.zydusSelectedLabParams || [];

    const getTodayLabParams = (labResults = []) => {
        const todayStr = moment().format("YYYY-MM-DD");
        return (Array.isArray(labResults) ? labResults : []).filter(
            (labResult) => (labResult?.date || labResult?.createdAt) && moment(labResult.date || labResult.createdAt).format("YYYY-MM-DD") === todayStr
        );
    };


    useEffect(() => {
        setDivWidth(divRef.current?.offsetWidth);
    }, [divRef]);

    useEffect(() => {
        growthChartDetails.getGrowthChartDetails();
        getPatientBills();
        fetchAbhaDetails();
    }, []);


    useEffect(() => {
        const fetchVoiceAmbientData = async () => {
            if (!caseManagerData) {
                return;
            }
            
            const rxIdToUse = rxId || caseManagerData?.smart_prescription_filename;
            const isSnapRx = (smartRxFile && smartRxFile.length > 0) || (caseManagerData?.isRxDigitize && !rxIdToUse);
            const isVoiceAmbientFlow = rxIdToUse && !isSnapRx;
            const shouldFetchData = (isSnapRx && isAfterDigitization) || isVoiceAmbientFlow;

            if (!shouldFetchData) {
                setPrescriptionDataFromApi(null);
            }
            if (shouldFetchData) {
                try {
                    let voiceAmbientResponse = null;
                    let prescriptionData = null;
                    
                    if (isSnapRx) {
                        voiceAmbientResponse = await getSnapRxDigitization(
                            caseManagerData?.patient_data?.patient_unique_id,
                            caseManagerData?.tcm_id,
                            snapRxSessionId
                        );
                    } else {
                        voiceAmbientResponse = await getGenRx(rxIdToUse);
                    }
                    
                    if (voiceAmbientResponse) {
                        let responseData = voiceAmbientResponse?.data?.data || voiceAmbientResponse?.data;
                        
                        if (isSnapRx) {
                            responseData = responseData?.digitization ?? voiceAmbientResponse?.data?.digitization ?? voiceAmbientResponse?.digitization ?? responseData;
                        }
                        
                        // Check multiple possible data locations
                        if (responseData?.editedData) {
                            prescriptionData = responseData.editedData;
                        } else if (responseData?.refinedData) {
                            prescriptionData = responseData.refinedData;
                        } else if (responseData?.digitizeData) {
                            prescriptionData = responseData.digitizeData;
                        } else if (responseData?.digitize) {
                            prescriptionData = responseData.digitize;
                        } else if (responseData?.history && Array.isArray(responseData.history) && responseData.history.length > 0) {
                            // Get the latest history entry
                            const latestHistory = responseData.history[responseData.history.length - 1];
                            
                            if (latestHistory?.digitize) {
                                const digitizeObj = latestHistory.digitize;
                              
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
                                    prescriptionData = digitizeObj;
                                }
                            }
                        } else if (responseData && !isSnapRx) {
                            // For voice/ambient, responseData itself might be the prescription data
                            prescriptionData = responseData;
                        }
                        const transformVoiceAmbientData = (data) => {
                            const transformed = { ...data };
                            if (Array.isArray(data.symptoms)) {
                                transformed.symptoms = data.symptoms.map(symptom => {
                                    if (typeof symptom === 'string') {
                                        return {
                                            symptom_name: symptom,
                                            since: "",
                                            severity: "",
                                            note: "",
                                            unique_id: `voice-${Date.now()}-${Math.random()}`,
                                            change: 0,
                                            isStringFormat: true
                                        };
                                    }
                                    return {
                                        symptom_name: symptom.name || symptom.symptom_name || symptom.lineItem || "",
                                        since: symptom.since || symptom.duration || "",
                                        severity: symptom.severity || "",
                                        note: symptom.note || symptom.notes || "",
                                        unique_id: symptom.unique_id || symptom._id || `voice-${Date.now()}-${Math.random()}`,
                                        change: symptom.change || 0
                                    };
                                });
                            }
                            
                            // Transform examinations data: voice/ambient uses 'name', caseManagerData uses 'examination_name'
                            if (Array.isArray(data.examinations)) {
                                transformed.examination = data.examinations.map(exam => {
                                    if (typeof exam === 'string') {
                                        return {
                                            examination_name: exam,
                                            note: "",
                                            unique_id: `voice-${Date.now()}-${Math.random()}`,
                                            change: 0
                                        };
                                    }
                                    return {
                                        examination_name: exam.name || exam.examination_name || exam.lineItem || "",
                                        note: exam.note || exam.notes || "",
                                        unique_id: exam.unique_id || exam._id || `voice-${Date.now()}-${Math.random()}`,
                                        change: exam.change || 0
                                    };
                                });
                            } else if (Array.isArray(data.examination)) {
                                transformed.examination = data.examination.map(exam => {
                                    if (typeof exam === 'string') {
                                        return {
                                            examination_name: exam,
                                            note: "",
                                            unique_id: `voice-${Date.now()}-${Math.random()}`,
                                            change: 0
                                        };
                                    }
                                    return {
                                        examination_name: exam.name || exam.examination_name || exam.lineItem || "",
                                        note: exam.note || exam.notes || "",
                                        unique_id: exam.unique_id || exam._id || `voice-${Date.now()}-${Math.random()}`,
                                        change: exam.change || 0
                                    };
                                });
                            }
                            
                            if (Array.isArray(data.medications)) {
                                transformed.medicine = data.medications;
                            }
                            
                            const investigationArray = [];
                            
                            if (Array.isArray(data.labInvestigation)) {
                                const transformedLabInv = data.labInvestigation.map(inv => ({
                                    investigation_name: inv.name || inv.investigation_name || inv.lineItem || "",
                                    note: inv.note || inv.notes || inv.instruction || "",
                                    unique_id: inv.unique_id || inv._id || `voice-${Date.now()}-${Math.random()}`,
                                    change: inv.change || 0
                                }));
                                investigationArray.push(...transformedLabInv);
                            }
                            
                            if (Array.isArray(data.investigation)) {
                                investigationArray.push(...data.investigation);
                            }
                            
                            if (investigationArray.length > 0) {
                                transformed.investigation = investigationArray;
                            }
                            
                            if (Array.isArray(data.advice)) {
                                transformed.advice = data.advice.map(adv => {
                                    if (typeof adv === 'string') {
                                        return {
                                            advice_name: adv,
                                            unique_id: `voice-${Date.now()}-${Math.random()}`,
                                            change: 0
                                        };
                                    }
                                    return {
                                        advice_name: adv.name || adv.advice_name || adv.lineItem || "",
                                        unique_id: adv.unique_id || adv._id || `voice-${Date.now()}-${Math.random()}`,
                                        change: adv.change || 0
                                    };
                                });
                            }
                            
                            if (Array.isArray(data.diagnosis)) {
                                transformed.diagnosis = data.diagnosis.map(diag => {
                                    if (typeof diag === 'string') {
                                        return {
                                            tds_name: diag,
                                            since: "",
                                            status: "",
                                            note: "",
                                            unique_id: `voice-${Date.now()}-${Math.random()}`,
                                            change: 0,
                                            isStringFormat: true
                                        };
                                    }
                                    return {
                                        ...diag,
                                        tds_name: diag.name || diag.tds_name || diag.lineItem || "",
                                        since: diag.since || "",
                                        status: diag.status || "",
                                        note: diag.note || diag.notes || "",
                                        unique_id: diag.unique_id || diag._id || `voice-${Date.now()}-${Math.random()}`,
                                        change: diag.change || 0
                                    };
                                });
                            }
                            // Surgeries/Procedures from voice/ambient/snap/smart – keep as { name, notes } for print
                            if (Array.isArray(data.surgeries) && data.surgeries.length > 0) {
                                transformed.surgeries = data.surgeries.map(s =>
                                    typeof s === 'string'
                                        ? { name: s, notes: '' }
                                        : { name: (s.name || '').trim(), notes: (s.notes || s.note || '').trim() }
                                );
                            }
                            // Vaccination from snap/smart/voice/ambient – same format (name, brand, schedule, notes); include in merged for print only
                            if (Array.isArray(data.vaccinations) && data.vaccinations.length > 0) {
                                transformed.vaccinations = data.vaccinations.map(v => (typeof v === 'string' ? { name: v, brand: '', schedule: '', notes: '', lineItem: '' } : { name: v.name || v.lineItem || '', brand: v.brand || '', schedule: v.schedule || '', notes: v.notes || v.note || '', lineItem: v.lineItem || v.schedule || '' }));
                            }
                            // Custom modules from snap/smart/voice/ambient: convert dynamicFields to moduleContents (same format as case manager for print)
                            const rawDynamic = data.dynamicFields;
                            if (rawDynamic && typeof rawDynamic === 'object') {
                                let dynamicObj = rawDynamic;
                                const v2Modules = [];
                                if (Array.isArray(rawDynamic)) {
                                    dynamicObj = rawDynamic.reduce((acc, module) => {
                                        const name = module?.name || module?.module_name || '';
                                        if (!name) return acc;
                                        const rawRows = module?.fields || module?.fieldValues || [];

                                        if (module?.version === 'v2' && Array.isArray(rawRows) && rawRows.length > 0) {
                                            const sorted = [...rawRows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                                            const columnNames = [];
                                            sorted.forEach(f => {
                                                const dataKey = Object.keys(f).find(k => k !== 'order' && k !== 'id');
                                                if (dataKey && !columnNames.includes(dataKey)) columnNames.push(dataKey);
                                            });
                                            const numCols = columnNames.length || 1;
                                            const rows = [];
                                            for (let ri = 0; ri < sorted.length; ri += numCols) {
                                                const rowItems = sorted.slice(ri, ri + numCols);
                                                const row = {};
                                                rowItems.forEach(f => {
                                                    const dk = Object.keys(f).find(k => k !== 'order' && k !== 'id');
                                                    if (dk) row[dk] = f[dk];
                                                });
                                                if (Object.values(row).some(v => v != null && String(v).trim() !== '')) rows.push(row);
                                            }
                                            if (rows.length > 0) {
                                                v2Modules.push({
                                                    module_id: module?.module_id || name,
                                                    module_name: name,
                                                    module_version: 'v2',
                                                    content: rows,
                                                });
                                            }
                                            return acc;
                                        }

                                        const rows = Array.isArray(rawRows)
                                            ? rawRows
                                                .map((f) => {
                                                    if (typeof f === 'string') return { lineItem: (f || '').trim() };
                                                    if (f && typeof f === 'object' && (f.lineItem || f.title)) return { lineItem: (f.lineItem || f.title || '').trim(), ...f };
                                                    if (f && typeof f === 'object') {
                                                        const parts = Object.entries(f)
                                                            .filter(([k]) => k !== 'order')
                                                            .filter(([, v]) => v != null && String(v).trim() !== '')
                                                            .map(([k, v]) => `${k}: ${v}`);
                                                        return { lineItem: parts.join(', ') };
                                                    }
                                                    return { lineItem: '' };
                                                })
                                                .filter((row) => (row?.lineItem || '').trim() !== '')
                                            : [];
                                        if (rows.length > 0) acc[name] = rows;
                                        return acc;
                                    }, {});
                                }
                                const fromDynamic = Object.entries(dynamicObj)
                                    .filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
                                    .map(([module_name, rows]) => ({
                                        module_id: module_name,
                                        module_name,
                                        content: rows.map((row) => {
                                            const line = typeof row === 'string' ? row : (row?.lineItem ?? row?.notes ?? '');
                                            return { title: '', notes: String(line || '').trim() };
                                        }).filter((item) => item.notes !== ''),
                                    }))
                                    .filter((m) => m.content.length > 0);
                                const allModuleContents = [...fromDynamic, ...v2Modules];
                                if (allModuleContents.length > 0) {
                                    transformed.moduleContents = allModuleContents;
                                }
                            }
                            return transformed;
                        };
                        
                        const transformedData = transformVoiceAmbientData(prescriptionData);
                        if (transformedData) {
                            const mergedModuleContents = [
                                ...(caseManagerData?.moduleContents || []),
                                ...(transformedData.moduleContents || []),
                            ];
                            const merged = {
                                ...caseManagerData,
                                ...(transformedData.medicine && { medicine: transformedData.medicine }),
                                isVoiceAmbientRx: !isSnapRx,
                                isRxDigitize: isSnapRx || caseManagerData?.isRxDigitize,
                                ...(transformedData.diagnosis && { diagnosis: transformedData.diagnosis }),
                                ...(transformedData.advice && { advice: transformedData.advice }),
                                ...(transformedData.investigation && { investigation: transformedData.investigation }),
                                ...(transformedData.labParamsData && { labParamsData: transformedData.labParamsData }),
                                ...(transformedData.symptoms && { symptoms: transformedData.symptoms }),
                                ...(transformedData.examination && { examination: transformedData.examination }),
                                ...(transformedData.surgeries && { surgeries: transformedData.surgeries }),
                                ...(transformedData.visit_advice && { visit_advice: transformedData.visit_advice }),
                                ...(transformedData.others && Array.isArray(transformedData.others) && { others: transformedData.others }),
                                ...(transformedData.vaccinations && { vaccinations: transformedData.vaccinations }),
                                ...(mergedModuleContents.length > 0 && { moduleContents: mergedModuleContents }),
                                smart_prescription_filename: caseManagerData?.smart_prescription_filename,
                            };
                            setPrescriptionDataFromApi(merged);
                        } else {
                            setPrescriptionDataFromApi({ ...caseManagerData, isVoiceAmbientRx: true });
                        }
                    } else {
                        setPrescriptionDataFromApi({ ...caseManagerData, isVoiceAmbientRx: true });
                    }
                } catch (error) {
                    setPrescriptionDataFromApi({ ...caseManagerData, isVoiceAmbientRx: true });
                }
            }
            const patientId = caseManagerData?.patient_data?.patient_unique_id;
            if (patientId) {
                try {
                    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
                    const cleanedToken = token ? token.replace(/['"]+/g, '') : '';
                    const baseUrl = env.lab_params_api_url || config.lab_params_api_url;
                    const response = await axios.get(
                        `${baseUrl}/api/v1/lab-parameters/results/${patientId}`,
                        { headers: { Authorization: `Bearer ${cleanedToken}` } }
                    );
                    const labResults = response?.data?.data?.results ?? response?.data?.results ?? [];
                    const labArray = getTodayLabParams(labResults);
                    setLabParamsData(labArray);
                } catch (error) {
                    // Lab API optional; leave labParamsData unchanged on error
                }
            }
        };

        fetchVoiceAmbientData();
    }, [caseManagerData, rxId, isAmbientRx, smartRxFile, isAfterDigitization]);

    // Fetch care plan assignments for PDF rendering (used by Quixote/ViewPDF)
    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const patientId = caseManagerData?.patient_data?.patient_unique_id;
                if (!patientId) return;
                const resp = await getCarePlanAssignments(patientId);
                setCarePlanAssignments(Array.isArray(resp) ? resp : []);
            } catch (e) {
                setCarePlanAssignments([]);
            }
        };
        fetchAssignments();
    }, [caseManagerData?.patient_data?.patient_unique_id]);

    useEffect(() => {
        dispatch(getModules(userId));
      }, [userId, dispatch]);

    useEffect(() => {
        const fetchOpthalPrescription = async () => {
            const tcmId = caseManagerData?.tcm_id;
            if (!tcmId) {
                setOpthalModuleData(null);
                return;
            }
            try {
                const response = await getOpthalPrescriptionDetails({
                    tcm_id: tcmId,
                    patientId: caseManagerData?.patient_data?.patient_unique_id,
                });
                const data = response?.data ?? response;
                const payload = Array.isArray(data) ? data[0] : data;
                setOpthalModuleData(payload || null);
            } catch (error) {
                console.error("Error fetching opthal prescription details:", error);
                setOpthalModuleData(null);
            }
        };
        fetchOpthalPrescription();
        return () => {
            setOpthalModuleData(null);
        };
    }, [caseManagerData?.tcm_id]);

    const usePrescriptionDataFromApi = (!!(rxId || isAmbientRx) && !(smartRxFile?.length > 0 && !isAfterDigitization)) || ((smartRxFile?.length > 0 || caseManagerData?.isRxDigitize) && isAfterDigitization);
    const dataSourceForPreview = usePrescriptionDataFromApi && prescriptionDataFromApi != null ? prescriptionDataFromApi : caseManagerData;
    const obstetricData = obstetricDetails?.data || obstetricDetails;
    const enrichedCaseManagerData = dataSourceForPreview
        ? {
            ...dataSourceForPreview,
            ...(obstetricData && { obsHistoryData: dataSourceForPreview.obsHistoryData || obstetricData }),
        }
        : dataSourceForPreview;
    const contextApi = { smartRxFile: isAfterDigitization ? undefined : smartRxFile, isDigitisedPrintConfig: isAfterDigitization, isCvtExtHosAccessableFromGB, divWidth, caseManagerData: enrichedCaseManagerData, certificateData, printSettings, setPrintSettings, fileHeader, setFileHeader, fileFooter, setFileFooter, fileLogo, setFileLogo, fileWatermark, setFileWatermark, fileSignature, setFileSignature, medicalHistoryCheckboxOptions, labParamsData, zydusSelectedLabParams, customModules, carePlanAssignments, ophthalModuleData: opthalModuleData, dentalData };
    const TabsPrintSetting = [
        {
            key: TAB_PRESCRIPTION,
            label: 'Prescription'
        },
        {
            key: TAB_HEADER_FOOTER,
            label: 'Header & Footer'
        },
        {
            key: TAB_PAGE_FORMAT,
            label: 'Page Format'
        },
    ];

    const hasOphthalValue = (value) => {
        if (value === 0 || value === "0") return true;
        if (value === null || value === undefined) return false;
        return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    };

    const hasOphthalArrayData = (items, keys) =>
        Array.isArray(items) && items.some((item) => keys.some((key) => hasOphthalValue(item?.[key])));

    const hasOphthalModuleData = !!(
        opthalModuleData &&
        (
            hasOphthalArrayData(opthalModuleData.visualAcuity, ["ucDistance", "ucNear", "pinhole", "cDistance", "cNear"]) ||
            hasOphthalArrayData(opthalModuleData.autoRefraction, ["sphere", "cylinder", "axis", "add", "distance", "near"]) ||
            hasOphthalArrayData(opthalModuleData.lensometerValues, ["sphere", "cylinder", "axis", "add", "distance", "near"]) ||
            hasOphthalArrayData(opthalModuleData.glassPrescription, ["sphere", "cylinder", "axis", "add", "distance", "near"]) ||
            hasOphthalArrayData(opthalModuleData.intraOcularPressure, ["nct", "gat", "cc", "cct", "ciop"]) ||
            hasOphthalArrayData(opthalModuleData.slitLampExamination, ["OD", "OS", "remarks"]) ||
            hasOphthalArrayData(opthalModuleData.fundusExamination, ["OD", "OS", "remarks"]) ||
            hasOphthalValue(opthalModuleData.pd)
        )
    );

    // Fetch appointment agent link
    useEffect(() => {
        const fetchAppointmentLink = async () => {
            try {
                const decodedToken = getDecodedToken();
                const clinicId = decodedToken?.result?.clinic_id;
                if (clinicId) {
                    const res = await fetchAgents(clinicId);
                    if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
                        const appointmentLink = res.data[0]?.appointmentLinkShared;
                        if (appointmentLink) {
                            setAppointmentLinkShared(appointmentLink);
                        }
                    }
                }
            } catch (error) {
                console.error("Error while fetching appointment agent link: ", error);
            }
        };
        fetchAppointmentLink();
    }, []);

    useEffect(() => {
        const makeData = async () => {
            const publishUrl = profile?.website_publish ? profile?.publish_url : null ;
            const qrCodeUrl = publishUrl || appointmentLinkShared ;
            const qrCode = qrCodeUrl ? await QRCode.toDataURL(qrCodeUrl) : null;
            const isWrittenRxSnapSmart = (state?.from === "/snap-rx/preview" || state?.from === "/print-smart-rx") && !isAfterDigitization && (smartRxFile?.length > 0 || caseManagerData?.smart_prescription_filename);
            const hasUserPrintSettings = printSettingsRef.current && Object.keys(printSettingsRef.current).length > 0;
            const baseSettings = (isWrittenRxSnapSmart && hasUserPrintSettings) ? printSettingsRef.current : defaultPrintSettings;
            const copyPrintSettings = JSON.parse(JSON.stringify({
                ...baseSettings,
                qrcode: qrCode
            }));
            const shouldShowSmartRxOption = isWrittenRxSnapSmart;

            if (isWrittenRxSnapSmart && copyPrintSettings?.prescription?.case_option) {
                const defaultOptions = defaultPrintSettings?.prescription?.case_option || [];
                const defaultCaseOption = defaultOptions.map((o) => ({
                    ...o,
                    custom_status: o.custom_status || "Y",
                }));

                // Preserve per-Rx edits without losing default ordering/flags.
                const existingCaseOption = printSettingsRef.current?.prescription?.case_option || [];
                if (existingCaseOption.length > 0) {
                    const existingMap = new Map(existingCaseOption.map((o) => [o.id, o]));
                    copyPrintSettings.prescription.case_option = defaultCaseOption.map((opt) => {
                        const override = existingMap.get(opt.id);
                        return override ? { ...opt, ...override } : opt;
                    });
                    existingCaseOption.forEach((opt) => {
                        if (!copyPrintSettings.prescription.case_option.some((o) => o.id === opt.id)) {
                            copyPrintSettings.prescription.case_option.push({ ...opt });
                        }
                    });
                } else {
                    copyPrintSettings.prescription.case_option = defaultCaseOption;
                }

                // Keep written Rx option title aligned with source.
                const writtenRxOptionTitle = state?.from === "/snap-rx/preview" ? "Snap" : "SmartRx";
                const smartRxOption = copyPrintSettings.prescription.case_option.find((o) => o.id === 11);
                if (smartRxOption) {
                    smartRxOption.title = writtenRxOptionTitle;
                } else {
                    copyPrintSettings.prescription.case_option.push({
                        id: 11,
                        title: writtenRxOptionTitle,
                        format: "inline",
                        enable: "Y",
                        custom_status: "Y",
                    });
                }
            }
            if (!shouldShowSmartRxOption && copyPrintSettings?.prescription?.case_option) {
                copyPrintSettings.prescription.case_option = copyPrintSettings.prescription.case_option.filter(
                    (option) => option?.id !== 11
                );
            }
            // Lab Investigation (id 15): default print section for lab parameters/investigations from backend.
            // Lab Results (id 18): added below when Zydus data exists; both can appear in Format Style.
            // Add Case Option ID 18 for Zydus Lab Results if it doesn't exist and we have Zydus data (skip for written Rx snap/smart)
            if (!isWrittenRxSnapSmart && zydusSelectedLabParams?.length > 0 && copyPrintSettings?.prescription?.case_option) {
                const hasZydusOption = copyPrintSettings.prescription.case_option.find(option => option.id === 18);
                if (!hasZydusOption) {
                    // Find Lab Investigation (ID 15) position to insert Zydus Lab Results (ID 18) after it
                    const labResultsIndex = copyPrintSettings.prescription.case_option.findIndex(option => option.id === 15);
                    const insertIndex = labResultsIndex !== -1 ? labResultsIndex + 1 : copyPrintSettings.prescription.case_option.length;
                    
                    // Add Zydus Lab Results option
                    copyPrintSettings.prescription.case_option.splice(insertIndex, 0, {
                        id: 18,
                        title: "Zydus Lab Results",
                        format: "inline",
                        enable: "Y",
                        custom_status: "Y"
                    });
                }
            }

            // Add Case Option ID 20 for Ophthalmology when module has data (skip for written Rx snap/smart)
            if (!isWrittenRxSnapSmart && hasOphthalModuleData && copyPrintSettings?.prescription?.case_option) {
                const hasOphthalmologyOption = copyPrintSettings.prescription.case_option.find(option => option.id === 20);
                if (!hasOphthalmologyOption) {
                    // Add Ophthalmology option with default settings
                    copyPrintSettings.prescription.case_option.push({
                        id: 20,
                        title: "Ophthal",
                        format: "table", // table, listview, or inline
                        enable: "Y",
                        custom_status: "Y",
                        ophthalmology_option: ophthalmologyDefaultPrintSettings.subSections
                    });
                } else {
                    // Ensure ophthalmology_option exists even if option already exists
                    const ophthOption = copyPrintSettings.prescription.case_option.find(option => option.id === 20);
                    if (ophthOption && !ophthOption.ophthalmology_option) {
                        ophthOption.ophthalmology_option = ophthalmologyDefaultPrintSettings.subSections;
                    }
                }
            }

            setPrintSettings(copyPrintSettings);
            copyPrintSettings?.logo_enable === 'Y' && copyPrintSettings.logo_image && setFileLogo({ imageShow: true, showFile: copyPrintSettings.logo_image });
            copyPrintSettings?.water_mark_enable === 'Y' && copyPrintSettings.water_mark_image && setFileWatermark({ imageShow: true, showFile: copyPrintSettings.water_mark_image });
            copyPrintSettings?.signature_enable === 'Y' && copyPrintSettings.signature_image && setFileSignature({ imageShow: true, showFile: copyPrintSettings.signature_image });
            copyPrintSettings?.header_image && setFileHeader({ imageShow: true, showFile: copyPrintSettings.header_image });
            if (copyPrintSettings?.footer_image) {
                updateFooterImageHeight({showFile: copyPrintSettings?.footer_image}, setFileFooter, true);
            }
        }
        makeData()
    },[defaultPrintSettings, hasOphthalModuleData, appointmentLinkShared, profile?.publish_url, profile?.micrositeUrl]);

    useEffect(() => {
        if (!fileFooter?.showFile) return;
        updateFooterImageHeight(fileFooter, setFileFooter);
    }, [fileFooter?.showFile])

    const onTabChange = useCallback(
        (key) => {
            setSelectedTab(key);
            updateFooterImageHeight();
        },
        []
    );

    const getPatientBills = async () => {
        const queryParams = {
          doctorIds: [userId],
          sortBy: "date",
          sortOrder: "asc",
          page: 1,
          limit: 25,
          startDate: moment().format("YYYY-MM-DD"),
          endDate: moment().format("YYYY-MM-DD"),
          patientId: caseManagerData?.patient_data?.patient_unique_id,
          appointmentId: pam_id || caseManagerData?.patient_data?.pam_id,
          includeInRx: true,
        };
        const response = await fetchBillsByPatient(queryParams);
        if (response?.bills?.length > 0) {
            setPatientBills(response?.bills);
        }
        const patientAdvanceDeposit = await listAdvancedDepositByPatient({
          ...queryParams,
          status: ["Deposit", "Refund"],
        });
        if (patientAdvanceDeposit?.receipts?.length > 0) {
          setAdvanceReceipts(patientAdvanceDeposit?.receipts);
        }
        const patientWalletBalanceRes = await fetchPatientWalletBalance(
            caseManagerData?.patient_data?.patient_unique_id
        );
        setPatientWalletBalance(patientWalletBalanceRes?.advanceDepositBalance);
    };

    const fetchAbhaDetails = async () => {
        const abhaDetails = await ApiAbha.fetchAbhaDetails(caseManagerData?.patient_data?.patient_unique_id);
        if (abhaDetails && Object.keys(abhaDetails).length > 0) {
            setAbhaDetails(abhaDetails);
        }
    };

    return (
        <PrintSettingsContext.Provider value={contextApi}>
            <>
                <HeaderPrintSetting defaultPrintSettings={defaultPrintSettings} />
                {/* <style scoped>{css}</style> */}
                <div className={'w-100 bg-body wrapper2'}>
                    <Row justify="space-between">
                        <Col xl={8} sm={10} className="pe-3">
                            <div className="bg-white overflow-y-auto" style={{ height: 'calc(100vh - 60px)' }}>
                                {/* Always show all tabs when we have caseManagerData (normal consult or voice/ambient) */}
                                <Tabs 
                                    defaultActiveKey="1" 
                                    items={caseManagerData !== undefined ? TabsPrintSetting : TabsPrintSetting.slice(1, 2)} 
                                    onChange={onTabChange} 
                                    className="print-tabs" 
                                />
                                {selectedTab === TAB_PRESCRIPTION ? (
                                    <PrescriptionLayout todayVaccines={todayVaccines} growthChartDetails={growthChartDetails} obstetricDetails={obstetricDetails} patientBills={[...patientBills, ...advanceReceipts]} />
                                ) : selectedTab === TAB_HEADER_FOOTER ? (
                                    <HeaderFooterLayout todayVaccines={todayVaccines} growthChartDetails={growthChartDetails} obstetricDetails={obstetricDetails} patientBills={patientBills} advanceReceipts={advanceReceipts} patientWalletBalance={patientWalletBalance} />
                                ) : selectedTab === TAB_PAGE_FORMAT && (
                                    <PageFormatLayout />
                                )}
                            </div>
                        </Col>
                        <Col xl={16} sm={14}>
                            <div className="mx-auto overflow-y-auto " style={{ width: isMobile ? 580 : 900 }} >
                                <div className="titleprint mt-20">Preview</div>
                                <div ref={divRef} className="rounded-20px bg-white mt-20 overflow-hidden">
                                    <div className="position-relative printheight">
                                        {caseManagerData !== undefined ? <Quixote mode={NORMAL} todayVaccines={todayVaccines} growthChartDetails={growthChartDetails} obstetricDetails={obstetricDetails} patientBills={patientBills} advanceReceipts={advanceReceipts} patientWalletBalance={patientWalletBalance} ophthalModuleData={opthalModuleData} abhaDetails={abhaDetails} dentalData={dentalData} /> : <QuixoteCertificate mode={NORMAL} />}
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            </>
        </PrintSettingsContext.Provider>
    );
}

export default ConfigurePrintSetting;
