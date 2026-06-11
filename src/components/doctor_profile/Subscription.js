import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Col, Row } from "react-bootstrap";
import moment from "moment";
import BillingHistory from "./BillingHistory";
import { openModal } from "../../redux/doctorModalSlice";
import { Divider } from "antd";
import { getClinicName } from "../../utils/utils";
import { ASSETS } from "../../assets";
const {
  crownPurple: crownIcon,
  crownRed: crownRedIcon,
  crownOrange: crownOrangeIcon,
  billings: billingsIcon,
} = ASSETS.images;

function Subscription() {
  const { planDetails } = useSelector((state) => state.subscription);
  const {
    plan_active_date,
    plan_expiry_date,
    productType,
    currentPlanStatus,
    expiry_reminder_days,
    is_pm_renew_requested,
    expiresIn,
    billingHistory,
  } = planDetails || {};
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const { profile } = useSelector((state) => state.doctors);

  const dispatch = useDispatch();
  const handleClick = () => {
    if (["TRIAL", "EXPIRED"].includes(currentPlanStatus) && !is_pm_renew_requested) {
      const clinic_name = getClinicName(profile?.hospital_data);
      window.Moengage.track_event("BuyPlanNow_Click", {
        doctor_id: profile?.doctor_unique_id,
        clinic_name,
      });
    }
    dispatch(openModal());
  };

  return (
    <div className="rounded-20px bg-white">
      <div
        className="d-flex align-items-center justify-content-between p-20 border-bottom"
        style={{ borderColor: "#F1F1F5" }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <div className="profile-head-icon me-3">
            <img loading="lazy" src={crownIcon} alt="" />
          </div>

          <div className="titleprint">Subscription</div>
          {currentPlanStatus === "TRIAL" && (
            <div className="gradientBackground d-flex">
              <div className="demoModeIndicatorSmall bg-danger" />
              <span className="demoModeLabel">Demo mode</span>
            </div>
          )}
        </div>
        {!!billingHistory?.length && (
          <button
            className="btn d-flex align-items-center btn-text"
            onClick={() => {
              setShowBillingHistory(true);
              const clinic_name = getClinicName(profile?.hospital_data);
              window.Moengage.track_event("BillingHistory_Click", {
                doctor_id: profile?.doctor_unique_id,
                clinic_name,
              });
            }}
          >
            <img
              loading="lazy"
              src={billingsIcon}
              style={{ color: "#EE7200", marginRight: "5px" }}
              alt=""
            />
            <span> Billing History </span>
          </button>
        )}
      </div>
      {currentPlanStatus === "PAID" ? (
        <>
          <div className="m-auto p-4">
            <Row>
              <Col>Current Plan</Col>
              <Col>Start Date</Col>
              <Col>Next Payment</Col>
            </Row>
            <Row>
              <Col className="fw-normal">{productType}</Col>
              <Col className="fw-normal">
                {moment(plan_active_date).format("DD MMM, YYYY")}
              </Col>
              <Col className="fw-normal">
                {moment(plan_expiry_date).format("DD MMM, YYYY")}
              </Col>
            </Row>
          </div>
          {expiresIn <= expiry_reminder_days && (
            <>
              <Divider style={{ margin: "0 30px", width: "630px" }} />
              <div className="px-20 py-1">
                <p className="mt-4 renew-btn">
                  Your plan{" "}
                  {expiresIn > 0
                    ? `expires in ${expiresIn} days`
                    : "has expired"}
                  . Renew now to ensure hassle-free access!
                </p>
                <button
                  className="buyPlanButton mb-4"
                  style={{ border: "1px solid #EE7200" }}
                  onClick={handleClick}
                >
                  <img
                    loading="lazy"
                    src={crownOrangeIcon}
                    style={{ color: "#EE7200" }}
                    alt=""
                  />
                  <span className="renew-btn">
                    {is_pm_renew_requested
                      ? "Interest submitted"
                      : "Renew plan now"}
                  </span>
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        ["TRIAL", "EXPIRED"].includes(currentPlanStatus) && (
          <>
            <div className="px-20 py-1">
              <p className="text-danger mt-4">
                {expiresIn <= expiry_reminder_days
                  ? "Your demo is expiring soon."
                  : ""}{" "}
                Purchase a plan now to continue hassle-free consultation!
              </p>
              <button
                className="buyPlanButton mb-4"
                style={{ border: "1px solid #F15223" }}
                onClick={handleClick}
              >
                <img
                  loading="lazy"
                  src={crownRedIcon}
                  className="buttonIcon"
                  alt=""
                />
                <span className="buttonText text-danger">
                  {is_pm_renew_requested
                    ? "Interest submitted"
                    : "Buy plan now"}
                </span>
              </button>
            </div>
          </>
        )
      )}
      <BillingHistory
        show={showBillingHistory}
        setShow={setShowBillingHistory}
      />
    </div>
  );
}

export default React.memo(Subscription);
