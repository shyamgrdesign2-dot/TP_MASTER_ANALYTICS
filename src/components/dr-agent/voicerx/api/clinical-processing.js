import { buildClinicalApiHeaders, joinClinicalApiUrl } from './clinical-api';

const TRANSCRIPT_TIMEOUT_MS = 10 * 60 * 1000;
export const MODULE_TIMEOUT_MS = 30 * 1000;
export const DIGITISE_DATA_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_RETRIES = 3;

const MODULES = {
	digitization: { tab: 'digitization', name: 'Digitization', path: '/agents/digitise-data' }
};

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTimeoutSignal(timeoutMs) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
}

function combineSignals(signals) {
	const activeSignals = signals.filter(Boolean);
	if (!activeSignals.length) return undefined;
	const controller = new AbortController();
	const abort = () => controller.abort();
	for (const signal of activeSignals) {
		if (signal.aborted) {
			controller.abort();
			break;
		}
		signal.addEventListener('abort', abort, { once: true });
	}
	return controller.signal;
}

function isRetriableError(error) {
	if (error?.name === 'AbortError') return false;
	return true;
}

async function fetchWithTimeout(url, options, timeoutMs) {
	const timeout = createTimeoutSignal(timeoutMs);
	try {
		return await fetch(url, { ...options, signal: combineSignals([timeout.signal, options?.signal]) });
	} catch (error) {
		if (error?.name === 'AbortError') {
			if (options?.signal?.aborted) throw error;
			const timeoutError = new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
			timeoutError.status = 408;
			throw timeoutError;
		}
		throw error;
	} finally {
		timeout.clear();
	}
}

export async function withRetry(operation, { retries = MAX_RETRIES, delayMs = 800 } = {}) {
	let lastError;
	for (let attempt = 0; attempt <= retries; attempt += 1) {
		try {
			const result = await operation();
			if (result == null) {
				throw new Error('API returned no response.');
			}
			return result;
		} catch (error) {
			lastError = error;
			if (!isRetriableError(error)) break;
			if (attempt === retries) break;
			await sleep(delayMs * (attempt + 1));
		}
	}
	throw lastError;
}

export async function postJson(path, payload, name, { timeoutMs = MODULE_TIMEOUT_MS, signal } = {}) {
	const response = await fetchWithTimeout(joinClinicalApiUrl(path), {
		method: 'POST',
		headers: buildClinicalApiHeaders(),
		body: JSON.stringify(payload),
		signal
	}, timeoutMs);

	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		const error = new Error(`${name} API failed (${response.status}). ${detail}`.trim());
		error.status = response.status;
		throw error;
	}

	if (response.status === 204) {
		return null;
	}

	return response.json();
}

async function postMultipart(path, formData, name, { timeoutMs = TRANSCRIPT_TIMEOUT_MS, signal } = {}) {
	const url = joinClinicalApiUrl(path);
	console.log(`[voice-rx] ${name} multipart request`, {
		url,
		method: 'POST',
		fields: describeFormData(formData)
	});

	const response = await fetchWithTimeout(url, {
		method: 'POST',
		headers: buildClinicalApiHeaders({ includeContentType: false }),
		body: formData,
		signal
	}, timeoutMs);

	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		const error = new Error(`${name} API failed (${response.status}). ${detail}`.trim());
		error.status = response.status;
		throw error;
	}

	return response.json();
}

async function getJson(path, name, { timeoutMs = MODULE_TIMEOUT_MS, signal } = {}) {
	const response = await fetchWithTimeout(joinClinicalApiUrl(path), {
		method: 'GET',
		headers: buildClinicalApiHeaders({ includeContentType: false }),
		signal
	}, timeoutMs);

	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		const error = new Error(`${name} API failed (${response.status}). ${detail}`.trim());
		error.status = response.status;
		throw error;
	}

	if (response.status === 204) {
		return null;
	}

	return response.json();
}

