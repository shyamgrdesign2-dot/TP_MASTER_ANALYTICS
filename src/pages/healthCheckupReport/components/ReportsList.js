import React from "react";
import { Spin } from "antd";

import ReportCard from "./ReportCard";

import "./ReportsList.scss";

function ReportsList({
  reports = [],
  loading = false,
  onGenerateReport,
  onEditReport,
  onPreviewReport,
  onDownloadReport,
  onSendToPatient,
  onCardClick,
  patientId,
  sendingToPatient = null,
}) {

  return (
    <div className="reports-list">
      {loading ? (
        <div className="reports-list__loading">
          <Spin size="large" />
        </div>
      ) : (
        <div className="reports-list__grid">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={onCardClick}
              onEdit={onEditReport}
              onPreview={onPreviewReport}
              onDownload={onDownloadReport}
              onSendToPatient={onSendToPatient}
              thumbnailUrl={report.thumbnail_url || report.thumbnailUrl}
              isSending={sendingToPatient === report.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(ReportsList);
