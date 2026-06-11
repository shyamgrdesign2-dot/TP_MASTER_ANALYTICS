import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const ABHA_PRINT_PAGE_STYLE = `
  @media print {
    /* Hide buttons and close button */
    .qr-close-btn,
    .d-flex.align-items-center.justify-content-between {
      display: none !important;
    }
    
    /* Hide screen text */
    .abha-scan-text-screen {
      display: none !important;
    }
    
    /* Show print-only text */
    .abha-print-text {
      display: block !important;
    }
    
    /* Container styling - optimized for single page */
    .opd-plans-inner-contianer {
      font-size: 2.5rem;
      padding: 30px !important;
      width: 100% !important;
      max-width: 100% !important;
      position: relative !important;
      min-height: auto !important;
      padding-bottom: 60px !important;
    }
    
    /* Header Icon spacing - reduced to fit on one page */
    .opd-plans-inner-contianer > div:first-child {
      margin-top: -0.5rem !important;
      margin-bottom: 1rem !important;
    }
    
    /* Increase abha-main icon size in print */
    .abha-main-icon-download img {
      max-height: 100px !important;
      height: 100px !important;
    }
    
    .opd-title {
      font-size: 3rem;
      margin-bottom: 1rem !important;
    }
    
    /* Increase clinic name font size in print preview */
    .abha-clinic-name {
      font-size: 3.5rem !important;
      margin-bottom: 1rem !important;
      /* Override truncation styles to show full text */
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: nowrap !important;
      max-width: 100% !important;
      transform-origin: center top !important;
    }
    
    /* QR Code container spacing - reduced */
    .opd-plans-inner-contianer > div:nth-child(3) {
      margin-top: 1rem !important;
      position: relative !important;
    }
    
    /* Ensure QR frame is visible in print - multiple selectors for reliability */
    .opd-plans-inner-contianer img[alt="QR Frame"],
    .opd-plans-inner-contianer > div:nth-child(3) img[alt="QR Frame"],
    .opd-plans-inner-contianer > div:nth-child(3) > img {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: absolute !important;
      z-index: 0 !important;
      width: 100% !important;
      height: 100% !important;
      top: 0 !important;
      left: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    /* Ensure QR code container's child divs maintain positioning */
    .opd-plans-inner-contianer > div:nth-child(3) > div {
      position: relative !important;
      z-index: 1 !important;
    }
    
    /* Force all SVG images to print */
    .opd-plans-inner-contianer img[src*=".svg"],
    .opd-plans-inner-contianer img[src*="qr-outer-frame"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    .opd-byline {
      font-size: 2rem;
    }
    
    .opd-qr-image {
      width: 400px !important;
      height: 400px !important;
    }
    
    /* Increase QR code container size to accommodate larger QR code */
    .opd-plans-inner-contianer > div:nth-child(3) {
      width: 450px !important;
      height: 450px !important;
    }
    
    /* Hide screen text in print */
    .abha-scan-text-screen {
      display: none !important;
    }
    
    /* Print-only text - reduced margin to fit on one page */
    .abha-print-text {
      display: block !important;
      margin-top: 1.5rem !important;
      font-size: 3.5rem !important;
    }
    
    .abha-print-text .opd-scan-text:first-child {
      margin-top: 0 !important;
      font-size: 1.8rem !important;
    }
    
    .abha-print-text .opd-scan-text:last-child {
      margin-top: 2rem !important;
      font-size: 2rem !important;
      font-style: italic !important;
    }
    
    /* Powered by - position at bottom of page in print */
    .abha-powered-by {
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      text-align: center !important;
      margin-top: 0 !important;
      padding: 0 !important;
    }
    
    /* Increase TatvaPractice logo size in print */
    .abha-powered-by img[alt="TatvaPractice"] {
      height: 30px !important;
    }
    
    /* Add bottom padding to container to prevent content overlap with fixed footer */
    .opd-plans-inner-contianer {
      padding-bottom: 50px !important;
    }
    
    /* Ensure card doesn't overflow */
    .opd-qr {
      width: 100% !important;
      max-width: 100% !important;
      padding: 1.5rem !important;
      height: auto !important;
      overflow: visible !important;
    }
    
    /* Fix any layout issues */
    body {
      margin: 0;
      padding: 0;
    }
  }
`;


export const createAbhaPrintHandlerConfig = (contentRef) => {
  return {
    content: () => contentRef.current,
    pageStyle: ABHA_PRINT_PAGE_STYLE
  };
};


