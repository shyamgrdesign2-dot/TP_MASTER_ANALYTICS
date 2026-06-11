import { Button, Col, Row, Spin, Tabs, message } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MESSAGE_KEY,
  TAB_HEADER_FOOTER,
  TAB_PAGE_FORMAT,
} from "../../../../utils/constants";
import { isMobile } from "react-device-detect";
import { Container, Navbar } from "react-bootstrap";
import CommonModal from "../../../../common/CommonModal";

import { Document, Page, pdfjs } from "react-pdf";
import { pdf } from "@react-pdf/renderer";
import BillPageFormatLayout from "./BillPageFormatLayout";
import BillHeaderFooterLayout from "./BillHeaderFooterLayout";
import ViewBillPdf from "../viewBillPdf/ViewBillPdf";
import { deletePrintSetting, fetchPrintSetting, updatePrintSetting } from "../../service";
import { enrichPatientDataWithAbha } from "../../utils/helper";
import { useSelector } from "react-redux";
import { setBillPrintSettings, setIpdBillPrintSettings } from "../../../../redux/billingSlice";
import { useDispatch } from "react-redux";
import { ASSETS } from "../../../../assets";
const {
  alerticon: alertIcon,
  endVisit: visitEnd,
  autofill,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

const worker = require("pdfjs-dist/build/pdf.worker.min.js");
pdfjs.GlobalWorkerOptions.workerSrc = worker;

const ConfigureBillSettings = ({
  handleDrawerConfigureSettings,
  patientData,
  billData,
  isDepositReceipt,
  totalAdvanceBalance,
  isIpdBill,
}) => {
  const dispatch = useDispatch();
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const { defaultPrintSettings, profile, userId } = useSelector(
    (state) => state.doctors,
  );
  const { billPrintSettings, advancedSettings, ipdBillPrintSettings } = useSelector(
    (state) => state.billing
  );
  const TabsPrintSetting = [
    {
      key: TAB_HEADER_FOOTER,
      label: "Header & Footer",
    },
    {
      key: TAB_PAGE_FORMAT,
      label: "Page Format",
    },
  ];

  const [printSettings, setPrintSettings] = useState({});
  const [selectedTab, setSelectedTab] = useState(TAB_HEADER_FOOTER);
  const [isBackModalOpen, setIsBackModalOpen] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState();
  const [loadSuccess, setLoadSuccesss] = useState(false);
  const [divWidth, setDivWidth] = useState(0);
  const [printSettingsDifferFromRx, setPrintSettingsDifferFromRx] = useState(
    {}
  );
  const divRef = useRef(null);

  const transformPrintSettings = (defaultPrintSettings) => {
    const {
      page_format,
      header_footer,
      letterhead_format,
      qrcode_enable,
      signature_enable,
      signature_image,
      water_mark_enable,
      water_mark_image,
      logo_enable,
      logo_image,
      header_image,
    } = defaultPrintSettings;

    const {
      custom_margin = {},
      header,
      footer,
      margin = {},
      letterhead_margin = {},
      other_settings,
    } = header_footer || {};

    const { clinic_info, doctor_info } = header || {};

    return {
      headerFooter: {
        customLetterHeadMargin: {
          top: parseFloat(custom_margin.top) || 3,
          left: parseFloat(custom_margin.left || 2),
          right: parseFloat(custom_margin.right) || 2,
          bottom: parseFloat(custom_margin.bottom) || 2.5,
        },
        footer: { fontSize: footer?.font_size, title: footer?.title },
        header: {
          clinicInfo: {
            enabled: clinic_info?.enable === "Y",
            header: clinic_info?.header,
            position: clinic_info?.place === "R" ? "right" : "left",
            subheader: clinic_info?.subheader,
          },
          doctorInfo: {
            enabled: doctor_info?.enable === "Y",
            header: doctor_info?.header,
            position: doctor_info?.place === "R" ? "right" : "left",
            subheader: doctor_info?.subheader,
          },
          file: header_image,
          logo: {
            enabled: logo_enable === "Y",
            file: logo_image,
          },
        },
        letterHeadFormat: letterhead_format,
        margin: {
          top: parseFloat(margin.top),
          left: parseFloat(margin.left),
          right: parseFloat(margin.right),
          bottom: parseFloat(margin.bottom),
        },
        otherSettings: {
          qrCode: {
            enabled: qrcode_enable === "Y",
          },
          signature: {
            enabled: signature_enable === "Y",
            doctorNameEnabled: other_settings?.name_of_doctor_enable === "Y",
            file: signature_image,
            position:
              other_settings?.signature_place === "R" ? "right" : "left",
            qualification: other_settings?.qualification,
            qualificationEnabled: other_settings?.qualification_enable === "Y",
            registrationEnabled: other_settings?.registration_no_enable === "Y",
          },
          waterMark: {
            enabled: water_mark_enable === "Y",
            file: water_mark_image,
          },
        },
        uploadedLetterHeadMargin: {
          top: parseFloat(letterhead_margin.top) || 3,
          left: parseFloat(letterhead_margin.left) || 2,
          right: parseFloat(letterhead_margin.right) || 2,
          bottom: parseFloat(letterhead_margin.bottom) || 2.5,
        },
      },
      pageFormat: {
        fontFamily: page_format?.font_family,
        fontSize: page_format?.font_size,
        pageType: printSettings?.pageFormat?.pageType,
        patientInfoFontSize: 12,
      },
    };
  };

  const deepCompare = (obj1, obj2) => {
    let differences = {};

    const compare = (key, value1, value2, path = "") => {
      if (
        typeof value1 === "object" &&
        typeof value2 === "object" &&
        value1 !== null &&
        value2 !== null
      ) {
        Object.keys(value1).forEach((k) => {
          compare(k, value1[k], value2?.[k], path ? `${path}.${k}` : k);
        });
      } else if (value1 !== value2) {
        differences[path] = { oldValue: value1, newValue: value2 };
      }
    };

    compare("headerFooter", obj1.headerFooter, obj2.headerFooter);
    compare("pageFormat", obj1.pageFormat, obj2.pageFormat);

    return differences;
  };

  useEffect(() => {
    setDivWidth(divRef.current?.offsetWidth);
  }, [divRef]);

  useEffect(() => {
    if (billPrintSettings && Object.keys(billPrintSettings)?.length > 0 && !isIpdBill) {
      setPrintSettings(billPrintSettings);
    } else if (ipdBillPrintSettings && Object.keys(ipdBillPrintSettings)?.length > 0 && isIpdBill) {
      setPrintSettings(ipdBillPrintSettings);
    }
  }, []);

  useEffect(() => {
    if (printSettings && Object.keys(printSettings)?.length > 0) {
      makePDFUrl();
    }
  }, [printSettings]);

  useEffect(() => {
    const transformedPrintSettings =
      transformPrintSettings(defaultPrintSettings);
    const differences = deepCompare(transformedPrintSettings, printSettings);
    setPrintSettingsDifferFromRx(differences);
  }, [printSettings, defaultPrintSettings]);

  const makePDFUrl = async () => {
    const patientDataWithAbha = await enrichPatientDataWithAbha(
      patientData,
      billData?.patientId,
    );
    const blob = await pdf(
      <ViewBillPdf
        printSettings={printSettings}
        patientData={patientDataWithAbha}
        profile={profile}
        billData={billData}
        isDepositReceipt={isDepositReceipt}
        totalAdvanceBalance={totalAdvanceBalance}
        gstIn={advancedSettings?.GSTIN}
        showCreatedBy={advancedSettings?.enableCreatedByInRx}
      />
    ).toBlob();
    setPdfUrl(URL.createObjectURL(blob));
  };

  const onTabChange = useCallback(
    (key) => {
      setSelectedTab(key);
    },
    [selectedTab]
  );

  const showHideBackModal = (type) => {
    setIsBackModalOpen(type);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoadSuccesss(true);
  };

  const getBillPrintSettings = async () => {
    const printSettingsResponse = await fetchPrintSetting(
      isReceptionist ? urlParams.get("um_id") : userId,
    );
    if (printSettingsResponse) {
      setPrintSettings(printSettingsResponse);
      dispatch(setBillPrintSettings(printSettingsResponse));
    }
  };

  const handleDefaultSettings = async () => {
    await deletePrintSetting(isIpdBill ? "ipdBill" : "");
    getBillPrintSettings();
    showHideBackModal(null);
  };

  const handleSaveBtn = async () => {
    const formData = new FormData();
    formData.append(
      "headerFooter",
      JSON.stringify(printSettings?.headerFooter)
    );
    formData.append("pageFormat", JSON.stringify(printSettings?.pageFormat));

    formData.append(
      "logoFile",
      printSettings?.headerFooter?.header?.logo?.file
    );
    formData.append("headerFile", printSettings?.headerFooter?.header?.file);
    formData.append("footerFile", printSettings?.headerFooter?.footer?.file);

    formData.append(
      "waterMarkFile",
      printSettings?.headerFooter?.otherSettings?.waterMark?.file
    );
    if (printSettings?.headerFooter?.otherSettings?.signature?.file) {
      formData.append(
        "signatureFile",
        printSettings?.headerFooter?.otherSettings?.signature?.file
      );
    } else {
      formData.append("deleteSignature", true);
    }
    if (isIpdBill) {
      formData.append("billType", "ipdBill");
    }

    const updatePrintSettingRes = await updatePrintSetting(formData);
    if (updatePrintSettingRes?.status === 200) {
      dispatch(isIpdBill ? setIpdBillPrintSettings(printSettings) : setBillPrintSettings(printSettings));
      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={visitEnd} className="me-3" />
            <div>
              <div className="title-common text-start fontroboto">
                {"Updated Bill Print Settings successfully."}
              </div>
            </div>
            <img
              src={imgCloseVisit}
              alt="close"
              className="ms-3"
              onClick={() => message.destroy()}
            />
          </div>
        ),
        duration: 3,
      });
    }
    handleDrawerConfigureSettings();
  };

  const handleAutofillFromRx = () => {
    const {
      page_format,
      header_footer,
      letterhead_format,
      qrcode_enable,
      signature_enable,
      signature_image,
      water_mark_enable,
      water_mark_image,
      logo_enable,
      logo_image,
      header_image,
      footer_image,
    } = defaultPrintSettings;
    const {
      custom_margin,
      header,
      footer,
      margin,
      letterhead_margin,
      other_settings,
    } = header_footer || {};
    const { clinic_info, doctor_info } = header || {};
    setPrintSettings((prev) => {
      return {
        ...prev,
        headerFooter: {
          ...prev.headerFooter,
          customLetterHeadMargin: {
            bottom: custom_margin?.bottom
              ? parseFloat(custom_margin?.bottom)
              : 2.5,
            left: custom_margin?.left ? parseFloat(custom_margin?.left) : 2,
            right: custom_margin?.right ? parseFloat(custom_margin?.right) : 2,
            top: custom_margin?.top ? parseFloat(custom_margin?.top) : 3,
          },
          footer: { ...footer, fontSize: footer?.font_size, file: footer_image },
          header: {
            clinicInfo: {
              enabled: clinic_info.enable === "Y",
              header: clinic_info.header,
              position: clinic_info.place === "R" ? "right" : "left",
              subheader: clinic_info.subheader,
            },
            doctorInfo: {
              enabled: doctor_info.enable === "Y",
              header: doctor_info.header,
              position: doctor_info.place === "R" ? "right" : "left",
              subheader: doctor_info.subheader,
            },

            file: header_image,
            logo: {
              enabled: logo_enable === "Y",
              file: logo_image,
            },
          },
          letterHeadFormat: letterhead_format,
          margin: {
            bottom: margin?.bottom ? parseFloat(margin?.bottom) : 2.5,
            left: margin?.left ? parseFloat(margin?.left) : 2,
            right: margin?.right ? parseFloat(margin?.right) : 3,
            top: margin?.top ? parseFloat(margin?.top) : 2,
          },
          otherSettings: {
            qrCode: {
              enabled: qrcode_enable === "Y",
            },
            signature: {
              enabled: signature_enable === "Y",
              doctorNameEnabled: other_settings?.name_of_doctor_enable === "Y",
              file: signature_image,
              position:
                other_settings?.signature_place === "R" ? "right" : "left",
              qualification: other_settings?.qualification,
              qualificationEnabled:
                other_settings?.qualification_enable === "Y",
              registrationEnabled:
                other_settings?.registration_no_enable === "Y",
            },
            waterMark: {
              enabled: water_mark_enable === "Y",
              file: water_mark_image,
            },
          },
          uploadedLetterHeadMargin: {
            bottom: letterhead_margin?.bottom
              ? parseFloat(letterhead_margin?.bottom)
              : 2.5,
            left: letterhead_margin?.left
              ? parseFloat(letterhead_margin?.left)
              : 2,
            right: letterhead_margin?.right
              ? parseFloat(letterhead_margin?.right)
              : 2,
            top: letterhead_margin?.top
              ? parseFloat(letterhead_margin?.top)
              : 3,
          },
        },
        pageFormat: {
          fontFamily: page_format?.font_family,
          fontSize: page_format?.font_size,
          pageType: prev?.pageFormat?.pageType,
          patientInfoFontSize: 12,
        },
      };
    });
    message.open({
      key: MESSAGE_KEY,
      type: "",
      className: "message-appointment",
      content: (
        <div className="d-flex align-items-center">
          <img src={visitEnd} className="me-3" />
          <div>
            <div className="title-common text-start fontroboto">
              {"Fetched & Autofilled Details from Rx Print Settings "}
            </div>
          </div>
          <img
            src={imgCloseVisit}
            className="ms-3"
            onClick={() => message.destroy()}
            alt="close"
          />
        </div>
      ),
      duration: 3,
    });
  };

  return (
    <>
      <Navbar className="headerprescription p-0">
        <Container fluid className="h-100 gx-0 w-100">
          <Row className="h-100 align-items-center w-100 justify-content-between">
            <Col sm="auto" md="auto" lg="auto" className="h-100 w-auto">
              <div className="align-items-center d-flex h-100 gap-2">
                <div className="border-end h-100 text-center">
                  <div
                    onClick={() => showHideBackModal("back")}
                    className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
                  >
                    <i className="icon-right" />
                  </div>
                  {isBackModalOpen && (
                    <CommonModal
                      isModalOpen={isBackModalOpen}
                      onCancel={() => showHideBackModal(null)}
                      modalWidth={500}
                      title={"You may lose your data"}
                      modalBody={
                        <>
                          <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                              <img
                                className="me-3"
                                src={alertIcon}
                                alt="Warning"
                              />
                              <span>
                                Are you sure you want to leave? <br />
                                You will permanently lose your data.
                              </span>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="d-flex align-items-center mt-2 justify-content-end">
                              <div
                                onClick={
                                  isBackModalOpen === "default"
                                    ? handleDefaultSettings
                                    : handleDrawerConfigureSettings
                                }
                                className="me-4 text-decoration-underline btn p-0 text-main"
                              >
                                {isBackModalOpen === "default"
                                  ? "Yes"
                                  : "Yes Leave"}
                              </div>
                              <Button
                                onClick={() => showHideBackModal(null)}
                                className="lh-lg btn btn-primary3 btn-41 px-4"
                              >
                                <span>
                                  {isBackModalOpen === "default"
                                    ? "No"
                                    : "No, Stay"}
                                </span>
                              </Button>
                            </div>
                          </div>
                        </>
                      }
                    />
                  )}
                </div>
                <span className="title-digitise-card">
                  Configure Bill Print Setting
                </span>
              </div>
            </Col>
            <Col sm="auto" md="auto" lg="auto" className="h-100  w-auto">
              <div className="align-items-center d-flex h-100 gap-2">
                <button
                  className="btn btn-text me-14"
                  onClick={() => showHideBackModal("default")}
                >
                  <span>Default Settings</span>
                </button>
                <Button
                  type="button"
                  className="btn-41 btn px-4 btn-primary3 me-4"
                  onClick={handleSaveBtn}
                >
                  Save
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </Navbar>

      <div className={"w-100 bg-body wrapper2"}>
        <Row justify="space-between">
          {printSettings && Object.keys(printSettings)?.length > 0 && (
            <Col xl={8} sm={10} className="pe-3">
              <div
                className="bg-white overflow-y-auto"
                style={{ height: "calc(100vh - 60px)" }}
              >
                <Tabs
                  defaultActiveKey="1"
                  items={TabsPrintSetting}
                  onChange={onTabChange}
                  className="print-tabs"
                />
                {!isIpdBill && printSettingsDifferFromRx &&
                  Object.keys(printSettingsDifferFromRx)?.length > 0 && (
                    <Button
                      type="button"
                      className="btn-41 btn px-4 ant-btn-text btn-input align-items-center d-flex m-3"
                      onClick={handleAutofillFromRx}
                      icon={<img src={autofill} alt="autofill" />}
                    >
                      Autofill Details from Rx Print Settings
                    </Button>
                  )}
                {selectedTab === TAB_HEADER_FOOTER &&
                printSettings &&
                Object.keys(printSettings).length ? (
                  <BillHeaderFooterLayout
                    headerFooter={printSettings?.headerFooter}
                    setPrintSettings={setPrintSettings}
                    isDepositReceipt={isDepositReceipt}
                  />
                ) : (
                  selectedTab === TAB_PAGE_FORMAT && (
                    <BillPageFormatLayout
                      pageFormat={printSettings?.pageFormat}
                      setPrintSettings={setPrintSettings}
                    />
                  )
                )}
              </div>
            </Col>
          )}
          <Col xl={16} sm={14}>
            <div
              className="mx-auto overflow-y-auto "
              style={{ width: isMobile ? 580 : 900 }}
            >
              <div className="titleprint mt-20">Preview</div>
              <div
                ref={divRef}
                className="rounded-20px bg-white mt-20 overflow-hidden"
              >
                <div className="position-relative printheight">
                  {pdfUrl && (
                    <Document
                      loading={
                        <Spin
                          style={{
                            position: "absolute",
                            zIndex: 0,
                            left: "50%",
                            top: "50%",
                            height: "100%",
                          }}
                        />
                      }
                      error={
                        <div
                          style={{
                            position: "absolute",
                            zIndex: 0,
                            left: "42%",
                            top: "50%",
                          }}
                        >
                          {"Failed to load PDF file."}
                        </div>
                      }
                      noData={
                        <div
                          style={{
                            position: "absolute",
                            zIndex: 0,
                            left: "50%",
                            top: "50%",
                          }}
                        >
                          {"No PDF file specified."}
                        </div>
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
                                loadSuccess ? "react-pdf__Page_afterload" : null
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
                  )}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default ConfigureBillSettings;
