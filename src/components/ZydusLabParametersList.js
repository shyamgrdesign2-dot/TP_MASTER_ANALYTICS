import { useEffect, useState } from "react";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../utils/constants";
import axios from 'axios';
import { env } from "../EnvironmentConfig";

// Add custom parse format plugin
dayjs.extend(customParseFormat);

const ZydusLabParametersList = ({ labParamsData, patientGender }) => {
  const calculateArrowDirection = (value, refRange) => {
    if (!value || value === "-" || value === "--") return "";
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return "";
    if (typeof refRange === 'string' && refRange !== "-") {
      const rangeMatch = refRange.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        if (!isNaN(min) && !isNaN(max)) {
          if (numericValue > max) return "up";
          if (numericValue < min) return "down";
        }
      }
    }
    if (refRange?.ranges?.length > 0) {
      const genderLower = patientGender?.toLowerCase() || "";
      const selectedRange = refRange.ranges.find(range => 
        range.gender?.toLowerCase() === genderLower
      ) || refRange.ranges.find(range => 
        range.gender?.toLowerCase() === "all"
      ) || refRange.ranges[0];
      
      if (selectedRange?.min !== undefined && selectedRange?.max !== undefined) {
        const min = parseFloat(selectedRange.min);
        const max = parseFloat(selectedRange.max);
        if (!isNaN(min) && !isNaN(max)) {
          if (numericValue > max) return "up";
          if (numericValue < min) return "down";
        }
      }
    }
    return "";
  };

  const transformData = (data) => {
    const result = {};

    data?.forEach((entry) => {
      entry.inputs?.forEach((input) => {
        const serviceName = input.serviceName;
        
        if (input.labResultParameters && input.labResultParameters.length > 0) {
          // Handle services with parameters
          input.labResultParameters.forEach(param => {
            const key = `${serviceName}_${param.parameterName}`;
            if (!result[key]) {
              result[key] = {
                serviceName,
                parameterName: param.parameterName,
                values: []
              };
            }
            result[key].values.push({
              date: entry.date,
              value: param.resultValue,
              referenceRange: param.referenceRange,
              arrowDirection: calculateArrowDirection(param.resultValue, param.referenceRange),
              sampleId: input.sampleId,
              certifiedDate: input.certifiedDate,
              labResultId: input.labResultId,
              labResultParameterId: param.labResultParameterId
            });
          });
        } else {
          // Handle services without parameters
          if (!result[serviceName]) {
            result[serviceName] = {
              serviceName,
              values: []
            };
          }
          result[serviceName].values.push({
            date: entry.date,
            value: input.resultvalue,
            referenceRange: input.referenceRange,
            arrowDirection: calculateArrowDirection(input.resultvalue, input.referenceRange),
            sampleId: input.sampleId,
            certifiedDate: input.certifiedDate,
            labResultId: input.labResultId
          });
        }
      });
    });

    return result;
  };

  const groupedData = transformData(labParamsData);

  const renderTableHeader = () => {
    // Sort labParamsData by date (descending) and take the first two dates
    const recentLabParamsData = labParamsData?.sort((a, b) => {
      const dateA = dayjs(a.date, "DD-MM-YYYY");
      const dateB = dayjs(b.date, "DD-MM-YYYY");
      return dateB.valueOf() - dateA.valueOf();
    }).slice(0, 2);

    return (
      <tr>
        <th
          className="obstetricTcell"
          style={{
            width: "50%",
            fontWeight: 600,
            borderTop: "1px solid white",
          }}
        >
          NAME
        </th>
        {recentLabParamsData?.map((entry, index) => (
          <th
            key={index}
            className="obstetricTcell"
            style={{
              width: "25%",
              fontWeight: 600,
              paddingRight: "18px",
              borderTop: "1px solid white",
              borderRight: index === recentLabParamsData.length - 1 ? "1px solid white" : "none",
            }}
          >
            {dayjs(entry?.date, "DD-MM-YYYY").format("DD MMM, YYYY")}
          </th>
        ))}
      </tr>
    );
  };

  const renderTableData = () => {
    // Get unique dates from labParamsData and sort by most recent first
    const uniqueDates = [...new Set(labParamsData.map(item => item.date))]
      .sort((a, b) => {
        const dateA = dayjs(a, "DD-MM-YYYY");
        const dateB = dayjs(b, "DD-MM-YYYY");
        return dateB.valueOf() - dateA.valueOf();
      });
    // Take only the first 2 most recent dates
    const recentDates = uniqueDates.slice(0, 2);
    // Filter labParamsData to only include the recent 2 dates
    const recentLabParamsData = labParamsData.filter(item => 
      recentDates.includes(item.date)
    );

    return (
      <>
        {Object.keys(groupedData)?.map((key, index) => {
          const data = groupedData[key];
          const displayName = data.parameterName || data.serviceName;

          return (
            <tr 
              key={index} 
              className="column-border"
              style={{
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f5f5f5',
                borderBottom: '1px solid #e8e8e8'
              }}
            >
              <td 
                className="labParamsTcell" 
                style={{ 
                  width: "50%", 
                  fontWeight: 500,
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                  padding: "24px 8px",
                  borderRight: "1px solid #e8e8e8",
                  height: "60px",
                  verticalAlign: "middle"
                }}
              >
                {displayName}
              </td>

              {recentLabParamsData?.map((dateEntry, dataIndex) => {
                const dataForDate = data.values.find(
                  (entry) => entry.date === dateEntry.date
                );

                return (
                  <td
                    key={dataIndex}
                    style={{ 
                      width: "25%", 
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                      padding: "24px 8px",
                      borderRight: dataIndex === recentLabParamsData.length - 1 ? "1px solid #e8e8e8" : "none",
                      height: "60px",
                      verticalAlign: "middle"
                    }}
                    className={`labParamsTcell ${
                      dataForDate?.arrowDirection !== ""
                        ? "lab-params-warning"
                        : ""
                    }`}
                  >
                    {dataForDate ? (
                      <>
                        <span className={dataForDate?.arrowDirection ? "lab-params-warning" : ""}
                          style={{
                            fontWeight: dataForDate?.arrowDirection ? "500" : "normal"
                          }}>
                          {dataForDate.value || "--"}
                        </span>
                        {dataForDate?.arrowDirection === "up" && (
                          <ArrowUpOutlined
                            className="lab-params-warning"
                            style={{ paddingLeft: 5 }}
                          />
                        )}
                        {dataForDate?.arrowDirection === "down" && (
                          <ArrowDownOutlined
                            className="lab-params-warning"
                            style={{ paddingLeft: 5 }}
                          />
                        )}
                      </>
                    ) : (
                      <span>{"--"}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </>
    );
  };

  return (
    <div>
      <style>
        {`
          .labParamsTcell {
            color: #454551;
          }
          .lab-params-warning {
            color: #E54848 !important;
          }
          .labParamsTcell.lab-params-warning {
            color: #E54848 !important;
          }
        `}
      </style>
      {labParamsData?.length > 0 && (
        <>
          <div style={{ overflow: "hidden", marginRight: "5px" }}>
            <table
              className="tableView"
              style={{
                tableLayout: "fixed",
                width: "100%",
                borderCollapse: "collapse",
                wordBreak: "break-word",
                border: "1px solid #e8e8e8"
              }}
            >
              <thead>{renderTableHeader()}</thead>
            </table>
          </div>

          <div
            style={{
              maxHeight: "200px",
              overflowY: "scroll",
              border: "1px solid #e8e8e8",
              borderTop: "none"
            }}
          >
            <table
              className="tableView"
              style={{
                tableLayout: "fixed",
                width: "100%",
                wordBreak: "break-word",
                borderCollapse: "collapse"
              }}
            >
              <tbody>{renderTableData()}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ZydusLabParametersList; 