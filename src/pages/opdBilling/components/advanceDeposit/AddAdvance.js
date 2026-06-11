import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  AutoComplete,
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Table,
  Tooltip,
  Tabs,
  Dropdown,
  message,
  Drawer,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import moment from "moment";
import dayjs from "dayjs";
import "./AddAdvance.scss";

import { useSelector, useDispatch } from "react-redux";
import {
  clearSearch,
  searchPatients,
} from "../../../../redux/appointmentsSlice";
import {
  createAdvancedDeposit,
  fetchAdvancedDepositDashboard,
  listAdvancedDepositByPatient,
} from "../../service";

import { MESSAGE_KEY } from "../../../../utils/constants";
import { ListGroup } from "react-bootstrap";
import { PaymentOptions } from "../../utils/constants";
import InfoTooltip from "../billingDashboard/BillingTable/InfoToolTip/InfoTooltip";
import {
  getClinic,
  onlyDecimalFormat,
  trackEvent,
} from "../../../../utils/utils";
import { formatDateWithOrdinal, enrichPatientDataWithAbha } from "../../utils/helper";
import PreviewBill from "../../PreviewBill";
import ViewBillPdf from "../viewBillPdf/ViewBillPdf";
import { pdf } from "@react-pdf/renderer";
import { printContent } from "../../utils/helper";
import { setLoadingStatus } from "../../../../redux/uploadDocSlice";
import { useLocation } from "react-router-dom";
import { isMobile } from "react-device-detect";
import RefIdPopup from "../refIdPopup/RefIdPopup";
import { throttle } from "lodash";
import { ASSETS } from "../../../../assets";
const {
  closeVisit: imgCloseVisit,
  endVisit: visitEnd,
} = ASSETS.images;

const dateFormat = "YYYY-MM-DD";
const showDateFormat = "DD MMM, YY";
const { TextArea } = Input;

