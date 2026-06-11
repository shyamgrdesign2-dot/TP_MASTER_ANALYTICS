import React, { useCallback, useMemo } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import './InvestigationRichTextEditor.scss';

import { INVESTIGATION_TITLE } from '../utils/constants';
import { ASSETS } from "../assets";
const investigationIcon = ASSETS.images.lab;

/**
 * InvestigationRichTextEditor - Rich text editor specifically for Investigation section
 * Converts between array format [{name: "investigation name"}] and Slate.js format
 */
const InvestigationRichTextEditor = ({
  labInvestigation = [],
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const initialSlateValue = useMemo(() => {
    if (!labInvestigation || labInvestigation.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const formattedInvestigations = labInvestigation.map(investigation => {
      const name = investigation.name || '';
      const parts = [];

      if (investigation.notes) parts.push(investigation.notes);

      if (parts.length > 0) {
        return `${name} (${parts.join(', ')})`;
      }

      return name || investigation.lineItem || '';
    }).filter(text => text.trim() !== '');

    if (formattedInvestigations.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return arrayToSlateBulletList(formattedInvestigations);
  }, [labInvestigation]);

  const handleChange = useCallback((value) => {
    const items = slateBulletListToArray(value);
    const investigationArray = items.map(text => ({ name: text }));

    if (onUpdate) {
      onUpdate(investigationArray);
    }
  }, [onUpdate]);

  if (isProcessing) {
    return (
      <div className={`investigation-rich-text-editor ${className}`}>
        <div className="investigation-header">
          <div className="investigation-icon">
            <img src={investigationIcon} alt="Investigation" />
          </div>
          <span className="investigation-title">{INVESTIGATION_TITLE}</span>
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
    <div className={`investigation-rich-text-editor ${className}`}>
      <div className="investigation-header">
        <div className="investigation-icon">
          <img src={investigationIcon} alt="Investigation" />
        </div>
        <span className="investigation-title">{INVESTIGATION_TITLE}</span>
      </div>
      <div className="editor-container">
        <RichTextEditor
          initialValue={initialSlateValue}
          onChange={handleChange}
          placeholder="Add investigations..."
          spellCheck={true}
          autoFocus={false}
          showToolbar={false}
        />
      </div>
    </div>
  );
};

export default InvestigationRichTextEditor;

