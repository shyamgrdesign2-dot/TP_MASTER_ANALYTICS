import { pdfjs } from "react-pdf";

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const DIMENSION_TOLERANCE = 10;

export const isA4Size = (width, height) => {
  const isPortrait = 
    Math.abs(width - A4_WIDTH) <= DIMENSION_TOLERANCE && 
    Math.abs(height - A4_HEIGHT) <= DIMENSION_TOLERANCE;
  const isLandscape = 
    Math.abs(width - A4_HEIGHT) <= DIMENSION_TOLERANCE && 
    Math.abs(height - A4_WIDTH) <= DIMENSION_TOLERANCE;
  return isPortrait || isLandscape;
};

export const validateA4Size = async (file) => {
  const fileUrl = URL.createObjectURL(file);
  try {
    const loadingTask = pdfjs.getDocument(fileUrl);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const { width, height } = viewport;
    const isValidSize = isA4Size(width, height);
    if (!isValidSize) {
      return {
        isValid: false,
        error: `PDF dimensions (${Math.round(width)} × ${Math.round(height)} points) do not match A4 size. Please ensure your document is in A4 format.`,
        dimensions: { width, height }
      };
    }
    return {
      isValid: true,
      dimensions: { width, height }
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Could not read PDF file. Please ensure the file is a valid PDF document.'
    };
  } finally {
    URL.revokeObjectURL(fileUrl);
  }
};

export const validateCanvasFile = async (file) => {
  const errors = [];
  if (file.type !== 'application/pdf') {
    errors.push('Only PDF format is supported');
  }
  if (file.size > 8 * 1024 * 1024) {
    errors.push('File size must be under 8MB');
  }
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  const a4Result = await validateA4Size(file);
  if (!a4Result.isValid) {
    errors.push(a4Result.error);
  }
  return {
    isValid: errors.length === 0,
    errors,
    dimensions: a4Result.dimensions
  };
};

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  return `${baseName}_${timestamp}_${randomSuffix}.${extension}`;
}; 