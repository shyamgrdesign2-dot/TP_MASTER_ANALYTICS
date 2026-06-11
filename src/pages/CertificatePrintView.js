import React, { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
// import { Container, Navbar, Nav, Dropdown } from "react-bootstrap";
import { Col, Row, Button, message, Spin, Input } from "antd";
import { isMobile, browserName, osName, isTablet } from "react-device-detect";
import { saveAs } from 'file-saver';

import { inputToLabel, HTMLTransformer, removeLabelTags, errorMessage, removeBeforeWhiteSpace, sendMessageToParent } from "../utils/utils";

import { MESSAGE_KEY } from "../utils/constants";
import { ASSETS } from "../assets";

import HeaderCertificatePrint from "../common/HeaderCertificatePrint";

import { useSelector, useDispatch } from "react-redux";

import { addCertificate, viewPatientCertificate } from "../redux/doctorsSlice";
import { EVENTS } from "../utils/events";
import { printBlobInNewTab } from "./opdBilling/utils/helper";
import { pdfjs, Document, Page } from "react-pdf";
import MobileCreateCertificate from "./mobile/PatientDetails/components/MobileCreateCertificate";
import { useCertificatePayloadPdf } from "../hooks/useCertificatePayloadPdf";
import './CertificatePrintView.scss';
const worker = require('pdfjs-dist/build/pdf.worker.min.js')
pdfjs.GlobalWorkerOptions.workerSrc = worker
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//     "pdfjs-dist/build/pdf.worker.min.js",
//     import.meta.url
// ).toString();

let cpvMountCount = 0;

function CertificatePrintView() {
    const {
        endVisit: visitEnd,
        closeVisit: imgCloseVisit,
    } = ASSETS.images;

    const divRef = useRef(null);
    const sessionRxUrlRef = useRef(null);

    const {
        loading,
    } = useSelector((state) => state.caseManager);
    const dispatch = useDispatch();

    const navigate = useNavigate();

    const { state } = useLocation();
    const { patient_data, tcu_content_id, pms_default, tcu_title, tcu_content, viewable } = state

    const isFirstMountAfterLoad = cpvMountCount === 0;
    useEffect(() => {
        cpvMountCount += 1;
    }, []);
    const navigationEntry = window?.performance?.getEntriesByType?.("navigation")?.[0];
    const didHardReload = navigationEntry?.type === "reload";
    const treatAsReload = didHardReload && isFirstMountAfterLoad;
    const fromConfigurePrintSetting = Boolean(state?.fromConfigurePrintSetting) && !treatAsReload;

    const printUrl = state !== undefined ? `${state.certificate}` : null;

    const [title, setTitle] = useState('');
    const [divWidth, setDivWidth] = useState(0);
    const [numPages, setNumPages] = useState();
    const [printBlob, setPrintBlob] = useState(null);
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
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [addEditFlag, setAddEditFlag] = useState(false);
    const [showEditCertificate, setShowEditCertificate] = useState(false);
    const [editCertificateData, setEditCertificateData] = useState(null);
    const previewPdfUrlRef = useRef(null);

    const {
        printBlob: generatedPrintBlob,
        isGenerating: isCertificatePdfGenerating,
        error: certificatePayloadError,
    } = useCertificatePayloadPdf({
        printUrl,
        skipFetch: Boolean(currentSessionRx) && fromConfigurePrintSetting,
    });

    useEffect(() => {
        if (divRef.current) {
            setDivWidth(divRef.current.offsetWidth);
        }
    }, [divRef]);

    async function onDocumentLoadSuccess(successEvent) {
        setNumPages(successEvent?.numPages);
    }

    useEffect(() => {
        if (tcu_title !== undefined) {
            tcu_content_id && !pms_default ? setTitle(tcu_title) : setTitle(`${tcu_title} ${Math.floor(Math.random() * 90) + 10}`)
        }
    }, [tcu_title]);

    const onTitleChange = useCallback((e) => {
        setTitle(removeBeforeWhiteSpace(e.target.value));
    }, [title]);

    const onAddEditCertificateClick = async () => {
        var sendData = {
            id: tcu_content_id,
            pms_default: pms_default,
            title: title,
            content: removeLabelTags(HTMLTransformer(tcu_content))
        }

        const action = await dispatch(addCertificate(sendData))
        if (action.meta.requestStatus === "fulfilled") {
            setAddEditFlag(true)
            message.open({
                key: MESSAGE_KEY,
                type: '',
                className: 'message-appointment',
                content: (
                    <div className='d-flex align-items-center'>
                        <img src={visitEnd} className='me-3' />
                        <div>
                            <div className='title-common text-start fontroboto'>{`Template ${tcu_content_id && !pms_default ? 'Updated' : 'Saved'} successfully`}</div>
                        </div>
                        <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
                    </div>
                ),
                duration: 5,
            });
        } else {
            errorMessage(action.error)
        }
    }

    const printContent = async () => {
        const sourceBlob = currentSessionRx || printBlob;
        if (isMobile || osName == 'Linux') {
            printBlobInNewTab(sourceBlob);
        } else {
            if (!sourceBlob) return;
            var blobURL = URL.createObjectURL(sourceBlob);
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
        sendMessageToParent(EVENTS.PRINT, { url: printUrl });
        // navigate(`/certificate_print_view/?url=${printUrl}&key=print`, { replace: true, state: state })
        // navigate(0, { replace: true });
    };

    const handleDownload = async () => {
        const sourceBlob = currentSessionRx || printBlob;
        if (!sourceBlob) {
            return;
        }
        saveAs(sourceBlob, `${Date.now()}.pdf`);
    };

    const handleInAppDownload = async () => {
        // navigate(`/certificate_print_view/?url=${printUrl}&key=download`, { replace: true, state: state })
        // navigate(0, { replace: true });
        sendMessageToParent(EVENTS.DOWNLOAD, { url: printUrl });
    };

    const onEditCertificateClick = async () => {
        var sendData = {
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
            tcu_id: state.tcu_id
        }
        const action = await dispatch(viewPatientCertificate(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            if (isMobile && !isTablet) {
                // Phone: Open bottom sheet for editing
                setEditCertificateData(action.payload);
                setShowEditCertificate(true);
            } else {
                // Web: Navigate to certificate route
                navigate("/certificate", { replace: true, state: { patient_data: patient_data, certificate_data: action.payload } })
            }
        } else {
            errorMessage(action.error)
        }
    };

    const configurePrintUrl = async () => {
        var sendData = {
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
            tcu_id: state.tcu_id,
            configurePrintSetting: true
        }
        const action = await dispatch(viewPatientCertificate(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            navigate('/configure_print_setting', {
                state: {
                    ...state,
                    certificateData: action.payload,
                    from: "/certificate_print_view",
                    currentSessionRx: currentSessionRx || printBlob || null,
                }
            })
        } else {
            errorMessage(action.error)
        }
    }

    useEffect(() => {
        if (generatedPrintBlob) {
            if (!fromConfigurePrintSetting || !currentSessionRx) {
                setPrintBlob(generatedPrintBlob);
                setCurrentSessionRx(generatedPrintBlob);
            }
        }
    }, [generatedPrintBlob, fromConfigurePrintSetting, currentSessionRx]);

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
        const previewSource = currentSessionRx || printBlob;
        if (!previewSource) {
            if (previewPdfUrlRef.current) {
                URL.revokeObjectURL(previewPdfUrlRef.current);
                previewPdfUrlRef.current = null;
            }
            setPreviewPdfUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(previewSource);
        if (previewPdfUrlRef.current) {
            URL.revokeObjectURL(previewPdfUrlRef.current);
        }
        previewPdfUrlRef.current = objectUrl;
        setPreviewPdfUrl(objectUrl);
    }, [printBlob, currentSessionRx]);

    useEffect(() => {
        return () => {
            if (sessionRxUrlRef.current) {
                URL.revokeObjectURL(sessionRxUrlRef.current);
            }
            if (previewPdfUrlRef.current) {
                URL.revokeObjectURL(previewPdfUrlRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (fromConfigurePrintSetting && currentSessionRx) return;
        if (certificatePayloadError) {
            message.error("Failed to load certificate data.");
        }
    }, [certificatePayloadError, fromConfigurePrintSetting, currentSessionRx]);

    const showPreviewLoader =
        Boolean(printUrl) &&
        (isCertificatePdfGenerating || (!previewPdfUrl && !certificatePayloadError && !(fromConfigurePrintSetting && currentSessionRx)));

    return (
        <>
            <HeaderCertificatePrint state={state} viewable={viewable} />
            { (isMobile && !isTablet) ? (
                <div className="certificate-print-view-mobile">
                    {/* Actions Section - Mobile */}
                    <div className="certificate-actions-section">
                        <div className="certificate-actions-title">Actions</div>
                        <Button
                            type="text"
                            className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100 certificate-cta-btn"
                            icon={<i className="icon-Print"></i>}
                            onClick={() => {
                                (browserName == "Chrome WebView" || browserName == "WebKit") ? printInAppContent() : printContent()
                            }}
                        >
                            <span className="fw-semibold">Print Certificate</span>
                            <i className="icon-right iconrotate180 ms-auto"></i>
                        </Button>
                        <Button
                            type="text"
                            className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100 certificate-cta-btn"
                            icon={<i className="icon-download"></i>}
                            onClick={() => (browserName == "Chrome WebView" || browserName == "WebKit") ? handleInAppDownload() : handleDownload()}
                        >
                            <span className="fw-semibold">Download Certificate</span>
                            <i className="icon-right iconrotate180 ms-auto"></i>
                        </Button>
                        {viewable === undefined && (
                            <Button
                                type="text"
                                className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100 certificate-cta-btn"
                                icon={<i className="icon-Edit"></i>}
                                onClick={onEditCertificateClick}
                                loading={loading}
                            >
                                <span className="fw-semibold">Edit Certificate</span>
                                <i className="icon-right iconrotate180 ms-auto"></i>
                            </Button>
                        )}
                        
                        {viewable === undefined && (
                            <>
                                <hr className="my-4" />
                                <div className="fw-medium my-2 pt-2">Save as Template</div>
                                <div className="saveButton overflow-hidden">
                                    <Input className="popinput inputheight41 rounded-end-0" placeholder="Template Name" onChange={onTitleChange} value={title} disabled={addEditFlag} />
                                    {title?.length > 0 && (
                                        <Button className="h-auto ps-0 rounded-start-0" onClick={onAddEditCertificateClick} disabled={addEditFlag}>{`${tcu_content_id && !pms_default ? 'Update' : 'Save'}${addEditFlag && !pms_default ? 'd' : ''}`}</Button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Preview Section - Mobile */}
                    <div className="certificate-preview-section">
                        <div className="certificate-preview-title">Preview</div>
                        <div ref={divRef} className="certificate-preview-container">
                            <div className="certificate-pdf-wrapper">
                                {previewPdfUrl ? (
                                    <Document
                                        loading={<Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%" }} />}
                                        error={<div style={{ position: 'absolute', zIndex: 0, left: "42%", top: "50%", color: '#dc3545', fontFamily: 'Poppins' }} >{'Failed to load PDF file.'}</div>}
                                        file={previewPdfUrl}
                                        onLoadSuccess={onDocumentLoadSuccess}>
                                        {Array.apply(null, Array(numPages))
                                            .map((x, i) => i + 1)
                                            .map((page) => {
                                                return (
                                                    <Page
                                                        key={Math.random()}
                                                        className={printBlob ? 'react-pdf__Page_afterload' : null}
                                                        loading={null}
                                                        width={divWidth || 340}
                                                        pageNumber={page}
                                                        renderTextLayer={false}
                                                        renderAnnotationLayer={false}
                                                    />
                                                );
                                            })}
                                    </Document>
                                ) : showPreviewLoader ? (
                                    <Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%" }} />
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-100 bg-body wrapper2 prescription-wrapper">
                    {/* <img src={hey} alt="Hey" className='me-3 hey' /> */}
                    <Row gutter={{ xl: 40, lg: 0 }} justify="center">
                        <Col md={7} sm={7} xl={5}>

                            {viewable !== undefined ? <div className="d-flex align-items-center justify-content-end h-38" /> : <div className="d-flex align-items-center justify-content-end h-38" onClick={configurePrintUrl}>
                                <i className="icon-setting me-2"></i>
                                <span className="text-decoration-underline fw-medium cursor-pointer"> Configure Print Setting </span>
                            </div>
                            }
                            <div className="rounded-20px mt-20 border p-20 bg-white"
                                style={{ height: 'calc(100vh - 160px)' }}>
                                <div>
                                    {viewable === undefined && <div className="d-flex align-items-center mb-14 h-38" onClick={configurePrintUrl}>
                                        <i className="icon-setting me-2"></i>
                                        <span className="text-decoration-underline fw-medium cursor-pointer"> Configure Print Setting </span>
                                    </div>}
                                    <Button
                                        type="text"
                                        onClick={() => {
                                            (browserName == "Chrome WebView" || browserName == "WebKit") ? printInAppContent() : printContent()
                                        }}
                                        className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                        icon={<i className="icon-Print"></i>}
                                    >
                                        <span className="fw-semibold">Print Certificate</span>
                                        <i className="icon-right iconrotate180 ms-auto"></i>
                                    </Button>
                                    <Button
                                        type="text"
                                        className="btn btn-input btnicon20 align-items-center d-flex mb-3 btn-41 w-100"
                                        icon={<i className="icon-download"></i>}
                                        onClick={() => (browserName == "Chrome WebView" || browserName == "WebKit") ? handleInAppDownload() : handleDownload()}
                                    >
                                        <span className="fw-semibold">Download Certificate</span>
                                        <i className="icon-right iconrotate180 ms-auto"></i>
                                    </Button>
                                    {viewable === undefined && (
                                        <Button
                                            type="text"
                                            className="btn btn-input btnicon20 align-items-center d-flex btn-41 w-100"
                                            icon={<i className="icon-Edit"></i>}
                                            onClick={onEditCertificateClick}
                                            loading={loading}
                                        >
                                            <span className="fw-semibold">Edit Certificate</span>
                                            <i className="icon-right iconrotate180 ms-auto"></i>
                                        </Button>
                                    )}
                                </div>
                                {viewable === undefined && (
                                    <>
                                        <hr className="my-4" />
                                        <div className="fw-medium my-2 pt-2">Save as Template</div>
                                        <div className="saveButton overflow-hidden">
                                            <Input className="popinput inputheight41 rounded-end-0" placeholder="Template Name" onChange={onTitleChange} value={title} disabled={addEditFlag} />
                                            {title?.length > 0 && (
                                                <Button className="h-auto ps-0 rounded-start-0" onClick={onAddEditCertificateClick} disabled={addEditFlag}>{`${tcu_content_id && !pms_default ? 'Update' : 'Save'}${addEditFlag && !pms_default ? 'd' : ''}`}</Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </Col>
                        <Col md={17} sm={17} xl={12}>
                            <div>
                                <div className="d-flex align-itms-center justify-content-between">
                                    <div className="titleprint">Preview</div>
                                </div>
                                <div className="rounded-20px bg-white mt-20 overflow-hidden">
                                    <div ref={divRef} className="printheight">
                                        <div className="position-relative h-100">
                                            {previewPdfUrl ? (
                                                <Document
                                                    loading={<Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%" }} />}
                                                    error={<div style={{ position: 'absolute', zIndex: 0, left: "42%", top: "50%" }} >{'Failed to load PDF file.'}</div>}
                                                    file={previewPdfUrl}
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
                                            ) : showPreviewLoader ? (
                                                <Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%" }} />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            )}
            {/* Phone-only Edit Certificate bottom sheet (tablet uses /certificate like web) */}
            {(isMobile && !isTablet) && (
                <MobileCreateCertificate
                    visible={showEditCertificate}
                    onClose={() => {
                        setShowEditCertificate(false);
                        setEditCertificateData(null);
                    }}
                    patient_data={patient_data}
                    certificate_data={editCertificateData}
                />
            )}
        </>
    );
}

export default CertificatePrintView;
