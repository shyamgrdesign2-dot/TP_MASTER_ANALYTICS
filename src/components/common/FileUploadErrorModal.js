import React from "react";
import { Button } from "antd";
import CommonModal from "../../common/CommonModal";
import { ASSETS } from "../../assets";
const alertIcon = ASSETS.images.alerticon;

const FileUploadErrorModal = ({
  isFileSizeError,
  isFileLimitError,
  isFileTypeError,
  onRetry,
  fileExtension = ".txt",
}) => {
  const isModalOpen = isFileSizeError || isFileLimitError || isFileTypeError;

  const getTitle = () => {
    if (isFileSizeError) return "Exceeded File Size";
    if (isFileLimitError) return "Exceeded File Upload Limit";
    if (isFileTypeError) return "File format not supported";
    return "You may lose your data";
  };

  const getErrorMessage = () => {
    if (isFileSizeError) {
      return (
        <>
          The file size exceeded <span style={{ fontWeight: 700 }}>8MB.</span>{" "}
          Please upload a file smaller than 8MB
        </>
      );
    }

    if (isFileLimitError) {
      return (
        <>
          You can only upload up to
          <span style={{ fontWeight: 700 }}> 5 files.</span> Please reduce the
          number of files and try again.
        </>
      );
    }

    if (isFileTypeError) {
      return (
        <>
          You can't upload
          <span style={{ fontWeight: 700 }}>
            {" "}
            {typeof isFileTypeError === "string"
              ? isFileTypeError
              : fileExtension}
          </span>{" "}
          file. Only PDF, JPG, JPEG, and PNG formats are accepted.
        </>
      );
    }

    return "Are you sure you want to leave ?";
  };

  return (
    <CommonModal
      isModalOpen={isModalOpen}
      onCancel={onRetry}
      modalWidth={500}
      title={getTitle()}
      modalBody={
        <>
          <div className="alert-warning rounded-10px p-2 patient-details">
            <div className="d-flex align-items-center">
              <img className="me-3" src={alertIcon} alt="Warning" />
              <span>{getErrorMessage()}</span>
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={onRetry}
              className="w-100 btn btn-primary3 btn-41 px-4"
            >
              Retry
            </Button>
          </div>
        </>
      }
    />
  );
};

export default FileUploadErrorModal;
