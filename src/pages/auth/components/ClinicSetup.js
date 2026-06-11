import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {setupClinic} from "../authService";
import "../auth.scss"; // Assuming the provided styles are in this CSS file
import {Button, Layout, Spin} from "antd";
import {Header} from "antd/es/layout/layout";

const ClinicSetup = ({ reason, handleView, number }) => {

    const [clinicName, setClinicName] = useState("");
    const [submitDisabled, setSubmitDisabled] = useState(false);
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
    }, []);

    const logoutUser = () => {
        window.Moengage.track_event('TP_Logout', {mobile: localStorage.getItem('mo_mobile') , utm_campaign, utm_content, utm_medium, utm_source})
        localStorage.removeItem('mo_mobile');
        window.location.href = "/login";
    }

    const handleSwitch = (data) => {
        handleView(data);
    };

    const handleClinicSetup = async () => {

        if (clinicName.trim() === "") {
            setError("Please provide Clinic Name");
            return;
        }else {
            setLoading(true);
            setSubmitDisabled(true);

            setError(null);
            const mbl_no = localStorage.getItem('mo_mobile');
            if (mbl_no != null && mbl_no !== "") {
                const response = await setupClinic({mblNo: mbl_no, clinicName: clinicName});
                if (response?.data?.ssoUrl !== "") {
                    window.Moengage.track_event("TP_Clinic_Setup_Success", {
                        mobile: mbl_no,
                        utm_campaign,
                        utm_content,
                        utm_medium,
                        utm_source,
                        clinicName: clinicName
                    });
                    localStorage.removeItem('mo_mobile');
                    window.location.href = response?.data?.ssoUrl + "&device_type=Desktop";
                } else {
                    setLoading(false);
                    setSubmitDisabled(false);
                    setError("OOPS! Some error occured during clinic setup!")
                }
            } else {
                handleSwitch({view: 'signup'});
            }
        }


    };


    return (
        <Layout>
            <Header style={{ position: 'fixed', zIndex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent linear-gradient(90deg, #4B4AD5 0%, #B122FF 100%) 0% 0% no-repeat padding-box', borderBottom: '1px solid rgb(255 255 255 / 29%)' }} className="clinic-header">
                {/* Logo */}
                <div style={{ color: '#fff !important', fontSize: '20px' }}>
                    <img style={{ height: '45px' }} src="https://health.tatvacare.in/TatvaPracticebyTatvaCareWhite.png" alt="" className="logo" />
                </div>

                {/* Logout Button */}
                <Button type="primary" onClick={() => logoutUser()} style={{ backgroundColor: 'rgb(255 255 255 / 20%)', fontWeight: 'normal', borderRadius: '20px' }}>
                    Logout
                </Button>
            </Header>
            <div className="login-container background-image">
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
                    <Spin size="large" />
                </div>)}


                <div className="login-card">
                    <img
                        src="https://diginextloginprod.z10.web.core.windows.net/phone_number_login_ui/images/main-logo.png"
                        alt="Company Logo"
                        style={{ width: "100%", marginBottom: "2rem" }}
                    ></img>
                    <h1>
                        {reason === "forgotPassword" ? "Reset Password" : "Setup your Clinic"}
                    </h1>
                    <div id="captch-id" style={{ display: "none" }}></div>
                    {/* Display success and error messages */}

                    <span style={{ marginTop: '2rem' }}></span>
                    {message && <div className="color-blue" style={{ fontSize: "14px" }}>{message}</div>}
                    {error && <div className="color-red" style={{ fontSize: "14px" }}>{error}</div>}

                    <form >
                        <label htmlFor="clinicName">Clinic Name *</label>
                        <input
                            type="text"
                            id="clinicName"
                            placeholder="Enter your clinic name"
                            value={clinicName || ""}
                            onChange={(e) => setClinicName(e.target.value)}
                            className="common-width"
                        />

                        <button
                            type="button"
                            style={{ marginTop: '2rem' }}
                            className="register-button common-width"
                            onClick={() => handleClinicSetup()}
                            disabled={submitDisabled}
                        >
                            Submit
                        </button>
                    </form>
                    <br />
                </div>
            </div>
        </Layout>
    );

}

export default ClinicSetup;
