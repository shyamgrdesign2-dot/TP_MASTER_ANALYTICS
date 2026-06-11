import React, { useEffect, useState } from 'react';
import { Font, Page, Text, View, Image, Document, StyleSheet } from '@react-pdf/renderer';
import { isNumeric, medicine_freq_dosage_format, chunkArray, capitalize, getIndianLanguageFont, getFrequencyTitle, getTimeingTitle, getDurationTitle, getRxTitle, getFrequencyLanguageTitles, camelCaseToTitle, camelToSentence, calculateFollowUpText } from '../../utils/utils'
import { EXTRA_OPTIONS, EXTERNAL_HOSPITAL_BUSINESS_IDS, INVESTIGATION_TITLE, NEO_NATOLOGISTS_DP_ID, NORMAL, PAEDIATRICS_DP_ID, WHATSAPP, TP_ASSETS_BASE } from '../../utils/constants';
import moment from 'moment';
import {
    getCvtExtHosPatientDataShowValue,
} from '../../utils/cvtExtHosPatientPrint';
import { getDecodedToken } from '../../utils/localStorage';
import { ASSETS } from '../../assets';
import { getUploadedFilePublicUrl } from '../../pages/smartSync/services/templateUtils';
import ObsHistoryInlineView from './obsHistory/inline';
import ObsHistoryListView from './obsHistory/list';
import ObsHistoryTableView from './obsHistory/table';
import GynecHistoryTableView from './gynec-history/table';
import OphthalmologyInlineView from './ophthalmology/inline';
import OphthalmologyListView from './ophthalmology/list';
import OphthalmologyTableView from './ophthalmology/table';
import ThenConnector from './ThenConnector';

const PX_TO_PT = 0.75
const CM_TO_PT = 28.35;
const FOOTER_CONTENT_GAP = PX_TO_PT * 5;
const widthOfA4PageInPts = 595;

// Roboto
Font.register({
    family: 'Roboto',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});
// Arial
Font.register({
    family: 'Arial',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Arimo-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Arimo-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Arimo-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});
// Times Roman
Font.register({
    family: 'Times-Roman',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/EBGaramond-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/EBGaramond-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/EBGaramond-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});
// Verdana
Font.register({
    family: 'Verdana',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Jost-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Jost-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Jost-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});
// Calibri
Font.register({
    family: 'Calibri',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});
