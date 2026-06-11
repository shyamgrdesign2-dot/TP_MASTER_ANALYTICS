import React from "react";
import "./GradientProgressBar.css";

const GradientProgressBar = ({ height = "10px", value = 0 }) => {
  const gradientColors = [
    "#ff0000", // Red
    "#ff7f00", // Orange
    "#ffff00", // Yellow
    "#00ff00", // Green
    "#0000ff", // Blue
    "#4b0082", // Indigo
    "#9400d3", // Violet
  ];

  return (
    <div
      className="progress-bar-container"
      style={{ height, width: "341px", background: "#7373734D" }}
      aria-label="loading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      role="progressbar"
    >
      <div
        className="progress-bar"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: `linear-gradient(90deg, ${gradientColors.join(", ")})`,
          height: "100%",
          transition: "width 1200ms linear",
          borderRadius: "999px",
        }}
      />
    </div>
  );
};

export default GradientProgressBar;
