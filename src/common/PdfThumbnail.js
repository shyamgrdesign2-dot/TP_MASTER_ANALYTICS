import { Spin } from 'antd';
import React, { useCallback, useEffect } from 'react';
import axios from "axios";

import { useDispatch } from "react-redux";
import { updatePatientCertificateList } from "../redux/doctorsSlice";
import { renderCertificatePayloadToBlob } from "../utils/certificatePrintPayload";

import { pdfjs } from "react-pdf";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
const worker = require('pdfjs-dist/build/pdf.worker.min.js')
pdfjs.GlobalWorkerOptions.workerSrc = worker

const PdfThumbnail = ({ pdfUrl, index, thumbnailUrl }) => {

    const dispatch = useDispatch();

    const toJsonOutputUrl = useCallback((url) => {
        if (!url) return url;
        try {
            const urlObj = new URL(url, window.location.origin);
            urlObj.searchParams.set("output", "json");
            return urlObj.toString();
        } catch (e) {
            const hasOutput = /(?:[?&])output=/.test(url);
            if (hasOutput) {
                return url.replace(/([?&])output=[^&]*/g, "$1output=json");
            }
            return `${url}${url.includes("?") ? "&" : "?"}output=json`;
        }
    }, []);

    const loadPdfThumbnail = useCallback((url) => {
        return new Promise(async (resolve) => {
            try {
                const response = await axios.get(toJsonOutputUrl(url));
                const payload = response?.data?.data;
                if (!payload) {
                    resolve('');
                    return;
                }

                const blob = await renderCertificatePayloadToBlob(payload);
                if (!(blob instanceof Blob)) {
                    resolve('');
                    return;
                }

                const arrayBuffer = await blob.arrayBuffer();
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdfDoc = await loadingTask.promise;
                const page = await pdfDoc.getPage(1);
                const viewport = page.getViewport({ scale: 1 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport
                }).promise;

                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                resolve('');
            }
        });
    }, [toJsonOutputUrl]);

    useEffect(() => {
        let isMounted = true;
        const updateList = async () => {
            const makeThumbnailUrl = await loadPdfThumbnail(pdfUrl);
            if (!isMounted) return;
            dispatch(updatePatientCertificateList({ index, thumbnailUrl: makeThumbnailUrl }));
        };
        if (thumbnailUrl === undefined) {
            updateList();
        }

        return () => {
            isMounted = false;
        };
    }, [dispatch, index, pdfUrl, thumbnailUrl, loadPdfThumbnail]);

    return (
        <div>
            {thumbnailUrl !== undefined ? <img src={thumbnailUrl} height={150} alt="PDF Thumbnail" /> : <Spin />}
        </div>
    );
};

export default React.memo(PdfThumbnail);
