import { createSlice } from "@reduxjs/toolkit";

const createVoiceSessionId = () =>
  `voice-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const initialState = {
  sessionId: createVoiceSessionId(),
  voiceLogCreated: false,
  voiceCallCount: 0,
  history: [],
  digitizeData: null,
  editedData: null,
  clinicNotes: {},
  // soap = raw structured object { subjective, objective, assessment, plan } from /agents/get-soap-notes.
  // Persisted to /voice/store under key "soap" and used as previous_context on regen.
  soap: null,
  // soapHtml = display/edit HTML for RichEditor (derived from soap via soapToHtml).
  // Not persisted to /voice/store; lives in redux for cross-component access during session.
  soapHtml: "",
  recordId: null,
};

const voiceDigitizationSlice = createSlice({
  name: "voiceDigitization",
  initialState,
  reducers: {
    beginVoiceAttempt: (state) => {
      state.voiceCallCount += 1;
    },
    markVoiceLogCreated: (state) => {
      state.voiceLogCreated = true;
    },
    addVoiceHistoryEntry: (state, action) => {
      state.history.push(action.payload);
    },
    updateVoiceDigitizeData: (state, action) => {
      state.digitizeData = action.payload;
    },
    updateVoiceEditedData: (state, action) => {
      state.editedData = action.payload;
    },
    updateVoiceClinicNotes: (state, action) => {
      state.clinicNotes = action.payload || {};
    },
    updateVoiceSoap: (state, action) => {
      state.soap = action.payload && typeof action.payload === "object" ? action.payload : null;
    },
    updateVoiceSoapHtml: (state, action) => {
      state.soapHtml = typeof action.payload === "string" ? action.payload : "";
    },
    hydrateVoiceDigitization: (state, action) => {
      const payload = action.payload || {};
      state.history = Array.isArray(payload.history) ? payload.history : [];
      state.digitizeData = payload.digitizeData ?? null;
      state.editedData = payload.editedData ?? null;
      state.clinicNotes = payload.clinicNotes || {};
      state.soap = payload.soap && typeof payload.soap === "object" ? payload.soap : null;
      state.soapHtml = typeof payload.soapHtml === "string" ? payload.soapHtml : "";
      state.recordId = payload._id || payload.id || state.recordId;
      state.voiceLogCreated = state.history.length > 0;
    },
    resetVoiceDigitization: () => ({
      ...initialState,
      sessionId: createVoiceSessionId(),
      history: [],
    }),
  },
});

export const {
  beginVoiceAttempt,
  markVoiceLogCreated,
  addVoiceHistoryEntry,
  updateVoiceDigitizeData,
  updateVoiceEditedData,
  updateVoiceClinicNotes,
  updateVoiceSoap,
  updateVoiceSoapHtml,
  hydrateVoiceDigitization,
  resetVoiceDigitization,
} = voiceDigitizationSlice.actions;

export default voiceDigitizationSlice.reducer;
