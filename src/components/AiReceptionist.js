import React from "react";

import styles from "./GenRxButton.module.scss";
import { isMobile } from "react-device-detect";
import LoopingVideo from "./common/LoopingVideo";
import { ASSETS } from "../assets";
const {
  receptionisticon: genRxIcon,
  genRxBg_2: genRxBgWebm,
  genRxBg: genRxBgMp4,
} = ASSETS.images;

const AiReceptionistButton = ({ onClick, className = "", customText, agetnsData}) => {
  const defaultText = agetnsData ? "Your AI Receptionist" : "Setup Your AI Receptionist";
  const buttonText = customText || defaultText;
  
  return (
    <button onClick={onClick} className={`${styles.AiReceptionistButton} ${className} ${isMobile ? styles.AiReceptionistButtonMobile : ""}`}>
      <LoopingVideo
        webm={genRxBgWebm}
        mp4={genRxBgMp4}
        className={styles.buttonVideo}
        ariaLabel="AI Receptionist background"
      />
      <div className={styles.buttonContent}>
        { !isMobile && 
          <div className={styles.iconContainer}>
            <img src={genRxIcon} alt="Ai Receptionist" loading="lazy" className={styles.AiReceptionistButtonicon} />
          </div>
        }
        <span className={styles.receptionistText}>{buttonText}</span>
        <div className='iconrotate180 align-self-start mt-1'>
          <i className='icon-right' style={{ color: "#943CD7" }}></i>
        </div>
      </div>
    </button>
  );
};

export default AiReceptionistButton;
