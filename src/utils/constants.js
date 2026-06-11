import { v4 as uuidv4 } from "uuid";
import { env } from "../EnvironmentConfig";

/** Azure static assets root — keep in sync with $tp-assets-base in src/styles/variables.scss and ASSETS in src/assets.js */
export const TP_ASSETS_BASE =
  "https://pmdoctorportal.blob.core.windows.net/tp-assets/assets";

const codeIcon = `${TP_ASSETS_BASE}/images/code.svg`;
const validateHealthcareIcon = `${TP_ASSETS_BASE}/images/validate-heathcare.svg`;
const clinicalStudyIcon = `${TP_ASSETS_BASE}/images/clinical-study.svg`;
const apexAI = `${TP_ASSETS_BASE}/images/apexAI.svg`;
const scannerIcon = `${TP_ASSETS_BASE}/images/scanner.webp`;
const sunIcon = `${TP_ASSETS_BASE}/images/sun.webp`;
const cameraIcon = `${TP_ASSETS_BASE}/images/camera.webp`;
const cropIcon = `${TP_ASSETS_BASE}/images/crop.webp`;

export const PERSISTANT_STORAGE_KEY_AUTH_TOKEN =
  "persistant.storage.key.auth-token";
export const PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN =
  "persistant.storage.key.zydus-token";
export const PERSISTANT_STORAGE_KEY_MEDECO_TOKEN =
  "persistant.storage.key.medeco-token";
export const PERSISTANT_STORAGE_KEY_EXTRA = "persistant.storage.key.extra";
export const SNAP_RX_TOKENS_STORAGE_KEY = "snapRxFileUploadTokensV2";
export const OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY =
  "ophthalSnapRxFileUploadTokensV2";
export const FROM_NATIVE_APP = "from_native_app";
export const MESSAGE_KEY = "message_key";
export const PERSISTANT_STORAGE_KEY_BILL_TOKEN = 'persistant.storage.key.bill-token';
export const TNC_VERSION = "2.0";
export const IS_DEV = true;
export const PAGE_SIZE = 10;

export const PATIENT_DETAILS_SIDEBAR_KEYS = {
  VISIT_SUMMARY: 1,
  MEDICAL_CERTIFICATE: 2,
  MEDICAL_RECORDS: 3,
  BILL_PAYMENT: 4,
  ABHA_RECORDS: 5,
  HEALTH_CHECKUP_REPORT: 6,
};

export const TAB_QUEUE = 0;
export const TAB_DRAFT_RX = 6;
export const TAB_FINISHED = 3;
export const TAB_CANCELLED = 4;
export const TAB_ZYDUS_ENCOUNTER = 11;
export const TAB_ZYDUS_APPOINTMENT = 12;
export const TAB_CLINIC_APPOINTMENT = 0;
export const TAB_CLINIC_QUEUE = 7;

export const TAB_CAMPAIGN = 0;
export const TAB_DRAFT = 1;
export const TAB_PURCHASE = 2;

export const TAB_PRESCRIPTION = 1;
export const TAB_HEADER_FOOTER = 2;
export const TAB_PAGE_FORMAT = 3;

export const TAB_ADDRESS = "1";
export const TAB_TIMINGS = "2";
export const TAB_PHOTOS = "3";

export const ADD = "ADD";
export const EDIT = "EDIT";

export const NORMAL = "NORMAL";
export const WHATSAPP = "WHATSAPP";

export const WEBSOCKET_ADDRESS = "ws://localhost:5001/iScribeSocket";
export const WS_CONTROL_URL = "ws://localhost:5002/iScribeControlSocket";
export const WEBSOCKET_ERROR_MESSAGE =
  "Error connecting the server, Please check device connectivity";
export const WHATS_APP_API = "/api/v1/casemanager/smart-rx/send";
export const ZYDUS_WHATS_APP_API = "/api/v1/casemanager/sendZydusRxWhatsapp";
export const SMART_RX_UPLOAD = "/api/v1/casemanager/smart-rx/upload";
export const RX_DIGITIZATION = "/api/v1/rxdigitize/rx";
export const UNFINISHED_RX_CASE = "//api/v1/casemanager/get-ufinished-case";

export const LAB_PARAMS_RESULTS = "/api/v1/lab-parameters/results";
export const IS_RX_DIGI_API_CALL = false;
export const FETCH_SMART_RX = "/api/v1/casemanager/smart-rx";
export const OPD_API_KEY = "lChjFRJce3bxmoS3TSQk5w==";
export const WTSAP_ERR_MESSAGE =
  "Error sending the prescription, Please try again";

