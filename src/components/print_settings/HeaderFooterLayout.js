import React, { useState, useCallback, useContext, useMemo } from "react";
import { Col, Radio, Row, Form, Switch, Button, Input, Checkbox, Table, Drawer, Select } from "antd";
import Cropper from "react-cropper";
import SignatureCanvas from 'react-signature-canvas'
import { MenuOutlined } from '@ant-design/icons';
import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { isMobile } from 'react-device-detect';

import PrintSettingsContext from '../../context/PrintSettingsContext';

import CommonModal from '../../common/CommonModal';
import { errorMessage, dataUrlToFile, dataUrlToFileUsingFetch } from "../../utils/utils";

import WhatsappConfigure from "./WhatsappConfigure";
import Quixote from "../../pages/Quixote";
import WhatsappConfigureView from "./WhatsappConfigureView";
import { ASSETS } from "../../assets";
const {
  defaultProfile: defaultprofile,
  rxDisplayArea,
  wtsp,
} = ASSETS.images;

const { TextArea } = Input;

// const CustomRow = ({ children, ...props }) => {
//     const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
//         id: props['data-row-key'],
//     });
//     const style = {
//         ...props.style,
//         transform: CSS.Transform.toString(
//             transform && {
//                 ...transform,
//                 scaleY: 1,
//             }
//         ),
//         transition,
//         ...(isDragging ? {
//             position: 'relative',
//             zIndex: 9999,
//         } : {}),
//     };
//     return (
//         <tr {...props} ref={setNodeRef} style={style} {...attributes}>
//             {React.Children.map(children, (child) => {
//                 if (child.key === 'sort') {
//                     return React.cloneElement(child, {
//                         children: (
//                             <MenuOutlined
//                                 ref={setActivatorNodeRef}
//                                 style={{
//                                     touchAction: 'none',
//                                     cursor: 'move',
//                                     display: 'flex',
//                                     justifyContent: 'center',
//                                     alignItems: 'center',
//                                 }}
//                                 {...listeners}
//                             />
//                         ),
//                     });
//                 } else if (child.key === 'enable') {
//                     return React.cloneElement(child, {
//                         style: {
//                             display: 'flex',
//                             justifyContent: 'center',
//                             alignItems: 'center',
//                         },
//                     });
//                 }
//                 return child;
//             })}
//         </tr>
//     );
// };

const RowContext = React.createContext({});
const DragHandle = () => {
    const { setActivatorNodeRef, listeners } = useContext(RowContext);
    return (
        <MenuOutlined
            ref={setActivatorNodeRef}
            style={{
                touchAction: 'none',
                cursor: 'move',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
            {...listeners}
        />
    );
};
const CustomRow = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: props['data-row-key'],
    });
    const style = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging
            ? {
                position: 'relative',
                zIndex: 9999,
            }
            : {}),
    };
    const contextValue = useMemo(
        () => ({
            setActivatorNodeRef,
            listeners,
        }),
        [setActivatorNodeRef, listeners],
    );
    return (
        <RowContext.Provider value={contextValue}>
            <tr {...props} ref={setNodeRef} style={style} {...attributes} />
        </RowContext.Provider>
    );
};

const FONTS_SIZE_LIST = [
    {
        value: 8,
        label: '8',
    },
    {
        value: 10,
        label: '10',
    },
    {
        value: 12,
        label: '12',
    },
    {
        value: 14,
        label: '14',
    },
    {
        value: 16,
        label: '16',
    }
]

