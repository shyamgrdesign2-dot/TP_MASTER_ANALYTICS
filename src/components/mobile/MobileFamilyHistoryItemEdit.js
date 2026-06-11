import React, { useState, useEffect } from 'react';
import { Drawer, Input, Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';

import './MobileFamilyHistoryItemEdit.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

function MobileFamilyHistoryItemEdit({
  visible,
  onClose,
  item,
  onSave,
  onOpenRelationshipPicker,
  selectedRelationship
}) {
  const [relationship, setRelationship] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible || !item) return;
    setRelationship(item.relationship || '');
    setNote(item.note || '');
  }, [visible, item]);

  // Sync relationship when parent passes back the value chosen in the picker
  useEffect(() => {
    if (selectedRelationship !== undefined) {
      setRelationship(selectedRelationship ?? '');
    }
  }, [selectedRelationship]);

  const handleSave = () => {
    if (!item) return;
    const updatedItem = {
      ...item,
      relationship: relationship,
      note: note.trim()
    };

    onSave?.(updatedItem);
    onClose?.();
  };

  if (!visible || !item) return null;

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="auto"
      className="mobile-family-history-item-edit"
      closable={false}
      maskClosable={true}
    >
      <div className="mobile-item-edit-content">
        <div className="mobile-item-edit-header">
          <h3 className="mobile-item-edit-title">{item?.title || 'Edit Family History'}</h3>
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
            <label className="form-label">Relationship</label>
            <div
              className="relationship-selector"
              onClick={() => onOpenRelationshipPicker?.(relationship)}
            >
              <span className={relationship ? 'relationship-value' : 'relationship-placeholder'}>
                {relationship || 'Select Relationship'}
              </span>
              <DownOutlined />
            </div>
          </div>

          {/* Note Section */}
          <div className="form-section">
            <label className="form-label">Note</label>
            <Input.TextArea
              placeholder="Enter any specific notes here"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="note-textarea"
            />
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

export default MobileFamilyHistoryItemEdit;
