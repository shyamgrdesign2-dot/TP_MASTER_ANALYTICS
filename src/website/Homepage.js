import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button, Col, Row, Modal, Tooltip, Image } from "antd";
import { useNavigate } from "react-router-dom";

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import "../styles/website-custom.scss";

import Slider from "react-slick";
import moment from "moment";

import { errorMessage, handleCopy, isValidMap, isValidWebsite, validateEmail } from '../utils/utils';
import { isMobile, isChrome, isSafari } from 'react-device-detect';
import { ASSETS } from "../assets";
const LocationClinic = ASSETS.images.websiteImages.locationClinic;
const Location = ASSETS.images.websiteImages.location;
const locationGrey = ASSETS.images.websiteImages.locationGrey;
const Mail = ASSETS.images.websiteImages.mail;
const Plus = ASSETS.images.websiteImages.plus;
const Minus = ASSETS.images.websiteImages.minus;
const BAPhoto = ASSETS.images.websiteImages.bookAppointmentPhoto;
const Direction = ASSETS.images.websiteImages.direction;
const Call = ASSETS.images.websiteImages.call;
const Clock = ASSETS.images.websiteImages.clock;
const CheckIcon = ASSETS.images.websiteImages.check;
const AboutIcon = ASSETS.images.websiteImages.aboutIcon;
const ClinicIcon = ASSETS.images.websiteImages.clinicIcon;
const EducationIcon = ASSETS.images.websiteImages.educationIcon;
const ServicecIcon = ASSETS.images.websiteImages.serviceIcon;
const rewardsIcon = ASSETS.images.websiteImages.rewardsIcon;
const ExperienceIcon = ASSETS.images.websiteImages.experienceIcon;
const experianceSlideBottomRound = ASSETS.images.websiteImages.experianceSlideBottomRound;
const HospitalIcon = ASSETS.images.websiteImages.hospitalIcon;
const AboutImg = ASSETS.images.websiteImages.aboutImg;
const MembershipsIcon = ASSETS.images.websiteImages.membership;
const MembershipsImg = ASSETS.images.websiteImages.membershipImg;
const membershipSlide = ASSETS.images.websiteImages.membershipSlide;
const DoctorProfile = ASSETS.images.websiteImages.doctorImg;
const DoctorDefault = ASSETS.images.websiteImages.doctorDefault;
const avatarDoctor = ASSETS.images.websiteImages.avatarDoctor;
const websiteLogo = ASSETS.images.websiteImages.logo;
const MenuImg = ASSETS.images.websiteImages.menu;
const websiteFacebook = ASSETS.images.websiteImages.websiteFacebook;
const websiteInstagram = ASSETS.images.websiteImages.websiteInstagram;
const websiteLinkedin = ASSETS.images.websiteImages.websiteLinkedin;
const websiteTwitter = ASSETS.images.websiteImages.websiteTwitter;
const websiteYoutube = ASSETS.images.websiteImages.websiteYoutube;

const slideData = [1, 2, 3, 4]
const dateFormat = 'HH:mm:ss'
const showDateFormat = 'h:mm A'

