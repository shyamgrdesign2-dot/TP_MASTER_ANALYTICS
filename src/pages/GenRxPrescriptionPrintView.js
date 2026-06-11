import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button, Row, Col, Spin, Select, message } from "antd";
import { isMobile, isChrome, isSafari } from "react-device-detect";
import { saveAs } from "file-saver";
import { jwtDecode } from "jwt-decode";

import {
  errorMessage,
  getClinicName,
  isApollo,
  isValidMongoId,
  trackEvent,
  sendMessageToParent
} from "../utils/utils";
import api from "../api/services/axiosService";

import HeaderPrescriptionPrint from "../common/HeaderPrescriptionPrint";

import { GB_VOICE_RX_NEW_UI, WHATS_APP_API, WTSAP_ERR_MESSAGE, S_AMBIENT_VOICE_RX, S_VOICE_RX, LANGUAGE_LIST } from "../utils/constants";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../utils/constants";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import { useSelector, useDispatch } from "react-redux";

import { viewCaseManager } from "../redux/caseManagerSlice";
import { fetchPatientDefaultLanguage, updatePatientDefaultLanguage } from "../api/services/DefaultLanguageService";

import { pdfjs, Document, Page } from "react-pdf";
import { env } from "../EnvironmentConfig";
import { EVENTS } from "../utils/events";
import { usePrintPayloadPdf } from "../hooks/usePrintPayloadPdf";
import { ASSETS } from "../assets";
const {
  wtsp,
  loading_3: loadingImg,
} = ASSETS.images;

const worker = require("pdfjs-dist/build/pdf.worker.min.js");
pdfjs.GlobalWorkerOptions.workerSrc = worker;

let genRxMountCount = 0;
const buildUrlWithParams = (baseUrl, isAmbient) => {
  if (!baseUrl) return null;
  const url = new URL(baseUrl);
  url.searchParams.delete('voiceRxDigitize');
  url.searchParams.delete('ambientVoiceRxDigitize');
  if (isAmbient) {
    url.searchParams.set('ambientVoiceRxDigitize', 'true');
    url.searchParams.set('rxDigitize', 'false');
  } else {
    url.searchParams.set('voiceRxDigitize', 'true');
  }
  return url.toString();
};


