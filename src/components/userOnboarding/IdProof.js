import React, { useState } from "react";
import { Button, Upload } from "antd";
import { CloudUploadOutlined } from "@ant-design/icons";
import styles from "./IdProof.module.css";
import { FileOutlined } from "@ant-design/icons";
import CommonModal from "../../common/CommonModal";

import { pdfjs, Document, Page } from "react-pdf";
import { ASSETS } from "../../assets";
const alertIcon = ASSETS.images.alerticon;

const worker = require("pdfjs-dist/build/pdf.worker.min.js");
pdfjs.GlobalWorkerOptions.workerSrc = worker;

const IdProof = ({
  title,
  description,
  iconType = "government", // "government" or "certificate"
  document,
  onDocumentChange,
  verificationStatus = null, // null, "pending", "verified", "failed"
}) => {

  const [isFileSizeExceeded, setIsFileSizeExceeded] = useState(false);
  const [isFileFormatNotSupported, setIsFileFormatNotSupported] =
    useState(false);
  const [selectedFileExtension, setSelectedFileExtension] = useState("");
  const [numPages, setNumPages] = useState(null);

  const handleUpload = (file) => {
    // Validate file type and size
    const isJpgOrPngOrPdf =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "application/pdf";

    if (!isJpgOrPngOrPdf) {
      setIsFileFormatNotSupported(true);
      setSelectedFileExtension(file.name.split(".").pop());
      return false;
    }

    // Check if file size exceeds 8MB (8 * 1024 * 1024 bytes)
    const isLt8M = file.size / 1024 / 1024 < 8;
    if (!isLt8M) {
      setIsFileSizeExceeded(true);
      setSelectedFileExtension(file.name.split(".").pop());
      return false;
    }

    // Create a preview URL and update the document
    const newDocument = {
      name: file.name,
      size: file.size,
      type: file.type,
      originFileObj: file,
      url: URL.createObjectURL(file),
    };

    onDocumentChange(newDocument);
    return false; // Prevent default upload behavior
  };

  const handleRemove = () => {
    onDocumentChange(null);
  };

  const handleRetry = () => {
    setIsFileSizeExceeded(false);
    setIsFileFormatNotSupported(false);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  // Render verification status badge
  const renderVerificationBadge = () => {
    if (!verificationStatus) return null;

    switch (verificationStatus) {
      case "PENDING":
        return <div className={styles.pendingBadge}>Pending Verification</div>;
      case "APPROVED":
        return (
          <div className={styles.verifiedBadge}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <g clip-path="url(#clip0_1162_47309)">
                <path
                  d="M2.91694 4.20002C2.91694 3.85966 3.05214 3.53324 3.29282 3.29257C3.53349 3.0519 3.85991 2.91669 4.20027 2.91669H4.7836C5.12246 2.9165 5.44749 2.78229 5.68777 2.54336L6.0961 2.13502C6.21536 2.01509 6.35716 1.91992 6.51333 1.85497C6.6695 1.79003 6.83697 1.75659 7.0061 1.75659C7.17524 1.75659 7.34271 1.79003 7.49888 1.85497C7.65505 1.91992 7.79684 2.01509 7.9161 2.13502L8.32444 2.54336C8.56477 2.78252 8.89027 2.91669 9.2286 2.91669H9.81194C10.1523 2.91669 10.4787 3.0519 10.7194 3.29257C10.9601 3.53324 11.0953 3.85966 11.0953 4.20002V4.78336C11.0953 5.12169 11.2294 5.44719 11.4686 5.68753L11.8769 6.09586C11.9969 6.21512 12.092 6.35691 12.157 6.51308C12.2219 6.66925 12.2554 6.83672 12.2554 7.00586C12.2554 7.175 12.2219 7.34246 12.157 7.49863C12.092 7.6548 11.9969 7.7966 11.8769 7.91586L11.4686 8.32419C11.2297 8.56447 11.0955 8.8895 11.0953 9.22836V9.81169C11.0953 10.1521 10.9601 10.4785 10.7194 10.7191C10.4787 10.9598 10.1523 11.095 9.81194 11.095H9.2286C8.88975 11.0952 8.56472 11.2294 8.32444 11.4684L7.9161 11.8767C7.79684 11.9966 7.65505 12.0918 7.49888 12.1567C7.34271 12.2217 7.17524 12.2551 7.0061 12.2551C6.83697 12.2551 6.6695 12.2217 6.51333 12.1567C6.35716 12.0918 6.21536 11.9966 6.0961 11.8767L5.68777 11.4684C5.44749 11.2294 5.12246 11.0952 4.7836 11.095H4.20027C3.85991 11.095 3.53349 10.9598 3.29282 10.7191C3.05214 10.4785 2.91694 10.1521 2.91694 9.81169V9.22836C2.91674 8.8895 2.78254 8.56447 2.5436 8.32419L2.13527 7.91586C2.01534 7.7966 1.92016 7.6548 1.85521 7.49863C1.79027 7.34246 1.75684 7.175 1.75684 7.00586C1.75684 6.83672 1.79027 6.66925 1.85521 6.51308C1.92016 6.35691 2.01534 6.21512 2.13527 6.09586L2.5436 5.68753C2.78254 5.44724 2.91674 5.12222 2.91694 4.78336V4.20002Z"
                  stroke="#3D8C40"
                  stroke-width="1.16667"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5.25 6.99992L6.41667 8.16659L8.75 5.83325"
                  stroke="#3D8C40"
                  stroke-width="1.16667"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_1162_47309">
                  <rect width="14" height="14" fill="white" />
                </clipPath>
              </defs>
            </svg>{" "}
            Verified
          </div>
        );
      case "REJECTED":
        return <div className={styles.failedBadge}>Verification Failed</div>;
      default:
        return null;
    }
  };

  // Render content based on whether document exists and verification status
  const renderContent = () => {
    if (document) {
      return (
        <div className={styles.documentPreviewContainer}>
          <div className={styles.documentPreview}>
            {document?.url?.includes(".jpg") ||
            document?.url?.includes(".jpeg") ||
            document?.url?.includes(".png") ? (
              <img
                src={document.url}
                alt={document.name}
                className={styles.documentPreviewImage}
              />
            ) : document.type === "application/pdf" ||
              document?.url?.includes(".pdf") ? (
              <Document
                file={document.url}
                loading={
                  <div className={styles.pdfLoading}>
                    <div>Loading PDF...</div>
                  </div>
                }
                error={
                  <div className={styles.pdfError}>
                    <FileOutlined className={styles.pdfIcon} />
                    <div>Failed to load PDF</div>
                    <Button
                      type="link"
                      onClick={() => window.open(document.url, "_blank")}
                    >
                      Open in new tab
                    </Button>
                  </div>
                }
                className={styles.pdfDocument}
                onLoadSuccess={onDocumentLoadSuccess}
              >
                {numPages &&
                  Array.apply(null, Array(numPages))
                    .map((x, i) => i + 1)
                    .map((page) => (
                      <Page
                        key={page}
                        pageNumber={page}
                        width={318}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className={styles.pdfPage}
                        height={"100%"}
                      />
                    ))}
              </Document>
            ) : (
              <div className={styles.pdfPreview}>
                <FileOutlined className={styles.pdfIcon} />
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <Upload
        beforeUpload={handleUpload}
        showUploadList={false}
        accept=".pdf,.jpg,.jpeg,.png"
        disabled={verificationStatus === "APPROVED"}
        className={styles.uploadWrapper}
      >
        <div className={styles.uploadContainer}>
          <CloudUploadOutlined className={styles.uploadIcon} />
          <div className={styles.clickToUploadText}>
            <span className={styles.clickToUpload}>Click to Upload</span> or
            drag and drop
          </div>
          <div className={styles.uploadDescriptionText}>
            Upload <span style={{ fontWeight: 600 }}>{description}</span> for
            verification
          </div>
        </div>
      </Upload>
    );
  };

  return (
    <div className="rounded-20px bg-white">
      <div
        className="d-flex align-items-center justify-content-between p-20 border-bottom"
        style={{ borderColor: "#F1F1F5" }}
      >
        <div className="d-flex align-items-center">
          {iconType === "government" ? (
            <i className="profile-head-icon icon-Id me-3"></i>
          ) : (
            <i className="profile-head-icon icon-certificate-profile me-3"></i>
          )}
          <div className="titleprint">{title}</div>
          {renderVerificationBadge()}
        </div>
        {/* Show change document button if document exists */}
        {document && verificationStatus !== "APPROVED" && (
          <button className={styles.changeDocumentBtn} onClick={handleRemove}>
            <i
              className="icon-Edit me-1 fs-5"
              style={{ textDecoration: "none" }}
            ></i>
            <span>Change Document</span>
          </button>
        )}
      </div>

      {renderContent()}
      <CommonModal
        isModalOpen={isFileSizeExceeded}
        onCancel={() => setIsFileSizeExceeded(false)}
        title="Exceeded File Size"
        modalBody={
          <div>
            <div className={styles.warningContainer}>
              <div className={styles.warningIconWrapper}>
                <img className="me-3" src={alertIcon} alt="Warning" />
              </div>
              <div className={styles.warningMessage}>
                The file size exceeded <strong>8MB</strong>. Please upload a
                file smaller than 8MB
              </div>
            </div>
            <Button
              type="primary"
              block
              onClick={handleRetry}
              className={styles.retryButton}
            >
              Retry
            </Button>
          </div>
        }
        modalWidth={465}
      />
      <CommonModal
        isModalOpen={isFileFormatNotSupported}
        onCancel={() => setIsFileFormatNotSupported(false)}
        title="File format Not Supported"
        modalBody={
          <div>
            <div className={styles.warningContainer}>
              <div className={styles.warningIconWrapper}>
                <img className="me-3" src={alertIcon} alt="Warning" />
              </div>
              <div className={styles.warningMessage}>
                You can't upload <strong>.{selectedFileExtension}</strong> file.
                Only PDF, JPG, JPEG, and PNG formats are accepted.
              </div>
            </div>
            <Button
              type="primary"
              block
              onClick={handleRetry}
              className={styles.retryButton}
            >
              Retry
            </Button>
          </div>
        }
        modalWidth={465}
      />
    </div>
  );
};

export default IdProof;
