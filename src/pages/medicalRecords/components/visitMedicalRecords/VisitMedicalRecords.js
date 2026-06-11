import { Button, Card } from "antd";

import { useDispatch, useSelector } from "react-redux";
import { setUploadDocCategories } from "../../../../redux/uploadDocSlice";
import { fetchAllDocumentCategories } from "../../service";
import { useEffect, useRef, useState } from "react";
import { Col, Row } from "react-bootstrap";
import "./../../MedicalRecords.scss";
import RecordCard from "../recordCard/RecordCard";
import { isAndroid, isBrowser, isMobile } from "react-device-detect";
import { getDecodedToken } from "../../../../utils/localStorage";
import { GB_ZYDUS_USER } from "../../../../utils/constants";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { env } from "../../../../EnvironmentConfig";
import {
  generateUniqueFileName,
  getCorrectedFileName,
} from "../../utils/helper";
import { ASSETS } from "../../../../assets";
const emptyDocument = ASSETS.images.emptyDocument;
const emptyIllustration = ASSETS.mobile.emptyIllustration;

const VisitMedicalRecords = ({
  filesData,
  setUploadDocDrawer,
  setFilesData,
  handleUploadDocPopup,
  setIsEditDocument,
  handleDrawerUploadDoc,
}) => {
  const dispatch = useDispatch();
  const { allUploadedDocs, uploadDocCategories } = useSelector(
    (state) => state.uploadDoc
  );
  const newCategory = {
    category_id: -1,
    category_name: "All",
  };
  const zydusLabCategory = {
    category_id: -2,
    category_name: "Zydus Lab",
  };
  const zydusRadioCategory = {
    category_id: -3,
    category_name: "Zydus Radio",
  };
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const decodedToken = getDecodedToken();
  const tokenData = decodedToken?.result;
  const updatedCategory =
    tokenData?.hospital_business_id == env.zydus_business_id &&
    isZydusUserAccessableFromGB
      ? [newCategory, zydusLabCategory, zydusRadioCategory, ...uploadDocCategories]
      : [newCategory, ...uploadDocCategories];

  const [activeCategory, setActiveCategory] = useState(-1);
  const [activeCategoryDocs, setActiveCategoryDocs] = useState(allUploadedDocs);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const updatedUploadedDocs =
      activeCategory === -1
        ? allUploadedDocs
        : allUploadedDocs.filter((item) => item.category_id === activeCategory);
    setActiveCategoryDocs([...updatedUploadedDocs]);
  }, [activeCategory, allUploadedDocs]);

  useEffect(() => {
    if (uploadDocCategories.length === 0) {
      getAllDocumentCategories();
    }
  }, []);

  const getAllDocumentCategories = async () => {
    const response = await fetchAllDocumentCategories();
    dispatch(setUploadDocCategories(response));
  };

  const categoryOptionHandler = (index) => {
    setActiveCategory(index);
  };

  const handleFileUpload = (event) => {
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
        setFilesData(updatedFiles);
        handleDrawerUploadDoc();
      }
    }
    event.target.value = null;
  };

  const handleAddClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="appointment-wrap PatientDetailswrap m-0">
      <Card>
        <div
          className="d-flex flex-column"
          style={{
            height: "calc(100vh - 150px)",
            overflow: "auto",
            paddingBottom: "40px",
          }}
        >
          {allUploadedDocs.length === 0 ? (
            isMobile ? (
              // Mobile Empty State
              <div className="medical-records-empty-state-mobile">
                <div className="medical-records-empty-state">
                  <img
                    src={emptyIllustration}
                    alt="No medical records"
                    className="medical-records-empty-icon"
                  />
                  <div className="medical-records-empty-message">
                    You haven't added any medical records yet!
                  </div>
                  <Button
                    className="btn btn-primary3 btn-text-white px-5 btn-41 medical-records-empty-upload-btn"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "5px",
                      width: "100%",
                      maxWidth: "343px",
                      marginTop: "24px",
                    }}
                    onClick={handleAddClick}
                  >
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/png, image/jpeg, image/jpg, image/gif, application/pdf, video/mp4, video/quicktime, video/x-msvideo"
                      style={{ display: "none" }}
                      disabled={filesData.length >= 5}
                    />
                    <i className="icon-upload" />
                    Upload new report
                  </Button>
                </div>
              </div>
            ) : (
              // Desktop Empty State
              <div
                className="d-flex align-items-center justify-content-center text-center flex-column"
                style={{ rowGap: "24px" }}
              >
              <div>
                <img
                  src={emptyDocument}
                  height={300}
                  width={400}
                  alt="empty-document"
                />
              </div>
              <div>
                <div style={{ fontSize: "20px" }}>
                  You haven’t added any medical records yet!
                </div>
                <div>
                  PDF, JPG, JPEG, PNG, GIF, MP4, MOV, and AVI files are allowed. 
                  Maximum size: 15MB for documents, 30MB for videos, up to 5 files.
                </div>
              </div>
              <Button
                className="btn btn-primary3 btn-text-white px-5 btn-41"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "5px",
                }}
                onClick={handleAddClick}
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
                {"Upload new report"}
              </Button>
              </div>
            )
          ) : (
            <div className="d-flex justify-content-center flex-column medical-records">
              <div
                className={`d-flex ${isMobile ? 'category-buttons-scrollable' : 'flex-wrap'}`}
                style={{
                  padding: isMobile ? "12px" : "24px",
                  columnGap: "16px",
                  ...(isMobile && {
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    overflowY: "hidden",
                    WebkitOverflowScrolling: "touch",
                  }),
                }}
              >
                {updatedCategory.map((item) => (
                  <Button
                    type="text"
                    key={item?.category_id}
                    className={`btnStyle btn px-5-16 fs-14 category-btn ${
                      item?.category_id === activeCategory
                        ? "active-category-btn"
                        : ""
                    }`}
                    onClick={() => categoryOptionHandler(item?.category_id)}
                  >
                    <span
                      className={`btnText category-label ${
                        item?.category_id === activeCategory
                          ? "active-category-label"
                          : ""
                      }`}
                    >
                      {item?.category_name}
                    </span>
                  </Button>
                ))}
              </div>
              <Row
                xs={2}
                sm={3}
                md={3}
                lg={4}
                className="gy-4 w-100"
                style={{ 
                  paddingLeft: isMobile ? "12px" : "24px", 
                  ...(isMobile && { paddingTop: "12px" })
                }}
              >
                {activeCategoryDocs.map((cardData, index) => {
                  return (
                    <Col key={index} className="gx-4">
                      <RecordCard
                        cardData={cardData}
                        handleDrawerUploadDoc={handleDrawerUploadDoc}
                        setFilesData={setFilesData}
                        setIsEditDocument={setIsEditDocument}
                        setUploadDocDrawer={setUploadDocDrawer}
                      />
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default VisitMedicalRecords;
