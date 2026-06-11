import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Button, Input, DatePicker, Select, Radio, message, Modal } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import moment from 'moment';
import { addObstetricDetails, obstetricDetailsUpdated, patientDiagnosisUpdated } from '../../redux/obstetricSlice';
import { errorMessage } from '../../utils/utils';

import './MobilePastPregnancyEdit.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;
const alertIcon = ASSETS.images.alerticon;

const { TextArea } = Input;

const GravidaOptions = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
];

const OutcomeOptions = [
  { value: 'Live', label: 'Live' },
  { value: 'Still birth', label: 'Still birth' },
  { value: 'Ectopic', label: 'Ectopic' },
  { value: 'Abortion', label: 'Miscarriage' },
];

const DeliveryModeOptions = [
  { value: 'FTND', label: 'FTND' },
  { value: 'LSCS', label: 'LSCS' },
  { value: 'PTVD', label: 'PTVD' },
];

const EctopicLocationOptions = [
  { value: 'Left tube', label: 'Left tube' },
  { value: 'Right tube', label: 'Right tube' },
  { value: 'Others', label: 'Others' },
  { value: 'Cornual Pregnancy', label: 'Cornual Pregnancy' },
  { value: 'Extra Uterine Pregnancy', label: 'Extra Uterine Pregnancy' },
  { value: 'Ovarian Pregnancy', label: 'Ovarian Pregnancy' },
  { value: 'Tubal Abortion', label: 'Tubal Abortion' },
];

const MiscarriageTypeOptions = [
  { value: 'Missed abortion', label: 'Missed Miscarriage' },
  { value: 'Spontaneous', label: 'Spontaneous' },
  { value: 'Induce', label: 'Induce' },
  { value: 'Recurrent', label: 'Recurrent' },
  { value: 'Septic Abortion', label: 'Septic Abortion' },
  { value: 'Incomplete Abortion', label: 'Incomplete Abortion' },
  { value: 'Blighted Ovum', label: 'Blighted Ovum' },
  { value: 'Hydatidiform Mole', label: 'Hydatidiform Mole' },
];

