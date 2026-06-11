import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  rowsByPatient: {},        // { [patientId]: { rows: [], page: 1, hasMore: false, loaded: false } }
  detailsByPatient: {},     // { [patientId]: { [tcmId]: enrichedDetail } }
  prescriptionPayloads: {}, // { [printUrl]: payload }
};

const pastVisitsSlice = createSlice({
  name: "pastVisits",
  initialState,
  reducers: {
    setPastVisitRows: (state, action) => {
      const { patientId, rows, page, hasMore } = action.payload;
      state.rowsByPatient[patientId] = { rows, page, hasMore, loaded: true };
    },
    appendPastVisitRows: (state, action) => {
      const { patientId, rows, page, hasMore } = action.payload;
      const existing = state.rowsByPatient[patientId] || { rows: [], page: 1, hasMore: false, loaded: false };
      state.rowsByPatient[patientId] = {
        rows: [...existing.rows, ...rows],
        page,
        hasMore,
        loaded: true,
      };
    },
    setPastVisitDetail: (state, action) => {
      const { patientId, tcmId, detail } = action.payload;
      if (!state.detailsByPatient[patientId]) {
        state.detailsByPatient[patientId] = {};
      }
      state.detailsByPatient[patientId][tcmId] = detail;
    },
    setPrescriptionPayload: (state, action) => {
      const { url, payload } = action.payload;
      // Store as JSON string so Immer doesn't deep-freeze the payload object.
      // renderPrintPayloadToBlob mutates nested properties; a frozen object would throw.
      state.prescriptionPayloads[url] = JSON.stringify(payload);
    },
    clearPastVisits: () => initialState,
  },
});

export const {
  setPastVisitRows,
  appendPastVisitRows,
  setPastVisitDetail,
  setPrescriptionPayload,
  clearPastVisits,
} = pastVisitsSlice.actions;

export default pastVisitsSlice.reducer;
