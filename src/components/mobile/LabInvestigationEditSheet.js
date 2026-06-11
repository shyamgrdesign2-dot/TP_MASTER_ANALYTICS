import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AutoComplete, Input, Button, Drawer } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

import { searchInvestigation, getFrequentlySearchedInvestigation } from '../../redux/investigationSlice';
import { removeBeforeWhiteSpace } from '../../utils/utils';
import './LabInvestigationEditSheet.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

/**
 * Bottom sheet for Add / Edit Lab Investigation.
 * Matches web LabInvestigationTable: search/autocomplete via searchInvestigation &
 * getFrequentlySearchedInvestigation; item shape (name, lineItem, notes, hm_type, um_id).
 * Design: "Select Investigation" (search), "Note", Save (enabled when Select has value), Close (X).
 */
function LabInvestigationEditSheet({ visible, onClose, item, onSave }) {
  const dispatch = useDispatch();
  const { parentOptionsList = [], loading } = useSelector((state) => state.investigation);
  const debounceRef = useRef(null);

  const [selectValue, setSelectValue] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);
  const [options, setOptions] = useState([]);

  const isAdd = !item;

  // Sync form from item when opening for Edit; reset for Add
  useEffect(() => {
    if (!visible) return;
    if (item) {
      const n = typeof item === 'string' ? item : (item?.name || item?.lineItem || '');
      const no = typeof item === 'string' ? '' : (item?.notes || item?.instruction || '');
      setSelectValue(n);
      setNotes(no);
      setSelectedInvestigation(null);
    } else {
      setSelectValue('');
      setNotes('');
      setSelectedInvestigation(null);
    }
    setNameError('');
  }, [visible, item]);

  // API: when empty → getFrequently; when typing → debounced searchInvestigation (same as web)
  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = (selectValue || '').trim();
    if (!q) {
      dispatch(getFrequentlySearchedInvestigation());
      return;
    }
    debounceRef.current = setTimeout(() => {
      dispatch(searchInvestigation({ searchQuery: q, type: 'parent' }));
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [visible, selectValue, dispatch]);

  // Build options from parentOptionsList + "Add Custom" when no exact match (match web behavior)
  useEffect(() => {
    const list = Array.isArray(parentOptionsList) ? parentOptionsList : [];
    const q = (selectValue || '').trim();
    const opts = list
      .filter((inv) => inv && inv.investigation_name)
      .map((inv, idx) => ({
        key: JSON.stringify({ ...inv, _i: idx }),
        value: inv.investigation_name,
        label: inv.investigation_name,
      }));
    if (q.length > 0) {
      const exact = list.some(
        (inv) => (inv.investigation_name || '').toLowerCase().trim() === q.toLowerCase()
      );
      if (!exact) {
        opts.push({
          key: JSON.stringify({ change: 1, investigation_name: q }),
          value: q,
          label: `Add "${q}" as custom`,
        });
      }
    }
    setOptions(opts);
  }, [parentOptionsList, selectValue]);

  const onSearch = useCallback((val) => {
    const v = removeBeforeWhiteSpace(val);
    setSelectValue(v);
    setNameError('');
  }, []);

  const onSelect = useCallback((value, option) => {
    if (!option?.key) return;
    try {
      const parsed = JSON.parse(option.key);
      if (parsed.change === 1) {
        setSelectedInvestigation(null);
        setSelectValue(parsed.investigation_name || value);
      } else {
        setSelectedInvestigation(parsed);
        setSelectValue(parsed.investigation_name || value);
      }
    } catch {
      setSelectedInvestigation(null);
      setSelectValue(value);
    }
  }, []);

  const handleSave = () => {
    const name = (selectValue || '').trim();
    if (!name) {
      setNameError('Select Investigation is required');
      return;
    }
    setNameError('');
    const payload = {
      name,
      notes: (notes || '').trim(),
      lineItem: name,
      hm_type: selectedInvestigation?.hm_type,
      um_id: selectedInvestigation?.um_id,
    };
    onSave?.(payload);
    onClose?.();
  };

  const handleClose = () => {
    setNameError('');
    onClose?.();
  };

  const saveEnabled = (selectValue || '').trim().length > 0;

  if (!visible) return null;

  return (
    <Drawer
      placement="bottom"
      onClose={handleClose}
      open={visible}
      height="auto"
      className="lab-investigation-edit-sheet"
      closable={false}
      maskClosable
    >
      <div className="lab-investigation-edit-sheet-content">
        <div className="lab-investigation-edit-sheet-header">
          <h3 className="lab-investigation-edit-sheet-title">
            {isAdd ? 'Add Lab Investigation' : 'Edit Lab Investigation'}
          </h3>
          <button
            className="lab-investigation-edit-sheet-close"
            onClick={handleClose}
            type="button"
            aria-label="Close"
          >
            <img src={closeIcon} alt="" />
          </button>
        </div>

        <div className="lab-investigation-edit-sheet-body">
          <div className="lab-investigation-edit-sheet-field">
            <label className="lab-investigation-edit-sheet-label">Select Investigation</label>
            <AutoComplete
              value={selectValue}
              onSearch={onSearch}
              onSelect={onSelect}
              options={options}
              defaultActiveFirstOption
              getPopupContainer={() => document.body}
              className="lab-investigation-edit-sheet-autocomplete"
            >
              <Input
                placeholder="Search by Lab Investigation name"
                prefix={<SearchOutlined className="lab-investigation-edit-sheet-search-icon" />}
                allowClear
                className="lab-investigation-edit-sheet-input"
                maxLength={500}
              />
            </AutoComplete>
            {nameError && <span className="lab-investigation-edit-sheet-error">{nameError}</span>}
          </div>

          <div className="lab-investigation-edit-sheet-field">
            <label className="lab-investigation-edit-sheet-label">Note</label>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional instructions if any"
              className="lab-investigation-edit-sheet-textarea"
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="lab-investigation-edit-sheet-actions">
            <Button
              type="primary"
              onClick={handleSave}
              className="lab-investigation-edit-sheet-btn-save"
              disabled={!saveEnabled}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export default LabInvestigationEditSheet;
