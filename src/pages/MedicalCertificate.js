import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button, Drawer, Input, message } from 'antd';
import { Container, Navbar, Row, Col } from 'react-bootstrap';
import CommonModal from '../common/CommonModal';
import { useNavigate, useLocation } from 'react-router-dom';
import JoditEditor from 'jodit-react';
import moment from "moment";

import { useSelector, useDispatch } from "react-redux";

import { MESSAGE_KEY } from "../utils/constants";

import { addPatientCertificate, editPatientCertificate } from "../redux/doctorsSlice";

import CreateCertificate from "../components/medical_certificate/CreateCertificate";
import { errorMessage, getClinicName, removeBeforeWhiteSpace } from "../utils/utils";
import { ASSETS } from "../assets";
const {
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
  alerticon: alertIcon,
  fontsizeicon: fontSizeIcon,
} = ASSETS.images;

function MedicalCertificate() {

    const navigate = useNavigate();

    const { profile, loading } = useSelector((state) => state.doctors);
    const dispatch = useDispatch();

    const { state } = useLocation();
    const { certificate_data, patient_data } = state != null && state;

    const editor = useRef(null);
    // Stable ids for template date inputs (avoids new ids every render / DOM churn).
    const placeholderInputIdsRef = useRef({ startDate: [], endDate: [], joinDate: [], customDate: [] });

    // (Intentionally no debug logs here; keep this file lean.)

    // const [fontSize, setFontSize] = useState('14');

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const [createCertificateDrawer, setCreateCertificateDrawer] = useState(false);
    const [isBackModalOpen, setIsBackModalOpen] = useState(false);

    // Function to generate a random ID
    const generateRandomId = () => {
        return 'id-' + Math.random().toString(36).substring(2, 9);
    };

    const editorValue = useMemo(() => {
        const ids = placeholderInputIdsRef.current;
        const ensureId = (bucket, idx) => {
            if (!bucket[idx]) bucket[idx] = generateRandomId();
            return bucket[idx];
        };
        let startIdx = 0;
        let endIdx = 0;
        let joinIdx = 0;
        let customIdx = 0;

        return (content || "")
            .replace(/{Consulting Doctor}/g, `<label class="consulting_doctor">${profile?.um_name}</label>`)
            .replace(/{Patient Name}/g, `<label class="patient_name">${patient_data?.pm_fullname}</label>`)
            .replace(/{Age}/g, `<label class="age">${patient_data?.ageYears}Y, ${patient_data?.ageMonths}M</label>`)
            .replace(/{Contact Number}/g, `<label class="contact_number">${patient_data?.pm_contact_no}</label>`)
            .replace(/{Gender}/g, `<label class="gender">${patient_data?.pm_gender}</label>`)
            .replace(/{Email}/g, `<label class="email">${patient_data?.pm_email ? patient_data?.pm_email : 'Email'}</label>`)
            .replace(/{Patient ID}/g, `<label class="patient_id">${patient_data?.pm_pid}</label>`)
            .replace(/{Address}/g, `<label class="address">${patient_data?.patient_address ? patient_data?.patient_address : 'Address'}</label>`)
            .replace(/{Blood Group}/g, `<label class="blood_group">${patient_data?.pm_blood_group ? patient_data?.pm_blood_group : 'Blood Group'}</label>`)
            .replace(/{Date of Birth}/g, `<label class="date_of_birth">${patient_data?.DOB}</label>`)
            .replace(/{Today Date}/g, `<label class="today_date">${moment().format('DD-MM-YYYY')}</label>`)
            .replace(/{Department}/g, `<label class="department">${profile?.dp_name}</label>`)
            .replace(/{Referred by}/g, `<label class="referred_by">Enter Referred by</label>`)
            .replace(/{Case Type}/g, `<label class="case_type">Enter Case Type</label>`)
            .replace(/{Last appointment}/g, `<label class="last_appointment">Enter Last appointment</label>`)
            .replace(/{Inpatient Number}/g, `<label class="inpatient_number">Enter Inpatient Number</label>`)
            .replace(/{Ward}/g, `<label class="ward">Enter Ward</label>`)
            .replace(/{Room\/Bed}/g, `<label class="room_bed">Enter Room/Bed</label>`)
            .replace(/{Admitting Doctor}/g, `<label class="admitting_doctor">Enter Admitting Doctor</label>`)
            .replace(/{Admitting Date}/g, `<label class="admitting_date">Enter Admitting Date</label>`)
            .replace(/{Admitting Time}/g, `<label class="admitting_time">Enter Admitting Time</label>`)
            .replace(/{Discharge Date}/g, `<label class="discharge_date">Enter Discharge Date</label>`)
            .replace(/{Discharge Time}/g, `<label class="discharge_time">Enter Discharge Time</label>`)
            .replace(/{Admitted Days}/g, `<label class="admitted_days">Enter Admitted Days</label>`)
            .replace(/{Admission Diagnosis}/g, `<label class="admission_diagnosis">Enter Admission Diagnosis</label>`)
            .replace(/{Discharge Diagnosis}/g, `<label class="discharge_diagnosis">Enter Discharge Diagnosis</label>`)
            .replace(/{Resident of}/g, `<label class="resident_of">Enter Resident of</label>`)
            .replace(/{Start Date}/g, () => `<input type="date" id="${ensureId(ids.startDate, startIdx++)}" value="" class="start_date">`)
            .replace(/{End Date}/g, () => `<input type="date" id="${ensureId(ids.endDate, endIdx++)}" value="" class="end_date">`)
            .replace(/{Join Date}/g, () => `<input type="date" id="${ensureId(ids.joinDate, joinIdx++)}" value="" class="join_date">`)
            .replace(/{Custom Date}/g, () => `<input type="date" id="${ensureId(ids.customDate, customIdx++)}" value="" class="custom_date">`)
            .replace(/{Diagnosis}/g, `<label class="diagnosis">Enter Diagnosis</label>`)
            .replace(/{Time}/g, `<label class="time">Enter Time</label>`)
            .replace(/{Travel From}/g, `<label class="travel_from">Enter Travel From</label>`)
            .replace(/{Travel To}/g, `<label class="travel_to">Enter Travel To</label>`)
            .replace(/{Photo ID card No}/g, `<label class="photo_id_card_no">Enter Photo ID card No</label>`)
            .replace(/{Nationality}/g, `<label class="nationality">Enter Nationality</label>`)
            .replace(/{Passport Number}/g, `<label class="passport_number">Enter Passport Number</label>`)
            .replace(/{Procedure}/g, `<label class="procedure">Enter Procedure</label>`)
            .replace(/{Number of Months}/g, `<label class="number_of_months">Enter Number of Months</label>`);
    }, [content, profile?.um_name, profile?.dp_name, patient_data]);

    const TOOLBAR = useMemo(() => ([
        'undo', 'redo',
        {
            // name: fontSize,
            name: 'font size',
            iconURL: fontSizeIcon,
            command: 'fontSize',
            list: [
                '8',
                '10',
                '12',
                '14',
                '16',
            ],
            tooltip: 'Font size',
            // exec: (editor, current, options) => {
            //     if(options.control.args!==undefined){
            //         const size = options.control.args[0];
            //         setFontSize(size)
            //     }
            //     return false
            // },
        },
        // 'fontsize',
        'align', 'bold', 'italic', 'underline', 'ul', 'ol',
        {
            name: 'Insert',
            // iconURL: 'https://img.icons8.com/ios-glyphs/30/000000/menu.png',
            list: {
                option1: `Doctor Name`,
                option2: `Patient Name`,
                option3: `Patient Age`,
                option4: `Patient's Mobile No.`,
                option5: `Gender`,
                option6: `Today's Date`,
                option7: `Custom Date`,
                option8: `Add Text Input`,
                option9: `Email`,
            },
            exec: (editor, current, options, originalEvent, btn) => {
                const randomId = generateRandomId();
                const selectedOption = options.control.name;
                const content = options.originalEvent.target.textContent;

                const insertHTMLContent = (html) => {
                    editor.s.insertHTML(html);
                };

                switch (selectedOption) {
                    case 'option1':
                        insertHTMLContent(`<label class="consulting_doctor">${profile?.um_name}</label>`);
                        break;
                    case 'option2':
                        insertHTMLContent(`<label class="patient_name">${patient_data?.pm_fullname}</label>`);
                        break;
                    case 'option3':
                        insertHTMLContent(`<label class="age">${patient_data?.ageYears} Y, ${patient_data?.ageMonths} M</label>`);
                        break;
                    case 'option4':
                        insertHTMLContent(`<label class="contact_number">${patient_data?.pm_contact_no}</label>`);
                        break;
                    case 'option5':
                        insertHTMLContent(`<label class="gender">${patient_data?.pm_gender}</label>`);
                        break;
                    case 'option6':
                        insertHTMLContent(`<label class="today_date">${moment().format('DD-MM-YYYY')}</label>`);
                        break;
                    case 'option7':
                        insertHTMLContent(`<input type="date" id="${randomId}" value="" class="custom_date">`);
                        break;
                    case 'option8':
                        insertHTMLContent(`<input type="search" id="${randomId}" value=""/>`);
                        break;
                    case 'option9':
                        insertHTMLContent(`<label class="email">${content}</label>`);
                        break;
                    default:
                        break;
                }

                // removeLabelWithoutContent()

                return false

                // if (selectedOption === 'option1') {
                //     editor.s.insertHTML(`<label class="consulting_doctor">${profile?.um_name}</label>`);
                // } else if (selectedOption === 'option2') {
                //     editor.s.insertHTML(`<label class="patient_name">${patient_data?.pm_fullname}</label>`);
                // } else if (selectedOption === 'option3') {
                //     editor.s.insertHTML(`<label class="age">${patient_data?.ageYears} Y, ${patient_data?.ageMonths} M</label>`);
                // } else if (selectedOption === 'option4') {
                //     editor.s.insertHTML(`<label class="contact_number">${patient_data?.pm_contact_no}</label>`);
                // } else if (selectedOption === 'option5') {
                //     editor.s.insertHTML(`<label class="gender">${patient_data?.pm_gender}</label>`);
                // } else if (selectedOption === 'option6') {
                //     editor.s.insertHTML(`<label>${moment().format('DD-MM-YYYY')}</label>`);
                // } else if (selectedOption === 'option7') {
                //     editor.s.insertHTML(`<input type="date" id="${randomId}" value="">`);
                //     const inputElement = document.getElementById(randomId);
                //     inputElement.removeAttribute('value');
                //     if (inputElement) {
                //         inputElement.addEventListener('change', (event) => {
                //             const value = event.target.value;
                //             inputElement.setAttribute('value', value);
                //         });
                //     }
                // } else if (selectedOption === 'option8') {
                //     editor.s.insertHTML(`<input type="search" id="${randomId}" value=""/>`);
                //     const inputElement = document.getElementById(randomId);
                //     inputElement.removeAttribute('value');
                //     if (inputElement) {
                //         inputElement.addEventListener('keyup', (event) => {
                //             const value = event.target.value;
                //             inputElement.setAttribute('value', value);
                //         });
                //     }
                // } else if (selectedOption === 'option9') {
                //     editor.s.insertHTML(`<label class="email">${content}</label>`);
                // }
            }
        }
    ]), [profile?.um_name, patient_data?.pm_fullname, patient_data?.ageYears, patient_data?.ageMonths, patient_data?.pm_contact_no, patient_data?.pm_gender]);

    const config = useMemo(() => ({
        statusbar: false,
        // Force non-iframe mode when possible; if Jodit still uses iframe internally on some devices,
        // we also attach shields to the editor's own document in afterInit.
        iframe: false,
        placeholder: '',
        buttons: TOOLBAR,
        buttonsSM: TOOLBAR,
        buttonsMD: TOOLBAR,
        buttonsXS: TOOLBAR,
        askBeforePasteFromWord: false,
        askBeforePasteHTML: false,
        defaultActionOnPaste: "insert_as_html",
        uploader: {
            insertImageAsBase64URI: true,
            url: 'none', // Explicitly set to 'none' to indicate no URL endpoint
            filesVariableName: function (i) {
                return 'files[' + i + ']';
            },
            process: function (resp) {
                return {
                    files: resp
                };
            },
            defaultHandlerSuccess: function (data, resp) {
                console.log(data);
            },
            error: function (e) {
                console.error(e);
            },
        },
        events: {
            processPaste: (event, html) => {
                // const cleanedHtml = html.replace(/(^|;)\s*font-family[^;]+/g, "");
                // return cleanedHtml;

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                console.log(tempDiv)

                const elementsToProcess = tempDiv.querySelectorAll('[style], svg, img, a');

                elementsToProcess.forEach(element => {
                    // Remove the inline style if it exists
                    if (element.hasAttribute('style')) {
                        element.removeAttribute('style');
                    }

                    // If the element is svg, img, or a, replace it with its inner content
                    if (['svg', 'img', 'a'].includes(element.tagName.toLowerCase())) {
                        const fragment = document.createDocumentFragment();
                        while (element.firstChild) {
                            fragment.appendChild(element.firstChild);
                        }
                        element.parentNode.replaceChild(fragment, element);
                    }
                });

                // Remove all font-family styles
                // const elementsWithStyle = tempDiv.querySelectorAll('[style]');
                // elementsWithStyle.forEach(element => {
                //     if (element.getAttribute('style')) {
                //         element.removeAttribute('style');
                //     }
                // });

                // const allElements = tempDiv.querySelectorAll('svg, img, a');
                // allElements.forEach(element => {
                //     // element.style.fontSize = '14px';
                //     // element.remove()
                //     // Create a document fragment to hold the inner content
                //     const fragment = document.createDocumentFragment();

                //     // Move all child nodes of the h1 to the fragment
                //     while (element.firstChild) {
                //         fragment.appendChild(element.firstChild);
                //     }

                //     // Replace the h1 with its inner content
                //     element.parentNode.replaceChild(fragment, element);
                // });

                const cleanedContent = tempDiv.innerHTML;
                // console.log("second", cleanedContent)
                return cleanedContent;
            }
        }
        // controls: {
        //     fontsize: {
        //         list: {
        //             '8px': '8',
        //             '10px': '10',
        //             '12px': '12',
        //             '14px': '14',
        //             '16px': '16',
        //         }
        //     }
        // }
    }), [TOOLBAR]);

    const handleInputChange = useCallback((event) => {
        const inputElement = event.target;
        if (inputElement.type === "date" || inputElement.type === "search") {
            const elementId = inputElement.id;
            const valueToUpdate = document.getElementById(elementId);
            if (valueToUpdate) {
                valueToUpdate.removeAttribute("value");
                if (inputElement.type === "date") {
                    const raw = inputElement.value;
                    const newDateValue =
                        raw && moment(raw).isValid() ? moment(raw).format("DD/MM/YYYY") : "";
                    valueToUpdate.setAttribute("value", newDateValue);
                } else if (inputElement.type === "search") {
                    valueToUpdate.setAttribute("value", inputElement.value);
                }
            }
        }
    }, []);

    const handleAddEventListener = useCallback(() => {
        const dateInputs = document.querySelectorAll('input[type="date"][id]');
        const searchInputs = document.querySelectorAll('input[type="search"][id]');
        dateInputs.forEach((input) => {
            input.removeEventListener("change", handleInputChange);
            input.removeEventListener("input", handleInputChange);
            input.addEventListener("change", handleInputChange);
            input.addEventListener("input", handleInputChange);
        });
        searchInputs.forEach((input) => {
            input.removeEventListener("keyup", handleInputChange);
            input.addEventListener("keyup", handleInputChange);
        });
    }, [handleInputChange]);

    const handleRemoveEventListener = useCallback(() => {
        const dateInputs = document.querySelectorAll('input[type="date"][id]');
        const searchInputs = document.querySelectorAll('input[type="search"][id]');
        dateInputs.forEach((input) => {
            input.removeEventListener("change", handleInputChange);
            input.removeEventListener("input", handleInputChange);
        });
        searchInputs.forEach((input) => {
            input.removeEventListener("keyup", handleInputChange);
        });
    }, [handleInputChange]);

    useEffect(() => {
        handleAddEventListener();
        return () => handleRemoveEventListener();
    }, [content, handleAddEventListener, handleRemoveEventListener]);

    const onEditorChange = useCallback(() => {
        const allInputs = document.querySelectorAll('input[type="date"][id], input[type="search"][id]');
        allInputs.forEach((input) => {
            if (input.type === "date") {
                input.removeEventListener("change", handleInputChange);
                input.removeEventListener("input", handleInputChange);
                input.addEventListener("change", handleInputChange);
                input.addEventListener("input", handleInputChange);
            } else {
                input.removeEventListener("keyup", handleInputChange);
                input.addEventListener("keyup", handleInputChange);
            }
        });
    }, [handleInputChange]);

    useEffect(() => {
        if (certificate_data !== undefined) {
            setTitle(certificate_data?.title);
            setContent(certificate_data?.content);
        } else {
            setTitle('');
            setContent('');
        }
    }, [certificate_data]);

    useEffect(() => {
        const handleBackspace = (event) => {
            if (event.key === 'Backspace') {
                const allLabels = document.querySelectorAll('label');
                allLabels.forEach(label => {
                    if (label.hasAttribute('value') && label.getAttribute('value') == -1 && label.textContent.trim().length === 0) {
                        label.remove();
                    } else if (label.textContent.trim().length === 0) {
                        label.setAttribute('value', -1);
                    } else {
                        label.removeAttribute('value');
                    }
                });
            }
        };

        // Add event listener for keydown event
        document.addEventListener('keydown', handleBackspace);

        // Cleanup the event listener on component unmount
        return () => {
            document.removeEventListener('keydown', handleBackspace);
        };
    }, []);

    // No onChange handling needed; we persist editor content on blur.

    const handleCreateCertificateDrawer = useCallback(() => {
        setCreateCertificateDrawer(!createCertificateDrawer)
    }, [createCertificateDrawer]);

    const showHideBackModal = useCallback(() => {
        setIsBackModalOpen(!isBackModalOpen);
    }, [isBackModalOpen]);

    const onTitleChange = useCallback((e) => {
        setTitle(removeBeforeWhiteSpace(e.target.value));
    }, [title]);

    const onPatientCertificateClick = async () => {
        const clinic_name = getClinicName(profile?.hospital_data);
        window.Moengage.track_event("TP_Certificate_created", {
            clinic_name,
            patient_number: patient_data?.pm_contact_no,
            patient_id: patient_data?.patient_unique_id,
            certificate_type: title,
        })
        var sendData = {
            patient_unique_id: patient_data?.patient_unique_id !== undefined ? patient_data?.patient_unique_id : 0,
            pam_id: patient_data?.pam_id !== undefined ? patient_data?.pam_id : 0,
            tcu_content_id: certificate_data !== undefined ? certificate_data?.id : 0,
            tcu_title: title,
            tcu_content: editor.current?.value
        }
        if (certificate_data?.tcu_id !== undefined) {
            sendData['tcu_id'] = certificate_data?.tcu_id
        }
        const action = certificate_data?.tcu_id !== undefined ? await dispatch(editPatientCertificate(sendData)) : await dispatch(addPatientCertificate(sendData))
        if (action.meta.requestStatus === "fulfilled") {
            message.open({
                key: MESSAGE_KEY,
                type: '',
                className: 'message-appointment',
                content: (
                    <div className='d-flex align-items-center'>
                        <img src={visitEnd} className='me-3' />
                        <div>
                            <div className='title-common text-start fontroboto'>Certificate saved successfully</div>
                            <div className='fontroboto text-start fw-normal mt-1'>View certificates in Patient Details.</div>
                        </div>
                        <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
                    </div>
                ),
                duration: 5,
            });
            navigate('/certificate_print_view', {
                replace: true, state: {
                    ...action.payload,
                    patient_data: patient_data,
                    tcu_content_id: certificate_data !== undefined ? certificate_data?.id : 0,
                    pms_default: certificate_data !== undefined ? certificate_data?.pms_default : 0,
                    tcu_title: sendData?.tcu_title,
                    tcu_content: sendData?.tcu_content
                }
            })
        } else {
            errorMessage(action.error)
        }
    }

    return (
        <div>
            <Navbar className="justify-content-between headerprescription p-0 bg-white">
                <Container fluid className='h-100 gx-0 w-100'>
                    <Row className='h-100 align-items-center w-100 justify-content-between'>
                        <Col sm="auto" className='h-100'>
                            <div className='align-items-center d-flex h-100'>
                                <div className='border-end h-100 text-center me-3'>
                                    <div onClick={showHideBackModal} className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                                        <i className='icon-right'></i>
                                    </div>
                                    <CommonModal
                                        isModalOpen={isBackModalOpen}
                                        onCancel={showHideBackModal}
                                        modalWidth={500}
                                        title={"Discard Changes"}
                                        modalBody={
                                            <>
                                                <div className="alert-warning rounded-10px p-2 patient-details">
                                                    <div className="d-flex align-items-center">
                                                        <img className='me-3' src={alertIcon} alt="Warning" />
                                                        <span>
                                                            Are you sure you want to discard the changes you made?
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-4">
                                                    <div className="d-flex align-items-center mt-2 justify-content-end">
                                                        <div onClick={() => navigate(-1)} className="me-4 text-decoration-underline btn p-0 text-main">
                                                            <span>Yes, Discard</span>
                                                        </div>
                                                        <Button onClick={showHideBackModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                                            <span>No, Stay</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        }
                                    />
                                </div>
                                {certificate_data !== undefined ? (
                                    <div className="d-flex align-items-center py-3 cursor-pointer">
                                        <div className="bg-fitness me-3">
                                            {certificate_data?.icon_image ? <img src={certificate_data?.icon_image} alt="" /> : title?.length > 0 ? title?.[0] : ""}
                                        </div>
                                        <div>
                                            <div className="title-common">
                                                {title}
                                            </div>
                                            <div onClick={handleCreateCertificateDrawer} className="d-flex align-items-center text-2 text-primary">Change Template <i className="fs-16 icon-right iconrotate270"></i></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-3 fw-medium">
                                        {'Create Certificate'}
                                    </div>
                                )}

                            </div>
                        </Col>
                        <Col sm="auto">
                            <div className='align-items-center d-flex h-100'>
                                <Button className="btn btn-41 btn-primary3" onClick={onPatientCertificateClick} loading={loading} disabled={title?.length > 0 ? false : true}>{certificate_data !== undefined ? 'Continue' : 'Save & Continue'}</Button>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </Navbar>
            <div className="bg-body p-3" style={{ height: 'calc(100vh - 60px)' }}>
                <Input allowClear className="popinput mb-3" onChange={onTitleChange} value={title} placeholder="Certificate Title" />
                <JoditEditor
                    key={'JoditEditor123'}
                    ref={editor}
                    config={config}
                    value={editorValue}
                    // tabIndex={1} // tabIndex of textarea
                    // onBlur={newContent => setContent(newContent)} // preferred to use only this option to update the content for performance reasons
                    // onChange={newContent => onChange(newContent)}
                    onBlur={(newContent) => setContent(newContent || "")}
                    onChange={onEditorChange}
                />
                <div>
                    {/* <h3>Editor Content:{content}</h3>

                    <h4>Make Content:{HTMLTransformer(content)}</h4>

                    <h4>Mayank Content: {removeLabelTags(HTMLTransformer(content))}</h4> */}

                    {/* <div dangerouslySetInnerHTML={{ __html: HTMLTransformer(content) }} /> */}
                </div>
            </div>
            <Drawer
                className="modalWidth-563" width="auto"
                title="Create Certificate"
                placement="right"
                closable
                open={createCertificateDrawer}
                onClose={handleCreateCertificateDrawer}
                // key="left"
            >
                <CreateCertificate handleCreateCertificateDrawer={handleCreateCertificateDrawer} patient_data={patient_data} replace={true} selectedTemplate={certificate_data !== undefined ? certificate_data?.id : 0} tcu_id={certificate_data?.tcu_id} />
            </Drawer>
        </div>
    )
}
export default MedicalCertificate;