function AddAdvance({
  handleAddAdvanceDrawer,
  patientData,
  billData,
  onSuccess,
  updateTotalAdvanceBalance,
  isReceptionistDashboard,
}) {
  const { state } = useLocation();
  const { pam_id } = state || {};
  const { profile } = useSelector((state) => state.doctors);
  const { patients, error } = useSelector((state) => state.records);
  const { billPrintSettings, advancedSettings } = useSelector(
    (state) => state.billing
  );

  const scrollContainerRef = useRef(null);
  const inputRef = useRef([]);
  const dispatch = useDispatch();
  const [dateString, setDateString] = useState(null);
  const [shouldShowRefIdPopup, setShowRefIdPopup] = useState(-1);
  const [selectedTab, setSelectedTab] = useState(1);

  const [patientDetails, setPatientDetails] = useState(null);
  const [sortConfig, setSortConfig] = useState({ field: null, order: null });
  const [data, setData] = useState(null);
  const [clickedPatient, setClickedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [patientSearchOptions, setPatientSearchOptions] = useState([]);
  const [autoCompleteFlagName, setAutoCompleteFlagName] = useState(false);
  const [depositDate, setDepositDate] = useState(dayjs().format("DD-MM-YYYY"));
  const [searchQueryName, setSearchQueryName] = useState("");
  const [searchQueryMobile, setSearchQueryMobile] = useState("");
  const [isEditingName, setIsEditingName] = useState(true);
  const [advanceTriggered, setAdvacneTriggered] = useState(false);
  const [advaceData, setAdvanceData] = useState(null);
  const [previewBillDrawer, setPreviewBillDrawer] = useState(false);
  const [totalAdvanceBalance, setTotalAdvanceBalance] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const tableRef = useRef(null);

  const nameAutoCompleteRef = useRef(null);
  const mobileAutoCompleteRef = useRef(null);

  // const [searchOptionsName, setPatientSearchOptionsName] = useState([]);
  // const [searchOptionsMobile, setPatientSearchOptionsMobile] = useState([]);  const [depositDate, setDepositDate] = useState("");

  const [advanceModes, setAdvanceModes] = useState([]);
  const [refundModes, setRefundModes] = useState([]);
  const [notes, setNotes] = useState(""); // Stores the final notes value
  const notesRef = useRef("");
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const receptionistId = urlParams.get("receptionistId");
  const receptionistName = urlParams.get("receptionistName");

  useEffect(() => {
    setAdvanceModes([
      {
        paymentMode: advancedSettings.defaultPaymentMode,
        amount: undefined,
      },
    ]);
    setRefundModes([
      {
        paymentMode: advancedSettings.defaultPaymentMode,
        amount: undefined,
      },
    ]);
  }, [advancedSettings]);

  const usedAdvanceModes = advanceModes.map((p) => p.paymentMode);

  const filteredAdvanceOptions = PaymentOptions.filter(
    (option) =>
      !usedAdvanceModes.includes(option.value) &&
      option.value !== "Advance Deposit"
  );

  const usedPaymentModes = refundModes.map((p) => p.paymentMode);

  const filteredOptions = PaymentOptions.filter(
    (option) =>
      !usedPaymentModes.includes(option.value) &&
      option.value !== "Advance Deposit"
  );
  const { planDetails } = useSelector((state) => state.subscription);

  const calculateTotalAmount = (modes) => {
    return modes.reduce((total, mode) => {
      const amount = parseFloat(mode.amount) || 0; // Ensure amount is a number
      return total + amount;
    }, 0);
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
  // Initialize items in state
  const [items, setItems] = useState([
    {
      //   key: Add Advance Deposit,
      key: 1,
      label: (
        <div className="d-flex align-items-center">
          <i className="icon-billings"></i>
          {isMobile ? "Add Advance" : "Add Advance Deposit"}
        </div>
      ),
    },
    {
      //   key: Refund Advance,
      key: 2,
      label: (
        <div className="d-flex align-items-center">
          <i className="icon-Finished"></i>
          {isMobile ? "Refund" : "Refund Advance"}
        </div>
      ),
    },
  ]);

  const onChange = useCallback(
    (key) => {
      //   setPageNo(0);
      //   setVisitTypeFilters("");
      setSelectedTab(key);
    },
    [selectedTab]
  );

  // Function to update modes (either advance or refund)
  const handleModeChange = (type, value, index, key) => {
    const updatedModes =
      type === "advance" ? [...advanceModes] : [...refundModes];
    updatedModes[index][key] = value;
    type === "advance"
      ? setAdvanceModes(updatedModes)
      : setRefundModes(updatedModes);
  };

  const handleRefIdChange = (value, index, type) => {
    if (selectedTab === 1) {
      const updatedModes = [...advanceModes];
      updatedModes[index][type] = value;
      setAdvanceModes(updatedModes);
    } else {
      const updatedModes = [...refundModes];
      updatedModes[index][type] = value;
      setRefundModes(updatedModes);
    }
  };

  // const handleAddAdvance = () => {
  //   handleAddAdvanceDrawer();
  // };

  // Function to add a new payment mode
  const addPaymentMode = (type) => {
    const newMode = {
      paymentMode:
        type === "advance"
          ? filteredAdvanceOptions[0]?.value
          : filteredOptions[0]?.value,
      amount: undefined,
    };
    type === "advance"
      ? setAdvanceModes([...advanceModes, newMode])
      : setRefundModes([...refundModes, newMode]);
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
      paymentModes: JSON.stringify(
        type === "advance"
          ? setAdvanceModes([...advanceModes, newMode])
          : setRefundModes([...refundModes, newMode])
      ),
      receptionistId: urlParams.get("receptionistId"),
      receptionistName: urlParams.get("receptionistName"),
    });
  };

  // Function to remove a payment mode
  const removePaymentMode = (type, index) => {
    const updatedModes =
      type === "advance"
        ? advanceModes.filter((_, i) => i !== index)
        : refundModes.filter((_, i) => i !== index);

    type === "advance"
      ? setAdvanceModes(updatedModes)
      : setRefundModes(updatedModes);
  };

  const PatientPlank = (patient) => {
    return (
      <>
        <div className="d-flex align-items-center justify-content-between">
          <div
            className="d-flex align-items-center"
            onClick={() => {
              setAutoCompleteFlagName(false);
              onSelect(patient);
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

  const onSearchName = useCallback(
    (query) => {
      setSearchQueryName(query);
    },
    [setSearchQueryName]
  );

  const onSearchMobile = useCallback(
    (query) => {
      setSearchQueryMobile(query);
    },
    [setSearchQueryMobile]
  );

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
    setPatientSearchOptions(data);
  }, [patients]);

  const onSelect = (patient) => {
    setPatientDetails({
      patientName: patient.pm_fullname,
      mobileNumber: patient.pm_contact_no,
      patientUniqueId: patient.patient_unique_id,
      patientId: patient.pm_pid,
    });
    setPatientSearchOptions([]);
    setSearchQueryMobile("");
    setSearchQueryName("");
    setIsEditingName(false);
  };

  useEffect(() => {
    if (isEditingName && nameAutoCompleteRef.current) {
      nameAutoCompleteRef.current.focus();
    }
  }, [isEditingName]);

  const handleFieldChange = (field, value) => {
    setPatientDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // const getFilteredOptions = (type, paymentModes) => {
  //   const usedPaymentModes = paymentModes.map((p) => p.paymentMode);

  //   return PaymentOptions.filter((option) => {
  //     // Prevent duplicate payment modes
  //     if (usedPaymentModes.includes(option.value)) return false;

  //     // // Special condition for "Refund"
  //     // if (option.value === "Refund" && type !== "refund") {
  //     //   return false;
  //     // }

  //     return true;
  //   });
  // };

  const renderPaymentModes = (type, modes, filteredOptions) => (
    <div className="d-flex">
      <div style={{ padding: "16px 16px 0px 0px", width: "100%" }}>
        <div className="text-lg font-medium mb-2">
          Enter {`${type === "advance" ? "Advance" : "Refund"}`} Amount{" "}
          <span className="color-red">*</span>
        </div>
        {modes.map((payment, index) => (
          <div key={index} className="relative" style={{ width: "100%" }}>
            {/* "And" separator when more than one payment mode exists */}
            {index > 0 && (
              <div className="flex items-center gap-2 mb-2 relative">
                <span className="text-gray-500 text-sm font-medium z-10 bg-white px-2">
                  And
                </span>
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-300 -z-10"></div>
              </div>
            )}
            <div className="flex align-items-center gap-4 mb-3">
              <div
                className="d-flex align-items-center"
                style={{ width: "100%" }}
              >
                <div
                  className="d-flex flex-column"
                  style={{
                    width: "100%",
                    backgroundColor: "rgba(75, 74, 213, 0.06)",
                    borderRadius: "10px",
                  }}
                >
                  <div className="d-flex">
                    {/* Payment Mode Select */}
                    <Select
                      placeholder="Select"
                      value={payment.paymentMode}
                      onChange={(value) =>
                        handleModeChange(type, value, index, "paymentMode")
                      }
                      dropdownStyle={{ width: 180 }}
                      options={filteredOptions}
                      className="payment-mode"
                    />
                    {/* Amount Input */}
                    <Input
                      type="numeric"
                      prefix="₹"
                      value={payment.amount}
                      onChange={(e) => {
                        const value = onlyDecimalFormat(e.target.value);
                        if (value <= 1000000000) {
                          handleModeChange(type, value, index, "amount");
                        }
                      }}
                      className="w-40 payment-input"
                    />
                  </div>
                  {/* Ref ID Section (If Payment Mode is Not Cash) */}
                  {payment?.paymentMode &&
                    payment.paymentMode !== "Cash" &&
                    payment.paymentMode !== "Advance Deposit" && (
                      <span
                        style={{
                          textAlign: payment?.refId ? "" : "center",
                          textDecoration: payment?.refId ? "none" : "underline",
                          borderRadius: "0 0 10px 10px",
                          minHeight: 25,
                          cursor: "pointer",
                          wordBreak: "break-word",
                        }}
                        onClick={() => setShowRefIdPopup(index)}
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
                {/* Remove Button (Only if More than One Payment Mode Exists) */}
                {modes.length > 1 && (
                  <Button
                    className="btn btn-delete-prescription p-0"
                    onClick={() => removePaymentMode(type, index)}
                  >
                    <i
                      className="icon-delete"
                      style={{ color: "#454551", marginLeft: 10 }}
                    />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        {/* Add Payment Mode Button (Limit to 4 Modes) */}
        {modes.length < 4 && (
          <div className="flex items-center gap-2">
            <button
              className="btn d-flex align-items-center btn-text"
              onClick={() => addPaymentMode(type)}
            >
              <i className={`icon-Add me-1 fs-5 text-primary`} />
              <span className="text-primary">Payment mode</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const columns = [
    {
      title: "#",
      dataIndex: "srno",
      key: "srno",
      ellipsis: true,
      width: 50,
      render: (text, record, index) => <div className="fs-14">{index + 1}</div>,
    },
    {
      title: "RECEIPT NO & DATE",
      dataIndex: "date",
      key: "date",
      width: 250,
      sorter: true,
      render: (text, record) => (
        <div className="cursor-pointer" onClick={async () => {}}>
          <div className="fs-14 fw-semibold theme-color">
            {record?.billNumber || record.receiptNumber}
          </div>
          <div className="fs-14 fw-normal text-truncate-twolines">
            {formatDateWithOrdinal(record.date)}
          </div>
        </div>
      ),
    },
    {
      title: "TOTAL AMOUNT",
      dataIndex: "totalAmount",
      key: "totalAmount",
      ellipsis: true,
      sorter: true,
      width: 150,
      render: (text, record) => <div> ₹{record.totalAmount} </div>,
    },
    {
      title: "STATUS",
      dataIndex: "transactionType",
      key: "transactionType",
      width: 150,
      render: (text, record) => {
        // Determine the class name and display value based on the status
        const getStatusDetails = (status) => {
          switch (status.toLowerCase()) {
            case "deposit":
              return {
                className: "status-advance",
                displayText: `Deposit`,
              };
            case "refund":
              return {
                className: "status-refunded",
                displayText: `Refunded`,
              };
            case "debit":
              return {
                className: "status-debited",
                displayText: `Debited`,
              };
            default:
              return {
                className: "status-advance",
                displayText: `Advance`,
              };
          }
        };

        // Get status details
        const { className, displayText } = getStatusDetails(
          record.transactionType
        );

        return (
          <div className="d-flex">
            <div className={className}>{displayText}</div>
            {["Deposit", "Debit"].includes(record.transactionType) &&
              record.billNumber && (
                <InfoTooltip
                  type={record.transactionType}
                  amount={record.totalAmount}
                  notes={record.notes}
                  billNo={record.billNumber}
                />
              )}
          </div>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      render: (text, record) => (
        <Dropdown
          className="cursor-pointer"
          menu={{
            items: getMenuItems(record),
          }}
          trigger={["click"]}
        >
          <i className="icon-More"></i>
        </Dropdown>
      ),
    },
  ];

  const handleDrawerPreviewBill = () => {
    setPreviewBillDrawer(!previewBillDrawer);
  };

  const onAdvanceDetailsClick = async (status, record) => {
    setAdvanceData(record);
    if (status === 1) {
      handleDrawerPreviewBill();
    } else {
      const patient = billData?.patient || data?.[0]?.patient || {};
      const upadtedPatientData = {
        pm_pid: patient.id,
        pm_fullname: patient.name,
        pm_gender: patient.gender,
        pm_contact_no: patient.phone,
        tpml_refrence_id: patient?.refId,
        ageDays: patient.ageDays,
        ageMonths: patient.ageMonths,
        ageYears: patient.ageYears,
        pm_salutation: patient.salutation,
        address: patient.address,
      };
      const dataToUse =
        patientData && Object.keys(patientData).length > 0
          ? patientData
          : upadtedPatientData;
      const patientDataWithAbha = await enrichPatientDataWithAbha(
        dataToUse,
        billData?.patientId ||
          patientDetails?.patientUniqueId ||
          record?.patientId,
      );
      const blob = await pdf(
        <ViewBillPdf
          printSettings={billPrintSettings}
          patientData={patientDataWithAbha}
          profile={profile}
          billData={record}
          isDepositReceipt={true}
          totalAdvanceBalance={totalAdvanceBalance}
          gstIn={advancedSettings?.GSTIN}
          showCreatedBy={advancedSettings?.enableCreatedByInRx}
        />
      ).toBlob();
      printContent(
        blob,
        billData?.patientId ||
          patientDetails?.patientUniqueId ||
          record?.patientId,
        setStartLoader
      );
    }
  };

  const setStartLoader = () => {
    dispatch(setLoadingStatus(true));
  };

  const getMenuItems = (record) => {
    const items = [
      {
        label: (
          <div onClick={() => onAdvanceDetailsClick(1, record)}>
            View Receipt
          </div>
        ),
        key: "view_receipt",
      },
      {
        label: (
          <div onClick={() => onAdvanceDetailsClick(2, record)}>
            Print Receipt
          </div>
        ),
        key: "refund_receipt",
      },
    ];

    return items;
  };

  const handleSortChange = (pagination, filters, sorter) => {
    if (sorter.order) {
      const order = sorter.order === "ascend" ? "asc" : "desc"; // Convert for API
      const field = sorter.field;
      setSortConfig({ field, order });
    } else {
      setSortConfig({ field: null, order: null }); // Reset sorting
    }
  };

  const convertToISODateTime = (dateString) => {
    const [day, month, year] = dateString.split("-");
    const selectedDate = new Date(`${year}-${month}-${day}`);

    // Get today's date in local timezone (without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If selected date is today, return it in local time format with current time
    if (selectedDate.getTime() === today.getTime()) {
      const now = new Date();
      return `${year}-${month}-${day} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    }

    // Otherwise, convert to ISO format for past dates
    return selectedDate.toISOString();
  };

  const handleAddAdvanceClick = async () => {
    const clinic = getClinic();
    trackEvent(
      selectedTab === 2 ? "TP_billing_refundadvance" : "TP_billing_addadvance",
      {
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        city: clinic?.hm_city,
        pincode: clinic?.hm_pincode,
        source: "add_advance",
        receptionistId: receptionistId,
        receptionistName: receptionistName,
      }
    );
    const totalAdvanceAmount = calculateTotalAmount(advanceModes);
    const totalRefundAmount = calculateTotalAmount(refundModes);

    if (totalRefundAmount > totalAdvanceBalance) {
      message.error(
        "Refund amount shouldn't be greated than Total Advance Balance"
      );
      return;
    }

    if (depositDate || patientData?.apDate) {
      // Remove the ordinal suffix (st, nd, rd, th) from the date
      const cleanDate =
        patientData?.apDate &&
        patientData?.apDate.replace(/(\d+)(st|nd|rd|th)/, "$1");

      // Combine date and time and parse with moment
      const isoString = moment(
        `${cleanDate} ${patientData?.apTime}`,
        "D MMM YYYY hh:mm A"
      ).toISOString();

      const payload = {
        appointmentId: pam_id,
        patientId:
          patientDetails?.patientUniqueId ||
          patientData?.patientUniqueId ||
          patientData?.patient_unique_id ||
          patientData?.patientId,
        transactionType: selectedTab === 2 ? "Refund" : "Deposit",
        paymentModes: selectedTab === 2 ? [...refundModes] : [...advanceModes],
        totalAmount: selectedTab === 2 ? totalRefundAmount : totalAdvanceAmount,
        notes: notes,
        includeInRx: true,
        date: patientData?.apDate
          ? isoString
          : convertToISODateTime(depositDate),
      };

      try {
        const response = await createAdvancedDeposit(payload);
        if (response?.id) {
          message.open({
            key: MESSAGE_KEY,
            type: "",
            className: "message-appointment",
            content: (
              <div className="d-flex align-items-center">
                <img src={visitEnd} className="me-3" />
                <div>
                  {selectedTab === 1 ? (
                    <div className="title-common text-start fontroboto">{`Advance ₹${totalAdvanceAmount} Added successfully`}</div>
                  ) : (
                    <div className="title-common text-start fontroboto">{`Refunded ₹${totalRefundAmount} successfully`}</div>
                  )}
                  {/* <div className='fontroboto text-start fw-normal mt-1'>View completed visits in finished tab.</div> */}
                </div>
                <img
                  src={imgCloseVisit}
                  className="ms-3"
                  onClick={() => message.destroy()}
                />
              </div>
            ),
            duration: 5,
          });
          // Reset payment modes
          setAdvanceModes([
            {
              paymentMode: advancedSettings.defaultPaymentMode,
              amount: "",
              refId: "",
            },
          ]);
          setRefundModes([
            {
              paymentMode: advancedSettings.defaultPaymentMode,
              amount: "",
              refId: "",
            },
          ]);
          setAdvacneTriggered((prev) => !prev);
          setNotes("");
          onSuccess();
        }
      } catch (error) {
        console.error("Failed to create deposit:", error);
      }
    } else {
      message.error("please fill the details");
    }
  };

  const loadDepositData = async (resetData = true) => {
    // setLoading(true);
    const params = {
      status: ["Deposit", "Refund", "Debit"],
      sortBy: sortConfig?.field || "date",
      sortOrder: sortConfig?.order || "desc",
      patientId:
        patientData?.patient_unique_id ||
        patientData?.patientId ||
        billData?.patientId ||
        patientData?.patientUniqueId ||
        patientDetails?.patientUniqueId,
      page: resetData ? 1 : page,
      limit: 25,
      // startDate: `2024-10-20`,
      // endDate: dateRange.endDate,
    };
    try {
      const response = await listAdvancedDepositByPatient(params);
      if (response?.receipts?.length > 0) {
        const receiptsData = response?.receipts?.map((receipt) => ({
          ...receipt,
          patient: response?.patient,
        }));
        setPage(resetData ? 2 : page + 1);
        setHasMore(receiptsData.length >= 25);
        setData((prev) =>
          resetData ? receiptsData : [...(prev || []), ...receiptsData]
        );
      } else {
        setData(null);
      }
      setTotalAdvanceBalance(response?.summary?.totalAdvanceBalance);
      updateTotalAdvanceBalance &&
        updateTotalAdvanceBalance(response?.summary?.totalAdvanceBalance);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    resetTableScroll();
    if (patientDetails || patientData || billData) {
      loadDepositData();
    }
  }, [patientDetails, advanceTriggered, patientData, sortConfig, billData]);

  function formatDate(date) {
    // Remove ordinal suffix (st, nd, rd, th) using regex
    let cleanDate = date.replace(/(\d+)(st|nd|rd|th)/, "$1");

    // Parse and format the date using Moment.js
    return moment(cleanDate, "D MMM YYYY").format("DD-MM-YYYY");
  }

  // Add this validation function
  const isFormValid = () => {
    if (selectedTab === 1) {
      // Advance
      // Check if any advance mode is empty or has 0 amount
      return (
        advanceModes.every((mode) => mode.paymentMode && mode.amount > 0) &&
        (patientData?.pm_fullname ||
          patientData?.patientName ||
          patientData?.name ||
          patientDetails?.patientName)
      );
      // ) && (depositDate || patientData?.apDate) &&
    } else {
      // Refund
      // Check if any refund mode is empty or has 0 amount
      return (
        refundModes.every((mode) => mode.paymentMode && mode.amount > 0) &&
        (patientData?.pm_fullname ||
          patientData?.patientName ||
          patientData?.name ||
          patientDetails?.patientName)
      );
      //   (depositDate || patientData?.apDate) &&
    }
  };

  const handleTableScroll = throttle((e) => {
    const { target } = e;
    if (
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <=
        5 &&
      hasMore
    ) {
      loadDepositData(false);
    }
  }, 500);

  const resetTableScroll = () => {
    // Using document.querySelector with a more specific selector
    const tableBody = document.querySelector(".billing-table .ant-table-body");
    if (tableBody) {
      tableBody.scrollTo({
        top: 0,
        behavior: "smooth", // Optional: adds smooth scrolling
      });
    }
  };

  return (
    <>
      <Card bordered={false} className="search-modalCard add-advance-wrapper">
        <div className="modalCard-header align-items-center justify-content-between d-flex">
          <div className="align-items-center d-flex justify-content-center">
            {(!isReceptionist || isReceptionistDashboard) && (
              <Button
                type="text"
                className="btn px-3 focus-none h-100"
                onClick={handleAddAdvanceDrawer}
              >
                <i className="icon-Cross fs-3" />
              </Button>
            )}
            <div
              className={`modal-title ${
                isReceptionist && !isReceptionistDashboard ? "mx-4 p-2" : ""
              }`}
            >
              Advance Deposit
            </div>
          </div>
        </div>
        <div className="d-flex modal-body" style={{ overflow: "scroll" }}>
          <div className="advance-left-container">
            <div className="d-flex flex-column gap-2 my-2 form-fields">
              {/* Patient Name */}
              <div className="d-flex gap-2 mx-4 p-2">
                <div style={{ width: "100%" }}>
                  <div className="text-lg font-medium mb-2">
                    Patient Name, Mobile no & ID
                    <span className="color-red">*</span>
                  </div>
                  {isEditingName && !patientData && !billData ? (
                    <AutoComplete
                      ref={nameAutoCompleteRef}
                      value={searchQueryName}
                      onSearch={(value) => {
                        setSearchQueryName(value);
                        onSearchName(value);
                      }}
                      options={patientSearchOptions}
                      className="w-100 autocomplete-custom"
                      open={autoCompleteFlagName}
                      onFocus={() => {
                        setAutoCompleteFlagName(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setAutoCompleteFlagName(false);
                          setIsEditingName(true);
                        }, 200);
                      }}
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
                      className={`d-flex align-items-center justify-content-between flex-wrap border rounded cursor-pointer w-100 ${
                        patientData && "pe-none disabled"
                      }`}
                      onClick={() => {
                        if (!patientData && !billData) {
                          setIsEditingName(true);
                        }
                      }}
                      style={{ padding: "5px 10px" }}
                    >
                      <div className="list-patientName d-flex align-items-center me-4 ml-2 my-1">
                        <i className="icon-patients backbar me-2"></i>{" "}
                        <span
                          className="patientInfo"
                          style={{ width: "max-content" }}
                        >
                          {patientData?.pm_fullname ||
                            patientData?.patientName ||
                            patientData?.name ||
                            patientDetails?.patientName}
                        </span>
                      </div>
                      <div className="list-patientName d-flex align-items-center me-4 my-1">
                        <i className="icon-phone backbar me-2"></i>
                        <span className="patientInfo">
                          {patientData?.pm_contact_no ||
                            patientData?.mobileNumber ||
                            patientData?.phone ||
                            patientDetails?.mobileNumber}
                        </span>
                      </div>
                      <div className="list-patientName d-flex align-items-center me-4 my-1">
                        <i className="icon-Id backbar me-2"></i>
                        <span className="patientInfo">
                          {patientData?.pm_pid ||
                            patientData?.pmPid ||
                            patientData?.id ||
                            patientDetails?.patientId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="d-flex gap-2 justify-content-between mx-4 p-2">
                {/* Advance Deposit Date */}
                <div className="w-100">
                  <div className="text-lg font-medium mb-2">
                    Advance Deposit Date
                    <span className="color-red">*</span>
                  </div>
                  {patientData?.apDate ? (
                    <Input
                      type="text"
                      value={formatDate(patientData?.apDate)}
                      disabled
                      className="disabled-input patient-input" // Optional: Apply styles to match the DatePicker
                    />
                  ) : (
                    <DatePicker
                      placeholder="Select Date"
                      dropdownClassName="addDOB-picker-dropdown"
                      onChange={(_, d) => setDepositDate(d)}
                      format="DD-MM-YYYY"
                      value={
                        depositDate ? dayjs(depositDate, "DD-MM-YYYY") : null
                      }
                      disabledDate={(current) =>
                        current && current.isAfter(dayjs(), "day")
                      }
                    />
                  )}
                </div>
              </div>
            </div>
            {/* <div className="mx-4"> */}
            <Tabs
              defaultActiveKey={1}
              items={items}
              onChange={onChange}
              activeKey={selectedTab}
            />
            {/* </div> */}
            <div className="d-flex flex-column gap-2 mx-4 my-2 p-2 payment-scroll">
              {selectedTab === 1
                ? renderPaymentModes(
                    "advance",
                    advanceModes,
                    filteredAdvanceOptions
                  )
                : renderPaymentModes("refund", refundModes, filteredOptions)}
              <div className="d-flex">
                <TextArea
                  className="h-50 align-self-center"
                  placeholder="Add Notes (optional)"
                  autoSize={{
                    minRows: 1,
                    maxRows: 2,
                  }}
                  value={notes}
                  onChange={(e) => {
                    notesRef.current = e.target.value;
                    setNotes(e.target.value);
                  }}
                />
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-center mx-4 p-2">
              <Button
                className={`btn btn-primary3 w-100 h-50 ${
                  isReceptionist ? "receptionist-btn" : ""
                }`}
                onClick={handleAddAdvanceClick}
                disabled={!isFormValid()}
              >
                {selectedTab === 1
                  ? `Add Advance ${
                      calculateTotalAmount(advanceModes) > 0
                        ? `₹ ${calculateTotalAmount(advanceModes)}`
                        : ""
                    }`
                  : `Refund ₹${
                      calculateTotalAmount(refundModes) > 0
                        ? ` ${calculateTotalAmount(refundModes)}`
                        : ""
                    }`}
              </Button>
            </div>
          </div>
          {
            <div className="advance-right-container">
              <div className="total-advance-container mx-4 mt-4">
                <div className="advance-balance-title">
                  Total Advance Balance
                </div>
                {patientDetails || patientData || billData ? (
                  <div className="advance-balance-value">
                    ₹{totalAdvanceBalance}
                  </div>
                ) : (
                  <div className="advance-balance-value">--</div>
                )}
              </div>
              <div className="mx-4 mt-4 fs-16 fw-semibold">
                Patient's Advance Deposit History
              </div>
              <div className="mx-4 mt-2">
                <Table
                  ref={tableRef}
                  className="billing-table px-0"
                  columns={columns}
                  width="100%"
                  dataSource={data}
                  pagination={false}
                  scroll={{ y: 500 }}
                  onChange={handleSortChange} // Send sorting data to parent
                  onScroll={handleTableScroll}
                />
              </div>
            </div>
          }
        </div>
      </Card>
      {shouldShowRefIdPopup !== null && shouldShowRefIdPopup >= 0 && (
        <RefIdPopup
          index={shouldShowRefIdPopup}
          refId={
            selectedTab === 1
              ? advanceModes?.[shouldShowRefIdPopup]?.refId
              : refundModes?.[shouldShowRefIdPopup]?.refId
          }
          showHideModal={() => setShowRefIdPopup(-1)}
          handleModeChange={handleRefIdChange}
        />
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
            handleCreateBillDrawer={handleDrawerPreviewBill}
            isPreviewFromTable={true}
            isDepositReceipt={true}
            billData={advaceData}
            totalAdvanceBalance={totalAdvanceBalance}
          />
        </Drawer>
      )}
    </>
  );
}

export default React.memo(AddAdvance);
