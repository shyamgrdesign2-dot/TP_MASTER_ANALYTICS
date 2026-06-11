import api from "../../api/services/axiosService";
import config from "../../config";
import { getDecodedToken } from "../../utils/localStorage";

const baseUrl = { customBaseUrl: config.gynec_api_url };

export const getGynecDetails = async function (patient_unique_id, userId) {
  let res = {};
  try {
    const decodedToken = getDecodedToken();
    const doctorId = decodedToken?.result?.user_id;
    res = await api.get(`/gynec/${patient_unique_id}/${userId || doctorId}`, baseUrl);

    res = res.data;
  } catch (e) {
    console.error("Error while fetching patient gynec details: ", e);
  }
  return res;
};

export const postGynecDetails = async function (payload) {
  let res = {};
  try {
    res = await api.post(
      `/gynec`,
      payload,
      baseUrl
    );
  } catch (error) {
    console.error("Error while creating gynec details: ", error);
  }
  return res;
};

export const updateGynecDetails = async function (patientId, payload, userId) {
  let res = {};
  try {
    res = await api.patch(`/gynec/${patientId}/${userId}`, payload, baseUrl);
  } catch (error) {
    console.error("Error while updating gynec details: ", error);
  }
  return res;
};