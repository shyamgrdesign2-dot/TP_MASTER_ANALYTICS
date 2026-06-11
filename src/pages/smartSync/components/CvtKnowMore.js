import React, { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import "../smartSync.css";
import { Card, Button, Tabs } from "antd";

import LoopingVideo from "../../../components/common/LoopingVideo";
import VideoModal from "../../../common/VideoModal";
import ContactSupport from "../../monetization/components/ContactSupport";
import ExpiredText from "../../monetization/components/ExpiredText";
import { S_RX_DIGITIZATION } from "../../../utils/constants";
import { isZydus } from "../../../utils/utils";
import FreeTrialButton from "../../monetization/components/FreeTrialButton";
import ExpiredSubModal from "../../monetization/components/ExpiredSubModal";
import { ASSETS } from "../../../assets";
const knowMoreImage = ASSETS.images.websiteImages.knowMore;
const unstructuredRxImage = ASSETS.images.websiteImages.unstructuredRx;
const {
  dataInsight: dataInsightIcon,
  monetiseVen: monetiseIcon,
  loyality: loyalityIcon,
  tubeIcon: playIcons,
  redCross: redCrossIcon,
  greenRight: greenRightIcon,
  intersect,
  healthCare: healthIcon,
  grow: growIcon,
  accuracy: accuracyIcon,
  structuredrx_2: structuredRxWebm,
  structuredrx: structuredRxMp4,
} = ASSETS.images;

const { TabPane } = Tabs;

const CvtKnowMore = ({ handleCollapsed }) => {
  const [videoLink, setVideoLink] = useState(false);
  const { loading, videoList } = useSelector((state) => state.doctors);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen(!isSubModalOpen);
  }, [isSubModalOpen]);

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const video_link = {
    link: "https://www.youtube.com/embed//UgeyXlHItXI",
    thumbnail: "https://i.ytimg.com/vi/UgeyXlHItXI/maxresdefault.jpg",
  };
  console.log(isZydus,"isZydus")

  return (
    <div className="drawer-container">
      {/* Modal Header */}
      <div className="drawer-header">
        <div className="drawer-header-content justify-content-between border-bottom">
          <div className="d-flex align-items-center">
            <Button
              type="text"
              className="close-drawer-btn"
              onClick={() => handleCollapsed(5)}
            >
              <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
            </Button>
            <div className="drawer-title">AI-Powered Smart Rx Digitisation</div>
          </div>
          <FreeTrialButton
            title={S_RX_DIGITIZATION}
            showHideSubModal={showHideSubModal}
          />
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          <Tabs defaultActiveKey="1" onChange={(key) => scrollToSection(key)}>
            <TabPane tab="Basic Info" key="basicInfo" />
            <TabPane tab="Benefits" key="benefits" />
            <TabPane tab="Digitisation Process" key="digitisationProcess" />
            {isZydus() && (
              <TabPane tab="AI Data Engine" key="aiDataEngine" />
            )}
            <TabPane tab="Tips for Rx writing" key="tipsForRxWriting" />
            <TabPane tab="Contact Support" key="contactSupport" />
          </Tabs>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="drawer-scrollable-content pb-0">
        <div id="basicInfo" className="section">
          <span className="section-side-header">Basic Info</span>
          <div className="know-more-section-tilte">
            What is Smart Rx Digitisation?
          </div>
          <div className="know-more-section-content basic-info-section ">
            <div className="know-more-img-box">
              <img src={knowMoreImage}></img>
            </div>
            <div>
              Our AI engine seamlessly converts your handwritten prescriptions
              into a structured digital format within 30 seconds, streamlining
              your workflow and unlocking new possibilities to enhance patient
              care and efficiency
            </div>
          </div>
        </div>

        <div id="benefits" className="section">
          <span className="section-side-header">Benefits</span>
          <div className="know-more-section-tilte">
            Benefits of Digitising your Rx
          </div>
          <div className="know-more-section-content d-flex gap-4">
            <div className="benefits-info-card">
              <div className="info-card-header">
                <img
                  src={dataInsightIcon}
                  alt="dataInsightIcon"
                  className="info-card-icons"
                ></img>
                <div className="info-card-title">Get Data Insights</div>
              </div>
              <div className="info-card-content">
                In Future get access to anonymized data for research, tracking,
                and revenue sharing.
              </div>
            </div>
            <div className="benefits-info-card">
              <div className="info-card-header">
                <img
                  src={monetiseIcon}
                  alt="monetiseIcon"
                  className="info-card-icons"
                ></img>
                <div className="info-card-title">Monetise with DHIS</div>
              </div>
              <div className="info-card-content">
                In future earn additional revenue through government DHIS
                schemes by digitising Rx.
              </div>
            </div>
            <div className="benefits-info-card">
              <div className="info-card-header">
                <img
                  src={loyalityIcon}
                  alt="loyalityIcon"
                  className="info-card-icons"
                ></img>
                <div className="info-card-title">Boost Patient Loyalty</div>
              </div>
              <div className="info-card-content">
                Digital Rx enhance care beyond the clinic & boosting patient
                loyalty and satisfaction.
              </div>
            </div>
          </div>
        </div>

        <div id="digitisationProcess" className="video-section">
          <span className="section-side-header">Digitisation Process</span>
          <div className="know-more-section-tilte">
            How Smart Rx Digitisation Works?
          </div>
          <div className="know-more-section-content">
            <div className="instruction-cvt-tutorial">
              Please watch this video to know how Smart Rx Digitisation Works👇
            </div>
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                background: `url(${video_link?.thumbnail})`,
                width: 447,
                height: 250,
                borderRadius: 24,
                cursor: "pointer",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
              onClick={() => {
                setVideoLink(true);
              }}
            >
              <img width={55} height={55} src={playIcons} />
            </div>
          </div>
        </div>

        {isZydus() && (
          <div className="section" style={{ minHeight: "auto" }}>
            <span id="aiDataEngine" className="section-side-header">
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
            <div className="know-more-section-content">
              <div className="instruction-cvt-tutorial">
                Please watch this video to know how AI Data Engine works👇
              </div>

              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  background: `url(${video_link.thumbnail})`,
                  width: 447,
                  height: 252,
                  borderRadius: 24,
                  cursor: "pointer",
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
                onClick={() => setVideoLink(true)}
              >
                <img width={55} height={55} src={playIcons} alt="play-icon" />
              </div>
            </div>
          </div>
        )}

        <div
          id="tipsForRxWriting"
          className="section"
          style={{ minHeight: "auto" }}
        >
          <span className="section-side-header">Tips for Rx writting</span>
          <div className="know-more-section-tilte">
            Tips to write an Rx for better Rx Digitisation
          </div>
          <div className="know-more-section-content cvt-tips-content">
            <span style={{ fontWeight: "600" }}>Use Clear Headings:</span> When
            writing a Rx, organise it into sections with clear titles like
            'Medicine,' 'Symptoms,' 'Diagnosis' etc. Thishelps our system
            process the Rx more accurately, leading to better digitisation
            results.
          </div>
          <div className="tips-imgs-container">
            <div className="smartRx-cvt-img-container">
              <div className="d-flex gap-2 align-items-center">
                <img src={redCrossIcon} />
                <span>Unstructured</span>
              </div>
              <img src={unstructuredRxImage} className="cvt-tips-image" />
            </div>
            <div className="smartRx-cvt-img-container">
              <div className="d-flex gap-2 align-items-center">
                <img src={greenRightIcon} />
                <span>Well structured</span>
              </div>
              <LoopingVideo
                webm={structuredRxWebm}
                mp4={structuredRxMp4}
                className="cvt-tips-image"
                ariaLabel="Structured Rx"
              />
            </div>
          </div>
        </div>

        <div id="contactSupport" className="section d-flex align-items-start">
          <ContactSupport />
        </div>
      </div>

      <ExpiredText title={S_RX_DIGITIZATION} />

      <ExpiredSubModal
        title={S_RX_DIGITIZATION}
        isSubModalOpen={isSubModalOpen}
        showHideSubModal={showHideSubModal}
      />

      {videoLink && (
        <VideoModal
          videoLink={video_link}
          onCancel={() => setVideoLink(false)}
        />
      )}
    </div>
  );
};

export default React.memo(CvtKnowMore);
