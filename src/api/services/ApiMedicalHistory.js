import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.medicalhistory_api_url }

const ApiMedicalHistory = {};

ApiMedicalHistory.getPatientLastHistory = function (data) {
  return api.post(`/api/v1/medicalhistory/getPatientLastHistory`, data, baseUrl);
};

ApiMedicalHistory.listSectionwithTag = function () {
  return api.get(`/api/v1/medicalhistory/listSectionwithTag`, baseUrl);
};

ApiMedicalHistory.addTag = function (data) {
  return api.post(`/api/v1/medicalhistory/addTag`, data, baseUrl);
};

ApiMedicalHistory.searchTag = function (data) {
  return api.post(`/api/v1/medicalhistory/searchTag`, data, baseUrl);
};

ApiMedicalHistory.addEditPrivateNotes = function (data) {
  return api.post(`/api/v1/privatenotes/addPrivateNotes`, data, baseUrl);
};

ApiMedicalHistory.listPrivateNotes = function (data) {
  return api.post(`/api/v1/privatenotes/listPrivateNotes`, data, baseUrl);
};

ApiMedicalHistory.deletePrivateNotes = function (data) {
  return api.post(`/api/v1/privatenotes/deletePrivateNotes`, data, baseUrl);
};

export default ApiMedicalHistory;
