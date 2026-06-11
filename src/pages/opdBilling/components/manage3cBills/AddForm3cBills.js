import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Button,
  Drawer,
  Popover,
  Steps,
  Radio,
  DatePicker,
  TimePicker,
  Select,
  Checkbox,
  Input,
  Spin,
  message,
  Table,
} from "antd";
import { Col, Container, Row } from "react-bootstrap";
import { v4 as uuidv4 } from "uuid";
import "./AddForm3cBills.scss";
import "../../../../components/common/dateRangePill.scss";

import locale from "antd/es/date-picker/locale/en_US";

import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import dayjs from "dayjs";
import MenuDivider from "antd/es/menu/MenuDivider";

import { addBillsToForm3C, fetchBillingDashboard } from "../../service";
import { formatDateWithOrdinal } from "../../utils/helper";
import InfoTooltip from "../billingDashboard/BillingTable/InfoToolTip/InfoTooltip";
import { throttle } from "lodash";
import { getClinic, trackEvent } from "../../../../utils/utils";

const { RangePicker } = DatePicker;
const dateFormat = "YYYY-MM-DD";
const showDateFormat = "DD MMM YYYY";

const dateTimeFormat = "YYYY-MM-DD HH:mm:ss";
const dateFormat1 = "YYYY-MM-DD";
const timeFormat1 = "HH:mm:ss";

const showDateTimeFormat = "DD MMM YYYY hh:mm A";
const showDateFormat1 = "DD MMM YYYY";
const showTimeFormat1 = "hh:mm A";

const SELECT_AFTER = [
  {
    value: "Year",
    label: "Year",
  },
  {
    value: "Month",
    label: "Month",
  },
];

const GENDER = ["Male", "Female", "Other"];

