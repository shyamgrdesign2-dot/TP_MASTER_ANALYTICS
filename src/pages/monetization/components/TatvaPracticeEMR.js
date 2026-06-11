import React, { useState, useCallback } from "react";
import { Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { deviceType, isMobile, osName } from "react-device-detect";
import { useSelector } from "react-redux";

import { currencyFormat, formatAmount, getClinicName, getDeviceSdkData, getTokenData } from "../../../utils/utils";
import { ASSETS } from "../../../assets";
const {
  logoTatvaEmr: tatvaEMR,
  growingClinic,
  listIcon,
  medcoIcon,
} = ASSETS.images;

function TatvaPracticeEMR({ item,clickKnowMore }) {

    const [showAll, setShowAll] = useState(false);
    const { profile } = useSelector((state) => state.doctors);

    const handleShowAll = useCallback(() => {
        setShowAll(!showAll)
        const tokenData = getTokenData();
        const clinic_name = getClinicName(profile?.hospital_data);
        const deviceSdkData = getDeviceSdkData(); 
        window.Moengage.track_event("TP_ViewMoreFeatures", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            clinic_id: tokenData?.clinic_id,
            um_id: tokenData?.user_id,
            clinic_Name: clinic_name,
            ...deviceSdkData
        });
    }, [showAll]);

    return (
        <div className="unlimited-access-price text-center">
            <img src={tatvaEMR} alt='EMR Icon' />
            <div className="text-price fs-2 fw-semibold mt-4">{item.service_display_name}</div>
            <div className="d-flex align-items-end justify-content-center mt-4">
                {item?.discount && (
                    <div className="fs-18 text-black-50 text-decoration-line-through me-2">{`₹${currencyFormat(item.strike_off_cost)}`}</div>
                )}
                <div className="fw-semibold text-price lh-1" style={{ fontSize: 36 }}>
                    {`₹${currencyFormat(formatAmount(parseFloat(item.service_cost)))}`}
                </div>
                <div className="text-price fs-4">/year</div>
                {item?.discount && (
                    <div className="access-off px-3 py-1 ms-3 rounded-pill fw-semibold fs-18 text-white">{`${item?.discount}% off`}</div>
                )}
            </div>
            <div className="d-flex align-items-end justify-content-center mt-4">
                <div className="text-black-50">Everything for a</div>
                <div className="fw-medium text-secondary-custom"><img className="mx-2" src={growingClinic} alt="Growing clinic" />Growing clinic</div>
            </div>
            <div className={`${!isMobile ? 'px-75px' : 'px-0'}`}>
                <Row className="my-4">
                    {item?.service_points?.slice(0, showAll ? item?.service_points?.length : 4)?.map((feature, i) => (
                        <Col key={i} lg={6} md={6} sm={12} className="py-3">
                            <div className="d-flex align-items-center">
                                <img className="mx-2" src={listIcon} alt="icon" />
                                <div className="fs-14 fw-medium text-price text-start">{feature}</div>
                            </div>
                        </Col>
                    ))}
                </Row>
                {/* {showAll &&
                    <div className="medco-app my-4">
                        <img className="me-3" src={medcoIcon} alt="Medco Icon" />
                        <div className="text-start">
                            <div className="fw-bold">Get the MedEco Doctor App free with EMR</div>
                            <div className="fs-14">{item.service_description}&nbsp;
                                <span className="text-decoration-underline fw-medium text-main cursor-pointer" onClick={clickKnowMore}>
                                    Know more
                                </span></div>
                        </div>
                    </div>
                } */}
            </div>
            <div className="text-primary fw-medium cursor-pointer d-inline text-decoration-underline" onClick={handleShowAll}>{showAll ? 'View less' : `View ${item?.service_points?.length - 4} More Features`}</div>
        </div>
    );
}

export default React.memo(TatvaPracticeEMR);
