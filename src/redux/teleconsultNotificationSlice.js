import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  /** Stack of WAITING notification payloads for banners: [{ consultationId, appointmentId, patientName, appointmentTime, prescriptionContext, ... }] */
  waitingBanners: [],
  /** Live status by appointmentId (from push): "CREATED" | "WAITING" | "ONGOING" | "ENDED". Merged with list API teleconsultStatus for list icon. */
  appointmentStatusByAppointmentId: {},
  /** Token from join API when user joins from notification (enables global floating window) */
  joinToken: null,
  /** pam_id of the appointment for which the current floating-window call is active (used to close window when that appointment is cancelled) */
  activeTeleconsultAppointmentId: null,
  /** consultationId for the active floating-window call (used to notify backend on doctor-left) */
  activeTeleconsultConsultationId: null,
  /** Last status+consultationId we showed toast for (avoid duplicate toasts) */
  lastShownStatusKey: null,
};

const teleconsultNotificationSlice = createSlice({
  name: "teleconsultNotification",
  initialState,
  reducers: {
    addWaitingBanner: (state, action) => {
      const payload = action.payload;
      if (!payload?.consultationId) return;
      const exists = state.waitingBanners.some((b) => b.consultationId === payload.consultationId);
      if (!exists) {
        state.waitingBanners.push(payload);
      }
    },
    removeWaitingBanner: (state, action) => {
      const consultationId = action.payload;
      state.waitingBanners = state.waitingBanners.filter((b) => b.consultationId !== consultationId);
    },
    setAppointmentTeleconsultStatus: (state, action) => {
      const { appointmentId, status } = action.payload;
      if (appointmentId == null) return;
      if (status == null) {
        delete state.appointmentStatusByAppointmentId[String(appointmentId)];
      } else {
        state.appointmentStatusByAppointmentId[String(appointmentId)] = status;
      }
    },
    setJoinToken: (state, action) => {
      state.joinToken = action.payload;
      if (action.payload == null) {
        state.activeTeleconsultAppointmentId = null;
        state.activeTeleconsultConsultationId = null;
      }
    },
    setActiveTeleconsultAppointmentId: (state, action) => {
      state.activeTeleconsultAppointmentId = action.payload;
    },
    setActiveTeleconsultConsultationId: (state, action) => {
      state.activeTeleconsultConsultationId = action.payload;
    },
    setLastShownStatusKey: (state, action) => {
      state.lastShownStatusKey = action.payload;
    },
    clearTeleconsultNotification: (state) => {
      state.waitingBanners = [];
      state.appointmentStatusByAppointmentId = {};
      state.joinToken = null;
      state.activeTeleconsultAppointmentId = null;
      state.activeTeleconsultConsultationId = null;
      state.lastShownStatusKey = null;
    },
  },
});

export const {
  addWaitingBanner,
  removeWaitingBanner,
  setAppointmentTeleconsultStatus,
  setJoinToken,
  setActiveTeleconsultAppointmentId,
  setActiveTeleconsultConsultationId,
  setLastShownStatusKey,
  clearTeleconsultNotification,
} = teleconsultNotificationSlice.actions;
export default teleconsultNotificationSlice.reducer;