export function extractResultData(responseJson) {
	return responseJson?.data?.documents?.[0]?.data ??
		responseJson?.data?.document?.data ??
		responseJson?.data ??
		responseJson;
}

export function buildIdentityPayload(context) {
	return {
		patient_id: context.patientId,
		doctor_id: context.doctorId,
		session_id: context.sessionId
	};
}

function hasPreviousContext(value) {
	if (value === undefined || value === null) return false;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === 'object') return Object.keys(value).length > 0;
	return String(value).trim() !== '';
}

function withoutArtifactType(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
	const { artifact_type, ...rest } = value;
	return rest;
}

function normalizeDigitizationPreviousContext(previousContext) {
	if (!hasPreviousContext(previousContext)) return undefined;

	if (previousContext && typeof previousContext === 'object' && !Array.isArray(previousContext)) {
		if (Object.prototype.hasOwnProperty.call(previousContext, 'digitise_data')) {
			return { digitise_data: withoutArtifactType(previousContext.digitise_data) };
		}

		return { digitise_data: withoutArtifactType(previousContext) };
	}

	return { digitise_data: previousContext };
}

function buildDigitizationPayload(context, previousContext) {
	const payload = buildIdentityPayload(context);
	const normalizedPreviousContext = normalizeDigitizationPreviousContext(previousContext);
	if (normalizedPreviousContext) {
		payload.previous_context = normalizedPreviousContext;
	}
	return payload;
}

function describeFormData(formData) {
	if (typeof FormData === 'undefined' || !(formData instanceof FormData)) return [];
	return Array.from(formData.entries()).map(([key, value]) => {
		if (typeof File !== 'undefined' && value instanceof File) {
			return {
				key,
				kind: 'file',
				name: value.name,
				type: value.type,
				size: value.size,
				lastModified: value.lastModified
			};
		}
		if (typeof Blob !== 'undefined' && value instanceof Blob) {
			return {
				key,
				kind: 'blob',
				type: value.type,
				size: value.size
			};
		}
		return { key, kind: 'field', value };
	});
}

function extractTranscript(responseJson) {
	const transcript = responseJson?.data?.transcript ??
		responseJson?.data?.transcription ??
		responseJson?.data?.medical_transcript ??
		responseJson?.data?.medicalTranscript ??
		responseJson?.data?.items?.[0]?.transcript ??
		responseJson?.data?.items?.[0]?.transcription ??
		responseJson?.data?.documents?.[0]?.transcript ??
		responseJson?.data?.documents?.[0]?.transcription ??
		responseJson?.transcript ??
		responseJson?.transcription ??
		responseJson?.medical_transcript ??
		responseJson?.medicalTranscript ??
		responseJson?.data?.text ??
		responseJson?.text ??
		responseJson?.data ??
		responseJson;

	if (Array.isArray(transcript)) {
		return transcript.filter((turn) => {
			if (typeof turn === 'string') return turn.trim();
			return turn?.text || turn?.speaker;
		});
	}

	return typeof transcript === 'string' ? transcript : '';
}

export function transcriptToText(transcript) {
	if (Array.isArray(transcript)) {
		return transcript
			.map((turn) => {
				if (typeof turn === 'string') return turn.trim();
				const speaker = turn?.speaker ? `${turn.speaker}: ` : '';
				return `${speaker}${turn?.text ?? ''}`.trim();
			})
			.filter(Boolean)
			.join('\n');
	}
	if (transcript && typeof transcript === 'object' && Array.isArray(transcript.transcript)) {
		return transcriptToText(transcript.transcript);
	}
	return typeof transcript === 'string' ? transcript : '';
}

export function hasTranscriptContent(transcript) {
	return Boolean(transcriptToText(transcript).trim());
}

async function fetchExistingTranscript({ context, signal }) {
	const params = new URLSearchParams(buildIdentityPayload(context));
	const responseJson = await getJson(`/medical-transcripts?${params.toString()}`, 'Medical transcript', {
		timeoutMs: MODULE_TIMEOUT_MS,
		signal
	});
	const text = extractTranscript(responseJson);
	if (!hasTranscriptContent(text)) {
		throw new Error('Existing medical transcript API returned an empty transcript.');
	}
	return text;
}

