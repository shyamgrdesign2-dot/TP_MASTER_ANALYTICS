import React, { useState, useCallback, useEffect, useRef } from "react";
import CashManagerContext from "../../context/CashManagerContext";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import FullPageLoader from "../vaccination/components/Loader";
import ErrorBoundary from "./components/ErrorBoundary";
import UploadedFilesPreview from "./components/UploadedFilesPreview";
import { Drawer } from "antd";
import KnowMore from "../../components/KnowMore";
import { SNAP_RX_KNOW_MORE_DATA } from "../../utils/constants";
import FileUploadErrorModal from "../../components/common/FileUploadErrorModal";
import {
  SnapRxSessionProvider,
  useSnapRxSession,
} from "./context/SnapRxSessionContext";
import UploadMoreDrawer from "./components/UploadMoreDrawer";
import UploadWrittenRx from "./components/UploadWrittenRx";
import { message } from "antd";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import {
  createSnapRx,
  editSnapRx,
  uploadSnapRxFiles,
} from "./services/snapRxService";
import "./SnapRx.scss";
import { useSelector } from "react-redux";
import {
  generateFileUploadToken,
  getFiles,
  setFileUploadToken,
  setUploadedFilesFromStore,
} from "../../redux/snapRxDigitizationSlice";
import { useDispatch } from "react-redux";
import PreviewDrawer from "./components/PreviewDrawer";
import { clearExpiredTokensFromStorage, getTokenData } from "../../utils/utils";
import ApiTeleconsult from "../../api/services/ApiTeleconsult";
import { GB_TELE_CONSULT } from "../../utils/constants";
import {
  setAppointmentTeleconsultStatus,
  setActiveTeleconsultAppointmentId,
  setActiveTeleconsultConsultationId,
  setJoinToken,
} from "../../redux/teleconsultNotificationSlice";
const UPLOADED_FILES_DOMAIN = "iscribe.blob.core.windows.net";

