import React, { useMemo, useState, useRef, useEffect } from "react";
import { Card, Typography, Switch, Carousel, Button } from "antd";
import "./styles.scss";

import ScanAnimationWrapper from "../../components/scanAnimationWrapper/ScanAnimationWrapper";

import BottomSheetWrapper from "../../common/BottomSheetWrapper";

import PatientInfoCard from "./patientInfoCard";
import ImageUpload from "./imageUpload/ImageUpload";

import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import {
  getFilesOnMobile,
  setFileUploadSessionId,
  setFileUploadToken,
} from "../../redux/ophthalSnapRxDigitizationSlice";
import UploadSuccess from "./uploadSuccess";
import { useLocalStorage } from "../../utils/localStorage";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";
import { trackEvent } from "../../utils/utils";
import { EVENTS } from "../../utils/events";
import FullPageLoader from "../vaccination/components/Loader";
import { ASSETS } from "../../assets";
const websiteLogo = ASSETS.images.websiteImages.logo;
const {
  aiAgent,
  scanUploadRx,
  sun: sunIcon,
  closeBlackBg: closeIcon,
  camera: cameraIcon,
  scanner: scanIcon,
  warningicon: warningIcon,
} = ASSETS.images;

const UPLOAD_RX_TEXT = {
  aiPoweredHeader: "AI-Powered Rx Digitisation",
  aiPoweredDesc:
    "Our smart AI quickly turns handwritten Rx into a clean digital format. If you turn on this toggle, the Rx will be auto-digitised. However, the receptionist can view, print, or share it only after the doctor reviews and saves it in their system.",
  knowMore: "Know more",
  scanUploadHeader: "Scan & Upload Rx",
  autoDigitise: "Auto-Digitise Uploaded Rx with Smart AI.",
  carousel1:
    "Ensure the prescription is placed on a flat, well-lit, plain surface",
  carousel2: "Avoid any shadows or glare on the document",
  carousel3: "Avoid any shadows or glare on the document",
  uploadRxBtn: "Upload Rx",
  unauthorized: "You can’t edit this SnapRx because the editing window has closed",
};

const maxRxUploadTime = 24 * 60 * 60 * 1000; // 24 hours

const CAROUSEL_ITEMS = [
  { text: UPLOAD_RX_TEXT.carousel1, icon: sunIcon },
  { text: UPLOAD_RX_TEXT.carousel2, icon: scanIcon },
  { text: UPLOAD_RX_TEXT.carousel3, icon: cameraIcon },
];

const { Text } = Typography;

