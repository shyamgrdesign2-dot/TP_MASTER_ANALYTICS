import React, { useMemo } from "react";
import {
  Line, LineChart, Bar, BarChart, Area, AreaChart, Pie, PieChart, Cell,
  XAxis, YAxis, CartesianGrid,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "../ui/chart";

// A varied, vibrant categorical palette (not the single brand indigo). Distinct
// hues so multi-series and per-category bars are easy to tell apart.
export const CHART_COLORS = [
  "#4f46e5", // indigo
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#14b8a6", // teal
];

// Labels with a fixed MEANING get a fixed, sensible colour everywhere —
// completed is green, cancelled is red, scheduled is amber — instead of
// whatever palette slot their row index lands on. Residual buckets are grey.
const SEMANTIC_COLORS = {
  completed: "#10b981",
  cancelled: "#ef4444",
  scheduled: "#f59e0b",
  draft: "#06b6d4",
  "pending digitization": "#94a3b8",
  "not tracked": "#94a3b8",
  other: "#94a3b8",
  unknown: "#94a3b8",
  unspecified: "#94a3b8",
  "not recorded": "#94a3b8",
};
const colorAt = (label, i) =>
  SEMANTIC_COLORS[String(label).trim().toLowerCase()] || CHART_COLORS[i % CHART_COLORS.length];

// Compact Indian-numbering tick/tooltip formatter (k / L / Cr).
const fmtNum = (v) => {
  if (typeof v !== "number" || !isFinite(v)) return v;
  const a = Math.abs(v);
  if (a >= 1e7) return `${(v / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return `${Math.round(v * 10) / 10}`;
};

// ── Human, filter-aware bucket labels ───────────────────────────────────────
// The backend emits bucket keys as plain strings: a day ("2026-06-04"), an ISO
// week ("2026-W20") or a month ("2026-06"). Turn those into labels a doctor can
// actually read — weekday names for a short daily window, "Jun 16" for weeks,
// "Jun '26" for months — instead of raw codes like "2026-W20".
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOWF = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONF = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function isoWeekMonday(y, w) {
  const d = new Date(Date.UTC(y, 0, 4)); // Jan 4 is always in ISO week 1
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day + (w - 1) * 7);
  return d;
}
// Short label for axis ticks. `count` lets a ≤8-point daily window show weekday
// names (Mon, Tue, …) and a longer one fall back to "Jun 4".
function fmtTick(key, count) {
  if (typeof key !== "string") return key;
  let m;
  if ((m = key.match(/^(\d{4})-W(\d{2})$/))) { const d = isoWeekMonday(+m[1], +m[2]); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; }
  if ((m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/))) { const d = new Date(+m[1], +m[2] - 1, +m[3]); return count <= 8 ? DOW[d.getDay()] : `${MON[d.getMonth()]} ${d.getDate()}`; }
  if ((m = key.match(/^(\d{4})-(\d{2})$/))) { return `${MON[+m[2] - 1]} '${m[1].slice(2)}`; }
  return key;
}
// Fuller label for the hover tooltip (a week shows its starting date, etc.).
function fmtTickLong(key) {
  if (typeof key !== "string") return key;
  let m;
  if ((m = key.match(/^(\d{4})-W(\d{2})$/))) { const d = isoWeekMonday(+m[1], +m[2]); return `Week of ${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${m[1]}`; }
  if ((m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/))) { const d = new Date(+m[1], +m[2] - 1, +m[3]); return `${DOWF[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`; }
  if ((m = key.match(/^(\d{4})-(\d{2})$/))) { return `${MONF[+m[2] - 1]} ${m[1]}`; }
  return key;
}

/**
 * Renders the analytics query shape { columns:[{key,label}], rows:[{...}] } +
 * a viz spec { x, y:[...] } as a shadcn/Recharts chart. Supports
 * line | area | bar | stackedBar | pie | donut. "What" (data) is decoupled
 * from "how" (viz) — same contract the chart.js version used, so callers are
 * unchanged.
 */
