import React, { useState, useEffect } from "react";
import { Input, Button, Form, Spin } from "antd";
import { isMobile } from "react-device-detect";
import "./Onboarding.scss";

import { verifyAccessToken } from "../../auth/authService";
import { loginWithPassword } from "../../auth/authService";
import { useNavigate } from "react-router-dom";
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

const VerifyOTP = ({
  onViewChange,
  mobileNumber,
  isLoginFlow,
  isUserExists,
  isPasswordSetFlow,
  tempPassword,
  reqId,
}) => {
  const [timer, setTimer] = useState(15);
  const [canResend, setCanResend] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [resendReqId, setResendReqId] = useState(null);
  // Get UTM params
  const utm = getUtmParams();

  useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
      return () => clearInterval(countdown);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  useEffect(() => {
    if (reqId) {
      setResendReqId(reqId);
    }
  }, [reqId]);

  const handleResendOTP = () => {
    if (!canResend) return;

    setLoading(true);
    if (window.retryOtp) {
      if(isLoginFlow){
        window.Moengage.track_event('TP_NewLoginFlow_Login_Resend_OTP', {
          mobile: "91" + mobileNumber,
          operating_system: detectOperatingSystem(),
          utm_campaign: utm.utm_campaign ?? 'NA',
          utm_source: utm.utm_source ?? 'NA',
          utm_medium: utm.utm_medium ?? 'NA',
          utm_content: utm.utm_content ?? 'NA',
          utm_term: utm.utm_term ?? 'NA',
          is_marketing: Object.values(utm).some(value => value && value.length > 0),
        })}
      else{
        window.Moengage.track_event('TP_NewLoginFlow_Signup_Resend_OTP', {
          mobile: "91" + mobileNumber,
          operating_system: detectOperatingSystem(),
          utm_campaign: utm.utm_campaign ?? 'NA',
          utm_source: utm.utm_source ?? 'NA',
          utm_medium: utm.utm_medium ?? 'NA',
          utm_content: utm.utm_content ?? 'NA',
          utm_term: utm.utm_term ?? 'NA',
          is_marketing: Object.values(utm).some(value => value && value.length > 0),
        })
      }

      window.retryOtp(
        // `91${mobileNumber}`,
        "11",
        (data) => {
          setTimer(15);
          setCanResend(false);
          setError(null);
          setLoading(false);
        },
        (error) => {
          console.error("Error retrying OTP:", error);
          setError("Failed to resend OTP. Please try again.");
          setLoading(false);
        },
        `${resendReqId}`
      );
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoginLoading(true); // Set loading state at the start
    setError(null);

    try {
      if (window.verifyOtp) {
        window.verifyOtp(
          otp,
          async (data) => {
            try {
              const { message, type } = data;

              if (isPasswordSetFlow) {
                const verifyResponse = await verifyAccessToken(mobileNumber, message, tempPassword);
                const loginResponse = await loginWithPassword(mobileNumber, tempPassword);

                window.Moengage.track_event('TP_NewLoginFlow_Set_Password_OTP_Submit', {
                  mobile: "91" + mobileNumber,
                  operating_system: detectOperatingSystem(),
                  utm_campaign: utm.utm_campaign ?? 'NA',
                  utm_source: utm.utm_source ?? 'NA',
                  utm_medium: utm.utm_medium ?? 'NA',
                  utm_content: utm.utm_content ?? 'NA',
                  utm_term: utm.utm_term ?? 'NA',
                  is_marketing: Object.values(utm).some(value => value && value.length > 0),
                });

                if (loginResponse.ssoUrl) {
                  localStorage.removeItem("currentView");
                  localStorage.removeItem("isLoginFlow");
                  localStorage.removeItem("isUserExists");
                  localStorage.removeItem("mobileNumber");
                  localStorage.removeItem("isCaptchaVerified");
                  const deviceType = isMobile ? "mobile" : "desktop";
                  window.location.href = `${loginResponse.ssoUrl}&device_type=${deviceType}`;
                } else {
                  setError("Failed to set password. Please try again.");
                }
              } else if (isUserExists) {
                const response = await verifyAccessToken(mobileNumber, message);

                if (response) {
                  const { ssoUrl } = response;

                  window.Moengage.track_event('TP_NewLoginFlow_Login_OTP_Submit', {
                    mobile: "91" + mobileNumber,
                    operating_system: detectOperatingSystem(),
                    utm_campaign: utm.utm_campaign ?? 'NA',
                    utm_source: utm.utm_source ?? 'NA',
                    utm_medium: utm.utm_medium ?? 'NA',
                    utm_content: utm.utm_content ?? 'NA',
                    utm_term: utm.utm_term ?? 'NA',
                    is_marketing: Object.values(utm).some(value => value && value.length > 0),
                  });

                  if (ssoUrl) {
                    localStorage.removeItem("currentView");
                    localStorage.removeItem("isLoginFlow");
                    localStorage.removeItem("isUserExists");
                    localStorage.removeItem("mobileNumber");
                    localStorage.removeItem("isCaptchaVerified");
                    const deviceType = isMobile ? "mobile" : "desktop";
                    window.location.href = `${ssoUrl}&device_type=${deviceType}`;
                  }
                } else {
                  setError("Failed to verify access token. Please try again.");
                  setLoginLoading(false);
                }
              } else {
                localStorage.removeItem("currentView");
                localStorage.removeItem("isLoginFlow");
                localStorage.removeItem("isUserExists");
                localStorage.removeItem("isCaptchaVerified");
                window.Moengage.track_event('TP_NewLoginFlow_Signup_OTP_Submit', {
                  mobile: "91" + mobileNumber,
                  utm_campaign: utm.utm_campaign ?? 'NA',
                  utm_source: utm.utm_source ?? 'NA',
                  utm_medium: utm.utm_medium ?? 'NA',
                  utm_content: utm.utm_content ?? 'NA',
                  utm_term: utm.utm_term ?? 'NA',
                  operating_system: detectOperatingSystem(),
                  is_marketing: Object.values(utm).some(value => value && value.length > 0),
                });

                const queryParams = new URLSearchParams(window.location.search.toString());

                navigate(`/final-setup?${queryParams.toString()}`);
 
              }
            } catch (error) {
              console.error("Error in verification process:", error);
              setError("Something went wrong. Please try again.");
              setLoginLoading(false);
            }
          },
          (error) => {
            console.error("OTP Verification Failed:", error);
            setError("Invalid or expired OTP. Please try again or request a new OTP");
            setLoginLoading(false);
          },
          ...(reqId ? [reqId] : [])
        );
      }
    } catch (error) {
      console.error("Error during OTP verification:", error);
      setError("Something went wrong. Please try again.");
      setLoginLoading(false);
    }
  };

  const handleEditNumber = () => {
    // Store current state in localStorage
    isLoginFlow
      ? localStorage.setItem("currentView", "loginOTP")
      : localStorage.setItem("currentView", "signup");
    isLoginFlow
      ? localStorage.setItem("isLoginFlow", "true")
      : localStorage.setItem("isLoginFlow", "false");
    localStorage.setItem("mobileNumber", mobileNumber);

    // Refresh the page
    window.location.reload();
  };

  return (
    <div className="signup-form-wrapper">
      {/* {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgb(194 194 194 / 70%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Spin size="large" />
        </div>
      )} */}
      <div className="signup-form-container">
        <h2 className="title" style={{ margin: "2.5rem 0 3rem 0" }}>Almost there</h2>

        <Form name="verifyOTP" className="signup-form">
          <div className="otp-label">
            Enter OTP sent to <span className="mobile-number">{mobileNumber}</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="edit-icon"
              onClick={handleEditNumber}
            >
              <path
                d="M11.7167 7.51667L12.4833 8.28333L4.93333 15.8333H4.16667V15.0667L11.7167 7.51667ZM14.7167 2.5C14.5083 2.5 14.2917 2.58333 14.1333 2.74167L12.6083 4.26667L15.7333 7.39167L17.2583 5.86667C17.5833 5.54167 17.5833 5.01667 17.2583 4.69167L15.3083 2.74167C15.1417 2.575 14.9333 2.5 14.7167 2.5ZM11.7167 5.15833L2.5 14.375V17.5H5.625L14.8417 8.28333L11.7167 5.15833Z"
                fill="#6941C6"
              />
            </svg>
          </div>

          <Form.Item
            name="otp"
          >
            <Input
              autoFocus
              placeholder="Enter 6-Digit OTP"
              className="otp-input"
              onPressEnter={handleVerifyOTP}
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />
          </Form.Item>

          {error && <div className="error-message">{error}</div>}

          <div
            className="resend-otp"
            onClick={handleResendOTP}
            style={{
              textDecoration: canResend ? "underline" : "none",
              color: canResend ? "#6941C6" : "inherit",
              cursor: canResend ? "pointer" : "default",
            }}
          >
            Resend OTP {canResend ? "" : `in ${timer}s`}
          </div>
          <Button
            type="primary"
            loading={loginLoading}
            className="submit-btn"
            onClick={handleVerifyOTP}
            disabled={!otp || otp.length !== 6}
            style={{ margin: "1rem 0" }}
          >
            {isLoginFlow ? "Login" : "Submit OTP"}
          </Button>

          <div className="terms-text" style={{ paddingTop: "1rem" }}>
            By continuing I accept for the{" "}
            <a
              href="https://www.tatvacare.in/terms-conditions/"
              target="_blank"
              rel="noopener noreferrer"
            >
              T&C
            </a>{" "}
            and{" "}
            <a
              href="https://www.tatvacare.in/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </div>
        </Form>
        <div className="go-back" style={{ marginTop: "2rem" }} onClick={handleEditNumber}>
          Go back
        </div>
      </div>
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

export default VerifyOTP;
