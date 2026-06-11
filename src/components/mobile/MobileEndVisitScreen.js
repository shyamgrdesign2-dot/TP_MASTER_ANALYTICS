import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { isChrome, isSafari } from 'react-device-detect';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { jwtDecode } from 'jwt-decode';
import api from '../../api/services/axiosService';
import { env } from '../../EnvironmentConfig';
import {
  getClinic,
  getClinicName,
  getVoiceRxMoengageBasePayload,
  errorMessage,
  sendMessageToParent,
  trackEvent,
} from '../../utils/utils';
import { WHATS_APP_API, WTSAP_ERR_MESSAGE, S_AMBIENT_VOICE_RX, S_VOICE_RX, PERSISTANT_STORAGE_KEY_AUTH_TOKEN, MESSAGE_KEY } from '../../utils/constants';
import { EVENTS } from '../../utils/events';
import { viewCaseManager } from '../../redux/caseManagerSlice';
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';

import './MobileEndVisitScreen.scss';
import { ASSETS } from "../../assets";
const {
  edit: editIcon,
  arrowDownload1: downloadIcon,
  whatsapp: whatsappIcon,
  printer: printIcon,
} = ASSETS.mobile;
const {
  loading_3: loadingImg,
  endVisit: visitEndIcon,
  closeVisit: closeVisitIcon,
} = ASSETS.images;

// Set up PDF.js worker (same as web version)
const worker = require('pdfjs-dist/build/pdf.worker.min.js');
pdfjs.GlobalWorkerOptions.workerSrc = worker;

// Build URL with params (same as web version)
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

