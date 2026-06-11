import moment from "moment";

import config from "../config";
import { message } from "antd";
import { MESSAGE_KEY, NEO_NATOLOGISTS_DP_ID, PAEDIATRICS_DP_ID, SNAP_RX_TOKENS_STORAGE_KEY, PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../utils/constants";
import { browserName, deviceDetect, isBrowser, isMobile } from "react-device-detect";
import html2pdf from "html2pdf.js";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../src/firebase.js";
import { getDecodedToken } from "./localStorage.js";
import imageCompression from "browser-image-compression";
import numeral from "numeral";
import packageJson from "../../package.json";
import { EVENTS } from "./events.js";
import { AISENSY_SCRIPT_CONTAINER,AISENSY_SCRIPT_ID,AISENSY_SCRIPT_SRC } from "../utils/constants";
import { env } from "../EnvironmentConfig.js";
import { uploadDocsToAzure } from "../pages/medicalRecords/service.js";

/** True when running inside the native app WebView (Android/iOS). Use for in-app download/print; when false, use browser download. */
export const isInNativeApp = () => browserName === "Chrome WebView" || browserName === "WebKit";

// export const validateEmail = (email) => {
//   return String(email)
//     .toLowerCase()
//     .match(
//       /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
//     );
// };

export const aisensybotInjection = (isLoginFlow) => {
  // If in login flow, remove the script and widget
  if (isLoginFlow) {
    const existingScript = document.getElementById(AISENSY_SCRIPT_ID);
    if (existingScript) {
      document.body.removeChild(existingScript);
    }
    
    // Also remove any injected widget container/button
    const widget = document.querySelector(AISENSY_SCRIPT_CONTAINER);
    if (widget) widget.remove();
    if (typeof window.dfToggle === "function") {
      window.dfToggle = () => {};
    }
    return;
  }

  // If signup → inject script
  if (!document.getElementById(AISENSY_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.src = AISENSY_SCRIPT_SRC;
    script.id = AISENSY_SCRIPT_ID;
    script.setAttribute("widget-id", "aaa4hg");
    script.async = true;
    document.body.appendChild(script);
  }
};

export const validateEmail = (email) => {
  let reg =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return reg.test(String(email).toLowerCase());
};

// export const isValidWebsite = (url) => {
//   const pattern = /^https?:\/\/([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/;
//   return pattern.test(url);
// }

export const isValidWebsite = (url, account) => {
  const patterns = {
    facebook:
      /^https?:\/\/(www\.)?facebook\.com\/(profile\.php\?id=\d+|[A-Za-z0-9.]+)\/?$/,
    instagram:
      /^https?:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._-]+\/?(?:\?[^\s]*)?$/,
    linkedin: /^https?:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9-._]+\/?$/,
    twitter:
      /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]{1,15}(?:\?[^\s]*)?\/?$/,
    youtube:
      /^https?:\/\/(www\.)?(youtube\.com\/(channel\/[A-Za-z0-9_-]+|user\/[A-Za-z0-9_-]+|@?[A-Za-z0-9._-]+)|youtu\.be\/[A-Za-z0-9_-]+)(\?[^\s]*)?$/,
  };
  const pattern = patterns[account];
  if (pattern) {
    return pattern.test(url.trim());
  }
  return false;
};

export const isValidMap = (url) => {
  const pattern =
    /^https?:\/\/(www\.)?(google\.[a-z]{2,3}(?:\.[a-z]{2})?|maps\.app\.goo\.gl)\/(maps\/)?[a-zA-Z0-9?=&,.;_-]*$/;
  return pattern.test(url);
};

export const removeSpecialCharectorWithoutDotSpace = (text) => {
  return text.replace(/[^\w. ]/g, "");
};

export const replaceCommasAndSemicolons = (text) => {
  return text.replace(/[;,]/g, "");
};

export const blockedEmoji = (text) => {
  return text.replace(
    /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F980}-\u{1FAFF}]/gu,
    ""
  );
};

export const onlyNumberFormat = (text) => {
  return text.replace(/[^0-9]/g, "");
};
export const onlyDecimalFormat = (text) => {
  return text.match(/([0-9]*[\.]{0,1}[0-9]{0,2})/s)[0];
};
export const removeBeforeWhiteSpace = (text) => {
  return text.replace(/^[ ]+/g, "");
};

export const removeWhiteSpace = (text) => {
  return text.replace(/[ ]+/g, "");
};

export const frequencyFormat = (str) => {
  return /^(?!-)[\d.\s-]+$/.test(str);
};

export const hasNumber = (str) => {
  return /\d/.test(str);
};

export const isNumeric = (str) => {
  return /^[0-9]\d*$/.test(str);
};

export const isAlphabet = (str) => {
  return /^[a-zA-z\s]*$/.test(str);
};

export const isAlphabetExit = (str) => {
  return /[a-zA-Z]/.test(str);
};

export const capitalizeAfterSentence = (text) => {
  const regex = /([.?!]\s*|^)([a-z])/g;
  return text.replace(regex, (match, p1, p2) => p1 + p2.toUpperCase());
};

