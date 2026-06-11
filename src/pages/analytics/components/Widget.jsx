import React, { useState } from "react";
import { Tooltip } from "antd";
import { Chart, Box1, InfoCircle } from "iconsax-reactjs";
import AnalyticsChart from "./AnalyticsChart";
import AnalyticsTable from "./AnalyticsTable";
import KpiCard from "./KpiCard";
import ExportButton from "./ExportButton";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "../ui/lib/utils";

// Compact line/bar switch shown on comparison charts so the same data can be
// read as a trend (line) or a magnitude comparison (bars).
const GLYPH = {
  line: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <polyline points="1,10 5,6 8,8 13,2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bar: (
    <svg width="13" height="13" viewBox="0 0 14 14">
      <rect x="1" y="7" width="3" height="6" rx="1" fill="currentColor" />
      <rect x="5.5" y="3.5" width="3" height="9.5" rx="1" fill="currentColor" />
      <rect x="10" y="9" width="3" height="4" rx="1" fill="currentColor" />
    </svg>
  ),
};
// Shown inside a chart/table card when there are no rows for the current
// period — so an empty panel reads as an intentional "no data" state, never a
// blank box. Sized to match a chart so the card keeps its rhythm in the grid.
function PanelEmpty({ note, icon = "chart" }) {
  const Glyph = icon === "table" ? Box1 : Chart;
  return (
    <div className="tw-flex tw-h-[220px] tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-text-center">
      <span className="tw-flex tw-h-11 tw-w-11 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-muted tw-text-slate-300">
        <Glyph size={22} variant="Bulk" color="currentColor" />
      </span>
      <span className="tw-text-[13px] tw-font-semibold tw-text-slate-500">No data available</span>
      <span className="tw-max-w-[16rem] tw-text-[11.5px] tw-text-muted-foreground">
        {note || "Nothing was recorded for this metric in the selected period."}
      </span>
    </div>
  );
}

// One grey segmented switch (not two separate buttons): a solid muted track with
// a single white pill marking the active type.
function ChartTypeToggle({ value, onChange }) {
  const isLine = value === "line" || value === "area";
  const opts = [
    { k: "line", on: isLine },
    { k: "bar", on: !isLine },
  ];
  return (
    <div className="tw-inline-flex tw-items-center tw-gap-0.5 tw-rounded-lg tw-bg-muted tw-p-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          type="button"
          onClick={() => onChange(o.k)}
          aria-label={o.k === "line" ? "Line chart" : "Bar chart"}
          className={cn(
            "tw-flex tw-h-6 tw-w-7 tw-items-center tw-justify-center tw-rounded-md tw-transition-all tw-duration-150",
            o.on ? "tw-bg-white tw-text-primary tw-shadow-sm" : "tw-text-slate-400 hover:tw-text-slate-600",
          )}
        >
          {GLYPH[o.k]}
        </button>
      ))}
    </div>
  );
}

// A plain inline info icon for any card heading — same look everywhere (KPI,
// chart, table). Appends the live filter scope so the number's context is clear.
function HeadingInfo({ text, scopeNote }) {
  if (!text) return null;
  const title = scopeNote ? (
    <span>
      {text}
      <span className="tw-mt-1.5 tw-block tw-opacity-80" style={{ fontSize: 11 }}>Showing: {scopeNote}</span>
    </span>
  ) : text;
  return (
    <Tooltip title={title} placement="top" rootClassName="tp-analytics-portal">
      <span tabIndex={0} className="tw-inline-flex tw-shrink-0 tw-cursor-help tw-text-slate-400 hover:tw-text-slate-600">
        <InfoCircle size={13} />
      </span>
    </Tooltip>
  );
}

/**
 * Renders one widget descriptor (kpis | chart | table | empty) on shadcn Card.
 * Layout classes are tw- prefixed (collision-free with Bootstrap). The KPI row
 * spans the page grid; chart/table widgets honour span:"full".
 */
