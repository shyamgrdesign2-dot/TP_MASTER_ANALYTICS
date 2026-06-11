import React, { useState, useCallback } from "react";
import { Button, Popover } from 'antd';
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useSelector } from "react-redux";
import { useDeviceType } from "../../utils/deviceDetection";

import { ADD, EDIT } from "../../utils/constants";

import VideoModal from "../../common/VideoModal";
import { getClinicName } from "../../utils/utils";
import { ASSETS } from "../../assets";
const {
  tutorialIcon: tutorial,
  tubeIcon: playIcons,
} = ASSETS.images;

function TabHeader({ flag, mode = ADD, title, loading, onClick }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isMobile: isMobileDevice, isTablet } = useDeviceType();
    
    // Automatically detect if we're on Add/Edit Patient pages and apply mobile design
    const isPatientFormPage = location.pathname === '/add_patient' || location.pathname === '/edit_patient';
    const isMobileOnly = isMobileDevice && !isTablet && isPatientFormPage;

    // Check if user came from all patients page
    const isFromAllPatients = location.state?.from === "/all_patients";
    const isFromAddAppointment = location.state?.from === "/add-appointment";

    const { videoList, profile } = useSelector((state) => state.doctors);

    const [popOverVideo, setPopOverVideo] = useState(false);
    const [videoLink, setVideoLink] = useState(null);

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
                        <Button className="btn btn-delete-prescription p-0"
                            onClick={showHideVideoListPopover}>
                            <i className="icon-Cross" />
                        </Button>
                    </div>
                    {videoList?.filter(e => e.category_id === 3)[0]?.video?.map((item1, i1) => {
                        return (
                            <div key={i1} className={`d-flex ${i1 !== videoList?.filter(e => e.category_id === 3)[0]?.video?.length - 1 && 'pb-3 mb-15 border-bottom'}`}>
                                <div className="tutorial-play me-14">
                                    <button type="button"
                                        onClick={() => {
                                            setVideoLink(item1)
                                            const clinic_name = getClinicName(profile?.hospital_data);
                                            window.Moengage.track_event("TP_Tutorial_Viewed", {
                                                clinic_name,
                                                tutorial_type: videoList[0]?.category,
                                            });
                                        }}
                                    >
                                        <img src={playIcons} />
                                    </button>
                                    <span className='tutorial-thumb'><img src={item1.thumbnail} /></span>
                                </div>
                                <div>
                                    <h3 className="title-common text-welcome">{item1?.tmv_title}</h3>
                                    <div className="fs-12 fontroboto fw-normal text-main">{item1?.tmv_description}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </>
        );
    }, [popOverVideo]);

    return (
        <div className='modalCard-header align-items-center d-flex justify-content-between'>
            <div className="align-items-center d-flex">
                <div className={`${!isMobileOnly ? 'border-end' : ''} h-100 text-center`}>
                    <Button className='btn btn-delete-prescription px-3 h-100' onClick={() => isFromAddAppointment ? navigate("/add-appointment", {
                        replace: true,
                        state: {
                            ...location.state
                        }
                    }) : navigate(-1)}>
                        <i className='icon-right lh-lg'></i>
                    </Button>
                </div>
                <div className={`w-100 ${!isMobileOnly ? 'px-20' : ''} title-common`}>{title}</div>
            </div>
            <div className="align-items-center d-flex">
                {!isMobileOnly && (
                    <>
                        <Popover
                            open={popOverVideo}
                            onOpenChange={showHideVideoListPopover}
                            content={VIDEO_CONTENT}
                            trigger="click"
                            overlayClassName="pop-430 pp-0 videoTuto.rial"
                            placement="bottom"
                        >
                            <button className='btn d-flex align-items-center btn-text me-10 tutorial'>
                                {/* onClick={showHideVideoListPopover} */}
                                <span className='text-decoration-none rounded-5 pe-3 bg-white shadow2'><img height={42} src={tutorial} />Tutorial</span>
                            </button>
                        </Popover>
                        {flag === 1 ? (
                            <Button className='btn btn-primary3 me-30 btn-41 px-4 d-flex align-items-center' icon={<i className="icon-Add"></i>} onClick={onClick}>
                                Add New Patient
                            </Button>
                        ) : flag === 2 && (
                            mode === EDIT ? (
                                <Button className='btn btn-primary3 me-30 btn-41 px-4 d-flex align-items-center' loading={loading} onClick={onClick}>
                                    Save
                                </Button>
                            ) : (
                                <Button className='btn btn-primary3 me-30 btn-41 px-4 d-flex align-items-center' loading={loading} onClick={onClick}>
                                    {(isFromAllPatients || isFromAddAppointment) ? "Add Patient" : "Add Patient to Consult"}
                                </Button>
                            )
                        )}
                    </>
                )}

                {videoLink && (
                    <VideoModal
                        videoLink={videoLink}
                        onCancel={() => setVideoLink(null)}
                    />
                )}
            </div>

        </div >
    );
}

export default React.memo(TabHeader);
