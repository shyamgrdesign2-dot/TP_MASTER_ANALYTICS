import React, { useMemo, useState } from "react";
import { SearchNormal1, ArrowUp2, ArrowDown2, ArrowLeft2, ArrowRight2 } from "iconsax-reactjs";
import { inr } from "../analyticsConfig";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";

const renderCell = (type) => (val) =>
  type === "currency" || type === "money" ? inr(val) : (val === null || val === undefined || val === "" ? "—" : val);

const cmp = (key) => (a, b) => {
  const av = a[key], bv = b[key];
  const na = Number(av), nb = Number(bv);
  if (av !== "" && bv !== "" && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(av ?? "").localeCompare(String(bv ?? ""));
};

const PAGE_SIZE = 10;

/**
 * In-app data table — free-text filter + click-to-sort headers + pagination,
 * on shadcn Table primitives (tw- prefixed, iconsax icons).
 */
export default function AnalyticsTable({ columns = [], rows = [], note }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(s)));
  }, [q, rows, columns]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const out = filtered.slice().sort(cmp(sort.key));
    if (sort.dir === "desc") out.reverse();
    return out;
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const onFilter = (e) => { setQ(e.target.value); setPage(0); };

  return (
    <div>
      <div className="tw-relative tw-mb-3 tw-max-w-xs">
        <span className="tw-pointer-events-none tw-absolute tw-left-2.5 tw-top-1/2 -tw-translate-y-1/2">
          <SearchNormal1 size={14} color="#9097a8" />
        </span>
        <Input value={q} onChange={onFilter} placeholder={`Filter ${rows.length} rows…`} className="tw-h-8 tw-pl-8 tw-text-xs" />
      </div>

      <div className="tw-overflow-x-auto tw-rounded-lg tw-border tw-border-border [-webkit-overflow-scrolling:touch]">
        <Table>
          <TableHeader>
            <TableRow className="tw-bg-muted/40 hover:tw-bg-muted/40">
              {columns.map((c) => {
                const active = sort.key === c.key;
                return (
                  <TableHead key={c.key} className="tw-whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort(c.key)} className="tw-inline-flex tw-items-center tw-gap-1 hover:tw-text-foreground">
                      {c.label}
                      {active
                        ? (sort.dir === "asc" ? <ArrowUp2 size={12} /> : <ArrowDown2 size={12} />)
                        : <ArrowDown2 size={12} color="#c2c5cf" />}
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="tw-h-20 tw-text-center tw-text-muted-foreground">No matching rows</TableCell></TableRow>
            ) : (
              pageRows.map((r, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className="tw-whitespace-nowrap tw-tabular-nums">{renderCell(c.type)(r[c.key])}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="tw-mt-3 tw-flex tw-items-center tw-justify-between tw-text-xs tw-text-muted-foreground">
        <span>{sorted.length} rows</span>
        {pageCount > 1 && (
          <div className="tw-flex tw-items-center tw-gap-2">
            <Button variant="outline" size="icon" className="tw-size-7" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              <ArrowLeft2 size={16} />
            </Button>
            <span>Page {safePage + 1} of {pageCount}</span>
            <Button variant="outline" size="icon" className="tw-size-7" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
              <ArrowRight2 size={16} />
            </Button>
          </div>
        )}
      </div>
      {note && <div className="tw-mt-2 tw-text-[11px] tw-text-muted-foreground">{note}</div>}
    </div>
  );
}
