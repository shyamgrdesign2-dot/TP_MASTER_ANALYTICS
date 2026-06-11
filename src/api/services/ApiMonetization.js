import api from "./axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.monetization_url };
const baseTatvaAiUrl = { customBaseUrl: config.tatvaAi_api_url };
const baseUserManagementUrl = {
    customBaseUrl: config.user_management_api_url,
    headers: {
        api_key: config.lite_api_key,
        api_secret_key: config.lite_secret_key,
    }
};

const baseUserManagementUrlV2 = {
    customBaseUrl: config.user_management_api_url,
};

const cloneBaseUserManagementUrl = {
    customBaseUrl: config.user_management_api_url,
    headers: {
        api_key: config.api_key,
        api_secret_key: config.api_secret_key,
    },
};

const ApiMonetization = {};

ApiMonetization.campaigns = function () {
    return api.get(`/api/v1/monetization/campaigns`, baseUrl);
};

ApiMonetization.services = function (b2c_id) {
    return api.get(`/api/v1/monetization/services?b2c_id=${b2c_id}`, baseUrl);
};

ApiMonetization.kamList = function (data) {
    return api.post(`/user/tatva/kam-list`, data, baseUserManagementUrl);
};

ApiMonetization.otpSend = function (data) {
    return api.post(`/api/v1/onboarding/otp/send`, data, baseTatvaAiUrl);
};

ApiMonetization.otpVerify = function (data) {
    return api.post(`/api/v1/onboarding/otp/verify`, data, baseTatvaAiUrl);
};

ApiMonetization.createCart = function (data) {
    return api.post(`/api/v1/monetization/create-cart`, data, baseUrl);
};

ApiMonetization.paymentOrder = function (data) {
    return api.post(`/api/v1/payment/create-order`, data, baseUrl);
};

ApiMonetization.verifyPayment = function (data) {
    return api.post(`/api/v1/payment/verify-payment`, data, baseUrl);
};

ApiMonetization.purchaseDetails = function (data) {
    return api.post(`/api/v1/monetization/purchase-details?b2c_id=${data.b2c_id}`, data, baseUrl);
};

ApiMonetization.plans = function (b2c_id) {
    return api.get(`/api/v1/monetization/plans?b2c_id=${b2c_id}`, baseUrl);
};

ApiMonetization.checkCredits = function (data) {
    return api.get(`/api/v1/monetization/credits?b2c_id=${data?.b2c_id}&service_name=${data?.service_name}`, baseUrl);
};

ApiMonetization.updateCredits = function (data) {
    return api.put(`/api/v1/monetization/credits?service_name=${data?.service_name}`, { action: "DECREASE" }, baseUrl);
};

ApiMonetization.extendFreeTrial = function () {
    return api.get(`user/v2/pm/info/extend`, baseUserManagementUrlV2);
};

ApiMonetization.billingHistory = function (b2c_id) {
    return api.get(`/api/v1/monetization/billing-history?b2c_id=${b2c_id}`, baseUrl);
};

ApiMonetization.interest = function (data) {
    return api.post(`/user/tatva/v2/interest`, data, baseUserManagementUrlV2);
};

ApiMonetization.invoiceGenerate = function (invoice_id) {
    return api.get(`/user/tatva/v2/invoice/${invoice_id}`, baseUserManagementUrlV2);
};

ApiMonetization.receiptGenerate = function (receipt_id) {
    return api.get(`/user/tatva/v2/receipt/${receipt_id}`, baseUserManagementUrlV2);
};

ApiMonetization.discountCode = function (data) {
    return api.post(`/user/tatva/discount/v2/add`, data, baseUserManagementUrlV2);
};

ApiMonetization.discountCodeValidate = function (data) {
    return api.get(`/user/tatva/discount/v2/validate?code=${data?.code}&id=${data?.id}`, baseUserManagementUrlV2);
};

ApiMonetization.extendCredits = function (data) {
    return api.put(`/api/v1/monetization/extend-credits?service_name=${data?.service_name}`, {}, baseUrl);
};

export default ApiMonetization;