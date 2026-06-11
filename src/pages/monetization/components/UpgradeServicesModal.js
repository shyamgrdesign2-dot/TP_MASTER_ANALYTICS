import React, { useCallback, useState } from "react";
import { Card, Drawer, Modal } from "antd";
import { Button, Col, Row } from "react-bootstrap";
import Slider from "react-slick";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import axios from "axios";
import { isChrome, isSafari } from "react-device-detect";

import { S_TATVA_PRACTICE, S_SMARTSYNC, S_VOICE_RX, S_DDX, S_RX_DIGITIZATION, S_IPD, S_ASK_TATVA, S_PHARMACY, S_BILLING, S_RECEPTIONIST_AGENT, PERSISTANT_STORAGE_KEY_AUTH_TOKEN, FREE, FAILED_VERIFICATION } from "../../../utils/constants";
import { QRCodeSVG } from "qrcode.react";
import GenRxKnowMore from "../../../components/GenRxKnowMore";
import SmartSyncKnowMore from "./../components/SmartSyncKnowMore";
import CvtKnowMore from "../../smartSync/components/CvtKnowMore";
import DDxKnowMore from "../../../components/DDxKnowMore";
import IPDKnowMore from "./../components/IPDKnowMore";
import AskTatvaKnowMore from "./../components/AskTatvaKnowMore";
import PharmacyKnowMore from "./../components/PharmacyKnowMore";
import BillingKnowMore from "./../components/BillingKnowMore";
import MedEcoAppKnowMore from "./../components/MedEcoAppKnowMore";
import { errorMessage, getClinicName, getDeviceSdkData, getTokenData, sendMessageToParent } from "../../../utils/utils";

import { services } from "../../../redux/doctorsSlice";
import { checkCredits } from "../../../redux/monetizationSlice";
import FullPageLoader from "../../vaccination/components/Loader";
import config from "../../../config";
import { useLocalStorage } from "../../../utils/localStorage";
import ExpiredSubModal from "./ExpiredSubModal";
import { EVENTS } from "../../../utils/events";
import { ASSETS } from "../../../assets";
const {
  upgradedLogo,
  medcoIcon,
  listIcon,
  aiPowered,
  vaccination: vaccinationImg,
  edit: iconEdit,
} = ASSETS.images;

