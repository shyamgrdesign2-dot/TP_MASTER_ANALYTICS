import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight2, Element3, Hospital } from "iconsax-reactjs";
import "../shell/tpTokens.scss";
import "./DemoLanding.scss";

// ---------------------------------------------------------------------------
// DEMO landing — the entry point of the standalone TP Master Analytics demo.
// '/' renders this page (no EMR chrome, no login): pick a module and go.
// Exists only in the demo repo; production routes '/' to the EMR home.
// ---------------------------------------------------------------------------

const MODULES = [
  {
    id: "opd",
    to: "/analytics",
    title: "OPD Analytics",
    sub: "Appointments, billing, patients, care, pharmacy, grow, reports.",
    Icon: Element3,
  },
  {
    id: "ipd",
    to: "/analytics/ipd",
    title: "IPD Analytics",
    sub: "Admissions, wards & beds, clinical activity, billing, reports.",
    Icon: Hospital,
  },
];

export default function DemoLanding() {
  const navigate = useNavigate();
  return (
    <div className="tp-analytics demo-landing">
      <main className="demo-landing__panel">
        <span className="demo-landing__tag">Demo</span>
        <h1 className="demo-landing__title">TP Master Analytics</h1>
        <p className="demo-landing__sub">
          Standalone demo with anonymized data: no login, no backend.
        </p>

        <div className="demo-landing__cards">
          {MODULES.map(({ id, to, title, sub, Icon }) => (
            <button
              key={id}
              type="button"
              data-demo-card={id}
              className="demo-landing__card"
              onClick={() => navigate(to)}
            >
              <span className="demo-landing__glyph">
                <Icon size={26} variant="Bulk" color="#4b4ad5" />
              </span>
              <span className="demo-landing__card-body">
                <span className="demo-landing__card-title">{title}</span>
                <span className="demo-landing__card-sub">{sub}</span>
              </span>
              <span className="demo-landing__go">
                <ArrowRight2 size={18} color="#4b4ad5" />
              </span>
            </button>
          ))}
        </div>

        <p className="demo-landing__foot">
          Captured from the TatvaCare Analytics service against a busy tenant, then anonymized.
        </p>
      </main>
    </div>
  );
}