export const capitalizeFirstLetter = (text) => {
  if (!text) return ""; // Handle empty string case
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeFirstWordOnly = (text) => {
  if (!text) return ""; 
  const words = text.split(' ');
  if (words.length === 0) return "";
  const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  const remainingWords = words.slice(1);
  
  return [firstWord, ...remainingWords].join(' ');
};
export const capitalize = (str, lower = false) =>
  (lower ? str.toLowerCase() : str).replace(/(?:^|\s|["'([{])+\S/g, (match) =>
    match.toUpperCase()
  );

export const makeDefaultLogo = (text) => {
  var fullName = text !== undefined ? text.trim() : "";
  if (!fullName) {
    return "HG";
  }
  const regex = /\s+/;
  const results = fullName.split(regex);
  if (results.length === 1) {
    return results[0][0].toUpperCase();
  } else {
    const letter = `${results[0][0].toUpperCase()}${results[1][0].toUpperCase()}`;
    return letter;
  }
  // if (fullName?.includes(" ")) {
  //   try {
  //     const letter = `${fullName.split(" ")[0][0].toUpperCase()}${fullName.split(" ")[1][0].toUpperCase()}`;
  //     return letter;
  //   } catch (e) {
  //     return `${fullName.split(" ")[0][0]}`;
  //   }
  // } else {
  //   return `${fullName.split(" ")[0][0]}`;
  // }
};

export const frequencyCombination = (text) => {
  // const array = ['0', '1/2', '1/3', '1/4', '3/4', '1', '2']
  // const array = ['0', '0.5', '0.33', '0.25', '0.75', '1', '2']
  const array = ["0", "1"];
  const results = text;
  let makeArray = [];

  if (
    results.split("-")[0] &&
    !results.split("-")[1] &&
    !results.split("-")[2] &&
    !results.split("-")[3]
  ) {
    for (let i = 0; i < array.length; i++) {
      for (let j = 0; j < array.length; j++) {
        makeArray.push(`${results.split("-")[0]}-${array[i]}-${array[j]}`);
      }
    }
    for (let i = 0; i < array.length; i++) {
      for (let j = 0; j < array.length; j++) {
        for (let k = 0; k < array.length; k++) {
          makeArray.push(
            `${results.split("-")[0]}-${array[i]}-${array[j]}-${array[k]}`
          );
        }
      }
    }
  } else if (
    results.split("-")[0] &&
    results.split("-")[1] &&
    !results.split("-")[2] &&
    !results.split("-")[3]
  ) {
    for (let i = 0; i < array.length; i++) {
      makeArray.push(
        `${results.split("-")[0]}-${results.split("-")[1]}-${array[i]}`
      );
    }
    for (let i = 0; i < array.length; i++) {
      for (let j = 0; j < array.length; j++) {
        makeArray.push(
          `${results.split("-")[0]}-${results.split("-")[1]}-${array[i]}-${
            array[j]
          }`
        );
      }
    }
  } else if (
    results.split("-")[0] &&
    results.split("-")[1] &&
    results.split("-")[2] &&
    !results.split("-")[3]
  ) {
    makeArray.push(
      `${results.split("-")[0]}-${results.split("-")[1]}-${
        results.split("-")[2]
      }`
    );
    for (let i = 0; i < array.length; i++) {
      makeArray.push(
        `${results.split("-")[0]}-${results.split("-")[1]}-${
          results.split("-")[2]
        }-${array[i]}`
      );
    }
  } else if (
    results.split("-")[0] &&
    results.split("-")[1] &&
    results.split("-")[2] &&
    results.split("-")[3]
  ) {
    makeArray.push(
      `${results.split("-")[0]}-${results.split("-")[1]}-${
        results.split("-")[2]
      }-${results.split("-")[3]}`
    );
  }
  return makeArray;
};

export const medicine_freq_dosage_format = (freqDosage, is_dosage_decimal) => {
  if (!!is_dosage_decimal) {
    return freqDosage;
  }
  var value = "";
  if (freqDosage == "0.5") {
    value = `1/2`;
  } else if (freqDosage == "0.25") {
    value = `1/4`;
  } else if (freqDosage == "0.75") {
    value = `3/4`;
  } else {
    value = freqDosage;
  }
  return value;
};

export const calculateDose = (dosage, weight, concentration, tmmType) => {
  const dose =
    (parseFloat(dosage) * parseFloat(weight)) / parseFloat(concentration);
    console.log(dose.toFixed(1))
  return !isNaN(dose) ? [8, 11, 23, 20, 34, 27, 9, 33, 21, 1, 17, 35, 12, 40, 10, 18, 31, 36, 2, 19, 14, 30, 15, 13, 3, 16]?.includes(parseInt(tmmType)) ? Math.round(dose.toFixed(1)) : dose.toFixed(1).replace(/\.0$/, "") : "";
};

export const formatAmount = (amount) => {
  return amount.toFixed(2).replace(/\.00$/, "");
};

export const currencyFormat = (amount) => {
  return numeral(amount).format("0,0.00").replace(/\.00$/, "");
};

export const dataUrlToFile = (url, fileName) => {
  const [mediaType, data] = url.split(",");

  const mime = mediaType.match(/:(.*?);/)?.[0];

  var n = data.length;

  const arr = new Uint8Array(n);

  while (n--) {
    arr[n] = data.charCodeAt(n);
  }

  return new File([arr], fileName, {
    type: mime.substring(1, mime.length - 1),
  });
};

export const dataUrlToFileUsingFetch = async (url, fileName, mimeType) => {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  return new File([buffer], fileName, { type: mimeType });
};

export const errorMessage = async (error) => {
  if (typeof error === "object" && error?.name == "TypeError") {
    return message.open({
      key: MESSAGE_KEY,
      type: "error",
      className: "error-red",
      content: (
        <div className="d-flex align-items-center">
          <div>
            <div className="title-common text-start fontroboto">Error</div>
            <div className="fontroboto text-start fw-normal mt-1">
              We're Sorry, Somthing went wronng. Please{" "}
              <span className="text-underline">try again</span>
            </div>
          </div>
        </div>
      ),
      duration: 2,
    });
  } else {
    return message.open({
      key: MESSAGE_KEY,
      type: "warning",
      content: typeof error === "object" ? error.message : error,
      duration: 2,
    });
  }
};

export const handleCopy = async (url, msg = "Copied") => {
  try {
    await navigator.clipboard.writeText(url);
    errorMessage(msg);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};

export const inputToLabel = (htmlString) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlString;

  const inputs = tempDiv.querySelectorAll("input");
  inputs.forEach((input) => {
    console.log(input.type);
    if (input.type === "date") {
      const label = document.createElement("label");
      label.className = input.className;
      // label.id = input.id;
      label.textContent = input.value;
      input.parentNode.replaceChild(label, input);
    }
  });

  return tempDiv.innerHTML;
};

export const HTMLTransformer = (htmlString) => {
  // Create a temporary container to parse the HTML string
  let tempContainer = document.createElement("div");
  tempContainer.innerHTML = htmlString;

  // Select all label elements
  let labels = tempContainer.querySelectorAll("label");

  // Iterate over the labels and replace innerHTML content based on the class
  labels.forEach((label) => {
    if (label.classList.contains("consulting_doctor")) {
      replaceContent(label, "{Consulting Doctor}");
    } else if (label.classList.contains("patient_name")) {
      replaceContent(label, "{Patient Name}");
    } else if (label.classList.contains("age")) {
      replaceContent(label, "{Age}");
    } else if (label.classList.contains("contact_number")) {
      replaceContent(label, "{Contact Number}");
    } else if (label.classList.contains("gender")) {
      replaceContent(label, "{Gender}");
    } else if (label.classList.contains("email")) {
      replaceContent(label, "{Email}");
    } else if (label.classList.contains("patient_id")) {
      replaceContent(label, "{Patient ID}");
    } else if (label.classList.contains("address")) {
      replaceContent(label, "{Address}");
    } else if (label.classList.contains("blood_group")) {
      replaceContent(label, "{Blood Group}");
    } else if (label.classList.contains("date_of_birth")) {
      replaceContent(label, "{Date of Birth}");
    } else if (label.classList.contains("today_date")) {
      replaceContent(label, "{Today Date}");
    } else if (label.classList.contains("department")) {
      replaceContent(label, "{Department}");
    } else if (label.classList.contains("referred_by")) {
      replaceContent(label, "{Referred by}");
    } else if (label.classList.contains("case_type")) {
      replaceContent(label, "{Case Type}");
    } else if (label.classList.contains("last_appointment")) {
      replaceContent(label, "{Last appointment}");
    } else if (label.classList.contains("inpatient_number")) {
      replaceContent(label, "{Inpatient Number}");
    } else if (label.classList.contains("ward")) {
      replaceContent(label, "{Ward}");
    } else if (label.classList.contains("room_bed")) {
      replaceContent(label, "{Room/Bed}");
    } else if (label.classList.contains("admitting_doctor")) {
      replaceContent(label, "{Admitting Doctor}");
    } else if (label.classList.contains("admitting_date")) {
      replaceContent(label, "{Admitting Date}");
    } else if (label.classList.contains("admitting_time")) {
      replaceContent(label, "{Admitting Time}");
    } else if (label.classList.contains("discharge_date")) {
      replaceContent(label, "{Discharge Date}");
    } else if (label.classList.contains("discharge_time")) {
      replaceContent(label, "{Discharge Time}");
    } else if (label.classList.contains("admitted_days")) {
      replaceContent(label, "{Admitted Days}");
    } else if (label.classList.contains("admission_diagnosis")) {
      replaceContent(label, "{Admission Diagnosis}");
    } else if (label.classList.contains("discharge_diagnosis")) {
      replaceContent(label, "{Discharge Diagnosis}");
    } else if (label.classList.contains("resident_of")) {
      replaceContent(label, "{Resident of}");
    } else if (label.classList.contains("start_date")) {
      replaceContent(label, "{Start Date}");
    } else if (label.classList.contains("end_date")) {
      replaceContent(label, "{End Date}");
    } else if (label.classList.contains("join_date")) {
      replaceContent(label, "{Join Date}");
    } else if (label.classList.contains("custom_date")) {
      replaceContent(label, "{Custom Date}");
    } else if (label.classList.contains("diagnosis")) {
      replaceContent(label, "{Diagnosis}");
    } else if (label.classList.contains("time")) {
      replaceContent(label, "{Time}");
    } else if (label.classList.contains("travel_from")) {
      replaceContent(label, "{Travel From}");
    } else if (label.classList.contains("travel_to")) {
      replaceContent(label, "{Travel To}");
    } else if (label.classList.contains("photo_id_card_no")) {
      replaceContent(label, "{Photo ID card No}");
    } else if (label.classList.contains("nationality")) {
      replaceContent(label, "{Nationality}");
    } else if (label.classList.contains("passport_number")) {
      replaceContent(label, "{Passport Number}");
    } else if (label.classList.contains("procedure")) {
      replaceContent(label, "{Procedure}");
    } else if (label.classList.contains("number_of_months")) {
      replaceContent(label, "{Number of Months}");
    }
  });

  // Get the modified HTML string
  return tempContainer.innerHTML;
};

function replaceContent(element, newText) {
  // Traverse through the child nodes and replace the text nodes
  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = newText;
    } else {
      replaceContent(node, newText);
    }
  });
}

