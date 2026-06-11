import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Container, Navbar, Nav } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Select, Button, Checkbox, Popover, Drawer, Dropdown, Spin } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { jwtDecode } from "jwt-decode";
import { isChrome, isSafari, isBrowser, isMobile, isTablet } from "react-device-detect";
import axios from 'axios';
import jsQR from 'jsqr';
import { useQrPrintDownloadHandlers } from './qrPrintDownloadHelper';

import Slider from "react-slick";

import VideoModal from "./VideoModal";
import QrPrintDownloadModal from "./QrPrintDownloadModal";

import LoopingVideo from "../components/common/LoopingVideo";

import config from "../config";
import { getProfile, updateStatusMoengageB2C, changeHospital, customizedPad, swtichLayout, navigatetoTatvaPedia, changeLogoStatus, showMedicineTime, showMedicineFrequency, getMedicineType, getDefaultPrintsettings, listVideo, zydusRefIds, campaigns, clearDoctorProfile } from "../redux/doctorsSlice";
import { clearTeleconsultNotification } from "../redux/teleconsultNotificationSlice";
import ApiAbha from "../api/services/ApiAbha";
import { viewDoctorWebsite } from "../redux/doctorWebsiteSlice";

import { useLocalStorage, clearLocalStorage, getDecodedToken } from "../utils/localStorage";
import { TRIAL, GB_ZYDUS_USER, OPD_API_KEY, PERSISTANT_STORAGE_KEY_AUTH_TOKEN, S_TATVA_PRACTICE, PERSISTANT_STORAGE_KEY_BILL_TOKEN, FROM_NATIVE_APP, GB_CVT_EXT_HOS } from "../utils/constants";
import { errorMessage, getClinicName, makeDefaultLogo, shouldMonetizationDisabled, getTokenData, getDeviceSdkData } from "../utils/utils";
import { createAbhaPrintHandlerConfig, createAbhaDownloadHandler } from "./abhaQrHelper";
import { Modal, Card } from "antd";

import PremiumUser from "./PremiumUser";
import { openModal } from "../redux/doctorModalSlice";

import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { env } from "../EnvironmentConfig";
import CommonModal from "./CommonModal";
import { useOpdBilling } from "../pages/opdBilling/useOpdBilling";
import moment from "moment";
import AiSuite from "../pages/monetization/components/AiSuite";
import MedEcoAppKnowMore from "../pages/monetization/components/MedEcoAppKnowMore";
import { generateBillToken } from "../pages/opdBilling/service";

import { EVENTS } from "../utils/events";
import {
  sendMessageToParent
} from "../utils/utils";
import { QRCodeSVG } from "qrcode.react";
import { useReactToPrint } from "react-to-print";
import { ASSETS } from "../assets";
const {
  hPlayIcon: playIcon,
  playIcon: playIconutube,
  fullIcon: fullicon,
  tutorialIcon: tutorial,
  tubeIcon: playIcons,
  qrIcon,
  textLogo: logoIcom,
  videorotate_2: videorotateWebm,
  videorotate: videorotateMp4,
  upgrade: upgradeIcon,
  profileBg,
  goldCrown,
  crown: crownIcon,
  aiSuite: AISuite,
} = ASSETS.images;
const Notification = ASSETS.images.navbarIcons.notification;
const ReceiptText = ASSETS.images.navbarIcons.receiptText;
const {
  iconMobile,
  defaultProfile: defaultprofile,
  logoSm,
  alerticon: alertIcon,
  abhaMain: abhaMainIcon,
  abhaSvg: abhaCenterLogo,
  qrOuterFrame,
  poweredBy: poweredByLogo,
  tatvapracticeLog_2: tatvaPracticeLogo,
} = ASSETS.images;

const CUSTOMIZED_PAD_SENDDATA = { data: { default: false, reset: true } }

