import React, { useRef, useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Button, Checkbox } from "antd";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import "./GrowthGraph.scss";
import TooltipContent from "./TooltipContent";
import { genderAge } from "../../../../common/ProfilePopover";
import { useSelector } from "react-redux";
import { UNITS, ageIntervals, getAgeInMonths } from "../../growthChartHelper";
import { useLocation } from "react-router-dom";
import moment from "moment";
import { ASSETS } from "../../../../assets";
const {
  minimise,
  maximise,
} = ASSETS.images;

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const GrowthGraph = ({
  graphIndex,
  data,
  isFullscreen,
  setIsFullscreen,
  handleDrawerVital,
  graphName,
  showTimelineInYear,
  setFullScreenGraphIndex,
  tooltipState,
  setTooltipState,
  ageInterval,
  display,
  isSaveClicked,
  visibility,
  setVisibility,
  setIsPercentileOrTimeLineUpdated,
}) => {
  const { state } = useLocation();
  const { patient_data } = state;
  const { profile } = useSelector((state) => state.doctors);
  const { patients_details } = useSelector((state) => state.records);
  const patientAge = genderAge(
    patients_details || patient_data,
    profile,
    false
  );
  const patientAgeInMonths = getAgeInMonths(
    patients_details?.pm_dob
      ? moment(patients_details?.pm_dob, "YYYY-MM-DD")
      : patient_data?.DOB
      ? moment(patient_data?.DOB, "Do MMMM YYYY")
      : ""
  );

  const chartRef = useRef(null);
  const popupRef = useRef(null);
  const tooltipRef = useRef(null);
  const [shouldShowPercentilePopup, setPercentilePopup] = useState(false);
  const [dataIndex, setDataIndex] = useState();
  const [popup, setPopup] = useState({
    visible: false,
    x: 0,
    y: 0,
    coords: {},
  });

  // Custom plugin to draw labels at the end of each line
  const customLabelPlugin = {
    id: "customFillPlugin",
    beforeDraw: (chart) => {
      const ctx = chart.ctx;
      const xAxis = chart.scales["x"];
      const yAxis = chart.scales["y"];
      const patientDataset = chart.data.datasets.find(
        (dataset) => dataset.label === ""
      );

      if (!patientDataset || !patientDataset.data.length) return;

      ctx.save();

      ctx.beginPath();
      patientDataset.data.forEach((point, index) => {
        const x = xAxis.getPixelForValue(point.x);
        const y = yAxis.getPixelForValue(point.y);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(
        xAxis.getPixelForValue(
          patientDataset.data[patientDataset.data.length - 1].x
        ),
        yAxis.bottom
      );
      ctx.lineTo(
        xAxis.getPixelForValue(patientDataset.data[0].x),
        yAxis.bottom
      );
      ctx.closePath();

      // Create gradient for green shadow
      const greenGradient = ctx.createLinearGradient(
        0,
        yAxis.top,
        0,
        yAxis.bottom + 100
      );
      greenGradient.addColorStop(0, "rgba(100, 230, 100, 0.3)");
      greenGradient.addColorStop(0.2, "rgba(100, 230, 100, 0.2)");
      greenGradient.addColorStop(0.4, "rgba(100, 230, 100, 0.1)");
      greenGradient.addColorStop(1, "rgba(37, 205, 37, 0)");

      // Fill the area below the line chart with green gradient
      ctx.fillStyle = greenGradient;
      ctx.fill();

      // Draw red shadows and points below the line chart path
      patientDataset.data.forEach((point, index) => {
        if (point.isMalnutrition) {
          const x = xAxis.getPixelForValue(point.x);
          const y = yAxis.getPixelForValue(point.y);

          if (y <= yAxis.bottom) {
            ctx.save();

            ctx.beginPath();

            // Draw dotted circle around the red point
            if (display === "block") {
              ctx.beginPath();
              ctx.setLineDash([2, 2]);
              ctx.arc(x, y, 12, 0, 2 * Math.PI); // Draw circle around the point
              ctx.strokeStyle = "#000000";
              ctx.stroke();
              ctx.setLineDash([]);
            } else {
              const radius = 30;
              const offsetY = 20;

              ctx.arc(x, y + offsetY, radius, 0, 2 * Math.PI);
              ctx.clip();

              // Create gradient for red shadow
              const redGradient = ctx.createRadialGradient(
                x,
                y + offsetY,
                0,
                x,
                y + offsetY,
                radius
              );
              redGradient.addColorStop(0, "rgba(255, 0, 0, 0.2)");
              redGradient.addColorStop(1, "rgba(255, 0, 0, 0)");

              ctx.fillStyle = redGradient;
              ctx.fillRect(
                x - radius,
                y + offsetY - radius,
                2 * radius,
                2 * radius
              );

              ctx.restore(); // Restore initial context state

              // Draw the red point
              ctx.beginPath();
              ctx.arc(x, y, 3, 0, 2 * Math.PI);
              ctx.fillStyle = "#F04545";
              ctx.fill();
            }
          }
        }
      });

      ctx.restore(); // Restore initial context state
    },
    afterDatasetsDraw(chart) {
      const {
        ctx,
        chartArea: { right },
      } = chart;

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        if (!chart.isDatasetVisible(datasetIndex)) return;

        const meta = chart.getDatasetMeta(datasetIndex);
        const lastPoint = meta.data[meta.data.length - 1];

        if (!lastPoint) return;

        const { x, y: pointY } = lastPoint.tooltipPosition();
        const label = dataset.label;

        ctx.save();
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = display === "block" ? "bold 14px Arial" : "12px Arial";
        ctx.fillStyle = dataset.backgroundColor;
        ctx.fillText(label, right + 5, pointY);
        ctx.restore();
      });
    },
    afterDraw: (chart) => {
      const ctx = chart.ctx;
      const xAxis = chart.scales["x"];
      const yAxis = chart.scales["y"];
      const xValue = showTimelineInYear
        ? patientAgeInMonths / 12
        : patientAgeInMonths;

      // Find the pixel position of the x-axis value
      const xPixel = xAxis.getPixelForValue(xValue);

      ctx.save();

      // Draw the vertical line
      ctx.beginPath();
      ctx.moveTo(xPixel, yAxis.top);
      ctx.lineTo(xPixel, yAxis.bottom);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle =
        display === "block"
          ? "rgba(25, 187, 122, 1)"
          : "rgba(25, 187, 122, 0.4)";
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.font = display === "block" ? "bold 14px Arial" : "12px Arial";
      ctx.fillStyle = "rgba(25, 187, 122, 1)";
      ctx.fillText(`${patientAge} (Today)`, xPixel, yAxis.top - 5);

      ctx.restore();
    },
  };

  const handleButtonClick = () => {
    setPercentilePopup((prev) => !prev);
  };

  const handleClickOutside = (event) => {
    if (
      popupRef.current &&
      !popupRef.current.contains(event.target) &&
      !chartRef.current?.canvas?.contains(event.target)
    ) {
      setPercentilePopup(false);
      setPopup({ visible: false, x: 0, y: 0, coords: {} });
    }
  };

  const handleTooltipClickOutside = (event) => {
    if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
      handleCloseTooltip();
    }
  };

  const handleChartClick = (event) => {
    const points = chartRef.current?.getElementsAtEventForMode(
      event,
      "nearest",
      { intersect: true },
      true
    );

    if (points.length) {
      const firstPoint = points[0];
      const { x, y } = firstPoint.element;
      const datasetIndex = firstPoint.datasetIndex;
      const index = firstPoint.index;
      const dataX = data.datasets[datasetIndex].data[index].x;
      const dataY = data.datasets[datasetIndex].data[index].y;

      setPopup({
        visible: true,
        x: event.native.offsetX,
        y: event.native.offsetY,
        coords: { dataX, dataY },
      });
    } else {
      setPopup({ visible: false, x: 0, y: 0, coords: {} });
    }
  };

  useEffect(() => {
    if (shouldShowPercentilePopup || popup.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [shouldShowPercentilePopup, popup.visible]);

  useEffect(() => {
    if (tooltipState) {
      document.addEventListener("mousedown", handleTooltipClickOutside);
    } else {
      document.removeEventListener("mousedown", handleTooltipClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleTooltipClickOutside);
    };
  }, [tooltipState]);

  useEffect(() => {
    if (chartRef.current) {
      // Register the plugin only once
      ChartJS.register(customLabelPlugin);
    }

    return () => {
      // Unregister the plugin when the component unmounts
      ChartJS.unregister(customLabelPlugin);
    };
  }, [
    showTimelineInYear,
    isFullscreen,
    display,
    patientAge,
    patientAgeInMonths,
  ]);

  const toggleVisibility = (index) => {
    setVisibility((prev) => {
      const newVisibility = prev;
      newVisibility[graphName][index] = !newVisibility[graphName][index];
      return { ...newVisibility };
    });
    setIsPercentileOrTimeLineUpdated(true);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setFullScreenGraphIndex((prev) => (prev === null ? graphIndex : null));
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    elements: {
      line: {
        borderWidth: 2,
      },
    },
    scales: {
      x: {
        type: "linear",
        ticks: {
          color: display === "block" ? "black" : "",
          font: {
            size: display === "block" ? "14px" : "12px",
            weight: display === "block" ? "500" : "400",
          },
          stepSize:
            showTimelineInYear &&
            patients_details?.ageYears < 5 &&
            graphName !== "HeightVsWeight"
              ? 0.5
              : graphName === "HeightVsWeight"
              ? 5
              : showTimelineInYear
              ? 1
              : ageIntervals[ageInterval] || 1,
        },
        title: {
          display: true,
          text:
            graphName === "HeightVsWeight"
              ? "Height in cm"
              : `Age in ${showTimelineInYear ? "Years" : "Months"}`,
          font: {
            size: display === "block" ? 18 : 14,
            weight: display === "block" ? "500" : "400",
          },
          color: display === "block" ? "black" : "#454551",
        },
        grid: {
          color: "rgba(0, 0, 0, 1)",
          lineWidth: 0.2,
        },
      },
      y: {
        ticks: {
          color: display === "block" ? "black" : "",
          font: {
            size: display === "block" ? "14px" : "12px",
            weight: display === "block" ? "500" : "400",
          },
          stepSize: 1,
        },
        title: {
          display: true,
          text:
            graphName === "HeightVsWeight"
              ? "Weight in kg"
              : `${graphName} in ${UNITS[graphName]}`,
          font: {
            size: display === "block" ? 18 : 14,
            weight: display === "block" ? "500" : "400",
          },
          color: display === "block" ? "black" : "#454551",
        },
        grid: {
          color: "rgba(0, 0, 0, 1)",
          lineWidth: 0.2,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        external: (context) => {
          const { chart, tooltip } = context;
          if (tooltip.opacity === 0) {
            return;
          }

          // Check if the tooltip should be displayed for this point
          if (
            tooltip.dataPoints.length &&
            chart.data.datasets[tooltip.dataPoints[0].datasetIndex].label === ""
          ) {
            const titleLines = tooltip.title || [];
            const bodyLines = tooltip.body.map((b) => b.lines);

            const { offsetLeft: positionX, offsetTop: positionY } =
              chart.canvas;
            setTooltipState({
              visible: true,
              x: positionX + tooltip.caretX,
              y: positionY + tooltip.caretY,
              titleLines,
              bodyLines,
              graphIndex: graphIndex,
            });
          } else {
            handleCloseTooltip();
          }
        },
      },
    },
    layout: {
      padding: {
        right: 35,
        top: 18,
      },
    },
    onHover: function (event, elements) {
      if (elements.length) {
        event.native.target.style.cursor = "pointer";
        setDataIndex(elements[0].index);
      } else {
        event.native.target.style.cursor = "auto";
      }
    },
  };

  const handleCloseTooltip = () => {
    setTooltipState({
      visible: false,
      x: 0,
      y: 0,
      titleLines: [],
      bodyLines: [],
      graphIndex: null,
    });
  };

  // Update the dataset visibility based on the state
  data.datasets.forEach((dataset, index) => {
    dataset.hidden = !visibility[graphName][index];
  });

  const chartData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      hidden: !visibility[graphName][index],
    })),
  };

  return (
    <div className="graphStyle">
      <div className="graphHeader">
        <div
          className="graphName"
          style={{
            fontSize: display === "block" ? "20px" : "",
            fontWeight: display === "block" ? "600" : "",
            color: display === "block" ? "#000" : "",
          }}
        >
          {graphName === "HeightVsWeight" ? "Height Vs Weight" : graphName}
        </div>
        <div>
          {display === "none" && (
            <div style={{ display: "flex" }}>
              <button
                type="link"
                className="percentileBtn"
                onClick={() => setPercentilePopup(true)}
              >
                Percentile
                <i className="icon-right iconStyle" />
              </button>
              <img
                onClick={toggleFullscreen}
                style={{ cursor: "pointer" }}
                src={isFullscreen ? minimise : maximise}
                alt="Warning"
              />
            </div>
          )}
          {shouldShowPercentilePopup && (
            <div ref={popupRef} className="enablePercentile">
              <div className="percentileText">
                Enable/Disable percentile line
              </div>
              <div className="percentileContainer">
                <div>
                  {data.datasets.map((dataset, index) => (
                    <>
                      {index !== data.datasets.length - 1 ? (
                        <>
                          <Checkbox
                            key={index}
                            className="growth-chart-custom-checkbox"
                            checked={visibility[graphName][index]}
                            onChange={() => toggleVisibility(index)}
                          >
                            <span
                              className="dynamicColor"
                              style={{
                                "--dynamic-color": dataset.backgroundColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {dataset.label}
                            </span>
                          </Checkbox>
                          {index !== data.datasets.length - 2 &&
                            index !== 2 && (
                              <span className="checkBoxSeparator" />
                            )}
                        </>
                      ) : null}
                    </>
                  ))}
                </div>
                <Button
                  type="button"
                  className="btn ant-btn-text btn-input doneBtn"
                  onClick={handleButtonClick}
                >
                  <span className="doneText">Done</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="graphBody">
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          className={`chartStyle ${
            display === "block" && !isSaveClicked ? "chartStylePrint" : ""
          }`}
        />
        {tooltipState.visible && graphIndex === tooltipState.graphIndex && (
          <div
            ref={tooltipRef}
            className="tooltipContainer"
            style={{ left: tooltipState.x - 98, top: tooltipState.y - 168 }}
          >
            <TooltipContent
              handleDrawerVital={(i) => handleDrawerVital(i)}
              handleCloseTooltip={handleCloseTooltip}
              data={data?.datasets?.[5]?.data?.[dataIndex]?.data}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GrowthGraph;
