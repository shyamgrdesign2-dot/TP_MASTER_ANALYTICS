import React, { useState, useEffect, useCallback, useRef } from "react";
import { notification } from "antd";

import ApiAbha from "../../../api/services/ApiAbha";
import ErrorText from "../common/ErrorText";
import "../AbhaDrawer.scss";
import { getAbhaDomainSuffix } from "../helpers";

const CreateNewAbhaAddress = ({
  data = {},
  onCreateAddress = () => {},
  onSuccess = () => {},
  onGoBack = () => {},
}) => {
  const { txnId = "", tokens = {}, patient_unique_id = "" } = data;
  const { token: accessToken = "" } = tokens;
  const [suggestions, setSuggestions] = useState([]);
  const [address, setAddress] = useState("");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const debounceTimerRef = useRef(null);

  // Fetch suggestions from API
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!txnId || !accessToken) {
        console.error("txnId or accessToken is missing");
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const response = await ApiAbha.getSuggestionAbhaAddressList({
          txnId,
          accessToken,
        });

        if (response?.success && response?.data?.abhaAddressList) {
          const suggestionList = response.data.abhaAddressList;
          setSuggestions(suggestionList);
          // Set first suggestion as default
          if (suggestionList.length > 0) {
            setAddress(suggestionList[0]);
          }
        } else {
          // Fallback to default suggestions
          setSuggestions([]);
          setAddress("");
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        notification.error({
          message: "Error",
          description: "Failed to load ABHA address suggestions",
        });
        // Fallback to default suggestions
        setSuggestions([]);
        setAddress("");
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [txnId, accessToken]);

  // Check ABHA address availability
  const checkAvailability = useCallback(async (abhaAddress) => {
    if (!abhaAddress || abhaAddress.length < 8) {
      setIsAvailable(false);
      setAvailabilityError("");
      return;
    }

    setIsCheckingAvailability(true);
    setAvailabilityError("");

    try {
      const response = await ApiAbha.checkAbhaAddressAvailability({
        abhaAddress: abhaAddress,
      });

      if (response?.success) {
        const exists = response.isAbhaIdExists;
        setIsAvailable(!exists);

        if (exists) {
          setAvailabilityError(
            "This ABHA address is already taken. Please try another one."
          );
        } else {
          setAvailabilityError("");
        }
      } else {
        setIsAvailable(false);
        setAvailabilityError("Failed to check availability. Please try again.");
      }
    } catch (error) {
      console.error("Failed to check availability:", error);
      setIsAvailable(false);
      setAvailabilityError("Failed to check availability. Please try again.");
    } finally {
      setIsCheckingAvailability(false);
    }
  }, []);

  // Debounce effect for availability check
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Reset states immediately when address changes
    setAvailabilityError("");
    setIsAvailable(false);

    // Don't check if address is too short
    if (address.length < 8) {
      return;
    }

    // Set new timer for debounced check
    debounceTimerRef.current = setTimeout(() => {
      checkAvailability(address);
    }, 500); // 500ms debounce delay

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [address, checkAvailability]);

  const handleAddressChange = (e) => {
    const value = e.target.value;
    if (value.length <= 18) {
      setAddress(value);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setAddress(suggestion);
  };

  const handleCreateAddress = useCallback(async () => {
    if (!address || !isAvailable) {
      return;
    }

    try {
      const response = await ApiAbha.setAbhaAddress({
        patient_unique_id,
        txnId,
        abhaAddress: address,
        userToken: accessToken,
        accessToken,
      });

      if (response?.success) {
        // Close drawer on success
        if (response?.data?.abhaAddress && response?.data?.abhaInsertId) {
          onSuccess({
            linkedAddress: response?.data?.abhaAddress,
            insertId: response?.data?.abhaInsertId,
            ...response?.data,
          });
        } else {
          onSuccess();
        }
      } else {
        notification.error({
          message: "Failed to create ABHA address",
          description: response?.message || "Please try again",
        });
      }
    } catch (error) {
      notification.error({
        message: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to create ABHA address. Please try again.",
      });
    }
  }, [address, isAvailable, patient_unique_id, txnId, accessToken, onSuccess]);

  const isAddressValid =
    address.length >= 8 &&
    address.length <= 18 &&
    isAvailable &&
    !isCheckingAvailability;

  useEffect(() => {
    // Update parent about address validity and create function
    onCreateAddress(() => handleCreateAddress(), isAddressValid);
  }, [handleCreateAddress, isAddressValid, onCreateAddress]);

  return (
    <div className="create_abha_address">
      <div className="abha_address_header_container">
        <h1 className="abha_address_title">Create New ABHA address</h1>
        <p className="abha_address_subtitle">
          Create a new ABHA address to link with your ABHA account
        </p>
      </div>

      <div className="abha_address_input_container">
        <label className="abha_address_label">ABHA Address</label>
        <div className="abha_address_input_wrapper">
          <input
            type="text"
            className={`abha_address_input ${availabilityError ? "error" : ""}`}
            value={address}
            onChange={handleAddressChange}
            maxLength={18}
          />
          <span className="abha_address_suffix">{getAbhaDomainSuffix()}</span>
        </div>
        {isCheckingAvailability && (
          <p className="abha_address_hint" style={{ color: "#1890ff" }}>
            Checking availability...
          </p>
        )}
        {!isCheckingAvailability && availabilityError && (
          <ErrorText errorText={availabilityError} />
        )}
        {!isCheckingAvailability &&
          !availabilityError &&
          address.length >= 8 &&
          isAvailable && (
            <p className="abha_address_hint" style={{ color: "#52c41a" }}>
              ✓ This ABHA address is available
            </p>
          )}
        {!isCheckingAvailability &&
          !availabilityError &&
          address.length >= 0 &&
          address.length < 8 && (
            <p className="abha_address_hint">
              8-18 characters alphabets and numbers only
            </p>
          )}
      </div>

      <div className="abha_address_suggestions_container">
        <p className="abha_address_suggestions_heading">
          Here are some suggestions you can use:
        </p>
        {isLoadingSuggestions ? (
          <div className="abha_address_suggestions_loading">
            Loading suggestions...
          </div>
        ) : (
          <div className="abha_address_suggestions_list">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className={`abha_address_suggestion_button ${
                  address === suggestion ? "selected" : ""
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="abha_address_selection_divider">
        <span className="divider_line" />
      </div>

      <button
        type="button"
        className="abha_address_create_button"
        onClick={onGoBack}
      >
        Go Back
      </button>
    </div>
  );
};

export default CreateNewAbhaAddress;
