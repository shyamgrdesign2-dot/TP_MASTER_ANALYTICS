import React, { useState } from "react";
import { Font, Page, Document, View } from "@react-pdf/renderer";
import { calculatePadding } from "./helper";
import BillHeader from "./BillHeader";
import BillFooter from "./BillFooter";
import BillOtherSettings from "./BillOtherSettings";
import BillDetails from "./BillDetails";
import DepositDetails from "./DepositDetails";
import { PX_TO_PT } from "./constants";
import { TP_ASSETS_BASE } from "../../../../utils/constants";

// Roboto
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Regular.ttf`,
      fontWeight: 400,
    }, // Regular
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Medium.ttf`,
      fontWeight: 500,
    }, // Medium
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Bold.ttf`,
      fontWeight: 700,
    }, // Bold
  ],
});
// Arial
Font.register({
  family: "Arial",
  fonts: [
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Arimo-Regular.ttf`,
      fontWeight: 400,
    }, // Regular
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Arimo-Medium.ttf`,
      fontWeight: 500,
    }, // Medium
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Arimo-Bold.ttf`,
      fontWeight: 700,
    }, // Bold
  ],
});
// Times Roman
Font.register({
  family: "Times-Roman",
  fonts: [
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/EBGaramond-Regular.ttf`,
      fontWeight: 400,
    }, // Regular
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/EBGaramond-Medium.ttf`,
      fontWeight: 500,
    }, // Medium
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/EBGaramond-Bold.ttf`,
      fontWeight: 700,
    }, // Bold
  ],
});
// Verdana
Font.register({
  family: "Verdana",
  fonts: [
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Jost-Regular.ttf`,
      fontWeight: 400,
    }, // Regular
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Jost-Medium.ttf`,
      fontWeight: 500,
    }, // Medium
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Jost-Bold.ttf`,
      fontWeight: 700,
    }, // Bold
  ],
});
// Calibri
Font.register({
  family: "Calibri",
  fonts: [
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Regular.ttf`,
      fontWeight: 400,
    }, // Regular
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Medium.ttf`,
      fontWeight: 500,
    }, // Medium
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Bold.ttf`,
      fontWeight: 700,
    }, // Bold
  ],
});
// Tahoma
Font.register({
  family: "Tahoma",
  fonts: [
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Vazirmatn-Regular.ttf`,
      fontWeight: 400,
    }, // Regular
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Vazirmatn-Medium.ttf`,
      fontWeight: 500,
    }, // Medium
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Vazirmatn-Bold.ttf`,
      fontWeight: 700,
    }, // Bold
  ],
});

const ViewBillPdf = ({
  printSettings,
  isDepositReceipt,
  patientData,
  profile,
  billData,
  totalAdvanceBalance,
  gstIn,
  showCreatedBy,
}) => {

  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  
  let editDoctorFromList = null;
  
  if (isReceptionist) {
    const umIds = urlParams.get("um_id")?.split(",") || [];
    const umNames = urlParams.get("um_name")?.split(",") || [];
    const doctorsList = umIds.map((id, index) => ({
      value: parseInt(id),
      label: umNames[index],
    }));
    editDoctorFromList = billData?.doctorId
      ? doctorsList?.find((d) => String(d?.value) === String(billData?.doctorId))
      : null;
  }
  const isIpdBill = !!billData?.admissionId;
  const [fileWatermark, setFileWatermark] = useState(null);
  const paddingStyles = calculatePadding(printSettings?.headerFooter);

  return (
    <Document>
      <Page
        size={printSettings?.pageFormat?.pageType || "A5"}
        style={{
          ...paddingStyles,
          display: "flex",
          flexDirection: "column",
          paddingBottom: PX_TO_PT * 80, // Increase bottom padding to accommodate footer
        }}
        wrap={true}
      >
        <View style={{ flex: 1 }}>
          <BillHeader
            fileWatermark={fileWatermark}
            setFileWatermark={setFileWatermark}
            printSettings={printSettings}
            isDepositReceipt={isDepositReceipt}
            patientData={patientData}
            billData={billData}
            profile={profile}
            gstIn={gstIn}
            isIpdBill={isIpdBill}
          />

          {isDepositReceipt ? (
            <DepositDetails
              pageFormat={printSettings?.pageFormat}
              depositData={billData}
              totalAdvanceBalance={totalAdvanceBalance}
            />
          ) : (
            <BillDetails
              pageFormat={printSettings?.pageFormat}
              billData={billData}
              totalAdvanceBalance={totalAdvanceBalance}
              isIpdBill={isIpdBill}
            />
          )}
          <BillOtherSettings printSettings={printSettings} profile={profile} doctorName={editDoctorFromList?.label} />
        </View>
        <BillFooter
          printSettings={printSettings}
          billData={billData}
          showCreatedBy={showCreatedBy}
        />
      </Page>
    </Document>
  );
};

export default React.memo(ViewBillPdf);
