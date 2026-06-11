import React, { useState } from "react";
import { Tabs } from "antd";

import VideoModal from "../../../common/VideoModal";
import { ASSETS } from "../../../assets";
const playIcons = ASSETS.images.tubeIcon;

const { TabPane } = Tabs;

const CustomSSknowMore = () => {
  const [showVideo, setShowVideo] = useState(false);

  const videoLink = {
    link: "https://www.youtube.com/embed/afrPzkTTl78",
    thumbnail: "https://i.ytimg.com/vi/afrPzkTTl78/hqdefault.jpg",
  };

  return (
    <div className="drawer-container">
      {/* Modal Header */}
      <div className="drawer-header">
        {/* Tabs */}
        <div className="drawer-tabs">
          <Tabs defaultActiveKey="basicInfo">
            <TabPane tab={<span style={{ fontWeight: 600 }}>Basic Info</span>} key="basicInfo" />
            <TabPane tab={<span style={{ fontWeight: 400 }}>How it works</span>} key="howItWorks" />
          </Tabs>
        </div>
      </div>
      {/* Scrollable Content */}
      <div className="drawer-scrollable-content">
        <div id="basicInfo" className="section">
          <span className="section-side-header">Basic Info</span>
          <div className="know-more-section-tilte">What is Custom Canvas?</div>
          <div className="know-more-section-content basic-info-section">
            <div>
              Our AI engine seamlessly converts your handwritten prescriptions into a structured digital format within 30 seconds, streamlining your workflow and unlocking new possibilities to enhance patient care and efficiency
            </div>
          </div>
        </div>
        <div id="howItWorks" className="section">
          <span className="section-side-header">How it works</span>
          <div className="know-more-section-tilte">How Custom Canvas Works?</div>
          <div className="know-more-section-content">
            <div className="instruction-cvt-tutorial">
              Please watch this video to know how Custom Canvas Works👇
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
      {showVideo && (
        <VideoModal
          videoLink={videoLink}
          onCancel={() => setShowVideo(false)}
        />
      )}
    </div>
  );
};

export default CustomSSknowMore;
