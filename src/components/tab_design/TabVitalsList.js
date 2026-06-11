import React, { useContext, useMemo } from "react";
import { Button, Collapse } from 'antd';

import { useSelector } from "react-redux";

import CashManagerContext from '../../context/CashManagerContext';
import { hasVitalsAndBodyCompositionData } from "../../utils/symptomCollectorVitalsMerge";

import moment from "moment";
import { useLocation } from "react-router-dom";
import { useAccess } from "../../pages/vaccination/useAccess";
import TabSiderEmptyState from "./TabSiderEmptyState";

const showDateFormat = 'DD MMM, YY'

function TabVitalsList(props) {

    const { handleDrawerVital, handleCollapsed, isTabRx } = props
    const { state } = useLocation();
    const { patient_data } = state;
    const { isPediatricAccessable } = useAccess();
    const { vitalsPastList, patientBirthWeight } = useSelector(
      (state) => state.vitals
    );
    const { isAutofillSelected, selectedSymptomsCollector } = useSelector(
      (state) => state.ddx
    );

    const { vitalsData } = useContext(CashManagerContext);
    const hasTodayVitals = vitalsData?.some((item) =>
      item?.temp ||
      item?.pres ||
      item?.resp_rate ||
      item?.blood_press ||
      item?.spo2 ||
      item?.ofc ||
      item?.height ||
      item?.weight ||
      item?.bmi ||
      item?.bmr ||
      item?.bsa ||
      item?.fib4 ||
      item?.waist_circumference ||
      item?.general_rbs
    );
    const hasBirthWeight = patient_data?.ageMonths <= 12 &&
      patient_data?.ageYears === 0 &&
      (vitalsData?.[0]?.patient_birth_weight || patientBirthWeight);
    const hasScVitalsAutofill =
      isAutofillSelected &&
      hasVitalsAndBodyCompositionData(
        selectedSymptomsCollector?.vitalsAndBodyComposition
      );
    const hasAnyVitalsData =
      hasTodayVitals ||
      vitalsPastList.length > 0 ||
      hasBirthWeight ||
      hasScVitalsAutofill;

    const PAST_VITALS = useMemo(() => {
        return (
            vitalsPastList.length > 0 &&
            vitalsPastList.map((item, i) => {
                return (
                    <div key={i} className="p-10 border-bottom pb-0">
                        <div className="title-sami">
                            {moment(item.date).format(showDateFormat)}
                        </div>
                        <div className="py-3">
                            {/* <div className="d-flex align-items-center justify-content-between mb-12">
                                <div className="fontroboto">BP(mm Hg)</div>
                                <div className="fontroboto">{item.blood_press}</div>
                            </div> */}
                            {isPediatricAccessable && <>
                            {item.weight && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Weight (kgs)</div>
                                    <div className="fontroboto">{item.weight}</div>
                                </div>
                            )}
                            {item.height && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Height (cms)</div>
                                    <div className="fontroboto">{item.height}</div>
                                </div>
                            )}
                            {item.ofc ? (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">OFC (cms)</div>
                                    <div className="fontroboto">{item.ofc}</div>
                                </div>
                            ) : null}</>}
                            {item.temp && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Temperature(Frh)</div>
                                    <div className="fontroboto">{item.temp}</div>
                                </div>
                            )}
                            {item.pres && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Pulse (/min)</div>
                                    <div className="fontroboto">{item.pres}</div>
                                </div>
                            )}
                            {item.resp_rate && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Resp. Rate (/min)</div>
                                    <div className="fontroboto">{item.resp_rate}</div>
                                </div>
                            )}
                            {item.blood_press && item.blood_press.split('/')[0] && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Systolic (mmHg)</div>
                                    <div className="fontroboto">{item.blood_press.split('/')[0]}</div>
                                </div>
                            )}
                            {item.blood_press && item.blood_press.split('/')[1] && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Diastolic (mmHg)</div>
                                    <div className="fontroboto">{item.blood_press.split('/')[1]}</div>
                                </div>
                            )}
                            {item.spo2 && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">SPO2 (%)</div>
                                    <div className="fontroboto">{item.spo2}</div>
                                </div>
                            )}
                            {item.general_rbs && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">General RBS (mg/dl)</div>
                                    <div className="fontroboto">{item.general_rbs}</div>
                                </div>
                            )}
                            {item.fib4 && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Fib4{<span style={{ width: "24px" }} />} </div>
                                    <div className="fontroboto">{item.fib4}</div>
                                </div>
                            )}
                            {item.waist_circumference && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Waist Circumference(cms)</div>
                                    <div className="fontroboto">{item.waist_circumference}</div>
                                </div>
                            )}
                            {!isPediatricAccessable && <>{item.ofc ? (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">OFC (cms)</div>
                                    <div className="fontroboto">{item.ofc}</div>
                                </div>
                            ) : null}
                            {item.height && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Height (cms)</div>
                                    <div className="fontroboto">{item.height}</div>
                                </div>
                            )}
                            {item.weight && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Weight (kgs)</div>
                                    <div className="fontroboto">{item.weight}</div>
                                </div>
                            )}</>}
                            {item.bmi && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">BMI (kg/m²)</div>
                                    <div className="fontroboto">{parseFloat(item.bmi).toFixed(2)}</div>
                                </div>
                            )}
                            {item.bmr && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">BMR (kcals)</div>
                                    <div className="fontroboto">{parseFloat(item.bmr).toFixed(2)}</div>
                                </div>
                            )}
                            {item.bsa && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">BSA (m²)</div>
                                    <div className="fontroboto">{parseFloat(item.bsa).toFixed(2)}</div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })
        );
    }, [vitalsPastList]);

    const TODAY_VITALS = useMemo(() => {
        return (
            vitalsData.length > 0 &&
            vitalsData.map((item, i) => {
                if (item.temp || item.pres || item.resp_rate || item.blood_press || item.spo2 || item.ofc || item.height || item.weight || item.bmi || item.bmr || item.bsa || item.fib4 || item.waist_circumference || item.general_rbs ) {
                return (
                    <div key={i} className="p-10 border-bottom pb-0">
                        <div className="title-sami">
                            {moment(item.date).format(showDateFormat)}
                        </div>
                        <div className="py-3">
                            {isPediatricAccessable && <>
                            {item.weight && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Weight (kgs)</div>
                                    <div className="fontroboto">{item.weight}</div>
                                </div>
                            )}
                            {item.height && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Height (cms)</div>
                                    <div className="fontroboto">{item.height}</div>
                                </div>
                            )}
                            {item.ofc ? (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">OFC (cms)</div>
                                    <div className="fontroboto">{item.ofc}</div>
                                </div>
                            ) : null}</>}
                            {item.temp && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Temperature(Frh)</div>
                                    <div className="fontroboto">{item.temp}</div>
                                </div>
                            )}
                            {item.pres && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Pulse (/min)</div>
                                    <div className="fontroboto">{item.pres}</div>
                                </div>
                            )}
                            {item.resp_rate && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Resp. Rate (/min)</div>
                                    <div className="fontroboto">{item.resp_rate}</div>
                                </div>
                            )}
                            {item.blood_press && item.blood_press.split('/')[0] && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Systolic (mmHg)</div>
                                    <div className="fontroboto">{item.blood_press.split('/')[0]}</div>
                                </div>
                            )}
                            {item.blood_press && item.blood_press.split('/')[1] && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Diastolic (mmHg)</div>
                                    <div className="fontroboto">{item.blood_press.split('/')[1]}</div>
                                </div>
                            )}
                            {item.spo2 && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">SPO2 (%)</div>
                                    <div className="fontroboto">{item.spo2}</div>
                                </div>
                            )}
                            {item.general_rbs && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">General RBS (mg/dl)</div>
                                    <div className="fontroboto">{item.general_rbs}</div>
                                </div>
                            )}
                           
                            {item.fib4 && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Fib4{<span style={{ width: "24px" }} />} </div>
                                    <div className="fontroboto">{item.fib4}</div>
                                </div>
                            )}
                             {item.waist_circumference && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Waist Circumference(cms)</div>
                                    <div className="fontroboto">{item.waist_circumference}</div>
                                </div>
                            )}
                            {!isPediatricAccessable && <>{item.ofc ? (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">OFC (cms)</div>
                                    <div className="fontroboto">{item.ofc}</div>
                                </div>
                            ) : null}
                            {item.height && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Height (cms)</div>
                                    <div className="fontroboto">{item.height}</div>
                                </div>
                            )}
                             {item.weight && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">Weight (kgs)</div>
                                    <div className="fontroboto">{item.weight}</div>
                                </div>
                            )}</>}
                            {item.bmi && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">BMI (kg/m²)</div>
                                    <div className="fontroboto">{parseFloat(item.bmi).toFixed(2)}</div>
                                </div>
                            )}
                            {item.bmr && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">BMR (kcals)</div>
                                    <div className="fontroboto">{parseFloat(item.bmr).toFixed(2)}</div>
                                </div>
                            )}
                            {item.bsa && (
                                <div className="d-flex align-items-center justify-content-between mb-12">
                                    <div className="fontroboto">BSA (m²)</div>
                                    <div className="fontroboto">{parseFloat(item.bsa).toFixed(2)}</div>
                                </div>
                            )}
                        </div>
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
            <div className={`text-white align-items-center bg-secondary d-flex justify-content-between lh-lg px-2 py-2 ${isTabRx ? "tab-rx-header" : ""}`}>
                Vitals
                <Button type="text" className="btn p-0 btn-outline" onClick={handleCollapsed}>
                    <i className='icon-Contract fs-21 text-white p-0'></i>
                </Button>
            </div>
            <div className="overflow-y-auto" style={{ height: "calc(100vh - 109px)" }}>
                {hasAnyVitalsData ? (
                    <>
                <div className="p-10 pb-0">
                    <span className="title-common">Today’s Data</span>
                    <Button className='btn btn-input mt-3 d-flex justify-content-center align-items-center btn-41' onClick={handleDrawerVital}>
                        <i className='icon-Add me-2 fs-21'></i>
                        Add or Edit Vitals
                    </Button>
                </div>
                {hasBirthWeight && (
                    <div className="d-flex align-items-center justify-content-between mb-12 border-bottom" style={{padding: "15px 10px"}}>
                        <div className="fontroboto">Patient Birth weight(kgs)</div>
                        <div className="fontroboto">{vitalsData?.[0]?.patient_birth_weight || patientBirthWeight}</div>
                    </div>
                )}
                {TODAY_VITALS}
                {vitalsPastList.length > 0 && (
                    <div>
                        <Collapse items={accordionItems} defaultActiveKey={['1']} className="prescriptiontab-accordian" expandIconPosition={'end'} />
                    </div>
                )}
                    </>
                ) : (
                    <div className="p-10">
                        <TabSiderEmptyState
                            title="No Vitals!"
                            description="It looks like there are no vitals added for this patient yet."
                            actionLabel="Add Vitals"
                            onAction={handleDrawerVital}
                        />
                    </div>
                )}
            </div>
        </>
    );
}


export default React.memo(TabVitalsList);
