import React from "react";

import LoopingVideo from "./common/LoopingVideo";
import styles from "./GenRxButton.module.scss";
import { ASSETS } from "../assets";
const {
  genRxBtn: genRxIcon,
  genRxBg_2: genRxBgWebm,
  genRxBg: genRxBgMp4,
} = ASSETS.images;

const GenRxButton = ({ onClick, className = "" }) => {
  return (
    <button onClick={onClick} className={`${styles.button} ${className} me-20`}>
      <LoopingVideo
        webm={genRxBgWebm}
        mp4={genRxBgMp4}
        className={styles.buttonVideo}
        ariaLabel="Voice Rx background"
      />
      <div className={styles.buttonContent}>
        <div className={styles.iconContainer}>
          <img src={genRxIcon} alt="Voice Rx" loading="lazy" />
        </div>
        <span className={styles.text}>Voice Rx</span>
      </div>
    </button>
  );
};

export default GenRxButton;
