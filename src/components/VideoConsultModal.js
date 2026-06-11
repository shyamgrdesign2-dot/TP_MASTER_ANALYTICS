import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { message } from "antd";
import "./VideoConsultModal.scss";

const VideoConsultModal = ({ 
  visible, 
  onClose, 
  videoUrl, 
  patientName, 
  callAction = "join-video-call" 
}) => {
  const isAudioCall = callAction === "join-audio-call";
  const modalTitle = isAudioCall ? "Audio Consultation" : "Video Consultation";
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 500, 
    y: 80 
  });
  const [size, setSize] = useState({
    width: 500,
    height: 400
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const iframeRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const modalRef = useRef(null);
  const checkBlockedTimeoutRef = useRef(null);

  // Get client coordinates from mouse or touch event
  const getClientPosition = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  // Handle dragging start (mouse and touch)
  const handleDragStart = (e) => {
    if (e.target.closest('.video-consult-controls')) return;
    
    const clientPos = getClientPosition(e);
    setIsDragging(true);
    dragOffset.current = {
      x: clientPos.x - position.x,
      y: clientPos.y - position.y,
    };
  };

  const handleDragMove = (e) => {
    if (isDragging) {
      const clientPos = getClientPosition(e);
      const newX = clientPos.x - dragOffset.current.x;
      const newY = clientPos.y - dragOffset.current.y;
      
      // Keep window within viewport bounds
      const maxX = window.innerWidth - 100;
      const maxY = window.innerHeight - 100;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      // Mouse events
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
      // Touch events
      document.addEventListener("touchmove", handleDragMove, { passive: false });
      document.addEventListener("touchend", handleDragEnd);
      document.addEventListener("touchcancel", handleDragEnd);
    } else {
      // Mouse events
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
      // Touch events
      document.removeEventListener("touchmove", handleDragMove);
      document.removeEventListener("touchend", handleDragEnd);
      document.removeEventListener("touchcancel", handleDragEnd);
    }
    return () => {
      // Mouse events
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
      // Touch events
      document.removeEventListener("touchmove", handleDragMove);
      document.removeEventListener("touchend", handleDragEnd);
      document.removeEventListener("touchcancel", handleDragEnd);
    };
  }, [isDragging]);

  // Handle iframe loading
  useEffect(() => {
    if (visible && videoUrl) {
      setIsLoading(true);
      setIframeBlocked(false);
      
      // Set a timeout to hide loading after 5 seconds regardless
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 5000);

      // Check if iframe is blocked after 15 seconds
      checkBlockedTimeoutRef.current = setTimeout(() => {
        if (iframeRef.current) {
          try {
            // Try to access iframe's contentWindow
            const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
            if (!iframeDoc) {
              setIframeBlocked(true);
            }
          } catch (e) {
            // Cross-origin access will throw an error, which is fine - it means iframe loaded
          }
        }
      }, 15000);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (checkBlockedTimeoutRef.current) {
        clearTimeout(checkBlockedTimeoutRef.current);
      }
    };
  }, [visible, videoUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
  };

  const handleIframeError = (error) => {
    console.error('VideoConsultModal: Iframe load error:', error);
    setIsLoading(false);
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    message.warning('Video call interface loaded. If you don\'t see the video, please check your permissions.');
  };

  // Handle escape key to close
  useEffect(() => {
    if (!visible) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isMinimized) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [visible, onClose, isMinimized]);

  if (!visible || !videoUrl) return null;

  const modalContent = (
    <div
      ref={modalRef}
      className={`video-consult-floating ${isMinimized ? "minimized" : ""} ${isDragging ? "dragging" : ""}`}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 999999,
        width: isMinimized ? "320px" : `${size.width}px`,
        height: isMinimized ? "56px" : `${size.height}px`,
        backgroundColor: "#fff",
        borderRadius: "12px",
        boxShadow: isDragging 
          ? "0 20px 50px rgba(0,0,0,0.3)" 
          : "0 10px 30px rgba(0,0,0,0.2)",
        overflow: "hidden",
        transition: isDragging ? "none" : "height 0.3s ease, width 0.3s ease, box-shadow 0.3s ease",
        border: "1px solid rgba(102, 126, 234, 0.3)",
      }}
    >
      {/* Header */}
      <div
        className="video-consult-header"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          padding: "12px 16px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
          WebkitUserSelect: "none",
          height: "56px",
          touchAction: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
          <i 
            className={isAudioCall ? "icon-microphone" : "icon-video"} 
            style={{ fontSize: "18px", flexShrink: 0 }} 
          />
          <span style={{ 
            fontWeight: 600, 
            fontSize: "15px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {patientName || modalTitle}
          </span>
        </div>
        <div className="video-consult-controls" style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "6px 10px",
              fontSize: "18px",
              fontWeight: "bold",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? "□" : "_"}
          </button>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "6px 10px",
              fontSize: "18px",
              fontWeight: "bold",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 77, 77, 0.8)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Video Content */}
      {!isMinimized && (
        <div
          className="video-consult-content"
          style={{
            width: "100%",
            height: "calc(100% - 56px)",
            backgroundColor: "#000",
            position: "relative",
          }}
        >
          {isLoading && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              backgroundColor: "#000",
              zIndex: 1,
            }}>
              <div className="spinner" style={{
                width: "60px",
                height: "60px",
                border: "4px solid rgba(255, 255, 255, 0.1)",
                borderTop: "4px solid #667eea",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: "20px"
              }} />
              <div style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>
                Loading {isAudioCall ? 'audio' : 'video'} call...
              </div>
              <div style={{ fontSize: "14px", opacity: 0.7 }}>
                Connecting you to the consultation
              </div>
            </div>
          )}
          
          {iframeBlocked && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              backgroundColor: "#000",
              zIndex: 2,
              padding: "20px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
              <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
                Unable to Load Video Call
              </div>
              <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "20px", maxWidth: "350px" }}>
                The video call interface couldn't be loaded in this window. This may be due to browser security settings.
              </div>
              <button
                onClick={() => {
                  const newWindow = window.open(videoUrl, '_blank', 'noopener,noreferrer,width=1200,height=800');
                  if (newWindow) {
                    message.success('Video call opened in new window');
                    onClose();
                  } else {
                    message.error('Please allow popups for this site');
                  }
                }}
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                }}
              >
                Open in New Window
              </button>
            </div>
          )}
          
          <div style={{
            position: "relative",
            width: "100%",
            height: "100%",
            isolation: "isolate",
            pointerEvents: "auto",
            touchAction: "auto"
          }}>
            <iframe
              ref={iframeRef}
              src={videoUrl}
              title={modalTitle}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                backgroundColor: "#000",
                pointerEvents: "auto",
                touchAction: "auto",
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 1,
                isolation: "isolate",
                transform: "translateZ(0)",
                willChange: "transform"
              }}
              allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *; speaker *; clipboard-write; clipboard-read; payment; usb; serial; bluetooth; accelerometer; gyroscope; magnetometer"
              allowFullScreen
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              onClick={(e) => {
                e.target.focus();
                // Try to force focus multiple ways
                setTimeout(() => {
                  e.target.focus();
                  if (e.target.contentWindow) {
                    e.target.contentWindow.focus();
                  }
                }, 10);
              }}
              onMouseDown={(e) => {
                e.target.focus();
              }}
              onTouchStart={(e) => {
                e.target.focus();
              }}
            />
          </div>
          
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default VideoConsultModal;