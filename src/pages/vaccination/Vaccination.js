/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from "react";
import "./Vaccination.scss";
import { Checkbox, Spin } from "antd";
import VaccineHeader from "./components/vaccineHeader/VaccineHeader";
import VaccineCard from "./components/vaccineCard/VaccineCard";
import VaccineFilter from "./components/vaccineFilter/VaccineFilter";
import SelectionPopup from "./components/selectionPopup/SelectionPopup";

import { Row, Col } from "react-bootstrap";
import UpdateVaccine from "./components/updateVaccine/UpdateVaccine";
import VaccinationChart from "./components/vaccinationChart/vaccinationChart";
import { useReactToPrint } from "react-to-print";
import AddDOB from "./components/addDOB/AddDOB";
import moment from "moment";
import {
  getVaccineTemplates,
  getPatientDetails,
  getVaccineBrands,
  getPatientVaccineDetails,
  getOverridenDueDate,
  getTvtAgeBySection,
} from "./service";
import {
  getDates,
  getDefaultOption,
  getDistinctAges,
  mergeDataPatientDetails,
  splitVaccinesByCategory,
  VaccinationCategoryEnum,
} from "./VaccinationHelper";
import CashManagerContext from "../../context/CashManagerContext";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import FullPageLoader from "./components/Loader.js";
import { handlePrintClick, trackEvent } from "../../utils/utils.js";
import { getDecodedToken } from "../../utils/localStorage.js";
import { ASSETS } from "../../assets";
const closeFill = ASSETS.images.closefill;

