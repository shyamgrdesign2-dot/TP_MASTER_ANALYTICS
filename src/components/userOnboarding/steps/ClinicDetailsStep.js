import React, { useState, useEffect } from "react";
import { Input, message } from "antd";
import styles from "../DoctorOnboarding.module.css";

import config from "../../../config";
import { useLocation } from "react-router-dom";
import { ASSETS } from "../../../assets";
const currentLocation = ASSETS.images.currentLocation;

const { TextArea } = Input;

const ClinicDetailsStep = ({ formData, setFormData, clinicId }) => {
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [detectedLocation, setDetectedLocation] = useState("");
  const [coordsDetected, setCoordsDetected] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { state } = useLocation();
  const clinicDetails = state?.clinicDetails;

  // Listen for window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize coordsDetected based on formData
  useEffect(() => {
    if (formData.clinic_lat && formData.clinic_long) {
      setCoordsDetected(true);
    }
    // Restore detected location if it exists in formData
    if (formData.detectedLocation) {
      setDetectedLocation(formData.detectedLocation);
    }
  }, []);

  const geocodePincode = async (pincode) => {
    setLocationError(""); // Clear previous errors

    const apiKey = config.GOOGLE_MAPS_API_KEY || "";
    if (!apiKey) {
      console.warn("Google Maps API key not found for pincode geocoding.");
      setLocationError("Geocoding service is not configured.");
      setFormData((prev) => ({ ...prev, clinic_lat: "", clinic_long: "" }));
      setCoordsDetected(false);
      return;
    }
    setIsDetectingLocation(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${pincode}|country:IN&key=${apiKey}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components;
        const { lat, lng } = result.geometry.location;

        setFormData((prev) => ({
          ...prev,
          clinic_lat: lat.toString(),
          clinic_long: lng.toString(),
        }));
        setCoordsDetected(true);

        let city = "";
        let state = "";

        components.forEach((component) => {
          const types = component.types;
          if (types.includes("locality")) {
            city = component.long_name;
          } else if (types.includes("administrative_area_level_1")) {
            state = component.long_name;
          }
        });

        if (!city) {
          const sublocalityComponent = components.find(
            (c) =>
              c.types.includes("sublocality") ||
              c.types.includes("sublocality_level_1")
          );
          if (sublocalityComponent) city = sublocalityComponent.long_name;
          else {
            const adminArea2Component = components.find((c) =>
              c.types.includes("administrative_area_level_2")
            );
            if (adminArea2Component) city = adminArea2Component.long_name;
          }
        }
        if (!city) {
          const postalTownComponent = components.find((c) =>
            c.types.includes("postal_town")
          );
          if (postalTownComponent) city = postalTownComponent.long_name;
        }

        if (city && state) {
          setDetectedLocation(`${city}, ${state}`);
          setLocationError("");
          // Store detected location in formData for persistence
          setFormData((prev) => ({
            ...prev,
            detectedLocation: `${city}, ${state}`,
          }));
        } else if (city) {
          setDetectedLocation(city);
          setLocationError("");
          // Store detected location in formData for persistence
          setFormData((prev) => ({
            ...prev,
            detectedLocation: city,
          }));
        } else if (state) {
          setDetectedLocation(state);
          setLocationError("");
          // Store detected location in formData for persistence
          setFormData((prev) => ({
            ...prev,
            detectedLocation: state,
          }));
        } else {
          let fallbackLocation = "";
          const formattedAddress = result.formatted_address;
          if (formattedAddress) {
            const parts = formattedAddress.split(", ");
            const displayableParts = parts.filter(
              (part) =>
                part.trim() !== pincode && part.trim().toLowerCase() !== "india"
            );
            if (displayableParts.length > 0) {
              fallbackLocation = displayableParts.join(", ");
            } else {
              fallbackLocation = formattedAddress;
            }
          }
          if (fallbackLocation) {
            setDetectedLocation(fallbackLocation);
            // Store detected location in formData for persistence
            setFormData((prev) => ({
              ...prev,
              detectedLocation: fallbackLocation,
            }));
          } else {
            setDetectedLocation("Location found, details unclear.");
            setLocationError(
              "Could not extract city/state from geocoding result."
            );
            // Store detected location in formData for persistence
            setFormData((prev) => ({
              ...prev,
              detectedLocation: "Location found, details unclear.",
            }));
          }
        }
      } else if (data.status === "ZERO_RESULTS") {
        setDetectedLocation("");
        setLocationError(
          `No location found for pincode ${pincode}. Please check the pincode.`
        );
        // Clear detected location from formData
        setFormData((prev) => ({
          ...prev,
          clinic_lat: "",
          clinic_long: "",
          detectedLocation: "",
        }));
        setCoordsDetected(false);
      } else {
        console.warn(
          "Google Geocoding API error (Pincode):",
          data.status,
          data.error_message
        );
        setDetectedLocation("");
        setLocationError(
          `Geocoding error: ${
            data.error_message || data.status
          }. Please try again.`
        );
        // Clear detected location from formData
        setFormData((prev) => ({ ...prev, detectedLocation: "" }));
        setCoordsDetected(false);
      }
    } catch (error) {
      console.error("Error in geocoding pincode:", error);
      setDetectedLocation("");
      setLocationError(
        "Failed to fetch location data. Please check your network."
      );
      // Clear detected location from formData
      setFormData((prev) => ({ ...prev, detectedLocation: "" }));
      setCoordsDetected(false);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "clinicPincode") {
      const sanitizedValue = value.replace(/[^0-9]/g, "").slice(0, 6);
      setFormData((prev) => ({ ...prev, [name]: sanitizedValue })); // Update pincode first

      if (sanitizedValue.length === 6) {
        geocodePincode(sanitizedValue);
      } else if (sanitizedValue.length < 6) {
        setDetectedLocation("");
        setLocationError("");
        // Clear detected location from formData when pincode is incomplete
        setFormData((prev) => ({ ...prev, detectedLocation: "" }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDetectLocation = () => {
    setIsDetectingLocation(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Get coordinates
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        console.log("Location detected:", latitude, longitude);
        // Store coordinates in formData - these will be sent to the API when user clicks Next
        setFormData({
          ...formData,
          clinic_lat: latitude.toString(),
          clinic_long: longitude.toString(),
        });

        // Set coordinates as detected - this will hide the button
        setCoordsDetected(true);

        // Get reverse geocoding data including pincode, city, and state
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation error:", error.code, error.message);

        // Provide more specific error messages based on error code
        let errorMsg =
          "Unable to get your location. Please enter address manually.";

        if (error.code === 1) {
          errorMsg =
            "Location permission denied. Please check your browser settings.";
        } else if (error.code === 2) {
          errorMsg =
            "Location unavailable. Please try again or enter address manually.";
        } else if (error.code === 3) {
          errorMsg = "Location request timed out. Please try again.";
        }

        setLocationError(errorMsg);
        setIsDetectingLocation(false);

        // Show a user-friendly message
        message.error(
          "Location detection failed. Please enter your pincode manually."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Enhanced reverse geocoding to get pincode, city and state
  const reverseGeocode = async (latitude, longitude) => {
    try {
      // Google Maps Geocoding API
      const apiKey = config.GOOGLE_MAPS_API_KEY || ""; // Make sure to add this to your config

      if (!apiKey) {
        console.warn("Google Maps API key not found");
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );

      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components;

        let pincode = "";
        let city = "";
        let state = "";
        // let streetAddress = "";

        // Extract address components
        components.forEach((component) => {
          const types = component.types;

          if (types.includes("postal_code")) {
            pincode = component.long_name;
          } else if (types.includes("locality")) {
            city = component.long_name;
          } else if (types.includes("administrative_area_level_1")) {
            state = component.long_name;
          }
        });

        // If city wasn't found in locality, check for sublocality or administrative_area_level_2
        if (!city) {
          const sublocalityComponent = components.find(
            (component) =>
              component.types.includes("sublocality") ||
              component.types.includes("sublocality_level_1")
          );

          if (sublocalityComponent) {
            city = sublocalityComponent.long_name;
          } else {
            const adminArea2Component = components.find((component) =>
              component.types.includes("administrative_area_level_2")
            );

            if (adminArea2Component) {
              city = adminArea2Component.long_name;
            }
          }
        }

        // Update form with pincode
        if (pincode) {
          setFormData((prev) => ({
            ...prev,
            clinicPincode: pincode,
          }));
        }

        // Set the detected location for display
        if (city && state) {
          setDetectedLocation(`${city}, ${state}`);
          // Store detected location in formData for persistence
          setFormData((prev) => ({
            ...prev,
            detectedLocation: `${city}, ${state}`,
          }));
        }

        return true;
      } else {
        console.warn("Google Geocoding API error or no results:", data.status);
      }
    } catch (error) {
      console.error("Error in Google Maps geocoding:", error);
    }
  };

  return (
    <div>
      <div className={styles.inputField}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            color: "#454551",
            fontFamily: "Poppins",
            fontSize: "0.875rem",
            fontStyle: "normal",
            fontWeight: 400,
            lineHeight: "1.25rem",
          }}
        >
          Clinic Name
          <span className={styles.requiredAsterisk}>*</span>
        </label>
        <Input
          placeholder="Enter your Clinic Name"
          name="clinicName"
          value={formData.clinicName}
          onChange={handleInputChange}
          size="large"
          status={formData.clinicName ? "" : "error"}
          style={{
            width: "100%",
            height: "3.5rem",
            borderRadius: "6px",
            borderColor: formData.clinicName ? "#d1d5db" : "#E2E2EA",
            fontSize: "16px",
          }}
          className={styles.focusedInput}
          disabled={clinicDetails || clinicId}
        />
      </div>

      <div className={styles.inputField}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            color: "#454551",
            fontFamily: "Poppins",
            fontSize: "0.875rem",
            fontStyle: "normal",
            fontWeight: 400,
            lineHeight: "1.25rem",
          }}
        >
          Clinic Pincode
          <span className={styles.requiredAsterisk}>*</span>
        </label>
        <div style={{ position: "relative" }}>
          <Input
            placeholder="Enter your Clinic pincode"
            name="clinicPincode"
            value={formData.clinicPincode}
            onChange={handleInputChange}
            size="large"
            status={formData.clinicPincode ? "" : "error"}
            style={{
              width: "100%",
              height: "3.5rem",
              borderRadius: "6px",
              borderColor: formData.clinicPincode ? "#d1d5db" : "#E2E2EA",
              fontSize: "16px",
            }}
            className={styles.focusedInput}
            suffix={
              !coordsDetected && (
                <div
                  className={styles.detectLocationButton}
                  onClick={handleDetectLocation}
                  style={{
                    cursor: "pointer",
                    marginRight: "-7px",
                    pointerEvents: "auto",
                  }}
                >
                  <img src={currentLocation} alt="Current Location" />
                  <span className={styles.detectLocationText}>
                    {isDetectingLocation ? "Detecting..." : "Detect Location"}
                  </span>
                </div>
              )
            }
            disabled={clinicDetails || clinicId}
          />
          {detectedLocation && (
            <div
              style={{
                position: "absolute",
                right: coordsDetected ? "12px" : "150px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#A2A2A8",
                fontSize: "1rem",
                pointerEvents: "none",
              }}
            >
              {detectedLocation}
            </div>
          )}
        </div>
        {locationError && (
          <div style={{ color: "#ff4d4f", fontSize: "12px", marginTop: "4px" }}>
            {locationError}
          </div>
        )}
      </div>

      <div className={styles.inputField}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            color: "#454551",
            fontFamily: "Poppins",
            fontSize: "0.875rem",
            fontStyle: "normal",
            fontWeight: 400,
            lineHeight: "1.25rem",
          }}
        >
          Clinic Address
        </label>
        <TextArea
          placeholder="Enter your Clinic Address ( Building, Street etc)"
          name="clinicAddress"
          value={formData.clinicAddress}
          onChange={handleInputChange}
          rows={isMobile ? 2 : 1}
          style={{
            width: "100%",
            borderRadius: "6px",
            borderColor: "#d1d5db",
            fontSize: "16px",
            resize: "none",
            padding: isMobile ? "12px" : "0.875rem",
            minHeight: isMobile ? "auto" : "3.5rem",
            lineHeight: "1.5",
          }}
          className={styles.focusedInput}
          disabled={clinicDetails || clinicId}
        />
      </div>
    </div>
  );
};

export default ClinicDetailsStep;
