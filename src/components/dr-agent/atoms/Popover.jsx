import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useEscape, useClickOutside, usePosition } from "../hooks/use-overlay";

const PopoverCtx = createContext(null);

export function Popover({ children, open: controlledOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const toggle = useCallback(() => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }, [open, isControlled, onOpenChange]);
  const close = useCallback(() => {
    if (!isControlled) setInternalOpen(false);
    onOpenChange?.(false);
  }, [isControlled, onOpenChange]);
  return (
    <PopoverCtx.Provider value={{ open, toggle, close }}>
      {children}
    </PopoverCtx.Provider>
  );
}

export function PopoverTrigger({ children, asChild = false }) {
  const ctx = useContext(PopoverCtx);
  const ref = useRef(null);

  const props = {
    ref,
    onClick: ctx?.toggle,
    "aria-expanded": ctx?.open,
    "data-popover-trigger": "true",
  };

  if (asChild) {
    return React.cloneElement(React.Children.only(children), { ...props, ref });
  }
  return <button type="button" {...props}>{children}</button>;
}

export function PopoverAnchor({ children }) {
  return <span data-popover-anchor>{children}</span>;
}

export function PopoverContent({ children, side = "bottom", sideOffset = 8, align = "start", className, style, ...rest }) {
  const ctx = useContext(PopoverCtx);
  const floatingRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const trigger = document.querySelector("[data-popover-trigger='true']");
    if (trigger) triggerRef.current = trigger;
  });

  useEscape(ctx?.close, ctx?.open);
  useClickOutside([floatingRef, triggerRef], ctx?.close, ctx?.open);

  const pos = usePosition({ triggerRef, floatingRef, open: ctx?.open ?? false, side, sideOffset, align });

  if (!ctx?.open) return null;

  const content = (
    <div
      ref={floatingRef}
      role="dialog"
      className={className}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9000,
        background: "#fff",
        borderRadius: 10,
        border: "1px solid rgba(15,23,42,0.10)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
