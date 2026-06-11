import React, { useState } from "react";
import { Modal, useMediaQuery } from "antd";

import { isMobileOnly, isMobile, isTablet } from "react-device-detect";
import "./WelcomeModal.scss";

import { CloseOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { ASSETS } from "../../../assets";
import config from "../../../config";
const {
  welcomDoc: welcomdoc,
  suportIcon: suporticon,
} = ASSETS.images;
const copyIcon = ASSETS.images.onboardPageIcons.copy;
const shareIcon = ASSETS.images.onboardPageIcons.share;
const desktopIcon = ASSETS.images.onboardPageIcons.monitorMobile;

const VideoCarousel = () => {
  const [currentVideo, setCurrentVideo] = useState(0);

  const videos = [
    {
      id: 1,
      url: "https://www.youtube.com/embed/ENARZJhE0iI?si=1TPlavqb5nvR0vx3",
      title: "Starting Walk-in Consultation with a New Patient",
      tag: "start consultation"
    },
    // {
    //   id: 2,
    //   url: "https://youtu.be/G9Ai6DtlhSk",
    //   title: "Starting Walk-in Consultation with a New Patient",
    //   tag: "Smart Sync"
    // },
    // {
    //   id: 3,
    //   url: "https://youtu.be/OJQMLAidx9o",
    //   title: "Starting Walk-in Consultation with a New Patient",
    //   tag: "Voice Rx"
    // },
  ];

  return (
    <div className="video-section">
      <iframe
        width="500"
        height={isMobileOnly ? "200" : "350"}
        src={videos[currentVideo].url}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      {videos.length > 1 && (
        <div className="video-dots">
          {videos.map((_, index) => (
            <span
              key={index}
              className={`dot ${currentVideo === index ? "active" : ""}`}
              onClick={() => setCurrentVideo(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const WelcomeModal = ({ modalOpen, setModalOpen, profile }) => {
  const doctorPortalUrl = config.doctor_portal_url;

  return (
    <div className="welcome-modals-wrapper">
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        centered
        className="modal-onboarding"
        closeIcon={!isMobileOnly && <CloseOutlined />}
        maskClosable={!isMobileOnly}
      >
        <div style={{ padding: '0rem 2rem' }}>
          <img src={welcomdoc} alt="Welcome" className="welcome-icon" />
          <div className="modal-content-container">
            <div className="left-section">
              <h2 className="doctor-name">
                Dr. {profile?.um_name?.split(/\s+/)
                  .filter(word => !["Dr", "Dr."].includes(word.toLowerCase()))
                  .join(" ")},
              </h2>
              <h1 className="welcome-title">Welcome to TatvaPractice</h1>

              <div className="support-box">
                <img src={suporticon} alt="Support" className="support-icon" />
                <h3>We will connect with you soon</h3>
                <p>
                  We will contact you within 24 hours to assist you in setting up your digital clinic and provide a walkthrough for writing prescription digitally.
                </p>
              </div>
            </div>

            <div className="right-section">
              <VideoCarousel />
            </div>
          </div>
        </div>
        {/* this Will be added later along with the monetization feature */}
        <div className="trial-period-footer">
          <div className="trial-text">
            <span>🎉</span>
            <span className="fw-bold">You're on a trial plan</span>
          </div>
          <div className="upgrade-link-container">
            <span>Upgrade your plan to continue hassle-free access!</span>
            <Link to="/get-unlimited-access" className="upgrade-link">upgrade now →</Link>
          </div>
        </div>
      </Modal>
      {isMobileOnly && (
        <div
          className="device-warning-content"
          style={{
            margin: 0,
            padding: "10px",
            width: "90vw",
            maxWidth: "95vw",
            zIndex: 1001,
            backgroundColor: "#19BB7A",
            borderRadius: "1rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            color: "white",
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <img
              src={desktopIcon}
              alt="Desktop"
              className="desktop-icon"
              style={{
                width: "40px",
                height: "40px",
              }}
            />

            <h2
              className="warning-title"
              style={{
                fontSize: "17px",
                fontWeight: "450",
                margin: 0,
                lineHeight: "1.5",
                color: "white",
                textAlign: "left",
              }}
            >
              For the best experience, open the platform on a <b>desktop</b> or <b>tablet</b> browser
            </h2>
          </div>

          <div
            className="link-wrapper"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              // backgroundColor: "rgba(255, 255, 255, 0.2)",
              padding: "12px",
              borderRadius: "8px",
            }}
          >
            <a
              href={doctorPortalUrl}
              className="platform-link"
              style={{
                color: "white",
                textDecoration: "none",
                flex: 1,
                padding: "10px 16px",
                borderRadius: "8px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {doctorPortalUrl}
            </a>

            <div
              className="action-buttons"
              style={{
                display: "flex",
              }}
            >
              <button
                className="action-btn"
                style={{
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => {
                  navigator.clipboard.writeText(doctorPortalUrl)
                    .then(() => {
                      // Optional: Add a toast or notification here
                      alert("Link copied to clipboard!");
                    })
                    .catch(err => {
                      console.error('Failed to copy text: ', err);
                    });
                }}
              >
                <img src={copyIcon} alt="Copy" style={{ width: "30px", height: "30px" }} />
              </button>
              <button
                className="action-btn"
                style={{
                  border: "none",
                  cursor: "pointer",
                  marginRight: "2rem",
                }}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'TatvaPractice',
                      text: 'Check out TatvaPractice',
                      url: doctorPortalUrl,
                    })
                      .catch(err => {
                        console.error('Share failed:', err);
                      });
                  } else {
                    // Fallback for browsers that don't support Web Share API
                    navigator.clipboard.writeText(doctorPortalUrl)
                      .then(() => {
                        alert("Link copied to clipboard! You can now share it manually.");
                      })
                      .catch(err => {
                        console.error('Failed to copy text: ', err);
                      });
                  }
                }}
              >
                <img src={shareIcon} alt="Share" style={{ width: "30px", height: "30px" }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeModal;
