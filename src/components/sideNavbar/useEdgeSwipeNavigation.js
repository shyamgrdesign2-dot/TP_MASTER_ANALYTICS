import { useEffect, useRef } from "react";

const EDGE_SETTLE_MS = 220;
const WHEEL_OVERSCROLL_THRESHOLD = 480;
const WHEEL_IDLE_RESET_MS = 260;
const TOUCH_DISTANCE_THRESHOLD = 110;
const TOUCH_VELOCITY_THRESHOLD = 0.65;
const COOLDOWN_MS = 800;

function isAtTop(el) {
  return el.scrollTop <= 1;
}

function isAtBottom(el) {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
}

function findScrollEl(container, selector) {
  const explicit = container.querySelector(selector);
  if (explicit) return explicit;

  const candidates = container.querySelectorAll("*");
  for (const el of candidates) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
      return el;
    }
  }
  return null;
}

export function useEdgeSwipeNavigation({
  containerRef,
  scrollSelector = "[data-snv-scroll-root='true']",
  onNavigate,
  enabled = true,
  resetKey,
}) {
  const lastFiredAt = useRef(0);
  const wheelAccumulator = useRef(0);
  const wheelDirection = useRef(null);
  const lastWheelAt = useRef(0);
  const overscrollStartAt = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    let detach = () => {};
    const rafId = requestAnimationFrame(() => {
      const el = findScrollEl(container, scrollSelector);
      if (el) attach(el);
    });

    function attach(el) {
      wheelAccumulator.current = 0;
      wheelDirection.current = null;
      overscrollStartAt.current = null;
      lastWheelAt.current = 0;

      const resetWheel = () => {
        wheelAccumulator.current = 0;
        wheelDirection.current = null;
        overscrollStartAt.current = null;
      };

      const fire = (dir) => {
        const now = performance.now();
        if (now - lastFiredAt.current < COOLDOWN_MS) return;
        lastFiredAt.current = now;
        resetWheel();
        onNavigate(dir);
      };

      const onScroll = () => {
        const top = isAtTop(el);
        const bottom = isAtBottom(el);
        if ((wheelDirection.current === "next" && !bottom) || (wheelDirection.current === "prev" && !top)) {
          resetWheel();
        }
      };

      const onWheel = (event) => {
        const dy = event.deltaY;
        if (Math.abs(dy) < 4) return;

        const now = performance.now();
        const goingDown = dy > 0;
        const atTop = isAtTop(el);
        const atBottom = isAtBottom(el);
        const overscrolling = (goingDown && atBottom) || (!goingDown && atTop);

        if (!overscrolling) {
          resetWheel();
          return;
        }

        const dir = goingDown ? "next" : "prev";

        if (wheelDirection.current !== dir) {
          wheelDirection.current = dir;
          wheelAccumulator.current = 0;
          overscrollStartAt.current = null;
        }

        if (lastWheelAt.current && now - lastWheelAt.current > WHEEL_IDLE_RESET_MS) {
          wheelAccumulator.current = 0;
          overscrollStartAt.current = null;
        }
        lastWheelAt.current = now;

        if (overscrollStartAt.current === null) {
          overscrollStartAt.current = now;
          return;
        }
        if (now - overscrollStartAt.current < EDGE_SETTLE_MS) return;

        wheelAccumulator.current += Math.abs(dy);
        if (wheelAccumulator.current >= WHEEL_OVERSCROLL_THRESHOLD) fire(dir);
      };

      let touchStartY = 0;
      let touchStartTime = 0;
      let touchStartedAtTop = false;
      let touchStartedAtBottom = false;

      const onTouchStart = (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        touchStartY = touch.clientY;
        touchStartTime = performance.now();
        touchStartedAtTop = isAtTop(el);
        touchStartedAtBottom = isAtBottom(el);
      };

      const onTouchEnd = (event) => {
        const touch = event.changedTouches[0];
        if (!touch) return;
        const dy = touchStartY - touch.clientY;
        const dt = performance.now() - touchStartTime;
        if (dt <= 0) return;
        const velocity = Math.abs(dy) / dt;
        if (Math.abs(dy) < TOUCH_DISTANCE_THRESHOLD) return;
        if (velocity < TOUCH_VELOCITY_THRESHOLD) return;

        if (dy > 0 && touchStartedAtBottom && isAtBottom(el)) fire("next");
        if (dy < 0 && touchStartedAtTop && isAtTop(el)) fire("prev");
      };

      el.addEventListener("scroll", onScroll, { passive: true });
      el.addEventListener("wheel", onWheel, { passive: true });
      el.addEventListener("touchstart", onTouchStart, { passive: true });
      el.addEventListener("touchend", onTouchEnd, { passive: true });

      detach = () => {
        el.removeEventListener("scroll", onScroll);
        el.removeEventListener("wheel", onWheel);
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchend", onTouchEnd);
      };
    }

    return () => {
      cancelAnimationFrame(rafId);
      detach();
      wheelAccumulator.current = 0;
      wheelDirection.current = null;
      overscrollStartAt.current = null;
      lastWheelAt.current = 0;
    };
  }, [enabled, onNavigate, containerRef, scrollSelector, resetKey]);
}
