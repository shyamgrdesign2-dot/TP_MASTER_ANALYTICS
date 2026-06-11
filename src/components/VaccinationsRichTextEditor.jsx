import React, { useCallback, useMemo, useRef } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import styles from './ConsultationDrawer.module.css';
import { ASSETS } from "../assets";
const vaccinationIcon = ASSETS.images.vaccination;

const VaccinationsRichTextEditor = ({
  vaccinations = [],
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const previousCountRef = useRef(null);
  const keyVersionRef = useRef(0);
  const editorItemsRef = useRef([]);

  const nonEmptyCount = useMemo(() => {
    if (!Array.isArray(vaccinations) || vaccinations.length === 0) {
      return 0;
    }

    return vaccinations.filter((vaccination = {}) => {
      const baseText = vaccination.name || vaccination.lineItem || '';
      const hasExtra = (vaccination.schedule || vaccination.brand || vaccination.notes || '').toString().trim() !== '';
      return (baseText && baseText.trim() !== '') || hasExtra;
    }).length;
  }, [vaccinations]);

  const editorKey = useMemo(() => {
    if (previousCountRef.current === null) {
      previousCountRef.current = nonEmptyCount;
      return 'vaccinations-0';
    }

    if (nonEmptyCount < previousCountRef.current) {
      keyVersionRef.current += 1;
    }

    previousCountRef.current = nonEmptyCount;
    return `vaccinations-${keyVersionRef.current}`;
  }, [nonEmptyCount]);

  const formatOneVaccination = useCallback((vaccination) => {
    if (typeof vaccination === 'string') return vaccination;
    const name = vaccination.name || '';
    const parts = [];
    if (vaccination.brand) parts.push(`brand: ${vaccination.brand}`);
    if (vaccination.schedule) parts.push(`schedule: ${vaccination.schedule}`);
    if (vaccination.notes) parts.push(vaccination.notes);
    if (vaccination.severity) parts.push(vaccination.severity);
    if (vaccination.duration) parts.push(vaccination.duration);
    if (vaccination.type) parts.push(vaccination.type);
    if (parts.length > 0) {
      return name ? `${name} (${parts.join(', ')})` : parts.join(', ');
    }
    return name || vaccination.lineItem || '';
  }, []);

  const initialSlateValue = useMemo(() => {
    const currentItems = vaccinations || [];
    let editorItems = editorItemsRef.current || [];
    
    if (editorItems.length === 0 && currentItems.length > 0) {
      editorItems = currentItems.map((vacc) => formatOneVaccination(vacc));
      editorItemsRef.current = editorItems;
    }
    
    const allItems = editorItems.length > 0 ? editorItems : currentItems;
    
    if (allItems.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const formattedVaccinations = allItems.map((v) => formatOneVaccination(v));
    
    if (formattedVaccinations.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return arrayToSlateBulletList(formattedVaccinations);
  }, [vaccinations, formatOneVaccination]);

  const handleChange = useCallback((value) => {
    const items = slateBulletListToArray(value);
    editorItemsRef.current = items;
    const vaccinationsArray = items.map(text => ({ lineItem: text }));
    
    if (onUpdate) {
      onUpdate(vaccinationsArray);
    }
  }, [onUpdate]);

  if (isProcessing) {
    return (
      <div className={`${styles['symptoms-rich-text-editor']} ${className}`}>
        <div className={styles['symptoms-content-box']}>
          <div className={styles['symptoms-header']}>
            <div className={styles['symptoms-icon']}>
              <img src={vaccinationIcon} alt="Vaccination" />
            </div>
            <span className={styles['symptoms-title']}>Vaccination</span>
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
            <img src={vaccinationIcon} alt="Vaccination" />
          </div>
          <span className={styles['symptoms-title']}>Vaccination</span>
        </div>
        <div className={styles['symptoms-editor-container']}>
          <RichTextEditor
            key={editorKey}
            initialValue={initialSlateValue}
            onChange={handleChange}
            placeholder="Add vaccinations..."
            spellCheck={true}
            autoFocus={false}
            showToolbar={false}
          />
        </div>
      </div>
    </div>
  );
};

export default VaccinationsRichTextEditor;

