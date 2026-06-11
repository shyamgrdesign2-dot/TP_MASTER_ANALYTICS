import { Button, Input, Tooltip } from 'antd';
import React, { useState, useRef, useEffect } from 'react';
import { CaretRightOutlined, CaretDownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { useFeatureIsOn } from '@growthbook/growthbook-react';
import { GB_CVT_EXT_HOS } from '../utils/constants';

const LabResultsTable = ({ handleViewLabParamsDrawer, labParamsData, handleSwitchToAddLabParams }) => {
    const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedReports, setExpandedReports] = useState({});
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [filteredReports, setFilteredReports] = useState([]);
    const [groupedData, setGroupedData] = useState({});

    // Toggle report expansion/collapse
    const toggleReport = (reportName) => {
        setExpandedReports((prevState) => ({
            ...prevState,
            [reportName]: !prevState[reportName],
        }));
    };

    useEffect(() => {
        Object.keys(groupedData)?.forEach((reportName) => {
            setExpandedReports((prevState) => ({
                ...prevState,
                [reportName]: true,
            }));
        });
    }, [labParamsData]);

    useEffect(() => {
        if (labParamsData?.length > 0) {
            const filteredResultData = filterDataBySearchKey(labParamsData, searchTerm);
            setFilteredReports(filteredResultData);
    
            // Initialize an object to store the grouped data
            const updatedData = {};
    
            // Loop through each report in the filtered results
            filteredResultData?.forEach((report) => {
                report.inputs.forEach((input) => {
                    const reportKey = input.reportName;
                    const testKey = input.testName;
    
                    // Initialize objects to avoid undefined references
                    if (!updatedData[reportKey]) {
                        updatedData[reportKey] = {};
                    }
    
                    if (!updatedData[reportKey][testKey]) {
                        updatedData[reportKey][testKey] = [];
                    }
    
                    // Push each entry to the respective test within the report, with the date
                    updatedData[reportKey][testKey].push({
                        date: report.date,
                        value: input.value,
                        unit: input.units,
                        arrowDirection: input.arrowDirection,
                    });
                });
            });
            setGroupedData(updatedData);
        }
    }, [searchTerm, labParamsData]);
    
    const filterDataBySearchKey = (data, searchKey) => {
        // If no search term, return the full data
        if (!searchKey) return data;
    
        return data
            .map(({ date, inputs }) => {
                // Filter inputs to only include those that match the search term
                const matchingInputs = inputs.filter(
                    ({ testName, reportName }) =>
                        testName.toLowerCase().includes(searchKey.toLowerCase()) ||
                        reportName.toLowerCase().includes(searchKey.toLowerCase())
                );
    
                // If there are any matching inputs, keep this date with only those inputs
                return matchingInputs.length > 0
                    ? { date, inputs: matchingInputs }
                    : null;
            })
            .filter(Boolean); // Remove null entries where there are no matches
    };
    
    

    // Handle horizontal scrolling via dragging
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = x - startX; // Distance moved
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseLeaveOrUp = () => {
        setIsDragging(false);
    };

    const tooltipTitle = (remarks) => {
      return (
        <div className="d-flex justify-content-between flex-column h-100 w-100">
          <div className="h-80" style={{ overflow: "auto" }}>
            {remarks}
          </div>
        </div>
      );
    };

    return (
        <div style={{ backgroundColor: "#fff" }}>
            <div className='modalCard-header h-60 align-items-center justify-content-between d-flex' style={{ position: "sticky", top: "0", zIndex: "999" }}>
                <div className='align-items-center d-flex'>
                    <Button type="text" className='btn btn-delete-prescription px-3 focus-none h-100' onClick={handleViewLabParamsDrawer} >
                        <i className='icon-Cross fs-3'></i>
                    </Button>
                    <div className="modal-title">Lab Results</div>
                </div>
                {!isCvtExtHosAccessableFromGB && (
                    <Button className='btn btn-primary3 btn-41 px-4 me-20' onClick={handleSwitchToAddLabParams}>
                        Add/ Edit Parameters
                    </Button>
                )}
            </div>
            {/* Search Bar */}
            <div className="align-items-center d-flex justify-content-between px-20 py-3 gap-4" style={{ position: "sticky", top: "3.78rem", backgroundColor: "white", zIndex: "999" }}>
                <Input
                    placeholder="Search by test name or category"
                    className="inputheight38"
                    style={{ width: "18rem" }}
                    prefix={<i className="icon-search" />}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table Wrapper */}
            <div style={{ overflowX: 'auto', margin: "8px" }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    {/* Table Header */}
                    <thead style={{ backgroundColor: "#F1F1F5" }}>
                        <tr>
                            <th
                                style={{
                                    position: 'sticky',
                                    left: 0,
                                    background: "#F1F1F5",
                                    width: "23rem",
                                    padding: '10px',
                                    borderTopLeftRadius: "10px",
                                    borderBottomLeftRadius: "10px",
                                    fontWeight: "600",
                                    zIndex: "2",
                                }}
                            >
                                Name
                            </th>
                            <th>
                                <div className='d-flex'>
                                    {filteredReports.length < 2 ? (
                                        filteredReports.map((entry, entryIndex) => {
                                            const isLastCell = entryIndex === filteredReports.length - 1;
                                            return (
                                                <>
                                                    <div
                                                        key={entry.date}
                                                        style={{
                                                            width: '160px',
                                                            padding: '10px',
                                                            zIndex: "1",
                                                            fontWeight: "600",
                                                            background: "#F1F1F5",
                                                            textWrap: "nowrap",
                                                        }}
                                                    >
                                                        {dayjs(entry?.date).format("DD MMM, YYYY")}
                                                    </div>
                                                    <div
                                                        key={entry.date}
                                                        style={{
                                                            width: '160px',
                                                            padding: '10px',
                                                            zIndex: "1",
                                                            fontWeight: "600",
                                                            background: "#F1F1F5",
                                                            borderTopRightRadius: "10px" ,
                                                            borderBottomRightRadius: "10px",
                                                            textWrap: "nowrap",
                                                        }}
                                                    >
                                                    </div>
                                                </>
                                            );
                                        })
                                    ):(
                                        filteredReports.map((entry, entryIndex) => {
                                            const isLastCell = entryIndex === filteredReports.length - 1;
                                            return (
                                                <div
                                                    key={entry.date}
                                                    style={{
                                                        width: '160px',
                                                        padding: '10px',
                                                        zIndex: "1",
                                                        fontWeight: "600",
                                                        background: "#F1F1F5",
                                                        borderTopRightRadius: isLastCell ? "10px" : " ",
                                                        borderBottomRightRadius: isLastCell ? "10px" : " ",
                                                        textWrap: "nowrap",
                                                    }}
                                                >
                                                    {dayjs(entry?.date).format("DD MMM, YYYY")}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <div style={{ height: '15px' }}></div>

                    {/* Table Body */}
                    <tbody>
                        {Object.keys(groupedData).length > 0 ? (
                            Object.keys(groupedData).map((reportName, index) => {
                                const isExpanded = expandedReports[reportName];

                                return (
                                    <React.Fragment key={index}>
                                        {/* Report Name Row (collapsible) */}
                                        <tr
                                            onClick={() => toggleReport(reportName)}
                                            style={{
                                                cursor: 'pointer',
                                                width: '100%',
                                            }}
                                        >
                                            <td
                                                colSpan={filteredReports.length + 1} // Span across all columns
                                                style={{
                                                    position: 'sticky',
                                                    left: 0,  // Set the left position to make it stick on the left
                                                    zIndex: 2, // Ensure it stays above the other rows
                                                    background: " #FAFAFB", // Provide a background so it doesn't overlap
                                                    padding: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    width: "23rem",
                                                    borderTopLeftRadius: "10px",
                                                    borderBottomLeftRadius: "10px",
                                                }}
                                            >
                                                <span>{reportName}</span>
                                                <div style={{ position: "absolute", top: "16%", right: "-81%" }}>
                                                    {isExpanded ? (
                                                        <button className='btn p-0 ms-2 iconrotate180'><i className='icon-right fs-5' /></button>
                                                    ) : (
                                                        <button className='btn p-0 ms-2 iconrotate270'><i className='icon-right fs-5' /></button>
                                                    )}
                                                </div>
                                            </td>
                                            {filteredReports.length < 2 ? (
                                                // Render at least two empty <td>s if the length is less than 2
                                                <>
                                                    <td style={{ background: "#FAFAFB", width: "160px", padding: '10px', textAlign: 'right' }}></td>
                                                    <td style={{ background: "#FAFAFB", width: "160px", padding: '10px', textAlign: 'right' }}></td>
                                                </>
                                            ) : (
                                                filteredReports.map((entry, entryIndex) => {
                                                    const isLastCell = entryIndex === filteredReports.length - 1;
                                                    return (
                                                        <td
                                                            key={entry.date}
                                                            style={{
                                                                background: "#FAFAFB",
                                                                width: "160px",
                                                                padding: '10px',
                                                                textAlign: 'right', // Right align the icon for the last cell
                                                                borderTopRightRadius: isLastCell ? "10px" : " ",
                                                                borderBottomRightRadius: isLastCell ? "10px" : " ",
                                                            }}
                                                        >
                                                        </td>
                                                    );
                                                })
                                            )}
                                        </tr>

                                        {!isExpanded && <div style={{ height: '10px' }}></div>}

                                        {/* Test Rows (expandable) */}
                                        {isExpanded &&
                                            Object.keys(groupedData[reportName]).map((testName, testIndex) => (
                                                <React.Fragment key={testIndex}>
                                                    <tr>
                                                        <td
                                                            style={{
                                                                position: 'sticky',
                                                                left: 0,
                                                                background: '#fff',
                                                                width: "23rem",
                                                                padding: '10px',
                                                                borderRight: '1px solid #ddd',
                                                                overflow: "hidden",
                                                            }}
                                                        >
                                                            {testName}
                                                        </td>
                                                        <td colSpan={filteredReports.length} style={{ padding: 0 }}>
                                                            <div
                                                                ref={scrollRef}
                                                                onMouseDown={handleMouseDown}
                                                                onMouseLeave={handleMouseLeaveOrUp}
                                                                onMouseUp={handleMouseLeaveOrUp}
                                                                onMouseMove={handleMouseMove}
                                                                style={{
                                                                    display: 'flex',
                                                                    overflowX: 'auto',
                                                                    cursor: isDragging ? 'grabbing' : 'grab',
                                                                }}
                                                            >
                                                                {filteredReports.map((entry) => {
                                                                    const testOnDate =
                                                                        groupedData[reportName][testName].find(
                                                                            (t) => t.date === entry.date
                                                                        );
                                                                    return (
                                                                      <div
                                                                        key={entry.date}
                                                                        style={{width: "160px",
                                                                          borderRight: "1px solid #ddd",
                                                                          padding: "10px",
                                                                          background: "white",
                                                                          fontWeight: "400",
                                                                        }}
                                                                        className={`${
                                                                          testOnDate?.arrowDirection ===
                                                                            "up" ||
                                                                          testOnDate?.arrowDirection ===
                                                                            "down"
                                                                            ? "lab-params-warning"
                                                                            : ""
                                                                        }`}
                                                                      >
                                                                        {testName === "Remarks" && testOnDate
                                                                          ? (
                                                                            <Tooltip
                                                                                trigger={["hover"]}
                                                                                title={tooltipTitle(testOnDate.value)}
                                                                                overlayClassName="customTooltip"
                                                                                placement="top"
                                                                            >
                                                                                <div className='truncated'>
                                                                                    {testOnDate.value}
                                                                                </div>
                                                                            </Tooltip>
                                                                          )
                                                                          : testOnDate
                                                                          ? `${testOnDate.value} ${testOnDate.unit || ""}`
                                                                          : "-"}
                                                                        {testOnDate?.arrowDirection ===
                                                                        "up" ? (
                                                                          <ArrowUpOutlined
                                                                            className="lab-params-warning"
                                                                            style={{
                                                                              paddingLeft: 5,
                                                                            }}
                                                                          />
                                                                        ) : testOnDate?.arrowDirection ===
                                                                          "down" ? (
                                                                          <ArrowDownOutlined
                                                                            className="lab-params-warning"
                                                                            style={{
                                                                              paddingLeft: 5,
                                                                            }}
                                                                          />
                                                                        ) : null}
                                                                      </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            ))}
                                        {isExpanded && <div style={{ height: '10px' }}></div>}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={filteredReports.length + 1}>No results found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LabResultsTable;
