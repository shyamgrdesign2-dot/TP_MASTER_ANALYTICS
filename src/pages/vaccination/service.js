import moment from "moment";
import api from "../../api/services/axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.vaccination_api_url };

export const getPatientDetails = async function ({
  hospital_bid,
  patient_uid,
  hospital_id,
}) {
  let res = {};
  try {
    res = await api.get(
      `/vaccination/patientDetails?hospital_bid=${hospital_bid}&patient_uid=${patient_uid}&hospital_id=${hospital_id}`,
      baseUrl
    );

    res = res?.detail?.length ? res.detail[0] : {};
  } catch (e) {
    console.error("Error while fetching patient details: ", e);
  }
  return res;
};

export const getVaccineBrands = async function () {
  let vaccineBrands = [];
  try {
    vaccineBrands = await api.get(`/vaccination/companyList`, baseUrl);
    if (vaccineBrands?.detail) {
      vaccineBrands = vaccineBrands.detail;
    }
  } catch (e) {
    console.error("Error while fetching vaccine brands", e);
  }
  return vaccineBrands;
};

export const updateDob = async function (payload) {
  let res = {};
  try {
    res = await api.post(`/vaccination/updatedob`, payload, baseUrl);
  } catch (e) {
    console.error("Error while fetching update DOB: ", e);
  }
  return res;
};

export const updateVaccine = async function (payload) {
  let res = {};
  try {
    res = await api.post(
      `/vaccination/updatePatientTemplate`,
      payload,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching update vaccine: ", e);
  }
  return res;
};

export const updateDueDate = async function (payload) {
  let res = {};
  try {
    res = await api.post(`/vaccination/overrideduedate`, payload, baseUrl);
  } catch (e) {
    console.error("Error while fetching update due date: ", e);
  }
  return res;
};

export const getOverridenDueDate = async (patientUid, patientPid, date) => {
  let res = [];
  try {
    res = await api.get(
      `/vaccination/overridenduedates?patient_uid=${patientUid}&patient_pid=${patientPid}${
        date ? `&date=${date}` : ""
      }`,
      baseUrl
    );
    if (res?.detail) {
      res = res.detail;
    }
  } catch (e) {
    console.error("Error while fetching overriden due date vaccines: ", e);
  }
  return res;
};

export const getOverridenDueDatesByDate = async (
  patientUid,
  patientPid,
  date
) => {
  let res = [];
  try {
    res = await api.get(
      `/vaccination/overridenduedatesbydate?patient_uid=${patientUid}&patient_pid=${patientPid}&date=${date}`,
      baseUrl
    );
    if (res?.detail) {
      res = res.detail;
    }
  } catch (e) {
    console.error(
      "Error while fetching overriden due date vaccines by date: ",
      e
    );
  }
  return res;
};

export const getVaccineTemplates = async () => {
  let result = [];
  try {
    result = await api.get(`/vaccination/standardTemplate`, baseUrl);
    if (result?.template) {
      result = result.template;
    }
  } catch (error) {
    console.error("Error while fetching vaccine template: ", error);
  }
  return result;
};

export const getPatientVaccineDetails = async (patientUid, patientPid) => {
  let result = [];
  try {
    result = await api.get(
      `/vaccination/patientTemplate?patient_uid=${patientUid}&patient_pid=${patientPid}`,
      baseUrl
    );
    if (result?.template) {
      result = result.template;
    }
  } catch (error) {
    console.error("Error while fetching patient details: ", error);
  }
  return result;
};

export const createPatient = async (payload) => {
  let res;
  try {
    res = await api.post("vaccination/patientrecord", payload, baseUrl);
  } catch (error) {
    console.error("Error while creating patient: ", error);
  }
  return res;
};

export const getGivenVaccineDetails = async (patientUid, patientPid, date) => {

  let result = [];
  try {
    result = await api.get(
      `vaccination/patientTemplateForPrint?patient_uid=${patientUid}&patient_pid=${patientPid}&vaccine_given_date=${date}`,
      baseUrl
    );
    if (result?.template) {
      result = result.template;
    }
  } catch (error) {
    console.error("Error while fetching vaccine template: ", error);
  }
  return result;
};

export const checkToShowVaccination = async (doctorUniqueId) => {
  let result = false;
  try {
    result = await api.get(
      `/vaccination/isAuthorized?doctor_unique_id=${doctorUniqueId}`,
      baseUrl
    );
    if (result?.isAuthorized === "true") {
      return true;
    }
  } catch (error) {
    console.error("Error while fetching vaccine template", error);
  }
  return false;
};

export const fetchFrequentlyUsedVaccines = async (doctorUniqueId, vaccineName) => {
  let result = [];
  try {
    const response = await api.get(
      `/vaccination/topRecentVaccineBrands?user_id=${doctorUniqueId}&vaccine=${vaccineName}`,
      baseUrl
    );
    result = response?.brands || [];
  } catch (error) {
    console.error("Error while fetching frequently used vaccines", error);
  }
  return result;
};

export const getTvtAgeBySection = async function () {
  let tvtAgeBySection = [];
  try {
    tvtAgeBySection = await api.get(`/vaccination/tvtAgeBySection`, baseUrl);
    if (tvtAgeBySection?.sections) {
      tvtAgeBySection = tvtAgeBySection.sections;
    }
  } catch (e) {
    console.error("Error while fetching tvt age by section", e);
  }
  return tvtAgeBySection;
};