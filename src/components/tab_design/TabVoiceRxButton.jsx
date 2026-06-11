import styles from "./TabVoiceRxButton.module.scss";

import LoopingVideo from "../common/LoopingVideo";
import { ASSETS } from "../../assets";
const {
  voiceRx: voiceRxIcon,
  genRxBg_2: genRxBgWebm,
  genRxBg: genRxBgMp4,
} = ASSETS.images;

const TabVoiceRxButton = ({ onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`${styles.tabVoiceRxButton} ${className}`}
    >
      <LoopingVideo
        webm={genRxBgWebm}
        mp4={genRxBgMp4}
        className={styles.gradientBackground}
        ariaLabel="Voice Rx background"
      />
      <img
        src={voiceRxIcon}
        alt="Voice Rx"
        loading="lazy"
        className={styles.voiceRxButtonIcon}
      />
    </button>
  );
};

export default TabVoiceRxButton;
