import React, { useEffect, useMemo, useState } from "react";

import { Form, Input, Button, Select, DatePicker, Radio, Row, Col } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { isMobile } from "react-device-detect";

import { ADD, EDIT } from "../utils/constants";
import { calculateAge, onlyNumberFormat, removeBeforeWhiteSpace } from "../utils/utils";

import { useDispatch, useSelector } from "react-redux";
import { listSalutation } from "../redux/appointmentsSlice";

import { getAbhaDomainSuffix } from "./abha/helpers";
import { ASSETS } from "../assets";
const {
  abhaSvg: AbhaIcon,
  greenRight: GreenRight,
} = ASSETS.images;

const { Option } = Select;

const dateFormat = 'YYYY-MM-DD'
const showDateFormat = 'DD-MM-YYYY'

function PersonalDetails({ form, mode = ADD, patient_data }) {

    const [showDetails, setShowDetails] = useState(true);
    const [ageYearsMonths, setAgeYearsMonths] = useState(null);

    const dispatch = useDispatch();
    const { salutationData, patients_details } = useSelector((state) => state.records);
    const { abhaDetails } = useSelector((state) => state.abha || { abhaDetails: {} });
    const abhaLinkedAddress = abhaDetails?.linkedAddress || "";

    const normalizedAbhaAddress = useMemo(() => {
        if (!abhaLinkedAddress) {
            return "";
        }
        const trimmed = `${abhaLinkedAddress}`.trim();
        if (!trimmed) {
            return "";
        }
        return trimmed.includes("@")
            ? trimmed
            : `${trimmed}${getAbhaDomainSuffix()}`;
    }, [abhaLinkedAddress]);

    useEffect(() => {
        dispatch(listSalutation());
    }, []);

    useEffect(() => {
        if (patients_details && mode === EDIT) {
            form.setFieldsValue({
                pm_fullname: patients_details.pm_fullname,
                pm_salutation: patients_details.pm_salutation,
                pm_contact_no: patients_details.pm_contact_no,
                pm_gender: `${patients_details.pm_gender.charAt(0).toUpperCase()}${patients_details.pm_gender.slice(1)}`,
                pm_dob: dayjs(moment(patients_details.pm_dob).format(dateFormat), dateFormat),
                pm_reference_id: patients_details.pm_reference_id,
                pm_pincode: patients_details.pm_pincode,
                pm_city: patients_details.pm_city,
                pm_state: patients_details.pm_state,
                pm_address: patients_details.pm_address,
            });
            const age = calculateAge(moment(patients_details.pm_dob).format(dateFormat));
            setAgeYearsMonths(age);
        } else {
            if (patient_data !== undefined) {
                form.setFieldsValue({
                    pm_fullname: patient_data.pm_fullname,
                    pm_contact_no: patient_data.pm_contact_no,
                });
            }
        }
    }, [patients_details, patient_data]);

    const preparePrefilledAddress = (address) => {
        if (!address || typeof address !== 'string') {
            return address;
        }
        
        // If address character count is greater than or equal to 50
        if (address.length >= 50) {
            const addressParts = address.split(',');
            const firstThreeParts = addressParts.slice(0, 3);
            return firstThreeParts.join(',');
        }
        
        // Return original address if length is less than 50
        return address;
    };

    useEffect(() => {
        if (!form || !abhaDetails || Object.keys(abhaDetails).length === 0) return;
        const hasValue = (value) => value !== undefined && value !== null && value !== "";
        const updatedFields = {};

        if (hasValue(abhaDetails.fullName)) {
            updatedFields.pm_fullname = abhaDetails.fullName;
        }
        if (hasValue(abhaDetails.mobile)) {
            updatedFields.pm_contact_no = abhaDetails.mobile;
        }
        if (hasValue(abhaDetails.gender)) {
            updatedFields.pm_gender = abhaDetails.gender === "M"
                ? "Male" : abhaDetails.gender === "F"
                    ? "Female" : "Other";
        }
        if (hasValue(abhaDetails.dateOfBirth)) {
            const parsedDob = moment(
                abhaDetails.dateOfBirth,
                ["YYYY-MM-DD", "DD-MM-YYYY", "D-M-YYYY", dateFormat],
                true
            );

            if (parsedDob.isValid()) {
                const formattedDob = parsedDob.format(dateFormat);
                updatedFields.pm_dob = dayjs(formattedDob, dateFormat);
                const age = calculateAge(formattedDob);
                setAgeYearsMonths(age);
            }
        }
        if (hasValue(abhaDetails.pinCode)) {
            updatedFields.pm_pincode = abhaDetails.pinCode;
        }
        if (hasValue(abhaDetails.address)) {
            updatedFields.pm_address = preparePrefilledAddress(abhaDetails.address);
        }

        if (Object.keys(updatedFields).length > 0) {
            form.setFieldsValue(updatedFields);
        }
    }, [abhaDetails, form]);

    const validateMobileNumber = (_, value) => {
        const mobileNumberRegex = /^[0-9]{10}$/; // 10-digit number validation regex
        if (!value || !mobileNumberRegex.test(value)) {
            return Promise.reject('Please enter a valid 10-digit mobile number');
        }
        return Promise.resolve();
    };

    const validateFullName = (_, value) => {
        if (!value) {
            return Promise.reject('Please enter full name');
        } else {
            const updateQuery = removeBeforeWhiteSpace(value);
            form.setFieldsValue({
                pm_fullname: updateQuery,
            });
            return Promise.resolve();
        }
    };

    // Form Rules
    const rules = {
        fullname: [
            // {
            //     required: true,
            //     message: <div className="align-items-center d-flex"><i className="icon-info me-2 fs-18"></i> Please enter full name</div>,
            // },
            { required: true, validator: validateFullName, message: <div className="align-items-center d-flex"><i className="icon-info me-2 fs-18"></i> Please enter full name</div> },
        ],
        mobile_no: [
            // {
            //     required: true,
            //     message: <div className="align-items-center d-flex"><i className="icon-info me-2 fs-18"></i> Enter a valid mobile number</div>,
            // },
            { required: true, validator: validateMobileNumber, message: <div className="align-items-center d-flex"><i className="icon-info me-2 fs-18"></i> Enter a valid 10-digit mobile number</div> },
        ],
        gender: [
            {
                required: true,
                message: <div className="align-items-center d-flex"><i className="icon-info me-2 fs-18"></i> Please select gender</div>,
            },
        ],
        dob: [
            {
                required: true,
                message: <div className="align-items-center d-flex"><i className="icon-info me-2 fs-18"></i> Please fill age in years & months</div>,
            },
        ],
    };

    const onBirthDateChanged = (date, dateString) => {
        if (dateString) {
            // const remaingDate = moment(dateString).add(1, 'day').format('YYYY-MM-DD')
            const age = calculateAge(moment(dateString, showDateFormat).format(dateFormat));
            // form.setFieldsValue({
            //     pm_dob: moment(dateString),
            // });
            setAgeYearsMonths(age);
        }
    };

    const disabledDate = (current) => {
        const futureLimit = moment().endOf('day');
        const pastLimit = moment().subtract(149, 'years').startOf('day');
        return current && (current > futureLimit || current < pastLimit);

    };

    const handleSalutationChange = value => {
        const getGender = form.getFieldsValue()?.pm_gender
        if (!getGender && getGender === undefined) {
            if (value === "Mr" || value === "S/O") {
                form.setFieldsValue({
                    pm_gender: 'Male'
                });
            } else if (value === "Miss" || value === "Mrs" || value === "Ms." || value === "D/O") {
                form.setFieldsValue({
                    pm_gender: 'Female'
                });
            } else {
                form.setFieldsValue({
                    pm_gender: ''
                });
            }
        }
    };

    const handleGenderChange = e => {
        const getSalutation = form.getFieldsValue()?.pm_salutation
        if (!getSalutation && getSalutation === undefined) {
            const value = e.target.value
            if (value === "Male") {
                form.setFieldsValue({
                    pm_salutation: 'Mr'
                });
            } else if (value === "Female") {
                form.setFieldsValue({
                    pm_salutation: 'Ms.'
                });
            } else {
                form.setFieldsValue({
                    pm_salutation: null
                });
            }
        }
    };

    useEffect(() => {
        if (ageYearsMonths) {
            const newDate = new Date();
            newDate.setFullYear(
                newDate.getFullYear() - parseInt(
                    ageYearsMonths.hasOwnProperty("years")
                        ? ageYearsMonths.years != "" && !isNaN(ageYearsMonths.years)
                            ? ageYearsMonths.years
                            : 0
                        : 0
                ));
            newDate.setMonth(
                newDate.getMonth() - parseInt(
                    ageYearsMonths.hasOwnProperty("months")
                        ? ageYearsMonths.months != "" && !isNaN(ageYearsMonths.months)
                            ? ageYearsMonths.months
                            : 0
                        : 0
                ));
            newDate.setDate(newDate.getDate() - parseInt(
                ageYearsMonths.hasOwnProperty("days")
                    ? ageYearsMonths.days != "" && !isNaN(ageYearsMonths.days)
                        ? ageYearsMonths.days
                        : 0
                    : 0
            ));

            form.setFieldsValue({
                dob: moment(newDate).format(dateFormat)
            });
        }
    }, [ageYearsMonths]);

    return (
        <div>
            {!isMobile && (
                <div className="d-flex justify-content-between">
                    <div className="title">Personal Details</div>
                    <Button
                        className="border-0 shadow-none"
                        onClick={() => setShowDetails(!showDetails)}>
                        <div className="title align-items-center d-flex">
                            <i className={`${showDetails ? 'icon-minus' : 'icon-Add'} me-2`} /> <span className="text-decoration-underline">{showDetails ? 'Show Less' : 'Add Details'}</span>
                        </div>
                    </Button>
                </div>
            )}
            {showDetails && (
                <>
                    {normalizedAbhaAddress && (
                        <div className="abha-address-pill">
                            <div className="abha-address-pill__info">
                                <img src={AbhaIcon} alt="ABHA" className="abha-address-pill__icon" />
                                <span className="abha-address-pill__value">{normalizedAbhaAddress}</span>
                            </div>
                            <div className="abha-address-pill__verified">
                                <img src={GreenRight} alt="Verified" style={{ height: '20px', width: '20px' }} />
                            </div>
                        </div>
                    )}
                    <Row gutter={{ xs: 8, sm: 18, md: 24, lg: 30 }}>
                        <Col xs={8} sm={8} md={6} lg={4}>
                            <Form.Item name="pm_salutation" label="Salutation">
                                <Select placeholder="Select" onChange={handleSalutationChange}>
                                    {
                                        salutationData.map(elm => (
                                            <Option key={elm.ts_id} value={elm.ts_name}>{elm.ts_name}</Option>
                                        ))
                                    }
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={16} sm={16} md={18} lg={20}>
                            <Form.Item
                                name="pm_fullname"
                                label="Full Name"
                                rules={rules.fullname}>
                                <Input placeholder="Full Name" className="text-capitalize" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={{ xs: 8, sm: 18, md: 40, lg: 94 }}>
                        <Col xs={24} sm={24} md={12} lg={12}>
                            <Form.Item
                                name="pm_contact_no"
                                label="Mobile Number"
                                rules={rules.mobile_no}>
                                <Input placeholder="Enter 10 Digit Number" type="number" inputMode="numeric" maxLength={10} minLength={10} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={24} md={12} lg={12}>
                            <Form.Item name="pm_gender" label="Gender" rules={rules.gender}>
                                <Radio.Group className={`d-flex gender-radio`} onChange={handleGenderChange}>
                                    <Radio.Button className="w-100 text-center" value="Male">Male</Radio.Button>
                                    <Radio.Button className="w-100 text-center" value="Female">Female</Radio.Button>
                                    <Radio.Button className="w-100 text-center" value="Other">Other</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row className="align-items-center" gutter={{ xs: 0, sm: 0, lg: 0 }}>
                        <Col xs={24} sm={24} md={11} lg={11}>
                            <Form.Item
                                name="dob"
                                label="Age In Years & Months"
                                rules={rules.dob}
                            >
                                <div className="justify-content-between d-flex">
                                    <Input
                                        className="w-48"
                                        type="number"
                                        placeholder="Year"
                                        maxLength={3}
                                        value={ageYearsMonths?.years}
                                        onChange={(e) => {
                                            const intValue = onlyNumberFormat(e.target.value);
                                            if (intValue >= 0 && intValue <= 149) {
                                                setAgeYearsMonths({
                                                    ...ageYearsMonths,
                                                    years: intValue,
                                                });
                                                form.setFieldsValue({
                                                    pm_dob: "",
                                                });
                                            }
                                        }}
                                    />
                                    <Input
                                        className="w-48"
                                        type="number"
                                        placeholder="Months"
                                        maxLength={2}
                                        value={ageYearsMonths?.months}
                                        onChange={(e) => {
                                            const intValue = onlyNumberFormat(e.target.value);
                                            if (intValue >= 0 && intValue <= 12) {
                                                setAgeYearsMonths({
                                                    ...ageYearsMonths,
                                                    months: intValue,
                                                });
                                                form.setFieldsValue({
                                                    pm_dob: "",
                                                });
                                            }
                                        }}
                                    />
                                </div>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={24} md={2} lg={2}>
                            <div className="or text-center mt-2">OR</div>
                        </Col>
                        <Col xs={24} sm={24} md={11} lg={11}>
                            <Form.Item name="pm_dob" label="Date of Birth">
                                <DatePicker
                                    className="w-100"
                                    placeholder={showDateFormat.toLowerCase()}
                                    format={{
                                        format: showDateFormat,
                                        type: 'mask',
                                    }}
                                    onChange={onBirthDateChanged}
                                    disabledDate={disabledDate}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Col xs={24} sm={24} md={10} lg={10}>
                        <Form.Item
                            name="pm_reference_id"
                            label="Patient Reference ID">
                            <Input placeholder="Patient Reference ID" className="text-capitalize" />
                        </Form.Item>
                    </Col>
                </>
            )}
        </div>
    );
}

export default React.memo(PersonalDetails);
