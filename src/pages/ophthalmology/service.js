import api from "../../api/services/axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.opthal_prescription_api_url };

const buildQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) {
    return "";
  }
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return `?${query}`;
};

export const createOpthalPrescription = async (payload, params = {}) => {
  let res = {};
  try {
    res = await api.post(`/api/v1/opthal-prescription${buildQueryString(params)}`, payload, baseUrl);
  } catch (e) {
    console.error("Error while creating opthal prescription:", e);
  }
  return res;
};

export const updateOpthalPrescription = async (id, payload, params = {}) => {
  let res = {};
  try {
    res = await api.post(
      `/api/v1/opthal-prescription${buildQueryString({ _id: id, ...params })}`,
      payload,
      baseUrl
    );
  } catch (e) {
    console.error("Error while updating opthal prescription:", e);
  }
  return res;
};

export const getAllOpthalPrescriptions = async (params = {}) => {
  let res = {};
  try {
    res = await api.get(`/api/v1/opthal-prescription${buildQueryString(params)}`, baseUrl);
    res = res?.data ?? res;
  } catch (e) {
    console.error("Error while fetching opthal prescriptions:", e);
  }
  return res;
};

export const getOpthalPrescriptionDetails = async (params = {}) => {
  let res = {};
  try {
    const { signal, ...queryParams } = params;
    
    const axiosConfig = {
      ...baseUrl,
      signal,
    };
    
    res = await api.get(
      `/api/v1/opthal-prescription${buildQueryString(queryParams)}`,
      axiosConfig
    );
    res = res?.data ?? res;
  } catch (e) {
    console.error("Error while fetching opthal prescription details:", e);
  }
  return res;
};

export const getLastOpthalPrescription = async (params = {}) => {
  let res = {};
  try {
    res = await api.get(`/api/v1/opthal-prescription/last${buildQueryString(params)}`, baseUrl);
    res = res?.data ?? res;
  } catch (e) {
    console.error("Error while fetching last opthal prescription:", e);
  }
  return res;
};
