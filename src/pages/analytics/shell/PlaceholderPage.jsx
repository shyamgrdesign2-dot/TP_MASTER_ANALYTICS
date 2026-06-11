import React from "react";
import { Chart21, InfoCircle } from "iconsax-reactjs";

/**
 * Polished placeholder for dashboards whose data endpoint isn't wired yet.
 * Driven by the spec so the full product nav is navigable and self-describing.
 * `planned` = list of the widgets this dashboard will contain (from the spec).
 */
export default function PlaceholderPage({ title, sectionLabel, planned = [], needs }) {
  return (
    <div className="tpph">
      <div className="tpph__hero">
        <div className="tpph__hero-icon">
          <Chart21 size={26} variant="Bulk" color="var(--tp-blue-500)" />
        </div>
        <div>
          <h2 className="tpph__hero-title">{title}</h2>
          <p className="tpph__hero-sub">
            {sectionLabel ? `${sectionLabel} · ` : ""}Designed and ready to wire
          </p>
        </div>
      </div>

      {needs && (
        <div className="tpph__note">
          <InfoCircle size={16} color="var(--tp-warning-600)" />
          <span>{needs}</span>
        </div>
      )}

      {planned.length > 0 && (
        <div className="tpph__grid">
          {planned.map((p, i) => (
            <div key={i} className="tpph__card">
              <div className="tpph__card-bars" aria-hidden>
                <span style={{ height: "40%" }} />
                <span style={{ height: "70%" }} />
                <span style={{ height: "55%" }} />
                <span style={{ height: "90%" }} />
                <span style={{ height: "65%" }} />
              </div>
              <p className="tpph__card-title">{p}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
