import React from "react";
import "./OurScale.scss";
import { ASSETS } from "../../../../assets";
const {
  scale: Sparkle,
  lpProfile2user: Profile,
  lpClipboardText: Clipboard,
  lpDoc: Doc,
  lpSupport: Support,
  lpVitals: Vitals,
  lpLocation: Location,
} = ASSETS.images;
const linesLeft = ASSETS.images.websiteImages.linesLeft;
const linesRight = ASSETS.images.websiteImages.linesRight;

const OurScale = () => {
  const scaleData = [
    {
      number: "10 Lakh+",
      description: "Patients Served",
      icon: Profile,
    },
    {
      number: "12 Lakh+",
      description: "Digital Rx created",
      icon: Clipboard,
    },
    {
      number: "10,000+",
      description: "Doctors onboarded",
      icon: Doc,
    },
    {
      number: "10 +",
      description: "Language support",
      icon: Support,
    },
    {
      number: "25+",
      description: "Specialities",
      icon: Vitals,
    },
    {
      number: "200+",
      description: "Cities Serviceable",
      icon: Location,
    },
  ];

  return (
    <div className="our-scale">
      <h2 className="our-scale-title">
        Our Scale <img src={Sparkle} alt="sparkle" className="sparkle" />
      </h2>
      <div className="our-scale-container">
        <img src={linesLeft} alt="lines" className="lines-left" />
        <div className="scale-stats-container">
          {scaleData.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-icon">
                <img src={stat.icon} alt={stat.description} />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">{stat.number}</h3>
                <p className="stat-description">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
        <img src={linesRight} alt="lines" className="lines-right" />
      </div>
    </div>
  );
};

export default OurScale;
