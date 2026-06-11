import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { message } from "antd";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import PreviewDrawerMobile from "../previewDrawerMobile";
import { openBottomSheet } from "../../../components/bottomSheetManager";

import { compressedFile as compressFile } from "../../../utils/utils";
import { ASSETS } from "../../../assets";
const alertIcon = ASSETS.images.alerticon;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const ImageUpload = forwardRef(
  (
    {
      onFileUpload,
      patientUniqueId,
      sessionId,
      uploadedFilesFromStore = [],
      autoDigitizeRx,
      onPreviewClose,
    },
    ref
  ) => {
    const fileInputRef = useRef(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const maxFileLimit = 5;
    const maxFileSizeInMB = 15;
    const compressionPercentage = 90;
    const minSizeToCompress = 4 * 1024 * 1024; // 4MB
    const maxFileSize = maxFileSizeInMB * 1024 * 1024; // 15MB
    const [storedFileIdToReplace, setStoredFileIdToReplace] = useState(null);
    const [isAddMoreClicked, setIsAddMoreClicked] = useState(false);

    useEffect(() => {
      return () => {
        setIsAddMoreClicked(false);
        setStoredFileIdToReplace(null);
        setUploadedFiles([]);
        setIsPreviewOpen(false);
      };
    }, []);

    const handleUploadClick = () => {
      fileInputRef.current?.click();
    };

    const handleExceededFileLimit = () => {
      openBottomSheet({
        title: "Exceeded File Limit",
        description: (
          <>
            You can only upload upto <strong>{maxFileLimit} files</strong>.
            Please remove some files and try again.
          </>
        ),
        icon: <img src={alertIcon} alt="!" />,
        ctaText: "Retry",
        componentRef: ref,
        ctaClick: () => {
          handleUploadClick();
        },
      });
    };

    const handleFileSizeExceeded = (totalFilesSize) => {
      const fileSize = (totalFilesSize / 1024 / 1024).toFixed(2);
      openBottomSheet({
        title: "File Size Exceeded",
        description: (
          <>
            Total file size should not exceed{" "}
            <strong>{maxFileSizeInMB}MB</strong>. Current size: {fileSize} MB.
          </>
        ),
        icon: <img src={alertIcon} alt="!" />,
        ctaText: "Retry",
        componentRef: ref,
        ctaClick: () => {
          handleUploadClick();
        },
      });
    };

    const handleFiles = async (files) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const newFiles = [];
      let isStoredFileUsed = false;
      const totalFilesForValidation = [...fileArray, ...uploadedFiles];
      if (
        totalFilesForValidation.length > maxFileLimit &&
        !storedFileIdToReplace
      ) {
        handleExceededFileLimit();
        return;
      }
      for (const file of fileArray) {
        let compressedFile = file;
        if (!file.type.match(/^(image|application\/pdf)/)) {
          message.error(`${file.name} is not a valid file type`);
          continue;
        }

        console.log("before compressedFile", compressedFile);
        if (compressedFile.size > minSizeToCompress) {
          compressedFile = await compressFile(
            file,
            maxFileSizeInMB,
            compressionPercentage
          );
          console.log("after compressedFile", compressedFile);
          if (compressedFile.size > maxFileSize) {
            handleFileSizeExceeded(compressedFile.size);
            return;
          }
        }

        if (compressedFile.type === "application/pdf") {
          try {
            const arrayBuffer = await compressedFile.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer })
              .promise;
            for (let i = 1; i <= pdfDoc.numPages; i++) {
              const page = await pdfDoc.getPage(i);
              const viewport = page.getViewport({ scale: 1 });
              const maxSize = Math.max(viewport.width, viewport.height);

              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              canvas.width = maxSize;
              canvas.height = maxSize;
              context.fillStyle = "#fff";
              context.fillRect(0, 0, canvas.width, canvas.height);

              const offsetX = (canvas.width - viewport.width) / 2;
              const offsetY = (canvas.height - viewport.height) / 2;

              context.setTransform(1, 0, 0, 1, offsetX, offsetY);

              await page.render({ canvasContext: context, viewport }).promise;

              const preview = canvas.toDataURL("image/jpeg");

              const fileObj = {
                file: compressedFile,
                name: `${file.name?.split(".")[0]} - page ${i}.jpeg`,
                size: file.size,
                type: "image/jpeg",
                preview,
                url: preview,
                id:
                  storedFileIdToReplace && !isStoredFileUsed
                    ? storedFileIdToReplace
                    : Date.now() + Math.random(),
                rotation: 0,
                zoom: 1,
                crop: {
                  unit: "%",
                  x: 5,
                  y: 5,
                  width: 90,
                  height: 90,
                },
              };

              if (storedFileIdToReplace) {
                isStoredFileUsed = true;
              }

              newFiles.push(fileObj);
            }
          } catch (err) {
            console.error("Error rendering PDF:", err);
          }
        } else {
          const preview = URL.createObjectURL(compressedFile);

          const fileObj = {
            file: compressedFile,
            name: file.name,
            size: file.size,
            type: file.type,
            preview,
            url: preview,
            id:
              storedFileIdToReplace && !isStoredFileUsed
                ? storedFileIdToReplace
                : Date.now() + Math.random(),
            rotation: 0,
            zoom: 1,
            crop: {
              unit: "%",
              x: 5,
              y: 5,
              width: 90,
              height: 90,
            },
          };
          if (storedFileIdToReplace) {
            isStoredFileUsed = true;
          }
          newFiles.push(fileObj);
        }
      }

      if (newFiles.length > 0) {
        if (!storedFileIdToReplace) {
          const totalFiles = [...uploadedFiles, ...newFiles];
          if (totalFiles.length > maxFileLimit) {
            handleExceededFileLimit();
            return;
          }
          setUploadedFiles(totalFiles);
        } else {
          const finalFiles = uploadedFiles.map((file) => {
            if (file.id === storedFileIdToReplace) {
              return newFiles.find(
                (newFile) => newFile.id === storedFileIdToReplace
              );
            }
            return file;
          });
          finalFiles.push(
            ...newFiles.filter(
              (newFile) => newFile.id !== storedFileIdToReplace
            )
          );
          if (finalFiles.length > maxFileLimit) {
            handleExceededFileLimit();
            return;
          }
          setUploadedFiles(finalFiles);
        }
        if (storedFileIdToReplace) {
          setStoredFileIdToReplace(null);
        }
        setIsPreviewOpen(true);
      }
    };

    const handleFileSelect = (e) => {
      handleFiles(e.target.files);
    };

    const handleRemoveFile = (fileId, showMessage = true) => {
      const fileToRemove = uploadedFiles?.find((file) => file.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      const newFiles = uploadedFiles?.filter((file) => file.id !== fileId);
      setUploadedFiles(newFiles);

      if (newFiles.length === 0) {
        setIsPreviewOpen(false);
      }

      if (showMessage) {
        message.info("File removed");
      }
    };

    const handlePreviewClose = ({fromPreview = false} = {}) => {
      console.log("handlePreviewClose", fromPreview);
      onPreviewClose();
      setIsPreviewOpen(false);
      if (!fromPreview) {
        setUploadedFiles([]);
      }
    };

    const handleReupload = (fileId) => {
      fileInputRef.current?.click();
      if (fileId) {
        setStoredFileIdToReplace(fileId);
      }
    };

    const handleAddMore = () => {
      if (uploadedFiles.length >= maxFileLimit) {
        handleExceededFileLimit();
        return;
      }
      fileInputRef.current?.click();
      setStoredFileIdToReplace(null);
      setIsAddMoreClicked(true);
    };

    const handleSave = () => {
      if (uploadedFiles.length === 0) {
        message.warning("No files to save");
        return;
      }

      if (onFileUpload) {
        const filesToUpload = uploadedFiles.map((f) => f.file);
        onFileUpload(filesToUpload);
      }

      setIsPreviewOpen(false);
      message.success("Files saved successfully");
    };

    useEffect(() => {
      return () => {
        uploadedFiles.forEach((file) => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
      };
    }, []);

    useEffect(() => {
      const fetchImageAsFile = async (url, filename = "image.jpg") => { // here
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: blob.type });
        return file;
      };
      const fetchImages = async () => {
        if (uploadedFilesFromStore?.length === 0) {
          return;
        }
        if (
          !uploadedFilesFromStore?.[0]?.fileUrl?.includes(
            "iscribe.blob.core.windows.net"
          )
        ) {
          setUploadedFiles(uploadedFilesFromStore);
          return;
        }

        const normalizedFiles = await Promise.all(
          uploadedFilesFromStore.map(async (file, index) => {
            const fileBlob = await fetchImageAsFile(file.fileUrl);
            const objectUrl = URL.createObjectURL(fileBlob);
            return {
              id: Date.now() + index,
              name: file.filename,
              fileUrl: objectUrl,
              url: objectUrl,
              preview: objectUrl,
              rotation: 0,
              crop: file?.crop || {
                unit: "%",
                x: 5,
                y: 5,
                width: 90,
                height: 90,
              },
            };
          })
        );
        setUploadedFiles(normalizedFiles);
      };
      fetchImages();
    }, [uploadedFilesFromStore]);

    const handleRotateClick = (fileId) => {
      const fileToRotate = uploadedFiles?.find((file) => file.id === fileId);
      const newRotation = (fileToRotate.rotation + 90) % 360;
      const newFiles = uploadedFiles?.map((file) => {
        if (file.id === fileId) {
          return { ...file, rotation: newRotation };
        }
        return file;
      });
      setUploadedFiles(newFiles);
    };

    const handleUpdatedFiles = (updatedFiles) => {
      setUploadedFiles(updatedFiles);
    };

    useImperativeHandle(ref, () => ({
      handleUploadClick: () => {
        fileInputRef.current?.click();
      },
      handleAddEditClick: () => {
        setIsPreviewOpen(true);
      },
    }));

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        {isPreviewOpen ? (
          <PreviewDrawerMobile
            isOpen={isPreviewOpen}
            isMobile={true}
            onClose={handlePreviewClose}
            uploadedFiles={uploadedFiles}
            onReupload={handleReupload}
            onRemove={handleRemoveFile}
            onAddMore={handleAddMore}
            onSave={handleSave}
            onRotate={handleRotateClick}
            handleUpdatedFiles={handleUpdatedFiles}
            isAddMoreClicked={isAddMoreClicked}
            patientUniqueId={patientUniqueId}
            sessionId={sessionId}
            autoDigitizeRx={autoDigitizeRx}
          />
        ) : null}
      </>
    );
  }
);

export default ImageUpload;
