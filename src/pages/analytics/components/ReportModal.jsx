import React, { useState } from "react";
import { Modal, DatePicker, Radio, Button, Select, Spin, Alert, Typography } from "antd";
import { useSelector } from "react-redux";
import { DocumentDownload } from "iconsax-reactjs";
import dayjs from "dayjs";
import { downloadReport } from "../service";
import { exportRows } from "../analyticsExport";

const { RangePicker } = DatePicker;
const { Text } = Typography;
const FMT = "YYYY-MM-DD";

/**
 * Report download dialog (legacy data_analytics_reports.php modals). Opens from
 * a Reports-hub card: pick report type + date range → Download CSV/Excel. The
 * report rows come from service.downloadReport (billing API or Analytics service).
 */
export default function ReportModal({ card, open, onClose }) {
  const [range, setRange] = useState(() => [dayjs().subtract(29, "day"), dayjs()]);
  const [reportType, setReportType] = useState(card?.reportTypes?.[0]);
  const [docSel, setDocSel] = useState([]); // [] = all doctors
  const [hospSel, setHospSel] = useState([]); // [] = all clinics
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const doctorList = useSelector((st) => st.bulkMessages?.doctorList) || [];
  const profile = useSelector((st) => st.doctors?.profile);
  const hospitals = (profile?.hospital_data || []).map((h) => ({ value: String(h.hm_id), label: h.hm_name }));
  const doctors = doctorList.map((d) => ({ value: String(d.um_id), label: d.um_name || `Doctor ${d.um_id}` }));

  if (!card) return null;

  const run = async (fmt) => {
    setBusy(true);
    setError(null);
    try {
      const result = await downloadReport(card, {
        startDate: range?.[0]?.format(FMT),
        endDate: range?.[1]?.format(FMT),
        reportType,
        // empty selections mean ALL doctors / ALL clinics (broadest export)
        doctorIds: docSel.length ? docSel : undefined,
        hospitalId: hospSel.length ? hospSel.join(",") : undefined,
      });
      if (!result) {
        setError(
          card.endpoint
            ? "The report could not be fetched: the Analytics service is off or unreachable."
            : "No data found for this period.",
        );
        return;
      }
      if (!result.rows?.length) {
        setError("No rows for the selected dates and filters. Widen the date range and try again.");
        return;
      }
      exportRows(result.columns, result.rows, `${card.key}_${range?.[0]?.format(FMT)}_${range?.[1]?.format(FMT)}`, fmt);
      onClose();
    } catch (e) {
      setError(e?.message || "Download failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={card.title} open={open} onCancel={onClose} footer={null} width={520} destroyOnClose>
      <div className="tp-analytics" style={{ paddingTop: 8 }}>
        {card.reportTypes && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, color: "#717179" }}>Report Type</Text>
            <div style={{ marginTop: 6 }}>
              <Radio.Group value={reportType} onChange={(e) => setReportType(e.target.value)}>
                {card.reportTypes.map((t) => <Radio key={t} value={t}>{t}</Radio>)}
              </Radio.Group>
            </div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 12, color: "#717179" }}>Date range</Text>
          <div style={{ marginTop: 6 }}>
            <RangePicker value={range} allowClear={false} format="DD MMM YYYY" onChange={(v) => v && setRange(v)} style={{ width: "100%" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 12, color: "#717179" }}>Doctors</Text>
            <Select mode="multiple" allowClear placeholder="All doctors" value={docSel} onChange={setDocSel}
              options={doctors} style={{ width: "100%", marginTop: 6 }} maxTagCount={2} />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 12, color: "#717179" }}>Clinics</Text>
            <Select mode="multiple" allowClear placeholder="All clinics" value={hospSel} onChange={setHospSel}
              options={hospitals} style={{ width: "100%", marginTop: 6 }} maxTagCount={2} />
          </div>
        </div>

        {error && <Alert type="warning" showIcon message={error} style={{ marginBottom: 16 }} />}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid #f1f1f5", paddingTop: 16 }}>
          {busy && <Spin size="small" style={{ marginRight: "auto" }} />}
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => run("csv")} disabled={busy} icon={<DocumentDownload size={14} />}>Download CSV</Button>
          <Button type="primary" onClick={() => run("xlsx")} disabled={busy} icon={<DocumentDownload size={14} />}
            style={{ background: "#4b4ad5", borderColor: "#4b4ad5" }}>Download Excel</Button>
        </div>
      </div>
    </Modal>
  );
}
