import axios from 'axios';
import { notification } from 'antd';
import main_config from '../../config';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN, PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN } from '../../utils/constants';

const instance = axios.create({
    // baseURL: config.appointment_api_url, // Replace with your API base URL
    timeout: 20000, // Set the timeout for requests
});

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

const isVoiceEndpointRequest = (requestConfig = {}) => {
    const requestUrl = requestConfig?.url || '';
    return requestUrl.includes('/api/v1/digitization/voice')
        || requestUrl.includes('/api/v1/voice-digitize')
        || requestUrl.includes('/api/v1/ambient-voice-rx');
};

const isVoiceUploadRequest = (requestConfig = {}) => {
    const requestUrl = requestConfig?.url || '';
    return requestUrl.includes('/api/v1/digitization/voice/upload');
};

const isVoiceDigitizeRequest = (requestConfig = {}) => {
    return isVoiceEndpointRequest(requestConfig) && !isVoiceUploadRequest(requestConfig);
};

const shouldAttachVoiceCorrelationId = (requestConfig = {}) => {
    const requestUrl = requestConfig?.url || '';
    const requestMethod = (requestConfig?.method || '').toLowerCase();
    const isCreateOrUpdateRequest = requestMethod === 'post' || requestMethod === 'put';
    const isDigitizationRequest = requestUrl.includes('/api/v1/digitization/');
    return isCreateOrUpdateRequest && isDigitizationRequest;
};

const isRetryableTransientError = (error) => {
    if (axios.isCancel?.(error)) return false;
    if ((error?.message || '').includes('Internet connection not available')) return false;
    const status = error?.response?.status;
    const isTimeout = error?.code === 'ECONNABORTED'
        || (error?.message || '').toLowerCase().includes('timeout');
    return !error?.response || isTimeout || (status >= 500 && status < 600);
};

const waitBeforeRetry = () => new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
const applyRetryIfEligible = async (error, originalRequest = {}) => {
    if (!isRetryableTransientError(error)) return null;
    originalRequest.__retryCount = originalRequest.__retryCount || 0;
    window.__TATVA_VOICE_API_LAST_ERROR_MESSAGE =
        error?.response?.data?.error
        || error?.response?.data?.message
        || error?.message
        || 'Internal Server Error';
    window.__TATVA_VOICE_API_LAST_RETRY_ATTEMPT = originalRequest.__retryCount;

    if (originalRequest.__retryCount < MAX_RETRY_ATTEMPTS - 1) {
        originalRequest.__retryCount += 1;
        window.__TATVA_VOICE_API_LAST_RETRY_ATTEMPT = originalRequest.__retryCount;
        if (isVoiceDigitizeRequest(originalRequest)) {
            window.__TATVA_VOICE_API_LAST_DIGITIZE_RETRY_ATTEMPT = originalRequest.__retryCount;
        }
        if (isVoiceEndpointRequest(originalRequest)) {
            console.warn(`[Voice API] Attempt ${originalRequest.__retryCount} failed, retrying...`, error);
        }
        await waitBeforeRetry();
        return instance(originalRequest);
    }
    if (isVoiceEndpointRequest(originalRequest)) {
        console.error('[Voice API] All 3 attempts failed', error);
    }
    return null;
};

// Request interceptor
instance.interceptors.request.use(
    (config) => {
        if (!window.navigator.onLine) {
            const error = 'Internet connection not available';
            // notification.error({ key: "notification_key", message: error });
            return Promise.reject(new Error(error));
        }
        // You can modify the request config here (e.g., add headers)
        if (config.customBaseUrl) {
            config.baseURL = config.customBaseUrl;
        }
        // Check if customBaseUrl exists before calling startsWith
        const token = config.customBaseUrl && config.customBaseUrl.startsWith(main_config.zydus_proxy_url) && !config.url.startsWith('/ictAuthProxy') ?                                 
            localStorage.getItem(PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN) == null ? localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN) == null ? null : JSON.parse(localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN)) : JSON.parse(localStorage.getItem(PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN))
            : localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN) == null ? null : JSON.parse(localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN));
        if (token && !config.headers['api_key'] && !config.snapRxFileUpload) {
            config.headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.log('Entry Route')
        }
        const voiceCorrelationId = window.__TATVA_VOICE_SESSION_ID;
        if (voiceCorrelationId && shouldAttachVoiceCorrelationId(config)) {
            config.headers['x-correlation-id'] = voiceCorrelationId;
        }
        return config;
    },
    (error) => {
        // Do something with request error here
        // notification.error({ key: "notification_key", message: error.response.data.error })
        return Promise.reject(error);
    }
);