export const removeLabelTags = (htmlString) => {
  // Create a temporary container to parse the HTML string
  let tempContainer = document.createElement("div");
  tempContainer.innerHTML = htmlString;

  // Select all label elements
  let labels = tempContainer.querySelectorAll("label");

  labels.forEach((label) => {
    // Create a document fragment to hold the inner content
    let fragment = document.createDocumentFragment();

    // Move all child nodes of the label into the fragment
    while (label.firstChild) {
      fragment.appendChild(label.firstChild);
    }

    // If the label has a style attribute, apply it to the nearest child element
    if (label.hasAttribute("style")) {
      if (
        fragment.firstChild &&
        fragment.firstChild.nodeType === Node.ELEMENT_NODE &&
        !fragment.firstChild.hasAttribute("style")
      ) {
        fragment.firstChild.setAttribute("style", label.getAttribute("style"));
      }
    }

    // Replace the label with its content
    label.parentNode.replaceChild(fragment, label);
  });

  // Get the modified HTML string
  return tempContainer.innerHTML;
};

export const trimEllip = (source, length) => {
  if (source == null) {
    return "";
  }
  return source.length > length ? source.substring(0, length) + "..." : source;
};

export const isLocalDev = () => {
  if (config.placeholderApiUrl.includes("ninjasforjava.com")) {
    return true;
  }

  if (window.location.includes("localhost:")) {
    return true;
  }
  return false;
};

export const getFormattedDate = (date) => {
  if (!date) {
    return "";
  }
  // const dateObj = new Date(date + " UTC");
  // return moment(dateObj).format("YYYY-MM-DD");
  return moment(date).format("YYYY-MM-DD");
};

const getTime = (date) => {
  return date.getHours() + ":" + ("0" + date.getMinutes()).slice(-2);
};

export const parseApiError = (errorResponse) => {
  console.log("errorResponse: ", errorResponse);
  if (!errorResponse) {
    return "Something went wrong!";
  }

  if (errorResponse.response?.data?.error) {
    return errorResponse.response?.data?.error;
  }

  if (errorResponse.message) {
    return errorResponse.message;
  }

  if (errorResponse.data && Array.isArray(errorResponse.data)) {
    const errorArray = errorResponse.data;
    if (errorArray.length > 0) {
      const firstItem = errorArray[0];
      const firstItemError = `${firstItem.type} ${firstItem.msg} ${firstItem.path}`;
      return firstItemError;
    } else {
      return "Something went wrong!";
    }
  }
};

export function calculateAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const currentDate = new Date();

  const ageInMilliseconds = currentDate - dob;
  const ageInYears = Math.floor(
    ageInMilliseconds / (365.25 * 24 * 60 * 60 * 1000)
  );
  const ageInMonths = Math.floor(
    (ageInMilliseconds % (365.25 * 24 * 60 * 60 * 1000)) /
      (30.44 * 24 * 60 * 60 * 1000)
  );
  const ageInDays = Math.floor(
    (ageInMilliseconds % (30.44 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)
  );

  return { years: ageInYears, months: ageInMonths, days: ageInDays };
}

export const calculateFollowUpText = (start_date, end_date) => {
  const dateB = moment(start_date);
  const dateC = moment(end_date);

  const totalDays = dateB.diff(dateC, "days");

  if (totalDays <= 0) {
    return `${totalDays} ${totalDays === 0 ? "Day" : "Days"}`;
  }

  let text = "";
  const years = dateB.diff(moment(dateC), "years");
  if (years > 0) {
    const months = dateB.diff(moment(dateC).add(years, "years"), "months");
    const days = dateB.diff(
      moment(dateC).add(years, "years").add(months, "months"),
      "days"
    );

    text = `${years} ${years <= 1 ? "Year" : "Years"}`;
    if (months > 0) text += ` ${months} ${months <= 1 ? "Month" : "Months"}`;
    if (days > 0) text += ` ${days} ${days <= 1 ? "Day" : "Days"}`;
  } else {
    const months = dateB.diff(moment(dateC), "months");
    if (months > 0) {
      const remainingDays = dateB.diff(
        moment(dateC).add(months, "months"),
        "days"
      );
      const weeks = Math.floor(remainingDays / 7);
      const days = remainingDays % 7;

      text = `${months} ${months <= 1 ? "Month" : "Months"}`;
      if (weeks > 0) text += ` ${weeks} ${weeks <= 1 ? "Week" : "Weeks"}`;
      if (days > 0) text += ` ${days} ${days <= 1 ? "Day" : "Days"}`;
    } else {
      const weeks = Math.floor(totalDays / 7);
      const days = totalDays % 7;

      if (weeks > 0) {
        text = `${weeks} ${weeks <= 1 ? "Week" : "Weeks"}`;
        if (days > 0) text += ` ${days} ${days <= 1 ? "Day" : "Days"}`;
      } else {
        text = `${totalDays} ${totalDays <= 1 ? "Day" : "Days"}`;
      }
    }
  }
  return text;
};

export function calculateBirthdateFromAge(age) {
  // Get the current date
  const currentDate = new Date();

  // Calculate birthdate year
  const birthYear = currentDate.getFullYear() - age.years;

  // Calculate birthdate month
  let birthMonth = currentDate.getMonth() - age.months;

  // Adjust the month and year if necessary
  if (birthMonth < 0) {
    birthMonth = 12 + birthMonth;
    birthYear--;
  }

  // Set the day to 1 for simplicity
  const birthDate = new Date(birthYear, birthMonth, 1);
  return birthDate;
}

export const generateTempId = () => {
  return "temp-id-" + Math.floor(Math.random() * 90) + 1000;
};

export const generateMockData = () => {
  const data = [];
  for (let i = 0; i < 10; i++) {
    data.push(getRandomAppointment());
  }

  return data;
};

const NAMES_FIRST = [
  "Aakash",
  "Aavesh",
  "Ajeet",
  "Sooraj",
  "Pankaj",
  "Rajesh",
  "Mangesh",
  "Jayesh",
  "Bhavesh",
  "Raj",
  "Vivek",
];
const NAMES_LAST = ["Ramachandran", "Saraswat", "Gokhale", "Shah"];

export const getRandomAppointment = () => {
  const randomMonthShort = moment()._locale._monthsShort[randomInteger(0, 11)];
  const apiTime = `${randomInteger(1, 12)}:${randomInteger(10, 59)} PM`;
  const apiDate = `${randomInteger(
    1,
    31
  )}th ${randomMonthShort} ${randomInteger(2021, 2025)}`;
  // console.log('randomMonthShort: ', moment());

  return {
    patient_unique_id: randomInteger(10000, 99999),
    pam_id: randomInteger(10000, 99999),
    pm_first_name: NAMES_FIRST[randomInteger(0, 3)],
    pm_last_name: NAMES_LAST[randomInteger(0, 3)],
    pm_gender: "Male",
    ageYears: randomInteger(18, 99),
    pm_contact_no: `${randomInteger(10, 99)}058${randomInteger(11111, 99999)}`,
    toct_type:
      Math.random() < 0.5
        ? "Follow-up"
        : Math.random() < 0.5
        ? "New"
        : "Urgent",
    apTime: apiTime,
    apDate: apiDate,
  };
};

export function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const convertBase64ToBlobURL = (base64string = "") => {
  const byteCharacters = atob(base64string);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/pdf" });
  return URL.createObjectURL(blob);
};

