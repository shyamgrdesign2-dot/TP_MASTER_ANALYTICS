import React, { useState, useEffect } from "react";
import { Button, Drawer, message } from "antd";
import BasicInfoStep from "./steps/BasicInfoStep";
import ClinicDetailsStep from "./steps/ClinicDetailsStep";
import UploadProofStep from "./steps/UploadProofStep";
import styles from "./DoctorOnboarding.module.css";
import axios from "axios";
import config from "../../config";
import {
  updateOnboardingDetails,
  finalizeOnboarding,
  uploadDocuments,
  initOnboarding,
  updateLocation,
} from "./services/onboardingService";
import { getUserMobileNumber, getUtmParams } from "./services/userDataService";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN, PERSISTANT_STORAGE_KEY_MEDECO_TOKEN } from "../../utils/constants";
import CustomStepper from "./CustomStepper";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { updateHasLocation } from "../../redux/doctorsSlice";
import { useDispatch } from "react-redux";
import {
  detectOperatingSystem,
  getOnboardingDeviceSource,
} from "../../utils/utils";
import { useLocalStorage } from "../../utils/localStorage";

/** Onboarding APIs receive mobile without country code. */
const phoneWithoutCountryCode = (phone) => {
  if (phone == null || typeof phone !== "string") return phone ?? "";
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return String(phone).trim();
  digits = digits.replace(/^0+/, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
};

const DoctorOnboarding = ({
  visible,
  onClose,
  initialStep = 0,
  isAccountLocked = false,
}) => {
  const [searchParams] = useSearchParams();
  const isFromOffering = searchParams.get("fromOffering") === "true";
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [userMobileNumber, setUserMobileNumber] = useState(null);
  const [utmParams, setUtmParams] = useState(null);
  const [userOnboardingId, setUserOnboardingId] = useState(null);
  const [specialities, setSpecialities] = useState([]);
  const [specialitiesLoading, setSpecialitiesLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [formData, setFormData] = useState({
    fullName: searchParams.get("fullName") ?? "",
    speciality: searchParams.get("speciality") ?? "",
    clinicName: "",
    clinicPincode: "",
    clinicAddress: "",
    clinic_lat: "",
    clinic_long: "",
    governmentIdProof: null,
    mrcCertificate: null,
  });
  const fromMedeco = searchParams.get("isFromMedeco")
  const [doctorData, setDoctorData] = useState({});
  const navigate = useNavigate();
  const { state } = useLocation();
  const [getMedecoToken] = useLocalStorage(
    PERSISTANT_STORAGE_KEY_MEDECO_TOKEN
  );
  const clinicDetails = state?.clinicDetails;
  const mobileFromUrl = searchParams.get("mobileNo")
  const dispatch = useDispatch();
  // Get UTM params
  const utm = getUtmParams();

  useEffect(() => {
    if (clinicDetails) {
      setFormData({
        ...formData,
        clinicName: clinicDetails.hm_name,
        clinicPincode: clinicDetails.hm_pincode,
        clinicAddress: clinicDetails.hm_address,
      });
    }
  }, [clinicDetails]);

  // Update currentStep when initialStep changes - make this run after initialization
  useEffect(() => {
    if (!isInitializing && initialStep) {
      setCurrentStep(initialStep);
    }
  }, [initialStep, isInitializing]);

  // Listen for window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Apply styles directly to drawer elements for mobile
  useEffect(() => {
    if (visible && isMobile) {
      const styleDrawer = () => {
        const drawerElements = document.querySelectorAll(
          ".onboarding-drawer .ant-drawer-content"
        );
        const drawerWrappers = document.querySelectorAll(
          ".onboarding-drawer .ant-drawer-content-wrapper"
        );

        drawerElements.forEach((el) => {
          el.style.borderRadius = "24px 24px 0 0";
        });

        drawerWrappers.forEach((el) => {
          el.style.borderRadius = "24px 24px 0 0";
          el.style.overflow = "hidden";
        });
      };

      // Initial styling
      styleDrawer();

      // Additional styling after a short delay to ensure drawer is rendered
      const timeoutId = setTimeout(styleDrawer, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [visible, isMobile]);

  // Fetch specialities from API
  const fetchSpecialities = async () => {
    setSpecialitiesLoading(true);
    try {
      const response = await axios.post(
        `${config.user_management_api_url}/master/data`,
        {
          dataType: ["Speciality"],
        },
        {
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data && response.data.speciality) {
        setSpecialities(
          response.data.speciality?.filter(({ pmEnabled }) => !!pmEnabled)
        );
      }
    } catch (error) {
      console.error("Error fetching specialities:", error);
    } finally {
      setSpecialitiesLoading(false);
    }
  };

  // Check if form is valid for current step
  const isFormValidForCurrentStep = () => {
    if (currentStep === 0) {
      return formData.fullName && formData.speciality;
    }
    if (currentStep === 1) {
      return (
        formData.clinicName &&
        formData.clinicPincode &&
        formData.clinicPincode.length === 6 &&
        formData.clinic_long &&
        formData.clinic_lat
      );
    }
    if (currentStep === 2) {
      return formData.governmentIdProof && formData.mrcCertificate;
    }
    return true;
  };

  // Init API call to get user details and determine starting step
  const initializeOnboarding = async () => {
    setIsInitializing(true);
    const phoneNumber = getUserMobileNumber()?.length > 0 ? getUserMobileNumber() : (mobileFromUrl ?? "");
    const utm = getUtmParams();
    try {
      const response = await initOnboarding(
        phoneWithoutCountryCode(phoneNumber),
        utm,
        getOnboardingDeviceSource()
      );

      // Store the onboarding ID for future API calls
      setUserOnboardingId(response.id);
      setDoctorData(response);
      // Pre-fill form data from response
      let updatedFormData = { ...formData };

      // Basic details
      if (response?.basicDetails?.departmentId) {
        updatedFormData = {
          ...updatedFormData,
          fullName: response.basicDetails.doctorName || "",
          speciality: response.basicDetails.departmentId,
        };
      }

      // Hospital details
      if (response?.hospitalDetails?.clinicName) {
        updatedFormData = {
          ...updatedFormData,
          clinicName: response.hospitalDetails.clinicName || "",
          clinicAddress: response.hospitalDetails.clinicAddress || "",
          clinicPincode: response.hospitalDetails.clinicPincode || "",
          clinic_long: response.hospitalDetails.clinic_long || "",
          clinic_lat: response.hospitalDetails.clinic_lat || "",
          clinic_id: response.hospitalDetails.clinic_id || "",
          hm_business_id: response.hospitalDetails.hm_business_id || "",
        };
      }

      setFormData(updatedFormData);
      // Always prioritize isAccountLocked when setting step
      if (isAccountLocked) {
        setCurrentStep(2);
      } else if (
        response?.hospitalDetails?.clinicName &&
        response?.hospitalDetails?.clinicPincode &&
        !response?.hospitalDetails?.clinic_id &&
        response?.basicDetails?.departmentId
      ) {
        setCurrentStep(2);
      } else if (response?.basicDetails?.departmentId) {
        setCurrentStep(1);
      } else {
        setCurrentStep(0);
      }
      return response.id;
    } catch (error) {
      console.error("Error initializing onboarding:", error);
      // If initialization fails and account is locked, still go to step 2
      if (isAccountLocked) {
        setCurrentStep(2);
      }
      // Otherwise, if initialization fails and initialStep wasn't explicitly provided, start from the beginning
      else if (initialStep === 0) {
        setCurrentStep(0);
      }
    } finally {
      if (!isFromOffering)
        setIsInitializing(false);
    }
  };

  // Load user data and UTM params on mount
  useEffect(() => {
    const user = getUserMobileNumber();
    const utm = getUtmParams();

    setUserMobileNumber(user && user.length > 0 ? user : (mobileFromUrl ?? ""));
    setUtmParams(utm);

    // Fetch specialities
    fetchSpecialities();

    // If the drawer is visible, initialize onboarding
    if (visible && !clinicDetails) {
      initializeOnboarding().then((res) => {
        // If the user is coming from the offering page, set the step to 0
        if ((isFromOffering || fromMedeco === "true") && initialStep === 0) {
          // Only submit when moving from step 0 (Basic Info) to step 1 (Clinic Details)
          if (currentStep !== 0) {
            return true;
          }

          if (!formData.fullName || !formData.speciality) {
            message.error("Please fill in all required fields");
            return false;
          }

          setIsSubmitting(true);
          if (res) {
            const currentDeviceSource = getOnboardingDeviceSource();
            const doctorData = {
              id: res,
              phone_number: phoneWithoutCountryCode(getUserMobileNumber()?.length > 0 ? getUserMobileNumber() : (mobileFromUrl ?? "")),
              doctorName: formData.fullName,
              departmentId: formData.speciality,
              device_source: currentDeviceSource,
              // Use real UTM data
              utm_source: utmParams?.utm_source,
              utm_campaign: utmParams?.utm_campaign,
              utm_term: utmParams?.utm_term,
              utm_content: utmParams?.utm_content,
              utm_medium: utmParams?.utm_medium,
            };

            updateOnboardingDetails(doctorData).then(data => {
              setCurrentStep(1);
              window.Moengage.track_event("TP_NewLoginFlow_Basic_info_Next", {
                mobile: getUserMobileNumber(),
                doctor_name: formData.fullName,
                speciality: formData.speciality,
                clinic_name: formData.clinicName,
                clinic_address: formData.clinicAddress,
                clinic_pincode: formData.clinicPincode,
                clinic_lat: formData.clinic_lat,
                clinic_long: formData.clinic_long,
              });
            }).catch((error) => {
              message.error("Failed to update your information. Please try again.");
              console.error("Error updating doctor details:", error);
            }).finally(() => {
              setIsSubmitting(false);
            });
          }
        }
      }).catch((error) => {
        console.error("Error during onboarding initialization:", error);
        message.error("Failed to initialize onboarding. Please try again.");
      }
      ).finally(() => {
        setIsInitializing(false); // Ensure initializing is set to false after initialization   0
      });
    }
  }, [visible]);

  useEffect(() => {
    if (isAccountLocked && !isInitializing) {
      setCurrentStep(2);
    }
  }, [isAccountLocked, isInitializing]);

  // Reset step to first step whenever drawer is opened
  useEffect(() => {
    if (!visible) {
      // Reset the form when the drawer is closed
      setFormData({
        fullName: "",
        speciality: "",
        clinicName: "",
        clinicPincode: "",
        clinicAddress: "",
        clinic_lat: "",
        clinic_long: "",
        governmentIdProof: null,
        mrcCertificate: null,
      });
    }
  }, [visible]);

  const steps = [
    {
      title: "Basic Info",
      content: (
        <BasicInfoStep
          formData={formData}
          setFormData={setFormData}
          specialities={specialities}
          loading={specialitiesLoading}
        />
      ),
    },
    {
      title: "Clinic Details",
      content: (
        <ClinicDetailsStep
          formData={formData}
          setFormData={setFormData}
          clinicId={doctorData?.hospitalDetails?.clinic_id}
        />
      ),
    },
    {
      title: "Upload Proof",
      content: (
        <UploadProofStep
          formData={formData}
          setFormData={setFormData}
          isAccountLocked={isAccountLocked}
        />
      ),
    },
  ];

  const handleUpdateOnboardingDetails = async () => {
    // Only submit when moving from step 0 (Basic Info) to step 1 (Clinic Details)
    if (currentStep !== 0) {
      return true;
    }

    if (!formData.fullName || !formData.speciality) {
      message.error("Please fill in all required fields");
      return false;
    }

    setIsSubmitting(true);

    try {
      // Use real user data from context/token
      const currentDeviceSource = getOnboardingDeviceSource();
      const doctorData = {
        id: userOnboardingId,
        phone_number: phoneWithoutCountryCode(userMobileNumber ?? mobileFromUrl),
        doctorName: formData.fullName,
        departmentId: formData.speciality,
        device_source: currentDeviceSource,
        // Use real UTM data
        utm_source: utmParams?.utm_source,
        utm_campaign: utmParams?.utm_campaign,
        utm_term: utmParams?.utm_term,
        utm_content: utmParams?.utm_content,
        utm_medium: utmParams?.utm_medium,
      };

      await updateOnboardingDetails(doctorData);
      return true;
    } catch (error) {
      message.error("Failed to update your information. Please try again.");
      console.error("Error updating doctor details:", error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeOnboarding = async () => {
    // Only submit when moving from step 1 (Clinic Details) to step 2 (Upload ID)
    if (
      currentStep !== 1 ||
      (doctorData?.hospitalDetails?.clinicName &&
        doctorData?.hospitalDetails?.clinicPincode &&
        !doctorData?.hospitalDetails?.clinic_id)
    ) {
      return true;
    }

    if (
      !formData.clinicName ||
      !formData.clinicPincode ||
      !formData.clinic_long ||
      !formData.clinic_lat
    ) {
      message.error("Please fill in all required clinic details");
      return false;
    }

    setIsSubmitting(true);

    try {
      // Combine all the data for the finalize API
      const currentDeviceSource = getOnboardingDeviceSource();
      const finalizeData = {
        id: userOnboardingId,
        phone_number: phoneWithoutCountryCode(userMobileNumber ?? mobileFromUrl),
        doctorName: formData.fullName,
        departmentId: formData.speciality,
        device_source: currentDeviceSource,
        // UTM data
        utm_source: utmParams?.utm_source,
        utm_campaign: utmParams?.utm_campaign,
        utm_term: utmParams?.utm_term,
        utm_content: utmParams?.utm_content,
        utm_medium: utmParams?.utm_medium,
        // Clinic data
        clinicName: formData.clinicName,
        clinicAddress: formData.clinicAddress,
        clinicPincode: formData.clinicPincode,
        clinic_lat: formData.clinic_lat || "",
        clinic_long: formData.clinic_long || "",
        ...(formData.clinic_id && { clinic_id: formData.clinic_id }),
        ...(formData.hm_business_id && {
          hm_business_id: formData.hm_business_id,
        }),
      };

      const response = await finalizeOnboarding(finalizeData);

      // If response is successful and contains a token, update it in localStorage
      if (response && response.token) {
        localStorage.setItem(
          PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
          JSON.stringify(response.token)
        );
      }

      return true;
    } catch (error) {
      console.error("Error finalizing onboarding:", error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLocation = async () => {
    setIsSubmitting(true);
    try {
      const response = await updateLocation({
        clinic_lat: formData.clinic_lat,
        clinic_long: formData.clinic_long,
      });
      if (response?.statusCode === 200) {
        await dispatch(updateHasLocation(true));
        navigate("/");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating location:", error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadDocuments = async () => {
    if (!formData.governmentIdProof || !formData.mrcCertificate) {
      message.error("Please upload both Government ID and MRC Certificate");
      return false;
    }

    setIsSubmitting(true);

    try {
      // Get the auth token
      const rawToken = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);

      if (!rawToken) {
        message.error("Authentication token not found. Please login again.");
        return false;
      }

      const authToken = JSON.parse(rawToken);

      // Upload the documents
      const response = await uploadDocuments(
        formData.governmentIdProof,
        formData.mrcCertificate,
        authToken
      );
      localStorage.removeItem("mobileNumber");
      navigate("/?from=finalSetup");

      return true;
    } catch (error) {
      console.error("Error uploading documents:", error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 0) {
      const success = await handleUpdateOnboardingDetails();
      // moengage event for basic info step
      if (success) {
        window.Moengage.track_event("TP_NewLoginFlow_Basic_info_Next", {
          mobile: "91" + userMobileNumber,
          doctor_name: formData.fullName,
          speciality: formData.speciality,
          clinic_name: formData.clinicName,
          clinic_address: formData.clinicAddress,
          clinic_pincode: formData.clinicPincode,
          clinic_lat: formData.clinic_lat,
          clinic_long: formData.clinic_long,
          utm_campaign: utm.utm_campaign ?? "NA",
          utm_source: utm.utm_source ?? "NA",
          utm_medium: utm.utm_medium ?? "NA",
          utm_content: utm.utm_content ?? "NA",
          utm_term: utm.utm_term ?? "NA",
          operating_system: detectOperatingSystem(),
          is_marketing: Object.values(utm).some(
            (value) => value && value.length > 0
          ),
        });
      }
      if (!success) return;
    } else if (currentStep === 1) {
      const success = clinicDetails
        ? await handleUpdateLocation()
        : await handleFinalizeOnboarding();
      // moengage event for clinic details step
      if (success) {
        window.Moengage.track_event("TP_NewLoginFlow_Clinical_info_Next", {
          mobile: "91" + userMobileNumber,
          doctor_name: formData.fullName,
          speciality: formData.speciality,
          clinic_name: formData.clinicName,
          clinic_address: formData.clinicAddress,
          clinic_pincode: formData.clinicPincode,
          clinic_lat: formData.clinic_lat,
          clinic_long: formData.clinic_long,
          utm_campaign: utm.utm_campaign ?? "NA",
          utm_source: utm.utm_source ?? "NA",
          utm_medium: utm.utm_medium ?? "NA",
          utm_content: utm.utm_content ?? "NA",
          utm_term: utm.utm_term ?? "NA",
          operating_system: detectOperatingSystem(),
          is_marketing: Object.values(utm).some(
            (value) => value && value.length > 0
          ),
        });
      }
      if (!success) return;
    } else if (currentStep === 2) {
      // Upload documents and redirect to home on success
      const success = await handleUploadDocuments();
      if (success) {
        // Close the drawer
        completeClinicSetupForMedeco()
        onClose();
        // moengage event for upload documents step
        window.Moengage.track_event("TP_NewLoginFlow_Submit_setup", {
          mobile: "91" + userMobileNumber,
          doctor_name: formData.fullName,
          speciality: formData.speciality,
          clinic_name: formData.clinicName,
          clinic_address: formData.clinicAddress,
          clinic_pincode: formData.clinicPincode,
          clinic_lat: formData.clinic_lat,
          clinic_long: formData.clinic_long,
          utm_campaign: utm.utm_campaign ?? "NA",
          utm_source: utm.utm_source ?? "NA",
          utm_medium: utm.utm_medium ?? "NA",
          utm_content: utm.utm_content ?? "NA",
          utm_term: utm.utm_term ?? "NA",
          operating_system: detectOperatingSystem(),
          is_marketing: Object.values(utm).some(
            (value) => value && value.length > 0
          ),
        });

        // Don't navigate or reload - stay on current page
        return;
      } else {
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  // Handle clicking on a completed step
  const handleStepClick = (stepIndex) => {
    // Navigate to the clicked step
    if (!clinicDetails) {
      setCurrentStep(stepIndex);
    }
  };
  const completeClinicSetupForMedeco = () => {
    const medecoToken = getMedecoToken();
    if (fromMedeco === "true" && medecoToken) {
      const url = `${config.MEDECO_WEBVIEW_URL}/?authToken=${medecoToken}`
      window.location.href = url;
      return;
    }
    return;
  }
  const drawerContent = (
    <div
      style={{
        padding: isMobile ? "0" : "20px",
        height: isMobile ? "100%" : "auto",
        display: isMobile ? "flex" : "block",
        flexDirection: isMobile ? "column" : "unset",
        overflow: isMobile ? "hidden" : "auto",
      }}
    >
      {/* Fixed header - always visible */}
      <div
        style={{
          padding: isMobile ? "24px 16px 12px" : "0",
          borderBottom: isMobile ? "1px solid #f0f0f0" : "none",
          position: isMobile ? "sticky" : "relative",
          top: 0,
          backgroundColor: isMobile ? "white" : "transparent",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isMobile ? "12px" : "30px",
            paddingBottom: isMobile ? "0" : "20px",
            borderBottom: !isMobile ? "1px solid #f0f0f0" : "none",
          }}
        >
          <h1
            style={{
              fontSize: isMobile ? "20px" : "24px",
              fontWeight: "600",
              color: "#111827",
              margin: isMobile ? "auto" : "0",
            }}
          >
            Final Setup!
          </h1>
          {!isMobile && currentStep === 2 ? (
            <div style={{ display: "flex", gap: "12px" }}>
              <Button
                onClick={() => {
                  // moengage event for skip and upload later
                  window.Moengage.track_event(
                    "TP_NewLoginFlow_Skip_And_Submit_later",
                    {
                      mobile: "91" + userMobileNumber,
                      doctor_name: formData.fullName,
                      speciality: formData.speciality,
                      clinic_name: formData.clinicName,
                      clinic_address: formData.clinicAddress,
                      clinic_pincode: formData.clinicPincode,
                      clinic_lat: formData.clinic_lat,
                      clinic_long: formData.clinic_long,
                      utm_campaign: utm.utm_campaign ?? "NA",
                      utm_source: utm.utm_source ?? "NA",
                      utm_medium: utm.utm_medium ?? "NA",
                      utm_content: utm.utm_content ?? "NA",
                      utm_term: utm.utm_term ?? "NA",
                      operating_system: detectOperatingSystem(),
                      is_marketing: Object.values(utm).some(
                        (value) => value && value.length > 0
                      ),
                    }
                  );

                  onClose();
                  localStorage.removeItem("mobileNumber");
                  navigate("/?from=finalSetup");
                }}
                className={styles.skipButton}
              >
                Skip & upload later
              </Button>
              <Button
                type="primary"
                onClick={nextStep}
                loading={isSubmitting}
                disabled={!isFormValidForCurrentStep()}
                className={
                  !isFormValidForCurrentStep() ? styles.disabledButton : ""
                }
                style={{
                  backgroundColor: isFormValidForCurrentStep()
                    ? "#4f46e5"
                    : undefined,
                  borderColor: isFormValidForCurrentStep()
                    ? "#4f46e5"
                    : undefined,
                  borderRadius: "8px",
                  height: "40px",
                }}
              >
                Finish Setup
              </Button>
            </div>
          ) : !isMobile ? (
            <Button
              type="primary"
              onClick={nextStep}
              loading={isSubmitting}
              disabled={!isFormValidForCurrentStep()}
              className={
                !isFormValidForCurrentStep() ? styles.disabledButton : ""
              }
              style={{
                backgroundColor: isFormValidForCurrentStep()
                  ? "#4f46e5"
                  : undefined,
                borderColor: isFormValidForCurrentStep()
                  ? "#4f46e5"
                  : undefined,
                borderRadius: "8px",
                height: "40px",
                padding: "0 25px",
              }}
            >
              Next
            </Button>
          ) : null}
        </div>

        {/* Fixed stepper - always visible */}
        <div
          style={{
            marginBottom: isMobile ? "0" : "60px",
            marginTop: isMobile ? "40px" : "0",
            paddingBottom: isMobile ? "12px" : "0",
          }}
        >
          <div className={styles.stepperOuter}>
            <CustomStepper
              steps={[
                { label: "Basic Info" },
                { label: "Clinic Details" },
                { label: "Upload ID" },
              ]}
              currentStep={currentStep}
            // onStepClick={handleStepClick}
            />
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div
        style={{
          padding: isMobile ? "16px" : "0px",
          paddingTop: isMobile ? "12px" : "20px",
          flex: isMobile ? "1" : "unset",
          overflowY: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? "90px" : "20px", // Extra padding for fixed footer
          backgroundColor: isMobile ? "white" : "transparent",
        }}
      >
        {isInitializing ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading your information...</p>
          </div>
        ) : (
          steps[currentStep].content
        )}
      </div>

      {/* Mobile footer with Next/Finish button */}
      {isMobile && (
        <div className={styles.mobileFooter}>
          {currentStep === 2 ? (
            <>
              <Button
                block
                onClick={() => {
                  // moengage event for skip and upload later
                  window.Moengage.track_event(
                    "TP_NewLoginFlow_Skip_And_Submit_later",
                    {
                      mobile: "91" + userMobileNumber,
                      doctor_name: formData.fullName,
                      speciality: formData.speciality,
                      clinic_name: formData.clinicName,
                      clinic_address: formData.clinicAddress,
                      clinic_pincode: formData.clinicPincode,
                      clinic_lat: formData.clinic_lat,
                      clinic_long: formData.clinic_long,
                      utm_campaign: utm.utm_campaign ?? "NA",
                      utm_source: utm.utm_source ?? "NA",
                      utm_medium: utm.utm_medium ?? "NA",
                      utm_content: utm.utm_content ?? "NA",
                      utm_term: utm.utm_term ?? "NA",
                      operating_system: detectOperatingSystem(),
                      is_marketing: Object.values(utm).some(
                        (value) => value && value.length > 0
                      ),
                    }
                  );
                  completeClinicSetupForMedeco()
                  onClose();
                  navigate("/?from=finalSetup");
                }}
                className={`${styles.skipButton} ${styles.mobileSkipButton}`}
              >
                Skip & upload later
              </Button>
              <Button
                block
                type="primary"
                onClick={nextStep}
                loading={isSubmitting}
                disabled={!isFormValidForCurrentStep()}
                className={
                  !isFormValidForCurrentStep()
                    ? `${styles.disabledButton} ${styles.mobileActionButton}`
                    : styles.mobileActionButton
                }
                style={{
                  backgroundColor: isFormValidForCurrentStep()
                    ? "#4f46e5"
                    : undefined,
                  borderColor: isFormValidForCurrentStep()
                    ? "#4f46e5"
                    : undefined,
                }}
              >
                Finish Setup
              </Button>
            </>
          ) : (
            <Button
              block
              type="primary"
              onClick={nextStep}
              loading={isSubmitting}
              disabled={!isFormValidForCurrentStep()}
              className={
                !isFormValidForCurrentStep()
                  ? `${styles.disabledButton} ${styles.mobileActionButton}`
                  : styles.mobileActionButton
              }
              style={{
                backgroundColor: isFormValidForCurrentStep()
                  ? "#4f46e5"
                  : undefined,
                borderColor: isFormValidForCurrentStep()
                  ? "#4f46e5"
                  : undefined,
              }}
            >
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      title={null}
      placement={isMobile ? "bottom" : "right"}
      closable={false}
      onClose={onClose}
      open={visible}
      height={isMobile ? "93%" : 650}
      width={isMobile ? "100%" : 650}
      maskClosable={false}
      mask={true}
      maskStyle={{ backgroundColor: "transparent" }}
      zIndex={1100}
      footer={null}
      bodyStyle={{ padding: 0, overflow: isMobile ? "hidden" : "auto" }}
      className="onboarding-drawer"
      style={
        isMobile
          ? {
            borderTopLeftRadius: "1rem",
            borderTopRightRadius: "1rem",
          }
          : {}
      }
    >
      {isMobile ? (
        <div
          style={{
            borderTopLeftRadius: "1rem",
            borderTopRightRadius: "1rem",
            overflow: "hidden",
            height: "100%",
            width: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {drawerContent}
        </div>
      ) : (
        drawerContent
      )}
    </Drawer>
  );
};

export default DoctorOnboarding;