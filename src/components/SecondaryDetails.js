import React, { useEffect, useState } from "react";

import { Form, Input, Select, Row, Col, Button } from "antd";
import { isMobile } from "react-device-detect";

import { useDispatch, useSelector } from "react-redux";
import { listBloodGroup } from "../redux/appointmentsSlice";
import { getDecodedToken } from "../utils/localStorage";
import config from "../config";

const { Option } = Select;

function SecondaryDetails({ form, mode = "ADD", patient_data }) {

    const [showDetails, setShowDetails] = useState(true);
    const dispatch = useDispatch();
    const { bloodGroupData, patients_details, loading, error } = useSelector((state) => state.records);
    
    const decodedToken = getDecodedToken();
    const tokenData = decodedToken?.result;

    const fallbackBloodGroupData = [
        { bg_value: "A+", bg_title: "A Positive" },
        { bg_value: "A-", bg_title: "A Negative" },
        { bg_value: "B+", bg_title: "B Positive" },
        { bg_value: "B-", bg_title: "B Negative" },
        { bg_value: "AB+", bg_title: "AB Positive" },
        { bg_value: "AB-", bg_title: "AB Negative" },
        { bg_value: "O+", bg_title: "O Positive" },
        { bg_value: "O-", bg_title: "O Negative" }
    ];

    const displayBloodGroupData = bloodGroupData && bloodGroupData.length > 0 ? bloodGroupData : fallbackBloodGroupData;

    useEffect(() => {
        dispatch(listBloodGroup());
    }, []);

    useEffect(() => {
        if (patients_details && mode === "EDIT") {
            form.setFieldsValue({
                pm_blood_group: patients_details.pm_blood_group || patient_data?.pm_blood_group || patient_data?.patient_blood_group,
                pm_married_status: patients_details.pm_married_status,
                pm_occupation: patients_details.pm_occupation,
                pm_email: patients_details.pm_email,
                pm_aadhar_card_number: patients_details.pm_aadhar_card_number,
            });
        }
    }, [patients_details, patient_data]);
    
    return (
        <div>
            {!isMobile && (
                <div className="d-flex justify-content-between">
                    <div className="title">Secondary Details</div>
                    <Button
                        className="border-0 shadow-none"
                        onClick={() => setShowDetails(!showDetails)}>
                        <div className="title align-items-center d-flex">
                            <i className={`${showDetails ? 'icon-minus' : 'icon-Add'} me-2`} /> 
                            <span className="text-decoration-underline">{showDetails ? 'Show Less' : 'Add Details'}</span>
                        </div>
                    </Button>
                </div>
            )}
            {showDetails && (
                <>
                    <Row gutter={{ xs: 8, sm: 18, md: 40, lg: 94 }}>
                        {tokenData?.hospital_business_id != config.zydus_business_id && (
                            <Col xs={24} sm={24} md={12} lg={12}>
                                <Form.Item
                                    name="pm_blood_group"
                                    label="Blood Group">
                                    <Select 
                                        placeholder="Select patient's blood group" 
                                        allowClear
                                        loading={loading}
                                        disabled={loading}
                                        notFoundContent={loading ? "Loading..." : error ? "Error loading data" : "No data available"}
                                    >
                                        {
                                            displayBloodGroupData.map(elm => (
                                                <Option key={elm.bg_value} value={elm.bg_value}>
                                                    {elm.bg_value} ({elm.bg_title})
                                                </Option>
                                            ))
                                        }
                                    </Select>
                                </Form.Item>
                            </Col>
                        )}
                        <Col xs={24} sm={24} md={12} lg={12}>
                            <Form.Item
                                name="pm_married_status"
                                label="Marital Status">
                                <Select placeholder="Select patient's marital status" allowClear>
                                    <Option value="single">Single</Option>
                                    <Option value="married">Married</Option>
                                    <Option value="divorced">Divorced</Option>
                                    <Option value="widowed">Widowed</Option>
                                    <Option value="separated">Separated</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={{ xs: 8, sm: 18, md: 40, lg: 94 }}>
                        <Col xs={24} sm={24} md={12} lg={12}>
                            <Form.Item
                                name="pm_occupation"
                                label="Occupation">
                                <Input placeholder="Enter patient's occupation" className="text-capitalize" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={24} md={12} lg={12}>
                            <Form.Item
                                name="pm_email"
                                label="Email ID">
                                <Input placeholder="Enter patient's email id" type="email" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={{ xs: 8, sm: 18, md: 40, lg: 94 }}>
                        <Col xs={24} sm={24} md={12} lg={12}>
                            <Form.Item
                                name="pm_aadhar_card_number"
                                label="Aadhaar Card number">
                                <Input placeholder="Enter patient's aadhaar card number" type="number" maxLength={12} />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
}

export default React.memo(SecondaryDetails);
