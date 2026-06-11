import React, { useState, useEffect, useCallback, useMemo } from "react";
import Button from "react-bootstrap/Button";
import { useNavigate, useLocation } from "react-router-dom";
import { Drawer, message, Spin, Tooltip, Popover } from "antd";

import ConfirmAppointment from "./components/ConfirmAppointment";
import { addAppointment, getSlotsList, getTeleconsultSlotsList, bookTeleconsult } from "./service";
import ApiTeleconsult from "../../api/services/ApiTeleconsult";
import { errorMessage, getTokenData, getClinicName, sendMessageToParent } from "../../utils/utils";
import Form from "react-bootstrap/Form";
import { DatePicker, Tabs, Select } from "antd";

import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import dayjs from "dayjs";
import "./addAppointment.scss";
import { listDoctor } from "../../redux/bulkMessagesSlice";
import { getDecodedToken, useLocalStorage } from "../../utils/localStorage";

import { InfoCircleOutlined } from "@ant-design/icons";
import { jwtDecode } from "jwt-decode";
import {
  MESSAGE_KEY,
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  GB_TELE_CONSULT,
} from "../../utils/constants";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import { isChrome, isSafari } from "react-device-detect";
import config from "../../config";
import axios from "axios";
import { upsertDoctorSettingFlag } from "../../redux/doctorsSlice";
import { getCaseTypes, listCategories } from "../../redux/appointmentsSlice";

import VideoModal from "../../common/VideoModal";
import { EVENTS } from "../../utils/events";
import { ASSETS } from "../../assets";
const {
  tutorialIcon: tutorial,
  greenRoundedCheck: greenRightIcon,
  clock: clockIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
  profileCircle,
  cvtInfo: cvtInfoIcon,
  hospital: hospitalSvg,
  hospitalWhite: hospitalWhiteSvg,
  video: videoSvg,
  videoWhite: videoWhiteSvg,
  tubeIcon: playIcons,
} = ASSETS.images;

const TIME_SECTIONS_CONFIG = [
  { key: 'MIDNIGHT', label: 'Midnight', timeRange: '12AM - 3AM' },
  { key: 'EARLY_MORNING', label: 'Early Morning', timeRange: '3AM - 5AM' },
  { key: 'MORNING', label: 'Morning', timeRange: '5AM - 12PM' },
  { key: 'AFTERNOON', label: 'Afternoon', timeRange: '12PM - 5PM' },
  { key: 'EVENING', label: 'Evening', timeRange: '5PM - 9PM' },
  { key: 'NIGHT', label: 'Night', timeRange: '9PM - 12AM' },
];

const getTimeSection = (time) => {
  const hour = dayjs(time, "HH:mm:ss").hour();

  if (hour >= 0 && hour < 3) return "MIDNIGHT";
  if (hour >= 3 && hour < 5) return "EARLY_MORNING";
  if (hour >= 5 && hour < 12) return "MORNING";
  if (hour >= 12 && hour < 17) return "AFTERNOON";
  if (hour >= 17 && hour < 21) return "EVENING";
  if (hour >= 21 && hour <= 23) return "NIGHT";

  return "MORNING"; // default fallback
};

const generateTimeSlots = (slotsData) => {
  let allTimeSlots = {
    MIDNIGHT: [],
    EARLY_MORNING: [],
    MORNING: [],
    AFTERNOON: [],
    EVENING: [],
    NIGHT: [],
  };

  slotsData.forEach((slot) => {
    // Just add type property to distinguish in UI
    const timeSlot = {
      ...slot,
    };

    // Add the slot to appropriate section
    const section = getTimeSection(slot.start);
    allTimeSlots[section].push(timeSlot);
  });

  // Sort slots within each section
  Object.keys(allTimeSlots).forEach((section) => {
    allTimeSlots[section].sort((a, b) => {
      return dayjs(a.start, "HH:mm:ss").diff(dayjs(b.start, "HH:mm:ss"));
    });
  });

  return allTimeSlots;
};

const { TabPane } = Tabs;

