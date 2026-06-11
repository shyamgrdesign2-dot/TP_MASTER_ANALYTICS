import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";

import { openModal } from "../redux/doctorModalSlice";
import { fetchSubscriptionDetails } from "../redux/subscriptionSlice";
import {
  getClinicName,
  getDeviceSdkData,
  getTokenData,
  shouldMonetizationDisabled,
} from "../utils/utils";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HIDE_ROUTES,
  APPROVED,
  PAID,
  PENDING,
  REJECTED,
  S_TATVA_PRACTICE,
  TRIAL,
} from "../utils/constants";
import ContactSupportModal from "./ContactSupportModal";
import { setB2C_Profile } from "../redux/doctorsSlice";
import { isMobile, isTablet } from "react-device-detect";
import { ASSETS } from "../assets";
const {
  x: crownIcon,
  support: supportwhite,
} = ASSETS.images;

const DemoExpirationBanner = () => {
  const navigate = useNavigate();
  const tp_monetization_enable = !shouldMonetizationDisabled();
  const { pathname } = useLocation();
  const { planDetails } = useSelector((state) => state.subscription);
  const { profile } = useSelector((state) => state.doctors);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  const shouldHideBanner = useMemo(() => {
    return HIDE_ROUTES.BANNER.some((route) =>
      location.pathname.includes(route)
    );
  }, [location.pathname]);

  const clickContactSupport = useCallback(() => {
    setIsModalOpen(!isModalOpen);
  }, [isModalOpen]);

  const {
    currentPlanStatus,
    expiry_reminder_days,
    expiresIn,
    is_pm_renew_requested,
    profile_b2c,
    c_expiry_reminder_days,
    c_last_plan_expiry_date,
    c_last_plan_status,
    c_plan_status,
    service_mappings,
  } = planDetails || {};
  const EMR_planDetails = service_mappings?.find(
    (e) => e.service_name === S_TATVA_PRACTICE
  );
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isReceptionist) {
      dispatch(fetchSubscriptionDetails()); // Fetch subscription details on every reload
    }
  }, [dispatch]);

  useEffect(() => {
    profile && !profile?.b2c && profile_b2c && dispatch(setB2C_Profile(profile_b2c));
  }, [profile?.b2c, profile_b2c]);

  const handleClick = () => {
    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage.track_event("BuyPlanNow_Click", {
      doctor_id: profile?.doctor_unique_id,
      clinic_name,
    });

    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_GetUnlimited_Access", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      um_id: tokenData?.user_id,
      ...deviceSdkData,
    });
    // dispatch(openModal());

    if (
      c_plan_status == TRIAL &&
      (EMR_planDetails?.status == PENDING ||
        EMR_planDetails?.status == REJECTED)
    ) {
      clickBuyNow();
    } else {
      clickContactSupport();
    }
  };

  const clickBuyNow = () => {
    navigate("/get-unlimited-access");
  };

  const remaingDays = useMemo(() => {
    return EMR_planDetails?.plan_tier === TRIAL
      ? moment(planDetails?.plan_expiry_date).diff(
          moment().format("YYYY-MM-DD"),
          "days"
        )
      : 0;
  }, [planDetails]);

  const remaingDaysStatus = useMemo(() => {
    return c_plan_status == PAID &&
      c_last_plan_status == PAID &&
      EMR_planDetails?.status == PAID
      ? moment(c_last_plan_expiry_date).diff(
          moment().format("YYYY-MM-DD"),
          "days"
        ) <= c_expiry_reminder_days
        ? true
        : false
      : false;
  }, [planDetails]);

  if (shouldHideBanner) {
    return null;
  }

  return (
    pathname !== "/get-unlimited-access" &&
    EMR_planDetails !== undefined &&
    EMR_planDetails?.status != APPROVED && (
      <>
        {c_plan_status == TRIAL &&
        (EMR_planDetails?.status == PENDING ||
          EMR_planDetails?.status == REJECTED) ? (
          <header className={`banner`}>
            <div className="demoModeWrapper">
              <div className="demoModeIndicator" />
              <strong className="text-white">DEMO MODE</strong>
            </div>
            <p className="expirationMessage text-white">
              {`${
                remaingDays > 0
                  ? `You're on a trial plan`
                  : `${
                      remaingDays < 0
                        ? `Your trial plan expired`
                        : `Your trial plan will expire today`
                    }`
              }. Upgrade your plan to continue hassle-free access!`}
            </p>
            {tp_monetization_enable && !(isMobile && !isTablet) && (
              <button className="buyPlanButton" onClick={handleClick}>
                <img
                  loading="lazy"
                  src={crownIcon}
                  className="buttonIcon"
                  alt=""
                />
                <span className="buttonText text-white">
                  Get Unlimited Access
                </span>
              </button>
            )}
          </header>
        ) : c_plan_status == PAID &&
          c_last_plan_status == PAID &&
          EMR_planDetails?.status == REJECTED ? (
          <header className={`banner`}>
            <div className="demoModeWrapper">
              <div className="demoModeIndicator" />
              <strong className="text-white">
                Payment Verification Failed
              </strong>
            </div>
            <p className="expirationMessage text-white">
              Payment could not be verified. Please contact support.
            </p>
            <button className="buyPlanButton" onClick={handleClick}>
              <img
                loading="lazy"
                src={supportwhite}
                className="buttonIcon"
                alt=""
              />
              <span className="buttonText text-white">Contact Support</span>
            </button>
          </header>
        ) : c_plan_status == PAID &&
          c_last_plan_status == TRIAL &&
          EMR_planDetails?.status == PAID ? (
          <header className={`banner banner-yellow`}>
            <div className="demoModeWrapper">
              <div className="demoModeIndicator" />
              <strong className="text-white">
                Payment Verification Pending
              </strong>
            </div>
            <p className="expirationMessage text-white">
              Your payment is being verified. This may take up to 3-6 working
              days.
            </p>
            <button className="buyPlanButton" onClick={handleClick}>
              <img
                loading="lazy"
                src={supportwhite}
                className="buttonIcon"
                alt=""
              />
              <span className="buttonText text-white">Contact Support</span>
            </button>
          </header>
        ) : c_plan_status == PAID &&
          c_last_plan_status == PAID &&
          EMR_planDetails?.status == PAID &&
          remaingDaysStatus ? (
          <header className={`banner banner-yellow`}>
            <div className="demoModeWrapper">
              <div className="demoModeIndicator" />
              <strong className="text-white">
                Payment Verification Pending
              </strong>
            </div>
            <p className="expirationMessage text-white">
              Your payment is being verified. This may take up to 3-6 working
              days.
            </p>
            <button className="buyPlanButton" onClick={handleClick}>
              <img
                loading="lazy"
                src={supportwhite}
                className="buttonIcon"
                alt=""
              />
              <span className="buttonText text-white">Contact Support</span>
            </button>
          </header>
        ) : null}
        <ContactSupportModal
          isModalOpen={isModalOpen}
          clickContactSupport={clickContactSupport}
        />
      </>
    )
  );

  // return (
  //   pathname !== '/get-unlimited-access' &&
  //   ["TRIAL", "EXPIRED"].includes(currentPlanStatus) && (
  //     <header className="banner">
  //       <div className="demoModeWrapper">
  //         <div className="demoModeIndicator" />
  //         <strong className="text-white">DEMO MODE</strong>
  //       </div>
  //       <p className="expirationMessage text-white">
  //         {expiresIn <= expiry_reminder_days
  //           ? "Your demo is expiring soon."
  //           : ""}{" "}
  //         Purchase a plan now to continue hassle-free consultation!
  //       </p>
  //       <button className="buyPlanButton" onClick={handleClick}>
  //         <img loading="lazy" src={crownIcon} className="buttonIcon" alt="" />
  //         <span className="buttonText text-white">
  //           {is_pm_renew_requested ? "Interest submitted" : "Buy plan now"}
  //         </span>
  //       </button>
  //     </header>
  //   )
  // );
};

export default DemoExpirationBanner;
