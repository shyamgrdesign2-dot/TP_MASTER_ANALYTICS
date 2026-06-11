import { useSelector } from "react-redux";
import RecordCard from "../recordCard/RecordCard";
import { Col } from "react-bootstrap";
import { Row } from "antd";

const UploadDocumentList = ({
  handleDrawerUploadDoc,
  setFilesData,
  setIsEditDocument,
  setUploadDocDrawer,
}) => {
  const { allUploadedDocs } = useSelector((state) => state.uploadDoc);

  return (
    <div>
      <Row sm={2} md={2} lg={2} style={{ columnGap: "14px" }}>
        {allUploadedDocs.slice(0, 2)?.map((cardData, index) => {
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
  );
};

export default UploadDocumentList;
