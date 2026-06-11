import { normalizeHealthCheckupReportHtml } from "./normalizeReportHtml";

/**
 * Print report to PDF using the browser's native print engine via a hidden iframe.
 * No screenshot, canvas, or jsPDF — true CSS layout, page breaks, vector text.
 *
 * @param {string} htmlContent - Full HTML of the report (e.g. document-paper element's outerHTML)
 * @param {string} [documentTitle] - Title for the print document
 */

const PRINT_CSS_HREF = "/report-print.css";
const IFRAME_REMOVAL_DELAY_MS = 1500;

export function printReportWithIframe(rawHtmlContent, documentTitle = "Health Check-up Report", patient_data) {
  if (!rawHtmlContent || typeof rawHtmlContent !== "string") {
    console.warn("printReportWithIframe: no htmlContent provided");
    return;
  }

  // --- HTML Cleaning & Wrapper Extraction ---
  // The rawHtmlContent often contains the entire React wrapper tree (e.g. .health-checkup-editor__document-wrap)
  // which brings along inline styles like height: 100%, flex: 1, and overflow: auto.
  // We MUST strip these out before printing, or Chrome will endlessly paginate 60+ blank pages.
  let htmlContent = rawHtmlContent;
  try {
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(rawHtmlContent, 'text/html');
    const editableEl = parsedDoc.querySelector('.smart-editor-editable') || parsedDoc.querySelector('.ProseMirror') || parsedDoc.querySelector('.jodit-wysiwyg');
    if (editableEl) {
      htmlContent = editableEl.innerHTML; // Extract ONLY the tables/paragraphs/headers
    }
    htmlContent = normalizeHealthCheckupReportHtml(htmlContent);
  } catch (e) {
    console.error("printReportWithIframe: failed to parse HTML wrappers", e);
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", documentTitle);
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  const baseUrl = typeof window !== "undefined" && window.location ? window.location.origin : "";
  const cssHref = baseUrl + (process.env.PUBLIC_URL || "") + PRINT_CSS_HREF;

  // --- Repeating Header Extraction & Construction ---
  const patientName = patient_data?.pm_fullname || patient_data?.patient_name || "N/A";
  const patientMrn = patient_data?.pm_reference_id || patient_data?.patient_id || "N/A";

  const repeatingHeaderHtml = `
    <div class="print-repeating-header">
      <div class="print-repeating-header-left">
        <div><strong>Patient Name:</strong> ${escapeHtml(patientName)}</div>
        <div><strong>MRN:</strong> ${escapeHtml(patientMrn)}</div>
      </div>
    </div>
  `;

  const finalHtmlStructure = `
    <div class="print-padding-wrapper">
      <div class="print-source-content smart-editor-editable">
        ${htmlContent}
      </div>

      <table class="print-first-page-table">
        <tbody>
          <tr>
            <td>
              <div class="smart-editor-editable print-first-page-content"></div>
            </td>
          </tr>
        </tbody>
      </table>

      <table class="print-content-table print-repeat-pages-table">
        <thead>
          <tr>
            <td>
              ${repeatingHeaderHtml}
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="smart-editor-editable print-rest-pages-content"></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const sanitizedHtmlStructure = normalizeHealthCheckupReportHtml(finalHtmlStructure);

  doc.open();
  const criticalTableCss = `
    /* --- Critical Print Resets to fix 61 Blank Pages --- */
    /* We must force absolute auto-heights and prevent any inheriting overflow */
    html, body {
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: white !important;
    }
    
    @page {
      size: A4 portrait !important;
      margin: 0 !important;
    }

    .print-padding-wrapper {
      padding: 10mm 1cm 3cm 2cm !important;
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow: visible !important;
    }
    
    .print-content-table, .smart-editor-editable, .health-checkup-editor__document-paper, .health-checkup-editor__document-wrap {
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      background: transparent !important;
      box-sizing: border-box !important;
      page-break-after: auto !important;
      page-break-inside: auto !important;
    }

    .print-source-content {
      display: none !important;
    }
    
    /* --- Repeating Header CSS --- */
    .print-first-page-table,
    .print-content-table {
      border-collapse: collapse;
      border: none;
      width: 100% !important;
      max-width: 100% !important;
    }
    .print-first-page-table > tbody {
      display: table-row-group;
    }
    .print-content-table > thead {
      display: table-header-group;
    }
    .print-content-table > tbody {
      display: table-row-group;
    }
    .print-first-page-table > tbody > tr > td,
    .print-content-table > thead > tr > td,
    .print-content-table > tbody > tr > td {
      border: none;
      padding: 0;
    }

    /*
     * Break AFTER the first-page table (not before the repeat table) to avoid a Chrome
     * print bug where <thead> is not rendered on the very first page of a table that
     * starts with break-before:page, causing the Patient Name/MRN header to be missing
     * on page 2 while correctly repeating on pages 3+.
     */
    .print-first-page-table.has-rest-pages {
      page-break-after: always !important;
      break-after: page !important;
    }
    
    .report-doc-header {
      margin-top: 0 !important;
      background: white !important;
      position: relative !important;
      z-index: 1000 !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      border-bottom: none !important;
    }

    .print-repeating-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #e2e2ea;
      padding-bottom: 8px;
      margin-bottom: 12px;
      margin-top: 2cm !important;
      font-family: 'Poppins', sans-serif;
      font-size: 14px;
      line-height: 18px;
      color: #171725;
      // page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    /* Ensure the body actually takes up A4 width for printing and add document margins */
    
    
    /* Critical table layout */
    .smart-editor-editable .tableWrapper:not(:first-of-type) > table:not(.report-section-box),
    .smart-editor-editable > table:not(:first-of-type):not(.report-section-box) {
      table-layout: auto !important; /* using auto instead of fixed to avoid overlapping headers when content is long */
      border-collapse: collapse !important;
      width: 100% !important;
      max-width: 100% !important;
      border: 1px solid #d1d5db !important;
      // page-break-inside: auto !important;
      overflow: visible !important;
    }
    .smart-editor-editable tr {
      page-break-inside: avoid !important;
      page-break-after: auto !important;
    }
    .smart-editor-editable .tableWrapper:not(:first-of-type) > table:not(.report-section-box) th,
    .smart-editor-editable .tableWrapper:not(:first-of-type) > table:not(.report-section-box) td,
    .smart-editor-editable > table:not(:first-of-type):not(.report-section-box) th,
    .smart-editor-editable > table:not(:first-of-type):not(.report-section-box) td {
      border: 1px solid #d1d5db !important;
      white-space: normal !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }
  `;
  doc.write(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(documentTitle)}</title>` +
    `<style>${criticalTableCss}</style>` +
    `<link rel="stylesheet" href="${escapeHtml(cssHref)}" />` +
    `</head><body>${sanitizedHtmlStructure}</body></html>`
  );
  doc.close();

  const printWindow = iframe.contentWindow;
  if (!printWindow) {
    document.body.removeChild(iframe);
    return;
  }

  const printAfterLoad = () => {
    printWindow.focus();
    printWindow.print();
  };

  const waitForStableLayout = async () => {
    const printDoc = printWindow.document;
    try {
      if (printDoc.fonts && typeof printDoc.fonts.ready?.then === "function") {
        await printDoc.fonts.ready;
      }
    } catch (_) {
      // Ignore font readiness errors and continue with best-effort layout.
    }

    // Let the browser flush final layout after font load.
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  };

  const preparePaginatedLayout = () => {
    const printDoc = printWindow.document;
    const source = printDoc.querySelector(".print-source-content");
    const firstPageContainer = printDoc.querySelector(".print-first-page-content");
    const restPagesContainer = printDoc.querySelector(".print-rest-pages-content");
    const firstPageTable = printDoc.querySelector(".print-first-page-table");
    const repeatPagesTable = printDoc.querySelector(".print-repeat-pages-table");

    if (!source || !firstPageContainer || !restPagesContainer || !firstPageTable || !repeatPagesTable) {
      return;
    }

    /* Continuation table must not participate in height measurement (thead skews layout). */
    repeatPagesTable.style.display = "none";

    const mmProbe = printDoc.createElement("div");
    mmProbe.style.height = "1mm";
    mmProbe.style.width = "1px";
    mmProbe.style.position = "absolute";
    mmProbe.style.visibility = "hidden";
    printDoc.body.appendChild(mmProbe);
    const pxPerMm = mmProbe.getBoundingClientRect().height || 3.78;
    mmProbe.remove();

    /*
     * Exact print content area: A4 297mm − 10mm top padding − 30mm bottom padding = 257mm.
     * The previous +5 slack allowed up to 262mm, and overflowTolerancePx added another ~6mm,
     * meaning firstPageTable could be 268mm tall while the print page only holds 257mm.
     * Chrome then paginates firstPageTable across pages 1 & 2, pushing repeatPagesTable
     * (and its header) to page 3 — the "header missing on page 2" bug.
     */
    const availableFirstPageHeight = (297 - 10 - 30) * pxPerMm;
    const sourceNodes = Array.from(source.childNodes).filter((node) => {
      if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent && node.textContent.trim());
      return true;
    });

    /**
     * Split by atomic chunks so we never move only part of a section (e.g. "General Examination"
     * h2 without its vitals tables). Already-wrapped .print-section-group is one chunk; legacy HTML
     * uses h2.report-section-title + following siblings until the next section heading.
     */
    const groupNodesForPrintPagination = (nodes) => {
      const chunks = [];
      let i = 0;
      while (i < nodes.length) {
        const node = nodes[i];
        if (node.nodeType !== Node.ELEMENT_NODE) {
          chunks.push([node]);
          i += 1;
          continue;
        }
        const el = node;
        if (el.classList?.contains("print-section-group")) {
          chunks.push([el]);
          i += 1;
          continue;
        }
        const isH2SectionTitle =
          el.tagName === "H2" && el.classList?.contains("report-section-title");
        if (isH2SectionTitle) {
          const chunk = [el];
          i += 1;
          while (i < nodes.length) {
            const next = nodes[i];
            if (next.nodeType !== Node.ELEMENT_NODE) {
              chunk.push(next);
              i += 1;
              continue;
            }
            const nextEl = next;
            if (nextEl.classList?.contains("print-section-group")) break;
            if (
              nextEl.tagName === "H2" &&
              nextEl.classList?.contains("report-section-title")
            ) {
              break;
            }
            if (nextEl.classList?.contains("report-doc-header")) break;
            chunk.push(next);
            i += 1;
          }
          chunks.push(chunk);
          continue;
        }
        chunks.push([el]);
        i += 1;
      }
      return chunks;
    };

    const chunks = groupNodesForPrintPagination(sourceNodes);

    let spillToRestPages = false;
    chunks.forEach((chunkNodes) => {
      const clones = chunkNodes.map((node) => node.cloneNode(true));
      if (spillToRestPages) {
        clones.forEach((c) => restPagesContainer.appendChild(c));
        return;
      }

      const prevChildCount = firstPageContainer.childNodes.length;

      // Sections with print-page-break always start on a new page via @media print CSS.
      // Mirror that guarantee here: once page 1 has content, send these directly to
      // restPagesContainer so hasRestPages becomes true and the repeating header shows.
      const hasPrintPageBreak = chunkNodes.some(
        (n) => n.nodeType === Node.ELEMENT_NODE && n.classList?.contains("print-page-break")
      );
      if (hasPrintPageBreak && prevChildCount > 0) {
        clones.forEach((c) => restPagesContainer.appendChild(c));
        spillToRestPages = true;
        return;
      }

      clones.forEach((c) => firstPageContainer.appendChild(c));
      const firstPageHeight = firstPageTable.getBoundingClientRect().height;

      const overflowTolerancePx = 4; // ~1mm for sub-pixel rounding only; must stay well under 257mm limit
      const overflows =
        firstPageHeight > availableFirstPageHeight + overflowTolerancePx;
      if (overflows && prevChildCount > 0) {
        clones.forEach((c) => firstPageContainer.removeChild(c));
        clones.forEach((c) => restPagesContainer.appendChild(c));
        spillToRestPages = true;
      }
    });

    const hasRestPages = restPagesContainer.childNodes.length > 0;
    if (hasRestPages) {
      firstPageTable.classList.add("has-rest-pages");
      repeatPagesTable.style.display = "table";

      /*
       * The <thead> auto-repeats Patient Name/MRN on every page of print-content-table,
       * including continuation pages within large sections (e.g. a Consultations table that
       * spans pages 3 and 4). No manual header clones are needed.
       *
       * Major sections with .print-page-break are forced onto new pages via an injected
       * breakDiv; the auto-repeating thead provides the header on that new page.
       */
      // Direct children of restPagesContainer.
      const contentNodes = Array.from(restPagesContainer.childNodes);
      let isFirstElement = true;
      const toInject = []; // nodes that need a page-break div injected before them

      for (const node of contentNodes) {
        if (node.nodeType === Node.TEXT_NODE) continue;

        const hasForcedBreak = node.classList?.contains("print-page-break");

        if (hasForcedBreak && isFirstElement) {
          // First section: page 2 already starts fresh (firstPageTable has break-after:page). Absorb.
          node.classList.remove("print-page-break");
          node.style.pageBreakBefore = "auto";
          node.style.breakBefore = "auto";
          isFirstElement = false;
          continue;
        }

        if (hasForcedBreak) {
          // Consultations, Impressions, General Recommendations: force onto a new page.
          // The auto-repeating thead provides Patient Name/MRN on the new page.
          toInject.push(node);
          node.classList.remove("print-page-break");
          node.style.pageBreakBefore = "auto";
          node.style.breakBefore = "auto";
          isFirstElement = false;
          continue;
        }

        isFirstElement = false;
      }

      // Insert page-break divs in reverse to preserve earlier node positions.
      for (let i = toInject.length - 1; i >= 0; i--) {
        const target = toInject[i];
        const breakDiv = printDoc.createElement("div");
        breakDiv.style.cssText =
          "page-break-before:always;break-before:page;height:0;margin:0;padding:0;";
        restPagesContainer.insertBefore(breakDiv, target);
      }
    } else {
      firstPageTable.classList.remove("has-rest-pages");
      repeatPagesTable.style.display = "none";
    }
  };

  let printed = false;
  const printOnce = async () => {
    if (printed) return;
    printed = true;
    await waitForStableLayout();
    /*
     * The iframe starts at 0×0 for stealth. That width forces tables/blocks to wrap as if the
     * viewport were one column tall → huge measured heights → pagination wrongly spills sections
     * (e.g. entire General Examination) to the continuation page despite empty space on sheet 1.
     * Use ~A4 width before measuring and printing so heights match real print layout.
     */
    iframe.style.width = "210mm";
    iframe.style.maxWidth = "210mm";
    iframe.style.minHeight = "297mm";
    iframe.style.height = "auto";
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    preparePaginatedLayout();
    printAfterLoad();
  };

  const link = doc.querySelector('link[href]');
  if (link) {
    link.addEventListener("load", () => setTimeout(printOnce, 100));
    link.addEventListener("error", () => setTimeout(printOnce, 150));
    // Fallback if load/error never fire
    setTimeout(printOnce, 3000);
  } else {
    setTimeout(printAfterLoad, 200);
  }

  setTimeout(() => {
    try {
      if (iframe.parentNode) document.body.removeChild(iframe);
    } catch (_) { }
  }, IFRAME_REMOVAL_DELAY_MS);
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  const text = document.createTextNode(str);
  div.appendChild(text);
  return div.innerHTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
