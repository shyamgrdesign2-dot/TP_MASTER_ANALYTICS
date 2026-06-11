import React, { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
// import { Container, Navbar, Nav, Dropdown } from "react-bootstrap";
import { Col, Row, Select, Button, message, Spin, Drawer } from "antd";
import { isMobile, browserName, isTablet } from "react-device-detect";
import axios from 'axios';
import { saveAs } from 'file-saver';
import { useReactToPrint } from 'react-to-print';

// import { PDFReader } from 'reactjs-pdf-reader';

import { errorMessage, getClinic, isIPad, isValidMongoId, sendMessageToParent, trackEvent } from "../utils/utils";
import { shouldUseNewPrescriptionUi } from "../utils/prescriptionRouting";

import HeaderPrescriptionPrint from "../common/HeaderPrescriptionPrint";

import { useSelector, useDispatch } from "react-redux";
import { useAccess } from "./vaccination/useAccess";

import { viewCaseManager } from "../redux/caseManagerSlice";

import { pdfjs, Document, Page } from "react-pdf";
import { getGynecDetails } from "../api/services/ApiGynec";
import { GB_HEALTH_CHECKUP_REPORT, GB_VOICE_RX_NEW_UI, GB_ZYDUS_USER, LANGUAGE_LIST, PATIENT_DETAILS_SIDEBAR_KEYS, PERSISTANT_STORAGE_KEY_AUTH_TOKEN, PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN, WHATS_APP_API, WTSAP_ERR_MESSAGE, ZYDUS_WHATS_APP_API } from "../utils/constants";
import { env } from "../EnvironmentConfig";
import CreateBill from "./opdBilling/components/createBill/CreateBill";
import RecentBills from "./opdBilling/components/recentBills/RecentBills";
import { checkToShowOpdBilling, fetchBillsByPatient, listAdvancedDepositByPatient } from "./opdBilling/service";
import moment from "moment";
import { useOpdBilling } from "./opdBilling/useOpdBilling";
import { setShouldShowOpdBilling } from "../redux/billingSlice";
import { printBlobInNewTab } from "./opdBilling/utils/helper";
import { getDecodedToken } from '../utils/localStorage';
import { assignCarePlan, updateCarePlanName } from './smartSync/services/carePlanService';
import api from '../api/services/axiosService';
import { fetchPatientDefaultLanguage, updatePatientDefaultLanguage } from "../api/services/DefaultLanguageService";
import { EVENTS } from "../utils/events";
import { uploadDocsToAzure } from "./medicalRecords/service";

import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useZydusWhatsapp } from "../hooks/useZydusWhatsapp";
import { usePrintPayloadPdf } from "../hooks/usePrintPayloadPdf";
import { ASSETS } from "../assets";
const {
  messageSent,
  wtsp,
  loading_3: loadingImg,
  healthCheckupReportOutline: HealthCheckupReportIcon,
} = ASSETS.images;

const worker = require('pdfjs-dist/build/pdf.worker.min.js')
pdfjs.GlobalWorkerOptions.workerSrc = worker
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//     "pdfjs-dist/build/pdf.worker.min.js",
//     import.meta.url
// ).toString();

