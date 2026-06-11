import React, { useEffect, useState } from "react";
import { Card, Modal } from "antd";
import { Button, Col, Row } from "react-bootstrap";
import moment from "moment";
import { useNavigate } from "react-router-dom";

import { useSelector, useDispatch } from "react-redux";
import { TRIAL, S_TATVA_PRACTICE } from "../../../utils/constants";
import { errorMessage, getClinicName, getDeviceSdkData, getTokenData, shouldMonetizationDisabled } from "../../../utils/utils";

import { extendFreeTrial, interest } from "../../../redux/monetizationSlice";
import { services, setB2C_Profile } from "../../../redux/doctorsSlice";
import { openModal } from "../../../redux/doctorModalSlice";
import { fetchSubscriptionDetails } from "../../../redux/subscriptionSlice";
import { deviceType, osName, isMobile, isTablet } from "react-device-detect";
import "./ExtendTrialModal.scss";
import { ASSETS } from "../../../assets";
const {
  listIcon,
  expiredInfographic,
  messages2: contactSupport,
  crown,
  planExpiredSandClock,
} = ASSETS.images;

function ExtendTrialModal() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { profile } = useSelector((state) => state.doctors);

    const { planDetails } = useSelector((state) => state.subscription);
    const { clinic_b2c, plan_expiry_date, service_mappings } = planDetails || {};
    const EMR_planDetails = service_mappings?.find(e => e.service_name === S_TATVA_PRACTICE)

    const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);

    const tp_monetization_enable = !shouldMonetizationDisabled();
    const urlParams = new URLSearchParams(window.location.search);
    const isReceptionist = urlParams.has("receptionist");

    useEffect(() => {
        if (!planDetails && !isReceptionist) {
            dispatch(fetchSubscriptionDetails());
        }
    }, [planDetails, dispatch]);

    useEffect(() => {
        if (profile && !profile?.b2c && planDetails?.profile_b2c && !isReceptionist) {
            dispatch(setB2C_Profile(planDetails.profile_b2c));
        }
    }, [profile, profile?.b2c, planDetails?.profile_b2c, dispatch]);

    useEffect(() => {
        const b2c = profile?.b2c ?? planDetails?.profile_b2c;
        b2c !== null && b2c !== undefined && tp_monetization_enable && !isReceptionist && dispatch(services(b2c));
    }, [profile?.b2c, planDetails?.profile_b2c]);

    useEffect(() => {
        service_mappings?.length > 0 && tp_monetization_enable && checkBillingPurchased()
    }, [service_mappings]);

    const checkBillingPurchased = async () => {
        const emrEndDate = moment(plan_expiry_date);
        const currentDate = moment();
        if (EMR_planDetails?.plan_tier === TRIAL && emrEndDate.isBefore(currentDate, 'day')) {
            setIsExpiredModalOpen(true);
        }
    }

    const onExtendFreeTrialClick = async () => {
        const action = await dispatch(extendFreeTrial());
        if (action.meta.requestStatus === "fulfilled") {
            setIsExpiredModalOpen(false)
            errorMessage('Trial plan has been extended successfully')
            dispatch(fetchSubscriptionDetails())
        }
        const clinic_name = getClinicName(profile?.hospital_data);
        const tokenData = getTokenData();
        const deviceSdkData = getDeviceSdkData();
        window.Moengage.track_event("TP_Monetization_FreeTrailExtension", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            clinic_id: tokenData?.clinic_id,
            um_id: tokenData?.user_id,
            clinic_Name: clinic_name,
            ...deviceSdkData
        });
    }

    const clickBuyNow = () => {
        setIsExpiredModalOpen(false)
        navigate('/get-unlimited-access')
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
            former_page: S_TATVA_PRACTICE,
            ...deviceSdkData,
        });
    }

    const clickRequestCallback = async () => {
        dispatch(openModal(EMR_planDetails?.service_name))
        // let sendData = {
        //     mbl_no: profile?.um_contact,
        //     is_pm_renew_requested: true,
        //     service_name: EMR_planDetails?.service_name
        // }
        // const action = await dispatch(interest(sendData));
        // if (action.meta.requestStatus === "fulfilled") {
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
            former_page: EMR_planDetails?.service_name,
            ...deviceSdkData,
        });
    }

    const contactNumberandEmail = () => {
        const clinic_name = getClinicName(profile?.hospital_data);
        const tokenData = getTokenData();
        const deviceSdkData = getDeviceSdkData();
        window.Moengage.track_event("TP_Monetization_VoiceRx_Contact_Support", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            clinic_id: tokenData?.clinic_id,
            um_id: tokenData?.user_id,
            clinic_Name: clinic_name,
            ...deviceSdkData,
        });
    }

    return (
        <Modal
            open={isExpiredModalOpen}
            closeIcon={false}
            footer={null}
            width={1020}
            // onCancel={() => setIsExpiredModalOpen(false)}
            centered
            className="expired-model expired-model-responsive position-relative"
            style={{ padding: 0, maxWidth: "100%" }}
            // maskClosable={false} Uncomment this when model mask closable true
            destroyOnClose>
            <Card className="extend-trial-modal-card">
                {/* className="expired-red-card" Add this class using red color background in above Card tag*/}
                <>
                    <img className="expiredInfographic" src={expiredInfographic} alt="Your trial plan has Expired" />
                    <Row className="position-relative">
                        <Col lg={5}>
                            <div className="expired-modal-title">
                                Your trial plan has Expired!
                            </div>
                            <div className="fontroboto fs-18 text-white mt-4">
                                Your <b>trial plan</b> has expired. Upgrade now to continue a hassle free access!
                            </div>
                            {/* Hide Below code when red color background required */}
                            <div className="extend-free-trial px-5 py-2 mt-4">
                                <div className="fs-18 py-2 fw-bold text-yellow-light"> 🎁 Wait! Just for You...</div>
                                <div className="fs-12-1 fw-medium text-yellow-light">Need more time? Extend your trial plan — limited-time only!</div>
                                <hr style={{ borderStyle: "dashed" }} />
                                <Button className="btn btn-proceed fs-16 fw-semi-bold" style={{ background: '#3D8C40' }} onClick={onExtendFreeTrialClick}>
                                    Extend Your Trial Plan
                                </Button>
                            </div>
                            {/* End  */}
                            {/* <img src={planExpiredSandClock} className="plan-expired-clock" alt="Expired Clock" /> Add this img using red color background in above Card tag*/}
                        </Col>
                        <Col lg={7}>
                            <div className="bg-white p-30 rounded-20px">
                                <div className="mb-4 text-1F2933 fw-semibold fs-4"> Don't Lose Your Digital Advantage!</div>
                                <div className="mb-3"> Upgrade your plan to continue</div>
                                <div className="d-flex align-items-center py-2">
                                    <img className="me-2" src={listIcon} alt="icon" />
                                    <div className="fs-14 text-start">Seamless clinic management all in one place</div>
                                </div>
                                <div className="d-flex align-items-center py-2">
                                    <img className="me-2" src={listIcon} alt="icon" />
                                    <div className="fs-14 text-start">Secure & instant access to patient records</div>
                                </div>
                                <div className="d-flex align-items-center py-2">
                                    <img className="me-2" src={listIcon} alt="icon" />
                                    <div className="fs-14 text-start">Effortless e-prescriptions with less paperwork</div>
                                </div>
                                <div className="d-flex align-items-center py-2">
                                    <img className="me-2" src={listIcon} alt="icon" />
                                    <div className="fs-14 text-start">Generate AI-powered prescriptions in seconds & more</div>
                                </div>
                                {EMR_planDetails?.discount && (
                                    <div class="my-4 flat-20 py-2 fs-16">🔥Unlock Unlimited Access&nbsp;<span>- Flat {EMR_planDetails?.discount}% OFF!</span></div>
                                )}
                                <Row>
                                    <Col lg={tp_monetization_enable ? 6 : 12}>
                                        <Button type='button' className='w-100 btn align-items-center justify-content-center d-flex btn-41 btn-outline-primary' style={{ height: 52 }} onClick={clickRequestCallback}>
                                            <i className='icon-phone me-2'></i>
                                            Request a call back
                                        </Button>
                                    </Col>
                                    {tp_monetization_enable && !(isMobile && !isTablet) && (
                                        <Col lg={6}>
                                            <Button className="btn btn-proceed btn-primary3 w-100 align-items-center justify-content-center d-flex" onClick={clickBuyNow}>
                                                <img className="me-2" src={crown} alt="Crown" />
                                                Get Unlimited Access
                                            </Button>
                                        </Col>
                                    )}
                                </Row>
                            </div>
                            <div className="d-flex align-items-center pt-3">
                                <img className="me-2" src={contactSupport} alt="Contact Support" />
                                <div className="fs-16 text-white opacity-08">Contact Support:</div>
                                <a href="tel:+91-9974042363" className="fs-16 fw-medium text-white" onClick={contactNumberandEmail}>&nbsp;+91-9974042363&nbsp;|</a>
                                <a href="mailto:Support@tatvacare.in" className="fs-16 fw-medium text-white" onClick={contactNumberandEmail}>&nbsp;Support@tatvacare.in</a>
                            </div>
                        </Col>
                    </Row>
                </>
            </Card>
        </Modal >
    );
}

export default React.memo(ExtendTrialModal);