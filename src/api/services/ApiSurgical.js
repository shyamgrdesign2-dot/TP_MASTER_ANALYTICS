import api from "./axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.lab_params_api_url };

const ApiSurgical = {};

ApiSurgical.addTemplate = function (template) {
  return api.post(`/api/v1/surgery-templates`, template, baseUrl);
};

ApiSurgical.updateTemplate = function (template, templateId) {
  return api.put(`/api/v1/surgery-templates/${templateId}`, template, baseUrl);
};

ApiSurgical.deleteTemplate = function (templateId) {
  return api.delete(`/api/v1/surgery-templates/${templateId}`, baseUrl);
};

ApiSurgical.getExaminationTemplates = function (query) {
  return api.get(`/api/v1/surgery-templates/list`, baseUrl);
};

ApiSurgical.searchExamination = function (query) {
  return api.get(`/api/v1/surgeries/list?search=${query}`, baseUrl);
};

ApiSurgical.createSurgery = function (payload) {
  return api.post(`/api/v1/surgeries`, payload, baseUrl);
};

export default ApiSurgical;
