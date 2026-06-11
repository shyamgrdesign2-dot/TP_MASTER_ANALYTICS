import { env } from '../../../../EnvironmentConfig';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../../../../utils/constants';

function normalizeBaseUrl(url) {
	return (url || '').trim().replace(/\/+$/, '');
}

export const CLINICAL_API_BASE_URL =
	normalizeBaseUrl(env?.agent_module_api_base_url);

export const AGENT_MODULE_API_BASE_URL =
	normalizeBaseUrl(env?.agent_module_api_base_url);

export function joinClinicalApiUrl(path) {
	if (!CLINICAL_API_BASE_URL) {
		throw new Error('Clinical API base URL is not configured.');
	}
	return `${CLINICAL_API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function joinAgentModuleApiUrl(path) {
	const configuredUrl = AGENT_MODULE_API_BASE_URL.replace(/\/+$/, '');
	const requestedPath = (path || '').replace(/^\/+/, '');

	if (!configuredUrl) {
		throw new Error('Agent module API base URL is not configured.');
	}

	if (!requestedPath) {
		return configuredUrl;
	}

	return `${configuredUrl}/${requestedPath}`;
}

function normalizeBearerToken(token) {
	const cleanedToken = String(token || '').trim().replace(/^['"]+|['"]+$/g, '');
	if (!cleanedToken) return '';
	return cleanedToken.startsWith('Bearer ') ? cleanedToken : `Bearer ${cleanedToken}`;
}

function parseStoredToken(rawToken) {
	if (!rawToken) return '';
	try {
		return JSON.parse(rawToken);
	} catch (error) {
		return rawToken;
	}
}

function getStoredAuthToken() {
	if (typeof window === 'undefined' || !window.localStorage) return '';
	return parseStoredToken(window.localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN));
}

export function buildClinicalApiHeaders({ includeContentType = true } = {}) {
	const headers = includeContentType ? { 'Content-Type': 'application/json' } : {};
	const authToken = getStoredAuthToken();

	if (authToken) {
		headers.Authorization = normalizeBearerToken(authToken);
	}

	return headers;
}
