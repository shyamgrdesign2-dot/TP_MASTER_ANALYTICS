import React, { useEffect, useState } from 'react';
import { Collapse } from 'antd';
import moment from 'moment';

function GynecHistoryList(props) {
    const {gynecHistory} = props
    const [accordionItems, setAccordionItems] = useState([]);

    const filteredGynecHistory = Object.keys(gynecHistory || {}).reduce((acc, key) => {
        if ( key !== 'reproductiveLifeStages' ) {
            acc[key] = gynecHistory[key];
        }
        return acc;
    }, {});

    useEffect(() => {
        if (gynecHistory && Object.keys(filteredGynecHistory).length > 0) {
            const data = [];
            const updateData = {
                key: `${1}`,
                label: <div className="fw-semibold">Menstrual Details</div>,
                children: (
                    <>
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
                                    <> <span>{gynecHistory?.reproductiveLifeStages} at</span> : <label>{gynecHistory.ageAtMenopause} years</label> | </>
                                )}
                                {gynecHistory.typeOfMenopause && (
                                    <> <span>{gynecHistory?.reproductiveLifeStages} type</span> : <label>{gynecHistory.typeOfMenopause}</label> | </>
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
                )
            };
    
            data.push(updateData);
            setAccordionItems(data);
        } else {
            setAccordionItems([]);
        }
    }, [gynecHistory]);

    return (
        <>
            <div className="overflow-y-auto">
                {gynecHistory && (
                    <Collapse items={accordionItems} defaultActiveKey={['1']} className="prescriptiontab-accordian history-sider-box history-sider-box-white" expandIconPosition={'end'} />
                )}
            </div>
        </>
    );
}

export default React.memo(GynecHistoryList);
