import React from "react";
import { Table } from "antd";
import moment from "moment";
import "./Form3cPrint.scss";

const Form3cPrint = ({ rows }) => {
  // Define the columns
  const columns = [
    {
      title: (
        <div className="header-cell">
          <div className="header-text">DATE</div>
          <div className="header-number">(1)</div>
        </div>
      ),
      dataIndex: "date",
      width: 120,
      align: "center",
      render: (text, record) => moment(record.date).format("DD/MM/YYYY"),
    },
    {
      title: (
        <div className="header-cell">
          <div className="header-text">SL. NO.</div>
          <div className="header-number">(2)</div>
        </div>
      ),
      dataIndex: "slNo",
      width: 100,
      align: "center",
      render: (text, record) => record.billNumber,
    },
    {
      title: (
        <div className="header-cell">
          <div className="header-text">PATIENT'S NAME</div>
          <div className="header-number">(3)</div>
        </div>
      ),
      dataIndex: "patientName",
      width: 150,
      align: "left",
      render: (text, record) => (
        <div>
          <div>{record?.patient?.name}</div>
        </div>
      ),
    },
    {
      title: (
        <div className="header-cell">
          <div className="header-text">
            NATURE OF PROFESSIONAL SERVICES RENDERED, I.E., GENERAL
            CONSULTATION, SURGERY, INJECTION, VISIT, ETC.
          </div>
          <div className="header-number">(4)</div>
        </div>
      ),
      dataIndex: "servicesRendered",
      width: 280,
      align: "left",
      render: (text, record) => (
        <div>
          {record?.billItems?.map((item) => item.name).join(", ") || "-"}
        </div>
      ),
    },
    {
      title: (
        <div className="header-cell">
          <div className="header-text">FEES RECEIVED</div>
          <div className="header-number">(5)</div>
        </div>
      ),
      dataIndex: "feesReceived",
      width: 100,
      align: "right",
      render: (text, record) => <div>{`₹${record?.paidAmount}`}</div>,
    },
    {
      title: (
        <div className="header-cell">
          <div className="header-text">DATE OF RECEIPT</div>
          <div className="header-number">(6)</div>
        </div>
      ),
      dataIndex: "receiptDate",
      width: 120,
      align: "center",
      render: (text, record) => moment(record.date).format("DD/MM/YYYY"),
    },
  ];

  return (
    <div className="form-3c-print-wrapper">
      {/* Header Section */}
      <div className="form-header">
        <h2 className="form-title">FORM NO. 3C</h2>
        <p className="form-rule">
          <a href="#" target="_blank" rel="noopener noreferrer">
            [See rule 6F(3)]
          </a>
        </p>
        <h3 className="form-subtitle">Form of daily case register</h3>
        <p className="form-description">
          [TO BE MAINTAINED BY PRACTITIONERS OF ANY SYSTEM OF MEDICINE, I.E.,
          PHYSICIANS, SURGEONS, DENTISTS, PATHOLOGISTS, RADIOLOGISTS, VAIDS,
          HAKIMS, ETC.]
        </p>
      </div>

      {/* Table */}
      <div style={{ width: "95%" }}>
        <Table
          dataSource={rows}
          columns={columns}
          pagination={false}
          bordered
          size="small"
          className="form3c-table"
        />
      </div>
    </div>
  );
};

export default Form3cPrint;
