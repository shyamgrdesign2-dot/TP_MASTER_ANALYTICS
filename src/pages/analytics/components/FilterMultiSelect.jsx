import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * FilterMultiSelect — the analytics filter-bar dropdown, mirroring the TP
 * Storybook Dropdown molecule (mode="multi", optionControl="checkbox", chips,
 * footer CTAs) without importing it: this module is fully self-contained so
 * nothing outside src/pages/analytics is touched.
 *
 * Behaviour (per the TP reference):
 *  · trigger is an input-box (stroke + focus ring) showing removable CHIPS for
 *    the selection, or the "All …" placeholder when nothing is selected;
 *  · the menu SEGREGATES the "All …" row (its own section, checkbox semantics:
 *    checked ⇄ empty selection) from the individual options, each a checkbox
 *    row with optional subtitle, under their own section heading;
 *  · live search filters the individual options;
 *  · footer CTAs: Clear (outline) resets the draft to All, Apply (solid)
 *    commits. Outside click / Esc closes WITHOUT committing, so half-built
 *    selections never fire a refetch.
 *
 * Contract: `value` is string[] of option values; [] means "All". `onChange`
 * fires only on Apply / chip-remove — same shape the antd Select emitted.
 */

const Chevron = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
    style={{ transition: "transform 200ms ease", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
  </svg>
);
const Tick = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const Cross = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// Decorative checkbox — the row owns the click (TP reference pattern).
const Box = ({ checked }) => (
  <span className="analytics-msel__box" data-checked={checked ? "true" : undefined} aria-hidden>
    {checked ? <Tick /> : null}
  </span>
);

const FilterMultiSelect = ({
  label = "Select",
  allLabel = "All",
  groupLabel = "Individual",
  placeholder,
  options = [],
  value = [],
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  // Opening seeds the draft from the committed value; Esc / outside discards.
  const openMenu = () => { setDraft(value); setQuery(""); setOpen(true); };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open]);

  const labelOf = (v) => options.find((o) => String(o.value) === String(v))?.label || v;
  const allSelected = draft.length === 0;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.subtitle || ""}`.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (v) =>
    setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  const apply = () => { onChange?.(draft); setOpen(false); };
  const clear = () => setDraft([]);
  // Chip removal commits immediately (it edits the APPLIED selection).
  const removeChip = (v) => onChange?.(value.filter((x) => x !== v));

  // Trigger chips: show up to 2, then a "+N" counter chip.
  const shown = value.slice(0, 2);
  const extra = value.length - shown.length;

  return (
    <div className="analytics-msel" ref={rootRef} data-open={open ? "true" : undefined}>
      <button
        type="button"
        className="analytics-msel__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        data-open={open ? "true" : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => { if (e.key === "Enter" && open) { e.preventDefault(); apply(); } }}
      >
        {value.length === 0 ? (
          <span className="analytics-msel__placeholder">{placeholder || allLabel}</span>
        ) : (
          <span className="analytics-msel__chips">
            {shown.map((v) => (
              <span key={v} className="analytics-msel__chip">
                <span className="analytics-msel__chipLabel">{labelOf(v)}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Remove ${labelOf(v)}`}
                  className="analytics-msel__chipX"
                  onClick={(e) => { e.stopPropagation(); removeChip(v); }}
                >
                  <Cross />
                </span>
              </span>
            ))}
            {extra > 0 && <span className="analytics-msel__chip analytics-msel__chip--count">+{extra}</span>}
          </span>
        )}
        <Chevron open={open} />
      </button>

      {open && (
        <div className="analytics-msel__menu" role="listbox" aria-multiselectable="true">
          <div className="analytics-msel__search">
            <SearchIcon />
            <input
              ref={searchRef}
              value={query}
              placeholder="Search…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
            />
          </div>

          <div className="analytics-msel__list">
            {/* Segregated "All" section — checked ⇄ nothing individually picked. */}
            <div
              role="option"
              aria-selected={allSelected}
              className="analytics-msel__option analytics-msel__option--all"
              data-selected={allSelected ? "true" : undefined}
              onClick={clear}
            >
              <Box checked={allSelected} />
              <span className="analytics-msel__optTitle">{allLabel}</span>
            </div>
            <div className="analytics-msel__divider" />
            <div className="analytics-msel__heading">{groupLabel}</div>

            {filtered.length === 0 && <div className="analytics-msel__empty">No matches</div>}
            {filtered.map((o) => {
              const sel = draft.includes(String(o.value)) || draft.includes(o.value);
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={sel}
                  className="analytics-msel__option"
                  data-selected={sel ? "true" : undefined}
                  onClick={() => toggle(String(o.value))}
                >
                  <Box checked={sel} />
                  <span className="analytics-msel__optText">
                    <span className="analytics-msel__optTitle">{o.label}</span>
                    {o.subtitle && <span className="analytics-msel__optSub">{o.subtitle}</span>}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="analytics-msel__footer">
            <button type="button" className="analytics-msel__btn analytics-msel__btn--outline" onClick={clear}>
              Clear
            </button>
            <button type="button" className="analytics-msel__btn analytics-msel__btn--solid" onClick={apply}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterMultiSelect;