export const handlePrintClick = (
  element,
  setTabLoader,
  handlePrintWeb,
  chartType
) => {
  if (browserName == "Chrome WebView" || browserName == "WebKit") {
    if (!element) {
      console.error("Element not found");
      return;
    }

    const options = {
      filename: `${chartType}.pdf`,
      image: { type: "jpeg", quality: 0.8 },
      html2canvas: { scale: 1 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    setTabLoader(true);
    html2pdf()
      .from(element)
      .set(options)
      .output("datauristring")
      .then(async (pdfDataUri) => {
        const response = await fetch(pdfDataUri);
        const printBlob = await response.blob();
        const file = new File(
          [printBlob],
          `${new Date().toISOString().split("T")[0]}.pdf`,
          {
            type: "application/pdf",
          }
        );
        const formData = new FormData();
        formData.append(file?.name, file);
        const res = await uploadDocsToAzure(formData);
        const printUrl = res?.[0]?.url;
        if (res?.length > 0) {
          sendMessageToParent(EVENTS.PRINT, { url: printUrl });
        }
        // const base64string = pdfDataUri.slice(
        //   pdfDataUri.indexOf("base64,") + 7
        // );
        // const deviceUid = localStorage.getItem("app_device_unique_id");
        // if (deviceUid) {
        //   const docRef = doc(db, chartType, deviceUid);
        //   try {
        //     const docSnap = await getDoc(docRef);
        //     if (docSnap.exists()) {
        //       await updateDoc(docRef, {
        //         base64string,
        //       });
        //     } else {
        //       await setDoc(doc(db, chartType, deviceUid), {
        //         base64string,
        //       });
        //     }
        //   } catch (error) {
        //     console.error("Error updating document:", error);
        //   }
        // } else {
        //   console.error("Device UID not found");
        // }
        setTabLoader(false);
      })
      .catch((err) => {
        console.error("Error generating PDF", err);
        setTabLoader(false);
      });
  } else {
    handlePrintWeb();
  }
};

export const chunkArray = (array, size) => {
  const chunkedArr = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
};

// Helper function to get indicator letter based on hm_type
export const getHmTypeIndicator = (item, isChikitsalayAccessable = false) => {
  if (!item) return '';
  const hmType = item.tmm_hm_type || item.hm_type || item.metadata?.tmm_hm_type || item.metadata?.hm_type;
  const umId = item.um_id ?? item.metadata?.um_id;
  if (hmType == 1 && Number(umId) === 0) return 'Z';
  if (hmType == 2 ) return 'A';
  if (hmType == 15 && Number(umId) === 0 && isChikitsalayAccessable) return 'VC';
  return '';
};

export const getClinicName = (hospitalData) => {
  const decodedToken = getDecodedToken();
  const clinicId = decodedToken?.result?.clinic_id;
  const clinic = hospitalData?.find((e) => e?.hm_id == clinicId);
  return clinic ? clinic.hm_name : "";
};

export const getClinicCity = (hospitalData) => {
  const decodedToken = getDecodedToken();
  const clinicId = decodedToken?.result?.clinic_id;
  const clinic = hospitalData?.find((e) => e?.hm_id == clinicId);
  return clinic ? clinic.hm_city : "";
};

export const getClinic = (hospitalData) => {
  const decodedToken = getDecodedToken();
  const clinicId = decodedToken?.result?.clinic_id;
  const clinic = hospitalData?.find((e) => e?.hm_id == clinicId);
  return clinic || "";
};

export const getTokenData = () => {
  const decodedToken = getDecodedToken();
  const result = decodedToken?.result;
  return result || {};
};

export const getDeviceSdkData = () => {
  return { device_info: deviceDetect(), sdk_version: packageJson?.version };
};

export const compressedFile = async (
  file,
  maxSizeMB = 2,
  compressPercent = null
) => {
  if (file.size > maxSizeMB * 1024 * 1024) {
    // If file size is greater than 2MB
    try {
      const options = {
        maxSizeMB, // Target size: 2MB, the limit you want to enforce
        maxWidthOrHeight: 1920, // Max dimension, but we aim to maintain original dimensions - 1280, 2560
        useWebWorker: true, // Use a web worker for performance
        alwaysKeepResolution: true, // Ensure original height and width are maintained
      };
      if (compressPercent) {
        options.initialQuality = compressPercent / 100;
        delete options.maxSizeMB;
      }
      const compress = await imageCompression(file, options);

      // Preserve original file extension
      const fileExtension = file.name.split(".").pop(); // Get the original extension
      const newFileName = `${file.name.split(".")[0]}.${fileExtension}`;
      const renamedCompress = new File([compress], newFileName, {
        type: compress.type,
      });

      return renamedCompress;
    } catch (error) {
      console.error("Error compressing the image:", error);
      return null;
    }
  }
  return file;
};

export const groupArray = async (array) => {
  const updatedArray = array.reduce((acc, currentItem) => {
    const { tmm_id, tmm_medicine_name } = currentItem;
    let group = acc.find((item) => item.tmm_id == tmm_id);
    if (!group) {
      group = { tmm_id, tmm_medicine_name, data: [] };
      acc.push(group);
    }
    group.data.push({ ...currentItem });
    return acc;
  }, []);
  return updatedArray;
};

export const fetchDocumentAsFile = async (url, fileName) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob(); // Convert response to a Blob
    return new File([blob], fileName, { type: blob.type }); // Create a File object
  } catch (error) {
    console.error("Error fetching document: ", error);
    return null;
  }
};

export const isValidMongoId = (id) => {
  return (
    typeof id === "string" && id.length === 24 && /^[a-f\d]{24}$/i.test(id)
  );
};

export const trackEvent = (eventName, attributes) => {
  if (typeof window !== "undefined" && window.Moengage?.track_event) {
    window.Moengage.track_event(eventName, attributes);
  }
};

/**
 * Route-based Voice Rx surface for analytics (same event names; segment by `surface` + `platform`).
 */
const inferVoiceRxSurfaceFromRoute = (route = "") => {
  if (route.includes("/voice-rx-consult")) return "voice_rx_consult";
  if (route.includes("/voice-recording")) return "voice_recording";
  if (route.includes("/prescription")) return "rx_pad";
  return "";
};

/**
 * Cross-platform segmentation for Voice Rx funnels (additive fields; safe for existing dashboards).
 * - platform: web | mobile_web | android_app | ios_app
 * - client_type: browser | native (WebView in hybrid app)
 */
export const getVoiceRxSegmentationContext = (overrides = {}) => {
  const empty = {
    platform: "web",
    client_type: "browser",
    route: "",
    surface: "",
    entry_point: "",
    web_app_version: packageJson?.version || "",
    device_os: "",
  };

  if (typeof window === "undefined") {
    return { ...empty, ...overrides };
  }

  const ua = navigator.userAgent || "";
  const route = window.location?.pathname || "";

  let platform = "web";
  let client_type = "browser";

  if (isInNativeApp()) {
    client_type = "native";
    if (/Android/i.test(ua)) platform = "android_app";
    else if (/iPhone|iPad|iPod/i.test(ua)) platform = "ios_app";
    else platform = "mobile_web";
  } else if (isMobile) {
    platform = "mobile_web";
  }

  let device_os = "";
  try {
    const d = typeof deviceDetect === "function" ? deviceDetect() : {};
    device_os = d?.os || d?.os_version || "";
  } catch (e) {
    device_os = "";
  }

  const inferredSurface = inferVoiceRxSurfaceFromRoute(route);
  const surface =
    overrides.surface !== undefined && overrides.surface !== ""
      ? overrides.surface
      : inferredSurface;

  return {
    ...overrides,
    platform,
    client_type,
    route,
    surface,
    entry_point: overrides.entry_point || "",
    web_app_version: packageJson?.version || "",
    device_os,
  };
};

