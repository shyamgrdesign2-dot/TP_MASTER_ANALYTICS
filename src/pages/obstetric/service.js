import api from "../../api/services/axiosService";
import config from "../../config";
import { getDecodedToken } from "../../utils/localStorage";

const baseUrl = { customBaseUrl: config.obstetric_api_url };
const ancImmunisationbaseUrl = { customBaseUrl: config.growth_chart_api_url };

export const fetchAllObstetricDetails = async function (
  patient_unique_id,
  userId,
  todaysExamination,
  gravidity
) {
  let res = {};
  try {
    const decodedToken = getDecodedToken();
    const doctorId = decodedToken?.result?.user_id;
    res = await api.get(
      `/obstetric/${patient_unique_id}/${userId || doctorId}${
        todaysExamination ? "?todaysExamination=true" : ""
      }${gravidity ? `&gravidaNumber=${gravidity}` : ""}`,
      ancImmunisationbaseUrl
    );
    res = res.data;
  } catch (e) {
    console.error("Error while fetching obstetric details: ", e);
  }
  return res;
};

export const addObstetricData = async function (payload) {
  let res = {};
  try {
    res = await api.post(`/obstetric`, payload, baseUrl);
  } catch (e) {
    console.error("Error while adding Obstetric Data: ", e);
  }
  return res;
};

export const updateObstetricData = async function (id, payload, userId) {
  let res = {};
  try {
    res = await api.patch(`/obstetric/${id}/${userId}`, payload, baseUrl);
  } catch (e) {
    console.error("Error while updating Obstetric Data: ", e);
  }
  return res;
};

export const fetchPrefillObstetricDetails = async function (patient_unique_id) {
  let res = {};
  try {
    res = await api.get(`/prefilled/${patient_unique_id}`, baseUrl);
    res = res.data;
  } catch (e) {
    console.error("Error while fetching prefill obstetric details: ", e);
  }
  return res;
};

/**
 * Normalize prefill payload for API: height and weight must be integers (API requirement).
 * Strips units (e.g. "170m", "70 kg") and parses to number; omits key if invalid.
 */
function normalizePrefillPayload(payload) {
  const normalized = payload && typeof payload === "object" ? { ...payload } : {};
  if (normalized.height !== undefined && normalized.height !== null && String(normalized.height).trim() !== "") {
    const num = parseInt(String(normalized.height).replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(num)) normalized.height = num;
    else delete normalized.height;
  }
  if (normalized.weight !== undefined && normalized.weight !== null && String(normalized.weight).trim() !== "") {
    const num = parseFloat(String(normalized.weight).replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(num)) normalized.weight = Math.round(num);
    else delete normalized.weight;
  }
  return normalized;
}

export const updatePrefillObstetricData = async function (payload, userId) {
  let res = {};
  try {
    const normalizedPayload = normalizePrefillPayload(payload);
    res = await api.patch(`/prefilled/${userId}`, normalizedPayload, baseUrl);
  } catch (e) {
    console.error("Error while updating prefill Obstetric Data: ", e);
  }
  return res;
};

export const fetchDefaultAnc = async function () {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/gyneac/anc-scheduler/default-list`,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error("Error while fetching default ANC Scheduler details: ", e);
  }
  return res;
};

export const fetchSearchAnc = async function (searchQuery, patientUniqueId) {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/gyneac/anc-scheduler/search?search=${searchQuery}&patient_unique_id=${patientUniqueId}`,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error(
      "Error while fetching serach diagnosis for ANC Scheduler: ",
      e
    );
  }
  return res;
};

export const upsertCustomAncScheduler = async function (payload) {
  let res = {};
  try {
    res = await api.post(
      `/api/v1/gyneac/anc-scheduler`,
      payload,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error("Error while upserting custom ANC Scheduler: ", e);
  }
  return res;
};

export const deleteCustomAncScheduler = async function (id) {
  let res = {};
  try {
    res = await api.delete(
      `/api/v1/gyneac/anc-scheduler/${id}`,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error("Error while deleting custom ANC Scheduler: ", e);
  }
  return res;
};

export const fetchDefaultImmunisation = async function () {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/gyneac/immunisation/default-list`,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error("Error while fetching default Immunisation details: ", e);
  }
  return res;
};

export const fetchSearchImmunisation = async function (
  searchQuery,
  patientUniqueId
) {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/gyneac/immunisation/search?search=${searchQuery}&patient_unique_id=${patientUniqueId}`,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error(
      "Error while fetching serach diagnosis for Immunisation: ",
      e
    );
  }
  return res;
};

export const upsertCustomImmunisation = async function (payload) {
  let res = {};
  try {
    res = await api.post(
      `/api/v1/gyneac/immunisation`,
      payload,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error("Error while upserting custom Immunisation: ", e);
  }
  return res;
};

export const deleteCustomImmunisation = async function (id) {
  let res = {};
  try {
    res = await api.delete(
      `/api/v1/gyneac/immunisation/${id}`,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error("Error while deleting custom Immunisation: ", e);
  }
  return res;
};

export const fetchImmunisationDoctorList = async function () {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/gyneac/immunisation/doctor-list`,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error(
      "Error while fetching doctor list for Immunisation details: ",
      e
    );
  }
  return res;
};

export const fetchAncDoctorList = async function () {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/gyneac/anc-scheduler/doctor-list`,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error(
      "Error while fetching doctor list for ANC Scheduler details: ",
      e
    );
  }
  return res;
};

export const fetchObstetricDetails = async function (
  patientUniqueId,
  userId,
  todaysExamination
) {
  let res = {};
  const decodedToken = getDecodedToken();
  const doctorId = decodedToken?.result?.user_id;
  try {
    res = await api.get(
      `/api/v1/gyneac/obstetric-history/${patientUniqueId}/${userId || doctorId}${
        todaysExamination ? "?todaysExamination=true" : ""
      }`,
      ancImmunisationbaseUrl
    );
    res = res?.data;
  } catch (e) {
    console.error("Error while fetching Obstetric details: ", e);
  }
  return res;
};

export const upsertObstetricDetails = async function (
  patientUniqueId,
  payload
) {
  let res = {};
  try {
    res = await api.post(
      `/api/v1/gyneac/obstetric-history/${patientUniqueId}`,
      payload,
      ancImmunisationbaseUrl
    );
    res = res?.data;
  } catch (e) {
    console.error("Error while upserting Obstetric details: ", e);
  }
  return res;
};

export const fetchTour = async function () {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/gyneac/obstetric-history/tour`,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error("Error while fetching Tour details: ", e);
  }
  return res;
};

export const updateTour = async function (payload) {
  let res = {};
  try {
    res = await api.post(
      `/api/v1/gyneac/obstetric-history/tour`,
      payload,
      ancImmunisationbaseUrl
    );
  } catch (e) {
    console.error("Error while updating Tour details: ", e);
  }
  return res;
};
