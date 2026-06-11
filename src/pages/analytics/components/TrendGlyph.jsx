import React from "react";

let _u = 0;
function useUid() {
  const r = React.useRef(null);
  if (!r.current) r.current = `tg-${++_u}`;
  return r.current;
}

/**
 * A tiny, fixed directional trend illustration — TWO variants only:
 *   up   → a line that rises from bottom-left to top-right
 *   down → a line that falls from top-left to bottom-right
 * It conveys direction at a glance (the actual data wave didn't), and takes very
 * little width so the NUMBER stays primary and never gets truncated.
 */
const TrendGlyph = ({ dir = "flat", color = "#10b981", width = 50, height = 34 }) => {
  const uid = useUid();
  const W = 50;
  const H = 34;
  const p = 3;
  const line =
    dir === "up"
      ? `M${p},${H - p} C${W * 0.42},${H - p} ${W * 0.58},${p} ${W - p},${p}`
      : dir === "down"
      ? `M${p},${p} C${W * 0.42},${p} ${W * 0.58},${H - p} ${W - p},${H - p}`
      : `M${p},${H / 2} L${W - p},${H / 2}`;
  const area = `${line} L${W - p},${H} L${p},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default TrendGlyph;
