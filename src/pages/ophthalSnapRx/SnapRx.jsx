import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import CashManagerContext from "../../context/CashManagerContext";
import { useLocation, useNavigate } from "react-router-dom";

import FullPageLoader from "../vaccination/components/Loader";
import ErrorBoundary from "./components/ErrorBoundary";
import UploadedFilesPreview from "./components/UploadedFilesPreview";
import { Drawer } from "antd";
import KnowMore from "../../components/KnowMore";
import {
  MESSAGE_KEY,
  OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY,
  SNAP_RX_KNOW_MORE_DATA,
} from "../../utils/constants";
import FileUploadErrorModal from "../../components/common/FileUploadErrorModal";
import {
  OphthalSnapRxSessionProvider,
} from "./context/SnapRxSessionContext";
import UploadWrittenRx from "./components/UploadWrittenRx";
import { message, Button } from "antd";
import "./SnapRx.scss";
import { useSelector } from "react-redux";
import {
  generateFileUploadToken,
  getFiles,
  setFileUploadToken,
  setFileUploadSessionId,
  setUploadedFilesFromStore,
  digitizeAssessments,
  resetFileUploadToken,
} from "../../redux/ophthalSnapRxDigitizationSlice";
import { useDispatch } from "react-redux";
import PreviewDrawer from "./components/PreviewDrawer";
import { useOphthalmologyExamDataStore } from "../../hooks/useOphthalmologyExamDataStore";
import { ASSETS } from "../../assets";
const {
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

const UPLOADED_FILES_DOMAIN = "iscribe.blob.core.windows.net";

function SnapRxContent({
  previousOutput,
  handleClose,
  schemaKey = "VISUAL_ACUITY_TEST",
  onSuccess,
}) {
  const { addDataToStore } = useOphthalmologyExamDataStore();
  const { state } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    uploadedFiles: uploadedFilesFromStoreRaw,
    uploadedFilesScope,
    fileUploadToken,
    fileUploadSessionId: sessionId,
  } = useSelector((state) => state.ophthalSnapRx);

  const { patient_data, send_path, caseManagerData, pam_id } = state || {};
  const patientId =
    patient_data?.pm_id ||
    patient_data?.patient_id ||
    patient_data?.patient_unique_id;
  const visitId = patient_data?.pam_id || pam_id || 0;

  const uploadedFilesFromStore =
    uploadedFilesScope?.patientId === patientId &&
    uploadedFilesScope?.visitId === visitId
      ? (uploadedFilesFromStoreRaw || [])
      : [];
  const { userId } = useSelector((state) => state.doctors);
  const uploadWrittenRxRef = useRef(null);
  const timerForLoadingRef = useRef(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showKnowMore, setShowKnowMore] = useState(false);
  const [isUploadMoreDrawerOpen, setIsUploadMoreDrawerOpen] = useState(false);
  const [isAddMoreClicked, setIsAddMoreClicked] = useState(false);
  const [isDigitizing, setIsDigitizing] = useState(false);
  const previewDrawerRef = useRef(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
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

  useEffect(() => {
    const tokenDataString = localStorage.getItem(
      OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY
    );
    if (!tokenDataString) {
      return;
    }
    try {
      const parsedTokens = JSON.parse(tokenDataString);
      const currentTime = Date.now();
      const validTokens = {};

      Object.keys(parsedTokens).forEach((key) => {
        if (parsedTokens[key]?.expiresIn > currentTime) {
          validTokens[key] = parsedTokens[key];
        }
      });

      localStorage.setItem(
        OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY,
        JSON.stringify(validTokens)
      );
    } catch (error) {
      console.error("Error cleaning up expired tokens:", error);
    }
  }, []);

  useEffect(() => {
    if (!patientId || visitId == null) return;

    const tokenKey = `fileUploadToken_${patientId}_${visitId}`;
    const tokenDataString = localStorage.getItem(
      OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY
    );
    if (tokenDataString) {
      try {
        const parsed = JSON.parse(tokenDataString);
        const storedToken = parsed[tokenKey];
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const isExpired =
          !storedToken?.timestamp ||
          Date.now() - storedToken.timestamp > ONE_DAY_MS ||
          Date.now() > storedToken.expiresIn;
        if (storedToken && !isExpired) {
          dispatch(setFileUploadToken(storedToken.value));
          if (storedToken.sessionId) {
            dispatch(setFileUploadSessionId(storedToken.sessionId));
          }
          return;
        }
        if (isExpired && parsed[tokenKey]) {
          delete parsed[tokenKey];
          localStorage.setItem(
            OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY,
            JSON.stringify(parsed)
          );
        }
      } catch (error) {
        console.error("Error parsing stored token:", error);
      }
    }

    if (!fileUploadToken) {
      dispatch(
        generateFileUploadToken({
          patientId,
          visitId,
          schemaKey,
        })
      );
    }
  }, [dispatch, fileUploadToken, patientId, schemaKey, visitId]);

  useEffect(() => {
    if (!fileUploadToken || !patientId || visitId == null) return;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const tokenKey = `fileUploadToken_${patientId}_${visitId}`;
    try {
      const tokensObject = JSON.parse(
        localStorage.getItem(OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY) || "{}"
      );
      tokensObject[tokenKey] = {
        value: fileUploadToken,
        timestamp: Date.now(),
        expiresIn: Date.now() + ONE_DAY_MS,
        sessionId: sessionId || null,
      };
      localStorage.setItem(
        OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY,
        JSON.stringify(tokensObject)
      );
    } catch (error) {
      console.error("Error saving file upload token:", error);
    }
  }, [fileUploadToken, patientId, sessionId, visitId]);

  useEffect(() => {
    return () => {
      dispatch(setFileUploadToken(null));
    };
  }, []);

  const fetchUploadedFiles = async (showErrorOnRefreshClick = false) => {
    const tokenForFiles = fileUploadToken;
    if (!patientId || visitId == null) {
      message.error("Patient information is missing. Please try again.");
      return;
    }
    if (showErrorOnRefreshClick) {
      setIsLoading(true);
    }
    try {
      const reqData = {
        patientId,
        visitId,
        sessionId,
        fileUploadToken: tokenForFiles,
        type: schemaKey,
      };
      dispatch(getFiles({ ...reqData }));
    } catch (error) {
      console.error("Error fetching uploaded files:", error);
    } finally {
      timerForLoadingRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  useEffect(() => {
    if (fileUploadToken) {
      fetchUploadedFiles();
    }
  }, [fileUploadToken, patientId, schemaKey, visitId]);

  useEffect(() => {
    return () => {
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
    if (!patientId || visitId == null) {
      setIsLoading(false);
      message.error("Patient information is missing. Please try again.");
      return;
    }
    if (uploadedFilesFromStore?.length === 0) {
      setUploadedFiles([]);
      setIsLoading(false);
      return;
    }
    if (
      !uploadedFilesFromStore?.[0]?.fileUrl?.includes(UPLOADED_FILES_DOMAIN)
    ) {
      const dedupedFiles = Array.from(
        new Map(
          uploadedFilesFromStore.map((file) => [
            file.filename || file.name,
            file,
          ])
        ).values()
      );
      setUploadedFiles(dedupedFiles);
      dispatch(setUploadedFilesFromStore(dedupedFiles));
      setIsLoading(false);
      return;
    }

    try {
      const dedupedFiles = Array.from(
        new Map(
          uploadedFilesFromStore.map((file) => [
            file.filename || file.name,
            file,
          ])
        ).values()
      );
      // Apply deletion before normalizing to avoid re-uploading/duplicating files
      const filteredStoreFiles = toDeleteFile
        ? dedupedFiles.filter(
            (file) =>
              file?.filename !== toDeleteFile &&
              file?.name !== toDeleteFile &&
              file !== toDeleteFile
          )
        : dedupedFiles;

      const normalizedFiles = await Promise.all(
        filteredStoreFiles.map(async (file, index) => {
          const fileBlob = await fetchImageAsFile(file.fileUrl);
          const objectUrl = URL.createObjectURL(fileBlob);
          return {
            id: Date.now() + index,
            name: file.filename || file.name,
            filename: file.filename || file.name,
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
      dispatch(setUploadedFilesFromStore(filteredStoreFiles));
      if (toDeleteFile) {
        try {
          if (!filteredStoreFiles.length) {
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
      !uploadedFilesFromStore?.length &&
      !uploadedFiles?.length
    ) {
      navigate(-1, { replace: true });
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [uploadedFilesFromStore?.length]);

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

  const handleRemoveFile = (file) => {
    const fileId = file?.id;
    const filename = file?.filename || file?.name || file;

    // If files are already on the server, delete via refresh flow
    if (uploadedFilesFromStore?.length) {
      handlePreviewDelete(filename);
      return;
    }

    // Fallback: just remove from local uploads
    if (fileId || filename) {
      uploadWrittenRxRef?.current?.handleRemoveFile(fileId || filename, true, !fileId);
    }
  };

  const handleRotateClick = (fileId) => {
    uploadWrittenRxRef?.current?.handleRotateClick(fileId);
  };

  const handleGoBackToMainFiles = () => {
    clearTimeout(timerForLoadingRef.current);
    setIsLoading(true);
    dispatch(setUploadedFilesFromStore([]));
    fetchUploadedFiles();
  };

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
    setIsAddMoreClicked(false);
    setIsUploadMoreDrawerOpen(false);
  };

  const handleRefreshForMobileUploadedFiles = () => {
    fetchUploadedFiles(true);
  };

  const handleFileEdit = (file) => {
    uploadWrittenRxRef?.current?.handleFileEdit(file);
    previewDrawerRef?.current?.handleFileEdit(file);
  };

  const handlePreviewDelete = (file) => {
    const filename =
      (file && (file.filename || file.name)) || file || "";
    if (!filename) {
      message.error("Unable to delete the selected file. Please try again.");
      return;
    }
    setIsLoading(true);
    fetchImages(filename);
  };
  const removeFileUploadTokenFromLS = () => {
    if (patientId && visitId != null) {
      const tokenKey = `fileUploadToken_${patientId}_${visitId}`;
      const tokenDataString = localStorage.getItem(
        OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY
      );
      if (tokenDataString) {
        try {
          const tokenData = JSON.parse(tokenDataString);
          delete tokenData[tokenKey];
          localStorage.setItem(
            OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY,
            JSON.stringify(tokenData)
          );
        } catch (e) {
          // fallback to removing the whole key
          localStorage.removeItem(OPHTHAL_SNAP_RX_TOKENS_STORAGE_KEY);
        }
      }
    }
  };

  const handleExtract = async () => {
    try {
      setIsDigitizing(true);
      const res = await dispatch(
        digitizeAssessments({
          previousOutput,
          schemaKey,
        })
      ).unwrap();
      const digitizedData =
        res?.data?.rxDigitizationHistory?.[0]?.response || {};

      if (onSuccess) {
        onSuccess(digitizedData);
      } else {
        addDataToStore(digitizedData || {});
      }
      dispatch(resetFileUploadToken());
      removeFileUploadTokenFromLS();
      handleClose();
      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={visitEnd} className="me-3" alt="Visit End" />
            <div>
              <div className="title-common text-start fontroboto">
                Your Input Autofilled Successfully
              </div>
            </div>
            <img
              src={imgCloseVisit}
              className="ms-3"
              onClick={() => message.destroy()}
              alt="Close Visit"
            />
          </div>
        ),
        duration: 3,
      });
    } catch (error) {
      console.error("Error digitizing assessment:", error);
      message.error("Failed to extract details. Please try again.");
    } finally {
      setIsDigitizing(false);
    }
  };

  if (isLoading) {
    return <FullPageLoader />;
  }

  return (
    <CashManagerContext.Provider value={contextApi}>
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
        schemaKey={schemaKey}
        style={{
          display: isPreviewOpen ? "block" : "none",
        }}
      />

      <div
        className={`snap-rx-container ${
          uploadedFilesFromStore?.length ? "with-overflow-hidden" : ""
        }`}
        style={{
          display: isPreviewOpen ? "none" : "block",
        }}
      >
        {/* <Header
          loader={isUploading}
          onClear={handleClearFiles}
          onSubmit={handleCreateSnapRx}
          onUploadMore={handleUploadMore}
          showUploadMoreButton={uploadedFilesFromStore?.length}
          handleTutorial={handleKnowMore}
        /> */}
        <ErrorBoundary>
          <div
            className={`snap-rx-content ${
              uploadedFilesFromStore?.length ? "with-overflow-auto" : ""
            }`}
          >
            {uploadedFilesFromStore?.length && !isUploadMoreDrawerOpen ? (
              <>
                <UploadedFilesPreview
                  uploadedFiles={uploadedFilesFromStore}
                  onEdit={handleFileEdit}
                  loading={false}
                  onDelete={handlePreviewDelete}
                />
              </>
            ) : null}
            <UploadWrittenRx
              isOpen={!uploadedFilesFromStore?.length || isUploadMoreDrawerOpen}
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
          </div>
          {uploadedFilesFromStore?.length && !isUploadMoreDrawerOpen ? (
            <>
              <div className="snap-rx-floating-actions">
                <Button
                  className="upload-more-btn"
                  onClick={handleUploadMore}
                  disabled={isDigitizing}
                >
                  Upload More
                </Button>
                <Button
                  type="primary"
                  className="extract-btn"
                  onClick={handleExtract}
                  loading={isDigitizing}
                >
                  Extract & Autofill Details
                </Button>
              </div>
            </>
          ) : null}
        </ErrorBoundary>
      </div>

      {/* <UploadMoreDrawer
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
      /> */}

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
export default function OphthalSnapRx({
  previousOutput,
  handleClose,
  schemaKey,
  onSuccess,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { visualAcuity } = useSelector((state) => state.ophthalmologyExam);
  const fallbackClose = () => {
    if (location.state?.returnPath) {
      navigate(location.state.returnPath, { replace: true });
      return;
    }
    navigate(-1);
  };
  const previousOutputFromStore = useMemo(
    () =>
      previousOutput ||
      location.state?.previousOutput || { visualAcuityTest: visualAcuity },
    [location.state?.previousOutput, previousOutput, visualAcuity]
  );

  return (
    <OphthalSnapRxSessionProvider>
      <SnapRxContent
        previousOutput={previousOutputFromStore}
        handleClose={handleClose || fallbackClose}
        schemaKey={schemaKey || location.state?.snapRxSchemaKey}
        onSuccess={onSuccess}
      />
    </OphthalSnapRxSessionProvider>
  );
}
