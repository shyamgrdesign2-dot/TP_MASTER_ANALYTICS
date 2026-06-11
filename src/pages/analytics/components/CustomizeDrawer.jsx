import React from "react";
import { Drawer, Switch, Button, Empty } from "antd";
import { ArrowUp2, ArrowDown2 } from "iconsax-reactjs";
import { cn } from "../ui/lib/utils";

/**
 * Customize panel for a dashboard page. The KPI band is expanded into its
 * individual metric cards, so the user can show/hide and reorder each metric
 * (and each chart/table). Stateless — the parent owns `pref`
 * ({ hidden:[ids], order:[ids] }) and persists it. KPI ids are "kpi:<slug>";
 * chart/table ids are the widget id.
 */
export default function CustomizeDrawer({ open, onClose, leafLabel, widgets = [], pref, onChange }) {
  const hidden = new Set(pref?.hidden || []);
  const order = pref?.order || [];
  const oidx = (id) => {
    const i = order.indexOf(id);
    return i < 0 ? 999 : i;
  };

  const metricUnits = [];
  const blockUnits = [];
  widgets.forEach((w) => {
    if (w.kind === "kpis") (w.kpis || []).forEach((k) => metricUnits.push({ id: k.id, label: k.title }));
    else blockUnits.push({ id: w.id, label: w.title || w.id });
  });
  metricUnits.sort((a, b) => oidx(a.id) - oidx(b.id));
  blockUnits.sort((a, b) => oidx(a.id) - oidx(b.id));

  const writeOrder = (metrics, blocks) =>
    onChange({ ...(pref || {}), order: [...metrics.map((u) => u.id), ...blocks.map((u) => u.id)] });
  const setHidden = (id, hide) => {
    const n = new Set(hidden);
    if (hide) n.add(id);
    else n.delete(id);
    onChange({ ...(pref || {}), hidden: [...n] });
  };
  const move = (list, other, isMetric, idx, dir) => {
    const arr = [...list];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    if (isMetric) writeOrder(arr, other);
    else writeOrder(other, arr);
  };

  const Row = ({ u, i, list, other, isMetric }) => {
    const isHidden = hidden.has(u.id);
    return (
      <div className="tw-flex tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2">
        <div className="tw-flex tw-flex-col tw-gap-0.5">
          <button type="button" disabled={i === 0} onClick={() => move(list, other, isMetric, i, -1)} aria-label="Move up"
            className="tw-text-slate-400 hover:tw-text-slate-700 disabled:tw-opacity-25">
            <ArrowUp2 size={13} />
          </button>
          <button type="button" disabled={i === list.length - 1} onClick={() => move(list, other, isMetric, i, 1)} aria-label="Move down"
            className="tw-text-slate-400 hover:tw-text-slate-700 disabled:tw-opacity-25">
            <ArrowDown2 size={13} />
          </button>
        </div>
        <span className={cn("tw-flex-1 tw-text-[13px]", isHidden ? "tw-text-slate-400 tw-line-through" : "tw-text-slate-700")}>
          {u.label}
        </span>
        <Switch size="small" checked={!isHidden} onChange={(on) => setHidden(u.id, !on)} />
      </div>
    );
  };

  const Group = ({ title, list, other, isMetric }) =>
    !list.length ? null : (
      <div className="tw-mb-4">
        <div className="tw-mb-2 tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-[0.08em] tw-text-slate-400">{title}</div>
        <div className="tw-flex tw-flex-col tw-gap-2">
          {list.map((u, i) => (
            <Row key={u.id} u={u} i={i} list={list} other={other} isMetric={isMetric} />
          ))}
        </div>
      </div>
    );

  const empty = !metricUnits.length && !blockUnits.length;

  return (
    <Drawer
      title={`Customize · ${leafLabel || "Dashboard"}`}
      open={open}
      onClose={onClose}
      width={380}
      rootClassName="tp-analytics-portal"
      extra={
        <Button size="small" type="text" onClick={() => onChange({ hidden: [], order: [] })}>
          Reset
        </Button>
      }
    >
      <p className="tw-mb-4 tw-text-[12.5px] tw-text-slate-500">
        Toggle metrics and cards on or off, and reorder them with the arrows. Saved on this device.
      </p>
      {empty ? (
        <Empty description="Nothing to customize on this page yet" />
      ) : (
        <>
          <Group title="Metrics" list={metricUnits} other={blockUnits} isMetric />
          <Group title="Charts & tables" list={blockUnits} other={metricUnits} isMetric={false} />
        </>
      )}
    </Drawer>
  );
}
