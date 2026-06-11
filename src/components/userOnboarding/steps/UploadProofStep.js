import React, { useState, useEffect } from "react";
import { Button, Upload } from "antd";
import { FileOutlined } from "@ant-design/icons";
import styles from "../DoctorOnboarding.module.css";
import { CloudUploadOutlined } from "@ant-design/icons";
import CommonModal from "../../../common/CommonModal";
import { ASSETS } from "../../../assets";
const {
  alerticon: alertIcon,
  govId,
  certificate: mrc,
} = ASSETS.images;

const UploadProofStep = ({
  formData,
  setFormData,
  isAccountLocked = false,
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [activeUploadType, setActiveUploadType] = useState(null); // 'gov' or 'mrc'

  const [governmentIdFile, setGovernmentIdFile] = useState(
    formData.governmentIdProof
  );
  const [mrcFile, setMRCFile] = useState(formData.mrcCertificate);
  const [isFileSizeExceeded, setIsFileSizeExceeded] = useState(false);
  const [isFileFormatNotSupported, setIsFileFormatNotSupported] =
    useState(false);
  const [selectedFileExtension, setSelectedFileExtension] = useState("");
  const ua = navigator.userAgent.toLowerCase();
  const isRealChrome =
    ua.includes('chrome') &&
    !ua.includes('edg') &&
    !ua.includes('opr') &&
    !ua.includes('wv') && // Android WebView has "wv"
    !ua.includes('version/'); // iOS WebView has "Version/"

  // Detect real Safari (exclude iOS WebView)
  const isRealSafari =
    ua.includes('safari') &&
    !ua.includes('chrome') &&
    !ua.includes('crios') && // Chrome on iOS
    !ua.includes('fxios');   // Firefox on iOS

  // Listen for window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Replace openAttachmentDrawer function
  const openAttachmentModal = (type) => {
    setActiveUploadType(type);
    setAttachModalVisible(true);
  };

  // Replace closeAttachmentDrawer function
  const closeAttachmentModal = () => {
    setAttachModalVisible(false);
  };

  const handleGovIdUpload = (file) => {
    // Validate file type and size
    const isJpgOrPngOrPdf =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "application/pdf";

    if (!isJpgOrPngOrPdf) {
      setSelectedFileExtension(file.name.split(".").pop());
      setIsFileFormatNotSupported(true);
      return false;
    }

    const isLt8M = file.size / 1024 / 1024 < 8;
    if (!isLt8M) {
      setIsFileSizeExceeded(true);
      return false;
    }

    setGovernmentIdFile({
      name: file.name,
      size: file.size,
      type: file.type,
      originFileObj: file, // Save original file for upload
      url: URL.createObjectURL(file),
    });

    setFormData({
      ...formData,
      governmentIdProof: file,
    });

    closeAttachmentModal();
    return false; // Prevent default upload behavior
  };

  const handleMRCUpload = (file) => {
    // Validate file type and size
    const isJpgOrPngOrPdf =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "application/pdf";

    if (!isJpgOrPngOrPdf) {
      setSelectedFileExtension(file.name.split(".").pop());
      setIsFileFormatNotSupported(true);
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      setIsFileSizeExceeded(true);
      return false;
    }

    setMRCFile({
      name: file.name,
      size: file.size,
      type: file.type,
      originFileObj: file, // Save original file for upload
      url: URL.createObjectURL(file),
    });

    setFormData({
      ...formData,
      mrcCertificate: file,
    });

    closeAttachmentModal();
    return false; // Prevent default upload behavior
  };

  const handleFileSelect = (type) => {
    // This would trigger the file input in a real implementation
    // For now, we'll just close the drawer and imagine a file was selected
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf,.jpg,.jpeg,.png";
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (type === "gov") {
          handleGovIdUpload(file);
        } else {
          handleMRCUpload(file);
        }
      }
    };
    fileInput.click();
  };

  const handleGovIdRemove = () => {
    setGovernmentIdFile(null);
    setFormData({
      ...formData,
      governmentIdProof: null,
    });
  };

  const handleMRCRemove = () => {
    setMRCFile(null);
    setFormData({
      ...formData,
      mrcCertificate: null,
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleRetry = () => {
    setIsFileSizeExceeded(false);
    setIsFileFormatNotSupported(false);
  };

  const deleteSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="21"
      viewBox="0 0 20 21"
      fill="none"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M6.38642 4.79419L6.94648 3.114C7.05991 2.77371 7.37836 2.54419 7.73705 2.54419H12.2371C12.5957 2.54419 12.9142 2.77371 13.0276 3.114L13.5877 4.79419H17.487C17.9473 4.79419 18.3204 5.16729 18.3204 5.62752C18.3204 6.08776 17.9473 6.46086 17.487 6.46086H16.7728L16.1612 16.8577C16.0835 18.1791 14.9892 19.2109 13.6655 19.2109H6.30856C4.98487 19.2109 3.8906 18.1791 3.81287 16.8577L3.2013 6.46086H2.50033C2.04009 6.46086 1.66699 6.08776 1.66699 5.62752C1.66699 5.16729 2.04009 4.79419 2.50033 4.79419H6.38642ZM8.14324 4.79419H11.8309L11.6364 4.21086H8.33768L8.14324 4.79419ZM15.1033 6.46086H4.87084L5.47666 16.7598C5.50257 17.2003 5.86733 17.5442 6.30856 17.5442H13.6655C14.1068 17.5442 14.4715 17.2003 14.4974 16.7598L15.1033 6.46086ZM11.4053 8.57554C11.434 8.1162 11.8297 7.7671 12.289 7.79581C12.7484 7.82452 13.0975 8.22016 13.0688 8.6795L12.6938 14.6795C12.6651 15.1388 12.2694 15.4879 11.8101 15.4592C11.3507 15.4305 11.0016 15.0349 11.0303 14.5755L11.4053 8.57554ZM8.94376 14.5755C8.97247 15.0349 8.62337 15.4305 8.16403 15.4592C7.70469 15.4879 7.30905 15.1388 7.28034 14.6795L6.90534 8.6795C6.87663 8.22016 7.22573 7.82452 7.68507 7.79581C8.14441 7.7671 8.54005 8.1162 8.56876 8.57554L8.94376 14.5755Z"
        fill="#FC5A5A"
      />
    </svg>
  );

  const editSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M6.41699 1.16699H5.25033C2.33366 1.16699 1.16699 2.33366 1.16699 5.25033V8.75033C1.16699 11.667 2.33366 12.8337 5.25033 12.8337H8.75033C11.667 12.8337 12.8337 11.667 12.8337 8.75033V7.58366"
        stroke="#4B4AD5"
        stroke-width="0.875"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M9.35709 1.76206L4.76042 6.35873C4.58542 6.53373 4.41042 6.87789 4.37542 7.12873L4.12458 8.88456C4.03125 9.52039 4.48042 9.96373 5.11625 9.87623L6.87208 9.62539C7.11708 9.59039 7.46125 9.41539 7.64208 9.24039L12.2388 4.64373C13.0321 3.85039 13.4054 2.92873 12.2388 1.76206C11.0721 0.595392 10.1504 0.968725 9.35709 1.76206Z"
        stroke="#4B4AD5"
        stroke-width="0.875"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M8.69727 2.4209C9.0881 3.81507 10.1789 4.9059 11.5789 5.30257"
        stroke="#4B4AD5"
        stroke-width="0.875"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );

  const rightArrowSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="25"
      viewBox="0 0 24 25"
      fill="none"
    >
      <path
        d="M8.91016 20.4201L15.4302 13.9001C16.2002 13.1301 16.2002 11.8701 15.4302 11.1001L8.91016 4.58008"
        stroke="#5A6774"
        stroke-width="1.5"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );

  return (
    <div className={isMobile ? styles.mobileUploadContainer : ""}>
      {isAccountLocked && (
        <div className={styles.warningAlert}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="33"
            height="33"
            viewBox="0 0 33 33"
            fill="none"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M14.592 3.18112C15.1741 2.85319 15.8309 2.68091 16.499 2.68091C17.1671 2.68091 17.8239 2.85319 18.406 3.18112C18.9881 3.50906 19.4758 3.98155 19.822 4.55297L19.8256 4.55883L30.6336 22.6068L30.6447 22.6258C30.9834 23.2132 31.1625 23.879 31.1642 24.557C31.1659 25.2351 30.9901 25.9018 30.6543 26.4908C30.3186 27.0799 29.8345 27.5708 29.2502 27.9148C28.6659 28.2588 28.0017 28.444 27.3237 28.4518L27.3083 28.452L5.67469 28.4519C4.99639 28.4442 4.33191 28.2591 3.74733 27.915C3.16275 27.5708 2.67846 27.0797 2.34261 26.4903C2.00677 25.9009 1.83108 25.2339 1.83302 24.5556C1.83497 23.8772 2.01447 23.2112 2.35369 22.6238L2.36448 22.6054L13.1511 4.5958C13.1591 4.58139 13.1674 4.56711 13.176 4.55297C13.5222 3.98155 14.0099 3.50906 14.592 3.18112ZM16.499 5.34757C16.2894 5.34757 16.0834 5.40161 15.9008 5.50447C15.7267 5.60256 15.5795 5.7419 15.4721 5.91005L15.4602 5.9303L4.65866 23.9648C4.55507 24.1472 4.50028 24.3533 4.49968 24.5632C4.49907 24.776 4.55418 24.9852 4.65952 25.1701C4.76486 25.3549 4.91676 25.509 5.10012 25.6169C5.28172 25.7238 5.48791 25.7818 5.69854 25.7852H27.2993C27.5097 25.7817 27.7157 25.7237 27.8972 25.6169C28.0805 25.509 28.2323 25.355 28.3376 25.1702C28.443 24.9855 28.4981 24.7763 28.4976 24.5637C28.497 24.354 28.4424 24.148 28.3391 23.9657L17.5413 5.93476L17.5398 5.93234C17.4313 5.75419 17.2789 5.60687 17.0972 5.50447C16.9146 5.40161 16.7086 5.34757 16.499 5.34757ZM16.4992 11.1239C17.2355 11.1239 17.8325 11.7208 17.8325 12.4572V17.7905C17.8325 18.5269 17.2355 19.1239 16.4992 19.1239C15.7628 19.1239 15.1658 18.5269 15.1658 17.7905V12.4572C15.1658 11.7208 15.7628 11.1239 16.4992 11.1239ZM16.4992 20.4575C15.7628 20.4575 15.1658 21.0544 15.1658 21.7908C15.1658 22.5272 15.7628 23.1241 16.4992 23.1241H16.5125C17.2489 23.1241 17.8458 22.5272 17.8458 21.7908C17.8458 21.0544 17.2489 20.4575 16.5125 20.4575H16.4992Z"
              fill="#FC5A5A"
            />
          </svg>
          <div className={styles.warningText}>
            Your account is locked. Please upload the below required documents
            to unlock and continue using your account.
          </div>
        </div>
      )}

      <div className={styles.inputField}>
        <label className={`${styles.formLabel} ${styles.required}`}>
          Government ID Proof
        </label>

        {!governmentIdFile ? (
          isMobile ? (
            <div
              className={styles.mobileUploadBox}
              onClick={() => openAttachmentModal("gov")}
            >
              <div className={styles.mobileUploadInner}>
                <img
                  src={govId}
                  alt="Government ID"
                  className={styles.uploadIcon}
                />
                <div className={styles.uploadDescription}>
                  Upload Aadhar Card /PAN Card/any available Government ID
                  proofs for verification
                </div>
              </div>
              <button className={styles.mobileUploadButton}>
                Upload Government ID
              </button>
            </div>
          ) : (
            <Upload
              beforeUpload={handleGovIdUpload}
              showUploadList={false}
              accept=".pdf,.jpg,.jpeg,.png"
            >
              <div className={styles.uploadContainer}>
                <CloudUploadOutlined className={styles.uploadIcon} />
                <div className={styles.uploadText}>Click to Upload</div>
                <div className={styles.uploadDescription}>
                  Upload{" "}
                  <span style={{ fontWeight: 600 }}>
                    Aadhar Card /PAN Card/any available Government ID proofs
                  </span>{" "}
                  for verification
                </div>
              </div>
            </Upload>
          )
        ) : (
          <div
            className={
              isMobile
                ? styles.mobileUploadedContainer
                : styles.uploadContainerSuccess
            }
          >
            <div
              className={
                isMobile
                  ? styles.mobileUploadedFilePreview
                  : styles.uploadedFilePreview
              }
            >
              <div className={!isMobile ? styles.fileThumb : ""}>
                {governmentIdFile.type.startsWith("image/") ? (
                  <img
                    src={governmentIdFile.url}
                    alt={governmentIdFile.name}
                    style={{
                      width: isMobile ? "auto" : 48,
                      height: isMobile ? "auto" : 64,
                      objectFit: "cover",
                      borderRadius: "0.5rem",
                      maxWidth: "310px",
                      maxHeight: "172px",
                    }}
                  />
                ) : governmentIdFile.type === "application/pdf" ? (
                  <div style={{ position: "relative" }}>
                    <iframe
                      src={governmentIdFile.url}
                      title="Government ID PDF"
                      style={{
                        width: isMobile ? "auto" : "2.03556rem",
                        height: isMobile ? "auto" : "2.86763rem",
                        border: "none",
                        marginTop: "1rem",
                        maxWidth: "310px",
                        maxHeight: "172px",
                      }}
                    ></iframe>
                  </div>
                ) : (
                  <FileOutlined style={{ fontSize: 36, color: "#22c55e" }} />
                )}
              </div>
              {isMobile ? (
                <div className={styles.mobileChangeDocument}>
                  <button
                    onClick={() => openAttachmentModal("gov")}
                    className={styles.mobileChangeButton}
                  >
                    Change Document
                    <span style={{ marginLeft: "0.2rem" }}>{editSvg}</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.fileInfoPreview}>
                    <div className={styles.fileNamePreview}>
                      {governmentIdFile.name}
                    </div>
                    <div className={styles.fileSizePreview}>
                      {formatFileSize(governmentIdFile.size)}
                    </div>
                  </div>
                  <button
                    className={styles.replaceBtn}
                    onClick={() => setGovernmentIdFile(null)}
                  >
                    Replace File
                  </button>
                  <div className={styles.deleteBtn} onClick={handleGovIdRemove}>
                    {deleteSvg}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Divider with "and" text */}
      <div className={styles.dividerContainer}>
        <div className={styles.dividerLine}></div>
        <div className={styles.dividerText}>and</div>
        <div className={styles.dividerLine}></div>
      </div>

      <div className={styles.inputField}>
        <label className={`${styles.formLabel} ${styles.required}`}>
          MRC Certificate
        </label>

        {!mrcFile ? (
          isMobile ? (
            <div
              className={styles.mobileUploadBox}
              onClick={() => openAttachmentModal("mrc")}
            >
              <div className={styles.mobileUploadInner}>
                <img
                  src={mrc}
                  alt="Medical Certificate"
                  className={styles.uploadIcon}
                />
                <div className={styles.uploadDescription}>
                  Upload Medical Registration Certificate for verification
                </div>
              </div>
              <button className={styles.mobileUploadButton}>
                Upload Certificate
              </button>
            </div>
          ) : (
            <Upload
              beforeUpload={handleMRCUpload}
              showUploadList={false}
              accept=".pdf,.jpg,.jpeg,.png"
            >
              <div className={styles.uploadContainer}>
                <CloudUploadOutlined className={styles.uploadIcon} />
                <div className={styles.uploadText}>Click to Upload</div>
                <div className={styles.uploadDescription}>
                  Upload{" "}
                  <span style={{ fontWeight: 600 }}>
                    Medical Registration Certificate
                  </span>{" "}
                  for verification
                </div>
              </div>
            </Upload>
          )
        ) : (
          <div
            className={
              isMobile
                ? styles.mobileUploadedContainer
                : styles.uploadContainerSuccess
            }
          >
            <div
              className={
                isMobile
                  ? styles.mobileUploadedFilePreview
                  : styles.uploadedFilePreview
              }
            >
              <div className={!isMobile ? styles.fileThumb : ""}>
                {mrcFile.type.startsWith("image/") ? (
                  <img
                    src={mrcFile.url}
                    alt={mrcFile.name}
                    style={{
                      width: isMobile ? "auto" : 48,
                      height: isMobile ? "auto" : 64,
                      objectFit: "cover",
                      borderRadius: 6,
                      maxWidth: "310px",
                      maxHeight: "172px",
                    }}
                  />
                ) : mrcFile.type === "application/pdf" ? (
                  <div style={{ position: "relative" }}>
                    <iframe
                      src={mrcFile.url}
                      title="MRC Certificate PDF"
                      style={{
                        width: isMobile ? "auto" : "2.03556rem",
                        height: isMobile ? "auto" : "2.86763rem",
                        border: "none",
                        marginTop: "1rem",
                        maxWidth: "310px",
                        maxHeight: "172px",
                      }}
                    ></iframe>
                  </div>
                ) : (
                  <FileOutlined style={{ fontSize: 36, color: "#22c55e" }} />
                )}
              </div>
              {isMobile ? (
                <div className={styles.mobileChangeDocument}>
                  <button
                    onClick={() => openAttachmentModal("mrc")}
                    className={styles.mobileChangeButton}
                  >
                    Change Document
                    <span style={{ marginLeft: "0.2rem" }}>{editSvg}</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.fileInfoPreview}>
                    <div className={styles.fileNamePreview}>{mrcFile.name}</div>
                    <div className={styles.fileSizePreview}>
                      {formatFileSize(mrcFile.size)}
                    </div>
                  </div>
                  <button
                    className={styles.replaceBtn}
                    onClick={() => setMRCFile(null)}
                  >
                    Replace File
                  </button>
                  <div className={styles.deleteBtn} onClick={handleMRCRemove}>
                    {deleteSvg}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Show contact support only if account is locked */}
      {isAccountLocked && (
        <div className={styles.contactSupport}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M15.3912 14.0251L15.7162 16.6584C15.7995 17.3501 15.0579 17.8334 14.4662 17.4751L10.9745 15.4001C10.5912 15.4001 10.2162 15.3751 9.84955 15.3251C10.4662 14.6001 10.8329 13.6834 10.8329 12.6917C10.8329 10.3251 8.78288 8.40844 6.24955 8.40844C5.28288 8.40844 4.39122 8.68341 3.64955 9.16675C3.62455 8.95841 3.61621 8.75007 3.61621 8.53341C3.61621 4.74174 6.90788 1.66675 10.9745 1.66675C15.0412 1.66675 18.3329 4.74174 18.3329 8.53341C18.3329 10.7834 17.1745 12.7751 15.3912 14.0251Z"
              stroke="#454551"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M10.8337 12.6917C10.8337 13.6834 10.467 14.6001 9.85033 15.3251C9.02533 16.3251 7.71699 16.9667 6.25033 16.9667L4.07532 18.2584C3.70866 18.4834 3.24199 18.1751 3.29199 17.7501L3.50032 16.1084C2.38366 15.3334 1.66699 14.0917 1.66699 12.6917C1.66699 11.2251 2.45033 9.93342 3.65033 9.16676C4.392 8.68342 5.28366 8.40845 6.25033 8.40845C8.78366 8.40845 10.8337 10.3251 10.8337 12.6917Z"
              stroke="#454551"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span className={styles.supportText}>Contact Support:</span>
          <a href="tel:+91-9974042363" className={styles.supportLink}>
            +91-9974042363
          </a>
          <span className={styles.supportDivider}>|</span>
          <a href="mailto:Support@tatvacare.in" className={styles.supportLink}>
            Support@tatvacare.in
          </a>
        </div>
      )}

      {/* Replace the Drawer with a custom modal component at the bottom of the component */}
      {attachModalVisible && (
        <div
          className={styles.customAttachModal}
          onClick={(e) => {
            if (e.target.className === styles.customAttachModal) {
              closeAttachmentModal();
            }
          }}
        >
          <div className={styles.customAttachModalContent}>
            <div className={styles.customAttachModalHeader}>
              <div className={styles.customAttachModalTitle}>Attach</div>
              <div
                className={styles.customAttachModalClose}
                onClick={closeAttachmentModal}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="24"
                  viewBox="0 0 25 24"
                  fill="none"
                >
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M8.47144 2H17.0265C20.7426 2 22.9579 4.17 22.9477 7.81V16.19C22.9477 19.83 20.7324 22 17.0163 22H8.47144C4.75538 22 2.54004 19.83 2.54004 16.18V7.81C2.54004 4.17 4.75538 2 8.47144 2ZM16.5389 16.7729L12.749 13.0606L8.95911 16.7729C8.66314 17.0628 8.17226 17.0628 7.87629 16.7729C7.58032 16.483 7.58032 16.0021 7.87629 15.7122L11.6662 11.9999L7.87629 8.28761C7.58032 7.9977 7.58032 7.51686 7.87629 7.22695C8.17226 6.93704 8.66314 6.93704 8.95911 7.22695L12.749 10.9393L16.5389 7.22695C16.8348 6.93704 17.3257 6.93704 17.6217 7.22695C17.9177 7.51686 17.9177 7.9977 17.6217 8.28761L13.8318 11.9999L17.6217 15.7122C17.9177 16.0021 17.9177 16.483 17.6217 16.7729C17.3257 17.0628 16.8348 17.0628 16.5389 16.7729Z"
                    fill="#292D32"
                  />
                </svg>
              </div>
            </div>
            <div className={styles.attachmentOptions}>
              {(!isMobile || isRealChrome || isRealSafari) ? <div
                className={styles.attachOption}
                onClick={() => handleFileSelect(activeUploadType)}
              >
                <div
                  className={styles.attachOptionIcon}
                  style={{ backgroundColor: "#F6EFFB" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      opacity="0.4"
                      d="M6.76017 22H17.2402C20.0002 22 21.1002 20.31 21.2302 18.25L21.7502 9.99C21.8902 7.83 20.1702 6 18.0002 6C17.3902 6 16.8302 5.65 16.5502 5.11L15.8302 3.66C15.3702 2.75 14.1702 2 13.1502 2H10.8602C9.83017 2 8.63017 2.75 8.17017 3.66L7.45017 5.11C7.17017 5.65 6.61017 6 6.00017 6C3.83017 6 2.11017 7.83 2.25017 9.99L2.77017 18.25C2.89017 20.31 4.00017 22 6.76017 22Z"
                      fill="#4B4AD5"
                    />
                    <path
                      d="M13.5 8.75H10.5C10.09 8.75 9.75 8.41 9.75 8C9.75 7.59 10.09 7.25 10.5 7.25H13.5C13.91 7.25 14.25 7.59 14.25 8C14.25 8.41 13.91 8.75 13.5 8.75Z"
                      fill="#4B4AD5"
                    />
                    <path
                      d="M12.0001 18.1301C13.8668 18.1301 15.3801 16.6168 15.3801 14.7501C15.3801 12.8834 13.8668 11.3701 12.0001 11.3701C10.1334 11.3701 8.62012 12.8834 8.62012 14.7501C8.62012 16.6168 10.1334 18.1301 12.0001 18.1301Z"
                      fill="#4B4AD5"
                    />
                  </svg>
                </div>
                <div className={styles.attachOptionText}>Use Camera</div>
                <div className={styles.attachOptionArrow}>{rightArrowSvg}</div>
              </div> : null}
              <div
                className={styles.attachOption}
                onClick={() => handleFileSelect(activeUploadType)}
              >
                <div
                  className={styles.attachOptionIcon}
                  style={{ backgroundColor: "#EBF1FF" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      opacity="0.4"
                      d="M22 7.81V13.9L20.37 12.5C19.59 11.83 18.33 11.83 17.55 12.5L13.39 16.07C12.61 16.74 11.35 16.74 10.57 16.07L10.23 15.79C9.52 15.17 8.39 15.11 7.59 15.65L2.67 18.95L2.56 19.03C2.19 18.23 2 17.28 2 16.19V7.81C2 4.17 4.17 2 7.81 2H16.19C19.83 2 22 4.17 22 7.81Z"
                      fill="#4B4AD5"
                    />
                    <path
                      d="M9.00012 10.3801C10.3146 10.3801 11.3801 9.31456 11.3801 8.00012C11.3801 6.68568 10.3146 5.62012 9.00012 5.62012C7.68568 5.62012 6.62012 6.68568 6.62012 8.00012C6.62012 9.31456 7.68568 10.3801 9.00012 10.3801Z"
                      fill="#4B4AD5"
                    />
                    <path
                      d="M21.9996 13.8996V16.1896C21.9996 19.8296 19.8296 21.9996 16.1896 21.9996H7.80957C5.25957 21.9996 3.41957 20.9296 2.55957 19.0296L2.66957 18.9496L7.58957 15.6496C8.38957 15.1096 9.51957 15.1696 10.2296 15.7896L10.5696 16.0696C11.3496 16.7396 12.6096 16.7396 13.3896 16.0696L17.5496 12.4996C18.3296 11.8296 19.5896 11.8296 20.3696 12.4996L21.9996 13.8996Z"
                      fill="#4B4AD5"
                    />
                  </svg>
                </div>
                <div className={styles.attachOptionText}>
                  Upload from gallery
                </div>
                <div className={styles.attachOptionArrow}>{rightArrowSvg}</div>
              </div>
              <div
                className={styles.attachOption}
                onClick={() => handleFileSelect(activeUploadType)}
              >
                <div
                  className={styles.attachOptionIcon}
                  style={{ backgroundColor: "#E8F2FF" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="25"
                    viewBox="0 0 24 25"
                    fill="none"
                  >
                    <path
                      opacity="0.4"
                      d="M20.5 10.69H17.61C15.24 10.69 13.31 8.76 13.31 6.39V3.5C13.31 2.95 12.86 2.5 12.31 2.5H8.07C4.99 2.5 2.5 4.5 2.5 8.07V16.93C2.5 20.5 4.99 22.5 8.07 22.5H15.93C19.01 22.5 21.5 20.5 21.5 16.93V11.69C21.5 11.14 21.05 10.69 20.5 10.69Z"
                      fill="#4B4AD5"
                    />
                    <path
                      d="M15.7997 2.71048C15.3897 2.30048 14.6797 2.58048 14.6797 3.15048V6.64048C14.6797 8.10048 15.9197 9.31048 17.4297 9.31048C18.3797 9.32048 19.6997 9.32048 20.8297 9.32048C21.3997 9.32048 21.6997 8.65048 21.2997 8.25048C19.8597 6.80048 17.2797 4.19048 15.7997 2.71048Z"
                      fill="#4B4AD5"
                    />
                  </svg>
                </div>
                <div className={styles.attachOptionText}>Upload from files</div>
                <div className={styles.attachOptionArrow}>{rightArrowSvg}</div>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default UploadProofStep;
