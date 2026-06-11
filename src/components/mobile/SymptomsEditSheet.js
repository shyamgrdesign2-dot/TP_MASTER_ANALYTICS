import React, { useState, useEffect } from 'react';
import { Drawer, Input, Button, Select } from 'antd';

import './SymptomsEditSheet.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

const SEVERITY_OPTIONS = [
  { value: 'Severe', label: 'Severe' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Mild', label: 'Mild' },
];

/**
 * Bottom sheet to edit a symptom (name, severity, duration, notes).
 * Matches web SymptomsBox: severity (Severe/Moderate/Mild), duration (Since), notes.
 * Styling matches LabInvestigationEditSheet / PatientDetailsBottomSheet.
 */
function SymptomsEditSheet({ visible, onClose, item, onSave }) {
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState(undefined);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!visible || !item) return;
    const n = typeof item === 'string' ? item : (item?.name || item?.lineItem || item?.symptom_name || '');
    const s = item?.severity || undefined;
    const d = item?.duration || item?.since || '';
    const no = item?.notes ?? item?.note ?? '';
    setName(n);
    setSeverity(s || undefined);
    setDuration(d);
    setNotes(no);
    setNameError('');
  }, [visible, item]);

  const handleSave = () => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      setNameError('Symptom name is required');
      return;
    }
    setNameError('');
    onSave?.({
      name: trimmedName,
      lineItem: trimmedName,
      severity: severity || '',
      duration: (duration || '').trim(),
      notes: (notes || '').trim(),
    });
    onClose?.();
  };

  const handleClose = () => {
    setNameError('');
    onClose?.();
  };

  if (!visible) return null;

  return (
    <Drawer
      placement="bottom"
      onClose={handleClose}
      open={visible}
      height="auto"
      className="symptoms-edit-sheet"
      closable={false}
      maskClosable
    >
      <div className="symptoms-edit-sheet-content">
        <div className="symptoms-edit-sheet-header">
          <h3 className="symptoms-edit-sheet-title">Edit Symptom</h3>
          <button
            className="symptoms-edit-sheet-close"
            onClick={handleClose}
            type="button"
            aria-label="Close"
          >
            <img src={closeIcon} alt="" />
          </button>
        </div>

        <div className="symptoms-edit-sheet-body">
          <div className="symptoms-edit-sheet-field">
            <label className="symptoms-edit-sheet-label">Symptom name <span className="required">*</span></label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="e.g. Fever, Headache"
              className="symptoms-edit-sheet-input"
              maxLength={500}
            />
            {nameError && <span className="symptoms-edit-sheet-error">{nameError}</span>}
          </div>

          <div className="symptoms-edit-sheet-field">
            <label className="symptoms-edit-sheet-label">Severity</label>
            <Select
              value={severity || undefined}
              onChange={setSeverity}
              onClear={() => setSeverity(undefined)}
              placeholder="Select severity"
              allowClear
              options={SEVERITY_OPTIONS}
              className="symptoms-edit-sheet-select"
            />
          </div>

          <div className="symptoms-edit-sheet-field">
            <label className="symptoms-edit-sheet-label">Duration</label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 2 days, 1 week"
              className="symptoms-edit-sheet-input"
              maxLength={200}
            />
          </div>

          <div className="symptoms-edit-sheet-field">
            <label className="symptoms-edit-sheet-label">Notes</label>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes"
              className="symptoms-edit-sheet-textarea"
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="symptoms-edit-sheet-actions">
            <Button
              type="primary"
              onClick={handleSave}
              className="symptoms-edit-sheet-btn-save"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export default SymptomsEditSheet;
