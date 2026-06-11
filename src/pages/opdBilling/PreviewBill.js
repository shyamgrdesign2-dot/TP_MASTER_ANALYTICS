import { Button, Col, Drawer, Row, Spin } from "antd";
import HeaderPrescriptionPrint from "../../common/HeaderPrescriptionPrint";
import { isMobile } from "react-device-detect";
import React, { useEffect, useRef, useState, useCallback } from "react";
import ConfigureBillSettings from "./components/configureBillSettings/ConfigureBillSettings";
import { Document, Page } from "react-pdf";
import ViewBillPdf from "./components/viewBillPdf/ViewBillPdf";
import { pdf } from "@react-pdf/renderer";
import { useSelector } from "react-redux";
import {
  createShortLink,
  fetchBillDetailsByBillNumber,
  fetchPrintSetting,
  generateBillToken,
  sendWhatsAppMessage,
} from "./service";
import { setBillPrintSettings, setIpdBillPrintSettings } from "../../redux/billingSlice";
import { useDispatch } from "react-redux";
import { Container, Navbar } from "react-bootstrap";
import { handleDownload, isEditBillDisabled, printContent, enrichPatientDataWithAbha } from "./utils/helper";
import { setLoadingStatus } from "../../redux/uploadDocSlice";
import { db } from "../../firebase";
import { deleteDoc, doc, getDoc, onSnapshot } from "firebase/firestore";
import { deleteDocsUploadedFromAndroid } from "../medicalRecords/service";
import RefundBill from "./components/billingDashboard/RefundBill/RefundBill";
import { getClinic, trackEvent } from "../../utils/utils";

import { PERSISTANT_STORAGE_KEY_BILL_TOKEN } from "../../utils/constants";
import { useLocalStorage } from "../../utils/localStorage";
import config from "../../config";
import { WhatsAppOpdBillTemplateId } from "./utils/constants";
import { ASSETS } from "../../assets";
const {
  wtsp,
  loading_3: loadingImg,
  refundActive,
  refundInactive,
} = ASSETS.images;

