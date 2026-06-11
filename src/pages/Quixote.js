import React, { useState, useEffect, useContext, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Spin } from "antd";

import PrintSettingsContext from '../context/PrintSettingsContext';
import moment from "moment";
import { useSelector } from "react-redux";

import { NORMAL } from "../utils/constants";
import ViewPDF from '../components/print_settings/ViewPDF';
import { renderPDF } from '../components/print_settings/renderPDF';
import { PDF } from '../components/print_settings/PDF';
import { pdfjs, Document, Page } from "react-pdf";
import { useAccess } from './vaccination/useAccess';
import { setCurrentSessionRx } from '../redux/obstetricSlice';
import { useDispatch } from 'react-redux';
const worker = require('pdfjs-dist/build/pdf.worker.min.js')
pdfjs.GlobalWorkerOptions.workerSrc = worker

const showDateFormat = 'DD MMM, YY'

function Quixote({ mode = NORMAL, ophthalModuleData, ...props }) {

    const { smartRxFile, divWidth, caseManagerData, printSettings, fileHeader, fileFooter, fileLogo, fileWatermark, fileSignature, labParamsData, customModules, hospitalSearchResults, carePlanAssignments, isDigitisedPrintConfig, isCvtExtHosAccessableFromGB } = useContext(PrintSettingsContext);
    const { frequencyList, timingList } = useSelector((state) => state.doctors);

    const {isGynaecHistoryAccessable} = useAccess();
    const { isPediatricAccessable } = useAccess();
    const dispatch = useDispatch();

    const initialRows = (() => {
        const rows = [
            {
                key: '1',
                name: `Temp (F)`,
            },
            {
                key: '2',
                name: `Pulse (/min)`,
            },
            {
                key: '3',
                name: `Resp. Rate (/min)`,
            },
            {
                key: '4',
                name: `Blood Pressure (mmHg)`,
            },
            // {
            //     key: '4',
            //     name: `Systolic (mmHg)`,
            // },
            // {
            //     key: '5',
            //     name: `Diastolic (mmHg)`,
            // },
            {
                key: '5',
                name: `SPO2 (%)`,
            },
            {
                key: '6',
                name: `General RBS (mg/dl)`,
            },
             {
                key: '7',
                name: `FIB4 `,
            },
            {
                key: '8',
                name: `Waist Circumference (cms)`,
            },
            {
                key: '9',
                name: `OFC (cms)`,
            },
            {
                key: '10',
                name: `Height (cms)`,
            },
            {
                key: '11',
                name: `Weight (kgs)`,
            },
            {
                key: '12',
                name: `BMI (kg/m²)`,
            },
            {
                key: '13',
                name: `BMR (kcals)`,
            },
            {
                key: '14',
                name: `BSA (m²)`,
            },
        ];

        if (!isPediatricAccessable) return rows;

        const priorityNames = ['Weight (kgs)', 'Height (cms)', 'OFC (cms)'];
        const priorityRows = [];
        const otherRows = [];

        rows.forEach((row) => {
            if (priorityNames.includes(row.name)) {
                priorityRows.push(row);
            } else {
                otherRows.push(row);
            }
        });

        const orderedPriority = priorityNames
            .map((name) => priorityRows.find((row) => row.name === name))
            .filter(Boolean);

        return [...orderedPriority, ...otherRows];
    })();

    const setRowValue = (rowName, columnIndex, value) => {
        const targetRow = initialRows.find((row) => row.name === rowName);
        if (targetRow) {
            targetRow[columnIndex] = value ?? '-';
        }
    };

    const initialColumns = [
        {
            title: 'Name'
        },
    ];

    // Extract unique dates from the JSON array
    const uniqueDates = caseManagerData && caseManagerData.vitals.length > 0 ? [...caseManagerData.vitals.slice(0, 3).map((item) => item.date)] : [];

    // Initialize columns for each unique date
    const dateColumns = uniqueDates.map((date, index) => ({
        title: moment(date).format(showDateFormat)
    }));

    const columns = [...initialColumns, ...dateColumns];

    caseManagerData &&
        caseManagerData.vitals.length > 0 &&
        caseManagerData.vitals.slice(0, 3).map((item, index) => {
            setRowValue('Temp (F)', index, item.temp || '-');
            setRowValue('Pulse (/min)', index, item.pres || '-');
            setRowValue('Resp. Rate (/min)', index, item.resp_rate || '-');
            const formattedBP = item.blood_press
                ? item.blood_press.endsWith('/')
                    ? item.blood_press.substring(0, item.blood_press.length - 1)
                    : item.blood_press
                : '-';
            setRowValue('Blood Pressure (mmHg)', index, formattedBP || '-');
            setRowValue('SPO2 (%)', index, item.spo2 || '-');
            setRowValue('General RBS (mg/dl)', index, item.general_rbs || '-');
            setRowValue('FIB4 ', index, item.fib4 || '-');
            setRowValue('Waist Circumference (cms)', index, item.waist_circumference || '-');
            setRowValue('OFC (cms)', index, item.ofc || '-');
            setRowValue('Height (cms)', index, item.height || '-');
            setRowValue('Weight (kgs)', index, item.weight || '-');
            setRowValue('BMI (kg/m²)', index, item.bmi ? parseFloat(item.bmi).toFixed(2) : '-');
            setRowValue('BMR (kcals)', index, item.bmr ? parseFloat(item.bmr).toFixed(2) : '-');
            setRowValue('BSA (m²)', index, item.bsa ? parseFloat(item.bsa).toFixed(2) : '-');
        });

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
        // const makePDFUrl = async () => {
        //     var make_data = {
        //         mode: mode,
        //         caseManagerData: caseManagerData,
        //         columns: columns,
        //         initialRows: initialRows,
        //         frequencyList: frequencyList,
        //         timingList: timingList,
        //         printSettings: mode == NORMAL ? printSettings : props.printSettingsCopy,
        //         fileHeader: mode == NORMAL ? fileHeader : props.fileHeaderCopy,
        //         fileFooter: mode == NORMAL ? fileFooter : props.fileFooterCopy,
        //         fileLogo: mode == NORMAL ? fileLogo : props.fileLogoCopy,
        //         fileWatermark: fileWatermark,
        //         fileSignature: fileSignature,
        //     }
        //     const blob = await renderPDF({ ...make_data });
        //     setPdfUrl(URL.createObjectURL(blob))
        // }
        const makePDFUrl = async () => {
            if (!caseManagerData || !caseManagerData.patient_data) {
                return;
            }

            const renderPdfWithSmartRx = (smartRxData) => pdf(<ViewPDF
                mode={mode}
                caseManagerData={caseManagerData}
                carePlanAssignments={carePlanAssignments}
                smartRxData={smartRxData}
                isDigitisedPrintConfig={isDigitisedPrintConfig}
                isCvtExtHosAccessableFromGB={isCvtExtHosAccessableFromGB}
                columns={columns}
                initialRows={initialRows}
                frequencyList={frequencyList}
                timingList={timingList}
                printSettings={mode == NORMAL ? printSettings : props.printSettingsCopy}
                fileHeader={mode == NORMAL ? fileHeader : props.fileHeaderCopy}
                fileFooter={mode == NORMAL ? fileFooter : props.fileFooterCopy}
                fileLogo={mode == NORMAL ? fileLogo : props.fileLogoCopy}
                fileWatermark={fileWatermark}
                fileSignature={fileSignature}
                todayVaccines={props.todayVaccines}
                growthChartDetails={props.growthChartDetails}
                isGynaecHistoryAccessable = {isGynaecHistoryAccessable}
                obsHistoryData={props.obstetricDetails}
                labParamsData={labParamsData}
                customModules={hospitalSearchResults?.modules}
                patientBills={props.patientBills}
                advanceReceipts={props.advanceReceipts}
                patientWalletBalance={props.patientWalletBalance}
                selectedLang={printSettings?.default_language === "English" ? 1 : printSettings?.default_language}
                ophthalModuleData={ophthalModuleData}
                abhaDetails={props.abhaDetails}
                dentalData={props.dentalData}
            />).toBlob();

            const setPdfUrlSafe = (url) => {
                if (!isMountedRef.current || renderId !== renderIdRef.current) {
                    URL.revokeObjectURL(url);
                    return false;
                }
                if (pdfUrlRef.current) {
                    URL.revokeObjectURL(pdfUrlRef.current);
                }
                pdfUrlRef.current = url;
                setPdfUrl(url);
                dispatch(setCurrentSessionRx(url));
                return true;
            };

            try {
                const blob = await renderPdfWithSmartRx(smartRxFile);
                const url = URL.createObjectURL(blob);
                setPdfUrlSafe(url);
            } catch (err) {
                if (smartRxFile) {
                    try {
                        const blobFallback = await renderPdfWithSmartRx([]);
                        const fallbackUrl = URL.createObjectURL(blobFallback);
                        setPdfUrlSafe(fallbackUrl);
                    } catch (fallbackErr) {
                    }
                } else {
                    throw err;
                }
            }
        }
        // Only generate PDF if caseManagerData exists and has patient_data
        // This prevents generating PDF with empty/incomplete data
        if (caseManagerData && caseManagerData.patient_data) {
            makePDFUrl()
        }
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
        fileLogo,
        props.todayVaccines,
        props.growthChartDetails,
        props.obstetricDetails,
        printSettings?.default_language,
        caseManagerData,
        frequencyList,
        timingList,
        labParamsData,
        customModules,
        hospitalSearchResults,
        carePlanAssignments,
        smartRxFile,
        props.patientBills,
        props.advanceReceipts,
        props.patientWalletBalance,
        props.abhaDetails,
        props.dentalData
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

export default React.memo(Quixote);
