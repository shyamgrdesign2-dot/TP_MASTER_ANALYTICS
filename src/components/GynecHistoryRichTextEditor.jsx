import React, { useCallback, useMemo, useState } from 'react';
import { Drawer } from 'antd';
import RichTextEditor from './richTextEditor/RichTextEditor';
import styles from './ConsultationDrawer.module.css';

import MedicalHistoryBox from './MedicalHistoryBox';
import MedicalHistoryBoxMobile from './MedicalHistoryBoxMobile';
import { arrayToSlateBulletList } from '../utils/slateHelpers';
import { isMobile, isTablet } from 'react-device-detect';
import { ASSETS } from "../assets";
const {
  medicalHistory: gynecHistoryIcon,
  icon: addEditIcon,
} = ASSETS.images;

const GynecHistoryRichTextEditor = ({
  gynecHistory = {},
  onUpdate,
  isProcessing = false,
  className = '',
}) => {
  const [gynecHistoryDrawer, setGynecHistoryDrawer] = useState(false);

  const formatValue = useCallback((value) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number' && value === 0) return null;
    const s = String(value).trim();
    if (s === '0') return null;
    return s;
  }, []);

  const buildGroup = useCallback((fields, history) => {
    const parts = fields
      .map(({ key, label }) => {
        const value = formatValue(history[key]);
        return value ? `${label}: ${value}` : null;
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [formatValue]);

  const createBoldItem = useCallback((text, labels) => {
    const boldParts = labels.map(label => {
      const start = text.indexOf(label);
      return start >= 0 ? { start, end: start + label.length } : null;
    }).filter(Boolean).sort((a, b) => a.start - b.start);
    return { text, boldParts };
  }, []);

  const initialSlateValue = useMemo(() => {
    const history = gynecHistory || {};
    const displayItems = [];

    // Last menstrual period
    const lmpValue =history.lastMenstrualPeriod !== undefined && history.lastMenstrualPeriod !== null ? history.lastMenstrualPeriod : history.lmp;
    if (lmpValue && formatValue(lmpValue)) {
      const text = `Last menstrual period: ${formatValue(lmpValue)}`;
      displayItems.push(createBoldItem(text, ['Last menstrual period']));
    }

    // Menarche
    const menarcheAge = formatValue(history.ageAtMenarche);
    if (menarcheAge) {
      const text = `Menarche (Age at: ${menarcheAge})`;
      displayItems.push(createBoldItem(text, ['Menarche', 'Age at:']));
    }

    // Cycle
    const intervalValue = formatValue(history.intervalOfCycle || history.intervalCycle);
    const cycleType = formatValue(history.cycle);
    const cycleNotes = formatValue(history.cycleNotes);
    const cycleParts = [];
    if (cycleType) cycleParts.push(`Type: ${cycleType}`);
    if (intervalValue) cycleParts.push(`Cycle Interval: ${intervalValue}`);
    if (cycleNotes) cycleParts.push(`Cycle Notes: ${cycleNotes}`);
    if (cycleParts.length > 0) {
      const text = `Cycle(${cycleParts.join(', ')})`;
      displayItems.push(createBoldItem(text, ['Cycle', 'Type:', 'Cycle Interval:', 'Cycle Notes:']));
    }

    // Flow
    const flowParts = buildGroup([
      { key: 'flow', label: 'Volume' },
      { key: 'durationOfMenstrualFlow', label: 'Duration of Menstrual Flow' },
      { key: 'clots', label: 'Clots During Flow' },
      { key: 'numberOfPadsPerDay', label: 'Number of Pads Per Day' },
      { key: 'flowNotes', label: 'Note' }
    ], history);
    if (flowParts) {
      const text = `Flow(${flowParts})`;
      displayItems.push(createBoldItem(text, ['Flow', 'Volume:', 'Duration of Menstrual Flow:', 'Clots During Flow:', 'Number of Pads Per Day:', 'Note:']));
    }

    // Pain
    const painParts = buildGroup([
      { key: 'pain', label: 'Level' },
      { key: 'occurrenceOfPain', label: 'Occurrence of pain' },
      { key: 'painNotes', label: 'Note' }
    ], history);
    if (painParts) {
      const text = `Pain(${painParts})`;
      displayItems.push(createBoldItem(text, ['Pain', 'Level:', 'Occurrence of pain:', 'Note:']));
    }

    // Lifecycle Hormonal Changes
    const lifecycleType = formatValue(history.lifecycleHarmonialChanges || history.reproductiveLifeStages);
    if (lifecycleType) {
      const typeLower = lifecycleType.toLowerCase();
      const ageLabel = typeLower === 'menopause' ? 'Age at Menopause' : typeLower === 'perimenopause' ? 'Age of Perimenopause' : typeLower === 'lactational amenorrhea' ? 'Age of Lactational amenorrhea' : `Age at ${lifecycleType}`;
      const typeLabel = typeLower === 'menopause' ? 'Type of Menopause' : typeLower === 'perimenopause' ? 'Type of Perimenopause' : typeLower === 'lactational amenorrhea' ? 'Type of Lactational amenorrhea' : `Type of ${lifecycleType}`;
      const parts = [`type: ${lifecycleType}`];
      const ageValue = formatValue(history.ageAtMenopause);
      if (ageValue) parts.push(`${ageLabel}: ${ageValue}`);
      const typeValue = formatValue(history.typeOfMenopause);
      if (typeValue) parts.push(`${typeLabel}: ${typeValue}`);
      const notesValue = formatValue(history.lifecycleHarmonialChangesNotes || history.reproductiveNotes);
      if (notesValue) parts.push(`Note: ${notesValue}`);
      const text = `Lifecycle Hormonal Changes(${parts.join(', ')})`;
      const boldLabels = ['Lifecycle Hormonal Changes', 'type:', ageLabel + ':', typeLabel + ':', 'Note:'].filter(label => text.includes(label));
      displayItems.push(createBoldItem(text, boldLabels));
    }

    // Note
    const notesValue = formatValue(history.notes);
    if (notesValue) {
      const text = `Note(${notesValue})`;
      displayItems.push(createBoldItem(text, ['Note']));
    }

    if (displayItems.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const textItems = displayItems.map((d) => (d && typeof d.text === 'string' ? d.text : ''));
    return arrayToSlateBulletList(textItems);
  }, [gynecHistory, formatValue, buildGroup, createBoldItem]);

  const gynecHistoryKeysSignature = useMemo(() => {
    if (!gynecHistory || typeof gynecHistory !== 'object') return 'empty';
    const filtered = Object.entries(gynecHistory)
      .filter(([key, value]) => {
        if (key === 'createdAt' || key === 'createdBy' || key === 'updatedAt' || key === 'updatedBy') return false;
        const strValue = formatValue(value);
        return strValue !== null && strValue !== '';
      })
      .map(([key, value]) => `${key}:${formatValue(value)}`)
      .sort();
    return filtered.length ? JSON.stringify(filtered) : 'empty';
  }, [gynecHistory, formatValue]);

  const hasContent = useMemo(() => {
    if (!gynecHistory || typeof gynecHistory !== 'object') return false;
    return Object.entries(gynecHistory).some(([key, value]) => {
      if (key === 'createdAt' || key === 'createdBy' || key === 'updatedAt' || key === 'updatedBy') return false;
      return formatValue(value) !== null;
    });
  }, [gynecHistory, formatValue]);

  // Show component if processing OR if there's content
  if (!isProcessing && !hasContent) {
    return null;
  }

  if (isProcessing) {
    return (
      <div className={`${styles['vitals-rich-text-editor']} ${className}`}>
        <div className={styles['vitals-content-box']}>
          <div className={styles['vitals-header']}>
            <div className={styles['medical-history-header-left']}>
              <div className={styles['vitals-icon']}>
                <img src={gynecHistoryIcon} alt="Gynec History" />
              </div>
              <span className={styles['vitals-title']}>Gynec History</span>
            </div>
          </div>
          <div className={styles['vitals-editor-container']}>
            <div className={styles['vitals-shimmer-container']}>
              <div className={styles['vitals-shimmer']}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${styles['vitals-rich-text-editor']} ${className}`}>
        <div className={styles['vitals-content-box']}>
          <div className={styles['vitals-header']}>
            <div className={styles['medical-history-header-left']}>
              <div className={styles['vitals-icon']}>
                <img src={gynecHistoryIcon} alt="Gynec History" />
              </div>
              <span className={styles['vitals-title']}>Gynec History</span>
            </div>
            <button
              className={styles['medical-history-action-button']}
              onClick={() => setGynecHistoryDrawer(true)}
            >
              <img
                src={addEditIcon}
                alt="Add/Edit"
                className={styles['medical-history-action-icon']}
              />
              <span>Add/Edit Gynec History</span>
            </button>
          </div>
          <div className={styles['vitals-editor-container']} style={{ pointerEvents: 'none', cursor: 'default' }}>
            <RichTextEditor
              key={`gynec-history-${gynecHistoryKeysSignature}`}
              initialValue={initialSlateValue}
              placeholder="Add gynec history (e.g., Cycle: Irregular | Flow: Heavy | Pain: Moderate)..."
              spellCheck={false}
              autoFocus={false}
              showToolbar={false}
              readOnly={true}
            />
          </div>
        </div>
      </div>
      <Drawer
        className="scroll-y-hidden"
        closeIcon={false}
        placement="right"
        onClose={() => setGynecHistoryDrawer(false)}
        open={gynecHistoryDrawer}
        width="75%"
      >
        {(isMobile && !isTablet) ? (
          <MedicalHistoryBoxMobile
            key={`gynec-history-drawer-${gynecHistoryDrawer}`}
            handleDrawerMedicalHistory={() => setGynecHistoryDrawer(false)}
            handleCollapsed={() => {}}
            initialGynecHistory={gynecHistory}
            initialActiveKey="gynec"
            gynecOnly={true}
            onSave={(savedGynecHistory) => {
              if (onUpdate) onUpdate(savedGynecHistory);
              setGynecHistoryDrawer(false);
            }}
          />
        ) : (
          <MedicalHistoryBox
            key={`gynec-history-drawer-${gynecHistoryDrawer}`}
            handleDrawerMedicalHistory={() => setGynecHistoryDrawer(false)}
            handleCollapsed={() => {}}
            initialGynecHistory={gynecHistory}
            initialActiveKey="gynec"
            gynecOnly={true}
            onSave={(savedGynecHistory) => {
              if (onUpdate) onUpdate(savedGynecHistory);
              setGynecHistoryDrawer(false);
            }}
          />
        )}
      </Drawer>
    </>
  );
};

export default GynecHistoryRichTextEditor;
