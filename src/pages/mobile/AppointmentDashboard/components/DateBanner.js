import React from 'react';
import './DateBanner.scss';
import { ASSETS } from "../../../../assets";
const {
  calendar2: CalendarIcon,
  caret: CaretIcon,
} = ASSETS.images;

function DateBanner({ date, onClick, showDropdown = true }) {
  return (
    <div className="date-banner" onClick={onClick}>
      <div className="date-banner-content">
        <img 
          src={CalendarIcon}
          alt="calendar" 
          className="calendar-icon"
        />
        <span className="date-text">{date}</span>
        {showDropdown && (
          <img 
            src={CaretIcon}
            alt="dropdown" 
            className="dropdown-icon"
          />
        )}
      </div>
    </div>
  );
}

export default DateBanner;
