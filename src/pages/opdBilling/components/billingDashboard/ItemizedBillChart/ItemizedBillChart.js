import React from "react";
import moment from "moment";
import "./ItemizedBillChart.scss";
import { getClinic } from "../../../../../utils/utils";

const ItemizedBillChart = ({
  billData,
  profile,
  dateRange,
  hideReportHeader = false,
  includeDiscountSection = true,
  includePaymentSummarySection = true,
  /** Rows skipped before this slice (continuous # in chunked PDFs). */
  billRowOffset = 0,
  /** When set (e.g. discount-only appendix), first discount row #. */
  firstDiscountRowNumber = null,
  /**
   * Chunked PDF: map serviceKey -> { show, amount }. Subtotal row only when `show`;
   * `amount` is full-service total. Omit for normal single-page view.
   */
  serviceSubtotalDisplay = null,
}) => {
  const {
    billSummary = [],
    additionalDiscountSummary = [],
    totalAdditionalDiscount = 0,
    paymentSummary = [],
    totalPaidAmount = 0,
  } = billData || {};

  const clinic = getClinic(profile?.hospital_data);

  const formatPaymentModes = (paymentModes) => {
    if (!paymentModes || paymentModes.length === 0) return "N/A";
    return paymentModes.join(", ");
  };

  const formatGenderAge = (gender, age) => {
    return `${gender}/${age}`;
  };

  const formatDate = (dateString) => {
    return moment(dateString).format("YYYY-MM-DD");
  };

  const formatAmount = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getGlobalIndex = (serviceIndex, billIndex) => {
    let globalIndex = billRowOffset + 1;
    for (let i = 0; i < serviceIndex; i++) {
      globalIndex += billSummary[i].bills.length;
    }
    return globalIndex + billIndex;
  };

  const getDiscountStartingIndex = () => {
    let totalBills = 0;
    billSummary.forEach((service) => {
      totalBills += service.bills.length;
    });
    return totalBills + 1;
  };

  const discountSerial = (index) =>
    firstDiscountRowNumber != null
      ? firstDiscountRowNumber + index
      : getDiscountStartingIndex() + index;

  const serviceKey = (svc) =>
    `${svc.serviceName}__${svc.serviceId ?? ""}`;

  return (
    <div className="itemized-bill-chart">
      {!hideReportHeader && (
        <div className="report-header">
          <div>
            <div className="clinic-name">
              {clinic?.hm_name || ""}
            </div>
            <div className="clinic-location">
              {clinic?.hm_city || ""}
            </div>
          </div>
          <h1>ITEMIZED BILLING REPORT</h1>
          <div className="report-details">
            <div className="report-period">
              Period: {moment(dateRange?.startDate).format("MMMM DD")} -{" "}
              {moment(dateRange?.endDate).format("MMMM DD, YYYY")}
            </div>
            <div className="report-date">
              Generated on: {moment().format("DD/MM/YYYY, HH:mm")}
            </div>
          </div>
        </div>
      )}

      {/* Bill Summary Sections */}
      <div
        style={{
          borderBottom:
            additionalDiscountSummary?.length > 0 ? "1px solid black" : "none",
        }}
      >
        {billSummary.map((service, serviceIndex) => (
          <div
            key={serviceIndex}
            className={`service-section ${
              serviceIndex > 0 ? "new-page-content" : ""
            }`}
          >
            <h2 className="service-title">{service.serviceName}</h2>

            <div className="bills-table">
              <table className="bill-table">
                <thead>
                  <tr>
                    <th style={{ width: "4%" }}>#</th>
                    <th style={{ width: "11%" }}>Created by</th>
                    <th style={{ width: "8%" }}>Date</th>
                    <th style={{ width: "10%" }}>Invoice No.</th>
                    <th style={{ width: "8%" }}>Patient ID</th>
                    <th style={{ width: "13%" }}>Patient Name</th>
                    <th style={{ width: "10%" }}>Patient Phone</th>
                    <th style={{ width: "9%" }}>Gender/Age</th>
                    <th style={{ width: "9%" }}>Paid Amount</th>
                    <th style={{ width: "9%" }}>MOP</th>
                    <th style={{ width: "9%" }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {service.bills.map((bill, billIndex) => (
                    <tr key={billIndex}>
                      <td>{getGlobalIndex(serviceIndex, billIndex)}</td>
                      <td>{bill.createdBy}</td>
                      <td>{formatDate(bill.date)}</td>
                      <td>{bill.billNumber}</td>
                      <td>{bill.patientId}</td>
                      <td>{bill.patientName}</td>
                      <td>{bill.patientPhone || "-"}</td>
                      <td>{formatGenderAge(bill.gender, bill.age)}</td>
                      <td>{formatAmount(bill.paidAmount)}</td>
                      <td>{formatPaymentModes(bill.paymentModes)}</td>
                      <td>{bill.paymentStatus || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(() => {
              const sub = serviceSubtotalDisplay?.[serviceKey(service)];
              const showSubtotalRow =
                serviceSubtotalDisplay == null
                  ? true
                  : sub
                    ? sub.show
                    : true;
              if (!showSubtotalRow) return null;
              const amount =
                serviceSubtotalDisplay != null && sub?.show
                  ? sub.amount
                  : service.subTotal;
              return (
                <div className="service-subtotal">
                  <div>
                    {service.serviceName} Sub Total: {formatAmount(amount)}
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      {includeDiscountSection &&
        additionalDiscountSummary &&
        additionalDiscountSummary.length > 0 && (
        <div className="discount-section" style={{ paddingTop: "20px" }}>
          <h2 className="section-title">Additional Discount Details</h2>

          <div className="discount-table">
            <table className="bill-table">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>#</th>
                  <th style={{ width: "13%" }}>Created by</th>
                  <th style={{ width: "10%" }}>Date</th>
                  <th style={{ width: "12%" }}>Invoice No.</th>
                  <th style={{ width: "10%" }}>Patient ID</th>
                  <th style={{ width: "16%" }}>Patient Name</th>
                  <th style={{ width: "10%" }}>Gender/Age</th>
                  <th style={{ width: "10%" }}>Discount</th>
                  <th style={{ width: "14%" }}>MOP</th>
                </tr>
              </thead>
              <tbody>
                {additionalDiscountSummary.map((discount, index) => (
                  <tr key={index}>
                    <td>{discountSerial(index)}</td>
                    <td>{discount.createdBy}</td>
                    <td>{formatDate(discount.date)}</td>
                    <td>{discount.billNumber}</td>
                    <td>{discount.patientId}</td>
                    <td>{discount.patientName}</td>
                    <td>{formatGenderAge(discount.gender, discount.age)}</td>
                    <td className="discount-amount">
                      {formatAmount(discount.discountAmount)}
                    </td>
                    <td>NA</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="7" className="discount-total-label">
                    Total Additional Discount:
                  </td>
                  <td className="discount-total-amount">
                    {formatAmount(totalAdditionalDiscount)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {includePaymentSummarySection &&
        paymentSummary &&
        paymentSummary.length > 0 && (
        <div className="payment-summary-section" style={{ paddingTop: "20px" }}>
          <h2>Payment Summary</h2>
          <div className="payment-table">
            <table className="bill-table">
              <thead>
                <tr>
                  <th style={{ width: "50%" }}>PAYMENT MODE</th>
                  <th style={{ width: "50%" }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {paymentSummary.map((payment, index) => (
                  <tr key={index}>
                    <td>{payment.paymentMode}</td>
                    <td>{formatAmount(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemizedBillChart;
