import React, { useEffect, useState } from "react";
import { Button, Drawer, Modal, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import "./VoiceRxPromoModal.scss";

import { useSelector, useDispatch } from "react-redux";
import { services } from "../redux/doctorsSlice";
import { FREE, GB_ZYDUS_USER, GB_VOICE_RX_FREE, S_VOICE_RX } from "../utils/constants";
import { extendCredits } from "../redux/monetizationSlice";

import GenRxKnowMore from "./GenRxKnowMore";
import VideoModal from "../common/VideoModal";
import { isMobile, isTablet } from "react-device-detect";
import { getClinic, isVoiceRxFree, isZydus } from "../utils/utils";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { ASSETS } from "../assets";
const {
  coupon: couponSvg,
  starBgTop,
  starBgBottom,
  christmasTree,
  checkIconPurple: checkIcon,
  messagesSecondary: contactSupport,
  arrowRightPrimary: arrowRight,
} = ASSETS.images;

const voiceRxVideoLink = {
  link: "https://www.youtube.com/embed/vIeSUFJ7JgE",
  thumbnail: "https://i.ytimg.com/vi/vIeSUFJ7JgE/maxresdefault.jpg",
  title: "Ambient Voice Rx Tutorial",
};

const VoiceRxPromoModal = () => {
  const { servicesList, profile, userId } = useSelector(
    (state) => state.doctors
  );
  const dispatch = useDispatch();
  const { festival_extend = 0, plan_tier = "" } =
    servicesList?.find((e) => e.service_name === S_VOICE_RX) || {};
  const [popOverVideo, setPopOverVideo] = useState(false);
  const [shouldShowVideo, setShowVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const clinic = getClinic(profile?.hospital_data);
  const [isOpen, setIsOpen] = useState(false);
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);

  const moeData = {
    doctor_id: profile?.doctor_unique_id,
    doctor_name: profile?.um_name,
    doctor_specialty: profile?.dp_name,
    doctor_mobile_number: profile?.um_contact,
    user_id: userId,
    hm_id: clinic?.hm_id,
    clinic_name: clinic?.hm_name,
  };

  const showHideVideoListPopover = () => {
    setPopOverVideo(!popOverVideo);
  };

  useEffect(() => {
    if (profile?.b2c) {
      dispatch(services(profile?.b2c));
    }
  }, [dispatch, profile?.b2c]);

  useEffect(() => {
    if (
      servicesList?.length > 0 &&
      servicesList?.find((e) => e.service_name === S_VOICE_RX)
    ) {
      // 1. Maximum 1 time per session
      // 2. Maximum 2-3 sessions total (using 3 as max)
      // 3. Then stop forever

      const SESSION_KEY = "voiceRxPromoModal_shown_in_session";
      const TOTAL_SESSIONS_KEY = "voiceRxPromoModal_session_count";
      const MAX_SESSIONS = 3;

      // Check if already shown in this session
      const shownInSession = sessionStorage.getItem(SESSION_KEY) === "true";

      // Get total session count from localStorage
      const totalSessions = parseInt(
        localStorage.getItem(TOTAL_SESSIONS_KEY) || "0",
        10
      );

      // Check if we should show the modal
      const shouldShow =
        !festival_extend &&
        !isZydus() &&
        !isZydusUserAccessableFromGB &&
        plan_tier === FREE &&
        !isFreeVoiceRxUser &&
        !shownInSession && // Not shown in current session
        totalSessions < MAX_SESSIONS; // Not exceeded max sessions

      if (shouldShow) {
        // Mark as shown in current session
        sessionStorage.setItem(SESSION_KEY, "true");

        // Increment total session count
        const newSessionCount = totalSessions + 1;
        localStorage.setItem(TOTAL_SESSIONS_KEY, newSessionCount.toString());

        setIsOpen(true);
      }
    }
  }, [festival_extend, plan_tier, isFreeVoiceRxUser, servicesList]);

  const onClose = () => {
    setIsOpen(false);
  };

  const handleExtendCredits = async () => {
    // Track MoEngage event for claim button click
    if (window.Moengage) {
      window.Moengage.track_event("TP_VoiceRx_ClaimCredits", moeData);
    }

    setIsLoading(true);

    try {
      const result = await dispatch(
        extendCredits({ service_name: S_VOICE_RX })
      );
      if (result.meta.requestStatus === "fulfilled") {
        onClose();
        dispatch(services(profile?.b2c));
      }
    } catch (error) {
      console.log("error: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      closeIcon={null}
      footer={null}
      width={931}
      centered
      className="monetization-popup-modal monetization-popup-modal-responsive"
      style={{
        padding: 0,
        maxWidth: '100%',
      }}
    >
      <div
        className="monetization-popup-container"
        style={{
          "--star-bg-top": `url(${starBgTop})`,
          "--star-bg-bottom": `url(${starBgBottom})`,
          "--christmas-tree": `url(${christmasTree})`,
          "--coupon-svg": `url(${couponSvg})`,
        }}
      >
        {/* Christmas Tree Background */}
        <div className="monetization-popup-christmas-tree" />

        {/* Left Section - Promotional Content */}
        <div className="monetization-popup-left">
          <div className="monetization-popup-content-wrapper">
            <h1 className="monetization-popup-title">Try VoiceRx Now!</h1>
            <p className="monetization-popup-description">
              Auto captures your <strong>consult conversation</strong> & get{" "}
              <strong>structured Rx</strong> in seconds inside EMR.
            </p>

            {/* Offer Box */}
            <div className="monetization-popup-offer-box">
              <div className="monetization-popup-offer-content">
                <div className="monetization-popup-offer-header">
                  <span className="monetization-popup-offer-icon">🎁</span>
                  <span className="monetization-popup-offer-text">
                    Get <strong>25 Free VoiceRx</strong> credits
                  </span>
                </div>
                <p className="monetization-popup-offer-subtext">
                  Limited-time <strong>New Year</strong> Offer🎉
                </p>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="387"
                  height="2"
                  viewBox="0 0 387 2"
                  fill="none"
                >
                  <path
                    d="M1 1H385.48"
                    stroke="url(#paint0_linear_2509_22693)"
                    stroke-opacity="0.6"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="11 11"
                  />
                  <defs>
                    <linearGradient
                      id="paint0_linear_2509_22693"
                      x1="1"
                      y1="1.5"
                      x2="385.48"
                      y2="1.5"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stop-color="white" stop-opacity="0" />
                      <stop offset="0.5" stop-color="white" />
                      <stop offset="1" stop-color="white" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <button
                  className="monetization-popup-claim-button"
                  onClick={handleExtendCredits}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spin
                        indicator={
                          <LoadingOutlined
                            className="monetization-popup-loading-icon"
                            spin
                          />
                        }
                      />
                      <span className="monetization-popup-loading-text">
                        Claiming...
                      </span>
                    </>
                  ) : (
                    "Claim Free Credits"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Features and Information */}
        <div className="monetization-popup-right">
          {/* Why VoiceRx Section */}
          <div className="monetization-popup-features-section">
            <h2 className="monetization-popup-features-title">Why VoiceRx ?</h2>
            <div className="monetization-popup-features-list">
              <div className="monetization-popup-feature-item">
                <div className="monetization-popup-check-icon">
                  <img src={checkIcon} alt="Check" />
                </div>
                <span>
                  <strong>Zero typing</strong> during consult
                </span>
              </div>
              <div className="monetization-popup-feature-item">
                <div className="monetization-popup-check-icon">
                  <img src={checkIcon} alt="Check" />
                </div>
                <span>
                  <strong>Dictate</strong> & <strong>Conversational</strong>{" "}
                  Mode
                </span>
              </div>
              <div className="monetization-popup-feature-item">
                <div className="monetization-popup-check-icon">
                  <img src={checkIcon} alt="Check" />
                </div>
                <span>
                  <strong>Multi language</strong> support
                </span>
              </div>
            </div>
          </div>

          {/* How VoiceRx Works Section */}
          <div className="monetization-popup-video-section">
            <div
              className="monetization-popup-video-thumbnail"
              onClick={() => {
                // Track MoEngage event for video click
                if (window.Moengage) {
                  window.Moengage.track_event("TP_VoiceRx_VideoClick", moeData);
                }
                setShowVideo(true);
              }}
            ></div>
            {!(isMobile && !isTablet) && (
              <Button
                type="button"
                className="monetization-popup-know-more-link"
                onClick={(e) => {
                  e.preventDefault();
                  // Track MoEngage event for know more click
                  if (window.Moengage) {
                    window.Moengage.track_event(
                      "TP_VoiceRx_KnowMoreClick",
                      moeData
                    );
                  }
                  // Handle know more action
                  showHideVideoListPopover();
                }}
              >
                Know more about Voice Rx
                <img src={arrowRight} alt="Arrow Right" />
              </Button>
            )}
            <div className="monetization-popup-divider"></div>
          </div>

          {/* Contact Support Section */}
          <div className="monetization-popup-contact-section">
            <div className="monetization-popup-contact-header">
              <img src={contactSupport} alt="Contact Support" />
              <span>Contact Support:</span>
            </div>
            <div className="monetization-popup-contact-info">
              <a href="tel:+919974042363">+91-9974042363</a>
              <span>|</span>
              <a href="mailto:Support@tatvacare.in">Support@tatvacare.in</a>
            </div>
          </div>
        </div>
      </div>
      <Drawer
        placement="right"
        width={
          window.innerWidth ? Math.min(window.innerWidth * 0.8, 1200) : 1200
        }
        closeIcon={null}
        destroyOnClose
        maskClosable
        open={popOverVideo}
        onClose={showHideVideoListPopover}
        bodyStyle={{ padding: 0, height: "100%", overflow: "hidden" }}
      >
        <div style={{ height: "100%", overflow: "hidden" }}>
          <GenRxKnowMore handleGenRxKnowMore={showHideVideoListPopover} />
        </div>
      </Drawer>
      {shouldShowVideo && (
        <VideoModal
          videoLink={voiceRxVideoLink}
          isOpen={shouldShowVideo}
          onCancel={() => setShowVideo(false)}
        />
      )}
    </Modal>
  );
};

export default VoiceRxPromoModal;
