import React, { useCallback, useMemo, useRef } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import styles from './ConsultationDrawer.module.css';
import { ASSETS } from "../assets";
const symptomsIcon = ASSETS.images.symptoms;

/**
 * SymptomsRichTextEditor - Rich text editor specifically for Symptoms section
 * Converts between array format [{lineItem: "symptom text"}] and Slate.js format
 */
const SymptomsRichTextEditor = ({
  symptoms = [],
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const previousCountRef = useRef(null);
  const keyVersionRef = useRef(0);

  const nonEmptyCount = useMemo(() => {
    if (!Array.isArray(symptoms) || symptoms.length === 0) {
      return 0;
    }

    return symptoms.filter((symptom = {}) => {
      const baseText = symptom.name || symptom.lineItem || '';
      return baseText && baseText.trim() !== '';
    }).length;
  }, [symptoms]);

  const editorKey = useMemo(() => {
    if (previousCountRef.current === null) {
      previousCountRef.current = nonEmptyCount;
      return 'symptoms-0';
    }

    if (nonEmptyCount < previousCountRef.current) {
      keyVersionRef.current += 1;
    }

    previousCountRef.current = nonEmptyCount;
    return `symptoms-${keyVersionRef.current}`;
  }, [nonEmptyCount]);

  const initialSlateValue = useMemo(() => {
    if (!symptoms || symptoms.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const formattedSymptoms = symptoms.map(symptom => {
      const name = symptom.name || '';
      const parts = [];
      
      if (symptom.severity) parts.push(symptom.severity);
      if (symptom.duration) parts.push(symptom.duration);
      if (symptom.notes) parts.push(symptom.notes);
      
      if (parts.length > 0) {
        return `${name} (${parts.join(', ')})`;
      }
      
      return name || symptom.lineItem || '';
    }).filter(text => text.trim() !== '');
    
    if (formattedSymptoms.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return arrayToSlateBulletList(formattedSymptoms);
  }, [symptoms]);

  const handleChange = useCallback((value) => {
    const items = slateBulletListToArray(value);
    const symptomsArray = items.map(text => ({ lineItem: text }));
    
    if (onUpdate) {
      onUpdate(symptomsArray);
    }
  }, [onUpdate]);

  if (isProcessing) {
    return (
      <div className={`${styles['symptoms-rich-text-editor']} ${className}`}>
        <div className={styles['symptoms-content-box']}>
          <div className={styles['symptoms-header']}>
            <div className={styles['symptoms-icon']}>
          <img src={symptomsIcon} alt="Symptoms" />
        </div>
            <span className={styles['symptoms-title']}>Symptoms</span>
          </div>
          <div className={styles['symptoms-editor-container']}>
            <div className={styles['symptoms-shimmer-container']}>
              <div className={styles['symptoms-shimmer']}></div>
        </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles['symptoms-rich-text-editor']} ${className}`}>
      <div className={styles['symptoms-content-box']}>
        <div className={styles['symptoms-header']}>
          <div className={styles['symptoms-icon']}>
          <img src={symptomsIcon} alt="Symptoms" />
          </div>
          <span className={styles['symptoms-title']}>Symptoms</span>
        </div>
        <div className={styles['symptoms-editor-container']}>
        <RichTextEditor
          key={editorKey}
          initialValue={initialSlateValue}
          onChange={handleChange}
          placeholder="Add symptoms..."
          spellCheck={true}
          autoFocus={false}
          showToolbar={false}
        />
        </div>
      </div>
    </div>
  );
};

export default SymptomsRichTextEditor;

