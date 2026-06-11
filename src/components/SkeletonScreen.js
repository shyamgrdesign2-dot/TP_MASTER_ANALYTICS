import React from "react";
import "./SkeletonScreen.css"; // Import the styles

const SkeletonScreen = () => {
  return (
    <div className="skeleton-container">
      <div className="skeleton-header"></div>
      <div className="skeleton-card"></div>
      <div className="skeleton-header"></div>
      <div className="skeleton-card"></div>
      <div className="skeleton-header"></div>
      <div className="skeleton-card"></div>
    </div>
  );
};

export default SkeletonScreen;
