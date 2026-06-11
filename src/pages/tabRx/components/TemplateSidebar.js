import React, { useState, useEffect } from 'react';
import { Drawer, Radio, Dropdown, message, Button } from 'antd';
import { MoreOutlined, PlusOutlined, FileTextOutlined, CloseOutlined } from '@ant-design/icons';

import TemplatePreviewModal from '../../smartSync/components/TemplatePreviewModal';
import { getTemplates } from '../services/templateService';
import { deleteCustomSyncPadTemplate } from '../../smartSync/services/uploadService';
import EditTemplateModal from '../../smartSync/components/EditTemplateModal';
import CommonModal from '../../../common/CommonModal';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import axios from 'axios';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../../../utils/constants';

import { generateStandardTemplateBackground } from '../utils/standardTemplateHelper';
import './TemplateSidebar.scss';
import { ASSETS } from "../../../assets";
const {
  eyePreview,
  documentDownload: download,
  documentEdit: edit,
  trash,
  alerticon: alertIcon,
  notesMultiple,
  close: closeIcon,
} = ASSETS.images;

const TemplateSidebar = ({
  visible,
  onClose,
  selectedTemplateId,
  onTemplateSelect,
  lockSelection = false,
  lockedTemplateId = null,
  onAddNew,
  templates = [],
  onTemplatesUpdate,
  profile
}) => {
  const [loading, setLoading] = useState(true);
  const [downloadingTemplateId, setDownloadingTemplateId] = useState(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Parent-driven mode: when parent manages templates state, avoid local refetch loops.
    if (onTemplatesUpdate) {
      setLoading(false);
      return;
    }
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await getTemplates();
      if (result.success) {
        const loadedTemplates = result.data || [];
        if (onTemplatesUpdate) {
          onTemplatesUpdate(loadedTemplates);
        }
      } else {
        message.error(result.error || 'Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      message.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    if (lockSelection && lockedTemplateId && templateId !== lockedTemplateId) {
      return;
    }
    if (onTemplateSelect) {
      onTemplateSelect(templateId);
    }
  };

  const handleAddNew = () => {
    if (onAddNew) {
      onAddNew();
    }
  };

  const handleBlankCanvas = () => {
    if (lockSelection && lockedTemplateId) return;
    handleTemplateSelect('blank');
  };

  const getTemplateThumbnail = (template) => {
    // Get the first page image URL if available
    if (template.uploaded_files && template.uploaded_files.length > 0) {
      const firstFile = template.uploaded_files[0];
      return firstFile.file_url || firstFile.url || null;
    }
    return null;
  };

  // Handle template download
  const handleDownloadTemplate = async (templateId) => {
    setDownloadingTemplateId(templateId);

    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        message.error('Template not found');
        return;
      }

      if (!template.uploaded_files || template.uploaded_files.length === 0) {
        message.error('Template has no files to download');
        return;
      }

      const fileName = `${template.title.replace(/[^a-z0-9]/gi, '_')}_template.pdf`;

      try {
        const pdfBlob = await convertImagesToPDF(template.uploaded_files, template.title);
        saveAs(pdfBlob, fileName);
        message.success(`Downloaded PDF: ${fileName}`, 3);

      } catch (conversionError) {
        message.error(`Failed to convert template to PDF: ${conversionError.message}`, 6);

        try {
          const totalFiles = template.uploaded_files.length;
          message.info(`Downloading ${totalFiles} image(s) individually...`, 2);

          let successCount = 0;
          let failureCount = 0;

          for (let i = 0; i < totalFiles; i++) {
            const file = template.uploaded_files[i];
            const imageFileName = `${template.title.replace(/[^a-z0-9]/gi, '_')}_page_${i + 1}.jpg`;

            try {
              await downloadSingleFile(file.file_url, imageFileName);
              successCount++;

              if (i < totalFiles - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (error) {
              failureCount++;
            }
          }

          if (successCount === totalFiles) {
            message.success(`All ${totalFiles} images downloaded successfully`, 3);
          } else if (successCount > 0) {
            message.warning(`Downloaded ${successCount}/${totalFiles} images. ${failureCount} failed`, 4);
          } else {
            message.error('Failed to download images. Please try again', 4);
          }
        } catch (fallbackError) {
          message.error('Failed to download template images. Please try again', 4);
        }
      }

    } catch (error) {
      message.error(`Failed to download template: ${error.message}. Please try again`);
    } finally {
      setDownloadingTemplateId(null);
    }
  };

  // Convert images to PDF
  const convertImagesToPDF = async (files, templateTitle) => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const imageWidth = pageWidth - (margin * 2);
      const imageHeight = pageHeight - (margin * 2);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          const response = await axios({
            url: file.file_url,
            method: 'GET',
            responseType: 'blob'
          });

          const blob = response.data;
          const reader = new FileReader();

          const imageData = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageData;
          });

          const imgAspectRatio = img.width / img.height;
          let finalWidth = imageWidth;
          let finalHeight = imageWidth / imgAspectRatio;

          if (finalHeight > imageHeight) {
            finalHeight = imageHeight;
            finalWidth = imageHeight * imgAspectRatio;
          }

          const xOffset = (pageWidth - finalWidth) / 2;
          const yOffset = margin + (imageHeight - finalHeight) / 2;

          if (i > 0) {
            pdf.addPage();
          }

          pdf.addImage(imageData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
          throw new Error(`Failed to process image ${i + 1}: ${error.message}`);
        }
      }

      return pdf.output('blob');
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw error;
    }
  };

  // Download single file
  const downloadSingleFile = async (fileUrl, fileName) => {
    try {
      const payload = {
        url: fileUrl,
        method: "GET",
        responseType: "blob",
      };

      const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
      if (token) {
        payload.headers = {
          Authorization: `Bearer ${token.replace(/['"]+/g, "")}`,
        };
      }

      const response = await axios(payload);
      const blob = response.data;
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  };

  // Handle template edit
  const handleEditTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEditTemplate(template);
      setShowEditModal(true);
    } else {
      message.error('Template not found');
    }
  };

  // Handle edit save
  const handleEditSave = async () => {
    setShowEditModal(false);
    setEditTemplate(null);
    // Refresh templates after edit
    await loadTemplates();
  };

  // Handle template delete
  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return;

    setIsDeleting(true);
    const isLastTemplate = templates && templates.length === 1;

    try {
      const result = await deleteCustomSyncPadTemplate(deleteTemplateId);
      if (result.success) {
        message.success('Template deleted successfully');

        // Refresh templates
        await loadTemplates();

        // If deleted template was selected, reset to blank
        if (selectedTemplateId === deleteTemplateId && onTemplateSelect) {
          onTemplateSelect('blank');
        }

        if (isLastTemplate) {
          // If it was the last template, close drawer
          onClose();
        }
      } else {
        message.error(result.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Error deleting template. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteTemplateId(null);
    }
  };

  // Toggle delete modal
  const toggleDeleteModal = (templateId) => {
    if (templateId) {
      setDeleteTemplateId(templateId);
      setShowDeleteModal(true);
    } else {
      setDeleteTemplateId(null);
      setShowDeleteModal(false);
    }
  };

  // ── Preview handlers ──────────────────────────────────────────────────────
  const handleTemplatePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewTemplate(null);
  };

  const handlePreviewTemplateDelete = async () => {
    handleClosePreview();
    await loadTemplates();
  };
  // ─────────────────────────────────────────────────────────────────────────

  const getTemplateMenuItems = (template) => {
    const isDownloading = downloadingTemplateId === template.id;

    return [
      {
        key: 'preview',
        label: (
          <div>
            <img src={eyePreview} alt="preview" className="me-2" />
            Preview
          </div>
        ),
        onClick: (e) => {
          e.domEvent?.stopPropagation();
          handleTemplatePreview(template);
        }
      },
      {
        key: 'download',
        label: (
          <div style={{ opacity: isDownloading ? 0.5 : 1, pointerEvents: isDownloading ? 'none' : 'auto' }}>
            <img src={download} alt="download" className="me-2" />
            {isDownloading ? 'Downloading...' : 'Download'}
          </div>
        ),
        disabled: isDownloading,
        onClick: (e) => {
          e.domEvent?.stopPropagation();
          handleDownloadTemplate(template.id);
        }
      },
      {
        key: 'edit',
        label: (
          <div>
            <img src={edit} alt="edit" className="me-2" />
            Edit
          </div>
        ),
        onClick: (e) => {
          e.domEvent?.stopPropagation();
          handleEditTemplate(template.id);
        }
      },
      {
        key: 'delete',
        label: (
          <div>
            <img src={trash} alt="delete" className="me-2" />
            Delete
          </div>
        ),
        danger: true,
        onClick: (e) => {
          e.domEvent?.stopPropagation();
          toggleDeleteModal(template.id);
        }
      }
    ];
  };

  return (
    <Drawer
      title={null}
      placement="right"
      closable={false}
      onClose={onClose}
      open={visible}
      width={320}
      className="tab-rx-template-drawer"
      mask={false}
      maskClosable={false}
      getContainer={false}
    >
      <div className="tab-rx-template-sidebar">
        <div className="template-sidebar-header">
          <div className='d-flex flex-column justify-content-between align-items-center w-100'>
            <div className="d-flex justify-content-between align-items-center w-100" style={{ borderBottom: "1px solid #e0e0e0", paddingBottom: "15px", padding: "16px 20px" }}>
              <div className="header-left">
                <img src={notesMultiple} alt="Notes" />
                <h3 className="header-title">Select Letterhead</h3>
              </div>
              <button className="header-close" onClick={onClose}>
                <img src={closeIcon} alt="Close" />
              </button>
            </div>

            {/* Add New Letterhead Button */}
            <div className='w-100' style={{ padding: "16px 20px", borderBottom: "1px solid #e0e0e0" }}>
              <button
                className="add-new-letterhead-btn"
                onClick={handleAddNew}
                disabled={lockSelection}
                style={
                  lockSelection
                    ? { opacity: 0.5, pointerEvents: "none", height: "42px" }
                    : { height: "42px" }
                }
              >
                <PlusOutlined className="add-icon" />
                <span className="add-text">Add New Letterhead</span>
              </button>
            </div>
          </div>
        </div>

        <div className="template-sidebar-content">
          {/* Blank Canvas Option */}
          <div
            className={`template-option ${selectedTemplateId === "blank" ? "selected" : ""}`}
            onClick={handleBlankCanvas}
            style={lockSelection && lockedTemplateId ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            <Radio checked={selectedTemplateId === 'blank'} />
            <div className="template-thumbnail blank-thumbnail">
              {/* <div className="blank-canvas-icon">
              <FileTextOutlined />
            </div> */}
            </div>
            <div className="tab-rx-template-info">
              <div className="template-name">Blank Canvas</div>
              <div className="template-meta">1 Page Letterhead</div>
            </div>
          </div>

          {/* Standard Template Option */}
          <div
            className={`template-option ${selectedTemplateId === 'standard' ? 'selected' : ''}`}
            onClick={() => handleTemplateSelect('standard')}
            style={
              lockSelection && lockedTemplateId !== 'standard'
                ? { opacity: 0.5, pointerEvents: 'none' }
                : undefined
            }
          >
            <Radio checked={selectedTemplateId === 'standard'} />
            <div className="template-thumbnail">
              <img src={generateStandardTemplateBackground(profile)} alt="Standard Template" />
            </div>
            <div className="tab-rx-template-info">
              <div className="template-name">Standard Template</div>
              <div className="template-meta">1 Page Letterhead</div>
            </div>
          </div>

          {/* Templates List */}
          {loading ? (
            <div className="templates-loading">Loading templates...</div>
          ) : templates.length > 0 ? (
            templates.map((template) => {
              const thumbnail = getTemplateThumbnail(template);
              const isSelected = selectedTemplateId === template.id;

              return (
                <div
                  key={template.id}
                  className={`template-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleTemplateSelect(template.id)}
                  style={
                    lockSelection && lockedTemplateId !== template.id
                      ? { opacity: 0.5, pointerEvents: 'none' }
                      : undefined
                  }
                >
                  <Radio checked={isSelected} />
                  <div className="template-thumbnail">
                    {thumbnail ? (
                      <img src={thumbnail} alt={template.title} />
                    ) : (
                      <div className="template-placeholder">
                        <FileTextOutlined />
                      </div>
                    )}
                  </div>
                  <div className="tab-rx-template-info">
                    <div className="template-name">{template.title || 'Untitled Template'}</div>
                    <div className="template-meta">
                      {template.uploaded_files?.length || 1} Page Letterhead
                    </div>
                  </div>
                  {!lockSelection && (
                    <Dropdown
                      menu={{ items: getTemplateMenuItems(template) }}
                      trigger={['click']}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="template-menu-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreOutlined />
                      </button>
                    </Dropdown>
                  )}
                </div>
              );
            })
          ) : (
            <div className="templates-empty">
              No templates found. Click "Add New Letterhead" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <CommonModal
          isModalOpen={showDeleteModal}
          onCancel={() => toggleDeleteModal(null)}
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
                    onClick={handleDeleteTemplate}
                    className="me-4 text-decoration-underline btn p-0 text-main"
                    style={{
                      pointerEvents: isDeleting ? 'none' : 'auto',
                      opacity: isDeleting ? 0.6 : 1,
                      cursor: isDeleting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </div>
                  <Button
                    onClick={() => toggleDeleteModal(null)}
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

      {/* Edit Template Modal */}
      {showEditModal && editTemplate && (
        <EditTemplateModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditTemplate(null);
          }}
          template={editTemplate}
          onSave={handleEditSave}
        />
      )}

      {/* Template Preview Drawer */}
      {showPreview && previewTemplate && (
        <Drawer
          closeIcon={false}
          placement="right"
          bodyStyle={{ backgroundColor: "#222222" }}
          onClose={handleClosePreview}
          open={showPreview}
          width="100%"
          height="100%"
          push={false}
        >
          <TemplatePreviewModal
            template={previewTemplate}
            onClose={handleClosePreview}
            onEdit={(templateId) => {
              handleClosePreview();
              handleEditTemplate(templateId);
            }}
            onDelete={handlePreviewTemplateDelete}
            onDownload={handleDownloadTemplate}
          />
        </Drawer>
      )}
    </Drawer>
  );
};

export default TemplateSidebar;
