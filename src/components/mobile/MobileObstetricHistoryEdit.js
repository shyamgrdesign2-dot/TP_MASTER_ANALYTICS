import React, { useState, useEffect } from 'react';
import { Drawer, Button, Input, DatePicker, Select, Radio, message, Modal } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import moment from 'moment';
import { 
  fetchObstetricDetails, 
  upsertObstetricDetails,
  fetchDefaultAnc,
  fetchDefaultImmunisation,
  fetchAncDoctorList,
  fetchImmunisationDoctorList,
  fetchPrefillObstetricDetails,
  updatePrefillObstetricData
} from '../../pages/obstetric/service';
import { 
  addObstetricDetails,
  setDefaultAncSchedule,
  setDefaultImmunisation,
  setAncDoctorList,
  setImmunisationDoctorList
} from '../../redux/obstetricSlice';
import { useAccess } from '../../pages/vaccination/useAccess';
import { errorMessage } from '../../utils/utils';
import { mergeDefaultAndDoctorList } from '../../pages/obstetric/utils/helper';
import { getDecodedToken } from '../../utils/localStorage';

import MobileCurrentExaminationEdit from './MobileCurrentExaminationEdit';
import MobilePastPregnancyEdit from './MobilePastPregnancyEdit';
import MobileAncSchedulerEdit from './MobileAncSchedulerEdit';
import MobileImmunisationHistoryEdit from './MobileImmunisationHistoryEdit';
import MobilePreviousPregnancyOverview from './MobilePreviousPregnancyOverview';
import './MobileObstetricHistoryEdit.scss';
import './MobileCurrentExaminationEdit.scss';
import './MobilePastPregnancyEdit.scss';
import './MobileAncSchedulerEdit.scss';
import './MobileImmunisationHistoryEdit.scss';
import './MobilePreviousPregnancyOverview.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;
const {
  editIconBlue: editIcon,
  alerticon: alertIcon,
} = ASSETS.images;

const { TextArea } = Input;

const BloodGroupOptions = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const MaritalStatusOptions = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
];

