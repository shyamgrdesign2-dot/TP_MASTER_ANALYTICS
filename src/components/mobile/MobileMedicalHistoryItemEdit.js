import React, { useState, useEffect } from 'react';
import { Drawer, Input, Button, Radio } from 'antd';

import './MobileMedicalHistoryItemEdit.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

function MobileMedicalHistoryItemEdit({ 
  visible, 
  onClose, 
  item, 
  sectionType,
  onSave 
}) {
  const [sinceNumber, setSinceNumber] = useState('');
  const [sinceUnit, setSinceUnit] = useState('');
  const [isCustomNumber, setIsCustomNumber] = useState(false);
  const [status, setStatus] = useState('');
  const [medication, setMedication] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible || !item) return;
    setNote(item.note || '');
    setStatus(item.status || '');
    setMedication(item.medication || '');

    const sinceStr = item.since || '';
    if (sinceStr) {
      const match = sinceStr.match(/^(\d+)\s*(.*)$/);
      if (match) {
        const num = match[1];
        const unit = match[2].toLowerCase();
        setSinceNumber(num);
        setIsCustomNumber(!['1', '2', '3', '4', '5'].includes(num));
        const suffix = unit.includes('day') ? 'D' : unit.includes('week') ? 'W' : unit.includes('month') ? 'M' : unit.includes('year') ? 'Y' : '';
        setSinceUnit(suffix ? num + suffix : '');
      }
    } else {
      setSinceNumber('');
      setSinceUnit('');
      setIsCustomNumber(false);
    }
  }, [visible, item]);

  const handleSave = () => {
    let sinceValue = '';
    if (sinceNumber && sinceUnit) {
      const suffixToLabel = { D: 'Day', W: 'Week', M: 'Month', Y: 'Year' };
      const suffix = sinceUnit.slice(-1);
      const unitText = suffixToLabel[suffix] || 'Week';
      const plural = parseInt(sinceNumber, 10) > 1 ? `${unitText}(s)` : unitText;
      sinceValue = `${sinceNumber} ${plural}`;
    }

    const updatedItem = {
      ...item,
      since: sinceValue,
      status: status || item.status || '',
      medication: sectionType === 2 ? medication : (item.medication ?? ''),
      note: note.trim(),
      enable: item.enable ?? 'Y'
    };

    onSave?.(updatedItem);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="auto"
      className="mobile-medical-history-item-edit"
      closable={false}
      maskClosable={true}
    >
      <div className="mobile-item-edit-content">
        <div className="mobile-item-edit-header">
          <h3 className="mobile-item-edit-title">{item?.title || 'Edit Item'}</h3>
          <button
            className="mobile-item-edit-close"
            onClick={onClose}
            type="button"
          >
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        <div className="mobile-item-edit-body">
          {/* Since Section */}
          <div className="form-section">
            <label className="form-label">Since</label>
            
            <div className="number-selector">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  className={`number-btn ${!isCustomNumber && sinceNumber === String(num) ? 'active' : ''}`}
                  onClick={() => {
                    setSinceNumber(String(num));
                    setIsCustomNumber(false);
                    if (sinceUnit) {
                      const suffix = sinceUnit.slice(-1);
                      setSinceUnit(String(num) + suffix);
                    } else setSinceUnit('');
                  }}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                className={`number-btn number-btn-custom ${isCustomNumber ? 'active' : ''}`}
                onClick={() => setIsCustomNumber(true)}
              >
                Custom
              </button>
            </div>

            {isCustomNumber && (
              <Input
                type="number"
                min={1}
                placeholder="Enter number"
                value={sinceNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  if (v.length <= 4) {
                    setSinceNumber(v);
                    if (sinceUnit) {
                      const suffix = sinceUnit.slice(-1);
                      setSinceUnit(v ? v + suffix : '');
                    }
                  }
                }}
                className="custom-number-input"
              />
            )}

            <div className="unit-selector">
              {['D', 'W', 'M', 'Y'].map(suffix => {
                const n = sinceNumber || '1';
                const unit = n + suffix;
                return (
                  <button
                    key={unit}
                    type="button"
                    className={`unit-btn ${sinceUnit === unit ? 'active' : ''}`}
                    onClick={() => {
                      if (!sinceNumber) setSinceNumber('1');
                      setSinceUnit(unit);
                    }}
                  >
                    {unit}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Section */}
          <div className="form-section">
            <label className="form-label">Status</label>
            <Radio.Group
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="status-radio-group"
              buttonStyle="solid"
            >
              <Radio.Button value="Active">Active</Radio.Button>
              <Radio.Button value="Inactive">Inactive</Radio.Button>
            </Radio.Group>
          </div>

          {sectionType === 2 && status === 'Active' && (
            <div className="form-section">
              <label className="form-label">Medication</label>
              <Radio.Group
                value={medication}
                onChange={(e) => setMedication(e.target.value)}
                className="status-radio-group"
                buttonStyle="solid"
              >
                <Radio.Button value="Yes">Yes</Radio.Button>
                <Radio.Button value="No">No</Radio.Button>
              </Radio.Group>
            </div>
          )}

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

export default MobileMedicalHistoryItemEdit;
