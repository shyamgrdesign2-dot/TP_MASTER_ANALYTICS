import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { Input, Spin, Drawer, DatePicker, Select, message } from 'antd';
import dayjs from 'dayjs';

import { useDeviceType } from '../../../utils/deviceDetection';
import {
  getAllAppointment,
  cancelAppointments,
  endVisit,
} from '../../../redux/appointmentsSlice';
import { getProfile, changeHospital } from '../../../redux/doctorsSlice';
import {
  TAB_QUEUE,
  TAB_FINISHED,
  TAB_CANCELLED,
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  PERSISTANT_STORAGE_KEY_BILL_TOKEN,
} from '../../../utils/constants';
import {
  getClinic,
  getClinicName,
  getTokenData,
  errorMessage,
  sendMessageToParent,
  trackEvent,
  getVoiceRxMoengageBasePayload,
} from '../../../utils/utils';
import { EVENTS } from '../../../utils/events';
import { isChrome, isSafari } from 'react-device-detect';
import { getDecodedToken, useLocalStorage } from '../../../utils/localStorage';
import { useVoiceRxNavigation } from '../../../utils/voiceRxNavigation';
import { env } from '../../../EnvironmentConfig';
import { jwtDecode } from 'jwt-decode';
import { generateBillToken } from '../../opdBilling/service';
import { fetchPatientDefaultLanguage } from '../../../api/services/DefaultLanguageService';
import { getSnapRxDigitization } from '../../snapRx/services/snapRxService';
import { useOpdBilling } from '../../opdBilling/useOpdBilling';
import { fetchAdvanceSetting } from '../../opdBilling/service';
import { setAdvancedSettings } from '../../../redux/billingSlice';

import ProfileSection from './components/ProfileSection';
import AppointmentTabs from './components/AppointmentTabs';
import AppointmentCard from './components/AppointmentCard';
import EmptyState from './components/EmptyState';
import DateBanner from './components/DateBanner';
import DateSelectorModal from './components/DateSelectorModal';
import BottomNavigation from './components/BottomNavigation';
import CancelAppointmentModal from './components/CancelAppointmentModal';
import WalkInConsultationModal from './components/WalkInConsultationModal';
import MoreOptionsModal from './components/MoreOptionsModal';
import EndVisitModal from './components/EndVisitModal';
import RxPreviewModal from './components/RxPreviewModal';

import './AppointmentDashboard.scss';
import { ASSETS } from "../../../assets";
const PlusIcon = ASSETS.mobile.plusIcon;

const dateFormat = 'YYYY-MM-DD';
const showDateFormat = 'DD-MM-YYYY';

