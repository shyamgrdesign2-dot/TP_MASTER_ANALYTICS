import React, { useCallback, useMemo, useRef } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import './DiagnosisRichTextEditor.scss';
import { ASSETS } from "../assets";
const diagnosisIcon = ASSETS.images.diagnosis;

/**
 * DiagnosisRichTextEditor - Rich text editor specifically for Diagnosis section
 * Converts between array format [{lineItem: "diagnosis text"}] and Slate.js format
 */
const DiagnosisRichTextEditor = ({
  diagnosis = [],
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const previousCountRef = useRef(null);
  const keyVersionRef = useRef(0);
  const editorItemsRef = useRef([]);

  const nonEmptyCount = useMemo(() => {
    if (!Array.isArray(diagnosis) || diagnosis.length === 0) {
      return 0;
    }

    return diagnosis.filter((diag = {}) => {
      const baseText = diag.name || diag.lineItem || '';
      return baseText && baseText.trim() !== '';
    }).length;
  }, [diagnosis]);

  const editorKey = useMemo(() => {
    if (previousCountRef.current === null) {
      previousCountRef.current = nonEmptyCount;
      return 'diagnosis-0';
    }

    if (nonEmptyCount < previousCountRef.current) {
      keyVersionRef.current += 1;
    }

    previousCountRef.current = nonEmptyCount;
    return `diagnosis-${keyVersionRef.current}`;
  }, [nonEmptyCount]);

  const initialSlateValue = useMemo(() => {
    const currentItems = diagnosis || [];
    const displayStrings = currentItems.map((diag) => {
      if (typeof diag === 'string') return diag;
      const name = String(diag.name ?? '').trim();
      const parts = [];
      if (diag.since) parts.push(`since ${diag.since}`);
      if (diag.status) parts.push(diag.status);
      if (diag.notes) parts.push(diag.notes);
      if (name && parts.length > 0) return `${name} (${parts.join(', ')})`;
      if (name) return name;
      return String(diag.lineItem ?? '').trim() || '';
    }).filter((s) => String(s).trim() !== '');

    if (displayStrings.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }
    return arrayToSlateBulletList(displayStrings);
  }, [diagnosis]);

  const handleChange = useCallback((value) => {
    const items = slateBulletListToArray(value);
    editorItemsRef.current = items;
    const diagnosisArray = items.map(text => ({ lineItem: text }));
    
    if (onUpdate) {
      onUpdate(diagnosisArray);
    }
  }, [onUpdate]);

  if (isProcessing) {
    return (
      <div className={`diagnosis-rich-text-editor ${className}`}>
        <div className="diagnosis-header">
        <div className="diagnosis-icon">
          <img src={diagnosisIcon} alt="Diagnosis" />
        </div>
          <span className="diagnosis-title">Diagnosis</span>
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
    <div className={`diagnosis-rich-text-editor ${className}`}>
      <div className="diagnosis-header">
        <div className="diagnosis-icon">
          <img src={diagnosisIcon} alt="Diagnosis" />
        </div>
        <span className="diagnosis-title">Diagnosis</span>
      </div>
      <div className="editor-container">
        <RichTextEditor
          key={editorKey}
          initialValue={initialSlateValue}
          onChange={handleChange}
          placeholder="Add diagnosis..."
          spellCheck={true}
          autoFocus={false}
          showToolbar={false}
        />
      </div>
    </div>
  );
};

export default DiagnosisRichTextEditor;

