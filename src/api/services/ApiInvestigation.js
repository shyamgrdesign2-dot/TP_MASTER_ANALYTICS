import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.investigation_api_url }
const baseSearchEngineUrl = { customBaseUrl: config.searchengine_url };
const fuzzySearchBaseUrl = { customBaseUrl: config.searchengine_url };

const ApiInvestigation = {};

ApiInvestigation.addTemplate = function (template) {
  return api.post(`/api/v1/investigation/addTemplate`, template, baseUrl);
};

ApiInvestigation.updateTemplate = function (template) {
  return api.post(`/api/v1/investigation/editTemplate`, template, baseUrl);
};

ApiInvestigation.deleteTemplate = function (templateId) {
  return api.get(`/api/v1/investigation/deleteTemplate/${templateId}`, baseUrl);
};

ApiInvestigation.getFuzzySearch = function (query, max_results = 1) {
  return api.get(
    `/api/v1/investigation/fuzzySearch?search=${query}&max_results=${max_results}`,
    fuzzySearchBaseUrl
  );
};

ApiInvestigation.getInvestigationTemplates = function (query) {
  return api.get(`/api/v1/investigation/listTemplate`, baseUrl);
};

ApiInvestigation.singleTemplateDetails = function (templateId) {
  return api.get(`/api/v1/investigation/singleTemplateDetails/${templateId}`, baseUrl);
};

ApiInvestigation.getFrequentlySearchedInvestigation = function () {
  return api.get(`/api/v1/investigation/frequentlyInvestigations`, baseSearchEngineUrl);
};

// ApiInvestigation.getFrequentlySearchedInvestigation = function () {
//   return api.post(`/api/v1/investigation/searchInvestigation`, {
//       search: "li"
//   }, baseUrl);
// };

ApiInvestigation.searchInvestigation = function (query) {
  return api.post(`/api/v1/investigation/search`, {
    search: query
  }, baseSearchEngineUrl);
};

export default ApiInvestigation;
