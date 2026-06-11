import { saveAs } from "file-saver";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../../utils/constants";
import { db } from "../../../firebase";
import { uploadDocsToAzure } from "../../medicalRecords/service";
import {
  browserName,
  isChrome,
  isMobile,
  isSafari,
  osName,
} from "react-device-detect";
import moment from "moment";
import { sendMessageToParent } from "../../../utils/utils";
import { EVENTS } from "../../../utils/events";
import { EditBillDeployedDate } from "./constants";
import ApiAbha from "../../../api/services/ApiAbha";

/**
 * Enriches patient_data with ABHA details (abha_address, abha_number) when available.
 * Uses patientId for the API call when provided.
 * @param {Object} patientData - Patient data object to enrich
 * @param {string} patientId - Patient unique ID for fetching ABHA details
 * @returns {Promise<Object>} Patient data with abha_address and abha_number merged in
 */
export const enrichPatientDataWithAbha = async (patientData, patientId) => {
  if (!patientData || !patientId) return patientData;
  try {
    const abhaDetails = await ApiAbha.fetchAbhaDetails(patientId);
    return {
      ...patientData,
      abha_address: abhaDetails?.abha_address,
      abha_number: abhaDetails?.abha_number,
    };
  } catch (error) {
    console.error("Error while fetching ABHA details:", error);
    return patientData;
  }
};  

export const handleDownload = async (
  pdfUrl,
  printBlob,
  patientUniqueId,
  setStartLoader,
  isDoctor = false
) => {
  if (browserName == "Chrome WebView" || browserName == "WebKit") {
    const file = new File([printBlob], "billingFile.pdf", {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.append(file?.name, file);
    if (!isDoctor) {
      formData.append("patient_unique_id", patientUniqueId);
    }
    const res = await uploadDocsToAzure(formData);
    const printUrl = res?.[0]?.url;
    if (res?.length > 0) {
      sendMessageToParent(EVENTS.DOWNLOAD, { url: printUrl });
      // handleInAppClick(
      //   patientUniqueId,
      //   "download",
      //   printUrl,
      //   setStartLoader
      // );
    }
  } else {
    try {
      saveAs(pdfUrl, `${Date.now()}.pdf`);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  }
};

export const printBlobInNewTab = async (printBlob) => {
  try {
    const blobURL = URL.createObjectURL(printBlob);
    const printWindow = window.open(blobURL, "_blank");

    if (!printWindow) {
      console.error("Unable to open new window for printing");
      return;
    }

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(blobURL);
      }, 1000);
    };
  } catch (error) {
    console.error("Error occurred while printing:", error);
  }
};

export const printContent = async (
  printBlob,
  patientUniqueId,
  setStartLoader,
  isDoctor
) => {
  if (browserName == "Chrome WebView" || browserName == "WebKit") {
    const file = new File([printBlob], "billingFile.pdf", {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.append(file?.name, file);
    if (!isDoctor) {
      formData.append("patient_unique_id", patientUniqueId);
    }
    const res = await uploadDocsToAzure(formData);
    if (res?.length > 0) {
      const printUrl = res?.[0]?.url;
      sendMessageToParent(EVENTS.PRINT, { url: printUrl });
      // handleInAppClick(patientUniqueId, "print", printUrl, setStartLoader);
    }
  } else {
    if (isMobile || osName == "Linux") {
      printBlobInNewTab(printBlob);
    } else {
      var blobURL = URL.createObjectURL(printBlob);
      // Remove all existing iframes
      document.querySelectorAll("iframe").forEach(function (iframe) {
        iframe.parentNode.removeChild(iframe);
      });
      var iframe = document.createElement("iframe"); //load content in an iframe to print later
      document.body.appendChild(iframe);
      iframe.style.display = "none";
      iframe.src = blobURL;
      iframe.onload = function () {
        setTimeout(function () {
          iframe.focus();
          iframe.contentWindow.print();
          // Revoke the Blob URL to avoid memory leaks
          URL.revokeObjectURL(blobURL);
        }, 1);
      };
    }
  }
};

export const handleInAppClick = async (
  patientUniqueId,
  actionType,
  url,
  setStartLoader
) => {
  const deviceUid = localStorage.getItem("app_device_unique_id");
  if (deviceUid) {
    const docRef = doc(db, "billing", deviceUid);
    try {
      const docSnap = await getDoc(docRef);
      const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
      const cleanedToken = token.replace(/['"]+/g, "");
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          action_type: actionType,
          clicked: "yes",
          patient_unique_id: patientUniqueId,
          token: cleanedToken,
          url: url,
        });
      } else {
        await setDoc(doc(db, "billing", deviceUid), {
          action_type: actionType,
          clicked: "yes",
          patient_unique_id: patientUniqueId,
          token: cleanedToken,
          url: url,
        });
      }
      setStartLoader();
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  }
};

export const calculateTotalAmount = (item) => {
  const price = Number(item.price) || Number(item.amount) || 0;
  const discount = Number(item.discount) || 0;
  const quantity = Number(item.quantity) || 1;

  // Ensure discountType is valid
  const discountAmount =
    item.discountType === "percentage" ? (discount / 100) * price : discount;

  const priceAfterDiscount = price - discountAmount;
  const gstMultiplier = 1 + (Number(item.gst) || 0) / 100;

  return (priceAfterDiscount * gstMultiplier * quantity).toFixed(2);
};

export const formatDateWithOrdinal = (date) => {
  const day = moment(date).format("D"); // Get day without leading zero
  const monthYear = moment(date).format("MMM YYYY"); // Format month and year
  const suffix = moment(date).format("Do").replace(/\d+/g, ""); // Extract suffix from "Do"

  return `${day}${suffix} ${monthYear}`;
};

export const isEditBillDisabled = (billData) => {
  const hasPaidDues =
    billData?.paidDues &&
    Array.isArray(billData.paidDues) &&
    billData?.paidDues?.length > 0;
  const hasRefundedAmount =
    billData?.refundedAmount && parseFloat(billData.refundedAmount) > 0;
  const isBeforeEditBillDeployedDate = moment(billData?.date).isBefore(EditBillDeployedDate);
  return {
    hasPaidDues,
    hasRefundedAmount,
    isBeforeEditBillDeployedDate,
    isEditDisabled: hasPaidDues || hasRefundedAmount || isBeforeEditBillDeployedDate,
  };
};

/**
 * Calculate total paid amount for a bill record
 * Includes the base paidAmount plus all paid amounts from paidDues array
 * @param {Object} record - Bill record object
 * @returns {number} Total paid amount
 */
export const calculateTotalPaidAmount = (record) => {
  const paidDuesSum =
    record?.paidDues?.reduce((sum, item) => {
      return sum + (parseFloat(item.paidAmount) || 0);
    }, 0) || 0;
  const totalPaidAmount = (parseFloat(record?.paidAmount) || 0) + paidDuesSum;
  return totalPaidAmount;
};