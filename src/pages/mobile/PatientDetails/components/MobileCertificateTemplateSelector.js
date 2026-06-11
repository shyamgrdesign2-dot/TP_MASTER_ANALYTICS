import React, { useEffect, useCallback, useState } from "react";
import { Button, Spin, message } from "antd";
import { useNavigate } from "react-router-dom";
import { LoadingOutlined } from "@ant-design/icons";
import { Drawer } from "antd";

import { useSelector, useDispatch } from "react-redux";
import { MESSAGE_KEY } from "../../../../utils/constants";

import { listCertificate, deleteCertificate } from "../../../../redux/doctorsSlice";

import { errorMessage } from "../../../../utils/utils";
import './MobileCertificateTemplateSelector.scss';
import { ASSETS } from "../../../../assets";
const {
  alerticon: alertIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;
const closeIcon = ASSETS.mobile.close2;

function MobileCertificateTemplateSelector({
  visible,
  onClose,
  patient_data,
  replace = false,
  selectedTemplate,
  tcu_id,
  onTemplateSelect,
  onCustomCertificateClick,
}) {
  const navigate = useNavigate();
  const { certificateList } = useSelector((state) => state.doctors);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(listCertificate());
  }, [dispatch]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [removeId, setRemoveId] = useState(null);

  const showHideModal = useCallback((id) => {
    setRemoveId(id !== undefined ? id : null);
    setIsModalOpen((prev) => !prev);
  }, []);

  const onDeleteClicked = async (id) => {
    const action = await dispatch(deleteCertificate(id));
    if (action.meta.requestStatus === "fulfilled") {
      message.open({
        key: MESSAGE_KEY,
        type: '',
        className: 'message-appointment',
        content: (
          <div className='d-flex align-items-center'>
            <img src={visitEnd} className='me-3' />
            <div>
              <div className='title-common text-start fontroboto'>Deleted Successfully</div>
              <div className='fontroboto text-start fw-normal mt-1'>Certificate has been successfully deleted.</div>
            </div>
            <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
          </div>
        ),
        duration: 5,
      });
    } else {
      errorMessage(action.error);
    }
  };

  const handleTemplateClick = useCallback((item) => {
    onClose();
    if (onTemplateSelect) {
      onTemplateSelect({ ...item, tcu_id: tcu_id });
    } else {
      navigate(`/certificate`, {
        replace: replace,
        state: {
          patient_data: patient_data,
          certificate_data: { ...item, tcu_id: tcu_id },
        },
      });
    }
  }, [onClose, navigate, replace, patient_data, tcu_id, onTemplateSelect]);

  const handleCustomCertificateClick = useCallback(() => {
    onClose();
    if (onCustomCertificateClick) {
      onCustomCertificateClick();
    } else {
      navigate('/certificate', {
        replace: replace,
        state: { patient_data: patient_data },
      });
    }
  }, [onClose, navigate, replace, patient_data, onCustomCertificateClick]);

  const getInitials = (title) => {
    if (!title) return '';
    const words = title.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return title.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <Drawer
        placement="bottom"
        onClose={onClose}
        open={visible}
        height="auto"
        className="mobile-certificate-template-drawer"
        closable={false}
        maskClosable={true}
        destroyOnClose={true}
      >
        <div className="mobile-certificate-template-content">
          <div className="mobile-certificate-template-header">
            <p className="mobile-certificate-template-title">Select Certificate Template</p>
            <button
              className="mobile-certificate-template-close-btn"
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" className="mobile-certificate-template-close-icon" />
            </button>
          </div>

          <div className="mobile-certificate-template-body">
            <button
              className="mobile-certificate-custom-btn"
              onClick={handleCustomCertificateClick}
              type="button"
            >
              Create Custom Certificate
            </button>
            <div className="mobile-certificate-divider">
              <div className="mobile-certificate-divider-line"></div>
              <p className="mobile-certificate-divider-text">(or) Select Template Below</p>
              <div className="mobile-certificate-divider-line"></div>
            </div>

            <div className="mobile-certificate-template-list">
              {certificateList?.map((item, index) => {
                const isSelected = selectedTemplate == item?.id;
                const canDelete = !item?.pms_default && !isSelected;

                return (
                  <div key={index} className="mobile-certificate-template-item">
                    <div
                      className="mobile-certificate-template-item-content"
                      onClick={() => handleTemplateClick(item)}
                    >
                      <div className="mobile-certificate-template-icon">
                        {item?.icon_image ? (
                          <img src={item?.icon_image} alt={item.title} />
                        ) : (
                          <span>{getInitials(item?.title)}</span>
                        )}
                      </div>
                      <div className="mobile-certificate-template-name">{item.title}</div>
                      {isSelected && (
                        <i className="icon-check mobile-certificate-template-check" />
                      )}
                    </div>
                    {canDelete && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          showHideModal(item?.id);
                        }}
                        className="mobile-certificate-template-delete-btn"
                      >
                        {item.loading ? (
                          <Spin
                            indicator={<LoadingOutlined style={{ fontSize: 22 }} spin />}
                          />
                        ) : (
                          <i className="icon-delete" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Drawer>
      <Drawer
        placement="bottom"
        onClose={showHideModal}
        open={isModalOpen}
        height="auto"
        className="delete-certificate-bottom-sheet"
        closable={false}
        maskClosable={true}
        destroyOnClose={true}
      >
        <div className="delete-certificate-sheet-content">
          <div className="delete-certificate-sheet-header">
            <h3 className="delete-certificate-sheet-title">Delete Certificate</h3>
            <button
              className="delete-certificate-sheet-close-btn"
              onClick={showHideModal}
              type="button"
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" className="delete-certificate-close-icon" />
            </button>
          </div>

          <div className="delete-certificate-sheet-body">
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to delete this certificate?
                </span>
              </div>
            </div>
          </div>

          <div className="delete-certificate-sheet-actions">
            <div className="delete-certificate-actions-row">
              <button
                onClick={() => {
                  onDeleteClicked(removeId);
                  showHideModal();
                }}
                className="delete-certificate-sheet-btn delete-certificate-btn-yes"
                type="button"
              >
                Yes, Delete
              </button>
              <button
                onClick={showHideModal}
                className="delete-certificate-sheet-btn delete-certificate-btn-no"
                type="button"
              >
                No, Keep
              </button>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}

export default React.memo(MobileCertificateTemplateSelector);

