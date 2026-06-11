import React, { useEffect, useState } from 'react';
import { Navbar } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { useSelector, useDispatch } from "react-redux";

import { errorMessage, makeDefaultLogo, stopAllActiveRecorders } from "../utils/utils";
import { GB_CVT_EXT_HOS, LANGUAGE_LIST } from "../utils/constants";
import {
    sendCashsheetWhatsapp,
} from "../redux/caseManagerSlice";
import { resetVaccineState } from '../redux/vaccineSlice';
import { resetGrowthChartState } from '../redux/growthChartSlice';
import { resetObstetricState } from '../redux/obstetricSlice';
import { syncDigitizationStatus, updateVisitStatus } from '../api/services/VisitService';
import { resetUploadDocState } from '../redux/uploadDocSlice';
import { resetDDxState } from '../redux/ddxSlice';
import { CLINIC_TARGET_STATUS, NEO_NATOLOGISTS_DP_ID } from '../utils/constants';
import { useChikitsalay } from '../pages/chikitsalay/useChikitsalay';
import { clinicTargetStatus } from '../pages/chikitsalay/service';
import { useFeatureIsOn } from "@growthbook/growthbook-react";

function HeaderPrescriptionPrint({ patient_data, tcm_id, printUrl, handleGoToAppointment, pam_id, isSnapRx, selectedLang, isVoiceOrAmbientFlow }) {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { profile } = useSelector((state) => state.doctors);
    const {
        loadingEndVisit,
    } = useSelector((state) => state.caseManager);
    const dispatch = useDispatch();
    const urlParams = new URLSearchParams(window.location.search);
    const isReceptionist = urlParams.has("receptionist");
    const isChikitsalayAccessable = useChikitsalay();

    const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);

    const onEndVisitClick = async () => {
        if (isVoiceOrAmbientFlow) {
            stopAllActiveRecorders();
        }
        
        if (handleGoToAppointment) {
            handleGoToAppointment();
        } else {
            var sendData = {
              patient_unique_id:
                patient_data !== undefined ? patient_data.patient_unique_id : 0,
              pm_pid: patient_data !== undefined ? patient_data.pm_pid : 0,
              tcm_id: tcm_id,
              lg: selectedLang !== undefined && selectedLang !== "English" ? btoa(selectedLang.toString()) : '',
            };

            if (!isChikitsalayAccessable) {
            const action = await dispatch(sendCashsheetWhatsapp(sendData));
            } else if (isChikitsalayAccessable) {
                clinicTargetStatus(pam_id, {
                    targetStatus: CLINIC_TARGET_STATUS.COMPLETED,
                });
            }
            if (pam_id || tcm_id) {
              let sanitizedPrintUrl = printUrl;
              try {
                const urlObj = new URL(printUrl, window.location.origin);
                urlObj.searchParams.delete("rxDigitize");
                sanitizedPrintUrl = urlObj.toString();
              } catch (error) {
                sanitizedPrintUrl = printUrl;
              }
              updateVisitStatus({
                status: 3,
                isSnapRx,
                appointment_id: pam_id,
                prescriptionUrl: sanitizedPrintUrl,
                tcm_id: tcm_id,
              });
              if (state?.page === "digitise") {
                const urlObj = new URL(printUrl);
                const isRxdigitised = urlObj.searchParams.get("rxDigitize");
                if (isRxdigitised !== "true") {
                    urlObj.searchParams.set("rxDigitize", "true");
                }
                syncDigitizationStatus({
                  appointment_id: pam_id,
                  tcm_id: tcm_id,
                  is_digitized: true,
                  digitized_prescription_url: urlObj?.toString(),
                });
              }
            }
            // if (action.meta.requestStatus === "fulfilled") {
              dispatch(resetVaccineState());
              dispatch(resetGrowthChartState());
              dispatch(resetObstetricState());
              dispatch(resetUploadDocState());
              dispatch(resetDDxState());
              navigate("/", { replace: true });
            // } else {
            //   errorMessage(action.error);
            // }
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
            <div className='align-items-center d-flex w-100 justify-content-between'>
                <div>
                    <div className={'align-items-center d-flex h-100 ps-3'}>
                        <div className='rounded-pill patientProfile border me-3'>{makeDefaultLogo(patient_data?.pm_fullname)}</div>
                        <div>
                            <div className='patientName'>{`${patient_data !== undefined ? patient_data.pm_fullname : "Hello Guest"}`}<div className='text-2'>{patient_data !== undefined ? genderAge(patient_data) : `M, 30y`}</div></div>
                        </div>
                    </div>
                </div>
                {!isReceptionist && <Button onClick={onEndVisitClick}
                    loading={loadingEndVisit}
                    className={`btn align-items-center d-flex btn-41 me-3 px-4 btn-primary3`}>
                    Go to Appointment
                </Button>}
            </div>
        </Navbar>
    );
}

export default React.memo(HeaderPrescriptionPrint);