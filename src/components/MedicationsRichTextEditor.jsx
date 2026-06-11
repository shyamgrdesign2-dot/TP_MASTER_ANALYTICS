import React, { useCallback, useMemo } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import './MedicationsRichTextEditor.scss';
import { ASSETS } from "../assets";
const medicationsIcon = ASSETS.images.medication;

/**
 * MedicationsRichTextEditor - Rich text editor specifically for Medications section
 * Converts between array format [{name, dosage, frequency, duration, notes}] and Slate.js format
 */
const MedicationsRichTextEditor = ({
  medications = [],
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const initialSlateValue = useMemo(() => {
    if (!medications || medications.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const formattedMedications = medications.map(med => {
      const name = med.name || med.corrected_name || '';
      const parts = [];
      
      if (med.dosage) parts.push(med.dosage);
      if (med.frequency) parts.push(med.frequency);
      if (med.schedule) parts.push(med.schedule);
      if (med.duration) parts.push(med.duration);
      if (med.notes) parts.push(med.notes);
      
      if (parts.length > 0) {
        return `${name} (${parts.join(', ')})`;
      }
      
      return name || med.lineItem || '';
    }).filter(text => text.trim() !== '');
    
    if (formattedMedications.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return arrayToSlateBulletList(formattedMedications);
  }, [medications]);

  const handleChange = useCallback((value) => {
    const items = slateBulletListToArray(value);
    const medicationsArray = items.map(text => {
      const parts = text.split(' - ').map(p => p.trim());
      
      if (parts.length >= 1) {
        const medication = {
          name: parts[0] || '',
          dosage: parts[1] || '',
          frequency: parts[2] || '',
          duration: parts[3] || '',
          notes: ''
        };
        
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.startsWith('(') && lastPart.endsWith(')')) {
          medication.notes = lastPart.slice(1, -1);
          if (parts.length === 1) {
            medication.notes = lastPart.slice(1, -1);
            medication.name = '';
          }
        }
        
        return medication;
      }
      
      return { name: text, dosage: '', frequency: '', duration: '', notes: '' };
    });
    
    if (onUpdate) {
      onUpdate(medicationsArray);
    }
  }, [onUpdate]);

  if (isProcessing) {
    return (
      <div className={`medications-rich-text-editor ${className}`}>
        <div className="medications-header">
          <div className="medications-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
              <path d="M8 11h2V9h2V7h-2V5H8v2H6v2h2v2z"/>
            </svg>
          </div>
          <span className="medications-title">Medicine</span>
        </div>
        <div className="editor-container">
          <div className="shimmer-container">
            <div className="shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`medications-rich-text-editor ${className}`}>
      <div className="medications-header">
        <div className="medications-icon">
          <img src={medicationsIcon} alt="Medications" />
        </div>
        <span className="medications-title">Medicine</span>
      </div>
      <div className="editor-container">
        <RichTextEditor
          initialValue={initialSlateValue}
          onChange={handleChange}
          placeholder="Add medications (e.g., Paracetamol - 500mg - Twice daily - 5 days - (Take after food))..."
          spellCheck={true}
          autoFocus={false}
          showToolbar={false}
        />
      </div>
    </div>
  );
};

export default MedicationsRichTextEditor;

