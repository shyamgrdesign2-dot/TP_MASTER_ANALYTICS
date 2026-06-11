import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Drawer, Popover, Steps, Radio, DatePicker, TimePicker, Select, Checkbox, Input, Spin, message, Tooltip } from 'antd';
import { Col, Container, Row } from "react-bootstrap";
import { v4 as uuidv4 } from 'uuid';

import locale from "antd/es/date-picker/locale/en_US";

import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { listAllTemplate, listCategory, listDoctor, searchPatient, updatePatientCount, userCampaignAdd, userCampaignEdit, userCredit } from "../redux/bulkMessagesSlice";
import moment from "moment";
import dayjs from "dayjs";

import { errorMessage, getClinicCity, onlyDecimalFormat, onlyNumberFormat } from "../utils/utils";
import { MESSAGE_KEY } from "../utils/constants";

import VideoModal from "../common/VideoModal";

import AvailableCredits from "../components/bulk_messages/AvailableCredits";
import CommonModal from "../common/CommonModal";

import "../components/bulk_messages/messages.scss";
import "../components/common/dateRangePill.scss";
import { InfoCircleOutlined } from '@ant-design/icons';
import { fetchAgents, fetchGoogleMapsLink } from "../pages/appointmentAgent/service";
import { getDecodedToken } from "../utils/localStorage";
import { ASSETS } from "../assets";
const {
  messageCorner,
  creditIcon: CreditImg,
  tutorialIcon: tutorial,
  messageCornerGrey,
  alerticon: alertIcon,
  closeVisit: imgCloseVisit,
  endVisit: visitEnd,
  tubeIcon: playIcons,
} = ASSETS.images;

const { RangePicker } = DatePicker;
const dateFormat = 'YYYY-MM-DD'
const showDateFormat = 'DD MMM YYYY'

const dateTimeFormat = 'YYYY-MM-DD HH:mm:ss'
const dateFormat1 = 'YYYY-MM-DD'
const timeFormat1 = 'HH:mm:ss'

const showDateTimeFormat = 'DD MMM YYYY hh:mm A'
const showDateFormat1 = 'DD MMM YYYY'
const showTimeFormat1 = 'hh:mm A'

const SELECT_AFTER = [
    {
        value: 'Year',
        label: 'Year',
    },
    {
        value: 'Month',
        label: 'Month',
    }
]

const GENDER = ['Male', 'Female', 'Other']

