import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiCaseManager from "../api/services/ApiCaseManager";

const initialState = {
  selectedAdviceList: [],
  templates: [],
  loading: false,
  error: null,
};

export const addFollowupTemplate = createAsyncThunk(
  "followUp/addFollowupTemplate",
  async (template) => {
    let result = {};
    result = await ApiCaseManager.addFollowupTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const editFollowupTemplate = createAsyncThunk(
  "followUp/editFollowupTemplate",
  async (template) => {
    const result = await ApiCaseManager.editFollowupTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const deleteFollowupTemplate = createAsyncThunk(
  "followUp/deleteFollowupTemplate",
  async (templateId) => {
    const result = await ApiCaseManager.deleteFollowupTemplate(templateId);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const listFollowupTemplate = createAsyncThunk(
  "followUp/listFollowupTemplate",
  async () => {
    let result = {};
    result = await ApiCaseManager.listFollowupTemplate();
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

const followUpSlice = createSlice({
  name: "followUp",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(addFollowupTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(addFollowupTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedAdviceList = action.payload;
        state.templates.unshift(action.payload);
      })
      .addCase(addFollowupTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(editFollowupTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(editFollowupTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedAdviceList = action.payload;
        const index = state.templates.findIndex(
          (e) => e.tmftm_id == action.payload.tmftm_id
        );
        if (index !== -1) {
          state.templates[index] = action.payload;
        }
      })
      .addCase(editFollowupTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(deleteFollowupTemplate.pending, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tmftm_id == action.meta.arg ? { ...e, loading: true } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(deleteFollowupTemplate.fulfilled, (state, action) => {
        const result = state.templates.filter(
          (item) => item.tmftm_id !== action.payload.tmftm_id
        );
        state.templates = [...result];
      })
      .addCase(deleteFollowupTemplate.rejected, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tmftm_id == action.meta.arg ? { ...e, loading: false } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(listFollowupTemplate.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(listFollowupTemplate.rejected, (state, action) => {
        state.templates = [];
      });
  },
});

export default followUpSlice.reducer;