import axios from "axios";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../../utils/constants";
import config from "../../../config";

/**
 * Initializes the onboarding process and gets any pre-existing user data
 * @param {string} phone_number - User's phone number
 * @param {Object} utmParams - UTM parameters
 * @param {string} deviceSource - Normalized device source
 * @returns {Promise} Promise with the response containing user data
 */
export const initOnboarding = async (phone_number, utmParams, deviceSource) => {
  try {
    const response = await axios.post(
      `${config.central_auth_api_url}/api/v1/onBoarding/InIt`,
      {
        phone_number,
        ...utmParams,
        ...(deviceSource ? { device_source: deviceSource } : {}),
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error initializing onboarding:", error);
    throw error;
  }
};

/**
 * Updates doctor onboarding details
 * @param {Object} doctorData - Doctor's information
 * @param {string} doctorData.id - Doctor's unique ID
 * @param {string} doctorData.phone_number - Doctor's phone number
 * @param {string} doctorData.doctorName - Doctor's full name
 * @param {number} doctorData.departmentId - Department/Speciality ID
 * @param {string} doctorData.utm_source - UTM source
 * @param {string} doctorData.utm_campaign - UTM campaign
 * @param {string} doctorData.utm_term - UTM term
 * @param {string} doctorData.utm_content - UTM content
 * @param {string} doctorData.utm_medium - UTM medium
 * @returns {Promise} Promise with the response
 */
export const updateOnboardingDetails = async (doctorData) => {
  try {
    const response = await axios.post(
      `${config.central_auth_api_url}/api/v1/onBoarding/updateDetails`,
      doctorData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating onboarding details:", error);
    throw error;
  }
};

/**
 * Updates clinic location coordinates
 * @param {Object} locationData - Clinic location data
 * @param {string} locationData.clinic_lat - Latitude of the clinic
 * @param {string} locationData.clinic_long - Longitude of the clinic
 * @param {string} authToken - JWT authentication token
 * @returns {Promise} Promise with the response
 */
export const updateLocation = async (locationData, authToken) => {
  try {
    // Get auth token from localStorage if not provided
    let token = authToken;

    if (!token) {
      const rawToken = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
      if (!rawToken) {
        throw new Error("Authentication token not found");
      }
      token = JSON.parse(rawToken);
    }

    const response = await axios.post(
      `${config.central_auth_api_url}/api/v1/onBoarding/updateLocation`,
      locationData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating location:", error);
    throw error;
  }
};

/**
 * Finalizes doctor onboarding with clinic details
 * @param {Object} doctorData - Doctor's information including clinic details
 * @param {string} doctorData.id - Doctor's unique ID
 * @param {string} doctorData.phone_number - Doctor's phone number
 * @param {string} doctorData.doctorName - Doctor's full name
 * @param {number} doctorData.departmentId - Department/Speciality ID
 * @param {string} doctorData.utm_source - UTM source
 * @param {string} doctorData.utm_campaign - UTM campaign
 * @param {string} doctorData.utm_term - UTM term
 * @param {string} doctorData.utm_content - UTM content
 * @param {string} doctorData.utm_medium - UTM medium
 * @param {string} doctorData.clinicName - Name of the clinic
 * @param {string} doctorData.clinicAddress - Address of the clinic
 * @param {string} doctorData.clinicPincode - Pincode of the clinic
 * @param {string} doctorData.clinic_lat - Latitude of the clinic
 * @param {string} doctorData.clinic_long - Longitude of the clinic
 * @returns {Promise} Promise with the response
 */
export const finalizeOnboarding = async (doctorData) => {
  try {
    const response = await axios.post(
      `${config.central_auth_api_url}/api/v1/onBoarding/finalize`,
      doctorData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error finalizing onboarding:", error);
    throw error;
  }
};

/**
 * Uploads doctor verification documents
 * @param {File} governmentProof - Government ID proof document
 * @param {File} mrcCertificate - Medical Registration Certificate
 * @param {string} authToken - JWT authentication token
 * @returns {Promise} Promise with the response
 */
export const uploadDocuments = async (
  governmentProof,
  mrcCertificate,
  authToken
) => {
  try {
    // Create a FormData object for file upload
    const formData = new FormData();
    if (governmentProof) {
      formData.append("goverment_proof", governmentProof);
    }
    if (mrcCertificate) {
      formData.append("mrc_certificate", mrcCertificate);
    }

    // Get auth token from localStorage if not provided
    let token = authToken;

    if (!token) {
      const rawToken = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
      if (!rawToken) {
        throw new Error("Authentication token not found");
      }
      token = JSON.parse(rawToken);
    }

    const response = await axios.post(
      `${config.central_auth_api_url}/api/v1/onBoarding/uploadDocument`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading documents:", error);
    throw error;
  }
};
