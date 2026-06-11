import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiCaseManager from "../api/services/ApiCaseManager";

const initialState = {
    templates: [],
    viewCaseManagerData: null,
    loading: false,
    loadingEndVisit: false,
    error: null,
    consultations: [],
};

export const oneClickAddTemplate = createAsyncThunk(
    "caseManager/oneClickAddTemplate",
    async (template) => {
        let result = {};
        result = await ApiCaseManager.oneClickAddTemplate(template);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const oneClickUpdateTemplate = createAsyncThunk(
    "caseManager/oneClickUpdateTemplate",
    async (template) => {
        const result = await ApiCaseManager.oneClickUpdateTemplate(template);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const oneClickDeleteTemplate = createAsyncThunk(
    "caseManager/oneClickDeleteTemplate",
    async (templateId) => {
        const result = await ApiCaseManager.oneClickDeleteTemplate(templateId);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const oneClickTemplatesList = createAsyncThunk(
    "caseManager/oneClickTemplatesList",
    async () => {
        let result = {};
        result = await ApiCaseManager.oneClickTemplatesList();
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const oneClickSingleTemplateDetails = createAsyncThunk(
    "caseManager/oneClickSingleTemplateDetails",
    async (templateId) => {
        let result = {};
        result = await ApiCaseManager.oneClickSingleTemplateDetails(templateId);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const addCaseManager = createAsyncThunk(
    "caseManager/addCaseManager",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.addCaseManager(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const editCaseManager = createAsyncThunk(
    "caseManager/editCaseManager",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.editCaseManager(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const viewCaseManager = createAsyncThunk(
    "caseManager/viewCaseManager",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.viewCaseManager(data);
        if (result.status) {
            result.data.patient_data["patient_unique_id"] = data.patient_unique_id;
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const sendCashsheetWhatsapp = createAsyncThunk(
    "caseManager/sendCashsheetWhatsapp",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.sendCashsheetWhatsapp(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const getSmartRxToken = createAsyncThunk(
    "/casemanager/smartrx/token",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.getSmartRxToken(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const getSmartRx = createAsyncThunk(
    "caseManager/smartrx",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.getSmartRx(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const saveSmartRx = createAsyncThunk(
    "caseManager/smartrx",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.saveSmartRx(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const sendSmartRxLinkOnWhatsapp = createAsyncThunk(
    "caseManager/smartrx/send",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.sendSmartRxLinkOnWhatsapp(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const getInvestigationAndMedicine = createAsyncThunk(
    "caseManager/getInvestigationAndMedicine",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.getInvestigationAndMedicine(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const orderMedicineAndInvestigation = createAsyncThunk(
    "caseManager/orderMedicineAndInvestigation",
    async (data) => {
        try {
            const result = await ApiCaseManager.orderMedicineAndInvestigation(data);
            if (result?.status === false) {
                return {
                    status: false,
                    message: result?.error || result?.message || "orderMedicineAndInvestigation failed",
                };
            }
            return {
                status: true,
                data: result?.data ?? result,
            };
        } catch (error) {
            return {
                status: false,
                message: error?.message || "orderMedicineAndInvestigation exception",
            };
        }
    }
);

export const listConsultations = createAsyncThunk(
    "caseManager/listConsultations",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.listConsultations(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const draftToConsultation = createAsyncThunk(
    "caseManager/draftToConsultation",
    async (data) => {
        let result = {};
        result = await ApiCaseManager.draftToConsultation(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

const caseManagerSlice = createSlice({
    name: "caseManager",
    initialState,
    reducers: {
        resetViewCaseManagerData: (state) => {
            state.viewCaseManagerData = null;
        },
        resetConsultations: (state) => {
            state.consultations = [];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(oneClickAddTemplate.pending, (state) => {
                state.loading = true;
            })
            .addCase(oneClickAddTemplate.fulfilled, (state, action) => {
                state.loading = false;
                state.templates.unshift(action.payload.template);
            })
            .addCase(oneClickAddTemplate.rejected, (state, action) => {
                state.loading = false;
            })
            .addCase(oneClickUpdateTemplate.pending, (state) => {
                state.loading = true;
            })
            .addCase(oneClickUpdateTemplate.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.templates.findIndex(
                    (e) => e.tmoc_id == action.payload.template.tmoc_id
                );
                if (index !== -1) {
                    state.templates[index] = action.payload.template;
                }
            })
            .addCase(oneClickUpdateTemplate.rejected, (state, action) => {
                state.loading = false;
            })
            .addCase(oneClickDeleteTemplate.pending, (state, action) => {
                const updatedData = state.templates.map((e) =>
                    e.tmoc_id == action.meta.arg ? { ...e, loading: true } : e
                );
                state.templates = [...updatedData];
            })
            .addCase(oneClickDeleteTemplate.fulfilled, (state, action) => {
                const result = state.templates.filter(
                    (item) => item.tmoc_id !== action.payload.tmoc_id
                );
                state.templates = [...result];
            })
            .addCase(oneClickDeleteTemplate.rejected, (state, action) => {
                const updatedData = state.templates.map((e) =>
                    e.tmoc_id == action.meta.arg ? { ...e, loading: false } : e
                );
                state.templates = [...updatedData];
            })
            .addCase(oneClickTemplatesList.fulfilled, (state, action) => {
                state.templates = action.payload;
            })
            .addCase(oneClickTemplatesList.rejected, (state, action) => {
                state.templates = [];
            })
            .addCase(addCaseManager.pending, (state) => {
                state.loading = true;
            })
            .addCase(addCaseManager.fulfilled, (state, action) => {
                state.loading = false;
            })
            .addCase(addCaseManager.rejected, (state) => {
                state.loading = false;
            })
            .addCase(editCaseManager.pending, (state) => {
                state.loading = true;
            })
            .addCase(editCaseManager.fulfilled, (state, action) => {
                state.loading = false;
            })
            .addCase(editCaseManager.rejected, (state) => {
                state.loading = false;
            })
            .addCase(viewCaseManager.pending, (state, action) => {
                if (action.meta.arg.configurePrintSetting === undefined) {
                    state.loading = true
                }
            })
            .addCase(viewCaseManager.fulfilled, (state, action) => {
                if (action.meta.arg.configurePrintSetting === undefined) {
                    state.loading = false;
                }
                state.viewCaseManagerData = action.payload;
            })
            .addCase(viewCaseManager.rejected, (state, action) => {
                if (action.meta.arg.configurePrintSetting === undefined) {
                    state.loading = false;
                }
                state.viewCaseManagerData = null;
            })
            .addCase(sendCashsheetWhatsapp.pending, (state) => {
                state.loadingEndVisit = true;
            })
            .addCase(sendCashsheetWhatsapp.fulfilled, (state) => {
                state.loadingEndVisit = false;
            })
            .addCase(sendCashsheetWhatsapp.rejected, (state) => {
                state.loadingEndVisit = false;
            })
            .addCase(getSmartRxToken.pending, (state) => {
                state.loadingEndVisit = true;
            })
            .addCase(getSmartRxToken.fulfilled, (state) => {
                state.loadingEndVisit = false;
            })
            .addCase(getSmartRxToken.rejected, (state) => {
                state.loadingEndVisit = false;
            })
            .addCase(listConsultations.pending, (state) => {
                state.loading = true;
            })
            .addCase(listConsultations.fulfilled, (state, action) => {
                state.loading = false;
                state.consultations = action.payload;
            })
            .addCase(listConsultations.rejected, (state) => {
                state.loading = false;
            })
    },
});

export const { resetViewCaseManagerData, resetConsultations } = caseManagerSlice.actions;

export default caseManagerSlice.reducer;