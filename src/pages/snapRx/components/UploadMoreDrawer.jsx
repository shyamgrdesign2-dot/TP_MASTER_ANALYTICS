import { Button, Drawer } from "antd";
import UploadWrittenRx from "./UploadWrittenRx";
import { LeftOutlined } from "@ant-design/icons";
import "./UploadMoreDrawer.scss";
import { forwardRef } from "react";

const UploadMoreDrawer = ({
  isOpen,
  onClose,
  onFileUpload,
  uploadedFiles,
  setUploadedFiles,
  setIsAddMoreClicked,
  fetchUploadedFiles,
  setIsPreviewOpen,
}) => {
  const handleFileUpload = async (uploadedFiles) => {
    // Check if uploadedFiles exists and is an array
    if (!uploadedFiles || !Array.isArray(uploadedFiles)) {
      console.error("uploadedFiles is not a valid array:", uploadedFiles);
      return;
    }

    // Check if uploadedFiles are already processed File objects or file wrapper objects
    const files = uploadedFiles.map((fileObj) => {
      // If it's already a File object (from PreviewDrawer processing), use it directly
      if (fileObj instanceof File) {
        return fileObj;
      }
      // Otherwise, extract the File object from the wrapper
      return fileObj.file;
    });

    if (onFileUpload) {
      await onFileUpload(files);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Drawer
      width="45.625rem"
      maxWidth="45.625rem"
      placement="right"
      onClose={onClose}
      open={isOpen}
      destroyOnClose={true}
      maskClosable={false}
      closable={false}
      push={false}
    >
      <div className="modalCard-header h-60 align-items-center justify-content-between d-flex position-sticky top-0 z-2">
        <div className="align-items-center d-flex h-100">
          <div className="border-end h-100 text-center me-3">
            <div
              onClick={onClose}
              className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
            >
              <i className="icon-right"></i>
            </div>
          </div>
          <div className="snaprx-drawer-title">Upload Written Rx</div>
        </div>
      </div>
      <div style={{ padding: "24px 0" }}>
        <UploadWrittenRx
          isOpen={isOpen}
          onFileUpload={handleFileUpload}
          showBackButton={false}
          onBack={onClose}
          fetchUploadedFiles={fetchUploadedFiles}
          isUploadMoreDrawer={true}
          handleUpdatedFiles={setUploadedFiles}
          uploadedFiles={uploadedFiles}
          setIsAddMoreClicked={setIsAddMoreClicked}
          handlePreviewOpen={setIsPreviewOpen}
        />
      </div>
    </Drawer>
  );
};

export default UploadMoreDrawer;
