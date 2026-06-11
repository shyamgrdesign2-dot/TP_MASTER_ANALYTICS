import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import moment from "moment";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  isAndroid,
  isBrowser,
  isChrome,
  isMobile,
  isSafari,
} from "react-device-detect";
import { Tabs, Select, Input } from "antd";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { Row, Col, ButtonGroup } from "react-bootstrap";
import BillingTable from "./BillingTable/BillingTable";
import AdvanceDeposit from "./AdvanceDepositTable/AdvanceDepositTable";
import AdvanceDepositTable from "./AdvanceDepositTable/AdvanceDepositTable";

import {
  fetchAdvancedDepositDashboard,
  fetchBillingDashboard,
  fetchBillsByPatient,
  listAdvancedDepositByPatient,
} from "../../service";
import { useSelector } from "react-redux";
import { db } from "../../../../firebase";
import { deleteDoc, doc, getDoc, onSnapshot } from "firebase/firestore";
import { useDispatch } from "react-redux";
import { deleteDocsUploadedFromAndroid } from "../../../medicalRecords/service";
import { setLoadingStatus } from "../../../../redux/uploadDocSlice";
import { GB_NEW_IPD, GB_NEW_IPD_HOS_BUSINESS_ID } from "../../../../utils/constants";
import { ASSETS } from "../../../../assets";
const {
  depositIcon,
  depositSelectedIcon,
} = ASSETS.images;