export const AISENSY_SCRIPT_ID = "aisensy-wa-widget";
export const AISENSY_SCRIPT_CONTAINER = ".aisensy-widget-container";
export const AISENSY_SCRIPT_SRC = "https://d3mkw6s8thqya7.cloudfront.net/integration-plugin.js";

export const GB_ISCRIBE = "iscribe";
export const GB_SMARTSYNC_CONNECT = "smartsync-connect";
export const GB_SMARTSYNC_CVT = "smartsync-cvt";
export const GB_TALKATIVE = "Talkative";
export const GB_GYNEC_HISTORY = "obs-gynec-history";
export const GB_ZYDUS_USER = "zydus-hospital-user";
export const GB_MANYA_DENTAL = 'manya-dental';
export const GB_PILLUP_MEDICINE = "pillup-medicine-switch";
export const GB_APOLLO_DISABLE_FEATURE = "apollo-disable-feature";
export const GB_DISABLE_GROUNDING = "disable-grounding";
export const GB_OPTHAL_MODULE = "opthal-module";
export const GB_SAVE_AS_DRAFT_RX = "save-as-draft-rx";
export const GB_HEALTH_CHECKUP_REPORT = "health-checkup-report";
export const GB_VOICE_RX_FREE = "free-voice-rx";
export const GB_ZYDUS_WHATSAPP = "zydus-doctor-whatsapp-enablement";
export const GB_CHIKITSALAY = "chikitsalay";
export const GB_VOICE_RX_NEW_UI = "voice-rx-new";
export const CLINIC_TARGET_STATUS = {
  SERVING: "SERVING",
  COMPLETED: "COMPLETED",
}
export const OPTHAL_PAD_MODULE_ID = 23;
export const OPTHAL_PAD_MODULE = {
  tmdpm_id: 23,
  tmdpm_type: "R",
  tmdpm_name: "Opthal",
  tmdpm_short_name: "Opthal",
  tmdpm_status: 0,
  tmdpm_icon_url: `${env.php_base_url}/img/microservices/right/opthal.svg`,
};

export const GYNAECOLOGY = "Gynaecology";
export const PAEDIATRICS = "Paediatrics";
export const NEO_NATOLOGISTS_DP_ID = 122;
export const PAEDIATRICS_DP_ID = 9;
export const WEIGHT_HEIGHT_TITLE = "Weight/Height";
export const GB_SNAP_RX = "snap-rx";
export const GB_SNAP_RX_DIGITIZATION = "snap-rx-digitization";
export const GB_DISABLE_MSG91_OTP_FLOW = "disable-msg91-otp-flow";
export const GB_CARE_PLAN = "care-plan-dropdown";
export const GB_VIDEO_CONSULT = "video-consult";
export const GB_TELE_CONSULT = "tele-consult";
export const GB_TAB_RX = "tab-rx";
export const GB_TAB_RX_CVT = "tab-rx-cvt";
export const GB_CVT_EXT_HOS = "cvt-external-hospitals";
export const EXTERNAL_HOSPITAL_BUSINESS_IDS = {
  MISSION_HOSPITAL: String(env.mission_hospital_business_id),
};

export const MISSION_HOSPITAL_ADDRESS = "THE MISSION HOSPITAL Plot No. 219(P), IMMON KALYAN SARANI, SECTOR-2C, Bidhannagar, Durgapur -713212, West Bengal - Ph No: 8687500500";

export const FREE = "FREE";
export const TRIAL = "TRIAL";
export const PAID = "PAID";
export const PENDING = "PENDING";
export const APPROVED = "APPROVED";
export const REJECTED = "REJECTED";
export const GB_NEW_IPD = "new-ipd";
export const GB_NEW_IPD_HOS_BUSINESS_ID = "new-ipd-hos-business-id";
export const GB_NEW_IPD_ZYDUS = "new-ipd-zydus";
export const GB_APPT_SEQUENCE = "enable-sequence-change";
export const FAILED_VERIFICATION = "FAILED-VERIFICATION";
export const PENDING_VERIFICATION = "PENDING-VERIFICATION";
export const S_TATVA_PRACTICE = "tatva_practice";
export const S_VOICE_RX = "voice_rx";
export const S_AMBIENT_VOICE_RX = "VOICE_RX_AMBIENT_DIGITIZATION";
export const S_SMARTSYNC = "smartsync";
export const S_RX_DIGITIZATION = "rx_digitization";
export const S_DDX = "ddx";
export const S_ASK_TATVA = "ask_tatva";
export const S_BILLING = "billing";
export const S_PHARMACY = "pharmacy";
export const S_IPD = "ipd";
export const S_OPD_BILLING = "opd_billing";
export const S_RECEPTIONIST_AGENT = "receptionist_agent";
export const GB_MED_INVESTIGATION = "VoiceRx_B2B_med_investigations";

