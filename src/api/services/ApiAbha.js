import axios from "axios";
import api from "./axiosService";
import config from "../../config";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";

const baseUrl = { customBaseUrl: config.abha_api_url };
const abhaRecordsApiUrl = { customBaseUrl: config.abha_records_api_url };
const ipdBaseUrl = { customBaseUrl: config.ipd_api_url };

const ApiAbha = {};

ApiAbha.sendOtpForAadhaar = function (data) {
  return api.post(
    `/api/v1/abdm/m1/enrollmentByAadhaar/request-otp`,
    data,
    baseUrl
  );
};

ApiAbha.verifyOtpForAadhaar = function (data) {
  return api.post(
    `/api/v1/abdm/m1/enrollmentByAadhaar/verify-otp`,
    data,
    baseUrl
  );
};

ApiAbha.verifyFingerPrintForAadhaar = function (data) {
  const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const authToken = token ? JSON.parse(token) : null;
  
  return axios.post(
    `${config.abha_api_url}/api/v1/abdm/m1/enrollmentByAadhaar/verify-fingerPrint`,
    data,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  ).then(response => {
    return {
      success: response.status === 200,
      data: response.data,
      message: response.data?.message || 'Success',
    };
  }).catch(error => {
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Failed to verify fingerprint',
      data: error?.response?.data,
    };
  });
};

ApiAbha.getSuggestionAbhaAddressList = function (data) {
  return api.post(
    `/api/v1/abdm/m1/enrollmentByAadhaar/suggestion-abhaAddressList`,
    data,
    baseUrl
  );
};

ApiAbha.checkAbhaAddressAvailability = function (data) {
  return api.post(
    `/api/v1/abdm/m1/enrollmentByAadhaar/isAbhaIdExists`,
    data,
    baseUrl
  );
};

ApiAbha.setAbhaAddress = function (data) {
  return api.post(
    `/api/v1/abdm/m1/enrollmentByAadhaar/set-abhaAddress`,
    data,
    baseUrl
  );
};

ApiAbha.sendOtpForAbhaAddress = function (data) {
  return api.post(
    `/api/v1/abdm/m1/enrollmentByAadhaar/abhaAddress-request-otp`,
    data,
    baseUrl
  );
};

ApiAbha.verifyOtpForAbhaAddress = function (data) {
  return api.post(
    `/api/v1/abdm/m1/enrollmentByAadhaar/abhaAddress-verify-otp`,
    data,
    baseUrl
  );
};

ApiAbha.verifyMobileUpdateOtp = function (data) {
  return api.post(
    `/api/v1/abdm/m1/enrollmentByAadhaar/mobileUpdate/verify-otp`,
    data,
    baseUrl
  );
};

ApiAbha.sendOtpForMobileLink = function (data) {
  return api.post(
    `/api/v1/abdm/m1/abhaVerification/mobile-request-otp`,
    data,
    baseUrl
  );
};

ApiAbha.verifyOtpForMobileLink = function (data) {
  return api.post(
    `/api/v1/abdm/m1/abhaVerification/mobile-verify-otp`,
    data,
    baseUrl
  );
};

ApiAbha.verifyAbhaAddressUser = function (data) {
  return api.post(
    `/api/v1/abdm/m1/abhaVerification/abhaAddress-user-verify`,
    data,
    baseUrl
  );
};

ApiAbha.sendOtpForAbhaAddressLink = function (data) {
  return api.post(
    `/api/v1/abdm/m1/abhaVerification/abhaAddress-request-otp`,
    data,
    baseUrl
  );
};

ApiAbha.verifyOtpForAbhaAddressLink = function (data) {
  return api.post(
    `/api/v1/abdm/m1/abhaVerification/abhaAddress-verify-otp`,
    data,
    baseUrl
  );
};

ApiAbha.sendOtpForAbhaNumberLink = function (data) {
  return api.post(
    `/api/v1/abdm/m1/abhaVerification/abhaNumber-request-otp`,
    data,
    baseUrl
  );
};

ApiAbha.verifyOtpForAbhaNumberLink = function (data) {
  return api.post(
    `/api/v1/abdm/m1/abhaVerification/abhaNumber-verify-otp`,
    data,
    baseUrl
  );
};

