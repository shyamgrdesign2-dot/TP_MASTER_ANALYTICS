import React, { useState, useEffect, useCallback } from "react";
import { notification } from "antd";

import ApiAbha from "../../../api/services/ApiAbha";
import { ASSETS } from "../../../assets";
const {
  abhaSvg: AbhaIcon,
  add: AddIcon,
} = ASSETS.images;

const AbhaAddress = ({
  data = {},
  onLinkAbha = () => {},
  onCreateNew = () => {},
  onGoBack = () => {},
  isMobileLinking = false,
  isAbhaAddressLinking = false,
}) => {
  const {
    ABHAProfile = {},
    patient_unique_id = "",
    users = [],
    tokens = {},
  } = data;
  const { firstName = "", lastName = "", phrAddress = [] } = ABHAProfile;

  // Create address list - handle both mobile/address linking (users array) and ABHA creation (phrAddress array)
  let abhaAddresses = [];

  if ((isMobileLinking || isAbhaAddressLinking) && users.length > 0) {
    // Mobile/Address linking flow - use users array
    abhaAddresses = users.map((user) => ({
      id: user.abhaAddress,
      name: user.fullName || "User",
      handle: user.abhaAddress,
      abhaNumber: user.abhaNumber,
      status: user.status,
      kycStatus: user.kycStatus,
    }));
  } else if (phrAddress.length > 0) {
    // ABHA creation flow - use phrAddress array
    abhaAddresses = phrAddress.map((address) => ({
      id: address,
      name: `${firstName} ${lastName}`.trim() || "User",
      handle: address,
    }));
  }

  const [selectedAddress, setSelectedAddress] = useState(
    abhaAddresses.length > 0 ? abhaAddresses[0].id : ""
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleLinkAbha = useCallback(async () => {
    if (!selectedAddress) {
      return;
    }

    setIsLoading(true);
    try {
      if (isMobileLinking || isAbhaAddressLinking) {
        // For mobile/address linking, call verify ABHA address user API
        const response = await ApiAbha.verifyAbhaAddressUser({
          abhaAddress: selectedAddress,
          patient_unique_id,
          txnId: data.txnId || "",
          userToken: tokens?.token || "",
        });

        if (response?.success) {
          return {
            success: true,
            abhaAddress: response.data?.abhaAddress,
            abhaInsertId: response.data?.abhaInsertId,
            ...response?.data,
          };
        } else {
          notification.error({
            message: "Error",
            description:
              response?.message || "Failed to link ABHA. Please try again.",
          });
          return { success: false };
        }
      } else {
        // For ABHA creation flow, send OTP
        const response = await ApiAbha.sendOtpForAbhaAddress({
          patient_unique_id,
          abhaAddress: selectedAddress,
        });

        if (response?.success) {
          // Return response data to trigger navigation
          return {
            success: true,
            txnId: response.data?.txnId,
            otpMessage: response.message,
          };
        } else {
          notification.error({
            message: "Error",
            description:
              response?.message || "Failed to send OTP. Please try again.",
          });
        }
      }
    } catch (error) {
      notification.error({
        message: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to link ABHA. Please try again.",
      });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedAddress,
    patient_unique_id,
    isMobileLinking,
    isAbhaAddressLinking,
    data.txnId,
    tokens,
  ]);

  useEffect(() => {
    // Update parent about selection validity and link function
    const linkData = {
      ...data,
      selectedAbhaAddress: selectedAddress,
    };
    onLinkAbha(handleLinkAbha, selectedAddress !== "", isLoading, linkData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress, isLoading, handleLinkAbha]);

  return (
    <div className="abha_address_selection">
      <div className="abha_address_selection_header">
        <h1 className="abha_address_selection_title">
          We found {abhaAddresses.length} ABHA Address
        </h1>
        <p className="abha_address_selection_subtitle">
          Please select one to link with your account
        </p>
      </div>

      <div className="abha_address_selection_list">
        {abhaAddresses.map((address) => (
          <label
            key={address.id}
            className={`abha_address_card ${
              selectedAddress === address.id ? "selected" : ""
            }`}
          >
            <input
              type="radio"
              name="abha_address"
              value={address.id}
              checked={selectedAddress === address.id}
              onChange={() => setSelectedAddress(address.id)}
            />
            <div className="abha_address_card_content">
              <span
                className={`abha_radio_indicator ${
                  selectedAddress === address.id ? "checked" : ""
                }`}
                aria-hidden="true"
              >
                <span className="abha_radio_indicator_dot" />
              </span>
              <div className="abha_address_card_text">
                <span className="abha_address_card_name">{address.name}</span>
                <span className="abha_address_card_value">
                  Address : <span>{address.handle}</span>
                </span>
              </div>
              <span className="abha_leaf_icon" aria-hidden="true">
                <img src={AbhaIcon} alt="ABHA" />
              </span>
            </div>
          </label>
        ))}
      </div>
      {!isAbhaAddressLinking && !isMobileLinking && (
        <>
          <div className="abha_address_selection_divider">
            <span className="divider_line" />
            <span className="divider_text">or</span>
            <span className="divider_line" />
          </div>

          <button
            type="button"
            className="abha_address_create_button"
            onClick={onCreateNew}
          >
            <img src={AddIcon} alt="Add" />
            Create New ABHA Address
          </button>
        </>
      )}
    </div>
  );
};

export default AbhaAddress;
