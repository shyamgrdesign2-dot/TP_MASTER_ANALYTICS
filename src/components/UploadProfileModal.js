import React from 'react';
import { Drawer } from 'antd';

import './UploadProfileModal.scss';
import { ASSETS } from "../assets";
const {
  camera: cameraIcon,
  gallery: galleryIcon,
  document: documentIcon,
  arrowRight: arrowRightIcon,
  close2: closeIcon,
} = ASSETS.mobile;

function UploadProfileModal({ visible, onClose, onSelectCamera, onSelectGallery, onSelectFiles }) {
  // Trigger input first (same user gesture) so browser allows file dialog; then close modal.
  const handleCameraClick = () => {
    if (onSelectCamera) onSelectCamera();
    onClose();
  };

  const handleGalleryClick = () => {
    if (onSelectGallery) onSelectGallery();
    onClose();
  };

  const handleFilesClick = () => {
    if (onSelectFiles) onSelectFiles();
    onClose();
  };

  return (
    <>
      <Drawer
        placement="bottom"
        onClose={onClose}
        open={visible}
        height="auto"
        className="upload-profile-modal"
        closable={false}
        maskClosable={true}
      >
        <div className="upload-profile-modal-content">
          {/* Header */}
          <div className="upload-profile-modal-header">
            <h3 className="upload-profile-modal-title">Upload Profile</h3>
            <button className="upload-profile-modal-close" onClick={onClose}>
              <img src={closeIcon} alt="Close" className="upload-profile-close-icon" />
            </button>
          </div>

          {/* Options List */}
          <div className="upload-profile-options-list">
            {/* Option 1: Use Camera */}
            <button type="button" className="upload-profile-option-item" onClick={handleCameraClick}>
              <div className="upload-profile-option-content">
                <div className="upload-profile-option-icon-wrapper">
                  <img src={cameraIcon} alt="Camera" className="upload-profile-option-icon" />
                </div>
                <div className="upload-profile-option-text">
                  <span>Use Camera</span>
                </div>
                <div className="upload-profile-option-arrow">
                  <img src={arrowRightIcon} alt="Arrow" className="upload-profile-arrow-icon" />
                </div>
              </div>
              <div className="upload-profile-option-divider" />
            </button>

            {/* Option 2: Upload from gallery */}
            <button type="button" className="upload-profile-option-item" onClick={handleGalleryClick}>
              <div className="upload-profile-option-content">
                <div className="upload-profile-option-icon-wrapper">
                  <img src={galleryIcon} alt="Gallery" className="upload-profile-option-icon" />
                </div>
                <div className="upload-profile-option-text">
                  <span>Upload from gallery</span>
                </div>
                <div className="upload-profile-option-arrow">
                  <img src={arrowRightIcon} alt="Arrow" className="upload-profile-arrow-icon" />
                </div>
              </div>
              <div className="upload-profile-option-divider" />
            </button>

            {/* Option 3: Upload from files */}
            <button type="button" className="upload-profile-option-item" onClick={handleFilesClick}>
              <div className="upload-profile-option-content">
                <div className="upload-profile-option-icon-wrapper">
                  <img src={documentIcon} alt="Document" className="upload-profile-option-icon" />
                </div>
                <div className="upload-profile-option-text">
                  <span>Upload from files</span>
                </div>
                <div className="upload-profile-option-arrow">
                  <img src={arrowRightIcon} alt="Arrow" className="upload-profile-arrow-icon" />
                </div>
              </div>
              <div className="upload-profile-option-divider" />
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}

export default React.memo(UploadProfileModal);

