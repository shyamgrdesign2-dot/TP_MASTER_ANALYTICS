import React, { useEffect, useState, useCallback } from 'react';
import Nav from 'react-bootstrap/Nav';
import { Button, Popover } from 'antd';
import { isMobile } from 'react-device-detect';
import { Link } from 'react-router-dom';

import { useSelector } from "react-redux";

import { getClinicName, makeDefaultLogo } from "../utils/utils";
import { getDecodedToken } from '../utils/localStorage';
import config from '../config';
import { useOpdBilling } from '../pages/opdBilling/useOpdBilling';
import { setShouldShowOpdBilling } from '../redux/billingSlice';
import { checkToShowOpdBilling } from '../pages/opdBilling/service';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import {
    GB_CVT_EXT_HOS,
    GB_HEALTH_CHECKUP_REPORT,
    NEO_NATOLOGISTS_DP_ID,
    PAEDIATRIC_DP_ID,
    PATIENT_DETAILS_SIDEBAR_KEYS,
} from "../utils/constants";

import AbhaDrawer from '../components/abha/AbhaDrawer';
import { getAbhaDomainSuffix } from '../components/abha/helpers';
import { handleAdmitToIpd } from '../utils/utils';
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_NEW_IPD, GB_NEW_IPD_HOS_BUSINESS_ID } from "../utils/constants";
import { ASSETS } from "../assets";
const {
  blood: BloodIcon,
  abhaSvg: AbhaIcon,
  leftArrow: LeftArrow,
  bedWithH: HospitalBedIcon,
  healthCheckupReportPrimary: HealthCheckupReportIcon,
  healthCheckupReportSecondary: HealthCheckupReportIconSecondary,
} = ASSETS.images;

