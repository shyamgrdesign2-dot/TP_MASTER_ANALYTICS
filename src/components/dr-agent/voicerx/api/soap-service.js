import {
	postJson,
	withRetry,
	buildIdentityPayload,
	extractResultData,
	MODULE_TIMEOUT_MS
} from "./clinical-processing";

const SOAP_PATH = "/agents/get-soap-notes";
const SOAP_NAME = "SOAP";
const SOAP_TAB = "soap";
const SECTIONS = ["subjective", "objective", "assessment", "plan"];

// Build previous_context in API contract shape:
// { subjective, objective, assessment, plan } — each value RTF string.
// Returns undefined if no section has content (omit field entirely).
function normalizeSoapPreviousContext(raw) {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
	const out = {};
	let hasAny = false;
	for (const key of SECTIONS) {
		const v = raw[key];
		if (v != null && String(v).trim() !== "") {
			out[key] = String(v);
			hasAny = true;
		}
	}
	return hasAny ? out : undefined;
}

function buildSoapPayload(context, previousContext) {
	const payload = buildIdentityPayload(context);
	const ctx = normalizeSoapPreviousContext(previousContext);
	if (ctx) payload.previous_context = ctx;
	return payload;
}

function runSoapModule({ context, previousContext, signal, onResult }) {
	return withRetry(() => postJson(SOAP_PATH, buildSoapPayload(context, previousContext), SOAP_NAME, { timeoutMs: MODULE_TIMEOUT_MS, signal }))
		.then((responseJson) => {
			const result = {
				name: SOAP_TAB,
				status: "fulfilled",
				data: extractResultData(responseJson)
			};
			onResult?.(SOAP_TAB, result);
			return result;
		})
		.catch((error) => {
			const result = { name: SOAP_TAB, status: "rejected", error: error.message };
			onResult?.(SOAP_TAB, result);
			return result;
		});
}

export async function generateSoapNote({ context, previousContext, signal, onResult }) {
	if (!context?.patientId || !context?.doctorId || !context?.sessionId) {
		throw new Error("Missing patient, doctor, or session id for SOAP generation.");
	}
	return runSoapModule({ context, previousContext, signal, onResult });
}

export function retrySoap({ context, previousContext, signal, onResult }) {
	onResult?.(SOAP_TAB, { name: SOAP_TAB, status: "pending" });
	return runSoapModule({ context, previousContext, signal, onResult });
}
