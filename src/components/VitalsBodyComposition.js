import React, { useMemo } from 'react';
import Card from 'react-bootstrap/Card';
import { Table, Spin } from 'antd';
import moment from "moment";

// 
// 

import { useAccess } from '../pages/vaccination/useAccess';
import { ASSETS } from "../assets";
const {
  vitals,
  arrowBoxRight: arrowright,
  graph,
  heartbeat: heartBeat,
} = ASSETS.images;

const showDateFormat = 'DD MMM, YY'

const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    return Number.isNaN(num) ? '-' : num.toFixed(decimals);
};

function VitalsBodyComposition({ loading, passVitals, patientBirthWeight }) {

    const { isPediatricAccessable } = useAccess();

    const baseRows = useMemo(() => [
        {
            key: 'temperature',
            name: `Temperature (Frh)`,
            getValue: (item) => item?.temp ?? '-',
        },
        {
            key: 'pulse',
            name: `Pulse (/min)`,
            getValue: (item) => item?.pres ?? '-',
        },
        {
            key: 'respRate',
            name: `Resp. Rate (/min)`,
            getValue: (item) => item?.resp_rate ?? '-',
        },
        {
            key: 'bloodPressure',
            name: `Blood Pressure (mmHg)`,
            getValue: (item) => {
                const bp = item?.blood_press;
                if (!bp) return '-';
                return bp.endsWith('/') ? bp.slice(0, -1) : bp;
            },
        },
        {
            key: 'spo2',
            name: `SPO2 (%)`,
            getValue: (item) => item?.spo2 ?? '-',
        },
        {
            key: 'generalRbs',
            name: `General RBS (mg/dl)`,
            getValue: (item) => item?.general_rbs ?? '-',
        },
        {
            key: 'fib4',
            name: `FIB4 `,
            getValue: (item) => formatNumber(item?.fib4),
        },
        {
            key: 'waistCircumference',
            name: `Waist Circumference (cms)`,
            getValue: (item) => item?.waist_circumference ?? '-',
        },
        {
            key: 'ofc',
            name: `OFC (cms)`,
            getValue: (item) => item?.ofc ?? '-',
        },
        {
            key: 'height',
            name: `Height (cms)`,
            getValue: (item) => item?.height ?? '-',
        },
        {
            key: 'weight',
            name: `Weight (kgs)`,
            getValue: (item) => item?.weight ?? '-',
        },
        {
            key: 'bmi',
            name: `BMI (kg/m²)`,
            getValue: (item) => formatNumber(item?.bmi),
        },
        {
            key: 'bmr',
            name: `BMR (kcals)`,
            getValue: (item) => formatNumber(item?.bmr),
        },
        {
            key: 'bsa',
            name: `BSA (m²)`,
            getValue: (item) => formatNumber(item?.bsa),
        },
    ], []);

    const orderedRows = useMemo(() => {
        if (!isPediatricAccessable) {
            return baseRows;
        }
        const priorityKeys = ['weight', 'height', 'ofc'];
        const priorityRows = [];
        const remainingRows = [];

        baseRows.forEach((row) => {
            if (priorityKeys.includes(row.key)) {
                priorityRows.push(row);
            } else {
                remainingRows.push(row);
            }
        });

        const sortedPriorityRows = priorityKeys
            .map((key) => priorityRows.find((row) => row.key === key))
            .filter(Boolean);

        return [...sortedPriorityRows, ...remainingRows];
    }, [baseRows, isPediatricAccessable]);

    const initialColumns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 160,
        },
    ];
    const tableRows = orderedRows.map((row) => ({
        key: row.key,
        name: row.name,
    }));

    // Extract unique dates from the JSON array
    const uniqueDates = passVitals && passVitals.length > 0 ? [...passVitals.map((item) => item.date)] : [];

    // Initialize columns for each unique date
    const dateColumns = uniqueDates.map((date, index) => ({
        title: moment(date).format(showDateFormat),
        dataIndex: index,
        key: index,
        width: 100,
    }));
    const columns = [...initialColumns, ...dateColumns];

    if (passVitals && passVitals.length > 0) {
        passVitals.forEach((item, dateIndex) => {
            orderedRows.forEach((rowConfig, rowIndex) => {
                tableRows[rowIndex][dateIndex] = rowConfig.getValue(item);
            });
        });
    }

    return (
        <div className="appointment-wrap PatientDetailswrap m-0">
            <Card className=''>
                <Card.Header className='bg-white py-3'>
                    <div>
                        <img src={vitals} alt="vitals" className='me-3' />
                        Vitals & Body Composition
                    </div>
                    {patientBirthWeight ? <div className='fontroboto' style={{margin: "20px 0px 5px", fontSize: 14, fontWeight: 400}}>
                        Patient Birth weight
                        <span className="fontroboto" style={{marginLeft: 15}}>{patientBirthWeight}kg</span>
                    </div> : null}
                </Card.Header>
                <Card.Body className='p-0'>
                    {passVitals && passVitals.length > 0 ? (
                        <Table dataSource={tableRows} columns={columns} pagination={false} loading={loading} />
                    ) : (
                        <div className='d-flex flex-column justify-content-center' style={{ minHeight: "300px" }}>
                            {loading ? (
                                <div className='align-items-center text-center'>
                                    <Spin />
                                </div>
                            ) : (
                                <div className='align-items-center text-center'>
                                    <img src={heartBeat} width={57} height={52} alt="No vital & body composition saved for the patient!" />
                                    <p className='mt-4 fontroboto'>No vital & body composition saved <br /> for the patient!</p>
                                </div>
                            )}
                        </div>
                    )}
                </Card.Body>
            </Card>
        </div>
    )
}

export default React.memo(VitalsBodyComposition)