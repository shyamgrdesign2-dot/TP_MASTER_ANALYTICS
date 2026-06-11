import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AutoComplete, Input, Button, Drawer, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

import { searchMedication, getFrequentlySearchedMedication } from '../../redux/medicationSlice';
import { showMedicineTime, showMedicineFrequency } from '../../redux/doctorsSlice';
import { removeBeforeWhiteSpace, onlyNumberFormat, onlyDecimalFormat, frequencyFormat, frequencyCombination } from '../../utils/utils';
import { EXTRA_OPTIONS } from '../../utils/constants';
import ApiMedication from '../../api/services/ApiMedication';
import AddCustomMedicineSheet from './AddCustomMedicineSheet';
import './MedicationEditSheet.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

const DURATION_UNITS = [
  { value: 'Day(s)', label: 'Days' },
  { value: 'Week(s)', label: 'Weeks' },
  { value: 'Month(s)', label: 'Months' },
  { value: 'Year(s)', label: 'Years' },
];

// Default unit options for Unit Per Dose (match web MedicationsTable)
const DEFAULT_UNIT_OPTIONS = [
  { tmu_id: 1, tmu_title: 'Tablet' },
  { tmu_id: 2, tmu_title: 'Tablets' },
  { tmu_id: 3, tmu_title: 'units' },
  { tmu_id: 4, tmu_title: 'unit' },
  { tmu_id: 5, tmu_title: 'ml' },
  { tmu_id: 6, tmu_title: 'mg' },
  { tmu_id: 7, tmu_title: 'g' },
  { tmu_id: 8, tmu_title: 'capsule' },
  { tmu_id: 9, tmu_title: 'capsules' },
];

/**
 * Bottom sheet for Add / Edit Medication. UX matches LabInvestigationEditSheet.
 * Functionality matches web MedicationsTable: searchMedication, getFrequentlySearchedMedication;
 * item shape: id, name, lineItem, dosage, frequency, schedule, duration, quantity, notes, metadata.
 */
