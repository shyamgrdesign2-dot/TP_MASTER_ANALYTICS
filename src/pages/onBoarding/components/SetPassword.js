import React, { useState } from "react";
import { Input, Button } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import "./Onboarding.scss";

import { detectOperatingSystem } from "../../../utils/loginUtils";
import { getUtmParams } from "../../../components/userOnboarding/services/userDataService";
import { ASSETS } from "../../../assets";
const {
  abdmLogo,
  nhaLogo,
} = ASSETS.images;
const MicrosoftPartner = ASSETS.images.onboardPageIcons.microsoft;
const leftGroup = ASSETS.images.onboardPageIcons.leftGroup;
const rightGroup = ASSETS.images.onboardPageIcons.rightGroup;

const SetPassword = ({ onViewChange, mobileNumber }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [errors, setErrors] = useState({
    password: "",
    confirmPassword: ""
  });
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    capital: false,
    small: false,
    special: false,
    number: false,
    space: true
  });

  // Get UTM params
  const utm = getUtmParams();

  const isPasswordValid = () => {
    return Object.values(passwordStrength).every(value => value === true);
  };

  const checkPasswordStrength = (password) => {
    if (password) {
      const newPasswordStrength = {
        length: password.length >= 6,
        capital: /[A-Z]/.test(password),
        small: /[a-z]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        number: /[0-9]/.test(password),
        space: !/\s/.test(password)
      };
      setPasswordStrength(newPasswordStrength);
      setShowTooltip(password.length > 0 && !Object.values(newPasswordStrength).every(value => value === true));
    } else {
      setShowTooltip(false);
      setPasswordStrength({
        length: false,
        capital: false,
        small: false,
        special: false,
        number: false,
        space: true
      });
    }
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
    setErrors({ ...errors, password: "" });
  };

  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    setErrors({ ...errors, confirmPassword: "" });
  };

  const handleContinue = () => {

    // Reset errors
    setErrors({ password: "", confirmPassword: "" });

    // Validate password
    if (!password) {
      setErrors(prev => ({ ...prev, password: "Please input your password!" }));
      return;
    }

    if (!isPasswordValid()) {
      setErrors(prev => ({ ...prev, password: "Password does not meet all requirements" }));
      return;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "Please confirm your password!" }));
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "Passwords don't match. Please re-enter." }));
      return;
    }

    // If all validations pass, proceed with OTP
    if (window.sendOtp) {
      // moengage event for set password
      window.Moengage.track_event('TP_NewLoginFlow_Password_Setup', {
        mobile: "91" + mobileNumber,
        operating_system: detectOperatingSystem(),
        utm_campaign: utm.utm_campaign ?? 'NA',
        utm_source: utm.utm_source ?? 'NA',
        utm_medium: utm.utm_medium ?? 'NA',
        utm_content: utm.utm_content ?? 'NA',
        utm_term: utm.utm_term ?? 'NA',
        is_marketing: Object.values(utm).some(value => value && value.length > 0),
      })

      const formattedNumber = `91${mobileNumber}`.replace('+', '');
      window.sendOtp(
        formattedNumber,
        (successData) => {
          console.log("OTP sent successfully:", successData);
          if (successData && successData.message) {
            const reqId = successData.message;
            window.Moengage.track_event('TP_NewLoginFlow_Password_Setup_Otp_Success', {
              mobile: "91" + mobileNumber,
              operating_system: detectOperatingSystem(),
              utm_campaign: utm.utm_campaign ?? 'NA',
              utm_source: utm.utm_source ?? 'NA',
              utm_medium: utm.utm_medium ?? 'NA',
              utm_content: utm.utm_content ?? 'NA',
              utm_term: utm.utm_term ?? 'NA',
              is_marketing: Object.values(utm).some(value => value && value.length > 0),
            })
            onViewChange("verifyOTP", mobileNumber, true, true, password, reqId);
          } else {
            console.error("No requestId in response:", successData);
          }
        },
        (error) => {
          console.error("Error sending OTP:", error);
        }
      );
    }
  };

  const tooltipContent = (
    <div className="password-requirements">
      <div className={`requirement ${passwordStrength.length ? 'valid' : 'invalid'}`}>
        6 Character
      </div>
      <div className={`requirement ${passwordStrength.capital ? 'valid' : 'invalid'}`}>
        At least One Capital Letter
      </div>
      <div className={`requirement ${passwordStrength.small ? 'valid' : 'invalid'}`}>
        At least One Small Letter
      </div>
      <div className={`requirement ${passwordStrength.special ? 'valid' : 'invalid'}`}>
        At least One Special Character
      </div>
      <div className={`requirement ${passwordStrength.number ? 'valid' : 'invalid'}`}>
        At least One number
      </div>
      <div className={`requirement ${passwordStrength.space ? 'valid' : 'invalid'}`}>
        No Space
      </div>
    </div>
  );

  return (
    <div className="signup-form-wrapper">
      <div className="signup-form-container">
        <h2 className="title">Set Password</h2>

        <div className="set-password-form" style={{padding: "0"}}>
          <div className="phone-form-item">
            <label className="onboard-fields-label">
              Create a Password
            </label>
            <Input.Password
              value={password}
              placeholder="Enter password"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
              className="password-input"
              onChange={handlePasswordChange}
              bordered={false}
            />
            {errors.password && <div className="error-message">{errors.password}</div>}
            {showTooltip && tooltipContent}
          </div>

          <div className="phone-form-item">
            <label className="onboard-fields-label">
              Re-enter Password
            </label>
            <Input.Password
              value={confirmPassword}
              placeholder="Confirm password"
              className="password-input"
              onChange={handleConfirmPasswordChange}
              bordered={false}
              visibilityToggle={false}
            />
            {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
          </div>

          <Button
            type="primary"
            className="get-started-btn"
            onClick={handleContinue}
          >
            Continue
          </Button>

          <div className="go-back" style={{marginTop: "20px"}} onClick={() => onViewChange("loginPassword")}>
            Go back
          </div>
        </div>
      </div>
      <div style={{height: "2rem"}}></div>
      <div className="partners-section">
        <img src={leftGroup} alt="Lines Group" className="left-lines-group" />
        <img src={abdmLogo} alt="ABDM" className="abdm-logo" />
        <img src={nhaLogo} alt="NHA" className="nha-logo" />
        <img
          src={MicrosoftPartner}
          alt="Microsoft Partner"
          className="google-partner"
        />
        <img src={rightGroup} alt="Lines Group" className="right-lines-group" />
      </div>
    </div>
  );
};

export default SetPassword;
