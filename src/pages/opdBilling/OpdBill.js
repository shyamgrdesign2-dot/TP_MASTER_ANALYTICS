import { pdf } from "@react-pdf/renderer";
import { fetchAdvancedDepositDetails, fetchBillDetails } from "./service";
import { useEffect, useState } from "react";
import { Spin } from "antd";
import ViewBillPdf from "./components/viewBillPdf/ViewBillPdf";
import { isAndroid } from "react-device-detect";
import { enrichPatientDataWithAbha } from "./utils/helper";

const OpdBill = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const billNumber = urlParams.get("billNumber") || "";
  const receiptNumber = urlParams.get("receiptNumber") || "";
  const patientId = urlParams.get("patientId") || "";
  const doctorId = urlParams.get("doctorId") || "";
  const token = urlParams.get("token") || "";
  const admissionId = urlParams.get("admissionId") || "";

  const isDepositReceipt = !!receiptNumber;

  const [pdfUrl, setPdfUrl] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [billPrintSettings, setBillPrintSettings] = useState(null);
  const [patientWalletBalance, setPatientWalletBalance] = useState(0);
  const [advancedSettings, setAdvancedSettings] = useState(null);
  const [profile, setProfile] = useState(null);

  const { patient = {} } = billDetails || {};
  const patientData = {
    pm_pid: patient.id,
    pm_fullname: patient.name,
    pm_gender: patient.gender,
    pm_contact_no: patient.phone,
    tpml_refrence_id: patient.refId,
    ageDays: patient.ageDays,
    ageMonths: patient.ageMonths,
    ageYears: patient.ageYears,
    pm_salutation: patient.salutation,
    address: patient.address,
  };

  useEffect(() => {
    if (isDepositReceipt) {
      getAdvancedDepositDetails();
    } else {
      getOpdBillDetails();
    }
  }, []);

  useEffect(() => {
    if (billDetails && billPrintSettings) {
      makePDFUrl();
    }
  }, [billDetails, billPrintSettings]);

  const getOpdBillDetails = async () => {
    try {
      const billDetailsRes = await fetchBillDetails(
        billNumber,
        patientId,
        doctorId,
        token,
        admissionId,
      );

      if (billDetailsRes && Object.keys(billDetailsRes).length > 0) {
        setBillDetails(billDetailsRes?.bill);
        setPatientWalletBalance(billDetailsRes?.walletBalance);
        setAdvancedSettings(billDetailsRes?.advancedSetting);
        setBillPrintSettings(billDetailsRes?.printSetting);
        setProfile(billDetailsRes?.doctor);
      }
    } catch (error) {
      console.error("Error fetching bill details:", error);
    }
  };

  const getAdvancedDepositDetails = async () => {
    try {
      const advancedDepositDetailsRes = await fetchAdvancedDepositDetails(
        receiptNumber,
        patientId,
        doctorId,
        token
      );
      if (
        advancedDepositDetailsRes &&
        Object.keys(advancedDepositDetailsRes).length > 0
      ) {
        setBillDetails(advancedDepositDetailsRes?.advancedDeposit);
        setPatientWalletBalance(advancedDepositDetailsRes?.walletBalance);
        setAdvancedSettings(advancedDepositDetailsRes?.advancedSetting);
        setBillPrintSettings(advancedDepositDetailsRes?.printSetting);
        setProfile(advancedDepositDetailsRes?.doctor);
      }
    } catch (error) {
      console.error("Error fetching advanced deposit details:", error);
    }
  };

  const makePDFUrl = async () => {
    const patientDataWithAbha = await enrichPatientDataWithAbha(patientData, patientId);
    const blob = await pdf(
      <ViewBillPdf
        printSettings={billPrintSettings}
        isDepositReceipt={isDepositReceipt}
        patientData={patientDataWithAbha}
        profile={profile}
        billData={billDetails}
        totalAdvanceBalance={patientWalletBalance}
        gstIn={advancedSettings?.GSTIN}
        showCreatedBy={advancedSettings?.enableCreatedByInRx}
      />
    ).toBlob();
    if (isAndroid) {
      window.location.href = URL.createObjectURL(blob);
    } else {
      setPdfUrl(URL.createObjectURL(blob));
    }
  };

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          title="PDF Viewer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        />
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <Spin size="large" />
          <div style={{ fontSize: "16px", color: "#666" }}>Loading PDF...</div>
        </div>
      )}
    </div>
  );
};

export default OpdBill;
