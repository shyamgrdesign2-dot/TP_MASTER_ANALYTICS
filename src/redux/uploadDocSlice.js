import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ApiAppointments from "../api/services/ApiAppointments";
import { ictAuthToken } from "./appointmentsSlice";
import { PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN } from "../utils/constants";
import moment from "moment";
import config from "../config";

const initialState = {
  uploadDocCategories: [],
  allUploadedDocs: [],
  patientUploadedDocs: [],
  isLoading: false,
};

export const zydusDocsList = createAsyncThunk(
  "records/zydusDocsList",
  async ({ mrno, um_id }, { dispatch }) => {
    try {
      const result = await ApiAppointments.zydusDocsList(mrno);
      if (result.status == 'success') {
        return result.data;
      } else {
        throw Error(result.error);
      }
    } catch (error) {
      if (error.response.status === 401) {
        const action = await dispatch(ictAuthToken())
        if (action.meta.requestStatus === "fulfilled") {
          await localStorage.setItem(PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN, JSON.stringify(action.payload.tokenNo))
          dispatch(zydusDocsList({ mrno }))
        }
      }
      // console.log("error: ", error);
      throw Error(error);
    }
  }
);

export const zydusRadioList = createAsyncThunk(
  "records/zydusRadioList",
  async ({ mrno, um_id }, { dispatch }) => {
    try {
      const result = await ApiAppointments.zydusRadioList(mrno);
      if (result.status == 'success') {
        return result.data;
      } else {
        throw Error(result.error);
      }
    } catch (error) {
      if (error.response.status === 401) {
        const action = await dispatch(ictAuthToken())
        if (action.meta.requestStatus === "fulfilled") {
          await localStorage.setItem(PERSISTANT_STORAGE_KEY_ZYDUS_TOKEN, JSON.stringify(action.payload.tokenNo))
          dispatch(zydusRadioList({ mrno }))
        }
      }
      // console.log("error: ", error);
      throw Error(error);
    }
  }
);

const uploadDocSlice = createSlice({
  name: "uploadDoc",
  initialState,
  reducers: {
    resetUploadDocState: (state) => {
      state.allUploadedDocs = [];
    },
    setUploadDocCategories: (state, action) => {
      const categoriesOrder = [
        "Pathology",
        "Radiology",
        "Prescription",
        "Other",
      ];
      if (action?.payload?.length > 0) {
        const reorderedCategories = categoriesOrder.map((name) =>
          action.payload.find((category) => category.category_name === name)
        );
        state.uploadDocCategories = reorderedCategories;
      }
    },
    setPatientUploadedDocs: (state, action) => {
      state.patientUploadedDocs = action.payload;
    },
    setLoadingStatus: (state, action) => {
      state.isLoading = action.payload;
    },
    setAllUploadedDocs: (state, action) => {
      state.allUploadedDocs = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(zydusDocsList.fulfilled, (state, action) => {
        const updatedData = action.payload.map(e => {
          return {
            id: e?.labResultId,
            category_id: -2,
            name: e?.serviceName,
            display_name: e?.serviceName,
            url: `${config.zydus_proxy_url}/ictApiProxy/emr/lab/report/print?sampleId=${e?.sampleId}&labResultId=${e?.labResultId}`,
            um_id: action.meta.arg.um_id,
            thumbnail_url: '',
            created_date: moment(e?.certifiedDate, 'DD-MM-YYYY').format('YYYY-MM-DD'),
            investigation_date: moment(e?.certifiedDate, 'DD-MM-YYYY').format('YYYY-MM-DD'),
            notes: ''
          }
        })
        state.allUploadedDocs.unshift(...updatedData)
      })
      .addCase(zydusRadioList.fulfilled, (state, action) => {
        const updatedData = action.payload.map(e => {
          return {
            id: e?.orderId,
            category_id: -3,
            name: `${e?.serviceName}-${e?.orderStatus}`,
            display_name: `${e?.serviceName}-${e?.orderStatus}`,
            url: null,
            um_id: action.meta.arg.um_id,
            thumbnail_url: '',
            created_date: moment(e?.orderConformedDate).format('YYYY-MM-DD'),
            investigation_date: moment(e?.orderConformedDate).format('YYYY-MM-DD'),
            notes: ''
          }
        })
        state.allUploadedDocs.unshift(...updatedData)
      });
  },
});

export const {
  resetUploadDocState,
  setUploadDocCategories,
  setPatientUploadedDocs,
  setLoadingStatus,
  setAllUploadedDocs,
} = uploadDocSlice.actions;
export default uploadDocSlice.reducer;
