import React, { useState, useEffect, useRef } from 'react';
import { Drawer, DatePicker, Input, Select, Button, message } from 'antd';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { disableFutureDates } from '../../../../pages/growthChart/growthChartHelper';
import { updateDocument, uploadDocument, fetchAllPatientDocs } from '../../../medicalRecords/service';
import { setAllUploadedDocs } from '../../../../redux/uploadDocSlice';
import { mergeDocuments, generateUniqueFileName, getCorrectedFileName } from '../../../medicalRecords/utils/helper';
import { MESSAGE_KEY } from '../../../../utils/constants';

import { shortenText, isPdfFile, isVideoFile, isImageFile, loadPdf, loadVideoThumbnail, uploadDocURLtoFile } from '../../../medicalRecords/utils/helper';
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  MAX_DOCUMENT_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
  VIDEO_THUMBNAIL_TIME,
} from '../../../../utils/constants';
import './MobileUploadMedicalRecord.scss';
import { ASSETS } from "../../../../assets";
const {
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
  emptyBg,
  emptyFile,
} = ASSETS.images;
const closeIcon = ASSETS.mobile.close2;
const alertIcon = ASSETS.images.alerticon;

const { TextArea } = Input;

function MobileUploadMedicalRecord({
  visible,
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
}) {
  const dispatch = useDispatch();
  const { userId } = useSelector((state) => state.doctors);
  const { uploadDocCategories, allUploadedDocs, patientUploadedDocs } = useSelector(
    (state) => state.uploadDoc
  );
  
  const documentOptions = uploadDocCategories.map((item) => ({
    label: item.category_name,
    value: item.category_id,
  }));

  const [loader, setLoader] = useState(false);
  const [recordData, setRecordData] = useState([]);
  const [isFileSizeError, setIsFileSizeError] = useState(false);
  const [isFileLimitError, setIsFileLimitError] = useState(false);
  const [isFileTypeError, setIsFileTypeError] = useState(null);
  const fileInputRef = useRef(null);

  const updateRecordData = async () => {
    const updatedRecord = await Promise.all(
      filesData.map(async (item) => {
        let thumbnailUrl;
        let fileData;
        if (!isEditDocument) {
          if (item && isPdfFile(item.type)) {
            const pdfObjectURL = URL.createObjectURL(item);
            try {
              thumbnailUrl = await loadPdf(pdfObjectURL);
              fileData = uploadDocURLtoFile(
                thumbnailUrl,
                'thumbnail_' +
                  item?.name?.substring(0, item?.name?.lastIndexOf('.')) +
                  '.png'
              );
            } finally {
              URL.revokeObjectURL(pdfObjectURL);
            }
          } else if (item && isVideoFile(item.type)) {
            try {
              thumbnailUrl = await loadVideoThumbnail(item, VIDEO_THUMBNAIL_TIME);
              fileData = uploadDocURLtoFile(
                thumbnailUrl,
                'thumbnail_' +
                  item?.name?.substring(0, item?.name?.lastIndexOf('.')) +
                  '.png'
              );
            } catch (error) {
              thumbnailUrl = null;
              fileData = null;
            }
          } else if (item && isImageFile(item.type)) {
            const imageObjectURL = URL.createObjectURL(item);
            try {
              const img = new Image();
              img.src = imageObjectURL;
              await new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
              });
              
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              thumbnailUrl = canvas.toDataURL('image/png');
              
              fileData = new File(
                [item],
                'thumbnail_' +
                  item?.name?.substring(0, item?.name?.lastIndexOf('.')) +
                  '.png',
                { type: 'image/png' }
              );
            } finally {
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
            : dayjs().format('YYYY-MM-DD'),
          notes: item?.notes || '',
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
    if (isEditDocument) {
      return;
    }

    const supportedTypes = [
      ...SUPPORTED_IMAGE_TYPES,
      ...SUPPORTED_VIDEO_TYPES,
      ...SUPPORTED_DOCUMENT_TYPES,
    ];

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
        const isVideoByMimeType = isVideoFile(item?.type);
        const isVideoByExtension = item?.name && /\.(mp4|mov|avi)$/i.test(item?.name);
        const isVideoType = isVideoByMimeType || isVideoByExtension;
        
        const maxSize = isVideoType 
          ? MAX_VIDEO_FILE_SIZE 
          : MAX_DOCUMENT_FILE_SIZE;
        
        if (item?.size > maxSize) {
          setIsFileSizeError(true);
        }
        
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
  }, [filesData, isEditDocument]);

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

  const handleDeleteRecord = (index) => {
    const updatedFilesData = filesData?.filter((_, i) => i !== index);
    setFilesData([...updatedFilesData]);
    setRecordData((prevData) => prevData.filter((_, i) => i !== index));
    
    if (updatedFilesData.length === 0) {
      handleDrawerUploadDoc();
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (files) {
      const filesArray = Array.from(files);
      if (filesArray.length > 0) {
        const updatedFiles = [];
        filesArray.forEach((file) => {
          const cleanFileName = getCorrectedFileName(file?.name || '');
          const isCapturedFromCamera =
            (file.type === 'image/jpeg' ||
              file.type === 'image/png' ||
              file.type === 'image/jpg') &&
            (cleanFileName === 'image.jpg' ||
              cleanFileName === 'image.png' ||
              cleanFileName === 'image.jpeg');

          let newFile = file;

          if (isCapturedFromCamera) {
            const uniqueFileName = generateUniqueFileName(file);
            newFile = new File([file], uniqueFileName, { type: file.type });
          } else {
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
                  'thumbnail_' +
                    item?.name?.substring(0, item?.name?.lastIndexOf('.')) +
                    '.png'
                );
              } finally {
                URL.revokeObjectURL(pdfObjectURL);
              }
            } else if (item && isVideoFile(item.type)) {
              try {
                thumbnailUrl = await loadVideoThumbnail(item, VIDEO_THUMBNAIL_TIME);
                fileData = uploadDocURLtoFile(
                  thumbnailUrl,
                  'thumbnail_' +
                    item?.name?.substring(0, item?.name?.lastIndexOf('.')) +
                    '.png'
                );
              } catch (error) {
                thumbnailUrl = null;
                fileData = null;
              }
            } else if (item && isImageFile(item.type)) {
              const imageObjectURL = URL.createObjectURL(item);
              try {
                const img = new Image();
                img.src = imageObjectURL;
                await new Promise((resolve, reject) => {
                  img.onload = () => resolve();
                  img.onerror = reject;
                });
                
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                thumbnailUrl = canvas.toDataURL('image/png');
                
                fileData = new File(
                  [item],
                  'thumbnail_' +
                    item?.name?.substring(0, item?.name?.lastIndexOf('.')) +
                    '.png',
                  { type: 'image/png' }
                );
              } finally {
                URL.revokeObjectURL(imageObjectURL);
              }
            }
            return {
              id: item?.id,
              name: item?.name,
              recordType: undefined,
              recordUploadDate: dayjs().format('YYYY-MM-DD'),
              notes: '',
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

  const handleErrorClose = () => {
    setIsFileSizeError(false);
    setIsFileLimitError(false);
    setIsFileTypeError(null);
    handleDrawerUploadDoc();
  };

  const handleLeaveBtn = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    handleDrawerUploadDoc();
    setShowDeletePopup(false);
    setFilesData([]);
    setRecordData([]);
  };

  const toggleDeletePopup = () => {
    setShowDeletePopup(false);
  };

  const handleSubmit = async () => {
    if (
      recordData?.length === 0 ||
      recordData?.filter((item) => item.recordType === undefined)?.length > 0
    ) {
      return;
    }

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
            type: '',
            className: 'message-appointment',
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
        
        const thumbnailFile = recordData?.[index]?.thumbnailFile;
        if (thumbnailFile) {
          formData.append(
            'thumbnail_' +
              item?.name?.substring(0, item?.name?.lastIndexOf('.')) +
              '.png',
            thumbnailFile
          );
        }
      });
      formData.append(
        'pm_id',
        patientData !== undefined ? patientData.pm_id : 0
      );
      formData.append(
        'patient_unique_id',
        patientData !== undefined ? patientData.patient_unique_id : 0
      );
      formData.append('um_id', userId);
      formData.append(
        'pm_pid',
        patientData !== undefined ? patientData.pm_pid : 0
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
            type: '',
            className: 'message-appointment',
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
      if (!isAppointmentData) {
        setTimeout(async () => {
          const doctorUploadedDocs = await fetchAllPatientDocs(
            patientData?.patient_unique_id
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

  return (
    <>
      <Drawer
        closeIcon={false}
        placement="bottom"
        onClose={() => filesData.length > 0 && !isEditDocument ? setShowDeletePopup(true) : onClose()}
        open={visible}
        height="90vh"
        className="mobile-upload-medical-record"
        maskClosable={false}
      >
        <div className="mobile-upload-medical-record-content">
          <div className="mobile-upload-medical-record-header">
            <h3 className="mobile-upload-medical-record-title">
              {isEditDocument ? 'Edit' : 'Upload'} Medical Records
            </h3>
            <button
              className="mobile-upload-medical-record-close"
              onClick={() => filesData.length > 0 && !isEditDocument ? setShowDeletePopup(true) : onClose()}
              type="button"
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" className="close-icon" />
            </button>
          </div>

          <div className="mobile-upload-medical-record-body">
            {/* Upload More Button */}
            {!isEditDocument && (
              <div className="mobile-upload-medical-record-upload-section">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png, image/jpeg, image/jpg, image/gif, application/pdf, video/mp4, video/quicktime, video/x-msvideo"
                  style={{ display: 'none' }}
                  disabled={filesData.length >= 5}
                />
                <Button
                  className="mobile-upload-medical-record-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  type="text"
                  disabled={filesData.length >= 5}
                >
                  <i className="icon-upload" />
                  Upload new report
                </Button>
              </div>
            )}

            {/* All Files - Stacked Vertically */}
            {filesData.map((item, index) => {
              const record = recordData?.[index] || {};
              return (
                <div key={index} className="mobile-upload-medical-record-file-card">
                  {/* File Name with Delete */}
                  <div className="file-card-header">
                    <span style={{ fontWeight: 500 }}>{item?.name}</span>
                    {!isEditDocument && (
                      <button
                        className="file-card-delete"
                        onClick={() => handleDeleteRecord(index)}
                        type="button"
                      >
                        <i className="icon-delete" />
                      </button>
                    )}
                  </div>

                  {/* Preview Image */}
                  <div className="mobile-upload-medical-record-preview">
                    <div
                      className="image-container"
                      style={{
                        backgroundImage: `url('${
                          (isEditDocument
                            ? item?.thumbnail_url
                            : record?.thumbnailUrl) || emptyBg
                        }')`,
                        height: 200,
                        width: '100%',
                        maxWidth: 300,
                        border: '1px solid #F1F1F5',
                        paddingBottom: '0px',
                      }}
                    >
                      {(isEditDocument && item?.thumbnail_url) ||
                      record?.thumbnailUrl ? null : (
                        <>
                          <img
                            className="doc-image"
                            width={62}
                            height={62}
                            src={emptyFile}
                            alt="document"
                          />
                          <div className="file-name">
                            {shortenText(item?.name || '', 20, 13, -7)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="mobile-upload-medical-record-form">
                    <div className="mobile-upload-medical-record-field">
                      <label className="label" style={{ marginBottom: 5 }}>
                        Date of Investigation<span className="mandatory">*</span>
                      </label>
                      <DatePicker
                        placeholder="Select Date"
                        onChange={(_, d) => {
                          handleRecordChange(
                            index,
                            'recordUploadDate',
                            d
                              ? dayjs(d, 'DD MMM YYYY').format('YYYY-MM-DD')
                              : ''
                          );
                        }}
                        className="mobile-upload-medical-record-datepicker"
                        format="DD MMM YYYY"
                        value={
                          record?.recordUploadDate
                            ? dayjs(record?.recordUploadDate)
                            : ''
                        }
                        allowClear={false}
                        disabledDate={disableFutureDates}
                        defaultValue={dayjs()}
                        suffixIcon={<i className="icon-calendar" />}
                      />
                    </div>

                    <div className="mobile-upload-medical-record-field">
                      <label className="label" style={{ marginBottom: 5 }}>
                        Record Type<span className="mandatory">*</span>
                      </label>
                      <Select
                        onChange={(value) =>
                          handleRecordChange(index, 'recordType', value)
                        }
                        options={documentOptions}
                        placeholder="Select"
                        className="mobile-upload-medical-record-select"
                        value={record?.recordType}
                        allowClear
                      />
                    </div>

                    <div className="mobile-upload-medical-record-field">
                      <label className="label" style={{ marginBottom: 5 }}>
                        Notes
                      </label>
                      <TextArea
                        placeholder="Enter remarks"
                        className="mobile-upload-medical-record-textarea"
                        value={record?.notes}
                        onChange={(e) =>
                          handleRecordChange(index, 'notes', e.target.value)
                        }
                        autoComplete="off"
                        autoCorrect="off"
                        maxLength={300}
                        rows={4}
                      />
                      <div className="mobile-upload-medical-record-char-count">
                        <span className="char-hint">
                          Write maximum 300 characters
                        </span>
                        <span className="char-count">
                          {`${record?.notes?.length || 0} / 300`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mobile-upload-medical-record-footer">
            <Button
              onClick={handleSubmit}
              className="mobile-upload-medical-record-save-btn"
              disabled={
                recordData?.length === 0 ||
                recordData?.filter((item) => item.recordType === undefined)
                  ?.length > 0
              }
              loading={loader}
              type="primary"
            >
              {isEditDocument ? 'Save Changes' : 'Submit'}
            </Button>
          </div>
        </div>
      </Drawer>

    {/* Error & Confirmation Bottom Sheets */}
    {/* Delete Confirmation Bottom Sheet */}
    {shouldShowDeletePopup && (
      <Drawer
        placement="bottom"
        onClose={toggleDeletePopup}
        open={shouldShowDeletePopup}
        height="auto"
        className="upload-delete-confirmation-bottom-sheet"
        closable={false}
        maskClosable={true}
        destroyOnClose={true}
      >
        <div className="upload-delete-confirmation-sheet-content">
          <div className="upload-delete-confirmation-sheet-header">
            <h3 className="upload-delete-confirmation-sheet-title">You may lose your data</h3>
            <button
              className="upload-delete-confirmation-sheet-close-btn"
              onClick={toggleDeletePopup}
              type="button"
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" className="upload-delete-confirmation-close-icon" />
            </button>
          </div>

          <div className="upload-delete-confirmation-sheet-body">
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>Are you sure you want to leave? Your changes will be lost.</span>
              </div>
            </div>
          </div>

          <div className="upload-delete-confirmation-sheet-actions">
            <div className="upload-delete-confirmation-actions-row">
              <button
                onClick={handleLeaveBtn}
                className="upload-delete-confirmation-sheet-btn upload-delete-confirmation-btn-yes"
                type="button"
              >
                Yes, Leave
              </button>
              <button
                onClick={toggleDeletePopup}
                className="upload-delete-confirmation-sheet-btn upload-delete-confirmation-btn-no"
                type="button"
              >
                No, Stay
              </button>
            </div>
          </div>
        </div>
      </Drawer>
    )}

    {/* File Size Error Bottom Sheet */}
    {isFileSizeError && (
      <Drawer
        placement="bottom"
        onClose={handleErrorClose}
        open={isFileSizeError}
        height="auto"
        className="upload-file-error-bottom-sheet"
        closable={false}
        maskClosable={true}
        destroyOnClose={true}
      >
        <div className="upload-file-error-sheet-content">
          <div className="upload-file-error-sheet-header">
            <h3 className="upload-file-error-sheet-title">Exceeded File Size</h3>
            <button
              className="upload-file-error-sheet-close-btn"
              onClick={handleErrorClose}
              type="button"
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" className="upload-file-error-close-icon" />
            </button>
          </div>

          <div className="upload-file-error-sheet-body">
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  The file size exceeded the limit.{" "}
                  <span style={{ fontWeight: 700 }}>
                    Please upload documents smaller than 15MB or videos smaller than 30MB.
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="upload-file-error-sheet-actions">
            <button
              onClick={handleRetryBtn}
              className="upload-file-error-sheet-btn upload-file-error-btn-primary"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      </Drawer>
    )}

    {/* File Limit Error Bottom Sheet */}
    {isFileLimitError && (
      <Drawer
        placement="bottom"
        onClose={handleErrorClose}
        open={isFileLimitError}
        height="auto"
        className="upload-file-error-bottom-sheet"
        closable={false}
        maskClosable={true}
        destroyOnClose={true}
      >
        <div className="upload-file-error-sheet-content">
          <div className="upload-file-error-sheet-header">
            <h3 className="upload-file-error-sheet-title">Exceeded File Upload Limit</h3>
            <button
              className="upload-file-error-sheet-close-btn"
              onClick={handleErrorClose}
              type="button"
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" className="upload-file-error-close-icon" />
            </button>
          </div>

          <div className="upload-file-error-sheet-body">
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  You can only upload up to
                  <span style={{ fontWeight: 700 }}> 5 files.</span>{" "}
                  Please reduce the number of files and try again.
                </span>
              </div>
            </div>
          </div>

          <div className="upload-file-error-sheet-actions">
            <button
              onClick={handleRetryBtn}
              className="upload-file-error-sheet-btn upload-file-error-btn-primary"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      </Drawer>
    )}

    {/* File Type Error Bottom Sheet */}
    {isFileTypeError && (
      <Drawer
        placement="bottom"
        onClose={handleErrorClose}
        open={!!isFileTypeError}
        height="auto"
        className="upload-file-error-bottom-sheet"
        closable={false}
        maskClosable={true}
        destroyOnClose={true}
      >
        <div className="upload-file-error-sheet-content">
          <div className="upload-file-error-sheet-header">
            <h3 className="upload-file-error-sheet-title">File format not supported</h3>
            <button
              className="upload-file-error-sheet-close-btn"
              onClick={handleErrorClose}
              type="button"
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" className="upload-file-error-close-icon" />
            </button>
          </div>

          <div className="upload-file-error-sheet-body">
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  You can't upload
                  <span style={{ fontWeight: 700 }}>
                    {" "}
                    {isFileTypeError}
                  </span>{" "}
                  file. Only PDF, JPG, JPEG, PNG, GIF, MP4, MOV, and AVI formats are accepted.
                </span>
              </div>
            </div>
          </div>

          <div className="upload-file-error-sheet-actions">
            <button
              onClick={handleRetryBtn}
              className="upload-file-error-sheet-btn upload-file-error-btn-primary"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      </Drawer>
    )}
  </>
  );
}

export default MobileUploadMedicalRecord;

