import axios from 'axios';
import config from '../../config';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../../utils/constants';

const baseUrl = config.central_auth_api_url;
const userMgmtUrl = config.user_management_api_url;

export const loginWithPassword = async (phoneNumber, password) => {
  try {
    const response = await axios.post(`${baseUrl}/api/v1/auth/password-login`, {
      phone_number: phoneNumber,
      password,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const validateUser = async (phoneNumber) => {
  try {
    const response = await axios.post(`${baseUrl}/api/v1/auth/check-user`, {
      phone_number: phoneNumber,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const verifyAccessToken = async (phoneNumber, accessToken, password = null) => {
  try {
    const requestBody = {
      phone_number: phoneNumber,
      access_token: accessToken,
    };
    
    // Include password if provided
    if (password) {
      requestBody.password = password;
    }
    
    const response = await axios.post(`${baseUrl}/api/v1/auth/verify-access-token`, requestBody);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

/**
 * @deprecated This API endpoint is being removed. 
 * Password should now be sent in verify-access-token API instead.
 * This function is kept temporarily for backward compatibility with SetPassword component.
 */
export const setPassword = async (uniqueId, password) => {
  try {
    const response = await axios.put(`${baseUrl}/api/v1/auth/set-password`, {
      doctor_unique_id: uniqueId,
      password,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const checkPediaExists = async (body) => {
  try {
    const response = await axios.post(`${userMgmtUrl}/user/tatva/check`, JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
        'api_key': config.lite_api_key,
        'api_secret_key': config.lite_secret_key,
      }
    });
    return response;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const getSpecialityList = async () => {
  try {
    const response = await axios.post(`${userMgmtUrl}/master/pm-specialities`, {});
    return response;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}

export const onboardUser = async (body) => {
  try {

    const response = await axios.post(`${baseUrl}/api/v1/oauth2/signup`, JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response;

  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}

export const setupClinic = async (body) => {
  try {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    const cleanedToken = token?.replace(/['"]+/g, '');
    const response = await axios.post(`${userMgmtUrl}/user/tatva/v2/clinic-setup`, JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanedToken}`,
      }
    });
    return response;


  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}

export const checkAccountStatus = async (phoneNumber, doctorUniqueId) => {
  try {
    const response = await axios.post(`${baseUrl}/api/v1/auth/account-status`, {
      phone_number: phoneNumber,
      doctor_unique_id: doctorUniqueId
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

