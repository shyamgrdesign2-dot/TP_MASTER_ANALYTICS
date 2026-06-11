import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiVideoLibrary from "../api/services/ApiVideoLibrary";

const initialState = {
    save_loading: false,
    publish_loading: false,
    ai_loading:false,
    error: null,
    languageList: []
};

export const viewDoctorWebsite = createAsyncThunk(
    "videoLibrary/viewDoctorWebsite",
    async () => {
        let result = {};
        result = await ApiVideoLibrary.viewDoctorWebsite();
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const listLanguage = createAsyncThunk(
    "videoLibrary/listLanguage",
    async () => {
        let result = {};
        result = await ApiVideoLibrary.listLanguage();
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const saveDoctorWebsite = createAsyncThunk(
    "videoLibrary/saveDoctorWebsite",
    async ({ data, onUploadProgress, onDownloadProgress, cancelToken }) => {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
            if (key.startsWith('clinicpic')) {
                data[key].forEach((item, index) => {
                    formData.append(key, item);
                });
            } else {
                formData.append(key, data[key]);
            }
        });

        try {
            const result = await ApiVideoLibrary.saveDoctorWebsite(formData, onUploadProgress, onDownloadProgress, cancelToken);
            if (result.status) {
                return result.data;
            } else {
                throw Error(result.error);
            }
        } catch (error) {
            throw Error(error);
        }
    }
);

export const publishDoctorWebsite = createAsyncThunk(
    "videoLibrary/publishDoctorWebsite",
    async (data) => {
        const result = await ApiVideoLibrary.publishDoctorWebsite(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const doctorOpenAI = createAsyncThunk(
    "videoLibrary/doctorOpenAI",
    async (data) => {
        const result = await ApiVideoLibrary.doctorOpenAI(data);
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

const doctorWebsiteSlice = createSlice({
    name: "doctorWebsite",
    initialState,
    extraReducers: (builder) => {
        builder
            .addCase(viewDoctorWebsite.pending, (state) => {
                state.loading = true;
            })
            .addCase(viewDoctorWebsite.fulfilled, (state, action) => {
                state.loading = false;
            })
            .addCase(viewDoctorWebsite.rejected, (state) => {
                state.loading = false;
            })
            .addCase(listLanguage.fulfilled, (state, action) => {
                state.languageList = action.payload
            })
            .addCase(listLanguage.rejected, (state) => {
                state.languageList = []
            })
            .addCase(saveDoctorWebsite.pending, (state) => {
                state.save_loading = true;
            })
            .addCase(saveDoctorWebsite.fulfilled, (state, action) => {
                state.save_loading = false;
            })
            .addCase(saveDoctorWebsite.rejected, (state) => {
                state.save_loading = false;
            })
            .addCase(publishDoctorWebsite.pending, (state) => {
                state.publish_loading = true;
            })
            .addCase(publishDoctorWebsite.fulfilled, (state, action) => {
                state.publish_loading = false;
            })
            .addCase(publishDoctorWebsite.rejected, (state) => {
                state.publish_loading = false;
            })
            .addCase(doctorOpenAI.pending, (state) => {
                state.ai_loading = true;
            })
            .addCase(doctorOpenAI.fulfilled, (state, action) => {
                state.ai_loading = false;
            })
            .addCase(doctorOpenAI.rejected, (state) => {
                state.ai_loading = false;
            });
    },
});

export default doctorWebsiteSlice.reducer;