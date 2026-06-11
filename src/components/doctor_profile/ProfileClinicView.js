import React from 'react';
import { useSelector } from "react-redux";
import { Row, Col, Button } from 'antd';
import Slider from 'react-slick';

function ProfileClinicView() {

    const { profile } = useSelector((state) => state.doctors);

    const settings = {
        infinite: false,
        arrows: false,
        dots: true,
        adaptiveHeight: true,
        autoplay: false,
        adaptiveHeight: true
    };

    return (
        <div className="rounded-20px bg-white">
            <div className="d-flex align-items-center justify-content-between p-20 border-bottom" style={{ borderColor: '#F1F1F5' }}>
                <div className="d-flex align-items-center">
                    <i className="profile-head-icon icon-Visit-Summary me-3"></i>
                    <div className="titleprint">
                        Clinic Details
                    </div>
                </div>
                {/* <button className="btn d-flex align-items-center btn-text">
                    <i className='icon-Edit me-1 fs-5'></i>
                    <span> Edit </span>
                </button> */}
            </div>
            <div>
                <Slider
                    {...settings}
                    slidesToShow={profile?.hospital_data?.length > 1 ? 2 : 1}
                    slidesToScroll={profile?.hospital_data?.length > 1 ? 2 : 1}
                    variableWidth={profile?.hospital_data?.length > 1 ? false : true}
                    className='hospital-address-slider'>
                    {profile?.hospital_data?.map((e, i) => {
                        return (
                            <div key={Math.random()} className='p-3' style={{ width: profile?.hospital_data?.length > 1 ? 'auto' : '50%' }}>
                                <div >
                                    <div className="p-20 rounded-20px rounded-bottom-0 border" style={{ backgroundColor: 'rgba(237, 223, 247, 0.30)' }}>
                                        <div className='fw-semibold fs-16' style={{ fontWeight: 600 }}> {e?.hm_name ? e?.hm_name : '-'}</div>
                                    </div>
                                    <div className="p-20 rounded-20px rounded-top-0 bg-white border border-top-0">
                                        <div className="fw-semibold">Address</div>
                                        <div className="fs-14">{e?.hm_address ? e?.hm_address : '-'}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </Slider>
                {/* <div>
                    <div className="p-20 rounded-20px rounded-bottom-0 border" style={{ backgroundColor: 'rgba(237, 223, 247, 0.30)' }}>
                        <div className='fw-semibold fs-16' style={{ fontWeight: 600 }}> {profile?.hospital_data[0]?.hm_name ? profile?.hospital_data[0]?.hm_name : '-'}</div>
                    </div>
                    <div className="p-20 rounded-20px rounded-top-0 bg-white border border-top-0">
                        <div className="fw-semibold">Address</div>
                        <div className="fs-14">{profile?.hm_address ? profile?.hm_address : '-'}</div>
                        <div className="d-flex align-items-center justify-content-between mt-4">
                                    <div className="align-items-center d-flex text-primary fw-medium px-3 py-1 cursor-pointer">
                                        <i className="icon-Preview text-primary me-2"></i>
                                        Get Direction                                        
                                    </div>
                                    <Button type="text" className="btn btn-videoClose align-items-center d-flex fw-medium" icon={<i className="profile-head-icon icon-phone text-secondary-custom"></i>}>
                                        7894561230
                                    </Button>
                                </div>
                    </div>
                </div> */}
            </div>
        </div >
    );
}

export default React.memo(ProfileClinicView);
