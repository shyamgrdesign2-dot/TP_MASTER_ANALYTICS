import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useEscape, useClickOutside, usePosition } from "../hooks/use-overlay";

const MenuCtx = createContext(null);

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  return (
    <MenuCtx.Provider value={{ open, toggle, close }}>
      {children}
    </MenuCtx.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild = false }) {
  const ctx = useContext(MenuCtx);
  const ref = useRef(null);

  const props = {
    ref,
    onClick: ctx?.toggle,
    "aria-haspopup": "menu",
    "aria-expanded": ctx?.open,
    "data-dropdown-trigger": "true",
  };

  if (asChild) {
    return React.cloneElement(React.Children.only(children), { ...props, ref });
  }
  return <button type="button" {...props}>{children}</button>;
}

export function DropdownMenuContent({ children, side = "bottom", align = "start", sideOffset = 4, className, style, ...rest }) {
  const ctx = useContext(MenuCtx);
  const floatingRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const trigger = document.querySelector("[data-dropdown-trigger='true']");
    if (trigger) triggerRef.current = trigger;
  });

  useEscape(ctx?.close, ctx?.open);
  useClickOutside([floatingRef, triggerRef], ctx?.close, ctx?.open);

  const pos = usePosition({ triggerRef, floatingRef, open: ctx?.open ?? false, side, sideOffset, align });

  if (!ctx?.open) return null;

  const content = (
    <div
      ref={floatingRef}
      role="menu"
      className={className}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9500,
        background: "#fff",
        borderRadius: 10,
        border: "1px solid rgba(15,23,42,0.10)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
        minWidth: 160,
        padding: "4px 0",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

export function DropdownMenuItem({ children, onClick, className, disabled, ...rest }) {
  const ctx = useContext(MenuCtx);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={className}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
        ctx?.close();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "8px 12px",
        fontSize: 13,
        background: "none",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "background 120ms ease",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className }) {
  return <div role="separator" className={className} style={{ height: 1, background: "rgba(15,23,42,0.08)", margin: "4px 0" }} />;
}

export function DropdownMenuLabel({ children, className }) {
  return <div className={className} style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{children}</div>;
}

// Stubs for API parity
export const DropdownMenuCheckboxItem = DropdownMenuItem;
export const DropdownMenuRadioItem = DropdownMenuItem;
export const DropdownMenuSub = ({ children }) => children;
export const DropdownMenuSubTrigger = DropdownMenuTrigger;
export const DropdownMenuSubContent = DropdownMenuContent;
export const DropdownMenuGroup = ({ children }) => <>{children}</>;
export const DropdownMenuShortcut = ({ children }) => <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>{children}</span>;
export const DropdownMenuRadioGroup = ({ children }) => <>{children}</>;
