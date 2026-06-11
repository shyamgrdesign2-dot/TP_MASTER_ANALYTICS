import { Radio } from "antd";

import "./Preview.scss";

import LoopingVideo from "../../../../components/common/LoopingVideo";
import { ASSETS } from "../../../../assets";
const {
  iphone: iPhoneBg,
  scBannerStrip: scStrip,
  profileBlue: profile,
  genRxBg_2: genRxBgWebm,
  genRxBg: genRxBgMp4,
} = ASSETS.images;

const getInitials = (name) => {
  if (!name) return "";
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const SummaryPreview = ({ setupData }) => {
  const renderClinicIdentity = () => {
    if (setupData?.useUploadLogo && setupData?.logo) {
      let logoSrc = undefined;
      if (setupData.logo instanceof File || setupData.logo instanceof Blob) {
        logoSrc = URL.createObjectURL(setupData.logo);
      } else if (typeof setupData.logo === "string") {
        logoSrc = setupData.logo;
      }
      if (logoSrc) {
        return (
          <img
            src={logoSrc}
            alt="Clinic Logo"
            style={{
              height: "20px",
              objectFit: "contain",
            }}
          />
        );
      }
    }
    const clinicName = setupData?.clinicName || setupData?.clinicData?.hm_name || "Enter Clinic Name";
    const maxLength = 30; // Maximum characters before adding ellipsis
    
    return (
      <span>
        {clinicName.length > maxLength
          ? clinicName.slice(0, maxLength - 3) + "..."
          : clinicName}
      </span>
    );
  };

  return (
    <div className="preview-section">
      <h2 className="preview-title-text">Live Preview</h2>
      <div
        className="phone-preview d-flex justify-content-center align-items-center flex-column"
        style={{
          background: `url(${iPhoneBg})`,
          width: 230,
          height: 470,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#F7F3FC",
          borderRadius: "32px",
        }}
      >
        {/* Animated GIF background */}
          <LoopingVideo
            webm={genRxBgWebm}
            mp4={genRxBgMp4}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.12,
              zIndex: 0,
              borderRadius: "50px",
              paddingTop: 75,
            }}
            ariaLabel="Background"
          />
        <div
          className="d-flex align-items-center flex-column gap-2"
          style={{ height: "85%", zIndex: 1 }}
        >
          <div
            className="d-flex justify-content-between mt-1"
            style={{ width: "80%" }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                padding: "2px 0",
                width: "80%",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              className="d-flex align-items-start"
            >
              {renderClinicIdentity()}
            </div>
            <div className="d-flex align-items-center gap-1">
              <img src={profile} alt="profile" width={32} height={32} />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2, // reduce this value for less gap between dots
                }}
              >
                {[...Array(3)].map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      background: "#444",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div
            className="d-flex flex-column gap-2 overflow-y-auto"
            style={{ margin: "0 22px", overflowX: "hidden" }}
          >
            <div className="d-flex justify-content-center align-items-start gap-2">
              <img
                width={38}
                height={38}
                src={
                  setupData?.selectedLook?.lookUrl || setupData?.avatar?.lookUrl
                }
                alt="receptionist"
              />
              <span className="fs-10">
                Hi! 👋 I'm { setupData?.name || setupData?.receptionistName}, your
                doctor's AI assistant. Please select the doctor you wish to
                consult from the list below
              </span>
            </div>

            {setupData?.doctors && setupData.doctors.length > 0 ? (
              <div className="d-flex flex-column gap-2 w-100 overflow-y-auto overflow-x-hidden">
                {setupData.doctors.map((doctor) => (
                  <div key={doctor.um_id} className="language-card">
                    <div className="card-content">
                      <div
                        style={{
                          backgroundColor: "#A2A2A8",
                          color: "#4B4AD5",
                          borderRadius: "50%",
                          textAlign: "center",
                          width: "2rem",
                          height: "2rem",
                          display:"flex",
                          alignItems:"center",
                          justifyContent:"center"
                        }}
                      >
                        {getInitials(doctor.um_name)}
                      </div>
                      <div className="text-content d-flex justify-content-between flex-column">
                        <span className="fs-10" style={{ fontWeight: 600 }}>
                          {doctor.um_name}
                        </span>
                        <span className="fs-10">
                          {doctor.specialization || "MBBS"}
                        </span>
                      </div>
                    </div>
                    <div className="radio-icon" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="language-card">
                <div className="card-content">
                  <span className="fs-10">No doctors selected</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryPreview;