const PreviewBill = ({
  handleCreateBillDrawer,
  isPreviewFromTable,
  isDepositReceipt,
  billData,
  totalAdvanceBalance,
  patientAdvanceData,
  handleMessageForm3c,
  getPatientBills,
  handleEditBillDrawer,
  isPreviewForm3c,
}) => {
  const isIpdBill = !!billData?.admissionId;
  const [getBillToken, setBillToken] = useLocalStorage(
    PERSISTANT_STORAGE_KEY_BILL_TOKEN
  );
  const [billDetails, setBillDetails] = useState(billData);
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
  const dispatch = useDispatch();
  const deviceUid = localStorage.getItem("app_device_unique_id");
  const { billPrintSettings, advancedSettings, ipdBillPrintSettings } = useSelector(
    (state) => state.billing
  );
  const { userId } = useSelector((state) => state.doctors);
  const { profile } = useSelector((state) => state.doctors);
  const divRef = useRef(null);
  const pdfGenerationKeyRef = useRef(null);
  const isGeneratingRef = useRef(false);
  const { isEditDisabled } = isEditBillDisabled(billDetails);

  // Helper function to determine if doctorId should be passed
  const getDoctorIdParam = () => {
    const doctorId = billDetails?.doctorId || userId;

    // Case 1: Not receptionist - pass doctorId in both cases
    if (!isReceptionist) {
      return doctorId;
    }

    // Case 2: Receptionist - pass doctorId only when not isDepositReceipt
    if (isReceptionist && !isDepositReceipt) {
      return doctorId;
    }

    // Case 3: Receptionist with isDepositReceipt - don't pass doctorId
    return null;
  };
  const [divWidth, setDivWidth] = useState(0);
  const [showConfigureSettings, setShowConfigureSettings] = useState(false);
  const [numPages, setNumPages] = useState();
  const [printBlob, setPrintBlob] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [refundBillDrawer, setRefundBillDrawer] = useState(false);
  const refundIconRef = useRef(null);
  const isRefunded = billData?.paymentStatus === "Refunded";
  const { planDetails } = useSelector((state) => state.subscription);
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const receptionistId = urlParams.get("receptionistId");
  const receptionistName = urlParams.get("receptionistName");
  const clinicName = urlParams.get("clinicName");
  const isEditAccessRestricted =
    isReceptionist &&
    !isIpdBill &&
    advancedSettings?.editBillAccessControlForReceptionist === false;
  const [buttonText, setButtonText] = useState("Send to WhatsApp");
  const [isLoading, setIsLoading] = useState(false);

  const clinic = getClinic(profile?.hospital_data);

  // Use ref to handle hover without causing re-renders
  const handleRefundMouseEnter = useCallback(() => {
    if (refundIconRef.current) {
      refundIconRef.current.src = refundInactive;
    }
  }, []);

  const handleRefundMouseLeave = useCallback(() => {
    if (refundIconRef.current) {
      refundIconRef.current.src = refundActive;
    }
  }, []);

  useEffect(() => {
    if (billDetails && Object.keys(billDetails).length > 0 && isIpdBill) {
      handleRefundSuccess();
    }
  }, []);

  useEffect(() => {
    setDivWidth(divRef.current?.offsetWidth);
  }, [divRef]);

  useEffect(() => {
    const settings = isIpdBill ? ipdBillPrintSettings : billPrintSettings;

    if (settings && Object.keys(settings).length > 0 && billDetails && Object.keys(billDetails).length > 0) {
      makePDFUrl();
    }
  }, [billPrintSettings, ipdBillPrintSettings, billDetails, advancedSettings, totalAdvanceBalance]);

  useEffect(() => {
    if (billData && Object.keys(billData).length > 0) {
      setBillDetails(billData);
      // Reset PDF generation key to force regeneration
      pdfGenerationKeyRef.current = null;
      setPdfUrl(null);
      setPrintBlob(null);
      setNumPages(undefined);
    }
  }, [billData]);

  useEffect(() => {
    if (
      (billPrintSettings && Object.keys(billPrintSettings).length === 0) ||
      isReceptionist
    ) {
      getBillPrintSettings();
    }
    if (
      (ipdBillPrintSettings && Object.keys(ipdBillPrintSettings).length === 0) || isReceptionist
    ) {
      getIpdBillPrintSettings();
    }
  }, []);

  const getBillPrintSettings = async () => {
    const printSettingsResponse = await fetchPrintSetting(
      isReceptionist ? billDetails?.doctorId : userId
    );
    if (printSettingsResponse) {
      dispatch(setBillPrintSettings(printSettingsResponse));
    }
  };

  const getIpdBillPrintSettings = async () => {
    const printSettingsResponse = await fetchPrintSetting(
      isReceptionist ? billDetails?.doctorId : userId,
      "ipdBill"
    );
    if (printSettingsResponse) {
      dispatch(setIpdBillPrintSettings(printSettingsResponse));
    }
  };

  const makePDFUrl = async () => {
    // Create a stable key based on actual bill data
    const currentKey = JSON.stringify({
      billNumber: billDetails?.billNumber,
      admissionId: billDetails?.admissionId,
      patientId: billDetails?.patientId,
      printSettings: isIpdBill ? ipdBillPrintSettings : billPrintSettings,
      isDepositReceipt: isDepositReceipt,
      totalAdvanceBalance: totalAdvanceBalance,
      gstIn: advancedSettings?.GSTIN,
      showCreatedBy: advancedSettings?.enableCreatedByInRx,
    });

    // Only regenerate if the key has actually changed and not already generating
    if (pdfGenerationKeyRef.current === currentKey || isGeneratingRef.current) {
      return;
    }

    pdfGenerationKeyRef.current = currentKey;
    isGeneratingRef.current = true;

    try {
      const patientDataWithAbha = await enrichPatientDataWithAbha(patientData, billDetails?.patientId);
      const blob = await pdf(
        <ViewBillPdf
          printSettings={isIpdBill ? ipdBillPrintSettings : billPrintSettings}
          isDepositReceipt={isDepositReceipt}
          patientData={patientDataWithAbha}
          profile={profile}
          billData={billDetails}
          totalAdvanceBalance={totalAdvanceBalance}
          gstIn={advancedSettings?.GSTIN}
          showCreatedBy={advancedSettings?.enableCreatedByInRx}
        />
      ).toBlob();
      setPdfUrl(URL.createObjectURL(blob));
    } finally {
      isGeneratingRef.current = false;
    }
  };

  const handleDrawerConfigureSettings = () => {
    setShowConfigureSettings(!showConfigureSettings);
  };

  async function onDocumentLoadSuccess(successEvent) {
    setNumPages(successEvent?.numPages);
    const data = await successEvent.getData();
    const blob = new Blob([data], { type: "application/pdf" });
    setPrintBlob(blob);
  }

  const setStartLoader = () => {
    dispatch(setLoadingStatus(true));
  };

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
                  deleteDocsUploadedFromAndroid(patientData?.patient_unique_id);
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

  const handleRefundBillDrawer = () => {
    trackEvent("TP_refundbill_billpreviewpage Settings_save", {
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      city: clinic?.hm_city,
      pincode: clinic?.hm_pincode,
      receptionistId: receptionistId,
      receptionistName: receptionistName,
    });
    setRefundBillDrawer((prev) => !prev);
  };

  const handleSendToWhatsapp = async () => {
    setIsLoading(true);
    let token = getBillToken();
    if (!token) {
      token = await generateBillToken();
      setBillToken(token);
    }

    const doctorId = getDoctorIdParam();
    const shortLink = await createShortLink(
      `${config.doctor_portal_url}/opd-bill?token=${token}${
        billDetails?.billNumber ? `&billNumber=${billDetails?.billNumber}` : ""
      }${
        isDepositReceipt ? `&receiptNumber=${billDetails?.receiptNumber}` : ""
      }${billDetails?.patientId ? `&patientId=${billDetails?.patientId}` : ""}${
        doctorId ? `&doctorId=${doctorId}` : ""
      }${isIpdBill ? `&admissionId=${billDetails?.admissionId}` : ""}&receptionist=true&patientViewBill=true`
    );
    const message = {
      patient_name: patient?.name,
      clinic_name: clinic?.hm_name || clinicName,
      bill_link: shortLink,
      clinic_name2: clinic?.hm_name || clinicName,
    };
    const statusRes = await sendWhatsAppMessage({
      template_id: WhatsAppOpdBillTemplateId,
      text: JSON.stringify(message),
      mobile_number: patient?.phone,
    });
    if (statusRes === 200) {
      setButtonText("Successfully Sent");
      setIsLoading(false);
    }
  };

  const handleRefundSuccess = async () => {
    const billDetailsRes = await fetchBillDetailsByBillNumber(
      billDetails?.billNumber,
      isIpdBill ? billDetails?.admissionId : null,
      isIpdBill ? "ipd" : "opd"
    );
    setBillDetails(billDetailsRes);
  };

  const handlePrintClick = () => {
    trackEvent("TP_printbill_billpreviewpage Settings_save", {
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      city: clinic?.hm_city,
      pincode: clinic?.hm_pincode,
      receptionistId: receptionistId,
      receptionistName: receptionistName,
    });
    printContent(printBlob, billData?.patientId, setStartLoader);
  };

  const handleDownloadClick = () => {
    trackEvent("TP_Billing_DownloadBill", {
      patientName: patient?.name || "",
      patientId: patient?.id || "",
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      city: clinic?.hm_city,
      pincode: clinic?.hm_pincode,
      subscriptionStatus: planDetails?.currentPlanStatus,
      receptionistId: receptionistId,
      receptionistName: receptionistName,
    });
    handleDownload(pdfUrl, printBlob, billDetails?.patientId, setStartLoader);
  };

  return (
    <div>
      {isPreviewFromTable ? (
        <Navbar className="headerprescription p-0">
          <Container fluid className="h-100 gx-0 w-100">
            <Row className="h-100 align-items-center w-100 justify-content-between">
              <Col sm="auto" md="auto" lg="auto" className="h-100 w-auto">
                <div className="align-items-center d-flex h-100 gap-2">
                  <div className="border-end h-100 text-center">
                    <div
                      onClick={(e) => handleCreateBillDrawer(e, true)}
                      className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
                    >
                      <i className="icon-right" />
                    </div>
                  </div>
                  <span className="title-digitise-card">View Bill</span>
                </div>
              </Col>
            </Row>
          </Container>
        </Navbar>
      ) : (
        <HeaderPrescriptionPrint
          patient_data={patientData}
          tcm_id={6222}
          handleGoToAppointment={(e) => handleCreateBillDrawer(e, true)}
        />
      )}

      <div
        className={`${
          isMobile ? "p-0" : ""
        } w-100 bg-body wrapper2 prescription-wrapper`}
      >
        <Row gutter={{ xl: 40, lg: 0 }} justify="center">
          <Col md={7} sm={7} xl={isDepositReceipt ? 6 : 5}>
            {isMobile || isReceptionist ? (
              ""
            ) : (
              <div
                className="d-flex align-items-center justify-content-end h-38"
                onClick={handleDrawerConfigureSettings}
              >
                <i className="icon-setting me-2"></i>
                <span className="text-decoration-underline fw-medium cursor-pointer">
                  Configure Print Setting
                </span>
              </div>
            )}
            <div
              className={`${
                !isMobile
                  ? "rounded-20px mt-20"
                  : "border-top-0 border-start-0 border-bottom-0"
              } border p-20 bg-white d-flex justify-content-between flex-column`}
              style={{
                height: !isMobile
                  ? "calc(100vh - 160px)"
                  : "calc(100vh - 60px)",
              }}
            >
              <div>
                {!isMobile || isReceptionist ? (
                  ""
                ) : (
                  <div
                    className="d-flex align-items-center mb-14 h-38"
                    onClick={handleDrawerConfigureSettings}
                  >
                    <i className="icon-setting me-2"></i>
                    <span className="text-decoration-underline fw-medium cursor-pointer">
                      Configure Print Setting
                    </span>
                  </div>
                )}
                <Button
                  type="text"
                  className={`btn btnicon20 align-items-center d-flex mb-3 btn-41 w-100 ${
                    isReceptionist ? "receptionist-white-btn" : "btn-input"
                  }`}
                  icon={<i className="icon-Print" />}
                  onClick={handlePrintClick}
                >
                  <span className="fw-semibold">
                    {isDepositReceipt ? "Print Deposit Receipt" : "Print Bill"}
                  </span>
                  <i className="icon-right iconrotate180 ms-auto"></i>
                </Button>
                <Button
                  type="text"
                  className={`btn btnicon20 align-items-center d-flex mb-3 btn-41 w-100 ${
                    isReceptionist ? "receptionist-white-btn" : "btn-input"
                  }`}
                  icon={<i className="icon-download" />}
                  onClick={handleDownloadClick}
                >
                  <span className="fw-semibold">
                    {isDepositReceipt
                      ? "Download Deposit Receipt"
                      : "Download Bill"}
                  </span>
                  <i className="icon-right iconrotate180 ms-auto"></i>
                </Button>
                {!isDepositReceipt &&
                  billDetails?.paymentStatus !== "Refunded" && (
                    <Button
                      type="text"
                      className={`btn btnicon20 align-items-center d-flex btn-41 w-100 mb-3 ${
                        isReceptionist ? "receptionist-white-btn" : "btn-input"
                      }`}
                      icon={
                        <img
                          ref={refundIconRef}
                          src={refundActive}
                          alt="refund"
                          loading="lazy"
                        />
                      }
                      onMouseEnter={handleRefundMouseEnter}
                      onMouseLeave={handleRefundMouseLeave}
                      onClick={() => handleRefundBillDrawer()}
                    >
                      <span className="fw-semibold">Refund</span>
                      <i className="icon-right iconrotate180 ms-auto"></i>
                    </Button>
                  )}
                {!isEditDisabled &&
                  !isDepositReceipt &&
                  !isPreviewForm3c &&
                  !isEditAccessRestricted && (
                  <Button
                    type="text"
                    className={`btn btnicon20 align-items-center d-flex btn-41 w-100 mb-3 ${
                      isReceptionist ? "receptionist-white-btn" : "btn-input"
                    }`}
                    icon={<i className="icon-Edit" />}
                    onClick={() => handleEditBillDrawer(true)}
                  >
                    <span className="fw-semibold">Edit Bill</span>
                    <i className="icon-right iconrotate180 ms-auto"></i>
                  </Button>
                  )}

                <div className="bg-body d-flex flex-column p-3 rounded-10px border">
                  <div className="d-flex">
                    <img
                      src={wtsp}
                      alt="Whatsapp Icon"
                      className="align-self-baseline me-3"
                    />
                    <div className="fontroboto title-common">
                      <div className="fw-normal fontroboto mb-2">
                        {"Send this bill to Patient's WhatsApp"}
                      </div>
                      {patientData !== undefined
                        ? ` +91 ${patientData.pm_contact_no}`
                        : "-"}
                    </div>
                  </div>

                  <button
                    className="btn btn-send-to-wtsap btnicon20 align-items-center d-flex mb-1 mt-3 btn-41 w-100"
                    onClick={handleSendToWhatsapp}
                    disabled={buttonText === "Successfully Sent"}
                  >
                    {isLoading ? (
                      <img
                        src={loadingImg}
                        alt="Loading..."
                        width="25px"
                        height="25px"
                      />
                    ) : (
                      buttonText
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Col>
          <Col md={17} sm={17} xl={12}>
            <div className={isMobile ? "p-20" : ""}>
              <div className="d-flex align-itms-center justify-content-between">
                <div className="titleprint">
                  {isDepositReceipt ? "Deposit Receipt Preview" : "Preview"}
                </div>
              </div>
              <div className="rounded-20px bg-white mt-20 overflow-hidden">
                <div ref={divRef} className="printheight">
                  <div className="position-relative h-100">
                    <Document
                      key={`${billDetails?.billNumber || billDetails?.id || 'new'}-${JSON.stringify(billDetails?.billItems || [])}-${billDetails?.payableAmount || 0}`}
                      loading={
                        <Spin
                          style={{
                            position: "absolute",
                            zIndex: 0,
                            left: "50%",
                            top: "50%",
                          }}
                        />
                      }
                      error={
                        <Spin
                          style={{
                            position: "absolute",
                            zIndex: 0,
                            left: "50%",
                            top: "50%",
                          }}
                          tip="Loading PDF..."
                        />
                      }
                      noData={
                        <Spin
                          style={{
                            position: "absolute",
                            zIndex: 0,
                            left: "50%",
                            top: "50%",
                          }}
                          tip="Loading PDF..."
                        />
                      }
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                    >
                      {Array.apply(null, Array(numPages))
                        .map((x, i) => i + 1)
                        .map((page) => {
                          return (
                            <Page
                              key={Math.random()}
                              className={
                                printBlob ? "react-pdf__Page_afterload" : null
                              }
                              loading={null}
                              width={divWidth}
                              pageNumber={page}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          );
                        })}
                    </Document>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
      {showConfigureSettings && (
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleDrawerConfigureSettings}
          open={showConfigureSettings}
          width="100%"
          push={false}
        >
          <ConfigureBillSettings
            showConfigureSettings={showConfigureSettings}
            handleDrawerConfigureSettings={handleDrawerConfigureSettings}
            patientData={patientData}
            billData={billDetails}
            totalAdvanceBalance={totalAdvanceBalance}
            isDepositReceipt={isDepositReceipt}
            isIpdBill={!!billDetails?.admissionId}
          />
        </Drawer>
      )}

      {refundBillDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleRefundBillDrawer}
          open={refundBillDrawer}
          width={isMobile ? "80%" : "60%"}
        >
          <RefundBill
            handleRefundBillDrawer={handleRefundBillDrawer}
            billData={billDetails}
            onRefundSuccess={handleRefundSuccess}
            patientAdvanceData={patientAdvanceData}
            handleMessageForm3c={handleMessageForm3c}
            getPatientBills={getPatientBills}
          />
        </Drawer>
      )}
    </div>
  );
};

export default React.memo(PreviewBill);
