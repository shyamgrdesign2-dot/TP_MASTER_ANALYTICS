import React from 'react';
import { Font, Page, Text, View, Image, Document, StyleSheet } from '@react-pdf/renderer';
import { NORMAL, WHATSAPP, TP_ASSETS_BASE } from '../../utils/constants';
import Html from 'react-pdf-html';

const PX_TO_PT = 0.75

// Register only Roboto font - other fonts will fallback to Roboto via CSS
try {
    Font.register({
        family: 'Roboto',
        fonts: [
            { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Regular.ttf`, fontWeight: 400 },
            { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Medium.ttf`, fontWeight: 500 },
            { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Bold.ttf`, fontWeight: 700 },
            { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Italic.ttf`, fontStyle: 'italic' },
            { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-MediumItalic.ttf`, fontWeight: 500, fontStyle: 'italic' },
            { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-BoldItalic.ttf`, fontWeight: 700, fontStyle: 'italic' },
        ],
    });
} catch (error) {
    console.error("Font registration error:", error);
}

// Hyphenation callback to handle unknown fonts - fallback to Roboto
Font.registerHyphenationCallback((word) => [word]);

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
    extraText: {
        fontSize: PX_TO_PT * 12,
        color: '#171725',
        fontFamily: 'Roboto',
    },
    directionCasemanager: {
        flexDirection: 'row',
        alignItems: 'center'
    }
});

const normalizeLetterheadFormat = (letterheadFormat) => {
    if (typeof letterheadFormat === 'string' && letterheadFormat.trim() !== '') {
        const parsed = Number(letterheadFormat);
        return Number.isNaN(parsed) ? letterheadFormat : parsed;
    }
    return letterheadFormat;
};

const getMarginByFormat = (
    letterheadFormat,
    headerFooter,
    position,
    defaultValue,
) => {
    const normalizedFormat = normalizeLetterheadFormat(letterheadFormat);
    const marginType =
        normalizedFormat === 0
            ? 'custom_letterhead_margin'
            : normalizedFormat === 1
                ? 'uploaded_letterhead_margin'
                : normalizedFormat === 2
                    ? 'margin'
                    : null;

    return marginType && headerFooter?.[marginType]?.[position] >= 0
        ? (headerFooter?.[marginType]?.[position] || defaultValue) * 25
        : PX_TO_PT * 30;
};

