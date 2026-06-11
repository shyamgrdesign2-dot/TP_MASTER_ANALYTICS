import React, { useState, useRef, useEffect } from 'react';
import { Drawer, Button, message } from 'antd';
import { Cropper } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { PlusOutlined, MinusOutlined, RedoOutlined, DeleteOutlined } from '@ant-design/icons';
import { pdfjs } from "react-pdf";
import CommonModal from "../../../common/CommonModal";

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
import { updateCustomSyncPadTemplate } from '../services/uploadService';
import './RxTemplateUploadDrawer.scss';
import { ASSETS } from "../../../assets";
const {
  alerticon: alertIcon,
  reupload: reuploadIcon,
  tutorial: tutorialIcon,
} = ASSETS.images;

const EditTemplateModal = ({ visible, onClose, template, onSave }) => {
  const [file, setFile] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [isFileFormatModalOpen, setIsFileFormatModalOpen] = useState(false);
  const [isFileSizeExceeded, setIsFileSizeExceeded] = useState(false);
  const [isA4ValidationError, setIsA4ValidationError] = useState(false);
  const [validationError, setValidationError] = useState('');
  const cropperRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const addMoreFileRef = useRef(null); // Separate ref for add more functionality

  // Drag and drop sensors
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

  // Initialize edit data when template changes
  useEffect(() => {
    if (template && visible) {
      
      // Convert template data to file format (exactly like upload drawer)
      const editPages = template.uploaded_files.map((file, index) => ({
        id: `edit-page-${file.id}-${index}`,
        image: file.file_url,
        showFile: file.file_url,
        croppedImage: null,
        uploadFile: null,
        hasBeenEdited: false,
        isReady: true,
        zoom: 1,
        rotation: 0,
        cropBoxData: null,
        order: file.order || index + 1,
        pageNumber: index + 1,
        originalFileId: file.id,
        unique_id: file.unique_id,
        // Auto-save state tracking
        autoSavedState: {
          zoom: 1,
          rotation: 0,
          cropBoxData: null,
          croppedImage: null,
          hasBeenEdited: false
        },
        originalState: {
          image: file.file_url,
          zoom: 1,
          rotation: 0
        }
      }));

      setFile({
        id: template.id,
        name: template.title,
        originalFile: template,
        originalFileType: "object",
        originalFileConstructor: "Template",
        pagesCount: editPages.length,
        pages: editPages
      });
      setSelectedPageIndex(0);
      setZoom(1);
    }
  }, [template, visible]);

  // Cleanup on close
  useEffect(() => {
    if (!visible) {
      setFile(null);
      setSelectedPageIndex(0);
      setZoom(1);
      setIsAddingMore(false);
      setIsFileFormatModalOpen(false);
      setIsFileSizeExceeded(false);
      setIsA4ValidationError(false);
      setValidationError('');
      // Clear auto-save timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    }
  }, [visible]);

  // Reset cropper when page changes (same as upload drawer)
  useEffect(() => {
    if (file?.pages && file.pages[selectedPageIndex]) {
      // Reset zoom when page changes
      setZoom(1);
      
      // Small delay to ensure the cropper component has mounted
      setTimeout(() => {
        if (cropperRef.current?.cropper) {
          const cropper = cropperRef.current.cropper;
          // Reset cropper to default state
          cropper.reset();
        }
      }, 100);
    }
  }, [selectedPageIndex, file?.pages]);

  // Auto-save page state when user finishes cropping
  const autoSavePageState = (isCropping = false) => {
    if (!file?.pages || !cropperRef.current?.cropper) return;

    const currentPage = file.pages[selectedPageIndex];
    if (!currentPage) return;

    try {
      const cropper = cropperRef.current.cropper;
      const updatedPages = [...file.pages];
      
      if (isCropping) {
        // Save cropped image
        const croppedCanvas = cropper.getCroppedCanvas();
        const croppedImageDataUrl = croppedCanvas.toDataURL('image/png');
        
        updatedPages[selectedPageIndex] = {
          ...currentPage,
          croppedImage: croppedImageDataUrl,
          showFile: croppedImageDataUrl,
          cropBoxData: cropper.getData(),
          zoom: cropper.getImageData().ratio,
          hasBeenEdited: true,
          uploadFile: null // Will be created during save
        };
      } else {
        // Save current state without cropping
        const cropBoxData = cropper.getData();
        updatedPages[selectedPageIndex] = {
          ...currentPage,
          cropBoxData: cropBoxData,
          zoom: cropper.getImageData().ratio,
          // ✅ FIXED: Get current rotation from cropper, not from stored state
          rotation: cropBoxData.rotate || 0,
          hasBeenEdited: true
        };
      }

      setFile({ ...file, pages: updatedPages });
    } catch (error) {
      console.error('Error auto-saving page state:', error);
    }
  };

  // Restore page state when navigating between pages
  const restorePageState = (pageIndex) => {
    if (!file?.pages || !file.pages[pageIndex]) {
      return;
    }
    
    const page = file.pages[pageIndex];
    
    // Wait for cropper to be ready
    setTimeout(() => {
      if (cropperRef.current?.cropper) {
        const cropper = cropperRef.current.cropper;
        
        // Restore zoom
        if (page.zoom && page.zoom !== 1) {
          cropper.zoomTo(page.zoom);
          setZoom(page.zoom); // Also update the zoom state
        } else {
          setZoom(1);
        }
        
        // Restore rotation using setData
        if (page.rotation && page.rotation !== 0) {
          cropper.setData({ rotate: page.rotation });
        }
        
        // Restore crop box if it exists
        if (page.cropBoxData) {
          cropper.setCropBoxData(page.cropBoxData);
        }
      }
    }, 100);
  };

  // Restore page state when navigating between pages
  useEffect(() => {
    if (file?.pages && file.pages[selectedPageIndex]) {
      // Small delay to ensure cropper is ready
      setTimeout(() => {
        restorePageState(selectedPageIndex);
      }, 150);
    }
  }, [selectedPageIndex, file?.pages]);

  // Handle drag end for reordering (same as upload drawer)
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

  // Sortable thumbnail component (exactly like upload drawer)
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

  // Zoom handler (same as upload drawer)
  const handleZoom = (delta) => {
    const newZoom = zoom + delta;
    if (newZoom >= 0.5 && newZoom <= 3) {
      setZoom(newZoom);
      if (cropperRef.current?.cropper) {
        cropperRef.current.cropper.zoomTo(newZoom);
      }
      
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

  // Rotate handler (same as upload drawer)
  const handleRotate = () => {
    if (cropperRef.current?.cropper) {
      cropperRef.current.cropper.rotate(90);
      
      // Save rotation state to page data
      setFile(prevFile => ({
        ...prevFile,
        pages: prevFile.pages.map((page, index) => {
          if (index === selectedPageIndex) {
            const currentRotation = page.rotation || 0;
            const newRotation = (currentRotation + 90) % 360;
            return {
              ...page,
              rotation: newRotation,
              hasBeenEdited: true
            };
          }
          return page;
        })
      }));
    }
  };

  // Reset page handler (same as upload drawer)
  const handleResetPage = () => {
    if (!file?.pages || selectedPageIndex >= file.pages.length) {
      return;
    }

    // Reset the cropper
    if (cropperRef.current?.cropper) {
      cropperRef.current.cropper.reset();
    }
    
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
      const MAX_PAGES = 5;
      if (pdf.numPages > MAX_PAGES) {
        throw new Error(`PDF has too many pages (${pdf.numPages}). Maximum allowed is ${MAX_PAGES}.`);
      }
      
      const numPages = pdf.numPages;
      const images = [];
      
      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          
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
          
          const imageDataUrl = canvas.toDataURL('image/png', 0.9);
          
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

  // Reupload handler (adapted for edit)
  const handleReupload = () => {
    if (!file?.pages) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async (e) => {
      const newFile = e.target.files[0];
      if (newFile) {
        try {
          setIsProcessing(true);
          message.loading('Processing PDF...', 0);
          
          // Comprehensive validation using existing utility
          const validationResult = await validateCanvasFile(newFile);
          
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
            setIsProcessing(false);
            message.destroy();
            return;
          }
          
          // Convert PDF to images using the same logic as upload drawer
          const images = await convertPdfToImages(newFile);
          
          if (images && images.length > 0) {
            // Completely replace all pages with the new PDF pages
            const newPages = images.map((pageImage, index) => ({
              id: `edit-page-${Date.now()}-${index}`,
              image: pageImage.image,
              showFile: pageImage.image,
              croppedImage: null,
              uploadFile: null,
              hasBeenEdited: true,
              isReady: true,
              zoom: 1,
              rotation: 0,
              cropBoxData: null,
              order: index + 1,
              pageNumber: index + 1,
              dimensions: pageImage.dimensions,
              // Reset auto-save state for the new pages
              autoSavedState: {
                zoom: 1,
                rotation: 0,
                cropBoxData: null,
                croppedImage: null,
                hasBeenEdited: false
              },
              originalState: {
                image: pageImage.image,
                zoom: 1,
                rotation: 0
              }
            }));
            
            // Replace all pages with the new ones
            setFile({ ...file, pages: newPages });
            
            // Reset to first page since we're starting fresh
            setSelectedPageIndex(0);
            setZoom(1);
            
            message.destroy();
            message.success(`Template replaced with new pdf successfully`);

          } else {
            throw new Error('Failed to convert PDF to image');
          }
        } catch (error) {
          message.destroy();
          console.error('Error reuploading page:', error);
          message.error('Failed to process PDF file. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      }
    };
    input.click();
  };

  // Remove handler (same as upload drawer)
  const handleRemove = () => {
    // If single page or no pages, cannot remove
    if (!file?.pages || file.pages.length <= 1) {
      message.error('Cannot remove the last page. Template must have at least one page.');
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
    
    message.success(`Page ${selectedPageIndex + 1} removed successfully`);
  };

  // Retry handler for validation errors
  const handleRetry = () => {
    // Comprehensive state reset
    setIsFileSizeExceeded(false);
    setIsFileFormatModalOpen(false);
    setIsA4ValidationError(false);
    setValidationError('');
    setIsProcessing(false);
    setIsAddingMore(false);
  };

  // Add More functionality
  const handleAddMore = () => {
    try {
      // Prevent multiple clicks during loading
      if (isAddingMore || isProcessing) {
        message.warning('Please wait for the current operation to complete.');
        return;
      }
      
      // Validate file exists before allowing add more
      if (!file?.pages || file.pages.length === 0) {
        message.error('Please upload a file first before adding more pages.');
        return;
      }
      
      // Validate total page limit
      const MAX_TOTAL_PAGES = 5;
      if (file.pages.length >= MAX_TOTAL_PAGES) {
        message.error(`Maximum ${MAX_TOTAL_PAGES} pages allowed. Please remove some pages before adding more.`);
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
    // Prevent multiple simultaneous uploads
    if (isProcessing || isAddingMore) {
      message.warning('Please wait for the current operation to complete.');
      return;
    }
    
    if (e.target.files?.length > 0) {
      const fileUrl = e.target.files[0];
      
      setIsAddingMore(true);
      
      try {
        // Convert PDF to images
        const newImages = await convertPdfToImages(fileUrl);
        
        // Validate that adding new pages won't exceed the 5-page limit
        const MAX_TOTAL_PAGES = 5;
        if (file.pages.length + newImages.length > MAX_TOTAL_PAGES) {
          message.error(`Cannot add ${newImages.length} page(s). Maximum ${MAX_TOTAL_PAGES} pages allowed. Current: ${file.pages.length}, Adding: ${newImages.length}`);
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
          id: `edit-page-${Date.now()}-${file.pages.length + index}`, // Add unique ID for drag and drop
          order: file.pages.length + index + 1,
          pageNumber: file.pages.length + index + 1,
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
        
        message.success(`${newPages.length} page(s) added successfully`);
        
      } catch (error) {
        console.error('Error processing PDF for add more:', error);
        message.error('Failed to process the PDF. Please try again.');
      } finally {
        setIsAddingMore(false);
        
        // Clear file input
        if (addMoreFileRef.current) {
          addMoreFileRef.current.value = null;
        }
      }
    }
  };

  // Save all changes (adapted from upload drawer)
  const handleSave = async () => {
    // Validate canvas name (same validation as upload drawer)
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
    
    // Validate at least one page exists
    if (!file?.pages || file.pages.length === 0) {
      message.error('Please upload at least one page before submitting.');
      return;
    }

    setIsProcessing(true);
    
    try {
      message.loading('Updating template...', 0);
            
      // ✅ FIXED: Auto-save current page state before submitting
      if (cropperRef.current?.cropper) {
        await autoSavePageState(false);
      }
      
      // Create proper file objects for each page (same as upload drawer)
      const filesForUpload = await Promise.all(
        file.pages.map(async (page, index) => {
          let fileToUpload = page.uploadFile;
          
          // If no uploadFile exists, create one from the image data
          if (!fileToUpload) {
            if (page.showFile || page.image) {
              try {
                let imageData = page.showFile || page.image;
                
                // ✅ FIXED: Get current state from cropper for the selected page
                if (index === selectedPageIndex && cropperRef.current?.cropper) {
                  const cropper = cropperRef.current.cropper;
                  try {
                    // Get the current canvas with all transformations applied
                    const canvas = cropper.getCroppedCanvas() || cropper.getCanvas();
                    if (canvas) {
                      imageData = canvas.toDataURL('image/png', 0.9);
                    }
                  } catch (error) {
                    console.warn(`Could not get current cropper state for page ${index + 1}:`, error);
                    // Fallback to stored image data
                  }
                }
                                
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
            isCropped: !!page.croppedImage,
            hasBeenEdited: page.hasBeenEdited
          };
        })
      );

      const templateData = {
        title: file.name.trim(),
        files: filesForUpload
      };

      const result = await updateCustomSyncPadTemplate(
        file.id,
        templateData,
        (progress) => {
          message.destroy();
          message.loading(`Updating... ${progress}%`, 0);
        }
      );

      message.destroy();
      
      if (result.success) {
        message.success('Template updated successfully!');
        
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
        message.error(result.error || 'Failed to update template');
        setIsProcessing(false);
      }
    } catch (error) {
      message.destroy();
      console.error('Exception in handleSave:', error);
      message.error('Failed to update template. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!file) return null;

  // Helper: check if all pages are ready for submission
  const allPagesReady = file?.pages?.every(page => {
    // Page is ready if it has a valid image to display
    // Since this is an edit modal for an existing template, we just need to ensure
    // each page has either the original image, a cropped image, or a reuploaded image
    return page.showFile && page.showFile.trim() !== '';
  });

  return (
    <Drawer
      title={null}
      closable={false}
      placement="right"
      onClose={onClose}
      open={visible}
      width={730}
      className="rx-upload-drawer"
    >
      <div className="rx-upload-modal-bg">
        {/* Header - exactly like upload drawer */}
        <div className="rx-upload-header">
          <div className="rx-upload-header-left">
            <i className="icon-right rx-upload-back" onClick={onClose}></i>
          </div>
          <div className="rx-upload-header-title">
            Edit Rx Canvas
          </div>
          <div className="rx-upload-header-actions">
            <button className="rx-upload-tutorial">
              <img src={tutorialIcon} alt="Tutorial" className="rx-upload-tutorial-icon" height="24" style={{marginRight: 8}} />
              Tutorial
            </button>
            <button 
              type="default"
              className="rx-upload-submit" 
              disabled={!allPagesReady || !file?.name?.trim() || isProcessing}
              onClick={handleSave}
            >
              {isProcessing ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </div>
        
        {/* Main Content Card - exactly like upload drawer */}
        <div className="rx-upload-card">
          {/* Preview State Body - exactly like upload drawer */}
          <div className="preview-state-body">
            {/* Canvas Name Input - exactly like upload drawer */}
            <div className="canvas-name-row">
              <label className="canvas-name-label">Canvas Name <span className="required">*</span></label>
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
              {/* Cropper Actions Row - exactly like upload drawer */}
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
                    <span style={{ fontSize: '12px', color: 'white' }}>Reset</span>
                  </div>
                </div> */}
              </div>
            </div>
            
            {/* Page Thumbnails with Drag and Drop - exactly like upload drawer */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
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

            {/* Hidden file input for Add More functionality */}
            <input
              ref={addMoreFileRef}
              type="file"
              accept="application/pdf"
              onChange={handleAddMoreFileChange}
              style={{ display: 'none' }}
            />

          </div>
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

export default EditTemplateModal; 