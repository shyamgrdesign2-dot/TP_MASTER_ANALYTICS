import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  allLabParams: [],
};

const labParamsSlice = createSlice({
  name: "labParams",

  initialState,

  reducers: {
    resetLabParamsState: () => initialState,

    addLabParamsDetails: (state, action) => {
      state.allLabParams = action.payload;
    },
  },
});

export const { resetLabParamsState, addLabParamsDetails } = labParamsSlice.actions;

export default labParamsSlice.reducer;
