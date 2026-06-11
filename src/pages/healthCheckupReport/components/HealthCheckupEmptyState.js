import React, { useCallback } from "react";
import Button from "react-bootstrap/Button";

import "./HealthCheckupEmptyState.scss";
import { ASSETS } from "../../../assets";
const emptyFolderIcon = ASSETS.images.emptyFile;

function HealthCheckupEmptyState({ onGenerateReport, patientId, loading = false }) {
  const handleGenerateClick = useCallback(() => {
    if (typeof onGenerateReport === "function") {
      onGenerateReport();
    }
  }, [onGenerateReport]);

  return (
    <div className="health-checkup-empty-state">
      <div className="health-checkup-empty-state__content">
        <div className="health-checkup-empty-state__icon-wrap">
          <img
            src={emptyFolderIcon}
            alt=""
            className="health-checkup-empty-state__icon"
            loading="eager"
          />
        </div>
        <p className="health-checkup-empty-state__message">
          You haven&apos;t generated any health report yet!
        </p>
        <Button
          type="button"
          className="health-checkup-empty-state__cta"
          onClick={handleGenerateClick}
          disabled={!patientId || loading}
        >
          {loading ? "Loading consultations…" : "Generate Health Check-up Report"}
        </Button>
      </div>
    </div>
  );
}

export default React.memo(HealthCheckupEmptyState);
