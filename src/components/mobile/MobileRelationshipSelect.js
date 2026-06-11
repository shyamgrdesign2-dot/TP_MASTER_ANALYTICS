import React, { useState, useEffect } from 'react';
import { Drawer, Checkbox, Button } from 'antd';

import './MobileRelationshipSelect.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

function MobileRelationshipSelect({
  visible,
  onClose,
  selectedRelationship,
  onSelect
}) {
  const [pendingRelationship, setPendingRelationship] = useState('');

  const relationships = [
    'Father',
    'Mother',
    'Wife',
    'Husband',
    'Uncle',
    'Aunty',
    'Siblings',
    'Relatives',
    'Son',
    'Daughter',
    'Grandfather',
    'Grandmother',
    'Brother',
    'Sister',
    'Cousin'
  ];

  useEffect(() => {
    if (visible) {
      setPendingRelationship(selectedRelationship || '');
    }
  }, [visible]);

  const handleToggle = (relationship) => {
    setPendingRelationship((prev) => (prev === relationship ? '' : relationship));
  };

  const handleSave = () => {
    onSelect?.(pendingRelationship);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="60vh"
      className="mobile-relationship-select"
      closable={false}
      maskClosable={true}
    >
      <div className="mobile-relationship-content">
        <div className="mobile-relationship-header">
          <h3 className="mobile-relationship-title">Select Relationship</h3>
          <button
            className="mobile-relationship-close"
            onClick={onClose}
            type="button"
          >
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        <div className="relationship-list">
          {relationships.map((relationship) => (
            <div
              key={relationship}
              className="relationship-item"
              onClick={() => handleToggle(relationship)}
            >
              <Checkbox
                checked={pendingRelationship === relationship}
                onClick={(e) => e.preventDefault()}
              >
                {relationship}
              </Checkbox>
            </div>
          ))}
        </div>

        <div className="mobile-relationship-footer">
          <Button type="primary" size="large" block onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export default MobileRelationshipSelect;
