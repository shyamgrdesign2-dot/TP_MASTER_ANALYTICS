import React, { useMemo } from "react";
import { Button, Modal, Card } from "antd";
import { isMobile, isTablet } from "react-device-detect";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import CampaignDiscount from "./CampaignDiscount";

import { interest } from "../../../redux/monetizationSlice";
import { errorMessage, getClinicName, getDeviceSdkData, getTokenData, shouldMonetizationDisabled } from "../../../utils/utils";
import { openModal } from "../../../redux/doctorModalSlice";
import { FAILED_VERIFICATION, FREE, S_IPD, S_PHARMACY, S_TATVA_PRACTICE, TRIAL } from "../../../utils/constants";
import { ASSETS } from "../../../assets";
const {
  expiredInfographic2,
  coinLg,
  crown,
  sms2: SMS2,
  planExpiredSandClock,
} = ASSETS.images;

function ExpiredSubModal({ title, styles, isSubModalOpen, showHideSubModal }) {

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const tp_monetization_enable = !shouldMonetizationDisabled();

    const { profile, servicesList } = useSelector((state) => state.doctors);
    const AI_planDetails = servicesList?.find(e => e.service_name === title)

    const { planDetails } = useSelector((state) => state.subscription);
    const { service_mappings } = planDetails || {};
    const EMR_planDetails = service_mappings?.find(e => e.service_name === S_TATVA_PRACTICE)
    const NonAI_planDetails = service_mappings?.find(e => e.service_name === title)

    const clickBuyNow = (service_name) => {
        navigate('/get-unlimited-access', { state: { buyServiceName: service_name } })
        const clinic_name = getClinicName(profile?.hospital_data);
        const tokenData = getTokenData();
        const deviceSdkData = getDeviceSdkData();
        window.Moengage.track_event("TP_Monetization_VoiceRx_GetUnlimitedRx", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            clinic_id: tokenData?.clinic_id,
            um_id: tokenData?.user_id,
            clinic_Name: clinic_name,
            former_page: service_name,
            ...deviceSdkData,
        });
    }

    const clickRequestCallback = async (service_name) => {
        showHideSubModal()
        dispatch(openModal(service_name))
        // let sendData = {
        //     mbl_no: profile?.um_contact,
        //     is_pm_renew_requested: true,
        //     service_name: service_name
        // }
        // const action = await dispatch(interest(sendData));
        // if (action.meta.requestStatus === "fulfilled") {
        //     showHideSubModal()
        //     errorMessage(action.payload.message)
        // }
        const clinic_name = getClinicName(profile?.hospital_data);
        const tokenData = getTokenData();
        const deviceSdkData = getDeviceSdkData();
        window.Moengage.track_event("TP_Monetization_RequestACallback", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            clinic_id: tokenData?.clinic_id,
            um_id: tokenData?.user_id,
            clinic_Name: clinic_name,
            former_page: service_name,
            ...deviceSdkData,
        });
    }

    const isPurchased = () => {
        if (EMR_planDetails?.plan_tier !== TRIAL && NonAI_planDetails?.plan_tier === TRIAL) {
            return true;
        } else {
            return false;
        }
    }

    return (
        <Modal
            open={isSubModalOpen}
            closeIcon={false}
            footer={null}
            centered
            className="voicerx-modal text-center"
            width={435}
            styles={styles}
        >
            <Card
                extra={
                    <>
                        {(AI_planDetails?.plan_tier === FREE && AI_planDetails?.service_type === 'ai' && AI_planDetails?.credit_balance > 0) && (
                            <img className="coinLg" src={coinLg} alt="Tatva Coin" />
                        )}
                        {AI_planDetails?.plan_tier !== FAILED_VERIFICATION && (
                            <button className="position-relative z-1 btn p-1 lh-1 btnclose closeButton" onClick={showHideSubModal}>
                                <i className="icon-Cross"></i>
                            </button>
                        )}
                        <img className="expiredInfographic" src={expiredInfographic2} alt="Your trial plan has Expired" />
                        <img className="expiredInfographic" style={{ opacity: 0.5 }} src={expiredInfographic2} alt="Your trial plan has Expired" />
                    </>
                }>

                {(AI_planDetails?.plan_tier === FREE && AI_planDetails?.service_type === 'ai' && AI_planDetails?.credit_balance > 0) ? (
                    <div className="text-white fs-16">
                        <span className="fw-bold fs-2 text-white">{AI_planDetails?.credit_balance}</span>
                        <span className="text-white fw-semibold"></span> free Trial Left! <br />
                        You can generate up to <span className="fw-bold text-white">{AI_planDetails?.credit_balance} RX</span> using {AI_planDetails?.service_type == 'ai' && 'AI'} {AI_planDetails?.service_display_name} for absolutely free!
                    </div>
                ) : (AI_planDetails?.plan_tier === FAILED_VERIFICATION && AI_planDetails?.service_type === 'ai') ? (
                    <>
                        <img src={planExpiredSandClock} className="plan-expired-clock" alt="Expired Clock" />
                        <div className="text-white fs-16">
                            Your payment for the <span className="text-white fw-semibold">{AI_planDetails?.service_display_name}</span> Add-on has failed. Please contact Support for further assistance!
                        </div>
                    </>
                ) : (
                    (isPurchased() || AI_planDetails?.credit_balance === 0) ? (
                        <>
                            <img src={planExpiredSandClock} className="plan-expired-clock" alt="Expired Clock" />
                            <div className="text-white">
                                Your<span className="text-white fw-semibold"> {AI_planDetails?.service_type == 'ai' ? AI_planDetails?.service_display_name : NonAI_planDetails?.service_display_name} trial plan  </span>  has expired. <br />
                                Upgrade now to continue a hassle free experience!
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-white fs-16">
                                You're on a <span className="text-white fw-semibold"> trial plan</span>! Enjoy unlimited access to <span className="fw-bold text-white">{NonAI_planDetails?.service_display_name}</span> feature before your trial ends!
                            </div>
                        </>
                    )
                )}

                {(AI_planDetails?.plan_tier === FAILED_VERIFICATION && AI_planDetails?.service_type === 'ai') ? (
                    <div className="bg-white p-4 rounded-5 mt-4 text-start">
                        <div className="align-items-center my-3">
                            <i className="icon-phone fs-16 border p-1 rounded-2 me-1 text-secondary-custom"></i>
                            <a className="text-main fw-medium fs-16 text-welcome" href="tel:+91-9974042363">
                                +91-9974042363
                            </a>
                        </div>
                        <div className="align-items-center my-3">
                            <span className="me-2 border p-1 rounded-2" style={{ padding: '2px 4px' }}>
                                <img width={16} height={16} src={SMS2} />
                            </span>
                            <a className="text-main fw-medium fs-16 text-welcome" href="mailto:support@tatvacare.in" >
                                Support@tatvacare.in
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-4 rounded-5 mt-4">
                        <div className="fs-4 fw-bold text-price">Upgrade Now 🚀</div>
                        <div className="mt-3 text-price">Unlock unlimited <span className="fw-bold text-price">{AI_planDetails?.service_type == 'ai' ? `AI ${AI_planDetails?.service_display_name}` : `${NonAI_planDetails?.service_display_name}`}</span>, a trusted feature used by <span className="fw-bold text-price">5,000+ doctors</span> across clinics.</div>

                        {/* {AI_planDetails?.discount && (
                        <CampaignDiscount flag={2} title={AI_planDetails?.service_name}/>
                    )} */}

                        <div>
                            <Button type='button' className='mt-3 btn align-items-center mx-auto d-flex btn-41 btn-text btn-save' style={{ height: 52 }} onClick={() => clickRequestCallback(title)}>
                                <i className='icon-phone text-primary me-2'></i>
                                Request a call back
                            </Button>
                        </div>
                        {![S_PHARMACY, S_IPD].includes(title) && tp_monetization_enable && !(isMobile && !isTablet) &&
                            <div>
                                <Button className="mt-3 btn btn-proceed btn-primary3 w-100 align-items-center justify-content-center d-flex" onClick={() => clickBuyNow(title)}>
                                    <img className="me-2" src={crown} alt="Crown" />
                                    Get Unlimited Access
                                </Button>
                            </div>
                        }
                    </div>
                )}

            </Card>
        </Modal>
    )
}

export default React.memo(ExpiredSubModal);
