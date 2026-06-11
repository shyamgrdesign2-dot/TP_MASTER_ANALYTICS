import api from '../../../api/services/axiosService';
import { env } from '../../../EnvironmentConfig';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../../../utils/constants';

// Base URL for tab-rx API calls
const baseUrl = { customBaseUrl: env.digitization_api_url };

const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
const cleanedToken = token?.replace(/['"]+/g, "");

// Get files for tab-rx
export const getTabRxFiles = async (tcmId, patientUniqueId) => {
  try {
    const requestConfig = {
      headers: { Authorization: `Bearer ${cleanedToken}` },
      params: {
        tcm_id: tcmId,
        patient_unique_id: patientUniqueId
      },
      ...baseUrl
    };
    
    const response = await api.get('/api/v1/tab-rx/get-files', requestConfig);
    
    return {
      success: true,
      data: response.data || response
    };
  } catch (error) {
    console.error('Failed to fetch tab-rx files:', error);
    let errorMessage = 'Unable to fetch files. Please try again.';
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// Upload files for tab-rx
// files: Array of File/Blob objects or { file: File/Blob, fieldName?: string }
export const uploadTabRxFiles = async (files, onProgress) => {
  
  try {
    // Validate files
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.error('❌ [tabRxService] Files validation failed:', { files });
      throw new Error('Files array is required and must not be empty');
    }

    const formData = new FormData();
    
    // Append files to form data
    // Note: Based on curl example, empty field names are used, but we'll use a proper field name
    // to ensure FormData is properly constructed and visible in network inspector
    files.forEach((fileItem, index) => {
      if (!fileItem) {
        throw new Error(`File at index ${index} is undefined`);
      }
      
      let file;
      
      // Support both direct File/Blob or object with file property
      if (fileItem instanceof File || fileItem instanceof Blob) {
        file = fileItem;
      } else if (fileItem.file) {
        file = fileItem.file;
      } else {
        throw new Error(`Invalid file format at index ${index}. Expected File, Blob, or { file: File/Blob }`);
      }
      
      // Append file - using empty field name as per API requirement (curl shows --form '=@"..."')
      // Some browsers/network inspectors may not show empty field names, but the API accepts them
      formData.append('', file);
      
    });
    
    // Debug: Log FormData entries to verify they're being added
    console.log('📦 [tabRxService] FormData entries:', {
      entryCount: Array.from(formData.entries()).length,
      entries: Array.from(formData.entries()).map(([key, value]) => ({
        key: key || '(empty)',
        valueType: value instanceof File ? 'File' : typeof value,
        fileName: value instanceof File ? value.name : 'N/A',
        fileSize: value instanceof File ? `${(value.size / 1024).toFixed(2)}KB` : 'N/A'
      }))
    });
    
    console.log('📦 [tabRxService] FormData created, making API call...');
    const requestConfig = {
      headers: { 
        // Don't set Content-Type manually - axios will set it with proper boundary for FormData
        Authorization: `Bearer ${cleanedToken}`
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.lengthComputable) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
      ...baseUrl
    };
    
    const response = await api.post('/api/v1/tab-rx/upload-files', formData, requestConfig);
    const responseData = response.data || response;
    
    // Extract uploaded file names from response
    // Response format: { uploaded_files: ["tab_rx_1772688725577_6124949174.jpeg", ...] }
    const uploadedFileNames = responseData?.uploaded_files || responseData?.data?.uploaded_files || [];
    
    return {
      success: true,
      data: responseData,
      uploadedFileNames: uploadedFileNames // Return the file names from API response
    };
  } catch (error) {
    console.error('❌ [tabRxService] Failed to upload tab-rx files:', error);
    let errorMessage = 'Upload failed. Please try again.';
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// Upsert RX for tab-rx
export const upsertTabRxRx = async (rxData) => {
  try {
    // Validate required fields
    if (!rxData) {
      throw new Error('RX data is required');
    }
    
    if (!rxData.patient_unique_id) {
      throw new Error('patient_unique_id is required');
    }
    
    if (!rxData.tcm_id) {
      throw new Error('tcm_id is required');
    }
    
    // if (!rxData.canvasFileName) {
    //   throw new Error('canvasFileName is required');
    // }

    const requestConfig = {
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanedToken}`
      },
      ...baseUrl
    };
    
    const response = await api.post('/api/v1/tab-rx/upsert-rx', rxData, requestConfig);
    
    return {
      success: true,
      data: response.data || response
    };
  } catch (error) {
    console.error('Failed to upsert tab-rx RX:', error);
    let errorMessage = 'Failed to save RX. Please try again.';
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};