function SidebarPatient({
    collapsed,
    patient_data,
    viewCaseManagerData,
    sidebarKey,
    onClickSidebarHandle,
    abhaConsentsCount,
    patientAdmissionStatus,
    isCheckingAdmission
}) {
    const dispatch = useDispatch();
    const { profile } = useSelector((state) => state.doctors);
    const { patients_details } = useSelector((state) => state.records);
    const [tokenData, setTokenData] = useState(null);
    const { allUploadedDocs } = useSelector(
        (state) => state.uploadDoc
    );
    const { isOpdBillChecked } = useSelector((state) => state.billing);
    const { isOpdBillingAccessable } = useOpdBilling();
    const [abhaDrawerOpen, setAbhaDrawerOpen] = useState(false);
    const isNewIPDAccessableFromGB = useFeatureIsOn(GB_NEW_IPD);
    const isNewIPDHosBusinessIdAccessableFromGB = useFeatureIsOn(
        GB_NEW_IPD_HOS_BUSINESS_ID
    );
    const isIPDAccessible = isNewIPDAccessableFromGB || isNewIPDHosBusinessIdAccessableFromGB;
    const isAdmitted = patientAdmissionStatus?.alreadyAdmitted === true;
    const isHealthCheckupReportAccessableFromGB = useFeatureIsOn(GB_HEALTH_CHECKUP_REPORT);
    const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
    const isPaediatric = profile?.dp_id === PAEDIATRIC_DP_ID;
    const menu = [
        {
            key: PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY,
            icon_name: "icon-Visit-Summary-Fill",
            short_title: "Visit",
            long_title: "Visit Summary",
        },
        {
            key: PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_CERTIFICATE,
            icon_name: "icon-Medical-Certificate",
            short_title: "Certificate",
            long_title: "Certificate",
        },
        {
            key: PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_RECORDS,
            icon_name: "icon-Report",
            short_title: "Records",
            long_title: `Medical Records ${allUploadedDocs?.length > 0 ? `(${allUploadedDocs?.length})` : ""}`,
        },
        isOpdBillingAccessable ? {
            key: PATIENT_DETAILS_SIDEBAR_KEYS.BILL_PAYMENT,
            icon_name: 'icon-Visit-Summary-Fill',
            short_title: 'Add Bill',
            long_title: 'Add Bill/Payment'
        } : undefined,
        (patient_data?.abhaAddress && profile?.HipID && profile?.abhaEnable) ? {
            key: PATIENT_DETAILS_SIDEBAR_KEYS.ABHA_RECORDS,
            icon_image: AbhaIcon,
            short_title: "ABHA",
            long_title: `ABHA Records ${typeof abhaConsentsCount === "number" && abhaConsentsCount >= 0
                    ? `(${abhaConsentsCount})`
                    : ""
                }`.trim(),
        } : undefined,
        isHealthCheckupReportAccessableFromGB && {
            key: PATIENT_DETAILS_SIDEBAR_KEYS.HEALTH_CHECKUP_REPORT,
            icon_image: sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.HEALTH_CHECKUP_REPORT ? HealthCheckupReportIcon : HealthCheckupReportIconSecondary,
            short_title: "Health Checkup",
            long_title: "Health Checkup Report",
        },
        // { icon_name: 'icon-Discharge-Summary', short_title: 'Discharge', long_title: 'Discharge Summary' },
        // { icon_name: 'icon-Medical-Certificate', short_title: 'Certificate', long_title: 'Medical Certificate' },
        // { icon_name: 'icon-billings', short_title: 'Add Bill', long_title: 'Add Bill/Payment' },
        // { icon_name: 'icon-More', short_title: '', long_title: 'More Options' }
    ]?.filter((item) => {
        if (!item) return false;
        if (isCvtExtHosAccessableFromGB) {
            return item.key === PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY;
        }
        return true;
    });

    let patientDOB = ''

    if (patient_data?.pm_dob) {
        patientDOB = moment(patient_data.pm_dob).format("DD-MM-YYYY");
    } else if (patient_data?.DOB) {
        patientDOB = moment(patient_data.DOB, "Do MMMM YYYY").format("DD-MM-YYYY");
    }

    useEffect(() => {
        const decodedToken = getDecodedToken();
        const decoded = decodedToken?.result;
        setTokenData(decoded)
    }, []);

    useEffect(() => {
        if (!isOpdBillChecked) {
            getShowOpdBilling();
        }
    }, []);

    const getShowOpdBilling = async () => {
        const res = await checkToShowOpdBilling();
        dispatch(setShouldShowOpdBilling(res));
    };

    const handleAbhaDrawer = useCallback(() => {
        setAbhaDrawerOpen(!abhaDrawerOpen);
    }, [abhaDrawerOpen]);

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
                                : (patient_data !== undefined ? patient_data.pm_pid : "000000")}
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
            <div className="align-items-center d-flex medicine-templates border-top-0 without-hover p-0 pb-3">
                <div className="round-box bg-body-secondary"><i className="icon-phone fs-21"></i></div>
                <div className="text-truncate">
                    <div className="fontroboto letterspacing">Mobile Number</div>
                    <div className="fontroboto letterspacing fw-medium">{patient_data !== undefined ? patient_data.pm_contact_no : "000000"}</div>
                </div>
            </div>
            {patient_data?.abhaAddress && (
                <div className="align-items-center d-flex medicine-templates border-top-0 without-hover p-0 pb-3">
                    <div className="round-box bg-body-secondary"><img src={AbhaIcon} /></div>
                    <div className="text-truncate">
                        <div className="fontroboto letterspacing">ABHA Address</div>
                        <div className="fontroboto letterspacing fw-medium">{patient_data?.abhaAddress}</div>
                    </div>
                </div>
            )}
            {tokenData?.hospital_business_id != config.zydus_business_id && (patient_data?.pm_blood_group || patient_data?.patient_blood_group || viewCaseManagerData?.patient_data?.patient_blood_group || patients_details?.pm_blood_group) && (
                <div className="align-items-center d-flex medicine-templates border-top-0 without-hover p-0">
                    <div className="round-box bg-body-secondary"><img src={BloodIcon} alt="blood" style={{ width: '21px', height: '21px' }} /></div>
                    <div className="text-truncate">
                        <div className="fontroboto letterspacing">Blood Group</div>
                        <div className="fontroboto letterspacing fw-medium">{patient_data?.pm_blood_group || patient_data?.patient_blood_group || viewCaseManagerData?.patient_data?.patient_blood_group || patients_details?.pm_blood_group}</div>
                    </div>
                </div>
            )}
            <div>
                {tokenData?.hospital_business_id != config.zydus_business_id &&
                    !isCvtExtHosAccessableFromGB && (
                    <Link to="/edit_patient" replace={true} state={{ patient_data: patient_data }}>
                        <Button className='btn btn-primary2 d-flex justify-content-center align-items-center w-100 mt-3 btn-41'
                            onClick={() => {
                                const clinic_name = getClinicName(profile?.hospital_data);
                                window.Moengage.track_event("TP_patient_details_updated", {
                                    clinic_name,
                                    "patient_number": patient_data?.pm_contact_no,
                                    "patient_id": patient_data?.patient_unique_id
                                });
                            }}
                        >
                            <i className='icon-Edit me-2 fs-21'></i>
                            Edit Profile
                        </Button>
                    </Link>
                )}
            </div>
        </>
    )

    const genderAge = (patient_data) => {
        var value = patient_data?.pm_gender && patient_data.pm_gender.length > 0
            ? `${patient_data.pm_gender[0].toUpperCase()}, `
            : "";
        if (profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) {
            if (patient_data?.ageYears != 0) {
                value += `${patient_data?.ageYears}y`
            }
            if (patient_data?.ageMonths != 0) {
                value += ` ${patient_data?.ageMonths}m`
            }
            if (patient_data?.ageDays != 0) {
                value += ` ${patient_data?.ageDays}d`
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
        return value
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: '0 0 auto' }}>
                <Popover
                    content={!isMobile ? content : null}
                    trigger="click"
                    className='cursor-pointer'
                    overlayClassName="pop-260 pp-20"
                >
                    <div className={`d-flex align-items-center rounded-3 m-2 text-truncate ${collapsed ? '' : 'bg-body p-2'}`}>
                        <div className={`rounded-pill patientProfile border ${collapsed ? 'mx-auto' : 'me-2'}`}>
                            {makeDefaultLogo(patient_data?.pm_fullname)}
                        </div>
                        {!collapsed && (
                            <div className='text-truncate'>
                                <div className='patientName d-flex align-items-center'> <div className='text-truncate pt-2px'>{`${patient_data !== undefined ? patient_data.pm_fullname : "Hello Guest"}`}</div>
                                    <button className='btn p-0 ms-2 iconrotate270'><i className='icon-right'></i></button>
                                </div>
                                <p className='mb-0'>{patient_data !== undefined ? genderAge(patient_data) : `M, 30y`} {isPaediatric && patientDOB ? `(${patientDOB})` : ''}</p>
                            </div>
                        )}
                    </div>
                </Popover>
                <hr />
                {menu.map((item, index) => {
                    return (
                        <div key={index}>
                            <Nav.Item className={collapsed && 'text-center'}>
                                <Nav.Link className={`${item.key == sidebarKey && 'active'} ${!collapsed && 'd-flex align-items-center'}`} onClick={() => onClickSidebarHandle(item?.key)}>
                                    {item.icon_image ? (
                                        <img src={item.icon_image} alt={item.long_title} style={{ width: '21px', height: '21px' }} />
                                    ) : (
                                        <i className={item.icon_name}></i>
                                    )}
                                    <div className={collapsed ? 'text-truncate' : 'ms-3'}>{collapsed ? item.short_title : item.long_title}</div>
                                </Nav.Link>
                            </Nav.Item>
                            {/* {index == menu.length - 2 && <hr className='my-1' />} */}
                        </div>
                    )
                })}
                {(!patient_data?.abhaAddress && profile?.HipID && profile?.abhaEnable)
                    ? (
                        <div>
                            <Nav.Item className={`${collapsed && 'text-center'} sidebar_abha_link_container`}>
                                <Nav.Link
                                    className={`${!collapsed && 'd-flex align-items-center p-0'} sidebar-abha-link`}
                                    onClick={handleAbhaDrawer}
                                >
                                    <div className="sidebar-icon-wrapper">
                                        <img src={AbhaIcon} className="sidebar-abha-icon" alt="abha" />
                                    </div>
                                    <div className='sidebar_abha_text_container'>
                                        {collapsed ? (
                                            <div className="sidebar_abha_text_collapsed">
                                                <div className="sidebar_abha_text_line">Create/Link</div>
                                                <div className="sidebar_abha_text_line">ABHA</div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className={`sidebar_abha_text ms-3`}>
                                                    Create/Link ABHA
                                                </div>
                                                <img src={LeftArrow} width={6} />
                                            </>
                                        )}
                                    </div>
                                </Nav.Link>
                            </Nav.Item>
                        </div>
                    )
                    : <></> // TODO: Show ABHA details if already linked
                }
            </div>
            {tokenData?.hospital_business_id != config.zydus_business_id &&
                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginBottom: "2rem" }}>
                    {isIPDAccessible && !isAdmitted && !isCheckingAdmission && (
                        <div className="p-3">
                            <div
                                onClick={() => handleAdmitToIpd(patient_data)}
                                style={{
                                    border: '2px dashed #4B4AD5',
                                    borderRadius: '8px',
                                    padding: "8px",
                                    cursor: 'pointer',
                                    textAlign: collapsed ? 'center' : 'left',
                                    backgroundColor: '#ffffff',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                <div className="d-flex flex-column align-items-center justify-content-center">
                                    <div className="position-relative mb-1 fw-medium">
                                        <img src={HospitalBedIcon} className='pe-2' height={25} />
                                        <span className='main-color'>Adm IPD</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            }
            {abhaDrawerOpen && (
                <AbhaDrawer
                    onClose={handleAbhaDrawer}
                    open={abhaDrawerOpen}
                    patientUniqueId={patient_data?.patient_unique_id}
                />
            )}
        </div>
    )
}
export default React.memo(SidebarPatient)