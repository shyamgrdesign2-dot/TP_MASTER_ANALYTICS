import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  visualAcuity: {
    od: {
      ucDistance: "",
      ucNear: "",
      pinhole: "",
      cDistance: "",
      cNear: "",
    },
    os: {
      ucDistance: "",
      ucNear: "",
      pinhole: "",
      cDistance: "",
      cNear: "",
    },
  },
  tables: {},
  extraFields: {},
  opthalPrescriptionId: null,
  lastOpthalPrescriptionData: null,
  resetCounter: 0,
};

const ophthalmologyExamSlice = createSlice({
  name: "ophthalmologyExam",
  initialState,
  reducers: {
    setVisualAcuityData: (state, action) => {
      const next = action.payload || {};
      state.visualAcuity = {
        od: { ...initialState.visualAcuity.od, ...(next?.od || {}) },
        os: { ...initialState.visualAcuity.os, ...(next?.os || {}) },
      };
    },
    updateVisualAcuityField: (state, action) => {
      const { eye, field, value } = action.payload || {};
      if (!eye || !field) return;
      const normalizedEye = eye.toLowerCase();
      if (!state.visualAcuity[normalizedEye]) return;
      state.visualAcuity[normalizedEye][field] = value;
    },
    resetVisualAcuity: (state) => {
      state.visualAcuity = initialState.visualAcuity;
    },
    setTableValue: (state, action) => {
      const { tableId, cellKey, value } = action.payload || {};
      if (!tableId || !cellKey) return;
      if (!state.tables[tableId]) {
        state.tables[tableId] = {};
      }
      state.tables[tableId][cellKey] = value;
    },
    setTableValues: (state, action) => {
      const { tableId, values } = action.payload || {};
      if (!tableId || !values) return;
      state.tables[tableId] = { ...values };
    },
    resetTable: (state, action) => {
      const { tableId } = action.payload || {};
      if (!tableId) return;
      state.tables[tableId] = {};
    },
    setExtraField: (state, action) => {
      const { key, value } = action.payload || {};
      if (!key) return;
      state.extraFields[key] = value;
    },
    resetExtraField: (state, action) => {
      const { key } = action.payload || {};
      if (!key) return;
      delete state.extraFields[key];
    },
    setOpthalPrescriptionId: (state, action) => {
      state.opthalPrescriptionId = action.payload || null;
    },
    setLastOpthalPrescriptionData: (state, action) => {
      state.lastOpthalPrescriptionData = action.payload || null;
    },
    resetOpthalForm: (state) => {
      state.visualAcuity = initialState.visualAcuity;
      state.tables = {};
      state.extraFields = {};
      state.resetCounter += 1;
    },
  },
});

export const {
  setVisualAcuityData,
  updateVisualAcuityField,
  resetVisualAcuity,
  setTableValue,
  setTableValues,
  resetTable,
  setExtraField,
  resetExtraField,
  setOpthalPrescriptionId,
  setLastOpthalPrescriptionData,
  resetOpthalForm,
} = ophthalmologyExamSlice.actions;

export default ophthalmologyExamSlice.reducer;
