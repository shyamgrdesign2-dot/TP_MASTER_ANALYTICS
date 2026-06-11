import React, { useEffect, useState } from "react";
import { Drawer, Input, Select, Button, Collapse, Radio } from "antd";
import styles from "./AdvanceBillSettings.module.css";
import { useSelector } from "react-redux";
import SequenceSettings from "./SequenceSettings";
import { updateAdvancedSettings } from "../../service";
import { errorMessage, getClinic, trackEvent } from "../../../../utils/utils";
import { getDecodedToken } from "../../../../utils/localStorage";
import dayjs from "dayjs";
import InfoTooltip from "../billingDashboard/BillingTable/InfoToolTip/InfoTooltip";

const AdvanceBillSettings = ({ visible, onClose, getAdvanceSettings }) => {
  const [settings, setSettings] = useState({});
  const { advancedSettings } = useSelector((state) => state.billing);

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [ipdBillModalOpen, setIpdBillModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [ipdReceiptModalOpen, setIpdReceiptModalOpen] = useState(false);
  const [advanceReceiptModalOpen, setAdvanceReceiptModalOpen] = useState(false);
  const { profile } = useSelector((state) => state.doctors);
  
  const decodedToken = getDecodedToken();
  const isAdmin = Boolean(decodedToken?.result?.admin);

  useEffect(() => {
    if (advancedSettings) setSettings(advancedSettings);
  }, [advancedSettings]);

  const handleSaveBillSequence = async (settings) => {
    updateSettings({
      ...advancedSettings,
      billSequence: settings,
    });
  };

  const handleSaveIpdBillSequence = async (settings) => {
    updateSettings({
      ...advancedSettings,
      ipdSetting: { ...(advancedSettings?.ipdSetting || {}), billSequence: settings },
    });
  };

  const handleSaveIpdReceiptSequence = async (settings) => {
    updateSettings({
      ...advancedSettings,
      ipdSetting: { ...(advancedSettings?.ipdSetting || {}), receiptSequence: settings },
    });
  };

  const handleSaveReceiptSequence = (settings) => {
    updateSettings({
      ...advancedSettings,
      receiptSequence: settings,
    });
  };

  const handleAdvancedReceiptSequence = (settings) => {
    updateSettings({
      ...advancedSettings,
      advancedReceiptSequence: settings,
    });
  };

  const updateSettings = async (payload) => {
    try {
      const res = await updateAdvancedSettings(payload);
      if (res?.status === 204) {
        getAdvanceSettings();
        setBillModalOpen(false);
        setReceiptModalOpen(false);
        setIpdBillModalOpen(false);
        setIpdReceiptModalOpen(false);
        setAdvanceReceiptModalOpen(false);
        onClose();
      } else {
        errorMessage(
          res?.data?.message || "Error while updating sequence settings"
        );
      }
    } catch (err) {
      errorMessage(err?.message || "Error while updating sequence settings");
    }
  };

   const handleDefaultIpdPaymentMode = (value) => {
    setSettings({ ...settings, ipdSetting: { ...settings?.ipdSetting || {}, defaultPaymentMode: value } });
  };

  const handleDefaultPaymentMode = (value) => {
    setSettings({ ...settings, defaultPaymentMode: value });
  };

  const handleBillingStatusInAppointmentScreen = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value === "Show" });
  };

  const handleIpdEnableCreatedByInRx = (e) => {
    setSettings({ ...settings, ipdSetting: { ...settings?.ipdSetting || {}, enableCreatedByInRx: e.target.value === "Show" } });
  };

  const handleDefaultDiscountType = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleDefaultIpdDiscountType = (e) => {
    setSettings({ ...settings, ipdSetting: { ...settings?.ipdSetting || {}, defaultDiscountType: e.target.value } });
  };

  const handleDefaultForm3cFlag = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value === "Checked" });
  };

  const handleDefaultIpdForm3cFlag = (e) => {
    setSettings({ ...settings, ipdSetting: { ...settings?.ipdSetting || {}, defaultForm3cFlag: e.target.value === "Checked" } });
  };

  const handleDefaultRxFlag = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value === "Checked" });
  };

  const handleEnabledForReceptionist = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value === "Allow" });
  };

  const handleEditBillAccessControlForReceptionist = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value === "Allow" });
  };

  const handleChangeGstin = (e) => {
    setSettings({ ...settings, GSTIN: e.target.value });
  };

  const generatePreview = (sequence) => {
    const {
      prefixEnabled,
      prefix,
      sequenceType,
      sequenceFormat,
      serialNumber,
    } = sequence || {};
    let preview = "";

    if (prefixEnabled) {
      preview += prefix;
    }

    if (sequenceType === "dateBased") {
      const date = dayjs();
      switch (sequenceFormat) {
        case "YYYYX":
          preview += date.format("YYYY") + serialNumber;
          break;
        case "YYYYMMX":
          preview += date.format("YYYYMM") + serialNumber;
          break;
        case "YYYYMMDDX":
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

  const handleAdvancedSettings = () => {
    const clinic = getClinic();
    trackEvent("TP_billing_savesettings", {
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      city: clinic?.hm_city,
      pincode: clinic?.hm_pincode,
    });
    updateSettings({ ...advancedSettings, ...settings });
  };

  return (
    <Drawer
      title="Advance Bill Settings"
      placement="right"
      onClose={onClose}
      open={visible}
      width={598}
      extra={
        <Button
          type="primary"
          onClick={handleAdvancedSettings}
          disabled={!advancedSettings}
        >
          Save
        </Button>
      }
    >
      <div className="p-3">
        <div className="bg-white p-3 rounded-4">
          <Collapse
            items={[
              {
                key: "1",
                label: <div className="fw-semibold">OPD Bill Settings</div>,
                children: (
                  <div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>OPD Bill No. Sequence</label>
                        <InfoTooltip type={"BillNumber"} />
                      </div>
                      <Input
                        value={generatePreview(settings.billSequence)}
                        suffix={
                          <span
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              advancedSettings?.billSequence &&
                              setBillModalOpen(true)
                            }
                          >
                            <i className="icon-Edit" />
                          </span>
                        }
                        disabled
                        style={{ height: "38px" }}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>OPD Receipt No. Sequence</label>
                        <InfoTooltip type={"BillReceiptNumber"} />
                      </div>
                      <Input
                        value={generatePreview(settings.receiptSequence)}
                        suffix={
                          <span
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              advancedSettings?.receiptSequence &&
                              setReceiptModalOpen(true)
                            }
                          >
                            <i className="icon-Edit" />
                          </span>
                        }
                        disabled
                        style={{ height: "38px" }}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>Select Default Payment mode</label>
                        <InfoTooltip type={"DefaultPaymentMode"} />
                      </div>
                      <Select
                        value={settings.defaultPaymentMode}
                        style={{ width: "100%", height: "38px" }}
                        options={[
                          { value: "Cash", label: "Cash" },
                          { value: "Credit Card", label: "Credit Card" },
                          { value: "Debit Card", label: "Debit Card" },
                          { value: "UPI", label: "UPI" },
                          { value: "Cheque", label: "Cheque" },
                          {
                            value: "Advance Deposit",
                            label: "Advance Deposit",
                          },
                          { value: "Others", label: "Others" },
                        ]}
                        onChange={handleDefaultPaymentMode}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>
                          Billed/Unbilled Status in Appointment Screen
                        </label>
                        <InfoTooltip type={"BillingStatus"} />
                      </div>
                      <Radio.Group
                        value={
                          settings.billingStatusInAppointmentScreen
                            ? "Show"
                            : "Hide"
                        }
                        style={{ display: "flex", marginTop: 10 }}
                        onChange={handleBillingStatusInAppointmentScreen}
                        name="billingStatusInAppointmentScreen"
                      >
                        {["Hide", "Show"].map((value, i) => {
                          return (
                            <Radio.Button
                              key={i}
                              value={value}
                              style={{
                                width: "50%",
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
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>Set Default Discount Type as</label>
                        <InfoTooltip type={"DefaultDiscountType"} />
                      </div>
                      <Radio.Group
                        value={settings.defaultDiscountType}
                        style={{ display: "flex", marginTop: 10 }}
                        onChange={handleDefaultDiscountType}
                        name="defaultDiscountType"
                      >
                        {[
                          { label: "%", value: "percentage" },
                          { label: "₹", value: "flat" },
                        ].map((item, i) => {
                          return (
                            <Radio.Button
                              key={i}
                              value={item.value}
                              style={{
                                width: "50%",
                                height: "38px",
                              }}
                              className="custom-radio-button d-flex align-items-center justify-content-center"
                            >
                              {item.label}
                            </Radio.Button>
                          );
                        })}
                      </Radio.Group>
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>
                          Add Bill to Form 3C (Checkbox Default State)
                        </label>
                        <InfoTooltip type={"Form3c"} />
                      </div>
                      <Radio.Group
                        value={
                          settings.defaultForm3cFlag ? "Checked" : "Unchecked"
                        }
                        style={{ display: "flex", marginTop: 10 }}
                        onChange={handleDefaultForm3cFlag}
                        name="defaultForm3cFlag"
                      >
                        {[
                          {
                            label: "Unchecked (not selected)",
                            value: "Unchecked",
                          },
                          { label: "Checked (Selected)", value: "Checked" },
                        ].map((item, i) => {
                          return (
                            <Radio.Button
                              key={i}
                              value={item.value}
                              style={{
                                width: "50%",
                                height: "38px",
                              }}
                              className="custom-radio-button d-flex align-items-center justify-content-center"
                            >
                              {item.label}
                            </Radio.Button>
                          );
                        })}
                      </Radio.Group>
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>Include in Rx (Checkbox Default State)</label>
                        <InfoTooltip type={"AdvanceInRx"} />
                      </div>
                      <Radio.Group
                        value={settings.defaultRxFlag ? "Checked" : "Unchecked"}
                        style={{ display: "flex", marginTop: 10 }}
                        onChange={handleDefaultRxFlag}
                        name="defaultRxFlag"
                      >
                        {[
                          {
                            label: "Unchecked (not selected)",
                            value: "Unchecked",
                          },
                          { label: "Checked (Selected)", value: "Checked" },
                        ].map((item, i) => {
                          return (
                            <Radio.Button
                              key={i}
                              value={item.value}
                              style={{
                                width: "50%",
                                height: "38px",
                              }}
                              className="custom-radio-button d-flex align-items-center justify-content-center"
                            >
                              {item.label}
                            </Radio.Button>
                          );
                        })}
                      </Radio.Group>
                    </div>
                    <div
                      className={styles.formItem}
                      style={{ marginBottom: 50 }}
                    >
                      <div className={styles.inputWithIcon}>
                        <label>Bill Created by/date in Bill Print</label>
                        <InfoTooltip type={"BillInfoInPrint"} />
                      </div>
                      <Radio.Group
                        value={settings.enableCreatedByInRx ? "Show" : "Hide"}
                        style={{ display: "flex", marginTop: 10 }}
                        onChange={handleBillingStatusInAppointmentScreen}
                        name="enableCreatedByInRx"
                      >
                        {["Hide", "Show"].map((value, i) => {
                          return (
                            <Radio.Button
                              key={i}
                              value={value}
                              style={{
                                width: "50%",
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
                  </div>
                ),
              },
              {
                key: "2",
                label: <div className="fw-semibold">IPD Bill Settings</div>,
                children: (
                  <div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>IPD Bill No. Sequence</label>
                        <InfoTooltip type={"BillNumber"} />
                      </div>
                      <Input
                        value={generatePreview(
                          settings?.ipdSetting?.billSequence
                        )}
                        suffix={
                          <span
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              advancedSettings?.ipdSetting?.billSequence &&
                              setIpdBillModalOpen(true)
                            }
                          >
                            <i className="icon-Edit" />
                          </span>
                        }
                        disabled
                        style={{ height: "38px" }}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>IPD Receipt No. Sequence</label>
                        <InfoTooltip type={"BillReceiptNumber"} />
                      </div>
                      <Input
                        value={generatePreview(
                          settings?.ipdSetting?.receiptSequence
                        )}
                        suffix={
                          <span
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              advancedSettings?.ipdSetting?.receiptSequence &&
                              setIpdReceiptModalOpen(true)
                            }
                          >
                            <i className="icon-Edit" />
                          </span>
                        }
                        disabled
                        style={{ height: "38px" }}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>Select Default Payment mode</label>
                        <InfoTooltip type={"DefaultPaymentMode"} />
                      </div>
                      <Select
                        value={settings?.ipdSetting?.defaultPaymentMode}
                        style={{ width: "100%", height: "38px" }}
                        options={[
                          { value: "Cash", label: "Cash" },
                          { value: "Credit Card", label: "Credit Card" },
                          { value: "Debit Card", label: "Debit Card" },
                          { value: "UPI", label: "UPI" },
                          { value: "Cheque", label: "Cheque" },
                          {
                            value: "Advance Deposit",
                            label: "Advance Deposit",
                          },
                          { value: "Others", label: "Others" },
                        ]}
                        onChange={handleDefaultIpdPaymentMode}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>Set Default Discount Type as</label>
                        <InfoTooltip type={"DefaultDiscountType"} />
                      </div>
                      <Radio.Group
                        value={settings?.ipdSetting?.defaultDiscountType}
                        style={{ display: "flex", marginTop: 10 }}
                        onChange={handleDefaultIpdDiscountType}
                        name="defaultIpdDiscountType"
                      >
                        {[
                          { label: "%", value: "percentage" },
                          { label: "₹", value: "flat" },
                        ].map((item, i) => {
                          return (
                            <Radio.Button
                              key={i}
                              value={item.value}
                              style={{
                                width: "50%",
                                height: "38px",
                              }}
                              className="custom-radio-button d-flex align-items-center justify-content-center"
                            >
                              {item.label}
                            </Radio.Button>
                          );
                        })}
                      </Radio.Group>
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>
                          Add Bill to Form 3C (Checkbox Default State)
                        </label>
                        <InfoTooltip type={"Form3c"} />
                      </div>
                      <Radio.Group
                        value={
                          settings?.ipdSetting?.defaultForm3cFlag
                            ? "Checked"
                            : "Unchecked"
                        }
                        style={{ display: "flex", marginTop: 10 }}
                        onChange={handleDefaultIpdForm3cFlag}
                        name="defaultIpdForm3cFlag"
                      >
                        {[
                          {
                            label: "Unchecked (not selected)",
                            value: "Unchecked",
                          },
                          { label: "Checked (Selected)", value: "Checked" },
                        ].map((item, i) => {
                          return (
                            <Radio.Button
                              key={i}
                              value={item.value}
                              style={{
                                width: "50%",
                                height: "38px",
                              }}
                              className="custom-radio-button d-flex align-items-center justify-content-center"
                            >
                              {item.label}
                            </Radio.Button>
                          );
                        })}
                      </Radio.Group>
                    </div>
                    <div
                      className={styles.formItem}
                      style={{ marginBottom: 50 }}
                    >
                      <div className={styles.inputWithIcon}>
                        <label>Bill Created by/date in Bill Print</label>
                        <InfoTooltip type={"BillInfoInPrint"} />
                      </div>
                      <Radio.Group
                        value={
                          settings?.ipdSetting?.enableCreatedByInRx
                            ? "Show"
                            : "Hide"
                        }
                        style={{ display: "flex", marginTop: 10 }}
                        onChange={handleIpdEnableCreatedByInRx}
                        name="enableCreatedByInRx"
                      >
                        {["Hide", "Show"].map((value, i) => {
                          return (
                            <Radio.Button
                              key={i}
                              value={value}
                              style={{
                                width: "50%",
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
                  </div>
                ),
              },
              {
                key: "3",
                label: <div className="fw-semibold">Other Settings</div>,
                children: (
                  <div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>Advance Receipt No. Sequence</label>
                        <InfoTooltip type={"AdvanceReceiptNumber"} />
                      </div>
                      <Input
                        value={generatePreview(
                          settings.advancedReceiptSequence
                        )}
                        suffix={
                          <span
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              advancedSettings?.advancedReceiptSequence &&
                              setAdvanceReceiptModalOpen(true)
                            }
                          >
                            <i className="icon-Edit" />
                          </span>
                        }
                        disabled
                        style={{ height: "38px" }}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>GSTIN number</label>
                        <InfoTooltip type={"GSTIN"} />
                      </div>
                      <Input
                        value={settings.GSTIN}
                        style={{ height: "38px" }}
                        onChange={handleChangeGstin}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <div className={styles.inputWithIcon}>
                        <label>Receptionist Access Control</label>
                        <InfoTooltip type={"ReceptionistAccessControl"} />
                      </div>
                      <Radio.Group
                        value={
                          settings.enabledForReceptionist ? "Allow" : "Restrict"
                        }
                        style={{ display: "flex", marginTop: 10 }}
                        onChange={handleEnabledForReceptionist}
                        name="enabledForReceptionist"
                      >
                        {["Allow", "Restrict"].map((item, i) => {
                          return (
                            <Radio.Button
                              key={i}
                              value={item}
                              style={{
                                width: "50%",
                                height: "38px",
                              }}
                              className="custom-radio-button d-flex align-items-center justify-content-center"
                            >
                              {item}
                            </Radio.Button>
                          );
                        })}
                      </Radio.Group>
                    </div>
                    {isAdmin && (
                      <div className={styles.formItem}>
                        <div className={styles.inputWithIcon}>
                          <label>Edit Bill Access Control for Reception</label>
                          <InfoTooltip type={"EditBillAccessControlForReception"} />
                        </div>
                        <Radio.Group
                          value={
                            settings.editBillAccessControlForReceptionist === false ? "Restrict" : "Allow"
                          }
                          style={{ display: "flex", marginTop: 10 }}
                          onChange={handleEditBillAccessControlForReceptionist}
                          name="editBillAccessControlForReceptionist"
                        >
                          {["Allow", "Restrict"].map((item, i) => {
                            return (
                              <Radio.Button
                                key={i}
                                value={item}
                                style={{
                                  width: "50%",
                                  height: "38px",
                                }}
                                className="custom-radio-button d-flex align-items-center justify-content-center"
                              >
                                {item}
                              </Radio.Button>
                            );
                          })}
                        </Radio.Group>
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
            defaultActiveKey={[]}
            className="prescriptiontab-accordian history-sider-box history-sider-box-white"
            expandIconPosition="end"
          />
        </div>
      </div>
      <SequenceSettings
        type="OPD Bill"
        open={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        onSave={handleSaveBillSequence}
        initialValues={advancedSettings.billSequence}
      />
      <SequenceSettings
        type="OPD Receipt"
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        onSave={handleSaveReceiptSequence}
        initialValues={advancedSettings.receiptSequence}
      />
      <SequenceSettings
        type="IPD Bill"
        open={ipdBillModalOpen}
        onClose={() => setIpdBillModalOpen(false)}
        onSave={handleSaveIpdBillSequence}
        initialValues={advancedSettings?.ipdSetting?.billSequence}
      />
      <SequenceSettings
        type="IPD Receipt"
        open={ipdReceiptModalOpen}
        onClose={() => setIpdReceiptModalOpen(false)}
        onSave={handleSaveIpdReceiptSequence}
        initialValues={advancedSettings?.ipdSetting?.receiptSequence}
      />
      <SequenceSettings
        type="Advance Receipt"
        open={advanceReceiptModalOpen}
        onClose={() => setAdvanceReceiptModalOpen(false)}
        onSave={handleAdvancedReceiptSequence}
        initialValues={advancedSettings.advancedReceiptSequence}
      />
    </Drawer>
  );
};

export default AdvanceBillSettings;
