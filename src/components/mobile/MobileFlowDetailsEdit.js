import React, { useState, useEffect } from 'react';
import { Drawer, Button, Input } from 'antd';
import { CLOTS_LIST } from '../../utils/gynec_constants';

import './MobileGynecDetailsEdit.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

const { TextArea } = Input;

/**
 * Mobile bottom sheet for editing Flow details
 * Matches web version's Flow panel
 */
function MobileFlowDetailsEdit({
  visible,
  onClose,
  durationOfMenstrualFlow = '',
  clots = null,
  numberOfPadsPerDay = '',
  flowNotes = '',
  onSave
}) {
  const [selectedDuration, setSelectedDuration] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [selectedClots, setSelectedClots] = useState(null);
  const [selectedPads, setSelectedPads] = useState('');
  const [customPads, setCustomPads] = useState('');
  const [notes, setNotes] = useState('');

  // Duration options: 1-5 + Custom
  const durationOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1)
  }));
  durationOptions.push({ value: 'custom', label: 'Custom' });

  // Pads options: 1-5 + Custom
  const padsOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1)
  }));
  padsOptions.push({ value: 'custom', label: 'Custom' });

  useEffect(() => {
    if (visible) {
      // Load duration
      const duration = durationOfMenstrualFlow ? String(durationOfMenstrualFlow) : '';
      if (duration && !durationOptions.slice(0, -1).some(opt => opt.value === duration)) {
        setCustomDuration(duration);
        setSelectedDuration('custom');
      } else {
        setSelectedDuration(duration);
        setCustomDuration('');
      }

      // Load clots
      setSelectedClots(clots !== null && clots !== undefined ? clots : null);

      // Load pads
      const pads = numberOfPadsPerDay ? String(numberOfPadsPerDay) : '';
      if (pads && !padsOptions.slice(0, -1).some(opt => opt.value === pads)) {
        setCustomPads(pads);
        setSelectedPads('custom');
      } else {
        setSelectedPads(pads);
        setCustomPads('');
      }

      setNotes(flowNotes || '');
    }
  }, [visible, durationOfMenstrualFlow, clots, numberOfPadsPerDay, flowNotes]);

  const handleSave = async () => {
    let finalDuration = '';
    if (selectedDuration === 'custom' && customDuration) {
      finalDuration = customDuration;
    } else if (selectedDuration && selectedDuration !== 'custom') {
      finalDuration = selectedDuration;
    }

    let finalPads = '';
    if (selectedPads === 'custom' && customPads) {
      finalPads = customPads;
    } else if (selectedPads && selectedPads !== 'custom') {
      finalPads = selectedPads;
    }

    await onSave?.({
      durationOfMenstrualFlow: finalDuration ? parseInt(finalDuration) : null,
      clots: selectedClots,
      numberOfPadsPerDay: finalPads ? parseInt(finalPads) : null,
      flowNotes: notes.trim()
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
          <h3 className="mobile-gynec-details-title">Flow</h3>
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
            <label className="section-label">Duration of menstrual flow (in days)</label>
            <div className="button-grid duration-grid">
              {durationOptions.map((option) => {
                const isSelected = selectedDuration === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`option-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (option.value === 'custom') {
                        setSelectedDuration('custom');
                        setCustomDuration('');
                      } else {
                        setSelectedDuration(option.value);
                        setCustomDuration('');
                      }
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {selectedDuration === 'custom' && (
              <Input
                type="number"
                placeholder="Enter days"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="custom-input"
              />
            )}
          </div>

          <div className="form-section-menarche">
            <label className="section-label">Clots</label>
            <div className="button-group clots-group">
              {CLOTS_LIST.map((option) => {
                const isSelected = selectedClots === option.value;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    className={`option-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedClots(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-section-menarche">
            <label className="section-label">Number of Pads Per Day</label>
            <div className="button-grid pads-grid">
              {padsOptions.map((option) => {
                const isSelected = selectedPads === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`option-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (option.value === 'custom') {
                        setSelectedPads('custom');
                        setCustomPads('');
                      } else {
                        setSelectedPads(option.value);
                        setCustomPads('');
                      }
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {selectedPads === 'custom' && (
              <Input
                type="number"
                placeholder="Enter number"
                value={customPads}
                onChange={(e) => setCustomPads(e.target.value)}
                className="custom-input"
              />
            )}
          </div>

          <div className="form-section-menarche">
            <label className="section-label">Note</label>
            <TextArea
              placeholder="Enter any specific flow notes here"
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

export default MobileFlowDetailsEdit;
