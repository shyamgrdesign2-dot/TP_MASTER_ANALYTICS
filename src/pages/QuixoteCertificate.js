import React, { useState, useEffect, useContext, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Spin } from "antd";

import { useSelector, useDispatch } from "react-redux";

import PrintSettingsContext from '../context/PrintSettingsContext';

import { NORMAL } from "../utils/constants";
import ViewCertificatePDF from '../components/print_settings/ViewCertificatePDF';
import { setCurrentSessionRx } from '../redux/obstetricSlice';
import { pdfjs, Document, Page } from "react-pdf";
const worker = require('pdfjs-dist/build/pdf.worker.min.js')
pdfjs.GlobalWorkerOptions.workerSrc = worker

function QuixoteCertificate({ mode = NORMAL, ...props }) {

    const { profile } = useSelector((state) => state.doctors);
    const dispatch = useDispatch();
    const { divWidth, certificateData, printSettings, fileHeader, fileFooter, fileLogo, fileWatermark, fileSignature } = useContext(PrintSettingsContext);

    const [pdfUrl, setPdfUrl] = useState(null)
    const [numPages, setNumPages] = useState();
    const [loadSuccess, setLoadSuccesss] = useState(false);
    const pdfUrlRef = useRef(null);
    const renderIdRef = useRef(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (pdfUrlRef.current) {
                URL.revokeObjectURL(pdfUrlRef.current);
                pdfUrlRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const renderId = ++renderIdRef.current;
        const makePDFUrl = async () => {
            const blob = await pdf(<ViewCertificatePDF
                mode={mode}
                heading={certificateData?.title}
                content={certificateData?.content}
                doctorData={profile}
                printSettings={mode == NORMAL ? printSettings : props.printSettingsCopy}
                fileHeader={mode == NORMAL ? fileHeader : props.fileHeaderCopy}
                fileFooter={mode == NORMAL ? fileFooter : props.fileFooterCopy}
                fileLogo={mode == NORMAL ? fileLogo : props.fileLogoCopy}
                fileWatermark={fileWatermark}
                fileSignature={fileSignature}
            />).toBlob();
            const url = URL.createObjectURL(blob);
            if (!isMountedRef.current || renderId !== renderIdRef.current) {
                URL.revokeObjectURL(url);
                return;
            }
            if (pdfUrlRef.current) {
                URL.revokeObjectURL(pdfUrlRef.current);
            }
            pdfUrlRef.current = url;
            setPdfUrl(url);
            dispatch(setCurrentSessionRx(url));
        }
        certificateData && makePDFUrl()
        return () => {
            setLoadSuccesss(false)
        };
    }, [
        mode,
        props.printSettingsCopy,
        props.fileHeaderCopy,
        props.fileFooterCopy,
        props.fileLogoCopy,
        printSettings,
        fileHeader,
        fileFooter,
        fileSignature,
        fileWatermark,
        fileLogo
    ]);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages)
        setLoadSuccesss(true)
    }

    return (
        <>
            {pdfUrl ? (
                <Document
                    loading={<Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%", height: '100%' }} />}
                    error={<div style={{ position: 'absolute', zIndex: 0, left: "42%", top: "50%" }} >{'Failed to load PDF file.'}</div>}
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}>
                    {Array.apply(null, Array(numPages))
                        .map((x, i) => i + 1)
                        .map((page) => {
                            return (
                                <Page
                                    key={page}
                                    className={loadSuccess ? 'react-pdf__Page_afterload' : null}
                                    loading={null}
                                    width={divWidth}
                                    pageNumber={page}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            );
                        })}
                </Document>
            ) : (
                <Spin style={{ position: 'absolute', zIndex: 0, left: "50%", top: "50%", height: '100%' }} />
            )}
        </>
    )
};

export default React.memo(QuixoteCertificate);
