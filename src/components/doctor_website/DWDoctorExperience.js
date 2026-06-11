import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Button, Collapse, Form, Input, Row, Col, Select, Checkbox } from 'antd';
import DoctorWebsiteSettingsContext from '../../context/DoctorWebsiteSettingsContext';
import moment from 'moment';
import { blockedEmoji } from '../../utils/utils';

function DWDoctorExperience() {

    const { doctorExperience, setDoctorExperience } = useContext(DoctorWebsiteSettingsContext);
    const [activeKey, setActiveKey] = useState(doctorExperience.length ? [`${doctorExperience.length}`] : ['1']);

    const monthList = [
        {
            value: '1',
            label: 'Jan',
        },
        {
            value: '2',
            label: 'Feb',
        },
        {
            value: '3',
            label: 'Mar',
        },
        {
            value: '4',
            label: 'Apr',
        },
        {
            value: '5',
            label: 'May',
        },
        {
            value: '6',
            label: 'Jun',
        },
        {
            value: '7',
            label: 'Jul',
        },
        {
            value: '8',
            label: 'Aug',
        },
        {
            value: '9',
            label: 'Sept',
        },
        {
            value: '10',
            label: 'Oct',
        },
        {
            value: '11',
            label: 'Nov',
        },
        {
            value: '12',
            label: 'Dec',
        }
    ]

    const onChangeInput = useCallback(
        (e, key, i) => {
            doctorExperience[i][key] = blockedEmoji(e.target.value);
            setDoctorExperience((prev) => { return [...prev] });
        },
        [doctorExperience]
    );

    const onSwitchChange = useCallback(
        (e, key, i) => {
            doctorExperience[i][key] = e.target.checked ? 1 : 0;
            setDoctorExperience((prev) => { return [...prev] });
        },
        [doctorExperience]
    );

    const yearsFromToCurrent = (value) => {
        const startYear = parseInt(value);
        const currentYear = moment().year();
        return Array.from({ length: currentYear - startYear + 1 }, (v, i) => ({
            value: `${startYear + i}`,
            label: `${startYear + i}`,
        }));
    }

    const onSelect = useCallback(
        (e, key, i) => {

            // if (key == 'start_year' && e == moment().year() && parseInt(doctorExperience[i]['start_month']) >= moment().month()) {
            //     doctorExperience[i]['start_month'] = '';
            // } else if (key == 'end_year' && e == moment().year() && parseInt(doctorExperience[i]['end_month']) >= moment().month()) {
            //     doctorExperience[i]['end_month'] = '';
            // }

            // if (key == 'start_year' && parseInt(e) > parseInt(doctorExperience[i]['end_year'])) {
            //     doctorExperience[i]['end_month'] = '';
            //     doctorExperience[i]['end_year'] = '';
            // } else if (key == 'start_month' && parseInt(doctorExperience[i]['start_year']) == parseInt(doctorExperience[i]['end_year']) && parseInt(e) > parseInt(doctorExperience[i]['end_month'])) {
            //     doctorExperience[i]['end_month'] = '';
            //     doctorExperience[i]['end_year'] = '';

            // } else if (key == 'end_year' && parseInt(doctorExperience[i]['start_year']) == parseInt(e) && parseInt(doctorExperience[i]['start_month']) > parseInt(doctorExperience[i]['end_month'])) {
            //     doctorExperience[i]['end_month'] = '';
            // }


            if (key == 'start_year') {
                if (e == moment().year() && parseInt(doctorExperience[i]['start_month']) >= moment().month()) {
                    doctorExperience[i]['start_month'] = '';
                } else if (parseInt(e) > parseInt(doctorExperience[i]['end_year'])) {
                    doctorExperience[i]['end_month'] = '';
                    doctorExperience[i]['end_year'] = '';
                }
            } else if (key == 'end_year') {
                if (e == moment().year() && parseInt(doctorExperience[i]['end_month']) >= moment().month()) {
                    doctorExperience[i]['end_month'] = '';
                } else if (parseInt(doctorExperience[i]['start_year']) == parseInt(e) && parseInt(doctorExperience[i]['start_month']) > parseInt(doctorExperience[i]['end_month'])) {
                    doctorExperience[i]['end_month'] = '';
                }
            } else if (key == 'start_month' && parseInt(doctorExperience[i]['start_year']) == parseInt(doctorExperience[i]['end_year']) && parseInt(e) > parseInt(doctorExperience[i]['end_month'])) {
                doctorExperience[i]['end_month'] = '';
                doctorExperience[i]['end_year'] = '';

            }

            doctorExperience[i][key] = e;
            setDoctorExperience((prev) => { return [...prev] });
        },
        [doctorExperience]
    );

    const onRemoveRow = (index) => {
        doctorExperience.splice(index, 1);
        setDoctorExperience((prev) => { return [...prev] });
    };

    const accordionItems = (e, i) => [
        {
            key: `${i + 1}`,
            label:
                <>
                    <div className="title-common">{`Key Experience ${i + 1}`}</div>
                    {(e?.hospital || e?.city) ? (
                        <div className='fontroboto'>{`${Object.values(Object.fromEntries(Object.entries((({ hospital, city }) => ({ hospital, city }))(e)).filter(([_, v]) => v))).join(', ')}`}</div>
                    ) : (
                        <div className='fontroboto'>{'(Not Specified)'}</div>
                    )}
                </>,
            children:
                <div className="rounded-20px">
                    <div className='px-20'>
                        <Form layout="vertical">
                            <Form.Item
                                label="Title"
                                className='fw-medium mb-20'
                                required>
                                <Input
                                    placeholder="e.g. Medical Director"
                                    className="rounded-10px h-38"
                                    value={e?.title}
                                    onChange={(e) => onChangeInput(e, 'title', i)} />
                            </Form.Item>
                            <Form.Item
                                label="Hospital"
                                className='fw-medium mb-20'
                                required>
                                <Input
                                    placeholder="e.g Medanta Hospital"
                                    className="rounded-10px h-38"
                                    value={e?.hospital}
                                    onChange={(e) => onChangeInput(e, 'hospital', i)} />
                            </Form.Item>
                            <Form.Item
                                label="City"
                                className='fw-medium mb-20'
                                required>
                                <Input
                                    placeholder="e.g. Mumbai"
                                    className="rounded-10px h-38"
                                    value={e?.city}
                                    onChange={(e) => onChangeInput(e, 'city', i)} />
                            </Form.Item>

                            <Checkbox
                                className="switch-name-check checkbold mb-3"
                                checked={e?.currently_working}
                                onChange={(e) => onSwitchChange(e, 'currently_working', i)}>I am currently working in this role</Checkbox>

                            <Row gutter={20}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Start Date"
                                        className='fw-medium mb-20'
                                        required>
                                        <Select
                                            showSearch
                                            optionFilterProp="label"
                                            className="autocomplete-custom"
                                            placeholder="Month"
                                            options={e?.start_year == moment().year() ? monthList.slice(0, monthList.findIndex(e => e.value == moment().month() + 1) + 1) : monthList}
                                            value={e?.start_month ? e?.start_month : null}
                                            onSelect={(e) => onSelect(e, 'start_month', i)} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label=" "
                                        className='fw-medium mb-20'>
                                        <Select
                                            showSearch
                                            optionFilterProp="label"
                                            className="autocomplete-custom"
                                            placeholder="Year"
                                            options={yearsFromToCurrent(1950)}
                                            value={e?.start_year ? e?.start_year : null}
                                            onSelect={(e) => onSelect(e, 'start_year', i)} />
                                    </Form.Item>
                                </Col>
                                {!e?.currently_working && (
                                    <>
                                        <Col span={12}>
                                            <Form.Item
                                                label="End Date"
                                                className='fw-medium mb-20'
                                                required>
                                                <Select
                                                    showSearch
                                                    optionFilterProp="label"
                                                    className="autocomplete-custom"
                                                    placeholder="Month"
                                                    options={
                                                        parseInt(e?.start_year) == parseInt(e?.end_year) ?
                                                            e?.end_year == moment().year() ?
                                                                monthList.slice(parseInt(e?.start_month - 1), moment().month() + 1)
                                                                : monthList.slice(parseInt(e?.start_month - 1), monthList.length)
                                                            :
                                                            e?.end_year == moment().year() ?
                                                                monthList.slice(0, monthList.findIndex(e => e.value == moment().month() + 1) + 1)
                                                                : monthList
                                                    }
                                                    value={e?.end_month ? e?.end_month : null}
                                                    onSelect={(e) => onSelect(e, 'end_month', i)} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                label=" "
                                                className='fw-medium mb-20'>
                                                <Select
                                                    showSearch
                                                    optionFilterProp="label"
                                                    className="autocomplete-custom"
                                                    placeholder="Year"
                                                    options={yearsFromToCurrent(e?.start_year)}
                                                    value={e?.end_year ? e?.end_year : null}
                                                    onSelect={(e) => onSelect(e, 'end_year', i)} />
                                            </Form.Item>
                                        </Col>
                                    </>
                                )}
                            </Row>
                        </Form>
                    </div>
                    <Button className='btn w-100 btn-delete-experience btn-41 rounded-top-0 align-items-center d-flex justify-content-center' onClick={() => onRemoveRow(i)}><i className='icon-delete fs-18 me-2'></i>Delete Experience</Button>
                </div>,
        },
    ];

    // const addDoctorExperienceClick = useCallback(
    //     () => {
    //         doctorExperience.push({
    //             title: '',
    //             hospital: '',
    //             city: '',
    //             currently_working: 0,
    //             start_month: '',
    //             start_year: '',
    //             end_month: '',
    //             end_year: ''
    //         })
    //         setDoctorExperience((prev) => { return [...prev] });
    //     },
    //     [doctorExperience]
    // );

    // Accordian Auto Open 
    const addDoctorExperienceClick = useCallback(() => {
        const newClinic = {
            title: '',
            hospital: '',
            city: '',
            currently_working: 0,
            start_month: '',
            start_year: '',
            end_month: '',
            end_year: ''
        };

        setDoctorExperience((prev) => {
            const newProfile = [...prev, newClinic];
            setActiveKey([`${newProfile.length}`]);
            return newProfile;
        });
    }, [setDoctorExperience]);

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
                {doctorExperience?.map((e, i) => {
                    return (
                        <div key={i} className="border rounded-20px bg-white mt-3">
                            <Collapse
                                items={accordionItems(e, i)}
                                activeKey={activeKey} onChange={() => handleCollapseChange(`${i + 1}`)}
                                className="prescriptiontab-accordian doctor-experience"
                                expandIconPosition={'end'} />
                        </div>
                    )
                })}
                <Button className='btn btn-input w-100 btn-41 d-flex align-items-center justify-content-center mt-3' onClick={addDoctorExperienceClick}><i className='icon-Add fs-18 me-2'></i>Add Experience</Button>
            </div>
        </div>
    );
}

export default React.memo(DWDoctorExperience);
