import api from '../../../api/services/axiosService';
import { env } from '../../../EnvironmentConfig';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../../../utils/constants';
import { getCustomSyncPadTemplates } from '../../smartSync/services/uploadService';

// Base URL for custom smart sync API calls
const baseUrl = { customBaseUrl: env.digitization_api_url };

const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
const cleanedToken = token?.replace(/['"]+/g, "");

// Get all templates for tabRx
export const getTemplates = async () => {
  try {
    const result = await getCustomSyncPadTemplates();
    if (result.success && result.data) {
      return {
        success: true,
        data: Array.isArray(result.data) ? result.data : []
      };
    }
    return {
      success: false,
      data: [],
      error: result.error || 'Unable to fetch templates'
    };
  } catch (error) {
    console.error('Error fetching templates:', error);
    return {
      success: false,
      data: [],
      error: 'Failed to fetch templates. Please try again.'
    };
  }
};

// Get metadata for custom smart sync pad
export const getMetadata = async () => {
  try {
    const requestConfig = {
      headers: { Authorization: `Bearer ${cleanedToken}` },
      ...baseUrl
    };

    const response = await api.get('/api/v1/custom-smart-sync-pad/metadata', requestConfig);

    return {
      success: true,
      data: response.data || response
    };
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    let errorMessage = 'Unable to fetch metadata. Please try again.';

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

// Set metadata for custom smart sync pad
export const setMetadata = async (format, isSelectLetterHead) => {
  try {
    const requestConfig = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanedToken}`
      },
      ...baseUrl
    };

    const response = await api.post(
      '/api/v1/custom-smart-sync-pad/metadata',
      { format, isSelectLetterHead },
      requestConfig
    );

    return {
      success: true,
      data: response.data || response
    };
  } catch (error) {
    console.error('Failed to set metadata:', error);
    let errorMessage = 'Unable to set metadata. Please try again.';

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

// Upload files for custom smart sync pad (for tab-rx)
export const uploadFiles = async (templateData, onProgress) => {
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
    formData.append('source', 'tab-rx');

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
      headers: {
        'Content-Type': 'multipart/form-data',
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

    const responseData = await api.post('/api/v1/custom-smart-sync-pad/upload-files', formData, requestConfig);

    if (responseData && responseData.id && responseData.uploaded_files && responseData.title) {
      return {
        success: true,
        data: responseData
      };
    } else if (responseData) {
      return {
        success: true,
        data: responseData
      };
    } else {
      return {
        success: false,
        error: 'API returned empty response'
      };
    }
  } catch (error) {
    console.error('Template upload failed:', error);
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