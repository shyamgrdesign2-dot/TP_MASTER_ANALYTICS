import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.vitals_api_url }
const baseGrowthChartUrl = { customBaseUrl: config.growth_chart_api_url };

const ApiVitals = {};

ApiVitals.addUpdateVitals = function (data) {
  return api.post(`/api/v1/vital/addVitals`, data, baseUrl);
};

ApiVitals.getVitals = function (data) {
  return api.post(`/api/v1/vital/listVitals`, data, baseUrl);
};

ApiVitals.getPatientBirthWeight = function (data) {
  return api.post(`/api/v1/vital/get-patient-birth-weight`, data, baseUrl);
};

ApiVitals.getTodayWeight = function (pm_id, pm_pid) {
  return api.get(`/api/v1/body-composition/today-weight?pm_id=${pm_id}&pm_pid=${pm_pid}`, baseGrowthChartUrl);
};

ApiVitals.updateTodayWeight = function (data) {
  return api.post(`/api/v1/body-composition/today-weight`, data, baseGrowthChartUrl);
};

export default ApiVitals;
