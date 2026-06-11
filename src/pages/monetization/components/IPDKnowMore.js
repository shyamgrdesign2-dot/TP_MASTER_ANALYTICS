import React, { useCallback, useState } from "react";
import { Button, Tabs } from "antd";

import VideoModal from "../../../common/VideoModal";
import ContactSupport from "./ContactSupport";
import ExpiredText from "./ExpiredText";
import { S_IPD } from "../../../utils/constants";
import FreeTrialButton from "./FreeTrialButton";
import ExpiredSubModal from "./ExpiredSubModal";
import { ASSETS } from "../../../assets";
const {
  tubeIcon: playIcons,
  ipdThumbnail: ipd_thumbnail,
} = ASSETS.images;

const { TabPane } = Tabs;

const IPDKnowMore = ({ handleIPDKnowMore, onRedirect }) => {
  const [videoLink, setVideoLink] = useState(false);
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
    link: "https://www.youtube.com/embed/videoseries?list=PL_GFkMPa2dgUYEABb8iZpBYTCCevObOiQ",
    thumbnail: ipd_thumbnail,
  };

  return (
    <div className="drawer-container">
      <div className="drawer-header">
        <div className="drawer-header-content justify-content-between border-bottom">
          <div className="d-flex align-items-center">
            <Button type="text"
              className="close-drawer-btn"
              onClick={handleIPDKnowMore}>
              <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
            </Button>
            <div className="drawer-title">IPD Module</div>
          </div>
          <FreeTrialButton title={S_IPD} showHideSubModal={showHideSubModal} />
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
            What is IPD?
          </div>
          <div className="rounded-4 p-4" style={{ background: '#A461D81A' }}>
            <span className="fw-semibold">IPD Module</span> lets you seamlessly manage ATC wards, OT scheduling, pathology, and IPD billing. Centralised access ensures better care coordination across departments. Automate daily inpatient workflows and minimize manual entries. Built for hospitals focused on achieving high operational efficiency.
          </div>
        </div>

        <div id="howItWorks" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">How it works</span>
          <div className="fw-semibold fs-20 text-black mb-2">How Does IPD Module Work?</div>
          <div className="fs-12-1 mb-2">Please watch this video to know how Voice Rx works👇</div>
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

      <ExpiredText title={S_IPD} onRedirect={onRedirect} />
      
      <ExpiredSubModal
        title={S_IPD}
        isSubModalOpen={isSubModalOpen}
        showHideSubModal={showHideSubModal} />

      {videoLink && (
        <VideoModal
          videoLink={video_link}
          onCancel={() => setVideoLink(false)}
        />
      )}
    </div >
  );
};

export default React.memo(IPDKnowMore);