const Widget = ({ widget, scopeNote }) => {
  // Local chart type so the line/bar toggle works per card (donut stays donut).
  const [ctype, setCtype] = useState(widget.chartType);

  if (widget.kind === "kpis") {
    return (
      <div
        className="tw-col-span-full tw-grid tw-gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 232px), 1fr))" }}
      >
        {widget.kpis.map((k, i) => (
          <KpiCard
            key={i}
            title={k.title} value={k.value} prefix={k.prefix} suffix={k.suffix}
            description={k.description} delta={k.delta} deltaLabel={k.deltaLabel}
            spark={k.spark} accent={k.accent} hero={k.hero} scopeNote={scopeNote}
          />
        ))}
      </div>
    );
  }

  const chartCols = widget.data?.columns;
  const chartRows = widget.data?.rows;
  const patientCols = widget.patientData?.columns;
  const patientRows = widget.patientData?.rows;
  const chartExportCols = widget.kind === "table" ? widget.columns : chartCols;
  const chartExportRows = widget.kind === "table" ? widget.rows : chartRows;
  const filename = (widget.title || "analytics").replace(/\s+/g, "_").toLowerCase();
  const fullSpan = widget.span === "full";

  if (widget.kind === "empty") {
    return (
      <Card className="tw-rounded-2xl tw-border-border/80" style={{ gridColumn: fullSpan ? "1 / -1" : undefined }}>
        <CardContent className="tw-p-8">
          <div className="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-text-center">
            <span className="tw-flex tw-h-11 tw-w-11 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-muted tw-text-slate-300">
              <Chart size={22} variant="Bulk" color="currentColor" />
            </span>
            <span className="tw-text-[13px] tw-font-semibold tw-text-slate-500">Nothing here yet</span>
            <span className="tw-max-w-xl tw-text-sm tw-text-muted-foreground">{widget.note}</span>
            {widget.planned?.length > 0 && (
              <ul className="tw-mt-2 tw-list-inside tw-list-disc tw-text-left tw-text-xs tw-text-muted-foreground/80">
                {widget.planned.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="tw-flex tw-flex-col tw-overflow-hidden tw-rounded-2xl tw-border-border/80 tw-shadow-[0_1px_2px_rgba(23,23,37,0.04)] tw-transition-shadow tw-duration-200 hover:tw-shadow-[0_8px_24px_rgba(23,23,37,0.08)]"
      style={{ gridColumn: fullSpan ? "1 / -1" : undefined }}
    >
      <CardHeader className="!tw-flex-row tw-items-center tw-justify-between tw-space-y-0 tw-border-b tw-border-border/60 tw-bg-muted/30 tw-py-3.5">
        <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-1.5">
          <CardTitle className="tw-truncate tw-text-[13.5px] tw-font-semibold tw-text-slate-800">{widget.title}</CardTitle>
          <HeadingInfo text={widget.info} scopeNote={scopeNote} />
        </div>
        <div className="tw-flex tw-items-center tw-gap-2">
          {widget.kind === "chart" && widget.toggleable && (
            <ChartTypeToggle value={ctype} onChange={setCtype} />
          )}
          {widget.sample && <Badge variant="warning">Sample</Badge>}
          <ExportButton
            columns={chartExportCols} rows={chartExportRows}
            patientColumns={patientCols} patientRows={patientRows} filename={filename}
          />
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "tw-flex tw-flex-1 tw-flex-col tw-p-4",
          // Charts/donuts center vertically so a short chart in a tall (height-matched)
          // card sits on the card's mid-line instead of hugging the top. Tables stay
          // top-aligned so rows read from the top down.
          widget.kind === "chart" && "tw-justify-center",
        )}
      >
        {widget.kind === "chart" &&
          (!widget.data?.rows?.length ? (
            <PanelEmpty note={widget.note} icon="chart" />
          ) : (
            <>
              <AnalyticsChart type={ctype} data={widget.data} viz={widget.viz} sequence={widget.sequence} />
              {widget.note && <div className="tw-mt-2 tw-text-[11px] tw-text-muted-foreground">{widget.note}</div>}
            </>
          ))}

        {widget.kind === "table" &&
          (!widget.rows?.length ? (
            <PanelEmpty note={widget.note} icon="table" />
          ) : (
            <AnalyticsTable columns={widget.columns} rows={widget.rows} note={widget.note} />
          ))}
      </CardContent>
    </Card>
  );
};

export default Widget;
