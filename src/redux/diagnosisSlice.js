import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiDiagnosis from "../api/services/ApiDiagnosis";

const initialState = {
  selectedDiagnosisList: [],
  parentOptionsList: [],
  childOptionsList: [],
  templates: [],
  loading: false,
  error: null,
  errorObj: { visible: false, message: '' },
};

export const addTemplate = createAsyncThunk(
  "diagnosis/addTemplate",
  async (template) => {
    let result = {};
    result = await ApiDiagnosis.addTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const updateTemplate = createAsyncThunk(
  "diagnosis/updateTemplate",
  async (template) => {
    const result = await ApiDiagnosis.updateTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  "diagnosis/deleteTemplate",
  async (templateId) => {
    const result = await ApiDiagnosis.deleteTemplate(templateId);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getDiagnosisTemplates = createAsyncThunk(
  "diagnosis/getDiagnosisTemplates",
  async () => {
    let result = {};
    result = await ApiDiagnosis.getDiagnosisTemplates();
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getFrequentlySearchedDiagnosis = createAsyncThunk(
  "diagnosis/getFrequentlySearchedDiagnosis",
  async (_, { rejectWithValue }) => {
    try {
      const result = await ApiDiagnosis.getFrequentlySearchedDiagnosis();
      return result;
    } catch (error) {
      return rejectWithValue({ visible: false, message: error.response.data.message });
    }
  }
);

export const searchDiagnosis = createAsyncThunk(
  "diagnosis/searchDiagnosis",
  async (data, { rejectWithValue }) => {
    try {
      const result = await ApiDiagnosis.searchDiagnosis(data.searchQuery);
      return result;
    } catch (error) {
      return rejectWithValue({ visible: false, message: error.response.data.message });
    }
  }
);

export const singleTemplateDetails = createAsyncThunk(
  "diagnosis/singleTemplateDetails",
  async (templateId) => {
    const result = await ApiDiagnosis.singleTemplateDetails(templateId);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getLoadPreviousDiagnosis = createAsyncThunk(
  "diagnosis/getLoadPreviousDiagnosis",
  async (data) => {
    let result = {};
    result = await ApiDiagnosis.getLoadPreviousDiagnosis(data);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

const diagnosisSlice = createSlice({
  name: "diagnosis",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(addTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(addTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSymptomsList = action.payload.diagnosis;

        const { tdt_id, tdt_template_name, diagnosis } = action.payload
        state.templates.unshift({ tdt_id: tdt_id, tdt_template_name: tdt_template_name, diagnosis: diagnosis.map((e) => e.tds_name).join(', ') });
      })
      .addCase(addTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(updateTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedDiagnosisList = action.payload.diagnosis;
        const index = state.templates.findIndex(
          (e) => e.tdt_id == action.payload.tdt_id
        );
        if (index !== -1) {
          const { tdt_id, tdt_template_name, diagnosis } = action.payload
          state.templates[index] = { tdt_id: tdt_id, tdt_template_name: tdt_template_name, diagnosis: diagnosis.map((e) => e.tds_name).join(', ') };
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(deleteTemplate.pending, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tdt_id == action.meta.arg ? { ...e, loading: true } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        const result = state.templates.filter(
          (item) => item.tdt_id !== action.payload.tdt_id
        );
        state.templates = [...result];
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tdt_id == action.meta.arg ? { ...e, loading: false } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(getDiagnosisTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(getDiagnosisTemplates.rejected, (state, action) => {
        state.templates = [];
      })
      .addCase(getFrequentlySearchedDiagnosis.fulfilled, (state, action) => {
        state.parentOptionsList = action.payload;
      })
      .addCase(getFrequentlySearchedDiagnosis.rejected, (state, action) => {
        state.parentOptionsList = [];
      })
      .addCase(searchDiagnosis.pending, (state) => { })
      .addCase(searchDiagnosis.fulfilled, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = action.payload;
        } else {
          state.childOptionsList = action.payload;
        }
      })
      .addCase(searchDiagnosis.rejected, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = [];
        } else {
          state.childOptionsList = [];
        }
      });
  },
});

export default diagnosisSlice.reducer;