// Tahoma
Font.register({
    family: 'Tahoma',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Vazirmatn-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Vazirmatn-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Vazirmatn-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

Font.register({
    family: 'AnekDevanagari',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/AnekDevanagari-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/AnekDevanagari-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/AnekDevanagari-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

// Bengali
Font.register({
    family: 'AnekBangla',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/AnekBangla-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/AnekBangla-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/AnekBangla-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

// Tamil
Font.register({
    family: 'NotoSansTamil',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansTamil-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansTamil-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansTamil-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

// Telugu
Font.register({
    family: 'NotoSansTelugu',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansTelugu-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansTelugu-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansTelugu-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

// Kannada
Font.register({
    family: 'NotoSansKannada',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansKannada-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansKannada-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansKannada-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

// Malayalam
Font.register({
    family: 'NotoSansMalayalam',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansMalayalam-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansMalayalam-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansMalayalam-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

// Gujarati
Font.register({
    family: 'BalooBhai2',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/BalooBhai2-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/BalooBhai2-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/BalooBhai2-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

// Punjabi/Gurmukhi
Font.register({
    family: 'NotoSansGurmukhi',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansGurmukhi-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansGurmukhi-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansGurmukhi-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

// Oriya/Odia
Font.register({
    family: 'NotoSansOriya',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansOriya-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansOriya-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoSansOriya-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

// Urdu
Font.register({
    family: 'NotoNastaliqUrdu',
    fonts: [
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoNastaliqUrdu-Regular.ttf`, fontWeight: 400 }, // Regular
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoNastaliqUrdu-Medium.ttf`, fontWeight: 500 }, // Medium
        { src: `${TP_ASSETS_BASE}/fonts/print-fonts/NotoNastaliqUrdu-Bold.ttf`, fontWeight: 700 }, // Bold
    ],
});

const styles = StyleSheet.create({
    mainTitle: {
        fontSize: PX_TO_PT * 18,
        color: '#A461D8',
        fontFamily: 'Roboto',
        fontWeight: 700
    },
    subTitle: {
        fontSize: PX_TO_PT * 14,
        color: '#454551',
        fontFamily: 'Roboto',
        fontWeight: 500,
        lineHeight: 1.4
    },
    displayPatient: {
        color: '#171725',
        fontFamily: 'Roboto'
    },
    mainCasemanager: {
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    extraText: {
        fontSize: PX_TO_PT * 12,
        color: '#171725',
        fontFamily: 'Roboto',
    },
    directionCasemanager: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    table: {
        marginTop: PX_TO_PT * 4,
    },

    dentalSection: {
        marginTop: PX_TO_PT * 12,
    },
    dentalTable: {
        borderTop: '1px solid #171725',
        borderRadius: PX_TO_PT * 4,
        overflow: 'hidden',
    },
    dentalRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #171725',
        borderLeft: '1px solid #171725',
    },
    dentalHeaderRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #171725',
        borderLeft: '1px solid #171725',
    },
    dentalCellLabel: {
        width: '35%',
        padding: 6,
        borderRight: '1px solid #171725',
    },
    dentalCellValue: {
        flex: 1,
        padding: 6,
        borderRight: '1px solid #171725',
    },
    dentalHeaderCell: {
        flex: 1,
        padding: 6,
        borderRight: '1px solid #171725',
    },
    dentalQuadrantGrid: {
        marginTop: PX_TO_PT * 6,
        border: '1px solid #171725',
        borderRadius: PX_TO_PT * 4,
        overflow: 'hidden',
    },
    dentalQuadrantRow: {
        flexDirection: 'row',
    },
    dentalQuadrantCell: {
        flex: 1,
        borderRight: '1px solid #171725',
        borderBottom: '1px solid #171725',
        padding: 6,
    },
    dentalQuadrantTitle: {
        marginBottom: 4,
        textAlign: 'center'
    },
    dentalListItem: {
        marginBottom: 2,
    },
    row: {
        flexDirection: 'row',
        borderBottom: '1px solid #171725',
        borderLeft: '1px solid #171725',
        minHeight: PX_TO_PT * 10
    },
    cell: {
        flex: 1,
        padding: 6,
        borderRight: '1px solid #171725',
        height: "100%"
    },
    dynamicModuleCell: {
        padding: 6,
        borderRight: '1px solid #171725',
    },
    headerRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #171725',
        borderLeft: '1px solid #171725',
        borderTop: '1px solid #171725',
    },
    headerRowFixed: {
        flexDirection: 'row',
        borderBottom: '1px solid #171725',
        borderLeft: '1px solid #171725',
    },
    headerCell: {
        flex: 1,
        padding: 6,
        borderRight: '1px solid #171725',
        fontWeight: 700,
    },
    minHeight50: {
        minHeight: 50
    },
    lineHeight2: {
        lineHeight: 2
    },
    minHeight38: {
        minHeight: 38
    },
    pageNumber: {
        position: 'absolute',
        fontSize: 10,
        fontWeight: 400,
        bottom: 10,
        right: 10,
        textAlign: 'center',
        color: '#454551',
    },
});

const AI_FLOW_MEDICINE_UNIT_MAP = { 2: 'Tablet', 3: 'mg', 4: 'ml', 5: 'gm', 6: 'Capsule', 7: 'Sachet', 8: 'Injection', 9: 'Drop', 14: 'Drops' };

function parseAiFrequencyLeadingPattern(fullRaw) {
    const m = (fullRaw || "").toString().trim().match(/^((?:\d+(?:\.\d+)?)(?:\s*-\s*(?:\d+(?:\.\d+)?)){1,3})(?:\s+(.*))?$/);
    if (!m) return null;
    const parts = m[1].replace(/\s/g, "").split("-").map(Number);
    if (parts.length < 2 || parts.length > 4 || parts.some((x) => Number.isNaN(x))) return null;
    const [morning = 0, afternoon = 0, evening = 0, night = 0] = parts;
    return { morning, afternoon, evening, night, remainder: (m[2] || "").trim(), slotCount: parts.length };
}

const aiFrequencyNumericFromParsed = (p, dec) =>
    p && [p.morning, p.afternoon, p.evening, p.night].slice(0, p.slotCount).map((v) => (v ? medicine_freq_dosage_format(v, dec) : 0)).join(" - ");

const normalizePdfText = (value) => (
    value == null ? "" : String(value).replace(/\u00A0/g, " ")
);

function mapMedicationListForPrintPdf(medicines, idPrefix) {
    if (!Array.isArray(medicines) || medicines.length === 0) return [];
    return medicines.map((item, index) => {
        const tmm_unit = item.tmm_unit ?? item.unit_id;
        const unitTitle = tmm_unit ? AI_FLOW_MEDICINE_UNIT_MAP[tmm_unit] : '';
        const medicineUnit = Array.isArray(item.medicineUnit) && item.medicineUnit.length > 0
            ? item.medicineUnit
            : [{ tmu_id: tmm_unit, tmu_title: unitTitle }];
        return {
            ...item,
            index,
            tmm_id: item.tmm_id ?? item.unique_id ?? `${idPrefix}-${index}`,
            tmm_medicine_name: item.tmm_medicine_name || item.name || item.groundedMedicineName || item.groundingMedicineName || item.medicine_name || item.lineItem || '',
            tmm_generic: item.tmm_generic ?? item.corrected_name ?? item.metadata?.tmm_generic ?? item.generic ?? '',
            tmm_unit: tmm_unit,
            medicineUnit,
            tmm_dosage: item.tmm_dosage ?? item.dosage ?? item.unitPerDose ?? item.unit_per_dose ?? item.Dosage ?? '',
            tcm_tmm_freq_morning: item.tcm_tmm_freq_morning ?? item.freqMorning,
            tcm_tmm_freq_afternoon: item.tcm_tmm_freq_afternoon ?? item.freqAfternoon,
            tcm_tmm_freq_evening: item.tcm_tmm_freq_evening ?? item.freqEvening,
            tcm_tmm_freq_night: item.tcm_tmm_freq_night ?? item.freqNight,
            tmf_block: item.tmf_block ?? 0,
            tmm_freq_type: item.tmm_freq_type ?? item.freq_type,
            tmm_time: item.tmm_time ?? item.time_id,
            tmm_days: item.tmm_days ?? item.days,
            tmm_duration_type: item.tmm_duration_type ?? item.duration_type ?? '',
            duration: item.duration ?? item.duration_text ?? item.tmm_duration ?? "",
            display_qty: item.display_qty ?? item.quantity ?? item.qty ?? '',
            tmm_remarks: item.tmm_remarks ?? item.notes ?? item.note ?? '',
        };
    });
}

/** Digitised / voice / Rx-digitise case-manager print only — stacked on `mapMedicationListForPrintPdf(..., 'ai')`. */
function enrichCaseManagerAiMedicationForPrint(medicine) {
    const base = mapMedicationListForPrintPdf(medicine, 'ai');
    return base.map((item) => {
        const meta = item?.metadata && typeof item.metadata === 'object' ? item.metadata : null;
        const metaMedName = meta && String(meta.tmm_medicine_name ?? '').trim();
        const tmm_medicine_name = metaMedName
            ? metaMedName
            : String(
                item.groundedMedicineName ||
                item.groundingMedicineName ||
                item.tmm_medicine_name ||
                item.medicine_name ||
                item.name ||
                item.lineItem ||
                ''
            ).trim();
        const tmm_generic = metaMedName
            ? (meta.tmm_generic ?? item.tmm_generic ?? item.corrected_name ?? '')
            : (item.tmm_generic ?? item.corrected_name ?? meta?.tmm_generic ?? item.generic ?? '');
        return {
            ...item,
            tmm_medicine_name,
            tmm_generic,
            rx_duration_text: String(item.duration ?? '').trim(),
        };
    });
}

const formatCustomModuleColumnTitle = (value = "") => {
    return String(value || "")
        .trim();
};

const getSmartSyncUploadedFileUri = (file) =>
    getUploadedFilePublicUrl(file) ||
    file?.fileUrl ||
    file?.showFile ||
    file?.smart_prescription_file ||
    file?.url ||
    file?.smart_prescription_file_url ||
    null;

const ViewPDF = ({ mode = NORMAL, ...props }) => {

    let { smartRxData, caseManagerData, columns, initialRows, frequencyList, timingList, printSettings, fileHeader, fileFooter, fileLogo, fileWatermark, fileSignature, todayVaccines, growthChartDetails, isGynaecHistoryAccessable, obsHistoryData, customModules, patientBills, advanceReceipts, patientWalletBalance, selectedLang, carePlanAssignments, ophthalModuleData , abhaDetails , isDigitisedPrintConfig, dentalData, isCvtExtHosAccessableFromGB: isCvtExtHosFromProps } = props
    const isRxDigitizeBool = !!(caseManagerData?.isRxDigitize || isDigitisedPrintConfig);
    const isCvtExtHosAccessableFromGB =
        isCvtExtHosFromProps ?? caseManagerData?.isCvtExtHosAccessableFromGB ?? false;
    const tokenData = getDecodedToken()?.result;
    const hospitalBusinessId =
        tokenData?.hospital_business_id ?? caseManagerData?.hospital_business_id;
    const isExternalHospitalBusinessId = Object.values(
        EXTERNAL_HOSPITAL_BUSINESS_IDS,
    ).includes(String(hospitalBusinessId));
    const isCvtExtHosAccessableForPrint =
        !!isCvtExtHosAccessableFromGB && isExternalHospitalBusinessId;
    const cvtExtHosPatientMapEnabled =
        !!isCvtExtHosAccessableFromGB && isExternalHospitalBusinessId;
    const showMissionHospitalLogo = isCvtExtHosAccessableForPrint;
    const baseFontFamily = printSettings?.page_format?.font_family || 'Roboto';
    const baseFontSize = PX_TO_PT * (printSettings?.page_format?.font_size || 10);
    const dentalPdfData = dentalData;
    const structuralTeethDiagramImgUrl =
        typeof dentalData?.structuralTeethDiagramImgUrl === "string"
            ? dentalData.structuralTeethDiagramImgUrl.trim()
            : "";
    const dentalComplaints = dentalPdfData?.complaints || {};
    const dentalDiagnosis = dentalPdfData?.diagnosis || {};
    const dentalTreatmentItems = dentalPdfData?.treatmentPlans?.items || [];
    const dentalWorkDone = dentalPdfData?.workDone || { items: [], notes: "" };
    const dentalMedicationOption = printSettings?.prescription?.case_option?.find((o) => o?.id === 4) || {};
    const dentalMedicationItems = mapMedicationListForPrintPdf(dentalPdfData?.medications, 'dental');
    const dentalWorkDoneItems = Array.isArray(dentalWorkDone?.items) ? dentalWorkDone.items : [];
    const dentalTeeth = Array.isArray(dentalDiagnosis?.teeth) ? dentalDiagnosis.teeth : [];
    const buildWorkDoneText = (item) => {
        const workDone = item?.workDone ?? "";
        const nextAppointment = item?.nextAppointment ?? "";
        const workDoneText = String(workDone ?? "");
        const nextText = String(nextAppointment ?? "").trim();
        if (!nextText) return workDoneText;
        const normalized = workDoneText.toLowerCase();
        if (normalized.includes("next appointment")) return workDoneText;
        const suffix = `Next Appointment: ${nextText}`;
        if (!workDoneText.trim()) return suffix;
        return `${workDoneText}\n${suffix}`;
    };
    const dentalTeethBySection = dentalTeeth.reduce(
        (acc, tooth) => {
            const section = tooth?.toothSection;
            if (section && acc[section]) acc[section].push(tooth);
            return acc;
        },
        {
            UPPER_LEFT: [],
            UPPER_RIGHT: [],
            LOWER_LEFT: [],
            LOWER_RIGHT: [],
        },
    );
    const diagnosisFieldOrder = [
        "stains",
        "calculus",
        "oralHygieneStatus",
        "periodontalseverity",
        "orthodonticFindings",
        "orthodonticInterventionRequired",
        "habitsPedo",
    ];

    const formatDiagnosisValue = (val) => {
        if (Array.isArray(val)) {
            return val.filter((v) => v != null && String(v).trim() !== "").join(", ");
        }
        if (val && typeof val === "object") {
            return Object.entries(val)
                .filter(([, v]) => !!v)
                .map(([k]) => camelToSentence(k))
                .join(", ");
        }
        if (val == null) return "";
        return String(val);
    };
    const dentalDiagnosisRows = diagnosisFieldOrder
        .filter((key) => key in dentalDiagnosis)
        .map((key) => ({
            key,
            label: camelCaseToTitle(key),
            value: formatDiagnosisValue(dentalDiagnosis?.[key]),
        }))
        .filter((row) => String(row.value || "").trim() !== "");
    const dentalToothDiagramNotes = (() => {
        const notes = dentalDiagnosis?.toothDiagramNotes;
        if (Array.isArray(notes)) {
            return notes
                .filter((note) => note != null && String(note).trim() !== "")
                .map((note) => String(note))
                .join("\n");
        }
        if (notes == null) return "";
        return String(notes);
    })();
    const hasToothDiagramNotes = String(dentalToothDiagramNotes || "").trim() !== "";
    const dentalComplaintRows = [
        { key: "chiefComplaint", label: "CHIEF COMPLAINT" },
        { key: "symptom", label: "HTN/DM/ASTHMA/CARDIAC STATUS/BLOOD DISORDER" },
        { key: "otherDiseases", label: "OTHER DISEASES" },
        { key: "medications", label: "MEDICATION" },
        { key: "drugAllergy", label: "H/O DRUG ALLERGY" },
        { key: "pregnancy", label: "PREGNANCY" },
        { key: "habits", label: "HABITS (Tobacco/Smoking/Grinding Teeth)" },
        { key: "dentalHistory", label: "DENTAL HISTORY" },
        { key: "pain", label: "HEAD/JAW/NECK PAIN" },
        { key: "notes", label: "NOTES" },
    ];
    const isNonEmptyDentalValue = (val) => {
        if (val === 0 || val === "0") return true;
        if (val === true) return true;
        if (Array.isArray(val)) {
            return val.some((item) => isNonEmptyDentalValue(item));
        }
        if (val && typeof val === "object") {
            return Object.values(val).some((item) => isNonEmptyDentalValue(item));
        }
        return val != null && String(val).trim() !== "";
    };
    const dentalMedicationRowsFiltered = Array.isArray(dentalMedicationItems)
        ? dentalMedicationItems.filter((item) =>
            [
                item?.tmm_medicine_name,
                item?.name,
                item?.groundedMedicineName,
                item?.tmm_dosage,
                item?.frequency,
                item?.schedule,
                item?.tmm_remarks,
                item?.display_qty,
            ].some((val) => isNonEmptyDentalValue(val)),
        )
        : [];
    const dentalComplaintRowsFiltered = dentalComplaintRows.filter((row) => {
        const value = dentalComplaints?.[row.key];
        return isNonEmptyDentalValue(value);
    });
    const hasTeethData = Object.values(dentalTeethBySection || {}).some(
        (arr) => Array.isArray(arr) && arr.length > 0,
    );
    const dentalTreatmentRowsFiltered = Array.isArray(dentalTreatmentItems)
        ? dentalTreatmentItems.filter((item) =>
            [item?.srno, item?.treatment, item?.toothNum, item?.rate, item?.count, item?.estimate].some(
                (val) => isNonEmptyDentalValue(val),
            ),
        )
        : [];
    const dentalWorkDoneRowsFiltered = Array.isArray(dentalWorkDoneItems)
        ? dentalWorkDoneItems.filter((item) =>
            [
                item?.date,
                buildWorkDoneText(item),
                item?.ptr,
                item?.ttReview,
                item?.payment,
                item?.balance,
                item?.remarks,
            ].some((val) => isNonEmptyDentalValue(val)),
        )
        : [];
    const hasWorkDoneNotes = isNonEmptyDentalValue(dentalWorkDone?.notes);
    const hasDentalSectionData =
        dentalComplaintRowsFiltered.length > 0 ||
        dentalMedicationRowsFiltered.length > 0 ||
        hasTeethData ||
        dentalDiagnosisRows.length > 0 ||
        dentalTreatmentRowsFiltered.length > 0 ||
        hasToothDiagramNotes ||
        dentalWorkDoneRowsFiltered.length > 0 ||
        hasWorkDoneNotes;
    const shouldHideMedicationModuleBecauseDentalMedicationShown =
        isRxDigitizeBool && dentalMedicationRowsFiltered.length > 0;
    const dentalQuadrantSections = [
        { key: "UPPER_RIGHT", label: "UPPER RIGHT" },
        { key: "UPPER_LEFT", label: "UPPER LEFT" },
        { key: "LOWER_RIGHT", label: "LOWER RIGHT" },
        { key: "LOWER_LEFT", label: "LOWER LEFT" },
    ];
    const showMode = printSettings?.header_footer?.show_header_footer_page || 'all';

    const medicationCaseOption = printSettings?.prescription?.case_option?.find(o => o.id === 4);

    // For AI / digitised / voice flows, always derive medication from AI-flow
    // transformation; the view (inline/list/table) is decided by format.
    const isAiFlowMedication = !!(
        isDigitisedPrintConfig ||
        caseManagerData?.isVoiceAmbientRx ||
        caseManagerData?.isRxDigitize
    );
    const aiFlowMedicationList = isAiFlowMedication
        ? enrichCaseManagerAiMedicationForPrint(caseManagerData?.medicine)
        : [];

    // Prefer lab data from prop (Lab Results API via context); fall back to case manager (e.g. written Rx flow has no lab in case manager)
    const labParamsData = props.labParamsData ?? caseManagerData?.labParamsData ?? [];
    const gynecHistoryData = props.gynecHistoryData || caseManagerData?.gynecHistoryData;
    const hasOphthalValue = (value) => {
        if (value === 0 || value === "0") return true;
        if (value === null || value === undefined) return false;
        return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    };
    const hasOphthalArrayData = (items, keys) =>
        Array.isArray(items) && items.some((item) => keys.some((key) => hasOphthalValue(item?.[key])));
    const hasOphthalModuleData = !!(
        ophthalModuleData &&
        (
            hasOphthalArrayData(ophthalModuleData.visualAcuity, ["ucDistance", "ucNear", "pinhole", "cDistance", "cNear"]) ||
            hasOphthalArrayData(ophthalModuleData.autoRefraction, ["sphere", "cylinder", "axis", "add", "distance", "near"]) ||
            hasOphthalArrayData(ophthalModuleData.lensometerValues, ["sphere", "cylinder", "axis", "add", "distance", "near"]) ||
            hasOphthalArrayData(ophthalModuleData.glassPrescription, ["sphere", "cylinder", "axis", "add", "distance", "near"]) ||
            hasOphthalArrayData(ophthalModuleData.intraOcularPressure, ["nct", "gat", "cc", "cct", "ciop"]) ||
            hasOphthalArrayData(ophthalModuleData.slitLampExamination, ["OD", "OS", "remarks"]) ||
            hasOphthalArrayData(ophthalModuleData.fundusExamination, ["OD", "OS", "remarks"]) ||
            hasOphthalValue(ophthalModuleData.pd)
        )
    );
    const patientBirthWeight = caseManagerData?.patient_birth_weight ?? null;
    const isTeleconsultType2 = Number(caseManagerData?.pam_status_type_appointment) === 2;
    const isPediatricAccessable = caseManagerData?.doctor_data?.dp_id == PAEDIATRICS_DP_ID || caseManagerData?.doctor_data?.dp_id == NEO_NATOLOGISTS_DP_ID;

    const { growthChartData, growthChartImageData, todayGrowthChartData } =
        growthChartDetails || {};
    // Filter care plans to only those linked with the current consultation (tcm_id)
    const activeCarePlans = Array.isArray(carePlanAssignments)
        ? carePlanAssignments.filter((cp) => {
            const cpId = cp?.tcm_id !== undefined ? parseInt(cp?.tcm_id) : NaN;
            const curId = caseManagerData?.tcm_id !== undefined ? parseInt(caseManagerData?.tcm_id) : NaN;
            return !isNaN(cpId) && !isNaN(curId) && cpId === curId;
        })
        : [];

    let growthChartImageChunks = []
    if (growthChartImageData) {
        const growthChartOption = printSettings?.prescription?.case_option?.find(o => o.id === 12)?.growth_chart_option;
        const graphs = Object.keys(growthChartImageData)?.filter(g => growthChartOption?.includes(g));
        growthChartImageChunks = chunkArray(graphs, 2);
    }

    const genderAge = (patient_data, profile) => {
        var value = ``
        if (profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) {
            if (patient_data?.ageYears != 0) {
                value += `${patient_data?.ageYears}y`
            }
            if (patient_data?.ageMonths != 0) {
                value += ` ${patient_data?.ageMonths}m`
            }
            if (patient_data?.ageDays != 0) {
                value += ` ${patient_data?.ageDays}d`
            }
        } else {
            if (patient_data?.ageYears != 0) {
                value += `${patient_data?.ageYears}y`
            } else if (patient_data?.ageMonths != 0) {
                value += ` ${patient_data?.ageMonths}m`
            } else if (patient_data?.ageDays != 0) {
                value += ` ${patient_data?.ageDays}d`
            }
        }
        return value
    }

    const transformGivenVaccineData = (data) => {
        const groupedData = {};

        data?.forEach((item) => {
            const { tvc_name, tvac_name, ...rest } = item;

            if (!groupedData[tvc_name]) {
                groupedData[tvc_name] = { ...rest, tvac_name, tvc_name };
            } else {
                groupedData[tvc_name].tvac_name += `, ${tvac_name}`;
            }
        });
        return Object.values(groupedData);
    };

    const transformGivenVaccines = transformGivenVaccineData(todayVaccines?.given);
    const prescriptionVaccines = Array.isArray(caseManagerData?.vaccinations) ? caseManagerData.vaccinations : [];

    const patientDataShow = (id) => {
        if (cvtExtHosPatientMapEnabled) {
            return getCvtExtHosPatientDataShowValue(id, {
                patient: caseManagerData?.patient_data,
                doctorProfile: caseManagerData?.doctor_data,
                genderAge,
                abhaDetails,
                caseManagerData,
                isPediatricAccessable,
            });
        }
        var value = ''
        if (id == 1) {
            value = `${caseManagerData?.patient_data?.patient_salutation ? `${caseManagerData?.patient_data?.patient_salutation} ${caseManagerData?.patient_data?.patient_name}, ${caseManagerData?.patient_data?.patient_id}` : `${caseManagerData?.patient_data?.patient_name}, ${caseManagerData?.patient_data?.patient_id}`}`
        } else if (id == 2) {
            value = `${caseManagerData?.patient_data?.patient_consultaion_date ? moment(caseManagerData?.patient_data?.patient_consultaion_date).format('DD/MM/YYYY HH:mm') : '-'}`
        } else if (id == 3) {
            value = `${genderAge(caseManagerData?.patient_data, caseManagerData?.doctor_data)}, ${caseManagerData?.patient_data?.patient_gender}`
        } else if (id == 4) {
            value = `${caseManagerData?.patient_data?.patient_contact_no ? caseManagerData?.patient_data?.patient_contact_no : '-'}`
        } else if (id == 5) {
            value = `${caseManagerData?.patient_data?.patient_ht_wt ? caseManagerData?.patient_data?.patient_ht_wt : '-'}`
        } else if (id == 6) {
            value = `${caseManagerData?.patient_data?.patient_blood_group ? caseManagerData?.patient_data?.patient_blood_group : '-'}`
        } else if (id == 7) {
            value = `${caseManagerData?.patient_data?.patient_address ? caseManagerData?.patient_data?.patient_address : '-'}`
        } else if (id == 8) {
            value = `${caseManagerData?.patient_data?.patient_consultation_type ? caseManagerData?.patient_data?.patient_consultation_type : '-'}`
        } else if (id == 9) {
            value = `${caseManagerData?.patient_data?.patient_edd_date ? caseManagerData?.patient_data?.patient_edd_date : '-'}`
        } else if (id == 10) {
            value = `${caseManagerData?.patient_data?.patient_email ? caseManagerData?.patient_data?.patient_email : '-'}`
        } else if (id == 11) {
            value = `${caseManagerData?.patient_data?.patient_reference_id ? caseManagerData?.patient_data?.patient_reference_id : '-'}`
        } else if (id == 12) {
            value = `${caseManagerData?.patient_data?.patient_salutation ? `${caseManagerData?.patient_data?.patient_salutation} ${caseManagerData?.patient_data?.patient_name}` : `${caseManagerData?.patient_data?.patient_name}`}`
        } else if (id == 13) {
            value = `${caseManagerData?.patient_data?.patient_id ? caseManagerData?.patient_data?.patient_id : '-'}`
        } else if (id == 14) {
            value = `${caseManagerData?.patient_data?.patient_dob ? caseManagerData?.patient_data?.patient_dob : '-'}`
        } else if (id == 15) {
            value = `${abhaDetails?.abha_address ? abhaDetails?.abha_address : "-"}`;
        } else if (id == 17) {
            const abhaToken = String(caseManagerData?.abha_token ?? "").trim();
            value = abhaToken ? (abhaToken.length === 1 ? `0${abhaToken}` : abhaToken) : "-";
        } else if (id == 16) {
            value = `${abhaDetails?.abha_number ? abhaDetails?.abha_number : "-"}`;
        }
        return value
    }

    const medicineHeaderLang = (title) => {
        var value = getRxTitle(selectedLang, title);
        return value
    }

    const durationLang = (title) => {
        var value = getDurationTitle(selectedLang, title);
        return value
    }


    function timeingLang() {
        var value = getTimeingTitle(selectedLang);
        return value
    }

    function frequencyLang() {
        var value = getFrequencyTitle(selectedLang);
        return value
    }

    const formatFrequency = (morning, afternoon, evening, night, is_dosage_decimal) => {

        const { morning: morningLabel, afternoon: afternoonLabel, night: nightLabel } = getFrequencyLanguageTitles(selectedLang);

        const frequencyParts = [
            morning > 0 ? `${morningLabel}(${medicine_freq_dosage_format(morning, is_dosage_decimal)})` : '',
            afternoon > 0 ? `${afternoonLabel}(${medicine_freq_dosage_format(afternoon, is_dosage_decimal)})` : '',
            evening > 0 ? `${nightLabel}(${medicine_freq_dosage_format(evening, is_dosage_decimal)})` : '',
            night > 0 ? `${nightLabel}(${medicine_freq_dosage_format(night, is_dosage_decimal)})` : ''
        ].filter(Boolean);
        const frequencyInWords = frequencyParts.join(' - ');
        return frequencyInWords;
    }

    const getFont = () => {
        var value = printSettings?.page_format?.font_family;
        if (selectedLang == 2) {
        value = "BalooBhai2";
        } else if (selectedLang == 3 || selectedLang == 4) {
        value = "AnekDevanagari";
        } else if (selectedLang == 5) {
        value = "NotoSansTelugu";
        } else if (selectedLang == 6) {
        value = "NotoSansKannada";
        } else if (selectedLang == 8) {
        value = "NotoSansGurmukhi";
        } else if (selectedLang == 10) {
        value = "NotoSansTamil";
        } else if (selectedLang == 11 || selectedLang == 12) {
        value = "AnekBangla";
        } else if (selectedLang == 13) {
        value = "NotoSansOriya";
        } else {
        value = printSettings?.page_format?.font_family;
        }
        return value;
    };

    const medical_history_title = (id) => {
        var value = ''
        if (id == 2) {
            value = `Condition : `
        } else if (id == 3) {
            value = `History : `
        } else if (id == 4) {
            value = `Allergies to : `
        } else if (id == 1) {
            value = `Habit : `
        } else if (id == 5) {
            value = `Surgery : `
        }
        return value
    }

    const innerMedication = (index) => {
        const mainArray = []
        for (var i = index; i < caseManagerData.medicine.length; i++) {
            if (caseManagerData.medicine[i].tmm_id == caseManagerData.medicine[index].tmm_id) {
                mainArray.push(caseManagerData.medicine[i])
            } else {
                break;
            }
        }
        return mainArray
    }
    const medicationData = caseManagerData.medicine?.map((e, index) => ({ ...e, index: index })).reduce((acc, curr) => acc?.at(-1)?.tmm_id == curr.tmm_id ? acc : [...acc, curr], [])

    const formatUnitPerDose = (d, dec) => medicine_freq_dosage_format(d, dec);

    function getAiMedicationFrequencyDisplay(item, option) {
        const hasSlotFrequency = !!(item?.tcm_tmm_freq_morning || item?.tcm_tmm_freq_afternoon || item?.tcm_tmm_freq_evening || item?.tcm_tmm_freq_night);
        const mappedFrequency = frequencyList?.find((x) => x.tmf_id === item?.tmm_freq_type)?.[frequencyLang()] || '';
        const rawFrequency = (item?.frequency || item?.freq || item?.frequencyText || item?.frequency_text || '').toString().trim();
        const slotFrequency = hasSlotFrequency
            ? (option?.numeric_frequency
                ? `${item?.tcm_tmm_freq_morning ? medicine_freq_dosage_format(item.tcm_tmm_freq_morning, option?.is_dosage_decimal) : 0} - ${item?.tcm_tmm_freq_afternoon ? medicine_freq_dosage_format(item.tcm_tmm_freq_afternoon, option?.is_dosage_decimal) : 0}${item?.tcm_tmm_freq_evening ? ' - ' + medicine_freq_dosage_format(item.tcm_tmm_freq_evening, option?.is_dosage_decimal) : ''} - ${item?.tcm_tmm_freq_night ? medicine_freq_dosage_format(item.tcm_tmm_freq_night, option?.is_dosage_decimal) : 0}`
                : formatFrequency(item?.tcm_tmm_freq_morning, item?.tcm_tmm_freq_afternoon, item?.tcm_tmm_freq_evening, item?.tcm_tmm_freq_night, option?.is_dosage_decimal))
            : '';

        const freqTitleKey = frequencyLang();

        if (rawFrequency) {
            const parsed = parseAiFrequencyLeadingPattern(rawFrequency);
            if (option?.numeric_frequency) {
                if (parsed) {
                    const core = aiFrequencyNumericFromParsed(parsed, option?.is_dosage_decimal);
                    return parsed.remainder ? `${core}\n${parsed.remainder}` : core;
                }
                return rawFrequency;
            }
            if (parsed) {
                const textCore = formatFrequency(parsed.morning, parsed.afternoon, parsed.evening, parsed.night, option?.is_dosage_decimal);
                return parsed.remainder ? [textCore, parsed.remainder].filter(Boolean).join("\n") : (textCore || rawFrequency);
            }
            if (frequencyList?.length) {
                const entry = frequencyList.find((f) => (f?.tmf_title || "").toString().trim().toLowerCase() === rawFrequency.toLowerCase());
                if (entry?.[freqTitleKey]) return entry[freqTitleKey];
            }
            return rawFrequency;
        }

        if (item?.tmf_block === 0 || item?.tmf_block === '') return slotFrequency || '-';
        if (mappedFrequency) return `(${mappedFrequency})`;
        return slotFrequency || '-';
    }

    function getAiMedicationTimingDisplay(item) {
        const mappedTiming = timingList?.find((x) => x.tmt_id === item?.tmm_time);
        if (mappedTiming && mappedTiming?.tmt_title !== 'None') {
            return mappedTiming?.[timeingLang()] || '';
        }
        return (item?.schedule || item?.when || item?.timing || item?.instruction || '').toString().trim();
    }

    function getAiMedicationDoseDisplay(item, option) {
        const doseVal =
            item?.tmm_dosage != null && String(item.tmm_dosage).trim() !== ''
                ? item.tmm_dosage
                : item?.dosage;
        if (doseVal == null || String(doseVal).trim() === '') {
            return item.medicineUnit?.find((x) => x.tmu_id == item.default_tmm_unit)?.tmu_title || '-';
        }
        if (item.tmm_unit) {
            const u = item.medicineUnit?.find((x) => x.tmu_id == item.tmm_unit)?.tmu_title || '';
            return u ? `${formatUnitPerDose(doseVal, option?.is_dosage_decimal)} ${u}` : String(doseVal).trim();
        }
        const s = String(doseVal).trim();
        if (/\d/.test(s) && /[a-zA-Z]/i.test(s)) return s;
        const u0 = item.medicineUnit?.find((x) => x.tmu_id == item.default_tmm_unit)?.tmu_title || '';
        return u0 ? `${formatUnitPerDose(doseVal, option?.is_dosage_decimal)} ${u0}` : s;
    }

    function getAiMedicationDurationDisplay(item) {
        const plain = String(item.rx_duration_text ?? item.duration ?? '').trim();
        if (plain) return plain;
        if (EXTRA_OPTIONS.some((x) => x.value == item.tmm_duration_type)) {
            return durationLang(capitalize(item.tmm_duration_type, true));
        }
        if (isNumeric(item.tmm_days)) {
            return `${item.tmm_days} ${durationLang(item.tmm_duration_type)}`;
        }
        return '-';
    }

    function getAiMedicationQuantityDisplay(item) {
        const q = item.display_qty ?? item.quantity ?? item.qty;
        return q !== undefined && q !== null && String(q).trim() !== '' && Number(q) !== 0 ? q : '-';
    }

    function getAiMedicationNotesDisplay(item) {
        const v = item.tmm_remarks ?? item.notes ?? item.note;
        return v != null && String(v).trim() !== '' ? String(v).trim() : '-';
    }

    const convertRelativeDateToDate = (relativeDateString, consultationDate) => {
        if (!relativeDateString || typeof relativeDateString !== 'string' || relativeDateString.trim() === '') {
            return relativeDateString;
        }
        const trimmed = relativeDateString.trim();
        const numericRelativeMatch = trimmed.match(/(\d+)\s*(Day|Days|Week|Weeks|Month|Months|Year|Years)(\(s\))?/i);
        if (numericRelativeMatch) {
            const value = parseInt(numericRelativeMatch[1], 10);
            const unit = numericRelativeMatch[2].toLowerCase();
            const baseDate = consultationDate ? moment(consultationDate) : moment();
            if (unit.includes('year')) return baseDate.add(value, 'years').format('YYYY-MM-DD');
            if (unit.includes('month')) return baseDate.add(value, 'months').format('YYYY-MM-DD');
            if (unit.includes('week')) return baseDate.add(value, 'weeks').format('YYYY-MM-DD');
            return baseDate.add(value, 'days').format('YYYY-MM-DD');
        }
        const afterPhraseMatch = trimmed.match(/after\s+(two|one|three|four|five|six|seven|eight|nine|ten|\d+)\s*(day|days|week|weeks|month|months|year|years)(\(s\))?/i);
        if (afterPhraseMatch) {
            const wordOrNum = afterPhraseMatch[1].toLowerCase();
            const numMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
            const value = numMap[wordOrNum] != null ? numMap[wordOrNum] : parseInt(wordOrNum, 10);
            if (Number.isNaN(value)) return relativeDateString;
            const unit = (afterPhraseMatch[2] || '').toLowerCase();
            const baseDate = consultationDate ? moment(consultationDate) : moment();
            if (unit.includes('year')) return baseDate.add(value, 'years').format('YYYY-MM-DD');
            if (unit.includes('month')) return baseDate.add(value, 'months').format('YYYY-MM-DD');
            if (unit.includes('week')) return baseDate.add(value, 'weeks').format('YYYY-MM-DD');
            return baseDate.add(value, 'days').format('YYYY-MM-DD');
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed)) {
            if (moment(trimmed).isValid()) return relativeDateString;
        }
        return relativeDateString;
    };

    const onCalFollowUp = (start_date, end_date) => {
        return calculateFollowUpText(start_date, end_date);
    };

    let gynecListViewCounter = 1, medicalHistoryIndex = 1;
    const hasWrittenRxImages =
        Array.isArray(smartRxData) &&
        smartRxData.some((item) => !!getSmartSyncUploadedFileUri(item));
    const isSmartSyncPrescription = hasWrittenRxImages;
    const isSnapRxWrittenPrescription =
        typeof caseManagerData?.smart_prescription_filename === "string" &&
        caseManagerData.smart_prescription_filename.toLowerCase().startsWith("snap_rx_");
    const shouldRenderStandaloneWrittenFirstPage =
        (isSmartSyncPrescription && (caseManagerData?.isCustomSSRX === "1")) ||
        (isSnapRxWrittenPrescription && !isDigitisedPrintConfig && hasWrittenRxImages);

    const groupByReportNameForAll = (data) => {
        return data.map((item) => {
            const groupedInputs = item.inputs.reduce((acc, input) => {
                if (!acc[input.reportName]) {
                    acc[input.reportName] = [];
                }
                acc[input.reportName].push(input);
                return acc;
            }, {});

            return {
                date: item.date,
                groupedInputs,
            };
        });
    };

    const syncLabResultsData = (labResults) => {
        const allReportNames = new Set();
        const allTestNamesByReport = {};

        labResults.forEach((result) => {
            Object.keys(result.groupedInputs).forEach((reportName) => {
                allReportNames.add(reportName);
                if (!allTestNamesByReport[reportName]) {
                    allTestNamesByReport[reportName] = new Set();
                }
                result.groupedInputs[reportName].forEach((test) => {
                    allTestNamesByReport[reportName].add(test.testName);
                });
            });
        });

        const allReportNamesArray = Array.from(allReportNames);
        const allTestNamesByReportArray = {};
        Object.keys(allTestNamesByReport).forEach((reportName) => {
            allTestNamesByReportArray[reportName] = Array.from(allTestNamesByReport[reportName]);
        });

        return labResults.map((result) => {
            const transformedGroupedInputs = {};

            allReportNamesArray.forEach((reportName) => {
                if (!result.groupedInputs[reportName]) {
                    transformedGroupedInputs[reportName] = allTestNamesByReportArray[reportName].map((testName) => ({
                        reportName,
                        testName,
                        value: "-",
                        arrowDirection: "",
                        units: ""
                    }));
                } else {
                    const existingTests = result.groupedInputs[reportName];

                    const updatedTests = allTestNamesByReportArray[reportName].map((testName) => {
                        const existingTest = existingTests.find((test) => test.testName === testName);
                        return existingTest || {
                            reportName,
                            testName,
                            value: "-",
                            arrowDirection: "",
                            units: ""
                        };
                    });

                    transformedGroupedInputs[reportName] = updatedTests;
                }
            });

            return {
                ...result,
                groupedInputs: transformedGroupedInputs
            };
        });
    };

    const labParamsPatchData = labParamsData ? groupByReportNameForAll(labParamsData) : null;
    const labParamsPatchTableData = labParamsPatchData ? syncLabResultsData(labParamsPatchData) : null;

    const getCustomModuleName = (id) => {
        // Safety check: ensure customModules is an array before calling .find()
        const customModule = Array.isArray(customModules) ? customModules.find((module) => module.module_id === id) : null;
        
        if (customModule?.name) {
            return customModule?.printConfig?.nameOverride !== undefined 
                ? customModule?.printConfig?.nameOverride 
                : customModule?.name;
        }
        
        // Fallback: try to get name from caseManagerData.moduleContents
        if (caseManagerData?.moduleContents && Array.isArray(caseManagerData.moduleContents)) {
            const moduleContent = caseManagerData.moduleContents.find((module) => module.module_id === id);
            return moduleContent?.module_name;
        }
        
        return undefined;
    }

    const getMarginByFormat = (letterheadFormat, headerFooter, position) => {
        const marginType =
            letterheadFormat === 0 ? "custom_letterhead_margin" :
                letterheadFormat === 1 ? "uploaded_letterhead_margin" :
                    letterheadFormat === 2 ? "margin" : null;

        const rawMarginValue = headerFooter?.[marginType]?.[position];
        const marginValue = rawMarginValue === "" ? NaN : Number(rawMarginValue);

        return marginType && Number.isFinite(marginValue) && marginValue >= 0
            ? marginValue * CM_TO_PT
            : PX_TO_PT * 30;
    };

   const [footerImageHeight, setFooterImageHeight] = useState(0);

    useEffect(() => {
      const loadImage = () => {
        if (fileFooter?.showFile) {
          // Use window.Image instead of Image
          const img = new window.Image();
          img.src = fileFooter.showFile;

          img.onload = function () {
            // Convert to PDF points
            const heightInPt = this.height * PX_TO_PT;
            setFooterImageHeight(heightInPt);
          };

          img.onerror = function (error) {
            console.error("Error loading footer image:", error);
            setFooterImageHeight(0);
          };
        }
      };

      loadImage();
    }, [fileFooter?.showFile]);
    
     const userBottomMargin = getMarginByFormat(printSettings?.letterhead_format, printSettings?.header_footer, "bottom", 1);
     const userTopMargin = getMarginByFormat(printSettings?.letterhead_format, printSettings?.header_footer, "top", 1);
     const standardMargin = 0.5 * 25; // 0.5 inches in points
    const extraTopSpace = Math.max(0, userTopMargin - standardMargin);
     const isOwnLetterheadFirstPageOnly = printSettings?.letterhead_format === 2 && showMode === 'first';
     
     const getFooterTextRenderHeight = (footer) => {
        if (!footer?.title) return 0;

        const footerFontSize = PX_TO_PT * (footer?.font_size || 12);
        return PX_TO_PT * 2 + PX_TO_PT * 8 + footerFontSize * 1.2;
     };

     const getFooterImageRenderHeightForWidth = (paddingLeft = 0, paddingRight = 0) => {
       const footerWidth = Number(fileFooter?.footerWidth);
       const footerHeight = Number(fileFooter?.footerHeight);
       const availableWidth = Math.max(
         0,
         widthOfA4PageInPts - ((paddingLeft || 0) + (paddingRight || 0))
       );

       if (footerWidth > 0 && footerHeight > 0 && availableWidth > 0) {
         return (footerHeight / footerWidth) * availableWidth;
       }

       return Number.isFinite(fileFooter?.renderedFooterImageHeight)
         ? fileFooter.renderedFooterImageHeight
         : 0;
     };

     const calculatePadding = () => {
        const { letterhead_format, header_footer, whatsapp_letterhead_format } = printSettings || {};
        const footer = header_footer?.footer;

        const getReservedBottomPadding = ({
            letterheadFormat,
            whatsappLetterheadFormat,
            paddingLeft,
            paddingRight,
        }) => {
            const bottomMargin = getMarginByFormat(letterheadFormat, header_footer, "bottom");
            const footerHeight = mode !== NORMAL
                ? whatsappLetterheadFormat === 1 && fileFooter?.imageShow
                    ? getFooterImageRenderHeightForWidth(paddingLeft, paddingRight)
                    : whatsappLetterheadFormat === 0
                        ? getFooterTextRenderHeight(footer)
                        : 0
                : letterheadFormat === 1 && fileFooter?.imageShow
                    ? getFooterImageRenderHeightForWidth(paddingLeft, paddingRight)
                    : letterheadFormat === 0
                        ? getFooterTextRenderHeight(footer)
                        : 0;

            return bottomMargin + footerHeight + FOOTER_CONTENT_GAP;
        };

        if (mode !== NORMAL) {
            return {
                paddingTop: PX_TO_PT * 30,
                paddingLeft: PX_TO_PT * 30,
                paddingRight: PX_TO_PT * 30,
                paddingBottom: getReservedBottomPadding({
                    letterheadFormat: letterhead_format,
                    whatsappLetterheadFormat: whatsapp_letterhead_format,
                    paddingLeft: PX_TO_PT * 30,
                    paddingRight: PX_TO_PT * 30,
                }),
                display: 'flex',
                flexDirection: 'column',
            };
        }

        
        const paddingTop = [0,1,2].includes(letterhead_format)
        ? (isOwnLetterheadFirstPageOnly ? 0.5 * 25 : getMarginByFormat(letterhead_format, header_footer, "top", 0.5))
        : PX_TO_PT * 30;
        
        const paddingLeft = [0,1,2].includes(letterhead_format)
        ? getMarginByFormat(letterhead_format, header_footer, "left", 0.5)
        : PX_TO_PT * 30;

        const paddingRight = [0,1,2].includes(letterhead_format)
        ? getMarginByFormat(letterhead_format, header_footer, "right", 0.5)
        : PX_TO_PT * 30;

        const paddingBottom = letterhead_format === 2
            ? (isOwnLetterheadFirstPageOnly
                ? userBottomMargin
                : getReservedBottomPadding({
                    letterheadFormat: letterhead_format,
                    whatsappLetterheadFormat: whatsapp_letterhead_format,
                    paddingLeft,
                    paddingRight,
                }))
            : getReservedBottomPadding({
                letterheadFormat: letterhead_format,
                whatsappLetterheadFormat: whatsapp_letterhead_format,
                paddingLeft,
                paddingRight,
            });

        return {
            paddingTop,
            paddingBottom,
            paddingLeft,
            paddingRight,
        };
    };

    const paddingStyles = calculatePadding();

     const getFooterImageRenderHeight = () => {
       return getFooterImageRenderHeightForWidth(
         paddingStyles?.paddingLeft,
         paddingStyles?.paddingRight
       );
     };

     const renderFooterImage = () => {
       try {
         if (fileFooter?.showFile && fileFooter?.imageShow) {
           return (
            <View>
             <Image
               src={fileFooter.showFile}
               style={{
                 width: "100%",
                 height: getFooterImageRenderHeight(),
                 objectFit: "contain",
               }}
             />
             </View>
           );
         }
         return null;
       } catch (error) {
         console.error("Error rendering footer image:", error);
         return null;
       }
     };

    if (caseManagerData?.moduleContents?.length && printSettings?.prescription?.case_option) {
        const existingModuleIds = new Set(
            printSettings?.prescription?.case_option?.map(option => option?.id)
        );
        
        caseManagerData?.moduleContents
            ?.filter(module => !existingModuleIds.has(module?.module_id))
            ?.forEach(module => {
                printSettings?.prescription?.case_option?.push({
                    id: module?.module_id,
                    title: module?.module_name,
                    format: 'inline',
                    showDefault: true,
                    enable: 'Y',
                    custom_status: 'Y',
                    is_custom_module: true,
                });
            });
    }

    const PageNumberFooter = () => (
        <Text 
          fixed
          style={styles.pageNumber} 
          render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} 
        />
    );

    // Utility function to check if any custom module options are enabled and have data
    const hasAnyModuleOptions = (printSettings, caseManagerData, smartRxData, patientBills, advanceReceipts, gynecHistoryData, obsHistoryData, labParamsPatchData, transformGivenVaccines, todayVaccines, growthChartData) => {
        if (!printSettings?.prescription?.case_option) return false;
        
        return printSettings?.prescription?.case_option?.some(option => {
            // Early return for disabled options
            if (option?.enable !== 'Y' || option?.custom_status !== 'Y') {
                return false;
            }

            // Check if custom module data exists
            let customModule = caseManagerData?.moduleContents?.find(e => e?.module_id === option?.id);
            if(customModule) {
                customModule = {...customModule, name: getCustomModuleName(option?.id)};
            }
            
            if ((option?.showDefault || (option?.is_custom_module === true)) && customModule?.content?.length > 0) {
                return true;
            }
            
            // Check if data exists for each module
            switch (option?.id) {
                case 1: // Symptoms
                    return caseManagerData?.symptoms?.length > 0;
                case 2: // Examination
                    return caseManagerData?.examination?.length > 0;
                case 3: // Diagnosis
                    return caseManagerData?.diagnosis?.length > 0;
                case 4: // Medicine
                    return caseManagerData?.medicine?.length > 0;
                case 5: // Advice
                    return caseManagerData?.advice?.length > 0;
                case 6: // Investigation
                    return caseManagerData?.investigation?.length > 0 && caseManagerData?.investigation?.some(item => item?.investigation_name);
                case 7: // Vitals
                    return (caseManagerData?.vitals?.length > 0 || patientBirthWeight);
                case 8: // Medical History (with medical_history_op check)
                    return caseManagerData?.medical_history?.length > 0;
                case 9: // Follow Up Date
                    return caseManagerData?.follow_up_date;
                case 10: // Vaccines
                    return (transformGivenVaccines?.template?.length > 0 || todayVaccines?.due?.length > 0 || todayVaccines?.given?.length > 0);
                // case 11: // smartSync
                //     return caseManagerData?.visit_advice;
                case 12: // Growth Chart
                    return growthChartData?.length > 0;
                case 13: // Gynec History
                    return gynecHistoryData && Object.keys(gynecHistoryData).length > 2;
                case 14: // Obs History
                    return obsHistoryData && Object.keys(obsHistoryData).length > 2;
                case 15: // Lab Parameters
                    return labParamsPatchData && labParamsPatchData?.length > 0;
                case 16: // Surgeries
                    return caseManagerData?.surgeries?.length > 0;
                case 17: // Patient Bills (already handled in hasAnyData)
                    return  (patientBills?.length > 0 || advanceReceipts?.length > 0);
                case 18:
                    return caseManagerData?.zydusSelectedLabParams?.length > 0;
                case 19: // Care Plan Assignments
                    return activeCarePlans.length > 0;
                case 91: // Others / Notes
                    return caseManagerData?.visit_advice || (Array.isArray(caseManagerData?.others) && caseManagerData.others.length > 0);
                case 20: // Ophthalmology Module
                    return hasOphthalModuleData;
                default:
                    return false;
            }
        });
    };

    const hasAnyData = (caseManagerData) => {
        return (
            // Check custom module options (1-16, 18, 91)
            hasAnyModuleOptions(printSettings, caseManagerData, smartRxData, patientBills, advanceReceipts, gynecHistoryData, obsHistoryData, labParamsPatchData, transformGivenVaccines, todayVaccines, growthChartData) ||
            // Check smart sync data
            (isSmartSyncPrescription && (caseManagerData.isCustomSSRX === "0" && smartRxData?.length > 0) && !isSnapRxWrittenPrescription)
        );
    };

    const hasBlankSmartSyncCanvas =
        caseManagerData?.isCustomSSRX === "0" &&
        isSmartSyncPrescription &&
        Array.isArray(smartRxData) &&
        smartRxData.some((item) => !!getSmartSyncUploadedFileUri(item)) &&
        !isSnapRxWrittenPrescription;

    const baseHasPrescriptionContent =
        hasAnyData(caseManagerData) ||
        caseManagerData?.vitals?.length > 0 ||
        caseManagerData?.patient_birth_weight ||
        hasBlankSmartSyncCanvas;

    const shouldRenderMainPrescriptionPage =
        baseHasPrescriptionContent &&
        (!isCvtExtHosAccessableForPrint ||
            isRxDigitizeBool ||
            caseManagerData?.vitals?.length > 0 ||
            caseManagerData?.patient_birth_weight ||
            hasBlankSmartSyncCanvas);

    return (
        <Document>
            {shouldRenderStandaloneWrittenFirstPage &&
                <Page
                    size="A4"
                    style={[paddingStyles, {
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                    }]}
                    wrap={true}
                >
                    <>
                        {/* Smart RX Images for Custom SSRX - Show at the beginning */}
                        {shouldRenderStandaloneWrittenFirstPage && (
                            smartRxData?.map((item, i) => {
                                const writtenRxSrc = getSmartSyncUploadedFileUri(item);
                                if (!writtenRxSrc) {
                                    return null;
                                }
                                return (
                                    <View key={i}>
                                        <View style={{ width: '100%', height: '100%' }}>
                                            <Image
                                                style={{ width: '100%', height: '100%' }}
                                                src={writtenRxSrc}
                                                objectFit="contain"
                                            />
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </>
                </Page>
            }
            {shouldRenderMainPrescriptionPage && (
                <Page
                    size="A4"
                    style={[paddingStyles, {
                        display: 'flex',
                        flexDirection: 'column',
                        // justifyContent: 'space-between',
                    }]}
                    wrap={!smartRxData}>
                    
                    {/* Letterhead spacer for Own Letterhead first-page-only mode */}
                    {printSettings?.letterhead_format === 2 && showMode === 'first' && extraTopSpace && (
                        <View style={{
                            marginTop: extraTopSpace,
                            height: 0,
                        }} />
                    )}
                    
                    {/* <View style={{flex: 1}}>     */}
                    <View style={{ marginBottom: PX_TO_PT * (mode == NORMAL ? printSettings?.letterhead_format != 2 ? 15 : 0 : 15) }} fixed = {printSettings?.header_footer?.show_header_footer_page !== 'first'}>
                        {mode == NORMAL ? (
                            printSettings?.letterhead_format === 0 ? (
                                <View>
                                    {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' && printSettings?.header_footer?.header?.clinic_info?.enable === 'Y' ? (
                                        <View style={styles.directionCasemanager}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.mainTitle}>
                                                    {printSettings?.header_footer?.header?.doctor_info?.place === 'L' ? printSettings?.header_footer?.header?.doctor_info?.header : printSettings?.header_footer?.header?.clinic_info?.header}
                                                </Text>
                                                {!cvtExtHosPatientMapEnabled && (
                                                    <Text style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}>
                                                        {printSettings?.header_footer?.header?.doctor_info?.place === 'L' ? printSettings?.header_footer?.header?.doctor_info?.subheader : printSettings?.header_footer?.header?.clinic_info?.subheader}
                                                    </Text>
                                                )}
                                            </View>
                                            {printSettings?.logo_enable === 'Y' && (
                                                <View style={{ width: isCvtExtHosAccessableForPrint ? 130 : 82, height: isCvtExtHosAccessableForPrint ? 90 : 82, overflow: 'hidden', marginHorizontal: 16 }}>
                                                    {showMissionHospitalLogo ? (
                                                        <Image
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            src={ASSETS.images.missionHospitalLogo}
                                                        />
                                                    ) : (
                                                        fileLogo && fileLogo?.imageShow && (
                                                            <Image
                                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                                src={fileLogo?.showFile}
                                                            />
                                                        )
                                                    )}
                                                </View>
                                            )}
                                            <View style={{ flex: 1, textAlign: 'right' }}>
                                                {showMissionHospitalLogo ? (
                                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        <Image
                                                            style={{ width: 140, height: 60, objectFit: 'contain' }}
                                                            src={ASSETS.images.nabhLogos}
                                                        />
                                                    </View>
                                                ) : (
                                                    <View>
                                                        <Text style={styles.mainTitle}>
                                                            {printSettings?.header_footer?.header?.doctor_info?.place === 'R' ? printSettings?.header_footer?.header?.doctor_info?.header : printSettings?.header_footer?.header?.clinic_info?.header}
                                                        </Text>
                                                        {!cvtExtHosPatientMapEnabled && (
                                                            <Text style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}>
                                                                {printSettings?.header_footer?.header?.doctor_info?.place === 'R' ? printSettings?.header_footer?.header?.doctor_info?.subheader : printSettings?.header_footer?.header?.clinic_info?.subheader}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {printSettings?.logo_enable === 'Y' && (
                                                <View style={{ width: 82, height: 82, overflow: 'hidden', marginLeft: 8 }}>
                                                    {fileLogo && fileLogo?.imageShow && (
                                                        <Image
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            src={fileLogo?.showFile}
                                                        />
                                                    )}
                                                </View>
                                            )}
                                            {(printSettings?.header_footer?.header?.doctor_info?.enable === 'Y') ? (
                                                <View style={{ flex: 1, textAlign: printSettings?.header_footer?.header?.doctor_info?.place === 'L' ? 'left' : 'right', weight: '189px' }}>
                                                    <Text style={styles.mainTitle}>
                                                        {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' ? printSettings?.header_footer?.header?.doctor_info?.header : printSettings?.header_footer?.header?.clinic_info?.header}
                                                    </Text>
                                                    <Text style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}>
                                                        {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' ? printSettings?.header_footer?.header?.doctor_info?.subheader : printSettings?.header_footer?.header?.clinic_info?.subheader}
                                                    </Text>
                                                </View>
                                            ) : printSettings?.header_footer?.header?.clinic_info?.enable === 'Y' && (
                                                <View style={{ flex: 1, textAlign: printSettings?.header_footer?.header?.clinic_info?.place === 'L' ? 'left' : 'right', weight: '130px' }}>
                                                    <Text style={styles.mainTitle}>
                                                        {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' ? printSettings?.header_footer?.header?.doctor_info?.header : printSettings?.header_footer?.header?.clinic_info?.header}
                                                    </Text>
                                                    <Text style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}>
                                                        {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' ? printSettings?.header_footer?.header?.doctor_info?.subheader : printSettings?.header_footer?.header?.clinic_info?.subheader}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            ) : printSettings?.letterhead_format === 1 && (
                                fileHeader && fileHeader?.imageShow && (
                                    <Image
                                        style={{ width: '100%', objectFit: 'contain' }}
                                        src={fileHeader?.showFile}
                                    />
                                )
                            )
                        ) : mode == WHATSAPP && (
                            printSettings?.whatsapp_letterhead_format === 0 ? (
                                <View>
                                    {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' && printSettings?.header_footer?.header?.clinic_info?.enable === 'Y' ? (
                                        <View style={styles.directionCasemanager}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.mainTitle}>
                                                    {printSettings?.header_footer?.header?.doctor_info?.place === 'L' ? printSettings?.header_footer?.header?.doctor_info?.header : printSettings?.header_footer?.header?.clinic_info?.header}
                                                </Text>
                                                <Text style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}>
                                                    {printSettings?.header_footer?.header?.doctor_info?.place === 'L' ? printSettings?.header_footer?.header?.doctor_info?.subheader : printSettings?.header_footer?.header?.clinic_info?.subheader}
                                                </Text>
                                            </View>
                                            {printSettings?.logo_enable === 'Y' && (
                                                <View style={{ width: 82, height: 82, overflow: 'hidden', marginHorizontal: 16 }}>
                                                    {fileLogo && fileLogo?.imageShow && (
                                                        <Image
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            src={fileLogo?.showFile}
                                                        />
                                                    )}
                                                </View>
                                            )}
                                            <View style={{ flex: 1, textAlign: 'right' }}>
                                                <Text style={styles.mainTitle}>
                                                    {printSettings?.header_footer?.header?.doctor_info?.place === 'R' ? printSettings?.header_footer?.header?.doctor_info?.header : printSettings?.header_footer?.header?.clinic_info?.header}
                                                </Text>
                                                <Text style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}>
                                                    {printSettings?.header_footer?.header?.doctor_info?.place === 'R' ? printSettings?.header_footer?.header?.doctor_info?.subheader : printSettings?.header_footer?.header?.clinic_info?.subheader}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {printSettings?.logo_enable === 'Y' && (
                                                <View style={{ width: 82, height: 82, overflow: 'hidden' }}>
                                                    {fileLogo && fileLogo?.imageShow && (
                                                        <Image
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            src={fileLogo?.showFile}
                                                        />
                                                    )}
                                                </View>
                                            )}
                                            {(printSettings?.header_footer?.header?.doctor_info?.enable === 'Y') ? (
                                                <View style={{ flex: 1, marginLeft: printSettings?.header_footer?.header?.doctor_info?.place === 'L' ? 8 : 0, textAlign: printSettings?.header_footer?.header?.doctor_info?.place === 'L' ? 'left' : 'right', weight: '189px' }}>
                                                    <Text style={styles.mainTitle}>
                                                        {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' ? printSettings?.header_footer?.header?.doctor_info?.header : printSettings?.header_footer?.header?.clinic_info?.header}
                                                    </Text>
                                                    <Text style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}>
                                                        {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' ? printSettings?.header_footer?.header?.doctor_info?.subheader : printSettings?.header_footer?.header?.clinic_info?.subheader}
                                                    </Text>
                                                </View>
                                            ) : printSettings?.header_footer?.header?.clinic_info?.enable === 'Y' && (
                                                <View style={{ flex: 1, marginLeft: printSettings?.header_footer?.header?.clinic_info?.place === 'L' ? 8 : 0, textAlign: printSettings?.header_footer?.header?.clinic_info?.place === 'L' ? 'left' : 'right', weight: '130px' }}>
                                                    <Text style={styles.mainTitle}>
                                                        {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' ? printSettings?.header_footer?.header?.doctor_info?.header : printSettings?.header_footer?.header?.clinic_info?.header}
                                                    </Text>
                                                    <Text style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}>
                                                        {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' ? printSettings?.header_footer?.header?.doctor_info?.subheader : printSettings?.header_footer?.header?.clinic_info?.subheader}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            ) : printSettings?.whatsapp_letterhead_format === 1 && (
                                fileHeader && fileHeader?.imageShow && (
                                    <Image
                                        style={{ width: '100%', objectFit: 'contain' }}
                                        src={fileHeader?.showFile}
                                    />
                                )
                            )
                        )}

                    </View>

                    {/* <View style={{ flex: 1 }}> */}

                    {printSettings?.water_mark_enable === 'Y' && (
                        fileWatermark && fileWatermark?.imageShow && (
                            <Image
                                style={{
                                    width: 100, height: 100, objectFit: 'contain', zIndex: -1, opacity: 0.1,
                                    position: 'absolute', top: '50%', left: '40%'
                                }}
                                src={fileWatermark?.showFile}
                                fixed />
                        )
                    )}

                    <View style={{ backgroundColor: '#171725', height: PX_TO_PT * 2, width: '100%' }} 
                        fixed={printSettings?.header_footer?.show_patient_info === 'all'} />
                    {printSettings?.header_footer?.show_patient_info === 'all' ? (
                        <>
                            <View style={{ flexDirection: 'row', marginVertical: PX_TO_PT * 15 }} fixed>
                                <View style={{ flex: 0.7 }}>
                                    {printSettings?.header_footer?.patient_info.filter(e => e.enable === 'Y').map((item, i) => {
                                        return (
                                            i % 2 === 0 && (
                                                <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: PX_TO_PT * 3 }}>
                                                    <Text style={[styles.displayPatient, { fontWeight: 500, fontSize: (printSettings?.page_format?.patient_info_font_size || printSettings?.page_format?.font_size || 12) * PX_TO_PT }]}>{`${item.title}: `}</Text>
                                                    <Text style={[styles.displayPatient, { fontWeight: 400, fontSize: (printSettings?.page_format?.patient_info_font_size || printSettings?.page_format?.font_size || 12) * PX_TO_PT }]}>{patientDataShow(item.id)}</Text>
                                                </View>
                                            )
                                        )
                                    })}
                                </View>
                                <View style={{ flex: 0.4 }}>
                                    {printSettings?.header_footer?.patient_info.filter(e => e.enable === 'Y').map((item, i) => {
                                        return (
                                            i % 2 === 1 && (
                                                <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: PX_TO_PT * 3 }}>
                                                    <Text style={[styles.displayPatient, { fontWeight: 500, fontSize: (printSettings?.page_format?.patient_info_font_size || printSettings?.page_format?.font_size || 12) * PX_TO_PT }]}>{`${item.title}: `}</Text>
                                                    <Text style={[styles.displayPatient, { fontWeight: 400, fontSize: (printSettings?.page_format?.patient_info_font_size || printSettings?.page_format?.font_size || 12) * PX_TO_PT }]}>{patientDataShow(item.id)}</Text>
                                                </View>
                                            )
                                        )
                                    })}
                                </View>
                            </View>
                            <View style={{ marginBottom: PX_TO_PT * 15, backgroundColor: '#171725', height: PX_TO_PT * 1, width: '100%' }} fixed />
                        </>
                                    ) : (
                        <>
                            <View style={{ flexDirection: 'row', marginVertical: PX_TO_PT * 15 }}>
                                <View style={{ flex: 0.7 }}>
                                    {printSettings?.header_footer?.patient_info.filter(e => e.enable === 'Y').map((item, i) => {
                                        return (
                                            i % 2 === 0 && (
                                                <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: PX_TO_PT * 3 }}>
                                                    <Text style={[styles.displayPatient, { fontWeight: 500, fontSize: (printSettings?.page_format?.patient_info_font_size || printSettings?.page_format?.font_size || 12) * PX_TO_PT }]}>{`${item.title}: `}</Text>
                                                    <Text style={[styles.displayPatient, { fontWeight: 400, fontSize: (printSettings?.page_format?.patient_info_font_size || printSettings?.page_format?.font_size || 12) * PX_TO_PT }]}>{patientDataShow(item.id)}</Text>
                                                </View>
                                            )
                                        )
                                    })}
                                </View>
                                <View style={{ flex: 0.4 }}>
                                    {printSettings?.header_footer?.patient_info.filter(e => e.enable === 'Y').map((item, i) => {
                                        return (
                                            i % 2 === 1 && (
                                                <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: PX_TO_PT * 3 }}>
                                                    <Text style={[styles.displayPatient, { fontWeight: 500, fontSize: (printSettings?.page_format?.patient_info_font_size || printSettings?.page_format?.font_size || 12) * PX_TO_PT }]}>{`${item.title}: `}</Text>
                                                    <Text style={[styles.displayPatient, { fontWeight: 400, fontSize: (printSettings?.page_format?.patient_info_font_size || printSettings?.page_format?.font_size || 12) * PX_TO_PT }]}>{patientDataShow(item.id)}</Text>
                                                </View>
                                            )
                                        )
                                    })}
                                </View>
                            </View>
                                                    
                            <View style={{ backgroundColor: '#171725', height: PX_TO_PT * 1, width: '100%' }} />
                        </>
                    )}

                    {/* <View style={{ 
                        marginTop: (printSettings?.header_footer?.show_patient_info === 'first' || 
                                !printSettings?.header_footer?.show_patient_info) ? PX_TO_PT * 15 : 0 
                    }}> */}
                        {(() => {
                        let hasRenderedPageBreak = false;
                        const hasModuleData = (option, caseManagerData) => {
                            switch(option.id) {
                                case 1: 
                                    return caseManagerData.symptoms?.length > 0;
                                case 2: 
                                    return caseManagerData.examination?.length > 0;
                                case 3: 
                                    return caseManagerData.diagnosis?.length > 0;
                                case 4: 
                                    return caseManagerData.medicine?.length > 0;
                                case 5: 
                                    return caseManagerData.advice?.length > 0;
                                case 6: 
                                    return caseManagerData.investigation?.length > 0;
                                case 7: 
                                    return caseManagerData.vitals?.length > 0 || caseManagerData?.patient_birth_weight;
                                case 8: 
                                    return caseManagerData.medical_history?.length > 0;
                                case 9: 
                                    return caseManagerData.follow_up_date;
                                case 91: 
                                    return caseManagerData.visit_advice || (Array.isArray(caseManagerData?.others) && caseManagerData.others.length > 0);
                                case 10: 
                                    return (todayVaccines?.given?.length || todayVaccines?.due?.length);
                                case 11: 
                                    return caseManagerData?.smart_prescription_filename?.length;
                                case 12: 
                                    return growthChartDetails?.growthChartImageData && Object.keys(growthChartDetails?.growthChartImageData)?.length > 0 && growthChartDetails?.todayGrowthChartData?.length > 0;
                                case 13: 
                                    return caseManagerData.gynecHistoryData;
                                case 14: 
                                    return obsHistoryData?.length > 0;
                                case 15: 
                                    return labParamsData?.length > 0;
                                case 16: 
                                    return caseManagerData?.zydusSelectedLabParams?.length > 0;
                                case 17: 
                                    return patientBills?.length > 0;
                                case 18: 
                                    return advanceReceipts?.length > 0;
                                case 20:
                                    return hasOphthalModuleData;
                                default:
                                    if (option.is_custom_module) {
                                        const customModule = caseManagerData?.moduleContents?.find(e => e.module_id === option?.id);
                                        if (!customModule?.content?.length) {
                                            return false;
                                        }
                                        
                                        // Find module definition to check version
                                        const moduleDefinition = customModules?.find(m => (m.module_id === customModule.module_id) || (m.origin_id === customModule.module_id) );
                                        const isV2 = moduleDefinition?.version === 'v2' && moduleDefinition?.namedFields;
                                        
                                        if (isV2) {
                                            // V2: Check if any named field has content
                                            const namedFields = moduleDefinition.namedFields;
                                            return customModule.content.some((item) => 
                                                namedFields.some(field => item[field.fieldName]?.trim?.().length > 0)
                                            );
                                        } else {
                                            // V1: Check for title or notes
                                            return customModule.content.some((item) => item?.title || item?.notes);
                                        }
                                    }
                                    return false;
                            }
                        };
                        const shouldRenderPageBreak = (pageBreakIndex) => {
                            for (let i = pageBreakIndex - 1; i >= 0; i--) {
                                const prevOption = printSettings?.prescription?.case_option[i];
                                if (prevOption?.type === "page_break") {
                                    break;
                                }
                                if (prevOption?.type !== "page_break" && prevOption?.enable === "Y") {
                                    const hasData = hasModuleData(prevOption, caseManagerData);
                                    if (hasData) {
                                        return true;
                                    }
                                }
                            }
                            return false;
                        };
                        
                        return (
                            <>
                            {isRxDigitizeBool && hasDentalSectionData && (
                                    <View style={styles.dentalSection}>
                                        {dentalComplaintRowsFiltered.length > 0 && (
                                            <View style={styles.dentalTable}>
                                                {dentalComplaintRowsFiltered.map((row) => (
                                                    <View key={row.key} style={styles.dentalRow}>
                                                        <View style={styles.dentalCellLabel}>
                                                            <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 500 }}>
                                                                {row.label}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.dentalCellValue}>
                                                            <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 400 }}>
                                                                {dentalComplaints?.[row.key] || ""}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                        {dentalMedicationRowsFiltered.length > 0 && (
                                            <View style={{ marginTop: PX_TO_PT * 6 }}>
                                                <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Medication (Rx):&nbsp;</Text>
                                                <View style={styles.table}>
                                                    <View style={styles.headerRow} fixed>
                                                        <Text style={[styles.headerCell, { flex: 0.18, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("S.NO")}</Text>
                                                        <Text style={[styles.headerCell, { fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("MEDICINE")}</Text>
                                                        <View style={{ flex: dentalMedicationOption?.medicine_option?.length === 0 ? 0.25 : dentalMedicationOption?.medicine_option?.length === 1 ? 0.8 : dentalMedicationOption?.medicine_option?.length === 2 ? 1.2 : dentalMedicationOption?.medicine_option?.length === 3 ? 1.4 : 2.4 }}>
                                                            <View style={{ flexGrow: 1, flexDirection: 'row' }}>
                                                                {dentalMedicationOption?.medicine_option?.includes('dose') && (
                                                                    <Text style={[styles.headerCell, { flex: 0.45, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("DOSE")}</Text>
                                                                )}
                                                                {dentalMedicationOption?.medicine_option?.includes('frequency') && (
                                                                    <Text style={[styles.headerCell, { flex: 0.6, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("FREQUENCY")}</Text>
                                                                )}
                                                                {dentalMedicationOption?.medicine_option?.includes('duration') && (
                                                                    <Text style={[styles.headerCell, { flex: 0.53, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("DURATION")}</Text>
                                                                )}
                                                                {dentalMedicationOption?.medicine_option?.includes('quantity') && (
                                                                    <Text style={[styles.headerCell, { flex: 0.18, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("QTY")}</Text>
                                                                )}
                                                                {dentalMedicationOption?.medicine_option?.includes('note') && (
                                                                    <Text style={[styles.headerCell, { flex: 0.7, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("NOTES")}</Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </View>
                                                    {dentalMedicationRowsFiltered.map((item, i) => (
                                                        <View style={styles.row} key={item.tmm_id || item.unique_id || i} wrap={false}>
                                                            <Text style={[styles.cell, { flex: 0.18, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{i + 1}</Text>
                                                            <View style={styles.cell}>
                                                                <Text style={[{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.tmm_medicine_name || item.name || ''}</Text>
                                                                {dentalMedicationOption?.medicine_with_generic && (item.tmm_generic || item.corrected_name) ? (
                                                                    <Text style={[{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: (PX_TO_PT * printSettings?.page_format?.font_size) - 2, fontWeight: 400 }]}>{item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic || ''}</Text>
                                                                ) : null}
                                                            </View>
                                                            <View style={{ flex: dentalMedicationOption?.medicine_option?.length === 0 ? 0.25 : dentalMedicationOption?.medicine_option?.length === 1 ? 0.8 : dentalMedicationOption?.medicine_option?.length === 2 ? 1.2 : dentalMedicationOption?.medicine_option?.length === 3 ? 1.4 : 2.4, flexDirection: 'row' }}>
                                                                {dentalMedicationOption?.medicine_option?.includes('dose') && (
                                                                    <Text style={[styles.cell, { flex: 0.45, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>
                                                                        {item.tmm_dosage && item.tmm_unit ? `${formatUnitPerDose(item.tmm_dosage, dentalMedicationOption?.is_dosage_decimal)} ${item.medicineUnit?.find((x) => x.tmu_id == item.tmm_unit)?.tmu_title || ''}` : (item.medicineUnit?.find((x) => x.tmu_id == item.default_tmm_unit)?.tmu_title || '-')}
                                                                    </Text>
                                                                )}
                                                                {dentalMedicationOption?.medicine_option?.includes('frequency') && (
                                                                    <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                        {item.tmf_block === 0 || item.tmf_block === ''
                                                                            ? ((item.tcm_tmm_freq_morning || item.tcm_tmm_freq_afternoon || item.tcm_tmm_freq_evening || item.tcm_tmm_freq_night)
                                                                                ? (dentalMedicationOption?.numeric_frequency
                                                                                    ? `${item.tcm_tmm_freq_morning ? medicine_freq_dosage_format(item.tcm_tmm_freq_morning, dentalMedicationOption?.is_dosage_decimal) : 0} - ${item.tcm_tmm_freq_afternoon ? medicine_freq_dosage_format(item.tcm_tmm_freq_afternoon, dentalMedicationOption?.is_dosage_decimal) : 0}${item.tcm_tmm_freq_evening ? ' - ' + medicine_freq_dosage_format(item.tcm_tmm_freq_evening, dentalMedicationOption?.is_dosage_decimal) : ''} - ${item.tcm_tmm_freq_night ? medicine_freq_dosage_format(item.tcm_tmm_freq_night, dentalMedicationOption?.is_dosage_decimal) : 0}`
                                                                                    : formatFrequency(item.tcm_tmm_freq_morning, item.tcm_tmm_freq_afternoon, item.tcm_tmm_freq_evening, item.tcm_tmm_freq_night, dentalMedicationOption?.is_dosage_decimal))
                                                                                : '-')
                                                                            : `(${frequencyList?.find((x) => x.tmf_id === item.tmm_freq_type)?.[frequencyLang()] || ''})`}
                                                                        {'\n'}
                                                                        {item?.schedule || ""}
                                                                    </Text>
                                                                )}
                                                                {dentalMedicationOption?.medicine_option?.includes('duration') && (
                                                                    <Text style={[styles.cell, { flex: 0.53, color: '#171725', fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                        {EXTRA_OPTIONS.some((x) => x.value == item.tmm_duration_type) ? durationLang(capitalize(item.tmm_duration_type, true)) : isNumeric(item.tmm_days) ? `${item.tmm_days} ${durationLang(item.tmm_duration_type)}` : '-'}
                                                                    </Text>
                                                                )}
                                                                {dentalMedicationOption?.medicine_option?.includes('quantity') && (
                                                                    <Text style={[styles.cell, { flex: 0.18, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.display_qty ? item.display_qty : '-'}</Text>
                                                                )}
                                                                {dentalMedicationOption?.medicine_option?.includes('note') && (
                                                                    <Text style={[styles.cell, { flex: 0.7, color: '#171725', fontFamily: getIndianLanguageFont(item.tmm_remarks, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                        {item.tmm_remarks ? item.tmm_remarks : '-'}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {hasTeethData && (
                                            <View style={styles.dentalQuadrantGrid}>
                                                {[0, 1].map((rowIndex) => (
                                                    <View key={`dq-row-${rowIndex}`} style={styles.dentalQuadrantRow} wrap={false}>
                                                        {dentalQuadrantSections.slice(rowIndex * 2, rowIndex * 2 + 2).map((section, idx) => {
                                                            const isLastCol = idx === 1;
                                                            const isLastRow = rowIndex === 1;
                                                            return (
                                                                <View
                                                                    key={section.key}
                                                                    style={{
                                                                        ...styles.dentalQuadrantCell,
                                                                        borderRight: isLastCol ? "0px solid #171725" : styles.dentalQuadrantCell.borderRight,
                                                                        borderBottom: isLastRow ? "0px solid #171725" : styles.dentalQuadrantCell.borderBottom,
                                                                    }}
                                                                >
                                                                    <Text style={{ ...styles.dentalQuadrantTitle, fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 600 }}>
                                                                        {section.label}
                                                                    </Text>
                                                                    {(dentalTeethBySection?.[section.key] || []).map((tooth, i) => (
                                                                        <Text key={`${section.key}-${i}`} style={{ ...styles.dentalListItem, fontFamily: baseFontFamily, fontSize: baseFontSize }}>
                                                                            {`Tooth ${tooth?.toothNum ?? ""}: ${tooth?.diagnose ?? ""}`}
                                                                        </Text>
                                                                    ))}
                                                                </View>
                                                            );
                                                        })}
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {dentalDiagnosisRows.length > 0 && (
                                            <View style={{...styles.dentalTable, marginTop: PX_TO_PT * 6}}>
                                                <View style={styles.dentalHeaderRow}>
                                                    <View style={styles.dentalHeaderCell}>
                                                        <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 600 }}>Diagnosis Field</Text>
                                                    </View>
                                                    <View style={styles.dentalHeaderCell}>
                                                        <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 600 }}>Selected Values</Text>
                                                    </View>
                                                </View>
                                                {dentalDiagnosisRows.map((row) => (
                                                    <View key={`dx-${row.key}`} style={styles.dentalRow}>
                                                        <View style={styles.dentalCellLabel}>
                                                            <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 500 }}>
                                                                {row.label}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.dentalCellValue}>
                                                            <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 400 }}>
                                                                {row.value}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {hasToothDiagramNotes && (
                                            <View style={{...styles.dentalTable, marginTop: PX_TO_PT * 6}}>
                                                <View style={styles.dentalRow}>
                                                    <View style={styles.dentalCellLabel}>
                                                        <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 500 }}>
                                                            TOOTH DIAGRAM NOTES
                                                        </Text>
                                                    </View>
                                                    <View style={styles.dentalCellValue}>
                                                        <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 400 }}>
                                                            {dentalToothDiagramNotes}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}

                                        {dentalTreatmentRowsFiltered.length > 0 && (
                                            <>
                                                <Text style={{ marginTop: PX_TO_PT * 6, fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 600 }}>
                                                    TREATMENT PLAN(S)
                                                </Text>
                                                <View style={{...styles.dentalTable, marginTop: PX_TO_PT * 6}}>
                                                    <View style={styles.dentalHeaderRow}>
                                                        {["S NO", "TREATMENT", "TOOTH NUMBER", "RATE", "COUNT", "ESTIMATE"].map((label) => (
                                                            <View key={label} style={styles.dentalHeaderCell}>
                                                                <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 600 }}>{label}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                    {dentalTreatmentRowsFiltered.map((item, i) => (
                                                        <View key={`tp-${i}`} style={styles.dentalRow}>
                                                            {[item?.srno, item?.treatment, item?.toothNum, item?.rate, item?.count, item?.estimate].map((val, idx) => (
                                                                <View key={`${i}-${idx}`} style={styles.dentalCellValue}>
                                                                    <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 400 }}>
                                                                        {val ?? ""}
                                                                    </Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    ))}
                                                </View>
                                            </>
                                        )}

                                        {(dentalWorkDoneRowsFiltered.length > 0 || hasWorkDoneNotes) && (
                                            <>
                                                <Text style={{ marginTop: PX_TO_PT * 6, fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 600 }}>
                                                    WORK DONE
                                                </Text>
                                                {dentalWorkDoneRowsFiltered.length > 0 && (
                                                    <View style={{...styles.dentalTable, marginTop: PX_TO_PT * 6}}>
                                                        <View style={styles.dentalHeaderRow}>
                                                            {[
                                                                "DATE",
                                                                "WORK DONE",
                                                                "PTR",
                                                                "PAYMENT",
                                                                "BALANCE",
                                                                "REMARKS",
                                                            ].map((label, idx) => (
                                                                <View
                                                                    key={label}
                                                                    style={{
                                                                        ...styles.dentalHeaderCell,
                                                                        flex: idx === 1 ? 4 : 1,
                                                                    }}
                                                                >
                                                                    <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 600 }}>{label}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                        {dentalWorkDoneRowsFiltered.map((item, i) => (
                                                            <View key={`wd-${i}`} style={styles.dentalRow}>
                                                                {[
                                                                    item?.date,
                                                                    buildWorkDoneText(item),
                                                                    item?.ptr,
                                                                    item?.payment,
                                                                    item?.balance,
                                                                    item?.remarks,
                                                                ].map((val, idx) => (
                                                                    <View
                                                                        key={`${i}-${idx}`}
                                                                        style={{
                                                                            ...styles.dentalCellValue,
                                                                            flex: idx === 1 ? 4 : 1,
                                                                        }}
                                                                    >
                                                                        <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 400 }}>
                                                                            {val ?? ""}
                                                                        </Text>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                                {hasWorkDoneNotes && (
                                                    <View style={{...styles.dentalTable, marginTop: PX_TO_PT * 6}}>
                                                        <View style={styles.dentalRow}>
                                                            <View style={styles.dentalCellLabel}>
                                                                <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 500 }}>
                                                                    WORK DONE NOTES
                                                                </Text>
                                                            </View>
                                                            <View style={styles.dentalCellValue}>
                                                                <Text style={{ fontFamily: baseFontFamily, fontSize: baseFontSize, fontWeight: 400 }}>
                                                                    {dentalWorkDone?.notes ?? ""}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                )}
                                            </>
                                        )}
                                    </View>
                                )}
                                {hasBlankSmartSyncCanvas &&
                                    smartRxData
                                        ?.filter((item) => getSmartSyncUploadedFileUri(item))
                                        ?.map((item, i) => (
                                            <View key={`blank-smartsync-canvas-${i}`}>
                                                <View style={{ marginTop: PX_TO_PT * 15, width: '100%', height: 800 }}>
                                                    <Image
                                                        style={{ width: '100%', height: '100%' }}
                                                        src={getSmartSyncUploadedFileUri(item)}
                                                        objectFit="contain"
                                                    />
                                                </View>
                                            </View>
                                        ))}
                                {printSettings?.prescription?.case_option?.map((option, index) => {
                            if (
                                isCvtExtHosAccessableForPrint &&
                                !isRxDigitizeBool &&
                                option?.id !== 7 &&
                                option?.id !== 11
                            ) {
                                return null;
                            }
                            const customModule = caseManagerData?.moduleContents?.find(e => {
                                return e.module_id === option?.id
                            });

                            if (option?.type === "page_break") {
                                const isLastPageBreak = index === printSettings?.prescription?.case_option?.length - 1;
                                const shouldRenderCurrentPageBreak = shouldRenderPageBreak(index);

                                if (isLastPageBreak) {
                                    return null;
                                }
                                if (hasRenderedPageBreak) {
                                    return null;
                                }
                                if (!shouldRenderCurrentPageBreak) {
                                    return null;
                                }
                                hasRenderedPageBreak = true;
                                return (
                                    <View key={option.id} break={true} style={{
                                        marginTop: PX_TO_PT * 20,
                                        pageBreakBefore: 'always'
                                    }}>
                                    </View>
                                );
                            }
                            if (option?.type !== "page_break" && option?.enable === "Y") {
                                hasRenderedPageBreak = false;
                            }
                            
                            const isLastOption = index === (printSettings?.prescription?.case_option?.length - 1);
                            
                            // Check if this is a custom module and if it has data
                            const hasCustomModuleData = option?.is_custom_module === true && customModule?.content?.some((item) => {
                                if (item?.title || item?.notes) return true;
                                const dataKeys = Object.keys(item || {}).filter(k => k !== 'id' && k !== 'order');
                                return dataKeys.some(k => item[k] != null && String(item[k]).trim() !== '');
                            });
                            
                            // Skip rendering if it's a custom module with no data
                            if (option?.is_custom_module === true && !hasCustomModuleData) {
                                return null;
                            }
                            
                            // // Check if this is a custom module and if it has data
                            // const hasCustomModuleData = (() => {
                            //     if (option?.is_custom_module !== true || !customModule?.content) {
                            //         return false;
                            //     }
                                
                            //     // Find module definition to check version
                            //     const moduleDefinition = customModules?.find(m => (m.module_id === customModule.module_id || m.origin_id === customModule.origin_id) );
                            //     const isV2 = moduleDefinition?.version === 'v2' && moduleDefinition?.namedFields;
                                
                            //     if (isV2) {
                            //         // V2: Check if any named field has content
                            //         const namedFields = moduleDefinition.namedFields;
                            //         return customModule.content.some((item) => 
                            //             namedFields.some(field => item[field.fieldName]?.trim?.().length > 0)
                            //         );
                            //     } else {
                            //         // V1: Check for title or notes
                            //         return customModule.content.some((item) => item?.title || item?.notes);
                            //     }
                            // })();
                            
                            // // Skip rendering if it's a custom module with no data
                            // if (option?.is_custom_module === true && !hasCustomModuleData) {
                            //     return null;
                            // }
                            
                            return (
                                <View key={option.id} style={{
                                    marginTop: index === 0 ? (printSettings?.header_footer?.show_patient_info === 'first' ||
                                        !printSettings?.header_footer?.show_patient_info) ? PX_TO_PT * 15 : 0 : 0
                                }}>
                                {option?.id === 1 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {caseManagerData.symptoms.length > 0 && (
                                            option?.format === 'inline' ? (
                                                <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, lineHeight: 2, marginTop: 4, }}>Symptoms:&nbsp;</Text>
                                                    {caseManagerData.symptoms.map((item, i) => {
                                                        return (
                                                            <Text key={i}>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.symptom_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.symptom_name}&nbsp;</Text>
                                                                {(item.since || item.severity || item.note) ?
                                                                    <View>
                                                                        {/* For since and severity (English content) */}
                                                                        {(item.since || item.severity) && (
                                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {`(${[
                                                                                    item.since ? `since: ${item.since}` : null,
                                                                                    item.severity ? `severity: ${item.severity}` : null
                                                                                ].filter(Boolean).join(', ')}${(item.since || item.severity) && item.note ? ', ' : ''}${!item.note ? ')' : ''}`}
                                                                            </Text>
                                                                        )}
                                                                        
                                                                        {/* For note (potentially in Indian language) */}
                                                                        {item.note && (
                                                                            <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {`${!(item.since || item.severity) ? '(' : ''}${item.note})`}
                                                                            </Text>
                                                                        )}
                                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.symptoms.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                                    </View>
                                                                    :
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.symptoms.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                                }
                                                            </Text>
                                                        )
                                                    })}
                                                </Text>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Symptoms:&nbsp;</Text>
                                                    {caseManagerData.symptoms.map((item, i) => {
                                                        return (
                                                            <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.symptom_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.symptom_name}&nbsp;</Text>
                                                                {(item.since || item.severity || item.note) && (
                                                                    <View>
                                                                        {/* For since and severity (English content) */}
                                                                        {(item.since || item.severity) && (
                                                                        <Text style={{ 
                                                                            color: '#171725', 
                                                                            fontFamily: printSettings?.page_format?.font_family, 
                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                            fontWeight: 400 
                                                                        }}>
                                                                            {`(${[
                                                                            item.since ? `since: ${item.since}` : null,
                                                                            item.severity ? `severity: ${item.severity}` : null
                                                                            ].filter(Boolean).join(', ')}${(item.since || item.severity) && item.note ? ', ' : ''}${!item.note ? ')\n' : ''}`}
                                                                        </Text>
                                                                        )}
                                                                        
                                                                        {/* For note (potentially in Indian language) */}
                                                                        {item.note && (
                                                                        <Text style={{ 
                                                                            color: '#171725', 
                                                                            fontFamily: getIndianLanguageFont(item.note), 
                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                            fontWeight: 400 
                                                                        }}>
                                                                            {`${!(item.since || item.severity) ? '(' : ''}${item.note})\n`}
                                                                        </Text>
                                                                        )}
                                                                    </View>
                                                                )}
                                                            </Text>
                                                        )
                                                    })}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>
                                                        Symptoms:&nbsp;
                                                    </Text>
                                                    {(() => {
                                                        const allStringFormat = caseManagerData.symptoms.every(item => {
                                                            if (item.isStringFormat) return true;
                                                            const hasStructuredData = (item.since && item.since !== '') || (item.severity && item.severity !== '') || (item.note && item.note !== '');
                                                            return !hasStructuredData;
                                                        });
                                                        return (
                                                            <View style={[styles.table, { borderTop: allStringFormat ? '1px solid #171725' : 'none', borderRight: '1px solid #171725' }]}>
                                                                {!allStringFormat && (
                                                        <View style={styles.headerRow} fixed>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                                            <Text style={[styles.headerCell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>SINCE</Text>
                                                            <Text style={[styles.headerCell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>SEVERITY</Text>
                                                            <Text style={[styles.headerCell, { flex: 0.5, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                                        </View>
                                                                )}
                                                        {caseManagerData.symptoms.map((item, i) => (
                                                            <View style={styles.row} key={i} wrap={false}>
                                                                        {allStringFormat ? (
                                                                            <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item.symptom_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, borderRight: '1px solid #171725' }]}>{item.symptom_name}&nbsp;</Text>
                                                                        ) : (
                                                                            <>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item.symptom_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.symptom_name}&nbsp;</Text>
                                                                <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.since ? item.since : '-'}</Text>
                                                                <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.severity ? item.severity : '-'}</Text>
                                                                <Text style={[styles.cell, { flex: 0.5, color: '#171725', fontFamily: getIndianLanguageFont(item.note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.note ? item.note : '-'}&nbsp;</Text>
                                                                            </>
                                                                        )}
                                                            </View>
                                                        ))}
                                                    </View>
                                                        );
                                                    })()}
                                                </View>
                                            )
                                        )}
                                    </>
                                ) : option?.id === 2 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {caseManagerData.examination.length > 0 && (
                                            option?.format === 'inline' ? (
                                                <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Examinations:&nbsp;</Text>
                                                    {caseManagerData.examination.map((item, i) => {
                                                        return (
                                                            <Text key={i}>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.examination_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.examination_name}&nbsp;</Text>
                                                                {(item.note) ?
                                                                    <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ note }) => ({ note }))(caseManagerData.examination[i])).filter(([_, v]) => v))).join(', ')})`}{caseManagerData.examination.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                                    :
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.examination.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                                }
                                                            </Text>
                                                        )
                                                    })}
                                                </Text>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Examinations:&nbsp;</Text>
                                                    {caseManagerData.examination.map((item, i) => {
                                                        return (
                                                            <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.examination_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.examination_name}&nbsp;</Text>
                                                                {(item.since || item.severity || item.note) &&
                                                                    <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ note }) => ({ note }))(caseManagerData.examination[i])).filter(([_, v]) => v))).join(', ')})\n`}</Text>
                                                                }
                                                            </Text>
                                                        )
                                                    })}
                                                </View>
                                            ) : (() => {
                                                const allStringFormat = caseManagerData.examination.every(item => {
                                                    const hasStructuredData = (item.note && item.note !== '');
                                                    return !hasStructuredData;
                                                });
                                                return (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Examinations:&nbsp;</Text>
                                                        <View style={[styles.table, { borderTop: allStringFormat ? '1px solid #171725' : 'none', borderRight: '1px solid #171725' }]}>
                                                            {!allStringFormat && (
                                                        <View style={styles.headerRow} fixed wrap={false}>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>
                                                                NAME
                                                            </Text>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>
                                                                NOTE
                                                            </Text>
                                                        </View>
                                                            )}
                                                        {caseManagerData.examination.map((item, i) => (
                                                            <View style={styles.row} key={i} wrap={false}>
                                                                    {allStringFormat ? (
                                                                        <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item.examination_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, borderRight: '1px solid #171725' }]}>
                                                                            {item.examination_name}&nbsp;
                                                                        </Text>
                                                                    ) : (
                                                                        <>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item.examination_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>
                                                                    {item.examination_name}&nbsp;
                                                                </Text>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item.note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                    {item.note ? item.note : '-'}&nbsp;
                                                                </Text>
                                                                        </>
                                                                    )}
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                                );
                                            })()
                                        )}
                                    </>
                                ) : option?.id === 3 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {caseManagerData.diagnosis.length > 0 && (
                                            option?.format === 'inline' ? (
                                                <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Diagnosis:&nbsp;</Text>
                                                    {caseManagerData.diagnosis.map((item, i) => {
                                                        return (
                                                            <Text key={i}>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.tds_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{`${item.tds_name}${item?.icd_code && option?.show_icd_code !== false ? ` (${item?.icd_code})` : ''}`}&nbsp;</Text>
                                                                {(item.since || item.status || item.note) ?
                                                                    <Text>
                                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                            {`(`}
                                                                        </Text>
                                                                        {[
                                                                            caseManagerData.diagnosis[i].since && <Text key="since" style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.diagnosis[i].since}</Text>,
                                                                            caseManagerData.diagnosis[i].status && <Text key="status" style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.diagnosis[i].status}</Text>,
                                                                            caseManagerData.diagnosis[i].note && <Text key="note" style={{ color: '#171725', fontFamily: getIndianLanguageFont(caseManagerData.diagnosis[i].note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.diagnosis[i].note}</Text>
                                                                        ].filter(Boolean).reduce((prev, curr, idx) => [prev, <Text key={`sep-${idx}`} style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>, </Text>, curr])}
                                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                            {`)`}{caseManagerData.diagnosis.length - 1 != i ? ',' : ''}&nbsp;
                                                                        </Text>
                                                                    </Text>
                                                                    :
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.diagnosis.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                                }
                                                            </Text>
                                                        )
                                                    })}
                                                </Text>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Diagnosis:&nbsp;</Text>
                                                    {caseManagerData.diagnosis.map((item, i) => {
                                                        return (
                                                            <Text key={i} style={{ marginTop: PX_TO_PT * 5, lineHeight: 1.4 }}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.tds_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{`${item.tds_name}${item?.icd_code && option?.show_icd_code !== false ? ` (${item?.icd_code})` : ''}`}&nbsp;</Text>
                                                                {(item.since || item.severity || item.note) &&
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                        {`(`}
                                                                        {[
                                                                            caseManagerData.diagnosis[i].since && <Text key="since" style={{ fontFamily: printSettings?.page_format?.font_family }}>{caseManagerData.diagnosis[i].since}</Text>,
                                                                            caseManagerData.diagnosis[i].status && <Text key="status" style={{ fontFamily: printSettings?.page_format?.font_family }}>{caseManagerData.diagnosis[i].status}</Text>,
                                                                            caseManagerData.diagnosis[i].note && <Text key="note" style={{ fontFamily: getIndianLanguageFont(caseManagerData.diagnosis[i].note, printSettings?.page_format?.font_family) }}>{caseManagerData.diagnosis[i].note}</Text>
                                                                        ].filter(Boolean).reduce((prev, curr, idx) => [prev, <Text key={`sep-${idx}`}>, </Text>, curr])}
                                                                        {`)`}
                                                                        {'\n'}
                                                                    </Text>
                                                                }
                                                            </Text>
                                                        )
                                                    })}
                                                </View>
                                            ) : (() => {
                                                const allStringFormat = caseManagerData.diagnosis.every(item => {
                                                    if (item.isStringFormat) return true;
                                                    const hasStructuredData = (item.since && item.since !== '') || (item.status && item.status !== '') || (item.note && item.note !== '');
                                                    return !hasStructuredData;
                                                });
                                                return (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Diagnosis:&nbsp;</Text>
                                                        <View style={[styles.table, { borderTop: allStringFormat ? '1px solid #171725' : 'none', borderRight: '1px solid #171725' }]}>
                                                            {!allStringFormat && (
                                                        <View style={styles.headerRow} fixed>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                                            <Text style={[styles.headerCell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>SINCE</Text>
                                                            <Text style={[styles.headerCell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>STATUS</Text>
                                                            <Text style={[styles.headerCell, { flex: 0.5, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                                        </View>
                                                            )}
                                                        {caseManagerData.diagnosis.map((item, i) => (
                                                            <View style={styles.row} key={i} wrap={false}>
                                                                    {allStringFormat ? (
                                                                        <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item.tds_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, borderRight: '1px solid #171725' }]}>{`${item.tds_name}${item?.icd_code && option?.show_icd_code !== false ? ` (${item?.icd_code})` : ''}`}&nbsp;</Text>
                                                                    ) : (
                                                                        <>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item.tds_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{`${item.tds_name}${item?.icd_code && option?.show_icd_code !== false ? ` (${item?.icd_code})` : ''}`}&nbsp;</Text>
                                                                <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.since ? item.since : '-'}</Text>
                                                                <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.status ? item.status : '-'}</Text>
                                                                <Text style={[styles.cell, { flex: 0.5, color: '#171725', fontFamily: getIndianLanguageFont(item.note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.note ? item.note : '-'}&nbsp;</Text>
                                                                        </>
                                                                    )}
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                                );
                                            })()
                                        )}
                                    </>
                                ) : option?.id === 4 && option?.enable === 'Y' && option?.custom_status === 'Y' && !shouldHideMedicationModuleBecauseDentalMedicationShown ? (
                                    <>
                                        {isAiFlowMedication && aiFlowMedicationList.length > 0 ? (
                                            <>
                                                {option?.format === 'table' ? (
                                                    <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                        <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Medication (Rx):&nbsp;</Text>
                                                        <View style={styles.table}>
                                                            <View style={styles.headerRow} fixed>
                                                                <Text style={[styles.headerCell, { flex: 0.18, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("S.NO")}</Text>
                                                                <Text style={[styles.headerCell, { fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("MEDICINE")}</Text>
                                                                <View style={{ flex: option?.medicine_option?.length === 0 ? 0.25 : option?.medicine_option?.length === 1 ? 0.8 : option?.medicine_option?.length === 2 ? 1.2 : option?.medicine_option?.length === 3 ? 1.4 : 2.4 }}>
                                                                    <View style={{ flexGrow: 1, flexDirection: 'row' }}>
                                                                        {option?.medicine_option?.includes('dose') && (
                                                                            <Text style={[styles.headerCell, { flex: 0.45, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("DOSE")}</Text>
                                                                        )}
                                                                        {option?.medicine_option?.includes('frequency') && (
                                                                            <Text style={[styles.headerCell, { flex: 0.6, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("FREQUENCY")}</Text>
                                                                        )}
                                                                        {option?.medicine_option?.includes('duration') && (
                                                                            <Text style={[styles.headerCell, { flex: 0.53, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("DURATION")}</Text>
                                                                        )}
                                                                        {option?.medicine_option?.includes('quantity') && (
                                                                            <Text style={[styles.headerCell, { flex: 0.18, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("QTY")}</Text>
                                                                        )}
                                                                        {option?.medicine_option?.includes('note') && (
                                                                            <Text style={[styles.headerCell, { flex: 0.7, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("NOTES")}</Text>
                                                                        )}
                                                                    </View>
                                                                </View>
                                                            </View>
                                                            {aiFlowMedicationList.map((item, i) => {
                                                                const getKey = (m) =>
                                                                    String(m?.tmm_medicine_name || m?.groundedMedicineName || m?.metadata?.tmm_medicine_name || m?.name || "")
                                                                        .trim()
                                                                        .toLowerCase();
                                                                const key = getKey(item);
                                                                const prevKey = i > 0 ? getKey(aiFlowMedicationList[i - 1]) : "";
                                                                const nextKey = i < aiFlowMedicationList.length - 1 ? getKey(aiFlowMedicationList[i + 1]) : "";
                                                                const isTaper = !!key && key === prevKey;
                                                                const isGroupEnd = !key || key !== nextKey;
                                                                const aiComputedFrequency = getAiMedicationFrequencyDisplay(item, option);
                                                                const aiTimingDisplay = getAiMedicationTimingDisplay(item);
                                                                const aiDurationDisplay = getAiMedicationDurationDisplay(item);

                                                                return (
                                                                <View style={[styles.row, !isGroupEnd ? { borderBottom: '0px' } : null]} key={item.tmm_id || item.unique_id || i} wrap={false}>
                                                                    <Text style={[styles.cell, { flex: 0.18, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }, !isGroupEnd ? { borderBottom: '0px' } : null]}>{isTaper ? '' : (i + 1)}</Text>
                                                                    <View style={[styles.cell, !isGroupEnd ? { borderBottom: '0px' } : null]}>
                                                                            <Text style={[{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>
                                                                                {isTaper ? '' : (item.tmm_medicine_name || item.groundedMedicineName || item.groundingMedicineName || item.metadata?.tmm_medicine_name || item.name || '')}
                                                                            </Text>
                                                                            {!isTaper && option?.medicine_with_generic && (item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic) ? (
                                                                                <Text style={[{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: (PX_TO_PT * printSettings?.page_format?.font_size) - 2, fontWeight: 400 }]}>{item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic || ''}</Text>
                                                                            ) : null}
                                                                    </View>
                                                                    <View style={{ flex: option?.medicine_option?.length === 0 ? 0.25 : option?.medicine_option?.length === 1 ? 0.8 : option?.medicine_option?.length === 2 ? 1.2 : option?.medicine_option?.length === 3 ? 1.4 : 2.4, flexDirection: 'row', ...(!isGroupEnd ? { borderBottom: '1px solid #171725' } : {}) }}>
                                                                        {option?.medicine_option?.includes('dose') && (
                                                                            <View style={[styles.cell, { flex: 0.45, position: 'relative' }]}>
                                                                                {isTaper ? (
                                                                                    <Text
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            left: -PX_TO_PT * 12,
                                                                                            top: -PX_TO_PT * 9,
                                                                                            paddingHorizontal: PX_TO_PT * 6,
                                                                                            paddingVertical: PX_TO_PT * 2,
                                                                                            borderRadius: PX_TO_PT * 10,
                                                                                            borderWidth: 1,
                                                                                            borderColor: '#B5B5B5',
                                                                                            backgroundColor: '#FFFFFF',
                                                                                            zIndex: 2,
                                                                                            color: '#171725',
                                                                                            fontFamily: printSettings?.page_format?.font_family,
                                                                                            fontSize: (PX_TO_PT * printSettings?.page_format?.font_size) - 2,
                                                                                            fontWeight: 500,
                                                                                        }}
                                                                                    >
                                                                                        Then
                                                                                    </Text>
                                                                                ) : null}
                                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, marginTop: isTaper ? PX_TO_PT * 2 : 0 }}>
                                                                                    {getAiMedicationDoseDisplay(item, option)}
                                                                                </Text>
                                                                            </View>
                                                                        )}
                                                                        {option?.medicine_option?.includes('frequency') && (
                                                                            <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                                {aiComputedFrequency}
                                                                                {'\n'}
                                                                                {aiTimingDisplay || ''}
                                                                            </Text>
                                                                        )}
                                                                        {option?.medicine_option?.includes('duration') && (
                                                                            <Text style={[styles.cell, { flex: 0.53, color: '#171725', fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                                {aiDurationDisplay}
                                                                            </Text>
                                                                        )}
                                                                        {option?.medicine_option?.includes('quantity') && (
                                                                            <Text style={[styles.cell, { flex: 0.18, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{getAiMedicationQuantityDisplay(item)}</Text>
                                                                        )}
                                                                        {option?.medicine_option?.includes('note') && (
                                                                            <Text style={[styles.cell, { flex: 0.7, color: '#171725', fontFamily: getIndianLanguageFont(getAiMedicationNotesDisplay(item), printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                                {getAiMedicationNotesDisplay(item)}
                                                                            </Text>
                                                                        )}
                                                                    </View>
                                                                </View>
                                                                );
                                                            })}
                                                        </View>
                                                    </View>
                                                ) : (
                                                    // AI flow inline / list view
                                                    <>
                                                        {option?.format === 'inline' ? (
                                                            <Text style={{ marginTop: PX_TO_PT * 15, marginBottom: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                                <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medication (Rx):&nbsp;</Text>
                                                                {(() => {
                                                                    const getKey = (m) =>
                                                                        String(m?.tmm_medicine_name || m?.groundedMedicineName || m?.metadata?.tmm_medicine_name || m?.name || "")
                                                                            .trim()
                                                                            .toLowerCase();
                                                                    const groups = [];
                                                                    for (const med of aiFlowMedicationList) {
                                                                        const key = getKey(med);
                                                                        const last = groups[groups.length - 1];
                                                                        if (last && last.key === key && key) {
                                                                            last.items.push(med);
                                                                        } else {
                                                                            groups.push({
                                                                                key,
                                                                                name: med?.tmm_medicine_name || med?.groundedMedicineName || med?.groundingMedicineName || med?.metadata?.tmm_medicine_name || med?.name || '',
                                                                                items: [med],
                                                                            });
                                                                        }
                                                                    }
                                                                    const buildDetailsParts = (item) => {
                                                                        const aiInlineFrequency = getAiMedicationFrequencyDisplay(item, option);
                                                                        const aiTimingDisplay = getAiMedicationTimingDisplay(item);
                                                                        const aiDur = getAiMedicationDurationDisplay(item);
                                                                        return Object.values(
                                                                            Object.fromEntries(
                                                                                Object.entries({
                                                                                    generic: option?.medicine_with_generic && (item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic)
                                                                                        ? (item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic)
                                                                                        : '',
                                                                                    dose: option?.medicine_option?.includes('dose')
                                                                                        ? getAiMedicationDoseDisplay(item, option)
                                                                                        : '',
                                                                                    frequency: option?.medicine_option?.includes('frequency') ? aiInlineFrequency : '',
                                                                                    timing: aiTimingDisplay,
                                                                                    duration: option?.medicine_option?.includes('duration')
                                                                                        ? (aiDur !== '-' ? aiDur : '')
                                                                                        : '',
                                                                                    qty: option?.medicine_option?.includes('quantity') && getAiMedicationQuantityDisplay(item) !== '-'
                                                                                        ? `${getAiMedicationQuantityDisplay(item)} qty`
                                                                                        : '',
                                                                                }).filter(([, v]) => v)
                                                                            )
                                                                        )
                                                                            .filter(Boolean)
                                                                            .join(', ');
                                                                    };
                                                                    const buildRemarks = (item) =>
                                                                        option?.medicine_option?.includes('note') && getAiMedicationNotesDisplay(item) !== '-'
                                                                            ? `, ${getAiMedicationNotesDisplay(item)}`
                                                                            : '';
                                                                    return groups.map((group, gi) => (
                                                                        <Text key={`${group.key || group.name || 'med'}-${gi}`}>
                                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                {group.name}&nbsp;
                                                                            </Text>
                                                                            <Text style={{ color: '#171725', fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {group.items.map((item, ii) => (
                                                                                    <Text key={item.tmm_id || item.unique_id || ii}>
                                                                                        {ii !== 0 ? 'then ' : ''}
                                                                                        ({buildDetailsParts(item)}{buildRemarks(item)})
                                                                                        {ii !== group.items.length - 1 ? ' ' : ''}
                                                                                    </Text>
                                                                                ))}
                                                                                {gi !== groups.length - 1 ? ', ' : ''}
                                                                                &nbsp;
                                                                            </Text>
                                                                        </Text>
                                                                    ));
                                                                })()}
                                                            </Text>
                                                        ) : (
                                                            // list view for AI flow
                                                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                                <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medication (Rx):&nbsp;</Text>
                                                                {(() => {
                                                                    const getKey = (m) =>
                                                                        String(m?.tmm_medicine_name || m?.groundedMedicineName || m?.metadata?.tmm_medicine_name || m?.name || "")
                                                                            .trim()
                                                                            .toLowerCase();
                                                                    const groups = [];
                                                                    for (const med of aiFlowMedicationList) {
                                                                        const key = getKey(med);
                                                                        const last = groups[groups.length - 1];
                                                                        if (last && last.key === key && key) {
                                                                            last.items.push(med);
                                                                        } else {
                                                                            groups.push({
                                                                                key,
                                                                                name: med?.tmm_medicine_name || med?.groundedMedicineName || med?.groundingMedicineName || med?.metadata?.tmm_medicine_name || med?.name || '',
                                                                                items: [med],
                                                                            });
                                                                        }
                                                                    }
                                                                    const buildDetailsParts = (item) => {
                                                                        const aiInlineFrequency = getAiMedicationFrequencyDisplay(item, option);
                                                                        const aiTimingDisplay = getAiMedicationTimingDisplay(item);
                                                                        const aiDur = getAiMedicationDurationDisplay(item);
                                                                        return Object.values(
                                                                            Object.fromEntries(
                                                                                Object.entries({
                                                                                    generic: option?.medicine_with_generic && (item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic)
                                                                                        ? (item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic)
                                                                                        : '',
                                                                                    dose: option?.medicine_option?.includes('dose')
                                                                                        ? getAiMedicationDoseDisplay(item, option)
                                                                                        : '',
                                                                                    frequency: option?.medicine_option?.includes('frequency') ? aiInlineFrequency : '',
                                                                                    timing: aiTimingDisplay,
                                                                                    duration: option?.medicine_option?.includes('duration')
                                                                                        ? (aiDur !== '-' ? aiDur : '')
                                                                                        : '',
                                                                                    qty: option?.medicine_option?.includes('quantity') && getAiMedicationQuantityDisplay(item) !== '-'
                                                                                        ? `${getAiMedicationQuantityDisplay(item)} qty`
                                                                                        : '',
                                                                                }).filter(([, v]) => v)
                                                                            )
                                                                        )
                                                                            .filter(Boolean)
                                                                            .join(', ');
                                                                    };
                                                                    const buildRemarks = (item) =>
                                                                        option?.medicine_option?.includes('note') && getAiMedicationNotesDisplay(item) !== '-'
                                                                            ? `, ${getAiMedicationNotesDisplay(item)}`
                                                                            : '';
                                                                    return groups.map((group, gi) => (
                                                                        <Text key={`${group.key || group.name || 'med'}-${gi}`} style={{ marginTop: PX_TO_PT * 5, lineHeight: 1.4 }}>
                                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                &nbsp;{gi + 1}.&nbsp;
                                                                            </Text>
                                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                {group.name}&nbsp;
                                                                            </Text>
                                                                            <Text style={{ color: '#171725', fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {group.items.map((item, ii) => (
                                                                                    <Text key={item.tmm_id || item.unique_id || ii}>
                                                                                        {ii !== 0 ? 'then ' : ''}
                                                                                        ({buildDetailsParts(item)}{buildRemarks(item)})
                                                                                        {ii !== group.items.length - 1 ? ' ' : ''}
                                                                                    </Text>
                                                                                ))}
                                                                            </Text>
                                                                        </Text>
                                                                    ));
                                                                })()}
                                                            </View>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        ) : caseManagerData.medicine.length > 0 ? (
                                            option?.format === 'inline' ? (
                                                <Text style={{ marginTop: PX_TO_PT * 15, marginBottom: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medication (Rx):&nbsp;</Text>
                                                    {medicationData?.map((pItem, i) => {
                                                        return (
                                                            <Text key={i}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{pItem.tmm_medicine_name || pItem.name || pItem.groundedMedicineName || pItem.groundingMedicineName || ''}&nbsp;</Text>
                                                                {innerMedication(pItem.index).map((item, ii) => {
                                                                    return (
                                                                        <Text key={ii}>
                                                                            {ii !== 0 && (
                                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{'then'}&nbsp;</Text>
                                                                            )}
                                                                            <Text style={{ 
                                                                                    color: '#171725', 
                                                                                    fontFamily: getFont(), 
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                    fontWeight: 400 
                                                                                }}>
                                                                                    ({[
                                                                                        ...Object.values(
                                                                                            Object.fromEntries(
                                                                                                Object.entries({
                                                                                                    modiGeneric: option?.medicine_with_generic && ii === 0 ? (item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic || "") : "",

                                                                                                    modiUnitPerDose: option?.medicine_option?.includes("dose")
                                                                                                        ? item.tmm_dosage && item.tmm_unit
                                                                                                            ? `${formatUnitPerDose(item.tmm_dosage, option?.is_dosage_decimal)} ${
                                                                                                                item.medicineUnit?.find((x) => x.tmu_id == item.tmm_unit)?.tmu_title || ""
                                                                                                            }`
                                                                                                            : `${
                                                                                                                item.medicineUnit?.find((x) => x.tmu_id == item.default_tmm_unit)?.tmu_title || ""
                                                                                                            }`
                                                                                                        : "",

                                                                                                    modiFrequency:option?.medicine_option?.includes("frequency")
                                                                                                        ?item.tmf_block === 0 || item.tmf_block === ""
                                                                                                            ? item.tcm_tmm_freq_morning || item.tcm_tmm_freq_afternoon || item.tcm_tmm_freq_evening || item.tcm_tmm_freq_night
                                                                                                                ? option?.numeric_frequency
                                                                                                                    ? `${item.tcm_tmm_freq_morning ? medicine_freq_dosage_format(item.tcm_tmm_freq_morning, option?.is_dosage_decimal) : 0} - ${item.tcm_tmm_freq_afternoon ? medicine_freq_dosage_format(item.tcm_tmm_freq_afternoon, option?.is_dosage_decimal) : 0}${
                                                                                                                        item.tcm_tmm_freq_evening ? " - " + medicine_freq_dosage_format(item.tcm_tmm_freq_evening, option?.is_dosage_decimal) : ""
                                                                                                                    } - ${item.tcm_tmm_freq_night ? medicine_freq_dosage_format(item.tcm_tmm_freq_night, option?.is_dosage_decimal) : 0}`
                                                                                                                    : formatFrequency(
                                                                                                                        item.tcm_tmm_freq_morning,
                                                                                                                        item.tcm_tmm_freq_afternoon,
                                                                                                                        item.tcm_tmm_freq_evening,
                                                                                                                        item.tcm_tmm_freq_night,
                                                                                                                        option?.is_dosage_decimal
                                                                                                                    )
                                                                                                                : ``
                                                                                                            : `(${frequencyList.find((x) => x.tmf_id === item.tmm_freq_type)?.[frequencyLang()] || ""})` : "",

                                                                                                    modiTiming: timingList.find((x) => x.tmt_id === item.tmm_time) !== undefined && timingList.find((x) => x.tmt_id === item.tmm_time)?.tmt_title !== "None" ? timingList.find((x) => x.tmt_id === item.tmm_time)?.[timeingLang()] : "",

                                                                                                    modiDuration: option?.medicine_option?.includes("duration")
                                                                                                        ? EXTRA_OPTIONS.some((x) => x.value == item.tmm_duration_type)
                                                                                                            ? durationLang(capitalize(item.tmm_duration_type, true))
                                                                                                            : isNumeric(item.tmm_days)
                                                                                                                ? `${item.tmm_days} ${durationLang(item.tmm_duration_type)}`
                                                                                                                : "-"
                                                                                                        : "",

                                                                                                    modiDisplayQty: option?.medicine_option?.includes("quantity") ? (item.display_qty ? `${item.display_qty} qty` : "") : ""
                                                                                                }).filter(([_, v]) => v) // Remove empty values
                                                                                            )
                                                                                        )
                                                                                    ].filter(Boolean).join(", ")} 

                                                                                    {/* Add tmm_remarks with a different font inside parentheses */}
                                                                                    {option?.medicine_option?.includes("note") && item.tmm_remarks ? (  
                                                                                        <>
                                                                                            {", "}
                                                                                            <Text style={{
                                                                                                fontFamily: getIndianLanguageFont(item.tmm_remarks, printSettings?.page_format?.font_family),
                                                                                                fontWeight: 400,
                                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                            }}>
                                                                                                {item.tmm_remarks}
                                                                                            </Text>
                                                                                        </>
                                                                                    ) : null})

                                                                                    {innerMedication(pItem.index)?.length - 1 === ii && medicationData?.length - 1 !== i ? "," : ""}
                                                                                    &nbsp;
                                                                                </Text>
                                                                        </Text>
                                                                    )
                                                                })}
                                                            </Text>
                                                        )
                                                    })}
                                                </Text>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medication (Rx):&nbsp;</Text>
                                                    {medicationData?.map((pItem, i) => {
                                                        return (
                                                            <Text key={i} style={{ marginTop: PX_TO_PT * 5, lineHeight: 1.4 }}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{pItem.tmm_medicine_name || pItem.name || pItem.groundedMedicineName || pItem.groundingMedicineName || ''}&nbsp;</Text>
                                                                {innerMedication(pItem.index).map((item, ii) => {
                                                                    return (
                                                                        <Text key={ii}>
                                                                            {ii !== 0 && (
                                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{'then'}&nbsp;</Text>
                                                                            )}
                                                                            <Text style={{ 
                                                                                    color: '#171725', 
                                                                                    fontFamily: getFont(), 
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                    fontWeight: 400 
                                                                                }}>
                                                                                    ({[
                                                                                        ...Object.values(
                                                                                            Object.fromEntries(
                                                                                                Object.entries({
                                                                                                    modiGeneric: option?.medicine_with_generic && ii === 0 ? (item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic || "") : "",

                                                                                                    modiUnitPerDose: option?.medicine_option?.includes("dose")
                                                                                                        ? item.tmm_dosage && item.tmm_unit
                                                                                                            ? `${formatUnitPerDose(item.tmm_dosage, option?.is_dosage_decimal)} ${
                                                                                                                item.medicineUnit?.find((x) => x.tmu_id == item.tmm_unit)?.tmu_title || ""
                                                                                                            }`
                                                                                                            : `${
                                                                                                                item.medicineUnit?.find((x) => x.tmu_id == item.default_tmm_unit)?.tmu_title || ""
                                                                                                            }`
                                                                                                        : "",

                                                                                                    modiFrequency:option?.medicine_option?.includes("frequency")
                                                                                                        ?item.tmf_block === 0 || item.tmf_block === ""
                                                                                                            ? item.tcm_tmm_freq_morning || item.tcm_tmm_freq_afternoon || item.tcm_tmm_freq_evening || item.tcm_tmm_freq_night
                                                                                                                ? option?.numeric_frequency
                                                                                                                    ? `${item.tcm_tmm_freq_morning ? medicine_freq_dosage_format(item.tcm_tmm_freq_morning, option?.is_dosage_decimal) : 0} - ${item.tcm_tmm_freq_afternoon ? medicine_freq_dosage_format(item.tcm_tmm_freq_afternoon, option?.is_dosage_decimal) : 0}${
                                                                                                                        item.tcm_tmm_freq_evening ? " - " + medicine_freq_dosage_format(item.tcm_tmm_freq_evening, option?.is_dosage_decimal) : ""
                                                                                                                    } - ${item.tcm_tmm_freq_night ? medicine_freq_dosage_format(item.tcm_tmm_freq_night, option?.is_dosage_decimal) : 0}`
                                                                                                                    : formatFrequency(
                                                                                                                        item.tcm_tmm_freq_morning,
                                                                                                                        item.tcm_tmm_freq_afternoon,
                                                                                                                        item.tcm_tmm_freq_evening,
                                                                                                                        item.tcm_tmm_freq_night
                                                                                                                    )
                                                                                                                : ``
                                                                                                            : `(${frequencyList.find((x) => x.tmf_id === item.tmm_freq_type)?.[frequencyLang()] || ""})` : "",

                                                                                                    modiTiming: timingList.find((x) => x.tmt_id === item.tmm_time) !== undefined && timingList.find((x) => x.tmt_id === item.tmm_time)?.tmt_title !== "None" ? timingList.find((x) => x.tmt_id === item.tmm_time)?.[timeingLang()] : "",

                                                                                                    modiDuration: option?.medicine_option?.includes("duration")
                                                                                                        ? EXTRA_OPTIONS.some((x) => x.value == item.tmm_duration_type)
                                                                                                            ? durationLang(capitalize(item.tmm_duration_type, true))
                                                                                                            : isNumeric(item.tmm_days)
                                                                                                                ? `${item.tmm_days} ${durationLang(item.tmm_duration_type)}`
                                                                                                                : "-"
                                                                                                        : "",

                                                                                                    modiDisplayQty: option?.medicine_option?.includes("quantity") ? (item.display_qty ? `${item.display_qty} qty` : "") : ""
                                                                                                }).filter(([_, v]) => v) // Remove empty values
                                                                                            )
                                                                                        )
                                                                                    ].filter(Boolean).join(", ")} 

                                                                                    {/* Add tmm_remarks with a different font inside parentheses */}
                                                                                    {option?.medicine_option?.includes("note") && item.tmm_remarks ? (  
                                                                                        <>
                                                                                            {", "}
                                                                                            <Text style={{
                                                                                                fontFamily: getIndianLanguageFont(item.tmm_remarks, printSettings?.page_format?.font_family),
                                                                                                fontWeight: 400,
                                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                            }}>
                                                                                                {item.tmm_remarks}
                                                                                            </Text>
                                                                                        </>
                                                                                    ) : null})

                                                                                    {innerMedication(pItem.index)?.length - 1 === ii && medicationData?.length - 1 !== i ? "," : ""}
                                                                                    &nbsp;
                                                                                </Text>
                                                                        </Text>
                                                                    )
                                                                })}
                                                            </Text>
                                                        )
                                                    })}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Medication (Rx):&nbsp;</Text>
                                                    <View style={styles.table}>
                                                        <View style={styles.headerRow} fixed>
                                                            <Text style={[styles.headerCell, { flex: 0.18, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("S.NO")}</Text>
                                                            <Text style={[styles.headerCell, { fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("MEDICINE")}</Text>
                                                            <View style={{ flex: 
                                                                option?.medicine_option?.length === 0 ?
                                                                    0.25
                                                                    : option?.medicine_option?.length === 1 ?
                                                                        0.8
                                                                        : option?.medicine_option?.length === 2 ?
                                                                            1.2
                                                                            : option?.medicine_option?.length === 3 ?
                                                                                1.4
                                                                                : 2.4
                                                            }}>
                                                                <View style={{ flexGrow: 1, flexDirection: 'row' }}>
                                                                    {option?.medicine_option?.includes('dose') && (
                                                                        <Text style={[styles.headerCell, { flex: 0.45, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("DOSE")}</Text>
                                                                    )}
                                                                    {option?.medicine_option?.includes('frequency') && (
                                                                        <Text style={[styles.headerCell, { flex: 0.6, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("FREQUENCY")}</Text>
                                                                    )}
                                                                    {option?.medicine_option?.includes('duration') && (
                                                                        <Text style={[styles.headerCell, { flex: 0.53, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("DURATION")}</Text>
                                                                    )}
                                                                    {option?.medicine_option?.includes('quantity') && (
                                                                        <Text style={[styles.headerCell, { flex: 0.18, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("QTY")}</Text>
                                                                    )}
                                                                    {option?.medicine_option?.includes('note') && (
                                                                        <Text style={[styles.headerCell, { flex: 0.7, fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{medicineHeaderLang("NOTES")}</Text>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        </View>
                                                        {medicationData?.map((pItem, i) => (
                                                            <View style={styles.row} key={i} wrap={false}>
                                                                <Text style={[styles.cell, { flex: 0.18, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{i + 1}</Text>
                                                                <View style={styles.cell}>
                                                                    <Text style={[{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{pItem.tmm_medicine_name || pItem.name || pItem.groundedMedicineName || pItem.groundingMedicineName || ''}</Text>
                                                                    {option?.medicine_with_generic && (
                                                                        <Text style={[{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: (PX_TO_PT * printSettings?.page_format?.font_size) - 2, fontWeight: 400 }]}>{pItem.tmm_generic || pItem.corrected_name || pItem.metadata?.tmm_generic || ''}</Text>
                                                                    )}
                                                                </View>
                                                                <View style={{ flex: 
                                                                    option?.medicine_option?.length === 0 ?
                                                                        0.25
                                                                        : option?.medicine_option?.length === 1 ?
                                                                            0.8
                                                                            : option?.medicine_option?.length === 2 ?
                                                                                1.2
                                                                                : option?.medicine_option?.length === 3 ?
                                                                                    1.4
                                                                                    : 2.4
                                                                }}>
                                                                    {innerMedication(pItem.index).map((item, ii) => {
                                                                        const isTapered = innerMedication(pItem.index)?.length > 1;
                                                                        const isLastItem = ii === innerMedication(pItem.index)?.length -1;
                                                                        return (
                                                                            <View style={{ flexGrow: 1, flexDirection: 'row', borderBottom: ii != innerMedication(pItem.index)?.length - 1 ? '1px solid #171725' : '0px' }} key={ii}>
                                                                                {option?.medicine_option?.includes('dose') && (
                                                                                  <>
                                                                                    <Text style={[styles.cell, { flex: 0.45, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{`${item.tmm_dosage && item.tmm_unit ? `${formatUnitPerDose(item.tmm_dosage, option?.is_dosage_decimal)} ${item?.medicineUnit && item?.medicineUnit.find((x) => x.tmu_id == item.tmm_unit) !== undefined ? item?.medicineUnit.find((x) => x.tmu_id == item.tmm_unit).tmu_title : ""}` : `${item?.medicineUnit && item?.medicineUnit.find((x) => x.tmu_id == item.default_tmm_unit) !== undefined ? item?.medicineUnit.find((x) => x.tmu_id == item.default_tmm_unit).tmu_title : ""}`}`}</Text>
                                                                                    {isTapered && !isLastItem && (
                                                                                      <ThenConnector printSettings={printSettings} />
                                                                                    )}
                                                                                  </>
                                                                                )}
                                                                                {option?.medicine_option?.includes('frequency') && (
                                                                                <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                                    {item.tmf_block === 0 || item.tmf_block === "" ? `${(item.tcm_tmm_freq_morning || item.tcm_tmm_freq_afternoon || item.tcm_tmm_freq_evening || item.tcm_tmm_freq_night) ? (option?.numeric_frequency) ? `${item.tcm_tmm_freq_morning ? medicine_freq_dosage_format(item.tcm_tmm_freq_morning, option?.is_dosage_decimal) : 0} - ${item.tcm_tmm_freq_afternoon ? medicine_freq_dosage_format(item.tcm_tmm_freq_afternoon, option?.is_dosage_decimal) : 0}${item.tcm_tmm_freq_evening ? ' - ' + medicine_freq_dosage_format(item.tcm_tmm_freq_evening, option?.is_dosage_decimal) : ''} - ${item.tcm_tmm_freq_night ? medicine_freq_dosage_format(item.tcm_tmm_freq_night, option?.is_dosage_decimal) : 0}` : formatFrequency(item.tcm_tmm_freq_morning, item.tcm_tmm_freq_afternoon,item.tcm_tmm_freq_evening,item.tcm_tmm_freq_night) : `-`}` : `(${frequencyList.find((x) => x.tmf_id === item.tmm_freq_type) !== undefined ? frequencyList.find((x) => x.tmf_id === item.tmm_freq_type)?.[frequencyLang()] : ''})`}{'\n'}{timingList.find((x) => x.tmt_id === item.tmm_time) !== undefined && timingList.find((x) => x.tmt_id === item.tmm_time)?.tmt_title !== "None" ? timingList.find((x) => x.tmt_id === item.tmm_time)?.[timeingLang()] : ''}
                                                                                </Text>
                                                                                )}
                                                                                {option?.medicine_option?.includes('duration') && (
                                                                                    <Text style={[styles.cell, { flex: 0.53, color: '#171725', fontFamily: getFont(), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                                        {EXTRA_OPTIONS.some((x) => x.value == item.tmm_duration_type) ? durationLang(capitalize(item.tmm_duration_type, true)) :
                                                                                            isNumeric(item.tmm_days) ?
                                                                                                `${item.tmm_days} ${durationLang(item.tmm_duration_type)}`
                                                                                                : '-'}
                                                                                    </Text>
                                                                                )}
                                                                                {option?.medicine_option?.includes('quantity') && (
                                                                                    <Text style={[styles.cell, { flex: 0.18, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                                        {item.display_qty ? item.display_qty : '-'}
                                                                                    </Text>
                                                                                )}
                                                                                {option?.medicine_option?.includes('note') && (
                                                                                    <Text style={[styles.cell, { flex: 0.7, color: '#171725', fontFamily: getIndianLanguageFont(item.tmm_remarks, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                                        {item.tmm_remarks ? item.tmm_remarks : '-'}&nbsp;
                                                                                    </Text>
                                                                                )}
                                                                            </View>
                                                                        )
                                                                    })}
                                                                </View>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )
                                        ) : null}
                                    </>
                                ) : option?.id === 5 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {caseManagerData.advice.length > 0 && (
                                            option?.format === 'inline' ? (
                                                <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Advices:&nbsp;</Text>
                                                    {caseManagerData.advice.map((item, i) => {
                                                        return (
                                                            <Text key={i}>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.advice_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{item.advice_name}</Text>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.advice.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                            </Text>
                                                        )
                                                    })}
                                                </Text>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Advices:&nbsp;</Text>
                                                    {caseManagerData.advice.map((item, i) => {
                                                        return (
                                                            <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.advice_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{item.advice_name}</Text>
                                                            </Text>
                                                        )
                                                    })}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Advices:&nbsp;</Text>
                                                    <View style={styles.table}>
                                                        <View style={styles.headerRow} fixed>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                                        </View>
                                                        {caseManagerData.advice.map((item, i) => (
                                                            <View style={styles.row} key={i} wrap={false}>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item.advice_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.advice_name}&nbsp;</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )
                                        )}
                                    </>
                                ) : option?.id === 6 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {caseManagerData.investigation.length > 0 && (
                                            option?.format === 'inline' ? (
                                                <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>{INVESTIGATION_TITLE}:&nbsp;</Text>
                                                    {caseManagerData.investigation.map((item, i) => {
                                                        return (
                                                            <Text key={i}>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.investigation_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.investigation_name}&nbsp;</Text>
                                                                {(item.note) ?
                                                                    <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ note }) => ({ note }))(caseManagerData.investigation[i])).filter(([_, v]) => v))).join(', ')})`}{caseManagerData.investigation.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                                    :
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.investigation.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                                }
                                                            </Text>
                                                        )
                                                    })}
                                                </Text>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>{INVESTIGATION_TITLE}:&nbsp;</Text>
                                                    {caseManagerData.investigation.map((item, i) => {
                                                        return (
                                                            <Text key={i} style={{ marginTop: PX_TO_PT * 5, lineHeight: 2 }}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.investigation_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.investigation_name}&nbsp;</Text>
                                                                {(item.since || item.severity || item.note) &&
                                                                    <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item.note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ note }) => ({ note }))(caseManagerData.investigation[i])).filter(([_, v]) => v))).join(', ')})\n`}</Text>
                                                                }
                                                            </Text>
                                                        )
                                                    })}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>{INVESTIGATION_TITLE}:&nbsp;</Text>
                                                    <View style={styles.table}>
                                                        <View style={styles.headerRow} fixed>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                                        </View>
                                                        {caseManagerData.investigation.map((item, i) => (
                                                            <View style={styles.row} key={i} wrap={false}>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item.investigation_name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.investigation_name}&nbsp;</Text>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item.note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.note ? item.note : '-'}&nbsp;</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )
                                        )}
                                    </>
                                ) : option?.id === 7 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {(caseManagerData.vitals.length > 0 || patientBirthWeight) &&  (
                                            option?.format === 'inline' ? (
                                                <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Vitals & Body Composition:&nbsp;</Text>
                                                    {patientBirthWeight && (
                                                        <>
                                                            <Text
                                                                style={{
                                                                    color: '#171725',
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 500
                                                                }}>Patient's birth weight:&nbsp;
                                                            </Text>
                                                            <Text
                                                                style={{
                                                                    color: '#171725',
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 400
                                                                }}>({patientBirthWeight}kg),&nbsp;
                                                            </Text>
                                                        </>
                                                    )}
                                                    {caseManagerData.vitals.length > 0 && caseManagerData.vitals.map((item, i) => {
                                                        const vitalsArray = [
                                                            ['temp', item.temp ? `Temp: ${item.temp}F` : ''],
                                                            ['pres', item.pres ? `Pulse: ${item.pres}/min` : ''],
                                                            ['resp_rate', item.resp_rate ? `Resp. Rate: ${item.resp_rate}/min` : ''],
                                                            ['blood_press', item.blood_press ? item.blood_press.endsWith("/") ? `BP: ${item.blood_press.substring(0, item.blood_press.length - 1)}mmHg` : `BP: ${item.blood_press}mmHg` : ''],
                                                            ['spo2', item.spo2 ? `SPO2: ${item.spo2}%` : ''],
                                                            ['general_rbs', item.general_rbs ? `General RBS: ${item.general_rbs}mg/dl` : ''],
                                                            ['fib4', item.fib4 ? `FIB4: ${item.fib4}` : ''],
                                                            ['waist_circumference', item.waist_circumference ? `Waist Circumference: ${item.waist_circumference}cms` : ''],
                                                            ['ofc', item.ofc ? `OFC: ${item.ofc}cms` : ''],
                                                            ['height', item.height ? `Height: ${item.height}cms` : ''],
                                                            ['weight', item.weight ? `Weight: ${item.weight}kgs` : ''],
                                                            ['bmi', item.bmi && (option?.vitals_option === undefined || option?.vitals_option?.includes('bmi')) ? `BMI: ${parseFloat(item.bmi).toFixed(2)}kg/m²` : ''],
                                                            ['bmr', item.bmr && (option?.vitals_option === undefined || option?.vitals_option?.includes('bmr')) ? `BMR: ${parseFloat(item.bmr).toFixed(2)}kcals` : ''],
                                                            ['bsa', item.bsa && (option?.vitals_option === undefined || option?.vitals_option?.includes('bsa')) ? `BSA: ${parseFloat(item.bsa).toFixed(2)}m²` : ''],
                                                        ];
                                                        const priorityOrder = ['weight', 'height', 'ofc'];
                                                        const orderedVitals = isPediatricAccessable
                                                            ? [
                                                                ...priorityOrder
                                                                    .map((key) => vitalsArray.find(([k]) => k === key))
                                                                    .filter(Boolean),
                                                                ...vitalsArray.filter(([key]) => !priorityOrder.includes(key)),
                                                            ]
                                                            : vitalsArray;
                                                        const vitalsText = orderedVitals
                                                            .map(([, value]) => value)
                                                            .filter(Boolean)
                                                            .join(', ');
                                                        return (
                                                            <Text key={i}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{moment(item.date).format('DD/MM/YYYY')}&nbsp;</Text>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                    {`- ${vitalsText}`}{caseManagerData.vitals.length - 1 != i ? ',' : ''}&nbsp;
                                                                </Text>
                                                            </Text>
                                                        )
                                                    })}
                                                </Text>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>
                                                        Vitals & Body Composition:&nbsp;

                                                        {patientBirthWeight && (
                                                            <>
                                                                <Text
                                                                    style={{
                                                                        color: '#171725',
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500
                                                                    }}>Patient's birth weight:&nbsp;
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: '#171725',
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 400
                                                                    }}>({patientBirthWeight}kg)
                                                                </Text>
                                                            </>
                                                        )}
                                                    </Text>
                                                    {caseManagerData.vitals.length > 0 && caseManagerData.vitals.map((item, i) => {
                                                        const vitalsEntries = Object.entries(
                                                            (({
                                                                temp,
                                                                pres,
                                                                resp_rate,
                                                                blood_press,
                                                                spo2,
                                                                height,
                                                                weight,
                                                                fib4,
                                                                waist_circumference,
                                                                bmi,
                                                                bmr,
                                                                bsa,
                                                                ofc,
                                                                general_rbs
                                                            }) => ({
                                                                temp: temp ? `Temp: ${temp}F` : '',
                                                                pres: pres ? `Pulse: ${pres}/min` : '',
                                                                resp_rate: resp_rate ? `Resp. Rate: ${resp_rate}/min` : '',
                                                                blood_press: blood_press
                                                                    ? blood_press.endsWith("/")
                                                                        ? `BP: ${blood_press?.substring(0, blood_press.length - 1)}mmHg`
                                                                        : `BP: ${blood_press}mmHg`
                                                                    : '',
                                                                spo2: spo2 ? `SPO2: ${spo2}%` : '',
                                                                general_rbs: general_rbs ? `General RBS: ${general_rbs}mg/dl` : '',
                                                                fib4: fib4 ? `FIB4: ${fib4}` : '',
                                                                waist_circumference: waist_circumference ? `Waist Circumference : ${waist_circumference}cms` : '',
                                                                ofc: ofc ? `OFC: ${ofc}cms` : '',
                                                                height: height ? `Height: ${height}cms` : '',
                                                                weight: weight ? `Weight: ${weight}kgs` : '',
                                                                bmi: bmi && (option?.vitals_option === undefined || option?.vitals_option?.includes('bmi')) ? `BMI: ${parseFloat(bmi).toFixed(2)}kg/m²` : '',
                                                                bmr: bmr && (option?.vitals_option === undefined || option?.vitals_option?.includes('bmr')) ? `BMR: ${parseFloat(bmr).toFixed(2)}kcals` : '',
                                                                bsa: bsa && (option?.vitals_option === undefined || option?.vitals_option?.includes('bsa')) ? `BSA: ${parseFloat(bsa).toFixed(2)}m²` : '',
                                                            }))(item)
                                                        ).filter(([_, value]) => value);

                                                        const priorityKeys = ['weight', 'height', 'ofc'];
                                                        const orderedEntries = isPediatricAccessable
                                                            ? [
                                                                ...priorityKeys.map((key) => vitalsEntries.find(([k]) => k === key)).filter(Boolean),
                                                                ...vitalsEntries.filter(([key]) => !priorityKeys.includes(key)),
                                                            ]
                                                            : vitalsEntries;

                                                        const vitalsText = orderedEntries.map(([, value]) => value).join(', ');

                                                        return (
                                                            <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{moment(item.date).format('DD/MM/YYYY')}&nbsp;</Text>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                    {`- ${vitalsText}\n`}
                                                                </Text>
                                                            </Text>
                                                        )
                                                    })}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>
                                                        Vitals & Body Composition:&nbsp;

                                                        {patientBirthWeight && (
                                                            <>
                                                                <Text
                                                                    style={{
                                                                        color: '#171725',
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500
                                                                    }}>Patient's birth weight:&nbsp;
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: '#171725',
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 400
                                                                    }}>({patientBirthWeight}kg)
                                                                </Text>
                                                            </>
                                                        )}
                                                    </Text>
                                                    {caseManagerData.vitals.length > 0 && (<View style={styles.table}>
                                                        <View style={styles.headerRow} fixed>
                                                            {columns.map((item, i) => {
                                                                return (
                                                                    <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{item.title}</Text>
                                                                )
                                                            })}
                                                        </View>
                                                        {initialRows.map((item, i) => {
                                                            const requiredNames = ['BMI (kg/m²)', 'BMR (kcals)', 'BSA (m²)'];
                                                            
                                                            if (requiredNames.includes(item?.name)) {
                                                                const nameToVitalsKey = {
                                                                    'BMI (kg/m²)': 'bmi',
                                                                    'BMR (kcals)': 'bmr',
                                                                    'BSA (m²)': 'bsa'
                                                                };
                                                                const vitalsKey = nameToVitalsKey[item?.name];
                                                                // Only filter if vitals_option is defined, if undefined show all
                                                                if (option?.vitals_option !== undefined && (!vitalsKey || !option?.vitals_option?.includes(vitalsKey))) {
                                                                    return null;
                                                                }
                                                            }
                                                            
                                                            return (
                                                                (item['0'] != '-' || (item.hasOwnProperty('1') && item['1'] != '-') || (item.hasOwnProperty('2') && item['2'] != '-')) && (
                                                                    <View style={styles.row} key={i} wrap={false}>
                                                                        <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.name}</Text>
                                                                        <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item['0']}</Text>
                                                                        {item.hasOwnProperty('1') && (
                                                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item['1']}</Text>
                                                                        )}
                                                                        {item.hasOwnProperty('2') && (
                                                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item['2']}</Text>
                                                                        )}
                                                                    </View>
                                                                )
                                                            )
                                                        })}
                                                    </View>)}
                                                </View>
                                            )
                                        )}
                                    </>
                                ) : option?.id === 8 && option?.enable === 'Y' && option?.custom_status === 'Y' && option?.medical_history_option?.length > 0 ? (
                                    <>
                                        {caseManagerData.medical_history.length > 0 && (
                                            option?.format === 'inline' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medical History:</Text>
                                                    {(() => {
                                                        const grouped = {};
                                                        if (caseManagerData?.medical_history && Array.isArray(caseManagerData.medical_history)) {
                                                            caseManagerData.medical_history.forEach(item => {
                                                                if (item && option?.medical_history_option?.includes(item.tmmhs_id)) {
                                                                    if (!grouped[item.title]) {
                                                                        grouped[item.title] = [];
                                                                    }
                                                                    if (item?.tags?.length > 0 && !item?.no_know_history) {
                                                                        item.tags.forEach(tag => {
                                                                            if (tag && tag.enable === 'Y') {
                                                                                let conditionName = tag.title || '';
                                                                                let details = '';
                                                                                let hasDetails = false;
                                                                                if (tag.since && item.tmmhs_id !== 5) {
                                                                                    details += ` (Since: ${tag.since}`;
                                                                                    hasDetails = true;
                                                                                }
                                                                                if (tag.date && item.tmmhs_id === 5 && typeof tag.date === 'string' && tag.date.trim()) {
                                                                                    details += ` (${tag.date}`;
                                                                                    hasDetails = true;
                                                                                }
                                                                                if (item.tmmhs_id !== 3 && item.tmmhs_id !== 5 && tag.status) {
                                                                                    details += hasDetails ? ` | Status: ${tag.status}` : ` (Status: ${tag.status}`;
                                                                                    hasDetails = true;
                                                                                }
                                                                                if (item.tmmhs_id !== 3 && item.tmmhs_id !== 5 && tag.medication) {
                                                                                    details += hasDetails ? ` | Medication: ${tag.medication}` : ` (Medication: ${tag.medication}`;
                                                                                    hasDetails = true;
                                                                                }
                                                                                if (item.tmmhs_id === 3 && tag.relationship) {
                                                                                    details += hasDetails ? ` | Relative: ${tag.relationship}` : ` (Relative: ${tag.relationship}`;
                                                                                    hasDetails = true;
                                                                                }
                                                                                if (tag.note && item.tmmhs_id !== 5) {
                                                                                    details += hasDetails ? ` | ${tag.note}` : ` (${tag.note}`;
                                                                                    hasDetails = true;
                                                                                }
                                                                                if (tag.note && item.tmmhs_id === 5) {
                                                                                    details += hasDetails ? ` | Remarks: ${tag.note}` : ` (Remarks: ${tag.note}`;
                                                                                    hasDetails = true;
                                                                                }
                                                                                if (hasDetails) {
                                                                                    details += `)`;
                                                                                }
                                                                                grouped[item.title].push({ conditionName, details, hasDetails });
                                                                            }
                                                                        });
                                                                    } else if (item?.no_know_history) {
                                                                        grouped[item.title].push({ conditionName: 'No known history', details: '', hasDetails: false });
                                                                    }
                                                                }
                                                            });
                                                        }
                                                        return Object.keys(grouped).map(category => 
                                                            grouped[category]?.length > 0 ? (
                                                                <Text key={category} style={{ marginTop: PX_TO_PT * 8, lineHeight: 1.4 }}>
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                        {category}:
                                                                    </Text>
                                                                    {grouped[category].map((item, index) => (
                                                                        <Text key={index} style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                            {index > 0 ? ', ' : ' '}
                                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                {item.conditionName}
                                                                            </Text>
                                                                            {item.details}
                                                                        </Text>
                                                                    ))}
                                                                </Text>
                                                            ) : null
                                                        );
                                                    })()}
                                                    {caseManagerData?.medical_history?.[0]?.medical_history_remarks && (
                                                        <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, marginTop: PX_TO_PT * 8 }}>
                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{'\n'}Additional History: </Text>
                                                            <Text style={{ color: '#454551', fontFamily: getIndianLanguageFont(caseManagerData?.medical_history?.[0]?.medical_history_remarks, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                ({caseManagerData?.medical_history?.[0]?.medical_history_remarks})
                                                            </Text>
                                                        </Text>
                                                    )}
                                                </View>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medical History:&nbsp;</Text>
                                                    {caseManagerData.medical_history.map((item, i) => {
                                                        let abcd = 97
                                                        return (
                                                            option?.medical_history_option?.includes(item.tmmhs_id) && item?.tags?.length > 0 && (
                                                                <Text key={i} style={{ marginTop: (item?.no_know_history || item?.tags?.length > 0) ? PX_TO_PT * 6 : 0, lineHeight: 1.4 }}>
                                                                    {!item?.no_know_history ? (
                                                                        item?.tags?.length > 0 && (
                                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, lineHeight: 1.4 }}>&nbsp;{medicalHistoryIndex++}. {item.title}&nbsp;:</Text>
                                                                                {item.tags.map((item1, i1) => {
                                                                                    return (
                                                                                        <>
                                                                                            {item1.enable == 'Y' ? (
                                                                                                <>
                                                                                                    <Text key={i1} style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{'\n'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{String.fromCharCode(abcd++)}.&nbsp;{item1.title}&nbsp;</Text>
                                                                                                    {((item1.since && item.tmmhs_id !== 5) || (item1.date && item.tmmhs_id === 5) || item1.status || item1.medication || item1.relationship || item1.note) &&
                                                                                                        <Text key={i1} style={{ lineHeight: 1.4, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                                            {`(${Object.values(Object.fromEntries(Object.entries((
                                                                                                                ({
                                                                                                                    since,
                                                                                                                    date,
                                                                                                                    status,
                                                                                                                    medication,
                                                                                                                    relationship,
                                                                                                                    note
                                                                                                                }) => ({
                                                                                                                    since: (item.tmmhs_id === 5 && date) ? `${date}` : (since ? `Since : ${since}` : null),
                                                                                                                    status: status && item.tmmhs_id !== 5 && `Status : ${status}`,
                                                                                                                    medication: medication && item.tmmhs_id !== 5 && `Medication : ${medication}`,
                                                                                                                    relationship: relationship && `Relative : ${relationship}`,
                                                                                                                    note: note && (item.tmmhs_id === 5 ? `Remarks : ${note}` : `${note}`),
                                                                                                                })
                                                                                                            )(item1)).filter(([_, v]) => v))).join(' | ')})`}
                                                                                                        </Text>
                                                                                                    }
                                                                                                </>
                                                                                            ) : (
                                                                                                <Text key={i1} style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{'\n'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{String.fromCharCode(abcd++)}.&nbsp;{`No ${item1.title}`}&nbsp;</Text>
                                                                                            )}
                                                                                        </>
                                                                                    )
                                                                                })}
                                                                                {'\n'}</Text>
                                                                        )
                                                                    ) : (
                                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{medicalHistoryIndex++}. {item.title}&nbsp;:
                                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{'\n'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{String.fromCharCode(abcd++)}.&nbsp;No known history&nbsp;</Text>
                                                                        </Text>
                                                                    )}
                                                                </Text>
                                                            )
                                                        )
                                                    })}
                                                    {caseManagerData?.medical_history?.[0]?.medical_history_remarks && (
                                                        <>
                                                            <Text
                                                                style={{
                                                                    color: '#454551',
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color: '#171725',
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    {'\n'}&nbsp;{medicalHistoryIndex++}. {`Additional History`}&nbsp;:
                                                                </Text>
                                                                {'\n'}
                                                            </Text>
                                                            <Text
                                                                style={{
                                                                    color: '#454551',
                                                                    fontFamily: getIndianLanguageFont(caseManagerData?.medical_history?.[0]?.medical_history_remarks, printSettings?.page_format?.font_family),
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 500,
                                                                    marginLeft: PX_TO_PT * 15,
                                                                    marginTop: PX_TO_PT * 2
                                                                }}
                                                            >
                                                                {caseManagerData?.medical_history?.[0]?.medical_history_remarks}
                                                            </Text>
                                                        </>
                                                    )}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medical History:&nbsp;</Text>
                                                    {caseManagerData.medical_history.map((item, i) => {
                                                        return (
                                                            option?.medical_history_option?.includes(item.tmmhs_id) && (
                                                                (item?.no_know_history || item?.tags?.length > 0) && (
                                                                    <>
                                                                        <Text style={{ color: '#000', marginTop: i === 0 ? PX_TO_PT * 4 : PX_TO_PT * 12, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, padding: 6, borderTop: '1px solid #171725', borderLeft: '1px solid #171725', borderRight: '1px solid #171725', backgroundColor: '#E2E2EA', lineHeight: 2 }}>{`${item.title} : `}</Text>
                                                                        {!item?.no_know_history ? (
                                                                            <View key={i} style={[styles.table, { marginTop: 0 }]}>
                                                                                <View style={styles.headerRow} fixed>
                                                                                    <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000', lineHeight: 2 }]}>NAME</Text>
                                                                                    {item?.tmmhs_id != 3 && item?.tmmhs_id != 5 && (
                                                                                        <>
                                                                                            <Text style={[styles.headerCell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000', lineHeight: 2 }]}>SINCE</Text>
                                                                                            <Text style={[styles.headerCell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000', lineHeight: 2 }]}>STATUS</Text>
                                                                                            {item?.tmmhs_id == 2 && (
                                                                                                <Text style={[styles.headerCell, { flex: 0.25, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000', lineHeight: 2 }]}>MEDICATION</Text>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                    {item?.tmmhs_id === 5 && (
                                                                                        <Text style={[styles.headerCell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000', lineHeight: 2 }]}>DATE</Text>
                                                                                    )}
                                                                                    {item?.tmmhs_id === 3 && (
                                                                                        <Text style={[styles.headerCell, { flex: 0.4, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000', lineHeight: 2 }]}>RELATIVE</Text>
                                                                                    )}
                                                                                    <Text style={[styles.headerCell, { flex: 0.5, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000', lineHeight: 2 }]}>{item?.tmmhs_id === 5 ? 'REMARKS' : 'NOTE'}</Text>
                                                                                </View>
                                                                                {item?.tags?.filter(x => x.enable == 'Y')?.map((item1, i1) => {
                                                                                    return (
                                                                                        <View style={styles.row} key={i1} wrap={false}>
                                                                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, lineHeight: 2 }]}>{item1.title}</Text>
                                                                                            {item?.tmmhs_id != 3 && item?.tmmhs_id != 5 && (
                                                                                                <>
                                                                                                    <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, lineHeight: 2 }]}>{item1.since ? item1.since : '-'}</Text>
                                                                                                    <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, lineHeight: 2 }]}>{item1.status ? item1.status : '-'}</Text>
                                                                                                    {item?.tmmhs_id == 2 && (
                                                                                                        <Text style={[styles.cell, { flex: 0.25, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, lineHeight: 2 }]}>{item1.medication ? item1.medication : '-'}</Text>
                                                                                                    )}
                                                                                                </>
                                                                                            )}
                                                                                            {item?.tmmhs_id === 5 && (
                                                                                                <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, lineHeight: 2 }]}>{item1.date || '-'}</Text>
                                                                                            )}
                                                                                            {item?.tmmhs_id === 3 && (
                                                                                                <Text style={[styles.cell, { flex: 0.4, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, lineHeight: 2 }]}>{item1.relationship ? item1.relationship : '-'}</Text>
                                                                                            )}
                                                                                            <Text style={[styles.cell, { flex: 0.5, color: '#171725', fontFamily: getIndianLanguageFont(item1?.note, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, lineHeight: 2 }]}>{item1.note ? item1.note : '-'}&nbsp;</Text>
                                                                                        </View>
                                                                                    )
                                                                                })}
                                                                                {item?.tags?.filter(x => x.enable == 'N')?.map((item1, i1) => {
                                                                                    return (
                                                                                        <View style={styles.row} key={i1}>
                                                                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, lineHeight: 2 }]}>{`No ${item1.title}`}</Text>
                                                                                        </View>
                                                                                    )
                                                                                })}
                                                                            </View>
                                                                        ) : (
                                                                            <Text style={{ color: '#000', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, padding: 6, border: 1, borderStyle: 'solid', borderColor: '#171725', lineHeight: 2 }}>{`No known history`}</Text>

                                                                        )}
                                                                    </>
                                                                )
                                                            )
                                                        )
                                                    })}
                                                    {caseManagerData?.medical_history?.[0]?.medical_history_remarks &&
                                                        <View style={styles.table}>
                                                            <View style={styles.headerRow} fixed>
                                                                <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000', backgroundColor: '#E2E2EA', lineHeight: 2 }]}>Additional History :</Text>
                                                            </View>

                                                            <View style={styles.row} wrap={false}>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(caseManagerData?.medical_history?.[0]?.medical_history_remarks, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, lineHeight: 2 }]}>{caseManagerData?.medical_history?.[0]?.medical_history_remarks}&nbsp;</Text>
                                                            </View>
                                                        </View>
                                                    }
                                                </View>
                                            )
                                        )}
                                    </>
                                ) : option?.id === 9 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {caseManagerData.follow_up_date && (
                                            option?.format === 'inline' ? (
                                                    <Text style={{ marginTop: PX_TO_PT * 15 }}>
                                                        <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Follow-up:&nbsp;</Text>
                                                        <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(caseManagerData.follow_up_date, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{option?.followup_dateformat ? moment(caseManagerData.follow_up_date).format('DD/MM/YYYY') : onCalFollowUp(moment(caseManagerData.follow_up_date).format('YYYY-MM-DD'), moment(caseManagerData?.patient_data?.patient_consultaion_date).format('YYYY-MM-DD'))}</Text>
                                                    </Text>
                                            ) : option?.format === 'listview' ? (
                                                    <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                        <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Follow-up:&nbsp;</Text>
                                                        <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(caseManagerData.follow_up_date, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, marginTop: PX_TO_PT * 4 }}>{option?.followup_dateformat ? moment(caseManagerData.follow_up_date).format('DD/MM/YYYY') : onCalFollowUp(moment(caseManagerData.follow_up_date).format('YYYY-MM-DD'), moment(caseManagerData?.patient_data?.patient_consultaion_date).format('YYYY-MM-DD'))}</Text>
                                                    </View>
                                            ) : (
                                                    <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                        <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Follow-up:&nbsp;</Text>
                                                        <View style={styles.table}>
                                                            <Text style={{border: '1px solid #171725', padding: 6, color: '#171725', fontFamily: getIndianLanguageFont(caseManagerData.follow_up_date, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{option?.followup_dateformat ? moment(caseManagerData.follow_up_date).format('DD/MM/YYYY') : onCalFollowUp(moment(caseManagerData.follow_up_date).format('YYYY-MM-DD'), moment(caseManagerData?.patient_data?.patient_consultaion_date).format('YYYY-MM-DD'))}</Text>
                                                        </View>
                                                    </View>
                                            )
                                        )}
                                    </>
                                ) : option?.id === 91 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {caseManagerData.visit_advice && (
                                            option?.format === 'inline' ? (
                                                <Text style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Notes:&nbsp;</Text>
                                                    <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(caseManagerData.visit_advice, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.visit_advice}</Text>
                                                </Text>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Notes:&nbsp;</Text>
                                                    <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(caseManagerData.visit_advice, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, marginTop: PX_TO_PT * 4 }}>{caseManagerData.visit_advice}</Text>
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Notes:&nbsp;</Text>
                                                    <View style={styles.table}>
                                                        <Text style={{border: '1px solid #171725', padding: 6, color: '#171725', fontFamily: getIndianLanguageFont(caseManagerData.visit_advice, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.visit_advice}</Text>
                                                    </View>
                                                </View>
                                            )
                                        )}
                                        {Array.isArray(caseManagerData?.others) && caseManagerData.others.length > 0 && (
                                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Others:&nbsp;{'\n'}</Text>
                                                {caseManagerData.others.map((item, i) => (
                                                    <Text key={i} style={{ marginTop: PX_TO_PT * 4, color: '#171725', fontFamily: getIndianLanguageFont(typeof item === 'string' ? item : (item?.text ?? item?.name ?? ''), printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                        {i + 1}. {typeof item === 'string' ? item : (item?.text ?? item?.name ?? '')}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                ) : option?.id === 10 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        <>
                                            {(transformGivenVaccines?.length > 0 || todayVaccines?.due?.length > 0 || prescriptionVaccines?.length > 0) && (
                                                option?.format === 'inline' ? (
                                                    <>
                                                        {transformGivenVaccines?.length > 0 && <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                            <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Given Vaccines :&nbsp;{'\n'}</Text>
                                                            {transformGivenVaccines?.map((item, i) => {
                                                                return (
                                                                    <Text key={i} style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
                                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item?.tvac_name}&nbsp;</Text>
                                                                        <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {`(Given Date : `}
                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {item?.tvp_given_date ? moment(item?.tvp_given_date).format("DD MMM YYYY") : '-'}
                                                                            </Text>
                                                                        </Text>
                                                                        {item?.tvc_name && <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {` | Brand : `}
                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {item?.tvc_name}
                                                                            </Text>
                                                                        </Text>}
                                                                        {item?.tvpv_site && <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {` | Site : `}
                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {item?.tvpv_site}
                                                                            </Text>
                                                                        </Text>}
                                                                        {item?.tvp_remarks &&
                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                {` | Note : `}
                                                                                <Text style={{ color: '#454551', fontFamily: getIndianLanguageFont(item?.tvp_remarks, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                    {item?.tvp_remarks}
                                                                                </Text>
                                                                            </Text>}
                                                                        <Text key={i} style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{')'}{i !== transformGivenVaccines?.length - 1 ? ', ' : ''}</Text>
                                                                    </Text>
                                                                )
                                                            })}
                                                        </Text>}
                                                        {todayVaccines?.due?.length > 0 && <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                            <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Due Vaccines :&nbsp;{'\n'}</Text>
                                                            {todayVaccines?.due?.map((item, i) => {
                                                                return (
                                                                    <Text key={i} style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
                                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item?.tvac_name}&nbsp;</Text>
                                                                        <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {`(Updated Due Date : `}
                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {item?.tvd_due_date ? moment(item?.tvd_due_date).format("DD MMM YYYY") : '-'}
                                                                            </Text>
                                                                        </Text>
                                                                        {item?.tvd_remarks &&
                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                {` | Note : `}
                                                                                <Text style={{ color: '#454551', fontFamily: getIndianLanguageFont(item?.tvd_remarks, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                    {item?.tvd_remarks}
                                                                                </Text>
                                                                            </Text>}
                                                                        <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{')'}{i !== todayVaccines?.due?.length - 1 ? ', ' : ''}</Text>
                                                                    </Text>
                                                                )
                                                            })}
                                                        </Text>}
                                                        {prescriptionVaccines?.length > 0 && <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                            <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Vaccination :&nbsp;{'\n'}</Text>
                                                            {prescriptionVaccines?.map((item, i) => (
                                                                <Text key={i} style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item?.name || item?.lineItem || '-'}&nbsp;</Text>
                                                                    {(item?.schedule || item?.brand || item?.notes) && (
                                                                        <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {[item?.schedule && `Schedule : ${item.schedule}`, item?.brand && `Brand : ${item.brand}`, item?.notes && `Note : ${item.notes}`].filter(Boolean).join(' | ')}
                                                                        </Text>
                                                                    )}
                                                                    <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{i !== prescriptionVaccines?.length - 1 ? ', ' : ''}</Text>
                                                                </Text>
                                                            ))}
                                                        </Text>}
                                                    </>
                                                ) : option?.format === 'listview' ? (
                                                    <>
                                                        {transformGivenVaccines?.length && <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                            <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Given Vaccines :&nbsp;{'\n'}</Text>
                                                            {transformGivenVaccines?.map((item, i) => {
                                                                return (
                                                                    <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item?.tvac_name}&nbsp;</Text>
                                                                        <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {`(Given Date : `}
                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {item?.tvp_given_date ? moment(item?.tvp_given_date).format("DD MMM YYYY") : '-'}
                                                                            </Text>
                                                                        </Text>
                                                                        {item?.tvc_name && <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {` | Brand : `}
                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {item?.tvc_name}
                                                                            </Text>
                                                                        </Text>}
                                                                        {item?.tvpv_site && <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {` | Site : `}
                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {item?.tvpv_site}
                                                                            </Text>
                                                                        </Text>}
                                                                        {item?.tvp_remarks && <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {` | Note : `}
                                                                            <Text style={{ color: '#454551', fontFamily: getIndianLanguageFont(item?.tvp_remarks, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {item?.tvp_remarks}
                                                                            </Text>
                                                                        </Text>}
                                                                        <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{')\n'}</Text>
                                                                    </Text>
                                                                )
                                                            })}
                                                        </View>}
                                                        {todayVaccines?.due?.length && <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                            <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Due Vaccines :&nbsp;{'\n'}</Text>
                                                            {todayVaccines?.due?.map((item, i) => {
                                                                return (
                                                                    <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item?.tvac_name}&nbsp;</Text>
                                                                        <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {`(Updated Due Date : `}
                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {item?.tvd_due_date ? moment(item?.tvd_due_date).format("DD MMM YYYY") : '-'}
                                                                            </Text>
                                                                        </Text>
                                                                        {item?.tvp_remarks && <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {` | Note : `}
                                                                            <Text style={{ color: '#454551', fontFamily: getIndianLanguageFont(item?.tvd_remarks, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                {item?.tvd_remarks}
                                                                            </Text>
                                                                        </Text>}
                                                                        <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{')\n'}</Text>
                                                                    </Text>
                                                                )
                                                            })}
                                                        </View>}
                                                        {prescriptionVaccines?.length > 0 && <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                            <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Vaccination :&nbsp;{'\n'}</Text>
                                                            {prescriptionVaccines?.map((item, i) => (
                                                                <Text key={i} style={{ marginTop: PX_TO_PT * (i === 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item?.name || item?.lineItem || '-'}&nbsp;</Text>
                                                                    {(item?.schedule || item?.brand || item?.notes) && (
                                                                        <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {[item?.schedule && `Schedule : ${item.schedule}`, item?.brand && `Brand : ${item.brand}`, item?.notes && `Note : ${item.notes}`].filter(Boolean).join(' | ')}
                                                                        </Text>
                                                                    )}
                                                                </Text>
                                                            ))}
                                                        </View>}
                                                    </>
                                                ) : (
                                                    <>
                                                        {transformGivenVaccines?.length && <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                            <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Given Vaccines :&nbsp;{'\n'}</Text>
                                                            <View style={styles.table}>
                                                                <View style={styles.headerRow} fixed>
                                                                    <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                                                    <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>GIVEN DATE</Text>
                                                                    <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>BRAND</Text>
                                                                    <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>SITE</Text>
                                                                    <Text style={[styles.headerCell, { flex: 0.8, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                                                </View>
                                                                {transformGivenVaccines?.map((item, i) => (
                                                                    <View style={styles.row} key={i} wrap={false}>
                                                                        <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item?.tvac_name || '-'}
                                                                        </Text>
                                                                        <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item?.tvp_given_date ? moment(item?.tvp_given_date).format("DD MMM YYYY") : '-'}
                                                                        </Text>
                                                                        <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item?.tvc_name || '-'}
                                                                        </Text>
                                                                        <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item?.tvpv_site || '-'}
                                                                        </Text>
                                                                        <Text style={[styles.cell, { flex: 0.8, color: '#171725', fontFamily: getIndianLanguageFont(item?.tvp_remarks, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item.tvp_remarks || '-'}&nbsp;
                                                                        </Text>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        </View>}
                                                        {todayVaccines?.due?.length && <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                            <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Due Vaccines :&nbsp;{'\n'}</Text>
                                                            <View style={styles.table}>
                                                                <View style={styles.headerRow} fixed>
                                                                    <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                                                    <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>UPDATED DUE DATE</Text>
                                                                    <Text style={[styles.headerCell, { flex: 0.8, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                                                </View>
                                                                {todayVaccines?.due?.map((item, i) => (
                                                                    <View style={styles.row} key={i} wrap={false}>
                                                                        <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item?.tvac_name || '-'}
                                                                        </Text>
                                                                        <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item?.tvd_due_date ? moment(item?.tvd_due_date).format("DD MMM YYYY") : '-'}
                                                                        </Text>
                                                                        <Text style={[styles.cell, { flex: 0.8, color: '#171725', fontFamily: getIndianLanguageFont(item?.tvd_remarks, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item.tvd_remarks || '-'}&nbsp;
                                                                        </Text>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        </View>}
                                                        {prescriptionVaccines?.length > 0 && <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                            <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Vaccination :&nbsp;{'\n'}</Text>
                                                            <View style={styles.table}>
                                                                <View style={styles.headerRow} fixed>
                                                                    <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                                                    <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>SCHEDULE</Text>
                                                                    <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>BRAND</Text>
                                                                    <Text style={[styles.headerCell, { flex: 0.8, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                                                </View>
                                                                {prescriptionVaccines?.map((item, i) => (
                                                                    <View style={styles.row} key={i} wrap={false}>
                                                                        <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item?.name || item?.lineItem || '-'}
                                                                        </Text>
                                                                        <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item?.schedule || '-'}
                                                                        </Text>
                                                                        <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item?.brand || '-'}
                                                                        </Text>
                                                                        <Text style={[styles.cell, { flex: 0.8, color: '#171725', fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                            {item?.notes || '-'}&nbsp;
                                                                        </Text>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        </View>}
                                                    </>
                                                )
                                            )}
                                        </>
                                    </>
                                ) : option?.id === 11 &&
                                    ((option?.enable === 'Y' && option?.custom_status === 'Y') ||
                                        hasBlankSmartSyncCanvas) ? (
                                    <>
                                        {isSmartSyncPrescription &&
                                            caseManagerData?.isCustomSSRX === "0" &&
                                            !isSnapRxWrittenPrescription &&
                                            !hasBlankSmartSyncCanvas &&
                                            smartRxData?.map((item, i) => {
                                                const writtenRxSrc = getSmartSyncUploadedFileUri(item);
                                                if (!writtenRxSrc) {
                                                    return null;
                                                }
                                                return (
                                                    <View key={i}>
                                                        <View style={{ marginTop: PX_TO_PT * 15, width: '100%', height: 800 }}>
                                                            <Image
                                                                style={{ width: '100%', height: '100%' }}
                                                                src={writtenRxSrc}
                                                                objectFit="contain"
                                                            />
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                    </>
                                ) : option?.id === 12 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {growthChartData?.length > 0 && Object.keys(growthChartImageData)?.length > 0 && todayGrowthChartData?.length > 0 && (
                                            option?.format === 'table' ? (
                                                <>
                                                    <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                        <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Growth Chart &nbsp;{'\n'}</Text>
                                                        <View style={styles.table}>
                                                            <View style={styles.headerRow} fixed>
                                                                <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>Parameters</Text>
                                                                {option?.growth_chart_option?.includes('height') && <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>Height</Text>}
                                                                {option?.growth_chart_option?.includes('weight') && <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>Weight</Text>}
                                                                {option?.growth_chart_option?.includes('fib4') && <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>FIB4</Text>}
                                                                {option?.growth_chart_option?.includes('waist_circumference') && <Text style={[styles.headerCell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>Waist Circumference</Text>}
                                                                {option?.growth_chart_option?.includes('bmi') && <Text style={[styles.headerCell, { flex: 0.8, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>BMI</Text>}
                                                                {option?.growth_chart_option?.includes('ofc') && <Text style={[styles.headerCell, { flex: 0.8, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>OFC</Text>}
                                                            </View>
                                                            {growthChartData?.map((item, i) => (
                                                                <View style={styles.row} key={i} wrap={false}>
                                                                    <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                        {item?.tcbc_created_date ? moment(item?.tcbc_created_date).format("DD MMM YYYY") : ''}
                                                                    </Text>
                                                                    {option?.growth_chart_option?.includes('height') && <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                        {item?.height ? `${item?.height} cms` : ''}
                                                                    </Text>}
                                                                    {option?.growth_chart_option?.includes('weight') && <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                        {item?.weight ? `${item?.weight} kgs` : ''}
                                                                    </Text>}
                                                                    {option?.growth_chart_option?.includes('fib4') && <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                        {item?.fib4 ? `${item?.fib4} ` : ''}
                                                                    </Text>}
                                                                    {option?.growth_chart_option?.includes('waist_circumference') && <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                        {item?.waist_circumference ? `${item?.waist_circumference} cms` : ''}
                                                                    </Text>}
                                                                    {option?.growth_chart_option?.includes('bmi') && <Text style={[styles.cell, { flex: 0.8, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                        {item.bmi ? `${item.bmi} kg/m2` : ''}
                                                                    </Text>}
                                                                    {option?.growth_chart_option?.includes('ofc') && <Text style={[styles.cell, { flex: 0.8, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                                        {item.ofc ? `${item.ofc} cms` : ''}
                                                                    </Text>}
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>
                                                </>
                                            ) : growthChartImageChunks?.length > 0 &&
                                            <>
                                                <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginTop: PX_TO_PT * 15 }}>Growth Chart &nbsp;{'\n'}</Text>
                                                <View>
                                                    {growthChartImageChunks?.map((chunk, index) => (
                                                        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: PX_TO_PT * 15 }} key={index}>
                                                            {chunk?.filter(c => option?.growth_chart_option?.includes(c))?.map(img => (<Image key={img} style={{ width: '48%', objectFit: 'contain' }} src={growthChartImageData[img]} />))}
                                                        </View>
                                                    ))}
                                                </View>
                                            </>
                                        )}
                                    </>
                                ) : option?.id === 13 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {gynecHistoryData && isGynaecHistoryAccessable &&
                                            (option?.format === "inline" ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text
                                                        style={{
                                                            color: "#171725",
                                                            fontFamily: printSettings?.page_format?.font_family,
                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                            fontWeight: 700,
                                                        }}
                                                        fixed
                                                    >
                                                        Menstrual details&nbsp;:&nbsp;
                                                    </Text>

                                                    <Text style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
                                                        {gynecHistoryData?.lmp && (
                                                            <>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    LMP&nbsp;&nbsp;:&nbsp;
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 400,
                                                                    }}
                                                                >
                                                                    {moment(gynecHistoryData?.lmp).format("DD MMM YYYY")}
                                                                </Text>
                                                            </>
                                                        )}

                                                        {(gynecHistoryData?.cycle || gynecHistoryData?.intervalOfCycle || gynecHistoryData?.cycleNotes || gynecHistoryData?.cycleNotes) && (
                                                            <>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    Cycle&nbsp;
                                                                </Text>

                                                                {gynecHistoryData?.cycle && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            (Type&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                                textTransform: 'capitalize'
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.cycle}
                                                                        </Text>
                                                                        {(gynecHistoryData?.intervalOfCycle || gynecHistoryData?.cycleNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.intervalOfCycle && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Interval of cycle&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.intervalOfCycle}&nbsp;
                                                                            {Number(gynecHistoryData?.intervalOfCycle) > 1 ? `days` : `day`}
                                                                        </Text>
                                                                        {gynecHistoryData?.cycleNotes && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.cycleNotes && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Note&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: getIndianLanguageFont(gynecHistoryData?.cycleNotes, printSettings?.page_format?.font_family),
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.cycleNotes}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}

                                                        {(gynecHistoryData?.flow || gynecHistoryData?.durationOfMenstrualFlow || gynecHistoryData?.clots || gynecHistoryData?.numberOfPadsPerDay || gynecHistoryData?.flowNotes) && (
                                                            <>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    ),&nbsp;
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    Flow&nbsp;(
                                                                </Text>

                                                                {gynecHistoryData?.flow && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Volume&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                                textTransform: 'capitalize'
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.flow}
                                                                        </Text>
                                                                        {(gynecHistoryData?.durationOfMenstrualFlow || gynecHistoryData?.clots || gynecHistoryData?.numberOfPadsPerDay || gynecHistoryData?.flowNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.durationOfMenstrualFlow && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Duration of menstrual flow&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.durationOfMenstrualFlow}&nbsp;
                                                                            {Number(gynecHistoryData?.durationOfMenstrualFlow) > 1 ? `days` : `day`}
                                                                        </Text>
                                                                        {(gynecHistoryData?.clots || gynecHistoryData?.numberOfPadsPerDay || gynecHistoryData?.flowNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.clots && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Clots&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {Boolean(gynecHistoryData?.clots) ? `Yes` : `No`}
                                                                        </Text>
                                                                        {(gynecHistoryData?.numberOfPadsPerDay || gynecHistoryData?.flowNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.numberOfPadsPerDay && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Number of pads per day&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.numberOfPadsPerDay}
                                                                        </Text>
                                                                        {(gynecHistoryData?.flowNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.flowNotes && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Note&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: getIndianLanguageFont(gynecHistoryData?.flowNotes, printSettings?.page_format?.font_family),
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.flowNotes}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}

                                                        {(gynecHistoryData?.pain || gynecHistoryData?.occurrenceOfPain || gynecHistoryData?.painNotes) && (
                                                            <>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    ),&nbsp;
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    Pain&nbsp;(
                                                                </Text>

                                                                {gynecHistoryData?.pain && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Level&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                                textTransform: 'capitalize'
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.pain}
                                                                        </Text>
                                                                        {(gynecHistoryData?.occurrenceOfPain || gynecHistoryData?.painNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.occurrenceOfPain && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Occurrence of pain&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                                textTransform: 'capitalize'
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.occurrenceOfPain}
                                                                        </Text>
                                                                        {(gynecHistoryData?.painNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.painNotes && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Note&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: getIndianLanguageFont(gynecHistoryData?.painNotes, printSettings?.page_format?.font_family),
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.painNotes}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}

                                                        {(gynecHistoryData?.ageAtMenarche || gynecHistoryData?.menarcheNotes) && (
                                                            <>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    ),&nbsp;
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    Menarche&nbsp;(
                                                                </Text>

                                                                {gynecHistoryData?.ageAtMenarche && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Age at&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.ageAtMenarche} {`years`}
                                                                        </Text>
                                                                        {(gynecHistoryData?.menarcheNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.menarcheNotes && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Note&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: getIndianLanguageFont(gynecHistoryData?.menarcheNotes, printSettings?.page_format?.font_family),
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.menarcheNotes}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}

                                                        {(gynecHistoryData?.ageAtMenopause || gynecHistoryData?.typeOfMenopause || gynecHistoryData?.reproductiveNotes) && (
                                                            <>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    ),&nbsp;
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    {gynecHistoryData?.reproductiveLifeStages?.toLowerCase() === 'menopause' ? 'Menopause' : gynecHistoryData?.reproductiveLifeStages?.toLowerCase() === 'perimenopause' ? 'Perimenopause' : 'Lactational amenorrhea'}&nbsp;(
                                                                </Text>

                                                                {gynecHistoryData?.ageAtMenopause && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Age at&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.ageAtMenopause} {`years`}
                                                                        </Text>
                                                                        {(gynecHistoryData?.typeOfMenopause || gynecHistoryData?.reproductiveNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.typeOfMenopause && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Type of {gynecHistoryData?.reproductiveLifeStages?.toLowerCase() === 'menopause' ? 'menopause' : gynecHistoryData?.reproductiveLifeStages?.toLowerCase() === 'perimenopause' ? 'perimenopause' : 'lactational amenorrhea'}&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                                textTransform: 'capitalize'
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.typeOfMenopause}
                                                                        </Text>
                                                                        {(gynecHistoryData?.reproductiveNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.reproductiveNotes && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Note&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: getIndianLanguageFont(gynecHistoryData?.reproductiveNotes, printSettings?.page_format?.font_family),
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.reproductiveNotes}
                                                                        </Text>

                                                                        {!gynecHistoryData?.notes && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 500,
                                                                                }}
                                                                            >
                                                                                {`)`}
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </>
                                                        )}

                                                        {gynecHistoryData?.notes && (
                                                            <>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    ),&nbsp;
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    Menstruation note&nbsp;:&nbsp;
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: getIndianLanguageFont(gynecHistoryData?.notes, printSettings?.page_format?.font_family),
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 400,
                                                                    }}
                                                                >
                                                                    {gynecHistoryData?.notes}
                                                                </Text>
                                                            </>
                                                        )}
                                                    </Text>
                                                </View>
                                            ) : option?.format === "listview" ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text
                                                        style={{
                                                            color: "#171725",
                                                            fontFamily: printSettings?.page_format?.font_family,
                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                            fontWeight: 700,
                                                        }}
                                                        fixed
                                                    >
                                                        Menstrual details&nbsp;:&nbsp;
                                                    </Text>

                                                    {gynecHistoryData?.lmp && (
                                                        <Text
                                                            style={{ marginTop: 5, lineHeight: 1.4 }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: "#171725",
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    &nbsp;{gynecListViewCounter++}.&nbsp;LMP&nbsp;:&nbsp;
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 400,
                                                                    }}
                                                                >
                                                                    {moment(gynecHistoryData?.lmp).format("DD MMM YYYY")}
                                                                </Text>
                                                            </Text>
                                                        </Text>
                                                    )}

                                                    {(gynecHistoryData?.cycle || gynecHistoryData?.intervalOfCycle || gynecHistoryData?.cycleNotes || gynecHistoryData?.cycleNotes) && (
                                                        <Text
                                                            style={{ lineHeight: 1.4 }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: "#171725",
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 500,
                                                                }}
                                                            >

                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    &nbsp;{gynecListViewCounter++}.&nbsp;Cycle&nbsp;:&nbsp;
                                                                </Text>

                                                                {gynecHistoryData?.cycle && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Type&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                                textTransform: 'capitalize'
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.cycle}
                                                                        </Text>
                                                                        {(gynecHistoryData?.intervalOfCycle || gynecHistoryData?.cycleNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.intervalOfCycle && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Interval of cycle&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.intervalOfCycle || ``}&nbsp;
                                                                            {Number(gynecHistoryData?.intervalOfCycle) > 1 ? `days` : `day`}
                                                                        </Text>
                                                                        {(gynecHistoryData?.cycleNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.cycleNotes && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Note&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: getIndianLanguageFont(gynecHistoryData?.cycleNotes, printSettings?.page_format?.font_family),
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.cycleNotes}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </Text>
                                                        </Text>
                                                    )}

                                                    {(gynecHistoryData?.flow || gynecHistoryData?.durationOfMenstrualFlow || gynecHistoryData?.clots || gynecHistoryData?.numberOfPadsPerDay || gynecHistoryData?.flowNotes) && (
                                                        <Text
                                                            style={{ lineHeight: 1.4 }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: "#171725",
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 500,
                                                                }}
                                                            >

                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    &nbsp;{gynecListViewCounter++}.&nbsp;Flow&nbsp;:&nbsp;
                                                                </Text>


                                                                {gynecHistoryData?.flow && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Volume&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                                textTransform: 'capitalize'
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.flow}
                                                                        </Text>
                                                                        {(gynecHistoryData?.durationOfMenstrualFlow || gynecHistoryData?.clots || gynecHistoryData?.numberOfPadsPerDay || gynecHistoryData?.flowNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.durationOfMenstrualFlow && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Duration of mentrual flow&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.durationOfMenstrualFlow || ``}&nbsp;
                                                                            {Number(gynecHistoryData?.durationOfMenstrualFlow) > 1 ? `days` : `day`}
                                                                        </Text>
                                                                        {(gynecHistoryData?.clots || gynecHistoryData?.numberOfPadsPerDay || gynecHistoryData?.flowNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.clots && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Clots&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {Boolean(gynecHistoryData?.clots) ? `Yes` : `No`}
                                                                        </Text>
                                                                        {(gynecHistoryData?.numberOfPadsPerDay || gynecHistoryData?.flowNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.numberOfPadsPerDay && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Number of pads per day&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.numberOfPadsPerDay}
                                                                        </Text>
                                                                        {(gynecHistoryData?.flowNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.flowNotes && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Note&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: getIndianLanguageFont(gynecHistoryData?.flowNotes, printSettings?.page_format?.font_family),
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.flowNotes}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </Text>
                                                        </Text>
                                                    )}

                                                    {(gynecHistoryData?.pain || gynecHistoryData?.occurrenceOfPain || gynecHistoryData?.painNotes) && (
                                                        <Text
                                                            style={{ lineHeight: 1.4 }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: "#171725",
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 500,
                                                                }}
                                                            >

                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    &nbsp;{gynecListViewCounter++}.&nbsp;Pain&nbsp;:&nbsp;
                                                                </Text>


                                                                {gynecHistoryData?.pain && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Level&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                                textTransform: 'capitalize'
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.pain}
                                                                        </Text>
                                                                        {(gynecHistoryData?.occurrenceOfPain || gynecHistoryData?.painNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.occurrenceOfPain && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Occurrence of pain&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                                textTransform: 'capitalize'
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.occurrenceOfPain}
                                                                        </Text>
                                                                        {(gynecHistoryData?.painNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.painNotes && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Note&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: getIndianLanguageFont(gynecHistoryData?.painNotes, printSettings?.page_format?.font_family),
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.painNotes}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </Text>
                                                        </Text>
                                                    )}

                                                    {(gynecHistoryData?.ageAtMenarche || gynecHistoryData?.menarcheNotes) && (
                                                        <Text
                                                            style={{ lineHeight: 1.4 }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: "#171725",
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 500,
                                                                }}
                                                            >

                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    &nbsp;{gynecListViewCounter++}.&nbsp;Menarche&nbsp;:&nbsp;
                                                                </Text>


                                                                {gynecHistoryData?.ageAtMenarche && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Age at&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.ageAtMenarche} {`years`}
                                                                        </Text>
                                                                        {(gynecHistoryData?.menarcheNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.menarcheNotes && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Note&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: getIndianLanguageFont(gynecHistoryData?.menarcheNotes, printSettings?.page_format?.font_family),
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.menarcheNotes}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </Text>
                                                        </Text>
                                                    )}

                                                    {(gynecHistoryData?.ageAtMenopause || gynecHistoryData?.typeOfMenopause || gynecHistoryData?.reproductiveNotes) && (
                                                        <Text
                                                            style={{ lineHeight: 1.4 }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: "#171725",
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 500,
                                                                }}
                                                            >

                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    &nbsp;{gynecListViewCounter++}.&nbsp;{gynecHistoryData?.reproductiveLifeStages?.toLowerCase() === 'menopause' ? 'Menopause' : gynecHistoryData?.reproductiveLifeStages?.toLowerCase() === 'perimenopause' ? 'Perimenopause' : 'Lactational amenorrhea'}&nbsp;:&nbsp;
                                                                </Text>


                                                                {gynecHistoryData?.ageAtMenopause && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Age at&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.ageAtMenopause} {`years`}
                                                                        </Text>
                                                                        {(gynecHistoryData?.typeOfMenopause || gynecHistoryData?.reproductiveNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.typeOfMenopause && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Type of {gynecHistoryData?.reproductiveLifeStages?.toLowerCase() === 'menopause' ? 'menopause' : gynecHistoryData?.reproductiveLifeStages?.toLowerCase() === 'perimenopause' ? 'perimenopause' : 'lactational amenorrhea'}&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                                textTransform: 'capitalize'
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.typeOfMenopause}
                                                                        </Text>
                                                                        {(gynecHistoryData?.reproductiveNotes) && (
                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 400,
                                                                                    textTransform: 'capitalize'
                                                                                }}
                                                                            >
                                                                                &nbsp;|&nbsp;
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {gynecHistoryData?.reproductiveNotes && (
                                                                    <>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                            }}
                                                                        >
                                                                            Note&nbsp;:&nbsp;
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: getIndianLanguageFont(gynecHistoryData?.reproductiveNotes, printSettings?.page_format?.font_family),
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            {gynecHistoryData?.reproductiveNotes}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </Text>
                                                        </Text>
                                                    )}

                                                    {gynecHistoryData?.notes && (
                                                        <Text
                                                            style={{ lineHeight: 1.4 }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: "#171725",
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    &nbsp;{gynecListViewCounter++}.&nbsp;Menstruation note&nbsp;:&nbsp;
                                                                </Text>

                                                                <Text
                                                                    style={{
                                                                        color: "#171725",
                                                                        fontFamily: getIndianLanguageFont(gynecHistoryData?.notes, printSettings?.page_format?.font_family),
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 400,
                                                                    }}
                                                                >
                                                                    {gynecHistoryData?.notes}
                                                                </Text>
                                                            </Text>
                                                        </Text>
                                                    )}
                                                </View>
                                            ) : (
                                                <GynecHistoryTableView
                                                    PX_TO_PT={PX_TO_PT}
                                                    styles={styles}
                                                    printSettings={printSettings}
                                                    gynecHistoryData={gynecHistoryData}
                                                />
                                            )
                                            )}
                                    </>
                                ) : option?.id === 14 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {isGynaecHistoryAccessable && obsHistoryData &&
                                            Object.keys(obsHistoryData).length > 2 &&
                                            (option?.format === "inline" ? (
                                                <ObsHistoryInlineView PX_TO_PT={PX_TO_PT} styles={styles} printSettings={printSettings} options={option?.obs_history_option} obsHistoryData={obsHistoryData} consultationDate={caseManagerData?.patient_data?.patient_consultaion_date} />
                                            ) : option?.format === "listview" ? (
                                                <ObsHistoryListView PX_TO_PT={PX_TO_PT} styles={styles} printSettings={printSettings} options={option?.obs_history_option} obsHistoryData={obsHistoryData} consultationDate={caseManagerData?.patient_data?.patient_consultaion_date} />
                                            ) : (
                                                <ObsHistoryTableView PX_TO_PT={PX_TO_PT} styles={styles} printSettings={printSettings} options={option?.obs_history_option} obsHistoryData={obsHistoryData} consultationDate={caseManagerData?.patient_data?.patient_consultaion_date} />
                                            ))
                                        }
                                    </>
                                ) : option?.id === 15 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {labParamsPatchData &&
                                            labParamsPatchData.length &&
                                            (option?.format === "inline" ? (
                                                <View style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text>
                                                        <>
                                                            <Text
                                                                style={{
                                                                    color: "#171725",
                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                    fontWeight: 700,
                                                                }}
                                                                fixed
                                                            >
                                                                Lab Results:&nbsp;
                                                            </Text>

                                                            {labParamsPatchData?.map((item, i) => (
                                                                <>
                                                                    {i !== 0 && (
                                                                        <Text
                                                                            style={{
                                                                                color: "#171725",
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 400,
                                                                            }}
                                                                        >
                                                                            ,&nbsp;
                                                                        </Text>
                                                                    )}
                                                                    <Text
                                                                        key={i}
                                                                        style={{
                                                                            color: "#171725",
                                                                            fontFamily: printSettings?.page_format?.font_family,
                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                            fontWeight: 500,
                                                                        }}
                                                                    >
                                                                        {moment(item?.date).format("Do MMM YYYY")}&nbsp;
                                                                    </Text>
                                                                    <Text
                                                                        style={{
                                                                            color: "#171725",
                                                                            fontFamily: printSettings?.page_format?.font_family,
                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                            fontWeight: 400,
                                                                        }}
                                                                    >
                                                                        -&nbsp;
                                                                    </Text>

                                                                    {Object.entries(item.groupedInputs).map(([reportName, tests], reportIndex) => (
                                                                        <Text key={reportIndex}>
                                                                            {reportIndex !== 0 && (
                                                                                <Text
                                                                                    style={{
                                                                                        color: "#171725",
                                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                        fontWeight: 400,
                                                                                    }}
                                                                                >
                                                                                    ),&nbsp;
                                                                                </Text>
                                                                            )}

                                                                            <Text
                                                                                style={{
                                                                                    color: "#171725",
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 500,
                                                                                }}
                                                                            >
                                                                                {reportName}&nbsp;(
                                                                            </Text>

                                                                            {tests.map((input, inputIndex) => (
                                                                                <Text
                                                                                    key={inputIndex}
                                                                                    style={{
                                                                                        color: "#171725",
                                                                                        fontFamily: getIndianLanguageFont(input.value, printSettings?.page_format?.font_family),
                                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                        fontWeight: 400,
                                                                                    }}
                                                                                >
                                                                                    {inputIndex !== 0 && <Text>, </Text>}
                                                                                    {input.testName}:&nbsp;{input.value}&nbsp;{input.testName !== 'Remarks' ? input.units : ''}
                                                                                </Text>
                                                                            ))}
                                                                        </Text>
                                                                    ))}
                                                                    <Text
                                                                        style={{
                                                                            color: "#171725",
                                                                            fontFamily: printSettings?.page_format?.font_family,
                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                            fontWeight: 400,
                                                                        }}
                                                                    >
                                                                        )
                                                                    </Text>
                                                                </>
                                                            ))}
                                                        </>
                                                    </Text>
                                                </View>
                                            ) : option?.format === "listview" ? (
                                                <View style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{
                                                        color: "#171725",
                                                        fontFamily: printSettings?.page_format?.font_family,
                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                        fontWeight: 700,
                                                    }}>
                                                        Lab Results:
                                                    </Text>
        
                                                    {labParamsPatchData?.map((item, dateIndex) => (
                                                        <View key={dateIndex}>
                                                            <Text style={{
                                                                color: "#171725",
                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                fontWeight: 500,
                                                                marginTop: PX_TO_PT * 8,
                                                            }}>
                                                                {moment(item?.date).format("Do MMM YYYY")}
                                                            </Text>
        
                                                            {Object.entries(item.groupedInputs).map(([reportName, tests], reportIndex) => (
                                                                <View key={reportIndex} style={{ marginLeft: PX_TO_PT * 16 }}>
                                                                    <Text style={{
                                                                        color: "#171725",
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                        fontWeight: 500,
                                                                    }}>
                                                                        {reportIndex + 1}. {reportName}
                                                                    </Text>
        
                                                                    {tests.map((input, testIndex) => (
                                                                        <Text key={testIndex} style={{
                                                                            color: "#171725",
                                                                            fontFamily: getIndianLanguageFont(input.value, printSettings?.page_format?.font_family),
                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                            fontWeight: 400,
                                                                            marginLeft: PX_TO_PT * 24,
                                                                        }}>
                                                                            {String.fromCharCode(97 + testIndex)}. {input.testName}: {input.value} {input.testName !== 'Remarks' ? input.units : ''}
                                                                        </Text>
                                                                    ))}
                                                                </View>
                                                            ))}
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text
                                                        style={{
                                                            color: "#171725",
                                                            fontFamily: printSettings?.page_format?.font_family,
                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                            fontWeight: 700,
                                                            marginBottom: PX_TO_PT * 6
                                                        }}
                                                        fixed
                                                    >
                                                        Lab Results:&nbsp;
                                                    </Text>

                                                    <View style={{ marginTop: PX_TO_PT * 6 }}>
                                                        <View style={[styles.table, { marginTop: 0 }]}>
                                                            <View style={[styles.headerRow]} fixed>
                                                                <Text
                                                                    style={[
                                                                        styles.headerCell,
                                                                        {
                                                                            flex: 1,
                                                                            fontFamily: printSettings?.page_format?.font_family,
                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                            fontWeight: 500,
                                                                            color: "#000",
                                                                        },
                                                                    ]}
                                                                >
                                                                    {"NAME"}
                                                                </Text>
                                                                {labParamsPatchTableData.map((entry, i) => (
                                                                    <Text
                                                                        key={i}
                                                                        style={[
                                                                            styles.headerCell,
                                                                            {
                                                                                flex: 1,
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                fontWeight: 500,
                                                                                color: "#000",
                                                                            },
                                                                        ]}
                                                                    >
                                                                        {moment(entry.date).format('Do MMM YY')}
                                                                    </Text>
                                                                ))}
                                                            </View>

                                                            {Object.keys(labParamsPatchTableData[0].groupedInputs).map((reportName, j) => (
                                                                <View key={j} style={{ marginTop: PX_TO_PT * 0 }}>
                                                                    <View style={[styles.row]} wrap={false}>
                                                                        <Text
                                                                            style={[
                                                                                styles.cell,
                                                                                {
                                                                                    flex: 1,
                                                                                    fontFamily: printSettings?.page_format?.font_family,
                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                    fontWeight: 500,
                                                                                    color: "#000",
                                                                                },
                                                                            ]}
                                                                        >
                                                                            {reportName}
                                                                        </Text>
                                                                    </View>

                                                                    {labParamsPatchTableData[0].groupedInputs[reportName].map((test, idx) => (
                                                                        <View key={idx} style={{ marginTop: PX_TO_PT * 0 }}>
                                                                            <View style={[styles.row]} wrap={false}>
                                                                                <Text
                                                                                    style={[
                                                                                        styles.cell,
                                                                                        {
                                                                                            flex: 1,
                                                                                            fontFamily: printSettings?.page_format?.font_family,
                                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                            fontWeight: 500,
                                                                                            color: "#000",
                                                                                        },
                                                                                    ]}
                                                                                >
                                                                                    {test.testName}
                                                                                </Text>

                                                                                {labParamsPatchTableData.map((entry, k) => {
                                                                                    const testResult = entry.groupedInputs[reportName]?.find(
                                                                                        (input) => input.testName === test.testName
                                                                                    );
                                                                                    return (
                                                                                        <Text
                                                                                            key={k}
                                                                                            style={[
                                                                                                styles.cell,
                                                                                                {
                                                                                                    flex: 1,
                                                                                                    fontFamily: getIndianLanguageFont(testResult.value, printSettings?.page_format?.font_family),
                                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                                    fontWeight: 400,
                                                                                                    color: "#000",
                                                                                                },
                                                                                            ]}
                                                                                        >
                                                                                            {testResult ? testResult.value + " " + (testResult.testName !== 'Remarks' ? testResult.units : '') : "-"}&nbsp;
                                                                                        </Text>
                                                                                    );
                                                                                })}
                                                                            </View>
                                                                        </View>
                                                                    ))}
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>
                                                </View>
                                            ))
                                        }
                                    </>
                                ) : option?.id === 20 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {hasOphthalModuleData &&
                                            (option?.format === "inline" ? (
                                                <OphthalmologyInlineView 
                                                    PX_TO_PT={PX_TO_PT} 
                                                    styles={styles} 
                                                    printSettings={printSettings} 
                                                    ophthalModuleData={ophthalModuleData}
                                                    options={option?.ophthalmology_option || option?.subSections}
                                                />
                                            ) : option?.format === "listview" ? (
                                                <OphthalmologyListView 
                                                    PX_TO_PT={PX_TO_PT} 
                                                    styles={styles} 
                                                    printSettings={printSettings} 
                                                    ophthalModuleData={ophthalModuleData}
                                                    options={option?.ophthalmology_option || option?.subSections}
                                                />
                                            ) : (
                                                <>
                                                    {(option?.ophthalmology_option || option?.subSections || []).map((section) => {
                                                        if (section?.visible === false) {
                                                            return null;
                                                        }
                                                        const sectionOptions = [section];
                                                        const sectionView = section?.view ?? 3;
                                                        if (sectionView === 1) {
                                                            return (
                                                                <OphthalmologyInlineView 
                                                                    key={section.id}
                                                                    PX_TO_PT={PX_TO_PT} 
                                                                    styles={styles} 
                                                                    printSettings={printSettings} 
                                                                    ophthalModuleData={ophthalModuleData}
                                                                    options={sectionOptions}
                                                                />
                                                            );
                                                        }
                                                        if (sectionView === 2) {
                                                            return (
                                                                <OphthalmologyListView 
                                                                    key={section.id}
                                                                    PX_TO_PT={PX_TO_PT} 
                                                                    styles={styles} 
                                                                    printSettings={printSettings} 
                                                                    ophthalModuleData={ophthalModuleData}
                                                                    options={sectionOptions}
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <OphthalmologyTableView 
                                                                key={section.id}
                                                                PX_TO_PT={PX_TO_PT} 
                                                                styles={styles} 
                                                                printSettings={printSettings} 
                                                                ophthalModuleData={ophthalModuleData}
                                                                options={sectionOptions}
                                                            />
                                                        );
                                                    })}
                                                </>
                                            ))
                                        }
                                    </>
                                ) : option?.id === 16 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {caseManagerData.surgeries.length > 0 && (
                                            option?.format === 'inline' ? (
                                                <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Surgeries/Procedures:&nbsp;</Text>
                                                    {caseManagerData.surgeries.map((item, i) => {
                                                        return (
                                                            <Text key={i}>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item?.name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.name}&nbsp;</Text>
                                                                {(item.notes) ?
                                                                    <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ notes }) => ({ notes }))(caseManagerData.surgeries[i])).filter(([_, v]) => v))).join(', ')})`}{caseManagerData.surgeries.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                                    :
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.surgeries.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                                }
                                                            </Text>
                                                        )
                                                    })}
                                                </Text>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Surgeries/Procedures:&nbsp;</Text>
                                                    {caseManagerData.surgeries.map((item, i) => {
                                                        return (
                                                            <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item?.name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.name}&nbsp;</Text>
                                                                {(item.notes) &&
                                                                    <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ notes }) => ({ notes }))(caseManagerData.surgeries[i])).filter(([_, v]) => v))).join(', ')})\n`}</Text>
                                                                }
                                                            </Text>
                                                        )
                                                    })}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Surgeries/Procedures:&nbsp;</Text>
                                                    <View style={styles.table}>
                                                        <View style={styles.headerRow} fixed>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                                        </View>
                                                        {caseManagerData.surgeries.map((item, i) => (
                                                            <View style={styles.row} key={i} wrap={false}>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item?.name, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.name}&nbsp;</Text>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.notes ? item.notes : '-'}&nbsp;</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )
                                        )}
                                    </>
                                ) : option?.id === 18 && option?.enable === 'Y' && option?.custom_status === 'Y' ? (
                                    <>
                                        {caseManagerData?.zydusSelectedLabParams?.length > 0 && (
                                            option?.format === 'inline' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text>
                                                        <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>
                                                            Zydus Lab Results:&nbsp;
                                                        </Text>
                                                        {caseManagerData.zydusSelectedLabParams.map((dateEntry, dateIndex) => (
                                                            <Text key={dateIndex}>
                                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 600 }}>
                                                                    {moment(dateEntry.date, "DD-MM-YYYY").format("Do MMM YYYY")}:&nbsp;
                                                                </Text>
                                                                {dateEntry.inputs.map((test, testIndex) => (
                                                                    <Text key={testIndex}>
                                                                        <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(test.serviceName, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                            {test.serviceName}
                                                                        </Text>
                                                                        {test.resultvalue !== '-' && (
                                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                : {test.resultvalue}
                                                                            </Text>
                                                                        )}
                                                                        {test.labResultParameters && test.labResultParameters.map((param, paramIndex) => (
                                                                            <Text key={paramIndex}>
                                                                                <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(param.parameterName, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                    , {param.parameterName}: {param.resultValue}
                                                                                </Text>
                                                                            </Text>
                                                                        ))}
                                                                        {testIndex < dateEntry.inputs.length - 1 && <Text style={{ color: '#171725' }}>, </Text>}
                                                                    </Text>
                                                                ))}
                                                                {dateIndex < caseManagerData.zydusSelectedLabParams.length - 1 && <Text style={{ color: '#171725' }}>; </Text>}
                                                            </Text>
                                                        ))}
                                                    </Text>
                                                </View>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>
                                                        Zydus Lab Results:
                                                    </Text>
                                                    {caseManagerData.zydusSelectedLabParams.map((dateEntry, dateIndex) => (
                                                        <View key={dateIndex} style={{ marginTop: PX_TO_PT * 10 }}>
                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 600 }}>
                                                                {moment(dateEntry.date, "DD-MM-YYYY").format("Do MMM YYYY")}:
                                                            </Text>
                                                            {dateEntry.inputs.map((test, testIndex) => (
                                                                <View key={testIndex} style={{ marginLeft: PX_TO_PT * 15, marginTop: PX_TO_PT * 5 }}>
                                                                    <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(test.serviceName, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                        • {test.serviceName}
                                                                        {test.resultvalue !== '-' && (
                                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                : {test.resultvalue}
                                                                            </Text>
                                                                        )}
                                                                    </Text>
                                                                    {test.labResultParameters && test.labResultParameters.map((param, paramIndex) => (
                                                                        <Text key={paramIndex} style={{ marginLeft: PX_TO_PT * 15, marginTop: PX_TO_PT * 2, color: '#171725', fontFamily: getIndianLanguageFont(param.parameterName, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                            - {param.parameterName}: {param.resultValue}
                                                                        </Text>
                                                                    ))}
                                                                </View>
                                                            ))}
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>
                                                        Zydus Lab Results:
                                                    </Text>
                                                    {/* Zydus Cross-Tab Table Structure */}
                                                    {(() => {
                                                        const allDates = [...new Set(caseManagerData.zydusSelectedLabParams.map(entry => entry.date))]
                                                            .sort((a, b) => new Date(b.split('-').reverse().join('-')) - new Date(a.split('-').reverse().join('-')));
                                                            const dates = allDates.slice(0, 5);
                                                            const dateColumnCount = dates.length;
                                                            const investigationFlex = dateColumnCount >= 4 ? 0.8 : 1;
                                                            const subParamsFlex = dateColumnCount >= 4 ? 0.8 : 1;
                                                            const dateColumnFlex = dateColumnCount >= 4 ? 0.6 : 1;
                                                        
                                                        const serviceGroups = [];
                                                        const serviceMap = new Map();
                                                        
                                                        {/* Group services by date */}
                                                        caseManagerData.zydusSelectedLabParams
                                                            .filter(dateEntry => dates.includes(dateEntry.date))
                                                            .forEach(dateEntry => {
                                                            dateEntry.inputs.forEach(test => {
                                                                if (!serviceMap.has(test.serviceName)) {
                                                                    serviceMap.set(test.serviceName, {
                                                                        serviceName: test.serviceName,
                                                                        rows: []
                                                                    });
                                                                    serviceGroups.push(serviceMap.get(test.serviceName));
                                                                }
                                                            });
                                                        });
                                                        
                                                        // Process each service group
                                                        serviceGroups.forEach(serviceGroup => {
                                                            const serviceName = serviceGroup.serviceName;
                                                            
                                                            let hasDirectResults = false;
                                                            const directResults = {};
                                                            let directReferenceRange = '';
                                                            
                                                            caseManagerData.zydusSelectedLabParams
                                                                .filter(dateEntry => dates.includes(dateEntry.date))
                                                                .forEach(dateEntry => {
                                                                const test = dateEntry.inputs.find(t => t.serviceName === serviceName);
                                                                if (test && test.resultvalue !== '-') {
                                                                    hasDirectResults = true;
                                                                    directResults[dateEntry.date] = test.resultvalue;
                                                                    if (test.referenceRange !== '-') {
                                                                        directReferenceRange = test.referenceRange;
                                                                    }
                                                                }
                                                            });
                                                            
                                                            // Collect all parameters for this service
                                                            const parameterMap = new Map();
                                                            
                                                            caseManagerData.zydusSelectedLabParams
                                                                .filter(dateEntry => dates.includes(dateEntry.date))
                                                                .forEach(dateEntry => {
                                                                const test = dateEntry.inputs.find(t => t.serviceName === serviceName);
                                                                if (test && test.labResultParameters) {
                                                                    test.labResultParameters.forEach(param => {
                                                                        if (!parameterMap.has(param.parameterName)) {
                                                                            parameterMap.set(param.parameterName, {
                                                                                name: param.parameterName,
                                                                                referenceRange: param.referenceRange || '',
                                                                                results: {},
                                                                                type: 'parameter'
                                                                            });
                                                                        }
                                                                        parameterMap.get(param.parameterName).results[dateEntry.date] = param.resultValue;
                                                                    });
                                                                }
                                                            });
                                                            
                                                            const parameters = Array.from(parameterMap.values());
                                                            const splitLongContent = (param) => {
                                                                const getCharLimit = () => {
                                                                    if (dateColumnCount >= 5) return 200;
                                                                    if (dateColumnCount >= 3) return 300;
                                                                    return 400;
                                                                };
                                                                const maxCharsPerRow = getCharLimit();
                                                                const resultEntries = Object.entries(param.results);
                                                                const hasLongContent = resultEntries.some(([date, value]) => 
                                                                    value && value.length > maxCharsPerRow
                                                                );
                                                                if (!hasLongContent) {
                                                                    return [param];
                                                                }
                                                                const smartSplit = (text, maxLength) => {
                                                                    if (text.length <= maxLength) return [text];
                                                                    const chunks = [];
                                                                    let remaining = text;
                                                                    while (remaining.length > maxLength) {
                                                                        let splitPoint = maxLength;
                                                                        const breakPoints = [
                                                                            remaining.lastIndexOf('\n\n', maxLength),
                                                                            remaining.lastIndexOf('\n', maxLength),
                                                                            remaining.lastIndexOf('. ', maxLength),
                                                                            remaining.lastIndexOf(', ', maxLength),
                                                                            remaining.lastIndexOf(' ', maxLength)
                                                                        ];
                                                                        for (const breakPoint of breakPoints) {
                                                                            if (breakPoint > maxLength * 0.7) {
                                                                                splitPoint = breakPoint + (breakPoint === breakPoints[2] ? 2 : 1);
                                                                                break;
                                                                            }
                                                                        }
                                                                        chunks.push(remaining.substring(0, splitPoint).trim());
                                                                        remaining = remaining.substring(splitPoint).trim();
                                                                    }
                                                                    if (remaining.length > 0) {
                                                                        chunks.push(remaining);
                                                                    }
                                                                    return chunks;
                                                                };
                                                                const rows = [];
                                                                resultEntries.forEach(([date, value]) => {
                                                                    if (value && value.length > maxCharsPerRow) {
                                                                        const chunks = smartSplit(value, maxCharsPerRow);
                                                                        chunks.forEach((chunk, index) => {
                                                                            if (!rows[index]) {
                                                                                rows[index] = {
                                                                                    name: index === 0 ? param.name : `${param.name} (cont.)`,
                                                                                    referenceRange: index === 0 ? param.referenceRange : '',
                                                                                    results: {},
                                                                                    type: param.type
                                                                                };
                                                                            }
                                                                            rows[index].results[date] = chunk;
                                                                        });
                                                                    } else {
                                                                        if (!rows[0]) {
                                                                            rows[0] = {
                                                                                name: param.name,
                                                                                referenceRange: param.referenceRange,
                                                                                results: {},
                                                                                type: param.type
                                                                            };
                                                                        }
                                                                        rows[0].results[date] = value || '';
                                                                    }
                                                                });
                                                                
                                                                return rows.length > 0 ? rows : [param];
                                                            };
                                                            const splitParameters = [];
                                                            parameters.forEach(param => {
                                                                const splitRows = splitLongContent(param);
                                                                splitParameters.push(...splitRows);
                                                            })
                                                            if (splitParameters.length > 0) {
                                                                serviceGroup.rows.push(...splitParameters);
                                                                serviceGroup.hasParameters = true;
                                                            } else if (hasDirectResults) {
                                                                const directServiceRow = {
                                                                    name: serviceName,
                                                                    referenceRange: directReferenceRange,
                                                                    results: directResults,
                                                                    type: 'service'
                                                                };
                                                                const splitDirectRows = splitLongContent(directServiceRow);
                                                                serviceGroup.rows.push(...splitDirectRows);
                                                                serviceGroup.hasParameters = false;
                                                            }
                                                        });
                                                        
                                                        return (
                                                            <View style={[styles.table, { break: "avoid" }]}>
                                                                <View style={[styles.headerRow, { borderTop: '1px solid #171725', backgroundColor: '#cccccc' }]} fixed wrap={false}>
                                                                    <View style={[styles.headerCell, { 
                                                                        flex: investigationFlex, 
                                                                        minHeight: PX_TO_PT * 30, 
                                                                        justifyContent: 'center',
                                                                    borderRight: '1px solid #171725',
                                                                        padding: PX_TO_PT * 6
                                                                    }]}>
                                                                    <Text style={{
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                            fontWeight: 600, 
                                                                        color: "#000",
                                                                            textAlign: 'center',
                                                                            lineHeight: 1.3
                                                                        }} wrap>
                                                                        Investigation
                                                                    </Text>
                                                                </View>
                                                                    <View style={[styles.headerCell, { 
                                                                        flex: subParamsFlex, 
                                                                        minHeight: PX_TO_PT * 30, 
                                                                        justifyContent: 'center',
                                                                    borderRight: '1px solid #171725',
                                                                        padding: PX_TO_PT * 6
                                                                    }]}>
                                                                    <Text style={{
                                                                        fontFamily: printSettings?.page_format?.font_family,
                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                            fontWeight: 600, 
                                                                        color: "#000",
                                                                            textAlign: 'center',
                                                                            lineHeight: 1.3
                                                                        }} wrap>
                                                                        Sub Params
                                                                    </Text>
                                                                </View>
                                                                    {dates.map((date, index) => (
                                                                        <View key={index} style={[styles.headerCell, { 
                                                                            flex: dateColumnFlex, 
                                                                            minHeight: PX_TO_PT * 30, 
                                                                            justifyContent: 'center',
                                                                            padding: PX_TO_PT * 6
                                                                        }]}>
                                                                            <Text style={{
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                fontWeight: 600, 
                                                                                color: "#000",
                                                                                textAlign: 'center',
                                                                                lineHeight: 1.3
                                                                            }} wrap>
                                                                                {moment(date, "DD-MM-YYYY").format("DD MMM YY")}
                                                                            </Text>
                                                                        </View>
                                                                    ))}
                                                            </View>
                                                                {serviceGroups.map((serviceGroup, groupIndex) => {
                                                                    const totalRows = serviceGroup.rows.length;
                                                                    const hasParameters = serviceGroup.hasParameters;
                                                                    if (totalRows === 0) {
                                                                        return (
                                                                            <View key={groupIndex} style={{ flexDirection: 'row' }} wrap={false}>
                                                                        <View style={{
                                                                                    flex: investigationFlex, 
                                                                                    minHeight: PX_TO_PT * 30, 
                                                                                    justifyContent: 'flex-start',
                                                                            padding: PX_TO_PT * 6,
                                                                                    borderTop: '0px solid transparent',
                                                                                    borderBottom: '1px solid #171725',
                                                                                    borderLeft: '1px solid #171725',
                                                                                    borderRight: '1px solid #171725'
                                                                        }}>
                                                                            <Text style={{
                                                                                        color: "#171725", 
                                                                                        fontFamily: getIndianLanguageFont(serviceGroup.serviceName, printSettings?.page_format?.font_family), 
                                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                        fontWeight: 400,
                                                                                        textAlign: 'left',
                                                                                        lineHeight: 1.3
                                                                                    }} wrap>
                                                                                        {serviceGroup.serviceName}
                                                                                    </Text>
                                                                                </View>
                                                                                <View style={{ 
                                                                                    flex: subParamsFlex, 
                                                                                    minHeight: PX_TO_PT * 30, 
                                                                                    justifyContent: 'flex-start',
                                                                                    padding: PX_TO_PT * 6,
                                                                                    borderTop: '0px solid transparent',
                                                                                    borderBottom: '1px solid #171725',
                                                                                    borderRight: '1px solid #171725',
                                                                                    borderLeft: '0px solid transparent'
                                                                                }}>
                                                                                    <Text style={{ 
                                                                                        color: "#171725", 
                                                                                fontFamily: printSettings?.page_format?.font_family,
                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                                                                                        fontWeight: 400,
                                                                                        textAlign: 'left',
                                                                                        lineHeight: 1.3
                                                                                    }} wrap>
                                                                                        -
                                                                                    </Text>
                                                                                </View>
                                                                                {dates.map((date, dateIndex) => (
                                                                                    <View key={dateIndex} style={{ 
                                                                                        flex: dateColumnFlex, 
                                                                                        minHeight: PX_TO_PT * 30, 
                                                                                        justifyContent: 'center',
                                                                                        padding: PX_TO_PT * 6,
                                                                                        borderTop: '0px solid transparent',
                                                                                        borderBottom: '1px solid #171725',
                                                                                        borderRight: '1px solid #171725',
                                                                                        borderLeft: '0px solid transparent'
                                                                                    }}>
                                                                                        <Text style={{ 
                                                                                            color: "#171725", 
                                                                                            fontFamily: printSettings?.page_format?.font_family, 
                                                                                            fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                            fontWeight: 400,
                                                                                            textAlign: 'center',
                                                                                            lineHeight: 1.3
                                                                                        }} wrap>
                                                                                            -
                                                                            </Text>
                                                                        </View>
                                                                                ))}
                                                                    </View>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <React.Fragment key={groupIndex}>
                                                                            {serviceGroup.rows.map((row, rowIndex) => {
                                                                                const isFirstRow = rowIndex === 0;
                                                                                const isLastRow = rowIndex === totalRows - 1;
                                                                                const isMiddleRow = !isFirstRow && !isLastRow;
                                                                        
                                                                        return (
                                                                                    <View key={rowIndex} style={{ flexDirection: 'row' }} wrap={false}>
                                                                                    <View style={{
                                                                                            flex: investigationFlex,
                                                                                            minHeight: PX_TO_PT * 30,
                                                                                            justifyContent: 'flex-start',
                                                                                            padding: PX_TO_PT * 6,
                                                                                            backgroundColor: "transparent",
                                                                                            borderLeft: '1px solid #171725',
                                                                                            borderTop: '0px solid transparent',
                                                                                            borderBottom: isLastRow ? '1px solid #171725' : (hasParameters && totalRows > 1 ? '0px solid transparent' : '1px solid #171725'),
                                                                                            borderRight: '1px solid #171725'
                                                                                    }}>
                                                                                        <Text style={{
                                                                                                color: "#171725", 
                                                                                                fontFamily: getIndianLanguageFont(serviceGroup.serviceName, printSettings?.page_format?.font_family), 
                                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                            fontWeight: 400,
                                                                                                textAlign: 'left',
                                                                                                lineHeight: 1.3
                                                                                            }} wrap>

                                                                                                {(hasParameters && isFirstRow) || (!hasParameters) ? serviceGroup.serviceName : ""}
                                                                                        </Text>
                                                                                    </View>
                                                                                    <View style={{
                                                                                            flex: subParamsFlex,
                                                                                            minHeight: PX_TO_PT * 30,
                                                                                            justifyContent: 'flex-start',
                                                                                            padding: PX_TO_PT * 6,
                                                                                            backgroundColor: "transparent",
                                                                                            borderTop: '0px solid transparent',
                                                                                            borderBottom: '1px solid #171725',
                                                                                        borderRight: '1px solid #171725',
                                                                                            borderLeft: '0px solid transparent'
                                                                                    }}>
                                                                                        <Text style={{
                                                                                                color: "#171725", 
                                                                                                fontFamily: getIndianLanguageFont(row.name, printSettings?.page_format?.font_family), 
                                                                                                fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                            fontWeight: 400,
                                                                                                textAlign: 'left',
                                                                                                lineHeight: 1.3
                                                                                            }} wrap>
                                                                                            {hasParameters ? row.name : '-'}{hasParameters && row.referenceRange ? ` (${row.referenceRange})` : ''}
                                                                                        </Text>
                                                                                    </View>
                                                                                        {dates.map((date, dateIndex) => (
                                                                                            <View key={dateIndex} style={{ 
                                                                                                flex: dateColumnFlex,
                                                                                                minHeight: PX_TO_PT * 30,
                                                                                                justifyContent: 'center',
                                                                                                padding: PX_TO_PT * 6,
                                                                                                backgroundColor: "white",
                                                                                                borderTop: '0px solid transparent',
                                                                                                borderBottom: '1px solid #171725',
                                                                                                borderRight: '1px solid #171725',
                                                                                                borderLeft: '0px solid transparent'
                                                                                            }}>
                                                                                                <Text style={{
                                                                                                    color: "#171725", 
                                                                                                    fontFamily: printSettings?.page_format?.font_family, 
                                                                                                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                                    fontWeight: 400,
                                                                                                    textAlign: 'center',
                                                                                                    lineHeight: 1.3
                                                                                                }} wrap>
                                                                                                    {row.results[date] || '-'}
                                                                                                </Text>
                                                                                            </View>
                                                                                        ))}
                                                                                            </View>
                                                                                );
                                                                            })}
                                                                        </React.Fragment>
                                                                        );
                                                                })}
                                                            </View>
                                                        );
                                                    })()}
                                                </View>
                                            )
                                        )}
                                    </>
                                ) : option?.is_custom_module === true && option?.enable === 'Y' && option?.custom_status === 'Y' && customModule?.content?.length > 0 ? (
                                    (() => {
                                        // Check if this is V2 module directly from customModule
                                        const isV2 = customModule?.module_version === 'v2';
                                        
                                        const getFieldKeys = (item) => {
                                            if (!item || typeof item !== 'object') return [];
                                            return Object.keys(item).filter(key => key !== 'id' && key !== 'order');
                                        };

                                        const normalizedCustomModules = Array.isArray(customModules)
                                            ? customModules
                                            : Array.isArray(customModules?.modules)
                                                ? customModules.modules
                                                : Array.isArray(customModules?.data)
                                                    ? customModules.data
                                                    : [];
                                        const moduleDefinition = normalizedCustomModules.find(m =>
                                            [m?.module_id, m?.origin_id, m?.id].some((id) =>
                                                id != null && [customModule?.module_id, customModule?.origin_id, customModule?.id].some((moduleId) => String(moduleId) === String(id))
                                            )
                                        );
                                        const namedFields = moduleDefinition?.namedFields || moduleDefinition?.fields || customModule?.namedFields || option?.namedFields || [];
                                        const getFieldLabel = (fieldKey) => {
                                            const field = namedFields.find((namedField) =>
                                                [namedField?.fieldName, namedField?.name, namedField?.key].some((name) => String(name || "") === String(fieldKey || ""))
                                            );
                                            return formatCustomModuleColumnTitle(field?.fieldLabel || field?.label || field?.title || fieldKey);
                                        };
                                        
                                        // Get field keys from first content item (for v2)
                                        const fieldKeys = isV2 && customModule?.content?.length > 0 
                                            ? getFieldKeys(customModule.content[0]) 
                                            : [];
                                        // When order === 0, render v2 as single-column table (header = field key, one column of values)
                                        const isV2SingleColumn = isV2 && fieldKeys.length > 0 && customModule?.content?.length > 0 &&
                                            (customModule.content[0].order === 0 || customModule.content[0].order === '0');

                                        // Helper to check if V2 content has any data
                                        const hasV2Content = (item) => {
                                            if (!isV2) return false;
                                            return fieldKeys.some(fieldKey => item[fieldKey]?.trim?.().length > 0);
                                        };

                                        // Helper to check if V1 content has any data
                                        const hasV1Content = (item) => {
                                            return item.title || item.notes;
                                        };

                                        // Render based on format
                                        if (option?.format === 'inline') {
                                            const moduleName = customModule?.name || customModule?.module_name;
                                            return (
                                                <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: getIndianLanguageFont(moduleName, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>{moduleName}:&nbsp;</Text>
                                                    {customModule?.content?.map((item, i) => {
                                                        if (isV2) {
                                                            // V2: Render all fields with their keys as labels in format: (<Field1>: <Value>, <Field2>: <Value>, ...)
                                                            const fieldEntries = fieldKeys
                                                                .map(fieldKey => ({
                                                                    label: getFieldLabel(fieldKey),
                                                                    value: item[fieldKey]
                                                                }))
                                                                .filter(entry => entry.value?.trim?.().length > 0);
                                                            
                                                            if (fieldEntries.length === 0) return null;

                                                            return (
                                                                <Text key={i}>
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>(</Text>
                                                                    {fieldEntries.map((entry, idx) => (
                                                                        <Text key={idx}>
                                                                            <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(entry.label, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>
                                                                                {entry.label}:&nbsp;
                                                                            </Text>
                                                                            <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(entry.value, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                {normalizePdfText(entry.value)}
                                                                            </Text>
                                                                            {idx < fieldEntries.length - 1 && <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>, </Text>}
                                                                        </Text>
                                                                    ))}
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>)</Text>
                                                                    {i < customModule?.content.length - 1 && <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}> | </Text>}
                                                                </Text>
                                                            );
                                                        } else {
                                                            // V1: Original rendering
                                                            return (
                                                                <Text key={i}>
                                                                    {item.title && <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(formatCustomModuleColumnTitle(item?.title), printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{formatCustomModuleColumnTitle(item.title)}&nbsp;</Text>}
                                                                    {item.notes &&
                                                                        <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                            {`${item?.title ? '(' : ''}`}
                                                                            {normalizePdfText(item.notes)}
                                                                            {`${item?.title ? ')' : ''}`}
                                                                        </Text>
                                                                    }
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{customModule?.content.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                                </Text>
                                                            );
                                                        }
                                                    })}
                                                </Text>
                                            );
                                        } else if (option?.format === 'listview') {
                                            const moduleName = customModule?.name || customModule?.module_name;
                                            return (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: getIndianLanguageFont(moduleName, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>{moduleName}:&nbsp;</Text>
                                                    {customModule?.content.map((item, i) => {
                                                        if (isV2) {
                                                            // V2: Render all fields with their keys as labels in format: 1.<Field1>: <Value>, <Field2>: <Value>, ...
                                                            const fieldEntries = fieldKeys
                                                                .map(fieldKey => ({
                                                                    label: getFieldLabel(fieldKey),
                                                                    value: item[fieldKey]
                                                                }))
                                                                .filter(entry => entry.value?.trim?.().length > 0);
                                                            
                                                            if (fieldEntries.length === 0) return null;

                                                            return (
                                                                <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;&nbsp;&nbsp;{i + 1}.</Text>
                                                                    {fieldEntries.map((entry, idx) => (
                                                                        <Text key={idx}>
                                                                            <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(entry.label, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>
                                                                                {entry.label}:&nbsp;
                                                                            </Text>
                                                                            <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(entry.value, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                {normalizePdfText(entry.value)}
                                                                            </Text>
                                                                            {idx < fieldEntries.length - 1 && <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>, </Text>}
                                                                        </Text>
                                                                    ))}
                                                                </Text>
                                                            );
                                                        } else {
                                                            // V1: Original rendering
                                                            return (
                                                                <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                                    {item.title && <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(formatCustomModuleColumnTitle(item?.title), printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{formatCustomModuleColumnTitle(item.title)}&nbsp;</Text>}
                                                                    {item.notes &&
                                                                        <Text style={{ color: '#171725', fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                            {`${item?.title ? '(' : ''}`}
                                                                            {normalizePdfText(item.notes)}
                                                                            {`${item?.title ? ')' : ''}`}
                                                                        </Text>
                                                                    }
                                                                </Text>
                                                            );
                                                        }
                                                    })}
                                                </View>
                                            );
                                        } else {
                                            // Table format (same as consult follow dynamic modules: two-column table with header)
                                            const moduleName = customModule?.name || customModule?.module_name;
                                            return (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: getIndianLanguageFont(moduleName, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>{moduleName}:&nbsp;</Text>
                                                    <View style={styles.table}>
                                                        <View style={styles.headerRowFixed} fixed/>
                                                        {customModule.module_version === "v2" ? (
                                                            // V2: When order === 0, single column (header = field key; rows = values). Else multi-column.
                                                            isV2SingleColumn ? (
                                                                <View style={[styles.row, { backgroundColor: '#f5f5f5' }]} wrap={false}>
                                                                    <Text style={[styles.dynamicModuleCell, { flex: 1, color: '#171725', fontFamily: getIndianLanguageFont(getFieldLabel(fieldKeys[0]), printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }]}>
                                                                        {getFieldLabel(fieldKeys[0])}&nbsp;
                                                                    </Text>
                                                                </View>
                                                            ) : (
                                                                <View style={[styles.row, { backgroundColor: '#f5f5f5' }]} wrap={false}>
                                                                    {fieldKeys.map((fieldKey, idx) => {
                                                                        const flexPerColumn = 1 / fieldKeys.length;
                                                                        return (
                                                                            <Text 
                                                                                key={idx}
                                                                                style={[
                                                                                    styles.dynamicModuleCell, 
                                                                                    { 
                                                                                        flex: flexPerColumn, 
                                                                                        color: '#171725', 
                                                                                        fontFamily: getIndianLanguageFont(getFieldLabel(fieldKey), printSettings?.page_format?.font_family), 
                                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                        fontWeight: 700,
                                                                                    }
                                                                                ]}
                                                                            >
                                                                                {getFieldLabel(fieldKey)}&nbsp;
                                                                            </Text>
                                                                        );
                                                                    })}
                                                                </View>
                                                            )
                                                        ) : (
                                                            // V1: single item with "Label: Value" in notes → one column (header = Label, row = Value). Else two-column NAME | VALUE.
                                                            (() => {
                                                                const first = customModule?.content?.[0];
                                                                const notesStr = first?.notes && String(first.notes).trim();
                                                                const colonIdx = notesStr && notesStr.includes(':') ? notesStr.indexOf(':') : -1;
                                                                const isV1SingleColumn = customModule?.content?.length === 1 && colonIdx > 0 && colonIdx < notesStr.length - 1;
                                                                const v1Label = isV1SingleColumn ? formatCustomModuleColumnTitle(notesStr.slice(0, colonIdx).trim()) : null;
                                                                const v1Value = isV1SingleColumn ? notesStr.slice(colonIdx + 1).trim() : null;
                                                                if (isV1SingleColumn && v1Label != null && v1Value != null) {
                                                                    return (
                                                                        <View style={[styles.row, { backgroundColor: '#f5f5f5' }]} wrap={false}>
                                                                            <Text style={[styles.dynamicModuleCell, { flex: 1, color: '#171725', fontFamily: getIndianLanguageFont(v1Label, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }]}>
                                                                                {v1Label}&nbsp;
                                                                            </Text>
                                                                        </View>
                                                                    );
                                                                }
                                                                return (
                                                                    <View style={[styles.row, { backgroundColor: '#f5f5f5' }]} wrap={false}>
                                                                        <Text style={[styles.dynamicModuleCell, { flex: 0.3, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }]}>NAME&nbsp;</Text>
                                                                        <Text style={[styles.dynamicModuleCell, { flex: 0.7, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }]}>VALUE&nbsp;</Text>
                                                                    </View>
                                                                );
                                                            })()
                                                        )}
                                                        {customModule?.content.map((item, i) => {
                                                            if (customModule.module_version === "v2") {
                                                                // V2 with order === 0: single column – one cell per row (value only)
                                                                if (isV2SingleColumn) {
                                                                    const value = item[fieldKeys[0]] != null ? String(item[fieldKeys[0]]).trim() : '-';
                                                                    return (
                                                                        <View style={styles.row} key={i} wrap={false}>
                                                                            <Text style={[styles.dynamicModuleCell, { flex: 1, color: '#171725', fontFamily: getIndianLanguageFont(value, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>
                                                                                {value || '-'}&nbsp;
                                                                            </Text>
                                                                        </View>
                                                                    );
                                                                }
                                                                // V2 multi-column: Render all fields in columns using fieldKeys from content
                                                                const fieldValues = fieldKeys.map(fieldKey => item[fieldKey] || '-');
                                                                const flexPerColumn = 1 / fieldKeys.length;
                                                                
                                                                return (
                                                                    <View style={styles.row} key={i} wrap={false}>
                                                                        {fieldValues.map((value, idx) => (
                                                                            <Text 
                                                                                key={idx}
                                                                                style={[
                                                                                    styles.dynamicModuleCell, 
                                                                                    { 
                                                                                        flex: flexPerColumn, 
                                                                                        color: '#171725', 
                                                                                        fontFamily: getIndianLanguageFont(value, printSettings?.page_format?.font_family), 
                                                                                        fontSize: PX_TO_PT * printSettings?.page_format?.font_size, 
                                                                                        fontWeight: 500 
                                                                                    }
                                                                                ]}
                                                                            >
                                                                                {value}&nbsp;
                                                                            </Text>
                                                                        ))}
                                                                    </View>
                                                                );
                                                            } else {
                                                                // V1: Single item with "Label: Value" in notes → one column (value only). Else two columns.
                                                                const notesStr = item?.notes && String(item.notes).trim();
                                                                const colonIdx = notesStr && notesStr.includes(':') ? notesStr.indexOf(':') : -1;
                                                                const isV1SingleCol = customModule?.content?.length === 1 && colonIdx > 0 && colonIdx < (notesStr?.length ?? 0) - 1;
                                                                if (isV1SingleCol) {
                                                                    const val = normalizePdfText(notesStr.slice(colonIdx + 1).trim()) || '-';
                                                                    return (
                                                                        <View style={styles.row} key={i} wrap={false}>
                                                                            <Text style={[styles.dynamicModuleCell, { flex: 1, color: '#171725', fontFamily: getIndianLanguageFont(val, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{val}&nbsp;</Text>
                                                                        </View>
                                                                    );
                                                                }
                                                                const col1 = (item?.title && String(item.title).trim()) ? item.title : (i + 1);
                                                                const col2 = (item?.notes && String(item.notes).trim()) ? normalizePdfText(item.notes) : '-';
                                                                return (
                                                                    <View style={styles.row} key={i} wrap={false}>
                                                                        <Text style={[styles.dynamicModuleCell, { flex: 0.3, color: '#171725', fontFamily: getIndianLanguageFont(col1, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{col1}&nbsp;</Text>
                                                                        <Text style={[styles.dynamicModuleCell, { flex: 0.7, color: '#171725', fontFamily: getIndianLanguageFont(col2, printSettings?.page_format?.font_family), fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{col2}&nbsp;</Text>
                                                                    </View>
                                                                );
                                                            }
                                                        })}
                                                    </View>
                                                </View>
                                            );
                                        }
                                    })()
                                ) : option?.id === 17 && option?.enable === 'Y' && option?.custom_status === 'Y' && (patientBills?.length > 0 || advanceReceipts?.length > 0) ? (
                                    <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                        <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Payment:&nbsp;</Text>
                                        {patientBills?.map((patientBill, i) => {
                                            const paymentModes = patientBill?.paymentModes?.map((item) => item?.paymentMode) || [];
                                            const formattedPaymentModes =
                                            paymentModes.length > 1
                                                ? paymentModes.slice(0, -1).join(", ") + " & " + paymentModes[paymentModes.length - 1]
                                                : paymentModes.join("");
                                                if (patientBill?.paymentStatus !== "Refunded") {
                                                    return (
                                                        <Text key={i} style={{ color: "#171725", fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, }}>
                                                            {"\n"}
                                                            {`Received ₹${patientBill?.paidAmount} via ${formattedPaymentModes} for ( ${patientBill?.billItems
                                                            ?.map((item) => `${item?.name}: ₹${item?.totalAmount}`)
                                                            .join(" | ")}${patientBill?.dueAmount ? ` | Due Amount: ₹${patientBill?.dueAmount}` : ""} )`}
                                                        </Text>
                                                    )
                                            }
                                        })}
                                        {advanceReceipts?.map((advanceReceipt, i) => {
                                            const paymentModes = advanceReceipt?.paymentModes?.map((item) => item?.paymentMode) || [];
                                            const formattedPaymentModes =
                                            paymentModes.length > 1
                                                ? paymentModes.slice(0, -1).join(", ") + " & " + paymentModes[paymentModes.length - 1]
                                                : paymentModes.join("");
                                            if (advanceReceipt?.transactionType !== "Refund") {
                                                return (
                                                    <Text key={i} style={{ color: "#171725", fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, }}>
                                                        {"\n"}
                                                        {`Advance Deposit Received with thanks ₹${advanceReceipt?.totalAmount} via ${formattedPaymentModes}`}
                                                    </Text>
                                                )
                                            }
                                        })}
                                        {patientWalletBalance > 0 && (<Text style={{ color: "#171725", fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400, }}>
                                            {"\n"}
                                            {`Available Advance Balance ₹${patientWalletBalance}`}
                                        </Text>)}
                                    </Text>
                                ) : option?.id === 19 && option?.enable === 'Y' && option?.custom_status === 'Y' && activeCarePlans?.length > 0 ? (
                                    <>
                                        {activeCarePlans.length > 0 && (
                                            option?.format === 'inline' ? (
                                                <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Care Plan:&nbsp;</Text>
                                                    {activeCarePlans.map((item, i) => (
                                                        <Text key={i}>
                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item?.plan_name}&nbsp;</Text>
                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${moment(item?.created_date).format('DD MMM YYYY')})`}</Text>
                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{activeCarePlans.length - 1 !== i ? ',' : ''}&nbsp;</Text>
                                                        </Text>
                                                    ))}
                                                </Text>
                                            ) : option?.format === 'listview' ? (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Care Plan:&nbsp;</Text>
                                                    {activeCarePlans.map((item, i) => (
                                                        <Text key={i} style={{ marginTop: PX_TO_PT * (i === 0 ? 4 : 2), lineHeight: 1.4 }}>
                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item?.plan_name}&nbsp;</Text>
                                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${moment(item?.created_date).format('DD MMM YYYY')})`}</Text>
                                                        </Text>
                                                    ))}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: PX_TO_PT * 15 }}>
                                                    <Text fixed style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700, marginBottom: PX_TO_PT * 6 }}>Care Plan:&nbsp;</Text>
                                                    <View style={styles.table}>
                                                        <View style={styles.headerRow} fixed>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>PLAN NAME</Text>
                                                            <Text style={[styles.headerCell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>ASSIGNED DATE</Text>
                                                        </View>
                                                        {activeCarePlans.map((item, i) => (
                                                            <View style={styles.row} key={i} wrap={false}>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item?.plan_name}&nbsp;</Text>
                                                                <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{moment(item?.created_date).format('DD MMM YYYY')}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )
                                        )}
                                    </>
                                ) : null}
                                </View>
                            )
                        
                        })}
                            </>
                        );
                        })()}
                    {/* </View> */}

                    <View style={{ marginTop: PX_TO_PT * 29 }} wrap={false}>
                        {printSettings?.signature_enable === 'Y' && fileSignature && fileSignature?.imageShow && (
                            <View style={{ alignSelf: printSettings?.header_footer?.other_settings?.signature_place === 'R' && 'flex-end' }}>
                                {fileSignature?.showFile && (
                                    <Image
                                        style={{ width: 139, height: 60, objectFit: 'contain' }}
                                        src={fileSignature?.showFile} />
                                )}
                            </View>
                        )}

                        {printSettings?.qrcode_enable === 'Y' && printSettings?.signature_enable === 'Y' ? (
                            printSettings?.header_footer?.other_settings?.signature_place === 'R' ? (
                                <View style={styles.directionCasemanager}>
                                    <View style={[styles.directionCasemanager, { flex: 1 }]} >
                                        {printSettings?.qrcode && (
                                            <>
                                                <Image
                                                    style={{ width: 61, height: 61, objectFit: 'contain' }}
                                                    src={printSettings?.qrcode} />
                                                <Text style={{ fontSize: PX_TO_PT * 10, color: '#000', fontFamily: 'Roboto', fontWeight: 400 }}>
                                                    {`Scan QR code to book an appointment\nwith your doctor`}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                    <View style={{ flex: 1, textAlign: 'right' }} >
                                        {printSettings?.header_footer?.other_settings?.name_of_doctor_enable === 'Y' && (
                                            <Text style={[styles.extraText, { fontWeight: 700, color: '#000' }]}>
                                                {caseManagerData?.doctor_data?.doctor_name}
                                            </Text>
                                        )}
                                        {printSettings?.header_footer?.other_settings?.registration_no_enable === 'Y' && (
                                            <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                                Medical Registration No.: {caseManagerData?.doctor_data?.gmc_no}
                                            </Text>
                                        )}
                                        {printSettings?.header_footer?.other_settings?.qualification_enable === 'Y' && (
                                            <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                                {printSettings?.header_footer?.other_settings?.qualification ? printSettings?.header_footer?.other_settings?.qualification : caseManagerData?.doctor_data?.um_qualifications}
                                            </Text>
                                        )}
                                        {isTeleconsultType2 && (
                                            <Text style={[styles.extraText, { fontWeight: 400, color: '#000', marginBottom: PX_TO_PT * 20 }]}>
                                                Note: This Prescription generated via teleconsultation.
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ flex: 1 }} >
                                        {printSettings?.header_footer?.other_settings?.name_of_doctor_enable === 'Y' && (
                                            <Text style={[styles.extraText, { fontWeight: 700, color: '#000' }]}>
                                                {caseManagerData?.doctor_data?.doctor_name}
                                            </Text>
                                        )}
                                        {printSettings?.header_footer?.other_settings?.registration_no_enable === 'Y' && (
                                            <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                                Medical Registration No.: {caseManagerData?.doctor_data?.gmc_no}
                                            </Text>
                                        )}
                                        {printSettings?.header_footer?.other_settings?.qualification_enable === 'Y' && (
                                            <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                                {printSettings?.header_footer?.other_settings?.qualification ? printSettings?.header_footer?.other_settings?.qualification : caseManagerData?.doctor_data?.um_qualifications}
                                            </Text>
                                        )}
                                        {isTeleconsultType2 && (
                                            <Text style={[styles.extraText, { fontWeight: 400, color: '#000', marginBottom: PX_TO_PT * 20 }]}>
                                                Note: This Prescription generated via teleconsultation.
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[styles.directionCasemanager, { flex: 1, justifyContent: 'flex-end' }]}>
                                        {printSettings?.qrcode && (
                                            <>
                                                <Image
                                                    style={{ width: 61, height: 61, objectFit: 'contain' }}
                                                    src={printSettings?.qrcode} />
                                                <Text style={{ fontSize: PX_TO_PT * 10, color: '#000', fontFamily: 'Roboto', fontWeight: 400 }}>
                                                    {`Scan QR code to book an appointment\nwith your doctor`}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                            )
                        ) : (printSettings?.qrcode_enable === 'Y' || printSettings?.signature_enable === 'Y') && (
                            <View style={{ flexDirection: 'row' }}>
                                {printSettings?.qrcode_enable === 'Y' && (
                                    <View style={styles.directionCasemanager}>
                                        {printSettings?.qrcode && (
                                            <>
                                                <Image
                                                    style={{ width: 61, height: 61, objectFit: 'contain' }}
                                                    src={printSettings?.qrcode} />
                                                <Text style={{ fontSize: PX_TO_PT * 10, color: '#000', fontFamily: 'Roboto', fontWeight: 400 }}>
                                                    {`Scan QR code to book an appointment\nwith your doctor`}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                )}
                                {printSettings?.signature_enable === 'Y' && (
                                    <View style={{ flex: 1, textAlign: printSettings?.header_footer?.other_settings?.signature_place === 'R' && 'right' }} >
                                        {printSettings?.header_footer?.other_settings?.name_of_doctor_enable === 'Y' && (
                                            <Text style={[styles.extraText, { fontWeight: 700, color: '#000' }]}>
                                                {caseManagerData?.doctor_data?.doctor_name}
                                            </Text>
                                        )}
                                        {printSettings?.header_footer?.other_settings?.registration_no_enable === 'Y' && (
                                            <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                                Medical Registration No.: {caseManagerData?.doctor_data?.gmc_no}
                                            </Text>
                                        )}
                                        {printSettings?.header_footer?.other_settings?.qualification_enable === 'Y' && (
                                            <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                                {printSettings?.header_footer?.other_settings?.qualification ? printSettings?.header_footer?.other_settings?.qualification : caseManagerData?.doctor_data?.um_qualifications}
                                            </Text>
                                        )}
                                        {isTeleconsultType2 && (
                                            <Text style={[styles.extraText, { fontWeight: 400, color: '#000', marginBottom: PX_TO_PT * 20 }]}>
                                                Note: This Prescription generated via teleconsultation.
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Bottom spacer for Own Letterhead first-page-only mode */}
                    {/* <View
                        fixed
                        render={({ pageNumber }) => {
                            const isFirstPage = pageNumber === 1;
                            const isOwnLetterheadFirstPageOnly = printSettings?.letterhead_format === 2 && showMode === 'first';
                            
                            if (isOwnLetterheadFirstPageOnly && isFirstPage) {
                                // On first page, add bottom spacer to match user's intended letterhead margins
                                const userBottomMargin = getMarginByFormat(printSettings?.letterhead_format, printSettings?.header_footer, "bottom", 0.5);
                                const standardMargin = 0.5 * 25; // 0.5 inches in points
                                const extraBottomSpace = Math.max(0, userBottomMargin - standardMargin);
                                
                                return (
                                    <View style={{
                                        marginBottom: extraBottomSpace,
                                        height: 0,
                                    }} />
                                );
                            }
                            return null;
                        }}
                    /> */}

                    {(
                        <View
                            style={{
                              position: 'absolute',
                              bottom: getMarginByFormat(printSettings?.letterhead_format, printSettings?.header_footer, "bottom", 0.5),
                              left: mode !== NORMAL ? PX_TO_PT * 30 : getMarginByFormat(printSettings?.letterhead_format, printSettings?.header_footer, "left", 0.5),
                              right: mode !== NORMAL ? PX_TO_PT * 30 : getMarginByFormat(printSettings?.letterhead_format, printSettings?.header_footer, "right", 0.5),
                            }}
                            fixed
                            render={({ pageNumber }) => {
                              if (pageNumber === 1 || (pageNumber > 1 && showMode === 'all')) {
                                return (
                                  <View>
                                    {mode === NORMAL ? (
                                      printSettings?.letterhead_format === 0 ? (
                                        <View>
                                          {printSettings?.header_footer?.footer?.title && (
                                            <View style={{ backgroundColor: '#171725', height: PX_TO_PT * 2, width: '100%' }} />
                                          )}
                                          <Text
                                            style={{
                                              marginTop: PX_TO_PT * 8,
                                              color: '#171725',
                                              fontFamily: 'Roboto',
                                              fontSize: PX_TO_PT * printSettings?.header_footer?.footer?.font_size,
                                              fontWeight: 400,
                                              maxLines: 1,
                                            }}
                                          >
                                            {printSettings?.header_footer?.footer?.title}
                                          </Text>
                                        </View>
                                      ) : printSettings?.letterhead_format === 1 && (
                                        renderFooterImage()
                                      )
                                    ) : (
                                      printSettings?.whatsapp_letterhead_format === 0 ? (
                                        <View>
                                          {printSettings?.header_footer?.footer?.title && (
                                            <View style={{ backgroundColor: '#171725', height: PX_TO_PT * 2, width: '100%' }} />
                                          )}
                                          <Text
                                            style={{
                                              marginTop: PX_TO_PT * 8,
                                              color: '#171725',
                                              fontFamily: 'Roboto',
                                              fontSize: PX_TO_PT * printSettings?.header_footer?.footer?.font_size,
                                              fontWeight: 400,
                                              maxLines: 1,
                                            }}
                                          >
                                            {printSettings?.header_footer?.footer?.title}
                                          </Text>
                                        </View>
                                      ) : (
                                        printSettings?.whatsapp_letterhead_format === 1 &&
                                        fileFooter &&
                                        fileFooter?.imageShow &&
                                        renderFooterImage()
                                      )
                                    )}
                                  </View>
                                );
                              }
                              return null;
                            }}
                          />
                    )} 
                    

                               
                      {printSettings?.page_format?.pagination === true && <PageNumberFooter />}
                             
                      </Page>
                      )}
                      {structuralTeethDiagramImgUrl && (
                        <Page
                            size="A4"
                            style={{
                                paddingTop: 0,
                                paddingBottom: 0,
                                paddingLeft: 0,
                                paddingRight: 0,
                            }}
                            wrap={false}
                        >
                            <View style={{ width: "100%", height: "100%" }}>
                                <Image
                                    style={{ width: "100%", height: "100%" }}
                                    src={structuralTeethDiagramImgUrl}
                                    objectFit="contain"
                                />
                            </View>
                        </Page>
                      )}
                      </Document>
                          )
                      }
                      
                      export default React.memo(ViewPDF)  
