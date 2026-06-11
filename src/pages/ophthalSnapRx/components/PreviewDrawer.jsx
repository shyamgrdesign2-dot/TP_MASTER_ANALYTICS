import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Button, message } from "antd";
import { CloudUploadOutlined, LoadingOutlined } from "@ant-design/icons";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { uploadSnapRxFiles } from "../services/snapRxService";
import { useOphthalSnapRxSession } from "../context/SnapRxSessionContext";
import "./PreviewDrawer.scss";
import CommonModal from "../../../common/CommonModal";

import { useDispatch, useSelector } from "react-redux";
import { trackEvent } from "../../../utils/utils";
import { EVENTS } from "../../../utils/events";
import RotateLeftIcon from "./RotateLeftIcon";
import { resetFileUploadToken } from "../../../redux/ophthalSnapRxDigitizationSlice";
import { ASSETS } from "../../../assets";
const alertIcon = ASSETS.images.alerticon;

const PreviewDrawer = forwardRef(
  (
    {
      isOpen,
      onClose,
      uploadedFiles,
      onCloseDrawer,
      onReupload,
      onRemove,
      onAddMore,
      handleUpdatedFiles,
      isAddMoreClicked,
      uploadedFilesFromStore,
      handleGoBackToMainFiles,
      onZoomIn,
      onZoomOut,
      schemaKey,
      style,
    },
    ref
  ) => {
    const dispatch = useDispatch();
    const { fileUploadToken } = useSelector((s) => s.ophthalSnapRx);

    const [selectedFileIndex, setSelectedFileIndex] = useState(0);
    const [selectedFileId, setSelectedFileId] = useState(uploadedFiles?.[0]?.id || null);
    const [croppedImgDimensions, setCroppedImgDimensions] = useState({});
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isBackModalOpen, setIsBackModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const imageRefs = useRef(new Map());
    const canvasRefs = useRef(new Map());
    const timerRef = useRef(null);

    useEffect(() => {
      const nextImageRefs = new Map();
      (uploadedFiles || []).forEach((f) => {
        nextImageRefs.set(f.id, imageRefs.current.get(f.id) || React.createRef());
      });
      imageRefs.current = nextImageRefs;

      const nextCanvasRefs = new Map();
      (uploadedFiles || []).forEach((f) => {
        nextCanvasRefs.set(f.id, canvasRefs.current.get(f.id) || React.createRef());
      });
      canvasRefs.current = nextCanvasRefs;
    }, [uploadedFiles]);

    useEffect(() => {
      if (uploadedFiles?.length > 0) {
        if (selectedFileId == null || !uploadedFiles.find((f) => f.id === selectedFileId)) {
          setSelectedFileIndex(0);
          setSelectedFileId(uploadedFiles[0].id);
        } else {
          const idx = uploadedFiles.findIndex((f) => f.id === selectedFileId);
          if (idx !== -1) setSelectedFileIndex(idx);
        }
      } else {
        setSelectedFileIndex(0);
        setSelectedFileId(null);
      }
    }, [uploadedFiles, selectedFileId]);

    const handleFileEdit = (file) => {
      // When clicking edit from UploadedFilesPreview (server files),
      // file.filename matches our local working name in most cases.
      const selected = uploadedFiles?.find((f) => (f.filename || f.name) === file.filename);
      if (!selected) return;
      setSelectedFileId(selected.id);
      setSelectedFileIndex(uploadedFiles.findIndex((f) => f.id === selected.id));
    };

    useImperativeHandle(ref, () => ({ handleFileEdit, handleSave }));

    const cropOfFile = useMemo(() => {
      return uploadedFiles?.find((f) => f.id === selectedFileId)?.crop || {};
    }, [uploadedFiles, selectedFileId]);

    useEffect(() => {
      if (isAddMoreClicked && uploadedFiles?.length) {
        const last = uploadedFiles[uploadedFiles.length - 1];
        setSelectedFileId(last.id);
        setSelectedFileIndex(uploadedFiles.length - 1);
      }
    }, [isAddMoreClicked, uploadedFiles?.length]);

    const currentFile = uploadedFiles?.[selectedFileIndex];
    const imageUrl = currentFile?.fileUrl || currentFile?.preview;
    const imageRotation = currentFile?.rotation || 0;

    useEffect(() => {
      if (!imageUrl) return;
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        setImageError(false);
      };
      img.onerror = () => {
        setImageError(true);
        setImageLoaded(false);
      };
      img.src = imageUrl;
    }, [imageUrl, imageRotation, uploadedFiles?.length]);

    const onImageLoad = useCallback(
      (e, fileId) => {
        const { width, height } = e.currentTarget;
        const crop = { unit: "px", x: 0, y: 0, width, height };

        // only set default crop if missing
        const updated = (uploadedFiles || []).map((f) =>
          f.id === fileId && !f.crop ? { ...f, crop } : f
        );

        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => handleUpdatedFiles(updated), 50);
      },
      [uploadedFiles, handleUpdatedFiles]
    );

    const getCroppedImg = async (image, crop, fileId, rotation = 0, totalFile) => {
      const canvas = canvasRefs.current.get(fileId)?.current;
      if (!canvas || !crop) return null;

      const naturalWidth = image.naturalWidth || image.width;
      const naturalHeight = image.naturalHeight || image.height;
      if (!naturalWidth || !naturalHeight) return null;

      let imgWidth = image.width;
      let imgHeight = image.height;
      if (naturalHeight === image.height && totalFile?.manualHeight) imgHeight = totalFile.manualHeight;
      if (naturalWidth === image.width && totalFile?.manualWidth) imgWidth = totalFile.manualWidth;

      const scaleX = naturalWidth / imgWidth;
      const scaleY = naturalHeight / imgHeight;

      const rotatedCanvas = document.createElement("canvas");
      const rotatedCtx = rotatedCanvas.getContext("2d");
      rotatedCanvas.width = naturalWidth;
      rotatedCanvas.height = naturalHeight;

      rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      rotatedCtx.rotate((rotation * Math.PI) / 180);
      rotatedCtx.drawImage(image, -naturalWidth / 2, -naturalHeight / 2);

      const nextWidth = crop.width * scaleX;
      const nextHeight = crop.height * scaleY;
      if (!nextWidth || !nextHeight) return null;

      canvas.width = nextWidth;
      canvas.height = nextHeight;

      const cropX = crop.x * scaleX;
      const cropY = crop.y * scaleY;

      canvas.getContext("2d").drawImage(
        rotatedCanvas,
        cropX,
        cropY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
      });
    };

    const showHideBackModal = () => setIsBackModalOpen((v) => !v);
    const showHideDeleteModal = () => setIsDeleteModalOpen((v) => !v);

    const { setHasUploadedFiles } = useOphthalSnapRxSession();
    const canvasRef = useRef(null);

    const handleCropChange = (newCrop, fileId) => {
      const updated = (uploadedFiles || []).map((f) => {
        if (f.id !== fileId) return f;
        setCroppedImgDimensions((prev) => ({
          ...prev,
          [f.id]: {
            width: imageRefs.current.get(f.id)?.current?.width,
            height: imageRefs.current.get(f.id)?.current?.height,
          },
        }));
        return { ...f, crop: newCrop };
      });
      handleUpdatedFiles(updated);
    };

    const rotateImage90 = (imgEl, direction = "left") => {
      const cw = imgEl.naturalWidth || imgEl.width;
      const ch = imgEl.naturalHeight || imgEl.height;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = ch;
      canvas.height = cw;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      const angle = direction === "left" ? -Math.PI / 2 : Math.PI / 2;
      ctx.rotate(angle);
      ctx.drawImage(imgEl, -cw / 2, -ch / 2);

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          resolve(blob);
        }, "image/jpeg", 0.92);
      });
    };

    const asJpegName = (name = "image") => {
      const base = name.replace(/\.(pdf|png|webp|bmp|gif|jpg|jpeg)$/i, "");
      return `${base}.jpeg`;
    };

    const handleRotateLeft = async () => {
      const file = uploadedFiles?.[selectedFileIndex];
      if (!file) return;

      const imgEl = imageRefs.current.get(file.id)?.current;
      if (!imgEl) return;

      try {
        const blob = await rotateImage90(imgEl, "left");
        const url = URL.createObjectURL(blob);

        if (file.preview?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(file.preview);
          } catch {}
        }

        const newName = asJpegName(file.name);
        const rotatedFile = new File([blob], newName, { type: "image/jpeg" });

        const updated = uploadedFiles.map((f) =>
          f.id === file.id
            ? {
                ...f,
                name: newName,
                filename: newName,
                file: rotatedFile,
                fileUrl: url,
                preview: url,
                rotation: 0,
                crop: { unit: "%", x: 2, y: 2, width: 96, height: 96 },
              }
            : f
        );

        handleUpdatedFiles(updated);
      } catch (err) {
        console.error("Rotate failed:", err);
        message.warning("Failed to rotate image");
      }
    };

    const handleReuploadLocal = () => onReupload(selectedFileId);

    const handleRemoveFileLocal = () => {
      const fileToRemove = uploadedFiles?.[selectedFileIndex];
      if (!fileToRemove) return;

      if (uploadedFiles?.length === 1 && uploadedFilesFromStore?.length > 0) {
        message.warning("You cannot delete the only file. Please reupload the file.");
        return;
      }

      // First remove
      onRemove(fileToRemove);

      // Then update selection safely based on next list (optimistic)
      const nextList = (uploadedFiles || []).filter((f) => f.id !== fileToRemove.id);
      if (!nextList.length) {
        setSelectedFileIndex(0);
        setSelectedFileId(null);
        return;
      }

      const nextIndex = Math.min(selectedFileIndex, nextList.length - 1);
      setSelectedFileIndex(nextIndex);
      setSelectedFileId(nextList[nextIndex].id);
    };

    const handleAddMoreFiles = () => onAddMore();

    const handleBackAndCleanup = () => {
      handleGoBackToMainFiles();
      setIsDeleteModalOpen(false);
      setIsBackModalOpen(false);
      onClose();
    };

    const BACK_MODAL = useMemo(() => {
      return (
        <CommonModal
          isModalOpen={isBackModalOpen}
          onCancel={showHideBackModal}
          modalWidth={500}
          title={"Are you sure you want to go back?"}
          modalBody={
            <>
              <div className="alert-warning rounded-10px p-2 patient-details">
                <div className="d-flex align-items-center">
                  <img className="me-3" src={alertIcon} alt="Warning" />
                  <span>
                    You have unsaved uploads. If you go back now, your uploaded data will not be saved.
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="d-flex align-items-center mt-2 justify-content-end">
                  <div onClick={handleBackAndCleanup} className="me-4 text-decoration-underline btn p-0 text-main">
                    Yes, Go Back
                  </div>
                  <Button onClick={showHideBackModal} type="primary" className="lh-lg btn btn-primary3 btn-41 px-4">
                    <span>No, Stay</span>
                  </Button>
                </div>
              </div>
            </>
          }
        />
      );
    }, [isBackModalOpen]);

    const DELETE_MODAL = useMemo(() => {
      return (
        <CommonModal
          isModalOpen={isDeleteModalOpen}
          onCancel={showHideDeleteModal}
          modalWidth={500}
          title={"You may lose your data"}
          modalBody={
            <>
              <div className="alert-warning rounded-10px p-2 patient-details">
                <div className="d-flex align-items-center">
                  <img className="me-3" src={alertIcon} alt="Warning" />
                  <span>Are you sure you want to delete this page?</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="d-flex align-items-center mt-2 justify-content-end">
                  <div
                    onClick={() => {
                      handleRemoveFileLocal();
                      showHideDeleteModal();
                    }}
                    className="me-4 text-decoration-underline btn p-0 text-main"
                  >
                    Yes Delete
                  </div>
                  <Button onClick={showHideDeleteModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                    <span>No</span>
                  </Button>
                </div>
              </div>
            </>
          }
        />
      );
    }, [isDeleteModalOpen, uploadedFiles, selectedFileIndex]);

    const handleSave = async (e) => {
      e?.stopPropagation();
      e?.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        const allUpdatedFiles = await Promise.all(
          (uploadedFiles || []).map(async (file) => {
            const imageRef = imageRefs.current?.get(file.id);

            if (!imageRef?.current) return file;

            // default crop
            if (!file.crop || Object.keys(file.crop).length === 0) {
              return {
                ...file,
                crop: { unit: "%", x: 0, y: 0, width: 100, height: 100 },
              };
            }

            return file;
          })
        );

        let updatedCroppedFiles = await Promise.all(
          allUpdatedFiles.map(async (f) => {
            let crop = f.crop;

            // If % crop convert to px based on rendered img size
            if (crop?.unit === "%") {
              const imgEl = imageRefs.current?.get(f.id)?.current;
              const cw = imgEl?.width || 0;
              const ch = imgEl?.height || 0;
              crop = {
                unit: "px",
                x: (crop.x * cw) / 100,
                y: (crop.y * ch) / 100,
                width: (crop.width * cw) / 100,
                height: (crop.height * ch) / 100,
              };
            }

            const blob = await getCroppedImg(
              imageRefs.current?.get(f.id)?.current,
              crop,
              f.id,
              f.rotation || 0,
              f
            );

            const finalName = asJpegName(f.name);

            if (blob) {
              const croppedFile = new File([blob], finalName.toLowerCase(), { type: "image/jpeg" });
              return croppedFile;
            }

            // fallback: if we somehow don't have cropped blob, skip safely
            throw new Error("Failed to crop image");
          })
        );

        const apiStartTime = Date.now();

        const response = await uploadSnapRxFiles(
          updatedCroppedFiles,
          fileUploadToken,
          schemaKey
        );

        if (response?.uploaded_files?.length > 0) {
          setTimeout(() => {
            setIsSubmitting(false);
            onCloseDrawer();
            handleGoBackToMainFiles();
            setHasUploadedFiles(true);
          }, 300);

          trackEvent(EVENTS.SNAP_RX.uploadSuccess, {
            file_type: "img",
            file_size: updatedCroppedFiles.reduce((acc, f) => acc + f.size, 0),
            upload_time: (Date.now() - apiStartTime) / 1000,
            upload_source: "EMR",
          });
        } else {
          trackEvent(EVENTS.SNAP_RX.uploadFailed);
          message.warning("Failed to upload file(s)");
          setIsSubmitting(false);
        }
      } catch (error) {
        if (error?.response?.status === 401) {
          dispatch(resetFileUploadToken());
          handleGoBackToMainFiles();
        } else {
          message.warning("Failed to upload file(s)");
        }
        setIsSubmitting(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div style={style}>
        <div className="preview-drawer-content">
          <div className="snaprx-preview-container">
            <div className="preview-area">
              {imageError ? (
                <div className="error-container">
                  <div className="error-content">
                    <div className="error-icon">⚠️</div>
                    <p>Failed to load image</p>
                    <button onClick={handleReuploadLocal} className="retry-btn">
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="snaprx-preview-container">
                  <div className="crop-container">
                    <ReactCrop
                      crop={cropOfFile}
                      keepSelection
                      onChange={(newCrop) => handleCropChange(newCrop, selectedFileId)}
                      onComplete={(completedCrop) => handleCropChange(completedCrop, selectedFileId)}
                      className="react-crop-wrapper"
                    >
                      <img
                        ref={imageRefs.current.get(selectedFileId)}
                        src={imageUrl}
                        alt="Prescription"
                        className="prescription-image"
                        onLoad={(e) => onImageLoad(e, selectedFileId)}
                        crossOrigin="anonymous"
                        style={{
                          transform: `scale(${currentFile?.zoom || 1}) rotate(${currentFile?.rotation || 0}deg)`,
                          transformOrigin: "center center",
                        }}
                        onError={() => {
                          setImageError(true);
                          setImageLoaded(false);
                        }}
                      />
                    </ReactCrop>
                  </div>

                  <div className="preview-drawer-action-bar">
                    <div className="srxpd-action-buttons">
                      <button className="action-btn reupload-btn" onClick={handleReuploadLocal}>
                        <span>Reupload</span>
                      </button>

                      <button className="action-btn remove-btn" onClick={handleRemoveFileLocal}>
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="srxpd-zoom-controls">
                      <button className="rotate-btn" onClick={handleRotateLeft}>
                        <RotateLeftIcon />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="thumbnails-section">
            {uploadedFiles?.length ? (
              uploadedFiles.map((file, index) => {
                const thumbUrl = file.fileUrl || file.url || file.preview;
                return (
                  <div
                    key={file.id}
                    className={`thumbnail-item ${index === selectedFileIndex ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedFileId(file.id);
                      setSelectedFileIndex(index);
                    }}
                  >
                    <img
                      src={thumbUrl}
                      alt={`Page ${index + 1}`}
                      className="thumbnail-img"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.target.style.display = "none";
                        const errorDiv = document.createElement("div");
                        errorDiv.className = "thumbnail-error";
                        errorDiv.innerHTML = "⚠️";
                        e.target.parentNode.appendChild(errorDiv);
                      }}
                    />
                    <canvas ref={canvasRefs.current?.get(file.id)} style={{ display: "none" }} />
                  </div>
                );
              })
            ) : (
              <div className="no-files-message">No files to display</div>
            )}

            {uploadedFiles?.length ? (
              <div className="add-more-item" onClick={handleAddMoreFiles}>
                <div className="add-icon">
                  <CloudUploadOutlined className="upload-icon" />
                </div>
                <span className="add-text">Add More</span>
              </div>
            ) : null}
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="preview-drawer-footer">
          <Button
            type="primary"
            className="preview-continue-btn"
            onClick={handleSave}
            icon={isSubmitting ? <LoadingOutlined /> : null}
            loading={isSubmitting}
            disabled={isSubmitting || uploadedFiles?.length === 0}
          >
            Continue
          </Button>
        </div>

        {DELETE_MODAL}
        {BACK_MODAL}
      </div>
    );
  }
);

export default PreviewDrawer;