function Vaccination({ handleDrawerVaccination, source, onVaccinationUpdated }) {
  const [isFixed, setIsFixed] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [warningMsg, setWarningMsg] = useState("");
  const [showUpdate, setShowUpdate] = useState(false);
  const printableRef = useRef(null);
  const [showDob, setShowDob] = useState(false);
  const [patientDetails, setPatientDetails] = useState({});
  const [brands, setBrands] = useState([]);
  const [activeDate, setActiveDate] = useState(0);
  const [vaccinesData, setVaccinesData] = useState([]);
  const [completeData, setCompleteData] = useState({});
  const [dateOptions, setDateOptions] = useState([]);
  const [ageFilters, setAgeFilters] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [tvtAgeBySectionData, setTvtAgeBySectionData] = useState({});
  const { state } = useLocation();
  let { patient_data } = state;
  const [printType, setPrintType] = useState("");
  const [printVaccineCategory, setPrintVaccineCategory] = useState("iap");
  const [shouldShowSelectAll, setShouldShowSelectAll] = useState(false);
  const [isCardClicked, setCardClicked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vaccinePatientDetails, setVaccinePatientDetails] = useState();
  const [tabLoader, setTabLoader] = useState(false);
  const [activeVaccineTab, setActiveVaccineTab] = useState(
    VaccinationCategoryEnum[0].key
  );
  const [splitVaccineData, setSplitVaccineData] = useState({
    [VaccinationCategoryEnum[0].key]: [],
    [VaccinationCategoryEnum[1].key]: [],
  });
  const lastUpdatedVaccineRef = useRef(null);
  const pendingActiveDateRef = useRef(null);

  const contextApi = {
    patient_data,
  };

  useEffect(() => {
    getVaccineDetails();
  }, []);

  useEffect(() => {
    if (warningMsg) {
      const timer = setTimeout(() => {
        setWarningMsg("");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [warningMsg]);

  useEffect(() => {
    // If there's a pending activeDate update after vaccine update, apply it first
    if (pendingActiveDateRef.current !== null && completeData && ageFilters.length > 0) {
      const pendingIndex = pendingActiveDateRef.current;
      if (pendingIndex >= 0 && pendingIndex < ageFilters.length) {
        const tempPending = pendingIndex;
        pendingActiveDateRef.current = null;
        // Use setTimeout to ensure this happens after current render
        setTimeout(() => {
          setActiveDate(tempPending);
        }, 0);
        return; // Exit early, let the next effect run handle the filtering
      }
    }
    
    // Filter vaccines based on active date and active tab
    const activeValue = ageFilters?.[activeDate];
    const filteredData = completeData?.get?.(activeValue) || [];
    
    // Since completeData is already filtered by tab, we can directly use filteredData
    setVaccinesData(filteredData);
    setShouldShowSelectAll(false);
  }, [activeDate, completeData, ageFilters]);

  useEffect(() => {
    // Update filters and data when tab changes
    if (
      splitVaccineData &&
      Object.keys(splitVaccineData).length > 0 &&
      Object.keys(tvtAgeBySectionData).length > 0
    ) {
      const currentTabData = splitVaccineData[activeVaccineTab] || [];
      const result = getDistinctAges(currentTabData);
      
      // Update ageFilters based on active tab
      const currentTabValue = VaccinationCategoryEnum.find(
        (cat) => cat.key === activeVaccineTab
      )?.value;
      
      // Get age filters from tvtAgeBySection if available, otherwise use distinct ages
      const ageFilterList =
        tvtAgeBySectionData[currentTabValue] || result.distinctIds;
      setAgeFilters(ageFilterList);
      
      // Update completeData with the current tab's data
      // For "Other Vaccines" tab, sort vaccines within each age group by latest date (newest first)
      let sortedIdMap = result.idMap;
      if (activeVaccineTab === VaccinationCategoryEnum[1].key) {
        sortedIdMap = new Map();
        result.idMap.forEach((vaccines, ageKey) => {
          const sortedVaccines = [...vaccines].sort((a, b) => {
            const getLatestDate = (v) => {
              let latestDate = null;
              // Check given date first (most recent)
              if (v?.tvp_given_date) {
                const givenDate = new Date(v.tvp_given_date);
                if (!latestDate || givenDate > latestDate) {
                  latestDate = givenDate;
                }
              }
              // Then check due date
              if (v?.tvd_due_date) {
                const dueDate = new Date(v.tvd_due_date);
                if (!latestDate || dueDate > latestDate) {
                  latestDate = dueDate;
                }
              }
              // Finally check calculated due date
              if (v?.dueDate) {
                const calcDueDate = new Date(v.dueDate);
                if (!latestDate || calcDueDate > latestDate) {
                  latestDate = calcDueDate;
                }
              }
              return latestDate || new Date(0);
            };
            
            const dateA = getLatestDate(a);
            const dateB = getLatestDate(b);
            // Sort descending (newest first)
            return dateB - dateA;
          });
          sortedIdMap.set(ageKey, sortedVaccines);
        });
      }
      setCompleteData(sortedIdMap);
      
      // Update dateOptions based on current tab's data
      let options = getDates(result.idMap);
      
      // For "Other Vaccines" tab, sort: orange first, then green (all given), then others
      if (activeVaccineTab === VaccinationCategoryEnum[1].key) {
        options = options.sort((a, b) => {
          // Get alert status for each option
          const getAlertStatus = (option) => {
            const vaccines = result.idMap?.get?.(option.label) || [];
            if (vaccines.length === 0) return null;
            
            const allGiven = vaccines.every((v) => v?.tvp_given_date);
            const anyGiven = vaccines.some((v) => v?.tvp_given_date);
            const anyDue = vaccines.some((v) => v?.tvd_due_date);
            
            if (allGiven) {
              return "success"; // Green - all vaccines given
            } else if (anyGiven || anyDue) {
              return "warning"; // Orange - some given or due
            }
            return null;
          };
          
          // Get the latest given date (tvp_given_date) from each group
          const getLatestGivenDate = (option) => {
            const vaccines = result.idMap?.get?.(option.label) || [];
            let latestGivenDate = null;
            
            vaccines.forEach((v) => {
              if (v?.tvp_given_date) {
                const givenDate = new Date(v.tvp_given_date);
                if (!latestGivenDate || givenDate > latestGivenDate) {
                  latestGivenDate = givenDate;
                }
              }
            });
            
            return latestGivenDate;
          };
          
          // Get the latest date from each group (given date or due date)
          const getLatestDate = (option) => {
            const vaccines = result.idMap?.get?.(option.label) || [];
            let latestDate = null;
            
            vaccines.forEach((v) => {
              // Check given date first (most recent)
              if (v?.tvp_given_date) {
                const givenDate = new Date(v.tvp_given_date);
                if (!latestDate || givenDate > latestDate) {
                  latestDate = givenDate;
                }
              }
              // Then check due date
              if (v?.tvd_due_date) {
                const dueDate = new Date(v.tvd_due_date);
                if (!latestDate || dueDate > latestDate) {
                  latestDate = dueDate;
                }
              }
              // Finally check calculated due date
              if (v?.dueDate) {
                const calcDueDate = new Date(v.dueDate);
                if (!latestDate || calcDueDate > latestDate) {
                  latestDate = calcDueDate;
                }
              }
            });
            
            return latestDate || new Date(0); // Return epoch if no date found
          };
          
          const statusA = getAlertStatus(a);
          const statusB = getAlertStatus(b);
          
          // Priority: warning (orange) > success (green/all given) > null
          const statusPriority = { warning: 0, success: 1, null: 2 };
          const priorityA = statusPriority[statusA] ?? 2;
          const priorityB = statusPriority[statusB] ?? 2;
          
          // First sort by status priority (orange first, then green, then others)
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          
          // If both are green (all given), sort by latest given date (newest first)
          if (statusA === "success" && statusB === "success") {
            const latestGivenDateA = getLatestGivenDate(a);
            const latestGivenDateB = getLatestGivenDate(b);
            if (latestGivenDateA && latestGivenDateB) {
              return latestGivenDateB - latestGivenDateA; // Newest given date first
            }
          }
          
          // For other cases (orange or null), sort by latest date
          const dateA = getLatestDate(a);
          const dateB = getLatestDate(b);
          // If orange (warning), sort in increasing order (oldest first), otherwise newest first
          if (statusA === "warning" || statusB === "warning") {
            return dateA - dateB; // Increasing order for orange
          }
          return dateB - dateA; // Decreasing order for others
        });
        
        // Update ageFilters to match the sorted order of dateOptions
        const sortedAgeFilters = options.map(option => option.label);
        setAgeFilters(sortedAgeFilters);
      }
      
      setDateOptions(options);
      
      // Reset activeDate to default for the new tab
      if (options.length > 0) {
        // For "Other Vaccines", select the first option (latest/newest)
        if (activeVaccineTab === VaccinationCategoryEnum[1].key) {
          setActiveDate(0);
        } else {
          setActiveDate(getDefaultOption(options));
        }
      } else {
        setActiveDate(0);
      }
      
      // Update previewData
      setPreviewData(currentTabData);
    }
  }, [activeVaccineTab, splitVaccineData, tvtAgeBySectionData]);

  useEffect(() => {
    if (printType) {
      handlePrintClick(
        printableRef.current,
        setTabLoader,
        handlePrintWeb,
        "vaccinationChart"
      );
      setPrintType("");
    }
  }, [printType]);

  useEffect(() => {
    selectAllCheck();
  }, [vaccinesData]);

  const { profile } = useSelector((state) => state.doctors);

  const getPatientDetail = async () => {
    const decodedToken = getDecodedToken();
    const hospital_bid = decodedToken?.result?.hospital_business_id;
    const patientDetails = await getPatientDetails({
      hospital_bid:
        patient_data?.hm_business_id ||
        patient_data?.hospital_business_id ||
        hospital_bid,
      patient_uid: patient_data?.patient_unique_id,
      hospital_id: patient_data?.hm_id || profile?.hospital_data?.[0]?.hm_id,
    });
    setVaccinePatientDetails({ ...patient_data, ...patientDetails });
    if (
      !patientDetails?.vac_id ||
      (patientDetails?.vac_id && !patientDetails?.vac_dob)
    ) {
      setShowDob(true);
    } else {
      patientDetails.vac_dob = moment(patientDetails.vac_dob).format(
        "DD-MMM-YYYY"
      );
    }
    setPatientDetails(patientDetails);
    return patientDetails;
  };

  const getVaccineDetails = async (updatedVaccine) => {
    const tvtAgeBySection = await getTvtAgeBySection();
    setTvtAgeBySectionData(tvtAgeBySection);
    const vaccineTemplate = await getVaccineTemplates();
    const patientDetail = await getPatientDetail();
    
    // Calculate patient age and set initial tab if age > 18
    let currentActiveTab = activeVaccineTab;
    if (patientDetail?.vac_dob && !updatedVaccine) {
      const birthDate = moment(patientDetail.vac_dob, "DD-MMM-YYYY");
      const ageInYears = moment().diff(birthDate, "years", true);
      
      if (ageInYears > 18) {
        currentActiveTab = VaccinationCategoryEnum[1].key; // Set to "Other Vaccines"
        setActiveVaccineTab(currentActiveTab);
      }
    }
    
    const overridenVaccines = await getOverridenDueDate(
      patient_data?.patient_unique_id,
      patient_data?.pm_pid
    );
    const patientDetailsRes = await getPatientVaccineDetails(
      patientDetail?.patient_unique_id,
      patientDetail?.vac_pid,
      patientDetail?.hm_business_id
    );
    const details = await getVaccineBrands();
    setBrands(details);

    const birthDate = patientDetail?.vac_dob
      ? new Date(patientDetail?.vac_dob)
      : "";

    const combinedData = mergeDataPatientDetails(
      vaccineTemplate,
      patientDetailsRes,
      overridenVaccines,
      details,
      birthDate
    );
    const splitData = splitVaccinesByCategory(combinedData, tvtAgeBySection);
    setSplitVaccineData(splitData);
    
    // Initialize with current active tab
    const currentTabData = splitData[currentActiveTab] || [];
    setPreviewData(currentTabData);
    const result = getDistinctAges(currentTabData);
    
    // Set ageFilters based on active tab
    const currentTabValue = VaccinationCategoryEnum.find(
      (cat) => cat.key === currentActiveTab
    )?.value;
    setAgeFilters(tvtAgeBySection[currentTabValue] || result.distinctIds);

    // For "Other Vaccines" tab, sort vaccines within each age group by latest date (newest first)
    let sortedIdMap = result.idMap;
    if (currentActiveTab === VaccinationCategoryEnum[1].key) {
      sortedIdMap = new Map();
      result.idMap.forEach((vaccines, ageKey) => {
        const sortedVaccines = [...vaccines].sort((a, b) => {
          const getLatestDate = (v) => {
            let latestDate = null;
            // Check given date first (most recent)
            if (v?.tvp_given_date) {
              const givenDate = new Date(v.tvp_given_date);
              if (!latestDate || givenDate > latestDate) {
                latestDate = givenDate;
              }
            }
            // Then check due date
            if (v?.tvd_due_date) {
              const dueDate = new Date(v.tvd_due_date);
              if (!latestDate || dueDate > latestDate) {
                latestDate = dueDate;
              }
            }
            // Finally check calculated due date
            if (v?.dueDate) {
              const calcDueDate = new Date(v.dueDate);
              if (!latestDate || calcDueDate > latestDate) {
                latestDate = calcDueDate;
              }
            }
            return latestDate || new Date(0);
          };
          
          const dateA = getLatestDate(a);
          const dateB = getLatestDate(b);
          // Sort descending (newest first)
          return dateB - dateA;
        });
        sortedIdMap.set(ageKey, sortedVaccines);
      });
    }
    setCompleteData(sortedIdMap);
    let options = getDates(result.idMap);
    
    // For "Other Vaccines" tab, sort: orange first, then green (all given), then others
    if (currentActiveTab === VaccinationCategoryEnum[1].key) {
      options = options.sort((a, b) => {
        // Get alert status for each option
        const getAlertStatus = (option) => {
          const vaccines = result.idMap?.get?.(option.label) || [];
          if (vaccines.length === 0) return null;
          
          const allGiven = vaccines.every((v) => v?.tvp_given_date);
          const anyGiven = vaccines.some((v) => v?.tvp_given_date);
          const anyDue = vaccines.some((v) => v?.tvd_due_date);
          
          if (allGiven) {
            return "success"; // Green - all vaccines given
          } else if (anyGiven || anyDue) {
            return "warning"; // Orange - some given or due
          }
          return null;
        };
        
        // Get the latest given date (tvp_given_date) from each group
        const getLatestGivenDate = (option) => {
          const vaccines = result.idMap?.get?.(option.label) || [];
          let latestGivenDate = null;
          
          vaccines.forEach((v) => {
            if (v?.tvp_given_date) {
              const givenDate = new Date(v.tvp_given_date);
              if (!latestGivenDate || givenDate > latestGivenDate) {
                latestGivenDate = givenDate;
              }
            }
          });
          
          return latestGivenDate;
        };
        
        // Get the latest date from each group (given date or due date)
        const getLatestDate = (option) => {
          const vaccines = result.idMap?.get?.(option.label) || [];
          let latestDate = null;
          
          vaccines.forEach((v) => {
            // Check given date first (most recent)
            if (v?.tvp_given_date) {
              const givenDate = new Date(v.tvp_given_date);
              if (!latestDate || givenDate > latestDate) {
                latestDate = givenDate;
              }
            }
            // Then check due date
            if (v?.tvd_due_date) {
              const dueDate = new Date(v.tvd_due_date);
              if (!latestDate || dueDate > latestDate) {
                latestDate = dueDate;
              }
            }
            // Finally check calculated due date
            if (v?.dueDate) {
              const calcDueDate = new Date(v.dueDate);
              if (!latestDate || calcDueDate > latestDate) {
                latestDate = calcDueDate;
              }
            }
          });
          
          return latestDate || new Date(0); // Return epoch if no date found
        };
        
        const statusA = getAlertStatus(a);
        const statusB = getAlertStatus(b);
        
        // Priority: warning (orange) > success (green/all given) > null
        const statusPriority = { warning: 0, success: 1, null: 2 };
        const priorityA = statusPriority[statusA] ?? 2;
        const priorityB = statusPriority[statusB] ?? 2;
        
        // First sort by status priority (orange first, then green, then others)
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // If both are green (all given), sort by latest given date (newest first)
        if (statusA === "success" && statusB === "success") {
          const latestGivenDateA = getLatestGivenDate(a);
          const latestGivenDateB = getLatestGivenDate(b);
          if (latestGivenDateA && latestGivenDateB) {
            return latestGivenDateB - latestGivenDateA; // Newest given date first
          }
        }
        
        // For other cases (orange or null), sort by latest date
        const dateA = getLatestDate(a);
        const dateB = getLatestDate(b);
        // If orange (warning), sort in increasing order (oldest first), otherwise newest first
        if (statusA === "warning" || statusB === "warning") {
          return dateA - dateB; // Increasing order for orange
        }
        return dateB - dateA; // Decreasing order for others
      });
      
      // Update ageFilters to match the sorted order of dateOptions
      const sortedAgeFilters = options.map(option => option.label);
      setAgeFilters(sortedAgeFilters);
    }
    
    setDateOptions(options);
    
    if (updatedVaccine && lastUpdatedVaccineRef.current) {
      // Find the vaccine that was updated and set activeDate to the filter containing it
      const { tvt_id, tvac_name, tvt_age, currentActiveDate } = lastUpdatedVaccineRef.current;
      
      // Search through options array to find which filter contains the updated vaccine
      // This ensures we match the exact order of the options array
      let foundIndex = -1;
      
      // Search all options to find the vaccine
      for (let i = 0; i < options.length; i++) {
        const optionLabel = options[i]?.label;
        const ageValue = result.idMap?.get?.(optionLabel);
        if (ageValue && Array.isArray(ageValue)) {
          const foundVaccine = ageValue.find(
            (v) => String(v?.tvt_id) === String(tvt_id) && v?.tvac_name === tvac_name
          );
          if (foundVaccine) {
            foundIndex = i;
            break;
          }
        }
      }
      
      if (foundIndex >= 0) {
        // Store the index to be applied when completeData is ready
        pendingActiveDateRef.current = foundIndex;
      } else {
        // If vaccine not found, try to preserve the current activeDate if it's still valid
        if (currentActiveDate >= 0 && currentActiveDate < options.length) {
          pendingActiveDateRef.current = currentActiveDate;
        }
      }
      // Clear the ref after use
      lastUpdatedVaccineRef.current = null;
    } else if (!updatedVaccine) {
      // For "Other Vaccines", select the first option (latest/newest)
      if (currentActiveTab === VaccinationCategoryEnum[1].key) {
        setActiveDate(0);
      } else {
      setActiveDate(getDefaultOption(options));
      }
    }
    setLoading(false);
  };

  const handleSelectAll = (event) => {
    const checked = event?.target?.checked;
    setSelectAll(checked);
    if (checked) {
      let indices = [...Array(vaccinesData.length).keys()];
      setSelectedCards(indices);
    } else {
      setSelectedCards([]);
      setWarningMsg("");
    }
  };

  const selectAllCheck = () => {
    // Needs to check for updated due date

    // checking for two different due dates vaccines
    const vaccineDue = vaccinesData?.[0]?.dueDate;
    const difference = vaccinesData?.filter(
      (vaccineData) => vaccineData.dueDate !== vaccineDue
    );
    const vaccineGiven = vaccinesData?.[0]?.tvp_given_date;

    // checking for two different given dates
    const givenDifference = vaccinesData?.filter(
      (vaccineData) => vaccineData.tvp_given_date !== vaccineGiven
    );
    if (!givenDifference?.length && !difference?.length) {
      setShouldShowSelectAll(true);
    }

    /**
     * checking for both vaccine given and not given were present or not
     * If both are present then we dont show the select all
     */
    const checkForGiven = vaccinesData?.find(
      (vaccineData) => vaccineData?.tvp_given_date
    );
    const checkForNotGiven = vaccinesData?.find(
      (vaccineData) => !vaccineData?.tvp_given_date
    );
    if (checkForGiven && checkForNotGiven) {
      setShouldShowSelectAll(false);
    }
  };

  const handleCardCheckboxChange = (id) => {
    setShowUpdate(false);
    let newSelectedCards = [...selectedCards];
    if (newSelectedCards.includes(id)) {
      newSelectedCards = newSelectedCards.filter((cardId) => cardId !== id);
    } else {
      if (newSelectedCards.length) {
        if (
          vaccinesData[selectedCards[0]]?.tvp_given_date &&
          vaccinesData[id]?.tvp_given_date
        ) {
          if (
            vaccinesData[selectedCards[0]]?.tvp_given_date ===
            vaccinesData[id]?.tvp_given_date
          ) {
            newSelectedCards.push(id);
          } else {
            setWarningMsg(
              "Vaccine given on different dates can't be selected together!"
            );
            newSelectedCards = [id];
          }
        } else if (
          vaccinesData[selectedCards[0]].tvp_given_date ===
          vaccinesData[id]?.tvp_given_date
        ) {
          newSelectedCards.push(id);
        } else {
          setWarningMsg(
            "Given vaccine and Due Vaccines cannot be selected together!"
          );
          newSelectedCards = [id];
        }
      } else {
        newSelectedCards.push(id);
      }
    }
    setSelectedCards(newSelectedCards);
    setSelectAll(newSelectedCards.length === vaccinesData.length);
  };

  const warningMsgHandler = () => {
    setWarningMsg("");
  };

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    if (scrollTop > 160) {
      setIsFixed(true);
    } else {
      setIsFixed(false);
    }
  };

  const handlePrintWeb = useReactToPrint({
    content: () => printableRef.current,
  });

  const handleCardClick = (i) => {
    setCardClicked(true);
    setSelectedCards([i]);
    setShowUpdate(true);
  };

  return (
    <CashManagerContext.Provider value={contextApi}>
      <div className="vaccinationWrapper">
        {vaccinesData?.length > 0 && previewData?.length > 0 && (
          <VaccineHeader
            handleDrawerVaccination={handleDrawerVaccination}
            vaccinesData={previewData}
            setPrintType={setPrintType}
            isVaccination={true}
            printLoader={tabLoader}
            splitVaccineData={splitVaccineData}
            activeVaccineTab={activeVaccineTab}
            setActiveVaccineTab={setActiveVaccineTab}
            printVaccineCategory={printVaccineCategory}
            setPrintVaccineCategory={setPrintVaccineCategory}
            source={source}
            onVaccinationUpdated={onVaccinationUpdated}
          />
        )}
        <div
          id="wrap"
          onScroll={handleScroll}
          style={{ overflowY: "auto", position: "relative" }}
          className="vaccinationContainer position-relative"
        >
          <div className="vaccinationTitle bg-welcome d-flex justify-content-between align-items-center">
            <div>
              <h2>Vaccination</h2>
              <p>
                {activeVaccineTab === VaccinationCategoryEnum[1].key ? (
                  "Non-Scheduled Vaccinations"
                ) : (
                  <>
                Immunisation schedule recommended by <b>IAP</b>
                  </>
                )}
              </p>
            </div>
            <img
              src={ASSETS.images.vaccine}
              className="vaccineImg d-inline-block align-top ms-4"
              alt="Vaccine"
              width={220}
            />
          </div>
          {splitVaccineData?.[VaccinationCategoryEnum[1].key]?.length > 0 && (
            <div className="vaccine-tab-filter mb-3">
              {VaccinationCategoryEnum.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className={`vaccine-tab-btn ${
                    activeVaccineTab === category.key ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveVaccineTab(category.key);
                    trackEvent("TP_Vac_Type", {
                      patientName: patient_data?.pm_fullname || "",
                      patientId: patient_data?.patient_unique_id || "",
                      doctorSpeciality: profile?.dp_name,
                      doctorId: profile?.doctor_unique_id,
                      doctorContact: profile?.um_contact,
                      doctorName: profile?.um_name,
                      source: source,
                      type: VaccinationCategoryEnum.find(
                        (item) => item.key === category.key
                      )?.value,
                    });
                  }}
                >
                  {category.value}
                </button>
              ))}
          </div>
          )}
          {vaccinesData?.length && !loading ? (
            <>
              <div className={isFixed ? "fixFilter" : ""}>
                <VaccineFilter
                  dateOptions={dateOptions}
                  activeDate={activeDate}
                  setActiveDate={setActiveDate}
                  setSelectedCards={setSelectedCards}
                  setSelectAll={setSelectAll}
                  activeVaccineTab={activeVaccineTab}
                  completeData={completeData}
                />
              </div>
              <div style={{ marginTop: isFixed ? "100px" : "0px" }}>
                {shouldShowSelectAll ? (
                  <div className="selectAllContainer scrollable-content">
                    <Checkbox
                      className="vaccine-custom-checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                    <span className="selectAll">Select All</span>
                  </div>
                ) : null}

                <Row xs={1} sm={2} md={2} lg={3} className="gy-4">
                  {vaccinesData?.map((vaccineData, index) => (
                    <Col key={index} className="gx-4">
                      <VaccineCard
                        vaccineData={vaccineData}
                        selectedCards={selectedCards}
                        handleCardCheckboxChange={handleCardCheckboxChange}
                        setSelectedCards={setSelectedCards}
                        index={index}
                        handleCardClick={handleCardClick}
                        activeVaccineTab={activeVaccineTab}
                        isOtherVaccine={
                          activeVaccineTab === VaccinationCategoryEnum[1].key
                        }
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            </>
          ) : (
            <div>
              <Spin
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                }}
                size="large"
              />
            </div>
          )}
        </div>
        {warningMsg ? (
          <div
            className={`customWarningDrawer ${
              !!warningMsg ? "open" : "closed"
            }`}
          >
            <div className="warningStyle">
              {warningMsg}
              <img
                src={closeFill}
                alt="close"
                className="closeImg"
                onClick={warningMsgHandler}
              />
            </div>
          </div>
        ) : null}
        {selectedCards.length && !isCardClicked ? (
          <SelectionPopup
            visible={!!selectedCards.length}
            onClose={handleSelectAll}
            selectedValue={selectedCards.length}
            setSelectedCards={setSelectedCards}
            setShowUpdate={setShowUpdate}
            setWarningMsg={setWarningMsg}
          />
        ) : null}
        {showUpdate && (
          <UpdateVaccine
            show={showUpdate}
            setShow={setShowUpdate}
            brands={brands}
            selectedVaccines={selectedCards?.map((id) => vaccinesData[id])}
            patientDetails={patientDetails}
            getVaccineDetails={(updatedVaccine) => {
              // Store the vaccine identifier and current filter before updating
              if (
                updatedVaccine &&
                selectedCards.length > 0 &&
                vaccinesData[selectedCards[0]]
              ) {
                const vaccine = vaccinesData[selectedCards[0]];
                lastUpdatedVaccineRef.current = {
                  tvt_id: vaccine?.tvt_id,
                  tvac_name: vaccine?.tvac_name,
                  tvt_age: vaccine?.tvt_age,
                  currentActiveDate: activeDate,
                };
              }
              getVaccineDetails(updatedVaccine);
            }}
            setSelectedCards={setSelectedCards}
            setSelectAll={setSelectAll}
            setCardClicked={setCardClicked}
            setLoading={setLoading}
            source={source}
          />
        )}
        {vaccinesData?.length && (
          <div style={{ display: "none" }}>
            <div ref={printableRef}>
              <VaccinationChart
                vaccinesData={(() => {
                  // Determine which vaccines to include based on category selection
                  let vaccinesToPrint = [];

                  if (printVaccineCategory === "iap") {
                    vaccinesToPrint =
                      splitVaccineData?.[VaccinationCategoryEnum[0].key] || [];
                  } else if (printVaccineCategory === "other") {
                    vaccinesToPrint =
                      splitVaccineData?.[VaccinationCategoryEnum[1].key] || [];
                  } else if (printVaccineCategory === "both") {
                    vaccinesToPrint = [
                      ...(splitVaccineData?.[VaccinationCategoryEnum[0].key] ||
                        []),
                      ...(splitVaccineData?.[VaccinationCategoryEnum[1].key] ||
                        []),
                    ];
                  } else {
                    vaccinesToPrint = previewData;
                  }

                  // Filter by status (printType: "1" = All, "2" = Given only)
                  if (printType === "2") {
                    return vaccinesToPrint.filter(
                      (data) => !!data?.tvp_given_date
                    );
                  }
                  return vaccinesToPrint;
                })()}
                patientDetails={patientDetails}
                profile={profile}
              />
            </div>
          </div>
        )}
        {showDob && (
          <AddDOB
            show={showDob}
            setShowDob={setShowDob}
            patientDetails={vaccinePatientDetails}
            handleDrawerVaccination={handleDrawerVaccination}
            getVaccineDetails={getVaccineDetails}
            setLoading={setLoading}
          />
        )}
      </div>
      {tabLoader && <FullPageLoader />}
    </CashManagerContext.Provider>
  );
}
export default React.memo(Vaccination);
