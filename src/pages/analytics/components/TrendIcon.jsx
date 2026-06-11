import React from "react";

// Diagonal trend arrows (per the shared reference): a line rising/falling to a
// corner arrowhead. Stroke = currentColor so the parent's text colour applies.
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeMiterlimit: 10,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const TrendUp = ({ size = 13, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
    <path d="M6.34 18.56L17.66 7.25" {...stroke} />
    <path d="M9.04 7.25H17.66V15.87" {...stroke} />
  </svg>
);

export const TrendDown = ({ size = 13, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
    <path d="M6.34 7.25L17.66 18.56" {...stroke} />
    <path d="M9.04 18.56H17.66V9.94" {...stroke} />
  </svg>
);

export const TrendFlat = ({ size = 13, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
    <path d="M5 12H19" {...stroke} />
  </svg>
);
