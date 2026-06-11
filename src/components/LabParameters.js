import React, { useState } from 'react';
import Card from 'react-bootstrap/Card';
import { Table } from 'antd';
import { ASSETS } from "../assets";
const {
  labParameters: LabParametersicon,
  arrowBoxRight: arrowright,
  graph,
} = ASSETS.images;

function LabParameters() {

    const [filteredInfo, setFilteredInfo] = useState({});
    const [sortedInfo, setSortedInfo] = useState({});

    const [data, setData] = useState([
        {
            key: Math.random(),
            name: 'John Brown',
            time: '10:30 am',
            date: '9th Oct 2023',
            gender: 'Female',
            visittype: 'new',
        },
        {
            key: Math.random(),
            name: 'Jim Green',
            time: '10:30 am',
            date: '9th Oct 2023',
            gender: 'Female',
            visittype: 'new',
        },
        {
            key: Math.random(),
            name: 'Joe Black',
            time: '10:30 am',
            date: '9th Oct 2023',
            gender: 'Male',
            visittype: 'Follow Up',
        },
        {
            key: Math.random(),
            name: 'Jim Red',
            time: '10:30 am',
            date: '9th Oct 2023',
            gender: 'Male',
            visittype: 'new',
        },
        {
            key: Math.random(),
            name: 'Jim Red',
            time: '10:30 am',
            date: '9th Oct 2023',
            gender: 'Female',
            visittype: 'Follow Up',
        }
    ]);

    const handleChange = (pagination, filters, sorter) => {
        console.log('Various parameters', pagination, filters, sorter);
        setFilteredInfo(filters);
        setSortedInfo(sorter);
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            ellipsis: true,
        },
        {
            title: 'Visit Type',
            dataIndex: 'visittype',
            key: 'visittype',
            ellipsis: true,
        },
        {
            title: 'Slot',
            dataIndex: 'time',
            key: 'time',
            filteredValue: filteredInfo.time || null,
            ellipsis: true,
        },
    ];

    return (
        <div className="appointment-wrap PatientDetailswrap m-0">
            <Card className=''>
                <Card.Header className='bg-white py-3'>
                    <div className='d-flex align-items-center justify-content-between'>
                        <div>
                            <img src={LabParametersicon} alt="vitals" className='me-3' />
                            Lab Parameters
                        </div>
                        <div>
                            <a className='me-3'>
                                <img src={graph} alt="vitals" />
                            </a>
                            <a>
                                <img src={arrowright} alt="vitals" />
                            </a>
                        </div>
                    </div>
                </Card.Header>
                <Card.Body className='p-0'>
                    <Table columns={columns} dataSource={data} onChange={handleChange} pagination={false} />
                </Card.Body>
            </Card>
        </div>
    )
}

export default React.memo(LabParameters)