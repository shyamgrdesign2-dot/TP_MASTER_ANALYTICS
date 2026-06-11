import { Button, Card, DatePicker, Input, Select, message } from "antd";
import { useEffect, useRef, useState } from "react";

import dayjs from "dayjs";
import { disableFutureDates } from "../growthChart/growthChartHelper";
import "./UploadDocument.scss";
import CommonModal from "../../common/CommonModal";

import { useDispatch, useSelector } from "react-redux";
import {
  deleteDocsUploadedFromAndroid,
  fetchAllPatientDocs,
  updateDocument,
  uploadDocument,
} from "./service";
import { setAllUploadedDocs } from "../../redux/uploadDocSlice";
import { useLocation } from "react-router-dom";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import { isAndroid, isBrowser } from "react-device-detect";
import { MESSAGE_KEY } from "../../utils/constants";
import {
  generateUniqueFileName,
  getCorrectedFileName,
  loadPdf,
  loadVideoThumbnail,
  mergeDocuments,
  shortenText,
  uploadDocURLtoFile,
  isVideoFile,
  isPdfFile,
  isImageFile,
} from "./utils/helper";
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  MAX_DOCUMENT_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
  VIDEO_THUMBNAIL_TIME,
} from "../../utils/constants";
import { ASSETS } from "../../assets";
const {
  emptyBg,
  emptyFile,
  alerticon: alertIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

const UploadDocument = ({
  onClose,
  handleDrawerUploadDoc,
  shouldShowDeletePopup,
  setShowDeletePopup,
  filesData,
  setFilesData,
  isEditDocument,
  setIsEditDocument,
  patientData,
  isAppointmentData,
  handleUploadDocPopup,
}) => {
  const dispatch = useDispatch();
  const { userId } = useSelector((state) => state.doctors);
  const { state } = useLocation();
  const patient_data = state?.patient_data || patientData;
  const { uploadDocCategories, allUploadedDocs, patientUploadedDocs } =
    useSelector((state) => state.uploadDoc);
  const documentOptions = uploadDocCategories.map((item) => {
    return {
      label: item.category_name,
      value: item.category_id,
    };
  });

  const [isFileSizeError, setIsFileSizeError] = useState(false);
  const [isFileLimitError, setIsFileLimitError] = useState(false);
  const [isFileTypeError, setIsFileTypeError] = useState(null);
  const [loader, setLoader] = useState(false);

  const [recordData, setRecordData] = useState([]);
  const fileInputRef = useRef(null);

  const updateRecordData = async () => {
    const updatedRecord = await Promise.all(
      filesData.map(async (item) => {
        let thumbnailUrl;
        let fileData;
        if (!isEditDocument) {
          if (item && isPdfFile(item.type)) {
            // Generate PDF thumbnail from first page
            const pdfObjectURL = URL.createObjectURL(item);
            try {
              thumbnailUrl = await loadPdf(pdfObjectURL);
              fileData = uploadDocURLtoFile(
                thumbnailUrl,
                "thumbnail_" +
                  item?.name?.substring(0, item?.name?.lastIndexOf(".")) +
                  ".png"
              );
            } finally {
              // Revoke PDF object URL after processing
              URL.revokeObjectURL(pdfObjectURL);
            }
          } else if (item && isVideoFile(item.type)) {
            // Generate video thumbnail from first frame
            try {
              thumbnailUrl = await loadVideoThumbnail(item, VIDEO_THUMBNAIL_TIME);
              fileData = uploadDocURLtoFile(
                thumbnailUrl,
                "thumbnail_" +
                  item?.name?.substring(0, item?.name?.lastIndexOf(".")) +
                  ".png"
              );
            } catch (error) {
              console.error("Error generating video thumbnail:", error);
              // Create a placeholder or use file as-is
              console.warn("Using fallback for video thumbnail");
              thumbnailUrl = null;
              fileData = null;
            }
          } else if (item && isImageFile(item.type)) {
            // Use image file as thumbnail - convert to data URL to avoid memory leak
            const imageObjectURL = URL.createObjectURL(item);
            try {
              // Convert to data URL to avoid keeping object URL in memory
              const img = new Image();
              img.src = imageObjectURL;
              await new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
              });
              
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);
              thumbnailUrl = canvas.toDataURL("image/png");
              
              fileData = new File(
                [item],
                "thumbnail_" +
                  item?.name?.substring(0, item?.name?.lastIndexOf(".")) +
                  ".png",
                { type: "image/png" }
              );
            } finally {
              // Revoke image object URL after conversion
              URL.revokeObjectURL(imageObjectURL);
            }
          }
        }
        return {
          id: item?.id,
          name: item?.name,
          recordType: item?.category_id,
          recordUploadDate: item?.investigation_date
            ? item?.investigation_date
            : dayjs().format("YYYY-MM-DD"),
          notes: item?.notes || "",
          thumbnailUrl: thumbnailUrl,
          thumbnailFile: fileData,
        };
      })
    );
    setRecordData(updatedRecord);
  };

  useEffect(() => {
    if (filesData?.length !== recordData?.length) {
      updateRecordData();
    }
  }, [filesData]);

  useEffect(() => {
    const supportedTypes = [
      ...SUPPORTED_IMAGE_TYPES,
      ...SUPPORTED_VIDEO_TYPES,
      ...SUPPORTED_DOCUMENT_TYPES,
    ];
    
    // Helper function to check if file is supported by extension (fallback for incorrect MIME types)
    const isSupportedByExtension = (fileName) => {
      if (!fileName) return false;
      const extension = fileName.toLowerCase().split('.').pop();
      const supportedExtensions = [
        'pdf', 'png', 'jpg', 'jpeg', 'gif', 
        'mp4', 'mov', 'avi'
      ];
      return supportedExtensions.includes(extension);
    };
    
    if (filesData?.length > 0) {
      filesData.forEach((item) => {
        // Check if file is video by MIME type OR extension (for mobile uploads)
        const isVideoByMimeType = isVideoFile(item?.type);
        const isVideoByExtension = item?.name && /\.(mp4|mov|avi)$/i.test(item?.name);
        const isVideoType = isVideoByMimeType || isVideoByExtension;
        
        // Check file size based on type
        const maxSize = isVideoType 
          ? MAX_VIDEO_FILE_SIZE 
          : MAX_DOCUMENT_FILE_SIZE;
        
        if (item?.size > maxSize) {
          setIsFileSizeError(true);
        }
        
        // Check file type - use MIME type OR file extension as fallback
        const isSupportedMimeType = supportedTypes?.includes(item?.type);
        const isSupportedExtension = isSupportedByExtension(item?.name);
        
        if (!isSupportedMimeType && !isSupportedExtension) {
          setIsFileTypeError(item?.type || item?.name);
        }
      });
      if (filesData.length > 5) {
        setIsFileLimitError(true);
      }
    }
  }, [filesData]);

  const handleRecordChange = (index, field, value) => {
    setRecordData((prevData) =>
      prevData.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const toggleDeletePopup = () => {
    setShowDeletePopup(false);
  };

  const handleDeleteRecord = (index) => {
    const updatedFilesData = filesData?.filter((_, i) => i !== index);
    setFilesData([...updatedFilesData]);
    setRecordData((prevData) => prevData.filter((_, i) => i !== index));
    if (updatedFilesData.length === 0) {
      handleDrawerUploadDoc();
    }
  };

  const handleSubmit = async () => {
    setLoader(true);
    if (isEditDocument) {
      const fileData = recordData?.[0];
      if (fileData) {
        const payload = {
          id: fileData?.id,
          category_id: fileData?.recordType,
          investigation_date: fileData?.recordUploadDate,
          notes: fileData?.notes?.trim(),
        };
        const resultStatus = await updateDocument([payload]);
        if (resultStatus?.status === 204) {
          const doctorUploadedDocs = allUploadedDocs
            .map((item) => {
              if (item?.id)
                return item.id === fileData?.id
                  ? {
                      ...item,
                      category_id: payload?.category_id,
                      investigation_date: payload?.investigation_date,
                      notes: payload?.notes,
                    }
                  : item;
            })
            ?.filter((item) => item !== undefined);
          dispatch(
            setAllUploadedDocs(
              mergeDocuments(doctorUploadedDocs, patientUploadedDocs)
            )
          );
          message.open({
            key: MESSAGE_KEY,
            type: "",
            className: "message-appointment",
            content: (
              <div className="d-flex align-items-center">
                <img src={visitEnd} className="me-3" />
                <div>
                  <div className="fontroboto text-start fw-normal mt-1">
                    Medical Records updated successfully
                  </div>
                </div>
                <img
                  src={imgCloseVisit}
                  className="ms-3"
                  onClick={() => message.destroy()}
                />
              </div>
            ),
            duration: 5,
          });
        }
      }
      setIsEditDocument(false);
    } else {
      const formData = new FormData();
      filesData.forEach((item, index) => {
        formData.append(item?.name, item);
        
        // Only append thumbnail if it exists (skip if thumbnail generation failed)
        const thumbnailFile = recordData?.[index]?.thumbnailFile;
        if (thumbnailFile) {
          formData.append(
            "thumbnail_" +
              item?.name?.substring(0, item?.name?.lastIndexOf(".")) +
              ".png",
            thumbnailFile
          );
        } else {
          console.warn(`No thumbnail available for ${item?.name}, skipping thumbnail upload`);
        }
      });
      formData.append(
        "pm_id",
        patient_data !== undefined ? patient_data.pm_id : 0
      );
      formData.append(
        "patient_unique_id",
        patient_data !== undefined ? patient_data.patient_unique_id : 0
      );
      formData.append("um_id", userId);
      formData.append(
        "pm_pid",
        patient_data !== undefined ? patient_data.pm_pid : 0
      );
      const uploadResponse = await uploadDocument(formData);
      if (uploadResponse?.length > 0) {
        const payload = uploadResponse.map((item) => {
          const recordItem = recordData.find(
            (record) => record.name === item.name
          );
          return {
            id: item?.id || 0,
            category_id: recordItem?.recordType,
            investigation_date: recordItem?.recordUploadDate,
            notes: recordItem?.notes?.trim(),
          };
        });
        const resultStatus = await updateDocument(payload);
        if (resultStatus?.status === 204) {
          message.open({
            key: MESSAGE_KEY,
            type: "",
            className: "message-appointment",
            content: (
              <div className="d-flex align-items-center">
                <img src={visitEnd} className="me-3" />
                <div>
                  <div className="fontroboto text-start fw-normal mt-1">
                    Medical Records added successfully
                  </div>
                </div>
                <img
                  src={imgCloseVisit}
                  className="ms-3"
                  onClick={() => message.destroy()}
                />
              </div>
            ),
            duration: 5,
          });
        }
      }
      // if (isAndroid && !isBrowser) {
      //   deleteDocsUploadedFromAndroid(patient_data.patient_unique_id);
      // }
      if (!isAppointmentData) {
        setTimeout(async () => {
          const doctorUploadedDocs = await fetchAllPatientDocs(
            patient_data?.patient_unique_id
          );
          dispatch(
            setAllUploadedDocs(
              mergeDocuments(doctorUploadedDocs, patientUploadedDocs)
            )
          );
        }, 1100);
      }
    }
    setLoader(false);
    setFilesData([]);
    setRecordData([]);
    handleDrawerUploadDoc();
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (files) {
      const filesData = Array.from(files);
      if (filesData.length > 0) {
        const updatedFiles = [];
        filesData.forEach((file) => {
          const cleanFileName = getCorrectedFileName(file?.name || "");
          // Check if the file is an image and if its name follows typical camera-captured file patterns
          const isCapturedFromCamera =
            (file.type === "image/jpeg" ||
              file.type === "image/png" ||
              file.type === "image/jpg") &&
            (cleanFileName === "image.webp" ||
              cleanFileName === "image.webp" ||
              cleanFileName === "image.webp");

          let newFile = file;

          if (isCapturedFromCamera) {
            // Generate a unique file name for camera-captured images
            const uniqueFileName = generateUniqueFileName(file);
            newFile = new File([file], uniqueFileName, { type: file.type });
          } else {
            // If the file name had spaces, create a new file with spaces removed
            newFile = new File([file], cleanFileName, { type: file.type });
          }

          updatedFiles.push(newFile);
        });
        const newRecordData = await Promise.all(
          updatedFiles.map(async (item) => {
            let thumbnailUrl;
            let fileData;
            if (item && isPdfFile(item.type)) {
              const pdfObjectURL = URL.createObjectURL(item);
              try {
                thumbnailUrl = await loadPdf(pdfObjectURL);
                fileData = uploadDocURLtoFile(
                  thumbnailUrl,
                  "thumbnail_" +
                    item?.name?.substring(0, item?.name?.lastIndexOf(".")) +
                    ".png"
                );
              } finally {
                URL.revokeObjectURL(pdfObjectURL);
              }
            } else if (item && isVideoFile(item.type)) {
              try {
                thumbnailUrl = await loadVideoThumbnail(item, VIDEO_THUMBNAIL_TIME);
                fileData = uploadDocURLtoFile(
                  thumbnailUrl,
                  "thumbnail_" +
                    item?.name?.substring(0, item?.name?.lastIndexOf(".")) +
                    ".png"
                );
              } catch (error) {
                console.error("Error generating video thumbnail:", error);
                thumbnailUrl = null;
                fileData = null;
              }
            } else if (item && isImageFile(item.type)) {
              const imageObjectURL = URL.createObjectURL(item);
              try {
                // Convert to data URL to avoid memory leak
                const img = new Image();
                img.src = imageObjectURL;
                await new Promise((resolve, reject) => {
                  img.onload = () => resolve();
                  img.onerror = reject;
                });
                
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                thumbnailUrl = canvas.toDataURL("image/png");
                
                fileData = new File(
                  [item],
                  "thumbnail_" +
                    item?.name?.substring(0, item?.name?.lastIndexOf(".")) +
                    ".png",
                  { type: "image/png" }
                );
              } finally {
                URL.revokeObjectURL(imageObjectURL);
              }
            }
            return {
              id: item?.id,
              name: item?.name,
              recordType: undefined,
              recordUploadDate: dayjs().format("YYYY-MM-DD"),
              notes: "",
              thumbnailUrl: thumbnailUrl,
              thumbnailFile: fileData,
            };
          })
        );
        const updatedRecordData = [...newRecordData, ...recordData];
        setRecordData(updatedRecordData);
        setFilesData((prev) => [...updatedFiles, ...prev]);
      }
    }
    event.target.value = null;
  };

  const handleRetryBtn = () => {
    setFilesData([]);
    setRecordData([]);
    setIsFileSizeError(false);
    setIsFileLimitError(false);
    setIsFileTypeError(null);
  };

  const handleLeaveBtn = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    handleDrawerUploadDoc();
    toggleDeletePopup();
    setFilesData([]);
    setRecordData([]);
    // if (isAndroid && !isBrowser) {
    //   deleteDocsUploadedFromAndroid(patient_data.patient_unique_id);
    // }
  };

  const handleFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="upload-document">
      <Card bordered={false} className="search-modalCard">
        <div
          className="modalCard-header h-60 align-items-center justify-content-between d-flex"
          style={{
            position: "sticky",
            top: "0px",
            zIndex: 2,
          }}
        >
          <div className="align-items-center d-flex">
            <Button
              type="text"
              className="btn btn-delete-prescription px-3 focus-none h-100"
              onClick={onClose}
            >
              <i className="icon-Cross fs-3"></i>
            </Button>
            <div className="modal-title">
              {isEditDocument ? "Edit" : "Upload"} Medical Records
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            className="btn btn-primary3 btn-41 px-4 me-20"
            disabled={
              recordData?.length === 0 ||
              recordData?.filter((item) => item.recordType === undefined)
                ?.length > 0
            }
            loading={loader}
          >
            {isEditDocument ? "Save" : "Submit"}
          </Button>
        </div>

        <div style={{ padding: "20px" }}>
          {!isEditDocument ? (
            <Button
              className="btn-41 btn ant-btn-text btn-input"
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
              onClick={handleFileInputClick}
            >
              {/* {isAndroid && !isBrowser ? (
                <div
                  ref={fileInputRef}
                  onClick={handleUploadDocPopup}
                  style={{ display: "none" }}
                />
              ) : ( */}
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png, image/jpeg, image/jpg, image/gif, application/pdf, video/mp4, video/quicktime, video/x-msvideo"
                  style={{ display: "none" }}
                  disabled={filesData.length >= 5}
                />
              {/* )} */}
              <i className="icon-upload" />
              <span>Upload new report</span>
            </Button>
          ) : null}
        </div>

        <div
          className="d-flex justify-content-center align-items-center flex-column"
          style={{ gap: "24px", padding: "0 24px 24px" }}
        >
          {filesData.map((item, index) => (
            <div
              key={index}
              style={{
                background: "#FAFAFB",
                borderRadius: "16px",
                padding: "16px 24px",
              }}
            >
              <div className="d-flex justify-content-between pb-3">
                <span style={{ fontWeight: 500 }}>{item?.name}</span>
                {!isEditDocument ? (
                  <i
                    className="icon-delete"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleDeleteRecord(index)}
                  />
                ) : null}
              </div>
              <div
                className="d-flex justify-content-between"
                style={{ gap: "32px" }}
              >
                <div>
                  <div
                    className="image-container"
                    style={{
                      backgroundImage: `url('${
                        (isEditDocument
                          ? filesData?.[index]?.thumbnail_url
                          : recordData?.[index]?.thumbnailUrl) || emptyBg
                      }')`,
                      height: 144,
                      width: 144,
                      border: "1px solid #F1F1F5",
                      paddingBottom: "0px",
                    }}
                  >
                    {(isEditDocument && filesData?.[index]?.thumbnail_url) ||
                    recordData?.[index]?.thumbnailUrl ? null : (
                      <>
                        <img
                          className="doc-image"
                          width={62}
                          height={62}
                          src={emptyFile}
                          alt="document"
                        />
                        <div className="file-name">
                          {shortenText(item?.name, 20, 13, -7)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="w-100">
                  <div
                    className="d-flex align-items-center w-100 justify-content-between"
                    style={{ gap: "32px" }}
                  >
                    <div style={{ width: "50%" }}>
                      <label className="label" style={{ marginBottom: 5 }}>
                        Record Type<span className="mandatory">*</span>
                      </label>
                      <Select
                        style={{ height: 38 }}
                        onChange={(value) =>
                          handleRecordChange(index, "recordType", value)
                        }
                        options={documentOptions}
                        placeholder="Select"
                        className="w-100"
                        value={recordData?.[index]?.recordType}
                        allowClear
                      />
                    </div>
                    <div style={{ width: "50%" }}>
                      <label style={{ marginBottom: 5 }} className="label">
                        Date of Investigation
                        <span className="mandatory">*</span>
                      </label>
                      <DatePicker
                        placeholder="Select Date"
                        onChange={(_, d) => {
                          handleRecordChange(
                            index,
                            "recordUploadDate",
                            d
                              ? dayjs(d, "DD MMM YYYY").format("YYYY-MM-DD")
                              : ""
                          );
                        }}
                        style={{
                          height: "38px",
                          width: "100%",
                        }}
                        format="DD MMM YYYY"
                        value={
                          recordData?.[index]?.recordUploadDate
                            ? dayjs(recordData?.[index]?.recordUploadDate)
                            : ""
                        }
                        allowClear={false}
                        disabledDate={disableFutureDates}
                        defaultValue={dayjs()}
                      />
                    </div>
                  </div>
                  <div style={{ paddingTop: "12px" }}>
                    <label style={{ marginBottom: 5 }} className="label">
                      Notes
                    </label>
                    <Input.TextArea
                      placeholder="Enter remarks"
                      className="textareaPlaceholder"
                      style={{ height: "38px" }}
                      value={recordData?.[index]?.notes}
                      onChange={(e) =>
                        handleRecordChange(index, "notes", e.target.value)
                      }
                      autoComplete="off"
                      autoCorrect="off"
                      maxLength={300}
                    />
                    <div
                      className="d-flex justify-content-between align-items-center"
                      style={{ marginTop: 5 }}
                    >
                      <label style={{ color: "#A2A2A8", fontSize: 10 }}>
                        Write maximum 300 characters
                      </label>
                      <label style={{ fontSize: 10 }}>
                        {`${recordData?.[index]?.notes?.length || 0} / 300`}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {shouldShowDeletePopup ||
      isFileSizeError ||
      isFileLimitError ||
      isFileTypeError ? (
        <CommonModal
          isModalOpen={
            shouldShowDeletePopup ||
            isFileSizeError ||
            isFileLimitError ||
            isFileTypeError
          }
          onCancel={
            isFileSizeError || isFileLimitError || isFileTypeError
              ? handleDrawerUploadDoc
              : toggleDeletePopup
          }
          modalWidth={500}
          title={
            isFileSizeError
              ? "Exceeded File Size"
              : isFileLimitError
              ? "Exceeded File Upload Limit"
              : isFileTypeError
              ? "File format not supported"
              : "You may lose your data"
          }
          modalBody={
            <>
              <div className="alert-warning rounded-10px p-2 patient-details">
                <div className="d-flex align-items-center">
                  <img className="me-3" src={alertIcon} alt="Warning" />
                  <span>
                    {isFileSizeError ? (
                      <>
                        The file size exceeded the limit.{" "}
                        <span style={{ fontWeight: 700 }}>
                          Please upload documents smaller than 15MB or videos smaller than 30MB.
                        </span>
                      </>
                    ) : isFileLimitError ? (
                      <>
                        You can only upload up to
                        <span style={{ fontWeight: 700 }}> 5 files.</span>{" "}
                        Please reduce the number of files and try again.
                      </>
                    ) : isFileTypeError ? (
                      <>
                        You can't upload
                        <span style={{ fontWeight: 700 }}>
                          {" "}
                          {isFileTypeError}
                        </span>{" "}
                        file. Only PDF, JPG, JPEG, PNG, GIF, MP4, MOV, and AVI formats are accepted.
                      </>
                    ) : (
                      "Are you sure you want to leave ?"
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                {isFileSizeError || isFileLimitError || isFileTypeError ? (
                  <Button
                    onClick={handleRetryBtn}
                    className="w-100 btn btn-primary3 btn-41 px-4"
                  >
                    Retry
                  </Button>
                ) : (
                  <div className="d-flex align-items-center mt-2 justify-content-end">
                    <div
                      onClick={handleLeaveBtn}
                      className="me-4 text-decoration-underline btn p-0 text-main"
                    >
                      Yes, Leave
                    </div>
                    <Button
                      onClick={toggleDeletePopup}
                      className="lh-lg btn btn-primary3 btn-41 px-4"
                    >
                      <span>No, Stay</span>
                    </Button>
                  </div>
                )}
              </div>
            </>
          }
        />
      ) : null}
    </div>
  );
};

export default UploadDocument;
