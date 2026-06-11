import api from "./axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.snap_rx_api_url };

const SnapRxDigitization = {};

SnapRxDigitization.generateFileUploadToken = function (data) {
  return api.post(
    `/api/v1/digitization/snap-rx/generate-file-upload-token`,
    { ...data },
    baseUrl
  );
};

SnapRxDigitization.uploadSnapRxFiles = function ({
  files,
  patient_unique_id: patientId,
  session_id: sessionId,
  auto_digitize_rx: autoDigitizeRx,
}) {
  const formData = new FormData();

  files.forEach((f) => {
    formData.append("file", f.file);
  });
  formData.append("patient_unique_id", patientId);
  formData.append("session_id", sessionId);
  if (autoDigitizeRx !== null && autoDigitizeRx !== undefined) {
    formData.append("auto_digitize_rx", autoDigitizeRx);
  }

  return api.post(
    `/api/v1/digitization/snap-rx/upload-files`,
    formData,
    baseUrl
  );
};

SnapRxDigitization.getFiles = function ({
  patient_unique_id: patientId,
  tcm_id: tcmId,
  session_id: sessionId,
}) {
  return api.get(
    `/api/v1/digitization/snap-rx/get-files?patient_unique_id=${patientId}${
      tcmId ? `&tcm_id=${tcmId}` : ""
    }${sessionId ? `&session_id=${sessionId}` : ""}`,
    baseUrl
  );
};

SnapRxDigitization.getFilesOnMobile = function ({
  patient_unique_id: patientId,
  tcm_id: tcmId,
  session_id: sessionId,
}) {
  return api.get(
    `/api/v1/digitization/snap-rx/get-session-files?patient_unique_id=${patientId}${
      tcmId ? `&tcm_id=${tcmId}` : ""
    }${sessionId ? `&session_id=${sessionId}` : ""}`,
    baseUrl
  );
};

export default SnapRxDigitization;
