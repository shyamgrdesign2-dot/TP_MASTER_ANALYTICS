import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown2, SearchNormal1, SidebarLeft } from "iconsax-reactjs";
import "./AnalyticsSidebar.scss";

/* ============================================================================
 * AnalyticsSidebar — React+SCSS port of the TP App Shell sidebar (GenX ref).
 * Config-driven 3-level rail: Section (L1) → Item (L2 leaf).
 * Expanded 236px ↔ Collapsed 80px. Search, inline expand, collapsed flyouts,
 * active-state tracking per the TP design spec.
 * ========================================================================== */

const sectionIsLeaf = (s) => !s.items || s.items.length === 0;
const sectionHasActive = (s, leafId) =>
  sectionIsLeaf(s) ? s.id === leafId : s.items.some((it) => it.id === leafId);

function filterNav(nav, q) {
  const query = q.trim().toLowerCase();
  if (!query) return nav;
  const out = [];
  for (const s of nav) {
    if (s.label.toLowerCase().includes(query)) { out.push(s); continue; }
    if (sectionIsLeaf(s)) continue;
    const items = s.items.filter((it) => it.label.toLowerCase().includes(query));
    if (items.length) out.push({ ...s, items });
  }
  return out;
}

export default function AnalyticsSidebar({ nav, activeLeafId, onSelect, builtIds, mobileOpen = false, onMobileClose }) {
  const built = builtIds || new Set();
  const [isMobile, setIsMobile] = useState(false);

  // Mobile (<=768px): render as an off-canvas overlay instead of a static rail.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // On mobile, selecting a leaf closes the drawer.
  const select = (id) => {
    onSelect(id);
    if (isMobile && onMobileClose) onMobileClose();
  };
  const [collapsed, setCollapsed] = useState(false);
  const [userToggled, setUserToggled] = useState(false);
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState(() => {
    const owner = nav.find((s) => sectionHasActive(s, activeLeafId));
    return new Set(owner ? [owner.id] : []);
  });

  // Keep the section that owns the active leaf open
  useEffect(() => {
    const owner = nav.find((s) => sectionHasActive(s, activeLeafId));
    if (owner && !sectionIsLeaf(owner)) {
      setOpenIds((prev) => (prev.has(owner.id) ? prev : new Set(prev).add(owner.id)));
    }
  }, [activeLeafId, nav]);

  // Auto-collapse on tablet
  useEffect(() => {
    if (typeof window === "undefined" || userToggled) return;
    const mql = window.matchMedia("(max-width: 1100px)");
    const apply = () => setCollapsed(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [userToggled]);

  const filtered = useMemo(() => filterNav(nav, query), [nav, query]);
  const toggle = () => { setUserToggled(true); setCollapsed((c) => !c); };

  const handleSectionClick = (s) => {
    if (sectionIsLeaf(s)) { select(s.id); return; }
    // A single-leaf section (e.g. Pharmacy) navigates straight to its leaf —
    // expanding to reveal one identically-named child is a pointless extra click.
    if (s.items?.length === 1) { select(s.items[0].id); return; }
    if (collapsed) { setUserToggled(true); setCollapsed(false); setOpenIds((p) => new Set(p).add(s.id)); return; }
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(s.id) ? next.delete(s.id) : next.add(s.id);
      return next;
    });
  };

  // On mobile the drawer is always full (never the 80px rail).
  const showCollapsed = collapsed && !isMobile;

  return (
    <aside
      className={`tpsb ${showCollapsed ? "tpsb--collapsed" : ""} ${isMobile ? "tpsb--mobile" : ""} ${isMobile && mobileOpen ? "is-open" : ""}`}
      aria-label="Analytics navigation"
      aria-hidden={isMobile && !mobileOpen}
    >
      {/* Header */}
      {showCollapsed ? (
        <div className="tpsb__head tpsb__head--collapsed">
          <button className="tpsb__chip-btn" onClick={toggle} title="Expand sidebar" aria-label="Expand sidebar">
            <SidebarLeft size={20} variant="Linear" className="tpsb__flip" />
          </button>
          <span className="tpsb__divider" />
        </div>
      ) : (
        <div className="tpsb__head">
          <div className="tpsb__search">
            <SearchNormal1 size={16} variant="Linear" color="var(--tp-slate-500)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search analytics…"
              aria-label="Search analytics"
            />
          </div>
          <button className="tpsb__chip-btn tpsb__chip-btn--sm" onClick={toggle} title="Collapse sidebar" aria-label="Collapse sidebar">
            <SidebarLeft size={20} variant="Linear" />
          </button>
        </div>
      )}

      {/* Sections */}
      <nav className="tpsb__list">
        {filtered.length === 0 ? (
          <p className="tpsb__empty">No matches.</p>
        ) : (
          filtered.map((s) => (
            <SectionRow
              key={s.id}
              section={s}
              collapsed={showCollapsed}
              expanded={!sectionIsLeaf(s) && !showCollapsed && (openIds.has(s.id) || !!query)}
              activeLeafId={activeLeafId}
              built={built}
              onSectionClick={() => handleSectionClick(s)}
              onSelect={select}
            />
          ))
        )}
      </nav>

      <div className="tpsb__foot">
        <span className="tpsb__foot-dot" />
        {!showCollapsed && <span className="tpsb__foot-txt">TatvaCare Analytics</span>}
      </div>
    </aside>
  );
}

