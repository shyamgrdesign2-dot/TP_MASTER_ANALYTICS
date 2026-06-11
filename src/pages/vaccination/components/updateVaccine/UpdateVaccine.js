/* eslint-disable react-hooks/exhaustive-deps */
import {
  Modal,
  Radio,
  DatePicker,
  Select,
  Button,
  Input,
  Row,
  Col,
  Flex,
  Divider,
  Space,
  message,
} from "antd";
import { useEffect, useState, memo, useRef, useMemo } from "react";
import "./updateVaccine.scss";
import moment from "moment";
import SuccessPopup from "../SuccessPopup.js";
import { updateDueDate, updateVaccine, fetchFrequentlyUsedVaccines } from "../../service.js";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import { errorMessage, getClinicName, trackEvent } from "../../../../utils/utils.js";
import {
  addDueVaccines,
  addGivenVaccines,
} from "../../../../redux/vaccineSlice.js";
import { useDispatch, useSelector } from "react-redux";
import {
  isVaccineModifiedRecently,
  normalizeVaccineName,
  getVaccineNameVariants,
} from "../../VaccinationHelper.js";
import CommonModal from "../../../../common/CommonModal.js";

import { MESSAGE_KEY } from "../../../../utils/constants.js";
import { getDecodedToken } from "../../../../utils/localStorage.js";
import { ASSETS } from "../../../../assets";
const {
  alerticon: alertIcon,
  endVisit: successIcon,
  closeVisit: closeIcon,
} = ASSETS.images;

const vaccineSites = [
  { label: "Left Arm", value: "Left Arm" },
  { label: "Right Arm", value: "Right Arm" },
  { label: "Left Thigh", value: "Left Thigh" },
  { label: "Right Thigh", value: "Right Thigh" },
];

const otherVaccineSites = [
  { label: "Intramuscular", value: "Intramuscular" },
  { label: "Subcutaneous", value: "Subcutaneous" },
  { label: "Oral", value: "Oral" },
  { label: "Intranasal", value: "Intranasal" },
  { label: "Intradermal", value: "Intradermal" },
  { label: "Others", value: "Others" },
];

