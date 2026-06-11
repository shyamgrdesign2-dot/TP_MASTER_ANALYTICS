import React from "react";
import "./BubbleSkeleton.css";

const BubbleSkeleton = () => {
  return (
    <div className="bubble-skeleton-container">
      <div className="bubble-skeleton">
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
        <div className="bubble-skeleton-header"></div>
      </div>
    </div>
  );
};

export default BubbleSkeleton;
