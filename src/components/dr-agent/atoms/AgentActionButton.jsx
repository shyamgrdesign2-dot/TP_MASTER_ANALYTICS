import React from "react";
import { cn } from "../utils";
import "./AgentActionButton.css";

export function AgentActionButton({
  text,
  prefixIcon,
  suffixIcon,
  variant = "secondary",
  className,
  children,
  ...buttonProps
}) {
  const label = text ?? children;

  return (
    <button
      type="button"
      className={cn(
        "tp-agent-action-btn",
        variant === "secondary" && "tp-agent-action-btn--secondary vrx-cn-secondary-blue",
        className
      )}
      {...buttonProps}
    >
      {prefixIcon ? <span className="tp-agent-action-btn__icon">{prefixIcon}</span> : null}
      {label ? <span className="tp-agent-action-btn__text">{label}</span> : null}
      {suffixIcon ? <span className="tp-agent-action-btn__icon">{suffixIcon}</span> : null}
    </button>
  );
}
