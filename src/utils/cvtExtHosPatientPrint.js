import moment from "moment";

const SHOW_DATE_FORMAT = "DD/MM/YYYY";

const firstDefinedString = (patient, keys) => {
  for (const key of keys) {
    const value = patient?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
};

const formatAppointmentDate = (value) => {
  if (!value) return "-";
  const raw = String(value).trim();
  const normalizedRaw = raw
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const parseFormats = [
    SHOW_DATE_FORMAT,
    "DD/MM/YYYY",
    "DD-MM-YYYY",
    "Do MMM YYYY",
    "D MMM YYYY",
    "Do MMMM YYYY",
    "D MMMM YYYY",
    "YYYY-MM-DD",
    "YYYY/MM/DD",
    "DD/MM/YYYY hh:mm A",
    "DD/MM/YYYY h:mmA",
    "DD-MM-YYYY hh:mm A",
    "DD-MM-YYYY h:mmA",
    "YYYY-MM-DD HH:mm:ss",
    moment.ISO_8601,
  ];

  const parsedKnownFormat = moment(normalizedRaw, parseFormats, "en", true);
  if (parsedKnownFormat.isValid()) {
    return parsedKnownFormat.format(SHOW_DATE_FORMAT);
  }

  const parsedRelaxed = moment(normalizedRaw, parseFormats, "en", false);
  if (parsedRelaxed.isValid()) {
    return parsedRelaxed.format(SHOW_DATE_FORMAT);
  }

  const parsedFallback = moment(normalizedRaw);
  if (parsedFallback.isValid()) {
    return parsedFallback.format(SHOW_DATE_FORMAT);
  }

  return normalizedRaw;
};

const formatAppointmentDateTime = (dateValue, timeValue) => {
  const formattedDate = formatAppointmentDate(dateValue);
  const formattedTime =
    timeValue !== undefined && timeValue !== null && String(timeValue).trim() !== ""
      ? String(timeValue).trim()
      : "-";

  if (formattedDate === "-" && formattedTime === "-") return "-";
  if (formattedTime === "-") return formattedDate;
  if (formattedDate === "-") return formattedTime;
  return `${formattedDate} ${formattedTime}`;
};

const resolveConsultationDateDisplay = (patient, caseManagerData) => {
  const visitDateRaw = caseManagerData?.pam_app_date || firstDefinedString(patient, [
    "apDate",
    "consultation_date",
    "date",
  ]);
  
  let visitTimeRaw = caseManagerData?.pam_app_time;
  if (visitTimeRaw) {
    visitTimeRaw = moment(visitTimeRaw, ["HH:mm:ss", "HH:mm"]).format("hh:mm A");
  } else {
    visitTimeRaw = firstDefinedString(patient, [
      "apTime",
      "consultation_time",
      "time",
    ]);
  }

  if (visitDateRaw || visitTimeRaw) {
    return formatAppointmentDateTime(
      visitDateRaw || "-",
      visitTimeRaw || "-",
    );
  }

  const pc = patient?.patient_consultaion_date;
  if (pc !== undefined && pc !== null && String(pc).trim() !== "") {
    const m = moment(pc);
    return m.isValid() ? m.format("DD/MM/YYYY hh:mm A") : "-";
  }
  
  return "-";
};

const resolvePatientName = (patient) =>
  firstDefinedString(patient, ["patient_name", "pm_fullname"]) || "";

const resolveSalutation = (patient) =>
  firstDefinedString(patient, ["patient_salutation", "pm_salutation"]);

const resolvePatientIdOrUhid = (patient) =>
  firstDefinedString(patient, [
    "patient_reference_id",
    "uhid",
    "patient_uhid",
    "patientUHID",
    "pm_pid",
    "patient_unique_id",
    "id",
  ]) || "-";

const resolveMobile = (patient) =>
  firstDefinedString(patient, [
    "patient_contact_no",
    "pm_contact_no",
    "mobile",
    "phone",
    "contact",
    "pt_mobile",
  ]) || "-";

const resolveAddress = (patient) =>
  firstDefinedString(patient, ["patient_address", "pm_address"]) || "-";

const resolveReferenceId = (patient) =>
  firstDefinedString(patient, [
    "patient_reference_id",
    "pm_reference_id",
    "uhid",
    "patient_uhid",
    "patientUHID",
    "pm_pid",
    "patient_unique_id",
    "id",
  ]) || "-";

const resolveGender = (patient) =>
  firstDefinedString(patient, ["patient_gender", "pm_gender"]) || "-";

/**
 * Patient header values for digitised SmartRx PDFs when GB_CVT_EXT_HOS is on.
 * Aligns field resolution with mission hospital template / OPD appointment rows.
 */
export function getCvtExtHosPatientDataShowValue(id, args) {
  const {
    patient,
    doctorProfile,
    genderAge,
    abhaDetails,
    caseManagerData,
    isPediatricAccessable,
    formatPediatricHtWt,
  } = args;

  if (!patient) {
    if (id == 15) {
      return abhaDetails?.abha_address ? String(abhaDetails.abha_address) : "-";
    }
    if (id == 16) {
      return abhaDetails?.abha_number ? String(abhaDetails.abha_number) : "-";
    }
    if (id == 17) {
      const abhaToken = String(caseManagerData?.abha_token ?? "").trim();
      return abhaToken ? (abhaToken.length === 1 ? `0${abhaToken}` : abhaToken) : "-";
    }
    return "-";
  }

  if (id == 1) {
    const sal = resolveSalutation(patient);
    const name = resolvePatientName(patient) || "-";
    const pid = resolvePatientIdOrUhid(patient);
    const namePart = sal ? `${sal} ${name}` : name;
    return `${namePart}, ${pid}`;
  }
  if (id == 2) {
    return resolveConsultationDateDisplay(patient, caseManagerData);
  }
  if (id == 3) {
    return `${genderAge(patient, doctorProfile)}, ${resolveGender(patient)}`;
  }
  if (id == 4) {
    const m = resolveMobile(patient);
    return m === "" ? "-" : m;
  }
  if (id == 5) {
    const htWt = patient?.patient_ht_wt;
    if (htWt && isPediatricAccessable && typeof formatPediatricHtWt === "function") {
      return formatPediatricHtWt(htWt);
    }
    return htWt ? String(htWt) : "-";
  }
  if (id == 6) {
    return patient?.patient_blood_group ? String(patient.patient_blood_group) : "-";
  }
  if (id == 7) {
    const a = resolveAddress(patient);
    return a === "" ? "-" : a;
  }
  if (id == 8) {
    return patient?.patient_consultation_type
      ? String(patient.patient_consultation_type)
      : "-";
  }
  if (id == 9) {
    return patient?.patient_edd_date ? String(patient.patient_edd_date) : "-";
  }
  if (id == 10) {
    return patient?.patient_email ? String(patient.patient_email) : "-";
  }
  if (id == 11) {
    const r = resolveReferenceId(patient);
    return r === "" ? "-" : r;
  }
  if (id == 12) {
    const sal = resolveSalutation(patient);
    const name = resolvePatientName(patient) || "-";
    return sal ? `${sal} ${name}` : name;
  }
  if (id == 13) {
    return resolvePatientIdOrUhid(patient);
  }
  if (id == 14) {
    return patient?.patient_dob ? String(patient.patient_dob) : "-";
  }
  if (id == 15) {
    return abhaDetails?.abha_address ? String(abhaDetails.abha_address) : "-";
  }
  if (id == 17) {
    const abhaToken = String(caseManagerData?.abha_token ?? "").trim();
    return abhaToken ? (abhaToken.length === 1 ? `0${abhaToken}` : abhaToken) : "-";
  }
  if (id == 16) {
    return abhaDetails?.abha_number ? String(abhaDetails.abha_number) : "-";
  }
  return "-";
}

export const shouldUseCvtExtHosDigitisedPatientMapping = (
  isCvtExtHosAccessableFromGB,
  isDigitisedPrintLike,
) => !!isCvtExtHosAccessableFromGB && !!isDigitisedPrintLike;
