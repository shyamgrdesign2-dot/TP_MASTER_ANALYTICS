import api from "../../api/services/axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.lab_params_api_url };
const vaccinationBaseUrl = { customBaseUrl: config.vaccination_api_url };
const patientDocsBaseUrl = { customBaseUrl: config.lab_params_api_url };

export const fetchApolloConsultations = async function ({
  page,
  startDate,
  endDate,
  umIds,
  search,
  download,
}) {
  let consultations = [];

  let query = "";
  if (download !== undefined) {
    query = `&download=${download}`;
  }

  try {
    consultations = await api.get(
      `api/v1/apollo/owner?page=${page}&startdate=${startDate}&enddate=${endDate}&um_ids=${umIds}&search=${search}${query}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching consultations", e);
  }
  return consultations;
};

export const updateConsultationRemarks = async function (payload) {
  let res = {};
  try {
    res = await api.put(`api/v1/apollo/owner`, payload, baseUrl);
  } catch (e) {
    console.error("Error while updateConsultationRemrks: ", e);
  }
  return res;
};

export const fetchApolloDoctors = async () => {
  let res;
  try {
    res = await api.get(`api/v1/apollo/owner/list-doctors`, baseUrl);
  } catch (e) {
    console.error("Error while fetching getParentalDetails: ", e);
  }
  return res;
};

export const fetchApolloVaccination = async (
  created_by,
  start_date,
  end_date,
  page = 1,
  limit = 20
) => {
  let res;

  try {
    res = await api.get(
      `/vaccination/dueandoverdue?created_by=${created_by}&start_date=${start_date}&end_date=${end_date}&page=${page}&limit=${limit}`,
      vaccinationBaseUrl
    );
  } catch (e) {
    console.error("Error while fetching vaccination details: ", e);
  }
  return res;
};

export const updateVaccinationRemarks = async function (payload) {
  let res = {};
  try {
    res = await api.put(
      `/api/v1/apollo/owner/vaccination-remarks`,
      payload,
      patientDocsBaseUrl
    );
  } catch (e) {
    console.error("Error while updating vaccination remarks: ", e);
  }
  return res;
};

export const fetchApolloVaccinationRemarks = async (
  startdate,
  enddate,
  um_ids
) => {
  let res;

  try {
    res = await api.get(
      `/api/v1/apollo/owner/vaccination-remarks?startdate=${startdate}&enddate=${enddate}&um_ids=${um_ids}`,
      patientDocsBaseUrl
    );
  } catch (e) {
    console.error("Error while fetching apollo vaccination remarks: ", e);
  }
  return res;
};
