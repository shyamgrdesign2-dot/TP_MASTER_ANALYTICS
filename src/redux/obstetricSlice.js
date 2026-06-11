import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  obstetricDetails: {},
  isObstetricDetailsFetched: false,
  isPatientDiagnosisUpdated: false,
  isObstetricDetailsUpdated: false,
  isNavigateToObstetric: false,
  currentSessionRx: null,
  defaultAncSchedule: [],
  defaultImmunisation: [],
  ancDoctorList: [],
  immunisationDoctorList: [],
};

const obstetricSlice = createSlice({
  name: "obstetric",
  initialState,
  reducers: {
    resetObstetricState: () => initialState,
    addObstetricDetails: (state, action) => {
      if (action.payload?.examinationHistory?.length > 0) {
        let sortedData = [...action.payload.examinationHistory]
          .map((item, index) => ({
            ...item,
            originalIndex: index,
          }))
          .sort((a, b) => {
            const dateComparison = new Date(b.date) - new Date(a.date);
            if (dateComparison !== 0) {
              return dateComparison;
            }

            return b.originalIndex - a.originalIndex;
          })
          .map(({ originalIndex, ...item }) => item);

        action.payload.examinationHistory = sortedData;
      }
      state.obstetricDetails = action.payload;
      state.isObstetricDetailsFetched = true;
    },
    patientDiagnosisUpdated: (state) => {
      state.isPatientDiagnosisUpdated = true;
    },
    resetUpdatedPatientDiagnosis: (state) => {
      state.isPatientDiagnosisUpdated = false;
    },
    obstetricDetailsUpdated: (state) => {
      state.isObstetricDetailsUpdated = true;
    },
    navigateToObstetric: (state, action) => {
      state.isNavigateToObstetric = action.payload;
    },
    setCurrentSessionRx: (state, action) => {
      state.currentSessionRx = action.payload;
    },
    setDefaultAncSchedule: (state, action) => {
      state.defaultAncSchedule = action.payload;
    },
    setDefaultImmunisation: (state, action) => {
      state.defaultImmunisation = action.payload;
    },
    setAncDoctorList: (state, action) => {
      state.ancDoctorList = action.payload;
    },
    setImmunisationDoctorList: (state, action) => {
      state.immunisationDoctorList = action.payload;
    },
  },
});

export const {
  resetObstetricState,
  addObstetricDetails,
  patientDiagnosisUpdated,
  resetUpdatedPatientDiagnosis,
  obstetricDetailsUpdated,
  navigateToObstetric,
  setCurrentSessionRx,
  setDefaultAncSchedule,
  setDefaultImmunisation,
  setAncDoctorList,
  setImmunisationDoctorList,
} = obstetricSlice.actions;
export default obstetricSlice.reducer;
