import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { message, Input } from 'antd';
import { debounce } from 'lodash';
import './AllPatients.scss';
import PatientListItem from './components/PatientListItem';
import BottomNavigation from '../AppointmentDashboard/components/BottomNavigation';
import { fetchAllPatients } from '../../allPatients.js/service';
import { resetVaccineState } from '../../../redux/vaccineSlice';
import { resetGrowthChartState } from '../../../redux/growthChartSlice';
import { resetObstetricState } from '../../../redux/obstetricSlice';
import { resetUploadDocState } from '../../../redux/uploadDocSlice';
import { resetDDxState } from '../../../redux/ddxSlice';
import { 
  trackEvent, 
  getClinicName,
  errorMessage 
} from '../../../utils/utils';
import { getDecodedToken } from '../../../utils/localStorage';
import { useVoiceRxNavigation } from '../../../utils/voiceRxNavigation';
import { getProfile } from '../../../redux/doctorsSlice';
import { ASSETS } from "../../../assets";
const {
  endVisit: successIcon,
  closeVisit: closeIcon,
} = ASSETS.images;
const profileAddIcon = ASSETS.mobile.profileAdd;

const SHIMMER_ITEMS = [0, 1, 2, 3, 4];

function AllPatients() {
  const navigate = useNavigate();
  const navigateVoiceRx = useVoiceRxNavigation();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { profile, loading: profileLoading } = useSelector((state) => state.doctors);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageNo, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPatients, setTotalPatients] = useState(0);
  
  const observer = useRef();
  const MESSAGE_KEY = "patient_update_message";
  const isInitialLoadRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const decodedTokenRef = useRef(getDecodedToken());
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!profile && !profileLoading) {
      dispatch(getProfile());
    }
  }, [dispatch, profile, profileLoading]);
  
  const doctorDetails = useMemo(() => {
    return {
      clinic_name: getClinicName(profile?.hospital_data),
      clinic_id: decodedTokenRef.current?.result?.clinic_id,
      doctor_id: profile?.doctor_unique_id,
      doctor_name: profile?.um_name,
      doctor_mobile_no: profile?.um_contact,
      device_details: "Mobile",
    };
  }, [profile?.hospital_data, profile?.doctor_unique_id, profile?.um_name, profile?.um_contact]);

  const loadPatients = useCallback(async (page, search) => {
    if (isLoadingRef.current) {
      return;
    }
    
    try {
      isLoadingRef.current = true;
      
      if (page === 1) {
        setLoading(true);
      }
      
      const params = {
        page: page,
        limit: 25,
        search: search,
      };
      
      const response = await fetchAllPatients(params);
      
      if (response?.patients) {
        if (page === 1) {
          setPatients(response.patients);
        } else {
          setPatients(prev => [...prev, ...response.patients]);
        }
        
        setTotalPatients(response.total || 0);
        const hasMorePages = response.patients.length === 25;
        setHasMore(hasMorePages);
        setPageNo(page);
      }
    } catch (_error) {
      errorMessage('Failed to load patients');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce(async (query) => {
      setPageNo(1);
      setPatients([]);
      setHasMore(true);
      await loadPatients(1, query);
    }, 500),
    [loadPatients]
  );

  useEffect(() => {
    if (profile && !profileLoading && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      isInitialLoadRef.current = true;
      loadPatients(1, '');
    }
  }, [loadPatients, profile, profileLoading]);

  useEffect(() => {
    if (isInitialLoadRef.current && searchQuery === '') {
      isInitialLoadRef.current = false;
      return;
    }
    
    debouncedSearch(searchQuery);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    if (location.state?.showMessage) {
      const messageType = location.state.messageType;
      
      message.destroy(MESSAGE_KEY);
      
      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={successIcon} className="me-3" alt="Success" />
            <div>
              <div className="title-common text-start fontroboto">
                {messageType === "updated"
                  ? "Patient details updated successfully"
                  : "Patient added successfully"}
              </div>
            </div>
            <img
              src={closeIcon}
              className="ms-3 cursor-pointer"
              onClick={() => message.destroy(MESSAGE_KEY)}
              alt="Close"
            />
          </div>
        ),
        duration: 5,
      });

      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [location.state?.showMessage, navigate, location.pathname, location.state?.messageType]);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handlePatientClick = useCallback((patient) => {
    dispatch(resetVaccineState());
    dispatch(resetGrowthChartState());
    dispatch(resetObstetricState());
    dispatch(resetUploadDocState());
    dispatch(resetDDxState());
    
    navigate('/patient_details', {
      state: { 
        patient_data: { 
          ...patient, 
          pm_first_name: patient?.pm_fullname || patient?.pm_name 
        },
        from: '/all_patients'
      }
    });
    
    trackEvent("TP_AllPatients_PatientDetailsView", {
      ...doctorDetails,
      patient_id: patient?.pm_pid,
      patient_name: patient?.pm_fullname || patient?.pm_name,
      patient_number: patient?.pm_contact_no || patient?.pm_mobile,
    });
  }, [dispatch, navigate, doctorDetails]);

  const handleEditPatient = useCallback((patient) => {
    navigate('/edit_patient', {
      state: { 
        patient_data: patient, 
        from: '/all_patients' 
      }
    });
    
    trackEvent("TP_AllPatients_EditPatientDetails", {
      ...doctorDetails,
      patient_id: patient?.pm_pid,
      patient_name: patient?.pm_fullname || patient?.pm_name,
      patient_number: patient?.pm_contact_no || patient?.pm_mobile,
    });
  }, [navigate, doctorDetails]);

  const handleCreatePrescription = useCallback((patient) => {
    navigate('/prescription', {
      state: { 
        patient_data: patient,
        from: '/all_patients'
      }
    });
    
    trackEvent("TP_AllPatients_CreatePrescription", {
      ...doctorDetails,
      patient_id: patient?.pm_pid,
      patient_name: patient?.pm_fullname || patient?.pm_name,
      patient_number: patient?.pm_contact_no || patient?.pm_mobile,
    });
  }, [navigate, doctorDetails]);

  const handleBookAppointment = useCallback((patient) => {
    navigate('/add_appointment', {
      state: { 
        patient_data: patient,
        from: '/all_patients'
      }
    });
    
    trackEvent("TP_AllPatients_BookAppointment", {
      ...doctorDetails,
      patient_id: patient?.pm_pid,
      patient_name: patient?.pm_fullname || patient?.pm_name,
      patient_number: patient?.pm_contact_no || patient?.pm_mobile,
    });
  }, [navigate, doctorDetails]);

  const handleWalkInConsultation = useCallback((patient) => {
    // Start voice consultation for this patient (same as Patient Details flow)
    navigateVoiceRx(
      {
        patient_data: patient,
        isFromTabView: true,
        from: '/all_patients'
      },
      {},
      "mobile_all_patients_walk_in"
    );
    
    trackEvent("TP_AllPatients_WalkInConsultation", {
      ...doctorDetails,
      patient_id: patient?.pm_pid,
      patient_name: patient?.pm_fullname || patient?.pm_name,
      patient_number: patient?.pm_contact_no || patient?.pm_mobile,
    });
  }, [navigateVoiceRx, doctorDetails]);

  const handleAddNewPatient = useCallback(() => {
    navigate('/add_patient', {
      state: { from: '/all_patients' }
    });
    
    trackEvent("TP_AllPatients_AddNewPatient", doctorDetails);
  }, [navigate, doctorDetails]);

  const lastPatientElementRef = useCallback(node => {
    if (observer.current) {
      observer.current.disconnect();
    }
    
    if (loading) return;
    
    observer.current = new IntersectionObserver(entries => {
      const entry = entries[0];
      
      if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
        loadPatients(pageNo + 1, searchQuery);
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px'
    });
    
    if (node) {
      observer.current.observe(node);
    }
  }, [loading, hasMore, pageNo, searchQuery, loadPatients]);

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const patientCountText = useMemo(() => {
    if (patients.length === 0) return null;
    return `Showing ${patients.length}${totalPatients > patients.length ? ` of ${totalPatients}` : ''} patients`;
  }, [patients.length, totalPatients]);

  return (
    <div className="mobile-all-patients">
      <div className="header-container">
        <div className="page-header">
          <div className="title-bar">
            <h1 className="page-title">All Patients</h1>
          </div>
          <div className="search-container">
            <Input
              value={searchQuery}
              placeholder="Search by Name/ID/Mobile Number"
              prefix={<i className="icon-search" />}
              suffix={
                searchQuery.length > 0 && (
                  <i
                    className="icon-Cross"
                    onClick={handleSearchClear}
                    style={{ cursor: 'pointer' }}
                  />
                )
              }
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>
        </div>
      </div>

      <div className="content-container">
        {loading && pageNo === 1 ? (
          <div className="patient-count-shimmer">
            <div className="shimmer-count-line"></div>
          </div>
        ) : patientCountText && (
          <div className="patient-count">
            <p>{patientCountText}</p>
          </div>
        )}

        <div className="patients-list">
          {loading && pageNo === 1 ? (
            <div className="patients-shimmer">
              {SHIMMER_ITEMS.map((index) => (
                <div key={index} className="patient-shimmer-item">
                  <div className="shimmer-avatar-section">
                    <div className="shimmer-avatar"></div>
                    <div className="shimmer-info">
                      <div className="shimmer-header"></div>
                      <div className="shimmer-details">
                        <div className="shimmer-line shimmer-details-text"></div>
                        <div className="shimmer-line shimmer-details-text"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : patients.length > 0 ? (
            <>
              {patients.map((patient, index) => {
                const isLast = index === patients.length - 1;
                const key = patient.pm_pid || patient.pm_patient_id || `patient-${index}`;
                
                return (
                  <div
                    key={key}
                    ref={isLast ? lastPatientElementRef : null}
                  >
                    <PatientListItem
                      patient={patient}
                      onClick={handlePatientClick}
                      onEdit={handleEditPatient}
                      onCreatePrescription={handleCreatePrescription}
                      onBookAppointment={handleBookAppointment}
                      onWalkInConsultation={handleWalkInConsultation}
                      doctorDetails={doctorDetails}
                    />
                  </div>
                );
              })}
              
              {loading && pageNo > 1 && (
                <div className="loading-more">
                  <div className="loading-spinner small"></div>
                  <p>Loading more patients...</p>
                </div>
              )}
              
              {!hasMore && patients.length > 0 && (
                <div className="end-of-list">
                  <p>You've reached the end of the list</p>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No patients found</p>
              {searchQuery ? (
                <p className="empty-subtitle">
                  Try adjusting your search criteria
                </p>
              ) : (
                <p className="empty-subtitle">
                  Start by adding your first patient
                </p>
              )}
              <button 
                className="add-patient-button"
                onClick={handleAddNewPatient}
              >
                Add New Patient
              </button>
            </div>
          )}
        </div>
      </div>

      <button 
        className="floating-add-button"
        onClick={handleAddNewPatient}
        title="Add New Patient"
        aria-label="Add New Patient"
      >
        <img src={profileAddIcon} alt="Add Patient" className="floating-add-icon" />
      </button>

      <BottomNavigation activeTab="patients" />
    </div>
  );
}

export default AllPatients;
