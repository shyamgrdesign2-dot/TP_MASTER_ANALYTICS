import React, { useEffect, useState } from "react";
import {
  Drawer,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  message,
  Tag,
  notification,
} from "antd";
import moment from "moment";
import dayjs from "dayjs";
import { requestInitialConsent } from "../../api/services/ApiAbha";

import "./RequestMedicalRecordsDrawer.scss";
import { ASSETS } from "../../assets";
const checkBadgeIcon = ASSETS.images.checkBadge;

const showDateFormat = "DD-MM-YYYY";

const purposeOptions = [
  { label: "Care Management", value: "Care Management" },
];

const medicalRecordTypeOptions = [
  { label: "Prescription", value: "Prescription" },
];

const purposeMapping = {
  "Care Management": "CAREMGT",
};

const RequestMedicalRecordsDrawer = ({
  visible,
  onClose,
  onSuccess = () => {},
  abhaAddress,
}) => {
  const [form] = Form.useForm();
  const [requestPeriodFrom, setRequestPeriodFrom] = useState(null);
  const [requestPeriodTo, setRequestPeriodTo] = useState(null);
  const [consentExpiry, setConsentExpiry] = useState(null);
  const [loading, setLoading] = useState(false);

  // Quick select options for Request Period From
  const requestPeriodQuickOptions = [
    { label: "Last 3 months", months: 3 },
    { label: "Last 6 months", months: 6 },
    { label: "Last 12 months", months: 12 },
  ];

  // Quick select options for Consent Expiry (future dates)
  const consentExpiryQuickOptions = [
    { label: "Next 3 months", months: 3 },
    { label: "Next 6 months", months: 6 },
    { label: "Next 12 months", months: 12 },
  ];

  useEffect(() => {
    if (abhaAddress && form) {
      form.setFieldsValue({ abha_address: abhaAddress });
    }
  }, [abhaAddress, form]);

  const disabledRequestPeriodDate = (current) => {
    // Disable dates in the future for request period (should be past dates)
    return current && current > dayjs().endOf("day");
  };

  const disabledRequestPeriodToDate = (current) => {
    if (!requestPeriodFrom) {
      return current && current > dayjs().endOf("day");
    }
    return (
      (current && current > dayjs().endOf("day")) ||
      current < dayjs(requestPeriodFrom).startOf("day")
    );
  };

  const disabledExpireDate = (current) => {
    // Disable dates in the past for expire date (should be future dates)
    return current && current < dayjs().startOf("day");
  };

  const handleRequestPeriodQuickSelect = (months) => {
    const calculatedDate = moment().subtract(months, "months");
    setRequestPeriodFrom(dayjs(calculatedDate));
    form.setFieldsValue({ request_period_from: dayjs(calculatedDate) });
  };

  const handleExpireDateQuickSelect = (months) => {
    // Expire date should be in the future, so add months
    const calculatedDate = moment().add(months, "months");
    setConsentExpiry(dayjs(calculatedDate));
    form.setFieldsValue({ consent_expiry: dayjs(calculatedDate) });
  };

  const handleRequestPeriodChange = (date) => {
    setRequestPeriodFrom(date);
  };

  const handleRequestPeriodToChange = (date) => {
    setRequestPeriodTo(date);
  };

  const handleExpireDateChange = (date) => {
    setConsentExpiry(date);
  };

  const resetForm = () => {
    form.resetFields();
    setRequestPeriodFrom(null);
    setRequestPeriodTo(null);
    setConsentExpiry(null);
  };

  const buildPayload = (values) => {
    const abhaAddress = values.abha_address?.trim();
    if (!abhaAddress || !abhaAddress.includes("@")) {
      throw new Error(
        "Invalid ABHA address. Please include postfix (e.g. user@sbx)."
      );
    }

    const [abhaId, postfix] = abhaAddress.split("@");
    if (!abhaId || !postfix) {
      throw new Error(
        "Invalid ABHA address. Please include postfix (e.g. user@sbx)."
      );
    }

    const healthDateFrom = dayjs(values.request_period_from).format(
      "YYYY-MM-DD"
    );
    const healthDateTo = dayjs(values.request_period_to).format("YYYY-MM-DD");
    const consentExpiryValue = dayjs(values.consent_expiry).format(
      "YYYY-MM-DD HH:mm"
    );
    const mappedPurpose = purposeMapping[values.purpose] || values.purpose;

    return {
      abha_id: abhaId.trim(),
      abha_id_postfix: `@${postfix.trim()}`,
      abha_id_purpose: mappedPurpose,
      health_date_from: healthDateFrom,
      health_date_to: healthDateTo,
      patient_health_type: values.medical_record_type,
      consent_expiry: consentExpiryValue,
    };
  };

  const showSuccessToast = () => {
    notification.open({
      message: null,
      description: (
        <div className="request-medical-records-toast__content">
          <img src={checkBadgeIcon} alt="success" />
          <span>Medical Records Requested Successfully</span>
        </div>
      ),
      closeIcon: <i className="icon-Cross text-white" />,
      className: "request-medical-records-toast",
      placement: "topRight",
      duration: 3,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = buildPayload(values);

      setLoading(true);
      const response = await requestInitialConsent(payload);

      if (response?.success) {
        showSuccessToast();
        setLoading(false);
        resetForm();
        onClose();
        onSuccess(payload, response?.data);
      } else {
        const errorMessage =
          response?.message || "Failed to submit request. Please try again.";
        message.error(errorMessage);
        setLoading(false);
      }
    } catch (error) {
      if (error?.errorFields) {
        // Form validation error
        setLoading(false);
        return;
      }

      console.error("Request Medical Records error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit request. Please try again.";
      message.error(errorMessage);
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderMedicalRecordTag = (tagProps) => {
    const { label, closable, onClose: handleTagClose } = tagProps;

    const onPreventMouseDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <Tag
        className="medical-record-tag"
        closable={closable}
        onClose={handleTagClose}
        onMouseDown={onPreventMouseDown}
      >
        {label}
      </Tag>
    );
  };

  return (
    <Drawer
      closeIcon={false}
      placement="right"
      open={visible}
      onClose={handleClose}
      width={700}
      className="request-medical-records-drawer"
      styles={{
        body: {
          padding: 0,
          backgroundColor: "#fff",
          height: "980px",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <div className="request-medical-records-drawer-content">
        {/* Header */}
        <div className="modalCard-header h-60 align-items-center justify-content-between d-flex">
          <div className="align-items-center d-flex">
            <Button
              type="text"
              className="btn btn-delete-prescription px-3 focus-none h-100"
              onClick={handleClose}
            >
              <i className="icon-Cross fs-3"></i>
            </Button>
            <div className="modal-title">Request Medical Records</div>
          </div>
          <Button
            onClick={handleSubmit}
            className="btn btn-primary3 btn-41 px-4 me-20"
            loading={loading}
          >
            Submit
          </Button>
        </div>

        {/* Form Content */}
        <div
          style={{
            padding: "20px",
            height: "calc(100% - 60px)",
            overflowY: "auto",
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="request-medical-records-form"
          >
            {/* ABHA Address */}
            <Form.Item
              label={
                <>
                  ABHA Address <span className="text-red"></span>
                </>
              }
              name="abha_address"
              rules={[{ required: true, message: "Please enter ABHA Address" }]}
            >
              <Input
                placeholder="Enter ABHA Address"
                className="inputheight45"
                disabled
              />
            </Form.Item>

            {/* Request Period From */}
            <Form.Item
              label={
                <>
                  Request Period From <span className="text-red"></span>
                </>
              }
              name="request_period_from"
              rules={[
                {
                  required: true,
                  message: "Please select request period from date",
                },
              ]}
            >
              <div>
                <DatePicker
                  format={showDateFormat}
                  className="w-100 inputheight45"
                  inputReadOnly
                  disabledDate={disabledRequestPeriodDate}
                  value={requestPeriodFrom}
                  onChange={handleRequestPeriodChange}
                  placeholder="Select date"
                />
                <div className="d-flex pt-2 gap-2 flex-wrap">
                  {requestPeriodQuickOptions.map((option, index) => (
                    <Button
                      key={index}
                      type="text"
                      className="btn btn-primary2 btn-fw-bold fs-12"
                      onClick={() =>
                        handleRequestPeriodQuickSelect(option.months)
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Form.Item>

            {/* Request Period To */}
            <Form.Item
              label={
                <>
                  Request Period To <span className="text-red"></span>
                </>
              }
              name="request_period_to"
              rules={[
                {
                  required: true,
                  message: "Please select request period to date",
                },
              ]}
            >
              <DatePicker
                format={showDateFormat}
                className="w-100 inputheight45"
                inputReadOnly
                disabledDate={disabledRequestPeriodToDate}
                value={requestPeriodTo}
                onChange={handleRequestPeriodToChange}
                placeholder="Select date"
              />
            </Form.Item>

            {/* Shared Records Will Expire In */}
            <Form.Item
              label={
                <>
                  Shared Records Will Expire In{" "}
                  <span className="text-red"></span>
                </>
              }
              name="consent_expiry"
              rules={[
                { required: true, message: "Please select expiration date" },
              ]}
            >
              <div>
                <DatePicker
                  format={showDateFormat}
                  className="w-100 inputheight45"
                  showTime={{ format: "HH:mm" }}
                  disabledDate={disabledExpireDate}
                  value={consentExpiry}
                  onChange={handleExpireDateChange}
                  placeholder="Select date"
                />
                <div className="d-flex pt-2 gap-2 flex-wrap">
                  {consentExpiryQuickOptions.map((option, index) => (
                    <Button
                      key={index}
                      type="text"
                      className="btn btn-primary2 btn-fw-bold fs-12"
                      onClick={() => handleExpireDateQuickSelect(option.months)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Form.Item>

            {/* Purpose of Request */}
            <Form.Item
              label={
                <>
                  Purpose of Request <span className="text-red"></span>
                </>
              }
              name="purpose"
              rules={[
                { required: true, message: "Please select purpose of request" },
              ]}
            >
              <Select
                placeholder="Select purpose"
                className="inputheight45"
                options={purposeOptions}
                allowClear
              />
            </Form.Item>

            {/* Medical Record Type */}
            <Form.Item
              label={
                <>
                  Medical Record Type <span className="text-red"></span>
                </>
              }
              name="medical_record_type"
              rules={[
                {
                  required: true,
                  message: "Please select medical record type",
                },
              ]}
            >
              <Select
                mode="multiple"
                placeholder="Select medical record type(s)"
                className="medical-record-type-select"
                options={medicalRecordTypeOptions}
                allowClear
                tagRender={renderMedicalRecordTag}
                dropdownClassName="medical-record-type-dropdown"
              />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Drawer>
  );
};

export default RequestMedicalRecordsDrawer;
