import React, { useState, useCallback, useContext, useRef } from 'react';
import { Button, Collapse, Form, Input, Tabs, Row, Col, TimePicker, Image } from 'antd';
import moment from 'moment';
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { searchPincode } from "../../redux/appointmentsSlice";

import DoctorWebsiteSettingsContext from '../../context/DoctorWebsiteSettingsContext';

import { TAB_ADDRESS, TAB_TIMINGS, TAB_PHOTOS } from "../../utils/constants";
import { blockedEmoji, errorMessage, onlyNumberFormat, removeSpecialCharectorWithoutDotSpace, compressedFile} from '../../utils/utils';
import { ASSETS } from "../../assets";
const {
  closeWithWhiteFill: CloseWithWhiteFill,
  addPhotos: AddPhotos,
} = ASSETS.images;

const dateFormat = 'HH:mm:ss'
const showDateFormat = 'h:mm A'

function DWClinicProfile() {

    const dispatch = useDispatch();

    const inputImageUrls = useRef([]);

    const { clinicProfile, setClinicProfile } = useContext(DoctorWebsiteSettingsContext);
    const [activeKey, setActiveKey] = useState(clinicProfile.length ? [`${clinicProfile.length}`] : ['1']);
    const [activeShiftKeys, setActiveShiftKeys] = useState(['1']);
    const [imageIndex, setImageIndex] = useState(0);
    const [visible, setVisible] = useState(false);

    const TabsPrintSetting = [
        {
            key: TAB_ADDRESS,
            label: 'Address'
        },
        {
            key: TAB_TIMINGS,
            label: 'Timings'
        },
        {
            key: TAB_PHOTOS,
            label: 'Photos'
        },
    ];

    const onTabChange = useCallback(
        (key, e) => {
            const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
            if (index !== -1) {
                clinicProfile[index]['selectedTab'] = key;
                setClinicProfile((prev) => { return [...prev] });
            }
            if (key === 2) {
                setActiveShiftKeys((prev) => ({
                    ...prev,
                    [e.random_id]: [`${(clinicProfile[index].shift.length - 1)}`] // Show the new shift
                }));
            }
        },
        [clinicProfile]
    );

    const onChangeInput = useCallback(
        (el, key, e) => {
            const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
            if (index !== -1) {
                if (key === 'contact_no') {
                    clinicProfile[index][key] = onlyNumberFormat(el.target.value);
                } else {
                    clinicProfile[index][key] = blockedEmoji(el.target.value);
                }
                setClinicProfile((prev) => { return [...prev] });
            }
        },
        [clinicProfile]
    );

    const onChangeAddressInput = useCallback(
        (el, key, e) => {
            const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
            if (index !== -1) {
                if (key === 'pincode') {
                    clinicProfile[index]['address'][key] = onlyNumberFormat(el.target.value);
                } else if (key === 'city') {
                    clinicProfile[index]['address'][key] = removeSpecialCharectorWithoutDotSpace(el.target.value);
                } else {
                    clinicProfile[index]['address'][key] = blockedEmoji(el.target.value);
                }
                setClinicProfile((prev) => { return [...prev] });
                if (key === 'pincode') {
                    setTimeout(() => {
                        const fetchPincode = async (pincode) => {
                            const action = await dispatch(searchPincode(pincode));
                            if (action.meta.requestStatus === "fulfilled") {
                                clinicProfile[index]['address']['city'] = action.payload.city;
                                clinicProfile[index]['address']['state'] = action.payload.state;
                                setClinicProfile((prev) => { return [...prev] });
                            }
                        }
                        el.target.value?.length === 6 && fetchPincode(el.target.value)
                    }, 500);
                }
            }
        },
        [clinicProfile]
    );

    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const onDayClick = useCallback(
        (value, e, i1) => {
            const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
            if (index !== -1) {
                var data = clinicProfile[index]['shift'][i1].hasOwnProperty('days') ? [...clinicProfile[index]['shift'][i1]['days']] : []
                if (data.includes(value)) {
                    const index1 = data.indexOf(value);
                    if (index1 > -1) {
                        data.splice(index1, 1);
                    }
                    clinicProfile[index]['shift'][i1]['days'] = [...data.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))];
                } else {
                    data.push(value)
                    clinicProfile[index]['shift'][i1]['days'] = [...data.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))];
                }

                if (data?.length > 0 && clinicProfile[index]['shift'][i1]['timing'].length === 0) {
                    clinicProfile[index]['shift'][i1]['timing'] = [{ from_time: '', end_time: '' }]
                } else if (data?.length === 0) {
                    clinicProfile[index]['shift'][i1]['timing'] = []
                }

                setClinicProfile((prev) => { return [...prev] });
            }
        },
        [clinicProfile]
    );

    const addTimingClick = useCallback(
        (e, i1) => {
            const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
            if (index !== -1) {
                clinicProfile[index]['shift'][i1]['timing'].push({
                    from_time: '',
                    end_time: ''
                })
                setClinicProfile((prev) => { return [...prev] });
            }
        },
        [clinicProfile]
    );
    const RemoveTimingClick = (e, i1, i2) => {
        const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
        if (index !== -1) {
            clinicProfile[index]['shift'][i1]['timing'].splice(i2, 1);
            setClinicProfile((prev) => { return [...prev] });
        }
    };

    const onTimeClick = useCallback(
        (time, timeString, key, e, i1, i2) => {
            if (timeString) {

                const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
                if (index !== -1) {
                    if (key == 'from_time' && moment.duration(moment(moment(timeString, showDateFormat).format(dateFormat), "HH:mm:ss").diff(moment(clinicProfile[index]['shift'][i1]['timing'][i2]['end_time'], "HH:mm:ss"))).asMinutes() >= 0) {
                        clinicProfile[index]['shift'][i1]['timing'][i2]['end_time'] = '';
                        clinicProfile[index]['shift'][i1]['timing'][i2][key] = moment(timeString, showDateFormat).format(dateFormat);
                    } else if (key == 'end_time' && moment.duration(moment(moment(timeString, showDateFormat).format(dateFormat), "HH:mm:ss").diff(moment(clinicProfile[index]['shift'][i1]['timing'][i2]['from_time'], "HH:mm:ss"))).asMinutes() <= 0) {
                        clinicProfile[index]['shift'][i1]['timing'][i2]['from_time'] = '';
                        clinicProfile[index]['shift'][i1]['timing'][i2][key] = moment(timeString, showDateFormat).format(dateFormat);
                    } else {
                        clinicProfile[index]['shift'][i1]['timing'][i2][key] = moment(timeString, showDateFormat).format(dateFormat);
                    }

                    setClinicProfile((prev) => { return [...prev] });
                }

            }
        },
        [clinicProfile]
    );

    const removeShiftClick = (e, i1) => {
        const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
        if (index !== -1) {
            clinicProfile[index]['shift'].splice(i1, 1);
            setClinicProfile((prev) => { return [...prev] });
        }
    };

    const TimingItems = (e1, i1, e) => [
        {
            key: `${i1 + 1}`,
            label:
                <>
                    <div className="title-common">{`Shift ${i1 + 1}`}</div>
                    <div className='fontroboto'>Manage your shifts with new set of days</div>
                </>,
            children:
                <>
                    <div className='p-10 pt-3'>
                        <Form.Item
                            label="Select multiple days to create the shift."
                            className='fw-medium mb-1'
                            required>
                            <div className='d-flex align-items-center justify-content-between'>
                                <div onClick={() => onDayClick('sun', e, i1)} className={`${e1?.days && e1?.days?.includes('sun') && 'active-days'} days-width rounded-10px border sunday-color`}>S</div>
                                <div onClick={() => onDayClick('mon', e, i1)} className={`${e1?.days && e1?.days?.includes('mon') && 'active-days'} days-width rounded-10px border`}>M</div>
                                <div onClick={() => onDayClick('tue', e, i1)} className={`${e1?.days && e1?.days?.includes('tue') && 'active-days'} days-width rounded-10px border`}>T</div>
                                <div onClick={() => onDayClick('wed', e, i1)} className={`${e1?.days && e1?.days?.includes('wed') && 'active-days'} days-width rounded-10px border`}>W</div>
                                <div onClick={() => onDayClick('thu', e, i1)} className={`${e1?.days && e1?.days?.includes('thu') && 'active-days'} days-width rounded-10px border`}>T</div>
                                <div onClick={() => onDayClick('fri', e, i1)} className={`${e1?.days && e1?.days?.includes('fri') && 'active-days'} days-width rounded-10px border`}>F</div>
                                <div onClick={() => onDayClick('sat', e, i1)} className={`${e1?.days && e1?.days?.includes('sat') && 'active-days'} days-width rounded-10px border`}>S</div>
                            </div>
                        </Form.Item>
                    </div>
                    <Form.Item
                        label={e1?.days?.length > 0 ? "Set your shift timings" : ""}
                        className='fw-medium p-10 pb-0 mb-0'
                        required>

                        {e1?.timing?.map((e2, i2) => {
                            return (
                                <Row key={i2} align="middle" justify="space-between" className='mb-12'>
                                    <Col span={9}>
                                        <TimePicker
                                            format={showDateFormat}
                                            use12Hours
                                            placeholder="hh:mm"
                                            className="text-capitalize rounded-10px h-38"
                                            value={e2?.from_time ? dayjs(moment(e2?.from_time, dateFormat).format(showDateFormat), showDateFormat) : ''}
                                            onChange={(time, timeString) => onTimeClick(time, timeString, 'from_time', e, i1, i2)} />
                                    </Col>
                                    <Col span={2}>
                                        <div className='text-center'>To</div>
                                    </Col>
                                    <Col span={9}>
                                        <TimePicker
                                            format={showDateFormat}
                                            use12Hours
                                            placeholder="hh:mm"
                                            className="text-capitalize rounded-10px h-38"
                                            value={e2?.end_time ? dayjs(moment(e2?.end_time, dateFormat).format(showDateFormat), showDateFormat) : ''}
                                            onChange={(time, timeString) => onTimeClick(time, timeString, 'end_time', e, i1, i2)} />
                                    </Col>
                                    <Col span='auto'>
                                        {i2 === 0 ? (
                                            <Button className='btn-delete-prescription btn px-0' onClick={() => addTimingClick(e, i1)}><i className='icon-Add text-primary'></i></Button>
                                        ) : (
                                            <Button className='btn-delete-prescription btn px-0' onClick={() => RemoveTimingClick(e, i1, i2)}><i className='icon-delete text-primary'></i></Button>
                                        )}
                                    </Col>
                                </Row>
                            )
                        })}
                        <button className='btn float-end mb-2 btn-text d-flex px-0' onClick={() => removeShiftClick(e, i1)}><i className='icon-delete fs-18 me-1'></i><span>Delete Shift</span></button>
                    </Form.Item>
                </>
        },
    ];

    // const addShiftClick = useCallback(
    //     (e) => {
    //         const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
    //         if (index !== -1) {
    //             clinicProfile[index]['shift'].push({
    //                 days: [],
    //                 timing: []
    //             })
    //             setClinicProfile((prev) => { return [...prev] });
    //         }
    //     },
    //     [clinicProfile]
    // );

    const addShiftClick = useCallback(
        (clinicId) => {
            setClinicProfile((prev) => {
                const newProfile = [...prev];
                const index = newProfile.findIndex(el => el.random_id === clinicId);
                if (index !== -1) {
                    newProfile[index].shift.push({
                        days: [],
                        timing: []
                    });
                    return newProfile;
                }
                onTabChange(TAB_TIMINGS, { random_id: clinicId });
                return prev;
            });
            setActiveShiftKeys((prev) => ({
                ...prev,
                [clinicId]: [`${(clinicProfile.find(el => el.random_id === clinicId)?.shift.length || 0)}`]
            }));
        },
        [clinicProfile, setClinicProfile]
    );

    const handleShiftCollapseChange = (clinicId, key) => {
        setActiveShiftKeys((prev) => {
            const clinicKeys = prev[clinicId] || [];
            if (clinicKeys.includes(key)) {
                return { ...prev, [clinicId]: clinicKeys.filter(k => k !== key) };
            } else {
                return { ...prev, [clinicId]: [key] };
            }
        });
    };

    const setImageRef = (el, i) => {
        try {
            if (el) {
                inputImageUrls.current[i] = el;
            }
        } catch (error) {
            console.log(error)
        }
    };

    // const handleImageChange = (el, e) => {
    //     const checkFiles = e?.clinic_photos?.filter(x => x.uploadFile)?.length
    //     if (checkFiles === 0 || checkFiles < 5) {
    //         if (el.target.files?.length > 0) {
    //             const files = Array.from(el.target.files);
    //             const selectedImages = files.filter(file => file.type.startsWith('image/')).slice(0, 5 - checkFiles);
    //             const fileUrls = selectedImages;
    //             const updatedData = Object.entries(fileUrls).reduce((acc, [key, fileUrl]) => {
    //                 if (fileUrl.size <= 2101546 && ['image/png', 'image/jpeg', 'image/jpg'].includes(fileUrl.type)) {
    //                     acc.push({
    //                         clinic_image_id: Math.floor(1000000000 + Math.random() * 9999999999),
    //                         clinic_image_delete: 0,
    //                         clinic_image_name: fileUrl.name,
    //                         clinic_image_link: URL.createObjectURL(fileUrl),
    //                         uploadFile: fileUrl
    //                     });
    //                 } else {
    //                     errorMessage('Some files were removed because only JPG, JPEG, or PNG files with a maximum size of 2MB are allowed for upload.');
    //                 }
    //                 return acc;
    //             }, []);

    //             const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
    //             if (index !== -1) {
    //                 clinicProfile[index]['clinic_photos'] = [...clinicProfile[index]['clinic_photos'], ...updatedData]
    //                 setClinicProfile((prev) => { return [...prev] });
    //             }
    //         }
    //     } else {
    //         errorMessage('Maximum 5 images upload');
    //     }

    // }

    const handleImageChange = async (el, e) => {
        const checkFiles = e?.clinic_photos?.filter(x => x.uploadFile)?.length
        if (checkFiles === 0 || checkFiles < 5) {
            if (el.target.files?.length > 0) {
                const files = Array.from(el.target.files);
                console.log(files)
                if (files.filter(file => !file.type.startsWith('image/'))?.length > 0) {
                    errorMessage('Some files were removed because only JPG, JPEG, or PNG files are allowed for upload.');
                }
                const selectedImages = files.filter(file => file.type.startsWith('image/')).slice(0, 5 - checkFiles);
                const fileUrls = selectedImages;
                const updatedData = await Object.entries(fileUrls).reduce(async (acc, [key, fileUrl]) => {
                    let collection = await acc;
                    if (['image/png', 'image/jpeg', 'image/jpg'].includes(fileUrl.type)) {
                        const compress = await compressedFile(fileUrl)
                        collection.push({
                            clinic_image_id: Math.floor(1000000000 + Math.random() * 9999999999),
                            clinic_image_delete: 0,
                            clinic_image_name: compress.name,
                            clinic_image_link: URL.createObjectURL(compress),
                            uploadFile: compress
                        });
                    } else {
                        errorMessage('Some files were removed because only JPG, JPEG, or PNG files are allowed for upload.');
                    }
                    return collection;
                }, Promise.resolve([]));

                const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
                if (index !== -1) {
                    clinicProfile[index]['clinic_photos'] = [...clinicProfile[index]['clinic_photos'], ...updatedData]
                    setClinicProfile((prev) => { return [...prev] });
                }
            }
        } else {
            errorMessage('Maximum 5 images upload');
        }

    }

    const onRemoveRow = (e) => {
        const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
        if (index !== -1) {
            if (e?.created_by === 'local') {
                clinicProfile.splice(index, 1);
            } else {
                clinicProfile[index]['clinic_delete'] = 1
            }
        }
        setClinicProfile((prev) => { return [...prev] });
    };

    const onDeleteImage = (e, item) => {
        const index = clinicProfile.findIndex(el => el.random_id === e.random_id)
        if (index !== -1) {
            const index1 = clinicProfile[index]['clinic_photos'].findIndex(el => el.clinic_image_id === item.clinic_image_id)
            if (index1 !== -1) {
                if (item?.clinic_image_link?.startsWith('blob:')) {
                    clinicProfile[index]['clinic_photos'].splice(index1, 1);
                } else {
                    clinicProfile[index]['clinic_photos'][index1]['clinic_image_delete'] = 1
                }
            }
            setClinicProfile((prev) => { return [...prev] });
        }
    };

    const showHide = useCallback(() => {
        setVisible(!visible);
    }, [visible]);

    const clinicItems = (e, i) => [
        {
            key: `${i + 1}`,
            label:
                <>
                    <div className="title-common">{`Clinic ${i + 1}`}</div>
                    {(e?.name) ? (
                        <div className='fontroboto'>{`${Object.values(Object.fromEntries(Object.entries((({ name }) => ({ name }))(e)).filter(([_, v]) => v))).join(', ')}`}</div>
                    ) : (
                        <div className='fontroboto'>{'(Not Specified)'}</div>
                    )}
                </>,
            children:
                <div className="rounded-20px">
                    <div>
                        <Form layout="vertical">
                            <div className='px-20'>
                                <Form.Item
                                    label="Clinic Name"
                                    className='fw-medium mb-20'
                                    required>
                                    <Input placeholder="Clinic Name"
                                        className="text-capitalize rounded-10px h-38"
                                        value={e?.name}
                                        onChange={(el) => onChangeInput(el, 'name', e)} />
                                </Form.Item>
                                <Form.Item
                                    label="Clinic Contact"
                                    className='fw-medium mb-20'
                                    required>
                                    <Input placeholder="Clinic Contact"
                                        className="text-capitalize rounded-10px h-38"
                                        value={e?.contact_no}
                                        onChange={(el) => onChangeInput(el, 'contact_no', e)} inputMode='numeric' />
                                </Form.Item>
                            </div>
                            <Tabs activeKey={e?.selectedTab} onChange={(key) => onTabChange(key, e)} items={TabsPrintSetting} className="print-tabs" />
                            {e?.selectedTab === TAB_ADDRESS ? (
                                <>
                                    <Row gutter={20} className='px-10'>
                                        <Col span={12}>
                                            <Form.Item
                                                label="Pincode"
                                                className='fw-medium mb-20'
                                                required>
                                                <Input placeholder="Pincode" className="text-capitalize rounded-10px h-38"
                                                    value={e?.address?.pincode}
                                                    onChange={(el) => onChangeAddressInput(el, 'pincode', e)} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                label="City"
                                                className='fw-medium mb-20'
                                                required>
                                                <Input placeholder="City"
                                                    className="text-capitalize rounded-10px h-38"
                                                    value={e?.address?.city}
                                                    onChange={(el) => onChangeAddressInput(el, 'city', e)} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={24}>
                                            <Form.Item
                                                label="State"
                                                className='fw-medium mb-20'
                                                required>
                                                <Input placeholder="City"
                                                    className="text-capitalize rounded-10px h-38"
                                                    value={e?.address?.state}
                                                    onChange={(el) => onChangeAddressInput(el, 'state', e)} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={24}>
                                            <Form.Item
                                                label="Address"
                                                className='fw-medium mb-20'
                                                required>
                                                <Input.TextArea placeholder="Address" rows={3} className="textareaPlaceholder text-capitalize rounded-10px"
                                                    value={e?.address?.address_line}
                                                    onChange={(el) => onChangeAddressInput(el, 'address_line', e)} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={24}>
                                            <Form.Item
                                                label="Google map link"
                                                className='fw-medium mb-20'>
                                                <Input placeholder="Copy and paste your clinic address link" className="rounded-10px h-38"
                                                    value={e?.address?.google_map}
                                                    onChange={(el) => onChangeAddressInput(el, 'google_map', e)} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <button className='align-items-center btn btn-delete-experience btn-delete-experience1 d-flex mb-2 me-2 ms-auto text-primary' onClick={() => onTabChange(TAB_TIMINGS, e)}><i className='icon-Add fs-18 me-2'></i>Add Timings</button>
                                </>
                            ) : e?.selectedTab === TAB_TIMINGS ? (
                                <>
                                    {e?.shift.map((e1, i1) => {
                                        return (
                                            <div key={i1} className='px-10 mb-2'>
                                                {/* <Collapse items={TimingItems(e1, i1, e)} defaultActiveKey={['1']} className='prescriptiontab-accordian timingTab' expandIconPosition={'end'} /> */}
                                                <Collapse items={TimingItems(e1, i1, e)} defaultActiveKey={['1']} className='prescriptiontab-accordian timingTab' expandIconPosition={'end'} activeKey={activeShiftKeys[e.random_id] || (e.shift.length > 0 ? [`${e.shift.length}`] : ['1'])}
                                                    onChange={() => handleShiftCollapseChange(e.random_id, `${i1 + 1}`)} />
                                            </div>
                                        )
                                    })}
                                    <div className='d-flex align-items-center justify-content-between'>
                                        {/* <button className='d-flex align-items-center mb-2 btn btn-delete-experience btn-delete-experience1 text-primary' onClick={() => addShiftClick(e)}><i className='icon-Add fs-18 me-2'></i>Add More Shifts</button> */}
                                        <button className='d-flex align-items-center mb-2 btn btn-delete-experience btn-delete-experience1 text-primary' onClick={() => addShiftClick(e.random_id)}><i className='icon-Add fs-18 me-2'></i>Add More Shifts</button>
                                        <button className='d-flex align-items-center mb-2 btn btn-delete-experience btn-delete-experience1 text-primary' onClick={() => onTabChange(TAB_PHOTOS, e)}><i className='icon-Add fs-18 me-2'></i>Add Photos</button>
                                    </div>
                                </>
                            ) : e?.selectedTab === TAB_PHOTOS && (
                                <div className='px-10'>
                                    <div className='d-flex flex-wrap mb-2'>
                                        <Image.PreviewGroup
                                            preview={{
                                                visible,
                                                closeIcon: null,
                                                toolbarRender: () => null,
                                                countRender: () => null,
                                                imageRender: (originalNode, info) => (
                                                    <div className='d-block'>
                                                        <div className='d-flex align-items-center justify-content-between preview-header'>
                                                            <div className='d-flex align-items-center'>
                                                                <Button className='bg-transparent border-0 text-white mx-3 px-1' onClick={showHide}>
                                                                    <i className='icon-right'></i>
                                                                </Button>
                                                                <div className='text-white fs-16 fw-medium'>Clinic Photos</div>
                                                            </div>
                                                            <div className='d-flex align-items-center'>
                                                                <Button className='bg-transparent border-0 text-white px-1'
                                                                    onClick={() => {
                                                                        onDeleteImage(e, e?.clinic_photos?.filter(el => !el.clinic_image_delete)[info.current])
                                                                        showHide()
                                                                    }}>
                                                                    <i className='icon-delete'></i>
                                                                </Button>
                                                                <Button onClick={showHide} className='btn btn-41 px-4 btn-primary3 mx-3'>Close</Button>
                                                            </div>
                                                        </div>

                                                        <img src={originalNode.props.src} style={{ maxWidth: 600 }} />
                                                    </div>
                                                )
                                            }}>
                                            {e?.clinic_photos && e?.clinic_photos?.filter(el => !el.clinic_image_delete)?.map((item, index) => {
                                                return (
                                                    <div key={`${item.clinic_image_name + "-" + index}`} className='clinic-photo-setting-wrap'>
                                                        <Image src={item?.clinic_image_link} alt={`${item.clinic_image_name + "-" + index}`} className='clinic-photo-setting img-fluid' onClick={showHide} />
                                                        <img src={CloseWithWhiteFill} alt='Close' className='close-clinic-img' onClick={() => onDeleteImage(e, item)} />
                                                    </div>
                                                )
                                            })}
                                        </Image.PreviewGroup>
                                        <div className='clinic-photo-setting-wrap d-flex align-items-center justify-content-center border cursor-pointer' onClick={() => inputImageUrls.current[i]?.click()}>
                                            <input
                                                key={i}
                                                ref={el => setImageRef(el, i)}
                                                style={{ display: 'none' }}
                                                type="file"
                                                multiple
                                                accept="image/png, image/jpeg, image/jpg"
                                                onChange={(el) => handleImageChange(el, e)} />
                                            <img src={AddPhotos} alt='Clinic Photos' className='img-fluid' />
                                        </div>
                                    </div>
                                    <div className='mb-2 fs-12-1 d-flex align-items-center'>
                                        <i className='icon-info fs-18 me-2'></i>
                                        <div>You can upload upto 5 images at a time. Save and publish to add more images.</div>
                                    </div>
                                </div>
                            )}
                        </Form>
                    </div >
                    {i !== 0 && (
                        <Button className='btn w-100 btn-delete-experience btn-41 rounded-top-0 align-items-center d-flex justify-content-center' onClick={() => onRemoveRow(e)}><i className='icon-delete fs-18 me-2'></i>Delete</Button>
                    )}
                </div >,
        },
    ];

    // const addClinicProfileClick = useCallback(
    //     () => {
    //         clinicProfile.push({
    //             created_by: 'local',
    //             random_id: Math.floor(1000000000 + Math.random() * 9999999999),
    //             name: '',
    //             contact_no: '',
    //             address: {
    //                 pincode: '',
    //                 city: '',
    //                 state: '',
    //                 address_line: '',
    //                 google_map: ''
    //             },
    //             shift: [{
    //                 days: [],
    //                 timing: []
    //             }],
    //             clinic_photos: [],
    //             clinic_delete: 0,
    //             selectedTab: TAB_ADDRESS
    //         })
    //         setClinicProfile((prev) => { return [...prev] });
    //     },
    //     [clinicProfile]
    // );

    // Accordian Auto Open 
    const addClinicProfileClick = useCallback(() => {
        const newClinic = {
            created_by: 'local',
            random_id: Math.floor(1000000000 + Math.random() * 9999999999),
            name: '',
            contact_no: '',
            address: {
                pincode: '',
                city: '',
                state: '',
                address_line: '',
                google_map: ''
            },
            shift: [{
                days: [],
                timing: []
            }],
            clinic_photos: [],
            clinic_delete: 0,
            selectedTab: TAB_ADDRESS,
            activeShiftKeys: ['1']
        };

        setClinicProfile((prev) => {
            const newProfile = [...prev, newClinic];
            const countClinicDeleteZero = newProfile.filter(profile => profile.clinic_delete === 0).length;
            setActiveKey([`${countClinicDeleteZero}`]);
            return newProfile;
        });
    }, [setClinicProfile]);

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
                <div className="text-greycolor fontroboto"> Add your clinic name, location, timings, and photos.</div>
                {clinicProfile?.filter(el => !el.clinic_delete)?.map((e, i) => {
                    return (
                        <div key={i} className="border rounded-20px bg-white mt-3">
                            <Collapse items={clinicItems(e, i)} activeKey={activeKey} onChange={() => handleCollapseChange(`${i + 1}`)} className="prescriptiontab-accordian doctor-experience" expandIconPosition={'end'} />
                        </div>
                    )
                })}
                {clinicProfile?.filter(el => !el.clinic_delete)?.length < 5 && (
                    <Button className='btn btn-input w-100 btn-41 d-flex align-items-center justify-content-center mt-3' onClick={addClinicProfileClick}><i className='icon-Add fs-18 me-2'></i>Add one more clinic</Button>
                )}
            </div>
        </div>
    );
}

export default React.memo(DWClinicProfile);
