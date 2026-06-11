import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.symptoms_api_url }
const baseSearchEngineUrl = { customBaseUrl: config.searchengine_url };

const ApiSymptoms = {};

ApiSymptoms.addTemplate = function (template) {
  return api.post(`/api/v1/symptoms/addTemplate`, template, baseUrl);
};

ApiSymptoms.updateTemplate = function (template) {
  return api.post(`/api/v1/symptoms/editTemplate`, template, baseUrl);
};

ApiSymptoms.deleteTemplate = function (templateId) {
  return api.get(`/api/v1/symptoms/deleteTemplate/${templateId}`, baseUrl);
};

ApiSymptoms.getSymptomsTemplates = function (query) {
  return api.get(`/api/v1/symptoms/listTemplate`, baseUrl);
};

ApiSymptoms.getFrequentlySearchedSymptoms = function () {
  return api.get(`/api/v1/symptom/frequentlySymptoms`, baseSearchEngineUrl);
};

// ApiSymptoms.getFrequentlySearchedSymptoms = function () {
//   return api.post(`/api/v1/symptoms/searchSymptoms`, {
//       search: "CD Title"
//   }, baseUrl);
// };

ApiSymptoms.searchSymptoms = function (query) {
  return api.post(`/api/v1/symptom/search`, {
    search: query
  }, baseSearchEngineUrl);
};

ApiSymptoms.singleTemplateDetails = function (templateId) {
  return api.get(`/api/v1/symptoms/singleTemplateDetails/${templateId}`, baseUrl);
};


export default ApiSymptoms;
