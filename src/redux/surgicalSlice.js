import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiSurgical from "../api/services/ApiSurgical";

const initialState = {
  selectedSurgicalList: [],
  parentOptionsList: [],
  childOptionsList: [],
  templates: [],
  loading: false,
  error: null,
};

export const addTemplate = createAsyncThunk(
  "surgical/addTemplate",
  async (template) => {
    let result = {};
    result = await ApiSurgical.addTemplate(template);
    if (result) {
      return result;
    } else {
      throw Error(result.error);
    }
  }
);

export const updateTemplate = createAsyncThunk(
  "surgical/updateTemplate",
  async ({ template, templateId }) => {
    const result = await ApiSurgical.updateTemplate(template, templateId);
    if (result?.status) {
      return result.status;
    } else {
      throw Error(result.error);
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  "surgical/deleteTemplate",
  async (templateId) => {
    const result = await ApiSurgical.deleteTemplate(templateId);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getExaminationTemplates = createAsyncThunk(
  "surgery-templates/list",
  async () => {
    let result = {};
    result = await ApiSurgical.getExaminationTemplates();
    if (result?.length) {
      return result;
    } else {
      throw Error(result.error);
    }
  }
);

export const getFrequentlySearchedExamination = createAsyncThunk(
  "surgical/getFrequentlySearchedExamination",
  async () => {
    let result = {};
    result = await ApiSurgical.getFrequentlySearchedExamination();
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const searchExamination = createAsyncThunk(
  "surgeries/list",
  async (data) => {
    let result = {};
    result = await ApiSurgical.searchExamination(data.searchQuery);
    if (result?.length) {
      result = result.map((item) => {
        const { id, ...rest } = item;
        return { masterId: id, ...rest };
      });
      return result;
    } else {
      throw Error(result.error);
    }
  }
);

export const createSurgery = async (template) => {
  let result = {};
    result = await ApiSurgical.createSurgery(template);
  if (result?.id) {
    return result.id;
  } else {
    throw Error(result.error);
  }
};

const surgicalSlice = createSlice({
  name: "surgical",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(addTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(addTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSurgicalList = action.payload.surgeries;
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
        state.selectedSurgicalList =
          action?.meta?.arg?.template?.surgeries || [];
        const index = state.templates.findIndex(
          (e) => e.id == action?.meta?.arg?.templateId
        );
        const updatedData = {
          id: action?.meta?.arg?.templateId,
          name: action?.meta?.arg?.template?.name,
          surgeries: action?.meta?.arg?.template?.surgeries,
        };
        if (index !== -1) {
          state.templates[index] = updatedData;
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(deleteTemplate.pending, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.id == action.meta.arg ? { ...e, loading: true } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        const result = state.templates.filter(
          (item) => item.id !== action.payload.id
        );
        state.templates = [...result];
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.id == action.meta.arg ? { ...e, loading: false } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(getExaminationTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(getExaminationTemplates.rejected, (state, action) => {
        state.templates = [];
      })
      .addCase(getFrequentlySearchedExamination.fulfilled, (state, action) => {
        state.parentOptionsList = action.payload;
      })
      .addCase(getFrequentlySearchedExamination.rejected, (state, action) => {
        state.parentOptionsList = [];
      })
      .addCase(searchExamination.pending, (state) => {})
      .addCase(searchExamination.fulfilled, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = action.payload;
        } else {
          state.childOptionsList = action.payload;
        }
      })
      .addCase(searchExamination.rejected, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = [];
        } else {
          state.childOptionsList = [];
        }
      });
  },
});

export default surgicalSlice.reducer;
