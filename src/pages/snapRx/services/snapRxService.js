import axiosService from "../../../api/services/axiosService";
import { env } from "../../../EnvironmentConfig";

const SNAP_RX_BASE_URL = `${env.digitization_api_url}/api/v1/digitization/snap-rx`;

/**
 * Upload snap rx files to the server
 * @param {File[]} files - Array of files to upload
 * @returns {Promise} - API response promise
 */
export const uploadSnapRxFiles = async (
  files,
  patientUniqueId,
  sessionId,
  fileUploadToken
) => {
  try {
    const formData = new FormData();

    // Append each file to the form data
    files.forEach((file, index) => {
      formData.append("file", file);
    });

    formData.append("patient_unique_id", patientUniqueId);
    formData.append("session_id", sessionId);

    const config = {
      customBaseUrl: SNAP_RX_BASE_URL,
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${fileUploadToken}`,
      },
      snapRxFileUpload: true,
    };

    const response = await axiosService.post("/upload-files", formData, config);
    return response;
  } catch (error) {
    console.error("Error uploading snap rx files:", error);
    throw error;
  }
};

/**
 * Get uploaded snap rx files for a patient
 * @param {string} patientUniqueId - Patient unique ID
 * @param {string} tcmId - TCM ID
 * @param {string} sessionId - Session ID
 * @returns {Promise} - API response promise
 */
export const getSnapRxFiles = async (patient_unique_id, tcm_id, session_id) => {
  try {
    const config = {
      customBaseUrl: SNAP_RX_BASE_URL,
      params: {
        patient_unique_id,
        session_id,
        tcm_id,
      },
    };

    const response = await axiosService.get("/get-files", config);
    return response;
  } catch (error) {
    console.error("Error getting snap rx files:", error);
    throw error;
  }
};

/**
 * Create snap rx with uploaded files
 * @param {string} patientUniqueId - Patient unique ID
 * @param {string[]} uploadedFiles - Array of uploaded file names
 * @param {string} sessionId - Session ID
 * @returns {Promise} - API response promise
 */
export const createSnapRx = async (
  patientUniqueId,
  uploadedFiles,
  sessionId,
  pamId
) => {
  try {
    const config = {
      customBaseUrl: SNAP_RX_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const requestData = {
      patient_unique_id: patientUniqueId,
      files: uploadedFiles,
      session_id: sessionId,
      pam_id: pamId || 0,
    };

    const response = await axiosService.post("/create-rx", requestData, config);
    return response;
  } catch (error) {
    console.error("Error creating snap rx:", error);
    throw error;
  }
};

/**
 * Get snap rx digitization
 * @param {string} patientUniqueId - Patient unique ID
 * @param {string} tcmId - TCM ID
 * @param {string} sessionId - Session ID
 * @returns {Promise} - API response promise
 */
export const getSnapRxDigitization = async (
  patientUniqueId,
  tcmId,
  sessionId
) => {
  try {
    const config = {
      customBaseUrl: SNAP_RX_BASE_URL,
      params: {
        patient_unique_id: patientUniqueId,
        tcm_id: tcmId,
        session_id: sessionId,
      },
    };

    const response = await axiosService.get("/get-digitization", config);
    return response;
  } catch (error) {
    console.error("Error getting snap rx digitization:", error);
    throw error;
  }
};

/**
 * Edit snap rx with uploaded files
 * @param {string} patientUniqueId - Patient unique ID
 * @param {string[]} uploadedFiles - Array of uploaded file names
 * @param {number} tcm_id - TCM ID
 * @param {string} sessionId - Session ID
 * @returns {Promise} - API response promise
 */
export const editSnapRx = async (patientUniqueId, uploadedFiles, tcm_id, sessionId) => {
  try {
    const config = {
      customBaseUrl: SNAP_RX_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const requestData = {
      patient_unique_id: patientUniqueId,
      files: uploadedFiles,
      tcm_id: tcm_id,
      session_id: sessionId,
    };

    const response = await axiosService.put("/edit-rx", requestData, config);
    return response;
  } catch (error) {
    console.error("Error editing snap rx:", error);
    throw error;
  }
};

/**
 * Digitize snap rx
 * @param {string} patientUniqueId - Patient unique ID
 * @param {string} tcmId - TCM ID
 * @param {string} sessionId - Session ID
 * @returns {Promise} - API response promise
 */
export const digitizeSnapRx = async (patientUniqueId, tcmId, sessionId) => {
  try {
    const config = {
      customBaseUrl: SNAP_RX_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const requestData = {
      patient_unique_id: patientUniqueId,
      tcm_id: tcmId,
      session_id: sessionId,
    };

    const response = await axiosService.post(
      "/digitize-rx",
      requestData,
      config
    );
    return response;
  } catch (error) {
    console.error("Error digitizing snap rx:", error);
    throw error;
  }
};

/**
 * Verify digitized snap rx
 * @param {string} patientUniqueId - Patient unique ID
 * @param {string} tcmId - TCM ID
 * @param {string} sessionId - Session ID
 * @returns {Promise} - API response promise
 */
export const verifyDigitizedSnapRx = async (
  patientUniqueId,
  tcmId,
  sessionId
) => {
  try {
    const config = {
      customBaseUrl: SNAP_RX_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const requestData = {
      patient_unique_id: patientUniqueId,
      tcm_id: tcmId,
      session_id: sessionId,
    };

    const response = await axiosService.post(
      "/verify-digitized-rx",
      requestData,
      config
    );
    return response;
  } catch (error) {
    console.error("Error verifying digitized snap rx:", error);
    throw error;
  }
};
