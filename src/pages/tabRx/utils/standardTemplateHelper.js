import { getTokenData } from '../../../utils/utils';
import { A4_BASE_WIDTH, A4_BASE_HEIGHT } from './constants';

export const generateStandardTemplateBackground = (profile) => {
    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = A4_BASE_WIDTH;
    canvas.height = A4_BASE_HEIGHT;
    const ctx = canvas.getContext('2d');

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Extract Profile Data
    const doctorName = profile?.um_name ? `${profile.um_name}` : 'Doctor Name';
    const speciality = profile?.dp_name || '';
    const tokenData = getTokenData();
    const hospital = profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id) || {};
    const clinicName = hospital?.hm_name || 'Clinic Name';
    const address = hospital?.hm_address || '';
    const city = hospital?.hm_city || '';
    const state = hospital?.hm_state || '';
    const phone = profile?.um_contact || hospital?.hm_contact1 || '';
    const email = profile?.um_email || hospital?.hm_email || '';

    const purpleColor = '#A352D1';
    const textColor = '#333333';
    const lineColor = '#000000';

    // --- HEADER ---

    // Doctor Info (Top Left)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = purpleColor;
    ctx.fillText(doctorName, 40, 60);

    ctx.font = '16px Arial';
    ctx.fillStyle = textColor;
    ctx.fillText(speciality, 40, 85);

    // Clinic Info (Top Right)
    ctx.textAlign = 'right';

    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = purpleColor;
    ctx.fillText(clinicName, A4_BASE_WIDTH - 40, 60);

    ctx.font = '16px Arial';
    ctx.fillStyle = textColor;
    let currentY = 85;
    if (address) {
        ctx.fillText(address, A4_BASE_WIDTH - 40, currentY);
        currentY += 22;
    }
    if (city) {
        ctx.fillText(city, A4_BASE_WIDTH - 40, currentY);
        currentY += 22;
    }
    if (state) {
        ctx.fillText(state, A4_BASE_WIDTH - 40, currentY);
        currentY += 22;
    }

    // Header bottom border line
    const headerLineY = Math.max(120, currentY + 10);
    ctx.beginPath();
    ctx.moveTo(40, headerLineY);
    ctx.lineTo(A4_BASE_WIDTH - 40, headerLineY);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();


    // --- FOOTER ---

    const footerLineY = A4_BASE_HEIGHT - 60;

    // Footer top border line
    ctx.beginPath();
    ctx.moveTo(40, footerLineY);
    ctx.lineTo(A4_BASE_WIDTH - 40, footerLineY);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Footer Text (Bottom Left)
    ctx.textAlign = 'left';
    ctx.font = '14px Arial';
    ctx.fillStyle = textColor;

    const footerTextParts = [];
    if (clinicName) footerTextParts.push(clinicName);
    if (phone) footerTextParts.push(phone);
    if (email) footerTextParts.push(email);

    ctx.fillText(footerTextParts.join('  |  '), 40, footerLineY + 15);

    // Return base64 URL of the background
    return canvas.toDataURL('image/png');
};
