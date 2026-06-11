import { Button, Card } from "antd";
import { useEffect, useRef, useState } from "react";
import "./MedicalRecords.scss";
import { useSelector } from "react-redux";
import { Col, Row } from "react-bootstrap";
import RecordCard from "./components/recordCard/RecordCard";
import { isAndroid, isBrowser } from "react-device-detect";
import { generateUniqueFileName, getCorrectedFileName } from "./utils/helper";
import { getDecodedToken } from "../../utils/localStorage";
import { GB_ZYDUS_USER } from "../../utils/constants";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { env } from "../../EnvironmentConfig";

const MedicalRecords = ({
  medicalReportDrawer,
  onClose,
  handleDrawerUploadDoc,
  setFilesData,
  setIsEditDocument,
  handleUploadDocPopup,
  setUploadDocDrawer,
}) => {
  const { uploadDocCategories, allUploadedDocs } = useSelector(
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
  const updatedCategory = tokenData?.hospital_business_id == env.zydus_business_id && isZydusUserAccessableFromGB ? [newCategory, zydusLabCategory, zydusRadioCategory, ...uploadDocCategories] : [newCategory, ...uploadDocCategories];

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

  return (
    <div className="medical-records">
      <Card bordered={false} className="search-modalCard">
        <div
          className="modalCard-header align-items-center justify-content-between d-flex"
          style={{
            position: "sticky",
            top: "0px",
            zIndex: 2,
            height: "90px",
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
            <div className="modal-title">Medical Records</div>
          </div>
          <div style={{ padding: "20px" }}>
            <Button
              className="btn-41 btn ant-btn-text btn-input"
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
              onClick={() => fileInputRef.current?.click()}
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
                />
              {/* )} */}
              <i className="icon-upload" />
              <span>Upload new report</span>
            </Button>
          </div>
        </div>

        <div className="d-flex justify-content-center flex-column">
          <div
            className="d-flex flex-wrap"
            style={{ padding: "24px", columnGap: "16px" }}
          >
            {updatedCategory.map((item, index) => (
              <Button
                type="text"
                key={index}
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
            xs={1}
            sm={2}
            md={2}
            lg={3}
            className="gy-4 w-100"
            style={{ padding: "0 0 50px 24px" }}
          >
            {activeCategoryDocs.map((cardData, index) => {
              return (
                <Col key={index} className="gx-4">
                  <RecordCard
                    cardData={cardData}
                    medicalReportDrawer={medicalReportDrawer}
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
      </Card>
    </div>
  );
};

export default MedicalRecords;
