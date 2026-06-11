import { createSlice } from "@reduxjs/toolkit";

const doctorModalSlice = createSlice({
  name: "doctorModal",
  initialState: {
    isVisible: false,
    service_name: null,
  },
  reducers: {
    openModal: (state, action) => {
      state.isVisible = true;
      state.service_name = action.payload !== undefined ? action.payload : null;
    },
    closeModal: (state) => {
      state.isVisible = false;
      state.service_name = null;
    },
  },
});

export const { openModal, closeModal } = doctorModalSlice.actions;
export default doctorModalSlice.reducer;
