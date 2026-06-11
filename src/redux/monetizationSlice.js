import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiMonetization from "../api/services/ApiMonetization";
import { services } from "./doctorsSlice";
import moment from "moment";
import { formatAmount } from "../utils/utils";
import { fetchSubscriptionDetails } from "./subscriptionSlice";

const initialState = {
    billingHistoryList: [],
    loading: false,
    errorObj: { visible: false, message: '' },
};

export const kamList = createAsyncThunk(
    "monetization/kamList",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.kamList(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const otpSend = createAsyncThunk(
    "monetization/otpSend",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.otpSend(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const otpVerify = createAsyncThunk(
    "monetization/otpVerify",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.otpVerify(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const createCart = createAsyncThunk(
    "monetization/createCart",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.createCart(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const paymentOrder = createAsyncThunk(
    "monetization/paymentOrder",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.paymentOrder(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const verifyPayment = createAsyncThunk(
    "monetization/verifyPayment",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.verifyPayment(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const purchaseDetails = createAsyncThunk(
    "monetization/purchaseDetails",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.purchaseDetails(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const checkCredits = createAsyncThunk(
    "monetization/checkCredits",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.checkCredits(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const updateCredits = createAsyncThunk(
    "monetization/updateCredits",
    async (data, { dispatch, rejectWithValue }) => {
        try {
            const result = await ApiMonetization.updateCredits(data);
            dispatch(services(data?.b2c_id))
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const extendFreeTrial = createAsyncThunk(
    "monetization/extendFreeTrial",
    async (_, { dispatch, rejectWithValue }) => {
        try {
            const result = await ApiMonetization.extendFreeTrial();
            dispatch(fetchSubscriptionDetails())
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const billingHistory = createAsyncThunk(
    "monetization/billingHistory",
    async (b2c_id, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.billingHistory(b2c_id);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const interest = createAsyncThunk(
    "monetization/interest",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.interest(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const invoiceGenerate = createAsyncThunk(
    "monetization/invoiceGenerate",
    async (invoice_id, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.invoiceGenerate(invoice_id);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const receiptGenerate = createAsyncThunk(
    "monetization/receiptGenerate",
    async (receipt_id, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.receiptGenerate(receipt_id);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const discountCode = createAsyncThunk(
    "monetization/discountCode",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.discountCode(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

export const discountCodeValidate = createAsyncThunk(
    "monetization/discountCodeValidate",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.discountCodeValidate(data);
            return result;
        } catch (error) {
            const errorMessage = error?.response?.data?.errorMessage || 
                                 error?.response?.data?.message || 
                                 error?.message || 
                                 "Something went wrong";
            return rejectWithValue({ visible: false, message: errorMessage });
        }
    }
);

export const extendCredits = createAsyncThunk(
    "monetization/extendCredits",
    async (data, { rejectWithValue }) => {
        try {
            const result = await ApiMonetization.extendCredits(data);
            return result;
        } catch (error) {
            return rejectWithValue({ visible: false, message: error.response.data.message });
        }
    }
);

const monetizationSlice = createSlice({
    name: "monetization",
    initialState,
    extraReducers: (builder) => {
        builder
            .addCase(billingHistory.fulfilled, (state, action) => {
                const mainData = action.payload.billingHistory?.filter(e => e.invoice_id || e.receipt_id);
                const tableData = [];
                mainData.forEach((entry, groupIndex) => {
                    const rowSpan = entry.plans.length;

                    let totalAmount = entry.plans.reduce((sum, item) => sum + parseFloat(item.plan_amount), 0);
                    let discount_amount = entry.discount_applied !== undefined ? entry.discount_applied : 0;

                    entry.plans.forEach((plan, planIndex) => {
                        tableData.push({
                            key: `${groupIndex}-${planIndex}`,
                            invoice_id: entry.invoice_id,
                            receipt_id: entry.receipt_id,
                            service_display_name: plan.service_display_name,
                            service_name: plan.service_name,
                            plan_validity_months: plan.plan_validity_months,
                            plan_amount: `₹${formatAmount(plan.plan_amount)}`,
                            total_amount: `₹${formatAmount(totalAmount - discount_amount)}`,
                            payment_status: plan.payment_status,
                            plan_start_date: moment(plan.plan_start_date).format('Do MMM, YYYY'),
                            plan_end_date: moment(plan.plan_end_date).add(1, 'days').format('Do MMM, YYYY'),
                            status: plan.status,
                            rowSpan: planIndex === 0 ? rowSpan : 0,
                        });
                    });
                });

                state.billingHistoryList = tableData;
            })
            .addCase(billingHistory.rejected, (state) => {
                state.billingHistoryList = [];
            })
    },
});

export default monetizationSlice.reducer;