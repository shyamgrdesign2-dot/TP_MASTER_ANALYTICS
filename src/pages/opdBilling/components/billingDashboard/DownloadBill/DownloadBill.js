import React from "react";
import { Divider } from "antd";
import { useSelector } from "react-redux";
import moment from "moment";
import { useLocation } from "react-router-dom";
import "./DownloadBill.scss";

const DownloadBill = ({
  downloadData,
  parent,
  dateRange,
  isDoctorDashboard,
  paymentSummary,
  tableRowNumberStart = 0,
  omitPaymentSummary = false,
  omitBillsTable = false,
  hidePrintHeader = false,
}) => {
  const { profile } = useSelector((state) => state.doctors);
  const { doctorList } = useSelector((state) => state.bulkMessages);
  const { state } = useLocation();
  const { patient_data } = state || {};

  const hospitalData = profile?.hospital_data?.[0] || {};
  const { hm_name, um_contact, um_email, hm_address, hm_address1, hm_state } =
    hospitalData;

  const paymentSummaryFiltered = Array.isArray(paymentSummary)
    ? paymentSummary.filter(
        (item) =>
          (Number(item?.receivedAmount) || 0) !== 0 ||
          (Number(item?.refundedAmount) || 0) !== 0
      )
    : [];

  const paymentSummaryWithTotal =
    paymentSummaryFiltered.length > 0
      ? [
          ...paymentSummaryFiltered,
          {
            paymentMode: "Total",
            receivedAmount: paymentSummaryFiltered.reduce(
              (sum, item) => sum + (Number(item.receivedAmount) || 0),
              0
            ),
            refundedAmount: paymentSummaryFiltered.reduce(
              (sum, item) => sum + (Number(item.refundedAmount) || 0),
              0
            ),
          },
        ]
      : [];

  function getDoctorNameById(um_id) {
    const doctor = doctorList.find((doc) => doc.um_id === um_id);
    return doctor ? doctor.um_name : "";
  }

  // Define the columns
  const columns = [
    {
      title: "#",
      dataIndex: "key",
      key: "key",
      align: "center",
      height: 20,
      width: "5%",
      render: (text, record, index, { startIndex = 0 } = {}) => (
        <div style={{ fontSize: 12 }}>{startIndex + index + 1}</div>
      ),
    },
    {
      title: "BILL NO & DATE",
      dataIndex: "billNo",
      key: "billNo",
      align: "center",
      height: 20,
      width: "12%",
      render: (text, record) => (
        <div>
          <div style={{ fontSize: 12 }}>{record.billNumber}</div>
          <div style={{ fontSize: 12 }}>
            {moment(record.date).format("DD MMM YYYY")}
          </div>
        </div>
      ),
    },
    isDoctorDashboard
      ? {
          title: "Patient Name",
          dataIndex: "patientName",
          key: "patientName",
          align: "left",
          height: 20,
          width: "17%",
          render: (text, record) => (
            <div style={{ fontSize: 12 }}>{record?.patient?.name}</div>
          ),
        }
      : undefined,
    isDoctorDashboard
      ? {
          title: "Doctor Name",
          dataIndex: "doctorName",
          key: "doctorId",
          align: "left",
          height: 20,
          width: "17%",
          render: (text, record) => (
            <div style={{ fontSize: 12 }}>
              {getDoctorNameById(record?.doctorId)}
            </div>
          ),
        }
      : undefined,
    isDoctorDashboard
      ? {
          title: "Mobile Number",
          dataIndex: "patientDetails",
          key: "patientDetails",
          align: "center",
          height: 20,
          width: "11%",
          render: (text, record) => (
            <div>
              <span style={{ fontSize: 12 }}>{record?.patient?.phone}</span>
            </div>
          ),
        }
      : undefined,
    {
      title: "TOTAL AMOUNT",
      dataIndex: "payableAmount",
      key: "payableAmount",
      align: "center",
      height: 20,
      width: "8%",
      render: (text, record) => (
        <div style={{ fontSize: 12 }}>₹{record?.payableAmount}</div>
      ),
    },
    {
      title: "PAID AMOUNT",
      dataIndex: "paidAmount",
      key: "paidAmount",
      align: "center",
      height: 20,
      width: "9%",
      render: (text, record) => (
        <div style={{ fontSize: 12 }}>₹{record?.paidAmount}</div>
      ),
    },
    {
      title: "MOP",
      dataIndex: "mop",
      key: "mop",
      align: "center",
      height: 20,
      width: "9%",
      render: (text, record) => {
        const paymentModes = Array.isArray(record?.paymentModes)
          ? record.paymentModes.map(pm => pm?.paymentMode).filter(Boolean).join(", ")
          : "N/A";
        return <span style={{ fontSize: 12 }}>{paymentModes}</span>;
      },
    },
    {
      title: "STATUS",
      dataIndex: "status",
      key: "status",
      align: "center",
      height: 20,
      width: "9%",
      render: (text, record) => (
        <span style={{ fontSize: 12 }}>{record?.paymentStatus}</span>
      ),
    },
  ]?.filter((item) => item);

  const advanceColumns = [
    {
      title: "#",
      dataIndex: "key",
      key: "key",
      align: "center",
      height: 20,
      render: (text, record, index, { startIndex = 0 } = {}) => (
        <div className="fs-14">{startIndex + index + 1}</div>
      ),
    },
    {
      title: "BILL NO",
      dataIndex: "receiptNumber",
      key: "receiptNumber",
      align: "center",
      height: 20,
      render: (text, record) => record?.billNumber || record?.receiptNumber,
    },
    {
      title: "DATE",
      dataIndex: "date",
      key: "date",
      align: "center",
      height: 20,
      render: (text, record) =>
        record.date ? moment(record.date)?.format("DD MMM YYYY") : "",
    },
    isDoctorDashboard
      ? {
          title: "PATIENT NAME",
          dataIndex: "patientName",
          key: "patientName",
          align: "left",
          height: 20,
          ellipsis: true,
          render: (text, record) => (
            <div className="cursor-pointer">
              <div className="fs-14 patient-name-cell">
                {record?.patient?.name}
              </div>
            </div>
          ),
        }
      : undefined,
    isDoctorDashboard
      ? {
          title: "MOBILE NUMBER",
          dataIndex: "patientDetails",
          key: "patientDetails",
          align: "center",
          height: 20,
          ellipsis: true,
          render: (text, record) => (
            <div>
              <span className="patient-name-cell" style={{ color: "#888" }}>
                {record?.patient?.phone}
              </span>
            </div>
          ),
        }
      : undefined,
    {
      title: "TOTAL AMOUNT",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "center",
      height: 20,
      render: (text, record) => (
        <div>
          <span style={{ color: "#888" }}>{record?.totalAmount}</span>
        </div>
      ),
    },
    {
      title: "STATUS",
      dataIndex: "status",
      key: "status",
      align: "center",
      height: 20,
      ellipsis: true,
      render: (text, record) => (
        <span style={{ color: "#888" }}>{record?.transactionType}</span>
      ),
    },
  ]?.filter((item) => item);

  const summaryColumns = [
    {
      title: "PAYMENT MODE",
      dataIndex: "paymentMode",
      key: "paymentMode",
      align: "center",
      render: (text, record, index) => (
        <span
          style={{
            fontWeight: record.paymentMode === "Total" ? "medium" : "normal",
            fontSize: 12,
          }}
        >
          {record.paymentMode}
        </span>
      ),
    },
    {
      title: "RECEIVED AMOUNT",
      dataIndex: "receivedAmount",
      key: "receivedAmount",
      align: "center",
      render: (text, record) => (
        <span
          style={{
            fontWeight: record.paymentMode === "Total" ? "medium" : "normal",
            fontSize: 12,
          }}
        >
          ₹{record.receivedAmount?.toFixed(2)}
        </span>
      ),
    },
    {
      title: "REFUNDED AMOUNT",
      dataIndex: "refundedAmount",
      key: "refundedAmount",
      align: "center",
      render: (text, record) => (
        <span
          style={{
            fontWeight: record.paymentMode === "Total" ? "medium" : "normal",
            fontSize: 12,
          }}
        >
          ₹{record.refundedAmount?.toFixed(2)}
        </span>
      ),
    },
    {
      title: "TOTAL",
      dataIndex: "total",
      key: "total",
      align: "center",
      render: (text, record) => (
        <span
          style={{
            fontWeight: record.paymentMode === "Total" ? "medium" : "normal",
            fontSize: 12,
          }}
        >
          ₹{(record.receivedAmount - record.refundedAmount)?.toFixed(2)}
        </span>
      ),
    },
  ];

  const PatientPlank = () => {
    return (
      <div
        className={`d-flex align-items-center flex-wrap border border-radius-10 cursor-pointer patient-plank ${
          patient_data?.patient_unique_id && "pe-none disabled"
        }`}
        style={{
          padding: "5px 10px",
          width: "fit-content",
        }}
      >
        <div className="list-patientName d-flex align-items-center me-4 ml-2">
          <i className="icon-patients backbar me-2"></i>{" "}
          <span className="patientInfo">
            {patient_data.pm_salutation ? `${patient_data.pm_salutation} ` : ""}
            {patient_data?.pm_fullname}
          </span>
        </div>
        <div className="list-patientName d-flex align-items-center me-4">
          <i className="icon-phone backbar me-2"></i>
          <span className="patientInfo">{patient_data?.pm_contact_no}</span>
        </div>
        <div className="list-patientName d-flex align-items-center me-4">
          <i className="icon-Id backbar me-2"></i>
          <span className="patientInfo">{patient_data?.pm_pid}</span>
        </div>
      </div>
    );
  };

  // Get the columns to use based on parent type
  const getColumns = () => {
    return parent === "advance" ? advanceColumns : columns;
  };

  // Render table cell content
  const renderCell = (col, record, index) => {
    if (!col.render) {
      return record[col.dataIndex] || "";
    }
    return col.render(record[col.dataIndex], record, index, {
      startIndex: tableRowNumberStart,
    });
  };

  const hasBills = Array.isArray(downloadData) && downloadData.length > 0;
  const showPaymentSummaryBlock =
    !omitPaymentSummary && Array.isArray(paymentSummaryFiltered) && paymentSummaryFiltered.length > 0;

  if (!hasBills && (!omitBillsTable || !showPaymentSummaryBlock)) {
    return (
      <div className="printable-bill-content">
        <div className="header">
          <h1>{hm_name}</h1>
          <p>
            {hm_address ?? ""}
            {hm_address && hm_address1 ? `, ${hm_address1}` : ""}
            {hm_state} {um_contact ? ` • ${um_contact}` : ""}
            {um_email ? ` • ${um_email}` : ""}
          </p>
          <Divider />
          <p>
            Bill between{" "}
            {moment(dateRange?.startDate).format("DD/MM/YYYY")} -{" "}
            {moment(dateRange?.endDate).format("DD/MM/YYYY")}
          </p>
        </div>
        <div>No data available</div>
      </div>
    );
  }

  const tableColumns = getColumns();

  return (
    <div className="printable-content">
      {!hidePrintHeader && (
        <>
          <div className="header">
            <h1>{hm_name}</h1>
            <p>
              {hm_address ?? ""}
              {hm_address && hm_address1 ? `, ${hm_address1}` : ""}
              {hm_state} {um_contact ? ` • ${um_contact}` : ""}
              {um_email ? ` • ${um_email}` : ""}
            </p>
            <Divider />
            <p>
              Bill between{" "}
              {moment(dateRange?.startDate).format("DD/MM/YYYY")} -{" "}
              {moment(dateRange?.endDate).format("DD/MM/YYYY")}
            </p>
          </div>
          {patient_data ? <PatientPlank /> : null}
        </>
      )}

      {hasBills && !omitBillsTable && (
        <div>
        <table
          className="bill-table print-bill-table"
          style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
        >
            <thead>
              <tr>
                {tableColumns.map((col, colIndex) => (
                  <th
                    key={colIndex}
                    style={{
                      padding: "8px 6px",
                      textAlign: col.align || "center",
                      fontWeight: 600,
                      border: "1px solid #ddd",
                      fontSize: "12px",
                      backgroundColor: "#fafafa",
                      width: col.width || "auto",
                    }}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {downloadData.map((record, index) => (
                <tr
                  key={index}
                  style={{
                    pageBreakInside: "avoid",
                    breakInside: "avoid",
                  }}
                >
                  {tableColumns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      style={{
                        padding: "6px 8px",
                        border: "1px solid #d9d9d9",
                        fontSize: "12px",
                        textAlign: col.align || "center",
                        width: col.width || "auto",
                      }}
                    >
                      {renderCell(col, record, index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPaymentSummaryBlock && (
        <div style={{ marginTop: "30px", paddingTop: "20px" }}>
          <div className="header">
            <h2 style={{ margin: "0", fontWeight: "bold", color: "#4B4AD5" }}>
              Payment Summary
            </h2>
            <Divider />
          </div>

          <div>
            <table className="bill-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {summaryColumns.map((col, colIndex) => (
                    <th
                      key={colIndex}
                      style={{
                        padding: "8px 12px",
                        textAlign: col.align || "center",
                        fontWeight: 600,
                        border: "1px solid #ddd",
                        fontSize: "12px",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paymentSummaryWithTotal.map((record, index) => (
                  <tr key={index}>
                    {summaryColumns.map((col, colIndex) => (
                      <td
                        key={colIndex}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #d9d9d9",
                          fontSize: "12px",
                          textAlign: col.align || "center",
                          fontWeight: record.paymentMode === "Total" ? "medium" : "normal",
                        }}
                      >
                        {col.render
                          ? col.render(record[col.dataIndex], record, index)
                          : record[col.dataIndex]}
                      </td>
                    ))}
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

export default DownloadBill;
