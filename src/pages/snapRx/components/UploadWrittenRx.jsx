/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useEffect,
  useState,
  useRef,
  useContext,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from "react";
import { message } from "antd";
import CashManagerContext from "../../../context/CashManagerContext";
import QRCodeGenerator from "./QRCodeGenerator";
import "./UploadWrittenRx.scss";
import { CloudUploadOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import {
  generateFileUploadToken,
  resetFileUploadToken,
  setFileUploadToken,
} from "../../../redux/snapRxDigitizationSlice";
import { useDispatch } from "react-redux";
import { useSnapRxSession } from "../context/SnapRxSessionContext";
import { getShortLink } from "../../../redux/shortLinkSlice";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import FileUploadErrorModal from "../../../components/common/FileUploadErrorModal";
import { compressedFile as compressFile } from "../../../utils/utils";
import { SNAP_RX_TOKENS_STORAGE_KEY } from "../../../utils/constants";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const UploadWrittenRx = forwardRef(
  (
    {
      isOpen,
      showBackButton,
      onBack,
      isUploadMoreDrawer = false,
      fetchUploadedFiles,
      handlePreviewOpen,
      handleUpdatedFiles,
      uploadedFiles,
      setIsAddMoreClicked,
    },
    ref
  ) => {
    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);
    const { userId, profile } = useSelector((state) => state.doctors);
    const { fileUploadToken } = useSelector((state) => state.snapRx);
    const { shortLink } = useSelector((state) => state.shortLink);
    const { patient_data, tcmId, pamId } = useContext(CashManagerContext);
    const [storedFileIdToReplace, setStoredFileIdToReplace] = useState(null);
    const { sessionId } = useSnapRxSession();
    const dispatch = useDispatch();
    const [isFileLimitError, setIsFileLimitError] = useState(false);
    const [isFileSizeError, setIsFileSizeError] = useState(false);
    const [isFileTypeError, setIsFileTypeError] = useState(false);
    const maxFileSize = 15 * 1024 * 1024; // 15MB
    const maxFileLimit = 5;
    const maxFileSizeInMB = 15;
    const compressionPercentage = 90;
    const minSizeToCompress = 4 * 1024 * 1024; // 4MB
    useEffect(() => {
      const tokenKey = `fileUploadToken_${sessionId}_${patient_data?.patient_unique_id}_${userId}`;
      let generateNewToken = false;
      try {
        const tokensObject = localStorage.getItem(SNAP_RX_TOKENS_STORAGE_KEY);
        if (tokensObject) {
          const parsedTokens = JSON.parse(tokensObject);
          const storedToken = parsedTokens[tokenKey];
          if (storedToken) {
            if (storedToken.expiresIn > Date.now()) {
              dispatch(setFileUploadToken(storedToken.value));
            } else {
              delete parsedTokens[tokenKey];
              localStorage.setItem(
                SNAP_RX_TOKENS_STORAGE_KEY,
                JSON.stringify(parsedTokens)
              );
              generateNewToken = true;
            }
          } else {
            generateNewToken = true;
          }
        } else {
          generateNewToken = true;
        }
        if (generateNewToken) {
          dispatch(
            generateFileUploadToken({
              doctor_id: userId,
              patient_unique_id: patient_data?.patient_unique_id,
              session_id: sessionId,
            })
          );
        }
      } catch (error) {
        console.error("Error retrieving token from localStorage:", error);
      }
    }, [userId, patient_data?.patient_unique_id, sessionId]);

    const handleExceededFileLimit = () => {
      setIsFileLimitError(true);
    };

    const handleFileSizeExceeded = () => {
      setIsFileSizeError(true);
    };

    const handleFiles = async (
      files,
      isReupload = false,
      reuploadIndex = null
    ) => {
      // handle files
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const newFiles = [];
      let isStoredFileUsed = false;
      const totalFilesForValidation = [...fileArray, ...uploadedFiles];
      if (
        totalFilesForValidation.length > maxFileLimit &&
        !storedFileIdToReplace
      ) {
        handleExceededFileLimit();
        return;
      }
      for (const file of fileArray) {
        let compressedFile = file;
        if (!file.type.match(/^(image|application\/pdf)/)) {
          message.error(`${file.name} is not a valid file type`);
          setIsFileTypeError(true);
          continue;
        }
        if (compressedFile.size > minSizeToCompress) {
          compressedFile = await compressFile(
            file,
            maxFileSizeInMB,
            compressionPercentage
          );
          if (compressedFile.size > maxFileSize) {
            handleFileSizeExceeded();
            return;
          }
        }

        if (compressedFile.type === "application/pdf") {
          try {
            const arrayBuffer = await compressedFile.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer })
              .promise;
            for (let i = 1; i <= pdfDoc.numPages; i++) {
              const page = await pdfDoc.getPage(i);
              const viewport = page.getViewport({ scale: 1 });
              const maxSize = Math.max(viewport.width, viewport.height);

              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              canvas.width = maxSize;
              canvas.height = maxSize;
              context.fillStyle = "#fff";
              context.fillRect(0, 0, canvas.width, canvas.height);

              const offsetX = (canvas.width - viewport.width) / 2;
              const offsetY = (canvas.height - viewport.height) / 2;

              context.setTransform(1, 0, 0, 1, offsetX, offsetY);

              await page.render({ canvasContext: context, viewport }).promise;

              const preview = canvas.toDataURL("image/jpeg");

              const fileObj = {
                file: compressedFile,
                name: `${file.name?.split(".")[0]} - page ${i}.jpeg`,
                size: file.size,
                type: "image/jpeg",
                preview,
                url: preview,
                id:
                  storedFileIdToReplace && !isStoredFileUsed
                    ? storedFileIdToReplace
                    : Date.now() + Math.random(),
                rotation: 0,
                zoom: 1,
                crop: {
                  unit: "%",
                  x: 2,
                  y: 2,
                  width: 96,
                  height: 96,
                },
              };

              if (storedFileIdToReplace) {
                isStoredFileUsed = true;
              }

              newFiles.push(fileObj);
            }
          } catch (err) {
            console.error("Error rendering PDF:", err);
          }
        } else {
          const preview = URL.createObjectURL(compressedFile);

          const fileObj = {
            file: compressedFile,
            name: file.name,
            size: file.size,
            type: file.type,
            preview,
            url: preview,
            id:
              storedFileIdToReplace && !isStoredFileUsed
                ? storedFileIdToReplace
                : Date.now() + Math.random(),
            rotation: 0,
            zoom: 1,
            crop: {
              unit: "%",
              x: 2,
              y: 2,
              width: 96,
              height: 96,
            },
          };
          if (storedFileIdToReplace) {
            isStoredFileUsed = true;
          }
          newFiles.push(fileObj);
        }
      }

      if (newFiles.length > 0) {
        if (!storedFileIdToReplace) {
          const totalFiles = [...uploadedFiles, ...newFiles];
          if (totalFiles.length > maxFileLimit) {
            handleExceededFileLimit();
            return;
          }
          handleUpdatedFiles(totalFiles);
        } else {
          const finalFiles = uploadedFiles.map((file) => {
            if (file.id === storedFileIdToReplace) {
              return newFiles.find(
                (newFile) => newFile.id === storedFileIdToReplace
              );
            }
            return file;
          });
          finalFiles.push(
            ...newFiles.filter(
              (newFile) => newFile.id !== storedFileIdToReplace
            )
          );
          if (finalFiles.length > maxFileLimit) {
            handleExceededFileLimit();
            return;
          }
          handleUpdatedFiles(finalFiles);
        }
        if (storedFileIdToReplace) {
          setStoredFileIdToReplace(null);
        }
        handlePreviewOpen(true);
      }
    };

    const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      handleFiles(files, false);
    };

    const handleFileSelect = (e) => {
      handleFiles(e.target.files, false);
    };

    const handleUploadClick = (file) => {
      if (!isUploadMoreDrawer) {
        handleUpdatedFiles([]);
      }
      fileInputRef.current?.click();
    };

    const handleFileEdit = (file) => {
      handlePreviewOpen(true);
    };

    useImperativeHandle(ref, () => ({
      handleUploadClick: (file) => {
        handlePreviewOpen(true);
      },
      handleAddMore,
      handleReupload,
      handleRemoveFile,
      handleRotateClick,
      handleFileEdit,
      handleZoomIn,
      handleZoomOut,
    }));

    useEffect(() => {
      if (!fileUploadToken || !patient_data || !userId || !sessionId) {
        return;
      }
      const qrData = {
        type: "snap_rx_upload",
        patientId: patient_data?.patient_unique_id,
        doctorId: userId,
        tcmId: tcmId || 0,
        pamId: pamId || 0,
        timestamp: new Date().toISOString(),
        authToken: fileUploadToken || "",
        patientName: patient_data?.pm_fullname,
        patientGender: patient_data?.pm_gender,
        patientAge: patient_data?.ageYears,
        patientPhone: patient_data?.pm_contact_no,
        sessionId,
        autoDigitizeRx: profile?.userSettingFlag?.find(
          (flag) => flag.type === "auto_digitize_rx"
        )?.status,
      };
      const encodedData = encodeURIComponent(JSON.stringify(qrData));
      dispatch(
        getShortLink(
          `${window.location.origin}/snap-rx/mobile-upload/?uploadParams=${encodedData}`
        )
      );
    }, [
      fileUploadToken,
      patient_data,
      userId,
      tcmId,
      pamId,
      sessionId,
      profile,
    ]);

    const generateQRData = useMemo(() => {
      if (!shortLink) {
        return "";
      }
      console.log('shortLink ==>', shortLink)
      return shortLink;
    }, [shortLink]);

    const handleAddMore = () => {
      if (uploadedFiles.length >= maxFileLimit) {
        handleExceededFileLimit();
        return;
      }
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
      setStoredFileIdToReplace(null);
      setIsAddMoreClicked(true);
    };

    const handleReupload = (fileId) => {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
      if (fileId) {
        setStoredFileIdToReplace(fileId);
      }
    };

    const handleRemoveFile = async (
      fileId,
      showMessage = true,
      isFileName = false
    ) => {
      const fileToRemove = isFileName
        ? uploadedFiles?.find((file) => file.name === fileId)
        : uploadedFiles?.find((file) => file.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      const newFiles = uploadedFiles?.filter((file) =>
        isFileName ? file.name !== fileId : file.id !== fileId
      );
      handleUpdatedFiles(newFiles);
      if (newFiles.length === 0) {
        handlePreviewOpen(false);
      }

      if (showMessage) {
        message.info("File removed");
      }
    };

    const handleRotateClick = (fileId) => {
      const fileToRotate = uploadedFiles?.find((file) => file.id === fileId);
      const newRotation = (fileToRotate.rotation + 90) % 360;
      const newFiles = uploadedFiles?.map((file) => {
        if (file.id === fileId) {
          return { ...file, rotation: newRotation };
        }
        return file;
      });
      handleUpdatedFiles(newFiles);
    };

    const handleSave = (processedFiles) => {
      // handle save
    };

    // Function to clear files when drawer is closed without saving
    const handleClearFiles = () => {
      // handle clear files
    };

    // Cleanup URLs on unmount
    React.useEffect(() => {
      return () => {
        uploadedFiles.forEach((file) => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
      };
    }, []);

    const handleRetryBtn = () => {
      setIsFileSizeError(false);
      setIsFileLimitError(false);
      setIsFileTypeError(false);
    };

    const handleZoomIn = (fileId) => {
      const newFiles = uploadedFiles?.map((file) => {
        if (file.id === fileId) {
          const newZoom = Math.min(file.zoom + 0.1, 3);
          return { ...file, zoom: newZoom };
        }
        return file;
      });
      handleUpdatedFiles(newFiles);
    };

    const handleZoomOut = (fileId) => {
      const newFiles = uploadedFiles?.map((file) => {
        if (file.id === fileId) {
          const newZoom = Math.max(file.zoom - 0.1, 1);
          return { ...file, zoom: newZoom };
        }
        return file;
      });
      handleUpdatedFiles(newFiles);
    };

    return (
      <>
        <div
          className={`upload-written-rx-container ${
            isUploadMoreDrawer ? "p-0" : ""
          } ${!isOpen ? "upload-written-rx-container-pos-abs" : ""}`}
        >
          <div
            className={`upload-modal-content ${
              isUploadMoreDrawer ? "border-0" : ""
            }`}
          >
            {/* Header */}
            {!isUploadMoreDrawer && (
              <div className="upload-header">
                {showBackButton && (
                  <button
                    className="back-button"
                    onClick={onBack}
                    type="button"
                  >
                    ← Back to Files
                  </button>
                )}
                <h2 className="upload-title">Upload Written Rx</h2>
              </div>
            )}
            <div style={{ padding: "1.4rem 2rem" }}>
              {/* QR Code Section */}
              <div className="qr-section">
                <p className="qr-description">
                  Scan this QR to upload written prescription (Rx) directly
                  <br />
                  from your mobile device
                </p>
                <div className="qr-container">
                  <QRCodeGenerator data={generateQRData} size={120} />
                </div>
                <div className="refresh-text">
                  <span className="refresh-separator">
                    After uploading the document, &nbsp;
                    <span className="refresh-link" onClick={fetchUploadedFiles}>
                      Click here to refresh
                    </span>
                  </span>
                </div>
              </div>

              {/* OR Separator */}
              <div className="or-separator">
                <span>or</span>
              </div>

              {/* Upload Section */}
              <div
                className={`upload-section ${dragActive ? "drag-active" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="upload-content">
                  <CloudUploadOutlined className="upload-icon" />
                  <div className="upload-text">
                    <span className="upload-link" onClick={handleUploadClick}>
                      Click to Upload
                    </span>
                    <span className="upload-separator"> or drag and drop</span>
                  </div>
                </div>
                <p className="upload-description">
                  Upload the written prescription (Rx) in PDF, PNG, or JPG
                  format
                </p>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <FileUploadErrorModal
          isFileSizeError={isFileSizeError}
          isFileLimitError={isFileLimitError}
          isFileTypeError={isFileTypeError}
          onRetry={handleRetryBtn}
        />
      </>
    );
  }
);

export default UploadWrittenRx;
