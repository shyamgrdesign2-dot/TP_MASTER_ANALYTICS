/**
 * Mobile-only Gen Rx API – isolated from desktop ApiGenRx.js.
 * Use this in MobileRxPad and other mobile flows so desktop changes don't break mobile.
 * Auth is applied by axiosService interceptor; do not add hardcoded tokens here.
 */
import api from "../../api/services/axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.gen_rx_api_url, timeout: 120000 };
const symptomsCollectorBaseUrl = {
  customBaseUrl: config.symptoms_collector_api_url,
  timeout: 120000,
};

// Use the same base URL as voice Rx (gen_rx_api_url) - ambient API is part of the same service
const ambientRxBaseUrl = {
  customBaseUrl: config.gen_rx_api_url || config.rx_digitization,
  timeout: parseInt(process.env.REACT_APP_AMBIENT_RX_TIMEOUT) || 300000,
  headers: {},
};

const rxDigitizationBaseUrl = {
  customBaseUrl: config.rx_digitization,
  timeout: 300000,
  headers: {},
};

export const generateRx = async function (payload) {
  let res = {};
  try {
    res = await api.post(`/api/v1/voice-digitize`, payload, baseUrl);
  } catch (e) {
    console.error("Error while generating rx: ", e);
  }
  return res;
};

export const updateGenRx = async function (payload, id) {
  let res = {};
  try {
    res = await api.put(`/api/v1/voice-digitize/${id}`, payload, baseUrl);
  } catch (e) {
    console.error("Error while updating gen rx: ", e);
  }
  return res;
};

export const editGenRxDetails = async function (payload, id) {
  let res = {};
  try {
    res = await api.patch(`/api/v1/voice-digitize/${id}`, payload, baseUrl);
  } catch (e) {
    console.error("Error while updating gen rx: ", e);
  }
  return res;
};