const AnalyticsChart = ({ type = "line", data, viz = {}, height = 300, sequence = false }) => {
  const rows = data?.rows || [];
  const xKey = viz.x;
  const yKeys = viz.y || [];
  const columns = data?.columns || [];
  const isCircular = type === "pie" || type === "donut";

  const labelFor = (key) => (columns.find((c) => c.key === key)?.label || key);

  // series config: key -> { label, color }
  const config = useMemo(() => {
    const c = {};
    if (isCircular) {
      rows.forEach((r, i) => { c[r[xKey]] = { label: r[xKey], color: colorAt(r[xKey], i) }; });
    } else {
      yKeys.forEach((k, i) => { c[k] = { label: labelFor(k), color: CHART_COLORS[i % CHART_COLORS.length] }; });
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, viz, type]);

  if (!rows.length) return null;

  const containerCls = "tw-aspect-auto tw-w-full";
  const style = { height, width: "100%" };

  // ---- Pie / Donut --------------------------------------------------------
  // Horizontal layout: the ring sits left at a fixed size, a value+percent
  // legend fills the remaining width (so a wide card never shows dead space).
  // Stacks vertically only on narrow cards.
  if (isCircular) {
    const measure = yKeys[0];
    const total = rows.reduce((s, r) => s + (Number(r[measure]) || 0), 0);
    const ringPx = 220;
    return (
      <div className="tw-flex tw-flex-col tw-items-center tw-gap-4 sm:tw-flex-row sm:tw-items-center sm:tw-gap-5 sm:tw-px-1">
        <div className="tw-relative tw-shrink-0" style={{ width: ringPx, height: ringPx }}>
          <ChartContainer config={config} className="tw-aspect-square" style={{ width: ringPx, height: ringPx }}>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel formatter={fmtNum} indicator="dot" />} />
              <Pie
                data={rows}
                dataKey={measure}
                nameKey={xKey}
                innerRadius={type === "donut" ? "62%" : 0}
                outerRadius="94%"
                paddingAngle={rows.length > 1 ? 2 : 0}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {rows.map((r, i) => (
                  <Cell key={i} fill={colorAt(r[xKey], i)} className="tw-stroke-background" />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          {type === "donut" && total > 0 && (
            <div className="tw-pointer-events-none tw-absolute tw-inset-0 tw-flex tw-flex-col tw-items-center tw-justify-center">
              <span className="tw-text-[22px] tw-font-bold tw-leading-none tw-tracking-[-0.02em] tw-text-slate-900 tw-tabular-nums">{fmtNum(total)}</span>
              <span className="tw-mt-1 tw-text-[10.5px] tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-400">Total</span>
            </div>
          )}
        </div>
        <ul
          className="tw-grid tw-w-full tw-flex-1 tw-gap-x-5 tw-gap-y-2"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
        >
          {rows.map((r, i) => {
            const v = Number(r[measure]) || 0;
            const pct = total ? Math.round((v / total) * 100) : 0;
            return (
              <li key={i} className="tw-flex tw-items-center tw-gap-2.5 tw-text-[12.5px]">
                <span className="tw-h-2.5 tw-w-2.5 tw-shrink-0 tw-rounded-[3px]" style={{ background: colorAt(r[xKey], i) }} />
                <span className="tw-min-w-0 tw-flex-1 tw-truncate tw-text-slate-600" title={String(r[xKey])}>{r[xKey]}</span>
                <span className="tw-shrink-0 tw-font-semibold tw-tabular-nums tw-text-slate-900">{fmtNum(v)}</span>
                <span className="tw-w-9 tw-shrink-0 tw-text-right tw-tabular-nums tw-text-slate-400">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const axisProps = {
    tickLine: false, axisLine: false, tickMargin: 8,
    style: { fontSize: 11 },
  };
  const grid = <CartesianGrid vertical={false} strokeDasharray="3 3" />;
  const tooltip = <ChartTooltip content={<ChartTooltipContent formatter={fmtNum} labelFormatter={fmtTickLong} indicator={type === "line" || type === "area" ? "line" : "dot"} />} />;
  const legend = yKeys.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null;
  // CATEGORY axes (cities, services, specialties, hours…) must show EVERY label —
  // Recharts' default tick-skipping silently hides categories, which reads as
  // missing data. interval={0} forces all ticks; when they'd collide (many
  // categories or long names) they tilt diagonally and very long names are
  // shortened with an ellipsis — the hover tooltip always shows the full name.
  // TIME axes (dates/weeks/months) keep smart skipping: a long daily series
  // can't print every date and the line itself carries the continuity.
  const isTimeX = typeof rows[0]?.[xKey] === "string" && /^\d{4}-(W\d{2}|\d{2})(-\d{2})?$/.test(rows[0][xKey]);
  const catLabels = rows.map((r) => String(r[xKey] ?? ""));
  const longestCat = catLabels.reduce((m, s) => Math.max(m, s.length), 0);
  const angled = !isTimeX && (rows.length > 5 || longestCat > 8);
  const shortCat = (s) => (s.length > 14 ? `${s.slice(0, 13)}…` : s);
  const xAxis = isTimeX ? (
    <XAxis dataKey={xKey} {...axisProps} minTickGap={16} tickFormatter={(v) => fmtTick(v, rows.length)} />
  ) : (
    <XAxis
      dataKey={xKey} {...axisProps} interval={0}
      angle={angled ? -35 : 0} textAnchor={angled ? "end" : "middle"}
      height={angled ? 64 : 30}
      tickFormatter={(v) => shortCat(String(fmtTick(v, rows.length)))}
    />
  );
  const yAxis = <YAxis {...axisProps} width={44} tickFormatter={fmtNum} />;

  // ---- Area ---------------------------------------------------------------
  if (type === "area") {
    return (
      <ChartContainer config={config} className={containerCls} style={style}>
        <AreaChart data={rows} margin={{ left: 4, right: 12, top: 8 }}>
          <defs>
            {yKeys.map((k, i) => (
              <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.35} />
                <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.04} />
              </linearGradient>
            ))}
          </defs>
          {grid}{xAxis}{yAxis}{tooltip}
          {yKeys.map((k, i) => (
            <Area key={k} dataKey={k} type="monotone" stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2} fill={`url(#fill-${k})`} stackId={undefined} isAnimationActive={false} />
          ))}
          {legend}
        </AreaChart>
      </ChartContainer>
    );
  }

  // ---- Bar / Stacked bar --------------------------------------------------
  if (type === "bar" || type === "stackedBar") {
    // Thick, confident bars: a wide cap + tight category gap so single-series
    // mixes (booking sources, retention, status) read as solid blocks.
    const single = yKeys.length <= 1;
    return (
      <ChartContainer config={config} className={containerCls} style={style}>
        <BarChart data={rows} margin={{ left: 4, right: 12, top: 8 }} barCategoryGap={single ? "18%" : "26%"} barGap={2}>
          {grid}{xAxis}{yAxis}{tooltip}
          {yKeys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={type === "stackedBar" ? 0 : [6, 6, 0, 0]} stackId={type === "stackedBar" ? "a" : undefined} maxBarSize={single ? 96 : 56} isAnimationActive={false}>
              {/* Single-series DISTINCT-category bars get a colour each (top
                  diagnoses, case types, specialties). Time/ordered SEQUENCES
                  (busiest days/hours, lead-time, age bands) stay one colour —
                  the axis position already conveys the differentiation, like a line. */}
              {single && !sequence && rows.map((row, ri) => <Cell key={ri} fill={colorAt(row[xKey], ri)} />)}
            </Bar>
          ))}
          {legend}
        </BarChart>
      </ChartContainer>
    );
  }

  // ---- Line (default) -----------------------------------------------------
  return (
    <ChartContainer config={config} className={containerCls} style={style}>
      <LineChart data={rows} margin={{ left: 4, right: 12, top: 8 }}>
        {grid}{xAxis}{yAxis}{tooltip}
        {yKeys.map((k, i) => (
          <Line key={k} dataKey={k} type="monotone" stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        ))}
        {legend}
      </LineChart>
    </ChartContainer>
  );
};

export default AnalyticsChart;
