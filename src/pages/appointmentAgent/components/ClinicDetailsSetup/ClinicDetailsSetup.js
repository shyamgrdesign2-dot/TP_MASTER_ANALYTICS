import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input, Upload, Tooltip, Checkbox, message } from "antd";
import { InfoCircleOutlined, CloseOutlined } from "@ant-design/icons";
import "./ClinicDetailsSetup.scss";
import ClinicPreview from "../preview/clinicPreview";
import SetupPreview from "../preview/setupPreview";
import SummaryPreview from "../preview/SummaryPreview";

import { fetchClinicDetails } from "../../service";
import LogoUploadDrawer from "../LogoUploadDrawer/LogoUploadDrawer";
import config from "../../../../config";
import GoogleMapWithAutocomplete from "../../../../common/GoogleMapWithAutocomplete";
import { isMobile } from "react-device-detect";
import { ASSETS } from "../../../../assets";
const Mail = ASSETS.images.websiteImages.mail;
const {
  editIconBlue: editIcon,
  upload: uploadIcon,
} = ASSETS.images;

const ClinicDetailsSetup = ({
  onDataChange,
  initialData,
  triggerValidation,
}) => {
  const [clinicName, setClinicName] = useState(
    initialData?.clinicName || initialData?.clinicData?.hm_name || ""
  );
  const [useUploadLogo, setUseUploadLogo] = useState(
    initialData?.useUploadLogo || false
  );
  const [isLogoDrawerVisible, setIsLogoDrawerVisible] = useState(false);
  const [logoFile, setLogoFile] = useState(initialData?.logo || null);
  const [contactNumber, setContactNumber] = useState(
    initialData?.contactNumber || ""
  );
  const [email, setEmail] = useState(initialData?.email || "");
  const [location, setLocation] = useState(
    initialData?.location || 
    initialData?.fullgoogleLocation?.address?.formatted || 
    ""
  );
  const [locationData, setLocationData] = useState(null);
  const [pincode, setPincode] = useState(initialData?.pincode || "560047");
  const [address, setAddress] = useState(
    initialData?.address || "#4 & # 5 divyasharya apartment, VGS layout"
  );
  const [activeSection, setActiveSection] = useState("identity");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDoctors, setSelectedDoctors] = useState(
    initialData?.doctors || []
  );
  const [selectAllDoctors, setSelectAllDoctors] = useState(false);
  const dropdownRef = useRef(null);
  const [allDoctors, setAllDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showContactError, setShowContactError] = useState(false);
  const [showLocationError, setShowLocationError] = useState(false);
  const [showDoctorsError, setShowDoctorsError] = useState(false);
  const [showEmailError, setShowEmailError] = useState(false);
  const [googleLocation, setGoogleLocation] = useState(initialData?.fullgoogleLocation || null);
  // const [receptionistId, setReceptionistId] = useState(initialData.receptionId || null);
  const [hasLocationChanged, setHasLocationChanged] = useState(false);

  // Fetch doctors data when component mounts
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const response = await fetchClinicDetails(
          initialData?.clinicData?.hm_id
        );
        // if(response?.receptionId){
        //   setReceptionistId(response?.receptionId);
        // }
        if (response?.doctors) {
          const doctorsData = response?.doctors
            .map((doctor) => ({
              ...doctor, // Keep all original properties
              um_id: doctor.um_id,
              um_name: `Dr. ${doctor.um_name}`,
              slotsAvailable: doctor.slotsAvailable,
            }));
          setAllDoctors(doctorsData);
        } else {
          message.error("Failed to fetch doctors list");
        }
      } catch (error) {
        console.error("Error fetching doctors:", error);
        message.error("Failed to load doctors data");
      } finally {
        setLoading(false);
      }
    };

    if (initialData?.clinicData?.hm_id) {
      fetchDoctors();
    }
  }, [initialData?.clinicData?.hm_id]);

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle trigger validation from parent
  useEffect(() => {
    if (triggerValidation) {
      if (!contactNumber.trim()) {
        setShowContactError(true);
      } else if (contactNumber.trim().length !== 10) {
        setShowContactError(true);
      }
      if (!location.trim()) {
        setShowLocationError(true);
      }
      if (!selectedDoctors.length) {
        setShowDoctorsError(true);
      }
      if (email.trim() && !isValidEmail(email)) {
        setShowEmailError(true);
      }
    }
  }, [triggerValidation, contactNumber, location, selectedDoctors, email]);

  const handleDoctorSelect = (doctor) => {
    const newSelectedDoctors = selectedDoctors.find((d) => d.um_id === doctor.um_id)
      ? selectedDoctors.filter((d) => d.um_id !== doctor.um_id)
      : [
          ...selectedDoctors,
          {
            ...doctor, // Keep all original properties
            um_id: doctor.um_id,
            dp_id: doctor.dp_id,
            um_name: doctor.um_name.replace("Dr. ", ""), // Remove Dr. prefix for consistency
            slotsAvailable: doctor.slotsAvailable,
          },
        ];

    setSelectedDoctors(newSelectedDoctors);
    setSelectAllDoctors(
      newSelectedDoctors.length ===
        allDoctors.filter((d) => d.slotsAvailable).length
    );

    // Clear doctors error when doctors are selected
    if (showDoctorsError && newSelectedDoctors.length > 0) {
      setShowDoctorsError(false);
    }

    // Update parent immediately when doctors selection changes
    updateParentData(newSelectedDoctors);
  };

  const handleSelectAllDoctors = (checked) => {
    const availableDoctors = allDoctors
      .filter((d) => d.slotsAvailable)
      .map((doctor) => ({
        ...doctor, // Keep all original properties
        um_id: doctor.um_id,
        um_name: doctor.um_name.replace("Dr. ", ""), // Remove Dr. prefix for consistency
        slotsAvailable: doctor.slotsAvailable,
      }));

    const newSelectedDoctors = checked ? availableDoctors : [];
    setSelectedDoctors(newSelectedDoctors);
    setSelectAllDoctors(checked);

    // Clear doctors error when doctors are selected
    if (showDoctorsError && newSelectedDoctors.length > 0) {
      setShowDoctorsError(false);
    }

    // Update parent immediately when doctors selection changes
    updateParentData(newSelectedDoctors);
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleRemoveDoctor = (doctor, e) => {
    e.stopPropagation();
    const newSelectedDoctors = selectedDoctors.filter(
      (d) => d.um_id !== doctor.um_id
    );
    setSelectedDoctors(newSelectedDoctors);
    setSelectAllDoctors(false);

    // Update parent immediately when doctors selection changes
    updateParentData(newSelectedDoctors);
  };

  // Validation handlers
  const handleContactChange = (e) => {
    const newContact = e.target.value.replace(/\D/g, ""); // Remove all non-digit characters
    if (newContact.length <= 10) { // Limit to 10 digits
      setContactNumber(newContact);
      if (showContactError && newContact.trim().length === 10) {
        setShowContactError(false);
      }
    }
  };

  const handleLocationChange = (data) => {
    const newLocation = data.value;
    setLocation(newLocation);

    // Store the parsed address data if available
    if (data.addressData) {
      setLocationData(data.addressData);
    }

    if (showLocationError && newLocation.trim().length > 0) {
      setShowLocationError(false);
    }
  };

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Clear email error if email is valid or empty
    if (showEmailError && (newEmail.trim() === "" || isValidEmail(newEmail))) {
      setShowEmailError(false);
    }
  };

  const renderDoctorsDropdown = () => {
    return (
      <div className="doctors-dropdown-container" ref={dropdownRef}>
        <div
          className="doctors-dropdown"
          style={{ display: isDropdownOpen ? "block" : "none" }}
        >
          <div className="dropdown-section">
            <div className="all-doctors-option">
              <Checkbox
                checked={selectAllDoctors}
                onChange={(e) => handleSelectAllDoctors(e.target.checked)}
                disabled={loading}
              >
                All Doctors
              </Checkbox>
            </div>
            <div className="divider">
              <span>or</span>
            </div>
            <div className="custom-doctors">
              <div className="section-title">Select Custom Doctors</div>
              {loading ? (
                <div className="doctor-option">Loading doctors...</div>
              ) : allDoctors.length > 0 ? (
                allDoctors.map((doctor) => (
                  <div
                    key={doctor.um_id}
                    className={`doctor-option ${
                      !doctor.slotsAvailable ? "disabled" : ""
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedDoctors.some((d) => d.um_id === doctor.um_id)}
                      onChange={() =>
                        doctor.slotsAvailable && handleDoctorSelect(doctor)
                      }
                      disabled={!doctor.slotsAvailable}
                    >
                      {doctor.um_name}
                      {!doctor.slotsAvailable && (
                        <span className="availability-note">
                          ( No Availability Set)
                        </span>
                      )}
                    </Checkbox>
                  </div>
                ))
              ) : (
                <div className="doctor-option">No doctors found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleLogoSave = (file) => {
    setLogoFile(file);
    // Update parent immediately when logo changes
    updateParentData(undefined, file);
  };

  const updateParentData = useCallback(
    (doctors = selectedDoctors, newLogo = logoFile) => {
      // Use the original location if user hasn't changed it, otherwise use the new location
      const finalGoogleLocation = hasLocationChanged ? googleLocation : (initialData?.fullgoogleLocation || googleLocation);
      
      onDataChange &&
        onDataChange({
          clinicName,
          logo: newLogo,
          useUploadLogo,
          contact: contactNumber,
          email,
          address,
          pincode,
          googleLocation: location,
          fullgoogleLocation: finalGoogleLocation,
          doctors, // Add selected doctors to parent data
          // receptionistId
        });
    },
    [
      clinicName,
      useUploadLogo,
      logoFile,
      contactNumber,
      email,
      location,
      locationData,
      pincode,
      address,
      selectedDoctors,
      googleLocation,
      hasLocationChanged,
      initialData?.fullgoogleLocation,
    ]
  );

  useEffect(() => {
    updateParentData();
  }, [updateParentData]);

  const handleFocus = (section) => {
    setActiveSection(section);
  };

  const handleUploadClick = () => {
    // e.stopPropagation(); // Prevent the radio selection event from firing
    if (useUploadLogo) {
      setIsLogoDrawerVisible(true);
    }
  };

  const renderPreview = () => {
    switch (activeSection) {
      case "identity":
        return (
          <div style={{width: "40%"}}>
            <SetupPreview
              name={initialData.name}
              clinicName={
                clinicName || initialData?.clinicData?.hm_name || "Clinic Name"
              }
              avatarUrl={initialData?.selectedLook?.lookUrl}
              logo={useUploadLogo ? logoFile : undefined}
              useUploadLogo={useUploadLogo}
            />
          </div>
        );
      case "doctors":
        return (
          <div style={{width: "40%"}}>
            <SummaryPreview
              setupData={{
                ...initialData,
                clinicName: clinicName,
                logo: logoFile,
                useUploadLogo,
                doctors: selectedDoctors,
              }}
            />
          </div>
        );
      case "clinic":
      default:
        return (
          <div style={{width: "40%"}}>
            <ClinicPreview
              contactNumber={contactNumber}
              email={email}
              clinicName={
                clinicName || initialData?.clinicData?.hm_name || "Clinic Name"
              }
              address={address}
              pincode={pincode}
              location={location}
              googleMapsLink={googleLocation?.address?.googleMapsLink}
              logo={logoFile}
              useUploadLogo={useUploadLogo}
            />
          </div>
        );
    }
  };

  const prefixSelector = (
    <div className="country-code">
      <span className="phone-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M18.3334 14.1V16.6C18.3344 16.8321 18.2868 17.0618 18.1938 17.2745C18.1008 17.4871 17.9644 17.678 17.7934 17.8349C17.6224 17.9918 17.4205 18.1112 17.2006 18.1856C16.9808 18.26 16.7478 18.2876 16.5167 18.2667C13.9523 17.988 11.4892 17.1118 9.32504 15.7083C7.31674 14.4289 5.60345 12.7156 4.32421 10.7073C2.91671 8.53435 2.04042 6.05916 1.76671 3.48334C1.74586 3.25287 1.77335 3.02061 1.84725 2.80138C1.92115 2.58216 2.03976 2.38079 2.19576 2.21014C2.35176 2.03949 2.54172 1.90341 2.75337 1.81052C2.96502 1.71763 3.19374 1.66995 3.42504 1.67001H5.92504C6.32959 1.66582 6.72172 1.80649 7.02812 2.06897C7.33452 2.33145 7.53506 2.69783 7.59171 3.10001C7.69753 3.90007 7.89422 4.68562 8.17504 5.44168C8.28723 5.73995 8.31137 6.06411 8.24504 6.37574C8.17871 6.68737 8.02518 6.97342 7.80004 7.20001L6.74171 8.25834C7.92807 10.3446 9.65539 12.072 11.7417 13.2583L12.8 12.2C13.0266 11.9749 13.3127 11.8213 13.6243 11.755C13.9359 11.6887 14.2601 11.7128 14.5584 11.825C15.3144 12.1058 16.1 12.3025 16.9 12.4083C17.3075 12.4654 17.6784 12.6697 17.9426 12.9812C18.2068 13.2928 18.3463 13.6906 18.3334 14.1Z"
            stroke="#667085"
            strokeWidth="1.67"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span style={{ color: "#667085", fontWeight: "500" }}>+91</span>
    </div>
  );

  return (
    <div className="clinic-details-container" style={{width : isMobile ? "90%" : "70%"}}>
      <div className="clinic-form">
        <div className="form-section">
          <label>
            Clinic Name/Logo <span className="required">*</span>
          </label>
          <div className="clinic-name-options">
            <div
              className={`option ${!useUploadLogo ? "selected" : ""}`}
              onClick={() => {
                setUseUploadLogo(false);
                handleFocus("identity");
              }}
            >
              <div className="radio-circle">
                {!useUploadLogo && <div className="radio-inner" />}
              </div>
              <Input
                className="clinic-input"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Enter clinic name"
                disabled={useUploadLogo}
                onFocus={() => handleFocus("identity")}
              />
            </div>

            <div className="or-divider">or</div>

            <div
              className={`option ${useUploadLogo ? "selected" : ""}`}
              onClick={() => {
                setUseUploadLogo(true);
                handleFocus("identity");
              }}
            >
              <div className="radio-circle">
                {useUploadLogo && <div className="radio-inner" />}
              </div>
              <div
                className="upload-button"
                // style={{width : isMobile ? "90%" : "100%"}}
                onClick={(e) => {
                  e.stopPropagation();
                  if (useUploadLogo) {
                    handleFocus("identity");
                    handleUploadClick();
                  }
                }}
              >
                <div className="upload-content">
                  {logoFile ? (
                    <div className="clinic-logo-filed">
                      <img
                        src={logoFile instanceof File ? URL.createObjectURL(logoFile) : logoFile}
                        alt="Clinic logo"
                        style={{
                          height: "25px",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  ) : (
                    <div className="clinic-upload-field">
                      <img src={uploadIcon} width={26} height={26} alt="edit" />{" "}
                      Upload Clinic Logo
                    </div>
                  )}
                </div>
                {logoFile && (<img src={editIcon} width={26} height={26} alt="edit" />)}
              </div>
            </div>

            <LogoUploadDrawer
              visible={isLogoDrawerVisible}
              onClose={() => setIsLogoDrawerVisible(false)}
              onSave={handleLogoSave}
            />
          </div>
        </div>

        <div className="form-section">
          <label>
            Enter clinic mobile number <span className="required">*</span>
            <Tooltip 
              title="This number will be shown to patients for appointment-related queries. Make sure it's active and reachable during working hours."
              overlayClassName="clinic-tooltip"
            >
              <InfoCircleOutlined className="info-icon" />
            </Tooltip>
          </label>
          <Input
            addonBefore={prefixSelector}
            value={contactNumber}
            className={`phone-input ${showContactError ? "error-input" : ""}`}
            onChange={handleContactChange}
            placeholder="Enter clinic mobile number"
            id="phone"
            maxLength={10}
            type="tel"
            autoComplete="tel-national"
            onFocus={() => handleFocus("clinic")}
            onBlur={() => {
              if (!contactNumber.trim() || contactNumber.trim().length !== 10) {
                setShowContactError(true);
              }
            }}
          />
          {showContactError && (
            <div className="error-message">
              {!contactNumber.trim() 
                ? "Please enter clinic contact number" 
                : contactNumber.trim().length !== 10 
                  ? "Please enter a valid 10-digit contact number"
                  : "Please enter clinic contact number"
              }
            </div>
          )}
        </div>

        <div className="form-section">
          <label>
            Enter clinic email ID
            <Tooltip 
              title="Patients can use this email to send queries or follow-up messages related to their appointments and consultation"
              overlayClassName="clinic-tooltip"
            >
              <InfoCircleOutlined className="info-icon" />
            </Tooltip>
          </label>
          <Input
            value={email}
            className={`phone-input ${showEmailError ? "error-input" : ""}`}
            onChange={handleEmailChange}
            placeholder="Enter clinic email ID"
            prefix={
              <img
                src={Mail}
                width={20}
                height={20}
                style={{
                  filter:
                    "brightness(0) saturate(100%) invert(47%) sepia(0%) saturate(0%) hue-rotate(152deg) brightness(98%) contrast(92%)",
                  opacity: 1,
                  margin: "0 0.5rem",
                }}
                alt="Email"
              />
            }
            onFocus={() => handleFocus("clinic")}
            onBlur={() => {
              if (email.trim() && !isValidEmail(email)) {
                setShowEmailError(true);
              }
            }}
          />
          {showEmailError && (
            <div className="error-message">
              Please enter a valid email address
            </div>
          )}
        </div>

        <div className="form-section">
          <label>
            Search your clinic location <span className="required">*</span>
            <Tooltip 
              title="Search and select your clinic's location from Google Maps so patients can easily find you online."
              overlayClassName="clinic-tooltip"
            >
              <InfoCircleOutlined className="info-icon" />
            </Tooltip>
          </label>
          <GoogleMapWithAutocomplete
            apiKey={config.GOOGLE_MAPS_API_KEY}
            hideMap={true}
            placeholder="Search & find your Clinic location"
            value={location}
            onPlaceSelect={(placeObj, googleLocation) => {
              const formattedAddress = googleLocation?.address?.formatted || placeObj?.formatted_address || '';
              setLocation(formattedAddress);
              setLocationData(placeObj); // or parse as needed
              setGoogleLocation(googleLocation); // <-- This is your API-ready object!
              setHasLocationChanged(true); // Mark that user has changed the location
              if (showLocationError) setShowLocationError(false);
            }}
          />
          {showLocationError && (
            <div className="error-message">
              Please add clinic Google location
            </div>
          )}
        </div>

        <div className="form-section" onClick={() => handleFocus("doctors")}>
          <label>
            Select Doctors whom you want to enable this Appointment{" "}
            <span className="required">*</span>
            <Tooltip 
              title="Choose which doctors should be available for booking through your AI Assistant. You can update this later anytime."
              overlayClassName="clinic-tooltip"
            >
              <InfoCircleOutlined className="info-icon" />
            </Tooltip>
          </label>
          <div
            className={`doctors-select ${
              showDoctorsError ? "error-select" : ""
            }`}
            onClick={toggleDropdown}
            onBlur={() => {
              if (!selectedDoctors.length) {
                setShowDoctorsError(true);
              }
            }}
          >
            {selectedDoctors.length > 0 ? (
              <div className="selected-doctors">
                {selectedDoctors.map((doctor) => (
                  <div key={doctor.um_id} className="doctor-chip">
                    {doctor.um_name}
                    <CloseOutlined
                      onClick={(e) => handleRemoveDoctor(doctor, e)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Checkbox
                  className="mb-0"
                  checked={selectAllDoctors}
                  onChange={(e) => handleSelectAllDoctors(e.target.checked)}
                  disabled={loading}
                />
                <span>
                  All Doctors ({allDoctors.filter((d) => d.slotsAvailable).length})
                </span>
              </div>
            )}
            <span className="dropdown-arrow">{isDropdownOpen ? "▲" : "▼"}</span>
          </div>
          {showDoctorsError && (
            <div className="error-message">
              Please select at least one doctor
            </div>
          )}
          {renderDoctorsDropdown()}
        </div>

        <div className="form-section">
          <label>
            Clinic Name
          </label>
          <Input
            readOnly
            value={initialData?.clinicData?.hm_name}
            className="phone-input readonly-input"
            style={{ backgroundColor: "#F1F1F5" }}
          />
        </div>

        <div className="form-section">
          <label>
            Clinic Pincode
          </label>
          <Input
            readOnly
            value={initialData?.clinicData?.hm_pincode}
            className="phone-input readonly-input"
            style={{ backgroundColor: "#F1F1F5" }}
            suffix={
              <span className="location" style={{ color: "#666" }}>
                {/* Bengaluru, KA */}
              </span>
            }
          />
        </div>

        <div className="form-section">
          <label>
            Clinic Address
          </label>
          <Input
            readOnly
            value={initialData?.clinicData?.hm_address}
            className="phone-input readonly-input"
            style={{ backgroundColor: "#F1F1F5" }}
          />
        </div>

      </div>
      {renderPreview()}
    </div>
  );
};

export default ClinicDetailsSetup;
