import React, { useState, useMemo } from "react";
import { Button, message } from "antd";
import "./UploadedFilesPreview.scss";
import CommonModal from "../../../common/CommonModal";
import { ASSETS } from "../../../assets";
const alertIcon = ASSETS.images.alerticon;

const UploadedFilesPreview = ({ uploadedFiles, onEdit, loading, onDelete }) => {
  const [deletingFile, setDeletingFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showHideModal = (file) => {
    setIsModalOpen((v) => !v);
    setDeletingFile(file);
  };

  const handleDelete = async (file) => {
    try {
      setDeletingFile(file);
      onDelete(file);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error removing file:", error);
      message.error("Failed to remove file");
    } finally {
      setDeletingFile(null);
    }
  };

  const handleEdit = (file) => onEdit(file);

  const DELETE_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isModalOpen}
        onCancel={() => showHideModal(null)}
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
                  onClick={() => handleDelete(deletingFile)}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  Yes Delete
                </div>
                <Button
                  onClick={() => showHideModal(null)}
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
  }, [isModalOpen, deletingFile]);

  if (loading) {
    return (
      <div className="uploaded-files-preview">
        <div className="loading-container">
          <div className="loading-text">Loading uploaded files...</div>
        </div>
      </div>
    );
  }

  if (!uploadedFiles || uploadedFiles.length === 0) return null;

  return (
    <div className="uploaded-files-preview">
      <div className="files-grid">
        {uploadedFiles.map((file, index) => (
          <div key={file.filename || file.name || index} className="file-preview-card">
            <div className="file-header">
              <div className="page-info">
                <span className="page-text">Page {index + 1}</span>
              </div>
              <div className="file-actions">
                <Button
                  icon={<i className="icon-Edit fs-21"></i>}
                  size="small"
                  type="text"
                  className="edit-btn"
                  onClick={() => handleEdit(file)}
                  title="Edit"
                />
                {uploadedFiles?.length > 1 ? (
                  <Button
                    icon={<i className="icon-delete fs-21" style={{ color: "#FC5A5A" }}></i>}
                    size="small"
                    type="text"
                    className="delete-btn"
                    onClick={() => showHideModal(file)}
                    title="Delete"
                  />
                ) : null}
              </div>
            </div>

            <div className="file-content">
              <div className="prescription-preview">
                <img
                  src={file.fileUrl}
                  alt={`Prescription ${index + 1}`}
                  className="prescription-image"
                  onError={(e) => {
                    e.target.style.display = "none";
                    if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                  }}
                />
                <div className="image-error" style={{ display: "none" }}>
                  <div className="error-content">
                    <div className="error-icon">📄</div>
                    <p>Unable to load image</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {DELETE_MODAL}
    </div>
  );
};

export default UploadedFilesPreview;
