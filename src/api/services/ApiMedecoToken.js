import axios from 'axios';
import config from '../../config';

const API_BASE_URL = config.tatvaAi_api_url;

export const getMedecoToken = async (mobileNumber) => {
  try {
    console.log('API call - getting medecoToken for mobile:', mobileNumber);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/onboarding/get-doctor-details`,
      {
        mobileNumber: mobileNumber
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};