function MobileObstetricHistoryEdit({
  visible,
  onClose,
  patient_data,
  initialData = null,
  onSave,
  onOpenMedicalRecords = null,
}) {
  const dispatch = useDispatch();
  const { userId } = useSelector((state) => state.doctors);
  const { obstetricDetails: allObstetricDetails } = useSelector((state) => state.obstetric);
  const { isGynaecHistoryAccessable } = useAccess();
  const tokenData = getDecodedToken();

  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [lmp, setLmp] = useState(null);
  const [edd, setEdd] = useState(null);
  const [ceed, setCeed] = useState(null);
  const [gestationWeeks, setGestationWeeks] = useState(null);
  const [gestationDays, setGestationDays] = useState(null);
  const [blood, setBlood] = useState('');
  const [husbandsBlood, setHusbandsBlood] = useState('');
  const [maritialStatus, setMaritialStatus] = useState('');
  const [consang, setConsang] = useState(null);
  const [marriageDurationYears, setMarriageDurationYears] = useState('');
  const [marriageDurationMonths, setMarriageDurationMonths] = useState('');

  const [gravidity, setGravidity] = useState('');
  const [parity, setParity] = useState('');
  const [livingChildren, setLivingChildren] = useState('');
  const [abortion, setAbortion] = useState('');
  const [ectopicPregnancies, setEctopicPregnancies] = useState('');

  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [deleteNoteModalVisible, setDeleteNoteModalVisible] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [discardChangesModalVisible, setDiscardChangesModalVisible] = useState(false);
  const [prefillObstetricData, setPrefillObstetricData] = useState({});
  const [examinationDrawerVisible, setExaminationDrawerVisible] = useState(false);
  const [examinationEditIndex, setExaminationEditIndex] = useState(-1);
  const [pregnancyHistoryDrawerVisible, setPregnancyHistoryDrawerVisible] = useState(false);
  const [pregnancyHistoryEditIndex, setPregnancyHistoryEditIndex] = useState(-1);
  const [isCompletePregnancyMode, setIsCompletePregnancyMode] = useState(false);
  const [ancSchedulerDrawerVisible, setAncSchedulerDrawerVisible] = useState(false);
  const [immunisationDrawerVisible, setImmunisationDrawerVisible] = useState(false);
  const [previousPregnancyOverviewVisible, setPreviousPregnancyOverviewVisible] = useState(false);
  const [selectedPreviousPregnancy, setSelectedPreviousPregnancy] = useState(null);

  const examinationHistory = allObstetricDetails?.currentPregnancy?.examinationHistory || [];
  const pregnancyHistory = allObstetricDetails?.pregnancyHistory || [];
  useEffect(() => {
    if (visible && isGynaecHistoryAccessable && patient_data?.patient_unique_id) {
      if (initialData && Object.keys(initialData).length > 0) {
        loadDataFromInitial(initialData);
      } else {
        fetchObstetricHistory();
      }
    }
  }, [visible, isGynaecHistoryAccessable, patient_data?.patient_unique_id]);

  // Fetch default ANC and Immunisation lists when drawer opens
  useEffect(() => {
    if (visible && isGynaecHistoryAccessable) {
      fetchDefaultLists();
    }
  }, [visible, isGynaecHistoryAccessable]);

  // Fetch prefill data from patient profile and apply when drawer opens (only if fields are empty)
  useEffect(() => {
    const fetchAndApplyPrefillData = async () => {
      if (!visible || !isGynaecHistoryAccessable || !patient_data?.patient_unique_id) return;
      
      try {
        const prefillData = await fetchPrefillObstetricDetails(patient_data.patient_unique_id);
        if (prefillData) {
          // Store full prefill for examination sheet (height, weight, bloodPressure) - same as web
          setPrefillObstetricData(prev => ({ ...prefillData, ...prev }));
          // Only apply prefill data if the fields are currently empty
          if (!lmp && prefillData.lmp) {
            setLmp(moment(prefillData.lmp).toISOString());
          }
          
          if (!blood && prefillData.bloodGroup) {
            // Handle blood group format (might include Rh factor in parentheses)
            const bloodValue = prefillData.bloodGroup.indexOf('(') > 0
              ? prefillData.bloodGroup.slice(0, prefillData.bloodGroup.indexOf('(')).trim()
              : prefillData.bloodGroup;
            setBlood(bloodValue);
          }
          
          if (!maritialStatus && prefillData.marriedStatus) {
            setMaritialStatus(prefillData.marriedStatus);
          }
        }
      } catch (error) {
      }
    };
    
    fetchAndApplyPrefillData();
  }, [visible, isGynaecHistoryAccessable, patient_data?.patient_unique_id]);

  const fetchDefaultLists = async () => {
    try {
      const [defaultAncRes, defaultImmunisationRes, ancDoctorListRes, immunisationDoctorListRes] = await Promise.all([
        fetchDefaultAnc(),
        fetchDefaultImmunisation(),
        fetchAncDoctorList(),
        fetchImmunisationDoctorList()
      ]);

      if (defaultAncRes) {
        dispatch(setDefaultAncSchedule(defaultAncRes));
      }
      if (defaultImmunisationRes) {
        dispatch(setDefaultImmunisation(defaultImmunisationRes));
      }
      if (ancDoctorListRes) {
        dispatch(setAncDoctorList(ancDoctorListRes));
      }
      if (immunisationDoctorListRes) {
        dispatch(setImmunisationDoctorList(immunisationDoctorListRes));
      }

      const existingCurrentPregnancy = allObstetricDetails?.currentPregnancy || {};
      const existingAncHistory = existingCurrentPregnancy?.ancHistory || [];
      const existingImmunisationHistory = existingCurrentPregnancy?.immunisationHistory || [];

      let mergedAncHistory = existingAncHistory;
      if (defaultAncRes?.length > 0 || ancDoctorListRes?.length > 0) {
        mergedAncHistory = mergeDefaultAndDoctorList(
          existingAncHistory,
          defaultAncRes || [],
          ancDoctorListRes || [],
          userId,
          true
        );
      }
      let mergedImmunisationHistory = existingImmunisationHistory;
      if (defaultImmunisationRes?.length > 0 || immunisationDoctorListRes?.length > 0) {
        mergedImmunisationHistory = mergeDefaultAndDoctorList(
          existingImmunisationHistory,
          defaultImmunisationRes || [],
          immunisationDoctorListRes || [],
          userId,
          false
        );
      }
      if (mergedAncHistory.length > 0 || mergedImmunisationHistory.length > 0) {
        const payload = {
          ...allObstetricDetails,
          currentPregnancy: {
            ...existingCurrentPregnancy,
            patientId: patient_data?.patient_unique_id,
            ancHistory: mergedAncHistory,
            immunisationHistory: mergedImmunisationHistory,
            examinationHistory: existingCurrentPregnancy?.examinationHistory || [],
          },
        };
        dispatch(addObstetricDetails(payload));
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    calculateGestation();
  }, [lmp, ceed]);

  useEffect(() => {
    if (lmp) {
      const lmpMoment = moment(lmp);
      const calculatedEdd = lmpMoment
        .clone()
        .add(1, 'year')
        .subtract(3, 'months')
        .add(7, 'days');
      setEdd(calculatedEdd.toISOString());
    } else {
      setEdd(null);
    }
  }, [lmp]);

  const calculateGestation = () => {
    const today = moment();
    let weeks = null;
    let days = null;

    if (ceed) {
      const gestationAge = 40 * 7 - Math.ceil(
        Math.abs(moment(ceed).startOf('day').diff(today.startOf('day'), 'days'))
      );
      weeks = Math.floor(gestationAge / 7);
      days = gestationAge % 7;
    } else if (lmp) {
      const lmpDate = moment(lmp);
      weeks = today.diff(lmpDate, 'weeks');
      const adjustedLmpDate = lmpDate.clone().add(weeks, 'weeks');
      days = today.diff(adjustedLmpDate, 'days');
    }

    setGestationWeeks(weeks);
    setGestationDays(days);
  };

  const loadDataFromInitial = (data) => {
    if (!data || typeof data !== 'object') return;

    const currentPregnancy = data?.currentPregnancy || data;

    setIsEditMode(true);
    if (currentPregnancy.lmp) {
      setLmp(currentPregnancy.lmp);
    }
    if (currentPregnancy.edd) {
      setEdd(currentPregnancy.edd);
    }
    if (currentPregnancy.ceed) {
      setCeed(currentPregnancy.ceed);
    }

    setBlood(currentPregnancy.blood || '');
    setHusbandsBlood(currentPregnancy.husbandsBlood || '');
    setMaritialStatus(currentPregnancy.maritialStatus || '');
    setConsang(currentPregnancy.consang);
    setMarriageDurationYears(currentPregnancy.marriageDurationYears ? String(currentPregnancy.marriageDurationYears) : '');
    setMarriageDurationMonths(currentPregnancy.marriageDurationMonths ? String(currentPregnancy.marriageDurationMonths) : '');

    setGravidity(currentPregnancy.gravidity !== undefined && currentPregnancy.gravidity !== null ? String(currentPregnancy.gravidity) : '');
    setParity(currentPregnancy.parity !== undefined && currentPregnancy.parity !== null ? String(currentPregnancy.parity) : '');
    setLivingChildren(currentPregnancy.livingChildren !== undefined && currentPregnancy.livingChildren !== null ? String(currentPregnancy.livingChildren) : '');
    setAbortion(currentPregnancy.abortion !== undefined && currentPregnancy.abortion !== null ? String(currentPregnancy.abortion) : '');
    setEctopicPregnancies(currentPregnancy.ectopicPregnancies !== undefined && currentPregnancy.ectopicPregnancies !== null ? String(currentPregnancy.ectopicPregnancies) : '');

    setDiagnosisNotes(currentPregnancy.diagnosisNotes || '');
  };

  const fetchObstetricHistory = async () => {
    if (!patient_data?.patient_unique_id || !userId) return;

    setLoading(true);
    try {
      const data = await fetchObstetricDetails(patient_data.patient_unique_id, userId);
      if (data && Object.keys(data).length > 0) {
        setIsEditMode(true);
        loadDataFromInitial(data);
      } else {
        setIsEditMode(false);
        resetForm();
      }
    } catch (error) {
      errorMessage('Error loading obstetric history');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLmp(null);
    setEdd(null);
    setCeed(null);
    setGestationWeeks(null);
    setGestationDays(null);
    setBlood('');
    setHusbandsBlood('');
    setMaritialStatus('');
    setConsang(null);
    setMarriageDurationYears('');
    setMarriageDurationMonths('');
    setGravidity('');
    setParity('');
    setLivingChildren('');
    setAbortion('');
    setEctopicPregnancies('');
    setDiagnosisNotes('');
    setIsDirty(false);
  };

  const handleSave = async () => {
    if (!patient_data?.patient_unique_id) {
      errorMessage('Patient information is missing.');
      return;
    }

    setLoading(true);
    const user_id = tokenData?.result?.user_id || tokenData?.user_id || userId;
    const existingCurrentPregnancy = allObstetricDetails?.currentPregnancy || {};

    try {
      // Build current pregnancy data - include all required array fields
      const currentPregnancy = {
        ...existingCurrentPregnancy,
        patientId: patient_data.patient_unique_id,
        // Ensure all array fields are initialized (required by backend)
        examinationHistory: existingCurrentPregnancy?.examinationHistory || [],
        ancHistory: existingCurrentPregnancy?.ancHistory || [],
        immunisationHistory: existingCurrentPregnancy?.immunisationHistory || [],
        modifiedAt: new Date().toISOString(),
        modifiedBy: user_id,
      };

      // Date fields
      if (lmp) currentPregnancy.lmp = lmp;
      if (edd) currentPregnancy.edd = edd;
      if (ceed) currentPregnancy.ceed = ceed;

      // Patient info fields
      if (blood) currentPregnancy.blood = blood;
      if (husbandsBlood) currentPregnancy.husbandsBlood = husbandsBlood;
      if (maritialStatus) currentPregnancy.maritialStatus = maritialStatus;
      if (consang !== null && consang !== undefined) currentPregnancy.consang = consang;
      if (marriageDurationYears) currentPregnancy.marriageDurationYears = parseInt(marriageDurationYears);
      if (marriageDurationMonths) currentPregnancy.marriageDurationMonths = parseInt(marriageDurationMonths);

      // GPLAE fields
      if (gravidity !== '') currentPregnancy.gravidity = parseInt(gravidity);
      if (parity !== '') currentPregnancy.parity = parseInt(parity);
      if (livingChildren !== '') currentPregnancy.livingChildren = parseInt(livingChildren);
      if (abortion !== '') currentPregnancy.abortion = parseInt(abortion);
      if (ectopicPregnancies !== '') currentPregnancy.ectopicPregnancies = parseInt(ectopicPregnancies);

      // Notes - include even if empty to allow clearing
      currentPregnancy.diagnosisNotes = diagnosisNotes ? diagnosisNotes.trim() : '';

      // If creating new, add created timestamps
      if (!isEditMode) {
        currentPregnancy.createdAt = new Date().toISOString();
        currentPregnancy.createdBy = user_id;
      }

      // Build full payload
      const payload = {
        ...allObstetricDetails,
        currentPregnancy,
        pregnancyHistory: allObstetricDetails?.pregnancyHistory || [],
      };

      // Save to API
      const response = await upsertObstetricDetails(patient_data.patient_unique_id, payload);

      if (response) {
        dispatch(addObstetricDetails(payload));
        if (Object.keys(prefillObstetricData).length > 0) {
          try {
            const prefillPayload = {};
            Object.keys(prefillObstetricData).forEach((key) => {
              if (prefillObstetricData[key]) {
                prefillPayload[key] = prefillObstetricData[key];
              }
            });
            if (Object.keys(prefillPayload).length > 0) {
              await updatePrefillObstetricData(prefillPayload, user_id);
            }
          } catch (prefillError) {
          }
        }

        message.success('Obstetric history saved successfully');
        setIsDirty(false);
        setPrefillObstetricData({});
        if (onSave) {
          onSave(currentPregnancy);
        }
        onClose();
      } else {
        errorMessage('Failed to save obstetric history');
      }
    } catch (error) {
      errorMessage('Error saving obstetric history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const revertAndClose = async () => {
    if (!patient_data?.patient_unique_id || !userId) {
      resetForm();
      setDiscardChangesModalVisible(false);
      setExaminationDrawerVisible(false);
      setPregnancyHistoryDrawerVisible(false);
      setAncSchedulerDrawerVisible(false);
      setImmunisationDrawerVisible(false);
      onClose();
      return;
    }
    setLoading(true);
    try {
      const data = await fetchObstetricDetails(patient_data.patient_unique_id, userId);
      if (data && Object.keys(data).length > 0) {
        dispatch(addObstetricDetails(data));
        loadDataFromInitial(data);
      } else {
        dispatch(addObstetricDetails({}));
        resetForm();
      }
      setPrefillObstetricData({});
      setExaminationDrawerVisible(false);
      setExaminationEditIndex(-1);
      setPregnancyHistoryDrawerVisible(false);
      setPregnancyHistoryEditIndex(-1);
      setIsCompletePregnancyMode(false);
      setAncSchedulerDrawerVisible(false);
      setImmunisationDrawerVisible(false);
      setPreviousPregnancyOverviewVisible(false);
      setSelectedPreviousPregnancy(null);
      setIsDirty(false);
      setDiscardChangesModalVisible(false);
      onClose();
    } catch (error) {
      errorMessage('Error loading obstetric history');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setDiscardChangesModalVisible(true);
    } else {
      revertAndClose();
    }
  };

  const handleConfirmDiscard = () => {
    revertAndClose();
  };

  const handleDeleteDiagnosisNotes = async () => {
    try {
      setLoading(true);
      const tokenInfo = tokenData || getDecodedToken();
      const user_id = tokenInfo?.id || userId;
      const existingCurrentPregnancy = allObstetricDetails?.currentPregnancy || {};

      const currentPregnancy = {
        ...existingCurrentPregnancy,
        lmp: lmp ? new Date(lmp).toISOString() : null,
        edd: edd ? new Date(edd).toISOString() : null,
        ceed: ceed ? new Date(ceed).toISOString() : null,
        blood,
        husbandsBlood,
        maritialStatus,
        consang,
        marriageDurationYears: marriageDurationYears || null,
        marriageDurationMonths: marriageDurationMonths || null,
        gravidity: gravidity ? parseInt(gravidity, 10) : null,
        parity: parity ? parseInt(parity, 10) : null,
        livingChildren: livingChildren ? parseInt(livingChildren, 10) : null,
        abortion: abortion ? parseInt(abortion, 10) : null,
        ectopicPregnancies: ectopicPregnancies ? parseInt(ectopicPregnancies, 10) : null,
        diagnosisNotes: '',
        patientId: patient_data?.patient_unique_id,
        examinationHistory: existingCurrentPregnancy?.examinationHistory || [],
        ancHistory: existingCurrentPregnancy?.ancHistory || [],
        immunisationHistory: existingCurrentPregnancy?.immunisationHistory || [],
        modifiedAt: new Date().toISOString(),
        modifiedBy: user_id,
        createdAt: existingCurrentPregnancy?.createdAt || new Date().toISOString(),
        createdBy: existingCurrentPregnancy?.createdBy || user_id,
      };

      const payload = {
        ...allObstetricDetails,
        currentPregnancy,
        pregnancyHistory: allObstetricDetails?.pregnancyHistory || [],
      };

      const response = await upsertObstetricDetails(patient_data.patient_unique_id, payload);

      if (response) {
        dispatch(addObstetricDetails(payload));
        setDiagnosisNotes('');
        setDeleteNoteModalVisible(false);
        message.success('Diagnosis note deleted');
      } else {
        errorMessage('Failed to delete diagnosis note');
      }
    } catch (error) {
      errorMessage('Error deleting diagnosis note');
    } finally {
      setLoading(false);
    }
  };

  const isPrimigravida = () => {
    return (
      gravidity === '1' &&
      (!parity || parity === '0') &&
      (!livingChildren || livingChildren === '0') &&
      (!abortion || abortion === '0') &&
      (!ectopicPregnancies || ectopicPregnancies === '0')
    );
  };

  const getGestationDisplay = () => {
    const parts = [];
    if (gestationWeeks !== null && gestationWeeks > 0) {
      parts.push(`${gestationWeeks} ${gestationWeeks === 1 ? 'Week' : 'Weeks'}`);
    }
    if (gestationDays !== null && gestationDays > 0) {
      parts.push(`${gestationDays} ${gestationDays === 1 ? 'Day' : 'Days'}`);
    }
    return parts.length > 0 ? parts.join(' & ') : '-';
  };

  return (
    <Drawer
      placement="bottom"
      open={visible}
      onClose={handleClose}
      closable={false}
      height="90vh"
      className="mobile-obstetric-history-edit"
      destroyOnClose
    >
      <div className="mobile-obstetric-content">
        {/* Header */}
        <div className="mobile-obstetric-header">
          <h2 className="mobile-obstetric-title">Obstetric History</h2>
          <button className="mobile-obstetric-close" onClick={handleClose}>
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        {/* Body */}
        <div className="mobile-obstetric-body">
          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : (
            <>
              {/* LMP, EDD, CEDD Section */}
              <div className="form-section">
                <p className="section-label">Patient Information</p>
                
                <div className="gplae-grid">
                  {/* LMP */}
                  <div className="gplae-item">
                    <span className="gplae-label">LMP</span>
                    <div className="lmp-date-picker">
                      <DatePicker
                        value={lmp ? dayjs(lmp) : null}
                        onChange={(date) => { 
                          const lmpValue = date ? date.toISOString() : null;
                          setLmp(lmpValue); 
                          setIsDirty(true);
                          // Update prefill data for sync to patient profile
                          setPrefillObstetricData(prev => ({ ...prev, lmp: lmpValue }));
                        }}
                        format="DD-MM-YYYY"
                        placeholder="Select Date"
                        disabledDate={(current) => current && current > dayjs()}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* EDD (Calculated) */}
                  <div className="gplae-item">
                    <span className="gplae-label">E.D.D</span>
                    <Input
                      value={edd ? moment(edd).format('DD-MM-YYYY') : '-'}
                      disabled
                      className="gplae-input"
                      style={{ backgroundColor: '#FAFAFB' }}
                    />
                  </div>

                  {/* CEDD */}
                  <div className="gplae-item">
                    <span className="gplae-label">C.E.D.D</span>
                    <div className="ceed-date-picker">
                      <DatePicker
                        value={ceed ? dayjs(ceed) : null}
                        onChange={(date) => { setCeed(date ? date.toISOString() : null); setIsDirty(true); }}
                        format="DD-MM-YYYY"
                        placeholder="Select Date"
                        disabledDate={(current) =>
                          current && (current < dayjs().startOf('day') || current > dayjs().add(280, 'day').endOf('day'))
                        }
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="gplae-item">
                    <span className="gplae-label">Gestation</span>
                    <Input
                      value={getGestationDisplay()}
                      disabled
                      className="gplae-input"
                      style={{ backgroundColor: '#FAFAFB' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <p className="section-label">Blood Group</p>
                <div className="gplae-grid">
                  <div className="gplae-item">
                    <span className="gplae-label">Patient's Blood</span>
                    <Select
                      value={blood || undefined}
                      onChange={(val) => { 
                        setBlood(val); 
                        setIsDirty(true);
                        setPrefillObstetricData(prev => ({ ...prev, bloodGroup: val }));
                      }}
                      placeholder="Select"
                      options={BloodGroupOptions}
                      className="blood-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="gplae-item">
                    <span className="gplae-label">Husband's Blood</span>
                    <Select
                      value={husbandsBlood || undefined}
                      onChange={(val) => { setHusbandsBlood(val); setIsDirty(true); }}
                      placeholder="Select"
                      options={BloodGroupOptions}
                      className="husbands-blood-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <p className="section-label">Marriage Details</p>
                <div className="gplae-grid">
                  <div className="gplae-item">
                    <span className="gplae-label">Marital Status</span>
                    <Select
                      value={maritialStatus || undefined}
                      onChange={(val) => { 
                        setMaritialStatus(val); 
                        setIsDirty(true);
                        setPrefillObstetricData(prev => ({ ...prev, marriedStatus: val }));
                      }}
                      placeholder="Select"
                      options={MaritalStatusOptions}
                      className="marital-status-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="gplae-item">
                    <span className="gplae-label">Consanguineous</span>
                    <Radio.Group
                      value={consang}
                      onChange={(e) => { setConsang(e.target.value); setIsDirty(true); }}
                      className="consang-radio-group"
                    >
                      <Radio value={true}>Yes</Radio>
                      <Radio value={false}>No</Radio>
                    </Radio.Group>
                  </div>
                </div>

                <div className="gplae-item" style={{ marginTop: 12 }}>
                  <span className="gplae-label">Marriage Duration</span>
                  <div className="marriage-duration-grid">
                    <div className="marriage-duration-item">
                      <Input
                        value={marriageDurationYears}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          if (parseInt(val) <= 100 || val === '') {
                            setMarriageDurationYears(val);
                            setIsDirty(true);
                          }
                        }}
                        placeholder="0"
                        className="marriage-duration-input"
                        maxLength={3}
                      />
                      <span className="marriage-duration-label">Years</span>
                    </div>
                    <div className="marriage-duration-item">
                      <Input
                        value={marriageDurationMonths}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          if (parseInt(val) <= 11 || val === '') {
                            setMarriageDurationMonths(val);
                            setIsDirty(true);
                          }
                        }}
                        placeholder="0"
                        className="marriage-duration-input"
                        maxLength={2}
                      />
                      <span className="marriage-duration-label">Months</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <p className="section-label">GPLAE {isPrimigravida() && <span style={{ color: '#4b4ad5', fontWeight: 500 }}>(Primigravida)</span>}</p>
                <div className="gplae-grid">
                  <div className="gplae-item">
                    <span className="gplae-label">G (Gravidity)</span>
                    <Input
                      value={gravidity}
                      onChange={(e) => { setGravidity(e.target.value.replace(/[^0-9]/g, '')); setIsDirty(true); }}
                      placeholder="0"
                      className="gplae-input"
                      maxLength={2}
                    />
                  </div>
                  <div className="gplae-item">
                    <span className="gplae-label">P (Parity)</span>
                    <Input
                      value={parity}
                      onChange={(e) => { setParity(e.target.value.replace(/[^0-9]/g, '')); setIsDirty(true); }}
                      placeholder="0"
                      className="gplae-input"
                      maxLength={2}
                    />
                  </div>
                  <div className="gplae-item">
                    <span className="gplae-label">L (Living Children)</span>
                    <Input
                      value={livingChildren}
                      onChange={(e) => { setLivingChildren(e.target.value.replace(/[^0-9]/g, '')); setIsDirty(true); }}
                      placeholder="0"
                      className="gplae-input"
                      maxLength={2}
                    />
                  </div>
                  <div className="gplae-item">
                    <span className="gplae-label">A (Abortion)</span>
                    <Input
                      value={abortion}
                      onChange={(e) => { setAbortion(e.target.value.replace(/[^0-9]/g, '')); setIsDirty(true); }}
                      placeholder="0"
                      className="gplae-input"
                      maxLength={2}
                    />
                  </div>
                  <div className="gplae-item">
                    <span className="gplae-label">E (Ectopic)</span>
                    <Input
                      value={ectopicPregnancies}
                      onChange={(e) => { setEctopicPregnancies(e.target.value.replace(/[^0-9]/g, '')); setIsDirty(true); }}
                      placeholder="0"
                      className="gplae-input"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header-row">
                  <p className="section-label">{diagnosisNotes ? 'Edit' : 'Add'} Diagnosis Notes</p>
                  {diagnosisNotes && (
                    <button
                      type="button"
                      className="delete-note-btn"
                      onClick={() => setDeleteNoteModalVisible(true)}
                    >
                      <i className="icon-delete"></i>
                      <span>Delete Note</span>
                    </button>
                  )}
                </div>
                <TextArea
                  value={diagnosisNotes}
                  onChange={(e) => { setDiagnosisNotes(e.target.value); setIsDirty(true); }}
                  placeholder="Enter additional details related to patient information"
                  className="notes-textarea"
                  rows={4}
                />
              </div>

              <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="section-label" style={{ margin: 0 }}>Current Examination</p>
                  {examinationHistory.length > 0 && (
                    <Button
                      type="link"
                      onClick={() => {
                        setExaminationEditIndex(-1);
                        setExaminationDrawerVisible(true);
                      }}
                      style={{ padding: 0, height: 'auto', color: '#4b4ad5' }}
                    >
                      + Add Visit
                    </Button>
                  )}
                </div>

                {examinationHistory.length > 0 ? (
                  <div className="examination-list">
                    {[...examinationHistory].reverse().map((exam, index) => {
                      const details = [];
                      if (exam.pallor !== undefined) details.push(`Pallor: ${exam.pallor ? 'Yes' : 'No'}`);
                      if (exam.oedema !== undefined) details.push(`Oedema: ${exam.oedema ? 'Yes' : 'No'}`);
                      if (exam.mothersBMI) details.push(`BMI: ${exam.mothersBMI}`);
                      if (exam.systolic && exam.diastolic) details.push(`BP: ${exam.systolic}/${exam.diastolic}`);
                      if (exam.heightOfFundus) details.push(`Fundus: ${exam.heightOfFundus} ${exam.heightOfFundusUnit || ''}`);
                      if (exam.presentation) details.push(exam.presentation);
                      if (exam.foetalHeartRate) details.push(`FHR: ${exam.foetalHeartRate} bpm`);

                      return (
                        <div key={index} className="examination-card">
                          <div className="exam-card-content">
                            <div className="exam-card-header">
                              <span className="visit-title">Visit {index + 1}</span>
                              <span className="visit-date">
                                {exam.date ? moment(exam.date).format('DD MMM YYYY') : ''}
                              </span>
                            </div>
                            {details.length > 0 && (
                              <div className="exam-card-details">
                                {details.slice(0, 4).map((detail, i) => (
                                  <span key={i} className="detail-item">{detail}</span>
                                ))}
                                {details.length > 4 && (
                                  <span className="detail-item">+{details.length - 4} more</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="exam-card-actions">
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => {
                                setExaminationEditIndex(index);
                                setExaminationDrawerVisible(true);
                              }}
                            >
                              <img src={editIcon} alt="Edit" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="add-examination-btn"
                    onClick={() => {
                      setExaminationEditIndex(-1);
                      setExaminationDrawerVisible(true);
                    }}
                  >
                    <span className="add-icon">+</span>
                    <span>Add Examination</span>
                  </button>
                )}

                {examinationHistory.length > 0 && (
                  <div className="complete-pregnancy-section">
                    <span className="or-divider">or</span>
                    <Button
                      type="default"
                      className="complete-pregnancy-btn"
                      onClick={() => {
                        setIsCompletePregnancyMode(true);
                        setPregnancyHistoryEditIndex(-1);
                        setPregnancyHistoryDrawerVisible(true);
                      }}
                    >
                      Complete Pregnancy
                    </Button>
                  </div>
                )}
              </div>

              {/* Pregnancy History Section */}
              <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="section-label" style={{ margin: 0 }}>Pregnancy History</p>
                  {pregnancyHistory.length > 0 && (
                    <Button
                      type="link"
                      onClick={() => {
                        setPregnancyHistoryEditIndex(-1);
                        setPregnancyHistoryDrawerVisible(true);
                      }}
                      style={{ padding: 0, height: 'auto', color: '#4b4ad5' }}
                    >
                      + Add Pregnancy
                    </Button>
                  )}
                </div>

                {pregnancyHistory.length > 0 ? (
                  <div className="pregnancy-history-list">
                    {pregnancyHistory.map((pregnancy, index) => {
                      const details = [];
                      if (pregnancy.termLength) details.push(pregnancy.termLength);
                      if (pregnancy.deliveryMode) details.push(pregnancy.deliveryMode);
                      if (pregnancy.gender) details.push(pregnancy.gender);
                      if (pregnancy.babysWeight) details.push(`${pregnancy.babysWeight} kg`);
                      if (pregnancy.gestationPeriod) details.push(`${pregnancy.gestationPeriod} weeks`);
                      if (pregnancy.location) details.push(pregnancy.location);
                      if (pregnancy.typeOfAbortion) details.push(pregnancy.typeOfAbortion);

                      const getOutcomeClass = (outcome) => {
                        switch (outcome) {
                          case 'Live': return 'live';
                          case 'Still birth': return 'stillbirth';
                          case 'Ectopic': return 'ectopic';
                          case 'Abortion': return 'miscarriage';
                          default: return '';
                        }
                      };

                      return (
                        <div key={index} className="pregnancy-card">
                          <div className="pregnancy-card-content">
                            <div className="pregnancy-card-header">
                              <span className="gravida-badge">
                                G {pregnancy.gravidity || pregnancy.gravidaNumber}
                              </span>
                              {pregnancy.outcome && (
                                <span className={`outcome-badge ${getOutcomeClass(pregnancy.outcome)}`}>
                                  {pregnancy.outcome === 'Abortion' ? 'Miscarriage' : pregnancy.outcome}
                                </span>
                              )}
                            </div>
                            {details.length > 0 && (
                              <div className="pregnancy-card-details">
                                {details.slice(0, 3).map((detail, i) => (
                                  <span key={i} className="detail-item">{detail}</span>
                                ))}
                                {details.length > 3 && (
                                  <span className="detail-item">+{details.length - 3} more</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="pregnancy-card-actions">
                            {pregnancy.examinationHistory?.length > 0 && (
                              <button
                                type="button"
                                className="action-btn view-history-btn"
                                onClick={() => {
                                  setSelectedPreviousPregnancy(pregnancy);
                                  setPreviousPregnancyOverviewVisible(true);
                                }}
                              >
                                <span>View</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => {
                                setPregnancyHistoryEditIndex(index);
                                setPregnancyHistoryDrawerVisible(true);
                              }}
                            >
                              <img src={editIcon} alt="Edit" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="add-pregnancy-btn"
                    onClick={() => {
                      setPregnancyHistoryEditIndex(-1);
                      setPregnancyHistoryDrawerVisible(true);
                    }}
                  >
                    <span className="add-icon">+</span>
                    <span>Add Past Pregnancy</span>
                  </button>
                )}
              </div>

              {/* ANC Scheduler Section */}
              <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="section-label" style={{ margin: 0 }}>ANC Scheduler</p>
                  <Button
                    type="link"
                    onClick={() => setAncSchedulerDrawerVisible(true)}
                    style={{ padding: 0, height: 'auto', color: '#4b4ad5' }}
                  >
                    View/Edit
                  </Button>
                </div>
                <div className="anc-summary">
                  {allObstetricDetails?.currentPregnancy?.ancHistory?.length > 0 ? (
                    <div className="anc-summary-content">
                      <span className="anc-count">
                        {allObstetricDetails.currentPregnancy.ancHistory.length} tests scheduled
                      </span>
                      <span className="anc-completed">
                        {allObstetricDetails.currentPregnancy.ancHistory.filter(t => t.status === 'Completed').length} completed
                      </span>
                    </div>
                  ) : (
                    <p className="no-anc-text">No ANC tests scheduled yet</p>
                  )}
                </div>
              </div>

              {/* Immunisation History Section */}
              <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="section-label" style={{ margin: 0 }}>Immunisation History</p>
                  <Button
                    type="link"
                    onClick={() => setImmunisationDrawerVisible(true)}
                    style={{ padding: 0, height: 'auto', color: '#4b4ad5' }}
                  >
                    View/Edit
                  </Button>
                </div>
                <div className="immunisation-summary">
                  {allObstetricDetails?.currentPregnancy?.immunisationHistory?.length > 0 ? (
                    <div className="immunisation-summary-content">
                      <span className="immunisation-count">
                        {allObstetricDetails.currentPregnancy.immunisationHistory.length} vaccines
                      </span>
                      <span className="immunisation-given">
                        {allObstetricDetails.currentPregnancy.immunisationHistory.filter(v => v.status === 'Given').length} given
                      </span>
                    </div>
                  ) : (
                    <p className="no-immunisation-text">No vaccines recorded yet</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mobile-obstetric-footer">
          <Button
            type="primary"
            block
            className="save-btn"
            onClick={handleSave}
            loading={loading}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Current Examination Drawer */}
      <MobileCurrentExaminationEdit
        visible={examinationDrawerVisible}
        onClose={() => {
          setExaminationDrawerVisible(false);
          setExaminationEditIndex(-1);
        }}
        patient_data={patient_data}
        editIndex={examinationEditIndex}
        prefillObstetricData={prefillObstetricData}
        setPrefillObstetricData={setPrefillObstetricData}
        onSave={() => {
          setExaminationDrawerVisible(false);
          setExaminationEditIndex(-1);
        }}
      />

      {/* Past Pregnancy Drawer */}
      <MobilePastPregnancyEdit
        visible={pregnancyHistoryDrawerVisible}
        onClose={() => {
          setPregnancyHistoryDrawerVisible(false);
          setPregnancyHistoryEditIndex(-1);
          setIsCompletePregnancyMode(false);
        }}
        patient_data={patient_data}
        editIndex={pregnancyHistoryEditIndex}
        onSave={() => {
          setPregnancyHistoryDrawerVisible(false);
          setPregnancyHistoryEditIndex(-1);
          setIsCompletePregnancyMode(false);
        }}
        isCompletePregnancy={isCompletePregnancyMode}
        currentGravidity={gravidity}
        onCompletePregnancy={() => {
          // Close all drawers and refresh data after completing pregnancy
          setPregnancyHistoryDrawerVisible(false);
          setPregnancyHistoryEditIndex(-1);
          setIsCompletePregnancyMode(false);
          // Close the main drawer as well since pregnancy is complete
          resetForm();
          onClose();
        }}
      />

      {/* ANC Scheduler Drawer */}
      <MobileAncSchedulerEdit
        visible={ancSchedulerDrawerVisible}
        onClose={() => setAncSchedulerDrawerVisible(false)}
        patient_data={patient_data}
        onSave={() => {
          setAncSchedulerDrawerVisible(false);
        }}
        onOpenMedicalRecords={onOpenMedicalRecords}
      />

      {/* Immunisation History Drawer */}
      <MobileImmunisationHistoryEdit
        visible={immunisationDrawerVisible}
        onClose={() => setImmunisationDrawerVisible(false)}
        patient_data={patient_data}
        onSave={() => {
          setImmunisationDrawerVisible(false);
        }}
      />

      {/* Previous Pregnancy Overview (Read-only) */}
      <MobilePreviousPregnancyOverview
        visible={previousPregnancyOverviewVisible}
        onClose={() => {
          setPreviousPregnancyOverviewVisible(false);
          setSelectedPreviousPregnancy(null);
        }}
        pregnancyData={selectedPreviousPregnancy}
      />

      {/* Delete Note Confirmation Modal */}
      <Modal
        open={deleteNoteModalVisible}
        onCancel={() => setDeleteNoteModalVisible(false)}
        footer={null}
        centered
        width={320}
        className="delete-note-modal"
        closable={false}
      >
        <div className="delete-modal-content">
          <div className="delete-modal-header">
            <h3>Delete Note</h3>
          </div>
          <div className="delete-modal-body">
            <div className="alert-warning-box">
              <img src={alertIcon} alt="Warning" className="alert-icon" />
              <span>Are you sure you want to delete this note?</span>
            </div>
          </div>
          <div className="delete-modal-footer">
            <button
              type="button"
              className="yes-delete-btn"
              onClick={handleDeleteDiagnosisNotes}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <Button
              type="primary"
              className="no-keep-btn"
              onClick={() => setDeleteNoteModalVisible(false)}
              disabled={loading}
            >
              No, Keep
            </Button>
          </div>
        </div>
      </Modal>

      {/* Discard Changes Confirmation Modal */}
      <Modal
        open={discardChangesModalVisible}
        onCancel={() => setDiscardChangesModalVisible(false)}
        footer={null}
        centered
        width={320}
        className="discard-changes-modal"
        closable={false}
      >
        <div className="delete-modal-content">
          <div className="delete-modal-header">
            <h3>Unsaved Changes</h3>
          </div>
          <div className="delete-modal-body">
            <div className="alert-warning-box">
              <img src={alertIcon} alt="Warning" className="alert-icon" />
              <span>You have unsaved changes. Are you sure you want to discard them?</span>
            </div>
          </div>
          <div className="delete-modal-footer">
            <button
              type="button"
              className="yes-delete-btn"
              onClick={handleConfirmDiscard}
            >
              Yes, Discard
            </button>
            <Button
              type="primary"
              className="no-keep-btn"
              onClick={() => setDiscardChangesModalVisible(false)}
            >
              Keep Editing
            </Button>
          </div>
        </div>
      </Modal>
    </Drawer>
  );
}

export default MobileObstetricHistoryEdit;