export const createAbhaDownloadHandler = ({ contentRef, abhaCenterLogo, profile, errorMessage }) => {
  return async () => {
    try {
      if (contentRef.current) {
        const element = contentRef.current;
        
        const clonedElement = element.cloneNode(true);
        
        clonedElement.style.position = 'absolute';
        clonedElement.style.left = '-9999px';
        clonedElement.style.top = '0';
        clonedElement.style.width = element.offsetWidth + 'px';
        document.body.appendChild(clonedElement);
        
        const screenText = clonedElement.querySelector('.abha-scan-text-screen');
        const printText = clonedElement.querySelector('.abha-print-text');
        const abhaMainIconDiv = clonedElement.querySelector('.abha-main-icon-download');
        const clinicName = clonedElement.querySelector('.abha-clinic-name');
        const qrContainer = clonedElement.querySelector('.abha-qr-container');
        const qrWrapper = clonedElement.querySelector('.abha-qr-code-wrapper');
        const goDigitalText = clonedElement.querySelector('.abha-go-digital-text');
        
        if (abhaMainIconDiv) {
          abhaMainIconDiv.style.display = 'flex';
          abhaMainIconDiv.style.marginTop = '-0.5rem';
          abhaMainIconDiv.style.marginBottom = '0.25rem';
          const abhaMainIconImg = abhaMainIconDiv.querySelector('img');
          if (abhaMainIconImg) {
            abhaMainIconImg.style.maxHeight = '80px';
            abhaMainIconImg.style.height = '80px';
          }
        }
        
        if (clinicName) {
          clinicName.style.marginTop = '0.1rem';
          clinicName.style.marginBottom = '0.5rem';
          clinicName.style.fontSize = '2.5rem';
          clinicName.style.fontWeight = '700';
          clinicName.style.overflow = 'visible';
          clinicName.style.textOverflow = 'clip';
          clinicName.style.whiteSpace = 'normal';
          clinicName.style.wordWrap = 'break-word';
          clinicName.style.maxWidth = '100%';
        }
        
        const originalQrSize = 180;
        const newQrSize = 400;
        const scaleFactor = newQrSize / originalQrSize;
        
        if (qrContainer) {
          const newContainerSize = newQrSize + 50;
          qrContainer.style.width = `${newContainerSize}px`;
          qrContainer.style.height = `${newContainerSize}px`;
        }
        
        if (qrWrapper) {
          qrWrapper.style.transform = `scale(${scaleFactor})`;
          qrWrapper.style.transformOrigin = 'center center';
        }
        
        if (screenText) screenText.style.display = 'none';
        if (printText) {
          printText.style.display = 'block';
          printText.style.marginTop = '0.75rem';
        }
        
        if (goDigitalText) {
          goDigitalText.style.setProperty('font-style', 'italic', 'important');
        }
        
        const qrFrame = clonedElement.querySelector('img[alt="QR Frame"]');
        if (qrFrame) {
          qrFrame.style.display = 'block';
          qrFrame.style.visibility = 'visible';
          qrFrame.style.opacity = '1';
        }
        
        const poweredBySection = clonedElement.querySelector('.abha-powered-by');
        if (poweredBySection) {
          clonedElement.style.position = 'relative';
          clonedElement.style.minHeight = '600px';
          clonedElement.style.paddingBottom = '30px';
          
          poweredBySection.style.position = 'absolute';
          poweredBySection.style.bottom = '0';
          poweredBySection.style.left = '0';
          poweredBySection.style.right = '0';
          poweredBySection.style.width = '100%';
          poweredBySection.style.textAlign = 'center';
          poweredBySection.style.marginTop = '0';
        }
        
        const preloadImage = (src) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        };
        
        try {
          await preloadImage(abhaCenterLogo);
        } catch (e) {
          console.warn('Failed to preload ABHA center logo:', e);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        void clonedElement.offsetHeight;
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const canvas = await html2canvas(clonedElement, { 
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        document.body.removeChild(clonedElement);
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const margin = 30;
        const contentWidth = pdfWidth - (2 * margin);
        const contentHeight = (canvas.height * contentWidth) / canvas.width;
        
        const yPosition = contentHeight < pdfHeight 
          ? (pdfHeight - contentHeight) / 2 
          : 0;
        const xPosition = margin;

        pdf.addImage(imgData, 'PNG', xPosition, yPosition, contentWidth, contentHeight);
        pdf.save(`ABHA-QR-Code-${profile?.um_name || 'doctor'}.pdf`);
      }
    } catch (error) {
      console.error("Error downloading ABHA QR Code:", error);
      errorMessage("Failed to download QR Code. Please try again.");
    }
  };
};

export const ABHA_TEXT_CONFIG = {
  screenScanText: "Scan the above QR to create or link your ABHA account",
  printScanText: "Scan the above QR to create or link your ABHA account in three easy steps",
  printAdditionalText: "Get Your ABHA. Go Digital."
};

