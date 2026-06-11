import React, { useCallback, useMemo, useRef } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import './ExaminationRichTextEditor.scss';
import { ASSETS } from "../assets";
const examinationIcon = ASSETS.images.examination;

/**
 * ExaminationRichTextEditor - Rich text editor specifically for Examination section
 * Converts between array format [{lineItem: "examination text"}] and Slate.js format
 */
const ExaminationRichTextEditor = ({
  examinations = [],
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const previousCountRef = useRef(null);
  const keyVersionRef = useRef(0);
  const editorItemsRef = useRef([]);

  const nonEmptyCount = useMemo(() => {
    if (!Array.isArray(examinations) || examinations.length === 0) {
      return 0;
    }

    return examinations.filter((examination = {}) => {
      const baseText = examination.name || examination.lineItem || '';
      return baseText && baseText.trim() !== '';
    }).length;
  }, [examinations]);

  const editorKey = useMemo(() => {
    if (previousCountRef.current === null) {
      previousCountRef.current = nonEmptyCount;
      return 'examinations-0';
    }

    if (nonEmptyCount < previousCountRef.current) {
      keyVersionRef.current += 1;
    }

    previousCountRef.current = nonEmptyCount;
    return `examinations-${keyVersionRef.current}`;
  }, [nonEmptyCount]);

  const initialSlateValue = useMemo(() => {
    const currentItems = examinations || [];
    let editorItems = editorItemsRef.current || [];
    
    if (editorItems.length === 0 && currentItems.length > 0) {
      editorItems = currentItems.map(exam => {
        const name = exam.name || exam.lineItem || '';
        const parts = [];
        
        if (exam.notes) parts.push(exam.notes);
        
        if (parts.length > 0) {
          return `${name} (${parts.join(', ')})`;
        }
        
        return name;
      });
      editorItemsRef.current = editorItems;
    }
    
    const allItems = editorItems.length > 0 ? editorItems : currentItems;
    
    if (allItems.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const formattedExaminations = allItems.map((examination) => {
      if (typeof examination === 'string') {
        return examination;
      }
      const name = examination.name || '';
      const parts = [];
      
      if (examination.notes) parts.push(examination.notes);
      
      if (parts.length > 0) {
        return `${name} (${parts.join(', ')})`;
      }
      
      return name || examination.lineItem || '';
    });
    
    if (formattedExaminations.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return arrayToSlateBulletList(formattedExaminations);
  }, [examinations]);

  const handleChange = useCallback((value) => {
    const items = slateBulletListToArray(value);
    editorItemsRef.current = items;
    const examinationsArray = items.map(text => ({ lineItem: text }));
    
    if (onUpdate) {
      onUpdate(examinationsArray);
    }
  }, [onUpdate]);

  if (isProcessing) {
    return (
      <div className={`examination-rich-text-editor ${className}`}>
        <div className="examination-header">
        <div className="examination-icon">
          <img src={examinationIcon} alt="Examination" />
        </div>
          <span className="examination-title">Examination</span>
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
    <div className={`examination-rich-text-editor ${className}`}>
      <div className="examination-header">
        <div className="examination-icon">
          <img src={examinationIcon} alt="Examination" />
        </div>
        <span className="examination-title">Examination</span>
      </div>
      <div className="editor-container">
        <RichTextEditor
          key={editorKey}
          initialValue={initialSlateValue}
          onChange={handleChange}
          placeholder="Add examination findings..."
          spellCheck={true}
          autoFocus={false}
          showToolbar={false}
        />
      </div>
    </div>
  );
};

export default ExaminationRichTextEditor;

