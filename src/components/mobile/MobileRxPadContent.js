import React, { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Input, AutoComplete, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { searchInvestigation, getFrequentlySearchedInvestigation } from '../../redux/investigationSlice';
import { searchMedication, getFrequentlySearchedMedication } from '../../redux/medicationSlice';
import { removeBeforeWhiteSpace } from '../../utils/utils';
import { convertMedicalHistoryToContextFormat, convertContextToRxPadFormat } from '../../utils/medicalHistoryConverters';
import CashManagerContext from '../../context/CashManagerContext';
import { getGynecDetails } from '../../api/services/ApiGynec';
import ApiMedication from '../../api/services/ApiMedication';
import { useAccess } from '../../pages/vaccination/useAccess';
import { getDecodedToken } from '../../utils/localStorage';
import { PATIENT_DETAILS_SIDEBAR_KEYS } from '../../utils/constants';
import moment from 'moment';

// 

// Rich Text Editor Components
import VitalsRichTextEditorMobile from './VitalsRichTextEditorMobile';
import MedicalHistoryRichTextEditor from '../MedicalHistoryRichTextEditor';
import ExaminationRichTextEditor from '../ExaminationRichTextEditor';
import DiagnosisRichTextEditor from '../DiagnosisRichTextEditor';
import LabResultsRichTextEditor from '../LabResultsRichTextEditor';
import AdviceRichTextEditor from '../AdviceRichTextEditor';
import VaccinationsRichTextEditor from '../VaccinationsRichTextEditor';
import FollowUpRichTextEditor from '../FollowUpRichTextEditor';
import AdditionalNotesRichTextEditor from '../AdditionalNotesRichTextEditor';
import CustomModuleRichTextEditor from '../CustomModuleRichTextEditor';
import LabInvestigationEditSheet from './LabInvestigationEditSheet';
import MedicationEditSheet from './MedicationEditSheet';
import AddCustomMedicineSheet from './AddCustomMedicineSheet';
import SymptomsRichTextEditor from '../SymptomsRichTextEditor';
import { Drawer } from 'antd';
import MobileGynecHistoryEdit from './MobileGynecHistoryEdit';
import MobileObstetricHistoryEdit from './MobileObstetricHistoryEdit';
import { fetchObstetricDetails } from '../../pages/obstetric/service';
import './MobileRxPadContent.scss';
import { ASSETS } from "../../assets";
const {
  examination: examinationIcon,
  diagnosis: diagnosisIcon,
  vitals: vitalsIcon,
  medication: medicationIcon,
  lab: labIcon,
  medicalHistory: medicalHistoryIcon,
  advice: adviceIcon,
  followup: followUpIcon,
  obstetricDark: gynecHistoryIcon,
  obstetricDark: obstetricHistoryIcon,
  surgery: surgeryIcon,
  vaccination: vaccinationIcon,
} = ASSETS.images;
const editIcon = ASSETS.mobile.edit;
const deleteIcon = ASSETS.images.delete;
const {
  frame3: frameIcon,
  logout: logoutIcon,
} = ASSETS.mobile;

// Inline vitals enrichment (BMI, BMR, BSA) – matches ConsultationDrawer / VitalsBox
function enrichVitalsWithCalculations(vital, patientInfo = {}) {
  const out = { ...vital };
  const height = parseFloat(vital.height || vital.Height || '');
  const weight = parseFloat(vital.weight || vital.Weight || '');
  if (height > 0 && weight > 0) {
    const calBMI = (weight / height / height) * 10000;
    out.bmi = Number.isFinite(calBMI) ? String(calBMI.toFixed(2)) : (out.bmi || out.BMI || '');
    const age = patientInfo.age || 0;
    const isMale = patientInfo.gender === 'Male';
    if (age > 0) {
      const calBMR = isMale ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161;
      out.bmr = Number.isFinite(calBMR) ? String(calBMR.toFixed(2)) : (out.bmr || out.BMR || '');
    }
    const calBSA = Math.sqrt((height * weight) / 3600);
    out.bsa = Number.isFinite(calBSA) ? String(calBSA.toFixed(2)) : (out.bsa || out.BSA || '');
  }
  return out;
}

const MobileRxPadContent = ({ prescriptionData, onUpdate, onEditWithVoice, onEndVisit, isProcessing = false, endVisitLoading = false, isPrescriptionEmpty = false, patient_data, caseManagerData, isVoiceAmbientFlow = true, vitalsFlow = 'voice' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { setMedicalHistoryData, medicalHistoryData: contextMedicalHistoryData, setVitalsData } = useContext(CashManagerContext) || {};
  const { parentOptionsList = [] } = useSelector((state) => state.investigation);
  const { parentOptionsList: medicationParentList = [] } = useSelector((state) => state.medication);
  const { obstetricDetails: allObstetricDetails, isObstetricDetailsFetched } = useSelector((state) => state.obstetric);
  const { isGynaecHistoryAccessable } = useAccess();
  const decodedToken = getDecodedToken();
  const userId = decodedToken?.result?.user_id;
  const labSearchDebounceRef = useRef(null);
  const medicationSearchDebounceRef = useRef(null);

  const [expandedGroups, setExpandedGroups] = useState(new Set(['MEDICAL CONDITIONS', 'ALLERGY', 'FAMILY HISTORY', 'LIFESTYLE', 'ADDITIONAL NOTES']));
  const [medicationSearch, setMedicationSearch] = useState('');
  const [labInvestigationSearch, setLabInvestigationSearch] = useState('');
  const [labInvestigationEdit, setLabInvestigationEdit] = useState({ visible: false, index: -1 });
  const [medicationEdit, setMedicationEdit] = useState({ visible: false, index: -1, prefillName: null, prefillMetadata: null });
  const [addCustomMedicine, setAddCustomMedicine] = useState({ visible: false, initialName: '' });
  const [gynecHistoryDrawerVisible, setGynecHistoryDrawerVisible] = useState(false);
  const [obstetricHistoryDrawerVisible, setObstetricHistoryDrawerVisible] = useState(false);
  // Note: hasTodayVitals and hasTodayLabResults features disabled - dependent utility files not yet available
  // const [hasTodayVitals, setHasTodayVitals] = useState(false);
  // const [hasTodayLabResults, setHasTodayLabResults] = useState(false);

  // Web-like: empty -> FREQUENTLY USED; typing -> debounced searchInvestigation
  useEffect(() => {
    if (labSearchDebounceRef.current) clearTimeout(labSearchDebounceRef.current);
    const q = (labInvestigationSearch || '').trim();
    if (!q) {
      dispatch(getFrequentlySearchedInvestigation());
      return;
    }
    labSearchDebounceRef.current = setTimeout(() => {
      dispatch(searchInvestigation({ searchQuery: q, type: 'parent' }));
    }, 500);
    return () => { if (labSearchDebounceRef.current) clearTimeout(labSearchDebounceRef.current); };
  }, [labInvestigationSearch, dispatch]);

  // Medication: empty -> getFrequentlySearchedMedication; typing -> debounced searchMedication (same as web)
  useEffect(() => {
    if (medicationSearchDebounceRef.current) clearTimeout(medicationSearchDebounceRef.current);
    const q = (medicationSearch || '').trim();
    if (!q) {
      dispatch(getFrequentlySearchedMedication());
      return;
    }
    medicationSearchDebounceRef.current = setTimeout(() => {
      dispatch(searchMedication({ searchQuery: q, type: 'parent' }));
    }, 500);
    return () => { if (medicationSearchDebounceRef.current) clearTimeout(medicationSearchDebounceRef.current); };
  }, [medicationSearch, dispatch]);

  // Options: parentOptionsList + "FREQUENTLY USED" when empty + "Add as custom" when no match (match web)
  const labInvestigationOptions = useMemo(() => {
    const list = Array.isArray(parentOptionsList) ? parentOptionsList : [];
    const q = (labInvestigationSearch || '').trim();
    const opts = [];
    if (q.length === 0) {
      opts.push({ key: -1, value: '', label: 'FREQUENTLY USED', disabled: true });
    }
    list.filter((inv) => inv && inv.investigation_name).forEach((inv, idx) => {
      opts.push({ key: JSON.stringify({ ...inv, _i: idx }), value: inv.investigation_name, label: inv.investigation_name });
    });
    if (q.length > 0) {
      const exact = list.some((inv) => (inv.investigation_name || '').toLowerCase().trim() === q.toLowerCase());
      if (!exact) {
        opts.push({ key: JSON.stringify({ change: 1, investigation_name: q }), value: q, label: `Add "${q}" as custom` });
      }
    }
    return opts;
  }, [parentOptionsList, labInvestigationSearch]);

  const medicationOptions = useMemo(() => {
    const list = Array.isArray(medicationParentList) ? medicationParentList : [];
    const q = (medicationSearch || '').trim();
    const opts = [];
    if (q.length === 0) {
      opts.push({ key: -1, value: '', label: 'SUGGESTED', disabled: true });
    }
    list.filter((m) => m && (m.tmm_medicine_name || m.medicine_name)).forEach((m) => {
      const nm = m.tmm_medicine_name || m.medicine_name;
      opts.push({ key: JSON.stringify(m), value: nm, label: nm });
    });
    if (q.length > 0) {
      const exact = list.some(
        (m) => (m.tmm_medicine_name || m.medicine_name || '').toLowerCase().trim() === q.toLowerCase()
      );
      if (!exact) {
        opts.push({ key: JSON.stringify({ tmm_id: 0, tmm_medicine_name: q }), value: q, label: `Add "${q}" as custom` });
      }
    }
    return opts;
  }, [medicationParentList, medicationSearch]);

  // Note: Fetch today's vitals and lab results feature disabled - dependent utility files not yet available
  // TODO: Re-enable when getTodayVitals and getTodayLabResults utilities are available
  // useEffect(() => {
  //   if (!patient_data?.patient_unique_id) {
  //     setHasTodayVitals(false);
  //     setHasTodayLabResults(false);
  //     return;
  //   }
  //   const check = async () => {
  //     try {
  //       const [todayVitals, todayLabResults] = await Promise.all([
  //         getTodayVitals(patient_data),
  //         getTodayLabResults(patient_data),
  //       ]);
  //       setHasTodayVitals(!!todayVitals);
  //       setHasTodayLabResults(!!(Array.isArray(todayLabResults) && todayLabResults.length > 0));
  //     } catch (e) {
  //       console.error('Error fetching today vitals/lab results:', e);
  //       setHasTodayVitals(false);
  //       setHasTodayLabResults(false);
  //     }
  //   };
  //   check();
  // }, [patient_data?.patient_unique_id, patient_data?.pam_id, patient_data?.pm_pid, patient_data?.pm_id]);

  // Fetch gynec history when Rx Pad loads
  useEffect(() => {
    if (isGynaecHistoryAccessable && patient_data?.patient_unique_id && userId && !prescriptionData?.gynecHistory && !caseManagerData?.gynecHistoryData) {
      const fetchGynecHistory = async () => {
        try {
          const data = await getGynecDetails(patient_data.patient_unique_id, userId);
          if (data && Object.keys(data).length > 2) {
            const { createdAt, createdBy, ...filteredData } = data;
            onUpdate({ ...prescriptionData, gynecHistory: filteredData });
          }
        } catch (error) {
        }
      };
      fetchGynecHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGynaecHistoryAccessable, patient_data?.patient_unique_id, userId]);

  // Fetch obstetric history when Rx Pad loads
  useEffect(() => {
    if (isGynaecHistoryAccessable && patient_data?.patient_unique_id && userId) {
      // Check if data already exists in prescriptionData, caseManagerData, or Redux
      const hasObstetricData = 
        (prescriptionData?.obstetricHistory && Object.keys(prescriptionData.obstetricHistory).length > 0) ||
        (caseManagerData?.obstetricHistory && Object.keys(caseManagerData.obstetricHistory).length > 0) ||
        (allObstetricDetails && Object.keys(allObstetricDetails).length > 0);
      
      if (!hasObstetricData) {
        const fetchObstetricHistory = async () => {
          try {
            const data = await fetchObstetricDetails(patient_data.patient_unique_id, userId);
            // Check if data has meaningful content (not just empty object or only metadata)
            const hasData = data && (
              (data.currentPregnancy && Object.keys(data.currentPregnancy).length > 0) ||
              (data.lmp || data.gravidity !== undefined || data.parity !== undefined) ||
              (Object.keys(data).length > 0 && !data.currentPregnancy && (data.lmp || data.gravidity !== undefined))
            );
            if (hasData) {
              // Store in prescriptionData for mobile display
              onUpdate({ ...prescriptionData, obstetricHistory: data });
            }
          } catch (error) {
          }
        };
        fetchObstetricHistory();
      } else if (allObstetricDetails && Object.keys(allObstetricDetails).length > 0 && !prescriptionData?.obstetricHistory) {
        onUpdate({ ...prescriptionData, obstetricHistory: allObstetricDetails });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGynaecHistoryAccessable, patient_data?.patient_unique_id, userId, allObstetricDetails, isObstetricDetailsFetched]);

  // Sync medical history to CashManagerContext for Add/Edit History drawer
  // Priority 1: prescriptionData.medicalHistory (Rx pad format from AI/API)
  // Priority 2: caseManagerData.medical_history (context format from repeat/edit Rx)
  useEffect(() => {
    if (!setMedicalHistoryData) return;
    
    const arr = prescriptionData?.medicalHistory;
    if (arr && Array.isArray(arr) && arr.length > 0) {
      const existingData =
        contextMedicalHistoryData && contextMedicalHistoryData.length > 0
          ? contextMedicalHistoryData
          : caseManagerData?.medical_history && Array.isArray(caseManagerData.medical_history) && caseManagerData.medical_history.length > 0
            ? caseManagerData.medical_history
            : [];
      const converted = convertMedicalHistoryToContextFormat(arr, existingData);
      setMedicalHistoryData(converted);
      return;
    }
    
    // Priority 2: On repeat/edit Rx, if Rx pad is empty but caseManagerData has history, sync it
    // caseManagerData.medical_history is already in context format
    if (caseManagerData?.medical_history && Array.isArray(caseManagerData.medical_history) && caseManagerData.medical_history.length > 0) {
      // Only sync if context is currently empty to avoid overwriting TabPrescription's sync or user edits
      if (!contextMedicalHistoryData || contextMedicalHistoryData.length === 0) {
        setMedicalHistoryData(JSON.parse(JSON.stringify(caseManagerData.medical_history)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when Rx data or case manager data changes; contextMedicalHistoryData used for merge check only
  }, [prescriptionData?.medicalHistory, caseManagerData?.medical_history, setMedicalHistoryData]);

  // Toggle medical history group expansion
  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Handle delete for array items
  const handleDelete = (section, index) => {
    if (!onUpdate) return;
    const newData = { ...prescriptionData };
    if (Array.isArray(newData[section])) {
      newData[section] = newData[section].filter((_, i) => i !== index);
      onUpdate(newData);
    }
  };

  // Handle delete for custom module
  const handleDeleteCustomModule = (moduleName) => {
    if (!onUpdate) return;
    const newData = { ...prescriptionData };
    if (newData.dynamicFields) {
      const updatedDynamicFields = { ...newData.dynamicFields };
      delete updatedDynamicFields[moduleName];
      newData.dynamicFields = updatedDynamicFields;
      onUpdate(newData);
    }
  };

  // Handle delete for custom module item
  const handleDeleteCustomModuleItem = (moduleName, index) => {
    if (!onUpdate) return;
    const newData = { ...prescriptionData };
    if (newData.dynamicFields && Array.isArray(newData.dynamicFields[moduleName])) {
      newData.dynamicFields[moduleName] = newData.dynamicFields[moduleName].filter((_, i) => i !== index);
      onUpdate(newData);
    }
  };

  // Handle edit: opens section-specific edit sheet (labInvestigation, medications)
  const handleEdit = (section, index) => {
    if (section === 'labInvestigation') {
      setLabInvestigationEdit({ visible: true, index });
    }
    if (section === 'medications') {
      setMedicationEdit({ visible: true, index, prefillName: null, prefillMetadata: null });
    }
  };

  const handleLabInvestigationSave = (value) => {
    if (!onUpdate) return;
    const arr = [...(prescriptionData?.labInvestigation || [])];
    const i = labInvestigationEdit.index;
    if (i < 0 || i >= arr.length) return;
    const existing = arr[i] && typeof arr[i] === 'object' ? arr[i] : { name: arr[i], lineItem: arr[i] };
    const notesText = (value.notes || '').trim();
    const lineItemWithNotes = notesText ? `${value.name} (${notesText})` : value.name;
    arr[i] = {
      ...existing,
      name: value.name,
      lineItem: lineItemWithNotes,
      notes: notesText,
      instruction: notesText,
      ...(value.hm_type !== undefined && { hm_type: value.hm_type }),
      ...(value.um_id !== undefined && { um_id: value.um_id }),
    };
    onUpdate({ ...prescriptionData, labInvestigation: arr });
    setLabInvestigationEdit({ visible: false, index: -1 });
  };

  const handleMedicationSave = async (value) => {
    if (!onUpdate) return;
    const arr = [...(prescriptionData?.medications || [])];
    const i = medicationEdit.index;
    if (i >= 0 && i < arr.length) {
      arr[i] = { ...arr[i], ...value };
    } else {
      arr.push(value);
    }
    setMedicationEdit({ visible: false, index: -1, prefillName: null, prefillMetadata: null });
    setMedicationSearch('');

    // Calculate quantity via API (match web: getQuantity at save; mobile runs it after add/edit so quantity shows in Rx Pad)
    try {
      const sanitized = (arr || []).map((item) => {
        const quantityValue = item?.quantity;
        let quantity = 0;
        if (typeof quantityValue === 'number' && Number.isFinite(quantityValue)) quantity = quantityValue;
        else if (quantityValue != null) {
          const parsed = Number(quantityValue);
          quantity = Number.isFinite(parsed) ? parsed : 0;
        }
        return { ...item, quantity };
      });
      const res = await ApiMedication.getQuantity({ medicines: sanitized });
      const medicines = res?.medicines || res?.data?.medicines;
      const merged = sanitized.map((item, index) => {
        const quantityValue = medicines?.[index]?.quantity;
        let quantity = 0;
        if (typeof quantityValue === 'number' && Number.isFinite(quantityValue)) quantity = quantityValue;
        else if (quantityValue != null) {
          const parsed = Number(quantityValue);
          quantity = Number.isFinite(parsed) ? parsed : 0;
        }
        return { ...item, quantity };
      });
      onUpdate({ ...prescriptionData, medications: merged });
    } catch {
      onUpdate({ ...prescriptionData, medications: arr });
    }
  };

  const handleMedicationAddFromSearch = useCallback((value, option) => {
    if (!option?.key || option.key === -1 || option.key === '-1') return;
    try {
      const parsed = JSON.parse(option.key);
      const name = parsed?.tmm_medicine_name || parsed?.medicine_name || value;
      if (parsed?.tmm_id === 0) {
        setAddCustomMedicine({ visible: true, initialName: name });
        setMedicationSearch('');
        return;
      }
      setMedicationEdit({ visible: true, index: -1, prefillName: name, prefillMetadata: parsed });
      setMedicationSearch('');
    } catch {
      setMedicationEdit({ visible: true, index: -1, prefillName: value, prefillMetadata: null });
      setMedicationSearch('');
    }
  }, []);

  // Web-like: onSelect from search adds to list inline (no Add sheet)
  const handleLabInvestigationAddFromSearch = useCallback((value, option) => {
    if (!onUpdate || !option?.key || option.key === -1 || option.key === '-1' || option.key === '-2') return;
    try {
      const parsed = JSON.parse(option.key);
      const name = parsed?.change === 1 ? (parsed.investigation_name || value) : (parsed?.investigation_name || value);
      const newItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name,
        lineItem: name,
        notes: '',
        instruction: '',
        ...(parsed?.change !== 1 && parsed?.hm_type !== undefined && { hm_type: parsed.hm_type }),
        ...(parsed?.change !== 1 && parsed?.um_id !== undefined && { um_id: parsed.um_id }),
      };
      const arr = [...(prescriptionData?.labInvestigation || []), newItem];
      onUpdate({ ...prescriptionData, labInvestigation: arr });
      setLabInvestigationSearch('');
    } catch {
      const newItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: value,
        lineItem: value,
        notes: '',
        instruction: '',
      };
      const arr = [...(prescriptionData?.labInvestigation || []), newItem];
      onUpdate({ ...prescriptionData, labInvestigation: arr });
      setLabInvestigationSearch('');
    }
  }, [onUpdate, prescriptionData]);

  // Render Section Component. showWhenEmpty: when true, still render (e.g. Lab Investigation with Add)
  const renderSection = (title, icon, data, renderContent, headerActions = null, showWhenEmpty = false) => {
    const isEmpty = !data || (Array.isArray(data) && data.length === 0) ||
      (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) ||
      (typeof data === 'string' && !data.trim());
    if (isEmpty && !showWhenEmpty) return null;

    return (
      <div className="rx-section-card">
        <div className="section-header">
          <div className="header-left">
            <img src={icon} alt={title} className="section-icon" />
          <span className="section-title">{title}</span>
          </div>
          {headerActions && <div className="header-right">{headerActions}</div>}
        </div>
        <div className="section-content">
          {renderContent ? renderContent(data) : (
            <div className="section-text">
              {typeof data === 'string' ? data : JSON.stringify(data)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render List Items with Edit/Delete
  const renderListItemsWithActions = (items, sectionName) => {
    if (!Array.isArray(items) || items.length === 0) return null;
    
    return (
      <ul className="section-list">
        {items.map((item, index) => {
          const text = typeof item === 'string' ? item : item?.lineItem || item?.name || item?.notes || JSON.stringify(item);
          return (
            <li key={index} className="list-item-with-actions">
              <span className="item-text">{text}</span>
              <div className="item-actions">
                <button 
                  type="button"
                  className="action-btn edit-btn"
                  onClick={() => handleEdit(sectionName, index)}
                >
                  <img src={editIcon} alt="Edit" />
                </button>
                <button 
                  type="button"
                  className="action-btn delete-btn"
                  onClick={() => handleDelete(sectionName, index)}
                >
                  <img src={deleteIcon} alt="Delete" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  // Render Vitals - Single Line Format
  const renderVitals = (vitals) => {
    if (!vitals || typeof vitals !== 'object') return null;
    
    const vitalFields = [
      { key: 'pulse', label: 'Pulse', suffix: 'f' },
      { key: 'bp', label: 'BP', suffix: '' },
      { key: 'temperature', label: 'Temperature', suffix: 'F' },
      { key: 'spo2', label: 'SpO2', suffix: '%' },
      { key: 'rr', label: 'RR', suffix: '/Min' },
      { key: 'weight', label: 'Weight', suffix: 'Kg' },
      { key: 'height', label: 'Height', suffix: 'cms' },
      { key: 'generalRbs', label: 'General Pbs', suffix: 'mg/Dl' },
    ];

    const vitalParts = vitalFields
      .filter(field => vitals[field.key])
      .map(field => {
        const value = vitals[field.key];
        return `${field.label}: ${value}${field.suffix}`;
      });

    if (vitalParts.length === 0) return null;

    return (
      <div className="vitals-single-line">
        {vitalParts.join(' | ')}
      </div>
    );
  };

  // Render Medications: card list (Edit/Delete) + AutoComplete to add via bottom sheet. UX like Lab Investigation; functionality matches web.
  const renderMedications = (medications) => {
    const list = Array.isArray(medications) ? medications : [];
    return (
      <div className="medications-list">
        {list.map((med, index) => {
          const name = med?.name || med?.lineItem;
          const dosage = med?.dosage;
          const frequency = med?.frequency;
          const schedule = med?.schedule;
          const duration = med?.duration;
          const quantity = med?.quantity;
          const notes = med?.notes || med?.instructions;
          const details = [dosage, frequency, schedule, duration, quantity != null && quantity !== '' && Number(quantity) > 0 ? `Qty: ${quantity}` : null].filter(Boolean).join(' | ');
          return (
            <div key={med?.id || index} className="medication-card">
              <div className="med-content">
                <div className="med-name">{name}</div>
                {details && <div className="med-details">{details}</div>}
                {notes && <div className="med-instructions">{notes}</div>}
              </div>
              <div className="med-actions">
                <button
                  type="button"
                  className="action-btn edit-btn"
                  onClick={() => handleEdit('medications', index)}
                >
                  <img src={editIcon} alt="Edit" />
                </button>
                <button
                  type="button"
                  className="action-btn delete-btn"
                  onClick={() => handleDelete('medications', index)}
                >
                  <img src={deleteIcon} alt="Delete" />
                </button>
              </div>
            </div>
          );
        })}
        <AutoComplete
          value={medicationSearch}
          onSearch={(v) => setMedicationSearch(removeBeforeWhiteSpace(v))}
          onSelect={handleMedicationAddFromSearch}
          options={medicationOptions}
          defaultActiveFirstOption
          getPopupContainer={() => document.body}
          className="search-input medication-autocomplete"
        >
          <Input
            placeholder="Search by Medication Name"
            prefix={<SearchOutlined className="lab-search-icon" />}
            allowClear
          />
        </AutoComplete>
      </div>
    );
  };

  // Render Lab Investigation: list (Edit/Delete) + search. Web-like: type → FREQUENTLY USED / results → onSelect adds inline.
  const renderLabInvestigation = (labInvestigation) => {
    const list = Array.isArray(labInvestigation) ? labInvestigation : [];

    return (
      <div className="lab-investigation-list">
        {list.map((item, index) => {
          const name = typeof item === 'string' ? item : item?.name || item?.lineItem;
          const notes = (typeof item === 'object' && item !== null) ? (item.notes ?? item.instruction ?? '') : '';

          return (
            <div key={item?.id || index} className="lab-investigation-card">
              <div className="lab-content">
                <div className="lab-name">{name}</div>
                {notes ? <div className="lab-notes">Note: {notes}</div> : null}
              </div>
              <span className="lab-actions-divider" aria-hidden />
              <div className="lab-actions">
                <button
                  type="button"
                  className="action-btn edit-btn"
                  onClick={() => handleEdit('labInvestigation', index)}
                >
                  <img src={editIcon} alt="Edit" />
                </button>
                <button
                  type="button"
                  className="action-btn delete-btn"
                  onClick={() => handleDelete('labInvestigation', index)}
                >
                  <img src={deleteIcon} alt="Delete" />
                </button>
              </div>
            </div>
          );
        })}
        <AutoComplete
          value={labInvestigationSearch}
          onSearch={(v) => setLabInvestigationSearch(removeBeforeWhiteSpace(v))}
          onSelect={handleLabInvestigationAddFromSearch}
          options={labInvestigationOptions}
          defaultActiveFirstOption
          getPopupContainer={() => document.body}
          className="search-input lab-investigation-autocomplete"
        >
          <Input
            placeholder="Search by Investigation Name"
            prefix={<SearchOutlined className="lab-search-icon" />}
            allowClear
          />
        </AutoComplete>
      </div>
    );
  };

  // Render Medical History (Grouped & Collapsible)
  const renderMedicalHistory = (medicalHistory) => {
    if (!Array.isArray(medicalHistory) || medicalHistory.length === 0) return null;
    
    const grouped = {
      'MEDICAL CONDITIONS': [],
      'ALLERGY': [],
      'FAMILY HISTORY': [],
      'LIFESTYLE': [],
      'ADDITIONAL NOTES': []
    };

    medicalHistory.forEach(item => {
      const type = item?.type?.toUpperCase() || 'ADDITIONAL NOTES';
      const key = Object.keys(grouped).find(k => type.includes(k)) || 'ADDITIONAL NOTES';
      grouped[key].push(item);
    });

    return (
      <div className="medical-history-groups">
        {Object.entries(grouped).map(([type, items]) => {
          if (items.length === 0) return null;
          const isExpanded = expandedGroups.has(type);
          
          return (
            <div key={type} className="history-group">
              <div className="group-header" onClick={() => toggleGroup(type)}>
                <span className="group-title">{type}</span>
                <i className={`icon-arrow-${isExpanded ? 'up' : 'down'}`} />
              </div>
              {isExpanded && (
                <div className="group-items">
                  {items.map((item, index) => {
                    const originalIndex = medicalHistory.indexOf(item);
                    const text = item?.lineItem || item?.name || item;
                    const since = item?.since ?? item?.duration;
                    const status = item?.status;
                    const medication = item?.medication;
                    const notes = item?.notes;
                    const relation = item?.relation;
                    
                    const metaParts = [];
                    if (since) metaParts.push(`Since: ${since}`);
                    if (status) metaParts.push(`Status: ${status}`);
                    if (medication != null && String(medication).trim() !== '') metaParts.push(`Medication: ${medication}`);
                    if (relation) metaParts.push(`Relation: ${relation}`);
                    if (notes) metaParts.push(`Notes: ${notes}`);
                    
                    return (
                      <div key={index} className="history-item">
                        <div className="history-content">
                          <span className="history-text">{text}</span>
                          {metaParts.length > 0 && (
                            <span className="history-meta">
                              {metaParts.join(' | ')}
                            </span>
                          )}
                        </div>
                        <div className="item-actions">
                          <button 
                            type="button"
                            className="action-btn edit-btn"
                            onClick={() => handleEdit('medicalHistory', originalIndex)}
                          >
                            <img src={editIcon} alt="Edit" />
                          </button>
                          <button 
                            type="button"
                            className="action-btn delete-btn"
                            onClick={() => handleDelete('medicalHistory', originalIndex)}
                          >
                            <img src={deleteIcon} alt="Delete" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <button 
          type="button"
          className="add-edit-button"
          onClick={() => {
            // TODO: Open medical history add/edit modal
          }}
        >
          Add/Edit
        </button>
      </div>
    );
  };

  // Format gynec history for display (matches Figma pattern)
  const formatGynecHistoryForDisplay = (gynecHistory) => {
    if (!gynecHistory || typeof gynecHistory !== 'object' || Array.isArray(gynecHistory)) return [];
    
    const items = [];
    const { createdAt, createdBy, reproductiveLifeStages, ...data } = gynecHistory;
    
    // Menarche
    if (data.ageAtMenarche) {
      items.push(`Menarche (Age at: ${data.ageAtMenarche} years${data.menarcheNotes ? ` | Menarche Note: ${data.menarcheNotes}` : ''})`);
    }
    
    // Cycle
    if (data.cycle || data.intervalOfCycle || data.cycleNotes) {
      const cycleParts = [];
      if (data.cycle) cycleParts.push(`Type: ${data.cycle}`);
      if (data.intervalOfCycle) cycleParts.push(`Cycle Interval: ${data.intervalOfCycle} days`);
      if (data.cycleNotes) cycleParts.push(`Cycle Note: ${data.cycleNotes}`);
      items.push(`Cycle (${cycleParts.join(' | ')})`);
    }
    
    // Flow
    if (data.flow || data.durationOfMenstrualFlow || data.numberOfPadsPerDay || data.clots || data.flowNotes) {
      const flowParts = [];
      if (data.flow) flowParts.push(`Volume: ${data.flow}`);
      if (data.durationOfMenstrualFlow) flowParts.push(`Duration: ${data.durationOfMenstrualFlow} days`);
      if (data.clots !== undefined && data.clots !== null && data.clots !== '') {
        flowParts.push(`Clots: ${data.clots === true || data.clots === 'true' || data.clots === 'Yes' ? 'Yes' : 'No'}`);
      }
      if (data.numberOfPadsPerDay) flowParts.push(`Number of pads per day: ${data.numberOfPadsPerDay}`);
      if (data.flowNotes) flowParts.push(`Flow Note: ${data.flowNotes}`);
      items.push(`Flow (${flowParts.join(' | ')})`);
    }
    
    // Pain
    if (data.pain || data.occurrenceOfPain || data.painNotes) {
      const painParts = [];
      if (data.pain) painParts.push(`Level: ${data.pain}`);
      if (data.occurrenceOfPain) painParts.push(`Occurrence of pain: ${data.occurrenceOfPain}`);
      if (data.painNotes) painParts.push(`Pain Note: ${data.painNotes}`);
      items.push(`Pain (${painParts.join(' | ')})`);
    }
    
    // Lifecycle Hormonal Changes
    if (data.reproductiveLifeStages || data.ageAtMenopause || data.typeOfMenopause || data.reproductiveNotes) {
      const lifecycleParts = [];
      const stageName = data.reproductiveLifeStages || 'Menopause';
      if (data.ageAtMenopause) {
        lifecycleParts.push(`${stageName} at: ${data.ageAtMenopause} years`);
      }
      if (data.typeOfMenopause) {
        lifecycleParts.push(`${stageName} type: ${data.typeOfMenopause}`);
      }
      if (data.reproductiveNotes) {
        lifecycleParts.push(`${stageName} note: ${data.reproductiveNotes}`);
      }
      items.push(`Lifecycle Hormonal Changes (${lifecycleParts.join(' | ')})`);
    }
    
    // LMP
    if (data.lmp) {
      try {
        const lmpDate = new Date(data.lmp).toISOString().split('T')[0];
        items.push(`LMP: ${lmpDate}`);
      } catch (e) {
        items.push(`LMP: ${data.lmp}`);
      }
    }
    
    // Menstruation notes
    if (data.notes) {
      items.push(`Menstruation notes (${data.notes})`);
    }
    
    return items;
  };

  // Render Gynae History with Edit/Delete
  const renderGynaeHistory = (gynecHistory) => {
    if (!gynecHistory || (Array.isArray(gynecHistory) && gynecHistory.length === 0)) return null;
    
    const formattedItems = formatGynecHistoryForDisplay(gynecHistory);
    if (formattedItems.length === 0) return null;
    
    return (
      <div className="gynae-history-list">
        <ul className="section-list">
          {formattedItems.map((item, index) => (
            <li key={index} className="list-item">
              <span className="item-text">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Format obstetric history for display (matches web version pattern)
  const formatObstetricHistoryForDisplay = (obstetricHistory) => {
    if (!obstetricHistory || typeof obstetricHistory !== 'object') return { items: [], structured: null };
    
    const items = [];
    // Handle both full structure { currentPregnancy: {...}, pregnancyHistory: [...] } and direct currentPregnancy object
    const currentPregnancy = obstetricHistory?.currentPregnancy || (obstetricHistory?.lmp !== undefined || obstetricHistory?.gravidity !== undefined ? obstetricHistory : {});
    
    // Calculate gestation
    const today = moment();
    let gestationWeeks = null;
    let gestationDays = null;
    
    if (currentPregnancy.ceed) {
      const gestationAge = 40 * 7 - Math.ceil(Math.abs(moment(currentPregnancy.ceed).startOf('day').diff(today.startOf('day'), 'days')));
      gestationWeeks = Math.floor(gestationAge / 7);
      gestationDays = gestationAge % 7;
    } else if (currentPregnancy.lmp) {
      const lmpDate = moment(currentPregnancy.lmp);
      gestationWeeks = today.diff(lmpDate, 'weeks');
      const adjustedLmpDate = lmpDate.clone().add(gestationWeeks, 'weeks');
      gestationDays = today.diff(adjustedLmpDate, 'days');
    }
    
    // Build structured data for display
    const structured = {
      // Row 1: LMP, EDD, CEDD, Gestation
      lmp: currentPregnancy.lmp ? moment(currentPregnancy.lmp).format('DD-MM-YYYY') : null,
      edd: currentPregnancy.edd ? moment(currentPregnancy.edd).format('DD-MM-YYYY') : null,
      ceed: currentPregnancy.ceed ? moment(currentPregnancy.ceed).format('DD-MM-YYYY') : null,
      gestationWeeks: gestationWeeks,
      gestationDays: gestationDays,
      // Row 2: Blood Groups, Marital Status, Marriage Duration, Consanguinity
      patientBlood: currentPregnancy.blood || currentPregnancy.patientBloodGroup || null,
      husbandBlood: currentPregnancy.husbandsBlood || currentPregnancy.husbandBloodGroup || null,
      maritalStatus: currentPregnancy.maritialStatus || currentPregnancy.maritalStatus || null,
      marriageYears: currentPregnancy.marriageDurationYears || currentPregnancy.marriageDuration?.years || null,
      marriageMonths: currentPregnancy.marriageDurationMonths || currentPregnancy.marriageDuration?.months || null,
      consanguinity: currentPregnancy.consang != null ? (currentPregnancy.consang ? 'Yes' : 'No') : null,
      // GPLAE
      gravidity: currentPregnancy.gravidity,
      parity: currentPregnancy.parity,
      livingChildren: currentPregnancy.livingChildren,
      abortion: currentPregnancy.abortion,
      ectopicPregnancies: currentPregnancy.ectopicPregnancies,
      // Notes
      diagnosisNotes: currentPregnancy.diagnosisNotes || null,
      // Examination count
      examinationCount: currentPregnancy.examinationHistory?.length || 0,
      // Pregnancy History
      pregnancyHistoryCount: obstetricHistory?.pregnancyHistory?.length || 0,
      // ANC Scheduler
      ancHistoryCount: currentPregnancy.ancHistory?.length || 0,
      ancCompletedCount: currentPregnancy.ancHistory?.filter(t => t.status === 'Completed')?.length || 0,
      // Immunisation History
      immunisationCount: currentPregnancy.immunisationHistory?.length || 0,
      immunisationGivenCount: currentPregnancy.immunisationHistory?.filter(v => v.status === 'Given')?.length || 0
    };

    // For backward compatibility - still build items array
    // Patient Info: LMP, EDD/CEDD, Gestation
    const patientInfoParts = [];
    if (currentPregnancy.lmp) {
      try {
        const lmpDate = moment(currentPregnancy.lmp).format('DD MMM YYYY');
        patientInfoParts.push(`LMP: ${lmpDate}`);
      } catch (e) {
        patientInfoParts.push(`LMP: ${currentPregnancy.lmp}`);
      }
    }
    
    if (currentPregnancy.edd || currentPregnancy.ceed) {
      try {
        const eddDate = moment(currentPregnancy.ceed || currentPregnancy.edd).format('DD MMM YYYY');
        const label = currentPregnancy.ceed ? 'CEDD' : 'EDD';
        patientInfoParts.push(`${label}: ${eddDate}`);
      } catch (e) {
        patientInfoParts.push(`${currentPregnancy.ceed ? 'CEDD' : 'EDD'}: ${currentPregnancy.ceed || currentPregnancy.edd}`);
      }
    }
    
    if (gestationWeeks > 0 || gestationDays > 0) {
      const gestationParts = [];
      if (gestationWeeks > 0) {
        gestationParts.push(`${gestationWeeks} ${gestationWeeks > 1 ? 'Weeks' : 'Week'}`);
      }
      if (gestationDays > 0) {
        gestationParts.push(`${gestationDays} ${gestationDays > 1 ? 'Days' : 'Day'}`);
      }
      if (gestationParts.length > 0) {
        patientInfoParts.push(`Gestation: ${gestationParts.join(' & ')}`);
      }
    }
    
    if (patientInfoParts.length > 0) {
      items.push(`Patient Info (${patientInfoParts.join(' | ')})`);
    }
    
    // GPLAE
    const gplaeParts = [];
    const hasGravidity = currentPregnancy.gravidity != null && currentPregnancy.gravidity >= 0;
    const hasParity = currentPregnancy.parity != null && currentPregnancy.parity >= 0;
    const hasLivingChildren = currentPregnancy.livingChildren != null && currentPregnancy.livingChildren >= 0;
    const hasAbortion = currentPregnancy.abortion != null && currentPregnancy.abortion >= 0;
    const hasEctopic = currentPregnancy.ectopicPregnancies != null && currentPregnancy.ectopicPregnancies >= 0;
    
    if (hasGravidity || hasParity || hasLivingChildren || hasAbortion || hasEctopic) {
      if (hasGravidity && currentPregnancy.gravidity === 1) {
        gplaeParts.push('Primigravida');
      } else {
        if (hasGravidity) gplaeParts.push(`G: ${currentPregnancy.gravidity}`);
        if (hasParity) gplaeParts.push(`P: ${currentPregnancy.parity}`);
        if (hasLivingChildren) gplaeParts.push(`L: ${currentPregnancy.livingChildren}`);
        if (hasAbortion) gplaeParts.push(`A: ${currentPregnancy.abortion}`);
        if (hasEctopic) gplaeParts.push(`E: ${currentPregnancy.ectopicPregnancies}`);
      }
      
      if (gplaeParts.length > 0) {
        items.push(`GPLAE (${gplaeParts.join(' | ')})`);
      }
    }
    
    // Diagnosis Notes
    if (currentPregnancy.diagnosisNotes) {
      items.push(`Notes (${currentPregnancy.diagnosisNotes})`);
    }
    
    return { items, structured };
  };

  // Render Obstetric History with Edit/Delete
  const renderObstetricHistory = (obstetricHistory) => {
    if (!obstetricHistory || (Array.isArray(obstetricHistory) && obstetricHistory.length === 0)) {
      return null;
    }
    const { items, structured } = formatObstetricHistoryForDisplay(obstetricHistory);
    const displayItems = [];
    
    // Row 1: LMP, EDD, CEDD, Gestation
    if (structured?.lmp) displayItems.push(`LMP: ${structured.lmp}`);
    if (structured?.edd) displayItems.push(`EDD: ${structured.edd}`);
    if (structured?.ceed) displayItems.push(`CEDD: ${structured.ceed}`);
    if (structured?.gestationWeeks > 0 || structured?.gestationDays > 0) {
      const parts = [];
      if (structured.gestationWeeks > 0) parts.push(`${structured.gestationWeeks} Weeks`);
      if (structured.gestationDays > 0) parts.push(`${structured.gestationDays} Days`);
      displayItems.push(`Gestation: ${parts.join(' ')}`);
    }
    
    // Row 2: Blood Groups
    if (structured?.patientBlood) displayItems.push(`Patient Blood Group: ${structured.patientBlood}`);
    if (structured?.husbandBlood) displayItems.push(`Husband's Blood Group: ${structured.husbandBlood}`);
    
    // Row 3: Marital Info
    if (structured?.maritalStatus) displayItems.push(`Marital Status: ${structured.maritalStatus}`);
    if (structured?.marriageYears || structured?.marriageMonths) {
      const parts = [];
      if (structured.marriageYears) parts.push(`${structured.marriageYears} Years`);
      if (structured.marriageMonths) parts.push(`${structured.marriageMonths} Months`);
      displayItems.push(`Marriage Duration: ${parts.join(' ')}`);
    }
    if (structured?.consanguinity) displayItems.push(`Consanguineous: ${structured.consanguinity}`);
    
    // Row 4: GPLAE
    const hasGPLAE = structured?.gravidity != null || structured?.parity != null || 
                     structured?.livingChildren != null || structured?.abortion != null || 
                     structured?.ectopicPregnancies != null;
    if (hasGPLAE) {
      if (structured.gravidity === 1) {
        displayItems.push('Primigravida');
      } else {
        const gplaeParts = [];
        if (structured.gravidity != null) gplaeParts.push(`G: ${structured.gravidity}`);
        if (structured.parity != null) gplaeParts.push(`P: ${structured.parity}`);
        if (structured.livingChildren != null) gplaeParts.push(`L: ${structured.livingChildren}`);
        if (structured.abortion != null) gplaeParts.push(`A: ${structured.abortion}`);
        if (structured.ectopicPregnancies != null) gplaeParts.push(`E: ${structured.ectopicPregnancies}`);
        if (gplaeParts.length > 0) displayItems.push(`GPLAE: ${gplaeParts.join(', ')}`);
      }
    }
    
    // Row 5: Diagnosis Notes
    if (structured?.diagnosisNotes) displayItems.push(`Notes: ${structured.diagnosisNotes}`);
    
    // Row 6: Examination Count
    if (structured?.examinationCount > 0) {
      displayItems.push(`${structured.examinationCount} Examination${structured.examinationCount > 1 ? 's' : ''} recorded`);
    }
    
    // Row 7: Pregnancy History
    if (structured?.pregnancyHistoryCount > 0) {
      displayItems.push(`${structured.pregnancyHistoryCount} Past Pregnanc${structured.pregnancyHistoryCount > 1 ? 'ies' : 'y'} recorded`);
    }
    
    // Row 8: ANC Scheduler
    if (structured?.ancHistoryCount > 0) {
      const ancText = `ANC: ${structured.ancHistoryCount} test${structured.ancHistoryCount > 1 ? 's' : ''} scheduled`;
      if (structured.ancCompletedCount > 0) {
        displayItems.push(`${ancText} (${structured.ancCompletedCount} completed)`);
      } else {
        displayItems.push(ancText);
      }
    }
    
    // Row 9: Immunisation History
    if (structured?.immunisationCount > 0) {
      const immunText = `Immunisation: ${structured.immunisationCount} vaccine${structured.immunisationCount > 1 ? 's' : ''}`;
      if (structured.immunisationGivenCount > 0) {
        displayItems.push(`${immunText} (${structured.immunisationGivenCount} given)`);
      } else {
        displayItems.push(immunText);
      }
    }
    
    if (displayItems.length === 0) {
      return null;
    }
    
    return (
      <div className="obstetric-history-list">
        <ul className="section-list">
          {displayItems.map((item, index) => (
            <li key={index} className="list-item">
              <span className="item-text">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Render Surgeries & Procedures with Edit/Delete
  const renderSurgeries = (surgeries) => {
    if (!Array.isArray(surgeries) || surgeries.length === 0) return null;
    
    return renderListItemsWithActions(surgeries, 'surgeriesAndProcedures');
  };

  // Render Lab Results with Edit/Delete
  const renderLabResults = (labResults) => {
    if (!Array.isArray(labResults) || labResults.length === 0) return null;
    
    return renderListItemsWithActions(labResults, 'labResults');
  };

  // Render List Items (simple)
  const renderListItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) return null;
    
    return (
      <ul className="section-list">
        {items.map((item, index) => {
          const text = typeof item === 'string' ? item : item?.lineItem || item?.name || item?.notes || JSON.stringify(item);
          return (
            <li key={index} className="list-item">
              <span className="item-text">{text}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  // Render Custom Modules with Edit/Delete
  const renderCustomModules = (dynamicFields) => {
    if (!dynamicFields || typeof dynamicFields !== 'object') return null;
    
    const modules = Object.entries(dynamicFields).filter(([key, value]) => 
      Array.isArray(value) && value.length > 0
    );

    if (modules.length === 0) return null;

    return modules.map(([moduleName, moduleData]) => (
      <div key={moduleName} className="rx-section-card custom-module-card">
        <div className="section-header">
          <div className="header-left">
            <span className="section-title">{moduleName}</span>
          </div>
          <div className="header-right">
            <button 
              type="button"
              className="action-btn delete-btn"
              onClick={() => handleDeleteCustomModule(moduleName)}
              title="Delete Module"
            >
              <img src={deleteIcon} alt="Delete Module" />
            </button>
          </div>
        </div>
        <div className="section-content">
          <ul className="section-list">
            {moduleData.map((item, index) => {
              const text = typeof item === 'string' ? item : item?.lineItem || item?.name || JSON.stringify(item);
              return (
                <li key={index} className="list-item-with-actions">
                  <span className="item-text">{text}</span>
                  <div className="item-actions">
                    <button 
                      type="button"
                      className="action-btn edit-btn"
                      onClick={() => handleEdit(`dynamicFields.${moduleName}`, index)}
                    >
                      <img src={editIcon} alt="Edit" />
                    </button>
                    <button 
                      type="button"
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteCustomModuleItem(moduleName, index)}
                    >
                      <img src={deleteIcon} alt="Delete" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    ));
  };

  // Sync vitals to context (match web version behavior)
  const syncVitalsToContext = useCallback((vitalsObject) => {
    if (vitalsObject && typeof vitalsObject === 'object' && Object.keys(vitalsObject).length > 0 && setVitalsData) {
      const vitalsData = vitalsObject;
      let systolic = vitalsData.Systolic || '';
      let diastolic = vitalsData.Diastolic || '';
      let blood_press = vitalsData.bloodPressure || '';
      
      if (blood_press && !systolic && !diastolic) {
        const bpParts = String(blood_press).split('/');
        if (bpParts.length === 2) {
          systolic = bpParts[0].trim();
          diastolic = bpParts[1].trim();
        }
      } else if (!blood_press && systolic && diastolic) {
        blood_press = `${systolic}/${diastolic}`;
      }
      if (!systolic || !diastolic) {
        blood_press = '';
      }
      
      const vitalsArray = [{
        date: vitalsData.date || moment().format('YYYY-MM-DD'),
        temp: String(vitalsData.temperature || '').trim(),
        pres: String(vitalsData.pulse || '').trim(),
        resp_rate: String(vitalsData.respRate || '').trim(),
        systolic: String(systolic).trim(),
        diastolic: String(diastolic).trim(),
        blood_press: String(blood_press).trim(),
        spo2: String(vitalsData.spo2 || '').trim(),
        height: String(vitalsData.height || '').trim(),
        weight: String(vitalsData.weight || '').trim(),
        ofc: String(vitalsData.ofc || vitalsData.OFC || '').trim(),
        sugar: String(vitalsData.sugar || '').trim(),
        general_rbs: String(vitalsData['General RBS'] || vitalsData.general_rbs || vitalsData.generalRBS || vitalsData.genralRBS || '').trim(),
        fib4: String(vitalsData.FIB4 || vitalsData.fib4 || '').trim(),
        waist_circumference: String(vitalsData['Waist Circumference'] || vitalsData.waist_circumference || '').trim(),
        bmi: String(vitalsData.BMI || vitalsData.bmi || '').trim(),
        bmr: String(vitalsData.BMR || vitalsData.bmr || '').trim(),
        bsa: String(vitalsData.BSA || vitalsData.bsa || '').trim()
      }];
      setVitalsData(vitalsArray);
    }
  }, [setVitalsData]);

  // Update handlers for Rich Text Editor sections
  const handleVitalsUpdate = useCallback((vitals) => {
    // Enrich vitals with BMI, BMR, BSA calculations (match web version)
    const patientInfo = patient_data ? {
      age: patient_data.ageYears || patient_data.age || patient_data.pm_age,
      gender: patient_data.pm_gender || patient_data.gender
    } : {};
    const enrichedVitals = enrichVitalsWithCalculations(vitals, patientInfo);
    
    const updatedData = { ...prescriptionData, vitalsAndBodyComposition: enrichedVitals };
    onUpdate(updatedData);
    // Sync to context (match web version)
    syncVitalsToContext(enrichedVitals);
  }, [prescriptionData, onUpdate, syncVitalsToContext, patient_data]);

  const handleMedicalHistoryUpdate = (medicalHistory) => {
    const updatedData = { ...prescriptionData, medicalHistory };
    onUpdate(updatedData);
  };

  const handleSymptomsUpdate = (symptoms) => {
    const updatedData = { ...prescriptionData, symptoms };
    onUpdate(updatedData);
  };

  const handleExaminationsUpdate = (examinations) => {
    const updatedData = { ...prescriptionData, examinations };
    onUpdate(updatedData);
  };

  const handleDiagnosisUpdate = (diagnosis) => {
    const updatedData = { ...prescriptionData, diagnosis };
    onUpdate(updatedData);
  };

  const handleLabResultsUpdate = (labResults) => {
    const updatedData = { ...prescriptionData, labResults };
    onUpdate(updatedData);
  };

  const handleAdviceUpdate = (advice) => {
    const updatedData = { ...prescriptionData, advice };
    onUpdate(updatedData);
  };

  const handleVaccinationsUpdate = (vaccinations) => {
    const updatedData = { ...prescriptionData, vaccinations };
    onUpdate(updatedData);
  };

  const handleFollowUpUpdate = (followUp) => {
    const updatedData = { ...prescriptionData, followUp };
    onUpdate(updatedData);
  };

  const handleAdditionalNotesUpdate = (others) => {
    const updatedData = { ...prescriptionData, others };
    onUpdate(updatedData);
  };

  const handleCustomModuleUpdate = (moduleName, moduleArray) => {
    const updatedData = {
      ...prescriptionData,
      dynamicFields: {
        ...prescriptionData.dynamicFields,
        [moduleName]: moduleArray
      }
    };
    onUpdate(updatedData);
  };

  // Enrich vitals with BMI, BMR, BSA calculations (match web version)
  const enrichedVitals = useMemo(() => {
    const vitals = prescriptionData?.vitalsAndBodyComposition || {};
    if (!vitals || Object.keys(vitals).length === 0) return {};
    
    const patientInfo = patient_data ? {
      age: patient_data.ageYears || patient_data.age || patient_data.pm_age,
      gender: patient_data.pm_gender || patient_data.gender
    } : {};
    
    return enrichVitalsWithCalculations(vitals, patientInfo);
  }, [prescriptionData?.vitalsAndBodyComposition, patient_data]);

  // Sync vitals from Rx pad to context when data changes (match web version)
  useEffect(() => {
    if (prescriptionData?.vitalsAndBodyComposition && Object.keys(prescriptionData.vitalsAndBodyComposition).length > 0 && setVitalsData) {
      syncVitalsToContext(prescriptionData.vitalsAndBodyComposition);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescriptionData?.vitalsAndBodyComposition]);

  // Match desktop: show Vitals module only when there is valid vitals content
  const hasValidVitals =
    prescriptionData?.vitalsAndBodyComposition &&
    typeof prescriptionData.vitalsAndBodyComposition === "object" &&
    Object.values(prescriptionData.vitalsAndBodyComposition || {}).some(
      (v) => v != null && String(v).trim?.()?.length > 0
    );

  return (
    <div className="mobile-rx-pad-content-wrapper">
      {/* Rich Text Editor Sections - Vitals only when has content (match desktop) */}
      {hasValidVitals && (
        <VitalsRichTextEditorMobile
          vitalsAndBodyComposition={enrichedVitals}
          onUpdate={handleVitalsUpdate}
          isProcessing={isProcessing}
          patient_data={patient_data}
          isVoiceAmbientFlow={isVoiceAmbientFlow}
          vitalsFlow={vitalsFlow}
          showWhenEmpty={false}
        />
      )}

      {(() => {
        // Show medical history if either Rx pad has it OR context has it (for repeat/edit Rx)
        const hasRxPadHistory = prescriptionData?.medicalHistory && 
          Array.isArray(prescriptionData.medicalHistory) && 
          prescriptionData.medicalHistory.length > 0;
        
        const hasContextHistory = contextMedicalHistoryData && 
          Array.isArray(contextMedicalHistoryData) && 
          contextMedicalHistoryData.length > 0;
        
        if (!hasRxPadHistory && !hasContextHistory) return null;
        
        // Use Rx pad data if available, otherwise convert context to Rx format for display
        let displayHistory = prescriptionData?.medicalHistory || [];
        if (displayHistory.length === 0 && hasContextHistory) {
          displayHistory = convertContextToRxPadFormat(contextMedicalHistoryData);
        }
        
        return (
          <MedicalHistoryRichTextEditor
            medicalHistory={displayHistory}
            onUpdate={handleMedicalHistoryUpdate}
            isProcessing={isProcessing}
            patient_data={patient_data}
            caseManagerData={caseManagerData}
          />
        );
      })()}

      {/* Symptoms - inline rich text editor (same as web, no bottom sheet). Visibility matches DigitisedPrescription: only when has content. */}
      {(prescriptionData?.symptoms &&
        Array.isArray(prescriptionData.symptoms) &&
        prescriptionData.symptoms.length > 0) && (
        <SymptomsRichTextEditor
          symptoms={prescriptionData.symptoms}
          onUpdate={handleSymptomsUpdate}
          isProcessing={isProcessing}
        />
      )}

      {(prescriptionData?.examinations && 
        Array.isArray(prescriptionData.examinations) && 
        prescriptionData.examinations.length > 0) && (
        <ExaminationRichTextEditor
          examinations={prescriptionData?.examinations || []}
          onUpdate={handleExaminationsUpdate}
          isProcessing={isProcessing}
        />
      )}

      {(prescriptionData?.diagnosis && 
        Array.isArray(prescriptionData.diagnosis) && 
        prescriptionData.diagnosis.length > 0) && (
        <DiagnosisRichTextEditor
          diagnosis={prescriptionData?.diagnosis || []}
          onUpdate={handleDiagnosisUpdate}
          isProcessing={isProcessing}
        />
      )}

      {/* Table Sections - Keep Current Implementation */}
      {renderSection('Medication [Rx]', medicationIcon, prescriptionData?.medications, renderMedications, null, true)}
      {renderSection('Lab Investigation', labIcon, prescriptionData?.labInvestigation, renderLabInvestigation, null, true)}

      {/* Rich Text Editor Sections - Continued */}
      {/* Show LabResultsRichTextEditor if has lab results content */}
      {(prescriptionData?.labResults && 
        Array.isArray(prescriptionData.labResults) && 
        prescriptionData.labResults.length > 0) && (
        <LabResultsRichTextEditor
          labResults={prescriptionData?.labResults || []}
          onUpdate={handleLabResultsUpdate}
          isProcessing={isProcessing}
          hideAddEditButton
        />
      )}

      {(prescriptionData?.advice && 
        ((typeof prescriptionData.advice === 'string' && prescriptionData.advice.trim()) ||
          (Array.isArray(prescriptionData.advice) && prescriptionData.advice.length > 0))) && (
        <AdviceRichTextEditor
          advice={prescriptionData?.advice 
            ? (typeof prescriptionData.advice === 'string' 
                ? [{ lineItem: prescriptionData.advice }]
                : prescriptionData.advice.map(adv => 
                    typeof adv === 'string' 
                      ? { lineItem: adv }
                      : adv
                  ))
            : []}
          onUpdate={handleAdviceUpdate}
          isProcessing={isProcessing}
        />
      )}

      {(prescriptionData?.vaccinations && 
        Array.isArray(prescriptionData.vaccinations) && 
        prescriptionData.vaccinations.length > 0) && (
        <VaccinationsRichTextEditor
          vaccinations={prescriptionData?.vaccinations || []}
          onUpdate={handleVaccinationsUpdate}
          isProcessing={isProcessing}
        />
      )}

      {(prescriptionData?.followUp && 
        typeof prescriptionData.followUp === 'string' && 
        prescriptionData.followUp.trim()) && (
        <FollowUpRichTextEditor
          followUp={prescriptionData?.followUp || ''}
          onUpdate={handleFollowUpUpdate}
          isProcessing={isProcessing}
        />
      )}

      {(prescriptionData?.others && 
        Array.isArray(prescriptionData.others) && 
        prescriptionData.others.length > 0) && (
        <AdditionalNotesRichTextEditor
          others={prescriptionData?.others || []}
          onUpdate={handleAdditionalNotesUpdate}
          isProcessing={isProcessing}
        />
      )}

      {/* Custom Modules - Rich Text Editor */}
      {prescriptionData?.dynamicFields && 
        Object.entries(prescriptionData.dynamicFields).map(([moduleName, moduleData]) => {
          const hasContent = Array.isArray(moduleData) && moduleData.length > 0;
          if (!hasContent) return null;
          
          return (
            <CustomModuleRichTextEditor
              key={moduleName}
              moduleName={moduleName}
              moduleData={moduleData || []}
              onUpdate={(moduleArray) => handleCustomModuleUpdate(moduleName, moduleArray)}
              onDelete={(module) => {
                const updatedData = { ...prescriptionData };
                if (updatedData.dynamicFields) {
                  const updatedDynamicFields = { ...updatedData.dynamicFields };
                  delete updatedDynamicFields[module];
                  updatedData.dynamicFields = updatedDynamicFields;
                  onUpdate(updatedData);
                }
              }}
              onEdit={() => {}} // Optional - not implementing module name edit in mobile
              isProcessing={isProcessing}
              isLocalModule={false}
              editingModule={null}
              updatedModuleName=""
              onEditNameChange={() => {}}
              onEditSave={() => {}}
              onEditCancel={() => {}}
            />
          );
        })}

      {/* Mobile-Only Sections - Gynec & Obstetric History
          Hide these cards entirely when there is no data to show, so
          empty modules are not visible on the Rx Pad. */}
      {renderSection(
        'Gynec History', 
        gynecHistoryIcon, 
        prescriptionData?.gynecHistory || caseManagerData?.gynecHistoryData, 
        renderGynaeHistory,
        (
          <button 
            type="button"
            className="add-edit-button"
            onClick={() => setGynecHistoryDrawerVisible(true)}
          >
            <img src={editIcon} alt="Edit" className="add-edit-icon" />
            <span>Add/Edit</span>
          </button>
        )
      )}
      {renderSection(
        'Obstetric History', 
        obstetricHistoryIcon, 
        prescriptionData?.obstetricHistory || caseManagerData?.obstetricHistory || allObstetricDetails, 
        renderObstetricHistory,
        (
          <button 
            type="button"
            className="add-edit-button"
            onClick={() => setObstetricHistoryDrawerVisible(true)}
          >
            <img src={editIcon} alt="Edit" className="add-edit-icon" />
            <span>Add/Edit</span>
          </button>
        )
      )}
      {renderSection('Surgeries & Procedures', surgeryIcon, prescriptionData?.surgeriesAndProcedures || caseManagerData?.surgeries, renderSurgeries)}
      
      {/* Bottom Action Buttons */}
      <div className="bottom-action-buttons">
        <button 
          type="button"
          className="quick-edit-btn"
          onClick={() => onEditWithVoice && onEditWithVoice('prescription')}
        >
          <img src={frameIcon} alt="Quick Edit" className="btn-icon" />
          <span>Quick Edit</span>
        </button>
        <button 
          type="button"
          className="end-visit-btn"
          onClick={() => !endVisitLoading && !isPrescriptionEmpty && onEndVisit && onEndVisit()}
          disabled={endVisitLoading || isPrescriptionEmpty}
        >
          {endVisitLoading ? (
            <Spin size="small" className="end-visit-btn-spinner" />
          ) : (
            <img src={logoutIcon} alt="End Visit" className="btn-icon" />
          )}
          <span>{endVisitLoading ? 'Ending visit...' : 'End Visit'}</span>
        </button>
      </div>

      {/* Phase 1: Lab Investigation Edit Sheet */}
      <LabInvestigationEditSheet
        visible={labInvestigationEdit.visible}
        onClose={() => setLabInvestigationEdit({ visible: false, index: -1 })}
        item={labInvestigationEdit.index >= 0 ? prescriptionData?.labInvestigation?.[labInvestigationEdit.index] : undefined}
        onSave={handleLabInvestigationSave}
      />

      <MedicationEditSheet
        visible={medicationEdit.visible}
        onClose={() => setMedicationEdit({ visible: false, index: -1, prefillName: null, prefillMetadata: null })}
        item={medicationEdit.index >= 0 ? prescriptionData?.medications?.[medicationEdit.index] : undefined}
        prefillName={medicationEdit.prefillName}
        prefillMetadata={medicationEdit.prefillMetadata}
        onSave={handleMedicationSave}
      />

      <AddCustomMedicineSheet
        visible={addCustomMedicine.visible}
        onClose={() => setAddCustomMedicine({ visible: false, initialName: '' })}
        initialData={addCustomMedicine.initialName ? { tmm_medicine_name: addCustomMedicine.initialName } : null}
        onSuccess={(added) => {
          setAddCustomMedicine({ visible: false, initialName: '' });
          setMedicationEdit({
            visible: true,
            index: -1,
            prefillName: added?.tmm_medicine_name || added?.medicine_name || '',
            prefillMetadata: added || null,
          });
        }}
      />

      {/* Gynec History Drawer */}
      <MobileGynecHistoryEdit
        visible={gynecHistoryDrawerVisible}
        onClose={() => setGynecHistoryDrawerVisible(false)}
        patient_data={patient_data}
        initialData={prescriptionData?.gynecHistory || caseManagerData?.gynecHistoryData}
        onSave={(updatedGynecHistory) => {
          onUpdate({ ...prescriptionData, gynecHistory: updatedGynecHistory });
          setGynecHistoryDrawerVisible(false);
        }}
      />
      <MobileObstetricHistoryEdit
        visible={obstetricHistoryDrawerVisible}
        onClose={() => setObstetricHistoryDrawerVisible(false)}
        patient_data={patient_data}
        initialData={prescriptionData?.obstetricHistory || caseManagerData?.obstetricHistory || allObstetricDetails}
        onSave={(updatedObstetricHistory) => {
          onUpdate({ ...prescriptionData, obstetricHistory: updatedObstetricHistory });
          setObstetricHistoryDrawerVisible(false);
        }}
        onOpenMedicalRecords={() => {
          // Close the obstetric drawer and navigate to medical records
          setObstetricHistoryDrawerVisible(false);
          // Navigate to patient details with medical records tab selected
          navigate('/patient_details', {
            state: {
              patient_data,
              sidebarKey: PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_RECORDS,
            },
          });
        }}
      />
    </div>
  );
};

export default MobileRxPadContent;