function MobileEndVisitScreen({
  visible,
  onClose,
  prescriptionData,
  genRxDetails,
  patient_data,
  tcm_id,
  print_url,
  isAmbientRx = false,
  caseManagerData,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { profile, userId } = useSelector((state) => state.doctors);
  const { loading: caseManagerLoading } = useSelector((state) => state.caseManager);
  const pdfContainerRef = useRef(null);
  const printRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [whatsAppButtonText, setWhatsAppButtonText] = useState('Send to WhatsApp');
  const [viewCaseManagerData, setViewCaseManagerData] = useState(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [printUrl, setPrintUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [divWidth, setDivWidth] = useState(0);
  const [numPages, setNumPages] = useState(null);
  const [printBlob, setPrintBlob] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [tokenData, setTokenData] = useState(null);

  const baseUrl = { customBaseUrl: env.casemanager_api_url };

  // viewCaseManager expects numeric tcm_id; coerce so API never receives string
  const toNumericTcmId = (id) => {
    if (id == null) return null;
    if (typeof id === 'number' && !Number.isNaN(id)) return id;
    const parsed = parseInt(id, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  // Get token data (same as web version)
  useEffect(() => {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setTokenData(decoded.result);
      } catch (e) {
        // Error decoding token
      }
    }
  }, []);

  // Initialize viewCaseManagerData and print URL (with cancellation guard to prevent stale patient Rx)
  useEffect(() => {
    let cancelled = false;
    const initializeData = async () => {
      // Clear previous patient preview immediately so stale PHI does not render
      setViewCaseManagerData(null);
      setPrintUrl(null);
      setPreviewUrl(null);
      setPrintBlob(null);
      setNumPages(null);

      let finalCaseManagerData = null;
      let finalPrintUrl = null;

      if (caseManagerData && caseManagerData.tcm_id) {
        finalCaseManagerData = caseManagerData;
        finalPrintUrl = caseManagerData.print_url || caseManagerData.print_rx_url || print_url;
      } else if (tcm_id != null && patient_data?.patient_unique_id && visible) {
        // Fetch caseManagerData if we have tcm_id but no caseManagerData; viewCaseManager expects numeric tcm_id
        const numericTcmId = toNumericTcmId(tcm_id);
        if (numericTcmId == null) {
          finalPrintUrl = print_url;
        } else {
          if (!cancelled) setIsFetchingData(true);
          try {
            const sendData = {
              patient_unique_id: patient_data.patient_unique_id,
              tcm_id: numericTcmId,
            };
            const action = await dispatch(viewCaseManager(sendData));
            if (cancelled) return;
            if (action.meta.requestStatus === 'fulfilled' && action.payload) {
              finalCaseManagerData = action.payload;
              finalPrintUrl = action.payload.print_url || action.payload.print_rx_url || print_url;
            } else {
              finalPrintUrl = print_url;
            }
          } catch (error) {
            if (cancelled) return;
            finalPrintUrl = print_url;
          } finally {
            if (!cancelled) setIsFetchingData(false);
          }
        }
      } else {
        finalPrintUrl = print_url;
      }

      if (cancelled) return;
      // Set state (reset when missing to avoid stale PHI from previous patient)
      setViewCaseManagerData(finalCaseManagerData || null);

      // Build URL with params (same as web version)
      if (finalPrintUrl) {
        const urlWithParams = buildUrlWithParams(finalPrintUrl, isAmbientRx);
        setPrintUrl(urlWithParams);
        setPreviewUrl(urlWithParams);
      } else {
        setPrintUrl(null);
        setPreviewUrl(null);
        setPrintBlob(null);
        setNumPages(null);
      }
    };

    if (visible) {
      initializeData();
    }

    return () => {
      cancelled = true;
    };
  }, [caseManagerData, tcm_id, print_url, genRxDetails, profile, patient_data, visible, dispatch, isAmbientRx]);

  // Update div width (same as web version)
  useEffect(() => {
    if (pdfContainerRef.current) {
      setDivWidth(pdfContainerRef.current.offsetWidth);
    }
  }, [visible]);

  // PDF load success handler (same as web version)
  async function onDocumentLoadSuccess(successEvent) {
    setNumPages(successEvent?.numPages);
    const data = await successEvent.getData();
    const blob = new Blob([data], { type: 'application/pdf' });
    setPrintBlob(blob);
  }

  // Build caseManagerData for navigate: ensure smart_prescription_filename is set so
  // load-on-edit in MobileRxPad can fetch the correct Gen Rx (getGenRx(id)) and show updated data.
  const buildCaseManagerForEdit = (cm) => ({
    ...cm,
    smart_prescription_filename: cm?.smart_prescription_filename || genRxDetails?._id,
  });

  // Edit handler (same as web version)
  const handleEdit = async () => {
    const numericTcmId = toNumericTcmId(tcm_id);
    if (!viewCaseManagerData && numericTcmId != null && patient_data?.patient_unique_id) {
      // Fetch caseManagerData if not available; viewCaseManager expects numeric tcm_id
      try {
        const sendData = {
          patient_unique_id: patient_data.patient_unique_id,
          tcm_id: numericTcmId,
        };
        const action = await dispatch(viewCaseManager(sendData));
        if (action.meta.requestStatus === 'fulfilled' && action.payload) {
          if (isAmbientRx) {
            window.TATVA_ACTIVE_VOICE_SERVICE = S_AMBIENT_VOICE_RX;
          } else {
            window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;
          }
          navigate('/prescription', {
            state: {
              patient_data,
              caseManagerData: buildCaseManagerForEdit(action.payload),
              fromEndVisitEdit: true,
            },
          });
          onClose();
        }
      } catch (error) {
        errorMessage('Failed to load prescription for editing');
      }
    } else if (viewCaseManagerData) {
      if (isAmbientRx) {
        window.TATVA_ACTIVE_VOICE_SERVICE = S_AMBIENT_VOICE_RX;
      } else {
        window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;
      }
      navigate('/prescription', {
        state: {
          patient_data,
          caseManagerData: buildCaseManagerForEdit(viewCaseManagerData),
          fromEndVisitEdit: true,
        },
      });
      onClose();
    }
  };

  // Download handler (same as web version)
  const handleDownload = async () => {
    if (!printUrl) {
      errorMessage('Download URL is missing.');
      return;
    }

    setDownloadLoading(true);
    try {
      if (!isChrome && !isSafari) {
        // In-app download
        sendMessageToParent(EVENTS.DOWNLOAD, { url: printUrl });
      } else {
        // Browser download (same as web version)
        const response = await axios({
          url: printUrl,
          method: 'GET',
          responseType: 'blob',
        });
        const blob = new Blob([response.data], {
          type: response.headers['content-type'],
        });
        saveAs(blob, `${Date.now()}.pdf`);
      }
    } catch (error) {
      errorMessage('Failed to download prescription');
    } finally {
      setDownloadLoading(false);
    }
  };

  // WhatsApp handler (same as web version)
  const handleWhatsAppShare = async () => {
    if (!tcm_id || !patient_data) {
      errorMessage('Prescription data is missing.');
      return;
    }

    const clinic_name = getClinicName(profile?.hospital_data);
    const rxId = genRxDetails?._id || tcm_id;

    trackEvent('TP_APP_VoiceRx_SendtoWhatsapp', {
      patient_contact: patient_data?.pm_contact_no || '',
      patient_id: patient_data?.patient_unique_id || '',
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name,
      rx_id: rxId,
    });

    const body = {
      tcm_id: viewCaseManagerData?.tcm_id || tcm_id,
      pm_contact_no: patient_data?.pm_contact_no,
      change_mobile_number: false,
      patient_unique_id: patient_data?.patient_unique_id,
      hospital_business_id: tokenData?.hospital_business_id,
      um_id: tokenData?.user_id || userId,
      isVoiceRxDigitize: true,
    };

    setIsLoading(true);
    setWhatsAppButtonText('Sending...');
    try {
      const response = await api.post(WHATS_APP_API, body, baseUrl);
      if (response.message) {
        setWhatsAppButtonText('Successfully Sent');
        message.open({
          key: `${MESSAGE_KEY}-whatsapp`,
          type: '',
          className: 'message-appointment',
          content: (
            <div className="d-flex align-items-center">
              <img src={visitEndIcon} className="me-3" alt="Success" />
              <div>
                <div className="title-common-digitised text-start fontroboto">
                  Successfully Sent
                </div>
              </div>
              <img
                src={closeVisitIcon}
                className="ms-3"
                alt="Close"
                onClick={() => message.destroy(`${MESSAGE_KEY}-whatsapp`)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          ),
          duration: 3,
        });
        setTimeout(() => {
          setWhatsAppButtonText('Send to WhatsApp again');
        }, 3000);
      } else {
        setWhatsAppButtonText('Send to WhatsApp');
      }
    } catch (error) {
      errorMessage(WTSAP_ERR_MESSAGE);
      setWhatsAppButtonText('Send to WhatsApp');
    } finally {
      setIsLoading(false);
    }
  };

  // Print handler (same as web version)
  const handlePrint = async () => {
    if (!printUrl) {
      errorMessage('Print URL is missing.');
      return;
    }

    const clinic = getClinic();
    const clinic_name = getClinicName(profile?.hospital_data);
    const rxId = genRxDetails?._id || viewCaseManagerData?.tcm_id || tcm_id || '';
    const rxType = isAmbientRx ? 'ambient' : 'voice_rx';
    const printChannel = !isChrome && !isSafari ? 'in_app' : 'browser';
    trackEvent('TP_App_PrintRx', {
      ...getVoiceRxMoengageBasePayload({
        profile,
        userId,
        patientData: patient_data,
        clinic,
        segmentation: {
          surface: 'mobile_end_visit_preview',
          entry_point: 'print_icon',
        },
      }),
      patient_contact: patient_data?.pm_contact_no || '',
      patient_id: patient_data?.patient_unique_id || '',
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name,
      PRINTPAGE: 'Rx print preview page after end consultation',
      rx_id: rxId,
      rx_type: rxType,
      print_channel: printChannel,
    });

    if (!isChrome && !isSafari) {
      // In-app print
      sendMessageToParent(EVENTS.PRINT, { url: printUrl });
    } else {
      // Browser print using blob (same as web version)
      try {
        if (!printBlob) {
          errorMessage('Print content is not available.');
          return;
        }

        const blobURL = URL.createObjectURL(printBlob);

        // Clean up only this feature's prior print iframe
        const existingPrintFrame = document.getElementById('mobile-end-visit-print-frame');
        if (existingPrintFrame) {
          existingPrintFrame.remove();
        }

        // Create and configure iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'mobile-end-visit-print-frame';
        iframe.style.display = 'none';
        iframe.src = blobURL;

        iframe.onerror = () => {
          URL.revokeObjectURL(blobURL);
          errorMessage('Failed to load print content');
        };

        iframe.onload = () => {
          try {
            // Small delay to ensure content loads (same as web version)
            requestAnimationFrame(() => {
              iframe.focus();
              iframe.contentWindow.print();
              URL.revokeObjectURL(blobURL);
            });
          } catch (error) {
            URL.revokeObjectURL(blobURL);
            errorMessage('Failed to print prescription');
          }
        };

        document.body.appendChild(iframe);
      } catch (error) {
        errorMessage('Failed to print prescription');
      }
    }
  };

  const handleGoHome = () => {
    navigate('/');
    onClose();
  };

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="100%"
      className="mobile-end-visit-drawer"
      closable={false}
      maskClosable={false}
      destroyOnClose
    >
      <div className="mobile-end-visit-container">
        {/* Header */}
        <div className="end-visit-header">
          <div className="header-title">
            <span>Rx Preview</span>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="action-icon-btn"
              onClick={handleEdit}
              aria-label="Edit"
              disabled={caseManagerLoading}
            >
              <img src={editIcon} alt="Edit" />
            </button>
            <button
              type="button"
              className="action-icon-btn"
              onClick={handleDownload}
              aria-label="Download"
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <img src={loadingImg} alt="Loading" width="24" height="24" />
              ) : (
                <img src={downloadIcon} alt="Download" />
              )}
            </button>
            <button
              type="button"
              className="action-icon-btn"
              onClick={handleWhatsAppShare}
              disabled={isLoading}
              aria-label="Send to WhatsApp"
            >
              {isLoading ? (
                <img src={loadingImg} alt="Loading" width="24" height="24" />
              ) : (
                <img src={whatsappIcon} alt="WhatsApp" />
              )}
            </button>
            <button
              type="button"
              className="action-icon-btn"
              onClick={handlePrint}
              aria-label="Print"
            >
              <img src={printIcon} alt="Print" />
            </button>
          </div>
        </div>

        {/* PDF Preview Area - Same as web version (right side) */}
        <div className="end-visit-pdf-preview" ref={pdfContainerRef}>
          {isFetchingData || !previewUrl ? (
            <div className="pdf-loading">
              <Spin size="small" />
              <p>Loading prescription preview...</p>
            </div>
          ) 
          : (
            <div className="pdf-container">
              <div className="pdf-content" ref={printRef}>
                <Document
                  loading={
                    <div className="pdf-loading">
                      <Spin size="small" />
                    </div>
                  }
                  error={
                    <div className="pdf-error">
                      Failed to load PDF file.
                    </div>
                  }
                  noData={
                    <div className="pdf-error">
                      No PDF file specified.
                    </div>
                  }
                  file={previewUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                >
                  {Array.apply(null, Array(numPages))
                    .map((x, i) => i + 1)
                    .map((page) => (
                      <Page
                        key={page}
                        className={printBlob ? 'pdf-page-loaded' : ''}
                        loading={null}
                        width={divWidth || 362}
                        pageNumber={page}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    ))}
                </Document>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sheet with Go Home Button */}
        <div className="end-visit-bottom-sheet">
          <button
            type="button"
            className="go-home-button"
            onClick={handleGoHome}
          >
            Go Home
          </button>
        </div>
      </div>
    </Drawer>
  );
}

export default MobileEndVisitScreen;
