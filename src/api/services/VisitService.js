import api from "./axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.visit_api_url };

export const updateVisitStatus = async function (payload) {
  try {
    await api.post(
      `/api/v1/kea/appointment/web/sync-appointment-status`,
      payload,
      baseUrl
    );
  } catch (e) {
    console.error("Error while updating visit status: ", e);
  }
};

export const syncDigitizationStatus = async function (payload) {
  try {
    await api.post(
      `/api/v1/kea/appointment/web/sync-digitization-status`,
      payload,
      baseUrl
    );
  } catch (e) {
    console.error("Error while sync digitization status: ", e);
  }
};
