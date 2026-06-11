import React, { useEffect, useRef, useState } from "react";
import { Button, Tabs } from "antd";

import { Col, Row } from "react-bootstrap";
import VideoModal from "../common/VideoModal";
import Slider from "react-slick"; // Using react-slick for the carousel
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import GenRxTips from "./GenRxTips";
import { ASSETS } from "../assets";
const {
  apexai: tatvaAiIcon,
  code: codeIcon,
  clinicalStudy: clinicalStudyIcon,
  compliant: compliantIcon,
  validateHeathcare: validateHealthcareIcon,
  tubeIcon: playIcons,
  genRx: genRxIcon,
  tatvaAiDdx: ddxIcon,
  shadedArrow: arrow,
} = ASSETS.images;

const { TabPane } = Tabs;

const TatvaAiKnowMore = ({
  handleTatvaAiKnowMore,
  handleDDxKnowMore,
  handleGenRxKnowMore,
}) => {
  const [activeKey, setActiveKey] = useState("basicTatvaAiInfo");

  const sectionsRef = useRef({
    basicTatvaAiInfo: null,
    keyOfferings: null,
  });

  const scrollToSection = (key) => {
    const section = sectionsRef.current[key];
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let closestSection = null;
        let minDistance = Number.MAX_VALUE;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const distance = Math.abs(entry.boundingClientRect.top); // Distance from the top of the viewport
            if (distance < minDistance) {
              minDistance = distance;
              closestSection = entry.target.id; // Update the closest section
            }
          }
        });
        if (closestSection) {
          setActiveKey(closestSection); // Update the active key
        }
      },
      {
        root: null, // Default is the viewport
        threshold: 0, // Trigger as soon as the section starts intersecting
        rootMargin: `0px 0px ${
          activeKey === "basicTatvaAiInfo" || activeKey === "keyOfferings"
            ? "20%"
            : "-20%"
        } 0px`, // Focus on sections near the top of the viewport
      }
    );

    // Observe all sections
    Object.values(sectionsRef.current).forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      // Cleanup observer
      Object.values(sectionsRef.current).forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);

  return (
    <div className="drawer-container">
      {/* Modal Header */}
      <div className="drawer-header">
        <div className="drawer-header-content border-bottom">
          <Button
            type="text"
            className="close-drawer-btn"
            onClick={handleTatvaAiKnowMore}
          >
            <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
          </Button>
          <div className="drawer-title">TatvaAI</div>
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          <Tabs activeKey={activeKey} onChange={scrollToSection}>
            <TabPane tab="Basic Info" key="basicTatvaAiInfo" />
            <TabPane tab="Key Offerings" key="keyOfferings" />
          </Tabs>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="drawer-scrollable-content">
        <div className="section">
          <span
            id="basicTatvaAiInfo"
            ref={(el) => (sectionsRef.current.basicTatvaAiInfo = el)}
            className="section-side-header"
          >
            Basic Info
          </span>
          <div className="know-more-section-tilte">What is TatvaAI</div>
          <div className="know-more-section-content basic-info-section ">
            <img src={tatvaAiIcon} alt="apex-AI" width={72} height={72} />
            <div>
              TatvaAI is a revolutionary AI-powered healthcare assistant
              designed to enhance clinical efficiency, accuracy, and
              decision-making for doctors. By integrating cutting-edge
              artificial intelligence with intuitive workflows, TatvaAI
              simplifies complex tasks and streamlines the care delivery
              process.
            </div>
          </div>
        </div>

        <div className="section">
          <span
            id="keyOfferings"
            ref={(el) => (sectionsRef.current.keyOfferings = el)}
            className="section-side-header"
          >
            Key Offerings
          </span>
          <div className="mt-2">
            <span className="know-more-section-tilte">
              1. Voice Rx - AI-Powered Prescription Writing
            </span>
            <div className="know-more-section-content cvt-tips-content">
              <div className="d-flex">
                <img src={genRxIcon} alt="apex-AI" width={72} height={72} />
                <div className="ms-3">
                  <div>
                    Voice Rx is an AI-powered tool designed to streamline the
                    prescription-writing process by combining voice and typing
                    inputs. It helps doctors generate structured prescriptions
                    faster and more efficiently, reducing the time spent on
                    administrative tasks.
                  </div>
                  <div
                    className="d-flex align-items-center"
                    style={{
                      padding: "10px 0",
                      columnGap: 8,
                      cursor: "pointer",
                      width: "fit-content",
                    }}
                    onClick={handleGenRxKnowMore}
                  >
                    <div className="text-primary" style={{ fontWeight: 600 }}>
                      Know More About Voice Rx
                    </div>
                    <img src={arrow} alt="arrow" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <span className="know-more-section-tilte">
              2. Differential Diagnosis- AI-Powered DDx
            </span>
            <div className="know-more-section-content cvt-tips-content">
              <div className="d-flex">
                <img src={ddxIcon} alt="apex-AI" width={72} height={72} />
                <div className="ms-3">
                  <div>
                    Our AI tool helps you generate possible diagnoses by
                    analyzing patient symptoms, history, and clinical findings,
                    including past patient data for more accurate results. This
                    feature speeds up diagnosis and assists in better
                    decision-making for patient care.
                  </div>
                  <div
                    className="d-flex align-items-center"
                    style={{
                      padding: "10px 0",
                      columnGap: 8,
                      cursor: "pointer",
                      width: "fit-content",
                    }}
                    onClick={handleDDxKnowMore}
                  >
                    <div className="text-primary" style={{ fontWeight: 600 }}>
                      Know More About DDx
                    </div>
                    <img src={arrow} alt="arrow" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TatvaAiKnowMore);
