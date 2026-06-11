import config from "../../config";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";

const VISIT_CLINIC_TOKEN_KEY = "visitClinicToken";

const readClinicTokenFromStorage = () =>
  localStorage.getItem(VISIT_CLINIC_TOKEN_KEY);

const persistClinicTokenToStorage = (token) => {
  if (!token) return;
  localStorage.setItem(VISIT_CLINIC_TOKEN_KEY, token);
};

const readMainAuthTokenFromStorage = () => {
  try {
    const raw = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const joinUrl = (base, path) => {
  const baseTrimmed = String(base || "").replace(/\/+$/, "");
  const pathTrimmed = String(path || "").replace(/^\/+/, "");
  return `${baseTrimmed}/${pathTrimmed}`;
};

export const clinicTargetStatus = async function (appointmentId, payload) {
  const callAdvance = async (token) => {
    const url = joinUrl(
      config.chikitsalay_api_url,
      `/api/v1/bookings/${appointmentId}/advance`
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_key: true,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload ?? {}),
    });

    const responseData = await response.json();
    return { ...(responseData || {}), status: response.status };
  };

  const token = readClinicTokenFromStorage();

  const resp = await callAdvance(token);

  const isInvalidAuthToken401 =
    resp?.status === 401 &&
    resp?.statusCode === 401 &&
    resp?.error === "Unauthorized" &&
    resp?.message === "Invalid auth token";

  if (resp?.status !== 404 && !isInvalidAuthToken401) return resp;

  // Refresh clinic token (replace only visitClinicToken)
  const refreshed = await generateClinicToken();
  persistClinicTokenToStorage(refreshed);

  // retry once with refreshed token
  return await callAdvance(refreshed);
};

export const generateClinicToken = async function () {
  let res = null;
  try {
    const mainJwt = readMainAuthTokenFromStorage();
    const tokenUrl = joinUrl(
      config.visit_api_url,
      `/api/v1/kea/auth/generate-visit-clinic-token-from-jwt`
    );

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(mainJwt ? { Authorization: `Bearer ${mainJwt}` } : {}),
      },
      body: JSON.stringify({ expiry_in_seconds: 864000 }),
    });

    const responseData = await response.json();
    res = responseData?.token || null;
  } catch (e) {
    console.error("Error while generating clinic token: ", e);
  }
  persistClinicTokenToStorage(res);
  return res;
};
