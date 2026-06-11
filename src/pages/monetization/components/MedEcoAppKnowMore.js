import React, { useState } from "react";
import { Button, Tabs } from "antd";
import { QRCodeSVG } from 'qrcode.react';

import VideoModal from "../../../common/VideoModal";
import ContactSupport from "./ContactSupport";
import { ASSETS } from "../../../assets";
import config from "../../../config";
const {
  tubeIcon: playIcons,
  medcoIcon,
} = ASSETS.images;

const { TabPane } = Tabs;

const MedEcoAppKnowMore = ({ handleMedEcoKnowMore }) => {
  const [videoLink, setVideoLink] = useState(false);
  const medecoWebviewUrl = config.MEDECO_WEBVIEW_URL;

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
            onClick={handleMedEcoKnowMore}>
            <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
          </Button>
          <div className="drawer-title">MedEco Mobile App</div>
        </div>

        <div className="drawer-tabs">
          <Tabs defaultActiveKey="1" onChange={(key) => scrollToSection(key)}>
            <TabPane tab="Basic Info" key="basicInfo" />
            <TabPane tab="Get MedEco App" key="getMedEcoApp" />
            <TabPane tab="How it works" key="howItWorks" />
            <TabPane tab="Contact Support" key="contactSupport" />
          </Tabs>
        </div>
      </div>

      <div className="px-4 overflow-y-auto">

        <div id="basicInfo" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">Basic Info</span>
          <div className="fw-semibold fs-20 text-black mb-3">
            What is MedEco App?
          </div>
          <div className="rounded-4 p-4" style={{ background: '#A461D81A' }}>
            <span className="fw-semibold">MedEco</span> Offer value-added services to doctors, improving their clinical practices, patient management,  access to the latest information, networking and increase their earnings.
          </div>
        </div>

        <div id="getMedEcoApp" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">Get MedEco App</span>
          <div className="fw-semibold fs-20 text-black mb-3">Scan the Below QR to Download the MedEco App</div>
          <QRCodeSVG className="rounded-3 my-1" value={medecoWebviewUrl} size={150}
            // imageSettings={{
            //   src: medcoIcon,
            //   x: undefined,
            //   y: undefined,
            //   height: 26,
            //   width: 26,
            //   excavate: true
            // }}
          />
        </div>

        <div id="howItWorks" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">How it works</span>
          <div className="fw-semibold fs-20 text-black mb-2">How Does MedEco App Work?</div>
          <div className="fs-12-1 mb-2">Please watch this video to know how MedEco works👇</div>
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

export default React.memo(MedEcoAppKnowMore);
