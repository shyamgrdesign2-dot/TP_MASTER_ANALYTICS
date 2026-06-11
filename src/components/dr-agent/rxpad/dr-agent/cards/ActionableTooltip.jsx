import React from "react";
import { HoverTooltip } from "../../../atoms/Tooltip";

export function ActionableTooltip({ children, label, onAction }) {
  const handleClick = (e) => {
    if (e.target?.closest?.("button")) return;
    onAction?.(e);
  };

  return (
    <HoverTooltip content={label} side="top">
      <span onClick={handleClick} style={{ cursor: "pointer" }}>
        {children}
      </span>
    </HoverTooltip>
  );
}
