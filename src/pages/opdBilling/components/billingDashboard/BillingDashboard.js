import React, { useCallback, useEffect, useState, useRef } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { isMobile } from "react-device-detect";

import Header from "../../../../common/Header";
import SidebarDoctor from "../../../../common/SidebarDoctor";
import Welcome from "../../../../common/Welcome";

import { useSelector, useDispatch } from "react-redux";
import {
  TRIAL,
  MESSAGE_KEY,
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  S_BILLING,
  S_TATVA_PRACTICE,
} from "../../../../utils/constants";
import { jwtDecode } from "jwt-decode";
import { setUserId } from "../../../../redux/doctorsSlice";
import { getClinic, getClinicName, trackEvent } from "../../../../utils/utils";
import TableBillingDashboard from "./TableBillingDashboard";
import { Button, Drawer, message } from "antd";
import "./BillingDashboard.scss";
import Vaccination from "../../../vaccination/Vaccination";
import Manage3cBill from "../manage3cBills/Manage3cBills";
import AddForm3cBills from "../manage3cBills/AddForm3cBills";

import VideoModal from "../../../../common/VideoModal";
import { Popover } from "antd";

import { clearSearch } from "../../../../redux/appointmentsSlice";
import AddAdvance from "../advanceDeposit/AddAdvance";
import CreateBill from "../createBill/CreateBill";
import BillingKnowMore from "../../../monetization/components/BillingKnowMore";
import ExpiredSubModal from "../../../monetization/components/ExpiredSubModal";
import { fetchAdvanceSetting, fetchPatientWalletBalance } from "../../service";
import { setAdvancedSettings } from "../../../../redux/billingSlice";
import moment from "moment";
import { ASSETS } from "../../../../assets";
const {
  addCircle: addCircleIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
  tubeIcon: playIcons,
  tutorialIcon: tutorial,
} = ASSETS.images;