// Response interceptor
instance.interceptors.response.use(
    (response) => {
        if (isVoiceEndpointRequest(response?.config)) {
            window.__TATVA_VOICE_API_LAST_ERROR_MESSAGE = '';
            window.__TATVA_VOICE_API_LAST_RETRY_ATTEMPT = response?.config?.__retryCount || 0;
            if (isVoiceDigitizeRequest(response?.config)) {
                window.__TATVA_VOICE_API_LAST_DIGITIZE_RETRY_ATTEMPT = response?.config?.__retryCount || 0;
            }
            const responsePayload = response?.data || {};
            const latestVoiceUploadUrl = responsePayload?.prescriptionUrl
                || responsePayload?.voice_prescription_url
                || responsePayload?.audioUrl
                || responsePayload?.audio_url
                || responsePayload?.url
                || responsePayload?.data?.prescriptionUrl
                || responsePayload?.data?.voice_prescription_url
                || responsePayload?.data?.audioUrl
                || responsePayload?.data?.audio_url
                || responsePayload?.data?.url
                || '';
            if (latestVoiceUploadUrl) {
                window.__TATVA_VOICE_API_LAST_UPLOAD_URL = latestVoiceUploadUrl;
            }
        }
        // You can modify the response data here
        if (response.data)
            return response.data;
        return response
    },
    async (error) => {
        // You can handle errors globally here
        const originalRequest = error?.config || {};
        const retryResponse = await applyRetryIfEligible(error, originalRequest);
        if (retryResponse) return retryResponse;

        let notificationParam = {
            message: ''
        }

        // Silently reject cancelled requests without showing a notification
        if (error?.code === 'ERR_CANCELED') {
            return Promise.reject(error);
        }

        // Check if error.response exists before accessing its properties
        if (!error.response) {
            // Handle network errors, CORS errors, or other non-HTTP errors
            notificationParam.message = error.message || 'Network Error'
            notificationParam.key = "notification_key"
            // notification.error(notificationParam)
            return Promise.reject(error);
        }

        // Remove token and redirect 
        if (error.response.status === 400 || error.response.status === 403) {
            notificationParam.message = 'Authentication Fail'
            notificationParam.description = 'Please login again'
            console.log('Entry Route')
            return Promise.reject(error);
        }

        if (error.response.status === 404) {
            notificationParam.message = 'Not Found'
        }

        if (error.response.status === 500) {
            notificationParam.message = 'Internal Server Error'
        }

        if (error.response.status === 502) {
            notificationParam.message = 'Bad Gateway'
        }

        if (error.response.status === 508) {
            notificationParam.message = 'Time Out'
        }

        if (error.response.status === 401) {
            const isSnapRxMobileUploadPath = window.location?.pathname?.includes('snap-rx/mobile-upload');
            const isOphthalSnapRxMobileUploadPath = window.location?.pathname?.includes('ophthal-snap-rx/mobile-upload');
            if (
                !isSnapRxMobileUploadPath &&
                !isOphthalSnapRxMobileUploadPath &&
                !error?.request?.responseURL.startsWith(main_config.zydus_proxy_url) &&
                !error?.request?.responseURL.startsWith(main_config.snap_rx_api_url)
            ) {
                notificationParam.message = 'Authentication Fail'
                notificationParam.description = 'Please login again'
                // Clear localStorage before redirecting
                localStorage.removeItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
            }
        }

        notificationParam.key = "notification_key"
        if (error.response.status !== 404 && error.response.status !== 400 && error.response.status !== 401 && error.response.status !== 429) {
            // notification.error(notificationParam)
        }
        return Promise.reject(error);
    }
);

export default instance;
