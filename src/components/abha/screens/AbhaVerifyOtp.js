import React, { useState, useEffect, useRef, useCallback } from "react";
import { notification } from "antd";

import ErrorText from "../common/ErrorText";
import ApiAbha from "../../../api/services/ApiAbha";
import { ASSETS } from "../../../assets";
const CallIcon = ASSETS.images.call;

const OTP_LENGTH = 6;
const RESEND_TIMER = 30;

const AbhaVerifyOtp = ({
  otpData = {},
  onVerifySuccess = () => {},
  onGoBack = () => {},
  onResendOtp = () => {},
  onVerifyOtp = () => {},
  onStateChange = () => {},
}) => {
  const {
    aadhaarNumber = "",
    txnId = "",
    patient_unique_id = "",
    otpMessage = "",
    mobile_no: initialMobile = "",
    otpDigits: initialOtpDigits = [],
  } = otpData;

  const deriveInitialOtpDigits = () => {
    if (Array.isArray(initialOtpDigits) && initialOtpDigits.length === OTP_LENGTH) {
      return initialOtpDigits;
    }
    return Array(OTP_LENGTH).fill("");
  };

  const [mobileNumber, setMobileNumber] = useState(initialMobile);
  const [hasError, setHasError] = useState(false);
  const [mobileError, setMobileError] = useState("");
  const [otpDigits, setOtpDigits] = useState(deriveInitialOtpDigits());
  const [timer, setTimer] = useState(RESEND_TIMER);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const otpRefs = useRef(
    Array.from({ length: OTP_LENGTH }, () => React.createRef())
  );

  useEffect(() => {
    setMobileNumber(initialMobile || "");
  }, [initialMobile]);

  useEffect(() => {
    if (
      Array.isArray(initialOtpDigits) &&
      initialOtpDigits.length === OTP_LENGTH
    ) {
      setOtpDigits(initialOtpDigits);
    }
  }, [initialOtpDigits]);
  const maskedAadhaar = aadhaarNumber.slice(-4);

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleMobileChange = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(cleaned);
    setHasError(false);
    setMobileError("");
  };

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = cleaned;
    setOtpDigits(nextDigits);
    setOtpError("");

    if (cleaned && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.current?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.current?.focus();
    }
  };

  const handleResend = async () => {
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setTimer(RESEND_TIMER);
    otpRefs.current[0]?.current?.focus();
    await onResendOtp();
  };

  const formattedTimer = `00:${timer.toString().padStart(2, "0")}`;
  const isOtpComplete = otpDigits.every((digit) => digit !== "");
  const isMobileValid = mobileNumber.length === 10;
  const isFormValid = isOtpComplete && isMobileValid;

  const handleVerifyOtp = useCallback(async () => {
    const otp = otpDigits.join("");

    if (otp.length !== OTP_LENGTH) {
      setOtpError("Please enter complete OTP");
      return false;
    }

    if (mobileNumber.length !== 10) {
      setHasError(true);
      setMobileError("Please enter valid mobile number");
      return false;
    }

    setIsVerifying(true);
    setOtpError("");
    setMobileError("");

    try {
      const response = await ApiAbha.verifyOtpForAadhaar({
        aadhaarNumber,
        patient_unique_id,
        otp,
        mobile_no: mobileNumber,
        txnId,
      });

      if (response?.success) {
        // Merge original otpData with response to preserve patient_unique_id
        onVerifySuccess({
          ...response.data,
          patient_unique_id, // Carry forward from original data
          mobile_no: mobileNumber,
          aadhaarNumber,
        });
        return true;
      } else {
        setOtpError("Invalid OTP. Please try again.");
        notification.error({
          message: "Verification Failed",
          description: response?.message || "Invalid OTP",
        });
        return false;
      }
    } catch (error) {
      setOtpError("Invalid OTP. Please try again.");
      notification.error({
        message: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to verify OTP. Please try again.",
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [
    otpDigits,
    mobileNumber,
    aadhaarNumber,
    patient_unique_id,
    txnId,
    onVerifySuccess,
  ]);

  // Expose verification function to parent
  useEffect(() => {
    onVerifyOtp(handleVerifyOtp, isFormValid, isVerifying);
  }, [handleVerifyOtp, isFormValid, isVerifying, onVerifyOtp]);

  useEffect(() => {
    onStateChange({
      mobile_no: mobileNumber,
      otpDigits,
    });
  }, [mobileNumber, otpDigits, onStateChange]);

  return (
    <div className="abha_verify_otp">
      <div>
        <p className="abha_verify_title">Verify with OTP</p>
        <p className="abha_verify_subtitle">
          {otpMessage ||
            `OTP sent to Aadhaar registered mobile number ending with ******${maskedAadhaar}.`}
        </p>
      </div>

      <div className="abha_step_row">
        <div className="abha_step_marker">
          <span className="abha_step_number active">1</span>
          <span className="abha_step_line"></span>
        </div>
        <div className="abha_step_body">
          <div>
            <div className="abha_otp_inputs">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`abha_otp_input ${otpError ? "error" : ""}`}
                  value={digit}
                  ref={otpRefs.current[index]}
                  onChange={(event) =>
                    handleOtpChange(index, event.target.value)
                  }
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                />
              ))}
            </div>
            {otpError && <ErrorText errorText={otpError} />}
          </div>

          <div className="abha_resend_row">
            <span>Didn't receive OTP?</span>
            <button
              type="button"
              className="abha_resend_button"
              onClick={handleResend}
              disabled={timer > 0}
            >
              {timer > 0 ? `Resend OTP in ${formattedTimer}` : "Resend OTP"}
            </button>
          </div>
        </div>
      </div>

      <div className="abha_step_row_number">
        <div className="abha_step_marker">
          <span className="abha_step_number">2</span>
        </div>
        <div className="abha_step_body_number">
          <label className="abha_step_label">
            Enter mobile number you want to link with ABHA
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
            />
          </div>
          {mobileError && <ErrorText errorText={mobileError} />}
        </div>
      </div>

      <div className="border_top_container">
        <span className="go_back_top_border"></span>
      </div>
      <button type="button" className="abha_go_back" onClick={onGoBack}>
        Go Back
      </button>
    </div>
  );
};

export default AbhaVerifyOtp;