function BillingDashboard({ patientData, fromPath }) {
  const { planDetails } = useSelector((state) => state.subscription);
  const { service_mappings } = planDetails || {};
  const EMR_planDetails = service_mappings?.find(e => e.service_name === S_TATVA_PRACTICE)
  const BILLING_planDetails = service_mappings?.find(e => e.service_name === S_BILLING)

  const dispatch = useDispatch();
  const navigate = useNavigate();
  let location = useLocation();
  const [locationPath, setLocationPath] = useState("/");
  const { profile } = useSelector((state) => state.doctors);
  const [selectedTab, setSelectedTab] = useState("billingtable");
  const [totalAdvanceBalance, setTotalAdvanceBalance] = useState(null);

  // Drawer states
  const [form3cDrawer, setForm3cDrawer] = useState(false);
  const [addForm3cDrawer, setAddform3cDrawer] = useState(false);
  const [addAdvanceDrawer, setAddAdvanceDrawer] = useState(false);
  const [createBillDrawer, setCreateBillDrawer] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [billingDrawer, setBillingDrawer] = useState(false);
  const [billData, setBillData] = useState(null);
  const { advancedSettings } = useSelector(
    (state) => state.billing
  );

  // Add a ref to store the refresh function
  const billingTableRef = useRef(null);
  const manage3cBillsRef = useRef(null);
  const [form3cData, setForm3cData] = useState(null);

  const [popOverVideo, setPopOverVideo] = useState(false);
  const [videoLink, setVideoLink] = useState(null);
  const { videoList } = useSelector((state) => state.doctors);
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const receptionistId = urlParams.get("receptionistId");
  const receptionistName = urlParams.get("receptionistName");

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const showHideSubModal = () => {
    setIsSubModalOpen(!isSubModalOpen);
  }

  useEffect(() => {
    checkBillingPurchased()
  }, []);

  const checkBillingPurchased = async () => {
    // if (moment(planDetails?.plan_active_date).diff("2025-07-01", 'days') > 0) {
      if (EMR_planDetails?.plan_tier !== TRIAL && BILLING_planDetails?.plan_tier === TRIAL) {
        showHideSubModal()
      } else {
        return true;
      }
    // } else {
    //   return true;
    // }
  }

  useEffect(() => {
    setLocationPath(location.pathname);
  }, [location]);

  useEffect(() => {
    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage.track_event("TP_Appointment_Page_Landing", {
      clinic_name,
    });
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    try {
      const decoded = jwtDecode(token);
      if (decoded?.result?.user_id) {
        dispatch(setUserId(decoded.result));
      }
    } catch (e) {
      console.error("Error while token decoding: ", e);
    }
    if (advancedSettings && Object.keys(advancedSettings).length === 0) {
      getAdvanceSettings();
    }
  }, []);

  const getAdvanceSettings = async () => {
    const advanceSettingsResponse = await fetchAdvanceSetting();
    if (advanceSettingsResponse) {
      dispatch(setAdvancedSettings(advanceSettingsResponse));
    }
  };

  // Drawer form 3c
  const handleManage3cBill = async () => {
    const isPurchased = await checkBillingPurchased()
    if (isPurchased) {
      const clinic = getClinic();
      trackEvent("TP_billing_ManageForm3C", {
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        city: clinic?.hm_city,
        pincode: clinic?.hm_pincode,
      });
      setForm3cDrawer(!form3cDrawer);
      setForm3cData(null);
    }
  };

  const handleCreateBillDrawer = useCallback(async (record, isPreviewScreen = false) => {
    const isPurchased = await checkBillingPurchased()
    if (isPurchased) {
      const clinic = getClinic();
      trackEvent("TP_Billing_CreateBill", {
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        source: fromPath || "billing_page",
        city: clinic?.hm_city,
        pincode: clinic?.hm_pincode,
        subscriptionStatus: planDetails?.currentPlanStatus,
        receptionistId: receptionistId,
        receptionistName: receptionistName,
      });
      setCreateBillDrawer(!createBillDrawer);
      if (billData && Object.keys(billData).length > 0 && !isPreviewScreen) {
        setBillData(null);
      }
    }
  }, [createBillDrawer]);

  const showHideBackModal = () => {
    setIsBackModalOpen(!isBackModalOpen);
  };

  // Add form 3c drawer
  const handleAddForm3cDrawer = () => {
    setAddform3cDrawer(!addForm3cDrawer);
  };

  // Modify the Add Advance Drawer handler
  const handleAddAdvanceDrawer = () => {
    setAddAdvanceDrawer(!addAdvanceDrawer);
    // If drawer is closing and we have a refresh function, call it
    if (addAdvanceDrawer && billingTableRef.current?.refreshData) {
      billingTableRef.current.refreshData();
    }
  };

  // Function to handle successful advance operations
  const handleAdvanceSuccess = () => {
    handleAddAdvanceDrawer();
    // Refresh the total advance balance
    if (patientData?.patient_unique_id) {
      getPatientWalletBalance();
    }
  };

  useEffect(() => {
    if (patientData?.patient_unique_id && !createBillDrawer) {
      getPatientWalletBalance();
    }
  }, [createBillDrawer]);

  const getPatientWalletBalance = async () => {
    const patientWalletBalanceRes = await fetchPatientWalletBalance(
      patientData.patient_unique_id
    );
    setTotalAdvanceBalance(patientWalletBalanceRes?.advanceDepositBalance);
  };

  // Function to update state from child
  const handleTotalAdvanceUpdate = (newData) => {
    setTotalAdvanceBalance(newData);
  };

  const handleForm3cSuccess = () => {
    // Refresh billing table
    if (billingTableRef.current?.refreshData) {
      billingTableRef.current.refreshData();
    }
    // Refresh manage3c bills table
    if (manage3cBillsRef.current?.refreshData) {
      manage3cBillsRef.current.refreshData();
    }
    // Close the drawer
    handleAddForm3cDrawer();
  };

  //PopOverVideo function
  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo(!popOverVideo);
  }, [popOverVideo]);

  //Video Componet
  const VIDEO_CONTENT = useCallback(() => {
    return (
      <>
        <div
          className="video-contant rounded-4 p-20 zindex-10"
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
          {videoList[15]?.video?.map((item1, i1) => {
            return (
              <div
                key={i1}
                className={`d-flex ${i1 !== videoList[15]?.video.length - 1 &&
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

  const handleBillingKnowMore = () => {
    setBillingDrawer((prev) => !prev);
  };

  return (
    <>
      {!patientData && !isReceptionist && (
        <Header locationPath={locationPath} />
      )}
      <div className="d-flex billing-dashboard-wraper">
        {!patientData && !isReceptionist && (
          <SidebarDoctor activeItem={"opd-billing"} />
        )}
        <div className="w-100 bg-body wrapper">
          <>
            <div
              className={`welcomesection position-relative mb-3 ${
                isReceptionist ? "receptionist-welcome" : ""
              }`}
            >
              <div className="bg-welcome d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  {patientData ? (
                    <>
                      <div>
                        <h1>Billing History</h1>
                      </div>
                      <button
                        className="advance-deposite-container mx-4"
                        onClick={handleAddAdvanceDrawer}
                      >
                        <span className="text-lg">
                          Advance Balance: ₹{totalAdvanceBalance || "0"}
                        </span>
                        <span className="add-advance-icon">
                          <img src={addCircleIcon} alt="add-deposit" />
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <h1>OPD Billing</h1>
                      </div>
                      {!isReceptionist && (
                        <img
                          src={ASSETS.images.bgWelcome}
                          className="welcomeig d-inline-block align-top"
                          alt="Welcome"
                        />
                      )}
                    </>
                  )}
                </div>
                <div className="d-flex gap-1">
                  {/* {patientData && (
                    <div className="d-sm-flex d-block">
                      <Popover
                        open={popOverVideo}
                        onOpenChange={showHideVideoListPopover}
                        content={VIDEO_CONTENT}
                        trigger="click"
                        overlayClassName="pop-430 pp-0 videoTutorial"
                        placement="bottom"
                      >
                        <button className="btn d-flex align-items-center btn-text mx-3 tutorial p-0">
                          onClick={showHideVideoListPopover}
                          <span className="text-decoration-none rounded-5 pe-3 bg-white shadow2">
                            <img height={42} src={tutorial} />
                            Tutorial
                          </span>
                        </button>
                      </Popover>
                      {videoLink && (
                        <VideoModal
                          videoLink={videoLink}
                          onCancel={() => setVideoLink(null)}
                        />
                      )}
                    </div>
                  )} */}

                  <button
                    className="btn d-flex align-items-center btn-text mx-3 tutorial p-0"
                    onClick={handleBillingKnowMore}
                  >
                    <span className="text-decoration-none rounded-5 pe-3 bg-white shadow2">
                      <img height={42} src={tutorial} />
                      Tutorial
                    </span>
                  </button>

                  {selectedTab === "billingtable" &&
                    !patientData &&
                    !isReceptionist && (
                      <Button
                        className="btn-manage-bill"
                        onClick={handleManage3cBill}
                      >
                        <span>Manage Form 3c Bills</span>
                      </Button>
                    )}
                  {selectedTab !== "billingtable" && selectedTab !== "ipdbillingtable"   && !patientData && (
                    <Button
                      className={`btn-create-bill ${
                        isReceptionist ? "receptionist-btn" : ""
                      }`}
                      onClick={handleAddAdvanceDrawer}
                    >
                      <span style={{ fontSize: "22px" }}>{"+"}</span>
                      <span>{"Add Advance Deposit"}</span>
                    </Button>
                  )}
                  {(selectedTab === "billingtable" || selectedTab === "ipdbillingtable" || patientData) && (
                    <Button
                      className={`btn-create-bill ${
                        isReceptionist ? "receptionist-btn" : ""
                      }`}
                      onClick={handleCreateBillDrawer}
                    >
                      <span style={{ fontSize: "22px" }}>+</span>
                      <span>Create New OPD Bill</span>
                    </Button>
                  )}
                </div>
              </div>
              <div className="pb-5">&nbsp;</div>
            </div>
          </>
          <TableBillingDashboard
            ref={billingTableRef}
            onTabChange={setSelectedTab}
            patientData={patientData}
            handleTotalAdvanceUpdate={handleTotalAdvanceUpdate}
            totalAdvanceBalance={totalAdvanceBalance}
            createBillDrawer={createBillDrawer}
            setCreateBillDrawer={setCreateBillDrawer}
            addAdvanceDrawer={addAdvanceDrawer}
            showHideSubModal={showHideSubModal}
            fromPath={fromPath}
            billData={billData}
            setBillData={setBillData}
          />
        </div>

        {form3cDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleManage3cBill}
            open={form3cDrawer}
            width="100%"
            push={false}
          >
            <Manage3cBill
              handleForm3cBill={handleManage3cBill}
              handleAddForm3cDrawer={handleAddForm3cDrawer}
              form3cData={form3cData}
              handleEditBillDrawer={handleCreateBillDrawer}
              setEditBillData={setBillData}
            />
          </Drawer>
        )}

        {addForm3cDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleAddForm3cDrawer}
            open={addForm3cDrawer}
            width="100%"
          >
            <AddForm3cBills
              handleAddForm3cDrawer={handleAddForm3cDrawer}
              setForm3cData={setForm3cData}
              onSuccess={handleForm3cSuccess}
              billType={selectedTab === "ipdbillingtable" ? "ipd" : "opd"}
            />
          </Drawer>
        )}

        {addAdvanceDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleAddAdvanceDrawer}
            open={addAdvanceDrawer}
            width="85%"
            push={false}
          >
            <AddAdvance
              handleAddAdvanceDrawer={handleAdvanceSuccess}
              patientData={patientData}
              isReceptionistDashboard={isReceptionist}
            />
          </Drawer>
        )}
        {createBillDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            bodyStyle={{ backgroundColor: "white" }}
            open={createBillDrawer}
            onClose={showHideBackModal}
            width="100%"
            push={false}
          >
            <CreateBill
              handleCreateBillDrawer={handleCreateBillDrawer}
              isBackModalOpen={isBackModalOpen}
              showHideBackModal={showHideBackModal}
              patientData={patientData}
              isDashboard={true}
              isPreviewFromTable={true}
              editBillData={billData && Object.keys(billData).length > 0 ? {...billData, patient: {...billData?.patient, patientId: billData?.patientId || patientData?.patient?.patientId}} : null}
              admissionId={billData?.admissionId}
              setEditedBillData={setBillData}
            />
          </Drawer>
        )}
      </div>
      <Drawer
        closeIcon={false}
        placement="right"
        onClose={handleBillingKnowMore}
        open={billingDrawer}
        width={600}
      >
        <BillingKnowMore handleBillingKnowMore={handleBillingKnowMore} />
      </Drawer>

      <ExpiredSubModal
        title={S_BILLING}
        styles={{
          mask: { zIndex: 9999 },
          wrapper: { zIndex: 9999 },
        }}
        isSubModalOpen={isSubModalOpen}
        showHideSubModal={showHideSubModal}
      />
    </>
  );
}

export default BillingDashboard;
