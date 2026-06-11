import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkPediaExists, validateUser, verifyAccessToken } from "../authService";
import "../auth.scss"; // Assuming the provided styles are in this CSS file
import { isMobile } from "react-device-detect";
import { Spin } from "antd";
import { isZyPreprodOrZyProdEnv } from "../../../utils/environment";

const LoginWithOTP = ({ reason, handleView, number }) => {
  const isSignupDisabled = isZyPreprodOrZyProdEnv();
  const navigate = useNavigate();
  const [mobileNumber, setMobileNumber] = useState(
    number === "null" ? "" : number
  );
  const [isValidUser, setIsValidUser] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false); // Loader state
  const [clinicSetup, setClinicSetup] = useState(false);
  const [pediaExists, setPediaExists] = useState(false);
  const [utm_campaign, setUtm_campaign] = useState("NA");
  const [utm_source, setUtm_source] = useState("NA");
  const [utm_content, setUtm_content] = useState("NA");
  const [utm_medium, setUtm_medium] = useState("NA");
  const [otpRequested, setOtpRequested] = useState(false);

  useEffect(() => {
    if (number !== "null" || number !== "") {
      setMobileNumber(number);
    }
  }, [number]);

  // Timer and resend state
  const [countdown, setCountdown] = useState(0);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  useEffect(() => {
    // Add a flag to window to indicate MSG91 is being used
    window.isMSG91Active = true;
    
    const scriptId = "msg91-otp-script";
    const existingScript = document.getElementById(scriptId);

    // Only load the script if it's not present AND we're on the OTP page
    if (!existingScript && window.isMSG91Active) {
      const configuration = {
        widgetId: "346b79686352303336343033",
        tokenAuth: "365375TaYB4FU32WrR67443055P1",
        captchaRenderId: "captch-id",
        exposeMethods: true,
        success: (data) => {
          void 0;
        },
        failure: (error) => {
          console.error("OTP Verification Failed:", error);
        },
      };

      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://control.msg91.com/app/assets/otp-provider/otp-provider.js";
      script.async = true;

      script.onload = () => {
        if (window.initSendOTP && window.isMSG91Active) {
          window.initSendOTP(configuration);
        } else {
          console.error("initSendOTP method not found!");
        }
      };

      document.body.appendChild(script);
    }

    return () => {
      const currentPath = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const view = searchParams.get('view');
      
      const isAuthView = currentPath.includes('/login') && 
        (view === 'signup' || !view);
      
      if (!isAuthView || view === 'loginWithPassword') {
        window.isMSG91Active = false;
        
        // Remove the MSG91 provider element if it exists
        const msg91Provider = document.querySelector('msg91-otp-provider');
        if (msg91Provider) {
          try {
            if (msg91Provider.disconnectedCallback) {
              msg91Provider.disconnectedCallback();
            }
            msg91Provider.remove();
          } catch (e) {
            console.error('Error removing MSG91 provider:', e);
          }
        }

        // Remove the script
        const script = document.getElementById(scriptId);
        if (script) {
          document.body.removeChild(script);
        }

        // Instead of trying to undefine or redefine, 
        // we'll set the methods to no-op functions
        try {
          if (window.initSendOTP) {
            window.initSendOTP = () => console.log('MSG91 disabled');
          }
          if (window.sendOtp) {
            window.sendOtp = () => console.log('MSG91 disabled');
          }
          if (window.verifyOtp) {
            window.verifyOtp = () => console.log('MSG91 disabled');
          }
          if (window.retryOtp) {
            window.retryOtp = () => console.log('MSG91 disabled');
          }
        } catch (e) {
          console.error('Error resetting MSG91 methods:', e);
        }

        // Remove any existing captcha elements
        const captchaElement = document.getElementById('captch-id');
        if (captchaElement) {
          while (captchaElement.firstChild) {
            captchaElement.removeChild(captchaElement.firstChild);
          }
        }

        // Get UTM parameters and track events
        const params = new URLSearchParams(window.location.search);
        setUtm_campaign(params.get("utm_campaign") ?? 'NA');
        setUtm_source(params.get("utm_source") ?? 'NA');
        setUtm_medium(params.get("utm_medium") ?? 'NA');
        setUtm_content(params.get("utm_content") ?? 'NA');

        if(reason === 'forgotPassword' || reason === "setPassword"){
          window.Moengage.track_event('TP_ResetPassword_landing_page', {
            utm_campaign, utm_source, utm_medium, utm_content
          });
        }else {
          window.Moengage.track_event('TP_Login_OTP_landing_page', {
            utm_campaign, utm_source, utm_medium, utm_content
          });
        }
      }
    };
  }, []);

  let timer; // Global timer reference

  const handleSendOtp = async () => {
    if (isButtonDisabled) return; // Prevent multiple clicks

    // Mobile number validation (only 10 digits allowed)
    if (!/^\d{10}$/.test(mobileNumber?.trim())) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    // Check for Captcha Verification
    if (!isOtpSent && !window.isCaptchaVerified()) {
      setError(
        "Captcha verification is required. Please check the box to proceed."
      );
      return;
    }

    setOtpRequested(true);

    try {
      setIsButtonDisabled(true); // Disable the button immediately
      setMessage("");
      setError(null);
      setLoading(true); // Show loader

      if (isValidUser) {

        // Use `retryOtp` if OTP was already sent
        if (isOtpSent) {
          retryOtp();
        } else {
          sendOtp();
        }
        return;
      }

      // Step 1: Validate the user
      const response = await validateUser(mobileNumber);
      const { message } = response;

      // Step 2: Handle validation responses
      switch (message) {
        case "Doctor does not exists!":
          const pediaCheck = await checkPediaExists({ mbl_no: "91" + mobileNumber });

          if (pediaCheck?.data?.status === 204) {
            setError("Phone number not registered");
            setIsButtonDisabled(false);
            break;

          } else {
            setPediaExists(true);
            if (pediaCheck?.data?.body?.pm_id != null) {
              setClinicSetup(true);
            }
            setIsValidUser(true);
            sendOtp();
            break;
          }

        case "Doctor is inactive":
          setError(
            "Your account has been locked by Admin. Please contact support@tatvacare.in/9974042363"
          );
          setIsButtonDisabled(false);
          break;

        case "Doctor exists!":
          setIsValidUser(true);
          sendOtp();
          break;

        default:
          setError("Unexpected response from server.");
          setIsButtonDisabled(false);
      }
    } catch (error) {
      console.error("Error during user validation:", error);
      setError("Failed to validate user. Please try again.");
      setIsButtonDisabled(false);
    } finally {
      setLoading(false); // Hide loader
    }
  };

  // Function to send OTP
  const sendOtp = () => {
    if (!window.sendOtp) {
      console.error("sendOtp method not found!");
      setError("OTP service is currently unavailable. Please try again later.");
      setIsButtonDisabled(false);
      setLoading(false); // Hide loader
      window.Moengage.track_event('TP_OTP_error', {
        mobile: "91" + mobileNumber, utm_campaign, utm_source, utm_medium, utm_content
      });
      return;
    }

    if (timer) clearInterval(timer); // Clear any existing timers

    setLoading(true); // Show loader
    window.sendOtp(
      `91${mobileNumber}`,
      (data) => {
        setIsOtpSent(true);
        setMessage("Verification OTP has been sent. Please check your SMS.");
        setError(null); // Clear error message

        // Start the countdown timer
        startTimer();
        setLoading(false); // Hide loader
        window.Moengage.track_event('TP_OTP_Requested', {
          mobile: "91" + mobileNumber, utm_campaign, utm_source, utm_medium, utm_content
        });
      },
      (error) => {
        console.error("Error sending OTP:", error);
        setError("Failed to send OTP. Please try again.");
        setIsButtonDisabled(false);
        setLoading(false); // Hide loader
        window.Moengage.track_event('TP_OTP_error', {
          mobile: "91" + mobileNumber, utm_campaign, utm_source, utm_medium, utm_content
        });
      }
    );
  };

  // Function to start the countdown timer
  const startTimer = () => {
    setCountdown(30); // Reset the timer to 30 seconds
    timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          setIsButtonDisabled(false); // Enable the resend button
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Retry OTP Method
  const retryOtp = () => {
    if (!window.retryOtp) {
      console.error("retryOtp method not found!");
      setError("Retry service is unavailable. Please try again later.");
      setIsButtonDisabled(false);
      setLoading(false); // Hide loader
      return;
    }

    setLoading(true); // Show loader

    window.retryOtp(
      "11",
      (data) => {
        setMessage("OTP has been resent. Please check your SMS.");
        setError(null); // Clear error message
        startTimer(); // Restart the countdown timer
        setLoading(false); // Hide loader
        window.Moengage.track_event('TP_OTP_Resend', {
          mobile: "91" + mobileNumber, utm_campaign, utm_source, utm_medium, utm_content
        });
      },
      (error) => {
        console.error("Error retrying OTP:", error);
        setError("Failed to resend OTP. Please try again.");
        setIsButtonDisabled(false);
        setLoading(false); // Hide loader
        window.Moengage.track_event('TP_OTP_error', {
          mobile: "91" + mobileNumber, utm_campaign, utm_source, utm_medium, utm_content
        });
      }
    );
  };

  const handleVerifyOtp = () => {
    setMessage("");
    setError(null);

    if (!otp || otp.length < 6) {
      setError("Please enter a valid OTP");
      return;
    }

    setLoading(true); // Show loader
    if (window.verifyOtp) {
      window.verifyOtp(
        otp,
        async (data) => {
          const { token, message } = data;

          // Check if the message is "Invalid OTP"
          if (message === "Invalid OTP") {
            setError("Invalid OTP. Please try again.");
            setLoading(false); // Hide loader
            window.Moengage.track_event('TP_OTP_Incorrect', {
              mobile: "91" + mobileNumber, utm_campaign, utm_source, utm_medium, utm_content
            });
            return;
          }

          window.Moengage.track_event('TP_OTP_Verified', {
            mobile: "91" + mobileNumber, utm_campaign, utm_source, utm_medium, utm_content
          });
          try {
            const response = await verifyAccessToken(mobileNumber, message);
            window.Moengage.add_mobile("+91" + mobileNumber);
            window.Moengage.track_event('TP_Login_Success', {
              mobile: "91" + mobileNumber, utm_campaign, utm_source, utm_medium, utm_content
            });
            const {
              message: responseMessage,
              doctor_unique_id,
              statusCode,
              ssoUrl,
            } = response;

            switch (responseMessage) {
              case "Password not set":
                handleSwitch({
                  view: "setPassword",
                  doctor_unique_id,
                  mobileNumber,
                });
                break;

              case "Doctor does not exists!":
                if (pediaExists && clinicSetup === false) {
                  localStorage.setItem('mo_mobile', "91" + mobileNumber);
                  handleSwitch({ view: 'clinic-setup' });
                } else {
                  setError("User is not registered with us.");
                }
                break;

              case "Doctor is inactive":
                setError(
                  "Your account has been locked by Admin. Please contact support@tatvacare.in / 9974042363"
                );
                break;

              default:
                if (reason === "forgotPassword") {
                  handleSwitch({
                    view: "setPassword",
                    doctor_unique_id,
                    mobileNumber,
                  });
                } else if (ssoUrl) {
                  // Redirect to SSO URL if applicable // append the url with device_type=desktop
                  // Append device type to the SSO URL
                  const updatedSsoUrl = isMobile
                    ? `${ssoUrl}&device_type=mobile`
                    : `${ssoUrl}&device_type=desktop`;

                  // Redirect to the updated SSO URL
                  window.location.href = updatedSsoUrl;
                } else {
                  throw new Error("Unexpected response from server.");
                }
            }
          } catch (error) {
            console.error("Error during OTP verification:", error);
          } finally {
            setLoading(false); // Hide loader
          }
        },
        (error) => {
          console.error("Error verifying OTP:", error);
          setError("Failed to verify OTP. Please try again.");
          setLoading(false); // Hide loader
          window.Moengage.track_event('TP_OTP_Incorrect', {
            mobile: "91" + mobileNumber, utm_campaign, utm_source, utm_medium, utm_content
          });
        }
      );
    } else {
      console.error("verifyOtp method not found!");
      setLoading(false); // Hide loader
    }
  };

  const handleSwitch = (data) => {
    handleView(data);
  };

  useEffect(() => {
    // Reset OTP state when the mobile number changes
    setIsOtpSent(false);
    setCountdown(0);
    setMessage("");
    setError(null);
    clearInterval(timer); // Clear the timer on mobile number change
  }, [mobileNumber]);

  return (
    <div className="login-container background-image">
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgb(194 194 194 / 70%)",
            // backdropFilter: "blur(8px)", // Blur effect
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Spin size="large" />
        </div>
      )}
      <div className="login-card">
        <img
          src="https://diginextloginprod.z10.web.core.windows.net/phone_number_login_ui/images/main-logo.png"
          alt="Company Logo"
          style={{ width: "100%", marginBottom: "1rem" }}
        ></img>
        <h1>
          {reason === "forgotPassword" || reason === "setPassword" ? "Reset Password" : "Login with OTP"}
        </h1>

        {/* Display success and error messages */}
        {message && <div className="color-blue" style={{ fontSize: "14px" }}>{message}</div>}
        {error && <div className="color-red" style={{ fontSize: "14px" }}>{error}</div>}
        {reason === "setPassword" && <div className="color-red" style={{ fontSize: "14px" }}>{"Please reset your password via OTP once."}</div>}

        <form>
          <label htmlFor="mobileNumber">Mobile Number *</label>
          <input
            type="text"
            id="mobile"
            placeholder="Enter your mobile number"
            value={mobileNumber || ""}
            onChange={(e) => setMobileNumber(e.target.value)}
            className="common-width"
          />
          {!otpRequested && <>
          <div id="captch-id"></div> </>}
          <button
            type="button"
            className={`otp-button ${isButtonDisabled ? "disable" : ""
              } common-width`}
            onClick={handleSendOtp}
            disabled={isButtonDisabled}
          >
            {isOtpSent
              ? `Resend OTP ${countdown > 0 ? `(${countdown}s)` : ""}`
              : "Send OTP"}
          </button>

          {isOtpSent && (
            <>
              <label htmlFor="otp">Enter OTP</label>
              <input
                type="text"
                id="otp"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="common-width"
              />
              <br />
              <button
                type="button"
                className="login-button common-width"
                onClick={handleVerifyOtp}
              >
                Verify OTP
              </button>
            </>
          )}
        </form>
        {(reason === "forgotPassword" || reason === "setPassword") ? (
          <br />
        ) : (
          <>
            <div className="separator">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="otp-button common-width"
              onClick={() => {
                window.location.href = `/login?view=loginWithPassword&number=${mobileNumber}`;
              }}
            >
              Login with Password
            </button>

            <br />
            {!isSignupDisabled && (
              <p>Don't have an account? <a href="/login?view=signup">Sign up</a> </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoginWithOTP;