function SnapRxContent() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { uploadedFiles: uploadedFilesFromStore, fileUploadToken } =
    useSelector((state) => state.snapRx);
  const { userId, profile } = useSelector((state) => state.doctors);
  const joinToken = useSelector((state) => state.teleconsultNotification?.joinToken);
  const { sessionId, refreshSessionId } = useSnapRxSession();
  const uploadWrittenRxRef = useRef(null);
  const timerForLoadingRef = useRef(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showKnowMore, setShowKnowMore] = useState(false);
  const [isUploadMoreDrawerOpen, setIsUploadMoreDrawerOpen] = useState(false);
  const [isAddMoreClicked, setIsAddMoreClicked] = useState(false);
  const previewDrawerRef = useRef(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isWaitingForFiles, setIsWaitingForFiles] = useState(false);
  const [isTeleconsultJoinLoading, setIsTeleconsultJoinLoading] = useState(false);
  const { patient_data, send_path, caseManagerData, pam_id } = state || {};
  const videoConsultData = state?.videoConsultData;
  const isTeleConsultEnabled = useFeatureIsOn(GB_TELE_CONSULT);
  const showTeleconsultIcon =
    isTeleConsultEnabled && videoConsultData?.pam_status_type_appointment === 2;
  const tcmId = caseManagerData?.tcm_id || 0;
  const pamId = pam_id
    ? pam_id
    : caseManagerData !== undefined
    ? caseManagerData.pam_id
    : 0;

  const contextApi = {
    patient_data,
    send_path,
    tcmId,
    pamId,
  };

  const handleTeleconsultClick = async () => {
    if (joinToken) return;
    const appointmentId = pam_id || patient_data?.pam_id || videoConsultData?.pam_id;
    if (!appointmentId) {
      message.error("No appointment selected");
      return;
    }
    setIsTeleconsultJoinLoading(true);
    try {
      const response = await ApiTeleconsult.checkVideoAvailability(appointmentId);
      const data = response?.data ?? response;
      const token = data?.joinPayload?.token ?? data?.token;
      if (token) {
        dispatch(setJoinToken(token));
        dispatch(setActiveTeleconsultAppointmentId(appointmentId));
        if (data?.consultationId) {
          dispatch(setActiveTeleconsultConsultationId(data.consultationId));
        }

        const tokenData = getTokenData();
        window.Moengage.track_event("TP_TC_StartCall", {
          doctor_name: profile?.um_name,
          doctor_number: profile?.um_contact,
          doctor_specialty: profile?.dp_name,
          um_id: tokenData?.user_id,
        });

        if (data?.status) {
          dispatch(setAppointmentTeleconsultStatus({ appointmentId, status: data.status }));
        }
      } else {
        message.error("Teleconsult unavailable as appointment time has passed");
      }
    } catch (_error) {
      message.error("Teleconsult unavailable at the moment.");
    } finally {
      setIsTeleconsultJoinLoading(false);
    }
  };

  useEffect(() => {
    clearExpiredTokensFromStorage();
  }, []);

  const fetchUploadedFiles = async (
    fetchByTcmId = false,
    createEditSnapRx = false,
    showErrorOnRefreshClick = false
  ) => {
    if (
      !patient_data?.patient_unique_id ||
      (!tcmId && !sessionStorage.getItem("snaprx_session_id")) ||
      (fetchByTcmId && !tcmId)
    ) {
      if (showErrorOnRefreshClick) {
        message.error("Please try again after uploading the files.");
      }
      return;
    }
    if (showErrorOnRefreshClick) {
      setIsLoading(true);
    }
    try {
      const reqData = {
        patient_unique_id: patient_data?.patient_unique_id,
      };
      let sessionIdToGenerateToken =
        sessionId || sessionStorage.getItem("snaprx_session_id");
      if (fetchByTcmId && !localStorage.getItem("usedTcmId")) {
        reqData.tcm_id = tcmId;
        sessionIdToGenerateToken = refreshSessionId();
        localStorage.setItem("usedTcmId", true);
      } else {
        reqData.session_id =
          sessionId || sessionStorage.getItem("snaprx_session_id");
      }
      dispatch(
        getFiles({
          ...reqData,
        })
      ).then(() => {
        if (createEditSnapRx) {
          setIsWaitingForFiles(true);
          handleCreateSnapRx();
        }
        if (fetchByTcmId && localStorage.getItem("usedTcmId")) {
          dispatch(
            generateFileUploadToken({
              doctor_id: userId,
              patient_unique_id: patient_data?.patient_unique_id,
              session_id: sessionIdToGenerateToken,
            })
          );
        }
      });
    } catch (error) {
      console.error("Error fetching uploaded files:", error);
    } finally {
      timerForLoadingRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  useEffect(() => {
    fetchUploadedFiles(!!tcmId);
  }, [patient_data, tcmId]);

  useEffect(() => {
    return () => {
      localStorage.removeItem("usedTcmId");
      clearTimeout(timerForLoadingRef.current);
    };
  }, []);

  const fetchImageAsFile = async (url, filename = "image.jpg") => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type });
      return file;
    } catch (err) {
      console.log(err);
    }
  };

  const fetchImages = async (toDeleteFile = null) => {
    if (uploadedFilesFromStore?.length === 0) {
      setUploadedFiles([]);
      setIsLoading(false);
      return;
    }
    if (
      !uploadedFilesFromStore?.[0]?.fileUrl?.includes(UPLOADED_FILES_DOMAIN)
    ) {
      setUploadedFiles(uploadedFilesFromStore);
      setIsLoading(false);
      return;
    }

    try {
      const normalizedFiles = await Promise.all(
        uploadedFilesFromStore.map(async (file, index) => {
          const fileBlob = await fetchImageAsFile(file.fileUrl);
          const objectUrl = URL.createObjectURL(fileBlob);
          return {
            id: Date.now() + index,
            name: file.filename,
            file: fileBlob,
            fileUrl: objectUrl,
            url: objectUrl,
            preview: objectUrl,
            rotation: 0,
            zoom: 1,
            crop: file?.crop || {
              unit: "%",
              x: 2,
              y: 2,
              width: 96,
              height: 96,
            },
          };
        })
      );
      setUploadedFiles(normalizedFiles);
      if (toDeleteFile) {
        try {
          const newUploadedFiles = normalizedFiles?.filter(
            (file) => file.name !== toDeleteFile
          );
          const convertedFiles = normalizedFiles
            .map((file) => {
              return new File([file.file], file.name, {
                type: file.file.type || "image/jpeg",
              });
            })
            .filter((file) => file.name !== toDeleteFile);
          if (convertedFiles?.length) {
            setUploadedFiles(newUploadedFiles);
            const response = await uploadSnapRxFiles(
              convertedFiles,
              patient_data?.patient_unique_id,
              sessionId,
              fileUploadToken
            );
            if (response?.uploaded_files?.length > 0) {
              fetchUploadedFiles();
            }
          } else {
            message.warning(
              "You cannot delete the only file. Please reupload the file."
            );
          }
        } catch (err) {
          console.error("Error: fetching images in snapRx", err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (
      !isLoading &&
      tcmId &&
      !uploadedFilesFromStore?.length &&
      !uploadedFiles?.length &&
      localStorage.getItem("usedTcmId")
    ) {
      navigate(-1, { replace: true });
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [uploadedFilesFromStore?.length]);

  useEffect(() => {
    if (isWaitingForFiles && uploadedFilesFromStore?.length > 0) {
      handleCreateSnapRx();
      setIsWaitingForFiles(false);
    }
  }, [isWaitingForFiles, uploadedFilesFromStore]);

  const handleEditSnapRx = useCallback(async () => {
    if (uploadedFiles?.length === 0 && uploadedFilesFromStore?.length === 0) {
      message.warning("Please upload prescription images before submitting");
      return;
    }

    if (!patient_data?.patient_unique_id) {
      message.error("Patient information is missing. Please try again.");
      return;
    }

    setIsUploading(true);

    try {
      const fileNames =
        uploadedFilesFromStore?.length > 0
          ? uploadedFilesFromStore.map((file) => file.filename || file.name)
          : uploadedFiles.map((file) => file?.filename || file.name);

      const response = await editSnapRx(
        patient_data.patient_unique_id,
        fileNames,
        tcmId,
        sessionId
      );

      if (response && response.status) {
        dispatch(setFileUploadToken(null));
        navigate("/snap-rx/preview", {
          state: {
            ...state,
            ...response?.data,
            files:
              uploadedFilesFromStore?.length > 0
                ? uploadedFilesFromStore
                : uploadedFiles,
          },
          replace: true,
        });
      } else {
        throw new Error(response.message || "Failed to create prescription");
      }
    } catch (error) {
      console.error("Error creating snap rx:", error);
      message.error(
        error.message || "Failed to create prescription. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFiles, patient_data, navigate, state, uploadedFilesFromStore]);

  const handleCreateSnapRx = useCallback(async () => {
    if (!uploadedFilesFromStore?.length) {
      fetchUploadedFiles(false, true);
      return;
    }
    if (tcmId) {
      localStorage.removeItem("usedTcmId");
      handleEditSnapRx();
      return;
    }
    if (!uploadedFilesFromStore?.length) {
      message.warning("Please upload prescription images before submitting");
      return;
    }

    if (!patient_data?.patient_unique_id) {
      message.error("Patient information is missing. Please try again.");
      return;
    }

    setIsUploading(true);

    try {
      const fileNames = uploadedFilesFromStore.map((file) => file.filename);

      const response = await createSnapRx(
        patient_data.patient_unique_id,
        fileNames,
        sessionId,
        patient_data?.pam_id
      );
      if (response && response.status) {
        dispatch(setFileUploadToken(null));
        refreshSessionId();
        navigate("/snap-rx/preview", {
          replace: true,
          state: { ...state, ...response?.data, files: uploadedFilesFromStore },
        });
      } else {
        throw new Error(response.message || "Failed to create prescription");
      }
    } catch (error) {
      console.error("Error creating snap rx:", error);
      message.error(
        error.message || "Failed to create prescription. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFilesFromStore, patient_data, navigate, tcmId, sessionId]);

  const handleClearFiles = () => {
    // clear all files
  };

  const handleUploadMore = useCallback(() => {
    setIsUploadMoreDrawerOpen(true);
  }, []);

  const handleUploadMoreDrawerClose = () => {
    setIsUploadMoreDrawerOpen(false);
    setIsPreviewOpen(false);
    setIsAddMoreClicked(false);
  };

  const fetchUploadedFilesOnUploadMoreDrawer = () => {
    if (isUploadMoreDrawerOpen) {
      setIsUploadMoreDrawerOpen(false);
    }
    fetchUploadedFiles();
  };

  const handleKnowMore = () => {
    setShowKnowMore(!showKnowMore);
  };

  const handleAddMore = () => {
    uploadWrittenRxRef?.current?.handleAddMore();
  };

  const handleReupload = (fileId) => {
    uploadWrittenRxRef?.current?.handleReupload(fileId);
  };

  const handleZoomIn = (fileId) => {
    uploadWrittenRxRef?.current?.handleZoomIn(fileId);
  };

  const handleZoomOut = (fileId) => {
    uploadWrittenRxRef?.current?.handleZoomOut(fileId);
  };

  const handleRemoveFile = (fileId) => {
    uploadWrittenRxRef?.current?.handleRemoveFile(fileId);
  };

  const handleRotateClick = (fileId) => {
    uploadWrittenRxRef?.current?.handleRotateClick(fileId);
  };

  const handleGoBackToMainFiles = () => {
    clearTimeout(timerForLoadingRef.current);
    setIsLoading(true);
    dispatch(setUploadedFilesFromStore([]));
    fetchUploadedFiles(!!tcmId);
  };

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
    setIsAddMoreClicked(false);
  };

  const handleRefreshForMobileUploadedFiles = () => {
    fetchUploadedFiles(false, false, true);
  };

  const handleFileEdit = (file) => {
    uploadWrittenRxRef?.current?.handleFileEdit(file);
    previewDrawerRef?.current?.handleFileEdit(file);
  };

  const handlePreviewDelete = (filename) => {
    setIsLoading(true);
    fetchImages(filename);
  };

  if (isLoading) {
    return <FullPageLoader />;
  }

  return (
    <CashManagerContext.Provider value={contextApi}>
      <div className="snap-rx-container">
        <Header
          loader={isUploading}
          onClear={handleClearFiles}
          onSubmit={handleCreateSnapRx}
          onUploadMore={handleUploadMore}
          showUploadMoreButton={uploadedFilesFromStore?.length}
          handleTutorial={handleKnowMore}
          showTeleconsultIcon={!!showTeleconsultIcon}
          onTeleconsultClick={handleTeleconsultClick}
          isTeleconsultJoinLoading={isTeleconsultJoinLoading}
          isTeleconsultActive={!!joinToken}
        />
        <div className="snap-rx-content">
          <ErrorBoundary>
            {uploadedFilesFromStore?.length ? (
              <UploadedFilesPreview
                uploadedFiles={uploadedFilesFromStore}
                onEdit={handleFileEdit}
                loading={false}
                onDelete={handlePreviewDelete}
              />
            ) : null}
            <UploadWrittenRx
              isOpen={!uploadedFilesFromStore?.length}
              ref={uploadWrittenRxRef}
              showBackButton={false}
              onBack={() => {}}
              fetchUploadedFiles={handleRefreshForMobileUploadedFiles}
              handlePreviewOpen={setIsPreviewOpen}
              handleUpdatedFiles={setUploadedFiles}
              uploadedFiles={uploadedFiles}
              setIsAddMoreClicked={setIsAddMoreClicked}
            />
            {/* Preview Drawer */}
            <PreviewDrawer
              isOpen={isPreviewOpen}
              onClose={handlePreviewClose}
              tcmId={tcmId}
              ref={previewDrawerRef}
              sessionId={sessionId}
              uploadedFilesFromStore={uploadedFilesFromStore}
              onCloseDrawer={handleUploadMoreDrawerClose}
              uploadedFiles={uploadedFiles}
              onReupload={handleReupload}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              handleUpdatedFiles={setUploadedFiles}
              onRemove={handleRemoveFile}
              onRotate={handleRotateClick}
              handleGoBackToMainFiles={handleGoBackToMainFiles}
              onAddMore={handleAddMore}
              isUploadMoreDrawer={false}
            />
          </ErrorBoundary>
        </div>
      </div>

      <UploadMoreDrawer
        isOpen={isUploadMoreDrawerOpen}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        setIsAddMoreClicked={setIsAddMoreClicked}
        onClose={handleUploadMoreDrawerClose}
        setIsPreviewOpen={setIsPreviewOpen}
        fetchUploadedFiles={fetchUploadedFilesOnUploadMoreDrawer}
        tcmId={tcmId}
        sessionId={sessionId}
        onFileUpload={() => {}}
      />

      <FileUploadErrorModal
        isFileSizeError={false}
        isFileLimitError={false}
        isFileTypeError={false}
        onRetry={() => {}}
      />

      {showKnowMore && (
        <Drawer
          open={showKnowMore}
          onClose={handleKnowMore}
          width={"51.625rem"}
          placement="right"
          styles={{
            header: {
              display: "none",
            },
          }}
        >
          <KnowMore
            handleKnowMore={handleKnowMore}
            data={SNAP_RX_KNOW_MORE_DATA}
          />
        </Drawer>
      )}
    </CashManagerContext.Provider>
  );
}

// Main component with session provider
export default function SnapRx() {
  return (
    <SnapRxSessionProvider>
      <SnapRxContent />
    </SnapRxSessionProvider>
  );
}
