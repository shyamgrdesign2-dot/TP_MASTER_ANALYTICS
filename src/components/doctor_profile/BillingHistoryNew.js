import React, { useCallback, useState } from "react";
import { Drawer, Table } from "antd";
import { Navbar } from "react-bootstrap";
import { useDispatch } from "react-redux";

import { S_SMARTSYNC, S_TATVA_PRACTICE } from "../../utils/constants";
import { invoiceGenerate, receiptGenerate } from "../../redux/monetizationSlice";
import { errorMessage, getClinicName, getDeviceSdkData, getTokenData } from "../../utils/utils";
import BillingPrint from "./BillingPrint";
import { deviceType, osName } from "react-device-detect";
import { useSelector } from "react-redux";

const BillingHistoryNew = ({ show, setShow, billingHistoryList }) => {

  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.doctors);

  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

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
      title: 'Amount Paid',
      dataIndex: 'total_amount',
      key: 'total_amount',
      onCell: (record) => ({
        rowSpan: record.rowSpan,
      })
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
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text) => <div className={text === 'active' ? 'active' : 'expired'}>{text === 'active' ? 'Active' : 'Expired'}</div>,

    }
  ];

  return (
    <>
      <Drawer
        width={900}
        open={show}
        footer={null}
        onClose={() => setShow(false)}
        closeIcon={false}>
        <>
          <Navbar className="justify-content-between headerprescription p-0">
            <div className='align-items-center d-flex h-100'>
              <div className='border-end h-100 text-center' onClick={() => setShow(false)}>
                <div className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                  <i className='icon-right'></i>
                </div>
              </div>
              <div className='ms-3 title-common'>Billing History</div>
            </div>
          </Navbar>
          <Table
            className="table-billing p-20 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 60px)' }}
            dataSource={billingHistoryList}
            columns={columns}
            bordered
            pagination={false} />
        </>
      </Drawer>
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
};

export default BillingHistoryNew;
