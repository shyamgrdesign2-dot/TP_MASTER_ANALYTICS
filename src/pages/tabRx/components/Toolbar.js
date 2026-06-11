import React, { useState, useRef, useEffect } from 'react';
import { CLINICAL_COLORS, HIGHLIGHTER_COLORS } from '../utils/constants';

import './Toolbar.scss';
import RotateLeftIcon from '../../snapRx/components/RotateLeftIcon';
import { ASSETS } from "../../../assets";
const {
  luPen: LuPen,
  luHighlighter: LuHighlighter,
  luEraser: LuEraser,
  luUndo: LuUndo2,
  luRedo: LuRedo2,
  luPlus: LuPlus,
  luMinus: LuMinus,
  closeBlack: CgClose,
} = ASSETS.images;

const Toolbar = ({
  toolSettings,
  setToolSettings,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showSettings,
  setShowSettings,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFit
}) => {
  const DEFAULT_PEN_THICKNESS = 2;
  const DEFAULT_ERASER_THICKNESS = 2;
  const DEFAULT_HIGHLIGHTER_THICKNESS = 14;

  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: typeof window !== 'undefined' ? 20 : 20, y: 150 });
  const [orientation, setOrientation] = useState('vertical');
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const toolbarRef = useRef(null);
  const settingsPanelRef = useRef(null);
  // Android fires BOTH pointerdown AND a synthetic click for a single tap.
  // iOS/iPad respects e.preventDefault() in pointerdown and suppresses the click.
  // Recording the pointerdown timestamp and skipping onClick when it fires within
  // 500 ms prevents the double-invocation that causes the settings panel to
  // flash open then immediately close on Android.
  const lastPointerDownTs = useRef(0);
  
  const activeColors = toolSettings.activeTool === 'highlighter' ? HIGHLIGHTER_COLORS : CLINICAL_COLORS;
  const isTextTool = toolSettings.activeTool === 'text';
  const zoomPercent = Math.round((zoomLevel || 1) * 100);

  const getToolThickness = (settings, tool) => {
    if (tool === 'pen') return settings.penThickness ?? DEFAULT_PEN_THICKNESS;
    if (tool === 'eraser') return settings.eraserThickness ?? DEFAULT_ERASER_THICKNESS;
    if (tool === 'highlighter') return settings.highlighterThickness ?? DEFAULT_HIGHLIGHTER_THICKNESS;
    return settings.thickness ?? DEFAULT_PEN_THICKNESS;
  };

  // Close settings panel when tapping/clicking outside toolbar.
  useEffect(() => {
    if (!showSettings) return undefined;

    const handleOutsidePointer = (e) => {
      const target = e.target;
      if (!target) return;
      if (toolbarRef.current && toolbarRef.current.contains(target)) return;
      if (settingsPanelRef.current && settingsPanelRef.current.contains(target)) return;
      setShowSettings(false);
    };

    window.addEventListener('pointerdown', handleOutsidePointer, true);
    return () => {
      window.removeEventListener('pointerdown', handleOutsidePointer, true);
    };
  }, [showSettings, setShowSettings]);

  const handlePointerDown = (e) => {
    const target = e.target;
    if (target.closest('button') || target.closest('input')) return;

    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.stopPropagation();
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    
    const maxX = window.innerWidth - (orientation === 'vertical' ? 80 : 350);
    const maxY = window.innerHeight - (orientation === 'vertical' ? 350 : 80);
    
    const clampedX = Math.max(10, Math.min(maxX, newX));
    const clampedY = Math.max(10, Math.min(maxY, newY));
    
    setPosition({ x: clampedX, y: clampedY });
    
    const distToVerticalEdge = Math.min(newX, window.innerWidth - newX);
    const distToHorizontalEdge = Math.min(newY, window.innerHeight - newY);

    if (distToHorizontalEdge < distToVerticalEdge * 0.8) { 
      setOrientation('horizontal');
    } else {
      setOrientation('vertical');
    }

    // Only stop propagation while dragging, so clicks on buttons still work reliably
    e.stopPropagation();
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;

    setIsDragging(false);

    // Guard: release pointer capture only if we actually captured it
    try {
      if (e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {
      // ignore
    }

    // Only stop propagation while dragging, so button taps don't require double click
    e.stopPropagation();
  };

  const handleToolSelect = (tool) => {
    if (tool === toolSettings.activeTool && !isMinimized) {
      setShowSettings(!showSettings);
    } else {
      // Keep thickness independent per tool.
      const newSettings = {
        ...toolSettings,
        penThickness: toolSettings.penThickness ?? DEFAULT_PEN_THICKNESS,
        eraserThickness: toolSettings.eraserThickness ?? DEFAULT_ERASER_THICKNESS,
        highlighterThickness: toolSettings.highlighterThickness ?? DEFAULT_HIGHLIGHTER_THICKNESS,
        activeTool: tool,
        thickness: getToolThickness(toolSettings, tool),
      };

      setToolSettings(newSettings);
      setShowSettings(true);
    }
  };

  // Logic to determine where the drawer should slide out to
  const getDrawerClasses = () => {
     const isRight = position.x > window.innerWidth / 2;
     const isBottom = position.y > window.innerHeight / 2;
     
     if (orientation === 'vertical') {
         // Toolbar is docked on left or right side of the screen.
         // Open the settings panel towards the INSIDE of the canvas:
         // - If toolbar is on the RIGHT side → panel opens to the LEFT.
         // - If toolbar is on the LEFT side  → panel opens to the RIGHT.
         return isRight ? 'left' : 'right';
     } else {
         // Toolbar is docked on top or bottom of the screen.
         // Open the settings panel towards the INSIDE of the canvas:
         // - If toolbar is at the BOTTOM → panel opens ABOVE (top).
         // - If toolbar is at the TOP    → panel opens BELOW (bottom).
         return isBottom ? 'top' : 'bottom';
     }
  };

  if (isMinimized) {
    return (
      <button
        type="button"
        className="tab-rx-toolbar minimized-button"
        style={{ left: position.x, top: position.y }}
        onPointerDown={(e) => {
            setIsDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => !isDragging && setIsMinimized(false)}
      >
        <img src={LuPen} alt="Pen" />
      </button>
    );
  }

  const ToolButton = ({ tool, icon: Icon }) => (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        lastPointerDownTs.current = performance.now();
        if (!isDragging) handleToolSelect(tool);
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Android double-fire guard: pointerDown already handled this tap
        if (performance.now() - lastPointerDownTs.current < 500) return;
        if (!isDragging) handleToolSelect(tool);
      }}
      className={`tool-button ${toolSettings.activeTool === tool ? 'active' : ''}`}
    >
      <img src={Icon} alt={tool} />
    </button>
  );

  return (
    <div
      ref={toolbarRef}
      className={`tab-rx-toolbar ${orientation}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className={`toolbar-container ${orientation}`}>
        <div className={`drag-handle ${orientation}`}>
          <div className="grid-dots">
            <div className="dot-row">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
            <div className="dot-row">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </div>

        <ToolButton tool="pen" icon={LuPen} />
        <ToolButton tool="highlighter" icon={LuHighlighter} />
        <ToolButton tool="eraser" icon={LuEraser} />
        {/* Not Required as of now (got removed - keeping this for future cases)*/}
        {/* <ToolButton tool="text" icon={FaFont} /> */}

        <div className={`divider ${orientation}`} />

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            lastPointerDownTs.current = performance.now();
            if (!isDragging) onUndo?.();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (performance.now() - lastPointerDownTs.current < 500) return;
            if (!isDragging) onUndo?.();
          }}
          disabled={!canUndo}
          className="action-button"
        >
          <img src={LuUndo2} alt="Undo" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            lastPointerDownTs.current = performance.now();
            if (!isDragging) onRedo?.();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (performance.now() - lastPointerDownTs.current < 500) return;
            if (!isDragging) onRedo?.();
          }}
          disabled={!canRedo}
          className="action-button"
        >
          <img src={LuRedo2} alt="Redo" />
        </button>
        
        <div className={`divider ${orientation}`} />

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            lastPointerDownTs.current = performance.now();
            if (!isDragging) onZoomOut?.();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (performance.now() - lastPointerDownTs.current < 500) return;
            if (!isDragging) onZoomOut?.();
          }}
          className="action-button"
          title="Zoom Out"
        >
          <img src={LuMinus} alt="Minus" />
        </button>

        <div className="zoom-level" title={`Zoom ${zoomPercent}%`}>
          {zoomPercent}%
        </div>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            lastPointerDownTs.current = performance.now();
            if (!isDragging) onZoomIn?.();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (performance.now() - lastPointerDownTs.current < 500) return;
            if (!isDragging) onZoomIn?.();
          }}
          className="action-button"
          title="Zoom In"
        >
          <img src={LuPlus} alt="Plus" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            lastPointerDownTs.current = performance.now();
            if (!isDragging) onFit?.();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (performance.now() - lastPointerDownTs.current < 500) return;
            if (!isDragging) onFit?.();
          }}
          className="action-button"
          title="Fit to Screen"
        >
          <RotateLeftIcon />
        </button>

        <div className={`divider ${orientation}`} />

         <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            lastPointerDownTs.current = performance.now();
            if (!isDragging) setIsMinimized(true);
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (performance.now() - lastPointerDownTs.current < 500) return;
            if (!isDragging) setIsMinimized(true);
          }}
          className="close-button"
        >
          <img src={CgClose} alt="Close" />
        </button>

        {/* Dynamic Drawer Settings Panel */}
        {showSettings && (
          <div 
            ref={settingsPanelRef}
            className={`settings-panel ${orientation} ${getDrawerClasses()}`}
            onPointerDown={(e) => e.stopPropagation()} 
          >
             
              {/* Colors */}
              {toolSettings.activeTool !== 'eraser' && (
                  <div className={`color-section ${orientation === 'horizontal' ? 'border-r border-gray-400/20 pr-6' : ''}`}>
                      <span className="section-title">Ink Color</span>
                      <div className={`color-grid ${orientation === 'horizontal' ? 'horizontal' : ''}`}>
                        {activeColors.map(c => (
                          <button
                            key={c.hex}
                            onClick={() => setToolSettings(prev => ({ ...prev, color: c.hex }))}
                            className={`color-button ${toolSettings.color === c.hex ? 'active' : ''}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                      </div>
                  </div>
              )}

              {/* Thickness Control - Slider */}
              {!isTextTool && (
                <div className="thickness-section">
                   <div className="thickness-header">
                      <span className="section-title">
                        {toolSettings.activeTool === 'eraser' ? 'Eraser Size' : 'Thickness'}
                      </span>
                      <span className="thickness-value">
                        {toolSettings.thickness}px
                      </span>
                   </div>

                   {/* Ink Preview: High Contrast Card */}
                   <div className="ink-preview">
                       <svg width="100%" height="100%" viewBox="0 0 160 60" preserveAspectRatio="none">
                           <path 
                              d="M 20 30 Q 50 10, 80 30 T 140 30"
                              fill="none"
                              stroke={toolSettings.activeTool === 'eraser' ? '#94a3b8' : toolSettings.color}
                              strokeWidth={toolSettings.thickness}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ opacity: toolSettings.activeTool === 'highlighter' ? 0.6 : 1 }}
                           />
                       </svg>
                   </div>
                   
                   {/* Draggable Slider */}
                   <div className="thickness-slider">
                      <span className="slider-label">1px</span>
                      <input 
                        type="range"
                        min="1"
                        max="24"
                        step="1"
                        value={toolSettings.thickness}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          setToolSettings((prev) => {
                            const next = { ...prev, thickness: value };
                            if (prev.activeTool === 'pen') {
                              next.penThickness = value;
                            } else if (prev.activeTool === 'eraser') {
                              next.eraserThickness = value;
                            } else if (prev.activeTool === 'highlighter') {
                              next.highlighterThickness = value;
                            }
                            return next;
                          });
                        }}
                      />
                      <span className="slider-label">24px</span>
                   </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
