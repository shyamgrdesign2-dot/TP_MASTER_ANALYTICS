import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Button, Skeleton, message } from "antd";
import MultiCarousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import {
  PlusOutlined,
  CheckOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import "./styles.scss";

import { uploadFiles } from "../../../redux/snapRxDigitizationSlice";
import { useDispatch, useSelector } from "react-redux";
import { trackEvent } from "../../../utils/utils";
import { EVENTS } from "../../../utils/events";
import { ASSETS } from "../../../assets";
const {
  retake: retakeIcon,
  rotate: rotateIcon,
  delete_2: deleteIcon,
  arrowCircle: arrowIcon,
} = ASSETS.images;

const PreviewDrawerMobile = ({
  isOpen,
  onClose,
  uploadedFiles,
  onReupload,
  onRotate,
  onRemove,
  onAddMore,
  onSave,
  isMobile,
  handleUpdatedFiles,
  isAddMoreClicked,
  patientUniqueId,
  sessionId,
  autoDigitizeRx,
}) => {
  const dispatch = useDispatch();
  const { uploadedFiles: uploadedFilesFromRedux } = useSelector(
    (state) => state.snapRx
  );
  const [loading, setLoading] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedFileId, setSelectedFileId] = useState(
    uploadedFiles?.[0]?.id || null
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef(null);
  const imageRefs = useRef(new Map());
  const carouselRef = useRef(null);
  const canvasRefs = useRef(new Map());
  const [actualFiles, setActualFiles] = useState([]);
  const pendingRevokeRef = useRef(null);

  useEffect(() => {
    const newImageRefs = new Map();
    uploadedFiles.forEach((file) => {
      if (imageRefs.current?.has(file.id)) {
        newImageRefs.set(file.id, imageRefs.current.get(file.id));
      } else {
        newImageRefs.set(file.id, React.createRef());
      }
    });
    imageRefs.current = newImageRefs;

    const newCanvasRefs = new Map();
    uploadedFiles.forEach((file) => {
      if (canvasRefs.current?.has(file.id)) {
        newCanvasRefs.set(file.id, canvasRefs.current.get(file.id));
      } else {
        newCanvasRefs.set(file.id, React.createRef());
      }
    });
    canvasRefs.current = newCanvasRefs;
  }, [uploadedFiles]);

  useEffect(() => {
    if (uploadedFiles.length > 0 && selectedFileId === null) {
      setSelectedFileId(uploadedFiles?.[0]?.id);
      setSelectedFileIndex(0);
    }
  }, [uploadedFiles, selectedFileId]);

  useEffect(() => {
    if (isAddMoreClicked) {
      setSelectedFileId(uploadedFiles?.[uploadedFiles.length - 1]?.id);
      setSelectedFileIndex(uploadedFiles.length - 1);
      carouselRef.current?.goToSlide(uploadedFiles.length - 1);
    }
  }, [isAddMoreClicked, uploadedFiles.length]);

  const currentFile = uploadedFiles[selectedFileIndex];
  const imageUrl = currentFile?.fileUrl || currentFile?.preview;
  const imageRotation = currentFile?.rotation || 0;

  useEffect(() => {
    if (imageUrl && !loading) {
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
  }, [imageUrl, loading, imageRotation]);

  useEffect(() => {
    return () => {
      imageRefs.current = null;
      canvasRefs.current = null;
      carouselRef.current = null;
      setSelectedFileIndex(0);
      setSelectedFileId(null);
      setImageLoaded(false);
      setImageError(false);
      setIsSubmitting(false);
      handleUpdatedFiles([]);
      setActualFiles([]);
      clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  const onImageLoad = useCallback((e, fileId) => {
  const { width, height } = e.currentTarget;
  const cw = Math.round(width * 0.8);
  const ch = Math.round(height * 0.8);
  const crop = { unit: 'px', x: Math.round((width - cw)/2), y: Math.round((height - ch)/2), width: cw, height: ch };

  const updated = uploadedFiles.map(f =>
    f.id === fileId && !f.crop ? { ...f, crop } : f
  );

  clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => handleUpdatedFiles(updated), 100);
}, [uploadedFiles, handleUpdatedFiles]);

  const imageLoadHandler = (e, file) => {
    onImageLoad(e, file.id);
    if (pendingRevokeRef.current &&
        pendingRevokeRef.current !== (file.preview || file.fileUrl || file.url)) {
      try { URL.revokeObjectURL(pendingRevokeRef.current); } catch {}
      pendingRevokeRef.current = null;
    }
  }

  const getCroppedImg = async (image, crop, fileId, rotation = 0, fileZoom = 1) => {
    const canvas = canvasRefs.current.get(fileId)?.current;
    if (!canvas || !crop) return null;

    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;

    const scaleX = naturalWidth / image.width;
    const scaleY = naturalHeight / image.height;

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

  const handleLeftArrowClick = () => {
    if (selectedFileIndex > 0) {
      carouselRef.current?.goToSlide(selectedFileIndex - 1);
      setImageLoaded(false);
      setSelectedFileIndex(selectedFileIndex - 1);
      setSelectedFileId(uploadedFiles?.[selectedFileIndex - 1]?.id);
    }
  };

  const handleRightArrowClick = () => {
    if (selectedFileIndex < uploadedFiles.length - 1) {
      carouselRef.current?.goToSlide(selectedFileIndex + 1);
      setImageLoaded(false);
      setSelectedFileIndex(selectedFileIndex + 1);
      setSelectedFileId(uploadedFiles?.[selectedFileIndex + 1]?.id);
    }
  };

  const handleSubmit = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (imageRefs.current?.size) {
      try {
        let updatedCroppedFiles = await Promise.all(
          uploadedFiles.map(async (updatedFile) => {
            if (updatedFile?.crop?.unit === "%") {
              // when the image is not cropped. crop the image to default crop selection of 80%
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

              updatedFile.crop = {
                unit: "px",
                x: cropX,
                y: cropY,
                width: cropWidth + 24,
                height: cropHeight + 24,
              };
            }
            const croppedBlob = await getCroppedImg(
              imageRefs.current?.get(updatedFile.id)?.current,
              updatedFile.crop,
              updatedFile.id,
              updatedFile.rotation || 0
            );
            if (croppedBlob) {
              const croppedFile = new File([croppedBlob], updatedFile.name, {
                type: "image/jpeg",
              });
              const croppedUrl = URL.createObjectURL(croppedBlob);

              return {
                ...updatedFile,
                file: croppedFile,
                url: croppedUrl,
                preview: croppedUrl,
              };
            }
            return updatedFile;
          })
        );
        updatedCroppedFiles = updatedCroppedFiles.map((file) => {
          const newFileName = file?.file?.name.toLowerCase();
          file.file = new File([file.file], newFileName, { type: file.file.type });
          return file;
        })
        const actualFiles = [...uploadedFiles];
        setActualFiles(actualFiles);
        handleUpdatedFiles(updatedCroppedFiles);
        const sendData = {
          files: updatedCroppedFiles,
          patient_unique_id: patientUniqueId,
          session_id: sessionId,
        };
        if (autoDigitizeRx !== null) {
          sendData.auto_digitize_rx = autoDigitizeRx;
        }
        const apiStartTime = Date.now();
        dispatch(uploadFiles(sendData)).then((res) => {
          if (res?.meta?.requestStatus === "fulfilled") {
            setTimeout(() => {
              setIsSubmitting(false);
              onClose({fromPreview: true});
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
        }).catch((error) => {
          console.error("Upload failed:", error);
          message.warning("Failed to upload file(s)");
          setIsSubmitting(false);
        });
      } catch (error) {
        console.error("Error cropping image:", error);
        message.warning("Failed to upload file(s)");
        setIsSubmitting(false);
      }
    } else {
      if (onSave) {
        onSave(uploadedFiles);
      }
    }
  };

  const cropOfFile = useMemo(() => {
    return (
      uploadedFiles?.find((file) => file.id === selectedFileId)?.crop || {}
    );
  }, [uploadedFiles, selectedFileId]);

  const handleCropChange = (newCrop, fileId) => {
    const updatedCropFiles = uploadedFiles?.map((file, _) => {
      if (fileId === file.id) {
        return { ...file, crop: newCrop };
      }
      return file;
    });
    handleUpdatedFiles(updatedCropFiles);
  };

    const rotateImage90 = async (imgEl, direction = 'left') => {
      const src = imgEl.currentSrc || imgEl.src;

      const safeImg = await new Promise((resolve, reject) => {
        const i = new Image();
        if (!src.startsWith('blob:')) i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = src;
      });

      const w = safeImg.naturalWidth || safeImg.width;
      const h = safeImg.naturalHeight || safeImg.height;

      const canvas = document.createElement('canvas');
      canvas.width = h;
      canvas.height = w;

      const ctx = canvas.getContext('2d');
      ctx.translate(h / 2, w / 2);
      ctx.rotate(direction === 'left' ? -Math.PI/2 : Math.PI/2);
      ctx.drawImage(safeImg, -w / 2, -h / 2);

      return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92));
    };

  const asJpegName = (name = 'image') =>
    `${name.replace(/\.(pdf|png|webp|bmp|gif|jpg|jpeg)$/i, '')}.jpeg`;

  const handleRotateClick = async () => {
    const file = uploadedFiles?.[selectedFileIndex];
    if (!file) return;

    const imgEl = imageRefs.current.get(file.id)?.current;
    if (!imgEl) return;

    try {
      const blob = await rotateImage90(imgEl, 'left');
      const newUrl = URL.createObjectURL(blob);

      const newName = asJpegName(file.name);
      const rotatedFile = new File([blob], newName, { type: 'image/jpeg' });

      const prevUrl = file.preview || file.url || file.fileUrl || null;

      const updated = uploadedFiles.map(f =>
        f.id === file.id
          ? {
              ...f,
              name: newName,
              file: rotatedFile,
              preview: newUrl,
              fileUrl: newUrl,
              rotation: 0,
              version: (f.version || 0) + 1,
              crop: { unit: '%', x: 2, y: 2, width: 96, height: 96 },
            }
          : f
      );

      pendingRevokeRef.current = prevUrl;
      handleUpdatedFiles(updated);
    } catch (err) {
      console.log('Rotate failed:', err);
      message.warning('Failed to rotate image');
    }
  };

  
  const handleReuploadClick = () => {
    if (selectedFileId) {
      onReupload(selectedFileId);
    }
  };

  const handleRemoveClick = () => {
    if (selectedFileIndex > 0) {
      carouselRef.current?.goToSlide(selectedFileIndex - 1);
      setSelectedFileIndex(selectedFileIndex - 1);
      setSelectedFileId(uploadedFiles?.[selectedFileIndex - 1]?.id);
      onRemove(selectedFileId);
    } else {
      setSelectedFileIndex(1);
      setSelectedFileId(uploadedFiles?.[1]?.id);
      onRemove(selectedFileId);
    }
  };

  const handleCloseClick = () => {
    onClose({fromPreview: true});
  };

  const responsive = useMemo(
    () => ({
      tablet: {
        breakpoint: { max: 1024, min: 464 },
        items: 1,
        partialVisibilityGutter: 0,
      },
      mobile: {
        breakpoint: { max: 464, min: 0 },
        items: 1,
        partialVisibilityGutter: 0,
      },
    }),
    []
  );

  if (!isOpen || uploadedFiles.length === 0) return null;

  if (isMobile) {
    return (
      <div className="preview-drawer-overlay">
        <div className="preview-drawer-mobile">
          <div className="drawer-header">
            <div className="header-left">
              <div
                onClick={handleCloseClick}
                className="ff-icomoon btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
              >
                <i className="icon-Cross"></i>
              </div>
              <h1 className="drawer-title">Scan Rx</h1>
            </div>
          </div>
          <div className="preview-area">
            {loading ? (
              <div className="skeleton-container">
                <Skeleton.Image className="skeleton-image" active />
              </div>
            ) : imageError ? (
              <div className="error-container">
                <div className="error-content">
                  <div className="error-icon">⚠️</div>
                  <p>Failed to load image</p>
                  <button onClick={onReupload} className="retry-btn">
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="srxm-carousel-container">
                  <MultiCarousel
                    ref={carouselRef}
                    responsive={responsive}
                    autoPlay={false}
                    infinite={false}
                    showDots={uploadedFiles.length > 1}
                    draggable={false}
                    swipeable={false}
                    partialVisible={false}
                    arrows={false}
                    ssr
                    key={`mc-${uploadedFiles.length}`} 
                  >
                    {!isSubmitting &&
                      uploadedFiles.map((file, _) => {
                        const imageUrl = `${file.url || file.preview}`;
                        const imgKey = `${file.id}-${(file.preview||file.fileUrl||file.url)||''}-${file.version||0}`;
                        return (
                          <div
                            key={file.id || imageUrl}
                            className="srxm-crop-container"
                          >
                            {!imageLoaded && selectedFileId === file.id ? (
                              <div className="srxm-slide-loading">
                                <div className="spinner" />
                              </div>
                              ) : null}
                            <ReactCrop
                              key={`rc-${file.id}-${selectedFileId === file.id ? 'active' : 'inactive'}-${file.version||0}`}
                              crop={file.crop || {}}
                              keepSelection
                              onChange={(c) => handleCropChange(c, file.id)}
                              onComplete={(c) => handleCropChange(c, file.id)}
                              className="srxm-react-crop-wrapper"
                            >
                              <img
                                key={imgKey}
                                ref={imageRefs.current?.get(file.id)}
                                src={file.preview || file.fileUrl || file.url}
                                alt="Prescription"
                                className="srxm-prescription-image"
                                onLoad={(e) => {
                                  setImageLoaded((prev) => (selectedFileId === file.id ? true : prev));
                                  imageLoadHandler(e, file);
                                }}
                                style={{ transform: `rotate(${file.rotation || 0}deg)` }}
                              />
                            </ReactCrop>
                            <canvas
                              ref={canvasRefs.current?.get(file.id)}
                              style={{ display: "none" }}
                            />
                          </div>
                        );
                      })}
                    {isSubmitting &&
                      actualFiles.map((file, _) => {
                        return (
                          <div key={file.id} className="srxm-crop-container">
                            <img
                              className="prescription-image-main"
                              src={file.preview}
                              style={{
                                transform: `rotate(${file.rotation}deg)`,
                              }}
                              alt="Prescription"
                            />
                          </div>
                        );
                      })}
                  </MultiCarousel>
                </div>
              </>
            )}
          </div>
          <div className="action-bar">
            <div className="action-buttons">
              <button
                className="action-btn reupload-btn"
                onClick={handleReuploadClick}
              >
                <img
                  src={retakeIcon}
                  alt="retake"
                  className="action-icon retake-icon"
                />
                <div>Retake</div>
              </button>

              <button
                className="action-btn remove-btn"
                onClick={handleRotateClick}
              >
                <img
                  src={rotateIcon}
                  alt="rotate"
                  className="action-icon rotate-icon"
                />
                <div>Rotate</div>
              </button>

              <button
                className="action-btn remove-btn"
                onClick={handleRemoveClick}
              >
                <img
                  src={deleteIcon}
                  alt="delete"
                  className="action-icon delete-icon"
                />
                <div>Delete</div>
              </button>
            </div>
            <div className="footer-actions">
              <Button
                className="footer-cta"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => onAddMore()}
              >
                Scan more
              </Button>
              <Button
                className="footer-cta"
                type="primary"
                disabled={isSubmitting}
                icon={isSubmitting ? <LoadingOutlined /> : <CheckOutlined />}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
        {uploadedFiles.length > 1 && (
          <div className="thumbnails-section-container">
            <div className="thumbnails-section">
              <button
                onClick={handleLeftArrowClick}
                className="arrow-btn left-arrow"
              >
                <img src={arrowIcon} alt="left" className="arrow-icon " />
              </button>

              <div className="page-number-container">
                <div className="page-number">Page</div>
                <div className="page-number">
                  {selectedFileIndex + 1 > uploadedFiles.length
                    ? 1
                    : selectedFileIndex + 1}{" "}
                  / {uploadedFiles.length}
                </div>
              </div>
              <button
                onClick={handleRightArrowClick}
                className="arrow-btn right-arrow"
              >
                <img
                  src={arrowIcon}
                  alt="right"
                  className="arrow-icon rotate-180"
                />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <></>;
};

export default PreviewDrawerMobile;
