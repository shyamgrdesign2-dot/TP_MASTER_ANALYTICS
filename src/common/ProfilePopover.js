import React, { useEffect, useState } from 'react';
import { Button, Popover, Drawer, Radio, message } from 'antd';
import { makeDefaultLogo } from "../utils/utils";
import { Link } from 'react-router-dom';

import { useSelector, useDispatch } from "react-redux";
import moment from 'moment';
import { getDecodedToken } from '../utils/localStorage';
import config from '../config';
import { GB_CVT_EXT_HOS, NEO_NATOLOGISTS_DP_ID, PAEDIATRIC_DP_ID } from '../utils/constants';
import { isMobile } from 'react-device-detect';
import { listBloodGroup, editBloodGroup, viewPatient } from '../redux/appointmentsSlice';
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { ASSETS } from "../assets";
const BloodIcon = ASSETS.images.blood;


export const genderAge = (patient_data, profile, shouldShowGender = true) => {
    var value = shouldShowGender && patient_data?.pm_gender
        ? `${patient_data.pm_gender[0].toUpperCase()}, `
        : "";
    if (profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) {
        if (patient_data?.ageYears != 0) {
            value += `${patient_data?.ageYears}y`;
        }
        if (patient_data?.ageMonths != 0) {
            value += ` ${patient_data?.ageMonths}m`;
        }
        if (patient_data?.ageDays != 0) {
            value += ` ${patient_data?.ageDays}d`;
        }
    } else {
        if (patient_data?.ageYears != 0) {
            value += `${patient_data?.ageYears}y`
        } else if (patient_data?.ageMonths != 0) {
            value += ` ${patient_data?.ageMonths}m`
        } else if (patient_data?.ageDays != 0) {
            value += ` ${patient_data?.ageDays}d`
        }
    }
    return value;
};

