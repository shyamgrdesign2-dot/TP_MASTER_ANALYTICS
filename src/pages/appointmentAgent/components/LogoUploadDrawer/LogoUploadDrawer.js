import React, { useState, useRef } from 'react';
import { Drawer, Button } from 'antd';
import { Cropper } from 'react-cropper';
import { PlusOutlined, MinusOutlined, UploadOutlined, RedoOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';

import { dataUrlToFileUsingFetch } from '../../../../utils/utils';
import CommonModal from "../../../../common/CommonModal";
import './LogoUploadDrawer.scss';
import { ASSETS } from "../../../../assets";
const {
  upload: uploadIcon,
  reupload: reuploadIcon,
  alerticon: alertIcon,
} = ASSETS.images;

const LogoUploadDrawer = ({ visible, onClose, onSave }) => {
  const [file, setFile] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFileFormatModalOpen, setIsFileFormatModalOpen] = useState(false);
  const [isFileSizeExceeded, setIsFileSizeExceeded] = useState(false);
  const inputFileRef = useRef(null);
  const cropperRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      const fileUrl = e.target.files[0];
      
      // Check file size first
      if (fileUrl.size > 8000000) {
        setIsFileSizeExceeded(true);
        return;
      }
      // Check file format
      if (
        fileUrl.type === 'image/png' ||
        fileUrl.type === 'image/svg+xml'
      ) {
        const reader = new FileReader();
        reader.onload = () => {
          setFile({
            imageShow: false,
            crop: true,
            showFile: reader.result,
            originalFile: fileUrl
          });
          setIsCropping(true);
          setZoom(1);
        };
        reader.readAsDataURL(fileUrl);
      } else {
        // Show modal for file format error
        setIsFileFormatModalOpen(true);
      }
    }
  };

  const handleCrop = async () => {
    if (cropperRef.current?.cropper) {
      const trimData = cropperRef.current.cropper
        .getCroppedCanvas()
        .toDataURL(file.originalFile.type);
      const uploadFile = await dataUrlToFileUsingFetch(
        trimData,
        "logo.webp",
        "image/png"
      );
      setFile({
        ...file,
        crop: false,
        showFile: trimData,
        uploadFile: uploadFile
      });
      setIsCropping(false);
    }
  };

  const handleSave = () => {
    if (file?.uploadFile) {
      onSave(file.uploadFile);
      onClose();
      // Reset state
      setFile(null);
      setIsCropping(false);
      setZoom(1);
    }
  };

  const handleReupload = () => {
    // Trigger file input to open file selector
    inputFileRef.current?.click();
  };

  const handleZoom = (delta) => {
    const newZoom = zoom + delta;
    if (newZoom >= 0.5 && newZoom <= 3) {
      setZoom(newZoom);
      if (cropperRef.current?.cropper) {
        cropperRef.current.cropper.zoomTo(newZoom);
      }
    }
  };

  const handleRotate = () => {
    if (cropperRef.current?.cropper) {
      cropperRef.current.cropper.rotate(90);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setFile(null);
    setIsCropping(false);
    setZoom(1);
  };

  const handleRetry = () => {
    setIsFileSizeExceeded(false);
    setIsFileFormatModalOpen(false);
  };

  return (
    <Drawer
      title="Upload Clinic Logo"
      placement="right"
      onClose={handleClose}
      open={visible}
      width={700}
      className="logo-upload-drawer"
      extra={
        <Button 
          type="primary" 
          onClick={isCropping ? handleCrop : handleSave}
          disabled={!file}
        >
          {isCropping ? 'Save' : 'Done'}
        </Button>
      }
    >
      {/* Hidden file input - always available */}
      <input
        ref={inputFileRef}
        type="file"
        accept="image/png,image/svg+xml"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      {!file ? (
        <div 
          className="upload-area"
          onClick={() => inputFileRef.current?.click()}
        >
          <img src={uploadIcon} width={60} height={60}/>
          <div className="upload-text">Click to Upload</div>
          <div className="upload-hint">
            Please upload a file smaller than <span style={{ fontWeight: '600' }}>8MB</span> and only <span style={{ fontWeight: '600' }}>PNG</span> and <span style={{ fontWeight: '600' }}>SVG</span> formats are accepted. The recommended aspect ratio is 4:1
          </div>
        </div>
      ) : isCropping ? (
        <div>
          <div className="cropper-container">
            <Cropper
              ref={cropperRef}
              style={{ height: 400 }}
              // aspectRatio={1}
              src={file.showFile}
              viewMode={2}
              background={false}
              zoomable={true}
              guides={true}
              // initialAspectRatio={1}
              autoCropArea={1}
              // zoomTo={1}
              dragMode="move"
            />
            <div className="zoom-controls">
              <div 
                className="zoom-button"
                onClick={handleRotate}
              >
                <RedoOutlined />
              </div>
              <div 
                className="zoom-button"
                onClick={() => handleZoom(-0.1)}
              >
                <MinusOutlined />
              </div>
              <div 
                className="zoom-button"
                onClick={() => handleZoom(0.1)}
              >
                <PlusOutlined />
              </div>
            </div>
          </div>
          <div className="action-buttons">
            <Button 
              icon={<img src={reuploadIcon}/>}
              onClick={handleReupload}
              className='reupload-button'
            >
              Reupload
            </Button>
            <span className="button-separator">|</span>
            <Button 
              type="text"
              className='remove-button'
              icon={<DeleteOutlined />}
              onClick={() => {
                setFile(null);
                setIsCropping(false);
                setZoom(1);
              }}
            >
              Remove
            </Button>
          </div>
          <div className="cropper-hint">
            <InfoCircleOutlined style={{ marginRight: 8, fontSize: "1.5rem"}} />
            Use the crop box, zoom, or rotate to adjust your logo within the frame. For best fit, upload a logo with 4:1 aspect ratio.
          </div>
        </div>
      ) : (
        <div>
          <div className="preview-container">
            <img 
              src={file.showFile} 
              alt="Cropped logo"
              className="preview-image"
            />
          </div>
          <div className="action-buttons">
            <Button 
              icon={<img src={reuploadIcon}/>}
              onClick={handleReupload}
              className='reupload-button'

            >
              Reupload
            </Button>
            <span className="button-separator">|</span>
            <Button 
              type="text"
              className='remove-button'
              icon={<DeleteOutlined />}
              onClick={() => {
                setFile(null);
                setIsCropping(false);
                setZoom(1);
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      )}
      
      {/* File Format Error Modal */}
      <CommonModal
        isModalOpen={isFileFormatModalOpen}
        onCancel={() => setIsFileFormatModalOpen(false)}
        title="File Format Not Supported"
        modalBody={
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <img className="me-3" src={alertIcon} alt="Warning" />
              <div>
                You can't upload this file format. Only <strong>PNG</strong> and <strong>SVG</strong> files are accepted.
              </div>
            </div>
            <Button
              type="primary"
              block
              onClick={handleRetry}
              style={{
                height: '40px',
                borderRadius: '8px',
                fontWeight: '500'
              }}
            >
              Got it
            </Button>
          </div>
        }
        modalWidth={465}
      />

      {/* File Size Exceeded Modal */}
      <CommonModal
        isModalOpen={isFileSizeExceeded}
        onCancel={() => setIsFileSizeExceeded(false)}
        title="Exceeded File Size"
        modalBody={
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <img className="me-3" src={alertIcon} alt="Warning" />
              <div>
                The file size exceeded <strong>8MB</strong>. Please upload a
                file smaller than 8MB
              </div>
            </div>
            <Button
              type="primary"
              block
              onClick={handleRetry}
              style={{
                height: '40px',
                borderRadius: '8px',
                fontWeight: '500'
              }}
            >
              Retry
            </Button>
          </div>
        }
        modalWidth={465}
      />
    </Drawer>
  );
};

export default LogoUploadDrawer; 