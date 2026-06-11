import React, { useState, useEffect, useRef, useCallback } from "react";
import { notification } from "antd";
import ErrorText from "../common/ErrorText";
import ApiAbha from "../../../api/services/ApiAbha";
import "../AbhaDrawer.scss";
import { getAbhaDomainSuffix } from "../helpers";

const OTP_LENGTH = 6;
const RESEND_TIMER = 30;

const MobileVerifyOtp = ({
  data = {},
  onVerifyOtp = () => {},
  onGoBack = () => {},
  isMobileLinking = false,
  isAbhaAddressLinking = false,
  isAbhaNumberLinking = false,
}) => {
  const {
    mobile_no = "",
    patient_unique_id = "",
    txnId = "",
    aadhaarNumber = "",
    abhaAddress = "",
    abhaNumber = "",
  } = data;

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
    setHasError(false);
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
      let response;
      
      if (isMobileLinking) {
        // Resend OTP for mobile linking
        response = await ApiAbha.sendOtpForMobileLink({
          patient_unique_id,
          mobile_no,
        });
      } else if (isAbhaAddressLinking) {
        // Resend OTP for ABHA address linking
        response = await ApiAbha.sendOtpForAbhaAddressLink({
          patient_unique_id,
          abhaAddress: abhaAddress + getAbhaDomainSuffix(),
        });
      } else if (isAbhaNumberLinking) {
        // Resend OTP for ABHA number linking
        response = await ApiAbha.sendOtpForAbhaNumberLink({
          patient_unique_id,
          abhaNumber: abhaNumber, // Send with hyphens
        });
      } else {
        // Resend OTP using the original Aadhaar OTP send endpoint
        response = await ApiAbha.sendOtpForAadhaar({
          patient_unique_id,
          aadhaarNumber,
        });
      }

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
      let response;
      
      if (isMobileLinking) {
        // Verify OTP for mobile linking
        response = await ApiAbha.verifyOtpForMobileLink({
          scope: "mobile-verify",
          patient_unique_id,
          mobile_no,
          txnId,
          otp,
        });
      } else if (isAbhaAddressLinking) {
        // Verify OTP for ABHA address linking
        response = await ApiAbha.verifyOtpForAbhaAddressLink({
          scope: "mobile-verify",
          patient_unique_id,
          abhaAddress: abhaAddress + getAbhaDomainSuffix(),
          txnId,
          otp,
        });

        // If OTP verification successful, call verify user API
        if (response?.success) {
          const hasData =
            response.data && Object.keys(response.data).length > 0;

          if (
            !hasData ||
            response.message?.toLowerCase().includes("failed")
          ) {
            // Verification failed
            setHasError(true);
            notification.error({
              message: "Verification Failed",
              description:
                response?.message ||
                "OTP verification failed. Please try again.",
            });
            return false;
          }

          // OTP verified successfully - return true to show success screen
          return response.data;
        }
      } else if (isAbhaNumberLinking) {
        // Verify OTP for ABHA number linking
        response = await ApiAbha.verifyOtpForAbhaNumberLink({
          scope: "mobile-verify",
          patient_unique_id,
          abhaNumber: abhaNumber, // Send with hyphens
          txnId,
          otp,
        });
      } else {
        // Verify OTP for mobile update during ABHA creation
        response = await ApiAbha.verifyMobileUpdateOtp({
          patient_unique_id,
          mobile_no,
          txnId,
          otp,
        });
      }

      // For non-address-linking flows, check response
      if (response?.success) {
        // Check if data is empty or verification actually failed
        const hasData = response.data && Object.keys(response.data).length > 0;
        
        if (!hasData || response.message?.toLowerCase().includes("failed")) {
          // Verification failed - show error
          setHasError(true);
          notification.error({
            message: "Verification Failed",
            description: response?.message || "OTP verification failed. Please try again.",
          });
          return false;
        }
        
        // Success - return response data to continue with flow
        return response.data;
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
  }, [
    otpDigits,
    patient_unique_id,
    mobile_no,
    abhaAddress,
    abhaNumber,
    txnId,
    isMobileLinking,
    isAbhaAddressLinking,
    isAbhaNumberLinking,
  ]);

  const isFormValid = otpDigits.every((digit) => digit !== "");

  useEffect(() => {
    onVerifyOtp(handleVerifyOtp, isFormValid, isVerifying);
  }, [handleVerifyOtp, isFormValid, isVerifying, onVerifyOtp]);

  const formattedTimer = `00:${timer.toString().padStart(2, "0")}`;

  // Extract last 4 digits of phone for display
  const maskedPhone = mobile_no?.slice(-4) || "****";

  // Get OTP message from data or construct default
  const getOtpMessage = () => {
    if (data.otpMessage) {
      return data.otpMessage;
    }
    if (isAbhaAddressLinking) {
      return `OTP sent to mobile number linked with ABHA address ${abhaAddress}.`;
    }
    if (isAbhaNumberLinking) {
      return `OTP sent to mobile number linked with ABHA number ${abhaNumber}.`;
    }
    return `OTP sent to mobile number ending with ******${maskedPhone}.`;
  };

  return (
    <div className="mobile_verify_otp">
      {/* Title Section */}
      <div className="mobile_verify_header">
        <h1 className="mobile_verify_title">
          {isMobileLinking || isAbhaAddressLinking || isAbhaNumberLinking
            ? "OTP Verification"
            : "Verify Mobile Number"}
        </h1>
        <p className="mobile_verify_subtitle">{getOtpMessage()}</p>
      </div>

      {/* OTP Inputs */}
      <div className="mobile_verify_otp_section">
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

      {/* Go Back Section */}
      <div className="mobile_verify_footer">
        <div className="mobile_verify_divider" />
        <button
          type="button"
          className="mobile_verify_back_button"
          onClick={onGoBack}
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default MobileVerifyOtp;