function MobilePastPregnancyEdit({
  visible,
  onClose,
  patient_data,
  editIndex = -1,
  onSave,
  isCompletePregnancy = false,
  currentGravidity = null,
  onCompletePregnancy = null,
}) {
  const dispatch = useDispatch();
  const { userId } = useSelector((state) => state.doctors);
  const { obstetricDetails: allObstetricDetails } = useSelector((state) => state.obstetric);
  const pregnancyHistory = allObstetricDetails?.pregnancyHistory || [];

  // Loading state
  const [loading, setLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [completeConfirmModalVisible, setCompleteConfirmModalVisible] = useState(false);

  // Data loss warning state
  const [isDirty, setIsDirty] = useState(false);
  const [discardChangesModalVisible, setDiscardChangesModalVisible] = useState(false);

  // Initial pregnancy when opened for edit; restored on discard
  const [initialPregnancyData, setInitialPregnancyData] = useState(null);

  // Form state
  const [gravidity, setGravidity] = useState(undefined);
  const [outcome, setOutcome] = useState(undefined);
  
  // Live/Still birth fields
  const [termLength, setTermLength] = useState(undefined);
  const [deliveryMode, setDeliveryMode] = useState(undefined);
  const [typeOfDelivery, setTypeOfDelivery] = useState(undefined); // 'date' or 'age'
  const [dateOfDelivery, setDateOfDelivery] = useState(null);
  const [ageOfDeliveryYears, setAgeOfDeliveryYears] = useState('');
  const [ageOfDeliveryMonths, setAgeOfDeliveryMonths] = useState('');
  const [gender, setGender] = useState(undefined);
  const [babysWeight, setBabysWeight] = useState('');

  // Ectopic/Miscarriage fields
  const [gestationPeriod, setGestationPeriod] = useState('');
  const [location, setLocation] = useState(undefined); // Ectopic
  const [typeOfAbortion, setTypeOfAbortion] = useState(undefined); // Miscarriage
  const [modeOfManagement, setModeOfManagement] = useState(undefined); // Medical/Surgical

  // Remarks
  const [remarks, setRemarks] = useState('');

  // Load existing data when editing
  useEffect(() => {
    if (visible) {
      if (editIndex >= 0 && pregnancyHistory.length > 0) {
        const data = pregnancyHistory[editIndex];
        if (data) {
          setInitialPregnancyData({ ...data });
          loadDataFromPregnancy(data);
        } else {
          setInitialPregnancyData(null);
        }
      } else {
        setInitialPregnancyData(null);
        resetForm();
        // Pre-fill gravidity when completing pregnancy
        if (isCompletePregnancy && currentGravidity) {
          setGravidity(String(currentGravidity));
        }
      }
    }
  }, [visible, editIndex, isCompletePregnancy, currentGravidity]);

  const loadDataFromPregnancy = (data) => {
    setGravidity(data.gravidity || data.gravidaNumber || undefined);
    setOutcome(data.outcome || undefined);
    setTermLength(data.termLength || undefined);
    setDeliveryMode(data.deliveryMode || undefined);
    setTypeOfDelivery(data.typeOfDelivery || undefined);
    setDateOfDelivery(data.dateOfDelivery || null);
    
    // Parse age of delivery
    if (data.ageOfDelivery) {
      const years = data.ageOfDelivery.indexOf('y') > -1 
        ? data.ageOfDelivery.slice(0, data.ageOfDelivery.indexOf('y')) 
        : '';
      const months = data.ageOfDelivery.indexOf('m') > -1 
        ? data.ageOfDelivery.slice(data.ageOfDelivery.indexOf(' ') + 1, data.ageOfDelivery.indexOf('m')) 
        : '';
      setAgeOfDeliveryYears(years);
      setAgeOfDeliveryMonths(months);
    } else {
      setAgeOfDeliveryYears('');
      setAgeOfDeliveryMonths('');
    }

    setGender(data.gender || undefined);
    setBabysWeight(data.babysWeight ? String(data.babysWeight) : '');
    setGestationPeriod(data.gestationPeriod ? String(data.gestationPeriod) : '');
    setLocation(data.location || undefined);
    setTypeOfAbortion(data.typeOfAbortion || undefined);
    setModeOfManagement(data.modeOfAbortion || data.modeOfManagement || undefined);
    setRemarks(data.remarks || '');
  };

  const resetForm = () => {
    setGravidity(undefined);
    setOutcome(undefined);
    setTermLength(undefined);
    setDeliveryMode(undefined);
    setTypeOfDelivery(undefined);
    setDateOfDelivery(null);
    setAgeOfDeliveryYears('');
    setAgeOfDeliveryMonths('');
    setGender(undefined);
    setBabysWeight('');
    setGestationPeriod('');
    setLocation(undefined);
    setTypeOfAbortion(undefined);
    setModeOfManagement(undefined);
    setRemarks('');
    setIsDirty(false);
  };

  // Build age of delivery string
  const getAgeOfDelivery = () => {
    const years = ageOfDeliveryYears || '';
    const months = ageOfDeliveryMonths || '';
    return `${years ? years + 'y ' : ''}${months ? months + 'm' : ''}`.trim();
  };

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return gravidity && outcome;
  }, [gravidity, outcome]);

  const handleSave = async () => {
    if (!patient_data?.patient_unique_id) {
      errorMessage('Patient information is missing');
      return;
    }
    if (!isFormValid) {
      errorMessage('Please fill required fields (Gravida number and Outcome)');
      return;
    }

    setLoading(true);

    try {
      // Build pregnancy data
      const pregnancyData = {
        gravidity,
        outcome,
        modifiedAt: new Date().toISOString(),
        modifiedBy: userId,
      };

      // Add fields based on outcome
      if (['Live', 'Still birth'].includes(outcome)) {
        if (termLength) pregnancyData.termLength = termLength;
        if (deliveryMode) pregnancyData.deliveryMode = deliveryMode;
        if (typeOfDelivery) pregnancyData.typeOfDelivery = typeOfDelivery;
        if (typeOfDelivery === 'date' && dateOfDelivery) {
          pregnancyData.dateOfDelivery = new Date(dateOfDelivery).toISOString();
        }
        if (typeOfDelivery === 'age') {
          const ageStr = getAgeOfDelivery();
          if (ageStr) pregnancyData.ageOfDelivery = ageStr;
        }
        if (gender) pregnancyData.gender = gender;
        if (babysWeight) pregnancyData.babysWeight = babysWeight;
      }

      if (['Ectopic', 'Abortion'].includes(outcome)) {
        if (gestationPeriod) pregnancyData.gestationPeriod = gestationPeriod;
        if (outcome === 'Ectopic' && location) pregnancyData.location = location;
        if (outcome === 'Abortion' && typeOfAbortion) pregnancyData.typeOfAbortion = typeOfAbortion;
        if (modeOfManagement) {
          if (outcome === 'Abortion') {
            pregnancyData.modeOfAbortion = modeOfManagement;
          } else {
            pregnancyData.modeOfManagement = modeOfManagement;
          }
        }
      }

      if (remarks) pregnancyData.remarks = remarks.trim();

      // Update pregnancy history
      let newPregnancyHistory = [...pregnancyHistory];

      if (editIndex >= 0) {
        // Edit existing
        newPregnancyHistory[editIndex] = {
          ...newPregnancyHistory[editIndex],
          ...pregnancyData,
        };
      } else {
        // Add new
        pregnancyData.createdAt = new Date().toISOString();
        pregnancyData.createdBy = userId;
        pregnancyData.examinationHistory = [];
        pregnancyData.ancHistory = [];
        pregnancyData.immunisationHistory = [];
        newPregnancyHistory.push(pregnancyData);
      }

      // Build payload with all required fields
      const currentPregnancy = allObstetricDetails?.currentPregnancy || {};
      let payload;
      
      if (isCompletePregnancy) {
        // When completing pregnancy, move current pregnancy data to the new entry and set currentPregnancy to null
        pregnancyData.examinationHistory = currentPregnancy?.examinationHistory || [];
        pregnancyData.ancHistory = currentPregnancy?.ancHistory || [];
        pregnancyData.immunisationHistory = currentPregnancy?.immunisationHistory || [];
        
        // Update the last entry in history with the examination data
        newPregnancyHistory[newPregnancyHistory.length - 1] = pregnancyData;
        
        payload = {
          ...allObstetricDetails,
          currentPregnancy: null, // Clear current pregnancy
          pregnancyHistory: newPregnancyHistory,
        };
      } else {
        payload = {
          ...allObstetricDetails,
          currentPregnancy: {
            ...currentPregnancy,
            patientId: patient_data.patient_unique_id,
            examinationHistory: currentPregnancy?.examinationHistory || [],
            ancHistory: currentPregnancy?.ancHistory || [],
            immunisationHistory: currentPregnancy?.immunisationHistory || [],
          },
          pregnancyHistory: newPregnancyHistory,
        };
      }

      // Step-wise save: update Redux only; API call happens on main Obstetric History Save
      dispatch(addObstetricDetails(payload));
      dispatch(obstetricDetailsUpdated());
      dispatch(patientDiagnosisUpdated());

      if (isCompletePregnancy) {
        message.success('Pregnancy completed successfully');
        if (onCompletePregnancy) onCompletePregnancy();
      } else {
        message.success(editIndex >= 0 ? 'Pregnancy history updated' : 'Pregnancy history added');
      }
      if (onSave) onSave(newPregnancyHistory);
      handleClose();
    } catch (error) {
      errorMessage('Error saving pregnancy history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!patient_data?.patient_unique_id) {
      errorMessage('Patient information is missing');
      return;
    }
    if (editIndex < 0) return;

    setLoading(true);

    try {
      let newPregnancyHistory = [...pregnancyHistory];
      newPregnancyHistory.splice(editIndex, 1);

      const currentPregnancy = allObstetricDetails?.currentPregnancy || {};
      const payload = {
        ...allObstetricDetails,
        currentPregnancy: {
          ...currentPregnancy,
          patientId: patient_data.patient_unique_id,
          examinationHistory: currentPregnancy?.examinationHistory || [],
          ancHistory: currentPregnancy?.ancHistory || [],
          immunisationHistory: currentPregnancy?.immunisationHistory || [],
        },
        pregnancyHistory: newPregnancyHistory,
      };

      // Step-wise save: update Redux only; API call happens on main Obstetric History Save
      dispatch(addObstetricDetails(payload));
      dispatch(obstetricDetailsUpdated());
      dispatch(patientDiagnosisUpdated());

      message.success('Pregnancy history deleted');
      if (onSave) onSave(newPregnancyHistory);
      setDeleteModalVisible(false);
      handleClose();
    } catch (error) {
      errorMessage('Error deleting pregnancy history');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isDirty && !isCompletePregnancy) {
      setDiscardChangesModalVisible(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    if (initialPregnancyData != null && editIndex >= 0) {
      loadDataFromPregnancy(initialPregnancyData);
    } else {
      resetForm();
    }
    setDiscardChangesModalVisible(false);
    setIsDirty(false);
    onClose();
  };

  // Handle number input
  const handleNumberInput = (value, setter, max = 999) => {
    setIsDirty(true);
    const cleaned = value.replace(/[^0-9]/g, '');
    if (parseInt(cleaned) <= max || cleaned === '') {
      setter(cleaned);
    }
  };

  // Handle decimal input
  const handleDecimalInput = (value, setter) => {
    setIsDirty(true);
    const cleaned = value.replace(/[^0-9.]/g, '');
    setter(cleaned);
  };

  // Show Live/Still birth fields
  const showLiveBirthFields = ['Live', 'Still birth'].includes(outcome);
  // Show Ectopic/Miscarriage fields
  const showEctopicFields = ['Ectopic', 'Abortion'].includes(outcome);

  return (
    <Drawer
      placement="bottom"
      open={visible}
      onClose={handleClose}
      closable={false}
      height="90vh"
      className="mobile-past-pregnancy-edit"
      destroyOnClose
    >
      <div className="mobile-pregnancy-content">
        {/* Header */}
        <div className="mobile-pregnancy-header">
          <h2 className="mobile-pregnancy-title">
            {isCompletePregnancy 
              ? 'Complete Pregnancy' 
              : editIndex >= 0 
                ? 'Edit Past Pregnancy' 
                : 'Add Past Pregnancy'}
          </h2>
          <div className="header-actions">
            {editIndex >= 0 && (
              <button
                type="button"
                className="delete-btn"
                onClick={() => setDeleteModalVisible(true)}
              >
                Delete
              </button>
            )}
            <button className="mobile-pregnancy-close" onClick={handleClose}>
              <img src={closeIcon} alt="Close" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="mobile-pregnancy-body">
          {/* Required Fields */}
          <div className="form-section">
            <p className="section-label">Required Information</p>
            <div className="form-grid">
              <div className="form-item full-width">
                <span className="form-label">Gravida Number <span className="required">*</span></span>
                <Select
                  value={gravidity}
                  onChange={(val) => { setIsDirty(true); setGravidity(val); }}
                  placeholder="Select"
                  options={GravidaOptions}
                  className="form-select"
                  popupClassName="pregnancy-form-dropdown"
                  style={{ width: '100%' }}
                  disabled={isCompletePregnancy && currentGravidity}
                />
              </div>
              <div className="form-item full-width" style={{ marginTop: 16 }}>
                <span className="form-label">Outcome <span className="required">*</span></span>
                <Select
                  value={outcome}
                  onChange={(val) => {
                    setIsDirty(true);
                    setOutcome(val);
                    // Reset fields when outcome changes
                    setTermLength(undefined);
                    setDeliveryMode(undefined);
                    setTypeOfDelivery(undefined);
                    setDateOfDelivery(null);
                    setAgeOfDeliveryYears('');
                    setAgeOfDeliveryMonths('');
                    setGender(undefined);
                    setBabysWeight('');
                    setGestationPeriod('');
                    setLocation(undefined);
                    setTypeOfAbortion(undefined);
                    setModeOfManagement(undefined);
                  }}
                  placeholder="Select"
                  options={OutcomeOptions}
                  className="form-select"
                  popupClassName="pregnancy-form-dropdown"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Live/Still Birth Fields */}
          {showLiveBirthFields && (
            <div className="form-section">
              <p className="section-label">Delivery Details</p>
              <div className="form-grid">
                <div className="form-item">
                  <span className="form-label">Term Length</span>
                  <Radio.Group
                    value={termLength}
                    onChange={(e) => { setIsDirty(true); setTermLength(e.target.value); }}
                    className="form-radio-group"
                  >
                    <Radio.Button value="Term">Term</Radio.Button>
                    <Radio.Button value="Preterm">Preterm</Radio.Button>
                  </Radio.Group>
                </div>
                <div className="form-item">
                  <span className="form-label">Delivery Mode</span>
                  <Select
                    value={deliveryMode}
                    onChange={(val) => { setIsDirty(true); setDeliveryMode(val); }}
                    placeholder="Select"
                    options={DeliveryModeOptions}
                    className="form-select"
                    popupClassName="pregnancy-form-dropdown"
                    style={{ width: '100%' }}
                    allowClear
                  />
                </div>
              </div>

              <div className="form-item" style={{ marginTop: 12 }}>
                <span className="form-label">Birth Info Type</span>
                <Radio.Group
                  value={typeOfDelivery}
                  onChange={(e) => {
                    setIsDirty(true);
                    setTypeOfDelivery(e.target.value);
                    setDateOfDelivery(null);
                    setAgeOfDeliveryYears('');
                    setAgeOfDeliveryMonths('');
                  }}
                  className="form-radio-group"
                >
                  <Radio.Button value="date">Date of Delivery</Radio.Button>
                  <Radio.Button value="age">Age</Radio.Button>
                </Radio.Group>
              </div>

              {typeOfDelivery === 'date' && (
                <div className="form-item" style={{ marginTop: 12 }}>
                  <span className="form-label">Date of Delivery</span>
                  <DatePicker
                    value={dateOfDelivery ? dayjs(dateOfDelivery) : null}
                    onChange={(d) => { setIsDirty(true); setDateOfDelivery(d ? d.format('YYYY-MM-DD') : null); }}
                    format="DD-MM-YYYY"
                    placeholder="Select Date"
                    disabledDate={(current) => current && current > dayjs()}
                    style={{ width: '100%' }}
                    className="form-date-picker"
                  />
                </div>
              )}

              {typeOfDelivery === 'age' && (
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <div className="form-item">
                    <span className="form-label">Age (Years)</span>
                    <Input
                      value={ageOfDeliveryYears}
                      onChange={(e) => handleNumberInput(e.target.value, setAgeOfDeliveryYears, 150)}
                      placeholder="Years"
                      className="form-input"
                      suffix="Yr"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="form-item">
                    <span className="form-label">Age (Months)</span>
                    <Input
                      value={ageOfDeliveryMonths}
                      onChange={(e) => handleNumberInput(e.target.value, setAgeOfDeliveryMonths, 11)}
                      placeholder="Months"
                      className="form-input"
                      suffix="M"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              )}

              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="form-item">
                  <span className="form-label">Gender</span>
                  <Radio.Group
                    value={gender}
                    onChange={(e) => { setIsDirty(true); setGender(e.target.value); }}
                    className="form-radio-group"
                  >
                    <Radio.Button value="Male">Male</Radio.Button>
                    <Radio.Button value="Female">Female</Radio.Button>
                  </Radio.Group>
                </div>
                <div className="form-item">
                  <span className="form-label">Baby's Weight</span>
                  <Input
                    value={babysWeight}
                    onChange={(e) => handleDecimalInput(e.target.value, setBabysWeight)}
                    placeholder="Enter"
                    className="form-input"
                    suffix="kg"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ectopic/Miscarriage Fields */}
          {showEctopicFields && (
            <div className="form-section">
              <p className="section-label">
                {outcome === 'Ectopic' ? 'Ectopic Details' : 'Miscarriage Details'}
              </p>
              <div className="form-grid">
                <div className="form-item full-width gestation-period-field">
                  <span className="form-label">Period of Gestation</span>
                  <Input
                    value={gestationPeriod}
                    onChange={(e) => handleNumberInput(e.target.value, setGestationPeriod, 50)}
                    placeholder="Enter"
                    className="form-input gestation-period-input"
                    suffix="weeks"
                    inputMode="numeric"
                  />
                </div>

                {outcome === 'Ectopic' && (
                  <div className="form-item full-width">
                    <span className="form-label">Location</span>
                    <Select
                      value={location}
                      onChange={(val) => { setIsDirty(true); setLocation(val); }}
                      placeholder="Select"
                      options={EctopicLocationOptions}
                      className="form-select"
                      popupClassName="pregnancy-form-dropdown"
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </div>
                )}

                {outcome === 'Abortion' && (
                  <div className="form-item full-width">
                    <span className="form-label">Type of Miscarriage</span>
                    <Select
                      value={typeOfAbortion}
                      onChange={(val) => { setIsDirty(true); setTypeOfAbortion(val); }}
                      placeholder="Select"
                      options={MiscarriageTypeOptions}
                      className="form-select"
                      popupClassName="pregnancy-form-dropdown"
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </div>
                )}
              </div>

              <div className="form-item full-width" style={{ marginTop: 12 }}>
                <span className="form-label">
                  Mode of {outcome === 'Ectopic' ? 'Management' : 'Miscarriage'}
                </span>
                <Radio.Group
                  value={modeOfManagement}
                  onChange={(e) => { setIsDirty(true); setModeOfManagement(e.target.value); }}
                  className="form-radio-group"
                >
                  <Radio.Button value="Medical">Medical</Radio.Button>
                  <Radio.Button value="Surgical">Surgical</Radio.Button>
                </Radio.Group>
              </div>
            </div>
          )}

          {/* Remarks */}
          {outcome && (
            <div className="form-section">
              <p className="section-label">Note</p>
              <TextArea
                value={remarks}
                onChange={(e) => { setIsDirty(true); setRemarks(e.target.value); }}
                placeholder="Enter remarks"
                className="form-textarea"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mobile-pregnancy-footer">
          <Button
            type="primary"
            block
            className={`save-btn ${isCompletePregnancy ? 'complete-pregnancy-btn' : ''}`}
            onClick={isCompletePregnancy ? () => setCompleteConfirmModalVisible(true) : handleSave}
            loading={loading}
            disabled={!isFormValid}
          >
            {isCompletePregnancy 
              ? 'Complete Pregnancy' 
              : editIndex >= 0 
                ? 'Update' 
                : 'Save'}
          </Button>
        </div>
      </div>

      {/* Complete Pregnancy Confirmation Modal */}
      <Modal
        open={completeConfirmModalVisible}
        onCancel={() => setCompleteConfirmModalVisible(false)}
        footer={null}
        centered
        width={340}
        className="complete-pregnancy-modal"
        closable={false}
      >
        <div className="delete-modal-content">
          <div className="delete-modal-header">
            <h3>Complete Pregnancy</h3>
          </div>
          <div className="delete-modal-body">
            <div className="alert-warning-box">
              <img src={alertIcon} alt="Warning" className="alert-icon" />
              <span>
                Are you sure you want to complete this pregnancy? This will clear the current pregnancy data and move it to history.
              </span>
            </div>
          </div>
          <div className="delete-modal-footer">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setCompleteConfirmModalVisible(false)}
            >
              No, Keep Open
            </button>
            <Button
              type="primary"
              className="confirm-btn"
              onClick={() => {
                setCompleteConfirmModalVisible(false);
                handleSave();
              }}
              loading={loading}
            >
              Yes, Complete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        footer={null}
        centered
        width={320}
        className="delete-pregnancy-modal"
        closable={false}
      >
        <div className="delete-modal-content">
          <div className="delete-modal-header">
            <h3>Delete Pregnancy</h3>
          </div>
          <div className="delete-modal-body">
            <div className="alert-warning-box">
              <img src={alertIcon} alt="Warning" className="alert-icon" />
              <span>Are you sure you want to delete this past pregnancy record?</span>
            </div>
          </div>
          <div className="delete-modal-footer">
            <button
              type="button"
              className="yes-delete-btn"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <Button
              type="primary"
              className="no-keep-btn"
              onClick={() => setDeleteModalVisible(false)}
              disabled={loading}
            >
              No, Keep
            </Button>
          </div>
        </div>
      </Modal>

      {/* Discard Changes Modal */}
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
              <span>
                You have unsaved changes. Are you sure you want to discard them?
              </span>
            </div>
          </div>
          <div className="delete-modal-footer">
            <button
              type="button"
              className="yes-delete-btn"
              onClick={handleConfirmDiscard}
            >
              Discard Changes
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

export default MobilePastPregnancyEdit;
