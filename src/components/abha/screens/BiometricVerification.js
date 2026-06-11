import React, { useState } from "react";

import ErrorText from "../common/ErrorText";
import { ASSETS } from "../../../assets";
const {
  call: CallIcon,
  fingerScan: FingerScanIcon,
  icReload: ReloadIcon,
  checkIcon: CheckIcon,
  redAlert: RedAlertIcon,
} = ASSETS.images;

const BiometricVerification = ({
  data = {},
  onGetBiometric = () => {},
  onBiometricCaptureSuccess = () => {},
  onGoBack = () => {},
  onTryAgain = () => {},
  hideMainGoBack = false,
}) => {
  const { 
    aadhaarNumber = "", 
    patient_unique_id = "", 
    fingerprintData: capturedData = null, 
    biometricCaptured = false, 
    mobileNumber: initialMobileNumber = "",
    verificationStatus = "",
    verificationError = "",
  } = data;
  const [mobileNumber, setMobileNumber] = useState(initialMobileNumber);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBiometricCaptured, setIsBiometricCaptured] = useState(biometricCaptured);
  const [fingerprintData, setFingerprintData] = useState(capturedData);

  React.useEffect(() => {
    setIsBiometricCaptured(biometricCaptured);
    if (capturedData) {
      setFingerprintData(capturedData);
    }
  }, [biometricCaptured, capturedData]);

  React.useEffect(() => {
    if (data.mobileNumber) {
      setMobileNumber(data.mobileNumber);
    }
  }, [data.mobileNumber]);

  const handleMobileChange = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(cleaned);
    setHasError(false);
    setErrorMessage("");
  };

  const handleGetBiometric = () => {
    if (mobileNumber.length !== 10) {
      setHasError(true);
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    onGetBiometric({
      aadhaarNumber,
      mobileNumber,
      patient_unique_id,
    });
  };

  React.useEffect(() => {
  }, []);

  const handleTryAgain = () => {
    setIsBiometricCaptured(false);
    setFingerprintData(null);
  };

  return (
    <div className="abha_verify_otp">
      <div>
        <p className="abha_verify_title">Verify with Biometric</p>
        <p className="abha_verify_subtitle">
          Get the biometric of the user to verify the Aadhar
        </p>
      </div>

      <div className="abha_step_row_number" style={{ marginTop: "24px" }}>
        <div className="abha_step_marker">
          <span className="abha_step_number active">1</span>
          <span className="abha_step_line"></span>
        </div>
        <div className="abha_step_body_number">
          <label className="abha_step_label">
            Enter mobile number you want to link with ABHA *
          </label>
          <div className={`abha_mobile_input ${hasError ? "error" : ""}`}>
            <span className="abha_mobile_icon">
              <img src={CallIcon} alt="Call" />
            </span>
            <span className="abha_mobile_code">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className="abha_mobile_field"
              value={mobileNumber}
              onChange={(event) => handleMobileChange(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mobileNumber.length === 10 && !isBiometricCaptured) {
                  handleGetBiometric();
                }
              }}
              placeholder="Enter mobile number"
              disabled={isBiometricCaptured}
            />
          </div>
          {hasError && <ErrorText errorText={errorMessage} />}
        </div>
      </div>

      <div className="abha_step_row_number" style={{ marginTop: "40px" }}>
        <div className="abha_step_marker">
          <span className={`abha_step_number ${isBiometricCaptured ? "active" : ""}`}>
            {isBiometricCaptured ? "2" : "2"}
          </span>
          {isBiometricCaptured && <span className="abha_step_line"></span>}
        </div>
        <div className="abha_step_body_number">
          {!isBiometricCaptured ? (
            <button
              className="abha_biometric_capture_button"
              onClick={handleGetBiometric}
              disabled={mobileNumber.length !== 10}
            >
              <img src={FingerScanIcon} alt="finger scan" className="abha_biometric_icon" />
              <span>Get Biometric</span>
            </button>
          ) : (
            <button
              className="abha_biometric_captured_button"
              disabled
            >
              <img src={CheckIcon} alt="check" className="abha_biometric_check_icon" />
              <span>Biometric Captured Successfully</span>
            </button>
          )}
        </div>
      </div>

      {/* Third step: Aadhaar verification status */}
      {isBiometricCaptured && (
        <div className="abha_step_row_number" style={{ marginTop: "15px" }}>
          <div className="abha_step_marker">
            <span className={`abha_step_number ${verificationStatus ? "active" : ""}`}>3</span>
          </div>
          <div className="abha_step_body_number">
            {verificationStatus === "loading" && (
              <div className="abha_biometric_success_container">
                <button
                  className="abha_biometric_captured_button"
                  disabled
                  style={{ opacity: 0.7 }}
                >
                  <span>Verifying Aadhaar...</span>
                </button>
              </div>
            )}
            {verificationStatus === "success" && (
              <div className="abha_biometric_success_container">
                <button
                  className="abha_biometric_captured_button"
                  disabled
                >
                  <img src={CheckIcon} alt="check" className="abha_biometric_check_icon" />
                  <span>Aadhaar verified successfully</span>
                </button>
              </div>
            )}
            {verificationStatus === "error" && (
              <div className="abha_biometric_success_container">
                <button
                  className="abha_biometric_captured_button abha_biometric_error_button"
                  disabled
                  style={{
                    backgroundColor: "#fff1f0",
                    border: "none",
                    color: "#ff4d4f"
                  }}
                >
                  <img src={RedAlertIcon} alt="alert" className="abha_biometric_alert_icon" style={{ width: "20px", height: "20px" }} />
                  <span>{verificationError || "Could not verify aadhaar, please try again"}</span>
                </button>
                {hideMainGoBack ? (
                  <button
                    type="button"
                    className="abha_go_back"
                    onClick={onTryAgain}
                    style={{ marginTop: "12px" }}
                  >
                    Go Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onTryAgain}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#722ed1",
                      cursor: "pointer",
                      padding: "8px 0",
                      fontSize: "14px",
                      textDecoration: "underline",
                      marginTop: "8px",
                    }}
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!hideMainGoBack && (
        <>
          <div className="border_top_container">
            <span className="go_back_top_border"></span>
          </div>
          <button type="button" className="abha_go_back" onClick={onGoBack}>
            Go Back
          </button>
        </>
      )}
    </div>
  );
};

export default BiometricVerification;
