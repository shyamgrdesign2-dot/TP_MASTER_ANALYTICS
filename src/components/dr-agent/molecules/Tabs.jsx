import React, { createContext, useCallback, useContext, useRef, useState } from "react";

const TabsCtx = createContext(null);

export function Tabs({ children, defaultValue, value, onValueChange }) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const active = value ?? internal;
  const setActive = useCallback((v) => {
    setInternal(v);
    onValueChange?.(v);
  }, [onValueChange]);

  return (
    <TabsCtx.Provider value={{ active, setActive }}>
      {children}
    </TabsCtx.Provider>
  );
}

export function TabsList({ children, className, ...rest }) {
  const ctx = useContext(TabsCtx);
  const listRef = useRef(null);

  const handleKeyDown = (e) => {
    const triggers = Array.from(listRef.current?.querySelectorAll("[role='tab']") ?? []);
    const idx = triggers.indexOf(document.activeElement);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      triggers[(idx + 1) % triggers.length]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      triggers[(idx - 1 + triggers.length) % triggers.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      triggers[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      triggers[triggers.length - 1]?.focus();
    }
  };

  return (
    <div ref={listRef} role="tablist" onKeyDown={handleKeyDown} className={className} {...rest}>
      {children}
    </div>
  );
}

export function TabsTrigger({ children, value, className, disabled, ...rest }) {
  const ctx = useContext(TabsCtx);
  const isActive = ctx?.active === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      onClick={() => ctx?.setActive(value)}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, value, className, ...rest }) {
  const ctx = useContext(TabsCtx);
  if (ctx?.active !== value) return null;
  return (
    <div role="tabpanel" className={className} {...rest}>
      {children}
    </div>
  );
}
