import React, { useState, useEffect } from 'react';
import { Drawer, Button, Input } from 'antd';
import { PAIN_OCCURANCE_LIST } from '../../utils/gynec_constants';

import './MobileGynecDetailsEdit.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

const { TextArea } = Input;

/**
 * Mobile bottom sheet for editing Pain details
 * Matches web version's Pain panel
 */
function MobilePainDetailsEdit({
  visible,
  onClose,
  occurrenceOfPain = '',
  painNotes = '',
  onSave
}) {
  const [selectedOccurrence, setSelectedOccurrence] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedOccurrence(occurrenceOfPain || '');
      setNotes(painNotes || '');
    }
  }, [visible, occurrenceOfPain, painNotes]);

  const handleSave = async () => {
    await onSave?.({
      occurrenceOfPain: selectedOccurrence,
      painNotes: notes.trim()
    });
    // Don't close here - let parent handle closing after save
  };

  if (!visible) return null;

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="auto"
      className="mobile-gynec-details-edit"
      closable={false}
      maskClosable={true}
      zIndex={1001}
    >
      <div className="mobile-gynec-details-content">
        <div className="mobile-gynec-details-header">
          <h3 className="mobile-gynec-details-title">Pain</h3>
          <button
            type="button"
            className="mobile-gynec-details-close"
            onClick={onClose}
          >
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        <div className="mobile-gynec-details-body">
          <div className="form-section-menarche">
            <label className="section-label">Occurrence of pain</label>
            <div className="button-group occurrence-group">
              {PAIN_OCCURANCE_LIST.map((option) => {
                const isSelected = selectedOccurrence === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`option-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedOccurrence(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-section-menarche">
            <label className="section-label">Note</label>
            <TextArea
              placeholder="Enter any specific pain notes here"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={500}
              className="notes-textarea"
            />
          </div>
        </div>

        <div className="mobile-gynec-details-footer">
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

export default MobilePainDetailsEdit;
