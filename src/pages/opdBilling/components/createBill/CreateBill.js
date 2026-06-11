import { Col, Container, Navbar, Row } from "react-bootstrap";
import CommonModal from "../../../../common/CommonModal";
import {
  AutoComplete,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Drawer,
  Input,
  Radio,
  Select,
  Table,
  Tooltip,
  message,
} from "antd";

import React, { useCallback, useEffect, useState, useRef } from "react";
import DiagnosisNotes from "../../../obstetric/components/diagnosisNotes/DiagnosisNotes";
import {
  getClinic,
  onlyDecimalFormat,
  removeBeforeWhiteSpace,
  trackEvent,
  getClinicName,
} from "../../../../utils/utils";
import ServiceItemPopup from "../serviceItemPopup/ServiceItemPopup";
import "./CreateBill.scss";
import RefIdPopup from "../refIdPopup/RefIdPopup";
import ReadMore from "../../../../common/ReadMore";
import ViewBillPdf from "../viewBillPdf/ViewBillPdf";
import { useSelector } from "react-redux";
import { pdf } from "@react-pdf/renderer";
import PreviewBill from "../../PreviewBill";
import { calculateTotalAmount, printContent, enrichPatientDataWithAbha } from "../../utils/helper";
import moment from "moment";
import {
  createBill,
  fetchAdvanceSetting,
  fetchPatientDueAmount,
  fetchPatientWalletBalance,
  fetchPrintSetting,
  listAdvancedDepositByPatient,
  searchBillItem,
} from "../../service";
import { setLoadingStatus } from "../../../../redux/uploadDocSlice";
import { useDispatch } from "react-redux";
import { deleteDoc, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../../../firebase";
import { deleteDocsUploadedFromAndroid } from "../../../medicalRecords/service";
import {
  setAdvancedSettings,
  setBillPrintSettings,
  setIpdBillPrintSettings,
} from "../../../../redux/billingSlice";
import { jwtDecode } from "jwt-decode";
import {
  getDecodedToken,
  useLocalStorage,
} from "../../../../utils/localStorage";
import {
  MESSAGE_KEY,
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
} from "../../../../utils/constants";
import { useLocation, useNavigate } from "react-router-dom";
import { PaymentOptions } from "../../utils/constants";
import {
  clearSearch,
  searchPatients,
} from "../../../../redux/appointmentsSlice";

import AddAdvance from "../advanceDeposit/AddAdvance";
import { isMobile } from "react-device-detect";

import LoopingVideo from "../../../../components/common/LoopingVideo";
import VideoModal from "../../../../common/VideoModal";
import { Popover } from "antd";
import BillTemplate from "./BillTemplate";
import dayjs from "dayjs";
import { ASSETS } from "../../../../assets";
const {
  alerticon: alertIcon,
  closeVisit: imgCloseVisit,
  endVisit: visitEnd,
  opdBillingWave: waveImage,
  addCircle: addCircleIcon,
  tubeIcon: playIcons,
  tutorialIcon: tutorial,
  videorotate_2: videorotateWebm,
  videorotate: videorotateMp4,
} = ASSETS.images;

const CreateBill = ({
  handleCreateBillDrawer,
  isBackModalOpen,
  showHideBackModal,
  isRxPage,
  patientData = {},
  isDashboard,
  isPreviewFromTable,
  editBillData,
  admissionId,
  setEditedBillData,
}) => {
  const isIpdBill = !!admissionId;
  const { state } = useLocation();
  const { pam_id } = state || {};
  const dispatch = useDispatch();
  const decodedToken = getDecodedToken();
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const umIds = urlParams.get("um_id")?.split(",") || [];
  const umNames = urlParams.get("um_name")?.split(",") || [];
  const [isEditBillNotUpdated, setIsEditBillNotUpdated] = useState(() => {
    if (!editBillData) return false;
    const originalTotal = (editBillData.billItems || []).reduce(
      (sum, item) => sum + (Number(item?.amount) || 0),
      0,
    );
    return originalTotal === Number(editBillData?.paidAmount || 0);
  });

  const doctorsList = umIds.map((id, index) => ({
    value: parseInt(id),
    label: umNames[index],
  }));
  const editDoctorFromList = editBillData?.doctorId
    ? doctorsList?.find(
        (d) => String(d?.value) === String(editBillData?.doctorId)
      )
    : null;
  const [selectedDoctor, setSelectedDoctor] = useState(editDoctorFromList);
  const deviceUid = localStorage.getItem("app_device_unique_id");
  const { profile, userId } = useSelector((state) => state.doctors);
  const { patients, error } = useSelector((state) => state.records);
  const { billPrintSettings, advancedSettings, ipdBillPrintSettings } = useSelector(
    (state) => state.billing
  );
  const [billNotesDrawer, setBillNotesDrawer] = useState(false);
  const [previewBillDrawer, setPreviewBillDrawer] = useState(false);
  const [patientBillNotes, setPatientBillNotes] = useState(
    editBillData?.notes || ""
  );
  const [searchItemSelected, setSearchItemSelected] = useState(null);
  const [shouldShowRefIdPopup, setShowRefIdPopup] = useState(-1);
  const [dataSource, setDataSource] = useState(
    editBillData?.billItems || []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [patientSearchOptions, setPatientSearchOptions] = useState([]);
  const [includeInRx, setIncludeInRx] = useState(
    editBillData?.includeInRx || false
  );
  const [shouldAddBillTo3C, setAddBillTo3C] = useState(
    editBillData?.isForm3C || false
  );
  const [editIndex, setEditIndex] = useState(-1);
  const [extraDiscount, setExtraDiscount] = useState(
    editBillData?.extraDiscount || undefined
  );
  const [extraDiscountType, setExtraDiscountType] = useState(
    editBillData?.extraDiscountType || "flat"
  );
  const [patientDueAmount, setPatientDueAmount] = useState();
  const [patientWalletBalance, setPatientWalletBalance] = useState(0);
  const [paymentModes, setPaymentModes] = useState(
    editBillData?.paymentModes || []
  );
  const [disableSaveBtn, setDisableSaveBtn] = useState(true);
  const [isSavingBill, setIsSavingBill] = useState(false);
  const [getToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const [tokenData, setTokenData] = useState(null);
  const [billData, setBillData] = useState(editBillData || {});
  const [addAdvanceDrawer, setAddAdvanceDrawer] = useState(false);
  const [totalAdvanceBalance, setTotalAdvanceBalance] = useState(null);

  // Search patient related states
  const [patientDetails, setPatientDetails] = useState(
    editBillData ? { ...editBillData?.patient, patientId: editBillData?.patientId } : null,
  );
  const [searchQueryName, setSearchQueryName] = useState("");
  const [searchQueryMobile, setSearchQueryMobile] = useState("");
  const [isEditingName, setIsEditingName] = useState(true);
  const [autoCompleteFlagName, setAutoCompleteFlagName] = useState(false);
  const [autoCompleteFlagMobile, setAutoCompleteFlagMobile] = useState(false);
  const [isPaymentModeItemMissing, setPaymentModeItemMissing] = useState(false);
  const nameAutoCompleteRef = useRef(null);
  const { planDetails } = useSelector((state) => state.subscription);

  const [popOverVideo, setPopOverVideo] = useState(false);
  const [videoLink, setVideoLink] = useState(null);
  const { videoList } = useSelector((state) => state.doctors);

  useEffect(() => {
    if (!editBillData) return;
    const originalTotal = (editBillData.billItems || []).reduce(
      (sum, item) => sum + (Number(item?.amount) || 0),
      0,
    );
    const currentTotal = (dataSource || []).reduce(
      (sum, service) => sum + (Number(service?.amount) || 0),
      0,
    );
    if (currentTotal !== originalTotal) {
      setIsEditBillNotUpdated(false);
    }
  }, [dataSource, editBillData]);

  const subTotal = dataSource
    .reduce(
      (sum, service) =>
        sum + (Number(service.amount) * Number(service.quantity) || 0),
      0
    )
    .toFixed(2);

  const lineItemDiscount = dataSource
    .reduce((sum, service) => {
      const baseAmount =
        (Number(service.amount) || 0) * (Number(service.quantity) || 1);
      let discountAmount = 0;

      if (service.discountType === "percentage") {
        // Calculate percentage-based discount
        discountAmount = (baseAmount * (Number(service.discount) || 0)) / 100;
      } else {
        // Calculate rupee-based discount
        discountAmount =
          (Number(service.discount) || 0) * (Number(service.quantity) || 1);
      }

      return sum + discountAmount;
    }, 0)
    .toFixed(2);

  const applicableGst = dataSource
    .reduce((sum, service) => {
      const baseAmount =
        (Number(service.amount) || 0) * (Number(service.quantity) || 1);
      let discountAmount = 0;

      // Calculate discount based on type
      if (service.discountType === "percentage") {
        discountAmount = (baseAmount * (Number(service.discount) || 0)) / 100;
      } else {
        discountAmount =
          (Number(service.discount) || 0) * (Number(service.quantity) || 1);
      }

      // Calculate GST on amount after discount
      const amountAfterDiscount = baseAmount - discountAmount;
      const gstAmount =
        amountAfterDiscount * ((Number(service.gst) || 0) / 100);

      return sum + gstAmount;
    }, 0)
    .toFixed(2);

  const totalBillAmount = dataSource.reduce(
    (sum, service) => sum + (Number(service.totalAmount) || 0),
    0
  );

  const extraDiscountAmount =
    extraDiscountType === "percentage"
      ? (totalBillAmount * (Number(extraDiscount) || 0)) / 100 // Percentage based
      : Number(extraDiscount) || 0; // Flat/Rupee based

  const payableAmount = (
    totalBillAmount -
    extraDiscountAmount
  ).toFixed(2);

  const paidAmount = paymentModes
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
    .toFixed(2);

  const usedPaymentModes = paymentModes.map((p) => p.paymentMode);

  const filteredOptions = PaymentOptions.filter(
    (option) =>
      !usedPaymentModes.includes(option.value) &&
      (option.value !== "Advance Deposit" || totalAdvanceBalance > 0)
  );
  const receptionistId = urlParams.get("receptionistId");
  const receptionistName = urlParams.get("receptionistName");

  useEffect(() => {
    getStorageData();
    if (advancedSettings && Object.keys(advancedSettings).length === 0) {
      getAdvanceSettings();
    }
    if (billPrintSettings && Object.keys(billPrintSettings).length === 0) {
      getBillPrintSettings();
    }
    if (ipdBillPrintSettings && Object.keys(ipdBillPrintSettings).length === 0) {
      getIpdBillPrintSettings();
    }
  }, []);

  useEffect(() => {
    const patientUniqueId =
      patientData?.patient_unique_id ||
      patientDetails?.patientUniqueId ||
      editBillData?.patient?.patientId;
    if (patientUniqueId) {
      getPatientDueAmount(patientUniqueId);
      getPatientWalletBalance(patientUniqueId);
      patientAdvanceData(patientUniqueId);
    }
  }, [patientDetails]);

  useEffect(() => {
    const updatedPayableAmount = (
      dataSource.reduce(
        (sum, service) => sum + (Number(service.totalAmount) || 0),
        0
      ) -
      (Number(extraDiscountAmount) || 0)
    ).toFixed(2);

    if (
      updatedPayableAmount &&
      Array.isArray(paymentModes) &&
      paymentModes.length
    ) {
      const updatedPaymentModes = paymentModes.map((mode, index) =>
        index === 0 ? { ...mode, amount: updatedPayableAmount } : mode
      );
      setPaymentModes(updatedPaymentModes);
    }
  }, [extraDiscount, dataSource]);

  useEffect(() => {
    if (isEditingName && nameAutoCompleteRef.current) {
      nameAutoCompleteRef.current.focus();
    }
  }, [isEditingName]);

  const getBillPrintSettings = async () => {
    const printSettingsResponse = await fetchPrintSetting(
      isReceptionist ? urlParams.get("um_id") : userId
    );
    if (printSettingsResponse) {
      dispatch(setBillPrintSettings(printSettingsResponse));
    }
  };

  const getIpdBillPrintSettings = async () => {
    const printSettingsResponse = await fetchPrintSetting(userId, "ipdBill");
    if (printSettingsResponse) {
      dispatch(setIpdBillPrintSettings(printSettingsResponse));
    }
  };

  const getStorageData = () => {
    const token = getToken();
    if (token !== undefined) {
      try {
        const decoded = jwtDecode(token);
        setTokenData(decoded.result);
      } catch (e) {
        console.log(e);
      }
    }
  };

  const validatePaymentData = (data) => {
    return data.some(
      (item) => item.paymentMode && item.amount && Number(item.amount) > 0
    );
  };

  useEffect(() => {
    const validatePayment = validatePaymentData(paymentModes);
    if (validatePayment) {
      setDisableSaveBtn(false);
    } else {
      setDisableSaveBtn(true);
    }
    if (Number(paidAmount) > Number(payableAmount)) {
      setDisableSaveBtn(true);
    } else {
      setDisableSaveBtn(false);
    }
    if (
      dataSource?.find(
        (item, index) =>
          item?.masterId === "" && index !== dataSource.length - 1
      )
    ) {
      setDisableSaveBtn(true);
    }
  }, [dataSource, paymentModes, patientDetails]);

  useEffect(() => {
    setDataSource((prevData) => {
      return prevData.map((item) => ({
        ...item,
        totalAmount: calculateTotalAmount(item),
      }));
    });
  }, [JSON.stringify(dataSource)]);

  const getPatientDueAmount = async (patientUniqueId) => {
    const patientDueRes = await fetchPatientDueAmount(patientUniqueId);
    setPatientDueAmount(patientDueRes?.previousDueAmount);
  };

  const getPatientWalletBalance = async (patientUniqueId) => {
    const patientWalletBalanceRes = await fetchPatientWalletBalance(
      patientUniqueId
    );
    // if (patientWalletBalanceRes?.advanceDepositBalance) {
      setPatientWalletBalance(patientWalletBalanceRes?.advanceDepositBalance);
    // }
  };

  useEffect(() => {
    if (advancedSettings && Object.keys(advancedSettings)?.length) {
      setIncludeInRx( editBillData?.includeInRx || advancedSettings.defaultRxFlag);
      setAddBillTo3C( editBillData?.isForm3C ? editBillData?.isForm3C : isIpdBill ? advancedSettings?.ipdSetting?.defaultForm3cFlag : advancedSettings?.defaultForm3cFlag);
      setPaymentModes([
        {
          paymentMode: isIpdBill ? advancedSettings?.ipdSetting?.defaultPaymentMode : advancedSettings?.defaultPaymentMode,
          amount: undefined,
          refId: "",
        },
      ]);
    }
  }, [advancedSettings, editBillData]);

  useEffect(() => {
    if (editBillData?.paymentModes) {
      setTimeout(() => {
        setPaymentModes(editBillData?.paymentModes);
      }, 300);
    }
  }, [editBillData]);

  useEffect(() => {
    setPatientWalletBalance(totalAdvanceBalance);
    if(!editBillData && totalAdvanceBalance ){
        setPaymentModes((prevPaymentModes) => {
          const newPaymentMode = totalAdvanceBalance ? "Advance Deposit" : isIpdBill ? advancedSettings?.ipdSetting?.defaultPaymentMode: advancedSettings?.defaultPaymentMode;
          if (prevPaymentModes && prevPaymentModes.length > 0) {
            return prevPaymentModes.map((mode, index) => 
              index === 0 
                ? { ...mode, paymentMode: newPaymentMode }
                : mode
            );
          }
          return [
            {
              paymentMode: newPaymentMode,
              amount: undefined,
              refId: "",
            },
          ];
        });
    }
  }, [totalAdvanceBalance]);

  useEffect(() => {
    const timeOutId = setTimeout(() => {
      getSearchOptions();
    }, 500);
    return () => {
      clearTimeout(timeOutId);
    };
  }, [searchQuery]);

  const getAdvanceSettings = async () => {
    const advanceSettingsResponse = await fetchAdvanceSetting();
    if (advanceSettingsResponse) {
      dispatch(setAdvancedSettings(advanceSettingsResponse));
    }
  };

  const getSearchOptions = async () => {
    const searchOptionsRes = await searchBillItem(searchQuery);
    const data = [];
    searchOptionsRes?.length > 0 &&
      searchOptionsRes?.map((e) => {
        return data.push({
          key: JSON.stringify({ ...e }),
          value: e.id,
          label: <div>{e.name}</div>,
        });
      });
    {/*  !isReceptionist && (Remove this restriction - TP-1639) */ }
    searchQuery &&
      data.push({
        key: JSON.stringify({
          change: 1,
          name: searchQuery,
        }),
        value: searchQuery,
        label: (
          <>
            <div>
              {searchQuery}
              <i className="icon-Add mx-1 text-primary fs-6" />{" "}
              <a className="fw-medium text-decoration-underline text-primary">
                {" "}
                Add Custom
              </a>
            </div>
          </>
        ),
        isCustom: true,
      });
    setSearchOptions(data);
  };

  const handleInputChange = (value, index, column) => {
    setDataSource((prevData) =>
      prevData.map((row, i) =>
        i === index
          ? {
              ...row,
              [column]: value,
              ...(column === "discountType" && { discount: undefined }),
            }
          : row
      )
    );
  };

  // Helper function to parse itemDate in multiple formats
  const parseItemDate = (dateValue) => {
    if (!dateValue) return null;
    if (dayjs.isDayjs(dateValue)) return dateValue;
    if (typeof dateValue !== 'string') return null;
    
    // Try parsing different date formats
    const formats = ["DD-MM-YYYY", "YYYY-MM-DD", "DD MMM YYYY"];
    for (const format of formats) {
      const parsed = dayjs(dateValue, format, true);
      if (parsed.isValid()) {
        return parsed;
      }
    }
    // Fallback to default parsing
    const fallback = dayjs(dateValue);
    return fallback.isValid() ? fallback : null;
  };

  const handleAddRow = (updatedData) => {
    const newRow = {
      masterId: "",
      name: "",
      quantity: "",
      amount: "",
      discount: "",
      discountType: "",
      gst: "",
      totalAmount: "",
      createdBy: "",
      itemDate: dayjs().format("YYYY-MM-DD"),
    };
    setDataSource([...updatedData, newRow]);
    setSearchQuery("");
  };

  const handleDeleteRow = (index) => {
    const updatedData = dataSource.filter((_, i) => i !== index);
    setDataSource(updatedData);
  };

  const onSelect = (value, option, index) => {
    const selectedData = option?.key && JSON.parse(option.key);
    if (option?.isCustom) {
      const clinic = getClinic();
      trackEvent("TP_Billing_AddNewService", {
        patientName: patientDetails?.patientName || "",
        patientId: patientDetails?.patientUniqueId || "",
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        city: clinic?.hm_city,
        pincode: clinic?.hm_pincode,
        subscriptionStatus: planDetails?.currentPlanStatus,
        source: "billing_page",
        receptionistId: receptionistId,
        receptionistName: receptionistName,
      });
      setSearchItemSelected({
        ...selectedData,
        isCustom: option.isCustom,
        index: index,
      });
    } else if (option) {
      const packageItems = selectedData?.items || selectedData?.packageItems || [];
      
      if (packageItems.length > 0) {
        const newItems = packageItems.map((item) => ({
          masterId: item.id || "",
          quantity: item.quantity || 1,
          name: item.name || "",
          amount: item.price || item.amount || 0,
          discount: item.discount || "",
          discountType: item.discountType || "",
          type: item.type || "",
          gst: item.gst || "",
          totalAmount: item.totalAmount || "",
          createdBy: item.createdBy || "",
          itemDate: isIpdBill ? dayjs().format("YYYY-MM-DD") : undefined,
        }));
        
        const currentRow = dataSource[index];
        const isEmptyRow = !currentRow?.masterId && !currentRow?.name;
        
        let updatedData;
        if (isEmptyRow && index === dataSource.length - 1) {
          updatedData = [
            ...dataSource.slice(0, index),
            ...newItems,
            {
              masterId: "",
              name: "",
              quantity: "",
              amount: "",
              discount: "",
              discountType: "",
              gst: "",
              totalAmount: "",
              createdBy: "",
              itemDate: dayjs().format("YYYY-MM-DD"),
            },
          ];
        } else {
          updatedData = [
            ...dataSource.slice(0, index + 1),
            ...newItems,
            ...dataSource.slice(index + 1),
          ];
        }
        
        setDataSource(updatedData);
        setSearchQuery("");
      } else {
        const updatedData = dataSource.map((row, idx) =>
          index === idx
            ? {
                ...row,
                masterId: selectedData.id,
                quantity: 1,
                name: selectedData.name,
                amount: selectedData.price,
                discount: selectedData.discount,
                discountType: selectedData.discountType,
                type: selectedData.type,
                gst: selectedData.gst,
                totalAmount: selectedData.totalAmount,
                createdBy: selectedData.createdBy,
              }
            : row
        );
        setDataSource(updatedData);
        setSearchQuery(selectedData.name);
        if (index === dataSource.length - 1) {
          handleAddRow(updatedData);
        }
      }
    } else {
      console.log("directly add the entry to the table");
    }
  };

  const onSearch = useCallback(
    (query) => {
      setSearchQuery(removeBeforeWhiteSpace(query));
    },
    [searchQuery]
  );

  const columns = [
    {
      title: "ITEMS/SERVICES",
      dataIndex: "name",
      width: isIpdBill ? "23%" : "26%",
      render: (_, record, index) => (
        <>
          <AutoComplete
            value={record.name}
            onSearch={onSearch}
            options={searchOptions}
            onSelect={(value, option) => onSelect(value, option, index)}
            className="autocomplete-custom w-100"
            defaultActiveFirstOption={true}
          >
            <Input
              placeholder="Search & add new item"
              style={{ border: "none" }}
              onChange={(e) => handleInputChange(e.target.value, index, "name")}
              value={record.name}
            />
          </AutoComplete>
          {dataSource[index]?.quantity > 0 &&
            (userId === dataSource[index]?.createdBy ||
              tokenData?.admin === 1) && (
              <i
                className="icon-Edit fs-6 d-flex justify-content-end"
                style={{
                  cursor: "pointer",
                  position: "absolute",
                  right: "10px",
                  bottom: "10px",
                }}
                onClick={() => {
                  setEditIndex(index);
                  setSearchItemSelected(dataSource[index]);
                }}
              />
            )}
        </>
      ),
    },
    isIpdBill && {
      title: "DATE",
      dataIndex: "itemDate",
      width: "16%",
      render: (_, record, index) => (
        <div>
          <DatePicker
            placeholder="Select Date"
            onChange={(date) => {
              handleInputChange(
                date ? date.format("DD-MM-YYYY") : "",
                index,
                "itemDate"
              );
            }}
            format={{
              format: "DD-MM-YYYY",
              type: "mask",
            }}
            value={parseItemDate(record.itemDate)}
            style={{
              border: "none",
            }}
            disabledDate={(current) => current && current > dayjs()}
            allowClear={false}
            {...(isMobile && { suffixIcon: null })}
          />
        </div>
      ),
    },
    {
      title: "QTY",
      dataIndex: "quantity",
      width: isIpdBill ? "6%" : "9%",
      render: (_, record, index) => (
        <Input
          value={record.quantity}
          onChange={(e) => {
            const quantity = e.target.value.replace(/[^0-9]/g, "");
            // Allow empty string during typing, only default to 1 when field is empty on blur
            handleInputChange(
              quantity === "" ? "" : Number(quantity) || "",
              index,
              "quantity"
            );
          }}
          onBlur={(e) => {
            // Set to 1 if empty when user leaves the field
            const quantity = e.target.value.replace(/[^0-9]/g, "");
            if (quantity === "" || Number(quantity) === 0) {
              handleInputChange(1, index, "quantity");
            }
          }}
          bordered={false}
          type="number"
        />
      ),
    },
    {
      title: "PRICE PER UNIT",
      dataIndex: "amount",
      width: isIpdBill ? "13%" : "14%",
      render: (_, record, index) => (
        <Input
          value={record.amount}
          inputMode="decimal"
          onChange={(e) => {
            const price = onlyDecimalFormat(e.target.value);
            if (price <= 1000000000) {
              handleInputChange(price, index, "amount");
            }
          }}
          prefix="₹"
          bordered={false}
          style={{ textAlign: "center" }}
        />
      ),
    },
    {
      title: "DISCOUNT",
      dataIndex: "discount",
      width: isIpdBill ? "18%" : "22%",
      render: (_, record, index) => (
        <>
          <Input
            value={record.discount}
            inputMode="decimal"
            onChange={(e) => {
              const discount = onlyDecimalFormat(e.target.value);
              handleInputChange(
                (record.discountType === "percentage" && discount <= 100) ||
                  (record.discountType === "flat" &&
                    discount <= Number(record.amount))
                  ? discount
                    ? discount
                    : undefined
                  : record.discount,
                index,
                "discount"
              );
            }}
            bordered={false}
          />
          <div
            style={{
              position: "absolute",
              right: "18px",
              bottom: "12px",
              zIndex: 10,
              marginTop: 10,
            }}
          >
            <Radio.Group
              value={record.discountType}
              style={{ display: "flex", width: "60px" }}
              onChange={(e) =>
                handleInputChange(e.target.value, index, "discountType")
              }
            >
              <Radio.Button
                value={"percentage"}
                style={{
                  width: "50%",
                  height: "23px",
                }}
                className="custom-radio-button d-flex align-items-center justify-content-center"
              >
                %
              </Radio.Button>
              <Radio.Button
                value={"flat"}
                style={{
                  width: "50%",
                  height: "23px",
                }}
                className="custom-radio-button  d-flex align-items-center justify-content-center"
              >
                ₹
              </Radio.Button>
            </Radio.Group>
          </div>
        </>
      ),
    },
    {
      title: "GST (%)",
      dataIndex: "gst",
      width: isIpdBill ? "10%" : "11%",
      render: (_, record, index) => (
        <Input
          value={record.gst}
          inputMode="decimal"
          onChange={(e) => {
            const value = onlyDecimalFormat(e.target.value);
            handleInputChange(
              value <= 100 ? (value === "" ? undefined : value) : record.gst,
              index,
              "gst"
            );
          }}
          suffix="%"
          bordered={false}
          style={{ textAlign: "center" }}
        />
      ),
    },
    {
      title: "TOTAL AMOUNT",
      dataIndex: "totalAmount",
      width: "13%",
      render: (_, record, index) => (
        <Input
          value={record.totalAmount}
          onChange={(e) =>
            handleInputChange(
              e.target.value.replace(/[^0-9]/g, ""),
              index,
              "totalAmount"
            )
          }
          prefix="₹"
          bordered={false}
          style={{ textAlign: "center" }}
          disabled={true}
        />
      ),
      onCell: () => ({
        style: {
          backgroundColor: "#FAFAFB",
        },
      }),
    },
    {
      title: "ACTION",
      dataIndex: "action",
      width: isIpdBill ? "2%" : "5%",
      render: (_, record, index) => (
        <Button
          className={`btn btn-delete-prescription p-0 ${
            index === dataSource?.length - 1 && "pe-none opacity-25"
          }`}
          onClick={() => handleDeleteRow(index)}
        >
          <i className="icon-delete" style={{ color: "#454551" }} />
        </Button>
      ),
    },
  ]?.filter((item) => !!item);

  const handleModeChange = (value, index, type) => {
    const updatedModes = [...paymentModes];
    updatedModes[index][type] = value;
    setPaymentModes(updatedModes);
    setIsEditBillNotUpdated(false);
  };

  const handleAmountChange = (value, index) => {
    if (value <= 1000000000) {
      const updatedModes = [...paymentModes];
      updatedModes[index].amount = onlyDecimalFormat(value);
      setPaymentModes(updatedModes);
      setIsEditBillNotUpdated(false);
    }
  };

  const addPaymentMode = () => {
    const clinic = getClinic();
    trackEvent("TP_Billing_AddPaymentMode", {
      patientName: patientDetails?.patientName || "",
      patientId: patientDetails?.patientUniqueId || "",
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      city: clinic?.hm_city,
      pincode: clinic?.hm_pincode,
      subscriptionStatus: planDetails?.currentPlanStatus,
      receptionistId: receptionistId,
      receptionistName: receptionistName,
    });
    setPaymentModes([
      ...paymentModes,
      { paymentMode: filteredOptions[0]?.value, amount: 0 },
    ]);
    setIsEditBillNotUpdated(false);
  };

  const removePaymentMode = (index) => {
    const updatedModes = paymentModes.filter((_, i) => i !== index);
    setPaymentModes(updatedModes);
    setIsEditBillNotUpdated(false);
  };

  const handleDrawerDiagnosisNotes = () => {
    const clinic = getClinic();
    trackEvent("TP_Billing_AddNotes", {
      patientName: patientDetails?.patientName || "",
      patientId: patientDetails?.patientUniqueId || "",
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      city: clinic?.hm_city,
      pincode: clinic?.hm_pincode,
      subscriptionStatus: planDetails?.currentPlanStatus,
      receptionistId: receptionistId,
      receptionistName: receptionistName,
    });
    setBillNotesDrawer(!billNotesDrawer);
  };

  const handleDrawerPreviewBill = () => {
    setPreviewBillDrawer(!previewBillDrawer);
  };

  const handleCreateBill = async (type) => {
    setIsSavingBill(true);
    try {
      const clinic = getClinic();
      if (!type) {
        trackEvent("TP_Billing_SaveAndPrint", {
          patientName: patientDetails?.patientName || "",
          patientId: patientDetails?.patientUniqueId || "",
          doctorSpeciality: profile?.dp_name,
          doctorId: profile?.doctor_unique_id,
          doctorContact: profile?.um_contact,
          city: clinic?.hm_city,
          pincode: clinic?.hm_pincode,
          subscriptionStatus: planDetails?.currentPlanStatus,
          receptionistId: receptionistId,
          receptionistName: receptionistName,
        });
      } else if (type === "preview") {
        trackEvent("TP_Billing_SaveandPreview", {
          patientName: patientDetails?.patientName || "",
          patientId: patientDetails?.patientUniqueId || "",
          doctorSpeciality: profile?.dp_name,
          doctorId: profile?.doctor_unique_id,
          doctorContact: profile?.um_contact,
          city: clinic?.hm_city,
          pincode: clinic?.hm_pincode,
          subscriptionStatus: planDetails?.currentPlanStatus,
          receptionistId: receptionistId,
          receptionistName: receptionistName,
        });
      }
      const updatedDataSource = dataSource.filter((item) => {
        const { masterId, name, quantity } = item;
        return masterId && name && quantity;
      });
      // const updatedPaymentModes = paymentModes?.filter(
      //   (item) => item.paymentMode && item.amount > 0
      // );
      // if (updatedPaymentModes?.length !== paymentModes?.length) {
      //   setPaymentModeItemMissing(true);
      //   return;
      // }
      const patientUniqueId =
        patientData?.patient_unique_id ||
        patientDetails?.patientUniqueId ||
        editBillData?.patientId;
      const payload = {
        patientId: patientUniqueId,
        doctorId: isReceptionist
          ? doctorsList?.length === 1
            ? doctorsList[0].value
            : selectedDoctor?.value
          : userId,
        billItems: updatedDataSource,
        paymentModes: paymentModes,
        subTotal: subTotal,
        lineItemDiscount: lineItemDiscount,
        extraDiscount: extraDiscount || 0,
        extraDiscountType: extraDiscountType,
        applicableGst: applicableGst,
        payableAmount: payableAmount,
        paidAmount: paidAmount,
        includeInRx: includeInRx,
        isForm3C: shouldAddBillTo3C,
        date: editBillData?.createdAt ? moment(editBillData?.createdAt).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
        notes: patientBillNotes,
        // dueFromPreviousBill: patientDueAmount,
        appointmentId: pam_id || patientData?.pam_id,
        admissionId: admissionId,
        id: editBillData?.id,
      };
      const createRes = await createBill(payload, isIpdBill ? "ipd" : "", editBillData?.id);
      if (createRes?.id) {
      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={visitEnd} className="me-3" alt="visit-end" />
            <div>
              <div className="title-common text-start fontroboto">
                {`${
                  patientData?.pm_fullname ||
                  patientDetails?.patientName ||
                  editBillData?.patient?.name
                }'s ${
                  editBillData?.id ? "bill updated" : "new bill saved"
                } successfully`}
              </div>
            </div>
            <img
              src={imgCloseVisit}
              alt="close"
              className="ms-3"
              onClick={() => message.destroy()}
            />
          </div>
        ),
        duration: 3,
      });
      let walletBalance;
      const isPaymentByWallet = paymentModes?.some(
        (item) => item?.paymentMode === "Advance Deposit"
      );

      if (isPaymentByWallet) {
        walletBalance = await fetchPatientWalletBalance(patientUniqueId);
        walletBalance = walletBalance?.advanceDepositBalance;
        setPatientWalletBalance(walletBalance);
      }
      setBillData(createRes);
      if (setEditedBillData) {
        setEditedBillData(createRes);
      }
      if (type === "exit") {
        handleCreateBillDrawer(createRes, true);
      } else if (type === "preview") {
        // Use createRes directly to ensure latest data is passed
        setBillData(createRes);
        handleDrawerPreviewBill();
      } else {
        const dataToUse =
          patientData && Object.keys(patientData).length > 0
            ? patientData
            : {
                pm_pid: createRes?.patient?.id,
                pm_fullname: createRes?.patient?.name,
                pm_gender: createRes?.patient?.gender,
                pm_contact_no: createRes?.patient?.phone,
                tpml_refrence_id: createRes?.patient?.refId,
                ageDays: createRes?.patient?.ageDays,
                ageMonths: createRes?.patient?.ageMonths,
                ageYears: createRes?.patient?.ageYears,
                pm_salutation: createRes?.patient?.salutation,
                address: createRes?.patient?.address,
              };
        const patientDataWithAbha = await enrichPatientDataWithAbha(
          dataToUse,
          createRes?.patientId,
        );
        const blob = await pdf(
          <ViewBillPdf
            printSettings={isIpdBill ? ipdBillPrintSettings : billPrintSettings}
            patientData={patientDataWithAbha}
            totalAdvanceBalance={walletBalance || patientWalletBalance}
            profile={profile}
            billData={createRes}
            gstIn={advancedSettings?.GSTIN}
            showCreatedBy={isIpdBill ? advancedSettings?.ipdSetting?.enableCreatedByInRx : advancedSettings?.enableCreatedByInRx}
          />
        ).toBlob();
          printContent(blob, createRes.patientId, setStartLoader);
          handleCreateBillDrawer();
        }
      }
    } catch (error) {
      console.error("Error creating bill:", error);
    } finally {
      setIsSavingBill(false);
    }
  };

  const setStartLoader = () => {
    dispatch(setLoadingStatus(true));
  };

  useEffect(() => {
    const checkInFireBase = async () => {
      if (deviceUid) {
        const docCapturedImage = doc(db, "billing", deviceUid);
        try {
          const docCapturedImageSnap = await getDoc(docCapturedImage);
          if (docCapturedImageSnap.exists()) {
            onSnapshot(
              doc(db, "billing", deviceUid),
              async (docSnapshotOfCapturedImage) => {
                const res = docSnapshotOfCapturedImage?.data();
                if (res?.clicked === "no") {
                  dispatch(setLoadingStatus(false));
                  deleteDoc(doc(db, "billing", deviceUid));
                  deleteDocsUploadedFromAndroid(patientData?.patient_unique_id);
                }
              }
            );
          }
        } catch (error) {
          console.error("Error updating document:", error);
        }
      } else {
        console.error("Device UID not found");
      }
    };

    return () => checkInFireBase();
  }, [db, deviceUid]);

  // Patient search related logic
  const onSearchName = useCallback(
    (query) => {
      setSearchQueryName(query);
    },
    [setSearchQueryName]
  );

  const onSearchMobile = useCallback(
    (query) => {
      // const clinic_name = getClinicName(profile?.hospital_data);
      // window.Moengage.track_event("TP_Patient_searched", {
      //   clinic_name,
      // });
      setSearchQueryMobile(query);
    },
    [setSearchQueryMobile]
  );

  useEffect(() => {
      handleAddRow(dataSource);
  }, []);

  useEffect(() => {
    const data = [];
    if (patients) {
      if (patients.length === 0 && searchQuery.length > 0) {
        data.push({
          key: -2,
          label: <div>{error}</div>,
        });
      } else {
        patients.map((patient) => {
          return data.push({
            key: JSON.stringify(patient),
            value: patient.pm_pid,
            label: PatientPlank(patient),
          });
        });
      }
    }
    // if (!isMobile) {
    //   data.push({
    //     key: -1,
    //     value: "Add New Patient",
    //     label: AddPatientPlank(),
    //   });
    // }
    setPatientSearchOptions(data);
  }, [patients]);

  useEffect(() => {
    if (searchQueryName || searchQueryMobile) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchPatients({
            searchQuery: searchQueryName || searchQueryMobile,
            company: "",
          })
        );
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      dispatch(clearSearch());
    }
  }, [searchQueryName, searchQueryMobile]);

  const onSelectPatient = (patient) => {
    setPatientDetails({
      patientName: patient.pm_fullname,
      mobileNumber: patient.pm_contact_no,
      patientUniqueId: patient.patient_unique_id,
      pmPid: patient.pm_pid,
    });
    setSearchOptions([]);
    setSearchQueryMobile("");
    setSearchQueryName("");
    setIsEditingName(false);
  };

  const BoldWordInName = ({ name, boldWord }) => {
    // Split the name into parts based on the bold word
    const parts = name.split(new RegExp(`(${boldWord})`, "i"));

    // Map through the parts and apply different styles to the bold word
    const formattedName = parts.map((part, index) => {
      if (part.toLowerCase() === boldWord.toLowerCase()) {
        // If the part matches the bold word, render it in bold
        return (
          <span key={index} className="fw-medium">
            {part}
          </span>
        );
      } else {
        // Otherwise, render it normally
        return <span key={index}>{part}</span>;
      }
    });

    return formattedName;
  };

  // Add Advance Drawer
  const handleAddAdvanceDrawer = () => {
    setAddAdvanceDrawer(!addAdvanceDrawer);
  };

  // Function to update state from child
  const handleTotalAdvanceUpdate = (newData) => {
    setTotalAdvanceBalance(newData);
  };

  const PatientPlank = (patient) => {
    return (
      <>
        <div className="d-flex align-items-center justify-content-between">
          <div
            className="d-flex align-items-center"
            onClick={() => {
              setAutoCompleteFlagName(false);
              onSelectPatient(patient);
            }}
          >
            <div className="list-patientName d-flex align-items-center me-4">
              <i className="icon-patients backbar me-2"></i>{" "}
              <span>
                {patient.pm_salutation && patient.pm_salutation}{" "}
                <BoldWordInName
                  name={patient.pm_fullname}
                  boldWord={searchQuery}
                />{" "}
                ({patient.pm_gender}, {patient.ageYears}y)
              </span>
            </div>
            <div className="list-patientName d-flex align-items-center me-4">
              <i className="icon-phone backbar me-2"></i>
              <BoldWordInName
                name={patient.pm_contact_no}
                boldWord={searchQuery}
              />
            </div>
            <div className="list-patientName d-flex align-items-center me-4">
              <i className="icon-Id backbar me-2"></i>
              <BoldWordInName name={patient.pm_pid} boldWord={searchQuery} />
            </div>
          </div>
        </div>
      </>
    );
  };

  const patientAdvanceData = async (patientUniqueId) => {
    // setLoading(true);
    const params = {
      status: "Deposit",
      sortBy: "date",
      sortOrder: "desc",
      page: 1,
      limit: 25,
      // startDate: dateRange.startDate,
      // endDate: dateRange.endDate,
      doctorIds: decodedToken?.result?.user_id,
      search: "",
      patientId: patientUniqueId,
      appointmentId: patientData?.pam_id,
    };
    try {
      const response = await listAdvancedDepositByPatient(params);
      handleTotalAdvanceUpdate(response?.summary?.totalAdvanceBalance);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      // setLoading(false);
    }
  };

  //PopOverVideo function
  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo(!popOverVideo);
  }, [popOverVideo]);

  //Video Componet
  const VIDEO_CONTENT = useCallback(() => {
    return (
      <>
        <div
          className="video-contant rounded-4 p-20 zindex-99999"
          key="oneclickrx-video"
        >
          <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
            <div className="title-common lh-base">Video Tutorial</div>
            <Button
              className="btn btn-videoClose p-0"
              onClick={showHideVideoListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          {videoList[15]?.video?.slice(2, 3).map((item1, i1) => {
            return (
              <div
                key={i1}
                className={`d-flex ${
                  i1 !== videoList[15]?.video.length - 1 &&
                  "pb-3 mb-15 border-bottom"
                }`}
              >
                <div className="tutorial-play me-14">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoLink(item1);
                      const clinic_name = getClinicName(profile?.hospital_data);
                      window.Moengage.track_event("TP_Tutorial_Viewed", {
                        clinic_name,
                        tutorial_type: videoList[15]?.category,
                      });
                    }}
                  >
                    <img src={playIcons} />
                  </button>
                  <span className="tutorial-thumb">
                    <img src={item1.thumbnail} />
                  </span>
                </div>
                <div>
                  <h3 className="title-common text-welcome">
                    {item1?.tmv_title}
                  </h3>
                  <div className="fs-12 fontroboto fw-normal text-main">
                    {item1?.tmv_description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }, [popOverVideo]);

  return (
    <div>
      <Navbar className="headerprescription p-0">
        <Container fluid className="h-100 gx-0 w-100">
          <Row className="h-100 align-items-center w-100 justify-content-between">
            <Col sm="auto" md="auto" lg="auto" className="h-100 w-auto">
              <div
                className={`align-items-center d-flex h-100 ${
                  isMobile ? "gap-1" : "gap-2"
                }`}
              >
                <div className="border-end h-100 text-center">
                  <div
                    onClick={(e) => handleCreateBillDrawer(e, true)}
                    className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
                  >
                    <i className="icon-right" />
                  </div>
                  <CommonModal
                    isModalOpen={isBackModalOpen}
                    onCancel={showHideBackModal}
                    modalWidth={500}
                    title={"You may lose your data"}
                    modalBody={
                      <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                          <div className="d-flex align-items-center">
                            <img
                              className="me-3"
                              src={alertIcon}
                              alt="Warning"
                            />
                            <span>
                              Are you sure you want to leave? <br />
                              You will permanently lose your data.
                            </span>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="d-flex align-items-center mt-2 justify-content-end">
                            <div
                              onClick={handleCreateBillDrawer}
                              className="me-4 text-decoration-underline btn p-0 text-main"
                            >
                              Yes Leave
                            </div>
                            <Button
                              onClick={showHideBackModal}
                              className="lh-lg btn btn-primary3 btn-41 px-4"
                            >
                              <span>No, Stay</span>
                            </Button>
                          </div>
                        </div>
                      </>
                    }
                  />
                </div>
                <span className="title-digitise-card">{editBillData ? "Edit" : "Create"} Bill</span>
                {((patientData && Object.keys(patientData).length !== 0) ||
                  (patientDetails &&
                    Object.keys(patientDetails)?.length !== 0)) && (
                  <>
                    <div className="billing-dashboard-wraper">
                      <button
                        className={`advance-deposite-container ${
                          isMobile ? "mx-1" : "mx-2"
                        }`}
                        style={{ width: "100%" }}
                        onClick={handleAddAdvanceDrawer}
                      >
                        <span className="text-lg">
                          {isMobile ? "Advance" : "Advance Balance"}: ₹
                          {totalAdvanceBalance ?? "0"}
                        </span>
                        <span className="add-advance-icon">
                          <img
                            src={addCircleIcon}
                            alt="add-deposit"
                            style={{
                              marginLeft: totalAdvanceBalance ? "" : "-6px",
                            }}
                          />
                        </span>
                      </button>
                    </div>
                    {Number(patientDueAmount) > 0 && (
                      <div className="billing-dashboard-wraper">
                        <div
                          className={`total-due-container ${
                            isMobile ? "mx-1" : "mx-2"
                          }`}
                        >
                          <span className="text-lg">
                            {isMobile ? "Due" : "Payment Due"}: ₹
                            {patientDueAmount}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Col>
            <Col sm="auto" md="auto" lg="auto" className="h-100  w-auto p-0">
              <div
                className={`align-items-center d-flex h-100 ${
                  isMobile ? "gap-3" : "gap-4"
                }`}
              >
                <div>
                  <Tooltip
                    title={
                      editBillData?.isForm3C
                        ? "This bill is already added to Form 3C, so this option cannot be changed."
                        : ""
                    }
                  >
                    <span>
                      <Checkbox
                        className="me-2"
                        style={editBillData?.isForm3C ? {  opacity: 0.5, cursor: "not-allowed" } : {}}
                        checked={shouldAddBillTo3C}
                        onChange={(e) => {
                          if (!editBillData?.isForm3C) {
                            const clinic = getClinic();
                            trackEvent("TP_Billing_AddBilltoForm3C", {
                              patientName: patientDetails?.patientName || "",
                              patientId: patientDetails?.patientUniqueId || "",
                              doctorSpeciality: profile?.dp_name,
                              doctorId: profile?.doctor_unique_id,
                              doctorContact: profile?.um_contact,
                              city: clinic?.hm_city,
                              pincode: clinic?.hm_pincode,
                              subscriptionStatus: planDetails?.currentPlanStatus,
                              receptionistId: receptionistId,
                              receptionistName: receptionistName,
                            });
                            setAddBillTo3C(e.target.checked);
                          }
                        }}
                      />
                    </span>
                  </Tooltip>
                  Add bill for Form 3C
                </div>
                {!isDashboard &&
                  (editBillData?.appointmentId ||
                    pam_id ||
                    patientData?.pam_id) && (
                    <div>
                      <Checkbox
                        className="me-2"
                        checked={includeInRx}
                        onChange={(e) => {
                          const clinic = getClinic();
                          trackEvent("TP_Billing_IncludeinRx", {
                            patientName: patientDetails?.patientName || "",
                            patientId: patientDetails?.patientUniqueId || "",
                            doctorSpeciality: profile?.dp_name,
                            doctorId: profile?.doctor_unique_id,
                            doctorContact: profile?.um_contact,
                            city: clinic?.hm_city,
                            pincode: clinic?.hm_pincode,
                            subscriptionStatus: planDetails?.currentPlanStatus,
                            receptionistId: receptionistId,
                            receptionistName: receptionistName,
                          });
                          setIncludeInRx(e.target.checked);
                        }}
                      />
                      Include in RX
                    </div>
                  )}

                {!isReceptionist && (
                  <div className="d-sm-flex d-block">
                    <Popover
                      open={popOverVideo}
                      onOpenChange={showHideVideoListPopover}
                      content={VIDEO_CONTENT}
                      trigger="click"
                      overlayClassName="pop-430 pp-0 videoTutorial"
                      placement="bottom"
                    >
                      <button className="btn d-flex align-items-center btn-text tutorial p-0 opd-billing">
                        <div className="cursor-pointer video-animat">
                          <img src={tutorial} />
                          <LoopingVideo
                            webm={videorotateWebm}
                            mp4={videorotateMp4}
                            ariaLabel="Video"
                          />
                        </div>
                      </button>
                    </Popover>
                    {videoLink && (
                      <VideoModal
                        videoLink={videoLink}
                        onCancel={() => setVideoLink(null)}
                      />
                    )}
                  </div>
                )}

                {isIpdBill || editBillData ? (
                  <Button
                    type="button"
                    className={`btn btn-primary3 btn-41 me-20 ${
                      isMobile ? "" : "px-4"
                    }`}
                    onClick={() => {
                      handleCreateBill("exit");
                    }}
                    loading={isSavingBill}
                    disabled={
                      isSavingBill ||
                      disableSaveBtn ||
                      (!patientData?.patient_unique_id &&
                        !patientDetails?.patientUniqueId &&
                        !editBillData?.patientId)
                      //    || Number(payableAmount) === 0
                    }
                  >
                    Save
                  </Button>
                ) : isRxPage ? (
                  <>
                    <Button
                      type="button"
                      className={`btn-41 btn ant-btn-text btn-input align-items-center d-flex ${
                        isMobile ? "" : "px-4"
                      }`}
                      onClick={() => {
                        handleCreateBill("exit");
                      }}
                      loading={isSavingBill}
                      disabled={
                        isSavingBill ||
                        disableSaveBtn ||
                        (!patientData?.patient_unique_id &&
                          !patientDetails?.patientUniqueId &&
                          !editBillData?.patientId)
                        //    || Number(payableAmount) === 0
                      }
                    >
                      Save & Exit
                    </Button>

                    <Button
                      className={`btn btn-primary3 btn-41 ${
                        isMobile ? "me-1" : "px-4 me-20"
                      }`}
                      onClick={handleCreateBill}
                      loading={isSavingBill}
                      disabled={
                        isSavingBill ||
                        disableSaveBtn ||
                        (!patientData?.patient_unique_id &&
                          !patientDetails?.patientUniqueId &&
                          !editBillData?.patientId)
                        //    || Number(payableAmount) === 0
                      }
                    >
                      Save & Print
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      className={`btn-41 btn ant-btn-text align-items-center d-flex ${
                        isMobile ? "" : "px-4"
                      } ${
                        isReceptionist ? "receptionist-white-btn" : "btn-input"
                      }`}
                      onClick={handleCreateBill}
                      loading={isSavingBill}
                      disabled={
                        isSavingBill ||
                        disableSaveBtn ||
                        (!patientData?.patient_unique_id &&
                          !patientDetails?.patientUniqueId &&
                          !editBillData?.patientId) ||
                        // Number(payableAmount) === 0 ||
                        (isReceptionist &&
                          doctorsList?.length > 1 &&
                          !selectedDoctor)
                      }
                    >
                      Save & Print
                    </Button>

                    <Button
                      className={`btn btn-create-bill btn-41 ${
                        isMobile ? "me-1" : "px-4 me-20"
                      } ${isReceptionist ? "receptionist-btn" : ""}`}
                      onClick={() => {
                        handleCreateBill("preview");
                      }}
                      loading={isSavingBill}
                      disabled={
                        isSavingBill ||
                        disableSaveBtn ||
                        (!patientData?.patient_unique_id &&
                          !patientDetails?.patientUniqueId &&
                          !editBillData?.patientId) ||
                        // Number(payableAmount) === 0 ||
                        (isReceptionist &&
                          doctorsList?.length > 1 &&
                          !selectedDoctor)
                      }
                    >
                      Save & Preview
                    </Button>
                  </>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </Navbar>
      <div className="scrollableContainer pb-5">
        <Row className="h-100 align-items-start w-100">
          <Col
            className="h-100"
            style={{
              flex: isIpdBill ? "0 0 76%" : "0 0 70%",
              maxWidth: isIpdBill ? "76%" : "70%",
              overflowY: "auto",
              height: "100%",
              paddingRight: 0,
            }}
          >
            <div className="d-flex flex-column h-100 gap-2 px-3 py-4">
              <div className="d-flex gap-3">
                <div className="w-100">
                  <div className="mb-1">
                    Patient Name, Mobile no & ID{" "}
                    <span className="lab-params-warning">*</span>{" "}
                  </div>
                  {isEditingName &&
                  (!patientData || Object.keys(patientData).length === 0) &&
                  (!patientDetails ||
                    Object.keys(patientDetails).length === 0) ? (
                    <AutoComplete
                      ref={nameAutoCompleteRef} // Attach ref for name AutoComplete
                      value={searchQueryName}
                      onSearch={(value) => {
                        setSearchQueryName(value);
                        onSearchName(value);
                      }}
                      options={patientSearchOptions}
                      onFocus={() => {
                        setAutoCompleteFlagName(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setAutoCompleteFlagName(false);
                          setIsEditingName(true);
                        }, 200);
                      }}
                      className="w-100 autocomplete-custom"
                      popupClassName="autocomplete-dropdown"
                    >
                      <Input
                        placeholder="Search by Patient's Name, Mobile number or Id"
                        prefix={<i className="icon-search"></i>}
                        suffix={
                          searchQueryName.length > 0 && (
                            <i
                              className="icon-Cross"
                              onClick={() => {
                                setSearchQueryName("");
                              }}
                            />
                          )
                        }
                      />
                    </AutoComplete>
                  ) : (
                    <div
                      className={`d-flex align-items-center flex-wrap border border-radius-10 cursor-pointer w-100 ${
                        (patientData?.patient_unique_id || editBillData?.patientId) && "pe-none disabled"
                      }`}
                      onClick={() => {
                        setIsEditingName(true);
                      }}
                      style={{ padding: "5px 10px" }}
                    >
                      <div className="list-patientName d-flex align-items-center me-4 ml-2">
                        <i className="icon-patients backbar me-2"></i>{" "}
                        <span className="patientInfo">
                          {patientDetails?.patientName ||
                            patientData?.pm_fullname ||
                            editBillData?.patient?.name}
                        </span>
                      </div>
                      <div className="list-patientName d-flex align-items-center me-4">
                        <i className="icon-phone backbar me-2"></i>
                        <span className="patientInfo">
                          {patientDetails?.mobileNumber ||
                            patientData?.pm_contact_no ||
                            editBillData?.patient?.phone}
                        </span>
                      </div>
                      <div className="list-patientName d-flex align-items-center me-4">
                        <i className="icon-Id backbar me-2"></i>
                        <span className="patientInfo">
                          {patientDetails?.pmPid ||
                            patientData?.pm_pid ||
                            editBillData?.patient?.id}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ paddingBottom: "5px" }}>Bill Date</div>
                  <Input
                    className="input-create-bill"
                    style={{ width: 125, height: 38 }}
                    value={editBillData?.createdAt ? moment(editBillData?.createdAt).format("DD-MM-YYYY") : moment().format("DD-MM-YYYY")}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, "");
                    }}
                    disabled={true}
                  />
                </div>
                <div>
                  <div style={{ paddingBottom: "5px" }}>
                    Doctor Name <span className="lab-params-warning">*</span>
                  </div>
                  {!isReceptionist || doctorsList.length === 1 || editBillData?.doctorId ? (
                    <Input
                      className="input-create-bill"
                      value={
                        doctorsList.length === 1
                          ? doctorsList[0].label
                          : editDoctorFromList?.label
                          ? editDoctorFromList?.label
                          : profile?.um_name
                          ? profile?.um_name
                          : ""
                      }
                      style={{ height: 38, width: "12rem" }}
                      onInput={(e) => {
                        e.target.value = e.target.value.replace(/[^0-9]/g, "");
                      }}
                      disabled={true}
                    />
                  ) : (
                    <Select
                      style={{ width: 170, height: 40 }}
                      onChange={(value, option) => setSelectedDoctor(option)}
                      options={doctorsList}
                      placeholder="Select"
                      className="custom-select"
                      allowClear
                    />
                  )}
                </div>
              </div>
              <Divider />
              <BillTemplate
                setDataSource={setDataSource}
                dataSource={dataSource}
                totalBillAmount={totalBillAmount}
              />
              <Table
                dataSource={dataSource}
                columns={columns}
                pagination={false}
                rowKey="key"
                bordered
                className="customize-table"
                rowClassName={() => "create-bill-table"}
              />
            </div>
          </Col>
          <Col
            className="h-100 py-4"
            style={{
              flex: isIpdBill ? "0 0 24%" : "0 0 30%",
              maxWidth: isIpdBill ? "24%" : "30%",
              overflowY: "auto",
              height: "100%",
              backgroundColor: "rgba(241, 241, 245, 0.5)",
            }}
          >
            <div className="d-flex gap-2">
              <div className="w-100">
                <div className="text-lg font-medium mb-2">
                  Paid Amount <span className="lab-params-warning">*</span>
                </div>
                {paymentModes.map((payment, index) => (
                  <div key={index} className="relative w-100">
                    {index > 0 && (
                      <div className="flex items-center gap-2 mb-3 relative">
                        <span className="text-gray-500 text-sm font-medium z-10 px-2">
                          And
                        </span>
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-300 -z-10"></div>
                      </div>
                    )}
                    <div className="flex align-items-center gap-4 mb-3 w-100">
                      <div className="d-flex align-items-center gap-1 w-100">
                        <div
                          className="d-flex flex-column w-100"
                          style={{
                            background: "rgba(75, 74, 213, 0.06)",
                            borderRadius: 10,
                          }}
                        >
                          <div
                            className="d-flex w-100"
                            style={{
                              border:
                                disableSaveBtn ||
                                (isPaymentModeItemMissing &&
                                  payment?.amount === 0) ||
                                (!isEditBillNotUpdated &&
                                  payment?.paymentMode === "Advance Deposit" &&
                                  payment?.amount > patientWalletBalance)
                                  ? "solid 1px red"
                                  : "",
                              borderRadius:
                                disableSaveBtn ||
                                (isPaymentModeItemMissing &&
                                  payment?.amount === 0) ||
                                (!isEditBillNotUpdated &&
                                  payment?.paymentMode === "Advance Deposit" &&
                                  payment?.amount > patientWalletBalance)
                                  ? 10
                                  : "",
                            }}
                          >
                            <Select
                              placeholder="Select"
                              value={payment.paymentMode}
                              onChange={(value) =>
                                handleModeChange(value, index, "paymentMode")
                              }
                              className={`${isIpdBill && isMobile ? "payment-mode-ipd" : "payment-mode"}`}
                              dropdownStyle={{ width: 180 }}
                              options={filteredOptions}
                            />
                            <Input
                              inputMode="numeric"
                              prefix="₹"
                              value={payment.amount}
                              onChange={(e) => {
                                handleAmountChange(e.target.value, index);
                                if (isPaymentModeItemMissing) {
                                  setPaymentModeItemMissing(false);
                                }
                              }}
                              className="w-100 payment-input"
                            />
                          </div>
                          {payment?.paymentMode &&
                            payment.paymentMode !== "Cash" &&
                            payment.paymentMode !== "Advance Deposit" && (
                              <span
                                style={{
                                  textAlign: payment?.refId ? "" : "center",
                                  textDecoration: payment?.refId
                                    ? "none"
                                    : "underline",
                                  borderRadius: "0 0 10px 10px",
                                  minHeight: 25,
                                  cursor: "pointer",
                                  wordBreak: "break-word",
                                }}
                                onClick={() => {
                                  if (payment.paymentMode === "UPI") {
                                    const clinic = getClinic();
                                    trackEvent("TP_Billing_UPIRefID", {
                                      patientName:
                                        patientDetails?.patientName ||
                                        editBillData?.patient?.name ||
                                        "",
                                      patientId:
                                        patientDetails?.patientUniqueId ||
                                        editBillData?.patientId ||
                                        "",
                                      doctorId: profile?.doctor_unique_id,
                                      doctorContact: profile?.um_contact,
                                      city: clinic?.hm_city,
                                      pincode: clinic?.hm_pincode,
                                      receptionistId: receptionistId,
                                      receptionistName: receptionistName,
                                    });
                                  }
                                  setShowRefIdPopup(index);
                                }}
                              >
                                {payment?.refId ? (
                                  <div className="d-flex align-items-center justify-content-between px-2">
                                    <span>Ref ID: {payment?.refId}</span>
                                    <span className="icon-Edit fs-18" />
                                  </div>
                                ) : (
                                  <span className="show-more-link">
                                    {`Add ${payment.paymentMode} Ref ID`}
                                  </span>
                                )}
                              </span>
                            )}
                        </div>
                        {paymentModes.length > 1 && (
                          <Button
                            className="btn btn-delete-prescription p-2 d-flex align-items-center justify-content-center"
                            onClick={() => removePaymentMode(index)}
                          >
                            <i
                              className="icon-delete"
                              style={{ color: "#454551" }}
                            />
                          </Button>
                        )}
                      </div>
                      {isPaymentModeItemMissing && payment?.amount === 0 && (
                        <div className="d-flex align-items-start gap-2">
                          <span className="icon-info fs-18 mt-1 bdg-danger" />
                          <span className="bdg-danger">
                            Please enter an amount for the{" "}
                            <b style={{ fontWeight: 600 }}>
                              {payment?.paymentMode}
                            </b>{" "}
                            payment mode to proceed
                          </span>
                        </div>
                      )}
                      {!isEditBillNotUpdated && payment?.paymentMode === "Advance Deposit" &&
                        payment?.amount > totalAdvanceBalance && (
                          <div className="d-flex align-items-start gap-2">
                            <span className="icon-info fs-18 mt-1 bdg-danger" />
                            <span className="bdg-danger">
                              Amount exceeds available balance of ₹
                              {totalAdvanceBalance}. Please adjust or add funds
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
                {disableSaveBtn && (
                  <div className="d-flex align-items-start gap-2">
                    <span className="icon-info fs-18 mt-1 bdg-danger" />
                    <span className="bdg-danger">
                      The sum of paid amount cannot exceed the total payable
                      amount
                    </span>
                  </div>
                )}
                {paymentModes.length < 4 && (
                  <div className="flex align-items-center gap-2">
                    <button
                      className="btn d-flex align-items-center btn-text"
                      onClick={addPaymentMode}
                    >
                      <i className={`icon-Add me-1 fs-5 text-primary`} />
                      <span className="text-primary">Payment mode</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <Divider />
            <div
              className="d-flex flex-column gap-3 position-relative mb-4"
              style={{
                background: "white",
                borderRadius: "16px 16px 0 0",
                padding: "14px 14px 24px 14px",
                boxShadow: "0px 0px 60px 0px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div className="d-flex justify-content-between">
                <span>Subtotal:</span>
                <span>₹{subTotal}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Line Item Discount:</span>
                <span className="tick-icon">-₹{lineItemDiscount}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Applicable GST:</span>
                <span>₹{applicableGst}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Extra Discount:</span>
                <div style={{ position: "relative", width: "50%" }}>
                  <Input
                    value={extraDiscount}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(
                        /[^\d.]/g,
                        ""
                      );
                      const value = onlyDecimalFormat(numericValue);
                      if (
                        (extraDiscountType === "percentage" && value <= 100) ||
                        (extraDiscountType === "flat" &&
                          Number(value) <=
                            dataSource.reduce(
                              (sum, service) =>
                                sum + (Number(service.totalAmount) || 0),
                              0
                            ))
                      ) {
                        setExtraDiscount(value);
                      }
                    }}
                    inputMode="decimal"
                    style={{
                      textAlign: "left",
                      width: "100%",
                      height: "38px",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: "6px",
                      bottom: "8px",
                      zIndex: 10,
                    }}
                  >
                    <Radio.Group
                      value={extraDiscountType}
                      style={{ display: "flex", width: "60px" }}
                      onChange={(e) => {
                        setExtraDiscountType(e.target.value);
                        setExtraDiscount(undefined);
                      }}
                    >
                      <Radio.Button
                        value={"percentage"}
                        style={{
                          width: "50%",
                          height: "23px",
                        }}
                        className="custom-radio-button d-flex align-items-center justify-content-center"
                      >
                        %
                      </Radio.Button>
                      <Radio.Button
                        value={"flat"}
                        style={{
                          width: "50%",
                          height: "23px",
                        }}
                        className="custom-radio-button  d-flex align-items-center justify-content-center"
                      >
                        ₹
                      </Radio.Button>
                    </Radio.Group>
                  </div>
                </div>
              </div>
              {/* {patientDueAmount > 0 && (
                <div className="d-flex justify-content-between">
                  <span>Due from Previous bill:</span>
                  <span className="text-scheduled">
                    ₹{patientDueAmount.toFixed(2)}
                  </span>
                </div>
              )} */}
              <Divider style={{ margin: 0 }} />
              <div className="d-flex justify-content-between">
                <span style={{ fontWeight: 600 }}>Total Payable Amount:</span>
                <span style={{ fontWeight: 600 }}>₹{payableAmount}</span>
              </div>
              <Divider style={{ margin: 0 }} />
              {paymentModes?.map((payment, index) => {
                return (
                  <div key={index} className="d-flex justify-content-between">
                    <span>Paid Via "{payment.paymentMode}":</span>
                    <span>₹{payment.amount}</span>
                  </div>
                );
              })}
              <Divider style={{ margin: 0 }} />
              <div className="d-flex justify-content-between">
                <span className="tick-icon" style={{ fontWeight: 500 }}>
                  Total Amount Paid:
                </span>
                <span className="tick-icon" style={{ fontWeight: 500 }}>
                  ₹{paidAmount}
                </span>
              </div>
              {payableAmount - paidAmount > 0 && (
                <div className="d-flex justify-content-between">
                  <span className="text-scheduled" style={{ fontWeight: 500 }}>
                    Total Payment Due:
                  </span>
                  <span className="text-scheduled" style={{ fontWeight: 500 }}>
                    ₹{(Number(payableAmount) - Number(paidAmount)).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="wave-container">
                <img src={waveImage} className="wave-bottom" alt="wave" />
              </div>
            </div>

            {patientBillNotes?.length === 0 ? (
              <button
                className="btn d-flex align-items-center btn-text"
                style={{
                  color: "#4B4AD5",
                  fontWeight: "500",
                  padding: "25px 0px 40px",
                }}
                onClick={handleDrawerDiagnosisNotes}
              >
                <i className={`icon-Add me-1 fs-5`} /> Add Notes
              </button>
            ) : (
              <div
                className="d-flex justify-content-between align-items-start"
                style={{ padding: "25px 0px 25px 14px" }}
              >
                <div style={{ maxWidth: "92%" }}>
                  <ReadMore
                    title={"Notes: "}
                    text={patientBillNotes}
                    textLimit={60}
                  />
                </div>
                <div onClick={handleDrawerDiagnosisNotes}>
                  <i className="icon-Edit text-primary fs-16 cursor-pointer" />
                </div>
              </div>
            )}
          </Col>
        </Row>
      </div>
      {(searchItemSelected?.isCustom || editIndex > -1) && (
        <ServiceItemPopup
          onCancel={() => {
            setSearchItemSelected(null);
            setEditIndex(-1);
          }}
          editIndex={editIndex}
          item={searchItemSelected}
          setDataSource={setDataSource}
          addRow
          setSearchQuery={setSearchQuery}
        />
      )}
      {shouldShowRefIdPopup !== null && shouldShowRefIdPopup >= 0 && (
        <RefIdPopup
          index={shouldShowRefIdPopup}
          refId={paymentModes[shouldShowRefIdPopup]?.refId}
          showHideModal={() => setShowRefIdPopup(-1)}
          handleModeChange={handleModeChange}
        />
      )}
      {billNotesDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleDrawerDiagnosisNotes}
          open={billNotesDrawer}
          className="modalWidth-563"
          width="auto"
          push={false}
        >
          <DiagnosisNotes
            handleDrawerDiagnosisNotes={handleDrawerDiagnosisNotes}
            diagnosisNotes={patientBillNotes}
            setDiagnosisNotes={setPatientBillNotes}
            isDiagnosis={false}
          />
        </Drawer>
      )}
      {previewBillDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleDrawerPreviewBill}
          open={previewBillDrawer}
          width="100%"
          push={false}
        >
          <PreviewBill
            handleDrawerPreviewBill={handleDrawerPreviewBill}
            handleCreateBillDrawer={handleCreateBillDrawer}
            patientData={patientData}
            billData={billData}
            isPreviewFromTable={isPreviewFromTable || editBillData}
            totalAdvanceBalance={patientWalletBalance}
            handleEditBillDrawer={handleDrawerPreviewBill}
          />
        </Drawer>
      )}
      {addAdvanceDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleAddAdvanceDrawer}
          open={addAdvanceDrawer}
          width="85%"
          push={false}
        >
          <AddAdvance
            handleAddAdvanceDrawer={handleAddAdvanceDrawer}
            patientData={
              patientData?.pm_fullname ? patientData : patientDetails
            }
            updateTotalAdvanceBalance={setTotalAdvanceBalance}
            isReceptionistDashboard={isReceptionist}
          />
        </Drawer>
      )}
    </div>
  );
};

export default React.memo(CreateBill);
