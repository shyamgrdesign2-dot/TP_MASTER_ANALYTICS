import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  abhaDetails: {
    linkedAddress: "",
    insertId: "",
    fullName: "",
    dateOfBirth: "",
    gender: "",
    mobile: "",
    address: "",
    pinCode: "",
  },
};

const abhaSlice = createSlice({
  name: "abha",
  initialState,
  reducers: {
    setAbhaDetails: (state, action) => {
      const {
        linkedAddress = "",
        insertId = "",
        fullName = "",
        dateOfBirth = "",
        gender = "",
        mobile = "",
        address = "",
        pinCode = "",
      } = action.payload || {};
      state.abhaDetails = {
        linkedAddress,
        insertId,
        fullName,
        dateOfBirth,
        gender,
        mobile,
        address,
        pinCode,
      };
    },
    clearAbhaDetails: (state) => {
      state.abhaDetails = {
        linkedAddress: "",
        insertId: "",
        fullName: "",
        dateOfBirth: "",
        gender: "",
        mobile: "",
        address: "",
        pinCode: "",
      };
    },
  },
});

export const { setAbhaDetails, clearAbhaDetails } = abhaSlice.actions;
export default abhaSlice.reducer;
