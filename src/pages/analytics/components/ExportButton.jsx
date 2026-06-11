import React from "react";
import { Dropdown, Button, Tooltip } from "antd";
import { DocumentDownload } from "iconsax-reactjs";
import { exportRows } from "../analyticsExport";

/**
 * Download menu for a widget.
 *
 * Priority: exports `patientRows` / `patientColumns` (the complete patient-level
 * data table) when provided — this is the intended behaviour: clicking ↓ gives
 * you ALL the patient records behind the chart, not just the aggregated chart
 * series. Falls back to `columns` / `rows` (the chart data) if no patient
 * table is available yet (e.g. sample data).
 *
 * Props:
 *   patientColumns / patientRows — full patient-level data table (preferred)
 *   columns / rows              — chart-level aggregated data (fallback)
 *   filename                    — base filename for the downloaded file
 */
const ExportButton = ({ columns, rows, patientColumns, patientRows, filename }) => {
  // Use patient-level data when available (the correct behaviour)
  const exportCols = patientColumns?.length ? patientColumns : columns;
  const exportData = patientRows?.length ? patientRows : rows;
  const isPatientLevel = !!(patientRows?.length);

  const disabled = !exportCols?.length || !exportData?.length;

  const items = [
    { key: "xlsx", label: isPatientLevel ? "Download patient rows (Excel)" : "Download Excel" },
    { key: "csv", label: isPatientLevel ? "Download patient rows (CSV)" : "Download CSV" },
  ];

  return (
    <Tooltip title={isPatientLevel ? "Download the loaded patient rows (current view)" : "Download chart data"}>
      <Dropdown
        trigger={["click"]}
        disabled={disabled}
        menu={{
          items,
          onClick: ({ key }) => exportRows(exportCols, exportData, filename, key),
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<DocumentDownload size={16} color={isPatientLevel ? "#4b4ad5" : "#666"} />}
          disabled={disabled}
          aria-label="Export"
        />
      </Dropdown>
    </Tooltip>
  );
};

export default ExportButton;
