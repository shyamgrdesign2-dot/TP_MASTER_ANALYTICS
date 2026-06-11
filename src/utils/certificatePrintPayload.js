import React from "react";
import { pdf } from "@react-pdf/renderer";
import ViewCertificatePDF from "../components/print_settings/ViewCertificatePDF";
import { NORMAL } from "./constants";

export const renderCertificatePayloadToBlob = async (
  payload,
  { mode = NORMAL } = {}
) => {
  if (!payload) {
    console.error("Certificate payload is null or undefined");
    return null;
  }

  try {
    const {
      printSettings,
      fileHeader,
      fileFooter,
      fileLogo,
      fileWatermark,
      fileSignature,
      patientCertificate,
      doctorData,
    } = payload;

    const blob = await pdf(
      <ViewCertificatePDF
        mode={mode}
        printSettings={printSettings}
        fileHeader={fileHeader}
        fileFooter={fileFooter}
        fileLogo={fileLogo}
        fileWatermark={fileWatermark}
        fileSignature={fileSignature}
        heading={patientCertificate?.title || ""}
        content={patientCertificate?.content || ""}
        doctorData={doctorData}
      />
    ).toBlob();

    return blob;
  } catch (error) {
    console.error("Error generating certificate PDF blob:", error);
    throw new Error(`Failed to generate certificate: ${error.message}`);
  }
};
