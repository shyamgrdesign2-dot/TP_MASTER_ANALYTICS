import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/services/axiosService";
import config from "../config";
import moment from "moment";

// Async thunk action to fetch subscription details from the API
export const fetchSubscriptionDetails = createAsyncThunk(
  "subscription/fetchSubscriptionDetails",
  async () => {
    const response = await api.post(
      `user/v2/pm/info/plan`,
      {},
      {
        customBaseUrl: config.user_management_api_url,
      }
    );
    if (response.status === 200) {
      const {
        plan_active_date,
        plan_expiry_date,
        planStatus: { code: currentPlanStatus = "" },
      } = response?.body?.clinic;
      const {
        lastPlanStatus: { code: lastPlanStatus = "" } = {
          code: "",
        },
        last_plan_active_date = "",
        last_plan_expiry_date = "",
        expiry_reminder_days,
        is_owner,
        is_pm_renew_requested,
        product_type: productType,
      } = response?.body?.profile;

      return {
        clinic_b2c: response?.body?.clinic?.b2c,
        profile_b2c: response?.body?.profile?.b2c,
        plan_active_date:
          plan_active_date || response?.body?.profile?.plan_active_date,
        plan_expiry_date:
          plan_expiry_date || response?.body?.profile?.plan_expiry_date,
        lastPlanStatus,
        currentPlanStatus:
          currentPlanStatus || response?.body?.profile?.planStatus?.code,
        last_plan_active_date,
        last_plan_expiry_date,
        productType,
        billingHistory: response?.body?.payments?.content,
        expiry_reminder_days,
        is_owner,
        is_pm_renew_requested,
        totalPages: response?.body?.payments?.totalPages,
        expiresIn: moment(plan_expiry_date)
          .startOf("day")
          .diff(moment().startOf("day"), "days"),
        onboarding_date: response?.body?.profile?.onboarding_date,
        c_expiry_reminder_days: response?.body?.clinic?.expiry_reminder_days || 0,
        c_last_plan_expiry_date: response?.body?.clinic?.last_plan_expiry_date || "",
        c_last_plan_status: response?.body?.clinic?.lastPlanStatus?.code || "",
        c_plan_status: response?.body?.clinic?.planStatus?.code || "",
        service_mappings: response?.body?.clinic?.service_mappings || []
      };
    }
  }
);

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState: {
    planDetails: null,
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptionDetails.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSubscriptionDetails.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.planDetails = action.payload;
      })
      .addCase(fetchSubscriptionDetails.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export default subscriptionSlice.reducer;
