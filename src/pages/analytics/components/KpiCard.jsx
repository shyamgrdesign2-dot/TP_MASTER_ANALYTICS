import React from "react";
import { Tooltip } from "antd";
import { Card } from "../ui/card";
import { cn } from "../ui/lib/utils";
import { TrendUp, TrendDown, TrendFlat } from "./TrendIcon";
import { METRIC_ICON_BY_TITLE, CapsuleGlyph, SyringeGlyph } from "./MetricIcons";
import {
  Wallet3,
  Profile2User,
  ProfileAdd,
  ProfileTick,
  Calendar,
  Activity,
  Chart21,
  ShieldTick,
  ReceiptText,
  ReceiptDiscount,
  MoneyRecive,
  MoneyRemove,
  MoneyTime,
  Health,
  ChemicalGlass,
  ClipboardText,
  ArchiveBook,
  Woman,
  HeartAdd,
  Ruler,
  Layer,
  MedalStar,
  Box,
  Timer1,
  TrendUp as TrendUpBulk,
  InfoCircle,
} from "iconsax-reactjs";

// The metric icon chip is ALWAYS violet (the trend is conveyed by the coloured
// tag below, not the icon). One calm brand tone, never red/amber on the glyph.
const VIOLET_TINT = { bg: "#f2e9fb", fg: "#8a4dbb" };

// Trend tag uses exactly three sentiment colours: green (good), red (bad),
// amber (flat / no change). The arrow shows the *actual* direction of movement.
const SENTI = {
  up: "tw-text-success tw-bg-success/12",
  down: "tw-text-destructive tw-bg-destructive/12",
  flat: "tw-text-amber-600 tw-bg-amber-500/12",
};
const DIR_ICON = { up: TrendUp, down: TrendDown, flat: TrendFlat };

// Pick the icon glyph by metric type (colour is always violet).
const RULES = [
  // Clinical first (most specific wins)
  { re: /(vaccin|dose|immuni)/i, Icon: SyringeGlyph },
  { re: /(medication|medicine|drug|prescri|generic|brand|pharma)/i, Icon: CapsuleGlyph },
  { re: /(lab|investigation|test\b|pathology)/i, Icon: ChemicalGlass },
  { re: /(symptom)/i, Icon: ClipboardText },
  { re: /(diagnos|icd|condition)/i, Icon: Health },
  { re: /(history|allerg|family|lifestyle|surger|surgical)/i, Icon: ArchiveBook },
  { re: /(gynec|menarche|cycle|menstr|flow\b)/i, Icon: Woman },
  { re: /(obstetric|pregnan|delivery|gestation|edd|anc|ectopic|abortion)/i, Icon: HeartAdd },
  { re: /(growth|height|weight|ofc|measure)/i, Icon: Ruler },
  { re: /(vital|bp\b|bmi|pulse|spo2|rbs)/i, Icon: Activity },
  { re: /(module)/i, Icon: Layer },
  { re: /(certificate)/i, Icon: MedalStar },
  { re: /(stock|batch|expir|supplier|items? \/ bill)/i, Icon: Box },
  // Money (granular before the catch-all)
  { re: /(due|outstanding|pending)/i, Icon: MoneyTime },
  { re: /(refund)/i, Icon: MoneyRemove },
  { re: /(discount)/i, Icon: ReceiptDiscount },
  { re: /(collect|received|advance)/i, Icon: MoneyRecive },
  { re: /(projected|forecast)/i, Icon: TrendUpBulk },
  { re: /(invoice|bills?\b|receipt|ledger|memo|avg bill)/i, Icon: ReceiptText },
  { re: /(revenue|amount|paid|value|billed|sales|gst|incentive|₹)/i, Icon: Wallet3 },
  // Patients
  { re: /(one-?time|new patient|first)/i, Icon: ProfileAdd },
  { re: /(returning|retain|repeat)/i, Icon: ProfileTick },
  { re: /(patient|panel|cohort|footfall|visitor|buyer|lapsed|contactable|blood)/i, Icon: Profile2User },
  // Compliance / identity
  { re: /(abha|abdm|kyc|consent|link|verif|care context)/i, Icon: ShieldTick },
  // Time + scheduling
  { re: /(time|duration|wait|interval|minute|consult|hour)/i, Icon: Timer1 },
  { re: /(appointment|booked|booking|follow|visit|slot|schedul|website|agent|walk|busiest)/i, Icon: Calendar },
  // Rates and everything else
  { re: /(rate|adherence|ratio|quality|share|conversion|completion|cancel|%)/i, Icon: Chart21 },
];
const pickIcon = (title = "") => RULES.find((r) => r.re.test(title))?.Icon || Chart21;

const fmtValue = (v) => (typeof v === "number" && isFinite(v) ? v.toLocaleString("en-IN") : v);

// Metrics where DOWN is good (lower is better) — a drop reads green, not red.
const INVERSE_RE = /cancel|no.?show|missed|overdue|wait|outstanding|refund|lapsed|decline|readmiss|drop|churn/i;

/**
 * KPI tile. Two value modes:
 *  - NUMBER (counts, rates, ₹ amounts) → large 34px tabular figure, never truncated.
 *  - TEXT (top diagnosis / medication names) → smaller wrapped label (max 2 lines)
 *    so a long name like "Cetrizen 5mg Tablet" fits inside the card.
 * Every card carries one violet metric icon top-right; a compact green/red/amber
 * trend tag with a readable period label sits below when a delta is available.
 */
