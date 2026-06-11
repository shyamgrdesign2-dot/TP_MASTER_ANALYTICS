import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.appointment_api_url }

const ApiMedicalCertificate = {};

ApiMedicalCertificate.listCertificate = function () {
  return api.get(`/api/v1/appointment/listCertificate`, baseUrl);
};

ApiMedicalCertificate.deleteCertificate = function (certificateId) {
  return api.get(`/api/v1/appointment/deleteCertificate/${certificateId}`, baseUrl);
};

ApiMedicalCertificate.addCertificate = function (data) {
  return api.post(`/api/v1/appointment/addCertificate`, data, baseUrl);
};

ApiMedicalCertificate.addPatientCertificate = function (data) {
  return api.post(`/api/v1/appointment/addPatientCertificate`, data, baseUrl);
};

ApiMedicalCertificate.editPatientCertificate = function (data) {
  return api.post(`/api/v1/appointment/editPatientCertificate`, data, baseUrl);
};

ApiMedicalCertificate.listPatientCertificate = function (data) {
  return api.post(`/api/v1/appointment/listPatientCertificate`, data, baseUrl);
};

ApiMedicalCertificate.deletePatientCertificate = function (data) {
  return api.post(`/api/v1/appointment/deletePatientCertificate`, data, baseUrl);
};

ApiMedicalCertificate.viewPatientCertificate = function (data) {
  return api.post(`/api/v1/appointment/viewPatientCertificate`, data, baseUrl);
};

export default ApiMedicalCertificate;
