import React from 'react';
import { useSelector } from 'react-redux';
import { Select } from 'antd';
import './ProfileSection.scss';
import { ASSETS } from "../../../../assets";
const {
  image: AvatarImage,
  arrow: ArrowIcon,
} = ASSETS.mobile;

function ProfileSection({ doctorName, specialty, clinicName, profileImage, clinicOptions, selectedHospital, onClinicChange }) {
  const { profile } = useSelector((state) => state.doctors);
  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'D';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Show Select dropdown if multiple clinics, otherwise show clinic name
  const showClinicSelector = clinicOptions && clinicOptions.length > 1;

  return (
    <div className="profile-section">
      <div className="profile-content">
        <div className="profile-avatar">
          <img src={AvatarImage} alt={doctorName || 'Doctor'} />
        </div>
         <div className="profile-info">
           <div className="doctor-name">Hi, {doctorName} <span className="wavy-icon">👋</span></div>
           {showClinicSelector ? (
             <div className="clinic-selector-wrapper">
               <Select
                 className="mobile-clinic-selector"
                 placeholder="Select Clinic"
                 value={selectedHospital || undefined}
                 onChange={onClinicChange}
                 options= {clinicOptions}
                 size="medium"
               />
               <img src={ArrowIcon} alt="dropdown" className="clinic-dropdown-icon" />
             </div>
           ) : (
             clinicName && (
               <div className="clinic-name">{clinicName}</div>
             )
           )}
         </div>
      </div>
    </div>
  );
}

export default ProfileSection;

