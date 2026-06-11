import api from "./axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.ipd_api_url || config.ipd_portal_url };

const ApiIpdService = {};

/**
 * Check if a patient is already admitted to IPD
 * @param {Object} data - Object containing patientId
 * @returns {Promise} API response
 */
ApiIpdService.checkPatientAdmitted = function ({ patientId }) {
  return api.get(
    `/patients/check-patient-admitted?patientId=${patientId}`,
    baseUrl
  );
};

export default ApiIpdService;

