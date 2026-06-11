import React from "react";
import { pdf } from "@react-pdf/renderer";
import ViewPDF from "./server/viewpdf";

const resolveSelectedLang = (payload, selectedLang) => {
  if (selectedLang !== undefined && selectedLang !== null) {
    return selectedLang;
  }

  const defaultLang = payload?.printSettings?.default_language;
  if (!defaultLang || defaultLang === "English") {
    return 1;
  }

  return defaultLang;
};

const normalizeArrayValue = (value, fallbackKey) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && Array.isArray(value[fallbackKey])) {
    return value[fallbackKey];
  }
  return [];
};

export const renderPrintPayloadToBlob = async (
  payload,
  { selectedLang, isGynaecHistoryAccessable, showSnapRxImages = false } = {}
) => {
  if (!payload) {
    return null;
  }

  const {
    mode,
    rx,
    lg,
    caseManagerData,
    columns,
    initialRows,
    frequencyList,
    timingList,
    printSettings,
    fileHeader,
    fileFooter,
    fileLogo,
    fileWatermark,
    fileSignature,
    givenVaccines,
    dueVaccines,
    carePlanAssignments,
    smartDigitizeRxData,
    growthChartDetails,
    gynecHistoryData,
    obsHistoryData,
    labParamsData,
    customModules,
    patientBills,
    advanceReceipts,
    patientWalletBalance,
    labReportData,
    ophthalModuleData,
    zydusLabData,
    abhaDetails,
    isCvtExtHosAccessableFromGB,
  } = payload;

  const combinedCaseManagerData = {
    ...caseManagerData,
    gynecHistoryData,
    labParamsData,
    labReportData,
    ophthalModuleData,
    ...(zydusLabData?.length > 0 ? { zydusSelectedLabParams: zydusLabData } : {}),
  };

  const todayVaccines = {
    given: normalizeArrayValue(givenVaccines, "template"),
    due: normalizeArrayValue(dueVaccines, "detail"),
  };

  const resolvedLang = resolveSelectedLang(payload, selectedLang);

  const normalizedCustomModules = Array.isArray(customModules)
    ? customModules
    : Array.isArray(customModules?.modules)
      ? customModules.modules
      : [];

  return pdf(
    <ViewPDF
      mode={mode}
      rx={rx}
      lg={lg}
      caseManagerData={combinedCaseManagerData}
      columns={columns}
      initialRows={initialRows}
      frequencyList={frequencyList}
      timingList={timingList}
      printSettings={printSettings}
      fileHeader={fileHeader}
      fileFooter={fileFooter}
      fileLogo={fileLogo}
      fileWatermark={fileWatermark}
      fileSignature={fileSignature}
      todayVaccines={todayVaccines}
      givenVaccines={givenVaccines}
      dueVaccines={dueVaccines}
      carePlanAssignments={carePlanAssignments}
      smartRxData={smartDigitizeRxData}
      growthChartDetails={growthChartDetails}
      isGynaecHistoryAccessable={isGynaecHistoryAccessable}
      gynecHistoryData={gynecHistoryData}
      labParamsData={labParamsData}
      obsHistoryData={obsHistoryData}
      customModules={normalizedCustomModules}
      patientBills={patientBills}
      advanceReceipts={advanceReceipts}
      patientWalletBalance={patientWalletBalance}
      selectedLang={resolvedLang}
      ophthalModuleData={ophthalModuleData}
      zydusLabData={zydusLabData?.length > 0 ? {data: zydusLabData} : null}
      showSnapRxImages={showSnapRxImages}
      abhaDetails={abhaDetails}
      isCvtExtHosAccessableFromGB={isCvtExtHosAccessableFromGB}
    />
  ).toBlob();
};
