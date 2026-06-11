import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Input, Spin } from 'antd';
import './WalkInConsultation.scss';
import WalkInPatientCard from './components/WalkInPatientCard';
import { fetchAllPatients } from '../../allPatients.js/service';
import { resetVaccineState } from '../../../redux/vaccineSlice';
import { resetGrowthChartState } from '../../../redux/growthChartSlice';
import { resetObstetricState } from '../../../redux/obstetricSlice';
import { resetUploadDocState } from '../../../redux/uploadDocSlice';
import { resetDDxState } from '../../../redux/ddxSlice';
import { 
  getClinicName,
  isNumeric,
  isAlphabet 
} from '../../../utils/utils';
import { getDecodedToken } from '../../../utils/localStorage';
import { useVoiceRxNavigation } from '../../../utils/voiceRxNavigation';
import { getProfile } from '../../../redux/doctorsSlice';
import { ASSETS } from "../../../assets";
const arrowLeftIcon = ASSETS.mobile.arrowLeft;

const PATIENT_LIST_PAGE_SIZE = 25;

function WalkInConsultation() {
  const navigate = useNavigate();
  const navigateVoiceRx = useVoiceRxNavigation();
  const dispatch = useDispatch();
  const decodedToken = getDecodedToken();
  const observer = useRef();
  
  const { profile, loading: profileLoading } = useSelector((state) => state.doctors);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [patientsList, setPatientsList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Ensure profile is loaded - dispatch getProfile if missing
  useEffect(() => {
    if (!profile && !profileLoading) {
      dispatch(getProfile());
    }
  }, [dispatch, profile, profileLoading]);

  // Use useMemo to recalculate clinicName when profile changes
  const clinicName = useMemo(() => getClinicName(profile?.hospital_data), [profile?.hospital_data]);

  const doctorDetails = useMemo(() => ({
    clinic_name: clinicName,
    clinic_id: decodedToken?.result?.clinic_id,
    doctor_id: profile?.doctor_unique_id,
    doctor_name: profile?.um_name,
    doctor_mobile_no: profile?.um_contact,
    device_details: "Mobile",
  }), [clinicName, decodedToken?.result?.clinic_id, profile?.doctor_unique_id, profile?.um_name, profile?.um_contact]);

  // Reset all states on mount (same as web version)
  useEffect(() => {
    dispatch(resetVaccineState());
    dispatch(resetGrowthChartState());
    dispatch(resetObstetricState());
    dispatch(resetUploadDocState());
    dispatch(resetDDxState());
  }, [dispatch]);

  // Load patient list using All Patients API (listDashboard) - same as All Patients page
  useEffect(() => {
    let cancelled = false;
    
    const loadPatientList = async () => {
      setLoadingList(true);
      try {
        const params = {
          search: searchQuery,
          page: pageNo,
          limit: PATIENT_LIST_PAGE_SIZE,
        };
        const res = await fetchAllPatients(params);
        if (!cancelled) {
          // API returns { patients: [], total, totalPages } via axiosService (returns response.data)
          const list = res?.patients || [];
          const totalPages = res?.totalPages || 1;
          
          // If page 1 or search changed, replace list; otherwise append
          if (pageNo === 1 || searchQuery !== "") {
            setPatientsList(Array.isArray(list) ? list : []);
          } else {
            setPatientsList((prev) => [...prev, ...(Array.isArray(list) ? list : [])]);
          }
          
          // Check if there are more pages
          setHasMore(pageNo < totalPages);
        }
      } catch (error) {
        console.error('[WalkIn] Error loading patient list:', error);
        if (!cancelled) {
          if (pageNo === 1) {
            setPatientsList([]);
          }
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
        }
      }
    };

    // Debounce search when user types, immediate load when empty (initial load)
    if (searchQuery) {
      const timeOutId = setTimeout(loadPatientList, 500);
      return () => {
        cancelled = true;
        clearTimeout(timeOutId);
      };
    } else {
      // Load immediately when search is empty (initial load or cleared)
      loadPatientList();
      return () => {
        cancelled = true;
      };
    }
  }, [searchQuery, pageNo]);

  const handleSearchChange = useCallback((value) => {
    // Track search event (same as web version)
    if (window.Moengage && profile && clinicName) {
      window.Moengage.track_event("TP_Patient_searched", {
        clinic_name: clinicName,
      });
    }
    setSearchQuery(value);
    setPageNo(1); // Reset to page 1 when search changes
  }, [profile, clinicName]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setPageNo(1); // Reset to page 1 when search is cleared
  }, []);

  // Intersection Observer for infinite scroll (same as All Patients)
  const lastPatientElementRef = useCallback(
    (node) => {
      if (loadingList) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPageNo((prevPageNo) => prevPageNo + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadingList, hasMore]
  );

  const handleBackClick = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handlePatientDetails = useCallback((patient) => {
    navigate('/patient_details', {
      state: { patient_data: patient }
    });
  }, [navigate]);

  const handleVoiceRx = useCallback((patient) => {
    navigateVoiceRx(
      {
        patient_data: patient,
        isFromTabView: true
      },
      {},
      "mobile_walk_in_patient_selected"
    );
  }, [navigateVoiceRx]);

  const handleAddNewPatient = useCallback(() => {
    // Same logic as web version
    if (window.Moengage && profile) {
      const clinic_name = getClinicName(profile?.hospital_data);
      window.Moengage.track_event("TP_Add_Patient_clicked", {
        clinic_name,
      });
    }
    
    if (searchQuery.length === 10 && isNumeric(searchQuery)) {
      navigate("/add_patient", {
        state: { patient_data: { pm_fullname: '', pm_contact_no: searchQuery }, from: 'walk_in_consultation' }
      });
    } else if (searchQuery.length > 0 && isAlphabet(searchQuery)) {
      navigate("/add_patient", {
        state: { patient_data: { pm_fullname: searchQuery, pm_contact_no: '' }, from: 'walk_in_consultation' }
      });
    } else {
      navigate("/add_patient", { state: { from: 'walk_in_consultation' } });
    }
  }, [searchQuery, profile, navigate]);

  return (
    <div className="mobile-walk-in-consultation">
      {/* Header */}
      <div className="header-container">
        <div className="page-header">
          <div className="header-bar">
            <button 
              className="back-button"
              onClick={handleBackClick}
              type="button"
            >
              <img src={arrowLeftIcon} alt="Back" className="back-icon" />
            </button>
            <h1 className="page-title">Walk-in Consultation</h1>
          </div>
          <div className="search-container">
            <Input
              value={searchQuery}
              placeholder="Search by Name/ ID/ Mobile Number"
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

      {/* Content */}
      <div className="content-container">
        {loadingList ? (
          <div className="patients-shimmer">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="patient-shimmer-item">
                <div className="shimmer-avatar-section">
                  <div className="shimmer-avatar"></div>
                  <div className="shimmer-info">
                    <div className="shimmer-header"></div>
                    <div className="shimmer-details">
                      <div className="shimmer-line shimmer-details-text"></div>
                    </div>
                  </div>
                </div>
                <div className="shimmer-divider"></div>
                <div className="shimmer-actions">
                  <div className="shimmer-button"></div>
                  <div className="shimmer-button"></div>
                </div>
              </div>
            ))}
          </div>
        ) : patientsList && patientsList.length > 0 ? (
          <div className="patients-list">
            {patientsList.map((patient, index) => {
              // Attach ref to the last patient card for infinite scroll
              const isLastElement = index === patientsList.length - 1;
              return (
                <div key={patient.pm_pid || patient.pm_patient_id || patient.patient_unique_id || index} ref={isLastElement ? lastPatientElementRef : null}>
                  <WalkInPatientCard
                    patient={patient}
                    searchQuery={searchQuery}
                    onPatientDetails={handlePatientDetails}
                    onVoiceRx={handleVoiceRx}
                    doctorDetails={doctorDetails}
                    profile={profile}
                  />
                </div>
              );
            })}
            {/* Loading spinner for next page */}
            {loadingList && hasMore && (
              <div className="loading-more" style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Spin />
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>No patients found</p>
            <p className="empty-subtitle">
              {searchQuery ? 'Try adjusting your search criteria' : 'No patients available at the moment'}
            </p>
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
  );
}

export default React.memo(WalkInConsultation);
