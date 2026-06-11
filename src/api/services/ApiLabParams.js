import api from "./axiosService";
import config from "../../config";
import { LAB_PARAMS_RESULTS } from "../../utils/constants";

const baseUrl = { customBaseUrl: config.lab_params_api_url };

export const fetchAllLabReports = async function (doctorId, patientId) {
  let res = {};
  try {
    res = await api.get(`/results/${doctorId}/${patientId}`, baseUrl);
    res = res.data;
  } catch (e) {
    console.error("Error while fetching patient's lab reports: ", e);
  }
  return res;
};

export const fetchSearchReportParams = async function (searchText) {
  let res = {};
  try {
    res = await api.get(`?search=${searchText}`, baseUrl);
    res = res.data;
  } catch (e) {
    console.error("Error while fetching search report parameters: ", e);
  }
  return res;
};

export const addPatientLabReports = async function (payload) {
  let res = {};
  try {
    res = await api.post(LAB_PARAMS_RESULTS, payload, baseUrl);
  } catch (e) {
    console.error("Error while add/edit patient's lab reports: ", e);
  }
  return res;
};
