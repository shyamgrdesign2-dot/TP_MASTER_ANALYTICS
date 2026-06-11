import React, { useCallback, useMemo, useRef } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import './AdviceRichTextEditor.scss';
import { ASSETS } from "../assets";
const adviceIcon = ASSETS.images.advice;

/**
 * AdviceRichTextEditor - Rich text editor specifically for Advice section
 * Converts between array format [{lineItem: "advice text"}] and Slate.js format
 */
const AdviceRichTextEditor = ({
  advice = [],
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const previousCountRef = useRef(null);
  const keyVersionRef = useRef(0);
  const editorItemsRef = useRef([]);

  const nonEmptyCount = useMemo(() => {
    if (!Array.isArray(advice) || advice.length === 0) {
      return 0;
    }

    return advice.filter((adv = {}) => {
      const baseText = adv.name || adv.lineItem || '';
      return baseText && baseText.trim() !== '';
    }).length;
  }, [advice]);

  const editorKey = useMemo(() => {
    if (previousCountRef.current === null) {
      previousCountRef.current = nonEmptyCount;
      return 'advice-0';
    }

    if (nonEmptyCount < previousCountRef.current) {
      keyVersionRef.current += 1;
    }

    previousCountRef.current = nonEmptyCount;
    return `advice-${keyVersionRef.current}`;
  }, [nonEmptyCount]);

  const initialSlateValue = useMemo(() => {
    const currentItems = advice || [];
    let editorItems = editorItemsRef.current || [];
    
    if (editorItems.length === 0 && currentItems.length > 0) {
      editorItems = currentItems.map(adv => {
        const name = adv.name || adv.lineItem || '';
        const notes = adv.notes || '';
        return notes ? `${name} (${notes})` : name;
      });
      editorItemsRef.current = editorItems;
    }
    
    const allItems = editorItems.length > 0 ? editorItems : currentItems;
    
    if (allItems.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const formattedAdvice = allItems.map((adv) => {
      if (typeof adv === 'string') {
        return adv;
      }
      const name = adv.name || adv.lineItem || '';
      const notes = adv.notes || '';
      
      if (notes) {
        return `${name} (${notes})`;
      }
      
      return name;
    });
    
    if (formattedAdvice.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return arrayToSlateBulletList(formattedAdvice);
  }, [advice]);

  const handleChange = useCallback((value) => {
    const items = slateBulletListToArray(value);
    editorItemsRef.current = items;
    const adviceArray = items.map(text => ({ lineItem: text }));
    
    if (onUpdate) {
      onUpdate(adviceArray);
    }
  }, [onUpdate]);

  if (isProcessing) {
    return (
      <div className={`advice-rich-text-editor ${className}`}>
        <div className="advice-header">
        <div className="advice-icon">
          <img src={adviceIcon} alt="Advice" />
        </div>
          <span className="advice-title">Advice</span>
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
    <div className={`advice-rich-text-editor ${className}`}>
      <div className="advice-header">
        <div className="advice-icon">
          <img src={adviceIcon} alt="Advice" />
        </div>
        <span className="advice-title">Advice</span>
      </div>
      <div className="editor-container">
        <RichTextEditor
          key={editorKey}
          initialValue={initialSlateValue}
          onChange={handleChange}
          placeholder="Add advice..."
          spellCheck={true}
          autoFocus={false}
          showToolbar={false}
        />
      </div>
    </div>
  );
};

export default AdviceRichTextEditor;

