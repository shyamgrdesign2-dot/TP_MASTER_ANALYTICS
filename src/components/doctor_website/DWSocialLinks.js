import React, { useCallback, useContext } from 'react';
import { Row, Col, Form, Input } from 'antd';

import DoctorWebsiteSettingsContext from '../../context/DoctorWebsiteSettingsContext';

import { blockedEmoji } from '../../utils/utils';
import { ASSETS } from "../../assets";
const {
  fbImg: Facebook,
  instagramImg: Instagram,
  linkedinImg: Linkedin,
  xImg: XIcon,
  youtubeImg: Youtube,
} = ASSETS.images;

function DWSocialLinks() {

    const { socialLinks, setSocialLinks } = useContext(DoctorWebsiteSettingsContext);

    const onChangeInput = useCallback(
        (e, key) => {
            socialLinks[key] = blockedEmoji(e.target.value);
            setSocialLinks((prev) => { return { ...prev } });
        },
        [socialLinks]
    );

    return (
        <div className="bg-white p-20 overflow-auto" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="text-greycolor fontroboto mb-20">Add your social media profile links.</div>
            <div className="title-common mb-3">Social Links</div>
            <Form layout="vertical">
                <Row gutter={20}>
                    <Col span={24} className='social'>
                        <Form.Item
                            className='fw-medium mb-20' required>
                            <Input placeholder="Facebook link"
                                prefix={<img className='me-0'
                                    height={17.54}
                                    width={17.54}
                                    src={Facebook} alt="Facebook" />}
                                className="text-capitalize rounded-10px h-38"
                                value={socialLinks?.facebook}
                                onChange={(e) => onChangeInput(e, 'facebook')} />
                        </Form.Item>
                    </Col>
                    <Col span={24} className='social'>
                        <Form.Item
                            className='fw-medium mb-20' required>
                            <Input placeholder="Instagram link"
                                prefix={<img className='me-0'
                                    height={17.54}
                                    width={17.54}
                                    src={Instagram} alt="Instagram" />}
                                className="text-capitalize rounded-10px h-38"
                                value={socialLinks?.instagram}
                                onChange={(e) => onChangeInput(e, 'instagram')} />
                        </Form.Item>
                    </Col>
                    <Col span={24} className='social'>
                        <Form.Item
                            className='fw-medium mb-20'>
                            <Input placeholder="LinkedIn link"
                                prefix={<img className='me-0' height={16.54} width={16.54} src={Linkedin} alt="Linkedin" />}
                                className="text-capitalize rounded-10px h-38"
                                value={socialLinks?.linkedin}
                                onChange={(e) => onChangeInput(e, 'linkedin')} />
                        </Form.Item>
                    </Col>
                    <Col span={24} className='social'>
                        <Form.Item
                            className='fw-medium mb-20'>
                            <Input placeholder="Twitter link"
                                prefix={<img className='me-0' height={16.54} width={16.54} src={XIcon} alt="X" />} className="text-capitalize rounded-10px h-38"
                                value={socialLinks?.twitter}
                                onChange={(e) => onChangeInput(e, 'twitter')} />
                        </Form.Item>
                    </Col>
                    <Col span={24} className='social'>
                        <Form.Item
                            className='fw-medium mb-20'>
                            <Input placeholder="Youtube link"
                                prefix={<img className='me-0' height={17.54} width={17.54} src={Youtube} alt="Youtube" />}
                                className="text-capitalize rounded-10px h-38"
                                value={socialLinks?.youtube}
                                onChange={(e) => onChangeInput(e, 'youtube')} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </div>
    );
}
export default React.memo(DWSocialLinks);