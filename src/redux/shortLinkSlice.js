import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiShortLinks from "../api/services/ApiShortLinks";

const initialState = {
  loading: false,
  error: null,
  shortLink: null,
};

export const getShortLink = createAsyncThunk(
  "shortLink/getShortLink",
  async (data) => {
    try {
      let result = {};
      result = await ApiShortLinks.createShortLink(data);
      if (result?.short_url) {
        return result?.short_url;
      } else {
        throw Error(result.error);
      }
    } catch (error) {
      console.log("error: ", error);
      throw Error(error);
    }
  }
);

const shortLinkSlice = createSlice({
  name: "shortLink",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(getShortLink.pending, (state) => {
        state.loading = true;
      })
      .addCase(getShortLink.fulfilled, (state, action) => {
        state.loading = false;
        state.shortLink = action.payload;
      })
      .addCase(getShortLink.rejected, (state, action) => {
        state.shortLink = null;
        state.loading = false;
      });
  },
});

export default shortLinkSlice.reducer;
