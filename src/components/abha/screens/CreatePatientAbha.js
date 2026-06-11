import React, { useRef, useState, useEffect } from "react";
import { Button } from "react-bootstrap";

import AbhaNavigationCard from "../common/AbhaNavigationCard";

import ErrorText from "../common/ErrorText";
import ApiAbha from "../../../api/services/ApiAbha";
import { useFeatureValue } from "@growthbook/growthbook-react";
import TermsAndConditionsPopup from "../common/TermsAndConditionsPopup";
import { ASSETS } from "../../../assets";
const {
  adhar: AdharImg,
  linkMobileIcon: LinkMobileIcon,
  globalIcon: GlobalIcon,
  personalCardIcon: PersonalCardIcon,
  fingerScan: FingerScanIcon,
  fingerScanWhite: FingerScanWhiteIcon,
  otp: OtpIcon,
} = ASSETS.images;

const CreatePatientAbha = ({
  onLinkOptionSelect = () => {},
  onOtpSent = () => {},
  onBiometricSelect = () => {},
  patientUniqueId,
  initialAadhaar = "",
}) => {
  const initializeSegments = () => {
    if (initialAadhaar && initialAadhaar.length === 12) {
      return [
        initialAadhaar.slice(0, 4),
        initialAadhaar.slice(4, 8),
        initialAadhaar.slice(8, 12),
      ];
    }
    return ["", "", ""];
  };

  const [segments, setSegments] = useState(initializeSegments());
  const [agreeTerms, setAgreeTerms] = useState(true);
  const inputRefs = [useRef(null), useRef(null), useRef(null)];
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const containerRef = useRef(null);
  const arrowRef = useRef(null);

  const primaryMethod = useFeatureValue("abha-dropdown", 1);
  
  const isOtpPrimary = primaryMethod === 1;
  const isBiometricPrimary = primaryMethod === 2;

  useEffect(() => {
    if (initialAadhaar && initialAadhaar.length === 12) {
      setSegments([
        initialAadhaar.slice(0, 4),
        initialAadhaar.slice(4, 8),
        initialAadhaar.slice(8, 12),
      ]);
    }
  }, [initialAadhaar]);

  const handleChange = (index, value) => {
    setHasError(false);
    setErrorMessage("");
    // allow only numbers
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    const nextSegments = [...segments];
    nextSegments[index] = cleaned;
    setSegments(nextSegments);

    // auto move to next input when 4 digits entered
    if (cleaned.length === 4 && index < inputRefs.length - 1) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && segments[index].length === 0 && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === "Enter" && index === inputRefs.length - 1) {
      const aadhaarNumber = segments.join("");
      if (aadhaarNumber.length === 12 && agreeTerms && !isLoading) {
        if (isOtpPrimary) {
          handleSendOtp();
        } else if (isBiometricPrimary) {
          handleBiometric();
        }
      }
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleSendOtp = async () => {
    const aadhaarNumber = segments.join("");
    if (aadhaarNumber.length !== 12 || !agreeTerms) {
      setHasError(true);
      setErrorMessage("Invalid Aadhaar Number!");
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    setDropdownOpen(false);

    try {
      const response = await ApiAbha.sendOtpForAadhaar({
        patient_unique_id: patientUniqueId,
        aadhaarNumber,
      });

      if (response?.success) {
        onOtpSent({
          aadhaarNumber,
          txnId: response.data?.txnId,
          accessToken: response.data?.accessToken,
          patient_unique_id: patientUniqueId,
          otpMessage: response.message,
        });
      } else {
        setHasError(true);
        setErrorMessage(
          response?.data?.message || "Failed to send OTP. Please try again."
        );
      }
    } catch (error) {
      setHasError(true);
      const errorMsg =
        error?.response?.data?.message ||
        "Failed to send OTP. Please try again.";
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometric = () => {
    const aadhaarNumber = segments.join("");
    if (aadhaarNumber.length !== 12 || !agreeTerms) {
      setHasError(true);
      setErrorMessage("Invalid Aadhaar Number!");
      return;
    }

    setDropdownOpen(false);
    onBiometricSelect({
      aadhaarNumber,
      patient_unique_id: patientUniqueId,
    });
  };

  const isValid = segments.join("").length === 12;

  return (
    <div className="create_abha_patient">
      <div className="abha_patient_header_container">
        <div className="abha_patient_header">Create Patient ABHA</div>
        <div className="abha_patient_subHeader">
          By Entering Patients Aadhaar Number Below
        </div>
      </div>
      <div>
        <div className="adharcard">
          <div className="adharcard_img_container">
            <img src={AdharImg} className="adharcard_img" alt="abhar_img" />
          </div>
          <div className="adharcard_input_section">
            <p className="adharcard_label">Enter Your Aadhaar Number</p>
            <div className="adharcard_inputs_row">
              <div className="adharcard_inputs">
                {segments.map((segment, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    className={`adharcard_input ${hasError ? "error" : ""}`}
                    value={segment}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    ref={inputRefs[index]}
                    placeholder="X X X X"
                  />
                ))}
              </div>
              {hasError && <ErrorText errorText={errorMessage} />}
            </div>
            <div
              ref={containerRef}
              style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: "24px" }}
            >
              <div style={{ position: "relative" }}>
                <Button
                  className="btn btn-primary3 btn-text-white mb-2 btn-41 d-flex justify-content-between align-items-center"
                  style={{ width: "100%", position: "relative" }}
                  disabled={!isValid || !agreeTerms || isLoading}
                  onClick={() => {
                    if (isOtpPrimary) {
                      handleSendOtp();
                    } else if (isBiometricPrimary) {
                      handleBiometric();
                    }
                  }}
                >
                  <div className="d-flex align-items-center justify-content-center" style={{ width: "100%" }}>
                    {isBiometricPrimary && (
                      <img
                        src={FingerScanWhiteIcon}
                        alt="finger scan"
                        className="me-2"
                        style={{ width: "20px", height: "20px" }}
                      />
                    )}
                    {isOtpPrimary && (
                      <img
                        src={OtpIcon}
                        alt="otp"
                        className="me-2"
                        style={{ width: "20px", height: "20px" }}
                      />
                    )}
                    <span>
                      {isLoading
                        ? "Sending OTP..."
                        : isOtpPrimary
                        ? "Verify by OTP"
                        : "Verify by Biometric"}
                    </span>
                  </div>
                  <div
                    ref={arrowRef}
                    style={{
                      position: "absolute",
                      right: 24,
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      zIndex: 10,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setDropdownOpen((o) => !o);
                    }}
                  >
                    <i
                      className="icon-right"
                      style={{
                        display: "block",
                        transform: dropdownOpen ? "rotate(90deg)" : "rotate(-90deg)",
                        color: "white",
                        fontSize: "12px",
                      }}
                    ></i>
                  </div>
                </Button>
              </div>
              {dropdownOpen && (
                <div className="smart-rx-buttons-grp" style={{ position: "relative", zIndex: 1000 }}>
                  {isOtpPrimary ? (
                    <div>
                      <button
                        className="smart-rx-buttons bottom-br"
                        onClick={handleBiometric}
                        disabled={!isValid || !agreeTerms}
                      >
                        <span style={{ padding: "0 3.4rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          <img
                            src={FingerScanIcon}
                            alt="finger scan"
                            style={{ width: "20px", height: "20px" }}
                          />
                          Verify by Biometric
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        className="smart-rx-buttons bottom-br"
                        onClick={handleSendOtp}
                        disabled={!isValid || !agreeTerms || isLoading}
                      >
                        <span style={{ padding: "0 3.4rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          <img
                            src={OtpIcon}
                            alt="otp"
                            style={{ width: "20px", height: "20px" }}
                          />
                          {isLoading ? "Sending OTP..." : "Verify by OTP"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <label className="abha_terms_checkbox">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
        />
        <span>
          I agree with the terms and conditions{" "}
          <button type="button" onClick={() => setShowTermsPopup(true)}>View</button>
        </span>
      </label>
      <TermsAndConditionsPopup
        open={showTermsPopup}
        onClose={() => setShowTermsPopup(false)}
      />
      <div className="abha_link_divider">
        <span className="right_line_divider"></span>
        <div className="divider_text">Or Link Existing ABHA</div>
        <span className="left_line_divider"></span>
      </div>

      <div className="abha_naviagtion_cards">
        <AbhaNavigationCard
          label={"Link Using Mobile Number"}
          icon={LinkMobileIcon}
          onClick={() => onLinkOptionSelect("mobile")}
        />
        <AbhaNavigationCard
          label={"Link Using ABHA Address"}
          icon={GlobalIcon}
          onClick={() => onLinkOptionSelect("address")}
        />
        <AbhaNavigationCard
          label={"Link Using ABHA Number"}
          icon={PersonalCardIcon}
          onClick={() => onLinkOptionSelect("number")}
        />
      </div>
    </div>
  );
};

export default CreatePatientAbha;
