import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Spin, Drawer, Button } from 'antd';
import moment from 'moment';

import { useDeviceType } from '../../../utils/deviceDetection';
import { viewCaseManager } from '../../../redux/caseManagerSlice';
import { getProfile } from '../../../redux/doctorsSlice';
import { setAllUploadedDocs, setPatientUploadedDocs } from '../../../redux/uploadDocSlice';
import { fetchAllPatientDocs, fetchDocsUploadedByPatient } from '../../medicalRecords/service';
import { mergeDocuments } from '../../medicalRecords/utils/helper';
import { fetchPrintSetting } from '../../opdBilling/service';
import { setBillPrintSettings } from '../../../redux/billingSlice';
import { useVoiceRxNavigation } from '../../../utils/voiceRxNavigation';
import {
  getClinicName,
  getClinic,
  errorMessage,
  sendMessageToParent,
  trackEvent,
  getVoiceRxMoengageBasePayload,
  isValidMongoId,
} from '../../../utils/utils';
import { PATIENT_DETAILS_SIDEBAR_KEYS, GB_SNAP_RX, GB_ISCRIBE, S_AMBIENT_VOICE_RX, S_VOICE_RX } from '../../../utils/constants';
import { EVENTS } from '../../../utils/events';
import { useAccess } from '../../vaccination/useAccess';
import { useOpdBilling } from '../../opdBilling/useOpdBilling';
import { isChrome, isSafari, isMobile } from 'react-device-detect';
import { useFeatureIsOn } from '@growthbook/growthbook-react';

// Components
import DetailsHeader from './components/DetailsHeader';
import PatientTabs from './components/PatientTabs';

import VisitDateSelector from './components/VisitDateSelector';
import VisitSummaryTab from './components/VisitSummaryTab';
import PatientHistoryTab from './components/PatientHistoryTab';
import CertificateTab from './components/CertificateTab';
import MedicalRecordsTab from './components/MedicalRecordsTab';
import BillingTab from './components/BillingTab';
import PatientDetailsOptionsModal from './components/PatientDetailsOptionsModal';
import EmptyState from '../AppointmentDashboard/components/EmptyState';

// Shared components
import VitalsBodyComposition from '../../../components/VitalsBodyComposition';
import MedicalHistory from '../../../components/MedicalHistory';
import VisitVaccination from '../../vaccination/components/visitVaccination/VisitVaccination';
import VisitGrowthChart from '../../growthChart/components/visitGrowthChart/VisitGrowthChart';
import VisitObstetric from '../../obstetric/components/visitObstetric/VisitObstetric';
import VisitLabParameters from '../../../components/VisitLabParameters';
import CarePlanBox from '../../../components/CarePlanBox';
import Cardiology from '../../../components/Cardiology';
import CertificateDetails from '../../../components/medical_certificate/CertificateDetails';
import VisitMedicalRecords from '../../medicalRecords/components/visitMedicalRecords/VisitMedicalRecords';
import UploadDocPopup from '../../medicalRecords/components/uploadDocPopup/UploadDocPopup';
import CommonModal from '../../../common/CommonModal';
import UploadDocument from '../../medicalRecords/UploadDocument';
import MobileUploadMedicalRecord from './components/MobileUploadMedicalRecord';

import './PatientDetails.scss';
import { ASSETS } from "../../../assets";
const {
  pastVisitTabIcon: PastVisitTabIcon,
  patientHistoryTabIcon: PatientHistoryTabIcon,
  certificatTabIcon: CertificateTabIcon,
  medicalRecordsTabIcon: MedicalRecordsTabIcon,
} = ASSETS.mobile;
const alertIcon = ASSETS.images.alerticon;

