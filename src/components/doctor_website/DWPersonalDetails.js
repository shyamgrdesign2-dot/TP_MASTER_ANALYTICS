import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Row, Col, Form, Input } from 'antd';

import DoctorWebsiteSettingsContext from '../../context/DoctorWebsiteSettingsContext';
import { blockedEmoji, errorMessage, removeSpecialCharectorWithoutDotSpace, removeWhiteSpace } from '../../utils/utils';

function DWPersonalDetails() {

    const inputImageUrl = React.createRef();

    const { personalDetails, setPersonalDetails } = useContext(DoctorWebsiteSettingsContext);

    const onChangeInput = useCallback(
        (e, key) => {
            if (key === 'email_id') {
                personalDetails[key] = removeWhiteSpace(blockedEmoji(e.target.value));
            } else if (key === 'specialty') {
                personalDetails[key] = removeSpecialCharectorWithoutDotSpace(e.target.value);
            } else if (key === 'first_name') {
                personalDetails[key] = removeSpecialCharectorWithoutDotSpace(e.target.value);
            } else {
                personalDetails[key] = blockedEmoji(e.target.value);
            }
            setPersonalDetails((prev) => { return { ...prev } });
        },
        [personalDetails]
    );


    const handleImageChange = (e) => {
        if (e.target.files?.length > 0) {
            const fileUrl = e.target.files[0];
            if (fileUrl.size <= 2101546 && (fileUrl.type == 'image/png' || fileUrl.type == 'image/jpeg' || fileUrl.type == 'image/jpg')) {
                personalDetails['hero_image_name'] = fileUrl.name
                personalDetails['hero_image_link'] = URL.createObjectURL(fileUrl)
                personalDetails['uploadFile'] = fileUrl
                setPersonalDetails((prev) => { return { ...prev } });
            } else {
                errorMessage('Please upload only jpg, jpeg or png files with the max size 2mb.')
            }
        }
    }

    return (
        <div className="bg-white p-20 overflow-auto" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="text-greycolor fontroboto mb-3"> Write about doctor's personal details.</div>
            <Form layout="vertical">
                <Row gutter={20}>
                    <Col span={24}>
                        <Form.Item
                            label="Full Name"
                            className='fw-medium mb-20'
                            required>
                            <Input placeholder="Full Name"
                                className="text-capitalize rounded-10px h-38"
                                value={personalDetails?.first_name}
                                onChange={(e) => onChangeInput(e, 'first_name')} />
                        </Form.Item>
                    </Col>
                    {/* <Col span={12}>
                        <Form.Item
                            label="Last Name"
                            className='fw-medium mb-20'
                            required>
                            <Input placeholder="Last Name"
                                className="text-capitalize rounded-10px h-38"
                                value={personalDetails?.last_name}
                                onChange={(e) => onChangeInput(e, 'last_name')} />
                        </Form.Item>
                    </Col> */}
                    <Col span={12}>
                        <Form.Item
                            label="Specialty"
                            className='fw-medium mb-20'
                            required>
                            <Input placeholder="Specialty"
                                className="text-capitalize rounded-10px h-38"
                                value={personalDetails?.specialty}
                                onChange={(e) => onChangeInput(e, 'specialty')} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="Education"
                            className='fw-medium mb-20'
                            required>
                            <Input placeholder="Education"
                                className="text-capitalize rounded-10px h-38"
                                value={personalDetails?.education}
                                onChange={(e) => onChangeInput(e, 'education')} />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item
                            label="Email"
                            className='fw-medium mb-20'>
                            <Input placeholder="Email"
                                className="rounded-10px h-38"
                                value={personalDetails?.email_id}
                                onChange={(e) => onChangeInput(e, 'email_id')} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            <hr className='mt-1' />
            <div className='title-common'>Your Image</div>
            <div className='upload-headfoot p-2'>
                <div className="d-flex align-items-center justify-content-between mx-auto">
                    {personalDetails?.hero_image_link &&
                        <img
                            alt='hero_image'
                            style={{ height: 62, objectFit: 'contain', overflow: 'hidden', borderRadius: 8 }}
                            src={personalDetails?.hero_image_link} />
                    }
                    <div className={`${personalDetails?.hero_image_link && 'text-start ms-3'}`} onClick={() => inputImageUrl.current?.click()}>
                        <input
                            key={Math.random()}
                            ref={inputImageUrl}
                            style={{ display: 'none' }}
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleImageChange} />
                        <div className="fw-medium text-decoration-underline cursor-pointer">{personalDetails?.hero_image_link ? 'Change' : 'Upload'} Image</div>
                        <div className="fs-12-1 fontroboto"> Only jpg, jpeg or png files with the max size 2mb.</div>
                    </div>
                </div>
            </div>
            <div className="text-greycolor fontroboto my-3"> Profile image will be centered and have image ratio of 1:1 with the minimum dimension of 565px x 565px.</div>
        </div>
    );
}

export default React.memo(DWPersonalDetails);
