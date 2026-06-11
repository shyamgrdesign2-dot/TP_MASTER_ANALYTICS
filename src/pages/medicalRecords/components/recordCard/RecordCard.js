import { Button, Drawer, Dropdown, Popover, Tooltip } from "antd";
import "./RecordCard.scss";
import { useCallback, useEffect, useRef, useState } from "react";

import { deleteDocById, fetchAllPatientDocs } from "../../service";
import { setAllUploadedDocs } from "../../../../redux/uploadDocSlice";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { isMobile } from "react-device-detect";
import axios from "axios";
import { saveAs } from "file-saver";
import CommonModal from "../../../../common/CommonModal";
import DocumentPreview from "../documentPreview/DocumentPreview";
import dayjs from "dayjs";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import { loadPdf, loadVideoThumbnail, mergeDocuments, shortenText, isVideoFile } from "../../utils/helper";
import { VIDEO_THUMBNAIL_TIME } from "../../../../utils/constants";
import config from "../../../../config";
import { PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN } from "../../../../utils/constants";
import { getDecodedToken } from "../../../../utils/localStorage";
import { sendMessageToParent, isInNativeApp } from "../../../../utils/utils";
import { EVENTS } from "../../../../utils/events";
import { ASSETS } from "../../../../assets";
const {
  emptyBg,
  emptyFile,
  file,
  documentDownload: download,
  documentEdit: edit,
  trash,
  alerticon: alertIcon,
} = ASSETS.images;
const closeIcon = ASSETS.mobile.close2;

