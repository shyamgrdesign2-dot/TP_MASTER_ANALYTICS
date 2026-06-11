import React, { useState } from "react";

import "./Preview.scss";

import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { ASSETS } from "../../../../assets";
const {
  iphone: iPhoneBg,
  clinicDetailBg: clinicBg,
  closeWithWhiteFill: closeIcon,
} = ASSETS.images;

const ClinicPreview = ({
  contactNumber,
  email,
  clinicName,
  address,
  pincode,
  location,
  googleMapsLink,
}) => {
  const [showPopup, setShowPopup] = useState(true);

  return (
    <div className="preview-section">
      <h2 className="preview-title-text">Live Preview</h2>
      <div
        className="phone-preview d-flex justify-content-center align-items-center flex-column"
        style={{
          background: `url(${iPhoneBg})`,
          width: 235,
          height: 470,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          overflow: "hidden",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: `linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 1)), url(${clinicBg})`,
            width: 210,
            height: 450,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            position: "relative",
            overflow: "hidden",
            borderRadius: "24px",
          }}
        >
          <div
            className={`main-content d-flex justify-content-between align-items-center flex-column ${
              showPopup ? "blurred" : ""
            }`}
            style={{
              height: "85%",
              width: "100%",
              transition: "filter 0.3s ease",
            }}
          >
            {/* <div className="clinic-header">Munshi Hospital</div> */}
            <div className="clinic-body">
              {/* Your existing calendar and booking content */}
            </div>
          </div>

          {showPopup && (
            <div className="clinic-popup">
              <div className="clinic-popup-content">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="popup-title">Clinic Details</div>
                  <img
                    src={closeIcon}
                    alt="close"
                    style={{ cursor: "pointer" }}
                    // onClick={() => setShowPopup(false)}
                  />
                </div>

                <div className="clinic-info">
                  <div className="info-row">
                    <PhoneOutlined
                      className="info-icon"
                      style={{ margin: 0, color: "#000" }}
                      rotate={90}
                    />
                    <span className="highlighted fs-8">
                      {contactNumber || "{Clinic Reception Contact number}"}
                    </span>
                  </div>

                  <div className="info-row">
                    <MailOutlined
                      className="info-icon"
                      style={{ margin: 0, color: "black" }}
                    />
                    <span className="highlighted fs-8">
                      {email || "{Clinic Reception Email ID}"}
                    </span>
                  </div>

                  <div className="info-row">
                    <EnvironmentOutlined
                      className="info-icon"
                      style={{ margin: 0 }}
                    />
                    <div>
                      <div className="clinic-name fs-8">
                        {clinicName || "Munshi Hospital"}
                      </div>
                      <div className="clinic-address fs-8">
                        {address ||
                          "#4 & # 5 divyasharya apartment, VGS layout, 560047, Banglore, Karnataka"}
                      </div>
                      <div className="highlighted fs-8">
                        {googleMapsLink ? (
                          <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" style={{textDecoration: "underline"}}>
                            View Clinic Google Location
                          </a>
                        ) : (
                          "{Clinic Google Location}"
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicPreview;