function GenRxPrescriptionPrintView() {
  const divRef = useRef(null);
  const printRef = useRef();
  const sessionRxUrlRef = useRef(null);

  const { loading } = useSelector((state) => state.caseManager);
  const { profile, defaultPrintSettings } = useSelector((state) => state.doctors);
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const dispatch = useDispatch();

  const navigate = useNavigate();

  const location = useLocation();
  const { state } = location;

  // Detect a hard refresh on the first mount after document load.
  const isFirstMountAfterLoad = genRxMountCount === 0;
  useEffect(() => {
    genRxMountCount += 1;
  }, []);
  const navigationEntry = window?.performance?.getEntriesByType?.("navigation")?.[0];
  const didHardReload = navigationEntry?.type === "reload";
  const treatAsReload = didHardReload && isFirstMountAfterLoad;

  // If the page was reloaded, treat it as not coming from Configure Print Setting
  const fromConfigurePrintSetting = Boolean(state?.currentSessionRx) && !treatAsReload;
  const { patient_data, rxId, pam_id, isAmbientRx } = state || {};

  const initialLanguage =
    defaultPrintSettings?.default_language &&
    defaultPrintSettings?.default_language !== "English"
      ? defaultPrintSettings.default_language
      : 1;

  const [selectedLang, setSelectedLang] = useState(initialLanguage);
  const initialEncodedLang = btoa(initialLanguage.toString());

  const [printUrl, setPrintUrl] = useState(
    state !== undefined
      ? `${state.print_url}&pam_id=${pam_id}&lg=${initialEncodedLang}`
      : null
  );
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
  const [tokenData, setTokenData] = useState(null);
  const [divWidth, setDivWidth] = useState(0);
  const [numPages, setNumPages] = useState();
  const [printBlob, setPrintBlob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [buttonText, setButtonText] = useState("Send to WhatsApp");
  const baseUrl = { customBaseUrl: env.casemanager_api_url };

  useEffect(() => {
    setDivWidth(divRef.current?.offsetWidth);
  }, [divRef]);

  useEffect(() => {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setTokenData(decoded.result);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const getPatientDefaultLanguage = async () => {
    const res = await fetchPatientDefaultLanguage(patient_data?.patient_unique_id);
    if (res?.settings?.defaultLanguage) {
      setSelectedLang(res?.settings?.defaultLanguage);
    }
  };

  useEffect(() => {
    getPatientDefaultLanguage();
  }, []);

  useEffect(() => {
    if (!state?.print_url) return;
    const encodedData = btoa(selectedLang.toString());
    setPrintUrl(`${state.print_url}&pam_id=${pam_id}&lg=${encodedData}`);
  }, [selectedLang, state?.print_url, pam_id]);

  // When returning from Configure Print Setting with "Apply only on this Rx", state has hydrated Blob
  useEffect(() => {
    if (fromConfigurePrintSetting && state?.currentSessionRx !== undefined) {
      setCurrentSessionRx(state.currentSessionRx);
    }
  }, [fromConfigurePrintSetting, state?.currentSessionRx]);

  useEffect(() => {
    let isCancelled = false;
    const hydrateSessionPdf = async () => {
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
  }, [currentSessionRx]);

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

  const shouldSkipAutoFetch = Boolean(currentSessionRx) && fromConfigurePrintSetting;
  const {
    printBlob: generatedPrintBlob,
    error: printPayloadError,
  } = usePrintPayloadPdf({
    printUrl,
    selectedLang,
    payloadOverride: null,
    skipFetch: shouldSkipAutoFetch,
  });

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

  const handleDownload = async () => {
    setDownloadLoading(true);
    try {
      const sourceFile = printBlob || currentSessionRx;
      const pdfBlob = await asBlob(sourceFile);
      if (pdfBlob instanceof Blob) {
        saveAs(pdfBlob, `${Date.now()}.pdf`);
      } else {
        message.error("PDF is not ready yet.");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      // Handle errors gracefully, e.g., display an error message to the user
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleInAppDownload = async () => {
    // navigate(`/gen-rx-print/?url=${printUrl}&key=download`, {
    //   replace: true,
    //   state: state,
    // });
    // navigate(0, { replace: true });
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
      const file = new File(
        [pdfBlob],
        `${new Date().toISOString().split("T")[0]}.pdf`,
        {
          type: "application/pdf",
        },
      );
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

  const onSelect = useCallback(
    (data) => {
      const encodedData = btoa(data.toString());
      if (state?.print_url) {
        setPrintUrl(`${state.print_url}&pam_id=${pam_id}&lg=${encodedData}`);
      }
      setSelectedLang(data);
      updatePatientDefaultLanguage({
        patientId: patient_data?.patient_unique_id,
        default_language: data,
      });
      setCurrentSessionRx(null);
    },
    [state?.print_url, pam_id, patient_data?.patient_unique_id]
  );

  const handleSendToWhatsapp = async () => {
    const clinic_name = getClinicName(profile?.hospital_data);
    trackEvent("TP_VoiceRx_SendtoWhatsapp", {
      patient_contact: patient_data?.pm_contact_no || "",
      patient_id: patient_data?.patient_unique_id || "",
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name,
      rx_id: rxId,
    });
    const body = {
      tcm_id: state?.tcm_id,
      pm_contact_no: state?.patient_data?.pm_contact_no,
      change_mobile_number: false,
      patient_unique_id: state?.patient_data?.patient_unique_id,
      hospital_business_id: tokenData?.hospital_business_id,
      um_id: tokenData?.user_id,
      isVoiceRxDigitize: true,
    };

    setIsLoading(true);
    setButtonText("Sending...");
    try {
      const response = await api.post(WHATS_APP_API, body, baseUrl);
      if (response.message) {
        setButtonText("Successfully Sent");

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

  const configurePrintUrl = async () => {
    var sendData = {
      patient_unique_id:
        patient_data !== undefined ? patient_data.patient_unique_id : 0,
      tcm_id: state.tcm_id,
      configurePrintSetting: true
    };
    try {
      const action = await dispatch(viewCaseManager(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        if (state?.isAmbientRx) {
          window.TATVA_ACTIVE_VOICE_SERVICE = S_AMBIENT_VOICE_RX;
        } else {
          window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;
        }
        
        navigate('/configure_print_setting', { 
          state: { 
            ...state, 
            selectedLang: selectedLang, 
            caseManagerData: {
              ...action.payload, 
              patient_data: {
                ...action.payload.patient_data, 
                pm_id: patient_data?.pm_id
              }
            }, 
            pam_id: pam_id, 
            isAmbientRx: isAmbientRx,
            rxId: rxId || state?.rxId,
            from: "/gen-rx-print" 
          } 
        });
      } else {
        errorMessage(action.error);
      }
    } catch (error) {
      errorMessage(error);
    }
  };

  const handleEditRxClick = async () => {
    var sendData = {
      patient_unique_id:
        patient_data !== undefined ? patient_data.patient_unique_id : 0,
      tcm_id: state.tcm_id,
    };
    try {
      const action = await dispatch(viewCaseManager(sendData));

      if (action.meta.requestStatus === "fulfilled") {
        // Set the active voice service before navigating
        if (state?.isAmbientRx) {
          window.TATVA_ACTIVE_VOICE_SERVICE = S_AMBIENT_VOICE_RX;
        } else {
          window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;
        }
        
        navigate("/prescription", {
          state: {
            patient_data,
            caseManagerData: action.payload,
            ...(isVoiceRxNewFromGB && isValidMongoId(action.payload?.smart_prescription_filename || rxId)
              ? { isVoiceRxNewUiFlow: true }
              : {}),
          },
        });
      } else {
        throw action.error;
      }
    } catch (error) {
      errorMessage(error);
    }
  };

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

      // Clean up existing iframes
      document.querySelectorAll("iframe").forEach((iframe) => iframe.remove());

      // Create and configure iframe
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = blobURL;

      iframe.onerror = () => {
        URL.revokeObjectURL(blobURL);
        throw new Error("Failed to load print content");
      };

      iframe.onload = () => {
        try {
          // Small delay to ensure content loads
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
    // navigate(`/gen-rx-print/?url=${printUrl}&key=print`, {
    //   replace: true,
    //   state,
    // });
    // navigate(0, { replace: true });
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
      const file = new File(
        [pdfBlob],
        `${new Date().toISOString().split("T")[0]}.pdf`,
        {
          type: "application/pdf",
        },
      );
      const formData = new FormData();
      formData.append(file?.name, file);
      const { uploadDocsToAzure } = await import("./medicalRecords/service");
      const res = await uploadDocsToAzure(formData);
      const printUrl = res?.[0]?.url;
      sendMessageToParent(EVENTS.PRINT, { url: printUrl });
    } catch (error) {
      console.error("Error uploading PDF for print:", error);
    }
  };

  const pdfFile = currentSessionRx || printBlob;
  const hasPdfBlob = Boolean(
    (pdfFile instanceof Blob && pdfFile.size > 0) ||
      (typeof pdfFile === "string" && pdfFile.length > 0)
  );

  return (
    <>
      <HeaderPrescriptionPrint
        patient_data={patient_data}
        tcm_id={state?.tcm_id}
        printUrl={printUrl}
        pam_id={pam_id}
        isVoiceOrAmbientFlow={true}
      />
      <div
        className={`${
          isMobile ? "p-0" : ""
        } w-100 bg-body wrapper2 prescription-wrapper`}
      >
        <Row gutter={{ xl: 40, lg: 0 }} justify="center">
          <Col md={7} lg={7} xl={7}>
            {isMobile ? '' : <div className="d-flex align-items-center justify-content-end h-38" onClick={configurePrintUrl}>
              <i className="icon-setting me-2"></i>
              <span className="text-decoration-underline fw-medium cursor-pointer"> Configure Print Setting </span>
            </div>
            }
            <div
              className={`${
                !isMobile
                  ? "rounded-20px mt-20"
                  : "border-top-0 border-start-0 border-bottom-0"
              } border p-20 bg-white d-flex flex-column`}
              style={{
                height: !isMobile
                  ? "calc(100vh - 100px)"
                  : "calc(100vh - 60px)",
              }}
            >
              <div>
                {!isMobile ? '' : <div className="d-flex align-items-center mb-14 h-38" onClick={configurePrintUrl}>
                  <i className="icon-setting me-2"></i>
                  <span className="text-decoration-underline fw-medium cursor-pointer"> Configure Print Setting </span>
                </div>
                }
                <Button
                  type="text"
                  className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                  icon={<i className="icon-Print"></i>}
                  onClick={() =>
                    !isChrome && !isSafari
                      ? printInAppContent()
                      : printContent()
                  }
                >
                  <span className="fw-semibold">{"Print Prescription"}</span>
                  <i className="icon-right iconrotate180 ms-auto"></i>
                </Button>
                <Button
                  type="text"
                  className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                  icon={<i className="icon-download"></i>}
                  onClick={() =>
                    !isChrome && !isSafari
                      ? handleInAppDownload()
                      : handleDownload()
                  }
                  loading={downloadLoading}
                >
                  <span className="fw-semibold">{"Download Prescription"}</span>
                  <i className="icon-right iconrotate180 ms-auto"></i>
                </Button>
                <Button
                  type="text"
                  className="btn btn-input btnicon20 align-items-center d-flex mb-3  btn-41 w-100"
                  icon={<i className="icon-Edit"></i>}
                  onClick={handleEditRxClick}
                  loading={loading}
                >
                  <span className="fw-semibold">{"Edit Prescription"}</span>
                  <i className="icon-right iconrotate180 ms-auto"></i>
                </Button>
              </div>
              {!isApollo() && (
                <>
                  <div className="bg-body d-flex p-3 rounded-10px border">
                    <img
                      src={wtsp}
                      alt="Whatsapp Icon"
                      className="align-self-baseline me-3"
                    />
                    <div className="fontroboto title-common">
                      <div className="fw-normal fontroboto mb-2">
                        {"Send this Rx to Patients"}
                      </div>
                      {patient_data !== undefined
                        ? `WhatsApp +91 ${patient_data.pm_contact_no}`
                        : "-"}
                    </div>
                  </div>
                  <button
                    className="btn btn-send-to-wtsap btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                    onClick={handleSendToWhatsapp}
                  >
                    {isLoading ? (
                      <img
                        src={loadingImg}
                        alt="Loading..."
                        width="25px"
                        height="25px"
                      />
                    ) : (
                      buttonText
                    )}
                  </button>
                </>
              )}
            </div>
          </Col>
          <Col md={17} lg={17} xl={12}>
            <div className={isMobile ? "p-20" : ""}>
              <div className="d-flex align-itms-center justify-content-between">
                <div className="titleprint">Preview</div>
                <div className="d-flex align-items-center">
                  <label className="fontroboto">Select Language</label>
                  <Select
                    placeholder="English"
                    className="ms-3 appointmentselect"
                    value={LANGUAGE_LIST.find((item) => item.value == selectedLang)}
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
                        loading={
                          <Spin
                            style={{
                              position: "absolute",
                              zIndex: 0,
                              left: "50%",
                              top: "50%",
                            }}
                          />
                        }
                        error={
                          <div
                            style={{
                              position: "absolute",
                              zIndex: 0,
                              left: "42%",
                              top: "50%",
                            }}
                          >
                            {"Failed to load PDF file."}
                          </div>
                        }
                        file={pdfFile}
                        onLoadError={() => {
                          setCurrentSessionRx(null);
                        }}
                        onLoadSuccess={onDocumentLoadSuccess}
                      >
                        {Array.apply(null, Array(numPages))
                          .map((x, i) => i + 1)
                          .map((page) => (
                            <Page
                              key={Math.random()}
                              className={
                                printBlob ? "react-pdf__Page_afterload" : null
                              }
                              loading={null}
                              width={divWidth}
                              pageNumber={page}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          ))}
                      </Document>
                    ) : (
                      <Spin
                        style={{
                          position: "absolute",
                          zIndex: 0,
                          left: "50%",
                          top: "50%",
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default GenRxPrescriptionPrintView;
