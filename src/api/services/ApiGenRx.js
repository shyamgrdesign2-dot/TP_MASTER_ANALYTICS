import api from "../../api/services/axiosService";
import config from "../../config";

const symptomsCollectorBaseUrl = {
  customBaseUrl: config.symptoms_collector_api_url,
  timeout: 120000,
};


const digitizationBaseUrl = config.snap_rx_api_url;

const copyRxBaseUrl = config.rx_digitization || digitizationBaseUrl;
const voiceCopyBaseUrl = config.gen_rx_api_url || copyRxBaseUrl;

const voiceAmbientBaseUrl = {
  customBaseUrl: digitizationBaseUrl,
  timeout: parseInt(process.env.REACT_APP_AMBIENT_RX_TIMEOUT) || 300000,
};

const copyRxBaseUrlConfig = {
  customBaseUrl: copyRxBaseUrl,
  timeout: parseInt(process.env.REACT_APP_AMBIENT_RX_TIMEOUT) || 300000,
};

const voiceCopyBaseUrlConfig = {
  customBaseUrl: voiceCopyBaseUrl,
  timeout: parseInt(process.env.REACT_APP_AMBIENT_RX_TIMEOUT) || 300000,
};

const uploadBaseUrl = {
  customBaseUrl: digitizationBaseUrl,
  timeout: 300000,
};

const voiceLogsBaseUrl = {
  customBaseUrl: digitizationBaseUrl,
  timeout: 120000,
};

export const uploadVoiceAudio = async function (audioFile) {
  if (!audioFile || !(audioFile instanceof File)) {
    console.error("[voice/upload] Invalid audioFile: expected File instance", { audioFile });
    throw new Error("Invalid audio file for upload");
  }
  if (audioFile.size === 0) {
    console.error("[voice/upload] Audio file is empty", { name: audioFile.name, size: audioFile.size, type: audioFile.type });
    throw new Error("Audio file is empty");
  }
  const formData = new FormData();
  formData.append("file", audioFile, audioFile.name || "recording.webm");
  try {
    const response = await api.post("/api/v1/digitization/voice/upload", formData, uploadBaseUrl);
    return response;
  } catch (e) {
    console.error("[voice/upload] Request failed", e?.message);
    throw e;
  }
};

const buildVoiceLogConfig = (correlationId) => {
  if (!correlationId) return voiceLogsBaseUrl;
  return {
    ...voiceLogsBaseUrl,
    headers: {
      "x-correlation-id": correlationId,
    },
  };
};

export const createVoiceLog = async function (payload, patientId, options = {}) {
  if (!patientId) return null;
  const endpoint = `/api/v1/digitization/voice/logs?patientId=${encodeURIComponent(patientId)}`;
  return api.post(endpoint, payload, buildVoiceLogConfig(options.correlationId));
};

export const updateVoiceLog = async function (payload, patientId, options = {}) {
  if (!patientId) return null;
  const endpoint = `/api/v1/digitization/voice/logs?patientId=${encodeURIComponent(patientId)}`;
  return api.put(endpoint, payload, buildVoiceLogConfig(options.correlationId));
};

export const storeVoicePrescription = async function ({
  payload,
  patientId,
  doctorId,
  tcmId,
  appointmentId,
  sessionId,
}) {
  const queryParams = [];
  if (patientId) queryParams.push(`patientId=${encodeURIComponent(patientId)}`);
  if (doctorId) queryParams.push(`doctorId=${encodeURIComponent(doctorId)}`);
  if (tcmId !== undefined && tcmId !== null) queryParams.push(`tcmId=${encodeURIComponent(tcmId)}`);
  if (appointmentId !== undefined && appointmentId !== null) queryParams.push(`appointmentId=${encodeURIComponent(appointmentId)}`);
  if (sessionId) queryParams.push(`sessionId=${encodeURIComponent(sessionId)}`);
  const endpoint = `/api/v1/digitization/voice/store${queryParams.length ? `?${queryParams.join("&")}` : ""}`;
  return api.post(endpoint, payload, voiceAmbientBaseUrl);
};

