import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import {
  Select,
  Checkbox,
  Row,
  Col,
  Input,
  DatePicker,
  Button,
  Table,
  Dropdown,
  Drawer,
  message,
} from "antd";
import { useSelector } from "react-redux";
import moment from "moment";
import dayjs from "dayjs";
import "../AdvanceDepositTable/AdvanceDepositTable.scss";
import "../../../../../components/common/dateRangePill.scss";
import { useReactToPrint } from "react-to-print";
import DownloadBill from "../DownloadBill/DownloadBill.js";
import {
  fetchAdvancedDepositDashboard,
  fetchPatientWalletBalance,
  listAdvancedDepositByPatient,
} from "../../../service.js";
import PreviewBill from "../../../PreviewBill.js";
import { getDecodedToken } from "../../../../../utils/localStorage.js";
import {
  formatDateWithOrdinal,
  handleDownload,
  printContent,
  enrichPatientDataWithAbha,
} from "../../../utils/helper.js";
import AddAdvance from "../../advanceDeposit/AddAdvance.js";
import ViewBillPdf from "../../viewBillPdf/ViewBillPdf.js";
import { pdf } from "@react-pdf/renderer";
import { throttle } from "lodash";
import { setLoadingStatus } from "../../../../../redux/uploadDocSlice.js";
import { useDispatch } from "react-redux";
import html2pdf from "html2pdf.js";
import { TRIAL, S_BILLING, S_TATVA_PRACTICE } from "../../../../../utils/constants.js";
const { RangePicker } = DatePicker;

const cardsStaticData = [
  {
    id: 1,
    title: "Total Advance Received",
    color: "#A461D8",
    fontColor: "#A461D8",
    amountKey: "totalAdvanceReceived",
    countKey: "advanceReceivedCount",
  },
  {
    id: 2,
    title: "Total Advance Refunded",
    color: "#EF9A9A",
    fontColor: "#B73A3A",
    amountKey: "totalAdvanceRefunded",
    countKey: "advanceRefundedCount",
  },
  {
    id: 3,
    title: "Total Advance Debited",
    color: "#FDF7D7",
    fontColor: "#ED8A00",
    amountKey: "totalAdvanceDebited",
    countKey: "advanceDebitedCount",
  },
];

const dateFormat = "YYYY-MM-DD";
const showDateFormat = "DD MMM YYYY";