const RecordCard = ({
  cardData,
  medicalReportDrawer,
  handleDrawerUploadDoc,
  setFilesData,
  setIsEditDocument,
  setUploadDocDrawer,
}) => {
  const dispatch = useDispatch();
  const decodedToken = getDecodedToken();
  const location = useLocation();
  const { state } = location;
  const { patient_data } = state;
  const { uploadDocCategories, patientUploadedDocs } = useSelector(
    (state) => state.uploadDoc
  );
  const {
    notes,
    id,
    url,
    thumbnail_url,
    investigation_date,
    category_id,
    display_name,
  } = cardData || {};

  let thumbnailUrl = thumbnail_url;

  const getThumbnailUrl = async (url) => {
    if (url?.includes(".pdf")) {
      loadPdf(url).then((thumbnailDataUrl) => {
        thumbnailUrl = thumbnailDataUrl;
      });
    } else {
      thumbnailUrl = url;
    }
  };

  useEffect(() => {
    if (!thumbnailUrl) {
      getThumbnailUrl(url);
    }
  }, []);

  const updatedFileName = shortenText(display_name);
  const categoryName = category_id === -2 ? 'Zydus Lab' : category_id === -3 ? 'Zydus Radio' : uploadDocCategories.find(
    (item) => item?.category_id === category_id
  )?.category_name;
  const isZydusRecord = category_id === -2 || category_id === -3 || url?.startsWith(config.zydus_proxy_url);

  const [showTooltip, setShowTooltip] = useState(false);
  const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
  const [shouldShowReadOnlyPopup, setShowReadOnlyPopup] = useState(false);
  const [shouldShowPreview, setShowPreview] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (showTooltip) {
      document.addEventListener("mousedown", handleTooltipClickOutside);
    } else {
      document.removeEventListener("mousedown", handleTooltipClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleTooltipClickOutside);
    };
  }, [showTooltip]);

  const handleTooltipClickOutside = (event) => {
    if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
      setShowTooltip(false);
    }
  };

  const showTooltipPopOver = useCallback(() => {
    setShowTooltip(!showTooltip);
  }, [showTooltip]);

  const tooltipTitle = () => {
    return (
      <div>
        <div className="notes-txt">Notes</div>
        <div>{notes}</div>
      </div>
    );
  };

  const handleDelete = async () => {
    await deleteDocById(id);
    const doctorUploadedDocs = await fetchAllPatientDocs(
      patient_data.patient_unique_id
    );
    dispatch(
      setAllUploadedDocs(
        mergeDocuments(doctorUploadedDocs, patientUploadedDocs)
      )
    );
    toggleDeletePopup();
  };

  const handleEdit = () => {
    if (cardData?.id) {
      if (shouldShowPreview) {
        setShowPreview(false);
      }
      setFilesData([cardData]);
      setIsEditDocument(true);
      setUploadDocDrawer(true);
    } else {
      setShowReadOnlyPopup(true);
    }
  };

  const toggleDeletePopup = () => {
    if (cardData?.id) {
      setShowDeletePopup((prev) => !prev);
    } else {
      setShowReadOnlyPopup((prev) => !prev);
      setFilesData([]);
    }
  };

  const handleInAppDownload = async () => {
    if (!url) return;
    sendMessageToParent(EVENTS.DOWNLOAD, { url });
    // const deviceUid = localStorage.getItem("app_device_unique_id");
    // if (deviceUid) {
    //   const docRef = doc(db, "fileDownload", deviceUid);
    //   try {
    //     const docSnap = await getDoc(docRef);
    //     if (docSnap.exists()) {
    //       await updateDoc(docRef, {
    //         canDownload: "yes",
    //         pdfURL: url,
    //       });
    //     } else {
    //       await setDoc(doc(db, "fileDownload", deviceUid), {
    //         canDownload: "yes",
    //         pdfURL: url,
    //       });
    //     }
    //   } catch (error) {
    //     console.error("Error updating document:", error);
    //   }
    // }
  };

  const handleDownload = async () => {
    if (!url) return;
    try {
      console.log("Starting download for:", display_name);
      console.log("URL:", url);
      
      // For Zydus proxy URLs, use axios with auth headers
      if (url?.startsWith(config.zydus_proxy_url)) {
        const payload = {
          url: url,
          method: "GET",
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem(PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN) == null
                ? null
                : JSON.parse(
                  localStorage.getItem(PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN)
                )
              }`,
          },
        };

        const response = await axios(payload);
        console.log("Download response received:", response.headers);

        const blob = new Blob([response.data], {
          type: response.headers["content-type"],
        });
        console.log("Blob created:", blob.type, blob.size);
        
        saveAs(blob, display_name);
        console.log("File download initiated");
        return;
      }

      // For regular URLs (S3, Firebase Storage, etc.), try fetch first
      try {
        console.log("Attempting fetch download...");
        const response = await fetch(url, {
          method: "GET",
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        console.log("Fetch download successful:", blob.type, blob.size);
        
        saveAs(blob, display_name);
        console.log("File download initiated via fetch");
        return;
      } catch (fetchError) {
        console.log("Fetch failed, trying direct link fallback:", fetchError.message);
        
        // Fallback: Use direct link download (opens in new tab or triggers browser download)
        const link = document.createElement("a");
        link.href = url;
        link.download = display_name;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log("File download initiated via direct link");
      }
    } catch (error) {
      console.error("Error downloading file: ", error);
      console.error("Error details:", error.response || error.message);
      
      // Final fallback: Open in new tab
      console.log("All download methods failed, opening in new tab");
      window.open(url, "_blank");
    }
  };

  const getMenuItems = () => {
    return [
      {
        label: (
          <div
            onClick={() =>
              isInNativeApp() ? handleInAppDownload() : handleDownload()
            }
          >
            <img src={download} alt="download" className="me-2" />
            Download
          </div>
        ),
        key: "download",
      },
      !isZydusRecord && {
        label: (
          <div onClick={handleEdit}>
            <img src={edit} alt="edit" className="me-2" />
            Edit
          </div>
        ),
        key: "edit",
      },
      !isZydusRecord && {
        label: (
          <div onClick={toggleDeletePopup}>
            <img src={trash} alt="delete" className="me-2" />
            Delete
          </div>
        ),
        key: "delete",
      },
    ];
  };

  const handlePreview = () => {
    setShowPreview(false);
  };

  const handleThumbnailClick = () => {
    if (category_id === -3) {
      const tokenData = decodedToken?.result;
      if (tokenData.clinic_id == 8061) {//Cancer Hospital
        window.open(`http://10.12.100.170:6162/Launch_Viewer.asp?Username=hisuser&Password=hisuser&patientid=${patient_data.mrno}`);
      } else if (tokenData.clinic_id == 10733) {//Vadodara Hospital
        window.open(`https://10.14.100.14/PACSAPI/Launch_Viewer?Username=hisuser&Password=hisuser&patientid=${patient_data.mrno}`);
      } else if (tokenData.clinic_id == 10739) {//Anand Hospital
        window.open(`http://10.10.11.108:6162/Launch_Viewer.asp?Username=hisuser&Password=hisuser&patientid=${patient_data.mrno}`);
      } else {//Ahmedabad Hospital
        window.open(`https://10.11.100.106/PACSAPI/Launch_Viewer?Username=hisuser&Password=hisuser&patientid=${patient_data.mrno}`);
      }
    } else {
      setShowPreview(true);
    }
  };

  return (
    <div className="image-wrapper">
      <div
        className="image-container"
        style={{
          backgroundImage: `url('${thumbnailUrl || emptyBg}')`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        onClick={handleThumbnailClick}
      >
        {thumbnailUrl ? null : (
          <>
            <img className="doc-image" src={emptyFile} alt="document" />
            <div className="file-name">{updatedFileName}</div>
          </>
        )}
        {notes?.length > 0 ? (
          <div className="notes-style" ref={tooltipRef}>
            <Tooltip
              title={tooltipTitle}
              overlayClassName="medical-records-tooltip"
              overlayStyle={{ width: 300 }}
              placement="bottom"
              autoAdjustOverflow={true}
              getPopupContainer={(trigger) => trigger.parentElement}
            >
              <Popover
                open={showTooltip}
                onOpenChange={showTooltipPopOver}
                overlayClassName="pp-0"
                trigger={["hover", "click"]}
                placement="bottom"
              >
                <img
                  onClick={() => {
                    setShowTooltip(true);
                  }}
                  style={{ cursor: "pointer" }}
                  src={file}
                  alt="file"
                />
              </Popover>
            </Tooltip>
          </div>
        ) : null}
      </div>

      <div className="document-details">
        <div
          className="document-details-content d-flex justify-content-between flex-column align-items-start"
          style={{ fontSize: "12px", width: "85%" }}
        >
          <div className="category">{categoryName}</div>
          <div style={{ fontSize: "10px" }}>{dayjs(investigation_date).format("DD MMM, YYYY")}</div>
        </div>
        <div>
          <Dropdown
            className="btn btn-outline btn-more"
            menu={{
              items: getMenuItems(),
            }}
          >
            <div>
              <svg
                className="document-more-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </div>
          </Dropdown>
        </div>
      </div>
      {/* Delete Confirmation - Bottom Sheet for Mobile, Modal for Desktop */}
      {isMobile && (shouldShowDeletePopup || shouldShowReadOnlyPopup) ? (
        <Drawer
          placement="bottom"
          onClose={toggleDeletePopup}
          open={shouldShowDeletePopup || shouldShowReadOnlyPopup}
          height="auto"
          className="delete-record-bottom-sheet"
          closable={false}
          maskClosable={true}
          destroyOnClose={true}
        >
          <div className="delete-record-sheet-content">
            <div className="delete-record-sheet-header">
              <h3 className="delete-record-sheet-title">
                {shouldShowReadOnlyPopup
                  ? "This document cannot be edit or deleted."
                  : "You may lose your data"}
              </h3>
              <button
                className="delete-record-sheet-close-btn"
                onClick={toggleDeletePopup}
                type="button"
                aria-label="Close"
              >
                <img src={closeIcon} alt="Close" className="delete-record-close-icon" />
              </button>
            </div>

            <div className="delete-record-sheet-body">
              <div className="alert-warning rounded-10px p-2 patient-details">
                <div className="d-flex align-items-center">
                  <img className="me-3" src={alertIcon} alt="Warning" />
                  <span>
                    {shouldShowReadOnlyPopup
                      ? "This document was uploaded by the patient and cannot be modified."
                      : "Are you sure you want to delete ?"}
                  </span>
                </div>
              </div>
            </div>

            <div className="delete-record-sheet-actions">
              {shouldShowReadOnlyPopup ? (
                <button
                  onClick={toggleDeletePopup}
                  className="delete-record-sheet-btn delete-record-btn-primary"
                  type="button"
                >
                  Got it
                </button>
              ) : (
                <div className="delete-record-actions-row">
                  <button
                    onClick={handleDelete}
                    className="delete-record-sheet-btn delete-record-btn-yes"
                    type="button"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={toggleDeletePopup}
                    className="delete-record-sheet-btn delete-record-btn-no"
                    type="button"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>
        </Drawer>
      ) : !isMobile && (shouldShowDeletePopup || shouldShowReadOnlyPopup) ? (
        <CommonModal
          isModalOpen={shouldShowDeletePopup || shouldShowReadOnlyPopup}
          onCancel={toggleDeletePopup}
          modalWidth={510}
          title={
            shouldShowReadOnlyPopup
              ? "This document cannot be edit or deleted."
              : "You may lose your data"
          }
          modalBody={
            <>
              <div className="alert-warning rounded-10px p-2 patient-details">
                <div className="d-flex align-items-center">
                  <img className="me-3" src={alertIcon} alt="Warning" />
                  <span>
                    {shouldShowReadOnlyPopup
                      ? "This document was uploaded by the patient and cannot be modified."
                      : "Are you sure you want to delete ?"}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="d-flex align-items-center mt-2 justify-content-end">
                  {shouldShowReadOnlyPopup ? null : (
                    <div
                      onClick={handleDelete}
                      className="me-4 text-decoration-underline btn p-0 text-main"
                    >
                      Yes, Delete
                    </div>
                  )}
                  <Button
                    onClick={toggleDeletePopup}
                    className="lh-lg btn btn-primary3 btn-41 px-4"
                  >
                    <span>{shouldShowReadOnlyPopup ? "Got it" : "No"}</span>
                  </Button>
                </div>
              </div>
            </>
          }
        />
      ) : null}
      {shouldShowPreview && (
        <Drawer
          closeIcon={false}
          placement="right"
          bodyStyle={{ backgroundColor: "#222222" }}
          onClose={handlePreview}
          open={shouldShowPreview}
          width="100%"
          height={"100%"}
          push={false}
        >
          <DocumentPreview
            onClose={handlePreview}
            cardData={cardData}
            handleEdit={handleEdit}
            toggleDeletePopup={toggleDeletePopup}
            handleInAppDownload={handleInAppDownload}
            handleDownload={handleDownload}
          />
        </Drawer>
      )}
    </div>
  );
};

export default RecordCard;
