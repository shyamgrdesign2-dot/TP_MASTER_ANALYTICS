import api from "../../api/services/axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.visit_api_url };

export const addAppointment = async (data) => {
    let res = {};
    try {
        const response = await api.post(`/api/v1/appointment`, data, baseUrl);
        if (response?.status === undefined) {
            res = { status: true, ...response };
        } else {
            res = { status: false, message: response?.data?.message };
        }
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message };
        // throw error.response ? error.response.data : error;
    }
    return res;
};

export const getSlotsList = async (doctorId, date) => {
    let res = {};
    try {
        const response = await api.get(`/api/v1/appointment/listSlots?doctorId=${doctorId}&date=${date}`, baseUrl);
        if (response?.status === undefined) {
            res = { status: true, ...response };
        } else {
            res = { status: false, message: response?.data?.message };
        }
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message };
    }
    return res;
};

export const getTeleconsultSlotsList = async (doctorId, date) => {
    let res = {};
    try {
        const response = await api.get(
            `/api/v1/appointment/listSlots?doctorId=${doctorId}&date=${date}&pam_status_type_appointment=2`,
            baseUrl
        );
        const slots = response?.data?.slots ?? response?.slots;
        if (slots !== undefined) {
            res = { status: true, slots };
        } else {
            res = { status: false, message: response?.data?.message || response?.message || "Failed to fetch slots" };
        }
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error fetching slots" };
    }
    return res;
};

export const bookTeleconsult = async (data) => {
    let res = {};
    try {
        const body = { ...data, appointment_type: 2 };
        const response = await api.post("/api/v1/appointment", body, baseUrl);
        const responseData = response?.data ?? response;
        const appointmentId = responseData?.appointment_id ?? responseData?.appointmentId;
        if (appointmentId !== undefined && appointmentId !== null) {
            res = {
                status: true,
                appointment_id: responseData.appointment_id ?? appointmentId,
                consultationId: responseData.consultationId,
                patientMeetingLink: responseData.patientMeetingLink,
            };
        } else {
            res = { status: false, message: responseData?.message || "Failed to book" };
        }
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error booking appointment" };
    }
    return res;
};
