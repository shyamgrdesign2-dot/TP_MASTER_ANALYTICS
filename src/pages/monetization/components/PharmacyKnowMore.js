import React, { useCallback, useState } from "react";
import { Button, Tabs } from "antd";

import VideoModal from "../../../common/VideoModal";
import ContactSupport from "./ContactSupport";
import ExpiredText from "./ExpiredText";
import { S_PHARMACY } from "../../../utils/constants";
import FreeTrialButton from "./FreeTrialButton";
import ExpiredSubModal from "./ExpiredSubModal";
import { ASSETS } from "../../../assets";
const playIcons = ASSETS.images.tubeIcon;

const { TabPane } = Tabs;

const PharmacyKnowMore = ({ handlePharmacyKnowMore, onRedirect }) => {
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
    link: "https://www.youtube.com/embed//UgeyXlHItXI",
    thumbnail: "https://i.ytimg.com/vi/UgeyXlHItXI/maxresdefault.jpg",
  };

  return (
    <div className="drawer-container">
      <div className="drawer-header">
        <div className="drawer-header-content justify-content-between border-bottom">
          <div className="d-flex align-items-center">
            <Button type="text"
              className="close-drawer-btn"
              onClick={handlePharmacyKnowMore}>
              <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
            </Button>
            <div className="drawer-title">Pharmacy Management</div>
          </div>
          <FreeTrialButton title={S_PHARMACY} showHideSubModal={showHideSubModal} />
        </div>

        <div className="drawer-tabs">
          <Tabs defaultActiveKey="1" onChange={(key) => scrollToSection(key)}>
            <TabPane tab="Basic Info" key="basicInfo" />
            {/* <TabPane tab="How it works" key="howItWorks" /> */}
            <TabPane tab="Contact Support" key="contactSupport" />
          </Tabs>
        </div>
      </div>

      <div className="px-4 overflow-y-auto h-100">

        <div id="basicInfo" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">Basic Info</span>
          <div className="fw-semibold fs-20 text-black mb-3">
            What is Pharmacy Management?
          </div>
          <div className="rounded-4 p-4" style={{ background: '#A461D81A' }}>
            <span className="fw-semibold">Pharmacy Management</span> makes it easy to manage purchases, sales, stock, and master data in one place. Track invoices, returns, and analytics in real-time. Optimize operations with complete visibility across the purchase-to-sale workflow. Powerful reporting ensures you're always audit-ready.
          </div>
        </div>

        {/* <div id="howItWorks" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">How it works</span>
          <div className="fw-semibold fs-20 text-black mb-2">How Does Pharmacy Management Work?</div>
          <div className="fs-12-1 mb-2">Please watch this video to know how Pharmacy Management works👇</div>
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
        </div> */}

        <ContactSupport />
      </div>

      <ExpiredText title={S_PHARMACY} onRedirect={onRedirect} />

      <ExpiredSubModal
        title={S_PHARMACY}
        isSubModalOpen={isSubModalOpen}
        showHideSubModal={showHideSubModal} />

      {videoLink && (
        <VideoModal
          videoLink={video_link}
          onCancel={() => setVideoLink(false)}
        />
      )}
    </div>
  );
};

export default React.memo(PharmacyKnowMore);
