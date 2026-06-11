import React from "react";

// Stable unique id per instance (for the gradient), no React-18 dependency.
let _uid = 0;
function useUid() {
  const ref = React.useRef(null);
  if (!ref.current) ref.current = `spark-${++_uid}`;
  return ref.current;
}

/**
 * A faded area sparkline — a soft "wave up / wave down" trend graphic that fills
 * the bottom of a KPI card. Dependency-free SVG; stretches to full width via
 * preserveAspectRatio="none" while the stroke stays crisp (non-scaling-stroke).
 */
const Sparkline = ({ data = [], color = "#4b4ad5", height = 46 }) => {
  const pts = (data || []).filter((v) => typeof v === "number" && isFinite(v));
  const uid = useUid();
  if (pts.length < 2) return null;

  const W = 100;
  const H = height;
  const pad = 4;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const stepX = W / (pts.length - 1);
  const coords = pts.map((v, i) => [i * stepX, H - pad - ((v - min) / range) * (H - pad * 2)]);
  // Smooth Catmull-Rom → cubic-bezier curve for an elegant wave (not jagged).
  const t = 0.16;
  let line = `M${coords[0][0].toFixed(1)},${coords[0][1].toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[Math.max(0, i - 1)];
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    const [x3, y3] = coords[Math.min(coords.length - 1, i + 2)];
    const c1x = x1 + (x2 - x0) * t;
    const c1y = y1 + (y2 - y0) * t;
    const c2x = x2 - (x3 - x1) * t;
    const c2y = y2 - (y3 - y1) * t;
    line += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export default Sparkline;
