import { useState, useCallback } from "react";
import { cn } from "../../../utils";
import styles from "./PillBar.module.scss";

const COOLDOWN_DEFAULT = 3000;

export function PillBar({ pills, onTap, disabled = false, className }) {
  const [cooldowns, setCooldowns] = useState(new Set());
  const [hoveredId, setHoveredId] = useState(null);

  const handleTap = useCallback(
    (pill) => {
      if (disabled || cooldowns.has(pill.id)) return;

      onTap(pill);

      const cooldownMs = pill.cooldownMs ?? COOLDOWN_DEFAULT;
      setCooldowns((prev) => new Set(prev).add(pill.id));

      setTimeout(() => {
        setCooldowns((prev) => {
          const next = new Set(prev);
          next.delete(pill.id);
          return next;
        });
      }, cooldownMs);
    },
    [disabled, cooldowns, onTap]
  );

  const sorted = [...pills].sort((a, b) => a.priority - b.priority);

  return (
    <div className={cn(styles.pillScroll, className)}>
      {sorted.map((pill) => {
        const isOnCooldown = cooldowns.has(pill.id);
        const isDisabled = disabled || isOnCooldown;
        const isHovered = hoveredId === pill.id;

        return (
          <button
            key={pill.id}
            type="button"
            onClick={() => handleTap(pill)}
            onMouseEnter={() => setHoveredId(pill.id)}
            onMouseLeave={() => setHoveredId(null)}
            disabled={isDisabled}
            className={cn(
              styles.pill,
              isDisabled && styles.pillDisabled,
              pill.force && !isDisabled && styles.pillForce
            )}
            data-hovered={isHovered && !isDisabled ? "true" : undefined}
          >
            <span className={styles.pillText}>{pill.label}</span>
          </button>
        );
      })}
    </div>
  );
}
