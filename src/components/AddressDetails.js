import React, { useCallback, useEffect, useState } from "react";
import { Form, Input, Button, Row, Col } from "antd";
// import { notification } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { isMobile } from "react-device-detect";

import { searchPincode } from "../redux/appointmentsSlice";

function AddressDetails({ form }) {
  const dispatch = useDispatch();
  let { pincodeInfo, error } = useSelector((state) => state.records);

  const [showDetails, setShowDetails] = useState(true);
  const [pincode, setPincode] = useState("");

  // Form Rules
  // const rules = {
  //     pincode: [
  //         {
  //             required: true,
  //             message: <div className="align-items-center d-flex"><i className="icon-info me-2 fs-18"></i> Please enter pincode</div>,
  //         },
  //     ],
  // };

  useEffect(() => {
    if (pincode) {
      const timeOutId = setTimeout(() => {
        // pincode.length === 6 && dispatch(searchPincode(pincode));
        dispatch(searchPincode(pincode));
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    }
  }, [pincode]);

  useEffect(() => {
    if (pincodeInfo && Object.keys(pincodeInfo).length > 0) {
      form.setFieldsValue({
        pm_city: pincodeInfo?.city,
        pm_state: pincodeInfo?.state,
      });
    } else {
      form.setFieldsValue({
        pm_city: "",
        pm_state: "",
      });
    }
    // if (error) {
    //     notification.error({
    //         message: error.message,
    //     });
    // }
  }, [pincodeInfo, error]);

  const onChange = useCallback(
    (e) => {
      setPincode(e.target.value);
    },
    [pincode]
  );

  useEffect(() => {
    if (!form.getFieldValue("pm_pincode") || !dispatch) return;
    if (form.getFieldValue("pm_pincode").length !== 6) return;
    dispatch(searchPincode(form.getFieldValue("pm_pincode")));
  }, [form.getFieldValue("pm_pincode"), dispatch]);

  return (
    <>
      {!isMobile && (
        <div className="d-flex justify-content-between">
          <div className="title">Address Details</div>
          <Button
            className="border-0 shadow-none"
            onClick={() => setShowDetails(!showDetails)}
          >
            <div className="title align-items-center d-flex">
              <i
                className={`${showDetails ? "icon-minus" : "icon-Add"} me-2`}
              />{" "}
              <span className="text-decoration-underline">
                {" "}
                {showDetails ? "Show Less" : "Add Details"}{" "}
              </span>
            </div>
          </Button>
        </div>
      )}
      <div
        className={`address-details-form ${
          !showDetails && !isMobile ? "d-none" : ""
        }`}
      >
        <Row
          className={!isMobile && "mt-3"}
          gutter={{ xs: 8, sm: 18, md: 40, lg: 94 }}
        >
          <Col xs={24} sm={24} md={12} lg={12}>
            <Form.Item
              name="pm_pincode"
              label="Pincode"
              // rules={rules.pincode}
            >
              <Input
                placeholder="Pincode"
                type="number"
                maxLength={6}
                onChange={onChange}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12}>
            <Form.Item name="pm_city" label="City">
              <Input placeholder={"City"} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={{ xs: 8, sm: 18, md: 40, lg: 94 }}>
          <Col xs={24} sm={24} md={12} lg={12}>
            <Form.Item className="mb-0" name="pm_state" label="State">
              <Input placeholder={"State"} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12}>
            <Form.Item
              name="pm_address"
              className="mb-0"
              label="Street Address"
            >
              <Input placeholder="Street Address" />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default React.memo(AddressDetails);
