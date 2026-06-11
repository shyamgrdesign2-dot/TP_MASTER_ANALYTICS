import * as XLSX from "xlsx";

/**
 * Export a normalized result set ({ columns:[{key,label}], rows:[{...}] })
 * to CSV or Excel. Used by every chart/table widget's download menu.
 */
export const exportRows = (columns, rows, filename = "analytics", format = "xlsx") => {
  if (!columns?.length || !rows?.length) return;

  const header = columns.map((c) => c.label || c.key);
  const aoa = [
    header,
    ...rows.map((r) => columns.map((c) => r[c.key] ?? "")),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `${filename}.csv`);
    return;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

const triggerDownload = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
