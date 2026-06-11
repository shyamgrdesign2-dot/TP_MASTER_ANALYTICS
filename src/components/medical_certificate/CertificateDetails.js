import React, { useState, useEffect, useCallback } from "react";
import { Dropdown, Button, Drawer, Spin, message } from "antd";
import Card from 'react-bootstrap/Card';
import moment from "moment";
import { useNavigate } from 'react-router-dom';
import { isChrome, isSafari, isMobile, isTablet } from "react-device-detect";
import axios from "axios";

import { useSelector, useDispatch } from "react-redux";

import CreateCertificate from "./CreateCertificate";
import PdfThumbnail from "../../common/PdfThumbnail";
import { listPatientCertificate, deletePatientCertificate } from "../../redux/doctorsSlice";
import { errorMessage, sendMessageToParent } from "../../utils/utils";

import { MESSAGE_KEY } from "../../utils/constants";

import { EVENTS } from "../../utils/events";
import { renderCertificatePayloadToBlob } from "../../utils/certificatePrintPayload";
import { ASSETS } from "../../assets";
const notcertificate = ASSETS.images.notCertificate;
const emptyIllustration = ASSETS.mobile.emptyIllustration;
const {
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

function CertificateDetails({ patient_data, onCreateCertificateClick }) {

    const navigate = useNavigate();

    const { patientCertificateList, loading } = useSelector((state) => state.doctors);

    const dispatch = useDispatch();

    useEffect(() => {
        var sendData = {
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0
        }
        dispatch(listPatientCertificate(sendData));
    }, []);

    const [createCertificateDrawer, setCreateCertificateDrawer] = useState(false);

    const handleCreateCertificateDrawer = useCallback(() => {
        setCreateCertificateDrawer(!createCertificateDrawer)
    }, [createCertificateDrawer]);

    const toJsonOutputUrl = (url) => {
        if (!url) return url;
        try {
            const urlObj = new URL(url, window.location.origin);
            urlObj.searchParams.set("output", "json");
            return urlObj.toString();
        } catch (e) {
            const hasOutput = /(?:[?&])output=/.test(url);
            if (hasOutput) {
                return url.replace(/([?&])output=[^&]*/g, "$1output=json");
            }
            return `${url}${url.includes("?") ? "&" : "?"}output=json`;
        }
    };

    async function printContent(item) {
        const printUrl = item?.certificate;
        if (!printUrl) {
            return;
        }

        const popup = window.open("", "_blank");
        if (popup) {
            popup.document.title = "Generating Certificate";
            popup.document.body.innerHTML =
                "<div style='font-family: sans-serif; padding: 20px;'>Generating Certificate PDF...</div>";
        }

        const messageKey = `certificate-print-${item?.tcu_id || Date.now()}`;
        message.open({
            key: messageKey,
            type: "loading",
            content: "Generating certificate...",
            duration: 0,
        });

        try {
            const response = await axios.get(toJsonOutputUrl(printUrl));
            const payload = response?.data?.data;
            if (!payload) {
                throw new Error("Certificate payload missing.");
            }

            const blob = await renderCertificatePayloadToBlob(payload);
            if (!blob) {
                throw new Error("Failed to generate certificate PDF blob.");
            }

            const blobUrl = URL.createObjectURL(blob);
            if (popup) {
                popup.location.href = blobUrl;
            } else {
                window.open(blobUrl, "_blank");
            }
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

            message.open({
                key: messageKey,
                type: "success",
                content: "Certificate ready.",
                duration: 1.5,
            });
        } catch (error) {
            console.error("Certificate generation error:", error);
            if (popup && !popup.closed) {
                popup.close();
            }
            
            const errorMsg = error?.message?.includes("font") 
                ? "Failed to load certificate fonts. Please try again."
                : "Failed to generate certificate. Please try again.";
            
            message.open({
                key: messageKey,
                type: "error",
                content: errorMsg,
                duration: 3,
            });
        }
    }

    async function printInAppContent(item) {
        sendMessageToParent(EVENTS.PRINT, { url: item?.certificate });
    };

    const getMenuItems = (item) => {
        return [
            {
                label: <div onClick={() => !isChrome && !isSafari ? printInAppContent(item) : printContent(item)}>Print</div>,
                key: '1',
            },
            {
                label: <div
                    onClick={() => {
                        onDeleteClicked(item?.tcu_id)
                    }}>Delete</div>,
                key: '2',
            },
        ]
    };

    const onDeleteClicked = async (tcu_id) => {
        var sendData = {
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
            tcu_id: tcu_id
        }
        const action = await dispatch(deletePatientCertificate(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            message.open({
                key: MESSAGE_KEY,
                type: '',
                className: 'message-appointment',
                content: (
                    <div className='d-flex align-items-center'>
                        <img src={visitEnd} className='me-3' />
                        <div>
                            <div className='title-common text-start fontroboto'>{`Certificate has been successfully deleted`}</div>
                        </div>
                        <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
                    </div>
                ),
                duration: 5,
            });
        } else {
            errorMessage(action.error)
        }
    };

    return (
        <div className="appointment-wrap PatientDetailswrap m-0">
            <Card style={isMobile ? { border: 'none', backgroundColor: '#FAF8FD' } : {}}>
                <div className='p-20 overflow-y-auto' style={{ height: "calc(100vh - 117px)", ...(isMobile ? { padding: '16px' } : {}) }}>
                    {loading ? (
                        <div className='align-items-center text-center'>
                            <Spin />
                        </div>
                    ) : (
                        patientCertificateList?.length > 0 ? (
                            <div 
                                className={isMobile ? '' : 'd-flex flex-wrap'}
                                style={isMobile ? {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '12px',
                                    padding: 0
                                } : {}}
                            >
                                {patientCertificateList?.map((item, index) => {
                                    return (
                                        <div 
                                            key={index} 
                                            className={`certificate-box border ${isMobile ? '' : 'me-4 mb-4'}`}
                                            style={isMobile ? {
                                                width: '100%',
                                                margin: 0
                                            } : {}}
                                        >
                                            <div className="pfd-box d-flex justify-content-center align-items-center cursor-pointer"
                                                onClick={() => navigate('/certificate_print_view', { state: { ...item, viewable: true } })}>
                                                <PdfThumbnail pdfUrl={item?.certificate} index={index} thumbnailUrl={item?.thumbnailUrl} />
                                            </div>
                                            <div className="bg-selected leave-ui d-flex justify-content-between">
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <h5 className="fw-semibold m-0 text-start text-truncate" style={{ fontSize: '12px' }}>{item?.tcu_title}</h5>
                                                    <div className="text-start" style={{ fontSize: '10px', whiteSpace: 'pre-wrap', wordWrap: 'break-word', color: '#454551', fontWeight: 400, letterSpacing: '0.1px' }}>{moment(item?.tcu_created_date).format('DD MMM, YYYY, hh:mm A')}</div>
                                                </div>
                                                <Dropdown className='btn btn-outline btn-more certificate-more-btn p-0 mt-1'
                                                    menu={{
                                                        items: getMenuItems(item),
                                                    }}
                                                    trigger={['click']}>
                                                    <a onClick={(e) => e.preventDefault()}>
                                                        <i className='icon-More iconrotate270'></i>
                                                    </a>
                                                </Dropdown>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            (isMobile && !isTablet) ? (
                                // Mobile Empty State
                                <div className="certificate-empty-state-mobile">
                                    <div className="certificate-empty-state">
                                        <img
                                            src={emptyIllustration}
                                            alt="No certificate"
                                            className="certificate-empty-icon"
                                        />
                                        <div className="certificate-empty-message">
                                            No certificate created for this patient.
                                        </div>
                                        <Button
                                            type="primary"
                                            onClick={onCreateCertificateClick || handleCreateCertificateDrawer}
                                            className="btn btn-primary3 btn-text-white px-4 btn-41 certificate-empty-create-btn"
                                            style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                gap: "8px",
                                                width: "100%",
                                                maxWidth: "343px",
                                                marginTop: "24px",
                                            }}
                                        >
                                            <i className="icon-Add" style={{ fontSize: "18px" }} />
                                            Create New Certificate
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // Desktop Empty State
                                <div className="certificate-not d-flex justify-content-center flex-column align-items-center my-5 py-5">
                                    <img src={notcertificate} alt="not certificate" />
                                    <div className="text-center fs-14 text-main lh-base fw-normal fontroboto mb-20 mt-20">
                                        Certificate Not Found! <br />No certificate created for this patient.
                                    </div>
                                    <Button type="primary" onClick={handleCreateCertificateDrawer} className="btn px-4 btn-41">Create Certificate</Button>
                                </div>
                            )
                        )
                    )}

                    {/* Desktop Create Certificate Drawer - Only show when not using mobile handlers */}
                    {!onCreateCertificateClick && (
                        <Drawer
                            className="modalWidth-563" width="auto"
                            title="Create Certificate"
                            placement="right"
                            closable
                            open={createCertificateDrawer}
                            onClose={handleCreateCertificateDrawer}
                        >
                            <CreateCertificate handleCreateCertificateDrawer={handleCreateCertificateDrawer} patient_data={patient_data} replace={false} />
                        </Drawer>
                    )}
                </div>
            </Card>
        </div>
    )
}
export default React.memo(CertificateDetails);
