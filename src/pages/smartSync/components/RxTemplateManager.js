import React, { useState } from 'react';
import { Button, Card, Dropdown, message, Drawer } from 'antd';
import { Row, Col } from 'react-bootstrap';
import './RxTemplateManager.scss';
import './RxTemplateUploadDrawer.scss';

import CommonModal from '../../../common/CommonModal';
import { deleteCustomSyncPadTemplate } from '../services/uploadService';
import TemplatePreviewModal from './TemplatePreviewModal';
import { ASSETS } from "../../../assets";
const {
  documentDownload: download,
  documentEdit: edit,
  trash,
  alerticon: alertIcon,
} = ASSETS.images;

const RxTemplateManager = ({
  onClose,
  templates,
  onUploadNew,
  onEdit,
  onDelete,
  onDownload,
  onRefresh,
  downloadingTemplateId
}) => {
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleTemplatePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewTemplate(null);
  };

  const handlePreviewTemplateDelete = async (templateId) => {
    // Close the preview modal first
    handleClosePreview();
    
    // Trigger refresh of template list
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <div className="template-manager">
      <Card bordered={false} className="search-modalCard">
          {/* Header Section */}
          <div className="rx-upload-header">
            <div className="rx-upload-header-left" style={{borderRight: "1px solid #e4e4ef"}}>
              <i className="icon-right rx-upload-back" onClick={onClose}></i>
            </div>
            <div className="rx-upload-header-title">Add/Edit Rx Canvas</div>
            <div>
              <Button
                className="btn-41 btn ant-btn-text btn-input"
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
                onClick={onUploadNew}
              >
                <i className="icon-Add" />
                <span>Add New Rx Canvas</span>
              </Button>
            </div>
          </div>

          {/* Template Grid */}
          <div className="d-flex justify-content-center flex-column">
            <Row
              xs={1}
              sm={2}
              md={2}
              lg={3}
              className="gy-4 w-100"
              style={{ padding: "25px" }}
            >
              {templates?.map((template, index) => (
                <Col key={template.id || index} className="gx-4">
                  <TemplateCard
                    template={template}
                    onEdit={() => onEdit(template.id)}
                    onDelete={() => onDelete(template.id)}
                    onDownload={() => onDownload(template.id)}
                    onPreview={() => handleTemplatePreview(template)}
                    onRefresh={onRefresh}
                    isDownloading={downloadingTemplateId === template.id}
                    templates={templates}
                    onClose={onClose}
                  />
                </Col>
              ))}
            </Row>
          </div>
      </Card>

      {/* Template Preview Drawer - Exactly like Medical Records */}
      {showPreview && previewTemplate && (
        <Drawer
          closeIcon={false}
          placement="right"
          bodyStyle={{ backgroundColor: "#222222" }}
          onClose={handleClosePreview}
          open={showPreview}
          width="100%"
          height={"100%"}
          push={false}
        >
          <TemplatePreviewModal
            template={previewTemplate}
            onClose={handleClosePreview}
            onEdit={onEdit}
            onDelete={handlePreviewTemplateDelete}
            onDownload={onDownload}
          />
        </Drawer>
      )}
    </div>
  );
};

// Template Card Component  
const TemplateCard = ({ template, onEdit, onDelete, onDownload, onPreview, onRefresh, isDownloading, templates, onClose }) => {
  const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const isLastTemplate = templates && templates.length === 1;
    
    try {
      
      // Use the id field as shown in the curl example
      const templateId = template.id;
      
      if (!templateId) {
        throw new Error('Template ID not found');
      }
      
      const result = await deleteCustomSyncPadTemplate(templateId);
      if (result.success) {
        message.success('Template deleted successfully');
        
        // Trigger refresh of template list
        if (onRefresh) {
          await onRefresh();
        }
        
        if (isLastTemplate) {
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
      setShowDeletePopup(false);
    }
  };

  const toggleDeletePopup = () => {
    setShowDeletePopup(prev => !prev);
  };

  const getMenuItems = () => [
    {
      key: "download",
      label: (
        <div onClick={onDownload} style={{ opacity: isDownloading ? 0.5 : 1, pointerEvents: isDownloading ? 'none' : 'auto' }}>
          <img src={download} alt="download" className="me-2" />
          {isDownloading ? 'Downloading...' : 'Download'}
        </div>
      ),
      disabled: isDownloading,
    },
    {
      key: "edit",
      label: (
        <div onClick={onEdit}>
          <img src={edit} alt="edit" className="me-2" />
          Edit
        </div>
      ),
    },
    {
      key: "delete",
      label: (
        <div onClick={toggleDeletePopup}>
          <img src={trash} alt="delete" className="me-2" />
          Delete
        </div>
      ),
    },
  ];

  // Get first uploaded file for thumbnail
  const thumbnailUrl = template.uploaded_files?.[0]?.file_url;
  const pageCount = template.uploaded_files?.length || 0;

  return (
    <>
      <div className="image-wrapper">
        <div
          className="image-container"
          style={{
            backgroundImage: thumbnailUrl ? `url('${thumbnailUrl}')` : 'none',
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            position: "relative",
            cursor: "pointer",
          }}
          onClick={() => {
            onPreview();
          }}
        >
          {isDownloading && (
            <div className="downloading-overlay">
              <span>Downloading...</span>
            </div>
          )}
          {!thumbnailUrl && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6c757d'
            }}>
              <i className="icon-template" style={{ fontSize: '32px', marginBottom: '8px' }}></i>
              <div style={{ fontSize: '12px' }}>No Preview</div>
            </div>
          )}
        </div>

        <div className="document-details">
          <div
            className="d-flex justify-content-between flex-column align-items-start"
            style={{ fontSize: "14px", width: "85%", cursor: "pointer" }}
            onClick={() => {
              onPreview();
            }}
          >
            <div className="category">{template.title}</div>
            <div>{pageCount} page{pageCount !== 1 ? 's' : ''}</div>
          </div>
          <div>
            <Dropdown
              className="btn btn-outline btn-more"
              menu={{
                items: getMenuItems(),
              }}
            >
              <div>
                <i className="icon-More" />
              </div>
            </Dropdown>
          </div>
        </div>
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
    </>
  );
};

export default RxTemplateManager; 