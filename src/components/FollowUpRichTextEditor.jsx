import React, { useCallback, useMemo, useRef } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import './FollowUpRichTextEditor.scss';
import { ASSETS } from "../assets";
const followUpIcon = ASSETS.images.followup;

/**
 * FollowUpRichTextEditor - Rich text editor specifically for Follow Up section
 * Handles follow up text (single value, not array)
 */
const FollowUpRichTextEditor = ({
  followUp = '',
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const editorTextRef = useRef('');

  const initialSlateValue = useMemo(() => {
    const currentText = followUp || '';
    const editorText = editorTextRef.current || '';
    
    const displayText = currentText || editorText;
    
    return [{ type: 'paragraph', children: [{ text: displayText }] }];
  }, [followUp]);

  const handleChange = useCallback((value) => {
    const text = value.map(n => n.children.map(c => c.text).join('')).join('\n');
    editorTextRef.current = text;
    
    if (onUpdate) {
      onUpdate(text);
    }
  }, [onUpdate]);

  if (isProcessing) {
    return (
      <div className={`followup-rich-text-editor ${className}`}>
        <div className="followup-header">
          <div className="followup-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
          </div>
          <span className="followup-title">Follow Up</span>
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
    <div className={`followup-rich-text-editor ${className}`}>
      <div className="followup-header">
        <div className="followup-icon">
          <img src={followUpIcon} alt="Follow Up" />
        </div>
        <span className="followup-title">Follow Up</span>
      </div>
      <div className="editor-container">
        <RichTextEditor
          initialValue={initialSlateValue}
          onChange={handleChange}
          placeholder="Add follow up date or notes..."
          spellCheck={true}
          autoFocus={false}
          showToolbar={false}
        />
      </div>
    </div>
  );
};

export default FollowUpRichTextEditor;

