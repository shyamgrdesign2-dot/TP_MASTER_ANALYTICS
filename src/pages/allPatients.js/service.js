import api from "../../api/services/axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.visit_api_url };

export const fetchAllPatients = async function (params) {
  let res = {};
  try {
    const queryParams = {
      search: params.search ?? "",
      page: params.page || 1,
      limit: params.limit || 25,
    };
    if (params.startDate || params.endDate) {
      queryParams.startDate = params.startDate;
      queryParams.endDate = params.endDate;
    }
    const queryString = new URLSearchParams(queryParams).toString();
    res = await api.get(
      `/api/v1/patient/listDashboard?${queryString}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching all patients lists : ", e);
  }
  return res;
};
