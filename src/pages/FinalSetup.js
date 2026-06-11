import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DoctorOnboarding from "../components/userOnboarding/DoctorOnboarding";

const FinalSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [initialStep, setInitialStep] = useState(0);
  const [isAccountLocked, setIsAccountLocked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mobileNo = params.get("mobileNo")
    if (mobileNo) {
      localStorage.setItem("mobileNumber", mobileNo)
    }
    const stepParam = params.get("step");
    const noLocation = params.get("noLocation") === "true";
    const isLocked = params.get("isAccountLocked") === "true";

    if (stepParam) {
      setInitialStep(parseInt(stepParam));
    } else if (noLocation) {
      setInitialStep(1);
    }

    if (isLocked) {
      setIsAccountLocked(true);
    }
  }, [location]);

  const handleClose = () => {
    setVisible(false);
    navigate("/?from=finalSetup");
  };

  return (
    <div className="final-setup-page">
      <DoctorOnboarding
        visible={visible}
        onClose={handleClose}
        initialStep={initialStep}
        isAccountLocked={isAccountLocked}
      />
    </div>
  );
};

export default FinalSetup;
