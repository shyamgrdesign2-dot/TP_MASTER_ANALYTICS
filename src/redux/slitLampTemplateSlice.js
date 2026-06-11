import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiSlitLampTemplates from "../api/services/ApiSlitLampTemplates";

const initialState = {
  templates: [],
  loading: false,
  error: null,
};

export const addSlitLampTemplate = createAsyncThunk(
  "slitLampTemplates/addTemplate",
  async (template) => {
    const result = await ApiSlitLampTemplates.addTemplate(template);
    if (result.status) {
      return ApiSlitLampTemplates.normalizeTemplate(result.data);
    }
    throw Error(result.error);
  }
);

export const updateSlitLampTemplate = createAsyncThunk(
  "slitLampTemplates/updateTemplate",
  async (template) => {
    const result = await ApiSlitLampTemplates.updateTemplate(template);
    if (result.status) {
      return ApiSlitLampTemplates.normalizeTemplate(result.data);
    }
    throw Error(result.error);
  }
);

export const deleteSlitLampTemplate = createAsyncThunk(
  "slitLampTemplates/deleteTemplate",
  async (templateId) => {
    const result = await ApiSlitLampTemplates.deleteTemplate(templateId);
    if (result.status) {
      return ApiSlitLampTemplates.normalizeTemplate(result.data || { tsl_id: templateId });
    }
    throw Error(result.error);
  }
);

export const getSlitLampTemplates = createAsyncThunk(
  "slitLampTemplates/getTemplates",
  async () => {
    const result = await ApiSlitLampTemplates.listTemplates();
    if (result.status) {
      return ApiSlitLampTemplates.normalizeTemplates(result.data || []);
    }
    throw Error(result.error);
  }
);

const slitLampTemplateSlice = createSlice({
  name: "slitLampTemplates",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(addSlitLampTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(addSlitLampTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.templates.unshift(action.payload);
      })
      .addCase(addSlitLampTemplate.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateSlitLampTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateSlitLampTemplate.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.templates.findIndex(
          (template) => template.tsl_id === action.payload.tsl_id
        );
        if (index !== -1) {
          state.templates[index] = action.payload;
        }
      })
      .addCase(updateSlitLampTemplate.rejected, (state) => {
        state.loading = false;
      })
      .addCase(deleteSlitLampTemplate.pending, (state, action) => {
        state.templates = state.templates.map((template) =>
          template.tsl_id === action.meta.arg ? { ...template, loading: true } : template
        );
      })
      .addCase(deleteSlitLampTemplate.fulfilled, (state, action) => {
        const templateId = action.payload?.tsl_id ?? action.meta?.arg;
        state.templates = state.templates.filter(
          (template) => template.tsl_id !== templateId
        );
      })
      .addCase(deleteSlitLampTemplate.rejected, (state, action) => {
        state.templates = state.templates.map((template) =>
          template.tsl_id === action.meta.arg ? { ...template, loading: false } : template
        );
      })
      .addCase(getSlitLampTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(getSlitLampTemplates.rejected, (state) => {
        state.templates = [];
      });
  },
});

export default slitLampTemplateSlice.reducer;
