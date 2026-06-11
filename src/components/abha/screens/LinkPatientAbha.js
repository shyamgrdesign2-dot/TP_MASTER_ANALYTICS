import React, { useEffect, useMemo, useState } from "react";
import { notification } from "antd";

import AbhaNavigationCard from "../common/AbhaNavigationCard";

import ErrorText from "../common/ErrorText";
import ApiAbha from "../../../api/services/ApiAbha";
import { getAbhaDomainSuffix } from "../helpers";
import { ASSETS } from "../../../assets";
const {
  call: CallIcon,
  globalIcon: GlobalIcon,
  personalCardIcon: PersonalCardIcon,
  adharIcon: AdharIcon,
} = ASSETS.images;

const METHOD_CONFIG = {
  mobile: {
    key: "mobile",
    label: "Link Using Mobile Number",
    header: "Link Patient ABHA",
    subHeader: "By entering patient's mobile number below",
    placeholder: "Enter mobile number",
    icon: CallIcon,
    errorText:
      "Looks like there’s no ABHA address linked to this mobile number yet! Create one to unlock your health records and services.",
  },
  address: {
    key: "address",
    label: "Link Using ABHA Address",
    header: "Link Patient ABHA",
    subHeader: "By Entering Patients ABHA Address Below",
    placeholder: "Entering Patients ABHA Address",
    icon: GlobalIcon,
    errorText:
      "ABHA address must be between 8-18 characters. Please check and try again.",
  },
  number: {
    key: "number",
    label: "Link Using ABHA Number",
    header: "Link Patient ABHA",
    subHeader: "By Entering Patients ABHA Number Below",
    placeholder: "00-0000-0000-0000",
    icon: PersonalCardIcon,
    errorText:
      "This ABHA number doesn't look right. Please ensure it is 14 digits and try again.",
  },
};