const UpdateVaccine = ({
  show,
  setShow,
  brands,
  selectedVaccines,
  patientDetails,
  getVaccineDetails,
  setSelectedCards,
  setSelectAll,
  setCardClicked,
  setLoading,
  source,
  onVaccinationUpdated,
}) => {
  const dispatch = useDispatch();
  const { TextArea } = Input;
  const [changeDate, setChangeDate] = useState(false);
  const [givenDate, setGivenDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedDate, setSelectedDate] = useState("given");
  const [dayFromToday, setDayFromToday] = useState();
  const [dueDateNote, setDueDateNote] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDefaultPopup, setShowDefaultPopup] = useState(null);
  const dayFromTodayList = [
    { label: "Tomorrow", value: 1 },
    { label: "1 week", value: 7 },
    { label: "2 weeks", value: 14 },
    { label: "1 month", value: 30 },
    { label: "2 months", value: 60 },
    { label: "3 months", value: 90 },
    { label: "6 months", value: 180 },
    { label: "12 months", value: 365 },
    { label: "2 years", value: 730 },
    { label: "3 years", value: 1095 },
    { label: "5 years", value: 1825 },
    { label: "10 years", value: 3650 },

  ];
  const initialVaccineDetails = useMemo(
    () =>
      (selectedVaccines || [])?.reduce((acc, item) => {
        if (item?.tvac_name) {
          acc[item?.tvac_name] = undefined;
        }
        return acc;
      }, {}),
    [selectedVaccines] // dependency array
  );

  const [vaccineDetails, setVaccineDetails] = useState(initialVaccineDetails);
  const [vaccineOptions, setVaccineOptions] = useState([]);
  const [updateLoader, setUpdateLoader] = useState(false);
  const [focusedIndexes, setFocusedIndexes] = useState([]);
  const [isOpen, setIsOpen] = useState(
    Array(selectedVaccines?.length).fill(false)
  );
  const [frequentlyUsedBrands, setFrequentlyUsedBrands] = useState({});
  const [isTyping, setIsTyping] = useState({});
  const selectRefs = useRef([]);
  const { state } = useLocation();
  const { patient_data } = state;
  const formRef = useRef(null);
  const { profile, userId } = useSelector((state) => state.doctors);
  const isGivenVaccineModifiedRecently = isVaccineModifiedRecently(
    selectedVaccines?.[0]?.tvp_modify_date ||
      selectedVaccines?.[0]?.tvp_create_date
  );
  const decodedToken = getDecodedToken();
  const hospital_bid = decodedToken?.result?.hospital_business_id;

  const handleDropdownVisibleChange = async (index, isFocused = false) => {
    setIsOpen((prev) => {
      const newState = [...prev];
      newState[index] = isFocused;
      return newState;
    });
    if (isFocused) {
      const vaccine = selectedVaccines?.[index];
      const vaccineName = vaccine?.tvac_name;
      if (vaccineName && !frequentlyUsedBrands[vaccineName]) {
        setIsTyping((prev) => ({ ...prev, [index]: false }));
        try {
          const frequentBrands = await fetchFrequentlyUsedVaccines(
            userId,
            vaccineName
          );
          if (frequentBrands && frequentBrands.length > 0) {
            const formattedFrequentBrands = frequentBrands.map((brand) => ({
              label: brand?.brand_name,
              value: brand?.tvc_id,
            }));
            setFrequentlyUsedBrands((prev) => ({
              ...prev,
              [vaccineName]: formattedFrequentBrands,
            }));
          }
        } catch (error) {
          console.error("Error fetching frequently used vaccines:", error);
        }
      } else if (vaccineName) {
        setIsTyping((prev) => ({ ...prev, [index]: false }));
      }
    } else {
      setIsTyping((prev) => ({ ...prev, [index]: false }));
    }
  };

  const scrollToIndex = (index) => {
    const element = selectRefs.current[index];
    if (element) {
      element?.scrollTo({ behavior: "smooth", block: "center" });
      element?.focus();
      handleDropdownVisibleChange(index, true);
    }
  };

  useEffect(() => {
    setGivenDate(
      selectedVaccines?.[0]?.tvp_given_date ?? moment().format("YYYY-MM-DD")
    );
    if (selectedVaccines?.[0]?.tvd_due_date) {
      setDueDate(
        moment(selectedVaccines?.[0]?.tvd_due_date).format("YYYY-MM-DD")
      );
    } else if (selectedVaccines?.[0]?.dueDate) {
      setDueDate(
        moment(selectedVaccines?.[0]?.dueDate, "D MMMM YYYY").format(
          "YYYY-MM-DD"
        )
      );
    }

    const options = selectedVaccines.reduce((acc, vaccine) => {
      if (!vaccine?.tvac_name) {
        acc[vaccine?.tvac_name] = [];
        return acc;
      }

      const normalizedVaccineName = normalizeVaccineName(vaccine.tvac_name);
      const vaccineNameVariants = getVaccineNameVariants(vaccine.tvac_name);
      
      const filteredBrands = brands?.filter((brand) => {
        if (!brand?.tvc_default_vac) return false;
        
        const brandDefaultVac = brand.tvc_default_vac.trim();
        const normalizedBrandVac = normalizeVaccineName(brandDefaultVac);
        const brandVariants = getVaccineNameVariants(brandDefaultVac);
        
        const exactMatch = vaccineNameVariants.some(
          (variant) => brandDefaultVac.toLowerCase() === variant.toLowerCase()
        );
        
        const normalizedMatch = normalizedBrandVac.toLowerCase() === normalizedVaccineName.toLowerCase();
        
        const crossVariantMatch = vaccineNameVariants.some((vaccineVariant) =>
          brandVariants.some((brandVariant) =>
            vaccineVariant.toLowerCase() === brandVariant.toLowerCase()
          )
        );
        
        const crossNormalizedMatch = vaccineNameVariants.some(
          (variant) => normalizedBrandVac.toLowerCase() === normalizeVaccineName(variant).toLowerCase()
        );
        
        return exactMatch || normalizedMatch || crossVariantMatch || crossNormalizedMatch;
      }) || [];

      const uniqueBrandsMap = new Map();
      
      filteredBrands.forEach((brand) => {
        const brandName = brand?.tvc_name?.trim();
        if (brandName && !uniqueBrandsMap.has(brandName)) {
          uniqueBrandsMap.set(brandName, {
            label: brandName,
            value: brand?.tvc_id,
          });
        }
      });

      acc[vaccine.tvac_name] = Array.from(uniqueBrandsMap.values());

      return acc;
    }, {});

    setVaccineOptions(options);
  }, []);

  const trackUpdateEvent = () => {
    const clinic_name = getClinicName(profile?.hospital_data);
    const attributes = {
      clinic_name,
      doctor_id: profile?.doctor_unique_id,
      patient_number: patient_data?.pm_contact_no,
      patient_id: patient_data?.patient_unique_id,
    };
    window.Moengage.track_event("TP_vaccination_updated", attributes);
  };

  const updateVaccineDetails = async () => {
    setCardClicked(false);
    const newFocusedIndexes = [];
    selectRefs.current.forEach((ref, index) => {
      if (
        !vaccineDetails?.[selectedVaccines?.[index]?.tvac_name]
          ?.vaccine_company_id &&
        !selectedVaccines?.[index]?.brandId
      ) {
        if (ref) {
          ref?.focus();
        }
        newFocusedIndexes.push(index);
      }
    });

    if (newFocusedIndexes?.length) {
      scrollToIndex(newFocusedIndexes[0]);
      setFocusedIndexes(newFocusedIndexes);
      return;
    }
    setUpdateLoader(true);

    const updatePromises = selectedVaccines.map(async (vaccine) => {
      const payload = {
        patient_pid: patientDetails?.vac_pid || patient_data?.pm_pid,
        patient_uid: patientDetails?.patient_unique_id || patient_data?.pm_id,
        hospital_bid:
          patientDetails?.hm_business_id ||
          patient_data?.hm_business_id ||
          hospital_bid,
        hospital_id: patientDetails?.hm_id || patient_data?.hm_id,
        vaccine_template_id: vaccine?.tvt_id,
        vaccine_name: vaccine?.tvac_name,
        vaccine_company_id:
          vaccineDetails[vaccine?.tvac_name]?.vaccine_company_id ||
          vaccine?.brandId,
        vaccine_given_date: givenDate,
        remarks:
          vaccineDetails[vaccine?.tvac_name]?.remarks &&
          vaccineDetails[vaccine?.tvac_name]?.remarks !== vaccine?.tvp_remarks
            ? vaccineDetails[vaccine?.tvac_name]?.remarks
            : vaccine?.tvp_remarks || "",
        vaccine_site:
          vaccineDetails[vaccine?.tvac_name]?.vaccine_site ||
          vaccine?.tvpv_site ||
          "",
      };

      const result = updateVaccine(payload);
      const resultStatus = await result;
      if (resultStatus?.status === 201) {
        trackUpdateEvent();
        dispatch(addGivenVaccines({ payload, vaccine }));
      }
      return result;
    });

    try {
      const updateVaccineRes = await Promise.all(updatePromises);
      setLoading(true);
      setUpdateLoader(false);
      if (updateVaccineRes?.every((res) => res?.status === 201)) {
        setShowSuccess(true);
        getVaccineDetails(true);
        if (onVaccinationUpdated) onVaccinationUpdated();
        setTimeout(() => {
          setShow(false);
          setSelectedCards([]);
          setSelectAll(false);
        }, 1000);
        trackEvent("TP_Vac_Update_Given", {
          patientName: patient_data?.pm_fullname || "",
          patientId: patient_data?.patient_unique_id || "",
          doctorSpeciality: profile?.dp_name,
          doctorId: profile?.doctor_unique_id,
          doctorContact: profile?.um_contact,
          doctorName: profile?.um_name,
          source: source,
          Type: selectedVaccines?.[0]?.isOtherVaccines ? "Other Vaccines" : "IAP Vaccines",
          vaccineCompanyId: selectedVaccines?.map((vaccine) => vaccineDetails?.[vaccine?.tvac_name]?.vaccine_company_id)?.join(","),
        });
      } else {
        errorMessage({ name: "TypeError" });
      }
    } catch (error) {
      // Handle errors here
      errorMessage({ name: "TypeError" });
      console.error("Error updating vaccines:", error);
      setUpdateLoader(false); // Set loader state accordingly
    }
  };

  const closeHandler = () => {
    setCardClicked(false);
    setSelectedCards([]);
    setSelectAll(false);
    setChangeDate(false);
    setShow(false);
  };

  const handleDetails = (vaccineName, detail, value, option, index) => {
    setVaccineDetails((prev) => {
      const updatedDetails = { ...prev };

      // Update the selected vaccine's detail
      updatedDetails[vaccineName] = {
        ...(updatedDetails[vaccineName] || {}),
        [detail]: value,
        ...(detail === "vaccine_company_id" && { brandName: option?.label }),
        ...(detail === "vaccine_site" &&
          !updatedDetails[vaccineName]?.siteManuallyUpdated && {
            siteManuallyUpdated: true,
          }),
      };

      // If `vaccine_site` is being updated, propagate the change for the first time only
      if (detail === "vaccine_site") {
        const selectedBrandName = updatedDetails[vaccineName]?.brandName;

        // Update `vaccine_site` for other vaccines with the same `brandName` if not manually updated
        for (const key in updatedDetails) {
          if (
            key !== vaccineName &&
            updatedDetails[key]?.brandName === selectedBrandName &&
            !updatedDetails[key]?.siteManuallyUpdated // Propagate only if not manually updated
          ) {
            updatedDetails[key] = {
              ...(updatedDetails[key] || {}),
              [detail]: value, // Assign the same `vaccine_site` value
              siteManuallyUpdated: true,
            };
          }
        }
      }

      // Check other vaccines with undefined values
      for (const key in updatedDetails) {
        if (key !== vaccineName && updatedDetails[key] === undefined) {
          // Check if the selected value matches any other vaccine brand
          const hasMatchingBrand = vaccineOptions?.[key]?.find(
            (item) => item?.label === option?.label
          );

          // If a matching brand is found, assign the value to the current vaccine
          if (hasMatchingBrand) {
            updatedDetails[key] = {
              ...(updatedDetails[key] || {}),
              [detail]: hasMatchingBrand?.value,
              brandName: hasMatchingBrand?.label,
            };
          }
        }
      }

      return updatedDetails;
    });

    // Close dropdown after selection
    handleDropdownVisibleChange(index, false);
  };

  const updateVaccineDueDate = async () => {
    setUpdateLoader(true);
    setCardClicked(false);
    const updatePromises = selectedVaccines.map(async (vaccine) => {
      const payload = {
        patient_pid: patientDetails?.vac_pid,
        patient_uid: patientDetails?.patient_unique_id,
        vaccine_template_id: vaccine?.tvt_id,
        overriden_due_date: dueDate,
        remarks: dueDateNote,
      };
      const result = updateDueDate(payload);
      const resultStatus = await result;
      if (resultStatus?.status === 200) {
        trackUpdateEvent();
        dispatch(addDueVaccines({ payload, vaccine }));
      }
      return result;
    });

    // Wait for all API calls to finish
    try {
      const updateDueDateRes = await Promise.all(updatePromises);
      setUpdateLoader(false);
      setLoading(true);
      if (updateDueDateRes?.every((res) => res?.status === 200)) {
        setShowSuccess(true);
        getVaccineDetails(true);
        if (onVaccinationUpdated) onVaccinationUpdated();
        setTimeout(() => {
          setShow(false);
          setSelectedCards([]);
          setSelectAll(false);
        }, 1000);
        trackEvent("TP_Vac_DueDate", {
          patientName: patient_data?.pm_fullname || "",
          patientId: patient_data?.patient_unique_id || "",
          doctorSpeciality: profile?.dp_name,
          doctorId: profile?.doctor_unique_id,
          doctorContact: profile?.um_contact,
          doctorName: profile?.um_name,
          source: source,
          Type: selectedVaccines?.[0]?.isOtherVaccines
            ? "Other Vaccines"
            : "IAP Vaccines",
        });
      } else {
        errorMessage({ name: "TypeError" });
      }
    } catch (error) {
      // Handle errors here
      errorMessage({ name: "TypeError" });
      console.error("Error updating vaccines:", error);
      setUpdateLoader(false); // Set loader state accordingly
    }
  };

  const disabledDate = (current) => {
    return selectedDate === "given"
      ? current && current > moment().endOf("day")
      : current && current < moment().startOf("day");
  };

  const handleDefaultClick = async () => {
    const vaccine = selectedVaccines[showDefaultPopup];
    const payload = {
      patient_pid: patientDetails?.vac_pid || patient_data?.pm_pid,
      patient_uid: patientDetails?.patient_unique_id || patient_data?.pm_id,
      hospital_bid:
        patientDetails?.hm_business_id ||
        patient_data?.hm_business_id ||
        hospital_bid,
      hospital_id: patientDetails?.hm_id || patient_data?.hm_id,
      vaccine_template_id: vaccine?.tvt_id,
      vaccine_name: vaccine?.tvac_name,
      vaccine_company_id: "",
      vaccine_given_date: "",
      remarks: "",
      vaccine_site: "",
    };

    const result = updateVaccine(payload);
    const resultStatus = await result;
    if (resultStatus?.status === 201) {
      window.Moengage.track_event("TP_Vaccination_Revert_Confirmed", {
        Doctor_specialty: profile?.dp_name,
        Doctor_unique_id: profile?.doctor_unique_id,
        Doctor_Name: profile?.um_name,
        Doctor_mobile_No: profile?.um_contact,
        Doctor_um_id: userId,
        Time_Stamp: moment().format("YYYY-MM-DD HH:mm:ss"),
      });
      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={successIcon} className="me-3" alt="Success" />
            <div>
              <div className="title-common text-start fontroboto">
                {`${vaccine?.tvac_name} Reverted successfully`}
              </div>
            </div>
            <img
              src={closeIcon}
              className="ms-3 cursor-pointer"
              onClick={() => message.destroy(MESSAGE_KEY)}
              alt="Close"
            />
          </div>
        ),
        duration: 5,
      });
      setSelectedCards((prevItems) =>
        prevItems.filter((_, index) => index !== showDefaultPopup)
      );
      selectRefs.current = selectRefs?.current?.filter(
        (_, index) => index !== showDefaultPopup
      );
      if (selectedVaccines?.length === 1) {
        getVaccineDetails(true);
        if (onVaccinationUpdated) onVaccinationUpdated();
        setShow(false);
      }
      setShowDefaultPopup(null);
      trackUpdateEvent();
    }
    return result;
  };

  return (
    <Modal
      title={
        <div>
          <div>Update Details</div>
          <hr style={{ borderTop: "1px solid #ccc", margin: "10px 0" }} />
        </div>
      }
      centered
      open={show}
      width={936}
      footer={null}
      onCancel={closeHandler}
    >
      <Row gutter={[16, 16]} style={{ height: "655px", marginTop: "20px" }}>
        <Col
          span={12}
          className="d-flex flex-column gap-3"
          style={{ width: "414px" }}
        >
          <label>Add Date</label>
          <div>
            <div
              className={`d-flex justify-content-between align-items-center p-2 border rounded-top border-purple ${
                selectedDate === "given"
                  ? "border-primary bg-custom-purple"
                  : ""
              }`}
              onClick={() => {
                !givenDate && setChangeDate(true);
              }}
              style={{ height: "86px" }}
            >
              <Radio
                checked={selectedDate === "given"}
                onClick={() => setSelectedDate("given")}
              >
                Given Date
                <div style={{ opacity: 0.5 }}>
                  {selectedDate === "given" && givenDate
                    ? moment(givenDate).format("D MMMM YYYY")
                    : "Date the vaccination is given"}
                </div>
              </Radio>
              {selectedDate === "given" && givenDate && !changeDate && (
                <Button type="link" onClick={() => setChangeDate(!changeDate)}>
                  Change
                </Button>
              )}
            </div>
            <div
              className={`d-flex justify-content-between align-items-center p-2 border rounded-bottom ${
                selectedDate === "due" ? "border-primary bg-custom-purple" : ""
              }`}
              onClick={() => {
                !dueDate && setChangeDate(true);
              }}
              style={{ height: "86px" }}
            >
              <Radio
                checked={selectedDate === "due"}
                onClick={() => setSelectedDate("due")}
                disabled={!isGivenVaccineModifiedRecently}
              >
                Due Date
                <div style={{ opacity: 0.5 }}>
                  {selectedDate === "due" && dueDate
                    ? moment(dueDate).format("D MMMM YYYY")
                    : "Date on which vaccination will be given"}
                </div>
              </Radio>
              {selectedDate === "due" && dueDate && !changeDate && (
                <Button
                  type="link"
                  style={{ color: "#4B4AD5" }}
                  onClick={() => setChangeDate(!changeDate)}
                >
                  Change
                </Button>
              )}
            </div>
            {!isGivenVaccineModifiedRecently ? (
              <div className="pt-2">
                Note: The <b style={{ fontWeight: 600 }}>'Due'</b> option is
                disabled as 24 hours have passed since the vaccine was marked as{" "}
                <b style={{ fontWeight: 600 }}>'Given'</b>. This change is now
                permanent
              </div>
            ) : null}
          </div>
          {changeDate && (
            <div className="d-flex">
              <DatePicker
                picker="date"
                open={changeDate}
                placeholder="Select Date"
                placement="bottom"
                suffixIcon={<div></div>}
                bordered={false}
                onChange={(_, d) => {
                  if (selectedDate === "given") {
                    setGivenDate(d);
                  } else setDueDate(d);
                  setChangeDate(false);
                }}
                value={
                  selectedDate === "given" && givenDate
                    ? dayjs(givenDate, "YYYY-MM-DD")
                    : selectedDate === "due" && dueDate
                    ? dayjs(dueDate, "YYYY-MM-DD")
                    : ""
                }
                format="YYYY-MM-DD"
                style={{ border: "none" }}
                dropdownClassName="custom-picker-dropdown"
                disabledDate={disabledDate}
              />
            </div>
          )}
        </Col>
        <Divider
          type="vertical"
          style={{ height: "100%", marginLeft: "20px", marginRight: "15px" }}
        />
        <Col span={11} style={{ width: "414px" }}>
          <div
            ref={formRef}
            className="d-flex flex-column gap-3"
            style={{
              maxHeight: "650px",
              overflowY: "auto",
              scrollbarWidth: "none",
            }}
          >
            {selectedDate === "given" ? (
              <>
                {selectedVaccines?.map((vaccine, i) => {
                  const regularOptions = vaccineOptions?.[vaccine?.tvac_name] || [];
                  const frequentOptions = frequentlyUsedBrands?.[vaccine?.tvac_name] || [];
                  const selectedBrand = vaccineDetails?.[vaccine?.tvac_name]
                    ?.vaccine_company_id
                    ? [...regularOptions, ...frequentOptions]?.find(
                        (item) =>
                          item.value ===
                          vaccineDetails?.[vaccine?.tvac_name]
                            ?.vaccine_company_id
                      )?.label
                    : undefined;
                  const isUserTyping = isTyping[i];
                  
                  // Remove frequentOptions from regularOptions to avoid duplicates
                  const frequentValues = new Set(frequentOptions.map(opt => opt.label));
                  const filteredRegularOptions = regularOptions.filter(
                    opt => !frequentValues.has(opt.label)
                  );
                  // Options for the Select component - only regular options when showing custom dropdown
                  const selectOptions = (() => {
                    if (isUserTyping) {
                      return regularOptions; // Show all options when typing
                    }
                    // When we have frequent options, we'll show them separately in dropdownRender
                    // So only pass filtered regular options (without frequent ones) to Select
                    if (frequentOptions?.length > 0) {
                      return filteredRegularOptions;
                    }
                    return regularOptions;
                  })();
                  
                  // Custom dropdown render with sticky header
                  const customDropdownRender = (menu) => {
                    if (isUserTyping || frequentOptions?.length === 0) {
                      return menu;
                    }
                    
                    return (
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <div
                          style={{
                            backgroundColor: '#f5f5f5',
                            padding: '8px 12px',
                            fontWeight: 600,
                            fontSize: '12px',
                            color: '#666',
                            borderBottom: '1px solid #e8e8e8',
                            margin: 0
                          }}
                        >
                          FREQUENTLY USED
                        </div>
                        {frequentOptions.map((option) => {
                          const isSelected = selectedBrand === option.label || selectedBrand === option.value;
                          return (
                            <div
                              key={option.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDetails(
                                  vaccine?.tvac_name,
                                  "vaccine_company_id",
                                  option.value,
                                  option,
                                  i
                                );
                                setIsOpen((prev) => {
                                  const newState = [...prev];
                                  newState[i] = false;
                                  return newState;
                                });
                              }}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? '#e6f7ff' : 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              {option.label}
                            </div>
                          );
                        })}
                        <div
                          style={{
                            height: '1px',
                            backgroundColor: '#e8e8e8',
                            margin: '8px 0'
                          }}
                        />
                        {menu}
                      </div>
                    );
                  };
                  return (
                    <>
                      <div className="d-flex justify-content-between">
                        <label>
                          {vaccine?.tvac_name}
                          <div style={{ opacity: 0.5 }}>{`(Selected vaccine ${
                            i + 1
                          })`}</div>
                        </label>
                        {isGivenVaccineModifiedRecently &&
                          (selectedVaccines?.[0]?.tvp_modify_date ||
                            selectedVaccines?.[0]?.tvp_create_date) && (
                            <div
                              className="cursor-pointer d-flex main-color"
                              onClick={() => {
                                setShowDefaultPopup(i);
                                window.Moengage.track_event(
                                  "TP_Vaccination_Revert",
                                  {
                                    Doctor_specialty: profile?.dp_name,
                                    Doctor_unique_id: profile?.doctor_unique_id,
                                    Doctor_Name: profile?.um_name,
                                    Doctor_mobile_No: profile?.um_contact,
                                    Doctor_um_id: userId,
                                    Time_Stamp: moment().format(
                                      "YYYY-MM-DD HH:mm:ss"
                                    ),
                                  }
                                );
                              }}
                            >
                              <span className="icon-reload me-1 main-color" />
                              Revert Given Status
                            </div>
                          )}
                      </div>
                      <Select
                        showSearch
                        placeholder="Select vaccine brand"
                        className="custom-select-style"
                        optionFilterProp="children"
                        value={selectedBrand}
                        defaultActiveFirstOption={false}
                        filterOption={(input, option) =>
                          (option?.label ?? "")
                            ?.toLowerCase()
                            .includes(input?.toLowerCase())
                        }
                        filterSort={!isUserTyping ? undefined : (optionA, optionB) =>
                          (optionA?.label ?? "")
                            .toLowerCase()
                            .localeCompare((optionB?.label ?? "").toLowerCase())
                        }
                        options={selectOptions}
                        dropdownRender={customDropdownRender}
                        onSearch={(value) => {
                          if (value && value.trim().length > 0) {
                            setIsTyping((prev) => ({ ...prev, [i]: true }));
                          } else {
                            setIsTyping((prev) => ({ ...prev, [i]: false }));
                          }
                        }}
                        onChange={(value, option) => {
                          handleDetails(
                            vaccine?.tvac_name,
                            "vaccine_company_id",
                            value,
                            option,
                            i
                          );
                        }}
                        defaultValue={vaccine?.brandName || vaccine?.brandId}
                        ref={(ref) => {
                          if (ref) selectRefs.current[i] = ref;
                        }}
                        open={isOpen[i]}
                        onDropdownVisibleChange={(open) =>
                          handleDropdownVisibleChange(i, open)
                        }
                        style={{
                          border: focusedIndexes.includes(i)
                            ? "1px solid blue"
                            : "none",
                          borderRadius: focusedIndexes.includes(i)
                            ? "10px"
                            : "none",
                        }}
                      />
                      {(vaccineDetails?.[vaccine?.tvac_name]
                        ?.vaccine_company_id ||
                        vaccine?.brandId ||
                        vaccine?.tvpv_site) && (
                        <>
                          <label>Site</label>
                          <Select
                            showSearch
                            placeholder="Select vaccine site"
                            className="custom-select-style"
                            optionFilterProp="children"
                            value={
                              vaccineDetails?.[vaccine?.tvac_name]
                                ?.vaccine_site ||
                              vaccine?.tvpv_site ||
                              undefined
                            }
                            options={vaccine?.isOtherVaccines ? otherVaccineSites : vaccineSites}
                            defaultValue={vaccine?.tvpv_site || undefined}
                            onChange={(value) =>
                              handleDetails(
                                vaccine?.tvac_name,
                                "vaccine_site",
                                value
                              )
                            }
                          />
                        </>
                      )}
                      <label>Note</label>
                      <TextArea
                        onChange={(e) =>
                          handleDetails(
                            vaccine?.tvac_name,
                            "remarks",
                            e.target.value
                          )
                        }
                        placeholder="Add additional details"
                        autoSize={{ minRows: 3, maxRows: 5 }}
                        width={200}
                        defaultValue={vaccine?.tvp_remarks ?? ""}
                      />
                      <Divider dashed style={{ width: "100%" }} />
                    </>
                  );
                })}
              </>
            ) : (
              <>
                <label>Day from today</label>
                <Flex
                  vertical
                  style={{
                    width: "100%",
                  }}
                >
                  <Radio.Group
                    onChange={({ target: { value } }) => {
                      setDayFromToday(value);
                      const newDueDate = moment()
                        .add(value, "days")
                        .format("YYYY-MM-DD");
                      setDueDate(newDueDate);
                    }}
                    value={dayFromToday}
                  >
                    <Space direction="vertical">
                      {dayFromTodayList.map(({ label, value }) => (
                        <Radio value={value} key={value}>
                          {label}
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                </Flex>

                <label>Note</label>
                <TextArea
                  value={dueDateNote}
                  onChange={({ target: { value } }) => {
                    setDueDateNote(value);
                  }}
                  placeholder="Add additional details"
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  width={200}
                />
              </>
            )}
            <div className="d-flex justify-content-end">
              <Button
                style={{
                  height: "41px",
                }}
                disabled={false}
                type="primary"
                onClick={() => {
                  if (selectedDate === "given") updateVaccineDetails();
                  else updateVaccineDueDate();
                }}
                loading={updateLoader}
              >
                Update Vaccine
              </Button>
            </div>
          </div>
        </Col>
      </Row>
      <SuccessPopup show={showSuccess} setShow={setShowSuccess} />
      <CommonModal
        isModalOpen={showDefaultPopup !== null}
        onCancel={() => setShowDefaultPopup(null)}
        modalWidth={500}
        title={"Confirm Revert Action"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to revert the vaccination status <br />
                  back to <b>'Default'</b>? Once reverted, you will need to
                  <br /> manually update the status again if needed.
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => setShowDefaultPopup(null)}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  Cancel
                </div>
                <Button
                  onClick={handleDefaultClick}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
                  <span>Yes, Revert</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    </Modal>
  );
};

export default memo(UpdateVaccine);