export const generateRx = async function (payload, patientId, admissionId) {
  let res = {};
  try {
    let endpoint = `/api/v1/digitization/voice`;
    const queryParams = [];
    if (patientId) queryParams.push(`patientId=${patientId}`);
    if (admissionId) queryParams.push(`admissionId=${admissionId}`);
    if (queryParams.length) endpoint += `?${queryParams.join("&")}`;
    const apiResponse = await api.post(endpoint, payload, voiceAmbientBaseUrl);
    res = apiResponse?.data ? { success: true, data: apiResponse.data } : { success: true, data: apiResponse };
  } catch (e) {
    console.error("[voice/create] Failed", e?.message);
    throw e;
  }
  return res;
};

export const updateGenRx = async function (payload, id, patientId, admissionId) {
  let res = {};
  try {
    let endpoint = `/api/v1/digitization/voice`;
    const queryParams = [];
    if (patientId) queryParams.push(`patientId=${patientId}`);
    if (id) queryParams.push(`id=${id}`);
    if (admissionId) queryParams.push(`admissionId=${admissionId}`);
    if (queryParams.length) endpoint += `?${queryParams.join("&")}`;
    const apiResponse = await api.put(endpoint, payload, voiceAmbientBaseUrl);
    res = apiResponse?.data ? { success: true, data: apiResponse.data } : { success: true, data: apiResponse };
  } catch (e) {
    console.error("[voice/update] Failed", e?.message);
    throw e;
  }
  return res;
};

export const editGenRxDetails = async function (payload, id, appointmentId = null, caseId = null) {
  let res = {};
  try {
    let endpoint = `/api/v1/digitization/voice?id=${id}`;
    if (appointmentId) endpoint += `&appointmentId=${appointmentId}`;
    if (caseId) endpoint += `&caseId=${caseId}`;
    res = await api.patch(endpoint, payload, voiceAmbientBaseUrl);
  } catch (e) {
    console.error("Error while updating gen rx: ", e);
  }
  return res;
};

export const getGenRx = async function (id) {
  let res = {};
  try {
    const endpoint = `/api/v1/digitization/voice?id=${id}`;
    const raw = await api.get(endpoint, voiceAmbientBaseUrl);
    res = raw != null ? { success: true, data: raw } : {};
  } catch (e) {
    console.error("Error while fetching voice/ambient rx details: ", e);
  }
  return res;
};

export const fetchSymptomsCollectorData = async function (payload) {
  let res = {};
  try {
    res = await api.post(
      `/api/v1/agents/get-symptoms`,
      payload,
      symptomsCollectorBaseUrl
    );
  } catch (e) {
    console.error("Error while fetching symptoms collector data: ", e);
  }

  // Remove `bloodPressure` from vitals payload (keep systolic/diastolic).
  if (res && typeof res === "object") {
    if (
      res.vitalsAndBodyComposition &&
      typeof res.vitalsAndBodyComposition === "object"
    ) {
      delete res.vitalsAndBodyComposition.bloodPressure;
    }
    if (
      res.summary_json_doctor &&
      typeof res.summary_json_doctor === "object" &&
      res.summary_json_doctor.vitalsAndBodyComposition &&
      typeof res.summary_json_doctor.vitalsAndBodyComposition === "object"
    ) {
      delete res.summary_json_doctor.vitalsAndBodyComposition.bloodPressure;
    }
  }

  return res;
};

export const checkSymptomsCollectorTour = async function (payload) {
  let res = {};
  try {
    res = await api.post(
      `/api/v1/agents/get-appointment-ids`,
      payload,
      symptomsCollectorBaseUrl
    );
    res = res?.pam_ids?.length === 1;
  } catch (e) {
    console.error("Error while checking symptoms collector tour: ", e);
  }
  return res;
};