function PatientDetails() {
  const navigate = useNavigate();
  const navigateVoiceRx = useVoiceRxNavigation();
  const dispatch = useDispatch();
  const location = useLocation();
  const { isMobile, isPWA } = useDeviceType();
  const scrollContainerRef = useRef(null);
  const cardiologyPrintHandlerRef = useRef(null);

  const { state } = useLocation();
  const { patient_data, sidebarKey: initialSidebarKey } = state || {};

  const { profile, userId, loading: profileLoading } = useSelector((state) => state.doctors);
  const { isLoading } = useSelector((state) => state.uploadDoc);
  const {
    viewCaseManagerData,
    loading,
  } = useSelector((state) => state.caseManager);
  const { allUploadedDocs } = useSelector((state) => state.uploadDoc);
  const { billPrintSettings } = useSelector((state) => state.billing);
  const { isOpdBillingAccessable } = useOpdBilling();
  const { isVaccinationAccessable, isGrowthChartAccessable } = useAccess(
    patient_data?.ageYears
  );

  // Determine Rx type for Edit handler
  const smartPrescriptionFilename = viewCaseManagerData?.smart_prescription_filename;
  const isSnapRx = smartPrescriptionFilename?.includes('snap_rx');
  const isSnapRxAccessableFromGB = useFeatureIsOn(GB_SNAP_RX);
  const isSmartRxFile = smartPrescriptionFilename?.includes('.jpeg');

  const [selectedTab, setSelectedTab] = useState(
    initialSidebarKey || PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY
  );
  const [tcmData, setTcmData] = useState({ tcm_id: 0, page: 1 });
  const [filesData, setFilesData] = useState([]);
  const [shouldShowUploadDocPopup, setShowUploadDocPopup] = useState(false);
  const [isFileSizeError, setIsFileSizeError] = useState(false);
  const [isFileLimitError, setIsFileLimitError] = useState(false);
  const [isFileTypeError, setIsFileTypeError] = useState(null);
  const [uploadDocDrawer, setUploadDocDrawer] = useState(false);
  const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
  const [isEditDocument, setIsEditDocument] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Ensure profile is loaded - dispatch getProfile if missing
  useEffect(() => {
    if (!profile && !profileLoading) {
      dispatch(getProfile());
    }
  }, [dispatch, profile, profileLoading]);

  // Use useMemo to recalculate clinic/clinicName when profile changes
  // This ensures values update when profile loads (critical on real mobile devices)
  const clinic = useMemo(() => getClinic(profile?.hospital_data), [profile?.hospital_data]);
  const clinicName = useMemo(() => getClinicName(profile?.hospital_data), [profile?.hospital_data]);

  // Track initial page load analytics (only once per patient, not on every tcmData change)
  const hasTrackedLanding = useRef(false);
  const lastTrackedPatientId = useRef(null);
  
  useEffect(() => {
    // Reset tracking when patient changes
    if (patient_data?.patient_unique_id !== lastTrackedPatientId.current) {
      hasTrackedLanding.current = false;
      lastTrackedPatientId.current = patient_data?.patient_unique_id;
    }
    
    if (!patient_data?.patient_unique_id || hasTrackedLanding.current) return;
    
    // Track landing event only on initial mount or patient change (when tcm_id is 0)
    if (clinicName && tcmData.tcm_id === 0) {
      trackEvent("TP_App_Patient_detail_landing", {
        ...getVoiceRxMoengageBasePayload({
          profile,
          userId,
          patientData: patient_data,
          clinic,
          segmentation: {
            surface: "mobile_patient_details",
            entry_point: "landing",
          },
        }),
        clinic_name: clinicName,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id,
        patient_contact: patient_data?.pm_contact_no || "",
        doctor_speciality: profile?.dp_name,
        doctor_unique_id: profile?.doctor_unique_id,
        tcm_id: tcmData?.tcm_id ?? 0,
      });
      hasTrackedLanding.current = true;
    }
  }, [
    patient_data?.patient_unique_id,
    patient_data?.pm_contact_no,
    clinicName,
    tcmData.tcm_id,
    profile,
    userId,
    clinic,
  ]);

  // Fetch case manager data (separated from analytics to avoid unnecessary re-fetches)
  useEffect(() => {
    if (!patient_data?.patient_unique_id) return;

    const sendData = {
      patient_unique_id: patient_data.patient_unique_id,
      tcm_id: tcmData.tcm_id,
    };
    dispatch(viewCaseManager(sendData));
  }, [tcmData, patient_data?.patient_unique_id, dispatch]);

  // Fetch patient documents - memoize function to avoid stale closures
  const getAllPatientDocs = useCallback(async () => {
    if (!patient_data?.patient_unique_id) return;
    const doctorUploadedDocs = await fetchAllPatientDocs(patient_data.patient_unique_id);
    const patientUploadedDocs = await fetchDocsUploadedByPatient(
      patient_data.patient_unique_id
    );
    dispatch(setPatientUploadedDocs(patientUploadedDocs));
    dispatch(
      setAllUploadedDocs(
        mergeDocuments(doctorUploadedDocs, patientUploadedDocs)
      )
    );
  }, [patient_data?.patient_unique_id, dispatch]);

  // Fetch patient documents - fixed dependencies
  useEffect(() => {
    if (patient_data?.patient_unique_id && allUploadedDocs.length === 0) {
      getAllPatientDocs();
    }
  }, [patient_data?.patient_unique_id, allUploadedDocs.length, getAllPatientDocs]);

  // Fetch billing print settings
  useEffect(() => {
    if (billPrintSettings && Object.keys(billPrintSettings).length === 0) {
      getBillPrintSettings();
    }
  }, []);

  const getBillPrintSettings = async () => {
    const printSettingsResponse = await fetchPrintSetting();
    if (printSettingsResponse) {
      dispatch(setBillPrintSettings(printSettingsResponse));
    }
  };

  // Memoize navigation callbacks to prevent unnecessary child re-renders
  const nextPress = useCallback(() => {
    trackEvent("TP_App_Patient_detail_prev", {
      ...getVoiceRxMoengageBasePayload({
        profile,
        userId,
        patientData: patient_data,
        clinic,
        segmentation: {
          surface: "mobile_patient_details",
          entry_point: "visit_navigate_prev",
        },
      }),
      doctor_id: profile?.doctor_unique_id,
      patient_id: patient_data?.patient_unique_id || 0,
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name: clinicName,
      patient_contact: patient_data?.pm_contact_no || "",
      tcm_id_from: viewCaseManagerData?.tcm_id,
      tcm_id_to: viewCaseManagerData?.next_tcm_id,
    });
    setTcmData((prevTcmData) => ({ 
      tcm_id: viewCaseManagerData?.next_tcm_id, 
      page: prevTcmData.page - 1 
    }));
  }, [
    profile,
    userId,
    patient_data,
    clinic,
    clinicName,
    viewCaseManagerData?.tcm_id,
    viewCaseManagerData?.next_tcm_id,
  ]);

  const prevPress = useCallback(() => {
    trackEvent("TP_App_Patient_detail_next", {
      ...getVoiceRxMoengageBasePayload({
        profile,
        userId,
        patientData: patient_data,
        clinic,
        segmentation: {
          surface: "mobile_patient_details",
          entry_point: "visit_navigate_next",
        },
      }),
      doctor_id: profile?.doctor_unique_id,
      patient_id: patient_data?.patient_unique_id || 0,
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name: clinicName,
      patient_contact: patient_data?.pm_contact_no || "",
      tcm_id_from: viewCaseManagerData?.tcm_id,
      tcm_id_to: viewCaseManagerData?.prev_tcm_id,
    });
    setTcmData((prevTcmData) => ({ 
      tcm_id: viewCaseManagerData?.prev_tcm_id, 
      page: prevTcmData.page + 1 
    }));
  }, [
    profile,
    userId,
    patient_data,
    clinic,
    clinicName,
    viewCaseManagerData?.tcm_id,
    viewCaseManagerData?.prev_tcm_id,
  ]);

  const handleTabChange = useCallback((tabKey) => {
    setSelectedTab(tabKey);
  }, []);

  // MOBILE OPTIMIZATION: Memoize onSectionClick callback to prevent PatientHistoryTab re-renders
  const handleHistorySectionClick = useCallback((sectionId) => {
    // Section click is handled internally by PatientHistoryTab accordion
    // This callback can be used for analytics or future navigation if needed
  }, []);

  // MOBILE OPTIMIZATION: Memoize handler to prevent MedicalRecordsTab re-renders
  const handleUploadDocPopup = useCallback(() => {
    setShowUploadDocPopup((prev) => !prev);
  }, []);

  const handleRetryBtn = () => {
    setFilesData([]);
    setIsFileSizeError(false);
    setIsFileLimitError(false);
    setIsFileTypeError(null);
  };

  const handleDeletePopup = () => {
    setShowDeletePopup(true);
  };

  // MOBILE OPTIMIZATION: Memoize handler to prevent MedicalRecordsTab re-renders
  const handleDrawerUploadDoc = useCallback(() => {
    setUploadDocDrawer((prev) => !prev);
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleEditProfile = () => {
    navigate('/edit_patient', {
      replace: true,
      state: { patient_data: patient_data },
    });
  };

  const handleOpenOptionsModal = () => {
    setShowOptionsModal(true);
  };

  const handleCloseOptionsModal = () => {
    setShowOptionsModal(false);
  };

  const handleStartWalkInConsultation = () => {
    // From patient details, return to the correct VoiceRx entry point for this flag state.
    navigateVoiceRx(
      {
        patient_data: patient_data,
        isFromTabView: true,
        from: 'patient_details_walk_in',
      },
      {},
      "mobile_patient_details_walk_in"
    );
  };

  const handleEditPatient = () => {
    navigate('/edit_patient', {
      replace: true,
      state: { patient_data: patient_data },
    });
  };

  const handleBookAppointment = () => {
    navigate('/add_appointment', {
      state: { 
        patient_data: patient_data,
        from: '/patient_details'
      },
    });
  };

  const handleVoiceRxClick = useCallback(() => {
    if (profile && window.Moengage && clinic) {
      window.Moengage.track_event("TP_AV_Entry", {
        patient_id: patient_data?.patient_unique_id || patient_data?.pm_pid || "",
        patient_name: patient_data?.pm_fullname || "",
        patient_mobile_number: patient_data?.pm_contact_no || "",
        doctor_id: profile?.doctor_unique_id,
        doctor_name: profile?.um_name,
        doctor_specialty: profile?.dp_name,
        doctor_mobile_number: profile?.um_contact,
        hm_id: clinic?.hm_id,
        clinic_name: clinic?.hm_name,
        source: "Patient Details",
      });
    }
    navigateVoiceRx(
      {
        patient_data: patient_data,
        isFromTabView: true
      },
      {},
      "mobile_patient_details_voice_rx"
    );
  }, [navigateVoiceRx, profile, patient_data, clinic]);

  // MOBILE OPTIMIZATION: Memoize handler to prevent VisitActionButtons re-renders
  const handleEditRx = useCallback(async () => {
    if (!viewCaseManagerData?.tcm_id) return;
    
    if (cardiologyPrintHandlerRef.current?.editRx) {
      cardiologyPrintHandlerRef.current.editRx();
    } else {
      window.Moengage?.track_event('edit_rx_click', {
        doctor_id: profile?.doctor_unique_id,
        patient_id: patient_data?.patient_unique_id || 0,
        rx_date: viewCaseManagerData?.consultation_date,
      });

      if (isSnapRx && isSnapRxAccessableFromGB) {
        return navigate('/snap-rx', {
          state: {
            patient_data: patient_data,
            caseManagerData: viewCaseManagerData,
          },
        });
      }
      
      if (isSmartRxFile) {
        navigate('/smart-prescription', {
          state: {
            patient_data: patient_data,
            caseManagerData: viewCaseManagerData,
            smartRxFilesData: [],
          },
        });
        return;
      }
      
      window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;

      if (isValidMongoId(viewCaseManagerData?.smart_prescription_filename)) {
        navigateVoiceRx({
          patient_data: patient_data,
          send_path: 'patient_details',
          caseManagerData: viewCaseManagerData,
        });
      } else {
        navigate('/prescription', {
          state: {
            patient_data: patient_data,
            send_path: 'patient_details',
            caseManagerData: viewCaseManagerData,
          },
        });
      }
    }
  }, [viewCaseManagerData, profile?.doctor_unique_id, patient_data, isSnapRx, isSnapRxAccessableFromGB, isSmartRxFile, navigate, navigateVoiceRx]);

  // MOBILE OPTIMIZATION: Memoize handler to prevent VisitActionButtons re-renders
  const handleDownloadRx = useCallback(() => {
      if (cardiologyPrintHandlerRef.current?.downloadContent) {
        cardiologyPrintHandlerRef.current.downloadContent();
      } else {
      if (!viewCaseManagerData?.print_rx_url) return;
      try {
        if (!isChrome && !isSafari) {
          sendMessageToParent(EVENTS.DOWNLOAD, { url: viewCaseManagerData.print_rx_url });
        } else {
          const link = document.createElement('a');
          link.href = viewCaseManagerData.print_rx_url;
          link.download = `prescription_${moment(viewCaseManagerData.consultation_date).format('YYYY-MM-DD')}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        errorMessage('Failed to download prescription');
      }
    }
  }, [viewCaseManagerData?.print_rx_url, viewCaseManagerData?.consultation_date]);

  const handleCardiologyPrintHandlersReady = useCallback((handlers) => {
    cardiologyPrintHandlerRef.current = handlers;
  }, []);

  // MOBILE OPTIMIZATION: Memoize handler to prevent VisitActionButtons re-renders
  const handlePrintIconClick = useCallback(() => {
    const printChannel = !isChrome && !isSafari ? 'in_app' : 'browser';
    trackEvent('TP_App_PrintRx', {
      ...getVoiceRxMoengageBasePayload({
        profile,
        userId,
        patientData: patient_data,
        clinic,
        segmentation: {
          surface: 'mobile_patient_details_visit_summary',
          entry_point: 'print_button',
        },
      }),
      patient_contact: patient_data?.pm_contact_no || '',
      patient_id: patient_data?.patient_unique_id || '',
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name: clinicName,
      PRINTPAGE: 'patient details page',
      rx_id: viewCaseManagerData?.tcm_id || '',
      rx_type: 'standard',
      print_channel: printChannel,
    });
  }, [profile, userId, patient_data, clinic, clinicName, viewCaseManagerData?.tcm_id]);

  const handlePrintRx = useCallback(() => {
      if (cardiologyPrintHandlerRef.current?.printContent) {
        cardiologyPrintHandlerRef.current.printContent();
      } else {
      if (!viewCaseManagerData?.print_rx_url) return;
      if (!isChrome && !isSafari) {
        sendMessageToParent(EVENTS.PRINT, { url: viewCaseManagerData.print_rx_url });
      } else {
        window.open(viewCaseManagerData.print_rx_url, '_blank');
      }
    }
  }, [viewCaseManagerData?.print_rx_url]);

  // MOBILE OPTIMIZATION: Memoize handler to prevent VisitActionButtons re-renders
  const handlePrintMedicinesOnly = useCallback(() => {
      if (cardiologyPrintHandlerRef.current?.printRxContent) {
        cardiologyPrintHandlerRef.current.printRxContent();
      } else {
      if (!viewCaseManagerData?.print_rx_url) return;
      if (!isChrome && !isSafari) {
        sendMessageToParent(EVENTS.PRINT, { url: viewCaseManagerData.print_rx_url });
      } else {
        window.open(viewCaseManagerData.print_rx_url, '_blank');
      }
    }
  }, [viewCaseManagerData?.print_rx_url]);

  // MOBILE OPTIMIZATION: Memoize handler to prevent VisitActionButtons re-renders
  const handleRepeatRx = useCallback(() => {
    if (!viewCaseManagerData) return;

    window.Moengage?.track_event('repeat_rx_click', {
      doctor_id: profile?.doctor_unique_id,
      patient_id: patient_data?.patient_unique_id || 0,
      rx_date: viewCaseManagerData?.consultation_date,
    });

    const repeatedCaseManagerData = {
      ...viewCaseManagerData,
      tcm_id: 0,
      consultation_date: moment().format('YYYY-MM-DD HH:mm:ss'),
    };

    if (isValidMongoId(viewCaseManagerData?.smart_prescription_filename)) {
      navigateVoiceRx({
        patient_data: patient_data,
        send_path: 'patient_details',
        caseManagerData: repeatedCaseManagerData,
      });
    } else {
      navigate('/prescription', {
        state: {
          patient_data: patient_data,
          send_path: 'patient_details',
          caseManagerData: repeatedCaseManagerData,
        },
      });
    }
  }, [viewCaseManagerData, profile?.doctor_unique_id, patient_data, navigate, navigateVoiceRx]);

  // Memoize tabs array to prevent PatientTabs re-renders
  // MUST be called before any conditional returns to follow React hooks rules
  const tabs = useMemo(() => [
    {
      key: PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY,
      label: 'Past Visits',
      icon: PastVisitTabIcon,
    },
    // Coming soon - commented out
    // {
    //   key: PATIENT_DETAILS_SIDEBAR_KEYS.PATIENT_HISTORY,
    //   label: 'Patient History',
    //   icon: PatientHistoryTabIcon,
    // },
    {
      key: PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_CERTIFICATE,
      label: 'Certificate',
      icon: CertificateTabIcon,
    },
    {
      key: PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_RECORDS,
      label: `Medical Records${allUploadedDocs?.length > 0 ? ` (${allUploadedDocs.length})` : ''}`,
      icon: MedicalRecordsTabIcon,
    },
    // Coming soon - commented out
    // ...(isOpdBillingAccessable || isMobile
    //   ? [
    //       {
    //         key: PATIENT_DETAILS_SIDEBAR_KEYS.BILL_PAYMENT,
    //         label: 'Add Bill/Payment',
    //         icon: MedicalRecordsTabIcon,
    //       },
    //     ]
    //   : []),
  ], [allUploadedDocs?.length, isOpdBillingAccessable, isMobile]);

  return (
    <div className="mobile-patient-details">
      {/* Header Wrapper with Background, Header and Tabs */}
      <div className="patient-header-wrapper">
        <DetailsHeader
          onBack={handleBack}
          title={patient_data?.pm_fullname || "Patient Details"}
          onEdit={handleOpenOptionsModal}
          profileSection={null}
          patient_data={patient_data}
          onVoiceRxClick={handleVoiceRxClick}
        />

        <PatientTabs
          tabs={tabs}
          selectedTab={selectedTab}
          onTabChange={handleTabChange}
          showProfile={false}
        />
      </div>

      {/* Visit Date Selector - Outside mobile-patient-details, styled like DateBanner */}
      {selectedTab === PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY && viewCaseManagerData && (
        <VisitDateSelector
          consultationDate={viewCaseManagerData?.consultation_date}
          onPrevious={nextPress}
          onNext={prevPress}
          hasPrevious={!!viewCaseManagerData?.next_tcm_id}
          hasNext={!!viewCaseManagerData?.prev_tcm_id}
      />
      )}

      <div className="patient-content" ref={scrollContainerRef}>
        {/* MOBILE OPTIMIZATION: Keep tabs mounted but hidden to prevent expensive remounts */}
        {/* This prevents Cardiology and other heavy components from unmounting on tab switch */}
        <div style={{ display: selectedTab === PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY ? 'block' : 'none' }}>
          <VisitSummaryTab
            patient_data={patient_data}
            viewCaseManagerData={viewCaseManagerData}
            loading={loading}
            tcmData={tcmData}
            nextPress={nextPress}
            prevPress={prevPress}
            isVaccinationAccessable={isVaccinationAccessable}
            isGrowthChartAccessable={isGrowthChartAccessable}
            userId={userId}
            onEditRx={handleEditRx}
            onDownloadRx={handleDownloadRx}
            onPrintRx={handlePrintRx}
            onPrintIconClick={handlePrintIconClick}
            onRepeatRx={handleRepeatRx}
            onPrintMedicinesOnly={handlePrintMedicinesOnly}
            onCardiologyPrintHandlersReady={handleCardiologyPrintHandlersReady}
          />
        </div>

        {/* Coming soon - commented out
        <div style={{ display: selectedTab === PATIENT_DETAILS_SIDEBAR_KEYS.PATIENT_HISTORY ? 'block' : 'none' }}>
          <PatientHistoryTab
            patient_data={patient_data}
            viewCaseManagerData={viewCaseManagerData}
            loading={loading}
            tcmData={tcmData}
            isVaccinationAccessable={isVaccinationAccessable}
            isGrowthChartAccessable={isGrowthChartAccessable}
            userId={userId}
            onSectionClick={handleHistorySectionClick}
          />
        </div>
        */}

        <div style={{ display: selectedTab === PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_CERTIFICATE ? 'block' : 'none' }}>
          <CertificateTab patient_data={patient_data} />
        </div>

        <div style={{ display: selectedTab === PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_RECORDS ? 'block' : 'none' }}>
          <MedicalRecordsTab
            filesData={filesData}
            setUploadDocDrawer={setUploadDocDrawer}
            setFilesData={setFilesData}
            handleUploadDocPopup={handleUploadDocPopup}
            setIsEditDocument={setIsEditDocument}
            handleDrawerUploadDoc={handleDrawerUploadDoc}
          />
        </div>

        {/* Coming soon - commented out
        <div style={{ display: selectedTab === PATIENT_DETAILS_SIDEBAR_KEYS.BILL_PAYMENT ? 'block' : 'none' }}>
          <BillingTab patientData={patient_data} fromPath="patientDetails" />
        </div>
        */}
      </div>

      {/* Upload Document Drawer */}
      {uploadDocDrawer && isMobile ? (
        <MobileUploadMedicalRecord
          visible={uploadDocDrawer}
          onClose={handleDrawerUploadDoc}
          handleDrawerUploadDoc={handleDrawerUploadDoc}
          shouldShowDeletePopup={shouldShowDeletePopup}
          setShowDeletePopup={setShowDeletePopup}
          filesData={filesData}
          setFilesData={setFilesData}
          isEditDocument={isEditDocument}
          setIsEditDocument={setIsEditDocument}
          patientData={patient_data}
          isAppointmentData={false}
          handleUploadDocPopup={handleUploadDocPopup}
        />
      ) : (
        uploadDocDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            bodyStyle={{ backgroundColor: 'white' }}
            onClose={handleDeletePopup}
            open={uploadDocDrawer}
            className="modalWidth-700"
            width="auto"
            push={false}
          >
            <UploadDocument
              onClose={handleDeletePopup}
              handleDrawerUploadDoc={handleDrawerUploadDoc}
              shouldShowDeletePopup={shouldShowDeletePopup}
              setShowDeletePopup={setShowDeletePopup}
              filesData={filesData}
              setFilesData={setFilesData}
              isEditDocument={isEditDocument}
              setIsEditDocument={setIsEditDocument}
              handleUploadDocPopup={handleUploadDocPopup}
            />
          </Drawer>
        )
      )}

      {/* Upload Document Popup */}
      {shouldShowUploadDocPopup && (
        <UploadDocPopup
          shouldShowUploadDocPopup={shouldShowUploadDocPopup}
          onCancel={handleUploadDocPopup}
          setFilesData={setFilesData}
          filesData={filesData}
          setUploadDocDrawer={setUploadDocDrawer}
          setIsFileSizeError={setIsFileSizeError}
          setIsFileLimitError={setIsFileLimitError}
          setIsFileTypeError={setIsFileTypeError}
        />
      )}

      {/* File Error Modal - Commented out: Mobile version handles all errors with bottom sheets in MobileUploadMedicalRecord component */}
      {/* {(isFileSizeError || isFileLimitError || isFileTypeError) && (
        <CommonModal
          isModalOpen={isFileSizeError || isFileLimitError || isFileTypeError}
          onCancel={handleRetryBtn}
          modalWidth={500}
          title={
            isFileSizeError
              ? 'Exceeded File Size'
              : isFileLimitError
              ? 'Exceeded File Upload Limit'
              : isFileTypeError
              ? 'File format not supported'
              : 'You may lose your data'
          }
          modalBody={
            <>
              <div className="alert-warning rounded-10px p-2 patient-details">
                <div className="d-flex align-items-center">
                  <img className="me-3" src={alertIcon} alt="Warning" />
                  <span>
                    {isFileSizeError ? (
                      <>
                        The file size exceeded{' '}
                        <span style={{ fontWeight: 700 }}>15MB.</span> Please
                        upload a file smaller than 15MB
                      </>
                    ) : isFileLimitError ? (
                      <>
                        You can only upload up to
                        <span style={{ fontWeight: 700 }}> 5 files.</span>{' '}
                        Please reduce the number of files and try again.
                      </>
                    ) : isFileTypeError ? (
                      <>
                        You can't upload
                        <span style={{ fontWeight: 700 }}>
                          {' '}
                          {isFileTypeError}
                        </span>{' '}
                        file. Only PDF, JPG, JPEG, and PNG formats are accepted.
                      </>
                    ) : (
                      'Are you sure you want to leave ?'
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleRetryBtn}
                  className="w-100 btn btn-primary3 btn-41 px-4"
                >
                  Retry
                </Button>
              </div>
            </>
          }
        />
      )} */}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="loading-overlay">
          <Spin
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              zIndex: '9999',
            }}
            size="large"
          />
        </div>
      )}

      {/* Patient Details Options Modal */}
      <PatientDetailsOptionsModal
        visible={showOptionsModal}
        onClose={handleCloseOptionsModal}
        onStartWalkInClick={handleStartWalkInConsultation}
        onEditPatientClick={handleEditPatient}
        onBookAppointmentClick={handleBookAppointment}
      />
    </div>
  );
}

export default PatientDetails;
