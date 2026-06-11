import React, { useRef, useEffect } from 'react';
import { TAB_QUEUE, TAB_FINISHED, TAB_CANCELLED } from '../../../../utils/constants';
import './AppointmentTabs.scss';

function AppointmentTabs({
  selectedTab,
  onTabChange,
  queueCount,
  finishedCount,
  cancelledCount,
  showProfile,
}) {
  const tabsContainerRef = useRef(null);
  const tabs = [
    {
      key: TAB_QUEUE,
      label: 'Queue',
      count: queueCount,
      icon: 'icon-Queue',
    },
    {
      key: TAB_FINISHED,
      label: 'Finished',
      count: finishedCount,
      icon: 'icon-Finished',
    },
    {
      key: TAB_CANCELLED,
      label: 'Cancelled',
      count: cancelledCount,
      icon: 'icon-Cancelled',
    },
  ];

  const formatCount = (count) => {
    if (count === 0 || !count) return '00';
    if (count < 10) return `0${count}`;
    return count.toString();
  };

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
      className={`appointment-tabs ${!showProfile ? 'tabs-sticky' : ''}`}
    >
      {tabs.map((tab) => {
        const isActive = selectedTab === tab.key;
        return (
          <button
            key={tab.key}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            <div className="tab-content">
              {isActive && <i className={tab.icon} />}
              <span className="tab-label">
                {tab.label} ({formatCount(tab.count)})
              </span>
            </div>
            {isActive && <div className="tab-indicator" />}
          </button>
        );
      })}
    </div>
  );
}

export default AppointmentTabs;

