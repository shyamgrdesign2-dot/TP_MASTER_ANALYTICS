import { getTokenData } from '../../../utils/utils';
import { A4_BASE_WIDTH, A4_BASE_HEIGHT } from '../../tabRx/utils/constants';
import moment from 'moment';

/**
 * Load a remote image in a way that does not taint the canvas (required for toDataURL).
 * Order: fetch+CORS blob → ImageBitmap, then Image with crossOrigin=anonymous.
 */
const loadBackgroundDrawable = async (src) => {
    if (!src) return null;

    if (String(src).startsWith('data:')) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('data URL image load failed'));
            img.src = src;
        });
    }

    try {
        const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const blob = await res.blob();
        return await createImageBitmap(blob);
    } catch {
        try {
            return await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('CORS image load failed'));
                img.src = src;
            });
        } catch {
            return null;
        }
    }
};

const getPatientValue = (patient, keys, fallback = '-') => {
    for (const key of keys) {
        const value = patient?.[key];
        if (value !== undefined && value !== null && value !== '') {
            return String(value);
        }
    }
    return fallback;
};

const SHOW_DATE_FORMAT = 'DD/MM/YYYY';

const formatAppointmentDate = (value) => {
    if (!value) return '-';
    const raw = String(value).trim();
    const normalizedRaw = raw
        .replace(/^['"]+|['"]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const parseFormats = [
        SHOW_DATE_FORMAT,
        'DD/MM/YYYY',
        'DD-MM-YYYY',
        'Do MMM YYYY',
        'D MMM YYYY',
        'Do MMMM YYYY',
        'D MMMM YYYY',
        'YYYY-MM-DD',
        'YYYY/MM/DD',
        'DD/MM/YYYY hh:mm A',
        'DD/MM/YYYY h:mmA',
        'DD-MM-YYYY hh:mm A',
        'DD-MM-YYYY h:mmA',
        'YYYY-MM-DD HH:mm:ss',
        moment.ISO_8601
    ];

    const parsedKnownFormat = moment(normalizedRaw, parseFormats, 'en', true);

    if (parsedKnownFormat.isValid()) {
        return parsedKnownFormat.format(SHOW_DATE_FORMAT);
    }

    // Relaxed parse helps when backend adds small format deviations.
    const parsedRelaxed = moment(normalizedRaw, parseFormats, 'en', false);
    if (parsedRelaxed.isValid()) {
        return parsedRelaxed.format(SHOW_DATE_FORMAT);
    }

    const parsedFallback = moment(normalizedRaw);
    if (parsedFallback.isValid()) {
        return parsedFallback.format(SHOW_DATE_FORMAT);
    }

    return normalizedRaw;
};

const formatAppointmentDateTime = (dateValue, timeValue) => {
    const formattedDate = formatAppointmentDate(dateValue);
    const formattedTime = timeValue;

    if (formattedDate === '-' && formattedTime === '-') return '-';
    if (formattedTime === '-') return formattedDate;
    if (formattedDate === '-') return formattedTime;
    return `${formattedDate} ${formattedTime}`;
};

const normalizeDoctorName = (name) => {
    if (!name) return 'Dr. -';
    const str = String(name).trim();
    if (/^dr\.?/i.test(str)) return str;
    return `Dr. ${str}`;
};

const DUMMY_PATIENT_DATA = {
    visitDate: '08/04/2026 09:17 AM',
    visitTime: '9:17AM',
    uhid: '816172',
    mobile: '9732300610',
    age: '63 Yrs',
    sex: 'Male',
    patientName: 'Mr. BISWANATH ROY',
    payer: 'CASH',
    address: 'VILL- PARABATPUR, PO- SAMDI, PS-SALANPUR, PIN - 713359'
};

export const generateMissionHosTemplateBackground = async (profile, patient = null, options = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = options?.outputWidth || A4_BASE_WIDTH;
    canvas.height = options?.outputHeight || A4_BASE_HEIGHT;
    const ctx = canvas.getContext('2d');
    const scaleX = canvas.width / A4_BASE_WIDTH;
    const scaleY = canvas.height / A4_BASE_HEIGHT;
    const fontScale = Math.min(scaleX, scaleY);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const backgroundImageSrc = options?.backgroundImageSrc || null;
    if (backgroundImageSrc) {
        const drawable = await loadBackgroundDrawable(backgroundImageSrc);
        if (drawable) {
            try {
                ctx.drawImage(drawable, 0, 0, canvas.width, canvas.height);
            } finally {
                if (drawable && typeof drawable.close === 'function') {
                    drawable.close();
                }
            }
        }
    }

    // Hide artifact lines from template image edges.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, 2);
    ctx.fillRect(0, 0, 2, canvas.height);

    const tokenData = getTokenData();
    const hospitalId = patient?.hm_id || patient?.clinic_id || tokenData?.clinic_id;
    const hospital = profile?.hospital_data?.find((e) => e.hm_id == hospitalId) || {};

    const doctorName = normalizeDoctorName(profile?.um_name);
    const visitDateRaw = getPatientValue(patient, ['apDate', 'consultation_date', 'date'], DUMMY_PATIENT_DATA.visitDate);
    const visitTimeRaw = getPatientValue(patient, ['apTime', 'consultation_time', 'time'], DUMMY_PATIENT_DATA.visitTime);
    const visitDate = formatAppointmentDateTime(visitDateRaw, visitTimeRaw);
    const uhid = getPatientValue(patient, ['pm_reference_id','uhid', 'patient_uhid', 'patientUHID', 'pm_pid', 'patient_unique_id', 'id'], "");
    const mobile = getPatientValue(patient, ['mobile', 'phone', 'contact', 'pt_mobile', 'pm_contact_no'], DUMMY_PATIENT_DATA.mobile);
    const age = getPatientValue(patient, ['ageYears'], "");
    const sex = getPatientValue(patient, ['pm_gender'], "");
    const patientName = getPatientValue(patient, ['pm_fullname'], "");
    const payer = getPatientValue(patient, ['payment_type', 'payer', 'payment_mode'], DUMMY_PATIENT_DATA.payer);
    const shouldKeepAddressBlank = options?.forceBlankAddress === true;
    const address = shouldKeepAddressBlank
        ? ''
        : getPatientValue(patient, ['pm_address'], hospital?.hm_address || DUMMY_PATIENT_DATA.address);

    // Patient header block geometry tuned to Mission Hos printed pad:
    // margins are intentionally asymmetrical to match the scanned template.
    const sectionLeft = 18 * scaleX;
    const sectionRight = 14 * scaleX;
    const sectionX = sectionLeft;
    const sectionY = 94 * scaleY;
    const sectionWidth = canvas.width - sectionLeft - sectionRight;
    const sectionHeight = 108 * scaleY;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sectionX, sectionY, sectionWidth, sectionHeight);

    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;

    const bottomDividerY = sectionY + sectionHeight;
    ctx.beginPath();
    ctx.moveTo(sectionX, bottomDividerY);
    ctx.lineTo(sectionX + sectionWidth, bottomDividerY);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#121212';
    ctx.font = `bold ${Math.max(11, Math.round(13 * fontScale))}px Arial`;

    const row1Y = sectionY + (8 * scaleY);
    const row2Y = sectionY + (34 * scaleY);
    const row3Y = sectionY + (60 * scaleY);
    const row4Y = sectionY + (86 * scaleY);

    const leftLabelX = sectionX + (6 * scaleX);
    const leftValueX = sectionX + (94 * scaleX);
    const midLabelX = sectionX + (290 * scaleX);
    const midValueX = sectionX + (376 * scaleX);
    const rightLabelX = sectionX + (474 * scaleX);
    const rightValueX = sectionX + (590 * scaleX);

    ctx.fillText(`Date`, leftLabelX, row1Y);
    ctx.fillText(`: ${visitDate}`, leftValueX, row1Y);
    ctx.fillText(`Doctor`, midLabelX, row1Y);
    ctx.fillText(`: ${doctorName}`, midValueX, row1Y);

    ctx.fillText(`UHID`, leftLabelX, row2Y);
    ctx.fillText(`: ${uhid}`, leftValueX, row2Y);
    ctx.fillText(`Mob`, midLabelX, row2Y);
    ctx.fillText(`: ${mobile}`, midValueX, row2Y);
    ctx.fillText(`Sex / Age`, rightLabelX, row2Y);
    ctx.fillText(`: ${sex} / ${age}`, rightValueX, row2Y);

    ctx.fillText(`Patient`, leftLabelX, row3Y);
    ctx.fillText(`: ${patientName}`, leftValueX, row3Y);
    ctx.fillText(`Payer`, rightLabelX - (20 * scaleX), row3Y);
    ctx.fillText(`: ${payer}`, rightValueX - (52 * scaleX), row3Y);

    ctx.fillText(`Address`, leftLabelX, row4Y);
    ctx.fillText(`: ${address}`, leftValueX, row4Y);

    try {
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.warn('[generateMissionHosTemplateBackground] toDataURL failed, falling back to text-only layer', e);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#121212';
        ctx.font = `bold ${Math.max(11, Math.round(13 * fontScale))}px Arial`;
        ctx.fillText(`Patient: ${patientName}`, sectionX + (8 * scaleX), sectionY + (20 * scaleY));
        return canvas.toDataURL('image/png');
    }
};
