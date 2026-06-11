import React, { useEffect, useState } from "react";
import { Modal, Table } from "antd";
import "./billingHistory.scss";
import { DownloadOutlined } from "@ant-design/icons";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";

import { fetchSubscriptionDetails } from "../../redux/subscriptionSlice";
import saveAs from "file-saver";
import axios from "axios";
import { getClinicName } from "../../utils/utils";
import { ASSETS } from "../../assets";
const billingsIcon = ASSETS.images.billings;

const styles = {
  table: {
    margin: "30px auto",
    textAlign: "center",
  },
};

const SubscriptionTable = () => {
  const { planDetails } = useSelector((state) => state.subscription);
  const { profile } = useSelector((state) => state.doctors);
  const { billingHistory = [], totalPages } = planDetails || {};
  const [pagination, setPagination] = useState({
    current: 0,
    pageSize: 5,
    total: totalPages || 0,
  });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  // Fetch data when the component mounts or when pagination changes
  useEffect(() => {
    dispatch(fetchSubscriptionDetails(pagination));
  }, [pagination.current, pagination.pageSize]);

  // Handle pagination change
  const handleTableChange = (pagination) => {
    setPagination({
      ...pagination,
      current: pagination.current,
      pageSize: pagination.pageSize,
    });
  };

  async function handleDownload(pdfUrl, name) {
    try {
      const response = await axios({
        url: pdfUrl,
        method: "GET",
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      saveAs(blob, `${name}.pdf`);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  }

  const columns = [
    {
      title: "Product",
      key: "productName",
      dataIndex: "productName",
      render: (text) => (
        <span style={{ fontWeight: "600", fontSize: "16px", color: "#333" }}>
          {text || ""}
        </span>
      ),
    },
    {
      title: "Payment Type",
      key: "paymentType",
      dataIndex: "paymentType",
      render: (text) => (
        <span style={{ fontSize: "14px", color: "#555" }}>{text || ""}</span>
      ),
    },
    {
      title: "Reference",
      key: "txId",
      dataIndex: "txId",
      render: (text) => (
        <span style={{ fontSize: "14px", color: "#555" }}>{text || ""}</span>
      ),
    },
    {
      title: "Amount Paid",
      key: "paidAmount",
      dataIndex: "paidAmount",
      render: (text) => (
        <span style={{ fontSize: "14px", color: "#555" }}>{text || ""}</span>
      ),
    },
    {
      title: "Status",
      key: "status",
      dataIndex: "status",
      render: (text) => (
        <span style={{ fontSize: "14px", color: "#555" }}>{text || ""}</span>
      ),
    },
    {
      title: "Paid on",
      key: "paymentDate",
      dataIndex: "paymentDate",
      render: (text) => (
        <span style={{ fontSize: "14px", color: "#555" }}>
          {text ? moment(text).format("DD MMM YYYY") : ""}
        </span>
      ),
    },
    {
      title: "Plan Expires on",
      key: "paymentPlanExpiryDate",
      dataIndex: "paymentPlanExpiryDate",
      render: (text) => (
        <span style={{ fontSize: "14px", color: "#555" }}>
          {text ? moment(text).format("DD MMM YYYY") : ""}
        </span>
      ),
    },
    {
      title: "Invoice/Receipt",
      key: "invoice",
      dataIndex: "invoice",
      render: (text, record) =>
        record?.status === "APPROVED" &&
        (record?.invoice || record?.paymentReceipt) ? (
          <div
            onClick={() => {
              const clinic_name = getClinicName(profile?.hospital_data);
              window.Moengage.track_event("DownloadInvoice_Click", {
                doctor_id: profile?.doctor_unique_id,
                clinic_name,
                txId: record?.txId,
              });
              handleDownload(
                record?.paymentType === "PARTIAL"
                  ? record?.paymentReceipt
                  : record?.invoice,
                record?.paymentType === "PARTIAL" ? "Receipt" : "Invoice"
              );
            }}
            style={{ cursor: "pointer" }}
          >
            <DownloadOutlined className="custom-icon" />
          </div>
        ) : (
          ""
        ),
    },
  ];

  return (
    <Table
      dataSource={billingHistory}
      columns={columns}
      style={styles.table}
      pagination={{
        current: pagination.current + 1,
        pageSize: pagination.pageSize,
        total: totalPages,
      }}
      loading={loading}
      onChange={handleTableChange}
      rowClassName={() => "custom-row"}
    />
  );
};

const BillingHistory = ({ show, setShow }) => {
  return (
    <Modal
      width={"auto"}
      open={show}
      footer={null}
      onCancel={() => setShow(false)}
      centered
      title={
        <>
          <img
            loading="lazy"
            src={billingsIcon}
            style={{ color: "#EE7200", marginRight: "5px" }}
            alt=""
          />
          Billing History
        </>
      }
    >
      <SubscriptionTable />
    </Modal>
  );
};

export default BillingHistory;
