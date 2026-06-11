import React, { useState, useEffect, useCallback } from "react";
import { Button, Tooltip, Spin } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import axios from "axios";
import { env } from "../EnvironmentConfig";
import { PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN, PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../utils/constants";
import CommonModal from "../common/CommonModal";

import moment from "moment";
import { ASSETS } from "../assets";
const alertIcon = ASSETS.images.alerticon;

const ZydusLabParams = ({
    handleZydusTestReportDrawer,
    mrno,
    patientId,
    mrcNo,
    onSave,
    isBackModalOpen,
    showHideBackModal,
    patientGender,
    labReportID,
    setLabReportID,
    zydusSelectedLabParams,
    setZydusSelectedLabParams
}) => {
    const [token, setToken] = useState(null);
    const [labResults, setLabResults] = useState([]);
    const [expandedSections, setExpandedSections] = useState({});
    const [selectedItems, setSelectedItems] = useState({});
    const [organizedData, setOrganizedData] = useState({
        dates: [],
        tests: {}
    });
    const [loading, setLoading] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    useEffect(() => {
        const storedToken = localStorage.getItem(PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN);
        if (storedToken) {
            try {
                const authToken = JSON.parse(storedToken);
                setToken(authToken);
                fetchLabResults(authToken);
            } catch (error) {
                console.error("Error parsing token:", error);
            }
        }
    }, []);

    useEffect(() => {
        if (labResults.length > 0) {
            organizeData();
        }
    }, [labResults]);

    // Set first 2 dates as default selection when data is organized (only if user hasn't interacted)
    useEffect(() => {
        if (organizedData.dates.length > 0 && selectedDates.length === 0 && !hasUserInteracted) {
            const defaultDates = organizedData.dates.slice(0, Math.min(2, organizedData.dates.length));
            setSelectedDates(defaultDates);
        }
    }, [organizedData.dates, selectedDates.length, hasUserInteracted]);

    const organizeData = () => {
        // Get unique dates and sort them in descending order (newest first)
        const dates = [...new Set(labResults.map(result => result.certifiedDate))]
            .sort((a, b) => moment(b, "DD-MM-YYYY").valueOf() - moment(a, "DD-MM-YYYY").valueOf())
            .map(date => moment(date, "DD-MM-YYYY").format("DD MMM, YYYY"));

        // Organize tests by name
        const tests = {};
        labResults.forEach(result => {
            const formattedDate = moment(result.certifiedDate, "DD-MM-YYYY").format("DD MMM, YYYY");
            if (!tests[result.serviceName]) {
                tests[result.serviceName] = {
                    serviceCode: result.serviceCode,
                    parameters: {},
                    dates: {}
                };
            }

            // Store the date result with all required fields
            tests[result.serviceName].dates[formattedDate] = {
                resultvalue: result.resultvalue,
                referenceRange: result.referenceRange,
                sampleId: result.sampleId,
                labResultId: result.labResultId,
                certifiedDate: result.certifiedDate
            };

            // Store parameters if they exist
            if (result.labResultParameters && result.labResultParameters.length > 0) {
                result.labResultParameters.forEach(param => {
                    if (!tests[result.serviceName].parameters[param.parameterName]) {
                        tests[result.serviceName].parameters[param.parameterName] = {
                            referenceRange: param.referenceRange
                        };
                    }
                    if (!tests[result.serviceName].parameters[param.parameterName].dates) {
                        tests[result.serviceName].parameters[param.parameterName].dates = {};
                    }
                    tests[result.serviceName].parameters[param.parameterName].dates[formattedDate] = {
                        resultValue: param.resultValue,
                        labResultParameterId: param.labResultParameterId
                    };
                });
            }
        });

        setOrganizedData({ dates, tests });
    };

    const fetchLabResults = async (authToken) => {
        try {
            setLoading(true);
            const response = await axios.get(`${env.zydus_ict_lab_result_api_url}/ictApiProxy/emr/lab/result/list`, {
                params: {
                    mrno: mrno,
                    noOfDays: 6000
                },
                headers: {
                    'authorization': `Bearer ${authToken}`
                }
            });
            setLabResults(response.data.data);
        } catch (error) {
            console.error('Error fetching lab results:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (serviceName) => {
        setExpandedSections(prev => ({
            ...prev,
            [serviceName]: !prev[serviceName]
        }));
    };

    // Check if all sections are currently expanded
    const areAllSectionsExpanded = () => {
        if (!organizedData.tests || Object.keys(organizedData.tests).length === 0) {
            return false;
        }
        const allServiceNames = Object.keys(organizedData.tests);
        return allServiceNames.every(serviceName => expandedSections[serviceName] === true);
    };

    // Toggle between expand all and collapse all
    const toggleAllSections = () => {
        if (organizedData.tests && Object.keys(organizedData.tests).length > 0) {
            const isAllExpanded = areAllSectionsExpanded();
            
            if (isAllExpanded) {
                // Collapse all sections
                const allCollapsed = {};
                Object.keys(organizedData.tests).forEach(serviceName => {
                    allCollapsed[serviceName] = false;
                });
                setExpandedSections(allCollapsed);
            } else {
                // Expand all sections
                const allExpandedState = {};
                Object.keys(organizedData.tests).forEach(serviceName => {
                    allExpandedState[serviceName] = true;
                });
                setExpandedSections(allExpandedState);
            }
        }
    };

    const handleDateSelection = (date, checked) => {
        setHasUserInteracted(true);
        setSelectedDates(prev => {
            if (checked) {
                if (prev.includes(date)) {
                    return prev;
                }
                if (prev.length >= 5) {
                    return prev;
                }
                return [...prev, date];
            } else {
                const newDates = prev.filter(d => d !== date);
                return newDates;
            }
        });
    };

    const handleDeleteDataModal = () => {
        handleZydusTestReportDrawer();
        showHideBackModal();
    };

    const handleServiceCheckboxChange = (serviceName, checked) => {
        setSelectedItems(prev => {
            const newSelected = { ...prev };
            const testData = organizedData.tests[serviceName];

            if (!testData) {
                return newSelected;
            }

            if (checked) {
                // If service has parameters, select all parameters
                if (testData.parameters && Object.keys(testData.parameters).length > 0) {
                    Object.keys(testData.parameters).forEach(paramName => {
                        const paramKey = `${serviceName}_${paramName}`;
                        const paramData = testData.parameters[paramName];
                        
                        // Get ALL available dates for this parameter (consistent with individual parameter selection)
                        const allDates = Object.keys(paramData.dates);
                        const parameterData = [];
                        
                        allDates.forEach(date => {
                            const serviceDateData = testData.dates[date];
                            const paramDateData = paramData.dates[date];
                            
                            if (serviceDateData && paramDateData) {
                                parameterData.push({
                                    date: moment(date, "DD MMM, YYYY").format("DD-MM-YYYY"),
                                    sampleId: serviceDateData.sampleId || "",
                                    certifiedDate: serviceDateData.certifiedDate,
                                    labResultId: serviceDateData.labResultId || "",
                                    resultValue: paramDateData.resultValue || "-",
                                    referenceRange: paramData.referenceRange || "-",
                                    labResultParameterId: paramDateData.labResultParameterId || "",
                                    parameterName: paramName,
                                    status: true
                                });
                            }
                        });
                        
                        if (parameterData.length > 0) {
                            newSelected[paramKey] = {
                                serviceData: {
                                    referenceRange: paramData.referenceRange || "-",
                                    serviceCode: testData.serviceCode,
                                    serviceName: serviceName,
                                    parameterName: paramName
                                },
                                parameterData: parameterData
                            };
                        }
                    });
                } else {
                    // If service has no parameters, select the service itself with ALL dates
                    const allDates = Object.keys(testData.dates);
                    const serviceParameterData = [];
                    
                    allDates.forEach(date => {
                        const dateData = testData.dates[date];
                        if (dateData) {
                            serviceParameterData.push({
                                date: moment(date, "DD MMM, YYYY").format("DD-MM-YYYY"),
                                sampleId: dateData.sampleId || "",
                                certifiedDate: dateData.certifiedDate,
                                labResultId: dateData.labResultId || "",
                                resultValue: dateData.resultvalue || "-",
                                status: true
                            });
                        }
                    });
                    
                    if (serviceParameterData.length > 0) {
                        newSelected[serviceName] = {
                            serviceData: {
                                referenceRange: testData.dates[allDates[0]]?.referenceRange || "-",
                                serviceCode: testData.serviceCode,
                                serviceName: serviceName
                            },
                            parameterData: serviceParameterData
                        };
                    }
                }
            } else {
                // Remove the service data when unchecked
                delete newSelected[serviceName];
                
                // Also remove all parameters associated with this service
                Object.keys(newSelected).forEach(key => {
                    if (key.startsWith(`${serviceName}_`)) {
                        delete newSelected[key];
                    }
                });
            }

            return newSelected;
        });

        // Auto-expand the section when service is selected
        if (checked) {
            setExpandedSections(prev => ({
                ...prev,
                [serviceName]: true
            }));
        }
    };

    const handleParameterCheckboxChange = (serviceName, paramName, checked) => {
        setSelectedItems(prev => {
            const newSelected = { ...prev };
            const key = `${serviceName}_${paramName}`;
            const testData = organizedData.tests[serviceName];

            if (!testData) {
                return newSelected;
            }

            if (checked) {
                const paramData = testData.parameters[paramName];
                if (paramData && paramData.dates) {
                    // Get all dates for this parameter
                    const allDates = Object.keys(paramData.dates);
                    const parameterData = [];

                    // Process each date's data
                    allDates.forEach(date => {
                        const dateData = testData.dates[date];
                        const paramDateData = paramData.dates[date];

                        if (dateData && paramDateData) {
                            parameterData.push({
                                date: moment(date, "DD MMM, YYYY").format("DD-MM-YYYY"),
                                sampleId: dateData.sampleId || "",
                                certifiedDate: dateData.certifiedDate,
                                labResultId: dateData.labResultId || "",
                                resultValue: paramDateData.resultValue || "-",
                                referenceRange: paramData.referenceRange || "-",
                                labResultParameterId: paramDateData.labResultParameterId || "",
                                parameterName: paramName,
                                status: true
                            });
                        }
                    });

                    if (parameterData.length > 0) {
                        newSelected[key] = {
                            serviceData: {
                                referenceRange: paramData.referenceRange || "-",
                                serviceCode: testData.serviceCode,
                                serviceName: serviceName
                            },
                            parameterData: parameterData
                        };
                    }
                }
            } else {
                // Remove the parameter data when unchecked
                delete newSelected[key];
            }

            return newSelected;
        });

        // Auto-expand the section when any parameter is selected
        if (checked) {
            setExpandedSections(prev => ({
                ...prev,
                [serviceName]: true
            }));
        }
    };

    const isServiceChecked = (serviceName) => {
        // CRITICAL FIX: Guard against race conditions
        if (!organizedData || !organizedData.tests || !organizedData.tests[serviceName]) {
            console.warn(`⚠️ Service data not ready for: ${serviceName}`);
            return false;
        }

        const testData = organizedData.tests[serviceName];

        // If service has parameters, check selection state
        if (testData.parameters && Object.keys(testData.parameters).length > 0) {
            const parameterKeys = Object.keys(testData.parameters).map(paramName => `${serviceName}_${paramName}`);
            
            // CRITICAL FIX: Properly validate selected items
            const selectedParameterKeys = parameterKeys.filter(key => {
                const item = selectedItems[key];
                return item && item.parameterData && item.parameterData.length > 0;
            });
            

            
            if (selectedParameterKeys.length === 0) {
                return false;
            } else if (selectedParameterKeys.length === parameterKeys.length) {
                return true;
            } else {
                return 'indeterminate';
            }
        } else {
            // If service has no parameters, check if the service itself is selected
            const item = selectedItems[serviceName];
            const isSelected = item && item.parameterData && item.parameterData.length > 0;
            
            return !!isSelected;
        }
    };

    const renderServiceCheckbox = (serviceName, additionalProps = {}) => {
        try {
            const checkState = isServiceChecked(serviceName);
            const isIndeterminate = checkState === 'indeterminate';
            const isChecked = checkState === true;
            
            return (
                <input
                    type="checkbox"
                    checked={isChecked}
                    ref={(el) => {
                        if (el) {
                            // CRITICAL FIX: Safely set indeterminate state
                            try {
                                el.indeterminate = isIndeterminate;
                            } catch (error) {
                                console.warn('Failed to set indeterminate state:', error);
                            }
                        }
                    }}
                    onChange={(e) => {
                        try {
                            e.stopPropagation();
                            handleServiceCheckboxChange(serviceName, e.target.checked);
                        } catch (error) {
                            console.error('Error in service checkbox change:', error);
                        }
                    }}
                    style={{
                        width: "16px",
                        height: "16px",
                        margin: "0",
                        cursor: "pointer",
                        ...additionalProps.style
                    }}
                    {...additionalProps}
                />
            );
        } catch (error) {
            console.error('Error rendering service checkbox:', error);
            // Fallback: render a basic checkbox
            return (
                <input
                    type="checkbox"
                    checked={false}
                    disabled
                    style={{
                        width: "16px",
                        height: "16px",
                        margin: "0",
                        cursor: "not-allowed"
                    }}
                />
            );
        }
    };

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

    const renderValue = (value, referenceRange) => {
        if (!value) return "-";
        const isValueInRange = (value, refRange) => {
            if (!refRange || refRange === "-") return true;
            if (typeof refRange === 'string') {
                const rangeMatch = refRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
                if (rangeMatch) {
                    const min = parseFloat(rangeMatch[1]);
                    const max = parseFloat(rangeMatch[2]);
                    const numValue = parseFloat(value);
                    return !isNaN(numValue) && numValue >= min && numValue <= max;
                }
            }
            if (refRange?.ranges?.length > 0) {
                const allRange = refRange.ranges.find(range => range.gender?.toLowerCase() === "all");
                const maleRange = refRange.ranges.find(range => range.gender?.toLowerCase() === "male");
                const femaleRange = refRange.ranges.find(range => range.gender?.toLowerCase() === "female");
                
                let rangeToUse = allRange;
                if (patientGender?.toLowerCase() === "male" && maleRange) {
                    rangeToUse = maleRange;
                } else if (patientGender?.toLowerCase() === "female" && femaleRange) {
                    rangeToUse = femaleRange;
                }
                
                if (rangeToUse) {
                    const min = parseFloat(rangeToUse.min);
                    const max = parseFloat(rangeToUse.max);
                    const numValue = parseFloat(value);
                    return !isNaN(numValue) && numValue >= min && numValue <= max;
                }
            }
            return true;
        };
        
        // If value is an object with resultValue
        if (typeof value === 'object' && value.resultValue !== undefined) {
            const isInRange = isValueInRange(value.resultValue, referenceRange);
            const arrowDirection = calculateArrowDirection(value.resultValue, referenceRange);
            return (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span 
                            className={isInRange ? "lab-value-normal" : "lab-value-abnormal"}
                            style={{ fontSize: "14px" }}
                        >
                            {value.resultValue}
                        </span>
                        {arrowDirection === "up" && (
                            <ArrowUpOutlined
                                className="lab-params-warning"
                                style={{ paddingLeft: 5 }}
                            />
                        )}
                        {arrowDirection === "down" && (
                            <ArrowDownOutlined
                                className="lab-params-warning"
                                style={{ paddingLeft: 5 }}
                            />
                        )}
                    </div>
                    {referenceRange && referenceRange !== "-" && (
                        <span style={{ color: "#666", fontSize: "12px" }}>
                            ({referenceRange})
                        </span>
                    )}
                </div>
            );
        }
        
        // If value is a string or number
        if (typeof value === 'string' || typeof value === 'number') {
            const isInRange = isValueInRange(value, referenceRange);
            const arrowDirection = calculateArrowDirection(value, referenceRange);
            return (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span 
                            className={isInRange ? "lab-value-normal" : "lab-value-abnormal"}
                            style={{ fontSize: "14px" }}
                        >
                            {value}
                        </span>
                        {arrowDirection === "up" && (
                            <ArrowUpOutlined
                                className="lab-params-warning"
                                style={{ paddingLeft: 5 }}
                            />
                        )}
                        {arrowDirection === "down" && (
                            <ArrowDownOutlined
                                className="lab-params-warning"
                                style={{ paddingLeft: 5 }}
                            />
                        )}
                    </div>
                    {referenceRange && referenceRange !== "-" && (
                        <span style={{ color: "#666", fontSize: "12px" }}>
                            ({referenceRange})
                        </span>
                    )}
                </div>
            );
        }
        
        return "-";
    };

    const preparePayload = useCallback(() => {
        // Create a map to group inputs by date
        const dateMap = new Map();

        let datesToInclude = selectedDates;
        // Process each selected test report for each selected date
        Object.entries(selectedItems).forEach(([key, data]) => {
            // For each selected date, create an entry for this test report
            datesToInclude.forEach(formattedDate => {
                const originalDate = moment(formattedDate, "DD MMM, YYYY").format("DD-MM-YYYY");
                // Ensure date exists in map
                if (!dateMap.has(originalDate)) {
                    dateMap.set(originalDate, []);
                }
                // Find if there's actual data for this test report on this date
                const paramDataForDate = data.parameterData.find(p => p.date === originalDate);
                // Check if this is a service with parameters
                if (key.includes('_')) {
                    // This is a parameter of a service
                    const [serviceName, paramName] = key.split('_');

                    // Check if we already have this service in the inputs for this date
                    let existingServiceIndex = dateMap.get(originalDate).findIndex(
                        input => input.serviceName === serviceName
                    );

                    if (existingServiceIndex === -1) {
                        // Add new service with parameter
                        const serviceDateData = organizedData.tests[serviceName]?.dates[formattedDate];
                        
                        dateMap.get(originalDate).push({
                            referenceRange: serviceDateData?.referenceRange || data.serviceData.referenceRange || "-",
                            serviceCode: data.serviceData.serviceCode,
                            sampleId: paramDataForDate?.sampleId || "-",
                            certifiedDate: paramDataForDate?.certifiedDate || originalDate,
                            serviceName: serviceName,
                            resultvalue: serviceDateData?.resultvalue || "-",
                            labResultParameters: [{
                                resultValue: paramDataForDate?.resultValue || "-",
                                referenceRange: paramDataForDate?.referenceRange || "-",
                                labResultParameterId: paramDataForDate?.labResultParameterId || null,
                                parameterName: paramName,
                                status: true
                            }],
                            labResultId: paramDataForDate?.labResultId || null
                        });
                    } else {
                        // Add parameter to existing service
                        const existingService = dateMap.get(originalDate)[existingServiceIndex];
                        
                        // Check if this parameter already exists to avoid duplicates
                        const paramExists = existingService.labResultParameters.some(
                            param => param.parameterName === paramName
                        );
                        
                        if (!paramExists) {
                            existingService.labResultParameters.push({
                                resultValue: paramDataForDate?.resultValue || "-",
                                referenceRange: paramDataForDate?.referenceRange || "-",
                                labResultParameterId: paramDataForDate?.labResultParameterId || null,
                                parameterName: paramName,
                                status: true
                            });
                        }
                    }
                } else {
                    // This is a service without parameters
                    const serviceDateData = organizedData.tests[key]?.dates[formattedDate];
                    // Check if already exists to avoid duplicates
                    const serviceExists = dateMap.get(originalDate).some(
                        input => input.serviceName === key
                    );
                    if (!serviceExists) {
                        dateMap.get(originalDate).push({
                            referenceRange: serviceDateData?.referenceRange || data.serviceData.referenceRange || "-",
                            serviceCode: data.serviceData.serviceCode,
                            sampleId: paramDataForDate?.sampleId || "-",
                            certifiedDate: paramDataForDate?.certifiedDate || originalDate,
                            serviceName: key,
                            resultvalue: serviceDateData?.resultvalue || paramDataForDate?.resultValue || "-",
                            labResultParameters: [],
                            labResultId: paramDataForDate?.labResultId || null,
                            status: true
                        });
                    }
                }
            });
        });

        // Convert map to array and sort by date
        const payload = {
            patient_unique_id: patientId,
            source: "zydus-ict",
            mrc_no: mrcNo,
            data: Array.from(dateMap.entries())
                .map(([date, inputs]) => ({
                    date,
                    inputs
                }))
                .sort((a, b) => moment(b.date, "DD-MM-YYYY").valueOf() - moment(a.date, "DD-MM-YYYY").valueOf())
        };

        return payload;
    }, [selectedDates, selectedItems, organizedData, patientId, mrcNo]);

    // Update display data immediately when selectedDates changes
    useEffect(() => {
        // Only update if we have organized data and selected items
        if (organizedData.dates.length > 0 && Object.keys(selectedItems).length > 0) {
            // Use useCallback to prevent infinite loops
            const updateDisplayData = () => {
                const updatedData = preparePayload();
                if (updatedData && updatedData.data) {
                    setZydusSelectedLabParams(updatedData.data);
                } else {
                    // If no data, still show empty structure rather than completely empty
                    setZydusSelectedLabParams([]);
                }
            };
            // Debounce the update to prevent rapid calls
            const timeoutId = setTimeout(updateDisplayData, 100);
            return () => clearTimeout(timeoutId);
        } else if (selectedDates.length === 0) {
            // Clear the data when no dates are selected
            setZydusSelectedLabParams([]);
        }
    }, [selectedDates, selectedItems, organizedData.dates.length, preparePayload]); // Added preparePayload dependency

    const handleSave = async () => {
        try {
            if (selectedDates.length === 0 && !labReportID) {
                console.error("No dates selected for new report");
                return;
            }
            if (organizedData.dates.length === 0) {
                console.error("No lab data available");
                return;
            }
            if (selectedDates.length > 5) {
                console.error("Maximum 5 dates can be selected");
                return;
            }
            const payload = preparePayload();
            if (!payload || !payload.data || !Array.isArray(payload.data)) {
                console.error("❌ Invalid or empty payload");
                return;
            }

            // 2. Validate payload structure
            for (const item of payload.data) {
                // Check required fields
                if (!item.date || !item.inputs || !Array.isArray(item.inputs)) {
                    console.error("❌ Missing required fields in payload", item);
                    return;
                }

                // Validate each input
                for (const input of item.inputs) {
                    // Check required service fields
                    if (!input.serviceName || !input.serviceCode || !input.certifiedDate) {
                        console.error("❌ Invalid service data - missing required fields:", {
                            serviceName: input.serviceName,
                            serviceCode: input.serviceCode,
                            certifiedDate: input.certifiedDate
                        });
                        return;
                    }

                    // If service has parameters, validate them
                    if (input.labResultParameters && Array.isArray(input.labResultParameters)) {
                        for (const param of input.labResultParameters) {
                            if (!param.parameterName || param.resultValue === undefined || param.resultValue === null) {
                                console.error("❌ Invalid parameter data - missing required fields:", {
                                    parameterName: param.parameterName,
                                    resultValue: param.resultValue
                                });
                                return;
                            }
                        }
                    }
                }
            }

            // 3. Get and validate token
            const storedToken = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
            if (!storedToken) {
                console.error("❌ No auth token found");
                return;
            }

            let token;
            try {
                token = JSON.parse(storedToken);
            } catch (parseError) {
                console.error("❌ Error parsing token:", parseError);
                return;
            }

            // 4. Prepare API config
            const apiConfig = {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            // 5. Make API call based on flow
            let response;
            if (labReportID) {
                response = await axios.post(
                    `${env.lab_params_api_url}/api/v1/lab-reports/updatebyID`,
                    {
                        ...payload,
                        labReportID: labReportID
                    },
                    apiConfig
                );
            } else {
                response = await axios.post(
                    `${env.lab_params_api_url}/api/v1/lab-reports/`,
                    payload,
                    apiConfig
                );
            }

            // 6. Handle response
            if (!response || !response.data) {
                throw new Error("Invalid response from server");
            }

            // 7. Update state and close drawer
            if (response.data?.labReportID) {
                setLabReportID(response.data.labReportID);
            }
            
            // Update the parent's state with the new data
            setZydusSelectedLabParams(payload.data);
            
            // Call onSave with the new labReportID
            onSave(response.data?.labReportID);
            
            // Close the drawer
            handleZydusTestReportDrawer();

            // 8. Clear selection state after successful save
            setSelectedItems({});

        } catch (error) {
            console.error("❌ Save failed:", error.response?.data || error.message);
        }
    };

    const fetchPreviousSelections = async (labReportID) => {
        try {
            const response = await axios.post(
                `${env.lab_params_api_url}/api/v1/lab-reports/getByID`,
                {
                    labReportID: labReportID,
                    source: "zydus-ict",
                    patient_unique_id: patientId
                },
                {
                    headers: {
                        'Authorization': `Bearer ${JSON.parse(localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN))}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.data && response.data.data) {
                setZydusSelectedLabParams(response.data.data);
            }
            return response.data;
        } catch (error) {
            console.error("❌ Error fetching previous selections:", error.response?.data || error.message);
            return null;
        }
    };

    const transformPreviousSelections = (apiData) => {
        const newSelectedItems = {};
        
        try {
            apiData.data.forEach(dateData => {
                dateData.inputs.forEach(input => {
                    if (input.labResultParameters && input.labResultParameters.length > 0) {
                        // Handle services with parameters (e.g., CBC - Hemoglobin)
                        input.labResultParameters.forEach(param => {
                            const key = `${input.serviceName}_${param.parameterName}`;
                            if (!newSelectedItems[key]) {
                                newSelectedItems[key] = {
                                    serviceData: {
                                        referenceRange: input.referenceRange,
                                        serviceCode: input.serviceCode,
                                        serviceName: input.serviceName,
                                        resultvalue: input.resultvalue
                                    },
                                    parameterData: []
                                };
                            }
                            
                            newSelectedItems[key].parameterData.push({
                                date: dateData.date,
                                sampleId: input.sampleId,
                                certifiedDate: input.certifiedDate,
                                labResultId: input.labResultId,
                                resultValue: param.resultValue,
                                referenceRange: param.referenceRange,
                                labResultParameterId: param.labResultParameterId,
                                parameterName: param.parameterName,
                                status: true
                            });
                        });
                    } else {
                        // Handle services without parameters (e.g., Serum)
                        if (!newSelectedItems[input.serviceName]) {
                            newSelectedItems[input.serviceName] = {
                                serviceData: {
                                    referenceRange: input.referenceRange,
                                    serviceCode: input.serviceCode,
                                    serviceName: input.serviceName,
                                    resultvalue: input.resultvalue
                                },
                                parameterData: []
                            };
                        }
                        
                        newSelectedItems[input.serviceName].parameterData.push({
                            date: dateData.date,
                            sampleId: input.sampleId,
                            certifiedDate: input.certifiedDate,
                            labResultId: input.labResultId,
                            resultValue: input.resultvalue,
                            status: true
                        });
                    }
                });
            });
            
            return newSelectedItems;
        } catch (error) {
            console.error("❌ Error transforming data:", error);
            return {};
        }
    };

    // CRITICAL FIX: Load previous selections only after organized data is ready
    useEffect(() => {
        const loadPreviousSelections = async () => {
            // Wait for organized data to be ready
            if (labReportID && organizedData.tests && Object.keys(organizedData.tests).length > 0) {
                const previousData = await fetchPreviousSelections(labReportID);
                if (previousData) {
                    const transformedSelections = transformPreviousSelections(previousData);
                    setSelectedItems(transformedSelections);
                    // Restore selected dates from previous selection
                    const previousDates = previousData.data.map(dateData => {
                        return moment(dateData.date, "DD-MM-YYYY").format("DD MMM, YYYY");
                    });
                    setSelectedDates(previousDates);

                    // Automatically expand sections that have selected parameters
                    const expandedSectionsToSet = {};
                    Object.keys(transformedSelections).forEach(key => {
                        if (key.includes('_')) {
                            // This is a parameter selection, get the service name
                            const serviceName = key.split('_')[0];
                            expandedSectionsToSet[serviceName] = true;
                        } else {
                            // This is a service selection
                            expandedSectionsToSet[key] = true;
                        }
                    });
                    setExpandedSections(expandedSectionsToSet);
                }
            }
        };

        loadPreviousSelections();
    }, [labReportID, patientId]); // CRITICAL: Fixed infinite loop by removing organizedData dependency
    
    // Separate effect to handle auto-selection when data becomes available
    useEffect(() => {
        const handleAutoSelection = async () => {
            if (labReportID && organizedData.tests && Object.keys(organizedData.tests).length > 0 && Object.keys(selectedItems).length === 0) {
                const previousData = await fetchPreviousSelections(labReportID);
                if (previousData) {
                    const transformedSelections = transformPreviousSelections(previousData);
                    setSelectedItems(transformedSelections);
                    // Restore selected dates from previous selection
                    const previousDates = previousData.data.map(dateData => {
                        return moment(dateData.date, "DD-MM-YYYY").format("DD MMM, YYYY");
                    });
                    setSelectedDates(previousDates);

                    // Automatically expand sections that have selected parameters
                    const expandedSectionsToSet = {};
                    Object.keys(transformedSelections).forEach(key => {
                        if (key.includes('_')) {
                            const serviceName = key.split('_')[0];
                            expandedSectionsToSet[serviceName] = true;
                        } else {
                            expandedSectionsToSet[key] = true;
                        }
                    });
                    setExpandedSections(expandedSectionsToSet);
                }
            }
        };

        handleAutoSelection();
    }, [organizedData.dates.length]); // Only trigger when data length changes (stable)
    return (
        <div className="zydus-lab-params" style={{ backgroundColor: "#fff" }}>
            <style>
                {`
                    .zydus-lab-params .lab-value-abnormal {
                        color: #ff4d4f !important;
                        font-weight: 500 !important;
                    }
                    .zydus-lab-params .lab-value-normal {
                        color: #000000 !important;
                        font-weight: normal !important;
                    }
                    .zydus-lab-params .lab-params-warning {
                        color: #E54848 !important;
                    }
                `}
            </style>
            <div className='modalCard-header h-60 align-items-center justify-content-between d-flex' style={{ position: "sticky", top: "0", zIndex: "999" }}>
                <div className='align-items-center d-flex'>
                    <Button
                        type="text"
                        className='btn btn-delete-prescription px-3 focus-none h-100'
                        onClick={showHideBackModal}
                    >
                        <i className='icon-Cross fs-3'></i>
                    </Button>
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
                                            You will permanently lose your data.
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="d-flex align-items-center mt-2 justify-content-end">
                                        <div
                                            onClick={handleDeleteDataModal}
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
                    <div className="modal-title">Zydus Test Reports</div>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <button
                        className='btn d-flex align-items-center btn-text' 
                        onClick={toggleAllSections}
                        disabled={organizedData.dates.length === 0 || Object.keys(organizedData.tests || {}).length === 0}
                    >
                        {areAllSectionsExpanded() ? (
                            <span>
                                Collapse All
                            </span>
                        ) : (
                            <span>
                                View All
                            </span>
                        )}
                    </button>
                    <Button 
                        className='btn btn-primary3 btn-41 px-4 me-20' 
                        onClick={handleSave}
                        disabled={organizedData.dates.length === 0 || (selectedDates.length === 0 && !labReportID)}
                    >
                        <i className="icon-Save me-2"></i>
                        Save
                    </Button>
                </div>
            </div>
            {organizedData.dates.length > 0 && !loading && selectedDates.length >= 5 && (
                <div style={{ 
                    padding: "16px 20px", 
                    backgroundColor: "#fafafa",
                    borderBottom: "2px solid #e8e8e8"
                }}>
                    <div style={{ 
                        padding: "8px 12px",
                        backgroundColor: "#FFF3E0",
                        border: "1px solid #FFB74D",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "13px",
                        color: "#E65100"
                    }}>
                        <i className="icon-info me-2"></i>
                        Maximum 5 dates can be selected. Uncheck a date to select another.
                    </div>
                </div>
            )}

            <div style={{ 
                overflowX: "auto", 
                overflowY: "auto",
                maxHeight: "calc(100vh - 100px)",
                margin: "8px"
            }}>
                {loading ? (
                    <div style={{ 
                        display: "flex", 
                        justifyContent: "center", 
                        alignItems: "center", 
                        height: "700px",
                        flexDirection: "column",
                        gap: "16px"
                    }}>
                        <Spin size="large" />
                        <div style={{ color: "#666", fontSize: "14px" }}>
                            Loading lab results...
                        </div>
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ backgroundColor: "#F1F1F5" }}>
                            <tr style={{ position: "sticky", top: 0, zIndex: 5 }}>
                                <th style={{
                                    position: "sticky",
                                    top: 0,
                                    left: 0,
                                    background: "#F1F1F5",
                                    width: "23rem",
                                    padding: "10px",
                                    borderTopLeftRadius: "10px",
                                    borderBottomLeftRadius: "10px",
                                    fontWeight: "600",
                                    zIndex: 7
                                }}>
                                    <span>Lab Service/Parameter</span>
                                </th>
                                {organizedData?.dates?.map((date, index) => (
                                    <th key={date} style={{ 
                                        position: "sticky",
                                        top: 0,
                                        zIndex: 6,
                                        background: "#F1F1F5",
                                        padding: "10px",
                                        minWidth: "120px",
                                        borderTopRightRadius: index === organizedData.dates.length - 1 ? "10px" : "0",
                                        borderBottomRightRadius: index === organizedData.dates.length - 1 ? "10px" : "0",
                                        fontWeight: "600",
                                        fontSize: "14px"
                                    }}>
                                        <div className="date-values" style={{ 
                                            textWrap: "nowrap",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedDates.includes(date)}
                                                disabled={selectedDates.length >= 5 && !selectedDates.includes(date)}
                                                onChange={(e) => handleDateSelection(date, e.target.checked)}
                                                style={{ 
                                                    cursor: selectedDates.length >= 5 && !selectedDates.includes(date) ? "not-allowed" : "pointer",
                                                    width: "16px",
                                                    height: "16px"
                                                }}
                                            />
                                            <span>{date}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={organizedData.dates.length + 1} style={{ height: "15px", background: "#fff" }}></td>
                            </tr>
                            {Object.entries(organizedData.tests).map(([serviceName, testData], index) => (
                                <React.Fragment key={serviceName}>
                                    <tr
                                        style={{
                                            cursor: "pointer",
                                            width: "100%",
                                            backgroundColor: "#FAFAFB",
                                        }}
                                        onClick={() => toggleSection(serviceName)}
                                    >
                                        <td
                                            style={{
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 2,
                                                backgroundColor: "#FAFAFB",
                                                padding: "10px",
                                                display: "flex",
                                                alignItems: "center",
                                                width: "23rem",
                                                borderTopLeftRadius: "10px",
                                                borderBottomLeftRadius: "10px",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 10px" }}>
                                                {renderServiceCheckbox(serviceName)}
                                                <span style={{ fontSize: "14px", fontWeight: "500" }}>{serviceName}</span>
                                            </div>
                                            {expandedSections[serviceName] ? (
                                                <button
                                                    className="btn p-0 ms-2 iconrotate180"
                                                    style={{ position: "absolute", left: "816px" }}
                                                >
                                                    <i className="icon-right fs-5" />
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn p-0 ms-2 iconrotate270"
                                                    style={{ position: "absolute", left: "816px" }}
                                                >
                                                    <i className="icon-right fs-5" />
                                                </button>
                                            )}
                                        </td>
                                        {organizedData?.dates?.map((date, index) => {
                                            const isLastCell = index === organizedData.dates.length - 1;
                                            return (
                                                <td
                                                    key={date}
                                                    style={{
                                                        width: "160px",
                                                        padding: "10px",
                                                        textAlign: "right",
                                                        borderTopRightRadius: isLastCell ? "10px" : "0",
                                                        borderBottomRightRadius: isLastCell ? "10px" : "0",
                                                    }}
                                                ></td>
                                            );
                                        })}
                                    </tr>

                                    {expandedSections[serviceName] && (
                                        <>
                                            {Object.keys(testData.parameters).length > 0 ? (
                                                Object.entries(testData.parameters).map(([paramName, paramData]) => (
                                                    <tr key={`${serviceName}-${paramName}`} style={{ background: "#fff" }}>
                                                        <td style={{
                                                            position: "sticky",
                                                            left: 0,
                                                            background: "#fff",
                                                            padding: "10px",
                                                            width: "23rem",
                                                        }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 10px" }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!selectedItems[`${serviceName}_${paramName}`]}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        handleParameterCheckboxChange(serviceName, paramName, e.target.checked);
                                                                    }}
                                                                    style={{
                                                                        width: "16px",
                                                                        height: "16px",
                                                                        margin: "0",
                                                                        cursor: "pointer"
                                                                    }}
                                                                />
                                                                <div style={{ display: "flex", alignItems: "center" }}>
                                                                    <span style={{ fontSize: "14px" }}>{paramName}</span>
                                                                    {paramData.referenceRange && (
                                                                        <Tooltip
                                                                            placement="bottom"
                                                                            title={
                                                                                <div className="ref-range-tooltip">
                                                                                    <div>
                                                                                        <strong>Reference Range:</strong>
                                                                                        {(() => {
                                                                                            const refRange = paramData.referenceRange;
                                                                                            if (typeof refRange === 'string' && refRange !== '-') {
                                                                                                return <div>{refRange}</div>;
                                                                                            }
                                                                                            if (refRange?.ranges?.length > 0) {
                                                                                                const maleRange = refRange.ranges.find(
                                                                                                    (range) => range.gender?.toLowerCase() === "male"
                                                                                                );
                                                                                                const femaleRange = refRange.ranges.find(
                                                                                                    (range) => range.gender?.toLowerCase() === "female"
                                                                                                );
                                                                                                const allRange = refRange.ranges.find(
                                                                                                    (range) => range.gender?.toLowerCase() === "all"
                                                                                                );

                                                                                                if (maleRange && femaleRange) {
                                                                                                    return (
                                                                                                        <div>
                                                                                                            Male: {`${maleRange.min} - ${maleRange.max} ${maleRange.unit}`} <br />
                                                                                                            Female: {`${femaleRange.min} - ${femaleRange.max} ${femaleRange.unit}`}
                                                                                                        </div>
                                                                                                    );
                                                                                                } else if (maleRange) {
                                                                                                    return (
                                                                                                        <div>
                                                                                                            Male: {`${maleRange.min} - ${maleRange.max} ${maleRange.unit}`}
                                                                                                        </div>
                                                                                                    );
                                                                                                } else if (femaleRange) {
                                                                                                    return (
                                                                                                        <div>
                                                                                                            Female: {`${femaleRange.min} - ${femaleRange.max} ${femaleRange.unit}`}
                                                                                                        </div>
                                                                                                    );
                                                                                                } else if (allRange) {
                                                                                                    return (
                                                                                                        <div>
                                                                                                            All: {`${allRange.min} - ${allRange.max} ${allRange.unit}`}
                                                                                                        </div>
                                                                                                    );
                                                                                                }
                                                                                            }
                                                                                            if (refRange && refRange !== '-') {
                                                                                                return <div>{refRange}</div>;
                                                                                            }
                                                                                            return <div>No reference range available</div>;
                                                                                        })()}
                                                                                    </div>
                                                                                    <div className="disclaimer-text">
                                                                                        <span style={{ fontWeight: "600" }}>Disclaimer:</span>{" "}
                                                                                        {`This range is only for reference and may vary between patients based on different conditions.`}
                                                                                    </div>
                                                                                </div>
                                                                            }
                                                                            overlayClassName="lab-params-tooltip"
                                                                            overlayInnerStyle={{
                                                                                padding: "12px",
                                                                                width: "250px",
                                                                                background: "white",
                                                                                color: "black",
                                                                            }}
                                                                        >
                                                                            <i
                                                                                className="icon-info ms-1"
                                                                                style={{
                                                                                    cursor: "pointer",
                                                                                    color: "#d3d3d3",
                                                                                    fontSize: "18px",
                                                                                    marginBottom: "10px",
                                                                                }}
                                                                            ></i>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {organizedData?.dates?.map(date => {
                                                            const paramDateData = paramData.dates[date];
                                                            const value = renderValue(paramDateData, paramData.referenceRange);
                                                            return (
                                                                <td 
                                                                    key={`${serviceName}-${paramName}-${date}`}
                                                                    style={{ 
                                                                        padding: "10px",
                                                                        background: "transparent"
                                                                    }}
                                                                >
                                                                    {value}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr style={{ background: "#fff" }}>
                                                    <td style={{
                                                        position: "sticky",
                                                        left: 0,
                                                        background: "#fff",
                                                        padding: "10px",
                                                        width: "23rem",
                                                    }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 10px" }}>
                                                            {renderServiceCheckbox(serviceName)}
                                                            <div style={{ display: "flex", alignItems: "center" }}>
                                                                <span style={{ fontSize: "14px" }}>{serviceName}</span>
                                                                {Object.values(testData.dates)[0]?.referenceRange && (
                                                                    <Tooltip
                                                                        placement="bottom"
                                                                        title={
                                                                            <div className="ref-range-tooltip">
                                                                                <div>
                                                                                    <strong>Reference Range:</strong>
                                                                                    {(() => {
                                                                                        const refRange = Object.values(testData.dates)[0]?.referenceRange;
                                                                                        if (typeof refRange === 'string' && refRange !== '-') {
                                                                                            return <div>{refRange}</div>;
                                                                                        }
                                                                                        if (refRange?.ranges?.length > 0) {
                                                                                            const maleRange = refRange.ranges.find(
                                                                                                (range) => range.gender?.toLowerCase() === "male"
                                                                                            );
                                                                                            const femaleRange = refRange.ranges.find(
                                                                                                (range) => range.gender?.toLowerCase() === "female"
                                                                                            );
                                                                                            const allRange = refRange.ranges.find(
                                                                                                (range) => range.gender?.toLowerCase() === "all"
                                                                                            );

                                                                                            if (maleRange && femaleRange) {
                                                                                                return (
                                                                                                    <div>
                                                                                                        Male: {`${maleRange.min} - ${maleRange.max} ${maleRange.unit}`} <br />
                                                                                                        Female: {`${femaleRange.min} - ${femaleRange.max} ${femaleRange.unit}`}
                                                                                                    </div>
                                                                                                );
                                                                                            } else if (maleRange) {
                                                                                                return (
                                                                                                    <div>
                                                                                                        Male: {`${maleRange.min} - ${maleRange.max} ${maleRange.unit}`}
                                                                                                    </div>
                                                                                                );
                                                                                            } else if (femaleRange) {
                                                                                                return (
                                                                                                    <div>
                                                                                                        Female: {`${femaleRange.min} - ${femaleRange.max} ${femaleRange.unit}`}
                                                                                                    </div>
                                                                                                );
                                                                                            } else if (allRange) {
                                                                                                return (
                                                                                                    <div>
                                                                                                        All: {`${allRange.min} - ${allRange.max} ${allRange.unit}`}
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                        }
                                                                                        if (refRange && refRange !== '-') {
                                                                                            return <div>{refRange}</div>;
                                                                                        }
                                                                                        return <div>No reference range available</div>;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="disclaimer-text">
                                                                                    <span style={{ fontWeight: "600" }}>Disclaimer:</span>{" "}
                                                                                    {`This range is only for reference and may vary between patients based on different conditions.`}
                                                                                </div>
                                                                            </div>
                                                                        }
                                                                        overlayClassName="lab-params-tooltip"
                                                                        overlayInnerStyle={{
                                                                            padding: "12px",
                                                                            width: "250px",
                                                                            background: "white",
                                                                            color: "black",
                                                                        }}
                                                                    >
                                                                        <i
                                                                            className="icon-info ms-1"
                                                                            style={{
                                                                                cursor: "pointer",
                                                                                color: "#d3d3d3",
                                                                                fontSize: "18px",
                                                                                marginBottom: "10px",
                                                                            }}
                                                                        ></i>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {organizedData?.dates?.map(date => (
                                                        <td key={date} style={{ padding: "10px" }}>
                                                            {renderValue(testData.dates[date]?.resultvalue, testData.dates[date]?.referenceRange)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )}
                                        </>
                                    )}
                                    
                                    {index < Object.keys(organizedData.tests).length - 1 && (
                                        <tr>
                                            <td colSpan={organizedData.dates.length + 1} style={{ height: "10px", background: "#fff" }}></td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ZydusLabParams; 
