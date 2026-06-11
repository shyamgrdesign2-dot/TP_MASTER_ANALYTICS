import React, { useRef, useEffect, useCallback } from 'react';
import { A4_BASE_WIDTH, A4_BASE_HEIGHT, ZOOM_CONSTRAINTS } from '../utils/constants';
import { getMidPoint, generateId, splitStroke } from '../utils/geometry';
import './CanvasEngine.scss';

const CanvasEngine = React.forwardRef(({
  strokes,
  setStrokes,
  onStrokeComplete,
  onEraseStart,
  toolSettings,
  setToolSettings,
  zoomLevel,
  setZoomLevel,
  panOffset,
  setPanOffset,
  onInteractionStart,
  onPageFocus,
  backgroundImage,
  embeddedInScroll = false,
  onContentChange = null, // ✅ Optional callback for content changes
  forceStrokesSyncToken = 0, // ✅ bump to force applying strokes prop even if it has fewer strokes (undo/redo)
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const backgroundLayerRef = useRef(null);
  const strokesLayerRef = useRef(null);
  const isBackgroundLayerDirtyRef = useRef(true);
  const isStrokesLayerDirtyRef = useRef(true);

  // Expose canvas ref to parent
  React.useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current
  }), []);

  // ─────────────────────────────────────────────────────────────────────────────
  // ALL MUTABLE STATE LIVES IN REFS so renderCanvas never has a stale closure.
  // This is how Excalidraw works: render reads from refs, not from React state.
  // ─────────────────────────────────────────────────────────────────────────────

  // Mirror of `strokes` prop — always up-to-date
  const strokesRef = useRef(strokes);
  const lastForceStrokesSyncTokenRef = useRef(forceStrokesSyncToken);

  // Mirror of `bgImageObj` — always up-to-date
  const bgImageObjRef = useRef(null);

  // Current stroke being drawn (live, updated on every pointermove)
  const currentStrokeRef = useRef(null);

  // Drawing mode flags
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const isErasingRef = useRef(false);

  // Interaction tracking
  const isInteractingRef = useRef(false);
  const activePointerId = useRef(null);

  // Panning
  const lastPanPointRef = useRef(null);

  // Pinch-zoom state
  const initialPinchDist = useRef(null);
  const initialZoom = useRef(1);
  const pinchStartCanvasPoint = useRef(null);

  // Mirror of zoomLevel / panOffset so renderCanvas doesn't capture stale values
  const zoomLevelRef = useRef(zoomLevel);
  const panOffsetRef = useRef(panOffset);

  // ✅ EXCALIDRAW PATTERN: Store handler functions in refs so native listeners always have latest version
  const handlePointerDownRef = useRef(null);
  const handlePointerMoveRef = useRef(null);
  const handlePointerUpRef = useRef(null);
  const handlePointerCancelRef = useRef(null);

  // ✅ EXCALIDRAW PATTERN: Queue for completed strokes to defer parent updates
  const completedStrokesQueueRef = useRef([]);
  const onStrokeCompleteRef = useRef(onStrokeComplete);
  const onContentChangeRef = useRef(onContentChange);

  // Keep all mirrors in sync
  useEffect(() => { zoomLevelRef.current = zoomLevel; }, [zoomLevel]);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
  
  // Keep callback refs in sync
  useEffect(() => { onStrokeCompleteRef.current = onStrokeComplete; }, [onStrokeComplete]);
  useEffect(() => { onContentChangeRef.current = onContentChange; }, [onContentChange]);

  // Helper to detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — reads ONLY from refs, so it is NEVER stale no matter when called.
  // ─────────────────────────────────────────────────────────────────────────────
  const drawStrokeOnContext = useCallback((ctx, stroke) => {
    if (!ctx || !stroke || stroke.points.length < 2) return;
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.thickness;
    if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = 'multiply';
      ctx.lineWidth = stroke.thickness * 2;
    } else {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }
    const p0 = stroke.points[0];
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const p1 = stroke.points[i];
      const p2 = stroke.points[i + 1];
      const mid = getMidPoint(p1, p2);
      ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const ensureLayerCanvases = useCallback(() => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return false;

    if (!backgroundLayerRef.current) {
      backgroundLayerRef.current = document.createElement('canvas');
    }
    if (!strokesLayerRef.current) {
      strokesLayerRef.current = document.createElement('canvas');
    }

    const bg = backgroundLayerRef.current;
    const st = strokesLayerRef.current;

    if (bg.width !== mainCanvas.width || bg.height !== mainCanvas.height) {
      bg.width = mainCanvas.width;
      bg.height = mainCanvas.height;
      isBackgroundLayerDirtyRef.current = true;
    }
    if (st.width !== mainCanvas.width || st.height !== mainCanvas.height) {
      st.width = mainCanvas.width;
      st.height = mainCanvas.height;
      isStrokesLayerDirtyRef.current = true;
    }

    return true;
  }, []);

  const rebuildBackgroundLayer = useCallback(() => {
    if (!ensureLayerCanvases()) return;
    const bg = backgroundLayerRef.current;
    const ctx = bg.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, bg.width, bg.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, bg.width, bg.height);

    if (bgImageObjRef.current) {
      ctx.drawImage(bgImageObjRef.current, 0, 0, bg.width, bg.height);
    } else {
      ctx.strokeStyle = '#F3F4F6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < bg.width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, bg.height); }
      for (let y = 0; y < bg.height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(bg.width, y); }
      ctx.stroke();
    }
    isBackgroundLayerDirtyRef.current = false;
  }, [ensureLayerCanvases]);

  const rebuildStrokesLayer = useCallback(() => {
    if (!ensureLayerCanvases()) return;
    const strokesCanvas = strokesLayerRef.current;
    const ctx = strokesCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
    strokesRef.current.forEach((stroke) => drawStrokeOnContext(ctx, stroke));
    isStrokesLayerDirtyRef.current = false;
  }, [ensureLayerCanvases, drawStrokeOnContext]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('⚠️ [CanvasEngine] renderCanvas: canvas is null');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('⚠️ [CanvasEngine] renderCanvas: ctx is null');
      return;
    }

    if (isBackgroundLayerDirtyRef.current) {
      rebuildBackgroundLayer();
    }
    if (isStrokesLayerDirtyRef.current) {
      rebuildStrokesLayer();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundLayerRef.current) {
      ctx.drawImage(backgroundLayerRef.current, 0, 0);
    }
    if (strokesLayerRef.current) {
      ctx.drawImage(strokesLayerRef.current, 0, 0);
    }

    if (currentStrokeRef.current) {
      drawStrokeOnContext(ctx, currentStrokeRef.current);
    }
  }, [rebuildBackgroundLayer, rebuildStrokesLayer, drawStrokeOnContext]);

  // Sync strokesRef with strokes prop AFTER renderCanvas is defined
  // ✅ Only sync when NOT actively drawing to avoid mid-stroke races
  // ✅ CRITICAL: Don't include renderCanvas in deps - it causes unnecessary re-renders
  // ✅ CRITICAL: Never overwrite strokesRef with stale data that has fewer strokes
  // This prevents data loss when parent re-renders during tool/zoom changes
  useEffect(() => {
    if (!isDrawingRef.current) {
      const currentStrokes = strokesRef.current;

      // ✅ If parent explicitly requests a sync (undo/redo), allow syncing even if strokes shrank
      const forceSync = forceStrokesSyncToken !== lastForceStrokesSyncTokenRef.current;
      if (forceSync) {
        lastForceStrokesSyncTokenRef.current = forceStrokesSyncToken;
        strokesRef.current = strokes;
        isStrokesLayerDirtyRef.current = true;
        renderCanvas();
        return;
      }
      
      // ✅ CRITICAL: Protect against data loss - NEVER overwrite with fewer strokes
      // This happens when parent re-renders during zoom/tool changes and passes stale prop
      // The ref has the latest strokes (from drawing), but parent state hasn't updated yet
      if (strokes.length < currentStrokes.length) {
        // ✅ CRITICAL: Instead, update parent with our latest strokes to keep them in sync
        if (setStrokes && currentStrokes.length > 0) {
          setStrokes(currentStrokes);
        }
        return; // Don't overwrite with stale data
      }
      
      // ✅ CRITICAL: Also protect against empty prop when we have strokes
      if (strokes.length === 0 && currentStrokes.length > 0) {
        return; // Don't clear existing strokes
      }
      
      // ✅ CRITICAL: Deep comparison to avoid unnecessary updates
      // Only update if the strokes array actually changed (length or content)
      const strokesChanged = 
        currentStrokes.length !== strokes.length ||
        strokes.some((stroke, idx) => {
          const currentStroke = currentStrokes[idx];
          return !currentStroke || 
                 currentStroke.id !== stroke.id || 
                 currentStroke.points.length !== stroke.points.length;
        });
      
      if (strokesChanged) {
        // ✅ Only sync if prop has equal or more strokes (intentional update like undo/redo)
        // Or if both are empty (intentional clear)
        if (strokes.length >= currentStrokes.length || (strokes.length === 0 && currentStrokes.length === 0)) {
          strokesRef.current = strokes;
          isStrokesLayerDirtyRef.current = true;
          renderCanvas(); // Re-render with synced strokes
        } else {
          // console.log(`⚠️ [CanvasEngine] Skipping sync: prop has ${strokes.length} strokes, ref has ${currentStrokes.length} (would lose data)`);
        }
      }
    }
  }, [strokes, setStrokes, forceStrokesSyncToken]); // include token so forced sync works

  // ─────────────────────────────────────────────────────────────────────────────
  // BACKGROUND IMAGE (must come AFTER renderCanvas is defined)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = backgroundImage;
      img.onload = () => {
        bgImageObjRef.current = img;
        isBackgroundLayerDirtyRef.current = true;
        renderCanvas(); // re-render once image loads
      };
      img.onerror = () => {
        bgImageObjRef.current = null;
        isBackgroundLayerDirtyRef.current = true;
        renderCanvas();
      };
    } else {
      bgImageObjRef.current = null;
      isBackgroundLayerDirtyRef.current = true;
      renderCanvas();
    }
  }, [backgroundImage, renderCanvas]);

  // Re-render whenever committed strokes change (undo/redo/erase)
  // ✅ This is handled by the sync useEffect above which is smarter about updates

  // ─────────────────────────────────────────────────────────────────────────────
  // ERASER
  // ─────────────────────────────────────────────────────────────────────────────
  const getCanvasCoordinates = useCallback((e) => {
    if (!canvasRef.current) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoomLevelRef.current,
      y: (e.clientY - rect.top) / zoomLevelRef.current,
      pressure: e.pressure !== undefined ? e.pressure : 0.5
    };
  }, []);

  const performErase = useCallback((eraserPoint) => {
    const eraserRadius = (toolSettings.thickness * 4) / zoomLevelRef.current;
    let hasChanges = false;
    let nextStrokes = [];
    for (const stroke of strokesRef.current) {
      const fragments = splitStroke(stroke, eraserPoint, eraserRadius);
      if (fragments.length === 1 && fragments[0].points.length === stroke.points.length) {
        nextStrokes.push(stroke);
      } else {
        hasChanges = true;
        nextStrokes.push(...fragments);
      }
    }
    if (hasChanges) {
      strokesRef.current = nextStrokes;
      setStrokes(nextStrokes);
      isStrokesLayerDirtyRef.current = true;
      renderCanvas();
    }
  }, [toolSettings.thickness, setStrokes, renderCanvas]);

  // ─────────────────────────────────────────────────────────────────────────────
  // POINTER EVENT HANDLERS (Internal implementation - stored in refs)
  // ─────────────────────────────────────────────────────────────────────────────

  // ✅ EXCALIDRAW PATTERN: Internal handler that doesn't depend on React callbacks
  // This function is stored in a ref and called by native listeners
  // ✅ CRITICAL: Also accepts touchstart events converted to pointerdown-like events
  const internalPointerDown = useCallback((e) => {
    // ✅ CRITICAL: Handle both pointerdown and touchstart (converted) events
    // For touchstart events, isPrimary might not exist, so check pointerId instead
    if (e.isPrimary === false) {
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn(`⚠️ [CanvasEngine] internalPointerDown: Canvas is null`);
      return;
    }

    const isPen = e.pointerType === 'pen';

    // ✅ Tablet UX requirement:
    // - Finger/touch should scroll the page (no drawing, no panning, no preventDefault)
    // - Stylus/pen should draw
    // NOTE: iOS Apple Pencil fast-tap workaround is handled via touchstart->pen conversion (touchType === 'stylus')
    if (e.pointerType === 'touch') {
      return;
    }

    // ✅ CRITICAL: Only process pen, ignore mouse
    if (!isPen) {
      return;
    }

    // ✅ CRITICAL: Check if activePointerId is still set from previous stroke
    // If so, this means pointerUp didn't fire properly - reset it now
    if (activePointerId.current !== null && activePointerId.current !== e.pointerId) {
      activePointerId.current = null;
      isDrawingRef.current = false;
      currentStrokeRef.current = null;
    }

    // ✅ CRITICAL: Prevent default for pen to avoid browser gestures
    if (isPen) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation(); // Prevent bubbling to parent elements
    }

    // ✅ CRITICAL: Add debug log to confirm pointerDown is being called
    // const eventSource = e.nativeEvent ? 'touchstart' : 'pointerdown';

    isInteractingRef.current = true;
    activePointerId.current = e.pointerId;

    // ✅ CRITICAL: Don't disable pointer events on container - this blocks subsequent events!
    // Instead, use CSS pointer-events: none only on non-canvas elements
    if (containerRef.current) {
      containerRef.current.setAttribute('data-pen-active', 'true');
    }
    canvas.setAttribute('data-pen-active', 'true');

    // Release any existing capture first
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    // Set capture for pen
    if (isPen && canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {
        console.warn('setPointerCapture failed:', err);
      }
    }

    // ✅ EXCALIDRAW PATTERN: Call callbacks but don't block on them
    if (onInteractionStart) onInteractionStart();
    if (onPageFocus) onPageFocus();

    // ── If there was an orphaned stroke from a missed pointerup, complete it ──
    // ✅ CRITICAL: Add to strokesRef FIRST, then queue parent notification
    // This ensures the stroke is rendered immediately even if parent update is delayed
    if (currentStrokeRef.current) {
      const orphanedStroke = currentStrokeRef.current;
      // Add to strokesRef immediately so it's rendered
      strokesRef.current = [...strokesRef.current, orphanedStroke];
      
      // ✅ CRITICAL: Immediately update parent state to prevent sync issues
      if (setStrokes) {
        setStrokes(strokesRef.current);
      }
      
      // Render immediately
      isStrokesLayerDirtyRef.current = true;
      renderCanvas();
      // ✅ EXCALIDRAW PATTERN: Queue parent notification instead of calling directly
      completedStrokesQueueRef.current.push(orphanedStroke);
      // Clear ref
      currentStrokeRef.current = null;
    }

    // ── PANNING ───────────────────────────────────────────────────────────────
    if (toolSettings.activeTool === 'move') {
      isDrawingRef.current = false;
      isPanningRef.current = true;
      isErasingRef.current = false;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // ── ERASING ───────────────────────────────────────────────────────────────
    if (toolSettings.activeTool === 'eraser') {
      isDrawingRef.current = false;
      isPanningRef.current = false;
      isErasingRef.current = true;
      onEraseStart();
      performErase(getCanvasCoordinates(e));
      return;
    }

    // ── DRAWING ───────────────────────────────────────────────────────────────
    // Reset all mode flags and start a fresh stroke
    isDrawingRef.current = false;
    isPanningRef.current = false;
    isErasingRef.current = false;

    // Always start a new drawing session on pointerDown
    isDrawingRef.current = true;

    const point = getCanvasCoordinates(e);
    const newStroke = {
      id: generateId(),
      tool: toolSettings.activeTool,
      color: toolSettings.color,
      thickness: toolSettings.thickness,
      opacity: 1,
      points: [point],
    };

    // Set ref immediately — renderCanvas reads from this, no stale closure
    currentStrokeRef.current = newStroke;

    // Render immediately — reads currentStrokeRef.current which is already set
    renderCanvas();
  }, [toolSettings, onInteractionStart, onPageFocus, onEraseStart, performErase, getCanvasCoordinates, isIOS, renderCanvas]);

  // ✅ EXCALIDRAW PATTERN: Internal handler stored in ref
  // ✅ CRITICAL: Also accepts touchmove events converted to pointermove-like events
  const internalPointerMove = useCallback((e) => {
    // ✅ CRITICAL: Handle both pointermove and touchmove (converted) events
    // For touchmove events, isPrimary might not exist, so check activePointerId instead
    if (e.isPrimary === false) return;
    if (activePointerId.current != null && e.pointerId !== activePointerId.current) return;

    const isPen = e.pointerType === 'pen';
    // Finger/touch should scroll; ignore.
    if (e.pointerType === 'touch') return;

    if (isPen) {
      if (e.preventDefault) e.preventDefault();
    }

    // ── PANNING ───────────────────────────────────────────────────────────────
    if (isPanningRef.current && lastPanPointRef.current) {
      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    // ── ERASING ───────────────────────────────────────────────────────────────
    if (isErasingRef.current) {
      performErase(getCanvasCoordinates(e));
      return;
    }

    // ── DRAWING ───────────────────────────────────────────────────────────────
    if (isDrawingRef.current && currentStrokeRef.current) {
      const point = getCanvasCoordinates(e);
      if (point.x < -100 || point.y < -100 || point.x > A4_BASE_WIDTH + 100 || point.y > A4_BASE_HEIGHT + 100) return;

      // Use coalesced events for smoother drawing
      // ✅ Native events have getCoalescedEvents directly (not via nativeEvent)
      const events = (typeof e.getCoalescedEvents === 'function')
        ? e.getCoalescedEvents()
        : [e];
      let newPoints = events.map(ev => getCanvasCoordinates(ev));

      // iPad Safari: after rubber-band overscroll, the first pointermove can jump vertically
      // and draw a huge initial segment — clamp the first step from the lone pointerdown point.
      if (isIOS && currentStrokeRef.current.points.length === 1 && newPoints.length > 0) {
        const p0 = currentStrokeRef.current.points[0];
        const FIRST_MOVE_MAX = 72;
        const p1 = newPoints[0];
        const d = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        if (d > FIRST_MOVE_MAX) {
          const s = FIRST_MOVE_MAX / d;
          newPoints = [
            { x: p0.x + (p1.x - p0.x) * s, y: p0.y + (p1.y - p0.y) * s },
            ...newPoints.slice(1),
          ];
        }
      }

      // When embedded in a scroll container, Android Chrome can inject huge coordinate jumps
      // during overscroll — skip those segments. Do NOT apply this broadly on iOS: it drops
      // valid points between fast strokes / coalesced events and makes lines look dashed.
      if (embeddedInScroll && newPoints.length > 0) {
        const MAX_SEGMENT = 140;
        const pts = currentStrokeRef.current.points;
        const base = pts.length > 0 ? pts[pts.length - 1] : null;
        const filtered = [];
        let prev = base;
        for (const p of newPoints) {
          if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > MAX_SEGMENT) continue;
          filtered.push(p);
          prev = p;
        }
        newPoints = filtered;
        if (newPoints.length === 0) return;
      }

      // Update ref synchronously — renderCanvas will see this immediately
      const oldPointsCount = currentStrokeRef.current.points.length;
      currentStrokeRef.current = {
        ...currentStrokeRef.current,
        points: [...currentStrokeRef.current.points, ...newPoints]
      };
      const newPointsCount = currentStrokeRef.current.points.length;


      // Render immediately — reads from currentStrokeRef, no stale closure
      renderCanvas();
    } else {
      // if (!isDrawingRef.current) {
      //   console.warn(`⚠️ [CanvasEngine] pointerMove: isDrawingRef is FALSE, cannot draw`);
      // }
      // if (!currentStrokeRef.current) {
      //   console.warn(`⚠️ [CanvasEngine] pointerMove: currentStrokeRef is NULL, cannot draw`);
      // }
    }
  }, [isIOS, setPanOffset, performErase, getCanvasCoordinates, renderCanvas, embeddedInScroll]);

  // ✅ EXCALIDRAW PATTERN: Internal handler stored in ref
  // ✅ CRITICAL: Also accepts touchend events converted to pointerup-like events
  const internalPointerUp = useCallback((e) => {
    const isPen = e.pointerType === 'pen';
    const canvas = canvasRef.current;

    // Finger/touch should scroll; ignore.
    if (e.pointerType === 'touch') return;

    if (isPen) {
      if (e.preventDefault) e.preventDefault();
    }

    // ── Complete the stroke ───────────────────────────────────────────────────
    if (currentStrokeRef.current && isDrawingRef.current) {
      const completedStroke = currentStrokeRef.current;
      const strokeId = completedStroke.id;
      const pointsCount = completedStroke.points.length;

      // Add to strokesRef IMMEDIATELY (before clearing currentStrokeRef)
      // This ensures renderCanvas sees it right away
      strokesRef.current = [...strokesRef.current, completedStroke];

      // ✅ CRITICAL: Immediately update parent state to prevent sync issues
      // This ensures parent has latest strokes before any re-renders (tool/zoom changes)
      // This prevents the sync logic from overwriting with stale data
      if (setStrokes) {
        setStrokes(strokesRef.current);
      }

      // Clear current stroke ref so renderCanvas won't double-draw it
      currentStrokeRef.current = null;

      // ✅ EXCALIDRAW PATTERN: Queue parent notification instead of calling directly
      // This prevents React re-renders during pointer events
      completedStrokesQueueRef.current.push(completedStroke);

      // ✅ CRITICAL: Render immediately with completed stroke in strokesRef
      isStrokesLayerDirtyRef.current = true;
      renderCanvas();
    }

    // Release pointer capture
    if (canvas && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    // ✅ Reset ALL flags including isDrawingRef so next stroke starts cleanly
    // ✅ CRITICAL: Reset activePointerId FIRST to allow next pointerdown immediately
    activePointerId.current = null;
    isDrawingRef.current = false;
    isPanningRef.current = false;
    isErasingRef.current = false;
    lastPanPointRef.current = null;
    isInteractingRef.current = false;


    // ✅ CRITICAL: Don't re-enable pointer events here - let them stay enabled
    // Removing the data-pen-active attribute is enough
    if (containerRef.current) {
      containerRef.current.removeAttribute('data-pen-active');
    }
    if (canvas) {
      canvas.removeAttribute('data-pen-active');
    }
  }, [isIOS, renderCanvas]);

  // ✅ EXCALIDRAW PATTERN: Internal handler stored in ref
  const internalPointerCancel = useCallback((e) => {
    internalPointerUp(e);
  }, [internalPointerUp]);

  // Prevent browser context menu during drawing
  const handleContextMenu = useCallback((e) => {
    if (isInteractingRef.current || e.pointerType === 'pen') {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
        e.nativeEvent.stopImmediatePropagation();
      }
      return false;
    }
  }, []);

  // Native contextmenu listener (capture phase, to stop it before browser acts)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e) => {
      if (isInteractingRef.current) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    canvas.addEventListener('contextmenu', handler, { passive: false, capture: true });
    return () => canvas.removeEventListener('contextmenu', handler, { capture: true });
  }, []);

  // ✅ EXCALIDRAW PATTERN: Store handlers in refs so native listeners always have latest version
  useEffect(() => {
    handlePointerDownRef.current = internalPointerDown;
    handlePointerMoveRef.current = internalPointerMove;
    handlePointerUpRef.current = internalPointerUp;
    handlePointerCancelRef.current = internalPointerCancel;
  }, [internalPointerDown, internalPointerMove, internalPointerUp, internalPointerCancel]);

  // ✅ EXCALIDRAW PATTERN: Native event listeners attached once, never detached
  // This ensures events are NEVER lost, even during React re-renders
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ✅ CRITICAL: Convert touchstart to pointerdown-like event for pen input
    // iPad/Safari suppresses rapid pointerdown events, but touchstart fires reliably
    const handleTouchStart = (e) => {
      // Only process single touch
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];

      // ✅ CRITICAL: We only use touch→pointer conversion on iOS (for Apple Pencil fast taps)
      // On Android and other platforms, rely on native pointer events instead.
      if (!isIOS) {
        return;
      }

      // On iOS Safari, Touch.touchType === 'stylus' for Apple Pencil and 'direct' for finger.
      // If touchType is missing or not 'stylus', treat it as non-pen input and ignore for drawing.
      if (!touch.touchType || touch.touchType !== 'stylus') {
        return;
      }
      const canvasRect = canvas.getBoundingClientRect();
      const x = touch.clientX;
      const y = touch.clientY;
      const isWithinCanvas =
        x >= canvasRect.left - 10 &&
        x <= canvasRect.right + 10 &&
        y >= canvasRect.top - 10 &&
        y <= canvasRect.bottom + 10;

      if (!isWithinCanvas) return;

      // ✅ NEW: Ignore touches that start from page action buttons, dropdown menus, or toolbar
      // This prevents delete/add page taps, dropdown option taps, and toolbar interactions
      // from being treated as drawing input
      const target = e.target;
      const inUiControls =
        target &&
        typeof target.closest === 'function' &&
        !!target.closest('.page-action-buttons, .page-add-dropdown, .tab-rx-toolbar, .settings-panel');
      if (inUiControls) {
        // Let the button/Dropdown/menu/toolbar handle the tap normally
        return;
      }

      // Create a synthetic pointerdown-like event
      const syntheticEvent = {
        ...e,
        pointerType: 'pen', // Assume pen for touch events on canvas
        pointerId: touch.identifier,
        isPrimary: true,
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        target: e.target,
        nativeEvent: e,
      };

      if (handlePointerDownRef.current) {
        handlePointerDownRef.current(syntheticEvent);
      }
    };

    // Wrapper functions that call the latest handler from ref
    const handleDown = (e) => {
      // ✅ CRITICAL: Only process pen/touch events, ignore mouse
      // This prevents conflicts with UI interactions
      if (e.pointerType === 'mouse') {
        return; // Silent ignore for mouse
      }

      // ✅ Requirement: finger/touch should scroll only (no drawing / no interception)
      if (e.pointerType === 'touch') {
        return;
      }
      
      // ✅ CRITICAL: Check if coordinates are within canvas bounds
      // This works even when event comes from window listener (target might be different)
      const canvasRect = canvas.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      const isWithinCanvas = x >= canvasRect.left - 10 && x <= canvasRect.right + 10 && 
                             y >= canvasRect.top - 10 && y <= canvasRect.bottom + 10;
      
      // ✅ CRITICAL: Also check if target is canvas/container (for events that originate there)
      const target = e.target;
      const isCanvas = target === canvas;
      const isContainer = container && (target === container || container.contains(target));

      // ✅ NEW: Ignore pointer events that originate from page action buttons, dropdown menus, or toolbar
      // This prevents clicks on delete/add page buttons, dropdown options, and toolbar interactions
      // from being treated as drawing input
      const inUiControls =
        target &&
        typeof target.closest === 'function' &&
        !!target.closest('.page-action-buttons, .page-add-dropdown, .tab-rx-toolbar, .settings-panel');
      if (inUiControls) {
        // Let the button/Dropdown/menu/toolbar handle the click normally
        return;
      }
      
      // Process if within bounds OR target is canvas/container
      if (!isWithinCanvas && !isCanvas && !isContainer) {
        // Silent ignore - don't log to avoid spam
        return;
      }
      
      
      if (handlePointerDownRef.current) {
        handlePointerDownRef.current(e);
      } else {
        console.warn(`⚠️ [CanvasEngine] handleDown: handlePointerDownRef.current is null!`);
      }
    };

    const handleMove = (e) => {
      if (handlePointerMoveRef.current) {
        handlePointerMoveRef.current(e);
      }
    };

    const handleUp = (e) => {
      if (handlePointerUpRef.current) {
        handlePointerUpRef.current(e);
      }
    };

    const handleCancel = (e) => {
      if (handlePointerCancelRef.current) {
        handlePointerCancelRef.current(e);
      }
    };

    // ✅ CRITICAL: Attach pointerdown to canvas, container, AND window
    // Window listener ensures we NEVER miss a pointerdown, even during re-renders
    canvas.addEventListener('pointerdown', handleDown, { passive: false, capture: true });
    
    // Also attach to container to catch events that might be blocked by CSS
    // ✅ CRITICAL: Store container reference for cleanup
    const container = containerRef.current;
    if (container) {
      container.addEventListener('pointerdown', handleDown, { passive: false, capture: true });
    }
    
    // ✅ CRITICAL: Window-level listener for pointerdown (most reliable)
    // This ensures we catch ALL pointerdown events, even if canvas/container listeners miss them
    window.addEventListener('pointerdown', handleDown, { passive: false, capture: true });
    
    // ✅ CRITICAL: iPad/Safari workaround - also listen to touchstart/touchmove/touchend
    // Safari suppresses rapid pointerdown events, but touchstart fires reliably
    // This is the KEY fix for rapid pen taps
    const handleTouchMove = (e) => {
      // Only process if we have an active touch (from touchstart)
      if (activePointerId.current == null) return;
      
      // Find the touch that matches our active pointer ID
      const touch = Array.from(e.touches).find(t => t.identifier === activePointerId.current);
      if (!touch) return;
      
      // Prevent default to avoid scrolling
      e.preventDefault();
      
      // Create a synthetic pointermove-like event
      const syntheticEvent = {
        ...e,
        pointerType: 'pen',
        pointerId: touch.identifier,
        isPrimary: true,
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        target: e.target,
        nativeEvent: e,
        getCoalescedEvents: () => [] // Touch events don't have coalesced events
      };
      
      if (handlePointerMoveRef.current) {
        handlePointerMoveRef.current(syntheticEvent);
      }
    };

    const handleTouchEnd = (e) => {
      // Find the touch that matches our active pointer ID
      const touch = Array.from(e.changedTouches).find(t => t.identifier === activePointerId.current);
      if (!touch && activePointerId.current != null) {
        // Touch ended but we still have an active pointer - use the first changed touch
        const firstTouch = e.changedTouches[0];
        if (firstTouch) {
          activePointerId.current = firstTouch.identifier;
        }
      }
      
      if (activePointerId.current == null) return;
      
      // Prevent default
      e.preventDefault();
      
      // Create a synthetic pointerup-like event
      const syntheticEvent = {
        ...e,
        pointerType: 'pen',
        pointerId: activePointerId.current,
        isPrimary: true,
        clientX: touch ? touch.clientX : e.changedTouches[0]?.clientX || 0,
        clientY: touch ? touch.clientY : e.changedTouches[0]?.clientY || 0,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        target: e.target,
        nativeEvent: e
      };
            
      if (handlePointerUpRef.current) {
        handlePointerUpRef.current(syntheticEvent);
      }
    };

    const handleTouchCancel = (e) => {
      // Find the touch that matches our active pointer ID
      const touch = Array.from(e.changedTouches).find(t => t.identifier === activePointerId.current);
      if (!touch && activePointerId.current != null) {
        const firstTouch = e.changedTouches[0];
        if (firstTouch) {
          activePointerId.current = firstTouch.identifier;
        }
      }
      
      if (activePointerId.current == null) return;
      
      // Prevent default
      e.preventDefault();
      
      // Create a synthetic pointercancel-like event
      const syntheticEvent = {
        ...e,
        pointerType: 'pen',
        pointerId: activePointerId.current,
        isPrimary: true,
        clientX: touch ? touch.clientX : e.changedTouches[0]?.clientX || 0,
        clientY: touch ? touch.clientY : e.changedTouches[0]?.clientY || 0,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        target: e.target,
        nativeEvent: e
      };
            
      if (handlePointerCancelRef.current) {
        handlePointerCancelRef.current(syntheticEvent);
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    }
    window.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    
    // Add touchmove and touchend listeners
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    if (container) {
      container.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    }
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    if (container) {
      container.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    }
    window.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    
    canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false, capture: true });
    if (container) {
      container.addEventListener('touchcancel', handleTouchCancel, { passive: false, capture: true });
    }
    window.addEventListener('touchcancel', handleTouchCancel, { passive: false, capture: true });
    
    // Window-level listeners for move/up/cancel (always catch these)
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp, { passive: false });
    window.addEventListener('pointercancel', handleCancel, { passive: false });

    // Safety-net: window pointerup in case canvas misses it (already handled above, but keep for redundancy)
    const windowUpHandler = (e) => {
      if (activePointerId.current == null || e.pointerId !== activePointerId.current) return;
      if (currentStrokeRef.current && isDrawingRef.current) {
        const completedStroke = currentStrokeRef.current;
        currentStrokeRef.current = null;
        strokesRef.current = [...strokesRef.current, completedStroke];
        
        // ✅ CRITICAL: Immediately update parent state to prevent sync issues
        if (setStrokes) {
          setStrokes(strokesRef.current);
        }
        
        isStrokesLayerDirtyRef.current = true;
        renderCanvas();
        completedStrokesQueueRef.current.push(completedStroke);
      }
      isDrawingRef.current = false;
      isPanningRef.current = false;
      isErasingRef.current = false;
      isInteractingRef.current = false;
      activePointerId.current = null;
      lastPanPointRef.current = null;
      if (containerRef.current) {
        containerRef.current.removeAttribute('data-pen-active');
      }
      if (canvas) canvas.removeAttribute('data-pen-active');
    };

    window.addEventListener('pointerup', windowUpHandler);
    window.addEventListener('pointercancel', windowUpHandler);

    return () => {
      try {
        canvas.removeEventListener('pointerdown', handleDown, { capture: true });
        if (container) {
          container.removeEventListener('pointerdown', handleDown, { capture: true });
        }
        window.removeEventListener('pointerdown', handleDown, { capture: true });
        
        // Remove touch event listeners
        canvas.removeEventListener('touchstart', handleTouchStart, { capture: true });
        if (container) {
          container.removeEventListener('touchstart', handleTouchStart, { capture: true });
        }
        window.removeEventListener('touchstart', handleTouchStart, { capture: true });
        
        canvas.removeEventListener('touchmove', handleTouchMove, { capture: true });
        if (container) {
          container.removeEventListener('touchmove', handleTouchMove, { capture: true });
        }
        window.removeEventListener('touchmove', handleTouchMove, { capture: true });
        
        canvas.removeEventListener('touchend', handleTouchEnd, { capture: true });
        if (container) {
          container.removeEventListener('touchend', handleTouchEnd, { capture: true });
        }
        window.removeEventListener('touchend', handleTouchEnd, { capture: true });
        
        canvas.removeEventListener('touchcancel', handleTouchCancel, { capture: true });
        if (container) {
          container.removeEventListener('touchcancel', handleTouchCancel, { capture: true });
        }
        window.removeEventListener('touchcancel', handleTouchCancel, { capture: true });
        
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
        window.removeEventListener('pointerup', windowUpHandler);
        window.removeEventListener('pointercancel', windowUpHandler);
        // window.removeEventListener('pointerdown', globalDebugHandler, { capture: true });
        // window.removeEventListener('touchstart', globalTouchDebugHandler, { capture: true });
      } catch (error) {
        console.warn('⚠️ [CanvasEngine] Error during cleanup:', error);
      }
    };
  }, []); // ✅ EMPTY DEPS - listeners attached once, handlers updated via refs

  // ✅ EXCALIDRAW PATTERN: Defer parent state updates to avoid React re-renders during pointer events
  useEffect(() => {
    if (completedStrokesQueueRef.current.length === 0) return;

    // Process all queued strokes
    const queue = [...completedStrokesQueueRef.current];
    completedStrokesQueueRef.current = [];

    // Notify parent for each completed stroke
    queue.forEach((stroke) => {
      if (onStrokeCompleteRef.current) {
        onStrokeCompleteRef.current(stroke);
      }
    });

    // Notify parent of content change (only once per batch)
    if (queue.length > 0 && onContentChangeRef.current) {
      onContentChangeRef.current(true);
    }
  }); // ✅ No deps - runs after every render to drain queue

  // ─────────────────────────────────────────────────────────────────────────────
  // PINCH ZOOM & TOUCH
  // ─────────────────────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      initialPinchDist.current = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      initialZoom.current = zoomLevelRef.current;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cx = (p1.x + p2.x) / 2 - rect.left;
        const cy = (p1.y + p2.y) / 2 - rect.top;
        pinchStartCanvasPoint.current = {
          x: (cx - panOffsetRef.current.x) / zoomLevelRef.current,
          y: (cy - panOffsetRef.current.y) / zoomLevelRef.current
        };
      }
      // Abort any active drawing
      if (currentStrokeRef.current) {
        const abortedStroke = currentStrokeRef.current;
        strokesRef.current = [...strokesRef.current, abortedStroke];
        
        // ✅ CRITICAL: Immediately update parent state to prevent sync issues
        if (setStrokes) {
          setStrokes(strokesRef.current);
        }
        
        isStrokesLayerDirtyRef.current = true;
        renderCanvas();
        completedStrokesQueueRef.current.push(abortedStroke);
        currentStrokeRef.current = null;
        isDrawingRef.current = false;
      }
    }
  }, [renderCanvas]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && initialPinchDist.current && pinchStartCanvasPoint.current && containerRef.current) {
      e.preventDefault();
      const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const scale = dist / initialPinchDist.current;
      const newZoom = Math.min(Math.max(initialZoom.current * scale, ZOOM_CONSTRAINTS.MIN), ZOOM_CONSTRAINTS.MAX);
      const rect = containerRef.current.getBoundingClientRect();
      const cx = (p1.x + p2.x) / 2 - rect.left;
      const cy = (p1.y + p2.y) / 2 - rect.top;
      const newPanX = cx - pinchStartCanvasPoint.current.x * newZoom;
      const newPanY = cy - pinchStartCanvasPoint.current.y * newZoom;
      setZoomLevel(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    }
  }, [setZoomLevel, setPanOffset]);

  const handleTouchEnd = useCallback(() => {
    initialPinchDist.current = null;
    pinchStartCanvasPoint.current = null;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // WHEEL ZOOM
  // ─────────────────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      const newZoom = Math.min(Math.max(zoomLevelRef.current + delta, ZOOM_CONSTRAINTS.MIN), ZOOM_CONSTRAINTS.MAX);
      if (embeddedInScroll) {
        setZoomLevel(newZoom);
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const canvasX = (mouseX - panOffsetRef.current.x) / zoomLevelRef.current;
        const canvasY = (mouseY - panOffsetRef.current.y) / zoomLevelRef.current;
        setPanOffset({ x: mouseX - canvasX * newZoom, y: mouseY - canvasY * newZoom });
        setZoomLevel(newZoom);
      } else {
        setZoomLevel(newZoom);
      }
    } else if (!embeddedInScroll) {
      setPanOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  }, [embeddedInScroll, setZoomLevel, setPanOffset]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`tab-rx-canvas-container ${embeddedInScroll ? 'embedded-in-scroll' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      <div
        className="canvas-wrapper"
        style={{
          // When embedded, TabRxCanvas already sizes the page to A4 * zoom — inner scale would
          // still reserve 794×1123 layout space and clip the bottom under overflow:hidden.
          transform: embeddedInScroll
            ? `translate(${panOffset.x}px, ${panOffset.y}px)`
            : `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
        }}
      >
        <canvas
          ref={canvasRef}
          width={A4_BASE_WIDTH}
          height={A4_BASE_HEIGHT}
          // ✅ EXCALIDRAW PATTERN: Remove React synthetic handlers - use native listeners instead
          // Native listeners are attached in useEffect and never get detached during re-renders
          onContextMenu={handleContextMenu}
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            // Always disable native panning/scrolling on the canvas element.
            // Finger scrolling is handled by the parent pages scroller to avoid Chrome
            // treating vertical stylus strokes as viewport scroll (which cancels pen events).
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        />
      </div>
    </div>
  );
});

CanvasEngine.displayName = 'CanvasEngine';

export default CanvasEngine;
