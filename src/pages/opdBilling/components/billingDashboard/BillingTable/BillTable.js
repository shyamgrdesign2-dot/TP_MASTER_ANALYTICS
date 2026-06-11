import { Drawer, Dropdown, Table, message, Tooltip } from "antd";
import { useState, useCallback } from "react";
import PreviewBill from "../../../PreviewBill";
import RefundBill from "../RefundBill/RefundBill";
import ClearDue from "../ClearDue/ClearDue";
import {
  addBillsToForm3C,
  fetchPatientWalletBalance,
  generateBillToken,
} from "../../../service";

import {
  TRIAL,
  MESSAGE_KEY,
  S_BILLING,
  S_TATVA_PRACTICE,
  PERSISTANT_STORAGE_KEY_BILL_TOKEN,
} from "../../../../../utils/constants";
import { calculateTotalPaidAmount, formatDateWithOrdinal, isEditBillDisabled } from "../../../utils/helper";
import InfoTooltip from "./InfoToolTip/InfoTooltip";
import { browserName, isMobile } from "react-device-detect";
import { throttle } from "lodash";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import CreateBill from "../../createBill/CreateBill";
import config from "../../../../../config";
import { useLocalStorage } from "../../../../../utils/localStorage";
import { EVENTS } from "../../../../../utils/events";
import { sendMessageToParent } from "../../../../../utils/utils";
import { EditBillDeployedDate } from "../../../utils/constants";
import { ASSETS } from "../../../../../assets";
const {
  closeVisit: imgCloseVisit,
  endVisit: visitEnd,
} = ASSETS.images;

