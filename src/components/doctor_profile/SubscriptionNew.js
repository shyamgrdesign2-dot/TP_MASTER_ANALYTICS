import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Drawer, Table } from "antd";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import BillingHistoryNew from "./BillingHistoryNew";
import BillingPrint from "./BillingPrint";
import { billingHistory, invoiceGenerate, receiptGenerate } from "../../redux/monetizationSlice";
import { fetchSubscriptionDetails } from "../../redux/subscriptionSlice";
import { S_SMARTSYNC, S_TATVA_PRACTICE } from "../../utils/constants";
import { errorMessage, getClinicName, getDeviceSdkData, getTokenData } from "../../utils/utils";
import { deviceType, osName } from "react-device-detect";
import { ASSETS } from "../../assets";
const {
  crownPurple: crownIcon,
  billings: billingsIcon,
  crown,
} = ASSETS.images;

function SubscriptionNew() {

  const navigate = useNavigate();

  const { profile } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const { billingHistoryList } = useSelector((state) => state.monetization);
  const dispatch = useDispatch();

  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");

  const billingFetched = useRef(false);
  useEffect(() => {
    if (!planDetails && !isReceptionist) {
      dispatch(fetchSubscriptionDetails());
    }
  }, [planDetails, dispatch]);

  useEffect(() => {
    const b2c = profile?.b2c ?? planDetails?.profile_b2c;
    if (b2c && !billingFetched.current && !isReceptionist) {
      billingFetched.current = true;
      dispatch(billingHistory(b2c));
    }
  }, [profile?.b2c, planDetails?.profile_b2c, dispatch]);

  const handlePdfDrawer = useCallback(() => {
    setOpen(!open);
  }, [open])

  const generateInvoice = async (invoice_id) => {
    const action = await dispatch(invoiceGenerate(invoice_id));
    if (action.meta.requestStatus === "fulfilled") {
      if (action?.payload?.status === 200) {
        setPdfUrl(action?.payload?.body?.url)
        handlePdfDrawer()
      } else {
        errorMessage(action.payload.message)
      }
    } else {
      errorMessage(action.payload.message)
    }
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_Monetization_InvoiceExplore", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      um_id: tokenData?.user_id,
      clinic_Name: clinic_name,
      ...deviceSdkData,
    });
  }

  const generateReceipt = async (receipt_id) => {
    const action = await dispatch(receiptGenerate(receipt_id));
    if (action.meta.requestStatus === "fulfilled") {
      if (action?.payload?.status === 200) {
        setPdfUrl(action?.payload?.body?.url)
        handlePdfDrawer()
      } else {
        errorMessage(action.payload.message)
      }
    } else {
      errorMessage(action.payload.message)
    }
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_Monetization_ReceiptExplore", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      um_id: tokenData?.user_id,
      clinic_Name: clinic_name,
      ...deviceSdkData,
    });
  }

  const columns = [
    {
      title: 'Current Active Plans',
      dataIndex: 'service_display_name',
      key: 'service_display_name',
      render: (text, record) => (
        <><span className="fw-semibold">{text} </span> {record?.service_name !== S_TATVA_PRACTICE && record?.service_name !== S_SMARTSYNC ? <span>(Addon)</span> : record?.service_name === S_SMARTSYNC ? <span>(Device)</span> : ''}</>
      ),
    },
    {
      title: 'Start Date',
      dataIndex: 'plan_start_date',
      key: 'plan_start_date',
    },
    {
      title: 'Next Payment',
      dataIndex: 'plan_end_date',
      key: 'plan_end_date',
    },
    {
      title: 'Invoice',
      dataIndex: 'invoice_id',
      key: 'invoice_id',
      render: (text, record) => (
        record?.payment_status ? <button className="btn btn-link text-primary p-0" onClick={() => record?.payment_status === 'FULL' ? generateInvoice(record?.invoice_id) : generateReceipt(record?.receipt_id)}>{record?.payment_status === 'FULL' ? 'View Invoice' : 'View Receipt'}</button> : "N/A"
      ),
      // onCell: (record) => ({
      //   rowSpan: record.rowSpan,
      // }),
      // render: (text, row) => ({
      //   children: <button className="btn btn-link text-primary p-0" onClick={() => generateInvoice(text)}>{text}</button> || "N/A",
      //   props: {
      //     rowSpan: row.rowSpan,
      //   },
      // }),
    },
  ];

  return (

    <>
      <div className="rounded-20px bg-white mb-5">
        <div className="d-flex align-items-center justify-content-between p-20 border-bottom"
          style={{ borderColor: "#F1F1F5" }}>
          <div className="d-flex align-items-center justify-content-between">
            <div className="profile-head-icon me-3">
              <img loading="lazy" src={crownIcon} alt="" />
            </div>
            <div className="titleprint">Subscription</div>
          </div>
          {billingHistoryList?.length > 0 &&
            <button className="btn d-flex align-items-center btn-text"
              onClick={() => {
                setShowBillingHistory(true);
                const clinic_name = getClinicName(profile?.hospital_data);
                const tokenData = getTokenData();
                const deviceSdkData = getDeviceSdkData();
                window.Moengage.track_event("TP_Monetization_BillingHistory", {
                  doctor_name: profile?.um_name,
                  doctor_number: profile?.um_contact,
                  doctor_unique_id: profile?.doctor_unique_id,
                  doctor_specialty: profile?.dp_name,
                  clinic_id: tokenData?.clinic_id,
                  um_id: tokenData?.user_id,
                  clinic_Name: clinic_name,
                  ...deviceSdkData
                });
              }}>
              <img loading="lazy" src={billingsIcon}
                style={{ color: "#EE7200", marginRight: "5px" }} alt="" />
              <span> Billing History </span>
            </button>
          }
        </div>

        {billingHistoryList?.length > 0 ? (
          <>
            <Table
              className="table-billing p-20"
              dataSource={billingHistoryList}
              columns={columns}
              bordered
              pagination={false} />
            <BillingHistoryNew
              show={showBillingHistory}
              setShow={setShowBillingHistory}
              billingHistoryList={billingHistoryList} />
            <div className="text-center p-4">
              <Button className="btn btn-proceed btn-primary3 w-25 mx-auto align-items-center justify-content-center d-flex" onClick={() => navigate('/get-unlimited-access')}>
                <img className="me-2" src={crown} alt="Crown" />
                Buy more
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center p-4">
            <div className="mb-4 text-black-50 fw-medium">You have no active plan!</div>
            <Button className="btn btn-proceed btn-primary3 w-25 mx-auto align-items-center justify-content-center d-flex" onClick={() => navigate('/get-unlimited-access')}>
              <img className="me-2" src={crown} alt="Crown" />
              Buy plan now
            </Button>
          </div>
        )}

      </div>
      <Drawer
        width={800}
        open={open}
        footer={null}
        onClose={handlePdfDrawer}
        closeIcon={false}>
        <BillingPrint open={open} handlePdfDrawer={handlePdfDrawer} PDF_URL={pdfUrl && pdfUrl} />
      </Drawer>
    </>
  );
}

export default React.memo(SubscriptionNew);