function HeaderFooterLayout({ todayVaccines, growthChartDetails, obstetricDetails, patientBills, advanceReceipts, patientWalletBalance }) {

    const inputHeaderFile = React.createRef();
    const cropperHeaderRef = React.createRef();

    const inputFooterFile = React.createRef();
    const cropperFooterRef = React.createRef();

    const inputLogoFile = React.createRef();
    const inputWatermarkFile = React.createRef();

    const inputSignatureFile = React.createRef();
    const signatureRef = React.createRef();
    const cropperSignatureRef = React.createRef();

    const { caseManagerData, certificateData, printSettings, setPrintSettings, fileHeader, setFileHeader, fileFooter, setFileFooter, fileLogo, setFileLogo, fileWatermark, setFileWatermark, fileSignature, setFileSignature } = useContext(PrintSettingsContext);

    const [isOwnLetterHead, setIsOwnLetterHead] = useState(false);
    const [isHandleDrawerWhatsappView, setIsHandleDrawerWhatsappView] = useState(false);

    const [headerFooterShowHide, setHeaderFooterShowHide] = useState(false);
    const [patientInfoShowHide, setPatientInfoShowHide] = useState(false);
    const [settingsShowHide, setSettingsShowHide] = useState(false);

    const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
    const [isFooterModalOpen, setIsFooterModalOpen] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [signatureMode, setSignatureMode] = useState('L');

    //TAB_HEADER_FOOTER
    const onHeaderFooterClick = useCallback(
        () => {
            setHeaderFooterShowHide(!headerFooterShowHide)
        },
        [headerFooterShowHide]
    );

    const onLetterheadFormatChange = useCallback(
        (e) => {
            printSettings.letterhead_format = e.target.value
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onPatientInfoClick = useCallback(
        () => {
            setPatientInfoShowHide(!patientInfoShowHide)
        },
        [patientInfoShowHide]
    );

    const onSettingsClick = useCallback(
        () => {
            setSettingsShowHide(!settingsShowHide)
        },
        [settingsShowHide]
    );

    //Header & Footer
    const handleDrawerOwnLetterHead = useCallback(() => {
        setIsOwnLetterHead(!isOwnLetterHead);
    }, [isOwnLetterHead]);

    //Custom Header & Footer
    const handleDrawerWhatsappView = useCallback(() => {
        setIsHandleDrawerWhatsappView(!isHandleDrawerWhatsappView);
    }, [isHandleDrawerWhatsappView]);

    //Custom
    //Doctor’s information
    const onDoctorInfoSwitchChange = useCallback(
        (checked) => {
            printSettings.header_footer.header.doctor_info.enable = checked ? 'Y' : 'N'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onDoctorInfoPlaceChange = useCallback(
        (e) => {
            printSettings.header_footer.header.doctor_info.place = e.target.value
            printSettings.header_footer.header.clinic_info.place = e.target.value === 'L' ? 'R' : 'L'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onDoctorInfoHeaderChange = useCallback(
        (e) => {
            printSettings.header_footer.header.doctor_info.header = e.target.value
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onDoctorInfoSubHeaderChange = useCallback(
        (e) => {
            printSettings.header_footer.header.doctor_info.subheader = e.target.value
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    //Clinic’s information
    const onClinicInfoSwitchChange = useCallback(
        (checked) => {
            printSettings.header_footer.header.clinic_info.enable = checked ? 'Y' : 'N'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onClinicInfoPlaceChange = useCallback(
        (e) => {
            printSettings.header_footer.header.clinic_info.place = e.target.value
            printSettings.header_footer.header.doctor_info.place = e.target.value === 'L' ? 'R' : 'L'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onClinicInfoHeaderChange = useCallback(
        (e) => {
            printSettings.header_footer.header.clinic_info.header = e.target.value
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onClinicInfoSubHeaderChange = useCallback(
        (e) => {
            printSettings.header_footer.header.clinic_info.subheader = e.target.value
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    //Logo on Header
    const onLogoSwitchChange = useCallback(
        (checked) => {
            printSettings.logo_enable = checked ? 'Y' : 'N'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    // Logo Image
    const handleLogoChange = (e) => {
        if (e.target.files?.length > 0) {
            const fileUrl = e.target.files[0];
            if (fileUrl.size <= 2000000 && (fileUrl.type == 'image/png' || fileUrl.type == 'image/jpeg' || fileUrl.type == 'image/jpg')) {
                setFileLogo({ imageShow: true, showFile: URL.createObjectURL(fileUrl), uploadFile: fileUrl })
            } else {
                errorMessage('Please upload only jpg, jpeg or png files with the max size 2mb.')
            }
        }
    }

    //Footer
    const onFooterTextChange = useCallback(
        (e) => {
            printSettings.header_footer.footer.title = e.target.value
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onSelectFooterFontSize = useCallback(
        (data) => {
            printSettings.header_footer.footer.font_size = data
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    //Upload Letterhead
    //Header Image
    const showHideHeaderModal = useCallback(() => {
        setIsHeaderModalOpen(!isHeaderModalOpen);
    }, [isHeaderModalOpen]);

    const handleHeaderChange = (e) => {
        if (e.target.files?.length > 0) {
            const fileUrl = e.target.files[0];
            if (fileUrl.size <= 2000000 && (fileUrl.type == 'image/png' || fileUrl.type == 'image/jpeg' || fileUrl.type == 'image/jpg')) {
                const reader = new FileReader();
                reader.onload = () => {
                    setFileHeader({ imageShow: false, crop: true, showFile: reader.result, originalFile: fileUrl })
                    showHideHeaderModal()
                };
                reader.readAsDataURL(fileUrl);
            } else {
                errorMessage('Please upload only jpg, jpeg or png files with the max size 2mb.')
            }
        }
    }

    const getHeaderCropData = async () => {
        if (typeof cropperHeaderRef.current?.cropper !== "undefined") {
            const trimData = cropperHeaderRef.current?.cropper.getCroppedCanvas().toDataURL(fileHeader.originalFile.type);
            const uploadFile = await dataUrlToFileUsingFetch(trimData, "header.png", "image/png")
            setFileHeader({ ...fileHeader, crop: false, showFile: trimData, uploadFile: uploadFile })
        }
    };

    const getHeaderCropChangeData = () => {
        if (fileHeader && !fileHeader?.crop) {
            const reader = new FileReader();
            reader.onload = () => {
                setFileHeader({ ...fileHeader, imageShow: false, crop: true, showFile: reader.result })
            };
            reader.readAsDataURL(fileHeader.originalFile);
        }
    };

    const onHeaderImageSubmit = () => {
        setFileHeader({ ...fileHeader, imageShow: true })
        showHideHeaderModal()
    };

    //Footer Image
    const showHideFooterModal = useCallback(() => {
        setIsFooterModalOpen(!isFooterModalOpen);
    }, [isFooterModalOpen]);

    const handleFooterChange = (e) => {
        if (e.target.files?.length > 0) {
            const fileUrl = e.target.files[0];
            if (fileUrl.size <= 2000000 && (fileUrl.type == 'image/png' || fileUrl.type == 'image/jpeg' || fileUrl.type == 'image/jpg')) {
                const reader = new FileReader();
                reader.onload = () => {
                    setFileFooter({ imageShow: false, crop: true, showFile: reader.result, originalFile: fileUrl })
                    showHideFooterModal()
                };
                reader.readAsDataURL(fileUrl);
            } else {
                errorMessage('Please upload only jpg, jpeg or png files with the max size 2mb.')
            }
        }
    }

    const getFooterCropData = async () => {
        if (typeof cropperFooterRef.current?.cropper !== "undefined") {
            const trimData = cropperFooterRef.current?.cropper.getCroppedCanvas().toDataURL(fileFooter.originalFile.type);
            const uploadFile = await dataUrlToFileUsingFetch(trimData, "footer.png", "image/png")
            setFileFooter({ ...fileFooter, crop: false, showFile: trimData, uploadFile: uploadFile })
        }
    };

    const getFooterCropChangeData = () => {
        if (fileFooter && !fileFooter?.crop) {
            const reader = new FileReader();
            reader.onload = () => {
                setFileFooter({ ...fileFooter, imageShow: false, crop: true, showFile: reader.result })
            };
            reader.readAsDataURL(fileFooter.originalFile);
        }
    };

    const onFooterImageSubmit = () => {
        setFileFooter({ ...fileFooter, imageShow: true })
        showHideFooterModal()
    };

    //Own Letterhead
    const onTopMarginChange = useCallback(
        (e) => {
            if (e.target.value <= 15) {
                printSettings.header_footer.margin.top = e.target.value
                setPrintSettings((prev) => {
                    return {
                        ...prev
                    };
                });
            }
        },
        [printSettings]
    );

    const onLeftMarginChange = useCallback(
        (e) => {
            if (e.target.value <= 10) {
                printSettings.header_footer.margin.left = e.target.value
                setPrintSettings((prev) => {
                    return {
                        ...prev
                    };
                });
            }
        },
        [printSettings]
    );

    const onRightMarginChange = useCallback(
        (e) => {
            if (e.target.value <= 10) {
                printSettings.header_footer.margin.right = e.target.value
                setPrintSettings((prev) => {
                    return {
                        ...prev
                    };
                });
            }
        },
        [printSettings]
    );

    const onBottomMarginChange = useCallback(
        (e) => {
            if (e.target.value <= 15) {
                printSettings.header_footer.margin.bottom = e.target.value
                setPrintSettings((prev) => {
                    return {
                        ...prev
                    };
                });
            }
        },
        [printSettings]
    );

    const updateMargin = useCallback(
        (type, position, value, limit) => {
            setPrintSettings((prev) => {
                // Ensure header_footer and margin objects exist
                const headerFooter = prev.header_footer || {};
                const marginObj = headerFooter[type] || {};
    
                // Update the margin value if within limit
                if (value <= limit) {
                    marginObj[position] = value;
                }
    
                return {
                    ...prev,
                    header_footer: {
                        ...headerFooter,
                        [type]: {
                            ...marginObj,
                        },
                    },
                };
            });
        },
        []
    );
    
    const onMarginChange = (type, position, limit) => (e) => {
        const value = e.target.value;
        updateMargin(type, position, value, limit);
    };
    
    // Handlers for custom letterhead margins
    const onCustomLetterheadTopMarginChange = onMarginChange("custom_letterhead_margin", "top", 15);
    const onCustomLetterheadLeftMarginChange = onMarginChange("custom_letterhead_margin", "left", 10);
    const onCustomLetterheadRightMarginChange = onMarginChange("custom_letterhead_margin", "right", 10);
    const onCustomLetterheadBottomMarginChange = onMarginChange("custom_letterhead_margin", "bottom", 15);
    
    // Handlers for uploaded letterhead margins
    const onUploadedLetterheadTopMarginChange = onMarginChange("uploaded_letterhead_margin", "top", 15);
    const onUploadedLetterheadLeftMarginChange = onMarginChange("uploaded_letterhead_margin", "left", 10);
    const onUploadedLetterheadRightMarginChange = onMarginChange("uploaded_letterhead_margin", "right", 10);
    const onUploadedLetterheadBottomMarginChange = onMarginChange("uploaded_letterhead_margin", "bottom", 15);
    

    //Display Patient Info
    const patientInfoTable = [
        {
            key: 'sort',
            colSpan: 2,
            width: 50,
            align: 'center',
            dataIndex: 'sort',
            render: () => <DragHandle />
        },
        {
            colSpan: 0,
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <div>
                    {record.title}
                </div>
            ),
        },
        {
            dataIndex: 'enable',
            key: 'enable',
            render: (text, record) => <Switch defaultChecked onChange={(checked) => onChangePatientInfo(checked, record)} checked={text != 'Y' ? false : true} />,

        },
    ];

    const onChangePatientInfo = (checked, record) => {
        const index = printSettings.header_footer.patient_info.findIndex(e => e.id == record.id)
        if (index !== -1) {
            printSettings.header_footer.patient_info[index].enable = checked ? 'Y' : 'N'
            // setPrintSettings((prev) => { return [...prev] });
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        }
    };

    const onDragEndPatientInfo = ({ active, over }) => {
        if (active.id !== over?.id) {
            setPrintSettings((prev) => {
                const activeIndex = prev.header_footer.patient_info.findIndex((i) => i.id === active.id);
                const overIndex = prev.header_footer.patient_info.findIndex((i) => i.id === over?.id);
                return {
                    ...prev,
                    header_footer: {
                        header: { ...prev.header_footer.header },
                        footer: { ...prev.header_footer.footer },
                        patient_info: arrayMove(prev.header_footer.patient_info, activeIndex, overIndex),
                        margin: { ...prev.header_footer.margin },
                        other_settings: { ...prev.header_footer.other_settings }
                    }
                };
            });
        }
    };

    //Other Settings
    const onWatermarkSwitchChange = useCallback(
        (checked) => {
            printSettings.water_mark_enable = checked ? 'Y' : 'N'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    // Watermark Image
    const handleWatermarkChange = (e) => {
        if (e.target.files?.length > 0) {
            const fileUrl = e.target.files[0];
            if (fileUrl.size <= 2000000 && (fileUrl.type == 'image/png' || fileUrl.type == 'image/jpeg' || fileUrl.type == 'image/jpg')) {
                setFileWatermark({ imageShow: true, showFile: URL.createObjectURL(fileUrl), uploadFile: fileUrl })
            } else {
                errorMessage('Please upload only jpg, jpeg or png files with the max size 2mb.')
            }
        }
    }

    const onSignatureSwitchChange = useCallback(
        (checked) => {
            printSettings.signature_enable = checked ? 'Y' : 'N'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    //Signature Image
    const showHideSignatureModal = useCallback(() => {
        setIsSignatureModalOpen(!isSignatureModalOpen);
    }, [isSignatureModalOpen]);

    const onSignatureModeChange = useCallback(
        (e) => {
            setSignatureMode(e.target.value)
            setFileSignature(null)
        },
        [signatureMode]
    );

    const handleSignatureChange = (e) => {
        if (e.target.files?.length > 0) {
            const fileUrl = e.target.files[0];
            if (fileUrl.size <= 2000000 && (fileUrl.type == 'image/png' || fileUrl.type == 'image/jpeg' || fileUrl.type == 'image/jpg')) {
                const reader = new FileReader();
                reader.onload = () => {
                    setFileSignature({ imageShow: false, crop: true, readFile: reader.result, originalFile: fileUrl })
                };
                reader.readAsDataURL(fileUrl);
            } else {
                errorMessage('Please upload only jpg, jpeg or png files with the max size 2mb.')
            }
        }
    }

    const onSignatureImageSubmit = () => {
        setFileSignature({ ...fileSignature, imageShow: true })
        printSettings['signature_image_delete'] = 0
        setPrintSettings((prev) => {
            return {
                ...prev
            };
        });
        showHideSignatureModal()
    };

    const onRemoveSignature = () => {
        if (signatureRef.current) {
            signatureRef.current?.clear();
        }
        setFileSignature(null)
        printSettings['signature_image_delete'] = 1
        setPrintSettings((prev) => {
            return {
                ...prev
            };
        });
    };

    const onResetSignature = () => {
        if (signatureRef.current) {
            signatureRef.current?.clear();
        }
        setFileSignature(null)
    };

    const handleTrim = async () => {
        if (signatureMode === 'L') {
            if (signatureRef.current?.isEmpty()) {
                alert('Please provide signature');
                return;
            }
            const trimData = signatureRef.current?.getTrimmedCanvas().toDataURL('image/png');
            const uploadFile = await dataUrlToFileUsingFetch(trimData, "signature.png", "image/png")
            setFileSignature({ ...fileSignature, preview: true, showFile: trimData, uploadFile: uploadFile })
        } else {
            if (typeof cropperSignatureRef.current?.cropper !== "undefined") {
                const trimData = cropperSignatureRef.current?.cropper.getCroppedCanvas().toDataURL(fileSignature.originalFile.type);
                const uploadFile = await dataUrlToFileUsingFetch(trimData, "signature.png", "image/png")
                setFileSignature({ ...fileSignature, preview: true, showFile: trimData, uploadFile: uploadFile })
            }
        }
    }

    const onSignaturePlaceChange = useCallback(
        (e) => {
            printSettings.header_footer.other_settings.signature_place = e.target.value
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onSignatureCheckbox1Change = useCallback(
        (e) => {
            printSettings.header_footer.other_settings.name_of_doctor_enable = e.target.checked ? 'Y' : 'N'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onSignatureCheckbox2Change = useCallback(
        (e) => {
            printSettings.header_footer.other_settings.registration_no_enable = e.target.checked ? 'Y' : 'N'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onSignatureCheckbox3Change = useCallback(
        (e) => {
            printSettings.header_footer.other_settings.qualification_enable = e.target.checked ? 'Y' : 'N'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onSignatureQualificationChange = useCallback(
        (e) => {
            printSettings.header_footer.other_settings.qualification = e.target.value
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onShowQrSwitchChange = useCallback(
        (checked) => {
            printSettings.qrcode_enable = checked ? 'Y' : 'N'
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    return (
        <div className="px-3 form_addnewpatient">
            <div className="border-bottom pb-3 mb-3">
                <Row justify="space-between" className="align-items-center form_addnewpatient mb-1">
                    <Col lg="18">
                        <div className="titleprint">Header & Footer</div>
                    </Col>
                    <Col lg="6">
                        <Button className="btn rounded-10px px-1 border px-3-15" style={{ transform: headerFooterShowHide ? "rotate(90deg)" : "rotate(-90deg)" }} onClick={onHeaderFooterClick}>
                            <i className="icon-right"></i>
                        </Button>
                    </Col>
                </Row>
                <div>Setup your header and Footer</div>

                {headerFooterShowHide && (
                    <div className="mt-4">
                       <div className="my-4">
                          <div className="my-2">Print Header &amp; Footer</div>
                          <Radio.Group
                             value={printSettings?.header_footer?.show_header_footer_page || 'all'}
                             onChange={e => {
                             const next = e.target.value; // allow both 'first' and 'all'
                            setPrintSettings(prev => ({
                             ...prev,
                             header_footer: {
                             ...prev.header_footer,
                             show_header_footer_page: next,
                            },
                        }));
                       }}
                       style={{ width: '100%', display: 'flex' }}
                        >
                       <Radio.Button value="first" style={{ flex: 1, textAlign: 'center' }}>
                        Only on First Page
                        </Radio.Button>
                        <Radio.Button value="all" style={{ flex: 1, textAlign: 'center' }}>
                         On All Pages
                        </Radio.Button>
                        </Radio.Group>
                        </div>
                        <div className="mt-3">
                            <Form.Item className="mb-0">
                                <label className="mb-1 title-common">Select Letterhead Format</label>
                                <Radio.Group className={`d-flex gender-radio all-change-radio ${isMobile ? 'segmented-radio-mobile' : ''}`} onChange={onLetterheadFormatChange} value={printSettings?.letterhead_format}>
                                    <Radio.Button className="w-100 text-center" value={2}>Own Letterhead</Radio.Button>
                                    <Radio.Button className="w-100 text-center" value={1}>Upload Letterhead</Radio.Button>
                                    <Radio.Button className="w-100 text-center" value={0}>Custom</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </div>

                        {printSettings?.letterhead_format === 0 ? (
                            // For Custom tab  
                            <div className="mt-5">
                                <Row justify="space-between" className="align-items-center form_addnewpatient mb-3">
                                    <Col lg="18">
                                        <div className="title-common">Doctor’s information</div>
                                    </Col>
                                    <Col lg="6">
                                        <span className="fw-medium me-2 text-greycolor fs-16">{printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' ? 'Show' : 'Hide'}</span>
                                        <Switch onChange={onDoctorInfoSwitchChange} checked={printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' ? true : false} />
                                    </Col>
                                </Row>

                                {printSettings?.header_footer?.header?.doctor_info?.enable === 'Y' && (
                                    <>
                                        <Form.Item>
                                            <Radio.Group className={`d-flex gender-radio ${isMobile ? 'segmented-radio-mobile' : ''}`} onChange={onDoctorInfoPlaceChange} value={printSettings?.header_footer?.header?.doctor_info?.place}>
                                                <Radio.Button className="w-100 text-center" value="L">Left</Radio.Button>
                                                <Radio.Button className="w-100 text-center" value="R">Right</Radio.Button>
                                            </Radio.Group>
                                        </Form.Item>
                                        <div className="mt-3">
                                            <Form.Item>
                                                <label className="mb-1">Header</label>
                                                <Input className='inputheight41-group' placeholder="Enter Doctor Name" onChange={onDoctorInfoHeaderChange} value={printSettings?.header_footer?.header?.doctor_info?.header} />
                                            </Form.Item>
                                        </div>
                                        <div className="mt-3">
                                            <Form.Item>
                                                <label className="mb-1">Subheader</label>
                                                <TextArea
                                                    className="endreason-textarea subheader-textarea"
                                                    placeholder="Enter Information (Ex: MBBS, MD)"
                                                    style={{
                                                        resize: "none"
                                                    }}
                                                    onChange={onDoctorInfoSubHeaderChange}
                                                    value={printSettings?.header_footer?.header?.doctor_info?.subheader}
                                                />
                                            </Form.Item>
                                        </div>
                                    </>
                                )}

                                <Row justify="space-between" className="align-items-center form_addnewpatient mb-3">
                                    <Col lg="18">
                                        <div className="title-common">Clinic's information</div>
                                    </Col>
                                    <Col lg="6">
                                        <span className="fw-medium me-2 text-greycolor fs-16">{printSettings?.header_footer?.header?.clinic_info?.enable === 'Y' ? 'Show' : 'Hide'}</span>
                                        <Switch onChange={onClinicInfoSwitchChange} checked={printSettings?.header_footer?.header?.clinic_info?.enable === 'Y' ? true : false} />
                                    </Col>
                                </Row>

                                {printSettings?.header_footer?.header?.clinic_info?.enable === 'Y' && (
                                    <>
                                        <Form.Item>
                                            <Radio.Group className={`d-flex gender-radio ${isMobile ? 'segmented-radio-mobile' : ''}`} onChange={onClinicInfoPlaceChange} value={printSettings?.header_footer?.header?.clinic_info?.place}>
                                                <Radio.Button className="w-100 text-center" value="L">Left</Radio.Button>
                                                <Radio.Button className="w-100 text-center" value="R">Right</Radio.Button>
                                            </Radio.Group>
                                        </Form.Item>
                                        <div className="mt-3">
                                            <Form.Item>
                                                <label className="mb-1">Header</label>
                                                <Input className='inputheight41-group' placeholder="Enter Clinic Name" onChange={onClinicInfoHeaderChange} value={printSettings?.header_footer?.header?.clinic_info?.header} />
                                            </Form.Item>
                                        </div>
                                        <div className="mt-3">
                                            <Form.Item>
                                                <label className="mb-1">Subheader</label>
                                                <TextArea
                                                    className="endreason-textarea subheader-textarea"
                                                    placeholder="Enter Clinic Address"
                                                    style={{
                                                        resize: "none"
                                                    }}
                                                    onChange={onClinicInfoSubHeaderChange}
                                                    value={printSettings?.header_footer?.header?.clinic_info?.subheader}
                                                />
                                            </Form.Item>
                                        </div>
                                    </>
                                )}

                                <Row justify="space-between" className="align-items-center form_addnewpatient mb-3">
                                    <Col lg="18">
                                        <div className="title-common">Logo on Header</div>
                                    </Col>
                                    <Col lg="6">
                                        <span className="fw-medium me-2 text-greycolor fs-16">{printSettings?.logo_enable === 'Y' ? 'Show' : 'Hide'}</span>
                                        <Switch onChange={onLogoSwitchChange} checked={printSettings?.logo_enable === 'Y' ? true : false} />
                                    </Col>
                                </Row>

                                {printSettings?.logo_enable === 'Y' && (
                                    <div className="upload-headfoot upload-headfoot2 p-3">
                                        <div className="d-flex align-items-center justify-content-between">
                                            {fileLogo && fileLogo?.imageShow ?
                                                <img
                                                    style={{ height: 62, objectFit: 'contain', overflow: 'hidden' }}
                                                    src={fileLogo?.showFile} />
                                                :
                                                <div className="text-start fontroboto">Upload a picture of your<br /> Logo</div>
                                            }
                                            <div className="btn btn-input btn-41 d-flex align-items-center justify-content-center" onClick={() => inputLogoFile.current?.click()}>
                                                <input
                                                    key={Math.random()}
                                                    ref={inputLogoFile}
                                                    // className="image-upload-input"
                                                    style={{ display: 'none' }}
                                                    type="file"
                                                    accept="image/png"
                                                    onChange={handleLogoChange} />
                                                <span><i className="icon-upload me-2"></i>{fileLogo && fileLogo?.imageShow ? 'Change' : 'Upload'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3">
                                    <Form.Item>
                                        <label className="mb-1">Footer Text</label>
                                        <Input className='inputheight41-group' placeholder="Enter Footer Text" onChange={onFooterTextChange} value={printSettings?.header_footer?.footer?.title} />
                                    </Form.Item>
                                </div>

                                <div className="mt-3">
                                    <Form.Item>
                                        <label className="mb-1">Footer Font Size</label>
                                        <Select
                                            // showSearch
                                            className="autocomplete-custom"
                                            placeholder="Select footer font size"
                                            options={FONTS_SIZE_LIST}
                                            value={printSettings?.header_footer?.footer?.font_size}
                                            onSelect={onSelectFooterFontSize}
                                            allowClear
                                        />
                                    </Form.Item>
                                </div>

                                <div className="mt-5">
                                <Row justify="space-between" className="align-items-center form_addnewpatient mb-1">
                                    <Col lg="24">
                                        <div className="title-common">Set page margins to display your own letterhead</div>
                                    </Col>
                                </Row>
                                <div className="">
                                    <div className="my-3 text-center">
                                        <label className="mb-1">Top (cm)</label> <br />
                                        <Input className='inputheight41-group' value={printSettings?.header_footer?.custom_letterhead_margin?.top} onChange={onCustomLetterheadTopMarginChange} style={{ width: 70 }} />
                                    </div>
                                    <Row className="align-items-center justify-content-around form_addnewpatient mb-1">
                                        <Col lg="6">
                                            <div className="text-center">
                                                <label className="mb-1">Left (cm)</label> <br />
                                                <Input className='inputheight41-group' value={printSettings?.header_footer?.custom_letterhead_margin?.left} onChange={onCustomLetterheadLeftMarginChange} style={{ width: 70 }} />
                                            </div>
                                        </Col>
                                        <Col lg="12">
                                            <img src={rxDisplayArea} />
                                        </Col>
                                        <Col lg="6">
                                            <div className="text-center">
                                                <label className="mb-1">Right (cm)</label> <br />
                                                <Input className='inputheight41-group' value={printSettings?.header_footer?.custom_letterhead_margin?.right} onChange={onCustomLetterheadRightMarginChange} style={{ width: 70 }} />
                                            </div>
                                        </Col>
                                    </Row>
                                    <div className="my-3 text-center">
                                        <Input className='inputheight41-group' value={printSettings?.header_footer?.custom_letterhead_margin?.bottom} onChange={onCustomLetterheadBottomMarginChange} style={{ width: 70 }} /> <br />
                                        <label className="mb-1">Bottom (cm)</label>
                                    </div>
                                </div>

                                </div>

                                {caseManagerData !== undefined && (
                                    <>
                                        <Row justify="space-between" className="align-items-center form_addnewpatient mb-1">
                                            <Col lg="18">
                                                <div className="title-common"><img className="img-fluid me-2" width={25} src={wtsp} alt="Header" /> See WhatsApp Rx preview </div>
                                            </Col>
                                            <Col lg="6">
                                                <div className="d-flex align-items-center" onClick={handleDrawerWhatsappView}>
                                                    <i className="icon-Preview"></i>
                                                    <button className='btn btn-text'>
                                                        <span>Preview Now</span>
                                                    </button>
                                                </div>
                                            </Col>
                                        </Row>
                                        <Drawer closeIcon={false} placement="right" onClose={handleDrawerWhatsappView} open={isHandleDrawerWhatsappView} width="100%" height="100%">
                                            <WhatsappConfigureView handleDrawerWhatsappView={handleDrawerWhatsappView} todayVaccines={todayVaccines} growthChartDetails={growthChartDetails} obstetricDetails={obstetricDetails} patientBills={patientBills} advanceReceipts={advanceReceipts} patientWalletBalance={patientWalletBalance} />
                                        </Drawer>
                                    </>
                                )}

                            </div>
                        ) : printSettings?.letterhead_format === 1 ? (
                            //For Upload Letter head tab
                            <div className="mt-5">
                                <Row justify="space-between" className="align-items-center form_addnewpatient mb-1">
                                    <Col lg="24">
                                        <div className="title-common">Upload your header and footer image</div>
                                    </Col>
                                </Row>
                                <div className="upload-headfoot">
                                    {fileHeader && fileHeader?.imageShow ? (
                                        <>
                                            <img
                                                style={{ width: '100%', objectFit: 'contain', overflow: 'hidden' }}
                                                src={fileHeader?.showFile} />
                                            <Button className="btn btn-headfoot" onClick={() => inputHeaderFile.current?.click()}><i className="icon-Edit me-1"></i>Edit</Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="fw-medium text-decoration-underline cursor-pointer" onClick={() => inputHeaderFile.current?.click()}>Upload Header</div>
                                            <div className="fs-12-1 fontroboto"> Only jpg, jpeg or png files with the max size 2mb.</div>
                                        </>
                                    )}
                                    <input
                                        key={Math.random()}
                                        ref={inputHeaderFile}
                                        // className="image-upload-input"
                                        style={{ display: 'none' }}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleHeaderChange} />
                                    <CommonModal
                                        handleCancel={true}
                                        isModalOpen={isHeaderModalOpen}
                                        onCancel={showHideHeaderModal}
                                        modalWidth={744}
                                        // title={"Crop Image"}
                                        title={
                                            <div className='d-flex'>
                                                <div className='align-items-center d-flex w-100'>
                                                    <div className="text-truncate-twolines">{'Crop Image'}</div>
                                                </div>
                                                <Button type='button' disabled={fileHeader && !fileHeader?.crop ? false : true} className="btn-41 btn px-4 btn-primary3 me-4" onClick={onHeaderImageSubmit}>
                                                    Submit
                                                </Button>
                                            </div>
                                        }
                                        modalBody={
                                            <>
                                                <div className="d-flex image-crop bg-dark justify-content-center align-items-center">
                                                    {fileHeader && fileHeader.crop ? (
                                                        <Cropper
                                                            ref={cropperHeaderRef}
                                                            // zoomTo={0.5}
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            // initialAspectRatio={1}
                                                            preview=".img-preview"
                                                            src={fileHeader ? fileHeader?.showFile : defaultprofile}
                                                            viewMode={3}
                                                            background={false}
                                                            autoCropArea={0.3}
                                                            guides={false}
                                                        />
                                                    ) : (
                                                        <img
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            src={fileHeader ? fileHeader?.showFile : defaultprofile} />
                                                    )}
                                                </div>
                                                <div className="mt-4">
                                                    <div className="d-flex align-items-center mt-2 justify-content-between">
                                                        <div className="fw-normal text-decoration-underline btn p-0 text-main" onClick={showHideHeaderModal}>
                                                            {fileHeader && !fileHeader?.crop ? '' : 'Discard'}
                                                        </div>
                                                        <div className="fw-normal text-decoration-underline btn p-0 text-main" onClick={() => fileHeader && !fileHeader?.crop ? getHeaderCropChangeData() : getHeaderCropData()}>
                                                            {fileHeader && !fileHeader?.crop ? 'Change' : 'Save'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        }
                                    />
                                </div>
                                <div className="upload-headfoot">
                                    {fileFooter && fileFooter?.imageShow ? (
                                        <>
                                            <img
                                                style={{ width: '100%', objectFit: 'contain', overflow: 'hidden' }}
                                                src={fileFooter?.showFile} />
                                            <Button className="btn btn-headfoot" onClick={() => inputFooterFile.current?.click()}><i className="icon-Edit me-1"></i>Edit</Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="fw-medium text-decoration-underline cursor-pointer" onClick={() => inputFooterFile.current?.click()}>Upload Footer</div>
                                            <div className="fs-12-1 fontroboto"> Only jpg, jpeg or png files with the max size 2mb.</div>
                                        </>
                                    )}
                                    <input
                                        key={Math.random()}
                                        ref={inputFooterFile}
                                        // className="image-upload-input"
                                        style={{ display: 'none' }}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFooterChange} />
                                    <CommonModal
                                        handleCancel={true}
                                        isModalOpen={isFooterModalOpen}
                                        onCancel={showHideFooterModal}
                                        modalWidth={744}
                                        // title={"Crop Image"}
                                        title={
                                            <div className='d-flex'>
                                                <div className='align-items-center d-flex w-100'>
                                                    <div className="text-truncate-twolines">{'Crop Image'}</div>
                                                </div>
                                                <Button type='button' disabled={fileFooter && !fileFooter?.crop ? false : true} className="btn-41 btn px-4 btn-primary3 me-4" onClick={onFooterImageSubmit}>
                                                    Submit
                                                </Button>
                                            </div>
                                        }
                                        modalBody={
                                            <>
                                                <div className="d-flex image-crop bg-dark justify-content-center align-items-center">
                                                    {fileFooter && fileFooter.crop ? (
                                                        <Cropper
                                                            ref={cropperFooterRef}
                                                            // zoomTo={0.5}
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            // initialAspectRatio={1}
                                                            preview=".img-preview"
                                                            src={fileFooter ? fileFooter?.showFile : defaultprofile}
                                                            viewMode={3}
                                                            background={false}
                                                            autoCropArea={0.3}
                                                            guides={false}
                                                        />
                                                    ) : (
                                                        <img
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            src={fileFooter ? fileFooter?.showFile : defaultprofile} />
                                                    )}
                                                </div>
                                                <div className="mt-4">
                                                    <div className="d-flex align-items-center mt-2 justify-content-between">
                                                        <div className="fw-normal text-decoration-underline btn p-0 text-main" onClick={showHideFooterModal}>
                                                            {fileFooter && !fileFooter?.crop ? '' : 'Discard'}
                                                        </div>
                                                        <div className="fw-normal text-decoration-underline btn p-0 text-main" onClick={() => fileFooter && !fileFooter?.crop ? getFooterCropChangeData() : getFooterCropData()}>
                                                            {fileFooter && !fileFooter?.crop ? 'Change' : 'Save'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        }
                                    />
                                </div>
                                <div className="mt-5">
                                <Row justify="space-between" className="align-items-center form_addnewpatient mb-1">
                                    <Col lg="24">
                                        <div className="title-common">Set page margins to display your own letterhead</div>
                                    </Col>
                                </Row>
                                <div className="">
                                    <div className="my-3 text-center">
                                        <label className="mb-1">Top (cm)</label> <br />
                                        <Input className='inputheight41-group' value={printSettings?.header_footer?.uploaded_letterhead_margin?.top} onChange={onUploadedLetterheadTopMarginChange} style={{ width: 70 }} />
                                    </div>
                                    <Row className="align-items-center justify-content-around form_addnewpatient mb-1">
                                        <Col lg="6">
                                            <div className="text-center">
                                                <label className="mb-1">Left (cm)</label> <br />
                                                <Input className='inputheight41-group' value={printSettings?.header_footer?.uploaded_letterhead_margin?.left} onChange={onUploadedLetterheadLeftMarginChange} style={{ width: 70 }} />
                                            </div>
                                        </Col>
                                        <Col lg="12">
                                            <img src={rxDisplayArea} />
                                        </Col>
                                        <Col lg="6">
                                            <div className="text-center">
                                                <label className="mb-1">Right (cm)</label> <br />
                                                <Input className='inputheight41-group' value={printSettings?.header_footer?.uploaded_letterhead_margin?.right} onChange={onUploadedLetterheadRightMarginChange} style={{ width: 70 }} />
                                            </div>
                                        </Col>
                                    </Row>
                                    <div className="my-3 text-center">
                                        <Input className='inputheight41-group' value={printSettings?.header_footer?.uploaded_letterhead_margin?.bottom} onChange={onUploadedLetterheadBottomMarginChange} style={{ width: 70 }} /> <br />
                                        <label className="mb-1">Bottom (cm)</label>
                                    </div>
                                </div>
                                </div>
                                {caseManagerData !== undefined && (
                                    <>
                                        <Row justify="space-between" className="align-items-center form_addnewpatient mb-1">
                                            <Col lg="18">
                                                <div className="title-common"><img className="img-fluid me-2" width={25} src={wtsp} alt="Header" /> See WhatsApp Rx preview </div>
                                            </Col>
                                            <Col lg="6">
                                                <div className="d-flex align-items-center" onClick={handleDrawerWhatsappView}>
                                                    <i className="icon-Preview"></i>
                                                    <button className='btn btn-text'>
                                                        <span>Preview Now</span>
                                                    </button>
                                                </div>
                                            </Col>
                                        </Row>
                                        <Drawer closeIcon={false} placement="right" onClose={handleDrawerWhatsappView} open={isHandleDrawerWhatsappView} width="100%" height="100%">
                                            <WhatsappConfigureView handleDrawerWhatsappView={handleDrawerWhatsappView} todayVaccines={todayVaccines} growthChartDetails={growthChartDetails} obstetricDetails={obstetricDetails} patientBills={patientBills} advanceReceipts={advanceReceipts} patientWalletBalance={patientWalletBalance} />
                                        </Drawer>
                                    </>
                                )}

                            </div>
                        ) : printSettings?.letterhead_format === 2 && (
                            // For Own Letterhead tab 
                            <div className="mt-5">
                                <Row justify="space-between" className="align-items-center form_addnewpatient mb-1">
                                    <Col lg="24">
                                        <div className="title-common">Set page margins to display your own letterhead</div>
                                    </Col>
                                </Row>
                                <div className="">
                                    <div className="my-3 text-center">
                                        <label className="mb-1">Top (cm)</label> <br />
                                        <Input className='inputheight41-group' value={printSettings?.header_footer?.margin?.top} onChange={onTopMarginChange} style={{ width: 70 }} />
                                    </div>
                                    <Row className="align-items-center justify-content-around form_addnewpatient mb-1">
                                        <Col lg="6">
                                            <div className="text-center">
                                                <label className="mb-1">Left (cm)</label> <br />
                                                <Input className='inputheight41-group' value={printSettings?.header_footer?.margin?.left} onChange={onLeftMarginChange} style={{ width: 70 }} />
                                            </div>
                                        </Col>
                                        <Col lg="12">
                                            <img src={rxDisplayArea} />
                                        </Col>
                                        <Col lg="6">
                                            <div className="text-center">
                                                <label className="mb-1">Right (cm)</label> <br />
                                                <Input className='inputheight41-group' value={printSettings?.header_footer?.margin?.right} onChange={onRightMarginChange} style={{ width: 70 }} />
                                            </div>
                                        </Col>
                                    </Row>
                                    <div className="my-3 text-center">
                                        <Input className='inputheight41-group' value={printSettings?.header_footer?.margin?.bottom} onChange={onBottomMarginChange} style={{ width: 70 }} /> <br />
                                        <label className="mb-1">Bottom (cm)</label>
                                    </div>
                                </div>

                                {caseManagerData !== undefined && (
                                    <>
                                        <Row justify="space-between" className="align-items-center form_addnewpatient mb-1">
                                            <Col lg="18">
                                                <div className="title-common"><img className="img-fluid me-2" width={25} src={wtsp} alt="Header" /> See WhatsApp Rx preview </div>
                                                <div className="fontroboto text-greycolor" style={{ marginLeft: 37, fontSize: 13 }}> You can edit your WhatsApp preview </div>
                                            </Col>
                                            <Col lg="6">
                                                <div className="d-flex align-items-center" onClick={handleDrawerOwnLetterHead}>
                                                    <i className="icon-Preview"></i>
                                                    <button className='btn btn-text'>
                                                        <span>Preview Now</span>
                                                    </button>
                                                </div>
                                            </Col>
                                        </Row>
                                        <Drawer closeIcon={false} placement="right" onClose={handleDrawerOwnLetterHead} open={isOwnLetterHead} width="100%">
                                            <WhatsappConfigure handleDrawerOwnLetterHead={handleDrawerOwnLetterHead} todayVaccines={todayVaccines} growthChartDetails={growthChartDetails} obstetricDetails={obstetricDetails} patientBills={patientBills} advanceReceipts={advanceReceipts} patientWalletBalance={patientWalletBalance} />
                                        </Drawer>
                                    </>
                                )}

                            </div>
                        )}

                    </div>
                )}

            </div>

            {caseManagerData !== undefined && (
                <div className="border-bottom pb-3 mb-3">
                    <Row justify="space-between" className="align-items-center form_addnewpatient mb-1">
                        <Col lg="18">
                            <div className="titleprint">Display Patient Info</div>
                        </Col>
                        <Col lg="6">
                            <Button className="btn rounded-10px px-1 border px-3-15" style={{ transform: patientInfoShowHide ? "rotate(90deg)" : "rotate(-90deg)" }} onClick={onPatientInfoClick}>
                                <i className="icon-right"></i>
                            </Button>

                        </Col>

                    </Row>
                    <div>Manage your patient information</div>
                    {patientInfoShowHide && (
                        <>
                            <div className="my-4">
                                <div className="my-2">Show Patient Info</div>
                                <Radio.Group
                                    value={printSettings?.header_footer?.show_patient_info || 'first'}
                                    onChange={e => {
                                        setPrintSettings(prev => ({
                                            ...prev,
                                            header_footer: {
                                                ...prev.header_footer,
                                                show_patient_info: e.target.value
                                            }
                                        }));
                                    }}
                                    style={{ width: '100%', display: 'flex' }}
                                >
                                    <Radio.Button value="first" style={{ flex: 1, textAlign: 'center' }}>Only on First Page</Radio.Button>
                                    <Radio.Button value="all" style={{ flex: 1, textAlign: 'center' }}>On All Pages</Radio.Button>
                                </Radio.Group>
                            </div>
                            <div className="mt-4">
                                <div className="mt-4">
                                    <Row justify="space-between" className="align-items-center form_addnewpatient mb-3">
                                        <Col lg={24}>
                                            <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEndPatientInfo}>
                                                <SortableContext
                                                    // rowKey array
                                                    items={printSettings?.header_footer?.patient_info.map((i) => i.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    <Table
                                                        className='customize-table table-display-patient'
                                                        pagination={false}
                                                        components={{
                                                            body: {
                                                                row: CustomRow,
                                                            },
                                                        }}
                                                        rowKey="id"
                                                        columns={patientInfoTable}
                                                        dataSource={printSettings?.header_footer?.patient_info}
                                                        showHeader={false}
                                                    />
                                                </SortableContext>
                                            </DndContext>
                                        </Col>
                                    </Row>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="mb-3">
                <Row justify="space-between" className="align-items-center form_addnewpatient mb-1">
                    <Col lg="18">
                        <div className="titleprint">Other Settings</div>
                    </Col>
                    <Col lg="6">
                        <Button className="btn rounded-10px px-1 border px-3-15" style={{ transform: settingsShowHide ? "rotate(90deg)" : "rotate(-90deg)" }} onClick={onSettingsClick}>
                            <i className="icon-right"></i>
                        </Button>
                    </Col>
                </Row>
                <div>Customize your watermark, signature, and QR code</div>

                {settingsShowHide && (
                    <div className="mt-4">
                        <div className="mb-3">
                            <Row justify="space-between" className="align-items-center form_addnewpatient">
                                <Col lg="18">
                                    <div className="title-common">Watermark</div>
                                </Col>
                                <Col lg="6">
                                    <Switch onChange={onWatermarkSwitchChange} checked={printSettings?.water_mark_enable === 'Y' ? true : false} />
                                </Col>
                            </Row>
                            {printSettings?.water_mark_enable === 'Y' && (
                                <div className="upload-headfoot upload-headfoot1 p-3">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <img
                                            style={{ height: 62, objectFit: 'contain', overflow: 'hidden' }}
                                            src={fileWatermark && fileWatermark?.imageShow ? fileWatermark?.showFile : defaultprofile} />
                                        <div className="btn btn-input btn-41 d-flex align-items-center justify-content-center" onClick={() => inputWatermarkFile.current?.click()}>
                                            <input
                                                key={Math.random()}
                                                ref={inputWatermarkFile}
                                                // className="image-upload-input"
                                                style={{ display: 'none' }}
                                                type="file"
                                                accept="image/png"
                                                onChange={handleWatermarkChange} />
                                            <span><i className="icon-upload me-2"></i>{fileWatermark && fileWatermark?.imageShow ? 'Change' : 'Upload New'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <Row justify="space-between" className="align-items-center form_addnewpatient mb-3">
                                <Col lg="18">
                                    <div className="title-common">Signature</div>
                                </Col>
                                <Col lg="6">
                                    <Switch onChange={onSignatureSwitchChange} checked={printSettings?.signature_enable === 'Y' ? true : false} />
                                </Col>
                            </Row>
                            {printSettings?.signature_enable === 'Y' && (
                                <div>
                                    <Form.Item className="mb-0 mt-3">
                                        <Radio.Group className={`d-flex gender-radio ${isMobile ? 'segmented-radio-mobile' : ''}`} onChange={onSignaturePlaceChange} value={printSettings?.header_footer?.other_settings?.signature_place}>
                                            <Radio.Button className="w-100 text-center" value="L">Left</Radio.Button>
                                            <Radio.Button className="w-100 text-center" value="R">Right</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                    <div className="border rounded-10px mt-3">
                                        <div className="upload-headfoot border-0 border-bottom rounded-bottom-0 mt-0">
                                            {fileSignature && fileSignature?.imageShow ? (
                                                <>
                                                    <img
                                                        style={{ width: '100%', objectFit: 'contain', overflow: 'hidden' }}
                                                        src={fileSignature?.showFile} />
                                                    <Button className="btn btn-headfoot btn-headfoot2 px-2" onClick={onRemoveSignature}><i className="icon-delete"></i></Button>
                                                    <Button className="btn btn-headfoot px-2" onClick={showHideSignatureModal}><i className="icon-Edit"></i></Button>
                                                </>
                                            ) : (
                                                <div className="fw-medium text-decoration-underline cursor-pointer" onClick={showHideSignatureModal}>Draw or Upload Signature</div>
                                            )}
                                            <CommonModal
                                                handleCancel={true}
                                                isModalOpen={isSignatureModalOpen}
                                                onCancel={showHideSignatureModal}
                                                modalWidth={744}
                                                title={
                                                    <div className='d-flex'>
                                                        <div className='align-items-center d-flex w-100'>
                                                            <div className="text-truncate-twolines">{'Signature Image'}</div>
                                                        </div>
                                                        <Button type='button' disabled={fileSignature && fileSignature?.preview ? false : true} className="btn-41 btn px-4 btn-primary3 me-4" onClick={onSignatureImageSubmit}>
                                                            Submit
                                                        </Button>
                                                    </div>
                                                }
                                                modalBody={
                                                    <>
                                                        <div>
                                                            <div className="rounded-top-3 bg-body border border-bottom-0 d-flex align-items-center justify-content-between p-2">
                                                                <div className="fw-medium fontroboto text-main ms-2">
                                                                    {'Draw Signature'}
                                                                </div>
                                                                <div>
                                                                    <Form.Item className="mb-0">
                                                                        <Radio.Group className={`d-flex gender-radio draw-upload ${isMobile ? 'segmented-radio-mobile' : ''}`} onChange={onSignatureModeChange} value={signatureMode}>
                                                                            <Radio.Button className="w-100 text-center" value="L"><div className="d-flex align-items-center"><i className="fs-18 icon-Edit me-1"></i><span className="fontroboto fs-12-1 fw-medium">Draw</span></div></Radio.Button>
                                                                            <Radio.Button className="w-100 text-center" value="R" ><div className="d-flex align-items-center"><i className="fs-16 icon-upload me-1"></i><span className="fontroboto fs-12-1 fw-medium">Upload</span></div></Radio.Button>
                                                                        </Radio.Group>
                                                                    </Form.Item>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex image-crop border justify-content-center align-items-center">
                                                                {signatureMode === 'L' ? (
                                                                    <SignatureCanvas
                                                                        ref={signatureRef}
                                                                        canvasProps={{ width: 694, height: 189 }} />
                                                                ) : (
                                                                    <>
                                                                        {fileSignature && fileSignature.crop ? (
                                                                            <Cropper
                                                                                ref={cropperSignatureRef}
                                                                                // zoomTo={0.5}
                                                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                                                // initialAspectRatio={1}
                                                                                preview=".img-preview"
                                                                                src={fileSignature ? fileSignature?.readFile : defaultprofile}
                                                                                viewMode={3}
                                                                                background={false}
                                                                                autoCropArea={0.3}
                                                                                guides={false}
                                                                            />
                                                                        ) : (
                                                                            <>
                                                                                <div className="fw-medium text-decoration-underline cursor-pointer" onClick={() => inputSignatureFile.current?.click()}>Upload Signature</div>
                                                                                <input
                                                                                    key={Math.random()}
                                                                                    ref={inputSignatureFile}
                                                                                    // className="image-upload-input"
                                                                                    style={{ display: 'none' }}
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    onChange={handleSignatureChange} />
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="d-flex align-items-center justify-content-between rounded-bottom-3 border border-top-0 p-2">
                                                                <div className="fw-medium text-decoration-underline btn p-0 text-main" onClick={onResetSignature}>
                                                                    {'Reset'}
                                                                </div>
                                                                <div className="fw-medium text-decoration-underline btn p-0 text-main" onClick={handleTrim}>
                                                                    {fileSignature && fileSignature?.preview ? 'Change' : 'Save'}
                                                                </div>
                                                            </div>
                                                            <div className='mt-4'>
                                                                <div className="fw-normal text-main fw-medium fontroboto mb-1">
                                                                    {'Signature Preview'}
                                                                </div>
                                                                <div style={{ height: 100, width: 200, border: '1px solid', borderColor: '#E2E2EA', backgroundColor: '#FAFAFB', borderRadius: '10px' }}>
                                                                    {fileSignature && fileSignature?.preview && (
                                                                        <img
                                                                            style={{ width: '100%', height: '100px', objectFit: 'contain', overflow: 'hidden' }}
                                                                            src={fileSignature?.showFile} />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                }
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="title-common mb-3">Include in signature</div>
                                            <div className="mb-3">
                                                <Checkbox className="switch-name-check" onChange={onSignatureCheckbox1Change} checked={printSettings?.header_footer?.other_settings?.name_of_doctor_enable != 'Y' ? false : true} >Name of Doctor</Checkbox>
                                            </div>
                                            <div className="mb-3">
                                                <Checkbox className="switch-name-check" onChange={onSignatureCheckbox2Change} checked={printSettings?.header_footer?.other_settings?.registration_no_enable != 'Y' ? false : true}>Medical Registration Number</Checkbox>
                                            </div>
                                            <div className="mb-3">
                                                <Checkbox className="switch-name-check" onChange={onSignatureCheckbox3Change} checked={printSettings?.header_footer?.other_settings?.qualification_enable != 'Y' ? false : true}>Qualifications</Checkbox>
                                            </div>
                                            <TextArea
                                                className="endreason-textarea h-76"
                                                placeholder="Enter qualification e.g. MBBS, MS, MD"
                                                style={{
                                                    resize: "none"
                                                }}
                                                onChange={onSignatureQualificationChange}
                                                value={printSettings?.header_footer?.other_settings?.qualification}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <Row justify="space-between" className="align-items-center form_addnewpatient mb-3">
                                <Col lg="18">
                                    <div className="title-common">Show QR code</div>
                                </Col>
                                <Col lg="6">
                                    <Switch onChange={onShowQrSwitchChange} checked={printSettings?.qrcode_enable === 'Y' ? true : false} />
                                </Col>
                            </Row>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default React.memo(HeaderFooterLayout);
