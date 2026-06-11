import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import OphthalSnapRxDigitization from "../api/services/ophthal/OphthalSnapRxDigitization";

const initialState = {
  loading: false,
  error: null,
  uploadedFiles: [],
  uploadedFilesScope: null,
  fileUploadToken: null,
  fileUploadSessionId: null,
  digitizationResult: null,
};

export const uploadFiles = createAsyncThunk(
  "ophthalSnapRx/uploadFiles",
  async (data, { getState, rejectWithValue }) => {
    try {
      const { fileUploadToken } = getState().ophthalSnapRx || {};
      const result = await OphthalSnapRxDigitization.uploadSnapRxFiles({
        ...data,
        fileUploadToken: data?.fileUploadToken || fileUploadToken,
        schemaKey: data?.schemaKey,
      });

      if (result?.uploaded_files?.length > 0) {
        return result.uploaded_files;
      }

      return rejectWithValue(result?.error || "Upload failed");
    } catch (error) {
      return rejectWithValue(error?.message || "Upload failed");
    }
  }
);

export const generateFileUploadToken = createAsyncThunk(
  "ophthalSnapRx/generateFileUploadToken",
  async (data, { rejectWithValue }) => {
    try {
      const result = await OphthalSnapRxDigitization.generateFileUploadToken(
        data
      );
      const token = result?.token;
      const sessionId = result?.sessionId || result?.session_id;

      if (token) {
        return { token, sessionId };
      }

      return rejectWithValue(result?.error || "Token generation failed");
    } catch (error) {
      return rejectWithValue(error?.message || "Token generation failed");
    }
  }
);

export const getFiles = createAsyncThunk(
  "ophthalSnapRx/getFiles",
  async (data, { getState, rejectWithValue }) => {
    try {
      const { fileUploadToken: tokenFromState } =
        getState().ophthalSnapRx || {};
      const fileUploadToken = data?.fileUploadToken || tokenFromState;

      const result = await OphthalSnapRxDigitization.getFiles({
        ...data,
        fileUploadToken,
      });

      const files = Array.isArray(result?.uploaded_files)
        ? result.uploaded_files
        : [];

      return {
        files,
        patientId: data?.patientId ?? null,
        visitId: data?.visitId ?? null,
      };
    } catch (error) {
      return rejectWithValue({
        message: error?.message || "Failed to fetch files",
        patientId: data?.patientId ?? null,
        visitId: data?.visitId ?? null,
      });
    }
  }
);

export const getFilesOnMobile = createAsyncThunk(
  "ophthalSnapRx/getFilesOnMobile",
  async (data, { getState, rejectWithValue }) => {
    try {
      const { fileUploadToken } = getState().ophthalSnapRx || {};
      const result = await OphthalSnapRxDigitization.getFilesOnMobile({
        ...data,
        fileUploadToken,
      });

      const files = Array.isArray(result?.uploaded_files)
        ? result.uploaded_files
        : [];

      return {
        files,
        patientId: data?.patientId ?? null,
        visitId: data?.visitId ?? null,
      };
    } catch (error) {
      const statusCode = error?.response?.status;
      const message =
        statusCode === 401
          ? error?.response?.data?.error || error?.message
          : error?.message;

      return rejectWithValue({
        message: message || "Failed to fetch mobile files",
        patientId: data?.patientId ?? null,
        visitId: data?.visitId ?? null,
      });
    }
  }
);

export const digitizeAssessments = createAsyncThunk(
  "ophthalSnapRx/digitizeAssessments",
  async ({ previousOutput, schemaKey }, { getState, rejectWithValue }) => {
    const { fileUploadToken } = getState().ophthalSnapRx || {};
    try {
      const result = await OphthalSnapRxDigitization.digitize({
        schemaKey,
        data: { previousOutput },
        fileUploadToken,
      });
      return result;
    } catch (error) {
      return rejectWithValue(error?.message || "Digitization failed");
    }
  }
);

const ophthalSnapRxDigitizationSlice = createSlice({
  name: "ophthalSnapRx",
  initialState,
  reducers: {
    resetFileUploadToken: (state) => {
      state.fileUploadToken = null;
      state.fileUploadSessionId = null;
      state.uploadedFiles = [];
      state.uploadedFilesScope = null;
    },
    setUploadedFilesFromStore: (state, action) => {
      const payload = action.payload;
      if (Array.isArray(payload)) {
        state.uploadedFiles = payload;
        return;
      }

      const files = Array.isArray(payload?.files) ? payload.files : [];
      const scope = payload?.scope || null;

      state.uploadedFiles = files;
      state.uploadedFilesScope = scope;
    },
    clearUploadedFilesFromStore: (state) => {
      state.uploadedFiles = [];
      state.uploadedFilesScope = null;
    },
    setFileUploadToken: (state, action) => {
      state.fileUploadToken = action.payload;
    },
    setFileUploadSessionId: (state, action) => {
      state.fileUploadSessionId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadedFiles = action.payload || [];
      })
      .addCase(uploadFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || null;
      })
      .addCase(getFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFiles.fulfilled, (state, action) => {
        state.loading = false;
        const { files, patientId, visitId } = action.payload || {};
        state.uploadedFiles = Array.isArray(files) ? files : [];
        state.uploadedFilesScope =
          patientId && visitId ? { patientId, visitId } : null;
      })
      .addCase(getFiles.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        state.error = payload?.message || action.error?.message || null;

        const patientId = payload?.patientId ?? action.meta?.arg?.patientId;
        const visitId = payload?.visitId ?? action.meta?.arg?.visitId;

        if (patientId && visitId) {
          state.uploadedFiles = [];
          state.uploadedFilesScope = { patientId, visitId };
        }
      })
      .addCase(generateFileUploadToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateFileUploadToken.fulfilled, (state, action) => {
        state.loading = false;
        state.fileUploadToken = action.payload?.token || null;
        state.fileUploadSessionId = action.payload?.sessionId || null;
      })
      .addCase(generateFileUploadToken.rejected, (state, action) => {
        state.loading = false;
        state.fileUploadToken = null;
        state.fileUploadSessionId = null;
        state.error = action.payload || action.error?.message || null;
      })
      .addCase(getFilesOnMobile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFilesOnMobile.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadedFiles = action.payload?.files || [];
        state.uploadedFilesScope = {
          patientId: action.payload?.patientId || null,
          visitId: action.payload?.visitId || null,
        };
      })
      .addCase(getFilesOnMobile.rejected, (state, action) => {
        state.loading = false;
        state.uploadedFiles = [];
        state.error = action.payload?.message || action.error?.message || null;
      });
  },
});

export const {
  resetFileUploadToken,
  setUploadedFilesFromStore,
  clearUploadedFilesFromStore,
  setFileUploadToken,
  setFileUploadSessionId,
} = ophthalSnapRxDigitizationSlice.actions;

export default ophthalSnapRxDigitizationSlice.reducer;
