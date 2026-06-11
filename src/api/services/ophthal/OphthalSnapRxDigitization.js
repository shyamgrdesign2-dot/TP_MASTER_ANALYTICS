import api from "../axiosService";
import config from "../../../config";

const baseUrl = { customBaseUrl: config.ipd_api_url };

const OphthalSnapRxDigitization = {};

OphthalSnapRxDigitization.generateFileUploadToken = function ({
  patientId,
  visitId,
  schemaKey,
}) {
  const query = [`patientId=${patientId}`, `admissionId=${visitId}`];
  if (schemaKey) query.push(`form=${schemaKey}`);

  return api.get(
    `/ai/smart-rx/snap-rx/generate-file-upload-token?${query.join("&")}`,
    baseUrl
  );
};

OphthalSnapRxDigitization.uploadSnapRxFiles = function (data) {
  const { files, fileUploadToken, schemaKey } = data;
  const formData = new FormData();

  (files || []).forEach((file) => {
    formData.append("file", file.file || file);
  });

  const configWithHeaders = {
    ...baseUrl,
    headers: {
      Authorization: `Bearer ${fileUploadToken}`,
    },
    snapRxFileUpload: true,
    timeout: 120000,
  };

  const formQuery = schemaKey ? `?form=${schemaKey}` : "";

  return api.post(
    `/ai/smart-rx/snap-rx/upload-files${formQuery}`,
    formData,
    configWithHeaders
  );
};

OphthalSnapRxDigitization.getFiles = function (data = {}) {
  const { patientId, visitId, sessionId, fileUploadToken, type, schemaKey } =
    data;

  const query = [];
  if (patientId) query.push(`patientId=${patientId}`);
  if (visitId) query.push(`admissionId=${visitId}`);
  if (sessionId) query.push(`sessionId=${sessionId}`);
  const formKey = type || schemaKey;
  if (formKey) query.push(`form=${formKey}`);
  const qs = query.length ? `?${query.join("&")}` : "";

  const configWithHeaders = {
    ...baseUrl,
    headers: {
      ...(fileUploadToken ? { Authorization: `Bearer ${fileUploadToken}` } : {}),
    },
    ipdSnapRxGetFiles: true,
  };

  return api.get(
    `/ai/smart-rx/snap-rx/get-session-files${qs}`,
    configWithHeaders
  );
};

OphthalSnapRxDigitization.getFilesOnMobile = function (params) {
  return OphthalSnapRxDigitization.getFiles(params);
};

OphthalSnapRxDigitization.digitize = function ({
  schemaKey,
  data = {},
  fileUploadToken,
}) {
  const configWithHeaders = {
    ...baseUrl,
    headers: {
      "Content-Type": "application/json",
      ...(fileUploadToken ? { Authorization: `Bearer ${fileUploadToken}` } : {}),
    },
    ipdSnapRxGetFiles: true,
    timeout: 120000,
  };

  return api.post(
    `/ai/smart-rx?schemaKey=${schemaKey}&needGrounding=true&model=gemini${
      schemaKey ? `&form=${schemaKey}` : ""
    }`,
    data,
    configWithHeaders
  );
};

export default OphthalSnapRxDigitization;
