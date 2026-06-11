import { useEffect, useState, useRef } from "react";
import { Drawer, message, notification } from "antd";
import CreatePatientAbha from "./screens/CreatePatientAbha";
import AbhaVerifyOtp from "./screens/AbhaVerifyOtp";
import MobileVerifyOtp from "./screens/MobileVerifyOtp";
import CreateNewAbhaAddress from "./screens/CreateNewAbhaAddress";
import AbhaAddress from "./screens/AbhaAddress";
import LinkPatientAbha from "./screens/LinkPatientAbha";
import BiometricAadhaarEntry from "./screens/BiometricAadhaarEntry";
import BiometricVerification from "./screens/BiometricVerification";
import BiometricCapturePopup from "./common/BiometricCapturePopup";
import AbhaSuccessScreen from "./common/AbhaSuccessScreen";
import OtpVerificationCode from "./common/OtpVerificationCode";
import AbhaDrawerHeader from "./common/AbhaDrawerHeader";

import useAbhaScreens, { ABHA_SCREENS } from "./hooks/useAbhaScreens";
import ApiAbha from "../../api/services/ApiAbha";
import config from "../../config";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";
import "./AbhaDrawer.scss";
import { useDispatch } from "react-redux";
import { setAbhaDetails } from "../../redux/abhaSlice";
import { ASSETS } from "../../assets";
const {
  abhaSvg: AbhaHeadingSVG,
  checkBadge: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

const AbhaDrawer = ({
  onClose,
  open,
  patientUniqueId,
  onSuccess = () => {},
}) => {
  const {
    currentScreen,
    screenData,
    setScreenData,
    goToCreate,
    goToVerifyOtp,
    goToLink,
    goToCreateAddress,
    goToAbhaAddress,
    goToOtpVerificationCode,
    goToMobileVerifyOtp,
    goToBiometricAadhaarEntry,
    goToBiometricVerification,
    resetScreens,
  } = useAbhaScreens();

  const dispatch = useDispatch();

  const [isNextDisabled, setIsNextDisabled] = useState(true);
  const [isNextLoading, setIsNextLoading] = useState(false);
  const verifyOtpFunctionRef = useRef(null);
  const abhaAddressActionRef = useRef(null);
  const createAddressActionRef = useRef(null);
  const otpVerificationCodeFunctionRef = useRef(null);
  const mobileVerifyOtpFunctionRef = useRef(null);
  const [linkAbhaData, setLinkAbhaData] = useState(null);
  const [biometricPopupOpen, setBiometricPopupOpen] = useState(false);
  const biometricDataRef = useRef(null);
  const abhaVerifyStateRef = useRef({
    mobile_no: "",
    otpDigits: Array(6).fill(""),
  });

  const resetAbhaVerifyState = () => {
    abhaVerifyStateRef.current = {
      mobile_no: "",
      otpDigits: Array(6).fill(""),
    };
  };

  const handleAbhaVerifyStateChange = (state = {}) => {
    const { mobile_no = "", otpDigits = [] } = state;
    abhaVerifyStateRef.current = {
      mobile_no,
      otpDigits:
        Array.isArray(otpDigits) && otpDigits.length === 6
          ? [...otpDigits]
          : Array(6).fill(""),
    };
  };

  const handleLinkNavigation = (method = "mobile") => {
    goToLink(method);
  };

  const handleShowCreate = () => {
    goToCreate();
  };

  const handleBiometricSelect = (data) => {
    if (data?.aadhaarNumber) {
      goToBiometricVerification(data);
    } else {
      goToBiometricAadhaarEntry({ patient_unique_id: patientUniqueId });
    }
  };

  const handleBiometricAadhaarNext = (data) => {
    goToBiometricVerification(data);
  };

  const handleGetBiometric = (data) => {
    biometricDataRef.current = data;
    setScreenData({
      ...screenData,
      ...data,
    });
    setBiometricPopupOpen(true);
    return data;
  };

  const handleBiometricCaptureSuccess = async (fingerprintData) => {
    
    const biometricData = biometricDataRef.current || screenData;
    const { aadhaarNumber = "", mobileNumber = "", patient_unique_id = "" } = biometricData;
    
    
    goToBiometricVerification({
      ...screenData,
      ...biometricData,
      fingerprintData,
      biometricCaptured: true,
      mobileNumber: mobileNumber || "",
      verificationStatus: "loading",
    });

    if (fingerprintData?.fullXmlBase64 && mobileNumber && mobileNumber.length === 10) {
        try {
          const requestData = {
            aadhaarNumber,
            mobile_no: mobileNumber,
            fingerPrintAuthPid: fingerprintData.fullXmlBase64,
            patient_unique_id,
          };

          const response = await ApiAbha.verifyFingerPrintForAadhaar(requestData);

          if (response?.success) {
            const apiResponseData = response.data?.data || response.data;
            
            const MESSAGE_KEY = "biometric-capture-success";
            message.open({
              key: MESSAGE_KEY,
              type: "",
              className: "message-appointment",
              content: (
                <div className="d-flex align-items-center">
                  <img src={visitEnd} className="me-3" alt="Success" />
                  <div>
                    <div className="fontroboto text-start fw-normal mt-1">
                      Biometric captured successfully
                    </div>
                  </div>
                  <img
                    src={imgCloseVisit}
                    className="ms-3"
                    alt="Close"
                    onClick={() => message.destroy()}
                    style={{ cursor: "pointer" }}
                  />
                </div>
              ),
              duration: 5,
            });
            
            goToBiometricVerification({
              ...screenData,
              ...biometricData,
              fingerprintData,
              biometricCaptured: true,
              mobileNumber: mobileNumber || "",
              verificationStatus: "success",
              verificationData: {
                ...apiResponseData,
                patient_unique_id,
                mobile_no: mobileNumber,
                aadhaarNumber,
              },
            });
          } else {
            goToBiometricVerification({
              ...screenData,
              ...biometricData,
              fingerprintData,
              biometricCaptured: true,
              mobileNumber: mobileNumber || "",
              verificationStatus: "error",
              verificationError: response?.message || "Could not verify aadhaar, please try again",
            });
          }
        } catch (error) {
          console.error("Biometric verification error:", error);
          goToBiometricVerification({
            ...screenData,
            ...biometricData,
            fingerprintData,
            biometricCaptured: true,
            mobileNumber: mobileNumber || "",
            verificationStatus: "error",
            verificationError: error?.response?.data?.message || error?.message || "Could not verify aadhaar, please try again",
          });
        }
      } else {
        goToBiometricVerification({
          ...screenData,
          ...biometricData,
          fingerprintData,
          biometricCaptured: true,
          mobileNumber: mobileNumber || "",
          verificationStatus: "error",
          verificationError: "Please enter a valid mobile number to verify",
        });
      }
    
  };

  const handleBiometricCaptureError = (error) => {
    message.error(error || "Failed to capture biometric");
  };

  const handleBiometricVerifyNext = async () => {
    const { verificationStatus = "", verificationData = null } = screenData;
    
    if (verificationStatus === "success" && verificationData) {
      handleVerifySuccess(verificationData);
    } else {
      notification.error({
        message: "Error",
        description: "Please complete verification before proceeding.",
      });
    }
  };

  const handleOtpSent = (data) => {
    resetAbhaVerifyState();
    goToVerifyOtp(data);
  };

  const handleMobileLinkOtpSent = (data) => {
    const isAddressLinking = data.linkMethod === "address";
    const isNumberLinking = data.linkMethod === "number";
    goToMobileVerifyOtp({
      ...data,
      isMobileLinking: data.linkMethod === "mobile",
      isAbhaAddressLinking: isAddressLinking,
      isAbhaNumberLinking: isNumberLinking,
    });
  };

  const handleAbhaCreatedSuccess = (abhaDetails = {}) => {
    if (abhaDetails?.linkedAddress && abhaDetails?.insertId) {
      dispatch(
        setAbhaDetails({
          ...abhaDetails,
        })
      );
      onSuccess();
    }
    onClose();

    const MESSAGE_KEY = "abha-created-success";
    message.open({
      key: MESSAGE_KEY,
      type: "",
      className: "message-appointment",
      content: (
        <div className="d-flex align-items-center">
          <img src={visitEnd} className="me-3" alt="Success" />
          <div>
            <div className="fontroboto text-start fw-normal mt-1">
              ABHA Created & Linked successfully
            </div>
          </div>
          <img
            src={imgCloseVisit}
            className="ms-3"
            alt="Close"
            onClick={() => message.destroy()}
            style={{ cursor: "pointer" }}
          />
        </div>
      ),
      duration: 5,
    });
  };

  const handleVerifySuccess = (data) => {
    if (data?.mobileChanged === true) {
      goToMobileVerifyOtp({
        ...data,
        fromBiometricFlow: true,
      });
    } else {
      if (data?.isNew === true) {
        goToCreateAddress(data);
      } else {
        goToAbhaAddress(data);
      }
    }
  };

  const handleMobileVerifySuccess = (responseData) => {
    // After successful mobile verification, show success screen first
    const updatedData = { ...screenData, ...responseData };
    
    // Show success screen first
    goToAbhaAddress({ ...updatedData, showSuccessScreen: true });
    
    setTimeout(() => {
      // Check isNew flag
      if (updatedData?.isNew === true) {
        // Show create new ABHA address component
        goToCreateAddress(updatedData);
      } else {
        // Show ABHA address component
        goToAbhaAddress(updatedData);
      }
    }, 5000);
  };

  const handleVerifyOtpCallback = (
    verifyFunction,
    isFormValid,
    isVerifying
  ) => {
    verifyOtpFunctionRef.current = verifyFunction;
    setIsNextDisabled(!isFormValid || isVerifying);
    setIsNextLoading(isVerifying);
  };

  const handleAbhaAddressCallback = (
    linkFunction,
    isValid,
    isLoading,
    linkData
  ) => {
    abhaAddressActionRef.current = linkFunction;
    setLinkAbhaData(linkData);
    setIsNextDisabled(!isValid || isLoading);
    setIsNextLoading(isLoading);
  };

  const handleOtpVerificationCodeCallback = (
    verifyFunction,
    isFormValid,
    isVerifying
  ) => {
    otpVerificationCodeFunctionRef.current = verifyFunction;
    setIsNextDisabled(!isFormValid || isVerifying);
    setIsNextLoading(isVerifying);
  };

  const handleMobileVerifyOtpCallback = (
    verifyFunction,
    isFormValid,
    isVerifying
  ) => {
    mobileVerifyOtpFunctionRef.current = verifyFunction;
    setIsNextDisabled(!isFormValid || isVerifying);
    setIsNextLoading(isVerifying);
  };

  const handleCreateAddressCallback = (createFunction, isValid) => {
    createAddressActionRef.current = createFunction;
    setIsNextDisabled(!isValid);
    setIsNextLoading(false);
  };

  const handleNextClick = async () => {
    if (currentScreen === ABHA_SCREENS.BIOMETRIC_VERIFICATION) {
      await handleBiometricVerifyNext();
      return;
    }
    
    if (
      currentScreen === ABHA_SCREENS.VERIFY_OTP &&
      verifyOtpFunctionRef.current
    ) {
      await verifyOtpFunctionRef.current();
    } else if (
      currentScreen === ABHA_SCREENS.MOBILE_VERIFY_OTP &&
      mobileVerifyOtpFunctionRef.current
    ) {
      const result = await mobileVerifyOtpFunctionRef.current();
      if (result) {
        // Check if this is for mobile linking, address linking, number linking, or mobile update
        const isMobileLinking = screenData?.isMobileLinking === true;
        const isAbhaAddressLinking = screenData?.isAbhaAddressLinking === true;
        const isAbhaNumberLinking = screenData?.isAbhaNumberLinking === true;
        
        if (isAbhaAddressLinking) {
          // For address linking, show success screen then close drawer
          goToAbhaAddress({ ...screenData, showSuccessScreen: true });
          
          setTimeout(() => {
            if (result.abhaAddress && result.abhaInsertId) {
              handleAbhaCreatedSuccess({
                linkedAddress: result.abhaAddress,
                insertId: result.abhaInsertId,
                ...result,
              });
            } else {
              handleAbhaCreatedSuccess();
            }
          }, 3000);
        } else if (isMobileLinking || isAbhaNumberLinking) {
          // Show success screen for 3 seconds, then show AbhaAddress
          goToAbhaAddress({ ...result, showSuccessScreen: true });
          
          setTimeout(() => {
            goToAbhaAddress({
              ...result,
              isMobileLinking: isMobileLinking || isAbhaNumberLinking,
            });
          }, 3000);
        } else {
          handleMobileVerifySuccess(result);
        }
      }
    } else if (
      currentScreen === ABHA_SCREENS.ABHA_ADDRESS &&
      abhaAddressActionRef.current
    ) {
      const result = await abhaAddressActionRef.current();
      if (result?.success) {
        // Check if this is mobile linking, address linking, or ABHA creation flow
        const isMobileLinking = screenData?.isMobileLinking === true;
        const isAbhaAddressLinking = screenData?.isAbhaAddressLinking === true;
        
        if (isMobileLinking || isAbhaAddressLinking) {
          // For mobile/address linking, directly link and show success
          if (result.abhaAddress && result.abhaInsertId) {
            handleAbhaCreatedSuccess({
              linkedAddress: result.abhaAddress, 
              insertId: result.abhaInsertId,
              ...result,
            });
          } else {
            handleAbhaCreatedSuccess();
          }
        } else if (linkAbhaData) {
          // For ABHA creation flow, navigate to OTP verification code screen
          goToOtpVerificationCode({
            ...linkAbhaData,
            txnId: result.txnId,
            otpMessage: result.otpMessage,
          });
        }
      }
    } else if (
      currentScreen === ABHA_SCREENS.CREATE_ADDRESS &&
      createAddressActionRef.current
    ) {
      await createAddressActionRef.current();
    } else if (
      currentScreen === ABHA_SCREENS.OTP_VERIFICATION_CODE &&
      otpVerificationCodeFunctionRef.current
    ) {
      const success = await otpVerificationCodeFunctionRef.current();
      if (success) {
        if (success?.abhaAddress && success?.abhaInsertId) {
          handleAbhaCreatedSuccess({
            linkedAddress: success.abhaAddress,
            insertId: success.abhaInsertId,
            ...success,
          });
        } else {
          handleAbhaCreatedSuccess();
        }
      }
    }
  };

  const getNextButtonConfig = () => {
    // Hide next button on success screen
    if (screenData?.showSuccessScreen) {
      return { show: false, title: "" };
    }

    switch (currentScreen) {
      case ABHA_SCREENS.VERIFY_OTP:
        return { show: true, title: "Next" };
      case ABHA_SCREENS.MOBILE_VERIFY_OTP:
        // For mobile linking, show "Verify" or "Verifying..." when loading
        return { show: true, title: isNextLoading ? "Verifying..." : "Verify" };
      case ABHA_SCREENS.BIOMETRIC_VERIFICATION:
        return { show: true, title: "Next" };
      case ABHA_SCREENS.ABHA_ADDRESS:
        return { show: true, title: "Link ABHA" };
      case ABHA_SCREENS.OTP_VERIFICATION_CODE:
        return { show: true, title: "Link ABHA" };
      case ABHA_SCREENS.CREATE_ADDRESS:
        return { show: true, title: "Create" };
      default:
        return { show: false, title: "" };
    }
  };

  const nextButtonConfig = getNextButtonConfig();

  const handleResendOtp = async () => {
    if (screenData?.aadhaarNumber && screenData?.patient_unique_id) {
      try {
        // Resend OTP with same payload structure
        const response = await ApiAbha.sendOtpForAadhaar({
          patient_unique_id: screenData.patient_unique_id,
          aadhaarNumber: screenData.aadhaarNumber,
        });
        if (response?.success) {
          goToVerifyOtp({
            ...screenData,
            txnId: response.data?.txnId,
            accessToken: response.data?.accessToken,
            otpMessage: response.message,
          });
        }
      } catch (error) {
        console.error("Resend OTP failed:", error);
      }
    }
  };

  useEffect(() => {
    if (!open) {
      resetScreens();
      resetAbhaVerifyState();
      setIsNextDisabled(true);
      setIsNextLoading(false);
    }
  }, [open, resetScreens]);

  useEffect(() => {
    if (currentScreen === ABHA_SCREENS.BIOMETRIC_VERIFICATION) {
      const { verificationStatus = "", verificationData = null } = screenData;
      setIsNextDisabled(verificationStatus !== "success" || !verificationData);
    }
  }, [currentScreen, screenData]);

  useEffect(() => {
    return () => {
      resetAbhaVerifyState();
    };
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case ABHA_SCREENS.CREATE:
        return (
          <CreatePatientAbha
            onLinkOptionSelect={handleLinkNavigation}
            onOtpSent={handleOtpSent}
            onBiometricSelect={handleBiometricSelect}
            patientUniqueId={patientUniqueId}
            initialAadhaar={screenData?.initialAadhaar || ""}
          />
        );
      case ABHA_SCREENS.BIOMETRIC_AADHAAR_ENTRY:
        return (
          <BiometricAadhaarEntry
            onNext={handleBiometricAadhaarNext}
            onLinkOptionSelect={handleLinkNavigation}
            onOtpFlowSelect={handleShowCreate}
            patientUniqueId={patientUniqueId}
          />
        );
      case ABHA_SCREENS.BIOMETRIC_VERIFICATION:
        return (
          <BiometricVerification
            data={screenData}
            onGetBiometric={handleGetBiometric}
            onBiometricCaptureSuccess={handleBiometricCaptureSuccess}
            onGoBack={() => {
              if (screenData.biometricCaptured) {
                goToBiometricVerification({
                  ...screenData,
                  fingerprintData: null,
                  biometricCaptured: false,
                  verificationStatus: "",
                  verificationError: "",
                  verificationData: null,
                  mobileNumber: screenData.mobileNumber || "",
                });
              } else {
                goToCreate({
                  initialAadhaar: screenData.aadhaarNumber || "",
                });
              }
            }}
            onTryAgain={() => {
              goToCreate({
                initialAadhaar: screenData.aadhaarNumber || "",
              });
            }}
          />
        );
      case ABHA_SCREENS.VERIFY_OTP: {
        const mergedOtpData = {
          ...screenData,
          mobile_no:
            abhaVerifyStateRef.current.mobile_no ?? screenData?.mobile_no ?? "",
          otpDigits:
            abhaVerifyStateRef.current.otpDigits ??
            screenData?.otpDigits ??
            Array(6).fill(""),
        };
        return (
          <AbhaVerifyOtp
            otpData={mergedOtpData}
            onVerifySuccess={handleVerifySuccess}
            onGoBack={() => {
              const aadhaarNumber = mergedOtpData.aadhaarNumber || screenData.aadhaarNumber || "";
              goToCreate({
                initialAadhaar: aadhaarNumber,
              });
            }}
            onResendOtp={handleResendOtp}
            onVerifyOtp={handleVerifyOtpCallback}
            onStateChange={handleAbhaVerifyStateChange}
          />
        );
      }
      case ABHA_SCREENS.MOBILE_VERIFY_OTP:
        // Check if this is for mobile linking, address linking, number linking, or mobile update during ABHA creation
        const isMobileLinking = screenData?.isMobileLinking === true;
        const isAbhaAddressLinking = screenData?.isAbhaAddressLinking === true;
        const isAbhaNumberLinking = screenData?.isAbhaNumberLinking === true;
        const fromBiometricFlow = screenData?.fromBiometricFlow === true;
        const linkMethod = screenData?.linkMethod || "mobile";
        return (
          <MobileVerifyOtp
            data={screenData}
            onVerifyOtp={handleMobileVerifyOtpCallback}
            onGoBack={() => {
              if (fromBiometricFlow) {
                goToBiometricVerification({
                  ...screenData,
                  fingerprintData: screenData.fingerprintData,
                  biometricCaptured: true,
                  mobileNumber: screenData.mobile_no || screenData.mobileNumber,
                  verificationStatus: "success",
                  verificationData: screenData,
                });
              } else if (isMobileLinking || isAbhaAddressLinking || isAbhaNumberLinking) {
                goToLink(linkMethod);
              } else {
                goToVerifyOtp(screenData);
              }
            }}
            isMobileLinking={isMobileLinking}
            isAbhaAddressLinking={isAbhaAddressLinking}
            isAbhaNumberLinking={isAbhaNumberLinking}
          />
        );
      case ABHA_SCREENS.LINK:
        return (
          <LinkPatientAbha
            selectedMethod={screenData?.linkMethod || "mobile"}
            onMethodChange={handleLinkNavigation}
            onCreateNew={handleShowCreate}
            onOtpSent={handleMobileLinkOtpSent}
            patientUniqueId={patientUniqueId}
          />
        );
      case ABHA_SCREENS.SUCCESS:
        return <AbhaSuccessScreen data={screenData} onClose={onClose} />;
      case ABHA_SCREENS.CREATE_ADDRESS:
        return (
          <CreateNewAbhaAddress
            data={screenData}
            onCreateAddress={handleCreateAddressCallback}
            onSuccess={handleAbhaCreatedSuccess}
            onGoBack={() => goToAbhaAddress(screenData)}
          />
        );
      case ABHA_SCREENS.ABHA_ADDRESS:
        // Check if we should show success screen first
        if (screenData?.showSuccessScreen) {
          return <AbhaSuccessScreen />;
        }
        return (
          <AbhaAddress
            data={screenData}
            onLinkAbha={handleAbhaAddressCallback}
            onCreateNew={() => goToCreateAddress(screenData)}
            isMobileLinking={screenData?.isMobileLinking}
            isAbhaAddressLinking={screenData?.isAbhaAddressLinking}
          />
        );
      case ABHA_SCREENS.OTP_VERIFICATION_CODE:
        return (
          <OtpVerificationCode
            data={screenData}
            onVerifyOtp={handleOtpVerificationCodeCallback}
            onGoBack={() => goToAbhaAddress(screenData)}
          />
        );
      default:
        return (
          <CreatePatientAbha
            onLinkOptionSelect={handleLinkNavigation}
            onOtpSent={handleOtpSent}
            patientUniqueId={patientUniqueId}
          />
        );
    }
  };

  return (
    <div>
      <Drawer
        title={
          <AbhaDrawerHeader
            headerText={"Create/ Link ABHA"}
            headerIcon={
              <img
                style={{ marginLeft: "4px" }}
                src={AbhaHeadingSVG}
                alt="ABHA heading"
              />
            }
            isNextButton={nextButtonConfig.show}
            onNext={handleNextClick}
            nextBtnTitle={nextButtonConfig.title}
            isNextDisable={isNextDisabled}
            isLoading={isNextLoading}
          />
        }
        placement={"right"}
        closable={true}
        onClose={onClose}
        open={open}
        width={600}
        maskClosable={false}
        mask={true}
        maskStyle={{ backgroundColor: "transparent" }}
        zIndex={1100}
        footer={null}
        className="onboarding-drawer"
      >
        {renderScreen()}
      </Drawer>
      <BiometricCapturePopup
        open={biometricPopupOpen}
        onClose={() => setBiometricPopupOpen(false)}
        onCaptureSuccess={handleBiometricCaptureSuccess}
        onCaptureError={handleBiometricCaptureError}
      />
    </div>
  );
};

export default AbhaDrawer;
