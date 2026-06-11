import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Drawer, Input, Select, Button, message } from 'antd';

import {
  addMedicine,
  editMedicine,
  searchGeneric,
  updateFrequentlyMedication,
} from '../../redux/medicationSlice';
import { getMedicineType } from '../../redux/doctorsSlice';
import { getClinic } from '../../utils/utils';
import './AddCustomMedicineSheet.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

/**
 * Bottom sheet for Add / Edit Custom Medicine. Matches web CustomMedicinePopup.
 * Fields: Name*, Type*, Generic, Company. Uses addMedicine, editMedicine, searchGeneric.
 */
function AddCustomMedicineSheet({ visible, onClose, initialData = null, onSuccess = null }) {
  const { state } = useLocation();
  const { patient_data } = state || {};
  const dispatch = useDispatch();
  const { profile } = useSelector((s) => s.doctors);
  const { medicineTypeList = [], genericList = [], loading } = useSelector((s) => ({
    medicineTypeList: s.doctors?.medicineTypeList,
    genericList: s.medication?.genericList,
    loading: s.medication?.loading,
  }));

  const [form, setForm] = useState(
    initialData || {
      tmm_medicine_name: '',
      tmy_id: undefined,
      tmy_title: undefined,
      tmm_generic: undefined,
      tmm_company: '',
    }
  );
  const [genericQuery, setGenericQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    const defaults = {
      tmm_medicine_name: '',
      tmy_id: undefined,
      tmy_title: undefined,
      tmm_generic: undefined,
      tmm_company: '',
    };
    setForm({ ...defaults, ...(initialData || {}) });
    setGenericQuery('');
  }, [visible, initialData]);

  // Load medicine types when sheet opens so Type dropdown is populated on mobile (Header not mounted).
  useEffect(() => {
    if (visible) {
      const list = medicineTypeList ?? [];
      if (!Array.isArray(list) || list.length === 0) {
        dispatch(getMedicineType());
      }
    }
  }, [visible, medicineTypeList, dispatch]);

  useEffect(() => {
    if (genericQuery) {
      const id = setTimeout(() => dispatch(searchGeneric(genericQuery)), 500);
      return () => clearTimeout(id);
    }
  }, [genericQuery, dispatch]);

  const onSelectType = useCallback((value) => {
    if (value) {
      try {
        const o = JSON.parse(value);
        setForm((f) => ({ ...f, tmy_id: o.tmy_id, tmy_title: o.tmy_title }));
      } catch {}
    } else {
      setForm((f) => ({ ...f, tmy_id: undefined, tmy_title: undefined }));
    }
  }, []);

  const onSelectGeneric = useCallback((value) => {
    if (value) {
      try {
        const o = JSON.parse(value);
        setForm((f) => ({ ...f, tmm_generic: o.tmm_generic }));
      } catch {}
    } else {
      setForm((f) => ({ ...f, tmm_generic: undefined }));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const payload = {
      tmm_id: form?.tmm_id,
      tmm_medicine_name: (form?.tmm_medicine_name || '').trim(),
      tmm_type: form?.tmy_id,
      tmm_generic: form?.tmm_generic || '',
      tmm_company: (form?.tmm_company || '').trim(),
    };
    const action = form?.tmm_id
      ? await dispatch(editMedicine(payload))
      : await dispatch(addMedicine(payload));
    if (action.meta.requestStatus === 'fulfilled') {
      try {
        const clinic = getClinic(profile?.hospital_data);
        if (window.Moengage && window.Moengage.track_event) {
          window.Moengage.track_event('TP_GD_AddMedoutofAI', {
            patient_id: patient_data?.patient_unique_id || '',
            patient_name: patient_data?.pm_fullname || '',
            doctor_id: profile?.doctor_unique_id,
            doctor_name: profile?.um_name,
            doctor_specialty: profile?.dp_name,
            hm_id: clinic?.hm_id,
            clinic_name: clinic?.hm_name,
            medicine_name: form?.tmm_medicine_name,
            grounding_element: 'Medications',
          });
        }
      } catch (_) {}
      const added = Array.isArray(action.payload) ? action.payload[0] : action.payload;
      if (form?.tmm_id && added) {
        await dispatch(updateFrequentlyMedication(added));
      }
      if (onSuccess && added) {
        onSuccess(added);
      }
      onClose?.();
    } else {
      message.error(action?.error?.message || 'Failed to save medicine. Please try again.');
    }
  }, [form, onSuccess, onClose, dispatch, profile, patient_data]);

  const handleCancel = () => {
    onClose?.();
  };

  const medicineTypeArray = Array.isArray(medicineTypeList)
    ? medicineTypeList
    : (medicineTypeList?.list || medicineTypeList?.data || medicineTypeList?.types || []);
  const typeOptions = (medicineTypeArray || []).map((e) => ({
    value: JSON.stringify({ tmy_id: e.tmy_id, tmy_title: e.tmy_title }),
    label: e.tmy_title ?? e.title ?? '',
  })).filter((o) => o.label);

  const genericOptions = [...(genericList || []), ...(genericQuery ? [{ tmm_generic: genericQuery }] : [])]
    .filter((e) => e?.tmm_generic)
    .map((e, i, arr) => {
      const isCustom = genericQuery && i === arr.length - 1;
      return {
        value: JSON.stringify({ tmm_generic: e.tmm_generic }),
        label: isCustom ? `Add "${e.tmm_generic}" as custom` : e.tmm_generic,
      };
    });

  const typeSelectValue = form?.tmy_id != null ? JSON.stringify({ tmy_id: form.tmy_id, tmy_title: form.tmy_title }) : undefined;
  const genericSelectValue = form?.tmm_generic != null ? JSON.stringify({ tmm_generic: form.tmm_generic }) : undefined;

  const submitEnabled = (form?.tmm_medicine_name || '').trim() && form?.tmy_id;
  const isEdit = !!form?.tmm_id;

  if (!visible) return null;

  return (
    <Drawer
      placement="bottom"
      onClose={handleCancel}
      open={visible}
      height="auto"
      className="add-custom-medicine-sheet"
      closable={false}
      maskClosable
    >
      <div className="add-custom-medicine-sheet-content">
        <div className="add-custom-medicine-sheet-header">
          <h3 className="add-custom-medicine-sheet-title">
            {isEdit ? 'Edit Custom Medicine' : 'Add Custom Medicine'}
          </h3>
          <button
            className="add-custom-medicine-sheet-close"
            onClick={handleCancel}
            type="button"
            aria-label="Close"
          >
            <img src={closeIcon} alt="" />
          </button>
        </div>

        <div className="add-custom-medicine-sheet-body">
          <div className="add-custom-medicine-sheet-field">
            <label className="add-custom-medicine-sheet-label">Name <span className="required">*</span></label>
            <Input
              value={form?.tmm_medicine_name || ''}
              onChange={(e) => setForm((f) => ({ ...f, tmm_medicine_name: e.target.value }))}
              placeholder="Medicine Name"
              className="add-custom-medicine-sheet-input"
              maxLength={500}
            />
          </div>

          <div className="add-custom-medicine-sheet-field">
            <label className="add-custom-medicine-sheet-label">Type <span className="required">*</span></label>
            <Select
              showSearch
              value={typeSelectValue}
              onSelect={onSelectType}
              onClear={() => onSelectType(null)}
              placeholder="Medicine Type"
              allowClear
              options={typeOptions}
              className="add-custom-medicine-sheet-select"
              getPopupContainer={() => document.body}
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes((input || '').toLowerCase())}
            />
          </div>

          <div className="add-custom-medicine-sheet-field">
            <label className="add-custom-medicine-sheet-label">Generic</label>
            <Select
              showSearch
              value={genericSelectValue}
              onSearch={setGenericQuery}
              onSelect={onSelectGeneric}
              onClear={() => onSelectGeneric(null)}
              placeholder="Generic Name"
              allowClear
              options={genericOptions}
              notFoundContent={null}
              className="add-custom-medicine-sheet-select"
              getPopupContainer={() => document.body}
              filterOption={false}
            />
          </div>

          <div className="add-custom-medicine-sheet-field">
            <label className="add-custom-medicine-sheet-label">Company</label>
            <Input
              value={form?.tmm_company || ''}
              onChange={(e) => setForm((f) => ({ ...f, tmm_company: e.target.value }))}
              placeholder="Company Name"
              className="add-custom-medicine-sheet-input"
              maxLength={200}
            />
          </div>

          <div className="add-custom-medicine-sheet-actions">
            <Button
              type="default"
              onClick={handleCancel}
              className="add-custom-medicine-sheet-btn-cancel"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!submitEnabled}
              className="add-custom-medicine-sheet-btn-submit"
            >
              {isEdit ? 'Update Custom Medicine' : 'Add Custom Medicine'}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export default AddCustomMedicineSheet;
