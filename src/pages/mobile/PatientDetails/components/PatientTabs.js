import React, { useRef, useEffect } from 'react';

import './PatientTabs.scss';
import { ASSETS } from "../../../../assets";
const indicatorIcon = ASSETS.mobile.indicator;

function PatientTabs({ tabs, selectedTab, onTabChange, showProfile = false }) {
  const tabsContainerRef = useRef(null);

  // Auto-scroll to active tab when it changes
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeTabIndex = tabs.findIndex(tab => tab.key === selectedTab);
      const activeTabElement = tabsContainerRef.current.children[activeTabIndex];
      
      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [selectedTab, tabs]);

  return (
    <div
      ref={tabsContainerRef}
      className="patient-tabs tabs-sticky"
    >
      {tabs.map((tab) => {
        const isActive = selectedTab === tab.key;
        return (
          <button
            key={tab.key}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
            type="button"
          >
            <div className="tab-content">
              {tab.icon && (
                <img
                  src={tab.icon}
                  alt=""
                  className="tab-icon"
                />
              )}
              <span className="tab-label">{tab.label}</span>
            </div>
            {isActive && <img src={indicatorIcon} alt="" className="tab-indicator" />}
          </button>
        );
      })}
    </div>
  );
}

// MOBILE OPTIMIZATION: Memoize component to prevent re-renders when props haven't changed
// This component receives memoized tabs array and handleTabChange callback from parent
export default React.memo(PatientTabs);
