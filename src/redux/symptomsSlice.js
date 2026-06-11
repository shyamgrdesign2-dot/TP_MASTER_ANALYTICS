import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiSymptoms from "../api/services/ApiSymptoms";

const initialState = {
  selectedSymptomsList: [],
  parentOptionsList: [],
  childOptionsList: [],
  templates: [],
  loading: false,
  error: null,
  errorObj: { visible: false, message: '' },
};

export const addTemplate = createAsyncThunk(
  "symptoms/addTemplate",
  async (template) => {
    let result = {};
    result = await ApiSymptoms.addTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const updateTemplate = createAsyncThunk(
  "symptoms/updateTemplate",
  async (template) => {
    const result = await ApiSymptoms.updateTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  "symptoms/deleteTemplate",
  async (templateId) => {
    const result = await ApiSymptoms.deleteTemplate(templateId);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getSymptomsTemplates = createAsyncThunk(
  "symptoms/getSymptomsTemplates",
  async () => {
    let result = {};
    result = await ApiSymptoms.getSymptomsTemplates();
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getFrequentlySearchedSymptoms = createAsyncThunk(
  "symptoms/getFrequentlySearchedSymptoms",
  async (_, { rejectWithValue }) => {
    try {
      const result = await ApiSymptoms.getFrequentlySearchedSymptoms();
      return result;
    } catch (error) {
      return rejectWithValue({ visible: false, message: error.response.data.message });
    }
  }
);

export const searchSymptoms = createAsyncThunk(
  "symptoms/searchSymptoms",
  async (data, { rejectWithValue }) => {
    try {
      const result = await ApiSymptoms.searchSymptoms(data.searchQuery);
      return result;
    } catch (error) {
      return rejectWithValue({ visible: false, message: error.response.data.message });
    }
  }
);

export const singleTemplateDetails = createAsyncThunk(
  "symptoms/singleTemplateDetails",
  async (templateId) => {
    const result = await ApiSymptoms.singleTemplateDetails(templateId);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

const symptomsSlice = createSlice({
  name: "symptoms",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(addTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(addTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSymptomsList = action.payload.symptoms;

        const { tst_id, tst_template_name, symptoms } = action.payload
        state.templates.unshift({ tst_id: tst_id, tst_template_name: tst_template_name, symptoms: symptoms.map((e) => e.symptom_name).join(', ') });
      })
      .addCase(addTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(updateTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSymptomsList = action.payload.symptoms;
        const index = state.templates.findIndex(
          (e) => e.tst_id == action.payload.tst_id
        );
        if (index !== -1) {
          const { tst_id, tst_template_name, symptoms } = action.payload
          state.templates[index] = { tst_id: tst_id, tst_template_name: tst_template_name, symptoms: symptoms.map((e) => e.symptom_name).join(', ') };
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(deleteTemplate.pending, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tst_id == action.meta.arg ? { ...e, loading: true } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        const result = state.templates.filter(
          (item) => item.tst_id !== action.payload.tst_id
        );
        state.templates = [...result];
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tst_id == action.meta.arg ? { ...e, loading: false } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(getSymptomsTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(getSymptomsTemplates.rejected, (state, action) => {
        state.templates = [];
      })
      .addCase(getFrequentlySearchedSymptoms.fulfilled, (state, action) => {
        state.parentOptionsList = action.payload;
      })
      .addCase(getFrequentlySearchedSymptoms.rejected, (state, action) => {
        state.parentOptionsList = [];
      })
      .addCase(searchSymptoms.pending, (state) => { })
      .addCase(searchSymptoms.fulfilled, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = action.payload;
        } else {
          state.childOptionsList = action.payload;
        }
      })
      .addCase(searchSymptoms.rejected, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = [];
        } else {
          state.childOptionsList = [];
        }
      });
  },
});

export default symptomsSlice.reducer;