import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Drawer, Button, Input, DatePicker, Select, Switch, message, Modal, AutoComplete } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import moment from 'moment';
import { addObstetricDetails, obstetricDetailsUpdated, patientDiagnosisUpdated } from '../../redux/obstetricSlice';
import { fetchSearchAnc } from '../../pages/obstetric/service';
import { mergeDefaultAndDoctorList } from '../../pages/obstetric/utils/helper';
import { errorMessage, removeBeforeWhiteSpace } from '../../utils/utils';

import MobileAncPrintPreview from './MobileAncPrintPreview';
import './MobileAncSchedulerEdit.scss';
import './MobileAncPrintPreview.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;
const alertIcon = ASSETS.images.alerticon;
const printIcon = ASSETS.mobile.print;

const { TextArea } = Input;

const StatusOptions = [
  { value: 'Due', label: 'Due' },
  { value: 'Completed', label: 'Completed' },
];

const TrimesterLabels = ['1st Trimester', '2nd Trimester', '3rd Trimester'];

const splitByTrimester = (ancHistory) => {
  const trimesters = [[], [], []];
  
  ancHistory?.forEach((item) => {
    const weekStart = item?.weekRange?.start || 0;
    if (weekStart <= 12) {
      trimesters[0].push(item);
    } else if (weekStart <= 27) {
      trimesters[1].push(item);
    } else {
      trimesters[2].push(item);
    }
  });
  
  return trimesters;
};

