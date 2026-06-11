/**
 * Mobile version of VitalsBox. Use in TabPrescription and mobile VitalsRichTextEditor.
 * Kept separate from VitalsBox.js so web/prod remains unchanged when merging.
 */
import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from "react";
import { Button, Card, DatePicker, Input, Tooltip } from 'antd';
import dayjs from "dayjs";

import { useSelector, useDispatch } from "react-redux";
// import { v4 as uuidv4 } from 'uuid';
import { errorMessage, getClinicName, onlyDecimalFormat } from "../utils/utils";

import CashManagerContext from '../context/CashManagerContext';

import {
    addUpdateVitals,
    clearListVitalsToday,
    getPatientBirthWeight,
    setVitalsIdsFromAddVitals,
} from "../redux/vitalsSlice";
import ApiVitals from "../api/services/ApiVitals";
import moment from "moment";
import { NEO_NATOLOGISTS_DP_ID, PAEDIATRICS } from "../utils/constants";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useAccess } from "../pages/vaccination/useAccess";
import {
    normalizeVitalsInputRow,
    prepareVitalsRowForSave,
    sortVitalsRowsForDisplay,
} from "../utils/vitalsHelpers";

const dateFormat = 'YYYY-MM-DD'
const showDateFormat = 'DD MMM, YY'

function resolveVitalsIds(listVitalsTodayIds, patientUniqueId, firstRow) {
  const toId = (v) => (v != null && v !== '' && v !== 0 && v !== '0') ? Number(v) : null;
  const fromRow = firstRow
    ? { tcv_id: toId(firstRow.tcv_id), tcbc_id: toId(firstRow.tcbc_id), dev_unique_id: toId(firstRow.dev_unique_id) }
    : { tcv_id: null, tcbc_id: null, dev_unique_id: null };
  const samePatient = listVitalsTodayIds != null && String(listVitalsTodayIds.patient_unique_id) === String(patientUniqueId);
  const fromRedux = samePatient ? listVitalsTodayIds : null;
  return {
    tcv_id: fromRow.tcv_id ?? fromRedux?.tcv_id ?? 0,
    tcbc_id: fromRow.tcbc_id ?? fromRedux?.tcbc_id ?? 0,
    dev_unique_id: fromRow.dev_unique_id ?? fromRedux?.dev_unique_id ?? 0
  };
}

