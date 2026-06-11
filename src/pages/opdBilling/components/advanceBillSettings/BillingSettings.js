import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Table, Space, Typography, Tooltip } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import styles from "./BillingSettings.module.css";
import {
  deleteBillItem,
  fetchAdvanceSetting,
  listBillItem,
  searchBillItem,
} from "../../service";
import AdvanceBillSettings from "./AdvanceSettings";
import { useNavigate } from "react-router-dom";
import ServiceItemPopup from "../serviceItemPopup/ServiceItemPopup";
import CommonModal from "../../../../common/CommonModal";

import { debounce } from "lodash";
import { setAdvancedSettings } from "../../../../redux/billingSlice";
import { useDispatch } from "react-redux";
import { getClinic, trackEvent, getClinicName } from "../../../../utils/utils";
import { useSelector } from "react-redux";

import LoopingVideo from "../../../../components/common/LoopingVideo";
import VideoModal from "../../../../common/VideoModal";
import { Popover } from "antd";
import { ASSETS } from "../../../../assets";
const {
  alerticon: alertIcon,
  tubeIcon: playIcons,
  tutorialIcon: tutorial,
  videorotate_2: videorotateWebm,
  videorotate: videorotateMp4,
} = ASSETS.images;

const { Title } = Typography;

const BillingSettings = () => {
  const [searchText, setSearchText] = useState("");
  const [showAdvanceSettings, setShowAdvanceSettings] = useState(false);
  const navigate = useNavigate();
  const [actionType, setActionType] = useState("");
  const [billItems, setBillItems] = useState([]);
  const [billItemsSummary, setBillItemsSummary] = useState({});
  const [isDeleteModuleModalOpen, setIsDeleteModuleModalOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
  });

  const [filteredInfo, setFilteredInfo] = useState({
    type: params.type ? [params.type] : null,
  });

  const [sortedInfo, setSortedInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editIndex, setEditIndex] = useState(-1);
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.doctors);

  const [popOverVideo, setPopOverVideo] = useState(false);
  const [videoLink, setVideoLink] = useState(null);
  const { videoList } = useSelector((state) => state.doctors);
  const { advancedSettings } = useSelector((state) => state.billing);

  const columns = [
    {
      title: "ITEMS/SERVICES",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "TYPE",
      dataIndex: "type",
      key: "type",
      filters: [
        { text: "Service", value: "Service" },
        { text: "Consumables", value: "Consumables" },
      ],
      filteredValue: filteredInfo.type || null,
      filterMultiple: false,
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "PRICE PER UNIT",
      dataIndex: "price",
      key: "price",
      sorter: true,
      sortOrder: sortedInfo.columnKey === "price" && sortedInfo.order,
      render: (value) => (value ? `₹${value}` : "-"),
    },
    {
      title: "DISCOUNT",
      dataIndex: "discount",
      key: "discount",
      sorter: true,
      sortOrder: sortedInfo.columnKey === "discount" && sortedInfo.order,
      render: (value) => (value ? `₹${value}` : "-"),
    },
    {
      title: "GST (%)",
      dataIndex: "gst",
      key: "gst",
      sorter: true,
      sortOrder: sortedInfo.columnKey === "gst" && sortedInfo.order,
      render: (value) => (value ? `${value}%` : "-"),
    },
    {
      title: "TOTAL AMOUNT",
      dataIndex: "totalAmount",
      key: "totalAmount",
      sorter: true,
      sortOrder: sortedInfo.columnKey === "totalAmount" && sortedInfo.order,
      render: (value) => (value ? `₹${value}` : "-"),
    },
    {
      title: "ACTION",
      key: "action",
      render: (_, record, index) => (
        <Space>
          <Button
            type="text"
            icon={<i className="icon-Edit" />}
            className={styles.actionButton}
            onClick={() => {
              setActionType("edit");
              setEditIndex(index);
            }}
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            className={styles.actionButton}
            onClick={() => {
              setBillToDelete(record);
              toggleDeleteModuleModal();
            }}
          />
        </Space>
      ),
    },
  ];

  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        if (value.trim()) {
          searchBillItemByName(value);
        } else {
          fetchBillItems();
        }
      }, 500),
    [searchText] // Include the functions in dependencies
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    if (advancedSettings && Object.keys(advancedSettings).length === 0) {
      getAdvanceSettings();
    }
  }, []);

  useEffect(() => {
    // Execute the search
    debouncedSearch(searchText);

    // Cleanup
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchText, debouncedSearch]);

  useEffect(() => {
    fetchBillItems();
  }, [params]);

  const handleTableChange = (pagination, filters, sorter, extra) => {
    const newParams = { ...params };

    // Only update filter if it changed
    if (extra.action === "filter") {
      setFilteredInfo(filters);
      if (filters.type && filters.type.length > 0) {
        newParams.type = filters.type[0];
      } else {
        newParams.type = "";
      }
    }

    // Only update sort if it changed
    if (extra.action === "sort") {
      setSortedInfo(sorter);
      newParams.sortBy = sorter.order ? sorter.columnKey : undefined;
      newParams.sortOrder =
        sorter.order === "ascend"
          ? "asc"
          : sorter.order === "descend"
          ? "desc"
          : sorter.order;
    }

    // Always handle pagination changes
    if (pagination.current !== params.page) {
      newParams.page = pagination.current;
    }

    setParams(newParams);
  };

  const getAdvanceSettings = async () => {
    const advanceSettingsResponse = await fetchAdvanceSetting();
    if (advanceSettingsResponse) {
      dispatch(setAdvancedSettings(advanceSettingsResponse));
    }
  };

  const fetchBillItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      params.type && queryParams.append("type", params.type);
      params?.name && queryParams.set("name", params?.name);
      queryParams.set("page", params.page);
      queryParams.set("limit", params?.limit);
      params?.sortBy && queryParams.set("sortBy", params?.sortBy);
      params?.sortOrder && queryParams.set("sortOrder", params?.sortOrder);
      const response = await listBillItem(queryParams);
      setBillItems(response.data);
      setBillItemsSummary(response.summary);
    } catch (err) {
      setError("Failed to fetch bill items.");
    } finally {
      setLoading(false);
    }
  };

  async function searchBillItemByName() {
    setLoading(true);
    setError(null);
    try {
      const response = await searchBillItem(searchText);
      setBillItems(response);
    } catch (err) {
      setError("Failed to fetch bill items.");
    } finally {
      setLoading(false);
    }
  }

  const handleAdvanceSettings = () => {
    setShowAdvanceSettings(!showAdvanceSettings);
  };

  const handleAddNewBillItem = () => {
    const clinic = getClinic();
    trackEvent("TP_billing_servicemasteraddition", {
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      city: clinic?.hm_city,
      pincode: clinic?.hm_pincode,
    });
    setActionType("add");
    setEditIndex(-1);
  };

  const closeServiceItemPopup = () => {
    setActionType(null);
  };

  const toggleDeleteModuleModal = useCallback(() => {
    setIsDeleteModuleModalOpen(!isDeleteModuleModalOpen);
  }, [isDeleteModuleModalOpen]);

  const deletBillItemById = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await deleteBillItem(billToDelete?.id);
      if (response?.status === 204) {
        setBillItems((prev) =>
          prev.filter((item) => item.id !== billToDelete.id)
        );
      } else {
        setError(response?.data);
      }
    } catch (err) {
      setError("Failed to fetch bill items.");
    } finally {
      setLoading(false);
      toggleDeleteModuleModal();
    }
  };

  const DELETE_MODULE_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isDeleteModuleModalOpen}
        onCancel={toggleDeleteModuleModal}
        modalWidth={550}
        title={"Are you sure you want to delete this item?"}
        modalBody={
          <>
            <div className="d-flex align-items-start alert-warning rounded-10px p-3 patient-details">
              <img className="me-3" src={alertIcon} alt="Warning" />
              <span>
                This action will permanently delete the{" "}
                <b>{billToDelete?.name}</b> and cannot be undone. Please confirm
                to proceed
              </span>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={deletBillItemById}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  Yes, Delete
                </div>
                <Button
                  onClick={toggleDeleteModuleModal}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
                  <span>No</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [isDeleteModuleModalOpen]);

  //PopOverVideo function
  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo(!popOverVideo);
  }, [popOverVideo]);

  //Video Componet
  const VIDEO_CONTENT = useCallback(() => {
    return (
      <>
        <div
          className="video-contant rounded-4 p-20 zindex-99999"
          key="oneclickrx-video"
        >
          <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
            <div className="title-common lh-base">Video Tutorial</div>
            <Button
              className="btn btn-videoClose p-0"
              onClick={showHideVideoListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          {videoList[15]?.video?.slice(1, 2).map((item1, i1) => {
            return (
              <div
                key={i1}
                className={`d-flex ${
                  i1 !== videoList[15]?.video.length - 1 &&
                  "pb-3 mb-15 border-bottom"
                }`}
              >
                <div className="tutorial-play me-14">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoLink(item1);
                      const clinic_name = getClinicName(profile?.hospital_data);
                      window.Moengage.track_event("TP_Tutorial_Viewed", {
                        clinic_name,
                        tutorial_type: videoList[15]?.category,
                      });
                    }}
                  >
                    <img src={playIcons} />
                  </button>
                  <span className="tutorial-thumb">
                    <img src={item1.thumbnail} />
                  </span>
                </div>
                <div>
                  <h3 className="title-common text-welcome">
                    {item1?.tmv_title}
                  </h3>
                  <div className="fs-12 fontroboto fw-normal text-main">
                    {item1?.tmv_description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }, [popOverVideo]);

  return (
    <div>
      <div className="modalCard-header h-60 align-items-center justify-content-between d-flex position-sticky top-0 z-2">
        <div className="align-items-center d-flex h-100">
          <div className="border-end h-100 text-center me-3">
            <div
              onClick={() => navigate("/")}
              className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
            >
              <i className="icon-right"></i>
            </div>
          </div>
          <div className="title-common">Billing Settings</div>
        </div>
        <Space className="me-4">
          {
            <div className="d-sm-flex d-block">
              <Popover
                open={popOverVideo}
                onOpenChange={showHideVideoListPopover}
                content={VIDEO_CONTENT}
                trigger="click"
                overlayClassName="pop-430 pp-0 videoTutorial"
                placement="bottom"
              >
                <button className="btn d-flex align-items-center btn-text tutorial p-0 opd-billing">
                  <div className="cursor-pointer video-animat">
                    <img src={tutorial} />
                    <LoopingVideo
                      webm={videorotateWebm}
                      mp4={videorotateMp4}
                      ariaLabel="Video"
                    />
                  </div>
                </button>
              </Popover>
              {videoLink && (
                <VideoModal
                  videoLink={videoLink}
                  onCancel={() => setVideoLink(null)}
                />
              )}
            </div>
          }
          <div
            className="d-flex align-items-center justify-content-end h-38 me-4"
            onClick={handleAdvanceSettings}
          >
            <i className="icon-setting"></i>
            <span className="text-decoration-underline fw-medium cursor-pointer">
              {" "}
              Advance Settings{" "}
            </span>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 41 }}
            onClick={handleAddNewBillItem}
          >
            Add new bill item
          </Button>
        </Space>
      </div>
      <div className={styles.container}>
        <div className="d-flex justify-content-between align-items-center">
          <Title level={5}>Billing Item list</Title>
          <div className={styles.searchContainer}>
            <Input
              placeholder="Search by item name"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.tableContainer}>
          <Table
            columns={columns}
            dataSource={billItems}
            onChange={handleTableChange}
            pagination={{
              current: params.page,
              pageSize: params.limit,
              total: billItemsSummary?.total,
              showSizeChanger: false,
            }}
            loading={loading}
            scroll={{
              y: "calc(100vh - 300px)",
            }}
          />
        </div>
      </div>
      {showAdvanceSettings && (
        <AdvanceBillSettings
          visible={showAdvanceSettings}
          onClose={handleAdvanceSettings}
          getAdvanceSettings={getAdvanceSettings}
        />
      )}
      {actionType && (
        <ServiceItemPopup
          onCancel={closeServiceItemPopup}
          editIndex={editIndex}
          item={billItems[editIndex]}
          setDataSource={setBillItems}
        />
      )}
      {DELETE_MODULE_MODAL}
    </div>
  );
};

export default BillingSettings;
