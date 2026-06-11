import api from '../../../api/services/axiosService';
import config from '../../../config';
import { env } from "../../../EnvironmentConfig";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../../../utils/constants';
import { getDecodedToken } from '../../../utils/localStorage';

// Base URL for custom smart sync API calls - using the URL from your working cURL
const baseUrl = { customBaseUrl: env.digitization_api_url };

const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
const cleanedToken = token?.replace(/['"]+/g, "");
const decodedToken = getDecodedToken();
const doctorId = decodedToken?.result?.user_id;

// Get all custom smart sync pad templates
export const getCustomSyncPadTemplates = async () => {
  try {
    const response = await api.get('/api/v1/custom-smart-sync-pad/get-files', baseUrl);
    return {
      success: true,
      data: response.data || response // Handle different response structures
    };
  } catch (error) {
    console.error('Failed to fetch templates:', error.message);
    return {
      success: false,
      error: 'Unable to fetch templates. Please try again.'
    };
  }
};

// Upload new custom smart sync pad template
export const uploadCustomSyncPadTemplate = async (templateData, onProgress) => {
  try {
    
    // Validate templateData structure
    if (!templateData) {
      throw new Error('Template data is undefined');
    }
    
    if (!templateData.title) {
      throw new Error('Template title is missing');
    }
    
    if (!templateData.files || !Array.isArray(templateData.files)) {
      throw new Error('Template files array is missing or invalid');
    }
    
    if (templateData.files.length === 0) {
      throw new Error('No files provided for upload');
    }

    const formData = new FormData();
    formData.append('title', templateData.title);
    
    // If a source is provided (e.g. 'tab-rx' from TabRxCanvas), include it in the upload
    if (templateData.source) {
      formData.append('source', templateData.source);
    }
    
    templateData.files.forEach((file, index) => {
      if (!file) {
        throw new Error(`File at index ${index} is undefined`);
      }
      
      if (!file.uploadFile) {
        throw new Error(`uploadFile property missing at index ${index}`);
      }
      
      if (!(file.uploadFile instanceof File) && !(file.uploadFile instanceof Blob)) {
        throw new Error(`uploadFile at index ${index} is not a File or Blob object, got: ${typeof file.uploadFile}`);
      }
      
      formData.append('uploaded_files', file.uploadFile);
    });
    
    const metadata = templateData.files.map((file, index) => {
      if (!file?.uploadFile) {
        throw new Error(`Cannot create metadata: uploadFile missing at index ${index}`);
      }
      
      if (!file.uploadFile.name) {
        throw new Error(`Cannot create metadata: uploadFile.name missing at index ${index}`);
      }
      
      return {
        fileName: file.uploadFile.name,
        order: file.order || index + 1
      };
    });
    
    formData.append('metadata', JSON.stringify(metadata));
    
    const requestConfig = {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${cleanedToken}`},
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.lengthComputable) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
      ...baseUrl
    };
        
    try {
      const responseData = await api.post('/api/v1/custom-smart-sync-pad/upload-files', formData, requestConfig);
            
      // Check if we have valid response data - the API returns an object with id, uploaded_files, and title
      if (responseData && responseData.id && responseData.uploaded_files && responseData.title) {
        
        return {
          success: true,
          data: responseData
        };
      } else if (responseData) {
        // We got some response but it doesn't match expected structure
        return {
          success: true, // Still consider it successful since we got a response
          data: responseData
        };
      } else {
        return {
          success: false,
          error: 'API returned empty response'
        };
      }
    } catch (apiError) {
      console.error('API Call failed:', apiError.message);
      // Re-throw the error to be caught by outer catch block
      throw apiError;
    }
  } catch (error) {
    console.error('Upload failed:', error.message);
    
    let errorMessage = 'Upload failed. Please try again.';
    if (error.response?.data?.message) errorMessage = error.response.data.message;
    else if (error.message) errorMessage = error.message;
    return { success: false, error: errorMessage };
  }
};

// Update existing custom smart sync pad template
export const updateCustomSyncPadTemplate = async (templateId, templateData, onProgress) => {
  try {
    
    const formData = new FormData();
    formData.append('title', templateData.title);
    
    templateData.files.forEach((file, index) => {
      formData.append('uploaded_files', file.uploadFile);
    });
    
    const metadata = templateData.files.map((file, index) => ({
      fileName: file.uploadFile.name,
      order: file.order || index + 1
    }));
    formData.append('metadata', JSON.stringify(metadata));
    
    const requestConfig = {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${cleanedToken}`},
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.lengthComputable) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    };
    
    const responseData = await api.put(`/api/v1/custom-smart-sync-pad/update-files/${templateId}`, formData, { ...requestConfig, ...baseUrl });
    
    return {
      success: true,
      data: responseData
    };
  } catch (error) {
    console.error('Template update failed:', error);
    let errorMessage = 'Update failed. Please try again.';
    if (error.response?.data?.message) errorMessage = error.response.data.message;
    else if (error.message) errorMessage = error.message;
    return { success: false, error: errorMessage };
  }
};

// Delete custom smart sync pad template
export const deleteCustomSyncPadTemplate = async (templateId) => {
  try {
    
    const response = await api.delete(`/api/v1/custom-smart-sync-pad/delete-files/${templateId}`, baseUrl);
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Delete failed:', error);
    
    let errorMessage = 'Unable to delete template. Please try again.';
    
    if (error.response?.status === 404) {
      errorMessage = 'Template not found. It may have already been deleted.';
    } else if (error.response?.status === 403) {
      errorMessage = 'You do not have permission to delete this template.';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error occurred while deleting template.';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    return { success: false, error: errorMessage };
  }
}; 

// Set custom smart sync pad template as default
export const setDefaultCustomSyncPadTemplate = async (templateId) => {
  try {
    const requestConfig = {
      headers: { Authorization: `Bearer ${cleanedToken}` },
      ...baseUrl
    };
    
    const response = await api.get(`/api/v1/custom-smart-sync-pad/set-default/${templateId}`, requestConfig);
    
    return { 
      success: true, 
      data: response.data || response,
      message: 'Template set as default successfully'
    };
  } catch (error) {
    console.error('Set default failed:', error);
    
    // let errorMessage = 'Unable to set template as default. Please try again.';
    
    // if (error.response?.status === 404) {
    //   errorMessage = 'Template not found.';
    // } else if (error.response?.status === 403) {
    //   errorMessage = 'You do not have permission to modify this template.';
    // } else if (error.response?.status === 500) {
    //   errorMessage = 'Server error occurred while setting template as default.';
    // } else if (error.response?.data?.message) {
    //   errorMessage = error.response.data.message;
    // }
  }
}; 

