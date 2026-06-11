import React, { useCallback, useMemo, useRef } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import './AdditionalNotesRichTextEditor.scss';
import { ASSETS } from "../assets";
const additionalNotesIcon = ASSETS.images.notes;

/**
 * AdditionalNotesRichTextEditor - Rich text editor specifically for Additional Notes section (previously "Others")
 * Converts between array format and Slate.js format
 */
const AdditionalNotesRichTextEditor = ({
  others = [],
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const editorItemsRef = useRef([]);

  const initialSlateValue = useMemo(() => {
    const currentItems = others || [];
    let editorItems = editorItemsRef.current || [];
    
    if (editorItems.length === 0 && currentItems.length > 0) {
      editorItems = currentItems.map(note => {
        if (typeof note === 'string') return note;
        return note?.value || '';
      });
      editorItemsRef.current = editorItems;
    }
    
    const allItems = editorItems.length > 0 ? editorItems : currentItems;
    
    if (allItems.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const noteTexts = allItems.map((note) => {
      if (typeof note === 'string') {
        return note;
      } else if (note && note.value) {
        return note.value;
      }
      return '';
    });
    
    if (noteTexts.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return arrayToSlateBulletList(noteTexts);
  }, [others]);

  const handleChange = useCallback((value) => {
    const items = slateBulletListToArray(value);
    editorItemsRef.current = items;
    // Backend expects others as string[] only, e.g. ["Cross refer to her to her"]
    if (onUpdate) {
      onUpdate(items);
    }
  }, [onUpdate]);

  if (isProcessing) {
    return (
      <div className={`additionalnotes-rich-text-editor ${className}`}>
        <div className="additionalnotes-header">
          <div className="additionalnotes-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </div>
          <span className="additionalnotes-title">Additional Notes</span>
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
    <div className={`additionalnotes-rich-text-editor ${className}`}>
      <div className="additionalnotes-header">
        <div className="additionalnotes-icon">
          <img src={additionalNotesIcon} alt="Additional Notes" />
        </div>
        <span className="additionalnotes-title">Additional Notes</span>
      </div>
      <div className="editor-container">
        <RichTextEditor
          initialValue={initialSlateValue}
          onChange={handleChange}
          placeholder="Add any additional notes or observations..."
          spellCheck={true}
          autoFocus={false}
          showToolbar={false}
        />
      </div>
    </div>
  );
};

export default AdditionalNotesRichTextEditor;

