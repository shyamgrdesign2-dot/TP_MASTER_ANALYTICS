import React, { useCallback, useMemo, useState } from "react";
import "./QueryBuilderDrawer.scss";
import {
  Drawer, Select, Button, Space, Tag, Divider,
  Typography, Row, Col, Input, DatePicker, Alert, Spin
} from "antd";
import { Add, Trash, Chart, Flash } from "iconsax-reactjs";
import dayjs from "dayjs";
import {
  DATASETS, OPERATORS, GRAINS, VIZ_TYPES, getDataset, recommendViz
} from "../analyticsCatalog";
import { executeQuery } from "../queryExecutor";
import AnalyticsChart from "./AnalyticsChart";

const { Text, Title } = Typography;

const PALETTE = {
  line: "#4b4ad5",
  bar: "#a461d8",
  stackedBar: "#36c5a8",
  donut: "#f5a623",
  table: "#2bb3e0",
  kpi: "#ef5da8",
};

const EMPTY_FILTER = () => ({ id: Date.now(), field: null, op: "eq", value: "" });

/**
 * The analytics query builder drawer. Opens from "+ Add Widget" on any
 * analytics page. User picks:
 *   1. Dataset (collections / appointments / consultations / diagnosis / Rx)
 *   2. Measures (what to count / sum)
 *   3. Group by / Dimension (date grain, category)
 *   4. Filter rows (field, operator, value)
 *   5. Visualization type (auto-recommended, user can override)
 * → "Preview" fires the query; "Add to Dashboard" saves the widget.
 */