/**
 * Shared Voice Rx MoEngage identity payload.
 * format:
 * - "clinical": snake_case keys used in TP_AV_* events
 * - "technical": camelCase keys used in TP_Voice_* telemetry events
 * segmentation: optional overrides for getVoiceRxSegmentationContext (surface, entry_point, etc.)
 */
export const getVoiceRxMoengageBasePayload = ({
  profile,
  userId,
  patientData,
  clinic,
  format = "clinical",
  segmentation = {},
}) => {
  const seg = getVoiceRxSegmentationContext(segmentation);

  if (format === "technical") {
    return {
      doctorId: profile?.doctor_unique_id || "",
      doctorName: profile?.um_name || "",
      patientId: patientData?.patient_unique_id || "",
      patientName: patientData?.pm_fullname || "",
      hospitalId: clinic?.hm_id || "",
      hospitalName: clinic?.hm_name || "",
      ...seg,
    };
  }

  return {
    patient_id: patientData?.patient_unique_id || "",
    patient_name: patientData?.pm_fullname || "",
    patient_mobile_number: patientData?.pm_contact_no || "",
    doctor_id: profile?.doctor_unique_id || "",
    user_id: userId,
    doctor_name: profile?.um_name || "",
    doctor_specialty: profile?.dp_name || "",
    doctor_mobile_number: profile?.um_contact || "",
    hm_id: clinic?.hm_id || "",
    clinic_name: clinic?.hm_name || "",
    ...seg,
  };
};

export const getDraftMoengageDoctorAttributes = (profile, userId) => {
  const tokenData = getDecodedToken()?.result;

  return {
    doctor_name: profile?.um_name || "",
    doctor_number: profile?.um_contact || "",
    doctor_specialty: profile?.dp_name || "",
    doctor_um_id: tokenData?.user_id || userId || profile?.um_id || "",
  };
};

export const getIndianLanguageFont = (text, defaultFont = "Roboto") => {
  // Devanagari (Hindi, Marathi, Sanskrit, Nepali, etc.)
  if (/[\u0900-\u097F]/.test(text)) {
    return "AnekDevanagari";
  }

  // Bengali/Assamese
  if (/[\u0980-\u09FF]/.test(text)) {
    return "AnekBangla";
  }

  // Tamil
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return "NotoSansTamil";
  }

  // Telugu
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return "NotoSansTelugu";
  }

  // Kannada
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return "NotoSansKannada";
  }

  // Malayalam
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return "NotoSansMalayalam";
  }

  // Gujarati
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return "BalooBhai2";
  }

  // Punjabi/Gurmukhi
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return "NotoSansGurmukhi";
  }

  // Oriya/Odia
  if (/[\u0B00-\u0B7F]/.test(text)) {
    return "NotoSansOriya";
  }

  //urdu
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) {
    return "Urdu";
  }

  // Default to the regular font if no Indian script is detected
  return defaultFont;
};

export const isValidGST = (gstNumber) => {
  // GST Regex Pattern
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!gstRegex.test(gstNumber)) {
    return false; // Invalid format
  }

  // Validate State Code (first two digits: 01-35)
  const stateCode = parseInt(gstNumber.substring(0, 2), 10);
  if (stateCode < 1 || stateCode > 35) {
    return false; // Invalid state code
  }

  return true; // GST is valid
};

export const getRxTitle = (LanguageId, title) => {
    const translations = {
        1: { // English
            "S.NO": 'S.NO',
            "MEDICINE": 'MEDICINE',
            "DOSE": 'DOSE',
            "DURATION": 'DURATION',
            "QTY": 'QTY',
            "FREQUENCY": 'FREQUENCY',
            "NOTES": 'NOTES',
        },
        2: { // Gujarati
            "S.NO": 'સંખ્યા',
            "MEDICINE": 'દવાઓ',
            "DOSE": 'માત્રા',
            "DURATION": 'સમયગાળો',
            "QTY": 'જથ્થો',
            "FREQUENCY": 'આવર્તન',
            "NOTES": 'નૉૅધ',
        },
        3: { // Hindi
            "S.NO": 'संख्या',
            "MEDICINE": 'दवाइयाँ',
            "DOSE": 'खुराक',
            "DURATION": 'अवधि',
            "QTY": 'मात्रा',
            "FREQUENCY": 'आवृत्ति',
            "NOTES": 'टिप्पणियाँ',
        },
        4: { // Marathi
            "S.NO": 'अ.क्र.',
            "MEDICINE": 'औषधे',
            "DOSE": 'डोस',
            "DURATION": 'कालावधी',
            "QTY": 'प्रमाण',
            "FREQUENCY": 'FREQUENCY',
            "NOTES": 'नोट्स',
        },
        5: { // Telugu 
            "S.NO": 'S.NO',
            "MEDICINE": 'MEDICINE',
            "DOSE": 'DOSE',
            "DURATION": 'DURATION',
            "QTY": 'QTY',
            "FREQUENCY": 'FREQUENCY',
            "NOTES": 'NOTES',
        },
        6: { // Kannada
            "S.NO": 'ಸಂಖ್ಯೆ',
            "MEDICINE": 'ಔಷಧಿಗಳು',
            "DOSE": 'ಡೋಸ್',
            "DURATION": 'ಅವಧಿ',
            "QTY": 'ಪ್ರಮಾಣ',
            "FREQUENCY": 'ಆವರ್ತನ',
            "NOTES": 'ಟಿಪ್ಪಣಿಗಳು',
        },
        7: { // Urdu
            "S.NO": 'S.NO',
            "MEDICINE": 'MEDICINE',
            "DOSE": 'DOSE',
            "DURATION": 'DURATION',
            "QTY": 'QTY',
            "FREQUENCY": 'FREQUENCY',
            "NOTES": 'NOTES',
        },
        8: { // Punjabi
            "S.NO": 'S.NO',
            "MEDICINE": 'MEDICINE',
            "DOSE": 'DOSE',
            "DURATION": 'DURATION',
            "QTY": 'QTY',
            "FREQUENCY": 'FREQUENCY',
            "NOTES": 'NOTES',
        },
        9: { // Malayalam
            "S.NO": 'S.NO',
            "MEDICINE": 'MEDICINE',
            "DOSE": 'DOSE',
            "DURATION": 'DURATION',
            "QTY": 'QTY',
            "FREQUENCY": 'FREQUENCY',
            "NOTES": 'NOTES',
        },
        10: { // Tamil
            "S.NO": 'எண்',
            "MEDICINE": 'மருந்துகள்',
            "DOSE": 'மருந்தளவு',
            "DURATION": 'கால அளவு',
            "QTY": 'மொத்த அளவு',
            "FREQUENCY": 'அதிர்வெண்',
            "NOTES": 'குறிப்புகள்',
        },
        11: { // Assamese
            "S.NO": 'ক্ৰমিক নম্বৰ',
            "MEDICINE": 'ঔষধ',
            "DOSE": 'পৰিমাণ',
            "DURATION": 'সময়কাল',
            "QTY": 'পৰিমাণ',
            "FREQUENCY": 'ঘনত্ব',
            "NOTES": 'টোকা',
        },
        12: { // Bengali
            "S.NO": 'ক্র.সংখ্যা',
            "MEDICINE": 'ওষুধ',
            "DOSE": 'ডোজ',
            "DURATION": 'সময়কাল',
            "QTY": 'পরিমাণ',
            "FREQUENCY": 'ফ্রিকোয়েন্সি',
            "NOTES": 'নোট',
        },
        13: { // Odia
            "S.NO": 'କ୍ରମିକ ସଂଖ୍ୟା',
            "MEDICINE": 'ଔଷଧ',
            "DOSE": 'ଡୋଜ',
            "DURATION": 'ସମୟ',
            "QTY": 'ପରିମାଣ',
            "FREQUENCY": 'ସମୟ ଅନୁସୂଚୀ',
            "NOTES": 'ଟିପ୍ପଣୀ',
        }
    };
    return translations?.[parseInt(LanguageId)]?.[title] || title;
}

