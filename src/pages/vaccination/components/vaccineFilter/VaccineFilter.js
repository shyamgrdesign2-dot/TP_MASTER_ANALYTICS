import React, { useState, useRef, useEffect } from "react";
import { Button, Tooltip } from "antd";

import { VaccinationCategoryEnum } from "../../VaccinationHelper";
import "./VaccineFilter.scss";
import { ASSETS } from "../../../../assets";
const {
  arrowBoxRight: chevron,
  closefill: closeFill,
} = ASSETS.images;

const VaccineFilter = ({
  dateOptions,
  activeDate,
  setActiveDate,
  setSelectedCards,
  setSelectAll,
  activeVaccineTab,
  completeData,
}) => {
  const datesContainerRef = useRef(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    /**
     * scrolling to the specific age option when we comes to vaccination
     * page on the first time
     */
    if (!hasScrolledRef.current && datesContainerRef.current) {
      if (activeDate && activeDate > 0 && activeDate <= dateOptions.length) {
        const monthElement = datesContainerRef.current.children[activeDate];
        if (monthElement) {
          const containerRect =
            datesContainerRef.current.getBoundingClientRect();
          const monthRect = monthElement.getBoundingClientRect();
          const scrollLeft =
            monthRect.left -
            containerRect.left -
            containerRect.width / 2 +
            monthRect.width / 2;
          datesContainerRef.current.scrollTo({
            left: scrollLeft,
            behavior: "smooth",
          });
          hasScrolledRef.current = true;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateOptions]);

  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  const handleLeftToggleScroll = () => {
    if (datesContainerRef.current) {
      datesContainerRef.current.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    }
    setShowLeft(false);
    setShowRight(true);
  };

  const handleRightToggleScroll = () => {
    if (datesContainerRef.current) {
      datesContainerRef.current.scrollTo({
        left: datesContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
    setShowRight(false);
    setShowLeft(true);
  };

  const [showTooltip, setShowTooltip] = useState(true);

  useEffect(() => {
    /**
     * This effect will run when the component mounts (page is visited)
     * Set a timeout to hide the tooltip after a certain delay (e.g., 5 seconds)
     */
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const isOtherVaccinesTab = activeVaccineTab === VaccinationCategoryEnum[1].key;
  const pendingVaccines = dateOptions.filter(
    (item) => item?.alert === "failure"
  );

  // Calculate alert status for Other Vaccines tab
  const getOtherVaccinesAlert = (item) => {
    if (!isOtherVaccinesTab || !completeData) return null;
    
    const vaccines = completeData.get?.(item.label) || [];
    if (vaccines.length === 0) return null;
    
    const allGiven = vaccines.every((v) => v?.tvp_given_date);
    const anyGiven = vaccines.some((v) => v?.tvp_given_date);
    const anyDue = vaccines.some((v) => v?.tvd_due_date);
    
    if (allGiven) {
      return "success";
    } else if (anyGiven || anyDue) {
      return "warning";
    }
    return null;
  };

  const dateOptionHandler = (i) => {
    setActiveDate(i);
    setSelectedCards([]);
    setSelectAll(false);
  };

  const tooltipTitle = () => {
    return (
      <>
        <div className="d-flex align-items-center justify-content-between">
          <span className="warning" />
          <div style={{ paddingLeft: "16px" }}>Vaccine Pending!</div>
          <img
            className="imageStyle"
            src={closeFill}
            alt="closeFill"
            onClick={() => setShowTooltip(false)}
          />
        </div>
        <div>Pending vaccine detected for this timeframe.</div>
      </>
    );
  };

  return (
    <div className="d-flex align-items-center">
      {showLeft && (
        <div className="vaccineFilterStyle">
          <img
            className="clickable imageStyle"
            src={chevron}
            alt="chevron"
            onClick={handleLeftToggleScroll}
            style={{
              cursor: "pointer",
              transform: "rotate(180deg)",
              marginRight: "5px",
            }}
          />
        </div>
      )}
      <div
        className={`datesContainer`}
        ref={datesContainerRef} // Reference to the dates container for scrolling
      >
        {dateOptions.length > 0 &&
          dateOptions.map((item, i) => (
            <Tooltip
              key={i}
              title={tooltipTitle}
              overlayClassName="customTooltip"
              open={
                !isOtherVaccinesTab &&
                showTooltip &&
                pendingVaccines.length === 1 &&
                item.alert === "failure"
              }
              placement="topLeft"
            >
              <Button
                key={i}
                type="text"
                className={`btnStyle btn px-5-16 fs-14 ${
                  i === activeDate ? "activeBtn" : ""
                }`}
                style={{ margin: "0" }}
                onClick={() => dateOptionHandler(i)}
              >
                {(() => {
                  let alertStatus = null;
                  if (isOtherVaccinesTab) {
                    alertStatus = getOtherVaccinesAlert(item);
                  } else {
                    alertStatus = item.alert;
                  }
                  
                  if (alertStatus) {
                    return (
                      <span
                        className={`alertStyle ${
                          alertStatus === "success"
                            ? "success"
                            : alertStatus === "warning"
                            ? "warning"
                            : "failure"
                        }`}
                      />
                    );
                  }
                  return null;
                })()}
                <span
                  className={`btnText ${
                    i === activeDate ? "activeBtnText" : ""
                  }`}
                >
                  {item.label}
                </span>
              </Button>
            </Tooltip>
          ))}
      </div>
      {showRight && (
        <div className="vaccineFilterStyle">
          <img
            className="clickable"
            src={chevron}
            alt="chevron"
            onClick={handleRightToggleScroll}
            style={{
              cursor: "pointer",
              transform: "rotate(0deg)",
              marginLeft: "5px",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default VaccineFilter;
