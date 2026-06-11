/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useEffect,
  useState,
  useRef,
  useContext,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from "react";
import { message } from "antd";
import CashManagerContext from "../../../context/CashManagerContext";
import QRCodeGenerator from "./QRCodeGenerator";
import "./UploadWrittenRx.scss";
import { CloudUploadOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { useOphthalSnapRxSession } from "../context/SnapRxSessionContext";
import { getShortLink } from "../../../redux/shortLinkSlice";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import FileUploadErrorModal from "../../../components/common/FileUploadErrorModal";
import { compressedFile as compressFile } from "../../../utils/utils";

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
    const { fileUploadToken } = useSelector((state) => state.ophthalSnapRx);
    const { shortLink } = useSelector((state) => state.shortLink);
    const { patient_data, tcmId, pamId } = useContext(CashManagerContext);
    const [storedFileIdToReplace, setStoredFileIdToReplace] = useState(null);
    const { sessionId } = useOphthalSnapRxSession();
    const dispatch = useDispatch();

    const [isFileLimitError, setIsFileLimitError] = useState(false);
    const [isFileSizeError, setIsFileSizeError] = useState(false);
    const [isFileTypeError, setIsFileTypeError] = useState(false);

    const maxFileSize = 15 * 1024 * 1024; // 15MB
    const maxFileLimit = 50;
    const maxFileSizeInMB = 15;
    const compressionPercentage = 90;
    const minSizeToCompress = 4 * 1024 * 1024; // 4MB

    const handleExceededFileLimit = () => setIsFileLimitError(true);
    const handleFileSizeExceeded = () => setIsFileSizeError(true);

    const handleFiles = async (files) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const newFiles = [];
      let isStoredFileUsed = false;

      const totalFilesForValidation = [...fileArray, ...(uploadedFiles || [])];
      if (totalFilesForValidation.length > maxFileLimit && !storedFileIdToReplace) {
        handleExceededFileLimit();
        return;
      }

      for (const file of fileArray) {
        let compressed = file;

        if (!file.type.match(/^(image|application\/pdf)/)) {
          message.error(`${file.name} is not a valid file type`);
          setIsFileTypeError(true);
          continue;
        }

        if (compressed.size > minSizeToCompress) {
          compressed = await compressFile(file, maxFileSizeInMB, compressionPercentage);
          if (compressed.size > maxFileSize) {
            handleFileSizeExceeded();
            return;
          }
        }

        if (compressed.type === "application/pdf") {
          try {
            const arrayBuffer = await compressed.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

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

              const id =
                storedFileIdToReplace && !isStoredFileUsed
                  ? storedFileIdToReplace
                  : `${Date.now()}_${Math.random()}`;

              const fileObj = {
                file: compressed,
                name: `${file.name?.split(".")[0]} - page ${i}.jpeg`,
                size: file.size,
                type: "image/jpeg",
                preview,
                url: preview,
                fileUrl: preview,
                id,
                rotation: 0,
                zoom: 1,
                crop: { unit: "%", x: 2, y: 2, width: 96, height: 96 },
              };

              if (storedFileIdToReplace) isStoredFileUsed = true;
              newFiles.push(fileObj);
            }
          } catch (err) {
            console.error("Error rendering PDF:", err);
            message.error("Failed to read PDF. Please try another file.");
          }
        } else {
          const preview = URL.createObjectURL(compressed);

          const id =
            storedFileIdToReplace && !isStoredFileUsed
              ? storedFileIdToReplace
              : `${Date.now()}_${Math.random()}`;

          const fileObj = {
            file: compressed,
            name: file.name,
            size: file.size,
            type: file.type,
            preview,
            url: preview,
            fileUrl: preview,
            id,
            rotation: 0,
            zoom: 1,
            crop: { unit: "%", x: 2, y: 2, width: 96, height: 96 },
          };

          if (storedFileIdToReplace) isStoredFileUsed = true;
          newFiles.push(fileObj);
        }
      }

      if (!newFiles.length) return;

      const current = uploadedFiles || [];

      if (!storedFileIdToReplace) {
        const totalFiles = [...current, ...newFiles];
        if (totalFiles.length > maxFileLimit) {
          handleExceededFileLimit();
          return;
        }
        handleUpdatedFiles(totalFiles);
      } else {
        const replaced = current.map((f) =>
          f.id === storedFileIdToReplace
            ? newFiles.find((nf) => nf.id === storedFileIdToReplace) || f
            : f
        );

        const restNew = newFiles.filter((nf) => nf.id !== storedFileIdToReplace);
        const finalFiles = [...replaced, ...restNew];

        if (finalFiles.length > maxFileLimit) {
          handleExceededFileLimit();
          return;
        }

        handleUpdatedFiles(finalFiles);
        setStoredFileIdToReplace(null);
      }

      handlePreviewOpen(true);
    };

    const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
      if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    };

    const handleFileSelect = (e) => {
      handleFiles(e.target.files);
      // reset input so selecting same file again triggers onChange
      e.target.value = "";
    };

    const handleUploadClick = () => {
      // Keep already uploaded files when adding more instead of wiping the list
      if (!isUploadMoreDrawer && !(uploadedFiles || []).length) {
        handleUpdatedFiles([]);
      }
      fileInputRef.current?.click();
    };

    const handleFileEdit = () => handlePreviewOpen(true);

    useImperativeHandle(ref, () => ({
      handleUploadClick: () => handlePreviewOpen(true),
      handleAddMore,
      handleReupload,
      handleRemoveFile,
      handleRotateClick,
      handleFileEdit,
      handleZoomIn,
      handleZoomOut,
    }));

    useEffect(() => {
      if (!fileUploadToken) return;

      const qrData = {
        type: "ophthal_snap_rx_upload",
        schemaKey: "VISUAL_ACUITY_TEST",
        patientId:
          patient_data?.pm_id ||
          patient_data?.patient_id ||
          patient_data?.patient_unique_id,
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
        autoDigitizeRx: profile?.userSettingFlag?.find((f) => f.type === "auto_digitize_rx")?.status,
      };

      const encodedData = encodeURIComponent(JSON.stringify(qrData));
      dispatch(
        getShortLink(
          `${window.location.origin}/ophthal-snap-rx/mobile-upload/?ophthalUploadParams=${encodedData}`
        )
      );
    }, [fileUploadToken, patient_data, userId, tcmId, pamId, sessionId, profile]);

    const generateQRData = useMemo(() => shortLink || "", [shortLink]);

    const handleAddMore = () => {
      if ((uploadedFiles || []).length >= maxFileLimit) {
        handleExceededFileLimit();
        return;
      }
      setStoredFileIdToReplace(null);
      setIsAddMoreClicked(true);
      setTimeout(() => fileInputRef.current?.click(), 0);
    };

    const handleReupload = (fileId) => {
      if (fileId) setStoredFileIdToReplace(fileId);
      setTimeout(() => fileInputRef.current?.click(), 0);
    };

    const handleRemoveFile = async (fileId, showMessage = true, isFileName = false) => {
      const list = uploadedFiles || [];
      const fileToRemove = isFileName
        ? list.find((f) => f.name === fileId)
        : list.find((f) => f.id === fileId);

      if (fileToRemove?.preview?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(fileToRemove.preview);
        } catch {}
      }

      const newFiles = list.filter((f) => (isFileName ? f.name !== fileId : f.id !== fileId));
      handleUpdatedFiles(newFiles);

      if (!newFiles.length) handlePreviewOpen(false);
      if (showMessage) message.info("File removed");
    };

    const handleRotateClick = (fileId) => {
      const list = uploadedFiles || [];
      const target = list.find((f) => f.id === fileId);
      if (!target) return;

      const newRotation = ((target.rotation || 0) + 90) % 360;
      handleUpdatedFiles(
        list.map((f) => (f.id === fileId ? { ...f, rotation: newRotation } : f))
      );
    };

    const handleRetryBtn = () => {
      setIsFileSizeError(false);
      setIsFileLimitError(false);
      setIsFileTypeError(false);
    };

    const handleZoomIn = (fileId) => {
      handleUpdatedFiles(
        (uploadedFiles || []).map((f) =>
          f.id === fileId ? { ...f, zoom: Math.min((f.zoom || 1) + 0.1, 3) } : f
        )
      );
    };

    const handleZoomOut = (fileId) => {
      handleUpdatedFiles(
        (uploadedFiles || []).map((f) =>
          f.id === fileId ? { ...f, zoom: Math.max((f.zoom || 1) - 0.1, 1) } : f
        )
      );
    };

    // Cleanup blob URLs on unmount
    useEffect(() => {
      return () => {
        (uploadedFiles || []).forEach((f) => {
          if (f.preview?.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(f.preview);
            } catch {}
          }
        });
      };
    }, []);

    return (
      <>
        <div
          className={`upload-written-rx-container ${isUploadMoreDrawer ? "p-0" : ""} ${
            !isOpen ? "upload-written-rx-container-pos-abs" : ""
          }`}
        >
          <div className={`ipd-upload-modal-content ${isUploadMoreDrawer ? "border-0" : ""}`}>
            {!isUploadMoreDrawer && (
              <div className="upload-header">
                {showBackButton && (
                  <button className="back-button" onClick={onBack} type="button">
                    ← Back to Files
                  </button>
                )}
                <h2 className="upload-title">Upload Written Rx</h2>
              </div>
            )}

            <div>
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

              <div className="or-separator">
                <span>or</span>
              </div>

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
                  Upload the written prescription (Rx) in PDF, PNG, or JPG format
                </p>
              </div>
            </div>

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
