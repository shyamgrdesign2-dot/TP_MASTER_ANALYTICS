import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Drawer, Spin } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useFeatureIsOn } from '@growthbook/growthbook-react';
import { viewCaseManager } from '../../../../redux/caseManagerSlice';
import { S_VOICE_RX, GB_SNAP_RX } from '../../../../utils/constants';
import { isChrome, isSafari } from 'react-device-detect';
import {
  getClinic,
  getClinicName,
  trackEvent,
  getVoiceRxMoengageBasePayload,
} from '../../../../utils/utils';
import Cardiology from '../../../../components/Cardiology';
import VisitActionButtons from '../../PatientDetails/components/VisitActionButtons';

import './RxPreviewModal.scss';
import { ASSETS } from "../../../../assets";
const closeIcon = ASSETS.mobile.close2;

function RxPreviewModal({
  visible,
  onClose,
  appointment,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { profile, userId } = useSelector((state) => state.doctors);
  const { loading: caseManagerLoading } = useSelector((state) => state.caseManager);
  const isSnapRxAccessableFromGB = useFeatureIsOn(GB_SNAP_RX);

  const [viewCaseManagerData, setViewCaseManagerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const cardiologyPrintHandlerRef = useRef(null);

  const smartPrescriptionFilename = viewCaseManagerData?.smart_prescription_filename;
  const isSnapRx = smartPrescriptionFilename?.includes('snap_rx');
  const isSmartRxFile = smartPrescriptionFilename?.includes('.jpeg');

  useEffect(() => {
    if (visible && appointment?.tcm_id && appointment?.patient_unique_id) {
      fetchCaseManagerData();
    } else if (!visible) {
      setViewCaseManagerData(null);
    }
  }, [visible, appointment]);

  const fetchCaseManagerData = async () => {
    if (!appointment?.tcm_id || !appointment?.patient_unique_id) return;
    
    setLoading(true);
    try {
      const sendData = {
        patient_unique_id: appointment.patient_unique_id,
        tcm_id: appointment.tcm_id,
      };
      const action = await dispatch(viewCaseManager(sendData));
      if (action.meta.requestStatus === 'fulfilled') {
        setViewCaseManagerData(action.payload);
      }
    } catch (error) {
      console.error('Error fetching case manager data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardiologyPrintHandlersReady = useCallback((handlers) => {
    cardiologyPrintHandlerRef.current = handlers;
  }, []);

  const handleEditRx = async () => {
    if (!viewCaseManagerData?.tcm_id) return;

    if (cardiologyPrintHandlerRef.current?.editRx) {
      cardiologyPrintHandlerRef.current.editRx();
      onClose();
      return;
    }

    // Fallback when Cardiology has not yet exposed editRx (e.g. still loading) – match web/PatientDetails Edit flow
    window.Moengage?.track_event('edit_rx_click', {
      doctor_id: profile?.doctor_unique_id,
      patient_id: appointment?.patient_unique_id || 0,
      rx_date: viewCaseManagerData?.consultation_date,
    });
    const pd = appointment ? { ...appointment, patient_unique_id: appointment.patient_unique_id } : null;
    if (isSnapRx && isSnapRxAccessableFromGB) {
      navigate('/snap-rx', { state: { patient_data: pd, caseManagerData: viewCaseManagerData } });
    } else if (isSmartRxFile) {
      navigate('/smart-prescription', { state: { patient_data: pd, caseManagerData: viewCaseManagerData, smartRxFilesData: [] } });
    } else {
      window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;
      navigate('/prescription', { state: { patient_data: pd, send_path: 'appointment_dashboard', caseManagerData: viewCaseManagerData } });
    }
    onClose();
  };

  const handleDownloadRx = () => {
    if (cardiologyPrintHandlerRef.current?.downloadContent) {
      cardiologyPrintHandlerRef.current.downloadContent();
    }
  };

  const handlePrintRx = () => {
    const currentClinic = getClinic(profile?.hospital_data);
    const currentClinicName = getClinicName(profile?.hospital_data);
    const printChannel = !isChrome && !isSafari ? 'in_app' : 'browser';
    trackEvent('TP_App_PrintRx', {
      ...getVoiceRxMoengageBasePayload({
        profile,
        userId,
        patientData: appointment,
        clinic: currentClinic,
        segmentation: {
          surface: 'mobile_appointment_rx_preview',
          entry_point: 'print_button',
        },
      }),
      patient_contact: appointment?.pm_contact_no || '',
      patient_id: appointment?.patient_unique_id || '',
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name: currentClinicName,
      PRINTPAGE: 'finished queue',
      rx_id: viewCaseManagerData?.tcm_id || appointment?.tcm_id || '',
      rx_type: 'standard',
      print_channel: printChannel,
    });

    if (cardiologyPrintHandlerRef.current?.printContent) {
      cardiologyPrintHandlerRef.current.printContent();
    }
  };

  const handlePrintMedicinesOnly = () => {
    if (cardiologyPrintHandlerRef.current?.printRxContent) {
      cardiologyPrintHandlerRef.current.printRxContent();
    }
  };

  const handleRepeatRx = () => {
    if (!viewCaseManagerData || !appointment) return;
    
    window.Moengage?.track_event('repeat_rx_click', {
      doctor_id: profile?.doctor_unique_id,
      patient_id: appointment?.patient_unique_id || 0,
      rx_date: viewCaseManagerData?.consultation_date,
    });

    window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;

    navigate('/prescription', {
      state: {
        patient_data: appointment,
        send_path: 'appointment_dashboard',
        caseManagerData: {
          ...viewCaseManagerData,
          tcm_id: 0,
          consultation_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        },
      },
    });
    onClose();
  };

  const patient_data = appointment ? {
    ...appointment,
    patient_unique_id: appointment.patient_unique_id,
  } : null;

  const tcmData = viewCaseManagerData ? {
    tcm_id: viewCaseManagerData.tcm_id,
    page: 1,
  } : { tcm_id: 0, page: 1 };

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="90vh"
      className="rx-preview-modal"
      closable={false}
      maskClosable={true}
      maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="rx-preview-modal-content">
        <div className="rx-preview-modal-header">
          <h3 className="rx-preview-modal-title">Rx Preview</h3>
          <button className="rx-preview-modal-close" onClick={onClose} type="button">
            <img src={closeIcon} alt="Close" className="rx-preview-close-icon" />
          </button>
        </div>

        <div className="rx-preview-modal-body">
          {loading || caseManagerLoading ? (
            <div className="rx-preview-loading">
              <Spin size="large" />
            </div>
          ) : viewCaseManagerData && patient_data ? (
            <>
              <div className="rx-preview-content">
                <Cardiology
                  patient_data={patient_data}
                  tcmData={tcmData}
                  loading={loading || caseManagerLoading}
                  viewCaseManagerData={viewCaseManagerData}
                  nextPress={() => {}}
                  prevPress={() => {}}
                  onPrintHandlersReady={handleCardiologyPrintHandlersReady}
                />
              </div>

              {viewCaseManagerData && (
                <VisitActionButtons
                  onEdit={handleEditRx}
                  onDownload={handleDownloadRx}
                  onPrint={handlePrintRx}
                  onRepeatRx={handleRepeatRx}
                  onPrintMedicinesOnly={handlePrintMedicinesOnly}
                  showEdit={viewCaseManagerData?.doctor_data?.editCase}
                  currentPage={1}
                  totalPages={viewCaseManagerData?.total_consultation || 1}
                  viewCaseManagerData={viewCaseManagerData}
                  hidePageNumber={true}
                  skipPrintModal={true}
                />
              )}
            </>
          ) : (
            <div className="rx-preview-empty">
              <p>No prescription data available</p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default RxPreviewModal;

