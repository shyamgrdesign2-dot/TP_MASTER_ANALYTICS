import React, { useState, useRef, useEffect } from 'react';
import { Drawer, Button, message } from 'antd';
import { PlusOutlined, MinusOutlined, RedoOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { pdfjs } from "react-pdf";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { dataUrlToFileUsingFetch } from '../../../utils/utils';
import { validateCanvasFile } from '../services/fileUtils';
import { 
  uploadCustomSyncPadTemplate, 
  updateCustomSyncPadTemplate,
  getCustomSyncPadTemplates,
  deleteCustomSyncPadTemplate 
} from '../services/uploadService';
import CommonModal from "../../../common/CommonModal";
import './RxTemplateUploadDrawer.scss';

import { useSelector } from 'react-redux';
import { getDecodedToken } from '../../../utils/localStorage';
import { CUSTOM_CANVAS_DOCTORS_USER_ID } from '../../../utils/constants';
import { ASSETS } from "../../../assets";
const {
  rxUploadIllustration,
  upload: uploadIcon,
  alerticon: alertIcon,
  arrowLeft: ArrowLeft,
  reupload: reuploadIcon,
  tutorial: tutorialIcon,
} = ASSETS.images;

// Optional `source` prop allows callers (e.g. tabRx) to tag uploads with a source,
// which will be forwarded to the upload API (added to FormData).
const RxTemplateUploadDrawer = ({ visible, onClose, onSave, source }) => {
  const [file, setFile] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [isFileFormatModalOpen, setIsFileFormatModalOpen] = useState(false);
  const [isFileSizeExceeded, setIsFileSizeExceeded] = useState(false);
  const [isA4ValidationError, setIsA4ValidationError] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // ✅ Add processing state
  const inputFileRef = useRef(null);
  const reuploadFileRef = useRef(null); // ✅ Separate ref for reupload
  const addMoreFileRef = useRef(null); // ✅ Separate ref for add more functionality
  // const cropperRef = useRef(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const autoSaveTimeoutRef = useRef(null); // For debouncing auto-save operations
  const currentPageIndexRef = useRef(0); // Track current page index for timeouts
  const {
    profile,
  } = useSelector((state) => state.doctors);

  const docID = getDecodedToken()?.result?.user_id;
  const isCustomCanvasMaxEnabled = CUSTOM_CANVAS_DOCTORS_USER_ID.includes(docID);
  const MAX_PAGES = isCustomCanvasMaxEnabled ? 20 : 5;

  // Drag and drop sensors for page reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ✅ Add cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup function for component unmount
      try {

        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        // Clear any pending timeouts
        const timeouts = window.timeouts || [];
        timeouts.forEach(timeout => clearTimeout(timeout));
        window.timeouts = [];
        
        // Clear all file inputs
        if (inputFileRef.current) {
          inputFileRef.current.value = null;
        }
        if (reuploadFileRef.current) {
          reuploadFileRef.current.value = null;
        }
        if (addMoreFileRef.current) {
          addMoreFileRef.current.value = null;
        }
      } catch (error) {
        console.error('Error during component cleanup:', error);
      }
    };
  }, []);

  // ✅ Add beforeunload handler for page/tab close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isProcessing || isValidating || isAddingMore) {
        e.preventDefault();
        e.returnValue = 'You have an upload in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProcessing, isValidating, isAddingMore]);

  // Keep ref in sync with selectedPageIndex
  useEffect(() => {
    currentPageIndexRef.current = selectedPageIndex;
  }, [selectedPageIndex]);

  // Reset state when drawer is closed
  useEffect(() => {
    if (!visible) {
      // Reset all state when drawer becomes invisible
      setFile(null);
      setZoom(1);
      setSelectedPageIndex(0);
      setIsValidating(false);
      setIsAddingMore(false);
      setIsFileFormatModalOpen(false);
      setIsFileSizeExceeded(false);
      setIsA4ValidationError(false);
      setValidationError('');
      setIsProcessing(false);
      
      // Clear all file inputs
      if (inputFileRef.current) {
        inputFileRef.current.value = null;
      }
      if (reuploadFileRef.current) {
        reuploadFileRef.current.value = null;
      }
      if (addMoreFileRef.current) {
        addMoreFileRef.current.value = null;
      }
      
      // Clear any pending timeouts
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    }
  }, [visible]);

  // Helper: check if all pages are ready for submission
  const allPagesReady = file?.pages?.every(page => {
    // Page is ready if:
    // 1. It has been cropped (page.croppedImage exists) - user saved the crop
    // 2. OR it has been edited with rotation/zoom but not cropped (rotation/zoom are valid edits)
    // 3. OR it hasn't been edited at all (user never interacted with it)
    return page.croppedImage || (page.hasBeenEdited && (page.rotation !== 0 || page.zoom !== 1)) || !page.hasBeenEdited;
  });

  // Helper: get page status for visual indicators - removed status colors

  // Convert PDF to image for cropping with timeout and corruption handling
  const convertPdfToImages = async (pdfFile) => {
    const fileUrl = URL.createObjectURL(pdfFile);
    const TIMEOUT_MS = 30000; // 30 seconds timeout
    
    try {
      // ✅ Add timeout for PDF loading
      const loadingTask = pdfjs.getDocument(fileUrl);
      const pdf = await Promise.race([
        loadingTask.promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF loading timeout')), TIMEOUT_MS)
        )
      ]);
      
      // ✅ Validate PDF structure
      if (!pdf || typeof pdf.numPages !== 'number' || pdf.numPages <= 0) {
        throw new Error('Invalid PDF structure: no pages found');
      }
      
      // ✅ Limit number of pages to prevent memory issues
      // const docID = getDecodedToken()?.user_id
      // const isCustomCanvasMaxEnabled = CUSTOM_CANVAS_DOCTORS_USER_ID.includes(docID);
      // const MAX_PAGES = isCustomCanvasMaxEnabled ? 20 : 5;
      if (pdf.numPages > MAX_PAGES) {
        throw new Error(`PDF has too many pages (${pdf.numPages}). Maximum allowed is ${MAX_PAGES}.`);
      }
      
      const numPages = pdf.numPages;
      const images = [];
      
      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          // ✅ Reduce scale to 1.5 for smaller file sizes while maintaining quality
          const viewport = page.getViewport({ scale: 1.5 });
          
          // ✅ Validate page dimensions
          if (viewport.width <= 0 || viewport.height <= 0) {
            throw new Error(`Invalid page dimensions on page ${i}`);
          }
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
            background: 'white',
          };
          
          // ✅ Add timeout for page rendering
          await Promise.race([
            page.render(renderContext).promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Page ${i} rendering timeout`)), 10000)
            )
          ]);
          
          // ✅ Use JPEG with lower quality for smaller file sizes
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          // ✅ Validate generated image
          if (!imageDataUrl || imageDataUrl === 'data:,') {
            throw new Error(`Failed to generate image for page ${i}`);
          }
          
          images.push({
            image: imageDataUrl,
            crop: true,
            showFile: imageDataUrl,
            croppedImage: null,
            hasBeenEdited: false,
            isReady: true,
            zoom: 1,
            rotation: 0,
            dimensions: { width: viewport.width, height: viewport.height },
            name: '',
            // Auto-save state tracking for each page
            autoSavedState: {
              zoom: 1,
              rotation: 0,
              cropBoxData: null,
              croppedImage: null,
              hasBeenEdited: false
            },
            originalState: {
              image: imageDataUrl,
              zoom: 1,
              rotation: 0
            }
          });
          
        } catch (pageError) {
          console.error(`Error processing page ${i}:`, pageError);
          throw new Error(`Failed to process page ${i}: ${pageError.message}`);
        }
      }
      
      return images;
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      
      // ✅ Provide specific error messages
      if (error.message.includes('timeout')) {
        throw new Error('PDF processing took too long. Please try with a smaller file.');
      } else if (error.message.includes('Invalid PDF structure')) {
        throw new Error('The PDF file appears to be corrupted or invalid.');
      } else if (error.message.includes('too many pages')) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to convert PDF to images. Please ensure the file is a valid PDF.');
      }
    } finally {
      URL.revokeObjectURL(fileUrl);
    }
  };

  const handleFileChange = async (e) => {
    // ✅ Prevent multiple simultaneous uploads
    if (isProcessing || isValidating) {
      message.warning('Please wait for the current operation to complete.');
      return;
    }
    
    if (e.target.files?.length > 0) {
      const fileUrl = e.target.files[0];
      
      setIsValidating(true);
      setIsProcessing(true);
      
      try {
        // Comprehensive validation using existing utility
        const validationResult = await validateCanvasFile(fileUrl);
        
        if (!validationResult.isValid) {
          // Handle different types of validation errors
          if (validationResult.errors.some(err => err.includes('PDF dimensions'))) {
            setValidationError(validationResult.errors.find(err => err.includes('PDF dimensions')));
            setIsA4ValidationError(true);
          } else if (validationResult.errors.some(err => err.includes('Only PDF format'))) {
            setIsFileFormatModalOpen(true);
          } else if (validationResult.errors.some(err => err.includes('8MB'))) {
            setIsFileSizeExceeded(true);
          } else {
            setValidationError(validationResult.errors[0]);
            setIsA4ValidationError(true);
          }
          setIsValidating(false);
          return;
        }
        
        // Remove Add More logic from here
        // Only handle normal upload: Replace all pages
        const images = await convertPdfToImages(fileUrl);
        const pages = images.map((img, index) => ({ 
          ...img, 
          hasBeenEdited: false,
          isReady: true,
          zoom: 1,
          rotation: 0,
          croppedImage: null,
          cropBoxData: null,
          uploadFile: null,
          showFile: img.image, // Use the original image as showFile
          id: `page-${Date.now()}-${index}`, // Add unique ID for drag and drop
          // Auto-save state tracking for initial pages
          autoSavedState: {
            zoom: 1,
            rotation: 0,
            cropBoxData: null,
            croppedImage: null,
            hasBeenEdited: false
          },
          originalState: {
            image: img.image,
            zoom: 1,
            rotation: 0
          }
        }));
        setFile({
          pages: pages,
          originalFile: fileUrl,
          dimensions: validationResult.dimensions,
          name: '',
        });
        setSelectedPageIndex(0);
        
        setZoom(1);
        
      } catch (error) {
        console.error('Error processing PDF:', error);
        message.error('Failed to process PDF file. Please try again.');
      } finally {
        setIsValidating(false);
        setIsAddingMore(false);
        setIsProcessing(false);
      }
    }
  };

  // Drag and drop handlers for page reordering
  const handleDragStart = (event) => {
    // Prevent page selection during drag
    if (isProcessing) {
      event.preventDefault();
      return;
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id && file?.pages) {
      const oldIndex = file.pages.findIndex(page => page.id === active.id);
      const newIndex = file.pages.findIndex(page => page.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newPages = arrayMove(file.pages, oldIndex, newIndex);
        
        // Update the file with reordered pages
        setFile(prev => ({
          ...prev,
          pages: newPages
        }));

        // Update selected page index if needed
        if (selectedPageIndex === oldIndex) {
          setSelectedPageIndex(newIndex);
        } else if (selectedPageIndex > oldIndex && selectedPageIndex <= newIndex) {
          setSelectedPageIndex(selectedPageIndex - 1);
        } else if (selectedPageIndex < oldIndex && selectedPageIndex >= newIndex) {
          setSelectedPageIndex(selectedPageIndex + 1);
        }

      }
    }
  };

  // Sortable thumbnail component
  const SortableThumbnail = ({ page, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: page.id || index });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`page-thumbnail ${selectedPageIndex === index ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
        onClick={() => {
          if (!file?.pages || !file.pages[index]) {
            return;
          }
          
          if (isProcessing) {
            message.warning('Please wait for the current operation to complete.');
            return;
          }
          
          setSelectedPageIndex(index);
          // Don't reset zoom - let restorePageState handle it
        }}
        {...attributes}
        {...listeners}
      >
        <img src={page.showFile} alt={`Page ${index + 1}`} />
        <div className="drag-handle">⋮⋮</div>
      </div>
    );
  };

  const handleSave = async () => {
    // Validate canvas name
    if (!file?.name?.trim()) {
      message.error('Please enter a canvas name before submitting.');
      return;
    }
    
    // Validate canvas name length
    if (file.name.trim().length > 15) {
      message.error('Canvas name must be 15 characters or less.');
      return;
    }
    
    // Validate canvas name characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(file.name.trim())) {
      message.error('Canvas name contains invalid characters. Please use only letters, numbers, spaces, and common punctuation.');
      return;
    }
    
    // Validate canvas name is not just whitespace
    if (file.name.trim().length === 0) {
      message.error('Canvas name cannot be empty.');
      return;
    }
    
    // Validate all pages are ready
    if (!allPagesReady) {
      const editedPages = file.pages.filter(page => page.hasBeenEdited && !page.croppedImage);
      if (editedPages.length > 0) {
        message.error(`Pages ${editedPages.map((_, idx) => file.pages.indexOf(editedPages[idx]) + 1).join(', ')} have been edited but not cropped. Please crop these pages or use the Reset button to undo changes.`);
      } else {
        message.error('Please complete cropping for all pages or leave them unedited.');
      }
      return;
    }
    
    // Validate at least one page exists
    if (!file?.pages || file.pages.length === 0) {
      message.error('Please upload at least one page before submitting.');
      return;
    }
    
    // Create proper file objects for each page
    const filesForUpload = await Promise.all(
      file.pages.map(async (page, index) => {
        let fileToUpload = page.uploadFile;
        
        // If no uploadFile exists, create one from the image data
        if (!fileToUpload) {
          if (page.showFile || page.image) {
            try {       
              let imageData = page.showFile || page.image;
                    
              // Convert image to File object with unique name
              const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);
              fileToUpload = await dataUrlToFileUsingFetch(
                imageData,
                `smart-sync-${uniqueId}-page-${index + 1}.png`,
                'image/png'
              );
            } catch (error) {
              console.error(`Failed to create File object for page ${index + 1}:`, error);
              throw new Error(`Failed to prepare file for page ${index + 1}: ${error.message}`);
            }
          } else {
            throw new Error(`Page ${index + 1} has no image data to upload`);
          }
        }
        
        return {
          uploadFile: fileToUpload,
          order: page.order || index + 1,
          pageNumber: index + 1,
          croppedImage: page.croppedImage || page.showFile,
          cropBoxData: page.cropBoxData,
          dimensions: page.dimensions,
          isCropped: !!page.croppedImage,
          hasBeenEdited: page.hasBeenEdited
        };
      })
    );

    window.Moengage.track_event("TP_CC_Submit_canvas", {
      "Doctor_specialty": profile?.dp_name,
      "Doctor_unique_id": profile?.doctor_unique_id,
      "Doctor_Name": profile?.um_name,
      "Doctor_mobile_No": profile?.um_contact,
    });
    
    const templateData = {
      title: file.name.trim(),
      files: filesForUpload,
      ...(source ? { source } : {})
    };
        
    // Upload template via API
    handleApiUpload(templateData);
  };

  // Handle API upload with progress tracking
  const handleApiUpload = async (templateData) => {
    setIsProcessing(true);
    
    try {
      // Calculate total file size for better progress messaging
      const totalSize = templateData.files.reduce((sum, file) => {
        return sum + (file.uploadFile?.size || 0);
      }, 0);
      
      const isLargeUpload = totalSize > 10 * 1024 * 1024; // 10MB
      const initialMessage = isLargeUpload 
        ? 'Preparing large upload...' 
        : 'Uploading template...';
      
      message.loading(initialMessage, 0);
      
      const result = await uploadCustomSyncPadTemplate(
        templateData,
        (progress) => {
          // Update progress with more detailed messaging
          message.destroy();
          if (isLargeUpload) {
            message.loading(`Uploading large template... ${progress}%`, 0);
          } else {
            message.loading(`Uploading... ${progress}%`, 0);
          }
        }
      );
      
      message.destroy();
      
      if (result.success) {
        message.success('Template uploaded successfully!');
        
        // Call the onSave callback with the response data
        if (onSave) {
          onSave(result.data);
        }
        
        onClose();
        
        // Reset state
        setFile(null);
        setZoom(1);
        setSelectedPageIndex(0);
        setIsProcessing(false);
        
      } else {
        message.error(result.error || 'Failed to upload template');
        setIsProcessing(false);
      }
      
    } catch (error) {
      message.destroy();
      console.error('Exception in handleApiUpload:', error);
      console.error('Error stack:', error.stack);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save template. Please try again.';
      if (error.message?.includes('413')) {
        errorMessage = 'File too large. Please try with fewer pages or compress your PDF.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Upload timed out. Please check your connection and try again.';
      } else if (error.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      message.error(errorMessage);
      setIsProcessing(false);
    }
  };

  const handleReupload = () => {
    try {
      if (reuploadFileRef.current) {
        reuploadFileRef.current.value = null;
        reuploadFileRef.current.click();
      }
    } catch (error) {
      console.error('Error in reupload:', error);
      message.error('Failed to open file picker. Please try again.');
    }
  };

  // Separate handler for reupload to replace all pages
  const handleReuploadFileChange = async (e) => {
    // Prevent multiple simultaneous uploads
    if (isProcessing || isValidating) {
      message.warning('Please wait for the current operation to complete.');
      return;
    }
    
    if (e.target.files?.length > 0) {
      const fileUrl = e.target.files[0];
      
      setIsValidating(true);
      setIsProcessing(true);
      
      try {
        // Comprehensive validation using existing utility
        const validationResult = await validateCanvasFile(fileUrl);
        
        if (!validationResult.isValid) {
          // Handle different types of validation errors
          if (validationResult.errors.some(err => err.includes('PDF dimensions'))) {
            setValidationError(validationResult.errors.find(err => err.includes('PDF dimensions')));
            setIsA4ValidationError(true);
          } else if (validationResult.errors.some(err => err.includes('Only PDF format'))) {
            setIsFileFormatModalOpen(true);
          } else if (validationResult.errors.some(err => err.includes('8MB'))) {
            setIsFileSizeExceeded(true);
          } else {
            setValidationError(validationResult.errors[0]);
            setIsA4ValidationError(true);
          }
          setIsValidating(false);
          setIsProcessing(false);
          return;
        }
        
        // Reupload: Replace all pages (not add more)
        const images = await convertPdfToImages(fileUrl);
        const pages = images.map((img, index) => ({ 
          ...img, 
          hasBeenEdited: false,
          isReady: true,
          zoom: 1,
          rotation: 0,
          croppedImage: null,
          cropBoxData: null,
          uploadFile: null,
          showFile: img.image, // Use the original image as showFile
          id: `page-${Date.now()}-${index}`, // Add unique ID for drag and drop
          // Auto-save state tracking for reuploaded pages
          autoSavedState: {
            zoom: 1,
            rotation: 0,
            cropBoxData: null,
            croppedImage: null,
            hasBeenEdited: false
          },
          originalState: {
            image: img.image,
            zoom: 1,
            rotation: 0
          }
        }));
        setFile({
          pages: pages,
          originalFile: fileUrl,
          dimensions: validationResult.dimensions,
          name: file?.name || '', // Preserve canvas name
        });
        setSelectedPageIndex(0);
        setZoom(1);
        
      } catch (error) {
        console.error('Error processing PDF:', error);
        message.error('Failed to process PDF file. Please try again.');
      } finally {
        setIsValidating(false);
        setIsProcessing(false);
      }
    }
  };

  const handleRemove = () => {
    // If single page or no pages, remove entire PDF (current behavior)
    if (!file?.pages || file.pages.length <= 1) {
      setFile(null);
      setZoom(1);
      setSelectedPageIndex(0);
      return;
    }
    
    // Multi-page: remove only selected page
    const updatedPages = file.pages.filter((_, index) => index !== selectedPageIndex);
    
    // Determine new selected page index
    let newSelectedIndex = selectedPageIndex;
    if (selectedPageIndex >= updatedPages.length) {
      // If we removed the last page, select the new last page
      newSelectedIndex = updatedPages.length - 1;
    }
    
    // Update both states together to maintain consistency
    setFile(prev => ({
      ...prev,
      pages: updatedPages
    }));
    setSelectedPageIndex(newSelectedIndex);
    
    // Reset zoom for new page
    const newSelectedPage = updatedPages[newSelectedIndex];
    const pageZoom = newSelectedPage?.zoom || 1;
    setZoom(pageZoom);
  };

  const handleZoom = (delta) => {
    const newZoom = zoom + delta;
    if (newZoom >= 0.5 && newZoom <= 3) {
      setZoom(newZoom);
      // if (cropperRef.current?.cropper) {
      //   cropperRef.current.cropper.zoomTo(newZoom);
      // }
      
      // Save zoom state to page data
      setFile(prevFile => ({
        ...prevFile,
        pages: prevFile.pages.map((page, index) => {
          if (index === selectedPageIndex) {
            return {
              ...page,
              zoom: newZoom,
              hasBeenEdited: true
            };
          }
          return page;
        })
      }));
    }
  };

  // const handleRotate = () => {
  //   if (cropperRef.current?.cropper) {
  //     cropperRef.current.cropper.rotate(90);
      
  //     // Save rotation state to page data
  //     setFile(prevFile => ({
  //       ...prevFile,
  //       pages: prevFile.pages.map((page, index) => {
  //         if (index === selectedPageIndex) {
  //           const currentRotation = page.rotation || 0;
  //           const newRotation = (currentRotation + 90) % 360;
  //           return {
  //             ...page,
  //             rotation: newRotation,
  //             hasBeenEdited: true
  //           };
  //         }
  //         return page;
  //       })
  //     }));
  //   }
  // };

  // Restore page state when navigating between pages
  // useEffect(() => {
  //   if (file?.pages && file.pages[selectedPageIndex]) {
  //     // Small delay to ensure cropper is ready
  //     setTimeout(() => {
  //       restorePageState(selectedPageIndex);
  //       }, 150);
  //     }
  //   }, [selectedPageIndex, file?.pages]);

  // Reset functionality - simple like LogoUploadDrawer
  const handleResetPage = () => {
    if (!file?.pages || selectedPageIndex >= file.pages.length) {
      return;
    }

    // Reset the cropper
    // if (cropperRef.current?.cropper) {
    //   cropperRef.current.cropper.reset();
    // }
    
    // Reset zoom state
    setZoom(1);
    
    // ✅ FIXED: Reset the page state in the file.pages array
    setFile(prevFile => ({
      ...prevFile,
      pages: prevFile.pages.map((page, index) => {
        if (index === selectedPageIndex) {
          return {
            ...page,
            zoom: 1,
            rotation: 0,
            cropBoxData: null,
            croppedImage: null, // ✅ FIXED: Reset cropped image
            showFile: page.image, // ✅ FIXED: Restore to original image
            hasBeenEdited: false
          };
        }
        return page;
      })
    }));
    
  };

  const handleClose = () => {
    try {
      // Prevent closing while processing
      if (isProcessing || isValidating || isAddingMore) {
        message.warning('Please wait for the current operation to complete before closing.');
        return;
      }
      
      // Clean up any existing cropper instance
      // if (cropperRef.current?.cropper) {
      //   cropperRef.current.cropper.destroy();
      // }
      
      // Reset all state
      setFile(null);
      setZoom(1);
      setSelectedPageIndex(0);
      setIsValidating(false);
      setIsAddingMore(false);
      setIsFileFormatModalOpen(false);
      setIsFileSizeExceeded(false);
      setIsA4ValidationError(false);
      setValidationError('');
      setIsProcessing(false);
      
      // Clear all file inputs
      if (inputFileRef.current) {
        inputFileRef.current.value = null;
      }
      if (reuploadFileRef.current) {
        reuploadFileRef.current.value = null;
      }
      if (addMoreFileRef.current) {
        addMoreFileRef.current.value = null;
      }
      
      onClose();
    } catch (error) {
      console.error('Error during close:', error);
      onClose(); // Still close even if cleanup fails
    }
  };

  const handleRetry = () => {
    // Comprehensive state reset
    setIsFileSizeExceeded(false);
    setIsFileFormatModalOpen(false);
    setIsA4ValidationError(false);
    setValidationError('');
    setIsProcessing(false);
    setIsValidating(false);
    setIsAddingMore(false);
    
    // Clear all file inputs
    if (inputFileRef.current) {
      inputFileRef.current.value = null;
    }
    if (reuploadFileRef.current) {
      reuploadFileRef.current.value = null;
    }
    if (addMoreFileRef.current) {
      addMoreFileRef.current.value = null;
    }
  };

  const handleAddMore = () => {
    try {
      // ✅ Prevent multiple clicks during loading
      if (isAddingMore || isProcessing) {
        message.warning('Please wait for the current operation to complete.');
        return;
      }
      
      // ✅ Validate file exists before allowing add more
      if (!file?.pages || file.pages.length === 0) {
        message.error('Please upload a file first before adding more pages.');
        return;
      }
      
      // ✅ Validate total page limit
      // const MAX_TOTAL_PAGES = 5;
      if (file.pages.length >= MAX_PAGES) {
        message.error(`Maximum ${MAX_PAGES} pages allowed. Please remove some pages before adding more.`);
        return;
      }
      
      // Open file picker for additional PDF using separate ref
      if (addMoreFileRef.current) {
        addMoreFileRef.current.value = null;
        addMoreFileRef.current.click();
      }
    } catch (error) {
      console.error('Error in add more:', error);
      message.error('Failed to open file picker. Please try again.');
    }
  };

  // Separate handler for Add More file changes
  const handleAddMoreFileChange = async (e) => {
    // ✅ Prevent multiple simultaneous uploads
    if (isProcessing || isValidating || isAddingMore) {
      message.warning('Please wait for the current operation to complete.');
      return;
    }
    
    if (e.target.files?.length > 0) {
      const fileUrl = e.target.files[0];
      
      setIsValidating(true);
      setIsAddingMore(true);
      
      try {
        // Comprehensive validation using existing utility
        const validationResult = await validateCanvasFile(fileUrl);
        
        if (!validationResult.isValid) {
          // Handle different types of validation errors
          if (validationResult.errors.some(err => err.includes('PDF dimensions'))) {
            setValidationError(validationResult.errors.find(err => err.includes('PDF dimensions')));
            setIsA4ValidationError(true);
          } else if (validationResult.errors.some(err => err.includes('Only PDF format'))) {
            setIsFileFormatModalOpen(true);
          } else if (validationResult.errors.some(err => err.includes('8MB'))) {
            setIsFileSizeExceeded(true);
          } else {
            setValidationError(validationResult.errors[0]);
            setIsA4ValidationError(true);
          }
          setIsValidating(false);
          setIsAddingMore(false);
          return;
        }
        
        // Add More: Merge new pages with existing
        const newImages = await convertPdfToImages(fileUrl);
        
        // ✅ Validate that adding new pages won't exceed the 5-page limit
        // const MAX_PAGES = 5;
        if (file.pages.length + newImages.length > MAX_PAGES) {
          message.error(`Cannot add ${newImages.length} page(s). Maximum ${MAX_PAGES} pages allowed. Current: ${file.pages.length}, Adding: ${newImages.length}`);
          setIsValidating(false);
          setIsAddingMore(false);
          return;
        }
        
        const newPages = newImages.map((img, index) => ({ 
          ...img, 
          hasBeenEdited: false,
          isReady: true,
          zoom: 1,
          rotation: 0,
          croppedImage: null,
          cropBoxData: null,
          uploadFile: null,
          showFile: img.image, // Use the original image as showFile
          id: `page-${Date.now()}-${file.pages.length + index}`, // Add unique ID for drag and drop
          // Auto-save state tracking for new pages
          autoSavedState: {
            zoom: 1,
            rotation: 0,
            cropBoxData: null,
            croppedImage: null,
            hasBeenEdited: false
          },
          originalState: {
            image: img.image,
            zoom: 1,
            rotation: 0
          }
        }));
        
        setFile(prev => {
          const updatedFile = {
            ...prev,
            pages: [...prev.pages, ...newPages]
          };
          return updatedFile;
        });
        
        setZoom(1);
      } catch (error) {
        console.error('Error processing PDF for add more:', error);
        message.error('Failed to process the PDF. Please try again.');
      } finally {
        setIsValidating(false);
        setIsAddingMore(false);
        
        // Clear file input
        if (addMoreFileRef.current) {
          addMoreFileRef.current.value = null;
        }
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        // Create a synthetic event to reuse handleFileChange
        const syntheticEvent = { target: { files: [file] } };
        handleFileChange(syntheticEvent);
      }
    } catch (error) {
      console.error('Error handling file drop:', error);
      message.error('Failed to process dropped file. Please try uploading again.');
    }
  };

  return (
    <Drawer
      title={null}
      closable={false}
      placement="right"
      onClose={onClose}
      open={visible}
      width={700}
      className="rx-upload-drawer"
    >
      <div className="rx-upload-modal-bg">
        <div className="rx-upload-header">
          <div className="rx-upload-header-left">
            <i className="icon-right rx-upload-back" onClick={handleClose}></i>
          </div>
          <div className="rx-upload-header-title">
            {!file ? 'Upload Custom Rx Canvas' : 'Custom Rx Canvas Preview'}
          </div>
          <div className="rx-upload-header-actions">
            {/* <button className="rx-upload-tutorial">
              <img src={tutorialIcon} alt="Tutorial" className="rx-upload-tutorial-icon" height="24"/>
              Tutorial
            </button> */}
            <button 
              type="default"
              className="rx-upload-submit" 
              disabled={!allPagesReady || !file?.name?.trim() || isProcessing}
              onClick={handleSave}
            >
              {/* {isProcessing ? 'Processing...' :
               !file?.name?.trim() ? 'Enter Canvas Name' : 
               !allPagesReady ? 'Complete Pages' : 'Submit'} */}
               {isProcessing ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </div>
        <div className="rx-upload-card">
          {!file ? (
            // ==================== UPLOAD STATE BODY ====================
            <div className="upload-state-body">
              <img src={rxUploadIllustration} alt="Upload Illustration" className="rx-upload-illustration" />
              <div 
                className="rx-upload-area" 
                onClick={() => {
                  inputFileRef.current?.click()
                  window.Moengage.track_event("TP_CC_Click to Upload", {
                    "Doctor_specialty": profile?.dp_name,
                    "Doctor_unique_id": profile?.doctor_unique_id,
                    "Doctor_Name": profile?.um_name,
                    "Doctor_mobile_No": profile?.um_contact,
                  });
                }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <img src={uploadIcon} alt="Upload" className="rx-upload-cloud" />
                <div className="rx-upload-link">
                  <span className="rx-upload-click">Click to Upload</span>
                  <span className="rx-upload-or"> or drag and drop</span>
                </div>
                <input
                  ref={inputFileRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
              <div className="rx-upload-warning">
                <div className='d-flex'>
                  <img src={alertIcon} alt="Warning" className="rx-upload-warning-icon" />
                  <span>
                    Please ensure that the uploaded Rx canvas is in <b>A4 size</b>, <b>PDF format</b>, under <b>8MB</b> file size & maximum <b>{MAX_PAGES} pages</b>
                  </span>
                </div>
                <div className='upload-note'>
                  Note: Kindly upload a scanned copy of the A4 sheets (not a photo or screenshot) to ensure clarity and proper formatting.
                </div>
              </div>
              {/* <div className="rx-upload-warning" style={{ marginTop: '8px', background: '#fff7e6', border: '1px solid #ffd591' }}>
                <img src={alertIcon} alt="Storage Warning" className="rx-upload-warning-icon" />
                <span style={{ color: '#d46b08' }}>
                  <b>Storage Note:</b> Large templates may be automatically optimized to save space. Only the last 5 templates are kept.
                </span>
              </div> */}
            </div>
          ) : (
            // ==================== PREVIEW STATE BODY ====================
            <div className="preview-state-body">
              {/* Canvas Name Input */}
              <div className="canvas-name-row">
                <label className="canvas-name-label">Canvas Name <span className="required color-red">*</span></label>
                <div style={{position: 'relative', width: '100%'}}>
                  <input
                    className="canvas-name-input"
                    type="text"
                    maxLength={15}
                    placeholder="Enter canvas name (required)"
                    value={file.name || ''}
                    onChange={e => setFile({ ...file, name: e.target.value })}
                    autoFocus
                  />
                  <span className="canvas-name-count">{(file.name || '').length}/15</span>
                </div>
              </div>
              
              
              {/* Image Preview Area */}
              {/* In preview-state-body, show simple image preview for selected page */}
              <div className="image-preview-row">
                {/* Page Label */}
                <div className="page-label">Page {file?.pages && file.pages[selectedPageIndex] ? selectedPageIndex + 1 : 0}</div>
                {/* Image Preview Container */}
                <div className="image-preview-container">
                  <img 
                    src={file.pages[selectedPageIndex]?.showFile || ''} 
                    alt={`Page ${selectedPageIndex + 1}`}
                    className="preview-image"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '400px', 
                      objectFit: 'contain',
                      border: '1px solid #e8e8e8',
                      borderRadius: '8px'
                    }}
                  />
                </div>
                {/* Cropper Actions Row */}
                <div className="cropper-actions-row d-flex align-items-center justify-content-center">
                  <div className="cropper-actions-left">
                    <Button 
                      icon={<img src={reuploadIcon}/>} 
                      onClick={handleReupload} 
                      disabled={isProcessing}
                      className='reupload-button'>
                      Reupload
                    </Button>
                    <Button 
                      className='remove-button' 
                      icon={<DeleteOutlined />} 
                      onClick={handleRemove}
                      disabled={isProcessing}
                    >
                      Remove
                    </Button>
                  </div>
                  {/* <div className="cropper-actions-right">
                    <div className={`cropper-action-btn ${isProcessing ? 'disabled' : ''}`} onClick={isProcessing ? null : handleRotate}><RedoOutlined /></div>
                    <div className={`cropper-action-btn ${isProcessing ? 'disabled' : ''}`} onClick={isProcessing ? null : () => handleZoom(-0.1)}><MinusOutlined /></div>
                    <div className={`cropper-action-btn ${isProcessing ? 'disabled' : ''}`} onClick={isProcessing ? null : () => handleZoom(0.1)}><PlusOutlined /></div>
                    <div className={`cropper-action-btn reset-btn ${isProcessing ? 'disabled' : ''}`} onClick={isProcessing ? null : handleResetPage}>
                      <span>Reset</span>
                    </div>
                  </div> */}
                </div>
              </div>
              
              {/* Page Thumbnails with Drag and Drop */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="page-thumbnails-row">
                  <SortableContext
                    items={file.pages.map((page, index) => page.id || index)}
                    strategy={verticalListSortingStrategy}
                  >
                    {file.pages.map((page, index) => (
                      <SortableThumbnail key={page.id || index} page={page} index={index} />
                    ))}
                  </SortableContext>
                  <div className={`page-thumbnail add-more ${isAddingMore ? 'loading' : ''}`} onClick={isAddingMore ? undefined : handleAddMore} tabIndex={0} role="button">
                    {isAddingMore ? (
                      <span className="add-more-text">Adding...</span>
                    ) : (
                      <>
                        <span className="add-more-icon">
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 6V26" stroke="#4B4AD5" stroke-width="2.2" stroke-linecap="round"/>
                            <path d="M6 16H26" stroke="#4B4AD5" stroke-width="2.2" stroke-linecap="round"/>
                          </svg>
                        </span>
                        <span className="add-more-text">Add More</span>
                      </>
                    )}
                  </div>
                </div>
              </DndContext>
              
              {/* Hidden file input for reupload functionality */}
              <input
                ref={inputFileRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {/* ✅ Separate hidden file input for reupload */}
              <input
                ref={reuploadFileRef}
                type="file"
                accept="application/pdf"
                onChange={handleReuploadFileChange}
                style={{ display: 'none' }}
              />
              {/* ✅ Separate hidden file input for add more functionality */}
              <input
                ref={addMoreFileRef}
                type="file"
                accept="application/pdf"
                onChange={handleAddMoreFileChange}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        {/* File Format Error Modal */}
        <CommonModal
          isModalOpen={isFileFormatModalOpen}
          onCancel={() => setIsFileFormatModalOpen(false)}
          title="File Format Not Supported"
          modalBody={
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <img className="me-3" src={alertIcon} alt="Warning" />
                <div>
                  You can't upload this file format. Only <strong>PDF</strong> files are accepted.
                </div>
              </div>
              <Button
                type="primary"
                block
                onClick={handleRetry}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: '500'
                }}
              >
                Got it
              </Button>
            </div>
          }
          modalWidth={465}
        />

        {/* File Size Exceeded Modal */}
        <CommonModal
          isModalOpen={isFileSizeExceeded}
          onCancel={() => setIsFileSizeExceeded(false)}
          title="Exceeded File Size"
          modalBody={
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <img className="me-3" src={alertIcon} alt="Warning" />
                <div>
                  The file size exceeded <strong>8MB</strong>. Please upload a
                  file smaller than 8MB
                </div>
              </div>
              <Button
                type="primary"
                block
                onClick={handleRetry}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: '500'
                }}
              >
                Retry
              </Button>
            </div>
          }
          modalWidth={465}
        />

        {/* A4 Validation Error Modal */}
        <CommonModal
          isModalOpen={isA4ValidationError}
          onCancel={() => setIsA4ValidationError(false)}
          title="Invalid PDF Dimensions"
          modalBody={
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <img className="me-3" src={alertIcon} alt="Warning" />
                <div>
                  {validationError || "The uploaded PDF doesn't meet A4 size requirements. Please upload a PDF with A4 dimensions (210mm x 297mm)."}
                </div>
              </div>
              <Button
                type="primary"
                block
                onClick={handleRetry}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: '500'
                }}
              >
                Retry
              </Button>
            </div>
          }
          modalWidth={465}
        />
      </div>
    </Drawer>
  );
};

export default RxTemplateUploadDrawer; 