function AddForm3cBills({ handleAddForm3cDrawer, setForm3cData, onSuccess, billType = "opd" }) {
  const {
    loading,
    userCreditObj,
    categoryList,
    allTemplateList,
    templateLoading,
    doctorList,
    patientCount,
  } = useSelector((state) => state.bulkMessages);
  const { profile, userId } = useSelector((state) => state.doctors);
  const dispatch = useDispatch();

  const navigate = useNavigate();
  const { state } = useLocation();
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);

  const [dateRange, setDateRange] = useState({
    startDate: moment().format(dateFormat),
    endDate: moment().format(dateFormat),
  });
  const [dateStatus, setDateStatus] = useState(1);
  const [pageNo, setPageNo] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]); // Store selected row objects
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerModal, setPickerModal] = useState(false);
  const [data, setData] = useState(null);
  const [sortConfig, setSortConfig] = useState({ field: null, order: null });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const tableRef = useRef(null);

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
      } else if (
        dayjs().add(-3, "M").format(dateFormat) ==
          moment(dateStrings[0], showDateFormat).format(dateFormat) &&
        dayjs().format(dateFormat) ==
          moment(dateStrings[1], showDateFormat).format(dateFormat)
      ) {
        setDateStatus(4);
      } else if (
        dayjs().add(-6, "M").format(dateFormat) ==
          moment(dateStrings[0], showDateFormat).format(dateFormat) &&
        dayjs().format(dateFormat) ==
          moment(dateStrings[1], showDateFormat).format(dateFormat)
      ) {
        setDateStatus(5);
      } else if (
        dayjs().add(-1, "y").format(dateFormat) ==
          moment(dateStrings[0], showDateFormat).format(dateFormat) &&
        dayjs().format(dateFormat) ==
          moment(dateStrings[1], showDateFormat).format(dateFormat)
      ) {
        setDateStatus(6);
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

  const disabledDate = (current) => {
    return current && current > dayjs().endOf("day");
  };

  const disabledTime = (current) => {
    if (!current) return {};
    const now = moment();

    // If the selected date is today, disable past hours and minutes
    if (current.isSame(now, "day")) {
      return {
        disabledHours: () => [...Array(now.hour()).keys()], // Disable past hours
        disabledMinutes: (selectedHour) =>
          selectedHour === now.hour() ? [...Array(now.minute()).keys()] : [], // Disable past minutes for the current hour
      };
    }
    return {};
  };

  // Back Model
  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(!isBackModalOpen);
  }, [isBackModalOpen]);

  // Handle individual row selection
  const onSelectChange = (selectedKeys, selectedRows) => {
    setSelectedRowKeys(selectedKeys);
    setSelectedRows(selectedRows);
  };

  // Handle "Select All" checkbox in header
  const onSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(data.bills);
    } else {
      setSelectedRows([]);
    }
  };

  const columns = [
    {
      key: "action",
      width: 30,
    },
    {
      title: "#",
      dataIndex: "srno",
      key: "srno",
      ellipsis: true,
      width: 50,
      render: (text, record, index) => <div className="fs-14">{index + 1}</div>,
    },
    {
      title: "BILL NO & DATE",
      dataIndex: "date",
      key: "date",
      width: 200,
      sorter: true,
      render: (text, record) => (
        <div className="cursor-pointer" onClick={async () => {}}>
          <div className="fs-14 fw-semibold theme-color">
            {record.billNumber}
          </div>
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
        <div className="cursor-pointer" onClick={async () => {}}>
          <div className="fs-14 patient-name-cell">{record.patient.name}</div>
          <div className="fs-14 fw-normal text-truncate-twolines">
            {record.patient.phone}
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
      render: (text, record) => <div> ₹{record.payableAmount} </div>,
    },
    {
      title: "PAID AMOUNT",
      dataIndex: "paidAmount",
      key: "paidAmount",
      ellipsis: true,
      sorter: true,
      render: (text, record) => <div> ₹{record.paidAmount} </div>,
    },
    {
      title: "STATUS",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      ellipsis: true,
      render: (text, record) => {
        // Determine the class name and display value based on the status
        const getStatusDetails = (status) => {
          switch (status?.toLowerCase()) {
            case "fullypaid":
              return {
                className: "status-paid-fully",
                displayText: "Paid Fully",
              };
            case "due":
              return {
                className: "status-due",
                displayText: `Due`,
              };
            case "carriedforward":
              return {
                className: "status-carriedforrward",
                displayText: `Due`,
              };
            default:
              return {
                className: "status-paid-fully",
                displayText: `Paid Fully`,
              };
          }
        };

        // Get status details
        const { className, displayText } = getStatusDetails(
          record.paymentStatus
        );

        return (
          <div className="d-flex">
            <div className={className}>{displayText}</div>
            {("CarriedForward" === record.paymentStatus ||
              ("Refunded" === record.paymentStatus && record.notes)) && (
              <InfoTooltip
                type={record.paymentStatus}
                amount={
                  record.paymentStatus === "Refunded"
                    ? record.paidAmount
                    : record.dueAmount
                }
                notes={record.notes}
                billNo={record.nextBillNumber}
              />
            )}
          </div>
        );
      },
    },
  ];

  const loadData = async (resetData = true) => {
    // setLoading(true);
    const params = {
      sortBy: sortConfig?.field || "date",
      sortOrder: sortConfig?.order || "desc",
      page: resetData ? 1 : page,
      limit: 25,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      doctorIds: [userId],
      isForm3C: false,
      search: searchQuery || "",
    };
    try {
      const response = await fetchBillingDashboard(params);
      const bills = response?.bills?.filter(
        (item) => item.paymentStatus !== "Refunded" && item.isForm3C !== true
      );
      setPage(resetData ? 2 : page + 1);
      setHasMore(bills.length >= 25);
      setData((prev) => (resetData ? bills : [...(prev || []), ...bills]));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    resetTableScroll();
    loadData();
  }, [dateRange, searchQuery, sortConfig]);

  const handleAddForm3cBill = async () => {
    try {
      const payload = {
        billIds: [...selectedRowKeys],
      };
      const response = await addBillsToForm3C(payload, billType);

      if (response.status === 200 || response.status === 204) {
        // Update the count in parent
        setForm3cData(selectedRowKeys.length);
        // Call the success handler which will refresh tables and close drawer
        onSuccess && onSuccess();
      } else {
        throw new Error("Failed to add bills to Form 3C");
      }
    } catch (error) {
      message.error(error.message || "Failed to add bills to Form 3C");
    }
  };

  const handleBackAddForm3CDrawer = () => {
    const clinic = getClinic();
    trackEvent("TP_billing_addnewbillstoform3C", {
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      city: clinic?.hm_city,
      pincode: clinic?.hm_pincode,
    });
    setForm3cData(0);
    handleAddForm3cDrawer();
  };

  const handleTableChange = (pagination, filters, sorter) => {
    if (sorter.order) {
      const order = sorter.order === "ascend" ? "asc" : "desc"; // Convert to API format
      const field = sorter.field; // Get sorted field

      // Pass sorting parameters to parent
      handleSortChange(field, order);
    }
  };

  const handleSortChange = (field, order) => {
    setSortConfig({ field, order }); // Update state
  };

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
    const tableBody = document.querySelector(
      ".add-form3c-table .ant-table-body"
    );
    if (tableBody) {
      tableBody.scrollTo({
        top: 0,
        behavior: "smooth", // Optional: adds smooth scrolling
      });
    }
  };

  return (
    <div className="manage-3c-bills-wrapper">
      <div className="modalCard-header align-items-center d-flex justify-content-between">
        <div className="align-items-center d-flex">
          <div className="border-end h-100 text-center">
            <Button
              className="btn btn-delete-prescription px-3 h-100"
              onClick={handleBackAddForm3CDrawer}
            >
              <i className="icon-right lh-lg"></i>
            </Button>
          </div>
          <div className="w-100 px-20 fs-16 fw-semibold">
            Add New Bills to Form 3C
          </div>
        </div>
        <div className="align-items-center d-flex gap-4 me-4">
          <Button
            className="btn-create-bill"
            disabled={!selectedRowKeys.length}
            onClick={handleAddForm3cBill}
          >
            <span>{"Add to Form 3C"}</span>
          </Button>
        </div>
      </div>
      <div
        className="bg-body overflow-y-auto pt-5 pb-4"
        style={{ height: "calc(100vh - 60px)" }}
      >
        <div className="d-flex justify-content-between align-items-center my-2 px-4">
          <div>
            <Input
              value={searchQuery}
              placeholder="Search by patient name / phone no / bill no"
              className="inputheight38 search-bar"
              prefix={<i className="icon-search" />}
              suffix={
                searchQuery.length > 0 && (
                  <i className="icon-Cross" onClick={() => onSearch("")}></i>
                )
              }
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <div>
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
                  onOpenChange={() => {}}
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
            </div>
          </div>
        </div>
        <div className="justify-content-between align-items-center px-4 my-2 billing-table-wrapper">
          <Table
            ref={tableRef}
            rowKey="id"
            rowSelection={{
              selectedRowKeys: selectedRows.map((row) => row.id),
              onChange: onSelectChange,
            }}
            className="add-form3c-table px-0"
            columns={columns}
            width="100%"
            scroll={{ y: 600 }}
            dataSource={data}
            pagination={false}
            onChange={handleTableChange}
            onScroll={handleTableScroll}
          />
        </div>
      </div>
    </div>
  );
}

export default AddForm3cBills;
