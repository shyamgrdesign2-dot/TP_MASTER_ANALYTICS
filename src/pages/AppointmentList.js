import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Header from "../common/Header";
import SidebarDoctor from "../common/SidebarDoctor";
import Welcome from "../common/Welcome";
import Appointment from "../components/AppointmentData";
import AppointmentDashboardMobile from "./mobile/AppointmentDashboard/AppointmentDashboard.js";
import AddNewPatient from "./AddNewPatient";
import EditNewPatient from "./EditNewPatient";
import WalkInConsultation from "./WalkInConsultation";
import MobileWalkInConsultation from "./mobile/WalkInConsultation/WalkInConsultation";
import MobileWalkInConsultationZydus from "./mobile/WalkInConsultationZydus/WalkInConsultationZydus";
import MessagesData from "./MessagesData";
import { useDeviceType } from "../utils/deviceDetection";

import { useSelector, useDispatch } from "react-redux";
import WalkInConsultationZydus from "./WalkInConsultationZydus";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN, GB_CVT_EXT_HOS } from "../utils/constants";
import { jwtDecode } from "jwt-decode";
import { setUserId } from "../redux/doctorsSlice";
import ExtendTrialModal from "./monetization/components/ExtendTrialModal";
import { getClinicName, getTokenData, trackEvent } from "../utils/utils";
import DocumentVerificationPopup from "../components/common/DocumentVerificationPopup";
import config from "../config";
import { getDecodedToken } from "../utils/localStorage";
import { fetchAgents } from "./appointmentAgent/service";
import VoiceRxPromoModal from "../components/VoiceRxPromoModal";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

function AppointmentList() {
  const dispatch = useDispatch();
  let location = useLocation();
  const [locationPath, setLocationPath] = useState("/");
  const { profile } = useSelector((state) => state.doctors);
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const {hospital_business_id} = getTokenData() || {};
  const isZydus = hospital_business_id === config.ZYDUS_BUSINESS_ID;
  const isApollo = config.APOLLO_BUSINESS_IDS.includes(hospital_business_id);
  const [agentsData, setAgentsData] = useState(null);
  const { isMobile: isMobileDevice, isTablet } = useDeviceType();
  const shouldShowMobileDashboard = isMobileDevice && !isTablet && !isReceptionist;
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);

  
  useEffect(() => {
    setLocationPath(location.pathname);
  }, [location]);

  useEffect(() => {
    const clinic_name = getClinicName(profile?.hospital_data);
    trackEvent("TP_Appointment_Page_Landing", {
      clinic_name,
    });
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    try {
      const decoded = jwtDecode(token);
      if (decoded?.result?.user_id) {
        dispatch(setUserId(decoded.result));
      }
    } catch (e) {
      console.error("Error while token decoding: ", e);
    }
  }, []);

  const fetchAgentsData = async () => {
    if (!isReceptionist) {
      // setIsAgentsLoading(true);
      try {
        const decodedToken = getDecodedToken();
        const clinicId = String(decodedToken?.result?.clinic_id);
        const response = await fetchAgents(clinicId);
        if (response) {
          setAgentsData(response.length > 0 && response[response.length - 1]);
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    }
  };

  useEffect(() => {
    if (!isReceptionist) {
      fetchAgentsData();
    }
  }, []);

  return (
    <>
      {!shouldShowMobileDashboard && !isReceptionist && <Header locationPath={locationPath} />}
      <div className="d-flex">
        {!shouldShowMobileDashboard && !isReceptionist && <SidebarDoctor />}
        <div className={`w-100 bg-body ${shouldShowMobileDashboard && locationPath === '/' ? '' : (shouldShowMobileDashboard && locationPath != '/' && locationPath != '/bulk_messages' ? 'vh-100' : 'wrapper')}`}>
          {!shouldShowMobileDashboard && !isReceptionist && (
            <Welcome
              locationPath={locationPath}
              appointmentAgentsData={agentsData}
              backVisible={locationPath == "/" || locationPath == "/bulk_messages" ? false : true}
            />
          )}
          <Routes>
            <Route 
              path="/" 
              element={
                shouldShowMobileDashboard ? (
                  <AppointmentDashboardMobile />
                ) : (
                  <Appointment locationPath={locationPath} appointmentAgentsData={agentsData} />
                )
              } 
            />
            <Route 
              path="walk_in_consultation" 
              element={(isMobileDevice && !isTablet) ? <MobileWalkInConsultation /> : <WalkInConsultation />} 
            />
            <Route 
              path="walk_in_consultation_zydus" 
              element={(isMobileDevice && !isTablet) ? <MobileWalkInConsultationZydus /> : <WalkInConsultationZydus />} 
            />
            <Route path="add_patient" element={<AddNewPatient />} />
            <Route path="edit_patient" element={<EditNewPatient />} />
            <Route path="bulk_messages" element={<MessagesData appointmentAgentsData={agentsData} />} />
          </Routes>
          {(!isZydus && !isApollo && !isCvtExtHosAccessableFromGB) &&  <DocumentVerificationPopup />}
          <VoiceRxPromoModal />
        </div>
      </div>

      <ExtendTrialModal />
    </>
  );
}

export default AppointmentList;
