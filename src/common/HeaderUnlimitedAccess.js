import React, { useState, useCallback } from 'react';
import { Container, Navbar, Row, Col } from 'react-bootstrap';
import { Button } from 'antd';
import { useSelector, useDispatch } from "react-redux";

import CommonModal from './CommonModal';

import { useNavigate } from 'react-router-dom';
import { S_TATVA_PRACTICE } from '../utils/constants';
import { interest } from '../redux/monetizationSlice';
import { errorMessage, getClinicName, getDeviceSdkData, getTokenData } from '../utils/utils';
import { openModal } from '../redux/doctorModalSlice';
import { ASSETS } from "../assets";
const alertIcon = ASSETS.images.alerticon;

function HeaderUnlimitedAccess() {

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { profile } = useSelector((state) => state.doctors);
    const [isBackModalOpen, setIsBackModalOpen] = useState(false);

    const showHideBackModal = useCallback(() => {
        setIsBackModalOpen(!isBackModalOpen);
    }, [isBackModalOpen]);

    const checkDataFillOrNot = () => {
        showHideBackModal()
    }

    const clickRequestCallback = async () => {
        dispatch(openModal(S_TATVA_PRACTICE))
        // let sendData = {
        //     mbl_no: profile?.um_contact,
        //     is_pm_renew_requested: true,
        //     service_name: S_TATVA_PRACTICE
        // }
        // const action = await dispatch(interest(sendData));
        // if (action.meta.requestStatus === "fulfilled") {
        //     errorMessage(action.payload.message)
        // }
        const clinic_name = getClinicName(profile?.hospital_data);
        const tokenData = getTokenData(); 
        const deviceSdkData = getDeviceSdkData();
        window.Moengage.track_event("TP_Monetization_RequestACallback", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            clinic_id: tokenData?.clinic_id,
            um_id: tokenData?.user_id,
            clinic_Name: clinic_name,
            former_page: S_TATVA_PRACTICE,
            ...deviceSdkData,
        });
    }

    return (
        <Navbar className="justify-content-between headerprescription p-0">
            <Container fluid className='h-100 gx-0 w-100'>
                <Row className='h-100 align-items-center w-100 justify-content-between'>
                    <Col sm="auto" className='h-100'>
                        <div className='align-items-center d-flex h-100'>
                            <div className='border-end h-100 text-center'>
                                <div onClick={checkDataFillOrNot} className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                                    <i className='icon-right'></i>
                                </div>
                                <CommonModal
                                    isModalOpen={isBackModalOpen}
                                    onCancel={showHideBackModal}
                                    modalWidth={500}
                                    title={"You may lose your data"}
                                    modalBody={
                                        <>
                                            <div className="alert-warning rounded-10px p-2 patient-details">
                                                <div className="d-flex align-items-center">
                                                    <img className='me-3' src={alertIcon} alt="Warning" />
                                                    <span>
                                                        Are you sure you want to leave? <br />
                                                        You will permanently lose your data.
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <div className="d-flex align-items-center mt-2 justify-content-end">
                                                    <div onClick={() => navigate(-1)} className="me-4 text-decoration-underline btn p-0 text-main">
                                                        Yes Leave
                                                    </div>
                                                    <Button onClick={showHideBackModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                                        <span>No, Stay</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    }
                                />
                            </div>
                            <div className='ms-3 title-common'>Get unlimited access</div>
                        </div>
                    </Col>
                    <Col sm="auto">
                        <Button type='button' className='btn align-items-center d-flex btn-41 btn-clear btn-input' onClick={clickRequestCallback}>
                            <i className='icon-phone me-2'></i>
                            Request a call back
                        </Button>
                    </Col>
                </Row>
            </Container>
        </Navbar>
    );
}

export default React.memo(HeaderUnlimitedAccess);