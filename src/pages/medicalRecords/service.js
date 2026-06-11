import api from "../../api/services/axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.lab_params_api_url };

export const fetchAllDocumentCategories = async function () {
  let res = [];
  try {
    res = await api.get("/api/v1/docs/category/all", baseUrl);
  } catch (e) {
    console.error("Error while fetching all document categories: ", e);
  }
  return res;
};

export const uploadDocument = async function (payload) {
  let res = [];
  try {
    res = await api.post(`/api/v1/docs/upload`, payload, baseUrl);
  } catch (e) {
    console.error("Error while uploading document: ", e);
  }
  return res;
};

export const updateDocument = async function (payload) {
  let res = {};
  try {
    res = await api.put(`/api/v1/docs`, payload, baseUrl);
  } catch (e) {
    console.error("Error while updating document: ", e);
  }
  return res;
};

export const fetchAllPatientDocs = async function (patientUniqueId) {
  let res = [];
  try {
    res = await api.get(
      `/api/v1/docs/all?patient_unique_id=${patientUniqueId}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching all patient documents: ", e);
  }
  return res;
};

export const fetchDocById = async function (docId) {
  let res = [];
  try {
    res = await api.get(`/api/v1/docs/${docId}`, baseUrl);
  } catch (e) {
    console.error("Error while fetching document by id: ", e);
  }
  return res;
};

export const deleteDocById = async function (id) {
  let res = [];
  try {
    res = await api.delete(`/api/v1/docs/${id}`, baseUrl);
  } catch (e) {
    console.error("Error while deleting the document: ", e);
  }
  return res;
};

export const deleteDocsUploadedFromAndroid = async function (
  patient_unique_id,
) {
  let res = [];
  try {
    res = await api.delete(
      patient_unique_id
        ? "/api/v1/docs/cleanup-temp"
        : `/api/v1/docs/cleanup-temp?patient_unique_id=${patient_unique_id}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while deleting the document: ", e);
  }
  return res;
};

export const fetchDocsUploadedByPatient = async function (patientUniqueId) {
  let res = [];
  try {
    res = await api.get(
      `api/v1/docs/myt?patient_unique_id=${patientUniqueId}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching documents uploaded by patient: ", e);
  }
  return res;
};

export const uploadDocsToAzure = async (payload) => {
  let res = [];
  try {
    res = await api.post(`/api/v1/docs/upload-temp`, payload, baseUrl);
  } catch (e) {
    console.error("Error while uploading document to azure: ", e);
  }
  return res;
};