ApiAbha.linkPatientUniqueidWithAbha = function (data) {
  return api.post(
    `/api/v1/abdm/m1/enrollmentByAadhaar/updatePatientUniqueid`,
    data,
    baseUrl
  );
};

/**
 * Fetch ABHA details for a patient by patientUniqueId (IPD API).
 * @param {string} patientUniqueId - Patient unique ID
 * @returns {Promise} API response
 */
ApiAbha.fetchAbhaDetails = function (patientUniqueId) {
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  return api.get(
    `/${isReceptionist ? "kia" : "patients"}/fetch-abha-details?patientUniqueId=${patientUniqueId}`,
    ipdBaseUrl
  );
};

ApiAbha.downloadAbhaCard = function (data) {
  // Used axios directly for blob response
  const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const authToken = token ? JSON.parse(token) : null;
  
  return axios.post(
    `${config.abha_api_url}/api/v1/abdm/m1/enrollmentByAadhaar/downloadAbha`,
    data,
    {
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

ApiAbha.getPHRQrScannerData = function () {
  const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const authToken = token ? JSON.parse(token) : null;
  
  return axios.get(
    `${config.abha_api_url}/api/v1/abha/getPHRQrScannerData`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

export const getAbhaConsentList = async function (payload = {}) {
  const body = {
    search: payload.search !== undefined ? payload.search : "",
    page: payload.page !== undefined ? payload.page : 0,
    abhaAddress: payload.abhaAddress,
  };

  try {
    if (!config.abha_records_api_url) {
      console.error("abha_records_api_url is not configured in config");
    }

    const response = await api.post(
      `/api/v1/abdm/m3/hiuConsent/listConsent`,
      body,
      abhaRecordsApiUrl
    );
    return response;
  } catch (error) {
    console.error("Error while fetching ABHA consent list: ", error);
    throw error;
  }
};

export const viewDetailsConsent = async function (consentId) {
  const body = {
    consent_id_request: consentId,
  };

  try {
    if (!config.abha_records_api_url) {
      console.error("abha_records_api_url is not configured in config");
    }

    const response = await api.post(
      `/api/v1/abdm/m3/hiuConsent/viewDetailsConsent`,
      body,
      abhaRecordsApiUrl
    );
    return response;
  } catch (error) {
    console.error("Error while fetching consent details: ", error);
    throw error;
  }
};

export const requestInitialConsent = async function (payload = {}) {
  try {
    if (!config.abha_records_api_url) {
      console.error("abha_records_api_url is not configured in config");
    }

    const response = await api.post(
      `/api/v1/abdm/m3/hiuConsent/requestInitialConsent`,
      payload,
      abhaRecordsApiUrl
    );
    return response;
  } catch (error) {
    console.error("Error while requesting initial consent: ", error);
    throw error;
  }
};

export const fetchHealthRecordDetail = async function (recordId, consentId) {
  const body = {
    record_id: recordId,
    consent_id_request: consentId,
  };

  try {
    if (!config.abha_records_api_url) {
      console.error("abha_records_api_url is not configured in config");
    }

    const response = await api.post(
      `/api/v1/abdm/m3/hiuConsent/fetchHealthRecord`,
      body,
      abhaRecordsApiUrl
    );
    return response;
  } catch (error) {
    console.error("Error while fetching health record detail: ", error);
    throw error;
  }
};

export const viewConsentRecord = async function (consentId, recordId) {
  const body = {
    consent_id_request: consentId,
    recordId,
    request_id: recordId,
  };

  try {
    if (!config.abha_records_api_url) {
      console.error("abha_records_api_url is not configured in config");
    }

    const response = await api.post(
      `/api/v1/abdm/m3/hiuConsent/viewConsentRecord`,
      body,
      abhaRecordsApiUrl
    );
    return response;
  } catch (error) {
    console.error("Error while fetching consent record: ", error);
    throw error;
  }
};

ApiAbha.generateLinkCareContextToken = function (data) {
  return api.post(
    `/api/v1/abdm/m2/linkCareContext/generate-token`,
    data,
    baseUrl
  );
};

export default ApiAbha;