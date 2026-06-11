import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiFundusTemplates from "../api/services/ApiFundusTemplates";

const initialState = {
  templates: [],
  loading: false,
  error: null,
};

export const addFundusTemplate = createAsyncThunk(
  "fundusTemplates/addTemplate",
  async (template) => {
    const result = await ApiFundusTemplates.addTemplate(template);
    if (result.status) {
      return ApiFundusTemplates.normalizeTemplate(result.data);
    }
    throw Error(result.error);
  }
);

export const updateFundusTemplate = createAsyncThunk(
  "fundusTemplates/updateTemplate",
  async (template) => {
    const result = await ApiFundusTemplates.updateTemplate(template);
    if (result.status) {
      return ApiFundusTemplates.normalizeTemplate(result.data);
    }
    throw Error(result.error);
  }
);

export const deleteFundusTemplate = createAsyncThunk(
  "fundusTemplates/deleteTemplate",
  async (templateId) => {
    const result = await ApiFundusTemplates.deleteTemplate(templateId);
    if (result.status) {
      return ApiFundusTemplates.normalizeTemplate(result.data || { tft_id: templateId });
    }
    throw Error(result.error);
  }
);

export const getFundusTemplates = createAsyncThunk(
  "fundusTemplates/getTemplates",
  async () => {
    const result = await ApiFundusTemplates.listTemplates();
    if (result.status) {
      return ApiFundusTemplates.normalizeTemplates(result.data || []);
    }
    throw Error(result.error);
  }
);

const fundusTemplateSlice = createSlice({
  name: "fundusTemplates",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(addFundusTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(addFundusTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.templates.unshift(action.payload);
      })
      .addCase(addFundusTemplate.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateFundusTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateFundusTemplate.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.templates.findIndex(
          (template) => template.tft_id === action.payload.tft_id
        );
        if (index !== -1) {
          state.templates[index] = action.payload;
        }
      })
      .addCase(updateFundusTemplate.rejected, (state) => {
        state.loading = false;
      })
      .addCase(deleteFundusTemplate.pending, (state, action) => {
        state.templates = state.templates.map((template) =>
          template.tft_id === action.meta.arg ? { ...template, loading: true } : template
        );
      })
      .addCase(deleteFundusTemplate.fulfilled, (state, action) => {
        const templateId = action.payload?.tft_id ?? action.meta?.arg;
        state.templates = state.templates.filter(
          (template) => template.tft_id !== templateId
        );
      })
      .addCase(deleteFundusTemplate.rejected, (state, action) => {
        state.templates = state.templates.map((template) =>
          template.tft_id === action.meta.arg ? { ...template, loading: false } : template
        );
      })
      .addCase(getFundusTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(getFundusTemplates.rejected, (state) => {
        state.templates = [];
      });
  },
});

export default fundusTemplateSlice.reducer;
