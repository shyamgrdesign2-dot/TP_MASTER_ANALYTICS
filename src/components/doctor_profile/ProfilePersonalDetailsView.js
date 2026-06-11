import React, { useState, useCallback } from "react";
import { Row, Col, Drawer } from 'antd';
import { useSelector } from "react-redux";
import ProfilePersonalDetailsEdit from "./ProfilePersonalDetailsEdit";

function ProfilePersonalDetailsView() {

    const { profile } = useSelector((state) => state.doctors);
    const [parentDrawer, setParentDrawer] = useState(false);
    
    const handleDrawerParent = useCallback(() => {
        setParentDrawer(!parentDrawer);
    }, [parentDrawer]);

    return (
        <div className="rounded-20px bg-white">
            <div className="d-flex align-items-center justify-content-between p-20 border-bottom" style={{ borderColor: '#F1F1F5' }}>
                <div className="d-flex align-items-center">
                    <i className="profile-head-icon icon-profile me-3"></i>
                    <div className="titleprint">
                        Personal Details
                    </div>
                </div>
                {/* <button onClick={handleDrawerParent} className="btn d-flex align-items-center btn-text">
                    <i className='icon-Edit me-1 fs-5'></i>
                    <span> Edit </span>
                </button> */}
                <Drawer closeIcon={false} placement="right" onClose={handleDrawerParent} open={parentDrawer} width={'100%'} className="searchdrawer-content">
                    <ProfilePersonalDetailsEdit onClose={handleDrawerParent} />
                </Drawer>
            </div>
            <div className="px-20 py-1">
                <Row>
                    <Col span={12} className='my-3'>
                        <div>
                            <div>Contact No.</div>
                            <span className='title-common text-welcome'>{profile?.um_contact ? profile?.um_contact : '-'}</span>
                        </div>
                    </Col>
                    <Col span={12} className='my-3'>
                        <div>
                            <div>Email</div>
                            <span className='title-common text-welcome'>{profile?.um_email ? profile?.um_email : '-'}</span>
                        </div>
                    </Col>
                    <Col span={12} className='my-3'>
                        <div>
                            <div>Date of Birth</div>
                            <span className='title-common text-welcome'>{profile?.um_dob ? profile?.um_dob : '-'}</span>
                        </div>
                    </Col>
                    <Col span={12} className='my-3'>
                        <div>
                            <div>Gender</div>
                            <span className='title-common text-welcome'>{profile?.um_gender ? profile?.um_gender : '-'}</span>
                        </div>
                    </Col>
                    <Col span={12} className='my-3'>
                        <div>
                            <div>Years of Experience</div>
                            <span className='title-common text-welcome'>{profile?.um_total_no_exp}</span>
                        </div>
                    </Col>
                </Row>
            </div>
        </div>
    );
}

export default React.memo(ProfilePersonalDetailsView);
