import api from "../../api/services/axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.symptoms_collector_api_url };

export const fetchAvatars = async function () {
  let res = {};
  try {
    res = await api.get(`/api/v1/receptionist/avatars`, baseUrl);
  } catch (e) {
    console.error("Error while fetching avatars: ", e);
  }
  return res;
};

export const fetchAgents = async function (clinicId) {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/receptionist/receptionist-agents?clinicId=${clinicId}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching avatars: ", e);
  }
  return res;
};

export const fetchClinicDetails = async function (clinicId) {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/receptionist/clinicDetails?clinicId=${clinicId}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching avatars: ", e);
  }
  return res;
};

export const setupReceptionist = async function (payload) {
  let res = {};
  try {
    // Build a clean payload for debugging and API
    const cleanPayload = {
      clinicId: payload.clinicId || payload.clinicData?.hm_id || null,
      doctors: payload.doctors,
      avatarId: payload.avatarId,
      receptionistName: payload.receptionistName,
      contact: payload.contact,
      email: payload.email,
      address: payload.fullgoogleLocation?.address?.formatted,
      pincode: payload.fullgoogleLocation?.address?.zip,
      city: payload.fullgoogleLocation?.address?.city,
      state: payload.fullgoogleLocation?.address?.state,
      latitude: payload.fullgoogleLocation?.lat,
      longitude: payload.fullgoogleLocation?.lng,
      googleMapsLink: payload.fullgoogleLocation?.address?.googleMapsLink,
      hmBusinessId: payload.hospitalBusinessId,
      // receptionistId: payload.receptionistId
    };

    // Handle logo and clinicName based on useUploadLogo flag
    if (payload.useUploadLogo) {
      // If useUploadLogo is true, pass logo as is and clinicName as null
      cleanPayload.logo = payload.logo;
      cleanPayload.clinicName = null;
    } else {
      // If useUploadLogo is false, make logo null and pass clinicName
      cleanPayload.logo = null;
      cleanPayload.clinicName = payload.clinicName;
    }

    const formData = new FormData();
    formData.append('clinicId', cleanPayload.clinicId);
    formData.append('name', cleanPayload.receptionistName);
    formData.append('contact', cleanPayload.contact);
    formData.append('email', cleanPayload.email);
    formData.append('avatarId', cleanPayload.avatarId);
    formData.append('hmBusinessId', cleanPayload.hmBusinessId);
    // formData.append('receptionId', cleanPayload.receptionistId);

    // Add logo or clinicName based on useUploadLogo flag
    if (payload.useUploadLogo && payload.logo) {
      formData.append('logoFiles', payload.logo);
    } else if (!payload.useUploadLogo && payload.clinicName) {
      formData.append('clinicName', payload.clinicName);
    }

    // Add googleLocation as JSON string
    const googleLocation = {
      lat: cleanPayload.latitude,
      lng: cleanPayload.longitude,
      address: {
        state: cleanPayload.state,
        city: cleanPayload.city,
        street: cleanPayload.address,
        zip: cleanPayload.pincode,
        formatted: cleanPayload.address,
        googleMapsLink: cleanPayload.googleMapsLink
      }
    };
    formData.append('googleLocation', JSON.stringify(googleLocation));
    formData.append('doctors', JSON.stringify(cleanPayload.doctors));

    // Update headers for multipart/form-data
    const headers = {
      'Content-Type': 'multipart/form-data',
      'x-api-key': '4e4cda9d-a277-4f7e-a3ff-14240c4a4974'
    };

    res = await api.post(`/api/v1/receptionist/setup`, formData, { ...baseUrl, headers });
  } catch (e) {
    console.error("Error while setting up receptionist: ", e);
  }
  return res;
};

export const fetchGoogleMapsLink = async function (hm_id) {
  let res = {};
  const headers = {
    "x-api-key": "4e4cda9d-a277-4f7e-a3ff-14240c4a4974",
  };
  try {
    res = await api.get(
      `/api/v1/receptionist-agent/get-google-maps-link?hm_id=${hm_id}`,
      { ...baseUrl, headers }
    );
  } catch (e) {
    console.error("Error while fetching google maps link: ", e);
  }
  return res?.googleMapsLink;
};