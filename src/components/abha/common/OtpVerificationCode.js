import React, { useEffect, useRef, useState, useCallback } from "react";
import { notification } from "antd";
import ErrorText from "./ErrorText";

import ApiAbha from "../../../api/services/ApiAbha";
import { ASSETS } from "../../../assets";
const AbhaIcon = ASSETS.images.abhaSvg;

const OTP_LENGTH = 6;
const RESEND_TIMER = 30;

const OtpVerificationCode = ({
  data = {},
  onVerifyOtp = () => {},
  onGoBack = () => {},
}) => {
  const {
    selectedAbhaAddress = "",
    ABHAProfile = {},
    patient_unique_id = "",
    txnId = "",
    otpMessage = "",
  } = data;

  const { firstName = "", lastName = "" } = ABHAProfile;
  const displayName = `${firstName} ${lastName}`.trim() || "User";

  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(RESEND_TIMER);
  const otpRefs = useRef(
    Array.from({ length: OTP_LENGTH }, () => React.createRef())
  );
  const [hasError, setHasError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (timer === 0) {
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = cleaned;
    setOtpDigits(nextDigits);
    setHasError("");
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
    try {
      const response = await ApiAbha.sendOtpForAbhaAddress({
        patient_unique_id,
        abhaAddress: selectedAbhaAddress,
      });

      if (response?.success) {
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        setHasError(false);
        setTimer(RESEND_TIMER);
        otpRefs.current[0]?.current?.focus();
      } else {
        notification.error({
          message: "Error",
          description:
            response?.message || "Failed to resend OTP. Please try again.",
        });
      }
    } catch (error) {
      notification.error({
        message: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to resend OTP. Please try again.",
      });
    }
  };

  const handleVerifyOtp = useCallback(async () => {
    const otp = otpDigits.join("");
    if (otp.length !== OTP_LENGTH) {
      setHasError(true);
      return false;
    }

    setIsVerifying(true);
    try {
      const response = await ApiAbha.verifyOtpForAbhaAddress({
        scope: "mobile-verify",
        patient_unique_id,
        otp,
        abhaAddress: selectedAbhaAddress,
        txnId,
      });

      if (response?.success) {
        // Success - return true to trigger drawer close and success message
        return {
          abhaAddress: response?.data?.abhaAddress,
          abhaInsertId: response?.data?.abhaInsertId,
          ...response?.data,
        };
      } else {
        setHasError(true);
        notification.error({
          message: "Error",
          description: response?.message || "Invalid OTP. Please try again.",
        });
        return false;
      }
    } catch (error) {
      setHasError(true);
      notification.error({
        message: "Error",
        description:
          error?.response?.data?.message || "Invalid OTP. Please try again.",
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [otpDigits, patient_unique_id, selectedAbhaAddress, txnId]);

  const isFormValid = otpDigits.every((digit) => digit !== "");

  useEffect(() => {
    onVerifyOtp(handleVerifyOtp, isFormValid, isVerifying);
  }, [handleVerifyOtp, isFormValid, isVerifying, onVerifyOtp]);

  const formattedTimer = `00:${timer.toString().padStart(2, "0")}`;

  // Extract last 4 digits of phone for display
  const maskedPhone = otpMessage?.match(/\d{4}$/)?.[0] || "****";

  return (
    <div className="abha_verify_otp_link">
      {/* Selected ABHA Address Card */}
      <div className="abha_selected_address_card">
        <div className="abha_selected_address_content">
          <img src={AbhaIcon} alt="ABHA" className="abha_selected_icon" />
          <div className="abha_selected_info">
            <p className="abha_selected_name">{displayName}</p>
            <p className="abha_selected_address">
              Address : <span>{selectedAbhaAddress}</span>
            </p>
          </div>
        </div>
        <button type="button" className="abha_change_button" onClick={onGoBack}>
          Change
        </button>
      </div>

      {/* OTP Verification Section */}
      <div className="abha_otp_section">
        <h1 className="abha_verify_title">OTP Verification</h1>
        <p className="abha_verify_subtitle">
          {otpMessage ||
            `OTP sent to mobile number ending with ******${maskedPhone}`}
        </p>
      </div>

      {/* OTP Inputs */}
      <div className="abha_otp_input_section">
        <div className="abha_otp_inputs">
          {otpDigits.map((digit, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className={`abha_otp_input ${hasError ? "error" : ""}`}
              value={digit}
              ref={otpRefs.current[index]}
              onChange={(event) => handleOtpChange(index, event.target.value)}
              onKeyDown={(event) => handleOtpKeyDown(index, event)}
            />
          ))}
        </div>
        {hasError && <ErrorText errorText={"Invalid OTP. Try Again!"} />}

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
  );
};

export default OtpVerificationCode;
