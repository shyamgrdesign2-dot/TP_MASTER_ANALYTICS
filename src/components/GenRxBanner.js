import { Button } from "antd";

import LoopingVideo from "./common/LoopingVideo";
import { ASSETS } from "../assets";
const {
  genRx,
  newGif_3: newTagWebm,
  newGif_2: newTagMp4,
} = ASSETS.images;

const GenRxBanner = ({ setShowGenRxPopup, handleGenRxKnowMore }) => {
  return (
    <div
      className="d-flex justify-content-between align-items-center"
      style={{
        border: "1px solid #A461D8",
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        backgroundColor: "#EFE9F3",
      }}
    >
      <div className="d-flex w-100">
        <img className="me-3" src={genRx} alt="apex-AI" />
        <div style={{ fontSize: 16, fontWeight: 500 }}>
          <div className="d-flex align-items-center">
            AI-Powered Voice Rx{" "}
            <LoopingVideo
              style={{ marginLeft: 10 }}
              webm={newTagWebm}
              mp4={newTagMp4}
              width={39}
              height={16}
              ariaLabel="New"
            />
          </div>
          <div className="know-more-txt" onClick={handleGenRxKnowMore}>
            Know More
          </div>
        </div>
      </div>
      <Button
        type="text"
        className="btn btn-delete-prescription focus-none h-100"
        style={{ padding: 5 }}
        onClick={() => setShowGenRxPopup(false)}
      >
        <i className="icon-Cross fs-3" style={{ color: "#A461D8" }} />
      </Button>
    </div>
  );
};

export default GenRxBanner;