export const getDurationTitle = (LanguageId, tmm_duration_type) => {
  // Safety check: ensure tmm_duration_type exists
  if (!tmm_duration_type) {
    return tmm_duration_type || "";
  }
  var tmm_duration_type = tmm_duration_type.toLowerCase();

  const langTranslations = {
    1: {
      // English
      "day(s)": "Day(S)",
      "week(s)": "Week(S)",
      "month(s)": "Month(S)",
      "year(s)": "Year(S)",
      "to be continued": "To Be Continued",
      stat: "STAT",
      "till required": "Till required",
    },
    2: {
      // Gujarati
      "day(s)": "દિવસ",
      "week(s)": "અઠવાડિયા",
      "month(s)": "મહિનાઓ",
      "year(s)": "વર્ષ",
      "to be continued": "ચાલુ રાખો",
      stat: "તાત્કાલિક",
      "till required": "જરૂરી ત્યાં સુધી",
    },
    3: {
      // Hindi
      "day(s)": "दिन",
      "week(s)": "सप्ताह",
      "month(s)": "महीने",
      "year(s)": "वर्षों",
      "to be continued": "जारी रखो",
      stat: "तत्काल",
      "till required": "आवश्यक होने तक",
    },
    4: {
      // Marathi
      "day(s)": "दिवस",
      "week(s)": "आठवडे",
      "month(s)": "महिने",
      "year(s)": "वर्षे",
      "to be continued": "जारी रखो",
      stat: "लगेच",
      "till required": "आवश्यक तेव्हा पर्यंत",
    },
    5: {
      // Telugu
      // 'day(s)': 'రోజులు',
      // 'week(s)': 'వారాలు',
      // 'month(s)': 'నెలల',
      // 'year(s)': 'సంవత్సరాలు',
      // 'to be continued': 'కొనసాగించు',
      // 'stat': 'తక్షణమే'
      "day(s)": "Day(S)",
      "week(s)": "Week(S)",
      "month(s)": "Month(S)",
      "year(s)": "Year(S)",
      "to be continued": "To Be Continued",
      stat: "STAT",
      "till required": "Till required",
    },
    6: {
      // Kannada
      "day(s)": "ದಿನಗಳು",
      "week(s)": "ವಾರಗಳು",
      "month(s)": "ತಿಂಗಳುಗಳು",
      "year(s)": "ವರ್ಷಗಳು",
      "to be continued": "ಮುಂದುವರೆಸು",
      stat: "ತಕ್ಷಣವೇ",
      "till required": "ಅಗತ್ಯವಿರುವವರೆಗೆ",
    },
    7: {
      // Urdu
      // 'day(s)': 'دن',
      // 'week(s)': 'ہفتے',
      // 'month(s)': 'مہینہ',
      // 'year(s)': 'سال',
      // 'to be continued': 'جاری رکھو',
      // 'stat': 'فوراً'
      "day(s)": "Day(S)",
      "week(s)": "Week(S)",
      "month(s)": "Month(S)",
      "year(s)": "Year(S)",
      "to be continued": "To Be Continued",
      stat: "STAT",
      "till required": "Till required",
    },
    8: {
      // Punjabi
      // 'day(s)': 'ਦਿਨ',
      // 'week(s)': 'ਹਫ਼ਤੇ',
      // 'month(s)': 'ਮਹੀਨੇ',
      // 'year(s)': 'ਸਾਲ',
      // 'to be continued': 'ਜਾਰੀ ਰੱਖਿਆ',
      // 'stat': 'ਸ਼ੁਰੂ ਕਰੋ'
      "day(s)": "Day(S)",
      "week(s)": "Week(S)",
      "month(s)": "Month(S)",
      "year(s)": "Year(S)",
      "to be continued": "To Be Continued",
      stat: "STAT",
      "till required": "Till required",
    },
    9: {
      // Malayalam
      // 'day(s)': 'ദിവസങ്ങളിൽ',
      // 'week(s)': 'ആഴ്ചകൾ',
      // 'month(s)': 'മാസങ്ങൾ',
      // 'year(s)': 'വർഷം',
      // 'to be continued': 'തുടരും',
      // 'stat': 'സ്ഥിതി'
      "day(s)": "Day(S)",
      "week(s)": "Week(S)",
      "month(s)": "Month(S)",
      "year(s)": "Year(S)",
      "to be continued": "To Be Continued",
      stat: "STAT",
      "till required": "Till required",
    },
    10: {
      // Tamil
      "day(s)": "நாட்களில்",
      "week(s)": "வாரங்கள்",
      "month(s)": "மாதங்கள்",
      "year(s)": "ஆண்டு",
      "to be continued": "தொடரும்",
      stat: "புள்ளிவிவரங்கள்",
      "till required": "தேவையான வரை",
    },
    11: {
      // Assamese
      "day(s)": "দিন",
      "week(s)": "সপ্তাহসমূহ",
      "month(s)": "মাহ",
      "year(s)": "বছৰ",
      "to be continued": "চলি থাকিব",
      stat: "ষ্টাট",
      "till required": "Till required",
    },
    12: {
      // Bengali
      "day(s)": "দিন",
      "week(s)": "সপ্তাহগুলি",
      "month(s)": "মাস",
      "year(s)": "বছর",
      'to be continued': 'চালু রাখুন ',
      stat: "স্ট্যাট",
      'till required': 'প্রয়োজনে '
    },
    13: {
      //Odia
      "day(s)": "ଦିନ",
      "week(s)": "ସପ୍ତାହଗୁଡ଼ିକ",
      "month(s)": "ମାସ",
      "year(s)": "ବର୍ଷ",
      "to be continued": "ଚାଲୁ ରହିବ",
      stat: "ଷ୍ଟାଟ୍",
      "till required": "ଆବଶ୍ୟକ ହେଉଅ ଯାଏଁ",
    },
  };

  // Safety check: ensure LanguageId is valid and exists in langTranslations
  const languageId = parseInt(LanguageId);
  const languageTranslations = langTranslations[languageId];

  if (!languageTranslations || !languageTranslations[tmm_duration_type]) {
    return tmm_duration_type;
  }

  return languageTranslations[tmm_duration_type];
};

export const getTimeingTitle = (LanguageId) => {

    var FetchColumn = 'tmt_title';

    if (LanguageId == 1) {
        FetchColumn = 'tmt_title';
    } else if (LanguageId == 2) {
        FetchColumn = 'tmt_gujarati';
    } else if (LanguageId == 3) {
        FetchColumn = 'tmt_hindi';
    } else if (LanguageId == 4) {
        FetchColumn = 'tmt_marathi';
    } else if (LanguageId == 6) {
        FetchColumn = 'tmt_kannada';
    } else if (LanguageId == 10) {
        FetchColumn = 'tmt_tamil';
    } else if (LanguageId == 11) {
        FetchColumn = 'tmt_assamese';
    } else if (LanguageId == 12) {
        FetchColumn = 'tmt_bengali';
    } else if (LanguageId == 13) {
        FetchColumn = 'tmt_odia';
    }

    return FetchColumn;
}

export const getFrequencyTitle = (LanguageId) => {

    var FetchColumn = 'tmf_title';

    if (LanguageId == 1) {
        FetchColumn = 'tmf_title';
    } else if (LanguageId == 2) {
        FetchColumn = 'tmf_gujarati';
    } else if (LanguageId == 3) {
        FetchColumn = 'tmf_hindi';
    } else if (LanguageId == 4) {
        FetchColumn = 'tmf_marathi';
    } else if (LanguageId == 6) {
        FetchColumn = 'tmf_kannada';
    } else if (LanguageId == 10) {
        FetchColumn = 'tmf_tamil';
    } else if (LanguageId == 11) {
        FetchColumn = 'tmf_assamese';
    } else if (LanguageId == 12) {
        FetchColumn = 'tmf_bengali';
    } else if (LanguageId == 13) {
        FetchColumn = 'tmf_odia';
    }

    return FetchColumn;
}

