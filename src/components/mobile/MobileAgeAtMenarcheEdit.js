import React, { useState, useEffect } from 'react';
import { Drawer, Button, Input } from 'antd';

import './MobileGynecDetailsEdit.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

const { TextArea } = Input;

/**
 * Mobile bottom sheet for editing Age at Menarche details
 * Matches web version's Age at menarche panel
 */
function MobileAgeAtMenarcheEdit({
  visible,
  onClose,
  ageAtMenarche = '',
  menarcheNotes = '',
  onSave
}) {
  const [selectedAge, setSelectedAge] = useState('');
  const [customAge, setCustomAge] = useState('');
  const [notes, setNotes] = useState('');

  // Age options: 7-17 + Custom
  const ageOptions = Array.from({ length: 11 }, (_, i) => ({
    value: String(7 + i),
    label: String(7 + i)
  }));
  ageOptions.push({ value: 'custom', label: 'Custom' });

  useEffect(() => {
    if (visible) {
      const age = ageAtMenarche ? String(ageAtMenarche) : '';
      if (age && !ageOptions.slice(0, -1).some(opt => opt.value === age)) {
        // Custom value
        setCustomAge(age);
        setSelectedAge('custom');
      } else {
        setSelectedAge(age);
        setCustomAge('');
      }
      setNotes(menarcheNotes || '');
    }
  }, [visible, ageAtMenarche, menarcheNotes]);

  const handleSave = async () => {
    let finalAge = '';
    if (selectedAge === 'custom' && customAge) {
      finalAge = customAge;
    } else if (selectedAge && selectedAge !== 'custom') {
      finalAge = selectedAge;
    }

    await onSave?.({
      ageAtMenarche: finalAge ? parseInt(finalAge) : null,
      menarcheNotes: notes.trim()
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
          <h3 className="mobile-gynec-details-title">Age at menarche</h3>
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
            <label className="section-label">Age at Menarche</label>
            <div className="button-grid age-grid">
              {ageOptions.map((option) => {
                const isSelected = selectedAge === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`option-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (option.value === 'custom') {
                        setSelectedAge('custom');
                        setCustomAge('');
                      } else {
                        setSelectedAge(option.value);
                        setCustomAge('');
                      }
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {selectedAge === 'custom' && (
              <Input
                type="number"
                placeholder="Enter age"
                value={customAge}
                onChange={(e) => setCustomAge(e.target.value)}
                className="custom-input"
              />
            )}
          </div>

          <div className="form-section-menarche">
            <label className="section-label">Note</label>
            <TextArea
              placeholder="Enter any specific menarche notes here"
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

export default MobileAgeAtMenarcheEdit;
