import React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "./lib/utils";

// shadcn chart primitive (Recharts), JSX port, tw- prefixed.
const ChartContext = React.createContext(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within <ChartContainer />");
  return ctx;
}

const ChartContainer = React.forwardRef(({ id, className, children, config = {}, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${(id || uniqueId).replace(/:/g, "")}`;
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "tw-flex tw-justify-center tw-text-xs [&_.recharts-cartesian-axis-tick_text]:tw-fill-muted-foreground [&_.recharts-cartesian-grid_line]:tw-stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:tw-stroke-border [&_.recharts-dot]:tw-stroke-transparent [&_.recharts-layer]:tw-outline-none [&_.recharts-sector]:tw-outline-none [&_.recharts-surface]:tw-outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartStyle = ({ id, config }) => {
  const colorEntries = Object.entries(config).filter(([, v]) => v && v.color);
  if (!colorEntries.length) return null;
  const css = `[data-chart=${id}] {\n${colorEntries.map(([key, v]) => `  --color-${key}: ${v.color};`).join("\n")}\n}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef(
  ({ active, payload, label, labelFormatter, formatter, hideLabel = false, hideIndicator = false, indicator = "dot", className }, ref) => {
    const { config } = useChart();
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        ref={ref}
        className={cn(
          "tp-analytics-portal tw-grid tw-min-w-[8rem] tw-items-start tw-gap-1.5 tw-rounded-lg tw-border tw-border-border/60 tw-bg-popover tw-px-2.5 tw-py-1.5 tw-text-xs tw-shadow-xl",
          className
        )}
      >
        {!hideLabel && <div className="tw-font-medium tw-text-foreground">{labelFormatter ? labelFormatter(label) : label}</div>}
        <div className="tw-grid tw-gap-1.5">
          {payload.map((item, i) => {
            const key = item.dataKey || item.name;
            const conf = config[key] || {};
            const color = item.color || item.payload?.fill || `var(--color-${key})`;
            return (
              <div key={i} className="tw-flex tw-w-full tw-items-center tw-gap-2">
                {!hideIndicator && (
                  <span
                    className={cn("tw-shrink-0 tw-rounded-[2px]", indicator === "dot" ? "tw-h-2.5 tw-w-2.5 tw-rounded-full" : "tw-h-2.5 tw-w-1")}
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="tw-text-muted-foreground">{conf.label || item.name}</span>
                <span className="tw-ml-auto tw-font-medium tw-tabular-nums tw-text-foreground">
                  {formatter ? formatter(item.value) : item.value?.toLocaleString?.() ?? item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef(({ payload, className, verticalAlign = "bottom" }, ref) => {
  const { config } = useChart();
  if (!payload || !payload.length) return null;
  return (
    <div ref={ref} className={cn("tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-x-4 tw-gap-y-1", verticalAlign === "top" ? "tw-pb-2" : "tw-pt-3", className)}>
      {payload.map((item, i) => {
        const key = item.dataKey || item.value;
        const conf = config[key] || {};
        return (
          <div key={i} className="tw-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-muted-foreground">
            <span className="tw-h-2.5 tw-w-2.5 tw-shrink-0 tw-rounded-[2px]" style={{ backgroundColor: item.color }} />
            {conf.label || item.value}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle, useChart };
