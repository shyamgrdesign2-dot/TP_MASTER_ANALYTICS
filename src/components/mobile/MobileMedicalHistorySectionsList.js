import React, { useState, useMemo } from 'react';
import { Drawer, Checkbox, Button, Input } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';

import './MobileMedicalHistorySectionsList.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;
const {
  activeVerticleUpDown,
  inactiveVerticleUpDown,
  verticleUpDown,
} = ASSETS.images;

function MobileMedicalHistorySectionsList({
  visible,
  onClose,
  medicalHistoryData = [],
  onNoKnownHistoryChange,
  onChipClick,
  onChipEnableClick,
  onEditQuickList,
  onSave,
  onAdditionalHistoryChange
}) {
  const [expandedSections, setExpandedSections] = useState({
    2: true, // Medical Condition
    4: true, // Allergies
    3: true, // Family History
    1: true, // Lifestyle
    5: true, // Surgical History
    6: true, // Additional History
  });

  const sectionConfig = useMemo(() => ({
    2: { title: 'Medical problem', key: 'medical_condition' },
    4: { title: 'Allergies', key: 'allergies' },
    3: { title: 'Family history', key: 'family_history' },
    1: { title: 'Lifestyle', key: 'lifestyle' },
    5: { title: 'Surgical history', key: 'surgical_history' },
    6: { title: 'Additional History', key: 'additional_history' },
  }), []);

  const toggleSection = (tmmhs_id) => {
    setExpandedSections(prev => ({
      ...prev,
      [tmmhs_id]: !prev[tmmhs_id]
    }));
  };

  const handleNoKnownHistory = (section, checked) => {
    if (onNoKnownHistoryChange) {
      onNoKnownHistoryChange(section.tmmhs_id, checked);
    }
  };

  const getEnableIcon = (enable) => {
    if (enable === 'Y') return activeVerticleUpDown;
    if (enable === 'N') return inactiveVerticleUpDown;
    return verticleUpDown;
  };

  const renderChip = (tag, section) => {
    if (!tag || !tag.title) return null;
    return (
      <div
        key={tag.tmmhst_id}
        className="history-chip"
        onClick={() => onChipClick?.(section, tag)}
      >
        <span className="chip-text">
          {tag.title}
        </span>
        <div className="chip-actions">
          <button
            type="button"
            className="chip-status-wrap"
            onClick={(e) => {
              e.stopPropagation();
              onChipEnableClick?.(section, tag);
            }}
            aria-label="Toggle Y/N status"
          >
            {tag.enable === 'Y' && <span className="chip-status chip-status-y">Y</span>}
            {tag.enable === 'N' && <span className="chip-status chip-status-n">N</span>}
            {!tag.enable && <span className="chip-status chip-status-dash">-</span>}
            <img
              src={getEnableIcon(tag.enable)}
              alt=""
              className="chip-status-icon"
            />
          </button>
        </div>
      </div>
    );
  };

  const renderSection = (section) => {
    const config = sectionConfig[section.tmmhs_id];
    if (!config) return null;

    const isExpanded = expandedSections[section.tmmhs_id];
    const hasNoKnownHistory = section.no_know_history === true;
    const allSectionTags = (section.tags || []).filter(t => !t.delete);
    
    const isAdditionalHistory = section.tmmhs_id === 6;
    const additionalHistoryText = section.medical_history_remarks || '';

    return (
      <div key={section.tmmhs_id} className="medical-history-section">
        <div className="section-header" onClick={() => toggleSection(section.tmmhs_id)}>
          <span className="section-title">{config.title}</span>
          {isExpanded ? <UpOutlined /> : <DownOutlined />}
        </div>

        {isExpanded && (
          <div className="section-content">
            {isAdditionalHistory ? (
              <div className="additional-history-content">
                <Input.TextArea
                  className="additional-history-textarea"
                  placeholder="Write your additional history"
                  value={additionalHistoryText}
                  onChange={(e) => onAdditionalHistoryChange?.(e.target.value)}
                  maxLength={5000}
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  showCount={false}
                />
              </div>
            ) : (
              <>
                <div className="section-controls">
                  <Checkbox
                    checked={hasNoKnownHistory}
                    onChange={(e) => handleNoKnownHistory(section, e.target.checked)}
                  >
                    No known history
                  </Checkbox>
                  <button
                    type="button"
                    className="edit-quick-list-btn"
                    onClick={() => onEditQuickList?.(section)}
                  >
                    <i className="icon-setting" />
                    <span>Edit & Add</span>
                  </button>
                </div>

                {!hasNoKnownHistory && allSectionTags.length > 0 && (
                  <div className="chips-container">
                    {allSectionTags.map(tag => renderChip(tag, section))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!visible) return null;

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="70vh"
      className="mobile-medical-history-sections-list"
      closable={false}
      maskClosable={true}
    >
      <div className="mobile-medical-history-content">
        <div className="mobile-medical-history-header">
          <h3 className="mobile-medical-history-title">Medical History</h3>
          <button
            className="mobile-medical-history-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        <div className="sections-list">
          {[2, 4, 3, 1, 5, 6].map(tmmhs_id => {
            let section = medicalHistoryData.find(s => s.tmmhs_id === tmmhs_id);
            
            if (tmmhs_id === 6 && !section) {
              const firstSection = medicalHistoryData[0];
              section = {
                tmmhs_id: 6,
                title: 'Additional History',
                section_name: 'Additional History',
                medical_history_remarks: firstSection?.medical_history_remarks || '',
                tags: []
              };
            }
            
            if (!section) {
              const config = sectionConfig[tmmhs_id];
              return renderSection({
                tmmhs_id,
                title: config.title,
                section_name: config.title,
                no_know_history: false,
                tags: []
              });
            }
            return renderSection(section);
          })}
        </div>

        <div className="mobile-medical-history-footer">
          <Button
            type="primary"
            size="large"
            block
            onClick={onSave}
            className="save-btn"
          >
            Save
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export default MobileMedicalHistorySectionsList;
