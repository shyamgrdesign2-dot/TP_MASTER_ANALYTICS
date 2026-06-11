import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiAdvice from "../api/services/ApiAdvice";

const initialState = {
  selectedAdviceList: [],
  parentOptionsList: [],
  childOptionsList: [],
  templates: [],
  loading: false,
  error: null,
  errorObj: { visible: false, message: '' },
};

export const addTemplate = createAsyncThunk(
  "advice/addTemplate",
  async (template) => {
    let result = {};
    result = await ApiAdvice.addTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const updateTemplate = createAsyncThunk(
  "advice/updateTemplate",
  async (template) => {
    const result = await ApiAdvice.updateTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  "advice/deleteTemplate",
  async (templateId) => {
    const result = await ApiAdvice.deleteTemplate(templateId);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getAdviceTemplates = createAsyncThunk(
  "advice/getAdviceTemplates",
  async () => {
    let result = {};
    result = await ApiAdvice.getAdviceTemplates();
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getFrequentlySearchedAdvice = createAsyncThunk(
  "advice/getFrequentlySearchedAdvice",
  async (_, { rejectWithValue }) => {
    try {
      const result = await ApiAdvice.getFrequentlySearchedAdvice();
      return result;
    } catch (error) {
      return rejectWithValue({ visible: false, message: error.response.data.message });
    }
  }
);

export const searchAdvice = createAsyncThunk(
  "advice/searchAdvice",
  async (data, { rejectWithValue }) => {
    try {
      const result = await ApiAdvice.searchAdvice(data.searchQuery);
      return result;
    } catch (error) {
      return rejectWithValue({ visible: false, message: error.response.data.message });
    }
  }
);

const adviceSlice = createSlice({
  name: "advice",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(addTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(addTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedAdviceList = action.payload.advices;
        state.templates.unshift(action.payload);
      })
      .addCase(addTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(updateTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedAdviceList = action.payload.advices;
        const index = state.templates.findIndex(
          (e) => e.tat_id == action.payload.tat_id
        );
        if (index !== -1) {
          state.templates[index] = action.payload;
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(deleteTemplate.pending, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tat_id == action.meta.arg ? { ...e, loading: true } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        const result = state.templates.filter(
          (item) => item.tat_id !== action.payload.tat_id
        );
        state.templates = [...result];
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tat_id == action.meta.arg ? { ...e, loading: false } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(getAdviceTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(getAdviceTemplates.rejected, (state, action) => {
        state.templates = [];
      })
      .addCase(getFrequentlySearchedAdvice.fulfilled, (state, action) => {
        state.parentOptionsList = action.payload;
      })
      .addCase(getFrequentlySearchedAdvice.rejected, (state, action) => {
        state.parentOptionsList = [];
      })
      .addCase(searchAdvice.pending, (state) => { })
      .addCase(searchAdvice.fulfilled, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = action.payload;
        } else {
          state.childOptionsList = action.payload;
        }
      })
      .addCase(searchAdvice.rejected, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = [];
        } else {
          state.childOptionsList = [];
        }
      });
  },
});

export default adviceSlice.reducer;