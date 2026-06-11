import React, { useState, useEffect, useContext } from "react";
import { Button, Collapse } from 'antd';

// Read More content
const ReadMore = ({ children }) => {
    const text = children;
    const [isReadMore, setIsReadMore] = useState(true);
    const toggleReadMore = () => {
        setIsReadMore(!isReadMore);
    };
    return (
        <div className="text mb-0 fontroboto lh-base fs-13">
            {isReadMore && text.length > 63 ? text.slice(0, 63) : text}
            <span onClick={toggleReadMore} style={{fontSize: "12px"}} className="read-or-hide">
                {text.length > 63 ? isReadMore ? "... View More" : " View Less" : ""}
            </span>
        </div>
    );
};

function TabGynecHistoryList(props) {
    const {gynecHistory} = props
    const [gynecHistoryData, setGynecHistoryData] = useState({});
    const [accordionItems, setAccordionItems] = useState([]);

    useEffect(() => {
        setGynecHistoryData(gynecHistory || {});
    }, [gynecHistory]);

    const filteredGynecHistory = Object.keys(gynecHistoryData || {}).reduce((acc, key) => {
        if ( key !== 'reproductiveLifeStages' ) {
            acc[key] = gynecHistoryData[key];
        }
        return acc;
    }, {});

    useEffect(() => {
        const data = [];
        
        // Check and update accordion items based on current gynecHistoryData
        if (gynecHistoryData && Object.keys(filteredGynecHistory).length > 0) {
            const updateData = {
                key: `${1}`,
                label: <div className="fw-semibold">Menstrual Details</div>,
                children: (
                    <div className="cardbody-data">
                        <div className="gynec-history-list">
                            {gynecHistoryData.lmp && (
                                <div key="lmp" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">LMP</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">
                                        {new Date(gynecHistoryData.lmp).toISOString().split('T')[0]}
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.ageAtMenarche && (
                                <div key="ageAtMenarche" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">Menarche at</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">
                                        {gynecHistoryData.ageAtMenarche} years
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.ageAtMenarche && gynecHistoryData.menarcheNotes && (
                                <div key="menarcheNotes" className="my-2">
                                    <div style={{fontSize: "12px", fontWeight: "600"}}>Notes</div>
                                    <div style={{fontSize: "12px"}} className="border rounded px-2">
                                        <div className='my-2'>
                                            <ReadMore>{gynecHistoryData.menarcheNotes}</ReadMore>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.cycle && (
                                <div key="cycle" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">Cycle</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">
                                        {gynecHistoryData.cycle}
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.intervalOfCycle && (
                                <div key="intervalOfCycle" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">Cycle Interval</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">
                                        {gynecHistoryData.intervalOfCycle} days
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.cycle && gynecHistoryData.cycleNotes && (
                                <div key="cycleNotes" className="my-2">
                                    <div style={{fontSize: "12px", fontWeight: "600"}}>Notes</div>
                                    <div style={{fontSize: "12px"}} className="border rounded px-2">
                                        <div className='my-2'>
                                            <ReadMore>{gynecHistoryData.cycleNotes}</ReadMore>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.flow && (
                                <div key="flow" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">Flow</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">
                                        {gynecHistoryData.flow}
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.durationOfMenstrualFlow && (
                                <div key="durationOfMenstrualFlow" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">Duration</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">
                                        {gynecHistoryData.durationOfMenstrualFlow} days
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.clots !== undefined && gynecHistoryData.clots !== '' && (
                                <div key="clots" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">Clots</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">
                                        {gynecHistoryData.clots ? 'Yes' : 'No'}
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.numberOfPadsPerDay && (
                                <div key="numberOfPadsPerDay" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">Pads per day</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">
                                        {gynecHistoryData.numberOfPadsPerDay}
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.flow && gynecHistoryData.flowNotes && (
                                <div key="flowNotes" className="my-2">
                                    <div style={{fontSize: "12px", fontWeight: "600"}}>Notes</div>
                                    <div style={{fontSize: "12px"}} className="border rounded px-2">
                                        <div className='my-2'>
                                            <ReadMore>{gynecHistoryData.flowNotes}</ReadMore>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.pain && (
                                <div key="pain" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">Pain</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">
                                        {gynecHistoryData.pain}
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.occurrenceOfPain && (
                                <div key="occurrenceOfPain" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">Occurrence</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">
                                        {gynecHistoryData.occurrenceOfPain}
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.pain && gynecHistoryData.painNotes && (
                                <div key="painNotes" className="my-2">
                                    <div style={{fontSize: "12px", fontWeight: "600"}}>Notes</div>
                                    <div style={{fontSize: "12px"}} className="border rounded px-2">
                                        <div className='my-2'>
                                            <ReadMore>{gynecHistoryData.painNotes}</ReadMore>
                                        </div>
                                    </div>
                                </div>
                            )}
                             {gynecHistoryData.ageAtMenopause && (
                                <div key="ageAtMenopause" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">{gynecHistoryData?.reproductiveLifeStages} at</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">{gynecHistoryData.ageAtMenopause} years</div>
                                </div>
                            )}
                            {gynecHistoryData.typeOfMenopause && (
                                <div key="typeOfMenopause" className="d-flex justify-content-between align-items-center my-2">
                                    <div className="text-history font-roboto fs-13 t-bold">{gynecHistoryData?.reproductiveLifeStages} type</div>
                                    <div className="semicolon">:</div>
                                    <div className="text-history font-roboto fs-13">{gynecHistoryData.typeOfMenopause}</div>
                                </div>
                            )}
                            {gynecHistoryData.ageAtMenopause && gynecHistoryData.reproductiveNotes && (
                                <div key="reproductiveNotes" className="my-2">
                                    <div style={{fontSize: "12px",fontWeight:"600"}} >Notes</div>
                                    <div style={{fontSize: "12px"}} className="border rounded px-2">
                                        <div className='my-2'>
                                            <ReadMore>
                                                {gynecHistoryData.reproductiveNotes}
                                            </ReadMore>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {gynecHistoryData.notes && (
                                <div key="notes" className="my-2">
                                    <div style={{fontSize: "12px",fontWeight:"600"}} >Menstruation notes</div>
                                    <div style={{fontSize: "12px"}} className="border rounded px-2">
                                        <div className='my-2'>
                                            <ReadMore>
                                                {gynecHistoryData.notes}
                                            </ReadMore>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ),
            };
            
            // Add the item only if it has content
            if (updateData.children.props.children.props.children.length > 0) {
                data.push(updateData);
            }
        }

        // Update the accordion items state
        setAccordionItems(data);
    }, [gynecHistoryData]);

    return (
        <>
            {gynecHistoryData && (
                <Collapse items={accordionItems} defaultActiveKey={['1']} className="prescriptiontab-accordian history-sider-box" expandIconPosition={'end'} />
            )}
        </>
    );
}


export default React.memo(TabGynecHistoryList);