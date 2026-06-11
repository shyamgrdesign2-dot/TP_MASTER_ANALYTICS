import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  DatePicker,
  Input,
  Space,
  Typography,
  message,
  Modal,
  Button,
  Tabs,
} from "antd";
import {
  fetchApolloConsultations,
  fetchApolloDoctors,
  updateConsultationRemarks,
} from "./service";
import moment from "moment";
import dayjs from "dayjs";

import { isChrome, isMobile, isSafari } from "react-device-detect";
import SidebarDoctor from "../../common/SidebarDoctor";
import Header from "../../common/Header";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { throttle, debounce } from "lodash";

import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import VaccinationAnalytics from "./VaccinationAnalytics";
import "./ApolloConsultations.scss";
import { getDecodedToken } from "../../utils/localStorage";
import { PAEDIATRIC_DP_ID } from "../../utils/constants";
import { sendMessageToParent } from "../../utils/utils";
import { EVENTS } from "../../utils/events";
import { uploadDocsToAzure } from "../medicalRecords/service";
import { ASSETS } from "../../assets";
const editIcon = ASSETS.images.edit;

const { Text } = Typography;

const ConsultationDetailsPage = () => {
  const [consultations, setConsultations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: moment(),
    endDate: moment(),
    selectedDoctors: [],
    search: "",
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [remarksModalVisible, setRemarksModalVisible] = useState(false);
  const [editedRemarks, setEditedRemarks] = useState("");
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const isApolloConsultationsEnabled = useFeatureIsOn("apollo-consultations");
  const [searchText, setSearchText] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [visibleModal, setVisibleModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", list: [] });
  const MAX_REMARKS_LENGTH = 50;
  const [excelLoading, setExcelLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("patient");
  const decodedToken = getDecodedToken();
  const isAdmin = decodedToken?.result?.admin;

  useEffect(() => {
    if (doctors?.length > 0) {
      fetchConsultations(true);
    }
  }, [filters, doctors]);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  // Fetch consultations
  const fetchConsultations = async (resetData = false) => {
    if (!hasMore && !resetData) return;
    setLoading(true);
    try {
      const params = {
        page: resetData ? 1 : page,
        startDate: filters.startDate?.format("YYYY-MM-DD"),
        endDate: filters.endDate?.format("YYYY-MM-DD"),
        umIds:
          filters?.selectedDoctors?.length > 0
            ? filters.selectedDoctors?.join(",")
            : doctors?.map((doc) => doc.value)?.join(","),
        search: filters.search || "",
      };
      const { consultationsList, totalCount } = await fetchApolloConsultations(
        params
      );
      setConsultations((prev) => {
        return resetData
          ? [...consultationsList]
          : [...prev, ...consultationsList];
      });

      setTotalRecords(totalCount);
      setPage(resetData ? 2 : page + 1);
      setHasMore(consultationsList.length > 0);
    } catch (error) {
      message.error("Failed to fetch consultations");
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctors
  const fetchDoctors = async () => {
    try {
      const response = await fetchApolloDoctors();
      const doctorList = response.map((doc) => ({
        text: doc.doctorName,
        value: doc.um_id,
        dp_id: doc.dp_id,
      }));
      setDoctors(doctorList);
    } catch (error) {
      message.error("Failed to fetch doctors");
    }
  };

  const updateRemarks = async () => {
    if (!selectedConsultation) return;

    try {
      await updateConsultationRemarks({
        tcm_id: selectedConsultation.tcm_id,
        remarks: editedRemarks,
      });

      // Update local state
      setConsultations((prev) =>
        prev.map((consultation) =>
          consultation.tcm_id === selectedConsultation.tcm_id
            ? { ...consultation, remarks: editedRemarks }
            : consultation
        )
      );

      message.success("Remarks updated successfully");

      // Close modal
      setRemarksModalVisible(false);
      setSelectedConsultation(null);
      setEditedRemarks("");
    } catch (error) {
      message.error("Failed to update remarks");
    }
  };

  // Handle infinite scroll
  const handleTableScroll = throttle((e) => {
    const { target } = e;
    if (
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <=
        5 &&
      hasMore &&
      !loading
    ) {
      fetchConsultations();
    }
  }, 500);

  // Table columns configuration
  const columns = [
    {
      title: "Patient Name (Apollo ID)",
      dataIndex: "patientName",
      key: "patientName",
      render: (text, record) => (
        <Space direction="vertical">
          <Text>{text}</Text>
          <Text type="secondary">
            {record.apolloId ? `(${record.apolloId})` : ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Consultation Date & Time",
      dataIndex: "consultationDateTime",
      key: "consultationDateTime",
      render: (datetime) => moment.utc(datetime).format("DD/MM/YY hh:mm A"),
    },
    {
      title: "Doctor Name",
      dataIndex: "doctorName",
      key: "doctorName",
      ellipsis: true,
      filteredValue: filters.selectedDoctors,
      filters: doctors,
    },
    {
      title: "Investigations",
      dataIndex: "investigations",
      key: "investigations",
      align: "center",
      render: (investigations, record) => {
        let investigationList = investigations || [];
        if (record?.voiceRx?.labInvestigation?.length > 0) {
          investigationList = record?.voiceRx?.labInvestigation?.map((item) => item?.lineItem) || [];
        }
          return investigationList.length > 0 ? (
            <Button
              type="link"
              onClick={() => {
                setModalContent({
                  title: "Investigations",
                  list: investigationList,
                });
                setVisibleModal(true);
              }}
              className="show-more-link"
            >
              View {record?.voiceRx?.labInvestigation?.length > 0 ? `(voice)` : ""}
            </Button>
          ) : (
            ""
          );
      },
    },
    {
      title: "Additional Investigations",
      dataIndex: "dynamicModules",
      key: "additionalInvestigations",
      align: "center",
      render: (dynamicModules) => {
        const crossConsultData = dynamicModules?.find(
          (item) =>
            item?.name ===
            "Additional Investigation (Not Found in Standard Master List)"
        );
        return crossConsultData?.content?.length > 0 ? (
          <Button
            type="link"
            style={{ color: "#4B4AD5" }}
            onClick={() => {
              setModalContent({
                title: crossConsultData?.name,
                list: crossConsultData?.content?.map((item) => item.title),
              });
              setVisibleModal(true);
            }}
            className="show-more-link"
          >
            View
          </Button>
        ) : (
          ""
        );
      },
    },
    {
      title: "Surgeries",
      dataIndex: "surgeries",
      key: "surgeries",
      align: "center",
      render: (surgeries) =>
        surgeries && surgeries.length > 0 ? (
          <Button
            type="link"
            style={{ color: "#4B4AD5" }}
            onClick={() => {
              setModalContent({
                title: "Surgeries",
                list: surgeries,
              });
              setVisibleModal(true);
            }}
            className="show-more-link"
          >
            View
          </Button>
        ) : (
          ""
        ),
    },
    {
      title: "Cross Consult",
      dataIndex: "dynamicModules",
      key: "crossConsult",
      align: "center",
      render: (dynamicModules) => {
        const crossConsultData = dynamicModules?.find(
          (item) => item?.name === "Cross Consult / Referred to"
        );
        return crossConsultData?.content?.length > 0 ? (
          <Button
            type="link"
            style={{ color: "#4B4AD5" }}
            onClick={() => {
              setModalContent({
                title: crossConsultData?.name,
                list: crossConsultData?.content?.map((item) => item.title),
              });
              setVisibleModal(true);
            }}
            className="show-more-link"
          >
            View
          </Button>
        ) : (
          ""
        );
      },
    },
    {
      title: "Vaccinations",
      dataIndex: "vaccinations",
      key: "vaccinations",
      align: "center",
      render: (vaccinations) =>
        vaccinations && vaccinations.length > 0 ? (
          <Button
            type="link"
            onClick={() => {
              setModalContent({
                title: "Vaccinations",
                list: vaccinations,
              });
              setVisibleModal(true);
            }}
            className="show-more-link"
          >
            View
          </Button>
        ) : (
          ""
        ),
    },
    {
      title: "Vaccination Packages",
      dataIndex: "dynamicModules",
      key: "vaccinePackages",
      align: "center",
      render: (dynamicModules) => {
        const vaccinationPackageData = dynamicModules?.find(
          (item) => item?.name === "Vaccination Packages"
        );
        return vaccinationPackageData?.content?.length > 0 ? (
          <Button
            type="link"
            style={{ color: "#4B4AD5" }}
            onClick={() => {
              setModalContent({
                title: vaccinationPackageData?.name,
                list: vaccinationPackageData?.content?.map(
                  (item) => item.title
                ),
              });
              setVisibleModal(true);
            }}
            className="show-more-link"
          >
            View
          </Button>
        ) : (
          ""
        );
      },
    },

    {
      title: "Remarks",
      key: "remarks",
      width: 90,
      render: (_, record) => {
        const remarks = record.remarks || "";
        const isTruncated = remarks.length > MAX_REMARKS_LENGTH;

        return (
          <div style={{ wordWrap: "break-word", whiteSpace: "normal" }}>
            {isTruncated
              ? `${remarks.substring(0, MAX_REMARKS_LENGTH)}...`
              : remarks}
            {isTruncated ? (
              <Button
                type="link"
                onClick={() => {
                  setSelectedConsultation(record);
                  setEditedRemarks(record.remarks || "");
                  setRemarksModalVisible(true);
                }}
                className="show-more-link"
                style={{ padding: 0 }}
              >
                Show More
              </Button>
            ) : (
              <img
                src={editIcon}
                alt="Edit remarks"
                onClick={() => {
                  setSelectedConsultation(record);
                  setEditedRemarks(record.remarks || "");
                  setRemarksModalVisible(true);
                }}
                className="cursor-pointer"
              />
            )}
          </div>
        );
      },
    },
  ];

  const handleStartDateChange = (date) => {
    setFilters((prev) => ({
      ...prev,
      startDate: date,
    }));
  };

  const handleEndDateChange = (date) => {
    setFilters((prev) => ({
      ...prev,
      endDate: date,
    }));
  };

  const handleChange = (_, filters) => {
    setFilters((prev) => ({
      ...prev,
      selectedDoctors: filters.doctorName,
    }));
  };

  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setFilters((prev) => ({
          ...prev,
          search: value,
        }));
      }, 500), // Delay for 500ms
    []
  );

  const exportToExcel = async () => {
    try {
      const params = {
        page: 1,
        startDate: filters.startDate?.format("YYYY-MM-DD"),
        endDate: filters.endDate?.format("YYYY-MM-DD"),
        umIds:
          filters?.selectedDoctors?.length > 0
            ? filters.selectedDoctors?.join(",")
            : doctors?.map((doc) => doc.value)?.join(","),
        search: filters.search || "",
        download: true,
      };
      setExcelLoading(true);
      const { consultationsList } = await fetchApolloConsultations(params);
      const workSheetColumnNames = [
        "Patient Name",
        "Apollo ID",
        "Consultation Date & Time",
        "Doctor Name",
        "Investigations",
        "Additional Investigations",
        "Surgeries",
        "Cross Consult",
        "Vaccinations",
        "Vaccination Packages",
        "Remaks",
      ];

      const data = [];
      consultationsList.map((e) => {
        let crossConsultList = [],
          vaccinationPackagesList = [],
          additionalInvestigationsList = [];
        const crossConsultData = e?.dynamicModules?.find(
          (item) => item?.name === "Cross Consult / Referred to"
        );
        if (crossConsultData?.content?.length > 0) {
          crossConsultList = crossConsultData?.content?.map(
            (item) => item.title
          );
        }
        const vaccinationPackageData = e?.dynamicModules?.find(
          (item) => item?.name === "Vaccination Packages"
        );
        if (vaccinationPackageData?.content?.length > 0) {
          vaccinationPackagesList = vaccinationPackageData?.content?.map(
            (item) => item.title
          );
        }
        const additionalInvestigationsData = e?.dynamicModules?.find(
          (item) =>
            item?.name ===
            "Additional Investigation (Not Found in Standard Master List)"
        );
        if (additionalInvestigationsData?.content?.length > 0) {
          additionalInvestigationsList =
            additionalInvestigationsData?.content?.map((item) => item.title);
        }

        const sizes = [
          { name: "investigation", size: e?.investigations?.length },
          {
            name: "additionalInvestigations",
            size: additionalInvestigationsList?.length,
          },
          { name: "vaccination", size: e?.vaccinations?.length },
          { name: "surgerie", size: e?.surgeries?.length },
          { name: "crossConsult", size: crossConsultList?.length },
          {
            name: "vaccinationPackages",
            size: vaccinationPackagesList?.length,
          },
        ];

        const largest = sizes.reduce((max, current) =>
          current.size > max.size ? current : max
        );

        if (largest?.size > 0) {
          if (largest?.name === "investigation") {
            e?.investigations.map((item, index) => {
              data.push([
                e?.patientName,
                e?.apolloId,
                moment.utc(e?.consultationDateTime).format("DD/MM/YY hh:mm A"),
                e?.doctorName,
                item,
                additionalInvestigationsList[index] !== undefined
                  ? additionalInvestigationsList[index]
                  : "",
                e?.surgeries[index] !== undefined ? e?.surgeries[index] : "",
                crossConsultList[index] !== undefined
                  ? crossConsultList[index]
                  : "",
                e?.vaccinations[index] !== undefined
                  ? e?.vaccinations[index]
                  : "",
                vaccinationPackagesList[index] !== undefined
                  ? vaccinationPackagesList[index]
                  : "",
                e?.remarks,
              ]);
            });
          } else if (largest?.name === "additionalInvestigations") {
            additionalInvestigationsList.map((item, index) => {
              data.push([
                e?.patientName,
                e?.apolloId,
                moment.utc(e?.consultationDateTime).format("DD/MM/YY hh:mm A"),
                e?.doctorName,
                e?.investigations[index] !== undefined
                  ? e?.investigations[index]
                  : "",
                item,
                e?.surgeries[index] !== undefined ? e?.surgeries[index] : "",
                crossConsultList[index] !== undefined
                  ? crossConsultList[index]
                  : "",
                e?.vaccinations[index] !== undefined
                  ? e?.vaccinations[index]
                  : "",
                vaccinationPackagesList[index] !== undefined
                  ? vaccinationPackagesList[index]
                  : "",
                e?.remarks,
              ]);
            });
          } else if (largest?.name === "vaccination") {
            e?.vaccinations.map((item, index) => {
              data.push([
                e?.patientName,
                e?.apolloId,
                moment.utc(e?.consultationDateTime).format("DD/MM/YY hh:mm A"),
                e?.doctorName,
                e?.investigations[index] !== undefined
                  ? e?.investigations[index]
                  : "",
                additionalInvestigationsList[index] !== undefined
                  ? additionalInvestigationsList[index]
                  : "",
                e?.surgeries[index] !== undefined ? e?.surgeries[index] : "",
                crossConsultList[index] !== undefined
                  ? crossConsultList[index]
                  : "",
                item,
                vaccinationPackagesList[index] !== undefined
                  ? vaccinationPackagesList[index]
                  : "",
                e?.remarks,
              ]);
            });
          } else if (largest?.name === "surgerie") {
            e?.vaccinations.map((item, index) => {
              data.push([
                e?.patientName,
                e?.apolloId,
                moment.utc(e?.consultationDateTime).format("DD/MM/YY hh:mm A"),
                e?.doctorName,
                e?.investigations[index] !== undefined
                  ? e?.investigations[index]
                  : "",
                additionalInvestigationsList[index] !== undefined
                  ? additionalInvestigationsList[index]
                  : "",
                item,
                crossConsultList[index] !== undefined
                  ? crossConsultList[index]
                  : "",
                e?.vaccinations[index] !== undefined
                  ? e?.vaccinations[index]
                  : "",
                vaccinationPackagesList[index] !== undefined
                  ? vaccinationPackagesList[index]
                  : "",
                e?.remarks,
              ]);
            });
          } else if (largest?.name === "crossConsult") {
            crossConsultList.map((item, index) => {
              data.push([
                e?.patientName,
                e?.apolloId,
                moment.utc(e?.consultationDateTime).format("DD/MM/YY hh:mm A"),
                e?.doctorName,
                e?.investigations[index] !== undefined
                  ? e?.investigations[index]
                  : "",
                additionalInvestigationsList[index] !== undefined
                  ? additionalInvestigationsList[index]
                  : "",
                e?.surgeries[index] !== undefined ? e?.surgeries[index] : "",
                item,
                e?.vaccinations[index] !== undefined
                  ? e?.vaccinations[index]
                  : "",
                vaccinationPackagesList[index] !== undefined
                  ? vaccinationPackagesList[index]
                  : "",
                e?.remarks,
              ]);
            });
          } else if (largest?.name === "vaccinationPackages") {
            vaccinationPackagesList.map((item, index) => {
              data.push([
                e?.patientName,
                e?.apolloId,
                moment.utc(e?.consultationDateTime).format("DD/MM/YY hh:mm A"),
                e?.doctorName,
                e?.investigations[index] !== undefined
                  ? e?.investigations[index]
                  : "",
                additionalInvestigationsList[index] !== undefined
                  ? additionalInvestigationsList[index]
                  : "",
                e?.surgeries[index] !== undefined ? e?.surgeries[index] : "",
                crossConsultList[index] !== undefined
                  ? crossConsultList[index]
                  : "",
                e?.vaccinations[index] !== undefined
                  ? e?.vaccinations[index]
                  : "",
                item,
                e?.remarks,
              ]);
            });
          }
        } else {
          data.push([
            e?.patientName,
            e?.apolloId,
            moment.utc(e?.consultationDateTime).format("DD/MM/YY hh:mm A"),
            e?.doctorName,
            e?.investigations.join(", "),
            e?.vaccinations.join(", "),
            e?.surgeries.join(", "),
            crossConsultList.join(", "),
            vaccinationPackagesList.join(", "),
            e?.remarks,
          ]);
        }
      });

      const workSheetData = [workSheetColumnNames, ...data];
      const worksheet = XLSX.utils.aoa_to_sheet(workSheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      if (!isChrome && !isSafari) {
        const file = new File([blob], "Apollo.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const formData = new FormData();
        formData.append(file?.name, file);
        const res = await uploadDocsToAzure(formData);
        const printUrl = res?.[0]?.url;
        sendMessageToParent(EVENTS.DOWNLOAD, { url: printUrl });
      } else {
        saveAs(blob, `Apollo.xlsx`);
      }
      setExcelLoading(false);
    } catch (error) {
      message.error("Failed to fetch consultations");
    }
  };

  return (
    isApolloConsultationsEnabled && (
      <>
        <Header />
        <div className="d-flex">
          <SidebarDoctor />
          <div
            className={`w-100 bg-body ${isMobile ? "vh-100" : "wrapper"}`}
            style={{ padding: "20px" }}
          >
            {isAdmin ? (
              <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                style={{ marginBottom: "20px" }}
                className="apollo-analytics-tab"
              >
                <Tabs.TabPane tab="Patient Analytics" key="patient">
                  <Space
                    className="position-relative"
                    direction="vertical"
                    style={{ gap: "20px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Space>
                        <DatePicker
                          value={
                            filters.startDate ? dayjs(filters.startDate) : ""
                          }
                          onChange={handleStartDateChange}
                          format="DD-MM-YYYY"
                          placeholder="Start Date"
                          disabledDate={
                            (current) =>
                              current &&
                              current > dayjs(filters?.endDate).endOf("day") // Disable dates after the selected end date
                          }
                        />
                        <DatePicker
                          value={filters.endDate ? dayjs(filters.endDate) : ""}
                          onChange={handleEndDateChange}
                          format="DD-MM-YYYY"
                          placeholder="End Date"
                          disabledDate={(current) =>
                            current &&
                            (current <
                              dayjs(filters?.startDate).startOf("day") ||
                              current >= moment().add(1, "days").startOf("day"))
                          }
                        />
                        <b>Total Count: {totalRecords}</b>
                        <Button
                          onClick={exportToExcel}
                          loading={excelLoading}
                          className="btn btn-input rounded-1 px-2 ms-2"
                          disabled={
                            filters?.startDate &&
                            filters?.endDate &&
                            dayjs(filters?.endDate).diff(
                              dayjs(filters?.startDate),
                              "days"
                            ) <= 7
                              ? false
                              : true
                          }
                        >
                          <i className="icon-download"></i>
                        </Button>
                      </Space>
                      <Input
                        placeholder="Search by Patient Name or Apollo ID"
                        allowClear
                        onChange={(e) => {
                          setSearchText(e.target.value); // Update search state
                          debouncedSearch(e.target.value); // Trigger debounced API call
                        }}
                        value={searchText}
                        style={{ width: 300 }}
                      />
                    </div>
                    <Table
                      columns={columns}
                      dataSource={consultations}
                      rowKey="tcm_id"
                      loading={loading}
                      pagination={false}
                      scroll={{ y: 500 }}
                      onScroll={handleTableScroll}
                      onChange={handleChange}
                      bordered
                      className="customize-table apollo-consultations-table"
                      tableLayout="fixed"
                    />
                  </Space>
                </Tabs.TabPane>
                <Tabs.TabPane tab="Vaccination Analytics" key="vaccination">
                  <div style={{ textAlign: "center" }}>
                    <VaccinationAnalytics
                      doctors={doctors?.filter(
                        (doc) => doc.dp_id == PAEDIATRIC_DP_ID
                      )}
                    />
                  </div>
                </Tabs.TabPane>
              </Tabs>
            ) : (
              <VaccinationAnalytics doctors={doctors} />
            )}
            <Modal
              title="Edit Remarks"
              open={remarksModalVisible}
              onCancel={() => setRemarksModalVisible(false)}
              footer={[
                <Button
                  key="cancel"
                  onClick={() => setRemarksModalVisible(false)}
                >
                  Cancel
                </Button>,
                <Button key="save" type="primary" onClick={updateRemarks}>
                  Save Remarks
                </Button>,
              ]}
            >
              {selectedConsultation && (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text strong>Doctor:</Text>
                  <Text>{selectedConsultation.doctorName}</Text>
                  <Text strong>Patient:</Text>
                  <Text>{selectedConsultation.patientName}</Text>
                  <Text strong>Consultation Date:</Text>
                  <Text>
                    {moment(selectedConsultation.consultationDateTime).format(
                      "DD/MM/YY hh:mm A"
                    )}
                  </Text>
                  <Text strong>Remarks:</Text>
                  <Input.TextArea
                    value={editedRemarks}
                    onChange={(e) => setEditedRemarks(e.target.value)}
                    autoSize={{ minRows: 4, maxRows: 8 }}
                    placeholder="Enter remarks here"
                  />
                </Space>
              )}
            </Modal>
            <Modal
              title={modalContent.title}
              open={visibleModal}
              onCancel={() => setVisibleModal(false)}
              footer={[
                <Button key="close" onClick={() => setVisibleModal(false)}>
                  Close
                </Button>,
              ]}
            >
              {modalContent.list && modalContent.list.length > 0 ? (
                <ul>
                  {modalContent.list.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <Text>No data available</Text>
              )}
            </Modal>
          </div>
        </div>
      </>
    )
  );
};

export default ConsultationDetailsPage;
