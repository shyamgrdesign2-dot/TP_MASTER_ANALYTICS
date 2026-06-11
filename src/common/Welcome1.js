import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Popover, Drawer, Button as AntButton } from "antd";
import Button from 'react-bootstrap/Button';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { useSelector } from "react-redux";

import ProfilePopover from './ProfilePopover';
import VideoModal from './VideoModal';
import CreateCertificate from '../components/medical_certificate/CreateCertificate';
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_ISCRIBE, GB_SNAP_RX, S_VOICE_RX, S_AMBIENT_VOICE_RX, PAID, PATIENT_DETAILS_SIDEBAR_KEYS, GB_SAVE_AS_DRAFT_RX, FETCH_SMART_RX, GB_TAB_RX, GB_VOICE_RX_FREE, GB_VOICE_RX_NEW_UI, GB_CVT_EXT_HOS, CLINIC_TARGET_STATUS } from '../utils/constants';
import { shouldUseNewPrescriptionUi } from '../utils/prescriptionRouting';
import { getClinicName, trackEvent, isVoiceRxFree, shouldMonetizationDisabled, isValidMongoId, getDraftMoengageDoctorAttributes } from '../utils/utils';
import { copyVoiceRx, copyAmbientRx, getAmbientRx, getGenRx } from '../api/services/ApiGenRx';
import { generateUniqueFileName, getCorrectedFileName } from '../pages/medicalRecords/utils/helper';
import { EVENTS } from '../utils/events';
import { getDecodedToken } from '../utils/localStorage';
import {
  getClinic,
  getTokenData,
  isZydus
} from "../utils/utils";
import api from '../api/services/axiosService';
import { env } from '../EnvironmentConfig';

import useTabletViewport from '../hooks/useTabletViewport';
import PrimaryActionButton from '../components/PrimaryActionButton';
import { useChikitsalay } from '../pages/chikitsalay/useChikitsalay';
import { ASSETS } from "../assets";
import { clinicTargetStatus } from '../pages/chikitsalay/service';
const {
  tubeIcon: playIcons,
  tutorialIcon: tutorial,
  draftPrimary: draftIcon,
} = ASSETS.images;

