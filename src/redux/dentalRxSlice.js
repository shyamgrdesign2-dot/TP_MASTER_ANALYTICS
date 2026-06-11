import { createSlice } from "@reduxjs/toolkit";

const dentalRxSlice = createSlice({
  name: "dentalRx",
  initialState: {
    dentalData: null,
  },
  reducers: {
    setDentalData: (state, action) => {
      state.dentalData = action.payload || null;
    },
    clearDentalData: (state) => {
      state.dentalData = null;
    },
  },
});

export const { setDentalData, clearDentalData } = dentalRxSlice.actions;

export default dentalRxSlice.reducer;
