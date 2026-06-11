import React, { useState, useEffect } from 'react';
import { Drawer, Button, Input, DatePicker } from 'antd';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { getGynecDetails, postGynecDetails, updateGynecDetails } from '../../api/services/ApiGynec';
import { useAccess } from '../../pages/vaccination/useAccess';
import { errorMessage, getClinicName } from '../../utils/utils';
import { getDecodedToken } from '../../utils/localStorage';
import moment from 'moment';
import {
  CYCLE_KEY_LIST,
  FLOW_LIST,
  PAIN_LIST,
  REPRODUCTIVE_LIFE_STAGES_LIST,
} from '../../utils/gynec_constants';

import MobileAgeAtMenarcheEdit from './MobileAgeAtMenarcheEdit';
import MobileCycleDetailsEdit from './MobileCycleDetailsEdit';
import MobileFlowDetailsEdit from './MobileFlowDetailsEdit';
import MobilePainDetailsEdit from './MobilePainDetailsEdit';
import MobileLifecycleHormonalChangesEdit from './MobileLifecycleHormonalChangesEdit';
import './MobileGynecHistoryEdit.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

function MobileGynecHistoryEdit({
  visible,
  onClose,
  patient_data,
  initialData = null,
  onSave
}) {
  const { userId, profile } = useSelector((state) => state.doctors);
  const { isGynaecHistoryAccessable } = useAccess();
  const tokenData = getDecodedToken();

  const trackGynecUpdateEvent = () => {
    if (window.Moengage) {
      const clinic_name = getClinicName(profile?.hospital_data);
      window.Moengage.track_event("TP_Gynec_history_updated", {
        clinic_name,
        doctor_id: profile?.doctor_unique_id,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id,
      });
    }
  };

  // Main form state
  const [ageAtMenarche, setAgeAtMenarche] = useState('');
  const [cycle, setCycle] = useState('');
  const [flow, setFlow] = useState('');
  const [pain, setPain] = useState('');
  const [reproductiveLifeStages, setReproductiveLifeStages] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [lmp, setLmp] = useState('');
  const [menarcheNotes, setMenarcheNotes] = useState('');
  const [intervalOfCycle, setIntervalOfCycle] = useState('');
  const [cycleNotes, setCycleNotes] = useState('');
  const [durationOfMenstrualFlow, setDurationOfMenstrualFlow] = useState('');
  const [clots, setClots] = useState(null);
  const [numberOfPadsPerDay, setNumberOfPadsPerDay] = useState('');
  const [flowNotes, setFlowNotes] = useState('');
  const [occurrenceOfPain, setOccurrenceOfPain] = useState('');
  const [painNotes, setPainNotes] = useState('');
  const [ageAtMenopause, setAgeAtMenopause] = useState('');
  const [typeOfMenopause, setTypeOfMenopause] = useState('');
  const [reproductiveNotes, setReproductiveNotes] = useState('');
  const [notes, setNotes] = useState('');

  const [showAgeAtMenarcheDetails, setShowAgeAtMenarcheDetails] = useState(false);
  const [showCycleDetails, setShowCycleDetails] = useState(false);
  const [showFlowDetails, setShowFlowDetails] = useState(false);
  const [showPainDetails, setShowPainDetails] = useState(false);
  const [showLifecycleDetails, setShowLifecycleDetails] = useState(false);

  const formatLmpForDisplay = (value) => {
    if (!value) return '';
    const m = moment(value, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
    return m.isValid() ? m.format('DD-MM-YYYY') : '';
  };

  const formatLmpForPayload = (value) => {
    if (!value) return '';
    const m = moment(value, 'DD-MM-YYYY', true);
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
  };

  useEffect(() => {
    if (visible && isGynaecHistoryAccessable && patient_data?.patient_unique_id) {
      if (initialData && Object.keys(initialData).length > 0) {
        loadDataFromInitial(initialData);
        fetchGynecHistory();
      } else {
        fetchGynecHistory();
      }
    }
  }, [visible, isGynaecHistoryAccessable, patient_data?.patient_unique_id]);

  const loadDataFromInitial = (data) => {
    if (!data || typeof data !== 'object') return;
    
    setIsEditMode(true);
    setAgeAtMenarche(data.ageAtMenarche ? String(data.ageAtMenarche) : '');
    setCycle(data.cycle || '');
    setFlow(data.flow || '');
    setPain(data.pain || '');
    setReproductiveLifeStages(data.reproductiveLifeStages || '');
    
    setLmp(formatLmpForDisplay(data.lmp));
    
    setMenarcheNotes(data.menarcheNotes || '');
    setIntervalOfCycle(data.intervalOfCycle ? String(data.intervalOfCycle) : '');
    setCycleNotes(data.cycleNotes || '');
    setDurationOfMenstrualFlow(data.durationOfMenstrualFlow ? String(data.durationOfMenstrualFlow) : '');
    setClots(data.clots !== undefined && data.clots !== null ? data.clots : null);
    setNumberOfPadsPerDay(data.numberOfPadsPerDay ? String(data.numberOfPadsPerDay) : '');
    setFlowNotes(data.flowNotes || '');
    setOccurrenceOfPain(data.occurrenceOfPain || '');
    setPainNotes(data.painNotes || '');
    setAgeAtMenopause(data.ageAtMenopause ? String(data.ageAtMenopause) : '');
    setTypeOfMenopause(data.typeOfMenopause || '');
    setReproductiveNotes(data.reproductiveNotes || '');
    setNotes(data.notes || '');
  };

  const fetchGynecHistory = async () => {
    if (!patient_data?.patient_unique_id || !userId) return;
    
    setLoading(true);
    try {
      const data = await getGynecDetails(patient_data.patient_unique_id, userId);
      if (data && Object.keys(data).length > 2) {
        setIsEditMode(true);
        loadDataFromInitial(data);
      } else {
        setIsEditMode(false);
        resetForm();
      }
    } catch (error) {
      errorMessage('Unable to load gynec history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAgeAtMenarche('');
    setCycle('');
    setFlow('');
    setPain('');
    setReproductiveLifeStages('');
    setLmp('');
    setMenarcheNotes('');
    setIntervalOfCycle('');
    setCycleNotes('');
    setDurationOfMenstrualFlow('');
    setClots(null);
    setNumberOfPadsPerDay('');
    setFlowNotes('');
    setOccurrenceOfPain('');
    setPainNotes('');
    setAgeAtMenopause('');
    setTypeOfMenopause('');
    setReproductiveNotes('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    setShowAgeAtMenarcheDetails(false);
    setShowCycleDetails(false);
    setShowFlowDetails(false);
    setShowPainDetails(false);
    setShowLifecycleDetails(false);
    onClose?.();
  };

  const handleSave = async () => {
    if (!patient_data?.patient_unique_id) {
      errorMessage('Patient information is missing.');
      return;
    }

    setLoading(true);
    const today = moment().toISOString();
    const user_id = tokenData?.result?.user_id || tokenData?.user_id || userId;

    // Build payload
    const payload = {};
    
    const lmpForPayload = formatLmpForPayload(lmp);
    if (lmpForPayload) payload.lmp = lmpForPayload;
    
    if (ageAtMenarche) payload.ageAtMenarche = parseInt(ageAtMenarche);
    if (cycle) payload.cycle = cycle;
    if (flow) payload.flow = flow;
    if (pain) payload.pain = pain;
    if (reproductiveLifeStages) payload.reproductiveLifeStages = reproductiveLifeStages;
    
    // Detail fields
    if (menarcheNotes) payload.menarcheNotes = menarcheNotes;
    if (intervalOfCycle) payload.intervalOfCycle = parseInt(intervalOfCycle);
    if (cycleNotes) payload.cycleNotes = cycleNotes;
    if (durationOfMenstrualFlow) payload.durationOfMenstrualFlow = parseInt(durationOfMenstrualFlow);
    if (clots !== null && clots !== undefined && clots !== '') payload.clots = clots;
    if (numberOfPadsPerDay) payload.numberOfPadsPerDay = parseInt(numberOfPadsPerDay);
    if (flowNotes) payload.flowNotes = flowNotes;
    if (occurrenceOfPain) payload.occurrenceOfPain = occurrenceOfPain;
    if (painNotes) payload.painNotes = painNotes;
    if (ageAtMenopause) payload.ageAtMenopause = parseInt(ageAtMenopause);
    if (typeOfMenopause) payload.typeOfMenopause = typeOfMenopause;
    if (reproductiveNotes) payload.reproductiveNotes = reproductiveNotes;
    if (notes) payload.notes = notes; // General menstruation notes

    // Filter out empty values - match web version logic exactly (exclude 'custom', 'number', empty strings, null)
    // Web version: if (gynecHistory[key] !== '' && gynecHistory[key] !== null && gynecHistory[key] !== "custom" && gynecHistory[key] !== "number")
    const filteredPayload = Object.keys(payload).reduce((acc, key) => {
      const value = payload[key];
      if (
        value !== '' && 
        value !== null && 
        value !== 'custom' && 
        value !== 'number'
      ) {
        acc[key] = value;
      }
      return acc;
    }, {});

    if (Object.keys(filteredPayload).length === 0) {
      setLoading(false);
      errorMessage('Please fill at least one field.');
      return;
    }

    try {
      if (isEditMode) {
        const updatePayload = {
          ...filteredPayload,
          createdAt: today,
          createdBy: user_id,
        };
        const response = await updateGynecDetails(patient_data.patient_unique_id, updatePayload, userId);
        if (response?.data) {
          trackGynecUpdateEvent();
          onSave?.(filteredPayload);
          onClose?.();
        } else {
          errorMessage('Unable to update gynec history for you. Please try again.');
        }
      } else {
        const createPayload = {
          patientId: patient_data.patient_unique_id,
          timeline: [{
            ...filteredPayload,
            createdAt: today,
            createdBy: user_id,
          }],
          createdAt: today,
          createdBy: user_id,
        };
        const response = await postGynecDetails(createPayload);
        if (response?.data) {
          trackGynecUpdateEvent();
          setIsEditMode(true);
          onSave?.(filteredPayload);
          onClose?.();
        } else {
          errorMessage('Unable to create gynec history for you. Please try again.');
        }
      }
    } catch (error) {
      if (isEditMode) {
        errorMessage('Unable to update gynec history for you. Please try again.');
      } else {
        errorMessage('Unable to create gynec history for you. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step-wise save (like Medical History): nested sheet save only updates local state; API call happens on main Save.
  const handleAgeAtMenarcheSave = (data) => {
    if (data.ageAtMenarche !== null) setAgeAtMenarche(String(data.ageAtMenarche));
    setMenarcheNotes(data.menarcheNotes || '');
  };

  const handleCycleDetailsSave = (data) => {
    if (data.intervalOfCycle !== null) setIntervalOfCycle(String(data.intervalOfCycle));
    setCycleNotes(data.cycleNotes || '');
  };

  const handleFlowDetailsSave = (data) => {
    if (data.durationOfMenstrualFlow !== null) setDurationOfMenstrualFlow(String(data.durationOfMenstrualFlow));
    setClots(data.clots);
    if (data.numberOfPadsPerDay !== null) setNumberOfPadsPerDay(String(data.numberOfPadsPerDay));
    setFlowNotes(data.flowNotes || '');
  };

  const handlePainDetailsSave = (data) => {
    setOccurrenceOfPain(data.occurrenceOfPain || '');
    setPainNotes(data.painNotes || '');
  };

  const handleLifecycleDetailsSave = (data) => {
    if (data.ageAtMenopause !== null) setAgeAtMenopause(String(data.ageAtMenopause));
    setTypeOfMenopause(data.typeOfMenopause || '');
    setReproductiveNotes(data.reproductiveNotes || '');
  };

  // Render button group
  const renderButtonGroup = (options, selectedValue, onSelect, className = '') => {
    return (
      <div className={`button-group ${className}`}>
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`option-button ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  if (!visible) return null;

  return (
    <>
      <Drawer
        placement="bottom"
        onClose={handleClose}
        open={visible}
        height="auto"
        className="mobile-gynec-history-edit"
        closable={false}
        maskClosable={!showAgeAtMenarcheDetails && !showCycleDetails && !showFlowDetails && !showPainDetails && !showLifecycleDetails}
        zIndex={1000}
        mask={!showAgeAtMenarcheDetails && !showCycleDetails && !showFlowDetails && !showPainDetails && !showLifecycleDetails}
      >
        <div className="mobile-gynec-content">
          <div className="mobile-gynec-header">
            <h3 className="mobile-gynec-title">Add/Edit Gynec History</h3>
            <button
              type="button"
              className="mobile-gynec-close"
              onClick={handleClose}
            >
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          <div className="mobile-gynec-body">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : (
              <>
                {/* Last Menstrual Period (LMP) */}
                <div className="form-section">
                  <label className="section-label">Last menstrual period</label>
                  <DatePicker
                    placeholder="DD-MM-YYYY"
                    format="DD-MM-YYYY"
                    value={lmp ? dayjs(lmp, 'DD-MM-YYYY') : null}
                    onChange={(date, dateString) => {
                      setLmp(formatLmpForDisplay(dateString) || '');
                    }}
                    disabledDate={(current) => {
                      return current && current > dayjs().endOf('day');
                    }}
                    className="lmp-date-picker"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Age at menarche */}
                <div className="form-section clickable" onClick={() => setShowAgeAtMenarcheDetails(true)}>
                  <div className="section-header">
                    <label className="section-label">Age at menarche</label>
                    {ageAtMenarche && <span className="section-value">{ageAtMenarche} years</span>}
                  </div>
                  {!ageAtMenarche && (
                    <button type="button" className="add-button">+ Add</button>
                  )}
                </div>

                {/* Cycle */}
                <div className="form-section">
                  <div className="section-header-with-action">
                    <label className="section-label">Cycle</label>
                  </div>
                  {renderButtonGroup(CYCLE_KEY_LIST, cycle, (value) => {
                    setCycle(value);
                    setTimeout(() => setShowCycleDetails(true), 100);
                  })}
                </div>

                {/* Flow */}
                <div className="form-section">
                  <div className="section-header-with-action">
                    <label className="section-label">Flow</label>
                  </div>
                  {renderButtonGroup(FLOW_LIST, flow, (value) => {
                    setFlow(value);
                    setTimeout(() => setShowFlowDetails(true), 100);
                  })}
                </div>

                {/* Pain */}
                <div className="form-section">
                  <div className="section-header-with-action">
                    <label className="section-label">Pain</label>
                  </div>
                  {renderButtonGroup(PAIN_LIST, pain, (value) => {
                    setPain(value);
                    setTimeout(() => setShowPainDetails(true), 100);
                  }, 'pain-grid')}
                </div>

                {/* Lifecycle Hormonal Changes */}
                <div className="form-section">
                  <div className="section-header-with-action">
                    <label className="section-label">Lifecycle Hormonal Changes</label>
                  </div>
                  {renderButtonGroup(REPRODUCTIVE_LIFE_STAGES_LIST, reproductiveLifeStages, (value) => {
                    setReproductiveLifeStages(value);
                    setTimeout(() => setShowLifecycleDetails(true), 100);
                  }, 'lifecycle-wrap')}
                </div>

                {/* General Notes */}
                <div className="form-section">
                  <label className="section-label">Note</label>
                  <Input.TextArea
                    placeholder="Write notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="notes-textarea"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mobile-gynec-footer">
            <Button
              type="primary"
              size="large"
              block
              onClick={handleSave}
              loading={loading}
              className="save-btn"
            >
              Save
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Nested Bottom Sheets */}
      <MobileAgeAtMenarcheEdit
        visible={showAgeAtMenarcheDetails}
        onClose={() => setShowAgeAtMenarcheDetails(false)}
        ageAtMenarche={ageAtMenarche}
        menarcheNotes={menarcheNotes}
        onSave={async (data) => {
          await handleAgeAtMenarcheSave(data);
          setShowAgeAtMenarcheDetails(false);
        }}
      />

      <MobileCycleDetailsEdit
        visible={showCycleDetails}
        onClose={() => setShowCycleDetails(false)}
        intervalOfCycle={intervalOfCycle}
        cycleNotes={cycleNotes}
        onSave={async (data) => {
          await handleCycleDetailsSave(data);
          setShowCycleDetails(false);
        }}
      />

      <MobileFlowDetailsEdit
        visible={showFlowDetails}
        onClose={() => setShowFlowDetails(false)}
        durationOfMenstrualFlow={durationOfMenstrualFlow}
        clots={clots}
        numberOfPadsPerDay={numberOfPadsPerDay}
        flowNotes={flowNotes}
        onSave={async (data) => {
          await handleFlowDetailsSave(data);
          setShowFlowDetails(false);
        }}
      />

      <MobilePainDetailsEdit
        visible={showPainDetails}
        onClose={() => setShowPainDetails(false)}
        occurrenceOfPain={occurrenceOfPain}
        painNotes={painNotes}
        onSave={async (data) => {
          await handlePainDetailsSave(data);
          setShowPainDetails(false);
        }}
      />

      <MobileLifecycleHormonalChangesEdit
        visible={showLifecycleDetails}
        onClose={() => setShowLifecycleDetails(false)}
        reproductiveLifeStages={reproductiveLifeStages}
        ageAtMenopause={ageAtMenopause}
        typeOfMenopause={typeOfMenopause}
        reproductiveNotes={reproductiveNotes}
        onSave={async (data) => {
          await handleLifecycleDetailsSave(data);
          setShowLifecycleDetails(false);
        }}
      />
    </>
  );
}

export default MobileGynecHistoryEdit;