function UpgradeServicesModal({ isUpgradeModal, upgradeList, handleUpgradeModal }) {

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

    const EMR_PlanDetails = upgradeList.includes(S_TATVA_PRACTICE) ? servicesList?.find(e => e.service_name === S_TATVA_PRACTICE) : null
    const withoutEMR = upgradeList.filter(item => item !== S_TATVA_PRACTICE)
    const purchasedData = servicesList?.filter(e => withoutEMR.includes(e.service_name))

    const [genRxKnowMoreDrawer, setGenRxKnowMoreDrawer] = useState(false);
    const [ddxKnowMoreDrawer, setDDxKnowMoreDrawer] = useState(false);
    const [smartSyncKnowMoreDrawer, setSmartSyncKnowMoreDrawer] = useState(false);
    const [cvtDrawer, setCvtDrawer] = useState(false);
    const [askTatvaKnowMoreDrawer, setAskTatvaKnowMoreDrawer] = useState(false);
    const [iPDKnowMoreDrawer, setIPDKnowMoreDrawer] = useState(false);
    const [pharmacyKnowMoreDrawer, setPharmacyKnowMoreDrawer] = useState(false);
    const [billingDrawer, setBillingDrawer] = useState(false);
    const [medEcoKnowMoreDrawer, setMedEcoKnowMoreDrawer] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);

    const settings = {
        infinite: true,
        speed: 500,
        dots: true,
        arrows: upgradeList.includes(S_TATVA_PRACTICE) && upgradeList?.length === 1 ? false : purchasedData?.length <= 2 ? false : true,
        adaptiveHeight: true,
        autoplay: false,
    };

    const handleUpgradeModalClick = () => {
        const clinic_name = getClinicName(profile?.hospital_data);
        const tokenData = getTokenData();
        const deviceSdkData = getDeviceSdkData();
        window.Moengage.track_event("TP_Monetization_StartExploring", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            clinic_id: tokenData?.clinic_id,
            um_id: tokenData?.user_id,
            clinic_Name: clinic_name,
            ...deviceSdkData,
        });
        handleUpgradeModal();
    }
    const clickKnowMore = (service_name) => {
        if (service_name === S_VOICE_RX) {
            handleGenRxKnowMore()
        } else if (service_name === S_SMARTSYNC) {
            handleSmartSyncKnowMore()
        } else if (service_name === S_RX_DIGITIZATION) {
            handleDrawerCvtKnowMore()
        } else if (service_name === S_DDX) {
            handleDDxKnowMore()
        } else if (service_name === S_IPD) {
            handleIPDKnowMore()
        } else if (service_name === S_ASK_TATVA) {
            handleAskTatvaKnowMore()
        } else if (service_name === S_PHARMACY) {
            handlePharmacyKnowMore()
        } else if (service_name === S_BILLING) {
            handleBillingKnowMore()
        } else if (service_name === S_TATVA_PRACTICE) {
            handleMedEcoKnowMore()
        } else if (service_name === S_RECEPTIONIST_AGENT) {
            handleMedEcoKnowMore()
        }
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

    const handleIPDKnowMore = () => {
        setIPDKnowMoreDrawer((prev) => !prev);
    };

    const handlePharmacyKnowMore = () => {
        setPharmacyKnowMoreDrawer((prev) => !prev);
    };

    const handleBillingKnowMore = () => {
        setBillingDrawer((prev) => !prev);
    };

    const handleMedEcoKnowMore = () => {
        setMedEcoKnowMoreDrawer((prev) => !prev);
    };

    const showHideSubModal = useCallback(() => {
        setIsSubModalOpen(!isSubModalOpen);
    }, [isSubModalOpen]);

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

    return (
        <>
            <Modal
                open={isUpgradeModal}
                closeIcon={false}
                footer={null}
                width={750}
                onCancel={handleUpgradeModal}
                className="upgraded-model"
                destroyOnClose>
                <Card
                    extra={
                        <button className="btn p-1 lh-1 btnclose closeButton" onClick={handleUpgradeModal}>
                            <i className="icon-Cross text-white"></i>
                        </button>
                    }>
                    <>
                        <img src={upgradedLogo} alt="upgraded to premium" />
                        <div className="fs-2 fw-bold mt-3">
                            {upgradeList.filter(item => item === S_TATVA_PRACTICE)?.length > 0 ?
                                `You have upgraded to premium`
                                : purchasedData?.length === 1 ?
                                    `${purchasedData[0]?.service_display_name} Activated`
                                    : purchasedData?.length === 2 ?
                                        `${purchasedData[0]?.service_display_name}, ${purchasedData[1]?.service_display_name} Activated`
                                        : `${purchasedData?.length} Add-on Service Activated!`}
                        </div>
                        <div className="mt-3"> Here’s what’s now available to you.</div>
                        <Slider
                            {...settings}
                            slidesToShow={1}>
                            {EMR_PlanDetails && (
                                <div className='upgraded-premium-box w-92'>
                                    <Row>
                                        {EMR_PlanDetails?.service_points?.map((item, index) => {
                                            return (
                                                <Col key={index} lg={6} className="py-2">
                                                    <div className="d-flex align-items-center">
                                                        <img className="mx-2" src={listIcon} alt="icon" />
                                                        <div className="fs-14 fw-medium text-price text-start">{item}</div>
                                                    </div>
                                                </Col>
                                            )
                                        })}
                                    </Row>
                                    <Button className="btn btn-proceed btn-primary3 w-100 mt-4" onClick={handleUpgradeModalClick}>
                                        Start Exploring
                                    </Button>
                                </div>
                            )}
                            {[...Array(Math.ceil(purchasedData.length / 2))]?.map((_, i) => {
                                return (
                                    <div key={i} className='upgraded-premium-box w-92'>
                                        <div className="d-flex">
                                            {purchasedData?.slice(2 * i, (2 * i) + 2)?.map((item, index) => {
                                                return (
                                                    <div key={item?.service_name} className="py-3 upgrade-addon-box">
                                                        <div>
                                                            <div className="fs-18 d-flex align-items-center text-welcome fw-semibold my-2 text-truncate">
                                                                <img style={{ background: '#EDD6FF' }} className="p-1 rounded-10px me-2" src={vaccinationImg} alt="Icon" />
                                                                <div className="d-flex align-items-center" style={{ flexWrap: 'wrap' }}>
                                                                    <div className="me-3">{item?.service_display_name}</div>
                                                                    {item.service_type === 'ai' && (<img src={aiPowered} alt="AI Powered" className="aipowered" />)}
                                                                </div>
                                                            </div>
                                                            <div className="text-start">
                                                                {item?.service_description}
                                                            </div>
                                                        </div>
                                                        <Button className="btn btn-outline-primary w-100 mt-4 mb-3" onClick={() => clickKnowMore(item.service_name)}>
                                                            Know more
                                                        </Button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}

                            {/* <div className='upgraded-premium-box w-92'>
                                <div className="w-100 mx-auto px-3">
                                    <div className="fs-18 fw-semibold"> Scan the Below QR to Download MedEco App</div>
                                    <QRCodeSVG className="rounded-3 my-4" value={config.MEDECO_WEBVIEW_URL} size={150}
                                    // imageSettings={{
                                    //     src: medcoIcon,
                                    //     x: undefined,
                                    //     y: undefined,
                                    //     height: 40,
                                    //     width: 40,
                                    //     excavate: true
                                    // }}
                                    />
                                    <div>Enhance your clinical practice and stay updated with the latest medical insights. <Link className="text-decoration-underline fw-medium text-primary" onClick={() => clickKnowMore(S_TATVA_PRACTICE)}>Know More</Link></div>
                                </div>
                            </div> */}
                        </Slider>
                    </>
                </Card>
            </Modal>
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

            {iPDKnowMoreDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    open={iPDKnowMoreDrawer}
                    onClose={handleIPDKnowMore}
                    className=".modalWidth-800"
                    width={600}
                >
                    <IPDKnowMore handleIPDKnowMore={handleIPDKnowMore} />
                </Drawer>
            )}

            {pharmacyKnowMoreDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    open={pharmacyKnowMoreDrawer}
                    onClose={handlePharmacyKnowMore}
                    className=".modalWidth-800"
                    width={600}
                >
                    <PharmacyKnowMore handlePharmacyKnowMore={handlePharmacyKnowMore} />
                </Drawer>
            )}

            {billingDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    open={billingDrawer}
                    onClose={handleBillingKnowMore}
                    className=".modalWidth-800"
                    width={600}
                >
                    <BillingKnowMore handleBillingKnowMore={handleBillingKnowMore} />
                </Drawer>
            )}

            {medEcoKnowMoreDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    open={medEcoKnowMoreDrawer}
                    onClose={handleMedEcoKnowMore}
                    className=".modalWidth-800"
                    width={600}
                >
                    <MedEcoAppKnowMore handleMedEcoKnowMore={handleMedEcoKnowMore} />
                </Drawer>
            )}

            {loading && <FullPageLoader />}

            <ExpiredSubModal
                title={S_ASK_TATVA}
                isSubModalOpen={isSubModalOpen}
                showHideSubModal={showHideSubModal} />
        </>
    )
}

export default React.memo(UpgradeServicesModal);
