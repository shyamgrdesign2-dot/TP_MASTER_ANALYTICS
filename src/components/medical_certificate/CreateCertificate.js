import React, { useEffect, useCallback, useState, useMemo } from "react";
import { Button, Spin, message } from "antd";
import { useNavigate } from "react-router-dom";
import { LoadingOutlined } from "@ant-design/icons";

import { useSelector, useDispatch } from "react-redux";
import { MESSAGE_KEY } from "../../utils/constants";

import CommonModal from '../../common/CommonModal';

import { listCertificate, deleteCertificate } from "../../redux/doctorsSlice";

import { errorMessage } from "../../utils/utils";
import { ASSETS } from "../../assets";
const {
  alerticon: alertIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

function CreateCertificate({ handleCreateCertificateDrawer, patient_data, replace, selectedTemplate, tcu_id }) {

    const navigate = useNavigate();

    const { certificateList } = useSelector((state) => state.doctors);

    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(listCertificate());
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [removeId, setRemoveId] = useState(null);

    const showHideModal = useCallback((id) => {
        id !== undefined ? setRemoveId(id) : setRemoveId(null)
        setIsModalOpen(!isModalOpen);
    }, [isModalOpen]);

    const onDeleteClicked = async (id) => {
        const action = await dispatch(deleteCertificate(id));
        if (action.meta.requestStatus === "fulfilled") {
            message.open({
                key: MESSAGE_KEY,
                type: '',
                className: 'message-appointment',
                content: (
                    <div className='d-flex align-items-center'>
                        <img src={visitEnd} className='me-3' />
                        <div>
                            <div className='title-common text-start fontroboto'>Deleted Successfully</div>
                            <div className='fontroboto text-start fw-normal mt-1'>Certificate has been successfully deleted.</div>
                        </div>
                        <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
                    </div>
                ),
                duration: 5,
            });
        } else {
            errorMessage(action.error)
        }
    };

    const DELETE_MODAL = useMemo(() => {
        return (
            <CommonModal
                isModalOpen={isModalOpen}
                onCancel={showHideModal}
                modalWidth={357}
                title={"Delete Certificate"}
                modalBody={
                    <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                                <img className='me-3' src={alertIcon} alt="Warning" />
                                <span>
                                    Are you sure you want to delete this certificate?
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="d-flex align-items-center mt-2 justify-content-end">
                                <div onClick={() => {
                                    onDeleteClicked(removeId)
                                    showHideModal()
                                }}
                                    className="me-4 text-decoration-underline btn p-0 text-main">
                                    Yes, Delete
                                </div>
                                <Button onClick={showHideModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                    <span>No, Keep</span>
                                </Button>
                            </div>
                        </div>
                    </>
                }
            />
        );
    }, [isModalOpen]);

    return (
        <div className="bg-white overflow-y-auto p-20" style={{ height: 'calc( 100vh - 61px)' }}>
            <div className="titleprint mb-2">Select certificate template</div>

            {certificateList?.map((item, index) => {
                return (
                    <div key={index} className={`${index !== certificateList?.length - 1 && 'border-bottom'} d-flex align-items-center py-3 cursor-pointer`}>
                        <div onClick={() => {
                            handleCreateCertificateDrawer()
                            navigate(`/certificate`, { replace: replace, state: { patient_data: patient_data, certificate_data: { ...item, tcu_id: tcu_id } } })
                        }} className="d-flex w-100 align-items-center justify-content-between">
                            <div className="bg-fitness">
                                {item?.icon_image ? <img src={item?.icon_image} alt="" /> : item?.title ? item?.title[0] : ''}
                            </div>
                            <div className="d-flex w-100 align-items-center justify-content-between">
                                <div className={`title-common ${selectedTemplate == item?.id && 'text-primary'}`}>
                                    {item.title}
                                </div>
                                {selectedTemplate == item?.id && (
                                    <i className="icon-check text-primary"></i>
                                )}
                            </div>
                        </div>
                        {selectedTemplate != item?.id && !item?.pms_default && (
                            <Button onClick={() => showHideModal(item?.id)} className="btn btn-delete-prescription px-1">
                                {item.loading ? (
                                    <Spin
                                        indicator={
                                            <LoadingOutlined style={{ fontSize: 22 }} spin />
                                        }
                                    />
                                ) : (
                                    <i className="icon-delete" />
                                )}
                            </Button>
                        )}
                    </div>
                )
            })}
            <div className="d-flex align-items-center justify-content-between custom-certificate position-sticky" style={{ bottom: 0 }}>
                <div className="title-common">Want to create custom certificate ? </div>
                <Button onClick={() => {
                    handleCreateCertificateDrawer()
                    navigate('/certificate', { replace: replace, state: { patient_data: patient_data } })
                }} className='btn btn-input btn-41'>
                    Create Certificate
                </Button>
            </div>
            {DELETE_MODAL}
        </div>
    )
}
export default React.memo(CreateCertificate);
