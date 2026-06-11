import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithPassword } from "../authService";
import "../auth.scss";
import { isMobile } from "react-device-detect";
import { Spin } from "antd";
import { ASSETS } from "../../../assets";
const tavaPracticeLogo = ASSETS.images.websiteImages.tatvacareLogoWithTag;

const LoginWithPassword = ({ handleView, number }) => {
  const [mobileNumber, setMobileNumber] = useState(number === "null" ? "" : number);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); // Loader state
  const [utm_campaign, setUtm_campaign] = useState("NA");
  const [utm_source, setUtm_source] = useState("NA");
  const [utm_content, setUtm_content] = useState("NA");
  const [utm_medium, setUtm_medium] = useState("NA");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtm_campaign(params.get("utm_campaign") ?? 'NA');
    setUtm_source(params.get("utm_source") ?? 'NA');
    setUtm_medium(params.get("utm_medium") ?? 'NA');
    setUtm_content(params.get("utm_content") ?? 'NA');

    window.Moengage.track_event('TP_Login_landing_page', {
      utm_campaign, utm_source, utm_medium, utm_content
    });
  },[]);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); // Reset any previous errors
    setMessage(null); // Clear any existing messages
    setLoading(true); // Show loader

    // Step 1: Input Validation
    const trimmedMobileNumber = mobileNumber?.trim();
    const trimmedPassword = password?.trim();

    if (!trimmedMobileNumber || !/^\d{10}$/.test(trimmedMobileNumber)) {
      setMessage("Please enter a valid 10-digit mobile number.");
      setLoading(false); // Hide loader
      return;
    }

    if (!trimmedPassword) {
      setMessage("Please enter your password.");
      setLoading(false); // Hide loader
      return;
    }
    window.Moengage.track_event('TP_Submit_Clicked', {
      utm_campaign, utm_source, utm_medium, utm_content
    });

    try {
      // Step 2: Call login API
      setMobileNumber(trimmedMobileNumber);
      const response = await loginWithPassword(trimmedMobileNumber, trimmedPassword);
      window.Moengage.track_event('TP_Login_Success', {
        utm_campaign, utm_source, utm_medium, utm_content
      });
      // Step 3: Extract response fields
      const { message, ssoUrl } = response;

      // Step 4: Handle SSO URL Redirection
      if (ssoUrl) {
        const updatedSsoUrl = isMobile
          ? `${ssoUrl}&device_type=mobile`
          : `${ssoUrl}&device_type=desktop`;

        window.location.href = updatedSsoUrl;
        return;
      }

      // Step 5: Handle Server Response Messages
      switch (message) {
        case "Doctor does not exists!":
          setMessage("User is not registered with us.");
          break;

        case "Login with otp":
          // Redirect to login with OTP page and pass the mobile number
          window.location.href = `/login?view=loginWithOtp&reason=setPassword&number=${trimmedMobileNumber}`;
          break;

        case "Doctor is inactive":
          setMessage(
            "Your account has been locked by Admin. Please contact support@tatvacare.in/9974042363"
          );
          break;

        case "Invalid username and password":
          setMessage("Invalid username or password. Please try again.");
          break;

        default:
          throw new Error("Unexpected response from server.");
      }
    } catch (error) {
      // Step 6: Error Handling
      console.error("Login failed:", error);
      setMessage("Login failed. Please try again.");
    } finally {
      setLoading(false); // Hide loader
    }
  };

  const handleSwitch = (data) => {
    handleView(data);
  };

  return (
    <>
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.7)", // Semi-transparent background
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Spin size="large" />
        </div>
      )}
      <div className="login-container background-image">
        <div className="login-card">
          <img
            src="https://diginextloginprod.z10.web.core.windows.net/phone_number_login_ui/images/main-logo.png"
            alt="Company Logo"
            style={{ width: "100%", marginBottom: "1rem" }}
          ></img>
          <h1>Login</h1>
          <p>Please provide the following details.</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="mobileNumber">Mobile Number *</label>
            <input
              type="text"
              id="mobileNumber"
              placeholder="Mobile Number"
              value={mobileNumber || ""}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="common-width"
              required
            />

            <label htmlFor="password">Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="common-width"
            />

            <div className="show-password" style={{ marginLeft: "30px" }}>
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label htmlFor="showPassword" style={{ marginTop: "2px", marginLeft: "2px" }}>
                Show Password
              </label>
            </div>

            {<div className="color-red">{message}</div>}

            <button type="submit" className="login-button common-width">
              Login
            </button>
          </form>

          <div
            className="links"
            onClick={() => {
              window.location.href = `/login?view=loginWithOtp&reason=forgotPassword&number=${mobileNumber}`;
            }}
          >
            Forgot/Set Password?
          </div>

          <div className="separator">
            <span>OR</span>
          </div>

          <button
            className="otp-button"
            onClick={() => {
              window.location.href = `/login?view=loginWithOtp&number=${mobileNumber}`;
            }}
          >
            Login via OTP
          </button>
        </div>
      </div>
    </>
  );
};

export default LoginWithPassword;
