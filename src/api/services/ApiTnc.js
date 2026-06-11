import api from "./axiosService";
import config from "../../config";
import { TNC_VERSION } from "../../utils/constants";

const baseTncUrl = {
  customBaseUrl: config.upload_doc_api_url,
};

export const checkTncRecord = async () => {
  try {
    const response = await api.get(
      `/api/v1/user-consent/check`,
      {
        ...baseTncUrl,
        params: {
          tnc_version: TNC_VERSION
        }
      }
    );
    return response;
  } catch (error) {
    console.error("Error checking TNC record:", error);
    throw error;
  }
};

export const createTncRecord = async (data) => {
  try {
    const response = await api.post(
      `/api/v1/user-consent/create`,
      {
        um_id: Number(data.um_id), 
        tnc_version: Number(data.tnc_version) || Number(TNC_VERSION), 
      },
      baseTncUrl
    );
    return response;
  } catch (error) {
    console.error("Error creating TNC record:", error);
    throw error;
  }
};