function Homepage({ centerPadding, scrollId, personalDetails, aboutDoctor, clinicProfile, services, rewardRecognition, educationTraining, doctorExperience, membership, otherSettings, socialLinks }) {

  const navigate = useNavigate();

  const personalSectionRef = useRef(null);
  const aboutSectionRef = useRef(null);
  const clinicSectionRef = useRef(null);
  const servicesSectionRef = useRef(null);
  const experienceSectionRef = useRef(null);
  const educationSectionRef = useRef(null);
  const membershipSectionRef = useRef(null);
  const awardsSectionRef = useRef(null);
  const socialSectionRef = useRef(null);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNavbar, setShowNavbar] = React.useState(false);

  // Read More content
  const ReadMore = ({ children }) => {
    const text = children;
    const [isReadMore, setIsReadMore] = useState(true);
    const toggleReadMore = () => {
      setIsReadMore(!isReadMore);
    };
    return (
      <>
        <div className="mb-2">
          {text.length > 285 ? isReadMore ? `${text.slice(0, 285)}...` : text : text}
        </div>
        {text.length > 285 && (
          <div onClick={toggleReadMore} className="title-common text-primary cursor-pointer d-inline">
            {isReadMore ? (
              <img width={20} height={20} src={Plus} alt="Read More" />
            ) : (
              <img width={20} height={20} src={Minus} alt="Read More" />
            )}
            {isReadMore ? 'Read More' : 'View Less'}
          </div>
        )}
      </>
    );
  };

  const [arrow, setArrow] = useState('Show');
  const mergedArrow = useMemo(() => {
    if (arrow === 'Hide') {
      return false;
    }
    if (arrow === 'Show') {
      return true;
    }
    return {
      pointAtCenter: true,
    };
  }, [arrow]);

  const scrollToSection = (scrollId) => {
    try {
      if (scrollId == 1) {
        personalSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowNavbar(false);
      } else if (scrollId == 2) {
        aboutSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowNavbar(false);
      } else if (scrollId == 3) {
        clinicSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowNavbar(false);
      } else if (scrollId == 4) {
        experienceSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowNavbar(false);
      } else if (scrollId == 5) {
        servicesSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowNavbar(false);
      } else if (scrollId == 6) {
        educationSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowNavbar(false);
      } else if (scrollId == 7) {
        membershipSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowNavbar(false);
      } else if (scrollId == 8) {
        awardsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowNavbar(false);
      } else if (scrollId == 9) {
        socialSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowNavbar(false);
      }
    } catch (e) {
      console.log(e)
    }
  };

  useEffect(() => {
    scrollToSection(scrollId)
  }, [scrollId]);

  const settings = {
    className: "center",
    centerMode: true,
    infinite: false,
    centerPadding: centerPadding ? `${window.innerWidth / 30}px` : `${window.innerWidth / 10}px`,
    arrows: false,
    speed: 500,
    dots: true,
    arrows: false,
    adaptiveHeight: true,
    afterChange: (current) => setCurrentSlide(current),
    autoplay: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          // centerMode: false,
        }
      },
      {
        breakpoint: 600,
        settings: {
          // centerMode: false,
        }
      },
    ]
  };

  const commonSettings = {
    infinite: false,
    speed: 500,
    dots: false,
    adaptiveHeight: true,
    afterChange: (current) => setCurrentSlide(current),
    autoplay: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
        }
      },
    ]
  };

  const settingsAppointment = {
    infinite: false,
    slidesToShow: 1,
    dots: false,
    adaptiveHeight: true,
    afterChange: (current) => setCurrentSlide(current),
    autoplay: false,
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const formatDays = (selectedDays) => {

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    let ranges = [];
    let start = null;

    for (let i = 0; i < selectedDays.length; i++) {
      if (start === null) {
        start = selectedDays[i];
      }
      if (i === selectedDays.length - 1 || days.indexOf(selectedDays[i + 1]) !== days.indexOf(selectedDays[i]) + 1) {
        if (start !== selectedDays[i]) {
          ranges.push(`${start} - ${selectedDays[i]}`);
        } else {
          ranges.push(start);
        }
        start = null;
      }
    }
    return ranges.join(', ');
  };

  const handleShowNavbar = () => {
    setShowNavbar(!showNavbar);
  };

  const clickRedirect = async (link, account) => {
    if (!isChrome && !isSafari) {
      handleCopy(link, `The ${account} link has been copied. Please paste it into the browser to view the location. Your patient will be able to access this page smoothly once you 'Save and Publish' this.`)
    } else {
      await window.open(link)
    }
  }

  return (
    <div className="website-wrapper">
      {/* Header Section */}
      <div className="container-fluid mt-14" style={{ position: 'sticky', top: 14, zIndex: 9 }}>
        <div className={`website-section website-header ${showNavbar && "website-header-responsive"}`}>
          <nav className="navbar">
            <div className='d-flex align-items-center justify-content-between w-100'>
              <div className="logo">
                <img src={websiteLogo} width={151.29} height={34} alt="Logo" />
              </div>
              <div className="menu-icon" onClick={handleShowNavbar}>
                <img width={34} height={34} src={MenuImg} alt="Doctor Website Navbar" />
              </div>
              <div className={`nav-elements d-lg-flex w-100 ${showNavbar && "active text-center"}`}>
                <ul className='mb-0 mt-4 mt-lg-0 p-0 w-100'>
                  <li>
                    <a className='cursor-pointer' onClick={() => scrollToSection(2)}>About</a>
                  </li>
                  <li>
                    <a className='cursor-pointer' onClick={() => scrollToSection(3)}>Clinic</a>
                  </li>
                  {otherSettings?.enable_services ? (
                    <li>
                      <a className='cursor-pointer' onClick={() => scrollToSection(5)}>Services</a>
                    </li>
                  ) : null}
                  {otherSettings?.enable_doctor_experience ? (
                    <li>
                      <a className='cursor-pointer' onClick={() => scrollToSection(4)}>Experience</a>
                    </li>
                  ) : null}
                  {otherSettings?.enable_education_training ? (
                    <li>
                      <a className='cursor-pointer' onClick={() => scrollToSection(6)}>Education</a>
                    </li>
                  ) : null}
                  {otherSettings?.enable_membership ? (
                    <li>
                      <a className='cursor-pointer' onClick={() => scrollToSection(7)}>Membership</a>
                    </li>
                  ) : null}
                  {otherSettings?.enable_reward_recognition ? (
                    <li>
                      <a className='cursor-pointer' onClick={() => scrollToSection(8)}>Awards</a>
                    </li>
                  ) : null}
                </ul>
                <Button type="button" onClick={showModal} className="btn btn-primary3 btn-48 rounded-18 mx-lg-3 mt-5 mt-lg-0 btn-width-mobile">
                  Book Appointment
                </Button>
              </div>
            </div>
          </nav>
        </div>
      </div>

      <div className='outer-round-big'>

        {/* Banner Section */}
        <div ref={personalSectionRef} className="website-section website-banner">
          <div className="container">
            <Row className='row-80'>
              <Col sm={24} lg={12} className='w-100'>
                <div className="hi text-welcome">Hi, I'm</div>
                <h1 className="doctor-name mb-20 web-h1 text-welcome">{`${personalDetails?.first_name} ${personalDetails?.last_name}`}</h1>
                <div className="education-speciality mb-15 text-welcome">{`${personalDetails?.education} - ${personalDetails?.specialty}`}</div>
                <div className="d-flex flex-wrap gmaildiv-wrap mb-lg-5 mb-28">
                  {/* <div className="location-contact text-welcome mb-2"> <img src={Location} width={18} height={18} alt="Location" /> Ahmedabad</div> */}
                  {personalDetails?.email_id && validateEmail(personalDetails?.email_id) && (
                    <div className="location-contact text-welcome"> <img src={Mail} width={18} height={18} alt="Location" />
                      <a href={`mailto:${personalDetails?.email_id}`} className='text-main'>{personalDetails?.email_id}</a>
                    </div>
                  )}
                </div>
                <Button type="button" onClick={showModal} className="btn btn-primary3 btn-48 rounded-18 btn-width-mobile">
                  Book Appointment
                </Button>
              </Col>
              <Col sm={24} lg={12} className='mx-auto'>
                <div className='round-pink'></div>
                <div className='doctor-photo'>
                  <img fill src={personalDetails?.hero_image_link ? personalDetails?.hero_image_link : DoctorDefault} alt="Doctor Profile" style={{
                    objectFit: personalDetails?.hero_image_link ? 'cover' : 'scale-down',
                    position: 'absolute', height: '100%', width: '100%', inset: 0, color: 'transparent'
                  }} />
                </div>
                <div className='square-yellow'></div>
              </Col>
            </Row>
          </div>
        </div>

        {/* About Section */}
        <div ref={aboutSectionRef} className="website-section website-about">
          <div className="container">
            <Row className='row-80 align-items-start'>
              <Col lg={{ order: 2, span: 12 }}>
                <div className='bg-icon-common mb-20'>
                  <img width={28} height={28} src={AboutIcon} alt="Doctor Profile" />
                </div>
                <h2 className="doctor-name h1 web-h1 text-welcome mb-28">About The Doctor</h2>
                <div className='d-flex align-items-center mb-28'>
                  {aboutDoctor?.years_experience && (
                    <div className='about-after ps-3 me-5'>
                      <div className='fs-18 text-welcome fw-medium'>{`${aboutDoctor?.years_experience} Years`}</div>
                      <div>Overall Experience</div>
                    </div>
                  )}
                  {aboutDoctor?.language && aboutDoctor?.language?.length > 0 && (
                    <div className='about-after ps-3'>
                      <div className='d-flex'>
                        <div className='fs-18 text-welcome fw-medium'>
                          {aboutDoctor?.language?.slice(0, 2).join(', ')}
                        </div>
                        <div>
                          {aboutDoctor?.language?.length > 2 && (
                            <Tooltip placement="top"
                              title={aboutDoctor?.language.slice(2).join(' , ')}
                              arrow={mergedArrow}>
                              <div className="ms-2 text-primary px-2 py-1 rounded-5 fw-medium" style={{ backgroundColor: 'rgba(75, 74, 213, 0.10)' }}>{`${aboutDoctor?.language?.length - 2}+`}</div>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      <div>Languages</div>
                    </div>
                  )}
                </div>
                {aboutDoctor?.about && (
                  <>
                    <ReadMore className="title-common">
                      {aboutDoctor?.about}
                    </ReadMore>
                  </>
                )}
              </Col>
              <Col sm={24} lg={12} className='mt-5 mt-lg-0'>
                <img width={413.754} height={482.575} src={AboutImg} className='img-fluid' alt="About The Doctor" />
              </Col>
            </Row>
          </div>
        </div>

      </div>

      {/* Clinic Section */}
      {clinicProfile?.filter(el => !el.clinic_delete)?.length > 0 ? (
        <div ref={clinicSectionRef} className="website-section website-clinic">
          <div className='text-center'>
            <div className='bg-icon-common mx-auto mb-20'>
              <img width={28} height={28} src={ClinicIcon} alt="Clinic Address & Hours" />
            </div>
            <h3 className="doctor-name h1 web-h1 text-welcome mb-lg-5 mb-28">Clinic Address & Hours</h3>
          </div>
          {/* <div className="container-lg p-0"> */}
          <div className="slider-container">
            <Slider
              {...settings}
              slidesToShow={1}
              arrows={false}
              className='clinic-slider'>
              {clinicProfile?.filter(el => !el.clinic_delete)?.map((e, i) => {
                return (
                  <div key={Math.random()} className='clinic-box'>
                    <Row justify="space-between">
                      <Col sm={24} lg={12}>
                        <div className='py-lg-4 py-3'>
                          {e?.name && (
                            <div className='d-flex align-items-center'>
                              <div className='bg-icon-common bg-icon-white'><img width={28} height={28} src={LocationClinic} alt="Clinic Address & Hours" /></div>
                              <div className='ms-3 title-hypertension text-white'>{e?.name}</div>
                            </div>
                          )}
                        </div>
                        <div className='d-flex flex-column h-75 justify-content-between'>
                          <div>
                            {(e?.address.address_line || e?.address.city || e?.address.state || e?.address.pincode || e?.clinic_photos?.length > 0) ? (
                              <>
                                <div className='clinic-address'>{`${Object.values(Object.fromEntries(Object.entries((({ address_line, city, state, pincode }) => ({ address_line, city, state, pincode }))(e?.address)).filter(([_, v]) => v))).join(', ')}`}</div>
                                <div className='d-flex my-4'>

                                  <Image.PreviewGroup
                                    preview={{
                                      // visible,
                                      closeIcon: <Button className='btn btn-41 px-4 btn-primary3 mx-0 imageclose-btn'>Close</Button>,
                                      toolbarRender: () => null,
                                      countRender: () => null,
                                      imageRender: (originalNode, info) => (
                                        <div className='d-block'>
                                          <div className='d-flex align-items-center justify-content-between preview-header'>
                                            <div className='text-white fs-16 fw-medium ms-4'>Clinic Photos</div>
                                            {/* <div className='d-flex align-items-center'>
                                              <Button onClick={showHide} className='btn btn-41 px-4 btn-primary3 mx-3'>Close</Button>
                                            </div> */}
                                          </div>
                                          <img src={originalNode.props.src} style={{ maxWidth: 600 }} />
                                        </div>
                                      )
                                    }}
                                  >
                                    {e?.clinic_photos && e?.clinic_photos?.filter(el => !el?.clinic_image_delete)?.map((item, index) => {
                                      return (
                                        <div key={index} className='clinic-photo' style={{ display: index > 2 ? 'none' : 'block' }}>
                                          <Image width={60} height={60} className='img-fluid h-100' src={item?.clinic_image_link} alt={item?.clinic_image_name} />
                                        </div>
                                      )
                                    })}
                                  </Image.PreviewGroup>

                                  {/* {e?.clinic_photos && e?.clinic_photos?.filter(el => !el?.clinic_image_delete)?.slice(0, 3)?.map((item, index) => {
                                    return (
                                      <div key={index} className='clinic-photo'>
                                        <img width={60} height={60} className='img-fluid h-100' src={item?.clinic_image_link} alt={item?.clinic_image_name} />
                                      </div>
                                    )
                                  })} */}
                                  {e?.clinic_photos && e?.clinic_photos?.filter(el => !el?.clinic_image_delete)?.length > 3 && (
                                    <div className='clinic-photo d-flex align-items-center justify-content-center'>
                                      <div className='title-common text-white'>{`${e?.clinic_photos?.filter(el => !el.clinic_image_delete)?.length - 3}+`}</div>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className='clinic-address'>{'No Address Details & Photos'}</div>
                            )}
                          </div>
                          <div className={`d-flex flex-wrap clinic-btn ${e?.shift?.length > 0 ? 'mb-4' : 'mb-5'}`}>
                            {e?.address?.google_map && (
                              <Button type="button" onClick={() => isValidMap(e?.address?.google_map) ? clickRedirect(e?.address?.google_map, 'map') : clickRedirect(`https://www.google.com/maps/search/${e?.address?.google_map}`, 'map')} className="btn btn-primary3 btn-48">
                                <img width={19} height={19} className='me-2' src={Direction} alt="Direction" /> Direction to Clinic
                              </Button>
                            )}
                            {e?.contact_no && !isMobile ? (
                              <Button type="button" className="btn btn-primary3 btn-48 rounded-18">
                                <a className='text-white d-flex align-items-center'><img width={19} height={19} src={Call} className='me-2' alt="Call" />{` ${e?.contact_no}`}</a>
                              </Button>
                            ) : (
                              <Button type="button" onClick={() => window.location.href = (`tel:${e?.contact_no}`)} className="btn btn-primary3 btn-48 rounded-18">
                                <a className='text-white d-flex align-items-center'><img width={19} height={19} src={Call} className='me-2' alt="Call" />{` ${e?.contact_no}`}</a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </Col>
                      <Col sm={24} lg={12}>
                        {e?.shift?.length > 0 && (
                          <div className="me-lg-0 mx-auto timingshape">

                            <div className='p-30'>
                              <div className='d-flex align-items-center justify-content-between'>
                                <div className='title-hypertension fw-medium text-welcome'>Timings</div>
                                <div className='bg-icon-common bg-icon-white'><img width={28} height={28} src={Clock} alt="Clinic Address & Hours" /></div>
                              </div>
                              {e?.shift?.map((e1, i1) => (
                                <div key={i1} className='mt-4'>
                                  {e1?.days?.length > 0 && e1?.timing?.length && (
                                    <>
                                      <div className='text-welcome fw-medium fs-16 text-capitalize'>{formatDays(e1.days)}</div>

                                      {e1?.timing?.map((e2, i2) => (
                                        <div key={i2} className='text-welcome fs-16'>
                                          {`${e2?.from_time && e2?.end_time ? moment(e2?.from_time, dateFormat).format(showDateFormat) + ' - ' + moment(e2?.end_time, dateFormat).format(showDateFormat) : ''}`}
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              ))}
                              {e?.shift?.filter(el => el?.days?.length > 0)?.length === 0 && (<div>No Timings details</div>)}
                            </div>
                          </div>
                        )}
                        <p className='slide-count'><span>{String(i + 1).padStart(2, "0")}/{String(clinicProfile?.filter(el => !el.clinic_delete)?.length).padStart(2, "0")}</span></p>
                      </Col>
                    </Row>
                  </div>
                )
              })}
            </Slider>
          </div>
          {/* </div> */}
        </div>
      ) : null}

      {/* Service Section */}
      {otherSettings?.enable_services ? (
        <div ref={servicesSectionRef} className="website-section mt-2 mt-lg-5">
          <div className="container">
            <div className='row-80'>
              <div className='text-center border bg-body p-lg-5 p-2' style={{ borderRadius: 40 }}>
                <div className='bg-icon-common mx-auto mb-20'>
                  <img width={28} height={28} src={ServicecIcon} alt="Our Services" />
                </div>
                <h3 className="doctor-name h1 web-h1 text-welcome mb-lg-5 mb-28">Our Services</h3>
                {services?.filter(el => el.title)?.length > 0 ? (
                  <Row >
                    {services?.filter(el => el.title)?.map((e, i) => {
                      return (
                        <Col key={i} sm={24} lg={services?.filter(el => el.title)?.length == 1 ? 24 : 12}>
                          {e?.title && (
                            <div className={`d-flex ${services?.filter(el => el.title)?.length == 1 && 'justify-content-center'} align-items-center text-welcome text-start fs-16 p-14`}> <div className='bg-icon-common bg-icon-sm me-3'><img width={18} height={18} src={CheckIcon} alt="Our Services" /></div> {e?.title}</div>
                          )}
                        </Col>
                      )
                    })}
                  </Row>
                ) : 'No any services added'}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Doctor Experience Section */}
      {doctorExperience?.length > 0 && otherSettings?.enable_doctor_experience ? (
        <div ref={experienceSectionRef} className="website-section website-clinic website-experience">
          <div className="container">
            <Row className='row-80 align-items-start'>
              <Col sm={24} lg={8}>
                <div className='bg-icon-common mb-20'>
                  <img width={28} height={28} src={ExperienceIcon} alt="Doctor Experience" />
                </div>
                <h2 className="doctor-name h1 web-h1 text-welcome">Doctor Experience</h2>
                {doctorExperience?.length > 2 && (
                  <div className='py-5 mt-lg-5 mt-0'>
                    <p className='slide-count'><span>{String(currentSlide + 1).padStart(2, "0")} - {String(doctorExperience?.length).padStart(2, "0")}</span></p>
                  </div>
                )}
              </Col>
              <Col sm={24} lg={16}>
                <Slider  {...commonSettings}
                  slidesToShow={doctorExperience?.length <= 2 ? doctorExperience?.length : 2}
                  arrows={doctorExperience?.length >= 3 ? true : false}
                  className='clinic-slider'>
                  {doctorExperience?.map((e, i) => {
                    return (
                      <div key={i}>
                        <div className='position-relative'>
                          <div className='border-shape-right'></div>
                          <div className='border-shape-bottom'></div>
                          <div className="timingshape">
                            <div className='h-100 d-flex flex-column justify-content-between p-30'>
                              {(!e?.title && !e?.hospital && !e?.city && (!e?.start_month || !e?.start_year) && (!e?.end_month || !e?.end_year)) && 'No details added'}
                              <div>
                                {e?.currently_working ? (
                                  e?.start_month && e?.start_year && (
                                    <div>{`${moment(e?.start_month).format('MMM') + ' ' + moment(e?.start_year).format('YYYY')}`}</div>
                                  )
                                ) : (
                                  <div>{`${e?.start_month && e?.start_year && moment(e?.start_month).format('MMM') + ' ' + moment(e?.start_year).format('YYYY')}${e?.start_month && e?.start_year && e?.end_month && e?.end_year && ' - '}${e?.end_month && e?.end_year && moment(e?.end_month).format('MMM') + ' ' + moment(e?.end_year).format('YYYY')}`}</div>
                                )}
                                <div className='fw-medium text-welcome title-hypertension mt-3'>{e?.title}</div>
                              </div>
                              <div>
                                {e?.hospital && (
                                  <>
                                    <div className='bg-icon-common'>
                                      <img width={20} height={20} src={HospitalIcon} alt="Hospital Icon" />
                                    </div>
                                    <div className='text-welcome fw-medium fs-16 mt-2'>{e?.hospital}</div>
                                  </>
                                )}
                                {e?.city && (
                                  <div className="text-welcome d-flex align-items-center"> <img src={locationGrey} className='me-2' width={18} height={18} alt="Location" />{e?.city}</div>
                                )}
                              </div>
                            </div>
                            <div className={`round-shape-top-education ${i % 2 === 1 && 'round-education-pink'}`}></div>
                            <div className='shape-education'></div>
                          </div>
                        </div>
                        <img width={34.825} height={67.992} className='round-experience-shape' src={experianceSlideBottomRound} alt="Experience Round" />
                      </div>
                    )
                  })}
                </Slider>
              </Col>
            </Row>
          </div>
        </div>
      ) : null}

      {/* Education & Training */}
      {educationTraining?.length > 0 && otherSettings?.enable_education_training ? (
        <div ref={educationSectionRef} className="website-section website-clinic website-education">
          <div className="container p-0">
            <div className='row-80'>
              <div className="slider-container">
                <div className='clinic-box'>
                  <div className='py-lg-5 py-3'>
                    <div className='text-center'>
                      <div className='bg-icon-common mx-auto mb-20'>
                        <img width={28} height={28} src={EducationIcon} alt="Clinic Address & Hours" />
                      </div>
                      <h3 className="doctor-name web-h1 h1 text-white">Education & Training</h3>
                    </div>
                  </div>
                  <Slider
                    {...commonSettings}
                    slidesToShow={educationTraining?.length <= 3 ? educationTraining?.length : 3}
                    arrows={educationTraining?.length >= 4 ? true : false}
                    className='clinic-slider'>
                    {educationTraining?.map((e, i) => {
                      return (
                        <div key={i} className="timingshape">
                          <div className='h-100 d-flex flex-column justify-content-between p-30'>
                            <div>
                              {!e?.title && !e?.degree && !e?.city && !e?.start_year && !e?.end_year ? (
                                <div>
                                  {'No education details added'}
                                </div>
                              ) : (
                                <div>{`${e.start_year} - ${e.end_year}`}</div>
                              )}

                              <div className='titleprint'>{e.title}</div>

                              {e?.degree && (
                                <div className='rounded border bg-white d-inline-block py-1 px-2 mt-2'>{e?.degree}</div>
                              )}
                            </div>
                            {e?.city && (
                              <div className="text-welcome d-flex align-items-center">
                                <img src={locationGrey} className='me-2' width={18} height={18} alt="Location" /> {e?.city}</div>
                            )}
                          </div>
                          <div className={`round-shape-top-education ${i % 2 === 1 && 'round-education-pink'}`}></div>
                          <div className='shape-education'></div>
                        </div>
                      )
                    })}
                  </Slider>
                  {educationTraining?.length > 3 && (
                    <div className='pb-4 mt-5'>
                      <p className='slide-count slide-count-left'><span>{String(currentSlide + 1).padStart(2, "0")} - {String(educationTraining?.length).padStart(2, "0")}</span></p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Memberships Section */}
      {otherSettings?.enable_membership ? (
        <div ref={membershipSectionRef} className="website-section website-membership">
          <div className="container">
            <Row className='row-80'>
              <Col lg={{ order: 2, span: 12 }}>
                <div className='bg-icon-common mb-20'>
                  <img width={28} height={28} src={MembershipsIcon} alt="Memberships" />
                </div>
                <h2 className="doctor-name h1 web-h1 text-welcome mb-28">Memberships</h2>
                <Slider
                  {...commonSettings}
                  slidesToShow={membership?.length <= 2 ? membership?.length : 2}
                  arrows={membership?.filter(el => el.title)?.length >= 3 ? true : false}
                  vertical={true}
                  verticalSwiping={true}
                  className='clinic-slider'>
                  <div> {!membership.length > 0 && 'No any memberships added'}</div>
                  {membership?.filter(el => el.title)?.map((e, i) => {
                    return (
                      <div key={i} className='d-flex align-items-center mb-3'>
                        {e.title && (
                          <>
                            <div className='border membership-slide'>
                              <img width={64} height={60} src={membershipSlide} className='img-fluid z-1' alt="Memberships" />
                              <div className={`membership-yellow-blur-box ${i % 2 === 1 && 'membership-pink-blur-box'}`}></div>
                            </div>
                            <div className='ms-3 title-common'>
                              {e?.title}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </Slider>
                {membership?.filter(el => el.title)?.length > 2 && (
                  <div className='py-5 mt-5'>
                    <p className='slide-count'><span>{String(currentSlide + 1).padStart(2, "0")} - {String(membership?.filter(el => el.title)?.length).padStart(2, "0")}</span></p>
                  </div>
                )}
              </Col>
              <Col sm={24} lg={12}>
                <img width={413.754} height={482.575} src={MembershipsImg} className='img-fluid' alt="About The Doctor" />
              </Col>
            </Row>
          </div>
        </div>
      ) : null}

      {/* Rewards & Recognitions Section */}
      {rewardRecognition?.length > 0 && otherSettings?.enable_reward_recognition ? (
        <div ref={awardsSectionRef} className="website-section website-clinic website-experience website-rewards">
          <div className="container">
            <div className='row-80 align-items-start'>
              <Row className='align-items-start'>
                <Col sm={24} lg={16}>
                  <div className='bg-icon-common mb-20'>
                    <img width={28} height={28} src={rewardsIcon} alt="Doctor Experience" />
                  </div>
                  <h2 className="doctor-name h1 web-h1 text-welcome">Rewards & Recognitions</h2>
                </Col>
                <Col sm={24} lg={8}>
                  {rewardRecognition?.length > 3 && (
                    <div className='py-5 mt-lg-5 mt-0'>
                      <p className='slide-count text-start text-lg-end'><span>{String(currentSlide + 1).padStart(2, "0")} - {String(rewardRecognition?.length).padStart(2, "0")}</span></p>
                    </div>
                  )}
                </Col>
              </Row>
              <Slider
                {...commonSettings}
                slidesToShow={rewardRecognition?.length <= 3 ? rewardRecognition?.length : 3}
                arrows={rewardRecognition?.length >= 4 ? true : false}
                className='clinic-slider'>
                {rewardRecognition?.map((e, i) => {
                  return (
                    <div key={i} className='position-relative'>
                      <div className='border-shape-right'></div>
                      <div className='border-shape-bottom'></div>
                      <div className="timingshape">
                        <div className='h-100 d-flex flex-column justify-content-between p-30'>
                          {(!e?.title && !e?.year) && 'No any rewards & recognitions added'}
                          <div className='titleprint mt-3'>{e?.title}</div>
                          <div className="text-welcome d-flex align-items-center"> {e?.year}</div>
                        </div>
                        <div className={`round-shape-top-education ${i % 2 === 1 && 'round-education-pink'}`}></div>
                        <div className='shape-education'></div>
                      </div>
                    </div>
                  )
                })}
              </Slider>
            </div>
          </div>
        </div>
      ) : null}

      {/* Profile and Social Media Links */}
      <div className="website-section profile-socialmedia">
        <div className="container" ref={socialSectionRef}>
          <div className='row-80 text-center'>
            <div className='bg-icon-common bg-icon-xl mx-auto mb-20'>
              <img width={50.313} height={71.669} src={avatarDoctor} alt="Doctor Profile" />
            </div>
            <h3 className="doctor-name h1 web-h1 text-welcome">{`${personalDetails?.first_name} ${personalDetails?.last_name}`}</h3>
            <div className='fs-18 text-welcome fw-medium mt-1'>{`${personalDetails?.education} - ${personalDetails?.specialty}`}</div>
            <Button type="button" onClick={showModal} className="btn btn-primary3 btn-48 rounded-18 mt-4 px-4 mb-4 mb-lg-5">
              Book Appointment
            </Button>
            <hr className='mx-auto' style={{ width: 200 }} />
            {personalDetails?.email_id && validateEmail(personalDetails?.email_id) && (
              <div className='border rounded-4 d-flex align-items-center mx-auto d-inline-flex mt-4 mt-lg-5 pe-3 py-2' style={{ borderRadius: 25 }}>
                <div className='bg-icon-common bg-icon-sm2 mx-2'><img width={22} height={22} src={Mail} alt="Email" /></div>
                <a href={`mailto:${personalDetails?.email_id}`} className='text-main emailres-doc'>{personalDetails?.email_id}</a>
              </div>
            )}
            <br />
            {otherSettings?.enable_social_links ? (
              <div className='d-flex align-items-center justify-content-center mt-5'>
                {socialLinks?.facebook && (
                  <div className='bg-icon-common bg-icon-32 cursor-pointer' onClick={() => isValidWebsite(socialLinks?.facebook, 'facebook') ? clickRedirect(socialLinks?.facebook, 'facebook') : errorMessage('Wrong Facebook URL')}><img width={14.769} height={14.769} src={websiteFacebook} alt="Email" /></div>
                )}
                {socialLinks?.instagram && (
                  <div className='bg-icon-common bg-icon-32 cursor-pointer' onClick={() => isValidWebsite(socialLinks?.instagram, 'instagram') ? clickRedirect(socialLinks?.instagram, 'instagram') : errorMessage('Wrong Instagram URL')} ><img width={14.769} height={14.769} src={websiteInstagram} alt="Email" /></div>
                )}
                {socialLinks?.linkedin && (
                  <div className='bg-icon-common bg-icon-32 cursor-pointer' onClick={() => isValidWebsite(socialLinks?.linkedin, 'linkedin') ? clickRedirect(socialLinks?.linkedin, 'linkedin') : errorMessage('Wrong Linkedin URL')}><img width={14.769} height={14.769} src={websiteLinkedin} alt="Email" /></div>
                )}
                {socialLinks?.twitter && (
                  <div className='bg-icon-common bg-icon-32 cursor-pointer' onClick={() => isValidWebsite(socialLinks?.twitter, 'twitter') ? clickRedirect(socialLinks?.twitter, 'twitter') : errorMessage('Wrong Twitter URL')}><img width={14.769} height={14.769} src={websiteTwitter} alt="Email" /></div>
                )}
                {socialLinks?.youtube && (
                  <div className='bg-icon-common bg-icon-32 cursor-pointer' onClick={() => isValidWebsite(socialLinks?.youtube, 'youtube') ? clickRedirect(socialLinks?.youtube, 'youtube') : errorMessage('Wrong youtube URL')}><img width={14.769} height={14.769} src={websiteYoutube} alt="Email" /></div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="container-fluid mb-3">
        <div className="website-section website-clinic website-footer">
          <div className="slider-container">
            <div className='clinic-box p-3 p-lg-4'>
              <div className='d-flex flex-wrap align-items-center justify-content-center justify-content-lg-between'>
                <img style={{ filter: 'brightness(0) invert(1)' }} src={websiteLogo} width={151.29} height={34} alt="Footer Logo" />
                <div className='text-white mt-2 text-center mt-lg-0'>© {(new Date().getFullYear())} TatvaPractice. All rights reserved</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Common Model */}
      <Modal
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}
        width={792}
        className='website-appointment-model'>
        <div className='model-title text-welcome mt-4'>Book an Appointment</div>
        <div className='model-subtitle mt-2'>Please contact the clinic to schedule an appointment.</div>
        <Row className='mt-4'>
          <Col sm={24} lg={16}>
            {clinicProfile?.filter(el => !el.clinic_delete)?.length > 0 && (
              clinicProfile.filter(el => !el.clinic_delete).length > 1 ? (
                <Slider {...settingsAppointment} className='clinic-slider'>
                  {clinicProfile?.filter(el => !el.clinic_delete)?.map((e, i) => {
                    return (
                      <div key={i} className="timingshape">
                        <div className='h-100 d-flex flex-column justify-content-between appt-30'>
                          <div>
                            <div className='d-flex align-items-center'>
                              <div className='appointment-dp'>
                                <Image width={80} height={80} src={personalDetails?.hero_image_link ? personalDetails?.hero_image_link : DoctorDefault} className='img-fluid' alt="Doctor Profile" />
                              </div>
                              <div className='ms-3'>
                                <div className='appt-drname text-welcome'>{`${personalDetails?.first_name} ${personalDetails?.last_name}`}</div>
                                <div className='appt-dreducation text-welcome'>{`${personalDetails?.education} - ${personalDetails?.specialty}`}</div>
                              </div>
                            </div>
                            <Row className='mt-4'>
                              <Col sm={24} lg={4}>
                                <div className='bg-icon-common bg-icon-sm2 mb-2 bg-white border'><Image width={28} height={28} src={LocationClinic} alt="Clinic Address & Hours" /></div>
                              </Col>
                              <Col sm={24} lg={20}>
                                <div className='model-subtitle text-welcome fw-medium'>{e?.name}</div>
                                <div>{`${Object.values(Object.fromEntries(Object.entries((({ address_line, city, state, pincode }) => ({ address_line, city, state, pincode }))(e?.address)).filter(([_, v]) => v))).join(', ')}`}</div>
                              </Col>
                            </Row>
                          </div>
                          <div>
                            {!isMobile ? (
                              <Button type="button" className="btn btn-primary3 btn-48 rounded-18">
                                <a className='text-white d-flex align-items-center'><Image width={19} height={19} src={Call} className='me-2' alt="Call" />{` ${e?.contact_no}`}</a>
                              </Button>
                            ) : (
                              <Button type="button" onClick={() => window.location.href = (`tel:${e?.contact_no}`)} className="btn btn-primary3 btn-48 rounded-18">
                                <a className='text-white d-flex align-items-center'><Image width={19} height={19} src={Call} className='me-2' alt="Call" />{`${e?.contact_no}`}</a>
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className='round-shape-top-education round'></div>
                        <div className='shape-education'></div>
                        <p className='mb-0 position-absolute slide-count slide-count-left' style={{ bottom: 33, zIndex: 99, right: 5 }}><span className='text-welcome'>{String(i + 1).padStart(2, "0")} / {String(clinicProfile?.filter(el => !el.clinic_delete)?.length).padStart(2, "0")}</span></p>
                      </div>
                    );
                  })}
                </Slider>
              ) : (
                <div className="timingshape">
                  <div className='h-100 d-flex flex-column justify-content-between appt-30'>
                    <div>
                      <div className='d-flex align-items-center'>
                        <div className='appointment-dp'>
                          <Image width={80} height={80} src={personalDetails?.hero_image_link ? personalDetails?.hero_image_link : DoctorDefault} className='img-fluid' alt="Doctor Profile" />
                        </div>
                        <div className='ms-3'>
                          <div className='appt-drname text-welcome'>{`${personalDetails?.first_name} ${personalDetails?.last_name}`}</div>
                          <div className='appt-dreducation text-welcome'>{`${personalDetails?.education} - ${personalDetails?.specialty}`}</div>
                        </div>
                      </div>
                      <Row className='mt-4'>
                        <Col sm={24} lg={4}>
                          <div className='bg-icon-common bg-icon-sm2 mb-2 bg-white border'><Image width={28} height={28} src={LocationClinic} alt="Clinic Address & Hours" /></div>
                        </Col>
                        <Col sm={24} lg={20}>
                          <div className='model-subtitle text-welcome fw-medium'>{clinicProfile[0]?.name}</div>
                          <div>{`${Object.values(Object.fromEntries(Object.entries((({ address_line, city, state, pincode }) => ({ address_line, city, state, pincode }))(clinicProfile[0]?.address)).filter(([_, v]) => v))).join(', ')}`}</div>
                        </Col>
                      </Row>
                    </div>
                    <div>
                      {!isMobile ? (
                        <Button type="button" className="btn btn-primary3 btn-48 rounded-18">
                          <a className='text-white d-flex align-items-center'><Image width={19} height={19} src={Call} className='me-2' alt="Call" />{` ${clinicProfile[0]?.contact_no}`}</a>
                        </Button>
                      ) : (
                        <Button type="button" onClick={() => window.location.href = (`tel:${clinicProfile[0]?.contact_no}`)} className="btn btn-primary3 btn-48 rounded-18">
                          <a className='text-white d-flex align-items-center'><Image width={19} height={19} src={Call} className='me-2' alt="Call" />{`${clinicProfile[0]?.contact_no}`}</a>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className='round-shape-top-education round'></div>
                  <div className='shape-education'></div>
                  <p className='mb-0 position-absolute slide-count slide-count-left' style={{ bottom: 33, zIndex: 99, right: 5 }}><span className='text-welcome'>01 / 01</span></p>
                </div>
              )
            )}
          </Col>
          <Col lg='auto' className='d-none d-sm-none d-lg-block'>
            <img width={184} height={390} src={BAPhoto} className='img-fluid' alt="Book Appointment" />
          </Col>
        </Row>
      </Modal>
    </div>
  );
}
export default React.memo(Homepage);