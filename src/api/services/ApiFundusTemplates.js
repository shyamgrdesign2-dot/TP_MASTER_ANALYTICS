import api from "./axiosService";
import config from "../../config";
import { getDecodedToken } from "../../utils/localStorage";

const templateBaseUrl = { customBaseUrl: config.opthal_prescription_api_url };

const normalizeTemplate = (template = {}) => {
  const source = template.template || template;
  return {
    tft_id:
      template.tft_id ??
      template.tat_id ??
      template.id ??
      template._id ??
      source._id ??
      null,
    tft_template_name:
      source.tft_template_name ??
      source.tat_template_name ??
      source.title ??
      source.name ??
      "",
    fundusExamination:
      source.fundusExamination ??
      source.entries ??
      source.advices ??
      source.items ??
      [],
  };
};

const getDoctorId = () => {
  const decoded = getDecodedToken();
  const result = decoded?.result || {};
  return result.user_id || result.doctor_unique_id || result.doctorId || "";
};

const buildTemplatePayload = (payload = {}) => ({
  module: "fundusExamination",
  site: "opd",
  isMaster: false,
  title: payload.tft_template_name || "",
  entries: payload.fundusExamination ?? [],
});

const normalizeResponse = (response) => {
  if (response && Object.prototype.hasOwnProperty.call(response, "status")) {
    return response;
  }
  if (response?.data?.template) {
    return {
      status: true,
      data: {
        ...response.data.template,
        _id: response.data._id,
        doctorId: response.data.doctorId,
        hospitalId: response.data.hospitalId,
      },
    };
  }
  return {
    status: true,
    data: response?.data ?? response,
  };
};

const ApiFundusTemplates = {
  addTemplate(template) {
    const doctorId = getDoctorId();
    const params = new URLSearchParams();
    if (doctorId) {
      params.set("doctorId", doctorId);
    }
    return api
      .put(
      `/api/v1/opthal-prescription/templates?${params.toString()}`,
      buildTemplatePayload(template),
      templateBaseUrl
      )
      .then(normalizeResponse);
  },
  updateTemplate(template) {
    const doctorId = getDoctorId();
    const params = new URLSearchParams();
    if (template?.tft_id) {
      params.set("_id", template.tft_id);
    }
    if (doctorId) {
      params.set("doctorId", doctorId);
    }
    return api
      .put(
      `/api/v1/opthal-prescription/templates?${params.toString()}`,
      buildTemplatePayload(template),
      templateBaseUrl
      )
      .then(normalizeResponse);
  },
  deleteTemplate(templateId) {
    const doctorId = getDoctorId();
    const params = new URLSearchParams();
    if (templateId) {
      params.set("_id", templateId);
    }
    if (doctorId) {
      params.set("doctorId", doctorId);
    }
    return api
      .delete(
      `/api/v1/opthal-prescription/templates?${params.toString()}`,
      templateBaseUrl
      )
      .then(normalizeResponse);
  },
  listTemplates() {
    const params = new URLSearchParams({
      moduleName: "fundusExamination",
      site: "opd",
      isMaster: "false",
    });
    const doctorId = getDoctorId();
    if (doctorId) {
      params.set("doctorId", doctorId);
    }
    return api
      .get(
      `/api/v1/opthal-prescription/templates/via-module-name?${params.toString()}`,
      templateBaseUrl
      )
      .then(normalizeResponse);
  },
  normalizeTemplate,
  normalizeTemplates(templates = []) {
    return templates.map(normalizeTemplate);
  },
};

export default ApiFundusTemplates;
