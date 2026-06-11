import * as XLSX from "xlsx";
import React, { useEffect, useState } from "react";
import {
  Button,
  Input,
  Select,
  Checkbox,
  Typography,
  message,
  DatePicker,
  Dropdown,
  Spin,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { throttle } from "lodash";
import {
  fetchApolloVaccination,
  fetchApolloVaccinationRemarks,
  updateVaccinationRemarks,
} from "./service";
import { getDecodedToken } from "../../utils/localStorage";
import { isChrome, isSafari } from "react-device-detect";
import { sendMessageToParent } from "../../utils/utils";
import { EVENTS } from "../../utils/events";
import { saveAs } from "file-saver";
import { uploadDocsToAzure } from "../medicalRecords/service";

const { Text } = Typography;
const { Option } = Select;

const StatusFilterOptions = [
  { label: "Overdue", value: "OVERDUE" },
  { label: "Due", value: "DUE" },
];

const VaccinationAnalytics = ({ doctors }) => {
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("OVERDUE");
  const [dateFrom, setDateFrom] = useState(dayjs());
  const [dateTo, setDateTo] = useState(dayjs());

  // Ensure dates are always set
  useEffect(() => {
    if (!dateFrom) {
      setDateFrom(dayjs());
    }
    if (!dateTo) {
      setDateTo(dayjs());
    }
  }, [dateFrom, dateTo]);
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [patientRemarks, setPatientRemarks] = useState({});
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [selectedDownloadOption, setSelectedDownloadOption] = useState(null);
  const [vaccinationData, setVaccinationData] = useState([]);
  const [excelLoading, setExcelLoading] = useState(false);
  const [savedRemarks, setSavedRemarks] = useState({});
  const [editingRemarks, setEditingRemarks] = useState({});
  const [consultations, setConsultations] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const decodedToken = getDecodedToken();
  const isAdmin = decodedToken?.result?.admin;

  // Filter vaccination data based on status for display
  const filteredVaccinationData = vaccinationData
    .map((patient) => {
      if (statusFilter === "All") return patient;

      // Filter vaccines based on status
      const filteredVaccines = patient.vaccines.filter((vaccine) => {
        if (statusFilter === "DUE") {
          return vaccine.status === "DUE";
        } else if (statusFilter === "OVERDUE") {
          return vaccine.status === "OVERDUE";
        }
        return true;
      });

      return {
        ...patient,
        vaccines: filteredVaccines,
      };
    })
    .filter((patient) => patient.vaccines.length > 0);

  useEffect(() => {
    getApolloVaccination(true);
    fetchConsultations();
  }, [dateFrom, dateTo, selectedDoctor]);

  const getApolloVaccination = async (resetData = false) => {
    if (!hasMore && !resetData) return;
    setLoading(true);
    try {
      const res = await fetchApolloVaccination(
        selectedDoctor === "all"
          ? doctors?.map((item) => item.value).join(",")
          : selectedDoctor,
        dateFrom?.format("YYYY-MM-DD"),
        dateTo?.format("YYYY-MM-DD"),
        resetData ? 1 : page,
        20
      );

      if (res?.vaccines) {
        const formattedData = transformVaccineData(res.vaccines);
        setVaccinationData((prev) => {
          return resetData ? [...formattedData] : [...prev, ...formattedData];
        });
        setPage(resetData ? 2 : page + 1);
        setHasMore(res.pagination?.hasNextPage || false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      message.error("Failed to fetch vaccination data");
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultations = async () => {
    setLoading(true);

    try {
      const res = await fetchApolloVaccinationRemarks(
        dateFrom?.format("YYYY-MM-DD"),
        dateTo?.format("YYYY-MM-DD"),
        selectedDoctor === "all"
          ? doctors?.map((doc) => doc.value).join(",")
          : selectedDoctor
      );
      setConsultations(res || []);
    } catch (error) {
      message.error("Failed to fetch consultations");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRemarks = async (patient) => {
    const res = await updateVaccinationRemarks({
      tvd_id: patient?.vaccines?.map((v) => v.tvd_id).join(","),
      pm_pid: patient.patientId,
      patient_unique_id: patient.id,
      vaccinationRemarks: patientRemarks[patient.id],
    });
    if (res?.status === 204) {
      message.success("Remarks submitted successfully");
      setSavedRemarks((prev) => ({
        ...prev,
        [patient.id]: patientRemarks[patient.id] || "",
      }));
      setEditingRemarks((prev) => ({
        ...prev,
        [patient.id]: false,
      }));
    } else {
      message.error("Failed to submit remarks");
    }
  };

  const handleEditRemarks = (patientId) => {
    setEditingRemarks((prev) => ({
      ...prev,
      [patientId]: true,
    }));
  };

  // Match vaccination data with consultations and populate patientRemarks
  useEffect(() => {
    if (vaccinationData.length > 0 && consultations.length > 0) {
      const updatedPatientRemarks = {};
      const updatedSavedRemarks = {};

      vaccinationData.forEach((patient) => {
        // Find matching consultation by patient_unique_id
        const matchingConsultations = consultations.filter(
          (consultation) =>
            String(consultation.patient_unique_id) === String(patient.id)
        );

        // Find valid consultation by checking tvd_id match
        const validConsultation = matchingConsultations.find((consultation) => {
          if (
            !consultation.vaccinationRemarks ||
            consultation.vaccinationRemarks === ""
          ) {
            return false;
          }

          // Get all tvd_ids from patient's vaccines
          const patientTvdIds = patient.vaccines.map(
            (vaccine) => vaccine.tvd_id
          );

          // Check if consultation tvd_id matches any of patient's tvd_ids
          if (consultation.tvd_id) {
            const consultationTvdIds = consultation.tvd_id
              .split(",")
              .map((id) => id.trim());

            // Check if any consultation tvd_id matches any patient tvd_id
            const hasMatch = consultationTvdIds.some((consultationId) =>
              patientTvdIds.some(
                (patientId) => String(consultationId) === String(patientId)
              )
            );

            return hasMatch;
          }

          return false;
        });

        if (validConsultation && validConsultation.vaccinationRemarks) {
          updatedPatientRemarks[patient.id] =
            validConsultation.vaccinationRemarks;
          updatedSavedRemarks[patient.id] =
            validConsultation.vaccinationRemarks;
        }
      });

      setPatientRemarks((prev) => {
        return {
          ...prev,
          ...updatedPatientRemarks,
        };
      });

      setSavedRemarks((prev) => ({
        ...prev,
        ...updatedSavedRemarks,
      }));
    }
  }, [vaccinationData, consultations]);

  const handleCancelEdit = (patientId) => {
    setPatientRemarks((prev) => ({
      ...prev,
      [patientId]: savedRemarks[patientId] || "",
    }));
    setEditingRemarks((prev) => ({
      ...prev,
      [patientId]: false,
    }));
  };

  // Handle infinite scroll
  const handleScroll = throttle((e) => {
    const { target } = e;
    if (
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <=
        5 &&
      hasMore &&
      !loading
    ) {
      getApolloVaccination();
    }
  }, 500);

  // Transform vaccine data to group by patient
  const transformVaccineData = (vaccineData) => {
    const patientMap = new Map();

    vaccineData?.forEach((vaccine) => {
      const patientId = vaccine.patient_unique_id;

      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          id: patientId,
          patientId: vaccine.pm_pid,
          referenceId: vaccine.tpml_refrence_id || "",
          name: `${vaccine.pm_first_name || ""} ${
            vaccine.pm_middle_name || ""
          } ${vaccine.pm_last_name || ""}`.trim(),
          age: calculateAge(vaccine.pm_dob),
          dob: dayjs(vaccine.pm_dob).format("DD-MM-YYYY"),
          mobile: vaccine.pm_contact_no,
          doctor: vaccine.um_name,
          hospitalName: vaccine.hm_name,
          vaccines: [],
          remarks: vaccine.tvd_remarks || "",
        });
      }

      const patient = patientMap.get(patientId);
      patient.vaccines.push({
        name: vaccine.tvac_name,
        date: dayjs(vaccine.tvd_due_date).format("DD MMM YYYY"),
        status: vaccine.status,
        dueDate: vaccine.tvd_due_date,
        remarks: vaccine.tvd_remarks || "",
        tvd_id: vaccine.tvd_id,
      });
    });

    return Array.from(patientMap.values());
  };

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return 0;
    const birthDate = dayjs(dob);
    const today = dayjs();
    return today.diff(birthDate, "year");
  };

  const togglePatientSelection = (patientId) => {
    setSelectedPatients((prev) =>
      prev.includes(patientId)
        ? prev.filter((id) => id !== patientId)
        : [...prev, patientId]
    );
  };

  const toggleRowExpansion = (patientId) => {
    setExpandedRows((prev) =>
      prev.includes(patientId)
        ? prev.filter((id) => id !== patientId)
        : [...prev, patientId]
    );
  };

  const selectAllPatients = () => {
    if (selectedPatients.length === filteredVaccinationData.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredVaccinationData?.map((p) => p.id));
    }
  };

  const handleRemarksChange = (patientId, remarks) => {
    setPatientRemarks((prev) => ({
      ...prev,
      [patientId]: remarks,
    }));
  };

  const handleDownload = async (filter) => {
    let dataToDownload = [];
    setExcelLoading(true);

    if (filter === "all") {
      dataToDownload = vaccinationData;
    } else if (filter === StatusFilterOptions[1].value) {
      // Filter patients and their vaccines to only include DUE vaccines
      dataToDownload = vaccinationData
        .map((patient) => ({
          ...patient,
          vaccines: patient.vaccines.filter(
            (v) => v.status === StatusFilterOptions[1].value
          ),
        }))
        .filter((patient) => patient.vaccines.length > 0);
    } else if (filter === StatusFilterOptions[0].value) {
      // Filter patients and their vaccines to only include OVERDUE vaccines
      dataToDownload = vaccinationData
        .map((patient) => ({
          ...patient,
          vaccines: patient.vaccines.filter(
            (v) => v.status === StatusFilterOptions[0].value
          ),
        }))
        .filter((patient) => patient.vaccines.length > 0);
    } else if (filter === "selected") {
      dataToDownload = vaccinationData.filter((patient) =>
        selectedPatients.includes(patient.id)
      );
    }

    // Create CSV content
    const csvContent = [
      [
        "Hosptial Name",
        "Patient Name",
        "DOB",
        "Age",
        "Patient ID",
        "Ref/MRN Id",
        "Mobile",
        "Doctor",
        "Due Date",
        "Vaccines",
        "Status",
        "Remarks",
      ].join(","),
      ...dataToDownload.flatMap((patient) =>
        patient.vaccines.map((vaccine) =>
          [
            patient.hospitalName,
            patient.name,
            patient.dob,
            patient.age,
            patient.patientId,
            patient.referenceId,
            patient.mobile,
            patient.doctor,
            vaccine.dueDate,
            vaccine.name,
            vaccine.status,
            patientRemarks[patient.id] || patient.remarks || "",
          ].join(",")
        )
      ),
    ].join("\n");

    // Build XLSX from rows
    const rows = csvContent.split("\n").map((line) => line.split(","));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analytics");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const fileName = `vaccination-analytics-${filter}-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    if (!isChrome && !isSafari) {
      const file = new File([blob], fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const formData = new FormData();
      formData.append(file.name, file);
      const res = await uploadDocsToAzure(formData);
      const printUrl = res?.[0]?.url;
      sendMessageToParent(EVENTS.DOWNLOAD, { url: printUrl });
    } else {
      saveAs(blob, fileName);
    }
    setExcelLoading(false);
  };

  // Create custom dropdown for download options
  const downloadDropdown = (
    <div
      style={{
        padding: "16px",
        minWidth: "200px",
        backgroundColor: "white",
        border: "1px solid #d9d9d9",
        borderRadius: "6px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Text
        style={{
          fontWeight: 500,
          color: "#262626",
          marginBottom: "12px",
          display: "block",
        }}
      >
        Download Options
      </Text>

      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="downloadOption"
            value="all"
            checked={selectedDownloadOption === "all"}
            onChange={(e) => {
              setSelectedDownloadOption(e.target.value);
            }}
            style={{ color: "#4b4ad5" }}
          />
          <Text style={{ fontSize: "14px" }}>All Patients</Text>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="downloadOption"
            value={StatusFilterOptions[1].value}
            checked={selectedDownloadOption === StatusFilterOptions[1].value}
            onChange={(e) => {
              setSelectedDownloadOption(e.target.value);
            }}
            style={{ color: "#4b4ad5" }}
          />
          <Text style={{ fontSize: "14px" }}>
            {StatusFilterOptions[1].label}
          </Text>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="downloadOption"
            value={StatusFilterOptions[0].value}
            checked={selectedDownloadOption === StatusFilterOptions[0].value}
            onChange={(e) => {
              setSelectedDownloadOption(e.target.value);
            }}
            style={{ color: "#4b4ad5" }}
          />
          <Text style={{ fontSize: "14px" }}>
            {StatusFilterOptions[0].label}
          </Text>
        </label>
      </div>

      <Button
        className={`lmpBtn w-100 ${
          !selectedDownloadOption ? "disabledBtn" : ""
        }`}
        type="primary"
        onClick={() => {
          handleDownload(selectedDownloadOption);
          setShowDownloadOptions(false);
          setSelectedDownloadOption(null);
        }}
        disabled={!selectedDownloadOption}
        loading={excelLoading}
        style={{
          opacity: !selectedDownloadOption ? 0.5 : 1,
          cursor: !selectedDownloadOption ? "not-allowed" : "pointer",
        }}
      >
        Download CSV
      </Button>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "white",
        padding: "24px",
        position: "relative",
        borderRadius: "10px",
      }}
    >
      {isAdmin === 0 && (
        <div
          style={{
            fontSize: "20px",
            fontWeight: 600,
            marginBottom: "24px",
          }}
        >
          Vaccination Analytics
        </div>
      )}
      <div style={{ maxWidth: "1200px", margin: "0" }}>
        {/* Top Filter Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e);
              setDateFrom(dayjs());
              setDateTo(dayjs());
            }}
            style={{ width: 120, textAlign: "left" }}
          >
            {StatusFilterOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>

          {isAdmin > 0 && doctors?.length > 0 && (
            <Select
              value={selectedDoctor}
              onChange={setSelectedDoctor}
              style={{ width: 200, textAlign: "left" }}
              placeholder="Select Doctor"
            >
              <Option key="all" value="all">
                All Doctors
              </Option>
              {doctors.map((doctor, index) => {
                return (
                  <Option key={doctor.value || index} value={doctor.value}>
                    {doctor.text || doctor.value}
                  </Option>
                );
              })}
            </Select>
          )}

          <DatePicker
            placeholder="Select Date"
            onChange={(_, d) => {
              // Prevent clearing the date
              if (!d) return;
              setDateFrom(dayjs(d, "DD-MM-YYYY"));
            }}
            format={{
              format: "DD-MM-YYYY",
              type: "mask",
            }}
            value={dateFrom}
            allowClear={false}
            style={{
              height: "38px",
              width: "130px",
            }}
            disabledDate={(current) => {
              // Disable dates based on status filter
              const statusDisabled =
                statusFilter === StatusFilterOptions[0].value
                  ? current && current > dayjs()
                  : current && current < dayjs();

              // Disable dates after dateTo
              const dateRangeDisabled = dateTo && current && current > dateTo;

              return statusDisabled || dateRangeDisabled;
            }}
          />

          <DatePicker
            placeholder="Select Date"
            onChange={(_, d) => {
              // Prevent clearing the date
              if (!d) return;
              setDateTo(dayjs(d, "DD-MM-YYYY"));
            }}
            format={{
              format: "DD-MM-YYYY",
              type: "mask",
            }}
            value={dateTo}
            allowClear={false}
            style={{
              height: "38px",
              width: "130px",
            }}
            disabledDate={(current) => {
              // Disable dates based on status filter
              const statusDisabled =
                statusFilter === StatusFilterOptions[0].value
                  ? current && current > dayjs()
                  : current && current < dayjs();

              // Disable dates before dateFrom
              const dateRangeDisabled =
                dateFrom && current && current < dateFrom;

              return statusDisabled || dateRangeDisabled;
            }}
          />
        </div>

        {/* Patient Selection Header with Download Options */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* <Checkbox
              checked={
                selectedPatients.length === vaccinationData.length &&
                vaccinationData.length > 0
              }
              onChange={selectAllPatients}
            /> */}
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#9CA3AF",
                flexShrink: 0,
              }}
              className="text-gray-700"
            />
            <Text style={{ color: "#262626", fontWeight: 500 }}>
              Total Patient Count:{" "}
              {selectedPatients.length > 0
                ? selectedPatients.length
                : filteredVaccinationData.length}{" "}
            </Text>
          </div>

          {/* Download Section */}
          <div className="download-modal-container">
            <Dropdown
              overlay={downloadDropdown}
              trigger={["click"]}
              placement="bottomRight"
              open={showDownloadOptions}
              onOpenChange={setShowDownloadOptions}
              disabled={
                dateFrom &&
                dateTo &&
                dayjs(dateTo).diff(dayjs(dateFrom), "days") <= 7
                  ? false
                  : true
              }
            >
              <div className="d-flex justify-content-between align-items-center billing-download">
                <Button
                  loading={excelLoading}
                  disabled={
                    dateFrom &&
                    dateTo &&
                    dayjs(dateTo).diff(dayjs(dateFrom), "days") <= 7
                      ? false
                      : true
                  }
                  className="btn btn-input rounded-1 px-2 ms-2"
                >
                  <i className="icon-download" />
                </Button>
              </div>
            </Dropdown>
          </div>
        </div>

        {/* Patient List */}
        <div
          style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}
          onScroll={handleScroll}
        >
          {loading && filteredVaccinationData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px" }}>
              <Text>Loading vaccination data...</Text>
            </div>
          ) : (
            filteredVaccinationData &&
            filteredVaccinationData?.map((patient, index) => (
              <div key={patient.id}>
                {/* Patient Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px",
                    backgroundColor: index % 2 === 0 ? "white" : "#fafafa",
                    borderRadius: "10px",
                  }}
                >
                  {/* Left: Checkbox and Patient Info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      flex: 1,
                    }}
                  >
                    {/* Bullet Point */}
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#4b4ad5",
                        flexShrink: 0,
                      }}
                    />
                    {/* Patient Info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          flex: 6,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            flex: 2,
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          className="text-primary"
                          onClick={() => toggleRowExpansion(patient.id)}
                        >
                          {patient.name}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flex: 4,
                            flexDirection: "column",
                            alignItems: "baseline",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "15px",
                            }}
                          >
                            <span style={{ color: "#595959", fontSize: 14 }}>
                              <b style={{ fontWeight: 600 }}>ID:</b>{" "}
                              {patient.patientId}
                            </span>
                            {patient.referenceId && (
                              <span style={{ color: "#595959", fontSize: 14 }}>
                                <b style={{ fontWeight: 600 }}>Ref/MRN Id:</b>{" "}
                                {patient.referenceId}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              color: "#595959",
                              fontSize: 14,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <UserOutlined
                              style={{ color: "#d9d9d9", marginRight: 4 }}
                            />{" "}
                            <b style={{ fontWeight: 600 }}>{"Age: "}</b>{" "}
                            {patient.age}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Right: Vaccine Count and Expand Button */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Text style={{ fontSize: "14px", color: "#4b4ad5" }}>
                      {patient.vaccines.length} Vaccine
                      {patient.vaccines.length !== 1 ? "s" : ""}
                    </Text>
                    <Button
                      type="text"
                      className={
                        expandedRows.includes(patient.id)
                          ? "iconrotatehistory90"
                          : "iconrotate270"
                      }
                      onClick={() => toggleRowExpansion(patient.id)}
                      icon={<i className="icon-right" />}
                      style={{ color: "#d9d9d9" }}
                    />
                  </div>
                </div>

                {/* Expanded Vaccine Details */}
                {expandedRows.includes(patient.id) && (
                  <div
                    style={{
                      backgroundColor: index % 2 === 0 ? "#fafafa" : "white",
                      borderTop: "1px solid #f0f0f0",
                      borderRadius: "10px",
                    }}
                  >
                    {patient.vaccines.map((vaccine, vIndex) => (
                      <div
                        key={vIndex}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 48px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <Text style={{ color: "#262626" }}>
                            {vaccine.name}
                          </Text>
                        </div>
                        <Text style={{ color: "#595959", fontSize: "14px" }}>
                          {vaccine.date}
                        </Text>
                      </div>
                    ))}

                    {/* Remarks Section */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        padding: "16px 48px",
                        borderTop: "1px solid #d9d9d9",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#262626",
                          marginBottom: "8px",
                          textAlign: "left",
                        }}
                      >
                        Remarks
                      </label>

                      {!editingRemarks[patient.id] &&
                      savedRemarks[patient.id] ? (
                        // Display saved remarks with edit icon
                        <div style={{ position: "relative" }}>
                          <div
                            style={{
                              padding: "12px",
                              backgroundColor: "#f9f9f9",
                              borderRadius: "6px",
                              border: "1px solid #d9d9d9",
                              paddingRight: "40px",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "14px",
                                color: "#262626",
                                whiteSpace: "pre-wrap",
                                margin: 0,
                                textAlign: "left",
                              }}
                            >
                              {savedRemarks[patient.id]}
                            </p>
                          </div>
                          <Button
                            type="text"
                            size="small"
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              height: "24px",
                              width: "24px",
                              padding: 0,
                              color: "#595959",
                            }}
                            onClick={() => handleEditRemarks(patient.id)}
                          >
                            <i className="icon-Edit me-2 fs-21" />
                          </Button>
                        </div>
                      ) : (
                        // Edit mode or no saved remarks
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <Input.TextArea
                            value={
                              patientRemarks[patient.id] ||
                              patient.remarks ||
                              ""
                            }
                            onChange={(e) =>
                              handleRemarksChange(patient.id, e.target.value)
                            }
                            placeholder="Add remarks for this patient..."
                            rows={3}
                            style={{ width: "100%" }}
                          />
                          <div style={{ display: "flex", gap: "8px" }}>
                            <Button
                              className="lmpBtn"
                              type="primary"
                              style={{ width: "85px" }}
                              onClick={() => {
                                handleSubmitRemarks(patient);
                              }}
                              disabled={!patientRemarks[patient.id]?.trim()}
                            >
                              {savedRemarks[patient.id] ? "Update" : "Submit"}
                            </Button>
                            {savedRemarks[patient.id] && (
                              <Button
                                type="default"
                                style={{ width: "85px" }}
                                onClick={() => handleCancelEdit(patient.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Loading more indicator */}
        {loading && filteredVaccinationData.length > 0 && (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <Spin size="small" />
          </div>
        )}

        {/* No patients message */}
        {!loading && filteredVaccinationData?.length === 0 && (
          <div
            style={{ textAlign: "center", padding: "32px", color: "#8c8c8c" }}
          >
            <Text>No patients found for the selected filters.</Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default VaccinationAnalytics;
