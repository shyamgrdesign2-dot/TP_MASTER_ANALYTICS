import React, { useCallback, useState } from "react";
import { Button, Tabs } from "antd";

import VideoModal from "../../../common/VideoModal";
import ExpiredText from "./ExpiredText";
import { S_BILLING } from "../../../utils/constants";
import ContactSupport from "./ContactSupport";
import FreeTrialButton from "./FreeTrialButton";
import ExpiredSubModal from "./ExpiredSubModal";
import { ASSETS } from "../../../assets";
const {
  tubeIcon: playIcons,
  coinSmRed,
} = ASSETS.images;

const { TabPane } = Tabs;

const BillingKnowMore = ({ handleBillingKnowMore }) => {
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
    link: "https://www.youtube.com/embed/luR2CgP9dBs",
    thumbnail: "https://img.youtube.com/vi/luR2CgP9dBs/hqdefault.jpg",
  };

  return (
    <div className="drawer-container">
      <div className="drawer-header">
        <div className="drawer-header-content justify-content-between border-bottom">
          <div className="d-flex align-items-center">
            <Button type="text"
              className="close-drawer-btn"
              onClick={handleBillingKnowMore}>
              <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
            </Button>
            <div className="drawer-title">OPD Billing</div>
          </div>
          <FreeTrialButton title={S_BILLING} showHideSubModal={showHideSubModal} />
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
            What is OPD Billing?
          </div>
          <div className="rounded-4 p-4" style={{ background: '#A461D81A' }}>
            The <span className="fw-semibold">OPD Billing</span> Module is a streamlined solution for clinics and hospitals to manage billing efficiently. It allows users to generate bills for custom services with features like GST calculation, discounts, multiple payment modes (cash, UPI, card etc), and partial payments. The module also supports customizable letterheads, digital signatures, and patient billing history for better financial tracking and documentation.
          </div>
        </div>

        <div id="howItWorks" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">How it works</span>
          <div className="fw-semibold fs-20 text-black mb-2">How Does OPD Billing Work?</div>
          <div className="fs-12-1 mb-2">Please watch this video to know how OPD billing works👇</div>
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

      <ExpiredText title={S_BILLING} />
      
      <ExpiredSubModal
        title={S_BILLING}
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

export default React.memo(BillingKnowMore);