export async function transcribeAudio({ audioBlob, context, signal }) {
	if (!context?.patientId || !context?.doctorId || !context?.sessionId) {
		throw new Error('Missing patient, doctor, or session id for audio transcription.');
	}
	if (!audioBlob?.size) {
		throw new Error('No audio recording found for transcription.');
	}

	const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' });
	const payload = {
		...buildIdentityPayload(context),
		audio: audioFile
	};
	console.log('transcribe-audio payload before FormData:', {
		...payload,
		audio: {
			name: audioFile.name,
			type: audioFile.type,
			size: audioFile.size,
			lastModified: audioFile.lastModified,
			file: audioFile
		}
	});

	const formData = new FormData();
	formData.append('patient_id', payload.patient_id);
	formData.append('doctor_id', payload.doctor_id);
	formData.append('session_id', payload.session_id);
	formData.append('audio', payload.audio, payload.audio.name);
	console.log('transcribe-audio FormData before request:', describeFormData(formData));

	return withRetry(async () => {
		let responseJson;
		try {
			responseJson = await postMultipart('/agents/transcribe-audio', formData, 'Transcribe audio', { timeoutMs: TRANSCRIPT_TIMEOUT_MS, signal });
		} catch (error) {
			if (error?.status === 409) {
				return fetchExistingTranscript({ context, signal });
			}
			throw error;
		}
		const text = extractTranscript(responseJson);
		if (!hasTranscriptContent(text)) {
			throw new Error('Transcription API returned an empty transcript.');
		}
		return text;
	});
}

function runDigitizeModule({ context, previousContext, signal, onResult }) {
	const cfg = MODULES.digitization;
	return withRetry(() => postJson(cfg.path, buildDigitizationPayload(context, previousContext), cfg.name, { timeoutMs: DIGITISE_DATA_TIMEOUT_MS, signal }))
		.then((responseJson) => {
			const result = {
				name: cfg.tab,
				status: 'fulfilled',
				data: extractResultData(responseJson)
			};
			onResult?.(cfg.tab, result);
			return result;
		})
		.catch((error) => {
			const result = { name: cfg.tab, status: 'rejected', error: error.message };
			onResult?.(cfg.tab, result);
			return result;
		});
}

export async function digitiseClinicalData({ context, previousContext, signal, onResult }) {
	if (!context?.patientId || !context?.doctorId || !context?.sessionId) {
		throw new Error('Missing patient, doctor, or session id for clinical processing.');
	}
	return runDigitizeModule({ context, previousContext, signal, onResult });
}

export function retryDigitization({ context, previousContext, signal, onResult }) {
	onResult?.('digitization', { name: 'digitization', status: 'pending' });
	return runDigitizeModule({ context, previousContext, signal, onResult });
}

function runSoapModule({ context, signal, onResult }) {
	const cfg = MODULES.soap;
	return withRetry(() => postJson(cfg.path, buildIdentityPayload(context), cfg.name, { timeoutMs: MODULE_TIMEOUT_MS, signal }))
		.then((responseJson) => {
			const result = {
				name: cfg.tab,
				status: 'fulfilled',
				data: extractResultData(responseJson)
			};
			onResult?.(cfg.tab, result);
			return result;
		})
		.catch((error) => {
			const result = { name: cfg.tab, status: 'rejected', error: error.message };
			onResult?.(cfg.tab, result);
			return result;
		});
}

export async function generateSoapNote({ context, signal, onResult }) {
	if (!context?.patientId || !context?.doctorId || !context?.sessionId) {
		throw new Error('Missing patient, doctor, or session id for SOAP generation.');
	}
	return runSoapModule({ context, signal, onResult });
}

export function retrySoap({ context, signal, onResult }) {
	onResult?.('soap', { name: 'soap', status: 'pending' });
	return runSoapModule({ context, signal, onResult });
}
