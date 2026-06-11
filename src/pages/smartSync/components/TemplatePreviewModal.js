import { Button, Card, Spin } from "antd";
import {
  Worker,
  Viewer,
  RotateDirection,
  ProgressBar,
} from "@react-pdf-viewer/core";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "./TemplatePreviewModal.scss";
import { useEffect, useRef, useState } from "react";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { rotatePlugin } from "@react-pdf-viewer/rotate";

import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from "react-zoom-pan-pinch";
import dayjs from "dayjs";
import CommonModal from "../../../common/CommonModal";
import { deleteCustomSyncPadTemplate } from "../services/uploadService";
import { message } from "antd";
import { ASSETS } from "../../../assets";
const {
  clockwiseDirection: clockwise,
  anticlockwiseDirection: anticlockwise,
  alerticon: alertIcon,
} = ASSETS.images;

const TemplatePreviewModal = ({
  template,
  onClose,
  onEdit,
  onDelete,
  onDownload,
}) => {
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  const [isPdf, setIsPdf] = useState(false);
  const imgRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get all uploaded files
  const uploadedFiles = template?.uploaded_files || [];
  const currentFile = uploadedFiles[currentImageIndex];

  const zoomPluginInstance = zoomPlugin();
  const rotatePluginInstance = rotatePlugin();
  const { Rotate } = rotatePluginInstance;
  const pageNavigationPluginInstance = pageNavigationPlugin();
  const { ZoomIn, ZoomOut } = zoomPluginInstance;

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  useEffect(() => {
    // Initial timeout
    resetControlsTimeout();

    // Keyboard navigation
    const handleKeyPress = (event) => {
      if (!isPdf && uploadedFiles.length > 1) {
        if (event.key === 'ArrowLeft') {
          goToPreviousImage();
        } else if (event.key === 'ArrowRight') {
          goToNextImage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    // Cleanup on unmount
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentImageIndex, isPdf, uploadedFiles.length]);

  useEffect(() => {
    // Check if any file is PDF
    const hasPdf = uploadedFiles.some(file => file?.file_url?.includes(".pdf"));
    
    if (hasPdf) {
      setIsPdf(true);
    } else {
      setIsPdf(false);
      setNumberOfPages(uploadedFiles.length);
      setCurrentPage(currentImageIndex + 1);
    }
  }, [uploadedFiles, currentImageIndex]);

  const rotateLeft = () => {
    setAngle((prevAngle) => prevAngle - 90);
  };

  const rotateRight = () => {
    setAngle((prevAngle) => prevAngle + 90);
  };

  const onLoadSuccess = (pdfDocument) => {
    setNumberOfPages(pdfDocument?.doc?._pdfInfo?.numPages || 0);
  };

  const onPageChange = (e) => {
    setCurrentPage(e.currentPage + 1);
  };

  const handleOnZoom = (zoomCount) => {
    setScale(zoomCount?.scale);
  };

  const handleEdit = () => {
    onEdit(template.id);
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Use the id field as shown in the curl example
      const templateId = template.id;
      
      if (!templateId) {
        throw new Error('Template ID not found');
      }
      
      const result = await deleteCustomSyncPadTemplate(templateId);
      if (result.success) {
        message.success('Template deleted successfully');
        
        // Call the onDelete callback to refresh the parent component
        if (onDelete) {
          onDelete(templateId);
        }
        
        // Close the preview modal
        onClose();
      } else {
        message.error(result.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Error deleting template. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeletePopup(false);
    }
  };

  const toggleDeletePopup = () => {
    setShowDeletePopup(prev => !prev);
  };

  const handleDownload = () => {
    onDownload(template.id);
  };

  // Navigation functions for images
  const goToPreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setAngle(0); // Reset rotation when changing image
    }
  };

  const goToNextImage = () => {
    if (currentImageIndex < uploadedFiles.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setAngle(0); // Reset rotation when changing image
    }
  };

  const Controls = ({ handleImgZoomOut, handleImgZoomIn }) => {
    return (
      <div
        className="controls mb-4 d-flex align-items-center"
        style={{
          background: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          borderRadius: 12,
          columnGap: 30,
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
        }}
      >
        {/* Page Navigation for Images */}
        {!isPdf && uploadedFiles.length > 1 && (
          <>
            <div
              style={{ display: "flex", alignItems: "center", columnGap: "8px" }}
            >
              <Button
                type="text"
                className="btn btn-delete-prescription px-0 focus-none h-100"
                onClick={goToPreviousImage}
                disabled={currentImageIndex === 0}
              >
                <i className="icon-right" style={{ color: currentImageIndex === 0 ? "gray" : "white" }} />
              </Button>
              <Button
                type="text"
                className="btn btn-delete-prescription px-0 focus-none h-100"
                onClick={goToNextImage}
                disabled={currentImageIndex === uploadedFiles.length - 1}
              >
                <i className="icon-right iconrotate180" style={{ color: currentImageIndex === uploadedFiles.length - 1 ? "gray" : "white" }} />
              </Button>
            </div>
            <div>
              <span className="document-separator" />
            </div>
          </>
        )}
        
        <div
          className="document-measurement"
          style={{ display: "flex", alignItems: "center", columnGap: "8px" }}
        >
          <div
            className="document-measurement-box document-measurement"
            style={{ width: 38, textAlign: "center" }}
          >
            {isPdf ? currentPage : currentImageIndex + 1}
          </div>{" "}
          / {isPdf ? numberOfPages : uploadedFiles.length}
        </div>
        <div>
          <span className="document-separator" />
        </div>
        <div
          style={{ display: "flex", alignItems: "center", columnGap: "8px" }}
        >
          <ZoomOut>
            {(props) => (
              <Button
                type="text"
                className="btn btn-delete-prescription px-0 focus-none h-100"
                onClick={isPdf ? props.onClick : handleImgZoomOut}
              >
                <i className="icon-minus" style={{ color: "white" }} />
              </Button>
            )}
          </ZoomOut>
          <span
            className="mx-2 document-measurement document-measurement-box"
            style={{ minWidth: 70, textAlign: "center" }}
          >
            {Math.round(scale * 100)}%
          </span>
          <ZoomIn>
            {(props) => (
              <Button
                type="text"
                className="btn btn-delete-prescription px-0 focus-none h-100"
                onClick={isPdf ? props.onClick : handleImgZoomIn}
              >
                <i className="icon-Add" style={{ color: "white" }} />
              </Button>
            )}
          </ZoomIn>
        </div>
        <div>
          <span className="document-separator" />
        </div>
        <div
          style={{ display: "flex", alignItems: "center", columnGap: "8px" }}
        >
          <Rotate direction={RotateDirection.Backward}>
            {(props) => (
              <Button
                type="text"
                className="btn btn-delete-prescription px-0 focus-none h-100"
                onClick={isPdf ? props.onClick : rotateLeft}
              >
                <img src={anticlockwise} alt="anticlockwise-direction" />
              </Button>
            )}
          </Rotate>
          <Rotate direction={RotateDirection.Forward}>
            {(props) => (
              <Button
                type="text"
                className="btn btn-delete-prescription px-0 focus-none h-100"
                onClick={isPdf ? props.onClick : rotateRight}
              >
                <img src={clockwise} alt="clockwise-direction" />
              </Button>
            )}
          </Rotate>
        </div>
      </div>
    );
  };

  const ImageControls = () => {
    const { zoomIn, zoomOut, resetTransform } = useControls();

    const handleImgZoomIn = () => {
      zoomIn();
      setScale((prevScale) => prevScale + 0.2);
    };

    const handleImgZoomOut = () => {
      zoomOut();
      setScale((prevScale) => (prevScale - 0.2 > 1 ? prevScale - 0.2 : 1));
    };

    return (
      <Controls
        handleImgZoomOut={handleImgZoomOut}
        handleImgZoomIn={handleImgZoomIn}
      />
    );
  };

  return (
    <div onMouseMove={resetControlsTimeout}>
      <Card bordered={false} className="search-modalCard">
        <div
          style={{
            position: "sticky",
            top: "0px",
            zIndex: 2,
          }}
        >
          <div
            className="h-60 align-items-center justify-content-between d-flex"
            style={{ background: "#222222" }}
          >
            <div className="align-items-center d-flex">
              <Button
                type="text"
                className="btn btn-delete-prescription px-3 focus-none h-100"
                onClick={onClose}
              >
                <i className="icon-right text-white" />
              </Button>
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <span
                  className="text-white"
                  style={{ fontSize: 16, fontWeight: 500 }}
                >
                  {template?.title || 'Custom RX Template'}
                </span>
                <span className="document-separator" />
                <span className="document-date">
                  {dayjs(template?.created_at).format("DD MMM, YYYY")}
                </span>
                {uploadedFiles.length > 1 && (
                  <>
                    <span className="document-separator" />
                    <span className="document-date">
                      {uploadedFiles.length} Pages
                    </span>
                  </>
                )}
              </div>
            </div>
            <div
              className="align-items-center d-flex gap-4"
              style={{ padding: "20px" }}
            >
              <i
                className="icon-download"
                style={{ cursor: "pointer", color: "white" }}
                onClick={handleDownload}
              />
              <i
                className="icon-delete"
                style={{ cursor: "pointer", color: "white" }}
                onClick={toggleDeletePopup}
              />
              <i
                className="icon-Edit"
                style={{ cursor: "pointer", color: "white" }}
                onClick={handleEdit}
              />
              <Button
                className="btn btn-primary3 btn-text-white px-4 btn-41"
                onClick={onClose}
              >
                {"close"}
              </Button>
            </div>
          </div>
          <div
            className="align-items-start justify-content-between d-flex flex-column"
            style={{
              background: "#222222",
              padding: "0 0 25px 55px",
              rowGap: 10,
              marginTop: -15,
            }}
          >
            {template?.description ? (
              <div className="document-notes">
                <b>Notes</b> : {template.description}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="d-flex flex-column justify-content-center align-items-center">
        {showControls ? <Controls /> : null}

        <div
          className="pdf-container"
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            borderRadius: "10px",
          }}
        >
          {isPdf ? (
            <Worker
              workerUrl={`https://unpkg.com/pdfjs-dist@2.6.347/build/pdf.worker.min.js`}
            >
              <Viewer
                renderLoader={(percentages) => (
                  <Spin
                    style={{
                      position: "absolute",
                      zIndex: 0,
                      left: "50%",
                      top: "50%",
                    }}
                  />
                )}
                fileUrl={currentFile?.file_url}
                plugins={[
                  zoomPluginInstance,
                  rotatePluginInstance,
                  pageNavigationPluginInstance,
                ]}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onDocumentLoad={onLoadSuccess}
                onPageChange={onPageChange}
                onZoom={handleOnZoom}
                defaultScale={scale}
              />
            </Worker>
          ) : (
            <TransformWrapper
              key={currentImageIndex} // Force remount when image changes
              initialScale={1}
              options={{ zoomStep: 0.2 }}
              onTransformed={(e) => {
                // Update scale when transform changes (including pinch zoom)
                setScale(e.state.scale);
              }}
            >
              {({ zoomIn, zoomOut, ...rest }) => (
                <>
                  {showControls && <ImageControls />}
                  <TransformComponent>
                    <div
                      style={{
                        width: "700px",
                        height: "100%",
                        position: "relative",
                        borderRadius: "12px",
                      }}
                    >
                      {currentFile && (
                        <img
                          ref={imgRef}
                          src={currentFile?.file_url}
                          alt={`Template page ${currentImageIndex + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            transform: `rotate(${angle}deg)`,
                            transition: "transform 0.5s",
                          }}
                        />
                      )}
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          )}
        </div>
        
        {/* Image thumbnails for quick navigation */}
        {!isPdf && uploadedFiles.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              padding: "20px",
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: "800px",
            }}
          >
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                onClick={() => {
                  setCurrentImageIndex(index);
                  setAngle(0);
                }}
                style={{
                  width: "60px",
                  height: "60px",
                  border: currentImageIndex === index ? "2px solid #1890ff" : "1px solid #d9d9d9",
                  borderRadius: "4px",
                  overflow: "hidden",
                  cursor: "pointer",
                  opacity: currentImageIndex === index ? 1 : 0.7,
                }}
              >
                <img
                  src={file.file_url}
                  alt={`Page ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {shouldShowDeletePopup && (
        <CommonModal
          isModalOpen={shouldShowDeletePopup}
          onCancel={toggleDeletePopup}
          modalWidth={510}
          title="You may lose your data"
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
                    onClick={handleDelete}
                    className="me-4 text-decoration-underline btn p-0 text-main"
                    style={{
                      pointerEvents: isDeleting ? 'none' : 'auto',
                      opacity: isDeleting ? 0.6 : 1
                    }}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </div>
                  <Button
                    onClick={toggleDeletePopup}
                    className="lh-lg btn btn-primary3 btn-41 px-4"
                    disabled={isDeleting}
                  >
                    <span>No</span>
                  </Button>
                </div>
              </div>
            </>
          }
        />
      )}
    </div>
  );
};

export default TemplatePreviewModal; 