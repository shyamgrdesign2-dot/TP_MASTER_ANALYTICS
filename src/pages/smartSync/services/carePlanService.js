import api from '../../../api/services/axiosService';
import { env } from "../../../EnvironmentConfig";
const defaultBaseUrl = { customBaseUrl: env.upload_doc_api_url };
// GET /api/v1/care-plans/fetch-plans - Get all care plan names
export const getCarePlanNames = async (options = {}) => {
  const base = options.baseUrl || defaultBaseUrl;
  
  
  const authToken = localStorage.getItem('PERSISTANT_STORAGE_KEY_AUTH_TOKEN');
  if (authToken) {
    try {
      const parsedToken = JSON.parse(authToken);
      
    } catch (e) {
      
    }
  }
  
  try {
    const response = await api.get(`/api/v1/care-plans/fetch-plans`, base);
    
    return response;
  } catch (error) {
    
    
    if (error.response?.status === 401) {
      
      try {
        const authToken = localStorage.getItem('PERSISTANT_STORAGE_KEY_AUTH_TOKEN');
        if (authToken) {
          const parsedToken = JSON.parse(authToken);
          const directResponse = await fetch(`${base.customBaseUrl}/api/v1/care-plans/fetch-plans`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${parsedToken}`,
            },
          });
          
          if (directResponse.ok) {
            const data = await directResponse.json();
            
            return data;
          } else {
            
          }
        }
      } catch (fetchError) {
        console.error('CarePlanService: Direct fetch with token error:', fetchError);
      }
    }
    
    
    if (error.message.includes('CORS') || error.message.includes('Network Error') || !error.response) {
      try {
        const directResponse = await fetch(`${base.customBaseUrl}/api/v1/care-plans/names`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
       
        if (directResponse.ok) {
          const data = await directResponse.json();
         
          return data;
        } else {
          console.error('CarePlanService: Direct fetch failed:', directResponse.status, directResponse.statusText);
        }
      } catch (fetchError) {
        console.error('CarePlanService: Direct fetch error:', fetchError);
      }
    }
    
    throw error;
  }
};




export const assignCarePlan = async (payload, options = {}) => {
  const base = options.baseUrl || defaultBaseUrl;
  
  // Backend requires 'care_plan_id'
  const payloadToSend = {
    care_plan_id: payload.plan_id,
    um_id: payload.um_id,
    patient_unique_id: payload.patient_unique_id,
    hm_id: payload.hm_id,
    ...(payload.tcm_id ? { tcm_id: payload.tcm_id } : {})
  };

  return api.post(`/api/v1/care-plans/assign`, payloadToSend, base);
};

// PUT /api/v1/care-plans/update - Update care plan name for a given tcm_id
export const updateCarePlanName = async (tcmId, planName, options = {}) => {
  const base = options.baseUrl || defaultBaseUrl;
  const payload = { tcm_id: tcmId, plan_name: planName };

  try {
    const response = await api.put(`/api/v1/care-plans/update`, payload, base);
    return response;
  } catch (error) {
    // Attempt direct fetch with stored token on auth error
    if (error?.response?.status === 401) {
      try {
        const authToken = localStorage.getItem('PERSISTANT_STORAGE_KEY_AUTH_TOKEN');
        if (authToken) {
          const parsedToken = JSON.parse(authToken);
          const directResponse = await fetch(`${base.customBaseUrl}/api/v1/care-plans/update`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${parsedToken}`,
            },
            body: JSON.stringify(payload),
          });

          if (directResponse.ok) {
            const data = await directResponse.json();
            return data;
          }
        }
      } catch (fetchError) {
        console.error('CarePlanService: Direct fetch update error:', fetchError);
      }
    }

    // Fallback for CORS/network issues (no response object)
    if (error?.message?.includes('CORS') || error?.message?.includes('Network Error') || !error?.response) {
      try {
        const directResponse = await fetch(`${base.customBaseUrl}/api/v1/care-plans/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (directResponse.ok) {
          const data = await directResponse.json();
          return data;
        }
      } catch (fetchError) {
        console.error('CarePlanService: Direct fetch (no auth) update error:', fetchError);
      }
    }

    throw error;
  }
};

// GET /api/v1/care-plans/assignments - Get patient care plan assignments
export const getCarePlanAssignments = async (patientId, options = {}) => {
  const base = options.baseUrl || defaultBaseUrl;
  
  try {
    const response = await api.get(`/api/v1/care-plans/assignments?patient_unique_id=${patientId}`, base);
    return response;
  } catch (error) {
    console.error('CarePlanService: Error fetching care plan assignments:', error);
    
    // Fallback with direct fetch
    if (error.response?.status === 401) {
      try {
        const authToken = localStorage.getItem('PERSISTANT_STORAGE_KEY_AUTH_TOKEN');
        if (authToken) {
          const parsedToken = JSON.parse(authToken);
          const directResponse = await fetch(`${base.customBaseUrl}/api/v1/care-plans/assignments?patient_unique_id=${patientId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${parsedToken}`,
            },
          });
          
          if (directResponse.ok) {
            const data = await directResponse.json();
            return data;
          }
        }
      } catch (fetchError) {
        console.error('CarePlanService: Direct fetch assignments error:', fetchError);
      }
    }
    
    throw error;
  }
};



