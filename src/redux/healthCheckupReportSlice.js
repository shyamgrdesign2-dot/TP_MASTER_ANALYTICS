import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { message } from "antd";
import ApiHealthCheckupReport from "../api/services/ApiHealthCheckupReport";
import ApiCaseManager from "../api/services/ApiCaseManager";

const initialState = {
    reports: [],              // List of reports for current patient
    currentReport: null,      // Currently open/editing report (full document)
    editingReportId: null,    // UUID of report being edited (null = new report)
    loading: false,           // List loading
    saving: false,            // Save in progress
    error: null,
    healthReportConsultations: null,
    healthReportConsultationsLoading: false,
};

/**
 * Fetch list of health checkup reports for a patient
 */
export const fetchHealthCheckupReports = createAsyncThunk(
    "healthCheckupReport/fetchReports",
    async (patientId, { rejectWithValue }) => {
        try {
            const result = await ApiHealthCheckupReport.listReports(patientId);

            if (result.data) {
                return result.data;
            } else {
                throw new Error(result.error || "Failed to fetch reports");
            }
        } catch (error) {
            return rejectWithValue(error.message || "Failed to fetch reports");
        }
    }
);

/**
 * Fetch single health checkup report by ID
 */
export const fetchHealthCheckupReportById = createAsyncThunk(
    "healthCheckupReport/fetchReportById",
    async ({ id, patientId }, { rejectWithValue }) => {
        try {
            const result = await ApiHealthCheckupReport.getReportById({ id, patientId });
            if (result.status) {
                return result.data;
            } else {
                throw new Error(result.error || "Failed to fetch report");
            }
        } catch (error) {
            return rejectWithValue(error.message || "Failed to fetch report");
        }
    }
);

/**
 * Save (create or update) health checkup report
 */
export const saveHealthCheckupReport = createAsyncThunk(
    "healthCheckupReport/saveReport",
    async ({ id, patientId, html, thumbnail_file }, { rejectWithValue }) => {
        try {
            const payload = id
                ? { id, patientId, html, thumbnail_file }
                : { patientId, html, thumbnail_file };
            const result = await ApiHealthCheckupReport.upsertReport(payload);
            if (result.id || result.status) {
                message.success(id ? "Report updated successfully" : "Report created successfully");
                return { ...(result.data ?? result), isNew: !id };
            } else {
                throw new Error(result.error || "Failed to save report");
            }
        } catch (error) {
            message.error(error.message || "Failed to save report");
            return rejectWithValue(error.message || "Failed to save report");
        }
    }
);

/**
 * Delete health checkup report
 */
export const deleteHealthCheckupReport = createAsyncThunk(
    "healthCheckupReport/deleteReport",
    async ({ id, patientId }, { rejectWithValue }) => {
        try {
            const result = await ApiHealthCheckupReport.deleteReport({ id, patientId });
            if (result.status) {
                message.success("Report deleted successfully");
                return id;
            } else {
                throw new Error(result.error || "Failed to delete report");
            }
        } catch (error) {
            message.error(error.message || "Failed to delete report");
            return rejectWithValue(error.message || "Failed to delete report");
        }
    }
);

/**
 * Groups consultation data from viewCaseManager responses into report sections:
 * symptoms, medical_history, vitals, advice. Used for health check-up report.
 */
function groupConsultationsBySections(consultationsList) {
    const grouped = {
        symptoms: [],
        medical_history: [],
        vitals: [],
        advice: [],
        consultations: consultationsList,
    };
    (consultationsList || []).forEach((consultation) => {
        const tcmId = consultation?.tcm_id;
        const consultationDate = consultation?.consultation_date;
        const source = { tcm_id: tcmId, consultation_date: consultationDate };

        if (Array.isArray(consultation?.symptoms)) {
            consultation.symptoms.forEach((item) => {
                grouped.symptoms.push({ ...source, ...(typeof item === "object" ? item : { value: item }) });
            });
        }
        if (consultation?.medical_history != null) {
            const hist = consultation.medical_history;
            grouped.medical_history.push({
                ...source,
                data: hist,
            });
        }
        if (Array.isArray(consultation?.vitals)) {
            consultation.vitals.forEach((item) => {
                grouped.vitals.push({ ...source, ...(typeof item === "object" ? item : { value: item }) });
            });
        }
        if (Array.isArray(consultation?.advice)) {
            consultation.advice.forEach((item) => {
                grouped.advice.push({ ...source, ...(typeof item === "object" ? item : { value: item }) });
            });
        }
    });
    return grouped;
}

