import React from 'react';
import { Font, Page, Text, View, Image, Document, StyleSheet } from '@react-pdf/renderer';
import { isNumeric } from '../../utils/utils'
import { NORMAL, WHATSAPP, TP_ASSETS_BASE } from '../../utils/constants';

const PX_TO_PT = 0.75

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
        fontSize: PX_TO_PT * 10,
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
        borderTop: '1px solid #171725',
        borderLeft: '1px solid #171725'
    },
    row: {
        flexDirection: 'row',
        borderBottom: '1px solid #171725'
    },
    cell: {
        flex: 1,
        padding: 6,
        borderRight: '1px solid #171725',
    }
});

export const PDF = ({ mode = NORMAL, ...props }) => {

    const { caseManagerData, columns, initialRows, frequencyList, timingList, printSettings, fileHeader, fileFooter, fileLogo, fileWatermark, fileSignature } = props

    const patientDataShow = (id) => {
        var value = ''
        if (id == 1) {
            value = `${caseManagerData?.patient_data?.patient_name} ${caseManagerData?.patient_data?.patient_id}`
        } else if (id == 2) {
            value = `${caseManagerData?.patient_data?.patient_date_time ? caseManagerData?.patient_data?.patient_date_time : '-'}`
        } else if (id == 3) {
            value = `${caseManagerData?.patient_data?.patient_age}Years, ${caseManagerData?.patient_data?.patient_gender}`
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
        }
        return value
    }

    const medical_history_title = (id) => {
        var value = ''
        if (id == 2 || id == 3) {
            value = `Issue : `
        } else if (id == 4) {
            value = `Allergies to : `
        } else if (id == 1) {
            value = `Habit : `
        }
        return value
    }

    return (
        <Document>
            <Page
                size="A4"
                style={{
                    // flex: 1,
                    paddingTop: mode == NORMAL ? printSettings?.letterhead_format != 2 ? PX_TO_PT * 30 : printSettings?.header_footer?.margin?.top ? printSettings?.header_footer?.margin?.top * 25 : 0 : PX_TO_PT * 30,
                    paddingBottom: mode == NORMAL ?
                        printSettings?.letterhead_format != 2 ?
                            printSettings?.letterhead_format == 1 ?
                                fileFooter ? 110 : PX_TO_PT * 30
                                : PX_TO_PT * 30
                            : printSettings?.header_footer?.margin?.bottom ? printSettings?.header_footer?.margin?.bottom * 25
                                : 0
                        : PX_TO_PT * 30,
                    paddingLeft: mode == NORMAL ? printSettings?.letterhead_format != 2 ? PX_TO_PT * 30 : printSettings?.header_footer?.margin?.left ? printSettings?.header_footer?.margin?.left * 25 : 0 : PX_TO_PT * 30,
                    paddingRight: mode == NORMAL ? printSettings?.letterhead_format != 2 ? PX_TO_PT * 30 : printSettings?.header_footer?.margin?.right ? printSettings?.header_footer?.margin?.right * 25 : 0 : PX_TO_PT * 30,
                }}
                wrap>
                {/* <View style={{ flex: 1 }}> */}

                <View style={{ marginBottom: PX_TO_PT * (mode == NORMAL ? printSettings?.letterhead_format != 2 ? 15 : 0 : 15) }} fixed>
                    {mode == NORMAL ? (
                        printSettings?.letterhead_format === 0 ? (
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

                <View style={{ backgroundColor: '#171725', height: PX_TO_PT * 2, width: '100%' }} />

                <View style={{ flexDirection: 'row', marginVertical: PX_TO_PT * 15 }}>
                    <View style={{ flex: 0.7, marginRight: PX_TO_PT * 8 }}>
                        {printSettings?.header_footer?.patient_info.filter(e => e.enable === 'Y').map((item, i) => {
                            return (
                                i % 2 === 0 && (
                                    <View key={i} style={{ flexDirection: 'row', paddingVertical: PX_TO_PT * 3 }}>
                                        <Text style={[styles.displayPatient, { fontWeight: 500 }]}>{`${item.title}: `}</Text>
                                        <Text style={[styles.displayPatient, { fontWeight: 400 }]}>{patientDataShow(item.id)}</Text>
                                    </View>
                                )
                            )
                        })}
                    </View>
                    <View style={{ flex: 0.3, marginLeft: PX_TO_PT * 8 }}>
                        {printSettings?.header_footer?.patient_info.filter(e => e.enable === 'Y').map((item, i) => {
                            return (
                                i % 2 === 1 && (
                                    <View key={i} style={{ flexDirection: 'row', paddingVertical: PX_TO_PT * 3 }}>
                                        <Text style={[styles.displayPatient, { fontWeight: 500 }]}>{`${item.title}: `}</Text>
                                        <Text style={[styles.displayPatient, { fontWeight: 400 }]}>{patientDataShow(item.id)}</Text>
                                    </View>
                                )
                            )
                        })}
                    </View>
                </View>

                <View style={{ backgroundColor: '#171725', height: PX_TO_PT * 1, width: '100%' }} />

                <View>
                    {caseManagerData.symptoms.length > 0 && printSettings?.prescription?.case_option[0]?.enable === 'Y' && (
                        printSettings?.prescription?.case_option[0]?.format === 'inline' ? (
                            <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Symptoms:&nbsp;</Text>
                                {caseManagerData.symptoms.map((item, i) => {
                                    return (
                                        <Text key={i}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.symptom_name}&nbsp;</Text>
                                            {(item.since || item.severity || item.note) ?
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ since, severity, note }) => ({ since, severity, note }))(caseManagerData.symptoms[i])).filter(([_, v]) => v))).join(', ')})`}{caseManagerData.symptoms.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                :
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.symptoms.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                            }
                                        </Text>
                                    )
                                })}
                            </Text>
                        ) : printSettings?.prescription?.case_option[0]?.format === 'listview' ? (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Symptoms:&nbsp;</Text>
                                {caseManagerData.symptoms.map((item, i) => {
                                    return (
                                        <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.symptom_name}&nbsp;</Text>
                                            {(item.since || item.severity || item.note) &&
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ since, severity, note }) => ({ since, severity, note }))(caseManagerData.symptoms[i])).filter(([_, v]) => v))).join(', ')})\n`}</Text>
                                            }
                                        </Text>
                                    )
                                })}
                            </View>
                        ) : (() => {
                            const allStringFormat = caseManagerData.symptoms.every(item => {
                                if (item.isStringFormat) return true;
                                const hasStructuredData = (item.since && item.since !== '') || (item.severity && item.severity !== '') || (item.note && item.note !== '');
                                return !hasStructuredData;
                            });
                            return (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Symptoms:&nbsp;</Text>
                                    <View style={[styles.table, { borderRight: '1px solid #171725' }]}>
                                        {!allStringFormat && (
                                    <View style={styles.row}>
                                        <Text style={[styles.cell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                        <Text style={[styles.cell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>SINCE</Text>
                                        <Text style={[styles.cell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>SEVERITY</Text>
                                        <Text style={[styles.cell, { flex: 0.5, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                    </View>
                                        )}
                                    {caseManagerData.symptoms.map((item, i) => (
                                        <View style={styles.row} key={i}>
                                                {allStringFormat ? (
                                                    <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, borderRight: '1px solid #171725' }]}>{item.symptom_name}</Text>
                                                ) : (
                                                    <>
                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.symptom_name}</Text>
                                            <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.since ? item.since : '-'}</Text>
                                            <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.severity ? item.severity : '-'}</Text>
                                            <Text style={[styles.cell, { flex: 0.5, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.note ? item.note : '-'}</Text>
                                                    </>
                                                )}
                                        </View>
                                    ))}
                                </View>
                            </View>
                            );
                        })()
                    )}

                    {caseManagerData.examination.length > 0 && printSettings?.prescription?.case_option[1]?.enable === 'Y' && (
                        printSettings?.prescription?.case_option[1]?.format === 'inline' ? (
                            <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Examinations:&nbsp;</Text>
                                {caseManagerData.examination.map((item, i) => {
                                    return (
                                        <Text key={i}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.examination_name}&nbsp;</Text>
                                            {(item.note) ?
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ note }) => ({ note }))(caseManagerData.examination[i])).filter(([_, v]) => v))).join(', ')})`}{caseManagerData.examination.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                :
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.examination.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                            }
                                        </Text>
                                    )
                                })}
                            </Text>
                        ) : printSettings?.prescription?.case_option[1]?.format === 'listview' ? (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Examinations:&nbsp;</Text>
                                {caseManagerData.examination.map((item, i) => {
                                    return (
                                        <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.examination_name}&nbsp;</Text>
                                            {(item.since || item.severity || item.note) &&
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ note }) => ({ note }))(caseManagerData.examination[i])).filter(([_, v]) => v))).join(', ')})\n`}</Text>
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
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Examinations:&nbsp;</Text>
                                    <View style={[styles.table, { borderRight: '1px solid #171725' }]}>
                                        {!allStringFormat && (
                                    <View style={styles.row}>
                                        <Text style={[styles.cell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                        <Text style={[styles.cell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                    </View>
                                        )}
                                    {caseManagerData.examination.map((item, i) => (
                                        <View style={styles.row} key={i}>
                                                {allStringFormat ? (
                                                    <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, borderRight: '1px solid #171725' }]}>{item.examination_name}</Text>
                                                ) : (
                                                    <>
                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.examination_name}</Text>
                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.note ? item.note : '-'}</Text>
                                                    </>
                                                )}
                                        </View>
                                    ))}
                                </View>
                            </View>
                            );
                        })()
                    )}

                    {caseManagerData.diagnosis.length > 0 && printSettings?.prescription?.case_option[2]?.enable === 'Y' && (
                        printSettings?.prescription?.case_option[2]?.format === 'inline' ? (
                            <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Diagnosis:&nbsp;</Text>
                                {caseManagerData.diagnosis.map((item, i) => {
                                    return (
                                        <Text key={i}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.tds_name}&nbsp;</Text>
                                            {(item.since || item.status || item.note) ?
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ since, status, note }) => ({ since, status, note }))(caseManagerData.diagnosis[i])).filter(([_, v]) => v))).join(', ')})`}{caseManagerData.diagnosis.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                :
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.diagnosis.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                            }
                                        </Text>
                                    )
                                })}
                            </Text>
                        ) : printSettings?.prescription?.case_option[2]?.format === 'listview' ? (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Diagnosis:&nbsp;</Text>
                                {caseManagerData.diagnosis.map((item, i) => {
                                    return (
                                        <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.tds_name}&nbsp;</Text>
                                            {(item.since || item.severity || item.note) &&
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ since, status, note }) => ({ since, status, note }))(caseManagerData.diagnosis[i])).filter(([_, v]) => v))).join(', ')})\n`}</Text>
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
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Diagnosis:&nbsp;</Text>
                                    <View style={[styles.table, { borderRight: '1px solid #171725' }]}>
                                        {!allStringFormat && (
                                    <View style={styles.row}>
                                        <Text style={[styles.cell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                        <Text style={[styles.cell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>SINCE</Text>
                                        <Text style={[styles.cell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>STATUS</Text>
                                        <Text style={[styles.cell, { flex: 0.5, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                    </View>
                                        )}
                                    {caseManagerData.diagnosis.map((item, i) => (
                                        <View style={styles.row} key={i}>
                                                {allStringFormat ? (
                                                    <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, borderRight: '1px solid #171725' }]}>{item.tds_name}</Text>
                                                ) : (
                                                    <>
                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.tds_name}</Text>
                                            <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.since ? item.since : '-'}</Text>
                                            <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.status ? item.status : '-'}</Text>
                                            <Text style={[styles.cell, { flex: 0.5, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.note ? item.note : '-'}</Text>
                                                    </>
                                                )}
                                        </View>
                                    ))}
                                </View>
                            </View>
                            );
                        })()
                    )}

                    {caseManagerData.medicine.length > 0 && printSettings?.prescription?.case_option[3]?.enable === 'Y' && (
                        printSettings?.prescription?.case_option[3]?.format === 'inline' ? (
                            <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medication (Rx):&nbsp;</Text>
                                {caseManagerData.medicine.map((item, i) => {
                                    return (
                                        <Text key={i}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.tmm_medicine_name}&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                {`(${Object.values(Object.fromEntries(Object.entries(
                                                    (
                                                        ({
                                                            tmm_generic,
                                                            tmf_block,
                                                            tcm_tmm_freq_morning,
                                                            tcm_tmm_freq_afternoon,
                                                            tcm_tmm_freq_evening,
                                                            tcm_tmm_freq_night,
                                                            tmm_freq_type,
                                                            tmm_time,
                                                            tmm_days,
                                                            tmm_duration_type,
                                                            // display_qty,
                                                            tmm_remarks
                                                        }) => ({
                                                            tmm_generic,

                                                            modiFrequency: tmf_block === 0 || tmf_block === "" ? `${(tcm_tmm_freq_morning && tcm_tmm_freq_afternoon && tcm_tmm_freq_evening && tcm_tmm_freq_night) ? `${tcm_tmm_freq_morning ? tcm_tmm_freq_morning : 0}-${tcm_tmm_freq_afternoon ? tcm_tmm_freq_afternoon : 0}${tcm_tmm_freq_evening ? '-' + tcm_tmm_freq_evening : ''}-${tcm_tmm_freq_night ? tcm_tmm_freq_night : 0}` : ``}` : `- (${frequencyList.find((x) => x.tmf_id === tmm_freq_type) !== undefined ? frequencyList.find((x) => x.tmf_id === tmm_freq_type).tmf_title : ''})`,

                                                            modiTiming: timingList.find((x) => x.tmt_id === tmm_time) !== undefined ? timingList.find((x) => x.tmt_id === tmm_time).tmt_title : '',

                                                            modiDuration: isNumeric(tmm_days) ? `${tmm_days} ${tmm_duration_type}` : '-',

                                                            // modiDisplayQty: display_qty ? display_qty.toFixed(2).replace(/\.00$/, '') : '',

                                                            tmm_remarks
                                                        })
                                                    )(caseManagerData.medicine[i])
                                                ).filter(([_, v]) => v))).join(', ')})`}{caseManagerData.medicine.length - 1 != i ? ',' : ''}&nbsp;
                                            </Text>
                                        </Text>
                                    )
                                })}
                            </Text>
                        ) : printSettings?.prescription?.case_option[3]?.format === 'listview' ? (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medication (Rx):&nbsp;</Text>
                                {caseManagerData.medicine.map((item, i) => {
                                    return (
                                        <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.tmm_medicine_name}&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                {`(${Object.values(Object.fromEntries(Object.entries(
                                                    (
                                                        ({
                                                            tmm_generic,
                                                            tmf_block,
                                                            tcm_tmm_freq_morning,
                                                            tcm_tmm_freq_afternoon,
                                                            tcm_tmm_freq_evening,
                                                            tcm_tmm_freq_night,
                                                            tmm_freq_type,
                                                            tmm_time,
                                                            tmm_days,
                                                            tmm_duration_type,
                                                            // display_qty,
                                                            tmm_remarks
                                                        }) => ({
                                                            tmm_generic,

                                                            modiFrequency: tmf_block === 0 || tmf_block === "" ? `${(tcm_tmm_freq_morning && tcm_tmm_freq_afternoon && tcm_tmm_freq_evening && tcm_tmm_freq_night) ? `${tcm_tmm_freq_morning ? tcm_tmm_freq_morning : 0}-${tcm_tmm_freq_afternoon ? tcm_tmm_freq_afternoon : 0}${tcm_tmm_freq_evening ? '-' + tcm_tmm_freq_evening : ''}-${tcm_tmm_freq_night ? tcm_tmm_freq_night : 0}` : ``}` : `- (${frequencyList.find((x) => x.tmf_id === tmm_freq_type) !== undefined ? frequencyList.find((x) => x.tmf_id === tmm_freq_type).tmf_title : ''})`,

                                                            modiTiming: timingList.find((x) => x.tmt_id === tmm_time) !== undefined ? timingList.find((x) => x.tmt_id === tmm_time).tmt_title : '',

                                                            modiDuration: isNumeric(tmm_days) ? `${tmm_days} ${tmm_duration_type}` : '-',

                                                            // modiDisplayQty: display_qty ? display_qty.toFixed(2).replace(/\.00$/, '') : '',

                                                            tmm_remarks
                                                        })
                                                    )(caseManagerData.medicine[i])
                                                ).filter(([_, v]) => v))).join(', ')})\n`}
                                            </Text>
                                        </Text>
                                    )
                                })}
                            </View>
                        ) : (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medication (Rx):&nbsp;</Text>
                                <View style={styles.table}>
                                    <View style={styles.row}>
                                        <Text style={[styles.cell, { flex: 0.09, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>RX</Text>
                                        <Text style={[styles.cell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                        <Text style={[styles.cell, { flex: 0.6, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>FREQUENCY</Text>
                                        <Text style={[styles.cell, { flex: 0.28, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>DURATION</Text>
                                        {/* <Text style={[styles.cell, { flex: 0.15, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>QTY.</Text> */}
                                        <Text style={[styles.cell, { flex: 0.8, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                    </View>
                                    {caseManagerData.medicine.map((item, i) => (
                                        <View style={styles.row} key={i}>
                                            <Text style={[styles.cell, { flex: 0.09, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{i + 1}</Text>
                                            <View style={styles.cell}>
                                                <Text style={[{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.tmm_medicine_name}</Text>
                                                <Text style={[{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic || ''}</Text>
                                            </View>
                                            <Text style={[styles.cell, { flex: 0.6, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                {item.tmf_block === 0 || item.tmf_block === "" ? `${(item.tcm_tmm_freq_morning && item.tcm_tmm_freq_afternoon && item.tcm_tmm_freq_evening && item.tcm_tmm_freq_night) ? `${item.tcm_tmm_freq_morning ? item.tcm_tmm_freq_morning : 0}-${item.tcm_tmm_freq_afternoon ? item.tcm_tmm_freq_afternoon : 0}${item.tcm_tmm_freq_evening ? '-' + item.tcm_tmm_freq_evening : ''}-${item.tcm_tmm_freq_night ? item.tcm_tmm_freq_night : 0}` : `-`}` : `- (${frequencyList.find((x) => x.tmf_id === item.tmm_freq_type) !== undefined ? frequencyList.find((x) => x.tmf_id === item.tmm_freq_type).tmf_title : ''})`}{'\n'}{timingList.find((x) => x.tmt_id === item.tmm_time) !== undefined ? timingList.find((x) => x.tmt_id === item.tmm_time).tmt_title : ''}
                                            </Text>
                                            <Text style={[styles.cell, { flex: 0.28, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                {isNumeric(item.tmm_days) ? `${item.tmm_days} ${item.tmm_duration_type}` : '-'}
                                            </Text>
                                            {/* <Text style={[styles.cell, { flex: 0.15, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                {item.display_qty ? item.display_qty.toFixed(2).replace(/\.00$/, '') : '-'}
                                            </Text> */}
                                            <Text style={[styles.cell, { flex: 0.8, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>
                                                {item.tmm_remarks ? item.tmm_remarks : '-'}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )
                    )}

                    {caseManagerData.advice.length > 0 && printSettings?.prescription?.case_option[4]?.enable === 'Y' && (
                        printSettings?.prescription?.case_option[4]?.format === 'inline' ? (
                            <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Advices:&nbsp;</Text>
                                {caseManagerData.advice.map((item, i) => {
                                    return (
                                        <Text key={i}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{item.advice_name}&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.advice.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                        </Text>
                                    )
                                })}
                            </Text>
                        ) : printSettings?.prescription?.case_option[4]?.format === 'listview' ? (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Advices:&nbsp;</Text>
                                {caseManagerData.advice.map((item, i) => {
                                    return (
                                        <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{item.advice_name}&nbsp;</Text>
                                        </Text>
                                    )
                                })}
                            </View>
                        ) : (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Advices:&nbsp;</Text>
                                <View style={styles.table}>
                                    <View style={styles.row}>
                                        <Text style={[styles.cell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                    </View>
                                    {caseManagerData.advice.map((item, i) => (
                                        <View style={styles.row} key={i}>
                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.advice_name}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )
                    )}

                    {caseManagerData.investigation.length > 0 && printSettings?.prescription?.case_option[5]?.enable === 'Y' && (
                        printSettings?.prescription?.case_option[5]?.format === 'inline' ? (
                            <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Lab Investigation:&nbsp;</Text>
                                {caseManagerData.investigation.map((item, i) => {
                                    return (
                                        <Text key={i}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.investigation_name}&nbsp;</Text>
                                            {(item.note) ?
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ note }) => ({ note }))(caseManagerData.investigation[i])).filter(([_, v]) => v))).join(', ')})`}{caseManagerData.investigation.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                                :
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.investigation.length - 1 != i ? ',' : ''}&nbsp;</Text>
                                            }
                                        </Text>
                                    )
                                })}
                            </Text>
                        ) : printSettings?.prescription?.case_option[5]?.format === 'listview' ? (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Lab Investigation:&nbsp;</Text>
                                {caseManagerData.investigation.map((item, i) => {
                                    return (
                                        <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.investigation_name}&nbsp;</Text>
                                            {(item.since || item.severity || item.note) &&
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(${Object.values(Object.fromEntries(Object.entries((({ note }) => ({ note }))(caseManagerData.investigation[i])).filter(([_, v]) => v))).join(', ')})\n`}</Text>
                                            }
                                        </Text>
                                    )
                                })}
                            </View>
                        ) : (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Lab Investigation:&nbsp;</Text>
                                <View style={styles.table}>
                                    <View style={styles.row}>
                                        <Text style={[styles.cell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                        <Text style={[styles.cell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                    </View>
                                    {caseManagerData.investigation.map((item, i) => (
                                        <View style={styles.row} key={i}>
                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.investigation_name}</Text>
                                            <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item.note ? item.note : '-'}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )
                    )}

                    {caseManagerData.vitals.length > 0 && printSettings?.prescription?.case_option[6]?.enable === 'Y' && (
                        printSettings?.prescription?.case_option[6]?.format === 'inline' ? (
                            <Text style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Vitals & Body Composition:&nbsp;</Text>
                                {caseManagerData.vitals.map((item, i) => {
                                    return (
                                        <Text key={i}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.date}&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                {`- ${Object.values(Object.fromEntries(Object.entries(
                                                    (
                                                        ({
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
                                                        }) => ({
                                                            temp: temp ? `Temperature (${temp}Frh)` : '',
                                                            pres: pres ? `Pulse (${pres}/min)` : '',
                                                            resp_rate: resp_rate ? `Resp. Rate (${resp_rate}/min)` : '',
                                                            systolic: blood_press ? blood_press.split('/')[0] ? `Systolic (${blood_press.split('/')[0]}mmHg)` : '' : '',
                                                            diastolic: blood_press ? blood_press.split('/')[1] ? `Diastolic (${blood_press.split('/')[1]}mmHg)` : '' : '',
                                                            spo2: spo2 ? `SPO2 (${spo2}%)` : '',
                                                            height: height ? `Height (${height}cms)` : '',
                                                            weight: weight ? `Weight (${weight}kgs)` : '',
                                                            fib4: fib4 ? `FIB4 (${fib4})` : '',
                                                            waist_circumference: waist_circumference ? `Waist Circumference (${waist_circumference}cms)` : '',
                                                            bmi: bmi ? `BMI (${parseFloat(bmi).toFixed(2)}kg/m²)` : '',
                                                            bmr: bmr ? `BMR (${parseFloat(bmr).toFixed(2)}kcals)` : '',
                                                            bsa: bsa ? `BSA (${parseFloat(bsa).toFixed(2)}m²)` : '',
                                                        })
                                                    )(caseManagerData.vitals[i])
                                                ).filter(([_, v]) => v))).join(', ')}`}{caseManagerData.vitals.length - 1 != i ? ',' : ''}&nbsp;
                                            </Text>
                                        </Text>
                                    )
                                })}
                            </Text>
                        ) : printSettings?.prescription?.case_option[6]?.format === 'listview' ? (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Vitals & Body Composition:&nbsp;</Text>
                                {caseManagerData.vitals.map((item, i) => {
                                    return (
                                        <Text key={i} style={{ marginTop: PX_TO_PT * (i == 0 ? 4 : 2), lineHeight: 1.4 }}>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}.&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.date}&nbsp;</Text>
                                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                {`- ${Object.values(Object.fromEntries(Object.entries(
                                                    (
                                                        ({
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
                                                        }) => ({
                                                            temp: temp ? `Temperature (${temp}Frh)` : '',
                                                            pres: pres ? `Pulse (${pres}/min)` : '',
                                                            resp_rate: resp_rate ? `Resp. Rate (${resp_rate}/min)` : '',
                                                            systolic: blood_press ? blood_press.split('/')[0] ? `Systolic (${blood_press.split('/')[0]}mmHg)` : '' : '',
                                                            diastolic: blood_press ? blood_press.split('/')[1] ? `Diastolic (${blood_press.split('/')[1]}mmHg)` : '' : '',
                                                            spo2: spo2 ? `SPO2 (${spo2}%)` : '',
                                                            height: height ? `Height (${height}cms)` : '',
                                                            weight: weight ? `Weight (${weight}kgs)` : '',
                                                            fib4: fib4 ? `FIB4 (${fib4})` : '',
                                                            waist_circumference: waist_circumference ? `Waist Circumference (${waist_circumference}cms)` : '',
                                                            bmi: bmi ? `BMI (${parseFloat(bmi).toFixed(2)}kg/m²)` : '',
                                                            bmr: bmr ? `BMR (${parseFloat(bmr).toFixed(2)}kcals)` : '',
                                                            bsa: bsa ? `BSA (${parseFloat(bsa).toFixed(2)}m²)` : '',
                                                        })
                                                    )(caseManagerData.vitals[i])
                                                ).filter(([_, v]) => v))).join(', ')}\n`}
                                            </Text>
                                        </Text>
                                    )
                                })}
                            </View>
                        ) : (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Vitals & Body Composition:&nbsp;</Text>
                                <View style={styles.table}>
                                    <View style={styles.row}>
                                        {columns.map((item, i) => {
                                            return (
                                                <Text style={[styles.cell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>{item.title}</Text>
                                            )
                                        })}
                                    </View>
                                    {initialRows.map((item, i) => {
                                        return (
                                            <View style={styles.row} key={i}>
                                                <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item.name}</Text>
                                                <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item['0']}</Text>
                                                {item.hasOwnProperty('1') && (
                                                    <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item['1']}</Text>
                                                )}
                                            </View>
                                        )
                                    })}
                                </View>
                            </View>
                        )
                    )}

                    {caseManagerData.medical_history.length > 0 && printSettings?.prescription?.case_option[7]?.enable === 'Y' && (
                        printSettings?.prescription?.case_option[7]?.format === 'inline' ? (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medical History:&nbsp;</Text>
                                {caseManagerData.medical_history.map((item, i) => {
                                    return (
                                        <Text key={i} style={{ marginTop: (item?.no_know_history || item?.tags?.length > 0) ? PX_TO_PT * 6 : 0, lineHeight: 1.4 }}>
                                            {!item?.no_know_history ? (
                                                item?.tags?.length > 0 && (
                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.title}&nbsp;
                                                        {item.tags.map((item1, i1) => {
                                                            return (
                                                                <>
                                                                    {`(`}
                                                                    {item1.enable == 'Y' ? (
                                                                        <>
                                                                            <Text key={i1} style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                {medical_history_title(item?.tmmhs_id)}
                                                                                <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                    {item1?.title}
                                                                                </Text>
                                                                            </Text>

                                                                            {item1?.since && (
                                                                                <Text key={i1} style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                    {` | Since : `}
                                                                                    <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                        {item1?.since}
                                                                                    </Text>
                                                                                </Text>
                                                                            )}

                                                                            {item?.tmmhs_id != 3 && (
                                                                                <>
                                                                                    {item1?.status && (
                                                                                        <Text key={i1} style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                            {` | Status : `}
                                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                                {item1?.status}
                                                                                            </Text>
                                                                                        </Text>
                                                                                    )}
                                                                                    {item1?.medication && (
                                                                                        <Text key={i1} style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                            {` | Medication : `}
                                                                                            <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                                {item1?.medication}
                                                                                            </Text>
                                                                                        </Text>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                            {item?.tmmhs_id == 3 && item1?.relationship && (
                                                                                <Text key={i1} style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                    {` | Relative : `}
                                                                                    <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                        {item1?.relationship}
                                                                                    </Text>
                                                                                </Text>
                                                                            )}

                                                                            {item1?.note && (
                                                                                <Text key={i1} style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                                                    {` | Note : `}
                                                                                    <Text style={{ color: '#454551', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                        {item1?.note}
                                                                                    </Text>
                                                                                </Text>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <Text key={i1} style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                            {`No ${item1.title}`}
                                                                        </Text>
                                                                    )}
                                                                    {`)`}{item.tags.length - 1 != i1 ? ',' : ''}&nbsp;
                                                                </>
                                                            )
                                                        })}
                                                        {'\n'}</Text>
                                                )
                                            ) : (
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>{item.title}&nbsp;
                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{`(No known history)`}</Text>
                                                </Text>
                                            )}
                                        </Text>
                                    )
                                })}
                            </View>
                        ) : printSettings?.prescription?.case_option[7]?.format === 'listview' ? (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medical History:&nbsp;</Text>
                                {caseManagerData.medical_history.map((item, i) => {
                                    let abcd = 97
                                    return (
                                        <Text key={i} style={{ marginTop: (item?.no_know_history || item?.tags?.length > 0) ? PX_TO_PT * 6 : 0, lineHeight: 1.4 }}>
                                            {!item?.no_know_history ? (
                                                item?.tags?.length > 0 && (
                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>
                                                        <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, lineHeight: 1.4 }}>&nbsp;{i + 1}. {item.title}&nbsp;:</Text>
                                                        {item.tags.map((item1, i1) => {
                                                            return (
                                                                <>
                                                                    {item1.enable == 'Y' ? (
                                                                        <>
                                                                            <Text key={i1} style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{'\n'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{String.fromCharCode(abcd++)}.&nbsp;{item1.title}&nbsp;</Text>
                                                                            {(item1.since || item1.status || item1.medication || item1.relationship || item1.note) &&
                                                                                <Text key={i1} style={{ lineHeight: 1.4, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>
                                                                                    {`(${Object.values(Object.fromEntries(Object.entries((
                                                                                        ({
                                                                                            since,
                                                                                            status,
                                                                                            medication,
                                                                                            relationship,
                                                                                            note
                                                                                        }) => ({
                                                                                            since: since && `Since : ${since}`,
                                                                                            status: status && `Status : ${status}`,
                                                                                            medication: medication && `Medication : ${medication}`,
                                                                                            relationship: relationship && `Relative : ${relationship}`,
                                                                                            note: note && `${note}`,
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
                                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{i + 1}. {item.title}&nbsp;:
                                                    <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }}>&nbsp;{'\n'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{String.fromCharCode(abcd++)}.&nbsp;No known history&nbsp;</Text>
                                                </Text>
                                            )}
                                        </Text>
                                    )
                                })}
                            </View>
                        ) : (
                            <View style={{ marginTop: PX_TO_PT * 15 }}>
                                <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Medical History:&nbsp;</Text>
                                {caseManagerData.medical_history.map((item, i) => {
                                    return (
                                        (item?.no_know_history || item?.tags?.length > 0) && (
                                            <>
                                                <Text style={{ color: '#000', marginTop: i === 0 ? PX_TO_PT * 4 : PX_TO_PT * 12, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, padding: 6, borderTop: '1px solid #171725', borderLeft: '1px solid #171725', borderRight: '1px solid #171725', backgroundColor: '#E2E2EA' }}>{`${item.title} : `}</Text>
                                                {!item?.no_know_history ? (
                                                    <View key={i} style={[styles.table, { marginTop: 0 }]}>
                                                        <View style={styles.row}>
                                                            <Text style={[styles.cell, { fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NAME</Text>
                                                            <Text style={[styles.cell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>SINCE</Text>
                                                            {item?.tmmhs_id != 3 && (
                                                                <>
                                                                    <Text style={[styles.cell, { flex: 0.2, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>STATUS</Text>
                                                                    {item?.tmmhs_id == 2 && (
                                                                        <Text style={[styles.cell, { flex: 0.25, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>MEDICATION</Text>
                                                                    )}
                                                                </>
                                                            )}
                                                            {item?.tmmhs_id === 3 && (
                                                                <Text style={[styles.cell, { flex: 0.4, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>RELATIVE</Text>
                                                            )}
                                                            <Text style={[styles.cell, { flex: 0.5, fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, color: '#000' }]}>NOTE</Text>
                                                        </View>
                                                        {item?.tags?.filter(x => x.enable == 'Y')?.map((item1, i1) => {
                                                            return (
                                                                <View style={styles.row} key={i1}>
                                                                    <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{item1.title}</Text>
                                                                    <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item1.since ? item1.since : '-'}</Text>
                                                                    {item?.tmmhs_id != 3 && (
                                                                        <>
                                                                            <Text style={[styles.cell, { flex: 0.2, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item1.status ? item1.status : '-'}</Text>
                                                                            {item?.tmmhs_id == 2 && (
                                                                                <Text style={[styles.cell, { flex: 0.25, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item1.medication ? item1.medication : '-'}</Text>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {item?.tmmhs_id === 3 && (
                                                                        <Text style={[styles.cell, { flex: 0.4, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item1.relationship ? item1.relationship : '-'}</Text>
                                                                    )}
                                                                    <Text style={[styles.cell, { flex: 0.5, color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }]}>{item1.note ? item1.note : '-'}</Text>
                                                                </View>
                                                            )
                                                        })}
                                                        {item?.tags?.filter(x => x.enable == 'N')?.map((item1, i1) => {
                                                            return (
                                                                <View style={styles.row} key={i1}>
                                                                    <Text style={[styles.cell, { color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500 }]}>{`No ${item1.title}`}</Text>
                                                                </View>
                                                            )
                                                        })}
                                                    </View>
                                                ) : (
                                                    <Text style={{ color: '#000', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 500, padding: 6, border: 1, borderStyle: 'solid', borderColor: '#171725' }}>{`No known history`}</Text>

                                                )}
                                            </>
                                        )
                                    )
                                })}
                            </View>
                        )
                    )}

                    {caseManagerData.follow_up_date && (
                        <Text style={{ marginTop: PX_TO_PT * 15 }}>
                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Follow-up:&nbsp;</Text>
                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.follow_up_date}</Text>
                        </Text>
                    )}

                    {caseManagerData.visit_advice && (
                        <Text style={{ marginTop: PX_TO_PT * 15 }}>
                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 700 }}>Notes:&nbsp;</Text>
                            <Text style={{ color: '#171725', fontFamily: printSettings?.page_format?.font_family, fontSize: PX_TO_PT * printSettings?.page_format?.font_size, fontWeight: 400 }}>{caseManagerData.visit_advice}</Text>
                        </Text>
                    )}

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
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* </View> */}

                <View style={{
                    position: 'absolute',
                    bottom: PX_TO_PT * 30,
                    left: PX_TO_PT * 30,
                    right: PX_TO_PT * 30,
                    // marginTop: PX_TO_PT * (mode == NORMAL ? printSettings?.letterhead_format != 2 ? 29 : 0 : 29)
                }} fixed>
                    {mode == NORMAL ? (
                        printSettings?.letterhead_format === 1 && (
                            fileFooter && fileFooter?.imageShow && (
                                <Image
                                    style={{ width: '100%', height: 80, objectFit: 'fill' }}
                                    src={fileFooter?.showFile} />
                            )
                        )
                    ) : (
                        printSettings?.whatsapp_letterhead_format === 1 && (
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