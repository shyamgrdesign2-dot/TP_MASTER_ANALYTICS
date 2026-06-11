import React, { useCallback, useMemo, useState, useContext, useEffect, useRef } from 'react';
import { Drawer } from 'antd';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList } from '../utils/slateHelpers';
import './LabResultsRichTextEditor.scss';

import LabParams from './LabParams';
import CashManagerContext from '../context/CashManagerContext';
import styles from './ConsultationDrawer.module.css';
import {
  getTodayLabResults,
  fetchLabResultsTodayOnly,
  matchLabResultsWithApi,
  prescriptionLabResultsToResultsArray,
  extractUnitsFromValue,
  valueWithoutUnitsForApi,
} from '../utils/labResultsUtils';
import { addPatientLabReports } from '../api/services/ApiLabParams';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../utils/constants';
import { jwtDecode } from 'jwt-decode';
import { ASSETS } from "../assets";
const {
  lab: labResultsIcon,
  icon: addEditIcon,
} = ASSETS.images;

/**
 * LabResultsRichTextEditor - Rich text editor for Lab Results section
 * - When snap/smart/voice/ambient returns: fetches today's lab results from backend;
 *   if API lab results empty → display only backend; if API has lab results → match with lab
 *   search API (testName + reportName), merge with today's backend (update value if exists else add), display merged.
 * - "Add/Edit Lab Results" opens the full Add Lab Results sidebar (LabParams).
 */
