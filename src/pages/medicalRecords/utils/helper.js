import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

export const mergeDocuments = (doctorUploadedDocs, patientUploadedDocs) => {
  const updatedDocs = [...doctorUploadedDocs, ...patientUploadedDocs];
  updatedDocs.sort(
    (a, b) => new Date(b.created_date) - new Date(a.created_date)
  );
  return updatedDocs;
};

export const loadPdf = (url) => {
  return new Promise(async (resolve) => {
    try {
      const loadingTask = pdfjs.getDocument(url);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;

      // Convert canvas to data URL (base64)
      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL); // Return the base64 image data
    } catch (e) {
      resolve("");
    }
  });
};

export const uploadDocURLtoFile = (dataurl, filename) => {
  const base64 = dataurl?.split(",")?.[1];
  const mime = dataurl?.match(/:(.*?);/)?.[1];

  const bstr = atob(base64);
  let n = bstr?.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export const getCorrectedFileName = (fileName) => {
  const parts = fileName.split(".");
  const extension = parts.pop(); // Get the last part (the file extension)
  const baseName = parts.join(".").replace(/\./g, "").replace(/\s+/g, "-"); // Remove dots and replace spaces with hyphens
  return `${baseName}.${extension}`;
};

export const generateUniqueFileName = (file) => {
  const fileExtension = file.name.split(".").pop(); // Extract file extension
  const uniqueName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}.${fileExtension}`;
  return uniqueName;
};

export function shortenText(
  text,
  length = 25,
  firstPartLength = 18,
  lastPartLength = -7
) {
  if (text.length > length) {
    const firstPart = text.slice(0, firstPartLength);
    const lastPart = text.slice(lastPartLength);
    return `${firstPart}...${lastPart}`;
  }
  return text;
}

export const loadVideoThumbnail = (videoFile, seekTime = 1, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    let video = null;
    let canvas = null;
    let videoURL = null;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (videoURL) URL.revokeObjectURL(videoURL);
      if (video) {
        video.onloadedmetadata = null;
        video.onseeked = null;
        video.onerror = null;
        video.src = "";
        video.load();
        video.remove();
        video = null;
      }
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
    };

    try {
      videoURL = URL.createObjectURL(videoFile);
      video = document.createElement("video");
      canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      // Timeout protection - prevent infinite hang
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Video thumbnail generation timeout - file may be corrupted"));
      }, timeout);

      video.onloadedmetadata = () => {
        try {
          // Validate video has valid duration
          if (!video.duration || isNaN(video.duration) || video.duration === 0) {
            cleanup();
            reject(new Error("Invalid video duration"));
            return;
          }

          // Seek to safe position (not beyond video duration)
          const safeSeekTime = Math.min(seekTime, video.duration * 0.1); // 10% into video or seekTime
          video.currentTime = safeSeekTime;
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      video.onseeked = () => {
        try {
          // Validate video dimensions
          if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
            cleanup();
            reject(new Error("Invalid video dimensions"));
            return;
          }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataURL = canvas.toDataURL("image/png");
          
          cleanup();
          resolve(dataURL);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      video.onerror = (err) => {
        cleanup();
        reject(new Error("Failed to load video - " + (err?.message || "unknown error")));
      };

      video.src = videoURL;
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};

export const isVideoFile = (fileType) => {
  return fileType && fileType.startsWith("video/");
};

export const isImageFile = (fileType) => {
  return fileType && fileType.startsWith("image/");
};

export const isPdfFile = (fileType) => {
  return fileType === "application/pdf";
};