/* ── Section (L1) ── */
function SectionRow({ section, collapsed, expanded, activeLeafId, built, onSectionClick, onSelect }) {
  const Icon = section.icon;
  const leaf = sectionIsLeaf(section);
  const containsActive = sectionHasActive(section, activeLeafId);
  const soon = leaf && !built.has(section.id);

  if (collapsed) {
    const active = containsActive;
    const trigger = (bind, ref) => (
      <button
        type="button"
        ref={ref}
        onClick={onSectionClick}
        {...bind}
        className={`tpsb__rail ${active ? "is-active" : ""}`}
        title={section.label}
      >
        {active && <span className="tpsb__rail-bar" />}
        <span className={`tpsb__chip ${active ? "is-active" : ""}`}>
          <Icon size={22} variant={active ? "Bulk" : "Linear"} color={active ? "#fff" : "var(--tp-slate-600)"} />
        </span>
        <span className={`tpsb__rail-label ${active ? "is-active" : ""}`}>{section.label}</span>
      </button>
    );
    if (leaf) return trigger({}, null);
    return (
      <Flyout anchor={(bind, ref) => trigger(bind, ref)}>
        <SectionFlyout section={section} activeLeafId={activeLeafId} built={built} onSelect={onSelect} />
      </Flyout>
    );
  }

  // Expanded leaf section
  if (leaf) {
    const active = activeLeafId === section.id;
    return (
      <button type="button" onClick={onSectionClick} aria-current={active ? "page" : undefined} className={`tpsb__sec ${active ? "is-active-leaf" : ""} ${soon ? "is-soon" : ""}`}>
        <span className={`tpsb__chip ${active ? "is-active" : ""}`}>
          <Icon size={22} variant={active ? "Bulk" : "Linear"} color={active ? "#fff" : "var(--tp-slate-600)"} />
        </span>
        <span className={`tpsb__sec-label ${active ? "is-active" : ""}`}>{section.label}</span>
        {soon && <span className="tpsb__soon">Soon</span>}
      </button>
    );
  }

  // Expanded expandable section
  return (
    <div className="tpsb__group">
      <button type="button" onClick={onSectionClick} aria-expanded={expanded}
        className={`tpsb__sec ${expanded ? "is-open" : containsActive ? "is-ancestor" : ""}`}>
        <span className={`tpsb__chip ${!expanded && containsActive ? "is-active" : expanded ? "is-open-chip" : ""}`}>
          <Icon size={22} variant={!expanded && containsActive ? "Bulk" : "Linear"}
            color={!expanded && containsActive ? "#fff" : "var(--tp-slate-600)"} />
        </span>
        <span className={`tpsb__sec-label ${!expanded && containsActive ? "is-active" : ""}`}>{section.label}</span>
        <ArrowDown2 size={14} className={`tpsb__caret ${expanded ? "is-open" : ""}`}
          color={!expanded && containsActive ? "var(--tp-blue-500)" : "var(--tp-slate-400)"} />
      </button>
      {expanded && (
        <div className="tpsb__children">
          <span className="tpsb__rail-line" />
          <ul>
            {section.items.map((it) => {
              const ItIcon = it.icon;
              const active = activeLeafId === it.id;
              const itSoon = !built.has(it.id);
              return (
                <li key={it.id}>
                  <button type="button" onClick={() => onSelect(it.id)} aria-current={active ? "page" : undefined} className={`tpsb__item ${active ? "is-active" : ""} ${itSoon ? "is-soon" : ""}`} title={it.label}>
                    <span className="tpsb__item-ic">
                      <ItIcon size={18} variant={active ? "Bulk" : "Linear"}
                        color={active ? "var(--tp-blue-500)" : "var(--tp-slate-600)"} />
                    </span>
                    <span className="tpsb__item-label">{it.label}</span>
                    {itSoon && <span className="tpsb__soon">Soon</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Collapsed-mode flyout content ── */
function SectionFlyout({ section, activeLeafId, built, onSelect }) {
  return (
    <div className="tpsb-flyout">
      <p className="tpsb-flyout__title">{section.label}</p>
      <ul>
        {section.items.map((it) => {
          const ItIcon = it.icon;
          const active = activeLeafId === it.id;
          const itSoon = !built.has(it.id);
          return (
            <li key={it.id}>
              <button type="button" onClick={() => onSelect(it.id)} className={`tpsb-flyout__item ${active ? "is-active" : ""} ${itSoon ? "is-soon" : ""}`}>
                <span className="tpsb-flyout__ic">
                  <ItIcon size={18} variant={active ? "Bulk" : "Linear"}
                    color={active ? "var(--tp-blue-500)" : "var(--tp-slate-500)"} />
                </span>
                <span>{it.label}</span>
                {itSoon && <span className="tpsb__soon">Soon</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Flyout host (portal, hover, repositioning) ── */
function Flyout({ anchor, children, offset = 10 }) {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const closeTimer = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cancel = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = null; };
  const scheduleClose = () => { cancel(); closeTimer.current = setTimeout(() => setOpen(false), 160); };
  const openNow = () => {
    cancel();
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setCoords({ left: r.right + offset, top: r.top });
    }
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        setCoords({ left: r.right + offset, top: r.top });
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, offset]);

  const bind = { onMouseEnter: openNow, onMouseLeave: scheduleClose, onFocus: openNow, onBlur: scheduleClose };

  return (
    <>
      {anchor(bind, triggerRef)}
      {mounted && open && coords
        ? createPortal(
            <div className="tpsb-flyout-host" style={{ left: coords.left, top: Math.max(8, coords.top - 4) }}
              onMouseEnter={openNow} onMouseLeave={scheduleClose}>
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
