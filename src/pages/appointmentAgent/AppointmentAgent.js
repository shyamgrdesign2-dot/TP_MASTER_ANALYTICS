import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button, Drawer, message, Tooltip } from "antd";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";

import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";
import { setupReceptionist } from "./service";
import api from "../../api/services/axiosService";
import { env } from "../../EnvironmentConfig";
import { errorMessage, getClinic } from "../../utils/utils";
import { MESSAGE_KEY } from "../../utils/constants";
import HeaderAppointmentAgent from "../../common/HeaderAppointmentAgent";
import FullPageLoader from "../vaccination/components/Loader";
import CustomStepper from "./components/CustomStepper";
import ReceptionistSetup from "./components/ReceptionistSetup/ReceptionistSetup";
import ClinicSetup from "../auth/components/ClinicSetup";
import SetupSummary from "./components/SetupSummary/SetupSummary";
import "./AppointmentAgent.scss";
import ClinicDetailsSetup from "./components/ClinicDetailsSetup/ClinicDetailsSetup";
import { getDecodedToken } from "../../utils/localStorage";
import { isMobile } from "react-device-detect";
import { ASSETS } from "../../assets";
const {
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

function AppointmentAgent() {
  const { userId, profile } = useSelector((state) => state.doctors);
  const [loader, setLoader] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const hospitalData = profile?.hospital_data;
  const { agentsData, showSummaryOnly, enableEditMode } = location.state || {};

  const decodedToken = getDecodedToken();
  const clinicId = String(decodedToken?.result?.clinic_id);
  const hos_business_id = decodedToken?.result?.hospital_business_id;
  
  // Add state for collecting setup data
  const [setupData, setSetupData] = useState({
    clinicId: clinicId,
    hospitalBusinessId: hos_business_id,
    doctors: [], // Initialize empty doctors array
    clinicData: getClinic(hospitalData),
    useUploadLogo: false, // Add this to track logo vs name choice
    logo: null, // Add this to store logo
    clinicName: null, // Add this to store clinic name
    avatar: null,
    avatarId: null, // Add this to store avatar ID
    googleLocation: null,
    fullgoogleLocation: null,
  });

  // Add validation state for each step
  const [stepValidation, setStepValidation] = useState({
    receptionist: false,
    clinic: false,
    summary: false,
  });

  // Add state to trigger validation in child components
  const [triggerValidation, setTriggerValidation] = useState(false);

  useEffect(() => {
    const clinic = getClinic(hospitalData);
    setSetupData((prev) => ({
      ...prev,
      clinicData: clinic,
      clinicName: prev.clinicName || clinic?.hm_name, // Preserve user's clinic name if exists
    }));
  }, [hospitalData]);

  // Map agentsData to setupData when agentsData is available
  useEffect(() => {
    if (agentsData) {
      const clinic = getClinic(hospitalData);
      const mappedSetupData = {
        clinicId: agentsData.clinicId || profile?.clinicId,
        hospitalBusinessId: hos_business_id,
        doctors: agentsData.doctors?.map(doctor => ({
          um_id: doctor.um_id,
          dp_id: doctor.dp_id,
          um_name: doctor.um_name,
          speciality: doctor.speciality || "MBBS",
          slotsAvailable: doctor.slotsAvailable
        })) || [],
        clinicData: clinic,
        useUploadLogo: agentsData.logo ? true : false,
        logo: agentsData.logo || null,
        clinicName: agentsData.clinicName || clinic?.hm_name,
        avatar: agentsData.avatarDetails || null,
        avatarId: agentsData.avatarId || null,
        googleLocation: agentsData.googleLocation?.address?.formatted || null,
        fullgoogleLocation: agentsData.googleLocation || null,
        // Additional fields from agentsData
        receptionistName: agentsData.name || "",
        contact: agentsData.contact || "",
        email: agentsData.email || "",
        receptionId: agentsData.receptionId || null,
        appointmentLinkShared: agentsData.appointmentLinkShared || null
      };
      setSetupData(mappedSetupData);
    }
  }, [agentsData, hospitalData, profile?.clinicId]);

  useEffect(() => {
    const step = searchParams.get("step");
    if (step) {
      switch (step) {
        case "receptionist":
          setCurrentStep(0);
          break;
        case "clinic":
          setCurrentStep(1);
          break;
        case "summary":
          setCurrentStep(2);
          break;
        default:
          setCurrentStep(0);
      }
    }
    // If showSummaryOnly is true, force step to summary
    if (showSummaryOnly) {
      setCurrentStep(2);
    }
    // If enableEditMode is true, force step to summary initially
    if (enableEditMode) {
      setCurrentStep(2);
    }
  }, [searchParams, showSummaryOnly]);

  // Validation functions for each step
  const validateReceptionistStep = useCallback(() => {
    const isValid =
      setupData.receptionistName?.trim().length > 0 &&
      setupData.avatar;
    setStepValidation((prev) => ({ ...prev, receptionist: isValid }));
    return isValid;
  }, [setupData.receptionistName, setupData.avatar]);

  const validateClinicStep = useCallback(() => {
    const isValid =
      setupData.contact?.trim().length === 10 &&
      setupData.fullgoogleLocation &&
      setupData.doctors?.length > 0;
    setStepValidation((prev) => ({ ...prev, clinic: isValid }));
    return isValid;
  }, [setupData.contact, setupData.fullgoogleLocation, setupData.doctors]);

  const validateSummaryStep = useCallback(() => {
    // Summary step is always valid if previous steps are valid
    const isValid = stepValidation.receptionist && stepValidation.clinic;
    setStepValidation((prev) => ({ ...prev, summary: isValid }));
    return isValid;
  }, [stepValidation.receptionist, stepValidation.clinic]);

  // Update validation when setupData changes
  useEffect(() => {
    validateReceptionistStep();
  }, [validateReceptionistStep]);

  useEffect(() => {
    validateClinicStep();
  }, [validateClinicStep]);

  useEffect(() => {
    validateSummaryStep();
  }, [validateSummaryStep]);

  // Get current step validation
  const getCurrentStepValidation = useCallback(() => {
    switch (currentStep) {
      case 0:
        return stepValidation.receptionist;
      case 1:
        return stepValidation.clinic;
      case 2:
        return stepValidation.summary;
      default:
        return false;
    }
  }, [currentStep, stepValidation]);

  // Get validation message for current step
  const getValidationMessage = useCallback(() => {
    switch (currentStep) {
      case 0:
        if (
          !setupData.receptionistName ||
          setupData.receptionistName.trim().length === 0
        ) {
          return "Please enter receptionist name";
        }
        if (!setupData.avatar) {
          return "Please select receptionist avatar";
        }
        return "";
      case 1:
        if (!setupData.contact || setupData.contact.trim().length === 0 ) {
          return "Please enter clinic contact number";
        }
        if (setupData.contact.trim().length !== 10) {
          return "Please enter a valid 10-digit contact number";
        }
        if (!setupData.fullgoogleLocation) {
          return "Please add clinic Google location";
        }
        if (!setupData.doctors || setupData.doctors.length === 0) {
          return "Please select at least one doctor";
        }
        return "";
      case 2:
        return "Please complete previous steps first";
      default:
        return "";
    }
  }, [currentStep, setupData]);

  const handleReceptionistData = (data) => {
    setSetupData((prev) => ({
      ...prev,
      receptionistName: data.receptionistName,
      avatar: data.avatar,
      avatarId: data.avatar?._id || data.avatarId,
    }));
  };

  const handleClinicData = (data) => {
    setSetupData((prev) => {
      return {
        ...prev,
        clinicName: data.clinicName,
        logo: data.logo,
        useUploadLogo: data.useUploadLogo,
        contact: data.contact,
        email: data.email,
        googleLocation: data.googleLocation,
        fullgoogleLocation: data.fullgoogleLocation,
        doctors: data.doctors || [], // Initialize as empty array if not provided
        // receptionistId: data.receptionistId || ""
      };
    });
  };

  const handleSetupComplete = async (response) => {
    // message.success("Setup completed successfully");

    message.open({
      key: MESSAGE_KEY,
      type: '',
      className: 'message-appointment',
      content: (
          <div className='d-flex align-items-center'>
              <img src={visitEnd} className='me-3' />
              <div>
                  <div className='title-common text-start fontroboto'>{`Setup completed successfully`}</div>
              </div>
              <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
          </div>
      ),
      duration: 5,
  });
    // Navigate to success page with setup data
    const appointment_booking_link = response?.appointment_booking_link
    navigate("/appointment-agent/success", {
      state: { setupData, appointment_booking_link},
    });
  };

  const handleStepClick = (stepIndex) => {
    setCurrentStep(stepIndex);
  };

  const handleNextClick = async () => {
    // If in summary-only mode and not in edit mode, don't proceed with setup
    if (showSummaryOnly && !enableEditMode) {
      return;
    }

    // Trigger validation in child components
    setTriggerValidation(true);

    // Check if current step is valid before proceeding
    if (!getCurrentStepValidation()) {
      const validationMsg = getValidationMessage();
      if (validationMsg) {
        // Show tooltip or message to user
        message.error(validationMsg);
      }
      // Reset trigger after a short delay
      setTimeout(() => setTriggerValidation(false), 100);
      return;
    }

    // Reset trigger validation
    setTriggerValidation(false);
    const clinic = getClinic(profile?.hospital_data);
    if (currentStep === 0) {
      window.Moengage.track_event("TP_AG_AgentSetup", {
        doctor_name: profile?.um_name,
        doctor_number: profile?.um_contact,
        doctor_unique_id: profile?.doctor_unique_id,
        doctor_specialty: profile?.dp_name,
        um_id: decodedToken?.user_id,
        clinic_name: clinic?.hm_name,
      });
      setCurrentStep(1);
    } else if (currentStep === 1) {
      window.Moengage.track_event("TP_AG_ClinicDetails", {
        doctor_name: profile?.um_name,
        doctor_number: profile?.um_contact,
        doctor_unique_id: profile?.doctor_unique_id,
        doctor_specialty: profile?.dp_name,
        um_id: decodedToken?.user_id,
        clinic_name: clinic?.hm_name,
      });
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // This is the final step, handle setup completion
      
      // Validate that fullgoogleLocation is present before making API call
      if (!setupData.fullgoogleLocation) {
        message.error("Please add clinic Google location before proceeding");
        return;
      }
      
      setLoader(true);
      try {
        const response = await setupReceptionist(setupData);
        if (response) {
          window.Moengage.track_event("TP_AG_Receptionist_Setup_Complete", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            um_id: decodedToken?.user_id,
            clinic_name: clinic?.hm_name,
          });
          handleSetupComplete(response);
        }
      } catch (error) {
        console.error("Error setting up receptionist:", error);
        message.error("Failed to complete setup. Please try again.");
      } finally {
        setLoader(false);
      }
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ReceptionistSetup
            onDataChange={handleReceptionistData}
            triggerValidation={triggerValidation}
            initialData={{
              name: setupData?.receptionistName || "",
              gender: setupData?.avatar?.gender || "female",
              selectedLook: setupData?.avatar,
              clinicData: setupData?.clinicData,
              clinicName: setupData?.clinicName,
              logo: setupData?.logo,
              useUploadLogo: setupData?.useUploadLogo,
            }}
          />
        );
      case 1:
        return (
          <ClinicDetailsSetup
            onDataChange={handleClinicData}
            triggerValidation={triggerValidation}
            initialData={{
              name: setupData?.receptionistName || "",
              gender: setupData?.avatar?.gender || "female",
              selectedLook: setupData?.avatar,
              contactNumber: setupData?.contact
                ? setupData.contact.replace("+91", "")
                : "",
              email: setupData?.email || "",
              location: setupData?.googleLocation || "",
              pincode: setupData?.pincode || "560047",
              address: setupData?.address || "",
              clinicName:
                setupData?.clinicName || setupData?.clinicData?.hm_name,
              logo: setupData?.logo,
              useUploadLogo: setupData?.useUploadLogo,
              clinicData: setupData?.clinicData,
              doctors: setupData?.doctors || [], // Ensure doctors array is always defined
              fullgoogleLocation: setupData?.fullgoogleLocation || null,
              receptionId: setupData?.receptionId || null
            }}
          />
        );
      case 2:
      default:
        return (
          <SetupSummary
            setupData={{
              ...setupData,
              doctors: setupData?.doctors || [], // Ensure doctors array is always defined
            }}
            showSummaryOnly={showSummaryOnly}
            enableEditMode={enableEditMode}
          />
        );
    }
  };

  return (
    <div className="appointment-agent-container">
      <HeaderAppointmentAgent
        onSubmit={handleNextClick}
        loader={loader}
        isNextDisabled={!getCurrentStepValidation()}
        validationMessage={getValidationMessage()}
        showSummaryOnly={showSummaryOnly}
        enableEditMode={enableEditMode}
      />
      {loading && <FullPageLoader />}
      <div className="w-100 bg-body prescription-wrapper">
        {(!showSummaryOnly || enableEditMode) && (
          <div className="row" style={{marginLeft : isMobile ? "-15%" : ""}}>
            <CustomStepper
              steps={[
                { label: "Setup Receptionist" },
                { label: "Clinic Details" },
                { label: "Summary" },
              ]}
              currentStep={currentStep}
              onStepClick={handleStepClick}
            />
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100vw"
          }}
        >
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

export default AppointmentAgent;
