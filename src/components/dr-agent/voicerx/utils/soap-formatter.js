function humanize(key) {
	return key
		.replace(/_/g, " ")
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (c) => c.toUpperCase())
		.trim();
}

function escapeHtml(value) {
	if (value == null) return "";
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function rtfToHtml(rtf) {
	if (!rtf) return "";
	if (typeof rtf !== "string") return "";
	const looksLikeRtf = rtf.trim().startsWith("{\\rtf") || rtf.includes("\\par") || rtf.includes("\\b ");
	if (!looksLikeRtf) {
		return rtf
			.split(/\n{2,}/)
			.map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
			.join("");
	}
	const cleaned = rtf
		// Strip header/metadata groups entirely so their residue (e.g. `;;` from colortbl) doesn't leak into output.
		.replace(/\{\\colortbl[^}]*\}/g, "")
		.replace(/\{\\fonttbl[^}]*\}/g, "")
		.replace(/\{\\stylesheet[^}]*\}/g, "")
		.replace(/\{\\info[^}]*\}/g, "")
		.replace(/\{\\\*[^}]*\}/g, "")
		// Paragraph + line breaks → newlines.
		.replace(/\\par[d]?\b/g, "\n")
		.replace(/\\line\b/g, "\n")
		// Bullet hint → marker (keep distinct so we can detect for <ul>).
		.replace(/\\bullet\b ?/g, "BULLET ")
		// Control words → single space (preserves word boundaries: `mg\highlight0 three` → `mg three`).
		.replace(/\\(?:[a-zA-Z]+-?\d* ?)/g, " ")
		// Escaped non-alpha (e.g. `\\`, `\{`) → drop.
		.replace(/\\[^a-zA-Z]/g, "")
		// Stray braces → drop.
		.replace(/[{}]/g, "")
		// Collapse runs of spaces (keep newlines intact).
		.replace(/[ \t]+/g, " ")
		.replace(/ ?\n ?/g, "\n")
		.trim();

	// Build HTML: group consecutive bullet lines into real <ul><li>, others into <p>.
	const lines = cleaned.split(/\n/);
	const BULLET = "BULLET";
	const out = [];
	let listBuf = [];
	const flushList = () => {
		if (!listBuf.length) return;
		out.push(`<ul>${listBuf.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`);
		listBuf = [];
	};
	const flushPara = (paraLines) => {
		if (!paraLines.length) return;
		out.push(`<p>${paraLines.map((l) => escapeHtml(l)).join("<br/>")}</p>`);
	};
	let paraBuf = [];
	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) {
			flushList();
			flushPara(paraBuf);
			paraBuf = [];
			continue;
		}
		if (line.startsWith(BULLET)) {
			flushPara(paraBuf);
			paraBuf = [];
			listBuf.push(line.slice(BULLET.length).trim());
		} else {
			flushList();
			paraBuf.push(line);
		}
	}
	flushList();
	flushPara(paraBuf);
	return out.join("");
}

function unwrapSoapData(data) {
	if (!data) return null;
	if (typeof data === "string") return data;
	const candidates = [
		data,
		data.soap,
		data.soapNote,
		data.soapNotes,
		data.soap_note,
		data.soap_notes,
		data.notes,
		data.result,
		data.output,
		data.response
	];
	return candidates.find((item) => item && (typeof item === "string" || typeof item === "object")) ?? data;
}

// Wrap plain text as minimal RTF envelope matching API contract.
// Converts \n → \par for paragraph preservation.
function wrapAsRtf(text) {
	if (!text || !text.trim()) return "";
	// Escape RTF special chars: \ { }
	const escaped = String(text)
		.replace(/\\/g, "\\\\")
		.replace(/[{}]/g, (c) => "\\" + c);
	const withPars = escaped.replace(/\n+/g, "\\par ").trim();
	return `{\\rtf1\\ansi\\deff0 ${withPars}\\par}`;
}

// Parse edited SOAP HTML back into { subjective, objective, assessment, plan } RTF strings
// for use as previous_context on regen. Splits by <h2> headings matched case-insensitively
// against canonical section names. Missing sections omitted.
export function htmlToSoapSections(html) {
	if (!html || typeof html !== "string" || !html.trim()) return null;
	if (typeof DOMParser === "undefined") return null;
	const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
	const root = doc.body.firstChild;
	if (!root) return null;
	const sectionMap = { subjective: null, objective: null, assessment: null, plan: null };
	let currentKey = null;
	let buffer = [];
	const flush = () => {
		if (currentKey && buffer.length) {
			const text = buffer.join("\n").trim();
			if (text) sectionMap[currentKey] = wrapAsRtf(text);
		}
		buffer = [];
	};
	for (const node of Array.from(root.childNodes)) {
		if (node.nodeType === 1 && /^h[12]$/i.test(node.tagName)) {
			flush();
			const label = (node.textContent || "").trim().toLowerCase();
			currentKey = Object.prototype.hasOwnProperty.call(sectionMap, label) ? label : null;
			continue;
		}
		if (!currentKey) continue;
		const txt = (node.textContent || "").trim();
		if (txt) buffer.push(txt);
	}
	flush();
	const out = {};
	let hasAny = false;
	for (const k of Object.keys(sectionMap)) {
		if (sectionMap[k]) { out[k] = sectionMap[k]; hasAny = true; }
	}
	return hasAny ? out : null;
}

export function soapToHtml(data) {
	const soap = unwrapSoapData(data);
	if (!soap) return "";
	if (typeof soap === "string") return rtfToHtml(soap);

	const sections = [
		{ key: "subjective", label: "Subjective" },
		{ key: "objective", label: "Objective" },
		{ key: "assessment", label: "Assessment" },
		{ key: "plan", label: "Plan" }
	];
	const hasStructuredSoap = sections.some(({ key }) => soap[key]);
	if (!hasStructuredSoap) {
		const values = Object.entries(soap)
			.filter(([, value]) => value != null && value !== "")
			.map(([key, value]) => `<h2>${escapeHtml(humanize(key))}</h2>${rtfToHtml(value) || `<p>${escapeHtml(value)}</p>`}`)
			.join("");
		return values || "<p><em>No SOAP note data was returned.</em></p>";
	}

	return sections
		.map(({ key, label }) => {
			let body = rtfToHtml(soap[key]) || "<p><em>Not mentioned.</em></p>";
			const labelRegex = new RegExp(`^(?:<p>)?\\s*(?:<strong>|<b>)?\\s*${label}\\s*(?:<\\/strong>|<\\/b>|:)?\\s*(?:<br\\s*\\/?>)?\\s*`, "i");
			body = body.replace(labelRegex, "<p>");
			// Drop leftover empty <p></p> when label-strip left section starting with a real block (ul/ol).
			body = body.replace(/^<p>\s*<\/p>\s*(?=<(?:ul|ol|h\d|p))/i, "");
			if (body === "<p></p>" || body === "<p>") {
				body = "<p><em>Not documented.</em></p>";
			} else if (body.match(/^<p>\s*\(?Not documented\)?\s*<\/p>$/i)) {
				body = "<p><em>Not documented.</em></p>";
			}
			return `<h2>${label}</h2>${body}`;
		})
		.join("");
}