function MobileAncSchedulerEdit({
  visible,
  onClose,
  patient_data,
  onSave,
  onOpenMedicalRecords = null, // Callback to open medical records section
}) {
  const dispatch = useDispatch();
  const { userId } = useSelector((state) => state.doctors);
  const { 
    obstetricDetails: allObstetricDetails,
    defaultAncSchedule,
    ancDoctorList 
  } = useSelector((state) => state.obstetric);
  const obstetricDetails = allObstetricDetails?.currentPregnancy || {};
  const ancHistory = obstetricDetails?.ancHistory || [];

  // Refs for Redux-derived objects so the init effect can read latest without
  // depending on them (new refs every update would cause loops).
  const allObstetricDetailsRef = useRef(allObstetricDetails);
  const obstetricDetailsRef = useRef(obstetricDetails);
  allObstetricDetailsRef.current = allObstetricDetails;
  obstetricDetailsRef.current = obstetricDetails;

  // State
  const [loading, setLoading] = useState(false);
  const [activeTrimester, setActiveTrimester] = useState(0);
  const [ancData, setAncData] = useState([[], [], []]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingItem, setEditingItem] = useState(null);

  // Add new test state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newWeekStart, setNewWeekStart] = useState('');
  const [newWeekEnd, setNewWeekEnd] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedSearchItem, setSelectedSearchItem] = useState(null);

  // Data loss warning state
  const [isDirty, setIsDirty] = useState(false);
  const [discardChangesModalVisible, setDiscardChangesModalVisible] = useState(false);

  // Initial ANC history when editor opens; restored to Redux on discard
  const [initialAncHistory, setInitialAncHistory] = useState([]);

  // Print preview state
  const [printPreviewVisible, setPrintPreviewVisible] = useState(false);

  // Fetch search options
  const getSearchOptions = useCallback(async () => {
    if (!searchQuery || !patient_data?.patient_unique_id) return;
    
    setSearchLoading(true);
    try {
      const searchOptionsRes = await fetchSearchAnc(
        searchQuery,
        patient_data.patient_unique_id
      );
      
      const data = [];
      searchOptionsRes?.forEach((e) => {
        data.push({
          key: JSON.stringify({ ...e }),
          value: e.id,
          label: e.name,
        });
      });
      
      // Add custom option
      if (searchQuery) {
        data.push({
          key: JSON.stringify({ name: searchQuery, isCustom: true }),
          value: `custom-${searchQuery}`,
          label: `+ Add "${searchQuery}" as custom test`,
          isCustom: true,
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
  const onSearchSelect = (value, option) => {
    const key = option.key && JSON.parse(option.key);
    setSelectedSearchItem(key);
    setNewTestName(key.name || '');
    setSearchQuery('');
    setAddModalVisible(true);
  };

  // Initialize data - merge defaults with existing data
  // Re-run when defaults are loaded (they might load after drawer opens)
  useEffect(() => {
    if (visible) {
      // Merge defaults with existing ANC history
      let mergedAncHistory = ancHistory;
      
      if (defaultAncSchedule?.length > 0 || ancDoctorList?.length > 0) {
        mergedAncHistory = mergeDefaultAndDoctorList(
          ancHistory,
          defaultAncSchedule || [],
          ancDoctorList || [],
          userId,
          true // isAncScheduler = true
        );
        
        // Sort by week range
        mergedAncHistory = mergedAncHistory.sort((a, b) => {
          if (a.weekRange?.start === b.weekRange?.start) {
            return (a.weekRange?.end || 0) - (b.weekRange?.end || 0);
          }
          return (a.weekRange?.start || 0) - (b.weekRange?.start || 0);
        });
        
        // Update Redux with merged data (use refs for latest Redux state)
        const latestAll = allObstetricDetailsRef.current;
        const latestOb = obstetricDetailsRef.current || {};
        const payload = {
          ...latestAll,
          currentPregnancy: {
            ...latestOb,
            patientId: patient_data?.patient_unique_id,
            ancHistory: mergedAncHistory,
            examinationHistory: latestOb?.examinationHistory || [],
            immunisationHistory: latestOb?.immunisationHistory || [],
          },
        };
        dispatch(addObstetricDetails(payload));
      }
      
      // Set data for display and store initial for discard
      const seededAncHistory = [...mergedAncHistory];
      setAncData(splitByTrimester(seededAncHistory));
      setInitialAncHistory(seededAncHistory);
      
      // Set active trimester based on gestation (use ref for latest)
      const latestOb = obstetricDetailsRef.current || {};
      if (latestOb?.lmp) {
        const today = moment();
        const lmp = moment(latestOb.lmp);
        const gestationInWeeks = today.diff(lmp, 'weeks');
        if (gestationInWeeks >= 28 && gestationInWeeks <= 40) {
          setActiveTrimester(2);
        } else if (gestationInWeeks >= 13 && gestationInWeeks <= 27) {
          setActiveTrimester(1);
        } else {
          setActiveTrimester(0);
        }
      }
    }
  // ancHistory changes when Redux state updates; include a stable serialization
  // so the merge reflects latest server data without re-running when our own
  // dispatch only changes the reference. allObstetricDetails/obstetricDetails
  // are read via refs to avoid infinite loops from new object refs.
  // userId and patient_data?.patient_unique_id can change (e.g. user/patient switch).
  }, [visible, defaultAncSchedule, ancDoctorList, JSON.stringify(ancHistory), userId, patient_data?.patient_unique_id]);

  // Get current trimester data
  const currentTrimesterData = useMemo(() => {
    return ancData[activeTrimester] || [];
  }, [ancData, activeTrimester]);

  // Handle field change for an ANC item
  const handleFieldChange = async (index, field, value) => {
    setIsDirty(true);
    
    // Update local state
    const updatedData = [...ancData];
    updatedData[activeTrimester] = [...updatedData[activeTrimester]];
    updatedData[activeTrimester][index] = {
      ...updatedData[activeTrimester][index],
      [field]: value,
      modifiedAt: new Date().toISOString(),
      modifiedBy: userId,
    };
    
    // Auto-enable print when editing (except for enablePrint itself)
    if (field !== 'enablePrint') {
      updatedData[activeTrimester][index].enablePrint = true;
    }
    
    setAncData(updatedData);

    // Save to Redux with all required fields
    const newAncHistory = updatedData.flat();
    const payload = {
      ...allObstetricDetails,
      currentPregnancy: {
        ...obstetricDetails,
        patientId: patient_data?.patient_unique_id,
        examinationHistory: obstetricDetails?.examinationHistory || [],
        ancHistory: newAncHistory,
        immunisationHistory: obstetricDetails?.immunisationHistory || [],
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
    message.success('ANC Schedule updated');
    if (onSave) onSave(payload.currentPregnancy);
  };

  // Open edit modal for an item
  const openEditModal = (index) => {
    const item = currentTrimesterData[index];
    setEditingIndex(index);
    setEditingItem({ ...item });
    setEditModalVisible(true);
  };

  // Save edited item
  const handleEditSave = () => {
    if (editingIndex >= 0 && editingItem) {
      const updatedData = [...ancData];
      updatedData[activeTrimester] = [...updatedData[activeTrimester]];
      updatedData[activeTrimester][editingIndex] = {
        ...editingItem,
        modifiedAt: new Date().toISOString(),
        modifiedBy: userId,
      };
      
      setAncData(updatedData);
      
      // Save to Redux
      const newAncHistory = updatedData.flat();
      const payload = {
        ...allObstetricDetails,
        currentPregnancy: {
          ...obstetricDetails,
          ancHistory: newAncHistory,
        },
      };
      
      dispatch(addObstetricDetails(payload));
      dispatch(obstetricDetailsUpdated());
      dispatch(patientDiagnosisUpdated());
      
      setEditModalVisible(false);
      setEditingIndex(-1);
      setEditingItem(null);
    }
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
        const updatedData = [...ancData];
        updatedData[activeTrimester] = [...updatedData[activeTrimester]];
        updatedData[activeTrimester].splice(editingIndex, 1);
        
        setAncData(updatedData);
        
        const newAncHistory = updatedData.flat();
        const payload = {
          ...allObstetricDetails,
          currentPregnancy: {
            ...obstetricDetails,
            patientId: patient_data.patient_unique_id,
            examinationHistory: obstetricDetails?.examinationHistory || [],
            ancHistory: newAncHistory,
            immunisationHistory: obstetricDetails?.immunisationHistory || [],
          },
        };
        
        dispatch(addObstetricDetails(payload));
        dispatch(obstetricDetailsUpdated());
        dispatch(patientDiagnosisUpdated());
        message.success('Test removed');
      } catch (error) {
        errorMessage('Error removing test');
      } finally {
        setLoading(false);
        setDeleteModalVisible(false);
        setEditingIndex(-1);
        setEditingItem(null);
      }
    }
  };

  // Add new test
  const handleAddTest = async () => {
    if (!patient_data?.patient_unique_id) {
      errorMessage('Patient information is missing');
      return;
    }
    if (!newTestName || !newWeekStart || !newWeekEnd) {
      errorMessage('Please fill all fields');
      return;
    }

    setLoading(true);
    setIsDirty(true);

    try {
      const newTest = {
        masterId: selectedSearchItem && !selectedSearchItem.isCustom
          ? selectedSearchItem.id
          : undefined,
        master: {
          name: newTestName,
          default: false,
        },
        weekRange: {
          start: parseInt(newWeekStart),
          end: parseInt(newWeekEnd),
        },
        status: 'Due',
        enablePrint: true,
        createdAt: new Date().toISOString(),
        createdBy: userId,
        modifiedAt: new Date().toISOString(),
        modifiedBy: userId,
      };

      const newAncHistory = [...ancHistory, newTest].sort((a, b) => {
        if (a.weekRange.start === b.weekRange.start) {
          return a.weekRange.end - b.weekRange.end;
        }
        return a.weekRange.start - b.weekRange.start;
      });

      const payload = {
        ...allObstetricDetails,
        currentPregnancy: {
          ...obstetricDetails,
          patientId: patient_data.patient_unique_id,
          examinationHistory: obstetricDetails?.examinationHistory || [],
          ancHistory: newAncHistory,
          immunisationHistory: obstetricDetails?.immunisationHistory || [],
        },
      };

      dispatch(addObstetricDetails(payload));
      dispatch(obstetricDetailsUpdated());
      dispatch(patientDiagnosisUpdated());
      setAncData(splitByTrimester(newAncHistory));
      message.success('Test added');
      setAddModalVisible(false);
      setNewTestName('');
      setNewWeekStart('');
      setNewWeekEnd('');
    } catch (error) {
      errorMessage('Error adding test');
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
    const revertedAncHistory = [...initialAncHistory];
    setAncData(splitByTrimester(revertedAncHistory));
    dispatch(addObstetricDetails({
      ...allObstetricDetails,
      currentPregnancy: {
        ...obstetricDetails,
        patientId: patient_data?.patient_unique_id,
        examinationHistory: obstetricDetails?.examinationHistory || [],
        ancHistory: revertedAncHistory,
        immunisationHistory: obstetricDetails?.immunisationHistory || [],
      },
    }));
    setDiscardChangesModalVisible(false);
    setIsDirty(false);
    onClose();
  };

  return (
    <Drawer
      placement="bottom"
      open={visible}
      onClose={handleClose}
      closable={false}
      height="90vh"
      className="mobile-anc-scheduler-edit"
      destroyOnClose
    >
      <div className="mobile-anc-content">
        {/* Header */}
        <div className="mobile-anc-header">
          <h2 className="mobile-anc-title">ANC Scheduler</h2>
          <div className="header-actions">
            <button 
              className="print-btn" 
              onClick={() => setPrintPreviewVisible(true)}
              title="Print ANC Scheduler"
            >
              <img src={printIcon} alt="Print" />
            </button>
            <button className="mobile-anc-close" onClick={handleClose}>
              <img src={closeIcon} alt="Close" />
            </button>
          </div>
        </div>

        {/* Trimester Tabs */}
        <div className="trimester-tabs">
          {TrimesterLabels.map((label, index) => (
            <button
              key={index}
              className={`trimester-tab ${activeTrimester === index ? 'active' : ''}`}
              onClick={() => setActiveTrimester(index)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="mobile-anc-body">
          {/* Search & Add Test */}
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
              className="test-search-autocomplete"
            >
              <Input
                prefix={<i className="icon-search" style={{ color: '#9CA3AF' }} />}
                placeholder="Search & add new test..."
                className="search-input"
              />
            </AutoComplete>
          </div>

          {/* ANC Tests List */}
          {currentTrimesterData.length > 0 ? (
            <div className="anc-tests-list">
              {currentTrimesterData.map((item, index) => (
                <div key={index} className="anc-test-card">
                  <div className="test-card-header">
                    <div className="test-info">
                      <span className="test-name">{item.master?.name || 'Unknown Test'}</span>
                      <span className="test-weeks">
                        {item.weekRange?.start} - {item.weekRange?.end} weeks
                      </span>
                    </div>
                    <div className="test-actions">
                      {!item.master?.default && (
                        <button
                          type="button"
                          className="delete-test-btn"
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

                  <div className="test-card-body">
                    {/* Week Range Editing - Only for custom tests */}
                    {!item.master?.default && (
                      <div className="test-field-row">
                        <div className="test-field">
                          <span className="field-label">Week Start</span>
                          <Input
                            value={item.weekRange?.start || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              if (parseInt(val) <= 42 || val === '') {
                                handleFieldChange(index, 'weekRange', {
                                  ...item.weekRange,
                                  start: val ? parseInt(val) : null
                                });
                              }
                            }}
                            placeholder="0"
                            className="field-input week-input"
                            suffix="wk"
                            inputMode="numeric"
                            maxLength={2}
                          />
                        </div>
                        <div className="test-field">
                          <span className="field-label">Week End</span>
                          <Input
                            value={item.weekRange?.end || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              if (parseInt(val) <= 42 || val === '') {
                                handleFieldChange(index, 'weekRange', {
                                  ...item.weekRange,
                                  end: val ? parseInt(val) : null
                                });
                              }
                            }}
                            placeholder="0"
                            className="field-input week-input"
                            suffix="wk"
                            inputMode="numeric"
                            maxLength={2}
                          />
                        </div>
                      </div>
                    )}

                    <div className="test-field">
                      <span className="field-label">Due Date</span>
                      <DatePicker
                        value={item.dueDate ? dayjs(item.dueDate) : null}
                        onChange={(date) => handleFieldChange(index, 'dueDate', date?.toISOString())}
                        format="DD-MM-YYYY"
                        placeholder="Select date"
                        className="field-date-picker"
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                      />
                    </div>

                    <div className="test-field">
                      <span className="field-label">Status</span>
                      <Select
                        value={item.status || 'Due'}
                        onChange={(value) => handleFieldChange(index, 'status', value)}
                        options={StatusOptions}
                        className={`field-select ${item.status === 'Completed' ? 'completed' : ''}`}
                      />
                    </div>

                    <div className="test-field full-width">
                      <span className="field-label">Notes</span>
                      <TextArea
                        value={item.notes || ''}
                        onChange={(e) => handleFieldChange(index, 'notes', e.target.value)}
                        placeholder="Add notes..."
                        rows={2}
                        className="field-textarea"
                      />
                    </div>

                    <div className="test-field print-field">
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
              <p>No tests scheduled for this trimester</p>
            </div>
          )}
        </div>

        {/* Medical Records Link */}
        {onOpenMedicalRecords && (
          <div className="medical-records-link-section">
            <span className="link-text">View Uploaded Test Reports Here: </span>
            <span 
              className="medical-records-link"
              onClick={() => {
                onOpenMedicalRecords();
              }}
            >
              Medical Records
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="mobile-anc-footer">
          <Button
            type="primary"
            block
            className="save-btn"
            onClick={async () => {
              const payload = {
                ...allObstetricDetails,
                currentPregnancy: {
                  ...obstetricDetails,
                  patientId: patient_data.patient_unique_id,
                  examinationHistory: obstetricDetails?.examinationHistory || [],
                  ancHistory: ancData.flat(),
                  immunisationHistory: obstetricDetails?.immunisationHistory || [],
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

      {/* Add Test Modal */}
      <Modal
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          setNewTestName('');
          setNewWeekStart('');
          setNewWeekEnd('');
          setSelectedSearchItem(null);
        }}
        footer={null}
        centered
        width={340}
        className="add-test-modal"
        closable={false}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3>{selectedSearchItem && !selectedSearchItem.isCustom ? 'Add Test' : 'Add Custom Test'}</h3>
          </div>
          <div className="modal-body">
            <div className="modal-field">
              <label>Test Name</label>
              <Input
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                placeholder="Enter test name"
                disabled={selectedSearchItem && !selectedSearchItem.isCustom}
              />
            </div>
            <div className="modal-field-row">
              <div className="modal-field">
                <label>Week Start</label>
                <Input
                  value={newWeekStart}
                  onChange={(e) => setNewWeekStart(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 12"
                  inputMode="numeric"
                />
              </div>
              <div className="modal-field">
                <label>Week End</label>
                <Input
                  value={newWeekEnd}
                  onChange={(e) => setNewWeekEnd(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 16"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <Button onClick={() => {
              setAddModalVisible(false);
              setNewTestName('');
              setNewWeekStart('');
              setNewWeekEnd('');
              setSelectedSearchItem(null);
            }}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleAddTest}
              loading={loading}
              disabled={!newTestName || !newWeekStart || !newWeekEnd}
            >
              Add Test
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
        className="delete-test-modal"
        closable={false}
      >
        <div className="delete-modal-content">
          <div className="delete-modal-header">
            <h3>Remove Test</h3>
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

      {/* Print Preview Modal */}
      <MobileAncPrintPreview
        visible={printPreviewVisible}
        onClose={() => setPrintPreviewVisible(false)}
        ancSchedulerData={ancData}
      />
    </Drawer>
  );
}

export default MobileAncSchedulerEdit;
