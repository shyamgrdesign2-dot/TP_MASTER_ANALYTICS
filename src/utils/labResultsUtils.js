import moment from 'moment';
import { env } from '../EnvironmentConfig';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from './constants';

// ----- Lab result API (GET today's results) -----

function formatResultsFromApiResponse(results) {
  if (!Array.isArray(results) || results.length === 0) return [];
  const formattedResults = [];
  const seenTests = new Set();
  results.forEach((result) => {
    (result.inputs || []).forEach((input) => {
      if (!input?.testName || input.testName === 'Remarks') return;
      const testKey = `${input.testName}`.toLowerCase().trim();
      if (seenTests.has(testKey)) return;
      const value = input.value != null ? String(input.value).trim() : '';
      if (!value) return;
      const units = input.units?.trim();
      let displayValue = value;
      if (units && !value.toLowerCase().includes(units.toLowerCase())) {
        displayValue = `${value} ${units}`.trim();
      }
      formattedResults.push({
        testname: input.testName,
        testName: input.testName,
        value: displayValue,
        reportName: input.reportName || result.reportName || '',
        units: units || '',
        refRange: input.refRange || null,
      });
      seenTests.add(testKey);
    });
  });
  return formattedResults;
}

/**
 * Fetches today's lab results from lab parameters API.
 * GET /api/v1/lab-parameters/results/{patient_unique_id} (optional ?today=true)
 * @param {Object} patient_data - Patient data with patient_unique_id
 * @param {boolean} todayOnly - If true, appends ?today=true to request
 * @returns {Promise<Array|null>} Formatted lab results or null
 */
export const getTodayLabResults = async (patient_data, todayOnly = false) => {
  if (!patient_data?.patient_unique_id) {
    return null;
  }
  try {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    const cleanedToken = token
      ? token.trim().replace(/^["']+|["']+$/g, '')
      : '';
    const baseUrl = env.lab_params_api_url;
    if (!cleanedToken || !baseUrl) {
      return null;
    }

    const url = todayOnly
      ? `${baseUrl}/api/v1/lab-parameters/results/${patient_data.patient_unique_id}?today=true`
      : `${baseUrl}/api/v1/lab-parameters/results/${patient_data.patient_unique_id}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${cleanedToken}` } });
    if (!response.ok) {
      return null;
    }
    const labData = await response.json();
    const allResults = labData?.data?.results || [];
    if (allResults.length === 0) {
      return null;
    }

    const today = moment().format('YYYY-MM-DD');
    const todayResults = todayOnly ? allResults : allResults.filter((result) => {
      const resultDate = result.createdAt || result.created_at || result.createdDate || result.date;
      return resultDate && moment(resultDate).format('YYYY-MM-DD') === today;
    });
    if (todayResults.length === 0) {
      return null;
    }

    const formatted = formatResultsFromApiResponse(todayResults);
    return formatted.length > 0 ? formatted : null;
  } catch (error) {
    console.error('Error fetching today lab results:', error);
    return null;
  }
};

/**
 * GET /api/v1/lab-parameters/results/{patientId}?today=true - for end visit and display when only backend has today's data.
 */
export const fetchLabResultsTodayOnly = async (patient_data) => {
  return getTodayLabResults(patient_data, true);
};

// ----- Lab search API (match testName + reportName) -----

/**
 * For each lab result, calls GET /api/v1/lab-parameters?search={testName}
 * and maps to first result's testName + reportName.
 * @param {Array} labResults - Array of { testname, value } (or testName, name)
 * @returns {Promise<Array>} Array with testName and reportName filled from search API
 */
