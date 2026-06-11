import React, { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
// import { Container, Navbar, Nav, Dropdown } from "react-bootstrap";
import { AutoComplete, Input, Button, Form, Row, Col, Select, Popover, Tabs, Spin, Tooltip, message, Checkbox, Drawer} from "antd";
import { isMobile, isChrome, isSafari } from "react-device-detect";
import axios from 'axios';
import { saveAs } from 'file-saver';
import { jwtDecode } from "jwt-decode";

import { errorMessage, sendMessageToParent } from "../utils/utils";
import { EVENTS } from "../utils/events";
import api from "../api/services/axiosService";

import HeaderPrescriptionPrint from "../common/HeaderPrescriptionPrint";

import { FAILED_VERIFICATION, FETCH_SMART_RX, FREE, GB_SMARTSYNC_CVT, MESSAGE_KEY, RX_DIGITIZATION, S_RX_DIGITIZATION, WHATS_APP_API, WTSAP_ERR_MESSAGE, LANGUAGE_LIST, GB_CVT_EXT_HOS } from "../utils/constants";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../utils/constants";
import config from "../../src/config";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import { useSelector, useDispatch } from "react-redux";

import { viewCaseManager } from "../redux/caseManagerSlice";
import { fetchPatientDefaultLanguage, updatePatientDefaultLanguage } from "../api/services/DefaultLanguageService";

import { pdfjs, Document, Page } from "react-pdf";
import CommonModal from "../common/CommonModal";
import { env } from "../EnvironmentConfig";
import { getDecodedToken } from "../utils/localStorage";
import CvtKnowMore from "./smartSync/components/CvtKnowMore";
import { checkCredits } from "../redux/monetizationSlice";
import { services } from "../redux/doctorsSlice";
import ExpiredSubModal from "./monetization/components/ExpiredSubModal";
import { usePrintPayloadPdf } from "../hooks/usePrintPayloadPdf";
import {
  getClinic,
  getTokenData,
} from "../utils/utils";
import { ASSETS } from "../assets";
const {
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
  wtsp,
  loading_3: loadingImg,
  successIcon,
  cvtInfo: cvtInfoIcon,
} = ASSETS.images;

const worker = require('pdfjs-dist/build/pdf.worker.min.js')
pdfjs.GlobalWorkerOptions.workerSrc = worker

let smartRxMountCount = 0;
function SmartRxPreview() {

    const divRef = useRef(null);
    const [editedData, setEditedData] = useState(null);
    const printRef = useRef();

    const { servicesList, profile, defaultPrintSettings } = useSelector((state) => state.doctors);
    const RX_DIGITIZATION_planDetails = servicesList?.find(e => e.service_name === S_RX_DIGITIZATION)
    const {
        loading,
    } = useSelector((state) => state.caseManager);
    const dispatch = useDispatch();

    const navigate = useNavigate();
    const location = useLocation();
    const state = location?.state || {};
    const { patient_data, isDigitiseRxSubmit } = state;

    const buildUrlWithLanguage = (url, language) => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            urlObj.searchParams.delete('lg');
            urlObj.searchParams.delete('rx');
            urlObj.searchParams.set('rx', '0');
            if (language) {
                const encodedData = btoa(language.toString());
                urlObj.searchParams.set('lg', encodedData);
            }
            return urlObj.toString();
        } catch (error) {
            return url;
        }
    };

    // Same as consult flow: doctor default from print settings, then patient default from API when available
    const initialLanguage =
      defaultPrintSettings?.default_language && defaultPrintSettings?.default_language !== "English"
        ? defaultPrintSettings.default_language
        : 1;

    const [selectedLang, setSelectedLang] = useState(initialLanguage);
    const basePrintUrl = state?.print_url || null;
    const initialUrl = basePrintUrl ? buildUrlWithLanguage(basePrintUrl, initialLanguage) : null;

    const [printUrl, setPrintUrl] = useState(initialUrl);
    const [previewUrl, setPreviewUrl] = useState(initialUrl);

    // Detect a hard refresh on the first mount after document load.
    const isFirstMountAfterLoad = smartRxMountCount === 0;
    useEffect(() => {
        smartRxMountCount += 1;
    }, []);
    const navigationEntry = window?.performance?.getEntriesByType?.("navigation")?.[0];
    const didHardReload = navigationEntry?.type === "reload";
    const treatAsReload = didHardReload && isFirstMountAfterLoad;

    // If the page was reloaded, treat it as not coming from Configure Print Setting
    const fromConfigurePrintSetting =
        state?.from === "/configure_print_setting" &&
        Boolean(state?.currentSessionRx) &&
        !treatAsReload;

    const [useSessionRx, setUseSessionRx] = useState(fromConfigurePrintSetting);

    const [currentSessionRx, setCurrentSessionRx] = useState(() => {
        if (!fromConfigurePrintSetting) {
            return null;
        }
        if (state?.currentSessionRx instanceof Blob) return state.currentSessionRx;
        if (typeof state?.currentSessionRx === "string" && state.currentSessionRx.length > 0) {
            return state.currentSessionRx;
        }
        return null;
    });
    const [viewCaseManagerData, setViewCaseManagerData] = useState(null);
    const [token, setToken] = useState(null);
    const [tokenData, setTokenData] = useState(null);
    const [divWidth, setDivWidth] = useState(0);
    const [numPages, setNumPages] = useState();
    const [printBlob, setPrintBlob] = useState(null);
    const [smartRxFile, setSmartRxFile] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [buttonText, setButtonText] = useState("Send to WhatsApp");

    const [isRxDigitiseComplete, setRxDigitiseComplete] = useState(false);
    const [rxDigitiseApiResponse, setRxDigitiseApiResponse] = useState(null);
    const [showProgressbar, setShowProgressbar] = useState(false);
    // const [isEditedData, setIsEditedData] = useState(null);
    const [rxDigitisedData, setRxDigitisedData] = useState(null);
    // API may return isRxDigitize as "1"/"0"; only "1" or true means digitised (avoid "0" being truthy)
    const isRxDigitisedForTabs = viewCaseManagerData?.isRxDigitize === true || viewCaseManagerData?.isRxDigitize === "1";
    // After digitisation we navigate with page "digitise"; show toggle and digitised URL even if API not updated yet
    const isBackFromDigitise = state?.page === "digitise";
    const showDigitalWrittenToggle = isRxDigitisedForTabs || isBackFromDigitise;
    const [showDigitalRx, setShowDigitalRx] = useState(false);
    const [cvtDrawer, setCvtDrawer] = useState(false);
    const progressRef = useRef(null);
    const progressValue = useRef(0);
    const hasToggledRef = useRef(false);
    const skipNextToggleResetRef = useRef(false);

    const [isSubModalOpen, setIsSubModalOpen] = useState(false);

    const baseUrl = { customBaseUrl: env.casemanager_api_url };
    const baseUrlRxDigitise = env.rx_digitization ;
    const isSmartSyncCVTAccessableFromGB = useFeatureIsOn(
        GB_SMARTSYNC_CVT
    );
    const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);

    const containerStyle = {
        width: '100%',
        height: '25px',
        borderRadius: "16px",
        background: "linear-gradient(180deg, #DBEFDC 0%, #EDF7ED 50%, #DBEFDC 100%)",
        overflow: 'hidden',
    };
      
    const progressStyle = {
        height: '100%',
        width: '0%',
        borderRadius: "16px",
        background: "linear-gradient(180deg, #94CF96 0%, #70BF73 50.35%, #94CF96 100%)",
        transition: 'width 0.1s ease-in-out',
    };

    useEffect(() => {
        setDivWidth(divRef.current?.offsetWidth);
    }, [divRef]);

    const getPatientDefaultLanguage = async () => {
        if (!patient_data?.patient_unique_id) return;
        const res = await fetchPatientDefaultLanguage(patient_data.patient_unique_id);
        if (res?.settings?.defaultLanguage) {
            setSelectedLang(res.settings.defaultLanguage);
        }
    };

    useEffect(() => {
        getPatientDefaultLanguage();
    }, [patient_data?.patient_unique_id]);

    useEffect(() => {
        message.open({
            key: MESSAGE_KEY,
            type: '',
            className: 'message-appointment',
            content: (
                <div className='d-flex align-items-center'>
                    <img src={visitEnd} className='me-3' />
                    <div>
                        <div className='title-common-digitised text-start fontroboto'>{`${patient_data?.pm_first_name}’s visit ended successfully.`}</div>
                        <div className='fontroboto text-start fw-normal mt-1'>View completed visits in finished tab.</div>
                    </div>
                    <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
                </div>
            ),
            duration: 5,
        });
    }, []);

    const getCaseManagerData = async () => {
        try {
            const sendData = {
                patient_unique_id: patient_data?.patient_unique_id || 0,
                tcm_id: state.tcm_id
            };
            const action = await dispatch(viewCaseManager(sendData));
            setViewCaseManagerData(action.payload);
            return action.payload; // return the data after it's fetched
        } catch (error) {
            console.error('Error fetching case manager data:', error);
            return null;
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if(state.tcm_id && patient_data?.patient_unique_id){
                const viewCaseManagerData = await getCaseManagerData();
                setViewCaseManagerData(viewCaseManagerData)
            }
        };
        fetchData();
    }, [state.tcm_id, patient_data?.patient_unique_id]);

    // After digitisation: default to Digital Rx so digitised URL (rxDigitize=true) is used and toggle is visible
    useEffect(() => {
        if (isBackFromDigitise) {
            skipNextToggleResetRef.current = true;
            setShowDigitalRx(true);
        }
    }, [isBackFromDigitise]);

    useEffect(() => {
        // Switching between Digital/Written should force a fresh fetch/render
        if (skipNextToggleResetRef.current) {
            skipNextToggleResetRef.current = false;
            return;
        }
        if (!hasToggledRef.current) {
            hasToggledRef.current = true;
            return;
        }
        setUseSessionRx(false);
        setCurrentSessionRx(null);
        setPrintBlob(null);
        setNumPages(undefined);
    }, [showDigitalRx]);

    const fetchRxDigitisedData = async () => {
        try {
            const cleanedToken = token.replace(/['"]+/g, '');
    
                // API call for Rx Digitisation
                const response = await axios.get(`${baseUrlRxDigitise}/api/v1/rxdigitize/rx/${state.tcm_id}`, {
                    headers: {
                        'Authorization': `Bearer ${cleanedToken}`,
                    },
                });
                return response.data; // return the data after it's fetched
        }catch (error) {
            console.error('Error digitizing the prescription:', error);
            return null;
        }
    };

    useEffect(() => {
        const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
        if (token) {
          try {
            setToken(token)
            const decoded = jwtDecode(token);
            setTokenData(decoded.result)
            setShowProgressbar(state?.showProgressbar === true ? true : false)
          } catch (e) {
            console.error(e);
          }
        }
    }, []);

    const handleDownload = async () => {
        try {
            if(showDigitalRx){
                window.Moengage.track_event("TP_Digitised_Prescription_Download", {
                    Doctor_Name: profile?.um_name,
                    Doctor_Number: profile?.um_contact,
                    Doctor_Unique_Id: profile?.doctor_unique_id,
                });
            }
            const sourceFile = printBlob || currentSessionRx;
            const pdfBlob = await asBlob(sourceFile);
            if (pdfBlob instanceof Blob) {
                saveAs(pdfBlob, `${Date.now()}.pdf`);
            } else {
                message.error("PDF is not ready yet.");
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            // Handle errors gracefully, e.g., display an error message to the user
        }
    };

    const handleInAppDownload = async () => {
        if(showDigitalRx){
            window.Moengage.track_event("TP_Digitised_Prescription_Download", {
                Doctor_Name: profile?.um_name,
                Doctor_Number: profile?.um_contact,
                Doctor_Unique_Id: profile?.doctor_unique_id,
            });
        }
        const sourceFile = printBlob || currentSessionRx;
        if (!sourceFile) {
            message.error("PDF is not ready yet.");
            return;
        }
        const pdfBlob = await asBlob(sourceFile);
        if (!(pdfBlob instanceof Blob)) {
            message.error("PDF is not ready yet.");
            return;
        }
        try {
            const file = new File([pdfBlob], `${new Date().toISOString().split("T")[0]}.pdf`, { type: "application/pdf" });
            const formData = new FormData();
            formData.append(file?.name, file);
            const { uploadDocsToAzure } = await import("./medicalRecords/service");
            const res = await uploadDocsToAzure(formData);
            const downloadUrl = res?.[0]?.url;
            sendMessageToParent(EVENTS.DOWNLOAD, { url: downloadUrl });
        } catch (error) {
            console.error("Error uploading PDF for download:", error);
        }
    };

    async function onDocumentLoadSuccess(successEvent) {
        setNumPages(successEvent?.numPages);
    }

    const asBlob = async (fileLike) => {
        if (fileLike instanceof Blob) return fileLike;
        if (typeof fileLike === "string") {
            try {
                const res = await fetch(fileLike);
                return await res.blob();
            } catch (e) {
                console.error("Failed to convert URL to Blob", e);
                return null;
            }
        }
        return null;
    };

    const printContent = async () => {
        try {
            const sourceFile = printBlob || currentSessionRx;
            if (!sourceFile) {
                message.error("PDF is not ready yet.");
                return;
            }
            const pdfBlob = await asBlob(sourceFile);
            if (!(pdfBlob instanceof Blob)) {
                message.error("PDF is not ready yet.");
                return;
            }
            const blobURL = URL.createObjectURL(pdfBlob);
            document.querySelectorAll("iframe").forEach((iframe) => iframe.remove());
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = blobURL;
            iframe.onerror = () => {
                URL.revokeObjectURL(blobURL);
                message.error("Failed to load print content");
            };
            iframe.onload = () => {
                try {
                    requestAnimationFrame(() => {
                        iframe.focus();
                        iframe.contentWindow.print();
                        URL.revokeObjectURL(blobURL);
                    });
                } catch (error) {
                    console.error("Error during print:", error);
                    URL.revokeObjectURL(blobURL);
                    errorMessage("Failed to print prescription");
                }
            };
            document.body.appendChild(iframe);
        } catch (error) {
            console.error("Error in printContent:", error);
            errorMessage("Failed to print prescription");
        }
    };

    const printInAppContent = async () => {
        try {
            const sourceFile = printBlob || currentSessionRx;
            if (!sourceFile) {
                message.error("PDF is not ready yet.");
                return;
            }
            const pdfBlob = await asBlob(sourceFile);
            if (!(pdfBlob instanceof Blob)) {
                message.error("PDF is not ready yet.");
                return;
            }
            const file = new File([pdfBlob], `${new Date().toISOString().split("T")[0]}.pdf`, { type: "application/pdf" });
            const formData = new FormData();
            formData.append(file?.name, file);
            const { uploadDocsToAzure } = await import("./medicalRecords/service");
            const res = await uploadDocsToAzure(formData);
            const url = res?.[0]?.url;
            sendMessageToParent(EVENTS.PRINT, { url: url || printUrl });
        } catch (error) {
            console.error("Error uploading PDF for print:", error);
        }
    };

    const handleDrawerCvtKnowMore = useCallback(() => {
        setCvtDrawer(!cvtDrawer);
      }, [cvtDrawer]);

    //Handle Sider
    const handleCollapsed = useCallback(
        (flag) => {
        if(flag === 5) {
            handleDrawerCvtKnowMore();
        }
        },
        [cvtDrawer]
    );

    useEffect(() => {
        const fetchData = async () => {
          const payload = {
            tcm_id: state?.tcm_id,
          };
          try {
            const response = await api.post(
                FETCH_SMART_RX,
                payload,
                baseUrl
            );
            if(response?.data?.length){
                setSmartRxFile(response?.data);
            }
          } catch (error) {
            console.error("Error:", error);
          }
        };
        fetchData();
    }, []);

    const tempRxDigitise = async () => {
    
        const data = getDecodedToken();
        const formData = new FormData();

        const digitisedData = await fetchRxDigitisedData();
        const appointmentId = digitisedData?.data?.appointmentId;
        setEditedData(digitisedData?.data?.editedData);

        // Only proceed if digitisedData is null
        if (!digitisedData?.data) {
            // Append other fields to FormData
            formData.append('doctorId', data.result.user_id);
            formData.append('patientId', patient_data.patient_unique_id);
            formData.append('appointmentId', state?.pam_id);
            formData.append('caseId', state.tcm_id);
        
            try {
                const cleanedToken = token.replace(/['"]+/g, '');

                // API call for Rx Digitisation
                const response = await axios.post(`${baseUrlRxDigitise}/api/v1/rxdigitize/temp-rx`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${cleanedToken}`,
                    },
                });
            } catch (error) {
                console.error('Error uploading files:', error);
            }
        }
    }; 

    useEffect(() => {
        if(smartRxFile?.length > 0 && token && state?.tcm_id){
            tempRxDigitise();
        }
    }, [smartRxFile, token, state?.tcm_id]);

    const showHideSubModal = useCallback(() => {
        setIsSubModalOpen(!isSubModalOpen);
    }, [isSubModalOpen]);

    const handleDigitiseRx = async () => {
        if (RX_DIGITIZATION_planDetails?.plan_tier === FREE && RX_DIGITIZATION_planDetails?.credit_balance <= 0) {
            showHideSubModal()
        } else if (RX_DIGITIZATION_planDetails?.plan_tier === FAILED_VERIFICATION) {
            showHideSubModal()
        } else {
            let sendData = {
                b2c_id: profile?.b2c,
                service_name: S_RX_DIGITIZATION
            }

            const action = await dispatch(checkCredits(sendData));
            if (action.meta.requestStatus === "fulfilled") {
                if (action?.payload?.hasOwnProperty("service_name")) {
                    if (action?.payload?.plan_tier === FREE && action?.payload?.credit_balance <= 0) {
                        if (action?.payload?.credit_balance != RX_DIGITIZATION_planDetails?.credit_balance) {
                            await dispatch(services(sendData?.b2c_id))
                        }
                        showHideSubModal()
                    } else if (action?.payload?.plan_tier === FAILED_VERIFICATION) {
                        showHideSubModal()
                    } else {
                        try {
                            // Guard: ensure prerequisites
                            if (!(smartRxFile?.length > 0 && token)) return;
                            const isCustomSSRX = Boolean(viewCaseManagerData?.isCustomSSRX === "1");
                            const path = "/smart-rx-digitise";
                            const navState = {
                                patient_data: patient_data,
                                smartRxFilesData: smartRxFile,
                                tcm_id: state.tcm_id,
                                pam_id: state?.pam_id,
                                print_url: state.print_url,                                // digitisedData: rxDigitiseApiResponse,
                                type: "new",
                                isCustomSSRX : isCustomSSRX
                            };
                            const tokenData = getTokenData();
                            const clinic = getClinic(profile?.hospital_data);
                            const type = isCustomSSRX ? 1 : 0;
                            window.Moengage.track_event("TP_DigitizeSSRx", {
                                patient_id: patient_data?.patient_unique_id || "",
                                patient_name: patient_data?.pm_fullname || "",
                                  doctor_id: profile?.doctor_unique_id,
                                  doctor_name: profile?.um_name,
                                  doctor_specialty: profile?.dp_name,
                                  clinic_id: tokenData?.clinic_id,
                                  clinic_name: clinic?.hm_name,
                                  rx_id: state.tcm_id || " ",
                                  type: type,
                                  source: "print Preview page",
                                  device_details: navigator.userAgent
                              });
            
                            navigate(path, { state: navState });
                        } catch (error) {
                            console.error('Error in handleDigitiseRx:', error);
                        }
                    }
                } else {
                    typeof action?.payload?.data?.error === 'object' ?
                        errorMessage(action?.payload?.data?.error?.description)
                        :
                        errorMessage(action?.payload?.data?.message)
                }
            } else {
                errorMessage(action.payload.message)
            }
        }
    };

    // Function to update rxDigitize parameter in the URL
    const updateRxDigitizeInUrl = (url, showDigitalRx) => {
        const urlObj = new URL(url);

        urlObj.searchParams.delete('voiceRxDigitize');

        if (showDigitalRx) {
            urlObj.searchParams.set('rxDigitize', 'true');
            setButtonText("Send Digital Rx to WhatsApp")
        } else {
            // Remove rxDigitize parameter if showDigitalRx is false/null to keep the URL unchanged
            urlObj.searchParams.delete('rxDigitize');
            setButtonText("Send Written Rx to WhatsApp")
        }

        // setPrintUrl(urlObj.toString());
        return urlObj.toString();
    };

    // Effect to update printUrl when showDigitalRx changes
    useEffect(() => {
        if (printUrl) {
            // Only modify the URL if showDigitalRx is true, else keep printUrl unchanged
            const updatedUrl = updateRxDigitizeInUrl(printUrl, showDigitalRx);
            setPreviewUrl(updatedUrl);
            setPrintUrl(updatedUrl);
        }
    }, [showDigitalRx]);

    const shouldSkipAutoFetch = Boolean(currentSessionRx) && useSessionRx;
    const {
        printBlob: generatedPrintBlob,
        isGenerating: isPdfGenerating,
        error: printPayloadError,
    } = usePrintPayloadPdf({
        printUrl,
        selectedLang,
        payloadOverride: null,
        skipFetch: shouldSkipAutoFetch,
        isCvtExtHosAccessableFromGB,
    });

    useEffect(() => {
        if (generatedPrintBlob) {
            if (!useSessionRx) {
                setPrintBlob(generatedPrintBlob);
                setCurrentSessionRx(generatedPrintBlob);
            }
        }
    }, [generatedPrintBlob, useSessionRx]);

    useEffect(() => {
        if (useSessionRx && currentSessionRx) return;
        if (printPayloadError) {
            message.error("Failed to load prescription data.");
        }
    }, [printPayloadError, useSessionRx, currentSessionRx]);

    const handleLanguageSelect = useCallback((data) => {
        const newUrl = buildUrlWithLanguage(basePrintUrl, data);
        const urlWithDigitize = updateRxDigitizeInUrl(newUrl, showDigitalRx);
        setPrintUrl(urlWithDigitize);
        setPreviewUrl(urlWithDigitize);
        setSelectedLang(data);
        setUseSessionRx(false);
        setCurrentSessionRx(null);
    }, [basePrintUrl, showDigitalRx]);


    const configurePrintUrl = async () => {
        var sendData = {
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
            tcm_id: state.tcm_id,
            configurePrintSetting: true
        }
        const action = await dispatch(viewCaseManager(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            navigate('/configure_print_setting', { state: { ...state, caseManagerData: action.payload , smartRxFile, from: "/print-smart-rx" , dentalData: editedData?.dynamicFields?.[0]?.dentalData } })
        } else {
            errorMessage(action.error)
        }
    }

    const handleSendToWhatsapp = async () => {
        const body = {
          tcm_id: state?.tcm_id,
          pm_contact_no: state?.patient_data?.pm_contact_no,
          change_mobile_number: false,
          patient_unique_id: state?.patient_data?.patient_unique_id,
          hospital_business_id: tokenData?.hospital_business_id,
          um_id: tokenData?.user_id,
          ...(showDigitalRx && { isRxDigitize: "true" }),
        };
    
        setIsLoading(true);
        setButtonText("Sending...");
        try {
            const response = await api.post(
              WHATS_APP_API,
              body,
              baseUrl
            );
            if (response.message) {
                setButtonText("Successfully Sent");

                // After 2-3 seconds, reset the button text back to "Send to WhatsApp again"
                setTimeout(() => {
                    setButtonText("Send to WhatsApp again");
                }, 3000);
            } else {
                setButtonText("Send to WhatsApp");
            }
          } catch (error) {
                errorMessage(WTSAP_ERR_MESSAGE);
          } finally {
                setIsLoading(false);
        }
    };

    const handleEditRxClick = async() => {
        var sendData = {
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
            tcm_id: state.tcm_id
        }
        try {
            const action = await dispatch(viewCaseManager(sendData));

            if (action.meta.requestStatus === "fulfilled") {
                if (showDigitalRx) {
                    const response = await fetchRxDigitisedData();
                    const isCustomSSRX = Boolean(viewCaseManagerData?.isCustomSSRX === "1");
                    if(response){
                        navigate("/smart-rx-digitise", {
                            state: {
                                patient_data: patient_data,
                                smartRxFilesData: smartRxFile,
                                tcm_id: state.tcm_id,
                                print_url: state.print_url,
                                digitisedData: response?.data,
                                pam_id: state?.pam_id,
                                type:"edit",
                                isCustomSSRX : isCustomSSRX
                            },
                        })
                    }
                } else {
                    navigate("/smart-prescription", {
                        state: {
                            patient_data,
                            caseManagerData: action.payload,
                            smartRxFilesData: smartRxFile,
                            pam_id: state?.pam_id
                        },
                    });
                }
            } else {
                throw action.error;
            }
        } catch (error) {
            errorMessage(error);
        }
    };

    const handleViewDigitiseRx = async() => {
        const isCustomSSRX = Boolean(viewCaseManagerData?.isCustomSSRX === "1");
        navigate("/smart-rx-digitise", {
            state: {
                patient_data: patient_data,
                smartRxFilesData: smartRxFile,
                tcm_id: state.tcm_id,
                pam_id: state?.pam_id,
                print_url: state.print_url,
                digitisedData: rxDigitiseApiResponse,
                type:"new",
                isCustomSSRX : isCustomSSRX
            },
        })
    };

    const pdfFile = currentSessionRx || printBlob;
    const hasPdfBlob = Boolean(
        (pdfFile instanceof Blob && pdfFile.size > 0) ||
            (typeof pdfFile === "string" && pdfFile.length > 0)
    );
    const documentFile = pdfFile;
    const canRenderDocument = hasPdfBlob;

    return (
        <>
            <HeaderPrescriptionPrint patient_data={patient_data} tcm_id={state?.tcm_id} printUrl={printUrl} pam_id={state?.pam_id} isSnapRx={true} />
            <div className={`${isMobile ? 'p-0' : ''} w-100 bg-body wrapper2 prescription-wrapper`}>
                <Row gutter={{ xl: 40, lg: 0 }} justify="center">
                    <Col md={7} lg={7} xl={7}>
                        {isMobile || isCvtExtHosAccessableFromGB ? '' : <div className="d-flex align-items-center justify-content-end h-38" onClick={configurePrintUrl}>
                            <i className="icon-setting me-2"></i>
                            <span className="text-decoration-underline fw-medium cursor-pointer"> Configure Print Setting </span>
                        </div>
                        }
                        <div className={`${!isMobile ? 'rounded-20px mt-20' : 'border-top-0 border-start-0 border-bottom-0'} border p-20 bg-white d-flex flex-column`}
                            style={{ height: !isMobile ? 'calc(100vh - 100px)' : 'calc(100vh - 60px)' }}>
                            <div>
                                {!isMobile || isCvtExtHosAccessableFromGB ? '' : <div className="d-flex align-items-center mb-14 h-38" onClick={configurePrintUrl}>
                                    <i className="icon-setting me-2"></i>
                                    <span className="text-decoration-underline fw-medium cursor-pointer"> Configure Print Setting </span>
                                </div>
                                }
                                <Button
                                    type="text"
                                    className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                    icon={<i className="icon-Print"></i>}
                                    onClick={() => (!isChrome && !isSafari) ? printInAppContent() : printContent()}
                                >
                                    <span className="fw-semibold">{showDigitalRx ? "Print Digital Prescription" : "Print Written Prescription"}</span>
                                    <i className="icon-right iconrotate180 ms-auto"></i>
                                </Button>
                                <Button
                                    type="text"
                                    className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                    icon={<i className="icon-download"></i>}
                                    onClick={() => !isChrome && !isSafari ? handleInAppDownload() : handleDownload()}
                                >
                                    <span className="fw-semibold">{showDigitalRx ? "Download Digital Rx" : "Download Written Rx"}</span>
                                    <i className="icon-right iconrotate180 ms-auto"></i>
                                </Button>
                               {/* { !isCvtExtHosAccessableFromGB && */}
                                    <Button
                                            type="text"
                                            className="btn btn-input btnicon20 align-items-center d-flex mb-3  btn-41 w-100"
                                            icon={<i className="icon-Edit"></i>}
                                            onClick={handleEditRxClick}
                                            loading={loading}
                                        >
                                            <span className="fw-semibold">{showDigitalRx ? "Edit Digital Rx" : "Edit Written Rx"}</span>
                                            <i className="icon-right iconrotate180 ms-auto"></i>
                                    </Button>
                               {/* } */}

                            </div>

                            {!isCvtExtHosAccessableFromGB && <div className="bg-body d-flex p-3 rounded-10px border">
                                <img src={wtsp} alt="Whatsapp Icon" className='align-self-baseline me-3' />
                                <div className="fontroboto title-common">
                                    <div className="fw-normal fontroboto mb-2">{showDigitalRx ? "Send this Digital Rx to" : "Send this Written Rx to "}</div>
                                    {patient_data !== undefined ? `WhatsApp +91 ${patient_data.pm_contact_no}` : '-'}
                                </div>
                            </div>}
                            { !isCvtExtHosAccessableFromGB &&
                                <button
                                className="btn btn-send-to-wtsap btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                onClick={handleSendToWhatsapp}
                                >
                                    {isLoading ? (
                                    <img src={loadingImg} alt="Loading..." width="25px" height="25px"/>
                                    ) : (
                                        buttonText
                                    )}
                                </button>
                            } 
                            
                            { isSmartSyncCVTAccessableFromGB && (
                                <>
                                    {showProgressbar && !isRxDigitiseComplete && (
                                        <div className="digitise-container d-flex p-3 rounded-10px">
                                            <div style={containerStyle}>
                                                <div ref={progressRef} style={progressStyle}></div>
                                            </div>
                                            <p className="digitise-header" style={{ padding: "16px 0" }}>
                                                {`${patient_data?.pm_fullname}'s Rx is getting Digitised!`}
                                            </p>
                                            <p className="digitise-info">
                                                Our AI engine is converting handwritten Rx into digital Rx. This may take up to 30 sec
                                            </p>
                                        </div>
                                    )}
                                    {!rxDigitiseApiResponse && !showProgressbar && smartRxFile?.length > 0 && state?.page !== "digitise" && (
                                        <div className="digitise-container p-3 rounded-10px">
                                            <div className="digitise-box-top">
                                                <img src={successIcon} alt="success" width="40px" height="40px" />
                                                <div>
                                                    <p className="digitise-header">
                                                        {`${patient_data?.pm_fullname}'s Digital Rx is ready!`}
                                                    </p>
                                                    <p className="digitise-info">
                                                        Digitise Rx to enhance patient care, streamline workflow, and unlock new revenue.
                                                        <button className="know-more-btn" onClick={handleDrawerCvtKnowMore}>
                                                            <span className="know-more-text" style={{
                                                                color:"rgba(255, 255, 255, 0.80) !important",
                                                                fontSize: "14px",
                                                                textDecoration: "underline",
                                                                textDecorationColor: "rgba(255, 255, 255, 0.80)"
                                                            }}>Know More</span>
                                                        </button>
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={handleDigitiseRx} className="digitise-btn">
                                                Digitise Rx Now <span>&#8594;</span> 
                                            </button>
                                        </div>
                                    )} 
                                    {isRxDigitiseComplete && (
                                        <div className="digitise-container p-3 rounded-10px">
                                            <div className="digitise-box-top">
                                                <img src={successIcon} alt="success" width="40px" height="40px" />
                                                <div>
                                                    <p className="digitise-header">
                                                        {`${patient_data?.pm_fullname}'s Digital Rx is ready!`}
                                                    </p>
                                                    <p className="digitise-info">
                                                        Digitise Rx to enhance patient care, streamline workflow, and unlock new revenue.
                                                        <button className="know-more-btn" onClick={handleDrawerCvtKnowMore}>
                                                            <span className="know-more-text" style={{
                                                                color:"rgba(255, 255, 255, 0.80) !important",
                                                                fontSize: "14px",
                                                                textDecoration: "underline",
                                                                textDecorationColor: "rgba(255, 255, 255, 0.80)"
                                                            }}>Know More</span>
                                                        </button>
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={handleViewDigitiseRx} className="digitise-btn">
                                                View Digitised Rx <span>&#8594;</span> 
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

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
                    </Col>
                    <Col md={17} lg={17} xl={12}>
                        <div className={isMobile ? 'p-20' : ''}>
                            <div className="d-flex align-itms-center justify-content-between">
                                <div className="titleprint">Preview</div>
                                <div className="d-flex align-items-center flex-wrap gap-3">
                                    { showDigitalWrittenToggle && isSmartSyncCVTAccessableFromGB && state?.page !== "prescription" &&
                                        <div>
                                            <button className={`digital-btn ${!showDigitalRx ? "digitise-toggle-btn" : "active-digitise-toggle-btn"}`} onClick={() => { setCurrentSessionRx(null); setPrintBlob(null); setShowDigitalRx(true); }}>Digital Rx</button>
                                            <button className={`written-btn ${showDigitalRx ? "digitise-toggle-btn" : "active-digitise-toggle-btn"}`} onClick={() => { setCurrentSessionRx(null); setPrintBlob(null); setShowDigitalRx(false); }}>Written Rx</button>
                                        </div>
                                    }
                                    {!(!rxDigitiseApiResponse && !showProgressbar && smartRxFile?.length > 0 && state?.page !== "digitise") && (
                                    <Select
                                        placeholder=""
                                        className="appointmentselect"
                                        value={LANGUAGE_LIST.find(item => item.value == selectedLang)}
                                        onSelect={handleLanguageSelect}
                                        options={LANGUAGE_LIST}
                                    />
                                    )}
                                </div>
                            </div>
                            <div className="rounded-20px bg-white mt-20 overflow-hidden">

                                <div ref={divRef} className="printheight">
                                    <div ref={printRef} className="position-relative h-100">
                                        {isPdfGenerating && (
                                            <div
                                                className="d-flex flex-column align-items-center justify-content-center"
                                                style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    zIndex: 1,
                                                    background: "rgba(255, 255, 255, 0.6)",
                                                }}
                                            >
                                                <Spin />
                                                <div className="mt-2">PDF is getting generated</div>
                                            </div>
                                        )}
                                        {(canRenderDocument && !isPdfGenerating) ? (
                                            <Document
                                            key={showDigitalRx ? 'digital' : `written-${typeof documentFile === 'string' ? (documentFile || '').split('?')[0] : 'blob'}`}
                                            loading={<Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%" }} />}
                                            error={<div style={{ position: 'absolute', zIndex: 0, left: "42%", top: "50%" }} >{'Failed to load PDF file.'}</div>}
                                            file={documentFile}
                                            onLoadSuccess={onDocumentLoadSuccess}>
                                            {Array.apply(null, Array(numPages))
                                                .map((x, i) => i + 1)
                                                .map((page) => (
                                                <Page
                                                    key={Math.random()}
                                                    className={printBlob ? 'react-pdf__Page_afterload' : null}
                                                    loading={null}
                                                    width={divWidth}
                                                    pageNumber={page}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                />
                                                ))}
                                            </Document>
                                        ) : null}
                                    </div>
                                    {/* keeping this code for future reference */}
                                    {/* { showDigitalRx && 
                                        <div className="digital-rx-info">
                                            <img src={cvtInfoIcon} alt="cvt-info-icon" />
                                            <span className="digital-rx-info-text"><span className="title-common">Note:</span>  This Digital Rx is for reference only and you can’t download or share with patients.</span>
                                        </div>
                                    } */}
                                </div> 
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>

            <ExpiredSubModal
                title={S_RX_DIGITIZATION}
                isSubModalOpen={isSubModalOpen}
                showHideSubModal={showHideSubModal} />

        </>
    );
}

export default SmartRxPreview;
