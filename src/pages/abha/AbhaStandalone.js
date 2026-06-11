import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import CreatePatientAbha from "../../components/abha/screens/CreatePatientAbha";
import AbhaVerifyOtp from "../../components/abha/screens/AbhaVerifyOtp";
import MobileVerifyOtp from "../../components/abha/screens/MobileVerifyOtp";
import CreateNewAbhaAddress from "../../components/abha/screens/CreateNewAbhaAddress";
import AbhaAddress from "../../components/abha/screens/AbhaAddress";
import LinkPatientAbha from "../../components/abha/screens/LinkPatientAbha";
import BiometricAadhaarEntry from "../../components/abha/screens/BiometricAadhaarEntry";
import BiometricVerification from "../../components/abha/screens/BiometricVerification";
import BiometricCapturePopup from "../../components/abha/common/BiometricCapturePopup";
import AbhaSuccessScreen from "../../components/abha/common/AbhaSuccessScreen";
import OtpVerificationCode from "../../components/abha/common/OtpVerificationCode";
import AbhaDrawerHeader from "../../components/abha/common/AbhaDrawerHeader";

import LoopingVideo from "../../components/common/LoopingVideo";

import { message, notification } from "antd";
import useAbhaScreens, { ABHA_SCREENS } from "../../components/abha/hooks/useAbhaScreens";
import ApiAbha from "../../api/services/ApiAbha";
import { useLocalStorage } from "../../utils/localStorage";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";
import config from "../../config";
import { useDispatch } from "react-redux";
import { setAbhaDetails } from "../../redux/abhaSlice";
import "../../components/abha/AbhaDrawer.scss";
import "./AbhaStandalone.scss";
import { ASSETS } from "../../assets";
const {
  abhaSvg: AbhaHeadingSVG,
  succcessAbhaAnimation_2: SuccessWebm,
  succcessAbhaAnimation: SuccessMp4,
  checkBadge: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

const MESSAGE_TYPES = {
  ABHA_SUCCESS: "ABHA_SUCCESS",
  ABHA_CLOSE: "ABHA_CLOSE",
  ABHA_ERROR: "ABHA_ERROR",
  ABHA_LOADED: "ABHA_LOADED",
  ABHA_BIOMETRIC_CAPTURE_CLICKED: "ABHA_BIOMETRIC_CAPTURE_CLICKED",
};

const FLOW_TYPES = {
  NEW_PATIENT: "new_patient",
  LINK_EXISTING: "link_existing",
};

const BIOMETRIC_FLOW_ENABLED = true;
const ABHA_STANDALONE_SUCCESS_SESSION_KEY = "abha_standalone_show_success";

const AbhaStandalone = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [getToken, setToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const dispatch = useDispatch();

  const authToken = searchParams.get("authToken");
  const patientUniqueId = searchParams.get("patientUniqueId");
  const flow = searchParams.get("flow") || FLOW_TYPES.LINK_EXISTING; // new_patient | link_existing
  const mode = searchParams.get("mode") || "create"; // create | link_mobile | link_address | link_number
  const embedded = searchParams.get("embedded") === "true";
  const callbackUrl = searchParams.get("callbackUrl");
  const origin = searchParams.get("origin");
  const biometricFlowEnabled = BIOMETRIC_FLOW_ENABLED || (embedded && searchParams.get("biometricFlow") === "true");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const [isNextDisabled, setIsNextDisabled] = useState(true);
  const [isNextLoading, setIsNextLoading] = useState(false);

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

  const verifyOtpFunctionRef = useRef(null);
  const abhaAddressActionRef = useRef(null);
  const createAddressActionRef = useRef(null);
  const otpVerificationCodeFunctionRef = useRef(null);
  const mobileVerifyOtpFunctionRef = useRef(null);
  const [linkAbhaData, setLinkAbhaData] = useState(null);
  const [biometricPopupOpen, setBiometricPopupOpen] = useState(false);
  const biometricDataRef = useRef(null); // Store data used to open biometric popup
  const abhaVerifyStateRef = useRef({
    mobile_no: "",
    otpDigits: Array(6).fill(""),
  });

  const postMessageToParent = useCallback(
    (type, data) => {
      if (embedded && window.parent !== window) {
        const message = { type, ...data, source: "abha-standalone", flow };

        if (origin) {
          window.parent.postMessage(message, origin);
        } else {
          window.parent.postMessage(message, "*");
        }
      }
    },
    [embedded, origin, flow]
  );

  useEffect(() => {
    if (authToken) {
      setToken(authToken);
      setIsAuthenticated(true);
    } else {
      const existingToken = getToken();
      if (existingToken) {
        setIsAuthenticated(true);
      } else {
        setError("Authentication required. Missing authToken parameter.");
        postMessageToParent(MESSAGE_TYPES.ABHA_ERROR, {
          error: "MISSING_AUTH_TOKEN",
          message: "Authentication token is required",
        });
      }
    }
  }, [authToken, setToken, getToken, postMessageToParent]);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("authToken");
    const storedToken = getToken();
    if (!tokenFromUrl && storedToken && typeof setSearchParams === "function") {
      const params = new URLSearchParams(searchParams);
      params.set("authToken", storedToken);
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, getToken, setSearchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      if (flow === FLOW_TYPES.LINK_EXISTING && !patientUniqueId) {
        setError("Patient ID is required for linking ABHA to existing patient.");
        postMessageToParent(MESSAGE_TYPES.ABHA_ERROR, {
          error: "MISSING_PATIENT_ID",
          message: "Patient unique ID is required for link_existing flow",
        });
      }
    }
  }, [patientUniqueId, isAuthenticated, flow, postMessageToParent]);

  useEffect(() => {
    if (isAuthenticated && (flow === FLOW_TYPES.NEW_PATIENT || patientUniqueId)) {
      try {
        const stored = sessionStorage.getItem(ABHA_STANDALONE_SUCCESS_SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.showSuccess) {
            goToAbhaAddress({
              showSuccessScreen: true,
              showReturnToTabMessage: !!parsed.showReturnToTabMessage,
              linkedAddress: parsed.linkedAddress,
            });
            postMessageToParent(MESSAGE_TYPES.ABHA_LOADED, { mode, flow });
            return;
          }
        }
      } catch (e) {
      }

      const initialScreen = searchParams.get("initialScreen");
      const initialAadhaar = searchParams.get("aadhaarNumber");
      if (initialScreen === "biometric_verification" && initialAadhaar) {
        goToBiometricVerification({
          aadhaarNumber: initialAadhaar,
          patient_unique_id: patientUniqueId,
        });
      } else if (initialScreen === "biometric_aadhaar_entry") {
        goToBiometricAadhaarEntry({ patient_unique_id: patientUniqueId });
      } else {
        switch (mode) {
          case "link_mobile":
            goToLink("mobile");
            break;
          case "link_address":
            goToLink("address");
            break;
          case "link_number":
            goToLink("number");
            break;
          case "create":
          default:
            goToCreate();
            break;
        }
      }
      postMessageToParent(MESSAGE_TYPES.ABHA_LOADED, { mode, flow });
    }
  }, [isAuthenticated, patientUniqueId, mode, flow, goToLink, goToCreate, goToBiometricVerification, goToBiometricAadhaarEntry, goToAbhaAddress, postMessageToParent]);

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
    const isInIframe = typeof window !== "undefined" && window.parent !== window;
    if (embedded && isInIframe && data?.aadhaarNumber) {
      const params = new URLSearchParams();
      const auth = searchParams.get("authToken");
      if (auth) params.set("authToken", auth);
      if (patientUniqueId) params.set("patientUniqueId", patientUniqueId);
      params.set("flow", flow);
      params.set("mode", mode);
      params.set("biometricFlow", "true");
      params.set("initialScreen", "biometric_verification");
      params.set("aadhaarNumber", data.aadhaarNumber);
      params.set("fromBiometricNewTab", "true");
      if (callbackUrl) params.set("callbackUrl", callbackUrl);
      if (origin) params.set("origin", origin);
      params.set("embedded", "false");
      params.set("receptionist", "true");
      const baseUrl = window.location.origin + window.location.pathname;
      const url = `${baseUrl}?${params.toString()}`;
      postMessageToParent(MESSAGE_TYPES.ABHA_BIOMETRIC_CAPTURE_CLICKED, {
        url,
        openInNewTab: true,
        message: "Open this URL in a new browser tab (target=_blank) so the biometric device and Mantra RD Service can be used to complete the flow.",
      });
    }
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
      verificationStatus: "loading", // Set loading state
    });

    if (fingerprintData?.fullXmlBase64 && mobileNumber && mobileNumber.length === 10) {
        try {
          const requestData = {
            aadhaarNumber,
            mobile_no: mobileNumber,
            fingerPrintAuthPid: fingerprintData.fullXmlBase64,
            patient_unique_id: patient_unique_id || patientUniqueId,
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
                patient_unique_id: patient_unique_id || patientUniqueId,
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
    }

    const fromBiometricNewTab = searchParams.get("fromBiometricNewTab") === "true";

    if (flow === FLOW_TYPES.NEW_PATIENT) {
      // For both embedded and new-tab flows: go to add patient first; success screen after patient is created
      navigate("/add_patient?receptionist=true", {
        state: {
          from: "abha-standalone",
          abhaDetails: {
            linkedAddress: abhaDetails.linkedAddress || abhaDetails.abhaAddress,
            insertId: abhaDetails.insertId || abhaDetails.abhaInsertId,
            fullName: abhaDetails.fullName,
            dateOfBirth: abhaDetails.dateOfBirth,
            gender: abhaDetails.gender,
            mobile: abhaDetails.mobile,
          },
          embedded,
          origin,
          callbackUrl,
          fromBiometricNewTab: fromBiometricNewTab || false,
          // Pass for building return URL to show ABHA success after patient save
          ...(fromBiometricNewTab && {
            abhaStandaloneReturnParams: {
              flow,
              mode,
              authToken: searchParams.get("authToken") || undefined,
            },
          }),
        },
      });
      return; // Don't close, let PatientForm handle it
    }

    if (flow === FLOW_TYPES.LINK_EXISTING) {
      const abhaAddress = abhaDetails.linkedAddress || abhaDetails.abhaAddress;

      if (!fromBiometricNewTab) {
        postMessageToParent(MESSAGE_TYPES.ABHA_SUCCESS, {
          linkedAddress: abhaAddress,
          insertId: abhaDetails.insertId || abhaDetails.abhaInsertId,
          flow,
          message: `ABHA ID: ${abhaAddress} linked successfully`,
        });
      }

      goToAbhaAddress({
        ...abhaDetails,
        showSuccessScreen: true,
        linkedAddress: abhaAddress,
        showReturnToTabMessage: fromBiometricNewTab,
      });

      if (fromBiometricNewTab) {
        try {
          sessionStorage.setItem(
            ABHA_STANDALONE_SUCCESS_SESSION_KEY,
            JSON.stringify({ showSuccess: true, showReturnToTabMessage: true, linkedAddress: abhaAddress })
          );
        } catch (e) {
        }
      }

      if (!fromBiometricNewTab) {
        setTimeout(() => {
          if (callbackUrl) {
            const params = new URLSearchParams({
              status: "success",
              abhaAddress,
            });
            window.location.href = `${decodeURIComponent(callbackUrl)}?${params.toString()}`;
          } else {
            handleClose();
          }
        }, 3000);
      }
    }
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
    const updatedData = { ...screenData, ...responseData };

    goToAbhaAddress({ ...updatedData, showSuccessScreen: true });

    setTimeout(() => {
      if (updatedData?.isNew === true) {
        goToCreateAddress(updatedData);
      } else {
        goToAbhaAddress(updatedData);
      }
    }, 5000);
  };

  const handleVerifyOtpCallback = (verifyFunction, isFormValid, isVerifying) => {
    verifyOtpFunctionRef.current = verifyFunction;
    setIsNextDisabled(!isFormValid || isVerifying);
    setIsNextLoading(isVerifying);
  };

  const handleAbhaAddressCallback = (linkFunction, isValid, isLoading, linkData) => {
    abhaAddressActionRef.current = linkFunction;
    setLinkAbhaData(linkData);
    setIsNextDisabled(!isValid || isLoading);
    setIsNextLoading(isLoading);
  };

  const handleOtpVerificationCodeCallback = (verifyFunction, isFormValid, isVerifying) => {
    otpVerificationCodeFunctionRef.current = verifyFunction;
    setIsNextDisabled(!isFormValid || isVerifying);
    setIsNextLoading(isVerifying);
  };

  const handleMobileVerifyOtpCallback = (verifyFunction, isFormValid, isVerifying) => {
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
    if (biometricFlowEnabled && currentScreen === ABHA_SCREENS.BIOMETRIC_VERIFICATION) {
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
          // For address linking, show success screen then close
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

  // Handle close/cancel
  const handleClose = useCallback(() => {
    postMessageToParent(MESSAGE_TYPES.ABHA_CLOSE, { cancelled: true });

    if (callbackUrl) {
      window.location.href = `${decodeURIComponent(callbackUrl)}?status=cancelled`;
    } else if (embedded) {
    }
  }, [callbackUrl, embedded, postMessageToParent]);

  useEffect(() => {
    return () => {
      resetAbhaVerifyState();
    };
  }, []);

  useEffect(() => {
    if (currentScreen === ABHA_SCREENS.BIOMETRIC_VERIFICATION) {
      const { verificationStatus = "", verificationData = null } = screenData;
      setIsNextDisabled(verificationStatus !== "success" || !verificationData);
    }
  }, [currentScreen, screenData]);

  const renderScreen = () => {
    switch (currentScreen) {
      case ABHA_SCREENS.CREATE:
        return (
          <CreatePatientAbha
            onLinkOptionSelect={handleLinkNavigation}
            onOtpSent={handleOtpSent}
            onBiometricSelect={handleBiometricSelect}
            patientUniqueId={patientUniqueId || null}
            initialAadhaar={screenData?.initialAadhaar || ""}
          />
        );
      case ABHA_SCREENS.BIOMETRIC_AADHAAR_ENTRY:
        return (
          <BiometricAadhaarEntry
            onNext={handleBiometricAadhaarNext}
            onLinkOptionSelect={handleLinkNavigation}
            onOtpFlowSelect={handleShowCreate}
            patientUniqueId={patientUniqueId || null}
          />
        );
      case ABHA_SCREENS.BIOMETRIC_VERIFICATION: {
        const fromBiometricNewTab = searchParams.get("fromBiometricNewTab") === "true";
        const resetToCapture = () =>
          goToBiometricVerification({
            ...screenData,
            fingerprintData: null,
            biometricCaptured: false,
            verificationStatus: "",
            verificationError: "",
            verificationData: null,
            mobileNumber: screenData.mobileNumber || "",
          });
        return (
          <BiometricVerification
            data={screenData}
            onGetBiometric={handleGetBiometric}
            onGoBack={() => {
              if (screenData.biometricCaptured) {
                resetToCapture();
              } else {
                goToCreate({
                  initialAadhaar: screenData.aadhaarNumber || "",
                });
              }
            }}
            onTryAgain={fromBiometricNewTab ? resetToCapture : () => goToCreate({ initialAadhaar: screenData.aadhaarNumber || "" })}
            hideMainGoBack={fromBiometricNewTab}
          />
        );
      }
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
            patientUniqueId={patientUniqueId || null}
          />
        );
      case ABHA_SCREENS.SUCCESS:
        return <AbhaSuccessScreen data={screenData} onClose={handleClose} />;
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
          if (screenData?.showReturnToTabMessage) {
            return (
              <div className="abha_verified_container">
                <LoopingVideo
                  webm={SuccessWebm}
                  mp4={SuccessMp4}
                  width={200}
                  ariaLabel="Success"
                />
                <div className="verified_label">ABHA has been created successfully.</div>
                <div className="verified_label" style={{ marginTop: "8px", fontSize: "14px" }}>Please return to the previous tab.</div>
              </div>
            );
          }
          if (flow === FLOW_TYPES.LINK_EXISTING && screenData?.linkedAddress) {
            return (
              <div className="abha_verified_container">
                <LoopingVideo
                  webm={SuccessWebm}
                  mp4={SuccessMp4}
                  width={200}
                  ariaLabel="Success"
                />
                <div className="verified_label">ABHA ID: {screenData.linkedAddress} linked successfully</div>
              </div>
            );
          }
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
            onBiometricSelect={handleBiometricSelect}
            patientUniqueId={patientUniqueId || null}
            initialAadhaar={screenData?.initialAadhaar || ""}
          />
        );
    }
  };

  if (error) {
    return (
      <div className="abha-standalone-error">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={handleClose}>Close</button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (flow === FLOW_TYPES.LINK_EXISTING && !patientUniqueId)) {
    return (
      <div className="abha-standalone-loading">
        <div className="loading-spinner" />
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <div className={`abha-standalone ${embedded ? "embedded" : ""}`}>
      <div className="abha-standalone-container">
        <div className="abha-standalone-header">
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
            onClose={handleClose}
            showCloseButton={true}
          />
        </div>
        <div className="abha-standalone-content">{renderScreen()}</div>
      </div>
      {biometricFlowEnabled && (
        <BiometricCapturePopup
          open={biometricPopupOpen}
          onClose={() => setBiometricPopupOpen(false)}
          onCaptureSuccess={handleBiometricCaptureSuccess}
          onCaptureError={handleBiometricCaptureError}
        />
      )}
    </div>
  );
};

export default AbhaStandalone;
