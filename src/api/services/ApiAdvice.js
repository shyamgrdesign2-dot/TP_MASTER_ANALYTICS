import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.advice_api_url }
const baseSearchEngineUrl = { customBaseUrl: config.searchengine_url };

const ApiAdvice = {};

ApiAdvice.addTemplate = function (template) {
  return api.post(`/api/v1/advice/addTemplate`, template, baseUrl);
};

ApiAdvice.updateTemplate = function (template) {
  return api.post(`/api/v1/advice/editTemplate`, template, baseUrl);
};

ApiAdvice.deleteTemplate = function (templateId) {
  return api.get(`/api/v1/advice/deleteTemplate/${templateId}`, baseUrl);
};

ApiAdvice.getAdviceTemplates = function (query) {
  return api.get(`/api/v1/advice/listTemplate`, baseUrl);
};

ApiAdvice.getFrequentlySearchedAdvice = function () {
  return api.get(`/api/v1/advice/frequentlyAdvice`, baseSearchEngineUrl);
};

// ApiAdvice.getFrequentlySearchedAdvice = function () {
//   return api.post(`/api/v1/advice/searchAdvice`, {
//       search: "sub"
//   }, baseUrl);
// };

ApiAdvice.searchAdvice = function (query) {
  return api.post(`/api/v1/advice/searchAdvice`, {
    search: query
  }, baseSearchEngineUrl);
};

export default ApiAdvice;
