import React from 'react';
import './TrustBy.scss';
import { ASSETS } from "../../../../assets";
const Trustby = ASSETS.images.trustby;

const TrustBy = () => {
  const logos = [
    ASSETS.images.websiteImages.apollo,
    ASSETS.images.websiteImages.apollocradlelogo,
    ASSETS.images.onboardPageIcons.munshihoslogo,
    ASSETS.images.websiteImages.zyduslogo,
    ASSETS.images.onboardPageIcons.hospitalslogo,
    ASSETS.images.onboardPageIcons.apexorthohoslogo1,
    ASSETS.images.onboardPageIcons.navijivanhoslogo1,
  ];

  return (
    <div id="trusted-by-section" className="trusted-by-container">
      <h2 className="trusted-by-title">
        Trusted by <img src={Trustby} alt="heart" className="heart" />
      </h2>
      
      <div className="logos-container">
        <div className="logos-slide">
          {/* First set of logos */}
          {logos.map((logo, index) => (
            <div key={`logo-1-${index}`} className="logo-item">
              <img src={logo} alt={`Partner ${index + 1}`} />
            </div>
          ))}
          {/* Duplicate set of logos for seamless loop */}
          {logos.map((logo, index) => (
            <div key={`logo-2-${index}`} className="logo-item">
              <img src={logo} alt={`Partner ${index + 1}`} />
            </div>
          ))}
          {/* Duplicate set of logos for seamless loop */}
          {logos.map((logo, index) => (
            <div key={`logo-2-${index}`} className="logo-item">
              <img src={logo} alt={`Partner ${index + 1}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustBy;
