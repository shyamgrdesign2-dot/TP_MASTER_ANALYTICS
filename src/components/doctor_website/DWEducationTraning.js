import React, { useContext, useMemo, useCallback, useState } from 'react';
import { Button, Collapse, Form, Input, Row, Col, Select } from 'antd';
import moment from 'moment';

import DoctorWebsiteSettingsContext from '../../context/DoctorWebsiteSettingsContext';
import { blockedEmoji } from '../../utils/utils';

function DWEducationTraning() {

    const { educationTraining, setEducationTraining } = useContext(DoctorWebsiteSettingsContext);
    const [activeKey, setActiveKey] = useState(educationTraining.length ? [`${educationTraining.length}`] : ['1']);

    const yearsFromToCurrent = (value) => {
        const startYear = parseInt(value);
        const currentYear = moment().year();
        return Array.from({ length: currentYear - startYear + 1 }, (v, i) => ({
            value: `${startYear + i}`,
            label: `${startYear + i}`,
        }));
    }

    const onChangeInput = useCallback(
        (e, key, i) => {
            educationTraining[i][key] = blockedEmoji(e.target.value);
            setEducationTraining((prev) => { return [...prev] });
        },
        [educationTraining]
    );


    const onSelect = useCallback(
        (e, key, i) => {

            if (key == 'start_year' && parseInt(e) > parseInt(educationTraining[i]['end_year'])) {
                educationTraining[i]['end_year'] = '';
            }

            educationTraining[i][key] = e;
            setEducationTraining((prev) => { return [...prev] });
        },
        [educationTraining]
    );

    const onRemoveRow = (index) => {
        educationTraining.splice(index, 1);
        setEducationTraining((prev) => { return [...prev] });
    };

    const accordionItems = (e, i) => [
        {
            key: `${i + 1}`,
            label:
                <>
                    <div className="title-common">{`Education & Training ${i + 1}`}</div>
                    {(e?.degree || e?.title) ? (
                        <div className='fontroboto'>{`${Object.values(Object.fromEntries(Object.entries((({ degree, title }) => ({ degree, title }))(e)).filter(([_, v]) => v))).join(', ')}`}</div>
                    ) : (
                        <div className='fontroboto'>{'(Not Specified)'}</div>
                    )}
                </>,
            children:
                <div className="rounded-20px">
                    <div className='px-20'>
                        <Form layout="vertical">
                            <Form.Item
                                label="School / College / University"
                                className='fw-medium mb-20'>
                                <Input placeholder="e.g. All India Institute of Medical Sciences" className="text-capitalize rounded-10px h-38"
                                    value={e?.title}
                                    onChange={(e) => onChangeInput(e, 'title', i)} />
                            </Form.Item>
                            <Form.Item
                                label="Degree"
                                className='fw-medium mb-20'>
                                <Input placeholder="Degree" className="text-capitalize rounded-10px h-38"
                                    value={e?.degree}
                                    onChange={(e) => onChangeInput(e, 'degree', i)} />
                            </Form.Item>
                            <Form.Item
                                label="City"
                                className='fw-medium mb-20'>
                                <Input placeholder="e.g. Mumbai"
                                    className="text-capitalize rounded-10px h-38"
                                    value={e?.city}
                                    onChange={(e) => onChangeInput(e, 'city', i)} />
                            </Form.Item>

                            <Row gutter={20}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Start Year"
                                        className='fw-medium mb-20'>
                                        <Select
                                            className="autocomplete-custom"
                                            placeholder="Year"
                                            options={yearsFromToCurrent(1950)}
                                            value={e?.start_year ? e?.start_year : null}
                                            onSelect={(e) => onSelect(e, 'start_year', i)}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="End Year"
                                        className='fw-medium mb-20'>
                                        <Select
                                            className="autocomplete-custom"
                                            placeholder="Year"
                                            options={yearsFromToCurrent(e?.start_year)}
                                            value={e?.end_year ? e?.end_year : null}
                                            onSelect={(e) => onSelect(e, 'end_year', i)}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form>
                    </div>
                    <Button className='btn w-100 btn-delete-experience btn-41 rounded-top-0 align-items-center d-flex justify-content-center' onClick={() => onRemoveRow(i)}><i className='icon-delete fs-18 me-2'></i>Delete</Button>
                </div>,
        },
    ];

    // const addEducationClick = useCallback(
    //     () => {
    //         educationTraining.push({
    //             title: '',
    //             degree: '',
    //             city: '',
    //             start_year: '',
    //             end_year: ''
    //         })
    //         setEducationTraining((prev) => { return [...prev] });
    //     },
    //     [educationTraining]
    // );

    // Accordian Auto Open 
    const addEducationClick = useCallback(() => {
        const newClinic = {
            title: '',
            degree: '',
            city: '',
            start_year: '',
            end_year: ''
        };

        setEducationTraining((prev) => {
            const newProfile = [...prev, newClinic];
            setActiveKey([`${newProfile.length}`]);
            return newProfile;
        });
    }, [setEducationTraining]);

    const handleCollapseChange = (key) => {
        if (activeKey.includes(key)) {
            setActiveKey([]);
        } else {
            setActiveKey([key]);
        }
    };


    return (
        <div className="bg-white overflow-auto" style={{ height: 'calc(100vh - 120px)' }}>
            <div className='p-20'>
                <div className="text-greycolor fontroboto"> Your experience journey includes previous roles, locations, durations, and descriptions.</div>
                {educationTraining.map((e, i) => {
                    return (
                        <div key={i} className="border rounded-20px bg-white mt-3">
                            <Collapse items={accordionItems(e, i)} activeKey={activeKey} onChange={() => handleCollapseChange(`${i + 1}`)} className="prescriptiontab-accordian doctor-experience" expandIconPosition={'end'} />
                        </div>
                    )
                })}
                <Button className='btn btn-input w-100 btn-41 d-flex align-items-center justify-content-center mt-3' onClick={addEducationClick}><i className='icon-Add fs-18 me-2'></i>Add Education</Button>
            </div>
        </div>
    );
}

export default React.memo(DWEducationTraning);