// Medical Records - Document Upload Configuration
export const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
export const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo"]; 
export const SUPPORTED_DOCUMENT_TYPES = ["application/pdf"];
export const MAX_DOCUMENT_FILE_SIZE = 15728640; // 15 MB
export const MAX_VIDEO_FILE_SIZE = 31457280; // 30 MB
export const MAX_FILES_PER_UPLOAD = 5;
export const VIDEO_THUMBNAIL_TIME = 1; // Extract thumbnail at 1 second

export const EXTRA_OPTIONS = [
  {
    key: JSON.stringify({
      value: "STAT",
      label: "Stat",
      tmm_days: parseInt(0),
      unique_id: uuidv4(),
    }),
    value: "STAT",
    label: "Stat",
  },
  {
    key: JSON.stringify({
      value: "to be continued",
      label: "To Be Continued",
      tmm_days: parseInt(0),
      unique_id: uuidv4(),
    }),
    value: "to be continued",
    label: "To Be Continued",
  },
  {
    key: JSON.stringify({
      value: "till required",
      label: "Till Required",
      tmm_days: parseInt(0),
      unique_id: uuidv4(),
    }),
    value: "till required",
    label: "Till Required",
  },
];

export const ABORTION = "Abortion";
export const MISCARRIAGE = "Miscarriage";
export const IS_DDX_DIAGNOSIS_OPEN = "isDdxDiagnosisOpen";
export const IS_DDX_LAB_INVESTIGATION_OPEN = "isDdxLabInvestigationOpen";

export const FONTS_FAMILY_LIST = [
  {
    value: "Times-Roman",
    label: <div className="fonttimesroman">Times Roman</div>,
  },
  {
    value: "Verdana",
    label: <div className="fontverdana">Verdana</div>,
  },
  {
    value: "Calibri",
    label: <div className="fontcalibri">Calibri</div>,
  },
  {
    value: "Tahoma",
    label: <div className="fonttahoma">Tahoma</div>,
  },
  {
    value: "Roboto",
    label: <div className="fontroboto">Roboto</div>,
  },
];

export const FONTS_SIZE_LIST = [
  {
    value: 8,
    label: "8",
  },
  {
    value: 10,
    label: "10",
  },
  {
    value: 12,
    label: "12",
  },
  {
    value: 14,
    label: "14",
  },
  {
    value: 16,
    label: "16",
  },
];

export const LANGUAGE_LIST = [
    {
        value: 1,
        label: 'English',
    },
    {
        value: 2,
        label: 'Gujarati',
    },
    {
        value: 3,
        label: 'Hindi',
    },
    {
        value: 4,
        label: 'Marathi',
    },
    // {
    //     value: 5,
    //     label: 'Telugu',
    // },
    {
        value: 6,
        label: 'Kannada',
    },
    // {
    //     value: 7,
    //     label: 'Urdu',
    // },
    // {
    //     value: 8,
    //     label: 'Punjabi',
    // },
    // {
    //     value: 9,
    //     label: 'Malayalam',
    // },
    {
        value: 10,
        label: 'Tamil',
    },
    {
        value: 11,
        label: 'Assamese',
    },
    {
        value: 12,
        label: 'Bengali',
    },
    {
        value: 13,
        label: 'Odia',
    },
]

export const PAEDIATRIC_DP_ID = 9;

