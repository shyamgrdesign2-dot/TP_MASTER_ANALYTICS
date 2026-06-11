import React, { useEffect, useRef, useState } from "react";
import { Button, Divider, Tabs } from "antd";
import { isMobile, isTablet } from "react-device-detect";

import VideoModal from "../../../../common/VideoModal";
import { S_RECEPTIONIST_AGENT, S_TATVA_PRACTICE } from "../../../../utils/constants";
import { useNavigate } from "react-router-dom";

import { getClinic, getClinicName, getDeviceSdkData, getTokenData } from "../../../../utils/utils";
import { openModal } from "../../../../redux/doctorModalSlice";
import { useDispatch, useSelector } from "react-redux";
import { getDecodedToken } from "../../../../utils/localStorage";
import { ASSETS } from "../../../../assets";
const {
  tubeIcon: playIcons,
  sms: SMS,
} = ASSETS.images;

const { TabPane } = Tabs;

const ReceptionistKnowMore = ({ handleDDxKnowMore }) => {
  const [shouldShowVideo, setShowVideo] = useState(false);
  const [activeKey, setActiveKey] = useState("basicInfo");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.doctors);
  const decodedToken = getDecodedToken();
  const clinic = getClinic(profile?.hospital_data);

  const sectionsRef = useRef({
    basicInfo: null,
    trust: null,
    digitisationProcess: null,
    tips: null,
  });

  const videoLink = {
    link: "https://www.youtube.com/embed/mAZ7Sa86PnQ",
    thumbnail: "https://i.ytimg.com/vi/mAZ7Sa86PnQ/hqdefault.jpg",
  };

  const scrollToSection = (key) => {
    const section = sectionsRef.current[key];
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let closestSection = null;
        let minDistance = Number.MAX_VALUE;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const distance = Math.abs(entry.boundingClientRect.top); // Distance from the top of the viewport
            if (distance < minDistance) {
              minDistance = distance;
              closestSection = entry.target.id; // Update the closest section
            }
          }
        });

        if (closestSection) {
          setActiveKey(closestSection); // Update the active key
        }
      },
      {
        root: null, // Default is the viewport
        threshold: 0, // Trigger as soon as the section starts intersecting
        rootMargin: `0px 0px ${
          activeKey === "basicInfo" || activeKey === "digitisationProcess"
            ? "20%"
            : "-20%"
        } 0px`, // Focus on sections near the top of the viewport
      }
    );

    // Observe all sections
    Object.values(sectionsRef.current).forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      // Cleanup observer
      Object.values(sectionsRef.current).forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);

  const clickRequestCallback = async () => {
    dispatch(openModal(S_TATVA_PRACTICE))
    // let sendData = {
    //     mbl_no: profile?.um_contact,
    //     is_pm_renew_requested: true,
    //     service_name: S_TATVA_PRACTICE
    // }
    // const action = await dispatch(interest(sendData));
    // if (action.meta.requestStatus === "fulfilled") {
    //     errorMessage(action.payload.message)
    // }
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData(); 
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_Monetization_RequestACallback", {
        doctor_name: profile?.um_name,
        doctor_number: profile?.um_contact,
        doctor_unique_id: profile?.doctor_unique_id,
        doctor_specialty: profile?.dp_name,
        clinic_id: tokenData?.clinic_id,
        um_id: tokenData?.user_id,
        clinic_Name: clinic_name,
        former_page: S_TATVA_PRACTICE,
        ...deviceSdkData,
    });
  }

  return (
    <div className="drawer-container">
      {/* Modal Header */}
      <div className="drawer-header">
        <div className="drawer-header-content border-bottom">
          <Button
            type="text"
            className="close-drawer-btn"
            onClick={handleDDxKnowMore}
          >
            <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
          </Button>
          <div className="drawer-title">AI Receptionist</div>
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          <Tabs activeKey={activeKey} onChange={scrollToSection}>
            <TabPane tab="Basic Info" key="basicInfo" />
            <TabPane tab="How it works" key="trust" />
            <TabPane tab="See How Patients Book" key="digitisationProcess" />
            <TabPane tab="Contact Support" key="tips" />
          </Tabs>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="drawer-scrollable-content">
        <div className="section">
          <span
            id="basicInfo"
            ref={(el) => (sectionsRef.current.basicInfo = el)}
            className="section-side-header"
          >
            Basic Info
          </span>
          <div className="know-more-section-tilte">
            What is AI Receptionist?
          </div>
          <div className="know-more-section-content basic-info-section ">
            <div>
              <span className="fw-semibold">AI Receptionist</span> is your
              clinic’s digital front desk. It automatically handles patient{" "}
              <span className="fw-semibold">appointment bookings</span> and{" "}
              <span className="fw-semibold">collects symptoms</span>{" "}
              online—without manual intervention. Patients can easily schedule
              appointments and share their symptoms anytime, improving clinic
              efficiency and reducing phone calls.
            </div>
          </div>
        </div>

        <div className="video-section">
          <span
            id="trust"
            ref={(el) => (sectionsRef.current.trust = el)}
            className="section-side-header"
          >
            How it works
          </span>
          <div className="know-more-section-tilte">
            How Does AI Receptionist Works?
          </div>
          <div className="know-more-section-content">
            <div className="instruction-cvt-tutorial">
              Please watch the video below to see how the AI Receptionist works
              👇
            </div>

            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                background: `url(${videoLink.thumbnail})`,
                width: 447,
                height: 272,
                borderRadius: 24,
                cursor: "pointer",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
              onClick={() => setShowVideo(true)}
            >
              <img width={55} height={55} src={playIcons} alt="play-icon" />
            </div>
          </div>
        </div>

      {/* This code would be needed in the future for V1 Version Dev */} 
        {/* <div className="section" style={{ minHeight: 100 }}>
          <span
            id="digitisationProcess"
            ref={(el) => (sectionsRef.current.digitisationProcess = el)}
            className="section-side-header"
          >
            See How Patients Book
          </span>
          <div className="know-more-section-tilte">
            Want to see the patient experience? Click Below👇
          </div>

          <div className="know-more-section-content d-flex">
            <div
              className="benefits-info-card"
              style={{
                height: 62,
                // width: "100%",
                boxSizing: "border-box",
                textAlign: "left",
              }}
            >
              <div className="info-card-content">
                https://www.Tatvacare.in/doctor/Demo booking appointment
              </div>
            </div>
          </div>
        </div> */}

        <div className="section">
          <span
            id="tips"
            ref={(el) => (sectionsRef.current.tips = el)}
            className="section-side-header"
          >
            Contact Support
          </span>
          <div className="know-more-section-tilte">
            Need More Help? Reach Out to Our Support Team
          </div>
          <div className="know-more-section-content cvt-tips-content d-inline-flex align-items-center">
            <i className="icon-phone fs-18 me-2"></i>
            <a
              className="text-main fw-medium fs-16"
              href="tel:+91-9974042363"
              style={{textDecoration:"underline"}}
              // onClick={contactNumberandEmail}
            >
              +91-9974042363
            </a>{" "}
            <div className="mx-2">|</div>
            <img className="me-2" width={19} height={19} src={SMS} />
            <a
              className="text-main fw-medium fs-16"
              href="mailto:support@tatvacare.in"
              style={{textDecoration:"underline"}}
              // onClick={contactNumberandEmail}
            >
              Support@tatvacare.in
            </a>
          </div>
          {/* <Divider /> */}
        </div>
      </div>

      <div
        className="d-flex flex-column align-items-center justify-content-center p-4"
        style={{ boxShadow: "0px 0px 12px 0px rgba(0, 0, 0, 0.06)" }}
      >
        <span className="bdg-danger fs-18">Upgrade now to continue a hassle free experience!</span>
        <div className="d-flex gap-4 mt-20 w-100">
          <Button
            type="button"
            className="btn-41 btn ant-btn-text btn-input addMeasurementBtn w-100"
            onClick={() => {
              window.Moengage.track_event("TP_AG_AIR_ReqCallBack", {
                doctor_name: profile?.um_name,
                doctor_number: profile?.um_contact,
                doctor_unique_id: profile?.doctor_unique_id,
                doctor_specialty: profile?.dp_name,
                um_id: decodedToken?.user_id,
                clinic_name: clinic?.hm_name,
              });
              clickRequestCallback();
            }}
          >
            Request a call back
          </Button>
          {!(isMobile && !isTablet) && (
            <Button
              className="btn btn-primary3 btn-41 px-4 me-20 w-100"
              type="primary"
              onClick={() => {
                window.Moengage.track_event("TP_AG_GUA", {
                  doctor_name: profile?.um_name,
                  doctor_number: profile?.um_contact,
                  doctor_unique_id: profile?.doctor_unique_id,
                  doctor_specialty: profile?.dp_name,
                  um_id: decodedToken?.user_id,
                  clinic_name: clinic?.hm_name,
                });
                navigate('/get-unlimited-access', { state: { buyServiceName: S_RECEPTIONIST_AGENT } });
              }}
            >
              Get Unlimited Access
            </Button>
          )}
        </div>
      </div>
      {shouldShowVideo && (
        <VideoModal
          videoLink={videoLink}
          onCancel={() => setShowVideo(false)}
        />
      )}
    </div>
  );
};

export default React.memo(ReceptionistKnowMore);