/**
 * Fetches recent consultations for health check-up report: getRecentConsultations
 * → take latest 7 tcm_ids → viewCaseManager for each → group by sections.
 * Returns { symptoms, medical_history, vitals, advice, consultations }.
 */
export const fetchConsultationsForHealthReport = createAsyncThunk(
    "healthCheckupReport/fetchConsultationsForHealthReport",
    async (patient_unique_id, { rejectWithValue }) => {
        try {
            const recentRes = await ApiCaseManager.getRecentConsultations(patient_unique_id);
            if (!recentRes?.tcm_ids) {
                throw new Error(recentRes?.error || "Failed to fetch recent consultations");
            }
            const tcmIds = recentRes?.data?.tcm_ids ?? recentRes?.tcm_ids ?? [];
            const latestSeven = (Array.isArray(tcmIds) ? tcmIds : []).slice(0, 7);

            const consultationPromises = latestSeven.map((tcm_id) =>
                ApiCaseManager.viewCaseManager({ patient_unique_id, tcm_id })
            );
            const results = await Promise.allSettled(consultationPromises);

            const consultationsList = results
                .filter((r) => r.status === "fulfilled" && r.value?.status && r.value?.data)
                .map((r) => ({ ...r.value.data, patient_unique_id }));

            return groupConsultationsBySections(consultationsList);
        } catch (error) {
            const errorObj = {
                message: error?.message || "Failed to fetch consultations",
                status: error?.status || error?.response?.status,
                details: error?.response?.data || error,
            };
            return rejectWithValue(errorObj);
        }
    }
);

const healthCheckupReportSlice = createSlice({
    name: "healthCheckupReport",
    initialState,
    reducers: {
        // Set the report being edited (for opening editor in edit mode)
        setEditingReport: (state, action) => {
            state.currentReport = action.payload.report;
            state.editingReportId = action.payload.id;
        },
        // Clear editing state (when closing editor)
        clearEditingReport: (state) => {
            state.currentReport = null;
            state.editingReportId = null;
        },
        // Clear error
        clearError: (state) => {
            state.error = null;
        },
        // Reset the entire state (used when patient changes)
        resetHealthCheckupState: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            // Fetch reports list
            .addCase(fetchHealthCheckupReports.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchHealthCheckupReports.fulfilled, (state, action) => {
                state.loading = false;
                state.reports = action.payload || [];
            })
            .addCase(fetchHealthCheckupReports.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Fetch single report
            .addCase(fetchHealthCheckupReportById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchHealthCheckupReportById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentReport = action.payload;
            })
            .addCase(fetchHealthCheckupReportById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Save report
            .addCase(saveHealthCheckupReport.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(saveHealthCheckupReport.fulfilled, (state, action) => {
                state.saving = false;
                state.currentReport = action.payload;
                state.editingReportId = null;
            })
            .addCase(saveHealthCheckupReport.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload;
            })

            // Delete report
            .addCase(deleteHealthCheckupReport.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteHealthCheckupReport.fulfilled, (state, action) => {
                state.loading = false;
                // Remove deleted report from list
                state.reports = state.reports.filter(report => report.id !== action.payload);
            })
            .addCase(deleteHealthCheckupReport.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Fetch consultations
            .addCase(fetchConsultationsForHealthReport.pending, (state) => {
                state.healthReportConsultationsLoading = true;
                state.healthReportConsultations = null;
            })
            .addCase(fetchConsultationsForHealthReport.fulfilled, (state, action) => {
                state.healthReportConsultationsLoading = false;
                state.healthReportConsultations = action.payload;
            })
            .addCase(fetchConsultationsForHealthReport.rejected, (state) => {
                state.healthReportConsultationsLoading = false;
                state.healthReportConsultations = null;
            });
    },
});

export const { setEditingReport, clearEditingReport, clearError, resetHealthCheckupState } = healthCheckupReportSlice.actions;

export default healthCheckupReportSlice.reducer;
