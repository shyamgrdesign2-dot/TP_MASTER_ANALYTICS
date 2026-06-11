import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { ADD, EDIT } from "../utils/constants";

import ApiVitals from "../api/services/ApiVitals";

const VOICE_AMBIENT_SNAP_SMART_FLOWS = ["voice", "ambient", "snap", "smart"];
const isAllowedFlow = (flow) => flow && VOICE_AMBIENT_SNAP_SMART_FLOWS.includes(String(flow).toLowerCase());

const initialState = {
    selectedVitalsList: [],
    vitalsPastList: [],
    loading: false,
    error: null,
    patientBirthWeight: null,
    todayData: null,
    listVitalsTodayIds: null,
};

export const getTodayWeight = createAsyncThunk(
    "growChart/getTodayWeight",
    async (data) => {
        const result = await ApiVitals.getTodayWeight(data?.pm_id, data?.pm_pid);
        if (result.statusCode !== 404) {
            return result;
        } else {
            throw Error(result.error);
        }
    }
);

export const updateTodayWeight = createAsyncThunk(
    "growChart/updateTodayWeight",
    async (data) => {
        const result = await ApiVitals.updateTodayWeight(data);
        // if (result.statusCode !== 400) {
        //     return result;
        // } else {
        //     throw Error(result.error);
        // }
    }
);

export const addUpdateVitals = createAsyncThunk(
    "vitals/addUpdateVitals",
    async (data, { dispatch }) => {
        let result = {};
        result = await ApiVitals.addUpdateVitals(data);
        await dispatch(getTodayWeight(data))
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const getVitals = createAsyncThunk(
    "vitals/getVitals",
    async (data, { dispatch }) => {
        let result = {};
        result = await ApiVitals.getVitals(data);
        await dispatch(getTodayWeight(data))
        if (result.status) {
            return result.data;
        } else {
            throw Error(result.error);
        }
    }
);

export const getPatientBirthWeight = createAsyncThunk("vitals/getPatientBirthWeight", async (data) => {
    let result = {};
    result = await ApiVitals.getPatientBirthWeight(data);
    if (result.status) {
        return result.data;
    } else {
        throw Error(result.error);
    }
});

const vitalsSlice = createSlice({
    name: "vitals",
    initialState,
    reducers: {
        updateList: (state, action) => {
            const { status, data, weight } = action.payload
            if (status == 'selected') {
                state.selectedVitalsList = data;
            } else {
                state.vitalsPastList = data;
            }
            state.todayData = { ...state.todayData, weight: weight };
        },
        // Voice/Ambient/Snap/Smart only: update state only when flow is voice, ambient, snap or smart; else no-op (does not affect consult)
        setListVitalsToday: (state, action) => {
            const { flow, patient_unique_id, tcv_id, tcbc_id, dev_unique_id } = action.payload || {};
            if (flow !== undefined && !isAllowedFlow(flow)) return;
            state.listVitalsTodayIds = { patient_unique_id, tcv_id: tcv_id ?? 0, tcbc_id: tcbc_id ?? 0, dev_unique_id: dev_unique_id ?? 0 };
        },
        setVitalsIdsFromAddVitals: (state, action) => {
            const { flow, patient_unique_id, tcv_id, tcbc_id, dev_unique_id } = action.payload || {};
            if (flow !== undefined && !isAllowedFlow(flow)) return;
            const pid = patient_unique_id ?? state.listVitalsTodayIds?.patient_unique_id ?? null;
            if (state.listVitalsTodayIds) {
                state.listVitalsTodayIds.patient_unique_id = pid;
                state.listVitalsTodayIds.tcv_id = tcv_id ?? 0;
                state.listVitalsTodayIds.tcbc_id = tcbc_id ?? 0;
                state.listVitalsTodayIds.dev_unique_id = dev_unique_id ?? 0;
            } else {
                state.listVitalsTodayIds = { patient_unique_id: pid, tcv_id: tcv_id ?? 0, tcbc_id: tcbc_id ?? 0, dev_unique_id: dev_unique_id ?? 0 };
            }
        },
        clearListVitalsToday: (state, action) => {
            const payload = action.payload;
            if (payload != null && typeof payload === "object" && "flow" in payload && !isAllowedFlow(payload.flow)) return;
            state.listVitalsTodayIds = null;
        },
        resetVitalsState: () => ({ ...initialState }),
    },
    extraReducers: (builder) => {
        builder
            .addCase(addUpdateVitals.pending, (state) => {
                state.loading = true;
            })
            .addCase(addUpdateVitals.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedVitalsList = action.payload;
            })
            .addCase(addUpdateVitals.rejected, (state) => {
                state.loading = false;
            })
            .addCase(getVitals.pending, (state) => {
                state.loading = true;
                state.selectedVitalsList = [];
            })
            .addCase(getVitals.fulfilled, (state, action) => {
                state.loading = false;
                const payload = Array.isArray(action.payload) ? action.payload : [];

                if (action.meta.arg.mode === ADD && action.meta.arg.pam_id !== 0) {
                    const updatedWithPamId = payload.filter((e) =>
                        e.pam_id == action.meta.arg.pam_id
                    );
                    state.selectedVitalsList = [...updatedWithPamId];

                    const updatedWithoutPamId = payload.filter((e) =>
                        e.pam_id != action.meta.arg.pam_id
                    );
                    state.vitalsPastList = [...updatedWithoutPamId];
                } else {
                    state.vitalsPastList = payload;
                }
            })
            .addCase(getVitals.rejected, (state) => {
                state.loading = false;
            })
            .addCase(getPatientBirthWeight.fulfilled, (state, action) => {
                state.patientBirthWeight = action?.payload?.birth_weight;
            })
            .addCase(getTodayWeight.fulfilled, (state, action) => {
                state.todayData = action.payload;
            })
            .addCase(getTodayWeight.rejected, (state) => {
                state.todayData = null;
            })
    },
});

export const { updateList, setListVitalsToday, setVitalsIdsFromAddVitals, clearListVitalsToday, resetVitalsState } = vitalsSlice.actions
export default vitalsSlice.reducer;