import api from "./axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.printsettings_api_url };

export const fetchPatientDefaultLanguage = async function (patientId) {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/printsettings/patient-print-settings?patientId=${patientId}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching Patient default language: ", e);
  }
  return res;
};

export const updatePatientDefaultLanguage = async function (payload) {
  let res = {};
  try {
    res = await api.post(
      `/api/v1/printsettings/patient-print-settings`,
      payload,
      baseUrl
    );
  } catch (e) {
    console.error("Error while updating Patient default language: ", e);
  }
  return res;
};