const ViewCertificatePDF = ({ mode = NORMAL, ...props }) => {

    const { printSettings, fileHeader, fileFooter, fileLogo, fileWatermark, fileSignature, heading, content, doctorData } = props

    const headerFooter = printSettings?.header_footer;
    const letterheadFormat = normalizeLetterheadFormat(
        printSettings?.letterhead_format
    );

    const normalPaddingTop = getMarginByFormat(
        letterheadFormat,
        headerFooter,
        'top',
        0.5,
    );
    const normalPaddingLeft = getMarginByFormat(
        letterheadFormat,
        headerFooter,
        'left',
        0.5,
    );
    const normalPaddingRight = getMarginByFormat(
        letterheadFormat,
        headerFooter,
        'right',
        0.5,
    );
    const normalPaddingBottom = getMarginByFormat(
        letterheadFormat,
        headerFooter,
        'bottom',
        0.5,
    );

    const footerFontSize = parseInt(headerFooter?.footer?.font_size, 10);
    const footerTitleSpacing = headerFooter?.footer?.title
        ? 35 + (Number.isNaN(footerFontSize) ? 0 : footerFontSize)
        : 0;

    const calculatePadding = () => {
        const widthOfA4PageInPts = 595;

        if (mode !== NORMAL) {
            return {
                paddingTop: PX_TO_PT * 30,
                paddingBottom:
                    printSettings?.whatsapp_letterhead_format === 1
                        ? fileFooter?.imageShow
                            ? fileFooter?.renderedFooterImageHeight + PX_TO_PT * 30
                            : getMarginByFormat(letterheadFormat, headerFooter, 'bottom', 0.5) + 5
                        : getMarginByFormat(letterheadFormat, headerFooter, 'bottom', 0.5) + 5,
                paddingLeft: PX_TO_PT * 30,
                paddingRight: PX_TO_PT * 30,
            };
        }

        const paddingBottom =
            letterheadFormat === 1
                ? fileFooter?.imageShow
                    ? ((fileFooter?.footerHeight / fileFooter?.footerWidth) * (widthOfA4PageInPts - (normalPaddingLeft + normalPaddingRight))) + normalPaddingTop
                    : normalPaddingBottom + 5
                : Math.max(normalPaddingBottom + 5, footerTitleSpacing);

        return {
            paddingTop: normalPaddingTop,
            paddingBottom,
            paddingLeft: normalPaddingLeft,
            paddingRight: normalPaddingRight,
        };
    };

    const paddingStyles = calculatePadding();

    const footerOffsetBottom =
        mode === NORMAL
            ? getMarginByFormat(letterheadFormat, headerFooter, 'bottom', 0.5)
            : PX_TO_PT * 30;
    const footerOffsetLeft =
        mode === NORMAL
            ? getMarginByFormat(letterheadFormat, headerFooter, 'left', 0.5)
            : PX_TO_PT * 30;
    const footerOffsetRight =
        mode === NORMAL
            ? getMarginByFormat(letterheadFormat, headerFooter, 'right', 0.5)
            : PX_TO_PT * 30;

    const transformInputToLabel = (html) => {
        let transformedHtml = html.replace(/<input type='date' id='(.*?)' value='(.*?)'>/g, "<label id='$1'>$2</label>");
        transformedHtml = transformedHtml.replace(/<input type='search' id='(.*?)' value='(.*?)'>/g, "<label id='$1'>$2</label>");
        return transformedHtml;
    };

    const convertInputToLabel = (content) => {
        if (!content) return '';
        
        let transformedData = transformInputToLabel(content);
        
        // Remove or replace problematic font-family declarations
        // This handles inline styles like style="font-family: Calibri"
        transformedData = transformedData.replace(/font-family:\s*['"]?[^;'"]+['"]?/gi, 'font-family: Roboto');
        
        // Also remove font-family from any style tags in the content
        transformedData = transformedData.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        
        return transformedData;
    }

    return (
        <Document>
            <Page
                size="A4"
                style={{
                    // flex: 1,
                    ...paddingStyles,
                }}
                wrap>
                {/* <View style={{ flex: 1 }}> */}

                <View style={{ marginBottom: PX_TO_PT * (mode == NORMAL ? letterheadFormat != 2 ? 15 : 0 : 15) }} fixed>
                    {mode == NORMAL ? (
                        letterheadFormat === 0 ? (
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
                        ) : letterheadFormat === 1 && (
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
                                position: 'absolute', top: '50%', left: '45%'
                            }}
                            src={fileWatermark?.showFile}
                            fixed />
                    )
                )}

                <View style={{ backgroundColor: '#171725', height: PX_TO_PT * 2, width: '100%' }} />

                <View>
                    <Html style={{ fontSize: PX_TO_PT * 14, fontFamily: 'Roboto' }}>
                        {`<html>
                            <body>
                                <style>
                                    * {
                                        font-family: Roboto !important; 
                                    }
                                    body {
                                        font-family: Roboto !important; 
                                    }
                                    p, div, span, label, strong, em, h1, h2, h3, h4, h5, h6 {
                                        font-family: Roboto !important;
                                    }
                                    label {
                                        font-weight: 500;
                                    }
                                    strong {
                                        font-weight: 700;
                                    }
                                    strong label {
                                        font-weight: 700;
                                    }
                                    em {
                                        font-style: italic;
                                    }
                                    p {
                                        line-height: 1.4;
                                    }
                                    .certificate-heading {
                                        font-size: ${PX_TO_PT * 20}px;
                                        font-weight: 500; 
                                        text-align: center;
                                        padding: 8px 0px 8px 0px;
                                        border-radius: 7px;
                                        background: #EDDFF7;
                                        margin: 16px 0 8px;
                                    }  
                                </style>
                                <div class="certificate-heading">${heading}</div>
                                ${convertInputToLabel(content)}
                            </body>
                        </html>`}
                    </Html>
                </View>

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
                                                {`Scan QR code to book an appointment\nwith your doctor or download your old\ndigital prescription`}
                                            </Text>
                                        </>
                                    )}
                                </View>
                                <View style={{ flex: 1, textAlign: 'right' }} >
                                    {printSettings?.header_footer?.other_settings?.name_of_doctor_enable === 'Y' && (
                                        <Text style={[styles.extraText, { fontWeight: 700, color: '#000' }]}>
                                            {doctorData?.um_name}
                                        </Text>
                                    )}
                                    {printSettings?.header_footer?.other_settings?.registration_no_enable === 'Y' && (
                                        <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                            Medical Registration No.: {doctorData?.gmc_no}
                                        </Text>
                                    )}
                                    {printSettings?.header_footer?.other_settings?.qualification_enable === 'Y' && (
                                        <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                            {printSettings?.header_footer?.other_settings?.qualification ? printSettings?.header_footer?.other_settings?.qualification : doctorData?.um_qualifications}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ flex: 1 }} >
                                    {printSettings?.header_footer?.other_settings?.name_of_doctor_enable === 'Y' && (
                                        <Text style={[styles.extraText, { fontWeight: 700, color: '#000' }]}>
                                            {doctorData?.um_name}
                                        </Text>
                                    )}
                                    {printSettings?.header_footer?.other_settings?.registration_no_enable === 'Y' && (
                                        <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                            Medical Registration No.:  {doctorData?.gmc_no}
                                        </Text>
                                    )}
                                    {printSettings?.header_footer?.other_settings?.qualification_enable === 'Y' && (
                                        <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                            {printSettings?.header_footer?.other_settings?.qualification ? printSettings?.header_footer?.other_settings?.qualification : doctorData?.um_qualifications}
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
                                                {`Scan QR code to book an appointment\nwith your doctor or download your old\ndigital prescription`}
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
                                                {`Scan QR code to book an appointment\nwith your doctor or download your old\ndigital prescription`}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            )}
                            {printSettings?.signature_enable === 'Y' && (
                                <View style={{ flex: 1, textAlign: printSettings?.header_footer?.other_settings?.signature_place === 'R' && 'right' }} >
                                    {printSettings?.header_footer?.other_settings?.name_of_doctor_enable === 'Y' && (
                                        <Text style={[styles.extraText, { fontWeight: 700, color: '#000' }]}>
                                            {doctorData?.um_name}
                                        </Text>
                                    )}
                                    {printSettings?.header_footer?.other_settings?.registration_no_enable === 'Y' && (
                                        <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                            Medical Registration No.: {doctorData?.gmc_no}
                                        </Text>
                                    )}
                                    {printSettings?.header_footer?.other_settings?.qualification_enable === 'Y' && (
                                        <Text style={[styles.extraText, { fontWeight: 400, color: '#000' }]}>
                                            {printSettings?.header_footer?.other_settings?.qualification ? printSettings?.header_footer?.other_settings?.qualification : doctorData?.um_qualifications}
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* </View> */}

                <View style={{
                    position: 'absolute',
                    bottom: footerOffsetBottom,
                    left: footerOffsetLeft,
                    right: footerOffsetRight,
                    // marginTop: PX_TO_PT * (mode == NORMAL ? printSettings?.letterhead_format != 2 ? 29 : 0 : 29)
                }} fixed>
                    {mode == NORMAL ? (
                        letterheadFormat === 0 ? (
                            <View>
                                <View style={{ backgroundColor: '#171725', height: PX_TO_PT * 2, width: '100%' }} />
                                <Text style={{ marginTop: PX_TO_PT * 8, color: '#171725', fontFamily: 'Roboto', fontSize: PX_TO_PT * printSettings?.header_footer?.footer?.font_size, fontWeight: 400, maxLines: 1 }}>{printSettings?.header_footer?.footer?.title}</Text>
                            </View>
                        ) : letterheadFormat === 1 && (
                            fileFooter && fileFooter?.imageShow && (
                                <Image
                                    style={{ width: '100%', height: 80, objectFit: 'fill' }}
                                    src={fileFooter?.showFile} />
                            )
                        )
                    ) : (
                        printSettings?.whatsapp_letterhead_format === 0 ? (
                            <View>
                                <View style={{ backgroundColor: '#171725', height: PX_TO_PT * 2, width: '100%' }} />
                                <Text style={{ marginTop: PX_TO_PT * 8, color: '#171725', fontFamily: 'Roboto', fontSize: PX_TO_PT * printSettings?.header_footer?.footer?.font_size, fontWeight: 400, maxLines: 1 }}>{printSettings?.header_footer?.footer?.title}</Text>
                            </View>
                        ) : printSettings?.whatsapp_letterhead_format === 1 && (
                            fileFooter && fileFooter?.imageShow && (
                                <Image
                                    style={{ width: '100%', height: 80, objectFit: 'fill' }}
                                    src={fileFooter?.showFile} />
                            )
                        )
                    )}
                </View>

                {/* </View> */}
            </Page>
        </Document>
    )
}

export default React.memo(ViewCertificatePDF)