const UploadRx = () => {
  const [isAutoDigitizeEnabled, setIsAutoDigitizeEnabled] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [loading, setLoading] = useState(true);
  const { uploadedFiles: uploadedFilesFromStore, error: snapRxError } =
    useSelector((state) => state.ophthalSnapRx);
  const bottomSheetRef = useRef(null);
  const imageUploadRef = useRef(null);
  const [data, setData] = useState({});
  const [getToken, setToken] = useLocalStorage(
    PERSISTANT_STORAGE_KEY_AUTH_TOKEN
  );
  const dispatch = useDispatch();

  useEffect(() => {
    const searchParams = localStorage.getItem("ophthalUploadParams");
    if (searchParams) {
      const data = JSON.parse(decodeURIComponent(searchParams));
      const {
        patientId,
        tcmId,
        pamId,
        timestamp,
        type,
        schemaKey,
        sessionId,
        authToken,
        patientName,
        patientGender,
        patientAge,
        patientPhone,
        autoDigitizeRx,
        doctorId,
      } = data;
      if (authToken) {
        setToken(authToken);
        dispatch(setFileUploadToken(authToken));
        if (sessionId) {
          dispatch(setFileUploadSessionId(sessionId));
        }
        if (timestamp && sessionId) {
          const uploadRxTimestamps = JSON.parse(
            localStorage.getItem("ophthalUploadRxTimestamps") || "{}"
          );
          if (uploadRxTimestamps[sessionId] !== timestamp) {
            uploadRxTimestamps[sessionId] = timestamp;
            localStorage.setItem(
              "ophthalUploadRxTimestamps",
              JSON.stringify(uploadRxTimestamps)
            );
          }
        }

        const storedSessionId = JSON.parse(
          localStorage.getItem("ophthalUploadRxTimestamps")
        );
        if (sessionId && storedSessionId?.[sessionId]) {
          const now = Date.now();
          const diff = now - Number(storedSessionId[sessionId]);
          if (diff > maxRxUploadTime) {
            setShowFailure(true);
          }
        }
      }
      setData({
        patientId,
        tcmId,
        pamId,
        timestamp,
        type,
        schemaKey,
        sessionId,
        patientName,
        patientGender,
        patientAge,
        patientPhone,
        autoDigitizeRx,
        doctorId,
      });
    }
  }, []);

  useEffect(() => {
    if (data.hasOwnProperty("autoDigitizeRx")) {
      setIsAutoDigitizeEnabled(!!data?.autoDigitizeRx);
    }
  }, [data]);

  useEffect(() => {
    if (
      data?.patientId &&
      data?.sessionId &&
      uploadedFilesFromStore?.length === 0
    ) {
      setLoading(true);
      dispatch(
        getFilesOnMobile({
          patientId: data.patientId,
          visitId: data?.pamId,
          sessionId: data?.sessionId,
          schemaKey: data?.schemaKey,
        })
      ).then(() => {
        setLoading(false);
      });
    }
  }, [data, uploadedFilesFromStore?.length]);

  useEffect(() => {
    if (uploadedFilesFromStore?.length > 0) {
      setLoading(false);
      setShowSuccess(true);
    }
  }, [uploadedFilesFromStore]);

  const handleDigitizeRxToggle = (isToggled) => {
    setIsAutoDigitizeEnabled(isToggled);
  };

  const autoDigitizeRxValue = useMemo(() => {
    return isAutoDigitizeEnabled !== !!data?.autoDigitizeRx
      ? isAutoDigitizeEnabled
      : null;
  }, [isAutoDigitizeEnabled, data?.autoDigitizeRx]);

  useEffect(() => {
    if (autoDigitizeRxValue !== null) {
      if (data?.patientId) {
        localStorage.setItem(
          `autoDigitizeRx_${data.patientId}`,
          JSON.stringify(autoDigitizeRxValue)
        );
      }
    }
  }, [autoDigitizeRxValue, data]);

  useEffect(() => {
    if (data?.patientId) {
      const storedValue = localStorage.getItem(
        `autoDigitizeRx_${data.patientId}`
      );
      if (storedValue !== null) {
        try {
          const parsedValue = JSON.parse(storedValue);
          if (data.patientId && isAutoDigitizeEnabled !== parsedValue) {
            setIsAutoDigitizeEnabled(parsedValue);
          }
        } catch (e) {
          console.log("error in autoDigitizeRxValue", e);
        }
      }
    }
    // eslint-disable-next-line
  }, [data?.patientId]);

  const handleUploadClick = () => {
    trackEvent(EVENTS.SNAP_RX.uploadClicked, {
      patient_unique_id: data?.patientId,
      doctor_id: data?.doctorId,
      upload_source: "EMR",
    });
    imageUploadRef.current?.handleUploadClick();
  };

  const handleAddEditClick = () => {
    setShowSuccess(false);
    setTimeout(() => {
      imageUploadRef.current?.handleAddEditClick();
    }, 100);
  };

  const handlePreviewClose = () => {
    setLoading(true);
    dispatch(
      getFilesOnMobile({
        patientId: data?.patientId,
        visitId: data?.pamId,
        sessionId: data?.sessionId,
        schemaKey: data?.schemaKey,
      })
    )
      .then((res) => {
        setLoading(false);
        setShowSuccess(res?.payload?.files?.length);
      })
      .catch((err) => {
        setLoading(false);
        setShowFailure(true);
      });
  };

  if (loading) {
    return <FullPageLoader />;
  }

  if (showFailure || snapRxError) {
    return (
    <div className="upload-rx-container">
      <div className="d-flex flex-column align-items-center justify-content-center w-100">
        <img className="warning-icon" src={warningIcon} alt="logo" />
        <div className="text-center fs-16 fw-normal mt-20">
          {UPLOAD_RX_TEXT.unauthorized}
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="upload-rx-container">
      {showSuccess && (
        <UploadSuccess onAddEditClick={handleAddEditClick} patientData={data} />
      )}
      <BottomSheetWrapper ref={bottomSheetRef}>
        <div className="p-20">
          <div className="pb-24 fw-semibold fs-16 text-black">
            {UPLOAD_RX_TEXT.aiPoweredHeader}
          </div>
          <div className="pb-24 fs-14">{UPLOAD_RX_TEXT.aiPoweredDesc}</div>
          <div
            className="close-btn d-flex align-items-center justify-content-center"
            onClick={() => bottomSheetRef.current.hide()}
          >
            <img src={closeIcon} alt="close" />
          </div>
        </div>
      </BottomSheetWrapper>
      <ImageUpload
        ref={imageUploadRef}
        patientUniqueId={data?.patientId}
        sessionId={data?.sessionId || "test-session"}
        schemaKey={data?.schemaKey}
        onPreviewClose={handlePreviewClose}
        uploadedFilesFromStore={uploadedFilesFromStore}
        autoDigitizeRx={autoDigitizeRxValue}
      />
      <div className="upload-rx-content">
        <img className="website-logo" src={websiteLogo} alt="logo" />
        <div className="main-content">
          <div className="main-content-header">
            {UPLOAD_RX_TEXT.scanUploadHeader}
          </div>
          <ScanAnimationWrapper width={172} height={228}>
            <img
              className="upload-rx-img mb-20"
              src={scanUploadRx}
              alt="scan-rx"
            />
          </ScanAnimationWrapper>
          <div className="px-2 body-content">
            <Card bordered={true} className="auto-digitize-toggle-card">
              <div className="align-items-center d-flex justify-content-between">
                <div className="d-flex align-items-center justify-content-start">
                  <img className="ai-agent" src={aiAgent} alt="x" />
                  <Text className="mx-20">
                    {UPLOAD_RX_TEXT.autoDigitise}
                    <a
                      onClick={() => bottomSheetRef.current.show()}
                      className="ps-1 know-more-link"
                    >
                      {UPLOAD_RX_TEXT.knowMore}
                    </a>
                  </Text>
                </div>
                <Switch
                  value={isAutoDigitizeEnabled}
                  onChange={handleDigitizeRxToggle}
                />
              </div>
            </Card>
            <PatientInfoCard
              name={data?.patientName}
              gender={data?.patientGender}
              age={data?.patientAge}
              phone={data?.patientPhone}
            />
            <Card
              bordered={true}
              className="auto-digitize-toggle-card p-12 pb-25"
            >
              <Carousel autoplay autoplaySpeed={5000}>
                {CAROUSEL_ITEMS.map(({ text, icon }, index) => (
                  <div key={index}>
                    <div className="d-flex justify-content-start align-items-center">
                      <img className={"sun-icon"} src={icon} alt="o" />
                      <Text className="ps-2">{text}</Text>
                    </div>
                  </div>
                ))}
              </Carousel>
            </Card>
            <Button
              type="primary"
              className="upload-rx-btn fs-18 fw-bold"
              onClick={handleUploadClick}
            >
              {UPLOAD_RX_TEXT.uploadRxBtn}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadRx;
