import React, { useState, useEffect, useRef } from "react";
import { Button, Dropdown } from "antd";

import { isMobile, isTablet } from "react-device-detect";
import { isZydus } from "../utils/utils";
import { useFeatureIsOn } from '@growthbook/growthbook-react';
import { GB_TAB_RX, GB_CVT_EXT_HOS } from "../utils/constants";
import { ASSETS } from "../assets";
const smartPad = ASSETS.images.smartpad;

/**
 * PrimaryActionButton Component
 * 
 * A reusable component that renders a primary action button with dropdown for additional options.
 * Handles the priority-based rendering: SmartRx > TabRx > VoiceRx > SnapRx > Consult
 * Special case: For Zydus accounts, Consult is always primary and other options go to dropdown
 * 
 * @param {Object} props
 * @param {boolean} props.isSmartRxAccessible - Whether SmartRx is accessible
 * @param {boolean} props.isSnapRxAccessible - Whether SnapRx is accessible
 * @param {boolean} props.isVoiceRxAccessible - Whether VoiceRx is accessible (isFreeVoiceRxUser || tp_monetization_enable)
 * @param {boolean} props.isVoiceRxPaid - Whether VoiceRx is paid (affects button text)
 * @param {boolean} props.isTabRxAccessible - Whether TabRx is accessible
 * @param {Function} props.onSmartRxClick - Handler for SmartRx click
 * @param {Function} props.onSnapRxClick - Handler for SnapRx click
 * @param {Function} props.onVoiceRxClick - Handler for VoiceRx click
 * @param {Function} props.onTabRxClick - Handler for TabRx click
 * @param {Function} props.onConsultClick - Handler for Consult click
 * @param {Object} props.patient - Patient/record data to pass to handlers
 * @param {Function} props.setAutoCompleteFlag - Optional: Function to set auto complete flag (for WalkInConsultation)
 * @param {string} props.buttonStyle - Button style variant: 'walkin' (default) or 'cardiology'
 * @param {Function} props.onClose - Optional: Function to call when closing (for Cardiology modal)
 * @param {boolean} props.fullWidth - Optional: Whether button should take full width (for modal use)
 */
