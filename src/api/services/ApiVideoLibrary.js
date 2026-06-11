import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.videolibrary_api_url }

const ApiVideoLibrary = {};

ApiVideoLibrary.listVideo = function () {
  return api.get(`/api/v1/videolibrary/listVideo`, baseUrl);
};

ApiVideoLibrary.viewDoctorWebsite = function () {
  return api.get(`/api/v1/doctorwebsite/viewDoctorWebsite`, baseUrl);
};

ApiVideoLibrary.listLanguage = function () {
  return api.get(`/api/v1/doctorwebsite/listLanguage`, baseUrl);
};

ApiVideoLibrary.saveDoctorWebsite = function (formData, onUploadProgress, onDownloadProgress, cancelToken) {
  return api.post(`/api/v1/doctorwebsite/saveDoctorWebsite`,
    formData,
    {
      ...baseUrl,
      onUploadProgress: onUploadProgress,
      onDownloadProgress: onDownloadProgress,
      timeout: 300000,
      cancelToken: cancelToken,
    });
};

ApiVideoLibrary.publishDoctorWebsite = function (data) {
  return api.post(`/api/v1/doctorwebsite/publishDoctorWebsite`, data, baseUrl);
};

ApiVideoLibrary.doctorOpenAI = function (data) {
  return api.post(`/api/v1/doctorwebsite/doctorOpenAI`, data, baseUrl);
};

export default ApiVideoLibrary;