const LabResultsRichTextEditor = ({
  labResults = [],
  onUpdate,
  isProcessing = false,
  className = '',
  onLabResultsSaved,
  patient_data: patientDataProp,
  skipAutoFetchAndMerge = false,
  /** When true, LabParams will apply raw prefill (value/units parsing). Set only for voice/snap/ambient/smart; keep false for consult. */
  enableLabPrefillFromVoiceSnapSmart = false,
  /** When true, hide the Add/Edit Lab Results button (e.g. on mobile Rx Pad). */
  hideAddEditButton = false,
}) => {
  const [labResultsDrawer, setLabResultsDrawer] = useState(false);
  const [drawerInstanceKey, setDrawerInstanceKey] = useState(0);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const { patient_data: patientDataContext } = useContext(CashManagerContext);
  const patient_data = patientDataProp ?? patientDataContext;
  const lastProcessedResultsRef = useRef(null);
  const lastSentSignatureRef = useRef(null);
  const prevPatientIdRef = useRef(null);

  useEffect(() => {
    const runLabResultsLogic = async () => {
      if (!patient_data?.patient_unique_id || !onUpdate) return;
      if (skipAutoFetchAndMerge) return;

      const incomingResults = Array.isArray(labResults) ? labResults : [];

      if (prevPatientIdRef.current !== patient_data?.patient_unique_id) {
        prevPatientIdRef.current = patient_data?.patient_unique_id;
        lastSentSignatureRef.current = null;
        lastProcessedResultsRef.current = null;
      }

      if (incomingResults.length === 0) {
        const todayOnly = await fetchLabResultsTodayOnly(patient_data);
        if (todayOnly && todayOnly.length > 0) {
          const sig = JSON.stringify(todayOnly.map((r) => ({ testname: (r.testName || r.testname || r.name || '').trim(), value: (r.value || '').trim() })));
          if (lastProcessedResultsRef.current !== sig) {
            lastProcessedResultsRef.current = sig;
            onUpdate(todayOnly);
          }
        }
        return;
      }

      const incomingSignature = JSON.stringify(
        incomingResults.map((r) => ({
          testname: (r.testName || r.testname || r.name || '').trim(),
          value: (r.value || '').trim(),
        }))
      );
      if (lastSentSignatureRef.current !== null && incomingSignature === lastSentSignatureRef.current) {
        return;
      }
      if (lastProcessedResultsRef.current !== null && incomingSignature === lastProcessedResultsRef.current) {
        return;
      }

      let matchedIncoming = [];
      try {
        matchedIncoming = await matchLabResultsWithApi(incomingResults);
      } catch (error) {
        matchedIncoming = incomingResults;
      }

      let todayLabResults = [];
      try {
        const todayResults = await getTodayLabResults(patient_data, true);
        if (todayResults && todayResults.length > 0) {
          todayLabResults = todayResults;
        }
      } catch (error) {
        // continue with incoming only
      }

      const mergedMap = new Map();
      todayLabResults.forEach((result) => {
        const testName = (result.testName || result.testname || result.name || '').trim();
        const reportName = (result.reportName || '').trim();
        if (testName && reportName) {
          mergedMap.set(testName, { ...result, testName, testname: testName, name: testName });
        }
      });

      matchedIncoming.forEach((result) => {
        const testName = (result.testName || result.testname || result.name || '').trim();
        const reportName = (result.reportName || '').trim();
        if (!testName) return;

        const existing = mergedMap.get(testName);
        if (existing) {
          const existingUnits = extractUnitsFromValue(existing.value || '');
          const incomingValue = (result.value || '').trim();
          const numericValue = valueWithoutUnitsForApi(incomingValue);
          const incomingUnits = extractUnitsFromValue(incomingValue);

          mergedMap.set(testName, {
            ...existing,
            testName,
            testname: testName,
            name: testName,
            reportName: reportName || existing.reportName || '',
            units: result.units || existing.units || '',
            value: incomingUnits
              ? `${numericValue} ${incomingUnits}`
              : existingUnits
                ? `${numericValue} ${existingUnits}`
                : numericValue,
          });
        } else {
          mergedMap.set(testName, { ...result, testName, testname: testName, name: testName, reportName: reportName || '' });
        }
      });

      const finalResults = Array.from(mergedMap.values());
      if (finalResults.length === 0 && incomingResults.length > 0) return;

      const patientId = patient_data.patient_unique_id;
      let doctorId = null;
      try {
        const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
        const cleaned = token ? token.replace(/['"]+/g, '') : '';
        if (cleaned) {
          const decoded = jwtDecode(cleaned);
          doctorId = decoded?.result?.user_id;
        }
      } catch (e) {
        // skip
      }

      if (patientId && doctorId != null && finalResults.length > 0) {
        try {
          const results = prescriptionLabResultsToResultsArray(finalResults);
          if (results.length > 0) {
            await addPatientLabReports({ patientId, doctorId, results });
            const refetched = await fetchLabResultsTodayOnly(patient_data);
            if (refetched && refetched.length > 0) {
              const sig = JSON.stringify(refetched.map((r) => ({ testname: (r.testName || r.testname || r.name || '').trim(), value: (r.value || '').trim() })));
              lastProcessedResultsRef.current = sig;
              lastSentSignatureRef.current = incomingSignature;
              onUpdate(refetched);
              return;
            }
          }
        } catch (err) {
          console.warn('[LabResultsRichTextEditor] Save lab results failed', err);
        }
      }

      const signature = JSON.stringify(
        finalResults.map((r) => ({
          testname: (r.testName || r.testname || r.name || '').trim(),
          value: (r.value || '').trim(),
        }))
      );
      if (signature !== lastProcessedResultsRef.current) {
        lastProcessedResultsRef.current = signature;
        lastSentSignatureRef.current = incomingSignature;
        onUpdate(finalResults);
      }
    };

    runLabResultsLogic();
  }, [labResults, patient_data?.patient_unique_id, skipAutoFetchAndMerge]); // eslint-disable-line react-hooks/exhaustive-deps -- omit onUpdate to prevent infinite loop (inline callback from parent)

  const editorSignature = useMemo(() => {
    if (!Array.isArray(labResults)) {
      return 'empty';
    }
    return JSON.stringify(
      labResults.map((result = {}) => ({
        testname: (result.testName || result.testname || result.name || '').trim(),
        value: (result.value || '').trim(),
      }))
    );
  }, [labResults]);

  const editorKey = useMemo(() => `labresults-${editorSignature}`, [editorSignature]);

  const initialSlateValue = useMemo(() => {
    if (!labResults || labResults.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }
    const formattedResults = labResults.map(result => {
      const testName = (result.testName || result.testname || result.name || '').trim();
      const value = result.value || '';
      if (testName && value) {
        return `${testName} (${value})`;
      } else if (value) {
        return value;
      } else if (testName) {
        return testName;
      }
      return '';
    }).filter(text => text.trim() !== '');
    
    if (formattedResults.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return arrayToSlateBulletList(formattedResults);
  }, [labResults]);

  const handleLabParamsUpdate = useCallback((fetchedLabResults) => {
    setLabResultsDrawer(false);
    
    // Update RxPad and sidebar with fetched lab results from GET API
    if (fetchedLabResults && Array.isArray(fetchedLabResults) && fetchedLabResults.length > 0 && onUpdate) {
      const sig = JSON.stringify(
        fetchedLabResults.map((r) => ({
          testname: (r.testName || r.testname || r.name || '').trim(),
          value: (r.value || '').trim(),
        }))
      );
      lastProcessedResultsRef.current = sig;
      onUpdate(fetchedLabResults);
    }
    
    if (typeof onLabResultsSaved === 'function') {
      onLabResultsSaved();
    }
  }, [onLabResultsSaved, onUpdate]);

  const handleSidebarSaveSuccess = useCallback(async () => {
    if (!onUpdate || !patient_data?.patient_unique_id) return;
    try {
      const refetched = await fetchLabResultsTodayOnly(patient_data);
      if (refetched && refetched.length > 0) {
        const sig = JSON.stringify(
          refetched.map((r) => ({
            testname: (r.testName || r.testname || r.name || '').trim(),
            value: (r.value || '').trim(),
          }))
        );
        lastProcessedResultsRef.current = sig;
        onUpdate(refetched);
      }
    } catch (e) {
      // no-op
    }
  }, [onUpdate, patient_data?.patient_unique_id]);

  const handleSidebarResultsSync = useCallback(
    async (syncedLabResults = []) => {
      if (!onUpdate || !patient_data?.patient_unique_id) return;

      const newResults = Array.isArray(syncedLabResults) ? syncedLabResults : [];

      let matchedNewResults = newResults;
      if (newResults.length > 0) {
        try {
          matchedNewResults = await matchLabResultsWithApi(newResults);
        } catch (error) {
          // use raw newResults on match failure
        }
      }

      let todayLabResults = [];
      try {
        const todayResults = await getTodayLabResults(patient_data, true);
        if (todayResults && Array.isArray(todayResults) && todayResults.length > 0) {
          todayLabResults = todayResults;
        }
      } catch (error) {
        onUpdate(matchedNewResults);
        return;
      }

      const mergedMap = new Map();

      todayLabResults.forEach((result) => {
        const testName = (result.testName || result.testname || result.name || '').trim();
        const reportName = (result.reportName || '').trim();
        if (testName && reportName) {
          mergedMap.set(testName, { ...result, testName, testname: testName, name: testName });
        }
      });

      matchedNewResults.forEach((result) => {
        const testName = (result.testName || result.testname || result.name || '').trim();
        const reportName = (result.reportName || '').trim();
        if (!testName || !reportName) return;

        const existing = mergedMap.get(testName);
        if (existing) {
          const existingUnits = extractUnitsFromValue(existing.value || '');
          const newValue = (result.value || '').trim();
          const numericValue = valueWithoutUnitsForApi(newValue);
          const newUnits = extractUnitsFromValue(newValue);

          mergedMap.set(testName, {
            ...existing,
            testName,
            testname: testName,
            name: testName,
            reportName,
            units: result.units || existing.units || '',
            value: newUnits
              ? `${numericValue} ${newUnits}`
              : existingUnits
                ? `${numericValue} ${existingUnits}`
                : numericValue,
          });
        } else {
          mergedMap.set(testName, { ...result, testName, testname: testName, name: testName });
        }
      });

      const sidebarFinal = Array.from(mergedMap.values());
      onUpdate(sidebarFinal);
    },
    [onUpdate, patient_data]
  );

  const handleOpenLabResultsDrawer = useCallback(() => {
    setDrawerInstanceKey(prev => prev + 1);
    setLabResultsDrawer(true);
  }, []);

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(prev => !prev);
  }, []);

  const drawerPrefillResults = useMemo(
    () => (Array.isArray(labResults) ? labResults : []),
    [labResults]
  );

  if (isProcessing) {
    return (
      <div className={`labresults-rich-text-editor ${className}`}>
        <div className={`${styles['lab-results-header']} ${styles['vitals-header']}`}>
          <div className={styles['medical-history-header-left']}>
            <div className={styles['lab-results-icon']}>
              <img src={labResultsIcon} alt="Lab Results" />
            </div>
            <span className={styles['lab-results-title']}>Lab Results</span>
          </div>
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
    <>
      <div className={`labresults-rich-text-editor ${className}`}>
        <div className={`${styles['lab-results-header']} ${styles['vitals-header']}`}>
          <div className={styles['medical-history-header-left']}>
            <div className={styles['lab-results-icon']}>
              <img src={labResultsIcon} alt="Lab Results" />
            </div>
            <span className={styles['lab-results-title']}>Lab Results</span>
          </div>
          {!hideAddEditButton && (
            <button
              type="button"
              className={styles['medical-history-action-button']}
              onClick={handleOpenLabResultsDrawer}
            >
              <img
                src={addEditIcon}
                alt="Add/Edit"
                className={styles['medical-history-action-icon']}
              />
              <span>Add/Edit Lab Results</span>
            </button>
          )}
        </div>
        <div className="editor-container lab-results-readonly">
          <RichTextEditor
            key={editorKey}
            initialValue={initialSlateValue}
            placeholder="Add lab results (e.g., Hemoglobin: 13.5 g/dL)..."
            spellCheck={true}
            autoFocus={false}
            showToolbar={false}
            readOnly={true}
          />
        </div>
      </div>

      <Drawer
        className="scroll-y-hidden"
        closeIcon={false}
        placement="right"
        onClose={() => setLabResultsDrawer(false)}
        open={labResultsDrawer}
        width={880}
      >
        <LabParams
          key={drawerInstanceKey}
          handleAddLabParamsDrawer={() => setLabResultsDrawer(false)}
          patient_unique_id={patient_data?.patient_unique_id}
          onSave={handleLabParamsUpdate}
          onSaveSuccess={handleSidebarSaveSuccess}
          isBackModalOpen={isBackModalOpen}
          showHideBackModal={showHideBackModal}
          patientGender={patient_data?.pm_gender}
          prefillLabResults={drawerPrefillResults}
          onResultsChange={handleSidebarResultsSync}
          applyRawPrefill={enableLabPrefillFromVoiceSnapSmart}
        />
      </Drawer>
    </>
  );
};

export default LabResultsRichTextEditor;