function MedicationEditSheet({ visible, onClose, item, prefillName, prefillMetadata, onSave }) {
  const dispatch = useDispatch();
  const { parentOptionsList = [] } = useSelector((state) => state.medication);
  const { timingList = [], frequencyList = [] } = useSelector((state) => state.doctors);
  const debounceRef = useRef(null);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [schedule, setSchedule] = useState(undefined);
  const [duration, setDuration] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [options, setOptions] = useState([]);
  const [frequencyOptions, setFrequencyOptions] = useState([]);
  const [durationOptions, setDurationOptions] = useState(
    EXTRA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
  );
  const [unitPerDoseOptions, setUnitPerDoseOptions] = useState([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [addCustomInitialName, setAddCustomInitialName] = useState('');
  const quantityCalcRef = useRef(null);

  const isAdd = !item;

  // Calculate quantity in sheet when name + duration (and optionally frequency) are present
  useEffect(() => {
    if (!visible) return;
    const medicineName = (name || '').trim();
    const durationStr = (duration || '').trim();
    if (!medicineName || !durationStr) return;

    if (quantityCalcRef.current) clearTimeout(quantityCalcRef.current);
    quantityCalcRef.current = setTimeout(async () => {
      try {
        const payload = {
          name: medicineName,
          dosage: (dosage || '').trim(),
          frequency: (frequency || '').trim(),
          schedule: schedule || '',
          duration: durationStr,
          quantity: 0,
          notes: (notes || '').trim(),
          ...(selectedMedication && { metadata: selectedMedication }),
        };
        const res = await ApiMedication.getQuantity({ medicines: [payload] });
        const medicines = res?.medicines || res?.data?.medicines;
        const calculated = medicines?.[0]?.quantity;
        if (calculated != null && Number.isFinite(Number(calculated))) {
          setQuantity(String(Number(calculated)));
        }
      } catch {
        // keep current quantity
      }
      quantityCalcRef.current = null;
    }, 600);
    return () => {
      if (quantityCalcRef.current) clearTimeout(quantityCalcRef.current);
    };
  }, [visible, name, dosage, frequency, schedule, duration, selectedMedication]);

  // Sync form from item (Edit) or prefill (Add) or reset (Add empty)
  useEffect(() => {
    if (!visible) return;
    if (item) {
      setName(item?.name || item?.lineItem || '');
      setDosage(item?.dosage || '');
      setFrequency(item?.frequency || '');
      setSchedule(item?.schedule && item.schedule !== 'None' ? item.schedule : undefined);
      setDuration((item?.duration || '').toString());
      setQuantity((item?.quantity != null && item?.quantity !== '') ? String(item.quantity) : '');
      setNotes(item?.notes || '');
      setSelectedMedication(item?.metadata || null);
    } else if (prefillName) {
      setName(prefillName);
      setDosage('');
      setFrequency('');
      setSchedule(undefined);
      setDuration('');
      setQuantity('');
      setNotes('');
      setSelectedMedication(prefillMetadata || null);
    } else {
      setName('');
      setDosage('');
      setFrequency('');
      setSchedule(undefined);
      setDuration('');
      setQuantity('');
      setNotes('');
      setSelectedMedication(null);
    }
    setNameError('');
  }, [visible, item, prefillName, prefillMetadata]);

  // Load timing/frequency when sheet opens so "When" and Frequency have options on mobile (Header not mounted).
  useEffect(() => {
    if (!visible) return;
    const timingEmpty = !timingList || timingList.length === 0;
    const frequencyEmpty = !frequencyList || frequencyList.length === 0;
    if (timingEmpty) dispatch(showMedicineTime());
    if (frequencyEmpty) dispatch(showMedicineFrequency());
  }, [visible, timingList, frequencyList, dispatch]);

  // API: empty → getFrequently; typing → debounced searchMedication (same as web)
  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = (name || '').trim();
    if (!q) {
      dispatch(getFrequentlySearchedMedication());
      return;
    }
    debounceRef.current = setTimeout(() => {
      dispatch(searchMedication({ searchQuery: q, type: 'parent' }));
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [visible, name, dispatch]);

  // Build options from parentOptionsList + "Add as custom" when no exact match (match web)
  useEffect(() => {
    const list = Array.isArray(parentOptionsList) ? parentOptionsList : [];
    const q = (name || '').trim();
    const opts = list
      .filter((m) => m && (m.tmm_medicine_name || m.medicine_name))
      .map((m) => {
        const medicineName = m.tmm_medicine_name || m.medicine_name;
        return {
          key: JSON.stringify({ ...m }),
          value: medicineName,
          label: medicineName,
        };
      });
    if (q.length > 0) {
      const exact = list.some(
        (m) => (m.tmm_medicine_name || m.medicine_name || '').toLowerCase().trim() === q.toLowerCase()
      );
      if (!exact) {
        opts.push({
          key: JSON.stringify({ tmm_id: 0, tmm_medicine_name: q }),
          value: q,
          label: `Add "${q}" as custom`,
        });
      }
    }
    setOptions(opts);
  }, [parentOptionsList, name]);

  const onSearch = useCallback((val) => {
    setName(removeBeforeWhiteSpace(val));
    setNameError('');
  }, []);

  const onSelect = useCallback((value, option) => {
    if (!option?.key) return;
    try {
      const parsed = JSON.parse(option.key);
      if (parsed?.tmm_id === 0) {
        setAddCustomInitialName(parsed?.tmm_medicine_name || value || '');
        setShowAddCustom(true);
        return;
      }
      const medicineName = parsed?.tmm_medicine_name || parsed?.medicine_name || value;
      setName(medicineName);
      setSelectedMedication(parsed);
    } catch {
      setSelectedMedication(null);
      setName(value);
    }
  }, []);

  const onAddCustomSuccess = useCallback((added) => {
    setName(added?.tmm_medicine_name || added?.medicine_name || '');
    setSelectedMedication(added || null);
    setShowAddCustom(false);
    setAddCustomInitialName('');
  }, []);

  const onAddCustomClose = useCallback(() => {
    setShowAddCustom(false);
    setAddCustomInitialName('');
  }, []);

  const onSearchFrequency = useCallback((query) => {
    const q = (query || '').trim();
    if (!q) {
      setFrequencyOptions([]);
      return;
    }
    const data = [];
    if (frequencyFormat(q)) {
      const combinationList = frequencyCombination(q) || [];
      combinationList.forEach((opt) => data.push({ value: opt, label: opt }));
    }
    const filtered = (frequencyList || []).filter((f) => f.tmf_block !== 0);
    filtered.forEach((f) => data.push({ value: f.tmf_title, label: f.tmf_title }));
    setFrequencyOptions(data);
  }, [frequencyList]);

  const onSearchDuration = useCallback((query) => {
    const num = onlyNumberFormat(query || '');
    if (num) {
      const opts = DURATION_UNITS.map((u) => ({
        value: `${num} ${u.value}`,
        label: `${num} ${u.label}`,
      }));
      setDurationOptions(opts);
    } else {
      setDurationOptions(EXTRA_OPTIONS.map((o) => ({ value: o.value, label: o.label })));
    }
  }, []);

  const medicineUnits = selectedMedication?.medicineUnit || DEFAULT_UNIT_OPTIONS;
  const onSearchUnitPerDose = useCallback((query) => {
    const updateQuery = (onlyDecimalFormat(query || '') || '').trim();
    setDosage(query ?? '');
    if (updateQuery && Array.isArray(medicineUnits) && medicineUnits.length > 0) {
      const opts = medicineUnits.map((e) => ({
        value: `${updateQuery} ${e.tmu_title}`,
        label: `${updateQuery} ${e.tmu_title}`,
      }));
      setUnitPerDoseOptions(opts);
    } else {
      setUnitPerDoseOptions([]);
    }
  }, [medicineUnits]);

  const handleSave = async () => {
    const medicineName = (name || '').trim();
    if (!medicineName) {
      setNameError('Medicine name is required');
      return;
    }
    setNameError('');

    const durationStr = (duration || '').trim();
    let quantityNum = quantity !== '' ? (isNaN(Number(quantity)) ? 0 : Number(quantity)) : 0;

    const payload = {
      id: item?.id || Date.now().toString(),
      name: medicineName,
      lineItem: '',
      dosage: (dosage || '').trim(),
      frequency: (frequency || '').trim(),
      schedule: schedule || '',
      duration: durationStr,
      quantity: quantityNum,
      notes: (notes || '').trim(),
      ...(selectedMedication && { metadata: selectedMedication }),
      ...(selectedMedication && (selectedMedication.tmm_generic || selectedMedication.generic_name) && {
        corrected_name: selectedMedication.tmm_generic || selectedMedication.generic_name,
      }),
    };

    // Ensure quantity is calculated from API before save (in case auto-calc did not run or user changed fields)
    try {
      const res = await ApiMedication.getQuantity({ medicines: [{ ...payload, quantity: payload.quantity || 0 }] });
      const medicines = res?.medicines || res?.data?.medicines;
      const calculated = medicines?.[0]?.quantity;
      if (calculated != null && Number.isFinite(Number(calculated))) {
        payload.quantity = Number(calculated);
      }
    } catch {
      // keep quantityNum
    }

    payload.lineItem = `${medicineName} (${[payload.dosage, payload.quantity, payload.frequency, payload.schedule, payload.duration, payload.notes].filter(Boolean).join(', ')})`;
    onSave?.(payload);
    onClose?.();
  };

  const handleClose = () => {
    setNameError('');
    onClose?.();
  };

  const saveEnabled = (name || '').trim().length > 0;

  const timingArray = Array.isArray(timingList)
    ? timingList
    : (timingList?.list || timingList?.timing || timingList?.data || []);
  const scheduleOptions = (timingArray || []).map((t) => ({
    value: t?.tmt_title ?? t?.title ?? '',
    label: t?.tmt_title ?? t?.title ?? '',
  })).filter((o) => o.value);

  if (!visible) return null;

  return (
    <>
    <Drawer
      placement="bottom"
      onClose={handleClose}
      open={visible}
      height="auto"
      className="medication-edit-sheet"
      closable={false}
      maskClosable
    >
      <div className="medication-edit-sheet-content">
        <div className="medication-edit-sheet-header">
          <h3 className="medication-edit-sheet-title">
            {isAdd ? 'Add Medication' : 'Edit Medication'}
          </h3>
          <button
            className="medication-edit-sheet-close"
            onClick={handleClose}
            type="button"
            aria-label="Close"
          >
            <img src={closeIcon} alt="" />
          </button>
        </div>

        <div className="medication-edit-sheet-body">
          <div className="medication-edit-sheet-field">
            <label className="medication-edit-sheet-label">Medicine <span className="required">*</span></label>
            <AutoComplete
              value={name}
              onSearch={onSearch}
              onSelect={onSelect}
              options={options}
              defaultActiveFirstOption
              getPopupContainer={() => document.body}
              className="medication-edit-sheet-autocomplete"
            >
              <Input
                placeholder="Search by medicine name"
                prefix={<SearchOutlined className="medication-edit-sheet-search-icon" />}
                allowClear
                className="medication-edit-sheet-input"
                maxLength={500}
              />
            </AutoComplete>
            {nameError && <span className="medication-edit-sheet-error">{nameError}</span>}
          </div>

          <div className="medication-edit-sheet-field">
            <label className="medication-edit-sheet-label">Unit per dose</label>
            <AutoComplete
              value={dosage}
              onSearch={(v) => onSearchUnitPerDose(v)}
              onSelect={(v) => {
                setDosage(v);
                setUnitPerDoseOptions([]);
              }}
              onFocus={() => {
                if (dosage) onSearchUnitPerDose(dosage);
              }}
              options={unitPerDoseOptions}
              defaultActiveFirstOption
              getPopupContainer={() => document.body}
              allowClear
              onClear={() => {
                setDosage('');
                setUnitPerDoseOptions([]);
              }}
              className="medication-edit-sheet-autocomplete"
            >
              <Input
                placeholder="e.g., 1 Tablet"
                className="medication-edit-sheet-input"
                maxLength={200}
              />
            </AutoComplete>
          </div>

          <div className="medication-edit-sheet-field">
            <label className="medication-edit-sheet-label">Frequency</label>
            <AutoComplete
              value={frequency}
              onSearch={(v) => {
                setFrequency(removeBeforeWhiteSpace(v || ''));
                onSearchFrequency(v);
              }}
              onSelect={(v) => setFrequency(v)}
              options={frequencyOptions}
              defaultActiveFirstOption
              getPopupContainer={() => document.body}
              allowClear
              className="medication-edit-sheet-autocomplete"
            >
              <Input
                placeholder="e.g 1-0-1"
                className="medication-edit-sheet-input"
                maxLength={200}
              />
            </AutoComplete>
          </div>

          <div className="medication-edit-sheet-field">
            <label className="medication-edit-sheet-label">When</label>
            <Select
              value={schedule && schedule !== 'None' ? schedule : undefined}
              onChange={setSchedule}
              onClear={() => setSchedule(undefined)}
              placeholder="e.g Before Food"
              allowClear
              options={scheduleOptions}
              className="medication-edit-sheet-select"
              getPopupContainer={() => document.body}
            />
          </div>

          <div className="medication-edit-sheet-field">
            <label className="medication-edit-sheet-label">Duration</label>
            <AutoComplete
              value={duration}
              onSearch={(v) => {
                setDuration(v || '');
                onSearchDuration(v);
              }}
              onSelect={(v) => setDuration(v)}
              options={durationOptions}
              defaultActiveFirstOption
              getPopupContainer={() => document.body}
              allowClear
              className="medication-edit-sheet-autocomplete"
            >
              <Input
                placeholder="e.g 1 Day"
                className="medication-edit-sheet-input"
                maxLength={100}
              />
            </AutoComplete>
          </div>

          <div className="medication-edit-sheet-field">
            <label className="medication-edit-sheet-label">Quantity</label>
            <Input
              value={quantity}
              onChange={(e) => setQuantity(onlyNumberFormat(e.target.value))}
              placeholder="e.g., 10"
              className="medication-edit-sheet-input"
              maxLength={20}
            />
          </div>

          <div className="medication-edit-sheet-field">
            <label className="medication-edit-sheet-label">Note</label>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes"
              className="medication-edit-sheet-textarea"
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className="medication-edit-sheet-actions">
            <Button
              type="primary"
              onClick={handleSave}
              className="medication-edit-sheet-btn-save"
              disabled={!saveEnabled}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
    {showAddCustom && (
      <AddCustomMedicineSheet
        visible={showAddCustom}
        onClose={onAddCustomClose}
        initialData={addCustomInitialName ? { tmm_medicine_name: addCustomInitialName } : null}
        onSuccess={onAddCustomSuccess}
      />
    )}
    </>
  );
}

export default MedicationEditSheet;