const AdvanceDepositTable = React.forwardRef(({ patientData, dateRange, setDateRange, totalAdvanceBalance, dateStatus, setDateStatus, showHideSubModal }, ref) => {
  const { planDetails } = useSelector((state) => state.subscription);
  const { service_mappings } = planDetails || {};
  const EMR_planDetails = service_mappings?.find(e => e.service_name === S_TATVA_PRACTICE)
  const BILLING_planDetails = service_mappings?.find(e => e.service_name === S_BILLING)
  const dispatch = useDispatch();

  const { billPrintSettings, advancedSettings } = useSelector(
    (state) => state.billing
  );
  const { profile, userId } = useSelector((state) => state.doctors);
  const decodedToken = getDecodedToken();
  const isAdmin = decodedToken?.result?.admin;
  const [pageNo, setPageNo] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerModal, setPickerModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(1);
  const printableRef = useRef(null);
  const [tabLoader, setTabLoader] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [sortConfig, setSortConfig] = useState({ field: null, order: null });
  const [data, setData] = useState(null);
  const [cards, setCards] = useState([]);
  const [previewBillDrawer, setPreviewBillDrawer] = useState(false);
  const [billData, setBillData] = useState(null);
  const [downloadData, setDownloadData] = useState([]);
  const [advanceData, setAdvanceData] = useState([]);
  const [addAdvanceDrawer, setAddAdvanceDrawer] = useState(false);
  const [patientWalletBalance, setPatientWalletBalance] = useState(0);

  const [openDownloadModal, setOpenDownloadModal] = useState(false);

  const { doctorList } = useSelector((state) => state.bulkMessages);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const tableRef = useRef(null);

  useEffect(() => {
    // Update cards state whenever the summary prop changes
    const updatedCards = cardsStaticData.map((card) => ({
      ...card,
      amount: data?.summary[card.amountKey] || 0,
      count: data?.summary[card.countKey] || 0,
    }));
    setCards(updatedCards);
  }, [data]);

  const onSearch = useCallback(
    (query) => {
      setPageNo(0);
      setSearchQuery(query);
    },
    [searchQuery]
  );

  const handlePickerModal = useCallback(() => {
    setPickerModal(!pickerModal);
  }, [pickerModal]);

  const disabledDate = (current) => {
    return current && current > dayjs().endOf("day");
  };

  const rangePresets = [
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
    if (dates) {
      if (
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

  const handleDrawerPreviewBill = () => {
    setPreviewBillDrawer(!previewBillDrawer);
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

  const checkBillingPurchased = async () => {
    // if (moment(planDetails?.plan_active_date).diff("2025-07-01", 'days') > 0) {
      if (EMR_planDetails?.plan_tier !== TRIAL && BILLING_planDetails?.plan_tier === TRIAL) {
        showHideSubModal()
      } else {
        return true;
      }
    // } else {
    //   return true;
    // }
  }

  const onBillingDetailsClick = async (status, record) => {
    const isPurchased = await checkBillingPurchased()
    if (isPurchased) {
      if (patientData && Object.keys(patientData)?.length > 0) {
        setBillData(record);
      } else {
        setBillData({
          ...record,
          patient: {
            ...record?.patient,
          },
        });
      }
      if (status === 1) {
        handleDrawerPreviewBill();
      } else if (status === 2) {
        const dataToUse =
          patientData && Object.keys(patientData)?.length > 0
            ? patientData
            : {
                pm_pid: record?.patient?.id,
                pm_fullname: record?.patient?.name,
                pm_gender: record?.patient?.gender,
                pm_contact_no: record?.patient?.phone,
                tpml_refrence_id: record?.patient?.refId,
                ageDays: record?.patient?.ageDays,
                ageMonths: record?.patient?.ageMonths,
                ageYears: record?.patient?.ageYears,
                pm_salutation: record?.patient?.salutation,
                address: record?.patient?.address,
              };
        const patientDataWithAbha = await enrichPatientDataWithAbha(dataToUse, record?.patientId);
        const blob = await pdf(
          <ViewBillPdf
            printSettings={billPrintSettings}
            patientData={patientDataWithAbha}
            profile={profile}
            billData={record}
            isDepositReceipt={true}
            totalAdvanceBalance={
              patientData ? totalAdvanceBalance : patientWalletBalance
            }
            gstIn={advancedSettings?.GSTIN}
            showCreatedBy={advancedSettings?.enableCreatedByInRx}
          />
        ).toBlob();
        printContent(blob, record?.patientId, setStartLoader);
      } else {
      }
    }
  };

  const setStartLoader = () => {
    dispatch(setLoadingStatus(true));
  };

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
        <div
          className="cursor-pointer"
          onClick={async () => {
            await getPatientWalletBalance(record?.patientId);
            setBillData({
              ...record,
              patient: {
                ...record?.patient,
              },
            });
            handleDrawerPreviewBill();
          }}
        >
          <a className="fs-16 fw-500 theme-color">
            {selectedCard === 3 ? record?.billNumber : record?.receiptNumber}
          </a>
          <div className="fs-14 fw-normal text-truncate-twolines">
            {formatDateWithOrdinal(record.date)}
          </div>
        </div>
      ),
    },
    {
      title: "PATIENT DETAILS",
      dataIndex: "patient_details",
      key: "patient_details",
      ellipsis: true,
      render: (text, record) => (
        <div>
          <div className="fs-16 fw-500 patient-name-cell">
            {record?.patient?.name}
          </div>
          <div className="fs-14 fw-normal text-truncate-twolines">
            {record?.patient?.phone}
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
      render: (text, record) => (
        <div className="fs-16 fw-500">
          ₹{parseFloat(record?.totalAmount).toFixed(2)}
        </div>
      ),
    },
    {
      title: "STATUS",
      dataIndex: "transactionType",
      key: "transactionType",
      ellipsis: true,
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
          record?.transactionType
        );

        return <div className={`${className} fs-16 fw-500`}>{displayText}</div>;
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
          <i
            className="icon-More"
            onClick={() => {
              if (!patientData) {
                getPatientWalletBalance(record?.patientId);
              }
            }}
          />
        </Dropdown>
      ),
    },
  ];

  const patientColumns = [
    {
      title: "#",
      dataIndex: "srno",
      key: "srno",
      width: 100,
      render: (text, record, index) => <div className="fs-14">{index + 1}</div>,
    },
    {
      title: "RECEIPT NO & DATE",
      dataIndex: "receipt_no_date",
      key: "receipt_no_date",
      sorter: true,
      width: 300,
      render: (text, record) => (
        <div
          className="cursor-pointer"
          onClick={() => {
            setBillData(record);
            handleDrawerPreviewBill();
          }}
        >
          <a className="fs-14 fw-semibold theme-color">
            {selectedCard === 3 ? record?.billNumber : record?.receiptNumber}
          </a>
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
      sorter: true,
      render: (text, record) => <div> ₹{record?.totalAmount} </div>,
    },
    {
      title: "STATUS",
      dataIndex: "transactionType",
      key: "transactionType",
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
          record?.transactionType
        );

        return <div className={className}>{displayText}</div>;
      },
    },
    {
      title: "Action",
      key: "action",
      width: 150,
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

  // Add Advance Drawer
  const handleAddAdvanceDrawer = () => {
    setAddAdvanceDrawer(!addAdvanceDrawer);
  };

  const getMenuItems = (record) => {
    const items = [
      {
        label: (
          <div onClick={() => onBillingDetailsClick(1, record)}>
            View Receipt
          </div>
        ),
        key: "view_receipt",
      },
      {
        label: (
          <div onClick={() => onBillingDetailsClick(2, record)}>
            Print Receipt
          </div>
        ),
        key: "add_to_3c",
      },
    ];

    if (record?.campaign_sent) {
      return items.filter(
        (item) => item.key !== "edit_campaign" && item.key !== "delete_campaign"
      );
    } else if (record?.edit_status) {
      return items.filter((item) => item.key !== "edit_campaign");
    } else {
      return items;
    }
  };

  const handlePrintWeb = useReactToPrint({
    content: () => printableRef.current,
  });

  // Download Options Modal
  const handleOpenDownloadModal = () => {
    setOpenDownloadModal(!openDownloadModal);
  };

  const handleCheckboxChange = async (checkedValues) => {

    console.log(checkedValues, "checkedValues")
    setSelectedOptions(checkedValues);
    if (checkedValues.length > 0) {
      try {
        const allReceipts = await fetchAllData(checkedValues);
        setDownloadData([...allReceipts]);
      } catch (error) {
        console.error("Error fetching all bills for download:", error);
        message.error("Failed to prepare download data. Please try again.");
      } finally {
        // dispatch(setLoadingStatus(false));
      }
    }
  };

  const fetchAllData = async (selectedStatuses) => {
    // setStartLoader(true);
    let allReceipts = [];
    let currentPage = 1;
    let hasMoreData = true;

    try {
      while (hasMoreData) {
        const params = {
          status: [...selectedStatuses],
          sortBy: sortConfig?.field || "date",
          sortOrder: sortConfig?.order || "desc",
          page: currentPage,
          limit: 100,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          doctorIds: doctorList.map((doctor) => doctor.um_id),
          search: searchQuery || "",
        };

        const response = patientData
          ? await listAdvancedDepositByPatient({
            ...params,
            patientId: patientData?.patient_unique_id,
          })
          : await fetchAdvancedDepositDashboard(params);

        if (response?.receipts?.length > 0) {
          const updatedReceipts = patientData
            ? response.receipts.map((item) => ({
              ...item,
              patient: response.patient,
            }))
            : response.receipts;

          allReceipts = [...allReceipts, ...updatedReceipts];
          currentPage += 1;
          hasMoreData = response.receipts.length === 100;
        } else {
          hasMoreData = false;
        }
      }

      return allReceipts;
    } catch (error) {
      console.error("Error fetching all data:", error);
      message.error("Failed to fetch all data for download");
      return [];
    }
  };

  const handleDownloadAll = async () => {
    const allStatuses = ["Deposit", "Refund", "Debit"];
    const allReceipts = await fetchAllData(allStatuses);
    setDownloadData([...allReceipts]);

    // Ensure handleDownload runs after state is updated
    setTimeout(() => {
      handleDownloadData();
    }, 50);
  };

  const handleDownloadData = () => {
    const element = printableRef.current;
    const options = {
      filename: `billing_${userId || "report"}.pdf`,
      image: { type: "jpeg", quality: 0.8 },
      html2canvas: { scale: 1 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    html2pdf()
      ?.from(element)
      ?.set(options)
      ?.output("blob")
      ?.then((blob) => {
        const url = URL.createObjectURL(blob);
        handleDownload(
          url,
          blob,
          patientData ? patientData.patient_unique_id : userId,
          setStartLoader,
          !patientData
        );
      })
      .catch((err) => {
        console.error("Error generating PDF:", err);
      });
  };

  // Dropdown content
  const menu = (
    <div
      className="download-options-container billing-table-wrapper"
      style={{
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Download All Sections */}
      <Button
        type="link"
        style={{ background: "lightgray" }}
        className="download-all-status ant-btn-all-section mt-3"
        onClick={() => {
          // Direct download all data
          setSelectedOptions(["Deposit", "Refund", "Debit"]);
          handleDownloadAll();
        }}
      >
        Download All Status
      </Button>

      <div className="doctor-select-divider">
        <span>or</span>
      </div>

      <div
        className="custom-doctors-section"
        style={{ margin: "20px 15px", paddingBottom: "15px" }}
      >
        <div className="section-title mb-2 fs-16 section-title-color">
          Select specific status
        </div>
        {/* Checkboxes */}
        <Checkbox.Group
          className="bil"
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "10px",
            gap: "10px",
          }}
          value={selectedOptions} // Bind selected checkboxes to state
          onChange={handleCheckboxChange}
        >
          <Checkbox value="Deposit">
            <span className="color-advance">Advance</span>
          </Checkbox>
          <Checkbox value="Refund">
            <span className="color-refunded">Refunded</span>
          </Checkbox>
          <Checkbox value="Debit">
            <span className="color-debited">Debited</span>
          </Checkbox>
        </Checkbox.Group>

        {/* Download Now Button */}
        <Button
          type="primary"
          className="ant-btn-download"
          style={{
            width: "100%",
            display: `${selectedOptions.length > 0 ? "" : "none"}`,
          }}
          onClick={handleDownloadData}
        >
          Download
          <i class="icon-download fs-18" style={{ padding: "10px 6px" }} />
        </Button>
      </div>
    </div>
  );

  const loadData = async (resetData = true) => {
    // setLoading(true);
    const params = {
      status:
        selectedCard === 1
          ? "Deposit"
          : selectedCard === 2
            ? "Refund"
            : "Debit",
      sortBy: sortConfig?.field || "date",
      sortOrder: sortConfig?.order || "desc",
      page: resetData ? 1 : page,
      limit: 25,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      search: searchQuery || "",
    };
    try {
      const response = await fetchAdvancedDepositDashboard(params);
      setPage(resetData ? 2 : page + 1);
      setHasMore(response.receipts.length >= 25);
      setData((prev) =>
        resetData
          ? response
          : {
            ...response,
            receipts: [...(prev?.receipts || []), ...response.receipts],
          }
      );
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      // setLoading(false);
    }
  };

  const getPatientWalletBalance = async (patientId) => {
    const patientWalletBalanceRes = await fetchPatientWalletBalance(patientId);
    if (patientWalletBalanceRes?.advanceDepositBalance) {
      setPatientWalletBalance(patientWalletBalanceRes?.advanceDepositBalance);
    }
  };

  const patientAdvanceData = async (resetData = true) => {
    // setLoading(true);
    const params = {
      status:
        selectedCard === 1
          ? "Deposit"
          : selectedCard === 2
            ? "Refund"
            : "Debit",
      sortBy: sortConfig?.field || "date",
      sortOrder: sortConfig?.order || "desc",
      page: resetData ? 1 : page,
      limit: 25,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      doctorIds: doctorList.map((doctor) => doctor.um_id),
      search: searchQuery || "",
      patientId: patientData?.patient_unique_id ?? "",
    };
    try {
      const response = await listAdvancedDepositByPatient(params);
      let updatedReceipts = [];
      if (response?.receipts?.length > 0) {
        updatedReceipts = response.receipts.map((item) => ({
          ...item,
          patient: response.patient,
        }));
      }
      setPage(resetData ? 2 : page + 1);
      setHasMore(response.receipts.length >= 25);
      setData((prev) =>
        resetData
          ? { ...response, receipts: updatedReceipts }
          : {
            ...response,
            receipts: [...(prev?.receipts || []), ...updatedReceipts],
          }
      );
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      // setLoading(false);
    }
  };

  // Add a refresh function
  const refreshData = useCallback(() => {
    resetTableScroll();
    if (patientData) {
      patientAdvanceData();
      // Also refresh wallet balance if needed
      getPatientWalletBalance(patientData?.patient_unique_id);
    } else {
      loadData();
    }
  }, [patientData]);

  useEffect(() => {
    resetTableScroll();
    if (patientData) {
      patientAdvanceData();
    } else {
      loadData();
    }
  }, [selectedCard, dateRange, searchQuery, doctorList, sortConfig]);

  // Expose the refresh function via ref
  useImperativeHandle(ref, () => ({
    refreshData: () => {
      if (patientData) {
        patientAdvanceData();
        getPatientWalletBalance(patientData?.patient_unique_id);
      } else {
        loadData();
      }
    },
  }));

  const handleTableScroll = throttle((e) => {
    const { target } = e;
    if (
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <=
      5 &&
      hasMore
    ) {
      loadData(false);
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
    <div>
      <div className="appointment-data advance-table-wrapper">
        <Row className="justify-content-between align-items-center my-2 px-4">
          <Col xl={7} sm={5}>
            <Input
              value={searchQuery}
              placeholder={
                patientData
                  ? "Search by receipt number"
                  : "Search by patient name / phone no / receipt no"
              }
              className="inputheight38"
              prefix={<i className="icon-search" />}
              suffix={
                searchQuery.length > 0 && (
                  <i className="icon-Cross" onClick={() => onSearch("")}></i>
                )
              }
              onChange={(e) => onSearch(e.target.value)}
            />
          </Col>
          <Col xl={4} sm={5}>
            <div className="d-flex flex-row gap-2">
              <div className="massage-date-wrapper">
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
                    ) : (
                      <>
                        {moment(dateRange.startDate).format(showDateFormat)} -{" "}
                        {moment(dateRange.endDate).format(showDateFormat)}
                      </>
                    )}
                  </span>
                  <i className="mx-2 fs-18 icon-calendar"></i>
                </div>
                <RangePicker
                  disabledDate={(current) => disabledDate(current)}
                  open={pickerModal}
                  presets={rangePresets}
                  format={showDateFormat}
                  onChange={onRangeChange}
                  popupClassName="massage-date"
                  className="massage-input"
                  inputReadOnly
                  renderExtraFooter={() => (
                    <div className="d-flex align-items-center justify-content-between py-1">
                      <div>
                        {moment(dateRange.startDate).format(showDateFormat)} -{" "}
                        {moment(dateRange.endDate).format(showDateFormat)}
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
                  onOpenChange={() => { }}
                  value={[
                    dateRange.startDate != dateRange.endDate
                      ? dayjs(
                        moment(dateRange.startDate).format(showDateFormat),
                        showDateFormat
                      )
                      : "",
                    dateRange.startDate != dateRange.endDate
                      ? dayjs(
                        moment(dateRange.endDate).format(showDateFormat),
                        showDateFormat
                      )
                      : "",
                  ]}
                />
              </div>
              <div className="download-modal-container">
                <Dropdown
                  overlay={menu}
                  trigger={["click"]}
                  placement="bottomRight" // Positions the dropdown below the button
                >
                  <div className="d-flex justify-content-between align-items-center billing-download">
                    <i
                      className="icon-download"
                      style={{ cursor: "pointer", color: "#4B4AD5" }}
                    ></i>
                  </div>
                </Dropdown>
              </div>
            </div>
          </Col>
        </Row>
        <Row className="justify-content-between align-items-center px-4">
          <div className="card-container">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`card ${selectedCard === card.id ? "selected" : ""}`}
                onClick={() => setSelectedCard(card.id)}
                style={{
                  borderColor: "transparent",
                  background: `linear-gradient(180deg, ${card.color}4D 0%, ${card.color}00 35%)`,
                }}
              >
                <div
                  className="card-title"
                  style={{ "--dynamic-color": card.fontColor }}
                >
                  {card.title} {"("}
                  {card.count}
                  {")"}
                </div>
                <div className="card-amount">₹{card.amount}</div>
              </div>
            ))}
          </div>

          {
            <div style={{ display: "none" }}>
              <div ref={printableRef}>
                <DownloadBill
                  downloadData={downloadData}
                  parent={"advance"}
                  dateRange={dateRange}
                  isDoctorDashboard={!patientData}
                />
              </div>
            </div>
          }

          <Table
            ref={tableRef}
            className="billing-table px-0"
            columns={patientData ? patientColumns : columns}
            width="100%"
            dataSource={data?.receipts}
            pagination={false}
            scroll={{ y: 500 }}
            onChange={handleSortChange} // Send sorting data to parent
            onScroll={handleTableScroll}
          />
        </Row>
      </div>
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
            billData={billData}
            totalAdvanceBalance={
              patientData ? totalAdvanceBalance : patientWalletBalance
            }
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
            billData={billData}
            onSuccess={refreshData} // Pass the refresh function
          />
        </Drawer>
      )}
    </div>
  );
});

export default React.memo(AdvanceDepositTable);