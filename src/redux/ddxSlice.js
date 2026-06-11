import { createSlice } from "@reduxjs/toolkit";

import { normalizeVitalsAndBodyCompositionToRxRowFields } from "../utils/symptomCollectorVitalsMerge";

const initialState = {
  isApexAISelected: false,
  isSymptomsBox: false,
  isLabTestBox: null,
  isDiagnosisBox: null,
  isDDxReadyToGenerate: false,
  symptomCollector: {},
  selectedSymptomsCollector: {},
  isAutofillSelected: false,
  showSCPopup: false,
};

const ddxSlice = createSlice({
  name: "ddx",
  initialState,
  reducers: {
    resetDDxState: () => initialState,
    setIsApexAISelected: (state, action) => {
      state.isApexAISelected = action.payload;
    },
    setIsSymptomsBox: (state, action) => {
      state.isSymptomsBox = action.payload;
    },
    setIsLabTestBox: (state, action) => {
      state.isLabTestBox = action.payload;
    },
    setIsDiagnosisBox: (state, action) => {
      state.isDiagnosisBox = action.payload;
    },
    setIsDDxReadyToGenerate: (state, action) => {
      state.isDDxReadyToGenerate = action.payload;
    },
    setSymptomCollector: (state, action) => {
      state.symptomCollector = action.payload;
    },
    setSelectedSymptomsCollector: (state, action) => {
      const payload = action.payload;
      if (
        payload &&
        typeof payload === "object" &&
        payload.vitalsAndBodyComposition != null &&
        typeof payload.vitalsAndBodyComposition === "object"
      ) {
        const normalized = normalizeVitalsAndBodyCompositionToRxRowFields(
          payload.vitalsAndBodyComposition
        );
        state.selectedSymptomsCollector = {
          ...payload,
          vitalsAndBodyComposition:
            Object.keys(normalized).length > 0
              ? normalized
              : payload.vitalsAndBodyComposition,
        };
      } else {
        state.selectedSymptomsCollector = payload ?? {};
      }
    },
    setSelectAutofill: (state, action) => {
      state.isAutofillSelected = action.payload;
    },
    setShowSCPopup: (state, action) => {
      state.showSCPopup = action.payload;
    },
  },
});

export const {
  resetDDxState,
  setIsApexAISelected,
  setIsSymptomsBox,
  setIsLabTestBox,
  setIsDiagnosisBox,
  setIsDDxReadyToGenerate,
  setSymptomCollector,
  setSelectedSymptomsCollector,
  setSelectAutofill,
  setShowSCPopup,
} = ddxSlice.actions;
export default ddxSlice.reducer;
