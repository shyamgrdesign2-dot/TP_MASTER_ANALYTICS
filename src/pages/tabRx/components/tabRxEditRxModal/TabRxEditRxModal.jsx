import React from 'react';
import { Modal, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import './TabRxEditRxModal.scss';
import { ASSETS } from "../../../../assets";
const {
  alerticon: alertIcon,
  close: closeIcon,
} = ASSETS.images;

const TabRxEditRxModal = ({ isOpen, onCancel, onConfirm }) => {
    return (
        <Modal
            open={isOpen}
            onCancel={onCancel}
            footer={null}
            closeIcon={<img src={closeIcon} alt="Close" className="close-icon flex-shrink-0" style={{ width: '20px', height: '20px' }} />}
            width={465}
            className="tabrx-edit-rx-modal"
            centered
        >
            <div className="tabrx-edit-rx-modal-content">
                <div className="modal-header d-flex justify-content-between align-items-center mb-0">
                    <h3 className="modal-title fontroboto fw-semibold m-0" style={{ fontSize: '16px', color: '#454551' }}>
                        Edit Written Rx?
                    </h3>
                </div>

                <div className="warning-box d-flex align-items-center p-3 rounded-10px" style={{ backgroundColor: '#fffbeb', gap: '20px', marginTop: '16px' }}>
                    <img src={alertIcon} alt="Alert" className="alert-icon flex-shrink-0" style={{ width: '32px', height: '32px' }} />
                    <p className="warning-text m-0 fontroboto" style={{ fontSize: '14px', color: '#454551', lineHeight: '18px', letterSpacing: '0.1px' }}>
                        If you edit the written Rx, <span className="fw-semibold">the digitised Rx will be permanently deleted</span>.
                        You will need to digitise it again after making changes.
                    </p>
                </div>

                <div className="modal-actions d-flex justify-content-end align-items-center mt-4" style={{ gap: '25px' }}>
                    <span className="edit-link text-decoration-underline cursor-pointer fontroboto fw-medium" style={{ fontSize: '14px', color: '#454551' }} onClick={onConfirm}>
                        Edit Written Rx
                    </span>
                    <Button type="primary" className="cancel-btn rounded-10px fw-medium fontroboto border-0" style={{ backgroundColor: '#4b4ad5', height: '44px', padding: '8px 16px', fontSize: '14px' }} onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default TabRxEditRxModal;
