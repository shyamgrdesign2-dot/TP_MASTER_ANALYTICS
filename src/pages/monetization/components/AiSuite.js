import React, { useState, useEffect, useCallback } from "react";
import { Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import { Button, Drawer } from "antd";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { isChrome, isSafari } from "react-device-detect";

import LoopingVideo from "../../../components/common/LoopingVideo";

import { FREE, S_SMARTSYNC, S_VOICE_RX, S_DDX, S_ASK_TATVA, S_RX_DIGITIZATION, S_RECEPTIONIST_AGENT, PERSISTANT_STORAGE_KEY_AUTH_TOKEN, FAILED_VERIFICATION, PENDING_VERIFICATION, GB_ZYDUS_USER } from "../../../utils/constants";
import GenRxKnowMore from "../../../components/GenRxKnowMore";
import DDxKnowMore from "../../../components/DDxKnowMore";
import SmartSyncKnowMore from "../components/SmartSyncKnowMore";
import CvtKnowMore from "../../smartSync/components/CvtKnowMore";
import AskTatvaKnowMore from "./AskTatvaKnowMore";
import { errorMessage, getClinicName, getDeviceSdkData, getTokenData, sendMessageToParent } from "../../../utils/utils";

import { services } from "../../../redux/doctorsSlice";
import { checkCredits } from "../../../redux/monetizationSlice";
import FullPageLoader from "../../vaccination/components/Loader";
import config from "../../../config";
import { useLocalStorage } from "../../../utils/localStorage";
import ExpiredSubModal from "./ExpiredSubModal";
import ReceptionistKnowMore from "../../appointmentAgent/components/knowMore/ReceptionistKnowMore";
import ContactSupportModal from "../../../common/ContactSupportModal";
import { EVENTS } from "../../../utils/events";
import GroundingKnowMore from "../../../components/GroundingKnowMore";
import { env } from "../../../EnvironmentConfig";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { ASSETS } from "../../../assets";
const {
  microphoneVoiceRx: RxVoice,
  iconAskTatva: AskTatvaIcon,
  ddxIcon: DDXIcon,
  support: supportwhite,
  receptionistIcon: RECEPTIONISTIcon,
  smartSyncIcon,
  newGif_3: newGifWebm,
  newGif_2: newGifMp4,
} = ASSETS.images;

function AiSuite({ aiModal, handleAiSuite }) {

    const [getToken, setToken] = useLocalStorage(
        PERSISTANT_STORAGE_KEY_AUTH_TOKEN
    );
    const tokenData = getTokenData();
    const baseUrl = config.tatvaAi_api_url;
    const tatvaAiURL = config.tatvaAi_url;
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { planDetails } = useSelector((state) => state.subscription);

    const { servicesList, profile } = useSelector((state) => state.doctors);
    const ASK_TATVA_planDetails = servicesList?.find(e => e.service_name === S_ASK_TATVA)

    const [aiServicesData, setAiServicesData] = useState([]);
    const [genRxKnowMoreDrawer, setGenRxKnowMoreDrawer] = useState(false);
    const [ddxKnowMoreDrawer, setDDxKnowMoreDrawer] = useState(false);
    const [smartSyncKnowMoreDrawer, setSmartSyncKnowMoreDrawer] = useState(false);
    const [cvtDrawer, setCvtDrawer] = useState(false);
    const [groundingKnowMoreDrawer, setGroundingKnowMoreDrawer] = useState(false);
    const [askTatvaKnowMoreDrawer, setAskTatvaKnowMoreDrawer] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIReceptionistKnowMoreDrawer, setIsAIReceptionistKnowMoreDrawer] = useState(false);
    const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
    const isGroundingAccessableForZydus =
        tokenData?.hospital_business_id == env.zydus_business_id &&
        isZydusUserAccessableFromGB;

    const clickContactSupport = useCallback(() => {
        setIsModalOpen(!isModalOpen);
    }, [isModalOpen]);

    useEffect(() => {
        if (servicesList?.length) {
            const jsonArray = servicesList?.filter(({ service_type }) => service_type === 'ai')
            setAiServicesData(jsonArray.sort((a, b) => {
                return (a.purchased === b.purchased) ? 0 : a.purchased === "true" ? -1 : 1;
            }))
        }
    }, [servicesList]);

    const clickKnowMore = (service_name) => {
        if (service_name === S_VOICE_RX) {
            handleGenRxKnowMore()
        } else if (service_name === S_SMARTSYNC) {
            handleSmartSyncKnowMore()
        } else if (service_name === S_RX_DIGITIZATION) {
            handleDrawerCvtKnowMore()
        } else if (service_name === S_DDX) {
            handleDDxKnowMore()
        } else if (service_name === S_ASK_TATVA) {
            handleAskTatvaKnowMore()
        }
        else if( service_name === S_RECEPTIONIST_AGENT){
            handleAIReceptionistKnowMore()
        }
        const clinic_name = getClinicName(profile?.hospital_data);
        const deviceSdkData = getDeviceSdkData();
        window.Moengage.track_event("TP_monetization_AISuite_Knowmore", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            clinic_id: tokenData?.clinic_id,
            um_id: tokenData?.user_id,
            clinic_Name: clinic_name,
            payment_Status: planDetails?.currentPlanStatus,
            count_of_know_more: '',
            ...deviceSdkData,
        });
    }

    const handleGenRxKnowMore = () => {
        setGenRxKnowMoreDrawer((prev) => !prev);
    };

    const handleDDxKnowMore = () => {
        setDDxKnowMoreDrawer((prev) => !prev);
    };

    const handleSmartSyncKnowMore = () => {
        setSmartSyncKnowMoreDrawer((prev) => !prev);
    };

    const handleDrawerCvtKnowMore = () => {
        setCvtDrawer((prev) => !prev);
    };

    const handleAskTatvaKnowMore = () => {
        setAskTatvaKnowMoreDrawer((prev) => !prev);
    };

    const handleGroundingKnowMore = () => {
        setGroundingKnowMoreDrawer((prev) => !prev);
    };

    const showHideSubModal = useCallback(() => {
        setIsSubModalOpen(!isSubModalOpen);
    }, [isSubModalOpen]);

    const handleAIReceptionistKnowMore = () => {
        setIsAIReceptionistKnowMoreDrawer((prev) => !prev);
    };

    const handleTatvaAi = async () => {
        try {
            setLoading(true);
            window.Moengage.track_event("TP_TatvaAI_Open", {
                Doctor_Name: profile?.um_name,
                Doctor_Number: profile?.um_contact,
                Doctor_Unique_Id: profile?.doctor_unique_id,
                Doctor_Um_Id: tokenData?.user_id,
                Payment_Status: planDetails?.currentPlanStatus,
            });
            const token = await getToken();

            const response = await axios.post(
                `${baseUrl}/api/v1/practice/tatva-ai-token`,
                {
                    mobileNumber: `91${profile?.um_contact}`,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            // Extract the token from the response
            const tatvaAitoken = response.data.data.token;

            // Construct the new URL with the token
            const newUrl = `${tatvaAiURL}/login?authToken=${tatvaAitoken}&app=ask_tatva`;

            setLoading(false);

            if (!isChrome && !isSafari) {
                // navigate(`/?url=${newUrl}&key=phpRedirect`, { replace: true });
                // navigate(0, { replace: true });
                sendMessageToParent(EVENTS.REDIRECT, {
                    url: newUrl,
                });
            } else {
                await window.open(newUrl, "_blank");
            }
        } catch (error) {
            setLoading(false);
            console.error("API Error:", error);
            errorMessage(error.message);
        }
    };

    const checkTatvaAiPurchased = async () => {
        if (ASK_TATVA_planDetails?.plan_tier === FREE && ASK_TATVA_planDetails?.credit_balance <= 0) {
            showHideSubModal()
        } else if (ASK_TATVA_planDetails?.plan_tier === FAILED_VERIFICATION) {
            showHideSubModal()
        } else {
            let sendData = {
                b2c_id: profile?.b2c,
                service_name: S_ASK_TATVA
            }
            const action = await dispatch(checkCredits(sendData));
            if (action.meta.requestStatus === "fulfilled") {
                if (action?.payload?.hasOwnProperty("service_name")) {
                    if (action?.payload?.plan_tier === FREE && action?.payload?.credit_balance <= 0) {
                        if (action?.payload?.credit_balance != ASK_TATVA_planDetails?.credit_balance) {
                            await dispatch(services(sendData?.b2c_id))
                        }
                        showHideSubModal()
                    } else if (action?.payload?.plan_tier === FAILED_VERIFICATION) {
                        showHideSubModal()
                    } else {
                        handleTatvaAi();
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
    }

    const clickBuyNow = (service_name) => {
        navigate('/get-unlimited-access', { state: { buyServiceName: service_name } })
    }

    const getIcon = (service_name) => {
        switch (service_name) {
            case S_VOICE_RX:
                return RxVoice;
            case S_ASK_TATVA:
                return AskTatvaIcon;
            case S_DDX:
                return DDXIcon;
            case S_SMARTSYNC:
                return smartSyncIcon;
            case S_RX_DIGITIZATION:
                return DDXIcon;
            case S_RECEPTIONIST_AGENT:
                return RECEPTIONISTIcon;
            default:
                return "";
        }
    }

    return (
        <>
            <Drawer
                placement="right"
                open={aiModal}
                closeIcon={false}
                onClose={handleAiSuite}
                width={600}>
                <div className="modalCard-header h-60 position-sticky top-0 z-2">
                    <div className="align-items-center d-flex h-100">
                        <div className="border-end h-100 text-center me-3">
                            <div onClick={handleAiSuite}
                                className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer">
                                <i className="icon-right"></i>
                            </div>
                        </div>
                        <div className="fs-18 fw-semibold">AI Suite</div>
                    </div>
                </div>
                <div className="px-4 h-100 bg-white overflow-y-auto" style={{ maxHeight: 'calc(100vh - 60px)' }}>
                    {
                        isGroundingAccessableForZydus && (
                            <div className={`ai-suite my-4`}>
                                <div className="d-flex align-items-center mb-3">
                                    <img style={{ background: '#EDDFF780', padding: 6 }} className="rounded-10px me-2" src={RxVoice} alt="item.type" />
                                    <div className="fs-18 fw-semibold text-1F2933">{"Zydus Data Engine"}</div>
                                    <LoopingVideo
                                        webm={newGifWebm}
                                        mp4={newGifMp4}
                                        width={40}
                                        height={18}
                                        style={{ marginLeft: 10 }}
                                        ariaLabel="New"
                                    />
                                </div>
                                <div>
                                    With a curated list of <span className="semi-bold-text">medicines</span> and tests from the <span className="semi-bold-text">Zydus Data Engine</span>, our AI adapts to your <span className="semi-bold-text">prescribing style</span>, surfacing the most <span className="semi-bold-text">relevant suggestions</span> while you prescribe, and helping <span className="semi-bold-text">boost patient fulfilment</span> and <span className="semi-bold-text">improve accuracy</span>.
                                </div>
                                <Row className="mt-4">
                                    <Col lg={12}>
                                        <Button className='w-100 btn ant-btn btn-41 btn-primary1 btn-outline-primary' onClick={handleGroundingKnowMore}>
                                            Know More
                                        </Button>
                                    </Col>
                                </Row>
                            </div>
                        )
                    }
                    {aiServicesData?.map((item, index) => {
                        return (
                            <div key={index}>
                                {item?.plan_tier === undefined || item?.plan_tier === FREE || item?.plan_tier === PENDING_VERIFICATION ? (
                                    <div className={`ai-suite my-4 ${item?.credit_balance <= 0 && 'ai-expired'}`}>
                                        <div className="d-flex align-items-center mb-3">
                                            <img style={{ background: '#EDDFF780', padding: 6 }} className="rounded-10px me-2" src={getIcon(item?.service_name)} alt="item.type" />
                                            <div className="fs-18 fw-semibold text-1F2933">{item?.service_display_name}</div>
                                            {item?.credit_balance <= 0 && (<span className="expired-text fs-12-1 fw-semibold mx-2 px-2 text-white">Free Trial Expired</span>)}
                                        </div>
                                        <p>
                                            {item?.service_description}
                                        </p>
                                        <Row className="mt-4">
                                            <Col lg={item?.plan_tier !== PENDING_VERIFICATION ? 6 : 12}>
                                                <Button className='w-100 btn ant-btn btn-41 btn-primary1 btn-outline-primary' onClick={() => clickKnowMore(item?.service_name)}>
                                                    Know More
                                                </Button>
                                            </Col>
                                            {item?.plan_tier !== PENDING_VERIFICATION && (
                                                <Col lg={6}>
                                                    <Button className="btn btn-primary3 btn-41 w-100" onClick={() => clickBuyNow(item?.service_name)}>
                                                        Buy Now
                                                    </Button>
                                                </Col>
                                            )}
                                        </Row>
                                    </div>
                                ) : item?.plan_tier === undefined || item?.plan_tier === FAILED_VERIFICATION ? (
                                    <div className={`ai-suite my-4 ai-expired`}>
                                        <div className="d-flex align-items-center mb-3">
                                            <img style={{ background: '#EDDFF780', padding: 6 }} className="rounded-10px me-2" src={getIcon(item?.service_name)} alt="item.type" />
                                            <div className="fs-18 fw-semibold text-1F2933">{item?.service_display_name}</div>
                                            <span className="expired-text fs-12-1 fw-semibold mx-2 px-2 text-white">Payment Failed</span>
                                        </div>
                                        <p>
                                            {item?.service_description}
                                        </p>
                                        <div className="text-danger-custom fs-16">
                                            Your payment for the <span className="text-red fw-semibold text-danger-custom">{item?.service_display_name}</span> Add-on has failed. Please contact Support for further assistance.!
                                        </div>
                                        <Row className="mt-4">
                                            <Col lg={6}>
                                                <Button className='w-100 btn ant-btn btn-41 btn-primary1 btn-outline-primary' onClick={() => clickKnowMore(item?.service_name)}>
                                                    Know More
                                                </Button>
                                            </Col>
                                            <Col lg={6}>
                                                <Button className="btn btn-primary3 btn-41 w-100 d-flex align-items-center justify-content-center" onClick={clickContactSupport}>
                                                    <img loading="lazy" src={supportwhite} className="buttonIcon me-1" alt="Contact Support" /> Contact Support
                                                </Button>
                                                <ContactSupportModal isModalOpen={isModalOpen} clickContactSupport={clickContactSupport} />
                                            </Col>
                                        </Row>
                                    </div>
                                ) : (
                                    <div className="ai-suite ai-purchased my-4">
                                        <Row className="align-items-center">
                                            <Col lg={8}>
                                                <div className="d-flex align-items-center mb-2">
                                                    <img style={{ background: '#E6C3FF80' }} className="p-1 rounded-10px me-2" src={getIcon(item?.service_name)} alt="item.type" />
                                                    <div className="fs-18 fw-semibold text-1F2933">{item?.service_display_name}</div>
                                                    <span className="purchased-text fs-12-1 fw-semibold mx-2 px-2 text-white">Purchased</span>
                                                </div>
                                                <p className="mb-0">
                                                    {item?.service_description}&nbsp;
                                                    <Link className="text-decoration-underline fw-medium text-primary" onClick={() => clickKnowMore(item?.service_name)}>Know more</Link>
                                                </p>
                                            </Col>
                                            <Col lg={4} className="text-center">
                                                <div className="text-themesecondarylight fs-12-1">Valid till</div>
                                                <div className="text-secondary-custom fw-semibold">{moment(item?.plan_end_date).format('Do MMM YYYY')}</div>
                                            </Col>
                                        </Row>
                                    </div>
                                )}
                            </div>
                        )
                    })}

                </div>
            </Drawer>

            {genRxKnowMoreDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    open={genRxKnowMoreDrawer}
                    onClose={handleGenRxKnowMore}
                    className=".modalWidth-800"
                    width={825}
                >
                    <GenRxKnowMore 
                        handleGenRxKnowMore={handleGenRxKnowMore} 
                        isOpen={genRxKnowMoreDrawer}
                    />
                </Drawer>
            )}

            {smartSyncKnowMoreDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    open={smartSyncKnowMoreDrawer}
                    onClose={handleSmartSyncKnowMore}
                    className=".modalWidth-800"
                    width={600}
                >
                    <SmartSyncKnowMore handleSmartSyncKnowMore={handleSmartSyncKnowMore} />
                </Drawer>
            )}

            {ddxKnowMoreDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    open={ddxKnowMoreDrawer}
                    onClose={handleDDxKnowMore}
                    className=".modalWidth-800"
                    width={825}
                >
                    <DDxKnowMore handleDDxKnowMore={handleDDxKnowMore} />
                </Drawer>
            )}

            {cvtDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    onClose={handleDrawerCvtKnowMore}
                    open={cvtDrawer}
                    className=".modalWidth-800"
                    width={800}
                >
                    <CvtKnowMore handleDrawerCvtKnowMore={handleDrawerCvtKnowMore} handleCollapsed={handleDrawerCvtKnowMore} />
                </Drawer>
            )}

            {groundingKnowMoreDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    onClose={handleGroundingKnowMore}
                    open={groundingKnowMoreDrawer}
                    className=".modalWidth-800"
                    width={800}
                >
                    <GroundingKnowMore handleGroundingKnowMore={handleGroundingKnowMore} />
                </Drawer>
            )}

            {askTatvaKnowMoreDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    open={askTatvaKnowMoreDrawer}
                    onClose={handleAskTatvaKnowMore}
                    className=".modalWidth-800"
                    width={600}
                >
                    <AskTatvaKnowMore handleAskTatvaKnowMore={handleAskTatvaKnowMore} onRedirect={checkTatvaAiPurchased} />
                </Drawer>
            )}

            {loading && <FullPageLoader />}

            <ExpiredSubModal
                title={S_ASK_TATVA}
                isSubModalOpen={isSubModalOpen}
                showHideSubModal={showHideSubModal} 
            />

            {isAIReceptionistKnowMoreDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    open={isAIReceptionistKnowMoreDrawer}
                    onClose={handleAIReceptionistKnowMore}
                    className=".modalWidth-800"
                    width={680}
                >
                    <ReceptionistKnowMore handleDDxKnowMore={handleAIReceptionistKnowMore} />
                </Drawer>
            )}
        </>

    );
}

export default React.memo(AiSuite);