export default function QueryBuilderDrawer({ open, onClose, onAdd, pageKey, doctorIds = [] }) {
  const [dataset, setDataset] = useState(null);
  const [measures, setMeasures] = useState([]);
  const [dimension, setDimension] = useState(null);
  const [grain, setGrain] = useState("day");
  const [filters, setFilters] = useState([]);
  const [vizType, setVizType] = useState(null);
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState(null);   // { columns, rows } | null
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const ds = useMemo(() => getDataset(dataset), [dataset]);
  const dims = ds?.dimensions || [];
  const selectedDim = dims.find((d) => d.key === dimension);

  // Auto-suggest viz type when dimension changes
  const handleDimension = (val) => {
    setDimension(val);
    const dim = dims.find((d) => d.key === val);
    if (!vizType) setVizType(recommendViz(dim ? [dim] : []));
  };

  const addFilter = () => setFilters((f) => [...f, EMPTY_FILTER()]);
  const removeFilter = (id) => setFilters((f) => f.filter((r) => r.id !== id));
  const updateFilter = (id, patch) =>
    setFilters((f) => f.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  // Build the structured query (PRD §8 / API spec §2.1)
  const buildQuery = useCallback(() => {
    if (!dataset || !measures.length) return null;
    return {
      dataset,
      measures,
      dimensions: dimension
        ? [selectedDim?.date ? { field: dimension, grain } : { field: dimension }]
        : [],
      filters: filters
        .filter((f) => f.field && f.value !== "")
        .map((f) => ({ field: f.field, op: f.op, value: f.value })),
      limit: 100,
      // _doctorIds: internal scope param; the Analytics API server-side enforces
      // its own scope from the JWT, but local loaders need it to call the billing API.
      _doctorIds: doctorIds,
    };
  }, [dataset, measures, dimension, selectedDim, grain, filters, doctorIds]);

  const handlePreview = async () => {
    const q = buildQuery();
    if (!q) return;
    setRunning(true);
    setError(null);
    setPreview(null);
    try {
      const result = await executeQuery(q);
      setPreview(result);
      if (!vizType) setVizType(recommendViz(q.dimensions || []));
    } catch (e) {
      setError(e.message || "Query failed");
    } finally {
      setRunning(false);
    }
  };

  const handleAdd = () => {
    const q = buildQuery();
    if (!q || !preview) return;
    const viz = vizType || "table";
    const xKey = dimension || (preview.columns[0]?.key);
    const yKeys = measures;
    onAdd({
      id: `custom_${Date.now()}`,
      kind: "chart",
      title: title || `${ds?.label}: ${measures.join(", ")}`,
      chartType: viz,
      viz: { x: xKey, y: yKeys },
      data: preview,
      query: q,
      custom: true,
      span: "half",
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setDataset(null); setMeasures([]); setDimension(null);
    setGrain("day"); setFilters([]); setVizType(null);
    setTitle(""); setPreview(null); setError(null);
  };

  const queryReady = dataset && measures.length > 0;
  const canAdd = queryReady && !!preview;

  return (
    <Drawer
      title={
        <Space>
          <Chart size={18} color="#4b4ad5" />
          <Title level={5} style={{ margin: 0 }}>Build a widget</Title>
        </Space>
      }
      open={open}
      onClose={() => { handleReset(); onClose(); }}
      width={560}
      footer={
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={() => { handleReset(); onClose(); }}>Cancel</Button>
          <Button onClick={handlePreview} loading={running} disabled={!queryReady} icon={<Flash size={14} />}>
            Preview
          </Button>
          <Button type="primary" onClick={handleAdd} disabled={!canAdd} icon={<Add size={14} />}>
            Add to dashboard
          </Button>
        </Space>
      }
    >
      {/* ── 1. Dataset ────────────────────────────────────────── */}
      <Section label="1. Data source">
        <Select
          placeholder="Choose what to measure"
          value={dataset}
          onChange={(v) => { setDataset(v); setMeasures([]); setDimension(null); setVizType(null); setPreview(null); }}
          style={{ width: "100%" }}
          options={DATASETS.map((d) => ({
            value: d.key,
            label: (
              <Space>
                {d.label}
                {!d.live && <Tag color="orange" style={{ fontSize: 10, padding: "0 4px" }}>Needs API</Tag>}
              </Space>
            ),
          }))}
        />
      </Section>

      {/* ── 2. Measures ───────────────────────────────────────── */}
      {ds && (
        <Section label="2. Measure (what to count / sum)">
          <Select
            mode="multiple"
            placeholder="Pick one or more measures"
            value={measures}
            onChange={setMeasures}
            style={{ width: "100%" }}
            options={ds.measures.map((m) => ({ value: m.key, label: m.label }))}
          />
        </Section>
      )}

      {/* ── 3. Group by ───────────────────────────────────────── */}
      {ds && (
        <Section label="3. Group by (break it down by)">
          <Row gutter={8}>
            <Col flex="auto">
              <Select
                allowClear
                placeholder="Optional: group by a dimension"
                value={dimension}
                onChange={handleDimension}
                style={{ width: "100%" }}
                options={dims.map((d) => ({ value: d.key, label: d.label }))}
              />
            </Col>
            {selectedDim?.date && (
              <Col>
                <Select value={grain} onChange={setGrain} style={{ width: 110 }}
                  options={GRAINS.map((g) => ({ value: g.key, label: g.label }))} />
              </Col>
            )}
          </Row>
        </Section>
      )}

      {/* ── 4. Filter rows ────────────────────────────────────── */}
      {ds && (
        <Section
          label="4. Filters"
          extra={
            <Button size="small" type="dashed" icon={<Add size={13} />} onClick={addFilter}>
              Add filter
            </Button>
          }
        >
          {filters.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              No filters: returning all data for the selected date range.
            </Text>
          )}
          {filters.map((f) => {
            const dimDef = dims.find((d) => d.key === f.field);
            return (
              <Row key={f.id} gutter={6} align="middle" style={{ marginBottom: 8 }}>
                <Col flex="160px">
                  <Select
                    placeholder="Field"
                    value={f.field}
                    onChange={(v) => updateFilter(f.id, { field: v, value: "" })}
                    style={{ width: "100%" }}
                    size="small"
                    options={dims.map((d) => ({ value: d.key, label: d.label }))}
                  />
                </Col>
                <Col flex="110px">
                  <Select
                    value={f.op}
                    onChange={(v) => updateFilter(f.id, { op: v })}
                    style={{ width: "100%" }}
                    size="small"
                    options={OPERATORS.map((o) => ({ value: o.key, label: o.label }))}
                  />
                </Col>
                <Col flex="auto">
                  {dimDef?.values ? (
                    <Select
                      mode={f.op === "in" ? "multiple" : undefined}
                      value={f.value}
                      onChange={(v) => updateFilter(f.id, { value: v })}
                      style={{ width: "100%" }}
                      size="small"
                      options={dimDef.values.map((v) => ({ value: v, label: v }))}
                    />
                  ) : dimDef?.date ? (
                    <DatePicker.RangePicker
                      size="small"
                      style={{ width: "100%" }}
                      onChange={(_, s) => updateFilter(f.id, { value: s })}
                    />
                  ) : (
                    <Input
                      size="small"
                      value={f.value}
                      onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                      placeholder="Value"
                    />
                  )}
                </Col>
                <Col>
                  <Button
                    size="small" type="text" danger
                    icon={<Trash size={14} />}
                    onClick={() => removeFilter(f.id)}
                  />
                </Col>
              </Row>
            );
          })}
        </Section>
      )}

      {/* ── 5. Viz ────────────────────────────────────────────── */}
      {ds && (
        <Section label="5. Visualize as">
          <div className="qb-viz-picker">
            {VIZ_TYPES.map((v) => (
              <button
                key={v.key}
                className={`qb-viz-btn ${vizType === v.key ? "qb-viz-btn--active" : ""}`}
                style={{ "--accent": PALETTE[v.key] }}
                onClick={() => setVizType(v.key)}
              >
                {v.label}
                {vizType === null && recommendViz(selectedDim ? [selectedDim] : []) === v.key && (
                  <span className="qb-viz-rec">✓ Recommended</span>
                )}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Widget title ──────────────────────────────────────── */}
      {ds && (
        <Section label="Widget title (optional)">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${ds.label}: ${measures.join(", ") || "…"}`}
          />
        </Section>
      )}

      {/* ── Generated query (readonly) ───────────────────────── */}
      {queryReady && (
        <Section label="Generated query">
          <pre className="qb-query-preview">{JSON.stringify(buildQuery(), null, 2)}</pre>
        </Section>
      )}

      {/* ── Preview area ─────────────────────────────────────── */}
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
      {running && <Spin style={{ display: "block", textAlign: "center", padding: 32 }} />}
      {preview && !running && (
        <Section label="Preview">
          {vizType === "table" || !vizType || !dimension ? (
            <pre className="qb-query-preview" style={{ maxHeight: 200, overflow: "auto" }}>
              {JSON.stringify(preview.rows.slice(0, 5), null, 2)}…
            </pre>
          ) : (
            <AnalyticsChart
              type={vizType}
              data={preview}
              viz={{ x: dimension, y: measures }}
              height={200}
            />
          )}
          <Text type="secondary" style={{ fontSize: 11 }}>
            {preview.meta?.rowCount ?? preview.rows.length} rows
            {preview.meta?.live === false ? " · sample data (API needed)" : " · live data"}
          </Text>
        </Section>
      )}
    </Drawer>
  );
}

function Section({ label, extra, children }) {
  return (
    <div className="qb-section">
      <div className="qb-section-label">
        <Text strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", color: "#888" }}>
          {label}
        </Text>
        {extra}
      </div>
      {children}
      <Divider style={{ margin: "12px 0 4px" }} />
    </div>
  );
}
