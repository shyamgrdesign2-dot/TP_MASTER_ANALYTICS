import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Input, Spin } from 'antd';
import './WalkInConsultationZydus.scss';
import WalkInPatientCard from '../WalkInConsultation/components/WalkInPatientCard';
import { searchPatients } from '../../../redux/appointmentsSlice';
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

function WalkInConsultationZydus() {
  const navigate = useNavigate();
  const navigateVoiceRx = useVoiceRxNavigation();
  const dispatch = useDispatch();
  const decodedToken = getDecodedToken();
  const observer = useRef();
  
  const { profile, loading: profileLoading } = useSelector((state) => state.doctors);
  const { patients, loading } = useSelector((state) => state.records);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allPatients, setAllPatients] = useState([]);

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

  // Load initial patient list on mount (empty search for Zydus)
  useEffect(() => {
    dispatch(searchPatients({ searchQuery: "", company: "zydus" }));
  }, [dispatch]);

  // Search with debounce (Zydus-specific search API)
  useEffect(() => {
    if (searchQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(searchPatients({ searchQuery: searchQuery, company: "zydus" }));
        setPageNo(1); // Reset pagination when searching
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      // Load list when search is cleared
      dispatch(searchPatients({ searchQuery: "", company: "zydus" }));
      setPageNo(1);
    }
  }, [searchQuery, dispatch]);

  // Update allPatients when Redux patients change
  useEffect(() => {
    if (patients) {
      if (pageNo === 1 || searchQuery !== "") {
        // Replace list on first page or new search
        setAllPatients(Array.isArray(patients) ? patients : []);
      } else {
        // Append for pagination (if Zydus API supports it in future)
        setAllPatients((prev) => [...prev, ...(Array.isArray(patients) ? patients : [])]);
      }
    }
  }, [patients, pageNo, searchQuery]);

  const handleSearchChange = useCallback((value) => {
    // Track search event (same as web version)
    if (window.Moengage && profile && clinicName) {
      window.Moengage.track_event("TP_Patient_searched", {
        clinic_name: clinicName,
      });
    }
    setSearchQuery(value);
  }, [profile, clinicName]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Intersection Observer for infinite scroll (prepared for future Zydus pagination)
  const lastPatientElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPageNo((prevPageNo) => prevPageNo + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
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
      "mobile_zydus_walk_in_patient_selected"
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

  const displayPatients = allPatients.length > 0 ? allPatients : patients || [];

  return (
    <div className="mobile-walk-in-consultation-zydus">
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
            <h1 className="page-title">Walk-in Consultation (Zydus)</h1>
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
        {loading && pageNo === 1 ? (
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
        ) : displayPatients && displayPatients.length > 0 ? (
          <div className="patients-list">
            {displayPatients.map((patient, index) => {
              // Attach ref to the last patient card for infinite scroll
              const isLastElement = index === displayPatients.length - 1;
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
            {loading && hasMore && pageNo > 1 && (
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

export default React.memo(WalkInConsultationZydus);
