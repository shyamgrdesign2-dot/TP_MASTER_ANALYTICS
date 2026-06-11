import React, { useContext } from 'react';
import { Navbar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { useSelector } from "react-redux";
import moment from 'moment';

import { makeDefaultLogo } from "../utils/utils";
import { NEO_NATOLOGISTS_DP_ID, PATIENT_DETAILS_SIDEBAR_KEYS } from '../utils/constants';

function HeaderPrescriptionPrint({ state }) {
    const navigate = useNavigate();

    const { profile } = useSelector((state) => state.doctors);

    const { patient_data, viewable, fromPath } = state || {};

    const handleBack = () => {
        if (fromPath) {
            navigate(fromPath, { 
                state: { 
                    patient_data,
                    sidebarKey: fromPath.includes('patient_details') ? PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_CERTIFICATE : undefined
                } 
            });
        } else {
            navigate(-1);
        }
    };

    const genderAge = (patient_data) => {
        var value = `${patient_data?.pm_gender[0].toUpperCase()}, `
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
        <Navbar className="justify-content-between headerprescription p-0">
            <div className='align-items-center d-flex w-100 h-100 justify-content-between'>
                <div className={'align-items-center d-flex h-100'}>
                    {viewable !== undefined ? (
                        <div className='border-end h-100 me-3 text-center'>
                            <div onClick={handleBack} className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                                <i className='icon-right'></i>
                            </div>
                        </div>
                    ) : (
                        <div className='rounded-pill patientProfile border mx-3'>{viewable !== undefined ? makeDefaultLogo(state?.tcu_title) : makeDefaultLogo(patient_data?.pm_fullname)}</div>
                    )}
                    <div>
                        {viewable !== undefined ? (
                            <div className='patientName'>{state?.tcu_title}<div className='text-2'>{moment(state?.tcu_created_date).format('DD MMM, YYYY LT')}</div></div>
                        ) : (
                            <div className='patientName'>{`${patient_data !== undefined ? patient_data.pm_fullname : "Hello Guest"}`}<div className='text-2'>{patient_data !== undefined ? genderAge(patient_data) : `M, 30y`}</div></div>
                        )}
                    </div>
                </div>
                <Button
                    className='btn align-items-center d-flex btn-41 btn-primary3 me-3 px-4'
                    onClick={handleBack}>
                    {viewable !== undefined ? 'Close' : 'Done'}
                </Button>
            </div>
        </Navbar>
    );
}

export default React.memo(HeaderPrescriptionPrint);