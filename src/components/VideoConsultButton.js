import React from "react";
import { Spin } from "antd";
import styles from "./VideoConsultButton.module.scss";

const VideoConsultButton = ({ onClick, className = "", loading = false, callType = "video" }) => {
  const handleClick = (e) => {
    if (loading || !onClick) return;
    onClick(e);
  };

  const isAudioCall = callType === "join-audio-call";
  const buttonText = isAudioCall ? "Audio Consult" : "Tele Consult";
  const iconClass = isAudioCall ? "icon-microphone" : "icon-video";

  return (
    <button 
      onClick={handleClick} 
      className={`${styles.button} ${className} me-20`}
      disabled={loading}
    >
      {loading ? (
        <Spin size="small" style={{ marginRight: '8px' }} />
      ) : (
        <div className={styles.iconContainer}>
          <i className={iconClass} style={{ fontSize: "18px" }} />
        </div>
      )}
      <span className={styles.text}>{loading ? "Connecting..." : buttonText}</span>
    </button>
  );
};

export default VideoConsultButton;