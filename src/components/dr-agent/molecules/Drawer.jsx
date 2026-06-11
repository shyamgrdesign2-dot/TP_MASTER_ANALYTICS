import React, { createContext, useContext, useEffect } from "react";
import ReactDOM from "react-dom";
import { useEscape, useScrollLock } from "../hooks/use-overlay";

const DrawerCtx = createContext({ open: false, onOpenChange: () => {} });

export function Drawer({ children, open, onOpenChange }) {
  useScrollLock(open);
  useEscape(() => onOpenChange?.(false), open);
  return (
    <DrawerCtx.Provider value={{ open: !!open, onOpenChange }}>
      {children}
    </DrawerCtx.Provider>
  );
}

export function DrawerContent({ children, side = "right", className, style, ...rest }) {
  const { open, onOpenChange } = useContext(DrawerCtx);
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  const sideStyles = {
    right: { right: 0, top: 0, bottom: 0, width: 360 },
    left: { left: 0, top: 0, bottom: 0, width: 360 },
    bottom: { bottom: 0, left: 0, right: 0, height: "60vh" },
    top: { top: 0, left: 0, right: 0 },
  };

  const panel = (
    <div
      className={className}
      style={{
        position: "fixed",
        zIndex: 9800,
        background: "#fff",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        ...sideStyles[side],
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );

  const backdrop = (
    <div
      onClick={() => onOpenChange?.(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9799,
        background: "rgba(0,0,0,0.3)",
      }}
    />
  );

  return ReactDOM.createPortal(
    <>{backdrop}{panel}</>,
    document.body,
  );
}

export function DrawerHeader({ children, className }) {
  return <div className={className} style={{ padding: "16px 20px", borderBottom: "1px solid rgba(15,23,42,0.08)" }}>{children}</div>;
}

export function DrawerFooter({ children, className }) {
  return <div className={className} style={{ padding: "12px 20px", borderTop: "1px solid rgba(15,23,42,0.08)", marginTop: "auto" }}>{children}</div>;
}

export function DrawerTitle({ children, className }) {
  return <h2 className={className} style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{children}</h2>;
}

export function DrawerDescription({ children, className }) {
  return <p className={className} style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>{children}</p>;
}

export function DrawerClose({ children, onClick }) {
  return React.cloneElement(React.Children.only(children), { onClick });
}
