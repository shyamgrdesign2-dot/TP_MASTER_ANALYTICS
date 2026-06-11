
import { Button } from "antd";
import "./Preview.scss";

import LoopingVideo from "../../../../components/common/LoopingVideo";
import { ASSETS } from "../../../../assets";
const {
  iphone: iPhoneBg,
  profileBlue: profile,
  genRxBg_2: genRxBgWebm,
  genRxBg: genRxBgMp4,
} = ASSETS.images;

const SetupPreview = ({
  name,
  avatarUrl,
  clinicName,
  logo,
  useUploadLogo,
  setupData,
}) => {
  const renderClinicIdentity = () => {
    // Only use logo if it's a File, Blob, or string URL
    const fileLogo =
      logo && (logo instanceof File || logo instanceof Blob || typeof logo === "string")
        ? logo
        : setupData?.logo &&
          (setupData.logo instanceof File || setupData.logo instanceof Blob)
        ? setupData.logo
        : setupData?.logo && typeof setupData.logo === "string"
        ? setupData.logo
        : null;
    const maxLength = 30;
    const displayClinicName =
      clinicName || setupData?.clinicName || "Enter Clinic Name";

    if ((useUploadLogo && fileLogo) || (setupData?.useUploadLogo && fileLogo)) {
      // If fileLogo is a File or Blob, use createObjectURL. If string, use directly.
      let logoSrc = undefined;
      if (fileLogo instanceof File || fileLogo instanceof Blob) {
        logoSrc = URL.createObjectURL(fileLogo);
      } else if (typeof fileLogo === "string") {
        logoSrc = fileLogo;
      }
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
    return (
      <span>
        {displayClinicName.length > maxLength
          ? displayClinicName.slice(0, maxLength - 3) + "..."
          : displayClinicName}
      </span>
    );
  };

  return (
    <div>
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
            className="d-flex justify-content-between align-items-center flex-column"
            style={{ height: "85%", position: "relative", zIndex: 1 }}
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
              className="d-flex justify-content-center align-items-center flex-column"
              style={{ margin: "0 22px" }}
            >
              <div
                className="relative rounded-full"
                style={{
                  background: "rgba(131, 41, 241, 0.1)",
                  position: "relative",
                  width: "105px",
                  height: "105px",
                  borderRadius: "100%",
                  overflow: "hidden",
                }}
              >
                <img
                  style={{
                    position: "absolute",
                    width: "100px",
                    height: "100px",
                    marginTop: "12px",
                    marginLeft: "4px",
                    zIndex: 10,
                  }}
                  src={avatarUrl || setupData?.avatar?.lookUrl}
                  alt="receptionist"
                />
              </div>
              <div style={{ fontWeight: 600 }}>
                I'm{" "}
                {name?.length > 0 || setupData?.receptionistName ? (
                  name || setupData?.receptionistName
                ) : (
                  <span className="highlighted">
                    {`{{`}Agent name{`}}`}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 600 }}>Doctor's AI Assistant</div>
              <div style={{ fontSize: 12, textAlign: "center", marginTop: 10 }}>
                I'll help you book <b>appointment</b> and collect your{" "}
                <b>symptoms.</b> So you get faster, better care.
              </div>
            </div>
            <Button
              type="button"
              className="btn align-items-center justify-content-center d-flex btn-41 btn-primary3 px-4"
              style={{ width: "80%", cursor: "default" }}
              // onClick={handleSubmitClick}
            >
              Book Appointment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPreview;
