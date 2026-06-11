import React, { useState, useEffect } from "react";
import { Input, Radio, Button } from "antd";
import dayjs from "dayjs";
import styles from "./SequenceSettings.module.css";
import CommonModal from "../../../../common/CommonModal";

const SequenceSettings = ({
  open,
  onClose,
  type = "Bill", // 'bill' or 'receipt'
  initialValues,
  onSave,
}) => {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (initialValues) {
      setSettings(initialValues);
    }
  }, [initialValues]);

  const handlePrefixVisibilityChange = (e) => {
    setSettings((prev) => ({
      ...prev,
      prefixEnabled: e.target.value === "Show",
    }));
  };

  const handlePrefixChange = (e) => {
    setSettings((prev) => ({
      ...prev,
      prefix: e.target.value,
    }));
  };

  const handleSequenceTypeChange = (e) => {
    setSettings((prev) => ({
      ...prev,
      sequenceType:
        e.target.value === "Date Based (YYYYX)" ? "dateBased" : "serialNumber",
    }));
  };

  const handleFormatChange = (e) => {
    setSettings((prev) => ({
      ...prev,
      sequenceFormat: e.target.value,
    }));
  };

  const handleSerialNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setSettings((prev) => ({
      ...prev,
      serialNumber: value,
    }));
  };

  const generatePreview = () => {
    const {
      prefixEnabled,
      prefix,
      sequenceType,
      sequenceFormat,
      serialNumber,
    } = settings;
    let preview = "";

    if (prefixEnabled) {
      preview += prefix;
    }

    if (sequenceType === "dateBased") {
      const date = dayjs();
      switch (sequenceFormat) {
        case "YYYY":
          preview += date.format("YYYY") + serialNumber;
          break;
        case "YYYYMM":
          preview += date.format("YYYYMM") + serialNumber;
          break;
        case "YYYYMMDD":
          preview += date.format("YYYYMMDD") + serialNumber;
          break;
        default:
          preview += date.format("YYYY") + serialNumber;
      }
    } else {
      preview += serialNumber;
    }

    return preview;
  };

  return (
    <CommonModal
      isModalOpen={open}
      onCancel={onClose}
      modalWidth={500}
      title={`Set ${type} No. Sequence`}
      modalBody={
        <>
          <div className={styles.sequenceCard}>
            <div className={styles.formGroup}>
              <div className={styles.label}>Prefix Visibility</div>

              <Radio.Group
                value={settings.prefixEnabled ? "Show" : "Hide"}
                style={{ display: "flex", marginTop: 10 }}
                onChange={handlePrefixVisibilityChange}
              >
                {["Show", "Hide"].map((value, i) => {
                  return (
                    <Radio.Button
                      key={i}
                      value={value}
                      style={{
                        width: "87px",
                        height: "38px",
                      }}
                      className="custom-radio-button d-flex align-items-center justify-content-center"
                    >
                      {value}
                    </Radio.Button>
                  );
                })}
              </Radio.Group>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.label}>Enter Prefix:</div>
              <Input
                value={settings.prefix}
                onChange={handlePrefixChange}
                disabled={!settings.prefixEnabled}
              />
            </div>

            <div className={styles.divider} style={{ marginBottom: "20px" }} />

            <div className={styles.formGroup}>
              <div className={styles.label}>Choose Sequence Type:</div>
              <Radio.Group
                value={
                  settings.sequenceType === "dateBased"
                    ? "Date Based (YYYYX)"
                    : "Serial Number(X)"
                }
                style={{ display: "flex", marginTop: 10 }}
                onChange={handleSequenceTypeChange}
              >
                {["Date Based (YYYYX)", "Serial Number(X)"].map((value, i) => {
                  return (
                    <Radio.Button
                      key={i}
                      value={value}
                      style={{
                        width: "196px",
                        height: "38px",
                      }}
                      className="custom-radio-button d-flex align-items-center justify-content-center"
                    >
                      {value}
                    </Radio.Button>
                  );
                })}
              </Radio.Group>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.label}>Set Bill number Sequence(X)</div>
              <Input
                value={settings.serialNumber}
                onChange={handleSerialNumberChange}
                maxLength={4}
              />
            </div>

            {settings.sequenceType === "dateBased" && (
              <div className={styles.formGroup}>
                <div className={styles.label}>
                  Select any Date-Based Format:
                </div>
                <Radio.Group
                  value={settings.sequenceFormat}
                  onChange={handleFormatChange}
                >
                  <Radio value="YYYY">YYYYX</Radio>
                  <Radio value="YYYYMM">YYYYMMX</Radio>
                  <Radio value="YYYYMMDD">YYYYMMDDX</Radio>
                </Radio.Group>
              </div>
            )}

            <div className={styles.divider} />

            <div className={styles.preview}>
              Bill No. Preview:{" "}
              <span className={styles.previewValue}>{generatePreview()}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="d-flex align-items-center mt-2 justify-content-end">
              <div
                onClick={onClose}
                className="me-4 text-decoration-underline btn p-0 text-main"
              >
                Cancel
              </div>
              <Button
                onClick={() => onSave(settings)}
                className="lh-lg btn btn-primary3 btn-41 px-4"
              >
                <span>Save</span>
              </Button>
            </div>
          </div>
        </>
      }
    />
  );
};

export default SequenceSettings;