export const getFrequencyLanguageTitles = (languageId) => {
    const languageMap = {
        1: 'english',
        2: 'gujarati',
        3: 'hindi',
        4: 'marathi',
        6: 'kannada',
        10: 'tamil',
        11: 'assamese',
        12: 'bengali',
        13: 'odia',
    };

    const frequencyTitles = {
        english: {
            morning: 'Morning',
            afternoon: 'Afternoon',
            evening: 'Evening',
            night: 'Night'
        },
        gujarati: {
            morning: 'સવારે',
            afternoon: 'બપોર',
            evening: 'સાંજે',
            night: 'રાત્રે'
        },
        hindi: {
            morning: 'सुबह',
            afternoon: 'दोपहर',
            evening: 'शाम',
            night: 'रात'
        },
        marathi: {
            morning: 'सकाळी',
            afternoon: 'दुपारी',
            evening: 'संध्याकाळ',
            night: 'रात्री'
        },
        kannada: {
            morning: 'ಬೆಳಗ್ಗೆ',
            afternoon: 'ಮಧ್ಯಾಹ್ನ',
            evening: 'ಸಂಜೆ',
            night: 'ರಾತ್ರಿ'
        },
        tamil: {
            morning: 'காலை பொழுதில்',
            afternoon: 'மதியம்',
            evening: 'மாலையில்',
            night: 'இரவு'
        },
        assamese: {
            morning: 'সকাল',
            afternoon: 'বিকাল',
            evening: 'সন্ধ্যা',
            night: 'ৰাতি'
        },
        bengali: {
            morning: 'সকাল',
            afternoon: 'দুপুর',
            evening: 'সন্ধ্যা',
            night: 'রাত'
        },
        odia: {
            morning: 'ସକାଳ',
            afternoon: 'ବେଳୁଆ',
            evening: 'ସନ୍ଧ୍ୟା',
            night: 'ରାତି'
        },
    };

    const language = languageMap[languageId] || 'english';
    return frequencyTitles[language];
}

export const shouldMonetizationDisabled = () => {
  const monetizationDisabled = config?.tp_monetization_disabled_hospital;
  const monetizationDisabledArray = monetizationDisabled.map(Number);
  const { hospital_business_id = null } = getTokenData();
  // console.log(monetizationDisabled,hospital_business_id)
  const currentHospital = Number(hospital_business_id);

  if (currentHospital && monetizationDisabledArray.includes(currentHospital)) {
    return true;
  }

  return false;
};

export const shouldAppointmentAgentDisabled = () => {
  const appointmentAgentDisabled = config?.tp_agent_disabled_hospital;
  const appointmentAgentDisabledArray = appointmentAgentDisabled.map(Number);
  const { hospital_business_id = null } = getTokenData();
  const currentHospital = Number(hospital_business_id);

  if (currentHospital && appointmentAgentDisabledArray.includes(currentHospital)) {
    return true;
  }

  return false;
};

export const isMunshiHospital = () => {
  const munshiHospitalIds = config?.munshi_hospital_business_ids;
  const munshiHospitalArray = munshiHospitalIds?.map(Number) || [];
  const { hospital_business_id = null } = getTokenData();
  const currentHospital = Number(hospital_business_id);

  if (currentHospital && munshiHospitalArray.includes(currentHospital)) {
    return true;
  }

  return false;
};

export const detectOperatingSystem = () => {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;

  const os = {
    Windows: /Win/.test(platform),
    MacOS: /Mac/.test(platform),
    Linux: /Linux/.test(platform),
    iOS: /iPhone|iPad|iPod/.test(userAgent),
    Android: /Android/.test(userAgent),
  };

  return Object.keys(os).find((key) => os[key]) || "Unknown";
};

/**
 * Normalized onboarding device label: os_formFactor
 * Desktop uses OS-specific keys (mac_desktop, windows_desktop, linux_desktop).
 */
export const getOnboardingDeviceSource = () => {
  if (typeof window === "undefined" || !window.navigator) {
    return "other_desktop";
  }

  const ua = window.navigator.userAgent || "";
  const maxTouchPoints = Number(window.navigator.maxTouchPoints || 0);
  const innerWidth =
    typeof window.innerWidth === "number" ? window.innerWidth : 0;

  // iPad / iPadOS (Safari reports Macintosh + touch)
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) {
    return "ios_tablet";
  }
  if (/iPhone|iPod/i.test(ua)) {
    return "ios_phone";
  }

  const isAndroid = /Android/i.test(ua);
  if (isAndroid) {
    // Android phones generally include "Mobile" somewhere in UA
    const hasAndroidMobileSegment = /Android/i.test(ua) && /Mobile/i.test(ua);
    const looksLikeTablet =
      /Tablet|SM-T\d|GT-P\d|KFAPWI|Kindle|Silk|Nexus\s(?:7|9|10)\b/i.test(
        ua
      );

    if (hasAndroidMobileSegment || /Mobi/i.test(ua)) {
      return "android_phone";
    }
    if (looksLikeTablet || maxTouchPoints > 1) {
      return "android_tablet";
    }
    // Android UA without Mobile: TV, some WebViews, or desktop-like / emulator
    const finePointer =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: fine)")?.matches;
    if (finePointer && innerWidth >= 1024) {
      return "android_desktop";
    }
    return "android_tablet";
  }

  const os = detectOperatingSystem();
  if (os === "MacOS") return "mac_desktop";
  if (os === "Windows") return "windows_desktop";
  if (os === "Linux") return "linux_desktop";
  if (os === "Android") return "android_desktop";
  if (os === "iOS") return "ios_phone";
  return "other_desktop";
};

export const sendMessageToParent = (eventName, data = {}) => {
  try {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ action: eventName, data })
      );
    } else {
      console.warn("ReactNativeWebView is not available on the window object.");
    }
  } catch (error) {
    console.log("sendMessageToParent ERROR", error);
  }
};

export const clearExpiredTokensFromStorage = () => {
  try {
    const tokensObject = localStorage.getItem(SNAP_RX_TOKENS_STORAGE_KEY);
    if (tokensObject) {
      const parsedTokens = JSON.parse(tokensObject);
      const currentTime = Date.now();
      const validTokens = {};

      Object.keys(parsedTokens).forEach((key) => {
        if (parsedTokens[key].expiresIn > currentTime) {
          validTokens[key] = parsedTokens[key];
        }
      });

      localStorage.setItem(
        SNAP_RX_TOKENS_STORAGE_KEY,
        JSON.stringify(validTokens)
      );
    }
  } catch (error) {
    console.error("Error cleaning up expired tokens:", error);
  }
};

export const isZydus = () => env?.ZYDUS_BUSINESS_ID === getTokenData()?.hospital_business_id;

export const isVoiceRxFree = (isVoiceRxFreeFromGB = false) => {
  return (
    (isZydus() && new Date(env?.zydus_voice_rx_expiry_date) > new Date()) ||
    isVoiceRxFreeFromGB
  );
};

