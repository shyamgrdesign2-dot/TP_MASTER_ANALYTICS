import { Collapse } from "antd";

import LoopingVideo from "./common/LoopingVideo";

import { useState } from "react";
import { isMobile } from "react-device-detect";
import { ASSETS } from "../assets";
const {
  shadedArrow: arrow,
  groundingPurple: grounding,
  cdssWallpaper_2: cdssWallpaperWebm,
  cdssWallpaper: cdssWallpaperMp4,
  newGif_3: newTagWebm,
  newGif_2: newTagMp4,
} = ASSETS.images;

const GroundingBox = ({ handleGroundingKnowMore }) => {
  const [isCollapseActive, setIsCollapseActive] = useState(true);

  const handlePanelChange = () => {
    setIsCollapseActive((prev) => !prev);
  };

  const accordionItems = [
    {
      key: "1",
      label: (
        <div
          style={{
            borderRadius: "20px 20px 0 0",
          }}
          className="d-flex flex-column justify-content-between p-14"
        >
          <>
            <div className="d-flex align-items-center">
              <img
                src={grounding}
                alt="ddx-img"
                width={48}
                height={48}
                className="me-3"
              />
              <div
                className="title-common d-flex flex-column"
                style={{ gap: 4 }}
              >
                <span>Zydus Data Engine</span>
              </div>
              <LoopingVideo
                style={{ marginLeft: 10 }}
                webm={newTagWebm}
                mp4={newTagMp4}
                width={39}
                height={16}
                ariaLabel="New"
              />
            </div>
            {isCollapseActive && (
              <div
                style={{
                  paddingTop: 10,
                }}
              >
                With a curated list of{" "}
                <span className="semi-bold-text">medicines</span> and tests from
                the <span className="semi-bold-text">Zydus Data Engine</span>,
                our AI adapts to your{" "}
                <span className="semi-bold-text">prescribing style</span>,
                surfacing the most{" "}
                <span className="semi-bold-text">relevant suggestions</span>{" "}
                while you prescribe, and helping{" "}
                <span className="semi-bold-text">boost patient fulfilment</span>{" "}
                and <span className="semi-bold-text">improve accuracy</span>.
              </div>
            )}
          </>
        </div>
      ),
      children: (
        <div className="p-14">
          <div
            className="d-flex align-items-center"
            style={{
              paddingTop: 8,
              paddingBottom: 10,
              columnGap: 8,
              cursor: "pointer",
              width: "fit-content",
            }}
            onClick={handleGroundingKnowMore}
          >
            <div className="text-primary" style={{ fontWeight: 600 }}>
              Know More About Voice Rx
            </div>
            <img src={arrow} alt="arrow" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      {isMobile ? (
        <>
        <div>
          <div
            className="cdss-wallpaper-container d-flex flex-column justify-content-center align-items-center"
            style={{
              rowGap: "24px",
              padding: "24px 10px",
              width: "100%",
              borderRadius: "0 0 20px 20px",
            }}
          >
            <LoopingVideo
              webm={cdssWallpaperWebm}
              mp4={cdssWallpaperMp4}
              className="cdss-wallpaper-video"
              ariaLabel="Background"
            />
            <div className="cdss-wallpaper-overlay" />
            <div className="cdss-wallpaper-content d-flex align-items-center justify-content-center flex-column">
              <LoopingVideo
                style={{ marginBottom: 8 }}
                webm={newTagWebm}
                mp4={newTagMp4}
                width={39}
                height={16}
                ariaLabel="New"
              />
              <div
                className="d-flex flex-column align-items-center justify-content-center"
                style={{
                  gap: 4,
                  fontSize: 24,
                  fontWeight: 600,
                  lineHeight: "28px",
                  textAlign: "center",
                }}
              >
                <span>Zydus</span>
                <span>Data Engine</span>
              </div>
            </div>

            <div
              style={{
                textAlign: "center",
                lineHeight: "26px",
              }}
            >
              With a curated list of{" "}
              <span className="semi-bold-text">medicines</span> and tests from
              the <span className="semi-bold-text">Zydus Data Engine</span>, our
              AI adapts to your{" "}
              <span className="semi-bold-text">prescribing style</span>,
              surfacing the most{" "}
              <span className="semi-bold-text">relevant suggestions</span> while
              you prescribe, and helping{" "}
              <span className="semi-bold-text">boost patient fulfilment</span>{" "}
              and <span className="semi-bold-text">improve accuracy</span>.
            </div>
            </div>
          </div>
          <div
            className="d-flex align-items-center p-14"
            style={{
              paddingTop: 12,
              paddingBottom: 10,
              columnGap: 8,
              cursor: "pointer",
              justifyContent: "center",
            }}
            onClick={handleGroundingKnowMore}
          >
            <div className="text-primary" style={{ fontWeight: 600 }}>
              Know More
            </div>
            <img src={arrow} alt="arrow" />
          </div>
        {/* </div> */}
        </>
      ) : (
        <Collapse
          items={accordionItems}
          defaultActiveKey={["1"]}
          onChange={handlePanelChange}
          className="tatvaAi-accordian cdss-collapse"
          expandIconPosition={"end"}
        />
      )}
    </div>
  );
};

export default GroundingBox;
