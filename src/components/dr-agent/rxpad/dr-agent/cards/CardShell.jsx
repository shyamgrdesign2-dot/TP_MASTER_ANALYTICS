import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../utils";
import styles from "./CardShell.module.scss";
import { CopyIcon } from "./CopyIcon";
import { ActionableTooltip } from "./ActionableTooltip";
import { Copy, ArrowDown2, ArrowUp2, InfoCircle } from "iconsax-reactjs";

/**
 * Small info icon with hover tooltip showing data sources.
 *
 * The tooltip is rendered into a portal on document.body and positioned
 * with position:fixed so no ancestor's overflow:hidden can clip it.
 * Position is recomputed on hover open + on scroll/resize while open.
 */
export function SourceInfoIcon({ sources }) {
  const [isOpen, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 4, left: r.right });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen]);

  return (
    <div
      className={cn(styles.sourceInfoWrap)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.sourceInfoBtn}
        aria-label="Data sources">
        <InfoCircle size={14} variant="Bold" />
      </button>

      {isOpen && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              className={styles.sourceInfoTooltip}
              style={{ top: pos.top, left: pos.left }}>
              <p className={styles.sourcesHeading}>Sources</p>
              <div className={styles.sourcesList}>
                {sources.map((src, i) => (
                  <div key={i} className={styles.sourceItem}>
                    <div className={styles.sourceDot} />
                    <span className={styles.sourceText}>{src}</span>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export function CardShell({
  icon,
  title,
  date,
  tpIconName,
  badge,
  copyAll,
  copyAllTooltip,
  collapsible = true,
  defaultCollapsed = false,
  actions,
  sidebarLink,
  headerExtra,
  dataSources,
  children,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copyHovered, setCopyHovered] = useState(false);

  return (
    <div className={cn(styles.card)}>
      {/* Header */}
      <div className={cn(styles.header, date ? styles.headerAlignStart : styles.headerAlignCenter)}>
        {/* Icon */}
        <div className={styles.iconWrap}>
          {tpIconName ? (
            /* TPMedicalIcon not available — render a placeholder span */
            <span className={styles.medicalIconPlaceholder} aria-hidden="true" />
          ) : (
            <span className={styles.iconInner}>{icon}</span>
          )}
        </div>

        {/* Title + Date */}
        <div className={styles.titleGroup}>
          <span className={styles.titleWrap}>
            {title}
            <span className={styles.titleTooltip}>{title}</span>
          </span>
          {date && (
            <span className={styles.dateText}>{date}</span>
          )}
        </div>

        {/* Copy All */}
        {copyAll && (
          <div className={styles.copyAllWrap}>
            {copyAllTooltip ? (
              <ActionableTooltip label={copyAllTooltip} onAction={() => copyAll()}>
                <span
                  className={cn(styles.copyAllIcon, copyHovered ? styles.copyAllHovered : styles.copyAllDefault)}
                  onMouseEnter={() => setCopyHovered(true)}
                  onMouseLeave={() => setCopyHovered(false)}>
                  <Copy size={14} variant={copyHovered ? "Bulk" : "Linear"} />
                </span>
              </ActionableTooltip>
            ) : (
              <CopyIcon size={14} onClick={() => copyAll()} />
            )}
          </div>
        )}

        {/* Spacer */}
        <span className={styles.spacer} />

        {/* Badge */}
        {badge && (
          <span
            className={styles.badge}
            style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
            <span className={styles.badgeTooltip}>{badge.label}</span>
          </span>
        )}

        {/* Header Extra */}
        {headerExtra && (
          <div className={styles.headerExtra}>{headerExtra}</div>
        )}

        {/* Collapse toggle */}
        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={styles.collapseBtn}>
            {collapsed ? (
              <ArrowDown2 size={12} variant="Linear" />
            ) : (
              <ArrowUp2 size={12} variant="Linear" />
            )}
          </button>
        )}
      </div>

      {/* Body */}
      {!collapsed && (
        <>
          <div className={styles.body}>
            {children}
          </div>

          {actions && (
            <div className={styles.actionsScroll}>
              <div className={styles.actionsRow}>
                {actions}
              </div>
            </div>
          )}

          {sidebarLink && (
            <div className={cn(styles.sidebarLinkWrap)}>
              {sidebarLink}
            </div>
          )}
        </>
      )}
    </div>
  );
}
