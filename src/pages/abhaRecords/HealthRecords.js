import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Card, Table, message, Input } from "antd";
import { PATIENT_DETAILS_SIDEBAR_KEYS } from "../../utils/constants";
import ViewRecordsDrawer from "./ViewRecordsDrawer";
import "./HealthRecords.scss";

const HealthRecords = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hospitals, consentId } = location.state || {};
  const [messageApi, contextHolder] = message.useMessage();
  const [searchTerm, setSearchTerm] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    if (!hospitals || !Array.isArray(hospitals)) {
      messageApi.error("Invalid data. Redirecting...");
      setTimeout(() => navigate("/patient_details"), 2000);
    }
  }, [hospitals, navigate, messageApi]);

  const columns = [
    {
      title: <div className="health-records__column-header health-records__row-number">#</div>,
      dataIndex: "index",
      key: "index",
      width: 50,
      render: (_, __, index) => <div className="health-records__row-number">{index + 1}</div>,
    },
    {
      title: <div className="health-records__column-header">Facility Name</div>,
      dataIndex: "hospitalName",
      key: "hospitalName",
      render: (value) => value || "-",
    },
    {
      title: <div className="health-records__column-header">Action</div>,
      key: "action",
      width: 150,
      align: "center",
      render: (_, record) => {
        const recordCount = record?.records?.length || 0;
        const buttonText = recordCount > 1 ? "View Records" : "View Record";
        
        return (
          <Button
            type="default"
            className="health-records__view-btn"
            onClick={() => handleViewRecord(record)}
          >
            {buttonText}
          </Button>
        );
      },
    },
  ];

  const handleViewRecord = (record) => {
    if (!record?.records || record.records.length === 0) {
      messageApi.warning("No records available for this facility");
      return;
    }
    setSelectedRecord(record);
    setDrawerVisible(true);
  };

  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setSelectedRecord(null);
  };

  const handleBack = () => {
    // Navigate back to patient details with ABHA Records sidebar active
    navigate(-1, {
      state: {
        patient_data: location.state?.patient_data,
        sidebarKey: PATIENT_DETAILS_SIDEBAR_KEYS.ABHA_RECORDS,
      },
    });
  };

  // Filter hospitals based on search term
  const filteredHospitals = hospitals?.filter((hospital) =>
    hospital?.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!hospitals || !Array.isArray(hospitals)) {
    return (
      <div className="appointment-wrap PatientDetailswrap m-0">
        <div className="health-records__loading">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div className="appointment-wrap PatientDetailswrap m-0 health-records">
        <div className="health-records__layout">
          {/* Yellow Hero Section */}
          <div className="health-records__hero">
            <div className="health-records__hero-content">
              <Button
                type="text"
                className="health-records__back-btn"
                onClick={handleBack}
                icon={<i className="icon-right" />}
              >
              </Button>
              <h1 className="health-records__title">Health Records</h1>
            </div>
          </div>

          {/* Main Card */}
          <Card className="health-records__card" bodyStyle={{ padding: 0 }}>
            <div className="health-records__card-body">
              {/* Search Box */}
              <div className="health-records__search-wrapper">
                <Input
                  className="health-records__search-input"
                  placeholder="Search by Facility Name"
                  prefix={<i className="icon-search" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                />
                <div className="health-records__search-filler" aria-hidden="true" />
              </div>
              
              <div className="health-records__table-wrapper">
                <Table
                  dataSource={filteredHospitals}
                  columns={columns}
                  pagination={false}
                  rowKey={(record, index) =>
                    record?.hospitalName || `hospital-${index}`
                  }
                  className="health-records__table"
                  size="middle"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* View Records Drawer */}
      <ViewRecordsDrawer
        visible={drawerVisible}
        onClose={handleCloseDrawer}
        record={selectedRecord}
        consentId={consentId}
      />
    </>
  );
};

export default HealthRecords;