const BillTable = ({
  createBillDrawer,
  setCreateBillDrawer,
  data,
  isPatientScreen,
  handleMessageForm3c,
  onSortChange,
  getPatientBills,
  handleRecentBillDrawer,
  loadData,
  hasMore,
  tableRef,
  patientAdvanceData,
  totalAdvanceBalance,
  showHideSubModal,
  billData,
  setBillData,
  selectedCard,
  billType = "opd",
  isPreviewForm3c,
  isReceptionistUser = false,
  advancedSettings = {},
}) => {
  const { profile, servicesList } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const { service_mappings } = planDetails || {};
  const EMR_planDetails = service_mappings?.find(
    (e) => e.service_name === S_TATVA_PRACTICE
  );
  const BILLING_planDetails = service_mappings?.find(
    (e) => e.service_name === S_BILLING
  );
  const [getBillToken, setBillToken] = useLocalStorage(
    PERSISTANT_STORAGE_KEY_BILL_TOKEN
  );
  const [refundBillDrawer, setRefundBillDrawer] = useState(false);
  const [clearDueDrawer, setClearDueDrawer] = useState(false);
  const [previewBillDrawer, setPreviewBillDrawer] = useState(false);
  const [patientWalletBalance, setPatientWalletBalance] = useState(0);
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");

  const handleDrawerPreviewBill = (e, isPreviewScreen = false) => {
    setPreviewBillDrawer(!previewBillDrawer);
    if (previewBillDrawer && !isReceptionist) {
      handleRecentBillDrawer && handleRecentBillDrawer();
    }
    if (isPreviewScreen) {
      setBillData(null);
    }
  };

  const checkBillingPurchased = async () => {
    // if (moment(planDetails?.plan_active_date).diff("2025-07-01", 'days') > 0) {
    if (
      EMR_planDetails?.plan_tier !== TRIAL &&
      BILLING_planDetails?.plan_tier === TRIAL
    ) {
      showHideSubModal();
    } else {
      return true;
    }
    // } else {
    //   return true;
    // }
  };

  const onBillingDetailsClick = async (status, record) => {
    const isPurchased = await checkBillingPurchased();
    if (isPurchased) {
      setBillData(record);
      if (status === 1) {
        handleDrawerPreviewBill();
      } else if (status === 2) {
        handleRefundBillDrawer(record);
      } else if (status === 3) {
        try {
          const payload = { billIds: [record.id] }; // Adjust payload as needed
          const response = await addBillsToForm3C(payload, billType);
          if (response.status === 204) {
            message.open({
              key: MESSAGE_KEY,
              type: "",
              className: "message-appointment",
              content: (
                <div className="d-flex align-items-center">
                  <img src={visitEnd} className="me-3" />
                  <div>
                    <div className="title-common text-start fontroboto">{`${record.billNumber} Added to Form 3C`}</div>
                    {/* <div className='fontroboto text-start fw-normal mt-1'>View completed visits in finished tab.</div> */}
                  </div>
                  <img
                    src={imgCloseVisit}
                    alt="close"
                    className="ms-3"
                    onClick={() => message.destroy()}
                  />
                </div>
              ),
              duration: 5,
            });

            handleMessageForm3c();
          } else {
            console.error("Failed to add bill to Form 3C");
          }
        } catch (error) {
          console.error("Error in adding bill to Form 3C:", error);
        }
      }
    }
  };

  // Drawer form 3c
  const handleRefundBillDrawer = () => {
    setRefundBillDrawer(!refundBillDrawer);
  };

  const handleRefundComplete = useCallback(() => {
    // If getPatientBills exists, call it, otherwise do nothing
    if (getPatientBills) {
      getPatientBills();
    }
    setRefundBillDrawer(false);
  }, [getPatientBills]);

  const handleClearDueDrawer = () => {
    setClearDueDrawer(!clearDueDrawer);
  };

  const handleClearDueComplete = useCallback(() => {
    // If getPatientBills exists, call it, otherwise do nothing
    if (getPatientBills) {
      getPatientBills();
    }
    setClearDueDrawer(false);
  }, [getPatientBills]);

  const getPatientWalletBalance = async (patientId) => {
    const patientWalletBalanceRes = await fetchPatientWalletBalance(patientId);
    if (patientWalletBalanceRes?.advanceDepositBalance) {
      setPatientWalletBalance(patientWalletBalanceRes?.advanceDepositBalance);
    }
  };

  const columns = [
    {
      title: "#",
      dataIndex: "srno",
      key: "srno",
      ellipsis: true,
      width: "6%",
      render: (text, record, index) => <div className="fs-14">{index + 1}</div>,
    },
    {
      title: "BILL NO & DATE",
      dataIndex: "date",
      key: "date",
      width: "16%",
      sorter: true,
      render: (text, record) => (
        <div
          className="cursor-pointer"
          onClick={async () => {
            if (!isPatientScreen) {
              await getPatientWalletBalance(record?.patientId);
            }
            setBillData(record);
            handleDrawerPreviewBill();
          }}
        >
          <div className="fs-14 fw-semibold">
            <a className="theme-color dashboard-table-font-style">
              {record.billNumber}
            </a>
          </div>
          <div className="fs-14 fw-normal text-truncate-twolines">
            {formatDateWithOrdinal(record.date)}
          </div>
        </div>
      ),
    },
    !isPatientScreen
      ? {
          title: "PATIENT DETAILS",
          dataIndex: "patient_details",
          key: "patient_details",
          ellipsis: true,
          width: "21%",
          render: (text, record) => (
            <div>
              <div className="dashboard-table-font-style patient-name-cell">
                {record?.patient?.name}
              </div>
              <div className="fs-14 fw-normal text-truncate-twolines">
                {record?.patient?.phone}
              </div>
            </div>
          ),
        }
      : undefined,
    {
      title: "Billed",
      dataIndex: "payableAmount",
      key: "payableAmount",
      ellipsis: true,
      width: "10%",
      sorter: true,
      onFilter: (value, record) => record.send_on.startsWith(value),
      render: (text, record) => (
        <div className="dashboard-table-font-style">
          ₹{record.payableAmount}
        </div>
      ),
    },
    {
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paidAmount",
      width: "10%",
      ellipsis: true,
      sorter: true,
      render: (text, record) => {
        const totalPaidAmount = calculateTotalPaidAmount(record);
        return (
          <div className="dashboard-table-font-style">
            {" "}
            ₹{totalPaidAmount.toFixed(2)}{" "}
          </div>
        );
      },
    },
    selectedCard !== 4 ?
    {
      title: "Due",
      dataIndex: "dueAmount",
      key: "dueAmount",
      width: "10%",
      ellipsis: true,
      sorter: true,
      render: (text, record) => (
        <div className="dashboard-table-font-style"> ₹{record.dueAmount} </div>
      ),
    } : undefined,
    {
      title: "Refund",
      dataIndex: "refundedAmount",
      key: "refundedAmount",
      width: "10%",
      ellipsis: true,
      sorter: true,
      render: (text, record) => (
        <div className="dashboard-table-font-style">
          {" "}
          {record?.refundedAmount ? `₹ ${record.refundedAmount}` : "-"}{" "}
        </div>
      ),
    },
    // {
    //   title: "STATUS",
    //   width: "21%",
    //   dataIndex: "paymentStatus",
    //   key: "paymentStatus",
    //   ellipsis: true,
    //   render: (text, record) => {
    //     // Determine the class name and display value based on the status
    //     const getStatusDetails = (status) => {
    //       switch (status.toLowerCase()) {
    //         case "fullypaid":
    //           return {
    //             className: "status-paid-fully",
    //             displayText: "Paid Fully",
    //           };
    //         case "due":
    //           return {
    //             className: "status-due",
    //             displayText: `Due: ₹${parseFloat(record.dueAmount).toFixed(2)}`,
    //           };
    //         case "refunded":
    //           return {
    //             className: "status-refunded",
    //             displayText: `Refunded ₹${parseFloat(record.paidAmount).toFixed(
    //               2
    //             )}`,
    //           };
    //         case "carriedforward":
    //           return {
    //             className: "status-carriedforrward",
    //             displayText: `Due ₹${parseFloat(record.dueAmount).toFixed(2)}`,
    //           };
    //         default:
    //           return {
    //             className: "status-due",
    //             displayText: `Due: ₹${parseFloat(record.dueAmount).toFixed(2)}`,
    //           };
    //       }
    //     };

    //     // Get status details
    //     const { className, displayText } = getStatusDetails(
    //       record.paymentStatus
    //     );

    //     return (
    //       <div className="d-flex">
    //         <div className={className}>{displayText}</div>
    //         {("CarriedForward" === record.paymentStatus ||
    //           ("Refunded" === record.paymentStatus && record.notes)) && (
    //           <InfoTooltip
    //             type={record.paymentStatus}
    //             amount={
    //               record.paymentStatus === "Refunded"
    //                 ? record.paidAmount
    //                 : record.dueAmount
    //             }
    //             notes={record.notes}
    //             billNo={record.nextBillNumber}
    //           />
    //         )}
    //       </div>
    //     );
    //   },
    // },
    {
      title: "Action",
      key: "action",
      width: "9%",
      render: (text, record) => {
        // Check if edit button should be disabled
        const { isEditDisabled, hasPaidDues, hasRefundedAmount } = isEditBillDisabled(record);
        
        // Check access control for reception users - only for OPD bills, default to Allow if setting doesn't exist
        const isEditAccessRestricted = (isReceptionistUser || isReceptionist) && 
          billType === "opd" &&
          advancedSettings?.editBillAccessControlForReceptionist === false;

        return (
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
                }${
                  record?.admissionId
                    ? `&admissionId=${record?.admissionId}`
                    : ""
                }&patientViewBill=true`;
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
            {!isEditAccessRestricted && (
              <Tooltip
                title={
                  isEditDisabled
                    ? hasRefundedAmount && hasPaidDues
                      ? "A refund and due clearance have been processed for this bill, so editing isn’t allowed."
                      : hasRefundedAmount
                      ? "A refund has already been issued for this bill, so editing isn’t allowed."
                      : hasPaidDues
                      ? "The full due amount or some of the due amount has been cleared for this bill, so editing isn’t allowed."
                      : "Cannot edit bill"
                    : ""
                }
              >
                <span>
                  <button
                    className="btn p-0"
                    disabled={isEditDisabled}
                    onClick={() => {
                      if (!isEditDisabled) {
                        handleEditBillDrawer();
                        setBillData(record);
                      }
                    }}
                    style={{
                      opacity: isEditDisabled ? 0.5 : 1,
                      border: "none",
                    }}
                  >
                    <i className="icon-Edit"></i>
                  </button>
                </span>
              </Tooltip>
            )}
            <Dropdown
              className="cursor-pointer"
              menu={{
                items: getMenuItems(record),
              }}
              trigger={["click"]}
              onClick={() => {
                if (!isPatientScreen) {
                  getPatientWalletBalance(record?.patientId);
                }
              }}
            >
              <i className="icon-More iconrotate270"></i>
            </Dropdown>
          </div>
        );
      },
    },
  ]?.filter((item) => item);

  const handleTableChange = (pagination, filters, sorter) => {
    if (sorter.order) {
      const order = sorter.order === "ascend" ? "asc" : "desc"; // Convert to API format
      const field = sorter.field; // Get sorted field

      // Pass sorting parameters to parent
      onSortChange(field, order);
    }
  };

  const getMenuItems = (record) => {
    const items = [
      {
        label: (
          <div onClick={() => onBillingDetailsClick(1, record)}>View Bill</div>
        ),
        key: "view_bill",
      },
    ];

    // Conditionally add "Add to Form 3C" if isForm3C is false
    if (!record.isForm3C && record.paymentStatus !== "Refunded") {
      items.push({
        label: (
          <div onClick={() => onBillingDetailsClick(3, record)}>
            Add to Form 3C
          </div>
        ),
        key: "add_to_3c",
      });
    }

    // Conditionally add "Refund bill" if not refunded
    if (record.paymentStatus !== "Refunded") {
      items.push({
        label: (
          <div onClick={() => onBillingDetailsClick(2, record)}>
            Refund Bill
          </div>
        ),
        key: "refund_bill",
      });
    }

    // Conditionally add "Clear Due" if (due amount & not refunded)
    if (
      billType !== "ipd" &&
      record.dueAmount &&
      parseFloat(record.dueAmount) > 0 &&
      record.paymentStatus !== "Refunded"
    ) {
      items.push({
        label: (
          <div
            onClick={async () => {
              const isPurchased = await checkBillingPurchased();
              if (isPurchased) {
                if (!isPatientScreen) {
                  await getPatientWalletBalance(record?.patientId);
                }
                setBillData(record);
                handleClearDueDrawer();
              }
            }}
          >
            Clear Due
          </div>
        ),
        key: "clear_due",
      });
    }

    return items;
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

  const handleEditBillDrawer = useCallback((isPreviewScreen = false) => {
    setCreateBillDrawer(!createBillDrawer);
    if (billData && Object.keys(billData).length > 0 && !isPreviewScreen) {
      setBillData(null);
    }
  }, [createBillDrawer]);

  return (
    <>
      <Table
        ref={tableRef}
        className="billing-table px-0"
        style={{ position: "relative", overflow: "hidden" }}
        columns={columns}
        width="100%"
        dataSource={data}
        pagination={false}
        scroll={{ y: 500 }}
        onChange={handleTableChange} // Send sorting data to parent
        onScroll={handleTableScroll}
      />
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
            billData={billData}
            patientAdvanceData={patientAdvanceData}
            handleMessageForm3c={handleMessageForm3c}
            getPatientBills={getPatientBills}
            totalAdvanceBalance={
              isPatientScreen ? totalAdvanceBalance : patientWalletBalance
            }
            handleEditBillDrawer={handleEditBillDrawer}
            isPreviewForm3c={isPreviewForm3c}
          />
        </Drawer>
      )}

      {refundBillDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleRefundBillDrawer}
          open={refundBillDrawer}
          width={isMobile ? "80%" : "60%"} // Adjust width based on device type
        >
          <RefundBill
            handleRefundBillDrawer={handleRefundBillDrawer}
            billData={billData}
            handleMessageForm3c={handleMessageForm3c}
            getPatientBills={getPatientBills}
            onRefundSuccess={handleRefundComplete}
            patientAdvanceData={patientAdvanceData}
          />
        </Drawer>
      )}

      {clearDueDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleClearDueDrawer}
          open={clearDueDrawer}
          width={isMobile ? "80%" : "60%"}
        >
          <ClearDue
            handleClearDueDrawer={handleClearDueDrawer}
            billData={billData}
            handleMessageForm3c={handleMessageForm3c}
            getPatientBills={getPatientBills}
            onClearDueSuccess={handleClearDueComplete}
            patientAdvanceData={patientAdvanceData}
          />
        </Drawer>
      )}
    </>
  );
};

export default BillTable;
