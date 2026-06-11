import {
  Button,
  DatePicker,
  Drawer,
  Dropdown,
  Input,
  Row,
  Spin,
  Table,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../common/Header";
import SidebarDoctor from "../../common/SidebarDoctor";
import "./AllPatients.scss";
import { genderAge } from "../opdBilling/components/viewBillPdf/helper";
import { fetchAllPatients } from "./service";
import { env } from "../../EnvironmentConfig";
import {
  isAndroid,
  isBrowser,
  isChrome,
  isMobile,
  isSafari,
} from "react-device-detect";
import moment from "moment";
import dayjs from "dayjs";
import {
  generateUniqueFileName,
  getCorrectedFileName,
} from "../medicalRecords/utils/helper";
import { useSelector } from "react-redux";
import {
  fetchAllDocumentCategories,
  uploadDocsToAzure,
} from "../medicalRecords/service";
import {
  resetUploadDocState,
  setLoadingStatus,
  setUploadDocCategories,
} from "../../redux/uploadDocSlice";
import { useDispatch } from "react-redux";
import CommonModal from "../../common/CommonModal";
import UploadDocPopup from "../medicalRecords/components/uploadDocPopup/UploadDocPopup";
import UploadDocument from "../medicalRecords/UploadDocument";

import { debounce } from "lodash";
import * as XLSX from "xlsx";
import { handleInAppClick } from "../opdBilling/utils/helper";
import {
  errorMessage,
  getClinicName,
  sendMessageToParent,
  trackEvent,
  handleAdmitToIpd,
} from "../../utils/utils";

import CreateCertificate from "../../components/medical_certificate/CreateCertificate";
import { getDecodedToken, useLocalStorage } from "../../utils/localStorage";
import axios from "axios";
import config from "../../config";
import { jwtDecode } from "jwt-decode";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_NEW_IPD, GB_NEW_IPD_HOS_BUSINESS_ID, PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";
import { resetVaccineState } from "../../redux/vaccineSlice";
import { resetGrowthChartState } from "../../redux/growthChartSlice";
import { resetObstetricState } from "../../redux/obstetricSlice";
import { resetDDxState } from "../../redux/ddxSlice";
import { EVENTS } from "../../utils/events";
import AbhaDrawer from "../../components/abha/AbhaDrawer";
import { clearAbhaDetails } from "../../redux/abhaSlice";

import ApiAbha from "../../api/services/ApiAbha";
import { saveAs } from "file-saver";
import { ASSETS } from "../../assets";
const {
  alerticon: alertIcon,
  endVisit: successIcon,
  closeVisit: closeIcon,
  abhaSvg: AbhaIcon,
} = ASSETS.images;

const { RangePicker } = DatePicker;

const dateFormat = "YYYY-MM-DD";
const showDateFormat = "DD MMM YYYY";

const AllPatients = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const decodedToken = getDecodedToken();
  const [getToken, setToken] = useLocalStorage(
    PERSISTANT_STORAGE_KEY_AUTH_TOKEN
  );
  const isAdmin = decodedToken?.result?.admin;
  const { profile } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const { uploadDocCategories, isLoading } = useSelector(
    (state) => state.uploadDoc
  );
  const dischargeSummery = profile?.module_data?.find(
    (item) => item?.type === "MyT_patient" || item?.type === "dis_patient"
  );
  const { userId } = useSelector((state) => state.doctors);
  const [locationPath, setLocationPath] = useState("/");
  const [tokenData, setTokenData] = useState(null);
  const [allPatientsData, setAllPatientsData] = useState([]);
  const [loading, setOnLoad] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: moment("2000-01-01").format(dateFormat),
    endDate: moment().format(dateFormat),
  });
  const [pickerModal, setPickerModal] = useState(false);
  const [dateStatus, setDateStatus] = useState(4);
  const [uploadDocDrawer, setUploadDocDrawer] = useState(false);
  const [shouldShowUploadDocPopup, setShowUploadDocPopup] = useState(false);
  const [filesData, setFilesData] = useState([]);
  const [patientData, setPatientData] = useState(null);
  const [isFileSizeError, setIsFileSizeError] = useState(false);
  const [isFileLimitError, setIsFileLimitError] = useState(false);
  const [isFileTypeError, setIsFileTypeError] = useState(null);
  const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [showCertificate, setShowCertificate] = useState(false);
  const [createAbhaDrawer, setCreateAbhaDrawer] = useState(false);

  const isNewIPDAccessableFromGB = useFeatureIsOn(GB_NEW_IPD);
  const isNewIPDHosBusinessIdAccessableFromGB = useFeatureIsOn(
    GB_NEW_IPD_HOS_BUSINESS_ID
  );
  const isZydusAccount =
    tokenData?.hospital_business_id == env.zydus_business_id;

  const fileInputRef = useRef(null);
  const observer = useRef();
  const MESSAGE_KEY = "patient_update_message";
  const doctorDetails = {
    clinic_name: getClinicName(profile?.hospital_data),
    clinic_id: tokenData?.result?.clinic_id,
    doctor_id: profile?.doctor_unique_id,
    doctor_name: profile?.um_name,
    doctor_mobile_no: profile?.um_contact,
    device_details: isMobile ? "Tab" : "Web",
  };

  useEffect(() => {
    if (profile) {
      const getStorageData = async () => {
        const token = await getToken();
        if (token !== undefined) {
          try {
            var decoded = jwtDecode(token);
            setTokenData(decoded.result);
            window.beamer_config = {
              ...window.beamer_config,
              product_id: "JBgEuAKX59541",
              filter: profile?.dp_name,
              user_firstname: profile?.um_name,
              user_lastname: "",
              user_id: decoded.result.user_id,
            };
          } catch (e) {
            console.log(e);
          }
        }
      };
      getStorageData();
    }
  }, [profile]);

  useEffect(() => {
    setLocationPath(location.pathname);
  }, [location]);

  useEffect(() => {
    getAllPatients();
  }, [dateRange, pageNo]);

  useEffect(() => {
    if (uploadDocCategories.length === 0) {
      getAllDocumentCategories();
    }
  }, []);

  useEffect(() => {
    // Show message if redirected from patient form
    if (location.state?.showMessage) {
      const messageType = location.state.messageType;

      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={successIcon} className="me-3" alt="Success" />
            <div>
              <div className="title-common text-start fontroboto">
                {messageType === "updated"
                  ? "Patient details updated successfully"
                  : "Patient added successfully"}
              </div>
            </div>
            <img
              src={closeIcon}
              className="ms-3 cursor-pointer"
              onClick={() => message.destroy(MESSAGE_KEY)}
              alt="Close"
            />
          </div>
        ),
        duration: 5,
      });

      // Clear the message from location state
      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [location]);

  const debouncedSearch = useMemo(
    () =>
      debounce(() => {
        getAllPatients();
      }, 500),
    [searchQuery] // Include the functions in dependencies
  );

  useEffect(() => {
    // Execute the search
    debouncedSearch(searchQuery);

    // Cleanup
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  const lastPostElementRef = useCallback(
    (node) => {
      if (loading || !setOnLoad) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMoreData();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, setOnLoad]
  );

  const loadMoreData = useCallback(() => {
    setPageNo((prevPageNo) => prevPageNo + 1);
  }, []);

  const getAllDocumentCategories = async () => {
    const response = await fetchAllDocumentCategories();
    dispatch(setUploadDocCategories(response));
  };

  const getAllPatients = async () => {
    const params = {
      page: pageNo,
      limit: 25,
      search: searchQuery,
    };
    if (dateStatus !== 4) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    const res = await fetchAllPatients(params);
    if (pageNo === 1 || searchQuery !== "") {
      setAllPatientsData(res);
    } else {
      setAllPatientsData((prev) => {
        return { ...res, patients: [...prev.patients, ...res.patients] };
      });
    }
  };

  const onSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      setPageNo(1);
    },
    [searchQuery]
  );

  const handleAddClick = (record) => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    trackEvent("TP_AllPatients_UploadMedicalRecords", {
      ...doctorDetails,
      patient_id: record?.pm_pid,
      patient_name: record?.pm_fullname,
      patient_number: record?.pm_contact_no,
    });
  };

  const handleRetryBtn = () => {
    setFilesData([]);
    setIsFileSizeError(false);
    setIsFileLimitError(false);
    setIsFileTypeError(null);
  };

  const handleUploadDocPopup = (record) => {
    setShowUploadDocPopup((prev) => !prev);
    setPatientData(record);
  };

  const handleDrawerUploadDoc = () => {
    setUploadDocDrawer(!uploadDocDrawer);
  };

  const handleDeletePopup = () => {
    setShowDeletePopup(true);
  };

  const handleShowCertificate = () => {
    setShowCertificate((prev) => !prev);
  };

  const handleCreateAbhaDrawer = useCallback(() => {
    setCreateAbhaDrawer(!createAbhaDrawer);
  }, [createAbhaDrawer]);

  const handleDownloadAbhaCard = async (record) => {
    try {
      const patientUniqueId = record?.patient_unique_id;
      if (!patientUniqueId) {
        message.error("Patient unique ID not found");
        return;
      }

      message.loading({ content: "Downloading ABHA Card...", key: "downloadAbha", duration: 0 });
      
      const response = await ApiAbha.downloadAbhaCard({
        patient_unique_id: patientUniqueId,
      });

      // Get content type from response headers
      const contentType = response.headers['content-type'] || 'image/png';
      const blob = new Blob([response.data], { type: contentType });
      
      // Generate filename with patient unique ID
      const fileName = `ABHA_Card_${patientUniqueId}.${contentType.includes('png') ? 'png' : contentType.includes('jpg') || contentType.includes('jpeg') ? 'jpg' : 'png'}`;
      
      saveAs(blob, fileName);
      message.success({ content: "ABHA Card downloaded successfully", key: "downloadAbha", duration: 3 });
    } catch (error) {
      console.error("Error downloading ABHA card:", error);
      message.error({ 
        content: error?.response?.data?.message || "Failed to download ABHA Card. Please try again.", 
        key: "downloadAbha", 
        duration: 3 
      });
    }
  };

  const onSuccessAbhaCreation = () => {
    dispatch(clearAbhaDetails());
    getAllPatients();
  };

  const handleFileUpload = (event, record) => {
    const files = event.target.files;
    if (files) {
      const filesData = Array.from(files);
      if (filesData.length > 0) {
        const updatedFiles = [];
        filesData.forEach((file) => {
          const cleanFileName = getCorrectedFileName(file?.name || "");
          // Check if the file is an image and if its name follows typical camera-captured file patterns
          const isCapturedFromCamera =
            (file.type === "image/jpeg" ||
              file.type === "image/png" ||
              file.type === "image/jpg") &&
            (cleanFileName === "image.webp" ||
              cleanFileName === "image.webp" ||
              cleanFileName === "image.webp");

          let newFile = file;

          if (isCapturedFromCamera) {
            // Generate a unique file name for camera-captured images
            const uniqueFileName = generateUniqueFileName(file);
            newFile = new File([file], uniqueFileName, { type: file.type });
          } else {
            // If the file name had spaces, create a new file with spaces removed
            newFile = new File([file], cleanFileName, { type: file.type });
          }

          updatedFiles.push(newFile);
        });
        setFilesData(updatedFiles);
        handleDrawerUploadDoc();
        setPatientData(record);
      }
    }
    event.target.value = null;
  };

  const onPatientDetailsClick = (record) => {
    const resolvedMrno =
      record?.mrno || record?.pm_reference_id || record?.tpml_refrence_id;
    dispatch(resetVaccineState());
    dispatch(resetGrowthChartState());
    dispatch(resetObstetricState());
    dispatch(resetUploadDocState());
    dispatch(resetDDxState());
    navigate("/patient_details", {
      state: {
        patient_data: {
          ...record,
          pm_first_name: record?.pm_fullname,
          mrno: resolvedMrno,
        },
      },
    });
    trackEvent("TP_AllPatients_PatientDetailsView", {
      ...doctorDetails,
      patient_id: record?.pm_pid,
      patient_name: record?.pm_fullname,
      patient_number: record?.pm_contact_no,
    });
  };

  const onEditPatientClick = (record) => {
    navigate("/edit_patient", {
      state: { patient_data: record, from: "/all_patients" },
    });
    trackEvent("TP_AllPatients_EditPatientDetails", {
      ...doctorDetails,
      patient_id: record?.pm_pid,
      patient_name: record?.pm_fullname,
      patient_number: record?.pm_contact_no,
    });
  };

  const getMenuItems = (record) => {
    const menuItems = [
      {
        label: (
          <span onClick={() => onPatientDetailsClick(record)}>
            View Patient Details
          </span>
        ),
        key: "patientdetails",
      },
      ...(!isZydusAccount
        ? [
            {
              label: (
                <span onClick={() => onEditPatientClick(record)}>
                  Edit Patient Details
                </span>
              ),
              key: "labparams",
            },
          ]
        : []),
      // This will be added later
      // {
      //   label: <span onClick={() => {}}>Book Appointment</span>,
      //   key: "bookappt",
      // },
      {
        label: (
          <div onClick={() => handleAddClick(record)}>
            Upload Medical Records
            {/* {isAndroid && !isBrowser ? (
              <div
                ref={fileInputRef}
                onClick={() => handleUploadDocPopup(record)}
                style={{ display: "none" }}
              />
            ) : ( */}
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={(event) => handleFileUpload(event, record)}
                accept="image/png, image/jpeg, image/jpg, image/gif, application/pdf, video/mp4, video/quicktime, video/x-msvideo"
                style={{ display: "none" }}
              />
            {/* )} */}
          </div>
        ),
        key: "uploadDoc",
      },
      {
        label: (
          <span
            onClick={() => {
              handleShowCertificate(record);
              setPatientData(record);
              trackEvent("TP_AllPatients_CreateCertificate", {
                ...doctorDetails,
                patient_id: record?.pm_pid,
                patient_name: record?.pm_fullname,
                patient_number: record?.pm_contact_no,
              });
            }}
          >
            Create Certificate
          </span>
        ),
        key: "createCertificate",
      },
      ((isNewIPDAccessableFromGB || isNewIPDHosBusinessIdAccessableFromGB) && !isZydusAccount)
        ? {
            label: (
              <span
                onClick={() => {
                  handleAdmitToIpd(record);
                }}
              >
                Admit to IPD
              </span>
            ),
            key: "admitToIpd",
          }
        : undefined,
    ];
    if (!record?.abhaAddress && profile?.HipID && profile?.abhaEnable) {
      menuItems.push({
        label: (
          <span
            onClick={() => {
              setPatientData(record);
              handleCreateAbhaDrawer();
            }}
          >
            Create/Link ABHA
          </span>
        ),
        key: "createLinkAbha",
      });
    }

    if (record?.abhaAddress && profile?.HipID && profile?.abhaEnable) {
      menuItems.push({
        label: (
          <span
            onClick={() => {
              setPatientData(record);
              handleDownloadAbhaCard(record);
            }}
          >
            Download ABHA Card
          </span>
        ),
        key: "downloadAbha",
      });
    }
    return menuItems;
  };

  const columns = [
    {
      title: "#",
      dataIndex: "srno",
      key: "srno",
      ellipsis: true,
      width: "6%",
      className: "fs-14",
      render: (text, record, index) => (
        <div>
          <span>{index + 1}</span>
        </div>
      ),
    },
    {
      title: "PATIENT DETAILS",
      dataIndex: "patient_details",
      key: "patient_details",
      ellipsis: true,
      width: "28%",
      render: (text, record) => (
        <div>
          <span
            onClick={() => onPatientDetailsClick(record)}
            className="text-primary cursor-pointer"
          >
            {record.pm_fullname}
            {record?.abhaAddress && profile?.HipID && profile?.abhaEnable && (
              <img
                src={AbhaIcon}
                alt="ABHA"
                style={{ width: "18px", height: "18px", marginLeft: "4px" }}
              />
            )}
          </span>
          <br />
          <small>
            {record?.pm_gender}, {genderAge(record)}
          </small>
        </div>
      ),
    },
    {
      title: "Contact",
      dataIndex: "pm_contact_no",
      key: "pm_contact_no",
      ellipsis: true,
      width: "17%",
      render: (text, record) => (
        <div>
          <span>{record.pm_contact_no} </span>
        </div>
      ),
    },
    {
      title: "Patient ID",
      dataIndex: "pm_pid",
      key: "pm_pid",
      ellipsis: true,
      width: "12%",
      render: (text, record) => (
        <div>
          <span>{record.tpml_refrence_id || record.pm_pid} </span>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      ellipsis: true,
      width: "12%",
      render: (text, record) => (
        <div>
          <span>{record.category ?? "-"} </span>
        </div>
      ),
    },
    {
      title: "Last Visit",
      dataIndex: "lastVisitDate",
      key: "lastVisitDate",
      ellipsis: true,
      width: "15%",
      render: (text, record) => (
        <div>
          <span>
            {record.lastVisitDate
              ? moment(record.lastVisitDate).format("DD-MM-YYYY")
              : "-"}
          </span>
        </div>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 170,
      width: "10%",
      render: (_, record, index) => (
        <div>
          <Dropdown
            className="btn btn-outline btn-more ms-3"
            menu={{
              items: getMenuItems(record),
            }}
            trigger={["click"]}
          >
            <a
              onClick={(e) => {
                e.preventDefault();
                trackEvent("TP_AllPatients_Actionitemkebabmenu", {
                  ...doctorDetails,
                  patient_id: record?.pm_pid,
                  patient_name: record?.pm_fullname,
                  patient_number: record?.pm_contact_no,
                });
              }}
            >
              <i className="icon-More" />
            </a>
          </Dropdown>
        </div>
      ),
    },
  ];

  const disabledDate = (current) => {
    return current && current > dayjs().endOf("day");
  };

  const handlePickerModal = useCallback(() => {
    setPickerModal(!pickerModal);
  }, [pickerModal]);

  const rangePresets = [
    {
      label: (
        <div className={`${dateStatus === 4 ? "active" : ""}`}>Till date</div>
      ),
      value: [dayjs("2000-01-01"), dayjs()], // From start date till today
    },
    {
      label: <div className={`${dateStatus === 1 ? "active" : ""}`}>Today</div>,
      value: [dayjs(), dayjs().endOf("day")],
    },
    {
      label: (
        <div className={`${dateStatus === 2 ? "active" : ""}`}>Last 7 days</div>
      ),
      value: [dayjs().add(-7, "d"), dayjs()],
    },
    {
      label: (
        <div className={`${dateStatus === 3 ? "active" : ""}`}>
          Last 30 days
        </div>
      ),
      value: [dayjs().add(-1, "M"), dayjs()],
    },
    {
      label: (
        <div
          className={`${!dateStatus ? "active" : ""}`}
          onClick={() => onRangeChange(null)}
        >
          Custom range
        </div>
      ),
      value: null,
    },
  ];

  const onRangeChange = (dates, dateStrings) => {
    setPageNo(1);
    if (dates) {
      if (
        moment("2000-01-01").format(dateFormat) ==
          moment(dateStrings[0], showDateFormat).format(dateFormat) &&
        dayjs().format(dateFormat) ==
          moment(dateStrings[1], showDateFormat).format(dateFormat)
      ) {
        setDateStatus(4);
      } else if (
        dayjs().format(dateFormat) ==
          moment(dateStrings[0], showDateFormat).format(dateFormat) &&
        dayjs().format(dateFormat) ==
          moment(dateStrings[1], showDateFormat).format(dateFormat)
      ) {
        setDateStatus(1);
      } else if (
        dayjs().add(-7, "d").format(dateFormat) ==
          moment(dateStrings[0], showDateFormat).format(dateFormat) &&
        dayjs().format(dateFormat) ==
          moment(dateStrings[1], showDateFormat).format(dateFormat)
      ) {
        setDateStatus(2);
      } else if (
        dayjs().add(-1, "M").format(dateFormat) ==
          moment(dateStrings[0], showDateFormat).format(dateFormat) &&
        dayjs().format(dateFormat) ==
          moment(dateStrings[1], showDateFormat).format(dateFormat)
      ) {
        setDateStatus(3);
      } else {
        setDateStatus(null);
      }
      setDateRange({
        startDate: moment(dateStrings[0], showDateFormat).format(dateFormat),
        endDate: moment(dateStrings[1], showDateFormat).format(dateFormat),
      });
    } else {
      setDateStatus(null);
      setDateRange({
        startDate: moment().format(dateFormat),
        endDate: moment().format(dateFormat),
      });
    }
  };

  const setStartLoader = (data) => {
    dispatch(setLoadingStatus(data));
  };

  const fetchAllPatientsForDownload = async () => {
    let allPatients = [];
    let currentPage = 1;
    const PAGE_SIZE = 1000; // match API's default/actual page size

    try {
      // Keep fetching until we reach totalPages
      while (true) {
        const params = {
          page: currentPage,
          limit: PAGE_SIZE,
          search: searchQuery,
        };
        // Respect the same date filter logic as list view
        if (dateStatus !== 4) {
          params.startDate = dateRange.startDate;
          params.endDate = dateRange.endDate;
        }

        const res = await fetchAllPatients(params);
        const rows = res?.patients || [];
        const totalPages = res?.totalPages || 0;

        if (!rows.length) break;

        allPatients = [...allPatients, ...rows];

        // If totalPages provided, use it to determine completion
        if (totalPages && currentPage >= totalPages) break;
        // Fallback: stop if server returns fewer rows than requested
        if (rows.length < PAGE_SIZE) break;
        currentPage += 1;
      }

      return allPatients;
    } catch (error) {
      console.error("Error fetching all patients:", error);
      errorMessage("Error downloading patient data");
      return null;
    }
  };

  const clickOldModule = (moduleName) => {
    SSO_TO_PM().then(async (data) => {
      if (data.success == 200) {
        if (!isChrome && !isSafari) {
          // navigate(`/?url=${data.url}&module=${moduleName}&key=phpRedirect`, {
          //   replace: true,
          // });
          // navigate(0, { replace: true });
          sendMessageToParent(EVENTS.REDIRECT, {
            url: data?.url,
            module: moduleName
          });
        } else {
          window.open(`${data.url}&module=${moduleName}`);
        }
      }
    });
    trackEvent("TP_AllPatients_DischargeSummary", doctorDetails);
  };

  async function SSO_TO_PM() {
    try {
      const sendData = {
        doctor_unique_id: tokenData.doctor_unique_id,
        mobile_no: tokenData.mobile_no,
        clinic_id: tokenData.clinic_id,
        hm_business_id: tokenData.hospital_business_id,
        from: "app",
      };

      const formData = new FormData();
      Object.keys(sendData).forEach((key) => {
        formData.append(key, sendData[key]);
      });

      const response = await axios.post(config.sso_to_pm_url, formData, {
        auth: {
          username: config.sso_to_pm_username,
          password: config.sso_to_pm_password,
        },
      });

      return response.data;
    } catch (err) {
      console.log(err.message);
      console.log(err.response.status);
    }
  }

  const handleDownloadPatientData = async () => {
    try {
      // Show loading state
      setStartLoader(true);

      // Fetch all patients
      const allPatients = await fetchAllPatientsForDownload();

      if (!allPatients) {
        setStartLoader(false);
        return;
      }

      // Get today's date in YYYY-MM-DD format
      const today = moment().format("DDMMYYYY");

      const excelData = allPatients.map((patient) => ({
        "Patient Name": `${
          patient.pm_salutation ? patient.pm_salutation + " " : ""
        } ${patient.pm_fullname}`,
        Gender: patient.pm_gender,
        "Date of Birth": patient.pm_dob
          ? moment(patient.pm_dob).format("DD-MM-YYYY")
          : "",
        Age: `${
          patient.ageYears
            ? `${patient.ageYears}y${patient.ageMonths ? `, ` : ""}`
            : ""
        }${patient.ageMonths ? `${patient.ageMonths}m` : ""}`,
        Mobile: patient.pm_contact_no,
        "Patient ID": patient.tpml_refrence_id || patient.pm_pid,
        Category: patient.category,
        "Last Visited": patient.lastVisitDate
          ? moment(patient.lastVisitDate).format("DD-MM-YYYY")
          : "",
        "Street Address": patient.pm_address,
        City: patient.pm_city,
        State: patient.pm_state,
        "Pin Code": patient.pm_pincode,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      worksheet["!cols"] = [
        { wch: 25 }, // Name
        { wch: 10 }, // Gender
        { wch: 15 },
        { wch: 10 },
        { wch: 13 },
        { wch: 13 },
        { wch: 15 },
        { wch: 12 },
        { wch: 30 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Patient Data");

      if (!isChrome && !isSafari) {
        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });

        const excelBlob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        // Create File object
        const file = new File([excelBlob], `patient_data_${today}.xlsx`, {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const formData = new FormData();
        formData.append(file?.name, file);
        const res = await uploadDocsToAzure(formData);
        if (res?.length > 0) {
          const printUrl = res?.[0]?.url;
          sendMessageToParent(EVENTS.DOWNLOAD, { url: printUrl });
          // handleInAppClick(
          //   userId,
          //   "download",
          //   printUrl,
          //   setStartLoader(true)
          // );
        }
      } else {
        // Download file directly in Chrome/Safari
        XLSX.writeFile(workbook, `patient_data_${today}.xlsx`);
      }

      setStartLoader(false);
      trackEvent("TP_AllPatients_DownloadPatients", doctorDetails);
    } catch (error) {
      console.error("Error in handleDownloadPatientData:", error);
      errorMessage("Error downloading patient data");
      setStartLoader(false);
    }
  };

  const handleAddPatient = () => {
    dispatch(clearAbhaDetails());
    navigate("/add_patient", {
      state: { from: "/all_patients" },
    });
    trackEvent("TP_AllPatients_AddNewPatient", doctorDetails);
  };

  return (
    <>
      <Header locationPath={locationPath} />
      <div className="d-flex billing-dashboard-wraper">
        <SidebarDoctor activeItem={"opd-billing"} />
        <div className="w-100 bg-body wrapper">
          <>
            <div className="welcomesection position-relative mb-3">
              <div className="bg-welcome d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <>
                    <div>
                      <h1>All Patients</h1>
                    </div>
                    <img
                      src={ASSETS.images.bgWelcome}
                      className="welcomeig d-inline-block align-top"
                      alt="Welcome"
                    />
                  </>
                </div>
                <div className="d-flex gap-3 btn-manage-bill-all-patients">
                  {!isZydusAccount &&
                    dischargeSummery &&
                    Object.keys(dischargeSummery)?.length > 0 && (
                      <Button
                        className="btn-manage-bill"
                        onClick={() => clickOldModule(dischargeSummery?.type)}
                      >
                        <span style={{ textTransform: "capitalize" }}>
                          {dischargeSummery?.title}
                        </span>
                      </Button>
                    )}
                  {!isZydusAccount && (
                    <Button
                      className="btn-create-bill gap-1"
                      onClick={handleAddPatient}
                      icon={<i className="icon-Add" style={{ fontSize: 20 }} />}
                    >
                      <span>Add New Patient</span>
                    </Button>
                  )}
                </div>
              </div>
              <div className="pb-5">&nbsp;</div>
            </div>
          </>

          <div className="border rounded-4 appointment-wrap dateborder mb-4 all-patients">
            <div className="billing-table-wrapper mt-2">
              <Row className="justify-content-between align-items-center my-4 px-4">
                <div className="d-flex align-items-center gap-3">
                  <div>
                    <Input
                      value={searchQuery}
                      placeholder={"Search by patient name / ID / mobile no"}
                      className="inputheight38"
                      prefix={<i className="icon-search" />}
                      suffix={
                        searchQuery.length > 0 && (
                          <i
                            className="icon-Cross"
                            onClick={() => onSearch("")}
                          />
                        )
                      }
                      onChange={(e) => onSearch(e.target.value)}
                    />
                  </div>
                  <div className="all-patients-date-wrapper">
                    <div
                      className="fs-14 h-100 w-100 d-flex align-items-center justify-content-between"
                      onClick={handlePickerModal}
                    >
                      <span>
                        {dateStatus === 1 ? (
                          "Today"
                        ) : dateStatus === 2 ? (
                          "Last week"
                        ) : dateStatus === 3 ? (
                          "Last month"
                        ) : dateStatus === 4 ? (
                          "Till date"
                        ) : (
                          <>
                            {moment(dateRange.startDate).format(showDateFormat)}{" "}
                            - {moment(dateRange.endDate).format(showDateFormat)}
                          </>
                        )}
                      </span>
                      <i className="mx-2 fs-18 icon-calendar"></i>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: isMobile ? "-120px" : 0,
                        top: isMobile ? "-10px" : 0,
                      }}
                    >
                      <RangePicker
                        disabledDate={(current) => disabledDate(current)}
                        open={pickerModal}
                        presets={rangePresets}
                        format={showDateFormat}
                        autoAdjustOverflow={true}
                        onChange={onRangeChange}
                        popupClassName="all-patients-date-popup"
                        className="all-patients-date-input"
                        inputReadOnly
                        renderExtraFooter={() => (
                          <div className="d-flex align-items-center justify-content-between py-1">
                            <div>
                              {dateStatus !== 4 || !dateStatus
                                ? `${moment(dateRange.startDate).format(
                                    showDateFormat
                                  )} -
                                  ${moment(dateRange.endDate).format(
                                    showDateFormat
                                  )}`
                                : "Till Date"}
                            </div>
                            <div>
                              <button
                                className="btn btn-text me-3 px-0"
                                onClick={() => {
                                  setDateStatus(1);
                                  setDateRange({
                                    startDate: moment().format(dateFormat),
                                    endDate: moment().format(dateFormat),
                                  });
                                  handlePickerModal();
                                  setPageNo(1);
                                }}
                              >
                                <span>Cancel</span>
                              </button>
                              <Button
                                className="px-4"
                                type="primary"
                                onClick={handlePickerModal}
                              >
                                Done
                              </Button>
                            </div>
                          </div>
                        )}
                        onOpenChange={() => {}}
                        value={[
                          dateRange.startDate !== dateRange.endDate
                            ? dayjs(
                                moment(dateRange.startDate).format(
                                  showDateFormat
                                ),
                                showDateFormat
                              )
                            : "",
                          dateRange.startDate != dateRange.endDate
                            ? dayjs(
                                moment(dateRange.endDate).format(
                                  showDateFormat
                                ),
                                showDateFormat
                              )
                            : "",
                        ]}
                      />
                    </div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="ddx-ready-txt">
                    (Showing{" "}
                    {allPatientsData?.patients?.length ===
                    allPatientsData?.total ? (
                      <span className="ddx-ready-txt">
                        {allPatientsData?.patients?.length}
                      </span>
                    ) : (
                      <span className="ddx-ready-txt">
                        {allPatientsData?.patients?.length}
                      </span>
                    )}{" "}
                    of {allPatientsData?.total} patients)
                  </div>
                  {planDetails?.currentPlanStatus === "PAID" && isAdmin ? (
                    <div
                      className="d-flex justify-content-between align-items-center billing-download"
                      onClick={handleDownloadPatientData}
                    >
                      <i
                        className="icon-download"
                        style={{ cursor: "pointer", color: "#4B4AD5" }}
                      />
                    </div>
                  ) : null}
                </div>
              </Row>
            </div>

            <Row className="justify-content-between align-items-center px-4">
              <div className="card-container appointment-data">
                <Table
                  className="mt-1"
                  columns={columns}
                  dataSource={allPatientsData?.patients}
                  pagination={false}
                  loading={loading && pageNo === 1}
                />
                {allPatientsData?.totalPages > allPatientsData?.page &&
                  setOnLoad && (
                    <div
                      ref={lastPostElementRef}
                      className="align-items-center d-flex h-38 justify-content-center"
                    >
                      <Spin />
                    </div>
                  )}
              </div>
            </Row>
          </div>
        </div>
      </div>
      {uploadDocDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          bodyStyle={{ backgroundColor: "white" }}
          onClose={handleDeletePopup}
          open={uploadDocDrawer}
          className="modalWidth-700"
          width="auto"
          push={false}
        >
          <UploadDocument
            onClose={handleDeletePopup}
            handleDrawerUploadDoc={handleDrawerUploadDoc}
            shouldShowDeletePopup={shouldShowDeletePopup}
            setShowDeletePopup={setShowDeletePopup}
            filesData={filesData}
            setFilesData={setFilesData}
            patientData={patientData}
            handleUploadDocPopup={() => setShowUploadDocPopup((prev) => !prev)}
            isAppointmentData={true}
          />
        </Drawer>
      )}
      {shouldShowUploadDocPopup && (
        <UploadDocPopup
          shouldShowUploadDocPopup={shouldShowUploadDocPopup}
          onCancel={() => setShowUploadDocPopup(false)}
          setFilesData={setFilesData}
          filesData={filesData}
          setUploadDocDrawer={setUploadDocDrawer}
          patientData={patientData}
          setIsFileSizeError={setIsFileSizeError}
          setIsFileLimitError={setIsFileLimitError}
          setIsFileTypeError={setIsFileTypeError}
        />
      )}
      {isLoading ? (
        <div>
          <Spin
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              zIndex: "9999",
            }}
            size="large"
          />
        </div>
      ) : null}
      {isFileSizeError || isFileLimitError || isFileTypeError ? (
        <CommonModal
          isModalOpen={isFileSizeError || isFileLimitError || isFileTypeError}
          onCancel={handleRetryBtn}
          modalWidth={500}
          title={
            isFileSizeError
              ? "Exceeded File Size"
              : isFileLimitError
              ? "Exceeded File Upload Limit"
              : isFileTypeError
              ? "File format not supported"
              : "You may lose your data"
          }
          modalBody={
            <>
              <div className="alert-warning rounded-10px p-2 patient-details">
                <div className="d-flex align-items-center">
                  <img className="me-3" src={alertIcon} alt="Warning" />
                  <span>
                    {isFileSizeError ? (
                      <>
                        The file size exceeded{" "}
                        <span style={{ fontWeight: 700 }}>15MB.</span> Please
                        upload a file smaller than 15MB
                      </>
                    ) : isFileLimitError ? (
                      <>
                        You can only upload up to
                        <span style={{ fontWeight: 700 }}> 5 files.</span>{" "}
                        Please reduce the number of files and try again.
                      </>
                    ) : isFileTypeError ? (
                      <>
                        You can't upload
                        <span style={{ fontWeight: 700 }}>
                          {" "}
                          {isFileTypeError}
                        </span>{" "}
                        file. Only PDF, JPG, JPEG, and PNG formats are accepted.
                      </>
                    ) : (
                      "Are you sure you want to leave ?"
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleRetryBtn}
                  className="w-100 btn btn-primary3 btn-41 px-4"
                >
                  Retry
                </Button>
              </div>
            </>
          }
        />
      ) : null}
      {showCertificate && (
        <Drawer
          className="modalWidth-563"
          width="auto"
          title="Create Certificate"
          placement="right"
          closable
          open={showCertificate}
          onClose={handleShowCertificate}
        >
          <CreateCertificate
            handleCreateCertificateDrawer={handleShowCertificate}
            patient_data={patientData}
            replace={false}
          />
        </Drawer>
      )}
      {createAbhaDrawer && (
        <AbhaDrawer
          onClose={handleCreateAbhaDrawer}
          open={createAbhaDrawer}
          patientUniqueId={patientData?.patient_unique_id}
          onSuccess={onSuccessAbhaCreation}
        />
      )}
    </>
  );
};

export default AllPatients;
