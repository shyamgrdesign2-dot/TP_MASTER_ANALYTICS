import React, { useEffect, useContext, useState, useRef, useCallback } from 'react';
import { Button, Dropdown, Modal, Progress, Space, Input, Drawer, message } from 'antd';
import { Container, Navbar, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from "react-redux";
import axios from 'axios';
import { isChrome, isSafari, deviceDetect } from 'react-device-detect';
import { useQrPrintDownloadHandlers } from '../../common/qrPrintDownloadHelper';

import Homepage from '../../website/Homepage';

import './HeaderDoctorWebsite.scss';

import DoctorWebsiteSettingsContext from '../../context/DoctorWebsiteSettingsContext';

import { saveDoctorWebsite, publishDoctorWebsite } from "../../redux/doctorWebsiteSlice";
import { updateWebsitePublish } from "../../redux/doctorsSlice";
import { errorMessage, handleCopy, validateEmail, trackEvent, getTokenData, sendMessageToParent } from '../../utils/utils';
import CommonModal from '../../common/CommonModal';
import QrPrintDownloadModal from '../../common/QrPrintDownloadModal';

import { EVENTS } from '../../utils/events';
import { ASSETS } from "../../assets";
const {
  stopPublishing,
  link: LinkIcon,
  alerticon: alertIcon,
  textLogo: logoIcom,
  share: ShareIcon,
  copy: CopyIcon,
  qrIcon,
} = ASSETS.images;

function HeaderDoctorWebsite() {

    const dispatch = useDispatch();
    const { profile } = useSelector((state) => state.doctors);
    const { planDetails } = useSelector((state) => state.subscription);
    const { save_loading, publish_loading } = useSelector((state) => state.doctorWebsite);

    const [childDrawer, setChildDrawer] = useState(false);
    const [childDrawer1, setChildDrawer1] = useState(false);

    // Handle Child Drawer
    const handleDrawerChild = useCallback(() => {
        setChildDrawer(!childDrawer);
    }, [childDrawer]);

    const handleDrawerChild1 = useCallback(() => {
        setChildDrawer1(!childDrawer1);
    }, [childDrawer1]);

    const navigate = useNavigate();

    const { websiteData, tmdwm_id, personalDetails, clinicProfile, aboutDoctor, doctorExperience, services, educationTraining, membership, rewardRecognition, socialLinks, otherSettings } = useContext(DoctorWebsiteSettingsContext);

    const [loaderModal, setLoaderModal] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [publishUrl, setPublishUrl] = useState(null);
    const [unpublishStatus, setUnpublishStatus] = useState(null);
    const [isQRCodeVisible, setQRCodeVisible] = useState(false);
    const cancelTokenSource = useRef(null);
    const printRef = useRef();

    async function onSaveWebsiteClick() {
        // Track mixpanel event for website save and publish
        const tokenData = getTokenData();
        const deviceInfo = deviceDetect();
        
        trackEvent("TP_MS_Publish", {
            clinic_id: tokenData?.clinic_id || "",
            clinic_name: profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id)?.hm_name || "",
            um_id: tokenData?.user_id || "",
            doctor_name: `${personalDetails?.first_name || ""} ${personalDetails?.last_name || ""}`.trim(),
            specialty: personalDetails?.specialty || "",
            plan_type: planDetails?.currentPlanStatus === "PAID" ? "Paid" : "Unpaid",
            device: navigator.userAgent
        });

        setPublishUrl(null)
        setProgress(0);
        setUnpublishStatus(false)
        setLoaderModal(true)

        let { uploadFile, ...updatePersonalDetails } = personalDetails

        let makeClinicPhotosObject = {}
        const updatedClinicProfile = clinicProfile?.map(e => {
            const newObj = { ...e };

            delete newObj['selectedTab'];
            delete newObj['created_by'];
            delete newObj['activeShiftKeys'];

            const updatedServerClinicPhotos = newObj?.clinic_photos?.filter(e1 => !e1.clinic_image_link.startsWith('blob:'))

            const updatedLocalClinicPhotos = newObj?.clinic_photos?.filter(e1 => e1.clinic_image_link.startsWith('blob:'))
            var fetchUploadFile = []
            updatedLocalClinicPhotos?.map(e1 => fetchUploadFile.push(e1?.uploadFile))
            makeClinicPhotosObject[`clinicpic_${newObj?.random_id}`] = fetchUploadFile

            return { ...newObj, clinic_photos: [...updatedServerClinicPhotos] }
        })

        var sendData = {
            personal_details: JSON.stringify(updatePersonalDetails),
            hero_image: personalDetails?.uploadFile ? personalDetails?.uploadFile : '',
            clinic_profile: JSON.stringify(updatedClinicProfile),
            about_doctor: JSON.stringify(aboutDoctor),
            doctor_experience: JSON.stringify(doctorExperience),
            services: JSON.stringify(services.map(({ unique_id, ...rest }) => rest)),
            education_training: JSON.stringify(educationTraining),
            membership: JSON.stringify(membership.map(({ unique_id, ...rest }) => rest)),
            reward_recognition: JSON.stringify(rewardRecognition),
            social_links: JSON.stringify(socialLinks),
            ...otherSettings,
            ...makeClinicPhotosObject
        }

        const formData = new FormData();
        Object.keys(sendData).forEach((key) => {
            if (key.startsWith('clinicpic')) {
                sendData[key].forEach((item, index) => {
                    formData.append(key, item);
                });
            } else {
                formData.append(key, sendData[key]);
            }
        });

        cancelTokenSource.current = axios.CancelToken.source();

        const action = await dispatch(saveDoctorWebsite({
            data: sendData,
            onUploadProgress: onUploadProgress,
            onDownloadProgress: onDownloadProgress,
            cancelToken: cancelTokenSource.current.token
        }));
        if (action.meta.requestStatus === "fulfilled") {
            navigate('/doctor_website_setting', { replace: true, state: { websiteData: { ...action.payload } } })
        } else {
            setLoaderModal(false)
            errorMessage(action.error)
        }
    }
    const onDownloadProgress = (progressEvent) => {
        const total = progressEvent.total
        const current = progressEvent.loaded
        const percentage = Math.round((current / total) * 100);
        if (percentage > 95) {
            setProgress(percentage);
        }
    };
    const onUploadProgress = (progressEvent) => {
        const total = progressEvent.total
        const current = progressEvent.loaded
        const percentage = Math.round((current / total) * 100);
        if (percentage < 95) {
            setProgress(percentage);
        }
    };

    const handleCancelUpload = () => {
        if (cancelTokenSource.current) {
            cancelTokenSource.current.cancel('Upload canceled by the user.');
        }
    };

    const handleDontPublishClick = () => {
        // Track mixpanel event for don't publish button
        const tokenData = getTokenData();
        const deviceInfo = deviceDetect();
        
        trackEvent("TP_MS_DNPublish", {
            clinic_id: tokenData?.clinic_id || "",
            clinic_name: profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id)?.hm_name || "",
            um_id: tokenData?.user_id || "",
            doctor_name: `${personalDetails?.first_name || ""} ${personalDetails?.last_name || ""}`.trim(),
            specialty: personalDetails?.specialty || "",
            plan_type: planDetails?.currentPlanStatus === "PAID" ? "Paid" : "Unpaid",
            device: navigator.userAgent
        });

        setLoaderModal(false);
    };

    async function onPublishWebsiteClick(status) {

        // Track mixpanel event for publish button
        const tokenData = getTokenData();
        const deviceInfo = deviceDetect();
        
        trackEvent("TP_MS_PublishSite", {
            clinic_id: tokenData?.clinic_id || "",
            clinic_name: profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id)?.hm_name || "",
            um_id: tokenData?.user_id || "",
            doctor_name: `${personalDetails?.first_name || ""} ${personalDetails?.last_name || ""}`.trim(),
            specialty: personalDetails?.specialty || "",
            plan_type: planDetails?.currentPlanStatus === "PAID" ? "Paid" : "Unpaid",
            device: navigator.userAgent
        });

        if (!status) {
            showHideModal()
        }

        var sendData = {
            tmdwm_id: tmdwm_id,
            website_publish: status
        }

        const action = await dispatch(publishDoctorWebsite(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            if (!status) {
                setUnpublishStatus(true)
                setLoaderModal(true)
            }
            await dispatch(updateWebsitePublish({ website_publish: status, publish_url: action.payload?.publish_url }))
            setPublishUrl(action.payload?.publish_url)
        } else {
            setLoaderModal(false)
            errorMessage(action.error)
        }
    }

    const showHideModal = useCallback(() => {
        setIsModalOpen(!isModalOpen);
    }, [isModalOpen]);

    const items = [
        {
            label: <div onClick={showHideModal}>Unpublish Website</div>,
            key: 'UnPublish',
        },
    ];

    const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

    const showHideLogoModal = useCallback(() => {
        setIsLogoModalOpen(!isLogoModalOpen);
    }, [isLogoModalOpen]);

    const clickRedirect = async () => {
        if (!isChrome && !isSafari) {
            // navigate(`/doctor_website_setting/?url=${publishUrl}&key=phpRedirect`, { replace: true, state: { websiteData: { ...websiteData } } })
            // navigate(0, { replace: true });
            sendMessageToParent(EVENTS.REDIRECT, {
                url: `/doctor_website_setting/?url=${publishUrl}`,
            });
        } else {
            await window.open(publishUrl)
        }
    }

    const handleShareUrl = async () => {
        if (!publishUrl) {
            message.warning("No website URL available.");
            return;
        }

        const tokenData = getTokenData();
        trackEvent("TP_MS_ShareURL", {
            clinic_id: tokenData?.clinic_id || "",
            clinic_name: profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id)?.hm_name || "",
            um_id: tokenData?.user_id || "",
            doctor_name: `${personalDetails?.first_name || ""} ${personalDetails?.last_name || ""}`.trim(),
            specialty: personalDetails?.specialty || "",
            plan_type: planDetails?.currentPlanStatus === "PAID" ? "Paid" : "Unpaid",
        });

        if (navigator.share && publishUrl) {
            try {
                await navigator.share({
                    title: 'Doctor Website',
                    text: 'Visit my doctor website',
                    url: publishUrl,
                });
            } catch (error) {
                console.error("error while sharing the link", error);
            }
        } else {
            navigator.clipboard.writeText(publishUrl)
                .then(() => {
                    message.success("Link copied to clipboard! You can now share it manually.");
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                });
        }
    };

    const handleCopyUrl = async () => {
        if (!publishUrl) {
            message.warning("No website URL available.");
            return;
        }

        const tokenData = getTokenData();
        trackEvent("TP_MS_CopyURL", {
            clinic_id: tokenData?.clinic_id || "",
            clinic_name: profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id)?.hm_name || "",
            um_id: tokenData?.user_id || "",
            doctor_name: `${personalDetails?.first_name || ""} ${personalDetails?.last_name || ""}`.trim(),
            specialty: personalDetails?.specialty || "",
            plan_type: planDetails?.currentPlanStatus === "PAID" ? "Paid" : "Unpaid",
        });

        try {
            await navigator.clipboard.writeText(publishUrl);
            message.success("Link copied to clipboard!");
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = publishUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            message.success("Link copied to clipboard!");
        }
    };

    const showHideQRModal = useCallback(() => {
        setQRCodeVisible(!isQRCodeVisible);
    }, [isQRCodeVisible]);

    const { handlePrint, handleDownload } = useQrPrintDownloadHandlers({
        printRef,
        fileName: 'Doctor-Website-URL',
    });

    const handleShowQRCode = () => {
        if (!publishUrl) {
            message.warning("No website URL available.");
            return;
        }
        setQRCodeVisible(true);
    };

    const truncateUrl = (url, maxLength = 20) => {
        if (!url) return "";
        return url.length > maxLength
          ? `${url.slice(0, maxLength)}…`
          : url;
      };
      

    return (
        <>
            <Navbar className="justify-content-between headerprescription p-0">
                <Container fluid className='h-100 gx-0 w-100'>
                    <Row className='h-100 align-items-center w-100 justify-content-between'>
                        <Col sm="auto" className='h-100'>
                            <div className='align-items-center d-flex h-100'>
                                <div className='border-end h-100 text-center'>
                                    <div onClick={showHideLogoModal} className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                                        <i className='icon-right'></i>
                                    </div>
                                    <CommonModal
                                        isModalOpen={isLogoModalOpen}
                                        onCancel={showHideLogoModal}
                                        modalWidth={500}
                                        title={"You may lose your data"}
                                        modalBody={
                                            <>
                                                <div className="alert-warning rounded-10px p-2 patient-details mb-4">
                                                    <div className="d-flex align-items-center">
                                                        <img className='me-3' src={alertIcon} alt="Warning" />
                                                        <span>
                                                            Are you sure you want to leave? <br />
                                                            You will permanently lose your data.
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="d-flex align-items-center mt-2 justify-content-end">
                                                        <div onClick={() => navigate('/doctor_profile', { replace: true, state: { websiteData: { ...websiteData } } })}
                                                            className="me-4 text-decoration-underline btn p-0 text-main">
                                                            Yes, Back
                                                        </div>
                                                        <Button onClick={showHideLogoModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                                            <span>No, Stay</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        }
                                    />
                                </div>
                                <div className='ms-3 title-common'>Setup Website</div>
                            </div>
                        </Col>
                        <Col sm="auto">
                            <div className='align-items-center d-flex'>
                                <button onClick={handleDrawerChild1} className='btn d-flex align-items-center btn-text me-14'>
                                    <i className="icon-New-Window me-2"></i> <span>Live Reference Demo</span>
                                </button>
                                <button onClick={handleDrawerChild} className='btn d-flex align-items-center btn-text me-14'>
                                    <i className="icon-Preview me-2"></i> <span>Your Website Preview</span>
                                </button>
                                <Button
                                    type='button'
                                    className="btn-41 btn px-4 btn-primary3 align-items-center d-flex"
                                    loading={save_loading}
                                    disabled={personalDetails?.first_name
                                        // && personalDetails?.last_name
                                        && personalDetails?.education
                                        // && (personalDetails?.email_id ? validateEmail(personalDetails?.email_id) : true)
                                        && aboutDoctor?.years_experience
                                        && aboutDoctor?.language?.length > 0
                                        && clinicProfile?.filter(el => !el.clinic_delete)?.length > 0
                                        && clinicProfile?.filter(el => !el.clinic_delete)?.filter(el => !el.name)?.length === 0
                                        && clinicProfile?.filter(el => !el.clinic_delete)?.filter(el => !el.contact_no)?.length === 0
                                        && clinicProfile?.filter(el => !el.clinic_delete)?.filter(el => !el.address.pincode)?.length === 0
                                        && clinicProfile?.filter(el => !el.clinic_delete)?.filter(el => !el.address.city)?.length === 0
                                        && clinicProfile?.filter(el => !el.clinic_delete)?.filter(el => !el.address.state)?.length === 0
                                        && clinicProfile?.filter(el => !el.clinic_delete)?.filter(el => !el.address.address_line)?.length === 0
                                        && clinicProfile?.filter(el => !el.clinic_delete)?.filter(el => el.shift.length === 0)?.length === 0
                                        && clinicProfile?.filter(el => !el.clinic_delete)?.every(el => el.shift.every(x => x.days.length !== 0))
                                        && clinicProfile?.filter(el => !el.clinic_delete)?.every(el => el.shift.every(x => x.timing.every(xl => xl.from_time !== "" && xl.end_time !== ""))) ? false : true}
                                    onClick={onSaveWebsiteClick}>
                                    <i className="icon-New-Window me-2"></i> Save & Publish Website
                                </Button>
                                {profile?.website_publish && profile?.publish_url ? (
                                    <Dropdown className='btn btn-outline btn-more p-0 ms-3' menu={{ items }} trigger={['click']}>
                                        <a onClick={(e) => e.preventDefault()}>
                                            <i className='icon-More'></i>
                                        </a>
                                    </Dropdown>
                                ) : null}
                            </div>
                        </Col>
                    </Row>
                </Container >
            </Navbar>
            <Modal
                open={loaderModal}
                centered
                footer={null}
                className="text-center website-publish-modal"
                destroyOnClose
                onCancel={() => setLoaderModal(false)}
            // onCancel={null}
            >
                <div className='p-3 web-publish'>
                    {unpublishStatus ? (
                        <>
                            <Button style={{ minWidth: 100, minHeight: 100, backgroundColor: "#19BB7A", border: 'none' }} shape="circle" icon={<i style={{ fontSize: 50 }} className="icon-check text-white"></i>} />
                            <div className="title-hypertension text-welcome mt-4 mb-2">{`Successfully unpublished`}</div>
                            <div className='title-common'>{`Your website has been unpublished successfully.`}</div>

                            <div className='text-start mt-4'>
                                <Space.Compact className='h-45' style={{ width: '100%' }}>
                                    <div className='align-items-center bg-body border d-flex mx-auto px-4 rounded-3'>
                                        <div className='text-danger-custom fw-medium'>
                                            Note:
                                        </div>
                                        <div className='fw-medium ms-2'>
                                            Your live website url has been expired.
                                        </div>
                                    </div>
                                </Space.Compact>
                            </div>

                            <div className="d-flex align-items-center justify-content-center mt-4">
                                <Button
                                    type="text"
                                    className="btn btn-primary3 align-items-center justify-content-center d-flex btn-41 w-50 ms-4"
                                    icon={<i className="icon-right iconrotate180 ms-auto"></i>}
                                    onClick={() => navigate('/doctor_profile', { replace: true, state: { websiteData: { ...websiteData } } })}>
                                    Back to Profile
                                </Button>
                            </div>

                        </>
                    ) : (
                        progress >= 100 ? (
                            <>
                                <Button style={{ minWidth: 100, minHeight: 100, backgroundColor: "#19BB7A", border: 'none' }} shape="circle" icon={<i style={{ fontSize: 50 }} className="icon-check text-white"></i>} />
                                <div className="title-hypertension text-welcome mt-4 mb-2">{`Successfully ${publishUrl ? 'published' : 'processed'}`}</div>
                                <div className='title-common'>{`Your website has been ${publishUrl ? 'published' : 'processed'} successfully.`}</div>

                                {publishUrl ? (
                                    <>
                                        <div className='text-start mt-4'>
                                            <label className='fw-medium mb-1'>Live website URL</label>
                                            <div className="link-box">
                                                <span className="link-text">
                                                    {truncateUrl(publishUrl, 35)}
                                                </span>
                                                <div className="action-buttons-success">
                                                    <button 
                                                        className="share-button" 
                                                        onClick={handleShareUrl}
                                                    >
                                                        <img
                                                            src={ShareIcon}
                                                        />
                                                    </button>
                                                    <button 
                                                        className="copy-button" 
                                                        onClick={handleCopyUrl}
                                                    >
                                                        <img
                                                            src={CopyIcon}
                                                        />
                                                    </button>
                                                    <button 
                                                        className="copy-button" 
                                                        onClick={handleShowQRCode}
                                                    >
                                                        <img
                                                            src={qrIcon}
                                                            alt=""
                                                            style={{ color:"#4b4ad5", filter:"invert(22%) sepia(79%) saturate(2418%) hue-rotate(228deg) brightness(90%) contrast(100%)"}}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="d-flex align-items-center mt-4">
                                            <Button type="text" className="btn btn-primary2 align-items-center justify-content-center d-flex btn-41 w-50"
                                                icon={<i className="icon-New-Window"></i>}
                                                onClick={clickRedirect}>
                                                Live Preview
                                            </Button>
                                            <Button type="text" className="btn btn-primary3 align-items-center justify-content-center d-flex btn-41 w-50 ms-4"
                                                icon={<i className="icon-right iconrotate180 ms-auto"></i>}
                                                onClick={() => navigate('/doctor_profile', { replace: true, state: { websiteData: { ...websiteData } } })}>
                                                Back to Profile
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="d-flex align-items-center mt-4">
                                            <Button
                                                type="text"
                                                className="btn btn-primary2 align-items-center justify-content-center d-flex btn-41 w-50"
                                                onClick={handleDontPublishClick}>
                                                Don't Publish
                                            </Button>
                                            <Button
                                                type="text"
                                                className="btn btn-primary3 align-items-center justify-content-center d-flex btn-41 w-50 ms-4"
                                                loading={publish_loading}
                                                onClick={() => onPublishWebsiteClick(1)}>
                                                Go to publish
                                            </Button>
                                        </div>
                                    </>
                                )}

                            </>
                        ) : (
                            <>
                                <Progress type="circle" format={(number) => ''} percent={progress} size={100} />
                                <div className="title-hypertension text-welcome mt-4 mb-2">Processing Website...</div>
                                <div className='title-common'>Your data is getting saved, please do not refresh the page.</div>
                                {/* <Button className="lh-lg btn btn-clear btn-41 px-4 mt-4" onClick={handleCancelUpload}>
                                    <img className='me-3' src={stopPublishing} alt="Warning" /> <span>Stop Processing</span>
                                </Button> */}
                            </>
                        )
                    )}
                </div>
            </Modal>
            <CommonModal
                isModalOpen={isModalOpen}
                onCancel={showHideModal}
                modalWidth={500}
                title={"Unpublish Website"}
                modalBody={
                    <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                                <img className='me-3' src={alertIcon} alt="Warning" />
                                <span>
                                    Are you sure you want to unpublish your website?
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="d-flex align-items-center mt-2 justify-content-end">
                                <div onClick={() => onPublishWebsiteClick(0)}
                                    className="me-4 text-decoration-underline btn p-0 text-main">
                                    Unpublish
                                </div>
                                <Button onClick={showHideModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                    <span>Keep, Live</span>
                                </Button>
                            </div>
                        </div>
                    </>
                }
            />
            <Drawer closeIcon={false} placement="right" onClose={handleDrawerChild} open={childDrawer} width="100%">

                <Navbar className="justify-content-between headerprescription p-0">
                    <Container fluid className='h-100 gx-0 w-100'>
                        <Row className='h-100 align-items-center w-100 justify-content-between'>
                            <Col sm="auto" className='h-100'>
                                <div className='align-items-center d-flex h-100'>
                                    <div className='border-end h-100 text-center'>
                                        <div onClick={handleDrawerChild} className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                                            <i className='icon-right'></i>
                                        </div>
                                    </div>
                                    <div className='ms-3 title-common'>Back to editor</div>
                                </div>
                            </Col>
                            {/* <Col sm="auto">
                                <Button
                                    type='button'
                                    className="btn-41 btn px-4 btn-primary3 align-items-center d-flex">
                                    <i className="icon-New-Window me-2"></i> Publish Website
                                </Button>
                            </Col> */}
                        </Row>
                    </Container >
                </Navbar>
                <div className="overflow-auto bg-white" style={{ height: 'calc(100vh - 60px)' }}>
                    <Homepage
                        personalDetails={personalDetails}
                        aboutDoctor={aboutDoctor}
                        clinicProfile={clinicProfile}
                        services={services}
                        rewardRecognition={rewardRecognition}
                        educationTraining={educationTraining}
                        doctorExperience={doctorExperience}
                        membership={membership}
                        otherSettings={otherSettings}
                        socialLinks={socialLinks}
                    />
                </div>
            </Drawer>
            <Drawer closeIcon={false} placement="right" onClose={handleDrawerChild1} open={childDrawer1} width="100%">
                <Navbar className="justify-content-between headerprescription p-0">
                    <Container fluid className='h-100 gx-0 w-100'>
                        <div className='align-items-center d-flex h-100'>
                            <div className='border-end h-100 text-center'>
                                <div onClick={handleDrawerChild1} className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                                    <i className='icon-right'></i>
                                </div>
                            </div>
                            <div className='ms-3 title-common'>Live Reference Demo</div>
                        </div>
                    </Container >
                </Navbar>
                <div className='w-100 px-3 py-2 fontroboto d-flex align-items-center' style={{ backgroundColor: '#FFE8AE' }}>
                    <i className='icon-info fs-18 me-3'></i> This is a demonstration website with sample data to show how it will look once you fill it.
                </div>
                <div className="overflow-auto bg-white" style={{ height: 'calc(100vh - 97px)' }}>
                    <Homepage
                        personalDetails={{
                            "first_name": "Dr. Kunal Shah",
                            "last_name": "",
                            "specialty": "Anaesthesiology",
                            "education": "MBBS, MD",
                            "email_id": "contact@aayushyamclinic.com",
                            "hero_image_name": "profile_pic_1713329446.jpg",
                            "hero_image_thumb_link": "",
                            "hero_image_link": "",
                        }}
                        aboutDoctor={{
                            "years_experience": "12",
                            "language": [
                                "English",
                                "Hindi"
                            ],
                            "about": "Dr. Kunal Jhaveri is a Spine and Pain Specialist, Pain Management Specialist and Nerve Pain Specialist in Satellite Road, Ahmedabad and has an experience of 6 years in these fields. Dr. Kunal Shah practices at Karnavati Pain Clinic in Satellite Dr. Kunal Shah practices at Karnavati Pain Clinic in Satellite"
                        }}
                        clinicProfile={[
                            {
                                "random_id": 7398049865,
                                "name": "Aayushyam Clinic Centre LLP",
                                "contact_no": "Call Clinic",
                                "address": {
                                    "pincode": "380015",
                                    "city": "Ahmadabad",
                                    "state": "Gujarat",
                                    "address_line": "Ground Floor, Sheetal Varsha Complex, Landmark: Near Shivranjani Cross Road",
                                    "google_map": "wqe qe"
                                },
                                "shift": [
                                    {
                                        "days": [
                                            "mon",
                                            'tue',
                                            'wed',
                                            'thu',
                                            'fri',
                                            "sat"
                                        ],
                                        "timing": [
                                            {
                                                "from_time": "09:00",
                                                "end_time": "04:45"
                                            }
                                        ],
                                        "timing": [
                                            {
                                                "from_time": "05:30",
                                                "end_time": "07:00"
                                            }
                                        ]
                                    },
                                    {
                                        "days": [
                                            "sun"
                                        ],
                                        "timing": [
                                            {
                                                "from_time": "09:00",
                                                "end_time": "01:00"
                                            }
                                        ]
                                    }
                                ],
                                "clinic_photos": [
                                    {
                                        "clinic_image_id": 9752048460,
                                        "clinic_image_name": "f523fb8d-e9a3-4b43-a61c-e19c5e162ef6.png",
                                        "clinic_image_thumb_name": "thumb_f523fb8d-e9a3-4b43-a61c-e19c5e162ef6.png",
                                        "clinic_image_delete": 0,
                                        "clinic_image_thumb_link": "https://media.istockphoto.com/id/1315141049/photo/innovative-technology-in-a-modern-hospital-operating-room-futuristic-medical-interface.jpg?s=612x612&w=0&k=20&c=_Xd8yzWHctije-bdTd_FApLlpN4M-i2PrKG55vT20J8=",
                                        "clinic_image_link": "https://media.istockphoto.com/id/1315141049/photo/innovative-technology-in-a-modern-hospital-operating-room-futuristic-medical-interface.jpg?s=612x612&w=0&k=20&c=_Xd8yzWHctije-bdTd_FApLlpN4M-i2PrKG55vT20J8="
                                    },
                                    {
                                        "clinic_image_id": 4468370316,
                                        "clinic_image_name": "6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_thumb_name": "thumb_6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_delete": 0,
                                        "clinic_image_thumb_link": "https://static.toiimg.com/thumb/msid-100889909,width-1280,height-720,resizemode-72/100889909.jpg",
                                        "clinic_image_link": "https://static.toiimg.com/thumb/msid-100889909,width-1280,height-720,resizemode-72/100889909.jpg"
                                    },
                                    {
                                        "clinic_image_id": 4468370316,
                                        "clinic_image_name": "6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_thumb_name": "thumb_6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_delete": 0,
                                        "clinic_image_thumb_link": "https://img.freepik.com/free-photo/young-man-being-ill-hospital-bed_23-2149017252.jpg",
                                        "clinic_image_link": "https://img.freepik.com/free-photo/young-man-being-ill-hospital-bed_23-2149017252.jpg"
                                    },
                                    {
                                        "clinic_image_id": 4468370316,
                                        "clinic_image_name": "6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_thumb_name": "thumb_6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_delete": 0,
                                        "clinic_image_thumb_link": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Hospital-de-Bellvitge.jpg/640px-Hospital-de-Bellvitge.jpg",
                                        "clinic_image_link": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Hospital-de-Bellvitge.jpg/640px-Hospital-de-Bellvitge.jpg"
                                    }
                                ],
                                "clinic_delete": 0
                            },
                            {
                                "random_id": 7398049865,
                                "name": "Akshar Clinic",
                                "contact_no": "Call Clinic",
                                "address": {
                                    "pincode": "380015",
                                    "city": "Ahmadabad",
                                    "state": "Gujarat",
                                    "address_line": "Ground Floor, Sheetal Varsha Complex, Landmark: Near Shivranjani Cross Road",
                                    "google_map": "wqe qe"
                                },
                                "shift": [
                                    {
                                        "days": [
                                            "mon",
                                            'tue',
                                            'wed',
                                            'thu',
                                            'fri',
                                            "sat"
                                        ],
                                        "timing": [
                                            {
                                                "from_time": "09:00",
                                                "end_time": "04:45"
                                            }
                                        ],
                                        "timing": [
                                            {
                                                "from_time": "05:30",
                                                "end_time": "07:00"
                                            }
                                        ]
                                    },
                                    {
                                        "days": [
                                            "sun"
                                        ],
                                        "timing": [
                                            {
                                                "from_time": "09:00",
                                                "end_time": "01:00"
                                            }
                                        ]
                                    }
                                ],
                                "clinic_photos": [
                                    {
                                        "clinic_image_id": 9752048460,
                                        "clinic_image_name": "f523fb8d-e9a3-4b43-a61c-e19c5e162ef6.png",
                                        "clinic_image_thumb_name": "thumb_f523fb8d-e9a3-4b43-a61c-e19c5e162ef6.png",
                                        "clinic_image_delete": 0,
                                        "clinic_image_thumb_link": "https://media.istockphoto.com/id/1315141049/photo/innovative-technology-in-a-modern-hospital-operating-room-futuristic-medical-interface.jpg?s=612x612&w=0&k=20&c=_Xd8yzWHctije-bdTd_FApLlpN4M-i2PrKG55vT20J8=",
                                        "clinic_image_link": "https://media.istockphoto.com/id/1315141049/photo/innovative-technology-in-a-modern-hospital-operating-room-futuristic-medical-interface.jpg?s=612x612&w=0&k=20&c=_Xd8yzWHctije-bdTd_FApLlpN4M-i2PrKG55vT20J8="
                                    },
                                    {
                                        "clinic_image_id": 4468370316,
                                        "clinic_image_name": "6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_thumb_name": "thumb_6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_delete": 0,
                                        "clinic_image_thumb_link": "https://static.toiimg.com/thumb/msid-100889909,width-1280,height-720,resizemode-72/100889909.jpg",
                                        "clinic_image_link": "https://static.toiimg.com/thumb/msid-100889909,width-1280,height-720,resizemode-72/100889909.jpg"
                                    },
                                    {
                                        "clinic_image_id": 4468370316,
                                        "clinic_image_name": "6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_thumb_name": "thumb_6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_delete": 0,
                                        "clinic_image_thumb_link": "https://img.freepik.com/free-photo/young-man-being-ill-hospital-bed_23-2149017252.jpg",
                                        "clinic_image_link": "https://img.freepik.com/free-photo/young-man-being-ill-hospital-bed_23-2149017252.jpg"
                                    },
                                    {
                                        "clinic_image_id": 4468370316,
                                        "clinic_image_name": "6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_thumb_name": "thumb_6cad3eee-83f0-4365-a6e6-86a292911c56.png",
                                        "clinic_image_delete": 0,
                                        "clinic_image_thumb_link": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Hospital-de-Bellvitge.jpg/640px-Hospital-de-Bellvitge.jpg",
                                        "clinic_image_link": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Hospital-de-Bellvitge.jpg/640px-Hospital-de-Bellvitge.jpg"
                                    }
                                ],
                                "clinic_delete": 0
                            },
                        ]}
                        services={[
                            {
                                "title": "Back Pain Treatment"
                            },
                            {
                                "title": "Musculoskeletal Pain Management"
                            },
                            {
                                "title": "RF Neurotomy"
                            },
                            {
                                "title": "Interventional Pain management"
                            },
                            {
                                "title": "Cancer Pain Management"
                            },
                            {
                                "title": "Knee Pain Treatment"
                            },
                            {
                                "title": "Hand Pain Treatment"
                            },
                            {
                                "title": "Joint Pain Treatment"
                            }
                        ]}
                        rewardRecognition={[
                            {
                                "title": "Chairman's Award from Max Healthcare",
                                "year": "2019"
                            },
                            {
                                "title": "Role of HEV infection in sporadic NANB hepatitis cases",
                                "year": "2016"
                            },
                            {
                                "title": "First Position in Pathology",
                                "year": "2002"
                            },
                            {
                                "title": "First Position in Pathology",
                                "year": "2002"
                            }
                        ]}
                        educationTraining={[
                            {
                                "title": "National Board of Examinations",
                                "degree": "MBBS",
                                "city": "Mumbai",
                                "start_year": "2018",
                                "end_year": "2020"
                            },
                            {
                                "title": "B J Medical College Ahmedabad",
                                "degree": "MD",
                                "city": "Ahmedabad",
                                "start_year": "2015",
                                "end_year": "2018"
                            },
                            {
                                "title": "B J Medical College Ahmedabad",
                                "degree": "MBBS",
                                "city": "Ahmedabad",
                                "start_year": "2011",
                                "end_year": "2014"
                            },
                            {
                                "title": "B J Medical College Ahmedabad",
                                "degree": "MBBS",
                                "city": "Ahmedabad",
                                "start_year": "2011",
                                "end_year": "2014"
                            }
                        ]}
                        doctorExperience={[
                            {
                                "title": "Director of Max Super Specialty",
                                "hospital": "Siloam Hospitals",
                                "city": "Ahmedabad",
                                "currently_working": 1,
                                "start_month": "Oct",
                                "start_year": "2017",
                                "end_month": "May",
                                "end_year": "2021"
                            },
                            {
                                "title": "Sr. Registrar of Ministry of Health",
                                "hospital": "Mitra Keluarga",
                                "city": "Mumbai",
                                "currently_working": 0,
                                "start_month": "Jan",
                                "start_year": "2016",
                                "end_month": "Sep",
                                "end_year": "2017"
                            },
                            {
                                "title": "Sr. Registrar of Ministry of Health",
                                "hospital": "Mitra Keluarga",
                                "city": "Mumbai",
                                "currently_working": 0,
                                "start_month": "Jan",
                                "start_year": "2016",
                                "end_month": "Sep",
                                "end_year": "2017"
                            }
                        ]}
                        membership={[
                            {
                                "title": "Member of the Royal College of Physicians, London, UK"
                            },
                            {
                                "title": "Member of National Academy of Medical Sciences (MNAMS), India"
                            },
                            {
                                "title": "Member of the Royal College of Physicians, London, UK"
                            },
                            {
                                "title": "Member of National Academy of Medical Sciences (MNAMS), India"
                            }
                        ]}
                        otherSettings={{
                            "enable_doctor_experience": 1,
                            "enable_services": 1,
                            "enable_education_training": 1,
                            "enable_membership": 1,
                            "enable_reward_recognition": 1,
                            "enable_social_links": 1
                        }}
                        socialLinks={{
                            "facebook": " ",
                            "instagram": " ",
                            "linkedin": " ",
                            "twitter": " ",
                            "youtube": " "
                        }}
                    />
                </div>
            </Drawer>
            <QrPrintDownloadModal
                open={!!isQRCodeVisible && !!publishUrl}
                onClose={showHideQRModal}
                contentRef={printRef}
                title="Doctor Website URL"
                byName={`${personalDetails?.first_name || ""} ${personalDetails?.last_name || ""}`.trim()}
                logoSrc={logoIcom}
                qrValue={publishUrl}
                qrSize={180}
                scanText="Scan the above QR to visit the website"
                onPrint={handlePrint}
                onDownload={handleDownload}
                className="opd-plan-qr"
            />
        </>
    );
}

export default React.memo(HeaderDoctorWebsite);