function Welcome1(props) {

    const [popOverVideo, setPopOverVideo] = useState(false);
    const [videoLink, setVideoLink] = useState(null);
    const fileInputRef = useRef(null);
    const isSmartSyncAccessableFromGB = useFeatureIsOn(
        GB_ISCRIBE
    );
    const isSnapRxAccessableFromGB = useFeatureIsOn(
        GB_SNAP_RX
    );
    const isTabRxAccessableFromGB = useFeatureIsOn(GB_TAB_RX);
    const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
    const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
    const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
    const tp_monetization_enable = !shouldMonetizationDisabled();
    const isSaveAsDraftRxAccessableFromGB = useFeatureIsOn(GB_SAVE_AS_DRAFT_RX);
    const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
    const isChikitsalayAccessable = useChikitsalay();

    const navigate = useNavigate();
    const { profile, videoList, patientCertificateList, userId } = useSelector((state) => state.doctors);
    const { allUploadedDocs } = useSelector(
        (state) => state.uploadDoc
    );
    const { planDetails } = useSelector((state) => state.subscription);
    const { reports: healthCheckupReports, healthReportConsultationsLoading } = useSelector((state) => state.healthCheckupReport);
    const { service_mappings } = planDetails || {};
    const VOICE_RX_planDetails = service_mappings?.find(
      (e) => e.service_name === S_VOICE_RX
    );
    const isVoiceRxPaid = VOICE_RX_planDetails?.plan_tier === PAID;
    const {
        locationPath,
        isMobile,
        patient_data,
        viewCaseManagerData,
        sidebarKey,
        filesData,
        setFilesData,
        handleUploadDocPopup,
        handleDrawerUploadDoc,
        abhaHeaderActions,
        patientAdmissionStatus,
        handleGenerateHealthCheckupReport
    } = props;

    const isDraftRx = viewCaseManagerData?.is_draft;
    
    const isTablet = useTabletViewport();

    const canRepeatDraftRx = isDraftRx && isSaveAsDraftRxAccessableFromGB;
    const canResumeDraftRx = canRepeatDraftRx && viewCaseManagerData?.doctor_data?.um_id === userId;

    const modifyFormat = useMemo(() => {
        if (viewCaseManagerData) {
            const data = moment(viewCaseManagerData.consultation_date).format('Do MMM')
            let first = data.split(' ')[0].slice(0, -2);
            let second = data.split(' ')[0].slice(-2);
            let third = data.split(' ')[1];
            return { first, second, third }
        } else {
            return null
        }
    }, [viewCaseManagerData])

    const [createCertificateDrawer, setCreateCertificateDrawer] = useState(false);
    const [voiceRxVersion, setVoiceRxVersion] = useState("");
    const isVoiceOrAmbientRx = useMemo(() => {
        return viewCaseManagerData?.smart_prescription_filename && 
               isValidMongoId(viewCaseManagerData.smart_prescription_filename);
    }, [viewCaseManagerData?.smart_prescription_filename]);

    const voiceRxId = useMemo(() => {
        return isVoiceOrAmbientRx ? viewCaseManagerData?.smart_prescription_filename : null;
    }, [isVoiceOrAmbientRx, viewCaseManagerData?.smart_prescription_filename]);
    const normalizedVoiceRxVersion = voiceRxVersion.trim().toLowerCase();
    const canRepeatVoiceRx = isVoiceOrAmbientRx && ["v2", "v3"].includes(normalizedVoiceRxVersion);

    useEffect(() => {
        const checkRxVersion = async () => {
            if (!voiceRxId) {
                setVoiceRxVersion("");
                return;
            }

            try {
                let rxResponse = await getAmbientRx(voiceRxId);
                if (!rxResponse?.success || !rxResponse?.data) {
                    rxResponse = await getGenRx(voiceRxId);
                }

                const version = rxResponse?.data?.version || rxResponse?.data?.data?.version;
                setVoiceRxVersion(typeof version === "string" ? version : "");
            } catch (error) {
                setVoiceRxVersion("");
            }
        };

        checkRxVersion();
    }, [voiceRxId]);

    const onSmartRxClick = async (patient) => {
        const tokenData = getTokenData();
        const clinic = getClinic(profile?.hospital_data);
        window.Moengage.track_event("TP_SmartRx_Started", {
      patient_id: patient?.patient_unique_id || "",
      patient_name: patient?.pm_fullname,
      doctor_id: profile?.doctor_unique_id,
      doctor_name: profile?.um_name,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      clinic_name: clinic?.hm_name,
      source: "Appointment Landing Page",
      device_details: navigator.userAgent
  });
        navigate("/smart-prescription", { state: { patient_data: patient } });
    };

    const onSnapRxClick = async (patient) => {
        trackEvent(EVENTS.SNAP_RX.uploadClicked, {
            patient_unique_id: patient?.patient_unique_id,
            doctor_id: getDecodedToken()?.user_id,
            upload_source: "EMR",
          });
        navigate("/snap-rx", { state: { patient_data: patient } });
    };

    const onConsultClick = async (patient) => {
        navigate("/prescription", { state: { patient_data: patient, send_path: "patient_details" } });
        if (isChikitsalayAccessable) {
            clinicTargetStatus(patient?.pam_id, {
                targetStatus: CLINIC_TARGET_STATUS.SERVING,
            });
        }
    };
    const onTabRxClick = async (patient) => {
        navigate("/tab-rx", { state: { patient_data: patient } });
    };

    const onVoiceRxClick = async (patient) => {
        const clinic = getClinic(profile?.hospital_data);
        window.Moengage.track_event("TP_AV_Entry", {
          patient_id: patient_data?.patient_unique_id || "",
          patient_name: patient_data?.pm_fullname || "",
          patient_mobile_number: patient_data?.pm_contact_no || "",
          doctor_id: profile?.doctor_unique_id,
          user_id: userId,
          doctor_name: profile?.um_name,
          doctor_specialty: profile?.dp_name,
          doctor_mobile_number: profile?.um_contact,
          hm_id: clinic?.hm_id,
          clinic_name: clinic?.hm_name,
          source: "Patient Details Rx",
        });
        navigate(isVoiceRxNewFromGB ? "/prescription" : "/voice-rx-consult", {
            state: { 
                patient_data: patient,
                ...(isVoiceRxNewFromGB && {
                    isVoiceRxNewUiFlow: true,
                    voiceRxEntryPoint: "patient_details_rx",
                }),
            },
        });
    };

    const handleRepeatVoiceAmbientRx = async () => {
        if (!voiceRxId || !patient_data) return;

        try {
            const newAppointmentId = viewCaseManagerData?.tcm_id || 0;
            let copyResponse = await copyAmbientRx(voiceRxId, newAppointmentId);
            let isAmbientRxType = copyResponse?.success;

            if (!isAmbientRxType) {
                copyResponse = await copyVoiceRx(voiceRxId, newAppointmentId);
            }

            if (!copyResponse?.success) {
                const ambientCheck = await getAmbientRx(voiceRxId);
                isAmbientRxType = ambientCheck?.success && ambientCheck?.data;
            }

            window.TATVA_ACTIVE_VOICE_SERVICE =
                normalizedVoiceRxVersion === "v3"
                    ? S_VOICE_RX
                    : isAmbientRxType ? S_AMBIENT_VOICE_RX : S_VOICE_RX;
            const copiedRxId = copyResponse?.success 
                ? (copyResponse?.data?.data?._id || copyResponse?.data?._id || copyResponse?._id)
                : voiceRxId;

            const repeatCaseManagerData = {
                ...viewCaseManagerData,
                smart_prescription_filename: copiedRxId,
                tcm_id: 0,
                consultation_date: moment().format('YYYY-MM-DD HH:mm:ss')
            };
            const shouldOpenVoiceRxNewUi =
                canRepeatVoiceRx &&
                shouldUseNewPrescriptionUi(repeatCaseManagerData, isVoiceRxNewFromGB);
            navigate("/prescription", {
                state: {
                    patient_data: patient_data,
                    send_path: "patient_details",
                    caseManagerData: repeatCaseManagerData,
                    ...(shouldOpenVoiceRxNewUi ? { isVoiceRxNewUiFlow: true } : {})
                }
            });
        } catch (error) {
            console.error("Error repeating voice/ambient Rx:", error);
        }
    };

    const handleCreateCertificateDrawer = useCallback(() => {
        setCreateCertificateDrawer(!createCertificateDrawer)
    }, [createCertificateDrawer]);

    //PopOverVideo function
    const showHideVideoListPopover = useCallback(() => {
        setPopOverVideo(!popOverVideo);
    }, [popOverVideo]);

    const handleFileUpload = (event) => {
        const files = event.target.files;
        if (files) {
            const filesData = Array.from(files);
            if (filesData.length > 0) {
                const updatedFiles = [];
                filesData.forEach((file) => {
                    const cleanFileName = getCorrectedFileName(file?.name || "");
                    // Check if the file is an image and if its name follows typical camera-captured file patterns
                    const isCapturedFromCamera =
                        (file.type === "image/jpeg" ||
                            file.type === "image/png" ||
                            file.type === "image/jpg") &&
                        (cleanFileName === "image.webp" ||
                            cleanFileName === "image.webp" ||
                            cleanFileName === "image.webp");

                    let newFile = file;

                    if (isCapturedFromCamera) {
                        // Generate a unique file name for camera-captured images
                        const uniqueFileName = generateUniqueFileName(file);
                        newFile = new File([file], uniqueFileName, { type: file.type });
                    } else {
                        // If the file name had spaces, create a new file with spaces removed
                        newFile = new File([file], cleanFileName, { type: file.type });
                    }

                    updatedFiles.push(newFile);
                });
                setFilesData(updatedFiles);
                handleDrawerUploadDoc();
            }
        }
        event.target.value = null;
    };

    const handleAddClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    //Video Componet
    const VIDEO_CONTENT = useCallback(() => {
        return (
            <>
                <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
                    <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
                        <div className="title-common lh-base">Video Tutorial</div>
                        <Button className="btn btn-videoClose p-0"
                            onClick={showHideVideoListPopover}>
                            <i className="icon-Cross" />
                        </Button>
                    </div>
                    {videoList[0]?.video?.map((item1, i1) => {
                        return (
                            <div key={i1} className={`d-flex ${i1 !== videoList[0]?.video.length - 1 && 'pb-3 mb-15 border-bottom'}`}>
                                <div className="tutorial-play me-14">
                                    <button type="button"
                                        onClick={() => {
                                            setVideoLink(item1)
                                            const clinic_name = getClinicName(profile?.hospital_data);
                                            window.Moengage.track_event("TP_Tutorial_Viewed", {
                                                clinic_name,
                                                tutorial_type: videoList[0]?.category,
                                            });
                                        }}
                                    >
                                        <img src={playIcons} />
                                    </button>
                                    <span className='tutorial-thumb'><img src={item1.thumbnail} /></span>
                                </div>
                                <div>
                                    <h3 className="title-common text-welcome">{item1?.tmv_title}</h3>
                                    <div className="fs-12 fontroboto fw-normal text-main">{item1?.tmv_description}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </>
        );
    }, [popOverVideo]);

    return (
        <>
            <div className="welcomesection position-relative">
                <div className='bg-welcome d-flex justify-content-between align-items-center'>
                    <div className='d-flex align-items-center'>
                        {sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY ? (
                            <div>
                                <div className='d-flex align-items-center gap-2'>
                                    <h1 className='mt-2 mb-0'>{'Patient Details'}</h1>
                                    {patientAdmissionStatus?.alreadyAdmitted && (
                                        <span className="ipd-badge mt-2">
                                            IPD
                                        </span>
                                    )}
                                </div>
                                {isMobile && (<ProfilePopover locationPath={locationPath} isMobile={isMobile} patient_data={patient_data} />)}
                                {isMobile ? '' : <p className='mb-1'>&nbsp;</p>}
                            </div>
                        ) : sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_CERTIFICATE ? (
                            <h1 className='mt-2 mb-3'>{'Certificate'}</h1>
                        ) : sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.ABHA_RECORDS ? (
                            <h1 className='mt-2 mb-3'>{'ABHA Records'}</h1>
                        ) : sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.HEALTH_CHECKUP_REPORT ? (
                            <h1 className='mt-2 mb-3'>{'Health Check-up Report'}</h1>
                        ) : (
                            <h1 className='mt-2 mb-3'>{'Medical Records'}</h1>
                        )}
                    </div>
                    {sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.ABHA_RECORDS && abhaHeaderActions ? (
                        <div className="d-flex gap-2">
                            <AntButton
                              className="abha-records__refresh-btn"
                              onClick={abhaHeaderActions.fetchConsents}
                              loading={abhaHeaderActions.loading}
                              icon={<i className="icon-reload" />}
                            >
                             Refresh Records
                            </AntButton>
                            <AntButton
                              type="primary"
                              className="abha-records__request-btn"
                              onClick={abhaHeaderActions.handleRequestRecords}
                              icon={<i className="icon-upload" />}
                            >
                              Request Medical Records
                            </AntButton>
                        </div>
                    ) : sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY ? (
                        <div>
                            {viewCaseManagerData && !isCvtExtHosAccessableFromGB && (
                                <div className='d-sm-flex d-block'>
                                    <Popover
                                        open={popOverVideo}
                                        onOpenChange={showHideVideoListPopover}
                                        content={VIDEO_CONTENT}
                                        trigger="click"
                                        overlayClassName="pop-430 pp-0 videoTutorial"
                                        placement="bottom"
                                    >
                                        <button className='btn d-flex align-items-center btn-text mx-3 tutorial p-0'>
                                            {/* onClick={showHideVideoListPopover} */}
                                            <span className={`text-decoration-none rounded-5 shadow2 ${isTablet ? "" : "pe-3 bg-white"}`}><img height={42} src={tutorial} />{isTablet ? "" : "Tutorial"}</span>
                                        </button>
                                    </Popover>
                                    {videoLink && (
                                        <VideoModal
                                            videoLink={videoLink}
                                            onCancel={() => setVideoLink(null)}
                                        />
                                    )}

                                    {!!canResumeDraftRx && 
                                        <Button 
                                            variant="outline-primary me-3 d-flex align-items-center mb-lg-0 mb-2" 
                                            onClick={() => {
                                                window?.Moengage?.track_event(EVENTS.SAVE_DRAFT.resume, {
                                                    ...getDraftMoengageDoctorAttributes(profile, userId),
                                                    tcm_id: viewCaseManagerData?.tcm_id || 0,
                                                    source: 0,
                                                });
                                                navigate("/prescription", { state: { patient_data: patient_data, send_path: "patient_details", caseManagerData: viewCaseManagerData, ...(shouldUseNewPrescriptionUi(viewCaseManagerData, isVoiceRxNewFromGB) ? { isVoiceRxNewUiFlow: true } : {}) } })
                                            }}
                                        >
                                            <img src={draftIcon} width={20} height={20} alt="Draft" className='me-2' />
                                            Resume {isTablet ? "" : "Draft"}
                                        </Button>
                                    }
                                    
                                    {(!viewCaseManagerData?.smart_prescription_filename?.length || canRepeatVoiceRx) &&
                                        <Button variant="outline-primary me-3 d-flex align-items-center mb-lg-0 mb-2" onClick={() => {
                                            if (canRepeatVoiceRx) {
                                                handleRepeatVoiceAmbientRx();
                                            } else {
                                                if (canRepeatDraftRx) {
                                                    window?.Moengage?.track_event(EVENTS.SAVE_DRAFT.repeatDraft, {
                                                        ...getDraftMoengageDoctorAttributes(profile, userId),
                                                        tcm_id: viewCaseManagerData?.tcm_id || 0,
                                                        owner_doctor_um_id: viewCaseManagerData?.doctor_data?.um_id || "",
                                                    });
                                                }
                                                window.Moengage.track_event("repeat_rx_click", {
                                                    "doctor_id": profile?.doctor_unique_id,
                                                    "patient_id": patient_data !== undefined ? patient_data.patient_unique_id : 0,
                                                    "rx_date": viewCaseManagerData?.consultation_date
                                                });
                                                {
                                                  const repeatCaseManagerData = { ...viewCaseManagerData, tcm_id: 0, consultation_date: moment().format('YYYY-MM-DD HH:mm:ss'), is_draft: null };
                                                  navigate("/prescription", { state: { patient_data: patient_data, send_path: "patient_details", caseManagerData: repeatCaseManagerData, fromRepeatRx: true, ...(shouldUseNewPrescriptionUi(repeatCaseManagerData, isVoiceRxNewFromGB) ? { isVoiceRxNewUiFlow: true } : {}) } });
                                                }
                                            }
                                        }}>
                                            <i className={'icon-reload me-2'}></i>
                                            Repeat {canRepeatDraftRx 
                                                ? isTablet ? "" : "Draft" 
                                                : (
                                                    <>
                                                        {modifyFormat?.first}<sup>{modifyFormat?.second}</sup>&nbsp;{modifyFormat?.third} Rx
                                                    </>
                                                  )
                                            }
                                        </Button>
                                    }
                                    { ((viewCaseManagerData?.smart_prescription_filename?.length && !isVoiceOrAmbientRx && !canRepeatVoiceRx && !viewCaseManagerData?.smart_prescription_filename?.includes("snap_rx") && !viewCaseManagerData?.smart_prescription_filename?.includes("tab_rx") && !isMobile) ||
                                       (viewCaseManagerData?.smart_prescription_filename?.includes("tab_rx") && isMobile)) &&
                                         <Button variant="outline-primary me-3 d-flex align-items-center mb-lg-0 mb-2" onClick={async () => {
                                            window.Moengage.track_event("repeat_rx_click", {
                                                "doctor_id": profile?.doctor_unique_id,
                                                "patient_id": patient_data !== undefined ? patient_data.patient_unique_id : 0,
                                                "rx_date": viewCaseManagerData?.consultation_date
                                            });
                                            
                                            // Fetch smartRxFilesData similar to Cardiology.js
                                            const baseUrl = { customBaseUrl: env.casemanager_api_url };
                                            const payload = {
                                                tcm_id: viewCaseManagerData?.tcm_id,
                                            };
                                            
                                            let smartRxFile = null;
                                            try {
                                                if (viewCaseManagerData?.smart_prescription_filename?.includes(".jpeg")) {
                                                    const response = await api.post(FETCH_SMART_RX, payload, baseUrl);
                                                    if (response?.data?.length) {
                                                        smartRxFile = response.data;
                                                    }
                                                }
                                            } catch (error) {
                                                console.error("Error fetching smart Rx files:", error);
                                            }

                                            const route = viewCaseManagerData?.smart_prescription_filename?.includes("tab_rx") ? "/tab-rx" : "/smart-prescription";
                                            
                                            navigate(route, {
                                                state: {
                                                    patient_data: patient_data,
                                                    caseManagerData: { ...viewCaseManagerData, tcm_id: 0, consultation_date: moment().format('YYYY-MM-DD HH:mm:ss'), is_draft: null },
                                                    smartRxFilesData: smartRxFile,
                                                    fromRepeatRx: true
                                                }
                                            });
                                        }}>
                                            <i className={'icon-reload me-2'}></i>
                                            Repeat {modifyFormat?.first}<sup>{modifyFormat?.second}</sup>&nbsp;{modifyFormat?.third} Rx   
                                        </Button>
                                    }
                                    {isChikitsalayAccessable ? (
                                        <button
                                            type="button"
                                            className="btn btn-primary3 btn-text-white btn-41 px-4"
                                            style={{ color: "#fff" }}
                                            onClick={() => onConsultClick(patient_data)}
                                        >
                                            Consult
                                        </button>
                                    ) : (isSnapRxAccessableFromGB || isSmartSyncAccessableFromGB || isTabRxAccessableFromGB || (isFreeVoiceRxUser || tp_monetization_enable)) ? (
                                        <PrimaryActionButton
                                            isSmartRxAccessible={isSmartSyncAccessableFromGB}
                                            isSnapRxAccessible={isSnapRxAccessableFromGB}
                                            isVoiceRxAccessible={isFreeVoiceRxUser || tp_monetization_enable}
                                            isVoiceRxPaid={isVoiceRxPaid}
                                            onSmartRxClick={onSmartRxClick}
                                            onSnapRxClick={onSnapRxClick}
                                            onVoiceRxClick={onVoiceRxClick}
                                            onTabRxClick={onTabRxClick}
                                            onConsultClick={onConsultClick}
                                            patient={patient_data}
                                            buttonStyle="walkin"
                                        />
                                    ) : (
                                        <Button variant="primary"
                                            className='btn-41 px-4'
                                            onClick={() => {
                                                window.Moengage.track_event("start_new_visit_click", {
                                                    "doctor_id": profile?.doctor_unique_id,
                                                    "patient_id": patient_data !== undefined ? patient_data.patient_unique_id : 0
                                                });
                                                navigate("/prescription", { state: { patient_data: patient_data, send_path: "patient_details" } })
                                            }}>
                                            {'Start New Visit'}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : sidebarKey === 2 ? (
                        <div>
                            {patientCertificateList?.length > 0 && (
                                <Button variant="primary" onClick={handleCreateCertificateDrawer}
                                    className='btn-41 px-4'>
                                    {'Create Certificate'}
                                </Button>
                            )}
                        </div>
                    ) : sidebarKey === 3 && allUploadedDocs?.length > 0 ? (
                        <div>
                            <Button
                                variant="primary"
                                style={{ display: "flex", alignItems: "center", gap: "5px" }}
                                onClick={handleAddClick}
                            >
                                {/* {isAndroid && !isBrowser ? (
                                    <div
                                        ref={fileInputRef}
                                        onClick={handleUploadDocPopup}
                                        style={{ display: "none" }}
                                    />
                                ) : ( */}
                                    <input
                                        type="file"
                                        multiple
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/png, image/jpeg, image/jpg, image/gif, application/pdf, video/mp4, video/quicktime, video/x-msvideo"
                                        style={{ display: "none" }}
                                        disabled={filesData.length >= 5}
                                    />
                                {/* )} */}
                                <i className="icon-upload" />
                                {"Upload new report"}
                            </Button>
                        </div>
                    ) : sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.HEALTH_CHECKUP_REPORT && healthCheckupReports?.length > 0 && (
                        <div>
                            <Button type="primary" className='btn-41 px-4' onClick={handleGenerateHealthCheckupReport} disabled={healthReportConsultationsLoading} loading={healthReportConsultationsLoading}>
                                {healthReportConsultationsLoading ? 'Generating...' : 'Generate New Report'}
                            </Button>
                        </div>
                    )}
                </div>
                <Drawer
                    className="modalWidth-563" width="auto"
                    title="Create Certificate"
                    placement="right"
                    closable
                    open={createCertificateDrawer}
                    onClose={handleCreateCertificateDrawer}
                // key="left"
                >
                    <CreateCertificate handleCreateCertificateDrawer={handleCreateCertificateDrawer} patient_data={patient_data} replace={false} />
                </Drawer>
                <div className='pb-5'>
                    &nbsp;
                </div>
            </div>
        </>
    )
}

export default React.memo(Welcome1)
