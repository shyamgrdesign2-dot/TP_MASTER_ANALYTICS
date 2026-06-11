import React, { useEffect, useState } from "react";
import { Input, Select } from "antd";
import styles from "../DoctorOnboarding.module.css";

const { Option } = Select;

const BasicInfoStep = ({ formData, setFormData, specialities, loading }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Check for mobile device
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSpecialityChange = (value) => {
    setFormData({ ...formData, speciality: value });
  };

  // Add styles to head
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
      .ant-input::placeholder {
        color: #98A2B3 !important;
        font-family: Poppins !important;
        font-size: 0.875rem !important;
        font-style: normal !important;
        font-weight: 400 !important;
        line-height: 1.5rem !important;
      }
      
      .ant-select-selection-placeholder {
        color: #98A2B3 !important;
        font-family: Poppins !important;
        font-size: 0.875rem !important;
        font-style: normal !important;
        font-weight: 400 !important;
        line-height: 1.5rem !important;
      }
      
      .ant-select-selector {
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
      }
      
      .ant-select-selection-search {
        display: flex !important;
        align-items: center !important;
      }
      
      .ant-select-selection-item {
        display: flex !important;
        align-items: center !important;
      }
      
      @media (max-width: 768px) {
        .ant-select {
          font-size: 16px !important;
        }
        .ant-input {
          font-size: 16px !important;
        }
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div>
      <div className={styles.inputField}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            color: "#454551",
            fontFamily: "Poppins",
            fontSize: isMobile ? "0.8125rem" : "0.875rem",
            fontStyle: "normal",
            fontWeight: 400,
            lineHeight: "1.25rem",
          }}
        >
          Your Full name (First & Last name)
          <span className={styles.requiredAsterisk}>*</span>
        </label>
        <Input
          placeholder="Enter your Full name"
          name="fullName"
          value={formData.fullName}
          onChange={handleInputChange}
          size="large"
          status={formData.fullName ? "" : "error"}
          style={{
            width: "100%",
            height: isMobile ? "3rem" : "3.5rem",
            borderRadius: "6px",
            borderColor: formData.fullName ? "#d1d5db" : "#E2E2EA",
            fontSize: "16px",
            paddingLeft: "35px",
          }}
          className={styles.focusedInput}
          prefix={
            <span
              style={{
                position: "absolute",
                left: "16px",
                color: "#374151",
                fontWeight: "500",
                pointerEvents: "none",
                fontSize: "16px",
              }}
            >
              Dr
            </span>
          }
        />
      </div>

      <div className={styles.inputField} style={{ marginTop: "24px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            color: "#454551",
            fontFamily: "Poppins",
            fontSize: isMobile ? "0.8125rem" : "0.875rem",
            fontStyle: "normal",
            fontWeight: 400,
            lineHeight: "1.25rem",
          }}
        >
          Speciality
          <span className={styles.requiredAsterisk}>*</span>
        </label>
        <Select
          placeholder="Enter your speciality"
          value={formData.speciality || undefined}
          onChange={handleSpecialityChange}
          size="large"
          style={{
            width: "100%",
            height: isMobile ? "3rem" : "3.5rem",
          }}
          className={`${styles.specialitySelect} ${styles.focusedInput}`}
          popupClassName={styles.specialityDropdown}
          dropdownStyle={{ borderRadius: "6px" }}
          status={formData.speciality ? "" : "error"}
          loading={loading}
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
          optionFilterProp="children"
          allowClear
        >
          {specialities.map((speciality) => (
            <Option key={speciality.id} value={speciality.pmMasterId}>
              {speciality.displayName}
            </Option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default BasicInfoStep;
