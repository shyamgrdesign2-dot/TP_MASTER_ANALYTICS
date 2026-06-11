import api from "../../api/services/axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.growth_chart_api_url };

export const getAllGrowthChartParams = async function ({
  pm_id,
  pm_pid,
  date,
}) {
  let allGrowthChartParams = [];
  try {
    allGrowthChartParams = await api.get(
      `growthChart/all?pm_id=${pm_id}&pm_pid=${pm_pid}${
        date ? `&created_date=${date}` : ""
      }`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching allGrowthChartParams", e);
  }
  return allGrowthChartParams;
};

export const getTodayGrowthChartParams = async function ({
  pm_id,
  pm_pid,
  date,
  source,
}) {
  let allGrowthChartParams = [];
  try {
    allGrowthChartParams = await api.get(
      `growthChart/all?pm_id=${pm_id}&pm_pid=${pm_pid}${
        date ? `&created_date=${date}&source=${source}` : ""
      }`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching allGrowthChartParams", e);
  }
  return allGrowthChartParams;
};

export const getGrowthChartParamsById = async (pm_id, pm_pid) => {
  let res = {};
  try {
    res = await api.get(`growthChart/6?pm_id=32&pm_pid=SHRUTHI18254`, baseUrl);
  } catch (e) {
    console.error("Error while fetching getGrowthChartParamsById: ", e);
  }
  return res;
};

export const updateGrowthChartParam = async function (
  { id, pm_id, pm_pid },
  payload
) {
  let res = {};
  try {
    res = await api.put(
      `growthChart/${id}?pm_id=${pm_id}&pm_pid=${pm_pid}`,
      payload,
      baseUrl
    );
  } catch (e) {
    console.error("Error while updateGrowthChartParam: ", e);
  }
  return res;
};

export const addGrowthChartParam = async function (payload) {
  let res = {};
  try {
    res = await api.post(`/growthChart`, payload, baseUrl);
  } catch (e) {
    console.error("Error while AddGrowthCharParam: ", e);
  }
  return res;
};

export const getParentalDetails = async (pm_id, pm_pid) => {
  let res;
  try {
    res = await api.get(`parentalDetails/${pm_id}/${pm_pid}`, baseUrl);
  } catch (e) {
    console.error("Error while fetching getParentalDetails: ", e);
  }
  return res;
};

export const createParentalDetails = async function (payload) {
  let res;
  try {
    res = await api.post(`/parentalDetails`, payload, baseUrl);
  } catch (e) {
    console.error("Error while createParentalDetails: ", e);
  }
  return res;
};

export const storeGrowthChart = async function (payload) {
  try {
    return await api.post(`growthChart/chart/upload`, payload, baseUrl);
  } catch (e) {
    console.error("Error while uploading the growth chart image: ", e);
  }
};

export const updateParentalDetails = async function (
  { pm_id, pm_pid },
  payload
) {
  let res;
  try {
    res = await api.put(`parentalDetails/${pm_id}/${pm_pid}`, payload, baseUrl);
  } catch (e) {
    console.error("Error while updateParentalDetails: ", e);
  }
  return res;
};

export const getGrowthChartImages = async function ({ pm_id, pm_pid }) {
  let growthChartImages = {};
  try {
    growthChartImages = await api.get(
      `growthChart/chart/${pm_id}/${pm_pid}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching growthChartImages", e);
  }
  return growthChartImages;
};
