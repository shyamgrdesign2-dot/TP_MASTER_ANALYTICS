import React, { useState } from 'react';
import { Drawer } from 'antd';
import { isMobile, isTablet } from 'react-device-detect';
import MedicalHistoryBox from './MedicalHistoryBox';
import MedicalHistoryBoxMobile from './MedicalHistoryBoxMobile';
import './MedicalHistoryDisplay.scss';

const MedicalHistoryDisplay = ({
  medicalHistory = [],
  isProcessing = false,
  className = '',
  onSave,
}) => {
  const [medicalHistoryDrawer, setMedicalHistoryDrawer] = useState(false);

  const handleDrawerMedicalHistory = () => {
    setMedicalHistoryDrawer(!medicalHistoryDrawer);
  };

  const handleSaveMedicalHistory = (data) => {
    if (onSave) {
      onSave(data);
    }
    setMedicalHistoryDrawer(false);
  };

  const groupedHistory = React.useMemo(() => {
    const groups = {
      medicalConditions: [],
      allergy: [],
      familyHistory: [],
      lifestyle: [],
      additionalNotes: [],
    };

    medicalHistory.forEach((item) => {
      const category = item.category || item.type || 'additionalNotes';
      const normalizedCategory = category.toLowerCase().replace(/\s+/g, '');
      
      if (groups[normalizedCategory]) {
        groups[normalizedCategory].push(item);
      } else {
        groups.additionalNotes.push(item);
      }
    });

    return groups;
  }, [medicalHistory]);

  const [expandedSections, setExpandedSections] = useState({
    medicalConditions: false,
    allergy: false,
    familyHistory: false,
    lifestyle: false,
    additionalNotes: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatSectionTitle = (key) => {
    const titles = {
      medicalConditions: 'MEDICAL CONDITIONS',
      allergy: 'ALLERGY',
      familyHistory: 'FAMILY HISTORY',
      lifestyle: 'LIFESTYLE',
      additionalNotes: 'ADDITIONAL NOTES',
    };
    return titles[key] || key.toUpperCase();
  };

  const renderHistoryItem = (item, index) => {
    const { name, lineItem, since, status, notes, relation, value } = item;
    const displayName = name || lineItem || '';
    
    if (!displayName && !value && !notes) return null;

    return (
      <li key={index} className="history-item">
        <span className="item-name">{displayName}</span>
        {since && (
          <>
            {' '}
            <span className="item-meta">
              (<span className="meta-label">Since:</span> {since}
            </span>
          </>
        )}
        {relation && (
          <>
            {' '}
            <span className="item-meta">
              (<span className="meta-label">Relation:</span> {relation}
            </span>
          </>
        )}
        {status && (
          <>
            {' | '}
            <span className="meta-label">Status:</span> {status}
          </>
        )}
        {notes && (
          <>
            {' | '}
            <span className="meta-label">Notes:</span> {notes}
          </>
        )}
        {value && !displayName && (
          <span className="item-value">{value}</span>
        )}
        )
      </li>
    );
  };

  const renderSection = (sectionKey, items) => {
    if (items.length === 0) return null;

    return (
      <div key={sectionKey} className="history-section">
        <div
          className="section-header"
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="section-title">{formatSectionTitle(sectionKey)}</span>
          <span className={`toggle-icon ${expandedSections[sectionKey] ? 'expanded' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill="currentColor"/>
            </svg>
          </span>
        </div>
        {expandedSections[sectionKey] && (
          <div className="section-content">
            <ul className="history-list">
              {items.map((item, index) => renderHistoryItem(item, index))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (isProcessing) {
    return (
      <div className={`medical-history-display ${className}`}>
        <div className="medical-history-header">
          <div className="medical-history-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
            </svg>
          </div>
          <span className="medical-history-title">Medical History</span>
        </div>
        <div className="history-container">
          <div className="shimmer-container">
            <div className="shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  const hasData = Object.values(groupedHistory).some(items => items.length > 0);

  if (!hasData) {
    return null;
  }

  return (
    <div className={`medical-history-display ${className}`}>
      <div className="medical-history-header">
        <div className="medical-history-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
        </div>
        <span className="medical-history-title">Medical History</span>
      </div>
      <div className="history-container">
        {renderSection('medicalConditions', groupedHistory.medicalConditions)}
        {renderSection('allergy', groupedHistory.allergy)}
        {renderSection('familyHistory', groupedHistory.familyHistory)}
        {renderSection('lifestyle', groupedHistory.lifestyle)}
        {renderSection('additionalNotes', groupedHistory.additionalNotes)}
      </div>
      <div className="edit-link" onClick={handleDrawerMedicalHistory}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
        </svg>
        <span>Add/Edit Medical History</span>
      </div>

      <Drawer
        className="scroll-y-hidden"
        closeIcon={false}
        placement="right"
        onClose={handleDrawerMedicalHistory}
        open={medicalHistoryDrawer}
        width="75%"
      >
        {(isMobile && !isTablet) ? (
          <MedicalHistoryBoxMobile
            handleDrawerMedicalHistory={handleDrawerMedicalHistory}
            handleCollapsed={() => {}}
            onSave={handleSaveMedicalHistory}
          />
        ) : (
          <MedicalHistoryBox
            handleDrawerMedicalHistory={handleDrawerMedicalHistory}
            handleCollapsed={() => {}}
            onSave={handleSaveMedicalHistory}
          />
        )}
      </Drawer>
    </div>
  );
};

export default MedicalHistoryDisplay;

