import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Table,
  Tooltip,
  AutoComplete,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import moment from "moment";
import dayjs from "dayjs";
import "./RefundBill.scss";

import { useSelector, useDispatch } from "react-redux";
import { processBillRefund } from "../../../service";

import { MESSAGE_KEY } from "../../../../../utils/constants";
import { PaymentOptions } from "../../../utils/constants";
import {
  formatDateWithOrdinal,
  calculateTotalPaidAmount,
} from "../../../utils/helper";
import RefIdPopup from "../../refIdPopup/RefIdPopup";
import {
  getClinic,
  onlyDecimalFormat,
  trackEvent,
} from "../../../../../utils/utils";
import { ASSETS } from "../../../../../assets";
const {
  closeVisit: imgCloseVisit,
  endVisit: visitEnd,
} = ASSETS.images;

const dateFormat = "YYYY-MM-DD";
const showDateFormat = "DD MMM, YY";
const { TextArea } = Input;
const MAX_REMARKS_LENGTH = 400;

function RefundBill({
  handleRefundBillDrawer,
  billData,
  handleMessageForm3c,
  getPatientBills,
  onRefundSuccess,
  patientAdvanceData,
  billType = "opd",
}) {
  const totalPaidAmount = calculateTotalPaidAmount(billData);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef([]);
  const dispatch = useDispatch();
  const [dateString, setDateString] = useState(null);
  const [shouldShowRefIdPopup, setShowRefIdPopup] = useState(-1);
  const [totalRefundAmount, setTotalRefundAmount] = useState(0);
  const [paymentModes, setPaymentModes] = useState([
    { paymentMode: "Cash", amount: totalPaidAmount, refId: "" },
  ]);
  const [isPaymentModeItemMissing, setPaymentModeItemMissing] = useState(false);
  const usedPaymentModes = paymentModes.map((p) => p.paymentMode);
  const paymentMethodsRef = useRef(null);
  const { planDetails } = useSelector((state) => state.subscription);
  const { profile } = useSelector((state) => state.doctors);

  const filteredOptions = PaymentOptions.filter(
    (option) => !usedPaymentModes.includes(option.value)
  );
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const [remarks, setRemarks] = useState("");

  const handleModeChange = (value, index, type) => {
    const updatedModes = [...paymentModes];
    updatedModes[index][type] = value;
    setPaymentModes(updatedModes);
  };

  const handleAmountChange = (value, index) => {
    if (value <= 1000000000) {
      const updatedModes = [...paymentModes];
      updatedModes[index].amount = onlyDecimalFormat(value);
      setPaymentModes(updatedModes);
    }
  };

  // Calculate total refund whenever paymentModes change
  useEffect(() => {
    const total = paymentModes.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0
    );
    setTotalRefundAmount(total);
  }, [paymentModes]);

  const handleRefundBill = async () => {
    const updatedPaymentModes = paymentModes?.filter(
      (item) => item.paymentMode && item.amount > 0
    );
    if (updatedPaymentModes?.length !== paymentModes?.length) {
      setPaymentModeItemMissing(true);
      return;
    }

    try {
      const payload = {
        billId: billData.id,
        paymentModes: [...paymentModes],
        notes: remarks?.trim() || "",
      };
      const response = await processBillRefund(payload, billType);
      if (response.status === 204) {
        const isAdvanceDeposit = !!paymentModes?.find(
          (item) => item.paymentMode === "Advance Deposit"
        );
        if (isAdvanceDeposit && patientAdvanceData) {
          patientAdvanceData();
        }
        message.open({
          key: MESSAGE_KEY,
          type: "",
          className: "message-appointment",
          content: (
            <div className="d-flex align-items-center">
              <img src={visitEnd} className="me-3" alt="visit-end" />
              <div>
                <div className="title-common text-start fontroboto">{`${totalRefundAmount} is refunded`}</div>
              </div>
              <img
                src={imgCloseVisit}
                className="ms-3"
                onClick={() => message.destroy()}
                alt="close"
              />
            </div>
          ),
          duration: 5,
        });
        handleRefundBillDrawer();
        getPatientBills && getPatientBills();
        handleMessageForm3c && handleMessageForm3c();
        onRefundSuccess && onRefundSuccess();
      } else {
        throw new Error(response.error || "Failed to refund the bill.");
      }
    } catch (error) {
      message.error(error.message || "Failed to refund the bill");
    }
  };

  const addPaymentMode = () => {
    const clinic = getClinic();
    const newPaymentModes = [
      ...paymentModes,
      { paymentMode: filteredOptions[0]?.value, amount: "", refId: "" },
    ];
    setPaymentModes(newPaymentModes);
    const receptionistId = urlParams.get("receptionistId");
    const receptionistName = urlParams.get("receptionistName");
    trackEvent("TP_Billing_AddPaymentMode", {
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      city: clinic?.hm_city,
      pincode: clinic?.hm_pincode,
      subscriptionStatus: planDetails?.currentPlanStatus,
      paymentModes: JSON.stringify(newPaymentModes),
      receptionistId: receptionistId,
      receptionistName: receptionistName,
    });

    // Add scroll behavior
    setTimeout(() => {
      if (paymentMethodsRef.current) {
        paymentMethodsRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    }, 100);
  };

  const removePaymentMode = (index) => {
    const updatedModes = paymentModes.filter((_, i) => i !== index);
    setPaymentModes(updatedModes);
  };

  const handleRemarksChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_REMARKS_LENGTH) {
      setRemarks(value);
    }
  };

  const columns = [
    {
      title: "BILL NO & DATE",
      dataIndex: "bill_num_date",
      key: "bill_num_date",
      render: (text, record) => (
        <div className="cursor-pointer" onClick={async () => {}}>
          <div className="fs-14 fw-semibold theme-color">
            {record?.billNumber}
          </div>
          <div className="fs-14 fw-normal text-truncate-twolines">
            {formatDateWithOrdinal(record?.date)}
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
          <div className="fs-14 patient-name-cell">{record?.patient?.name}</div>
          <div className="fs-14 fw-normal text-truncate-twolines">
            {record?.patient?.phone}
          </div>
        </div>
      ),
    },
    {
      title: "TOTAL AMOUNT",
      dataIndex: "total_amount",
      key: "total_amount",
      ellipsis: true,
      onFilter: (value, record) => record.send_on.startsWith(value),
      render: (text, record) => <div> {record?.payableAmount} </div>,
    },
    {
      title: "PAID AMOUNT",
      dataIndex: "paid_Amount",
      key: "paid_Amount",
      ellipsis: true,
      render: (text, record) => {
        return <div>{totalPaidAmount.toFixed(2)}</div>;
      },
    },
    {
      title: "STATUS",
      dataIndex: "status",
      key: "status",
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
                displayText: `Due: ₹${record?.dueAmount}`,
              };
            case "carriedforward":
              return {
                className: "status-refunded",
                displayText: `Due ₹${record?.dueAmount}`,
              };
            default:
              return {
                className: "due",
                displayText: `Due: ₹${record?.dueAmount}`,
              };
          }
        };

        // Get status details
        const { className, displayText } = getStatusDetails(
          record?.paymentStatus
        );

        return <div className={className}>{displayText}</div>;
      },
    },
  ];

  return (
    <>
      <Card bordered={false} className="search-modalCard refund-bill-wrapper">
        <div className="modalCard-header h-60 align-items-center justify-content-between d-flex">
          <div className="align-items-center d-flex">
            <Button
              type="text"
              className="btn btn-delete-prescription px-3 focus-none h-100"
              onClick={handleRefundBillDrawer}
            >
              <i
                className="icon-Cross fs-3"
                style={{ color: isReceptionist ? "rgb(113, 79, 255)" : "" }}
              ></i>
            </Button>
            <div className="modal-title">Refund Bill</div>
          </div>
          <Button
            className={`btn btn-41 px-4 me-20 ${
              isReceptionist ? "receptionist-btn" : "btn-primary3"
            }`}
            onClick={handleRefundBill}
          >
            Refund
          </Button>
        </div>
        <div
          className="billing-table-wrapper align-items-center d-flex justify-content-between mt-4 table-wrapper"
          style={{
            border: "1px solid var(--T-Text-10, #E2E2EA)",
            borderRadius: "10px",
          }}
        >
          <Table
            className="billing-table px-0"
            columns={columns}
            width="100%"
            dataSource={[billData]}
            pagination={false}
          />
        </div>
        <div className="payment-methods-container">
          <div className="d-flex gap-2 mx-4 my-2 p-2">
            <div style={{ padding: "16px 0px 0px 0px", width: "100%" }}>
              <div className="text-lg font-medium mb-2">
                Paid Amount <span className="color-red">*</span>
              </div>
              <div ref={paymentMethodsRef}>
                {paymentModes.map((payment, index) => (
                  <div key={index} className="relative">
                    {index > 0 && (
                      <div className="flex items-center gap-2 mb-2 relative">
                        <span className="text-gray-500 text-sm font-medium z-10 bg-white px-2">
                          And
                        </span>
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-300 -z-10"></div>
                      </div>
                    )}
                    <div className="flex align-items-center gap-4 mb-3">
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
                                totalRefundAmount !== totalPaidAmount ||
                                (isPaymentModeItemMissing &&
                                  (payment?.amount === 0 ||
                                    payment?.amount === ""))
                                  ? "solid 1px red"
                                  : "",
                              borderRadius:
                                totalRefundAmount !== totalPaidAmount ||
                                (isPaymentModeItemMissing &&
                                  (payment?.amount === 0 ||
                                    payment?.amount === ""))
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
                              className="payment-mode"
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
                              className="payment-input w-100"
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
                        {paymentModes.length > 1 && (
                          <Button
                            className="btn btn-delete-prescription p-2 d-flex align-items-center justify-content-center"
                            onClick={() => removePaymentMode(index)}
                          >
                            <i
                              className="icon-delete"
                              style={{ color: "#454551", marginLeft: 10 }}
                            />
                          </Button>
                        )}
                      </div>
                      {isPaymentModeItemMissing &&
                        (payment?.amount === 0 || payment?.amount === "") && (
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
                    </div>
                  </div>
                ))}
                {totalRefundAmount !== totalPaidAmount && (
                  <div className="d-flex align-items-start gap-2">
                    <span className="icon-info fs-18 mt-1 bdg-danger" />
                    <span className="bdg-danger">
                      Refund amount should be{" "}
                      <b style={{ fontWeight: 600 }}>₹{totalPaidAmount}</b>
                      {` (Amount less or greater than the bill amount are not
                      allowed)`}
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
          </div>
          <div className="d-flex gap-2 mx-4 my-2 p-2">
            <div className="w-100 position-relative">
              <TextArea
                className="h-100 align-self-center"
                placeholder="Add Notes(optional)"
                value={remarks}
                autoSize={{
                  minRows: 1,
                  maxRows: 2,
                }}
                onChange={handleRemarksChange}
              />
              <div
                className="position-absolute"
                style={{
                  bottom: 8,
                  right: 12,
                  fontSize: "12px",
                  color: "#8E8E93",
                }}
              >
                {remarks.length}/{MAX_REMARKS_LENGTH}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-4 my-2 p-2 refund-info h-50">
          <span className="color-red fw-semibold">
            {totalRefundAmount ? totalRefundAmount : 0}
          </span>
          &nbsp;will be Refunded to the patient
        </div>

        <button
          className={`btn-refund-bill mx-4 p-2 h-50 ${
            isReceptionist ? "receptionist-btn" : ""
          }`}
          onClick={handleRefundBill}
          disabled={totalRefundAmount !== totalPaidAmount}
        >
          Refund the Bill
        </button>

        {shouldShowRefIdPopup !== null && shouldShowRefIdPopup >= 0 && (
          <RefIdPopup
            index={shouldShowRefIdPopup}
            refId={paymentModes[shouldShowRefIdPopup]?.refId}
            showHideModal={() => setShowRefIdPopup(-1)}
            handleModeChange={handleModeChange}
          />
        )}
      </Card>
    </>
  );
}

export default React.memo(RefundBill);