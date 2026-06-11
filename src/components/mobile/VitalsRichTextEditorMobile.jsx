/**
 * Mobile-only VitalsRichTextEditor. Uses VitalsBoxMobile and bottom-sheet drawer.
 * Desktop uses VitalsRichTextEditor.jsx (prod version with VitalsBox).
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Drawer } from 'antd';
import moment from 'moment';
import RichTextEditor from '../richTextEditor/RichTextEditor';
import styles from '../ConsultationDrawer.module.css';

import VitalsBoxMobile from '../VitalsBoxMobile';
import { useSelector } from 'react-redux';
import './MobileVitalsEditSheet.scss';
import { enrichVitalsWithCalculations } from '../../utils/vitalsCalculations';
import { ASSETS } from "../../assets";
const {
  vitals: vitalsIcon,
  icon: addEditIcon,
} = ASSETS.images;

const VitalsRichTextEditorMobile = ({
  vitalsAndBodyComposition = {},
  onUpdate,
  isProcessing = false,
  className = '',
  mergedVitals: mergedVitalsProp,
  apiVitals,
  isVoiceAmbientFlow = false,
  patient_data,
  vitalsFlow,
  showWhenEmpty = false,
}) => {
  const [vitalsDrawer, setVitalsDrawer] = useState(false);

  const mergedVitals = useMemo(() => {
    // Use mergedVitalsProp if provided, otherwise process vitalsAndBodyComposition
    if (mergedVitalsProp) {
      return mergedVitalsProp;
    }
    
    const rxPadVitals = vitalsAndBodyComposition || {};
    const keyMapping = {
      'temp': 'temperature',
      'pres': 'pulse',
      'resp_rate': 'respRate',
      'respRate': 'respRate',
      'systolic': 'Systolic',
      'Systolic': 'Systolic',
      'diastolic': 'Diastolic',
      'Diastolic': 'Diastolic',
      'general_rbs': 'General RBS',
      'generalrbs': 'General RBS',
      'genralrbs': 'General RBS',
      'General RBS': 'General RBS',
      'fib4': 'FIB4',
      'FIB4': 'FIB4',
      'waist_circumference': 'Waist Circumference',
      'Waist Circumference': 'Waist Circumference',
      'bmi': 'BMI',
      'BMI': 'BMI',
      'bmr': 'BMR',
      'BMR': 'BMR',
      'bsa': 'BSA',
      'BSA': 'BSA'
    };
    const normalizeKey = (key) => {
      const lowerKey = key.toLowerCase();
      if (keyMapping[lowerKey]) return keyMapping[lowerKey];
      if (keyMapping[key]) return keyMapping[key];
      return key;
    };
    const merged = {};
    // Preserve ID fields directly (tcv_id, tcbc_id, dev_unique_id from VitalsBox Done -> addUpdateVitals response)
    const idFields = ['tcv_id', 'tcbc_id', 'dev_unique_id', 'pam_id'];
    idFields.forEach(idKey => {
      if (rxPadVitals[idKey] !== undefined && rxPadVitals[idKey] !== null) {
        merged[idKey] = rxPadVitals[idKey];
      }
    });
    Object.entries(rxPadVitals).forEach(([key, value]) => {
      if (key === 'date' || idFields.includes(key)) return; // Skip date and IDs (already handled)
      const normalizedKey = normalizeKey(key);
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        merged[normalizedKey] = String(value).trim();
      }
    });
    merged.date = merged.date || moment().format('YYYY-MM-DD');
    const sanitizeValue = (key, value) => {
      // Preserve ID fields as-is (don't sanitize metadata)
      if (idFields.includes(key)) return value;
      if (value === undefined || value === null) return '';
      const str = String(value).trim();
      if (key === 'bloodPressure') {
        const cleaned = str.replace(/[^0-9/.-]/g, '').replace(/\/+/g, '/');
        return cleaned;
      }
      const cleaned = str.replace(/[^0-9.-]/g, '');
      return cleaned;
    };
    const cleanedVitals = {};
    Object.entries(merged).forEach(([k, v]) => {
      if (k === 'date' || idFields.includes(k)) {
        cleanedVitals[k] = v; // Preserve date and IDs as-is
      } else {
        cleanedVitals[k] = sanitizeValue(k, v);
      }
    });

    const height = cleanedVitals.height || cleanedVitals.Height;
    const weight = cleanedVitals.weight || cleanedVitals.Weight;
    if (height && weight) {
      const forEnrich = { ...cleanedVitals, height, weight };
      const patientDetails = patient_data;
      const enriched = enrichVitalsWithCalculations(forEnrich, patientDetails);
      if (enriched.bmi != null) cleanedVitals.BMI = enriched.bmi;
      if (enriched.bsa != null) cleanedVitals.BSA = enriched.bsa;
      if (enriched.bmr != null) cleanedVitals.BMR = enriched.bmr;
    }

    return cleanedVitals;
  }, [mergedVitalsProp, vitalsAndBodyComposition, patient_data]);

  const extractNumericValue = (value, unit) => {
    if (!value) return value;
    const strValue = String(value).trim();
    if (!unit) return strValue;
    const unitLower = unit.toLowerCase().trim();
    const valueLower = strValue.toLowerCase();
    if (valueLower.includes(unitLower)) {
      const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return strValue.replace(new RegExp(`\\s*${escapedUnit}\\s*`, 'gi'), '').trim();
    }
    return strValue;
  };

  const shouldAddUnit = (value, unit) => {
    if (!unit || !value) return false;
    const strValue = String(value).trim().toLowerCase();
    const unitLower = unit.toLowerCase().trim();
    const unitVariants = [
      unitLower,
      unitLower.replace(/\s+/g, ''),
      unitLower.replace(/\//g, '')
    ];
    return !unitVariants.some(variant => strValue.includes(variant));
  };

  const initialSlateValue = useMemo(() => {
    const currentVitals = mergedVitals;
    const vitalsHiddenIds = ['tcv_id', 'tcbc_id', 'dev_unique_id', 'pam_id'];
    const date = currentVitals.date || moment().format('YYYY-MM-DD');
    const formattedDate = moment(date, ['YYYY-MM-DD', 'DD MMM YYYY', 'DD MMM, YY']).format('DD MMM YYYY');
    const vitalFieldMap = {
      'temp': { label: 'Temperature', unit: 'Frh' },
      'temperature': { label: 'Temperature', unit: 'Frh' },
      'pres': { label: 'Pulse', unit: '/min' },
      'pulse': { label: 'Pulse', unit: '/min' },
      'resp_rate': { label: 'RR', unit: '/min' },
      'respRate': { label: 'RR', unit: '/min' },
      'systolic': { label: 'Systolic', unit: 'mmHg' },
      'Systolic': { label: 'Systolic', unit: 'mmHg' },
      'diastolic': { label: 'Diastolic', unit: 'mmHg' },
      'Diastolic': { label: 'Diastolic', unit: 'mmHg' },
      'spo2': { label: 'SPO2', unit: '%' },
      'general_rbs': { label: 'General RBS', unit: 'mg/dl' },
      'General RBS': { label: 'General RBS', unit: 'mg/dl' },
      'fib4': { label: 'FIB4', unit: '' },
      'FIB4': { label: 'FIB4', unit: '' },
      'waist_circumference': { label: 'Waist Circumference', unit: 'cms' },
      'Waist Circumference': { label: 'Waist Circumference', unit: 'cms' },
      'ofc': { label: 'OFC', unit: 'cms' },
      'height': { label: 'Height', unit: 'cm' },
      'weight': { label: 'Weight', unit: 'kg' },
      'bmi': { label: 'BMI', unit: 'kg/m²' },
      'BMI': { label: 'BMI', unit: 'kg/m²' },
      'bmr': { label: 'BMR', unit: 'kcals' },
      'BMR': { label: 'BMR', unit: 'kcals' },
      'bsa': { label: 'BSA', unit: 'm²' },
      'BSA': { label: 'BSA', unit: 'm²' },
    };
    const fieldOrder = [
      'temperature', 'pulse', 'respRate', 'Systolic', 'Diastolic', 'spo2',
      'General RBS', 'FIB4', 'Waist Circumference', 'ofc',
      'height', 'weight', 'BMI', 'BMR', 'BSA'
    ];
    const vitalPairs = [];
    const processedKeys = new Set();
    fieldOrder.forEach(fieldKey => {
      const value = currentVitals[fieldKey];
      if (value !== undefined && value !== null) {
        const strValue = String(value).trim();
        if (strValue !== '' && strValue !== 'undefined' && strValue !== 'null' && !processedKeys.has(fieldKey)) {
          const fieldInfo = vitalFieldMap[fieldKey];
          if (fieldInfo) {
            const cleanValue = extractNumericValue(strValue, fieldInfo.unit);
            const displayValue = fieldInfo.unit && shouldAddUnit(cleanValue, fieldInfo.unit)
              ? `${cleanValue} ${fieldInfo.unit}`
              : cleanValue;
            vitalPairs.push(`${fieldInfo.label}: ${displayValue}`);
            processedKeys.add(fieldKey);
          }
        }
      }
    });

    // Skip BP/blood_press in Rx pad; only Systolic and Diastolic are shown above (match desktop)
    const bpDisplayKeys = ['blood_press', 'bloodPressure', 'BP'];
    Object.entries(currentVitals).forEach(([key, value]) => {
      if (key === 'date' || processedKeys.has(key) || vitalsHiddenIds.includes(key) || bpDisplayKeys.includes(key)) return;
      const strValue = String(value || '').trim();
      if (strValue !== '' && strValue !== 'undefined' && strValue !== 'null') {
        const fieldInfo = vitalFieldMap[key];
        if (fieldInfo) {
          const cleanValue = extractNumericValue(strValue, fieldInfo.unit);
          const displayValue = fieldInfo.unit && shouldAddUnit(cleanValue, fieldInfo.unit)
            ? `${cleanValue} ${fieldInfo.unit}`
            : cleanValue;
          vitalPairs.push(`${fieldInfo.label}: ${displayValue}`);
        } else {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/\b(bp|rr|spo2|rbs|ofc|fib4)\b/gi, match => match.toUpperCase()).replace(/\s+/g, ' ').trim();
          vitalPairs.push(`${formattedKey}: ${strValue}`);
        }
      }
    });

    if (vitalPairs.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const inlineText = `${formattedDate} (${vitalPairs.join(' | ')})`;
    return [{ type: 'paragraph', children: [{ text: inlineText }] }];
  }, [mergedVitals]);

  const vitalKeysSignature = useMemo(() => {
    if (!mergedVitals || typeof mergedVitals !== 'object') {
      return 'empty';
    }
    const filtered = Object.entries(mergedVitals)
      .filter(([key, value]) => {
        if (key === 'date') return false;
        const strValue = String(value || '').trim();
        return strValue !== '' && strValue !== 'undefined' && strValue !== 'null';
      })
      .map(([key, value]) => `${key}:${String(value).trim()}`)
      .sort();
    return filtered.length ? JSON.stringify(filtered) : 'empty';
  }, [mergedVitals]);

  const handleVitalsSave = useCallback((vitalsObject) => {
    if (typeof onUpdate !== 'function' || vitalsObject == null) return;
    onUpdate(vitalsObject);
  }, [onUpdate]);

  const vitalsLoading = useSelector((state) => state.vitals?.loading ?? false);
  const vitalsBoxRef = useRef(null);
  const [hasVitalsData, setHasVitalsData] = useState(false);

  const handleVitalsDataChange = useCallback((hasData) => {
    setHasVitalsData(hasData);
  }, []);

  const handleMobileDone = useCallback(() => {
    if (vitalsBoxRef.current?.onAddUpdateClicked) {
      vitalsBoxRef.current.onAddUpdateClicked();
    }
  }, []);

  const hasVitalsToDisplay = !isProcessing && mergedVitals &&
    Object.values(mergedVitals).some(value => {
      const strValue = String(value || '').trim();
      return strValue !== '' && strValue !== 'undefined' && strValue !== 'null';
    });
  const hasApiVitals = !isProcessing && apiVitals &&
    Object.values(apiVitals).some(value => {
      const strValue = String(value ?? '').trim();
      return strValue !== '' && strValue !== 'undefined' && strValue !== 'null';
    });
  const hasProductionVitals = !isProcessing && vitalsAndBodyComposition &&
    Object.values(vitalsAndBodyComposition).some(value =>
      value !== undefined && value !== null && value !== ''
    );

  if (!showWhenEmpty && !isProcessing && !hasVitalsToDisplay && !hasApiVitals && !hasProductionVitals) {
    return null;
  }

  if (isProcessing) {
    return (
      <div className={`${styles['vitals-rich-text-editor']} ${className}`}>
        <div className={styles['vitals-content-box']}>
          <div className={styles['vitals-header']}>
            <div className={styles['medical-history-header-left']}>
            <div className={styles['vitals-icon']}>
              <img src={vitalsIcon} alt="Vitals" />
            </div>
            <span className={styles['vitals-title']}>Vitals</span>
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
              <img src={vitalsIcon} alt="Vitals" />
            </div>
            <span className={styles['vitals-title']}>Vitals</span>
            </div>
            <button
              type="button"
              className={styles['medical-history-action-button']}
              onClick={() => setVitalsDrawer(true)}
            >
              <img
                src={addEditIcon}
                alt="Add/Edit"
                className={styles['medical-history-action-icon']}
              />
              <span>Add/Edit Vitals</span>
            </button>
          </div>
          <div className={styles['vitals-editor-container']} style={{ pointerEvents: 'none', cursor: 'default' }}>
        <RichTextEditor
          key={`vitals-${vitalKeysSignature}`}
          initialValue={initialSlateValue}
              placeholder="Add vitals (e.g., 02 Jun 2024 (Pulse: 78T | BP: 130/80 | Temperature: 98.6Frh))..."
              spellCheck={false}
          autoFocus={false}
          showToolbar={false}
              readOnly={true}
        />
        </div>
      </div>
    </div>

      <Drawer
        placement="bottom"
        onClose={() => setVitalsDrawer(false)}
        open={vitalsDrawer}
        height="90vh"
        className="mobile-vitals-bottom-sheet"
        closable={false}
        maskClosable
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <VitalsBoxMobile
              ref={vitalsBoxRef}
              key={`vitals-mobile-${vitalsDrawer}`}
              handleDrawerVital={() => setVitalsDrawer(false)}
              handleCollapsed={(flag) => {
                if (flag === 1) {
                  setVitalsDrawer(false);
                }
              }}
              initialVitals={mergedVitals}
              onVitalsUpdate={onUpdate}
              onVitalsSave={handleVitalsSave}
              hideHeaderButton={false}
              hideHeaderElements={false}
              onVitalsDataChange={handleVitalsDataChange}
              isVoiceAmbientFlow={isVoiceAmbientFlow}
              patient_data={patient_data}
              vitalsFlow={vitalsFlow}
            />
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default VitalsRichTextEditorMobile;