export const DDX_KNOW_MORE_DATA = {
  mainHeader: "AI-Powered Differential Diagnosis",
  tabs: [
    {
      title: "Basic Info",
      key: "basicInfo",
    },
    {
      title: "Trust Indicators",
      key: "trust",
    },
    {
      title: "Diagnostic Process",
      key: "howItWorks",
    },
    {
      title: "Tips",
      key: "tips",
    },
  ],
  trustDetails: [
    {
      title: "Evidence-Based Algorithms",
      description:
        "Built on leading clinical guidelines such as ICD-10 and SNOMED CT to ensure reliable and accurate results",
      icon: codeIcon,
    },
    {
      title: "Validated by Healthcare Experts",
      description:
        "Developed and reviewed in collaboration with top physicians to ensure clinical relevance and safety.",
      icon: validateHealthcareIcon,
    },
    // {
    //   title: "HIPAA & GDPR Compliant",
    //   description:
    //     "Fully adheres to global healthcare data privacy standards, ensuring the safety and confidentiality of patient.",
    //   icon: compliantIcon,
    // },
    {
      title: "Backed by Clinical Studies",
      description:
        "Supported by peer-reviewed research to improve diagnostic accuracy and reduce time to treatment.",
      icon: clinicalStudyIcon,
    },
  ],
  basicInfo: {
    title: "What is Differential Diagnosis",
    icon: apexAI,
    description:
      "Our AI tool helps you generate possible diagnoses by analyzing patient symptoms, examinations, history, and clinical findings, including past patient data for more accurate results. This feature speeds up diagnosis and assists in better decision-making for patient care.",
  },
  trust: {
    title: "Why Trust Our AI-Powered Differential Diagnosis?",
    description:
      "Our AI tool is built on leading clinical guidelines such as ICD-10 and SNOMED CT to ensure reliable and accurate results. It is developed and reviewed in collaboration with top physicians to ensure clinical relevance and safety. It is supported by peer-reviewed research to improve diagnostic accuracy and reduce time to treatment.",
  },
  howItWorks: {
    title: "How Differential Diagnosis Works",
    description:
      "Our AI tool helps you generate possible diagnoses by analyzing patient symptoms, examinations, history, and clinical findings, including past patient data for more accurate results. This feature speeds up diagnosis and assists in better decision-making for patient care.",
  },
  videoLink: {
    link: "https://www.youtube.com/embed/mAZ7Sa86PnQ",
    thumbnail: "https://i.ytimg.com/vi/mAZ7Sa86PnQ/hqdefault.jpg",
  },
  tips: {
    title: "Tips to get the best results",
    description: (
      <>
        <span style={{ fontWeight: "600" }}>Enter detailed Analysis: </span>
        The more detailed and structured the patient information you provide
        (such as symptoms, examinations, history, and medications), the better
        the accuracy of the differential diagnosis results.
      </>
    ),
  },
  disclaimer: (
    <>
      <b>Disclaimer</b>: These results are generated by AI and should be used as
      a guide, not the final source for patient treatment
    </>
  ),
};

export const SNAP_RX_KNOW_MORE_DATA = {
  mainHeader: "AI-Powered Snap Rx",
  tabs: [
    {
      title: "Basic Info",
      key: "basicInfo",
    },
    {
      title: "How it works",
      key: "howItWorks",
    },
    {
      title: "Tips",
      key: "tips",
    },
  ],
  basicInfo: {
    smallTitle: "Basic Info",
    title: "What is Snap Rx?",
    icon: apexAI,
    description:
      "Our AI engine lets you upload written prescriptions as images or PDFs, which are then converted into structured digital consultations—no special device or pad required. This makes it effortless to digitise consultations using paper-based Rxs while ensuring accurate storage and continuity of care.",
  },
  howItWorks: {
    smallTitle: "How it works",
    title: "How Snap Rx Digitisation Works?",
    description: "Please watch this video to know how Snap Rx  Works👇",
  },
  videoLink: {
    link: "https://www.youtube.com/embed/xXPsyTPSNHA",
    thumbnail: "https://i.ytimg.com/vi/xXPsyTPSNHA/hqdefault.jpg",
  },
  tips: {
    smallTitle: "Tips",
    title: "Tips to upload an Rx for better Rx Digitisation",
    list: [
      {
        title: "Place the prescription well-lit surface",
        description:
          "Use a plain background with even lighting for best clarity.",
        icon: scannerIcon,
      },
      {
        title: "Avoid any shadows or glare",
        description:
          "Ensure the document is fully visible without reflections or obstructions.",
        icon: sunIcon,
      },
      {
        title: "Grant camera access if prompted",
        description:
          "This is required to capture and upload the prescription smoothly.",
        icon: cameraIcon,
      },
      {
        title: "No need to include letterhead’s header & footer",
        description:
          "We'll automatically add a standard header and footer after submission to keep things consistent.",
        icon: cropIcon,
      },
    ],
  },
};

export const HIDE_ROUTES = {
  BANNER: ["/snap-rx"],
  TALKATIVE: ["/snap-rx", "/prescription"],
};


// Custom Canvas Size Increased upto 20 
export const CUSTOM_CANVAS_DOCTORS_USER_ID = [
  524,25734,30098,123
];

export const INVESTIGATION_TITLE = "Investigation";
export const INVESTIGATION_PRINT_ID = 6;
export const INVESTIGATION_MODULE_ID = 14;
