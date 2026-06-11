import React, { useState, useEffect } from 'react';
import { Drawer, Input, Button } from 'antd';

import './MobileAdditionalHistoryEdit.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

const { TextArea } = Input;

function MobileAdditionalHistoryEdit({ 
  visible, 
  onClose, 
  remarks = '',
  onSave 
}) {
  const [text, setText] = useState('');
  const maxLength = 5000;

  useEffect(() => {
    if (visible) {
      setText(remarks || '');
    }
  }, [visible, remarks]);

  const handleSave = async () => {
    await onSave?.(text.trim());
    // Don't close here - let parent handle closing after save
  };

  if (!visible) return null;

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="85vh"
      className="mobile-additional-history-edit"
      closable={false}
      maskClosable={true}
    >
      <div className="mobile-item-edit-content">
        <div className="mobile-item-edit-header">
          <h3 className="mobile-item-edit-title">Additional History</h3>
          <button
            className="mobile-item-edit-close"
            onClick={onClose}
            type="button"
          >
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        <div className="mobile-item-edit-body">
          <div className="form-section">
            <label className="form-label">Additional History Remarks</label>
            <TextArea
              placeholder="Write your additional history"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={maxLength}
              className="additional-history-textarea"
              autoSize={{ minRows: 6, maxRows: 12 }}
            />
            <div className="character-count">
              {text.length}/{maxLength}
            </div>
          </div>
        </div>

        <div className="mobile-item-edit-footer">
          <Button
            type="primary"
            size="large"
            block
            onClick={handleSave}
            className="save-btn"
          >
            Save
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export default MobileAdditionalHistoryEdit;
