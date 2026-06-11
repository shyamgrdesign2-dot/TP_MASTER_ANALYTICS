import React, { useState } from 'react';
import { Drawer } from 'antd';
import moment from 'moment';
import { TAB_QUEUE } from '../../../../utils/constants';

import './DateSelectorModal.scss';
import { ASSETS } from "../../../../assets";
const closeIcon = ASSETS.mobile.close2;

function DateSelectorModal({ 
  visible, 
  onClose, 
  onDateSelect,
  selectedTab,
  currentDate 
}) {
  const [selectedMonth, setSelectedMonth] = useState(moment().month());
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedDate, setSelectedDate] = useState(moment(currentDate));

  // Quick select options based on tab
  const getQuickOptions = () => {
    if (selectedTab === TAB_QUEUE) {
      // Next filters for Queue tab
      return [
        { label: 'Today', value: 'today' },
        { label: 'Next 7 days', value: 'next7' },
        { label: 'Next 30 days', value: 'next30' },
      ];
    } else {
      // Past filters for Finished and Cancelled tabs
      return [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 days', value: 'last7' },
        { label: 'Last 30 days', value: 'last30' },
      ];
    }
  };

  const quickOptions = getQuickOptions();

  // Generate calendar days
  const generateCalendar = () => {
    const firstDay = moment().year(selectedYear).month(selectedMonth).startOf('month');
    const lastDay = moment().year(selectedYear).month(selectedMonth).endOf('month');
    const startDate = firstDay.clone().startOf('week').day(1); // Start from Monday
    const endDate = lastDay.clone().endOf('week').day(7); // End on Sunday

    const calendar = [];
    const day = startDate.clone();

    while (day.isSameOrBefore(endDate, 'day')) {
      calendar.push(day.clone());
      day.add(1, 'day');
    }

    return calendar;
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date.format('YYYY-MM-DD'), date.format('YYYY-MM-DD'), 'custom');
    }
    onClose();
  };

  const handleQuickSelect = (option) => {
    let startDate, endDate;
    const today = moment();

    switch (option) {
      case 'today':
        startDate = today.clone();
        endDate = today.clone();
        break;
      case 'next7':
        startDate = today.clone();
        endDate = today.clone().add(7, 'days');
        break;
      case 'next30':
        startDate = today.clone();
        endDate = today.clone().add(30, 'days');
        break;
      case 'last7':
        startDate = today.clone().subtract(7, 'days');
        endDate = today.clone();
        break;
      case 'last30':
        startDate = today.clone().subtract(30, 'days');
        endDate = today.clone();
        break;
      default:
        return;
    }

    if (onDateSelect) {
      onDateSelect(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), option);
    }
    onClose();
  };

  const handleMonthChange = (direction) => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const calendarDays = generateCalendar();
  const today = moment();
  const currentMonthYear = moment().year(selectedYear).month(selectedMonth).format('MMMM YYYY');

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="auto"
      className="date-selector-modal"
      closable={false}
      maskClosable={true}
      destroyOnClose={true}
      maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="date-selector-content">
        <div className="modal-header">
          <h3 className="modal-title">Select Date</h3>
          <button 
            className="close-btn" 
            onClick={onClose} 
            type="button"
            aria-label="Close modal"
          >
            <img src={closeIcon} alt="Close" className="close-icon" />
          </button>
        </div>

        {/* Calendar */}
        <div className="calendar-container">
          <div className="calendar-header">
            <button 
              className="month-nav-btn"
              onClick={() => handleMonthChange('prev')}
            >
              ‹
            </button>
            <div className="month-year">{currentMonthYear}</div>
            <button 
              className="month-nav-btn"
              onClick={() => handleMonthChange('next')}
            >
              ›
            </button>
          </div>

          <div className="calendar-weekdays">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>

          <div className="calendar-days">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.month() === selectedMonth;
              const isToday = day.isSame(today, 'day');
              const isSelected = day.isSame(selectedDate, 'day');

              return (
                <button
                  key={index}
                  className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => isCurrentMonth && handleDateClick(day)}
                  disabled={!isCurrentMonth}
                >
                  {day.format('DD')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Select Options */}
        <div className="quick-select-options">
          {quickOptions.map((option) => (
            <button
              key={option.value}
              className="quick-select-btn"
              onClick={() => handleQuickSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

export default DateSelectorModal;
