import api from "./axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.bulk_messages };
const baseUserManagementUrl = {
    customBaseUrl: config.user_management_api_url,
    headers: {
        api_key: config.api_key,
        api_secret_key: config.api_secret_key,
    }
};
const baseUserManagementUrlV2 = {
    customBaseUrl: config.user_management_api_url,
};

const ApiBulkMessages = {};

ApiBulkMessages.userCredit = function () {
    return api.get(`/api/v1/communication/userCredit`, baseUrl);
};

ApiBulkMessages.userCount = function (data) {
    return api.post(`/api/v1/campaign/userCount`, data, baseUrl);
};

ApiBulkMessages.userCampaign = function (data) {
    return api.post(`/api/v1/campaign/userCampaign`, data, baseUrl);
};

ApiBulkMessages.userCampaignDetails = function (id) {
    return api.get(`/api/v1/campaign/userCampaign/${id}`, baseUrl);
};

ApiBulkMessages.listCategory = function () {
    return api.get(`/api/v1/communication/listCategory`, baseUrl);
};

ApiBulkMessages.listAllTemplate = function () {
    return api.get(`/api/v1/communication/listAllTemplate`, baseUrl);
};

ApiBulkMessages.listDoctor = function () {
    return api.get(`/api/v1/doctor`, baseUrl);
};

ApiBulkMessages.searchPatient = function (data) {
    return api.post(`/api/v1/patient/searchPatient`, data, baseUrl);
};

ApiBulkMessages.userCampaignAdd = function (data) {
    return api.post(`/api/v1/campaign/userCampaignAdd`, data, baseUrl);
};

ApiBulkMessages.userCampaignEdit = function (data) {
    return api.put(`/api/v1/campaign/userCampaignEdit`, data, baseUrl);
};

ApiBulkMessages.userCampaignDelete = function (id) {
    return api.delete(`/api/v1/campaign/userCampaignDelete/${id}`, baseUrl);
};

ApiBulkMessages.userRedeemCode = function (data) {
    return api.post(`/api/v1/communication/userRedeemCode`, data, baseUrl);
};

ApiBulkMessages.paymentOrder = function (data) {
    return api.post(`/api/v1/payment/paymentOrder`, data, baseUrl);
};

ApiBulkMessages.verifyPayment = function (data) {
    return api.post(`/api/v1/payment/verifyPayment`, data, baseUrl);
};

ApiBulkMessages.paymentHistory = function (data) {
    return api.post(`/api/v1/payment/paymentHistory`, data, baseUrl);
};

ApiBulkMessages.states = function () {
    return api.post(`/user/v2/pm/info/states`, {}, baseUserManagementUrlV2);
};

export default ApiBulkMessages;