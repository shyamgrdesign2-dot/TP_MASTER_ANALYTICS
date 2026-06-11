import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../../../../utils/localStorage';
import { PERSISTANT_STORAGE_KEY_MEDECO_TOKEN } from '../../../../utils/constants';
import config from '../../../../config';
import './BottomNavigation.scss';
import { ASSETS } from "../../../../assets";
const {
  arrowUp: HomeIcon,
  frame: AppointmentsIcon,
  profile2user: PatientsIcon,
  profile2user2: PatientsIconActive,
} = ASSETS.mobile;

function BottomNavigation({ activeTab = 'appointments' }) {
  const navigate = useNavigate();
  const [getMedecoToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_MEDECO_TOKEN);

  const navItems = [
    {
      key: 'home',
      label: 'Home',
      icon: HomeIcon,
      path: '/',
    },
    {
      key: 'appointments',
      label: 'Appointments',
      icon: AppointmentsIcon,
      path: '/',
    },
    {
      key: 'patients',
      label: 'All Patients',
      icon: PatientsIcon,
      iconActive: PatientsIconActive,
      path: '/all_patients',
    },
  ];

  const handleNavClick = (item) => {
    // If clicking home and user came from Medeco, navigate back to Medeco site
    if (item.key === 'home') {
      const medecoToken = getMedecoToken();
      if (medecoToken) {
        const medecoUrl = `${config.MEDECO_WEBVIEW_URL}/?authToken=${medecoToken}`;
        console.log("[TP Medeco] Going to Medeco – redirect URL:", medecoUrl);
        console.log("[TP Medeco] Using medecoToken from localStorage, length:", medecoToken?.length);
        window.location.href = medecoUrl;
        return;
      }
      console.log("[TP Medeco] Home clicked but no medecoToken – staying in app");
    }
    
    // Otherwise, navigate normally
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className="bottom-navigation">
      <div className="nav-content">
        {navItems.map((item, index) => {
          const isActive = activeTab === item.key;
          const iconSrc = isActive && item.iconActive ? item.iconActive : item.icon;
          
          return (
            <React.Fragment key={item.key}>
              <button
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item)}
                data-tab={item.key}
              >
                <img src={iconSrc} alt={item.label} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
              {index === 0 && (
                <div className="nav-divider" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default BottomNavigation;
