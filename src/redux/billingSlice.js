import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  billPrintSettings: {},
  ipdBillPrintSettings: {},
  advancedSettings: {},
  shouldShowOpdBilling: false,
  isOpdBillChecked: false,
};

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    resetBillPrintSettingsState: () => initialState,
    setBillPrintSettings: (state, action) => {
      state.billPrintSettings = action.payload;
    },
    setIpdBillPrintSettings: (state, action) => {
      state.ipdBillPrintSettings = action.payload;
    },
    setAdvancedSettings: (state, action) => {
      state.advancedSettings = action.payload;
    },
    setShouldShowOpdBilling: (state, action) => {
      state.shouldShowOpdBilling = action.payload;
      state.isOpdBillChecked = true;
    },
  },
});

export const {
  resetBillPrintSettingsState,
  setBillPrintSettings,
  setIpdBillPrintSettings,
  setAdvancedSettings,
  setShouldShowOpdBilling,
} = billingSlice.actions;
export default billingSlice.reducer;
