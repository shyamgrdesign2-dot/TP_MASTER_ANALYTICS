import React, { useState, useEffect, useContext } from "react";
import { Collapse } from 'antd';

import CashManagerContext from '../context/CashManagerContext';
import GynecHistoryList from "./GynecHistoryList";
import { useAccess } from "../pages/vaccination/useAccess";

function MedicalHistoryList(props) {
    const { medicalHistoryData } = useContext(CashManagerContext);
    const {gynecHistory} = props
    const [accordionItems, setAccordionItems] = useState([]);

    const {isGynaecHistoryAccessable} = useAccess();

    const filteredGynecHistory = Object.keys(gynecHistory || {}).reduce((acc, key) => {
        if ( key !== 'reproductiveLifeStages' ) {
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
        } else if (id == 5) {
            value = `Surgery : `
        }
        return value
    }

    useEffect(() => {
        if (medicalHistoryData.length > 0) {
            const data = []
            medicalHistoryData?.map((e, i) => {
                if (e?.no_know_history || e?.tags?.length > 0) {
                    return data.push({
                        key: `${i + 1}`,
                        label: <div className="fw-semibold">{e?.title}</div>,
                        children:
                            !e?.no_know_history ? (
                                <div className="cardbody-data">
                                    {e?.tags?.filter(x => x.enable == 'Y').length > 0 && (
                                        <div className='border rounded px-2 my-2'>
                                            {e?.tags?.filter(x => x.enable == 'Y')?.map((e1, i1) => {
                                                return (
                                                    <>
                                                        <div key={Math.random()} className='my-2'>
                                                            <span>{medical_history_title(e?.tmmhs_id)}</span> <label>{e1?.title}</label>
                                                            {e1?.since && e?.tmmhs_id != 5 && (
                                                                <> | <span>Since</span> : <label>{e1?.since}</label></>
                                                            )}
                                                            {e1?.date && e?.tmmhs_id == 5 && (
                                                                <> | <span>Date of Surgery</span> : <label>{e1?.date}</label></>
                                                            )}
                                                            {e?.tmmhs_id != 3 && e?.tmmhs_id != 5 && (
                                                                <>
                                                                    {e1?.status && (
                                                                        <> | <span>Status</span> : <label>{e1?.status}</label></>
                                                                    )}
                                                                    {e1?.medication && (
                                                                        <> | <span>Medication</span> : <label>{e1?.medication}</label></>
                                                                    )}
                                                                </>
                                                            )}
                                                            {e?.tmmhs_id == 3 && e1?.relationship && (
                                                                <> | <span>Relationship</span> : <label>{e1?.relationship}</label></>
                                                            )}
                                                        </div>
                                                        {e1?.note && (
                                                            <div key={Math.random()} className='my-2'>
                                                                <span>{e?.tmmhs_id == 5 ? "Remarks" : "Note"}</span> : <label>{e1?.note}</label>
                                                            </div>
                                                        )}
                                                        {e1?.medical_history_remarks && (
                                                            <div key={Math.random()} className='my-2'>
                                                                <span>Additional History</span> : <label>{e1?.medical_history_remarks}</label>
                                                            </div>
                                                        )}
                                                    </>

                                                )
                                            })}
                                        </div>
                                    )}
                                    {e?.tags?.filter(x => x.enable == 'N').length > 0 && (
                                        <div className='border rounded px-2 my-2'>
                                            {e?.tags?.filter(x => x.enable == 'N')?.map((e1, i1) => {
                                                return (
                                                    <div key={Math.random()} className='my-2'>
                                                        <label>{`No ${e1?.title}`}</label>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="fontroboto border rounded p-2 my-2 text-history fw-normal">{`No known history`}</div>
                            )
                    });
                }
            });
            if(medicalHistoryData?.[0]?.medical_history_remarks) {
                data.push({
                    key: "5",
                    label: <div className="fw-semibold">Additional History</div>,
                    children: <div className="fontroboto border rounded p-2 my-2 text-history fw-normal overflow-auto d-flex text-wrap">{medicalHistoryData?.[0]?.medical_history_remarks}</div>
                })
            }
            setAccordionItems(data)
        } else {
            setAccordionItems([])
        }
    }, [medicalHistoryData]);

    return (
        <>
            <div className="overflow-y-auto" style={{ maxHeight: "661px" }}>
                { (medicalHistoryData.length > 0 || (gynecHistory && Object.keys(filteredGynecHistory).length > 0)) && (
                    <div className="p-10">
                        { isGynaecHistoryAccessable && gynecHistory && Object.keys(filteredGynecHistory).length > 0 &&
                            <GynecHistoryList gynecHistory={gynecHistory} />
                        }
                        <Collapse items={accordionItems} defaultActiveKey={['1', '2', '3', '4', '5']} className="prescriptiontab-accordian history-sider-box history-sider-box-white" expandIconPosition={'end'} />
                    </div>
                )}
            </div>
        </>
    );
}

export default React.memo(MedicalHistoryList);
