import moment from "moment";
import { PX_TO_PT } from "./constants";
import { NEO_NATOLOGISTS_DP_ID } from "../../../../utils/constants";

export const getMarginByFormat = (
  letterHeadFormat,
  headerFooter,
  position,
  defaultValue
) => {
  const marginType =
    letterHeadFormat === 0
      ? "custom_letterhead_margin"
      : letterHeadFormat === 1
      ? "uploaded_letterhead_margin"
      : letterHeadFormat === 2
      ? "margin"
      : null;

  return marginType && headerFooter?.[marginType]?.[position] >= 0
    ? (headerFooter?.[marginType]?.[position] || defaultValue) * 25
    : PX_TO_PT * 30;
};

export const calculatePadding = (headerFooter) => {
  const letterHeadFormat = headerFooter?.letterHeadFormat;
  return {
    paddingTop: [0, 1, 2].includes(letterHeadFormat)
      ? getMarginByFormat(letterHeadFormat, headerFooter, "top", 0.5)
      : PX_TO_PT * 30,
    paddingLeft: [0, 1, 2].includes(letterHeadFormat)
      ? getMarginByFormat(letterHeadFormat, headerFooter, "left", 0.5)
      : PX_TO_PT * 30,
    paddingRight: [0, 1, 2].includes(letterHeadFormat)
      ? getMarginByFormat(letterHeadFormat, headerFooter, "right", 0.5)
      : PX_TO_PT * 30,
  };
};

export const patientDataShow = (id, patient_data, billData, profile) => {
  var value = "";
  if (id == 1) {
    value = `${
      patient_data?.pm_salutation
        ? `${patient_data?.pm_salutation} ${patient_data?.pm_fullname}`
        : `${patient_data?.pm_fullname}`
    }`;
  } else if (id == 2) {
    value = `${patient_data?.pm_pid ? patient_data?.pm_pid : "-"}`;
  } else if (id == 3) {
    value = `${genderAge(patient_data, profile)}, ${patient_data?.pm_gender}`;
  } else if (id == 4) {
    value = `${
      patient_data?.pm_contact_no ? patient_data?.pm_contact_no : "-"
    }`;
  } else if (id == 5) {
    value = `${patient_data?.tpml_refrence_id ?? "-"}`;
  } else if (id == 6) {
    value = `${
      patient_data?.pm_salutation
        ? `${patient_data?.pm_salutation} ${patient_data?.pm_fullname}, ${patient_data?.pm_pid}`
        : `${patient_data?.pm_fullname}, ${patient_data?.pm_pid}`
    }`;
  } else if (id == 7) {
    value = patient_data?.address ?? "-";
  } else if (id == 8) {
    value = patient_data?.abha_address ? `${patient_data?.abha_address}` : "-";
  } else if (id == 9) {
    value = patient_data?.abha_number ? `${patient_data?.abha_number}` : "-";
  }
  return value;
};

export const patientIpdDataShow = (id, patient_data, billData, profile) => {
  var value = "";
  if (id == 1) {
    value = `${
      patient_data?.pm_salutation
        ? `${patient_data?.pm_salutation} ${patient_data?.pm_fullname}`
        : `${patient_data?.pm_fullname}`
    }`;
  } else if (id == 2) {
    value = `${patient_data?.pm_pid ? patient_data?.pm_pid : "-"}`;
  } else if (id == 3) {
    value = `${genderAge(patient_data, profile)}, ${patient_data?.pm_gender}`;
  } else if (id == 4) {
    value = `${
      patient_data?.pm_contact_no ? patient_data?.pm_contact_no : "-"
    }`;
  } else if (id == 5) {
    value = `${billData?.admission?.mrno ?? "-"}`;
  } else if (id == 6) {
    value = `${
      billData?.admission?.ward?.title && billData?.admission?.room?.title
        ? `${billData?.admission?.ward?.title}, ${billData?.admission?.room?.title}`
        : billData?.admission?.ward?.title
        ? billData?.admission?.ward?.title
        : billData?.admission?.room?.title
        ? billData?.admission?.room?.title
        : "-"
    }`;
  } else if (id == 7) {
    value = billData?.admissionId ?? "-";
  } else if (id == 8) {
    value = billData?.admission?.admittedOn
      ? moment(billData?.admission?.admittedOn).format("DD/MM/YYYY")
      : "-";
  } else if (id == 9) {
    value = billData?.admission?.doctor?.name ?? "-";
  } else if (id == 10) {
    value = billData?.admission?.dischargedAt
      ? moment(billData?.admission?.dischargedAt).format("DD/MM/YYYY")
      : "-";
  } else if (id == 11) {
    value = billData?.admission?.dischargeNo ?? "-";
  } else if (id == 12) {
    value = patient_data?.address ?? "-";
  } else if (id == 13) {
    value = billData?.admission?.metadata?.insuranceno ?? "-";
  }
  else if (id == 14) {
    value = billData?.admission?.metadata?.policyno ?? "-";
  }
  else if (id == 15) {
    value = billData?.admission?.metadata?.tpano ?? "-";
  } else if (id == 18) {
    value = patient_data?.abha_address ?? "-";
  } else if (id == 19) {
    value = patient_data?.abha_number ?? "-";
  }
  return value;
};

export const billDataShow = (id, billData, gstIn) => {
  var value = "";
  if (id == 1) {
    value = `${billData?.billNumber ?? "-"}`;
  } else if (id == 2) {
    value =
      billData?.transactionType === "Debit"
        ? billData?.billNumber ?? "-"
        : billData?.receiptNumber ?? "-";
  } else if (id == 3) {
    value =
      billData?.updatedAt || billData?.createdAt
        ? moment(billData.updatedAt || billData?.createdAt).format(
            "DD/MM/YYYY HH:mm"
          )
        : "-";
  } else if (id == 4) {
    value =
      (billData?.paymentStatus === "FullyPaid"
        ? "Paid Fully"
        : billData?.paymentStatus) || "Paid";
  } else if (id == 5) {
    value = gstIn ?? "-";
  } else if (id == 6) {
    value =
      billData?.updatedAt || billData?.createdAt
        ? moment(billData.updatedAt || billData?.createdAt).format(
            "DD/MM/YYYY"
          )
        : "-";
  }
  return value;
};

export const getBillInfoTitleToShow = (id, title, isDepositReceipt) => {
  var value = "";
  if (isDepositReceipt && id == 3) {
    value = "Receipt Date & Time";
  } else if (isDepositReceipt && id === 4) {
    value = "Receipt Status";
  } else {
    value = `${title}`;
  }
  return value;
};

export const genderAge = (patient_data, profile) => {
  var value = ``;
  if (profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) {
    if (patient_data?.ageYears != 0) {
      value += `${patient_data?.ageYears}y`;
    }
    if (patient_data?.ageMonths != 0) {
      value += ` ${patient_data?.ageMonths}m`;
    }
    if (patient_data?.ageDays != 0) {
      value += ` ${patient_data?.ageDays}d`;
    }
  } else {
    if (patient_data?.ageYears != 0) {
      value += `${patient_data?.ageYears}y`;
    } else if (patient_data?.ageMonths != 0) {
      value += ` ${patient_data?.ageMonths}m`;
    } else if (patient_data?.ageDays != 0) {
      value += ` ${patient_data?.ageDays}d`;
    }
  }
  return value;
};
