import React, { useContext, useMemo } from "react";
import { Input, Collapse } from 'antd';

import { useSelector } from "react-redux";

import CashManagerContext from '../context/CashManagerContext';

import moment from "moment";
import { useLocation } from "react-router-dom";
import { useAccess } from "../pages/vaccination/useAccess";

const showDateFormat = 'DD MMM, YY'

function VitalsList(props) {

    const { state } = useLocation();
    const { patient_data } = state;
    const { vitalsPastList, patientBirthWeight } = useSelector(
      (state) => state.vitals
    );
    const { isPediatricAccessable } = useAccess();
    const { vitalsData } = useContext(CashManagerContext);

    const PAST_VITALS = useMemo(() => {
        return (
            vitalsPastList.length > 0 &&
            vitalsPastList.map((item, i) => {
                return (
                    <div key={i} className={`${vitalsPastList.length - 1 != i && 'border-bottom'} pt-3 vitals-height input-readonly`}>
                        <div className="title-sami mb-3">
                            {moment(item.date).format(showDateFormat)}
                        </div>
                        {isPediatricAccessable && <>
                        {item.weight && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Weight</div>
                                <Input className='inputheight41-group mx-2' value={item.weight} addonAfter={'kgs'} readOnly />
                            </div>
                        )}
                        {item.height && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Height</div>
                                <Input className='inputheight41-group mx-2' value={item.height} addonAfter={'cms'} readOnly />
                            </div>
                        )}
                        {item.ofc ? (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">OFC</div>
                                <Input className='inputheight41-group mx-2' value={item.ofc} addonAfter={'cms'} readOnly />
                            </div>
                        ) : null}
                        </>}
                        {item.temp && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Temperature</div>
                                <Input className='inputheight41-group mx-2' value={item.temp} addonAfter={'Frh'} readOnly />
                            </div>
                        )}
                        {item.pres && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Pulse</div>
                                <Input className='inputheight41-group mx-2' value={item.pres} addonAfter={'/min'} readOnly />
                            </div>
                        )}
                        {item.resp_rate && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Resp. Rate</div>
                                <Input className='inputheight41-group mx-2' value={item.resp_rate} addonAfter={'/min'} readOnly />
                            </div>
                        )}
                        {item.blood_press && item.blood_press.split('/')[0] && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Systolic</div>
                                <Input className='inputheight41-group mx-2' value={item.blood_press ? item.blood_press.split('/')[0] : ''} addonAfter={'mmHg'} readOnly />
                            </div>
                        )}
                        {item.blood_press && item.blood_press.split('/')[1] && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Diastolic</div>
                                <Input className='inputheight41-group mx-2' value={item.blood_press ? item.blood_press.split('/')[1] : ''} addonAfter={'mmHg'} readOnly />
                            </div>
                        )}
                        {item.spo2 && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">SPO2</div>
                                <Input className='inputheight41-group mx-2' value={item.spo2} addonAfter={'%'} readOnly />
                            </div>
                        )}
                        {item.general_rbs && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">General RBS</div>
                                <Input className='inputheight41-group mx-2' value={item.general_rbs} addonAfter={'mg/dl'} readOnly />
                            </div>
                        )}
                        {item.fib4 && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">FIB4</div>
                                <Input className='inputheight41-group mx-2' value={item.fib4} addonAfter={<span style={{ width: "24px" }} />}  readOnly />
                            </div>
                        )}
                        {item.waist_circumference && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Waist Circumference</div>
                                <Input className='inputheight41-group mx-2' value={item.waist_circumference} addonAfter={'cms'} readOnly />
                            </div>
                        )}
                        {!isPediatricAccessable && <>{item.ofc ? (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">OFC</div>
                                <Input className='inputheight41-group mx-2' value={item.ofc} addonAfter={'cms'} readOnly />
                            </div>
                        ) : null}
                        {item.height && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Height</div>
                                <Input className='inputheight41-group mx-2' value={item.height} addonAfter={'cms'} readOnly />
                            </div>
                        )}
                        {item.weight && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Weight</div>
                                <Input className='inputheight41-group mx-2' value={item.weight} addonAfter={'kgs'} readOnly />
                            </div>
                        )}</>}
                        {item.bmi && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">BMI</div>
                                <Input className='inputheight41-group mx-2' value={parseFloat(item.bmi).toFixed(2)} addonAfter={'kg/m²'} readOnly />
                            </div>
                        )}
                        {item.bmr && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">BMR</div>
                                <Input className='inputheight41-group mx-2' value={parseFloat(item.bmr).toFixed(2)} addonAfter={'kcals'} readOnly />
                            </div>
                        )}
                        {item.bsa && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">BSA</div>
                                <Input className='inputheight41-group mx-2' value={parseFloat(item.bsa).toFixed(2)} addonAfter={'m²'} readOnly />
                            </div>
                        )}
                    </div>
                );
            })
        );
    }, [vitalsPastList]);

    const TODAY_VITALS = useMemo(() => {
        return (
            vitalsData.length > 0 &&
            vitalsData.map((item, i) => {
                if (item.temp || item.pres || item.resp_rate || item.blood_press || item.spo2 || item.general_rbs || item.ofc || item.height || item.weight || item.fib4 || item.waist_circumference || item.bmi || item.bmr || item.bsa) {
                return (
                    <div key={i} className={`${vitalsData.length - 1 != i && 'border-bottom'} pt-3 vitals-height input-readonly`}>
                        <div className="title-sami mb-3">
                            {moment(item.date).format(showDateFormat)}
                        </div>
                        {isPediatricAccessable && <>
                        {item.weight && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Weight</div>
                                <Input className='inputheight41-group mx-2' value={item.weight} addonAfter={'kgs'} readOnly />
                            </div>
                        )}
                        {item.height && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Height</div>
                                <Input className='inputheight41-group mx-2' value={item.height} addonAfter={'cms'} readOnly />
                            </div>
                        )}
                        {item?.ofc ? (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">OFC</div>
                                <Input className='inputheight41-group mx-2' value={item.ofc} addonAfter={'cms'} readOnly />
                            </div>
                        ) : null}</>}
                        {item.temp && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Temperature</div>
                                <Input className='inputheight41-group mx-2' value={item.temp} addonAfter={'Frh'} readOnly />
                            </div>
                        )}
                        {item.pres && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Pulse</div>
                                <Input className='inputheight41-group mx-2' value={item.pres} addonAfter={'/min'} readOnly />
                            </div>
                        )}
                        {item.resp_rate && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Resp. Rate</div>
                                <Input className='inputheight41-group mx-2' value={item.resp_rate} addonAfter={'/min'} readOnly />
                            </div>
                        )}
                        {item.blood_press && item.blood_press.split('/')[0] && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Systolic</div>
                                <Input className='inputheight41-group mx-2' value={item.blood_press ? item.blood_press.split('/')[0] : ''} addonAfter={'mmHg'} readOnly />
                            </div>
                        )}
                        {item.blood_press && item.blood_press.split('/')[1] && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Diastolic</div>
                                <Input className='inputheight41-group mx-2' value={item.blood_press ? item.blood_press.split('/')[1] : ''} addonAfter={'mmHg'} readOnly />
                            </div>
                        )}
                        {item.spo2 && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">SPO2</div>
                                <Input className='inputheight41-group mx-2' value={item.spo2} addonAfter={'%'} readOnly />
                            </div>
                        )}
                        {item.general_rbs && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">General RBS</div>
                                <Input className='inputheight41-group mx-2' value={item.general_rbs} addonAfter={'mg/dl'} readOnly />
                            </div>
                        )}
                         {item.fib4 && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">FIB4</div>
                                <Input className='inputheight41-group mx-2' value={item.fib4} addonAfter={<span style={{ width: "24px" }} />}  readOnly />
                            </div>
                        )}
                         {item.waist_circumference && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Waist Circumference</div>
                                <Input className='inputheight41-group mx-2' value={item.waist_circumference} addonAfter={'cms'} readOnly />
                            </div>
                        )}
                        {!isPediatricAccessable && <> {item?.ofc ? (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">OFC</div>
                                <Input className='inputheight41-group mx-2' value={item.ofc} addonAfter={'cms'} readOnly />
                            </div>
                        ) : null}
                        {item.height && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Height</div>
                                <Input className='inputheight41-group mx-2' value={item.height} addonAfter={'cms'} readOnly />
                            </div>
                        )}
                        {item.weight && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">Weight</div>
                                <Input className='inputheight41-group mx-2' value={item.weight} addonAfter={'kgs'} readOnly />
                            </div>
                        )}</>}
                        {item.bmi && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">BMI</div>
                                <Input className='inputheight41-group mx-2' value={parseFloat(item.bmi).toFixed(2)} addonAfter={'kg/m²'} readOnly />
                            </div>
                        )}
                        {item.bmr && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">BMR</div>
                                <Input className='inputheight41-group mx-2' value={parseFloat(item.bmr).toFixed(2)} addonAfter={'kcals'} readOnly />
                            </div>
                        )}
                        {item.bsa && (
                            <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">BSA</div>
                                <Input className='inputheight41-group mx-2' value={parseFloat(item.bsa).toFixed(2)} addonAfter={'m²'} readOnly />
                            </div>
                        )}
                    </div>
                );
            }
            })
        );
    }, [vitalsData]);

    // Accordian for side menu
    const accordionItems = [
        {
            key: '1',
            label: <div className="title-common">Past Visit Data</div>,
            children: PAST_VITALS,
        },
    ];

    return (
        <>
            <div className="overflow-y-auto" style={{ maxHeight: "250px" }}>
                {patient_data?.ageMonths <= 12 && patient_data?.ageYears === 0 && (vitalsData?.[0]?.patient_birth_weight || patientBirthWeight) && (
                    <div className="pt-3 vitals-height input-readonly" style={{borderBottom:  "1px solid #d9d9d9"}}>
                        <div className="d-flex align-items-center justify-content-between mb-12">
                            <div className="fontroboto">Patient Birth weight</div>
                            <Input className='inputheight41-group mx-2' value={vitalsData?.[0]?.patient_birth_weight || patientBirthWeight} addonAfter={'kgs'} readOnly />
                        </div>
                    </div>
                )}
                {TODAY_VITALS}
                {vitalsPastList.length > 0 && (
                    <div>
                        <Collapse items={accordionItems} defaultActiveKey={['1']} className="prescriptiontab-accordian" expandIconPosition={'end'} />
                    </div>
                )}
            </div>
        </>
    );
}


export default React.memo(VitalsList);
