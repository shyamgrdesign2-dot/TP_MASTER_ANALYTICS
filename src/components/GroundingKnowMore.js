import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button, Tabs } from "antd";

import VideoModal from "../common/VideoModal";
import { S_DDX } from "../utils/constants";
import FreeTrialButton from "../pages/monetization/components/FreeTrialButton";
import { ASSETS } from "../assets";
const {
  intersect,
  tubeIcon: playIcons,
  grow: growIcon,
  accuracy: accuracyIcon,
  healthCare: healthIcon,
} = ASSETS.images;

const { TabPane } = Tabs;

const GroundingKnowMore = ({ handleGroundingKnowMore }) => {
  const [shouldShowVideo, setShowVideo] = useState(false);
  const [activeKey, setActiveKey] = useState("basicInfo");
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen(!isSubModalOpen);
  }, [isSubModalOpen]);

  const sectionsRef = useRef({
    basicInfo: null,
    digitisationProcess: null,
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
              onClick={handleGroundingKnowMore}
            >
              <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
            </Button>
            <div className="drawer-title">Zydus Data Engine</div>
          </div>
          <FreeTrialButton title={S_DDX} showHideSubModal={showHideSubModal} />
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          <Tabs activeKey={activeKey} onChange={scrollToSection}>
            <TabPane tab="Basic Info" key="basicInfo" />
            <TabPane tab="How it works" key="digitisationProcess" />
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
            What is Zydus Data Engine
          </div>
          <div className="know-more-section-content basic-info-section align-items-flex-start">
            <img src={intersect} alt="intersect" width={72} height={72} />
            <div>
              <div>
                With a curated list of{" "}
                <span className="semi-bold-text">medicines</span> and{" "}
                <span className="semi-bold-text">lab tests</span>
                from the{" "}
                <span className="semi-bold-text">Zydus Data Engine</span>, our
                AI adapts to your prescribing style, surfacing the most
                <span className="semi-bold-text">
                  relevant suggestions
                </span>{" "}
                while you prescribe, and helps to
              </div>
              <div className="d-flex align-items-center gap-3 mt-3">
                <div
                  className="d-flex align-items-center gap-1 p-2 rounded-20px"
                  style={{ background: "rgba(220, 186, 246, 0.4)" }}
                >
                  <img src={healthIcon} alt="health-icon" />
                  Boosting Patient Fulfilment
                  <img src={growIcon} alt="grow-icon" />
                </div>
                <div
                  className="d-flex align-items-center gap-1 p-2 rounded-20px"
                  style={{ background: "rgba(220, 186, 246, 0.4)" }}
                >
                  <img src={accuracyIcon} alt="accuracy-icon" />
                  Improve Rx Accuracy by{" "}
                  <span className="semi-bold-text">80%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="video-section">
          <span
            id="digitisationProcess"
            ref={(el) => (sectionsRef.current.digitisationProcess = el)}
            className="section-side-header"
          >
            How it works
          </span>
          <div className="know-more-section-tilte">
            How Does Zydus Data Engine Works?
          </div>
          <div className="know-more-section-content">
            <div className="instruction-cvt-tutorial">
              Please watch this video to know how AI Data Engine works👇
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

export default React.memo(GroundingKnowMore);
