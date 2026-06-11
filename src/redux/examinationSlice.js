import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiExamination from "../api/services/ApiExamination";

const initialState = {
  selectedExaminationList: [],
  parentOptionsList: [],
  childOptionsList: [],
  templates: [],
  loading: false,
  error: null,
  errorObj: { visible: false, message: '' },
};

export const addTemplate = createAsyncThunk(
  "examination/addTemplate",
  async (template) => {
    let result = {};
    result = await ApiExamination.addTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const updateTemplate = createAsyncThunk(
  "examination/updateTemplate",
  async (template) => {
    const result = await ApiExamination.updateTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  "examination/deleteTemplate",
  async (templateId) => {
    const result = await ApiExamination.deleteTemplate(templateId);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getExaminationTemplates = createAsyncThunk(
  "examination/getExaminationTemplates",
  async () => {
    let result = {};
    result = await ApiExamination.getExaminationTemplates();
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getFrequentlySearchedExamination = createAsyncThunk(
  "examination/getFrequentlySearchedExamination",
  async (_, { rejectWithValue }) => {
    try {
      const result = await ApiExamination.getFrequentlySearchedExamination();
      return result;
    } catch (error) {
      return rejectWithValue({ visible: false, message: error.response.data.message });
    }
  }
);

export const searchExamination = createAsyncThunk(
  "examination/searchExamination",
  async (data, { rejectWithValue }) => {
    try {
      const result = await ApiExamination.searchExamination(data.searchQuery);
      return result;
    } catch (error) {
      return rejectWithValue({ visible: false, message: error.response.data.message });
    }
  }
);

export const singleTemplateDetails = createAsyncThunk(
  "examination/singleTemplateDetails",
  async (templateId) => {
    const result = await ApiExamination.singleTemplateDetails(templateId);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

const examinationSlice = createSlice({
  name: "examination",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(addTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(addTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedExaminationList = action.payload.examination;

        const { tet_id, tet_template_name, examination } = action.payload
        state.templates.unshift({ tet_id: tet_id, tet_template_name: tet_template_name, examination: examination.map((e) => e.examination_name).join(', ') });
      })
      .addCase(addTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(updateTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedExaminationList = action.payload.examination;
        const index = state.templates.findIndex(
          (e) => e.tet_id == action.payload.tet_id
        );
        if (index !== -1) {
          const { tet_id, tet_template_name, examination } = action.payload
          state.templates[index] = { tet_id: tet_id, tet_template_name: tet_template_name, examination: examination.map((e) => e.examination_name).join(', ') };
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(deleteTemplate.pending, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tet_id == action.meta.arg ? { ...e, loading: true } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        const result = state.templates.filter(
          (item) => item.tet_id !== action.payload.tet_id
        );
        state.templates = [...result];
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tet_id == action.meta.arg ? { ...e, loading: false } : e
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
      .addCase(searchExamination.pending, (state) => { })
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

export default examinationSlice.reducer;