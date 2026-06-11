import React, { useState, useEffect, useRef } from "react";
import { Spin } from "antd";
import { Navbar } from "react-bootstrap";
import { deviceType, isMobile, osName } from "react-device-detect";
import axios from 'axios';
import { saveAs } from 'file-saver';
import { pdfjs, Document, Page } from "react-pdf";
import { getClinicName, getDeviceSdkData, getTokenData } from "../../utils/utils";
import { useSelector } from "react-redux";
import { printBlobInNewTab } from "../../pages/opdBilling/utils/helper";
const worker = require('pdfjs-dist/build/pdf.worker.min.js')
pdfjs.GlobalWorkerOptions.workerSrc = worker

function BillingPrint({ handlePdfDrawer, PDF_URL }) {
  const { profile } = useSelector((state) => state.doctors);

  const divRef = useRef(null);

  const [divWidth, setDivWidth] = useState(0);
  const [numPages, setNumPages] = useState();
  const [printBlob, setPrintBlob] = useState(null);

  useEffect(() => {
    setDivWidth(divRef.current?.offsetWidth);
  }, [divRef]);

  const printContent = async () => {
    if (isMobile || osName == 'Linux') {
      printBlobInNewTab(printBlob);
    } else {
      var blobURL = URL.createObjectURL(printBlob);
      // Remove all existing iframes
      document.querySelectorAll('iframe').forEach(function (iframe) {
        iframe.parentNode.removeChild(iframe);
      });
      var iframe = document.createElement('iframe'); //load content in an iframe to print later
      document.body.appendChild(iframe);
      iframe.style.display = 'none';
      iframe.src = blobURL;
      iframe.onload = function () {
        setTimeout(function () {
          iframe.focus();
          iframe.contentWindow.print();
          // Revoke the Blob URL to avoid memory leaks
          URL.revokeObjectURL(blobURL);
        }, 1);
      };
    }
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData(); 
    const deviceSdkData = getDeviceSdkData(); 
    window.Moengage.track_event("TP_Monetization_InvoicePrint", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      um_id: tokenData?.user_id,
      clinic_Name: clinic_name,
      ...deviceSdkData,
    });
  };

  const handleDownload = async () => {
    try {
      const response = await axios({
        url: PDF_URL,
        method: 'GET',
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      saveAs(blob, `${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData(); 
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_monetization_invoicedownload", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      um_id: tokenData?.user_id,
      clinic_Name: clinic_name,
      ...deviceSdkData,
    });
  };

  async function onDocumentLoadSuccess(successEvent) {
    setNumPages(successEvent?.numPages);
    const data = await successEvent.getData()
    const blob = new Blob([data], { type: 'application/pdf' })
    setPrintBlob(blob)
  }
  return (
    <>
      <Navbar className="justify-content-between headerprescription p-0">
        <div className='h-100 d-flex align-items-center w-100 justify-content-between'>
          <div className='align-items-center d-flex h-100'>
            <div className='border-end h-100 text-center' onClick={handlePdfDrawer}>
              <div className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                <i className='icon-right'></i>
              </div>
            </div>
            <div className='ms-3 title-common'>Invoice</div>
          </div>
          <div className='align-items-center d-flex h-100'>
            <button className='btn' onClick={printContent}>
              <i className="fs-3 text-primary icon-Print"></i>
            </button>
            <button className='btn' onClick={handleDownload}>
              <i className="fs-3 text-primary icon-download"></i>
            </button>
          </div>
        </div>
      </Navbar>

      <div ref={divRef} style={{ height: 'calc(100vh - 60px)', overflowY: 'auto', overflowX: 'hidden' }}>
        <Document
          loading={<Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%" }} />}
          error={<div style={{ position: 'absolute', zIndex: 0, left: "42%", top: "50%" }} >{'Failed to load PDF file.'}</div>}
          noData={<div style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%" }} >{'No PDF file specified.'}</div>}
          file={PDF_URL}
          onLoadSuccess={onDocumentLoadSuccess}>
          {Array.apply(null, Array(numPages))
            .map((x, i) => i + 1)
            .map((page) => {
              return (
                <Page
                  key={Math.random()}
                  className={printBlob ? 'react-pdf__Page_afterload' : null}
                  loading={null}
                  width={divWidth}
                  pageNumber={page}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              );
            })}
        </Document>
      </div>
    </>
  );
}

export default React.memo(BillingPrint);
