import React, { useRef, useState } from "react";

import AbhaNavigationCard from "../common/AbhaNavigationCard";

import ErrorText from "../common/ErrorText";
import TermsAndConditionsPopup from "../common/TermsAndConditionsPopup";
import { ASSETS } from "../../../assets";
const {
  adhar: AdharImg,
  linkMobileIcon: LinkMobileIcon,
  globalIcon: GlobalIcon,
  personalCardIcon: PersonalCardIcon,
  aadhaarIcon: AadhaarIcon,
  leftArrow: LeftArrow,
} = ASSETS.images;

const BiometricAadhaarEntry = ({
  onNext = () => {},
  onLinkOptionSelect = () => {},
  onOtpFlowSelect = () => {},
  patientUniqueId,
}) => {
  const [segments, setSegments] = useState(["", "", ""]);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const inputRefs = [useRef(null), useRef(null), useRef(null)];
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showTermsPopup, setShowTermsPopup] = useState(false);

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
  };

  const handleNext = () => {
    const aadhaarNumber = segments.join("");
    if (aadhaarNumber.length !== 12 || !agreeTerms) {
      setHasError(true);
      setErrorMessage("Invalid Aadhaar Number!");
      return;
    }

    // Navigate to biometric verification screen
    onNext({
      aadhaarNumber,
      patient_unique_id: patientUniqueId,
    });
  };

  const isValid = segments.join("").length === 12;

  return (
    <div className="create_abha_patient">
      <div className="abha_patient_header_container">
        <div className="abha_patient_header">Create Patient ABHA via Biometric</div>
        <div className="abha_patient_subHeader">
          By Entering Patient's Aadhaar Number Below
        </div>
      </div>
      <div>
        <div className="adharcard">
          <div className="adharcard_img_container">
            <img src={AdharImg} className="adharcard_img" alt="aadhaar_img" />
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
            <button
              className="abha_next_button adharcard_next_btn"
              disabled={!isValid || !agreeTerms}
              onClick={handleNext}
            >
              Next
            </button>
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
      <div className="abha_link_divider">
        <span className="right_line_divider"></span>
        <div className="divider_text">Other Options to link ABHA</div>
        <span className="left_line_divider"></span>
      </div>

      <div className="abha_naviagtion_cards">
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
        <AbhaNavigationCard
          label={"Link Using Mobile Number"}
          icon={LinkMobileIcon}
          onClick={() => onLinkOptionSelect("mobile")}
        />
      </div>

      <div className="abha_link_divider">
        <span className="right_line_divider"></span>
        <div className="divider_text">Or create ABHA</div>
        <span className="left_line_divider"></span>
      </div>

      <div className="abha_otp_flow_section">
        <button
          className="abha_otp_flow_button"
          onClick={onOtpFlowSelect}
        >
          <div className="abha_otp_flow_button_content">
            <img src={AadhaarIcon} alt="aadhaar" className="abha_otp_flow_icon" />
            <span>Create ABHA using Aadhaar</span>
          </div>
          <img src={LeftArrow} alt="arrow" className="abha_otp_flow_arrow" />
        </button>
      </div>
      <TermsAndConditionsPopup
        open={showTermsPopup}
        onClose={() => setShowTermsPopup(false)}
      />
    </div>
  );
};

export default BiometricAadhaarEntry;
