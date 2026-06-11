import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import SnapRxDigitization from "../api/services/SnapRxDigitization";
import { SNAP_RX_TOKENS_STORAGE_KEY } from "../utils/constants";

const TOKEN_EXPIRY_DURATION = 60 * 60 * 1000;

const initialState = {
  loading: false,
  error: null,
  uploadedFiles: [],
  fileUploadToken: null,
};

export const uploadFiles = createAsyncThunk(
  "snapRx/uploadFiles",
  async (data) => {
    try {
      let result = {};
      result = await SnapRxDigitization.uploadSnapRxFiles(data);
      if (result?.uploaded_files?.length > 0) {
        return data?.file;
      } else {
        throw Error(result.error);
      }
    } catch (error) {
      console.log("error: ", error);
      throw Error(error);
    }
  }
);

export const generateFileUploadToken = createAsyncThunk(
  "snapRx/generateFileUploadToken",
  async (data) => {
    try {
      let result = {};
      result = await SnapRxDigitization.generateFileUploadToken(data);
      if (result?.token) {
        return result?.token;
      } else {
        throw Error(result.error);
      }
    } catch (error) {
      console.log("error: ", error);
      throw Error(error);
    }
  }
);

export const getFiles = createAsyncThunk("snapRx/getFiles", async (data) => {
  try {
    let result = {};
    result = await SnapRxDigitization.getFiles(data);
    if (result?.uploaded_files) {
      return result.uploaded_files;
    } else {
      throw Error(result.error);
    }
  } catch (error) {
    console.log("error: ", error);
    throw Error(error);
  }
});

export const getFilesOnMobile = createAsyncThunk(
  "snapRx/getFilesOnMobile",
  async (data) => {
    try {
      let result = {};
      result = await SnapRxDigitization.getFilesOnMobile(data);
      if (result?.uploaded_files) {
        return result.uploaded_files;
      } else {
        throw Error(result.error);
      }
    } catch (error) {
      console.log("error: ", error);
      const statusCode = error.response?.status;
      if (statusCode === 401) {
        throw Error(error.response?.data?.error || error.message);
      } else {
        throw Error(error.message);
      }
    }
  }
);

const snapRxDigitizationSlice = createSlice({
  name: "snapRx",
  initialState,
  reducers: {
    resetFileUploadToken: (state) => {
      state.fileUploadToken = null;
    },
    setUploadedFilesFromStore: (state, action) => {
      state.uploadedFiles = action.payload;
    },
    setFileUploadToken: (state, action) => {
      state.fileUploadToken = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadFiles.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadedFiles = action.payload;
      })
      .addCase(uploadFiles.rejected, (state, action) => {
        state.uploadedFiles = [];
        state.loading = false;
      })
      .addCase(getFiles.pending, (state) => {
        state.loading = true;
      })
      .addCase(getFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadedFiles = action.payload;
      })
      .addCase(getFiles.rejected, (state, action) => {
        state.uploadedFiles = [];
        state.loading = false;
      })
      .addCase(generateFileUploadToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(generateFileUploadToken.fulfilled, (state, action) => {
        state.loading = false;
        state.fileUploadToken = action.payload;
        const { session_id, patient_unique_id, doctor_id } = action.meta.arg;
        
        const tokenKey = `fileUploadToken_${session_id}_${patient_unique_id}_${doctor_id}`;
        const tokenData = {
          value: action.payload,
          timestamp: Date.now(),
          expiresIn: Date.now() + TOKEN_EXPIRY_DURATION
        };
        
        let tokensObject = {};
        try {
          const existingTokens = localStorage.getItem(SNAP_RX_TOKENS_STORAGE_KEY);
          if (existingTokens) {
            tokensObject = JSON.parse(existingTokens);
          }
        } catch (error) {
          console.error('Error parsing existing tokens:', error);
          tokensObject = {};
        }
        
        tokensObject[tokenKey] = tokenData;
        localStorage.setItem(SNAP_RX_TOKENS_STORAGE_KEY, JSON.stringify(tokensObject));
      })
      .addCase(generateFileUploadToken.rejected, (state, action) => {
        state.loading = false;
        state.fileUploadToken = null;
      })
      .addCase(getFilesOnMobile.pending, (state) => {
        state.loading = true;
      })
      .addCase(getFilesOnMobile.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadedFiles = action.payload;
      })
      .addCase(getFilesOnMobile.rejected, (state, action) => {
        state.uploadedFiles = [];
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { resetFileUploadToken, setUploadedFilesFromStore, setFileUploadToken } = snapRxDigitizationSlice.actions;
export default snapRxDigitizationSlice.reducer;
