import * as React from "react";

export function useEscape(onEscape, active = true) {
  React.useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (e.key === "Escape") onEscape?.(e);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape, active]);
}

export function useClickOutside(refs, onOutside, active = true) {
  React.useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      const list = Array.isArray(refs) ? refs : [refs];
      const target = e.target;
      const inside = list.some((ref) => {
        const node = ref?.current;
        return node && node.contains(target);
      });
      if (!inside) onOutside?.(e);
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [refs, onOutside, active]);
}

export function useScrollLock(active) {
  React.useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (sbw > 0) body.style.paddingRight = `${sbw}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [active]);
}

export function useFocusTrap(containerRef, active) {
  React.useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const previouslyFocused = document.activeElement;
    const container = containerRef.current;
    if (!container) return;

    const focusables = () =>
      Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("data-focus-trap-skip"));

    const items = focusables();
    if (items.length) {
      items[0].focus();
    } else {
      container.setAttribute("tabindex", "-1");
      container.focus();
    }

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [containerRef, active]);
}

export function usePosition({
  triggerRef,
  floatingRef,
  open,
  side = "top",
  align = "center",
  sideOffset = 6,
  collisionPadding = 8,
}) {
  const [pos, setPos] = React.useState({ x: 0, y: 0, side });

  React.useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const floating = floatingRef.current;
    if (!trigger || !floating) return;

    let raf = 0;
    const compute = () => {
      const t = trigger.getBoundingClientRect();
      const f = floating.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let chosenSide = side;

      const fits = (s) => {
        if (s === "top") return t.top - f.height - sideOffset >= collisionPadding;
        if (s === "bottom") return t.bottom + f.height + sideOffset <= vh - collisionPadding;
        if (s === "left") return t.left - f.width - sideOffset >= collisionPadding;
        if (s === "right") return t.right + f.width + sideOffset <= vw - collisionPadding;
        return true;
      };
      const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" };
      if (!fits(side) && fits(opposite[side])) chosenSide = opposite[side];

      let x = 0;
      let y = 0;
      if (chosenSide === "top" || chosenSide === "bottom") {
        if (align === "start") x = t.left;
        else if (align === "end") x = t.right - f.width;
        else x = t.left + (t.width - f.width) / 2;
        y = chosenSide === "top" ? t.top - f.height - sideOffset : t.bottom + sideOffset;
      } else {
        if (align === "start") y = t.top;
        else if (align === "end") y = t.bottom - f.height;
        else y = t.top + (t.height - f.height) / 2;
        x = chosenSide === "left" ? t.left - f.width - sideOffset : t.right + sideOffset;
      }

      x = Math.max(collisionPadding, Math.min(x, vw - f.width - collisionPadding));
      y = Math.max(collisionPadding, Math.min(y, vh - f.height - collisionPadding));

      setPos((prev) =>
        prev.x === x && prev.y === y && prev.side === chosenSide
          ? prev
          : { x, y, side: chosenSide },
      );
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    schedule();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(floating);
    ro?.observe(trigger);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [open, triggerRef, floatingRef, side, align, sideOffset, collisionPadding]);

  return pos;
}
