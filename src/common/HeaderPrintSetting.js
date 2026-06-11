import React, { useContext, useState, useCallback } from 'react';
import { Navbar } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Popover } from 'antd';
import { useSelector, useDispatch } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import { errorMessage, getClinicName } from "../utils/utils";
import VideoModal from './VideoModal';

import {
    getDefaultPrintsettings,
    savePrintsettings,
} from "../redux/doctorsSlice";

import CommonModal from './CommonModal';

import PrintSettingsContext from '../context/PrintSettingsContext';
import { addModule } from '../redux/customModuleSlice';
import { setCurrentSessionRx } from '../redux/obstetricSlice';
import { getDecodedToken } from '../utils/localStorage';
import { env } from '../EnvironmentConfig';
import { GB_ZYDUS_USER } from '../utils/constants';
import { updatePatientDefaultLanguage } from '../api/services/DefaultLanguageService';
import { ASSETS } from "../assets";
const {
  alerticon: alertIcon,
  tutorialIcon: tutorial,
  tubeIcon: playIcons,
} = ASSETS.images;

function HeaderPrintSetting({ defaultPrintSettings }) {
    const navigate = useNavigate();
    const { state } = useLocation();
    const previousPage = state?.from;
    const { selectedLang, isAmbientRx, rxId, print_url } = state || {};

    const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
    const decodedToken = getDecodedToken();
    const tokenData = decodedToken?.result;
    const { currentSessionRx } = useSelector((state) => state.obstetric);

    const [popOverVideo, setPopOverVideo] = useState(false);
    const [videoLink, setVideoLink] = useState(null);

    //PopOverVideo function
    const showHideVideoListPopover = useCallback(() => {
        setPopOverVideo(!popOverVideo);
    }, [popOverVideo]);

    const { loading, videoList, profile, userId } = useSelector((state) => state.doctors);
    const { customModules } = useSelector((state) => state.customModules);
    const dispatch = useDispatch();

    const { printSettings, fileHeader, fileFooter, fileLogo, fileWatermark, fileSignature } = useContext(PrintSettingsContext);

    const [isBackModalOpen, setIsBackModalOpen] = useState(false);
    const [flag, setFlag] = useState(0);

    const onDefaultPrintsettings = async () => {
        setFlag(2)
        showHideBackModal()
    };

    //Video Componet
    const VIDEO_CONTENT = useCallback(() => {
        return (
            <>
                <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
                    <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
                        <div className="title-common lh-base">Video Tutorial</div>
                        <Button className="btn btn-delete-prescription p-0"
                            onClick={showHideVideoListPopover}>
                            <i className="icon-Cross" />
                        </Button>
                    </div>
                    <div className='overflow-y-auto' style={{ maxHeight: 'calc(100vh - 550px)' }}>
                        {videoList?.filter(e => e.category_id === 7)[0]?.video?.map((item1, i1) => {
                            return (
                                <div key={i1} className={`d-flex ${i1 !== videoList?.filter(e => e.category_id === 7)[0]?.video?.length - 1 && 'pb-3 mb-15 border-bottom'}`}>
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
                </div>
            </>
        );
    }, [popOverVideo]);

    const onSavePrintSettingsClick = async () => {
        if (printSettings?.letterhead_format == 0 && printSettings?.header_footer?.header?.doctor_info?.enable == 'N' && printSettings?.header_footer?.header?.clinic_info?.enable == 'N' && printSettings?.logo_enable == 'N') {
            errorMessage(`Enable at least one option (Doctor’s information, Clinic's information, Logo on Header)`)
        } else if (printSettings?.letterhead_format == 1 && !fileHeader) {
            errorMessage(`Upload header`)
        } else {
            var sendData = {
                default_language: printSettings?.default_language,
                letterhead_format: printSettings?.letterhead_format,
                whatsapp_letterhead_format: printSettings?.whatsapp_letterhead_format,
                qrcode_enable: printSettings?.qrcode_enable,
                prescription: JSON.stringify(printSettings?.prescription),
                header_footer: JSON.stringify(printSettings?.header_footer),
                page_format: JSON.stringify(printSettings?.page_format),

                // logo_enable: printSettings?.letterhead_format == 0 || (printSettings?.letterhead_format == 2 && printSettings?.whatsapp_letterhead_format == 0) ?
                //     printSettings?.logo_enable
                //     : 'N',
                // logo_image: printSettings?.letterhead_format == 0 || (printSettings?.letterhead_format == 2 && printSettings?.whatsapp_letterhead_format == 0) ?
                //     fileLogo ? fileLogo?.uploadFile : ''
                //     : 'N',

                // header_image: printSettings?.letterhead_format == 1 || (printSettings?.letterhead_format == 2 && printSettings?.whatsapp_letterhead_format == 1) ?
                //     fileHeader ? fileHeader?.uploadFile : ''
                //     : '',
                // footer_image: printSettings?.letterhead_format == 1 || (printSettings?.letterhead_format == 2 && printSettings?.whatsapp_letterhead_format == 1) ?
                //     fileFooter ? fileFooter?.uploadFile : ''
                //     : '',

                logo_enable: printSettings?.logo_enable,
                logo_image: fileLogo ? fileLogo?.uploadFile : '',

                header_image: fileHeader ? fileHeader?.uploadFile : '',
                footer_image: fileFooter ? fileFooter?.uploadFile : '',

                water_mark_enable: printSettings?.water_mark_enable,
                water_mark_image: fileWatermark ? fileWatermark?.uploadFile : '',

                signature_enable: printSettings?.signature_enable,
                signature_image: fileSignature ? fileSignature?.uploadFile : '',
                
                signature_image_delete: printSettings?.signature_image_delete !== undefined ? printSettings?.signature_image_delete : 0
            }

            const action = await dispatch(savePrintsettings(sendData));

            if (action.meta.requestStatus === "fulfilled") {
                if (previousPage === "/gen-rx-print") {
                    const updatedSelectedLang = printSettings?.default_language || selectedLang;
                    navigate("/gen-rx-print", { 
                        replace: true, 
                        state: { 
                            ...state, 
                            selectedLang: updatedSelectedLang,
                            print_url: print_url,
                            isAmbientRx: isAmbientRx,
                            rxId: rxId,
                            currentSessionRx: null
                        } 
                    });
                } else if (previousPage === "/snap-rx/preview") {
                    const updatedSelectedLang = printSettings?.default_language || selectedLang;
                    navigate("/snap-rx/preview", { 
                        replace: true, 
                        state: { 
                            ...state, 
                            selectedLang: updatedSelectedLang,
                            currentSessionRx: null,
                            from: "/configure_print_setting",
                            page: state?.page, // Preserve page state to indicate if it's after digitization
                            smartRxFile: state?.smartRxFile || state?.files,
                            files: state?.files || state?.smartRxFile
                        } 
                    });
                } else if (previousPage === "/print-smart-rx") {
                    const updatedSelectedLang = printSettings?.default_language || selectedLang;
                    navigate("/print-smart-rx", { 
                        replace: true, 
                        state: { 
                            ...state, 
                            selectedLang: updatedSelectedLang,
                            currentSessionRx: null,
                            from: "/configure_print_setting",
                            page: state?.page, // Preserve page state to indicate if it's after digitization
                            smartRxFile: state?.smartRxFile || state?.files
                        } 
                    });
                } else if (previousPage === "/tab-rx-prescription") {
                    const updatedSelectedLang = printSettings?.default_language || selectedLang;
                    navigate("/tab-rx-prescription", {
                        replace: true,
                        state: {
                            ...state,
                            selectedLang: updatedSelectedLang,
                            currentSessionRx: null,
                            from: "/configure_print_setting",
                            page: state?.page,
                            smartRxFile: state?.smartRxFile || state?.smartRxFilesData
                        }
                    });
                } else {
                    if (previousPage) {
                        navigate(previousPage, { replace: true, state: { ...state, currentSessionRx: null } });
                    } else {
                        navigate(-1, { replace: true, state: { ...state, currentSessionRx: null } });
                    }
                }
            } else {
                errorMessage(action.error)
            }
        }
        if (defaultPrintSettings?.default_language !== printSettings?.default_language) {
            updatePatientDefaultLanguage({
                patientId: state?.patient_data?.patient_unique_id,
                default_language: printSettings?.default_language,
            });
        }
    };

    const checkDataFillOrNot = () => {
        let update_json = { ...printSettings }
        delete update_json['qrcode']
        if (JSON.stringify(defaultPrintSettings) == JSON.stringify(update_json)) {
            if (previousPage === "/gen-rx-print") {
                navigate("/gen-rx-print", { 
                    replace: true, 
                    state: { 
                        ...state, 
                        selectedLang: selectedLang,
                        print_url: print_url,
                        isAmbientRx: isAmbientRx,
                        rxId: rxId,
                        currentSessionRx: null
                    } 
                });
            } else if (previousPage === "/snap-rx/preview") {
                navigate("/snap-rx/preview", { 
                    replace: true, 
                    state: { 
                        ...state, 
                        selectedLang: selectedLang,
                        currentSessionRx: null,
                        page: state?.page, // Preserve page state to indicate if it's after digitization
                        smartRxFile: state?.smartRxFile || state?.files,
                        files: state?.files || state?.smartRxFile
                    } 
                });
            } else if (previousPage === "/print-smart-rx") {
                navigate("/print-smart-rx", { 
                    replace: true, 
                    state: { 
                        ...state, 
                        selectedLang: selectedLang,
                        currentSessionRx: null,
                        from: "/configure_print_setting",
                        page: state?.page, // Preserve page state to indicate if it's after digitization
                        smartRxFile: state?.smartRxFile || state?.files
                    } 
                });
            } else if (previousPage === "/tab-rx-prescription") {
                navigate("/tab-rx-prescription", {
                    replace: true,
                    state: {
                        ...state,
                        selectedLang: selectedLang,
                        currentSessionRx: null,
                        from: "/configure_print_setting",
                        page: state?.page,
                        smartRxFile: state?.smartRxFile || state?.smartRxFilesData
                    }
                });
            } else {
                if (previousPage) {
                    navigate(previousPage, { replace: true, state: { ...state, currentSessionRx: currentSessionRx } });
                } else {
                    navigate(-1, { replace: true, state: { ...state, currentSessionRx: currentSessionRx } });
                }
            }
        } else {
            setFlag(1)
            showHideBackModal()
        }
    }

    const showHideBackModal = useCallback(() => {
        setIsBackModalOpen(!isBackModalOpen);
    }, [isBackModalOpen]);

    const onYesLeaveClick = async() => {
        if (flag === 1) {
            if (previousPage === "/gen-rx-print") {
                navigate("/gen-rx-print", { 
                    replace: true, 
                    state: { 
                        ...state, 
                        selectedLang: selectedLang,
                        print_url: print_url,
                        isAmbientRx: isAmbientRx,
                        rxId: rxId
                    } 
                });
            } else if (previousPage === "/snap-rx/preview") {
                navigate("/snap-rx/preview", { 
                    replace: true, 
                    state: { 
                        ...state, 
                        selectedLang: selectedLang,
                        currentSessionRx: null,
                        from: "/configure_print_setting",
                        page: state?.page, // Preserve page state to indicate if it's after digitization
                        smartRxFile: state?.smartRxFile || state?.files,
                        files: state?.files || state?.smartRxFile
                    } 
                });
            } else if (previousPage === "/print-smart-rx") {
                navigate("/print-smart-rx", { 
                    replace: true, 
                    state: { 
                        ...state, 
                        selectedLang: selectedLang,
                        currentSessionRx: null,
                        from: "/configure_print_setting",
                        page: state?.page, // Preserve page state to indicate if it's after digitization
                        smartRxFile: state?.smartRxFile || state?.files
                    } 
                });
            } else if (previousPage === "/tab-rx-prescription") {
                navigate("/tab-rx-prescription", {
                    replace: true,
                    state: {
                        ...state,
                        selectedLang: selectedLang,
                        currentSessionRx: null,
                        from: "/configure_print_setting",
                        page: state?.page,
                        smartRxFile: state?.smartRxFile || state?.smartRxFilesData
                    }
                });
            } else {
                if (previousPage) {
                    navigate(previousPage, { replace: true, state: { ...state, currentSessionRx: null } });
                } else {
                    navigate(-1, { replace: true, state: { ...state, currentSessionRx: null } });
                }
            }
        } else if (flag === 3) {
            // Hydrate blob URL to Blob so preview pages get a valid PDF (no revoked blob URL)
            // Prefer live preview blob from redux (updated by Quixote/QuixoteCertificate).
            // Route state is fallback only.
            let sessionRxToPass = currentSessionRx || state?.currentSessionRx;
            if (
                typeof sessionRxToPass === "string" &&
                sessionRxToPass.startsWith("blob:")
            ) {
                try {
                    const res = await fetch(sessionRxToPass);
                    const blob = await res.blob();
                    sessionRxToPass = blob;
                } catch (err) {
                    console.error("Failed to hydrate session Rx blob before navigation", err);
                }
            }
            if (
                !sessionRxToPass &&
                typeof state?.currentSessionRx === "string" &&
                state.currentSessionRx.startsWith("blob:")
            ) {
                try {
                    const res = await fetch(state.currentSessionRx);
                    const blob = await res.blob();
                    sessionRxToPass = blob;
                } catch (err) {
                    console.error("Failed to hydrate session Rx blob from state", err);
                }
            }
            // Session blob is now passed through route state; clear global copy.
            dispatch(setCurrentSessionRx(null));

            if (previousPage === "/gen-rx-print") {
                const updatedSelectedLang = printSettings?.default_language || selectedLang;
                navigate("/gen-rx-print", { 
                    replace: true, 
                    state: { 
                        ...state, 
                        selectedLang: updatedSelectedLang,
                        print_url: print_url,
                        isAmbientRx: isAmbientRx,
                        rxId: rxId,
                        currentSessionRx: sessionRxToPass
                    } 
                });
            } else if (previousPage === "/snap-rx/preview") {
                const updatedSelectedLang = printSettings?.default_language || selectedLang;
                navigate("/snap-rx/preview", { 
                    replace: true, 
                    state: { 
                        ...state, 
                        selectedLang: updatedSelectedLang,
                        currentSessionRx: sessionRxToPass,
                        from: "/configure_print_setting",
                        page: state?.page, // Preserve page state to indicate if it's after digitization
                        smartRxFile: state?.smartRxFile || state?.files,
                        files: state?.files || state?.smartRxFile
                    } 
                });
            } else if (previousPage === "/print-smart-rx") {
                const updatedSelectedLang = printSettings?.default_language || selectedLang;
                navigate("/print-smart-rx", { 
                    replace: true, 
                    state: { 
                        ...state, 
                        selectedLang: updatedSelectedLang,
                        currentSessionRx: sessionRxToPass,
                        from: "/configure_print_setting",
                        page: state?.page, // Preserve page state to indicate if it's after digitization
                        smartRxFile: state?.smartRxFile || state?.files
                    } 
                });
            } else if (previousPage === "/tab-rx-prescription") {
                const updatedSelectedLang = printSettings?.default_language || selectedLang;
                navigate("/tab-rx-prescription", {
                    replace: true,
                    state: {
                        ...state,
                        selectedLang: updatedSelectedLang,
                        currentSessionRx: sessionRxToPass,
                        from: "/configure_print_setting",
                        page: state?.page,
                        smartRxFile: state?.smartRxFile || state?.smartRxFilesData
                    }
                });
            } else {
                if (previousPage) {
                    navigate(previousPage, { replace: true, state: { ...state, currentSessionRx: sessionRxToPass, fromConfigurePrintSetting: true } });
                } else {
                    navigate(-1, { replace: true, state: { ...state, currentSessionRx: sessionRxToPass, fromConfigurePrintSetting: true } });
                }
            }
        } else {
            const action = await dispatch(getDefaultPrintsettings({ default: true }));
            if(action.meta.requestStatus === "fulfilled") {
                if(customModules?.length > 0) {
                    const rxPrescription = {
                    ...action?.payload?.prescription,
                    case_option: [
                      ...(action?.payload?.prescription?.case_option || []),
                      ...customModules?.map((module) => ({
                        id: module.module_id,
                        title: module.name,
                        format: "table",
                        enable: "Y",
                        custom_status: "Y",
                        is_custom_module: true,
                      })),
                    ],
                  };
          
                  const sendData = {
                    ...action?.payload,
                    prescription: JSON.stringify(rxPrescription),
                    header_footer: JSON.stringify(action?.payload?.header_footer),
                    page_format: JSON.stringify(action?.payload?.page_format),
                  };
          
                  dispatch(savePrintsettings(sendData));
                }
            }
            showHideBackModal();
        }
    }

    return (
        <Navbar className="justify-content-between headerprescription p-0">
            <div className='align-items-center d-flex w-100 h-100 justify-content-between'>
                <div className='align-items-center d-flex h-100 w-100'>
                    <div className='border-end h-100 text-center me-2'>
                        <div onClick={checkDataFillOrNot} className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                            <i className='icon-right'></i>
                        </div>
                        <CommonModal
                            isModalOpen={isBackModalOpen}
                            onCancel={showHideBackModal}
                            modalWidth={500}
                            title={ flag === 3 ? "Save Print Settings" : "You may lose your data"}
                            modalBody={
                                <>
                                    <div className="alert-warning rounded-10px p-2 patient-details">
                                        <div className="d-flex align-items-center">
                                            <img className='me-3' src={alertIcon} alt="Warning" />
                                            <span>
                                                { flag === 3 ?
                                                    `Do you want to set these changes as default for all future Rx’s?` :
                                                    <>
                                                        Are you sure you want to leave? <br />
                                                        You will permanently lose your data.
                                                    </>
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="d-flex align-items-center mt-2 justify-content-end">
                                            <div onClick={onYesLeaveClick} className="me-4 text-decoration-underline btn p-0 text-main">
                                                {flag == 1 ? 'Yes Leave' : flag === 3 ? "No, Apply on This Rx Only" : 'Yes'}
                                            </div>
                                            <Button onClick={flag === 3 ? onSavePrintSettingsClick : showHideBackModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                                <span>{flag == 1 ? 'No, Stay' : flag === 3 ? "Yes, Set as Default for All Rx" : 'No'}</span>
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            }
                        />
                    </div>
                    <div className='title-common'>
                        Configure Print Setting
                    </div>
                </div>
                <div className='d-flex align-items-center justify-content-end w-100'>
                    <Popover
                        open={popOverVideo}
                        onOpenChange={showHideVideoListPopover}
                        content={VIDEO_CONTENT}
                        trigger="click"
                        overlayClassName="pop-430 pp-0 videoTutorial"
                        placement="bottom"
                    >
                        <button className='btn d-flex align-items-center btn-text me-10 tutorial'>
                            {/* onClick={showHideVideoListPopover} */}
                            <span className='text-decoration-none rounded-5 pe-3 bg-white shadow2'><img height={42} src={tutorial} />Tutorial</span>
                        </button>
                    </Popover>
                    {tokenData?.hospital_business_id != env.zydus_business_id && !isZydusUserAccessableFromGB && (
                        <button className='btn btn-text me-14' onClick={onDefaultPrintsettings}>
                            <span>Default Settings</span>
                        </button>
                    )}
                    <Button type='button' className="btn-41 btn px-4 btn-primary3 me-4" onClick={() => { 
                            setFlag(3);
                            showHideBackModal(); 
                        }} loading={loading}>
                        Save
                    </Button> 
                </div>
            </div>
            {
                videoLink && (
                    <VideoModal
                        videoLink={videoLink}
                        onCancel={() => setVideoLink(null)}
                    />
                )
            }
        </Navbar>
    );
}

export default React.memo(HeaderPrintSetting);
