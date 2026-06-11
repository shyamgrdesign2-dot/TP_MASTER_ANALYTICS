import { useState } from "react";
import { Modal, Spin, message } from "antd";
import { RightOutlined } from "@ant-design/icons";
import { setMetadata } from "../../services/templateService";
import "./TabRxWelcomePopup.scss";
import { ASSETS } from "../../../../assets";
const {
  notesMultiple: multipleNotesIcon,
  docEmpty: docEmptyIcon,
  docContent: docContentIcon,
  docUpload: docUploadIcon,
} = ASSETS.images;

const TabRxWelcomePopup = ({ open, onClose, onSuccess, isSelectLetterHead }) => {
  const [loading, setLoading] = useState(false);

  const handleSelectFormat = async (format) => {
    setLoading(true);
    try {
      const response = await setMetadata(format, isSelectLetterHead);
      if (response.success) {
        if (onSuccess) onSuccess(format);
        if (onClose) onClose();
      } else {
        message.error(response.error || "Failed to save Letterhead preference.");
      }
    } catch (error) {
      console.error("Error setting metadata format:", error);
      message.error("Failed to save Letterhead preference.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      maskClosable={false}
      width={800}
      className="tabrx-welcome-modal"
      centered
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      maskStyle={{
        background: "rgba(0, 0, 0, 0.80)",
        backdropFilter: "blur(2px)",
      }}
    >
      <Spin spinning={loading}>
        <div className="tabrx-welcome-container">
          {/* Left panel */}
          <div className="welcome-left">
            <div className="welcome-header">
              <h2>Welcome to TabRx 🎉</h2>
              <p>Get started with your digital Rx pad. Choose a canvas style to begin writing.</p>
            </div>

            <div className="feature-card">
              <div className="flagship-badge">Flagship Feature</div>

              <div className="feature-title">
                How<br />TabRX<br />Works?
              </div>

              <div className="play-icon">
                <RightOutlined style={{ fontSize: '18px' }} />
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="welcome-right">
            <h3 className="section-title">
              <img src={multipleNotesIcon} alt="Letterhead" />
              Choose your Rx Letterhead
            </h3>

            <div className="options-grid">

              <div className="option-card" onClick={() => handleSelectFormat(1)}>
                <div className="option-content">
                  <div className="icon-wrapper">
                    <img src={docEmptyIcon} alt="Letterhead" />
                  </div>
                  <div className="text-content">
                    <h3>Blank Canvas</h3>
                    <p>Start with a clean, empty white page.</p>
                  </div>
                </div>
                <i className="icon-right iconrotate180" />
              </div>

              <div className="option-card" onClick={() => handleSelectFormat(2)}>
                <div className="option-content">
                  <div className="icon-wrapper">
                    <img src={docContentIcon} alt="Letterhead" />
                  </div>
                  <div className="text-content">
                    <h3>Our Standard Template</h3>
                    <p>Use our pre-formatted Rx pad with header & footer.</p>
                  </div>
                </div>
                <i className="icon-right iconrotate180" />
              </div>

              <div className="option-card" onClick={() => handleSelectFormat(3)}>
                <div className="option-content">
                  <div className="icon-wrapper">
                    <img src={docUploadIcon} alt="Letterhead" />
                  </div>
                  <div className="text-content">
                    <h3>My Own Letterhead</h3>
                    <p>Upload your own clinic's letterhead or template.</p>
                  </div>
                </div>
                <i className="icon-right iconrotate180" />
              </div>

            </div>
          </div>
        </div>
      </Spin>
    </Modal>
  );
};

export default TabRxWelcomePopup;