let ppvMountCount = 0;
function PrescriptionPrintView() {

    const divRef = useRef(null);
    const printRef = useRef();
    const sessionRxUrlRef = useRef(null);

    const {
        loading,
    } = useSelector((state) => state.caseManager);
    const { userId, profile, defaultPrintSettings } = useSelector((state) => state.doctors);
    const { isOpdBillChecked } = useSelector((state) => state.billing);
    const { isOpdBillingAccessable } = useOpdBilling();
    const dispatch = useDispatch();

    const navigate = useNavigate();
    const isHealthCheckupReportAccessableFromGB = useFeatureIsOn(GB_HEALTH_CHECKUP_REPORT);
    const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
    const isZydusWhatsappEnabled = useZydusWhatsapp();

    const { state } = useLocation();
    const { patient_data, pam_id, labParamsData: passedLabParamsData, zydusSelectedLabParams, labReportID, isVoiceRxNewUiFlow } = state;

    // Detect a hard refresh on the first mount after document load.
    const isFirstMountAfterLoad = ppvMountCount === 0;
    useEffect(() => {
        ppvMountCount += 1;
    }, []);
    const navigationEntry = window?.performance?.getEntriesByType?.("navigation")?.[0];
    const didHardReload = navigationEntry?.type === "reload";
    const treatAsReload = didHardReload && isFirstMountAfterLoad;

    // If the page was reloaded, treat it as not coming from Configure Print Setting
    const fromConfigurePrintSetting = Boolean(state?.fromConfigurePrintSetting) && !treatAsReload;

    const [selectedLang, setSelectedLang] = useState(defaultPrintSettings?.default_language && defaultPrintSettings?.default_language !== "English" ? defaultPrintSettings?.default_language : 1);
    const encodedData = btoa(selectedLang.toString());

    const [printUrl, setPrintUrl] = useState(state !== undefined ? `${state.print_url}&pam_id=${pam_id}&lg=${encodedData}` : null);
    const [printRxUrl, setPrintRxUrl] = useState(state !== undefined ? `${state.print_rx_url}` : null);
    const [currentSessionRx, setCurrentSessionRx] = useState(() => {
        if (!fromConfigurePrintSetting) {
            return null;
        }
        if (state?.currentSessionRx instanceof Blob) return state.currentSessionRx;
        if (typeof state?.currentSessionRx === "string" && state.currentSessionRx.length > 0) {
            return state.currentSessionRx; // object URL string from configure print setting
        }
        return null;
    });

    const [divWidth, setDivWidth] = useState(0);
    const [numPages, setNumPages] = useState();
    const [printBlob, setPrintBlob] = useState(null);

    const [gynecHistoryData, setGynecHistoryData] = useState(null);
    const [labParamsData, setLabParamsData] = useState([]);
    const [createBillDrawer, setCreateBillDrawer] = useState(false);
    const [recentBillDrawer, setRecentBillDrawer] = useState(false);
    const [isBackModalOpen, setIsBackModalOpen] = useState(false);
    const [patientBills, setPatientBills] = useState([]);
    const [advanceReceipts, setAdvanceReceipts] = useState([]);
    const [patientWalletBalance, setPatientWalletBalance] = useState(0);
    const [billsUpdateKey, setBillsUpdateKey] = useState(0);
    const {isGynaecHistoryAccessable} = useAccess();
    const {planDetails} = useSelector(state => state.subscription);

    const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false);
    const [whatsAppButtonText, setWhatsAppButtonText] = useState("Send to WhatsApp");
    const [billData, setBillData] = useState(null);

    const baseUrl = env.lab_params_api_url;

    useEffect(() => {
        setDivWidth(divRef.current?.offsetWidth);
    }, [divRef]);

    useEffect(() => {
        if(isGynaecHistoryAccessable){
            fetchGynecHistory();
        }
    }, [isGynaecHistoryAccessable]);
    
    const fetchGynecHistory = async () => {
        try {
            const data = await getGynecDetails(patient_data?.patient_unique_id, userId);
            setGynecHistoryData(data);
        } catch (error) {
            console.error('Error fetching gynec history:', error);
        }
    };

    const getLabParams = async () => {
        try {
            const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN)
            const cleanedToken = token.replace(/['"]+/g, '');
            const response = await axios.get(`${baseUrl}/api/v1/lab-parameters/results/${patient_data?.patient_unique_id}?today=true`, {
                headers: {
                    'Authorization': `Bearer ${cleanedToken}`,
                },
            });
            setLabParamsData(response.data?.data?.results || []);
        } catch (error) {
            console.error("Error fetching lab params:", error);
        }
      };

    const getPatientDefaultLanguage = async () => {
        const res = await fetchPatientDefaultLanguage(patient_data?.patient_unique_id);
        if (res?.settings?.defaultLanguage) {
            setSelectedLang(res?.settings?.defaultLanguage);
        }
    };

    useEffect(() => {
        getLabParams();
        getPatientDefaultLanguage();
    },[])

    useEffect(() => {
      if (!createBillDrawer) {
        getPatientBills();
      } else {
        setCurrentSessionRx(null);
      }
    }, [createBillDrawer]);

    useEffect(() => {
      if (!state?.print_url) {
        return;
      }
      const encodedData = btoa(selectedLang.toString());
      const nextUrl = `${state.print_url}&pam_id=${pam_id}&lg=${encodedData}`;
      if (nextUrl !== printUrl) {
        setPrintUrl(nextUrl);
      }
    }, [selectedLang, state?.print_url, pam_id, printUrl]);

    const shouldSkipAutoFetch = Boolean(currentSessionRx) && fromConfigurePrintSetting;
    const {
        printBlob: generatedPrintBlob,
        isGenerating: isPdfGenerating,
        error: printPayloadError,
    } = usePrintPayloadPdf({
        printUrl,
        selectedLang,
        isGynaecHistoryAccessable,
        payloadOverride: null,
        skipFetch: shouldSkipAutoFetch,
        zydusSelectedLabParams,
    });

    useEffect(() => {
        let isCancelled = false;
        const hydrateSessionPdf = async () => {
            if (!fromConfigurePrintSetting) return;
            if (typeof currentSessionRx !== "string" || !currentSessionRx.startsWith("blob:")) return;
            try {
                const res = await fetch(currentSessionRx);
                const blob = await res.blob();
                if (!isCancelled && blob instanceof Blob) {
                    setCurrentSessionRx(blob);
                }
            } catch (err) {
                console.error("Failed to restore session PDF from URL", err);
                if (!isCancelled) {
                    setCurrentSessionRx(null);
                }
            }
        };
        hydrateSessionPdf();
        return () => {
            isCancelled = true;
        };
    }, [fromConfigurePrintSetting, currentSessionRx]);

    useEffect(() => {
        if (typeof currentSessionRx === "string" && currentSessionRx.startsWith("blob:")) {
            sessionRxUrlRef.current = currentSessionRx;
        }
        if (currentSessionRx instanceof Blob && sessionRxUrlRef.current) {
            URL.revokeObjectURL(sessionRxUrlRef.current);
            sessionRxUrlRef.current = null;
        }
    }, [currentSessionRx]);

    useEffect(() => {
        return () => {
            if (sessionRxUrlRef.current) {
                URL.revokeObjectURL(sessionRxUrlRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (generatedPrintBlob) {
            if (!fromConfigurePrintSetting || !currentSessionRx) {
                setPrintBlob(generatedPrintBlob);
                setCurrentSessionRx(generatedPrintBlob);
            }
        }
    }, [generatedPrintBlob, fromConfigurePrintSetting, currentSessionRx]);

    useEffect(() => {
        if (fromConfigurePrintSetting && currentSessionRx) return;
        if (printPayloadError) {
            message.error("Failed to load prescription data.");
        }
    }, [printPayloadError, fromConfigurePrintSetting, currentSessionRx]);

    

    useEffect(() => {
        if (!isOpdBillChecked) {
            getShowOpdBilling();
        }
    }, []);

    const getShowOpdBilling = async () => {
        const res = await checkToShowOpdBilling();
        dispatch(setShouldShowOpdBilling(res));
    };

    const getPatientBills = async (_, sortParams = {}) => {
        const queryParams = {
            doctorIds: [userId],
            sortBy: sortParams.field || "date",
            sortOrder: sortParams.order || "asc",
            page: 1,
            limit: 25,
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            patientId: patient_data?.patient_unique_id,
            appointmentId: pam_id || patient_data?.pam_id,
        };
        const response = await fetchBillsByPatient(queryParams);
        if (response?.bills?.length > 0) {
          const billData = response?.bills?.map((bill) => ({
            ...bill,
            patient: response?.patient,
          }));
          setPatientBills(billData);
        }
        const patientAdvanceDeposit = await listAdvancedDepositByPatient(
          queryParams
        );
        setPatientWalletBalance(patientAdvanceDeposit?.summary?.totalAdvanceBalance);
        if (patientAdvanceDeposit?.receipts?.length > 0) {
          setAdvanceReceipts(patientAdvanceDeposit?.receipts);
        }
        // Increment key to force PDF reload
        setBillsUpdateKey(prev => prev + 1);
    };

    const handleCreateBillDrawer = useCallback(() => {
        const clinic = getClinic();
        trackEvent("TP_Billing_CreateBill", {
            patientName: patient_data?.pm_fullname,
            patientId: patient_data?.patient_unique_id,
            doctorSpeciality: profile?.dp_name,
            doctorId: profile?.doctor_unique_id,
            doctorContact: profile?.um_contact,
            source: "rx_preview",
            city: clinic?.hm_city,
            pincode: clinic?.hm_pincode,
            subscriptionStatus: planDetails?.currentPlanStatus
        })
        setCreateBillDrawer(!createBillDrawer);
        if (createBillDrawer) {
            setBillData(null);
        }
        if (recentBillDrawer) {
          setRecentBillDrawer(false);
        }
    }, [createBillDrawer]);

    const handleRecentBillDrawer = useCallback(() => {
      setRecentBillDrawer(!recentBillDrawer);
    }, [recentBillDrawer]);

    const showHideBackModal = () => {
      setIsBackModalOpen(!isBackModalOpen);
    };

    // const printContent = useReactToPrint({
    //     content: () => printRef.current,
    // });

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
        const isMobileDevice = isMobile || isTablet || isIPad();
        if (!printBlob && !currentSessionRx) {
            message.error("PDF is not ready yet.");
            return;
        }
        const pdfBlob = await asBlob(printBlob || currentSessionRx);
        if (!(pdfBlob instanceof Blob)) {
            message.error("PDF is not ready yet.");
            return;
        }

        if (isMobileDevice) {
            printBlobInNewTab(pdfBlob);
        } else {
            var blobURL = URL.createObjectURL(pdfBlob);
            // Remove all existing iframes
            document.querySelectorAll('iframe').forEach(function (iframe) {
                iframe.parentNode.removeChild(iframe);
            });
            var iframe = document.createElement('iframe'); //load content in an iframe to print later
            document.body.appendChild(iframe);
            iframe.style.display = 'none';
            iframe.src = blobURL;
            iframe.onload = function () {
                setTimeout(function () {
                    iframe.focus();
                    iframe.contentWindow.print();
                    // Revoke the Blob URL to avoid memory leaks
                    URL.revokeObjectURL(blobURL);
                }, 1);
            };
        }
    };

    const printInAppContent = async () => {
        // navigate(`/prescription_print_view/?url=${currentSessionRx || printUrl}&key=print`, { replace: true, state: state })
        // navigate(0, { replace: true });
        if (!printBlob && !currentSessionRx) {
            message.error("PDF is not ready yet.");
            return;
        }
        const pdfBlob = await asBlob(printBlob || currentSessionRx);
        if (!(pdfBlob instanceof Blob)) {
            message.error("PDF is not ready yet.");
            return;
        }
        const file = new File([pdfBlob], `${new Date().toISOString().split("T")[0]}.pdf`, {
          type: "application/pdf",
        });
        const formData = new FormData();
        formData.append(file?.name, file);
        const res = await uploadDocsToAzure(formData);
        const printUrl = res?.[0]?.url;
        sendMessageToParent(EVENTS.PRINT, { url: printUrl });
    };

    // const printContent = async () => {
    //     {(/Android/i.test(navigator.userAgent)) ? (
    //         window.open(printUrl, '_blank')
    //     ) : (
    //         <embed className="printBox" src={`${printUrl}#toolbar=0&navpanes=0&scrollbar=0`} height="100%" width="100%"></embed>
    //     )}
    //     const printWindow = await window.open('https://www.aeee.in/wp-content/uploads/2020/08/Sample-pdf.pdf');
    //     printWindow.print();
    // };

    const onSelect = useCallback(
        (data) => {
            setSelectedLang(data);
            updatePatientDefaultLanguage({
              patientId: patient_data?.patient_unique_id,
              default_language: data,
            });
            // Keep the configured PDF intact when returning from Configure Print Settings
            if (!fromConfigurePrintSetting) {
              setCurrentSessionRx(null);
            }
        },
        [selectedLang, printUrl, fromConfigurePrintSetting]
    );

    const handleDownload = async () => {
        try {
            const pdfBlob = await asBlob(printBlob || currentSessionRx);
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
        // navigate(`/prescription_print_view/?url=${currentSessionRx || printUrl}&key=download`, { replace: true, state: state })
        // navigate(0, { replace: true });
        if (!printBlob && !currentSessionRx) {
            message.error("PDF is not ready yet.");
            return;
        }
        const pdfBlob = await asBlob(printBlob || currentSessionRx);
        if (!(pdfBlob instanceof Blob)) {
            message.error("PDF is not ready yet.");
            return;
        }
        const file = new File([pdfBlob], `${new Date().toISOString().split("T")[0]}.pdf`, {
          type: "application/pdf",
        });
        const formData = new FormData();
        formData.append(file?.name, file);
        const res = await uploadDocsToAzure(formData);
        const printUrl = res?.[0]?.url;
        sendMessageToParent(EVENTS.DOWNLOAD, { url: printUrl });
    };

    const onEditPrescriptionClick = async () => {
        // Best-effort: sync care plan assignment/update based on available info
        await syncCarePlanAssignmentIfNeeded();
        var sendData = {
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
            tcm_id: state.tcm_id
        }
        const action = await dispatch(viewCaseManager(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            navigate("/prescription", { replace: true, state: { patient_data: patient_data, caseManagerData: action.payload, ...(shouldUseNewPrescriptionUi(action.payload, isVoiceRxNewFromGB) ? { isVoiceRxNewUiFlow: true } : {}) } })
        } else {
            errorMessage(action.error)
        }
    };

    const syncCarePlanAssignmentIfNeeded = async () => {
        try {
            // Gather identities
            const decoded = getDecodedToken();
            const tokenData = decoded?.result;
            const hm_id = tokenData?.clinic_id;
            const um_id = tokenData?.user_id;
            const tcm_id = state?.tcm_id;

            // If caller passed a selected care plan in navigation state, prefer it
            const selectedPlan = state?.selectedCarePlan || state?.carePlan || null;
            const plan_id = selectedPlan?.plan_id; // expected UUID for assignment API
            const plan_name = selectedPlan?.plan_name || state?.care_plan_name || null;

            // Update when editing an existing consultation and we have a name to update
            if (tcm_id && plan_name) {
                await updateCarePlanName(parseInt(tcm_id), plan_name);
                return;
            }

            // Otherwise, if we have enough info to create an assignment, do it
            if (!tcm_id && plan_id && patient_data?.patient_unique_id && um_id && hm_id) {
                await assignCarePlan({
                    plan_id,
                    um_id,
                    patient_unique_id: patient_data.patient_unique_id,
                    hm_id,
                });
            }
            // If we don't have sufficient info, skip silently
        } catch (err) {
            console.error('CarePlan sync (assign/update) failed:', err);
        }
    };

    const handleZydusSendToWhatsapp = async () => {
        const decodedToken = getDecodedToken();
        const tokenData = decodedToken?.result;
        if (String(tokenData?.hospital_business_id) !== String(env.zydus_business_id)) {
            return;
        }
        if (!patient_data?.patient_unique_id) {
            errorMessage("Patient unique ID is required");
            return;
        }
        const pm_pid = patient_data?.pm_pid;
        if (!pm_pid) {
            errorMessage("Patient ID (pm_pid/mrno/pm_id) is required");
            return;
        }
        if (!state?.tcm_id) {
            errorMessage("TCM ID is required");
            return;
        }
        const body = {
            patient_unique_id: parseInt(patient_data.patient_unique_id),
            pm_pid: String(pm_pid),
            tcm_id: parseInt(state.tcm_id)
        };
        setIsWhatsAppLoading(true);
        setWhatsAppButtonText("Sending...");
        try {
            const zydusToken = localStorage.getItem(PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN);
            const parsedZydusToken = zydusToken ? JSON.parse(zydusToken) : null;
            const response = await api.post(ZYDUS_WHATS_APP_API, body, { 
                customBaseUrl: env.casemanager_api_url,
                headers: {
                    'Authorization': `Bearer ${parsedZydusToken}`
                }
            });
            if (response.status === true && response.data) {
                setWhatsAppButtonText("Successfully Sent");
                setTimeout(() => {
                    setWhatsAppButtonText("Send to WhatsApp again");
                }, 3000);
            } else if (response.status === true && response.data === "invalid data") {
                console.error("API returned invalid data error:", response);
                errorMessage("Invalid data format. Please check patient information.");
                setWhatsAppButtonText("Send to WhatsApp");
            } else {
                setWhatsAppButtonText("Send to WhatsApp");
            }
        } catch (error) {
            console.error("WhatsApp API error:", error);
            // Handle 401 error by fetching new Zydus token
            if (error.response?.status === 401) {
                try {
                    // Import the ictAuthToken function
                    const { ictAuthToken } = await import('../redux/appointmentsSlice');
                    const action = await dispatch(ictAuthToken());
                    if (action.meta.requestStatus === "fulfilled") {
                        await localStorage.setItem(
                            PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN,
                            JSON.stringify(action.payload.tokenNo)
                        );
                        // Retry the WhatsApp call
                        const retryResponse = await api.post(ZYDUS_WHATS_APP_API, body, { 
                            customBaseUrl: env.casemanager_api_url,
                            headers: {
                                'Authorization': `Bearer ${action.payload.tokenNo}`
                            }
                        });
                        if (retryResponse.status === true && retryResponse.data) {
                            setWhatsAppButtonText("Successfully Sent");
                            setTimeout(() => {
                                setWhatsAppButtonText("Send to WhatsApp again");
                            }, 3000);
                        } else {
                            errorMessage("Failed to send WhatsApp message");
                            setWhatsAppButtonText("Send to WhatsApp");
                        }
                    } else {
                        errorMessage("Failed to authenticate with Zydus");
                        setWhatsAppButtonText("Send to WhatsApp");
                    }
                } catch (tokenError) {
                    console.error("Token refresh error:", tokenError);
                    errorMessage("Authentication failed");
                    setWhatsAppButtonText("Send to WhatsApp");
                }
            } else {
                errorMessage(WTSAP_ERR_MESSAGE);
                setWhatsAppButtonText("Send to WhatsApp");
            }
        } finally {
            setIsWhatsAppLoading(false);
        }
    };

    // function onDocumentLoadSuccess({ numPages }) {
    //     setNumPages(numPages);
    // }
    async function onDocumentLoadSuccess(successEvent) {
        setNumPages(successEvent?.numPages);
    }

    const configurePrintUrl = async () => {
        
        var sendData = {
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
            tcm_id: state.tcm_id,
            configurePrintSetting: true
        }
        const action = await dispatch(viewCaseManager(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            navigate('/configure_print_setting', { state: { ...state, selectedLang: selectedLang, caseManagerData: {...action.payload, patient_data: {...action.payload.patient_data, pm_id: patient_data?.pm_id}, gynecHistoryData, labParamsData, zydusSelectedLabParams: zydusSelectedLabParams}, pam_id: pam_id, from: "/prescription_print_view" } })
        } else {
            errorMessage(action.error)
        }
    }

    const pdfFile = currentSessionRx || printBlob;
    const hasPdfBlob = Boolean(
        (pdfFile instanceof Blob && pdfFile.size > 0) ||
        (typeof pdfFile === "string" && pdfFile.length > 0)
    );

    return (
        <>
            <HeaderPrescriptionPrint patient_data={patient_data} tcm_id={state?.tcm_id} printUrl={printUrl} pam_id={pam_id} selectedLang={selectedLang} />
            <div className={`${isMobile ? 'p-0' : ''} w-100 bg-body wrapper2 prescription-wrapper`}>
                {/* <img src={hey} alt="Hey" className='me-3 hey' /> */}
                <Row gutter={{ xl: 40, lg: 0 }} justify="center">
                    <Col md={7} sm={7} xl={6}>

                        {isMobile ? '' : <div className="d-flex align-items-center justify-content-end h-38" onClick={configurePrintUrl}>
                            <i className="icon-setting me-2"></i>
                            <span className="text-decoration-underline fw-medium cursor-pointer"> Configure Print Setting </span>
                        </div>
                        }
                        <div className={`${!isMobile ? 'rounded-20px mt-20' : 'border-top-0 border-start-0 border-bottom-0'} border p-20 bg-white d-flex justify-content-between flex-column`}
                            style={{ height: !isMobile ? 'calc(100vh - 160px)' : 'calc(100vh - 60px)' }}>
                            <div>
                                {!isMobile ? '' : <div className="d-flex align-items-center mb-14 h-38" onClick={configurePrintUrl}>
                                    <i className="icon-setting me-2"></i>
                                    <span className="text-decoration-underline fw-medium cursor-pointer"> Configure Print Setting </span>
                                </div>
                                }
                                 {isOpdBillingAccessable && (<Button

                                    type="text"
                                    className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                    icon={<i className="icon-billings"></i>}
                                    onClick={patientBills?.length === 0 ? handleCreateBillDrawer : handleRecentBillDrawer}
                                >
                                    <span className="fw-semibold">{patientBills?.length > 0 ? "Create/ View Bill" : "Create Bill"}</span>
                                    <i className="icon-right iconrotate180 ms-auto"></i>
                                </Button>)}
                                <Button
                                    type="text"
                                    disabled={isPdfGenerating}
                                    onClick={() => {
                                        window.Moengage.track_event("print_select", {
                                            "language": LANGUAGE_LIST.find(e => e.value == selectedLang)?.label
                                        });
                                        (browserName == "Chrome WebView" || browserName == "WebKit") ? printInAppContent() : printContent()
                                    }}
                                    className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                    icon={<i className="icon-Print"></i>}
                                >
                                    <span className="fw-semibold">Print Prescription</span>
                                    <i className="icon-right iconrotate180 ms-auto"></i>
                                </Button>
                                <Button
                                    type="text"
                                    className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                    icon={<i className="icon-download"></i>}
                                    disabled={isPdfGenerating}
                                    onClick={() => (browserName == "Chrome WebView" || browserName == "WebKit") ? handleInAppDownload() : handleDownload()}
                                >
                                    <span className="fw-semibold">Download Prescription</span>
                                    <i className="icon-right iconrotate180 ms-auto"></i>
                                </Button>
                                <Button
                                    type="text"
                                    className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                    icon={<i className="icon-Edit"></i>}
                                    onClick={onEditPrescriptionClick}
                                    loading={loading}
                                >
                                    <span className="fw-semibold">Edit Prescription</span>
                                    <i className="icon-right iconrotate180 ms-auto"></i>
                                </Button>
                                {isHealthCheckupReportAccessableFromGB && <Button
                                    type="text"
                                    className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                    icon={<img src={HealthCheckupReportIcon} alt="Health Check-up Report" />}
                                    onClick={() => {
                                        navigate("/patient_details", { state: { patient_data: patient_data, sidebarKey: PATIENT_DETAILS_SIDEBAR_KEYS.HEALTH_CHECKUP_REPORT } });
                                    }}
                                >
                                    <span className="fw-semibold">Health Check-up Report</span>
                                    <i className="icon-right iconrotate180 ms-auto"></i>
                                </Button>}
                                {(() => {
                                    const decodedToken = getDecodedToken();
                                    const tokenData = decodedToken?.result;
                                    
                                    return tokenData?.hospital_business_id == env.zydus_business_id && isZydusWhatsappEnabled ? (
                                        <>
                                            <div className="bg-body d-flex p-3 rounded-10px border">
                                                <img src={wtsp} alt="Whatsapp Icon" className='align-self-baseline me-3' />
                                                <div className="fontroboto title-common">
                                                    <div className="fw-normal fontroboto mb-2">Send this Written Rx to</div>
                                                    {patient_data !== undefined ? `WhatsApp +91 ${patient_data.pm_contact_no}` : '-'}
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-send-to-wtsap btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                                onClick={handleZydusSendToWhatsapp}
                                            >
                                                {isWhatsAppLoading ? (
                                                    <img src={loadingImg} alt="Loading..." width="25px" height="25px" />
                                                ) : (
                                                    whatsAppButtonText
                                                )}
                                            </button>
                                        </>
                                    ) : null;
                                })()}
                            </div>
                            {/* <div className="bg-body d-flex p-3 rounded-10px border">
                                <img src={messageSent} alt="whatsapp Message" className='align-self-baseline me-3' />
                                <div className="fontroboto title-common">
                                    <div className="fw-normal fontroboto mb-2">WhatsApp Sent to </div>
                                    {patient_data !== undefined ? `+91 ${patient_data.pm_contact_no}` : '-'}
                                </div>
                            </div> */}
                        </div>
                    </Col>
                    <Col md={17} sm={17} xl={12}>
                        <div className={isMobile ? 'p-20' : ''}>
                            <div className="d-flex align-itms-center justify-content-between">
                                <div className="titleprint">Preview</div>
                                <div className="d-flex align-items-center">
                                    <label className="fontroboto">Select Language</label>
                                    <Select placeholder="English" className='ms-3 appointmentselect'
                                        value={LANGUAGE_LIST.find(item => item.value == selectedLang)}
                                        onSelect={onSelect}
                                        options={LANGUAGE_LIST}
                                    />
                                </div>
                            </div>
                            <div className="rounded-20px bg-white mt-20 overflow-hidden">
                                <div ref={divRef} className="printheight">
                                    <div ref={printRef} className="position-relative h-100">
                                        {hasPdfBlob ? (
                                            <Document
                                                key={`${currentSessionRx ? 'session' : 'generated'}-${billsUpdateKey}`}
                                                loading={<Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%" }} />}
                                                error={<div style={{ position: 'absolute', zIndex: 0, left: "42%", top: "50%" }} >{'Failed to load PDF file.'}</div>}
                                                file={pdfFile}
                                                onLoadError={(err) => {
                                                    console.error("PDF load error:", err);
                                                    setCurrentSessionRx(null);
                                                }}
                                                onLoadSuccess={onDocumentLoadSuccess}>
                                                {Array.apply(null, Array(numPages))
                                                    .map((x, i) => i + 1)
                                                    .map((page) => {
                                                        return (
                                                            <Page
                                                                key={Math.random()}
                                                                className={printBlob ? 'react-pdf__Page_afterload' : null}
                                                                loading={null}
                                                                width={divWidth}
                                                                pageNumber={page}
                                                                renderTextLayer={false}
                                                                renderAnnotationLayer={false}
                                                            />
                                                        );
                                                    })}
                                            </Document>
                                        ) : (
                                            <Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%" }} />
                                        )}
                                    </div>
                                    {/* <Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%" }} />
                                    <PDFReader key={selectedLang} ref={printRef} width={divWidth} showAllPage={true} url={`${printUrl}#toolbar=0&navpanes=0&scrollbar=0`} /> */}
                                    {/* <embed className="printBox" ref={printRef} src={`${printUrl}#toolbar=0&navpanes=0&scrollbar=0`} height="100%" width="100%"></embed> */}
                                    {/* <iframe
                                        src="https://pms-upgrade.azurewebsites.net/case_manager/pdf_casemanager_send.php?pdf_id=MTI3Njgx&p_id=U1QtMTAxOQ==&pu_id=NDA3OTIzNjg1MQ=#toolbar=0&navpanes=0&scrollbar=0"
                                        height="100%" width="100%"
                                        title="PDF Viewer"
                                    ></iframe> */}
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
                {createBillDrawer &&(<Drawer
                    closeIcon={false}
                    placement="right"
                    bodyStyle={{ backgroundColor: "white" }}
                    open={createBillDrawer}
                    onClose={showHideBackModal}
                    width="100%"
                    push={false}
                >
                    <CreateBill handleCreateBillDrawer={handleCreateBillDrawer} isBackModalOpen={isBackModalOpen} showHideBackModal={showHideBackModal} isRxPage={true} patientData={patient_data} editBillData={billData && Object.keys(billData).length > 0 ? {...billData, patient: {...billData?.patient, patientId: billData?.patientId || billData?.patient?.patientId}} : null} />
                </Drawer>)}
                {recentBillDrawer &&
                <Drawer
                    closeIcon={false}
                    placement="right"
                    open={recentBillDrawer}
                    onClose={handleRecentBillDrawer}
                    width="77%"
                    push={false}
                    >
                    <RecentBills 
                        handleRecentBillDrawer={handleRecentBillDrawer} 
                        handleCreateBillDrawer={handleCreateBillDrawer} 
                        patientBills={patientBills} 
                        getPatientBills={getPatientBills}
                        totalAdvanceBalance={patientWalletBalance}
                        patientData={patient_data}
                        billData={billData}
                        setBillData={setBillData}
                        createBillDrawer={createBillDrawer}
                        setCreateBillDrawer={setCreateBillDrawer}
                    />
                </Drawer>
            }
            </div>
        </>
    );
}

export default PrescriptionPrintView;
