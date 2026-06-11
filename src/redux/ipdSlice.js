import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiIpdService from "../api/services/ApiIpd";

const initialState = {
  loading: false,
  error: null,
};

export const checkPatientAdmitted = createAsyncThunk(
  "ipd/checkPatientAdmitted",
  async (data) => {
    try {
      let result = {};
      result = await ApiIpdService.checkPatientAdmitted(data);
      return result;
    } catch (error) {
      console.log("error: ", error);
      throw Error(error);
    }
  }
);

const ipdSlice = createSlice({
  name: "ipd",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkPatientAdmitted.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkPatientAdmitted.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(checkPatientAdmitted.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { clearError } = ipdSlice.actions;

export default ipdSlice.reducer;