export const setAddToRx = async function (payload) {
  try {
    await api.post(
      `/api/v1/agents/set-add-to-rx`,
      payload,
      symptomsCollectorBaseUrl
    );
  } catch (e) {
    console.error("Error while setting add to rx: ", e);
  }
};

export const generateAmbientRx = async function (payload, patientId, admissionId) {
  let res = {};
  try {
    let endpoint = `/api/v1/digitization/voice`;
    const queryParams = [];
    if (patientId) queryParams.push(`patientId=${patientId}`);
    if (admissionId) queryParams.push(`admissionId=${admissionId}`);
    if (queryParams.length) endpoint += `?${queryParams.join("&")}`;
    const apiResponse = await api.post(endpoint, payload, voiceAmbientBaseUrl);
    res = apiResponse?.data ? { success: true, data: apiResponse.data } : { success: true, data: apiResponse };
  } catch (e) {
    console.error("[ambient/create] Failed", e?.message);
    throw e;
  }
  return res;
};

export const updateAmbientRx = async function (payload, id, patientId, admissionId) {
  let res = {};
  try {
    let endpoint = `/api/v1/digitization/voice`;
    const queryParams = [];
    if (patientId) queryParams.push(`patientId=${patientId}`);
    if (id) queryParams.push(`id=${id}`);
    if (admissionId) queryParams.push(`admissionId=${admissionId}`);
    if (queryParams.length) endpoint += `?${queryParams.join("&")}`;
    const apiResponse = await api.put(endpoint, payload, voiceAmbientBaseUrl);
    res = apiResponse?.data ? { success: true, data: apiResponse.data } : { success: true, data: apiResponse };
  } catch (e) {
    console.error("[ambient/update] Failed", e?.message);
    throw e;
  }
  return res;
};

export const editAmbientRxDetails = async function (payload, id, appointmentId = null, caseId = null) {
  let res = {};
  try {
    let endpoint = `/api/v1/digitization/voice?id=${id}`;
    if (appointmentId) endpoint += `&appointmentId=${appointmentId}`;
    if (caseId) endpoint += `&caseId=${caseId}`;
    res = await api.patch(endpoint, payload, voiceAmbientBaseUrl);
  } catch (e) {
    console.error("Error while editing voice/ambient rx:", e?.message);
  }
  return res;
};

export const getAmbientRx = async function (id) {
  let res = {};
  try {
    const endpoint = `/api/v1/digitization/voice?id=${id}`;
    const raw = await api.get(endpoint, voiceAmbientBaseUrl);
    res = raw != null ? { success: true, data: raw } : {};
  } catch (e) {
    console.error("Error while fetching voice/ambient rx details:", e?.message);
  }
  return res;
};

/** Repeat Rx for voice: POST voice-digitize/copy-rx (voice prescriptions only). */
export const copyVoiceRx = async function (id, newAppointmentId) {
  let res = { success: false };
  try {
    const endpoint = `/api/v1/voice-digitize/copy-rx/${id}`;
    const response = await api.post(endpoint, { newAppointmentId }, voiceCopyBaseUrlConfig);
    res = response?.data ? { success: true, data: response.data } : { success: true, data: response };
  } catch (e) {
    const errMsg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
    console.error("Error while copying voice rx:", errMsg);
    res = { success: false, error: errMsg };
  }
  return res;
};

/** Repeat Rx for ambient: POST ambient-voice-rx/copy-rx (ambient prescriptions only). */
export const copyAmbientRx = async function (id, newAppointmentId) {
  let res = { success: false };
  try {
    const endpoint = `/api/v1/ambient-voice-rx/copy-rx/${id}`;
    const response = await api.post(endpoint, { newAppointmentId }, copyRxBaseUrlConfig);
    res = response?.data ? { success: true, data: response.data } : { success: true, data: response };
  } catch (e) {
    const errMsg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
    console.error("Error while copying ambient rx:", errMsg);
    res = { success: false, error: errMsg };
  }
  return res;
};
