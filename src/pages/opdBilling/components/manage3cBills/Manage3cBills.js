import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
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
import "./Manage3cBills.scss";
import "../../../../components/common/dateRangePill.scss";
import { useReactToPrint } from "react-to-print";
import {
  getClinic,
  handlePrintClick,
  sendMessageToParent,
  trackEvent,
} from "../../../../utils/utils.js";

import locale from "antd/es/date-picker/locale/en_US";

import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import dayjs from "dayjs";
// import MenuDivider from "antd/es/menu/MenuDivider";
import Form3cPrint from "./Form3cPrint.js";
import { MESSAGE_KEY, PERSISTANT_STORAGE_KEY_BILL_TOKEN } from "../../../../utils/constants.js";

import {
  fetchBillingDashboard,
  fetchPatientWalletBalance,
  generateBillToken,
} from "../../service.js";
import {
  calculateTotalPaidAmount,
  formatDateWithOrdinal,
  handleDownload,
  printContent,
} from "../../utils/helper.js";
import InfoTooltip from "../billingDashboard/BillingTable/InfoToolTip/InfoTooltip.js";
import PreviewBill from "../../PreviewBill.js";
import html2pdf from "html2pdf.js";
import { setLoadingStatus } from "../../../../redux/uploadDocSlice.js";
import { throttle } from "lodash";
import config from "../../../../config.js";
import { browserName } from "react-device-detect";
import { EVENTS } from "../../../../utils/events.js";
import { useLocalStorage } from "../../../../utils/localStorage.js";
import { ASSETS } from "../../../../assets";
const {
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

const { RangePicker } = DatePicker;
const dateFormat = "YYYY-MM-DD";
const showDateFormat = "DD MMM YYYY";

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

const Manage3cBills = forwardRef(
  ({ handleForm3cBill, handleAddForm3cDrawer, form3cData, handleEditBillDrawer, setEditBillData }, ref) => {
    const [getBillToken, setBillToken] = useLocalStorage(
      PERSISTANT_STORAGE_KEY_BILL_TOKEN
    );
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
    const [data, setData] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]); // Store selected row objects
    const [pageNo, setPageNo] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [pickerModal, setPickerModal] = useState(false);
    const printableRef = useRef(null);
    const [tabLoader, setTabLoader] = useState(false);
    const [sortConfig, setSortConfig] = useState({ field: null, order: null });
    const [previewBillDrawer, setPreviewBillDrawer] = useState(false);
    const [billData, setBillData] = useState(null);
    const [patientWalletBalance, setPatientWalletBalance] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const tableRef = useRef(null);

    const handleDrawerPreviewBill = (isPreviewScreen = false) => {
      setPreviewBillDrawer(!previewBillDrawer);
      if (isPreviewScreen) {
        setEditBillData(null);
      }
    };

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

    const handlePrintWeb = useReactToPrint({
      content: () => printableRef.current,
    });

    const getPatientWalletBalance = async (patientId) => {
      const patientWalletBalanceRes = await fetchPatientWalletBalance(
        patientId
      );
      if (patientWalletBalanceRes?.advanceDepositBalance) {
        setPatientWalletBalance(patientWalletBalanceRes?.advanceDepositBalance);
      }
    };

    const handleForm3cPrint = () => {
      handlePrintClick(
        printableRef.current,
        setTabLoader,
        handlePrintWeb,
        "DownloadBill"
      );
    };

    const handlePrintData = () => {
      const clinic = getClinic();
      trackEvent("TP_billing_printform3C", {
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        city: clinic?.hm_city,
        pincode: clinic?.hm_pincode,
      });
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
          printContent(blob, userId, setStartLoader, true);
        })
        .catch((err) => {
          console.error("Error generating PDF:", err);
        });
    };

    const setStartLoader = () => {
      dispatch(setLoadingStatus(true));
    };

    // Handle individual row selection
    const onSelectChange = (selectedKeys, selectedRows) => {
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

    useEffect(() => {
      if (form3cData) {
        message.open({
          key: MESSAGE_KEY,
          type: "",
          className: "message-appointment",
          content: (
            <div className="d-flex align-items-center">
              <img src={visitEnd} className="me-3" />
              <div>
                <div className="title-common text-start fontroboto">{`${form3cData} Bills added Form 3C.`}</div>
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
      }
    }, [form3cData]);

    const rangePresets = [
      {
        label: (
          <div className={`${dateStatus === 1 ? "active" : ""}`}>Today</div>
        ),
        value: [dayjs(), dayjs().endOf("day")],
      },
      {
        label: (
          <div className={`${dateStatus === 2 ? "active" : ""}`}>
            Last 7 days
          </div>
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

    // Back Model
    const showHideBackModal = useCallback(() => {
      setIsBackModalOpen(!isBackModalOpen);
    }, [isBackModalOpen]);

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
        render: (text, record, index) => (
          <div className="fs-14">{index + 1}</div>
        ),
      },
      {
        title: "BILL NO & DATE",
        dataIndex: "date",
        key: "date",
        width: 200,
        sorter: true,
        render: (text, record) => (
          <div
            className="cursor-pointer"
            onClick={async () => {
              await getPatientWalletBalance(record?.patientId);
              setBillData(record);
              setEditBillData(record);
              handleDrawerPreviewBill();
            }}
          >
            <div className="cursor-pointer " onClick={async () => {}}>
              <a className="theme-color">{record.billNumber}</a>
              <div className="fs-14 fw-normal text-truncate-twolines">
                {formatDateWithOrdinal(record.date)}
              </div>
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
        dataIndex: "payableAmount",
        key: "payableAmount",
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
        render: (text, record) => {
          const totalPaidAmount = calculateTotalPaidAmount(record);
          return <div>₹{totalPaidAmount.toFixed(2)} </div>;
        },
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
      {
        title: "Action",
        key: "action",
        width: "9%",
        render: (text, record) => (
          <div
            className="d-flex align-items-center justify-content-center gap-2"
            style={{ marginLeft: "-60px" }}
          >
            <button
              className="btn p-0 ms-3"
              onClick={async () => {
                let token = getBillToken();
                if (!token) {
                  token = await generateBillToken();
                  setBillToken(token);
                }
                const billLink = `${
                  config.doctor_portal_url
                }/opd-bill?token=${token}${
                  record?.billNumber ? `&billNumber=${record?.billNumber}` : ""
                }${record?.patientId ? `&patientId=${record?.patientId}` : ""}${
                  record?.doctorId ? `&doctorId=${record?.doctorId}` : ""
                }${record?.admissionId ? `&admissionId=${record?.admissionId}` : ""}&patientViewBill=true`;
                if (
                  browserName == "Chrome WebView" ||
                  browserName == "WebKit"
                ) {
                  sendMessageToParent(EVENTS.PRINT, { url: billLink });
                } else {
                  window.open(billLink, "_blank");
                }
              }}
            >
              <i className="icon-Print"></i>
            </button>
          </div>
        ),
      },
    ];

    const loadData = async (resetData = true) => {
      const params = {
        status: ["FullyPaid", "Due", "CarriedForward"],
        sortBy: sortConfig?.field || "date",
        sortOrder: sortConfig?.order || "desc",
        page: resetData ? 1 : page,
        limit: 25,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        doctorIds: [userId],
        isForm3C: true,
        search: searchQuery || "",
      };
      try {
        const response = await fetchBillingDashboard(params);
        setPage(resetData ? 2 : page + 1);
        setHasMore(response.bills.length >= 25);
        setData((prev) =>
          resetData
            ? response
            : {
                ...response,
                bills: [...(prev?.bills || []), ...response.bills],
              }
        );
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    // Expose the refresh method via ref
    useImperativeHandle(ref, () => ({
      refreshData: () => {
        loadData();
      },
    }));

    useEffect(() => {
      resetTableScroll();
      loadData();
    }, [dateRange, searchQuery, sortConfig, form3cData]);

    const handleTableScroll = throttle((e) => {
      const { target } = e;
      if (
        Math.abs(
          target.scrollHeight - target.scrollTop - target.clientHeight
        ) <= 5 &&
        hasMore
      ) {
        loadData(false);
      }
    }, 500);

    const resetTableScroll = () => {
      // Using document.querySelector with a more specific selector
      const tableBody = document.querySelector(".bills-table .ant-table-body");
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
                onClick={handleForm3cBill}
              >
                <i className="icon-right lh-lg"></i>
              </Button>
            </div>
            <div className="w-100 px-20 fs-16 fw-semibold">Form 3C Bill</div>
          </div>
          <div className="align-items-center d-flex gap-4 me-4">
            <Button className="btn-manage-bill" onClick={handleAddForm3cDrawer}>
              <span>{"+"}</span>
              <span>{"Add New Bills to 3C"}</span>
            </Button>
            <Button
              className={`btn-create-bill ${
                selectedRows?.length === 0 ? "disabled" : ""
              } `}
              onClick={handlePrintData}
              disabled={selectedRows?.length === 0}
            >
              <span>{"Print Form 3C"}</span>
            </Button>
          </div>
        </div>
        <div
          className="bg-body overflow-y-auto pt-1 pb-4"
          style={{ height: "calc(100vh - 60px)" }}
        >
          <div className="d-flex justify-content-between align-items-center my-4 px-4">
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

          {
            <div style={{ display: "none" }}>
              <div ref={printableRef}>
                <Form3cPrint rows={selectedRows} />
              </div>
            </div>
          }
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
                handleCreateBillDrawer={handleDrawerPreviewBill}
                isPreviewFromTable={true}
                billData={billData}
                totalAdvanceBalance={patientWalletBalance}
                handleEditBillDrawer={() => handleEditBillDrawer(null, true)}
                isPreviewForm3c={true}
              />
            </Drawer>
          )}
          <div className="justify-content-between align-items-center px-4 my-2 billing-table-wrapper">
            <Table
              ref={tableRef}
              rowKey="id"
              rowSelection={{
                selectedRowKeys: selectedRows.map((row) => row.id),
                onChange: onSelectChange,
              }}
              className="bills-table px-0"
              columns={columns}
              width="100%"
              scroll={{ y: 600 }}
              dataSource={data?.bills}
              pagination={false}
              onChange={handleTableChange}
              onScroll={handleTableScroll}
            />
          </div>
        </div>
      </div>
    );
  }
);

export default React.memo(Manage3cBills);
