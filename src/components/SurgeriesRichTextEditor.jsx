import React, { useCallback, useMemo, useRef } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import styles from './ConsultationDrawer.module.css';
import { ASSETS } from "../assets";
const surgeriesIcon = ASSETS.images.surgery;

/**
 * SurgeriesRichTextEditor - Rich text editor for Surgeries/Procedures section
 * Data shape: [{ name: string, notes: string }]
 * Displays as bullet list: "name" or "name (notes)" when notes exist
 */
const SurgeriesRichTextEditor = ({
  surgeries = [],
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const previousCountRef = useRef(null);
  const keyVersionRef = useRef(0);

  const nonEmptyCount = useMemo(() => {
    if (!Array.isArray(surgeries) || surgeries.length === 0) {
      return 0;
    }
    return surgeries.filter((item = {}) => {
      const name = item.name || '';
      return name && name.trim() !== '';
    }).length;
  }, [surgeries]);

  const editorKey = useMemo(() => {
    if (previousCountRef.current === null) {
      previousCountRef.current = nonEmptyCount;
      return 'surgeries-0';
    }
    if (nonEmptyCount < previousCountRef.current) {
      keyVersionRef.current += 1;
    }
    previousCountRef.current = nonEmptyCount;
    return `surgeries-${keyVersionRef.current}`;
  }, [nonEmptyCount]);

  const initialSlateValue = useMemo(() => {
    if (!surgeries || surgeries.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }
    const formatted = surgeries.map((item) => {
      const name = (item.name || '').trim();
      const notes = (item.notes || '').trim();
      if (notes) return `${name} (${notes})`;
      return name;
    }).filter((text) => text.trim() !== '');

    if (formatted.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }
    return arrayToSlateBulletList(formatted);
  }, [surgeries]);

  const handleChange = useCallback((value) => {
    const lines = slateBulletListToArray(value);
    const surgeriesArray = lines.map((line) => {
      const trimmed = (line || '').trim();
      const match = trimmed.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
      if (match) {
        return { name: match[1].trim(), notes: (match[2] || '').trim() };
      }
      return { name: trimmed, notes: '' };
    });
    if (onUpdate) onUpdate(surgeriesArray);
  }, [onUpdate]);

  if (isProcessing) {
    return (
      <div className={`${styles['surgeries-rich-text-editor']} ${className}`}>
        <div className={styles['surgeries-content-box']}>
          <div className={styles['surgeries-header']}>
            <div className={styles['surgeries-icon']}>
              <img src={surgeriesIcon} alt="Surgeries/Procedures" />
            </div>
            <span className={styles['surgeries-title']}>Surgeries/Procedures</span>
          </div>
          <div className={styles['surgeries-editor-container']}>
            <div className={styles['surgeries-shimmer-container']}>
              <div className={styles['surgeries-shimmer']} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles['surgeries-rich-text-editor']} ${className}`}>
      <div className={styles['surgeries-content-box']}>
        <div className={styles['surgeries-header']}>
          <div className={styles['surgeries-icon']}>
            <img src={surgeriesIcon} alt="Surgeries/Procedures" />
          </div>
          <span className={styles['surgeries-title']}>Surgeries/Procedures</span>
        </div>
        <div className={styles['surgeries-editor-container']}>
          <RichTextEditor
            key={editorKey}
            initialValue={initialSlateValue}
            onChange={handleChange}
            placeholder="Add surgeries or procedures..."
            spellCheck={true}
            autoFocus={false}
            showToolbar={false}
          />
        </div>
      </div>
    </div>
  );
};

export default SurgeriesRichTextEditor;