const dateFormat = "YYYY-MM-DD";
const TableBillingDashboard = forwardRef(
  (
    {
      onTabChange,
      patientData,
      handleTotalAdvanceUpdate,
      totalAdvanceBalance,
      createBillDrawer,
      setCreateBillDrawer,
      addAdvanceDrawer,
      showHideSubModal,
      billData,
      setBillData,
      fromPath="opdDashboard",
    },
    ref
  ) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { doctorList } = useSelector((state) => state.bulkMessages);
    const { userId } = useSelector((state) => state.doctors);
    const { advancedSettings } = useSelector((state) => state.billing);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTab, setSelectedTab] = useState(1);
    const [isAdvanceDepositTab, setIsAdvanceDepositTab] = useState(false);
    const [isBillingTab, setIsBillingTab] = useState(false);
    const [pageNo, setPageNo] = useState(0);
    const [visitTypeFilters, setVisitTypeFilters] = useState("");
    const [isHovered, setIsHovered] = useState(false);
    const [billingCount, setBillingCount] = useState(0);
    const [ipdBillingCount, setIpdBillingCount] = useState(0);
    const [advanceCount, setAdvanceCount] = useState(0);
    const [dateStatus, setDateStatus] = useState(1);
    const [dateRange, setDateRange] = useState({
      startDate: moment().format(dateFormat),
      endDate: moment().format(dateFormat),
    });
    const [selectedDoctors, setSelectedDoctors] = useState([]);
    const doctorIds =
      doctorList.map((doctor) => doctor.um_id).length > 0
        ? doctorList.map((doctor) => doctor.um_id)
        : [userId];
    const deviceUid = localStorage.getItem("app_device_unique_id");
    const urlParams = new URLSearchParams(window.location.search);
    const isReceptionist = urlParams.has("receptionist");
    //   const [date, setDate] = useState({
    //     startDate: moment().format(dateFormat),
    //     endDate: moment().format(dateFormat),
    //   });

    const isNewIPDAccessableFromGB = useFeatureIsOn(GB_NEW_IPD);
    const isNewIPDHosBusinessIdAccessableFromGB = useFeatureIsOn(
      GB_NEW_IPD_HOS_BUSINESS_ID
    );

    useEffect(() => {
      if (!createBillDrawer || !addAdvanceDrawer) {
        getBillAndAdvanceCount();
      }
    }, [
      dateRange,
      createBillDrawer,
      addAdvanceDrawer,
      selectedDoctors,
      doctorList,
      fromPath,
    ]);

    useEffect(() => {
      const checkInFireBase = async () => {
        if (deviceUid) {
          const docCapturedImage = doc(db, "billing", deviceUid);
          try {
            const docCapturedImageSnap = await getDoc(docCapturedImage);
            if (docCapturedImageSnap.exists()) {
              onSnapshot(
                doc(db, "billing", deviceUid),
                async (docSnapshotOfCapturedImage) => {
                  const res = docSnapshotOfCapturedImage?.data();
                  if (res?.clicked === "no") {
                    dispatch(setLoadingStatus(false));
                    deleteDoc(doc(db, "billing", deviceUid));
                    deleteDocsUploadedFromAndroid(
                      patientData ? patientData?.patient_unique_id : ""
                    );
                  }
                }
              );
            }
          } catch (error) {
            console.error("Error updating document:", error);
          }
        } else {
          console.error("Device UID not found");
        }
      };

      return () => checkInFireBase();
    }, [db, deviceUid]);

    const getBillAndAdvanceCount = async () => {
      const billParams = {
        page: 1,
        limit: 25,
        sortBy: "date",
        sortOrder: "desc",
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        doctorIds: isReceptionist ? urlParams.get("um_id")?.split(",") :
          selectedDoctors.length > 0 ? [...selectedDoctors] : [...doctorIds],
        patientId: patientData?.patient_unique_id
          ? patientData?.patient_unique_id
          : "",
      };
      const advanceParams = {
        page: 1,
        limit: 25,
        sortBy: "date",
        sortOrder: "desc",
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        doctorIds: isReceptionist ? urlParams.get("um_id")?.split(",") : doctorList.map((doctor) => doctor.um_id),
        patientId: patientData?.patient_unique_id
          ? patientData?.patient_unique_id
          : "",
      };   
      
      // Fetch OPD billing count
      const opdBillResponse = patientData
        ? await fetchBillsByPatient(billParams, "opd")
        : await fetchBillingDashboard(billParams, "opd");
      
      // Fetch IPD billing count (only if feature flags are enabled)
      let ipdBillResponse = null;
      if ((isNewIPDAccessableFromGB || isNewIPDHosBusinessIdAccessableFromGB) && !(fromPath === "opdDashboard")) {
        ipdBillResponse = patientData
          ? await fetchBillsByPatient(billParams, "ipd")
          : await fetchBillingDashboard(billParams, "ipd");
      }
      
      const advanceResponse = patientData
        ? await listAdvancedDepositByPatient(advanceParams)
        : await fetchAdvancedDepositDashboard(advanceParams);

      setBillingCount(opdBillResponse?.summary?.count || 0);
      setIpdBillingCount(ipdBillResponse?.summary?.count || 0);
      setAdvanceCount(
        advanceResponse?.summary?.totalCount ||
          advanceResponse?.summary?.count ||
          0
      );
    };

    // Move items into the component body and make them depend on selectedTab
    const items = useMemo(() => {
      const baseItems = [
        {
          key: 1,
          label: (
            <div className="d-flex align-items-center">
              <i className="icon-billings"></i>
              {`OPD Billing (${billingCount})`}
            </div>
          ),
        },
      ];

      // Only show IPD Billing tab if either feature flag is true
      if ((isNewIPDAccessableFromGB || isNewIPDHosBusinessIdAccessableFromGB) && ! (fromPath === "opdDashboard")) {
        baseItems.push({
          key: 2,
          label: (
            <div className="d-flex align-items-center">
              <i className="icon-billings"></i>
              {`IPD Billing (${ipdBillingCount})`}
            </div>
          ),
        });
      }

      baseItems.push({
        key: 3,
        label: (
          <div
            className="d-flex align-items-center"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <img
              src={
                selectedTab === 3 || isHovered
                  ? depositSelectedIcon
                  : depositIcon
              }
              className="me-2"
              alt={selectedTab === 3 ? "selected-deposit" : "default-deposit"}
              style={{
                width: "20px",
                height: "20px",
                display: "block",
              }}
            />
            {`Advance Deposit (${advanceCount})`}
          </div>
        ),
      });

      return baseItems;
    }, [
      selectedTab,
      isHovered,
      billingCount,
      ipdBillingCount,
      advanceCount,
      isNewIPDAccessableFromGB,
      isNewIPDHosBusinessIdAccessableFromGB,
      fromPath,
    ]); // Add feature flags as dependencies

    // Create a ref for the AdvanceDepositTable
    const advanceTableRef = useRef(null);

    // Expose the refresh function to parent
    useImperativeHandle(ref, () => ({
      refreshData: () => {
        if (advanceTableRef.current?.refreshData) {
          advanceTableRef.current.refreshData();
        }
      },
    }));

    const onChange = useCallback(
      (key) => {
        setPageNo(0);
        setVisitTypeFilters("");
        setSelectedTab(key);

        if (key === 1) {
          onTabChange("billingtable");
          setIsBillingTab(true);
        } else if (key === 2) {
          onTabChange("ipdbillingtable");
        } else {
          onTabChange("advancetable");
          setIsAdvanceDepositTab(false);
        }
      },
      [selectedTab]
    );

    return (
      <>
        <div className="border rounded-4 appointment-wrap dateborder">
          <Tabs
            defaultActiveKey={1}
            items={items}
            onChange={onChange}
            activeKey={selectedTab}
          />
          <div className="appointment-data">
            {selectedTab === 1 ? (
              <BillingTable
                billData={billData}
                setBillData={setBillData}
                patientData={patientData}
                handleTotalAdvanceUpdate={handleTotalAdvanceUpdate}
                setBillingCount={setBillingCount}
                dateRange={dateRange}
                setDateRange={setDateRange}
                dateStatus={dateStatus}
                setDateStatus={setDateStatus}
                selectedDoctors={selectedDoctors}
                setSelectedDoctors={setSelectedDoctors}
                createBillDrawer={createBillDrawer}
                setCreateBillDrawer={setCreateBillDrawer}
                totalAdvanceBalance={totalAdvanceBalance}
                showHideSubModal={showHideSubModal}
                billType={"opd"}
                isReceptionistUser={isReceptionist}
                advancedSettings={advancedSettings}
              />
            ) : selectedTab === 2 ? (
              <BillingTable
                billData={billData}
                setBillData={setBillData}
                patientData={patientData}
                handleTotalAdvanceUpdate={handleTotalAdvanceUpdate}
                setBillingCount={setIpdBillingCount}
                dateRange={dateRange}
                setDateRange={setDateRange}
                dateStatus={dateStatus}
                setDateStatus={setDateStatus}
                selectedDoctors={selectedDoctors}
                setSelectedDoctors={setSelectedDoctors}
                createBillDrawer={createBillDrawer}
                setCreateBillDrawer={setCreateBillDrawer}
                totalAdvanceBalance={totalAdvanceBalance}
                showHideSubModal={showHideSubModal}
                billType={"ipd"}
                isReceptionistUser={isReceptionist}
                advancedSettings={advancedSettings}
              />
            ) : (
              <AdvanceDepositTable
                ref={advanceTableRef}
                patientData={patientData}
                dateRange={dateRange}
                setDateRange={setDateRange}
                dateStatus={dateStatus}
                setDateStatus={setDateStatus}
                totalAdvanceBalance={totalAdvanceBalance}
                showHideSubModal={showHideSubModal}
              />
            )}
          </div>
        </div>
      </>
    );
  }
);

export default React.memo(TableBillingDashboard);
