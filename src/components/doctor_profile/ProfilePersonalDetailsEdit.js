import React from 'react';
import { Row, Col, Button } from 'antd';
import { Container, Navbar } from 'react-bootstrap';

function ProfilePersonalDetailsEdit({ onClose }) {
    return (
        <>
            <Navbar className="justify-content-between headerprescription p-0 bg-white">
                <Container fluid className='h-100 gx-0 w-100'>
                    <Row className='h-100 align-items-center w-100 justify-content-between'>
                        <Col lg="auto" className='h-100'>
                            <div className='align-items-center d-flex h-100'>
                                <div className='border-end h-100 text-center'>
                                    <div onClick={onClose} className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                                        <i className='icon-right'></i>
                                    </div>
                                </div>
                                <div className='ms-3 title-common'>Edit Personal Details</div>
                            </div>
                        </Col>
                        <Col lg="auto">
                            <Button type='button' className="btn-41 btn px-4 btn-primary3 me-20" disabled> Update </Button>
                        </Col>
                    </Row>
                </Container>
            </Navbar>
            <div className="m-4 p-4 rounded-20px bg-white">
                <Row>
                    <Col span={12} className='my-3'>
                        <div>
                            <div>Contact No.</div>
                            <span className='title-common text-welcome'>7894561230</span>
                        </div>
                    </Col>
                    <Col span={12} className='my-3'>
                        <div>
                            <div>Email</div>
                            <span className='title-common text-greycolor'>Add your email id</span>
                        </div>
                    </Col>
                    <Col span={12} className='my-3'>
                        <div>
                            <div>Date of Birth</div>
                            <span className='title-common text-greycolor'>Add your date of birth</span>
                        </div>
                    </Col>
                    <Col span={12} className='my-3'>
                        <div>
                            <div>Gender</div>
                            <span className='title-common text-greycolor'>Add your gender</span>
                        </div>
                    </Col>
                    <Col span={12} className='my-3'>
                        <div>
                            <div>Years of Experience</div>
                            <span className='title-common text-greycolor'>Add experience</span>
                        </div>
                    </Col>
                </Row>
            </div>
        </>

    );
}

export default ProfilePersonalDetailsEdit;
