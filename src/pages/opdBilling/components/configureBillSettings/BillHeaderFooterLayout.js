import React from "react";
import OtherSetttings from "./OtherSetttings";
import PatientInfo from "./PatientInfo";
import HeaderFooter from "./HeaderFooter";
import BillingInfo from "./BillingInfo";

const BillHeaderFooterLayout = ({
  headerFooter,
  setPrintSettings,
  isDepositReceipt,
}) => {
  return (
    <div className="px-3 form_addnewpatient">
      <HeaderFooter
        headerFooter={headerFooter}
        setPrintSettings={setPrintSettings}
      />
      <PatientInfo
        patientInfo={headerFooter?.patientInfo}
        setPrintSettings={setPrintSettings}
      />
      <BillingInfo
        billInfo={headerFooter?.billInfo?.filter(
          (_, index) => !isDepositReceipt || index !== 0
        )}
        setPrintSettings={setPrintSettings}
        isDepositReceipt={isDepositReceipt}
      />
      <OtherSetttings
        otherSettings={headerFooter?.otherSettings}
        setPrintSettings={setPrintSettings}
      />
    </div>
  );
};

export default BillHeaderFooterLayout;
