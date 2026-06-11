import React from 'react';
import moment from 'moment';

import './VisitDateSelector.scss';
import { ASSETS } from "../../../../assets";
const {
  arrowBoxLeft,
  arrowBoxRight,
} = ASSETS.mobile;
const calendarIcon = ASSETS.images.calendar2;

function VisitDateSelector({ 
  consultationDate, 
  onPrevious, 
  onNext, 
  hasPrevious = false, 
  hasNext = false 
}) {
  const formattedDate = consultationDate 
    ? moment(consultationDate).format('DD MMM YYYY | hh:mm A')
    : moment().format('DD MMM YYYY | hh:mm A');

  return (
    <div className="visit-date-selector">
      <button 
        className="date-nav-button prev-button" 
        onClick={onPrevious}
        disabled={!hasPrevious}
        type="button"
        aria-label="Previous visit"
      >
        <img src={arrowBoxLeft} alt="" />
      </button>
      
      <div className="date-display">
        <img 
          src={calendarIcon}
          alt="calendar" 
          className="calendar-icon"
        />
        <span className="date-text">{formattedDate}</span>
      </div>
      
      <button 
        className="date-nav-button next-button" 
        onClick={onNext}
        disabled={!hasNext}
        type="button"
        aria-label="Next visit"
      >
        <img src={arrowBoxRight} alt="" />
      </button>
    </div>
  );
}

// MOBILE OPTIMIZATION: Memoize component to prevent re-renders when props haven't changed
// This component receives memoized callbacks (nextPress, prevPress) from parent
export default React.memo(VisitDateSelector);