// Function to determine supported MIME types for MediaRecorder in the current browser
export const getSupportedMimeType = () => {
  if (!MediaRecorder) {
    return null;
  }

  // Try different MIME types in order of preference
  const mimeTypes = [
    "audio/webm;codecs=opus",     // Best compression for long recordings
    "audio/mp4;codecs=mp4a.40.2", // AAC - excellent compression
    "audio/webm",                 // Good fallback
    "audio/mp4",                  // Wide API compatibility
    "audio/mpeg",                 // MP3 - universal support
  ];

  for (const type of mimeTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return null; // No supported type found, let browser use default
};

export const stopAllActiveRecorders = () => {
  try {
    if (window.mediaRecorderRef && window.mediaRecorderRef.current) {
      if (window.mediaRecorderRef.current.state !== 'inactive') {
        try {
          window.mediaRecorderRef.current.stop();
        } catch (e) {
          console.error('Error stopping global mediaRecorderRef:', e);
        }
      }
    }

    if (window.audioStreamRef && window.audioStreamRef.current) {
      try {
        window.audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        window.audioStreamRef.current = null;
      } catch (e) {
        console.error('Error stopping global audioStreamRef:', e);
      }
    }

    if (window.streamRef && window.streamRef.current) {
      try {
        window.streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        window.streamRef.current = null;
      } catch (e) {
        console.error('Error stopping global streamRef:', e);
      }
    }

    if (window.audioContextRef && window.audioContextRef.current) {
      try {
        if (window.audioContextRef.current.state !== 'closed') {
          window.audioContextRef.current.close();
        }
        window.audioContextRef.current = null;
      } catch (e) {
        console.error('Error closing global audioContextRef:', e);
      }
    }
    console.log('Stopped active recorders and streams (page reload will complete cleanup)');
  } catch (error) {
    console.error('Error stopping all active recorders:', error);
  }
};

export const isApollo = () => env?.APOLLO_BUSINESS_IDS?.includes(getTokenData()?.hospital_business_id);

// List of specific doctors who should see "Tatva Care Platform" branding
const TATVACARE_DOCTORS = [
  "NMQAvpjb7nPRYBh",
  "7RULp5rlfWF8JC6",
  "9RplZSe-tEGFzQP"
];

// Helper function to determine if current doctor should use TatvaCare platform
export const shouldUseTatvaCare = () => {
  // Get user ID from localStorage or token
  const token = localStorage.getItem('persistant.storage.key.auth-token');
  if (!token) return false;
  
  try {
    const decodedToken = JSON.parse(atob(token.split('.')[1]));
    const doctorId = decodedToken?.result?.doctor_unique_id;
    
    // Check if this doctor is in the TatvaCare list
    return TATVACARE_DOCTORS.includes(doctorId);
  } catch (error) {
    return false;
  }
};

// Helper function to get the platform name based on user type
export const getPlatformName = () => {
  return shouldUseTatvaCare() ? "Tatva Care Platform" : "Tatva Pedia";
};

// Helper function to get the platform name for welcome messages
export const getWelcomePlatformName = () => {
  return shouldUseTatvaCare() ? "Tatva Care Platform" : "TatvaPractice";
};

export const getImageDimensions = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = (err) => reject(err);
  });
};

export const updateFooterImageHeight = (
  footerFile,
  setFileFooter,
  initialUpdate
) => {
  getImageDimensions(footerFile?.showFile)
    .then(({ height, width }) => {
      const widthOfA4PageInPts = 595;
      const PX_TO_PT = 0.75;
      const pageXPadding = PX_TO_PT * 60;
      const footerImgDimensions = {
        footerHeight: height || 0,
        footerWidth: width || 0,
        renderedFooterImageHeight:
          (height / width) * (widthOfA4PageInPts - pageXPadding) || 0,
      };
      if (initialUpdate) {
        setFileFooter({
          imageShow: true,
          showFile: footerFile?.showFile,
          ...footerImgDimensions,
        });
      } else {
        setFileFooter((prev) => ({ ...prev, ...footerImgDimensions }));
      }
    })
    .catch((err) => {
      console.error(err);
      if (initialUpdate) {
        setFileFooter({
          imageShow: true,
          showFile: footerFile?.showFile,
          footerHeight: 0,
          footerWidth: 0,
          renderedFooterImageHeight: 0,
        });
      }
    });
};

/**
 * Handles redirecting to IPD admission page with patient data
 * @param {Object} record - Patient record containing patient information
 */
export const handleAdmitToIpd = async (record) => {

  try {
    // Check if patient is already admitted before proceeding
    const { store } = await import("../redux/store");
    const { checkPatientAdmitted } = await import("../redux/ipdSlice");
    
    const patientId = record.patient_unique_id || record.pm_pid || "";
    
    if (patientId) {
      try {
        const checkResult = await store.dispatch(
          checkPatientAdmitted({
            patientId: patientId,
          })
        );
        
        if (checkResult.payload?.alreadyAdmitted) {
          message.error("Patient is already admitted");
          return;
        }
      } catch (checkError) {
        // If check fails, log but continue with admission flow
        // (API might not be available or patient might not exist in IPD system yet)
        console.warn("Could not verify patient admission status:", checkError);
      }
    }

    // Map patient record to the expected patient data format for CreateAdmission
    const patientData = {
      pm_fullname: record.pm_fullname || record.patientName || "",
      pm_contact_no: record.pm_contact_no || record.mobileNo || "",
      pm_pid: record.pm_pid || "",
      patient_unique_id: record.patient_unique_id || 0,
      pm_gender: record.pm_gender || record.gender || "",
      ageYears: record.ageYears || 0,
      ageMonths: record.ageMonths || 0,
      ageDays: record.ageDays || 0,
      pm_salutation: record.pm_salutation || "",
      pm_address: record.pm_address || record.patient_address || record.address || "",
      pm_blood_group: record.pm_blood_group || record.bloodGroup || "",
      pm_email: record.pm_email || record.email || "",
      DOB: record.DOB || record.dob || "",
    };

    // Encode patient data to Base64
    const jsonString = JSON.stringify(patientData);
    const base64String = btoa(unescape(encodeURIComponent(jsonString)));
    const encodedData = encodeURIComponent(base64String);

    // Get the base URL - use doctor_portal_url from env if available, otherwise use current origin
    const baseUrl = config.ipd_portal_url;
    
    // Get and parse token, removing any quotes
    let token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    if (token) {
      try {
        // Try to parse if it's JSON string
        const parsed = JSON.parse(token);
        token = typeof parsed === 'string' ? parsed : token;
      } catch (e) {
        // If not JSON, use as is
      }
      // Remove any surrounding quotes
      token = token.replace(/^["']|["']$/g, '');
    }
    
    // Build the complete URL with encoded patient data and token
    const url = token 
      ? `${baseUrl}/?redirectTo=ipd/create-admission?patientData=${encodedData}&authToken=${token}`
      : `${baseUrl}/ipd/create-admission?patientData=${encodedData}`;


    // const url = `http://localhost:3000/?redirectTo=ipd/create-admission?patientData=${encodedData}&authToken=${token}`;
    // Redirect to the CreateAdmission page
    window.location.href = url;
  } catch (error) {
    console.error("Error redirecting to CreateAdmission:", error);
    message.error("Failed to redirect to admission page. Please try again.");
  }
};

export const isIPad = () => {
  return navigator.userAgent.includes("iPad") || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
};

export const formatHeightWeight = (value = '') =>
  value?.includes('/') ? value?.split('/').reverse().join('/') : value;

export const filterCustomModuleContent = (customModuleContents = []) => {
  return customModuleContents
    ?.map((e) => {
      if (!e) return null;
      // Filter content based on module version
      let filteredContent;
      if (e.module_version === "v2") {
        // For V2 modules, filter rows with content and remove 'id' field
        filteredContent =
          e.content
            ?.filter((row) => {
              // Check if any field (except 'id') has content
              const { id, ...fields } = row || {};
              return Object.values(fields).some(
                (value) => value && value.toString().trim().length > 0,
              );
            })
            .map((row) => {
              // Remove 'id' field from the actual payload
              const { id, ...cleanRow } = row || {};
              return cleanRow;
            }) || [];
      } else {
        // For V1 modules, check for title or notes
        filteredContent = (e.content || []).filter(
          (e1) => e1.title || e1.notes,
        );
      }

      // Skip modules with no content after filtering
      if (!filteredContent || filteredContent.length === 0) {
        return null;
      }

      return { ...e, content: filteredContent };
    })
    .filter(Boolean);
};

export const camelCaseToTitle = (str)  => {
  if (!str) return "";
  if (str === "periodontalseverity" || str === "Periodontalseverity") {
    return "Periodontal Severity";
  }
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (first) => first.toUpperCase())
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export const camelToSentence = (str) => {
  if (!str) return "";
  const withSpaces = str.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const lower = withSpaces.toLowerCase();
  return lower[0].toUpperCase() + lower.slice(1);
}
