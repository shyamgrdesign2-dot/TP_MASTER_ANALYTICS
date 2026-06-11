import React, {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import { setPassword, loginWithPassword } from "../authService"; // Import the new loginWithPassword API
import { useLocation } from "react-router-dom";
import "../auth.scss";
import { isMobile } from "react-device-detect";
import { Spin } from "antd";

const SetPassword = ({ number, data }) => {
  const [mobileNumber, setMobileNumber] = useState(
    number === "null" ? "" : number
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [erroMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false); // Loader state
  const navigate = useNavigate();
  const { state } = useLocation();
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

    window.Moengage.track_event('TP_SetNewPassword_landing_page', {
      utm_campaign, utm_source, utm_medium, utm_content
    });
  }, []);

  const passwordCriteria = [
    {
      id: "lengthCheck",
      text: "At least 8 characters long.",
      test: (pwd) => pwd.length >= 8,
    },
    {
      id: "specialCharCheck",
      text: "Contains at least one special character.",
      test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    },
    {
      id: "uppercaseCheck",
      text: "Contains at least one uppercase letter.",
      test: (pwd) => /[A-Z]/.test(pwd),
    },
    {
      id: "lowercaseCheck",
      text: "Contains at least one lowercase letter.",
      test: (pwd) => /[a-z]/.test(pwd),
    },
  ];

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setErrorMessage("");
    setMessage("");
    setLoading(true); // Show loader

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setLoading(false); // Hide loader
      return;
    }

    // Validate password
    const failedCriteria = passwordCriteria.filter(
      (criterion) => !criterion.test(newPassword)
    );

    if (failedCriteria.length > 0) {
      setErrorMessage("Password must meet the following criteria:");
      setError(failedCriteria.map((criterion) => criterion.text));
      setLoading(false); // Hide loader
      return;
    }

    try {
      // Call the setPassword API to set the password
      await setPassword(data?.doctor_unique_id, newPassword);
      setMessage("Password set successfully, logging in...");
      window.Moengage.track_event('TP_ResetPassword_Success', {
        mobile: "91"+ data?.mobileNumber,  utm_campaign, utm_source, utm_medium, utm_content
      });

      // Call loginWithPassword API after password is successfully set
      const loginResponse = await loginWithPassword(
        mobileNumber || data?.mobileNumber,
        newPassword
      );
      const { ssoUrl, message } = loginResponse;

      // Check if the response contains a valid SSO URL and redirect
      if (ssoUrl) {
        // Append device type to the SSO URL
        const updatedSsoUrl = isMobile
          ? `${ssoUrl}&device_type=mobile`
          : `${ssoUrl}&device_type=desktop`;

        // Redirect to the updated SSO URL
        window.location.href = updatedSsoUrl;
      } else {
        setErrorMessage("Unable to set password");
        window.location.href = `/login`;
      }
    } catch (error) {
      setErrorMessage("Failed to set password. Please try again.");
    } finally {
      setLoading(false); // Hide loader
    }
  };

  // Function to validate password strength
  const validatePassword = (password) => {
    const lengthCheck = password.length >= 8;
    const specialCharCheck = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const uppercaseCheck = /[A-Z]/.test(password);
    const lowercaseCheck = /[a-z]/.test(password);

    return {
      isValid:
        lengthCheck && specialCharCheck && uppercaseCheck && lowercaseCheck,
      lengthCheck,
      specialCharCheck,
      uppercaseCheck,
      lowercaseCheck,
    };
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
          <h1>Set Password</h1>
          <p>Please provide your new password details.</p>

          {/* <div className="color-red" style={{ fontSize: "14px" }}>
            {message}
          </div> */}

          {/* Display success and error messages */}

          {message && (
            <div className="color-blue" style={{ fontSize: "14px" }}>
              {message}
            </div>
          )}
          {erroMessage && (
            <div className="color-red" style={{ fontSize: "14px" }}>
              {erroMessage}
            </div>
          )}

          {error && (
            <div className="criteria-container">
              <ul className="color-red">
                {error.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <form onSubmit={handleSetPassword}>
            <label htmlFor="newPassword">New Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              id="newPassword"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="common-width"
              required
            />

            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="common-width"
              required
            />

            <div className="show-password" style={{ marginLeft: "30px" }}>
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label
                htmlFor="showPassword"
                style={{ marginTop: "2px", marginLeft: "2px" }}
              >
                Show Password
              </label>
            </div>

            <button type="submit" className="login-button common-width">
              Set Password
            </button>
          </form>

          <div className="links">
            <a href="/login">Back to Login</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default SetPassword;