const KpiCard = ({ title, value, prefix, suffix, delta, deltaLabel = "previous period", description, scopeNote }) => {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const dir = !hasDelta || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const DirIcon = DIR_ICON[dir]; // arrow = real direction of change
  // sentiment: for inverse metrics a decrease is the good (green) outcome
  const positive = !hasDelta ? null : INVERSE_RE.test(title || "") ? delta < 0 : delta > 0;
  const senti = !hasDelta || delta === 0 ? "flat" : positive ? "up" : "down";
  const showDelta = hasDelta && Math.abs(delta) < 500; // hide noise off a tiny base
  const iconTint = VIOLET_TINT; // always violet — never tinted by trend
  // Tooltip = the metric definition + the live filter scope it's computed for.
  const tipTitle = scopeNote ? (
    <span>
      {description}
      <span className="tw-mt-1.5 tw-block tw-opacity-80" style={{ fontSize: 11 }}>Showing: {scopeNote}</span>
    </span>
  ) : description;

  // Comparison sentence: the tag carries direction + %, the suffix names the
  // window — "vs previous ‹31 days›" with the window emphasised so the period
  // is scannable at a glance.
  const rawWin = (deltaLabel || "previous period").replace(/^vs\s+/i, "").trim();
  const winMatch = rawWin.match(/^(?:previous|last|prior)\s+(.+)$/i);
  const winEm = winMatch ? winMatch[1] : rawWin;

  const Icon = pickIcon(title);
  const CustomIcon = METRIC_ICON_BY_TITLE[title]; // bespoke TP glyph for appointment metrics

  // Decide number-mode vs text-mode. Pure numeric strings ("1,240") stay big.
  const isNum = typeof value === "number" && Number.isFinite(value);
  const isNumStr = typeof value === "string" && /^[\d.,]+$/.test(value.trim());
  const bigNumber = isNum || isNumStr;
  const cleanPrefix = prefix == null ? "" : String(prefix).trim();
  const cleanSuffix = suffix == null ? "" : String(suffix).trim();

  return (
    <Card className="tw-group tw-relative tw-flex tw-flex-col tw-overflow-hidden tw-rounded-2xl tw-border tw-border-border/80 tw-bg-card tw-px-4 tw-py-3.5 tw-shadow-[0_1px_2px_rgba(23,23,37,0.04)] tw-transition-all tw-duration-200 hover:-tw-translate-y-0.5 hover:tw-border-primary/30 hover:tw-shadow-[0_10px_28px_rgba(23,23,37,0.10)]">
      {/* Heading row — title (+ info tooltip) and a single violet metric icon */}
      <div className="tw-flex tw-items-start tw-justify-between tw-gap-2">
        <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-1">
          <span className="tw-truncate tw-text-[12.5px] tw-font-semibold tw-text-slate-500">{title}</span>
          {description && (
            <Tooltip title={tipTitle} placement="top" rootClassName="tp-analytics-portal">
              <span
                tabIndex={0}
                aria-label={`About ${title}`}
                className="tw-inline-flex tw-shrink-0 tw-cursor-help tw-text-slate-400 hover:tw-text-slate-600"
              >
                <InfoCircle size={13} />
              </span>
            </Tooltip>
          )}
        </div>
        <span
          className="tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-transition-transform tw-duration-200 group-hover:tw-scale-105"
          style={{ background: iconTint.bg, color: iconTint.fg }}
        >
          {CustomIcon ? (
            <CustomIcon size={17} color={iconTint.fg} />
          ) : (
            <Icon size={17} color={iconTint.fg} variant="Bulk" />
          )}
        </span>
      </div>

      {/* Value — big figure for numbers, compact wrapped label for names.
          The font steps down as the figure grows (₹3,36,685.32 etc.) so a big
          number always fits the card instead of overflowing. */}
      {bigNumber ? (() => {
        const formatted = String(fmtValue(value));
        const len = (cleanPrefix + formatted + cleanSuffix).length;
        const size = len <= 9 ? 29 : len <= 12 ? 25 : len <= 15 ? 22 : 19;
        const side = Math.round(size * 0.66);
        return (
          <div
            className="tw-mt-1 tw-flex tw-items-baseline tw-gap-0.5 tw-font-bold tw-leading-none tw-tracking-[-0.02em] tw-text-slate-900 tw-tabular-nums"
            style={{ fontSize: `${size}px` }}
          >
            {cleanPrefix && (
              <span className="tw-font-semibold tw-text-slate-500" style={{ fontSize: `${side}px` }}>{cleanPrefix}</span>
            )}
            <span>{formatted}</span>
            {cleanSuffix && (
              <span className="tw-font-semibold tw-text-slate-500" style={{ fontSize: `${side - 1}px` }}>{cleanSuffix}</span>
            )}
          </div>
        );
      })() : (
        <div
          className="tw-mt-1 tw-text-[17px] tw-font-bold tw-leading-[1.2] tw-tracking-[-0.01em] tw-text-slate-900"
          title={value == null ? "" : String(value)}
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {value == null || value === "" ? "—" : value}
        </div>
      )}

      {/* Trend tag — three colours only, then a short comparison sentence with
          the window emphasised: "↘ 23.4%  vs previous 31 days" */}
      {showDelta && (
        <div className="tw-mt-3.5 tw-flex tw-items-center tw-gap-2">
          <span className={cn("tw-inline-flex tw-items-center tw-gap-0.5 tw-rounded-md tw-px-1.5 tw-py-0.5 tw-text-[11.5px] tw-font-bold tw-tabular-nums", SENTI[senti])}>
            <DirIcon size={12} />
            {Math.abs(delta)}%
          </span>
          <span className="tw-text-[11px] tw-text-muted-foreground">
            vs previous <span className="tw-font-semibold tw-text-slate-600">{winEm}</span>
          </span>
        </div>
      )}
    </Card>
  );
};

export default KpiCard;
