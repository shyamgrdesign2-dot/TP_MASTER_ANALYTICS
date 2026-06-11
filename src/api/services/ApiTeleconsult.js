import config from "../../config";
import api from "./axiosService";

const TELECONSULT_BASE_URL = config.visit_api_url;

const baseUrl = { customBaseUrl: TELECONSULT_BASE_URL };

const ApiTeleconsult = {};

ApiTeleconsult.getHasVideoSlots = function (doctorId, hmId) {
  const params = new URLSearchParams();
  if (doctorId != null && doctorId !== "") params.set("doctorId", String(doctorId));
  if (hmId != null && hmId !== "") params.set("hm_id", String(hmId));
  const query = params.toString();
  return api.get(`/api/v1/teleconsult/has-video-slots${query ? `?${query}` : ""}`, baseUrl);
};

ApiTeleconsult.getSlots = function (doctorId, date) {
  const params = new URLSearchParams();
  if (doctorId != null && doctorId !== "") params.set("doctorId", String(doctorId));
  if (date != null && date !== "") params.set("date", String(date));
  params.set("pam_status_type_appointment", "2");
  return api.get(`/api/v1/appointment/listSlots?${params.toString()}`, baseUrl);
};

ApiTeleconsult.checkVideoAvailability = function (appointmentId) {
  const params = new URLSearchParams();
  if (appointmentId != null && appointmentId !== "") params.set("appointmentId", String(appointmentId));
  return api.get(`/api/v1/teleconsult/check-video-availability?${params.toString()}`, baseUrl);
};

ApiTeleconsult.doctorLeft = function (consultationId) {
  return api.post(
    `/api/v1/teleconsult/doctor-left`,
    { consultationId },
    baseUrl
  );
};

export default ApiTeleconsult;
