import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Button, message, Drawer } from "antd";
import { CloudUploadOutlined, LoadingOutlined } from "@ant-design/icons";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { uploadSnapRxFiles } from "../services/snapRxService";
import CashManagerContext from "../../../context/CashManagerContext";
import { useSnapRxSession } from "../context/SnapRxSessionContext";
import "./PreviewDrawer.scss";
import CommonModal from "../../../common/CommonModal";

import { useDispatch, useSelector } from "react-redux";
import { trackEvent } from "../../../utils/utils";
import { EVENTS } from "../../../utils/events";
import PlusIcon from "./PlusIcon";
import MinusIcon from "./MinusIcon";
import {
  resetFileUploadToken,
  setUploadedFilesFromStore,
} from "../../../redux/snapRxDigitizationSlice";
import RotateLeftIcon from "./RotateLeftIcon";
import { ASSETS } from "../../../assets";
const alertIcon = ASSETS.images.alerticon;

const PreviewDrawer = forwardRef(
  (
    {
      isOpen,
      onClose,
      uploadedFiles,
      onCloseDrawer,
      editingFile,
      isEditMode = false,
      onReupload,
      tcmId,
      onRotate,
      onRemove,
      onAddMore,
      isUploadMoreDrawer = false,
      handleUpdatedFiles,
      isAddMoreClicked,
      uploadedFilesFromStore,
      handleGoBackToMainFiles,
      onZoomIn,
      onZoomOut,
    },
    ref
  ) => {
    const dispatch = useDispatch();
    const [selectedFileIndex, setSelectedFileIndex] = useState(0);
    const [croppedImgDimensions, setCroppedImgDimensions] = useState({});
    const [selectedFileId, setSelectedFileId] = useState(
      uploadedFiles?.[0]?.id || null
    );
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBackModalOpen, setIsBackModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { fileUploadToken } = useSelector((state) => state.snapRx);
    const imageRefs = useRef(new Map());
    const canvasRefs = useRef(new Map());
    const timerRef = useRef(null);

    useEffect(() => {
      const newImageRefs = new Map();
      uploadedFiles?.forEach((file) => {
        if (imageRefs.current?.has(file.id)) {
          newImageRefs.set(file.id, imageRefs.current.get(file.id));
        } else {
          newImageRefs.set(file.id, React.createRef());
        }
      });
      imageRefs.current = newImageRefs;

      const newCanvasRefs = new Map();
      uploadedFiles?.forEach((file) => {
        if (canvasRefs.current?.has(file.id)) {
          newCanvasRefs.set(file.id, canvasRefs.current.get(file.id));
        } else {
          newCanvasRefs.set(file.id, React.createRef());
        }
      });
      canvasRefs.current = newCanvasRefs;
    }, [uploadedFiles]);

    useEffect(() => {
      if (uploadedFiles?.length > 0 && selectedFileId === null) {
        setSelectedFileId(uploadedFiles?.[0]?.id);
        setSelectedFileIndex(0);
      }
    }, [uploadedFiles, selectedFileId]);

    const handleFileEdit = (file) => {
      const selectedFile = uploadedFiles?.find((f) => f.name === file.filename);
      setSelectedFileId(selectedFile?.id);
      setSelectedFileIndex(
        uploadedFiles?.findIndex((file) => file.id === selectedFile?.id)
      );
    };

    useImperativeHandle(ref, () => ({
      handleFileEdit,
      handleSave,
    }));

    const cropOfFile = useMemo(
      () =>
        uploadedFiles?.find((file) => file.id === selectedFileId)?.crop || {},
      [uploadedFiles, selectedFileId]
    );

    useEffect(() => {
      if (isAddMoreClicked) {
        setSelectedFileId(uploadedFiles?.[uploadedFiles.length - 1]?.id);
        setSelectedFileIndex(uploadedFiles.length - 1);
      }
    }, [isAddMoreClicked, uploadedFiles?.length]);

    useEffect(() => {
      if (uploadedFiles?.length > 0) {
        if (selectedFileIndex >= uploadedFiles.length) {
          const newIndex = uploadedFiles.length - 1;
          setSelectedFileIndex(newIndex);
          setSelectedFileId(uploadedFiles[newIndex]?.id);
        } else if (!uploadedFiles?.find((file) => file.id === selectedFileId)) {
          setSelectedFileIndex(0);
          setSelectedFileId(uploadedFiles[0]?.id);
        }
      } else {
        setSelectedFileIndex(0);
        setSelectedFileId(null);
      }
    }, [uploadedFiles?.length, selectedFileIndex, selectedFileId]);

    const currentFile = uploadedFiles?.[selectedFileIndex];
    const imageUrl = currentFile?.fileUrl || currentFile?.preview;
    const imageRotation = currentFile?.rotation || 0;
    useEffect(() => {
      if (imageUrl) {
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
      }
    }, [imageUrl, imageRotation, uploadedFiles?.length]);

    const onImageLoad = useCallback(
      (e, fileId) => {
        const { width, height } = e.currentTarget;

        const cropWidth  = Math.round(width * 1);
        const cropHeight = Math.round(height * 1);
        const cropX = Math.round((width  - cropWidth)  / 2);
        const cropY = Math.round((height - cropHeight) / 2);
    
        const crop = { unit: 'px', x: cropX, y: cropY, width: cropWidth, height: cropHeight };
    
        const updated = uploadedFiles.map(f =>
          f.id === fileId && !f.crop ? { ...f, crop } : f
        );
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => handleUpdatedFiles(updated), 100);
      },
      [uploadedFiles, handleUpdatedFiles]
    );

    const getCroppedImg = async (image, crop, fileId, rotation = 0, fileZoom = 1, totalFile) => {
      const canvas = canvasRefs.current.get(fileId)?.current;
      if (!canvas || !crop) return null;

      const naturalWidth = image.naturalWidth || image.width;
      const naturalHeight = image.naturalHeight || image.height;

      let imgWidth = image.width;
      let imgHeight = image.height;
      if (naturalHeight === image.height && totalFile?.manualHeight) {
        imgHeight = totalFile.manualHeight;
      }
      if (naturalWidth === image.width && totalFile?.manualWidth) {
        imgWidth = totalFile.manualWidth;
      }

      const scaleX = naturalWidth / imgWidth;
      const scaleY = naturalHeight / imgHeight;

      const rotatedCanvas = document.createElement("canvas");
      const rotatedCtx = rotatedCanvas.getContext("2d");

      // Set canvas dimensions to natural size for rotation
      rotatedCanvas.width = naturalWidth;
      rotatedCanvas.height = naturalHeight;

      rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      rotatedCtx.rotate((rotation * Math.PI) / 180);
      
      rotatedCtx.drawImage(
        image,
        -naturalWidth / 2,
        -naturalHeight / 2
      );

      const finalCanvas = canvas;
      const finalCtx = finalCanvas.getContext("2d");

      finalCanvas.width = crop.width * scaleX;
      finalCanvas.height = crop.height * scaleY;
      const cropX = crop.x * scaleX;
      const cropY = crop.y * scaleY;
      const cropWidth = crop.width * scaleX;
      const cropHeight = crop.height * scaleY;

      finalCtx.drawImage(
        rotatedCanvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        finalCanvas.width,
        finalCanvas.height
      );

      return new Promise((resolve) => {
        finalCanvas?.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.9
        );
      });
    };
    
    const showHideModal = () => {
      setIsModalOpen(!isModalOpen);
    };

    const showHideBackModal = () => {
      setIsBackModalOpen(!isBackModalOpen);
    };

    const showHideDeleteModal = () => {
      setIsDeleteModalOpen(!isDeleteModalOpen);
    };

    const { patient_data } = useContext(CashManagerContext);
    const { sessionId, setHasUploadedFiles } = useSnapRxSession();

    const canvasRef = useRef(null);

    const handleSave = async (e) => {
      e?.stopPropagation();
      e?.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);

      const allUpdatedFiles = await Promise.all(
        uploadedFiles.map(async (file) => {
          const imageRef = imageRefs.current?.get(file.id);
          if (imageRef?.current) {
            if (!file.crop || Object.keys(file.crop)?.length === 0) {
              const defaultCrop = {
                unit: "%",
                x: 0,
                y: 0,
                width: 100,
                height: 100,
              };
              return { ...file, crop: defaultCrop };
            }
          } else {
            return new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                const hiddenImg = document.createElement("img");
                hiddenImg.src = file.fileUrl || file.preview;
                hiddenImg.crossOrigin = "anonymous";
                hiddenImg.style.position = "absolute";
                hiddenImg.style.transform = "translate(-9999px, -9999px)";
                hiddenImg.style.pointerEvents = "none";
                hiddenImg.style.zIndex = "-1";
                document.body.appendChild(hiddenImg);
                if (!imageRefs.current.get(file.id)?.current) {
                  imageRefs.current.set(file.id, { current: hiddenImg });
                }
                const manualDimensions = {
                  manualWidth: croppedImgDimensions?.[file.id]?.width,
                  manualHeight: croppedImgDimensions?.[file.id]?.height,
                };
                if (!file.crop || Object.keys(file.crop)?.length === 0) {
                  const defaultCrop = {
                    unit: "%",
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 100,
                  };
                  return { ...file, crop: defaultCrop, ...manualDimensions };
                }
                resolve({ ...file, ...manualDimensions });
                return { ...file, ...manualDimensions };
              };
              img.onerror = () => {
                console.error(`Failed to load image for file ${file.id}`);
                resolve();
              };
              img.src = file.fileUrl || file.preview;
            });
          }
          return file;
        })
      );

      if (imageRefs.current?.size) {
        try {
          let updatedCroppedFiles = await Promise.all(
            allUpdatedFiles.map(async (updatedFile) => {
              if (updatedFile?.crop?.unit === "%") {
                const cropWidth =
                  (updatedFile?.crop?.width *
                    imageRefs.current?.get(updatedFile.id)?.current?.width) /
                  100;
                const cropHeight =
                  (updatedFile?.crop?.height *
                    imageRefs.current?.get(updatedFile.id)?.current?.height) /
                  100;
                const cropX =
                  (imageRefs.current?.get(updatedFile.id)?.current?.width -
                    cropWidth) /
                  2;
                const cropY =
                  (imageRefs.current?.get(updatedFile.id)?.current?.height -
                    cropHeight) /
                  2;

                updatedFile = {
                  ...updatedFile,
                  crop: {
                    unit: "px",
                    x: cropX,
                    y: cropY,
                    width: cropWidth,
                    height: cropHeight,
                  },
                };
              }
              const croppedBlob = await getCroppedImg(
                imageRefs.current?.get(updatedFile.id)?.current,
                updatedFile.crop,
                updatedFile.id,
                updatedFile.rotation || 0,
                updatedFile.zoom || 1,
                updatedFile
              );
              if (croppedBlob) {
                let fileName = updatedFile.name;
                if (fileName?.toLowerCase()?.endsWith(".pdf")) {
                  fileName = fileName.slice(0, -4);
                }
                if (!fileName?.toLowerCase()?.match(/\.(jpeg|jpg|png)$/)) {
                  fileName += ".jpeg";
                }

                const croppedFile = new File([croppedBlob], fileName, {
                  type: "image/jpeg",
                });
                const croppedUrl = URL.createObjectURL(croppedBlob);
                return {
                  ...updatedFile,
                  name: fileName,
                  file: croppedFile,
                  url: croppedUrl,
                  preview: croppedUrl,
                };
              }

              let fileName = updatedFile.name;
              if (fileName.toLowerCase().endsWith(".pdf")) {
                fileName = fileName.slice(0, -4);
              }
              if (!fileName.toLowerCase().match(/\.(jpeg|jpg|png)$/)) {
                fileName += ".jpeg";
              }

              const correctedFile = new File([updatedFile.file], fileName, {
                type: updatedFile.file.type,
              });

              return {
                ...updatedFile,
                name: fileName,
                file: correctedFile,
              };
            })
          );

          const apiStartTime = Date.now();
          updatedCroppedFiles = updatedCroppedFiles.map((file) => {
            const newFileName = file?.file?.name.toLowerCase();
            file.file = new File([file.file], newFileName, { type: file.file.type });
            return file.file;
          })
          const response = await uploadSnapRxFiles(
            updatedCroppedFiles,
            patient_data?.patient_unique_id,
            sessionId,
            fileUploadToken
          );
          if (response) {
            if (response?.uploaded_files?.length > 0) {
              setTimeout(() => {
                setIsSubmitting(false);
                onCloseDrawer();
                handleGoBackToMainFiles();
                setHasUploadedFiles(true);
              }, 500);
              trackEvent(EVENTS.SNAP_RX.uploadSuccess, {
                file_type: "img",
                file_size: updatedCroppedFiles?.reduce(
                  (acc, file) => acc + file.size,
                  0
                ),
                upload_time: (Date.now() - apiStartTime) / 1000,
                upload_source: "EMR",
              });
            } else {
              trackEvent(EVENTS.SNAP_RX.uploadFailed);
              message.warning("Failed to upload file(s)");
              setIsSubmitting(false);
            }
          } else {
            message.warning("Failed to upload file(s)");
            setIsSubmitting(false);
          }
        } catch (error) {
          if (error?.response?.status === 401) { // TODO: INTEL - handle better
            dispatch(resetFileUploadToken());
            handleGoBackToMainFiles();
          } else {
            message.warning("Failed to upload file(s)");
          }
          setIsSubmitting(false);
        }
      }
    };

    const handleCropChange = (newCrop, fileId) => {
      const updatedCropFiles = uploadedFiles?.map((file, _) => {
        if (fileId === file.id) {
          setCroppedImgDimensions({
            ...croppedImgDimensions,
            [file.id]: {
              width: imageRefs.current.get(file.id)?.current?.width,
              height: imageRefs.current.get(file.id)?.current?.height,
              img: imageRefs.current.get(file.id)?.current,
            },
          });
          return { ...file, crop: newCrop };
        }
        return file;
      });
      handleUpdatedFiles(updatedCropFiles);
    };

    const handleZoomIn = () => {
      onZoomIn(selectedFileId);
    };

    const handleZoomOut = () => {
      onZoomOut(selectedFileId);
    };

    const rotateImage90 = (imgEl, direction = 'left') => {
      const cw = imgEl.naturalWidth || imgEl.width;
      const ch = imgEl.naturalHeight || imgEl.height;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = ch;
      canvas.height = cw;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      const angle = direction === 'left' ? -Math.PI / 2 : Math.PI / 2;
      ctx.rotate(angle);
      ctx.drawImage(imgEl, -cw / 2, -ch / 2);

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas toBlob failed'));
          resolve(blob);
        }, 'image/jpeg', 0.92);
      });
    };

    const asJpegName = (name = 'image') => {
      const base = name.replace(/\.(pdf|png|webp|bmp|gif|jpg|jpeg)$/i, '');
      return `${base}.jpeg`;
    };

    const handleRotateLeft = async () => {
      const file = uploadedFiles?.[selectedFileIndex];
      if (!file) return;
    
      const imgEl = imageRefs.current.get(file.id)?.current;
      if (!imgEl) return;
    
      try {
        const blob = await rotateImage90(imgEl, 'left');
        const url = URL.createObjectURL(blob);
    
        if (file.preview?.startsWith('blob:')) {
          try { URL.revokeObjectURL(file.preview); } catch {}
        }
    
        const newName = asJpegName(file.name);
        const rotatedFile = new File([blob], newName, { type: 'image/jpeg' });
    
        const updated = uploadedFiles.map((f) =>
          f.id === file.id
            ? {
                ...f,
                name: newName,
                file: rotatedFile,
                fileUrl: url,
                preview: url,
                rotation: 0,
                crop: { unit: '%', x: 2, y: 2, width: 96, height: 96 },
              }
            : f
        );
        handleUpdatedFiles(updated);
      } catch (err) {
        console.error('Rotate failed:', err);
        message.warning('Failed to rotate image');
      }
    };

    const handleReupload = async () => {
      onReupload(selectedFileId);
    };

    const handleRemoveFile = () => {
      if (uploadedFiles?.length === 1 && uploadedFilesFromStore?.length > 0) {
        message.warning(
          "You cannot delete the only file. Please reupload the file."
        );
        return;
      }
      if (selectedFileIndex > 0) {
        setSelectedFileIndex(selectedFileIndex - 1);
        setSelectedFileId(uploadedFiles?.[selectedFileIndex - 1]?.id);
        onRemove(selectedFileId);
      } else {
        setSelectedFileIndex(1);
        setSelectedFileId(uploadedFiles?.[1]?.id);
        onRemove(selectedFileId);
      }
    };

    const handleAddMoreFiles = () => {
      onAddMore();
    };

    const handleBackAndCleanup = () => {
      handleGoBackToMainFiles();
      dispatch(setUploadedFilesFromStore([]));
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
                    You have unsaved uploads. If you go back now, your uploaded
                    data will not be saved.
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="d-flex align-items-center mt-2 justify-content-end">
                  <div
                    onClick={handleBackAndCleanup}
                    className="me-4 text-decoration-underline btn p-0 text-main"
                  >
                    Yes, Go Back
                  </div>
                  <Button
                    onClick={showHideBackModal}
                    type="primary"
                    className="lh-lg btn btn-primary3 btn-41 px-4"
                  >
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
                  <span>Are you sure you want to delete this template?</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="d-flex align-items-center mt-2 justify-content-end">
                  <div
                    onClick={() => {
                      onRemove(selectedFileIndex);
                      showHideModal();
                    }}
                    className="me-4 text-decoration-underline btn p-0 text-main"
                  >
                    Yes Delete
                  </div>
                  <Button
                    onClick={showHideModal}
                    className="lh-lg btn btn-primary3 btn-41 px-4"
                  >
                    <span>No</span>
                  </Button>
                </div>
              </div>
            </>
          }
        />
      );
    }, [isDeleteModalOpen]);

    // Handle drawer close with cleanup
    const handleDrawerClose = () => {
      onClose();
    };

    // Don't render if not open
    if (!isOpen) {
      return null;
    }

    return (
      <Drawer
        width="45.625rem"
        maxWidth="45.625rem"
        placement="right"
        onClose={handleDrawerClose}
        open={isOpen}
        styles={{
          header: {
            display: "none",
          },
          body: {
            overflow: 'hidden'
          }
        }}
        maskClosable={false}
      >
        <div className="modalCard-header h-60 align-items-center justify-content-between d-flex position-sticky top-0 z-2">
          <div className="align-items-center d-flex h-100">
            <div className="border-end h-100 text-center me-3">
              <div
                onClick={showHideBackModal}
                className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
              >
                <i className="icon-right"></i>
              </div>
            </div>
            <div className="snaprx-drawer-title">
              {isEditMode ? "Edit Rx" : "Rx Preview"}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Button
              type="primary"
              onClick={handleSave}
              icon={isSubmitting ? <LoadingOutlined /> : null}
              loading={isSubmitting}
              disabled={isSubmitting || uploadedFiles?.length === 0}
              className="btn align-items-center d-flex btn-41 btn-primary3 me-20 save-btn"
            >
              Save
            </Button>
          </div>
        </div>
        <div className="preview-drawer-content">
          {/* Main Preview Area */}
          <div className="snaprx-preview-container">
            {/* {!imageLoaded ? (
            <SkeletonComponent />
          ) : ( */}
            <div className="preview-area">
              {imageError ? (
                <div className="error-container">
                  <div className="error-content">
                    <div className="error-icon">⚠️</div>
                    <p>Failed to load image</p>
                    <button onClick={handleReupload} className="retry-btn">
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
                      onChange={(newCrop) =>
                        handleCropChange(newCrop, selectedFileId)
                      }
                      onComplete={(completedCrop) =>
                        handleCropChange(completedCrop, selectedFileId)
                      }
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
                          transform: `scale(${currentFile?.zoom || 1}) rotate(${
                            currentFile?.rotation || 0
                          }deg)`,
                          transformOrigin: "center center",
                        }}
                        onError={(e) => {
                          console.error("Failed to load preview image:", imageUrl);
                          setImageError(true);
                          setImageLoaded(false);
                        }}
                      />
                    </ReactCrop>
                  </div>
                  {/* Action Bar - moved outside preview area */}
                  <div className="preview-drawer-action-bar">
                    <div className="srxpd-action-buttons">
                      <button
                        className="action-btn reupload-btn"
                        onClick={handleReupload}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="17"
                          height="17"
                          viewBox="0 0 17 17"
                          fill="none"
                        >
                          <g clipPath="url(#clip0_252_25491)">
                            <path
                              d="M3.42366 8.62034C3.78835 8.56966 4.12493 8.82401 4.17561 9.1887C4.31855 10.217 4.79633 11.1701 5.53401 11.9006C6.27168 12.631 7.22908 13.0988 8.25862 13.2317C9.28827 13.3645 10.3333 13.1553 11.2323 12.636C11.8237 12.2943 12.3303 11.8305 12.7215 11.2805H11.5155C11.1474 11.2804 10.8494 10.9816 10.8494 10.6135C10.8495 10.2454 11.1474 9.94664 11.5155 9.94651H14.1825C14.5506 9.94656 14.8494 10.2454 14.8494 10.6135V13.2805C14.8493 13.6486 14.5505 13.9465 14.1825 13.9465C13.8143 13.9465 13.5156 13.6486 13.5155 13.2805V12.4319C13.0631 12.972 12.5174 13.4331 11.8992 13.7903C10.747 14.4559 9.40748 14.7242 8.08772 14.5539C6.7681 14.3836 5.541 13.7841 4.59554 12.8479C3.65007 11.9116 3.03851 10.6902 2.8553 9.37229C2.80464 9.00771 3.05914 8.67117 3.42366 8.62034ZM5.79866 3.43772C6.95086 2.77208 8.29047 2.50281 9.61019 2.67307C10.9299 2.84337 12.1568 3.44377 13.1024 4.38011C14.0478 5.31643 14.6594 6.5377 14.8426 7.85569C14.893 8.22022 14.6388 8.55698 14.2742 8.60765C13.9096 8.6583 13.573 8.40298 13.5223 8.03831C13.3793 7.0103 12.9023 6.05777 12.1649 5.32737C11.4272 4.59682 10.469 4.12918 9.43929 3.99632C8.40968 3.86352 7.36457 4.0727 6.46565 4.59202C5.87433 4.93372 5.36751 5.39757 4.9764 5.94749H6.18245C6.55058 5.94749 6.84935 6.2454 6.84944 6.6135C6.84944 6.98169 6.55064 7.2805 6.18245 7.2805H3.51546C3.14743 7.28031 2.84944 6.98158 2.84944 6.6135V3.94749C2.84944 3.57942 3.14743 3.28069 3.51546 3.2805C3.88365 3.2805 4.18245 3.5793 4.18245 3.94749V4.79515C4.63465 4.25516 5.18074 3.79479 5.79866 3.43772Z"
                              fill="#4B4AD5"
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_252_25491">
                              <rect
                                width="16"
                                height="16"
                                fill="white"
                                transform="translate(0.849121 0.61377)"
                              />
                            </clipPath>
                          </defs>
                        </svg>
                        <span>Reupload</span>
                      </button>

                      <button
                        className="action-btn remove-btn"
                        onClick={handleRemoveFile}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="17"
                          height="17"
                          viewBox="0 0 17 17"
                          fill="none"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M5.59317 3.74727L6.04122 2.40311C6.13196 2.13089 6.38672 1.94727 6.67367 1.94727H10.2737C10.5606 1.94727 10.8154 2.13089 10.9061 2.40311L11.3542 3.74727H14.4736C14.8418 3.74727 15.1403 4.04574 15.1403 4.41393C15.1403 4.78212 14.8418 5.0806 14.4736 5.0806H13.9023L13.413 13.398C13.3508 14.4552 12.4754 15.2806 11.4165 15.2806H5.53088C4.47193 15.2806 3.59652 14.4552 3.53433 13.398L3.04507 5.0806H2.48429C2.1161 5.0806 1.81763 4.78212 1.81763 4.41393C1.81763 4.04574 2.1161 3.74727 2.48429 3.74727H5.59317ZM6.99862 3.74727H9.94872L9.79317 3.2806H7.15418L6.99862 3.74727ZM12.5666 5.0806H4.38071L4.86536 13.3197C4.88609 13.6721 5.1779 13.9473 5.53088 13.9473H11.4165C11.7695 13.9473 12.0613 13.6721 12.082 13.3197L12.5666 5.0806ZM9.6083 6.77235C9.63127 6.40487 9.94779 6.1256 10.3153 6.14856C10.6827 6.17153 10.962 6.48804 10.939 6.85552L10.639 11.6555C10.6161 12.023 10.2996 12.3023 9.93209 12.2793C9.56461 12.2563 9.28534 11.9398 9.3083 11.5723L9.6083 6.77235ZM7.63904 11.5723C7.66201 11.9398 7.38273 12.2563 7.01526 12.2793C6.64779 12.3023 6.33127 12.023 6.3083 11.6555L6.0083 6.85552C5.98534 6.48804 6.26461 6.17153 6.63209 6.14856C6.99956 6.1256 7.31607 6.40487 7.33904 6.77235L7.63904 11.5723Z"
                            fill="#FC5A5A"
                          />
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="srxpd-zoom-controls">
                      <button className="rotate-btn" onClick={handleRotateLeft}>
                        <RotateLeftIcon />
                      </button>

                      {/* <div className="zoom-btn-combined">
                        <div className="cursor-pointer" onClick={handleZoomOut}>
                          <MinusIcon />
                        </div>
                        <div className="zoom-divider"></div>
                        <div className="cursor-pointer" onClick={handleZoomIn}>
                          <PlusIcon />
                        </div>
                      </div> */}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* )} */}
          </div>

          {/* Thumbnails Section */}
          <div className="thumbnails-section">
            {uploadedFiles && uploadedFiles?.length > 0 ? (
              uploadedFiles.map((file, index) => {
                const thumbUrl = file.url || file.preview;
                return (
                  <div
                    key={index}
                    className={`thumbnail-item ${
                      index === selectedFileIndex ? "selected" : ""
                    }`}
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
                        console.error("Failed to load thumbnail:", thumbUrl);
                        e.target.style.display = "none";
                        const errorDiv = document.createElement("div");
                        errorDiv.className = "thumbnail-error";
                        errorDiv.innerHTML = "⚠️";
                        e.target.parentNode.appendChild(errorDiv);
                      }}
                    />
                    <canvas
                      ref={canvasRefs.current?.get(file.id)}
                      style={{ display: "none" }}
                    />
                  </div>
                );
              })
            ) : (
              <div className="no-files-message">No files to display</div>
            )}

            {uploadedFiles && uploadedFiles?.length > 0 && (
              <div className="add-more-item" onClick={handleAddMoreFiles}>
                <div className="add-icon">
                  <CloudUploadOutlined className="upload-icon" />
                </div>
                <span className="add-text">Add More</span>
              </div>
            )}
          </div>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {DELETE_MODAL}
        {BACK_MODAL}
      </Drawer>
    );
  }
);

export default PreviewDrawer;
