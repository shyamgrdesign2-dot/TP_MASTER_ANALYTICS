import React, { useEffect, useRef, useState } from "react";
import { Button, Tabs } from "antd";

import { Col, Row } from "react-bootstrap";
import VideoModal from "../../../../common/VideoModal";
import { ASSETS } from "../../../../assets";
const {
  aaWtsAp: wtsApIcon,
  aaGoogleMybusiness: googleBusinessIcon,
  aaSmsCampaign: smsCampaignIcon,
  aaMicrosite: micrositeIcon,
  aaFile: fileIcon,
  tubeIcon: playIcons,
  sms: SMS,
} = ASSETS.images;

const { TabPane } = Tabs;

const trustDetails = [
  {
    title: "WhatsApp",
    description:
      "Send this appointment booking link directly to patients via individual WhatsApp chats, or use the Bulk SMS feature to reach all patients at once.",
    icon: wtsApIcon,
  },
  {
    title: "Google My Business",
    description:
      "Add your booking link to your clinic's GMB profile. This ensures that patients searching you on Google Maps or Search can book directly from there.",
    icon: googleBusinessIcon,
  },
  {
    title: "SMS Campaigns",
    description:
      "You can use the in-built SMS module to notify patients with ready-made templates. Great for appointment reminders or promoting new features.",
    icon: smsCampaignIcon,
  },
  {
    title: "TatvaCare Microsite",
    description:
      "If you have a created microsite , this booking flow is already integrated in it. Just share your microsite link with patients via any channel.",
    icon: micrositeIcon,
  },
  {
    title: "Posters or Flyers",
    description:
      "You can generate a QR code for this link and place it in your clinic reception. Patients can scan and book without assistance.",
    icon: fileIcon,
  },
];

const BookingLinkKnowMore = ({ handleDDxKnowMore }) => {
  const [shouldShowVideo, setShowVideo] = useState(false);
  const [activeKey, setActiveKey] = useState("basicInfo");

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
          <div className="drawer-title">How to Share Your Booking Link</div>
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          <Tabs activeKey={activeKey} onChange={scrollToSection}>
            <TabPane tab="Basic Info" key="basicInfo" />
            <TabPane tab="How to Share" key="trust" />
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
            Why Distribution Matters?
          </div>
          <div className="know-more-section-content basic-info-section ">
            <div>
              Your <span className="fw-semibold"> AI Receptionist </span> is
              powerful—but only if patients see it. Sharing your booking link
              helps patients access{" "}
              <span className="fw-semibold">appointment booking</span> and{" "}
              <span className="fw-semibold">symptom submission</span> anytime,
              without calling the clinic. To ensure patients use your assistant,
              you need to actively distribute this link through{" "}
              <span className="fw-semibold">common digital touch points</span>{" "}
              they already trust.
            </div>
          </div>
        </div>

        <div className="section" style={{ minHeight: "auto" }}>
          <span
            id="trust"
            ref={(el) => (sectionsRef.current.trust = el)}
            className="section-side-header"
          >
            How to Share
          </span>
          <div className="know-more-section-tilte">
            How & Where to Share the Link?
          </div>
          <div className="know-more-section-content d-flex">
            <Row md={3} lg={2} className="gy-4 w-100">
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
                        style={{ paddingTop: 3}}
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
          <div className="video-section" style={{ marginLeft: "-30px" }}>
            <div className="know-more-section-content">
              <div className="instruction-cvt-tutorial">
                Please watch the video below to see how & where to share the
                link
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
        </div>

        <div className="section" style={{ marginTop: "-4rem" }}>
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

export default React.memo(BookingLinkKnowMore);