const PrimaryActionButton = ({
  isSmartRxAccessible = false,
  isSnapRxAccessible = false,
  isVoiceRxAccessible = false,
  isVoiceRxPaid = false,
  // isTabRxAccessible = false,
  onSmartRxClick,
  onSnapRxClick,
  onVoiceRxClick,
  onTabRxClick,
  onConsultClick,
  patient,
  setAutoCompleteFlag,
  buttonStyle = "walkin", // 'walkin' or 'cardiology'
  onClose,
  fullWidth = false,
}) => {
  // Check if mobile (screen width < 768)
  const [isMobileScreen, setIsMobileScreen] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  const buttonRef = useRef(null);
  const [dropdownWidth, setDropdownWidth] = useState("7.3rem");

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    const updateDropdownWidth = () => {
      if (fullWidth && buttonRef.current) {
        const width = buttonRef.current.offsetWidth;
        setDropdownWidth(`${width}px`);
      } else {
        setDropdownWidth("7.3rem");
      }
    };

    updateDropdownWidth();

    if (fullWidth && typeof window !== "undefined") {
      window.addEventListener("resize", updateDropdownWidth);
      return () => window.removeEventListener("resize", updateDropdownWidth);
    }
  }, [fullWidth]);

  // Check if this is a Zydus account
  const isZydusAccount = isZydus();

  // Determine available options based on priority: SmartRx > TabRx > VoiceRx > SnapRx > Consult
  // Special handling: 
  // 1. If VoiceRx is accessible but not paid, Consult becomes primary and VoiceRx goes to dropdown
  // 2. For Zydus accounts, Consult is always primary and all other options go to dropdown
  const allAvailableOptions = [];
  const dropdownOptionsList = [];

  // TabRx should be shown only on tablet devices (not on laptops or mobiles)

  const isTabRxEnabledFromGB = useFeatureIsOn(GB_TAB_RX);
  const isTabRxVisible = isTabRxEnabledFromGB && isMobile;
  // const isTabRxVisible = isTabRxEnabledFromGB ;

  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);

  // External hospital mode: only SmartRx — no Voice/Snap/Tab/Consult (desktop or mobile)
  if (isCvtExtHosAccessableFromGB) {
    if (isSmartRxAccessible) {
      allAvailableOptions.push({ type: "smartrx", label: "SmartRx", handler: onSmartRxClick });
    }
  } else if (isZydusAccount) {
    // For Zydus accounts: Consult is always primary, all other options go to dropdown
    if (isSmartRxAccessible && !isMobile) {
      dropdownOptionsList.push({ type: "smartrx", label: "SmartRx", handler: onSmartRxClick });
    }
    if (isTabRxVisible) {
      dropdownOptionsList.push({ type: "tabrx", label: "TabRx", handler: onTabRxClick });
    }
    if (isVoiceRxAccessible) {
      dropdownOptionsList.push({ type: "voicerx", label: "VoiceRx", handler: onVoiceRxClick });
    }
    if (isSnapRxAccessible) {
      dropdownOptionsList.push({ type: "snaprx", label: "SnapRx", handler: onSnapRxClick });
    }
    // Consult is always primary for Zydus
    allAvailableOptions.push({ type: "consult", label: "Consult", handler: onConsultClick });
  } else {
    // Normal priority logic: SmartRx > TabRx > VoiceRx > SnapRx > Consult
    if (isSmartRxAccessible && !isMobile) {
      allAvailableOptions.push({ type: "smartrx", label: "SmartRx", handler: onSmartRxClick });
    }
    
    // TabRx is second priority after SmartRx
    if (isTabRxVisible) {
      allAvailableOptions.push({ type: "tabrx", label: "TabRx", handler: onTabRxClick });
    }
    
    // Handle VoiceRx: If paid, it's primary; if not paid, Consult is primary and VoiceRx goes to dropdown
    if (isVoiceRxAccessible && isVoiceRxPaid) {
      allAvailableOptions.push({ type: "voicerx", label: "VoiceRx", handler: onVoiceRxClick });
    }
    
    if (isSnapRxAccessible) {
      allAvailableOptions.push({ type: "snaprx", label: "SnapRx", handler: onSnapRxClick });
    }
    
    // Consult is always available as fallback
    // If VoiceRx is accessible but not paid, Consult becomes primary
    allAvailableOptions.push({ type: "consult", label: "Consult", handler: onConsultClick });
    
    // If VoiceRx is accessible but not paid, add it to dropdown (after Consult)
    if (isVoiceRxAccessible && !isVoiceRxPaid) {
      allAvailableOptions.push({ type: "voicerx", label: "VoiceRx", handler: onVoiceRxClick });
    }
  }

  // Primary button is the first available option (highest priority)
  const primaryOption = allAvailableOptions[0];
  // Dropdown options: For Zydus, use dropdownOptionsList; otherwise, use remaining options from allAvailableOptions
  const dropdownOptions = isZydusAccount ? dropdownOptionsList : allAvailableOptions.slice(1);

  if (!primaryOption) {
    return null;
  }

  // Generate dropdown menu items - following priority order: SmartRx > TabRx> VoiceRx > SnapRx > Consult
  const getMenuItems = () => {
    if (dropdownOptions.length === 0) return [];

    const items = [];
    
    // Iterate through dropdownOptions in priority order (already sorted correctly)
    dropdownOptions.forEach((option) => {
      const handleClick = () => {
        if (setAutoCompleteFlag) setAutoCompleteFlag(false);
        if (onClose) onClose();
        if (option.handler && patient) option.handler(patient);
      };

      // Determine label text based on option type
      let labelText = option.label;
      if (option.type === "voicerx") {
        labelText = "Voice Rx";
      }

      items.push({
        label: labelText,
        key: option.type,
        onClick: handleClick,
      });
    });

    return items;
  };

  // Handle primary button click
  const handlePrimaryClick = () => {
    if (setAutoCompleteFlag) {
      setAutoCompleteFlag(false);
    }
    if (onClose) {
      onClose();
    }
    if (primaryOption.handler && patient) {
      primaryOption.handler(patient);
    }
  };

  // Get primary button text
  const getPrimaryButtonText = () => {
    if (primaryOption.type === "smartrx" || primaryOption.type === "snaprx" || primaryOption.type === "tabrx") {
      return primaryOption.label;
    }
    if (primaryOption.type === "voicerx") {
      return "Voice Rx";
    }
    return "Consult";
  };

  // If mobile screen, show simple button without dropdown
  if (isMobileScreen) {
    if (primaryOption.type === "smartrx" || primaryOption.type === "snaprx" || primaryOption.type === "tabrx") {
      return (
        <div style={{ paddingLeft: "6px" }} onClick={handlePrimaryClick}>
          {/* <img src={smartPad} alt="vitals" /> */}
          <button className="btn btn-smartRx-text">{primaryOption.label}</button>
        </div>
      );
    } else {
      return (
        <div style={{ paddingLeft: "6px" }} onClick={handlePrimaryClick}>
          {/* <img src={smartPad} alt="vitals" /> */}
          <button className="btn btn-smartRx-text">{getPrimaryButtonText()}</button>
        </div>
      );
    }
  }

  // Desktop view: Show primary button + dropdown
  // If only one option (only Consult), show just the button without dropdown
  if (dropdownOptions.length === 0) {
    const singleButtonStyle = fullWidth
      ? {
          width: "100%",
          display: "flex",
          alignItems: "center",
          paddingLeft: "6px",
          justifyContent: "flex-start"
        }
      : { paddingLeft: "0px" };
    
    if (primaryOption.type === "smartrx" || primaryOption.type === "snaprx" || primaryOption.type === "tabrx") {
      return (
        <div 
          ref={buttonRef}
          className="d-flex btn btn-smart-rx-walkin"
          style={fullWidth ? { width: "100%", position: "relative", zIndex: 1 } : { position: "relative", zIndex: 1 }}
        >
          <div style={singleButtonStyle} onClick={handlePrimaryClick}>
            {/* <img src={smartPad} alt="vitals" /> */}
            <button 
              className="btn btn-smartRx-text"
              style={fullWidth ? { width: "100%", textAlign: "left" } : {}}
            >
              {primaryOption.label}
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div 
          ref={buttonRef}
          className="d-flex btn btn-smart-rx-walkin"
          style={fullWidth ? { width: "100%", position: "relative", zIndex: 1 } : { position: "relative", zIndex: 1 }}
        >
          <div style={singleButtonStyle} onClick={handlePrimaryClick}>
            {/* <img src={smartPad} alt="vitals" /> */}
            <button 
              className="btn btn-smartRx-text"
              style={fullWidth ? { width: "100%", textAlign: "left" } : {}}
            >
              {getPrimaryButtonText()}
            </button>
          </div>
        </div>
      );
    }
  }

  // Multiple options: Show primary button + dropdown
  if (buttonStyle === "cardiology") {
    // Cardiology style: Render only dropdown options (primary is handled by parent)
    if (dropdownOptions.length === 0) return null;
    
    return (
      <div>
        {dropdownOptions.map((option, index) => {
          const handleClick = () => {
            if (onClose) {
              onClose();
            }
            if (option.handler && patient) {
              option.handler(patient);
            }
          };

          const isFirst = index === 0;
          const isLast = index === dropdownOptions.length - 1;
          let className = "smart-rx-buttons";
          
          // Determine className based on position and options
          if (isFirst) {
            // First dropdown option
            if (option.type === "snaprx" && primaryOption.type === "smartrx") {
              className += " top-br bottom-border";
            } else if (dropdownOptions.length > 1) {
              className += " bottom-border";
            }
          } else if (!isLast) {
            className += " bottom-border";
          }
          // Last option doesn't need bottom-border (it's the last)

          const getButtonText = () => {
            if (option.type === "smartrx") return "Start New SmartRx";
            if (option.type === "snaprx") return "Start New SnapRx";
            if (option.type === "voicerx") return "Start Voice Rx";
            if (option.type === "tabrx") return "Start TabRx";
            return "Start New Consult";
          };

          return (
            <div key={option.type}>
              <button className={className} onClick={handleClick}>
                <span style={{ padding: "0 3.4rem" }}>{getButtonText()}</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  // WalkIn style: Primary button + dropdown arrow
  const containerStyle = fullWidth 
    ? { 
        width: "100%", 
        justifyContent: "space-between",
        position: "relative"
      } 
    : {};
  
  const primaryButtonStyle = fullWidth
    ? {
        width: "80%",
        display: "flex",
        alignItems: "center",
        paddingLeft: "6px",
        justifyContent: "flex-start"
      }
    : { paddingLeft: "6px" };

  const dropdownMenuStyle = {
    width: dropdownWidth,
    marginTop: fullWidth ? "0.3rem" : "-0.8rem",
    marginRight: fullWidth ? "1.5rem" :"-0.5rem",
    left: fullWidth ? "1rem" : "-5px;"
  };

  // Determine placement based on fullWidth
  const dropdownPlacement = fullWidth ? "bottomRight" : "bottomRight";

  return (
    <div 
      ref={buttonRef}
      className="d-flex btn btn-smart-rx-walkin"
      style={{ ...containerStyle, position: "relative", zIndex: 1 }}
    >
      {primaryOption.type === "smartrx" || primaryOption.type === "snaprx" || primaryOption.type === "tabrx" ? (
        <div style={dropdownOptions.length === 0 ? { ...primaryButtonStyle, width: fullWidth ? "100%" : undefined } : primaryButtonStyle} onClick={handlePrimaryClick}>
          {/* <img src={smartPad} alt="vitals" /> */}
          <button 
            className="btn btn-smartRx-text"
            style={fullWidth ? { width: "100%", textAlign: "left" } : {}}
          >
            {primaryOption.label}
          </button>
        </div>
      ) : (
        <div style={dropdownOptions.length === 0 ? { ...primaryButtonStyle, width: fullWidth ? "100%" : undefined } : primaryButtonStyle} onClick={handlePrimaryClick}>
          {/* <img src={smartPad} alt="vitals" /> */}
          <button 
            className="btn btn-smartRx-text"
            style={fullWidth ? { width: "100%", textAlign: "left" } : {}}
          >
            {getPrimaryButtonText()}
          </button>
        </div>
      )}

      {dropdownOptions.length > 0 && (
        <>
          <div
            style={{
              width: "1px",
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              height: "100%",
              margin: fullWidth ? "0 4px" : "0 4px",
              flexShrink: 0
            }}
          />

          <div 
            className="consult-btns-group" 
            style={{ 
              ...(fullWidth ? { width: "20%", display: "flex", justifyContent: "center", alignItems: "center" } : {}),
              position: "relative",
              zIndex: 1000
            }}
          >
            <Dropdown
              menu={{
                items: getMenuItems(),
                style: dropdownMenuStyle,
              }}
              trigger={["click"]}
              placement={dropdownPlacement}
              overlayStyle={fullWidth ? { 
                width: dropdownWidth, 
                minWidth: dropdownWidth,
                zIndex: 1050
              } : {
                zIndex: 1050
              }}
              overlayClassName="primary-action-dropdown"
              getPopupContainer={(trigger) => {
                // For autocomplete rows, render to body to avoid clipping
                // For modal (fullWidth), also render to body for proper positioning
                return document.body;
              }}
            >
              <a
                onClick={(e) => {
                  e.preventDefault();
                }}
                style={{ padding: "5px" }}
              >
                <i
                  className="icon-right"
                  style={{
                    display: "block",
                    transform: `rotate(270deg)`,
                    color: "white",
                  }}
                />
              </a>
            </Dropdown>
          </div>
        </>
      )}
    </div>
  );
};

export default PrimaryActionButton;