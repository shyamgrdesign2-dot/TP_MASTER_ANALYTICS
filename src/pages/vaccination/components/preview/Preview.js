import React, { useState } from "react";
import { Modal } from "antd";

import { VaccinationCategoryEnum } from "../../VaccinationHelper";
import "./Preview.scss";
import VaccineTable from "../vaccineTable/VaccineTable";
import { ASSETS } from "../../../../assets";
const closeFill = ASSETS.images.closefill;

const columns = [
  {
    title: "Age",
    dataIndex: "age",
    key: "age",
    width: "8%",
  },
  {
    title: "Vaccine",
    dataIndex: "vaccine",
    key: "vaccine",
    width: "15%",
  },
  {
    title: "Brand",
    dataIndex: "brand",
    key: "brand",
    width: "15%",
  },
  {
    title: "Due Date",
    dataIndex: "dueDate",
    key: "dueDate",
    width: "16%",
  },
  {
    title: "Given Date",
    dataIndex: "givenDate",
    key: "givenDate",
    width: "16%",
  },
  {
    title: "Site",
    dataIndex: "site",
    key: "site",
    width: "10%",
  },
  {
    title: "Remarks",
    dataIndex: "remarks",
    key: "remarks",
    width: "20%",
  },
];

const Preview = ({ vaccinesData, onCancel, shouldShowPreview, splitVaccineData, activeVaccineTab, setActiveVaccineTab }) => {
  const [localActiveTab, setLocalActiveTab] = useState(activeVaccineTab || VaccinationCategoryEnum[0].key);
  
  // Use local state if activeVaccineTab prop is not provided
  const currentActiveTab = activeVaccineTab !== undefined ? activeVaccineTab : localActiveTab;
  const handleTabChange = (tab) => {
    if (setActiveVaccineTab) {
      setActiveVaccineTab(tab);
    } else {
      setLocalActiveTab(tab);
    }
  };
  
  // Filter data based on active tab
  const filteredData = splitVaccineData && Object.keys(splitVaccineData).length > 0
    ? splitVaccineData[currentActiveTab] || []
    : vaccinesData || [];
  
  return (
    <div>
      <Modal
        className="custom-modal"
        title={
          <div className="d-flex justify-content-between titleContainer">
            <span>Preview</span>
            <div className="d-flex gap-3">
              <label>Close</label>
              <img
                src={closeFill}
                alt="close"
                className="imageStyle"
                onClick={onCancel}
              />
            </div>
          </div>
        }
        centered
        open={shouldShowPreview}
        closeIcon={false}
        width={1114}
        height={708}
        footer={null}
        onCancel={onCancel}
        show={true}
        onHide={onCancel}
      >
        {splitVaccineData?.[VaccinationCategoryEnum[1].key]?.length > 0 && (
          <div className="vaccine-tab-filter mb-3">
            {VaccinationCategoryEnum.map((category) => (
              <button
                key={category.key}
                type="button"
                className={`vaccine-tab-btn ${
                  currentActiveTab === category.key
                    ? "active btn-create-bill text-white"
                    : ""
                }`}
                onClick={() => handleTabChange(category.key)}
              >
                {category.value}
              </button>
            ))}
          </div>
        )}
        <div className="tableContainer">
          <VaccineTable
            dataSource={filteredData}
            columns={columns}
            isPreview={true}
            isOtherVaccines={currentActiveTab === VaccinationCategoryEnum[1].key}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Preview;
