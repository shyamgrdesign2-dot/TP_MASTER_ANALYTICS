import { useState, useCallback } from "react";

export const ABHA_SCREENS = {
  CREATE: "create",
  VERIFY_OTP: "verify_otp",
  MOBILE_VERIFY_OTP: "mobile_verify_otp",
  OTP_VERIFICATION_CODE: "otp_verification_code",
  LINK: "link",
  SUCCESS: "success",
  CREATE_ADDRESS: "create_address",
  ABHA_ADDRESS: "abha_address",
  BIOMETRIC_AADHAAR_ENTRY: "biometric_aadhaar_entry",
  BIOMETRIC_VERIFICATION: "biometric_verification",
};

const useAbhaScreens = () => {
  const [currentScreen, setCurrentScreen] = useState(ABHA_SCREENS.CREATE);
  const [screenData, setScreenData] = useState({});

  const navigateToScreen = useCallback((screen, data = {}) => {
    setCurrentScreen(screen);
    setScreenData(data);
  }, []);

  const goToCreate = useCallback((data = {}) => {
    setCurrentScreen(ABHA_SCREENS.CREATE);
    setScreenData(data);
  }, []);

  const goToVerifyOtp = useCallback((data) => {
    setCurrentScreen(ABHA_SCREENS.VERIFY_OTP);
    setScreenData(data);
  }, []);

  const goToLink = useCallback((method = "mobile") => {
    setCurrentScreen(ABHA_SCREENS.LINK);
    setScreenData({ linkMethod: method });
  }, []);

  const goToSuccess = useCallback((data) => {
    setCurrentScreen(ABHA_SCREENS.SUCCESS);
    setScreenData(data);
  }, []);

  const goToCreateAddress = useCallback((data) => {
    setCurrentScreen(ABHA_SCREENS.CREATE_ADDRESS);
    setScreenData(data);
  }, []);

  const goToAbhaAddress = useCallback((data) => {
    setCurrentScreen(ABHA_SCREENS.ABHA_ADDRESS);
    setScreenData(data);
  }, []);

  const goToOtpVerificationCode = useCallback((data) => {
    setCurrentScreen(ABHA_SCREENS.OTP_VERIFICATION_CODE);
    setScreenData(data);
  }, []);

  const goToMobileVerifyOtp = useCallback((data) => {
    setCurrentScreen(ABHA_SCREENS.MOBILE_VERIFY_OTP);
    setScreenData(data);
  }, []);

  const goToBiometricAadhaarEntry = useCallback((data) => {
    setCurrentScreen(ABHA_SCREENS.BIOMETRIC_AADHAAR_ENTRY);
    setScreenData(data);
  }, []);

  const goToBiometricVerification = useCallback((data) => {
    setCurrentScreen(ABHA_SCREENS.BIOMETRIC_VERIFICATION);
    setScreenData(data);
  }, []);

  const resetScreens = useCallback(() => {
    setCurrentScreen(ABHA_SCREENS.CREATE);
    setScreenData({});
  }, []);

  return {
    currentScreen,
    screenData,
    setScreenData,
    navigateToScreen,
    goToCreate,
    goToVerifyOtp,
    goToLink,
    goToSuccess,
    goToCreateAddress,
    goToAbhaAddress,
    goToOtpVerificationCode,
    goToMobileVerifyOtp,
    goToBiometricAadhaarEntry,
    goToBiometricVerification,
    resetScreens,
  };
};

export default useAbhaScreens;
