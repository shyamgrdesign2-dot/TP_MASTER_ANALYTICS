import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.growth_chart_api_url };

const ApiHealthCheckupReport = {};

/**
 * Create or update health checkup report (upsert)
 * @param {Object} data - { id?: string, patientId: number, document: object }
 * @returns {Promise}
 */
ApiHealthCheckupReport.upsertReport = function (data) {
    return api.post(`/api/v1/health-checkup-document`, data, baseUrl);
};

/**
 * Get single health checkup report by ID
 * @param {Object} params - { id: string, patientId: number }
 * @returns {Promise}
 */
ApiHealthCheckupReport.getReportById = function ({ id, patientId }) {
    return api.get(`/api/v1/health-checkup-document/getById?id=${encodeURIComponent(id)}&patientId=${encodeURIComponent(patientId)}`, baseUrl);
};

/**
 * Get list of all health checkup reports for a patient
 * @param {number} patientId
 * @returns {Promise}
 */
ApiHealthCheckupReport.listReports = function (patientId) {
    return api.get(`/api/v1/health-checkup-document/list?patientId=${encodeURIComponent(patientId)}`, baseUrl);
};

/**
 * Delete health checkup report
 * @param {Object} data - { id: string, patientId: number }
 * @returns {Promise}
 */
ApiHealthCheckupReport.deleteReport = function (data) {
    return api.delete(`/api/v1/health-checkup-document`, { data, ...baseUrl });
};

/**
 * Upload thumbnail image for health checkup report
 * @param {File} thumbnailFile - The thumbnail image file (JPEG/PNG)
 * @returns {Promise} - Returns { thumbnailUrl: string }
 */
ApiHealthCheckupReport.uploadThumbnail = function (thumbnailFile) {
    const formData = new FormData();
    formData.append('thumbnail_file', thumbnailFile);
    
    return api.post(`/api/v1/health-checkup-document/upload-thumbnail`, formData, {
        ...baseUrl,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

ApiHealthCheckupReport.getHealthCheckupDetails = function ({ id, patientId, token }) {
    return api.get(`/api/v1/health-checkup-pdf/healthCheckupDetails?id=${encodeURIComponent(id)}&patientId=${encodeURIComponent(patientId)}`, {
        ...baseUrl,
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
};

export default ApiHealthCheckupReport;