function VitalsBoxMobile(props) {

    const scrollContainerRef = useRef(null);
    const inputRef = useRef([]);

    const { handleDrawerVital, handleCollapsed, initialVitals, onVitalsSave, isVoiceAmbientFlow = false, patient_data: patientDataProp, vitalsFlow: vitalsFlowProp } = props;
    const isVoiceAmbientSnapSmartFlow = isVoiceAmbientFlow;

    const {
      selectedVitalsList,
      loading,
      patientBirthWeight: storedPatientBirthWeight,
      listVitalsTodayIds,
    } = useSelector((state) => state.vitals);
    const dispatch = useDispatch();

    const { patient_data: patientDataContext, vitalsData, setVitalsData } = useContext(CashManagerContext);
    const patient_data = patientDataProp ?? patientDataContext;
    const flowForRedux = vitalsFlowProp ?? 'voice';
    const [childVitalsData, setChildVitalsData] = useState([]);
    const [voiceAmbientSaving, setVoiceAmbientSaving] = useState(false);
    const [dateString, setDateString] = useState(null);
    const [patientBirthWeight, setPatientBirthWeight] = useState(
      vitalsData?.[0]?.patient_birth_weight || storedPatientBirthWeight
    );
    const { measurements } = useSelector((state) => state.growthChart);
    const isGowthChartAccessableFromGB = useFeatureIsOn(
      "growth-chart-new-design"
    );

    const { profile, userId } = useSelector((state) => state.doctors);
    const { isPediatricAccessable } = useAccess();

    const calculate = useCallback((H, W) => {
        var height = 0, weight = 0, bmi = "", bmr = "", bsa = "";
        if (H != '' && H != 0) {
            height = parseFloat(H);
        } else {
            height = 0;
        }
        if (W != '' && W != 0) {
            weight = parseFloat(W);
        } else {
            weight = 0;
        }
        const calBMI = (weight / height / height) * 10000;
        bmi = weight && height ? isFinite(calBMI) ? calBMI.toFixed(2) : '' : '';
        var age = patient_data !== undefined && patient_data.ageYears !== undefined ? patient_data.ageYears : 0;
        if (patient_data !== undefined && patient_data.pm_gender == 'Male') {
            const calBMR = (10 * weight) + (6.25 * height) - (5 * age) + 5;
            bmr = weight && height ? isFinite(calBMR) ? calBMR.toFixed(2) : '' : '';
        } else {
            const calBMR = (10 * weight) + (6.25 * height) - (5 * age) - 161;
            bmr = weight && height ? isFinite(calBMR) ? calBMR.toFixed(2) : '' : '';
        }
        const calBSA = Math.sqrt(height * weight / 3600);
        bsa = weight && height ? isFinite(calBSA) ? calBSA.toFixed(2) : '' : '';
        return { bmi: bmi, bmr: bmr, bsa: bsa };
    }, [patient_data]);

    useEffect(() => {
        if (isVoiceAmbientSnapSmartFlow) return;
        if (typeof setVitalsData !== 'function') return; 
        if (selectedVitalsList.length > 0) {
            const updatedData = selectedVitalsList.map((e, i) => {
                return normalizeVitalsInputRow(e);
            });
            setVitalsData(updatedData);
        } else if(measurements.length) {
            let cal = calculate('', '');
            setVitalsData(measurements.map(m => ({
                date: m.date,
                height: m.height || "",
                weight: m.weight || "", 
                ofc: m.ofc || "",
                bmi: m.bmi || cal.bmi,
                dev_unique_id: 0,
                tcv_id: 0,
                tcbc_id: 0,
                temp: '',
                pres: '',
                resp_rate: '',
                systolic: '',
                diastolic: '',
                spo2: '',
                bmr: cal.bmr,
                bsa: cal.bsa,
                general_rbs: m.general_rbs,
                fib4: '',
                waist_circumference: ''
            })));
        }
    }, [selectedVitalsList, measurements, isVoiceAmbientSnapSmartFlow, setVitalsData]);

    const emptyVitalsRow = useMemo(() => {
        let cal = calculate('', '');
        return {
            date: moment().format(dateFormat),
            dev_unique_id: 0,
            tcv_id: 0,
            tcbc_id: 0,
            temp: '', pres: '', resp_rate: '', systolic: '', diastolic: '', spo2: '',
            height: '', weight: '', fib4: '', waist_circumference: '', ofc: '',
            bmi: cal.bmi, bmr: cal.bmr, bsa: cal.bsa, general_rbs: ''
        };
    }, [calculate]);

    // Build a single vitals row from initialVitals prop (voice/ambient/snap/smart or when parent passes initial data)
    // parse bloodPressure into systolic/diastolic when Systolic/Diastolic are missing so Rx Pad form shows BP
    const rowFromInitialVitals = useMemo(() => {
        if (!initialVitals || typeof initialVitals !== 'object') return null;
        const v = initialVitals;
        const date = v.date || moment().format(dateFormat);
        const height = String(v.height || '').trim();
        const weight = String(v.weight || '').trim();
        let cal = calculate(height, weight);
        let systolic = String(v.Systolic || v.systolic || '').trim();
        let diastolic = String(v.Diastolic || v.diastolic || '').trim();
        if (!systolic || !diastolic) {
            const bp = v.bloodPressure || v.blood_press || '';
            if (bp) {
                const parts = String(bp).trim().split('/');
                if (parts.length >= 2) {
                    systolic = parts[0].trim();
                    diastolic = parts[1].trim();
                }
            }
        }
        return {
            date,
            dev_unique_id: v.dev_unique_id ?? 0,
            tcv_id: v.tcv_id ?? 0,
            tcbc_id: v.tcbc_id ?? 0,
            temp: String(v.temperature || v.temp || '').trim(),
            pres: String(v.pulse || v.pres || '').trim(),
            resp_rate: String(v.respRate || v.resp_rate || '').trim(),
            systolic,
            diastolic,
            spo2: String(v.spo2 || '').trim(),
            height,
            weight,
            ofc: String(v.ofc || v.OFC || '').trim(),
            general_rbs: String(v['General RBS'] || v.general_rbs || v.generalRBS || v.genralRBS || '').trim(),
            fib4: String(v.FIB4 || v.fib4 || '').trim(),
            waist_circumference: String(v['Waist Circumference'] || v.waist_circumference || '').trim(),
            bmi: v.bmi || cal.bmi,
            bmr: v.bmr || cal.bmr,
            bsa: v.bsa || cal.bsa
        };
    }, [initialVitals, calculate]);

    // Decide what fills childVitalsData: voice/ambient use initialVitals or empty row; consult uses vitalsData (context) or keeps existing childVitalsData
    useEffect(() => {
        const idKeys = ['date', 'tcv_id', 'tcbc_id', 'dev_unique_id', 'pam_id'];
        const hasInitialData = initialVitals && typeof initialVitals === 'object' &&
            Object.keys(initialVitals).filter(k => !idKeys.includes(k)).some(k => (initialVitals[k] != null && String(initialVitals[k]).trim() !== ''));
        const noContextSetVitals = typeof setVitalsData !== 'function';

        if (isVoiceAmbientSnapSmartFlow || noContextSetVitals) {
            const hasData = initialVitals && Object.keys(initialVitals).filter(k => k !== 'date').some(k => (initialVitals[k] && String(initialVitals[k]).trim()));
            if (hasData && rowFromInitialVitals) {
                setChildVitalsData([rowFromInitialVitals]);
            } else {
                setChildVitalsData([emptyVitalsRow]);
            }
            return;
        }
        if (selectedVitalsList.length === 0 && hasInitialData && rowFromInitialVitals) {
            setChildVitalsData([rowFromInitialVitals]);
            return;
        }
        // Consult: sync from context when it has data; otherwise keep existing childVitalsData (don't overwrite with [])
        setChildVitalsData((prev) => (Array.isArray(vitalsData) && vitalsData.length > 0 ? vitalsData.map(normalizeVitalsInputRow) : prev));
    }, [isVoiceAmbientSnapSmartFlow, vitalsData, rowFromInitialVitals, initialVitals, emptyVitalsRow, selectedVitalsList.length, setVitalsData]);

    useEffect(() => {
        if (isVoiceAmbientSnapSmartFlow) return;
        setChildVitalsData((prev) => (prev.length > 0 ? prev : [emptyVitalsRow]));
    }, [childVitalsData.length, isVoiceAmbientSnapSmartFlow, emptyVitalsRow]);

    const onChange = useCallback(
        (date, dateString) => {
            let cal = calculate('', '');
            const growthChartData = measurements?.find((m) => m.date === dateString);
            const { height, weight, bmi, ofc } = growthChartData || {};
            const tempVitals = [...childVitalsData];
            setDateString(dateString);
            tempVitals.push(
                {
                date: dateString,
                height: height || "",
                weight: weight || "",
                ofc: ofc || "",
                bmi: bmi || cal.bmi,
                dev_unique_id: 0,
                tcv_id: 0,
                tcbc_id: 0,
                temp: "",
                pres: "",
                resp_rate: "",
                systolic: "",
                diastolic: "",
                spo2: "",
                bmr: cal.bmr,
                bsa: cal.bsa,
                general_rbs: '',
                fib4: "",
                waist_circumference: ""
                },
            );
            setChildVitalsData([...tempVitals]);
        },
        [childVitalsData]
    );

    useEffect(() => {
        if (scrollContainerRef.current) {
            const data = sortVitalsRowsForDisplay(childVitalsData)
            const index = data.findLastIndex(({ row }) => row.date == dateString)
            if (index !== -1) {
                inputRef.current[index].focus()
                const scrollWidth = index;
                scrollContainerRef.current.scrollLeft = scrollWidth * 180;
            }
        }
    }, [childVitalsData.length])

    const onChangeInput = useCallback(
        (value, i, flag) => {
            const updateValue = onlyDecimalFormat(value);
            if (flag === 1) {
                childVitalsData[i].temp = updateValue;
            } else if (flag === 2) {
                childVitalsData[i].pres = updateValue;
            } else if (flag === 3) {
                childVitalsData[i].resp_rate = updateValue;
            } else if (flag === 4) {
                childVitalsData[i].systolic = updateValue;
            } else if (flag === 5) {
                childVitalsData[i].diastolic = updateValue;
            } else if (flag === 6) {
                childVitalsData[i].spo2 = updateValue;
            } else if (flag === 7) {
                childVitalsData[i].height = updateValue;
                let cal = calculate(updateValue, childVitalsData[i].weight);
                childVitalsData[i].bmi = cal.bmi;
                childVitalsData[i].bmr = cal.bmr;
                childVitalsData[i].bsa = cal.bsa;
            } else if (flag === 8) {
                childVitalsData[i].weight = updateValue;
                let cal = calculate(childVitalsData[i].height, updateValue);
                childVitalsData[i].bmi = cal.bmi;
                childVitalsData[i].bmr = cal.bmr;
                childVitalsData[i].bsa = cal.bsa;
            } else if (flag === 9) {
                childVitalsData[i].ofc = updateValue;
            } else if (flag === 10) {
                childVitalsData[i].general_rbs = updateValue;
            }else if (flag === 11) {
                childVitalsData[i].fib4 = updateValue;
            }else if (flag === 12) {
                childVitalsData[i].waist_circumference= updateValue;
            }
            setChildVitalsData((prev) => [...prev]);
        },
        [childVitalsData]
    );

    const childVitalsDataToVitalsObject = useCallback((items) => {
        if (!items || items.length === 0) return {};
        const item = items[0];
        const blood_press = (item.systolic && item.diastolic) ? `${item.systolic}/${item.diastolic}` : '';
        return {
            date: item.date || moment().format('YYYY-MM-DD'),
            temperature: item.temp,
            pulse: item.pres,
            respRate: item.resp_rate,
            Systolic: item.systolic,
            Diastolic: item.diastolic,
            blood_press: blood_press || undefined,
            spo2: item.spo2,
            height: item.height,
            weight: item.weight,
            ofc: item.ofc,
            'General RBS': item.general_rbs,
            FIB4: item.fib4,
            'Waist Circumference': item.waist_circumference,
            BMI: item.bmi,
            BMR: item.bmr,
            BSA: item.bsa
        };
    }, []);

    const onAddUpdateClicked = async () => {
        if (isVoiceAmbientSnapSmartFlow) {
            if (!patient_data?.patient_unique_id) {
                errorMessage('Patient is required to save vitals.');
                return;
            }
            setVoiceAmbientSaving(true);
            try {
                const today = moment().format('YYYY-MM-DD');
                const ids = resolveVitalsIds(listVitalsTodayIds, patient_data.patient_unique_id, childVitalsData[0]);
                const dataWithIds = childVitalsData.map((row, i) => ({
                    ...prepareVitalsRowForSave(row),
                    tcv_id: i === 0 ? ids.tcv_id : (row.tcv_id ?? 0),
                    tcbc_id: i === 0 ? ids.tcbc_id : (row.tcbc_id ?? 0),
                    dev_unique_id: i === 0 ? ids.dev_unique_id : (row.dev_unique_id ?? 0)
                }));
                const sendData = {
                    patient_unique_id: patient_data.patient_unique_id,
                    pm_pid: patient_data.pm_pid ?? 0,
                    pm_id: patient_data.pm_id ?? 0,
                    pam_id: patient_data.pam_id ?? 0,
                    patient_birth_weight: patientBirthWeight,
                    data: dataWithIds
                };
                const addRes = await ApiVitals.addUpdateVitals(sendData);
                if (addRes?.status !== false && addRes?.statusCode !== 400) {
                    const savedVitals = addRes?.data && Array.isArray(addRes.data) ? addRes.data : [];
                    const todaySaved = savedVitals.find(v => (v.date || '').toString().startsWith(today)) || savedVitals[0];
                    const responseIds = {
                        tcv_id: todaySaved?.tcv_id ?? 0,
                        tcbc_id: todaySaved?.tcbc_id ?? 0,
                        dev_unique_id: todaySaved?.dev_unique_id ?? 0
                    };
                    dispatch(setVitalsIdsFromAddVitals({ flow: flowForRedux, patient_unique_id: patient_data.patient_unique_id, tcv_id: responseIds.tcv_id, tcbc_id: responseIds.tcbc_id, dev_unique_id: responseIds.dev_unique_id }));
                    dispatch(clearListVitalsToday());
                    const vitalsObject = childVitalsDataToVitalsObject(childVitalsData);
                    const vitalsObjectWithIds = { ...vitalsObject, ...responseIds };
                    if (typeof onVitalsSave === 'function') {
                        onVitalsSave(vitalsObjectWithIds);
                    }
                    if (typeof handleCollapsed === 'function') handleCollapsed(1);
                    if (typeof handleDrawerVital === 'function') handleDrawerVital();
                } else {
                    errorMessage(addRes?.error || addRes?.message || 'Failed to save vitals');
                }
            } catch (err) {
                errorMessage(err?.message || err?.response?.data?.error || 'Failed to save vitals');
            } finally {
                setVoiceAmbientSaving(false);
            }
            return;
        }

        const clinic_name = getClinicName(profile?.hospital_data);
        window.Moengage.track_event("TP_vitals_updated", {
            clinic_name,
            "patient_number": patient_data?.pm_contact_no,
            "patient_id": patient_data?.patient_unique_id
        });
        const vitalsRowsForSave = childVitalsData.map(prepareVitalsRowForSave);
        var sendData = {
            patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
            pm_pid: patient_data !== undefined ? patient_data.pm_pid : 0,
            pm_id: patient_data !== undefined ? patient_data.pm_id : 0,
            pam_id: patient_data !== undefined && patient_data.pam_id !== undefined ? patient_data.pam_id : 0,
            patient_birth_weight: patientBirthWeight,
            data: vitalsRowsForSave,
        };
        const action = await dispatch(addUpdateVitals(sendData));
        if ((profile?.dp_name === PAEDIATRICS || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) && patient_data?.ageMonths <= 12 && patient_data?.ageYears === 0) {
          dispatch(
            getPatientBirthWeight({
              patient_unique_id:
                patient_data !== undefined ? patient_data.patient_unique_id : 0,
              pam_id:
                patient_data !== undefined && patient_data.pam_id !== undefined
                  ? patient_data.pam_id
                  : 0,
            })
          );
        }
        if (action.meta.requestStatus === "fulfilled") {
            const savedVitalsRows = Array.isArray(action.payload) && action.payload.length
              ? action.payload.map(normalizeVitalsInputRow)
              : vitalsRowsForSave.map(normalizeVitalsInputRow);
            setChildVitalsData(savedVitalsRows);
            if (typeof setVitalsData === 'function') {
                setVitalsData(savedVitalsRows);
            }
            handleCollapsed(1)
        } else {
            errorMessage(action.error)
        }
    }

    const TABLE_VITALS = useMemo(() => {
        return (
            childVitalsData.length > 0 &&
            sortVitalsRowsForDisplay(childVitalsData).map(({ row: item, index: sourceIndex }, i) => {
                return (
                    <div key={i} className='vitals-wrap-body w-100 vitals-child-width'>
                        <div className='vitals-head rounded-start-0 w-100'>{moment(item.date).format(showDateFormat)}</div>
                        {isPediatricAccessable && <><div className='vitals-row vitals-row-60 d-flex align-items-center px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.weight} addonAfter={'kgs'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 8)} />
                        </div>
                        <div className='vitals-row vitals-row-60 d-flex align-items-center px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.height} addonAfter={'cms'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 7)} />
                        </div>
                        {profile?.dp_name === PAEDIATRICS || profile?.dp_id === NEO_NATOLOGISTS_DP_ID || isGowthChartAccessableFromGB ? <div className='vitals-row d-flex align-items-center border-bottom px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.ofc} addonAfter={'cms'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 9)} />
                        </div> : null}
                        </>}
                        <div className='vitals-row d-flex align-items-center border-bottom px-2 w-100'>
                            <Input ref={(el) => (inputRef.current[i] = el)} className='inputheight41-group focused' placeholder="Enter" inputMode="numeric" value={item.temp} addonAfter={'Frh'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 1)} />
                        </div>
                        <div className='vitals-row d-flex align-items-center border-bottom px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.pres} addonAfter={'/min'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 2)} />
                        </div>
                        <div className='vitals-row d-flex align-items-center border-bottom px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.resp_rate} addonAfter={'/min'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 3)} />
                        </div>
                        <div className='vitals-row d-flex align-items-center border-bottom px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.systolic} addonAfter={'mmHg'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 4)} />
                        </div>
                        <div className='vitals-row d-flex align-items-center border-bottom px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.diastolic} addonAfter={'mmHg'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 5)} />
                        </div>
                        <div className='vitals-row d-flex align-items-center border-bottom px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.spo2} addonAfter={'%'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 6)} />
                        </div>
                        <div className='vitals-row d-flex align-items-center border-bottom px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.general_rbs} addonAfter={'mg/dl'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 10)} />
                        </div>
                         <div className='vitals-row vitals-row-60 d-flex align-items-center px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.fib4} addonAfter={<span style={{ width: "24px" }} />}  onChange={(e) => onChangeInput(e.target.value, sourceIndex, 11)} />
                        </div>
                        <div className='vitals-row vitals-row-60 d-flex align-items-center px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.waist_circumference} addonAfter={'cms'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 12)} />
                        </div>
                        {!isPediatricAccessable && <>{profile?.dp_name === PAEDIATRICS || profile?.dp_id === NEO_NATOLOGISTS_DP_ID || isGowthChartAccessableFromGB ? <div className='vitals-row d-flex align-items-center border-bottom px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.ofc} addonAfter={'cms'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 9)} />
                        </div> : null}
                        <div className='vitals-row vitals-row-60 d-flex align-items-center px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.height} addonAfter={'cms'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 7)} />
                        </div>
                        <div className='vitals-row vitals-row-60 d-flex align-items-center px-2 w-100'>
                            <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" value={item.weight} addonAfter={'kgs'} onChange={(e) => onChangeInput(e.target.value, sourceIndex, 8)} />
                        </div></>}
                        <div className='vitals-row vitals-row-40 d-flex align-items-center px-2 w-100'>
                            <div className='fs-14 '>{`${item.bmi != '' ? parseFloat(item.bmi).toFixed(2) : '--'} kg/m²`}</div>
                        </div>
                        <div className='vitals-row vitals-row-40 d-flex align-items-center px-2 w-100'>
                            <div className='fs-14'>{`${item.bmr != '' ? parseFloat(item.bmr).toFixed(2) : '--'} kcals`}</div>
                        </div>
                        <div className='vitals-row vitals-row-40 d-flex align-items-center px-2 w-100'>
                            <div className='fs-14'>{`${item.bsa != '' ? parseFloat(item.bsa).toFixed(2) : '--'} m²`}</div>
                        </div>
                    </div>
                );
            })
        );
    }, [childVitalsData]);

    const disabledDate = (current) => {
        return current && current >= moment().add(1, 'days').startOf('day');
    };

    return (
        <>
            <Card bordered={false} className="search-modalCard ">
                <div className='modalCard-header h-60 align-items-center justify-content-between d-flex'
                    style={{
                        position: "sticky",
                        top: "0px",
                        zIndex: 2,
                    }}>
                    <div className='align-items-center d-flex'>
                        <Button type="text" className='btn btn-delete-prescription px-3 focus-none h-100' onClick={handleDrawerVital}>
                            <i className='icon-Cross fs-3'></i>
                        </Button>
                        <div className="modal-title">Vitals</div>
                    </div>
                    <Button onClick={onAddUpdateClicked} className='btn btn-primary3 btn-41 px-4 me-20' loading={isVoiceAmbientSnapSmartFlow ? voiceAmbientSaving : loading} disabled={childVitalsData.length > 0 ? false : true}>
                        Done
                    </Button>
                </div>
                <div className="align-items-center d-flex justify-content-between px-20 py-3">
                    {(profile?.dp_name === PAEDIATRICS || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) && patient_data?.ageMonths <= 12 && patient_data?.ageYears === 0 ? (
                        <div className="vitals-wrapper">
                            <div className='vitals-row d-flex align-items-center px-2'>
                                Patient's birth weight
                            </div>
                            <div className='vitals-row d-flex align-items-center px-2'>
                                <Input className='inputheight41-group' placeholder="Enter" inputMode="numeric" maxLength={5} value={patientBirthWeight} addonAfter={'kgs'} onChange={(e) => setPatientBirthWeight(onlyDecimalFormat(e.target.value))} />
                            </div>
                        </div>
                    ) : null}
                    <div className="position-relative">
                        <Button className='btn btn-primary2 btn-41'>
                            Add New Date
                        </Button>
                        <DatePicker key={Math.random()} suffixIcon={null} inputReadOnly onChange={onChange} disabledDate={disabledDate} className="calender-vitals w-100 h-100" />
                    </div>
                </div>
                {childVitalsData.length > 0 && (
                    <div className='px-20'>
                        <div className='vitals-wrapper w-100'>
                            <div className='vitals-wrap-body vitals-parent-width'>
                                <div className='vitals-head'>Name</div>
                                {isPediatricAccessable && (
                                    <>
                                <div className='vitals-row vitals-row-60 d-flex align-items-center px-2'>
                                    Weight
                                </div>
                                <div className='vitals-row vitals-row-60 d-flex align-items-center px-2'>
                                    Height
                                </div>
                                {profile?.dp_name === PAEDIATRICS || profile?.dp_id === NEO_NATOLOGISTS_DP_ID || isGowthChartAccessableFromGB ? <div className='vitals-row d-flex align-items-center border-bottom px-2'>
                                    OFC
                                </div> : null} </>)}
                                <div className='vitals-row d-flex align-items-center border-bottom px-2'>
                                    Temperature
                                </div>
                                <div className='vitals-row d-flex align-items-center border-bottom px-2'>
                                    Pulse
                                </div>
                                <div className='vitals-row d-flex align-items-center border-bottom px-2'>
                                    Resp. Rate
                                </div>
                                <div className='vitals-row d-flex align-items-center border-bottom px-2'>
                                    Systolic
                                </div>
                                <div className='vitals-row d-flex align-items-center border-bottom px-2'>
                                    Diastolic
                                </div>
                                <div className='vitals-row d-flex align-items-center border-bottom px-2'>
                                    SPO2
                                </div>
                                <div className='vitals-row d-flex align-items-center border-bottom px-2'>
                                    General RBS
                                </div>
                                 <div className='vitals-row vitals-row-60 d-flex align-items-center px-2'>
                                    FIB4
                                </div>
                                 <div className='vitals-row vitals-row-60 d-flex align-items-center px-2'>
                                    Waist Circumference
                                </div>
                                {!isPediatricAccessable && (
                                    <>
                                {profile?.dp_name === PAEDIATRICS || profile?.dp_id === NEO_NATOLOGISTS_DP_ID || isGowthChartAccessableFromGB ? <div className='vitals-row d-flex align-items-center border-bottom px-2'>
                                    OFC
                                </div> : null}
                                <div className='vitals-row vitals-row-60 d-flex align-items-center px-2'>
                                    Height
                                </div>
                                <div className='vitals-row vitals-row-60 d-flex align-items-center px-2'>
                                    Weight
                                </div> </>)}
                                <div className='vitals-row vitals-row-40 d-flex align-items-center px-2'>
                                    BMI
                                    <Tooltip placement="right" title="Body mass index will be auto-calculated by entering Height and Weight">
                                        <i className='icon-info ms-1'></i>
                                    </Tooltip>
                                </div>
                                <div className='vitals-row vitals-row-40 d-flex align-items-center px-2'>
                                    BMR
                                    <Tooltip placement="right" title="Basal metabolic rate will be auto-calculated by entering Height and Weight">
                                        <i className='icon-info ms-1'></i>
                                    </Tooltip>
                                </div>
                                <div className='vitals-row vitals-row-40 d-flex align-items-center px-2'>
                                    BSA
                                    <Tooltip placement="right" title="Body surface area will be auto-calculated by entering Height and Weight">
                                        <i className='icon-info ms-1'></i>
                                    </Tooltip>
                                </div>
                            </div>
                            <div ref={scrollContainerRef} className='d-flex overflow-x-auto scrollvitals w-100'>
                                {TABLE_VITALS}
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </>
    );
}


export default React.memo(VitalsBoxMobile);
