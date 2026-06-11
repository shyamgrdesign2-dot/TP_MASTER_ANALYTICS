import React, { useCallback, useEffect, useRef } from "react";
import { Col, Row } from "react-bootstrap";
import VaccineHeader from "../vaccination/components/vaccineHeader/VaccineHeader";
import "./GrowthChart.scss";
import GrowthGraph from "./components/growthGraph/GrowthGraph";
import SubHeader from "./components/subHeader/SubHeader";
import UpdateDetails from "./updateDetails/UpdateDetails";
import { useState } from "react";
import {
  getAllGrowthChartParams,
  getParentalDetails,
  storeGrowthChart,
  updateGrowthChartParam,
} from "./service";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import TableView from "./components/tableView/TableView";
import Measurements from "./components/measurements/Measurements";
import { Drawer, notification } from "antd";
import {
  dummyData,
  getAgeInMonths,
  getGrowthChartData,
  getMidParentalHeight,
  graphsToPrintData,
} from "./growthChartHelper";
import growthChartStaticData from "./GrowthChart.json";
import PrintPopup from "./components/printPopup/PrintPopup";
import { useReactToPrint } from "react-to-print";
import FullPageLoader from "../vaccination/components/Loader";
import GrowthChartPrint from "./components/growthChartPrint/GrowthChartPrint";
import { handlePrintClick } from "../../utils/utils";
import html2canvas from "html2canvas";
import { updatedMeasurement } from "../../redux/growthChartSlice";
import { getClinicName } from "../../utils/utils";
import dayjs from "dayjs";

