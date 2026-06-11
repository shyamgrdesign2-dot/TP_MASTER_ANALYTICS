import React, { useCallback, useState, useContext, useEffect } from "react";
import { Button, Card, Input } from 'antd';

import { useSelector, useDispatch } from "react-redux";
import { addEditPrivateNotes, deletePrivateNotes } from "../redux/medicalhistorySlice";

import CashManagerContext from '../context/CashManagerContext';
import CommonModal from '../common/CommonModal';
import { errorMessage, getClinicName } from "../utils/utils";
import { ASSETS } from "../assets";
const alertIcon = ASSETS.images.alerticon;

function PrivateNotesBox(props) {
    const { handleDrawerPrivateNotes, handleCollapsed, selectPrivateNotes } = props
    const { loading } = useSelector((state) => state.medicalhistory);
    const dispatch = useDispatch();

    const { profile } = useSelector((state) => state.doctors);

    const { privateNotesData, setPrivateNotesData, patient_data } = useContext(CashManagerContext);

    const [note, setNote] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        setNote(selectPrivateNotes?.notes !== undefined ? selectPrivateNotes?.notes : '')
    }, [selectPrivateNotes?.id !== undefined]);

    const showHideModal = useCallback(() => {
        setIsModalOpen(!isModalOpen);
    }, [isModalOpen]);

    const onSave = async () => {

        const clinic_name = getClinicName(profile?.hospital_data);
        window.Moengage.track_event("TP_Patient_Notes_Added", {
            clinic_name,
            "patient_number": patient_data?.pm_contact_no,
            "patient_id": patient_data?.patient_unique_id
        });

        var sendData = {
            id: selectPrivateNotes?.id !== undefined ? selectPrivateNotes?.id : 0,
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
            notes: note,
        };

        const action = await dispatch(addEditPrivateNotes(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            selectPrivateNotes?.id === undefined && setPrivateNotesData(action.payload)
            handleCollapsed(4)
        } else {
            errorMessage(action.error)
        }
    }

    const onChange = useCallback(
        (e) => {
            setNote(e.target.value);
        },
        [note]
    );

    const onDeleteClicked = async () => {
        var sendData = {
            id: selectPrivateNotes?.id !== undefined ? selectPrivateNotes?.id : 0,
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
        };
        const action = await dispatch(deletePrivateNotes(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            privateNotesData && sendData.id === privateNotesData.id && setPrivateNotesData(null)
        } else {
            errorMessage(action.error)
        }
        showHideModal()
        handleDrawerPrivateNotes()
    }

    return (
        <>
            <Card bordered={false} className="search-modalCard bg-body">
                <div className='modalCard-header h-60 align-items-center justify-content-between d-flex'>
                    <div className='align-items-center d-flex'>
                        <Button type="text" className='btn btn-delete-prescription px-3 focus-none h-100' onClick={handleDrawerPrivateNotes}>
                            <i className='icon-Cross fs-3'></i>
                        </Button>
                        <div className="modal-title">{selectPrivateNotes?.id === undefined ? 'Add' : 'Edit'} Private Note</div>
                    </div>
                    <Button onClick={onSave} className='btn btn-primary3 btn-41 px-4 me-20' loading={loading} disabled={note.length > 0 ? false : true}>
                        Save
                    </Button>
                </div>
                <div className="px-20 py-3">
                    <div className="title-common mb-2"> Private Note</div>
                    <div className="text-greycolor fontroboto mb-3">
                        This note only be visible to you and will not be printed. And you will be able to see in Patient Details.
                    </div>
                    <Input.TextArea placeholder="Write your notes" value={note} onChange={onChange} className="textareaPlaceholder" rows={4} />
                    {selectPrivateNotes?.id !== undefined && (
                        <button onClick={showHideModal} className="mt-2 btn d-flex align-items-center btn-text float-end">
                            <i className="icon-delete me-2 fs-5"></i> <span>Delete Note</span>
                        </button>
                    )}
                </div>
            </Card>
            <CommonModal
                isModalOpen={isModalOpen}
                onCancel={showHideModal}
                modalWidth={357}
                title={"Delete Note"}
                modalBody={
                    <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                                <img className='me-3' src={alertIcon} alt="Warning" />
                                <span>
                                    Are you sure you want to delete this note?
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="d-flex align-items-center mt-2 justify-content-end">
                                <div onClick={onDeleteClicked}
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
        </>
    );
}

export default React.memo(PrivateNotesBox);
