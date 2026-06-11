import React, { useState } from "react";
import { Button, Tabs } from "antd";

import VideoModal from "../../../common/VideoModal";
import ContactSupport from "./ContactSupport";
import { ASSETS } from "../../../assets";
const playIcons = ASSETS.images.tubeIcon;

const { TabPane } = Tabs;

const SmartSyncKnowMore = ({ handleSmartSyncKnowMore }) => {
  const [videoLink, setVideoLink] = useState(false);

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

  return (
    <div className="drawer-container">
      <div className="drawer-header">
        <div className="drawer-header-content border-bottom">
          <Button type="text"
            className="close-drawer-btn"
            onClick={handleSmartSyncKnowMore}>
            <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
          </Button>
          <div className="drawer-title">Smart Sync</div>
        </div>

        <div className="drawer-tabs">
          <Tabs defaultActiveKey="1" onChange={(key) => scrollToSection(key)}>
            <TabPane tab="Basic Info" key="basicInfo" />
            <TabPane tab="How it works" key="howItWorks" />
            <TabPane tab="Contact Support" key="contactSupport" />
          </Tabs>
        </div>
      </div>

      <div className="px-4 overflow-y-auto">

        <div id="basicInfo" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">Basic Info</span>
          <div className="fw-semibold fs-20 text-black mb-3">
            What is Smart Sync?
          </div>
          <div className="rounded-4 p-4" style={{ background: '#A461D81A' }}>
            <span className="fw-semibold">SmartSync</span> brings simplicity to prescription writing like never before. Write naturally using the Smart SyncPad, and your prescriptions are captured and stored in real-time with zero friction. With our Computer Vision AI, seamlessly convert handwritten Rx into structured digital prescriptions.
          </div>
        </div>

        <div id="howItWorks" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">How it works</span>
          <div className="fw-semibold fs-20 text-black mb-2">How Does Smart Sync Work?</div>
          <div className="fs-12-1 mb-2">Please watch this video to know how Smart Sync works👇</div>
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
              setVideoLink(true)
            }}
          >
            <img width={55} height={55} src={playIcons} />
          </div>
        </div>

        <ContactSupport />
      </div>

      {videoLink && (
        <VideoModal
          videoLink={video_link}
          onCancel={() => setVideoLink(false)}
        />
      )}
    </div >
  );
};

export default React.memo(SmartSyncKnowMore);
