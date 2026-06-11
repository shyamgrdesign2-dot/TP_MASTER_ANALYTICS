import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button, Drawer, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import JoditEditor from 'jodit-react';
import moment from "moment";

import { useSelector, useDispatch } from "react-redux";
import { MESSAGE_KEY } from "../../../../utils/constants";

import MobileCertificateTemplateSelector from './MobileCertificateTemplateSelector';
import { addPatientCertificate, editPatientCertificate, getProfile } from "../../../../redux/doctorsSlice";

import { errorMessage, getClinicName, removeBeforeWhiteSpace } from "../../../../utils/utils";
import './MobileCreateCertificate.scss';
import { ASSETS } from "../../../../assets";
const {
  alerticon: alertIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;
const closeIcon = ASSETS.mobile.close2;
const fontSizeIcon = ASSETS.images.fontsizeicon;

function MobileCreateCertificate({
  visible,
  onClose,
  patient_data,
  certificate_data,
}) {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useSelector((state) => state.doctors);
  const dispatch = useDispatch();

  // Ensure profile is loaded - dispatch getProfile if missing
  useEffect(() => {
    if (!profile && !profileLoading) {
      dispatch(getProfile());
    }
  }, [dispatch, profile, profileLoading]);

  // Use useMemo to recalculate clinicName when profile changes
  const clinicName = useMemo(() => getClinicName(profile?.hospital_data), [profile?.hospital_data]);

  const editor = useRef(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [createCertificateDrawer, setCreateCertificateDrawer] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);

  const generateRandomId = () => {
    return 'id-' + Math.random().toString(36).substring(2, 9);
  };

  const TOOLBAR = [
    'undo', 'redo',
    {
      name: 'font size',
      iconURL: fontSizeIcon,
      command: 'fontSize',
      list: ['8', '10', '12', '14', '16'],
      tooltip: 'Font size',
    },
    'align', 'bold', 'italic', 'underline', 'ul', 'ol',
    {
      name: 'Insert',
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
        return false;
      }
    }
  ];

  const config = {
    statusbar: false,
    placeholder: 'Write Description...',
    buttons: TOOLBAR,
    buttonsSM: TOOLBAR,
    buttonsMD: TOOLBAR,
    buttonsXS: TOOLBAR,
    askBeforePasteFromWord: false,
    askBeforePasteHTML: false,
    defaultActionOnPaste: "insert_as_html",
    uploader: {
      insertImageAsBase64URI: true,
      url: 'none',
      filesVariableName: function (i) {
        return 'files[' + i + ']';
      },
      process: function (resp) {
        return {
          files: resp
        };
      },
      defaultHandlerSuccess: function (data, resp) {
      },
      error: function (e) {
      },
    },
    events: {
      processPaste: (event, html) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const elementsToProcess = tempDiv.querySelectorAll('[style], svg, img, a');
        elementsToProcess.forEach(element => {
          if (element.hasAttribute('style')) {
            element.removeAttribute('style');
          }
          if (['svg', 'img', 'a'].includes(element.tagName.toLowerCase())) {
            const fragment = document.createDocumentFragment();
            while (element.firstChild) {
              fragment.appendChild(element.firstChild);
            }
            element.parentNode.replaceChild(fragment, element);
          }
        });
        const cleanedContent = tempDiv.innerHTML;
        return cleanedContent;
      }
    }
  };

  useEffect(() => {
    if (certificate_data !== undefined) {
      setTitle(certificate_data?.title || '');
      setContent(certificate_data?.content || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [certificate_data]);

  const handleAddEventListener = () => {
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
  };

  const handleRemoveEventListener = () => {
    const dateInputs = document.querySelectorAll('input[type="date"][id]');
    const searchInputs = document.querySelectorAll('input[type="search"][id]');

    dateInputs.forEach((input) => {
      input.removeEventListener("change", handleInputChange);
      input.removeEventListener("input", handleInputChange);
    });

    searchInputs.forEach((input) => {
      input.removeEventListener("keyup", handleInputChange);
    });
  };

  useEffect(() => {
    handleAddEventListener();
    return () => {
      handleRemoveEventListener();
    };
  }, [content]);

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

    document.addEventListener('keydown', handleBackspace);
    return () => {
      document.removeEventListener('keydown', handleBackspace);
    };
  }, []);

  const onEditorChange = useCallback((newContent) => {
    setContent(newContent);
    const allInputs = document.querySelectorAll('input[type="date"][id], input[type="search"][id]');
    allInputs.forEach((input) => {
      if (input.type === 'date') {
        input.removeEventListener("change", handleInputChange);
        input.removeEventListener("input", handleInputChange);
        input.addEventListener("change", handleInputChange);
        input.addEventListener("input", handleInputChange);
      } else {
        input.removeEventListener("keyup", handleInputChange);
        input.addEventListener("keyup", handleInputChange);
      }
    });
  }, []);

  function handleInputChange(event) {
    const inputElement = event.target;
    if (inputElement.type === "date" || inputElement.type === "search") {
      const elementId = inputElement.id;
      const valueToUpdate = document.getElementById(elementId);
      if (valueToUpdate) {
        valueToUpdate.removeAttribute('value');
        if (inputElement.type === "date") {
          const newDateValue = moment(inputElement.value).format('DD/MM/YYYY');
          valueToUpdate.setAttribute('value', newDateValue);
        } else if (inputElement.type === "search") {
          const newTextValue = inputElement.value;
          valueToUpdate.setAttribute('value', newTextValue);
        }
      }
    }
  }

  const handleCreateCertificateDrawer = useCallback(() => {
    setCreateCertificateDrawer((prev) => !prev);
  }, []);

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen((prev) => !prev);
  }, []);

  const onTitleChange = useCallback((e) => {
    setTitle(removeBeforeWhiteSpace(e.target.value));
  }, []);

  const handleBackClick = useCallback(() => {
    showHideBackModal();
  }, [showHideBackModal]);

  const onPatientCertificateClick = async () => {
    if (window.Moengage && clinicName) {
      window.Moengage.track_event("TP_Certificate_created", {
        clinic_name: clinicName,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id,
        certificate_type: title,
      });
    }
    var sendData = {
      patient_unique_id: patient_data?.patient_unique_id !== undefined ? patient_data?.patient_unique_id : 0,
      pam_id: patient_data?.pam_id !== undefined ? patient_data?.pam_id : 0,
      tcu_content_id: certificate_data !== undefined && certificate_data !== null ? certificate_data?.id : 0,
      tcu_title: title,
      tcu_content: editor.current?.value
    };
    if (certificate_data?.tcu_id !== undefined) {
      sendData['tcu_id'] = certificate_data?.tcu_id;
    }
    const action = certificate_data?.tcu_id !== undefined
      ? await dispatch(editPatientCertificate(sendData))
      : await dispatch(addPatientCertificate(sendData));
    
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
      onClose();
      navigate('/certificate_print_view', {
        replace: true,
        state: {
          ...action.payload,
          patient_data: patient_data,
          tcu_content_id: certificate_data !== undefined && certificate_data !== null ? certificate_data?.id : 0,
          pms_default: certificate_data !== undefined && certificate_data !== null ? certificate_data?.pms_default : 0,
          tcu_title: sendData?.tcu_title,
          tcu_content: sendData?.tcu_content,
          fromPath: '/patient_details'
        }
      });
    } else {
      errorMessage(action.error);
    }
  };

  const processedContent = content
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
    .replace(/{Start Date}/g, `<input type="date" id="${generateRandomId()}" value="" class="start_date">`)
    .replace(/{End Date}/g, `<input type="date" id="${generateRandomId()}" value="" class="end_date">`)
    .replace(/{Join Date}/g, `<input type="date" id="${generateRandomId()}" value="" class="join_date">`)
    .replace(/{Custom Date}/g, `<input type="date" id="${generateRandomId()}" value="" class="custom_date">`)
    .replace(/{Diagnosis}/g, `<label class="diagnosis">Enter Diagnosis</label>`)
    .replace(/{Time}/g, `<label class="time">Enter Time</label>`)
    .replace(/{Travel From}/g, `<label class="travel_from">Enter Travel From</label>`)
    .replace(/{Travel To}/g, `<label class="travel_to">Enter Travel To</label>`)
    .replace(/{Photo ID card No}/g, `<label class="photo_id_card_no">Enter Photo ID card No</label>`)
    .replace(/{Nationality}/g, `<label class="nationality">Enter Nationality</label>`)
    .replace(/{Passport Number}/g, `<label class="passport_number">Enter Passport Number</label>`)
    .replace(/{Procedure}/g, `<label class="procedure">Enter Procedure</label>`)
    .replace(/{Number of Months}/g, `<label class="number_of_months">Enter Number of Months</label>`);

  return (
    <>
      <Drawer
        placement="bottom"
        onClose={handleBackClick}
        open={visible}
        height="90vh"
        className="mobile-create-certificate-drawer"
        closable={false}
        maskClosable={false}
        destroyOnClose={true}
      >
        <div className="mobile-create-certificate-content">
          <div className="mobile-create-certificate-header">
            <p className="mobile-create-certificate-title">Create Certificate</p>
            <button
              className="mobile-create-certificate-close-btn"
              onClick={handleBackClick}
              type="button"
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" className="mobile-create-certificate-close-icon" />
            </button>
          </div>

          <div className="mobile-create-certificate-body">
            <Input
              allowClear
              className="mobile-create-certificate-title-input"
              onChange={onTitleChange}
              value={title}
              placeholder="Certificate Title"
            />
            <div className="mobile-create-certificate-editor-wrapper">
              <JoditEditor
                key={'JoditEditor123'}
                ref={editor}
                config={config}
                value={processedContent}
                onChange={onEditorChange}
              />
            </div>
          </div>

          <div className="mobile-create-certificate-footer">
            <Button
              className="mobile-create-certificate-save-btn"
              onClick={onPatientCertificateClick}
              disabled={!title?.length}
            >
              Save
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        placement="bottom"
        onClose={showHideBackModal}
        open={isBackModalOpen}
        height="auto"
        className="discard-changes-bottom-sheet"
        closable={false}
        maskClosable={true}
        destroyOnClose={true}
      >
        <div className="discard-changes-sheet-content">
          <div className="discard-changes-sheet-header">
            <h3 className="discard-changes-sheet-title">Discard Changes</h3>
            <button
              className="discard-changes-sheet-close-btn"
              onClick={showHideBackModal}
              type="button"
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" className="discard-changes-close-icon" />
            </button>
          </div>

          <div className="discard-changes-sheet-body">
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to discard the changes you made?
                </span>
              </div>
            </div>
          </div>

          <div className="discard-changes-sheet-actions">
            <div className="discard-changes-actions-row">
              <button
                onClick={() => {
                  onClose();
                  showHideBackModal();
                }}
                className="discard-changes-sheet-btn discard-changes-btn-yes"
                type="button"
              >
                Yes, Discard
              </button>
              <button
                onClick={showHideBackModal}
                className="discard-changes-sheet-btn discard-changes-btn-no"
                type="button"
              >
                No, Stay
              </button>
            </div>
          </div>
        </div>
      </Drawer>

      <MobileCertificateTemplateSelector
        visible={createCertificateDrawer}
        onClose={handleCreateCertificateDrawer}
        patient_data={patient_data}
        replace={true}
        selectedTemplate={certificate_data !== undefined ? certificate_data?.id : 0}
        tcu_id={certificate_data?.tcu_id}
      />
    </>
  );
}

export default React.memo(MobileCreateCertificate);

