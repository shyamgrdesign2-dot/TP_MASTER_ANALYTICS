import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button, Tabs } from "antd";

import { Col, Row } from "react-bootstrap";
import VideoModal from "../common/VideoModal";
import ContactSupport from "../pages/monetization/components/ContactSupport";
import ExpiredText from "../pages/monetization/components/ExpiredText";
import { S_DDX } from "../utils/constants";
import FreeTrialButton from "../pages/monetization/components/FreeTrialButton";
import ExpiredSubModal from "../pages/monetization/components/ExpiredSubModal";
import { ASSETS } from "../assets";
const {
  apexai: apexAI,
  code: codeIcon,
  clinicalStudy: clinicalStudyIcon,
  compliant: compliantIcon,
  validateHeathcare: validateHealthcareIcon,
  tubeIcon: playIcons,
} = ASSETS.images;

const { TabPane } = Tabs;

const trustDetails = [
  {
    title: "Evidence-Based Algorithms",
    description:
      "Built on leading clinical guidelines such as ICD-10 and SNOMED CT to ensure reliable and accurate results",
    icon: codeIcon,
  },
  {
    title: "Validated by Healthcare Experts",
    description:
      "Developed and reviewed in collaboration with top physicians to ensure clinical relevance and safety.",
    icon: validateHealthcareIcon,
  },
  // {
  //   title: "HIPAA & GDPR Compliant",
  //   description:
  //     "Fully adheres to global healthcare data privacy standards, ensuring the safety and confidentiality of patient.",
  //   icon: compliantIcon,
  // },
  {
    title: "Backed by Clinical Studies",
    description:
      "Supported by peer-reviewed research to improve diagnostic accuracy and reduce time to treatment.",
    icon: clinicalStudyIcon,
  },
];

const DDxKnowMore = ({ handleDDxKnowMore }) => {
  const [shouldShowVideo, setShowVideo] = useState(false);
  const [activeKey, setActiveKey] = useState("basicInfo");
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen(!isSubModalOpen);
  }, [isSubModalOpen]);

  const sectionsRef = useRef({
    basicInfo: null,
    trust: null,
    digitisationProcess: null,
    tips: null,
    contactSupport: null,
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
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 3;
      let currentSection = "basicInfo";

      Object.entries(sectionsRef.current).forEach(([key, section]) => {
        if (section) {
          const { top } = section.getBoundingClientRect();
          const sectionTop = top + window.scrollY;
          if (scrollPosition >= sectionTop) {
            currentSection = key;
          }
        }
      });

      setActiveKey(currentSection);
    };

    // Add scroll event listener
    const scrollContainer = document.querySelector(
      ".drawer-scrollable-content"
    );
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    }

    // Initial check
    handleScroll();

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  return (
    <div className="drawer-container">
      {/* Modal Header */}
      <div className="drawer-header">
        <div className="drawer-header-content justify-content-between border-bottom">
          <div className="d-flex align-items-center">
            <Button
              type="text"
              className="close-drawer-btn"
              onClick={handleDDxKnowMore}
            >
              <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
            </Button>
            <div className="drawer-title">AI-Powered Differential Diagnosis</div>
          </div>
          <FreeTrialButton title={S_DDX} showHideSubModal={showHideSubModal} />
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          <Tabs activeKey={activeKey} onChange={scrollToSection}>
            <TabPane tab="Basic Info" key="basicInfo" />
            <TabPane tab="Trust Indicators" key="trust" />
            <TabPane tab="Diagnostic Process" key="digitisationProcess" />
            <TabPane tab="Tips" key="tips" />
            <TabPane tab="Contact Support" key="contactSupport" />
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
            What is Differential Diagnosis
          </div>
          <div className="know-more-section-content basic-info-section ">
            <img src={apexAI} alt="apex-AI" width={72} height={72} />
            <div>
              Our AI tool helps you generate possible diagnoses by analyzing
              patient symptoms, examinations, history, and clinical findings,
              <b> including past patient data </b> for more accurate results.
              This feature speeds up diagnosis and assists in better
              decision-making for patient care.
            </div>
          </div>
        </div>

        <div className="section" style={{ minHeight: 210 }}>
          <span
            id="trust"
            ref={(el) => (sectionsRef.current.trust = el)}
            className="section-side-header"
          >
            Trust Indicators
          </span>
          <div className="know-more-section-tilte">
            Why Trust Our AI-Powered Differential Diagnosis?
          </div>
          <div className="know-more-section-content d-flex">
            <Row md={3} lg={3} className="gy-4 w-100">
              {trustDetails.map((item, index) => (
                <Col key={index} className="gx-4 d-flex">
                  <div
                    className="benefits-info-card"
                    style={{
                      height: 180,
                      width: "100%",
                      boxSizing: "border-box",
                      textAlign: "left",
                    }}
                  >
                    <div className="info-card-header align-items-start">
                      <img
                        src={item.icon}
                        alt="codeIcon"
                        className="info-card-icons"
                        style={{ paddingTop: 5 }}
                      />
                      <div
                        className="info-card-title"
                        style={{ textAlign: "left" }}
                      >
                        {item.title}
                      </div>
                    </div>
                    <div className="info-card-content">{item.description}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        <div className="video-section">
          <span
            id="digitisationProcess"
            ref={(el) => (sectionsRef.current.digitisationProcess = el)}
            className="section-side-header"
          >
            Diagnostic Process
          </span>
          <div className="know-more-section-tilte">
            How Differential Diagnosis Works
          </div>
          <div className="know-more-section-content">
            <div className="instruction-cvt-tutorial">
              Please watch this video to see how Differential Diagnosis enhances
              clinical decision-making.👇
            </div>

            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                background: `url(${videoLink.thumbnail})`,
                width: 447,
                height: 252,
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

        <div className="section">
          <span
            id="tips"
            ref={(el) => (sectionsRef.current.tips = el)}
            className="section-side-header"
          >
            Tips
          </span>
          <div className="know-more-section-tilte">
            Tips to get the best results
          </div>
          <div className="know-more-section-content cvt-tips-content">
            <span style={{ fontWeight: "600" }}>Enter detailed Analysis: </span>
            The more detailed and structured the patient information you provide
            (such as symptoms, examinations, history, and medications), the
            better the accuracy of the differential diagnosis results.
          </div>
        </div>

        <div
          id="contactSupport"
          ref={(el) => (sectionsRef.current.contactSupport = el)}
          className="section"
        >
          <ContactSupport
            id="contactSupport"
            ref={(el) => (sectionsRef.current.contactSupport = el)}
          />
        </div>
        <div
          style={{ padding: "20px 0 60px 0", textAlign: "center" }}
          className="disclaimer-txt"
        >
          <b>Disclaimer</b>: These results are generated by AI and should be
          used as a guide, not the final source for patient treatment decisions.
        </div>
      </div>

      <ExpiredText title={S_DDX} />

      <ExpiredSubModal
        title={S_DDX}
        isSubModalOpen={isSubModalOpen}
        showHideSubModal={showHideSubModal} />

      {shouldShowVideo && (
        <VideoModal
          videoLink={videoLink}
          onCancel={() => setShowVideo(false)}
        />
      )}
    </div>
  );
};

export default React.memo(DDxKnowMore);