function AppointmentDashboard() {
  const navigate = useNavigate();
  const navigateVoiceRx = useVoiceRxNavigation();
  const dispatch = useDispatch();
  const { isMobile, isPWA } = useDeviceType();
  const scrollContainerRef = useRef(null);
  const lastPostElementRef = useRef(null);

  const { profile, loading: profileLoading, defaultPrintSettings } = useSelector((state) => state.doctors);
  const {
    queueCount,
    finishedCount,
    cancelledCount,
    appointmentsData,
    loading,
    setOnLoad,
  } = useSelector((state) => state.records);
  const { advancedSettings } = useSelector((state) => state.billing);
  const { isOpdBillingAccessable } = useOpdBilling();

  const [selectedTab, setSelectedTab] = useState(TAB_QUEUE);
  const [searchQuery, setSearchQuery] = useState('');
  const [date, setDate] = useState({
    startDate: moment().format(dateFormat),
    endDate: moment().format(dateFormat),
  });
  const [pageNo, setPageNo] = useState(0);
  const [visitTypeFilters, setVisitTypeFilters] = useState('');
  const [selectedCalanderOptions, setSelectedCalanderOptions] = useState(1);
  const [showProfile, setShowProfile] = useState(true);
  const lastScrollYRef = useRef(0);
  const scrollTimeoutRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const scrollIgnoreRef = useRef(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEndVisitModal, setShowEndVisitModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [showRxPreviewModal, setShowRxPreviewModal] = useState(false);
  const [selectedRxAppointment, setSelectedRxAppointment] = useState(null);
  const [dateDisplayText, setDateDisplayText] = useState('Today');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [endVisitLoading, setEndVisitLoading] = useState(false);
  
  // Clinic selection state (like web version)
  const [clinicOptions, setClinicOptions] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [getToken, setToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const [getBillToken, setBillToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_BILL_TOKEN);

  const calanderOptions = [
    { value: 1, label: 'Today' },
    { value: 2, label: 'Next 7 Days' },
    { value: 3, label: 'Next 30 Days' },
    { value: 4, label: 'Last 7 Days' },
    { value: 5, label: 'Last 30 Days' },
    { value: 6, label: 'Till Date' },
  ];

  // Ensure profile is loaded - dispatch getProfile if missing
  useEffect(() => {
    if (!profile && !profileLoading) {
      dispatch(getProfile());
    }
  }, [dispatch, profile, profileLoading]);

  // Fetch advance settings so Billed/Unbilled can show on Queue, Finished, Cancelled (same as desktop)
  useEffect(() => {
    if (advancedSettings && Object.keys(advancedSettings).length === 0 && isOpdBillingAccessable) {
      fetchAdvanceSetting().then((response) => {
        if (response) dispatch(setAdvancedSettings(response));
      });
    }
  }, [isOpdBillingAccessable, advancedSettings, dispatch]);

  // Map hospital_data to clinicOptions (like web version)
  useEffect(() => {
    if (profile?.hospital_data) {
      const clinics = profile.hospital_data.map((e) => ({
        value: e.hm_id,
        label: e.hm_name,
      }));
      setClinicOptions(clinics);
    }
  }, [profile]);

  // Sync selectedHospital from token (like web version)
  // If token's clinic_id doesn't match, update token with first clinic to prevent API errors
  useEffect(() => {
    if (clinicOptions?.length > 0) {
      const getStorageData = async () => {
        const token = await getToken();
        if (token !== undefined) {
          try {
            const decoded = jwtDecode(token);
            const index = clinicOptions.findIndex((e) => e.value == decoded.result.clinic_id);
            if (index !== -1) {
              setSelectedHospital(parseInt(decoded.result.clinic_id));
            } else {
              // Token's clinic_id doesn't match - update token with first clinic (minimal fix)
              const firstClinicId = clinicOptions[0].value;
              const action = await dispatch(changeHospital({ clinic_id: firstClinicId }));
              if (action.meta.requestStatus === "fulfilled") {
                await setToken(action.payload.token);
                try {
                  const billToken = await generateBillToken();
                  setBillToken(billToken);
                } catch (e) {
                }
                setSelectedHospital(parseInt(firstClinicId));
              }
            }
          } catch (e) {
          }
        }
      };
      getStorageData();
    }
  }, [clinicOptions, getToken, dispatch, setToken, setBillToken]);

  // Fetch appointments
  useEffect(() => {
    const timeOutId = setTimeout(async () => {
      const sendData = {
        startDate: date.startDate,
        endDate: date.endDate,
        apStatue: selectedTab,
        filterVisitType: visitTypeFilters,
        page: pageNo,
        search: searchQuery,
        sortOrder: 'ascend',
        fetchBillStatus: advancedSettings?.billingStatusInAppointmentScreen,
      };
      dispatch(getAllAppointment(sendData));
    }, 500);

    return () => {
      clearTimeout(timeOutId);
    };
  }, [
    selectedTab,
    date,
    searchQuery,
    pageNo,
    visitTypeFilters,
    dispatch,
    advancedSettings?.billingStatusInAppointmentScreen,
  ]);

  // Infinite scroll
  useEffect(() => {
    if (!lastPostElementRef.current || loading || !setOnLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && appointmentsData.length >= 25) {
          setPageNo((prev) => prev + 1);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    observer.observe(lastPostElementRef.current);

    return () => {
      if (lastPostElementRef.current) {
        observer.unobserve(lastPostElementRef.current);
      }
    };
  }, [loading, setOnLoad, appointmentsData.length]);

  // Scroll handler for profile visibility
  useEffect(() => {
    let rafId = null;
    
    const handleScroll = () => {
      // Ignore scroll during transitions or if already processing
      if (isTransitioningRef.current || scrollIgnoreRef.current) {
        return;
      }

      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // Use requestAnimationFrame for smooth handling
      rafId = requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const currentScrollY = container.scrollTop || 0;
        const lastScrollY = lastScrollYRef.current;
        const scrollDifference = currentScrollY - lastScrollY;
        
        // Always show profile when near top (regardless of content height)
        if (currentScrollY <= 50) {
          if (!showProfile) {
            isTransitioningRef.current = true;
            scrollIgnoreRef.current = true;
            setShowProfile(true);
            
            setTimeout(() => {
              isTransitioningRef.current = false;
              scrollIgnoreRef.current = false;
              lastScrollYRef.current = container.scrollTop || 0;
            }, 350);
          }
          lastScrollYRef.current = currentScrollY;
          rafId = null;
          return;
        }
        
        // Only process if scroll difference is significant (prevents flickering from small movements)
        if (Math.abs(scrollDifference) > 15) {
          // Check if we have enough content to scroll
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;
          const hasEnoughContent = scrollHeight > clientHeight + 30; // Reduced threshold for 2 items case
          
          // Process scroll if we have enough content OR if scrolling up significantly
          if (hasEnoughContent || scrollDifference < -20) {
            if (scrollDifference > 0 && currentScrollY > 80) {
        // Scrolling down - hide profile
              if (showProfile) {
                isTransitioningRef.current = true;
                scrollIgnoreRef.current = true;
        setShowProfile(false);
                
                // Re-enable scroll handling after transition
                setTimeout(() => {
                  isTransitioningRef.current = false;
                  scrollIgnoreRef.current = false;
                  // Update scroll position reference after layout stabilizes
                  lastScrollYRef.current = container.scrollTop || 0;
                }, 350);
              }
            } else if (scrollDifference < -10) {
              // Scrolling up - show profile (need significant upward scroll)
              if (!showProfile) {
                isTransitioningRef.current = true;
                scrollIgnoreRef.current = true;
        setShowProfile(true);
                
                // Re-enable scroll handling after transition
                setTimeout(() => {
                  isTransitioningRef.current = false;
                  scrollIgnoreRef.current = false;
                  // Update scroll position reference after layout stabilizes
                  lastScrollYRef.current = container.scrollTop || 0;
                }, 350);
              }
            }
          }
          
          // Update last scroll position only if we processed the scroll
          if (Math.abs(scrollDifference) > 15) {
            lastScrollYRef.current = currentScrollY;
          }
        }
        
        rafId = null;
      });
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [showProfile]);

  // Handle tab change
  const handleTabChange = useCallback((key) => {
    setPageNo(0);
    setVisitTypeFilters('');
    setSelectedTab(key);
    setSelectedCalanderOptions(1);
    
    if (key === TAB_QUEUE) {
      setDate({
        startDate: moment().format(dateFormat),
        endDate: moment().format(dateFormat),
      });
    }
  }, []);

  // Handle search
  const handleSearch = useCallback((value) => {
    setPageNo(0);
    setSearchQuery(value);
  }, []);

  // Handle date change
  const handleDateChange = useCallback((value) => {
    setSelectedCalanderOptions(value);
    setPageNo(0);
    
    const today = moment();
    let startDate, endDate;

    switch (value) {
      case 1: // Today
        startDate = today.format(dateFormat);
        endDate = today.format(dateFormat);
        break;
      case 2: // Next 7 Days
        startDate = today.format(dateFormat);
        endDate = today.add(7, 'days').format(dateFormat);
        break;
      case 3: // Next 30 Days
        startDate = today.format(dateFormat);
        endDate = today.add(30, 'days').format(dateFormat);
        break;
      case 4: // Last 7 Days
        startDate = today.subtract(7, 'days').format(dateFormat);
        endDate = today.format(dateFormat);
        break;
      case 5: // Last 30 Days
        startDate = today.subtract(30, 'days').format(dateFormat);
        endDate = today.format(dateFormat);
        break;
      case 6: // Till Date
        startDate = moment(0).format(dateFormat);
        endDate = today.format(dateFormat);
        break;
      default:
        startDate = today.format(dateFormat);
        endDate = today.format(dateFormat);
    }

    setDate({ startDate, endDate });
  }, []);

  // Handle date picker change
  const handleDatePickerChange = useCallback((dateValue) => {
    if (dateValue) {
      const formattedDate = dateValue.format(dateFormat);
      setDate({
        startDate: formattedDate,
        endDate: formattedDate,
      });
      setSelectedCalanderOptions(null);
    }
  }, []);

  // Navigate to previous date
  const handlePreviousDate = useCallback(() => {
    const prevDate = moment(date.startDate).subtract(1, 'day');
    setDate({
      startDate: prevDate.format(dateFormat),
      endDate: prevDate.format(dateFormat),
    });
  }, [date.startDate]);

  // Navigate to next date
  const handleNextDate = useCallback(() => {
    const nextDate = moment(date.startDate).add(1, 'day');
    setDate({
      startDate: nextDate.format(dateFormat),
      endDate: nextDate.format(dateFormat),
    });
  }, [date.startDate]);

  // Handle consult click
  const handleConsultClick = useCallback((record) => {
    if (window.Moengage) {
      window.Moengage.track_event('patient_search_consult', {
        doctor_id: profile?.doctor_unique_id,
        patient_id: record?.patient_unique_id,
      });
    }
    navigateVoiceRx(
      {
        patient_data: record,
        isFromTabView: true 
      },
      {},
      "mobile_appointment_consult"
    );
  }, [navigateVoiceRx, profile]);

  // Handle patient details click
  const handlePatientDetailsClick = useCallback((record) => {
    navigate('/patient_details', { state: { patient_data: record } });
  }, [navigate]);

  // Handle view Rx click
  const handleViewRxClick = useCallback((record) => {
    const currentClinic = getClinic(profile?.hospital_data);
    const currentClinicName = getClinicName(profile?.hospital_data);
    trackEvent('TP_App_view_Rx', {
      ...getVoiceRxMoengageBasePayload({
        profile,
        userId: profile?.um_id || '',
        patientData: record,
        clinic: currentClinic,
        segmentation: {
          surface: 'mobile_appointment_dashboard',
          entry_point: 'view_rx_button',
        },
      }),
      patient_contact: record?.pm_contact_no || '',
      patient_id: record?.patient_unique_id || '',
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name: currentClinicName,
      rx_id: record?.tcm_id || '',
      appointment_tab: selectedTab,
      pam_id: record?.pam_id || '',
    });
    setSelectedRxAppointment(record);
    setShowRxPreviewModal(true);
  }, [profile, selectedTab]);

  // Handle cancel appointment
  const handleCancelAppointment = useCallback((record) => {
    setSelectedAppointment(record);
    setShowCancelModal(true);
  }, []);

  // Confirm cancel appointment
  const confirmCancelAppointment = useCallback(async () => {
    if (!selectedAppointment) return;

    try {
      await dispatch(
        cancelAppointments({
          pam_id: selectedAppointment.pam_id,
          patient_unique_id: selectedAppointment.patient_unique_id,
          pm_id: selectedAppointment.pm_id,
          pm_pid: selectedAppointment.pm_pid,
        })
      ).unwrap();
      
      message.success('Appointment cancelled successfully');
      setShowCancelModal(false);
      setSelectedAppointment(null);
      
      // Refresh appointments
      setPageNo(0);
    } catch (error) {
      message.error('Failed to cancel appointment');
    }
  }, [dispatch, selectedAppointment]);

  // Handle end visit
  const handleEndVisit = useCallback((record) => {
    setSelectedAppointment(record);
    setShowEndVisitModal(true);
  }, []);

  // Confirm end visit
  const confirmEndVisit = useCallback(async (reason) => {
    if (!selectedAppointment) return;

    setEndVisitLoading(true);
    try {
      const sendData = {
        pam_id: selectedAppointment.pam_id,
        patient_unique_id: selectedAppointment.patient_unique_id,
        pm_id: selectedAppointment.pm_id,
        pm_pid: selectedAppointment.pm_pid,
        tpvl_remarks: reason || '',
      };
      
      await dispatch(endVisit(sendData)).unwrap();
      
      message.success('Visit ended successfully');
      setShowEndVisitModal(false);
      setSelectedAppointment(null);
      
      // Refresh appointments
      setPageNo(0);
    } catch (error) {
      message.error('Failed to end visit');
    } finally {
      setEndVisitLoading(false);
    }
  }, [dispatch, selectedAppointment]);

  // Handle print Rx (same as web version)
  const handlePrintRx = useCallback(async (record) => {
    if (!record.print_rx_url) {
      message.warning('Prescription not available for printing');
      return;
    }

    try {
      // Get patient default language (same as web version)
      const getPatientDefaultLanguage = async () => {
        try {
          const res = await fetchPatientDefaultLanguage(record?.patient_unique_id);
          if (res?.settings?.defaultLanguage) {
            return res.settings.defaultLanguage;
          }
        } catch (error) {
        }
        return defaultPrintSettings?.default_language;
      };

      // Update RxDigitize in URL (same as web version)
      const updateRxDigitizeInUrl = async () => {
        try {
          if (!record.patient_unique_id || !record.tcm_id) {
            return record.print_rx_url;
          }

          const urlObj = new URL(record.print_rx_url);
          urlObj.searchParams.delete("rxDigitize");

          const snapRxDigitisedData = await getSnapRxDigitization(
            record.patient_unique_id,
            record.tcm_id
          );

          const isSnapRxdigitised = snapRxDigitisedData?.digitization?.isVerified && snapRxDigitisedData?.digitization?.isDigitize;
          if (isSnapRxdigitised) {
            urlObj.searchParams.set("rxDigitize", "true");
          }

          return urlObj.toString();
        } catch (error) {
          return record.print_rx_url;
        }
      };

      const patientDefaultLanguage = await getPatientDefaultLanguage();
      const encodedData = patientDefaultLanguage && patientDefaultLanguage !== "English" 
        ? btoa(patientDefaultLanguage.toString()) 
        : "";
      const printUrl = await updateRxDigitizeInUrl();
      const fullPrintUrl = `${printUrl}&lg=${encodedData}`;
      const currentClinic = getClinic(profile?.hospital_data);
      const currentClinicName = getClinicName(profile?.hospital_data);

      const printChannel = !isChrome && !isSafari ? 'in_app' : 'browser';
      trackEvent('TP_App_PrintRx', {
        ...getVoiceRxMoengageBasePayload({
          profile,
          userId: profile?.um_id || '',
          patientData: record,
          clinic: currentClinic,
          segmentation: {
            surface: 'mobile_appointment_more_options',
            entry_point: 'print_rx_option',
          },
        }),
        patient_contact: record?.pm_contact_no || '',
        patient_id: record?.patient_unique_id || '',
        doctor_speciality: profile?.dp_name,
        doctor_unique_id: profile?.doctor_unique_id,
        clinic_name: currentClinicName,
        PRINTPAGE: 'finished queue',
        rx_id: record?._id || record?.tcm_id || '',
        rx_type: 'standard',
        print_channel: printChannel,
      });

      if (!isChrome && !isSafari) {
        sendMessageToParent(EVENTS.PRINT, { url: fullPrintUrl });
        return;
      }

      window.open(fullPrintUrl, '_blank');
    } catch (error) {
      message.error('Failed to open prescription');
    }
  }, [defaultPrintSettings, profile]);

  // Handle download Rx (same URL and behavior as Rx Preview download icon: language, rxDigitize, in-app download)
  const handleDownloadRx = useCallback(async (record) => {
    if (!record.print_rx_url) {
      errorMessage('Download URL is missing.');
      return;
    }

    try {
      // Same URL building as handlePrintRx (patient language + rxDigitize for digital Rx)
      const getPatientDefaultLanguage = async () => {
        try {
          const res = await fetchPatientDefaultLanguage(record?.patient_unique_id);
          if (res?.settings?.defaultLanguage) {
            return res.settings.defaultLanguage;
          }
        } catch (error) {
        }
        return defaultPrintSettings?.default_language;
      };

      const updateRxDigitizeInUrl = async () => {
        try {
          if (!record.patient_unique_id || !record.tcm_id) {
            return { url: record.print_rx_url, isDigitized: false };
          }
          const urlObj = new URL(record.print_rx_url);
          urlObj.searchParams.delete("rxDigitize");
          const snapRxDigitisedData = await getSnapRxDigitization(
            record.patient_unique_id,
            record.tcm_id
          );
          const isSnapRxdigitised = snapRxDigitisedData?.digitization?.isVerified && snapRxDigitisedData?.digitization?.isDigitize;
          if (isSnapRxdigitised) {
            urlObj.searchParams.set("rxDigitize", "true");
          }
          return { url: urlObj.toString(), isDigitized: isSnapRxdigitised };
        } catch (error) {
          return { url: record.print_rx_url, isDigitized: false };
        }
      };

      const patientDefaultLanguage = await getPatientDefaultLanguage();
      const encodedData = patientDefaultLanguage && patientDefaultLanguage !== "English"
        ? btoa(patientDefaultLanguage.toString())
        : "";
      const { url: downloadUrl, isDigitized } = await updateRxDigitizeInUrl();
      const fullDownloadUrl = `${downloadUrl}&lg=${encodedData}`;

      if (isDigitized && window.Moengage && profile) {
        window.Moengage.track_event("TP_Digitised_Prescription_Download", {
          Doctor_Name: profile?.um_name,
          Doctor_Number: profile?.um_contact,
          Doctor_Unique_Id: profile?.doctor_unique_id,
        });
      }

      if (!isChrome && !isSafari) {
        sendMessageToParent(EVENTS.DOWNLOAD, { url: fullDownloadUrl });
        return;
      }

      const { default: saveAs } = await import('file-saver');
      const axios = (await import('axios')).default;
      const response = await axios({
        url: fullDownloadUrl,
        method: 'GET',
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf',
      });
      const fileName = record.apDate
        ? `prescription_${moment(record.apDate).format('YYYY-MM-DD')}.pdf`
        : `prescription_${record.pam_id || Date.now()}.pdf`;
      saveAs(blob, fileName);
    } catch (error) {
      errorMessage('Failed to download prescription');
    }
  }, [defaultPrintSettings, profile]);

  // Handle walk-in consultation
  const handleWalkInConsultation = useCallback(() => {
    setShowWalkInModal(true);
  }, []);

  // Navigate to walk-in consultation
  const navigateToWalkIn = useCallback(() => {
    setShowWalkInModal(false);
    navigate('/walk_in_consultation');
    // Track event
    if (window.Moengage && profile) {
      const clinic_name = getClinicName(profile?.hospital_data);
      window.Moengage.track_event("TP_Appointment_WalkIn", {
        clinic_name,
      });
    }
  }, [navigate, profile]);

  // Navigate to add appointment
  const navigateToAddAppointment = useCallback(() => {
    setShowWalkInModal(false);
    navigate('/add-appointment');
    // Track event
    if (window.Moengage && profile) {
      const clinic_name = getClinicName(profile?.hospital_data);
      window.Moengage.track_event("TP_Appointment_AddAppointment", {
        clinic_name,
      });
    }
  }, [navigate, profile]);

  // Handle more options
  const handleMoreOptions = useCallback((record) => {
    setSelectedAppointment(record);
    setShowMoreOptions(true);
  }, []);

  // Handle date selection from modal
  const handleDateSelect = useCallback((startDate, endDate, optionType) => {
    setPageNo(0);
    setDate({ startDate, endDate });
    
    // Update display text based on selection
    switch (optionType) {
      case 'today':
        setDateDisplayText('Today');
        break;
      case 'next7':
        setDateDisplayText('Next 7 days');
        break;
      case 'next30':
        setDateDisplayText('Next 30 days');
        break;
      case 'last7':
        setDateDisplayText('Last 7 days');
        break;
      case 'last30':
        setDateDisplayText('Last 30 days');
        break;
      default:
        if (startDate === endDate) {
          setDateDisplayText(moment(startDate).format('MMMM DD'));
        } else {
          setDateDisplayText(`${moment(startDate).format('MMM DD')} - ${moment(endDate).format('MMM DD')}`);
        }
    }
  }, []);

  // Get date banner text
  const getDateBannerText = () => {
    if (dateDisplayText === 'Today') {
      return `${moment().format('MMMM DD')} (Today)`;
    }
    return dateDisplayText;
  };

  // Get empty state message
  const getEmptyStateMessage = () => {
    switch (selectedTab) {
      case TAB_QUEUE:
        return "There are no patients in your queue right now!";
      case TAB_FINISHED:
        return "You haven't finished any consultations or ended the visit yet.";
      case TAB_CANCELLED:
        return "Nothing here! You haven't cancelled any appointments here.";
      default:
        return "No appointments found.";
    }
  };

  // Use useMemo to recalculate clinic/clinicName when profile changes
  // This ensures values update when profile loads (critical on real mobile devices)
  const clinic = useMemo(() => getClinic(profile?.hospital_data), [profile?.hospital_data]);
  const clinicName = useMemo(() => getClinicName(profile?.hospital_data), [profile?.hospital_data]);

  // Handle clinic selection change (like web version)
  const handleClinicChange = useCallback(async (value) => {
    const sendData = {
      clinic_id: value,
    };
    const action = await dispatch(changeHospital(sendData));
    if (action.meta.requestStatus === "fulfilled") {
      await setToken(action.payload.token);
      try {
        const decoded = jwtDecode(action.payload.token);
        const billToken = await generateBillToken();
        setBillToken(billToken);
      } catch (e) {
      }
      // Refresh the page to ensure all data is updated
      navigate(0, { replace: true });
    } else {
      // Handle error case - show error message to user
      errorMessage(action.error || 'Failed to change clinic. Please try again.');
    }
  }, [dispatch, setToken, setBillToken, navigate]);

  return (
    <div className="mobile-appointment-dashboard">
      {/* Header Wrapper with Profile Section and Tabs */}
      <div className="dashboard-header-wrapper">
      {/* Profile Section - Hidden on scroll */}
      {showProfile && (
        <ProfileSection
          doctorName={profile?.um_name}
          clinicName={clinicName}
          profileImage={profile?.um_image}
          clinicOptions={clinicOptions}
          selectedHospital={selectedHospital}
          onClinicChange={handleClinicChange}
        />
      )}

      {/* Tabs */}
      <AppointmentTabs
        selectedTab={selectedTab}
        onTabChange={handleTabChange}
        queueCount={queueCount}
        finishedCount={finishedCount}
        cancelledCount={cancelledCount}
        showProfile={showProfile}
      />
      </div>

      {/* Date Banner */}
      <DateBanner 
        date={getDateBannerText()}
        onClick={() => setShowDateSelector(true)}
        showDropdown={true}
      />

      {/* Main Content */}
      <div
        ref={scrollContainerRef}
        className="appointment-content"
      >
        {/* Search Bar - Hide when no data available */}
        {(loading && pageNo === 0) || appointmentsData.length > 0 ? (
          <div className="search-container">
            {loading && pageNo === 0 ? (
              <div className="search-shimmer">
                <div className="shimmer-search-bar">
                  <i className="icon-search shimmer-search-icon"></i>
                  <div className="shimmer-search-input"></div>
                </div>
              </div>
            ) : (
            <Input
              value={searchQuery}
              placeholder="Search by Name/ID/Mobile Number"
              prefix={<i className="icon-search" />}
              suffix={
                searchQuery.length > 0 && (
                  <i
                    className="icon-Cross"
                    onClick={() => handleSearch('')}
                    style={{ cursor: 'pointer' }}
                  />
                )
              }
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
            )}
          </div>
        ) : null}

        {/* Date Filter - Hidden for now, can be shown when DateBanner is clicked */}
        {selectedTab === TAB_QUEUE && false && (
          <div className="date-filter-container">
            <div className="date-navigation">
              <button
                className="date-nav-btn"
                onClick={handlePreviousDate}
                disabled={date.startDate !== date.endDate}
              >
                <i className="icon-right" />
              </button>
              <DatePicker
                inputReadOnly
                format={showDateFormat}
                value={dayjs(moment(date.startDate).format(showDateFormat), showDateFormat)}
                onChange={handleDatePickerChange}
                className="date-picker-input"
              />
              <button
                className="date-nav-btn"
                onClick={handleNextDate}
                disabled={date.startDate !== date.endDate}
              >
                <i className="icon-right iconrotate180" />
              </button>
            </div>
            <Select
              placeholder="Select Period"
              value={selectedCalanderOptions}
              options={calanderOptions.filter((e) => [1, 2, 3].includes(e.value))}
              onChange={handleDateChange}
              className="period-select"
            />
          </div>
        )}

        {/* Appointments List */}
        {loading && pageNo === 0 ? (
                <div className="appointments-shimmer">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="appointment-card-shimmer">
                      <div className="shimmer-card-header">
                        <div className="shimmer-avatar-section">
                          <div className="shimmer-avatar"></div>
                          <div className="shimmer-info">
                            <div className="shimmer-name"></div>
                            <div className="shimmer-meta"></div>
                          </div>
                        </div>
                      </div>
                      <div className="shimmer-chips">
                        <div className="shimmer-chip"></div>
                        <div className="shimmer-chip"></div>
                      </div>
                      <div className="shimmer-divider"></div>
                      <div className="shimmer-actions">
                        <div className="shimmer-button"></div>
                        <div className="shimmer-button"></div>
                      </div>
                    </div>
                  ))}
          </div>
        ) : appointmentsData.length === 0 ? (
          <EmptyState message={getEmptyStateMessage()} />
        ) : (
          <div className="appointments-list">
            {appointmentsData.map((appointment, index) => (
              <AppointmentCard
                key={appointment.key || index}
                appointment={appointment}
                selectedTab={selectedTab}
                onConsultClick={handleConsultClick}
                onPatientDetailsClick={handlePatientDetailsClick}
                onViewRxClick={handleViewRxClick}
                onCancelClick={handleCancelAppointment}
                onMoreOptionsClick={handleMoreOptions}
              />
            ))}
            
            {/* Infinite scroll trigger */}
            {appointmentsData.length >= 25 && setOnLoad && (
              <div ref={lastPostElementRef} className="infinite-scroll-trigger">
                <Spin />
              </div>
            )}
          </div>
        )}

        {/* Walk-in Consultation Button - Floating */}
        {selectedTab === TAB_QUEUE && (
          <button
            className="walk-in-button"
            onClick={handleWalkInConsultation}
          >
            <img src={PlusIcon} alt="Add" className="walk-in-button-icon" />
          </button>
        )}
      </div>

      {/* Modals */}
      <CancelAppointmentModal
        visible={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedAppointment(null);
        }}
        onConfirm={confirmCancelAppointment}
        loading={loading}
      />

      <WalkInConsultationModal
        visible={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        onWalkInClick={navigateToWalkIn}
        onAddAppointmentClick={navigateToAddAppointment}
      />

      <MoreOptionsModal
        visible={showMoreOptions}
        onClose={() => {
          setShowMoreOptions(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        selectedTab={selectedTab}
        onCancelClick={handleCancelAppointment}
        onEndVisitClick={handleEndVisit}
        onPrintRxClick={handlePrintRx}
        onDownloadRxClick={handleDownloadRx}
      />

      {/* End Visit Modal */}
      <EndVisitModal
        visible={showEndVisitModal}
        onClose={() => {
          setShowEndVisitModal(false);
          setSelectedAppointment(null);
        }}
        onConfirm={confirmEndVisit}
        loading={endVisitLoading}
      />

      {/* Date Selector Modal */}
      <DateSelectorModal
        visible={showDateSelector}
        onClose={() => setShowDateSelector(false)}
        onDateSelect={handleDateSelect}
        selectedTab={selectedTab}
        currentDate={date.startDate}
      />

      {/* Rx Preview Modal */}
      <RxPreviewModal
        visible={showRxPreviewModal}
        onClose={() => {
          setShowRxPreviewModal(false);
          setSelectedRxAppointment(null);
        }}
        appointment={selectedRxAppointment}
      />

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="appointments" />
    </div>
  );
}

export default AppointmentDashboard;
