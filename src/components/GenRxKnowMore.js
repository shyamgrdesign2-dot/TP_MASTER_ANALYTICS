import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, Spin, Tabs } from "antd";

import VideoModal from "../common/VideoModal";
import ExpiredText from "../pages/monetization/components/ExpiredText";
import ContactSupport from "../pages/monetization/components/ContactSupport";
import { GB_ZYDUS_USER, S_VOICE_RX } from "../utils/constants";
import FreeTrialButton from "../pages/monetization/components/FreeTrialButton";
import ExpiredSubModal from "../pages/monetization/components/ExpiredSubModal";
import "./GenRxKnowMore.scss";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { env } from "../EnvironmentConfig";
import { getTokenData } from "../utils/utils";
import { ASSETS } from "../assets";
const {
  genRxIcon,
  grow: growIcon,
  accuracy: accuracyIcon,
  healthCare: healthIcon,
  intersect,
  tubeIcon: playIcons,
} = ASSETS.images;

const GenRxTips = lazy(() => import("./GenRxTips"));

const { TabPane } = Tabs;

const GenRxKnowMore = ({ handleGenRxKnowMore }) => {
  const [shouldShowVideo, setShowVideo] = useState(false);
  const [activeKey, setActiveKey] = useState("basicGenRxInfo");
  const scrollContainerRef = useRef(null);
  const isScrollingProgrammatically = useRef(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const tokenData = getTokenData();
  const isGroundingAccessableForZydus =
    tokenData?.hospital_business_id == env.zydus_business_id &&
    isZydusUserAccessableFromGB;
  
  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen(!isSubModalOpen);
  }, [isSubModalOpen]);

  const sectionsRef = useRef({
    basicGenRxInfo: null,
    howGenRxWorks: null,
    genRxTips: null,
    contactSupport: null,
    aiDataEngine: null,
  });

  const videoLink = {
    link: "https://www.youtube.com/embed/vIeSUFJ7JgE",
    thumbnail: "https://i.ytimg.com/vi/vIeSUFJ7JgE/maxresdefault.jpg",
    title: "Ambient Voice Rx Tutorial",
  };

  const scrollToSection = (key) => {
    const section = sectionsRef.current[key];
    const scrollContainer = scrollContainerRef.current;
    if (!section || !scrollContainer) return;

    isScrollingProgrammatically.current = true;
    setActiveKey(key);

    // Robust offset calculation relative to the scroll container
    const sectionRect = section.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const currentScrollTop = scrollContainer.scrollTop || 0;
    const deltaTop = sectionRect.top - containerRect.top;
    const targetScroll = Math.max(0, currentScrollTop + deltaTop - 150);

    scrollContainer.scrollTo({ top: targetScroll, behavior: "smooth" });

    setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 600);
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let timeoutId = null;

    const updateActiveSection = () => {
      if (isScrollingProgrammatically.current) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const containerTop = containerRect.top;
      const containerBottom = containerRect.bottom;
      const containerHeight = containerRect.height;

      // Check if we're near the bottom
      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const isNearBottom = scrollTop + containerHeight >= scrollHeight - 50;

      let activeSection = null;
      let maxVisibleRatio = 0;

      Object.entries(sectionsRef.current).forEach(([key, element]) => {
        if (element) {
          const elementRect = element.getBoundingClientRect();

          const visibleTop = Math.max(elementRect.top, containerTop);
          const visibleBottom = Math.min(elementRect.bottom, containerBottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          const elementHeight = elementRect.height;
          const visibleRatio =
            elementHeight > 0 ? visibleHeight / elementHeight : 0;

          // Special handling for contact support when near bottom
          if (key === "contactSupport" && isNearBottom && visibleHeight > 0) {
            activeSection = key;
            return;
          }

          if (visibleRatio > maxVisibleRatio && visibleHeight > 0) {
            maxVisibleRatio = visibleRatio;
            activeSection = key;
          }
        }
      });

      if (activeSection && activeSection !== activeKey) {
        setActiveKey(activeSection);
      }
    };

    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(updateActiveSection, 100);
    };

    scrollContainer.addEventListener("scroll", handleScroll);

    // Initial check
    setTimeout(updateActiveSection, 200);

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeKey]);

  return (
    <Suspense
      fallback={
        <Spin className="d-flex justify-content-center align-items-center mt-5" />
      }
    >
      <div className="know-more-drawer-container">
        {/* Modal Header */}
        <div className="drawer-header">
          <div className="drawer-header-content justify-content-between border-bottom">
            <div className="d-flex align-items-center">
              <Button
                type="text"
                className="close-drawer-btn"
                onClick={handleGenRxKnowMore}
              >
                <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
              </Button>
              <div className="drawer-title">AI-Powered Voice Rx</div>
            </div>
            <FreeTrialButton
              title={S_VOICE_RX}
              showHideSubModal={showHideSubModal}
            />
          </div>

          {/* Tabs */}
          <div className="drawer-tabs">
            <Tabs
              activeKey={activeKey}
              onChange={(key) => scrollToSection(key)}
            >
              <TabPane tab="Basic Info" key="basicGenRxInfo" />
              <TabPane tab="How it works" key="howGenRxWorks" />
              {isGroundingAccessableForZydus && (
                <TabPane tab="AI Data Engine" key="aiDataEngine" />
              )}
              <TabPane tab="Tips for better Rx" key="genRxTips" />
              <TabPane tab="Contact Support" key="contactSupport" />
            </Tabs>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="drawer-scrollable-content" ref={scrollContainerRef}>
          <div className="section">
            <span
              id="basicGenRxInfo"
              ref={(el) => (sectionsRef.current.basicGenRxInfo = el)}
              className="section-side-header"
            >
              Basic Info
            </span>
            <div className="know-more-section-tilte">What is Voice Rx</div>
            <div className="know-more-section-content basic-info-section ">
              <img src={genRxIcon} alt="apex-AI" width={72} height={72} />
              <div>
                Voice Rx is an AI-powered tool designed to streamline the
                prescription-writing process by combining voice and typing
                inputs. It helps doctors generate structured prescriptions
                faster and more efficiently, reducing the time spent on
                administrative tasks.
              </div>
            </div>
          </div>

          <div className="video-section">
            <span
              id="howGenRxWorks"
              ref={(el) => (sectionsRef.current.howGenRxWorks = el)}
              className="section-side-header"
            >
              How it works
            </span>
            <div className="know-more-section-tilte">
              How Does Ambient Voice Rx Work?
            </div>
            <div className="know-more-section-content">
              <div className="instruction-cvt-tutorial">
                Please watch this video to know how Ambient Voice Rx Works👇
              </div>

              <div
                className="video-thumbnail-container"
                style={{
                  background: `url(${videoLink.thumbnail})`,
                  width: 447,
                  height: 272,
                  borderRadius: 24,
                  cursor: "pointer",
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                }}
                onClick={() => setShowVideo(true)}
              ></div>
            </div>
          </div>

          {isGroundingAccessableForZydus && (
            <div style={{ padding: "0 30px", width: "100%" }}>
              <span
                id="aiDataEngine"
                ref={(el) => (sectionsRef.current.aiDataEngine = el)}
                className="section-side-header"
              >
                AI Data Engine
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
                    <span className="semi-bold-text">Zydus Data Engine</span>,
                    our AI adapts to your prescribing style, surfacing the most
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
              {/* <div className="know-more-section-content">
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
                ></div>
              </div> */}
            </div>
          )}

          <div className="section">
            <span
              id="genRxTips"
              ref={(el) => (sectionsRef.current.genRxTips = el)}
              className="section-side-header"
            >
              Tips for Better Rx
            </span>
            <div className="know-more-section-tilte mb-3">
              Tips to dictate/write an Rx for better Rx Digitisation
            </div>
            <GenRxTips isKnowMore />
          </div>

          <div className="section section--contact-after-tips">
            <ContactSupport refs={sectionsRef} />
            <div
              style={{
                padding: "40px 0 80px 0",
                textAlign: "center",
                fontSize: "12px",
              }}
              className="disclaimer-txt"
            >
              <b>Disclaimer</b>: These results are generated by AI. Please
              double-check all details to ensure they are correct and complete.
            </div>
          </div>
        </div>

        <ExpiredText title={S_VOICE_RX} />

        <ExpiredSubModal
          title={S_VOICE_RX}
          isSubModalOpen={isSubModalOpen}
          showHideSubModal={showHideSubModal}
        />

        {shouldShowVideo && (
          <VideoModal
            videoLink={videoLink}
            isOpen={shouldShowVideo}
            onCancel={() => setShowVideo(false)}
          />
        )}
      </div>
    </Suspense>
  );
};

export default React.memo(GenRxKnowMore);