function ProfilePopover(props) {
    const [open, setOpen] = useState(false);
    const [tokenData, setTokenData] = useState(null);
    const [zydusBloodGroupDrawerOpen, setZydusBloodGroupDrawerOpen] = useState(false);
    const [selectedBloodGroup, setSelectedBloodGroup] = useState(null);
    const [bloodGroupOptions, setBloodGroupOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    const { profile } = useSelector((state) => state.doctors);
    const dispatch = useDispatch();

    const { locationPath, patient_data, isPrescriptionPage } = props;
    const { patients_details } = useSelector(
        (state) => state.records
    );

    const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);

    const isPaediatric = profile?.dp_id === PAEDIATRIC_DP_ID;

    let patientDOB = ''
    if (patients_details?.pm_dob) {
        patientDOB = moment(patients_details.pm_dob).format("DD-MM-YYYY");
    } else if (patient_data?.DOB) {
        patientDOB = moment(patient_data.DOB, "Do MMMM YYYY").format("DD-MM-YYYY");
    } else if (patient_data?.pm_dob) {
        patientDOB = moment(patient_data?.pm_dob).format("DD-MM-YYYY");
    }

    useEffect(() => {
        const decodedToken = getDecodedToken();
        const decoded = decodedToken?.result;
        setTokenData(decoded)
    }, []);

    const handleOpenChange = (newOpen) => {
        setOpen(newOpen);
    };

    const fetchBloodGroupOptions = async () => {
        setLoading(true);
        try {
            const action = await dispatch(listBloodGroup());
            if (action.meta.requestStatus === 'fulfilled') {
                setBloodGroupOptions(action.payload || []);
            }
        } catch (error) {
            message.error('Failed to load blood group options');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBloodGroup = async () => {
        if (!selectedBloodGroup) {
            message.warning('Please select a blood group');
            return;
        }

        setLoading(true);
        try {
            const action = await dispatch(editBloodGroup({
                patient_unique_id: patient_data?.patient_unique_id || patients_details?.patient_unique_id,
                pm_blood_group: selectedBloodGroup
            }));

            if (action.meta.requestStatus === 'fulfilled') {
                const patientUniqueId = patient_data?.patient_unique_id || patients_details?.patient_unique_id;
                if (patientUniqueId) {
                    await dispatch(viewPatient(patientUniqueId));
                }
                setZydusBloodGroupDrawerOpen(false);
                message.success('Blood group updated successfully');
            } else {
                message.error(action.payload || 'Failed to save blood group');
            }
        } catch (error) {
            console.error('Error saving blood group:', error);
            message.error('Failed to save blood group');
        } finally {
            setLoading(false);
        }
    };

    const handleBloodGroupDrawerOpen = () => {
        setSelectedBloodGroup(patients_details?.pm_blood_group || patient_data?.pm_blood_group || null);
        fetchBloodGroupOptions();
        setZydusBloodGroupDrawerOpen(true);
        setOpen(false);
    };

    const content = (
        <>
            {tokenData?.hospital_business_id != config.zydus_business_id && (
                <div className="align-items-center d-flex medicine-templates border-top-0 without-hover p-0 pb-3">
                    <div className="round-box bg-body-secondary"><i className="icon-Id fs-21"></i></div>
                    <div className="text-truncate">
                        <div className="fontroboto letterspacing">Patient Id</div>
                        <div className="fontroboto letterspacing fw-medium">
                            {isCvtExtHosAccessableFromGB
                                ? (patients_details?.pm_reference_id || patient_data?.pm_reference_id || patient_data?.tpml_refrence_id || "000000")
                                : (patient_data !== undefined ? patient_data?.pm_pid : "000000")}
                        </div>
                    </div>
                </div>
            )}
            {tokenData?.hospital_business_id == config.zydus_business_id && (patients_details?.pm_reference_id || patient_data?.pm_reference_id || patient_data?.tpml_refrence_id) && (
                <div className="align-items-center d-flex medicine-templates border-top-0 without-hover p-0 pb-3">
                    <div className="round-box bg-body-secondary"><i className="icon-Id fs-21"></i></div>
                    <div className="text-truncate">
                        <div className="fontroboto letterspacing">MRN Number</div>
                        <div className="fontroboto letterspacing fw-medium">{patients_details?.pm_reference_id || patient_data?.pm_reference_id || patient_data?.tpml_refrence_id}</div>
                    </div>
                </div>
            )}
            <div className={`align-items-center d-flex medicine-templates border-top-0 without-hover p-0 pb-3 ${isPaediatric && patientDOB && 'pb-3'}`}>
                <div className="round-box bg-body-secondary"><i className="icon-phone fs-21"></i></div>
                <div className="text-truncate">
                    <div className="fontroboto letterspacing">Mobile Number</div>
                    <div className="fontroboto letterspacing fw-medium">{patient_data !== undefined ? patient_data?.pm_contact_no : "000000"}</div>
                </div>
            </div>
            {isPaediatric && patientDOB && (
                <div className="align-items-center d-flex medicine-templates border-top-0 without-hover p-0 pb-3">
                    <div className="round-box bg-body-secondary"><i className="icon-calendar fs-21"></i></div>
                    <div className="text-truncate">
                        <div className="fontroboto letterspacing">Date of Birth</div>
                        <div className="fontroboto letterspacing fw-medium">{moment(patientDOB, 'DD-MM-YYYY').format("DD MMM YYYY")}</div>
                    </div>
                </div>
            )}
            {tokenData?.hospital_business_id != config.zydus_business_id && (patient_data?.pm_blood_group || patient_data?.patient_blood_group || patients_details?.pm_blood_group) && (
                <div className="align-items-center d-flex medicine-templates border-top-0 without-hover p-0">
                    <div className="round-box bg-body-secondary"><img src={BloodIcon} alt="blood" style={{ width: '21px', height: '21px' }} /></div>
                    <div className="text-truncate">
                        <div className="fontroboto letterspacing">Blood Group</div>
                        <div className="fontroboto letterspacing fw-medium">{patient_data?.pm_blood_group || patient_data?.patient_blood_group || patients_details?.pm_blood_group}</div>
                    </div>
                </div>
            )}
            {tokenData?.hospital_business_id == config.zydus_business_id && (
                <div className="align-items-center d-flex medicine-templates border-top-0 without-hover p-0">
                    <div className="round-box bg-body-secondary"><img src={BloodIcon} alt="blood" style={{ width: '21px', height: '21px' }} /></div>
                    <div className="text-truncate">
                        <div className="fontroboto letterspacing fw-medium">
                            {patient_data?.pm_blood_group || patient_data?.patient_blood_group || patients_details?.pm_blood_group ? (
                                <>
                                    <div className="fontroboto letterspacing">Blood Group</div>
                                    <div className='d-flex'>
                                        <div>{patient_data?.pm_blood_group || patient_data?.patient_blood_group || patients_details?.pm_blood_group}</div>
                                        <div><i style={{ fontSize: '20px' }} className="icon-Edit ms-2 cursor-pointer text-primary" onClick={handleBloodGroupDrawerOpen}></i></div>
                                    </div>
                                </>
                            ) : (
                                <span style={{ fontWeight: '400' }} className="cursor-pointer text-decoration-underline text-primary" onClick={handleBloodGroupDrawerOpen}>
                                    Add Patient's Blood Group
                                </span>

                            )}
                        </div>
                    </div>
                </div>
            )}
            { !isCvtExtHosAccessableFromGB && 
                <div>
                    {tokenData?.hospital_business_id != config.zydus_business_id && (
                        <Link to="/edit_patient" replace={true} state={{ patient_data: patient_data }}>
                            <Button className='btn btn-primary2 d-flex justify-content-center align-items-center w-100 mt-3 btn-41'>
                                <i className='icon-Edit me-2 fs-21'></i>
                                Edit Profile
                            </Button>
                        </Link>
                    )}
                    {locationPath == '/patient_details' ? '' :
                        <Link to="/patient_details" state={{ patient_data: patient_data }}>
                            <Button className='btn btn-primary2 align-items-center d-flex justify-content-center w-100 mt-3 btn-41'>
                                <i className='icon-Visit-Summary fs-21 me-2'></i>
                                Visit Summary
                            </Button>
                        </Link>
                    }
                </div>
            }
        </>
    )

    const getPatientName = () => {
        if (!patient_data) return "Hello Guest";
        const isTablet = window.innerWidth <= 1024;
        if (isPrescriptionPage && (isMobile || isTablet) && patient_data?.pm_fullname?.length > 10) {
            return `${patient_data?.pm_fullname?.slice(0, 5)}...`;
        }
        return patient_data?.pm_fullname;
    }

    return (
        <Popover
            content={content}
            trigger="click"
            open={open}
            onOpenChange={handleOpenChange}
            className='cursor-pointer'
            overlayClassName="pop-260 pp-20"
        >
            {props.children ? props.children : locationPath == '/patient_details' ? (
                <div className={'align-items-center d-flex h-100'}>
                    <div className='align-items-center d-flex'>
                        <div className='patientName'>{`${getPatientName()},`}</div>
                        <div className='text-2 fontpoppins fontpoppins1 ms-1'>
                            {patient_data !== undefined ? genderAge(patient_data, profile) : `M, 30y`}
                            {(patient_data?.pm_blood_group || patient_data?.patient_blood_group || patients_details?.pm_blood_group) && (
                                <>, {patient_data?.pm_blood_group || patient_data?.patient_blood_group || patients_details?.pm_blood_group}</>
                            )}
                        </div>
                        <i className='icon-right iconrotate270 ms-1'></i>
                    </div>
                </div>
            ) : patient_data ?
                (
                    <div className={'align-items-center d-flex h-100 ps-3'}>
                        <div className='rounded-pill patientProfile border me-3'>{makeDefaultLogo(patient_data?.pm_fullname)}</div>
                        <div>
                            <div className='patientName'>{getPatientName()}
                                <div className='text-2'>
                                    {patient_data !== undefined ? genderAge(patients_details || patient_data, profile) : `M, 30y`}
                                    {(patient_data?.pm_blood_group || patient_data?.patient_blood_group || patients_details?.pm_blood_group) && (
                                        <>, {patient_data?.pm_blood_group || patient_data?.patient_blood_group || patients_details?.pm_blood_group}</>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className='iconrotate270 align-self-start ms-2 mt-1'>
                            <i className='icon-right'></i>
                        </div>
                    </div>
                ) : null}

            <Drawer
                placement="right"
                onClose={(e) => {
                    e?.stopPropagation?.();
                    setZydusBloodGroupDrawerOpen(false);
                }}
                open={zydusBloodGroupDrawerOpen}
                width={500}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: '600' }}>
                        <i
                            className="icon-left"
                            onClick={(e) => {
                                e.stopPropagation();
                                setZydusBloodGroupDrawerOpen(false);
                            }}
                            style={{ cursor: 'pointer', marginRight: '10px' }}
                        ></i>
                        Select Patient's Blood Group
                    </div>
                }
                extra={
                    <Button
                        type="primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSaveBloodGroup();
                        }}
                        loading={loading}
                        disabled={!selectedBloodGroup}
                        style={{
                            backgroundColor: selectedBloodGroup ? '#4B4AD5' : '#A052C0',
                            borderColor: selectedBloodGroup ? '#4B4AD5' : '#A052C0',
                            color: 'white'
                        }}
                    >
                        Save
                    </Button>
                }
                bodyStyle={{ padding: '20px' }}
            >
                <div onClick={(e) => e.stopPropagation()}>
                    <Radio.Group
                        value={selectedBloodGroup}
                        onChange={(e) => setSelectedBloodGroup(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        {bloodGroupOptions.map((option) => (
                            <div key={option.bg_value} style={{ marginBottom: '16px' }}>
                                <Radio
                                    value={option.bg_value}
                                    style={{ width: '100%' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                        {option.bg_value} ({option.bg_title})
                                    </span>
                                </Radio>
                            </div>
                        ))}
                    </Radio.Group>
                </div>

                {bloodGroupOptions.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                        No blood group options available
                    </div>
                )}

                {loading && (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        Loading blood group options...
                    </div>
                )}
            </Drawer>
        </Popover>
    );
}

export default React.memo(ProfilePopover);