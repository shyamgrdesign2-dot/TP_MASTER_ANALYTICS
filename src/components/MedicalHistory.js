import React, { useState, useCallback, useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import { Spin } from 'antd';
import moment from 'moment';

import { useLocation } from 'react-router-dom';
import { getGynecDetails } from '../api/services/ApiGynec';
import { errorMessage } from '../utils/utils';
import { useAccess } from '../pages/vaccination/useAccess';
import { ASSETS } from "../assets";
const {
  medicalHistory: MedicalHistoryicon,
  heartbeat: heartBeat,
} = ASSETS.images;

function MedicalHistory({ loading, medicalHistoryData, doctorId }) {

    const [isExpand, setIsExpand] = useState(false);
    const [gynecHistory, setGynecHistory] = useState({});

    const location = useLocation();
    const locationState = location.state || {};
    const { patient_data } = locationState;

    const {isGynaecHistoryAccessable} = useAccess();

    useEffect(() => {
        if(doctorId){
            fetchGynecHistory();
        }
    }, [doctorId]);
    
    const fetchGynecHistory = async () => {
        try {
            const data = await getGynecDetails(
              patient_data?.patient_unique_id,
              doctorId
            );
            setGynecHistory(data);
        } catch (error) {
            errorMessage('Error fetching gynec history:', error);
        }
    };

    const manageExpand = useCallback(() => {
        setIsExpand(!isExpand)
    }, [isExpand])

    const filteredGynecHistory = Object.keys(gynecHistory || {}).reduce((acc, key) => {
        if (
            key !== 'createdAt' && key !== 'createdBy' && key !== 'reproductiveLifeStages'
        ) {
            acc[key] = gynecHistory[key];
        }
        return acc;
    }, {});

    const medical_history_title = (id) => {
        var value = ''
        if (id == 2 ) {
            value = `Condition : `
        } else if (id == 3) {
            value = `History : `
        } else if (id == 4) {
            value = `Allergies to : `
        } else if (id == 1) {
            value = `Habit : `
        }
        return value
    }

    return (
        <div className="appointment-wrap PatientDetailswrap m-0">
            <Card>
                <Card.Header className='bg-white py-3'>
                    <div className='d-flex align-items-center justify-content-between'>
                        <div>
                            <img src={MedicalHistoryicon} alt="Medical History" className='me-3' />
                            {Object.keys(gynecHistory || {}).length > 2 ? `Gynec History` : `Medical History`}
                        </div>
                        {/* <a>
                            <img src={arrowright} alt="right" />
                        </a> */}
                    </div>
                </Card.Header>
                <div className='p-3'>
                    {((medicalHistoryData && medicalHistoryData.length > 0) || (gynecHistory && Object.keys(gynecHistory).length > 2)) &&
                        <div className={`${!isExpand ? 'overflow-hidden' : 'overflow-auto'}`} style={{ height: isExpand ? 529 : 190 }}>
                            {(gynecHistory && Object.keys(filteredGynecHistory).length > 0) && (
                                <>
                                    <div className="fw-semibold">Menstrual Details</div>
                                    <div className="cardbody-data border rounded px-2 my-2">
                                        <div className="my-2">
                                            {gynecHistory.lmp && (
                                                <> <span>LMP</span> : <label>{moment(gynecHistory.lmp).format('DD/MM/YYYY')}</label> </>
                                            )}
                                        </div>
                                        <div className="my-2">
                                            {gynecHistory.ageAtMenarche && (
                                                <> <span>Menarche at</span> : <label>{gynecHistory.ageAtMenarche} years</label> | </>
                                            )}
                                            {gynecHistory.menarcheNotes && (
                                                <> <span> Menarche notes</span> : <label>{gynecHistory.menarcheNotes}</label> | </>
                                            )}
                                            {gynecHistory.cycle && (
                                                <> <span>Cycle</span> : <label>{gynecHistory.cycle}</label> | </>
                                            )}
                                            {gynecHistory.intervalOfCycle && (
                                                <> <span>Cycle Interval</span> : <label>{gynecHistory.intervalOfCycle} days</label> | </>
                                            )}
                                            {gynecHistory.cycleNotes && (
                                                <> <span>Cycle Note</span> : <label>{gynecHistory.cycleNotes}</label> | </>
                                            )}
                                            {gynecHistory.flow && (
                                                <> <span>Flow</span> : <label>{gynecHistory.flow}</label> | </>
                                            )}
                                            {gynecHistory.durationOfMenstrualFlow && (
                                                <> <span>Duration</span> : <label>{gynecHistory.durationOfMenstrualFlow} days</label> | </>
                                            )}
                                            {gynecHistory.clots !== undefined && gynecHistory.clots !== '' && (
                                                <> <span> Clots</span> : <label>{gynecHistory.clots ? 'Yes' : 'No'}</label> | </>
                                            )}
                                            {gynecHistory.numberOfPadsPerDay && (
                                                <> <span> Pads per day</span> : <label>{gynecHistory.numberOfPadsPerDay}</label> | </>
                                            )}
                                            {gynecHistory.flowNotes && (
                                                <> <span> Flow notes</span> : <label>{gynecHistory.flowNotes}</label> | </>
                                            )}
                                            {gynecHistory.pain && (
                                                <> <span>Pain</span> : <label>{gynecHistory.pain}</label> | </>
                                            )}
                                            {gynecHistory.occurrenceOfPain && (
                                                <> <span> Occurrence</span> : <label>{gynecHistory.occurrenceOfPain}</label> | </>
                                            )}
                                            {gynecHistory.painNotes && (
                                                <> <span> Pain note</span> : <label>{gynecHistory.painNotes}</label> | </>
                                            )}
                                            {gynecHistory.ageAtMenopause && (
                                                <> <span>{gynecHistory?.reproductiveLifeStages} at</span> : <label>{gynecHistory.ageAtMenopause} years</label> |</>
                                            )}
                                            {gynecHistory.typeOfMenopause && (
                                                <> <span>{gynecHistory?.reproductiveLifeStages} type</span> : <label>{gynecHistory.typeOfMenopause}</label> </>
                                            )}
                                            {gynecHistory.reproductiveNotes && (
                                                <> <span>{gynecHistory?.reproductiveLifeStages} note</span> : <label>{gynecHistory.reproductiveNotes}</label> </>
                                            )}
                                        </div>
                                        <div className="my-2">
                                            {gynecHistory.notes && (
                                                <> <span>Menstruation notes</span> : <label>{gynecHistory.notes}</label> </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                            {medicalHistoryData && medicalHistoryData.length > 0 && (
                                medicalHistoryData.map((e, i) => {
                                    return (
                                        (e.no_know_history || e.tags?.length > 0) && (
                                            <div key={i}>
                                                <div className={`fw-semibold ${i !== 0 && 'pt-2'}`}>{e.title}</div>
                                                {!e.no_know_history ? (
                                                    <div className="cardbody-data">
                                                        {e.tags.filter(x => x.enable === 'Y').length > 0 && (
                                                            <div className='border rounded px-2 my-2'>
                                                                {e.tags.filter(x => x.enable === 'Y').map((e1, i1) => (
                                                                    <div key={i1} className='my-2'>
                                                                        <span>{medical_history_title(e?.tmmhs_id)}</span> <label>{e1.title}</label>
                                                                        {e1.since && e?.tmmhs_id !== 5 && (
                                                                            <> | <span>Since</span> : <label>{e1.since}</label></>
                                                                        )}
                                                                        {e1.date && e?.tmmhs_id === 5 && (
                                                                            <> | <span>Date of Surgery</span> : <label>{e1.date}</label></>
                                                                        )}
                                                                        {e.tmmhs_id !== 3 && e?.tmmhs_id !== 5 && (
                                                                            <>
                                                                                {e1.status && (
                                                                                    <> | <span>Status</span> : <label>{e1.status}</label></>
                                                                                )}
                                                                                {e1.medication && (
                                                                                    <> | <span>Medication</span> : <label>{e1.medication}</label></>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                        {e.tmmhs_id === 3 && e1.relationship && (
                                                                            <> | <span>Relationship</span> : <label>{e1.relationship}</label></>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                {e.tags.filter(x => x.enable === 'Y').map((e1, i1) => (
                                                                    e1.note && (
                                                                        <div key={i1} className='my-2'>
                                                                            <span>{e?.tmmhs_id === 5 ? "Remarks" : "Note"}</span> : <label>{e1.note}</label>
                                                                        </div>
                                                                    )
                                                                ))}
                                                            </div>
                                                        )}
                                                        {e.tags.filter(x => x.enable === 'N').length > 0 && (
                                                            <div className='border rounded px-2 my-2'>
                                                                {e.tags.filter(x => x.enable === 'N').map((e1, i1) => (
                                                                    <div key={i1} className='my-2'>
                                                                        <label>{`No ${e1.title}`}</label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="fontroboto border rounded p-2 my-2 text-history fw-normal">{`No known history`}</div>
                                                )}
                                            </div>
                                        )
                                    );
                                })
                            )}
                            {medicalHistoryData?.[0]?.medical_history_remarks && (
                                <div className="cardbody-data">
                                    <div className="fw-semibold">Additional History</div>
                                    <div className="fontroboto border rounded p-2 my-2 text-history fw-normal overflow-auto d-flex text-wrap">{medicalHistoryData?.[0]?.medical_history_remarks}</div>
                                </div>
                            )}
                        </div>
                    }
                    {((medicalHistoryData && medicalHistoryData.length > 0) || (gynecHistory && Object.keys(gynecHistory).length > 2)) ? (
                        <div className='py-2 text-center text-primary fw-medium cursor-pointer' onClick={manageExpand}>
                            {isExpand ? 'View less' : 'View more'}
                        </div>
                    ):(
                        <div className='d-flex flex-column justify-content-center' style={{ minHeight: "190px" }}>
                            {loading ? (
                                <div className='align-items-center text-center'>
                                    <Spin />
                                </div>
                            ) : (
                                <div className='align-items-center text-center'>
                                    <img src={heartBeat} width={57} height={52} alt="No vital & body composition saved for the patient!" />
                                    <p className='mt-4 fontroboto'>
                                        No {isGynaecHistoryAccessable ? 'Gynec' : 'Medical'} History saved <br /> for the patient!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}

export default React.memo(MedicalHistory)