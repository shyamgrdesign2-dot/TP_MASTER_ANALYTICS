import { Card, Divider, Modal } from "antd";
import "./UploadDocPopup.scss";
import { db } from "../../../../firebase";
import {
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setLoadingStatus } from "../../../../redux/uploadDocSlice";
import { useLocation } from "react-router-dom";
import { fetchDocumentAsFile } from "../../../../utils/utils";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../../../utils/constants";
import { getCorrectedFileName } from "../../utils/helper";

const UploadDocPopup = ({
  shouldShowUploadDocPopup,
  onCancel,
  setFilesData,
  setUploadDocDrawer,
  patientData,
  setIsFileSizeError,
  setIsFileLimitError,
  setIsFileTypeError,
}) => {
  const dispatch = useDispatch();
  const { state } = useLocation();
  const patient_data = state?.patient_data;
  const patientUniqueId =
    patient_data?.patient_unique_id || patientData?.patient_unique_id || 0;
  const deviceUid = localStorage.getItem("app_device_unique_id");
  const handleClick = async (type) => {
    if (deviceUid) {
      const docRef = doc(db, "capturedImage", deviceUid);
      try {
        const docSnap = await getDoc(docRef);
        const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
        const cleanedToken = token.replace(/['"]+/g, "");
        if (docSnap.exists()) {
          await updateDoc(docRef, {
            clicked: "yes",
            type: type,
            patient_unique_id: patientUniqueId,
            token: cleanedToken,
          });
        } else {
          await setDoc(doc(db, "capturedImage", deviceUid), {
            clicked: "yes",
            type: type,
            patient_unique_id: patientUniqueId,
            token: cleanedToken,
          });
        }
      } catch (error) {
        console.error("Error updating document: ", error);
      }
    }
    dispatch(setLoadingStatus(true));
    onCancel();
  };

  const getFiles = async (urls, names) => {
    if (urls?.length) {
      for (const [index, url] of urls.entries()) {
        const cleanFileName = getCorrectedFileName(names?.[index] || "");
        const newFile = await fetchDocumentAsFile(url, cleanFileName);
        setFilesData((prev) => {
          const isAlreadyAdded = prev.some(
            (file) => file.name === cleanFileName
          );
          if (!isAlreadyAdded) {
            return [newFile, ...prev];
          }
          return prev;
        });
      }
      setUploadDocDrawer(true);
    }
  };

  useEffect(() => {
    const checkInFireBase = async () => {
      if (deviceUid) {
        const docCapturedImage = doc(db, "capturedImage", deviceUid);
        try {
          const docCapturedImageSnap = await getDoc(docCapturedImage);
          if (docCapturedImageSnap.exists()) {
            onSnapshot(
              doc(db, "capturedImage", deviceUid),
              async (docSnapshotOfCapturedImage) => {
                const res = docSnapshotOfCapturedImage?.data();
                if (res?.clicked === "no") {
                  if (res?.fileValidations === "above15mb") {
                    setIsFileSizeError(true);
                  } else if (res?.fileValidations === "above5files") {
                    setIsFileLimitError(true);
                  } else if (res?.fileValidations === "notsupported") {
                    setIsFileTypeError(res?.type);
                  } else {
                    getFiles(res?.url?.split(","), res?.name?.split(","));
                  }
                  dispatch(setLoadingStatus(false));
                  deleteDoc(doc(db, "capturedImage", deviceUid));
                }
              }
            );
          }
        } catch (error) {
          console.error("Error updating document:", error);
        }
      } else {
        console.error("Device UID not found");
      }
    };

    return () => checkInFireBase();
  }, [db, deviceUid]);

  return (
    <div>
      <Modal
        open={shouldShowUploadDocPopup}
        centered
        closeIcon={false}
        footer={null}
        className="modalcommon"
        onCancel={onCancel}
        destroyOnClose
      >
        <Card
          title={"Upload Medical Records"}
          className="upload-doc-popup"
          style={{ textAlign: "center" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 500,
              rowGap: 4,
              padding: "0px",
            }}
          >
            <div className="popup-txt" onClick={() => handleClick("camera")}>
              Camera
            </div>
            <Divider style={{ width: "100%" }} />
            <div className="popup-txt" onClick={() => handleClick("library")}>
              File
            </div>
            <Divider style={{ width: "100%" }} />
            <div
              className="popup-txt"
              style={{ fontWeight: 600 }}
              onClick={onCancel}
            >
              Cancel
            </div>
          </div>
        </Card>
      </Modal>
    </div>
  );
};

export default UploadDocPopup;
