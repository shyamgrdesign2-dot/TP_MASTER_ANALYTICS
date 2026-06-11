import React from "react";

/**
 * A labelled band divider that segments the canvas into sections instead of
 * one long card list. Renders as a full-width grid row: a gradient tick, an
 * uppercase title, an optional count chip and an optional tag, then a hairline
 * rule that fills the remaining width.
 */
const SectionHeader = ({ title, count, tag }) => (
  <div className="tw-col-span-full tw-mb-0.5 tw-mt-3 tw-flex tw-items-center tw-gap-3 first:tw-mt-0">
    <span
      className="tw-h-4 tw-w-1.5 tw-shrink-0 tw-rounded-full"
      style={{ background: "linear-gradient(180deg,#6c6bde,#3c3bb5)" }}
    />
    <span className="tw-text-[12px] tw-font-bold tw-uppercase tw-tracking-[0.09em] tw-text-slate-500">
      {title}
    </span>
    {typeof count === "number" && count > 0 && (
      <span className="tw-rounded-full tw-bg-muted tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold tw-tabular-nums tw-text-muted-foreground">
        {count}
      </span>
    )}
    {tag && (
      <span className="tw-rounded-full tw-bg-primary/10 tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold tw-text-primary">
        {tag}
      </span>
    )}
    <span className="tw-ml-1 tw-h-px tw-flex-1 tw-bg-border/70" />
  </div>
);

export default SectionHeader;
