import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { usePosition } from "../hooks/use-overlay";

const TooltipContext = createContext(null);
const ProviderCtx = createContext({ delayDuration: 400 });

export function TooltipProvider({ children, delayDuration = 400 }) {
  return <ProviderCtx.Provider value={{ delayDuration }}>{children}</ProviderCtx.Provider>;
}

export function Tooltip({ children, title, placement }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const { delayDuration } = useContext(ProviderCtx);

  const scheduleOpen = useCallback(() => {
    clearTimeout(closeTimerRef.current);
    openTimerRef.current = setTimeout(() => setOpen(true), delayDuration);
  }, [delayDuration]);

  const scheduleClose = useCallback((delay = 100) => {
    clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), delay);
  }, []);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimerRef.current);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(openTimerRef.current);
    clearTimeout(closeTimerRef.current);
    setOpen(false);
  }, []);

  useEffect(() => () => {
    clearTimeout(openTimerRef.current);
    clearTimeout(closeTimerRef.current);
  }, []);

  // MUI-compat: if title + placement passed directly (no compound API)
  if (title !== undefined) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={placement === "top" ? "top" : placement || "top"}>
          {title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <TooltipContext.Provider value={{ open, setOpen, scheduleOpen, scheduleClose, cancelClose, hide, triggerRef }}>
      {children}
    </TooltipContext.Provider>
  );
}

// Also support: <Tooltip content="..." side="top"><button>...</button></Tooltip>
Tooltip.displayName = "Tooltip";

export function TooltipTrigger({ children, asChild = false }) {
  const ctx = useContext(TooltipContext);

  if (!ctx) return children;

  const props = {
    ref: ctx.triggerRef,
    onPointerEnter: () => ctx.scheduleOpen(),
    onPointerLeave: () => ctx.scheduleClose(),
    onFocus: () => ctx.scheduleOpen(),
    onBlur: () => ctx.scheduleClose(200),
    "data-tooltip-trigger": "true",
  };

  if (asChild) {
    return React.cloneElement(React.Children.only(children), props);
  }
  return <span {...props}>{children}</span>;
}

export function TooltipContent({ children, side = "top", align = "center", sideOffset = 6, className, ...rest }) {
  const ctx = useContext(TooltipContext);
  const floatingRef = useRef(null);

  const pos = usePosition({
    triggerRef: ctx?.triggerRef ?? { current: null },
    floatingRef,
    open: ctx?.open ?? false,
    side,
    align,
    sideOffset,
  });

  if (!ctx?.open || children == null || children === "") return null;

  const content = (
    <div
      ref={floatingRef}
      role="tooltip"
      className={["tp-dr-agent-tooltip", className].filter(Boolean).join(" ")}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        pointerEvents: "none",
        maxWidth: 300,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
        lineHeight: 1.5,
        background: "#0f172a",
        color: "#fff",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      }}
      {...rest}
    >
      {children}
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

/**
 * HoverTooltip — simple hover-only tooltip wrapper used by voicerx components.
 * Shows a small label above the trigger on hover.
 */
export function HoverTooltip({ children, label, content, side = "top", align = "center" }) {
  const tooltipLabel = label ?? content;
  if (tooltipLabel == null || tooltipLabel === "") return children;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align}>{tooltipLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
