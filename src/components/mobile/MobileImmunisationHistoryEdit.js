import React, { useState, useEffect, useCallback } from 'react';
import { Drawer, Button, Input, DatePicker, Select, Switch, message, Modal, AutoComplete } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import moment from 'moment';
import { addObstetricDetails, obstetricDetailsUpdated, patientDiagnosisUpdated } from '../../redux/obstetricSlice';
import { fetchSearchImmunisation } from '../../pages/obstetric/service';
import { mergeDefaultAndDoctorList } from '../../pages/obstetric/utils/helper';
import { errorMessage, removeBeforeWhiteSpace } from '../../utils/utils';

import './MobileImmunisationHistoryEdit.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;
const alertIcon = ASSETS.images.alerticon;

const { TextArea } = Input;

const StatusOptions = [
  { value: 'Due', label: 'Due' },
  { value: 'Given', label: 'Given' },
];

function MobileImmunisationHistoryEdit({
  visible,
  onClose,
  patient_data,
  onSave
}) {
  const dispatch = useDispatch();
  const { userId } = useSelector((state) => state.doctors);
  const { 
    obstetricDetails: allObstetricDetails,
    defaultImmunisation,
    immunisationDoctorList 
  } = useSelector((state) => state.obstetric);
  const obstetricDetails = allObstetricDetails?.currentPregnancy || {};
  const immunisationHistory = obstetricDetails?.immunisationHistory || [];

  const [loading, setLoading] = useState(false);
  const [immunisationData, setImmunisationData] = useState([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingItem, setEditingItem] = useState(null);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newVaccineName, setNewVaccineName] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedSearchItem, setSelectedSearchItem] = useState(null);

  // Data loss warning state
  const [isDirty, setIsDirty] = useState(false);
  const [discardChangesModalVisible, setDiscardChangesModalVisible] = useState(false);

  // Initial immunisation data when editor opens; restored to Redux on discard
  const [initialImmunisationData, setInitialImmunisationData] = useState([]);

  // Fetch search options
  const getSearchOptions = useCallback(async () => {
    if (!searchQuery || !patient_data?.patient_unique_id) return;
    
    setSearchLoading(true);
    try {
      const searchOptionsRes = await fetchSearchImmunisation(
        searchQuery,
        patient_data.patient_unique_id
      );
      
      const data = [];
      searchOptionsRes?.forEach((e) => {
        data.push({
          value: e.id,
          label: e.name,
          payload: e,
        });
      });
      
      // Add custom option
      if (searchQuery) {
        data.push({
          value: `custom-${searchQuery}`,
          label: `+ Add "${searchQuery}" as custom vaccine`,
          isCustom: true,
          payload: { name: searchQuery, isCustom: true },
        });
      }
      
      setSearchOptions(data);
    } catch (error) {
      // Silently fail - search options will be empty
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, patient_data?.patient_unique_id]);

  // Debounced search
  useEffect(() => {
    if (searchQuery) {
      const timeOutId = setTimeout(() => {
        getSearchOptions();
      }, 500);
      return () => clearTimeout(timeOutId);
    } else {
      setSearchOptions([]);
    }
  }, [searchQuery, getSearchOptions]);

  // Handle search
  const onSearch = useCallback((query) => {
    setSearchQuery(removeBeforeWhiteSpace ? removeBeforeWhiteSpace(query) : query.trim());
  }, []);

  // Handle search select
  const onSearchSelect = (_value, option) => {
    const selected = option?.payload;
    if (!selected?.name) {
      errorMessage('Invalid vaccine selection');
      return;
    }
    setSelectedSearchItem(selected);
    setNewVaccineName(selected.name);
    setSearchQuery('');
    setAddModalVisible(true);
  };

  // Initialize data - merge defaults with existing data
  // Re-run when defaults are loaded (they might load after drawer opens)
  useEffect(() => {
    if (visible) {
      // Merge defaults with existing Immunisation history
      let mergedImmunisationHistory = immunisationHistory;
      
      if (defaultImmunisation?.length > 0 || immunisationDoctorList?.length > 0) {
        mergedImmunisationHistory = mergeDefaultAndDoctorList(
          immunisationHistory,
          defaultImmunisation || [],
          immunisationDoctorList || [],
          userId,
          false // isAncScheduler = false for immunisation
        );
        
        // Update Redux with merged data
        const payload = {
          ...allObstetricDetails,
          currentPregnancy: {
            ...obstetricDetails,
            patientId: patient_data?.patient_unique_id,
            immunisationHistory: mergedImmunisationHistory,
            examinationHistory: obstetricDetails?.examinationHistory || [],
            ancHistory: obstetricDetails?.ancHistory || [],
          },
        };
        dispatch(addObstetricDetails(payload));
      }
      
      const seededImmunisationHistory = [...mergedImmunisationHistory];
      setImmunisationData(seededImmunisationHistory);
      setInitialImmunisationData(seededImmunisationHistory);
    }
  }, [visible, defaultImmunisation, immunisationDoctorList]);

  // Disabled date - can't select future dates
  const disabledDate = (current) => {
    return current && current > dayjs().endOf('day');
  };

  // Handle field change for an immunisation item
  const handleFieldChange = (index, field, value) => {
    setIsDirty(true);
    
    const updatedData = [...immunisationData];
    updatedData[index] = {
      ...updatedData[index],
      [field]: value,
      modifiedAt: new Date().toISOString(),
      modifiedBy: userId,
    };
    
    // Auto-enable print when editing (except for enablePrint itself)
    if (field !== 'enablePrint') {
      updatedData[index].enablePrint = true;
    }

    // Auto-set status to "Given" when date is selected
    if (field === 'givenDate' && value) {
      updatedData[index].status = 'Given';
    }
    
    setImmunisationData(updatedData);

    // Save to Redux with all required fields
    const payload = {
      ...allObstetricDetails,
      currentPregnancy: {
        ...obstetricDetails,
        patientId: patient_data?.patient_unique_id,
        examinationHistory: obstetricDetails?.examinationHistory || [],
        ancHistory: obstetricDetails?.ancHistory || [],
        immunisationHistory: updatedData,
      },
    };
    
    dispatch(addObstetricDetails(payload));
    dispatch(obstetricDetailsUpdated());
    dispatch(patientDiagnosisUpdated());
  };

  // Step-wise save: update Redux only; API call happens on main Obstetric History Save
  const saveToRedux = (payload) => {
    dispatch(addObstetricDetails(payload));
    dispatch(obstetricDetailsUpdated());
    dispatch(patientDiagnosisUpdated());
    message.success('Immunisation history updated');
    if (onSave) onSave(payload.currentPregnancy);
  };

  // Delete an item
  const handleDelete = async () => {
    if (!patient_data?.patient_unique_id) {
      errorMessage('Patient information is missing');
      return;
    }
    if (editingIndex >= 0) {
      setLoading(true);
      setIsDirty(true);
      
      try {
        const updatedData = [...immunisationData];
        updatedData.splice(editingIndex, 1);
        
        setImmunisationData(updatedData);
        
        const payload = {
          ...allObstetricDetails,
          currentPregnancy: {
            ...obstetricDetails,
            patientId: patient_data.patient_unique_id,
            examinationHistory: obstetricDetails?.examinationHistory || [],
            ancHistory: obstetricDetails?.ancHistory || [],
            immunisationHistory: updatedData,
          },
        };
        
        dispatch(addObstetricDetails(payload));
        dispatch(obstetricDetailsUpdated());
        dispatch(patientDiagnosisUpdated());
        message.success('Vaccine removed');
      } catch (error) {
        errorMessage('Error removing vaccine');
      } finally {
        setLoading(false);
        setDeleteModalVisible(false);
        setEditingIndex(-1);
        setEditingItem(null);
      }
    }
  };

  // Add new vaccine
  const handleAddVaccine = async () => {
    if (!patient_data?.patient_unique_id) {
      errorMessage('Patient information is missing');
      return;
    }
    if (!newVaccineName.trim()) {
      errorMessage('Please enter vaccine name');
      return;
    }

    setLoading(true);
    setIsDirty(true);

    try {
      const masterId = selectedSearchItem?.id ?? selectedSearchItem?.masterId;
      const newVaccine = {
        ...(masterId ? { masterId } : {}),
        master: {
          name: newVaccineName.trim(),
          default: false,
        },
        status: 'Due',
        enablePrint: true,
        createdAt: new Date().toISOString(),
        createdBy: userId,
        modifiedAt: new Date().toISOString(),
        modifiedBy: userId,
      };

      const updatedData = [...immunisationData, newVaccine];

      const payload = {
        ...allObstetricDetails,
        currentPregnancy: {
          ...obstetricDetails,
          patientId: patient_data.patient_unique_id,
          examinationHistory: obstetricDetails?.examinationHistory || [],
          ancHistory: obstetricDetails?.ancHistory || [],
          immunisationHistory: updatedData,
        },
      };

      dispatch(addObstetricDetails(payload));
      dispatch(obstetricDetailsUpdated());
      dispatch(patientDiagnosisUpdated());
      setImmunisationData(updatedData);
      message.success('Vaccine added');
      setAddModalVisible(false);
      setNewVaccineName('');
      setSelectedSearchItem(null);
    } catch (error) {
      errorMessage('Error adding vaccine');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setDiscardChangesModalVisible(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    const revertedData = [...initialImmunisationData];
    setImmunisationData(revertedData);
    dispatch(addObstetricDetails({
      ...allObstetricDetails,
      currentPregnancy: {
        ...obstetricDetails,
        patientId: patient_data?.patient_unique_id,
        examinationHistory: obstetricDetails?.examinationHistory || [],
        ancHistory: obstetricDetails?.ancHistory || [],
        immunisationHistory: revertedData,
      },
    }));
    setDiscardChangesModalVisible(false);
    setIsDirty(false);
    onClose();
  };

  // Count given vaccines
  const givenCount = immunisationData.filter(v => v.status === 'Given').length;

  return (
    <Drawer
      placement="bottom"
      open={visible}
      onClose={handleClose}
      closable={false}
      height="90vh"
      className="mobile-immunisation-history-edit"
      destroyOnClose
    >
      <div className="mobile-immunisation-content">
        {/* Header */}
        <div className="mobile-immunisation-header">
          <h2 className="mobile-immunisation-title">Immunisation History</h2>
          <button className="mobile-immunisation-close" onClick={handleClose}>
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="immunisation-summary-bar">
          <span className="total-count">{immunisationData.length} vaccines</span>
          <span className="given-count">{givenCount} given</span>
        </div>

        {/* Body */}
        <div className="mobile-immunisation-body">
          {/* Search & Add Vaccine */}
          <div className="search-add-container">
            <AutoComplete
              value={searchQuery}
              onSearch={onSearch}
              options={searchOptions.map(opt => ({
                ...opt,
                label: (
                  <div className={`search-option ${opt.isCustom ? 'custom-option' : ''}`}>
                    {opt.label}
                  </div>
                )
              }))}
              onSelect={onSearchSelect}
              className="vaccine-search-autocomplete"
            >
              <Input
                prefix={<i className="icon-search" style={{ color: '#9CA3AF' }} />}
                placeholder="Search & add new vaccine..."
                className="search-input"
              />
            </AutoComplete>
          </div>

          {/* Vaccines List */}
          {immunisationData.length > 0 ? (
            <div className="vaccines-list">
              {immunisationData.map((item, index) => (
                <div key={index} className={`vaccine-card ${item.status === 'Given' ? 'given' : ''}`}>
                  <div className="vaccine-card-header">
                    <div className="vaccine-info">
                      <span className="vaccine-name">{item.master?.name || 'Unknown Vaccine'}</span>
                      {item.master?.default && (
                        <span className="default-badge">Default</span>
                      )}
                    </div>
                    <div className="vaccine-actions">
                      {!item.master?.default && (
                        <button
                          type="button"
                          className="delete-vaccine-btn"
                          onClick={() => {
                            setEditingIndex(index);
                            setEditingItem(item);
                            setDeleteModalVisible(true);
                          }}
                        >
                          <i className="icon-delete" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="vaccine-card-body">
                    <div className="vaccine-field">
                      <span className="field-label">Status</span>
                      <Select
                        value={item.status || 'Due'}
                        onChange={(value) => handleFieldChange(index, 'status', value)}
                        options={StatusOptions}
                        className={`field-select ${item.status === 'Given' ? 'given' : ''}`}
                      />
                    </div>

                    <div className="vaccine-field">
                      <span className="field-label">Given Date</span>
                      <DatePicker
                        value={item.givenDate ? dayjs(item.givenDate) : null}
                        onChange={(date) => handleFieldChange(index, 'givenDate', date?.toISOString())}
                        format="DD-MM-YYYY"
                        placeholder="Select date"
                        className="field-date-picker"
                        disabledDate={disabledDate}
                      />
                    </div>

                    <div className="vaccine-field full-width">
                      <span className="field-label">Notes</span>
                      <TextArea
                        value={item.notes || ''}
                        onChange={(e) => handleFieldChange(index, 'notes', e.target.value)}
                        placeholder="Add notes..."
                        rows={2}
                        className="field-textarea"
                      />
                    </div>

                    <div className="vaccine-field print-field">
                      <span className="field-label">Show in Rx Print</span>
                      <Switch
                        checked={item.enablePrint}
                        onChange={(checked) => handleFieldChange(index, 'enablePrint', checked)}
                        size="small"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No vaccines recorded yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mobile-immunisation-footer">
          <Button
            type="primary"
            block
            className="save-btn"
            onClick={async () => {
              if (!patient_data?.patient_unique_id) {
                errorMessage('Patient information is missing');
                return;
              }
              const payload = {
                ...allObstetricDetails,
                currentPregnancy: {
                  ...obstetricDetails,
                  patientId: patient_data.patient_unique_id,
                  examinationHistory: obstetricDetails?.examinationHistory || [],
                  ancHistory: obstetricDetails?.ancHistory || [],
                  immunisationHistory: immunisationData,
                },
              };
              saveToRedux(payload);
              setIsDirty(false);
              onClose();
            }}
            loading={loading}
          >
            Save & Close
          </Button>
        </div>
      </div>

      {/* Add Vaccine Modal */}
      <Modal
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          setNewVaccineName('');
          setSelectedSearchItem(null);
        }}
        footer={null}
        centered
        width={340}
        className="add-vaccine-modal"
        closable={false}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3>{selectedSearchItem && !selectedSearchItem.isCustom ? 'Add Vaccine' : 'Add Custom Vaccine'}</h3>
          </div>
          <div className="modal-body">
            <div className="modal-field">
              <label>Vaccine Name</label>
              <Input
                value={newVaccineName}
                onChange={(e) => setNewVaccineName(e.target.value)}
                placeholder="Enter vaccine name"
                disabled={selectedSearchItem && !selectedSearchItem.isCustom}
              />
            </div>
          </div>
          <div className="modal-footer">
            <Button onClick={() => {
              setAddModalVisible(false);
              setNewVaccineName('');
              setSelectedSearchItem(null);
            }}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleAddVaccine}
              loading={loading}
              disabled={!newVaccineName.trim()}
            >
              Add Vaccine
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
        className="delete-vaccine-modal"
        closable={false}
      >
        <div className="delete-modal-content">
          <div className="delete-modal-header">
            <h3>Remove Vaccine</h3>
          </div>
          <div className="delete-modal-body">
            <div className="alert-warning-box">
              <img src={alertIcon} alt="Warning" className="alert-icon" />
              <span>
                Are you sure you want to remove "{editingItem?.master?.name}" from the list?
              </span>
            </div>
          </div>
          <div className="delete-modal-footer">
            <button
              type="button"
              className="yes-delete-btn"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Removing...' : 'Yes, Remove'}
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

export default MobileImmunisationHistoryEdit;
