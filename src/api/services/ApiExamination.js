import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.examination_api_url }
const baseSearchEngineUrl = { customBaseUrl: config.searchengine_url };

const ApiExamination = {};

ApiExamination.addTemplate = function (template) {
  return api.post(`/api/v1/examination/addTemplate`, template, baseUrl);
};

ApiExamination.updateTemplate = function (template) {
  return api.post(`/api/v1/examination/editTemplate`, template, baseUrl);
};

ApiExamination.deleteTemplate = function (templateId) {
  return api.get(`/api/v1/examination/deleteTemplate/${templateId}`, baseUrl);
};

ApiExamination.getExaminationTemplates = function (query) {
  return api.get(`/api/v1/examination/listTemplate`, baseUrl);
};

ApiExamination.getFrequentlySearchedExamination = function () {
  return api.get(`/api/v1/examination/frequentlyExaminations`, baseSearchEngineUrl);
};

// ApiExamination.getFrequentlySearchedExamination = function () {
//   return api.post(`/api/v1/examination/searchExamination`, {
//       search: "CD Title"
//   }, baseUrl);
// };

ApiExamination.searchExamination = function (query) {
  return api.post(`/api/v1/examination/search`, {
    search: query
  }, baseSearchEngineUrl);
};

ApiExamination.singleTemplateDetails = function (templateId) {
  return api.get(`/api/v1/examination/singleTemplateDetails/${templateId}`, baseUrl);
};

export default ApiExamination;
