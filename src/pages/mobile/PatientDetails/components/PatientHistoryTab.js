import React from 'react';
import { message } from 'antd';
import PropTypes from 'prop-types';
// Temporarily commented out - will be implemented in next phase
// import { useState, useMemo } from 'react';
// import VitalsBodyComposition from '../../../../components/VitalsBodyComposition';
// import MedicalHistory from '../../../../components/MedicalHistory';
// import VisitVaccination from '../../../vaccination/components/visitVaccination/VisitVaccination';
// import VisitGrowthChart from '../../../growthChart/components/visitGrowthChart/VisitGrowthChart';
// import VisitObstetric from '../../../obstetric/components/visitObstetric/VisitObstetric';
// import VisitLabParameters from '../../../../components/VisitLabParameters';
// import CarePlanBox from '../../../../components/CarePlanBox';
// 
// 
// 
// 
// 
// 
// 
import { MESSAGE_KEY } from '../../../../utils/constants';
import './PatientHistoryTab.scss';
import { ASSETS } from "../../../../assets";
const {
  medicalHistory: medicalHistoryIcon,
  vitals: vitalsIcon,
  vaccination: vaccinationIcon,
  growthChart: growthChartIcon,
  lab: labIcon,
  notes: notesIcon,
  healthCare: healthCareIcon,
} = ASSETS.mobile;

function PatientHistoryTab({
  patient_data,
  viewCaseManagerData,
  loading,
  tcmData,
  isVaccinationAccessable,
  isGrowthChartAccessable,
  userId,
  onSectionClick,
}) {
  // Temporarily commented out - will be implemented in next phase
  // const [expandedSections, setExpandedSections] = useState({});
  //
  // const toggleSection = (sectionId) => {
  //   if (!sectionId || loading) return;
  //   
  //   setExpandedSections((prev) => ({
  //     ...prev,
  //     [sectionId]: !prev[sectionId],
  //   }));
  //   
  //   if (onSectionClick) {
  //     onSectionClick(sectionId);
  //   }
  // };
  //
  // const historySections = useMemo(() => [
  //   // ... all sections logic
  // ], [dependencies]);
  //
  // return (
  //   <div className="patient-history-tab">
  //     <div className="history-accordions">
  //       {historySections.map((section, index) => {
  //         // ... accordion rendering logic
  //       })}
  //     </div>
  //   </div>
  // );

  // Coming soon CTA - non clickable for now
  // const handleCardClick = () => {
  //   message.open({
  //     key: MESSAGE_KEY,
  //     type: '',
  //     className: 'message-appointment',
  //     content: 'Feature coming in the next update',
  //     duration: 3,
  //   });
  // };

  return (
    <div className="patient-history-tab">
      <div className="billing-tab">
        <div className="billing-tab-greyed-card">
          <div className="billing-tab-content">
            <div className="billing-tab-icon-wrapper">
              <div className="billing-tab-icon">
                <i className="icon-patients" />
              </div>
            </div>
            <div className="billing-tab-text">
              <h3 className="billing-tab-title">Patient History</h3>
              <p className="billing-tab-subtitle">This feature will be available soon</p>
            </div>
            <div className="billing-tab-badge">
              <span>Coming Soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

PatientHistoryTab.propTypes = {
  patient_data: PropTypes.object,
  viewCaseManagerData: PropTypes.object,
  loading: PropTypes.bool,
  tcmData: PropTypes.object,
  isVaccinationAccessable: PropTypes.bool,
  isGrowthChartAccessable: PropTypes.bool,
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSectionClick: PropTypes.func,
};

PatientHistoryTab.defaultProps = {
  patient_data: null,
  viewCaseManagerData: null,
  loading: false,
  tcmData: null,
  isVaccinationAccessable: false,
  isGrowthChartAccessable: false,
  userId: null,
  onSectionClick: null,
};

export default PatientHistoryTab;
