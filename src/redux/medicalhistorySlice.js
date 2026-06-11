import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiMedicalHistory from "../api/services/ApiMedicalHistory";

const initialState = {
  searchList: [],
  defaultList: [],
  privateNotesList: [],
  loading: false,
  error: null,
};

export const getPatientLastHistory = createAsyncThunk(
  "medicalHistory/getPatientLastHistory",
  async (data) => {
    let result = {};
    result = await ApiMedicalHistory.getPatientLastHistory(data);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const listSectionwithTag = createAsyncThunk(
  "medicalHistory/listSectionwithTag",
  async () => {
    let result = {};
    result = await ApiMedicalHistory.listSectionwithTag();
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const addTag = createAsyncThunk(
  "medicalHistory/addTag",
  async (data) => {
    let result = {};
    result = await ApiMedicalHistory.addTag(data);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const searchTag = createAsyncThunk(
  "medicalHistory/searchTag",
  async (data) => {
    let result = {};
    result = await ApiMedicalHistory.searchTag(data);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const addEditPrivateNotes = createAsyncThunk(
  "privateNotes/addEditPrivateNotes",
  async (data) => {
    let result = {};
    result = await ApiMedicalHistory.addEditPrivateNotes(data);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const listPrivateNotes = createAsyncThunk(
  "privateNotes/listPrivateNotes",
  async (data) => {
    let result = {};
    result = await ApiMedicalHistory.listPrivateNotes(data);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const deletePrivateNotes = createAsyncThunk(
  "privateNotes/deletePrivateNotes",
  async (data) => {
    let result = {};
    result = await ApiMedicalHistory.deletePrivateNotes(data);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);


const medicalHistorySlice = createSlice({
  name: "medicalHistory",
  initialState,
  reducers: {
    updatePrivateNotesList: (state, action) => {
      const { index } = action.payload
      state.privateNotesList[index].isExpand = !state.privateNotesList[index].isExpand
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(listSectionwithTag.pending, (state) => {
        state.loading = true;
      })
      .addCase(listSectionwithTag.fulfilled, (state, action) => {
        state.loading = false;
        state.defaultList = action.payload;
      })
      .addCase(listSectionwithTag.rejected, (state) => {
        state.loading = false;
      })
      .addCase(addTag.pending, (state) => {
        state.loading = true;
      })
      .addCase(addTag.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addTag.rejected, (state) => {
        state.loading = false;
      })
      .addCase(searchTag.fulfilled, (state, action) => {
        state.searchList = action.payload;
      })
      .addCase(searchTag.rejected, (state) => {
        state.searchList = [];
      })
      .addCase(addEditPrivateNotes.pending, (state) => {
        state.loading = true;
      })
      .addCase(addEditPrivateNotes.fulfilled, (state, action) => {
        state.loading = false;

        if (action.meta.arg.id !== 0) {
          const index = state.privateNotesList.findIndex((e) =>
            e.id == action.meta.arg.id
          );
          state.privateNotesList[index] = { ...state.privateNotesList[index], ...action.payload }
        } else {
          state.privateNotesList.unshift({ ...action.payload, isExpand: true });
        }

      })
      .addCase(addEditPrivateNotes.rejected, (state) => {
        state.loading = false;
      })
      .addCase(listPrivateNotes.pending, (state) => {
        state.privateNotesList = [];
      })
      .addCase(listPrivateNotes.fulfilled, (state, action) => {
        const updatedData = action.payload.map((e, index) => {
          return { ...e, isExpand: index === 0 ? true : false };
        });
        state.privateNotesList = updatedData;
      })
      .addCase(listPrivateNotes.rejected, (state) => {
        state.privateNotesList = [];
      })
      .addCase(deletePrivateNotes.fulfilled, (state, action) => {
        const result = state.privateNotesList.filter(
          (item) => item.id !== action.payload.id
        );
        state.privateNotesList = [...result];
      })

  },
});

export const { updatePrivateNotesList } = medicalHistorySlice.actions
export default medicalHistorySlice.reducer;