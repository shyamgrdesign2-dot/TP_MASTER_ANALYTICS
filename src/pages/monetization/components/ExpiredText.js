import React, { useCallback, useState } from "react";
import { Button } from "antd";
import { isMobile, isTablet } from "react-device-detect";
import { Col, Row } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

import { FAILED_VERIFICATION, FREE, S_ASK_TATVA, S_IPD, S_PHARMACY, S_TATVA_PRACTICE, TRIAL } from "../../../utils/constants";
import { interest } from "../../../redux/monetizationSlice";
import { errorMessage, getClinicName, getDeviceSdkData, getTokenData, shouldMonetizationDisabled } from "../../../utils/utils";
import { openModal } from "../../../redux/doctorModalSlice";
import ContactSupportModal from "../../../common/ContactSupportModal";
import { ASSETS } from "../../../assets";
const {
  arrowRight,
  crown,
  support,
} = ASSETS.images;

function ExpiredText({ title, onRedirect }) {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const tp_monetization_enable = !shouldMonetizationDisabled();

    const { profile, servicesList } = useSelector((state) => state.doctors);
    const AI_planDetails = servicesList?.find(e => e.service_name === title)

    const { planDetails } = useSelector((state) => state.subscription);
    const { service_mappings } = planDetails || {};
    const EMR_planDetails = service_mappings?.find(e => e.service_name === S_TATVA_PRACTICE)
    const NonAI_planDetails = service_mappings?.find(e => e.service_name === title)

    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const clickContactSupport = useCallback(() => {
    setIsModalOpen(!isModalOpen);
    }, [isModalOpen]);

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
        dispatch(openModal(service_name))
        // let sendData = {
        //     mbl_no: profile?.um_contact,
        //     is_pm_renew_requested: true,
        //     service_name: service_name
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

    const getName = (title) => {
        switch (title) {
            case S_ASK_TATVA:
                return `Try ${AI_planDetails?.service_display_name}`;
            case S_PHARMACY:
                return `Try ${NonAI_planDetails?.service_display_name}`;
            case S_IPD:
                return `Try ${NonAI_planDetails?.service_display_name}`;
            default:
                return "";
        }
    }

    return (
        pathname !== '/get-unlimited-access' &&
            (AI_planDetails?.plan_tier === FAILED_VERIFICATION && AI_planDetails?.service_type === 'ai') ? (
            <div className="position-sticky bottom-0 bg-white w-100 px-4 py-3">
                <div className="fontroboto fs-16 text-center text-danger-custom">
                    Your payment for the <span className="fw-bold text-danger-custom">{AI_planDetails?.service_display_name}</span> Add-on has failed. Please contact Support for further assistance.
                </div>
                <Row className="mt-2">
                    <Col lg={12}>
                        <Button className="btn btn-proceed btn-primary3 w-100 align-items-center justify-content-center d-flex" onClick={clickContactSupport}>
                            <img className="me-2" src={support} alt="support" />
                            Contact Support
                        </Button>
                    </Col>
                </Row>
                <ContactSupportModal isModalOpen={isModalOpen} clickContactSupport={clickContactSupport}/>
            </div>
        ) : (
            (
                (
                    AI_planDetails?.service_type === 'ai' &&
                    AI_planDetails?.plan_tier === FREE &&
                    AI_planDetails?.credit_balance <= 0
                )
                ||
                (
                    NonAI_planDetails?.service_type === 'non_ai' &&
                    isPurchased()
                )
            ) ?
                <div className="position-sticky bottom-0 bg-white w-100 px-4 py-3">
                    <div className="fontroboto fs-16 text-center text-danger-custom">
                        Your <span className="fw-bold text-danger-custom">{AI_planDetails?.service_type == 'ai' ? AI_planDetails?.service_display_name : NonAI_planDetails?.service_display_name} trial plan</span> has expired. <br />
                        Upgrade now to continue a hassle free experience!
                    </div>
                    <Row className="mt-2">
                        <Col lg={tp_monetization_enable ? 6 : 12}>
                            <Button type='button' className='w-100 btn ant-btn align-items-center justify-content-center d-flex btn-41 btn-primary1 btn-input' style={{ height: 52 }} onClick={() => clickRequestCallback(title)}>
                                <i className='icon-phone me-2'></i>
                                Request a call back
                            </Button>
                        </Col>
                        {tp_monetization_enable && !(isMobile && !isTablet) && (
                            <Col lg={6}>
                                <Button className="btn btn-proceed btn-primary3 w-100 align-items-center justify-content-center d-flex" onClick={() => clickBuyNow(title)}>
                                    <img className="me-2" src={crown} alt="Crown" />
                                    Get Unlimited Access
                                </Button>
                            </Col>
                        )}
                    </Row>
                </div>
                :
                [S_PHARMACY, S_IPD, S_ASK_TATVA].includes(title) && <div className="position-sticky bottom-0 bg-white w-100 px-4 py-3">
                    <Button className="btn btn-proceed btn-primary3 w-100 align-items-center justify-content-center d-flex" onClick={onRedirect}>
                        {getName(title)}
                        <img className="ms-2" src={arrowRight} alt="Crown" />
                    </Button>
                </div>

        )
    )
}

export default React.memo(ExpiredText);
