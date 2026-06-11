import {
  Button,
  Input,
  Select,
  Spin,
  Tabs,
  Tooltip,
  Popover,
} from "antd";
import { useCallback, useMemo, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { errorMessage, removeBeforeWhiteSpace } from "../../../../utils/utils";
import { useDispatch, useSelector } from "react-redux";
import {
  addPackage,
  deletePackage,
  getPackageDetails,
  updatePackage,
  getBillingPackages,
} from "../../../../redux/billingPackageSlice";
import { LoadingOutlined } from "@ant-design/icons";
import CommonModal from "../../../../common/CommonModal";
import { ASSETS } from "../../../../assets";
const alertIcon = ASSETS.images.alerticon;

const BillTemplate = ({ setDataSource, dataSource, totalBillAmount }) => {
  const TAB_ADD_PACKAGE = 1;
  const TAB_UPDATE_PACKAGE = 2;
  const ADD_EDIT_PACKAGE_TABS = [
    { key: TAB_ADD_PACKAGE, label: "New Package" },
    { key: TAB_UPDATE_PACKAGE, label: "Update Package" },
  ];

  const dispatch = useDispatch();
  const billingPackageState = useSelector((state) => state.billingPackage);
  const packages = billingPackageState?.packages || [];
  const loading = billingPackageState?.loading || false;

  const [popOver1, setPopOver1] = useState(false);
  const [popOver2, setPopOver2] = useState(false);
  const [matchedPackages, setMatchedPackages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [removePackageId, setRemovePackageId] = useState(null);
  const [inputPackageName, setInputPackageName] = useState(null);
  const [tabChange, setTabChange] = useState(TAB_ADD_PACKAGE);
  const [allPackages, setAllPackages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Only fetch packages when opening the popovers if we don't have any packages yet
    // This prevents overwriting newly created packages
    if ((popOver1 || popOver2) && packages.length === 0) {
      dispatch(getBillingPackages());
    }
  }, [popOver1, popOver2, dispatch, packages.length]);

  useEffect(() => {
    if (packages && packages.length > 0) {
      setAllPackages(packages);
      if (searchQuery) {
        const filtered = packages.filter((pkg) =>
          pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setMatchedPackages(filtered);
      } else {
        setMatchedPackages(packages);
      }
    } else {
      setMatchedPackages([]);
      setAllPackages([]);
    }
  }, [packages, searchQuery]);

  const onRemoveRows = () => {
    setDataSource([
      {
        key: uuidv4(),
        masterId: "",
        name: "",
        quantity: 1,
        amount: 0,
        discount: 0,
        discountType: "flat",
        gst: 0,
        totalAmount: 0,
        createdBy: "",
      },
    ]);
    showHideClearData();
  };

  const onDeletePackageClicked = async (packageId) => {
    const action = await dispatch(deletePackage(packageId));
    if (action.meta.requestStatus === "rejected") {
      errorMessage(action.error);
    } else {
      // Refresh packages list after deletion
      dispatch(getBillingPackages());
    }
  };

  const onSearchPackage = useCallback(() => {
    setInputPackageName(null);
  }, [inputPackageName]);

  const onSelectPackage = useCallback(
    (data, e) => {
      setInputPackageName(e.key);
    },
    [inputPackageName]
  );

  // PopOver1 function (Templates)
  const showHideTemplatesListPopover = useCallback(() => {
    const wasOpen = popOver1;
    setPopOver1(!popOver1);
    // When opening packages popover, fetch latest packages
    if (!wasOpen) {
      dispatch(getBillingPackages());
    }
  }, [popOver1, dispatch]);

  // PopOver2 function (Save)
  const showHideSaveTemplatePopOver = useCallback(() => {
    setInputPackageName(null);
    setPopOver2(!popOver2);
  }, [popOver2]);

  const showHideClearData = useCallback(() => {
    setIsModalOpen1(!isModalOpen1);
  }, [isModalOpen1]);

  const onChangeSavePackage = useCallback(
    (e) => {
      const updateQuery = removeBeforeWhiteSpace(e.target.value);
      setInputPackageName(updateQuery);
    },
    [inputPackageName]
  );

  const onPackageSelected = async (pkg) => {
    window.Moengage?.track_event("billing_package_used", {
      package_name: pkg.name,
    });
    // Use package data directly from the list (billItems are already included in API response)
    if (pkg?.billItems && pkg.billItems.length > 0) {
      // Convert package bill items to dataSource format
      const updatedData = pkg.billItems.map((item) => ({
        key: uuidv4(),
        masterId: item.id,
        name: item.name,
        quantity: 1,
        amount: item.price || item.totalAmount || 0,
        discount: item.discount || 0,
        discountType: item.discountType || "flat",
        gst: item.gst || 0,
        totalAmount: item.totalAmount || item.price || 0,
        type: item.type,
        createdBy: item.createdBy,
        itemDate: new Date().toISOString().split('T')[0],
      }));
      const filteredDataSource = dataSource.filter(
        (item) => item.masterId && item.name && (item.amount === 0 || item.amount)
      );
      // Add package items to the filtered dataSource
      // Then append one empty row at the end (like when manually adding items)
      const emptyRow = {
        key: uuidv4(),
        masterId: "",
        name: "",
        quantity: "",
        amount: "",
        discount: "",
        discountType: "",
        gst: "",
        totalAmount: "",
        createdBy: "",
        itemDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      };
      // Always add empty row at the end after package items
      setDataSource([...filteredDataSource, ...updatedData, emptyRow]);
      showHideTemplatesListPopover();
    } else if (pkg?.billItemIds && pkg.billItemIds.length > 0) {
      // If billItems are not included, we need to fetch them
      // For now, show error message
      errorMessage("Package items not available. Please try again.");
    } else {
      errorMessage("Package is empty");
    }
  };

  const onAddPackageClicked = async () => {
    // Filter out empty rows
    const validItems = dataSource.filter(
      (item) => item.masterId && item.name && (item.amount || item.amount === 0)
    );
    if (validItems.length < 2) {
      errorMessage("At least 2 billing items required");
      return;
    }
    if (!inputPackageName || inputPackageName.trim() === "") {
      errorMessage("Please enter package name");
      return;
    }
    // Validate package name (same as template validation)
    if (inputPackageName.trim().length < 1) {
      errorMessage("Package name cannot be empty");
      return;
    }
    const billItemIds = validItems.map((item) => item.masterId).filter(Boolean);
    if (billItemIds.length === 0) {
      errorMessage("Please select valid billing items");
      return;
    }
    const sendData = {
      name: inputPackageName.trim(),
      billItemIds: billItemIds,
    };
    const action = await dispatch(addPackage(sendData));
    if (action.meta.requestStatus === "fulfilled") {
      setInputPackageName(null);
      showHideSaveTemplatePopOver();
      // Redux reducer already adds the package to state.packages immediately
      // No need to refetch - the component will react to Redux state change
    } else {
      errorMessage(action.error || action.payload?.message || "Failed to save package");
    }
  };

  const showHideModal = useCallback(
    (packageId) => {
      packageId !== undefined
        ? setRemovePackageId(packageId)
        : setRemovePackageId(null);
      setIsModalOpen(!isModalOpen);
    },
    [isModalOpen]
  );

  const onTabChange = useCallback(
    (key) => {
      setInputPackageName(null);
      setTabChange(key);
    },
    [tabChange]
  );

  const onSearch = useCallback(
    (query) => {
      setSearchQuery(removeBeforeWhiteSpace(query));
    },
    [searchQuery]
  );

  const onUpdatePackageClicked = async () => {
    // Filter out empty rows
    const validItems = dataSource.filter(
      (item) => item.masterId && item.name && (item.amount || item.amount === 0)
    );
    if (validItems.length < 2) {
      errorMessage("At least 2 billing items required");
      return;
    }
    if (!inputPackageName) {
      errorMessage("Please select a package to update");
      return;
    }
    try {
      const packageData = JSON.parse(inputPackageName);
      const billItemIds = validItems
        .map((item) => item.masterId)
        .filter(Boolean);
      if (billItemIds.length === 0) {
        errorMessage("Please select valid billing items");
        return;
      }
      const sendData = {
        id: packageData.id,
        name: packageData.name,
        billItemIds: billItemIds,
      };
      const action = await dispatch(updatePackage(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        setInputPackageName(null);
        showHideSaveTemplatePopOver();
        // Redux reducer already updates the package in state.packages immediately
        // No need to refetch - the component will react to Redux state change
      } else {
        errorMessage(action.error || action.payload?.message || "Failed to update package");
      }
    } catch (e) {
      errorMessage("Invalid package data");
    }
  };

  // Package List Component
  const PACKAGE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="pop-header" key="billing-packages">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Package List</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={showHideTemplatesListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="billing-packages-search">
            <Input
              allowClear
              className="popinput"
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search Packages"
              prefix={<i className="icon-search me-2" />}
            />
          </div>
        </div>
        <div className="pop-body" style={{ maxHeight: '210px', overflowY: 'auto' }}>
          {matchedPackages.length > 0 ? (
            matchedPackages.map((pkg, i) => {
              return (
                <div
                  className="align-items-center d-flex medicine-templates"
                  key={i}
                >
                  <div
                    className="round-box"
                    onClick={() => onPackageSelected(pkg)}
                  >
                    <i className="icon-template"></i>
                  </div>
                  <div
                    className="text-truncate w-100"
                    onClick={() => onPackageSelected(pkg)}
                  >
                    <div className="title text-main2">
                      {pkg.name && pkg.name.length > 25 
                        ? `${pkg.name.substring(0, 25)}...` 
                        : pkg.name}
                    </div>
                    <div className="text-truncate">
                      <span>
                        {pkg.billItemsCount || pkg.billItemIds?.length || 0}{" "}
                        items
                      </span>
                    </div>
                  </div>
                  <Button
                    className="btn btn-delete-prescription p-0 ms-2"
                    onClick={() => {
                      showHideModal(pkg.id);
                      showHideTemplatesListPopover();
                    }}
                  >
                    {pkg.loading ? (
                      <Spin
                        indicator={
                          <LoadingOutlined style={{ fontSize: 22 }} spin />
                        }
                      />
                    ) : (
                      <i className="icon-delete"></i>
                    )}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="text-center p-4 text-muted">No packages found</div>
          )}
        </div>
      </>
    );
  }, [popOver1, matchedPackages, showHideTemplatesListPopover, onPackageSelected, showHideModal]);

  // Save Component
  const SAVE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
          <Tabs
            defaultActiveKey={TAB_ADD_PACKAGE}
            items={ADD_EDIT_PACKAGE_TABS}
            onChange={onTabChange}
            className="w-100"
          />
          <Button
            className="btn btn-delete-prescription"
            onClick={showHideSaveTemplatePopOver}
          >
            <i className="icon-Cross"></i>
          </Button>
        </div>
        {tabChange === TAB_ADD_PACKAGE ? (
          <div className="pop-header d-flex">
            <Input
              allowClear
              value={inputPackageName && inputPackageName}
              className="popinput inputheight41"
              placeholder="Package Name"
              onChange={onChangeSavePackage}
            />
            <Button
              className="btn btn-primary3 btn-41 ms-3"
              loading={loading}
              disabled={inputPackageName ? false : true}
              onClick={onAddPackageClicked}
            >
              {" Save "}
            </Button>
          </div>
        ) : (
          <div className="pop-header d-flex">
            <Select
              showSearch
              value={
                inputPackageName &&
                JSON.parse(inputPackageName).name
              }
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Package"
              onSearch={onSearchPackage}
              onSelect={onSelectPackage}
              optionLabelProp="label"
              options={allPackages.map((pkg) => {
                return {
                  key: JSON.stringify(pkg),
                  value: pkg.name,
                  label: (
                    <div key={pkg.id}>
                      {pkg.name}
                    </div>
                  ),
                };
              })}
              optionRender={(option) => (
                <div className="align-items-center d-flex text-truncate w-100">
                  <div className="round-box">
                    <i className="icon-template"></i>
                  </div>
                  <div className="text-truncate w-100">
                    <div className="title text-main2">{option.data.value}</div>
                    <div className="text-truncate">
                      <span>
                        {JSON.parse(option.data.key).billItemsCount || 0} items
                      </span>
                    </div>
                  </div>
                </div>
              )}
            />
            <Button
              className="btn btn-primary3 btn-41 ms-3"
              loading={loading}
              disabled={inputPackageName ? false : true}
              onClick={onUpdatePackageClicked}
            >
              {" Update "}
            </Button>
          </div>
        )}
      </>
    );
  }, [tabChange, popOver2, inputPackageName, allPackages, loading, onChangeSavePackage, onAddPackageClicked, onUpdatePackageClicked, onSearchPackage, onSelectPackage, showHideSaveTemplatePopOver, onTabChange]);

  // Package Remove Modal
  const DELETE_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isModalOpen}
        onCancel={showHideModal}
        modalWidth={500}
        title={"You may lose your data"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>Are you sure you want to delete this package?</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => {
                    onDeletePackageClicked(removePackageId);
                    showHideModal();
                  }}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  Yes Delete
                </div>
                <Button
                  onClick={showHideModal}
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
  }, [isModalOpen, removePackageId, showHideModal, onDeletePackageClicked]);

  // Remove All Rows Modal
  const REMOVE_ALL_ROWS = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isModalOpen1}
        onCancel={showHideClearData}
        modalWidth={500}
        title={"You may lose your data"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to Clear Selected <b>Bill Items</b>?
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={onRemoveRows}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  <span>Yes, Clear</span>
                </div>
                <Button
                  onClick={showHideClearData}
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
  }, [isModalOpen1, showHideClearData, onRemoveRows]);

  // Count valid billing items (rows with masterId and name)
  const validItemsCount = useMemo(() => {
    return dataSource?.filter((item) => item.masterId && item.name).length || 0;
  }, [dataSource]);

  const isSaveDisabled = validItemsCount < 2;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between">
        <div className="fs-16 font-medium">Billing Item</div>
        <div className="d-flex align-items-center">
          <Popover
            open={popOver1}
            onOpenChange={showHideTemplatesListPopover}
            content={PACKAGE_CONTENT}
            trigger="click"
            overlayClassName="pop-350 pp-0"
            placement="bottom"
          >
            <button className="btn d-flex align-items-center btn-text">
              {" "}
              <i className="icon-template me-2"></i> <span>Packages</span>
            </button>
          </Popover>
          <Tooltip
            placement="bottom"
            title={
              isSaveDisabled
                ? "Please add at least 2 billing items to save a package"
                : ""
            }
          >
            <Popover
              open={popOver2}
              onOpenChange={() =>
                !isSaveDisabled &&
                showHideSaveTemplatePopOver()
              }
              content={SAVE_CONTENT}
              trigger="click"
              overlayClassName="pop-450 pp-0"
              placement="bottom"
            >
              <button 
                className="btn d-flex align-items-center btn-text"
                disabled={isSaveDisabled}
                style={{
                  border: isSaveDisabled ? 'none' : undefined,
                  outline: 'none',
                  boxShadow: isSaveDisabled ? 'none' : undefined,
                }}
              >
                {" "}
                <i className="icon-save me-2"></i> <span>Save</span>
              </button>
            </Popover>
          </Tooltip>
          <button
            onClick={showHideClearData}
            className="btn btn-text clear-text d-flex align-items-center"
            disabled={dataSource?.some((item) => item?.masterId || item?.name) ? false : true}
          >
            <i className="icon-eraser1 me-2"></i> <span>Clear</span>
          </button>
        </div>
      </div>
      {DELETE_MODAL}
      {REMOVE_ALL_ROWS}
    </>
  );
};

export default BillTemplate;
