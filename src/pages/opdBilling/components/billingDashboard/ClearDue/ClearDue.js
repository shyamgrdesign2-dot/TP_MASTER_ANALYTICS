import React, { useState, useEffect, useRef } from "react";
import { Button, Card, Input, Select, Table, message } from "antd";
import moment from "moment";
import "./ClearDue.scss";

import { useSelector } from "react-redux";
import { processClearDue } from "../../../service";

import { MESSAGE_KEY } from "../../../../../utils/constants";
import { PaymentOptions } from "../../../utils/constants";
import { calculateTotalPaidAmount, formatDateWithOrdinal } from "../../../utils/helper";
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

const { TextArea } = Input;
const MAX_REMARKS_LENGTH = 400;

function ClearDue({
  handleClearDueDrawer,
  billData,
  handleMessageForm3c,
  getPatientBills,
  onClearDueSuccess,
  patientAdvanceData,
}) {
  const [shouldShowRefIdPopup, setShowRefIdPopup] = useState(-1);
  const [totalClearDueAmount, setTotalClearDueAmount] = useState(0);
  const [paymentModes, setPaymentModes] = useState([
    { paymentMode: "Cash", amount: billData?.dueAmount || "", refId: "" },
  ]);
  const [remarks, setRemarks] = useState("");
  const [isPaymentModeItemMissing, setPaymentModeItemMissing] = useState(false);
  const [isAmountExceeding, setIsAmountExceeding] = useState(false);
  const paymentMethodsRef = useRef(null);
  const { planDetails } = useSelector((state) => state.subscription);
  const { profile } = useSelector((state) => state.doctors);

  const usedPaymentModes = paymentModes.map((p) => p.paymentMode);
  const filteredOptions = PaymentOptions.filter(
    (option) => !usedPaymentModes.includes(option.value)
  );
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");

  // Calculate total clear due amount whenever paymentModes change
  useEffect(() => {
    const total = paymentModes.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0
    );
    setTotalClearDueAmount(total);

    // Validate if amount exceeds due amount
    const dueAmount = parseFloat(billData?.dueAmount) || 0;
    setIsAmountExceeding(total > dueAmount);
  }, [paymentModes, billData?.dueAmount]);

  // Reset state when billData changes
  useEffect(() => {
    if (billData?.dueAmount) {
      setPaymentModes([
        { paymentMode: "Cash", amount: billData.dueAmount, refId: "" },
      ]);
      setRemarks("");
      setTotalClearDueAmount(0);
      setIsAmountExceeding(false);
      setPaymentModeItemMissing(false);
    }
  }, [billData]);

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
      if (isPaymentModeItemMissing) {
        setPaymentModeItemMissing(false);
      }
    }
  };

  const handleRemarksChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_REMARKS_LENGTH) {
      setRemarks(value);
    }
  };

  const handleClearDue = async () => {
    // Validate payment modes
    const updatedPaymentModes = paymentModes?.filter(
      (item) => item.paymentMode && item.amount > 0
    );
    if (updatedPaymentModes?.length !== paymentModes?.length) {
      setPaymentModeItemMissing(true);
      return;
    }

    // Validate amount doesn't exceed due amount
    const dueAmount = parseFloat(billData?.dueAmount) || 0;
    if (totalClearDueAmount > dueAmount) {
      setIsAmountExceeding(true);
      message.error("Clear due amount cannot exceed the due amount");
      return;
    }

    if (totalClearDueAmount <= 0) {
      message.error("Please enter a valid amount to clear due");
      return;
    }

    try {
      const payload = {
        patientId: billData?.patientId,
        billNumber: billData?.billNumber,
        paidDue: {
          date: moment().format("YYYY-MM-DD"),
          paidAmount: totalClearDueAmount,
          paymentModes: paymentModes.map((mode) => ({
            paymentMode: mode.paymentMode,
            amount: parseFloat(mode.amount) || 0,
            refId: mode.refId || "",
          })),
        },
      };

      // Add remarks if provided
      if (remarks.trim()) {
        payload.paidDue.notes = remarks.trim();
      }

      const response = await processClearDue(payload);

      if (response.id) {
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
                <div className="title-common text-start fontroboto">
                  {`₹${totalClearDueAmount} Due Cleared Successfully`}
                </div>
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
        handleClearDueDrawer();
        getPatientBills && getPatientBills();
        handleMessageForm3c && handleMessageForm3c();
        onClearDueSuccess && onClearDueSuccess();
      } else {
        throw new Error(response.error || "Failed to clear due amount.");
      }
    } catch (error) {
      message.error(error.message || "Failed to clear due amount");
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

  const columns = [
    {
      title: "BILL NO & DATE",
      dataIndex: "bill_num_date",
      key: "bill_num_date",
      render: (text, record) => (
        <div className="cursor-pointer">
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
        <div className="cursor-pointer">
          <div className="fs-14 patient-name-cell">{record?.patient?.name}</div>
          <div className="fs-14 fw-normal text-truncate-twolines">
            {record?.patient?.phone}
          </div>
        </div>
      ),
    },
    {
      title: "TOTAL",
      dataIndex: "total",
      key: "total",
      ellipsis: true,
      render: (text, record) => <div>₹{record?.payableAmount}</div>,
    },
    {
      title: "PAID",
      dataIndex: "paid",
      key: "paid",
      ellipsis: true,
      render: (text, record) => {
        const totalPaidAmount = calculateTotalPaidAmount(record);
        return <div>₹{totalPaidAmount.toFixed(2)}</div>;
      },
    },
    {
      title: "DUE",
      dataIndex: "due",
      key: "due",
      ellipsis: true,
      render: (text, record) => <div>₹{record?.dueAmount}</div>,
    },
    {
      title: "REFUND",
      dataIndex: "refund",
      key: "refund",
      ellipsis: true,
      render: (text, record) => (
        <div>{record?.refundedAmount ? `₹${record.refundedAmount}` : "-"}</div>
      ),
    },
  ];

  const dueAmount = parseFloat(billData?.dueAmount) || 0;
  const isFormValid =
    totalClearDueAmount > 0 &&
    totalClearDueAmount <= dueAmount &&
    !isPaymentModeItemMissing &&
    paymentModes.every((mode) => mode.paymentMode && mode.amount > 0);

  return (
    <>
      <Card bordered={false} className="search-modalCard clear-due-wrapper">
        <div className="modalCard-header h-60 align-items-center justify-content-between d-flex">
          <div className="align-items-center d-flex">
            <Button
              type="text"
              className="btn btn-delete-prescription px-3 focus-none h-100"
              onClick={handleClearDueDrawer}
            >
              <i
                className="icon-Cross fs-3"
                style={{ color: isReceptionist ? "rgb(113, 79, 255)" : "" }}
              ></i>
            </Button>
            <div className="modal-title">Clear Due</div>
          </div>
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
                Enter Due Amount <span className="color-red">*</span>
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
                                isAmountExceeding ||
                                (isPaymentModeItemMissing &&
                                  (payment?.amount === 0 ||
                                    payment?.amount === ""))
                                  ? "solid 1px red"
                                  : "",
                              borderRadius:
                                isAmountExceeding ||
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
                {isAmountExceeding && (
                  <div className="d-flex align-items-start gap-2">
                    <span className="icon-info fs-18 mt-1 bdg-danger" />
                    <span className="bdg-danger">
                      Clear due amount cannot exceed{" "}
                      <b style={{ fontWeight: 600 }}>₹{dueAmount}</b>
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
                placeholder="Add Remarks (optional)"
                value={remarks}
                onChange={handleRemarksChange}
                autoSize={{
                  minRows: 1,
                  maxRows: 2,
                }}
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

        <button
          className={`btn-clear-due mx-4 p-2 h-50 ${
            isReceptionist ? "receptionist-btn" : ""
          }`}
          onClick={handleClearDue}
          disabled={!isFormValid}
        >
          Clear Due ₹{totalClearDueAmount ? totalClearDueAmount : 0}
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

export default React.memo(ClearDue);