const LinkPatientAbha = ({
  selectedMethod = "mobile",
  onMethodChange = () => {},
  onCreateNew = () => {},
  onOtpSent = () => {},
  patientUniqueId = "",
}) => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [abhaAddress, setAbhaAddress] = useState("");
  const [abhaNumber, setAbhaNumber] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activeMethod = useMemo(() => {
    return METHOD_CONFIG[selectedMethod]?.key ?? "mobile";
  }, [selectedMethod]);

  const methodConfig = METHOD_CONFIG[activeMethod];

  useEffect(() => {
    setHasError(false);
    setErrorMessage("");
  }, [activeMethod]);

  const handleMobileChange = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(cleaned);
    setHasError(false);
    setErrorMessage("");
  };

  const handleAbhaNumberChange = (value) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, "").slice(0, 14);
    
    // Format with hyphens: 00-0000-0000-0000
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.slice(0, 2) + "-" + cleaned.slice(2);
    }
    if (cleaned.length > 6) {
      formatted = cleaned.slice(0, 2) + "-" + cleaned.slice(2, 6) + "-" + cleaned.slice(6);
    }
    if (cleaned.length > 10) {
      formatted = cleaned.slice(0, 2) + "-" + cleaned.slice(2, 6) + "-" + cleaned.slice(6, 10) + "-" + cleaned.slice(10);
    }
    
    setAbhaNumber(formatted);
    setHasError(false);
    setErrorMessage("");
  };

  const handleAbhaAddressChange = (value) => {
    // Remove @abdm or @sbx suffix if present and trim
    const cleanValue = value.replace(/@(abdm|sbx)$/i, "").trimStart();
    setAbhaAddress(cleanValue);
    setHasError(false);
    setErrorMessage("");
  };

  const handleNext = async () => {
    if (!agreeTerms) {
      notification.warning({
        message: "Terms Required",
        description: "Please agree to the terms and conditions to continue.",
      });
      return;
    }

    switch (activeMethod) {
      case "mobile":
        await handleMobileLink();
        break;
      case "address":
        await handleAbhaAddressLink();
        break;
      case "number":
        await handleAbhaNumberLink();
        break;
      default:
        break;
    }
  };

  const handleMobileLink = async () => {
    if (mobileNumber.length !== 10) {
      setHasError(true);
      setErrorMessage(methodConfig.errorText);
      return;
    }

    setIsLoading(true);
    try {
      const response = await ApiAbha.sendOtpForMobileLink({
        mobile_no: mobileNumber,
        patient_unique_id: patientUniqueId,
      });

      if (response?.success) {
        // Navigate to OTP verification screen
        onOtpSent({
          mobile_no: mobileNumber,
          patient_unique_id: patientUniqueId,
          txnId: response.data?.txnId,
          otpMessage: response.message,
          linkMethod: "mobile",
        });
      } else {
        setHasError(true);
        setErrorMessage(
          response?.data?.message ||
            "Failed to send OTP. Please check the mobile number and try again."
        );
      }
    } catch (error) {
      setHasError(true);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbhaAddressLink = async () => {
    // Validate ABHA address length (8-18 characters)
    if (abhaAddress.length < 8 || abhaAddress.length > 18) {
      setHasError(true);
      setErrorMessage(methodConfig.errorText);
      return;
    }

    setIsLoading(true);
    try {
      const response = await ApiAbha.sendOtpForAbhaAddressLink({
        abhaAddress: abhaAddress + getAbhaDomainSuffix(),
        patient_unique_id: patientUniqueId,
      });

      if (response?.success) {
        // Navigate to OTP verification screen
        onOtpSent({
          abhaAddress: abhaAddress,
          patient_unique_id: patientUniqueId,
          txnId: response.data?.txnId,
          otpMessage: response.message,
          linkMethod: "address",
        });
      } else {
        setHasError(true);
        setErrorMessage(
          response?.data?.message || "Failed to send OTP. Please try again."
        );
      }
    } catch (error) {
      setHasError(true);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbhaNumberLink = async () => {
    // Validate ABHA number length (14 digits without hyphens)
    const cleanedNumber = abhaNumber.replace(/-/g, "");
    if (cleanedNumber.length !== 14) {
      setHasError(true);
      setErrorMessage(methodConfig.errorText);
      return;
    }

    setIsLoading(true);
    try {
      const response = await ApiAbha.sendOtpForAbhaNumberLink({
        abhaNumber: abhaNumber, // Send with hyphens
        patient_unique_id: patientUniqueId,
      });

      if (response?.success) {
        // Navigate to OTP verification screen
        onOtpSent({
          abhaNumber: abhaNumber,
          patient_unique_id: patientUniqueId,
          txnId: response.data?.txnId,
          otpMessage: response.message,
          linkMethod: "number",
        });
      } else {
        setHasError(true);
        setErrorMessage(
          response?.data?.message || "Failed to send OTP. Please try again."
        );
      }
    } catch (error) {
      setHasError(true);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isNextDisabled = () => {
    if (!agreeTerms) return true;
    
    switch (activeMethod) {
      case "mobile":
        return mobileNumber.length !== 10;
      case "address":
        // ABHA address must be between 8-18 characters
        return abhaAddress.trim().length < 8 || abhaAddress.trim().length > 18;
      case "number":
        // ABHA number with hyphens should be 17 characters (00-0000-0000-0000)
        const cleanedNumber = abhaNumber.replace(/-/g, "");
        return cleanedNumber.length !== 14;
      default:
        return true;
    }
  };

  const renderActiveInput = () => {
    switch (activeMethod) {
      case "address":
        return (
          <div
            className={`abha_mobile_input abha_address_input_wrapper ${
              hasError ? "error" : ""
            }`}
          >
            <input
              type="text"
              className="abha_mobile_field abha_address_input_field"
              value={abhaAddress}
              onChange={(event) => handleAbhaAddressChange(event.target.value)}
              placeholder={methodConfig.placeholder}
            />
            <span className="abha_address_suffix">{getAbhaDomainSuffix()}</span>
          </div>
        );
      case "number":
        return (
          <div
            className={`abha_mobile_input abha_number_input_wrapper ${
              hasError ? "error" : ""
            }`}
          >
            <input
              type="tel"
              inputMode="numeric"
              maxLength={17}
              className="abha_mobile_field abha_number_input_field"
              value={abhaNumber}
              onChange={(event) => handleAbhaNumberChange(event.target.value)}
              placeholder={methodConfig.placeholder}
            />
          </div>
        );
      case "mobile":
      default:
        return (
          <div className={`abha_mobile_input ${hasError ? "error" : ""}`}>
            <span className="abha_mobile_icon">
              <img src={methodConfig.icon} alt="phone" />
            </span>
            <span className="abha_mobile_code">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className="abha_mobile_field"
              value={mobileNumber}
              onChange={(event) => handleMobileChange(event.target.value)}
              placeholder={methodConfig.placeholder}
            />
          </div>
        );
    }
  };

  const renderOtherOptions = () => {
    const otherMethods = Object.values(METHOD_CONFIG).filter(
      (method) => method.key !== activeMethod
    );

    return otherMethods.map((method) => (
      <AbhaNavigationCard
        key={method.key}
        label={method.label}
        icon={method.icon}
        onClick={() => onMethodChange(method.key)}
      />
    ));
  };

  return (
    <div className="link_patient_abha">
      <div className="abha_patient_header_container">
        <div className="abha_patient_header">{methodConfig.header}</div>
        <div className="abha_patient_subHeader">{methodConfig.subHeader}</div>
      </div>

      <div className="link_abha_mobile_section">
        {renderActiveInput()}
        {hasError && <ErrorText errorText={errorMessage || methodConfig.errorText} />}
      </div>

      <label className="abha_terms_checkbox">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
        />
        <span>
          I agree with the terms and conditions{" "}
          <button type="button">View</button>
        </span>
      </label>

      <button
        className="abha_next_button link_abha_next_btn"
        onClick={handleNext}
        disabled={isNextDisabled() || isLoading}
        style={{ opacity: isNextDisabled() || isLoading ? 0.5 : 1 }}
      >
        {isLoading ? "Sending..." : "Next"}
      </button>

      <div className="abha_link_divider">
        <span className="right_line_divider"></span>
        <div className="divider_text">Other Options to Link ABHA</div>
        <span className="left_line_divider"></span>
      </div>

      <div className="abha_naviagtion_cards">{renderOtherOptions()}</div>

      <div className="abha_link_divider">
        <span className="right_line_divider"></span>
        <div className="divider_text">Or Create ABHA</div>
        <span className="left_line_divider"></span>
      </div>

      <div className="abha_naviagtion_cards">
        <AbhaNavigationCard
          label={"Create ABHA using Aadhaar"}
          icon={AdharIcon}
          onClick={onCreateNew}
        />
      </div>
    </div>
  );
};

export default LinkPatientAbha;