export const getGenRx = async function (id) {
  let res = {};
  try {
    res = await api.get(`/api/v1/voice-digitize/${id}`, baseUrl);
  } catch (e) {
    console.error("Error while fetching patient gynec details: ", e);
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
  let retryCount = 0;
  const maxRetries = parseInt(process.env.REACT_APP_AMBIENT_RX_MAX_RETRIES) || 2;
  const ambientEndpoints = {
    create: '/api/v1/ambient-voice-rx/',
    update: '/api/v1/ambient-voice-rx/',
    get: '/api/v1/ambient-voice-rx/',
    edit: '/api/v1/ambient-voice-rx/',
    fhir: '/api/v1/ambient-voice-rx/fhir'
  };

  while (retryCount <= maxRetries) {
    let requestPayload = payload;
    let requestConfig = ambientRxBaseUrl;

    try {
      if (payload instanceof FormData) {
        const formDataEntries = Array.from(payload.entries());
        const audioFile = formDataEntries.find(([key, value]) => (key === '' || key === 'file') && value instanceof File)?.[1];
        const transcriptValue = formDataEntries.find(([key, value]) => (key === '' || key === 'voice_prescription_text') && typeof value === 'string' && value.trim() !== '')?.[1];

        if (audioFile) {
          requestPayload = payload;
          requestConfig = {
            ...ambientRxBaseUrl,
            headers: {
              ...ambientRxBaseUrl.headers,
              'Content-Type': 'multipart/form-data'
            }
          };
        } else if (transcriptValue) {
          const allFields = {};
          formDataEntries.forEach(([key, value]) => {
            if (key !== '') {
              allFields[key] = value;
            }
          });

          let previousContext = null;
          if (allFields.voice_prescription_previous_context) {
            previousContext = typeof allFields.voice_prescription_previous_context === 'string'
              ? allFields.voice_prescription_previous_context
              : JSON.stringify(allFields.voice_prescription_previous_context);
          }

          requestPayload = {
            patientId: allFields.patientId || patientId || '',
            admissionId: allFields.admissionId || admissionId || null,
            doctorId: allFields.doctorId || parseInt(process.env.REACT_APP_AMBIENT_RX_DOCTOR_ID) || 456,
            hospitalId: allFields.hospitalId || parseInt(process.env.REACT_APP_AMBIENT_RX_HOSPITAL_ID) || 789,
            voice_prescription_text: transcriptValue,
            source_duration: allFields.source_duration ? parseInt(allFields.source_duration) : 0,
            getConversation: allFields.getConversation !== undefined ? allFields.getConversation === 'true' || allFields.getConversation === true : (process.env.REACT_APP_AMBIENT_RX_GET_CONVERSATION === 'true' || true),
            schemaKey: allFields.schemaKey || process.env.REACT_APP_AMBIENT_RX_SCHEMA_KEY || "default"
          };

          if (previousContext) {
            requestPayload.voice_prescription_previous_context = previousContext;
          }

          requestConfig = {
            ...ambientRxBaseUrl,
            headers: {
              ...ambientRxBaseUrl.headers,
              'Content-Type': 'application/json'
            }
          };
        } else {
          throw new Error('Either audio file or transcript text must be provided');
        }
      } else {
        requestPayload = payload;
        requestConfig = ambientRxBaseUrl;
      }

      const apiResponse = await api.post(ambientEndpoints.create, requestPayload, requestConfig);

      if (apiResponse.data) {
        res = { success: true, data: apiResponse.data };
      } else {
        res = { success: true, data: apiResponse };
      }

      break;
    } catch (e) {
      if (e.response?.status === 504 || e.code === 'ECONNABORTED' || e.message?.includes('timeout') || e.message?.includes('Network Error')) {
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
      }
      throw e;
    }
  }

  return res;
};

export const updateAmbientRx = async function (payload, id, patientId, admissionId) {
  let res = {};
  let retryCount = 0;
  const maxRetries = parseInt(process.env.REACT_APP_AMBIENT_RX_MAX_RETRIES) || 2;
  const ambientEndpoints = {
    create: '/api/v1/ambient-voice-rx/',
    update: '/api/v1/ambient-voice-rx/',
    get: '/api/v1/ambient-voice-rx/',
    edit: '/api/v1/ambient-voice-rx/',
    fhir: '/api/v1/ambient-voice-rx/fhir'
  };

  while (retryCount <= maxRetries) {
    let requestPayload = payload;
    let requestConfig = ambientRxBaseUrl;

    try {
      if (payload instanceof FormData) {
        const formDataEntries = Array.from(payload.entries());
        const audioFile = formDataEntries.find(([key, value]) => (key === '' || key === 'file') && value instanceof File)?.[1];
        const transcriptValue = formDataEntries.find(([key, value]) => (key === '' || key === 'voice_prescription_text') && typeof value === 'string' && value.trim() !== '')?.[1];

        if (audioFile) {
          requestPayload = payload;
          requestConfig = {
            ...ambientRxBaseUrl,
            headers: {
              ...ambientRxBaseUrl.headers,
              'Content-Type': 'multipart/form-data'
            }
          };
        } else if (transcriptValue) {
          const allFields = {};
          formDataEntries.forEach(([key, value]) => {
            if (key !== '') {
              allFields[key] = value;
            }
          });

          let previousContext = null;
          if (allFields.voice_prescription_previous_context) {
            previousContext = typeof allFields.voice_prescription_previous_context === 'string'
              ? allFields.voice_prescription_previous_context
              : JSON.stringify(allFields.voice_prescription_previous_context);
          }

          requestPayload = {
            doctorId: allFields.doctorId || parseInt(process.env.REACT_APP_AMBIENT_RX_DOCTOR_ID) || 456,
            patientId: allFields.patientId || patientId || '',
            hospitalId: allFields.hospitalId || parseInt(process.env.REACT_APP_AMBIENT_RX_HOSPITAL_ID) || 789,
            admissionId: allFields.admissionId || admissionId || null,
            schemaKey: allFields.schemaKey || process.env.REACT_APP_AMBIENT_RX_SCHEMA_KEY || "default",
            source_duration: allFields.source_duration ? parseInt(allFields.source_duration) : 0,
            voice_prescription_text: transcriptValue,
            getConversation: allFields.getConversation !== undefined ? allFields.getConversation === 'true' || allFields.getConversation === true : (process.env.REACT_APP_AMBIENT_RX_GET_CONVERSATION === 'true' || true)
          };

          if (previousContext) {
            requestPayload.voice_prescription_previous_context = previousContext;
          }

          requestConfig = {
            ...ambientRxBaseUrl,
            headers: {
              ...ambientRxBaseUrl.headers,
              'Content-Type': 'application/json'
            }
          };
        } else {
          throw new Error('Either audio file or transcript text must be provided');
        }
      } else {
        requestPayload = payload;
        requestConfig = ambientRxBaseUrl;
      }

      const apiResponse = await api.put(`${ambientEndpoints.update}${id}`, requestPayload, requestConfig);

      if (apiResponse.data) {
        res = { success: true, data: apiResponse.data };
      } else {
        res = { success: true, data: apiResponse };
      }

      break;
    } catch (e) {
      if (e.response?.status === 504 || e.code === 'ECONNABORTED' || e.message?.includes('timeout') || e.message?.includes('Network Error')) {
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
      }
      throw e;
    }
  }

  return res;
};

export const editAmbientRxDetails = async function (payload, id) {
  let res = {};
  const ambientEndpoints = {
    create: '/api/v1/ambient-voice-rx/',
    update: '/api/v1/ambient-voice-rx/',
    get: '/api/v1/ambient-voice-rx/',
    edit: '/api/v1/ambient-voice-rx/',
    fhir: '/api/v1/ambient-voice-rx/fhir'
  };
  try {
    res = await api.patch(`${ambientEndpoints.edit}${id}`, payload, ambientRxBaseUrl);
  } catch (e) {
    console.error("Error while editing ambient rx: ", e);
  }
  return res;
};

export const getAmbientRx = async function (id) {
  let res = {};
  const ambientEndpoints = {
    create: '/api/v1/ambient-voice-rx/',
    update: '/api/v1/ambient-voice-rx/',
    get: '/api/v1/ambient-voice-rx/',
    edit: '/api/v1/ambient-voice-rx/',
    fhir: '/api/v1/ambient-voice-rx/fhir'
  };
  try {
    res = await api.get(`${ambientEndpoints.get}${id}`, ambientRxBaseUrl);
  } catch (e) {
    console.error("Error while fetching ambient rx details: ", e);
  }
  return res;
};

export const editAmbientRx = async function (payload, id) {
  let res = {};
  const ambientEndpoints = {
    create: '/api/v1/ambient-voice-rx/',
    update: '/api/v1/ambient-voice-rx/',
    get: '/api/v1/ambient-voice-rx/',
    edit: '/api/v1/ambient-voice-rx/',
    fhir: '/api/v1/ambient-voice-rx/fhir'
  };
  try {
    res = await api.patch(`${ambientEndpoints.edit}${id}`, payload, ambientRxBaseUrl);
  } catch (e) {
    console.error("Error while editing ambient rx: ", e);
  }
  return res;
};

export const fhirBundleAmbientRx = async function (payload) {
  let res = {};
  const ambientEndpoints = {
    fhir: '/api/v1/ambient-voice-rx/fhir'
  };
  try {
    res = await api.post(ambientEndpoints.fhir, payload, ambientRxBaseUrl);
  } catch (e) {
    console.error("Error while calling fhir bundle for ambient rx: ", e);
  }
  return res;
};

export const copyVoiceRx = async function (id, newAppointmentId) {
  let res = { success: false };
  try {
    const response = await api.post(
      `/api/v1/voice-digitize/copy-rx/${id}`,
      { newAppointmentId },
      baseUrl
    );
    if (response?.data) {
      res = { success: true, data: response.data };
    } else {
      res = { success: true, data: response };
    }
  } catch (e) {
    console.error("Error while copying voice rx: ", e);
    res = {
      success: false,
      error: e.message,
      status: e.response?.status,
      statusText: e.response?.statusText
    };
  }
  return res;
};

export const copyAmbientRx = async function (id, newAppointmentId) {
  let res = { success: false };
  try {
    const response = await api.post(
      `/api/v1/ambient-voice-rx/copy-rx/${id}`,
      { newAppointmentId },
      ambientRxBaseUrl
    );
    if (response?.data) {
      res = { success: true, data: response.data };
    } else {
      res = { success: true, data: response };
    }
  } catch (e) {
    console.error("Error while copying ambient rx: ", e);
    res = {
      success: false,
      error: e.message,
      status: e.response?.status,
      statusText: e.response?.statusText
    };
  }
  return res;
};
