import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { browserName } from 'react-device-detect';
import { uploadDocsToAzure } from '../pages/medicalRecords/service';
import { sendMessageToParent } from '../utils/utils';
import { EVENTS } from '../utils/events';

/**
 * Creates print and download handlers for QR code modals
 * Handles both web browsers and in-app webviews
 * 
 * @param {Object} options - Configuration options
 * @param {React.RefObject} options.printRef - Ref to the content element to print/download
 * @param {string} options.fileName - Base name for the PDF file (without extension)
 * @param {string} [options.pageStyle] - Optional CSS styles for print media query
 * @returns {Object} Object containing handlePrint and handleDownload functions
 */
export const useQrPrintDownloadHandlers = ({ printRef, fileName, pageStyle }) => {
  const defaultPageStyle = `
    @media print {
      .opd-plans-inner-contianer {
        font-size: 2.5rem;
        padding: 40px;
      }
      .opd-title {
        font-size: 3rem;
      }
      .opd-byline {
        font-size: 2rem;
      }
      .opd-logo img {
        height: 3rem;
      }
      .opd-qr-image {
        width: 300px !important;
        height: 300px !important;
      }
      .opd-scan-text {
        font-size: 1.8rem;
      }
    }
  `;

  const handlePrintWeb = useReactToPrint({
    content: () => printRef.current,
    pageStyle: pageStyle || defaultPageStyle,
  });

  const handlePrintInApp = async () => {
    const element = printRef.current;
    if (!element) {
      console.error('Element not found for printing');
      return;
    }

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    const pdfBlob = pdf.output('blob');
    
    const file = new File([pdfBlob], `${fileName}-${new Date().toISOString().split("T")[0]}.pdf`, {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.append(file?.name, file);
    const res = await uploadDocsToAzure(formData);
    const printUrl = res?.[0]?.url;
    if (res?.length > 0) {
      sendMessageToParent(EVENTS.PRINT, { url: printUrl });
    }
  };

  const handlePrint = () => {
    if (browserName == "Chrome WebView" || browserName == "WebKit") {
      handlePrintInApp();
    } else {
      handlePrintWeb();
    }
  };

  const handleDownloadWeb = async () => {
    const element = printRef.current;
    if (!element) {
      console.error('Element not found for downloading');
      return;
    }

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${fileName}.pdf`);
  };

  const handleDownloadInApp = async () => {
    const element = printRef.current;
    if (!element) {
      console.error('Element not found for downloading');
      return;
    }

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    const pdfBlob = pdf.output('blob');
    
    const file = new File([pdfBlob], `${fileName}-${new Date().toISOString().split("T")[0]}.pdf`, {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.append(file?.name, file);
    const res = await uploadDocsToAzure(formData);
    const printUrl = res?.[0]?.url;
    if (res?.length > 0) {
      sendMessageToParent(EVENTS.DOWNLOAD, { url: printUrl });
    }
  };

  const handleDownload = () => {
    if (browserName == "Chrome WebView" || browserName == "WebKit") {
      handleDownloadInApp();
    } else {
      handleDownloadWeb();
    }
  };

  return {
    handlePrint,
    handleDownload,
  };
};
