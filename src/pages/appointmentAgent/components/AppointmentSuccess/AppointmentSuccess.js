import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button, Drawer, message, Popover, Tooltip } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useQrPrintDownloadHandlers } from '../../../../common/qrPrintDownloadHelper';
import "./AppointmentSuccess.scss";
import SummaryPreview from "../preview/SummaryPreview";

import SetupPreview from '../preview/setupPreview';
import BookingLinkKnowMore from "../knowMore/BookingLinkKnowMore";
import CommonModal from "../../../../common/CommonModal";

import VideoModal from "../../../../common/VideoModal";
import QrPrintDownloadModal from "../../../../common/QrPrintDownloadModal";
import { getDecodedToken } from "../../../../utils/localStorage";
import { fetchAgents } from "../../service";
import { getClinic } from "../../../../utils/utils";
import { ASSETS } from "../../../../assets";
const {
  share: ShareIcon,
  copy: CopyIcon,
  cvtInfo: InfoIcon,
  mail: MailIcon,
  alerticon: alertIcon,
  tutorial,
  tubeIcon: playIcons,
  textLogo: logoIcom,
  qrIcon,
} = ASSETS.images;

const AppointmentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isBookingLinkDrawer, setIsBookingLinkDrawer] = useState(false);
  const [videoLink, setVideoLink] = useState(null);
  const [popOverVideo, setPopOverVideo] = useState(false);
  const [isQRCodeVisible, setQRCodeVisible] = useState(false);
  const { profile, videoList } = useSelector((state) => state.doctors);
  const [agentsData, setAgentsData] = useState(null);
  const decodedToken = getDecodedToken();
  const isAdmin = decodedToken?.result?.admin;
  const clinic = getClinic(profile?.hospital_data);
  const printRef = useRef();

  const setupData = location.state?.setupData;
  const appointment_booking_link = location.state?.appointment_booking_link;
  
  const handleBack = () => {
    navigate("/", { replace: true });
  };

  const handleShare = async () => {

    window.Moengage.track_event("TP_AG_ShareURL", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      um_id: decodedToken?.user_id,
      clinic_name: clinic?.hm_name,
    });

    if (navigator.share && appointment_booking_link) {
      try {
        await navigator.share({
          title: 'Book Appointment',
          text: 'Book your appointment with our AI Virtual Assistant',
          url: appointment_booking_link,
        });
      } catch (error) {
        console.error("error while sharing the link",error)
        // Fallback to copy if sharing is cancelled or fails
        // handleCopy();
      }
    } else {
      navigator.clipboard.writeText(appointment_booking_link)
      .then(() => {
        alert("Link copied to clipboard! You can now share it manually.");
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  };

  const handleBookingLinkKnowMore = () => {
    setIsBookingLinkDrawer((prev) => !prev);
  };

  const handleCopy = async () => {

    if (!appointment_booking_link) {
      message.warning("No booking link available.");
      return;
    }

    window.Moengage.track_event("TP_AG_CopyURL", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      um_id: decodedToken?.user_id,
      clinic_name: clinic?.hm_name,
    });

    try {
      await navigator.clipboard.writeText(appointment_booking_link);
      message.success("Link copied to clipboard!");
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = appointment_booking_link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success("Link copied to clipboard!");
    }
  };

  const handleConfigSettings = () => {

    window.Moengage.track_event("TP_AG_ConfigSet", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      um_id: decodedToken?.user_id,
      clinic_name: clinic?.hm_name,
    });
    
    // Navigate to SetupSummary with agentsData and enable edit mode
    navigate("/appointment-agent?step=summary", {
      state: {
        agentsData: agentsData,
        setupData: setupData,
        showSummaryOnly: true,
        enableEditMode: true // New flag to enable edit buttons
      }
    });
  };

  const handleBulkSmsClick = () => {
    window.Moengage.track_event("TP_AG_AgentBC", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      um_id: decodedToken?.user_id,
      clinic_name: clinic?.hm_name,
    });
    navigate('/create-campaign', { state: { category: "ai-receptionist", setupData } })
  }

  const showHideQRModal = useCallback(() => {
    setQRCodeVisible(!isQRCodeVisible);
  }, [isQRCodeVisible]);

  const { handlePrint, handleDownload } = useQrPrintDownloadHandlers({
    printRef,
    fileName: 'Appointment-Booking-Link',
  });

  const handleShowQRCode = () => {
    if (!appointment_booking_link) {
      message.warning("No booking link available.");
      return;
    }
    setQRCodeVisible(true);
  };

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
            ?.filter((e) => e.category_id === 9)[0]
            ?.video?.map((item1, i1) => {
              return (
                <div
                  key={i1}
                  className={`d-flex ${
                    i1 !==
                      videoList?.filter((e) => e.category_id === 9)[0]?.video
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
                  <div>
                    <h3 className="title-common text-welcome">
                      {item1?.tmv_title}
                    </h3>
                    <div className="fs-12 fontroboto fw-normal text-main">
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

  const fetchAgentsData = async () => {
      try {
        const clinicId = String(decodedToken?.result?.clinic_id);
        const response = await fetchAgents(clinicId);
        if (response) {
          setAgentsData(response.length > 0 && response[response.length - 1]);
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
  };

  useEffect(() => {
      fetchAgentsData();
  }, []);

  return (
    <>
      <div className="success-page-container">
        <div className="header-container">
          <div className="header">
            <div className="back-button" onClick={handleBack}>
              <i
                className="icon-right"
                style={{
                  display: "block",
                  // transform: `rotate(180deg)`,
                  color: "black",
                  fontSize: "1.5rem"
                  // padding: "5px"f
                }}
              />
              Your AI Virtual Assistant
            </div>
            <div className="right-buttons">
              <div className="align-items-center d-flex h-100">
                {/* <Popover
                  open={popOverVideo}
                  onOpenChange={showHideVideoListPopover}
                  content={VIDEO_CONTENT}
                  trigger="click"
                  overlayClassName="pop-430 pp-0 videoTutorial"
                  placement="bottom"
                >
                  <button className="btn d-flex align-items-center btn-text me-10 tutorial">
                    <span className="text-decoration-none rounded-5 pe-3 bg-white shadow2">
                      <img height={42} src={tutorial} />
                      Tutorial
                    </span>
                  </button>
                </Popover> */}
                {videoLink && (
                  <VideoModal
                    videoLink={videoLink}
                    onCancel={() => setVideoLink(null)}
                  />
                )}
              </div>
              {isAdmin ? (
                <div className="config-button align-items-center d-flex h-100" onClick={handleConfigSettings}>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10.0003 12.5C11.3811 12.5 12.5003 11.3807 12.5003 10C12.5003 8.61929 11.3811 7.5 10.0003 7.5C8.61961 7.5 7.50033 8.61929 7.50033 10C7.50033 11.3807 8.61961 12.5 10.0003 12.5Z"
                      stroke="white"
                      strokeWidth="1.67"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16.1663 12.5C16.0558 12.7513 16.0224 13.0302 16.0698 13.3005C16.1172 13.5708 16.2433 13.8203 16.433 14.0167L16.4913 14.075C16.6447 14.2283 16.7666 14.4091 16.8509 14.6081C16.9351 14.8071 16.9801 15.021 16.9836 15.2375C16.9872 15.454 16.9493 15.669 16.8717 15.8705C16.7941 16.072 16.6783 16.2562 16.5305 16.4139C16.3827 16.5716 16.2056 16.6981 16.0099 16.7875C15.8142 16.8769 15.6031 16.9275 15.3879 16.9366C15.1726 16.9457 14.9578 16.9131 14.7553 16.8405C14.5529 16.768 14.3671 16.6569 14.208 16.5133L14.1497 16.455C13.9532 16.2653 13.7037 16.1392 13.4334 16.0918C13.1631 16.0444 12.8842 16.0778 12.633 16.1883C12.3869 16.2944 12.1764 16.4699 12.0246 16.6941C11.8727 16.9183 11.7852 17.1827 11.7713 17.455L11.7663 17.5333C11.7663 17.9593 11.5907 18.3678 11.2781 18.6678C10.9656 18.9678 10.5473 19.1333 10.1097 19.1333C9.67199 19.1333 9.25374 18.9678 8.94118 18.6678C8.62863 18.3678 8.45299 17.9593 8.45299 17.5333L8.44633 17.4467C8.42846 17.1676 8.33339 16.8982 8.17157 16.6726C8.00975 16.447 7.78842 16.2739 7.53299 16.1733C7.28177 16.0628 7.00292 16.0294 6.73262 16.0768C6.46233 16.1242 6.21277 16.2503 6.01633 16.44L5.95799 16.4983C5.79889 16.6419 5.61315 16.753 5.41071 16.8255C5.20827 16.8981 4.99341 16.9307 4.77817 16.9216C4.56293 16.9125 4.35188 16.8619 4.15615 16.7725C3.96042 16.6831 3.78339 16.5566 3.63557 16.3989C3.48776 16.2412 3.37196 16.057 3.29437 15.8555C3.21678 15.654 3.17887 15.439 3.18242 15.2225C3.18597 15.006 3.23097 14.7921 3.31522 14.5931C3.39947 14.3941 3.52136 14.2133 3.67466 14.06L3.73299 14.0017C3.92273 13.8052 4.04876 13.5557 4.09617 13.2854C4.14357 13.0151 4.11018 12.7362 3.99966 12.485C3.89355 12.2389 3.71809 12.0284 3.49387 11.8765C3.26965 11.7247 3.00534 11.6372 2.73299 11.6233L2.65466 11.6183C2.22866 11.6183 1.82017 11.4427 1.52016 11.1301C1.22015 10.8176 1.05466 10.3993 1.05466 9.96163C1.05466 9.52393 1.22015 9.10568 1.52016 8.79312C1.82017 8.48057 2.22866 8.30493 2.65466 8.30493L2.74133 8.29827C3.02037 8.2804 3.28983 8.18532 3.51539 8.0235C3.74095 7.86169 3.91414 7.64036 4.01466 7.38493C4.12518 7.13371 4.15857 6.85486 4.11117 6.58456C4.06377 6.31427 3.93774 6.06471 3.74799 5.86827L3.68966 5.80993C3.53636 5.65083 3.41447 5.46509 3.33022 5.26265C3.24597 5.06021 3.20097 4.84535 3.19742 4.63011C3.19387 4.41487 3.24452 4.20382 3.33391 4.00809C3.4233 3.81236 3.54981 3.63533 3.70753 3.48751C3.86524 3.3397 4.04947 3.2239 4.25097 3.14631C4.45247 3.06872 4.66744 3.03081 4.88391 3.03436C5.10037 3.03791 5.31428 3.08291 5.51328 3.16716C5.71228 3.25141 5.89311 3.3733 6.04633 3.5266L6.10466 3.58493C6.3011 3.77468 6.55066 3.90071 6.82095 3.94811C7.09125 3.99551 7.3701 3.96212 7.62133 3.8516H7.63466C7.88073 3.74549 8.09123 3.57003 8.24307 3.34581C8.39491 3.12159 8.48243 2.85728 8.49633 2.58493L8.50133 2.50827C8.50133 2.08227 8.67682 1.67377 8.97683 1.37376C9.27684 1.07375 9.69509 0.908264 10.1328 0.908264C10.5705 0.908264 10.9888 1.07375 11.2888 1.37376C11.5888 1.67377 11.7643 2.08227 11.7643 2.50827L11.7713 2.59493C11.7852 2.86728 11.8727 3.13159 12.0246 3.35581C12.1764 3.58003 12.3869 3.75549 12.633 3.8616C12.8842 3.97212 13.1631 4.00551 13.4334 3.95811C13.7037 3.91071 13.9532 3.78468 14.1497 3.59493L14.208 3.5366C14.3671 3.3933 14.5529 3.28217 14.7553 3.20964C14.9578 3.13711 15.1726 3.10452 15.3879 3.11363C15.6031 3.12274 15.8142 3.17331 16.0099 3.26271C16.2056 3.3521 16.3827 3.47861 16.5305 3.63632C16.6783 3.79404 16.7941 3.97827 16.8717 4.17977C16.9493 4.38127 16.9872 4.59624 16.9836 4.81271C16.9801 5.02917 16.9351 5.24308 16.8509 5.44208C16.7666 5.64108 16.6447 5.82191 16.4913 5.97513L16.433 6.03346C16.2433 6.2299 16.1172 6.47946 16.0698 6.74976C16.0224 7.02005 16.0558 7.2989 16.1663 7.55013V7.56346C16.2724 7.80953 16.4479 8.02003 16.6721 8.17187C16.8963 8.32371 17.1607 8.41123 17.433 8.42513L17.5097 8.43013C17.9357 8.43013 18.3442 8.60562 18.6442 8.90563C18.9442 9.20564 19.1097 9.62389 19.1097 10.0616C19.1097 10.4993 18.9442 10.9176 18.6442 11.2301C18.3442 11.5427 17.9357 11.7183 17.5097 11.7183H17.423C17.1507 11.7322 16.8863 11.8197 16.6621 11.9716C16.4379 12.1234 16.2624 12.3339 16.1563 12.58L16.1663 12.5C16.1663 12.5 16.1663 12.5 16.1663 12.5Z"
                      stroke="white"
                      strokeWidth="1.67"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="main-content">
          <div className="share-section">
            <h2>
              Share this below link with your patients to book appointments and
              share their symptoms👇
            </h2>

            <div className="link-box">
              <span className="link-text">
                {appointment_booking_link}
              </span>
              <div className="action-buttons-success">
                <button className="share-button" onClick={handleShare}>
                  <img
                    src={ShareIcon}
                    style={{ width: "1.5rem", height: "1.5rem" }}
                  />
                </button>
                <button className="copy-button" onClick={handleCopy}>
                  <img
                    src={CopyIcon}
                    style={{ width: "1.5rem", height: "1.5rem" }}
                  />
                </button>
                <button className="copy-button" onClick={handleShowQRCode}>
                  <img
                    src={qrIcon}
                    alt=""
                    style={{ width: "1.5rem", height: "1.5rem", color:"#4b4ad5", filter:"invert(22%) sepia(79%) saturate(2418%) hue-rotate(228deg) brightness(90%) contrast(100%)"}}
                  />
                </button>
              </div>
            </div>

            <div className="info-box">
              <img src={InfoIcon} className="info-icon" />
              <div className="info-text">
                Share this above link to patients via{" "}
                <span style={{ fontWeight: 600 }}>WhatsApp, SMS, GMB</span> or{" "}
                <span style={{ fontWeight: 600 }}>Tatvacare Microsite </span> to
                let patients book appointments & provide Symptoms hassle free✨
                <button className="know-more-btn" onClick={handleBookingLinkKnowMore}>
                  <span
                    style={{
                      fontSize: "14px",
                      paddingLeft: "4px",
                      textDecoration: "underline",
                      textDecorationColor: "#454551",
                    }}
                  >
                    Know More
                  </span>
                </button>
              </div>
            </div>

            <div className="divider">or</div>

            <div className="bulk-sms">
              <div className="sms-header">
                <img src={MailIcon} className="mail-icon" />
                <span>
                  Boost visibility by sharing this link through WhatsApp.
                </span>
              </div>
              <button className="sms-button" onClick={handleBulkSmsClick}>
                Send this to your patient via bulk SMS
              </button>
            </div>
          </div>
          <div style={{width :"45%"}}>
            <SetupPreview setupData={setupData} />
          </div>
        </div>
      </div>
      {isBookingLinkDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          open={isBookingLinkDrawer}
          onClose={handleBookingLinkKnowMore}
          className=".modalWidth-800"
          width={680}
        >
          <BookingLinkKnowMore handleDDxKnowMore={handleBookingLinkKnowMore} />
        </Drawer>
      )}
      <QrPrintDownloadModal
        open={!!isQRCodeVisible && !!appointment_booking_link}
        onClose={showHideQRModal}
        contentRef={printRef}
        title="Appointment Booking Link"
        byName={profile?.um_name}
        hospitalLogo={setupData?.logo}
        logoSrc={logoIcom}
        qrValue={appointment_booking_link}
        qrSize={180}
        scanText="Scan the above QR to Book Appointment & Share Symptoms"
        onPrint={handlePrint}
        onDownload={handleDownload}
        className="opd-plan-qr"
      />
    </>
  );
};

export default AppointmentSuccess;