const TimeSlotContainer = ({
  slots,
  selectedTimeSlot,
  setSelectedTimeSlot,
  isLoading,
  handleConfirmAppointment,
  editTime,
  isSlotInPast,
  selectedDoctorOption,
  selectedDate
}) => {
  if (isLoading) {
    return (
      <div>
        <Spin
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            zIndex: "9999",
          }}
          size="large"
        />
      </div>
    );
  }

  const renderSlotsCount = (slots) => {
    if (!slots || slots.length === 0) return "No slots available";

    // Count available slots (excluding confirmed and leave slots)
    const availableCount = slots.filter(
      (slot) => slot.status === "available"
    ).length;

    // Get time range
    const firstSlot = slots[0];
    const lastSlot = slots[slots.length - 1];
    const startTime = dayjs(firstSlot.start, "HH:mm:ss").format("hh:mm A");
    const endTime = dayjs(lastSlot.end, "HH:mm:ss").format("hh:mm A");

    return `${availableCount} Slots Available (${startTime} to ${endTime})`;
  };

  const getTooltipContent = (slot) => {
    // First check if slot is in the past
    const isPastSlot = (slot) => {
      const currentDateTime = dayjs();
      const slotDateTime = dayjs(selectedDate)
        .hour(dayjs(slot.start, "HH:mm:ss").hour())
        .minute(dayjs(slot.start, "HH:mm:ss").minute())
        .second(dayjs(slot.start, "HH:mm:ss").second());

      return currentDateTime.isAfter(slotDateTime);
    };

    // If it's a past slot and not confirmed, show the past slot message
    if (isPastSlot(slot) && slot.status !== "confirmed" && slot.status !== "unavailable" && slot.status !== "leave") {
      return (
        <div className="past-slot-tooltip">
          <h4>Past Time Slot</h4>
          <div>
            This time slot has already passed and cannot be booked. Please select an available future slot for today's appointment.
          </div>
        </div>
      );
    }

    // Rest of your existing switch case for other slot statuses
    switch (slot.status) {
      case "confirmed":
        return (
          <div className="appointment-tooltip">
            <h4>Appointment Details({slot.appointments?.length})</h4>
            <div
              className="appointments-scroll"
              style={{
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {slot.appointments?.map((appointment, index) => (
                <div
                  key={index}
                  className="appointment-patient-info d-flex align-items-center gap-2 p-2"
                >
                  <div className="appointment-patient-content align-items-center gap-1 me-2">
                    <i className="icon-profile" />
                    {appointment.pm_full_name.split(" ")[0].length > 10
                      ? `${appointment.pm_full_name
                        .split(" ")[0]
                        .substring(0, 10)}...`
                      : appointment.pm_full_name.split(" ")[0]}{" "}
                    ({appointment.pm_gender.charAt(0)}, {appointment.ageYears}y)
                  </div>
                  <div className="d-flex align-items-center gap-1 me-2">
                    <i className="icon-phone" />
                    {appointment.pm_contact_no}
                  </div>
                  <div className="d-flex align-items-center gap-1 me-2">
                    <img src={clockIcon} alt="Tests" />
                    {`${dayjs(appointment.pam_app_time, "HH:mm:ss").format("hh:mm A")} (${appointment.pam_appointment_duration}min)`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "unavailable":
        return (
          <div className="appointment-tooltip">
            {slot.appointments?.length > 0 ? (
              <h4>Appointment Details({slot.appointments?.length})</h4>
            ) : (
              <h4>No Availability Set</h4>
            )}
            <div
              className="appointments-scroll"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {slot.appointments?.map((appointment, index) => (
                <div
                  key={index}
                  className="appointment-patient-info d-flex align-items-center gap-2 p-2"
                >
                  <div className="appointment-patient-content d-flex align-items-center gap-1 me-2">
                    <i className="icon-profile" />
                    {appointment.pm_full_name.split(" ")[0].length > 10
                      ? `${appointment.pm_full_name
                        .split(" ")[0]
                        .substring(0, 10)}...`
                      : appointment.pm_full_name.split(" ")[0]}{" "}
                    ({appointment.pm_gender.charAt(0)}, {appointment.ageYears}y)
                  </div>
                  <div className="d-flex align-items-center gap-1 me-2">
                    <i className="icon-phone" />
                    {appointment.pm_contact_no}
                  </div>
                  <div className="d-flex align-items-center gap-1 me-2">
                    <img src={clockIcon} alt="Tests" />
                    {dayjs(slot.start, "HH:mm:ss").format("hh:mm A")}
                  </div>
                </div>
              ))}
            </div>
            <div>
              {slot.appointments?.length > 0 ? (
                <div className="mt-2 unavailability-text">
                  <span className="fw-bold">Note:</span> You haven't scheduled
                  any slots during this time. However, a few appointments were
                  booked during this period.
                </div>
              ) : (
                <div className="mt-2 unavailability-text">
                  You haven't scheduled any slots during this time interval.
                  Update your Availability Settings to enable booking in this
                  period.
                </div>
              )}
            </div>
          </div>
        );
      case "leave":
        return (
          <div className="leave-tooltip">
            <div className="leave-tooltip">
              {slot.leave?.remarks ? (
                <>
                  <h4>On Leave</h4>
                  <div>{slot.leave?.remarks}</div>
                </>
              ) : (
                <div className="d-flex align-items-center justify-content-center">
                  On Leave
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="slots-info">{renderSlotsCount(slots)}</div>
      {editTime && (
        <div className="slot-instruction-info">{"Select new time slot"}</div>
      )}
      <div className="slots-container">
        {slots?.map((slot, index) => {
          const isPast = isSlotInPast(slot.start);
          const slotStatus = slot.status;

          const slotContent = (
            <div
              className={`slot ${slotStatus} ${isPast &&
                slotStatus !== "confirmed" &&
                slotStatus !== "unavailable"
                ? "past"
                : ""
                }`}
              onClick={() => {
                if (slot.status === "available" && !isPast) {
                  handleConfirmAppointment();
                  setSelectedTimeSlot(slot);
                }
              }}
            >
              {slot.status === "confirmed" && <img src={greenRightIcon} />}
              <div>
                {slot.status === "unavailable" || slot.status === "leave" ? (
                  <>
                    {dayjs(slot.start, "HH:mm:ss").format("hh:mm A")} -{" "}
                    {dayjs(slot.end, "HH:mm:ss").format("hh:mm A")}
                    <InfoCircleOutlined className="info-icon" />
                  </>
                ) : (
                  dayjs(slot.start, "HH:mm:ss").format("hh:mm A")
                )}
              </div>
            </div>
          );

          return (
            <Tooltip
              key={index}
              title={getTooltipContent(slot)}
              overlayClassName="slot-tooltip"
              placement="top"
            >
              {slotContent}
            </Tooltip>
          );
        })}
      </div>
    </>
  );
};

function AddAppointment() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dateChips, setDateChips] = useState([]);
  const [chipStartDate, setChipStartDate] = useState(dayjs());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const { doctorList } = useSelector((state) => state.bulkMessages);
  const dispatch = useDispatch();
  // const [doctors, setDoctors] = useState(doctorList);
  const [displayMonth, setDisplayMonth] = useState(dayjs());
  const [timeSlots, setTimeSlots] = useState({});
  const [tokenData, setTokenData] = useState(null);
  const { profile } = useSelector((state) => state.doctors);
  const { caseTypes, categoriesList } = useSelector((state) => state.records);
  const [getToken, setToken] = useLocalStorage(
    PERSISTANT_STORAGE_KEY_AUTH_TOKEN
  );
  const decodedToken = getDecodedToken();
  const isAdmin = decodedToken?.result?.admin;
  const [selectedDoctor, setSelectedDoctor] = useState(
    decodedToken?.result?.user_id
  );

  // Add loading state
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [popOverVideo, setPopOverVideo] = useState(false);
  const [videoLink, setVideoLink] = useState(null);
  const { videoList } = useSelector((state) => state.doctors);
  // Add new state for loading
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  const isTeleConsultEnabled = useFeatureIsOn(GB_TELE_CONSULT);
  const [hasVideoSlotsFromApi, setHasVideoSlotsFromApi] = useState(false);
  const [appointmentMode, setAppointmentMode] = useState("in_clinic");

  useEffect(() => {
    let cancelled = false;
    const doctorId = selectedDoctor || getTokenData()?.user_id;
    const hmId = getTokenData()?.clinic_id;
    if (!doctorId || !isTeleConsultEnabled) {
      setHasVideoSlotsFromApi(false);
      return () => {};
    }
    ApiTeleconsult.getHasVideoSlots(doctorId, hmId)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        setHasVideoSlotsFromApi(!!data?.hasVideoSlots);
      })
      .catch(() => {
        if (!cancelled) setHasVideoSlotsFromApi(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isTeleConsultEnabled, selectedDoctor]);

  // Helper function to find the first available section
  const getFirstAvailableSection = (timeSlots) => {
    const sections = ['MIDNIGHT', 'EARLY_MORNING', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];

    for (const section of sections) {
      const sectionSlots = timeSlots[section];
      if (sectionSlots && sectionSlots.length > 0) {
        // Check if section has valid slots (not just unavailable slots without appointments)
        const hasValidSlots = sectionSlots.some(slot =>
          slot.status !== 'unavailable' ||
          (slot.appointments && slot.appointments.length > 0)
        );
        if (hasValidSlots) {
          return section;
        }
      }
    }
    return 'MORNING'; // default fallback
  };

  // Helper function to find the next available section from current time
  const getNextAvailableSection = (timeSlots, currentSection) => {
    const sections = ['MIDNIGHT', 'EARLY_MORNING', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
    const currentIndex = sections.indexOf(currentSection);

    // First check if current section has slots
    if (timeSlots[currentSection]?.length > 0) {
      const hasValidSlots = timeSlots[currentSection].some(slot =>
        slot.status !== 'unavailable' ||
        (slot.appointments && slot.appointments.length > 0)
      );
      if (hasValidSlots) return currentSection;
    }

    // Look for next available section
    for (let i = currentIndex + 1; i < sections.length; i++) {
      const section = sections[i];
      if (timeSlots[section]?.length > 0) {
        const hasValidSlots = timeSlots[section].some(slot =>
          slot.status !== 'unavailable' ||
          (slot.appointments && slot.appointments.length > 0)
        );
        if (hasValidSlots) return section;
      }
    }

    return 'MORNING'; // default fallback
  };

  const getCurrentTimeSection = () => {
    const currentHour = dayjs().hour();

    if (currentHour >= 0 && currentHour < 3) return "MIDNIGHT";
    if (currentHour >= 3 && currentHour < 5) return "EARLY_MORNING";
    if (currentHour >= 5 && currentHour < 12) return "MORNING";
    if (currentHour >= 12 && currentHour < 17) return "AFTERNOON";
    if (currentHour >= 17 && currentHour < 21) return "EVENING";
    if (currentHour >= 21 && currentHour <= 23) return "NIGHT";

    return "MORNING";
  };

  // Initialize active tab based on current time
  const [activeTab, setActiveTab] = useState(getCurrentTimeSection());

  // Function to check if a slot is in the past
  const isSlotInPast = (slotTime) => {
    if (dayjs(selectedDate).isBefore(dayjs(), "day")) return true;
    if (dayjs(selectedDate).isAfter(dayjs(), "day")) return false;

    // For today, compare times
    const currentTime = dayjs();
    const slotDateTime = dayjs(selectedDate)
      .hour(parseInt(slotTime.split(":")[0]))
      .minute(parseInt(slotTime.split(":")[1]));

    return slotDateTime.isBefore(currentTime);
  };

  useEffect(() => {
    // Initialize chips with today's date
    setDateChips(generateDateChips(dayjs()));
  }, []);

  useEffect(() => {
    // Update display month based on whether selected date is in current chip range
    if (dateChips.length > 0) {
      if (isDateInChipRange(selectedDate)) {
        setDisplayMonth(selectedDate);
      } else {
        setDisplayMonth(dateChips[0]); // Show first chip's month
      }
    }
  }, [selectedDate, dateChips]);

  const generateDateChips = (startDate) => {
    const chips = [];
    for (let i = 0; i < 10; i++) {
      chips.push(startDate.add(i, "day"));
    }
    return chips;
  };

  // Add this helper function to check if date exists in chips
  const isDateInChipRange = (date) => {
    if (!dateChips.length) return false;
    const selectedDateStr = dayjs(date).format('YYYY-MM-DD');
    const firstDateStr = dateChips[0].format('YYYY-MM-DD');
    const lastDateStr = dateChips[dateChips.length - 1].format('YYYY-MM-DD');
    return selectedDateStr >= firstDateStr && selectedDateStr <= lastDateStr;
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (!isDateInChipRange(date)) {
      setChipStartDate(date);
      const newChips = generateDateChips(date);
      setDateChips(newChips);
    }
    setDisplayMonth(date);
  };

  const handleNavigateChips = (direction) => {
    const newStartDate =
      direction === "left"
        ? chipStartDate.subtract(10, "day")
        : chipStartDate.add(10, "day");
    setChipStartDate(newStartDate);
    const newChips = generateDateChips(newStartDate);
    setDateChips(newChips);

    // Always update display month to first chip's month if selected date not in range
    if (!isDateInChipRange(selectedDate)) {
      setDisplayMonth(newChips[0]);
    }
  };

  const handleChipClick = (date) => {
    setSelectedDate(date);
    setDisplayMonth(date);
  };

  useEffect(() => {
    dispatch(listDoctor());
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      if (selectedDoctor || (profile?.um_name && selectedDate)) {
        setIsLoadingSlots(true);
        try {
          const token = await getToken();
          const decoded = jwtDecode(token);
          setTokenData(decoded.result);
          const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD");
          const doctorId = selectedDoctor || decoded.result?.user_id;
          const useTeleSlots = isTeleConsultEnabled && appointmentMode === "teleconsult";
          const response = useTeleSlots
            ? await getTeleconsultSlotsList(doctorId, formattedDate)
            : await getSlotsList(doctorId, formattedDate);

          if (response?.status) {
            const generatedSlots = generateTimeSlots(response.slots || []);
            setTimeSlots(generatedSlots);

            if (dayjs(selectedDate).isSame(dayjs(), "day")) {
              const currentSection = getCurrentTimeSection();
              setActiveTab(getNextAvailableSection(generatedSlots, currentSection));
            } else {
              setActiveTab(getFirstAvailableSection(generatedSlots));
            }
          } else {
            errorMessage(response?.message || "Failed to fetch slots");
            setTimeSlots({
              MIDNIGHT: [],
              EARLY_MORNING: [],
              MORNING: [],
              AFTERNOON: [],
              EVENING: [],
              NIGHT: [],
            });
          }
        } catch (error) {
          errorMessage("Error fetching slots");
          console.error("Error fetching slots:", error);
        } finally {
          setIsLoadingSlots(false);
        }
      }
    };

    fetchSlots();
  }, [selectedDoctor, selectedDate, isTeleConsultEnabled, appointmentMode]);

  // Make sure doctorList is properly mapped to doctorOptions
  const doctorOptions = doctorList?.map((doctor) => ({
    value: String(doctor.um_id), // Ensure this matches the type of selectedDoctor
    label: doctor.um_name,
  }));

  // Find the selected doctor's label with additional type checking
  const selectedDoctorOption = doctorOptions?.find(
    (doctor) =>
      doctor?.value === (selectedDoctor ? String(selectedDoctor) : null)
  );

  const handleDoctorChange = (value) => {
    setSelectedDoctor(value);
    setAppointmentMode("in_clinic");
    setSelectedTimeSlot(null);
    setSelectedSlotDetails(null);
    setActiveTab(getCurrentTimeSection()); // Reset tab to current time section
  };

  const { state } = useLocation();
  const { patient_data } = state != null && state;

  const [confirmAppointment, setConfirmAppointment] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [editDoctor, setEditDoctor] = useState(false);
  const [editTime, setEditTime] = useState(false);
  const [clickedPatient, setClickedPatient] = useState(null);
  const [selectedCaseType, setSelectedCaseType] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState(null);
  const [remarks, setRemarks] = useState("");

  // Add a new state to store the complete slot details
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);

  // At the top of your component, add this state
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  useEffect(() => {
    if (state != null) {
      setClickedPatient(state?.patient_data)
      if (state?.appointmentMode) {
        setAppointmentMode(state.appointmentMode);
      }
      setSelectedDoctor(state?.selectedDoctor)
      setSelectedDate(dayjs(state?.selectedDate))
      setSelectedTimeSlot(state?.selectedTimeSlot)
      setSelectedSlotDetails(state?.selectedTimeSlot)
      setSelectedCaseType(state?.selectedCaseType)
      setSelectedCategories(state?.selectedCategories)
      setRemarks(state?.remarks)
      handleConfirmAppointment();
    }
  }, [state]);

  const handleConfirmAppointment = useCallback(
    (flag) => {
      if (flag == "edit_doctor") {
        setEditDoctor(true);
      } else if (flag == "edit_time") {
        setEditTime(true);
      } else {
        setEditTime(false);
      }
      setConfirmAppointment(!confirmAppointment);
    },
    [confirmAppointment, editDoctor, editTime]
  );

  const validation = () => !(clickedPatient && selectedCaseType);

  // Update your time slot selection handler
  const handleTimeSlotSelect = (slot) => {
    setSelectedTimeSlot(slot);
    setSelectedSlotDetails(slot); // Store the complete slot object
  };

  useEffect(() => {
    categoriesList?.length === 0 && dispatch(listCategories())
    caseTypes?.length === 0 && dispatch(getCaseTypes())
  }, []);

  const onBookAppointmentPress = async () => {
    // Prevent multiple clicks
    if (isBookingAppointment) return;
    
    try {
      setIsBookingAppointment(true);
      let sendData = {
        doctor_id: selectedDoctor,
        patient_unique_id: clickedPatient?.patient_unique_id,
        pm_pid: clickedPatient?.pm_pid,
        appointment_date: dayjs(selectedDate).format("YYYY-MM-DD"),
        appointment_start_time: dayjs(
          selectedSlotDetails.start,
          "HH:mm:ss"
        ).format("HH:mm"),
        appointment_end_time: dayjs(selectedSlotDetails.end, "HH:mm:ss").format(
          "HH:mm"
        ),
        appointment_duration: selectedSlotDetails?.availability?.increment || 5,
        toct_id: selectedCaseType,
      };

      // First, add these helper functions to get names from IDs
      const getCaseTypeName = (caseTypeId, caseTypes) => {
        const caseType = caseTypes?.find(type => type.toct_id === Number(caseTypeId));
        return caseType?.toct_type || '';
      };

      const getCategoryName = (categoryId, categoriesList) => {
        const category = categoriesList?.find(cat => cat.pt_id === Number(categoryId));
        return category?.pt_name || '';
      };

      // In your tracking event, use these functions
      window.Moengage.track_event("TP_AddAppointment_bookappointment", {
        "Doctor_specialty": profile?.dp_name,
        "Doctor_unique_id": profile?.doctor_unique_id,
        "Doctor_name": profile?.um_name,
        "Doctor_mobile_No": profile?.um_contact,
        appointment_type: isTeleConsultEnabled && appointmentMode === "teleconsult" ? 1 : 0,
        "Patient_unique_id": clickedPatient?.patient_unique_id,
        "Patient_name": clickedPatient?.pm_first_name,
        "Pm_pid": clickedPatient?.pm_pid,
        "Appointment_date": dayjs(selectedDate).format("YYYY-MM-DD"),
        "Appointment_start_time": dayjs(
          selectedSlotDetails.start,
          "HH:mm:ss"
        ).format("HH:mm"),
        "Appointment_end_time": dayjs(selectedSlotDetails.end, "HH:mm:ss").format(
          "HH:mm"
        ),
        "Case_type": getCaseTypeName(selectedCaseType, caseTypes),
        "Category": getCategoryName(selectedCategories, categoriesList),
      });

      // Only add category_id if selectedCategories exists
      if (selectedCategories) {
        sendData.category_id = selectedCategories;
      }

      // Only add remarks if it exists and is not empty
      if (remarks && remarks.trim()) {
        sendData.appointment_remark = remarks;
      }

      const isTeleBooking = isTeleConsultEnabled && appointmentMode === "teleconsult";
      if (isTeleBooking) {
        sendData = { ...sendData, patient_unique_id: String(sendData.patient_unique_id) };
      }

      const response = isTeleBooking
        ? await bookTeleconsult(sendData)
        : await addAppointment(sendData);
    if (response?.status) {
      // Close the drawer
      setConfirmAppointment(false);

      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={visitEnd} className="me-3" />
            <div>
              <div className="title-common text-start fontroboto">{`${clickedPatient?.pm_first_name}’s appointment booked successfully!`}</div>
            </div>
            <img
              src={imgCloseVisit}
              className="ms-3"
              onClick={() => message.destroy()}
            />
          </div>
        ),
        duration: 5,
      });

        // Reset form states
        setSearchQuery('')
        setSelectedTimeSlot(null);
        setSelectedSlotDetails(null);
        setSelectedCategories(null);
        setSelectedCaseType(null);
        setRemarks("");
        setClickedPatient(null);

        const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD");
        const refreshSlots = isTeleBooking ? getTeleconsultSlotsList : getSlotsList;
        const slotsResponse = await refreshSlots(selectedDoctor, formattedDate);
        if (slotsResponse?.status) {
          const generatedSlots = generateTimeSlots(slotsResponse.slots || []);
          setTimeSlots(generatedSlots);
        }
        navigate(-1);
      } else {
        errorMessage(response?.message);
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      errorMessage('Failed to book appointment');
    } finally {
      setIsBookingAppointment(false);
    }
  };

  async function SSO_TO_PM(flag) {
    try {
      const tokenData = decodedToken?.result;

      var sendData = {
        doctor_unique_id: tokenData.doctor_unique_id,
      };

      var URL;

      if (flag === 1) {
        sendData["mobile_no"] = tokenData.mobile_no;
        sendData["clinic_id"] = tokenData.clinic_id;
        sendData["hm_business_id"] = tokenData.hospital_business_id;
        sendData["from"] = "app";
        URL = config.sso_to_pm_url;
      } else if (flag === 2) {
        sendData["hospital_business_id"] = tokenData.hospital_business_id;
        URL = config.sso_to_pm_admin_url;
      }

      const formData = new FormData();
      Object.keys(sendData).forEach((key) => {
        formData.append(key, sendData[key]);
      });

      const response = await axios.post(URL, formData, {
        auth: {
          username: config.sso_to_pm_username,
          password: config.sso_to_pm_password,
        },
      });

      return response.data;
    } catch (err) {
      console.error(err.message);
    }
  }

  useEffect(() => {
    // Cleanup function to remove event listener when component unmounts
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      window.location.reload();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  const myAvailability = async () => {
    SSO_TO_PM(1).then(async (data) => {
      if (data.success == 200) {
        if (!isChrome && !isSafari) {
          // navigate(`/?url=${data.url}&module=my_availability&key=phpRedirect`, {
          //   replace: true,
          // });
          // navigate(0, { replace: true });
          sendMessageToParent(EVENTS.REDIRECT, {
            url: data?.url,
            module: 'my_availability'
          });
        } else {
          // Add visibility change listener before opening new tab
          document.addEventListener('visibilitychange', handleVisibilityChange);
          await window.open(`${data.url}&module=my_availability`);
        }
      }
    });
  };

  // Update the HandleSettingsDescription function
  const HandleSettingsDescription = () => {
    try {
      dispatch(
        upsertDoctorSettingFlag({ type: "availabilitySettings", status: 1 })
      );
      setShowDisclaimer(false); // Hide the disclaimer strip
    } catch (error) {
      console.error("Error updating settings:", error);
      message.error("Failed to update settings"); // Add error notification
    }
  };

  useEffect(() => {
    if (
      profile?.userSettingFlag?.find((e) => e?.type === "availabilitySettings")
        ?.status === 1
    ) {
      setShowDisclaimer(false);
    }
  }, [profile?.userSettingFlag]);

  //PopOverVideo function
  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo(!popOverVideo);
  }, [popOverVideo]);

  //Video Componet
  const VIDEO_CONTENT = useCallback(() => {
    return (
      <>
        <div className="video-contant rounded-4 p-20 zindex-99999" key="oneclickrx-video">
          <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
            <div className="title-common lh-base">Video Tutorial</div>
            <Button
              className="btn btn-videoClose p-0"
              onClick={showHideVideoListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          {videoList[16]?.video?.slice(0, 1).map((item1, i1) => {
            return (
              <div
                key={i1}
                className={`d-flex ${
                  i1 !== videoList[13]?.video.length - 1 &&
                  "pb-3 mb-15 border-bottom"
                }`}
              >
                <div className="tutorial-play me-14">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoLink(item1);
                      const clinic_name = getClinicName(profile?.hospital_data);
                      window.Moengage.track_event("TP_Tutorial_Viewed", {
                        clinic_name,
                        tutorial_type: videoList[16]?.category,
                      });
                    }}
                  >
                    <img src={playIcons} />
                  </button>
                  <span className="tutorial-thumb">
                    <img src={item1.thumbnail} />
                  </span>
                </div>
                <div>
                  <h3 className="title-common text-welcome">
                    {item1?.tmv_title}
                  </h3>
                  <div className="fs-12 fontroboto fw-normal text-main">
                    {item1?.tmv_description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }, [popOverVideo]);

  return (
    <>
      <div className="welcomesection position-relative">
        <div className="bg-welcome d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <div
              onClick={() => navigate(-1)}
              className="lh-1 me-1 px-2 text-dark cursor-pointer"
            >
              <i className="fs-3 icon-right"></i>
            </div>
            <div>
              <h1>Select an Appointment Slot</h1>
            </div>
          </div>
          <div className="d-flex gap-1">
            <div className="d-lg-flex d-block">
              <Popover
                open={popOverVideo}
                onOpenChange={showHideVideoListPopover}
                content={VIDEO_CONTENT}
                trigger="click"
                overlayClassName="pop-430 pp-0 videoTutorial"
                placement="bottom"
              >
                <button className="btn d-flex align-items-center btn-text mx-3 tutorial p-0">
                  <span className="text-decoration-none rounded-5 pe-3 bg-white shadow2">
                    <img height={42} src={tutorial} />
                    Tutorial
                  </span>
                </button>
              </Popover>
              {videoLink && (
                <VideoModal
                  videoLink={videoLink}
                  onCancel={() => setVideoLink(null)}
                />
              )}

              <Button
                variant="primary"
                onClick={() => {
                  myAvailability();
                  HandleSettingsDescription();
                  window.Moengage.track_event("TP_AddAppointments_AvailabilitySettings", {
                    "Doctor_specialty": profile?.dp_name,
                    "Doctor_unique_id": profile?.doctor_unique_id,
                    "Doctor_Name": profile?.um_name,
                    "Doctor_mobile_No": profile?.um_contact,
                  });
                }}
                className="px-3 btn-41 d-flex align-items-center rounded-10px"
                disabled={selectedDoctor != decodedToken?.result?.user_id}
              >
                <i className="icon-calendar me-2"></i>
                {"Availability Settings"}
              </Button>
            </div>
          </div>
        </div>
        <div className="pb-5">&nbsp;</div>
      </div>
      <div className={`border rounded-4 appointment-wrap p-4`}>
        {isTeleConsultEnabled && hasVideoSlotsFromApi && (
          <div
            style={{
              width: 400,
              height: 52,
              backgroundColor: "#F5F5F5",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "4px",
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              className="d-flex align-items-center justify-content-center gap-2 border-0"
              style={{
                width: 300,
                height: 44,
                borderRadius: 8,
                backgroundColor: appointmentMode === "in_clinic" ? "#FFFFFF" : "#F5F5F5",
                color: appointmentMode === "in_clinic" ? "#4B4AD5" : "#454551",
                fontSize: 16,
                fontWeight: 500,
              }}
              onClick={() => {
                setAppointmentMode("in_clinic");
                setSelectedTimeSlot(null);
                setSelectedSlotDetails(null);
              }}
            >
              <img
                src={appointmentMode === "in_clinic" ? hospitalSvg : hospitalWhiteSvg}
                alt=""
                width={20}
                height={20}
                aria-hidden
              />
              In-clinic
            </button>
            <button
              type="button"
              className="d-flex align-items-center justify-content-center gap-2 border-0"
              style={{
                width: 300,
                height: 44,
                borderRadius: 8,
                backgroundColor: appointmentMode === "teleconsult" ? "#FFFFFF" : "#F5F5F5",
                color: appointmentMode === "teleconsult" ? "#4B4AD5" : "#454551",
                fontSize: 16,
                fontWeight: 500,
              }}
              onClick={() => {
                window.Moengage.track_event("TP__TC_ApptBooking", {
                  "Doctor_name": profile?.um_name,
                  "Doctor_mobile_No": profile?.um_contact,
                  "Doctor_specialty": profile?.dp_name,
                  "Doctor_um_id": tokenData?.user_id,
                });
                setAppointmentMode("teleconsult");
                setSelectedTimeSlot(null);
                setSelectedSlotDetails(null);
              }}
            >
              <img
                src={appointmentMode === "teleconsult" ? videoSvg : videoWhiteSvg}
                alt=""
                width={20}
                height={20}
                aria-hidden
              />
              Tele-Consultation
            </button>
          </div>
        )}
        <div className="d-flex align-items-center justify-content-between">
          <DatePicker
            // value={selectedDate}
            onChange={handleDateChange}
            format="MMMM, YYYY"
            picker="date"
            inputReadOnly
            allowClear={false}
            defaultPickerValue={displayMonth}
            // Set the displayed month based on conditions
            value={isDateInChipRange(selectedDate) ? selectedDate : dateChips[0]}
            suffixIcon={
              <i className="icon-right d-block text-main fs-5 suffix-icon-down"></i>
            }
            style={{ width: "165px" }}
            onClick={(e) => {
              const input = e.target.closest(".ant-picker");
              if (input) {
                input.click();
              }
            }}
          />

          <div className="arrows" style={{ display: "flex", gap: "5px" }}>
            <button
              className="arrow-btn"
              icon="<"
              onClick={() => handleNavigateChips("left")}
            >
              <i class="icon-right d-block text-main fs-5"></i>
            </button>
            <button
              className="arrow-btn"
              icon=">"
              onClick={() => handleNavigateChips("right")}
            >
              <i class="icon-right iconrotate180 d-block text-main fs-5"></i>
            </button>
          </div>
        </div>

        <div className="date-chips-container mb-4">
          {dateChips.map((date) => (
            <div className="d-flex flex-column align-items-center">
              <div
                key={date.format("YYYY-MM-DD")}
                onClick={() => handleChipClick(date)}
                className={`date-chip ${date.format("YYYY-MM-DD") ===
                  selectedDate.format("YYYY-MM-DD")
                  ? "active"
                  : ""
                  }`}
              >
                <div
                  className={`${date.format("YYYY-MM-DD") ===
                    selectedDate.format("YYYY-MM-DD")
                    ? "date-chip active"
                    : ""
                    }`}
                >
                  {date.format("D")}
                </div>
              </div>
              <div
                style={{
                  fontSize: "14px",
                  textAlign: "center",
                  paddingTop: "6px",
                }}
              >
                {date.format("ddd")}
              </div>
            </div>
          ))}
        </div>

        <div className="doctor-selection">
          <Select
            placeholder="Select Doctor"
            value={selectedDoctorOption}
            onChange={handleDoctorChange}
            options={doctorOptions}
            className="doctor-select"
            disabled={!doctorOptions?.length}
            onDropdownVisibleChange={(open) => setEditDoctor(open)}
            open={editDoctor}
            style={{
              width: "20%",
              border: editDoctor ? "1px solid #4B4AD5" : "none",
              borderRadius: editDoctor ? "10px" : "none",
            }}
          />
        </div>

        {showDisclaimer &&
          profile?.userSettingFlag?.find(
            (e) => e?.type === "availabilitySettings"
          )?.status !== 1 && (
            <div className="cvt-info mt-4 rounded-10px w-100 justify-content-between">
              <div className="d-flex align-items-center">
                <img src={cvtInfoIcon} alt="cvt-info-icon" className="me-2" />
                <span className="cvt-info-text">
                  <span className="title-common">Disclaimer:</span> The slots
                  below are based on the default availability settings. To
                  customise your schedule, update your availability in
                  <button
                    onClick={() => {
                      myAvailability();
                      HandleSettingsDescription();
                    }}
                    className="availability-settings-text-btn"
                  >
                    Availability Settings
                  </button>.
                </span>
              </div>
              <i
                className="icon-Cross ms-1 fs-20"
                style={{
                  color: "#A2A2A8",
                  marginLeft: "auto",
                  cursor: "pointer",
                }}
                onClick={HandleSettingsDescription}
              ></i>
            </div>
          )}

        <div className="timeslots-section">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            defaultActiveKey={getCurrentTimeSection()}
          >
            {TIME_SECTIONS_CONFIG.map(section => {
              // Skip rendering Midnight and Early Morning sections if:
              // 1. They have no slots, OR
              // 2. They only have a single unavailable slot without appointments
              if (section.key === 'MIDNIGHT' || section.key === 'EARLY_MORNING') {
                const sectionSlots = timeSlots[section.key];

                // Check if there are no slots
                if (!sectionSlots || sectionSlots.length === 0) {
                  return null;
                }

                // Check if there's only one slot and it's unavailable without appointments
                if (sectionSlots.length === 1 &&
                  sectionSlots[0].status === 'unavailable' &&
                  (!sectionSlots[0].appointments || sectionSlots[0].appointments.length === 0)) {
                  return null;
                }
              }

              return (
                <TabPane
                  key={section.key}
                  tab={`${section.label}`}
                >
                  <TimeSlotContainer
                    slots={timeSlots[section.key]}
                    selectedTimeSlot={selectedTimeSlot}
                    setSelectedTimeSlot={handleTimeSlotSelect}
                    isLoading={isLoadingSlots}
                    handleConfirmAppointment={handleConfirmAppointment}
                    editTime={editTime}
                    isSlotInPast={isSlotInPast}
                    selectedDoctorOption={selectedDoctorOption}
                    selectedDate={selectedDate}
                  />
                </TabPane>
              );
            })}
          </Tabs>
        </div>
      </div>
      <Drawer
        className="modalWidth-645"
        width="auto"
        title="Confirm Appointment"
        placement="right"
        closable
        open={confirmAppointment}
        onClose={handleConfirmAppointment}
        extra={
          <Button
            type="primary"
            className="btn-41"
            disabled={validation() || isBookingAppointment}
            onClick={onBookAppointmentPress}
          >
            Book Appointment
          </Button>
        }
      >
        <ConfirmAppointment
          handleConfirmAppointment={handleConfirmAppointment}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedDoctor={selectedDoctor}
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          clickedPatient={clickedPatient}
          setClickedPatient={setClickedPatient}
          selectedCaseType={selectedCaseType}
          setSelectedCaseType={setSelectedCaseType}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          remarks={remarks}
          setRemarks={setRemarks}
          isTeleConsultSlot={isTeleConsultEnabled && appointmentMode === "teleconsult"}
        />
      </Drawer>
    </>
  );
}

export default AddAppointment;