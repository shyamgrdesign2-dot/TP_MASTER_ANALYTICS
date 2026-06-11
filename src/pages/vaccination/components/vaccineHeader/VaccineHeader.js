import React, { useState, useCallback, useContext } from "react";
import { Container, Navbar, Row, Col } from "react-bootstrap";
import { Button, Dropdown, Menu, Popover, Spin, Radio, Checkbox, Divider } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { isMobile, isTablet } from "react-device-detect";
import { VaccinationCategoryEnum } from "../../VaccinationHelper";

import CashManagerContext from "../../../../context/CashManagerContext";
import ProfilePopover from "../../../../common/ProfilePopover";
import CommonModal from "../../../../common/CommonModal";

import Preview from "./../preview/Preview";
import "./VaccineHeader.scss";
import VideoModal from "../../../../common/VideoModal";

import { LoadingOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import DemoExpirationBanner from "../../../../common/DemoExpirationBanner";
import PlanExpirationBanner from "../../../../common/PlanExpirationBanner";
import { trackEvent } from "../../../../utils/utils";
import { ASSETS } from "../../../../assets";
const {
  alerticon: alertIcon,
  tutorial2,
  tubeIcon: playIcons,
} = ASSETS.images;

function VaccineHeader({
  handleDrawerVaccination,
  vaccinesData,
  setPrintType,
  isVaccination,
  printLoader,
  printPopupHandler,
  tablePrintHandler,
  handleObstetricBackBtn,
  clearObstetricData,
  startNewPregnancyHandler,
  loader,
  isObstetric,
  isGrowthChart,
  isPregnancyCompleted,
  splitVaccineData,
  activeVaccineTab,
  setActiveVaccineTab,
  printVaccineCategory,
  setPrintVaccineCategory,
  source,
}) {
  const vaccinationVideo = {
    link: "https://www.youtube.com/embed/o6ALwX9hPMM",
    thumbnail: "https://i.ytimg.com/vi/o6ALwX9hPMM/hqdefault.jpg",
    tmv_description: "Vaccination",
    tmv_title: "Vaccination",
  };
  const obstetricVideo = {
    link: "https://www.youtube.com/embed/KWIi-p3fXRk",
    thumbnail: "https://i.ytimg.com/vi/o6ALwX9hPMM/hqdefault.jpg",
    tmv_description: "Obstetric History",
    tmv_title: "Obstetric History",
  };
  const growthChartVideo = {
    link: "https://www.youtube.com/embed/ZpfTsX_f2LM",
    thumbnail: "https://i.ytimg.com/vi/o6ALwX9hPMM/hqdefault.jpg",
    tmv_description: "Growth Chart",
    tmv_title: "Growth Chart",
  };
  const videoLink = isObstetric
    ? obstetricVideo
    : isVaccination
    ? vaccinationVideo
    : growthChartVideo;
  const navigate = useNavigate();
  const location = useLocation();
  let { patient_data } = useContext(CashManagerContext);
  const { profile } = useSelector((state) => state.doctors);
  const { isPatientDiagnosisUpdated } = useSelector((state) => state.obstetric);

  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [shouldShowPreview, setShowPreview] = useState(false);
  const [shouldShowVideo, setShowVideo] = useState(false);
  const [popOverVideo, setPopOverVideo] = useState(false);
  const [printStatusAll, setPrintStatusAll] = useState(true);
  const [printStatusGiven, setPrintStatusGiven] = useState(true);
  
  // Use prop if provided, otherwise default to "iap"
  const currentPrintCategory = printVaccineCategory || "iap";

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(!isBackModalOpen);
  }, [isBackModalOpen]);

  const obstetricBackBtnHandler = () => {
    if (isPatientDiagnosisUpdated) {
      showHideBackModal();
    } else {
      handleObstetricBackBtn();
    }
  };

  function handleMenuClick(e) {
    setPrintType(e?.key);
  }

  const getPrintChoice = () => {
    let choice = "";
    switch (currentPrintCategory) {
      case "iap":
        choice = !printStatusGiven || (printStatusGiven && printStatusAll) ? "IAP - All" : "IAP - Given";
        break;
      case "other":
        choice = !printStatusGiven || (printStatusGiven && printStatusAll) ? "Other - All" : "Other - Given";
        break;
      case "both":
        choice = !printStatusGiven || (printStatusGiven && printStatusAll) ? "Both - All" : "Both - Given";
        break;

      default:
        choice = "All";
        break;
    }
    return choice;
  };

  const handleDownload = () => {
    // Set print type based on status selection
    if (printStatusGiven && !printStatusAll) {
      setPrintType("2"); // Given only
    } else {
      setPrintType("1"); // All
    }
    trackEvent("TP_Vac_Print", {
      patientName: patient_data?.pm_fullname || "",
      patientId: patient_data?.patient_unique_id || "",
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      doctorName: profile?.um_name,
      source: source,
      choice: getPrintChoice(),
    });
  };

  function previewBtnHandler() {
    setShowPreview((prevState) => !prevState);
    if (!shouldShowPreview) {
      trackEvent("TP_Vac_preview", {
        patientName: patient_data?.pm_fullname || "",
        patientId: patient_data?.patient_unique_id || "",
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        doctorName: profile?.um_name,
        source: source,
      });
    }
  }

  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo(!popOverVideo);
  }, [popOverVideo]);

  const vaccinePrint = (
    <div className="vaccine-print-dropdown">
      <div className="vaccine-category-section">
        <Radio.Group
          value={currentPrintCategory}
          onChange={(e) => {
            if (setPrintVaccineCategory) {
              setPrintVaccineCategory(e.target.value);
            }
          }}
          className="vaccine-category-radio"
        >
          <div className="radio-option-wrapper">
            <Radio value="iap">{VaccinationCategoryEnum[0].value}</Radio>
            {currentPrintCategory === "iap" && (
              <div className="vaccine-status-section">
                <div className="status-label">Selected Specific Status</div>
                <div className="status-checkboxes">
                  <Checkbox
                    checked={printStatusAll}
                    onChange={(e) => setPrintStatusAll(e.target.checked)}
                  >
                    All
                  </Checkbox>
                  <Checkbox
                    checked={printStatusGiven}
                    onChange={(e) => setPrintStatusGiven(e.target.checked)}
                  >
                    Given
                  </Checkbox>
                </div>
              </div>
            )}
          </div>

          <Divider style={{ margin: "8px 0" }}>
            <span style={{ fontSize: "12px", color: "#8E8E93" }}>or</span>
          </Divider>

          <div className="radio-option-wrapper">
            <Radio value="other">{VaccinationCategoryEnum[1].value}</Radio>
            {currentPrintCategory === "other" && (
              <div className="vaccine-status-section">
                <div className="status-label">Selected Specific Status</div>
                <div className="status-checkboxes">
                  <Checkbox
                    checked={printStatusAll}
                    onChange={(e) => setPrintStatusAll(e.target.checked)}
                  >
                    All
                  </Checkbox>
                  <Checkbox
                    checked={printStatusGiven}
                    onChange={(e) => setPrintStatusGiven(e.target.checked)}
                  >
                    Given
                  </Checkbox>
                </div>
              </div>
            )}
          </div>

          <Divider style={{ margin: "8px 0" }}>
            <span style={{ fontSize: "12px", color: "#8E8E93" }}>or</span>
          </Divider>

          <div className="radio-option-wrapper">
            <Radio value="both">Both IAP & Other Vaccines</Radio>
            {currentPrintCategory === "both" && (
              <div className="vaccine-status-section">
                <div className="status-label">Selected Specific Status</div>
                <div className="status-checkboxes">
                  <Checkbox
                    checked={printStatusAll}
                    onChange={(e) => setPrintStatusAll(e.target.checked)}
                  >
                    All
                  </Checkbox>
                  <Checkbox
                    checked={printStatusGiven}
                    onChange={(e) => setPrintStatusGiven(e.target.checked)}
                  >
                    Given
                  </Checkbox>
                </div>
              </div>
            )}
          </div>
        </Radio.Group>
      </div>

      <Button
        type="primary"
        className="download-btn"
        onClick={handleDownload}
        loading={printLoader}
      >
        Print
        <i className="ms-2 icon-Print" />
        {/* <i className="icon-download ms-2" /> */}
      </Button>
    </div>
  );

  const growthPrint = (
    <Menu>
      <Menu.Item
        key="1"
        className="btn btn-41 btn-input printMenu"
        onClick={printPopupHandler}
      >
        Graph
      </Menu.Item>
      <Menu.Item
        key="2"
        className="btn-41 btn btn-input"
        style={{ border: "0 !important" }}
        onClick={tablePrintHandler}
      >
        Table
      </Menu.Item>
    </Menu>
  );
  const VIDEO_CONTENT = useCallback(() => {
    return (
      <>
        <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
          <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
            <div className="title-common lh-base">Video Tutorial</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={showHideVideoListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>

          <div className={`d-flex`}>
            <div className="tutorial-play me-14">
              <button type="button" onClick={() => setShowVideo(true)}>
                <img src={playIcons} />
              </button>
              <span className="tutorial-thumb">
                <img src={videoLink.thumbnail} />
              </span>
            </div>
            <div>
              <h3 className="title-common text-welcome">
                {videoLink.tmv_title}
              </h3>
              <div className="fs-12 fontroboto fw-normal text-main">
                {videoLink.tmv_description}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }, [popOverVideo]);
  const antIcon = <LoadingOutlined style={{ fontSize: 20 }} spin />;

  const navigateToPrescription = () => {
    navigate("/prescription", {
      state: { patient_data: patient_data },
    });
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 199,
        backgroundColor: "white",
      }}
    >
      {!(isMobile && !isTablet) && (
        <>
          <DemoExpirationBanner />
          <PlanExpirationBanner />
        </>
      )}
      <Navbar className="headerprescription p-0">
        <Container fluid className="h-100 gx-0 w-100">
          <Row className="h-100 align-items-center w-100 justify-content-between">
            <Col sm="auto" md="auto" lg="auto" className="h-100 w-auto">
              <div className="align-items-center d-flex h-100">
                <div className="border-end h-100 text-center">
                  <div
                    onClick={() => {
                      isObstetric
                        ? obstetricBackBtnHandler()
                        : location.state?.from === "/patient_details"
                        ? navigate(-1)
                        : handleDrawerVaccination();
                    }}
                    className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
                  >
                    <i className="icon-right"></i>
                  </div>
                  <CommonModal
                    isModalOpen={isBackModalOpen}
                    onCancel={showHideBackModal}
                    modalWidth={500}
                    title={"You may lose your data"}
                    modalBody={
                      <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                          <div className="d-flex align-items-center">
                          <img className="me-3" src={alertIcon} alt="Warning" />
                            <span>
                              Are you sure you want to leave? <br />
                              You will permanently lose your{" "}
                              {isObstetric ? " Obstetric" : ""} data.
                            </span>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="d-flex align-items-center mt-2 justify-content-end">
                            <div
                              onClick={
                                isObstetric
                                  ? clearObstetricData
                                  : navigateToPrescription
                              }
                              className="me-4 text-decoration-underline btn p-0 text-main"
                            >
                              Yes Leave
                            </div>
                            <Button
                              onClick={showHideBackModal}
                              className="lh-lg btn btn-primary3 btn-41 px-4"
                            >
                              <span>No, Stay</span>
                            </Button>
                          </div>
                        </div>
                      </>
                    }
                  />
                </div>
                <ProfilePopover
                  patient_data={patient_data}
                  locationPath={"/vaccine"}
                />
              </div>
            </Col>
            <Col sm="auto" md="auto" lg="auto" className="h-100  w-auto">
              <div className="align-items-center d-flex h-100 gap-2">
                <Popover
                  open={popOverVideo}
                  onOpenChange={showHideVideoListPopover}
                  content={VIDEO_CONTENT}
                  trigger="click"
                  overlayClassName="pop-430 pp-0 videoTutorial"
                  placement="bottom"
                >
                  <button className="btn d-flex align-items-center btn-text p-0 me-20">
                    <span>
                      <img src={tutorial2} />
                    </span>
                  </button>
                </Popover>
                {isVaccination && (
                  <Button
                    type="button"
                    className="btn-41 btn px-4 me-4 ant-btn-text btn-input align-items-center d-flex"
                    onClick={previewBtnHandler}
                    icon={<i className="icon-Preview" />}
                  >
                    Preview
                  </Button>
                )}
                {isGrowthChart && (
                  <div className="growth-chart-type">WHO-IAP Chart</div>
                )}
                {!isObstetric && (
                  <Dropdown
                    {...(isVaccination
                      ? { dropdownRender: () => vaccinePrint }
                      : { overlay: growthPrint })}
                    trigger={["click"]}
                    overlayClassName={isVaccination ? "vaccine-print-dropdown-wrapper" : ""}
                  >
                    <div className="btn-41 btn px-4 me-4 ant-btn-text btn-input d-flex align-items-center gap-2">
                      <i className="icon-Print" />
                      <span className="btn-input">Print</span>
                      {printLoader ? (
                        <Spin spinning={printLoader} indicator={antIcon} />
                      ) : (
                        <i
                          className="icon-right"
                          style={{
                            display: "block",
                            transform: `rotate(270deg)`,
                          }}
                        />
                      )}
                    </div>
                  </Dropdown>
                )}
                {isPregnancyCompleted ? (
                  <Button
                    type="primary"
                    className="btn-41 btn px-4 me-4 ant-btn-text align-items-center d-flex"
                    onClick={startNewPregnancyHandler}
                    loading={isObstetric && loader}
                    disabled={isObstetric && loader}
                  >
                    Start New Pregnancy
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="btn-41 btn px-4 me-4 ant-btn-text btn-input align-items-center d-flex"
                    onClick={() => {
                      if (location.state?.from === "/patient_details") {
                        navigate(-1);
                      } else {
                        handleDrawerVaccination();
                      }
                    }}
                    icon={<i className="icon-save" />}
                    loading={isObstetric && loader}
                    disabled={isObstetric && loader}
                  >
                    Save
                  </Button>
                )}
              </div>
            </Col>
          </Row>
          {shouldShowPreview ? (
            <Preview
              vaccinesData={vaccinesData}
              onCancel={previewBtnHandler}
              shouldShowPreview={shouldShowPreview}
              splitVaccineData={splitVaccineData}
              activeVaccineTab={activeVaccineTab}
              setActiveVaccineTab={setActiveVaccineTab}
            />
          ) : null}
        </Container>
        {shouldShowVideo && (
          <VideoModal
            videoLink={videoLink}
            onCancel={() => setShowVideo(false)}
          />
        )}
      </Navbar>
    </div>
  );
}

export default React.memo(VaccineHeader);
