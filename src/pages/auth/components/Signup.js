import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {checkPediaExists, getSpecialityList, onboardUser} from "../authService";
import "../auth.scss"; // Assuming the provided styles are in this CSS file
import {Spin} from "antd";
import params from "lodash";

const Signup = ({reason, handleView, number}) => {
    const [mobileNumber, setMobileNumber] = useState(number === "null" ? "" : number);
    const [fname, setFname] = useState("");
    const [lname, setLname] = useState("");
    const [submitDisabled, setSubmitDisabled] = useState(true);
    const [specialty, setSpecialty] = useState("");
    const [isValidUser, setIsValidUser] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false); // Loader state
    const [specialities, setSpecialities] = useState([]);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpRequested, setOtpRequested] = useState(false);
    useEffect(() => {

        getSpecialityData();
        const params = new URLSearchParams(window.location.search);

        window.Moengage.track_event('TP_Signup_landing_page', {
            utm_campaign: params.get("utm_campaign") ?? 'NA',
            utm_source: params.get("utm_source") ?? 'NA',
            utm_medium: params.get("utm_medium") ?? 'NA',
            utm_content: params.get("utm_content") ?? 'NA',
            utm_term: params.get("utm_term") ?? 'NA',
        });
    }, []);

    const getSpecialityData = async () => {
        const data = await getSpecialityList();
        setSpecialities(data?.data?.speciality);
    }


    useEffect(() => {
        if (number !== "null" || number !== "") {
            setMobileNumber(number);
        }
    }, [number]);

    // Timer and resend state
    const [countdown, setCountdown] = useState(0);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);

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
            setError("Captcha verification is required. Please check the box to proceed.");
            return;
        }

        setOtpRequested(true);

        // check user exists
        const pediaCheck = await checkPediaExists({mbl_no: "91" + mobileNumber});

        if (pediaCheck?.data?.status === 200) {
            setError("Mobile Number Already Registered");
            return;
        }

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
            setIsValidUser(true);
            sendOtp();

        } catch (error) {
            console.error("Error during user registration:", error);
            setError("Failed to register user. Please try again.");
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
            const params = new URLSearchParams(window.location.search);
            window.Moengage.track_event('TP_OTP_error', {
                mobile: "91" + mobileNumber,
                utm_campaign: params.get("utm_campaign") ?? 'NA',
                utm_source: params.get("utm_source") ?? 'NA',
                utm_medium: params.get("utm_medium") ?? 'NA',
                utm_content: params.get("utm_content") ?? 'NA',
                utm_term: params.get("utm_term") ?? 'NA',
            });
            return;
        }

        if (timer) clearInterval(timer); // Clear any existing timers

        setLoading(true); // Show loader
        window.sendOtp(`91${mobileNumber}`, (data) => {
            setIsOtpSent(true);
            setMessage("Verification OTP has been sent. Please check your SMS.");
            setError(null); // Clear error message

            // Start the countdown timer
            startTimer();
            setLoading(false); // Hide loader
            const params = new URLSearchParams(window.location.search);
            window.Moengage.track_event('TP_OTP_Requested', {
                mobile: "91" + mobileNumber,
                utm_campaign: params.get("utm_campaign") ?? 'NA',
                utm_source: params.get("utm_source") ?? 'NA',
                utm_medium:params.get("utm_medium") ?? 'NA',
                utm_content: params.get("utm_content") ?? 'NA',
                utm_term: params.get("utm_term") ?? 'NA',
            });
        }, (error) => {
            console.error("Error sending OTP:", error);
            setError("Failed to send OTP. Please try again.");
            setIsButtonDisabled(false);
            setLoading(false); // Hide loader
            const params = new URLSearchParams(window.location.search);
            window.Moengage.track_event('TP_OTP_error', {
                mobile: "91" + mobileNumber,
                utm_campaign: params.get("utm_campaign") ?? 'NA',
                utm_source: params.get("utm_source") ?? 'NA',
                utm_medium:params.get("utm_medium") ?? 'NA',
                utm_content: params.get("utm_content") ?? 'NA',
                utm_term: params.get("utm_term") ?? 'NA',
            });
        });
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
            const params = new URLSearchParams(window.location.search);
            window.Moengage.track_event('TP_OTP_error', {
                mobile: "91" + mobileNumber,
                utm_campaign: params.get("utm_campaign") ?? 'NA',
                utm_source: params.get("utm_source") ?? 'NA',
                utm_medium:params.get("utm_medium") ?? 'NA',
                utm_content: params.get("utm_content") ?? 'NA',
                utm_term: params.get("utm_term") ?? 'NA',
            });
            return;
        }

        setLoading(true); // Show loader

        window.retryOtp("11", (data) => {
            setMessage("OTP has been resent. Please check your SMS.");
            setError(null); // Clear error message
            startTimer(); // Restart the countdown timer
            setLoading(false); // Hide loader
            const params = new URLSearchParams(window.location.search);
            window.Moengage.track_event('TP_OTP_Resend', {
                mobile: "91" + mobileNumber,
                utm_campaign: params.get("utm_campaign") ?? 'NA',
                utm_source: params.get("utm_source") ?? 'NA',
                utm_medium:params.get("utm_medium") ?? 'NA',
                utm_content: params.get("utm_content") ?? 'NA',
                utm_term: params.get("utm_term") ?? 'NA',
            });
        }, (error) => {
            console.error("Error retrying OTP:", error);
            setError("Failed to resend OTP. Please try again.");
            setIsButtonDisabled(false);
            setLoading(false); // Hide loader
            const params = new URLSearchParams(window.location.search);
            window.Moengage.track_event('TP_OTP_error', {
                mobile: "91" + mobileNumber,
                utm_campaign: params.get("utm_campaign") ?? 'NA',
                utm_source: params.get("utm_source") ?? 'NA',
                utm_medium:params.get("utm_medium") ?? 'NA',
                utm_content: params.get("utm_content") ?? 'NA',
                utm_term: params.get("utm_term") ?? 'NA',
            });
        });
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
            window.verifyOtp(otp, async (data) => {
                const {token, message} = data;
                const params = new URLSearchParams(window.location.search);
                // Check if the message is "Invalid OTP"
                if (message === "Invalid OTP") {
                    setError("Invalid OTP. Please try again.");
                    setLoading(false); // Hide loader

                    window.Moengage.track_event('TP_OTP_Incorrect', {
                        mobile: "91" + mobileNumber,
                        utm_campaign: params.get("utm_campaign") ?? 'NA',
                        utm_source: params.get("utm_source") ?? 'NA',
                        utm_medium:params.get("utm_medium") ?? 'NA',
                        utm_content: params.get("utm_content") ?? 'NA',
                        utm_term: params.get("utm_term") ?? 'NA',
                    });
                    return;
                }

                window.Moengage.track_event('TP_OTP_Verified', {
                    mobile: "91" + mobileNumber,
                    utm_campaign: params.get("utm_campaign") ?? 'NA',
                    utm_source: params.get("utm_source") ?? 'NA',
                    utm_medium:params.get("utm_medium") ?? 'NA',
                    utm_content: params.get("utm_content") ?? 'NA',
                    utm_term: params.get("utm_term") ?? 'NA',
                });
                setOtpVerified(true);
                setLoading(false); // Hide loader

                setMessage("OTP verified");

                setSubmitDisabled(false);

            }, (error) => {
                console.error("Error verifying OTP:", error);
                setError("Failed to verify OTP. Please try again.");
                setLoading(false); // Hide loader
                const params = new URLSearchParams(window.location.search);
                window.Moengage.track_event('TP_OTP_Incorrect', {
                    mobile: "91" + mobileNumber,
                    utm_campaign: params.get("utm_campaign") ?? 'NA',
                    utm_source: params.get("utm_source") ?? 'NA',
                    utm_medium:params.get("utm_medium") ?? 'NA',
                    utm_content: params.get("utm_content") ?? 'NA',
                    utm_term: params.get("utm_term") ?? 'NA',
                });
            });
        } else {
            console.error("verifyOtp method not found!");
            setLoading(false); // Hide loader
        }
    };

    const handleSwitch = (data) => {
        handleView(data);
    };

    const handleSignup = async () => {
        setMessage(null);
        setError(null);
        if (fname.trim() === '') {
            setError("Please enter First Name");
            return;
        }
        const fnameRegex = /^[A-Za-z]+(?: [A-Za-z]+)?$/;
        if (fnameRegex.test(fname.trim()) === false) {
            setError("Please enter a valid First Name");
            return;
        }
        if (lname.trim() === '') {
            setError("Please enter Last Name");
            return;
        }
        if (specialty === '' || specialty === null) {
            setError("Please select Specialty");
            return;
        }

        // proceed with registration now.
        setSubmitDisabled(true);
        const params = new URLSearchParams(window.location.search);
        window.Moengage.track_event('TP_Submit_Clicked', {
            mobile: "91" + mobileNumber,
            utm_campaign: params.get("utm_campaign") ?? 'NA',
            utm_source: params.get("utm_source") ?? 'NA',
            utm_medium:params.get("utm_medium") ?? 'NA',
            utm_content: params.get("utm_content") ?? 'NA',
            utm_term: params.get("utm_term") ?? 'NA',
        });
        setLoading(true);
        localStorage.setItem('mo_mobile', "91" + mobileNumber);
        const userOnboard = await onboardUser({
            firstname: fname,
            lastname: lname,
            password: 'PMLITE@123',
            phone_number: mobileNumber,
            country_code: "+91",
            speciality: specialty,
            utm_campaign: params.get("utm_campaign") ?? 'NA',
            utm_source: params.get("utm_source") ?? 'NA',
            utm_medium:params.get("utm_medium") ?? 'NA',
            utm_content: params.get("utm_content") ?? 'NA',
            utm_term: params.get("utm_term") ?? 'NA',
        });

        // onboard on moengage if b2c_id is not null
        if(userOnboard?.data?.body?.b2c_id) {
            window.Moengage.add_first_name(fname);
            window.Moengage.add_last_name(lname);
            window.Moengage.add_mobile("+91" + mobileNumber);
            window.Moengage.add_user_name("Dr. " + fname + " " + lname); // Full name for user
            window.Moengage?.add_unique_user_id?.(userOnboard?.data?.body?.b2c_id);
            const params = new URLSearchParams(window.location.search);
            window.Moengage.track_event('TP_Signup_Success', {
                first_name: fname,
                last_name: lname,
                mobile: "91" + mobileNumber,
                country_code: "+91",
                country: "India",
                utm_campaign: params.get("utm_campaign") ?? 'NA',
                utm_source: params.get("utm_source") ?? 'NA',
                utm_medium: params.get("utm_medium") ?? 'NA',
                utm_content: params.get("utm_content") ?? 'NA',
                utm_term: params.get("utm_term") ?? 'NA',
                speciality: specialty,
                signup_at: new Date()
            });
        }

        if (userOnboard?.data?.body?.pm_id != null && userOnboard?.data?.body?.sso_url !== "") {

            // already exists on practice as an assistant doctor
            window.location.href = userOnboard?.data?.body?.sso_url + "&device_type=desktop";
        } else {
            setLoading(false);
            handleSwitch({view: 'clinic-setup'});
        }


    };

    useEffect(() => {
        // Reset OTP state when the mobile number changes
        setIsOtpSent(false);
        setCountdown(0);
        setMessage("");
        setError(null);
        clearInterval(timer); // Clear the timer on mobile number change
    }, [mobileNumber]);

    return (<div className="login-container background-image">
        {loading && (<div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgb(194 194 194 / 70%)", // backdropFilter: "blur(8px)", // Blur effect
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
        >
            <Spin size="large"/>
        </div>)}
        <div className="login-card">
            <img
                src="https://diginextloginprod.z10.web.core.windows.net/phone_number_login_ui/images/main-logo.png"
                alt="Company Logo"
                style={{width: "100%", marginBottom: "1rem"}}
            ></img>
            <h1>
                {reason === "forgotPassword" ? "Reset Password" : "New User Registration"}
            </h1>

            {/* Display success and error messages */}
            {message && <div className="color-blue" style={{fontSize: "14px"}}>{message}</div>}
            {error && <div className="color-red" style={{fontSize: "14px"}}>{error}</div>}

            <form>
                <label htmlFor="mobileNumber">Mobile Number *</label>
                <input
                    type="text"
                    id="mobile"
                    disabled={otpVerified}
                    placeholder="Enter your mobile number"
                    value={mobileNumber || ""}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="common-width"
                />
                {!otpVerified && <>
                {!otpRequested && <div id="captch-id"></div> }
                    <button
                        type="button"
                        className={`otp-button ${isButtonDisabled ? "disable" : ""} common-width`}
                        onClick={handleSendOtp}
                        disabled={isButtonDisabled}
                    >
                        {isOtpSent ? `Resend OTP ${countdown > 0 ? `(${countdown}s)` : ""}` : "Send OTP"}
                    </button>

                    {isOtpSent && (<>
                        <label htmlFor="otp">Enter OTP</label>
                        <input
                            type="text"
                            id="otp"
                            placeholder="Enter OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="common-width"
                        />
                        <br/>
                        <button
                            type="button"
                            className="login-button common-width"
                            onClick={handleVerifyOtp}
                        >
                            Verify OTP
                        </button>
                    </>)}
                </>}
                {otpVerified && <>
                    <label htmlFor="fname">First Name *</label>
                    <input
                        type="text"
                        id="fname"
                        value={fname}
                        placeholder="Enter your First Name"
                        onChange={(e) => setFname(e.target.value)}
                        className="common-width"
                    />

                    <label htmlFor="lname">Last Name *</label>
                    <input
                        type="text"
                        id="lname"
                        value={lname}
                        placeholder="Enter your Last Name"
                        onChange={(e) => setLname(e.target.value)}
                        className="common-width"
                    />

                    <label htmlFor="specialty">Speciality *</label>
                    <select className='common-width' onChange={(e) => setSpecialty(e.target.value)}>
                        <option value="" disabled selected>Select Speciality</option>
                        {specialities?.length > 0 && specialities?.map((item, index) => (
                            <option key={index + "item-spec"} value={item.code}>{item.displayName}</option>))}
                    </select>
                </>}
                <button
                    type="button"
                    className="register-button common-width"
                    onClick={() => handleSignup()}
                    disabled={submitDisabled}
                >
                    Register
                </button>
            </form>
            <br/>
            <p>Already having an account? <a href="/login">Sign in</a></p>
        </div>
    </div>);
};

export default Signup;
