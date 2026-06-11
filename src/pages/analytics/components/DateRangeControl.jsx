import React, { useState } from "react";
import { Dropdown, DatePicker, Button } from "antd";
import { Calendar, ArrowDown2 } from "iconsax-reactjs";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

// Quick-range presets: Today + rolling windows. Each value() is an inclusive
// [start, end] pair ending today.
const today = () => dayjs();
export const RANGE_PRESETS = [
  { key: "today", label: "Today", value: () => [today(), today()] },
  { key: "7d", label: "Last 7 days", value: () => [today().subtract(6, "day"), today()] },
  { key: "15d", label: "Last 15 days", value: () => [today().subtract(14, "day"), today()] },
  { key: "30d", label: "Last 30 days", value: () => [today().subtract(29, "day"), today()] },
  { key: "90d", label: "Last 90 days", value: () => [today().subtract(89, "day"), today()] },
  { key: "1y", label: "Last 1 year", value: () => [today().subtract(1, "year").add(1, "day"), today()] },
  { key: "alltime", label: "Till date", value: () => [today().subtract(15, "year"), today()] },
];

// Which preset (if any) does the current [start,end] match? Compared by day.
export const matchPreset = (range) => {
  if (!range || !range[0] || !range[1]) return null;
  return RANGE_PRESETS.find((p) => {
    const [s, e] = p.value();
    return range[0].isSame(s, "day") && range[1].isSame(e, "day");
  }) || null;
};

// The human label for a [start,end] range — the SAME string the control shows.
// A matched preset (e.g. "Till date", "Last 7 days") wins; otherwise the explicit
// dates, both with the year so a wide range is never mistaken for a single day.
// Single source of truth so heading tooltips stay in lock-step with the filter.
export const periodLabel = (range) => {
  const preset = matchPreset(range);
  if (preset) return preset.label;
  if (!range || !range[0] || !range[1]) return "All time";
  if (range[0].isSame(range[1], "day")) return range[0].format("D MMM YYYY");
  return `${range[0].format("D MMM YYYY")} – ${range[1].format("D MMM YYYY")}`;
};

/**
 * Period control: a dropdown of quick presets + a custom range picker. The
 * trigger shows the PRESET NAME (e.g. "Last 7 days") when the active range
 * matches a preset, and only the explicit dates for a custom range. Emits the
 * chosen [start, end] dayjs pair via onChange.
 */
const DateRangeControl = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const preset = matchPreset(value);
  const label = preset
    ? preset.label
    : value && value[0] && value[1]
      ? `${value[0].format("DD MMM YYYY")} – ${value[1].format("DD MMM YYYY")}`
      : "Select period";

  const pick = (range) => { onChange(range); setOpen(false); };

  const panel = (
    <div className="analytics-period-panel" onClick={(e) => e.stopPropagation()}>
      <div className="analytics-period-presets">
        {RANGE_PRESETS.map((p) => {
          const active = preset?.key === p.key;
          return (
            <button
              key={p.key}
              type="button"
              className={`analytics-period-preset ${active ? "is-active" : ""}`}
              onClick={() => pick(p.value())}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="analytics-period-custom">
        <div className="analytics-period-custom__label">Custom range</div>
        <RangePicker
          value={preset ? null : value}
          onChange={(v) => v && v[0] && v[1] && pick(v)}
          allowClear={false}
          format="DD MMM YYYY"
          inputReadOnly
          getPopupContainer={(t) => t.parentElement}
          disabledDate={(d) => d && d > dayjs().endOf("day")}
        />
      </div>
    </div>
  );

  return (
    <Dropdown open={open} onOpenChange={setOpen} trigger={["click"]} placement="bottomLeft" dropdownRender={() => panel}>
      <Button className="analytics-period-trigger">
        <Calendar size={14} color="var(--tp-slate-400)" />
        <span>{label}</span>
        <ArrowDown2 size={13} color="var(--tp-slate-400)" />
      </Button>
    </Dropdown>
  );
};

export default DateRangeControl;
