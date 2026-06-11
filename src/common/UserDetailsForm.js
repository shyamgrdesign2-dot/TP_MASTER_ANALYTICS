import React, { useState } from "react";
import { Form, Input, Button, Row, Col, message } from "antd";
import api from "../api/services/axiosService";
import config from "../config";
import { useDispatch, useSelector } from "react-redux";
import { fetchSubscriptionDetails } from "../redux/subscriptionSlice";
import { closeModal } from "../redux/doctorModalSlice";
import { getClinicName, getTokenData } from "../utils/utils";
import { interest } from "../redux/monetizationSlice";

const UserDetailsForm = () => {
  const [form] = Form.useForm();
  const { profile } = useSelector((state) => state.doctors);
  const { service_name } = useSelector((state) => state.doctorModal);
  const dispatch = useDispatch();
  const { planDetails } = useSelector((state) => state.subscription);
  const tokenData = getTokenData();

  // Initial state for prefilling form fields
  const [formData, setFormData] = useState({
    name: profile?.um_name,
    mbl_no: profile?.um_contact,
    alternate_mbl_no: "",
    speciality: profile?.dp_name,
    clinic_id: tokenData?.clinic_id,
    clinic_name: profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id)?.hm_name,
    clinic_address: profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id)?.hm_address,
    pincode: profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id)?.hm_pincode,
    city: profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id)?.hm_city,
    state: profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id)?.hm_state,
    is_pm_renew_requested: true,
    country: "India",
    service_name: service_name
  });
  const [loader, setLoader] = useState(false);

  const onFinish = async () => {
    if (formData.alternate_mbl_no && formData.alternate_mbl_no.length !== 10) {
      message.open({
        type: "error",
        content: "Please enter a valid mobile number",
      });
      return;
    }
    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage.track_event("InterestSubmitted_Click", {
      doctor_id: profile?.doctor_unique_id,
      clinic_name,
    });
    setLoader(true);
    // const res = await api.post("/user/pm/info/interest", formData, {
    //   customBaseUrl: config.user_management_api_url,
    //   headers: {
    //     api_key: config.api_key,
    //     api_secret_key: config.api_secret_key,
    //   },
    // });
    const action = await dispatch(interest(formData));
    const res = action.payload;
    setLoader(false);
    if (res?.status === 200) {
      message.open({
        type: "success",
        content:
          "Our sales team will get in touch with you within a few hours to guide you through the purchase.",
        duration: 5,
      });
      dispatch(fetchSubscriptionDetails());
      dispatch(closeModal());
    } else {
      message.open({
        type: "error",
        content: "Error while submitting. Please try again",
      });
    }
  };

  return (
    <>
      {/* {planDetails?.is_pm_renew_requested ? (
        <h5 className="d-flex align-items-center justify-content-center m-auto p-5">
          Your interest was already submitted. Our sales team will get in touch
          with you within a few hours to guide you through the purchase.
        </h5>
      ) : ( */}
      <Form
        form={form}
        layout="vertical"
        initialValues={formData} // Prefill form fields with initial data
        onFinish={onFinish}
        style={formStyle}
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Full Name"
              name="name"
              rules={[
                { required: true, message: "Please enter your full name" },
              ]}
            >
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Primary Mobile number"
              name="mbl_no"
              rules={[
                {
                  required: true,
                  message: "Please enter your mobile number",
                },
              ]}
            >
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Secondary Mobile number">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={formData.alternate_mbl_no} // Ensures only valid state is shown
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
                  setFormData({ ...formData, alternate_mbl_no: value });
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Speciality"
              name="speciality"
              rules={[
                { required: true, message: "Please enter your speciality" },
              ]}
            >
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Clinic name"
              name="clinic_name"
              rules={[
                { required: true, message: "Please enter your clinic name" },
              ]}
            >
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Clinic Address"
          name="clinic_address"
          rules={[
            { required: true, message: "Please enter your clinic address" },
          ]}
        >
          <Input disabled />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Pincode"
              name="pincode"
              rules={[
                { required: true, message: "Please enter your pincode" },
              ]}
            >
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="City"
              name="city"
              rules={[{ required: true, message: "Please enter your city" }]}
            >
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="State"
              name="state"
              rules={[{ required: true, message: "Please enter your state" }]}
            >
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            style={submitButtonStyle}
            loading={loader}
          >
            Submit
          </Button>
        </Form.Item>
      </Form>
      {/* )} */}
    </>
  );
};

const formStyle = {
  maxWidth: "600px",
  marginTop: "20px",
  borderRadius: "12px",
};

const submitButtonStyle = {
  width: "100%",
  backgroundColor: "#5A5FFF",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "bold",
};

export default UserDetailsForm;