export const matchLabResultsWithApi = async (labResults = []) => {
  if (!Array.isArray(labResults) || labResults.length === 0) return [];
  try {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    // const cleanedToken = token ? token.replace(/['"]+ /g, '') : '';
    const cleanedToken = token
    ? token.trim().replace(/^"+|"+$/g, '')
    : '';
    const baseUrl = env.lab_params_api_url;
    if (!cleanedToken || !baseUrl) return [];

    const matchedResults = [];
    for (const result of labResults) {
      const originalTestName = (result.testname || result.testName || result.name || '').trim();
      if (!originalTestName) continue;
      try {
        const searchQuery = encodeURIComponent(originalTestName);
        const response = await fetch(
          `${baseUrl}/api/v1/lab-parameters?search=${searchQuery}`,
          { headers: { Authorization: `Bearer ${cleanedToken}` } }
        );
        let matchedTest = null;
        if (response.ok) {
          const searchData = await response.json();
          const apiResults = Array.isArray(searchData) ? searchData : searchData?.data || [];
          if (Array.isArray(apiResults) && apiResults.length > 0) {
            matchedTest = apiResults[0];
          }
        }
        if (matchedTest?.testName && matchedTest?.reportName) {
          const apiTestName = matchedTest.testName.trim();
          const apiReportName = matchedTest.reportName.trim();
          matchedResults.push({
            ...result,
            testname: apiTestName,
            testName: apiTestName,
            name: apiTestName,
            reportName: apiReportName,
            value: result.value ?? result.testValue ?? '',
            units: matchedTest.units || result.units || '',
            refRange: matchedTest.refRange ?? result.refRange ?? null,
          });
        }
      } catch (error) {
        // skip this result
      }
    }
    return matchedResults;
  } catch (error) {
    return [];
  }
};

// ----- Value parsing (shared by LabParams prefill and API payload) -----

/**
 * Extracts units from a value string (e.g. "13.5 g/dL" -> "g/dL", "12 %" -> "%").
 * @param {string} valueStr - Display value, may include units
 * @returns {string} Units part, or ""
 */
export function extractUnitsFromValue(valueStr = '') {
  if (!valueStr) return '';
  const str = String(valueStr).trim();
  const match = str.match(/^\d+(?:\.\d+)?\s+(.+)$/);
  if (match) return match[1].trim();
  const percentMatch = str.match(/^\d+(?:\.\d+)?(%|percent)$/i);
  if (percentMatch) return percentMatch[1];
  return '';
}

/**
 * Returns value without units for API: numeric part only (e.g. "61 mg/dL" -> "61", "12.5" -> "12.5").
 * @param {string} valueStr - Display value, may include units
 * @returns {string} Value to send to backend (numeric only)
 */
export function valueWithoutUnitsForApi(valueStr) {
  if (valueStr == null || valueStr === '') return '';
  const str = String(valueStr).trim();
  const match = str.match(/^(\d+(?:\.\d+)?)/);
  return match ? match[1] : str;
}

// ----- Prescription to POST payload (for Save/End Visit) -----

/**
 * Converts Rx pad lab results to POST /api/v1/lab-parameters/results body format.
 * Returns results array: [ { date, inputs: [ { reportName, testName, value, units, ... } ] } ]
 * Value sent to backend is numeric only (no units in value field).
 * @param {Array} labResults - Array of { testname, value, reportName, units, ... }
 * @param {string} dateStr - Optional date (YYYY-MM-DD). Defaults to today.
 * @returns {Array} results array for API
 */
export function prescriptionLabResultsToResultsArray(labResults, dateStr = null) {
  if (!Array.isArray(labResults) || labResults.length === 0) return [];
  const date = dateStr || moment().format('YYYY-MM-DD');
  const inputs = [];
  const seen = new Set();
  labResults.forEach((result) => {
    const testName = (result.testName || result.testname || result.name || '').trim();
    const reportName = (result.reportName || '').trim();
    if (!testName || !reportName) return;
    const key = `${reportName}|${testName}`;
    if (seen.has(key)) return;
    seen.add(key);
    const rawValue = result.value != null ? String(result.value).trim() : '';
    if (!rawValue) return;
    const value = valueWithoutUnitsForApi(rawValue);
    const units = (result.units || '').trim();
    inputs.push({
      reportName,
      testName,
      value,
      units: units || undefined,
      arrowDirection: result.arrowDirection || '',
      refRange: result.refRange ?? null,
      recentlyUpdated: true,
    });
  });
  if (inputs.length === 0) return [];
  return [{ date, inputs }];
}