function MessageCreateCampaign() {

    const { loading, userCreditObj, categoryList, allTemplateList, templateLoading, doctorList, patientCount } = useSelector((state) => state.bulkMessages);
    const { videoList, profile } = useSelector((state) => state.doctors);
    const dispatch = useDispatch();

    const navigate = useNavigate();
    const { state } = useLocation();
    const { campaign_data, reuse_campaign_data, setupData } = state != null && state

    const [popOverVideo, setPopOverVideo] = useState(false);
    const [videoLink, setVideoLink] = useState(null);
    const [isBackModalOpen, setIsBackModalOpen] = useState(false);

    const [availableCredit, setAvailableCredit] = useState(false);
    const [change, setChange] = useState(campaign_data !== undefined ? false : true);
    const [stepCurrent, setStepCurrent] = useState(0);

    const [selectedCategory, setSelectedCategory] = useState(-1);
    const [template, setTemplate] = useState(null);

    const [clinic_name, setclinic_name] = useState('');
    const [agent_name, setagent_name] = useState(state.setupData?.name || "");
    const [agent_link, setagent_link] = useState(state.setupData?.appointmentLinkShared || "");
    const [location_link, setlocation_link] = useState("");
    const [regards_as_hospital, setregards_as_hospital] = useState('');
    const [clinic_address, setclinic_address] = useState('');
    const [festival_name, setfestival_name] = useState('');
    const [doctor_name, setdoctor_name] = useState('');
    const [phone_number, setphone_number] = useState('');
    const [link, setlink] = useState('');
    const [review_link, setreview_link] = useState('');
    const [vaccine_name, setvaccine_name] = useState('');
    const [camp_name, setcamp_name] = useState('');
    const [year_no, setyear_no] = useState('');
    const [start_date, setstart_date] = useState('');
    const [end_date, setend_date] = useState('');
    const [start_time, setstart_time] = useState('');
    const [end_time, setend_time] = useState('');
    const [date, setdate] = useState('');
    const [time, settime] = useState('');
    const [surgery_name, setsurgery_name] = useState('');
    const [amount, setamount] = useState('');
    const [service_name, setservice_name] = useState('');
    const [about_service, setabout_service] = useState('');

    const [dateRange, setDateRange] = useState({
        startDate: moment().format(dateFormat),
        endDate: moment().format(dateFormat),
    });
    const [dateStatus, setDateStatus] = useState(1);
    const [pickerModal, setPickerModal] = useState(false);

    const [send_on, setSendOn] = useState(1);
    const [sender_type, setSender_type] = useState(1);
    const [filter_doc, setFilterDoc] = useState([]);
    const [min_age, setMinAge] = useState('');
    const [max_age, setMaxAge] = useState('');
    const [age_unit, setAgeUnit] = useState('Year');
    const [gender, setGender] = useState([]);
    const [schedule_type, setScheduleType] = useState(1);
    const [scheduleDateTime, setScheduleDateTime] = useState('');

    useEffect(() => {
        dispatch(listCategory());
        dispatch(listAllTemplate());
        dispatch(listDoctor());
    }, []);

    useEffect(() => {
        const clinic_city = getClinicCity(profile?.hospital_data);
        window.Moengage.track_event("TP_Select_Target_Audience", {
            "Doctor_specialty": profile?.dp_name,
            "Doctor_unique_id": profile?.doctor_unique_id,
            clinic_city,
            "Doctor_Name": profile?.um_name,
            "Doctor_mobile_No": profile?.um_contact,
            "Selection_Target_Audience": patientCount,
        });
    }, [patientCount]);

    useEffect(() => {
        const clinic_city = getClinicCity(profile?.hospital_data);
        if (campaign_data === undefined && reuse_campaign_data === undefined) {
            window.Moengage.track_event("TP_Select_Mode_Of_Messages", {
                "Doctor_specialty": profile?.dp_name,
                "Doctor_unique_id": profile?.doctor_unique_id,
                clinic_city,
                "Doctor_Name": profile?.um_name,
                "Doctor_mobile_No": profile?.um_contact,
                "Selection_Mode": 'SMS',
            });
        }
    }, []);

    useEffect(() => {
        if (!userCreditObj) {
            dispatch(userCredit());
        }
    }, [userCreditObj]);

    useEffect(() => {
        if (doctorList?.length > 0 && allTemplateList?.length > 0 && campaign_data !== undefined) {

            dispatch(updatePatientCount(campaign_data?.total_patient))

            setStepCurrent(1)

            const templateData = allTemplateList?.find(e => e?.id === campaign_data?.campaign_id)
            setTemplate(templateData)

            if (campaign_data?.msg_rowData?.hasOwnProperty('clinic_name')) {
                setclinic_name(campaign_data?.msg_rowData?.clinic_name);
                setregards_as_hospital(campaign_data?.msg_rowData?.clinic_name);
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('agent_name')) {
                setagent_name(campaign_data?.msg_rowData?.agent_name)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('agent_link')) {
                setagent_link(campaign_data?.msg_rowData?.agent_link)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('location_link')) {
                setlocation_link(campaign_data?.msg_rowData?.location_link)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('regards_as_hospital')) {
                setregards_as_hospital(campaign_data?.msg_rowData?.regards_as_hospital);
                setclinic_name(campaign_data?.msg_rowData?.clinic_name);
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('clinic_address')) {
                setclinic_address(campaign_data?.msg_rowData?.clinic_address)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('festival_name')) {
                setfestival_name(campaign_data?.msg_rowData?.festival_name)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('doctor_name')) {
                setdoctor_name(campaign_data?.msg_rowData?.doctor_name)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('phone_number')) {
                setphone_number(campaign_data?.msg_rowData?.phone_number)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('link')) {
                setlink(campaign_data?.msg_rowData?.link)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('review_link')) {
                setreview_link(campaign_data?.msg_rowData?.review_link)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('vaccine_name')) {
                setvaccine_name(campaign_data?.msg_rowData?.vaccine_name)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('camp_name')) {
                setcamp_name(campaign_data?.msg_rowData?.camp_name)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('year_no')) {
                setyear_no(campaign_data?.msg_rowData?.year_no)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('start_date')) {
                setstart_date(campaign_data?.msg_rowData?.start_date)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('end_date')) {
                setend_date(campaign_data?.msg_rowData?.end_date)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('start_time')) {
                setstart_time(campaign_data?.msg_rowData?.start_time)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('end_time')) {
                setend_time(campaign_data?.msg_rowData?.end_time)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('date')) {
                setdate(campaign_data?.msg_rowData?.date)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('time')) {
                settime(campaign_data?.msg_rowData?.time)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('surgery_name')) {
                setsurgery_name(campaign_data?.msg_rowData?.surgery_name)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('amount')) {
                setamount(campaign_data?.msg_rowData?.amount)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('service_name')) {
                setservice_name(campaign_data?.msg_rowData?.service_name)
            }
            if (campaign_data?.msg_rowData?.hasOwnProperty('about_service')) {
                setabout_service(campaign_data?.msg_rowData?.about_service)
            }
            const clinic_city = getClinicCity(profile?.hospital_data);
            window.Moengage.track_event("TP_Select_Mode_Of_Messages", {
                "Doctor_specialty": profile?.dp_name,
                "Doctor_unique_id": profile?.doctor_unique_id,
                clinic_city,
                "Doctor_Name": profile?.um_name,
                "Doctor_mobile_No": profile?.um_contact,
                "Selection_Mode": campaign_data?.send_on === 'SMS' ? 'SMS' : 'WhatsApp',
            });
            setSendOn(campaign_data?.send_on === 'SMS' ? 1 : 2)
            setSender_type(campaign_data?.sender_type)

            if (campaign_data?.sender_type === 2) {
                const filterDocData = campaign_data?.filter_doc ? campaign_data?.filter_doc.split(',').map(Number) : []
                setFilterDoc(filterDocData)

                if (campaign_data?.date_unit === 'Till date') {
                    setDateStatus(1)
                } else if (campaign_data?.date_unit === 'Last week') {
                    setDateStatus(2)
                } else if (campaign_data?.date_unit === 'Last month') {
                    setDateStatus(3)
                } else if (campaign_data?.date_unit === 'Last 3 month') {
                    setDateStatus(4)
                } else if (campaign_data?.date_unit === 'Last 6 month') {
                    setDateStatus(5)
                } else if (campaign_data?.date_unit === 'Last 1 year') {
                    setDateStatus(6)
                } else if (campaign_data?.date_unit === 'custom') {
                    setDateStatus(null)
                }
                setDateRange({
                    startDate: moment(campaign_data?.start_date).format(dateFormat),
                    endDate: moment(campaign_data?.end_date).format(dateFormat),
                })

                setMinAge(campaign_data?.min_age ? String(campaign_data?.min_age) : '')
                setMaxAge(campaign_data?.max_age ? String(campaign_data?.max_age) : '')
                setAgeUnit(campaign_data?.min_age_unit)

                const genderData = campaign_data?.gender ? campaign_data?.gender.split(',') : []
                setGender(genderData)
            }

            setScheduleType(2)
            campaign_data?.draft === 0 && setScheduleDateTime(moment(`${campaign_data?.campaign_date} ${campaign_data?.campaign_time}`, showDateTimeFormat).format(dateTimeFormat))
        }
    }, [doctorList, allTemplateList, campaign_data]);

    useEffect(() => {
        if (doctorList?.length > 0 && allTemplateList?.length > 0 && reuse_campaign_data !== undefined) {

            setStepCurrent(1)

            const templateData = allTemplateList?.find(e => e?.id === reuse_campaign_data?.campaign_id)
            setTemplate(templateData)

            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('clinic_name')) {
                setclinic_name(reuse_campaign_data?.msg_rowData?.clinic_name)
                setregards_as_hospital(reuse_campaign_data?.msg_rowData?.clinic_name);
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('agent_name')) {
                setagent_name(reuse_campaign_data?.msg_rowData?.agent_name)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('agent_link')) {
                setagent_link(reuse_campaign_data?.msg_rowData?.agent_link)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('location_link')) {
                setlocation_link(reuse_campaign_data?.msg_rowData?.location_link)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('regards_as_hospital')) {
                setregards_as_hospital(reuse_campaign_data?.msg_rowData?.regards_as_hospital);
                setclinic_name(reuse_campaign_data?.msg_rowData?.clinic_name);
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('clinic_address')) {
                setclinic_address(reuse_campaign_data?.msg_rowData?.clinic_address)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('festival_name')) {
                setfestival_name(reuse_campaign_data?.msg_rowData?.festival_name)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('doctor_name')) {
                setdoctor_name(reuse_campaign_data?.msg_rowData?.doctor_name)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('phone_number')) {
                setphone_number(reuse_campaign_data?.msg_rowData?.phone_number)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('link')) {
                setlink(reuse_campaign_data?.msg_rowData?.link)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('review_link')) {
                setreview_link(reuse_campaign_data?.msg_rowData?.review_link)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('vaccine_name')) {
                setvaccine_name(reuse_campaign_data?.msg_rowData?.vaccine_name)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('camp_name')) {
                setcamp_name(reuse_campaign_data?.msg_rowData?.camp_name)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('year_no')) {
                setyear_no(reuse_campaign_data?.msg_rowData?.year_no)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('start_date')) {
                setstart_date(reuse_campaign_data?.msg_rowData?.start_date)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('end_date')) {
                setend_date(reuse_campaign_data?.msg_rowData?.end_date)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('start_time')) {
                setstart_time(reuse_campaign_data?.msg_rowData?.start_time)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('end_time')) {
                setend_time(reuse_campaign_data?.msg_rowData?.end_time)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('date')) {
                setdate(reuse_campaign_data?.msg_rowData?.date)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('time')) {
                settime(reuse_campaign_data?.msg_rowData?.time)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('surgery_name')) {
                setsurgery_name(reuse_campaign_data?.msg_rowData?.surgery_name)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('amount')) {
                setamount(reuse_campaign_data?.msg_rowData?.amount)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('service_name')) {
                setservice_name(reuse_campaign_data?.msg_rowData?.service_name)
            }
            if (reuse_campaign_data?.msg_rowData?.hasOwnProperty('about_service')) {
                setabout_service(reuse_campaign_data?.msg_rowData?.about_service)
            }
            const clinic_city = getClinicCity(profile?.hospital_data);
            window.Moengage.track_event("TP_Select_Mode_Of_Messages", {
                "Doctor_specialty": profile?.dp_name,
                "Doctor_unique_id": profile?.doctor_unique_id,
                clinic_city,
                "Doctor_Name": profile?.um_name,
                "Doctor_mobile_No": profile?.um_contact,
                "Selection_Mode": reuse_campaign_data?.send_on === 'SMS' ? 'SMS' : 'WhatsApp',
            });
            setSendOn(reuse_campaign_data?.send_on === 'SMS' ? 1 : 2)
            setSender_type(reuse_campaign_data?.sender_type)

            if (reuse_campaign_data?.sender_type === 2) {
                const filterDocData = reuse_campaign_data?.filter_doc ? reuse_campaign_data?.filter_doc.split(',').map(Number) : []
                setFilterDoc(filterDocData)

                if (reuse_campaign_data?.date_unit === 'Till date') {
                    setDateStatus(1)
                } else if (reuse_campaign_data?.date_unit === 'Last week') {
                    setDateStatus(2)
                } else if (reuse_campaign_data?.date_unit === 'Last month') {
                    setDateStatus(3)
                } else if (reuse_campaign_data?.date_unit === 'Last 3 month') {
                    setDateStatus(4)
                } else if (reuse_campaign_data?.date_unit === 'Last 6 month') {
                    setDateStatus(5)
                } else if (reuse_campaign_data?.date_unit === 'Last 1 year') {
                    setDateStatus(6)
                } else if (reuse_campaign_data?.date_unit === 'custom') {
                    setDateStatus(null)
                }
                setDateRange({
                    startDate: moment(reuse_campaign_data?.start_date).format(dateFormat),
                    endDate: moment(reuse_campaign_data?.end_date).format(dateFormat),
                })

                setMinAge(reuse_campaign_data?.min_age ? String(reuse_campaign_data?.min_age) : '')
                setMaxAge(reuse_campaign_data?.max_age ? String(reuse_campaign_data?.max_age) : '')
                setAgeUnit(reuse_campaign_data?.min_age_unit)

                const genderData = reuse_campaign_data?.gender ? reuse_campaign_data?.gender.split(',') : []
                setGender(genderData)
            }

            setScheduleType(2)
        }
    }, [doctorList, allTemplateList, reuse_campaign_data]);

    useEffect(() => {
        const timeOutId = setTimeout(() => {
            var sendData = {
                sender_type: sender_type,
            }
            if (sender_type === 2) {
                if (gender?.length > 0) {
                    sendData['gender'] = gender.map(e => e).toString();
                }
                if (dateRange.startDate != dateRange.endDate) {
                    sendData['start_date'] = dateRange.startDate;
                    sendData['end_date'] = dateRange.endDate;
                }
                if (filter_doc?.length > 0) {
                    sendData['filter_doc'] = filter_doc?.includes(-1) ? doctorList.map(e => e?.um_id).toString() : filter_doc.map(e => e).toString();
                }
                if (min_age) {
                    sendData['min_age'] = min_age;
                }
                if (max_age) {
                    sendData['max_age'] = max_age;
                }
                sendData['min_age_unit'] = age_unit;
                sendData['max_age_unit'] = age_unit;
            }

            if (change) {
                !pickerModal && dispatch(searchPatient(sendData));
            }
        }, 500);
        return () => {
            clearTimeout(timeOutId);
        };
    }, [pickerModal, change, sender_type, dateRange, gender, min_age, max_age, age_unit, filter_doc]);

    // Automatically set selectedCategory to 6 if state.category === 'ai-receptionist'
    useEffect(() => {
        if (state?.category === 'ai-receptionist') {
            setSelectedCategory(6);
        }
    }, [state?.category]);

    // Automatically set WhatsApp as selected if category is ai-receptionist or 6
    useEffect(() => {
        if (selectedCategory === 6 || state?.category === 'ai-receptionist' || template?.id === 29 || template?.id === 25 || template?.id === 32 || template?.id === 33) {
            setSendOn(2);
        }
    }, [selectedCategory, state?.category, template]);

    useEffect(() => {
        const decodedToken = getDecodedToken();
        const clinicId = decodedToken?.result?.clinic_id;
        async function fetchAgentData() {
            if (clinicId) {
                const res = await fetchAgents(clinicId);
                if (res && res.length > 0) {
                    setagent_name(res[res.length - 1]?.name || "");
                    setagent_link(res[res.length - 1]?.appointmentLinkShared || "");
                }
            }
        }
        if (selectedCategory === 6 || state?.category === 'ai-receptionist') {
            fetchAgentData();
        }
        getGoogleLink(clinicId);
    }, [selectedCategory, state?.category]);

    const getGoogleLink = async (clinicId) => {
      const res = await fetchGoogleMapsLink(clinicId);
      if (res) {
        setlocation_link(res);
      }
    };

    //Message Details
    const handleAvailableCredit = useCallback(
        () => {
            setAvailableCredit(!availableCredit)
        },
        [availableCredit]
    );

    //PopOverVideo function
    const showHideVideoListPopover = useCallback(() => {
        setPopOverVideo(!popOverVideo);
    }, [popOverVideo]);

    //Video Componet
    const VIDEO_CONTENT = useCallback(() => {
        return (
            <>
                <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
                    <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
                        <div className="title-common lh-base">Video Tutorial</div>
                        <Button
                            className="btn btn-videoClose p-0"
                            onClick={showHideVideoListPopover}
                        >
                            <i className="icon-Cross" />
                        </Button>
                    </div>
                    {videoList
                        ?.filter((e) => e.category_id === 13)[0]
                        ?.video?.map((item1, i1) => {
                            return (
                                <div
                                    key={i1}
                                    className={`d-flex ${i1 !==
                                        videoList?.filter((e) => e.category_id === 13)[0]?.video
                                            ?.length -
                                        1 && "pb-3 mb-15 border-bottom"
                                        }`}
                                >
                                    <div className="tutorial-play me-14">
                                        <button type="button" onClick={() => setVideoLink(item1)}>
                                            <img src={playIcons} />
                                        </button>
                                        <span className="tutorial-thumb">
                                            <img src={item1.thumbnail} />
                                        </span>
                                    </div>
                                    <div className="text-truncate-twolines">
                                        <h3 className="title-common text-welcome text-truncate">
                                            {item1?.tmv_title}
                                        </h3>
                                        <div className="fs-12 fontroboto fw-normal text-main text-truncate-two-lines">
                                            {item1?.tmv_description}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </>
        );
    }, [popOverVideo]);

    // Steps Code
    const next = async () => {
        const clinic_city = getClinicCity(profile?.hospital_data);
        window.Moengage.track_event("TP_BulkSMS_Template_to_Broadcast", {
            "Doctor_specialty": profile?.dp_name,
            "Doctor_unique_id": profile?.doctor_unique_id,
            clinic_city,
            "Doctor_Name": profile?.um_name,
            "Doctor_mobile_No": profile?.um_contact,
            "Selection_Decision": 'Next',
        });
        if (stepCurrent === 1) {
            window.Moengage.track_event("TP_Messages_Timing", {
                "Doctor_specialty": profile?.dp_name,
                "Doctor_unique_id": profile?.doctor_unique_id,
                clinic_city,
                "Doctor_Name": profile?.um_name,
                "Doctor_mobile_No": profile?.um_contact,
                "Selection_Message_Timing": schedule_type === 1 ? moment().add(30, 'minutes').format(showDateTimeFormat): moment(scheduleDateTime).format(showDateTimeFormat),
            });
            const data = await sendTemplate()
            // const emptyKey = Object.keys(data).find(key => !data[key]);
            // if (emptyKey) {
            //     errorMessage(`Please fill up ${emptyKey}`)
            //     return;
            // } else {
            //     alert('success')
            // }
            const isEmpty = !Object.values(data).some(x => !x);
            if (isEmpty) {
                if (patientCount !== 0) {
                    if (schedule_type === 2 && scheduleDateTime) {
                        setStepCurrent(prev => prev + 1);
                    } else if (schedule_type === 1) {
                        setScheduleDateTime(moment().add(30, 'minutes').format(dateTimeFormat));
                        setStepCurrent(prev => prev + 1);
                    } else {
                        errorMessage('Please fill up schedule for later');
                    }
                } else {
                    errorMessage('We need at least 1 patient to proceed');
                }
            } else {
                errorMessage('Please fill up all fields in compose message');
            }
        } else {
            setStepCurrent(prev => prev + 1);
        }
    };

    const prev = () => {
        setStepCurrent(prev => prev - 1);
        const clinic_city = getClinicCity(profile?.hospital_data);
        window.Moengage.track_event("TP_BulkSMS_Template_to_Broadcast", {
            "Doctor_specialty": profile?.dp_name,
            "Doctor_unique_id": profile?.doctor_unique_id,
            clinic_city,
            "Doctor_Name": profile?.um_name,
            "Doctor_mobile_No": profile?.um_contact,
            "Selection_Decision": 'Back',
        });
    };

    const onSelectCategory = useCallback(
        (data) => {
            setSelectedCategory(data)
        },
        [selectedCategory]
    );

    //Template Click
    const onTemplateClick = (e) => {
        setTemplate(e)
        next()
        const clinic_city = getClinicCity(profile?.hospital_data);
        window.Moengage.track_event("TP_Select_Template", {
            "Doctor_specialty": profile?.dp_name,
            "Doctor_unique_id": profile?.doctor_unique_id,
            clinic_city,
            "Doctor_Name": profile?.um_name,
            "Doctor_mobile_No": profile?.um_contact,
            "Template_name": e.campaign_name,
        });
    }

    // Custom Radio
    const handleSendOn = useCallback((e) => {
        setSendOn(e.target.value);
    }, [send_on]);

    // Custom Radio
    const handleSenderType = useCallback((e) => {
        setChange(true)
        setSender_type(e.target.value);
    }, [sender_type]);

    // Select Doctor
    const handleFilterDoc = useCallback((value) => {
        setChange(true)
        if (value?.at(-1) === -1) {
            setFilterDoc([-1]);
        } else {
            setFilterDoc(value.filter(item => item !== -1));
        }
    }, [filter_doc]);

    const handlePickerModal = useCallback(
        () => {
            setPickerModal(!pickerModal);
        },
        [pickerModal]
    );

    const rangePresets = [
        {
            label: <div className={`${dateStatus === 1 ? 'active' : ''}`}>Till date</div>,
            value: [dayjs(), dayjs().endOf('day')],
        },
        {
            label: <div className={`${dateStatus === 2 ? 'active' : ''}`}>Last week</div>,
            value: [dayjs().add(-7, 'd'), dayjs()],
        },
        {
            label: <div className={`${dateStatus === 3 ? 'active' : ''}`}>Last month</div>,
            value: [dayjs().add(-1, 'M'), dayjs()],
        },
        {
            label: <div className={`${dateStatus === 4 ? 'active' : ''}`}>Last 3 month</div>,
            value: [dayjs().add(-3, 'M'), dayjs()],
        },
        {
            label: <div className={`${dateStatus === 5 ? 'active' : ''}`}>Last 6 month</div>,
            value: [dayjs().add(-6, 'M'), dayjs()],
        },
        {
            label: <div className={`${dateStatus === 6 ? 'active' : ''}`}>Last 1 year</div>,
            value: [dayjs().add(-1, 'y'), dayjs()],
        },
        {
            label: <div className={`${!dateStatus ? 'active' : ''}`} onClick={() => onRangeChange(null)}>Custom range</div>,
            value: null,
        }
    ];

    const onRangeChange = (dates, dateStrings) => {
        setChange(true)
        if (dates) {
            // console.log('From: ', dates[0], ', to: ', dates[1]);
            // console.log('From: ', dateStrings[0], ', to: ', dateStrings[1]);

            if (dayjs().format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(1);
            } else if (dayjs().add(-7, 'd').format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(2);
            } else if (dayjs().add(-1, 'M').format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(3);
            } else if (dayjs().add(-3, 'M').format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(4);
            } else if (dayjs().add(-6, 'M').format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(5);
            } else if (dayjs().add(-1, 'y').format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(6);
            } else {
                setDateStatus(null);
            }
            setDateRange({
                startDate: moment(dateStrings[0], showDateFormat).format(dateFormat),
                endDate: moment(dateStrings[1], showDateFormat).format(dateFormat),
            });
        } else {
            setDateStatus(null);
            setDateRange({
                startDate: moment().format(dateFormat),
                endDate: moment().format(dateFormat),
            });
        }
    };

    // Input Age
    const onChangeMinInput = useCallback((e) => {
        setChange(true)
        const value = onlyNumberFormat(e.target.value)
        setMinAge(value);
    }, [min_age]);

    const onChangeMaxInput = useCallback((e) => {
        setChange(true)
        const value = onlyNumberFormat(e.target.value)
        setMaxAge(value);
    }, [max_age]);

    // Select After
    const onSelectAfter = useCallback((value) => {
        setChange(true)
        setAgeUnit(value);
    }, [age_unit]);

    const selectAfter = (
        <Select
            defaultValue="Years"
            value={age_unit}
            onSelect={onSelectAfter}
            options={SELECT_AFTER} />
    );

    // Gender Checkbox
    const onChangeGender = useCallback((checkedValues) => {
        setChange(true)
        setGender(checkedValues)
    }, [gender]);

    // Schedule Radio
    const handleScheduleType = useCallback((e) => {
        setScheduleType(e.target.value);
        if (e.target.value === 2) {
            setScheduleDateTime("")
        }
    }, [schedule_type]);

    // const disabledDate = (current) => {
    //     // Disable all dates before today
    //     return current && current < moment().startOf('day');
    // };

    const disabledDate = (current) => {
        // Disable dates before today and after 3 months from today
        const today = moment().startOf("day");
        const threeMonthsFromToday = today.clone().add(3, "months").endOf("day");
        return current && (current.isBefore(today) || current.isAfter(threeMonthsFromToday));
    };

    const disabledTime = (current) => {
        if (!current) return {};
        const now = moment();

        // If the selected date is today, disable past hours and minutes
        if (current.isSame(now, 'day')) {
            return {
                disabledHours: () => [...Array(now.hour()).keys()], // Disable past hours
                disabledMinutes: (selectedHour) => selectedHour === now.hour() ? [...Array(now.minute()).keys()] : [], // Disable past minutes for the current hour
            };
        }
        return {};
    };

    // Back Model
    const showHideBackModal = useCallback(() => {
        setIsBackModalOpen(!isBackModalOpen);
    }, [isBackModalOpen]);

    const renderTemplate = useMemo(() => {
        let parts = template && template?.text?.split(/{(.*?)}/);

        const elements = parts?.map((part, index) => {
            if (index % 2 !== 0) {
                if (part === 'clinic_name') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: clinic_name ? parseInt(clinic_name?.length * 7.55) >= 150 ? clinic_name?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={clinic_name}
                            onChange={(e) => {
                                setclinic_name(e.target.value);
                                setregards_as_hospital(e.target.value);
                            }}
                            placeholder="Enter clinic name"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'agent_name') {
                    const charWidth = 9;
                    const maxChars = 12;
                    const displayLength = agent_name ? Math.min(agent_name.length, maxChars) : 0;
                    const inputWidth = displayLength > 0 ? displayLength * charWidth : charWidth * maxChars;
                    return (
                        <Input
                            readOnly
                            key={index}
                            style={{
                                height: '30px',
                                minWidth: inputWidth,
                                maxWidth: charWidth * maxChars,
                                border: "none",
                            }}
                            maxLength={12}
                            value={ agent_name || state.setupData?.receptionistName}
                            placeholder="Enter agent name"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'agent_link') {
                    return (
                        <Input
                            readOnly
                            key={index}
                            style={{
                                height: '30px',
                                width: agent_link ? parseInt(agent_link?.length * 7.55) >= 150 ? agent_link?.length * 7.55 : 150 : 150,
                                maxWidth: 250,
                                border: "none",
                            }}
                            classNames="text-greycolor"
                            value={ agent_link || state.setupData?.appointmentLinkShared}
                            placeholder="Enter appointment name"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'location_link') {
                    return (
                        <Input
                            readOnly
                            key={index}
                            style={{
                                height: '30px',
                                width: location_link ? parseInt(location_link?.length * 7.55) >= 150 ? location_link?.length * 7.55 : 150 : 150,
                                maxWidth: 250,
                                border: "none",
                            }}
                            classNames="text-greycolor"
                            value={location_link}
                            placeholder="Enter google map link"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'regards_as_hospital') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: regards_as_hospital ? parseInt(regards_as_hospital?.length * 7.55) >= 150 ? regards_as_hospital?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={ regards_as_hospital || clinic_name}
                            onChange={(e) => {
                                setregards_as_hospital(e.target.value);
                                setclinic_name(e.target.value);
                            }}
                            placeholder="Enter clinic name"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'clinic_address') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: clinic_address ? parseInt(clinic_address?.length * 7.55) >= 150 ? clinic_address?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={clinic_address}
                            onChange={(e) => setclinic_address(e.target.value)}
                            placeholder="Enter clinic address"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'festival_name') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: festival_name ? parseInt(festival_name?.length * 7.55) >= 150 ? festival_name?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={festival_name}
                            onChange={(e) => setfestival_name(e.target.value)}
                            placeholder="Enter festival name"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'doctor_name') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: doctor_name ? parseInt(doctor_name?.length * 7.55) >= 150 ? doctor_name?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={doctor_name}
                            onChange={(e) => setdoctor_name(e.target.value)}
                            placeholder="Enter doctor name"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'phone_number') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: phone_number ? parseInt(phone_number?.length * 7.55) >= 150 ? phone_number?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={10}
                            value={phone_number}
                            onChange={(e) => setphone_number(onlyNumberFormat(e.target.value))}
                            placeholder="Enter phone number"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'link') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: link ? parseInt(link?.length * 7.55) >= 150 ? link?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={link}
                            onChange={(e) => setlink(e.target.value)}
                            placeholder="Enter link"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'review_link') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: review_link ? parseInt(review_link?.length * 7.55) >= 150 ? review_link?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={review_link}
                            onChange={(e) => setreview_link(e.target.value)}
                            placeholder="Enter review link"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'vaccine_name') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: vaccine_name ? parseInt(vaccine_name?.length * 7.55) >= 150 ? vaccine_name?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={vaccine_name}
                            onChange={(e) => setvaccine_name(e.target.value)}
                            placeholder="Enter vaccine name"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'camp_name') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: camp_name ? parseInt(camp_name?.length * 7.55) >= 150 ? camp_name?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={camp_name}
                            onChange={(e) => setcamp_name(e.target.value)}
                            placeholder="Enter Camp name"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'year_no') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: 90,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={year_no}
                            onChange={(e) => setyear_no(onlyNumberFormat(e.target.value))}
                            placeholder="Enter Year"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'start_date') {
                    return (
                        <DatePicker
                            className="me-1 my-2"
                            style={{ width: 150, height: 30 }}
                            format={showDateFormat}
                            placeholder='Select start date'
                            key={index}
                            value={start_date ? dayjs(start_date, showDateFormat) : ''}
                            onChange={(date, dateString) => setstart_date(dateString)}
                        />
                    );
                }
                else if (part === 'end_date') {
                    return (
                        <DatePicker
                            className="me-1 my-2"
                            style={{ width: 150, height: 30 }}
                            format={showDateFormat}
                            placeholder='Select end date'
                            key={index}
                            value={end_date ? dayjs(end_date, showDateFormat) : ''}
                            onChange={(date, dateString) => setend_date(dateString)}
                        />
                    );
                }
                else if (part === 'start_time') {
                    return (
                        <TimePicker
                            className="me-1 my-2"
                            style={{ width: 150, height: 30 }}
                            format={showTimeFormat1}
                            placeholder='Select start time'
                            key={index}
                            value={start_time ? dayjs(start_time, showTimeFormat1) : ''}
                            onChange={(date, dateString) => setstart_time(dateString)}
                        />
                    );
                }
                else if (part === 'end_time') {
                    return (
                        <TimePicker
                            className="me-1 my-2"
                            style={{ width: 150, height: 30 }}
                            format={showTimeFormat1}
                            placeholder='Select end time'
                            key={index}
                            value={end_time ? dayjs(end_time, showTimeFormat1) : ''}
                            onChange={(date, dateString) => setend_time(dateString)}
                        />
                    );
                }
                else if (part === 'date') {
                    return (
                        <DatePicker
                            className="me-1 my-2"
                            style={{ width: 150, height: 30 }}
                            format={showDateFormat}
                            placeholder='Select date'
                            key={index}
                            value={date ? dayjs(date, showDateFormat) : ''}
                            onChange={(date, dateString) => setdate(dateString)}
                        />
                    );
                }
                else if (part === 'time') {
                    return (
                        <TimePicker
                            className="me-1 my-2"
                            style={{ width: 150, height: 30 }}
                            format={showTimeFormat1}
                            placeholder='Select time'
                            key={index}
                            value={time ? dayjs(time, showTimeFormat1) : ''}
                            onChange={(date, dateString) => settime(dateString)}
                        />
                    );
                }
                else if (part === 'surgery_name') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: surgery_name ? parseInt(surgery_name?.length * 7.55) >= 150 ? surgery_name?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={surgery_name}
                            onChange={(e) => setsurgery_name(e.target.value)}
                            placeholder="Enter Surgery Name"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'amount') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: amount ? parseInt(amount?.length * 7.55) >= 150 ? amount?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={amount}
                            onChange={(e) => setamount(onlyDecimalFormat(e.target.value))}
                            placeholder="Enter Amount"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'service_name') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: service_name ? parseInt(service_name?.length * 7.55) >= 150 ? service_name?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={service_name}
                            onChange={(e) => setservice_name(e.target.value)}
                            placeholder="Enter Service Name"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
                else if (part === 'about_service') {
                    return (
                        <Input
                            key={index}
                            style={{
                                height: '30px',
                                width: about_service ? parseInt(about_service?.length * 7.55) >= 150 ? about_service?.length * 7.55 : 150 : 150,
                                maxWidth: 300
                            }}
                            maxLength={30}
                            value={about_service}
                            onChange={(e) => setabout_service(e.target.value)}
                            placeholder="About Service"
                            className="me-1 my-1 fw-medium"
                        />
                    );
                }
            }
            return part;
        });
        return elements;
    }, [
        template,
        clinic_name,
        agent_name,
        agent_link,
        location_link,
        regards_as_hospital,
        clinic_address,
        festival_name,
        doctor_name,
        phone_number,
        link,
        review_link,
        vaccine_name,
        camp_name,
        year_no,
        start_date,
        end_date,
        start_time,
        end_time,
        date,
        time,
        surgery_name,
        amount,
        service_name,
        about_service
    ]);

    const TEMPLATE_TEXT = useMemo(() => {
        return template && template?.text
            .replace(/{clinic_name}/g, clinic_name ? clinic_name : '{clinic_name}')
            .replace(/{agent_name}/g, agent_name ? agent_name : '{agent_name}')
            .replace(/{agent_link}/g, agent_link ? agent_link : '{agent_link}')
            .replace(/{location_link}/g, location_link ? location_link : '{location_link}')
            .replace(/{regards_as_hospital}/g, regards_as_hospital ? regards_as_hospital : '{regards_as_hospital}')
            .replace(/{clinic_address}/g, clinic_address ? clinic_address : '{clinic_address}')
            .replace(/{festival_name}/g, festival_name ? festival_name : '{festival_name}')
            .replace(/{doctor_name}/g, doctor_name ? doctor_name : '{doctor_name}')
            .replace(/{phone_number}/g, phone_number ? phone_number : '{phone_number}')
            .replace(/{link}/g, link ? link : '{link}')
            .replace(/{review_link}/g, review_link ? review_link : '{review_link}')
            .replace(/{vaccine_name}/g, vaccine_name ? vaccine_name : '{vaccine_name}')
            .replace(/{camp_name}/g, camp_name ? camp_name : '{camp_name}')
            .replace(/{year_no}/g, year_no ? year_no : '{year_no}')
            .replace(/{start_date}/g, start_date ? start_date : '{start_date}')
            .replace(/{end_date}/g, end_date ? end_date : '{end_date}')
            .replace(/{start_time}/g, start_time ? start_time : '{start_time}')
            .replace(/{end_time}/g, end_time ? end_time : '{end_time}')
            .replace(/{date}/g, date ? date : '{date}')
            .replace(/{time}/g, time ? time : '{time}')
            .replace(/{surgery_name}/g, surgery_name ? surgery_name : '{surgery_name}')
            .replace(/{amount}/g, amount ? amount : '{amount}')
            .replace(/{service_name}/g, service_name ? service_name : '{service_name}')
            .replace(/{about_service}/g, about_service ? about_service : '{about_service}')
    }, [
        template,
        clinic_name,
        agent_link,
        location_link,
        regards_as_hospital,
        agent_name,
        clinic_address,
        festival_name,
        doctor_name,
        phone_number,
        link,
        review_link,
        vaccine_name,
        camp_name,
        year_no,
        start_date,
        end_date,
        start_time,
        end_time,
        date,
        time,
        surgery_name,
        amount,
        service_name,
        about_service
    ])

    const sendTemplate = () => {
        let msg_rowData = {}
        let parts = template && template?.text?.split(/{(.*?)}/);
        parts?.map((part, index) => {
            if (index % 2 !== 0) {
                if (part === 'clinic_name') {
                    msg_rowData['clinic_name'] = clinic_name;
                }
                else if (part === 'agent_name') {
                    msg_rowData['agent_name'] = agent_name;
                }
                else if (part === 'agent_link') {
                    msg_rowData['agent_link'] = agent_link;
                }
                else if (part === 'location_link') {
                    msg_rowData['location_link'] = location_link;
                }
                else if (part === 'regards_as_hospital') {
                    msg_rowData['regards_as_hospital'] = clinic_name;
                }
                else if (part === 'clinic_address') {
                    msg_rowData['clinic_address'] = clinic_address;
                }
                else if (part === 'festival_name') {
                    msg_rowData['festival_name'] = festival_name;
                }
                else if (part === 'doctor_name') {
                    msg_rowData['doctor_name'] = doctor_name;
                }
                else if (part === 'phone_number') {
                    msg_rowData['phone_number'] = phone_number;
                }
                else if (part === 'link') {
                    msg_rowData['link'] = link;
                }
                else if (part === 'review_link') {
                    msg_rowData['review_link'] = review_link;
                }
                else if (part === 'vaccine_name') {
                    msg_rowData['vaccine_name'] = vaccine_name;
                }
                else if (part === 'camp_name') {
                    msg_rowData['camp_name'] = camp_name;
                }
                else if (part === 'year_no') {
                    msg_rowData['year_no'] = year_no;
                }
                else if (part === 'start_date') {
                    msg_rowData['start_date'] = start_date;
                }
                else if (part === 'end_date') {
                    msg_rowData['end_date'] = end_date;
                }
                else if (part === 'start_time') {
                    msg_rowData['start_time'] = start_time;
                }
                else if (part === 'end_time') {
                    msg_rowData['end_time'] = end_time;
                }
                else if (part === 'date') {
                    msg_rowData['date'] = date;
                }
                else if (part === 'time') {
                    msg_rowData['time'] = time;
                }
                else if (part === 'surgery_name') {
                    msg_rowData['surgery_name'] = surgery_name;
                }
                else if (part === 'amount') {
                    msg_rowData['amount'] = amount;
                }
                else if (part === 'service_name') {
                    msg_rowData['service_name'] = service_name;
                }
                else if (part === 'about_service') {
                    msg_rowData['about_service'] = about_service;
                }
            }
        })
        return msg_rowData;
    }

    const onAddEditCampaign = async (draft) => {
        const clinic_city = getClinicCity(profile?.hospital_data);
        window.Moengage.track_event("TP_Send_Message_Now", {
            "Doctor_specialty": profile?.dp_name,
            "Doctor_unique_id": profile?.doctor_unique_id,
            clinic_city,
            "Doctor_Name": profile?.um_name,
            "Doctor_mobile_No": profile?.um_contact,
        });
        var sendData = {
            campaign_id: template?.id,
            send_on: send_on,
            campaign_date: scheduleDateTime ? moment(scheduleDateTime).format(dateFormat1) : moment().format(dateFormat1),
            campaign_time: scheduleDateTime ? moment(scheduleDateTime).format(timeFormat1) : moment().format(timeFormat1),
            msg_rowData: sendTemplate(),
            draft: draft,
            sender_type: sender_type,
            total_patient: patientCount,
            filter_doc: sender_type == 2 ? filter_doc?.includes(-1) ? doctorList.map(e => e?.um_id).toString() : filter_doc.map(e => e).toString() : '',
            date_unit: sender_type == 2 ? dateStatus === 1 ?
                'Till date'
                : dateStatus === 2 ?
                    'Last week'
                    : dateStatus === 3 ?
                        'Last month'
                        : dateStatus === 4 ?
                            'Last 3 month'
                            : dateStatus === 5 ?
                                'Last 6 month'
                                : dateStatus === 6 ?
                                    'Last 1 year'
                                    :
                                    'custom' : '',
            min_age: sender_type == 2 ? min_age ? min_age : '' : '',
            max_age: sender_type == 2 ? max_age ? max_age : '' : '',
            min_age_unit: sender_type == 2 ? age_unit : '',
            max_age_unit: sender_type == 2 ? age_unit : '',
            gender: sender_type == 2 ? gender?.length > 0 ? gender.map(e => e).toString() : '' : '',
        }
        if (dateRange.startDate != dateRange.endDate) {
            sendData['start_date'] = sender_type == 2 ? dateRange.startDate : '';
            sendData['end_date'] = sender_type == 2 ? dateRange.endDate : '';
        }

        if (campaign_data !== undefined) {
            sendData['id'] = campaign_data?.id
            sendData['change'] = change ? 1 : 0
            sendData['draft'] = campaign_data?.draft === 0 ? campaign_data?.draft : draft
        }

        const action = campaign_data !== undefined ? await dispatch(userCampaignEdit(sendData)) : await dispatch(userCampaignAdd(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            if (sendData?.draft === 1) {
                message.open({
                    key: MESSAGE_KEY,
                    type: '',
                    className: 'message-appointment',
                    content: (
                        <div className='d-flex align-items-center'>
                            <img src={visitEnd} className='me-3' />
                            <div>
                                <div className='text-start fs-18 fontroboto'><span className="fw-semibold text-white">{template && template?.campaign_name}</span> message has been saved as a draft</div>
                            </div>
                            <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
                        </div>
                    ),
                    duration: 3,
                });
            } else {
                if (schedule_type === 1) {
                    message.open({
                        key: MESSAGE_KEY,
                        type: '',
                        className: 'message-appointment',
                        content: (
                            <div className='d-flex align-items-center'>
                                <img src={visitEnd} className='me-3' />
                                <div>
                                    <div className='text-start fs-18 fontroboto'><span className="fw-semibold text-white">{template && template?.campaign_name}</span> message has been sent successfully.</div>
                                </div>
                                <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
                            </div>
                        ),
                        duration: 3,
                    });
                } else {
                    message.open({
                        key: MESSAGE_KEY,
                        type: '',
                        className: 'message-appointment',
                        content: (
                            <div className='d-flex align-items-center'>
                                <img src={visitEnd} className='me-3' />
                                <div>
                                    <div className='text-start fs-18 fontroboto'><span className="fw-semibold text-white">{template && template?.campaign_name}</span> message has been scheduled successfully.</div>
                                </div>
                                <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
                            </div>
                        ),
                        duration: 3,
                    });
                }
            }
            navigate('/bulk_messages', { replace: true })
        } else {
            errorMessage(action.payload.message)
        }
    }
    const onGoBack = () => {
        if (stepCurrent === 0) {
            navigate(-1)
        } else {
            showHideBackModal()
        }
    }

    return (
        <>
            <div className='modalCard-header align-items-center d-flex justify-content-between'>
                <div className="align-items-center d-flex">
                    <div className='border-end h-100 text-center'>
                        <Button className='btn btn-delete-prescription px-3 h-100' onClick={onGoBack}>
                            <i className='icon-right lh-lg'></i>
                        </Button>
                    </div>
                    <CommonModal
                        isModalOpen={isBackModalOpen}
                        onCancel={showHideBackModal}
                        modalWidth={500}
                        title={"Are you sure you want to go back? "}
                        modalBody={
                            <>
                                <div className="alert-warning rounded-10px p-2 patient-details">
                                    <div className="d-flex align-items-center">
                                        <img className='me-3' src={alertIcon} alt="Warning" />
                                        <span>
                                            Your filled information will  be saved as Draft.
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="d-flex align-items-center mt-2 justify-content-end">
                                        <div onClick={() => onAddEditCampaign(1)} className="me-4 text-decoration-underline btn p-0 text-main">
                                            <span>Yes, Go back</span>
                                        </div>
                                        <Button onClick={showHideBackModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                            <span>No</span>
                                        </Button>
                                    </div>
                                </div>
                            </>
                        }
                    />
                    <div className="w-100 px-20 fs-16 fw-semibold">Create Campaign</div>
                </div>
                <div className="align-items-center d-flex">
                    <Popover
                        open={popOverVideo}
                        onOpenChange={showHideVideoListPopover}
                        content={VIDEO_CONTENT}
                        trigger="click"
                        overlayClassName="pop-430 pp-0 videoTutorial"
                        placement="bottom"
                    >
                        <button className='btn d-flex align-items-center btn-text me-10 tutorial'>
                            <span className='text-decoration-none rounded-5 pe-3 bg-white shadow2'><img height={42} src={tutorial} />Tutorial</span>
                        </button>
                    </Popover>
                    {videoLink && (
                        <VideoModal
                            videoLink={videoLink}
                            onCancel={() => setVideoLink(null)}
                        />
                    )}
                    <Button
                        onClick={handleAvailableCredit}
                        className="px-3 btn-41 btn-message d-flex align-items-center me-3">
                        <img src={CreditImg} width={19} className="me-2" />
                        {`Available Credits: ${userCreditObj?.userCredit}`}
                    </Button>
                    {stepCurrent > 0 && (
                        <div className="d-flex">
                            <Button type="text" className="btn btn-primary1 me-3 btn-41 px-4 d-flex align-items-center" onClick={() => prev()}>
                                Back
                            </Button>
                            {stepCurrent === 1 ? (
                                <Button className='btn btn-primary3 me-30 btn-41 px-4 d-flex align-items-center' onClick={() => next()}>
                                    Next
                                </Button>
                            ) : (
                                <Button className='btn btn-primary3 me-30 btn-41 px-4 d-flex align-items-center'
                                    disabled={userCreditObj?.userCredit <= `${send_on === 1 ?
                                        (patientCount * Math.ceil(TEMPLATE_TEXT?.length / 160)) * userCreditObj?.defaultSMSCredit
                                        : patientCount * userCreditObj?.defaultWhatsAppCredit}`}
                                    loading={loading}
                                    onClick={() => onAddEditCampaign(0)}>
                                    Send Message Now
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div >
            <div className="bg-body overflow-y-auto pt-5 pb-4" style={{ height: "calc(100vh - 60px)" }}>
                <Container>
                    <Row className="justify-content-center pb-5">
                        <Col xs={6}>
                            <Steps
                                className="campaign-steps"
                                current={stepCurrent}
                                items={Array.from({ length: 3 }, () => ({}))}
                            />
                            <div className="mt-3 d-flex align-items-center justify-content-between">
                                <div className={`fontroboto fs-14 fw-medium ${stepCurrent === 0 && 'text-primary-message'}`} style={{ marginLeft: -33 }}>Choose template</div>
                                <div className={`fontroboto fs-14 fw-medium ${stepCurrent === 1 && 'text-primary-message'}`} style={{ marginLeft: -23 }}>Configure</div>
                                <div className={`fontroboto fs-14 fw-medium ${stepCurrent === 2 && 'text-primary-message'}`} style={{ marginRight: -5 }}>Summary</div>
                            </div>
                        </Col>
                    </Row>

                    {stepCurrent === 0 ? (
                        <>
                            <div className="p-3 pt-0 d-flex align-items-center justify-content-between">
                                <div className="titleprint fw-semibold">
                                    Choose a template from below
                                </div>
                                <Select
                                    placeholder="Please select"
                                    className='h-38 appointmentselect'
                                    style={{ width: 250 }}
                                    value={selectedCategory}
                                    onSelect={onSelectCategory}
                                    options={[
                                        { id: -1, category: 'All Template' }, 
                                        ...categoryList.filter(category => 
                                            category.category !== 'AI Receptionist' || agent_name
                                        )
                                    ].map((e) => {
                                        return {
                                            value: e.id,
                                            label: e.category,
                                        };
                                    })}
                                />
                            </div>
                            <Row>
                                {templateLoading ? (
                                    <Spin style={{ marginTop: 120 }} />
                                ) : (
                                    allTemplateList?.filter(e => selectedCategory === -1 || e.category === selectedCategory)?.map((e, i) => {
                                        return (
                                            <Col key={i} xs={4} className="px-3 px-xl-4 mb-4 mb-xl-5">
                                                <div className="message-box" onClick={() => onTemplateClick(e)}>
                                                    <div className="d-flex align-items-center justify-content-between">
                                                        <h5 className="text-truncate fs-16 mb-0 fw-semibold" style={{ color: '#000044' }}>{e?.campaign_name}</h5>
                                                        <i className="icon-right iconrotate180"></i>
                                                    </div>
                                                    <div className="mt-4 fs-14"
                                                        dangerouslySetInnerHTML={{
                                                            __html: e?.text
                                                                .replace(/{clinic_name}/g, `<label class="text-greycolor">{clinic_name}</label>`)
                                                                .replace(/{agent_name}/g, `<label class="text-greycolor">{agent_name}</label>`)
                                                                .replace(/{agent_link}/g, `<label class="text-greycolor">{agent_link}</label>`)
                                                                .replace(/{location_link}/g, `<label class="text-greycolor">{location_link}</label>`)
                                                                .replace(/{regards_as_hospital}/g, `<label class="text-greycolor">{regards_as_hospital}</label>`)
                                                                .replace(/{clinic_address}/g, `<label class="text-greycolor">{clinic_address}</label>`)
                                                                .replace(/{festival_name}/g, `<label class="text-greycolor">{festival_name}</label>`)
                                                                .replace(/{doctor_name}/g, `<label class="text-greycolor">{doctor_name}</label>`)
                                                                .replace(/{phone_number}/g, `<label class="text-greycolor">{phone_number}</label>`)
                                                                .replace(/{link}/g, `<label class="text-greycolor">{link}</label>`)
                                                                .replace(/{review_link}/g, `<label class="text-greycolor">{review_link}</label>`)
                                                                .replace(/{vaccine_name}/g, `<label class="text-greycolor">{vaccine_name}</label>`)
                                                                .replace(/{camp_name}/g, `<label class="text-greycolor">{camp_name}</label>`)
                                                                .replace(/{year_no}/g, `<label class="text-greycolor">{year_no}</label>`)
                                                                .replace(/{start_date}/g, `<label class="text-greycolor">{start_date}</label>`)
                                                                .replace(/{end_date}/g, `<label class="text-greycolor">{end_date}</label>`)
                                                                .replace(/{start_time}/g, `<label class="text-greycolor">{start_time}</label>`)
                                                                .replace(/{end_time}/g, `<label class="text-greycolor">{end_time}</label>`)
                                                                .replace(/{date}/g, `<label class="text-greycolor">{date}</label>`)
                                                                .replace(/{time}/g, `<label class="text-greycolor">{time}</label>`)
                                                                .replace(/{surgery_name}/g, `<label class="text-greycolor">{surgery_name}</label>`)
                                                                .replace(/{amount}/g, `<label class="text-greycolor">{amount}</label>`)
                                                                .replace(/{service_name}/g, `<label class="text-greycolor">{service_name}</label>`)
                                                                .replace(/{about_service}/g, `<label class="text-greycolor">{about_service}</label>`)
                                                        }}>
                                                    </div>
                                                </div>
                                            </Col>
                                        )
                                    })
                                )}
                            </Row>
                        </>
                    ) : stepCurrent === 1 ? (
                        <>
                            <div className="titleprint fw-semibold mb-3">
                                Configure “{template && template?.campaign_name}” Template
                            </div>

                            <Row className="gx-5 justify-content-between">
                                <Col xs={8}>
                                    <div className="configure-template">
                                        <h5 className="fs-16 mb-0 fw-semibold">Send on</h5>
                                        <div className="mt-3">
                                            <div className="radio-group-with-info" style={{ position: 'relative' }}>
                                                <Radio.Group className="d-flex" onChange={handleSendOn} value={send_on}>
                                                    {selectedCategory === 6 || state?.category === 'ai-receptionist' || template?.id === 29 || template?.id === 25 || template?.id === 32 || template?.id === 33 ? (
                                                        <>
                                                            <Radio className="col me-30" value={2}>WhatsApp</Radio>
                                                            <Radio
                                                                className="col me-0 radio-disabled"
                                                                value={1}
                                                                disabled={selectedCategory === 6 || state?.category === 'ai-receptionist' || template?.id === 29 || template?.id === 25 || template?.id === 32 || template?.id === 33}
                                                            >
                                                                SMS
                                                            </Radio>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Radio className="col me-30" value={1}>SMS</Radio>
                                                            <Radio className="col me-0" value={2}>WhatsApp</Radio>
                                                        </>
                                                    )}
                                                </Radio.Group>
                                                {(selectedCategory === 6 || state?.category === 'ai-receptionist' || template?.id === 29 || template?.id === 25 || template?.id === 32 || template?.id === 33) && (
                                                    <Tooltip title={`SMS is not available for ${state?.category === 'ai-receptionist' ? "AI Receptionist campaigns": "this template"}`}>
                                                        <InfoCircleOutlined className="radio-group-info-icon" />
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </div>
                                        <hr className="mb-28 mt-4" />
                                        <div className="my-2 d-flex align-items-center justify-content-between">
                                            <div className="fw-semibold">Compose Message</div>
                                            <button className="btn btn-text clear-text px-0" onClick={() => prev()}>
                                                <span className="text-primary">Change template</span>
                                            </button>
                                        </div>

                                        <div className="px-4 py-3 fs-14 border rounded-4 position-relative">{renderTemplate}
                                            {send_on === 1 && (
                                                <div className="fs-12-1 text-greycolor position-absolute" style={{ right: 7, bottom: 3 }}>{
                                                    `${TEMPLATE_TEXT?.length}/160`
                                                }</div>
                                            )}
                                        </div>

                                        {send_on === 1 && (
                                            <div className="fs-12-1 text-greycolor mt-2">Note: Messages over 160 characters count as 2 SMS. Keep it concise to save costs.</div>
                                        )}
                                        <hr className="mb-28 mt-4" />
                                        <div className="fw-semibold">Who will Receive this message? <span className="text-scheduled">({patientCount} Patients)</span></div>
                                        <div className="mt-3">
                                            <Radio.Group className="d-flex" onChange={handleSenderType} value={sender_type}>
                                                <Radio className="col me-30" value={1}>All Patients</Radio>
                                                <Radio className="col me-0" value={2}>Custom</Radio>
                                            </Radio.Group>
                                            {sender_type === 2 && (
                                                <>
                                                    <div className="mt-4">
                                                        <div className="fs-14 text-greycolor">Select Doctors Whose Patients Will Receive This Message</div>
                                                        <Select
                                                            mode="multiple"
                                                            className="doctor-selection"
                                                            placeholder="Please select"
                                                            popupClassName="doctor-selection-popup"
                                                            value={filter_doc}
                                                            options={[{ um_id: -1, um_name: 'All Doctor', unique_id: '-1' }, ...doctorList].map((e) => {
                                                                return {
                                                                    value: e.um_id,
                                                                    label: e.um_name,
                                                                };
                                                            })}
                                                            optionRender={(option) => (
                                                                option.data.value === -1 ? (
                                                                    <div className="align-items-center d-flex text-truncate w-100">
                                                                        <div>
                                                                            <div className="py-2">{option.data.label}</div>
                                                                            <hr className="my-0 position-absolute w-100 bottom-0 start-0" />
                                                                            <div className="position-absolute fw-normal" style={{ top: 36, left: '50%', zIndex: 9 }}>or</div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="align-items-center d-flex text-truncate w-100 py-1">
                                                                        <Checkbox className="advice-check" checked={filter_doc?.includes(option.data.value)} />
                                                                        {option.data.label}
                                                                    </div>
                                                                )
                                                            )}
                                                            onChange={handleFilterDoc}
                                                        />
                                                    </div>
                                                    <div className="mt-4 w-50 pe-3 position-relative">
                                                        <div className="fs-14 text-greycolor mb-2">Select Patients Who Visited Between</div>
                                                        <div className="massage-date-wrapper">
                                                            <div className="fs-14 h-100 w-100 d-flex align-items-center justify-content-between" onClick={handlePickerModal}>
                                                                <span>
                                                                    {dateStatus === 1 ? (
                                                                        'Till date'
                                                                    ) : dateStatus === 2 ? (
                                                                        'Last week'
                                                                    ) : dateStatus === 3 ? (
                                                                        'Last month'
                                                                    ) : dateStatus === 4 ? (
                                                                        'Last 3 month'
                                                                    ) : dateStatus === 5 ? (
                                                                        'Last 6 month'
                                                                    ) : dateStatus === 6 ? (
                                                                        'Last 1 year'
                                                                    ) : (
                                                                        <>
                                                                            {moment(dateRange.startDate).format(showDateFormat)} - {moment(dateRange.endDate).format(showDateFormat)}
                                                                        </>
                                                                    )}
                                                                </span>
                                                                <i className="mx-2 fs-18 icon-calendar"></i>
                                                            </div>
                                                            <RangePicker
                                                                open={pickerModal}
                                                                presets={rangePresets}
                                                                format={showDateFormat}
                                                                onChange={onRangeChange}
                                                                popupClassName="massage-date"
                                                                className="massage-input"
                                                                inputReadOnly
                                                                renderExtraFooter={() =>
                                                                    <div className="d-flex align-items-center justify-content-between py-1">
                                                                        <div>{moment(dateRange.startDate).format(showDateFormat)} - {moment(dateRange.endDate).format(showDateFormat)}</div>
                                                                        <div>
                                                                            <button className="btn btn-text me-3 px-0" onClick={() => {
                                                                                setDateStatus(1);
                                                                                setDateRange({
                                                                                    startDate: moment().format(dateFormat),
                                                                                    endDate: moment().format(dateFormat),
                                                                                });
                                                                                handlePickerModal()
                                                                            }}>
                                                                                <span>Cancel</span>
                                                                            </button>
                                                                            <Button className="px-4" type="primary" onClick={handlePickerModal}>
                                                                                Done
                                                                            </Button>
                                                                        </div>
                                                                    </div>}
                                                                onOpenChange={() => { }}
                                                            // value={[dateRange.startDate != dateRange.endDate
                                                            //     ? dayjs(moment(dateRange.startDate).format(showDateFormat), showDateFormat)
                                                            //     : "",
                                                            // dateRange.startDate != dateRange.endDate
                                                            //     ? dayjs(moment(dateRange.endDate).format(showDateFormat), showDateFormat)
                                                            //     : ""]
                                                            // }
                                                            />

                                                        </div>
                                                    </div>
                                                    <div className="mt-4 w-75">
                                                        <div className="fs-14 text-greycolor mb-2">Patient Age Range</div>
                                                        <div className="d-flex align-items-center">
                                                            <Input
                                                                inputMode="numeric"
                                                                className="patient-range"
                                                                value={min_age}
                                                                maxLength={30}
                                                                onChange={onChangeMinInput}
                                                                addonAfter={selectAfter} />
                                                            <div className="px-3">-</div>
                                                            <Input
                                                                inputMode="numeric"
                                                                className="patient-range"
                                                                value={max_age}
                                                                maxLength={30}
                                                                onChange={onChangeMaxInput}
                                                                addonAfter={selectAfter} />
                                                        </div>
                                                    </div>
                                                    <div className="mt-4">
                                                        <div className="fs-14 text-greycolor mb-2">Gender</div>
                                                        <Checkbox.Group className="message-gender" value={gender} options={GENDER} onChange={onChangeGender} />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <hr className="mb-28 mt-4" />
                                        <div className="fw-semibold">When do you want to send this message?</div>
                                        <div className="mt-3">
                                            <Radio.Group className="d-flex" onChange={handleScheduleType} value={schedule_type}>
                                                <Radio className="col me-30" value={1}>Send Now</Radio>
                                                <Radio className="col me-0" value={2}>Schedule for later</Radio>
                                            </Radio.Group>
                                            {schedule_type === 2 && (
                                                <div className="mt-4 w-50 pe-3">
                                                    <div className="fs-14 text-greycolor mb-2">Select Schedule Date & Time</div>
                                                    <DatePicker
                                                        showTime
                                                        className="rounded-10px w-100"
                                                        style={{ height: 48 }}
                                                        format={showDateTimeFormat}
                                                        placeholder='Select date & time'
                                                        showNow={false}
                                                        locale={{
                                                            ...locale,
                                                            lang: {
                                                                ...locale.lang,
                                                                ok: "Done",
                                                            }
                                                        }}
                                                        disabledDate={disabledDate}
                                                        disabledTime={disabledTime}
                                                        renderExtraFooter={() => <div className="fs-12-1 text-greycolor">Note: Scheduling message allowed only between 8AM-8PM</div>}
                                                        value={scheduleDateTime ? dayjs(moment(scheduleDateTime).format(showDateTimeFormat), showDateTimeFormat) : ''}
                                                        onChange={(date, dateString) => setScheduleDateTime(dateString ? moment(dateString).format(dateTimeFormat) : '')}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={4}>
                                    <div className="position-sticky top-0">
                                        <div className="sms-preview">
                                            <div className="text-center fs-14 mb-0 fw-medium fontroboto">{send_on === 1 ? 'SMS Preview' : 'WhatsApp Preview'}</div>
                                            <div className={`sms-preview-mobile ${send_on === 2 ? 'whatsup-preview-mobile' : ''}`}>
                                                <div className="sms-preview-message rounded-4 p-2">
                                                    <div className="fs-13 text-truncate-fourlines">
                                                        {TEMPLATE_TEXT}
                                                    </div>
                                                    <img className="position-absolute" style={{ left: -2, bottom: -3 }} src={send_on === 1 ? messageCornerGrey : messageCorner} alt="Message" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <div className="fontroboto fs-18 fw-bold text-black">Credit Details</div>
                                            <div className="fs-12-1 fw-semibold fontroboto text-black-50">{`(${send_on === 1 ? '1 SMS = ' + userCreditObj?.defaultSMSCredit : '1 WhatsApp message = ' + userCreditObj?.defaultWhatsAppCredit} Credits)`}</div>
                                            <div className="my-3">
                                                <div className="d-flex align-items-center py-1 justify-content-between fs-14 fontroboto">
                                                    <div className="fontroboto fw-bold">Target Customers (A) :</div>
                                                    <div className="fontroboto fw-bold">{`${patientCount} User`}</div>
                                                </div>
                                                <div className="d-flex align-items-center py-1 justify-content-between fs-14 fontroboto">
                                                    <div className="fontroboto fw-bold">{`${send_on === 1 ? 'SMS' : 'Message'} Per Customers (B) :`}</div>
                                                    <div className="fontroboto fw-bold">{`${send_on === 1 ? Math.ceil(TEMPLATE_TEXT?.length / 160) + ' SMS' : '1 Message'}`}</div>
                                                </div>
                                                <div className="d-flex align-items-center py-1 justify-content-between fs-14 fontroboto">
                                                    <div className="fontroboto fw-bold">{`Price Per ${send_on === 1 ? 'SMS' : 'Message'} (C) :`}</div>
                                                    <div className="fontroboto fw-bold">{`${send_on === 1 ? userCreditObj?.defaultSMSCredit : userCreditObj?.defaultWhatsAppCredit} Credits`}</div>
                                                </div>
                                                <hr className="mt-2 mb-3" />
                                                <div className="d-flex align-items-center justify-content-between fs-14 fontroboto">
                                                    <div className="fontroboto fw-bold">Total Credits Required (ABC) :</div>
                                                    <div className="fontroboto fw-bold">{`${send_on === 1 ? ((patientCount * Math.ceil(TEMPLATE_TEXT?.length / 160)) * userCreditObj?.defaultSMSCredit).toFixed(2) : (patientCount * userCreditObj?.defaultWhatsAppCredit).toFixed(2)} Credits`}</div>
                                                </div>
                                                <hr />
                                            </div>
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </>
                    ) : stepCurrent === 2 && (
                        <>
                            <div className="configure-template overflow-y-auto w-75 mx-auto">
                                <div className="fs-18 lh-base">
                                    {`The below `}
                                    <span className="fw-semibold">{template?.campaign_name}</span>
                                    {` message will be sent on `}
                                    <span className="fw-semibold">{moment(scheduleDateTime).format(showDateFormat1)}</span>
                                    {` at `}
                                    <span className="fw-semibold">{moment(scheduleDateTime).format(showTimeFormat1)} </span> via <span className="fw-semibold">{send_on === 1 ? 'SMS' : 'Message'}</span>
                                    {` to `}
                                    {sender_type === 1 ? (
                                        <>
                                            <span className="fw-semibold"> {`${patientCount} patients`} </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="fw-semibold"> {`${patientCount} ${gender?.length === 1 ? gender : ''} patients`} </span>
                                            {(min_age && max_age) ? (
                                                <>
                                                    {` of age between `}
                                                    <span className="fw-semibold"> {`${min_age}-${max_age} ${age_unit}`} </span>
                                                </>
                                            ) : null}
                                            {` who visited in the `}
                                            <span className="fw-semibold">
                                                {dateStatus === 1 ? (
                                                    'Till date'
                                                ) : dateStatus === 2 ? (
                                                    'Last week'
                                                ) : dateStatus === 3 ? (
                                                    'Last month'
                                                ) : dateStatus === 4 ? (
                                                    'Last 3 month'
                                                ) : dateStatus === 5 ? (
                                                    'Last 6 month'
                                                ) : dateStatus === 6 ? (
                                                    'Last 1 year'
                                                ) : (
                                                    moment(dateRange?.startDate).format(showDateFormat) + " to " + moment(dateRange?.endDate).format(showDateFormat)
                                                )}
                                            </span>
                                        </>
                                    )}
                                </div>

                                <div className={`${send_on === 1 ? 'bg-selected' : 'bg-whatsup-message'} w-100 mt-4 py-3 rounded-20px d-flex justify-content-center align-items-center`} style={{ minHeight: 138 }}>
                                    <div className="bg-white w-60 fw-medium rounded-4 p-3 position-relative">
                                        {TEMPLATE_TEXT}
                                        <img className="position-absolute" style={{ left: -2, bottom: -3 }} src={messageCorner} alt="Message" />
                                    </div>
                                </div>

                                <div className="mt-4 mb-3">
                                    <div className="fontroboto text-black fw-bold title-hypertension">Credit Details</div>
                                    <div className="title-common my-2 text-black-50">{`(${send_on === 1 ? '1 SMS = ' + userCreditObj?.defaultSMSCredit : '1 WhatsApp message = ' + userCreditObj?.defaultWhatsAppCredit} Credits)`}</div>

                                    <div className="mt-4">
                                        <div className="d-flex align-items-center py-2 justify-content-between fs-18 fw-medium fontroboto">
                                            <div>Target Customers (A) :</div>
                                            <div>{`${patientCount} User`}</div>
                                        </div>
                                        <div className="d-flex align-items-center py-2 justify-content-between fs-18 fw-medium fontroboto">
                                            <div>{`${send_on === 1 ? 'SMS' : 'Message'} Per Customers (B) :`}</div>
                                            <div>{`${send_on === 1 ? Math.ceil(TEMPLATE_TEXT?.length / 160) + ' SMS' : '1 Message'}`}</div>
                                        </div>
                                        <div className="d-flex align-items-center py-2 justify-content-between fs-18 fw-medium fontroboto">
                                            <div>{`Price Per ${send_on === 1 ? 'SMS' : 'Message'} (C) :`}</div>
                                            <div>{`${send_on === 1 ? userCreditObj?.defaultSMSCredit : userCreditObj?.defaultWhatsAppCredit} Credits`}</div>
                                        </div>
                                        <hr />
                                        <div className="d-flex align-items-center justify-content-between fs-18 fw-medium fontroboto">
                                            <div>Total Credits Required (ABC) :</div>
                                            <div className="fw-medium">{`${send_on === 1 ? ((patientCount * Math.ceil(TEMPLATE_TEXT?.length / 160)) * userCreditObj?.defaultSMSCredit).toFixed(2) : (patientCount * userCreditObj?.defaultWhatsAppCredit).toFixed(2)} Credits`}</div>
                                        </div>
                                        {userCreditObj?.userCredit < `${send_on === 1 ?
                                            (patientCount * Math.ceil(TEMPLATE_TEXT?.length / 160)) * userCreditObj?.defaultSMSCredit
                                            : patientCount * userCreditObj?.defaultWhatsAppCredit}` && (
                                                <>
                                                    <div className="mt-2 d-flex align-items-center justify-content-between fs-18 fw-medium fontroboto">
                                                        <div>Your Credit Balance</div>
                                                        <div className="fw-medium">(-){userCreditObj?.userCredit} Credits</div>
                                                    </div>
                                                    <hr />
                                                    <div className="d-flex align-items-center justify-content-between fs-18 fw-semibold fontroboto">
                                                        <div className="text-scheduled">Credit to Purchase</div>
                                                        <div className="fw-semibold text-scheduled">
                                                            {`${send_on === 1 ?
                                                                (((patientCount * Math.ceil(TEMPLATE_TEXT?.length / 160)) * userCreditObj?.defaultSMSCredit) - userCreditObj?.userCredit).toFixed(2)
                                                                : ((patientCount * userCreditObj?.defaultWhatsAppCredit) - userCreditObj?.userCredit).toFixed(2)} Credits`}</div>
                                                    </div>
                                                    <hr />
                                                    <Button className='mt-4 btn btn-primary3 btn-41 px-5 mx-auto d-block'
                                                        loading={loading}
                                                        onClick={handleAvailableCredit}>
                                                        Buy Credits
                                                    </Button>
                                                </>
                                            )}
                                    </div>
                                    {/* <div className="text-greycolor">We will refund the credits for undelivered messages within 48 hours of delivery</div> */}
                                </div>
                            </div>
                        </>
                    )}
                </Container>
            </div>

            <Drawer
                className="modalWidth-645" width="auto"
                title="Buy Message Credits"
                placement="right"
                closable
                open={availableCredit}
                onClose={handleAvailableCredit}
            >
                <AvailableCredits handleAvailableCredit={handleAvailableCredit} />
            </Drawer>
        </>
    );
}

export default MessageCreateCampaign;
