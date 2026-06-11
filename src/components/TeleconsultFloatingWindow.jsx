import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  RealtimeKitProvider,
  useRealtimeKitClient,
} from "@cloudflare/realtimekit-react";
import { RtkMeeting } from "@cloudflare/realtimekit-react-ui";

import "./TeleconsultFloatingWindow.scss";
import { ASSETS } from "../assets";
const {
  videoWhite: videoWhiteIcon,
  path: pathIcon,
  minimse: minimseIcon,
  union: unionSvg,
} = ASSETS.images;

const CloseIcon = () => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M4 4l10 10M4 14L14 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 732;
const COLLAPSED_HEIGHT = 275;
const SIDEBAR_WIDTH = 86;

const TeleconsultFloatingWindow = ({ authToken, doctorName, onClose }) => {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [isSidebar, setIsSidebar] = useState(false);
  const [isHeightCollapsed, setIsHeightCollapsed] = useState(false);
  const [position, setPosition] = useState({
    x: typeof window !== "undefined" ? window.innerWidth - DEFAULT_WIDTH - 24 : 100,
    y: 80,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const dragOffset = useRef({ x: 0, y: 0 });
  const durationInterval = useRef(null);
  const leaveWrappedRef = useRef(false);
  const originalLeaveRef = useRef(null);
  const closingRef = useRef(false);
  const originalMeetingMethodsRef = useRef({});

  useEffect(() => {
    if (authToken) {
      initMeeting({ authToken });
    }
  }, [authToken]);

  useEffect(() => {
    if (!meeting || !doctorName) return;
    const displayName = doctorName.trim();
    const setDisplayName = () => {
      if (meeting.changeDisplayName) {
        meeting.changeDisplayName(displayName).catch(() => {});
      }
      if (meeting.self?.setName) {
        try {
          meeting.self.setName(displayName);
        } catch (_) {}
      }
    };
    setDisplayName();
    const t = setTimeout(setDisplayName, 1500);
    return () => clearTimeout(t);
  }, [meeting, doctorName]);

  // Best-effort: try to publish mic audio so backend recording isn't empty.
  useEffect(() => {
    if (!meeting) return;
    try {
      // Different SDK versions expose different method names; try the common ones.
      meeting.enableAudio?.().catch?.(() => {});
      meeting.setAudioEnabled?.(true);
      meeting.setMicrophoneEnabled?.(true);

      meeting.self?.setAudioEnabled?.(true);
      meeting.self?.setMicrophoneEnabled?.(true);
      meeting.self?.setMicEnabled?.(true);
      meeting.self?.unmuteAudio?.();
      meeting.self?.unmute?.();
    } catch (_e) {
      // Ignore; user may deny permissions or SDK may not expose these methods.
    }
  }, [meeting]);

  // Ensure "Leave/End meeting" inside RtkMeeting UI closes floating window too.
  useEffect(() => {
    if (!meeting || leaveWrappedRef.current) return;
    leaveWrappedRef.current = true;
    const wrap = (methodName) => {
      const fn = meeting?.[methodName];
      if (typeof fn !== "function") return;
      const original = fn.bind(meeting);
      originalMeetingMethodsRef.current[methodName] = original;
      if (methodName === "leave") {
        originalLeaveRef.current = original;
      }
      meeting[methodName] = async (...args) => {
        const alreadyClosing = closingRef.current;
        closingRef.current = true;
        try {
          return await original(...args);
        } finally {
          // Only close the window for user-initiated "end/leave" actions.
          // If we're already closing, don't re-trigger.
          if (!alreadyClosing) onClose?.();
        }
      };
    };

    // Most common variants across SDKs/UI for leaving/ending a call.
    wrap("leave");
    wrap("endMeeting");
    wrap("endMeetingForAll");
    wrap("end");
    wrap("terminate");

    return () => {
      // Restore all wrapped methods we touched.
      const originals = originalMeetingMethodsRef.current || {};
      Object.keys(originals).forEach((name) => {
        try {
          meeting[name] = originals[name];
        } catch (_e) {}
      });
      originalMeetingMethodsRef.current = {};
    };
  }, [meeting, onClose]);

  const height = isHeightCollapsed ? COLLAPSED_HEIGHT : DEFAULT_HEIGHT;
  const width = isSidebar ? SIDEBAR_WIDTH : DEFAULT_WIDTH;

  const getClientPosition = (e) => {
    if (e.touches?.[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches?.[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const handleDragStart = (e) => {
    if (e.target.closest(".teleconsult-controls")) return;
    if (isSidebar) return;
    const pos = getClientPosition(e);
    setIsDragging(true);
    dragOffset.current = { x: pos.x - position.x, y: pos.y - position.y };
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const pos = getClientPosition(e);
    const newX = pos.x - dragOffset.current.x;
    const newY = pos.y - dragOffset.current.y;
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleDragEnd = () => setIsDragging(false);

  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleDragMove, { passive: false });
    document.addEventListener("touchend", handleDragEnd);
    return () => {
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
      document.removeEventListener("touchmove", handleDragMove);
      document.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!authToken) return;
    durationInterval.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => {
      if (durationInterval.current) clearInterval(durationInterval.current);
    };
  }, [authToken]);

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handlePathClick = () => {
    setIsSidebar(true);
    setPosition({
      x: window.innerWidth - SIDEBAR_WIDTH,
      y: Math.max(0, Math.min(position.y, window.innerHeight - 363)),
    });
  };

  const handleExpandFromSidebar = () => {
    setIsSidebar(false);
    setPosition({
      x: window.innerWidth - DEFAULT_WIDTH - 24,
      y: position.y,
    });
  };

  const handleClose = async () => {
    if (meeting?.leave) {
      try {
        closingRef.current = true;
        const leaveFn = originalLeaveRef.current || meeting.leave;
        await leaveFn();
      } catch (_) {}
    }
    onClose?.();
  };

  if (!authToken) return null;

  const content = (
    <div
      className={`teleconsult-floating ${isSidebar ? "sidebar" : ""} ${isDragging ? "dragging" : ""}`}
      style={{
        position: "fixed",
        left: isSidebar ? undefined : `${position.x}px`,
        right: isSidebar ? 0 : undefined,
        top: `${position.y}px`,
        zIndex: 999999,
        width: `${width}px`,
        height: isSidebar ? "363px" : `${height}px`,
        background: isSidebar
          ? `url(${unionSvg}) no-repeat center/contain`
          : "linear-gradient(180deg, #060527 0%, rgba(6, 5, 39, 0) 100%)",
        borderRadius: isSidebar ? 0 : "12px",
        boxShadow: isSidebar ? "none" : (isDragging ? "0 20px 50px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.2)"),
        overflow: "hidden",
        transition: isDragging ? "none" : "width 0.3s ease, height 0.3s ease, left 0.3s ease",
        border: isSidebar ? "none" : "1px solid rgba(102, 126, 234, 0.2)",
      }}
    >
      {isSidebar ? (
        <>
          <div
            className="teleconsult-sidebar-content"
            onClick={(e) => {
              e.stopPropagation();
              handleExpandFromSidebar();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleExpandFromSidebar()}
          >
            <div className="teleconsult-sidebar-inner">
              <div className="teleconsult-sidebar-col">
                <div className="teleconsult-audio-gradient-placeholder teleconsult-sidebar-gradient">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="teleconsult-wave-bar" />
                  ))}
                </div>
                <span className="teleconsult-duration">{formatDuration(callDuration)}</span>
              </div>
              <div className="teleconsult-sidebar-col">
                <img src={videoWhiteIcon} alt="" width={24} height={24} className="teleconsult-sidebar-icon" />
                <span className="teleconsult-sidebar-text">Tele-Consultation</span>
              </div>
            </div>
          </div>
          <div className="teleconsult-meeting-wrap teleconsult-meeting-hidden">
            <RealtimeKitProvider value={meeting}>
              <RtkMeeting mode="fill" meeting={meeting} />
            </RealtimeKitProvider>
          </div>
        </>
      ) : (
        <>
          <div
            className="teleconsult-header"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <div className="teleconsult-header-left">
              <img src={videoWhiteIcon} alt="" width={20} height={20} />
              <span style={{ color: "#ffffff" }}>Tele-Consultation</span>
            </div>
            <div className="teleconsult-controls">
              <button
                type="button"
                onClick={handlePathClick}
                className="teleconsult-btn-icon"
                title="Move to side"
              >
                <img src={pathIcon} alt="" width={18} height={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsHeightCollapsed(!isHeightCollapsed)}
                className="teleconsult-btn-icon"
                title={isHeightCollapsed ? "Expand" : "Reduce height"}
              >
                <img src={minimseIcon} alt="" width={18} height={18} />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="teleconsult-btn-icon"
                title="Leave and close"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
          <div className="teleconsult-meeting-wrap">
            <RealtimeKitProvider value={meeting}>
              <RtkMeeting mode="fill" meeting={meeting} />
            </RealtimeKitProvider>
          </div>
        </>
      )}
    </div>
  );

  return createPortal(content, document.body);
};

export default TeleconsultFloatingWindow;
