import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  givenVaccines: [],
  updatedDueVaccines: [],
};

const vaccineSlice = createSlice({
  name: "vaccines",
  initialState,
  reducers: {
    resetVaccineState: () => initialState,
    addGivenVaccines: (state, action) => {
      state.givenVaccines.push(action.payload);
    },
    addDueVaccines: (state, action) => {
      state.updatedDueVaccines.push(action.payload);
    },
  },
});

export const { resetVaccineState, addGivenVaccines, addDueVaccines } =
  vaccineSlice.actions;
export default vaccineSlice.reducer;