function Header({ locationPath }) {

  const [popOverVideo, setPopOverVideo] = useState(false);
  const [videoLink, setVideoLink] = useState(null);
  const [videoDrawer, setvideoDrawer] = useState(false);
  const { isOpdBillingAccessable } = useOpdBilling();

  const isOpdPlansAccessableFromGB = useFeatureIsOn(
    "opd-plans"
  );
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const isAbhaQRAccessableFromGB = useFeatureIsOn("abha-qr");
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
  const tp_monetization_enable = !shouldMonetizationDisabled();

  const decodedToken = getDecodedToken();
  const apiUrl = env.opd_encryption_url;
  const opdVisitUrl = env.opd_visit_url;
  const [isQRCodeVisible, setQRCodeVisible] = useState(false);
  const [opdPlansUrl, setOpdPlansUrl] = useState(null);
  const printRef = useRef();
  const [isAbhaQRCodeVisible, setAbhaQRCodeVisible] = useState(false);
  const [abhaQRCodeData, setAbhaQRCodeData] = useState(null);
  const [isLoadingAbhaQR, setIsLoadingAbhaQR] = useState(false);
  const abhaQRCodeRef = useRef();

  const sliderSettings = {
    className: "center",
    dots: true,
    arrows: false,
    centerMode: true,
    infinite: false,
    centerPadding: "5px",
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true
  };

  //PopOver
  const [popOver, setPopOver] = useState(false);

  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [switchCheckbox, setSwitchCheckbox] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [logoCheckbox, setLogoCheckbox] = useState(false);

  const navigate = useNavigate();

  const { profile, loading, videoList, siteId, empNo, hasLocation } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const dispatch = useDispatch();

  const [clinicOptions, setClinicOptions] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [getToken, setToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const [getBillToken, setBillToken] = useLocalStorage(
    PERSISTANT_STORAGE_KEY_BILL_TOKEN
  );
  const [tokenData, setTokenData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [medEcoKnowMoreDrawer, setMedEcoKnowMoreDrawer] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const [getFromNative, _] = useLocalStorage(FROM_NATIVE_APP)

  useEffect(() => {
    if (!isReceptionist) {
      dispatch(getProfile());
      dispatch(customizedPad(CUSTOMIZED_PAD_SENDDATA));
      dispatch(showMedicineTime());
      dispatch(showMedicineFrequency());
      dispatch(getMedicineType());
      dispatch(getDefaultPrintsettings({ default: false }));
      dispatch(listVideo());
    }

    const tokenData = decodedToken?.result;
    if (tokenData?.hospital_business_id == env.zydus_business_id && isZydusUserAccessableFromGB) {
      dispatch(zydusRefIds())
    }
  }, [isZydusUserAccessableFromGB]);

  useEffect(() => {
    if (profile && hasLocation === false && !isReceptionist) {
      const clinicDetails = profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id);
      navigate('/final-setup?noLocation=true', { replace: true, state: { clinicDetails } });
    }
  }, [hasLocation, navigate, isReceptionist, profile]);

  useEffect(() => {
    dispatch(campaigns());
  }, []);

  useEffect(() => {
    if (profile) {
      if (profile.moengage_b2c_send === undefined) {
        window.Moengage?.add_unique_user_id?.(profile?.b2c);
        dispatch(updateStatusMoengageB2C());
      }
      // setSwitchCheckbox(profile.switchtoOld != 0 ? true : false)
      setPopOver(profile.NavigatetoTatvaPedia == 0 ? true : false);
      const clinics = profile.hospital_data?.map((e) => {
        return {
          value: e.hm_id,
          label: e.hm_name,
        };
      });
      setClinicOptions(clinics);
    }
  }, [profile]);

  useEffect(() => {
    if (clinicOptions?.length > 0) {
      const getStorageData = async () => {
        const token = await getToken()
        if (token !== undefined) {
          try {
            var decoded = jwtDecode(token);
            setTokenData(decoded.result)
            const index = clinicOptions.findIndex(e => e.value == decoded.result.clinic_id)
            index !== -1 ? setSelectedHospital(parseInt(decoded.result.clinic_id)) : setSelectedHospital(null)
          } catch (e) {
            console.log(e)
          }
        }
      }
      getStorageData()
    }
  }, [clinicOptions]);

  const HOSPITAL_DATA = useMemo(() => {
    return (
      <Select
        placeholder="Clinic Name"
        className="me-2"
        defaultValue={selectedHospital ? selectedHospital : "Clinic Name"}
        value={selectedHospital ? selectedHospital : "Clinic Name"}
        onChange={async (value) => {
          const sendData = {
            clinic_id: value,
          };
          const action = await dispatch(changeHospital(sendData));
          if (action.meta.requestStatus === "fulfilled") {
            // setSelectedHospital(value)
            await setToken(action.payload.token);
            try {
              var decoded = jwtDecode(action.payload.token);
              setTokenData(decoded.result);
              const billToken = await generateBillToken();
              setBillToken(billToken);
            } catch (e) {
              console.log(e)
            }
            if (locationPath == "/") {
              if (!isChrome && !isSafari) {
                navigate('/?authToken=' + action.payload.token, { replace: true });
                navigate(0, { replace: true });
              } else {
                navigate('/', { replace: true });
                navigate(0, { replace: true });
              }
            } else {
              navigate(0, { replace: true });
            }
          }
        }
        }
        options={clinicOptions}
      />
    );
  }, [selectedHospital, clinicOptions, locationPath]);

  //Logo Modal
  const showHideLogoModal = useCallback(() => {
    setIsLogoModalOpen(!isLogoModalOpen);
  }, [isLogoModalOpen]);

  const handleRedirectToOffering = async () => {
    navigate('/our-offerings?from=home');
  }

  const LOGO_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isLogoModalOpen}
        onCancel={showHideLogoModal}
        modalWidth={500}
        title={"Tatvacare"}
        modalBody={
          <>
            <div className="mb-4 fontroboto lh-base">
              Tatvacare is your all-in-one platform to simplify clinical practice, patient management, and medical learning.</div>
            <div className="alert-warning rounded-10px p-2 patient-details mb-4">
              <div className="d-flex align-items-center">
                <img className='me-3' src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to switch? <br />
                  You will be redirect to Tatvacare platform.
                </span>
              </div>
            </div>
            <div>
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div onClick={handleRedirectToOffering}
                  className="me-4 text-decoration-underline btn p-0 text-main">
                  Yes, Switch
                </div>
                <Button
                  onClick={() => {

                    window.Moengage.track_event("TP_Tatvapedia_Switch_cancelled");
                    showHideLogoModal()
                  }}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
                  <span>No, Stay</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [isLogoModalOpen]);

  //Switch Modal
  const showHideSwitchModal = useCallback(() => {
    setIsSwitchModalOpen(!isSwitchModalOpen);
  }, [isSwitchModalOpen]);

  const onSwitchChange = useCallback((e) => {
    setSwitchCheckbox(e.target.checked)
  }, [switchCheckbox]);

  async function onSwitchLayoutClick(flag) {
    var sendData = {
      from: 'app',
      dont_show: flag
    }
    const action = await dispatch(swtichLayout(sendData))
    if (action.meta.requestStatus === "fulfilled") {
      flag == 0 && showHideSwitchModal()
      if (getFromNative() && getFromNative() === "true") {
        SSO_TO_PM(1).then(async (data) => {
          if (data.success == 200) {
            navigate('/', { replace: true })
            clearLocalStorage()
            await window.open(data.url, '_self');
          }
        });
      }
      else if (!isChrome && !isSafari) {
        setTimeout(() => {
          // navigate(`/?switch_layout=old`, { replace: true })
          // navigate(0, { replace: true });
          sendMessageToParent(EVENTS.REDIRECT, {
            url: '/?switch_layout=old',
          });
        }, 500);
      } else {
        SSO_TO_PM(1).then(async (data) => {
          if (data.success == 200) {
            navigate('/', { replace: true })
            clearLocalStorage()
            await window.open(data.url, '_self');
          }
        });
      }
    } else {
      errorMessage(action.error)
    }
  }

  async function SSO_TO_PM(flag) {
    try {

      var sendData = {
        doctor_unique_id: tokenData.doctor_unique_id,
      };

      var URL;

      if (flag === 1) {
        sendData['mobile_no'] = tokenData.mobile_no
        sendData['clinic_id'] = tokenData.clinic_id
        sendData['hm_business_id'] = tokenData.hospital_business_id
        sendData['from'] = 'app'
        URL = config.sso_to_pm_url
      } else if (flag === 2) {
        sendData['hospital_business_id'] = tokenData.hospital_business_id
        URL = config.sso_to_pm_admin_url
      }

      const formData = new FormData();
      Object.keys(sendData).forEach((key) => {
        formData.append(key, sendData[key]);
      });

      const response = await axios.post(URL, formData,
        {
          auth: {
            username: config.sso_to_pm_username,
            password: config.sso_to_pm_password,
          }
        },
      );

      return response.data;
    } catch (err) {
      console.log(err.message);
      console.log(err.response.status);
    }
  }

  const SWITCH_TO_OLD_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isSwitchModalOpen}
        onCancel={showHideSwitchModal}
        modalWidth={500}
        title={"Switch to old view"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className='me-3' src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to revert to the old <br />
                  version?
                </span>
              </div>
            </div>
            <div className="my-3">
              <Checkbox className="switch-name-check" checked={switchCheckbox} onChange={onSwitchChange}>Don't show this again</Checkbox>
            </div>
            <div>
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div onClick={showHideSwitchModal} className="me-4 text-decoration-underline btn p-0 text-main">
                  No, Stay
                </div>
                <Button onClick={() => switchCheckbox ? onSwitchLayoutClick(1) : onSwitchLayoutClick(0)} className="lh-lg btn btn-primary3 btn-41 px-4" loading={loading}>
                  <span>Switch to Old</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [isSwitchModalOpen, loading, switchCheckbox]);

  // navigate to TatvaPedia
  //PopOver function
  const showHideNavigateToTatvaPedia = useCallback(() => {
    setPopOver(!popOver);
  }, [popOver]);

  const onLogoChange = useCallback((e) => {
    setLogoCheckbox(e.target.checked)
  }, [logoCheckbox]);

  async function onLogoClick() {
    const action = await dispatch(navigatetoTatvaPedia())
    if (action.meta.requestStatus === "fulfilled") {
      await dispatch(changeLogoStatus())
      showHideNavigateToTatvaPedia()
    } else {
      errorMessage(action.error)
    }
  }

  const NAVIGATE_TO_TATVAPEDIA = useCallback(() => {
    return (
      <>
        <div className="pop-header">
          <div className="align-items-center d-flex">
            <img src={logoSm} className="d-inline-block align-top me-3" style={{ height: '40px' }} alt="" />
            <div className="title-common title">You can navigate to TatvaPedia <br /> platform from here</div>
          </div>
          <div className="mt-4 fontroboto">Where you can uplift your medical practice with premium evidence-based and practice related content.</div>
          <div className="my-3 align-items-center d-flex justify-content-between">
            <Checkbox className="switch-name-check fontroboto fw-medium" checked={logoCheckbox} onChange={onLogoChange}>Don't show this again</Checkbox>
            <Button onClick={() => logoCheckbox ? onLogoClick() : showHideNavigateToTatvaPedia()} className="lh-lg btn btn-primary3 btn-41 px-4" loading={loading}>
              <span>Close</span>
            </Button>
          </div>
        </div>
      </>
    );
  }, [popOver, loading, logoCheckbox]);

  const checkModalOpenOrClose = () => {
    if (profile && profile.switchtoOld != 0) {
      onSwitchLayoutClick(1)
    } else {
      showHideSwitchModal()
    }
    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage.track_event("TP_Flow_changed", {
      clinic_name,
    });
  }

  //DrawerVideo function
  const handleDrawervideo = useCallback(() => {
    window.Moengage.track_event("video_library_button_clicked");
    setvideoDrawer(!videoDrawer);
  }, [videoDrawer]);

  //PopOverVideo function
  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo(!popOverVideo);
  }, [popOverVideo]);

  //Video Componet
  const VIDEO_CONTENT = useCallback((categoryId) => {
    return (
      <>
        <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
          <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
            <div className="title-common lh-base">Video Tutorial</div>
            <Button className="btn btn-delete-prescription p-0"
              onClick={showHideVideoListPopover}>
              <i className="icon-Cross" />
            </Button>
          </div>
          {videoList?.filter(e => e.category_id === categoryId)[0]?.video?.map((item1, i1) => {
            return (
              <div key={i1} className={`d-flex ${i1 !== videoList?.filter(e => e.category_id === categoryId)[0]?.video?.length - 1 && 'pb-3 mb-15 border-bottom'}`}>
                <div className="tutorial-play me-14">
                  <button type="button"
                    onClick={() => {
                      setVideoLink(item1)
                      const clinic_name = getClinicName(profile?.hospital_data);
                      window.Moengage.track_event("TP_Tutorial_Viewed", {
                        clinic_name,
                        tutorial_type: videoList[0]?.category,
                      });
                    }}
                  >
                    <img src={playIcons} />
                  </button>
                  <span className='tutorial-thumb'><img src={item1.thumbnail} /></span>
                </div>
                <div>
                  <h3 className="title-common text-welcome">{item1?.tmv_title}</h3>
                  <div className="fs-12 fontroboto fw-normal text-main">{item1?.tmv_description}</div>
                </div>
              </div>
            )
          })}
        </div>
      </>
    );
  }, [popOverVideo]);

  const setUpWebsiteUrl = async (flag) => {
    const action = await dispatch(viewDoctorWebsite());
    if (action.meta.requestStatus === "fulfilled") {
      flag === 1 ?
        navigate('/doctor_profile', { state: { websiteData: { ...action.payload } } })
        :
        navigate('/doctor_website_setting', { state: { websiteData: { ...action.payload } } })
    } else {
      errorMessage(action.error)
    }
  }

  const accountSettings = async () => {
    SSO_TO_PM(2).then(async (data) => {
      if (data.success == 200) {
        if (!isChrome && !isSafari) {
          // navigate(`/?url=${data.url}&key=phpRedirect`, { replace: true })
          // navigate(0, { replace: true });
          sendMessageToParent(EVENTS.REDIRECT, {
            url: data?.url,
          });
          navigate(0, { replace: true });
        } else {
          await window.open(data.url)
        }
      }
    });
  }

  const myAvailability = async () => {
    SSO_TO_PM(1).then(async (data) => {
      if (data.success == 200) {
        if (!isChrome && !isSafari) {
          // navigate(`/?url=${data.url}&module=my_availability&key=phpRedirect`, { replace: true })
          // navigate(0, { replace: true });
          sendMessageToParent(EVENTS.REDIRECT, {
            url: data?.url,
            module: "my_availability"
          });
        } else {
          await window.open(`${data.url}&module=my_availability`)
        }
      }
    });
  }

  const handleShowQRCode = () => {
    setQRCodeVisible(true);
  }

  const decodeQRFromImage = async (base64Image) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          resolve(code.data);
        } else {
          reject(new Error('Failed to decode QR code'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64Image;
    });
  };

  const fetchAbhaQRCode = async () => {
    setIsLoadingAbhaQR(true);
    try {
      const response = await ApiAbha.getPHRQrScannerData();
      const qrCodeData = response.data || response;
      
      if (qrCodeData?.qrCode) {
        const base64Image = `data:image/png;base64,${qrCodeData.qrCode}`;
        
        try {
          const decodedQRValue = await decodeQRFromImage(base64Image);
          setAbhaQRCodeData({
            qrValue: decodedQRValue, 
            abhaNumber: profile?.um_contact || "N/A",
            clinicName: getClinicName(profile?.hospital_data) || "Clinic"
          });
          setAbhaQRCodeVisible(true);
        } catch (decodeError) {
          console.error("Error decoding QR code:", decodeError);
          errorMessage("Failed to decode QR code. Please try again.");
        }
      } else {
        errorMessage("Failed to fetch ABHA QR Code: Invalid response");
      }
    } catch (error) {
      console.error("Error fetching ABHA QR Code:", error);
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
        errorMessage("CORS error: Please check if the API endpoint allows cross-origin requests.");
      } else {
        errorMessage(error?.response?.data?.error || error?.response?.data?.message || error?.message || "Failed to fetch ABHA QR Code. Please try again.");
      }
      setAbhaQRCodeVisible(false);
    } finally {
      setIsLoadingAbhaQR(false);
    }
  };

  const handleShowAbhaQRCode = async () => {
    if (!abhaQRCodeData) {
      await fetchAbhaQRCode();
    } else {
      setAbhaQRCodeVisible(true);
    }
  };

  const handleCloseAbhaQRCode = () => {
    setAbhaQRCodeVisible(false);
  };

  const handlePrintAbhaQRCode = useReactToPrint(createAbhaPrintHandlerConfig(abhaQRCodeRef));

  const handleDownloadAbhaQRCode = createAbhaDownloadHandler({
    contentRef: abhaQRCodeRef,
    abhaCenterLogo,
    profile,
    errorMessage
  });

  const iframeRef = useRef(null);

  const openUrlsSilently = async (urls) => {
    const iframeStatuses = await Promise.all(
      urls.map((url) => {
        return new Promise((resolve, reject) => {
          const iframe = document.createElement("iframe");
          iframe.src = url;
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "none";
          iframe.style.visibility = "hidden";

          // Set a timeout to reject if the iframe doesn't load within 5 seconds
          const timeoutId = setTimeout(() => {
            reject({ url, status: "timeout" });
          }, 5000);

          iframe.onload = () => {
            clearTimeout(timeoutId);
            resolve({ url, status: "success" });
          };

          iframe.onerror = () => {
            clearTimeout(timeoutId);
            reject({ url, status: "error" });
          };

          document.body.appendChild(iframe);

          // Cleanup the iframe after it's loaded or failed
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 3000);
        });
      })
    );

    return iframeStatuses;
  };

  const handleLogout = async () => {
    const urlsToOpen = [
      config.pedia_logout_url,
      config.tatvaAi_logout_url,
    ];

    try {
      // Prevent multiple clicks while logging out
      if (window.isLoggingOut) return;
      window.isLoggingOut = true;

      // Show loader
      setIsLoading(true);

      dispatch(clearTeleconsultNotification());

      setTimeout(async () => {
        try {
          // Try to open URLs and get their statuses
          const urlStatuses = await openUrlsSilently(urlsToOpen);
          // Log results and check for failures
          console.log("Logout URL statuses:", urlStatuses);
        } catch (error) {
          console.error("Error opening logout URLs:", error);
        }
      }, 1000);

      // Clear Redux doctor profile before clearing storage
      // This ensures when user logs in again (via form), profile is null and getProfile() runs
      console.log("[TP Medeco] Logout: clearing doctor profile and storage");
      dispatch(clearDoctorProfile());

      // Clear storage - this is our confirmation of logout
      localStorage.clear();
      sessionStorage.clear();

      sendMessageToParent(EVENTS.LOGOUT);
      // Redirect to login page
      navigate("/login");

    } catch (error) {
      console.error("Error during logout:", error);
      // Even if there's an error, clear Redux and storage and redirect
      console.log("[TP Medeco] Logout (catch): clearing doctor profile and storage");
      dispatch(clearDoctorProfile());
      localStorage.clear();
      sessionStorage.clear();

      sendMessageToParent(EVENTS.LOGOUT);
      // Redirect to login page
      navigate("/login");
    } finally {
      setIsLoading(false);
      window.isLoggingOut = false;
    }
  };

  const clickBuyNow = () => {
    navigate('/get-unlimited-access')
  }

  const handleClick = () => {
    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage.track_event("BuyPlanNow_Click", {
      doctor_id: profile?.doctor_unique_id,
      clinic_name,
    });
    // dispatch(openModal());
    clickBuyNow()
  };

  const getMenuItems = (logoutOnly = false) => {
    const commonItems = [
      {
        label: (
          <>
            <div className="mx-3">
              {profile?.um_image && planDetails?.currentPlanStatus !== "PAID" ? (
                <img
                  src={profile?.um_image ?? defaultprofile}
                  alt="Profile"
                  className="rounded-circle"
                  style={{ width: "52px", height: "52px" }}
                />
              ) : planDetails?.currentPlanStatus === "PAID" ? (
                <PremiumUser />
              ) : (
                <div className="rounded-pill patientProfile patientProfile52 border">
                  {makeDefaultLogo(profile?.um_name)}
                </div>
              )}
            </div>
            <div>
              <div className="text-black titleprint">{profile?.um_name}</div>
              <div className="title-common">{profile?.um_contact}</div>
            </div>
          </>
        ),
        key: "0",
      },
      {
        type: "divider",
      },
      {
        label: (
          <a onClick={() => setUpWebsiteUrl(1)}>
            <div className="title-common me-4 d-flex align-items-center">
              <i className="icon-profile me-3"></i>My Profile
            </div>
            <i className="icon-right iconrotate180"></i>
          </a>
        ),
        key: "1",
      },
      // {
      //   label: (
      //     <a onClick={handleAiSuite}>
      //       <div className="title-common me-4 d-flex align-items-center">
      //         <img src={AISuite} className="me-3" style={{ filter: 'grayscale(100%)' }} alt="AI Suite" />AI Suite
      //       </div>
      //       <i className="icon-right iconrotate180"></i>
      //     </a>
      //   ),
      //   key: "2",
      // },
      // {
      //   label: (
      //     <a onClick={handleMedEcoKnowMore}>
      //       <div className="title-common me-4 d-flex align-items-center">
      //         <img src={iconMobile} className="me-3" style={{ filter: 'grayscale(100%)' }} alt="MedEco Mobile App" /> MedEco Mobile App
      //       </div>
      //       <i className="icon-right iconrotate180"></i>
      //     </a>
      //   ),
      //   key: "3",
      // },
      {
        label: (
          <a onClick={() => setUpWebsiteUrl(2)}>
            <div className="title-common me-4 d-flex align-items-center">
              <i className="icon-group me-3"></i>
              {`${profile?.website_publish && profile?.publish_url ? "Visit" : "Setup"} My Website`}
            </div>
            <i className="icon-right iconrotate180"></i>
          </a>
        ),
        key: "4",
      },
      {
        label: (
          <a onClick={myAvailability}>
            <div className="title-common me-4 d-flex align-items-center">
              <i className="icon-calendar me-3"></i>My Availability
            </div>
            <i className="icon-right iconrotate180"></i>
          </a>
        ),
        key: "5",
      },
      {
        label: (
          <a onClick={accountSettings}>
            <div className="title-common me-4 d-flex align-items-center">
              <i className="icon-setting me-3"></i>Account Setting
            </div>
            <i className="icon-right iconrotate180"></i>
          </a>
        ),
        key: "6",
      },
      ...(!!tokenData?.admin && isOpdBillingAccessable ? [{
        label: (
          <a onClick={() => navigate("/billing-settings")}>
            <div className="title-common me-4 d-flex align-items-center">
            <img src={ReceiptText} alt="Billing" width={26} height={23} className="me-3" />Billing Setting
            </div>
            <i className="icon-right iconrotate180"></i>
          </a>
        ),
        key: "billing-settings",
      }] : []),
      ...(profile?.abhaEnable && isAbhaQRAccessableFromGB ? [{
        label: (
          <a onClick={handleShowAbhaQRCode}>
            <div className="title-common me-4 d-flex align-items-center">
              <img src={qrIcon} className="me-3" alt="QR Icon" />
              Download ABHA QR Code
            </div>
            <i className="icon-right iconrotate180"></i>
          </a>
        ),
        key: "abha-qr",
      }] : []),
      // {
      //   label:
      //     <a onClick={() => ["TRIAL", "EXPIRED"].includes(planDetails?.currentPlanStatus) ? handleClick() : setUpWebsiteUrl(1)}>
      //       <div className="title-common me-4 d-flex align-items-center">
      //         {["TRIAL", "EXPIRED"].includes(planDetails?.currentPlanStatus) && <img loading="lazy" src={upgradeIcon} className="me-3" alt="" />}
      //         {planDetails?.currentPlanStatus === "PAID" && <img loading="lazy" src={crownIcon} className="me-3" style={{ filter: 'brightness(0%)' }} alt="" />}
      //         {["TRIAL", "EXPIRED"].includes(planDetails?.currentPlanStatus) ? "Upgrade Plan" : "Subscription"}
      //         {["TRIAL", "EXPIRED"].includes(planDetails?.currentPlanStatus) && <div className="gradientBackground d-flex">
      //           <div className="demoModeIndicatorSmall bg-danger" />
      //           <span className='demoModeLabel'>Demo mode</span>
      //         </div>}
      //       </div>
      //       <i className="icon-right iconrotate180"></i>
      //     </a>,
      //   key: '7',
      // },
      // {
      //   label:
      //     <a>
      //       <div className="title-common me-5 d-flex align-items-center"><i className="icon-upgrade me-3"></i>Upgrade Plan</div>
      //       <i className="icon-right iconrotate180"></i>
      //     </a>,
      //   key: '5',
      // },
      // {
      //   label:
      //     <a>
      //       <div className="title-common me-5 d-flex align-items-center"><i className="icon-help me-3"></i>Help Center</div>
      //       <i className="icon-right iconrotate180"></i>
      //     </a>,
      //   key: '6',
      // },

      // CSS Also comment
      // {
      //   type: 'divider',
      // },
      // {
      //   label: <><i className="icon-exit me-2"></i> Log Out</>,
      //   key: '8',
      // },
    ];

    if (tp_monetization_enable) {
      const aiSuite = {
        label: (
          <a onClick={handleAiSuite}>
            <div className="title-common me-4 d-flex align-items-center">
              <img src={AISuite} className="me-3" style={{ filter: 'grayscale(100%)' }} alt="AI Suite" />AI Suite
            </div>
            <i className="icon-right iconrotate180"></i>
          </a>
        ),
        key: "2",
      }
      commonItems.splice(3, 0, aiSuite);
    }

    const remaingDays = planDetails?.service_mappings?.find(e => e.service_name === S_TATVA_PRACTICE)?.plan_tier === TRIAL ? moment(planDetails?.plan_expiry_date).diff(moment().format('YYYY-MM-DD'), 'days') : 0
    if (tp_monetization_enable && planDetails?.service_mappings?.find(e => e.service_name === S_TATVA_PRACTICE)?.plan_tier === TRIAL) {
      const freeTrialMenu = [
        {
          label:
            <a onClick={() => ["TRIAL", "EXPIRED"].includes(planDetails?.currentPlanStatus) ? handleClick() : setUpWebsiteUrl(1)}>
              <div className="title-common me-4 d-flex align-items-center">
                {["TRIAL", "EXPIRED"].includes(planDetails?.currentPlanStatus) && <img loading="lazy" src={upgradeIcon} className="me-3" alt="" />}
                {planDetails?.currentPlanStatus === "PAID" && <img loading="lazy" src={crownIcon} className="me-3" style={{ filter: 'brightness(0%)' }} alt="" />}
                {["TRIAL", "EXPIRED"].includes(planDetails?.currentPlanStatus) ? "Upgrade Plan" : "Subscription"}
                {["TRIAL", "EXPIRED"].includes(planDetails?.currentPlanStatus) && <div className="gradientBackground d-flex">
                  <div className="demoModeIndicatorSmall bg-danger" />
                  <span className='demoModeLabel'>Demo mode</span>
                </div>}
              </div>
              <i className="icon-right iconrotate180"></i>
            </a>,
          key: '7',
        },
        ...(!(isMobile && !isTablet)
          ? [
              { type: "divider" },
              {
                className: "freeTrialMenu text-center rounded-12px p-3 m-3",
                label: (
                  <>
                    {remaingDays > 0 ? `You're on a trial plan!` : `${remaingDays < 0 ? `Your trial plan expired!` : `Your trial plan will expire today!`}`}
                    <div className="title-common text-white border p-2 rounded-12px w-100 mt-2 cursor-pointer" style={{ backgroundColor: '#FFFFFF1A' }} onClick={clickBuyNow}>
                      <img loading="lazy" src={crownIcon} className="text-white me-2" alt="" />Get Unlimited Access
                    </div>
                  </>
                ),
                key: "8",
              },
            ]
          : []),
      ]
      commonItems.push(...freeTrialMenu)
    }

    const extraItems = [
      {
        label: (
          <a onClick={handleShowQRCode}>
            <div className="title-common me-5 d-flex align-items-center">
              <img src={qrIcon} className="me-3" alt="QR Icon" />
              OPD Plan QR
            </div>
            <i className="icon-right iconrotate180"></i>
          </a>
        ),
        key: "9",
      },
    ];

    // Log Out Section - Show logout button for all device types
    const logoutItem = [
      {
        type: "divider",
      },
      {
        label: (
          <div className="title-common d-flex align-items-center">
            <i className="icon-exit me-3 color-red"></i>
            <span className="color-red">Log Out</span>
          </div>
        ),
        key: "logout",
        onClick: handleLogout,
        className: "logout-menu-item"
      },
    ];

    if (logoutOnly) {
      return [logoutItem[1]];
    }

    // Combine commonItems, extraItems (if applicable), and logoutItem (always at the end)
    const items = isOpdPlansAccessableFromGB
      ? [...commonItems, ...extraItems, ...logoutItem]
      : [...commonItems, ...logoutItem];

    // If not admin, filter out account setting item, else return all items
    return !tokenData?.admin ? items.filter((item) => item.key !== "6") : items;
  };

  const showHideBackModal = useCallback(() => {
    setQRCodeVisible(false);
  }, [isQRCodeVisible]);

  useEffect(() => {
    if (isQRCodeVisible && !opdPlansUrl) {
      clickOpdPlans();  // Trigger the API call when QR modal is visible and URL isn't yet set
    }
  }, [isQRCodeVisible]);

  const opdEncryptionApiCall = async (data) => {
    const headers = {
      'api-key': OPD_API_KEY,
      'tatvapractice': 'true',
      'Content-Type': 'application/json'
    };
    try {
      const response = await axios.post(apiUrl, data, { headers });
      return response.data
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const clickOpdPlans = async () => {
    const clinic_Id = decodedToken?.result?.clinic_id;
    const doc_Id = decodedToken?.result?.doctor_unique_id;

    const decryptData = { d_id: doc_Id, clinic_Id: clinic_Id };

    // Encrypt clinic and doctor ID
    const encryptedCata = await opdEncryptionApiCall(decryptData);

    const url = `${opdVisitUrl}/tatva-care?p_id=${encryptedCata}`;
    setOpdPlansUrl(url);
  };

  const { handlePrint, handleDownload } = useQrPrintDownloadHandlers({
    printRef,
    fileName: 'OPD-Plans',
  });

  const handleAiSuite = useCallback(() => {
    setAiModal(!aiModal);
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_Monetization_AISuite", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      um_id: tokenData?.user_id,
      clinic_id: tokenData?.clinic_id,
      clinic_Name: clinic_name,
      payment_Status: planDetails?.currentPlanStatus,
      ...deviceSdkData
    });
  }, [aiModal]);

  const handleMedEcoKnowMore = () => {
    setMedEcoKnowMoreDrawer((prev) => !prev);
  };

  const handeProfileDD = (e) => {
    e.preventDefault();
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_Profile_Section", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      um_id: tokenData?.user_id,
      ...deviceSdkData
    });
  }

  return (
    <>
      <Navbar className="justify-content-between portal-header">
        {isLoading && (
          <div className="spinner-overlay">
            <Spin size="large" />
          </div>
        )}
        <Container fluid>
          <div>
            <img onClick={() => {
              if(!isCvtExtHosAccessableFromGB){
                window.Moengage.track_event("TP_Tatvapedia_clicked");
                showHideLogoModal()
              }
            }}
              src={ASSETS.images.logo}
              className={`d-inline-block align-top cursor-pointer`}
              style={{ width: '110px' }}
              alt="Logo"
            />
            <Popover open={popOver} onOpenChange={showHideNavigateToTatvaPedia} content={NAVIGATE_TO_TATVAPEDIA}
              trigger="click" overlayClassName="pop-370 pp-0" placement="bottomRight">
              <div></div>
            </Popover>
          </div>
          {LOGO_MODAL}
          <Nav className="ms-auto align-items-center d-flex">
            {HOSPITAL_DATA}
            {profile && profile.SwitchGrowthBook != 0 && tokenData?.hospital_business_id != env.zydus_business_id && !isZydusUserAccessableFromGB && (
              <div onClick={checkModalOpenOrClose} className='align-items-center cursor-pointer d-flex fs-14 fw-medium mx-4'>
                <i className='icon-switch me-2'></i>
                <span className="text-decoration-underline">Switch To Old View</span>
              </div>
            )}

            <QrPrintDownloadModal
              open={!!isQRCodeVisible && !!opdPlansUrl}
              onClose={showHideBackModal}
              contentRef={printRef}
              title="OPD Plans"
              byName={profile?.um_name}
              logoSrc={logoIcom}
              qrValue={opdPlansUrl}
              qrSize={180}
              scanText="Scan the QR to view & buy OPD plans"
              onPrint={handlePrint}
              onDownload={handleDownload}
              className="opd-plan-qr"
            />

            {/* ABHA QR Code Modal */}
            {isLoadingAbhaQR ? (
              <Modal
                open={true}
                centered
                closeIcon={false}
                footer={null}
                title={null}
                maskClosable={false}
              >
                <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "300px" }}>
                  <Spin size="large" />
                </div>
              </Modal>
            ) : (
              <Modal
                open={isAbhaQRCodeVisible && !!abhaQRCodeData?.qrValue}
                centered
                closeIcon={false}
                onCancel={handleCloseAbhaQRCode}
                footer={null}
                title={null}
                destroyOnClose
                className="abha-qr-modal"
              >
                <div className="opd-qr">
                  <button className="qr-close-btn" onClick={handleCloseAbhaQRCode}>
                    <i style={{ fontSize: "2rem" }} className="icon-Cross"></i>
                  </button>

                  <div ref={abhaQRCodeRef} className="opd-plans-inner-contianer">
                    {/* Header Icon - abha-main.svg - Visible in modal and download */}
                    {abhaMainIcon ? (
                      <div
                        className="abha-main-icon-download"
                        style={{
                          display: "flex", 
                          justifyContent: "center",
                          marginTop: "-0.5rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <img
                          src={abhaMainIcon}
                          alt="ABHA Icon"
                          draggable="false"
                          style={{
                            maxHeight: "40px",
                            maxWidth: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    ) : null}

                    {/* Clinic Name as Title */}
                    <div
                      className="opd-title abha-clinic-name"
                      style={{
                        fontWeight: "700",
                        color: "#1F2933",
                        textAlign: "center",
                        marginBottom: "0.5rem",
                        marginTop: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                        fontSize: (() => {
                          const name = getClinicName(profile?.hospital_data) || "Clinic";
                          if (name.length > 30) return "1.1rem";
                          if (name.length > 20) return "1.5rem";
                          return "1.5rem";
                        })(),
                      }}
                      title={getClinicName(profile?.hospital_data) || "Clinic"}
                    >
                      {getClinicName(profile?.hospital_data) || "Clinic"}
                    </div>

                    {/* QR Code with Frame */}
                    {abhaQRCodeData?.qrValue ? (
                      <div
                        className="abha-qr-container"
                        style={{
                          position: "relative",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: `${180 + 50}px`,
                          height: `${180 + 50}px`,
                        }}
                      >
                        {/* QR Frame Background */}
                        {qrOuterFrame ? (
                          <img
                            src={qrOuterFrame}
                            alt="QR Frame"
                            draggable="false"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              zIndex: 0,
                            }}
                          />
                        ) : null}
                        {/* QR Code */}
                        <div
                          className="abha-qr-code-wrapper"
                          style={{
                            position: "relative",
                            zIndex: 1,
                          }}
                        >
                          <QRCodeSVG
                            className="opd-qr-image abha-qr-image"
                            value={abhaQRCodeData.qrValue}
                            size={180}
                            imageSettings={
                              abhaCenterLogo
                                ? {
                                    src: abhaCenterLogo,
                                    height: 180 * 0.15,
                                    width: 180 * 0.15,
                                    excavate: true,
                                  }
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Scan Text - Hidden in print */}
                    <div
                      className="opd-scan-text abha-scan-text-screen"
                      style={{
                        fontSize: "1rem",
                        color: "#454551 !important",
                        textAlign: "center",
                      }}
                    >
                      Scan the above QR to create or link your ABHA account
                    </div>

                    {/* Print-only text - Hidden on screen, visible in print */}
                    <div className="abha-print-text" style={{ display: "none" }}>
                      <div
                        className="opd-scan-text"
                        style={{
                          marginTop: "0.75rem",
                          fontSize: "1rem",
                          color: "#454551 !important",
                          textAlign: "center",
                        }}
                      >
                        Scan the above QR to create or link your ABHA account in three easy steps
                      </div>
                      <div
                        className="opd-scan-text abha-go-digital-text"
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "1rem",
                          color: "#454551 !important",
                          textAlign: "center",
                        }}
                      >
                        Get Your ABHA. Go Digital.
                      </div>
                    </div>

                    {/* Powered by section */}
                    {poweredByLogo && tatvaPracticeLogo ? (
                      <div
                        className="abha-powered-by"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          marginTop: "1.5rem",
                        }}
                      >
                        <img
                          src={poweredByLogo}
                          alt="Powered by"
                          draggable="false"
                          style={{
                            height: "10px",
                            objectFit: "contain",
                          }}
                        />
                        <img
                          src={tatvaPracticeLogo}
                          alt="TatvaPractice"
                          draggable="false"
                          style={{
                            height: "20px",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Print and Download Buttons */}
                  <div className="d-flex align-items-center justify-content-between gap-2 mt-4">
                    <Button
                      onClick={handlePrintAbhaQRCode}
                      className="btn btn-primary1 btn-41 align-items-center d-flex justify-content-center"
                      style={{ width: "12rem", height: "3rem" }}
                    >
                      <span className="fs-18 align-items-center d-flex ">
                        <i className="icon-Print me-2"></i>
                        Print
                      </span>
                    </Button>

                    <Button
                      onClick={handleDownloadAbhaQRCode}
                      className="btn btn-primary1 btn-41 align-items-center d-flex justify-content-center"
                      style={{ width: "12rem", height: "3rem" }}
                    >
                      <span className="fs-18 align-items-center d-flex">
                        <i className="icon-download me-2"></i>
                        Download
                      </span>
                    </Button>
                  </div>
                </div>
              </Modal>
            )}

            { !isCvtExtHosAccessableFromGB &&
              (locationPath == "/" || locationPath == "/bulk_messages" ? (
                <div onClick={handleDrawervideo} className="cursor-pointer me-2 video-animat">
                  <img src={playIcon} />
                  <LoopingVideo
                    webm={videorotateWebm}
                    mp4={videorotateMp4}
                    ariaLabel="Video"
                  />
                </div>) : locationPath == "/billing-dashboard" ? (
                  <Popover
                    open={popOverVideo}
                    onOpenChange={showHideVideoListPopover}
                    content={VIDEO_CONTENT(16)}
                    trigger="click"
                    overlayClassName="pop-430 pp-0 videoTutorial"
                    placement="bottom"
                  >
                    <div className="cursor-pointer me-2 video-animat">
                      <img src={playIcon} />
                      <LoopingVideo
                        webm={videorotateWebm}
                        mp4={videorotateMp4}
                        ariaLabel="Video"
                      />
                    </div>
                  </Popover>
                ) : (
                <Popover
                  open={popOverVideo}
                  onOpenChange={showHideVideoListPopover}
                  content={VIDEO_CONTENT(3)}
                  trigger="click"
                  overlayClassName="pop-430 pp-0 videoTutorial"
                  placement="bottom"
                >
                  <button className='btn d-flex align-items-center btn-text mx-3 tutorial p-0'>
                    {/* onClick={showHideVideoListPopover} */}
                    <span className='text-decoration-none rounded-5 pe-3 bg-white shadow2'><img height={42} src={tutorial} />Tutorial</span>
                  </button>
                </Popover>
              ))
            }

            {tp_monetization_enable && !isCvtExtHosAccessableFromGB && (
              <div className="mx-3 cursor-pointer" onClick={handleAiSuite}>
                <img src={AISuite} alt="AI Suite" />
              </div>
            )}

            <Drawer title="Video Tutorial" placement="right" onClose={handleDrawervideo} open={videoDrawer} className="modalWidth-400 tab345 playdrawer" width="auto">
              <div className="mt-20">
                {videoList?.map((item, i) => {
                  return (
                    item?.video?.length > 0 && (
                      <div key={i} className=" ms-4 video-bottom-spacing">
                        <div className="title-common text-welcome">{item?.category}</div>
                        <div className="fs-12 fontroboto fw-normal text-main">{item?.description}</div>
                        <div className="videodrawer-left mt-3">
                          <Slider {...sliderSettings}>
                            {item?.video?.map((item1, i1) => {
                              return (
                                <div key={i1} className="drawer-slider">
                                  <button type="button"
                                    onClick={() => {
                                      setVideoLink(item1)
                                      const clinic_name = getClinicName(profile?.hospital_data);
                                      window.Moengage.track_event("TP_Tutorial_Viewed", {
                                        clinic_name,
                                        tutorial_type: item?.category,
                                      });
                                    }}
                                  >
                                    <img src={playIconutube} />
                                  </button>
                                  <img src={item1?.thumbnail} />
                                </div>
                              )
                            })}
                          </Slider>
                        </div>
                      </div>
                    )
                  )
                })}
              </div>
            </Drawer>

            {videoLink && (
              <VideoModal
                videoLink={videoLink}
                onCancel={() => setVideoLink(null)}
              />
            )}

           {/* {!isCvtExtHosAccessableFromGB &&  */}
              <div>
                <Button
                  className="btn btn-delete-prescription mx-auto d-block p-0 mb-1"
                  onClick={() =>
                    window.Moengage.track_event("announcement_button_clicked")
                  }
                  id="beamerButton"
                >
                  <img src={Notification} alt="Beamer Notification" width="26px" height="26px" />
                </Button>
              </div>
            {/* } */}

            {SWITCH_TO_OLD_MODAL}

            <Dropdown
            menu={{
              items: getMenuItems(isCvtExtHosAccessableFromGB),
            }}
            trigger={['click']}
            className="py-0 nav-link cursor-pointer"
            overlayClassName={`prfile-dropdown ${isCvtExtHosAccessableFromGB ? "logout-only-dropdown" : ""}`}
          >
            <a onClick={handeProfileDD}>
              {profile?.um_image && planDetails?.currentPlanStatus !== "PAID" ? (
                <img
                  src={profile?.um_image ?? defaultprofile}
                  alt="Profile"
                  className="rounded-circle"
                  style={{ width: "35px", height: "35px" }}
                />
              ) : planDetails?.currentPlanStatus === "PAID" ? (
                <PremiumUser />
              ) :
                <div className='rounded-pill patientProfile border'>{makeDefaultLogo(profile?.um_name)}</div>
              }
            </a>
          </Dropdown>
          </Nav>
        </Container>
      </Navbar>

      <AiSuite aiModal={aiModal} handleAiSuite={handleAiSuite} />

      <Drawer
        closeIcon={false}
        placement="right"
        onClose={handleMedEcoKnowMore}
        open={medEcoKnowMoreDrawer}
        width={600}
      >
        <MedEcoAppKnowMore handleMedEcoKnowMore={handleMedEcoKnowMore} />
      </Drawer>

    </>
  );
}

export default React.memo(Header);
