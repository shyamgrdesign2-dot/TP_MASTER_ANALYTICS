import React, { useCallback, useMemo, useState } from 'react';
import { Drawer } from 'antd';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import { prescriptionMedicalHistoryToContextFormat } from '../utils/medicalHistoryUtils';
import styles from './ConsultationDrawer.module.css';

import MedicalHistoryBox from './MedicalHistoryBox';
import MobileMedicalHistoryManager from './mobile/MobileMedicalHistoryManager';
import { useDeviceType } from '../utils/deviceDetection';
import { ASSETS } from "../assets";
const {
  medicalHistory: medicalHistoryIcon,
  arrowBoxUp: arrowBoxUpIcon,
  icon: addEditIcon,
} = ASSETS.images;

/**
 * MedicalHistoryRichTextEditor - Rich text editor for Medical History with type-based sub-boxes
 * Handles medical history array with different types: medical_condition, surgical_history, family_history, lifestyle, others
 */
const MedicalHistoryRichTextEditor = ({
  medicalHistory = [],
  onUpdate,
  isProcessing = false,
  className = '',
  initiallyPopulatedTypes = [],
  patient_data: patientDataProp,
  caseManagerData: caseManagerDataProp,
  isVoiceAmbientSnapSmartFlow = false,
}) => {
  const { isMobile, isTablet } = useDeviceType();
  
  const [medicalHistoryDrawer, setMedicalHistoryDrawer] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    medical_condition: true,
    allergies: true,
    surgical_history: true,
    family_history: true,
    lifestyle: true,
    others: true
  });
  const [newHistoryItem, setNewHistoryItem] = useState({
    type: 'medical_condition',
    name: '',
    duration: '',
    relation: '',
    status: '',
    notes: ''
  });

  const groupedHistory = useMemo(() => {
    const groups = {
      medical_condition: [],
      allergies: [],
      surgical_history: [],
      family_history: [],
      lifestyle: [],
      others: []
    };

    medicalHistory.forEach(item => {
      const type = item.type?.toLowerCase().replace(/\s+/g, '_') || 'others';
      if (groups[type]) {
        groups[type].push(item);
      } else {
        groups.others.push(item);
      }
    });

    return groups;
  }, [medicalHistory]);

  const overrideMedicalHistoryData = useMemo(
    () => prescriptionMedicalHistoryToContextFormat(medicalHistory),
    [medicalHistory]
  );

  const formatHistoryItem = useCallback((item) => {
    const name = item.name || item.lineItem || '';
    const details = [];
    if (item.enable === 'N') {
      return `No ${name}`;
    }
    const normalizedType = (item.type || '').toLowerCase().replace(/\s+/g, '_');
    const isOthers = normalizedType === 'others' || normalizedType === 'additional_notes';
    if (item.duration) details.push(`Since: ${item.duration}`);
    if (item.relation) details.push(`Relation: ${item.relation}`);
    if (item.status) details.push(`Status: ${item.status}`);
    if (item.notes && (!isOthers || (item.notes || '').trim() !== (name || '').trim())) {
      details.push(`Notes: ${item.notes}`);
    }
    if (details.length > 0) {
      return `${name} (${details.join(' | ')})`;
    }
    return name || item.lineItem || '';
  }, []);

  const getSlateValueForType = useCallback((items) => {
    if (!items || items.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const formattedItems = items.map(formatHistoryItem).filter(text => text.trim() !== '');
    
    if (formattedItems.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return arrayToSlateBulletList(formattedItems);
  }, [formatHistoryItem]);

  const handleTypeChange = useCallback((type, value) => {
    const items = slateBulletListToArray(value);
    const updatedItems = items.map(text => {
      const item = { type: type };
      
      const bracketMatch = text.match(/^(.+?)\s*\((.+)\)$/);
      if (bracketMatch) {
        const name = bracketMatch[1].trim();
        const details = bracketMatch[2];
        
        item.name = name;
        
        const detailParts = details.split(' | ').map(p => p.trim());
        detailParts.forEach(part => {
          if (part.startsWith('Since: ')) {
            item.duration = part.substring(7);
          } else if (part.startsWith('Relation: ')) {
            item.relation = part.substring(10);
          } else if (part.startsWith('Status: ')) {
            item.status = part.substring(8);
          } else if (part.startsWith('Notes: ')) {
            item.notes = part.substring(7);
        }
        });
      } else {
        item.name = text;
      }
      
      item.lineItem = text;
      return item;
    });

    const updatedHistory = medicalHistory.filter(item => {
      const itemType = item.type?.toLowerCase().replace(/\s+/g, '_') || 'others';
      return itemType !== type;
    }).concat(updatedItems);

    if (onUpdate) {
      onUpdate(updatedHistory);
    }
  }, [medicalHistory, onUpdate]);

  const toggleSection = useCallback((type) => {
    setExpandedSections(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  }, []);

  const textareaRefs = React.useRef({});
  const [localTextareaValues, setLocalTextareaValues] = React.useState({});

  const isEditingRef = React.useRef({});

  React.useEffect(() => {
    const newValues = {};
    const types = ['medical_condition', 'allergies', 'surgical_history', 'family_history', 'lifestyle', 'others'];
    types.forEach((type) => {
      if (isEditingRef.current[type]) {
        return;
      }
      
      if (groupedHistory[type] && groupedHistory[type].length > 0) {
        newValues[type] = groupedHistory[type].map(item => `• ${formatHistoryItem(item)}`).join('\n');
      } else {
        newValues[type] = '';
      }
    });
    
    if (Object.keys(newValues).length > 0) {
      setLocalTextareaValues(prev => ({ ...prev, ...newValues }));
    }
  }, [medicalHistory, groupedHistory, formatHistoryItem]);

  const handleTextareaChange = useCallback((type, value) => {
    isEditingRef.current[type] = true;
    
    setLocalTextareaValues(prev => ({ ...prev, [type]: value }));

    const lines = value.split('\n');
    
    const updatedItems = lines.map(line => {
      const cleanLine = line.replace(/^•\s*/, '');
      
      if (cleanLine.trim() === '') {
        return null;
      }
      
      const bracketMatch = cleanLine.match(/^(.+?)\s*\((.+)\)$/);
      if (bracketMatch) {
        const name = bracketMatch[1].trim();
        const details = bracketMatch[2];
        
        const item = { type: type, name: name };
        
        const detailParts = details.split(' | ').map(p => p.trim());
        detailParts.forEach(part => {
          if (part.startsWith('Since: ')) {
            item.duration = part.substring(7);
          } else if (part.startsWith('Relation: ')) {
            item.relation = part.substring(10);
          } else if (part.startsWith('Status: ')) {
            item.status = part.substring(8);
          } else if (part.startsWith('Notes: ')) {
            item.notes = part.substring(7);
      }
        });
        
        item.lineItem = cleanLine;
        return item;
      } else {
        // Simple format - just the name
        return {
          type: type,
          name: cleanLine,
          lineItem: cleanLine
        };
      }
    }).filter(item => item !== null); // Remove null items

    // Update the specific type in the full medical history array
    const updatedHistory = medicalHistory.filter(item => {
      const itemType = item.type?.toLowerCase().replace(/\s+/g, '_') || 'others';
      return itemType !== type;
    }).concat(updatedItems);

    if (onUpdate) {
      onUpdate(updatedHistory);
    }
    
    setTimeout(() => {
      isEditingRef.current[type] = false;
    }, 100);
  }, [medicalHistory, onUpdate, formatHistoryItem]);

  const handleKeyDown = useCallback((e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      const textarea = e.target;
      const cursorPosition = textarea.selectionStart;
      const currentValue = localTextareaValues[type] !== undefined 
        ? localTextareaValues[type] 
        : (textarea.value || '');
      
      const textBeforeCursor = currentValue.substring(0, cursorPosition);
      const textAfterCursor = currentValue.substring(cursorPosition);
      
      const newText = textBeforeCursor + '\n• ' + textAfterCursor;
      
      isEditingRef.current[type] = true;
      
      
      handleTextareaChange(type, newText);
      
      setTimeout(() => {
        if (textareaRefs.current[type]) {
          const newCursorPosition = cursorPosition + 3;
          textareaRefs.current[type].focus();
          textareaRefs.current[type].setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 10);
    } else if (e.key === 'Backspace') {
      const textarea = e.target;
      const cursorPosition = textarea.selectionStart;
      const currentValue = localTextareaValues[type] !== undefined 
        ? localTextareaValues[type] 
        : (textarea.value || '');
      
      const textBeforeCursor = currentValue.substring(0, cursorPosition);
      const textAfterCursor = currentValue.substring(cursorPosition);
      
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      
      if ((currentLine.trim() === '•' || currentLine.trim() === '') && lines.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        
        const newText = lines.slice(0, -1).join('\n') + textAfterCursor;
        
        isEditingRef.current[type] = true;
        
        handleTextareaChange(type, newText);
        
        setTimeout(() => {
          if (textareaRefs.current[type]) {
            const newCursorPosition = lines.slice(0, -1).join('\n').length;
            textareaRefs.current[type].focus();
            textareaRefs.current[type].setSelectionRange(newCursorPosition, newCursorPosition);
          }
        }, 10);
      }
    }
  }, [handleTextareaChange, localTextareaValues]);

  const handleAddHistory = useCallback(() => {
    if (!newHistoryItem.name.trim()) return;

    const newItem = {
      ...newHistoryItem,
      lineItem: [newHistoryItem.name, newHistoryItem.duration, newHistoryItem.relation, newHistoryItem.notes]
        .filter(Boolean)
        .join(' | ')
    };

    const updatedHistory = [...medicalHistory, newItem];
    if (onUpdate) {
      onUpdate(updatedHistory);
    }

    setNewHistoryItem({
      type: 'medical_condition',
      name: '',
      duration: '',
      relation: '',
      status: '',
      notes: ''
    });
    setMedicalHistoryDrawer(false);
  }, [newHistoryItem, medicalHistory, onUpdate]);

  const typeConfig = {
    medical_condition: { title: 'MEDICAL CONDITIONS' },
    allergies: { title: 'ALLERGIES' },
    surgical_history: { title: 'SURGICAL HISTORY' },
    family_history: { title: 'FAMILY HISTORY' },
    lifestyle: { title: 'LIFESTYLE' },
    others: { title: 'ADDITIONAL NOTES' }
  };

  if (isProcessing) {
    return (
      <div className={`${styles['medical-history-rich-text-editor']} ${className}`}>
        <div className={styles['medical-history-content-box']}>
          <div className={styles['medical-history-header']}>
            <div className={styles['medical-history-icon']}>
              <img src={medicalHistoryIcon} alt="Medical History" />
            </div>
            <span className={styles['medical-history-title']}>Medical History</span>
          </div>
          <div className={styles['medical-history-shimmer-container']}>
            <div className={styles['medical-history-shimmer']}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles['medical-history-rich-text-editor']} ${className}`}>
      <div className={styles['medical-history-content-box']}>
        <div className={styles['medical-history-header']}>
          <div className={styles['medical-history-header-left']}>
            <div className={styles['medical-history-icon']}>
              <img src={medicalHistoryIcon} alt="Medical History" />
            </div>
            <span className={styles['medical-history-title']}>Medical History</span>
          </div>
          <button
            type="button"
            className={styles['medical-history-action-button']}
            onClick={() => setMedicalHistoryDrawer(true)}
          >
            <img
              src={addEditIcon}
              alt="Add/Edit"
              className={styles['medical-history-action-icon']}
            />
            <span>Add/Edit History</span>
          </button>
        </div>

        <div className={styles['medical-history-sections']}>
          {Object.entries(typeConfig).map(([type, config]) => {
            const hasContent = groupedHistory[type] && groupedHistory[type].length > 0;
            const slateValue = getSlateValueForType(groupedHistory[type]);
            const hasTextContent = slateValue.some(node => 
              node.children && node.children.some(child => 
                child.text && child.text.trim() !== ''
              )
            );
            const isExpanded = expandedSections[type];
            const isEditableType = type === 'others';
            const textareaValue = localTextareaValues[type] !== undefined 
              ? localTextareaValues[type] 
              : (groupedHistory[type] && groupedHistory[type].length > 0
                ? groupedHistory[type].map(item => `• ${formatHistoryItem(item)}`).join('\n')
                : '');
            const cleanedTextareaValue = textareaValue ? textareaValue.replace(/•/g, '').trim() : '';
            const hasActualContent = cleanedTextareaValue !== '';
            if (!hasContent && !hasTextContent && !hasActualContent) {
              return null;
            }
            const lineCount = textareaValue ? textareaValue.split('\n').length : 1;
            const calculatedRows = Math.max(1, Math.min(10, lineCount));
            
            return (
              <div key={type} className={styles['medical-history-type-section']}>
                <div 
                  className={styles['medical-history-type-header']}
                  onClick={() => toggleSection(type)}
                >
                  <span className={styles['medical-history-type-title']}>{config.title}</span>
                  <img 
                    src={arrowBoxUpIcon} 
                    alt="Toggle" 
                    className={`${styles['medical-history-type-toggle']} ${!isExpanded ? styles['toggle-rotated'] : ''}`}
                  />
                </div>
                {isExpanded && (
                  <div className={styles['medical-history-type-content']}>
                    <textarea
                      ref={(el) => {
                        if (el) {
                          textareaRefs.current[type] = el;
                        }
                      }}
                      className={`${styles['medical-history-textarea']} ${!isEditableType ? styles['medical-history-textarea-readonly'] : ''}`}
                      value={textareaValue}
                      readOnly={!isEditableType}
                      onChange={
                        isEditableType
                          ? (e) => {
                        isEditingRef.current[type] = true;
                        handleTextareaChange(type, e.target.value);
                            }
                          : undefined
                      }
                      onFocus={
                        isEditableType
                          ? () => {
                        isEditingRef.current[type] = true;
                            }
                          : undefined
                      }
                      onBlur={
                        isEditableType
                          ? () => {
                        setTimeout(() => {
                          isEditingRef.current[type] = false;
                        }, 200);
                            }
                          : undefined
                      }
                      onKeyDown={
                        isEditableType ? (e) => handleKeyDown(e, type) : undefined
                      }
                      placeholder={
                        isEditableType
                          ? `• Add ${config.title.toLowerCase()}...`
                          : ''
                      }
                      rows={calculatedRows}
                      style={{ 
                        minHeight: '30px',
                        resize: 'none',
                        overflow: 'hidden',
                        cursor: isEditableType ? 'text' : 'default'
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Use bottom sheets, Web: Use right drawer */}
      {isMobile && !isTablet ? (
        <MobileMedicalHistoryManager
          visible={medicalHistoryDrawer}
          onClose={() => setMedicalHistoryDrawer(false)}
          onSave={(convertedHistory) => {
            if (onUpdate) {
              onUpdate(convertedHistory);
            }
          }}
          patient_data={patientDataProp}
        />
      ) : (
        <Drawer
          className="scroll-y-hidden"
          closeIcon={false}
          placement="right"
          onClose={() => setMedicalHistoryDrawer(false)}
          open={medicalHistoryDrawer}
          width="75%"
        >
          <MedicalHistoryBox
            handleDrawerMedicalHistory={() => setMedicalHistoryDrawer(false)}
            handleCollapsed={() => {}}
            patient_data={patientDataProp}
            caseManagerData={caseManagerDataProp}
            overrideMedicalHistoryData={overrideMedicalHistoryData}
            isVoiceAmbientSnapSmartFlow={isVoiceAmbientSnapSmartFlow}
            onSave={(savedData) => {
              if (savedData && Array.isArray(savedData)) {
                const convertedMedicalHistory = [];
                const idToTypeMap = {
                  1: 'Lifestyle',
                  2: 'Medical Condition',
                  3: 'Family History',
                  4: 'Allergies',
                  5: 'Surgical History'
                };
                
                savedData.forEach(section => {
                  const sectionType = idToTypeMap[section.tmmhs_id] || 'Lifestyle';
                  
                  if (section.tags && section.tags.length > 0) {
                    section.tags.forEach(tag => {
                      if ((tag.enable === 'Y' || tag.enable === 'N') && tag.title && tag.title.trim() !== '') {
                        const historyItem = {
                          type: sectionType,
                          name: tag.title.trim(),
                          duration: tag.since || '',
                          relation: tag.relationship || '',
                          notes: tag.note || '',
                          status: tag.status || 'Active',
                          enable: tag.enable || 'Y'
                        };
                        
                        // Add surgical history specific fields
                        if (section.tmmhs_id === 5 && tag.date) {
                          historyItem.date = tag.date;
                          historyItem.dateType = tag.dateType || 'onlyYear';
                        }
                        
                        if (tag.enable === 'N') {
                          historyItem.lineItem = tag.title.trim();
                        } else {
                          const lineParts = [tag.title.trim()];
                          if (section.tmmhs_id === 5 && tag.date) {
                            lineParts.push(`Date of Surgery: ${tag.date}`);
                          } else if (tag.since) {
                            lineParts.push(tag.since);
                          }
                          if (tag.relationship) lineParts.push(`Relation: ${tag.relationship}`);
                          if (tag.note) lineParts.push(tag.note);
                          historyItem.lineItem = lineParts.join(', ');
                        }
                        
                        convertedMedicalHistory.push(historyItem);
                      }
                    });
                  }
                });
          
                const filteredHistory = convertedMedicalHistory.filter(item => {
                  const itemType = item.type?.toLowerCase().replace(/\s+/g, '_') || '';
                  if (itemType === 'others') {
                    return false;
                  }
                  return item.name && item.name.trim() !== '';
                });
                
                if (onUpdate) {
                  onUpdate(filteredHistory);
                }
              }
              setMedicalHistoryDrawer(false);
            }}
            initialActiveKey="medical"
            hideMenstrualHistoryTab={true}
          />
        </Drawer>
      )}
    </div>
  );
};

export default MedicalHistoryRichTextEditor;