import React, { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";

import { useLocation } from "react-router-dom";
import { openModal } from "../redux/doctorModalSlice";
import { HIDE_ROUTES } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import { ASSETS } from "../assets";
const crownIcon = ASSETS.images.crown;

const PlanExpirationBanner = () => {
  const { planDetails } = useSelector((state) => state.subscription);
  const {
    currentPlanStatus,
    expiry_reminder_days,
    expiresIn,
    is_pm_renew_requested,
  } = planDetails || {};
  
  const location = useLocation();
  const dispatch = useDispatch();
  const shouldHideBanner = useMemo(() => {
    return HIDE_ROUTES.BANNER.some(
      (route) =>
        location.pathname.includes(route)
    );
  }, [location.pathname]);
  const navigate = useNavigate();

  const handleClick = () => {
    // dispatch(openModal());
    clickBuyNow()
  };
  const clickBuyNow = () => {
    navigate('/get-unlimited-access')
  }

  if (shouldHideBanner) {
    return null;
  }

  return (
    !is_pm_renew_requested &&
    currentPlanStatus === "PAID" &&
    expiresIn <= expiry_reminder_days &&
    (
      <header className="plan-expiry-banner">
        <div className="demoModeWrapper">
          <div className="demoModeIndicator" />
          <strong className="text-white">PLAN EXPIRING SOON</strong>
        </div>
        <p className="expirationMessage text-white">
          Your Pro plan{" "}
          {expiresIn > 0 ? `expires in ${expiresIn} days` : "has expired"}.
          Renew now to ensure hassle-free access!
        </p>
        <button className="buyPlanButton" onClick={handleClick}>
          <img loading="lazy" src={crownIcon} className="buttonIcon" alt="" />
          <span className="buttonText text-white">Renew plan now</span>
        </button>
      </header>
    )
  );
};

export default PlanExpirationBanner;