const GrowthChart = ({ handleDrawerVaccination, onGrowthUpdated }) => {
  const dispatch = useDispatch();
  const { measurements, isMeasurementUpdated } = useSelector(
    (state) => state.growthChart
  );
  const { patients_details } = useSelector((state) => state.records);
  const { state } = useLocation();
  const { patient_data } = state;
  let gender =
    patient_data?.pm_gender === "Other" ? "Male" : patient_data?.pm_gender;
  gender = gender?.toLowerCase();
  gender = gender[0].toUpperCase() + gender.slice(1).toLowerCase();
  const { growthData, ageData } = growthChartStaticData;
  const patientAgeInMonths = getAgeInMonths(
    patients_details?.pm_dob
      ? moment(patients_details?.pm_dob, "YYYY-MM-DD")
      : patient_data?.DOB
      ? moment(patient_data?.DOB, "Do MMMM YYYY")
      : ""
  );

  let ageInterval = "";
  if (patientAgeInMonths >= 0 && patientAgeInMonths < 24) {
    ageInterval = "0To2";
  } else if (patientAgeInMonths >= 24 && patientAgeInMonths <= 60) {
    ageInterval = "2To5";
  } else {
    ageInterval = "5To18";
  }

  const printableRef = useRef(null);
  const graphImgRefs = useRef([]);
  const [showUpdate, setShowUpdate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullScreenGraphIndex, setFullScreenGraphIndex] = useState(null);
  const [shouldShowPrintPopup, setShowPrintPopup] = useState(false);
  const [isTableprint, setTablePrint] = useState(false);
  const [display, setDisplay] = useState("none");
  const [parentalDetails, setParentalDetails] = useState();
  const [showTableView, setShowTableView] = useState(false);
  const [showTimelineInYear, setShowTimelineInYear] = useState(false);
  const [allGrowthChartParams, setAllGrowthChartParams] = useState([]);
  const [measurementsDrawer, setMeasurementsDrawer] = useState(false);
  const [tabLoader, setTabLoader] = useState(false);
  const [isSaveClicked, setIsSaveClicked] = useState(false);
  const [measurementsData, setMeasurementsData] = useState([]);
  const [isPercentileOrTimeLineUpdated, setIsPercentileOrTimeLineUpdated] =
    useState(false);
  const [growthChartData, setGrowthChartData] = useState({
    Height: [],
    Weight: [],
    BMI: [],
    OFC: [],
    HeightVsWeight: [],
  });
  const [tooltipState, setTooltipState] = useState({
    visible: false,
    x: 0,
    y: 0,
    titleLines: [],
    bodyLines: [],
    graphIndex: null,
  });
  const [graphsToPrint, setGraphToPrint] = useState(graphsToPrintData);
  const [visibility, setVisibility] = useState({
    Height: new Array(6).fill(true),
    Weight: new Array(6).fill(true),
    BMI: new Array(6).fill(true),
    OFC: new Array(6).fill(true),
    HeightVsWeight: new Array(6).fill(true),
  });
  const { profile } = useSelector((state) => state.doctors);

  useEffect(() => {
    if (patients_details) {
      getGrowthChartDetails();
      setShowTimelineInYear(patients_details?.ageYears >= 2);
    }
  }, [patients_details]);

  useEffect(() => {
    getPatientParentalDetails();
  }, []);

  useEffect(() => {
    if (patients_details) {
      getGraphsToPrintCheckBox();
    }
  }, [patients_details, allGrowthChartParams]);

  const handlePrintWeb = useReactToPrint({
    content: () => printableRef.current,
    onAfterPrint: () => setDisplay("none"),
  });

  const trackPrintEvent = () => {
    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage.track_event("TP_Growth_Chart_Print", {
      print_type: isTableprint ? "Table" : "Graph",
      clinic_name,
      doctor_id: profile?.doctor_unique_id,
      patient_number: patient_data?.pm_contact_no,
      patient_id: patient_data?.patient_unique_id,
    });
  };

  const handlePrint = (isTableprint) => {
    trackPrintEvent(isTableprint);
    setDisplay("block");
    setTimeout(() => {
      handlePrintClick(
        printableRef.current,
        setTabLoader,
        handlePrintWeb,
        "vaccinationChart"
      );
      setTimeout(() => {
        setDisplay("none");
      }, 1000);
    }, 1000);
  };

  const convertCanvasToJPEG = async (div) => {
    const canvas = await html2canvas(div);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas to Blob conversion failed."));
        }
      }, "image/jpeg");
    });
  };

  const handleGenerateImages = async () => {
    const formData = new FormData();
    formData.append("pm_id", patient_data?.pm_id || 0);
    formData.append("pm_pid", patient_data?.pm_pid || 0);

    const uploadingGraphs = graphsToPrintData.filter((item) => {
      if (
        (item.id === "HeightVsWeight" &&
          growthChartData[item.id].some((item) => item.y && item.x)) ||
        (item.id !== "HeightVsWeight" &&
          growthChartData[item.id].some((item) => item.y))
      ) {
        return item;
      }
    });
    await Promise.all(
      graphImgRefs.current.map(async (ref, index) => {
        if (ref === null) {
          return null;
        }
        const name =
          uploadingGraphs[index].id === "HeightVsWeight"
            ? "heightVsWeight"
            : uploadingGraphs[index].id.toLowerCase();
        const blob = await convertCanvasToJPEG(ref);
        const file = new File([blob], name, {
          type: "image/jpeg",
        });
        formData.append(name, file);
      })
    );

    await storeGrowthChart(formData);
  };

  const updateTodayMeasurements = async (todayMeasurementData) => {
    const today = dayjs().format("YYYY-MM-DD");

    for (let i = 0; i < todayMeasurementData.length; i++) {
      const payload = {
        date: today,
        height: todayMeasurementData[i]?.height,
        weight: todayMeasurementData[i]?.weight,
        bmi: todayMeasurementData[i]?.bmi,
        ofc: todayMeasurementData[i]?.ofc,
        pm_id: patient_data?.pm_id,
        pm_pid: patient_data?.pm_pid,
        patient_unique_id: patient_data?.patient_unique_id,
        pam_id: patient_data?.pam_id || 0,
      };
      await updateGrowthChartParam(
        {
          id: todayMeasurementData[i]?.tcbc_id,
          pm_id: patient_data?.pm_id,
          pm_pid: patient_data?.pm_pid,
          source: "GROWTH_CHART",
        },
        payload
      );
    }
  };

  const imageUploadHandler = () => {
    const today = dayjs().format("YYYY-MM-DD");

    // Check if today's date is in tcbc_created_date
    const todayMeasurementData = allGrowthChartParams.filter(
      (item) => dayjs(item.tcbc_created_date).format("YYYY-MM-DD") === today
    );
    if (allGrowthChartParams?.length > 0 && todayMeasurementData?.length > 0) {
      updateTodayMeasurements(todayMeasurementData);
      dispatch(updatedMeasurement());
      setIsSaveClicked(true);
      setIsPercentileOrTimeLineUpdated(false);
      setDisplay("block");
      setTimeout(() => {
        handleGenerateImages();
      }, 1800);
      setTimeout(() => {
        handleDrawerVaccination();
      }, 2000);
    } else {
      handleDrawerVaccination();
    }
  };

  const getGraphsToPrintCheckBox = () => {
    const percentileVisibility = visibility;
    let updatedGraphsToPrintData = graphsToPrintData
      .map((graphItem) => {
        const percentileData =
          graphItem.id === "Weight" && patientAgeInMonths > 120
            ? {}
            : growthData[gender][ageInterval][graphItem.id];
        if (Object.keys(percentileData).length) {
          percentileVisibility[graphItem.id] = new Array(6).fill(true);
          return graphItem;
        }
      })
      .filter((item) => item);
    updatedGraphsToPrintData = updatedGraphsToPrintData.map((item) => {
      if (
        (item.id === "HeightVsWeight" &&
          growthChartData[item.id].some((item) => item.y && item.x)) ||
        (item.id !== "HeightVsWeight" &&
          growthChartData[item.id].some((item) => item.y))
      ) {
        return item;
      } else {
        return {
          ...item,
          isPrintEnabled: false,
        };
      }
    });
    updatedGraphsToPrintData =
      updatedGraphsToPrintData.length === 0
        ? graphsToPrintData
        : updatedGraphsToPrintData;
    setGraphToPrint(updatedGraphsToPrintData);
    setVisibility(percentileVisibility);
  };

  const getGrowthChartDetails = async () => {
    const allGrowthChartParams = await getAllGrowthChartParams({
      pm_id: patient_data?.pm_id || 0,
      pm_pid: patient_data?.pm_pid || 0,
    });
    if (allGrowthChartParams && patients_details?.pm_dob) {
      setAllGrowthChartParams(allGrowthChartParams);
      setGrowthChartData(
        getGrowthChartData(
          allGrowthChartParams,
          moment(patients_details?.pm_dob),
          patientAgeInMonths
        )
      );
    }
  };
  const getGraphs = () => {
    let growthChartResult = [];
    if (display === "block") {
      growthChartResult = growthChartResult.filter((item) => {
        if (
          (item.id === "HeightVsWeight" &&
            growthChartData[item.id].some((item) => item.y && item.x)) ||
          growthChartData[item.id].some((item) => item.y)
        ) {
          return item;
        }
      });
      growthChartResult = graphsToPrint
        .filter((item) => item.isPrintEnabled)
        .map((item) => item.id);
    } else {
      growthChartResult = Object.keys(growthChartData).filter((_, index) => {
        if (fullScreenGraphIndex === null) {
          return true;
        } else {
          return index === fullScreenGraphIndex;
        }
      });
    }

    return growthChartResult.map((key, graphIndex) => {
      if (growthChartData.hasOwnProperty(key)) {
        let objectName = growthData?.[gender]?.[ageInterval]?.[key];
        if (key === "Weight" && patientAgeInMonths > 120) {
          objectName = {};
        }
        if (objectName && Object.keys(objectName).length) {
          const chartData = dummyData.datasets?.map((item) => {
            const labelName = item.key;
            return {
              ...item,
              borderColor:
                display === "block" ? item.backgroundColor : item.borderColor,
              data:
                showTimelineInYear && key !== "HeightVsWeight"
                  ? objectName[labelName]?.filter((item, index) => {
                      if (
                        ageInterval === "5To18" &&
                        index === objectName[labelName].length - 1
                      ) {
                        return item;
                      } else {
                        return index % 12 === 0;
                      }
                    })
                  : objectName[labelName],
            };
          });

          const modifiedData = growthChartData[key].map((item) => ({
            ...item,
            x:
              showTimelineInYear && key !== "HeightVsWeight"
                ? item.x / 12
                : item.x,
          }));

          const patientData = {
            data: modifiedData,
            label: "",
            borderColor: "#19BB7A",
            backgroundColor: "rgba(0, 0, 0, 0)", // Make the line background transparent
            borderDash: [4, 4], // Make the line dotted
            pointRadius: display === "block" ? 6 : 3, // Show points
            pointHoverRadius: 6, // Show points on hover
            pointBorderColor: modifiedData.map((item) =>
              item.isMalnutrition ? "#FF0000" : "#19BB7A"
            ),
            pointBackgroundColor: modifiedData.map((item) =>
              item.isMalnutrition ? "#FF0000" : "#19BB7A"
            ),
          };

          chartData.push(patientData);

          const getAgeInterval = () => {
            const intervalData =
              ageData[
                key === "Weight" && ageInterval === "5To18"
                  ? "5To10"
                  : ageInterval
              ];
            const updatedInterval = intervalData.filter((item, index) => {
              if (
                ageInterval === "5To18" &&
                index === intervalData.length - 1
              ) {
                return item;
              } else {
                return index % 12 === 0;
              }
            });
            return updatedInterval.map((item) => item / 12);
          };

          const graphData = {
            labels:
              showTimelineInYear && key !== "HeightVsWeight"
                ? getAgeInterval()
                : key === "HeightVsWeight"
                ? ageData[key][ageInterval]
                : ageData[ageInterval],
            datasets: chartData,
          };

          return (
            <Col key={key} className="gx-4">
              <div
                className={`graphContainer ${
                  isFullscreen ? "fullScreenStyle" : ""
                }`}
                style={{
                  height: display === "block" ? "430px" : "505px",
                  borderColor: display === "block" ? "#000" : "",
                }}
                ref={(el) => (graphImgRefs.current[graphIndex] = el)}
              >
                <GrowthGraph
                  graphIndex={graphIndex}
                  data={graphData}
                  isFullscreen={isFullscreen}
                  setIsFullscreen={setIsFullscreen}
                  handleDrawerVital={(data) => {
                    handleEditMeasurements(data);
                    handleDrawerMeasurements();
                  }}
                  graphName={key}
                  showTimelineInYear={showTimelineInYear}
                  setFullScreenGraphIndex={setFullScreenGraphIndex}
                  tooltipState={tooltipState}
                  setTooltipState={setTooltipState}
                  ageInterval={ageInterval}
                  display={display}
                  isSaveClicked={isSaveClicked}
                  visibility={visibility}
                  setVisibility={setVisibility}
                  setIsPercentileOrTimeLineUpdated={
                    setIsPercentileOrTimeLineUpdated
                  }
                />
              </div>
            </Col>
          );
        }
      }
      return null;
    });
  };

  const getPatientParentalDetails = async () => {
    const getParentalDetailsRes = await getParentalDetails(
      patient_data?.pm_id,
      patient_data?.pm_pid
    );
    if (getParentalDetailsRes) {
      const { father_height, mother_height, gestation_period } =
        getParentalDetailsRes;
      const { maleChildHeight, femaleChildHeight } = getMidParentalHeight(
        father_height,
        mother_height
      );
      setParentalDetails({
        ...getParentalDetailsRes,
        ...(father_height &&
          mother_height && {
            mid_parental_height:
              patients_details?.pm_gender === "Male"
                ? maleChildHeight
                : femaleChildHeight,
          }),
        gestation_period_weeks: gestation_period
          ? Math.floor(getParentalDetailsRes?.gestation_period / 7)
          : "",
        gestation_period_days: gestation_period
          ? getParentalDetailsRes?.gestation_period % 7
          : "",
      });
    } else {
      setShowUpdate(true);
    }
  };

  const handleDrawerMeasurements = useCallback(() => {
    setMeasurementsDrawer(!measurementsDrawer);
  }, [measurementsDrawer]);

  const handleEditMeasurements = (i) => {
    setMeasurementsData(i);
  };
  const printPopupHandler = () => {
    setTablePrint(false);
    setShowPrintPopup((prev) => !prev);
  };

  const showTimelineInYearHandler = () => {
    setShowTimelineInYear(!showTimelineInYear);
    setIsPercentileOrTimeLineUpdated(true);
  };

  const tablePrintHandler = () => {
    if (allGrowthChartParams.length) {
      handlePrint(true);
      setTablePrint(true);
    } else {
      notification.open({
        message: "No data has been added to this user!",
        placement: "bottom",
        style: {
          backgroundColor: "rgba(252, 218, 218, 0.4)",
        },
      });
    }
  };

  return (
    <>
      <div className="vaccinationWrapper">
        <VaccineHeader
          handleDrawerVaccination={imageUploadHandler}
          printPopupHandler={printPopupHandler}
          tablePrintHandler={tablePrintHandler}
          isGrowthChart
        />
        <div className="scrollableContainer">
          <SubHeader
            handleDrawerMeasurements={handleDrawerMeasurements}
            setShowUpdate={setShowUpdate}
            showTableView={showTableView}
            setShowTableView={setShowTableView}
            showTimelineInYear={showTimelineInYear}
            showTimelineInYearHandler={showTimelineInYearHandler}
            parentalDetails={parentalDetails}
          />
          {showTableView ? (
            <TableView
              onEdit={(i) => {
                handleEditMeasurements(i);
                handleDrawerMeasurements();
              }}
              dataSource={allGrowthChartParams}
            />
          ) : (
            <div className="graphsWrapper">
              <Row
                md={isFullscreen ? 1 : 2}
                lg={isFullscreen ? 1 : 2}
                className="gy-4"
              >
                {getGraphs()}
              </Row>
            </div>
          )}
        </div>
        {measurementsDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerMeasurements}
            open={measurementsDrawer}
            className="modalWidth-700"
            width="auto"
          >
            <Measurements
              measurementsToEdit={measurementsData}
              handleDrawerMeasurements={handleDrawerMeasurements}
              getGrowthChartDetails={getGrowthChartDetails}
              setMeasurementsToEdit={setMeasurementsData}
              allGrowthChartParams={allGrowthChartParams}
              onGrowthUpdated={onGrowthUpdated}
            />
          </Drawer>
        )}

        {showUpdate && (
          <UpdateDetails
            show={showUpdate}
            setShow={setShowUpdate}
            parentalDetails={parentalDetails}
            setParentalDetails={setParentalDetails}
            onGrowthUpdated={onGrowthUpdated}
          />
        )}
        {shouldShowPrintPopup && (
          <PrintPopup
            show={shouldShowPrintPopup}
            handleClose={printPopupHandler}
            graphsToPrint={graphsToPrint}
            setGraphToPrint={setGraphToPrint}
            handlePrintWeb={handlePrint}
          />
        )}
        {display === "block" ? (
          <div style={{ display: display }}>
            <div ref={printableRef}>
              <GrowthChartPrint
                dataSource={allGrowthChartParams}
                getGraphs={getGraphs}
                isTableprint={isTableprint}
              />
            </div>
          </div>
        ) : null}
      </div>

      {(display === "block" || tabLoader) && <FullPageLoader />}
    </>
  );
};

export default GrowthChart;
